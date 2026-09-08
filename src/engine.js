import { LEVEL, VIEW, PHYSICS as P } from './level.js';

// Public API: createState(), setPaused(state, boolean), update(state,input,dt).
// Input: held left/right, one-frame jumpPressed/boostPressed booleans.
// dt is seconds. update returns event objects for audio and announcements.
// Status is playing/paused/complete. Restart by replacing state with createState().
const STEP = 1 / 120;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const approach = (v, target, amount) => v < target
  ? Math.min(v + amount, target) : Math.max(v - amount, target);
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x
  && a.y < b.y + b.h && a.y + a.h > b.y;
const body = p => ({ x: p.x, y: p.y, w: P.playerWidth, h: P.playerHeight });
const cameraTarget = p => clamp(p.x - VIEW.width * .35, 0, LEVEL.width - VIEW.width);

function makePlayer(spawn) {
  return { ...spawn, vx: 0, vy: 0, facing: 1, grounded: true,
    coyote: P.coyoteTime, jumpBuffer: 0, boostTime: 0, boostCooldown: 0 };
}

export function createState() {
  const player = makePlayer(LEVEL.spawn);
  return {
    player, cameraX: cameraTarget(player), collected: new Set(),
    checkpointIndex: 0, score: 0, combo: 1, bestCombo: 1,
    comboTimer: 0, deaths: 0, time: 0, status: 'playing',
    accumulator: 0, pendingJump: false, pendingBoost: false
  };
}

export function setPaused(state, paused) {
  if (state.status === 'complete') return;
  state.status = paused ? 'paused' : 'playing';
  state.accumulator = 0;
  state.pendingJump = false;
  state.pendingBoost = false;
  state.player.jumpBuffer = 0;
}

function respawn(state, events) {
  const checkpoint = LEVEL.checkpoints[state.checkpointIndex];
  state.player = makePlayer(checkpoint.spawn);
  state.cameraX = cameraTarget(state.player);
  state.combo = 1;
  state.comboTimer = 0;
  state.deaths += 1;
  state.pendingJump = false;
  state.pendingBoost = false;
  // Keep collected sparks and score; repeated deaths cannot farm collectibles.
  events.push({ type: 'respawn', name: checkpoint.name });
}

function tick(state, input, events) {
  const p = state.player;
  state.time += STEP;
  state.comboTimer = Math.max(0, state.comboTimer - STEP);
  if (state.comboTimer === 0) state.combo = 1;
  p.boostCooldown = Math.max(0, p.boostCooldown - STEP);
  p.jumpBuffer = Math.max(0, p.jumpBuffer - STEP);
  p.coyote = p.grounded ? P.coyoteTime : Math.max(0, p.coyote - STEP);
  if (state.pendingJump) p.jumpBuffer = P.jumpBuffer;
  const boost = state.pendingBoost;
  state.pendingJump = false;
  state.pendingBoost = false;

  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  if (direction && p.boostTime <= 0) p.facing = direction;
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = -P.jumpSpeed;
    p.grounded = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    events.push({ type: 'jump' });
  }
  if (boost && p.boostCooldown === 0) {
    p.boostTime = P.boostDuration;
    p.boostCooldown = P.boostCooldown;
    events.push({ type: 'boost' });
  }
  if (p.boostTime > 0) {
    p.vx = p.facing * P.boostSpeed;
    p.boostTime = Math.max(0, p.boostTime - STEP);
  } else {
    p.vx = approach(p.vx, direction * P.speed,
      (direction ? P.acceleration : P.friction) * STEP);
  }

  const oldX = p.x;
  const oldBottom = p.y + P.playerHeight;
  p.x = clamp(p.x + p.vx * STEP, 0, LEVEL.width - P.playerWidth);
  p.vy = Math.min(p.vy + P.gravity * STEP, P.maxFallSpeed);
  p.y += p.vy * STEP;
  p.grounded = false;
  if (p.vy >= 0) {
    const newBottom = p.y + P.playerHeight;
    let landing = null;
    for (const platform of LEVEL.platforms) {
      if (oldBottom > platform.y + .01 || newBottom < platform.y) continue;
      const fraction = newBottom === oldBottom ? 0
        : clamp((platform.y - oldBottom) / (newBottom - oldBottom), 0, 1);
      const crossingX = oldX + (p.x - oldX) * fraction;
      if (crossingX + P.playerWidth <= platform.x || crossingX >= platform.x + platform.w) continue;
      if (!landing || platform.y < landing.y) landing = platform;
    }
    if (landing) {
      p.y = landing.y - P.playerHeight;
      p.vy = 0;
      p.grounded = p.x + P.playerWidth > landing.x && p.x < landing.x + landing.w;
      p.coyote = P.coyoteTime;
    }
  }

  const box = body(p);
  if (p.y > LEVEL.deathY || LEVEL.hazards.some(h => overlaps(box, h))) {
    respawn(state, events);
    return;
  }
  for (let i = state.checkpointIndex + 1; i < LEVEL.checkpoints.length; i++) {
    const c = LEVEL.checkpoints[i];
    if (overlaps(box, { x: c.x - 28, y: c.y - 110, w: 56, h: 110 })) {
      state.checkpointIndex = i;
      events.push({ type: 'checkpoint', name: c.name });
    }
  }
  for (const spark of LEVEL.sparks) {
    if (state.collected.has(spark.id)) continue;
    const dx = spark.x - clamp(spark.x, box.x, box.x + box.w);
    const dy = spark.y - clamp(spark.y, box.y, box.y + box.h);
    // Small pickup margin keeps low spark trails reachable while walking.
    if (dx * dx + dy * dy > (spark.radius + 4) ** 2) continue;
    state.collected.add(spark.id);
    state.combo = state.comboTimer > 0 ? Math.min(P.maxCombo, state.combo + 1) : 1;
    state.comboTimer = P.comboWindow;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const points = P.sparkScore * state.combo * (spark.secret ? 2 : 1);
    state.score += points;
    events.push({ type: 'spark', id: spark.id, points, combo: state.combo });
  }
  state.cameraX += (cameraTarget(p) - state.cameraX) * (1 - Math.exp(-8 * STEP));
  if (overlaps(box, LEVEL.goal)) {
    state.status = 'complete';
    p.vx = 0;
    p.boostTime = 0;
    events.push({ type: 'complete', score: state.score, sparks: state.collected.size });
  }
}

export function update(state, input = {}, dt = 0) {
  const events = [];
  if (state.status !== 'playing') return events;
  state.pendingJump ||= Boolean(input.jumpPressed);
  state.pendingBoost ||= Boolean(input.boostPressed);
  // Bound catch-up after stalls; small fixed steps keep collisions consistent.
  state.accumulator += Number.isFinite(dt) ? clamp(dt, 0, .1) : 0;
  while (state.accumulator >= STEP && state.status === 'playing') {
    state.accumulator -= STEP;
    tick(state, input, events);
  }
  if (state.status !== 'playing') state.accumulator = 0;
  return events;
}

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
const cameraTarget = (player, width = VIEW.width) => clamp(player.x - width * .35, 0, LEVEL.width - width);

function makePlayer(spawn) {
  return { ...spawn, vx: 0, vy: 0, facing: 1, grounded: true,
    coyote: P.coyoteTime, jumpBuffer: 0, boostTime: 0, boostCooldown: 0 };
}

function makeBoss() {
  return { health: LEVEL.boss.health, phase: 'idle', timer: 0, pulses: [] };
}

export function createState({ dashUnlocked = false } = {}) {
  const player = makePlayer(LEVEL.spawn);
  return {
    player, viewWidth: VIEW.width, cameraX: cameraTarget(player), collected: new Set(),
    acceptedSuggestions: new Set(), enemies: LEVEL.enemies.map(enemy => ({ ...enemy, defeated: false })),
    boss: makeBoss(), abilities: { dash: dashUnlocked },
    checkpointIndex: 0, score: 0, combo: 1, bestCombo: 1,
    comboTimer: 0, deaths: 0, time: 0, status: 'playing',
    accumulator: 0, pendingJump: false, pendingBoost: false, pendingInteract: false
  };
}

export function platformsFor(state) {
  return [...LEVEL.platforms, ...LEVEL.suggestions
    .filter(suggestion => state.acceptedSuggestions.has(suggestion.id))
    .map(suggestion => suggestion.platform)];
}

export function interactionAt(state) {
  return LEVEL.suggestions.find(suggestion => !state.acceptedSuggestions.has(suggestion.id)
    && Math.abs(state.player.x + P.playerWidth / 2 - suggestion.x) < 130
    && Math.abs(state.player.y + P.playerHeight - suggestion.y) < 65) ?? null;
}

export function setPaused(state, paused) {
  if (state.status === 'complete') return;
  state.status = paused ? 'paused' : 'playing';
  state.accumulator = 0;
  state.pendingJump = false;
  state.pendingBoost = false;
  state.pendingInteract = false;
  state.player.jumpBuffer = 0;
}

function respawn(state, events) {
  const checkpoint = LEVEL.checkpoints[state.checkpointIndex];
  state.player = makePlayer(checkpoint.spawn);
  state.cameraX = cameraTarget(state.player, state.viewWidth);
  state.combo = 1;
  state.comboTimer = 0;
  state.deaths += 1;
  state.pendingJump = false;
  state.pendingBoost = false;
  state.pendingInteract = false;
  if (state.boss.health > 0) state.boss = makeBoss();
  // Keep collected sparks and score; repeated deaths cannot farm collectibles.
  events.push({ type: 'respawn', name: checkpoint.name });
}

function tickBoss(state, events) {
  const boss = state.boss;
  if (boss.health === 0) return;
  if (boss.phase === 'idle') {
    if (state.player.x < LEVEL.boss.arenaX) return;
    boss.phase = 'telegraph';
    boss.timer = 1.4;
    events.push({ type: 'boss', phase: boss.phase });
  }
  boss.timer -= STEP;
  if (boss.timer <= 0) {
    if (boss.phase === 'telegraph') {
      boss.phase = 'attack';
      boss.timer = 2.1;
      boss.pulses.push({ x: LEVEL.boss.x, y: 582, w: 30, h: 28 });
      if (boss.health < LEVEL.boss.health) {
        boss.pulses.push({ x: LEVEL.boss.x + 180, y: 582, w: 30, h: 28 });
      }
    } else if (boss.phase === 'attack') {
      boss.phase = 'exposed';
      boss.timer = 8;
    } else {
      boss.phase = 'telegraph';
      boss.timer = 1.4;
    }
    events.push({ type: 'boss', phase: boss.phase });
  }
  for (const pulse of boss.pulses) pulse.x -= 310 * STEP;
  boss.pulses = boss.pulses.filter(pulse => pulse.x + pulse.w > LEVEL.boss.arenaX);
}

function tick(state, input, events) {
  const p = state.player;
  state.time += STEP;
  if (state.pendingInteract) {
    const suggestion = interactionAt(state);
    if (suggestion) {
      state.acceptedSuggestions.add(suggestion.id);
      state.score += 250;
      events.push({ type: 'suggestion', name: suggestion.name });
    }
  }
  state.pendingInteract = false;
  tickBoss(state, events);
  for (const enemy of state.enemies) {
    if (enemy.defeated) continue;
    enemy.x += enemy.speed * STEP;
    if (enemy.x < enemy.minX || enemy.x > enemy.maxX) {
      enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX);
      enemy.speed *= -1;
    }
  }
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
  if (input.jumpHeld === false && p.vy < -P.jumpReleaseSpeed) {
    p.vy = -P.jumpReleaseSpeed;
  }
  if (boost && state.abilities.dash && p.boostCooldown === 0) {
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
  const falling = p.vy > 0;
  p.y += p.vy * STEP;
  p.grounded = false;
  if (p.vy >= 0) {
    const newBottom = p.y + P.playerHeight;
    let landing = null;
    for (const platform of platformsFor(state)) {
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
  if (p.y > LEVEL.deathY || LEVEL.hazards.some(h => overlaps(box, h))
    || state.boss.pulses.some(pulse => overlaps(box, pulse))) {
    respawn(state, events);
    return;
  }
  for (const enemy of state.enemies) {
    if (enemy.defeated || !overlaps(box, enemy)) continue;
    if (falling && oldBottom <= enemy.y + 10) {
      enemy.defeated = true;
      p.vy = -430;
      p.grounded = false;
      state.score += 200;
      events.push({ type: 'enemy' });
    } else {
      respawn(state, events);
      return;
    }
  }
  if (state.boss.phase === 'exposed' && falling
    && oldBottom <= LEVEL.boss.switch.y + 10 && overlaps(box, LEVEL.boss.switch)) {
    state.boss.health -= 1;
    state.boss.phase = state.boss.health === 0 ? 'defeated' : 'stagger';
    state.boss.timer = 1;
    state.boss.pulses = [];
    p.y = LEVEL.boss.switch.y - P.playerHeight;
    p.vy = -480;
    p.grounded = false;
    state.score += 500;
    if (state.boss.health === 0) state.abilities.dash = true;
    events.push({ type: 'bossHit', health: state.boss.health });
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
  state.cameraX += (cameraTarget(p, state.viewWidth) - state.cameraX) * (1 - Math.exp(-8 * STEP));
  if (state.boss.health === 0 && overlaps(box, LEVEL.goal)) {
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
  state.pendingInteract ||= Boolean(input.interactPressed);
  // Bound catch-up after stalls; small fixed steps keep collisions consistent.
  state.accumulator += Number.isFinite(dt) ? clamp(dt, 0, .1) : 0;
  while (state.accumulator >= STEP && state.status === 'playing') {
    state.accumulator -= STEP;
    tick(state, input, events);
  }
  if (state.status !== 'playing') state.accumulator = 0;
  return events;
}

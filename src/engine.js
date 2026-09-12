import { LEVEL, VIEW, PHYSICS as P } from './level.js';
import { ARENA, ENCOUNTERS } from './encounters.js';
import { createBlocks, resolveBlockX, resolveBlockY, updateBlocks, collectBlockRewards } from './blocks.js';
import { createCombat, resetCombat, grantPower, hurtPlayer, updateCombat, helperAllowance } from './combat.js';
import { createBoss, updateBoss, hitBoss, bossSupportTarget } from './boss.js';
import { createParty, syncParty, resetPartyMotion, updateParty, requestPartyAttacks, initializeIndependentParty, updateCompanions, visibleParty, companionIds, unlockHelper } from './party.js';
import { createPartyDialogue, updatePartyDialogue, sayParty, reactPartyDialogue, clearPartyCaption } from './party-dialogue.js';
import { createMissionProgress, updateMission, missionReady } from './missions.js';

// Public API: createState(leader = 'marco'), setPaused(state, boolean), update(state,input,dt).
// Input: held left/right/fire; one-frame jumpPressed/boostPressed/attackPressed/helperPressed.
// dt is seconds. update returns event objects for audio and announcements.
// Status is playing/paused/complete. Restart by replacing state with createState().
const STEP = 1 / 120;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const approach = (v, target, amount) => v < target
  ? Math.min(v + amount, target) : Math.max(v - amount, target);
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x
  && a.y < b.y + b.h && a.y + a.h > b.y;
const body = p => ({ x: p.x, y: p.y, w: P.playerWidth, h: P.playerHeight });
const cameraTarget = (player, world = LEVEL) => clamp(player.x - VIEW.width * .35, 0, Math.max(0, world.width - VIEW.width));

function makePlayer(spawn) {
  return { ...spawn, vx: 0, vy: 0, facing: 1, grounded: true,
    coyote: P.coyoteTime, jumpBuffer: 0, boostTime: 0, boostCooldown: 0 };
}

function partyContext(state) {
  return { world: state.stage === 'boss' ? state.arena : state.geometry,
    blocks: state.blocks.blocks, enemies: state.combat.enemies,
    supportSlots: helperAllowance(state.combat),
    bossTarget: state.boss ? bossSupportTarget(state.boss) : null,
    geometryVersion: `${state.stage}:${state.blocks.blocks.filter(b => b.broken).length}:${state.missionProgress.geometryVersion}` };
}

export function createState(leader = 'marco', mission = {}) {
  const world = mission.world ?? LEVEL;
  const arena = mission.arena ?? ARENA;
  const encounters = mission.encounters ?? ENCOUNTERS;
  const player = makePlayer(world.spawn);
  const state = {
    world, arena, mission, geometry: { ...world, platforms: world.platforms.map(platform => ({ ...platform })) },
    missionProgress: createMissionProgress(),
    player, party: createParty(player, leader), cameraX: cameraTarget(player, world), collected: new Set(),
    checkpointIndex: 0, score: 0, combo: 1, bestCombo: 1,
    comboTimer: 0, deaths: 0, time: 0, status: 'playing',
    accumulator: 0, pendingJump: false, pendingBoost: false, pendingMelee: {}, pendingInteract: false, pendingChoice: null, pendingPulse: false,
    stage: 'world', blocks: createBlocks(encounters.blocks), combat: createCombat(encounters), boss: null,
    partyDialogue: createPartyDialogue(), partyStarted: false
  };
  const recruits = companionIds(state.party);
  for (const block of state.blocks.blocks) {
    const slot = ['recruit-first', 'recruit-second'].indexOf(block.reward);
    if (slot !== -1) block.reward = `helper-${recruits[slot]}`;
  }
  initializeIndependentParty(state.party, player, partyContext(state));
  return state;
}

export function setPaused(state, paused) {
  if (state.status === 'complete') return;
  state.status = paused ? 'paused' : 'playing';
  state.accumulator = 0;
  state.pendingJump = false;
  state.pendingBoost = false;
  state.player.jumpBuffer = 0;
  state.pendingInteract = false; state.pendingChoice = null; state.pendingPulse = false;
  state.pendingMelee = {};
  state.party.manualAttack = false;
  state.party.companionTime = 0;
}

function enterArena(state) {
  const arena = state.arena;
  state.pendingMelee = {};
  state.stage = 'boss';
  state.player = makePlayer(arena.spawn);
  state.cameraX = 0;
  state.blocks = createBlocks([]);
  state.combat = createCombat({ enemies: [], pickups: [] });
  state.combat.blaster = arena.grantBlaster;
  state.boss = createBoss(arena);
  for (const station of arena.stations ?? []) delete state.missionProgress.jobs[station.id];
  state.boss.objectivesLocked = !missionReady(state);
  resetPartyMotion(state.party, state.player, arena.width, partyContext(state));
  clearPartyCaption(state.partyDialogue);
  state.pendingJump = false;
  state.pendingBoost = false;
}

function respawn(state, events) {
  const checkpoint = state.stage === 'boss'
    ? { name: state.arena.checkpointName, spawn: state.arena.spawn }
    : state.world.checkpoints[state.checkpointIndex];
  if (state.stage === 'boss') enterArena(state);
  else {
    state.player = makePlayer(checkpoint.spawn);
    state.cameraX = cameraTarget(state.player, state.world);
    resetCombat(state.combat);
    resetPartyMotion(state.party, state.player, state.world.width, partyContext(state));
    clearPartyCaption(state.partyDialogue);
  }
  state.combo = 1;
  state.comboTimer = 0;
  state.deaths += 1;
  state.pendingMelee = {};
  state.pendingJump = false;
  state.pendingBoost = false;
  // Keep collected sparks and score; repeated deaths cannot farm collectibles.
  events.push({ type: 'respawn', name: checkpoint.name });
}

function tick(state, input, events) {
  // Keep the existing playing/paused lifecycle during the victory presentation,
  // but bypass every physics, AI and combat update after the killing blow.
  if (state.boss?.defeated) {
    state.pendingJump = false; state.pendingBoost = false; state.pendingMelee = {};
    state.boss.defeatTime = Math.min(1.8, state.boss.defeatTime + STEP);
    if (state.boss.defeatTime >= 1.8) {
      state.status = 'complete';
      events.push({ type: 'complete', score: state.score, sparks: state.collected.size });
    }
    return;
  }
  const p = state.player;
  const arena = state.stage === 'boss';
  const world = arena ? state.arena : state.geometry;
  const combatEvents = [];
  state.time += STEP;
  updateMission(state, { interactPressed: state.pendingInteract, choice: state.pendingChoice,
    pulsePressed: state.pendingPulse }, STEP, events);
  state.pendingInteract = false; state.pendingChoice = null; state.pendingPulse = false;
  updatePartyDialogue(state.partyDialogue, STEP);
  updateBlocks(state.blocks, STEP);
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
  const oldY = p.y;
  const oldBottom = p.y + P.playerHeight;
  p.x = clamp(p.x + p.vx * STEP, 0, world.width - P.playerWidth);
  resolveBlockX(state.blocks, p, oldX);
  const gravity = state.mission.id === 'core' && p.x > 6500 && !arena ? .72 : 1;
  if (state.mission.id && input.jumpHeld === false && p.vy < -360) p.vy = -360;
  p.vy = Math.min(p.vy + P.gravity * gravity * STEP, P.maxFallSpeed);
  p.y += p.vy * STEP;
  p.grounded = false;
  const contact = resolveBlockY(state.blocks, p, oldY, events);
  // A solid-brick landing already resolved position and grounding. Do not
  // overwrite it with a nearby one-way platform from the same descent.
  if (p.vy >= 0 && !contact.ceiling && !contact.landed) {
    const newBottom = p.y + P.playerHeight;
    let landing = null;
    for (const platform of world.platforms) {
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

  if (p.y > world.deathY) {
    respawn(state, events);
    return;
  }
  for (const reward of collectBlockRewards(state.blocks, p)) {
    if (!unlockHelper(state.party, reward, combatEvents, p, partyContext(state))) {
      grantPower(state.combat, reward, combatEvents);
    }
  }
  updateParty(state.party, p, STEP, world.width);
  requestPartyAttacks(state.party, state.pendingMelee, combatEvents);
  state.pendingMelee = {};
  if (arena) updateBoss(state.boss, state.combat, p, STEP, combatEvents);
  updateCompanions(state.party, p, STEP, partyContext(state), combatEvents);
  updateCombat(state.combat, p, input, STEP, oldBottom, combatEvents, state.blocks.blocks, state.party);
  if (!arena) {
    const hazard = world.hazards.find(h => overlaps(body(p), h));
    if (hazard) hurtPlayer(state.combat, p, hazard.x + hazard.w / 2, combatEvents);
  }
  // World enemies remain defeated across respawns. Arena summons award no
  // points, preventing score farming when the boss encounter is reset.
  for (const event of combatEvents) {
    if (event.type === 'enemyDefeated') {
      if (arena) event.points = 0;
      else state.score += event.points;
    }
  }
  events.push(...combatEvents);
  if (state.combat.health <= 0) {
    respawn(state, events);
    return;
  }
  syncParty(state.party, p, world.width);
  if (arena) {
    const bossEvents = [];
    hitBoss(state.boss, state.combat, bossEvents, state.party, state.blocks.blocks);
    events.push(...bossEvents);
    if (state.boss.defeated) {
      const victory = bossEvents.find(event => event.type === 'bossDefeated');
      state.score += victory?.points ?? 0;
      // Results wait for the defeat presentation; scoring happens only here.
      p.vx = 0; p.vy = 0; p.boostTime = 0;
      state.pendingJump = false; state.pendingBoost = false; state.pendingMelee = {};
      // Freeze the team in place for victory; do not relocate companions.
      state.party.manualAttack = false;
      state.party.companionTime = 0;
      for (const actor of Object.values(state.party.actors)) {
        actor.attack = null; actor.vx = 0; actor.vy = 0; actor.boostTime = 0;
      }
      syncParty(state.party, p, world.width);
      // The early defeated-boss branch emits completion after the animation.
    }
    return;
  }
  const box = body(p);
  for (let i = state.checkpointIndex + 1; i < world.checkpoints.length; i++) {
    const c = world.checkpoints[i];
    if (overlaps(box, { x: c.x - 28, y: c.y - 110, w: 56, h: 110 })) {
      state.checkpointIndex = i;
      events.push({ type: 'checkpoint', name: c.name });
    }
  }
  for (const spark of world.sparks) {
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
  state.cameraX += (cameraTarget(p, world) - state.cameraX) * (1 - Math.exp(-8 * STEP));
  if (overlaps(box, world.goal) && missionReady(state)) {
    enterArena(state);
    events.push({ type: 'bossEnter', name: state.arena.name });
  }
}

export function update(state, input = {}, dt = 0) {
  const events = [];
  if (state.status !== 'playing') return events;
  state.pendingJump ||= Boolean(input.jumpPressed);
  state.pendingBoost ||= Boolean(input.boostPressed);
  state.pendingInteract ||= Boolean(input.interactPressed);
  state.pendingChoice ??= input.choice ?? null;
  state.pendingPulse ||= Boolean(input.pulsePressed);
  state.pendingMelee.attackPressed ||= Boolean(input.attackPressed);
  state.pendingMelee.helperPressed ||= Boolean(input.helperPressed);
  // Bound catch-up after stalls; small fixed steps keep collisions consistent.
  state.accumulator += Number.isFinite(dt) ? clamp(dt, 0, .1) : 0;
  while (state.accumulator >= STEP && state.status === 'playing') {
    state.accumulator -= STEP;
    tick(state, input, events);
  }
  if (state.status !== 'playing') state.accumulator = 0;
  const present = visibleParty(state.party).map(actor => actor.id);
  // Boss captions take precedence; do not queue party chatter behind them.
  if (state.boss?.dialogue.current) {
    clearPartyCaption(state.partyDialogue);
  } else if (!state.partyStarted) {
    sayParty(state.partyDialogue, 'start', present, events, state.party.leader);
    state.partyStarted = true;
  } else {
    reactPartyDialogue(state.partyDialogue, events.slice(), present, events);
  }
  return events;
}

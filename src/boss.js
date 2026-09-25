import { PHYSICS as P } from './level.js';
import { ARENA, ENEMY_TYPES } from './encounters.js';
import { overlaps, makeEnemy, spawnShot, hurtPlayer } from './combat.js';
import { createDialogue, updateDialogue, sayBoss } from './boss-dialogue.js';
import { activePartyAttacks, claimPartyHit } from './party.js';
import { wizardChestBounds } from './wizard-rig.js';

// Arena-only state. On entry/respawn the engine creates a fresh boss and
// arena combat, grants the blaster, and places Mario at ARENA.spawn.
// Fixed-step order: player physics -> updateBoss -> updateCombat -> hitBoss.
// Engine handles zero player health BEFORE hitBoss so death wins a tie.
// Only bossDefeated completes the game; never complete at the world beacon.
export function createBoss(arena = ARENA) {
  return { ...arena.boss, arena, maxHealth: arena.boss.health, phase: 0,
    mode: 'intro', timer: arena.boss.introDuration, age: 0,
    shotTimer: 0, grace: 0, cycle: 0, zones: [], defeated: false,
    helperDamage: 0, helperWindowDamage: 0,
    vx: 0, vy: 0, lookX: -1, lookY: 0, windup: 0,
    recoil: 0, attackPulse: 0, attackType: null, attackHistory: [],
    attackStep: 0, lockedTarget: null, interruptible: false,
    facing: -1, walkDistance: 0, phaseTurn: 0, followUp: null,
    safeZone: null, hitZone: null, safeUntil: 0, missedAttacks: 0,
    idleTime: 0, playerTurns: [], lastPlayer: null, lastPlayerHealth: null,
    dialogue: createDialogue(arena.dialogue, arena.behavior) };
}
// Helpers may contribute one third of total health, at most two per exposure.
// Keep the last point for the player; reset all counters with a fresh encounter.
function supportAllowance(boss) {
  return Math.max(0, Math.min(Math.floor(boss.maxHealth / 3) - boss.helperDamage,
    2 - boss.helperWindowDamage, boss.health - 1));
}

export function bossSupportTarget(boss) {
  if (boss.defeated || boss.objectivesLocked || !['returning', 'exposed'].includes(boss.mode)
      || supportAllowance(boss) <= 0) return null;
  const arena = boss.arena ?? ARENA;
  const platform = arena.platforms.find(p => p.id === 'arena-right');
  return { id: 'boss-core', x: arena.behavior === 'showman' ? boss.x : arena.boss.x,
    y: arena.behavior === 'showman' ? boss.y : arena.boss.y,
    w: boss.w, h: boss.h, exposed: boss.mode === 'exposed',
    approachY: arena.behavior === 'showman' ? boss.y + boss.h - P.playerHeight : platform.y - P.playerHeight };
}

const playerBox = p => ({ x: p.x, y: p.y, w: P.playerWidth, h: P.playerHeight });
const phaseFor = boss => boss.arena?.behavior === 'showman'
  ? boss.health > boss.maxHealth * .7 ? 0 : boss.health >= boss.maxHealth * .35 ? 1 : 2
  : Math.max(0, (boss.arena ?? ARENA).phases.findIndex(phase => boss.health > phase.healthAbove));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const SHOWMAN_MOVES = Object.freeze({
  slam: { name: 'Heavy Slam', warning: 1.65, duration: .65, recovery: 4.6 },
  volley: { name: 'Triple Volley', warning: 1.6, duration: 1.7, recovery: 3.8, beats: [.08, .54, 1] },
  charge: { name: 'Royal Charge', warning: 1.8, duration: 2.6, recovery: 5 },
  arenaControl: { name: 'Arena Control', warning: 1.85, duration: 2.2, recovery: 3.8 },
  reinforcements: { name: 'Reinforcements', warning: 1.9, duration: 4.5, recovery: 3.8 },
  overload: { name: 'Defensive Overload', warning: 1.55, duration: 3.7, release: 3, recovery: 5.2 },
  desperation: { name: 'Desperation Combo', warning: 1.55, duration: 2.55, recovery: 5.2, beats: [.08, .6, 1.9] },
  countdown: { name: 'Catastrophe Countdown', warning: 1.65, duration: 3.85, release: 3, recovery: 5.6 },
  burst: { name: 'Unstable Power Burst', warning: 1.55, duration: 3.5, recovery: 5.4, beats: [.08, 1.18, 2.38] }
});
for (const move of Object.values(SHOWMAN_MOVES)) {
  if (move.beats) Object.freeze(move.beats);
  Object.freeze(move);
}

const showmanFloor = boss => boss.arena.platforms.find(platform => platform.id === 'arena-floor').y;
const hostileShots = combat => combat.shots.some(shot => shot.owner === 'enemy' && shot.life > 0);
const corneredPlayer = (boss, player) => player.x < 120 || player.x + P.playerWidth > boss.arena.width - 120;

export function bossWeakPoint(boss) {
  if (boss.arena?.behavior !== 'showman' || !boss.interruptible || boss.defeated) return null;
  return wizardChestBounds(boss);
}

function rememberShowmanAttack(boss, attack) {
  boss.attackType = attack;
  boss.attackHistory.push(attack);
  if (boss.attackHistory.length > 4) boss.attackHistory.shift();
}

function chooseShowmanAttack(boss, player) {
  const distance = Math.abs(player.x + P.playerWidth / 2 - boss.x - boss.w / 2);
  const basic = boss.playerTurns.length >= 2 ? 'charge' : distance < 280 ? 'slam' : distance > 520 ? 'volley'
    : boss.phaseTurn % 2 ? 'charge' : 'slam';
  const pattern = boss.phase === 1 ? ['volley', 'arenaControl', 'reinforcements', 'overload', basic]
    : boss.phase === 2 ? ['desperation', 'countdown', 'burst', basic] : [basic];
  const pool = boss.phase === 0 ? ['slam', 'volley', 'charge']
    : boss.phase === 1 ? ['volley', 'slam', 'arenaControl', 'reinforcements', 'overload', 'charge']
      : ['desperation', 'countdown', 'burst', 'slam', 'volley', 'charge'];
  let attack = pattern[boss.phaseTurn % pattern.length];
  const cornered = corneredPlayer(boss, player);
  if (attack === 'charge' && cornered) attack = 'volley';
  const repeated = candidate => boss.attackHistory.length >= 2 && boss.attackHistory.slice(-2).every(last => last === candidate);
  if (repeated(attack)) attack = pool.find(candidate => candidate !== attack && !(cornered && candidate === 'charge'));
  boss.phaseTurn += 1;
  return attack;
}

function prepareShowman(boss, player) {
  boss.phase = phaseFor(boss);
  rememberShowmanAttack(boss, chooseShowmanAttack(boss, player));
  boss.followUp = boss.phase === 1 && boss.attackType === 'volley' ? 'slam' : null;
  boss.mode = 'reposition'; boss.zones = []; boss.safeZone = null; boss.hitZone = null;
  boss.interruptible = false; boss.attackStep = 0; boss.windup = 0;
  boss.cycle += 1;
  const playerCenter = player.x + P.playerWidth / 2;
  const side = boss.x + boss.w / 2 >= playerCenter ? 1 : -1;
  const gap = boss.attackType === 'slam' ? 230 : 400;
  boss.targetX = boss.attackType === 'countdown' ? (boss.arena.width - boss.w) / 2
    : clamp(playerCenter + side * gap - boss.w / 2, 110, boss.arena.width - boss.w - 110);
  boss.moveSpeed = [70, 115, 155][boss.phase];
  boss.timer = boss.attackType === 'countdown' ? Math.abs(boss.targetX - boss.x) / boss.moveSpeed + .25
    : (corneredPlayer(boss, player) ? 1.8 : [1.15, 1, .85][boss.phase]);
  boss.facing = -side;
}

function showmanWarning(boss, combat, player, events) {
  const arena = boss.arena;
  const move = SHOWMAN_MOVES[boss.attackType];
  const floor = showmanFloor(boss);
  const center = boss.x + boss.w / 2;
  boss.mode = 'warning'; boss.warningDuration = Math.max(1.25, move.warning - boss.phase * .12);
  boss.timer = boss.warningDuration; boss.vx = 0; boss.windup = 0;
  boss.attackStep = 0; boss.zones = []; boss.safeZone = null; boss.hitZone = null;
  boss.attackStartHealth = combat.health;
  boss.lockedTarget = { x: player.x + P.playerWidth / 2, y: player.y + P.playerHeight / 2 };
  boss.facing = boss.lockedTarget.x < center ? -1 : 1;
  boss.chargeDirection = boss.facing;
  boss.shotOrigin = { x: center + boss.facing * 167, y: floor - 134 };
  boss.lockedAngle = Math.atan2(boss.lockedTarget.y - boss.shotOrigin.y, boss.lockedTarget.x - boss.shotOrigin.x);
  if (boss.attackType === 'charge') {
    const left = boss.facing < 0 ? 0 : boss.x;
    boss.zones = [{ x: left, y: floor - 46, w: boss.facing < 0 ? boss.x + boss.w : arena.width - left,
      h: 46, active: false, kind: 'charge' }];
  } else if (['arenaControl', 'countdown'].includes(boss.attackType)) {
    const countdown = boss.attackType === 'countdown';
    const safeX = countdown ? player.x < arena.width / 2 ? 70 : arena.width - 310
      : clamp(player.x - 100, 0, arena.width - 260);
    const safeWidth = countdown ? 240 : 260;
    const zoneY = countdown ? 0 : floor - 38;
    boss.safeZone = { x: safeX, y: zoneY, w: safeWidth, h: floor - zoneY };
    boss.zones = [{ x: 0, y: zoneY, w: safeX, h: floor - zoneY, active: false, kind: 'floor' },
      { x: safeX + safeWidth, y: zoneY, w: arena.width - safeX - safeWidth,
        h: floor - zoneY, active: false, kind: 'floor' }].filter(zone => zone.w > 0);
  } else if (boss.attackType === 'reinforcements') {
    const available = Math.max(0, 2 - combat.enemies.filter(enemy => !enemy.dead).length);
    boss.zones = [160, 430, 760, 1080].filter(position => Math.abs(position - player.x) > 200)
      .sort((left, right) => Math.abs(right - player.x) - Math.abs(left - player.x)).slice(0, available)
      .map(position => ({ x: position - 30, y: floor - 48, w: 60, h: 48, active: false, kind: 'summon' }));
  } else if (['slam', 'desperation', 'overload', 'burst'].includes(boss.attackType)) {
    boss.zones = [-1, 1].map(side => ({ x: center + side * 167 - 35, y: floor - 30,
      w: 70, h: 30, active: false, kind: 'impact' }));
  }
  events.push({ type: 'bossWarning', phase: boss.phase, name: move.name,
    attack: boss.attackType, duration: boss.warningDuration });
  sayBoss(boss.dialogue, boss.attackType, events);
}

function showmanWave(boss, combat, direction, speed, height = 26) {
  const origin = boss.x + boss.w / 2 + direction * 167;
  const travel = direction < 0 ? origin + 40 : boss.arena.width - origin + 40;
  spawnShot(combat, { owner: 'enemy', kind: 'wave', style: 'wizard', x: origin - 16, y: showmanFloor(boss) - height,
    w: 32, h: height, vx: direction * speed, vy: 0, life: travel / speed + .1 });
}

function showmanVolley(boss, combat, spread, speed = 235) {
  const angle = boss.lockedAngle + spread;
  spawnShot(combat, { owner: 'enemy', kind: 'token', style: 'wizard', x: boss.shotOrigin.x - 8, y: boss.shotOrigin.y - 8,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 16, h: 16, life: 4.5 });
}

function exposeShowman(boss, combat, events, interrupted = false) {
  boss.mode = 'exposed'; boss.timer = SHOWMAN_MOVES[boss.attackType]?.recovery ?? 4.6;
  if (interrupted) {
    boss.timer = Math.max(5, boss.timer);
    combat.shots = combat.shots.filter(shot => shot.owner === 'player');
  }
  boss.interruptible = false; boss.helperWindowDamage = 0; boss.zones = []; boss.hitZone = null;
  boss.safeZone = null; boss.followUp = null; boss.vx = 0; boss.windup = 0;
  boss.attackElapsed = 0;
  events.push({ type: 'bossExposed', duration: boss.timer, attack: boss.attackType });
  if (!interrupted) sayBoss(boss.dialogue, 'exposed', events);
}

function beginShowmanAttack(boss, combat, events) {
  const move = SHOWMAN_MOVES[boss.attackType];
  boss.mode = 'attack'; boss.timer = move.duration; boss.attackElapsed = 0;
  boss.interruptible = ['overload', 'countdown'].includes(boss.attackType);
  boss.countdown = move.release ?? 0;
  if (boss.attackType === 'countdown') events.push({ type: 'bossCountdown', value: 3 });
  if (boss.attackType === 'reinforcements') {
    combat.enemies = combat.enemies.filter(enemy => !enemy.dead);
    for (const [index, zone] of boss.zones.entries()) {
      if (combat.enemies.length >= 2) break;
      const position = zone.x + 15;
      combat.enemies.push(makeEnemy({ id: `wizard-helper-${boss.cycle}-${index}`, kind: 'robot',
        x: position, y: showmanFloor(boss) - ENEMY_TYPES.robot.h, health: 1, speed: 42,
        minX: Math.max(25, position - 110), maxX: Math.min(boss.arena.width - 55, position + 110),
        facing: boss.lockedTarget.x < position ? -1 : 1 }));
    }
    boss.zones = [];
  }
  events.push({ type: 'bossAttack', phase: boss.phase, attack: boss.attackType });
}

function updateShowmanAttack(boss, combat, player, step, events) {
  const move = SHOWMAN_MOVES[boss.attackType];
  const elapsed = move.duration - boss.timer;
  boss.attackElapsed = elapsed;
  const previousCount = Math.ceil(boss.countdown);
  boss.countdown = Math.max(0, (move.release ?? 0) - elapsed);
  if (boss.attackType === 'countdown' && boss.countdown > 0 && Math.ceil(boss.countdown) !== previousCount) {
    events.push({ type: 'bossCountdown', value: Math.ceil(boss.countdown) });
  }
  if (move.release !== undefined && elapsed >= move.release) boss.interruptible = false;
  const beat = move.beats?.[boss.attackStep];
  if (boss.attackType === 'slam' && boss.attackStep === 0) {
    for (const direction of [-1, 1]) showmanWave(boss, combat, direction, 220);
    boss.attackStep = 1; boss.attackPulse = .4;
    events.push({ type: 'bossImpact', attack: boss.attackType });
  } else if (boss.attackType === 'volley' && beat !== undefined && elapsed >= beat) {
    showmanVolley(boss, combat, (boss.attackStep - 1) * .13);
    boss.attackStep += 1; boss.attackPulse = .25;
  } else if (boss.attackType === 'charge') {
    boss.vx = boss.chargeDirection * (500 + boss.phase * 45);
    boss.x += boss.vx * step; boss.walkDistance += Math.abs(boss.vx * step);
    const edge = boss.chargeDirection < 0 ? 110 : boss.arena.width - boss.w - 110;
    boss.hitZone = { x: boss.x + 20, y: showmanFloor(boss) - 46, w: boss.w - 40, h: 46 };
    if (overlaps(playerBox(player), boss.hitZone)) hurtPlayer(combat, player, boss.x + boss.w / 2, events);
    if ((boss.chargeDirection < 0 && boss.x <= edge) || (boss.chargeDirection > 0 && boss.x >= edge)) {
      boss.x = edge; boss.recoil = .55;
      events.push({ type: 'bossStunned', reason: 'wall', attack: boss.attackType });
      sayBoss(boss.dialogue, 'chargeMiss', events);
      exposeShowman(boss, combat, events, true);
      return;
    }
  } else if (['arenaControl', 'countdown'].includes(boss.attackType)) {
    const active = boss.attackType === 'arenaControl' || elapsed >= move.release;
    if (active && boss.attackStep === 0) {
      boss.attackStep = 1; boss.attackPulse = .45;
      events.push({ type: 'bossImpact', attack: boss.attackType });
    }
    for (const zone of boss.zones) {
      zone.active = active;
      if (active && overlaps(playerBox(player), zone)) hurtPlayer(combat, player, zone.x + zone.w / 2, events);
    }
  } else if (boss.attackType === 'overload' && elapsed >= move.release && boss.attackStep === 0) {
    for (const direction of [-1, 1]) showmanWave(boss, combat, direction, 255, 32);
    boss.attackStep = 1; boss.attackPulse = .45;
    events.push({ type: 'bossImpact', attack: boss.attackType });
  } else if (boss.attackType === 'desperation' && beat !== undefined && elapsed >= beat) {
    if (boss.attackStep < 2) showmanVolley(boss, combat, boss.attackStep === 0 ? -.11 : .11, 245);
    else for (const direction of [-1, 1]) showmanWave(boss, combat, direction, 245, 32);
    boss.attackStep += 1; boss.attackPulse = .4;
    events.push({ type: 'bossImpact', attack: boss.attackType, strike: boss.attackStep });
  } else if (boss.attackType === 'burst' && beat !== undefined && elapsed >= beat) {
    for (const direction of [-1, 1]) showmanWave(boss, combat, direction, 200 + boss.attackStep * 20);
    boss.attackStep += 1; boss.attackPulse = .35;
    events.push({ type: 'bossImpact', attack: boss.attackType, strike: boss.attackStep });
    if (boss.attackStep === 3) sayBoss(boss.dialogue, 'malfunction', events);
  }
  if (boss.timer === 0) {
    if (boss.followUp && !corneredPlayer(boss, player) && combat.health === boss.attackStartHealth) {
      boss.mode = 'comboGap'; boss.timer = 1.15; boss.zones = []; boss.vx = 0;
    } else exposeShowman(boss, combat, events);
  }
}

function observeShowman(boss, combat, player, step) {
  const previous = boss.lastPlayer;
  const side = Math.sign(player.x + P.playerWidth / 2 - boss.x - boss.w / 2);
  if (previous) {
    const movement = player.x - previous.x;
    boss.idleTime = Math.abs(movement) < .2 && Math.abs(player.y - previous.y) < .2
      && !combat.shots.some(shot => shot.owner === 'player' && shot.life > 0) ? boss.idleTime + step : 0;
    if (side !== previous.side && Math.abs(movement) > .5) boss.playerTurns.push(boss.age);
  }
  boss.playerTurns = boss.playerTurns.filter(age => boss.age - age < 6).slice(-4);
  boss.lastPlayer = { x: player.x, y: player.y, side };
  if (boss.lastPlayerHealth !== null && combat.health < boss.lastPlayerHealth) {
    boss.safeUntil = boss.age + 2.5; boss.followUp = null; boss.missedAttacks = 0; boss.reportedMisses = 0;
  }
  boss.lastPlayerHealth = combat.health;
}

function updateShowman(boss, combat, player, step, events) {
  observeShowman(boss, combat, player, step);
  boss.y = showmanFloor(boss) - boss.h;
  boss.lookX = clamp((player.x + P.playerWidth / 2 - boss.x - boss.w / 2) / 240, -1, 1);
  boss.lookY = clamp((player.y + P.playerHeight / 2 - boss.y - boss.h / 2) / 160, -1, 1);
  boss.recoil = Math.max(0, boss.recoil - step); boss.attackPulse = Math.max(0, boss.attackPulse - step);
  if (boss.mode === 'intro' && boss.timer === 0) prepareShowman(boss, player);
  else if (boss.mode === 'reposition') {
    const previousX = boss.x;
    boss.x += clamp(boss.targetX - boss.x, -boss.moveSpeed * step, boss.moveSpeed * step);
    boss.vx = (boss.x - previousX) / step;
    boss.walkDistance += Math.abs(boss.x - previousX);
    if (boss.timer === 0 && boss.age >= boss.safeUntil && !hostileShots(combat)) showmanWarning(boss, combat, player, events);
  } else if (boss.mode === 'warning') {
    boss.windup = clamp((boss.warningDuration - boss.timer) / Math.max(.1, boss.warningDuration - .3), 0, 1);
    if (boss.timer === 0) beginShowmanAttack(boss, combat, events);
  } else if (boss.mode === 'attack') updateShowmanAttack(boss, combat, player, step, events);
  else if (boss.mode === 'comboGap' && boss.timer === 0 && !hostileShots(combat) && boss.age >= boss.safeUntil) {
    if (boss.followUp && !corneredPlayer(boss, player)) {
      rememberShowmanAttack(boss, boss.followUp); boss.followUp = null;
      showmanWarning(boss, combat, player, events);
    } else exposeShowman(boss, combat, events);
  } else if (boss.mode === 'exposed' && boss.timer === 0 && !hostileShots(combat) && boss.age >= boss.safeUntil) {
    if (combat.health === boss.attackStartHealth && boss.attackType !== 'reinforcements') boss.missedAttacks += 1;
    prepareShowman(boss, player);
  }
  boss.x = clamp(boss.x, 110, boss.arena.width - boss.w - 110);
  if (boss.phase === 2 && !boss.lowHealthSpoken) {
    boss.lowHealthSpoken = Boolean(sayBoss(boss.dialogue, 'lowHealth', events));
  }
  if (['reposition', 'exposed', 'comboGap'].includes(boss.mode)) {
    if (boss.missedAttacks >= 2 && boss.missedAttacks > (boss.reportedMisses ?? 0)) {
      if (sayBoss(boss.dialogue, boss.lastMissJoke === 'dodge' ? 'miss' : 'dodge', events)) {
        boss.reportedMisses = boss.missedAttacks;
        boss.lastMissJoke = boss.lastMissJoke === 'dodge' ? 'miss' : 'dodge';
      }
    } else if (boss.idleTime >= 6) sayBoss(boss.dialogue, 'idle', events);
  }
}

function moveCore(boss, player, dt) {
  const arena = boss.arena ?? ARENA;
  const exposed = boss.mode === 'exposed';
  const returning = boss.mode === 'returning';
  // Fly above the platforms; descend only beside the right platform.
  // Return along a safe overhead corridor rather than sweeping through Mario.
  const homeX = arena.boss.x;
  const aboveHome = Math.abs(boss.x - homeX) < 18;
  const overhead = boss.y <= 205;
  const targetX = exposed || returning ? (overhead || aboveHome ? homeX : boss.x)
    : (overhead ? 600 + Math.cos(boss.age * .65) * 430 : boss.x);
  const targetY = exposed || (returning && aboveHome) ? arena.boss.y
    : 155 + Math.sin(boss.age * .9) * 25;
  boss.vx += ((targetX - boss.x) * 18 - boss.vx * 9) * dt;
  boss.vy += ((targetY - boss.y) * 18 - boss.vy * 9) * dt;
  boss.vx = clamp(boss.vx, -360, 360);
  boss.vy = clamp(boss.vy, -230, 230);
  const x = boss.x + boss.vx * dt, y = boss.y + boss.vy * dt;
  boss.x = clamp(x, 120, arena.width - boss.w - 100);
  boss.y = clamp(y, 120, arena.boss.y);
  if (boss.x !== x) boss.vx = 0;
  if (boss.y !== y) boss.vy = 0;
  boss.lookX = clamp((player.x + P.playerWidth / 2 - boss.x - boss.w / 2) / 300, -1, 1);
  boss.lookY = clamp((player.y + P.playerHeight / 2 - boss.y - boss.h / 2) / 180, -1, 1);
  boss.windup = boss.mode === 'warning'
    ? clamp(1 - boss.timer / Math.max(1.6, arena.phases[boss.phase].warningTime), 0, 1) : 0;
  boss.recoil = Math.max(0, boss.recoil - dt);
  boss.attackPulse = Math.max(0, boss.attackPulse - dt);
}
function clearThreats(combat) {
  combat.shots = combat.shots.filter(shot => shot.owner === 'player');
  combat.enemies = [];
}
function warn(boss, player, events) {
  const arena = boss.arena ?? ARENA;
  boss.phase = phaseFor(boss);
  const phase = arena.phases[boss.phase];
  boss.mode = 'warning'; boss.timer = Math.max(1.6, phase.warningTime);
  boss.cycle += 1; boss.zones = [];
  if (phase.attack === 'agents') {
    const x = Math.max(0, Math.min(arena.width - 100, player.x - 32));
    // Full-height beam: move out of its marked column before activation.
    boss.zones.push({ x, y: 0, w: 100, h: 630, active: false });
  }
  events.push({ type: 'bossWarning', phase: boss.phase, name: phase.name });
  sayBoss(boss.dialogue, phase.attack, events);
}
function summon(boss, combat) {
  const arena = boss.arena ?? ARENA;
  combat.enemies = combat.enemies.filter(enemy => !enemy.dead);
  const count = Math.min(2, arena.phases[boss.phase].summonCount,
    arena.maxMinions - combat.enemies.length);
  for (let i = 0; i < count; i++) {
    const x = arena.summonPoints[i];
    const type = ENEMY_TYPES.robot;
    combat.enemies.push(makeEnemy({ id: `agent-${boss.cycle}-${i}`, kind: 'robot',
      x, y: 630 - type.h, minX: Math.max(30, x - 95),
      maxX: Math.min(arena.width - type.w - 30, x + 95), facing: i % 2 ? -1 : 1 }));
  }
}
function attack(boss, combat, player) {
  const arena = boss.arena ?? ARENA;
  const phase = arena.phases[boss.phase];
  if (combat.shots.filter(s => s.owner === 'enemy' && s.life > 0).length >= 2) return;
  if (phase.attack === 'tokens') {
    const x = boss.x + boss.w / 2 - 7, y = boss.y + boss.h;
    const dx = player.x + P.playerWidth / 2 - x;
    const dy = player.y + P.playerHeight / 2 - y;
    // Do not launch a point-blank projectile at a jumping player.
    if (Math.hypot(dx, dy) < 180) return;
    const angle = Math.atan2(dy, dx);
    const speed = Math.min(160, phase.projectileSpeed);
    spawnShot(combat, { owner: 'enemy', kind: 'token', x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      w: 14, h: 14, life: 3.5 });
  } else if (phase.attack === 'waves') {
    // Always enter from the right edge, never materialize beneath Mario.
    if (player.x > arena.width - 240) return;
    spawnShot(combat, { owner: 'enemy', kind: 'wave',
      x: arena.width - 34, y: 604, w: 32, h: 26,
      vx: -Math.min(180, phase.waveSpeed), vy: 0, life: 7 });
  }
  boss.attackPulse = .3;
}
export function updateBoss(boss, combat, player, dt, events) {
  if (boss.defeated || combat.health <= 0 || !Number.isFinite(dt) || dt <= 0) return;
  const step = Math.min(dt, 1 / 60);
  const arena = boss.arena ?? ARENA;
  updateDialogue(boss.dialogue, step);
  if (boss.age === 0) sayBoss(boss.dialogue, 'entrance', events);
  boss.age += step; boss.timer = Math.max(0, boss.timer - step);
  boss.grace = Math.max(0, boss.grace - step);
  if (arena.behavior === 'showman') {
    updateShowman(boss, combat, player, step, events);
    return;
  }
  moveCore(boss, player, step);
  const phase = arena.phases[boss.phase];
  if (boss.mode === 'intro') {
    if (boss.timer === 0) warn(boss, player, events);
  } else if (boss.mode === 'warning') {
    if (boss.timer === 0) {
      boss.mode = 'attack'; boss.timer = phase.attackDuration; boss.shotTimer = .5;
      boss.attackPulse = .4;
      if (phase.attack === 'agents') summon(boss, combat);
      events.push({ type: 'bossAttack', phase: boss.phase });
    }
  } else if (boss.mode === 'attack') {
    const elapsed = phase.attackDuration - boss.timer;
    for (const zone of boss.zones) {
      zone.active = elapsed < phase.dangerDuration;
      if (zone.active && overlaps(playerBox(player), zone)) {
        hurtPlayer(combat, player, zone.x + zone.w / 2, events);
      }
    }
    if (phase.attack !== 'agents') {
      boss.shotTimer -= step;
      if (boss.shotTimer <= 0 && boss.timer > 0) {
        attack(boss, combat, player); boss.shotTimer += Math.max(1.6, phase.interval);
      }
    }
    if (boss.timer === 0) {
      boss.mode = 'returning';
      boss.helperWindowDamage = 0;
      boss.zones = []; clearThreats(combat);
    }
  } else if (boss.mode === 'returning') {
    // Recovery time starts after arrival, not while the core is out of reach.
    if (Math.abs(boss.x - arena.boss.x) < 8 && Math.abs(boss.y - arena.boss.y) < 8) {
      boss.x = arena.boss.x; boss.y = arena.boss.y;
      boss.vx = 0; boss.vy = 0;
      boss.mode = 'exposed'; boss.timer = Math.max(5, arena.boss.vulnerableDuration);
      events.push({ type: 'bossExposed', duration: boss.timer });
      sayBoss(boss.dialogue, 'exposed', events);
    }
  } else if (boss.mode === 'exposed' && boss.timer === 0) {
    warn(boss, player, events);
  }
  if (boss.mode !== 'intro' && overlaps(playerBox(player), boss)) {
    hurtPlayer(combat, player, boss.x + boss.w / 2, events);
  }
}

// Shots move in updateCombat; consume overlapping survivors here. The full
// visible core rectangle is hittable during exposure, including shots fired
// from the right arena platform. Shielded shots are consumed without damage.
export function hitBoss(boss, combat, events, party = null, solids = []) {
  if (boss.defeated || combat.health <= 0) return;
  const arena = boss.arena ?? ARENA;
  // Player shots retain priority. Melee is evaluated against actual core bounds,
  // never against the AI's predicted recovery target or decorative artwork.
  const attacks = party ? activePartyAttacks(party).filter(strike => {
    if (!overlaps(strike, boss)) return false;
    const contactX = (Math.max(strike.x, boss.x)
      + Math.min(strike.x + strike.w, boss.x + boss.w)) / 2;
    const corridor = { x: Math.min(strike.originX, contactX), y: strike.y,
      w: Math.max(1, Math.abs(contactX - strike.originX)), h: strike.h };
    return !solids.some(block => !block.broken && overlaps(corridor, block));
  }).map(strike => ({ ...strike, owner: 'player', life: 1, melee: true,
    helper: strike.actorId !== party.leader })) : [];
  for (const shot of [...combat.shots, ...attacks]) {
    if (shot.life <= 0 || shot.owner !== 'player' || !overlaps(shot, boss)) continue;
    const weakPoint = bossWeakPoint(boss);
    if (weakPoint && !overlaps(shot, weakPoint)) {
      if (shot.melee || shot.y + shot.h <= weakPoint.y || shot.y >= weakPoint.y + weakPoint.h) shot.life = 0;
      continue;
    }
    shot.life = 0;
    if (boss.objectivesLocked || (!boss.interruptible && boss.mode !== 'exposed') || boss.grace > 0) continue;
    const damage = shot.helper ? Math.min(shot.damage, supportAllowance(boss)) : shot.damage;
    if (damage <= 0) continue;
    if (shot.melee && !claimPartyHit(party, shot, 'boss-core')) continue;
    boss.health = Math.max(0, boss.health - damage);
    if (shot.helper) {
      boss.helperDamage += damage;
      boss.helperWindowDamage += damage;
    }
    boss.grace = arena.boss.damageGrace;
    boss.recoil = .28;
    // Keep the recovery target stationary; artwork still shows hit recoil.
    boss.vx = 0;
    events.push({ type: 'bossHit', health: boss.health, maxHealth: boss.maxHealth,
      actorId: shot.actorId ?? party?.leader ?? 'player',
      helper: Boolean(shot.helper), damage });
    if (boss.health === 0) {
      boss.defeated = true; boss.mode = 'defeated'; boss.timer = 0;
      boss.defeatTime = 0;
      boss.zones = []; combat.shots = []; combat.enemies = [];
      boss.interruptible = false; boss.safeZone = null; boss.hitZone = null; boss.followUp = null;
      boss.vx = 0; boss.vy = 0; boss.windup = 0; boss.attackPulse = 0;
      events.push({ type: 'bossDefeated', name: arena.name, points: 3000 });
      sayBoss(boss.dialogue, 'defeat', events);
      return;
    }
    if (boss.interruptible) {
      const interrupted = boss.attackType === 'countdown' ? 'countdownBreak' : 'shieldBreak';
      events.push({ type: 'bossStunned', reason: 'interrupt', attack: boss.attackType });
      sayBoss(boss.dialogue, interrupted, events);
      exposeShowman(boss, combat, events, true);
    }
    const nextPhase = phaseFor(boss);
    if (nextPhase !== boss.phase) {
      boss.phase = nextPhase; boss.mode = 'intro'; boss.timer = arena.boss.introDuration;
      boss.phaseTurn = 0; boss.followUp = null; boss.interruptible = false;
      boss.safeZone = null; boss.hitZone = null; boss.attackType = null;
      boss.zones = []; clearThreats(combat);
      events.push({ type: 'bossPhase', phase: nextPhase, name: arena.phases[nextPhase].name });
      sayBoss(boss.dialogue, nextPhase === 1 ? 'phase1' : 'phase2', events);
      break;
    }
    sayBoss(boss.dialogue, 'hit', events);
  }
  combat.shots = combat.shots.filter(shot => shot.life > 0);
}

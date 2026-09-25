import { PHYSICS as P } from './level.js';
import { ARENA, ENEMY_TYPES } from './encounters.js';
import { overlaps, makeEnemy, spawnShot, hurtPlayer } from './combat.js';
import { createDialogue, updateDialogue, sayBoss } from './boss-dialogue.js';
import { activePartyAttacks, claimPartyHit } from './party.js';

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
    dialogue: createDialogue(arena.dialogue) };
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
    approachY: platform.y - P.playerHeight };
}

const playerBox = p => ({ x: p.x, y: p.y, w: P.playerWidth, h: P.playerHeight });
const phaseFor = boss => Math.max(0, (boss.arena ?? ARENA).phases.findIndex(phase => boss.health > phase.healthAbove));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const SHOWMAN_ATTACKS = [
  ['slam', 'volley', 'charge'],
  ['volley', 'slam', 'arenaControl', 'reinforcements', 'overload'],
  ['desperation', 'countdown', 'burst']
];

function chooseShowmanAttack(boss, player) {
  const pool = SHOWMAN_ATTACKS[boss.phase];
  const distance = Math.abs(player.x + P.playerWidth / 2 - boss.x - boss.w / 2);
  let preferred = boss.phase === 0
    ? distance < 230 ? 'slam' : distance > 540 ? 'volley' : 'charge'
    : pool[boss.cycle % pool.length];
  const lastTwo = boss.attackHistory.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every(attack => attack === preferred)) {
    preferred = pool[(pool.indexOf(preferred) + 1) % pool.length];
  }
  boss.attackHistory.push(preferred);
  if (boss.attackHistory.length > 4) boss.attackHistory.shift();
  return preferred;
}

function showmanWarning(boss, player, events) {
  const arena = boss.arena;
  boss.phase = phaseFor(boss);
  boss.attackType = chooseShowmanAttack(boss, player);
  boss.mode = 'warning'; boss.timer = boss.phase === 2 ? 1.15 : 1.55;
  boss.cycle += 1; boss.attackStep = 0; boss.zones = [];
  boss.lockedTarget = { x: player.x + P.playerWidth / 2, y: player.y + P.playerHeight / 2 };
  const direction = boss.lockedTarget.x < boss.x + boss.w / 2 ? -1 : 1;
  boss.chargeDirection = direction;
  if (boss.attackType === 'charge') {
    const x = direction < 0 ? 0 : boss.x + boss.w;
    boss.zones.push({ x, y: 520, w: direction < 0 ? boss.x : arena.width - x,
      h: 110, active: false, kind: 'charge' });
  } else if (boss.attackType === 'arenaControl') {
    const safeX = clamp(player.x - 75, 180, arena.width - 330);
    boss.zones.push({ x: 0, y: 585, w: safeX, h: 45, active: false, kind: 'floor' });
    boss.zones.push({ x: safeX + 180, y: 585, w: arena.width - safeX - 180,
      h: 45, active: false, kind: 'floor' });
  } else if (boss.attackType === 'countdown') {
    const safeX = player.x < arena.width / 2 ? 80 : arena.width - 300;
    boss.safeZone = { x: safeX, y: 540, w: 220, h: 90 };
    boss.zones.push({ x: 0, y: 0, w: safeX, h: 630, active: false, kind: 'countdown' });
    boss.zones.push({ x: safeX + 220, y: 0, w: arena.width - safeX - 220,
      h: 630, active: false, kind: 'countdown' });
  }
  events.push({ type: 'bossWarning', phase: boss.phase,
    name: arena.phases[boss.phase].name, attack: boss.attackType });
  sayBoss(boss.dialogue, boss.attackType, events);
}

function showmanShot(boss, combat, speed, spread = 0) {
  const originX = boss.x + boss.w / 2;
  const originY = boss.y + boss.h * .42;
  const angle = Math.atan2(boss.lockedTarget.y - originY,
    boss.lockedTarget.x - originX) + spread;
  spawnShot(combat, { owner: 'enemy', kind: 'token', x: originX, y: originY,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 16, h: 16, life: 5 });
}

function exposeShowman(boss, combat, events, longRecovery = false) {
  boss.mode = 'exposed'; boss.timer = longRecovery ? 4.8 : boss.phase === 0 ? 4.2 : 3.4;
  boss.interruptible = false; boss.helperWindowDamage = 0; boss.zones = [];
  clearThreats(combat);
  events.push({ type: 'bossExposed', duration: boss.timer, attack: boss.attackType });
  sayBoss(boss.dialogue, 'exposed', events);
}

function beginShowmanAttack(boss, combat, events) {
  const durations = { slam: .7, volley: 2.2, charge: 2.4, arenaControl: 2.5,
    reinforcements: 2.2, overload: 3.2, desperation: 2.4, countdown: 4.2, burst: 3.2 };
  boss.mode = 'attack'; boss.timer = durations[boss.attackType]; boss.shotTimer = .12;
  boss.attackPulse = .45; boss.interruptible = ['overload', 'countdown'].includes(boss.attackType);
  if (boss.attackType === 'reinforcements') summon(boss, combat);
  events.push({ type: 'bossAttack', phase: boss.phase, attack: boss.attackType });
}

function updateShowmanAttack(boss, combat, player, step, events) {
  const elapsed = ({ slam: .7, volley: 2.2, charge: 2.4, arenaControl: 2.5,
    reinforcements: 2.2, overload: 3.2, desperation: 2.4, countdown: 4.2, burst: 3.2 })[boss.attackType] - boss.timer;
  if (boss.attackType === 'slam' && boss.attackStep === 0) {
    for (const direction of [-1, 1]) spawnShot(combat, { owner: 'enemy', kind: 'wave',
      x: boss.x + boss.w / 2, y: 604, w: 32, h: 26, vx: direction * 175, vy: 0, life: 5 });
    boss.attackStep = 1;
  } else if (boss.attackType === 'volley') {
    boss.shotTimer -= step;
    if (boss.shotTimer <= 0 && boss.attackStep < 3) {
      showmanShot(boss, combat, 220, (boss.attackStep - 1) * .12);
      boss.attackStep += 1; boss.shotTimer = .48;
    }
  } else if (boss.attackType === 'charge') {
    boss.x += boss.chargeDirection * (boss.phase === 0 ? 330 : 390) * step;
    const edge = boss.chargeDirection < 0 ? 35 : boss.arena.width - boss.w - 35;
    if ((boss.chargeDirection < 0 && boss.x <= edge) || (boss.chargeDirection > 0 && boss.x >= edge)) {
      boss.x = edge; boss.recoil = .6;
      sayBoss(boss.dialogue, 'chargeMiss', events); exposeShowman(boss, combat, events, true); return;
    }
  } else if (boss.attackType === 'arenaControl' || boss.attackType === 'countdown') {
    const active = boss.attackType === 'arenaControl' ? elapsed > .65 : boss.timer < 1.1;
    for (const zone of boss.zones) {
      zone.active = active;
      if (active && overlaps(playerBox(player), zone)) hurtPlayer(combat, player, zone.x + zone.w / 2, events);
    }
  } else if (boss.attackType === 'overload' && boss.timer < .25 && boss.attackStep === 0) {
    for (const direction of [-1, 1]) spawnShot(combat, { owner: 'enemy', kind: 'wave',
      x: boss.x + boss.w / 2, y: 604, w: 32, h: 26, vx: direction * 230, vy: 0, life: 5 });
    boss.attackStep = 1;
  } else if (boss.attackType === 'desperation') {
    boss.shotTimer -= step;
    const delays = [.15, .38, .9];
    if (boss.attackStep < 3 && boss.shotTimer <= 0) {
      showmanShot(boss, combat, boss.attackStep === 2 ? 285 : 245,
        boss.attackStep === 0 ? -.1 : boss.attackStep === 1 ? .1 : 0);
      boss.shotTimer = delays[boss.attackStep]; boss.attackStep += 1;
    }
  } else if (boss.attackType === 'burst') {
    boss.shotTimer -= step;
    if (boss.shotTimer <= 0 && boss.attackStep < 5) {
      const direction = boss.attackStep % 2 ? -1 : 1;
      spawnShot(combat, { owner: 'enemy', kind: 'wave', x: direction < 0 ? boss.arena.width - 40 : 8,
        y: 604, w: 32, h: 26, vx: direction * 205, vy: 0, life: 7 });
      boss.attackStep += 1; boss.shotTimer = .55;
    }
  }
  if (boss.mode === 'attack' && boss.timer === 0) {
    exposeShowman(boss, combat, events, ['slam', 'charge', 'countdown', 'burst'].includes(boss.attackType));
  }
}

function updateShowman(boss, combat, player, step, events) {
  const arena = boss.arena;
  boss.lookX = clamp((player.x + P.playerWidth / 2 - boss.x - boss.w / 2) / 240, -1, 1);
  boss.lookY = clamp((player.y + P.playerHeight / 2 - boss.y - boss.h / 2) / 160, -1, 1);
  boss.windup = boss.mode === 'warning' ? clamp(1 - boss.timer / (boss.phase === 2 ? 1.15 : 1.55), 0, 1) : 0;
  boss.recoil = Math.max(0, boss.recoil - step); boss.attackPulse = Math.max(0, boss.attackPulse - step);
  if (boss.mode === 'intro' && boss.timer === 0) showmanWarning(boss, player, events);
  else if (boss.mode === 'warning' && boss.timer === 0) beginShowmanAttack(boss, combat, events);
  else if (boss.mode === 'attack') updateShowmanAttack(boss, combat, player, step, events);
  else if (boss.mode === 'exposed' && boss.timer === 0) showmanWarning(boss, player, events);
  if (!['intro', 'warning'].includes(boss.mode) && overlaps(playerBox(player), boss)) {
    hurtPlayer(combat, player, boss.x + boss.w / 2, events);
  }
  if (boss.phase === 2 && !boss.lowHealthSpoken) {
    boss.lowHealthSpoken = true; sayBoss(boss.dialogue, 'lowHealth', events);
  }
  boss.x = clamp(boss.x, 35, arena.width - boss.w - 35);
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
      boss.vx = 0; boss.vy = 0; boss.windup = 0; boss.attackPulse = 0;
      events.push({ type: 'bossDefeated', name: arena.name, points: 3000 });
      sayBoss(boss.dialogue, 'defeat', events);
      return;
    }
    if (boss.interruptible) {
      const interrupted = boss.attackType === 'countdown' ? 'countdownBreak' : 'shieldBreak';
      sayBoss(boss.dialogue, interrupted, events);
      exposeShowman(boss, combat, events, true);
    }
    const nextPhase = phaseFor(boss);
    if (nextPhase !== boss.phase) {
      boss.phase = nextPhase; boss.mode = 'intro'; boss.timer = arena.boss.introDuration;
      boss.zones = []; clearThreats(combat);
      events.push({ type: 'bossPhase', phase: nextPhase, name: arena.phases[nextPhase].name });
      sayBoss(boss.dialogue, nextPhase === 1 ? 'phase1' : 'phase2', events);
      break;
    }
    sayBoss(boss.dialogue, 'hit', events);
  }
  combat.shots = combat.shots.filter(shot => shot.life > 0);
}

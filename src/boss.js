import { PHYSICS as P } from './level.js';
import { ARENA, ENEMY_TYPES } from './encounters.js';
import { overlaps, makeEnemy, spawnShot, hurtPlayer } from './combat.js';
import { createDialogue, updateDialogue, sayBoss } from './boss-dialogue.js';

// Arena-only state. On entry/respawn the engine creates a fresh boss and
// arena combat, grants the blaster, and places Mario at ARENA.spawn.
// Fixed-step order: player physics -> updateBoss -> updateCombat -> hitBoss.
// Engine handles zero player health BEFORE hitBoss so death wins a tie.
// Only bossDefeated completes the game; never complete at the world beacon.
export function createBoss() {
  return { ...ARENA.boss, maxHealth: ARENA.boss.health, phase: 0,
    mode: 'intro', timer: ARENA.boss.introDuration, age: 0,
    shotTimer: 0, grace: 0, cycle: 0, zones: [], defeated: false,
    vx: 0, vy: 0, lookX: -1, lookY: 0, windup: 0,
    recoil: 0, attackPulse: 0, dialogue: createDialogue() };
}
const playerBox = p => ({ x: p.x, y: p.y, w: P.playerWidth, h: P.playerHeight });
const phaseFor = boss => Math.max(0, ARENA.phases.findIndex(p => boss.health > p.healthAbove));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function moveCore(boss, player, dt) {
  const exposed = boss.mode === 'exposed';
  const attacking = boss.mode === 'attack';
  const phaseSpeed = .8 + boss.phase * .25;
  // The whole path stays beyond the right platform's edge (x=950).
  // Core bounds always include the platform's standing-shot height (~496).
  // Motion is gameplay, not renderer-only displacement: shots and contact
  // damage use these same x/y coordinates, including the recoil response.
  const targetX = exposed ? ARENA.boss.x
    : 1040 + Math.sin(boss.age * phaseSpeed) * (attacking ? 55 : 30);
  const targetY = exposed ? ARENA.boss.y
    : 375 + Math.sin(boss.age * phaseSpeed * .75 + boss.phase) * 30;
  const stiffness = exposed ? 28 : 12;
  const damping = exposed ? 11 : 7;
  boss.vx += ((targetX - boss.x) * stiffness - boss.vx * damping) * dt;
  boss.vy += ((targetY - boss.y) * stiffness - boss.vy * damping) * dt;
  boss.vx = clamp(boss.vx, -100, 100);
  boss.vy = clamp(boss.vy, -75, 75);
  const x = boss.x + boss.vx * dt, y = boss.y + boss.vy * dt;
  boss.x = clamp(x, 975, 1100);
  boss.y = clamp(y, 340, 415);
  if (boss.x !== x) boss.vx = 0;
  if (boss.y !== y) boss.vy = 0;
  boss.lookX = clamp((player.x + P.playerWidth / 2 - boss.x - boss.w / 2) / 300, -1, 1);
  boss.lookY = clamp((player.y + P.playerHeight / 2 - boss.y - boss.h / 2) / 180, -1, 1);
  boss.windup = boss.mode === 'warning'
    ? clamp(1 - boss.timer / ARENA.phases[boss.phase].warningTime, 0, 1) : 0;
  boss.recoil = Math.max(0, boss.recoil - dt);
  boss.attackPulse = Math.max(0, boss.attackPulse - dt);
}
function clearThreats(combat) {
  combat.shots = combat.shots.filter(shot => shot.owner === 'player');
  combat.enemies = [];
}
function warn(boss, player, events) {
  boss.phase = phaseFor(boss);
  const phase = ARENA.phases[boss.phase];
  boss.mode = 'warning'; boss.timer = phase.warningTime;
  boss.cycle += 1; boss.zones = [];
  if (phase.attack === 'agents') {
    const x = Math.max(0, Math.min(ARENA.width - 100, player.x - 32));
    // Full-height beam: move out of its marked column before activation.
    boss.zones.push({ x, y: 0, w: 100, h: 630, active: false });
  }
  events.push({ type: 'bossWarning', phase: boss.phase, name: phase.name });
  sayBoss(boss.dialogue, phase.attack, events);
}
function summon(boss, combat) {
  combat.enemies = combat.enemies.filter(enemy => !enemy.dead);
  const count = Math.min(ARENA.phases[boss.phase].summonCount,
    ARENA.maxMinions - combat.enemies.length);
  for (let i = 0; i < count; i++) {
    const x = ARENA.summonPoints[i];
    const type = ENEMY_TYPES.robot;
    combat.enemies.push(makeEnemy({ id: `agent-${boss.cycle}-${i}`, kind: 'robot',
      x, y: 630 - type.h, minX: Math.max(30, x - 95),
      maxX: Math.min(ARENA.width - type.w - 30, x + 95), facing: i % 2 ? -1 : 1 }));
  }
}
function attack(boss, combat, player) {
  boss.attackPulse = .3;
  const phase = ARENA.phases[boss.phase];
  if (phase.attack === 'tokens') {
    const x = boss.x - 12, y = boss.y + boss.h / 2;
    const angle = Math.atan2(player.y + P.playerHeight / 2 - y,
      player.x + P.playerWidth / 2 - x);
    for (const offset of [-.22, 0, .22]) {
      spawnShot(combat, { owner: 'enemy', kind: 'token', x, y,
        vx: Math.cos(angle + offset) * phase.projectileSpeed,
        vy: Math.sin(angle + offset) * phase.projectileSpeed,
        w: 14, h: 14, life: 5 });
    }
  } else if (phase.attack === 'waves') {
    // Low floor wave can be jumped or avoided on elevated platforms.
    spawnShot(combat, { owner: 'enemy', kind: 'wave',
      x: boss.x, y: 604, w: 32, h: 26,
      vx: -phase.waveSpeed, vy: 0, life: 5 });
  }
}
export function updateBoss(boss, combat, player, dt, events) {
  if (boss.defeated || combat.health <= 0 || !Number.isFinite(dt) || dt <= 0) return;
  const step = Math.min(dt, 1 / 60);
  updateDialogue(boss.dialogue, step);
  if (boss.age === 0) sayBoss(boss.dialogue, 'entrance', events);
  boss.age += step; boss.timer = Math.max(0, boss.timer - step);
  boss.grace = Math.max(0, boss.grace - step);
  moveCore(boss, player, step);
  const phase = ARENA.phases[boss.phase];
  if (boss.mode === 'intro') {
    if (boss.timer === 0) warn(boss, player, events);
  } else if (boss.mode === 'warning') {
    if (boss.timer === 0) {
      boss.mode = 'attack'; boss.timer = phase.attackDuration; boss.shotTimer = 0;
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
        attack(boss, combat, player); boss.shotTimer += phase.interval;
      }
    }
    if (boss.timer === 0) {
      boss.mode = 'exposed'; boss.timer = ARENA.boss.vulnerableDuration;
      boss.zones = []; clearThreats(combat);
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
export function hitBoss(boss, combat, events) {
  if (boss.defeated || combat.health <= 0) return;
  for (const shot of combat.shots) {
    if (shot.life <= 0 || shot.owner !== 'player' || !overlaps(shot, boss)) continue;
    shot.life = 0;
    if (boss.mode !== 'exposed' || boss.grace > 0) continue;
    boss.health = Math.max(0, boss.health - shot.damage);
    boss.grace = ARENA.boss.damageGrace;
    boss.recoil = .28;
    boss.vx = shot.vx < 0 ? -85 : 85;
    events.push({ type: 'bossHit', health: boss.health, maxHealth: boss.maxHealth });
    if (boss.health === 0) {
      boss.defeated = true; boss.mode = 'defeated'; boss.timer = 0;
      boss.zones = []; combat.shots = []; combat.enemies = [];
      boss.vx = 0; boss.vy = 0; boss.windup = 0; boss.attackPulse = 0;
      events.push({ type: 'bossDefeated', name: ARENA.name, points: 3000 });
      sayBoss(boss.dialogue, 'defeat', events);
      return;
    }
    const nextPhase = phaseFor(boss);
    if (nextPhase !== boss.phase) {
      boss.phase = nextPhase; boss.mode = 'intro'; boss.timer = ARENA.boss.introDuration;
      boss.zones = []; clearThreats(combat);
      events.push({ type: 'bossPhase', phase: nextPhase, name: ARENA.phases[nextPhase].name });
      sayBoss(boss.dialogue, nextPhase === 1 ? 'phase1' : 'phase2', events);
      break;
    }
    sayBoss(boss.dialogue, 'hit', events);
  }
  combat.shots = combat.shots.filter(shot => shot.life > 0);
}

import { PHYSICS as P } from './level.js';
import { ARENA, ENEMY_TYPES } from './encounters.js';
import { overlaps, makeEnemy, spawnShot, hurtPlayer } from './combat.js';

// Arena-only state. On entry/respawn the engine creates a fresh boss and
// arena combat, grants the blaster, and places Mario at ARENA.spawn.
// Fixed-step order: player physics -> updateBoss -> updateCombat -> hitBoss.
// Engine handles zero player health BEFORE hitBoss so death wins a tie.
// Only bossDefeated completes the game; never complete at the world beacon.
export function createBoss() {
  return { ...ARENA.boss, maxHealth: ARENA.boss.health, phase: 0,
    mode: 'intro', timer: ARENA.boss.introDuration, age: 0,
    shotTimer: 0, grace: 0, cycle: 0, zones: [], defeated: false };
}
const playerBox = p => ({ x: p.x, y: p.y, w: P.playerWidth, h: P.playerHeight });
const phaseFor = boss => Math.max(0, ARENA.phases.findIndex(p => boss.health > p.healthAbove));
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
  boss.age += step; boss.timer = Math.max(0, boss.timer - step);
  boss.grace = Math.max(0, boss.grace - step);
  const phase = ARENA.phases[boss.phase];
  if (boss.mode === 'intro') {
    if (boss.timer === 0) warn(boss, player, events);
  } else if (boss.mode === 'warning') {
    if (boss.timer === 0) {
      boss.mode = 'attack'; boss.timer = phase.attackDuration; boss.shotTimer = 0;
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
    events.push({ type: 'bossHit', health: boss.health, maxHealth: boss.maxHealth });
    if (boss.health === 0) {
      boss.defeated = true; boss.mode = 'defeated'; boss.timer = 0;
      boss.zones = []; combat.shots = []; combat.enemies = [];
      events.push({ type: 'bossDefeated', name: ARENA.name, points: 3000 });
      return;
    }
    const nextPhase = phaseFor(boss);
    if (nextPhase !== boss.phase) {
      boss.phase = nextPhase; boss.mode = 'intro'; boss.timer = ARENA.boss.introDuration;
      boss.zones = []; clearThreats(combat);
      events.push({ type: 'bossPhase', phase: nextPhase, name: ARENA.phases[nextPhase].name });
      break;
    }
  }
  combat.shots = combat.shots.filter(shot => shot.life > 0);
}

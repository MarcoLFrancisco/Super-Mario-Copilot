import { PHYSICS as P } from './level.js';
import { COMBAT as C, ENCOUNTERS, ENEMY_TYPES } from './encounters.js';
import { activePartyAttacks, claimPartyHit } from './party.js';

export const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x
  && a.y < b.y + b.h && a.y + a.h > b.y;
const body = p => ({ x: p.x, y: p.y, w: P.playerWidth, h: P.playerHeight });
export function makeEnemy(definition) {
  return { ...ENEMY_TYPES[definition.kind], ...definition, baseY: definition.y,
    age: 0, attackTimer: 1.5, warning: 0, dead: false };
}
export function createCombat(definitions = ENCOUNTERS) {
  return { health: C.maxHealth, grace: 0, protection: 0, blaster: false,
    cooldown: 0, enemies: definitions.enemies.map(makeEnemy), shots: [],
    pickups: definitions.pickups.map(p => ({ ...p, collected: false })) };
}
// Preserve defeated enemies, collected rewards, and the blaster on respawn.
// The engine separately restores player position and resets a boss encounter.
export function resetCombat(combat) {
  combat.health = C.maxHealth; combat.grace = C.damageGrace;
  combat.protection = 0; combat.cooldown = 0; combat.shots = [];
}
export function grantPower(combat, reward, events) {
  if (reward.kind === 'blaster') combat.blaster = true;
  else if (reward.kind === 'microsoft') combat.protection = C.invincibilityDuration;
  else return;
  events.push({ type: 'powerup', kind: reward.kind });
}
export function hurtPlayer(combat, player, sourceX, events) {
  if (combat.health <= 0 || combat.grace > 0 || combat.protection > 0) return false;
  combat.health = Math.max(0, combat.health - 1);
  combat.grace = C.damageGrace;
  player.vx = (player.x + P.playerWidth / 2 < sourceX ? -1 : 1) * C.knockbackSpeed;
  player.vy = -260; player.grounded = false; player.coyote = 0; player.boostTime = 0;
  events.push({ type: 'damage', health: combat.health });
  return true;
}
export function spawnShot(combat, shot) {
  const limit = shot.owner === 'player' ? C.maxPlayerProjectiles : C.maxEnemyProjectiles;
  if (combat.shots.filter(s => s.owner === shot.owner && s.life > 0).length >= limit) return false;
  combat.shots.push({ w: 10, h: 8, life: C.projectileLifetime, damage: 1, ...shot });
  return true;
}
function hitEnemy(enemy, damage, events) {
  if (enemy.dead) return;
  enemy.health -= damage;
  if (enemy.health <= 0) {
    enemy.dead = true;
    events.push({ type: 'enemyDefeated', id: enemy.id, x: enemy.x, y: enemy.y, points: C.enemyScore });
  } else events.push({ type: 'enemyHit', id: enemy.id });
}

// Invoke once per fixed simulation step AFTER player movement/collisions.
// previousBottom is captured BEFORE movement. solids contains intact bricks,
// not one-way platforms. The engine applies event points exactly once.
// Boss logic can add shots before this call and inspect surviving player shots
// afterward. Call only while playing; falling bypasses protection in engine.
export function updateCombat(combat, player, input, dt, previousBottom, events, solids = [], party = null) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const step = Math.min(dt, 1 / 60);
  for (const key of ['grace', 'protection', 'cooldown']) combat[key] = Math.max(0, combat[key] - step);
  for (const pickup of combat.pickups) {
    if (!pickup.collected && overlaps(body(player), pickup)) {
      pickup.collected = true; grantPower(combat, pickup, events);
    }
  }
  if (input.fire && combat.blaster && combat.cooldown === 0 && combat.health > 0) {
    const facing = player.facing < 0 ? -1 : 1;
    if (spawnShot(combat, { owner: 'player', kind: 'patch',
      x: player.x + P.playerWidth / 2 - 5, y: player.y + 22,
      vx: facing * C.projectileSpeed, vy: 0, damage: C.projectileDamage })) {
      combat.cooldown = C.fireCooldown; events.push({ type: 'shoot' });
    }
  }
  for (const enemy of combat.enemies) {
    if (enemy.dead || Math.abs(enemy.x - player.x) > 1500) continue;
    enemy.age += step;
    enemy.x += enemy.facing * enemy.speed * step;
    if (enemy.x >= enemy.maxX) { enemy.x = enemy.maxX; enemy.facing = -1; }
    if (enemy.x <= enemy.minX) { enemy.x = enemy.minX; enemy.facing = 1; }
    if (enemy.kind === 'drone') {
      enemy.y = enemy.baseY + Math.sin(enemy.age * 2) * enemy.hoverAmplitude;
      if (Math.abs(enemy.x - player.x) < 650) {
        enemy.attackTimer -= step;
        enemy.warning = enemy.attackTimer <= enemy.warningTime
          ? Math.max(0, 1 - enemy.attackTimer / enemy.warningTime) : 0;
        if (enemy.attackTimer <= 0) {
          const dx = player.x + P.playerWidth / 2 - enemy.x - enemy.w / 2;
          const dy = player.y + P.playerHeight / 2 - enemy.y - enemy.h / 2;
          const distance = Math.max(1, Math.hypot(dx, dy));
          spawnShot(combat, { owner: 'enemy', kind: 'spam', x: enemy.x + enemy.w / 2,
            y: enemy.y + enemy.h / 2, vx: dx / distance * 190, vy: dy / distance * 190, life: 4 });
          enemy.attackTimer = enemy.attackInterval; enemy.warning = 0;
        }
      } else { enemy.attackTimer = Math.max(enemy.attackTimer, enemy.warningTime); enemy.warning = 0; }
    }
  }
  for (const shot of combat.shots) {
    if (shot.life <= 0) continue;
    shot.life -= step;
    shot.x += shot.vx * step; shot.y += shot.vy * step;
    if (shot.life <= 0) continue;
    if (solids.some(block => !block.broken && overlaps(shot, block))) { shot.life = 0; continue; }
    if (shot.owner === 'player') {
      const target = combat.enemies.find(e => !e.dead && overlaps(shot, e));
      if (target) { hitEnemy(target, shot.damage, events); shot.life = 0; }
    } else if (overlaps(shot, body(player))) {
      hurtPlayer(combat, player, shot.x + shot.w / 2, events); shot.life = 0;
    }
  }
  if (party && combat.health > 0) {
    for (const strike of activePartyAttacks(party)) {
      for (const enemy of combat.enemies) {
        if (enemy.dead || !overlaps(strike, enemy)) continue;
        const target = Math.max(enemy.x, Math.min(strike.originX, enemy.x + enemy.w));
        const left = Math.min(player.x + P.playerWidth / 2, strike.originX, target);
        const right = Math.max(player.x + P.playerWidth / 2, strike.originX, target);
        const corridor = { x: left, y: strike.y, w: Math.max(1, right - left), h: strike.h };
        if (solids.some(b => !b.broken && overlaps(corridor, b))) continue;
        if (claimPartyHit(party, strike, enemy.id)) hitEnemy(enemy, strike.damage, events);
      }
    }
  }
  for (const enemy of combat.enemies) {
    if (enemy.dead) continue;
    const box = body(player);
    const horizontal = box.x < enemy.x + enemy.w && box.x + box.w > enemy.x;
    const stomp = enemy.stompable && player.vy > 0 && horizontal
      && previousBottom <= enemy.y + 4 && box.y + box.h >= enemy.y && box.y < enemy.y + enemy.h;
    if (!stomp && !overlaps(box, enemy)) continue;
    if (combat.protection > 0) hitEnemy(enemy, enemy.health, events);
    else if (stomp) {
      hitEnemy(enemy, enemy.health, events);
      player.y = enemy.y - P.playerHeight; player.vy = -C.stompBounce;
      player.grounded = false; player.coyote = 0;
      events.push({ type: 'stomp' });
    } else hurtPlayer(combat, player, enemy.x + enemy.w / 2, events);
  }
  combat.shots = combat.shots.filter(shot => shot.life > 0);
}

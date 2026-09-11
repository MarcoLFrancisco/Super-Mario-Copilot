import { PHYSICS as P } from './level.js';

// Simulation only. Coordinates/dimensions match the engine's player body.
// world: { width, platforms, hazards }; blocks: runtime block array.
// Call once per fixed tick (<= 1/60 s), only during active gameplay.
// Companions collide with bricks but never break them or release rewards.
const EPS = .001;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const overlap = (a, size, b, other) => a < b + other && a + size > b;
const approach = (n, target, amount) => n < target
  ? Math.min(n + amount, target) : Math.max(n - amount, target);

export function actorBody(actor) {
  return { x: actor.x, y: actor.y, w: P.playerWidth, h: P.playerHeight };
}

export function landingSurfaces(world, blocks = []) {
  return [...world.platforms, ...blocks.filter(block => !block.broken)];
}

export function supportingSurface(actor, world, blocks = []) {
  const feet = actor.y + P.playerHeight;
  return landingSurfaces(world, blocks).find(surface =>
    Math.abs(feet - surface.y) <= EPS
    && overlap(actor.x, P.playerWidth, surface.x, surface.w)) || null;
}

export function resetActorBody(actor, position) {
  Object.assign(actor, {
    x: position.x, y: position.y, vx: 0, vy: 0,
    grounded: false, coyote: 0, jumpBuffer: 0, boostTime: 0,
    boostCooldown: 0, surfaceId: null
  });
  // Attack/AI lifecycle state belongs to party.js, not this module.
  return actor;
}

// intent: { move: -1..1, jumpPressed: boolean }. Jump is a one-tick pulse.
// Returns contact facts; never applies damage, recovery, or attack timers.
export function stepActor(actor, intent, world, blocks, dt) {
  const result = { jumped: false, landed: false, wall: false, ceiling: false };
  if (!Number.isFinite(dt) || dt <= 0) return result;
  if (dt > 1 / 60 + EPS) throw new RangeError('stepActor requires a fixed tick <= 1/60 s');
  const solids = blocks.filter(block => !block.broken);
  const support = actor.vy >= 0 ? supportingSurface(actor, world, solids) : null;
  actor.grounded = Boolean(support);
  actor.coyote = support ? P.coyoteTime : Math.max(0, (actor.coyote || 0) - dt);
  actor.jumpBuffer = intent.jumpPressed ? P.jumpBuffer
    : Math.max(0, (actor.jumpBuffer || 0) - dt);
  const move = Number.isFinite(intent.move) ? clamp(intent.move, -1, 1) : 0;
  actor.vx = approach(actor.vx, move * P.speed,
    (move ? P.acceleration : P.friction) * dt);
  if (move && !actor.attack) actor.facing = Math.sign(move);
  if (actor.jumpBuffer > 0 && actor.coyote > 0) {
    actor.vy = -P.jumpSpeed;
    actor.jumpBuffer = 0;
    actor.coyote = 0;
    actor.grounded = false;
    result.jumped = true;
  }

  const oldX = actor.x;
  let nextX = oldX + actor.vx * dt;
  for (const block of solids) {
    if (!overlap(actor.y, P.playerHeight, block.y, block.h)) continue;
    if (nextX > oldX && oldX + P.playerWidth <= block.x + EPS
        && nextX + P.playerWidth >= block.x) {
      nextX = Math.min(nextX, block.x - P.playerWidth);
      result.wall = true;
    } else if (nextX < oldX && oldX >= block.x + block.w - EPS
        && nextX <= block.x + block.w) {
      nextX = Math.max(nextX, block.x + block.w);
      result.wall = true;
    }
  }
  actor.x = clamp(nextX, 0, Math.max(0, world.width - P.playerWidth));
  if (actor.x !== nextX) result.wall = true;
  if (result.wall) actor.vx = 0;

  const oldY = actor.y;
  actor.vy = Math.min(P.maxFallSpeed, actor.vy + P.gravity * dt);
  let nextY = oldY + actor.vy * dt;
  let landing = null;
  actor.grounded = false;
  actor.surfaceId = null;
  if (actor.vy >= 0) {
    // Choose the first crossed floor across BOTH bricks and one-way platforms.
    for (const surface of landingSurfaces(world, solids)) {
      const floor = surface.y - P.playerHeight;
      if (overlap(actor.x, P.playerWidth, surface.x, surface.w)
          && oldY <= floor + EPS && nextY >= floor) {
        nextY = floor;
        landing = surface;
      }
    }
    if (landing) {
      actor.vy = 0;
      actor.grounded = true;
      actor.coyote = P.coyoteTime;
      actor.surfaceId = landing.id ?? null;
      result.landed = !support || result.jumped;
    }
  } else {
    // Ordinary platforms are passable from below; only bricks have ceilings.
    for (const block of solids) {
      const ceiling = block.y + block.h;
      if (overlap(actor.x, P.playerWidth, block.x, block.w)
          && oldY >= ceiling - EPS && nextY <= ceiling) {
        nextY = ceiling;
        result.ceiling = true;
      }
    }
    if (result.ceiling) {
      actor.vy = 0;
      actor.coyote = 0;
    }
  }
  actor.y = nextY;
  return result;
}

// Return a fully supported, unobstructed position near an anchor, or null.
// Caller owns the regroup delay and may retry; never fabricate a safe spawn.
// Hazards include a clearance margin. Enemies can be supplied as avoid boxes.
export function findSafeLanding(anchor, world, blocks = [], options = {}) {
  const { maxDistance = 320, margin = 8, avoid = [] } = options;
  const solids = blocks.filter(block => !block.broken);
  const obstacles = [...solids, ...(world.hazards || []), ...avoid];
  let best = null;
  let bestDistance = Infinity;
  for (const surface of landingSurfaces(world, solids)) {
    const lo = Math.max(0, surface.x + margin);
    const hi = Math.min(world.width - P.playerWidth,
      surface.x + surface.w - P.playerWidth - margin);
    if (hi < lo) continue;
    const candidates = [clamp(anchor.x, lo, hi), lo, hi];
    for (const obstacle of obstacles) {
      candidates.push(clamp(obstacle.x - P.playerWidth - margin, lo, hi));
      candidates.push(clamp(obstacle.x + obstacle.w + margin, lo, hi));
    }
    for (const x of candidates) {
      const y = surface.y - P.playerHeight;
      const distance = Math.hypot(x - anchor.x, y - anchor.y);
      if (distance > maxDistance || distance >= bestDistance) continue;
      const blocked = obstacles.some(obstacle => obstacle !== surface
        && overlap(x - margin, P.playerWidth + margin * 2, obstacle.x, obstacle.w)
        && overlap(y - margin, P.playerHeight + margin, obstacle.y, obstacle.h));
      if (blocked) continue;
      best = { x, y, surfaceId: surface.id ?? null };
      bestDistance = distance;
    }
  }
  return best;
}

import { PHYSICS as P } from './level.js';
import { ENCOUNTERS } from './encounters.js';

// Runtime state is separate from immutable encounter definitions.
// Keep this state across checkpoint respawns; recreate it for a new run.
export function createBlocks(definitions = ENCOUNTERS.blocks) {
  return {
    blocks: definitions.map(block => ({ ...block, broken: false, used: false, bump: 0 })),
    pickups: [],
    debris: []
  };
}

const intersects = (a, aw, b, bw) => a < b + bw && a + aw > b;

function hitBlock(world, block, events) {
  if (block.broken || block.used) return;
  block.bump = .18;
  if (block.kind === 'reward') {
    block.used = true;
    if (block.reward) {
      // Hover beneath the emptied block so the reward remains reachable
      // from the same platform without requiring another route.
      world.pickups.push({
        id: `reward-${block.id}`, kind: block.reward,
        x: block.x + block.w / 2 - 13, y: block.y + block.h + 8,
        w: 26, h: 26, collected: false
      });
    }
    events.push({ type: 'blockReward', id: block.id, reward: block.reward });
    return;
  }
  block.broken = true;
  for (let i = 0; i < 4; i++) {
    world.debris.push({
      x: block.x + (i % 2) * block.w / 2,
      y: block.y + Math.floor(i / 2) * block.h / 2,
      vx: i % 2 ? 90 : -90,
      vy: i < 2 ? -220 : -150,
      app: block.app, life: .6
    });
  }
  events.push({ type: 'brickBreak', id: block.id, x: block.x, y: block.y });
}

// Axis-separated integration contract:
// 1. Move player.x with player.y still at its previous value, then resolve X.
// 2. Move player.y, then resolve Y BEFORE one-way platform landing logic.
// Return contact information so the engine can preserve floor grounding.
// Call at the engine's fixed step; never pass a full frame's unsplit motion.
export function resolveBlockX(world, player, previousX) {
  const delta = player.x - previousX;
  if (delta === 0) return false;
  let boundary = player.x;
  let collided = false;
  for (const block of world.blocks) {
    if (block.broken || !intersects(player.y, P.playerHeight, block.y, block.h)) continue;
    if (delta > 0 && previousX + P.playerWidth <= block.x + .001
        && player.x + P.playerWidth >= block.x) {
      boundary = Math.min(boundary, block.x - P.playerWidth);
      collided = true;
    } else if (delta < 0 && previousX >= block.x + block.w - .001
        && player.x <= block.x + block.w) {
      boundary = Math.max(boundary, block.x + block.w);
      collided = true;
    }
  }
  if (collided) {
    player.x = boundary;
    player.vx = 0;
    player.boostTime = 0;
  }
  return collided;
}

export function resolveBlockY(world, player, previousY, events = []) {
  const delta = player.y - previousY;
  if (delta === 0) return { landed: false, ceiling: false };
  let boundary = delta > 0 ? Infinity : -Infinity;
  let contacts = [];
  for (const block of world.blocks) {
    if (block.broken || !intersects(player.x, P.playerWidth, block.x, block.w)) continue;
    const face = delta > 0 ? block.y - P.playerHeight : block.y + block.h;
    const crossed = delta > 0
      ? previousY <= face + .001 && player.y >= face
      : previousY >= face - .001 && player.y <= face;
    if (!crossed) continue;
    const nearer = delta > 0 ? face < boundary - .001 : face > boundary + .001;
    if (nearer) { boundary = face; contacts = [block]; }
    else if (Math.abs(face - boundary) <= .001) contacts.push(block);
  }
  if (!contacts.length) return { landed: false, ceiling: false };
  player.y = boundary;
  player.vy = 0;
  if (delta > 0) {
    player.grounded = true;
    player.coyote = P.coyoteTime;
    return { landed: true, ceiling: false };
  }
  player.grounded = false;
  player.coyote = 0;
  // At a seam hit one block only, chosen by proximity to Mario's center.
  const center = player.x + P.playerWidth / 2;
  contacts.sort((a, b) => Math.abs(a.x + a.w / 2 - center) - Math.abs(b.x + b.w / 2 - center));
  hitBlock(world, contacts[0], events);
  return { landed: false, ceiling: true };
}

export function updateBlocks(world, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const step = Math.min(dt, .1);
  for (const block of world.blocks) block.bump = Math.max(0, block.bump - step);
  for (const piece of world.debris) {
    piece.life -= step;
    piece.vy += P.gravity * .6 * step;
    piece.x += piece.vx * step;
    piece.y += piece.vy * step;
  }
  world.debris = world.debris.filter(piece => piece.life > 0);
}

// Returns newly touched rewards exactly once. Combat applies their powers;
// they never increment productivity counters or ordinary collectible totals.
export function collectBlockRewards(world, player) {
  const rewards = [];
  for (const item of world.pickups) {
    if (item.collected) continue;
    if (intersects(player.x, P.playerWidth, item.x, item.w)
        && intersects(player.y, P.playerHeight, item.y, item.h)) {
      item.collected = true;
      rewards.push({ id: item.id, kind: item.kind });
    }
  }
  return rewards;
}

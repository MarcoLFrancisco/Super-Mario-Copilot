import { PHYSICS as P } from './level.js';
import { actorBody, stepActor, supportingSurface } from './actor-physics.js';

// Bounded local planner, not a per-frame operation. AI should retain its plan
// and replan on target changes, geometry changes, or divergence from prediction.
// Uses actual fixed-step physics: no guessed ballistic reach or teleport edges.
const DT = 1 / 60;
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x
  && a.y < b.y + b.h && a.y + a.h > b.y;

function snapshot(actor) {
  return {
    x: actor.x, y: actor.y, vx: actor.vx || 0, vy: actor.vy || 0,
    facing: actor.facing || 1, grounded: Boolean(actor.grounded),
    coyote: actor.coyote || 0, jumpBuffer: 0, boostTime: 0,
    attack: null, surfaceId: actor.surfaceId ?? null
  };
}

function dangerous(actor, world) {
  // Small clearance margin avoids planning routes that skim hazard edges.
  const body = actorBody(actor);
  body.x -= 3; body.y -= 3; body.w += 6; body.h += 6;
  return (world.hazards || []).some(hazard => overlaps(body, hazard));
}

function grounded(actor, world, blocks) {
  return actor.vy >= 0 && Boolean(supportingSurface(actor, world, blocks));
}

function arrived(actor, target, tolerance, world, blocks) {
  return grounded(actor, world, blocks)
    && Math.abs(actor.x - target.x) <= tolerance
    && Math.abs(actor.y - target.y) <= 3;
}

function key(actor) {
  // Distinguish velocity as well as location: a running launch differs from rest.
  return [actor.surfaceId, Math.round(actor.x / 12), Math.round(actor.y / 4),
    Math.round(actor.vx / 80), Math.round(actor.vy / 80)].join(':');
}

function heuristic(actor, target) {
  return Math.abs(actor.x - target.x) / P.speed
    + Math.abs(actor.y - target.y) / P.jumpSpeed;
}

function actions(actor, supported) {
  const result = [];
  for (const move of [-1, 0, 1]) {
    result.push({ move, jump: false, frames: supported ? 12 : 24 });
    if (supported) {
      // Full-direction jumps plus early braking allow short and long landings.
      result.push({ move, jump: true, frames: 90, coastAfter: Infinity });
      if (move) result.push({ move, jump: true, frames: 90, coastAfter: 14 });
    }
  }
  return result;
}

function simulate(start, action, target, world, blocks, settings) {
  const actor = snapshot(start);
  const commands = [];
  for (let frame = 0; frame < action.frames; frame++) {
    const move = action.jump && frame >= action.coastAfter ? 0 : action.move;
    const jumpPressed = action.jump && frame === 0;
    const contact = stepActor(actor, { move, jumpPressed }, world, blocks, DT);
    commands.push({ move, jumpPressed });
    if (dangerous(actor, world) || actor.y > settings.floorLimit
        || Math.abs(actor.x - settings.originX) > settings.radius) return null;
    if (arrived(actor, target, settings.tolerance, world, blocks)) break;
    if (contact.landed || contact.wall) break;
  }
  return { actor, commands };
}

/**
 * target is a desired top-left standing position (e.g. findSafeLanding result).
 * Returns {commands, predicted, target, duration} or null. Null means no safe
 * route was found within budget, NOT mathematical proof of unreachability.
 * The caller must not convert null into a jump toward a gap.
 * Search copies actors and never mutates world data or the live character.
 */
export function planRoute(actor, target, world, blocks = [], options = {}) {
  if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return null;
  const radius = Math.min(1200, Math.max(100, options.radius ?? 850));
  const maxNodes = Math.min(300, Math.max(1, options.maxNodes ?? 120));
  const tolerance = Math.min(30, Math.max(2, options.tolerance ?? 16));
  const floors = [...world.platforms, ...blocks.filter(block => !block.broken)];
  if (!floors.length || Math.abs(target.x - actor.x) > radius) return null;
  const settings = { radius, tolerance, originX: actor.x,
    floorLimit: Math.max(...floors.map(surface => surface.y)) + P.playerHeight };
  const start = snapshot(actor);
  if (dangerous(start, world)) return null;
  const open = [{ actor: start, commands: [], elapsed: 0 }];
  const visited = new Map([[key(start), 0]]);
  for (let expanded = 0; expanded < maxNodes && open.length; expanded++) {
    open.sort((a, b) => a.elapsed + heuristic(a.actor, target)
      - b.elapsed - heuristic(b.actor, target));
    const node = open.shift();
    if (arrived(node.actor, target, tolerance, world, blocks)) {
      return { commands: node.commands, predicted: snapshot(start),
        target: { x: target.x, y: target.y }, duration: node.elapsed };
    }
    if (node.elapsed >= 5) continue;
    for (const action of actions(node.actor, grounded(node.actor, world, blocks))) {
      const next = simulate(node.actor, action, target, world, blocks, settings);
      if (!next) continue;
      const elapsed = node.elapsed + next.commands.length * DT;
      const signature = key(next.actor);
      if ((visited.get(signature) ?? Infinity) <= elapsed) continue;
      visited.set(signature, elapsed);
      open.push({ actor: next.actor, elapsed,
        commands: node.commands.concat(next.commands) });
    }
  }
  return null;
}

// Runtime route cursor. Call once per fixed tick, before stepActor; do not
// consume commands while paused. AI owns cooldowns, replanning and recovery.
export function createRouteCursor(plan) {
  return plan ? { plan, index: 0, predicted: snapshot(plan.predicted) } : null;
}

export function nextRouteIntent(cursor, actor, world, blocks = []) {
  const stopped = { move: 0, jumpPressed: false };
  if (!cursor) return { ...stopped, status: 'blocked' };
  const expected = cursor.predicted;
  if (Math.hypot(actor.x - expected.x, actor.y - expected.y) > 10
      || Math.abs(actor.vx - expected.vx) > 100
      || Math.abs(actor.vy - expected.vy) > 100) {
    return { ...stopped, status: 'replan' };
  }
  if (cursor.index >= cursor.plan.commands.length) {
    return { ...stopped, status: 'done' };
  }
  const command = cursor.plan.commands[cursor.index];
  const predicted = snapshot(actor);
  stepActor(predicted, command, world, blocks, DT);
  if (dangerous(predicted, world)) return { ...stopped, status: 'replan' };
  cursor.predicted = predicted;
  cursor.index++;
  return { ...command, status: 'moving' };
}

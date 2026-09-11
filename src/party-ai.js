import { PHYSICS as P } from './level.js';
import { actorBody, findSafeLanding, supportingSurface } from './actor-physics.js';
import { planRoute, createRouteCursor, nextRouteIntent } from './party-navigation.js';

// Fixed-tick decisions only. Caller applies movement, then requested facing
// when not attacking, then requests attacks. Combat alone owns enemy damage.
// spec is the actor's next ATTACKS definition; no circular party dependency.
const idle = () => ({ move: 0, jumpPressed: false, attackPressed: false });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x
  && a.y < b.y + b.h && a.y + a.h > b.y;

export function createCompanionAI(slot = 0) {
  return { slot, route: null, goal: null, targetId: null, sample: null,
    cooldown: slot * .2, stalled: 0, separated: 0,
    recovering: false, recoveryTime: 0, mode: 'follow' };
}

// Ordinary support targets must intersect the next move's vertical strike
// band. Navigation closes horizontal gaps; it does not execute aerial combos.
// Do not let an unreachable drone reserve support while ground bugs are nearby.
export function inMeleeBand(actor, enemy, spec) {
  return Boolean(spec) && actor.y + spec.top < enemy.y + enemy.h
    && actor.y + spec.top + spec.height > enemy.y;
}

function attackIntent(actor, enemy, spec, blocks) {
  const center = actor.x + P.playerWidth / 2;
  const direction = enemy.x + enemy.w / 2 < center ? -1 : 1;
  const strike = {
    x: direction > 0 ? actor.x + P.playerWidth - 4 : actor.x + 4 - spec.reach,
    y: actor.y + spec.top, w: spec.reach, h: spec.height
  };
  if (!overlaps(strike, enemy)) return null;
  const contact = (Math.max(strike.x, enemy.x)
    + Math.min(strike.x + strike.w, enemy.x + enemy.w)) / 2;
  const corridor = { x: Math.min(center, contact), y: strike.y,
    w: Math.max(1, Math.abs(contact - center)), h: strike.h };
  if (blocks.some(b => !b.broken && overlaps(corridor, b))) return null;
  return { ...idle(), facing: direction * (spec.backward ? -1 : 1),
    attackPressed: actor.cooldown <= 0 };
}

// context: {leader, world, blocks, enemies, spec, geometryVersion,
//           manualAttack, allowPlanning, assignedTargetId}. Arrays contain runtime
// objects. null means follow only; undefined retains standalone target selection.
// Give only one companion allowPlanning=true per tick to bound search work.
// Increment geometryVersion after brick destruction or world transitions.
// Call only while playing. A recovery result must be applied by party lifecycle
// code, cancelling attacks and resetting physics; AI never teleports an actor.
export function decideCompanion(ai, actor, context, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return idle();
  if (dt > 1 / 60 + .00001) throw new RangeError('AI requires ticks <= 1/60 s');
  const { leader, world, blocks = [], enemies = [], spec,
    geometryVersion = 0, manualAttack = false, allowPlanning = true } = context;
  ai.cooldown = Math.max(0, ai.cooldown - dt);
  const alive = enemies.filter(e => !e.dead);
  const separation = distance(actor, leader);
  const anchor = { x: leader.x - (leader.facing < 0 ? -1 : 1)
    * (64 + ai.slot * 52), y: leader.y };
  const unsafe = (world.hazards || []).some(h => overlaps(actorBody(actor), h));
  const bottom = [...world.platforms, ...blocks.filter(b => !b.broken)]
    .reduce((max, floor) => Math.max(max, floor.y), 0);
  const fallen = actor.y > bottom + P.playerHeight + 80;
  ai.separated = separation > 650 ? ai.separated + dt : 0;
  if (!ai.sample || distance(actor, ai.sample) >= 12) {
    ai.sample = { x: actor.x, y: actor.y };
    ai.stalled = 0;
  } else if (separation > 150 && !actor.attack) ai.stalled += dt;
  else ai.stalled = 0;
  if (fallen || unsafe || ai.separated >= 2.5 || ai.stalled >= 3) {
    ai.recovering = true;
  }
  if (ai.recovering) {
    ai.mode = 'recover';
    ai.route = null;
    ai.recoveryTime += dt;
    if (ai.recoveryTime >= 1.2 && supportingSurface(leader, world, blocks)) {
      const recovery = findSafeLanding(anchor, world, blocks,
        { maxDistance: 220, avoid: alive });
      if (recovery) {
        Object.assign(ai, createCompanionAI(ai.slot));
        return { ...idle(), recovery };
      }
    }
    return idle();
  }
  if (actor.attack) { ai.route = null; return idle(); }

  // Keep a nearby living target, but never pursue beyond the leader's vicinity.
  const candidates = alive.filter(e => distance(e, leader) < 330
    && distance(e, actor) < 300 && inMeleeBand(actor, e, spec)
    && (context.assignedTargetId === undefined || e.id === context.assignedTargetId));
  // The core has a separate support budget, independent of minion defeats.
  // Stay near the leader; approach its stationary recovery position early.
  const core = context.bossTarget;
  const boss = core && distance(core, leader) < 600 && distance(core, actor) < 650
    ? core : null;
  const enemy = boss || candidates.find(e => e.id === ai.targetId)
    || candidates.sort((a, b) => distance(a, actor) - distance(b, actor))[0];
  const targetId = enemy?.id ?? null;
  if (ai.targetId !== targetId) ai.route = null;
  ai.targetId = targetId;
  ai.mode = boss ? 'boss-support' : enemy ? 'defend' : 'follow';
  if (enemy && spec && (!boss || boss.exposed)) {
    const attack = attackIntent(actor, enemy, spec, blocks);
    if (attack) { ai.route = null; return attack; }
  }
  if (manualAttack && spec && actor.cooldown <= 0) {
    ai.route = null;
    const direction = enemy
      ? Math.sign(enemy.x + enemy.w / 2 - actor.x - P.playerWidth / 2) || 1
      : actor.facing * (spec.backward ? -1 : 1);
    return { ...idle(), facing: direction * (spec.backward ? -1 : 1),
      attackPressed: true };
  }

  let desired = anchor;
  if (enemy) {
    const left = boss || actor.x + P.playerWidth / 2 < enemy.x + enemy.w / 2;
    desired = { x: left ? enemy.x - P.playerWidth - 12 : enemy.x + enemy.w + 12,
      y: boss ? boss.approachY : enemy.y + enemy.h - P.playerHeight };
  }
  const goal = findSafeLanding(desired, world, blocks,
    { maxDistance: enemy ? 160 : 260, avoid: alive });
  if (!goal) { ai.route = null; return idle(); }
  if (ai.geometryVersion !== geometryVersion
      || (ai.goal && distance(goal, ai.goal) > 56)) ai.route = null;
  ai.geometryVersion = geometryVersion;
  // Combat destinations leave a 12px gap. Marco's punch extends only 26px
  // beyond his body, so follow-mode tolerance can stop him outside hit range.
  const arrivalTolerance = enemy ? 4 : 20;
  // Finish active route commands before applying the idle arrival shortcut.
  // Proximity alone does not mean a planned platform crossing is complete.
  if (!ai.route && distance(actor, goal) < arrivalTolerance && supportingSurface(actor, world, blocks)) {
    ai.route = null;
    // Jump toward an overhead target only after validating a safe landing.
    if (!enemy || !spec || !allowPlanning || ai.cooldown > 0) return idle();
    const jump = planRoute(actor, { x: actor.x, y: actor.y }, world, blocks,
      { maxNodes: 1 });
    // A settled route has no jump commands; do not invent an unsafe jump.
    if (!jump?.commands.length) return idle();
  }
  if (!ai.route && ai.cooldown === 0 && allowPlanning) {
    ai.goal = goal;
    ai.route = createRouteCursor(planRoute(actor, goal, world, blocks,
      { maxNodes: 80, radius: 850, tolerance: enemy ? 4 : 16 }));
    ai.cooldown = .7 + ai.slot * .13;
  }
  if (!ai.route) return idle();
  const intent = nextRouteIntent(ai.route, actor, world, blocks);
  if (intent.status !== 'moving') { ai.route = null; return idle(); }
  return { move: intent.move, jumpPressed: intent.jumpPressed, attackPressed: false };
}

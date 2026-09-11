import { PHYSICS as P } from './level.js';
import { stepActor, resetActorBody, findSafeLanding } from './actor-physics.js';
import { createCompanionAI, decideCompanion, inMeleeBand } from './party-ai.js';

// Simulation-only party contract. Combat owns damage, defeat events and score.
// Keep party state through checkpoint/arena recovery; recreate on full restart.
export const CHARACTERS = Object.freeze({
  marco: Object.freeze({ id: 'marco', name: 'Marco', role: 'leader',
    appearance: Object.freeze({ hair: '#171923', shirt: '#20c9ce', jeans: '#285cad',
      cap: '#182f59', glasses: 'polarized-wayfarer', lenses: '#186c85' }) }),
  donkey: Object.freeze({ id: 'donkey', name: 'Donkey', role: 'helper',
    reward: 'helper-donkey', offset: -52 }),
  mario: Object.freeze({ id: 'mario', name: 'Mario', role: 'helper',
    reward: 'helper-mario', offset: -96 })
});

export const HELPER_IDS = Object.freeze(['donkey', 'mario']);
export const ATTACKS = Object.freeze({
  punch: Object.freeze({ duration: .28, cooldown: .36, start: .07, end: .19,
    reach: 30, height: 22, top: 12, damage: 1, backward: false }),
  kick: Object.freeze({ duration: .38, cooldown: .46, start: .1, end: .27,
    reach: 46, height: 24, top: 19, damage: 2, backward: false }),
  backKick: Object.freeze({ duration: .44, cooldown: .85, start: .12, end: .32,
    reach: 56, height: 26, top: 16, damage: 3, backward: true })
});

function makeActor(id) {
  return { id, x: 0, y: 0, vx: 0, vy: 0, facing: 1, grounded: true,
    boostTime: 0, cooldown: 0, attack: null, nextKick: false };
}

export function createParty(player, leader = 'marco') {
  if (!Object.hasOwn(CHARACTERS, leader)) throw new RangeError('Unknown party leader');
  const party = { leader, unlocked: new Set(), sequence: 0,
    independent: false, companionTime: 0, planningTurn: 0, manualAttack: false,
    actors: Object.fromEntries(Object.keys(CHARACTERS).map(id => [id, makeActor(id)])) };
  syncParty(party, player);
  return party;
}

export function companionIds(party) {
  return Object.keys(CHARACTERS).filter(id => id !== party.leader);
}

// Engine calls once at run creation, with the actual world and runtime bricks.
// Lifecycle recovery must subsequently supply the same context shape.
export function initializeIndependentParty(party, player, context) {
  party.independent = true;
  // Independent movement does not grant recruitment: new runs start alone.
  resetPartyMotion(party, player, context.world.width, context);
}

export function nextAttackKind(actor) {
  return actor.id === 'donkey' ? 'backKick'
    : actor.id === 'mario' || actor.nextKick ? 'kick' : 'punch';
}

export function requestActorAttack(party, actor, events = []) {
  if (actor.recovering) return false;
  const started = startAttack(party, actor, nextAttackKind(actor), events);
  if (started && actor.id === 'marco') actor.nextKick = !actor.nextKick;
  return started;
}

// The selected actor mirrors the engine's controlled body. Independent
// companions retain their own coordinates; legacy attachment lasts only until
// initializeIndependentParty is connected by the engine integration step.
export function syncParty(party, player, worldWidth = Infinity) {
  const facing = player.facing < 0 ? -1 : 1;
  const maxX = Math.max(0, worldWidth - P.playerWidth);
  for (const actor of Object.values(party.actors)) {
    if (party.independent && actor.id !== party.leader) continue;
    const offset = actor.id === party.leader ? 0 : CHARACTERS[actor.id].offset || 0;
    const actorFacing = actor.attack ? actor.attack.facing : facing;
    // Lock the helper's side as well as its direction for the whole swing.
    // Turning Marco must not teleport an active strike across the party.
    actor.x = Math.max(0, Math.min(maxX, player.x + offset * actorFacing));
    actor.y = player.y;
    actor.vx = player.vx;
    actor.vy = player.vy;
    actor.grounded = player.grounded;
    actor.boostTime = player.boostTime;
    actor.facing = actorFacing;
  }
}

export function visibleParty(party) {
  return [party.actors[party.leader], ...companionIds(party)
    .filter(id => party.unlocked.has(id) && !party.actors[id].recovering)
    .map(id => party.actors[id])];
}

// Concrete helper rewards are assigned per run, excluding the selected leader.
// Independent recruitment requires current geometry and only resets the recruit.
export function unlockHelper(party, reward, events = [], player = null, context = null) {
  const ids = companionIds(party);
  const id = ids.find(key => reward.kind === `helper-${key}`);
  if (!id || party.unlocked.has(id)) return false;
  if (party.independent && (!player || !context)) return false;
  if (party.independent) resetCompanion(party, id, ids.indexOf(id), player, context);
  party.unlocked.add(id);
  events.push({ type: 'helperUnlocked', id, name: CHARACTERS[id].name });
  return true;
}

function startAttack(party, actor, kind, events) {
  if (actor.cooldown > 0 || actor.attack) return false;
  const definition = ATTACKS[kind];
  actor.cooldown = definition.cooldown;
  actor.attack = { id: ++party.sequence, kind, elapsed: 0,
    facing: actor.facing, hitIds: new Set() };
  events.push({ type: 'melee', character: actor.id, kind });
  return true;
}

// One-shot actions, consumed by the engine once per fixed step (never held).
// attackPressed alternates Marco's punch/kick; helperPressed cues both helpers.
// Donkey strikes BEHIND its facing direction; Mario kicks forward.
export function requestPartyAttacks(party, input, events = []) {
  if (input.attackPressed) requestActorAttack(party, party.actors[party.leader], events);
  if (!input.helperPressed) return;
  if (party.independent) {
    party.manualAttack = true;
    return;
  }
  for (const id of companionIds(party)) {
    if (party.unlocked.has(id)) requestActorAttack(party, party.actors[id], events);
  }
}

// Call only while playing, once per fixed simulation step, before new requests.
export function updateParty(party, player, dt, worldWidth = Infinity) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const step = Math.min(dt, 1 / 60);
  for (const actor of Object.values(party.actors)) {
    actor.cooldown = Math.max(0, actor.cooldown - step);
    if (actor.attack) {
      actor.attack.elapsed += step;
      if (actor.attack.elapsed >= ATTACKS[actor.attack.kind].duration) actor.attack = null;
    }
  }
  syncParty(party, player, worldWidth);
}

// World-coordinate attack boxes share level.js dimensions. Combat must reject
// occluded targets behind solid bricks and honor existing boss vulnerability.
export function activePartyAttacks(party) {
  const boxes = [];
  for (const actor of visibleParty(party)) {
    const attack = actor.attack;
    if (!attack) continue;
    const spec = ATTACKS[attack.kind];
    if (attack.elapsed < spec.start || attack.elapsed >= spec.end) continue;
    const direction = attack.facing * (spec.backward ? -1 : 1);
    boxes.push({ actorId: actor.id, attackId: attack.id, kind: attack.kind,
      x: direction > 0 ? actor.x + P.playerWidth - 4 : actor.x + 4 - spec.reach,
      y: actor.y + spec.top, w: spec.reach, h: spec.height,
      originX: actor.x + P.playerWidth / 2,
      originY: actor.y + spec.top + spec.height / 2,
      direction, damage: spec.damage });
  }
  return boxes;
}

// Call only after a valid, unoccluded overlap. Each target takes at most one
// hit per swing even across many fixed steps; dead-target filtering is combat's.
export function claimPartyHit(party, box, targetId) {
  const attack = party.actors[box.actorId]?.attack;
  if (!attack || attack.id !== box.attackId || targetId == null) return false;
  const spec = ATTACKS[attack.kind];
  if (attack.elapsed < spec.start || attack.elapsed >= spec.end
      || attack.hitIds.has(targetId)) return false;
  attack.hitIds.add(targetId);
  return true;
}

// context: {world, blocks, enemies}; required for independent lifecycle resets.
export function resetPartyMotion(party, player, worldWidth = Infinity, context = null) {
  party.companionTime = 0;
  party.manualAttack = false;
  party.planningTurn = 0;
  for (const actor of Object.values(party.actors)) {
    actor.attack = null;
    actor.cooldown = 0;
    actor.nextKick = false;
  }
  syncParty(party, player, worldWidth);
  if (!party.independent) return;
  companionIds(party).forEach((id, slot) => {
    if (party.unlocked.has(id)) resetCompanion(party, id, slot, player, context);
  });
}

function resetCompanion(party, id, slot, player, context) {
  const actor = party.actors[id];
  actor.attack = null;
  actor.cooldown = 0;
  actor.nextKick = false;
  actor.ai = createCompanionAI(slot);
  const anchor = { x: player.x - player.facing * (64 + slot * 52), y: player.y };
  const position = context && findSafeLanding(anchor, context.world,
    context.blocks || [], { maxDistance: 240,
      avoid: (context.enemies || []).filter(enemy => !enemy.dead) });
  resetActorBody(actor, position || player);
  actor.facing = player.facing;
  actor.recovering = !position;
  actor.ai.recovering = !position;
}

// Allocate distinct nearby targets; preserve a valid claim before picking a new
// one. All enemies remain in AI context for safe navigation and recovery.
function assignSupportTargets(party, player, context) {
  const assignments = new Map();
  const claimed = new Set();
  const actors = companionIds(party)
    .filter(id => party.unlocked.has(id) && !party.actors[id].recovering)
    .map(id => party.actors[id]);
  let slots = Math.max(0, Math.floor(context.supportSlots ?? 0));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const candidates = actor => (context.enemies || []).filter(enemy => !enemy.dead
    && !claimed.has(enemy.id) && distance(enemy, player) < 330
    && distance(enemy, actor) < 300
    && inMeleeBand(actor, enemy, ATTACKS[nextAttackKind(actor)]));
  for (const retain of [true, false]) {
    for (const actor of actors) {
      if (slots === 0 || assignments.has(actor.id)) continue;
      const eligible = candidates(actor);
      const target = retain ? eligible.find(enemy => enemy.id === actor.ai.targetId)
        : eligible.sort((a, b) => distance(a, actor) - distance(b, actor))[0];
      if (!target) continue;
      assignments.set(actor.id, target.id);
      claimed.add(target.id);
      slots--;
    }
  }
  return assignments;
}

// Call once per engine tick AFTER updateParty (attack timers), before combat.
// Navigation commands are 60Hz; the current engine is 120Hz. Accumulate rather
// than consuming a full navigation command on every half-length engine tick.
export function updateCompanions(party, player, dt, context, events = []) {
  if (!party.independent || !Number.isFinite(dt) || dt <= 0) return;
  if (dt > 1 / 60 + .00001) throw new RangeError('Party requires fixed ticks <= 1/60 s');
  party.companionTime += dt;
  const step = 1 / 60;
  const ids = companionIds(party);
  while (party.companionTime + 1e-9 >= step) {
    party.companionTime = Math.max(0, party.companionTime - step);
    const assignments = assignSupportTargets(party, player, context);
    ids.forEach((id, slot) => {
      if (!party.unlocked.has(id)) return;
      const actor = party.actors[id];
      const intent = decideCompanion(actor.ai, actor, {
        ...context, leader: player, spec: ATTACKS[nextAttackKind(actor)],
        assignedTargetId: assignments.get(id) ?? null,
        manualAttack: party.manualAttack, allowPlanning: slot === party.planningTurn
      }, step);
      if (intent.recovery) {
        resetActorBody(actor, intent.recovery);
        actor.attack = null;
        actor.cooldown = 0;
        actor.nextKick = false;
        actor.facing = player.facing;
        actor.recovering = false;
        events.push({ type: 'partyRecover', character: id });
        return;
      }
      actor.recovering = actor.ai.recovering;
      if (actor.recovering) {
        actor.attack = null;
        actor.vx = 0;
        actor.vy = 0;
        return;
      }
      // AI checks melee reach before physics. Friction alone lets a running
      // helper coast past that target during windup, with its strike facing
      // locked the wrong way. Plant horizontal motion for the committed swing;
      // gravity and platform/brick collisions still run normally.
      if (actor.attack || intent.attackPressed) actor.vx = 0;
      stepActor(actor, intent, context.world, context.blocks || [], step);
      if (!actor.attack && intent.facing) actor.facing = intent.facing;
      if (intent.attackPressed) requestActorAttack(party, actor, events);
    });
    party.manualAttack = false;
    party.planningTurn = (party.planningTurn + 1) % ids.length;
  }
}

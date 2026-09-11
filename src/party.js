import { PHYSICS as P } from './level.js';

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

export function createParty(player) {
  const party = { leader: 'marco', unlocked: new Set(), sequence: 0,
    actors: Object.fromEntries(Object.keys(CHARACTERS).map(id => [id, makeActor(id)])) };
  syncParty(party, player);
  return party;
}

// Helpers are support companions anchored to the player's platforming body,
// not independent physics actors. Consumers must not give them contact damage.
// Pass the current world's width to keep their visible bodies inside its edges.
export function syncParty(party, player, worldWidth = Infinity) {
  const facing = player.facing < 0 ? -1 : 1;
  const maxX = Math.max(0, worldWidth - P.playerWidth);
  for (const actor of Object.values(party.actors)) {
    const offset = CHARACTERS[actor.id].offset || 0;
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
  return [party.actors.marco, ...HELPER_IDS.filter(id => party.unlocked.has(id))
    .map(id => party.actors[id])];
}

// Accept the existing block pickup shape { kind }; duplicate rewards do nothing.
export function unlockHelper(party, reward, events = []) {
  const id = HELPER_IDS.find(key => CHARACTERS[key].reward === reward.kind);
  if (!id || party.unlocked.has(id)) return false;
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
  const marco = party.actors.marco;
  if (input.attackPressed && startAttack(party, marco,
    marco.nextKick ? 'kick' : 'punch', events)) marco.nextKick = !marco.nextKick;
  if (!input.helperPressed) return;
  for (const id of HELPER_IDS) {
    if (party.unlocked.has(id)) {
      startAttack(party, party.actors[id], id === 'donkey' ? 'backKick' : 'kick', events);
    }
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

export function resetPartyMotion(party, player, worldWidth = Infinity) {
  for (const actor of Object.values(party.actors)) {
    actor.attack = null;
    actor.cooldown = 0;
    actor.nextKick = false;
  }
  syncParty(party, player, worldWidth);
}

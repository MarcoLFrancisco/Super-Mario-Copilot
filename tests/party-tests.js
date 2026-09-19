import { createState, update, setPaused } from '../src/engine.js';
import { PHYSICS as P, LEVEL } from '../src/level.js';
import { resolveBlockY } from '../src/blocks.js';
import { visibleParty, requestActorAttack, activePartyAttacks, ATTACKS,
  resetPartyMotion } from '../src/party.js';
import { createCombat, updateCombat, helperAllowance, resetCombat } from '../src/combat.js';
import { createBoss, hitBoss, bossSupportTarget } from '../src/boss.js';
import { ARENA } from '../src/encounters.js';
import { createCompanionAI, decideCompanion } from '../src/party-ai.js';
import { resetActorBody, stepActor } from '../src/actor-physics.js';
import { nextAttackKind, updateParty, updateCompanions } from '../src/party.js';
import { planRoute } from '../src/party-navigation.js';

const emptyCombat = () => createCombat({ enemies: [], pickups: [] });
const context = s => ({ world: LEVEL, blocks: s.blocks.blocks, enemies: [] });

// Controlled poses isolate hit resolution from navigation and animation timing.
function swing(party, id, x, y, facing = 1) {
  const actor = party.actors[id];
  Object.assign(actor, { x, y, facing, recovering: false, attack: null, cooldown: 0 });
  requestActorAttack(party, actor);
  actor.attack.elapsed = ATTACKS[actor.attack.kind].start + .001;
  return actor;
}

function shot(combat, boss, damage = 1) {
  combat.shots.push({ owner: 'player', x: boss.x + 10, y: boss.y + 10,
    w: 8, h: 8, life: 1, damage, vx: 0, vy: 0 });
}

export async function runTests({ test, assert }) {
  for (const leader of ['marco', 'mario', 'donkey']) {
    await test(`${leader}: solo start, two real box rewards, recovery and restart`, () => {
      const s = createState(leader);
      assert(s.party.leader === leader && visibleParty(s.party).length === 1, 'Must start solo');
      const boxes = s.blocks.blocks.filter(b => b.reward?.startsWith('helper-'));
      assert(boxes.length === 2, 'Exactly two recruitment boxes');
      assert(new Set(boxes.map(b => b.reward)).size === 2, 'Distinct recruits');
      assert(boxes.every(b => b.reward !== `helper-${leader}`), 'Never recruit the leader');
      s.combat.enemies = [];
      for (const box of boxes) {
        const p = s.player;
        Object.assign(p, { x: box.x, y: box.y + box.h - 1, vy: -100, vx: 0 });
        resolveBlockY(s.blocks, p, box.y + box.h + 2);
        const count = s.blocks.pickups.length;
        p.y = box.y + box.h - 1;
        resolveBlockY(s.blocks, p, box.y + box.h + 2);
        assert(s.blocks.pickups.length === count, 'Used box must not release twice');
        const pickup = s.blocks.pickups.find(r => r.id === `reward-${box.id}`);
        assert(pickup, 'Box must release its configured reward');
        Object.assign(p, { x: pickup.x, y: pickup.y, vx: 0, vy: 0 });
        const events = update(s, {}, 1 / 60);
        assert(events.filter(e => e.type === 'helperUnlocked').length === 1, 'Engine recruits once');
        assert(s.party.unlocked.has(box.reward.slice(7)), 'Correct character recruited');
        assert(!update(s, {}, 1 / 60).some(e => e.type === 'helperUnlocked'), 'No duplicate unlock');
      }
      assert(s.party.unlocked.size === 2, 'Both teammates recruited');
      resetPartyMotion(s.party, s.player, LEVEL.width, context(s));
      assert(s.party.unlocked.size === 2, 'Recovery retains recruits');
      assert(Object.values(s.party.actors).every(a => !a.attack), 'Recovery cancels attacks');
      assert(createState(leader).party.unlocked.size === 0, 'Restart resets recruitment');
    });
  }

  await test('Character attacks, cooldown rejection, and Donkey backward direction', () => {
    const s = createState();
    const marco = swing(s.party, 'marco', 200, 200);
    assert(marco.attack.kind === 'punch', 'Marco starts with a punch');
    assert(!requestActorAttack(s.party, marco), 'Active cooldown rejects a second attack');
    assert(swing(s.party, 'marco', 200, 200).attack.kind === 'kick', 'Marco alternates');
    const d = createState('donkey');
    swing(d.party, 'donkey', 200, 200, 1);
    const box = activePartyAttacks(d.party)[0];
    assert(box.kind === 'backKick' && box.direction === -1 && box.x < 200, 'Donkey strikes behind');
    assert(swing(createState('mario').party, 'mario', 200, 200).attack.kind === 'kick', 'Mario kicks');
  });

  for (const id of ['marco', 'mario', 'donkey']) {
    await test(`${id}: automatic melee plants both running approaches through windup`, () => {
      for (const direction of [-1, 1]) {
        const world = { width: 800, hazards: [], platforms: [
          { id: 'floor', x: 0, y: 300, w: 800, h: 30 }
        ] };
        const s = createState(id === 'marco' ? 'mario' : 'marco');
        const actor = s.party.actors[id];
        s.party.unlocked.add(id);
        resetActorBody(actor, { x: 300, y: 300 - P.playerHeight });
        Object.assign(actor, { vx: direction * P.speed, facing: direction,
          recovering: false, ai: createCompanionAI() });
        Object.assign(s.player, { x: 220, y: actor.y, vx: 0, vy: 0, facing: 1 });
        const enemy = { id: 'close-target', dead: false,
          x: direction > 0 ? actor.x + P.playerWidth + 1 : actor.x - 9,
          y: actor.y, w: 8, h: P.playerHeight };
        const startX = actor.x;
        const events = [];
        let connected = false;
        for (let frame = 0; frame < 30; frame++) {
          updateParty(s.party, s.player, 1 / 60, world.width);
          updateCompanions(s.party, s.player, 1 / 60, {
            world, blocks: [], enemies: [enemy], supportSlots: 1
          }, events);
          assert(actor.attack, 'In-range helper must start its automatic attack');
          assert(actor.x === startX && actor.vx === 0,
            'Committed attack must not coast beyond its checked position');
          const strike = activePartyAttacks(s.party).find(box => box.actorId === id);
          if (!strike) continue;
          assert(strike.direction === direction,
            'Donkey must face away while its back kick still points at the target');
          assert(strike.x < enemy.x + enemy.w && strike.x + strike.w > enemy.x
            && strike.y < enemy.y + enemy.h && strike.y + strike.h > enemy.y,
            'Attack must retain target overlap when its damage window opens');
          connected = true;
          break;
        }
        assert(connected, 'Automatic attack must reach its active window');
        assert(events.filter(event => event.type === 'melee').length === 1,
          'Windup must not restart the attack');
      }
    });
  }

  await test('Ready teammates take cooldown-bound targets without stealing active swings', () => {
    const world = { width: 800, hazards: [], platforms: [
      { id: 'floor', x: 0, y: 300, w: 800, h: 30 }
    ] };
    for (const scenario of ['cooldown', 'committed', 'committed-punch-band']) {
      const committed = scenario !== 'cooldown';
      const s = createState('mario');
      const marco = s.party.actors.marco;
      const donkey = s.party.actors.donkey;
      for (const actor of [marco, donkey]) {
        s.party.unlocked.add(actor.id);
        resetActorBody(actor, { x: 300, y: 300 - P.playerHeight });
        Object.assign(actor, { facing: 1, recovering: false, ai: createCompanionAI() });
      }
      Object.assign(s.player, { x: 220, y: marco.y, vx: 0, vy: 0, facing: 1 });
      const narrow = scenario === 'committed-punch-band';
      const enemy = { id: 'shared-target', dead: false,
        x: marco.x + P.playerWidth + 8, y: marco.y + (narrow ? 16 : 0),
        w: 30, h: narrow ? 2 : P.playerHeight };
      // This shallow target intersects punch and backKick, but not Marco's
      // upcoming kick. A committed punch must still reserve it from Donkey.
      marco.ai.targetId = enemy.id;
      if (committed) requestActorAttack(s.party, marco);
      else marco.cooldown = .2;
      const events = [];
      updateCompanions(s.party, s.player, 1 / 60, {
        world, blocks: [], enemies: [enemy], supportSlots: 1
      }, events);
      if (committed) {
        assert(marco.attack && !donkey.attack,
          'An active swing must retain its assignment using its own hitbox');
        if (narrow) {
          assert(marco.attack.kind === 'punch' && nextAttackKind(marco) === 'kick',
            'Fixture must distinguish the committed punch from the upcoming kick');
        }
        assert(!events.some(event => event.type === 'melee'),
          'The second helper must not duplicate a committed attack');
      } else {
        assert(!marco.attack && marco.ai.targetId === null,
          'Cooling-down companion must release its ordinary target');
        assert(donkey.ai.targetId === enemy.id && donkey.attack?.kind === 'backKick',
          'Ready teammate must take the target and attack automatically');
        assert(events.filter(event => event.type === 'melee').length === 1,
          'Exactly one helper starts an attack for the available slot');
      }
    }
  });

  await test('A finished target releases support to a ready teammate during an active swing', () => {
    const world = { width: 800, hazards: [], platforms: [
      { id: 'floor', x: 0, y: 300, w: 800, h: 30 }
    ] };
    const s = createState('mario');
    const marco = s.party.actors.marco;
    const donkey = s.party.actors.donkey;
    for (const actor of [marco, donkey]) {
      s.party.unlocked.add(actor.id);
      resetActorBody(actor, { x: actor.id === 'marco' ? 200 : 350,
        y: 300 - P.playerHeight });
      Object.assign(actor, { facing: 1, recovering: false, ai: createCompanionAI() });
    }
    Object.assign(s.player, { x: 280, y: marco.y, vx: 0, vy: 0, facing: 1 });
    const previous = { id: 'finished-target', dead: true,
      x: marco.x + P.playerWidth + 8, y: marco.y, w: 30, h: P.playerHeight };
    const next = { id: 'next-target', dead: false,
      x: donkey.x + P.playerWidth + 8, y: donkey.y, w: 30, h: P.playerHeight };
    marco.ai.targetId = previous.id;
    requestActorAttack(s.party, marco);
    const committedId = marco.attack.id;
    const events = [];
    updateCompanions(s.party, s.player, 1 / 60, {
      world, blocks: [], enemies: [previous, next], supportSlots: 1
    }, events);
    assert(marco.attack?.id === committedId,
      'The original swing must finish without cancellation or restart');
    assert(donkey.ai.targetId === next.id && donkey.attack?.kind === 'backKick',
      'Ready teammate must receive the next opponent instead of an occupied attacker');
    const attacks = events.filter(event => event.type === 'melee');
    assert(attacks.length === 1 && attacks[0].character === 'donkey',
      'Only the ready teammate starts a new attack');
  });

  await test('Helpers continue defeating opponents without player kills or duplicate rewards', () => {
    const s = createState();
    const c = emptyCombat();
    s.party.unlocked.add('donkey');
    swing(s.party, 'donkey', 200, 200, -1);
    const box = activePartyAttacks(s.party)[0];
    c.enemies = ['a', 'b'].map(id => ({ id, kind: 'robot', x: box.x + 5, y: box.y,
      w: 8, h: 8, health: 1, speed: 0, facing: 1, minX: 0, maxX: 1000,
      age: 0, dead: false, stompable: false }));
    const player = { ...s.player, x: 0, y: 0 };
    const events = [];
    const step = () => updateCombat(c, player, {}, 1 / 120, P.playerHeight, events, [], s.party);
    step(); step();
    assert(c.contribution.helperKills === 2 && helperAllowance(c) === 2, 'Both opponents defeated without disabling helpers');
    assert(events.filter(e => e.type === 'enemyDefeated').length === 2, 'One reward per defeat');
    c.contribution.playerKills = 2;
    step();
    assert(c.contribution.helperKills === 2, 'Repeated overlap must not duplicate defeats');
    assert(events.filter(e => e.type === 'enemyDefeated').every(e => e.helper && e.actorId === 'donkey'), 'Attribution');
    resetCombat(c);
    assert(c.contribution.helperKills === 2, 'Checkpoint retains accounting');
    assert(emptyCombat().contribution.helperKills === 0, 'New encounter resets accounting');
  });

  await test('Recruited companions seek and collect items away from the leader', () => {
    const world = { ...LEVEL, width: 1600, hazards: [], spawn: { x: 650, y: 564 },
      platforms: [{ id: 'floor', x: 0, y: 610, w: 1600, h: 30 }],
      checkpoints: [{ name: 'Start', x: 650, y: 610, spawn: { x: 650, y: 564 } }],
      goal: { x: 1500, y: 480, w: 50, h: 130 },
      sparks: [{ id: 'team-item', x: 380, y: 552, radius: 11, app: 'copilot' }] };
    const state = createState('marco', { world, encounters: { enemies: [], blocks: [], pickups: [] } });
    state.party.unlocked.add('mario');
    resetPartyMotion(state.party, state.player, world.width, { world, blocks: [], enemies: [] });
    const events = [];
    for (let frame = 0; frame < 360 && !state.collected.has('team-item'); frame += 1) events.push(...update(state, {}, 1 / 60));
    assert(state.collected.has('team-item'), 'Companion should pursue and collect the item');
    assert(state.player.x === 650, 'Leader does not have to move to the item');
    assert(events.filter(event => event.type === 'spark').length === 1, 'Pickup scores exactly once');
    assert(events.find(event => event.type === 'spark').actorId === 'mario', 'Pickup identifies the collecting helper');
    assert(state.score > 0, 'Companion pickups credit the shared score');
  });

  await test('Recruited teammates defeat several nearby opponents autonomously', () => {
    const world = { ...LEVEL, width: 1200, hazards: [], sparks: [], spawn: { x: 630, y: 564 },
      platforms: [{ id: 'floor', x: 0, y: 610, w: 1200, h: 30 }],
      checkpoints: [{ name: 'Start', x: 630, y: 610, spawn: { x: 630, y: 564 } }],
      goal: { x: 1150, y: 480, w: 40, h: 130 } };
    const enemies = [400,450,500].map((x, index) => ({ id: `opponent-${index}`, kind: 'robot',
      x, y: 576, minX: x, maxX: x, speed: 0 }));
    const state = createState('marco', { world, encounters: { enemies, pickups: [], blocks: [] } });
    state.party.unlocked.add('mario'); state.party.unlocked.add('donkey');
    resetPartyMotion(state.party, state.player, world.width, { world, blocks: [], enemies: state.combat.enemies });
    for (let frame = 0; frame < 420 && state.combat.enemies.some(enemy => !enemy.dead); frame += 1) update(state, {}, 1 / 60);
    assert(state.combat.enemies.every(enemy => enemy.dead), 'Teammates must keep engaging after the first opponent');
    assert(state.combat.contribution.helperKills === 3, 'All three defeats attributed to companions');
    assert(state.combat.contribution.playerKills === 0, 'Player kills are not a prerequisite for support');
    assert(state.score === 600, 'Each opponent rewards the shared score once');
  });

  await test('Ladders and ropes support climbing, holding position, descending and jumping off', () => {
    for (const kind of ['ladder', 'rope']) {
      const world = { width: 800, hazards: [], platforms: [
        { id: 'base', x: 0, y: 610, w: 800, h: 30 }, { id: 'upper', x: 200, y: 310, w: 240, h: 24 }
      ], climbs: [{ id: 'climb', kind, x: 300, top: 310, bottom: 610 }] };
      const actor = resetActorBody({ id: 'marco', facing: 1 }, { x: 283, y: 564 });
      for (let frame = 0; frame < 50; frame += 1) stepActor(actor, { up: true }, world, [], 1 / 60);
      const height = actor.y;
      assert(height < 500 && actor.climbing === 'climb', 'Up input moves onto the climbing object');
      stepActor(actor, {}, world, [], 1 / 60);
      assert(actor.y === height, 'Releasing controls holds the rope or ladder');
      for (let frame = 0; frame < 150; frame += 1) stepActor(actor, { up: true }, world, [], 1 / 60);
      assert(actor.y === 310 - P.playerHeight && actor.grounded, 'Top exit lands on the upper floor');
      stepActor(actor, { down: true }, world, [], 1 / 60);
      assert(actor.climbing === 'climb', 'Can reenter from the upper floor');
      stepActor(actor, { move: 1, jumpPressed: true }, world, [], 1 / 60);
      assert(!actor.climbing && actor.vy < 0 && actor.x > 283, 'Jump detaches and moves away');
      const plan = planRoute(resetActorBody({}, { x: 283, y: 564 }), { x: 283, y: 264 }, world);
      assert(plan?.commands.some(command => command.up), 'Companion navigation plans real climb commands');
      const state = createState('marco', { world: { ...LEVEL, ...world, sparks: [], spawn: { x: 283, y: 564 } },
        encounters: { enemies: [], blocks: [], pickups: [] } });
      const jumping = createState('marco', { world: { ...LEVEL, ...world, sparks: [], spawn: { x: 283, y: 564 } },
        encounters: { enemies: [], blocks: [], pickups: [] } });
      update(jumping, { jumpPressed: true, jumpHeld: true, up: true }, 1 / 60);
      assert(jumping.player.vy < 0 && !jumping.player.climbing, 'Jump takes priority even when climb is also held');
      for (let frame = 0; frame < 150; frame += 1) update(state, { up: true }, 1 / 60);
      assert(state.player.y === 310 - P.playerHeight, 'Leader engine uses the same climbing movement');
    }
  });

  await test('Boss rejects shields and walls; helper caps preserve the player finishing blow', () => {
    const s = createState();
    const boss = createBoss();
    const c = emptyCombat();
    const events = [];
    s.party.unlocked.add('donkey');
    const strike = () => swing(s.party, 'donkey', boss.x - P.playerWidth - 8, boss.y + 30, -1);
    strike();
    hitBoss(boss, c, events, s.party);
    assert(boss.health === boss.maxHealth, 'Shield rejects melee');
    boss.mode = 'exposed';
    const wall = { x: boss.x - 6, y: boss.y, w: 6, h: boss.h, broken: false };
    hitBoss(boss, c, events, s.party, [wall]);
    assert(boss.health === boss.maxHealth, 'Intact wall blocks melee');
    hitBoss(boss, c, events, s.party);
    assert(boss.helperDamage === 2, 'At most two damage per exposure');
    boss.grace = 0;
    strike(); hitBoss(boss, c, events, s.party);
    assert(boss.helperDamage === 2, 'Same exposure cannot spend more');
    for (let i = 0; i < 4; i++) {
      boss.mode = 'exposed'; boss.grace = 0; boss.helperWindowDamage = 0;
      strike(); hitBoss(boss, c, events, s.party);
    }
    assert(boss.helperDamage === 8, 'Total helper cap is eight');
    const last = createBoss();
    last.health = 1; last.mode = 'exposed'; last.phase = 2;
    swing(s.party, 'donkey', last.x - P.playerWidth - 8, last.y + 30, -1);
    hitBoss(last, c, events, s.party);
    assert(last.health === 1 && !last.defeated, 'Helpers cannot finish alone');
    shot(c, last); hitBoss(last, c, events, s.party); hitBoss(last, c, events, s.party);
    assert(last.defeated && events.filter(e => e.type === 'bossDefeated').length === 1, 'Single player victory');
  });

  await test('Companions land on the first crossed floor regardless of surface order', () => {
    const upper = { id: 'upper', x: 0, y: 300, w: 400, h: 4 };
    const lower = { id: 'lower', x: 0, y: 310, w: 400, h: 4 };
    const cases = [
      { platforms: [upper, lower], blocks: [] },
      { platforms: [lower, upper], blocks: [] },
      { platforms: [upper], blocks: [lower] },
      { platforms: [lower], blocks: [upper] }
    ];
    for (const { platforms, blocks } of cases) {
      const world = { width: 400, hazards: [], platforms };
      const actor = resetActorBody({ id: 'marco', facing: 1 },
        { x: 100, y: upper.y - P.playerHeight - 2 });
      actor.vy = P.maxFallSpeed;
      const contact = stepActor(actor, { move: 0 }, world, blocks, 1 / 60);
      assert(contact.landed && actor.grounded, 'Descending companion must land');
      assert(actor.y === upper.y - P.playerHeight && actor.surfaceId === upper.id,
        'Upper crossed floor must win over a later lower surface');
      assert(actor.vy === 0, 'Landing must cancel downward velocity');
      stepActor(actor, { move: 0 }, world, blocks, 1 / 60);
      assert(actor.grounded && actor.surfaceId === upper.id,
        'Companion must remain supported on the next tick');
    }
  });

  await test('Marco closes a near-target gap instead of idling outside punch range', () => {
    const world = { width: 800, hazards: [], platforms: [
      { id: 'floor', x: 0, y: 300, w: 800, h: 30 }
    ] };
    const enemy = { id: 'nearby-bug', x: 300, y: 254, w: 30, h: 46, dead: false };
    const actor = resetActorBody({ id: 'marco', facing: 1, cooldown: 0, attack: null },
      { x: enemy.x - P.playerWidth - 12 - 18, y: 300 - P.playerHeight });
    const ai = createCompanionAI();
    const leader = { x: 220, y: actor.y, facing: 1 };
    let attacked = false;
    for (let frame = 0; frame < 120; frame++) {
      const intent = decideCompanion(ai, actor, { world, leader, blocks: [],
        enemies: [enemy], spec: ATTACKS.punch, assignedTargetId: enemy.id }, 1 / 60);
      assert(!intent.recovery, 'Approach must not rely on teleport recovery');
      stepActor(actor, intent, world, [], 1 / 60);
      if (intent.attackPressed) { attacked = true; break; }
    }
    assert(attacked, 'AI must close the gap and request a punch automatically');
  });

  await test('Unreachable drones release support targets to hittable ground enemies', () => {
    const world = { width: 800, hazards: [], platforms: [
      { id: 'floor', x: 0, y: 300, w: 800, h: 30 }
    ] };
    const s = createState('mario');
    const combat = createCombat({ pickups: [], enemies: [
      { id: 'overhead', kind: 'drone', x: 220, y: 182,
        minX: 220, maxX: 220, speed: 0 },
      { id: 'ground', kind: 'robot', x: 250, y: 266,
        minX: 250, maxX: 250, speed: 0 }
    ] });
    assert(combat.enemies.every(enemy => enemy.facing === 1),
      'Enemies without an explicit direction must default to facing right');
    const actor = s.party.actors.marco;
    s.party.unlocked.add('marco');
    resetActorBody(actor, { x: 200, y: 300 - P.playerHeight });
    Object.assign(actor, { facing: 1, recovering: false, ai: createCompanionAI() });
    Object.assign(s.player, { x: 100, y: actor.y, vx: 0, vy: 0, facing: 1 });
    // Simulate a retained drone claim, not just a favorable initial selection.
    actor.ai.targetId = 'overhead';
    const standalone = createCompanionAI();
    standalone.targetId = 'overhead';
    decideCompanion(standalone, actor, { world, leader: s.player, blocks: [],
      enemies: combat.enemies, spec: ATTACKS.punch, allowPlanning: false }, 1 / 60);
    assert(standalone.targetId === 'ground', 'Standalone AI must release an unreachable target');
    const events = [];
    for (let frame = 0; frame < 240 && !combat.enemies[1].dead; frame++) {
      updateParty(s.party, s.player, 1 / 60, world.width);
      updateCompanions(s.party, s.player, 1 / 60, { world, blocks: [],
        enemies: combat.enemies, supportSlots: helperAllowance(combat) }, events);
      assert(actor.ai.targetId !== 'overhead', 'Coordinator must not reserve the aerial target');
      updateCombat(combat, s.player, {}, 1 / 60,
        s.player.y + P.playerHeight, events, [], s.party);
    }
    assert(combat.enemies[1].dead && !combat.enemies[0].dead,
      'Automatic support defeats the reachable robot, not the overhead drone');
    assert(combat.contribution.helperKills === 1, 'Support allowance is still enforced');
    assert(events.some(e => e.type === 'enemyDefeated' && e.id === 'ground'
      && e.helper && e.actorId === 'marco'), 'Defeat is attributed to the recruited helper');
  });

  await test('Marco automatically approaches and damages the exposed boss', () => {
    const s = createState('mario');
    const boss = createBoss();
    boss.mode = 'exposed';
    const combat = emptyCombat();
    const target = bossSupportTarget(boss);
    s.party.unlocked.add('marco');
    const actor = s.party.actors.marco;
    resetActorBody(actor, { x: target.x - P.playerWidth - 12 - 18, y: target.approachY });
    Object.assign(actor, { facing: 1, recovering: false, ai: createCompanionAI() });
    Object.assign(s.player, { x: 900, y: target.approachY, facing: 1 });
    const events = [];
    for (let frame = 0; frame < 120 && boss.helperDamage === 0; frame++) {
      updateParty(s.party, s.player, 1 / 60, ARENA.width);
      const intent = decideCompanion(actor.ai, actor, {
        world: ARENA, leader: s.player, blocks: [], enemies: [],
        spec: ATTACKS[nextAttackKind(actor)], assignedTargetId: null,
        bossTarget: bossSupportTarget(boss)
      }, 1 / 60);
      assert(!intent.recovery, 'Boss approach must use movement, not recovery');
      stepActor(actor, intent, ARENA, [], 1 / 60);
      if (!actor.attack && intent.facing) actor.facing = intent.facing;
      if (intent.attackPressed) requestActorAttack(s.party, actor, events);
      hitBoss(boss, combat, events, s.party);
    }
    assert(boss.helperDamage === 1, 'Automatic Marco punch damages the exposed core');
    assert(events.some(e => e.type === 'bossHit' && e.helper && e.actorId === 'marco'),
      'Boss damage must be attributed to the recruited companion');
  });

  await test('Victory presentation freezes combat, pauses, and completes exactly once', () => {
    const s = createState();
    s.boss = createBoss(); s.boss.mode = 'exposed'; s.boss.health = 1; s.boss.phase = 2;
    shot(s.combat, s.boss);
    const damageEvents = [];
    hitBoss(s.boss, s.combat, damageEvents);
    assert(s.boss.defeated && s.boss.defeatTime === 0, 'Killing blow starts presentation');
    const x = s.player.x, y = s.player.y, score = s.score;
    setPaused(s, true); update(s, {}, .1);
    assert(s.boss.defeatTime === 0, 'Pause freezes presentation');
    setPaused(s, false);
    const events = [];
    for (let i = 0; i < 20; i++) events.push(...update(s, { right: true, fire: true }, .1));
    assert(s.status === 'complete', 'Results follow bounded animation');
    assert(s.player.x === x && s.player.y === y && s.score === score, 'No physics or repeated score');
    assert(events.filter(e => e.type === 'complete').length === 1, 'One completion event');
    assert(update(s, {}, .1).length === 0, 'Completed state stays inert');
  });
}

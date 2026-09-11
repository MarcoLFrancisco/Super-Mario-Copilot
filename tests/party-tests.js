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
import { nextAttackKind, updateParty } from '../src/party.js';

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

  await test('One helper swing cannot overspend defeat allowance or duplicate rewards', () => {
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
    assert(c.contribution.helperKills === 1 && helperAllowance(c) === 0, 'Only one opening defeat');
    assert(events.filter(e => e.type === 'enemyDefeated').length === 1, 'One reward per defeat');
    c.contribution.playerKills = 2;
    step();
    assert(c.contribution.helperKills === 2, 'Two player defeats earn another helper slot');
    assert(events.filter(e => e.type === 'enemyDefeated').every(e => e.helper && e.actorId === 'donkey'), 'Attribution');
    resetCombat(c);
    assert(c.contribution.helperKills === 2, 'Checkpoint retains accounting');
    assert(emptyCombat().contribution.helperKills === 0, 'New encounter resets accounting');
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

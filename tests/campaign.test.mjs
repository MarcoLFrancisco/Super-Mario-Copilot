import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, update } from '../src/engine.js';
import { LEVEL, PHYSICS } from '../src/level.js';
import { ARENA } from '../src/encounters.js';
import { CAMPAIGN, createCampaign, updateCampaign, advanceCampaign, selectLevel, saveCampaign, pauseCampaign, retryLevel } from '../src/campaign.js';
import { createBoss } from '../src/boss.js';
import { worldMusicStep } from '../src/music.js';
import { interact, updateMission, missionReady, stationStatus, stationLabel, missionObjective } from '../src/missions.js';

test('the original engine accepts a mission without changing the selected character', () => {
  const world = { ...LEVEL, width: 2000, spawn: { x: 180, y: 564 }, sparks: [], hazards: [],
    platforms: [{ id: 'floor', x: 0, y: 610, w: 2000, h: 28 }],
    checkpoints: [{ name: 'New world', spawn: { x: 180, y: 564 }, x: 180, y: 610 }],
    goal: { x: 1900, y: 480, w: 70, h: 130 } };
  const arena = { ...ARENA, name: 'The Setup Wizard', boss: { ...ARENA.boss, health: 12 } };
  const state = createState('marco', { world, arena, encounters: { blocks: [], pickups: [], enemies: [] } });
  assert.equal(state.world, world);
  assert.equal(state.party.leader, 'marco');
  assert.equal(state.player.x, world.spawn.x);
  assert.equal(state.combat.enemies.length, 0);
  state.player.x = 1900;
  state.player.y = 610 - PHYSICS.playerHeight;
  const events = update(state, {}, 1 / 60);
  assert.equal(state.stage, 'boss');
  assert.equal(state.boss.health, 12);
  assert.ok(events.some(event => event.type === 'bossEnter' && event.name === arena.name));
});

test('the campaign has eight distinct sequential worlds with original-party states', () => {
  assert.deepEqual(CAMPAIGN.map(mission => mission.id), ['campus','github','cowork','foundry','agents','teams','orbit','core']);
  assert.equal(new Set(CAMPAIGN.filter(mission => mission.world).map(mission => JSON.stringify(mission.route))).size, 7);
  for (const mission of CAMPAIGN.filter(mission => mission.type === 'platform')) {
    const state = createState('mario', mission);
    assert.equal(state.party.leader, 'mario');
    assert.equal(Object.keys(state.party.actors).length, 3);
    assert.equal(state.world.checkpoints.length, 4);
    assert.ok(state.world.width > 8000);
    assert.ok(state.combat.enemies.length >= 8);
    assert.equal(missionReady(state), false);
  }
});

function atStation(state, key) {
  const station = (state.stage === 'boss' ? state.arena : state.world).stations.find(item => item.key === key);
  state.player.x = station.x - PHYSICS.playerWidth / 2;
  state.player.y = station.y - PHYSICS.playerHeight;
  state.player.vx = 0; state.player.vy = 0; state.player.grounded = true;
  return station;
}

test('blocked terminals name the missing task and its chapter before and after interaction', () => {
  const state = createState('marco', CAMPAIGN[0]);
  const tower = atStation(state, 'tower');
  assert.equal(stationStatus(state, tower), 'Blocked: Innovation Lab');
  const events = [];
  assert.equal(interact(state, null, events), false);
  assert.equal(events.at(-1).text, 'Open tower blocked: Innovation Lab incomplete.');
  assert.equal(state.missionProgress.jobs[tower.id].status, 'idle');
  const lab = atStation(state, 'restore');
  assert.equal(stationStatus(state, lab), 'Blocked: Lab power link (Keyboard Gardens)');
  assert.equal(interact(state, null, events), false);
  assert.match(events.at(-1).text, /Lab power link \(Keyboard Gardens\)/);
  assert.equal(state.score, 0);
});

test('pair construction reports remaining time, nearby waiting, and unambiguous completion', () => {
  const state = createState('marco', CAMPAIGN[0]);
  const station = atStation(state, 'pair');
  assert.equal(stationLabel(state, station), 'Lab power link (Keyboard Gardens)');
  const events = [];
  interact(state, null, events);
  assert.equal(stationStatus(state, station), 'Building together: 2.5s remaining');
  updateMission(state, {}, .5, events);
  assert.equal(stationStatus(state, station), 'Building together: 2.0s remaining');
  state.player.x = 0;
  updateMission(state, {}, 1, events);
  assert.equal(stationStatus(state, station), 'Waiting for you: 2.0s remaining');
  atStation(state, 'pair');
  updateMission(state, {}, 2, events);
  assert.equal(stationStatus(state, station), 'Complete');
  assert.ok(events.some(event => event.type === 'missionMessage' && event.text === 'Lab power link complete.'));
});

test('the end gate identifies the next required task and its direction without counting the optional bridge', () => {
  const state = createState('marco', CAMPAIGN[0]);
  atStation(state, 'suggestion'); interact(state, null, []);
  state.player.x = state.world.goal.x;
  let objective = missionObjective(state);
  assert.equal(objective.summary, '0 / 3 required tasks complete. Next: Lab power link (Keyboard Gardens), left.');
  const pair = atStation(state, 'pair'); interact(state, null, []);
  updateMission(state, {}, pair.duration, []);
  state.player.x = state.world.goal.x;
  objective = missionObjective(state);
  assert.equal(objective.completed, 1);
  assert.equal(objective.target.key, 'restore');
  assert.equal(objective.direction, 'left');
  atStation(state, 'restore'); interact(state, null, []);
  state.player.x = state.world.goal.x;
  assert.equal(missionObjective(state).summary, '2 / 3 required tasks complete. Next: Tower uplink (Tower Ascent), left.');
  atStation(state, 'tower'); interact(state, null, []);
  assert.equal(missionObjective(state).summary, '3 / 3 required tasks complete. Boss gate open.');
  assert.equal(missionReady(state), true);
});

test('guidance targets a missing context record before the waiting construction terminal', () => {
  const state = createState('marco', CAMPAIGN[2]);
  atStation(state, 'plan'); interact(state, 'bounded', []);
  atStation(state, 'build'); interact(state, null, []);
  const objective = missionObjective(state);
  assert.equal(objective.target.title, 'Roof access record');
  assert.equal(objective.direction, 'right');
  assert.match(objective.summary, /Roof access record \(Context Archives\)/);
});

test('pair work waits nearby, delegated work resumes only when context arrives', () => {
  const campus = createState('marco', CAMPAIGN[0]);
  const station = atStation(campus, 'pair'); interact(campus, null, []);
  campus.player.x = 0;
  for (let tick = 0; tick < 40; tick += 1) updateMission(campus, {}, .1, []);
  assert.equal(campus.missionProgress.jobs[station.id].remaining, station.duration);
  atStation(campus, 'pair');
  for (let tick = 0; tick < 30; tick += 1) updateMission(campus, {}, .1, []);
  assert.equal(campus.missionProgress.jobs[station.id].status, 'complete');
  const cowork = createState('marco', CAMPAIGN[2]);
  atStation(cowork, 'plan'); assert.equal(interact(cowork, 'expand', []), false);
  interact(cowork, 'bounded', []);
  const build = atStation(cowork, 'build'); interact(cowork, null, []);
  for (let tick = 0; tick < 60; tick += 1) updateMission(cowork, {}, .1, []);
  assert.equal(cowork.missionProgress.jobs[build.id].status, 'queued');
  cowork.missionProgress.resources.add('context');
  for (let tick = 0; tick < 60; tick += 1) updateMission(cowork, {}, .1, []);
  assert.equal(cowork.missionProgress.jobs[build.id].status, 'complete');
});

test('evaluation failures are safe and deployment requires an explicit rollback', () => {
  const state = createState('marco', CAMPAIGN[3]);
  atStation(state, 'module'); interact(state, 'speed', []);
  const evaluation = atStation(state, 'evaluate');
  assert.equal(interact(state, 'speed', []), false);
  assert.notEqual(state.missionProgress.jobs[evaluation.id].status, 'complete');
  interact(state, 'reasoning', []);
  const trial = atStation(state, 'trial'); interact(state, null, []);
  for (let tick = 0; tick < 40; tick += 1) updateMission(state, {}, .1, []);
  assert.equal(state.missionProgress.jobs[trial.id].status, 'rollback');
  const final = atStation(state, 'deploy');
  assert.equal(interact(state, null, []), false);
  atStation(state, 'trial'); interact(state, null, []);
  atStation(state, 'deploy'); interact(state, null, []);
  assert.equal(state.missionProgress.jobs[final.id].status, 'complete');
  assert.equal(missionReady(state), true);
});

test('campaign progression carries the original leader, recruits, and equipment through all eight levels', () => {
  const campaign = createCampaign('mario');
  assert.equal(selectLevel(campaign, 7), false);
  campaign.run.party.unlocked.add('marco'); campaign.run.party.unlocked.add('donkey');
  campaign.run.combat.blaster = true;
  for (let index = 0; index < 8; index += 1) {
    const state = campaign.run;
    assert.equal(campaign.levelIndex, index);
    assert.equal(state.pilot, 'mario');
    if (state.party) assert.equal(state.party.leader, 'mario');
    if (index > 0) assert.deepEqual([...campaign.recruits].sort(), ['donkey','marco']);
    if (state.mode === 'orbit') state.status = 'complete';
    else {
      state.boss = createBoss(state.arena);
      state.boss.defeated = true; state.boss.defeatTime = 1.8;
    }
    let events = updateCampaign(campaign, {}, 1 / 60);
    if (index === 7) {
      assert.ok(events.some(event => event.type === 'finaleStart'));
      assert.equal(campaign.run.mode, 'orbit'); assert.equal(campaign.run.wave, 4);
      assert.equal(campaign.finished, false);
      campaign.run.status = 'complete';
      events = updateCampaign(campaign, {}, 1 / 60);
      assert.ok(events.some(event => event.type === 'campaignComplete'));
      assert.equal(campaign.finished, true);
    } else {
      assert.ok(events.some(event => event.type === 'levelComplete'));
      assert.equal(campaign.unlocked, index + 1);
      assert.equal(updateCampaign(campaign, {}, 1 / 60).length, 0);
      assert.equal(advanceCampaign(campaign), true);
    }
  }
  assert.equal(campaign.completed.size, 8);
  assert.equal(advanceCampaign(campaign), false);
});

test('campaign saves progress without sharing mission runtime state', () => {
  const campaign = createCampaign('donkey', { unlocked: 4, current: 3, recruits: ['mario'], blaster: true });
  const restored = createCampaign('donkey', saveCampaign(campaign));
  assert.equal(restored.levelIndex, 3);
  assert.equal(restored.run.party.leader, 'donkey');
  assert.deepEqual([...restored.run.party.unlocked], ['mario']);
  assert.equal(restored.run.combat.blaster, true);
  assert.notEqual(restored.run.geometry, campaign.run.geometry);
  assert.notEqual(restored.run.geometry.platforms, CAMPAIGN[3].world.platforms);
  pauseCampaign(restored, true);
  const time = restored.run.time; updateCampaign(restored, { right: true }, .1);
  assert.equal(restored.run.time, time);
  pauseCampaign(restored, false);
  assert.equal(selectLevel(restored, 5), false);
  assert.equal(selectLevel(restored, 1), true);
});

test('the saucer mission is level seven and retries its current wave without changing the pilot', () => {
  const campaign = createCampaign('marco', { unlocked: 6, current: 6, recruits: ['mario','donkey'] });
  assert.equal(campaign.run.mode, 'orbit');
  campaign.run.wave = 3; campaign.run.status = 'failed';
  retryLevel(campaign);
  assert.equal(campaign.run.wave, 3);
  assert.equal(campaign.run.pilot, 'marco');
  assert.equal(campaign.run.charges, 3);
});

test('arena task retries restore progress fairly without farming score', () => {
  const state = createState('marco', CAMPAIGN[0]);
  for (const station of state.world.stations) state.missionProgress.jobs[station.id] = { status: 'complete' };
  state.player.x = state.world.goal.x; state.player.y = state.world.goal.y + state.world.goal.h - PHYSICS.playerHeight;
  update(state, {}, 1 / 60);
  assert.equal(state.stage, 'boss');
  const station = atStation(state, 'restart'); interact(state, null, []);
  const score = state.score;
  state.player.y = 900;
  update(state, {}, 1 / 60);
  assert.equal(state.missionProgress.jobs[station.id], undefined);
  assert.equal(state.boss.health, state.boss.maxHealth);
  atStation(state, 'restart'); interact(state, null, []);
  assert.equal(state.score, score);
});

function reachesPlatform(mission, source, target, direction) {
  const minX = direction > 0 ? Math.max(source.x + 10, target.x - 360) : source.x + 5;
  const maxX = direction > 0 ? source.x + source.w - PHYSICS.playerWidth
    : Math.min(source.x + source.w - PHYSICS.playerWidth, target.x + target.w + 330);
  for (let launchX = minX; launchX <= maxX; launchX += 10) {
    const state = createState('marco', mission);
    state.combat.enemies = [];
    Object.assign(state.player, { x: launchX, y: source.y - PHYSICS.playerHeight,
      vx: direction * PHYSICS.speed, facing: direction });
    for (let frame = 0; frame < 180; frame += 1) {
      update(state, { right: direction > 0, left: direction < 0,
        jumpPressed: frame === 0, jumpHeld: true }, 1 / 120);
      if (state.deaths > 0) break;
      if (state.player.grounded && frame > 0) {
        if (Math.abs(state.player.y + PHYSICS.playerHeight - target.y) < .01
          && state.player.x + PHYSICS.playerWidth > target.x && state.player.x < target.x + target.w) return true;
      }
    }
  }
  return false;
}

for (const mission of CAMPAIGN.filter(mission => mission.type === 'platform')) {
  test(`${mission.title}: every required route connection allows forward travel and return visits`, () => {
    const route = mission.world.mainRoute;
    for (let index = 0; index < route.length - 1; index += 1) {
      assert.ok(reachesPlatform(mission, route[index], route[index + 1], 1), `Forward connection ${index} -> ${index + 1}`);
      assert.ok(reachesPlatform(mission, route[index + 1], route[index], -1), `Return connection ${index + 1} -> ${index}`);
    }
  });
}

test('world objectives and boss control sequences complete through their real interaction paths', () => {
  for (const mission of CAMPAIGN.filter(item => item.type === 'platform')) {
    const state = createState('marco', mission);
    for (const resource of mission.world.resources) state.missionProgress.resources.add(resource.key);
    for (const station of state.world.stations) {
      atStation(state, station.key);
      assert.equal(interact(state, station.answer ?? station.choices?.[0][0], []), true, `${mission.id}: ${station.key}`);
      for (let tick = 0; tick < 120; tick += 1) updateMission(state, {}, .1, []);
      if (state.missionProgress.jobs[station.id].status === 'rollback') interact(state, null, []);
      assert.equal(state.missionProgress.jobs[station.id].status, 'complete');
    }
    assert.equal(missionReady(state), true);
    state.stage = 'boss'; state.boss = createBoss(state.arena);
    for (const station of state.arena.stations) {
      atStation(state, station.key);
      assert.equal(interact(state, station.answer ?? station.choices?.[0][0], []), true, `${mission.id} boss: ${station.key}`);
      for (let tick = 0; tick < 100; tick += 1) updateMission(state, {}, .1, []);
    }
    assert.equal(missionReady(state), true);
    assert.equal(state.boss.objectivesLocked, false);
  }
});

test('each campaign world has its own finite musical arrangement', () => {
  const scores = CAMPAIGN.map(mission => Array.from({ length: 16 }, (_, index) => worldMusicStep(index, mission.theme)));
  assert.equal(new Set(scores.map(score => JSON.stringify(score))).size, 8);
  assert.ok(scores.flat(2).every(event => (event.midi === null || Number.isFinite(event.midi)) && event.gain > 0 && event.gain <= .3));
});
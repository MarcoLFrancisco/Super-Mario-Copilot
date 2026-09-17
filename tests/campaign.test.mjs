import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, update } from '../src/engine.js';
import { LEVEL, PHYSICS } from '../src/level.js';
import { ARENA } from '../src/encounters.js';
import { CAMPAIGN, createCampaign, updateCampaign, advanceCampaign, selectLevel, saveCampaign, pauseCampaign, retryLevel } from '../src/campaign.js';
import { createBoss } from '../src/boss.js';
import { worldMusicStep } from '../src/music.js';
import { interact, updateMission, missionReady, stationStatus, stationLabel, missionObjective } from '../src/missions.js';
import { WORK_TASKS, submitWork, workView } from '../src/trivia-tasks.js';

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

function finishWork(state, key, events = []) {
  const station = atStation(state, key);
  for (const phase of ['request', 'review']) {
    const answers = Object.fromEntries(station.workflow[phase].fields.map(item => [item.id, item.answer]));
    assert.equal(interact(state, { phase, answers }, events), true);
  }
  return station;
}

test('campus trivia teaches tokens and context with corrective feedback', () => {
  const station = { workflow: WORK_TASKS.campus.find(task => task.key === 'workbook') };
  const job = {};
  assert.equal(submitWork(station, job, { phase: 'review', answers: {} }).accepted, false);
  assert.equal(submitWork(station, job, { phase: 'request', answers: { answer: 'piece' } }).accepted, true);
  assert.equal(workView(station, job).phase, 'review');
  assert.equal(submitWork(station, job, { phase: 'review', answers: { answer: 'train' } }).accepted, false);
  assert.equal(job.artifact, undefined);
  const result = submitWork(station, job, { phase: 'review', answers: { answer: 'ground' } });
  assert.equal(result.complete, true);
  assert.equal(job.artifact.title, 'Tokens and context badge');
  assert.deepEqual(job.artifact.rows.at(-1), ['2 / 2 correct', 'prompts and context windows']);
});

test('Cowork trivia reinforces bounded agent delegation', () => {
  const station = { workflow: WORK_TASKS.cowork[0] };
  const job = {};
  submitWork(station, job, { phase: 'request', answers: { answer: 'steps' } });
  const rejected = submitWork(station, job, { phase: 'review', answers: { answer: 'unlimited' } });
  assert.equal(rejected.accepted, false);
  assert.match(rejected.message, /scope and approval/);
  assert.equal(submitWork(station, job, { phase: 'review', answers: { answer: 'bounded' } }).complete, true);
  assert.deepEqual(job.artifact.rows.at(-1), ['2 / 2 correct', 'AI agents']);
});

test('all trivia checkpoints provide clues, corrective feedback, and a badge', () => {
  for (const tasks of Object.values(WORK_TASKS)) for (const task of tasks) {
    const job = {};
    assert.ok(task.product && task.goal && task.sources.rows.length && task.result.rows.length);
    for (const phase of ['request','review']) {
      const step = task[phase];
      assert.ok(step.fields.length > 0);
      for (const item of step.fields) assert.ok(item.options.some(([key]) => key === item.answer) && item.hint);
      const result = submitWork({ workflow: task }, job, { phase,
        answers: Object.fromEntries(step.fields.map(item => [item.id, item.answer])) });
      assert.equal(result.accepted, true, `${task.key}: ${phase}`);
      if (phase === 'review') assert.equal(result.complete, true);
    }
  }
});

test('each workstation can be completed independently without an unrelated prerequisite switch', () => {
  for (const mission of CAMPAIGN.filter(item => item.type === 'platform')) {
    for (const station of mission.world.stations) {
      const state = createState('marco', mission);
      assert.equal(stationStatus(state, station), 'Ready');
      assert.equal(station.requires, undefined);
      assert.equal(station.duration, undefined);
      finishWork(state, station.key);
      assert.equal(stationStatus(state, station), 'Complete');
      assert.equal(state.missionProgress.jobs[station.id].artifact.title, station.workflow.result.title);
    }
  }
});

test('level-two trivia, repeated submission, completion, and out-of-range inputs provide immediate feedback', () => {
  const state = createState('marco', CAMPAIGN[1]);
  const station = atStation(state, 'fix');
  const events = [];
  const request = { phase: 'request', answers: { answer: 'context' } };
  assert.equal(interact(state, request, events), true);
  assert.equal(stationStatus(state, station), 'Question 2 ready');
  assert.equal(interact(state, request, events), false);
  assert.match(events.at(-1).text, /Current step: Question 2 of 2/);
  assert.equal(interact(state, { phase: 'review', answers: { answer: 'developer' } }, events), true);
  const score = state.score;
  assert.equal(interact(state, null, events), false);
  assert.match(events.at(-1).text, /Complete the code badge is already earned/);
  assert.equal(state.score, score);
  state.player.x = -500;
  assert.equal(interact(state, null, events), false);
  assert.match(events.at(-1).text, /No workstation in range/);
});

test('one trivia answer does not count as a badge or open the end gate', () => {
  const state = createState('marco', CAMPAIGN[0]);
  state.player.x = state.world.goal.x;
  let objective = missionObjective(state);
  assert.equal(objective.summary, '0 / 3 trivia badges earned. Next: AI or automation? (Campus Courtyard), left.');
  atStation(state, 'brief');
  interact(state, { phase: 'request', answers: { answer: 'spam' } }, []);
  assert.equal(missionObjective(state).completed, 0);
  assert.equal(missionReady(state), false);
  interact(state, { phase: 'review', answers: { answer: 'generate' } }, []);
  state.player.x = state.world.goal.x;
  objective = missionObjective(state);
  assert.equal(objective.completed, 1);
  assert.equal(objective.target.key, 'workbook');
  assert.equal(objective.direction, 'left');
  finishWork(state, 'workbook'); finishWork(state, 'deck');
  assert.equal(missionObjective(state).summary, '3 / 3 trivia badges earned. Boss gate open.');
});

test('the clue, checkpoint result, and badge remain distinct during trivia', () => {
  const state = createState('marco', CAMPAIGN[0]);
  const station = atStation(state, 'workbook');
  const source = JSON.stringify(station.workflow);
  interact(state, { phase: 'request', answers: { answer: 'piece' } }, []);
  state.player.x = 0;
  updateMission(state, {}, 20, []);
  assert.equal(stationStatus(state, station), 'Question 2 ready');
  atStation(state, 'workbook');
  interact(state, { phase: 'review', answers: { answer: 'ground' } }, []);
  state.missionProgress.jobs[station.id].artifact.rows[0][1] = 'local-copy';
  assert.equal(JSON.stringify(station.workflow), source);
  assert.match(stationLabel(state, station), /Tokens and context/);
});

test('Foundry rollout trivia teaches pilot containment', () => {
  const state = createState('marco', CAMPAIGN[3]);
  const station = atStation(state, 'rollout');
  interact(state, { phase: 'request', answers: { answer: 'limit' } }, []);
  assert.equal(interact(state, { phase: 'review', answers: { answer: 'scale' } }, []), false);
  assert.equal(state.missionProgress.jobs[station.id].artifact, undefined);
  assert.equal(interact(state, { phase: 'review', answers: { answer: 'rollback' } }, []), true);
  assert.deepEqual(state.missionProgress.jobs[station.id].artifact.rows[0], ['2 / 2 correct', 'responsible deployment']);
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
  const station = finishWork(state, 'handoff');
  const score = state.score;
  state.player.y = 900;
  update(state, {}, 1 / 60);
  assert.equal(state.missionProgress.jobs[station.id], undefined);
  assert.equal(state.boss.health, state.boss.maxHealth);
  finishWork(state, 'handoff');
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
      finishWork(state, station.key);
      assert.equal(state.missionProgress.jobs[station.id].status, 'complete');
    }
    assert.equal(missionReady(state), true);
    state.stage = 'boss'; state.boss = createBoss(state.arena);
    for (const station of state.arena.stations) {
      finishWork(state, station.key);
    }
    updateMission(state, {}, .1, []);
    assert.equal(missionReady(state), true);
    assert.equal(state.boss.objectivesLocked, false);
  }
});

test('each campaign world has its own finite musical arrangement', () => {
  const scores = CAMPAIGN.map(mission => Array.from({ length: 16 }, (_, index) => worldMusicStep(index, mission.theme)));
  assert.equal(new Set(scores.map(score => JSON.stringify(score))).size, 8);
  assert.ok(scores.flat(2).every(event => (event.midi === null || Number.isFinite(event.midi)) && event.gain > 0 && event.gain <= .3));
});
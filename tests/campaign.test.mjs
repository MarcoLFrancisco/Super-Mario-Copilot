import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, update } from '../src/engine.js';
import { LEVEL, PHYSICS } from '../src/level.js';
import { ARENA } from '../src/encounters.js';
import { CAMPAIGN, createCampaign, updateCampaign, advanceCampaign, selectLevel, selectInterlude, nextDestination, saveCampaign, pauseCampaign, retryLevel } from '../src/campaign.js';
import { INTERLUDES } from '../src/arcade.js';
import { createBoss, hitBoss, updateBoss } from '../src/boss.js';
import { worldMusicStep } from '../src/music.js';
import { interact, updateMission, missionReady, missionStations, stationStatus, stationLabel, missionObjective } from '../src/missions.js';
import { submitWork, workView, prepareQuiz, validateQuiz, validQuizOverrides } from '../src/trivia-tasks.js';
import { WORK_TASKS } from '../src/quiz-catalog.js';

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

test('the Setup Wizard telegraphs responsive attacks and always leaves a punish window', () => {
  const arena = CAMPAIGN[0].arena;
  assert.equal(arena.behavior, 'showman');
  assert.deepEqual(arena.phases.map(phase => phase.healthAbove), [8, 4, 0]);
  const boss = createBoss(arena);
  const combat = { health: 3, grace: 0, protection: 0, shots: [], enemies: [] };
  const player = { x: boss.x - 90, y: 584, vx: 0, vy: 0, grounded: true };
  const events = [];

  boss.timer = 0;
  updateBoss(boss, combat, player, 1 / 60, events);
  assert.equal(boss.attackType, 'slam');
  boss.mode = 'exposed'; boss.timer = 0; player.x = 80;
  updateBoss(boss, combat, player, 1 / 60, events);
  assert.equal(boss.attackType, 'volley');

  player.x = boss.x - 330;
  boss.attackHistory = ['charge', 'charge']; boss.mode = 'exposed'; boss.timer = 0;
  updateBoss(boss, combat, player, 1 / 60, events);
  assert.notEqual(boss.attackType, 'charge');

  boss.attackType = 'charge'; boss.chargeDirection = 1; boss.mode = 'attack'; boss.timer = 1;
  boss.x = arena.width - boss.w - 36;
  updateBoss(boss, combat, player, 1 / 60, events);
  assert.equal(boss.mode, 'exposed');
  assert.ok(events.some(event => event.type === 'bossDialogue' && event.key === 'chargeMiss'));

  boss.dialogue.current = null; boss.dialogue.cooldown = 0;
  boss.attackType = 'overload'; boss.mode = 'attack'; boss.interruptible = true;
  boss.grace = 0; boss.health = boss.maxHealth;
  combat.shots.push({ owner: 'player', x: boss.x + 20, y: boss.y + 20,
    w: 12, h: 12, damage: 1, life: 1 });
  hitBoss(boss, combat, events);
  assert.equal(boss.mode, 'exposed');
  assert.ok(events.some(event => event.type === 'bossDialogue' && event.key === 'shieldBreak'));

  boss.health = 1; boss.mode = 'exposed'; boss.interruptible = false; boss.grace = 0;
  combat.enemies.push({ dead: false });
  combat.shots.push({ owner: 'player', x: boss.x + 20, y: boss.y + 20,
    w: 12, h: 12, damage: 1, life: 1 });
  hitBoss(boss, combat, events);
  assert.equal(boss.mode, 'defeated');
  assert.equal(combat.shots.length, 0);
  assert.equal(combat.enemies.length, 0);
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

test('themed upper paths add climbing without replacing original jumping platforms', () => {
  const routes = new Set();
  for (const mission of CAMPAIGN.filter(item => item.type === 'platform')) {
    assert.deepEqual(mission.world.mainRoute.map(platform => [platform.x, platform.y, platform.w]), mission.route);
    assert.equal(mission.world.platforms.filter(platform => platform.id.startsWith(`${mission.id}-upper-`)).length, mission.upper.length);
    assert.ok(mission.world.climbs.length >= 3);
    assert.ok(mission.world.platforms.some(platform => platform.structure));
    routes.add(mission.world.traversal);
    for (const climb of mission.world.climbs) {
      assert.ok(climb.bottom > climb.top);
      for (const height of [climb.top, climb.bottom]) {
        assert.ok(mission.world.platforms.some(platform => platform.y === height
          && climb.x > platform.x && climb.x < platform.x + platform.w), `${mission.id}: climb endpoint must meet a platform`);
      }
    }
  }
  assert.equal(routes.size, 7);
});

function atStation(state, key) {
  const station = missionStations(state).find(item => item.key === key);
  if (state.mode === 'orbit') return station;
  state.player.x = station.x - PHYSICS.playerWidth / 2;
  state.player.y = station.y - PHYSICS.playerHeight;
  state.player.vx = 0; state.player.vy = 0; state.player.grounded = true;
  return station;
}

function finishWork(state, key, events = []) {
  const station = atStation(state, key);
  for (const [questionIndex, question] of station.workflow.questions.entries()) {
    const submission = { stationId: station.id, questionIndex, attempt: state.missionProgress.jobs[station.id]?.attempt ?? 0 };
    if (!state.missionProgress.jobs[station.id]?.responses?.[questionIndex]) {
      assert.equal(interact(state, { ...submission, action: 'check', answer: question.correctOption }, events), true);
    }
    if ((state.missionProgress.jobs[station.id]?.questionIndex ?? 0) === questionIndex) {
      assert.equal(interact(state, { ...submission, action: 'next' }, events), true);
    }
  }
  return station;
}

test('scored quizzes check each answer once and wait for Next before advancing', () => {
  const questions = Array.from({ length: 3 }, (_, index) => ({ question: `Question ${index + 1}?`,
    options: [{ id: 'correct', text: 'Correct choice' }, { id: 'other', text: 'Other choice' },
      { id: 'another', text: 'Another choice' }], correctOption: 'correct',
    explanation: 'This is the explanation.' }));
  const station = { workflow: { title: 'Product quiz', questions } };
  const job = {};
  prepareQuiz(station, job, () => 0);
  const order = structuredClone(job.optionOrder);
  assert.deepEqual(workView(station, job).options.map(option => option.id), ['other', 'another', 'correct']);
  assert.equal(submitWork(station, job, { action: 'next', questionIndex: 0, attempt: 0 }).accepted, false);
  for (const [questionIndex, answer] of ['correct', 'other', 'correct'].entries()) {
    const choice = { action: 'check', questionIndex, answer, attempt: 0 };
    assert.equal(submitWork(station, job, { ...choice, answer: 'missing' }).accepted, false);
    assert.equal(submitWork(station, job, { ...choice, questionIndex: questionIndex + 1 }).accepted, false);
    assert.equal(submitWork(station, job, choice).accepted, true);
    const view = workView(station, job);
    assert.equal(view.phase, 'feedback');
    assert.equal(view.questionIndex, questionIndex);
    assert.equal(view.response.correct, answer === 'correct');
    assert.match(job.feedback, /This is the explanation/);
    assert.match(job.feedback, /Correct answer: Correct choice/);
    assert.equal(submitWork(station, job, { ...choice, answer: 'correct' }).accepted, false);
    assert.deepEqual(job.optionOrder, order);
    assert.equal(job.responses.length, questionIndex + 1);
    assert.equal(job.artifact, undefined);
    const next = submitWork(station, job, { action: 'next', questionIndex, attempt: 0 });
    assert.equal(next.accepted, true);
    assert.equal(Boolean(next.complete), questionIndex === 2);
  }
  assert.equal(workView(station, job).phase, 'complete');
  assert.deepEqual(job.artifact, { title: 'Product quiz badge', score: 2, total: 3 });
  assert.equal(submitWork(station, job, { action: 'check', questionIndex: 2, answer: 'correct', attempt: 0 }).accepted, false);
  assert.equal(workView(station, job).score, 2);
  assert.equal(submitWork(station, job, { action: 'retry', attempt: 0 }).accepted, true);
  assert.equal(job.completed, true);
  assert.equal(workView(station, job).score, 0);
  assert.equal(workView(station, job).phase, 'question');
  assert.equal(submitWork(station, job, { action: 'check', questionIndex: 0, answer: 'correct', attempt: 0 }).accepted, false);
  assert.equal(submitWork(station, job, { action: 'check', questionIndex: 0, answer: 'correct', attempt: 1 }).accepted, true);
});

test('scored quizzes only award a checkpoint after the final explanation', () => {
  const station = { key: 'quiz', id: 'test-quiz', title: 'Product quiz', x: 510, y: 610,
    workflow: { title: 'Product quiz', questions: [{ question: 'Which product?',
      options: [{ id: 'copilot', text: 'Copilot' }, { id: 'other', text: 'Other' }, { id: 'another', text: 'Another' }],
      correctOption: 'copilot', explanation: 'Copilot helps with work.' }] } };
  const state = createState('marco', { ...CAMPAIGN[0], world: { ...CAMPAIGN[0].world, stations: [station] } });
  atStation(state, 'quiz');
  assert.equal(interact(state, { action: 'check', questionIndex: 0, answer: 'other', attempt: 0 }, []), true);
  assert.equal(state.score, 0);
  assert.equal(missionReady(state), false);
  assert.equal(interact(state, { action: 'next', questionIndex: 0, attempt: 0 }, []), true);
  assert.equal(missionReady(state), true);
  assert.equal(state.score, 250);
  assert.equal(state.missionProgress.jobs[station.id].artifact.score, 0);
  assert.equal(interact(state, { action: 'next', questionIndex: 0, attempt: 0 }, []), false);
  assert.equal(state.score, 250);
  assert.equal(interact(state, { action: 'retry', attempt: 0 }, []), true);
  assert.equal(missionReady(state), true);
  assert.equal(interact(state, { action: 'check', questionIndex: 0, answer: 'copilot', attempt: 1 }, []), true);
  assert.equal(interact(state, { action: 'next', questionIndex: 0, attempt: 1 }, []), true);
  assert.equal(state.score, 250);
});

test('orbit trivia gates sectors one, three and five and survives a wave retry', () => {
  const campaign = createCampaign('marco', { unlocked: 6, current: 6 });
  const state = campaign.run;
  assert.equal(missionStations(state).length, 3);
  assert.match(missionObjective(state).summary, /0 \/ 3 quizzes complete/);
  for (const [wave, key] of [[0, 'speech'], [2, 'documents'], [4, 'security']]) {
    state.wave = wave; state.phase = 'ready';
    for (const ball of state.balls) { ball.attached = true; ball.body.setActive(false); }
    assert.equal(interact(state, { action: 'check', questionIndex: 0, attempt: 0, stationId: 'orbit-security', answer: 'vault' }, []), wave === 4);
    const events = updateCampaign(campaign, { jumpPressed: true }, 1 / 60);
    assert.equal(events[0].type, 'quizRequired');
    assert.equal(state.phase, 'ready');
    finishWork(state, key);
    updateCampaign(campaign, { jumpPressed: true }, 1 / 60);
    assert.equal(state.phase, 'playing');
  }
  assert.equal(missionReady(state), true);
  assert.equal(state.score, 750);
  state.status = 'failed';
  retryLevel(campaign);
  assert.equal(campaign.run.wave, 4);
  assert.equal(missionReady(campaign.run), true);
  assert.equal(campaign.run.score, 750);
  assert.notEqual(campaign.run.missionProgress, state.missionProgress);
});

test('each level has exactly three product quizzes and bosses add no duplicate questions', () => {
  let questions = 0;
  for (const mission of CAMPAIGN) {
    const stations = mission.type === 'orbit' ? mission.stations : mission.world.stations;
    assert.equal(stations.length, 3);
    for (const station of stations) {
      assert.equal(station.workflow.level, mission.id);
      assert.equal(station.workflow.questions.length, 3);
      questions += station.workflow.questions.length;
    }
    if (mission.arena) assert.equal(mission.arena.stations.length, 0);
  }
  assert.equal(questions, 72);
});

test('the product catalog preserves the supplied answers and editor metadata', () => {
  const expected = [
    'work,outlook,powerpoint,context,work,permissions,pages,references,history',
    'development,completion,chat,tasks,pr,guidance,feedback,tests,secrets',
    'tasks,briefing,actions,researcher,analyst,trends,researcher,pages,notebooks',
    'catalog,prompts,multiple,search,sources,vectors,sources,question,examples',
    'studio,information,flow,capability,service,automate,agents,interpreter,function',
    'summary,actions,content,text,highlights,transcript,files,policies,permissions',
    'speech,audio,translator,documents,language,text,vault,identity,endpoint',
    'safety,injection,different,purview,protection,sharing,entra,actions,policy'
  ];
  const ids = new Set();
  for (const [index, quizzes] of Object.values(WORK_TASKS).entries()) {
    assert.deepEqual(quizzes.flatMap(quiz => quiz.questions.map(question => question.correctOption)), expected[index].split(','));
    for (const quiz of quizzes) {
      assert.equal(validateQuiz(quiz), null, quiz.title);
      for (const question of quiz.questions) {
        assert.equal(ids.has(question.id), false);
        ids.add(question.id);
        assert.ok(question.explanation);
        assert.ok(Object.hasOwn(question, 'lastVerified'));
      }
    }
  }
  assert.equal(ids.size, 72);
});

test('Work IQ and Cowork questions retain verified official documentation', () => {
  for (const quiz of [WORK_TASKS.campus[1], WORK_TASKS.cowork[0]]) {
    for (const question of quiz.questions) {
      assert.equal(new URL(question.referenceUrl).hostname, 'learn.microsoft.com');
      assert.equal(question.lastVerified, '2026-09-19');
    }
  }
  assert.equal(WORK_TASKS.campus[1].questions[2].correctOption, 'permissions');
});

test('every product quiz produces three explanations and an accurate score', () => {
  for (const quizzes of Object.values(WORK_TASKS)) for (const quiz of quizzes) {
    const job = {};
    const station = { workflow: quiz };
    for (const [questionIndex, question] of quiz.questions.entries()) {
      const answer = questionIndex === 1 ? question.options.find(option => option.id !== question.correctOption).id : question.correctOption;
      const submission = { questionIndex, attempt: 0 };
      assert.equal(submitWork(station, job, { ...submission, action: 'check', answer }).accepted, true);
      assert.ok(job.feedback.includes(question.explanation));
      assert.equal(workView(station, job).phase, 'feedback');
      const next = submitWork(station, job, { ...submission, action: 'next' });
      assert.equal(next.accepted, true);
      assert.equal(Boolean(next.complete), questionIndex === 2);
    }
    assert.equal(job.artifact.score, 2);
    assert.equal(job.artifact.total, 3);
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
      assert.equal(state.missionProgress.jobs[station.id].artifact.title, `${station.title} badge`);
    }
  }
});

test('level-two trivia, repeated submission, completion, and out-of-range inputs provide immediate feedback', () => {
  const state = createState('marco', CAMPAIGN[1]);
  const station = atStation(state, 'assistant');
  const events = [];
  const request = { action: 'check', questionIndex: 0, attempt: 0, answer: 'development' };
  assert.equal(interact(state, request, events), true);
  assert.equal(stationStatus(state, station), 'Question 1 of 3');
  assert.equal(interact(state, request, events), false);
  assert.match(events.at(-1).text, /Answer already checked/);
  finishWork(state, station.key, events);
  const score = state.score;
  assert.equal(interact(state, null, events), false);
  assert.equal(state.score, score);
  state.player.x = -500;
  assert.equal(interact(state, null, events), false);
  assert.match(events.at(-1).text, /No workstation in range/);
});

test('one trivia answer does not count as a badge or open the end gate', () => {
  const state = createState('marco', CAMPAIGN[0]);
  state.player.x = state.world.goal.x;
  let objective = missionObjective(state);
  assert.equal(objective.summary, '0 / 3 trivia badges earned. Next: Meet Copilot (Campus Courtyard), left.');
  atStation(state, 'copilot');
  interact(state, { action: 'check', questionIndex: 0, attempt: 0, answer: 'work' }, []);
  assert.equal(missionObjective(state).completed, 0);
  assert.equal(missionReady(state), false);
  finishWork(state, 'copilot');
  state.player.x = state.world.goal.x;
  objective = missionObjective(state);
  assert.equal(objective.completed, 1);
  assert.equal(objective.target.key, 'work-iq');
  assert.equal(objective.direction, 'left');
  finishWork(state, 'work-iq'); finishWork(state, 'beyond-chat');
  assert.equal(missionObjective(state).summary, '3 / 3 trivia badges earned. Boss gate open.');
});

test('quiz responses survive closing the checkpoint and never mutate the catalog', () => {
  const state = createState('marco', CAMPAIGN[0]);
  const station = atStation(state, 'work-iq');
  const source = JSON.stringify(station.workflow);
  interact(state, { action: 'check', questionIndex: 0, attempt: 0, answer: 'context' }, []);
  state.player.x = 0;
  updateMission(state, {}, 20, []);
  assert.equal(stationStatus(state, station), 'Question 1 of 3');
  finishWork(state, 'work-iq');
  state.missionProgress.jobs[station.id].responses[0].answer = 'local-copy';
  assert.equal(JSON.stringify(station.workflow), source);
  assert.match(stationLabel(state, station), /Discover Work IQ/);
});

test('editor data rejects malformed quizzes and only affects newly started runs', () => {
  const base = WORK_TASKS.campus[0];
  const edited = structuredClone(base);
  edited.title = 'Custom product quiz';
  edited.questions[0].explanation = '';
  edited.questions[0].lastVerified = null;
  assert.equal(validateQuiz(edited), null);
  for (const mutate of [
    quiz => { quiz.level = '__proto__'; },
    quiz => { quiz.questions.pop(); },
    quiz => { quiz.questions[0].options.pop(); },
    quiz => { quiz.questions[0].correctOption = 'unknown'; },
    quiz => { quiz.questions[0].referenceUrl = 'javascript:alert(1)'; },
    quiz => { quiz.questions[0].referenceUrl = 'https://microsoft.com.example.org/'; },
    quiz => { quiz.questions[0].lastVerified = '2026-02-30'; }
  ]) {
    const invalid = structuredClone(base); mutate(invalid);
    assert.ok(validateQuiz(invalid));
    assert.deepEqual(validQuizOverrides({ 'campus-copilot': invalid }), {});
  }
  const campaign = createCampaign('marco', {}, { 'campus-copilot': edited });
  assert.equal(missionStations(campaign.run)[0].title, 'Custom product quiz');
  campaign.quizOverrides['campus-copilot'].title = 'Next run title';
  assert.equal(missionStations(campaign.run)[0].title, 'Custom product quiz');
  retryLevel(campaign);
  assert.equal(missionStations(campaign.run)[0].title, 'Next run title');
  assert.equal(CAMPAIGN[0].world.stations[0].title, 'Meet Copilot');
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
      if (INTERLUDES[CAMPAIGN[index].id]) {
        assert.equal(campaign.run.mode, 'arcade');
        assert.equal(campaign.run.pilot, 'mario');
        assert.equal(campaign.levelIndex, index);
        campaign.run.status = 'complete';
        assert.ok(updateCampaign(campaign, {}, 1 / 60).some(event => event.type === 'arcadeComplete'));
        assert.equal(advanceCampaign(campaign), true);
      }
    }
  }
  assert.equal(campaign.completed.size, 8);
  assert.equal(advanceCampaign(campaign), false);
});

test('retired racing interludes are skipped without losing saved campaign progress', () => {
  assert.deepEqual(Object.keys(INTERLUDES), ['github', 'cowork', 'agents', 'teams']);
  for (const [current, interlude, next] of [[0, 'coast-run', 'github'], [3, 'cloud-circuit', 'agents']]) {
    const campaign = createCampaign('mario', { unlocked: current + 1, current, interlude,
      blaster: true, recruits: ['marco', 'donkey'], completed: [CAMPAIGN[current].id],
      scores: { [CAMPAIGN[current].id]: 2400 } });
    assert.equal(campaign.levelIndex, current + 1);
    assert.equal(campaign.run.mission.id, next);
    assert.equal(campaign.interlude, null);
    assert.equal(campaign.run.party.leader, 'mario');
    assert.equal(campaign.run.combat.blaster, true);
    assert.deepEqual([...campaign.recruits], ['marco', 'donkey']);
    assert.ok(campaign.completed.has(CAMPAIGN[current].id));
    assert.equal(campaign.scores[CAMPAIGN[current].id], 2400);
    assert.equal(selectInterlude(campaign, current), false);
    selectLevel(campaign, current);
    assert.equal(nextDestination(campaign).id, next);
    campaign.run.status = 'complete'; campaign.recorded = true;
    assert.equal(advanceCampaign(campaign), true);
    assert.equal(campaign.run.mission.id, next);
    const locked = createCampaign('marco', { current, unlocked: current, interlude });
    assert.equal(locked.levelIndex, current);
  }
});

test('arcade interludes save independently, replay safely, and allow continuing after a failed round', () => {
  const campaign = createCampaign('donkey', { unlocked: 4, current: 1, blaster: true, recruits: ['marco'] });
  assert.equal(selectInterlude(campaign, 5), false);
  assert.equal(selectInterlude(campaign, 1), true);
  assert.equal(campaign.run.mission.title, 'AI Invaders');
  assert.equal(nextDestination(campaign).id, 'cowork');
  const restored = createCampaign('donkey', saveCampaign(campaign));
  assert.equal(restored.interlude, 'ai-invaders');
  assert.equal(restored.run.mode, 'arcade');
  pauseCampaign(restored, true);
  updateCampaign(restored, { fire: true }, .1);
  assert.equal(restored.run.time, 0);
  pauseCampaign(restored, false);
  restored.run.health = 0;
  assert.ok(updateCampaign(restored, {}, 1 / 60).some(event => event.type === 'failed'));
  retryLevel(restored);
  assert.equal(restored.run.health, 3);
  assert.equal(restored.run.pilot, 'donkey');
  restored.run.status = 'failed';
  assert.equal(advanceCampaign(restored), true);
  assert.equal(restored.levelIndex, 2);
  assert.equal(restored.run.party.leader, 'donkey');
  assert.equal(restored.run.combat.blaster, true);
  assert.ok(restored.run.party.unlocked.has('marco'));
  assert.equal(restored.completed.has('github'), false);
  assert.equal(restored.arcadeCompleted.size, 0);
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

test('boss retries keep the three world quizzes and do not add a bonus quiz', () => {
  const state = createState('marco', CAMPAIGN[0]);
  for (const station of state.world.stations) finishWork(state, station.key);
  state.player.x = state.world.goal.x; state.player.y = state.world.goal.y + state.world.goal.h - PHYSICS.playerHeight;
  update(state, {}, 1 / 60);
  assert.equal(state.stage, 'boss');
  assert.deepEqual(missionStations(state), []);
  const score = state.score;
  state.player.y = 900;
  update(state, {}, 1 / 60);
  for (const station of state.world.stations) assert.equal(state.missionProgress.jobs[station.id].completed, true);
  assert.equal(state.boss.health, state.boss.maxHealth);
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
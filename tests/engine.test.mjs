import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assetManifest } from '../scripts/build-assets.mjs';
import { createState as createOriginalState, setPaused, update } from '../src/engine.js';
import { CAMPAIGN } from '../src/campaign.js';
import { createBoss, SHOWMAN_MOVES } from '../src/boss.js';
import { drawCampaignBoss, drawClimb } from '../src/world-art.js';
import { actionForKey } from '../src/input.js';
import { drawPartyActor } from '../src/party-art.js';
import { characterMotion } from '../src/character.js';
import { bossDialogueLayout, drawBossDialogue, drawBossWarnings } from '../src/boss-art.js';
import { drawProjectile } from '../src/enemy-art.js';
import { loadWizardRig, wizardMatrices, wizardPose, wizardCrownY } from '../src/wizard-rig.js';
import { WIZARD_RIG } from '../images/Boss1-rig.js';
import { interactionFor } from '../src/missions.js';
import { workView, prepareQuiz, submitWork } from '../src/trivia-tasks.js';
import { renderQuiz } from '../src/quiz-ui.js';
import { createArcade, updateArcade, setArcadePaused, chooseArcadeUpgrade, activateArcadeTool } from '../src/arcade.js';
import { renderArcade, loadArcadeArt, drawInterceptor } from '../src/arcade-art.js';
import { ORBIT, createOrbit, updateOrbit, setOrbitPaused, reboundVelocity, ballPosition } from '../src/orbit.js';
import { APPS } from '../src/level.js';
import { renderOrbit } from '../src/orbit-art.js';
import { runTests as runPartyTests } from './party-tests.js';

const step = 1 / 120;
const LEVEL = CAMPAIGN[0].world;
const createState = () => createOriginalState('marco', CAMPAIGN[0]);
const robotAtlas = { naturalWidth: WIZARD_RIG.atlasSize[0], naturalHeight: WIZARD_RIG.atlasSize[1],
  set src(value) { this.url = value; queueMicrotask(() => this.onload()); } };
await loadWizardRig(() => robotAtlas);
const interceptorImage = { naturalWidth: 1024, naturalHeight: 1024,
  set src(value) { this.url = value; queueMicrotask(() => this.onload()); } };
await loadArcadeArt(() => interceptorImage);

function canvasRecorder(width = 1280) {
  const calls = [];
  const context = new Proxy({ canvas: { width, height: 720 } }, {
    set(target, key, value) {
      target[key] = value;
      if (key === 'fillStyle') calls.push([key, value]);
      return true;
    },
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return text => ({ width: text.length * Number(target.font?.match(/(\d+)px/)?.[1] ?? 17) * .53 });
      return (...args) => {
        assert.ok(args.filter(value => typeof value === 'number').every(Number.isFinite));
        calls.push([key, ...args]);
        if (String(key).includes('Gradient')) return { addColorStop() {} };
      };
    }
  });
  return { context, calls };
}

test('the Setup Wizard is a smaller grounded robot without the generic core overlay', () => {
  const mission = CAMPAIGN[0];
  const boss = createBoss(mission.arena);
  const floor = mission.arena.platforms.find(platform => platform.id === 'arena-floor');
  assert.deepEqual([boss.w, boss.h], [210, 244], 'The same robot artwork is scaled down for arena space');
  assert.equal(boss.y + boss.h, floor.y, 'Boots must meet the arena floor');
  const before = JSON.stringify(boss);
  const { context, calls } = canvasRecorder();
  drawCampaignBoss(context, boss, mission, true);
  assert.equal(JSON.stringify(boss), before);
  const draws = calls.filter(([name]) => name === 'drawImage');
  assert.equal(draws.length, WIZARD_RIG.layers.length);
  assert.equal(draws.length, 13);
  for (const [index, name] of WIZARD_RIG.drawOrder.entries()) {
    const layer = WIZARD_RIG.layers.find(item => item.name === name);
    assert.deepEqual(draws[index], ['drawImage', robotAtlas, ...layer.frame, ...layer.source]);
  }
  assert.ok(WIZARD_RIG.layers.every(layer => !/cube/i.test(layer.name)));
  assert.equal(calls.filter(([name]) => name === 'bezierCurveTo').length, 0);
  assert.ok(!calls.some(([name, x, y, width, height]) => name === 'strokeRect'
    && x === boss.x && y === boss.y && width === boss.w && height === boss.h));
});

test('Setup Wizard articulated layers preserve the supplied artwork and animate relative to each other', () => {
  const source = readFileSync(new URL('../images/Boss1.png', import.meta.url));
  const image = readFileSync(new URL('../images/Boss1-rig.png', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), WIZARD_RIG.sourceHash);
  assert.equal(image.readUInt32BE(16), WIZARD_RIG.atlasSize[0]);
  assert.equal(image.readUInt32BE(20), WIZARD_RIG.atlasSize[1]);
  assert.equal(image[25], 6, 'The cutout atlas has an alpha channel');
  assert.match(robotAtlas.url, /\/images\/Boss1-rig\.png$/);
  const boss = createBoss(CAMPAIGN[0].arena);
  Object.assign(boss, { mode: 'warning', attackType: 'slam', windup: 0, lookX: 0 });
  const rest = wizardMatrices(boss, true);
  for (const matrix of Object.values(rest)) matrix.forEach((value, index) => {
    assert.ok(Math.abs(value - [1, 0, 0, 1, 0, 0][index]) < 1e-8, 'The bind pose must retain source proportions');
  });
  boss.windup = 1;
  const raised = wizardMatrices(boss);
  assert.notDeepEqual(raised.leftFist, rest.leftFist);
  assert.notDeepEqual(raised.rightFist, rest.rightFist);
  assert.notDeepEqual(raised.leftFist, raised.torso);
  assert.notDeepEqual(raised.head, raised.leftArm);
  Object.assign(boss, { mode: 'attack', attackStep: 1, attackPulse: .4 });
  const impact = wizardPose(boss);
  assert.ok(impact.body.y >= 150, 'The slam crouches to bring the painted fists to the floor');
  assert.notDeepEqual(impact.leftFist, wizardPose({ ...boss, mode: 'warning', windup: 1 }).leftFist);
  boss.attackPulse = 0;
  Object.assign(boss, { mode: 'reposition', vx: 70, walkDistance: 35 });
  const walk = wizardPose(boss);
  assert.notDeepEqual(walk.leftLeg, walk.rightLeg);
  assert.notDeepEqual(walk.leftBoot, walk.rightBoot);
  boss.walkDistance += 40;
  assert.notDeepEqual(wizardPose(boss).leftBoot, walk.leftBoot);
  const forward = wizardMatrices({ ...boss, walkDistance: Math.PI / .16 }).leftBoot;
  const backward = wizardMatrices({ ...boss, walkDistance: 3 * Math.PI / .16 }).leftBoot;
  const footX = matrix => matrix[0] * 290 + matrix[2] * 925 + matrix[4];
  assert.ok(Math.abs(footX(forward) - footX(backward)) * WIZARD_RIG.scale > 30,
    'The boots must stride relative to the body, not just translate with the sprite');
  Object.assign(boss, { vx: 0, age: 1, dialogue: { current: { text: 'Are you buffering?' } } });
  const mouth = wizardPose(boss).mouth;
  boss.age += .1;
  assert.notDeepEqual(wizardPose(boss).mouth, mouth);
  const reduced = wizardPose(boss, true);
  boss.age += .3;
  assert.deepEqual(wizardPose(boss, true), reduced);
});

test('Setup Wizard poses, countdown warnings, and crown balloons render without changing state', () => {
  const mission = CAMPAIGN[0];
  const poses = new Set();
  for (const reducedMotion of [false, true]) for (const phase of [0, 1, 2]) {
    for (const attackType of Object.keys(SHOWMAN_MOVES)) {
      const boss = createBoss(mission.arena);
      Object.assign(boss, { age: 3.2, phase, attackType, mode: 'warning', windup: .85,
        warningDuration: 1.6, timer: .24, lockedAngle: 2.8,
        shotOrigin: { x: 828, y: 496 }, lockedTarget: { x: 500, y: 607 } });
      const before = JSON.stringify(boss);
      const { context, calls } = canvasRecorder();
      drawBossWarnings(context, boss);
      drawCampaignBoss(context, boss, mission, reducedMotion);
      assert.equal(JSON.stringify(boss), before);
      poses.add(JSON.stringify(calls));
    }
  }
  assert.ok(poses.size >= 20);
  const boss = createBoss(mission.arena);
  Object.assign(boss, { mode: 'attack', attackType: 'countdown', countdown: 2,
    interruptible: true, safeZone: { x: 70, y: 0, w: 240, h: 630 },
    zones: [{ x: 310, y: 0, w: 970, h: 630, active: false, kind: 'floor' }] });
  const { context, calls } = canvasRecorder();
  drawBossWarnings(context, boss);
  assert.ok(calls.some(([name, text]) => name === 'fillText' && text === '2'));
  assert.ok(calls.some(([name, text]) => name === 'fillText' && text === 'SAFE'));
  assert.ok(calls.some(([name, x, y, width, height]) => name === 'fillRect' && x === 310 && y === 150 && width === 970 && height === 480));
  boss.dialogue.current = { text: 'Please remain calm during your scheduled destruction.' };
  for (const position of [110, 500, 920]) {
    boss.x = position;
    const player = { x: position + 110, y: 178 };
    const bubble = bossDialogueLayout(context, boss, player);
    assert.ok(bubble.rows.length <= 2);
    assert.ok(bubble.x >= 16 && bubble.x + bubble.w <= 1264);
    assert.ok(bubble.y > 143 && bubble.y + bubble.h + 12 < wizardCrownY(boss));
    assert.ok(bubble.x + bubble.w <= player.x || bubble.x >= player.x + 34);
    drawBossDialogue(context, boss, player);
  }
  assert.ok(calls.some(([name, text]) => name === 'fillText' && text === 'THE SETUP WIZARD'));
  const defeatPoses = new Set();
  boss.defeated = true;
  for (const defeatTime of [0, .5, 1.8]) {
    boss.defeatTime = defeatTime;
    const recorder = canvasRecorder();
    drawCampaignBoss(recorder.context, boss, mission, false);
    defeatPoses.add(JSON.stringify(recorder.calls));
  }
  assert.equal(defeatPoses.size, 3);
  boss.mode = 'fleeing'; boss.vx = 450; boss.walkDistance = 12;
  const retreat = wizardPose(boss);
  boss.walkDistance += 20;
  const nextStep = wizardPose(boss);
  assert.notDeepEqual(retreat.leftLeg, nextStep.leftLeg);
  assert.notDeepEqual(retreat.rightArm, nextStep.rightArm);
  assert.ok(Math.abs(retreat.body.angle) >= .1);
  const projectile = canvasRecorder();
  drawProjectile(projectile.context, { owner: 'enemy', kind: 'token', style: 'wizard', x: 300, y: 500, w: 16, h: 16, life: 1 });
  assert.ok(projectile.calls.some(([name]) => name === 'lineTo'));
  assert.ok(!projectile.calls.some(([name]) => name === 'fillText'));
});

function jumpHeight(held) {
  const state = createState();
  const startY = state.player.y;
  update(state, { jumpPressed: true, jumpHeld: held }, step);
  let highestY = state.player.y;
  for (let frame = 0; frame < 120 && state.player.vy < 0; frame += 1) {
    update(state, { jumpHeld: held }, step);
    highestY = Math.min(highestY, state.player.y);
  }
  return startY - highestY;
}

test('Up and Down arrows climb nearby ladders and ropes without replacing normal jumping', () => {
  const bindings = { jump: 'Space', climbUp: 'KeyR', climbDown: 'KeyV' };
  for (const mission of [CAMPAIGN[0], CAMPAIGN[1]]) {
    const state = createOriginalState('marco', mission);
    const climb = state.world.climbs[0];
    Object.assign(state.player, { x: climb.x - 17, y: climb.bottom - 46, grounded: true });
    const before = state.player.y;
    assert.equal(actionForKey('ArrowUp', bindings, state.player, state.world), 'climbUp');
    assert.equal(actionForKey('ArrowDown', bindings, state.player, state.world), 'climbDown');
    for (let frame = 0; frame < 20; frame += 1) update(state, { up: true }, 1 / 120);
    assert.ok(state.player.y < before);
    const elevated = state.player.y;
    for (let frame = 0; frame < 10; frame += 1) update(state, { down: true }, 1 / 120);
    assert.ok(state.player.y > elevated);
    assert.equal(actionForKey('Space', bindings, state.player, state.world), 'jump');
    assert.equal(actionForKey('KeyW', bindings, state.player, state.world), 'jump');
    assert.ok(update(state, { jumpPressed: true, jumpHeld: true }, 1 / 120));
    assert.equal(state.player.climbing, null);
    state.player.x = 0;
    assert.equal(actionForKey('ArrowUp', bindings, state.player, state.world), 'jump');
    assert.equal(actionForKey('ArrowUp', { attack: 'ArrowUp' }, state.player, state.world), 'attack');
  }
});

test('ropes and ladders render detailed strands, rungs, and anchors with finite geometry', () => {
  for (const kind of ['rope', 'ladder']) {
    const climb = { kind, x: 414, top: 290, bottom: 610, width: 42 };
    const before = JSON.stringify(climb);
    const { context, calls } = canvasRecorder();
    drawClimb(context, climb);
    assert.equal(JSON.stringify(climb), before);
    assert.ok(calls.length > 100);
    assert.ok(calls.filter(([name]) => name === (kind === 'rope' ? 'bezierCurveTo' : 'roundRect')).length >= 16);
  }
});

test('original characters visibly step and climb with reduced motion instead of hovering', () => {
  for (const id of ['marco', 'mario', 'donkey']) for (const reduced of [true, false]) {
    const actor = { id, x: 40, y: 400, vx: 240, vy: 0, grounded: true, facing: 1, walkDistance: 9, climbDistance: 0 };
    const draw = () => {
      const before = JSON.stringify(actor);
      const { context, calls } = canvasRecorder();
      drawPartyActor(context, actor, 0, reduced);
      assert.equal(JSON.stringify(actor), before);
      return calls;
    };
    const first = draw();
    const motion = characterMotion(actor);
    assert.notEqual(motion.backLift, motion.frontLift);
    actor.walkDistance += 30;
    assert.notDeepEqual(draw(), first, `${id}: feet must change with traveled distance`);
    actor.climbing = 'ladder'; actor.grounded = false; actor.vx = 0; actor.vy = -200;
    const reaching = draw();
    actor.climbDistance += 15;
    assert.notDeepEqual(draw(), reaching, `${id}: alternate limb positions during climbing`);
    actor.climbing = null; actor.grounded = true; actor.vx = 0;
    assert.equal(characterMotion(actor).stride, 0);
  }
  const state = createState();
  for (let frame = 0; frame < 35; frame += 1) update(state, { right: true }, 1 / 120);
  assert.ok(state.player.walkDistance > 10);
  assert.equal(state.party.actors.marco.walkDistance, state.player.walkDistance);
  setPaused(state, true);
  const distance = state.player.walkDistance;
  update(state, { right: true }, 1);
  assert.equal(state.player.walkDistance, distance);
});

test('holding jump rises higher than tapping without changing the full jump', () => {
  const fullHeight = jumpHeight(true);
  const tapHeight = jumpHeight(false);
  assert.ok(fullHeight > 125 && fullHeight < 140);
  assert.ok(tapHeight > 25 && tapHeight < 45);
  assert.equal(jumpHeight(undefined), fullHeight);
});

test('jumping shortly after leaving an edge uses coyote time', () => {
  const state = createState();
  state.player.x = LEVEL.mainRoute[0].w + 1;
  for (let frame = 0; frame < 8; frame += 1) update(state, {}, step);
  assert.equal(state.player.grounded, false);
  const events = update(state, { jumpPressed: true, jumpHeld: true }, step);
  assert.equal(events.filter(event => event.type === 'jump').length, 1);
  assert.ok(state.player.vy < 0);
});

test('an expired edge grace period cannot be used as an air jump', () => {
  const state = createState();
  state.player.x = LEVEL.mainRoute[0].w + 1;
  for (let frame = 0; frame < 20; frame += 1) update(state, {}, step);
  const events = update(state, { jumpPressed: true, jumpHeld: true }, step);
  assert.equal(events.some(event => event.type === 'jump'), false);
  assert.ok(state.player.vy > 0);
});

test('a jump pressed just before landing is buffered', () => {
  const state = createState();
  Object.assign(state.player, { y: 535, vy: 250, grounded: false, coyote: 0 });
  const events = update(state, { jumpPressed: true, jumpHeld: true }, step);
  for (let frame = 0; frame < 12; frame += 1) {
    events.push(...update(state, { jumpHeld: true }, step));
  }
  assert.equal(events.filter(event => event.type === 'jump').length, 1);
  assert.ok(state.player.vy < 0);
});

test('pausing discards pending actions and freezes simulation', () => {
  const state = createState();
  update(state, { jumpPressed: true }, 0);
  setPaused(state, true);
  const before = { ...state.player };
  assert.deepEqual(update(state, { right: true }, .1), []);
  assert.deepEqual(state.player, before);
  setPaused(state, false);
  assert.equal(update(state, {}, step).some(event => event.type === 'jump'), false);
});

test('trivia submissions require proximity and checking all three questions', () => {
  const state = createState();
  const station = LEVEL.stations[0];
  update(state, { interactPressed: true }, step);
  assert.equal(state.missionProgress.jobs[station.id], undefined);
  state.player.x = station.x;
  assert.equal(interactionFor(state), station);
  const events = [];
  for (const [questionIndex, question] of station.workflow.questions.entries()) {
    update(state, { choice: { action: 'check', questionIndex, attempt: 0, answer: question.correctOption } }, step);
    assert.equal(state.missionProgress.jobs[station.id].status, 'feedback');
    events.push(...update(state, { choice: { action: 'next', questionIndex, attempt: 0 } }, step));
  }
  assert.equal(events.some(event => event.type === 'missionTask'), true);
  assert.equal(state.missionProgress.jobs[station.id].status, 'complete');
  const score = state.score;
  update(state, { interactPressed: true }, step);
  assert.equal(state.score, score);
});

test('earned trivia badges survive a fall with original character and health restored', () => {
  const state = createState();
  const station = LEVEL.stations[0];
  state.player.x = station.x;
  for (const [questionIndex, question] of station.workflow.questions.entries()) {
    update(state, { choice: { action: 'check', questionIndex, attempt: 0, answer: question.correctOption } }, step);
    update(state, { choice: { action: 'next', questionIndex, attempt: 0 } }, step);
  }
  state.checkpointIndex = 3;
  state.combat.health = 1;
  state.player.y = LEVEL.deathY + 10;
  update(state, {}, step);
  assert.equal(state.deaths, 1);
  assert.equal(state.player.x, LEVEL.checkpoints[3].spawn.x);
  assert.equal(state.combat.health, 3);
  assert.equal(state.party.leader, 'marco');
  assert.equal(state.missionProgress.jobs[station.id].status, 'complete');
  assert.equal(state.missionProgress.jobs[station.id].artifact.title, 'Meet Copilot badge');
});

test('the quiz player renders single-select cards, feedback, Next and scored retry controls without a browser', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const quizMarkup = html.match(/<dialog id="task-dialog"[\s\S]*?<\/dialog>/)[0];
  assert.doesNotMatch(quizMarkup, /<table\b|work-evidence|work-sources|work-output/);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const makeNode = tagName => ({ tagName, dataset: {}, children: [], listeners: {}, textContent: '',
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    addEventListener(name, listener) { this.listeners[name] = listener; } });
  const nodes = new Map();
  const document = { createElement: makeNode, getElementById(id) {
    assert.ok(ids.has(id), `Missing HTML element: ${id}`);
    if (!nodes.has(id)) nodes.set(id, makeNode('div'));
    return nodes.get(id);
  } };
  const station = LEVEL.stations[0];
  const job = {};
  prepareQuiz(station, job, () => 0);
  const render = () => renderQuiz(document, workView(station, job), 'Copilot Campus', job.feedback);
  render();
  const choices = nodes.get('task-choices');
  assert.equal(choices.children.length, 3);
  assert.deepEqual(choices.children.map(label => label.dataset.tone), ['mint', 'sky', 'coral']);
  assert.deepEqual(choices.children.map(label => label.children[1].textContent), ['A', 'B', 'C']);
  assert.equal(choices.disabled, false);
  assert.equal(nodes.get('work-phase').textContent, 'Question 1 of 3');
  assert.equal(nodes.get('task-confirm').disabled, true);
  const inputs = choices.children.map(label => label.children[0]);
  for (const input of inputs) {
    assert.equal(input.type, 'radio'); assert.equal(input.name, 'answer'); assert.equal(input.required, true);
  }
  assert.deepEqual(inputs.map(input => input.value), job.optionOrder[0]);
  assert.ok(inputs.every(input => input.className === 'sr-only'));
  inputs[0].listeners.change();
  assert.equal(nodes.get('task-confirm').disabled, false);
  for (const [questionIndex, question] of station.workflow.questions.entries()) {
    const answer = questionIndex === 0 ? 'hardware' : question.correctOption;
    submitWork(station, job, { action: 'check', questionIndex, attempt: 0, answer }); render();
    assert.equal(choices.disabled, true);
    assert.equal(nodes.get('task-confirm').hidden, true);
    assert.equal(nodes.get('task-next').hidden, false);
    assert.equal(nodes.get('task-feedback').hidden, false);
    assert.equal(choices.children.filter(label => label.dataset.result === 'correct').length, 1);
    assert.equal(choices.children.filter(label => label.children[0].checked).length, 1);
    assert.equal(nodes.get('task-next-label').textContent, questionIndex === 2 ? 'See score' : 'Next question');
    submitWork(station, job, { action: 'next', questionIndex, attempt: 0 }); render();
  }
  assert.equal(nodes.get('quiz-score').textContent, '2 / 3');
  assert.equal(nodes.get('quiz-result').hidden, false);
  assert.equal(nodes.get('task-retry').hidden, false);
  assert.equal(nodes.get('task-done').hidden, false);
  assert.equal(nodes.get('task-next').hidden, true);
  submitWork(station, job, { action: 'retry', attempt: 0 }); render();
  assert.equal(nodes.get('work-phase').textContent, 'Question 1 of 3');
  assert.equal(nodes.get('task-choices').disabled, false);
  assert.equal(nodes.get('task-feedback').hidden, true);
});

test('Orbit rebounds follow shield contact position without horizontal trajectories', () => {
  for (const offset of [-2, -1, -.5, 0, .5, 1, 2]) {
    const velocity = reboundVelocity(offset);
    assert.equal(Math.sign(velocity.x), Math.sign(offset));
    assert.ok(velocity.y <= -224);
    assert.ok(Math.abs(Math.hypot(velocity.x, velocity.y) - 450) < .01);
  }
});

test('arcade interludes move, pause, fail, retry and finish without advancing after completion', () => {
  assert.throws(() => createArcade('drive'), RangeError);
  for (const kind of ['invaders', 'pang']) {
    const state = createArcade(kind, { pilot: 'donkey' });
    const startX = state.player.x;
    updateArcade(state, { right: true, fire: true }, .1);
    assert.ok(state.player.x > startX);
    assert.equal(state.pilot, 'donkey');
    setArcadePaused(state, true);
    const time = state.time;
    assert.deepEqual(updateArcade(state, { left: true }, .1), []);
    assert.equal(state.time, time);
    setArcadePaused(state, false);
    state.remaining = .001;
    assert.ok(updateArcade(state, {}, .1).some(event => event.type === 'failed'));
    assert.equal(state.status, 'failed');
    assert.equal(createArcade(kind).health, 3);
    const won = createArcade(kind);
    if (kind === 'invaders') won.core = { dead: true };
    if (kind === 'pang') won.bubbles = [];
    assert.ok(updateArcade(won, {}, step).some(event => event.type === 'complete'));
    const score = won.score;
    assert.deepEqual(updateArcade(won, { fire: true }, .1), []);
    assert.equal(won.score, score);
  }
});

test('AI Invaders uses physics contacts for projectiles and counts each opponent once', () => {
  const state = createArcade('invaders');
  updateArcade(state, { fire: true }, step);
  const projectile = state.shots[0]; const enemy = state.invaders[0];
  projectile.body.setTransform({ x: enemy.x / 50, y: enemy.y / 50 }, 0);
  const events = updateArcade(state, {}, 1 / 60);
  assert.equal(enemy.dead, true);
  assert.equal(state.destroyed, 1);
  assert.equal(events.filter(event => event.type === 'enemyDefeated').length, 1);
  updateArcade(state, {}, .1);
  assert.equal(state.destroyed, 1);
});

test('AI Invaders banking and recoil preserve the original collider and pointer controls', () => {
  const state = createArcade('invaders');
  const collider = state.player.body.getFixtureList().getShape();
  updateArcade(state, { right: true, fire: true }, .1);
  assert.ok(state.player.bank > 0 && state.player.recoil > 0);
  assert.deepEqual([state.player.w, state.player.h], [44, 44]);
  assert.equal(state.player.body.getFixtureList().getShape(), collider);
  updateArcade(state, { pointerX: 20 }, .1);
  assert.equal(state.player.x, 55);
  updateArcade(state, { pointerX: 1800 }, .1);
  assert.equal(state.player.x, 1225);
  setArcadePaused(state, true);
  const before = [state.player.x, state.player.bank, state.player.recoil];
  updateArcade(state, { left: true, fire: true }, .1);
  assert.deepEqual([state.player.x, state.player.bank, state.player.recoil], before);
});

test('AI Invaders renders a transparent high-resolution ship with bounded movement effects', () => {
  const source = readFileSync(new URL('../images/Interceptor.png', import.meta.url));
  assert.deepEqual([source.readUInt32BE(16), source.readUInt32BE(20), source[25]], [1024, 1024, 6]);
  const state = createArcade('invaders');
  updateArcade(state, { right: true, fire: true }, .1);
  state.grace = 1;
  const before = [state.time, state.player.x, state.player.bank, state.player.recoil];
  for (const reducedMotion of [false, true]) {
    const { context, calls } = canvasRecorder();
    drawInterceptor(context, state, reducedMotion);
    assert.equal(calls.filter(([name, image]) => name === 'drawImage' && image === interceptorImage).length, 1);
    assert.ok(calls.some(([name, angle]) => name === 'rotate' && angle === (reducedMotion ? 0 : state.player.bank)));
    assert.ok(calls.some(([name]) => name === 'createLinearGradient'));
    assert.ok(calls.some(([name]) => name === 'ellipse'));
  }
  assert.deepEqual([state.time, state.player.x, state.player.bank, state.player.recoil], before);
});

function arcadeSteps(state, seconds, input = {}) {
  const events = [];
  for (let frame = 0; frame < Math.ceil(seconds * 120); frame += 1) events.push(...updateArcade(state, input, 1 / 120));
  return events;
}

function clearFormation(state) {
  for (const enemy of state.invaders) if (!enemy.dead) {
    state.physics.destroyBody(enemy.body); enemy.dead = true;
  }
  return updateArcade(state, {}, 1 / 60);
}

function nextInvaderWave(state, upgrade = 'laser') {
  clearFormation(state);
  assert.equal(state.phase, 'upgrade');
  assert.equal(chooseArcadeUpgrade(state, upgrade), true);
  arcadeSteps(state, 1.3);
}

function hitArcadeTarget(state, target) {
  state.fireCooldown = 0;
  updateArcade(state, { fire: true }, 1 / 120);
  const projectile = state.shots.find(item => item.owner === 'playerShot' && !item.dead);
  assert.ok(projectile);
  projectile.body.setTransform({ x: target.x / 50, y: target.y / 50 }, 0);
  return updateArcade(state, {}, 1 / 60);
}

function enemyShots(state, count = 1) {
  for (const enemy of state.invaders.slice(0, count)) { enemy.fireWarning = .001; enemy.aimX = state.player.x; }
  updateArcade(state, {}, 1 / 60);
  return state.shots.filter(item => item.owner === 'enemyShot' && !item.dead);
}

function teleportArcade(item, x, y) {
  item.x = x; item.y = y; item.body.setTransform({ x: x / 50, y: y / 50 }, 0);
}

test('AI Invaders offers one upgrade between each wave, freezing time and preserving defense damage', () => {
  const state = createArcade('invaders');
  state.bunkers[0].health = 3;
  const nodeBody = state.bunkers[0].body;
  for (const [index, key] of ['laser', 'shield', 'wingman'].entries()) {
    assert.ok(clearFormation(state).some(event => event.type === 'arcadeUpgrade'));
    const before = [state.time, state.remaining, state.player.x, state.score];
    arcadeSteps(state, 2, { right: true, fire: true });
    assert.deepEqual([state.time, state.remaining, state.player.x, state.score], before);
    assert.equal(chooseArcadeUpgrade(state, 'invalid'), false);
    assert.equal(chooseArcadeUpgrade(state, key), true);
    assert.equal(chooseArcadeUpgrade(state, key), false);
    arcadeSteps(state, 1.3);
    assert.equal(state.wave, index + 2);
    assert.equal(state.upgrades[key], 1);
    if (key !== 'laser') assert.equal(state.abilities[key].charges, 1);
    assert.equal(state.bunkers[0].health, 3);
    assert.equal(state.bunkers[0].body, nodeBody);
  }
  assert.equal(state.phase, 'boss');
  assert.ok(state.core.health > 0);
  assert.notEqual(state.status, 'complete');
});

test('AI Invaders pickups grant temporary tools and repair damaged or destroyed nodes through contacts', () => {
  const state = createArcade('invaders');
  for (let count = 0; count < 4; count += 1) hitArcadeTarget(state, state.invaders.find(enemy => !enemy.dead && enemy.kind === 'scout'));
  const shield = state.pickups.find(item => item.kind === 'shield');
  assert.ok(shield);
  teleportArcade(shield, state.player.x, state.player.y);
  const collection = updateArcade(state, {}, 1 / 60);
  assert.ok(collection.some(event => event.type === 'arcadeTool' && event.key === 'shield'));
  assert.ok(state.abilities.shield.active > 5.9);
  state.bunkers[0].health = 2;
  state.physics.destroyBody(state.bunkers[1].body); state.bunkers[1].dead = true; state.bunkers[1].health = 0;
  for (let count = 0; count < 4; count += 1) hitArcadeTarget(state, state.invaders.find(enemy => !enemy.dead && enemy.kind === 'scout'));
  const repair = state.pickups.find(item => item.kind === 'repair');
  assert.ok(repair);
  teleportArcade(repair, state.player.x, state.player.y);
  assert.ok(updateArcade(state, {}, 1 / 60).some(event => event.type === 'arcadeRepair'));
  assert.deepEqual(state.bunkers.map(node => node.health), [5, 3, 8]);
  assert.equal(state.bunkers[1].dead, false);
});

test('AI Invaders friendly lasers pass defense nodes while hostile shots damage them', () => {
  const state = createArcade('invaders');
  const node = state.bunkers[1];
  updateArcade(state, { fire: true }, 1 / 60);
  teleportArcade(state.shots[0], node.x, node.y);
  updateArcade(state, {}, 1 / 60);
  assert.equal(node.health, 8);
  assert.ok(state.shots.some(projectile => projectile.owner === 'playerShot'));
  const hostile = enemyShots(state)[0];
  teleportArcade(hostile, node.x, node.y);
  updateArcade(state, {}, 1 / 60);
  assert.equal(node.health, 7);
  assert.equal(hostile.dead, true);
});

test('AI Invaders shield, wingman, chain and pulse are bounded abilities with cooldowns', () => {
  const shield = createArcade('invaders');
  shield.upgrades.shield = 1; shield.abilities.shield.charges = 2;
  assert.equal(activateArcadeTool(shield, 'shield'), true);
  assert.equal(shield.abilities.shield.active, 9);
  assert.equal(activateArcadeTool(shield, 'shield'), false);
  const protectedShot = enemyShots(shield)[0];
  teleportArcade(protectedShot, shield.player.x, shield.player.y);
  updateArcade(shield, {}, 1 / 60);
  assert.equal(shield.health, 3);
  shield.abilities.shield.active = 0;
  const hurtShot = enemyShots(shield)[0];
  teleportArcade(hurtShot, shield.player.x, shield.player.y);
  updateArcade(shield, {}, 1 / 60);
  assert.equal(shield.health, 2); assert.ok(shield.grace > 1.7);

  const wingman = createArcade('invaders');
  wingman.upgrades.wingman = 1; wingman.abilities.wingman.charges = 1;
  activateArcadeTool(wingman, 'wingman');
  assert.equal(wingman.abilities.wingman.active, 15);
  arcadeSteps(wingman, 1.5);
  assert.ok(wingman.shots.some(item => item.owner === 'playerShot'));

  const chain = createArcade('invaders');
  chain.abilities.chain.charges = 1; activateArcadeTool(chain, 'chain');
  hitArcadeTarget(chain, chain.invaders[0]);
  assert.equal(chain.destroyed, 3);
  assert.equal(chain.effects.filter(item => item.kind === 'chain').length, 2);

  const pulse = createArcade('invaders');
  const [near, far] = enemyShots(pulse, 2);
  teleportArcade(near, pulse.player.x, pulse.player.y - 100);
  teleportArcade(far, 80, 205);
  pulse.abilities.pulse.charges = 1;
  assert.equal(activateArcadeTool(pulse, 'pulse'), true);
  assert.equal(near.dead, true); assert.notEqual(far.dead, true);
  assert.equal(activateArcadeTool(pulse, 'pulse'), false);
  setArcadePaused(pulse, true);
  const cooldown = pulse.abilities.pulse.cooldown;
  arcadeSteps(pulse, 2);
  assert.equal(pulse.abilities.pulse.cooldown, cooldown);
});

test('AI Invaders hold-to-fire can be disabled without losing one-shot keyboard or touch firing', () => {
  const held = createArcade('invaders');
  const tapped = createArcade('invaders');
  const rapid = arcadeSteps(held, 1, { fire: true });
  const single = arcadeSteps(tapped, 1, { fire: true, holdToFire: false });
  assert.ok(rapid.filter(event => event.type === 'shoot').length >= 4);
  assert.equal(single.filter(event => event.type === 'shoot').length, 1);
  updateArcade(tapped, { fire: false }, 1 / 60);
  assert.ok(updateArcade(tapped, { fire: true, holdToFire: false }, 1 / 60).some(event => event.type === 'shoot'));
  arcadeSteps(tapped, .3);
  assert.ok(updateArcade(tapped, { jumpPressed: true, holdToFire: false }, 1 / 60).some(event => event.type === 'shoot'));
});

test('AI Invaders tool inputs and upgrade controls retain keyboard and touch access inside the game frame', () => {
  const bindings = { patch: 'Digit1', query: 'Digit2', aegis: 'Digit3', pulse: 'KeyQ', fire: 'KeyF', jump: 'Space' };
  for (const [code, action] of [['Digit1','shield'], ['Digit2','wingman'], ['Digit3','chain'], ['Digit4','pulse'], ['KeyQ','pulse']]) {
    assert.equal(actionForKey(code, bindings, null, null, 'invaders'), `invader-${action}`);
  }
  assert.equal(actionForKey('Digit1', bindings), 'patch');
  assert.equal(actionForKey('Digit4', { jump: 'Digit4' }, null, null, 'invaders'), 'jump');
  assert.equal(actionForKey('KeyF', bindings, null, null, 'invaders'), 'fire');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const action of ['shield', 'wingman', 'chain', 'pulse']) {
    assert.ok(html.includes(`data-action="invader-${action}"`));
    assert.ok(html.includes(`id="invader-${action}-status"`));
  }
  const dialog = html.match(/<dialog id="arcade-upgrade-dialog"[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(dialog?.includes('aria-modal="true"'));
  assert.deepEqual([...dialog.matchAll(/data-upgrade="([^"]+)"/g)].map(match => match[1]), ['laser', 'shield', 'wingman']);
  assert.match(html, /id="hold-to-fire"/);
  assert.match(html, /<progress id="invader-core-health"/);
});

test('AI Invaders dives and flanks lock their paths and shielded armor has a visible open interval', () => {
  const state = createArcade('invaders');
  nextInvaderWave(state);
  state.grace = 30; state.diveTimer = 0;
  const warning = updateArcade(state, {}, 1 / 60);
  const diver = state.invaders.find(enemy => enemy.mode === 'diveWarning');
  assert.ok(diver);
  assert.ok(warning.some(event => event.type === 'arcadeWarning' && event.attack === 'dive'));
  const locked = diver.maneuver.targetX;
  arcadeSteps(state, .7, { pointerX: 100 });
  assert.equal(diver.mode, 'diveWarning');
  assert.equal(diver.maneuver.targetX, locked);
  arcadeSteps(state, .5);
  assert.equal(diver.mode, 'diving');
  const height = diver.y;
  arcadeSteps(state, .5);
  assert.ok(diver.y > height);
  nextInvaderWave(state);
  state.serial = 100; state.diveTimer = 0;
  updateArcade(state, {}, 1 / 60);
  assert.ok(state.invaders.some(enemy => enemy.mode === 'flankWarning'));
  const armor = state.invaders.find(enemy => enemy.kind === 'armored');
  state.time = Math.ceil(state.time / 3.8) * 3.8 - armor.serial * .17 + .3;
  updateArcade(state, {}, 1 / 60);
  assert.equal(armor.shielded, true);
  const health = armor.health;
  hitArcadeTarget(state, armor);
  assert.equal(armor.health, health);
  arcadeSteps(state, 1.5);
  assert.equal(armor.shielded, false);
  hitArcadeTarget(state, armor);
  assert.equal(armor.health, health - 1);
});

test('AI Invaders core telegraphs its sweep, leaves a safe side, and only takes exposed damage', () => {
  const state = createArcade('invaders');
  for (let wave = 0; wave < 3; wave += 1) nextInvaderWave(state);
  const core = state.core;
  const initialHealth = core.health;
  hitArcadeTarget(state, core);
  assert.equal(core.health, initialHealth);
  core.mode = 'exposed'; core.timer = 0; core.cycle = 1;
  const warnings = updateArcade(state, { pointerX: 200 }, 1 / 60);
  assert.equal(core.mode, 'warning'); assert.equal(state.beam, null);
  assert.ok(warnings.some(event => event.type === 'arcadeWarning' && event.attack === 'sweep'));
  assert.ok(core.sweepFrom > 500 && core.sweepTo >= 600);
  arcadeSteps(state, 1);
  assert.equal(state.beam, null);
  arcadeSteps(state, .8);
  assert.ok(state.beam);
  arcadeSteps(state, 1);
  assert.equal(state.health, 3);
  const beamX = state.beam.x;
  arcadeSteps(state, .05, { pointerX: beamX });
  assert.equal(state.health, 2, 'Sweeping beam must make real physical contact');
  state.grace = 10;
  arcadeSteps(state, 3, { pointerX: 200 });
  assert.equal(core.mode, 'exposed'); assert.equal(state.beam, null);
  core.health = 1;
  const events = hitArcadeTarget(state, core);
  assert.ok(events.some(event => event.type === 'arcadeCoreDefeated'));
  assert.equal(state.status, 'complete');
  assert.equal(state.shots.length, 0);
  assert.deepEqual(updateArcade(state, { fire: true }, 1), []);
});

test('AI Invaders core opening accepts real approaching shots but armored side panels do not', () => {
  const state = createArcade('invaders');
  for (let wave = 0; wave < 3; wave += 1) nextInvaderWave(state);
  const core = state.core;
  core.mode = 'exposed'; core.timer = 5;
  const before = core.health;
  hitArcadeTarget(state, { x: core.x + 60, y: core.y });
  assert.equal(core.health, before);
  updateArcade(state, { pointerX: core.x }, 1 / 60);
  state.fireCooldown = 0;
  updateArcade(state, { fire: true }, 1 / 60);
  arcadeSteps(state, .5);
  assert.ok(core.health < before, 'A shot must pass the open outer armor and contact the exposed center');
  assert.equal(state.coreWeakPoint.body.getPosition().x, core.body.getPosition().x);
});

test('AI Invaders renders every wave, warning, tool and core state without mutating simulation', () => {
  const state = createArcade('invaders');
  state.grace = 99;
  const signatures = new Set();
  for (let wave = 1; wave <= 4; wave += 1) {
    if (wave > 1) nextInvaderWave(state);
    state.abilities.wingman.active = 4;
    state.abilities.shield.active = 4;
    const enemy = state.invaders[0];
    if (enemy) { enemy.fireWarning = .6; enemy.aimX = 640; }
    state.effects = [{ kind: 'burst', x: 400, y: 300, serial: 1, life: .3 },
      { kind: 'chain', x: 400, y: 300, targetX: 520, targetY: 320, serial: 2, life: .3 },
      { kind: 'pulse', x: 640, y: 595, radius: 270, serial: 3, life: .4 }];
    if (state.core) {
      state.core.mode = 'exposed'; state.core.timer = 0; state.core.cycle = 1;
      updateArcade(state, {}, 1 / 60);
      arcadeSteps(state, 1.8);
    }
    for (const reducedMotion of [false, true]) {
      const before = { time: state.time, health: state.health, score: state.score,
        effects: structuredClone(state.effects), player: [state.player.x, state.player.y, state.player.bank] };
      const { context, calls } = canvasRecorder();
      renderArcade(context, state, reducedMotion);
      assert.deepEqual({ time: state.time, health: state.health, score: state.score,
        effects: state.effects, player: [state.player.x, state.player.y, state.player.bank] }, before);
      assert.ok(calls.length > 200);
      assert.ok(calls.some(([name, image]) => name === 'drawImage' && image === interceptorImage));
      signatures.add(JSON.stringify(calls));
    }
  }
  assert.equal(signatures.size, 8);
});

test('Bubble Firewall splits a hit bubble into two smaller physical bubbles', () => {
  const state = createArcade('pang');
  const bubble = state.bubbles[0];
  const count = state.bubbles.length;
  bubble.body.setTransform({ x: state.player.x / 50, y: 470 / 50 }, 0);
  bubble.body.setLinearVelocity({ x: 0, y: 0 });
  for (let frame = 0; frame < 40 && !bubble.dead; frame += 1) updateArcade(state, { fire: true }, step);
  assert.equal(bubble.dead, true);
  assert.equal(state.bubbles.length, count + 1);
  assert.equal(state.bubbles.filter(item => item.tier === 1).length, 2);
  assert.equal(state.score, 100);
});

test('arcade renderers produce distinct scenes without mutating simulation state', () => {
  const signatures = new Set();
  for (const kind of ['invaders', 'pang']) {
    const state = createArcade(kind);
    if (kind === 'pang') state.bubbles.forEach((bubble, tier) => { bubble.tier = tier; bubble.radius = [19, 32, 50][tier]; });
    const { context, calls } = canvasRecorder();
    renderArcade(context, state, true);
    assert.equal(state.time, 0);
    assert.ok(calls.length > 100);
    signatures.add(JSON.stringify(calls));
    if (kind === 'pang') {
      for (const bubble of state.bubbles) {
        assert.ok(calls.some(([name, x, y]) => name === 'translate' && x === bubble.x && y === bubble.y));
        const size = bubble.radius * 1.55 / 32;
        assert.ok(calls.some(([name, horizontal, vertical]) => name === 'scale' && horizontal === size && vertical === size));
      }
      assert.ok(calls.filter(([name]) => name === 'bezierCurveTo').length >= state.bubbles.length * 12);
      assert.ok(!calls.some(([name, text]) => name === 'fillText' && ['{ }', '< >', '*'].includes(text)));
    }
  }
  assert.equal(signatures.size, 2);
});

test('Orbit bricks display Microsoft app icons in every wave without changing their physics', () => {
  for (const width of [720, 1280]) for (let wave = 0; wave < ORBIT.waves.length; wave += 1) {
    const state = createOrbit({ width, wave });
    const before = state.bricks.map(brick => ({ x: brick.x, y: brick.y, w: brick.w, h: brick.h, hp: brick.hp, app: brick.app }));
    assert.ok(state.bricks.every(brick => Object.hasOwn(APPS, brick.app)));
    assert.equal(new Set(state.bricks.map(brick => brick.app)).size, 5);
    const { context, calls } = canvasRecorder(width);
    renderOrbit(context, state, true, { highContrast: true });
    for (const [app, glyph] of [['word', 'W'], ['excel', 'X'], ['outlook', 'O']]) {
      assert.equal(calls.filter(([name, text]) => name === 'fillText' && text === glyph).length,
        state.bricks.filter(brick => brick.app === app).length);
    }
    assert.ok(calls.some(([name]) => name === 'bezierCurveTo'), 'Copilot ribbons are rendered');
    assert.deepEqual(state.bricks.map(brick => ({ x: brick.x, y: brick.y, w: brick.w, h: brick.h, hp: brick.hp, app: brick.app })), before);
    assert.equal(state.time, 0);
  }
});

test('Orbit follows pointer input precisely, clamps at walls, and launches on demand', () => {
  const state = createOrbit({ width: 720 });
  updateOrbit(state, { pointerX: 250 }, step);
  assert.equal(state.paddle.x, 250);
  assert.equal(ballPosition(state.balls[0]).x, 250);
  updateOrbit(state, { pointerX: -1000 }, step);
  assert.equal(state.paddle.x, state.paddle.w / 2 + 8);
  assert.equal(state.balls[0].attached, true);
  updateOrbit(state, { jumpPressed: true }, step);
  assert.equal(state.balls[0].attached, false);
  assert.ok(state.balls[0].body.getLinearVelocity().y < 0);
});

test('Orbit uses real physics contacts to damage bricks', () => {
  const state = createOrbit();
  updateOrbit(state, { jumpPressed: true }, step);
  const brick = state.bricks.at(-1);
  const ball = state.balls[0];
  ball.body.setTransform({ x: brick.x / 50, y: (brick.y + 30) / 50 }, 0);
  ball.body.setLinearVelocity({ x: 0, y: -9 });
  const events = [];
  for (let frame = 0; frame < 10; frame += 1) events.push(...updateOrbit(state, {}, step));
  assert.ok(events.some(event => event.type === 'brick'));
  assert.ok(state.score > 0);
});

function loseOrbitBall(ball) {
  ball.attached = false; ball.body.setActive(true);
  ball.body.setTransform({ x: 1, y: 16 }, 0);
  ball.body.setLinearVelocity({ x: 1, y: 7 });
}

test('Orbit only spends a recovery charge when the last ball is lost', () => {
  const state = createOrbit();
  updateOrbit(state, { jumpPressed: true }, step);
  state.drops.push({ x: state.paddle.x, y: state.paddle.y, kind: 'multi' });
  updateOrbit(state, {}, step);
  assert.equal(state.balls.length, 3);
  loseOrbitBall(state.balls[0]);
  updateOrbit(state, {}, step);
  assert.equal(state.balls.length, 2);
  assert.equal(state.charges, 3);
  state.balls.forEach(loseOrbitBall);
  updateOrbit(state, {}, step);
  assert.equal(state.charges, 2);
  assert.equal(state.balls.length, 1);
  assert.equal(state.balls[0].attached, true);
});

test('Orbit agents enforce compute budgets and cooldowns; Patch provides real recovery', () => {
  const state = createOrbit();
  updateOrbit(state, { agentPressed: 'patch' }, step);
  assert.equal(state.netCharges, 1);
  assert.ok(state.compute < 71);
  updateOrbit(state, { agentPressed: 'patch' }, step);
  assert.equal(state.netCharges, 1);
  state.compute = 0;
  updateOrbit(state, { agentPressed: 'aegis' }, step);
  assert.equal(state.shieldTime, 0);
  loseOrbitBall(state.balls[0]);
  updateOrbit(state, {}, step);
  assert.equal(state.charges, 3);
  assert.equal(state.netCharges, 0);
  assert.ok(state.balls[0].body.getLinearVelocity().y < 0);
});

test('Orbit magnetic catches attach to the saucer and launch again', () => {
  const state = createOrbit();
  state.magnetTime = 10;
  updateOrbit(state, { jumpPressed: true }, step);
  const ball = state.balls[0];
  ball.body.setTransform({ x: state.paddle.x / 50, y: (state.paddle.y - 24) / 50 }, 0);
  ball.body.setLinearVelocity({ x: 0, y: 9 });
  for (let frame = 0; frame < 10; frame += 1) updateOrbit(state, {}, step);
  assert.equal(ball.attached, true);
  updateOrbit(state, { jumpPressed: true }, step);
  assert.equal(ball.attached, false);
});

test('Orbit restores boss resources, completes all waves, and freezes while paused', () => {
  const state = createOrbit();
  for (let wave = 0; wave < 4; wave += 1) {
    state.bricks.forEach(brick => { brick.hp = 0; });
    updateOrbit(state, {}, step);
    assert.equal(state.phase, 'wave-clear');
    for (let frame = 0; frame < 170; frame += 1) updateOrbit(state, {}, step);
    assert.equal(state.wave, wave + 1);
  }
  assert.equal(state.charges, 3);
  assert.equal(state.compute, 100);
  setOrbitPaused(state, true);
  const before = state.time;
  updateOrbit(state, { jumpPressed: true }, .1);
  assert.equal(state.time, before);
  setOrbitPaused(state, false);
  state.bricks.forEach(brick => { brick.hp = 0; });
  updateOrbit(state, {}, step);
  assert.equal(state.status, 'complete');
});

test('Orbit retries rebuild the selected sector with a fair recovery reserve', () => {
  const state = createOrbit({ width: 720, wave: 3 });
  assert.equal(state.wave, 3);
  assert.equal(state.barriers.length, 1);
  assert.equal(state.charges, 3);
  assert.equal(state.compute, 100);
  assert.equal(state.phase, 'ready');
  assert.equal(state.balls.length, 1);
  assert.ok(state.bricks.some(brick => brick.hp === 2));
});

test('Orbit ends after its recovery reserve is exhausted and cannot resume a failed flight', () => {
  const state = createOrbit();
  for (let miss = 0; miss < 4; miss += 1) {
    loseOrbitBall(state.balls[0]); updateOrbit(state, {}, step);
  }
  assert.equal(state.charges, 0);
  assert.equal(state.status, 'failed');
  setOrbitPaused(state, false);
  assert.equal(state.status, 'failed');
  assert.deepEqual(updateOrbit(state, { jumpPressed: true }, step), []);
});

test('Orbit portals are paired and cannot immediately teleport the core back', () => {
  const state = createOrbit({ wave: 2 });
  updateOrbit(state, { jumpPressed: true }, step);
  const ball = state.balls[0];
  const entrance = state.portals[0];
  ball.body.setTransform({ x: entrance.x / 50, y: entrance.y / 50 }, 0);
  ball.body.setLinearVelocity({ x: 0, y: 9 });
  const events = updateOrbit(state, {}, step);
  assert.ok(events.some(event => event.type === 'portal'));
  assert.ok(Math.abs(ballPosition(ball).x - state.portals[1].x) < 1);
  for (let frame = 0; frame < 10; frame += 1) {
    assert.equal(updateOrbit(state, {}, step).some(event => event.type === 'portal'), false);
  }
});

test('Aegis prevents missile damage without removing player recovery charges', () => {
  for (const defended of [false, true]) {
    const state = createOrbit({ wave: 3 });
    state.missiles.push({ x: state.paddle.x, y: state.paddle.y - 36, warning: 0 });
    const events = updateOrbit(state, { agentPressed: defended ? 'aegis' : undefined }, step);
    assert.ok(events.some(event => event.type === (defended ? 'defend' : 'missileHit')));
    assert.equal(state.compute, defended ? 75 : 85);
    assert.equal(state.charges, 3);
  }
});

test('wide shield changes the collider and Debug Laser damages actual targets', () => {
  const state = createOrbit();
  state.drops.push({ x: state.paddle.x, y: state.paddle.y, kind: 'wide' });
  updateOrbit(state, {}, step); updateOrbit(state, {}, step);
  assert.equal(state.paddle.w, state.paddle.baseWidth + 70);
  const targetX = state.bricks[5].x;
  state.drops.push({ x: targetX, y: state.paddle.y, kind: 'laser' });
  const events = updateOrbit(state, { pointerX: targetX }, step);
  assert.ok(events.some(event => event.type === 'brick'));
  assert.ok(state.lasers.length > 0);
  assert.ok(state.score > 0);
});

await runPartyTests({ test: (name, run) => test(`Team Quest: ${name}`, run), assert: assert.ok });

test('the published page versions every module and CSS from the current source', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const match = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  assert.ok(match, 'The startup import map must exist');
  const actual = JSON.parse(match[1]);
  const expected = assetManifest();
  assert.deepEqual(actual.imports, expected.imports, 'Run npm run build before publishing source changes');
  assert.ok(html.includes(`href="./styles.css?v=${expected.version}"`), 'CSS must use the same release version');
  assert.ok(actual.imports['./src/main.js'], 'The entry module must be versioned too');
});
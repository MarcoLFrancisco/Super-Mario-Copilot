import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, setPaused, update, interactionAt, platformsFor } from '../src/engine.js';
import { LEVEL, PHYSICS } from '../src/level.js';
import { createOrbit, updateOrbit, setOrbitPaused, reboundVelocity, ballPosition } from '../src/orbit.js';

const step = 1 / 120;

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

test('holding jump rises higher than tapping without changing the full jump', () => {
  const fullHeight = jumpHeight(true);
  const tapHeight = jumpHeight(false);
  assert.ok(fullHeight > 125 && fullHeight < 140);
  assert.ok(tapHeight > 25 && tapHeight < 45);
  assert.equal(jumpHeight(undefined), fullHeight);
});

test('jumping shortly after leaving an edge uses coyote time', () => {
  const state = createState();
  state.player.x = 641;
  for (let frame = 0; frame < 8; frame += 1) update(state, {}, step);
  assert.equal(state.player.grounded, false);
  const events = update(state, { jumpPressed: true, jumpHeld: true }, step);
  assert.equal(events.filter(event => event.type === 'jump').length, 1);
  assert.ok(state.player.vy < 0);
});

test('an expired edge grace period cannot be used as an air jump', () => {
  const state = createState();
  state.player.x = 641;
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

test('a suggested bridge is non-solid until explicitly accepted nearby', () => {
  const state = createState();
  const suggestion = LEVEL.suggestions[0];
  assert.equal(platformsFor(state).includes(suggestion.platform), false);
  update(state, { interactPressed: true }, step);
  assert.equal(state.acceptedSuggestions.size, 0);
  state.player.x = suggestion.x;
  assert.equal(interactionAt(state), suggestion);
  const events = update(state, { interactPressed: true }, step);
  assert.equal(events.some(event => event.type === 'suggestion'), true);
  assert.equal(platformsFor(state).includes(suggestion.platform), true);
  const score = state.score;
  update(state, { interactPressed: true }, step);
  assert.equal(state.score, score);
});

test('bridge approval survives a fall while the boss resets fairly', () => {
  const state = createState();
  state.acceptedSuggestions.add(LEVEL.suggestions[0].id);
  state.checkpointIndex = 3;
  state.boss.health = 1;
  state.boss.phase = 'attack';
  state.player.y = LEVEL.deathY + 10;
  update(state, {}, step);
  assert.equal(state.deaths, 1);
  assert.equal(state.player.x, LEVEL.checkpoints[3].spawn.x);
  assert.equal(state.boss.health, LEVEL.boss.health);
  assert.equal(state.boss.phase, 'idle');
  assert.equal(state.boss.pulses.length, 0);
  assert.equal(state.acceptedSuggestions.size, 1);
});

test('the exit remains locked until the Setup Wizard is repaired', () => {
  const state = createState();
  Object.assign(state.player, { x: LEVEL.goal.x, y: LEVEL.goal.y + 60 });
  update(state, {}, step);
  assert.equal(state.status, 'playing');
  state.boss.health = 0;
  state.boss.phase = 'defeated';
  const events = update(state, {}, step);
  assert.equal(state.status, 'complete');
  assert.equal(events.some(event => event.type === 'complete'), true);
});

test('the boss telegraphs before attacking and exposes a restart switch afterward', () => {
  const state = createState();
  state.player.x = LEVEL.boss.arenaX;
  update(state, {}, step);
  assert.equal(state.boss.phase, 'telegraph');
  assert.equal(state.boss.pulses.length, 0);
  for (let frame = 0; frame < 170; frame += 1) update(state, {}, step);
  assert.equal(state.boss.phase, 'attack');
  assert.ok(state.boss.pulses.length > 0);
  state.player.x = LEVEL.boss.x + 300;
  for (let frame = 0; frame < 255; frame += 1) update(state, {}, step);
  assert.equal(state.boss.phase, 'exposed');
});

test('only a downward strike on the exposed switch damages the boss and unlocks dash', () => {
  const state = createState();
  const prepareStrike = phase => {
    state.boss.phase = phase;
    state.boss.timer = 4;
    Object.assign(state.player, { x: LEVEL.boss.switch.x,
      y: LEVEL.boss.switch.y - PHYSICS.playerHeight - 1,
      vy: 250, grounded: false, coyote: 0 });
  };
  prepareStrike('telegraph');
  update(state, {}, step);
  assert.equal(state.boss.health, 3);
  assert.equal(state.abilities.dash, false);
  for (let strike = 0; strike < 3; strike += 1) {
    prepareStrike('exposed');
    update(state, {}, step);
  }
  assert.equal(state.boss.health, 0);
  assert.equal(state.boss.phase, 'defeated');
  assert.equal(state.abilities.dash, true);
  assert.equal(update(state, { boostPressed: true }, step).some(event => event.type === 'boost'), true);
});

test('dash is story-gated but a replay can retain its unlock', () => {
  const locked = createState();
  assert.equal(update(locked, { boostPressed: true }, step).some(event => event.type === 'boost'), false);
  const replay = createState({ dashUnlocked: true });
  assert.equal(update(replay, { boostPressed: true }, step).some(event => event.type === 'boost'), true);
});

test('Orbit rebounds follow shield contact position without horizontal trajectories', () => {
  for (const offset of [-2, -1, -.5, 0, .5, 1, 2]) {
    const velocity = reboundVelocity(offset);
    assert.equal(Math.sign(velocity.x), Math.sign(offset));
    assert.ok(velocity.y <= -224);
    assert.ok(Math.abs(Math.hypot(velocity.x, velocity.y) - 450) < .01);
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

test('every required Campus connection is reachable without approvals or dash', () => {
  const connections = Array.from({ length: 11 }, (_, index) => [index, index + 1]);
  connections.push([11, 22], [22, 23], [23, 24]);
  for (const [sourceIndex, targetIndex] of connections) {
    const source = LEVEL.platforms[sourceIndex];
    const target = LEVEL.platforms[targetIndex];
    let reachable = false;
    for (let launchX = source.x + 12; launchX <= source.x + source.w - PHYSICS.playerWidth; launchX += 12) {
      if (launchX + 360 < target.x) continue;
      const state = createState();
      Object.assign(state.player, { x: launchX, y: source.y - PHYSICS.playerHeight, vx: PHYSICS.speed });
      for (let frame = 0; frame < 150; frame += 1) {
        update(state, { right: true, jumpHeld: true, jumpPressed: frame === 0 }, step);
        if (state.deaths > 0) break;
        if (state.player.grounded && frame > 0) {
          reachable = Math.abs(state.player.y + PHYSICS.playerHeight - target.y) < .01
            && state.player.x + PHYSICS.playerWidth > target.x && state.player.x < target.x + target.w;
          break;
        }
      }
      if (reachable) break;
    }
    assert.ok(reachable, `${source.id} must connect to ${target.id}`);
  }
});

test('the Wizard restart switch can be reached by jumping from its final platform', () => {
  const state = createState();
  state.boss.phase = 'exposed'; state.boss.timer = 8;
  Object.assign(state.player, { x: LEVEL.boss.switch.x, y: 405 - PHYSICS.playerHeight });
  for (let frame = 0; frame < 100; frame += 1) {
    update(state, { jumpPressed: frame === 0, jumpHeld: true }, step);
  }
  assert.equal(state.boss.health, 2);
  assert.equal(state.deaths, 0);
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
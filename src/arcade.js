import { World, Vec2, Box, Circle } from '../vendor/planck.mjs';

export const INTERLUDES = Object.freeze({
  github: { id: 'ai-invaders', title: 'AI Invaders', kind: 'invaders', difficulty: 1, color: '#9af390',
    intro: 'The signal sky is full of rogue bots. Clear two formations.', ending: 'The sky belongs to your team again.' },
  cowork: { id: 'bubble-firewall', title: 'Bubble Firewall', kind: 'pang', difficulty: 1, color: '#ffacbd',
    intro: 'Split the bouncing data bubbles until the courtyard is clear.', ending: 'Every last bubble cleared.' },
  agents: { id: 'ai-invaders-night', title: 'AI Invaders: Night Shift', kind: 'invaders', difficulty: 2, color: '#a4e879',
    intro: 'A faster signal swarm has reached the city. Hold the line.', ending: 'Night shift complete. The city is quiet.' },
  teams: { id: 'bubble-festival', title: 'Bubble Festival', kind: 'pang', difficulty: 2, color: '#8fdff5',
    intro: 'One last bubble festival before the trip to orbit.', ending: 'The festival is clear for launch.' }
});

const SCALE = 50;
const STEP = 1 / 120;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function makeBody(state, item, type, shape, motion = 'kinematic') {
  const body = state.physics.createBody({ type: motion, position: Vec2(item.x / SCALE, item.y / SCALE),
    bullet: motion === 'dynamic', fixedRotation: true, allowSleep: false });
  body.createFixture(shape, { density: 1, restitution: type === 'bubble' ? 1 : 0,
    friction: 0, isSensor: !['bubble', 'wall', 'floor'].includes(type) });
  body.setUserData({ type, item });
  item.body = body;
  return item;
}

function remove(state, item) {
  if (item.dead) return;
  item.dead = true;
  if (item.body) state.physics.destroyBody(item.body);
}

function moveBody(item, x, y) {
  item.x = x; item.y = y;
  item.body.setTransform(Vec2(x / SCALE, y / SCALE), 0);
}

function shot(state, x, y, speed, owner) {
  const item = makeBody(state, { x, y, w: 6, h: 16, life: 3, owner }, owner,
    Box(3 / SCALE, 8 / SCALE), 'dynamic');
  item.body.setLinearVelocity(Vec2(0, speed / SCALE));
  state.shots.push(item);
}

function formation(state) {
  state.invaders = [];
  state.bunkers = [];
  const columns = 7 + state.difficulty;
  for (let row = 0; row < 3; row += 1) for (let column = 0; column < columns; column += 1) {
    const enemy = { x: 235 + column * 88, y: 210 + row * 62, w: 40, h: 34, row };
    state.invaders.push(makeBody(state, enemy, 'invader', Box(20 / SCALE, 17 / SCALE)));
  }
  for (const x of [280, 640, 1000]) {
    state.bunkers.push(makeBody(state, { x, y: 499, w: 140, h: 24, health: 8 }, 'bunker', Box(70 / SCALE, 12 / SCALE), 'static'));
  }
  state.direction = 1; state.enemyFire = 1.2;
}

function addBubble(state, x, y, tier, direction = 1) {
  const radius = [19, 32, 50][tier];
  const bubble = makeBody(state, { x, y, tier, radius, horizontal: direction * (160 + (2 - tier) * 28), serial: state.serial++ },
    'bubble', Circle(radius / SCALE), 'dynamic');
  bubble.body.setLinearVelocity(Vec2(bubble.horizontal / SCALE, -(285 + tier * 120) / SCALE));
  state.bubbles.push(bubble);
  return bubble;
}

export function createArcade(kind, { difficulty = 1, pilot = 'marco' } = {}) {
  if (!['invaders', 'pang'].includes(kind)) throw new RangeError('Unknown arcade game');
  const state = { mode: 'arcade', kind, difficulty, pilot, status: 'playing', time: 0, accumulator: 0,
    score: 0, health: 3, grace: 0, fireCooldown: 0,
    pendingFire: false, serial: 0, contacts: [], shots: [], invaders: [], bunkers: [], bubbles: [], ropes: [],
    wave: 1, waveDelay: 0, destroyed: 0, enemyFire: 1.2,
    remaining: kind === 'invaders' ? 150 : 110,
    physics: new World(Vec2(0, kind === 'pang' ? 13 : 0)), player: { x: 640, y: 595, w: 44, h: 44 } };
  makeBody(state, state.player, 'player', Box(22 / SCALE, 22 / SCALE));
  state.physics.on('begin-contact', contact => {
    const first = contact.getFixtureA().getBody().getUserData();
    const second = contact.getFixtureB().getBody().getUserData();
    if (first && second) state.contacts.push([first, second]);
  });
  if (kind === 'invaders') formation(state);
  if (kind === 'pang') {
    for (const wall of [{ x: 25, y: 400, w: 20, h: 440 }, { x: 1255, y: 400, w: 20, h: 440 },
      { x: 640, y: 630, w: 1280, h: 20 }, { x: 640, y: 174, w: 1280, h: 12 }]) {
      makeBody(state, wall, wall.y === 630 ? 'floor' : 'wall', Box(wall.w / SCALE / 2, wall.h / SCALE / 2), 'static');
    }
    for (let index = 0; index < difficulty + 2; index += 1) addBubble(state, 230 + index * 265, 310 - index % 2 * 50, 2, index % 2 ? -1 : 1);
  }
  return state;
}

export function setArcadePaused(state, paused) {
  if (['complete', 'failed'].includes(state.status)) return;
  state.status = paused ? 'paused' : 'playing'; state.accumulator = 0;
  state.pendingFire = false;
}

function damage(state, events) {
  if (state.grace > 0 || state.health <= 0) return;
  state.health -= 1; state.grace = 1.8;
  events.push({ type: 'damage', health: state.health });
}

function finish(state, won, events) {
  if (state.status !== 'playing') return;
  state.status = won ? 'complete' : 'failed';
  if (won) state.score += 1000 + Math.floor(state.remaining) * 5;
  state.pendingFire = false;
  events.push({ type: won ? 'complete' : 'failed', score: state.score });
}

function updateInvaders(state, input, events) {
  if (state.waveDelay > 0) {
    state.waveDelay -= STEP;
    if (state.waveDelay <= 0) formation(state);
    return;
  }
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  moveBody(state.player, clamp(Number.isFinite(input.pointerX) ? input.pointerX : state.player.x + direction * 410 * STEP, 55, 1225), 595);
  if ((state.pendingFire || input.fire || input.jumpHeld) && state.fireCooldown === 0) {
    shot(state, state.player.x, 560, -650, 'playerShot'); state.fireCooldown = .22; events.push({ type: 'shoot' });
  }
  const alive = state.invaders.filter(enemy => !enemy.dead);
  const speed = 26 + state.difficulty * 9 + (24 - alive.length) * 1.2 + state.wave * 6;
  if (alive.some(enemy => enemy.x + state.direction * speed * STEP > 1190 || enemy.x + state.direction * speed * STEP < 90)) {
    state.direction *= -1;
    for (const enemy of alive) moveBody(enemy, enemy.x, enemy.y + 20);
  }
  for (const enemy of alive) moveBody(enemy, enemy.x + state.direction * speed * STEP, enemy.y);
  state.enemyFire -= STEP;
  if (state.enemyFire <= 0 && alive.length) {
    const enemy = alive[state.serial++ % alive.length];
    shot(state, enemy.x, enemy.y + 25, 250 + state.difficulty * 35, 'enemyShot');
    state.enemyFire = .9 - state.difficulty * .14;
  }
  if (alive.some(enemy => enemy.y >= 552)) state.health = 0;
}

function updatePang(state, input, events) {
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  moveBody(state.player, clamp(Number.isFinite(input.pointerX) ? input.pointerX : state.player.x + direction * 350 * STEP, 57, 1223), 595);
  if ((state.pendingFire || input.fire || input.jumpHeld) && state.fireCooldown === 0 && state.ropes.length < 2) {
    const rope = { x: state.player.x, y: 594, tip: 590, base: 615, life: 1.1 };
    makeBody(state, rope, 'harpoon', Box(3 / SCALE, 12 / SCALE));
    state.ropes.push(rope); state.fireCooldown = .38; events.push({ type: 'shoot' });
  }
  for (const rope of state.ropes) {
    rope.tip = Math.max(182, rope.tip - STEP * 760); rope.life -= STEP;
    if (rope.life <= 0) { remove(state, rope); continue; }
    rope.body.destroyFixture(rope.body.getFixtureList());
    rope.body.createFixture(Box(3 / SCALE, (rope.base - rope.tip) / SCALE / 2), { isSensor: true });
    moveBody(rope, rope.x, (rope.base + rope.tip) / 2);
  }
  state.ropes = state.ropes.filter(rope => !rope.dead);
}

function resolveContacts(state, events) {
  for (const pair of state.contacts) {
    const find = type => pair.find(entry => entry.type === type)?.item;
    if (pair.some(entry => entry.item.dead)) continue;
    const player = find('player');
    const enemyShot = find('enemyShot');
    const playerShot = find('playerShot');
    const invader = find('invader');
    const bunker = find('bunker');
    const bubble = find('bubble');
    const harpoon = find('harpoon');
    if (player && (enemyShot || bubble)) {
      damage(state, events);
      if (enemyShot) remove(state, enemyShot);
    }
    if (playerShot && invader) {
      remove(state, invader); remove(state, playerShot); state.destroyed += 1; state.score += 100;
      events.push({ type: 'enemyDefeated', points: 100 });
    }
    if (bunker && (playerShot || enemyShot)) {
      remove(state, playerShot ?? enemyShot); bunker.health -= 1;
      if (bunker.health === 0) remove(state, bunker);
    }
    if (bubble && find('floor')) {
      const velocity = bubble.body.getLinearVelocity();
      bubble.body.setLinearVelocity(Vec2(velocity.x, -(285 + bubble.tier * 120) / SCALE));
    }
    if (bubble && harpoon) {
      const position = bubble.body.getPosition();
      const x = position.x * SCALE; const y = position.y * SCALE;
      remove(state, bubble); remove(state, harpoon); state.destroyed += 1; state.score += 100;
      if (bubble.tier > 0) for (const direction of [-1, 1]) addBubble(state, clamp(x + direction * 14, 90, 1190), y, bubble.tier - 1, direction);
      events.push({ type: 'brick', destroyed: true });
    }
  }
  state.contacts = [];
}

function tick(state, input, events) {
  state.time += STEP; state.remaining = Math.max(0, state.remaining - STEP);
  for (const key of ['grace', 'fireCooldown']) state[key] = Math.max(0, state[key] - STEP);
  if (state.kind === 'invaders') updateInvaders(state, input, events);
  else updatePang(state, input, events);
  state.pendingFire = false;
  state.physics.step(STEP);
  resolveContacts(state, events);
  for (const projectile of state.shots) {
    if (projectile.dead) continue;
    const position = projectile.body.getPosition(); projectile.x = position.x * SCALE; projectile.y = position.y * SCALE;
    projectile.life -= STEP;
    if (projectile.life <= 0 || projectile.y < 155 || projectile.y > 700) remove(state, projectile);
  }
  state.shots = state.shots.filter(item => !item.dead);
  state.bubbles = state.bubbles.filter(item => !item.dead);
  state.ropes = state.ropes.filter(item => !item.dead);
  for (const bubble of state.bubbles) {
    const position = bubble.body.getPosition(); bubble.x = position.x * SCALE; bubble.y = position.y * SCALE;
    const velocity = bubble.body.getLinearVelocity();
    bubble.body.setLinearVelocity(Vec2(Math.sign(velocity.x || bubble.horizontal) * Math.abs(bubble.horizontal) / SCALE, velocity.y));
  }
  if (state.health <= 0 || state.remaining === 0) { finish(state, false, events); return; }
  if (state.kind === 'pang' && state.bubbles.length === 0) finish(state, true, events);
  if (state.kind === 'invaders' && state.waveDelay <= 0 && state.invaders.every(enemy => enemy.dead)) {
    if (state.wave === 2) finish(state, true, events);
    else {
      for (const item of [...state.bunkers, ...state.shots]) remove(state, item);
      state.shots = []; state.wave += 1; state.waveDelay = 1.2; state.health = Math.min(3, state.health + 1);
      events.push({ type: 'arcadeWave', wave: state.wave });
    }
  }
}

export function updateArcade(state, input = {}, dt = 0) {
  const events = [];
  if (state.status !== 'playing') return events;
  state.pendingFire ||= Boolean(input.jumpPressed || input.attackPressed || input.fire);
  state.accumulator += Number.isFinite(dt) ? clamp(dt, 0, .1) : 0;
  while (state.accumulator >= STEP && state.status === 'playing') {
    state.accumulator -= STEP;
    tick(state, input, events);
  }
  return events;
}

export function arcadeObjective(state) {
  if (state.kind === 'invaders') return `Wave ${state.wave} / 2 | ${state.invaders.filter(enemy => !enemy.dead).length} bots remaining`;
  return `${state.bubbles.length} bubbles remaining`;
}
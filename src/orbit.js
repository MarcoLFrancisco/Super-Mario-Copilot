import { World, Vec2, Box, Circle, Polygon } from '../vendor/planck.mjs';

export const ORBIT = Object.freeze({ width: 1280, height: 720, paddleY: 608, radius: 9,
  waves: ['Orbital Approach', 'Server Fields', 'Portal Lanes', 'Defender Swarm', 'Orbital Firewall'] });
export const AGENTS = Object.freeze({
  patch: { name: 'Patch', cost: 30, cooldown: 9 },
  query: { name: 'Query', cost: 20, cooldown: 8 },
  aegis: { name: 'Aegis', cost: 25, cooldown: 10 }
});

const scale = 50;
const step = 1 / 120;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const speedFor = state => 450 + state.wave * 25;

export function reboundVelocity(offset, speed = 450) {
  const angle = clamp(offset, -1, 1) * Math.PI / 3;
  return { x: Math.sin(angle) * speed, y: -Math.cos(angle) * speed };
}

function paddleShape(width) {
  return Polygon([[-.5, 25], [-.375, 5], [-.175, -12], [.175, -12],
    [.375, 5], [.5, 25], [.5, 42], [-.5, 42]]
    .map(([horizontal, vertical]) => Vec2(horizontal * width / scale, vertical / scale)));
}

function rectangle(state, item, kind) {
  const body = state.world.createBody({ position: Vec2(item.x / scale, item.y / scale) });
  body.createFixture(kind === 'paddle' ? paddleShape(item.w)
    : Box(item.w / scale / 2, item.h / scale / 2), { friction: 0, restitution: 1 });
  body.setUserData({ kind, item });
  return body;
}

function addBall(state, attached = true, position, velocity) {
  const body = state.world.createDynamicBody({
    position: Vec2((position?.x ?? state.paddle.x) / scale,
      (position?.y ?? state.paddle.y - 22) / scale),
    bullet: true, fixedRotation: true, allowSleep: false
  });
  body.createFixture(Circle(ORBIT.radius / scale), { density: 1, friction: 0, restitution: 1 });
  const ball = { id: state.serial++, body, attached, offset: 0, portalCooldown: 0 };
  body.setUserData({ kind: 'ball', item: ball });
  body.setActive(!attached);
  if (velocity) body.setLinearVelocity(Vec2(velocity.x / scale, velocity.y / scale));
  state.balls.push(ball);
  return ball;
}

function prepareWave(state) {
  for (const item of [...state.bricks, ...state.barriers, ...state.balls]) state.world.destroyBody(item.body);
  state.bricks = []; state.barriers = []; state.balls = []; state.drops = []; state.missiles = [];
  state.portals = state.wave === 2 ? [{ x: state.width * .2, y: 390 }, { x: state.width * .8, y: 390 }] : [];
  const addBrick = (x, y, width, height, hp, kind = 'brick', angle = 0) => {
    const brick = { id: state.serial++, x, y, w: width, h: height, hp, maxHp: hp, kind, angle };
    brick.body = rectangle(state, brick, 'brick');
    state.bricks.push(brick);
  };
  if (state.wave === 4) {
    addBrick(state.width / 2, 240, 88, 64, 6, 'core');
    for (let armor = 0; armor < 9; armor += 1) {
      const angle = armor * Math.PI * 2 / 9;
      addBrick(state.width / 2 + Math.cos(angle) * 150, 240 + Math.sin(angle) * 125,
        60, 30, 2, 'armor', angle);
    }
    state.charges = 3; state.compute = 100;
  } else {
    const columns = state.width < 900 ? 7 : 10;
    const spacing = (state.width - 112) / columns;
    const rows = state.wave === 0 ? 4 : 5;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (state.wave === 2 && (column + row) % 5 === 0) continue;
        addBrick(56 + spacing * (column + .5), 110 + row * 40,
          spacing - 9, 27, state.wave > 0 && row < 2 ? 2 : 1);
      }
    }
  }
  if (state.wave === 1 || state.wave === 3) {
    const barrier = { x: state.width / 2, y: 350, w: 140, h: 14 };
    barrier.body = rectangle(state, barrier, 'barrier'); state.barriers.push(barrier);
  }
  state.phase = 'ready'; state.missileTimer = 3; state.contacts = [];
  addBall(state);
}

export function createOrbit({ width = ORBIT.width, wave = 0 } = {}) {
  const world = new World(Vec2(0, 0));
  const state = { mode: 'orbit', width, viewWidth: width, world, time: 0, status: 'playing', phase: 'ready',
    wave: clamp(Number.isInteger(wave) ? wave : 0, 0, ORBIT.waves.length - 1),
    score: 0, charges: 3, compute: 100, serial: 0, accumulator: 0,
    pendingLaunch: false, pendingAgent: null, balls: [], bricks: [], barriers: [], portals: [],
    contacts: [], drops: [], missiles: [], lasers: [], destroyed: 0, netCharges: 0,
    wideTime: 0, magnetTime: 0, laserTime: 0, laserCooldown: 0, queryTime: 0, shieldTime: 0,
    agentCooldowns: { patch: 0, query: 0, aegis: 0 }, transition: 0,
    paddle: { x: width / 2, y: ORBIT.paddleY, w: width < 900 ? 144 : 172, h: 16 } };
  state.paddle.baseWidth = state.paddle.w;
  state.paddle.body = rectangle(state, state.paddle, 'paddle');
  for (const wall of [{ x: 0, y: 360, w: 8, h: 720 },
    { x: width, y: 360, w: 8, h: 720 }, { x: width / 2, y: 35, w: width, h: 8 }]) {
    rectangle(state, wall, 'wall');
  }
  world.on('begin-contact', contact => {
    const first = contact.getFixtureA().getBody().getUserData();
    const second = contact.getFixtureB().getBody().getUserData();
    const ball = first?.kind === 'ball' ? first : second?.kind === 'ball' ? second : null;
    const target = ball === first ? second : first;
    if (ball && target) state.contacts.push({ ball: ball.item, target,
      downward: ball.item.body.getLinearVelocity().y > 0 });
  });
  prepareWave(state);
  return state;
}

export function setOrbitPaused(state, paused) {
  if (state.status === 'complete' || state.status === 'failed') return;
  state.status = paused ? 'paused' : 'playing';
  state.accumulator = 0; state.pendingLaunch = false; state.pendingAgent = null;
}

function damageBrick(state, brick, events) {
  if (brick.hp <= 0 || (brick.kind === 'core' && state.bricks.some(item => item.kind === 'armor' && item.hp > 0))) return;
  brick.hp -= 1; state.score += 50; state.compute = Math.min(100, state.compute + 3);
  events.push({ type: 'brick', destroyed: brick.hp === 0 });
  if (brick.hp === 0) {
    state.destroyed += 1;
    if (state.destroyed % 5 === 0 && brick.kind !== 'core') {
      const kinds = ['wide', 'multi', 'magnet', 'laser', 'net'];
      state.drops.push({ x: brick.x, y: brick.y, kind: kinds[(state.destroyed / 5 - 1) % kinds.length] });
    }
  }
}

function powerup(state, kind, events) {
  if (kind === 'wide') state.wideTime = 18;
  if (kind === 'magnet') state.magnetTime = 12;
  if (kind === 'laser') state.laserTime = 10;
  if (kind === 'net') state.netCharges = Math.min(3, state.netCharges + 1);
  if (kind === 'multi' && state.balls.length < 5) {
    const source = state.balls.find(ball => !ball.attached);
    if (source) {
      const position = source.body.getPosition();
      for (const offset of [-.6, .6]) addBall(state, false,
        { x: position.x * scale + offset * 20, y: position.y * scale }, reboundVelocity(offset, speedFor(state)));
    }
  }
  events.push({ type: 'powerup', kind });
}

function commandAgent(state, name, events) {
  const agent = AGENTS[name];
  if (!agent || state.agentCooldowns[name] > 0 || state.compute < agent.cost) return;
  state.compute -= agent.cost; state.agentCooldowns[name] = agent.cooldown;
  if (name === 'patch') state.netCharges = Math.min(3, state.netCharges + 1);
  if (name === 'query') state.queryTime = 8;
  if (name === 'aegis') state.shieldTime = 8;
  events.push({ type: 'agent', name });
}

function tick(state, input, events) {
  state.time += step;
  state.compute = Math.min(100, state.compute + step * 2);
  for (const name of Object.keys(AGENTS)) state.agentCooldowns[name] = Math.max(0, state.agentCooldowns[name] - step);
  for (const name of ['wideTime', 'magnetTime', 'laserTime', 'laserCooldown', 'queryTime', 'shieldTime']) {
    state[name] = Math.max(0, state[name] - step);
  }
  if (state.pendingAgent) commandAgent(state, state.pendingAgent, events);
  state.pendingAgent = null;
  const width = state.paddle.baseWidth + (state.wideTime > 0 ? 70 : 0);
  if (state.paddle.w !== width) {
    state.paddle.w = width;
    state.paddle.body.destroyFixture(state.paddle.body.getFixtureList());
    state.paddle.body.createFixture(paddleShape(width), { friction: 0, restitution: 1 });
  }
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  state.paddle.x = clamp(direction ? state.paddle.x + direction * 760 * step
    : Number.isFinite(input.pointerX) ? input.pointerX : state.paddle.x, width / 2 + 8, state.width - width / 2 - 8);
  state.paddle.body.setTransform(Vec2(state.paddle.x / scale, state.paddle.y / scale), 0);
  if (state.phase === 'wave-clear') {
    state.transition -= step;
    state.pendingLaunch = false;
    if (state.transition <= 0) { state.wave += 1; prepareWave(state); events.push({ type: 'wave', wave: state.wave }); }
    return;
  }
  for (const ball of state.balls) {
    ball.portalCooldown = Math.max(0, ball.portalCooldown - step);
    if (ball.attached) {
      ball.body.setTransform(Vec2((state.paddle.x + ball.offset) / scale, (state.paddle.y - 22) / scale), 0);
      if (state.pendingLaunch) {
        ball.attached = false; ball.body.setActive(true);
        const velocity = reboundVelocity(ball.offset / (width / 2) || .2, speedFor(state));
        ball.body.setLinearVelocity(Vec2(velocity.x / scale, velocity.y / scale));
        state.phase = 'playing'; events.push({ type: 'launch' });
      }
    }
  }
  state.pendingLaunch = false;
  for (const barrier of state.barriers) {
    barrier.x = state.width / 2 + Math.sin(state.time * .8) * state.width * .2;
    barrier.body.setTransform(Vec2(barrier.x / scale, barrier.y / scale), 0);
  }
  for (const brick of state.bricks) {
    if (brick.kind !== 'armor') continue;
    brick.x = state.width / 2 + Math.cos(brick.angle + state.time * .22) * 150;
    brick.y = 240 + Math.sin(brick.angle + state.time * .22) * 125;
    brick.body.setTransform(Vec2(brick.x / scale, brick.y / scale), 0);
  }
  state.world.step(step);
  for (const { ball, target, downward } of state.contacts) {
    if (target.kind === 'brick') damageBrick(state, target.item, events);
    if (target.kind === 'paddle' && downward && ball.body.getPosition().y * scale < state.paddle.y + 30) {
      ball.offset = clamp(ball.body.getPosition().x * scale - state.paddle.x, -width / 2, width / 2);
      if (state.magnetTime > 0) {
        ball.attached = true; ball.body.setActive(false);
      } else {
        const velocity = reboundVelocity(ball.offset / (width / 2), speedFor(state));
        ball.body.setLinearVelocity(Vec2(velocity.x / scale, velocity.y / scale));
      }
      events.push({ type: 'bounce' });
    }
  }
  state.contacts = [];
  for (const ball of [...state.balls]) {
    if (ball.attached) continue;
    const position = ball.body.getPosition();
    const velocity = ball.body.getLinearVelocity();
    for (let index = 0; index < state.portals.length && ball.portalCooldown === 0; index += 1) {
      const portal = state.portals[index];
      if (Math.hypot(position.x * scale - portal.x, position.y * scale - portal.y) < 26) {
        const destination = state.portals[1 - index];
        ball.body.setTransform(Vec2(destination.x / scale, (destination.y + Math.sign(velocity.y || 1) * 34) / scale), 0);
        ball.portalCooldown = .6; events.push({ type: 'portal' });
      }
    }
    const speed = speedFor(state) / scale;
    const length = Math.hypot(velocity.x, velocity.y) || 1;
    let vertical = velocity.y / length * speed;
    if (Math.abs(vertical) < speed * .28) vertical = Math.sign(vertical || -1) * speed * .28;
    const horizontal = Math.sign(velocity.x) * Math.sqrt(Math.max(0, speed * speed - vertical * vertical));
    ball.body.setLinearVelocity(Vec2(horizontal, vertical));
    if (position.y * scale > 680 && velocity.y > 0 && state.netCharges > 0) {
      state.netCharges -= 1;
      ball.body.setTransform(Vec2(position.x, 676 / scale), 0);
      ball.body.setLinearVelocity(Vec2(horizontal, -Math.abs(vertical)));
      events.push({ type: 'net' });
    } else if (position.y * scale > ORBIT.height + 20) {
      state.world.destroyBody(ball.body); state.balls = state.balls.filter(item => item !== ball);
    }
  }
  if (state.balls.length === 0) {
    if (state.charges === 0) { state.status = 'failed'; events.push({ type: 'failed' }); return; }
    state.charges -= 1; state.phase = 'ready'; addBall(state); events.push({ type: 'recovery' });
  } else if (state.balls.every(ball => ball.attached)) state.phase = 'ready';
  for (const drop of state.drops) {
    drop.y += 150 * step;
    if (drop.y >= state.paddle.y - 12 && drop.y <= state.paddle.y + 24
      && Math.abs(drop.x - state.paddle.x) < width / 2 + 12) {
      powerup(state, drop.kind, events); drop.caught = true;
    }
  }
  state.drops = state.drops.filter(drop => !drop.caught && drop.y < ORBIT.height);
  state.lasers = state.lasers.filter(laser => state.time - laser.at < .15);
  if (state.laserTime > 0 && state.laserCooldown === 0) {
    state.laserCooldown = .5;
    let target = null;
    state.world.rayCast(Vec2(state.paddle.x / scale, (state.paddle.y - 30) / scale),
      Vec2(state.paddle.x / scale, 40 / scale), (fixture, point, normal, fraction) => {
        const data = fixture.getBody().getUserData();
        if (data?.kind !== 'brick' || data.item.hp <= 0) return -1;
        target = data.item; return fraction;
      });
    if (target) damageBrick(state, target, events);
    state.lasers.push({ x: state.paddle.x, y: target?.y ?? 40, at: state.time });
  }
  if (state.wave >= 3 && state.phase === 'playing') {
    state.missileTimer -= step;
    if (state.missileTimer <= 0) {
      state.missileTimer = 4; state.missiles.push({ x: state.paddle.x, y: 320, warning: .9 });
    }
  }
  for (const missile of state.missiles) {
    if (missile.warning > 0) { missile.warning -= step; continue; }
    missile.y += 230 * step;
    if (missile.y > state.paddle.y - 35 && Math.abs(missile.x - state.paddle.x) < width / 2) {
      state.compute = Math.max(0, state.compute - (state.shieldTime > 0 ? 0 : 15));
      missile.y = ORBIT.height + 10;
      events.push({ type: state.shieldTime > 0 ? 'defend' : 'missileHit' });
    }
  }
  state.missiles = state.missiles.filter(missile => missile.y < ORBIT.height);
  for (const brick of state.bricks) if (brick.hp <= 0) state.world.destroyBody(brick.body);
  state.bricks = state.bricks.filter(brick => brick.hp > 0);
  if (state.bricks.length === 0) {
    if (state.wave === ORBIT.waves.length - 1) { state.status = 'complete'; events.push({ type: 'complete', score: state.score }); }
    else { state.phase = 'wave-clear'; state.transition = 1.4; events.push({ type: 'waveClear' }); }
  }
}

export function updateOrbit(state, input = {}, dt = 0) {
  const events = [];
  if (state.status !== 'playing') return events;
  state.pendingLaunch ||= Boolean(input.jumpPressed);
  state.pendingAgent ||= input.agentPressed ?? null;
  state.accumulator += Number.isFinite(dt) ? clamp(dt, 0, .1) : 0;
  while (state.accumulator >= step && state.status === 'playing') {
    state.accumulator -= step; tick(state, input, events);
  }
  return events;
}

export function ballPosition(ball) {
  const position = ball.body.getPosition();
  return { x: position.x * scale, y: position.y * scale };
}
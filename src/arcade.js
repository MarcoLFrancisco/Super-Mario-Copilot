import { World, Vec2, Box, Circle } from '../vendor/planck.mjs';

export const INTERLUDES = Object.freeze({
  github: { id: 'ai-invaders', title: 'AI Invaders', kind: 'invaders', difficulty: 1, color: '#9af390',
    intro: 'Defend the Azure orbital network. Pilot your AI-powered interceptor, recover tool upgrades, and stop rogue bots before they breach the cloud.',
    ending: 'The rogue orchestration core is offline. The orbital network is secure.' },
  cowork: { id: 'bubble-firewall', title: 'Bubble Firewall', kind: 'pang', difficulty: 1, color: '#ffacbd',
    intro: 'Split the bouncing data bubbles until the courtyard is clear.', ending: 'Every last bubble cleared.' },
  agents: { id: 'ai-invaders-night', title: 'AI Invaders: Night Shift', kind: 'invaders', difficulty: 2, color: '#a4e879',
    intro: 'Defend the Azure orbital network against the night-shift swarm. Recover tools and stop the rogue orchestration core.',
    ending: 'Night shift complete. The orbital network is secure.' },
  teams: { id: 'bubble-festival', title: 'Bubble Festival', kind: 'pang', difficulty: 2, color: '#8fdff5',
    intro: 'One last bubble festival before the trip to orbit.', ending: 'The festival is clear for launch.' }
});

const SCALE = 50;
const STEP = 1 / 120;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export const INVADER_TOOLS = Object.freeze({
  shield: Object.freeze({ name: 'Azure Shield', color: '#6bcfff', duration: 6, cooldown: 12, icon: 'shield' }),
  wingman: Object.freeze({ name: 'GitHub Copilot Wingman', color: '#8cf0b2', duration: 10, cooldown: 14, icon: 'bot' }),
  chain: Object.freeze({ name: 'Power Automate Chain', color: '#ffcf77', duration: 7, cooldown: 15, icon: 'workflow' }),
  pulse: Object.freeze({ name: 'Defender Pulse', color: '#ffadad', duration: 0, cooldown: 9, icon: 'radar' })
});
export const INVADER_UPGRADES = Object.freeze({
  laser: Object.freeze({ name: 'Rapid Lasers', detail: '20% faster firing', icon: 'zap' }),
  shield: Object.freeze({ name: 'Shield Capacitor', detail: '+3s Azure Shield', icon: 'shield-plus' }),
  wingman: Object.freeze({ name: 'Wingman Reserve', detail: '+5s wingman support', icon: 'bot' })
});
const BOT_TYPES = Object.freeze({
  scout: { w: 36, h: 30, health: 1, points: 100 },
  interceptor: { w: 34, h: 28, health: 1, points: 120 },
  armored: { w: 48, h: 38, health: 3, points: 200 },
  command: { w: 66, h: 44, health: 4, points: 300 }
});
const PICKUP_ORDER = ['shield', 'repair', 'wingman', 'chain', 'pulse'];

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

function shot(state, x, y, speed, owner, horizontal = 0) {
  const item = makeBody(state, { x, y, w: 6, h: 16, life: 3, owner }, owner,
    Box(3 / SCALE, 8 / SCALE), 'dynamic');
  item.body.setLinearVelocity(Vec2(horizontal / SCALE, speed / SCALE));
  state.shots.push(item);
}

function effect(state, kind, x, y, extra = {}) {
  if (state.effects.length >= 60) state.effects.shift();
  state.effects.push({ kind, x, y, life: kind === 'pulse' ? .55 : .38, serial: state.serial++, ...extra });
}

function addInvader(state, x, y, kind, row = 0) {
  const spec = BOT_TYPES[kind];
  const enemy = { ...spec, kind, x, y, homeX: x, homeY: y, row, serial: state.serial++, mode: 'formation',
    fireWarning: 0, hitFlash: 0, shielded: false, shieldCycle: 0 };
  return makeBody(state, enemy, 'invader', Box(spec.w / SCALE / 2, spec.h / SCALE / 2), 'dynamic');
}

function formation(state) {
  for (const enemy of state.invaders) remove(state, enemy);
  state.invaders = [];
  state.phase = state.wave === 4 ? 'boss' : 'combat';
  if (state.wave === 4) {
    const health = state.difficulty === 1 ? 32 : 40;
    state.core = makeBody(state, { x: 640, y: 238, w: 156, h: 108, health, maxHealth: health,
      mode: 'intro', timer: 2, cycle: 0, attack: null, hitFlash: 0 }, 'core', Box(78 / SCALE, 54 / SCALE));
    state.coreWeakPoint = makeBody(state, { x: 640, y: 238, w: 44, h: 52 }, 'coreWeakPoint', Box(22 / SCALE, 26 / SCALE));
  } else {
    const columns = 6 + (state.difficulty - 1);
    for (let row = 0; row < 3; row += 1) for (let column = 0; column < columns; column += 1) {
      const kind = state.wave === 1 ? row === 0 && column === columns - 1 ? 'armored' : 'scout'
        : row === 0 && column % 3 === 1 ? 'command'
          : row === 1 && column % 2 === 0 ? 'armored' : row === 2 || state.wave === 2 ? 'interceptor' : 'scout';
      state.invaders.push(addInvader(state, 270 + column * 103, 205 + row * 61, kind, row));
    }
  }
  if (!state.bunkers.length) for (const x of [280, 640, 1000]) {
    state.bunkers.push(makeBody(state, { x, y: 499, w: 140, h: 24, health: 8, maxHealth: 8, hitFlash: 0 },
      'bunker', Box(70 / SCALE, 12 / SCALE), 'static'));
  }
  state.direction = 1; state.enemyFire = 1.5; state.diveTimer = 3.8;
}

function dropPickup(state, x, y, kind) {
  if (state.pickups.filter(item => !item.dead).length >= 5) return;
  const pickup = makeBody(state, { x, y, kind, life: 10 }, 'pickup', Box(13 / SCALE, 13 / SCALE), 'dynamic');
  pickup.body.setLinearVelocity(Vec2(0, 80 / SCALE));
  state.pickups.push(pickup);
}

function repairNodes(state, events) {
  for (const node of state.bunkers) {
    if (node.dead) {
      node.dead = false; node.health = 0;
      makeBody(state, node, 'bunker', Box(70 / SCALE, 12 / SCALE), 'static');
    }
    node.health = Math.min(node.maxHealth, node.health + 3);
    effect(state, 'repair', node.x, node.y);
  }
  events.push({ type: 'arcadeRepair' });
}

export function activateArcadeTool(state, key, events = []) {
  const tool = state.abilities?.[key];
  if (state.kind !== 'invaders' || state.status !== 'playing' || state.phase === 'upgrade'
    || state.waveDelay > 0 || !tool || tool.charges <= 0 || tool.cooldown > 0 || tool.active > 0) return false;
  const spec = INVADER_TOOLS[key];
  tool.charges -= 1; tool.cooldown = spec.cooldown;
  tool.active = spec.duration + (key === 'shield' ? state.upgrades.shield * 3 : key === 'wingman' ? state.upgrades.wingman * 5 : 0);
  if (key === 'pulse') {
    for (const projectile of state.shots) {
      if (projectile.owner === 'enemyShot' && Math.hypot(projectile.x - state.player.x, projectile.y - state.player.y) < 270) remove(state, projectile);
    }
    effect(state, 'pulse', state.player.x, state.player.y, { radius: 270 });
  }
  if (key === 'shield') effect(state, 'shield', state.player.x, state.player.y);
  events.push({ type: 'arcadeTool', key, name: spec.name });
  return true;
}

function collectPickup(state, pickup, events) {
  remove(state, pickup);
  if (pickup.kind === 'repair') { repairNodes(state, events); return; }
  const tool = state.abilities[pickup.kind];
  tool.charges = Math.min(2, tool.charges + 1);
  if (!activateArcadeTool(state, pickup.kind, events)) events.push({ type: 'arcadePickup', key: pickup.kind });
}

export function chooseArcadeUpgrade(state, key) {
  if (state.kind !== 'invaders' || !['playing', 'paused'].includes(state.status)
    || state.phase !== 'upgrade' || !Object.hasOwn(INVADER_UPGRADES, key)) return false;
  state.upgrades[key] += 1; state.phase = 'combat'; state.wave += 1; state.waveDelay = 1.2;
  if (key !== 'laser') {
    const tool = state.abilities[key];
    if (tool.active > 0) tool.active += key === 'shield' ? 3 : 5;
    else tool.charges = Math.min(2, tool.charges + 1);
    tool.cooldown = 0;
  }
  state.health = Math.min(3, state.health + 1); state.grace = 1.8;
  state.pendingFire = false; state.wasFireHeld = false; state.accumulator = 0;
  return true;
}

function hitInvader(state, enemy, events, linked = false) {
  if (enemy.dead) return;
  enemy.hitFlash = .12;
  if (enemy.shielded) { effect(state, 'shield', enemy.x, enemy.y); return; }
  enemy.health -= 1;
  effect(state, enemy.health <= 0 ? 'burst' : 'hit', enemy.x, enemy.y);
  if (enemy.health <= 0) {
    remove(state, enemy); state.destroyed += 1; state.score += enemy.points;
    events.push({ type: 'enemyDefeated', points: enemy.points });
    if (state.destroyed % 4 === 0) {
      dropPickup(state, enemy.x, enemy.y, PICKUP_ORDER[state.pickupIndex % PICKUP_ORDER.length]);
      state.pickupIndex += 1;
    }
  } else events.push({ type: 'enemyHit' });
  if (!linked && state.abilities.chain.active > 0) {
    const targets = state.invaders.filter(target => target !== enemy && !target.dead && Math.hypot(target.x - enemy.x, target.y - enemy.y) < 185)
      .sort((left, right) => Math.hypot(left.x - enemy.x, left.y - enemy.y) - Math.hypot(right.x - enemy.x, right.y - enemy.y)).slice(0, 2);
    for (const target of targets) {
      effect(state, 'chain', enemy.x, enemy.y, { targetX: target.x, targetY: target.y });
      hitInvader(state, target, events, true);
    }
  }
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
    phase: 'combat', wasFireHeld: false, pickups: [], pickupIndex: 0, effects: [], core: null, coreWeakPoint: null, beam: null,
    abilities: Object.fromEntries(Object.keys(INVADER_TOOLS).map(key => [key, { charges: 0, active: 0, cooldown: 0 }])),
    upgrades: { laser: 0, shield: 0, wingman: 0 }, wingmanFire: 0,
    remaining: kind === 'invaders' ? 240 : 110,
    physics: new World(Vec2(0, kind === 'pang' ? 13 : 0)), player: { x: 640, y: 595, w: 44, h: 44, bank: 0, recoil: 0, vx: 0 } };
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
  state.pendingFire = false; state.wasFireHeld = false;
}

function damage(state, events) {
  if (state.grace > 0 || state.health <= 0) return;
  if (state.kind === 'invaders' && state.abilities.shield.active > 0) {
    effect(state, 'shield', state.player.x, state.player.y);
    return;
  }
  state.health -= 1; state.grace = 1.8;
  if (state.kind === 'invaders') effect(state, 'hit', state.player.x, state.player.y);
  events.push({ type: 'damage', health: state.health });
}

function finish(state, won, events) {
  if (state.status !== 'playing') return;
  state.status = won ? 'complete' : 'failed';
  if (won) state.score += 1000 + Math.floor(state.remaining) * 5;
  state.pendingFire = false;
  if (state.kind === 'invaders') {
    for (const item of [...state.shots, ...state.pickups, ...state.invaders]) remove(state, item);
    if (state.beam) remove(state, state.beam);
    if (state.coreWeakPoint) remove(state, state.coreWeakPoint);
    state.shots = []; state.pickups = []; state.beam = null;
  }
  events.push({ type: won ? 'complete' : 'failed', score: state.score });
}

function updateInvaders(state, input, events) {
  if (state.waveDelay > 0) {
    state.waveDelay -= STEP;
    if (state.waveDelay <= 0) formation(state);
    return;
  }
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const previousX = state.player.x;
  moveBody(state.player, clamp(Number.isFinite(input.pointerX) ? input.pointerX : state.player.x + direction * 410 * STEP, 55, 1225), 595);
  state.player.vx = (state.player.x - previousX) / STEP;
  state.player.bank += (clamp(state.player.vx / 410, -1, 1) * .14 - state.player.bank) * STEP * 11;
  state.player.recoil = Math.max(0, state.player.recoil - STEP);
  if ((state.pendingFire || input.holdToFire !== false && (input.fire || input.jumpHeld)) && state.fireCooldown === 0) {
    shot(state, state.player.x, 540, -730, 'playerShot'); state.fireCooldown = .22 * .8 ** state.upgrades.laser;
    state.player.recoil = .14; events.push({ type: 'shoot' });
  }
  if (state.abilities.wingman.active > 0) {
    state.wingmanFire -= STEP;
    if (state.wingmanFire <= 0) {
      shot(state, clamp(state.player.x + 43, 35, 1245), 548, -680, 'playerShot'); state.wingmanFire = .68;
      events.push({ type: 'shoot' });
    }
  }
  if (state.core && !state.core.dead) updateCore(state, events);
  const alive = state.invaders.filter(enemy => !enemy.dead);
  const march = alive.filter(enemy => enemy.mode === 'formation');
  const speed = 23 + state.difficulty * 7 + Math.max(0, 18 - alive.length) * 1.4 + state.wave * 5;
  if (march.some(enemy => enemy.homeX + state.direction * speed * STEP > 1170 || enemy.homeX + state.direction * speed * STEP < 100)) {
    state.direction *= -1;
    for (const enemy of alive) enemy.homeY += state.phase === 'boss' ? 0 : 12;
  }
  for (const enemy of alive) {
    enemy.homeX = clamp(enemy.homeX + state.direction * speed * STEP, 95, 1185);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - STEP);
    enemy.shieldCycle = (state.time + enemy.serial * .17) % 3.8;
    enemy.shielded = state.wave >= 3 && enemy.kind === 'armored' && enemy.shieldCycle < 1.25;
    if (enemy.mode === 'formation') moveBody(enemy, enemy.homeX, enemy.homeY);
    else if (enemy.mode === 'diveWarning' || enemy.mode === 'flankWarning') {
      enemy.maneuver.timer -= STEP;
      if (enemy.maneuver.timer <= 0) { enemy.mode = enemy.mode === 'diveWarning' ? 'diving' : 'flanking'; enemy.maneuver.elapsed = 0; }
    } else {
      const maneuver = enemy.maneuver;
      maneuver.elapsed += STEP;
      const progress = Math.min(1, maneuver.elapsed / maneuver.duration);
      const cross = enemy.mode === 'flanking' ? Math.sin(progress * Math.PI) : 2 * progress * (1 - progress);
      const horizontal = maneuver.startX * (1 - progress) + enemy.homeX * progress + (maneuver.targetX - maneuver.startX) * cross;
      moveBody(enemy, clamp(horizontal, 45, 1235), maneuver.startY + Math.sin(progress * Math.PI) * (568 - maneuver.startY));
      if (progress === 1) { enemy.mode = 'formation'; moveBody(enemy, enemy.homeX, enemy.homeY); }
    }
    if (enemy.fireWarning > 0) {
      enemy.fireWarning = Math.max(0, enemy.fireWarning - STEP);
      if (enemy.fireWarning === 0) {
        const vertical = 245 + state.difficulty * 20;
        shot(state, enemy.x, enemy.y + enemy.h / 2 + 7, vertical, 'enemyShot',
          clamp((enemy.aimX - enemy.x) * .28, -90, 90));
      }
    }
  }
  state.enemyFire -= STEP;
  if (state.enemyFire <= 0 && march.length && (!state.core || state.core.mode === 'exposed')) {
    const enemy = march[state.serial++ % march.length];
    if (enemy.y < 425 && state.shots.filter(item => item.owner === 'enemyShot' && !item.dead).length < 8) {
      enemy.fireWarning = .85; enemy.aimX = state.player.x;
      events.push({ type: 'arcadeWarning', attack: 'shot' });
    }
    state.enemyFire = 1.05 - state.difficulty * .1;
  }
  state.diveTimer -= STEP;
  if (state.wave >= 2 && state.phase !== 'boss' && state.diveTimer <= 0 && !alive.some(enemy => enemy.mode !== 'formation')) {
    const enemy = march.find(item => item.kind === 'interceptor' && item.fireWarning === 0);
    if (enemy) {
      const flank = state.wave === 3 && state.serial % 2 === 0;
      enemy.mode = flank ? 'flankWarning' : 'diveWarning';
      enemy.maneuver = { startX: enemy.x, startY: enemy.y, targetX: state.player.x, timer: 1.05,
        duration: flank ? 3.2 : 2.8, elapsed: 0 };
      events.push({ type: 'arcadeWarning', attack: flank ? 'flank' : 'dive' });
    }
    state.diveTimer = 4.6;
  }
  if (march.some(enemy => enemy.homeY >= 552)) state.health = 0;
}

function updateCore(state, events) {
  const core = state.core;
  core.timer = Math.max(0, core.timer - STEP); core.hitFlash = Math.max(0, core.hitFlash - STEP);
  if (core.mode === 'intro' || core.mode === 'exposed') moveBody(core, 640 + Math.sin(state.time * .5) * 85, 236 + Math.sin(state.time) * 8);
  moveBody(state.coreWeakPoint, core.x, core.y);
  if ((core.mode === 'intro' || core.mode === 'exposed') && core.timer === 0) {
    core.attack = ['drones', 'sweep', 'volley'][core.cycle % 3]; core.cycle += 1;
    core.mode = 'warning'; core.timer = core.attack === 'sweep' ? 1.65 : 1.35;
    core.aimX = state.player.x;
    core.sweepFrom = state.player.x < 640 ? 1030 : 250;
    core.sweepTo = state.player.x < 640 ? 600 : 680;
    for (const enemy of state.invaders) enemy.fireWarning = 0;
    events.push({ type: 'arcadeWarning', attack: core.attack });
  } else if (core.mode === 'warning' && core.timer === 0) {
    core.mode = 'attack'; core.timer = core.attack === 'sweep' ? 3.8 : 3;
    core.shotTimer = .1; core.shotCount = 0;
    if (core.attack === 'drones') {
      const count = Math.min(3, 4 - state.invaders.filter(enemy => !enemy.dead).length);
      for (let index = 0; index < count; index += 1) state.invaders.push(addInvader(state, 320 + index * 290, 330, 'scout', 2));
    }
    if (core.attack === 'sweep') state.beam = makeBody(state,
      { x: core.sweepFrom, y: 446, w: 42, h: 358 }, 'beam', Box(21 / SCALE, 179 / SCALE), 'dynamic');
  } else if (core.mode === 'attack') {
    if (core.attack === 'sweep') {
      const progress = 1 - core.timer / 3.8;
      moveBody(state.beam, core.sweepFrom + (core.sweepTo - core.sweepFrom) * progress, 446);
    } else if (core.attack === 'volley') {
      core.shotTimer -= STEP;
      if (core.shotTimer <= 0 && core.shotCount < 3) {
        const horizontal = clamp((core.aimX - core.x) * .28 + (core.shotCount - 1) * 45, -145, 145);
        shot(state, core.x, core.y + 62, 265, 'enemyShot', horizontal);
        core.shotCount += 1; core.shotTimer = .7;
      }
    }
    if (core.timer === 0) {
      if (state.beam) remove(state, state.beam);
      state.beam = null; core.mode = 'exposed'; core.timer = 5.4;
      events.push({ type: 'arcadeCoreExposed' });
    }
  }
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
    const pickup = find('pickup');
    const core = find('core');
    const weakPoint = find('coreWeakPoint');
    const bubble = find('bubble');
    const harpoon = find('harpoon');
    if (player && (enemyShot || bubble || invader || find('beam'))) {
      damage(state, events);
      if (enemyShot) remove(state, enemyShot);
    }
    if (player && pickup) collectPickup(state, pickup, events);
    if (playerShot && invader) {
      remove(state, playerShot); hitInvader(state, invader, events);
    }
    if (playerShot && core) {
      const horizontal = playerShot.body.getPosition().x * SCALE;
      if (core.mode !== 'exposed' || Math.abs(horizontal - core.x) > 25) {
        remove(state, playerShot); core.hitFlash = .1;
        effect(state, 'shield', core.x, core.y);
      }
    }
    if (playerShot && weakPoint && !playerShot.dead && state.core.mode === 'exposed') {
      const target = state.core;
      remove(state, playerShot);
      if (!target.dead) {
        target.hitFlash = .1; target.health -= 1; effect(state, 'hit', target.x, target.y);
        events.push({ type: 'enemyHit' });
        if (target.health <= 0) {
          effect(state, 'burst', target.x, target.y, { large: true }); remove(state, target);
          remove(state, weakPoint);
          state.score += 1500; state.destroyed += 1;
          events.push({ type: 'arcadeCoreDefeated' });
        }
      }
    }
    if (bunker && enemyShot) {
      remove(state, enemyShot); bunker.health -= 1; bunker.hitFlash = .18;
      effect(state, 'hit', bunker.x, bunker.y);
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
  if (state.kind === 'invaders') {
    for (const tool of Object.values(state.abilities)) {
      tool.active = Math.max(0, tool.active - STEP); tool.cooldown = Math.max(0, tool.cooldown - STEP);
    }
    for (const item of state.effects) item.life -= STEP;
    state.effects = state.effects.filter(item => item.life > 0);
    for (const node of state.bunkers) node.hitFlash = Math.max(0, node.hitFlash - STEP);
  }
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
  for (const pickup of state.pickups) {
    if (pickup.dead) continue;
    const position = pickup.body.getPosition(); pickup.x = position.x * SCALE; pickup.y = position.y * SCALE;
    pickup.life -= STEP;
    if (pickup.life <= 0 || pickup.y > 675) remove(state, pickup);
  }
  state.pickups = state.pickups.filter(item => !item.dead);
  state.bubbles = state.bubbles.filter(item => !item.dead);
  state.ropes = state.ropes.filter(item => !item.dead);
  for (const bubble of state.bubbles) {
    const position = bubble.body.getPosition(); bubble.x = position.x * SCALE; bubble.y = position.y * SCALE;
    const velocity = bubble.body.getLinearVelocity();
    bubble.body.setLinearVelocity(Vec2(Math.sign(velocity.x || bubble.horizontal) * Math.abs(bubble.horizontal) / SCALE, velocity.y));
  }
  if (state.health <= 0 || state.remaining === 0) { finish(state, false, events); return; }
  if (state.kind === 'pang' && state.bubbles.length === 0) finish(state, true, events);
  if (state.kind === 'invaders' && state.core?.dead) { finish(state, true, events); return; }
  if (state.kind === 'invaders' && !state.core && state.waveDelay <= 0 && state.invaders.every(enemy => enemy.dead)) {
    for (const item of state.shots) remove(state, item);
    for (const pickup of state.pickups) if (!pickup.dead) collectPickup(state, pickup, events);
    state.shots = []; state.pickups = []; state.phase = 'upgrade'; state.accumulator = 0;
    events.push({ type: 'arcadeUpgrade', wave: state.wave });
  }
}

export function updateArcade(state, input = {}, dt = 0) {
  const events = [];
  if (state.status !== 'playing' || state.kind === 'invaders' && state.phase === 'upgrade') return events;
  const held = Boolean(input.fire || input.jumpHeld);
  state.pendingFire ||= Boolean(input.jumpPressed || input.attackPressed || held && !state.wasFireHeld);
  state.wasFireHeld = held;
  if (input.abilityPressed) activateArcadeTool(state, input.abilityPressed, events);
  state.accumulator += Number.isFinite(dt) ? clamp(dt, 0, .1) : 0;
  while (state.accumulator >= STEP && state.status === 'playing' && state.phase !== 'upgrade') {
    state.accumulator -= STEP;
    tick(state, input, events);
  }
  return events;
}

export function arcadeObjective(state) {
  if (state.kind === 'invaders') return state.phase === 'upgrade' ? 'Sector secured. Choose an upgrade.'
    : state.core ? `Rogue Orchestration Core | ${state.core.mode === 'exposed' ? 'Core exposed' : state.core.mode === 'warning' ? 'Attack incoming' : 'Defend the network'}`
      : `Wave ${state.wave} / 4 | ${state.invaders.filter(enemy => !enemy.dead).length} bots remaining`;
  return `${state.bubbles.length} bubbles remaining`;
}
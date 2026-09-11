import { LEVEL, PHYSICS, VIEW } from './level.js';

// Immutable encounter definitions. Runtime modules must copy mutable fields.
// Coordinates are pixels; x/y identify top-left corners; time is seconds.
// Patrol minX/maxX bound the enemy's LEFT edge, not its center.
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const COMBAT = freeze({
  maxHealth: 3,
  damageGrace: 1.4,
  invincibilityDuration: 10,
  fireCooldown: .24,
  projectileSpeed: 690,
  projectileLifetime: 1.6,
  projectileDamage: 1,
  stompBounce: 510,
  knockbackSpeed: 220,
  maxPlayerProjectiles: 8,
  maxEnemyProjectiles: 48,
  enemyScore: 200
});

export const ENEMY_TYPES = freeze({
  robot: { name: 'Glitch bot', w: 30, h: 34, speed: 65, health: 2, stompable: true },
  worm: { name: 'Malware worm', w: 42, h: 22, speed: 48, health: 1, stompable: true },
  drone: { name: 'Spam drone', w: 32, h: 28, speed: 72, health: 1,
    stompable: false, hoverHeight: 90, hoverAmplitude: 12, attackInterval: 3.2, warningTime: .8 }
});

function surface(index) {
  const platform = LEVEL.platforms[index];
  if (!platform) throw new Error(`Missing encounter platform ${index}`);
  return platform;
}
function patrol(id, kind, index, left, right) {
  const p = surface(index);
  const type = ENEMY_TYPES[kind];
  const minX = p.x + left;
  const maxX = p.x + right - type.w;
  if (left < 0 || right > p.w || maxX < minX) {
    throw new Error(`Invalid patrol bounds: ${id}`);
  }
  return { id, kind, platformId: p.id, x: minX,
    y: p.y - type.h - (type.hoverHeight || 0),
    minX, maxX, facing: 1, checkpointIndex: index < 4 ? 0 : index < 8 ? 1 : index < 12 ? 2 : 3 };
}

const enemies = [
  patrol('bug-robot-1', 'robot', 1, 35, 225),
  patrol('bug-worm-1', 'worm', 2, 30, 230),
  patrol('bug-drone-1', 'drone', 3, 35, 290),
  patrol('bug-worm-2', 'worm', 5, 30, 230),
  patrol('bug-robot-2', 'robot', 6, 30, 220),
  patrol('bug-drone-2', 'drone', 7, 35, 290),
  patrol('bug-robot-3', 'robot', 9, 30, 220),
  patrol('bug-worm-3', 'worm', 10, 25, 215),
  patrol('bug-drone-3', 'drone', 11, 25, 265),
  patrol('bug-worm-4', 'worm', 13, 25, 225),
  patrol('bug-robot-4', 'robot', 14, 25, 215),
  patrol('bug-drone-4', 'drone', 15, 25, 265),
  patrol('bug-robot-5', 'robot', 16, 180, 410)
];

// These clusters sit before optional upper platforms, leaving headroom and
// checkpoint spawn positions clear. Brick undersides are reachable by jumping.
const blocks = [];
for (const [index, offset, reward] of [
  [0, 200, 'blaster'], [4, 100, 'blaster'],
  [8, 80, 'blaster'], [12, 50, 'blaster'], [16, 70, 'microsoft']
]) {
  const p = surface(index);
  for (let i = 0; i < 3; i++) {
    blocks.push({ id: `block-${index}-${i}`, x: p.x + offset + i * 36,
      y: p.y - 142, w: 32, h: 32, app: p.app,
      kind: i === 1 ? 'reward' : 'brick', reward: i === 1 ? reward : null });
  }
}

// Recruitment slots resolve to the two non-selected characters at run creation.
// Keep stable box IDs and reachable geometry; existing blaster rewards stay intact.
for (const [id, index, offset, reward] of [
  ['helper-box-donkey', 0, 550, 'recruit-first'],
  ['helper-box-mario', 4, 280, 'recruit-second']
]) {
  const p = surface(index);
  blocks.push({ id, x: p.x + offset, y: p.y - 142,
    w: 32, h: 32, app: p.app, kind: 'reward', reward });
}

function protection(id, index, offset) {
  const p = surface(index);
  return { id, kind: 'microsoft', x: p.x + offset, y: p.y - 75, w: 26, h: 26 };
}

export const ENCOUNTERS = freeze({
  enemies,
  blocks,
  pickups: [protection('protection-inbox', 4, 320), protection('protection-teams', 8, 350)],
  // Power-ups and recruits never increment productivity counters.
  // Recruitment slots are resolved before blocks can release their pickups.
  rewardTypes: ['blaster', 'microsoft', 'recruit-first', 'recruit-second',
    'helper-marco', 'helper-donkey', 'helper-mario']
});

// Arena uses its own coordinate space. Enter it at the world beacon; do not
// extend LEVEL.width or let ordinary world hazards leak into this stage.
export const ARENA = freeze({
  name: 'The Hallucination Engine',
  width: VIEW.width,
  height: VIEW.height,
  deathY: 810,
  checkpointName: 'AI Core Checkpoint',
  spawn: { x: 100, y: 630 - PHYSICS.playerHeight },
  grantBlaster: true,
  platforms: [
    { id: 'arena-floor', x: 0, y: 630, w: VIEW.width, h: 50, app: 'copilot', kind: 'normal' },
    { id: 'arena-left', x: 200, y: 520, w: 180, h: 24, app: 'teams', kind: 'normal' },
    { id: 'arena-center', x: 480, y: 435, w: 190, h: 24, app: 'outlook', kind: 'normal' },
    { id: 'arena-right', x: 770, y: 520, w: 180, h: 24, app: 'copilot', kind: 'normal' }
  ],
  boss: { x: 1030, y: 385, w: 140, h: 160, health: 24,
    damageGrace: .18, introDuration: 2, vulnerableDuration: 3.2 },
  // Attacks alternate with exposed-core windows. Telegraphs precede damage.
  phases: [
    { name: 'Token Storm', healthAbove: 16, attack: 'tokens',
      warningTime: 1, attackDuration: 3.5, projectileSpeed: 210, interval: .7 },
    { name: 'Agent Swarm', healthAbove: 8, attack: 'agents',
      warningTime: 1, attackDuration: 4, summonCount: 3, dangerDuration: .65 },
    { name: 'Context Collapse', healthAbove: 0, attack: 'waves',
      warningTime: .9, attackDuration: 4, waveSpeed: 260, interval: 1.2 }
  ],
  summonPoints: [240, 540, 800],
  maxMinions: 3
});

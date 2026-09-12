// World coordinates use pixels, positive Y downward. Rectangles use x/y/w/h.
// Platforms are static, one-way landing surfaces; hazards are solid hitboxes.
// Keep this configuration immutable: runtime progress belongs in engine state.
export const VIEW = Object.freeze({ width: 1280, height: 720 });

export const PHYSICS = Object.freeze({
  playerWidth: 34,
  playerHeight: 46,
  speed: 330,
  acceleration: 2200,
  friction: 2600,
  gravity: 1900,
  jumpSpeed: 720,
  jumpReleaseSpeed: 360,
  maxFallSpeed: 1000,
  coyoteTime: 0.12,
  jumpBuffer: 0.14,
  boostSpeed: 650,
  boostDuration: 0.18,
  boostCooldown: 1.5,
  comboWindow: 2.5,
  maxCombo: 8,
  sparkScore: 100
});

export const APPS = Object.freeze({
  excel: Object.freeze({ label: 'Courtyard', glyph: '+', color: '#52c5aa', dark: '#21695f' }),
  outlook: Object.freeze({ label: 'Gardens', glyph: '+', color: '#57b9de', dark: '#316981' }),
  teams: Object.freeze({ label: 'Lab', glyph: '+', color: '#f09076', dark: '#8d4b46' }),
  copilot: Object.freeze({ label: 'Energy', glyph: '+', color: '#e6bc4c', dark: '#776328' })
});

const platforms = [];
function platform(x, y, w, app, kind = 'normal') {
  const item = { id: `platform-${platforms.length}`, x, y, w, h: 28, app, kind };
  platforms.push(item);
  return item;
}

platform(0, 610, 640, 'excel');
platform(620, 700, 380, 'excel', 'recovery');
platform(920, 630, 190, 'excel');
platform(1000, 550, 450, 'excel');
platform(1560, 600, 460, 'outlook');
platform(2150, 540, 350, 'outlook');
platform(2630, 585, 460, 'outlook');
platform(3030, 690, 430, 'teams', 'recovery');
platform(3370, 610, 240, 'teams');
platform(3500, 530, 430, 'teams');
platform(4050, 585, 440, 'teams');
platform(4490, 610, 1710, 'copilot');
platform(360, 495, 170, 'excel', 'secret');
platform(610, 395, 190, 'excel', 'secret');
platform(900, 335, 170, 'excel', 'secret');
platform(1180, 405, 160, 'excel', 'secret');
platform(1690, 485, 170, 'outlook', 'secret');
platform(1940, 385, 190, 'outlook', 'secret');
platform(2220, 335, 180, 'outlook', 'secret');
platform(3580, 415, 170, 'teams', 'secret');
platform(3830, 325, 190, 'teams', 'secret');
platform(4140, 435, 180, 'teams', 'secret');
platform(5140, 540, 150, 'copilot', 'boss');
platform(5350, 470, 150, 'copilot', 'boss');
platform(5560, 405, 180, 'copilot', 'boss');

const hazards = [
  { x: 1770, y: 576, w: 46, h: 24 },
  { x: 4220, y: 561, w: 48, h: 24 }
].map((item, i) => ({ ...item, id: `hazard-${i}`, kind: 'glitch' }));

const suggestions = [
  { id: 'garden-link', name: 'Garden access', x: 545, y: 610,
    platform: { id: 'garden-bridge', x: 610, y: 550, w: 430, h: 28, app: 'copilot', kind: 'suggestion' } },
  { id: 'lab-link', name: 'Lab access', x: 2960, y: 585,
    platform: { id: 'lab-bridge', x: 3020, y: 520, w: 590, h: 28, app: 'copilot', kind: 'suggestion' } }
];

const enemies = [
  { id: 'syntax-1', x: 1210, y: 524, w: 34, h: 26, minX: 1150, maxX: 1380, speed: 52 },
  { id: 'syntax-2', x: 2800, y: 559, w: 34, h: 26, minX: 2700, maxX: 2880, speed: 64 }
];

const sparks = [];
for (const surface of platforms) {
  const count = Math.max(2, Math.floor(surface.w / 85));
  for (let i = 0; i < count; i += 1) {
    const x = surface.x + 35 + i * (surface.w - 70) / (count - 1);
    // Lift sparks over glitches to telegraph the jump rather than lure into damage.
    const overHazard = hazards.some(h => x > h.x - 25 && x < h.x + h.w + 25);
    sparks.push({
      id: `spark-${sparks.length}`,
      x,
      y: surface.y - (overHazard ? 95 : 58),
      radius: 11,
      secret: surface.kind === 'secret',
      app: surface.app
    });
  }
}

// Spawn coordinates are the player's top-left, on the named platform.
const checkpoints = [
  { id: 'launch', name: 'Courtyard', x: 100, y: 610, spawn: { x: 80, y: 564 } },
  { id: 'gardens', name: 'Keyboard Gardens', x: 1600, y: 600, spawn: { x: 1570, y: 554 } },
  { id: 'lab', name: 'Innovation Lab', x: 3535, y: 530, spawn: { x: 3505, y: 484 } },
  { id: 'wizard', name: 'Wizard Checkpoint', x: 4750, y: 610, spawn: { x: 4710, y: 564 } }
];

const zones = [
  { x: 0, end: 1500, app: 'excel', name: 'Copilot Courtyard', sky: '#b7e8ed' },
  { x: 1500, end: 3300, app: 'outlook', name: 'Keyboard Gardens', sky: '#cae6f3' },
  { x: 3300, end: 4650, app: 'teams', name: 'Innovation Lab', sky: '#c4dfeb' },
  { x: 4650, end: 6200, app: 'copilot', name: 'The Setup Wizard', sky: '#f4d8cb' }
];

const signs = [
  { x: 180, y: 440, text: 'REBOOT CAMPUS', app: 'excel' },
  { x: 1640, y: 415, text: 'KEYBOARD GARDENS', app: 'outlook' },
  { x: 3460, y: 285, text: 'INNOVATION LAB', app: 'teams' },
  { x: 4850, y: 335, text: 'ONBOARDING IN PROGRESS', app: 'copilot' }
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const LEVEL = deepFreeze({
  title: 'Copilot Campus',
  width: 6200,
  height: 900,
  deathY: 810,
  spawn: { ...checkpoints[0].spawn },
  platforms,
  hazards,
  suggestions,
  enemies,
  sparks,
  checkpoints,
  zones,
  signs,
  boss: { x: 5615, y: 430, w: 120, h: 136, arenaX: 4880, health: 3,
    switch: { x: 5650, y: 358, w: 56, h: 47 } },
  goal: { x: 6060, y: 480, w: 70, h: 130 }
});

export function zoneAt(x) {
  return LEVEL.zones.find(zone => x >= zone.x && x < zone.end)
    ?? (x < 0 ? LEVEL.zones[0] : LEVEL.zones[LEVEL.zones.length - 1]);
}

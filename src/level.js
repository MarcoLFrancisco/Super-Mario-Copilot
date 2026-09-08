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
  excel: Object.freeze({ label: 'Excel', glyph: 'X', color: '#37d99b', dark: '#125440' }),
  outlook: Object.freeze({ label: 'Outlook', glyph: 'O', color: '#54c6ff', dark: '#124e80' }),
  word: Object.freeze({ label: 'Word', glyph: 'W', color: '#73adff', dark: '#185abd' }),
  teams: Object.freeze({ label: 'Teams', glyph: 'T', color: '#b0a0ff', dark: '#443881' }),
  copilot: Object.freeze({ label: 'Copilot', glyph: '✦', color: '#f2a8e1', dark: '#653a7d' })
});

// In-game achievements only: these do not perform Microsoft service actions.
export const PRODUCTIVITY = Object.freeze({
  outlook: 'Emails reviewed',
  excel: 'Excel files created',
  word: 'Word docs created',
  teams: 'Teams conversations completed',
  copilot: 'Copilot prompts completed'
});

const platforms = [];
function platform(x, y, w, app, kind = 'normal') {
  const item = { id: `platform-${platforms.length}`, x, y, w, h: 28, app, kind };
  platforms.push(item);
  return item;
}

// Main route: gaps <= 140px and upward steps <= 70px. With the shared
// physics a full jump rises about 136px; boost is optional, never required.
platform(0, 610, 640, 'excel');
platform(740, 570, 260, 'excel');
platform(1100, 515, 260, 'excel');
platform(1460, 565, 340, 'excel');
platform(1910, 610, 420, 'outlook');
platform(2450, 555, 260, 'outlook');
platform(2830, 495, 250, 'outlook');
platform(3200, 550, 330, 'outlook');
platform(3650, 600, 450, 'teams');
platform(4210, 540, 250, 'teams');
platform(4580, 480, 240, 'teams');
platform(4940, 535, 300, 'teams');
platform(5360, 590, 430, 'copilot');
platform(5900, 520, 250, 'copilot');
platform(6270, 470, 240, 'copilot');
platform(6630, 535, 300, 'copilot');
platform(7030, 595, 650, 'copilot');

// Optional higher routes rejoin the main path. Their undersides do not block jumps.
platform(360, 495, 170, 'excel', 'secret');
platform(610, 395, 190, 'excel', 'secret');
platform(900, 335, 170, 'excel', 'secret');
platform(1180, 405, 160, 'excel', 'secret');
platform(2080, 495, 170, 'outlook', 'secret');
platform(2330, 395, 190, 'outlook', 'secret');
platform(2610, 335, 180, 'outlook', 'secret');
platform(2900, 385, 150, 'outlook', 'secret');
platform(3810, 485, 170, 'teams', 'secret');
platform(4060, 385, 190, 'teams', 'secret');
platform(4350, 315, 180, 'teams', 'secret');
platform(4650, 370, 150, 'teams', 'secret');
platform(5510, 475, 170, 'copilot', 'secret');
platform(5760, 375, 190, 'copilot', 'secret');
platform(6050, 310, 180, 'copilot', 'secret');
platform(6350, 360, 150, 'copilot', 'secret');

const hazards = [
  { x: 1630, y: 541, w: 46, h: 24 },
  { x: 3360, y: 526, w: 48, h: 24 },
  { x: 5060, y: 511, w: 48, h: 24 },
  { x: 6760, y: 511, w: 48, h: 24 }
].map((item, i) => ({ ...item, id: `hazard-${i}`, kind: 'glitch' }));

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
      // Replace the last item of longer trails, preserving IDs, positions,
      // total count, and the original app on every platform. Short optional
      // trails retain their app; longer upper trails also contain Word docs.
      app: count >= 3 && i === count - 1 ? 'word' : surface.app
    });
  }
}

// Spawn coordinates are the player's top-left, on the named platform.
const checkpoints = [
  { id: 'launch', name: 'Launchpad', x: 100, y: 610, spawn: { x: 80, y: 564 } },
  { id: 'inbox', name: 'Inbox Island', x: 1980, y: 610, spawn: { x: 1950, y: 564 } },
  { id: 'meeting', name: 'Together Terrace', x: 3720, y: 600, spawn: { x: 3690, y: 554 } },
  { id: 'studio', name: 'Copilot Studio', x: 5430, y: 590, spawn: { x: 5400, y: 544 } }
];

const zones = [
  { x: 0, end: 1850, app: 'excel', name: 'Excel Terraces', sky: '#103b45' },
  { x: 1850, end: 3590, app: 'outlook', name: 'Outlook Mailways', sky: '#123a65' },
  { x: 3590, end: 5300, app: 'teams', name: 'Teams Skybridges', sky: '#302d62' },
  { x: 5300, end: 7800, app: 'copilot', name: 'Copilot Aurora', sky: '#432654' }
];

const signs = [
  { x: 220, y: 520, text: 'Every great idea starts with a leap.', app: 'excel' },
  { x: 780, y: 260, text: 'Think outside the cell.', app: 'excel' },
  { x: 2040, y: 530, text: 'Inbox zero. Possibilities infinite.', app: 'outlook' },
  { x: 3760, y: 520, text: 'Better jumps, together.', app: 'teams' },
  { x: 5490, y: 510, text: 'Shift: give your idea a boost.', app: 'copilot' },
  { x: 7100, y: 475, text: 'Your next big idea is here.', app: 'copilot' }
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const LEVEL = deepFreeze({
  title: 'From Inbox to Infinity',
  width: 7800,
  height: 900,
  deathY: 810,
  spawn: { ...checkpoints[0].spawn },
  platforms,
  hazards,
  sparks,
  checkpoints,
  zones,
  signs,
  goal: { x: 7470, y: 465, w: 70, h: 130 }
});

// Derive counters from collected IDs instead of maintaining duplicate state.
// This prevents checkpoint respawns or repeated events from double counting.
// Unknown IDs (including combat rewards) are intentionally ignored.
export function productivityCounts(collected) {
  const counts = Object.fromEntries(Object.keys(PRODUCTIVITY).map(app => [app, 0]));
  for (const item of LEVEL.sparks) {
    if (collected.has(item.id) && Object.hasOwn(counts, item.app)) counts[item.app] += 1;
  }
  return counts;
}

export const PRODUCTIVITY_TOTALS = Object.freeze(
  productivityCounts(new Set(LEVEL.sparks.map(item => item.id)))
);

export function zoneAt(x) {
  return LEVEL.zones.find(zone => x >= zone.x && x < zone.end)
    ?? (x < 0 ? LEVEL.zones[0] : LEVEL.zones[LEVEL.zones.length - 1]);
}

import { PHYSICS } from './level.js';

const layouts = {
  campus: { name: 'Garden terraces', difficulty: 'Easy', anchors: [0, 4, 12], kind: 'ladder',
    steps: [[370, 225, 240], [700, 280, 200], [1040, 220, 240]] },
  github: { name: 'Branching canopy', difficulty: 'Medium', anchors: [0, 8, 12], kind: 'rope',
    steps: [[350, 260, 155], [580, 330, 125], [805, 255, 135], [1060, 310, 150], [1270, 235, 180]] },
  cowork: { name: 'Archive mezzanines', difficulty: 'Easy', anchors: [0, 4, 12], kind: 'ladder',
    steps: [[370, 245, 440], [940, 355, 320], [970, 455, 150]] },
  foundry: { name: 'Conveyor gantries', difficulty: 'Hard', anchors: [0, 4, 8, 12], kind: 'ladder',
    steps: [[370, 235, 190], [690, 305, 145], [960, 235, 200], [1190, 315, 130]], conveyor: 60 },
  agents: { name: 'Rooftop network', difficulty: 'Medium', anchors: [0, 4, 12], kind: 'rope',
    steps: [[360, 235, 270], [720, 310, 210], [1020, 245, 260], [1380, 290, 170]] },
  teams: { name: 'Meeting tower shafts', difficulty: 'Hard', anchors: [0, 4, 8, 12], kind: 'ladder',
    steps: [[360, 210, 200], [375, 365, 185], [700, 285, 170], [940, 205, 220]] },
  core: { name: 'Command circuit', difficulty: 'Expert', anchors: [0, 8, 12], kind: 'rope',
    steps: [[360, 215, 150], [610, 300, 125], [845, 220, 150], [1090, 320, 130], [1340, 255, 170]], conveyor: -45 }
};

function routeClearance(deck, platforms) {
  return platforms.every(other => {
    const travelX = other.motion?.axis === 'x' ? other.motion.distance : 0;
    const travelY = other.motion?.axis === 'y' ? other.motion.distance : 0;
    return deck.x + deck.w <= other.x - travelX - 20 || deck.x >= other.x + other.w + travelX + 20
      || deck.y + deck.h + PHYSICS.playerHeight + 12 <= other.y - travelY
      || deck.y >= other.y + other.h + travelY + PHYSICS.playerHeight + 12;
  });
}

function placeDeck(deck, anchor, first, platforms) {
  const candidates = [];
  for (let horizontal = -360; horizontal <= 360; horizontal += 20) {
    const position = deck.x + horizontal;
    if (position < anchor.x + 60 || (first && position >= anchor.x + anchor.w - 90)) continue;
    for (let vertical = -192; vertical <= 144; vertical += 12) {
      const height = deck.y + vertical;
      if (height < 190 || height > anchor.y - 96) continue;
      candidates.push({ ...deck, x: position, y: height, distance: Math.abs(horizontal) + Math.abs(vertical) * 1.25 });
    }
  }
  const placed = candidates.sort((left, right) => left.distance - right.distance)
    .find(candidate => routeClearance(candidate, platforms));
  if (!placed) throw new Error(`No clear traversal placement for ${deck.id}`);
  return { ...deck, x: placed.x, y: placed.y };
}

export function placeRewardBlocks(blocks, mainRoute, platforms, climbs, stations) {
  const placed = [];
  const groups = [];
  for (const block of blocks) {
    const row = groups.find(group => group[0].y === block.y && group.at(-1).x + 36 === block.x
      && !block.reward?.startsWith('recruit-'));
    if (row) row.push(block);
    else groups.push([block]);
  }
  for (const group of groups) {
    const first = group[0];
    const floor = mainRoute.find(platform => first.x >= platform.x && first.x < platform.x + platform.w);
    const width = group.at(-1).x + 32 - first.x;
    const candidates = [];
    for (let position = floor.x + 24; position <= floor.x + floor.w - width - 24; position += 12) {
      for (const drop of [0, 12, 24]) candidates.push({ x: position, y: first.y + drop,
        distance: Math.abs(position - first.x) + drop * 2 });
    }
    const position = candidates.sort((left, right) => left.distance - right.distance).find(candidate => {
      const area = { x: candidate.x, y: candidate.y, w: width, h: first.h };
      return routeClearance(area, platforms)
        && climbs.every(climb => candidate.x + width + 24 < climb.x - climb.width / 2 || candidate.x - 24 > climb.x + climb.width / 2
          || candidate.y + first.h < climb.top || candidate.y > climb.bottom)
        && stations.every(station => Math.abs(station.y - floor.y) > 50 || candidate.x + width < station.x - 100 || candidate.x > station.x + 100)
        && placed.every(block => candidate.x + width + 24 <= block.x || candidate.x >= block.x + block.w + 24 || Math.abs(candidate.y - block.y) > 70);
    });
    if (position === undefined) throw new Error(`No clear reward placement for ${first.id}`);
    const shift = position.x - first.x;
    for (const block of group) { block.x += shift; block.y = position.y; placed.push(block); }
  }
}

export function addWorldRoutes(definition, platforms, mainRoute) {
  const layout = layouts[definition.id];
  const climbs = [];
  const landmarks = [];
  for (const [section, anchorIndex] of layout.anchors.entries()) {
    const anchor = mainRoute[anchorIndex];
    const decks = layout.steps.map(([offset, rise, width], position) => {
      const platform = placeDeck({ id: `${definition.id}-route-${section}-${position}`, x: anchor.x + offset,
        y: Math.max(235, anchor.y - rise), w: width, h: 24, app: definition.app,
        theme: definition.theme, kind: 'secret', structure: definition.id,
        conveyor: layout.conveyor && position % 2 === 0 ? layout.conveyor : 0 }, anchor, position === 0, platforms);
      platforms.push(platform);
      return platform;
    });
    const first = decks[0];
    climbs.push({ id: `${definition.id}-climb-${section}`, x: first.x + 44,
      top: first.y, bottom: anchor.y, kind: layout.kind, width: 42 });
    for (let position = 1; position < decks.length; position += 1) {
      const deck = decks[position];
      const below = [...mainRoute, ...decks.slice(0, position)].filter(floor => floor.y > deck.y + 50
        && deck.x + 50 > floor.x + 25 && deck.x + 50 < floor.x + floor.w - 25)
        .sort((first, second) => first.y - second.y)[0];
      if (below && (definition.id === 'teams' || definition.id === 'cowork' || position === decks.length - 1)) {
        climbs.push({ id: `${definition.id}-climb-${section}-${position}`, x: deck.x + 50,
          top: deck.y, bottom: below.y, kind: position % 2 ? 'ladder' : layout.kind, width: 42 });
      }
    }
    landmarks.push({ x: anchor.x + 700, theme: definition.theme, chapter: definition.chapters[section % 4] });
  }
  return { climbs, landmarks, traversal: layout.name, difficulty: layout.difficulty };
}
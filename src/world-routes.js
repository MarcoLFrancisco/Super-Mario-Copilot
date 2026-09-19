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

export function addWorldRoutes(definition, platforms, mainRoute) {
  const layout = layouts[definition.id];
  const climbs = [];
  const landmarks = [];
  for (const [section, anchorIndex] of layout.anchors.entries()) {
    const anchor = mainRoute[anchorIndex];
    const decks = layout.steps.map(([offset, rise, width], position) => {
      const platform = { id: `${definition.id}-route-${section}-${position}`, x: anchor.x + offset,
        y: Math.max(235, anchor.y - rise), w: width, h: 24, app: definition.app,
        theme: definition.theme, kind: 'secret', structure: definition.id,
        conveyor: layout.conveyor && position % 2 === 0 ? layout.conveyor : 0 };
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
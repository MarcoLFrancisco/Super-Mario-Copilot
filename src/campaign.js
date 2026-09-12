import { PHYSICS, VIEW } from './level.js';
import { ARENA, ENEMY_TYPES } from './encounters.js';
import { createState, update, setPaused } from './engine.js';
import { createOrbit, updateOrbit, setOrbitPaused } from './orbit.js';
import { CHARACTERS, resetPartyMotion } from './party.js';
import { WORK_TASKS, handoffTask } from './work-tasks.js';

const definitions = [
  {
    id: 'campus', title: 'Copilot Campus', subtitle: 'Assistance, on your terms', theme: 'campus', app: 'copilot',
    color: '#65e0d2', sky: ['#459bcc', '#d4f0ed'], ground: ['#d6f6ed', '#277b80'],
    chapters: ['Campus Courtyard', 'Keyboard Gardens', 'Innovation Lab', 'Tower Ascent'],
    boss: 'The Setup Wizard', bossStyle: 'wizard', unlock: 'Copilot Dash',
    intro: 'The launch team needs a Word brief, an Excel sales workbook, and a customer deck. Use Copilot with the right work context, review its drafts, and deliver the files.',
    ending: 'Campus access restored. The repository forest is still splitting into unstable branches.',
    phases: ['Loading Rings', 'Popup Cascade', 'Restart Required'], attacks: ['waves', 'agents', 'tokens'],
    route: [[0,610,720],[820,560,290],[1210,500,280],[1590,565,390],[2090,610,640],[2830,550,310],[3240,485,280],[3620,545,450],[4180,600,650],[4930,535,300],[5340,475,270],[5710,535,430],[6250,600,700],[7050,540,320],[7470,485,290],[7860,550,840]],
    upper: [[360,495,170],[610,400,190],[930,320,180],[2370,490,200],[2660,380,210],[4470,480,190],[4760,375,210],[6500,490,200],[6790,380,220]],
  },
  {
    id: 'github', title: 'GitHub Copilot', subtitle: 'Branch Out', theme: 'github', app: 'copilot',
    color: '#99edaf', sky: ['#172e39', '#376a63'], ground: ['#b6f3d1', '#235852'],
    chapters: ['Main Branch Grove', 'Feature Canopy', 'Test Caverns', 'Merge Gate'],
    boss: 'The Merge Monster', bossStyle: 'merge', unlock: 'Debug Pulse',
    intro: 'Use GitHub Copilot to fix an active-user counter, strengthen exporter tests, and review a coding agent pull request. Keep the changes scoped to the real issue.',
    ending: 'The branches are stable. Cowork Central has a growing pile of unfinished plans.',
    phases: ['Conflicting Branches', 'Regression Swarm', 'Merge Window'], attacks: ['tokens', 'agents', 'waves'],
    route: [[0,610,700],[800,540,270],[1180,460,280],[1570,390,370],[2050,465,650],[2800,390,280],[3180,320,280],[3570,400,390],[4070,480,630],[4800,550,280],[5180,465,280],[5570,390,420],[6100,465,650],[6860,540,290],[7250,470,300],[7660,540,890]],
    upper: [[320,495,180],[610,395,200],[2220,350,210],[2490,255,220],[4290,370,180],[4560,275,200],[6270,345,190],[6540,255,200]],
  },
  {
    id: 'cowork', title: 'Cowork Central', subtitle: 'Outcome Requested', theme: 'cowork', app: 'word',
    color: '#ffd18d', sky: ['#5a464d', '#b18773'], ground: ['#fff4d5', '#976a60'],
    chapters: ['Planning Plaza', 'Context Archives', 'Creation Corner', 'Review Rooftops'],
    boss: 'The Scope Creep', bossStyle: 'scope', unlock: 'Delegation Queue',
    intro: 'Delegate a busy workday to Copilot Cowork: process the project inbox, protect focus time, and prepare a customer meeting pack. Review the proposed changes before they take effect.',
    ending: 'The agreed work is complete. The factory has been deploying helpers without evaluating them.',
    phases: ['Extra Requirements', 'Duplicate Tasks', 'Agreed Outcome'], attacks: ['agents', 'tokens', 'waves'],
    route: [[0,620,780],[880,555,300],[1290,485,340],[1740,555,310],[2170,610,720],[3000,545,280],[3390,475,320],[3820,410,360],[4290,490,660],[5060,560,300],[5470,490,270],[5850,425,370],[6330,510,690],[7130,580,330],[7570,515,340],[8020,560,880]],
    upper: [[440,505,190],[730,400,180],[2450,495,210],[2760,390,180],[4500,380,200],[4790,280,200],[6570,400,190],[6860,310,190]],
  },
  {
    id: 'foundry', title: 'AI Foundry', subtitle: 'Build Before You Deploy', theme: 'foundry', app: 'outlook',
    color: '#ffad6b', sky: ['#252e3d', '#697580'], ground: ['#ffce8c', '#526370'],
    chapters: ['Model Gallery', 'Evaluation Labs', 'Conveyor District', 'Deployment Chamber'],
    boss: 'The Unstable Deployment', bossStyle: 'foundry', unlock: 'Model Switch',
    intro: 'Prepare an evidence-grounded support assistant in Microsoft Foundry, compare evaluation results, and contain a failed pilot before it reaches more customers.',
    ending: 'The factory is stable. Agent City needs a team that can finish a bounded job.',
    phases: ['Latency Burst', 'Pattern Shift', 'Rollback Window'], attacks: ['tokens', 'waves', 'agents'],
    route: [[0,610,760],[870,550,360],[1330,490,300],[1740,550,380],[2230,610,760],[3090,545,330],[3530,480,340],[3980,545,330],[4420,610,700],[5230,550,350],[5690,485,300],[6100,425,310],[6520,505,720],[7350,575,330],[7790,510,310],[8210,570,850]],
    upper: [[390,495,200],[700,390,190],[2430,495,220],[2750,390,200],[4650,495,180],[4930,390,220],[6790,395,210],[7110,300,180]],
    moving: [{ x: 1490, y: 370, w: 180, axis: 'y', distance: 60, period: 5 }, { x: 5720, y: 320, w: 180, axis: 'x', distance: 150, period: 6 }],
  },
  {
    id: 'agents', title: 'Agent City', subtitle: 'Divide and Conquer', theme: 'agents', app: 'excel',
    color: '#96ecc1', sky: ['#1c3541', '#4c8490'], ground: ['#9ce9c3', '#2e706d'],
    chapters: ['Construction Quarter', 'Knowledge District', 'Security Transit', 'Coordination Tower'],
    boss: 'The Infinite Planner', bossStyle: 'planner', unlock: 'Parallel Assignments',
    intro: 'Use scoped agents to prepare invoice approvals, reject an unauthorized sharing instruction, and coordinate a weekly report with verified figures.',
    ending: 'The city is moving again. Teams Tower is trapped in a meeting with no final action item.',
    phases: ['Planning Loop', 'Dependency Storm', 'Execute the Plan'], attacks: ['agents', 'waves', 'tokens'],
    route: [[0,615,740],[850,550,330],[1290,485,290],[1690,550,430],[2230,610,700],[3040,550,310],[3460,480,320],[3890,410,340],[4340,485,740],[5190,550,320],[5620,485,320],[6050,550,390],[6550,610,700],[7360,545,330],[7800,475,300],[8210,550,870]],
    upper: [[380,500,200],[690,395,190],[2450,495,200],[2760,390,210],[4570,365,200],[4880,270,190],[6770,500,200],[7080,395,180]],
  },
  {
    id: 'teams', title: 'Teams Tower', subtitle: 'Please Leave the Meeting', theme: 'teams', app: 'teams',
    color: '#c4b2ff', sky: ['#373754', '#8589ac'], ground: ['#e2dbff', '#636286'],
    chapters: ['Chat Lobby', 'Channel Gardens', 'Calendar Shafts', 'Meeting Auditorium'],
    boss: 'The Meeting Overlord', bossStyle: 'meeting', unlock: 'Focus Mode',
    intro: 'Use Copilot in Teams to summarize the meeting, extract owners and due dates, and prepare a reviewed follow-up for the right channel.',
    ending: 'Meeting adjourned. The repaired campus has a clear path to Azure Orbit.',
    phases: ['Recurring Invitation', 'Echo Countdown', 'Final Action Item'], attacks: ['tokens', 'waves', 'agents'],
    route: [[0,615,700],[810,535,300],[1220,455,330],[1660,375,350],[2120,455,690],[2910,530,310],[3320,450,310],[3740,370,390],[4240,450,700],[5050,530,300],[5460,450,310],[5880,370,360],[6350,460,700],[7160,540,330],[7600,460,310],[8020,535,850]],
    upper: [[350,495,190],[640,390,190],[2330,335,200],[2630,245,180],[4450,330,190],[4740,235,200],[6560,340,210],[6870,250,190]],
    moving: [{ x: 1420, y: 335, w: 170, axis: 'y', distance: 100, period: 5 },{ x: 3570, y: 330, w: 170, axis: 'y', distance: 110, period: 5 },{ x: 5650, y: 330, w: 170, axis: 'y', distance: 100, period: 5 }],
  },
  {
    id: 'orbit', title: 'Azure Orbit', subtitle: 'Breakout Protocol', theme: 'orbit', type: 'orbit', color: '#71d4f8',
    chapters: ['Orbital Approach', 'Server Fields', 'Portal Lanes', 'Defender Swarm', 'Orbital Firewall'],
    boss: 'The Orbital Firewall', unlock: 'Core Access',
    intro: 'Board the saucer with your selected character. Repair the compromised orbital defenses and open the path to the Intelligence Core.',
    ending: 'The orbital firewall is repaired. Doctor Null is isolated inside the Intelligence Core.'
  },
  {
    id: 'core', title: 'The Intelligence Core', subtitle: 'Control Restored', theme: 'core', app: 'copilot',
    color: '#ffcf6d', sky: ['#12292f', '#335258'], ground: ['#c9f3e0', '#447278'],
    chapters: ['Repository Feed', 'Multi-agent Repair', 'Deployment Corridor', 'Command Chamber'],
    boss: 'Doctor Null & the Legacy Monolith', bossStyle: 'monolith', unlock: 'Human Oversight Restored',
    intro: 'Reconcile work context with Work IQ, coordinate a launch pack with Cowork, and authorize a reviewed internal handoff. Doctor Null still mistakes unbounded automation for good work.',
    ending: 'You did not replace the humans. You gave them better tools. And a flying saucer.',
    phases: ['Take Control', 'Delegate', 'Orchestrate'], attacks: ['waves', 'agents', 'tokens'],
    route: [[0,610,740],[850,535,320],[1280,455,310],[1700,385,380],[2190,465,710],[3010,545,320],[3440,470,320],[3870,395,370],[4350,475,730],[5190,550,320],[5610,475,330],[6050,400,380],[6540,490,730],[7380,565,330],[7820,490,340],[8270,550,900]],
    upper: [[360,495,190],[650,390,200],[2400,350,210],[2710,255,180],[4580,365,210],[4890,265,190],[6770,370,200],[7070,275,200]],
  }
];

const bossDialogue = {
  campus: { entrance: ['Welcome! Your onboarding has 4,096 remaining steps.'],
    exposed: ['A restart? But you have not filled in the feedback form.'], defeat: ['Setup complete. The tutorial would like feedback.'] },
  github: { entrance: ['Two branches. One deeply unresolved conflict.'],
    tokens: ['This change looked smaller in the pull request.'], exposed: ['All tests passed. We are cautiously panicking.'],
    defeat: ['Merged. I will try not to revert that immediately.'] },
  cowork: { entrance: ['Just one small change. And perhaps another floor.'],
    agents: ['Could we also redesign the lobby?'], exposed: ['What do you mean, outside the agreed scope?'],
    defeat: ['Three objectives. I admit that was enough.'] },
  foundry: { entrance: ['It worked on the one example I remembered.'],
    tokens: ['Latency is just anticipation with a dashboard.'], exposed: ['We tested in production. That was the problem.'],
    defeat: ['Rollback complete. Next time, an evaluation first.'] },
  agents: { entrance: ['Before executing, I have planned another planning session.'],
    agents: ['My dependencies have dependencies.'], exposed: ['You gave them an actual destination?'],
    defeat: ['The plan was bounded. The work is finished. I was not prepared for that.'] },
  teams: { entrance: ['Before you leave, one quick question.'], tokens: ['This meeting has been made recurring.'],
    exposed: ['Who muted the automatic invitations?'], defeat: ['Final action item: adjourn.'] },
  core: { entrance: ['I eliminated uncertainty. And all unscheduled decisions.'],
    phase1: ['Your team is acting outside my endless approval process.'],
    phase2: ['There was no flying saucer in the original specification.'],
    exposed: ['Human oversight was not an error?'], defeat: ['Objective corrected. Restore the doors.'] }
};

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze); return Object.freeze(value);
}

function buildMission(definition, index) {
  if (definition.type === 'orbit') return { ...definition, number: index + 1, index };
  const platforms = definition.route.map(([x, y, w], position) => ({ id: `${definition.id}-floor-${position}`,
    x, y, w, h: 30, app: definition.app, kind: 'normal', theme: definition.theme }));
  const mainRoute = [...platforms];
  for (const [position, [x, y, w]] of definition.upper.entries()) {
    platforms.push({ id: `${definition.id}-upper-${position}`, x, y, w, h: 24,
      app: definition.app, kind: 'secret', theme: definition.theme });
  }
  for (const [position, moving] of (definition.moving ?? []).entries()) {
    platforms.push({ ...moving, id: `${definition.id}-lift-${position}`, h: 24,
      app: definition.app, kind: 'lift', theme: definition.theme, motion: moving });
  }
  const stations = WORK_TASKS[definition.id].map((workflow, position) => {
    const floor = mainRoute[[0, 6, 12][position]];
    return { key: workflow.key, title: workflow.title, action: 'work', workflow,
      label: 'Open workspace', id: `${definition.id}-${workflow.key}`,
      x: floor.x + (position === 0 ? 510 : floor.w / 2), y: floor.y };
  });
  const checkpoints = [0, 4, 8, 12].map((routeIndex, chapter) => {
    const floor = mainRoute[routeIndex];
    return { id: `${definition.id}-checkpoint-${chapter}`, name: definition.chapters[chapter],
      x: floor.x + 55, y: floor.y, spawn: { x: floor.x + 35, y: floor.y - PHYSICS.playerHeight } };
  });
  const resources = (definition.resources ?? []).map(resource => {
    const floor = mainRoute[resource.at];
    return { ...resource, x: floor.x + floor.w / 2, y: floor.y - 55 };
  });
  const hazards = [3, 7, 11, 14].map((routeIndex, position) => {
    const floor = mainRoute[routeIndex];
    return { id: `${definition.id}-hazard-${position}`, x: floor.x + floor.w * .58,
      y: floor.y - 20, w: 42, h: 20, kind: 'glitch' };
  });
  const sparks = [];
  for (const floor of platforms.filter(platform => !platform.motion)) {
    const count = Math.max(2, Math.floor(floor.w / 105));
    for (let item = 0; item < count; item += 1) {
      const x = floor.x + 34 + item * (floor.w - 68) / (count - 1);
      const overHazard = hazards.some(hazard => x > hazard.x - 28 && x < hazard.x + hazard.w + 28);
      sparks.push({ id: `${definition.id}-item-${sparks.length}`, x, y: floor.y - (overHazard ? 100 : 58),
        radius: 11, secret: floor.kind === 'secret', app: floor.kind === 'secret' ? 'copilot' : definition.app });
    }
  }
  const enemies = [1, 2, 5, 6, 9, 10, 13, 15].map((routeIndex, position) => {
    const floor = mainRoute[routeIndex];
    const kind = ['robot','worm','drone'][(position + index) % 3];
    const type = ENEMY_TYPES[kind];
    return { id: `${definition.id}-enemy-${position}`, kind, x: floor.x + 60,
      y: floor.y - type.h - (type.hoverHeight ?? 0), minX: floor.x + 35,
      maxX: floor.x + floor.w - type.w - 25, facing: position % 2 ? -1 : 1,
      speed: type.speed * (1 + index * .035), theme: definition.theme };
  });
  const blocks = [];
  for (const routeIndex of [0, 4, 8, 12]) {
    const floor = mainRoute[routeIndex];
    for (let block = 0; block < 3; block += 1) {
      blocks.push({ id: `${definition.id}-block-${routeIndex}-${block}`, x: floor.x + 220 + block * 36,
        y: floor.y - 142, w: 32, h: 32, app: definition.app, kind: block === 1 ? 'reward' : 'brick',
        reward: block === 1 ? routeIndex === 8 ? 'microsoft' : 'blaster' : null });
    }
  }
  for (const [routeIndex, reward] of [[0, 'recruit-first'], [4, 'recruit-second']]) {
    const floor = mainRoute[routeIndex];
    blocks.push({ id: `${definition.id}-${reward}`, x: floor.x + floor.w - 80, y: floor.y - 142,
      w: 32, h: 32, app: definition.app, kind: 'reward', reward });
  }
  const last = mainRoute.at(-1);
  const world = { title: definition.title, id: definition.id, theme: definition.theme,
    width: last.x + last.w + 100, height: 900, deathY: 810, spawn: checkpoints[0].spawn,
    platforms, hazards, sparks, checkpoints, stations, resources, mainRoute,
    signs: checkpoints.map(checkpoint => ({ x: checkpoint.x + 80, y: checkpoint.y - 190,
      text: checkpoint.name.toUpperCase(), app: definition.app })),
    zones: checkpoints.map((checkpoint, chapter) => ({ x: chapter ? mainRoute[chapter * 4].x - 60 : 0,
      end: chapter < 3 ? mainRoute[(chapter + 1) * 4].x - 60 : last.x + last.w + 100,
      name: checkpoint.name, app: definition.app,
      theme: definition.id === 'core' ? ['github','agents','foundry','core'][chapter] : definition.theme })),
    goal: { x: last.x + last.w - 125, y: last.y - 130, w: 76, h: 130 } };
  const health = index === 7 ? 24 : 12 + Math.min(index, 5) * 2;
  const handoff = handoffTask(definition.id);
  const arena = { ...ARENA, name: definition.boss, theme: definition.theme, bossStyle: definition.bossStyle,
    dialogue: bossDialogue[definition.id],
    checkpointName: `${definition.boss} checkpoint`, stations: [
      { key: 'handoff', id: `${definition.id}-arena-handoff`, title: handoff.title,
        action: 'work', label: 'Review handoff', workflow: handoff, x: 855, y: 520, arena: true }
    ],
    boss: { ...ARENA.boss, health },
    phases: definition.phases.map((name, phase) => ({ ...ARENA.phases[phase], name,
      healthAbove: phase === 2 ? 0 : Math.floor(health * (phase === 0 ? 2 / 3 : 1 / 3)),
      attack: definition.attacks[phase], warningTime: 1.6, attackDuration: 2.8 + index * .14,
      summonCount: 2, dangerDuration: .65, projectileSpeed: 145 + index * 5,
      waveSpeed: 160 + index * 5, interval: 1.8 - Math.min(index, 5) * .04 })) };
  return { ...definition, number: index + 1, index, type: 'platform', world, arena,
    encounters: { blocks, enemies, pickups: [] } };
}

export const CAMPAIGN = deepFreeze(definitions.map(buildMission));
export const LEVEL_COUNT = CAMPAIGN.length;

export function chapterAt(mission, x) {
  return mission.world?.zones.find(zone => x >= zone.x && x < zone.end) ?? mission.world?.zones.at(-1);
}

function startLevel(campaign, index, wave = 0, finale = false) {
  const mission = CAMPAIGN[index];
  const orbital = mission.type === 'orbit' || finale;
  const state = orbital ? createOrbit({ width: VIEW.width, wave }) : createState(campaign.leader, mission);
  state.pilot = campaign.leader;
  state.finale = finale;
  state.campaignLevel = index;
  if (!orbital) {
    state.combat.blaster = campaign.blaster;
    for (const recruit of campaign.recruits) state.party.unlocked.add(recruit);
    resetPartyMotion(state.party, state.player, state.world.width, {
      world: state.geometry, blocks: state.blocks.blocks, enemies: state.combat.enemies,
      supportSlots: 1, bossTarget: null, geometryVersion: 0
    });
  }
  campaign.levelIndex = index; campaign.run = state;
  campaign.finalStage = finale; campaign.recorded = false;
  return state;
}

export function createCampaign(leader = 'marco', saved = {}) {
  if (!Object.hasOwn(CHARACTERS, leader)) leader = 'marco';
  const unlocked = Number.isInteger(saved.unlocked) ? Math.max(0, Math.min(7, saved.unlocked)) : 0;
  const current = Number.isInteger(saved.current) ? Math.max(0, Math.min(unlocked, saved.current)) : 0;
  const recruits = new Set((Array.isArray(saved.recruits) ? saved.recruits : [])
    .filter(id => id !== leader && Object.hasOwn(CHARACTERS, id)));
  const scores = Object.fromEntries(CAMPAIGN.map(mission => [mission.id,
    Number.isFinite(saved.scores?.[mission.id]) ? Math.max(0, saved.scores[mission.id]) : 0]));
  const campaign = { leader, unlocked, recruits, scores, blaster: saved.blaster === true,
    completed: new Set((Array.isArray(saved.completed) ? saved.completed : []).filter(id => CAMPAIGN.some(mission => mission.id === id))),
    levelIndex: current, finalStage: false, segmentScore: 0, recorded: false, finished: false, run: null };
  startLevel(campaign, current);
  return campaign;
}

export function saveCampaign(campaign) {
  return { leader: campaign.leader, current: campaign.levelIndex, unlocked: campaign.unlocked,
    recruits: [...campaign.recruits], blaster: campaign.blaster, scores: { ...campaign.scores },
    completed: [...campaign.completed] };
}

export function advanceCampaign(campaign) {
  if (campaign.run.status !== 'complete' || !campaign.recorded || campaign.levelIndex >= 7) return false;
  startLevel(campaign, campaign.levelIndex + 1);
  return true;
}

export function selectLevel(campaign, index) {
  if (!Number.isInteger(index) || index < 0 || index > campaign.unlocked || index >= LEVEL_COUNT) return false;
  campaign.segmentScore = 0; campaign.finished = false;
  startLevel(campaign, index);
  return true;
}

export function retryLevel(campaign) {
  const wave = campaign.run.mode === 'orbit' && campaign.run.status === 'failed' ? campaign.run.wave : 0;
  startLevel(campaign, campaign.levelIndex, campaign.finalStage ? 4 : wave, campaign.finalStage);
}

export function pauseCampaign(campaign, paused) {
  (campaign.run.mode === 'orbit' ? setOrbitPaused : setPaused)(campaign.run, paused);
}

export function updateCampaign(campaign, input = {}, dt = 0) {
  const state = campaign.run;
  const events = (state.mode === 'orbit' ? updateOrbit : update)(state, input, dt);
  if (state.party) {
    campaign.recruits = new Set(state.party.unlocked);
    campaign.blaster ||= state.combat.blaster;
  }
  if (state.status !== 'complete' || campaign.recorded) return events;
  if (campaign.levelIndex === 7 && !campaign.finalStage) {
    campaign.segmentScore = state.score;
    startLevel(campaign, 7, 4, true);
    return [...events.filter(event => event.type !== 'complete'), { type: 'finaleStart' }];
  }
  campaign.recorded = true;
  const mission = CAMPAIGN[campaign.levelIndex];
  campaign.completed.add(mission.id);
  campaign.unlocked = Math.max(campaign.unlocked, Math.min(7, campaign.levelIndex + 1));
  campaign.scores[mission.id] = Math.max(campaign.scores[mission.id], state.score + (campaign.finalStage ? campaign.segmentScore : 0));
  campaign.finished = campaign.levelIndex === 7;
  return [...events.filter(event => event.type !== 'complete'),
    { type: campaign.finished ? 'campaignComplete' : 'levelComplete', level: campaign.levelIndex, unlock: mission.unlock }];
}
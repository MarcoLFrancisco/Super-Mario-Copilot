// Pure simulation helpers: no DOM, browser speech, audio, or wall clock.
// Create one dialogue state per boss encounter. Advance with simulation dt
// only while playing; pausing therefore freezes captions and cooldowns.
const lines = {
  entrance: [
    'I predicted everything. Except a plumber.',
    'Welcome. Your defeat is still loading.'
  ],
  tokens: [
    'Please accept these cookies.',
    'A thousand tokens. Zero manners.',
    'Let me finish your sentence.'
  ],
  agents: [
    'They are features. Mostly.',
    'I delegated your defeat.',
    'My agents need supervision.'
  ],
  waves: [
    'Time to clear your cache.',
    'Mind the generation gap.',
    'Here comes the next big wave.'
  ],
  exposed: [
    'Who turned off my firewall?',
    'Please ignore the open port.',
    'This is an unscheduled update.'
  ],
  hit: [
    'That was not in my training data.',
    'Confidence: rapidly decreasing.',
    'Ouch. That patch was personal.',
    'Can we roll that back?'
  ],
  phase1: [
    'Time to call my agents.',
    'Let us make this a team meeting.'
  ],
  phase2: [
    'Fine. No more autocomplete.',
    'New plan. Fewer safety checks.'
  ],
  slam: ['Stand still. This is a precision operation.'],
  volley: ['The first two were warning shots. Probably.'],
  charge: ['Behold, advanced tactical running!'],
  chargeMiss: ['That wall moved.'],
  arenaControl: ['The floor is now a premium feature.'],
  reinforcements: ['Minions! Address this customer complaint!', 'This is delegation, not desperation.'],
  overload: ['You cannot hurt me emotionally or physically!'],
  shieldBreak: ['Apparently, both.'],
  desperation: ['Combo! Combo! Very expensive combo!'],
  countdown: ['Please remain calm during your scheduled destruction.'],
  countdownBreak: ['You skipped my cutscene!'],
  burst: ['I have everything under contr...'],
  malfunction: ['Minor technical difficulty!'],
  dodge: ['Dodging is just running with confidence.'],
  miss: ["I'm attacking where you SHOULD be."],
  idle: ['Are you buffering?'],
  playerDefeated: ['Excellent tutorial attempt. Shall we begin?'],
  lowHealth: ['That health bar is spreading misinformation.'],
  defeat: [
    'You win. I will read the documentation.',
    'Human one. Hallucination zero.'
  ]
};
for (const group of Object.values(lines)) Object.freeze(group);
export const BOSS_LINES = Object.freeze(lines);

const PRIORITY = Object.freeze({
  entrance: 3, tokens: 1, agents: 1, waves: 1,
  slam: 1, volley: 1, charge: 1, chargeMiss: 4,
  arenaControl: 1, reinforcements: 1, overload: 1, shieldBreak: 4,
  desperation: 1, countdown: 2, countdownBreak: 4, burst: 1,
  malfunction: 2, dodge: 0, miss: 0, idle: 0, playerDefeated: 4, lowHealth: 4,
  exposed: 2, hit: 0, phase1: 3, phase2: 3, defeat: 5
});
const MOOD = Object.freeze({
  entrance: 'smug', tokens: 'smug', agents: 'smug', waves: 'angry',
  slam: 'smug', volley: 'smug', charge: 'smug', chargeMiss: 'worried',
  arenaControl: 'angry', reinforcements: 'smug', overload: 'smug', shieldBreak: 'hurt',
  desperation: 'angry', countdown: 'angry', countdownBreak: 'worried', burst: 'worried',
  malfunction: 'worried', dodge: 'annoyed', miss: 'annoyed', idle: 'smug', playerDefeated: 'smug', lowHealth: 'worried',
  exposed: 'worried', hit: 'hurt', phase1: 'angry', phase2: 'angry', defeat: 'defeated'
});

export function createDialogue(overrides = {}, style = 'core') {
  return { lines: { ...BOSS_LINES, ...overrides }, current: null, cooldown: 0, sequence: 0,
    next: Object.fromEntries(Object.keys(BOSS_LINES).map(key => [key, 0])),
    style, recent: [], usedOnce: [] };
}

export function updateDialogue(dialogue, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  dialogue.cooldown = Math.max(0, dialogue.cooldown - dt);
  if (dialogue.current) {
    dialogue.current.remaining = Math.max(0, dialogue.current.remaining - dt);
    if (dialogue.current.remaining === 0) dialogue.current = null;
  }
}

// Returns the selected caption or null. Important phase/defeat lines may
// interrupt lesser lines; ordinary chatter cannot form an announcement queue.
// Events carry plain text for both accessible captions and optional speech.
export function sayBoss(dialogue, key, events = []) {
  if (!Object.hasOwn(BOSS_LINES, key)) return null;
  const showman = dialogue.style === 'showman';
  const important = ['entrance', 'phase1', 'phase2', 'defeat', 'playerDefeated'].includes(key);
  const reaction = ['chargeMiss', 'shieldBreak', 'countdownBreak', 'malfunction'].includes(key);
  const priority = showman ? key === 'defeat' ? 5 : important ? key === 'entrance' ? 3 : 4
    : reaction ? 2 : ['hit', 'idle', 'dodge', 'miss', 'exposed'].includes(key) ? 0 : 1 : PRIORITY[key];
  const once = ['entrance', 'phase1', 'phase2', 'defeat'].includes(key);
  if (once && dialogue.usedOnce.includes(key)) return null;
  const current = dialogue.current;
  if (current && priority <= current.priority) return null;
  if (dialogue.cooldown > 0 && (showman ? !important && !reaction : priority < 2)) return null;
  const choices = (dialogue.lines ?? BOSS_LINES)[key] ?? BOSS_LINES[key];
  let index = dialogue.next[key] % choices.length;
  if (showman && !important) {
    const fresh = choices.map((text, offset) => (index + offset) % choices.length)
      .find(position => !dialogue.recent.includes(choices[position]));
    if (fresh === undefined) return null;
    index = fresh;
  }
  const text = choices[index];
  const duration = Math.max(2.6, Math.min(4.5, 1.4 + text.length * .055));
  dialogue.next[key] = (index + 1) % choices.length;
  dialogue.sequence += 1;
  dialogue.recent.push(text);
  if (dialogue.recent.length > 4) dialogue.recent.shift();
  if (once) dialogue.usedOnce.push(key);
  const caption = {
    id: dialogue.sequence, key, text, mood: MOOD[key], priority,
    duration, remaining: duration
  };
  dialogue.current = caption;
  // At least a short quiet gap after routine lines. Low-priority hit chatter
// cannot retrigger on every projectile or replace vulnerability guidance.
  dialogue.cooldown = showman ? 10 : duration + 1;
  events.push({ type: 'bossDialogue', id: caption.id, key, text,
    mood: caption.mood, duration, priority });
  return caption;
}

// Translate existing combat events without changing their scoring semantics.
// Entrance is requested explicitly when the boss starts its first update.
export function dialogueForEvent(event) {
  switch (event.type) {
    case 'bossEnter': return 'entrance';
    case 'bossWarning': return event.attack ?? ['tokens', 'agents', 'waves'][event.phase] ?? null;
    case 'bossExposed': return 'exposed';
    case 'bossHit': return 'hit';
    case 'bossPhase': return event.phase === 1 ? 'phase1' : event.phase === 2 ? 'phase2' : null;
    case 'bossDefeated': return 'defeat';
    default: return null;
  }
}

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
  defeat: [
    'You win. I will read the documentation.',
    'Human one. Hallucination zero.'
  ]
};
for (const group of Object.values(lines)) Object.freeze(group);
export const BOSS_LINES = Object.freeze(lines);

const PRIORITY = Object.freeze({
  entrance: 3, tokens: 1, agents: 1, waves: 1,
  exposed: 2, hit: 0, phase1: 3, phase2: 3, defeat: 4
});
const MOOD = Object.freeze({
  entrance: 'smug', tokens: 'smug', agents: 'smug', waves: 'angry',
  exposed: 'worried', hit: 'hurt', phase1: 'angry', phase2: 'angry', defeat: 'defeated'
});

export function createDialogue() {
  return { current: null, cooldown: 0, sequence: 0,
    next: Object.fromEntries(Object.keys(BOSS_LINES).map(key => [key, 0])),
    usedOnce: [] };
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
  const priority = PRIORITY[key];
  const once = ['entrance', 'phase1', 'phase2', 'defeat'].includes(key);
  if (once && dialogue.usedOnce.includes(key)) return null;
  const current = dialogue.current;
  if (current && priority <= current.priority) return null;
  if (dialogue.cooldown > 0 && priority < 2) return null;
  const choices = BOSS_LINES[key];
  const index = dialogue.next[key] % choices.length;
  const text = choices[index];
  const duration = Math.max(2.6, Math.min(4.5, 1.4 + text.length * .055));
  dialogue.next[key] = (index + 1) % choices.length;
  dialogue.sequence += 1;
  if (once) dialogue.usedOnce.push(key);
  const caption = {
    id: dialogue.sequence, key, text, mood: MOOD[key], priority,
    duration, remaining: duration
  };
  dialogue.current = caption;
  // At least a short quiet gap after routine lines. Low-priority hit chatter
// cannot retrigger on every projectile or replace vulnerability guidance.
  dialogue.cooldown = duration + 1;
  events.push({ type: 'bossDialogue', id: caption.id, key, text,
    mood: caption.mood, duration, priority });
  return caption;
}

// Translate existing combat events without changing their scoring semantics.
// Entrance is requested explicitly when the boss starts its first update.
export function dialogueForEvent(event) {
  switch (event.type) {
    case 'bossEnter': return 'entrance';
    case 'bossWarning': return ['tokens', 'agents', 'waves'][event.phase] ?? null;
    case 'bossExposed': return 'exposed';
    case 'bossHit': return 'hit';
    case 'bossPhase': return event.phase === 1 ? 'phase1' : event.phase === 2 ? 'phase2' : null;
    case 'bossDefeated': return 'defeat';
    default: return null;
  }
}

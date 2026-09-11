// Pure simulation dialogue: no DOM, audio, network, or wall-clock timers.
// Create per run. Advance only while playing; pause freezes caption lifetimes.
// Future engine integration supplies present character IDs and gameplay events.
const lines = {
  start: [
    ['marco', '📨 Copilot, summarize these emails. Especially the meeting about fewer meetings.'],
    ['mario', '🧑‍💻 GitHub Copilot, help with the hard tasks. My specialty is plumbing!'],
    ['donkey', '🐴 Team ready. I handle backend problems. Literally.']
  ],
  collect: [
    ['marco', '📨 Let’s process these emails with Copilot. Reply-all is the real boss.'],
    ['mario', '📊 Another spreadsheet! Is the treasure in column X?'],
    ['donkey', '💬 This Teams meeting could have been a carrot.']
  ],
  combat: [
    ['donkey', '🐴 Bug report closed by the rear department. 💥'],
    ['marco', '🥊 That bug failed its kickboxing review.'],
    ['mario', '🐛 GitHub Copilot, suggest a fix. I’ll handle the kick!']
  ],
  checkpoint: [
    ['marco', '☁️ Progress saved. Unlike that document named FINAL_final_v7.'],
    ['mario', '✅ Checkpoint reached. Finally, a reliable restore point!'],
    ['donkey', '🥕 Backup complete. Please back up my carrots too.']
  ],
  recover: [
    ['donkey', '🐴 Reconnected! Have you tried turning the donkey off and on?'],
    ['marco', '🔄 That was a surprise code review from gravity.'],
    ['mario', '☁️ Cloud recovery! Much softer than the landing.']
  ],
  boss: [
    ['marco', '🤖 Copilot, summarize this boss in one word: yikes.'],
    ['mario', '🧑‍💻 Hard task detected. GitHub Copilot, let’s pair on this!'],
    ['donkey', '🐴 Big bug. Same rear-end support package.']
  ],
  complete: [
    ['marco', '🎉 Inbox zero bugs! The actual inbox still has 4,000 emails.'],
    ['mario', '🚀 Shipped it! Now who reviews the victory dance?'],
    ['donkey', '🥕 Sprint complete. Scheduling a carrot retrospective.']
  ]
};
for (const group of Object.values(lines)) {
  group.forEach(Object.freeze);
  Object.freeze(group);
}
export const PARTY_LINES = Object.freeze(lines);
const IDS = Object.freeze(['marco', 'mario', 'donkey']);
const PRIORITY = Object.freeze({
  start: 2, collect: 0, combat: 0, checkpoint: 1,
  recover: 1, boss: 3, complete: 4
});
const ONCE = new Set(['start', 'boss', 'complete']);

export function createPartyDialogue() {
  return { current: null, cooldown: 0, sequence: 0,
    next: Object.fromEntries(Object.keys(PARTY_LINES).map(key => [key, 0])),
    topicCooldown: {}, speakerCooldown: {}, usedOnce: new Set() };
}

export function updatePartyDialogue(dialogue, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  dialogue.cooldown = Math.max(0, dialogue.cooldown - dt);
  for (const timers of [dialogue.topicCooldown, dialogue.speakerCooldown]) {
    for (const key of Object.keys(timers)) timers[key] = Math.max(0, timers[key] - dt);
  }
  if (dialogue.current) {
    dialogue.current.remaining = Math.max(0, dialogue.current.remaining - dt);
    if (dialogue.current.remaining === 0) dialogue.current = null;
  }
}

// At most one party balloon at a time. No chatter backlog is accumulated.
// present contains IDs of currently available actors, not character objects.
// preferred is optional (selected leader or a known event actor).
// Higher-priority milestones can interrupt routine chatter, never each other
// at equal priority. Routine speech observes global, topic and speaker limits.
export function sayParty(dialogue, key, present, events = [], preferred = null) {
  if (!Object.hasOwn(PARTY_LINES, key) || !Array.isArray(present)) return null;
  if (ONCE.has(key) && dialogue.usedOnce.has(key)) return null;
  const priority = PRIORITY[key];
  if (dialogue.current && priority <= dialogue.current.priority) return null;
  if (priority < 2 && (dialogue.cooldown > 0 || dialogue.topicCooldown[key] > 0)) return null;
  const choices = PARTY_LINES[key];
  const offset = dialogue.next[key];
  const ordered = choices.map((_, i) => (offset + i) % choices.length);
  if (IDS.includes(preferred)) {
    ordered.sort((a, b) => Number(choices[b][0] === preferred)
      - Number(choices[a][0] === preferred));
  }
  const index = ordered.find(i => present.includes(choices[i][0])
    && (priority >= 2 || !(dialogue.speakerCooldown[choices[i][0]] > 0)));
  if (index === undefined) return null;
  const [character, text] = choices[index];
  const duration = Math.max(4, Math.min(7, 1.8 + Array.from(text).length * .055));
  const caption = { id: ++dialogue.sequence, character, key, text,
    priority, duration, remaining: duration };
  dialogue.current = caption;
  dialogue.next[key] = (index + 1) % choices.length;
  dialogue.cooldown = duration + 3;
  dialogue.topicCooldown[key] = key === 'collect' ? 25 : 18;
  dialogue.speakerCooldown[character] = duration + 8;
  if (ONCE.has(key)) dialogue.usedOnce.add(key);
  events.push({ type: 'partyDialogue', ...caption });
  return caption;
}

// Map verified existing events; partyRecover is the explicit future companion
// recovery event. Start is requested directly after the selected run begins.
export function partyDialogueKey(event) {
  switch (event.type) {
    case 'spark': return 'collect';
    case 'enemyDefeated': return 'combat';
    case 'checkpoint': return 'checkpoint';
    case 'partyRecover': return 'recover';
    case 'bossEnter': return 'boss';
    case 'complete': return 'complete';
    default: return null;
  }
}

// Pass only this tick's fresh gameplay events, not a retained event history.
// Choose the most important eligible event; never announce every collected item.
// Do not call while boss speech is visible: the engine owns that arbitration.
export function reactPartyDialogue(dialogue, gameplayEvents, present, output = []) {
  const candidates = gameplayEvents.map(event => ({ event, key: partyDialogueKey(event) }))
    .filter(item => item.key)
    .sort((a, b) => PRIORITY[b.key] - PRIORITY[a.key]);
  for (const { event, key } of candidates) {
    const caption = sayParty(dialogue, key, present, output, event.character);
    if (caption) return caption;
  }
  return null;
}

// Recovery/world transitions may clear stale balloons without replaying one-off
// lines or resetting repetition limits. Full restart creates fresh state instead.
export function clearPartyCaption(dialogue) {
  dialogue.current = null;
}

import '../vendor/lucide.min.js';
import { LEVEL, VIEW } from './campus-level.js';
import { createState, setPaused, update, interactionAt } from './campus-engine.js';
import { createOrbit, updateOrbit, setOrbitPaused, ORBIT, AGENTS } from './orbit.js';
import { render } from './campus-art.js';
import { renderOrbit } from './orbit-art.js';
import { createAudio } from './audio.js';
import { createState as createQuest, update as updateQuest, setPaused as pauseQuest } from './engine.js';
import { render as renderQuest } from './art.js';
import { LEVEL as QUEST_LEVEL, PRODUCTIVITY_TOTALS, productivityCounts } from './level.js';
import { CHARACTERS, companionIds } from './party.js';
import { ARENA, COMBAT } from './encounters.js';

const engines = {
  campus: { update, pause: setPaused, render },
  quest: { update: updateQuest, pause: pauseQuest, render: renderQuest },
  orbit: { update: updateOrbit, pause: setOrbitPaused, render: renderOrbit }
};

const el = id => document.getElementById(id);
const text = (id, value) => {
  const node = el(id);
  if (node.textContent !== String(value)) node.textContent = value;
};
const icons = (root = document) => globalThis.lucide.createIcons({ root });
function icon(id, name) {
  const node = document.createElement('i'); node.dataset.lucide = name;
  el(id).replaceChildren(node); icons(el(id));
}
const canvas = el('game-canvas');
const ctx = canvas.getContext('2d');
const controls = [...document.querySelectorAll('[data-action]')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = createAudio();
const defaultBindings = { left: 'KeyA', right: 'KeyD', jump: 'Space', boost: 'ShiftLeft',
  interact: 'KeyE', patch: 'Digit1', query: 'Digit2', aegis: 'Digit3',
  attack: 'KeyJ', helper: 'KeyK', fire: 'KeyF' };
const bindingNames = { left: 'Move left', right: 'Move right', jump: 'Jump / Launch',
  boost: 'Copilot Dash', interact: 'Accept bridge', patch: 'Patch', query: 'Query', aegis: 'Aegis',
  attack: 'Team Quest melee', helper: 'Team Quest helpers', fire: 'Team Quest blaster' };
const allowedKeys = ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ShiftLeft', 'ShiftRight', 'Enter',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => `Key${letter}`),
  ...'1234567890'.split('').map(digit => `Digit${digit}`)];
let storageAvailable = true;
function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { storageAvailable = false; return fallback; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { storageAvailable = false; }
  text('storage-status', storageAvailable ? 'Local progress' : 'Session-only progress');
}
const savedProgress = readStorage('mission-copilot-progress-v1', {});
const progress = { campusComplete: savedProgress?.campusComplete === true, orbitComplete: savedProgress?.orbitComplete === true,
  bestCampus: Number.isFinite(savedProgress?.bestCampus) ? savedProgress.bestCampus : 0,
  bestOrbit: Number.isFinite(savedProgress?.bestOrbit) ? savedProgress.bestOrbit : 0,
  questComplete: savedProgress?.questComplete === true,
  bestQuest: Number.isFinite(savedProgress?.bestQuest) ? savedProgress.bestQuest : 0 };
const savedPrefs = readStorage('mission-copilot-preferences-v1', {});
const volume = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
const preferences = { music: savedPrefs?.music === true, effects: savedPrefs?.effects === true,
  musicVolume: volume(savedPrefs?.musicVolume, 45), effectsVolume: volume(savedPrefs?.effectsVolume, 65),
  bossVoice: savedPrefs?.bossVoice === true, dialogueVolume: volume(savedPrefs?.dialogueVolume, 65),
  reducedMotion: typeof savedPrefs?.reducedMotion === 'boolean' ? savedPrefs.reducedMotion : motion.matches,
  highContrast: savedPrefs?.highContrast === true, subtitles: savedPrefs?.subtitles !== false,
  shake: volume(savedPrefs?.shake, 0), bindings: { ...defaultBindings } };
if (savedPrefs?.bindings && Object.keys(defaultBindings).every(action => allowedKeys.includes(savedPrefs.bindings[action]))
  && new Set(Object.values(savedPrefs.bindings)).size === Object.keys(defaultBindings).length) {
  preferences.bindings = { ...savedPrefs.bindings };
}
let mode = 'campus';
let state = createState({ dashUnlocked: progress.campusComplete });
let started = false;
let previous = 0;
let audioBusy = false;
let jumpPressed = false;
let boostPressed = false;
let interactPressed = false;
let agentPressed = null;
let orbitPointer = null;
let lastSuggestion = null;
let attackPressed = false;
let helperPressed = false;
let fireUntil = 0;
let captionBoss = null;
let bossCaptionId = 0;
let partyCaptionId = 0;
let utterance = null;
let speechTimer;
const speech = window.speechSynthesis;
const speechAvailable = Boolean(speech && window.SpeechSynthesisUtterance);
const runs = {};
const keys = new Map();
const pointers = new Map();
const playing = () => started && state.status === 'playing' && !el('settings-dialog').open;
const finished = () => state.status === 'complete' || state.status === 'failed';
const announce = message => text('game-announcement', message);
function say(message, speaker = 'SPARQ') {
  text('speaker', speaker); text('subtitle', message); announce(message);
}
function cancelSpeech() {
  clearTimeout(speechTimer);
  if (!utterance) return;
  utterance.onend = null; utterance.onerror = null; utterance = null;
  try { speech.cancel(); } catch {}
}
function speakCaption(caption) {
  cancelSpeech();
  if (!preferences.bossVoice || !speechAvailable || !playing() || document.hidden || !document.hasFocus()) return;
  try {
    const line = new SpeechSynthesisUtterance(caption.text);
    line.lang = 'en-US'; line.rate = 1.05; line.pitch = .8; line.volume = preferences.dialogueVolume / 100;
    const localVoice = speech.getVoices().find(voice => voice.localService && /^en(?:-|$)/i.test(voice.lang));
    if (localVoice) line.voice = localVoice;
    utterance = line;
    line.onend = () => { if (utterance === line) { clearTimeout(speechTimer); utterance = null; } };
    line.onerror = () => {
      if (utterance !== line) return;
      cancelSpeech(); preferences.bossVoice = false; audioControls();
      text('audio-status', 'Browser speech unavailable. Captions remain available.');
    };
    speech.speak(line); speechTimer = setTimeout(cancelSpeech, Math.max(1, caption.remaining) * 1000);
  } catch {
    cancelSpeech(); preferences.bossVoice = false; audioControls();
    text('audio-status', 'Browser speech unavailable. Captions remain available.');
  }
}
function syncQuestDialogue() {
  if (mode !== 'quest' || !started) return;
  const boss = state.stage === 'boss' ? state.boss : null;
  if (captionBoss !== boss) { cancelSpeech(); captionBoss = boss; bossCaptionId = 0; }
  const caption = boss?.dialogue.current;
  if (caption && caption.id !== bossCaptionId) {
    bossCaptionId = caption.id; say(caption.text, 'CORE'); speakCaption(caption);
  } else if (!caption) {
    cancelSpeech();
    const team = state.partyDialogue.current;
    if (team && team.id !== partyCaptionId) {
      partyCaptionId = team.id; say(team.text, CHARACTERS[team.character].name.toUpperCase());
    }
  }
}
function clearInput() {
  keys.clear(); pointers.clear(); jumpPressed = false; boostPressed = false;
  interactPressed = false; agentPressed = null; orbitPointer = null;
  attackPressed = false; helperPressed = false; fireUntil = 0;
}
function press(action) {
  if (mode === 'quest' && state.boss?.defeated) return;
  if (action === 'attack') attackPressed = true;
  if (action === 'helper') helperPressed = true;
  if (action === 'fire') fireUntil = performance.now() + 100;
  if (action === 'jump') jumpPressed = true;
  if (action === 'boost') boostPressed = true;
  if (action === 'interact') { if (mode === 'orbit') jumpPressed = true; else interactPressed = true; }
  if (Object.hasOwn(AGENTS, action)) agentPressed = action;
  if (action === 'left' || action === 'right') orbitPointer = null;
}
function actionFor(code) {
  const assigned = Object.entries(preferences.bindings).find(([, key]) => key === code)?.[0];
  return assigned ?? { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', KeyW: 'jump', ShiftRight: 'boost' }[code];
}
function resize() {
  if (mode === 'campus') state.viewWidth = el('game-viewport').clientWidth < 720 ? 720 : VIEW.width;
  const width = mode === 'orbit' ? state.width : mode === 'quest' ? VIEW.width : state.viewWidth;
  const density = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== width * density || canvas.height !== VIEW.height * density) {
    canvas.width = width * density; canvas.height = VIEW.height * density;
    canvas.style.aspectRatio = `${width} / ${VIEW.height}`;
  }
}
function hud() {
  const orbit = mode === 'orbit';
  const quest = mode === 'quest';
  const level = quest ? QUEST_LEVEL : LEVEL;
  text('score-value', state.score.toLocaleString());
  text('items-label', orbit ? 'Recoveries' : quest ? 'App items' : 'Energy cells');
  text('sparks-value', orbit ? state.charges : state.collected.size);
  text('sparks-total', orbit ? 3 : level.sparks.length);
  text('combo-label', orbit ? 'Wave' : 'Combo');
  text('combo-value', orbit ? `${state.wave + 1} / 5` : `x${state.combo}`);
  text('checkpoint-label', orbit ? 'Sector' : 'Checkpoint');
  text('checkpoint-value', orbit ? ORBIT.waves[state.wave] : quest && state.stage === 'boss'
    ? ARENA.checkpointName : level.checkpoints[state.checkpointIndex].name);
  text('boost-label', orbit ? 'Compute' : 'Copilot Dash');
  text('boost-value', orbit ? `${Math.floor(state.compute)} / 100` : !quest && !state.abilities.dash ? 'Locked'
    : state.player.boostCooldown > 0 ? `${state.player.boostCooldown.toFixed(1)}s` : 'Ready');
  const request = mode === 'campus' ? interactionAt(state) : null;
  const bossActive = mode === 'campus' && state.boss.phase !== 'idle' && state.boss.phase !== 'defeated';
  text('mission-objective', orbit ? state.phase === 'ready' ? 'Energy core latched' : state.phase === 'wave-clear'
    ? 'Sector restored' : state.wave === 4 ? 'Repair the Orbital Firewall' : 'Clear the corrupted blocks'
    : quest ? state.stage === 'boss' ? state.boss.defeated ? 'Reactor stabilizing' : state.boss.mode === 'exposed'
      ? 'Core exposed' : `${ARENA.phases[state.boss.phase].name}: ${state.boss.mode}` : 'Reach the AI Core with your team'
    : bossActive ? state.boss.phase === 'exposed' ? 'Restart switch exposed' : state.boss.phase === 'telegraph'
      ? 'Loading rings incoming' : 'Restore the Setup Wizard'
    : state.boss.health === 0 ? 'Return power to the campus beacon' : request ? `${request.name}: awaiting approval` : 'Restore campus access');
  el('boss-health').hidden = !bossActive;
  if (bossActive) text('boss-health', `${3 - state.boss.health} / 3 resets`);
  el('interact-button').disabled = !playing() || (orbit ? state.phase !== 'ready' : !request);
  text('interact-label', orbit ? 'Launch core' : 'Accept bridge');
  el('boost-button').disabled = !playing() || orbit || (!quest && !state.abilities.dash) || state.player.boostCooldown > 0;
  if (quest) {
    const active = playing() && !state.boss?.defeated;
    const helpers = companionIds(state.party);
    const counts = productivityCounts(state.collected);
    text('health-value', `${state.combat.health} / ${COMBAT.maxHealth}`);
    text('weapon-value', state.combat.blaster ? 'Debug Blaster ready' : 'Not equipped');
    text('protection-value', state.combat.protection > 0 ? `${state.combat.protection.toFixed(1)}s` : 'Inactive');
    text('party-status', [CHARACTERS[state.party.leader].name + ' leads', ...helpers.map(name =>
      `${CHARACTERS[name].name}: ${!state.party.unlocked.has(name) ? 'unrecruited' : state.party.actors[name].recovering ? 'regrouping' : 'active'}`)].join(' / '));
    text('productivity-counts', Object.entries(counts).map(([app, count]) => `${app}: ${count} / ${PRODUCTIVITY_TOTALS[app]}`).join('  |  '));
    el('fire-button').disabled = !active || !state.combat.blaster;
    el('attack-button').disabled = !active;
    el('helper-button').disabled = !active || !helpers.some(name => state.party.unlocked.has(name) && !state.party.actors[name].recovering);
    el('quest-boss-status').hidden = state.stage !== 'boss';
    if (state.boss) {
      el('quest-boss-health').max = state.boss.maxHealth; el('quest-boss-health').value = state.boss.health;
      text('quest-boss-value', `${state.boss.health} / ${state.boss.maxHealth}`);
    }
    if (!active) controls.forEach(button => { button.disabled = true; });
  }
  if (orbit) {
    for (const [name, agent] of Object.entries(AGENTS)) {
      const remaining = state.agentCooldowns[name];
      const active = name === 'patch' ? state.netCharges > 0 : name === 'query' ? state.queryTime > 0 : state.shieldTime > 0;
      text(`${name}-status`, remaining > 0 ? `${active ? 'Active' : 'Cooldown'} ${Math.ceil(remaining)}s`
        : state.compute < agent.cost ? `Needs ${agent.cost} compute` : `Ready / ${agent.cost}`);
      el(`agent-${name}`).disabled = !playing() || remaining > 0 || state.compute < agent.cost;
      el(`agent-${name}`).title = { patch: 'Restore a recovery net', query: 'Highlight priority targets', aegis: 'Defend against missiles' }[name];
    }
  }
  if (request && request.id !== lastSuggestion && playing()) {
    lastSuggestion = request.id; say('I can build a link here. The lower route is still open. Your call.');
  }
}
function panels() {
  const orbit = mode === 'orbit';
  const quest = mode === 'quest';
  el('start-panel').hidden = started;
  el('pause-panel').hidden = !started || state.status !== 'paused';
  el('complete-panel').hidden = !started || !finished();
  el('pause-button').disabled = !started || finished();
  const pauseLabel = state.status === 'paused' ? 'Resume' : 'Pause';
  el('pause-button').setAttribute('aria-label', pauseLabel); el('pause-button').dataset.tooltip = pauseLabel;
  icon('pause-icon', state.status === 'paused' ? 'play' : 'pause');
  controls.forEach(button => { button.disabled = !playing(); });
  canvas.tabIndex = playing() ? 0 : -1;
  audio.setStatus(started ? state.status === 'failed' ? 'paused' : state.status : 'idle');
  audio.setStage(quest ? state.stage : 'world', quest ? state.boss?.phase ?? 0 : 0);
  document.body.classList.toggle('is-orbit', orbit);
  document.body.classList.toggle('is-quest', quest);
  el('agent-controls').hidden = !orbit; el('boost-button').hidden = orbit;
  el('character-choice').hidden = !quest || started;
  el('character-select').disabled = started;
  el('quest-readout').hidden = !quest;
  el('combat-controls').hidden = !quest;
  el('interact-button').hidden = quest;
  el('jump-button').setAttribute('aria-label', orbit ? 'Launch core' : 'Jump');
  el('mission-panel').setAttribute('aria-labelledby', `${mode}-tab`);
  for (const name of Object.keys(engines)) {
    el(`${name}-tab`).setAttribute('aria-selected', String(mode === name));
    el(`${name}-tab`).tabIndex = mode === name ? 0 : -1;
  }
  el('orbit-tab').disabled = !progress.campusComplete;
  el('orbit-tab').title = progress.campusComplete ? 'Orbit simulator' : 'Restore Campus to unlock Orbit';
  el('orbit-lock').hidden = progress.campusComplete;
  text('mission-number', orbit ? '07' : quest ? 'CQ' : '01');
  text('world-label', orbit ? 'Azure Orbit / Flight simulator' : quest ? 'Cloud Quest / The AI Core' : 'Restore the connection');
  text('level-title', orbit ? 'Breakout Protocol' : quest ? 'Team Quest' : 'Copilot Campus');
  text('start-eyebrow', orbit ? 'Azure Orbit / Flight simulator' : quest ? 'The connected cloud' : 'Mission 01 / Reboot Campus');
  text('start-title', orbit ? 'A little more space.' : quest ? 'A team worth finding.' : 'A little help. A giant leap.');
  text('game-objective', orbit ? 'The orbital defense has been compromised. Bit is in the pilot seat. Sparq has assembled the team.'
    : quest ? 'The Hallucination Engine is loose in the connected cloud. Three unlikely collaborators are about to patch the core.'
    : 'Doctor Null has locked the campus in an endless approval meeting. Bit and Sparq have other plans.');
  text('start-label', orbit ? 'Begin flight' : 'Begin mission');
  icon('interact-icon', orbit ? 'play' : 'check');
  canvas.setAttribute('aria-label', orbit ? 'Azure Orbit flying saucer brick-breaking game' : quest ? 'Team Quest combat platform game' : 'Copilot Campus platform game');
  const bindings = Object.fromEntries(Object.entries(preferences.bindings).map(([action, code]) => [action, keyLabel(code)]));
  text('keyboard-help', orbit
    ? `Move with ${bindings.left} and ${bindings.right}, or drag on the canvas. ${bindings.jump} launches the core. ${bindings.patch}, ${bindings.query}, and ${bindings.aegis} assign Patch, Query, and Aegis. Escape pauses.`
    : quest ? `Move with ${bindings.left} and ${bindings.right}. ${bindings.jump} jumps and ${bindings.boost} boosts. ${bindings.attack} attacks, ${bindings.fire} fires the blaster, and ${bindings.helper} commands recruited companions. Hit recruitment boxes from below and collect their rewards. Escape pauses.`
    : `Move with ${bindings.left} and ${bindings.right}. Hold ${bindings.jump} to jump higher. ${bindings.interact} accepts a nearby bridge. ${bindings.boost} dashes after unlocking it. Escape pauses.`);
  hud();
}
function createMission(name, wave = 0) {
  if (name === 'quest') return createQuest(el('character-select').value);
  if (name === 'orbit') return createOrbit({ width: el('game-viewport').clientWidth < 720 ? 720 : VIEW.width, wave });
  return createState({ dashUnlocked: progress.campusComplete });
}
function start(retry = false) {
  cancelSpeech(); captionBoss = null; bossCaptionId = 0; partyCaptionId = 0;
  audio.setStatus('idle'); audio.reset();
  state = createMission(mode, retry ? state.wave : 0);
  started = true; previous = 0; lastSuggestion = null;
  if (preferences.music || preferences.effects) void audio.unlock();
  clearInput(); resize(); panels(); canvas.focus({ preventScroll: true });
  say(mode === 'orbit' ? 'You requested more space. I may have misunderstood.'
    : mode === 'quest' ? `${CHARACTERS[state.party.leader].name} is ready. The team is out there somewhere.`
    : 'Doctor Null eliminated all workplace problems. Starting with the doors.');
}
function pause(value, focus = true) {
  if (!started || finished()) return;
  if (value) cancelSpeech();
  engines[mode].pause(state, value);
  clearInput(); previous = 0; panels();
  if (!value && (preferences.music || preferences.effects)) void audio.unlock();
  if (focus) (value ? el('resume-button') : canvas).focus({ preventScroll: true });
  announce(value ? 'Mission paused.' : 'Mission resumed.');
}
function chooseMode(next) {
  if (next === mode || (next === 'orbit' && !progress.campusComplete)) return;
  if (playing()) pause(true, false);
  cancelSpeech(); captionBoss = null; bossCaptionId = 0; partyCaptionId = 0;
  runs[mode] = { state, started }; mode = next;
  const run = runs[mode];
  state = run?.state ?? createMission(mode);
  started = run?.started ?? false; previous = 0;
  clearInput(); resize(); panels();
  if (started && finished()) showResults(false);
  (started ? state.status === 'paused' ? el('resume-button') : el('replay-button') : el('start-button')).focus({ preventScroll: true });
  say(mode === 'orbit' ? 'Flight simulator online. Your team is standing by.' : mode === 'quest'
    ? 'A familiar world. A few new collaborators.' : 'Campus connection restored.');
}
function showResults(save = true) {
  const orbit = mode === 'orbit';
  const quest = mode === 'quest';
  const won = state.status === 'complete';
  if (save) {
    if (orbit) { progress.orbitComplete ||= won; progress.bestOrbit = Math.max(progress.bestOrbit, state.score); }
    else if (quest) { progress.questComplete ||= won; progress.bestQuest = Math.max(progress.bestQuest, state.score); }
    else { progress.campusComplete ||= won; progress.bestCampus = Math.max(progress.bestCampus, state.score); }
    writeStorage('mission-copilot-progress-v1', progress);
  }
  text('result-eyebrow', won ? 'Control restored' : 'Recovery reserve depleted');
  text('complete-title', won ? orbit ? 'Orbit, back in balance.' : quest ? 'Reactor stabilized.' : 'Campus, back online.' : 'Signal lost.');
  text('completion-summary', won ? orbit ? 'Better tools. Human judgment. And a flying saucer.'
    : quest ? `${CHARACTERS[state.party.leader].name} and the team patched the Hallucination Engine.`
    : 'Copilot Dash unlocked. The Orbit simulator is online.' : 'The current sector is checkpointed. A fresh recovery reserve is ready.');
  text('final-score', state.score.toLocaleString());
  text('final-items-label', orbit ? 'Sector' : quest ? 'App items' : 'Cells');
  text('final-sparks', orbit ? `${state.wave + 1} / 5` : `${state.collected.size} / ${(quest ? QUEST_LEVEL : LEVEL).sparks.length}`);
  text('final-combo-label', orbit ? 'Best score' : 'Best combo');
  text('final-combo', orbit ? progress.bestOrbit.toLocaleString() : `x${state.bestCombo}`);
  el('mission-badges').hidden = mode !== 'campus';
  el('final-productivity').hidden = !quest;
  if (quest) text('final-productivity', el('productivity-counts').textContent);
  if (mode === 'campus') {
    const badges = { explorer: LEVEL.sparks.filter(item => item.secret && state.collected.has(item.id)).length >= 10,
      debugger: state.boss.health === 0, collaborator: state.acceptedSuggestions.size === LEVEL.suggestions.length };
    for (const [name, earned] of Object.entries(badges)) {
      el(`badge-${name}`).classList.toggle('earned', earned);
      el(`badge-${name}`).setAttribute('aria-label', `${name}: ${earned ? 'earned' : 'not earned'}`);
    }
  }
  el('orbit-unlock-button').hidden = orbit || !won || !progress.campusComplete;
  el('campus-return-button').hidden = mode === 'campus';
  text('replay-label', won ? 'Replay mission' : 'Retry sector');
  clearInput(); panels(); (mode === 'campus' ? el('orbit-unlock-button') : el('replay-button')).focus({ preventScroll: true });
  announce(won ? 'Mission complete. Results are ready.' : 'Flight ended. Retry the current sector.');
}
function savePreferences() { writeStorage('mission-copilot-preferences-v1', preferences); }
function audioControls() {
  for (const bus of ['music', 'effects']) {
    audio.setVolume(bus, preferences[bus] ? preferences[`${bus}Volume`] / 100 : 0);
    el(`${bus}-enabled`).checked = preferences[bus]; text(`${bus}-output`, `${preferences[`${bus}Volume`]}%`);
  }
  el('boss-voice-enabled').checked = preferences.bossVoice;
  text('dialogue-output', `${preferences.dialogueVolume}%`);
  const any = preferences.music || preferences.effects || preferences.bossVoice;
  const label = any ? 'Mute sound' : 'Enable sound';
  el('sound-button').setAttribute('aria-pressed', String(any));
  el('sound-button').setAttribute('aria-label', label); el('sound-button').dataset.tooltip = label;
  icon('sound-icon', any ? 'volume-2' : 'volume-x');
}
async function toggleAudio(bus) {
  if (audioBusy) return;
  audioBusy = true;
  try {
    const next = bus ? !preferences[bus] : !(preferences.music || preferences.effects || preferences.bossVoice);
    if (next && !await audio.unlock()) {
      text('audio-status', 'Audio is unavailable in this browser.'); audioControls(); return;
    }
    if (bus) preferences[bus] = next;
    else {
      preferences.music = preferences.effects = next;
      if (!next) { preferences.bossVoice = false; cancelSpeech(); }
    }
    audioControls(); savePreferences();
    text('audio-status', preferences.music || preferences.effects ? 'Sound enabled.' : 'Sound muted.');
  } finally { audioBusy = false; }
}
function applyAccessibility() {
  document.body.classList.toggle('reduced-motion', preferences.reducedMotion || motion.matches);
  el('dialogue-strip').classList.toggle('subtitles-off', !preferences.subtitles); text('shake-output', `${preferences.shake}%`);
}
const keyLabel = code => code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5)
  : { ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ArrowLeft: 'Left arrow', ArrowRight: 'Right arrow',
    ArrowUp: 'Up arrow', ArrowDown: 'Down arrow' }[code] ?? code;
for (const [action, label] of Object.entries(bindingNames)) {
  const wrapper = document.createElement('label'); wrapper.textContent = label;
  const select = document.createElement('select'); select.id = `binding-${action}`;
  for (const code of allowedKeys) {
    const option = document.createElement('option'); option.value = code; option.textContent = keyLabel(code); select.append(option);
  }
  select.value = preferences.bindings[action];
  select.addEventListener('change', () => {
    const conflict = Object.entries(preferences.bindings).find(([name, code]) => name !== action && code === select.value);
    if (conflict) {
      text('binding-status', `${keyLabel(select.value)} is assigned to ${bindingNames[conflict[0]]}.`);
      select.value = preferences.bindings[action]; return;
    }
    preferences.bindings[action] = select.value;
    text('binding-status', `${label}: ${keyLabel(select.value)}.`); clearInput(); savePreferences();
  });
  wrapper.append(select); el('binding-grid').append(wrapper);
}
el('reset-bindings').addEventListener('click', () => {
  preferences.bindings = { ...defaultBindings };
  for (const action of Object.keys(defaultBindings)) el(`binding-${action}`).value = defaultBindings[action];
  text('binding-status', 'Default bindings restored.'); clearInput(); savePreferences();
});
el('settings-button').addEventListener('click', () => {
  if (playing()) pause(true, false);
  clearInput(); el('settings-dialog').showModal(); el('close-settings').focus();
});
el('close-settings').addEventListener('click', () => el('settings-dialog').close());
el('settings-dialog').addEventListener('close', () => {
  panels(); (started && state.status === 'paused' ? el('resume-button') : el('settings-button')).focus({ preventScroll: true });
});
for (const [id, name] of [['reduced-motion', 'reducedMotion'], ['high-contrast', 'highContrast'], ['subtitles', 'subtitles']]) {
  el(id).checked = preferences[name];
  el(id).addEventListener('change', () => { preferences[name] = el(id).checked; applyAccessibility(); savePreferences(); });
}
el('shake-volume').value = preferences.shake;
el('shake-volume').addEventListener('input', () => {
  preferences.shake = Number(el('shake-volume').value); applyAccessibility(); savePreferences();
});
motion.addEventListener('change', applyAccessibility);
el('boss-voice-enabled').disabled = !speechAvailable;
if (!speechAvailable) preferences.bossVoice = false;
el('boss-voice-enabled').addEventListener('change', () => {
  preferences.bossVoice = el('boss-voice-enabled').checked;
  cancelSpeech(); audioControls(); savePreferences();
});
el('dialogue-volume').value = preferences.dialogueVolume;
el('dialogue-volume').addEventListener('input', () => {
  preferences.dialogueVolume = Number(el('dialogue-volume').value); audioControls(); savePreferences();
});
el('sound-button').addEventListener('click', () => { void toggleAudio(); });
for (const bus of ['music', 'effects']) {
  el(`${bus}-volume`).value = preferences[`${bus}Volume`];
  el(`${bus}-enabled`).addEventListener('change', () => { void toggleAudio(bus); });
  el(`${bus}-volume`).addEventListener('input', () => {
    preferences[`${bus}Volume`] = Number(el(`${bus}-volume`).value); audioControls(); savePreferences();
  });
}
el('start-button').addEventListener('click', () => start());
el('restart-button').addEventListener('click', () => start());
el('replay-button').addEventListener('click', () => start(state.status === 'failed'));
el('resume-button').addEventListener('click', () => pause(false));
el('orbit-unlock-button').addEventListener('click', () => chooseMode('orbit'));
el('campus-return-button').addEventListener('click', () => chooseMode('campus'));
for (const name of Object.keys(engines)) el(`${name}-tab`).addEventListener('click', () => chooseMode(name));
el('character-select').addEventListener('change', () => {
  if (mode !== 'quest' || started) return;
  state = createMission('quest'); hud();
});
document.querySelector('.mission-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.code)) return;
  event.preventDefault();
  const names = Object.keys(engines).filter(name => name !== 'orbit' || progress.campusComplete);
  const index = names.indexOf(mode);
  const next = event.code === 'Home' ? names[0] : event.code === 'End' ? names.at(-1)
    : names[(index + (event.code === 'ArrowRight' ? 1 : names.length - 1)) % names.length];
  chooseMode(next); el(`${next}-tab`).focus();
});
let pointerPauseIntent = null;
el('pause-button').addEventListener('pointerdown', () => { pointerPauseIntent = state.status !== 'paused'; });
el('pause-button').addEventListener('pointercancel', () => { pointerPauseIntent = null; });
el('pause-button').addEventListener('click', event => {
  const value = event.detail > 0 && pointerPauseIntent !== null ? pointerPauseIntent : state.status !== 'paused';
  pointerPauseIntent = null; pause(value);
});
window.addEventListener('keydown', event => {
  if (el('settings-dialog').open) return;
  if (event.code === 'Escape' && started && !finished()) {
    event.preventDefault(); if (!event.repeat) pause(state.status !== 'paused'); return;
  }
  const action = actionFor(event.code);
  if (!action || !playing() || document.activeElement !== canvas || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  if (!keys.has(event.code) && !event.repeat) press(action);
  keys.set(event.code, action);
});
window.addEventListener('keyup', event => { keys.delete(event.code); });
canvas.addEventListener('blur', event => {
  if (playing() && !event.relatedTarget?.closest('[data-action]')) pause(true, false);
});
function pointSaucer(event) {
  const bounds = canvas.getBoundingClientRect(); orbitPointer = (event.clientX - bounds.left) / bounds.width * state.width;
}
canvas.addEventListener('pointerdown', event => {
  if (!playing() || event.button !== 0) return;
  event.preventDefault(); canvas.focus({ preventScroll: true });
  if (mode === 'orbit') {
    canvas.setPointerCapture(event.pointerId); pointSaucer(event);
    if (state.phase === 'ready') jumpPressed = true;
  }
});
canvas.addEventListener('pointermove', event => {
  if (playing() && mode === 'orbit' && (event.pointerType === 'mouse' || canvas.hasPointerCapture(event.pointerId))) pointSaucer(event);
});
controls.forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (!playing() || button.disabled || event.button !== 0) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.action); press(button.dataset.action);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(name, event => { pointers.delete(event.pointerId); });
  }
  button.addEventListener('click', event => {
    if (event.detail === 0 && playing() && !button.disabled) press(button.dataset.action);
  });
});
window.addEventListener('blur', () => {
  cancelSpeech(); clearInput(); if (playing()) pause(true, false); audio.setStatus('paused');
});
window.addEventListener('pagehide', event => { cancelSpeech(); if (!event.persisted) void audio.dispose(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelSpeech(); clearInput(); if (playing()) pause(true, false); }
});
new ResizeObserver(resize).observe(el('game-viewport'));
function processEvents(events) {
  if (finished()) audio.setStatus(state.status === 'complete' ? 'complete' : 'paused');
  const played = new Set();
  for (const event of events) {
    const app = mode === 'quest' ? QUEST_LEVEL.sparks.find(item => item.id === event.id)?.app : undefined;
    const soundKey = event.type === 'spark' ? `spark:${app}` : event.type;
    if (!played.has(soundKey)) { audio.effect(event, app); played.add(soundKey); }
    if (mode === 'quest') {
      if (event.type === 'checkpoint') say(`${event.name} checkpoint online.`, 'TEAM');
      if (event.type === 'respawn') { clearInput(); say(`Back at ${event.name}. Health restored; your recruits and collectibles are safe.`, 'TEAM'); }
      if (event.type === 'bossEnter') { clearInput(); say('AI Core checkpoint. Debug Blaster equipped.', 'TEAM'); }
      if (event.type === 'damage') announce(`${event.health} health remaining.`);
      if (event.type === 'powerup') say(event.kind === 'microsoft' ? 'Microsoft protection active.' : 'Debug Blaster equipped.', 'TEAM');
      if (event.type === 'helperUnlocked') say(`${event.name} has joined the team.`, 'TEAM');
      if (event.type === 'partyRecover') announce(`${CHARACTERS[event.character].name} regrouped.`);
      if (event.type === 'bossExposed') announce('Core exposed.');
      if (event.type === 'bossDefeated') { clearInput(); say('Core patched. The reactor is stabilizing.', 'TEAM'); }
      if (event.type === 'complete') showResults();
      continue;
    }
    if (event.type === 'suggestion') say(`${event.name} restored. Just the bridge. No surprise renovations.`);
    if (event.type === 'checkpoint') say(`${event.name} checkpoint online.`);
    if (event.type === 'respawn') say(`Back at ${event.name}. Cells and approved bridges are safe. Retry ${state.deaths}.`);
    if (event.type === 'boss' && event.phase === 'exposed') say('The restart switch is exposed. Finally, a useful onboarding step.');
    if (event.type === 'bossHit') say(event.health === 0 ? 'Wizard restored. Dash online. The campus beacon is waiting.' : 'One reset closer to a working campus.');
    if (event.type === 'agent') say({ patch: 'Patch: Recovery net restored.', query: 'Query: Priority targets marked.', aegis: 'Aegis: Missile defense active.' }[event.name]);
    if (event.type === 'recovery') say('Recovery charge used. The core is back on your shield.');
    if (event.type === 'net') say('Core recovered. No recovery charge spent.');
    if (event.type === 'powerup') say(`${{ wide: 'Wide Shield', multi: 'Multiball', magnet: 'Magnetic Catch', laser: 'Debug Laser', net: 'Recovery Net' }[event.kind]} online.`);
    if (event.type === 'wave') say(`${ORBIT.waves[event.wave]}. ${event.wave === 4 ? 'Recovery reserve restored. We are repairing the defense, not removing it.' : 'Sector checkpoint online.'}`);
    if (event.type === 'complete' || event.type === 'failed') showResults();
  }
}
function frame(now) {
  const dt = previous ? (now - previous) / 1000 : 0; previous = now;
  if (playing()) {
    const held = new Set([...keys.values(), ...pointers.values()]);
    const input = { left: held.has('left'), right: held.has('right'), jumpHeld: held.has('jump'),
      jumpPressed, boostPressed, interactPressed, agentPressed, pointerX: orbitPointer,
      fire: held.has('fire') || now < fireUntil, attackPressed, helperPressed };
    const events = engines[mode].update(state, input, dt);
    if (mode === 'quest') audio.setStage(state.stage, state.boss?.phase ?? 0);
    jumpPressed = false; boostPressed = false; interactPressed = false; agentPressed = null;
    attackPressed = false; helperPressed = false; processEvents(events);
  }
  const reduced = preferences.reducedMotion || motion.matches;
  syncQuestDialogue();
  engines[mode].render(ctx, state, reduced,
    { highContrast: preferences.highContrast, shake: preferences.shake / 100 });
  hud(); requestAnimationFrame(frame);
}
if (ctx) {
  icons(); applyAccessibility(); resize(); panels(); audioControls();
  el('start-button').disabled = false; el('sound-button').disabled = false;
  text('load-status', ''); text('storage-status', storageAvailable ? 'Local progress' : 'Session-only progress');
  requestAnimationFrame(frame);
} else {
  text('load-status', 'Canvas graphics are unavailable in this browser.');
}

import '../vendor/lucide.min.js';
import { VIEW, APPS } from './level.js';
import { ORBIT, AGENTS } from './orbit.js';
import { render } from './art.js';
import { renderOrbit } from './orbit-art.js';
import { createAudio } from './audio.js';
import { CHARACTERS, companionIds } from './party.js';
import { COMBAT } from './encounters.js';
import { CAMPAIGN, createCampaign, updateCampaign, advanceCampaign, selectLevel, retryLevel,
  saveCampaign, pauseCampaign, chapterAt } from './campaign.js';
import { interactionFor, missionStations, stationStatus, missionReady, missionObjective, interact } from './missions.js';
import { workView, prepareQuiz, validQuizOverrides } from './trivia-tasks.js';
import { renderQuiz, createQuizEditor } from './quiz-ui.js';
import { climbFor } from './actor-physics.js';
import { INTERLUDES, arcadeObjective } from './arcade.js';
import { renderArcade } from './arcade-art.js';
import { selectInterlude, nextDestination } from './campaign.js';

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
  climbUp: 'KeyR', climbDown: 'KeyV',
  interact: 'KeyE', patch: 'Digit1', query: 'Digit2', aegis: 'Digit3',
  attack: 'KeyJ', helper: 'KeyK', fire: 'KeyF', pulse: 'KeyQ', focus: 'KeyC' };
const bindingNames = { left: 'Move left', right: 'Move right', jump: 'Jump / Launch',
  climbUp: 'Climb up', climbDown: 'Climb down',
  boost: 'Copilot boost', interact: 'Interact / Approve', patch: 'Repair net', query: 'Analyze targets', aegis: 'Defend shield',
  attack: 'Melee attack', helper: 'Command helpers', fire: 'Debug Blaster', pulse: 'Debug Pulse', focus: 'Focus Mode' };
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
  return storageAvailable;
}
const campaignKey = 'cloud-quest-campaign-v1';
const quizStorageKey = 'cloud-quest-quizzes-v1';
const savedProgress = readStorage(campaignKey, {});
const savedPrefs = readStorage('mission-copilot-preferences-v1', {});
const volume = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
const preferences = { music: savedPrefs?.music === true, effects: savedPrefs?.effects === true,
  musicVolume: volume(savedPrefs?.musicVolume, 45), effectsVolume: volume(savedPrefs?.effectsVolume, 65),
  bossVoice: savedPrefs?.bossVoice === true, dialogueVolume: volume(savedPrefs?.dialogueVolume, 65),
  reducedMotion: typeof savedPrefs?.reducedMotion === 'boolean' ? savedPrefs.reducedMotion : motion.matches,
  highContrast: savedPrefs?.highContrast === true, subtitles: savedPrefs?.subtitles !== false,
  shake: volume(savedPrefs?.shake, 0), bindings: { ...defaultBindings } };
for (const action of Object.keys(defaultBindings)) {
  const binding = savedPrefs?.bindings?.[action];
  if (allowedKeys.includes(binding)
    && !Object.entries(preferences.bindings).some(([other, code]) => other !== action && code === binding)) {
    preferences.bindings[action] = binding;
  }
}
let campaign = createCampaign(savedProgress?.leader ?? 'marco', savedProgress ?? {},
  validQuizOverrides(readStorage(quizStorageKey, {})));
let state = campaign.run;
let started = false;
let previous = 0;
let audioBusy = false;
let jumpPressed = false;
let boostPressed = false;
let interactPressed = false;
let agentPressed = null;
let orbitPointer = null;
let lastStation = null;
let missionMessageUntil = 0;
let pulsePressed = false;
let taskStation = null;
let taskSignature = '';
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
const keys = new Map();
const pointers = new Map();
const orbitMode = () => state.mode === 'orbit';
const arcadeMode = () => state.mode === 'arcade';
const currentMission = () => arcadeMode() ? state.mission : CAMPAIGN[campaign.levelIndex];
const openDialog = () => ['task-dialog','settings-dialog','level-dialog','quiz-editor-dialog'].map(el).find(dialog => dialog.open);
const playing = () => started && state.status === 'playing' && !openDialog();
const finished = () => state.status === 'complete' || state.status === 'failed';
const announce = message => text('game-announcement', message);
function say(message, speaker = 'MISSION') {
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
  if (orbitMode() || arcadeMode() || !started || state.time < missionMessageUntil) return;
  const boss = state.stage === 'boss' ? state.boss : null;
  if (captionBoss !== boss) { cancelSpeech(); captionBoss = boss; bossCaptionId = 0; }
  const caption = boss?.dialogue.current;
  if (caption && caption.id !== bossCaptionId) {
    bossCaptionId = caption.id; say(caption.text, 'BOSS'); speakCaption(caption);
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
  pulsePressed = false;
}
function press(action) {
  if (!orbitMode() && state.boss?.defeated || el('task-dialog').open) return;
  if (arcadeMode()) {
    if (['jump', 'fire', 'attack', 'interact'].includes(action)) jumpPressed = true;
    if (action === 'boost') boostPressed = true;
    if (['left', 'right'].includes(action)) orbitPointer = null;
    return;
  }
  if (orbitMode() && ['jump', 'interact'].includes(action)) {
    const station = interactionFor(state);
    if (station) { openTask(station); return; }
  }
  if (action === 'attack') attackPressed = true;
  if (action === 'helper') helperPressed = true;
  if (action === 'fire') fireUntil = performance.now() + 100;
  if (action === 'jump') jumpPressed = true;
  if (action === 'boost') boostPressed = true;
  if (action === 'interact') {
    if (orbitMode()) jumpPressed = true;
    else {
      const station = interactionFor(state);
      if (station?.workflow) openTask(station);
      else { say(missionObjective(state).summary); missionMessageUntil = state.time + 6; }
    }
  }
  if (action === 'pulse' && campaign.unlocked >= 2) pulsePressed = true;
  if (Object.hasOwn(AGENTS, action)) agentPressed = action;
  if (action === 'left' || action === 'right') orbitPointer = null;
}
function actionFor(code) {
  const assigned = Object.entries(preferences.bindings).find(([, key]) => key === code)?.[0];
  return assigned ?? { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', KeyW: 'jump', ShiftRight: 'boost' }[code];
}
function resize() {
  const width = VIEW.width;
  const density = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== width * density || canvas.height !== VIEW.height * density) {
    canvas.width = width * density; canvas.height = VIEW.height * density;
  }
  canvas.style.aspectRatio = `${width} / ${VIEW.height}`;
}

function playfieldBounds() {
  const bounds = canvas.getBoundingClientRect();
  const scale = Math.min(bounds.width / VIEW.width, bounds.height / VIEW.height);
  return { scale, left: bounds.left + (bounds.width - VIEW.width * scale) / 2,
    top: bounds.top + (bounds.height - VIEW.height * scale) / 2 };
}

function positionWorkstation(station) {
  const button = el('interact-button');
  const stage = el('game-viewport').getBoundingClientRect();
  const bounds = playfieldBounds();
  const x = orbitMode() ? state.paddle.x : station.x - (state.stage === 'boss' ? 0 : state.cameraX);
  const y = orbitMode() ? state.paddle.y - 85 : station.y - 150;
  const halfWidth = button.offsetWidth / 2;
  const left = Math.max(halfWidth + 12, Math.min(stage.width - halfWidth - 12, bounds.left - stage.left + x * bounds.scale));
  const hudBottom = el('game-controls').getBoundingClientRect().bottom - stage.top;
  const minimum = Math.min(stage.height - 56, hudBottom + button.offsetHeight + 6);
  const top = Math.max(minimum, Math.min(stage.height - 56, bounds.top - stage.top + y * bounds.scale));
  button.style.left = `${left}px`; button.style.top = `${top}px`;
}
function arcadeHud() {
  const active = playing();
  controls.forEach(button => { button.disabled = !active; });
  text('score-value', state.score.toLocaleString());
  text('items-label', 'Health'); text('sparks-value', state.health); text('sparks-total', 3);
  text('combo-label', state.kind === 'drive' ? 'Speed' : 'Cleared');
  text('combo-value', state.kind === 'drive' ? `${Math.round(state.speed)} km/h` : state.destroyed);
  text('checkpoint-label', 'Stage'); text('checkpoint-value', 'Arcade');
  text('boost-label', 'Time'); text('boost-value', `${Math.ceil(state.remaining)}s`);
  text('mission-objective', arcadeObjective(state)); text('chapter-name', 'Arcade interlude');
  text('arcade-action-label', state.kind === 'drive' ? state.boostCooldown > 0 ? `Boost ${Math.ceil(state.boostCooldown)}s` : 'Boost' : 'Fire');
  el('interact-button').hidden = true;
  el('climb-controls').hidden = true;
  el('game-viewport').classList.remove('has-workstation', 'has-climb');
}

function hud() {
  if (arcadeMode()) { arcadeHud(); return; }
  const orbit = orbitMode();
  const mission = currentMission();
  const active = playing() && !state.boss?.defeated;
  const request = interactionFor(state);
  const status = request ? stationStatus(state, request) : '';
  const stations = missionStations(state);
  const objective = missionObjective(state);
  text('score-value', state.score.toLocaleString());
  text('items-label', orbit ? 'Recoveries' : 'App items');
  text('sparks-value', orbit ? state.charges : state.collected.size);
  text('sparks-total', orbit ? 3 : state.world.sparks.length);
  text('combo-label', orbit ? 'Wave' : 'Combo');
  text('combo-value', orbit ? `${state.wave + 1} / 5` : `x${state.combo}`);
  text('checkpoint-label', orbit ? 'Sector' : 'Checkpoint');
  text('checkpoint-value', orbit ? state.finale ? 'Monolith command interface' : ORBIT.waves[state.wave]
    : state.stage === 'boss' ? mission.boss : state.world.checkpoints[state.checkpointIndex].name);
  text('boost-label', orbit ? 'Compute' : 'Copilot boost');
  text('boost-value', orbit ? `${Math.floor(state.compute)} / 100`
    : state.player.boostCooldown > 0 ? `${state.player.boostCooldown.toFixed(1)}s` : 'Ready');
  text('mission-objective', orbit ? state.finale ? 'Restore the Monolith command interface'
    : objective.summary
    : state.stage === 'boss' && !state.boss.objectivesLocked
      ? `${state.arena.phases[state.boss.phase].name}: ${state.boss.mode}`
      : objective.summary);
  text('chapter-name', orbit ? state.finale ? 'Final command' : ORBIT.waves[state.wave]
    : state.stage === 'boss' ? mission.boss : chapterAt(mission, state.player.x).name);
  el('interact-button').hidden = !active || (orbit ? state.phase !== 'ready' : !request);
  el('game-viewport').classList.toggle('has-workstation', !el('interact-button').hidden);
  const canClimb = !orbit && state.stage !== 'boss' && Boolean(state.player.climbing || climbFor(state.player, state.world));
  el('climb-controls').hidden = !canClimb;
  el('game-viewport').classList.toggle('has-climb', canClimb);
  el('interact-button').disabled = !active;
  text('interact-label', orbit && !request ? 'Launch core' : status === 'Complete' ? 'View score'
    : status === 'Ready' ? 'Open quiz' : 'Continue quiz');
  if (!el('interact-button').hidden) positionWorkstation(request);
  controls.forEach(button => { if (!['interact','patch','query','aegis'].includes(button.dataset.action)) button.disabled = !active; });
  if (!orbit) {
    const helpers = companionIds(state.party);
    text('health-value', `${state.combat.health} / ${COMBAT.maxHealth}`);
    text('weapon-value', state.combat.blaster ? 'Debug Blaster' : 'Not equipped');
    text('protection-value', state.combat.protection > 0 ? `${state.combat.protection.toFixed(1)}s` : 'Inactive');
    text('party-status', [CHARACTERS[campaign.leader].name, ...helpers.map(name =>
      `${CHARACTERS[name].name}: ${!state.party.unlocked.has(name) ? 'unrecruited' : state.party.actors[name].recovering ? 'regrouping'
        : state.party.actors[name].climbing ? 'climbing' : state.party.actors[name].ai?.mode === 'collect' ? 'collecting'
        : ['defend','boss-support'].includes(state.party.actors[name].ai?.mode) ? 'attacking' : 'following'}`)].join(' / '));
    const counts = {};
    for (const item of state.world.sparks) {
      counts[item.app] ??= { total: 0, count: 0 }; counts[item.app].total += 1;
      if (state.collected.has(item.id)) counts[item.app].count += 1;
    }
    text('productivity-counts', Object.entries(counts).map(([app, count]) => `${APPS[app].label}: ${count.count} / ${count.total}`).join('  |  '));
    el('fire-button').disabled = !active || !state.combat.blaster;
    el('boost-button').disabled = !active || state.player.boostCooldown > 0;
    el('helper-button').disabled = !active || !helpers.some(name => state.party.unlocked.has(name) && !state.party.actors[name].recovering);
    el('pulse-button').disabled = !active || campaign.unlocked < 2 || state.missionProgress.pulseCooldown > 0;
    el('focus-button').disabled = !active || campaign.unlocked < 6;
    el('quest-boss-status').hidden = state.stage !== 'boss';
    if (state.boss) {
      text('boss-name', mission.boss);
      el('quest-boss-health').max = state.boss.maxHealth; el('quest-boss-health').value = state.boss.health;
      text('quest-boss-value', `${state.boss.health} / ${state.boss.maxHealth}`);
    }
  } else {
    for (const [name, agent] of Object.entries(AGENTS)) {
      const remaining = state.agentCooldowns[name];
      text(`${name}-status`, remaining > 0 ? `${Math.ceil(remaining)}s` : `${agent.cost} compute`);
      el(`agent-${name}`).disabled = !active || remaining > 0 || state.compute < agent.cost;
    }
  }
  const signature = stations.map(station => `${station.id}:${stationStatus(state, station)}`).join('|')
    + (orbit ? `:${active}:${state.phase}` : '');
  if (signature !== taskSignature) {
    taskSignature = signature;
    let requiredNumber = 0;
    el('task-ribbon').replaceChildren(...stations.map(station => {
      const item = document.createElement('li');
      item.className = stationStatus(state, station) === 'Complete' ? 'complete' : '';
      const name = document.createElement('span');
      name.textContent = station.optional ? `${station.title} (optional)` : `${++requiredNumber}. ${station.title}`;
      const detail = document.createElement('small'); detail.textContent = stationStatus(state, station);
      if (orbit) {
        const button = document.createElement('button'); button.type = 'button';
        button.disabled = !active || state.phase !== 'ready' || station.wave > state.wave;
        button.append(name, detail); button.addEventListener('click', () => openTask(station)); item.append(button);
      } else item.append(name, detail);
      return item;
    }));
  }
  if (request && request.id !== lastStation && active) {
    lastStation = request.id;
    say(`${request.title} is available.`);
    missionMessageUntil = state.time + 4;
  }
}
function panels() {
  const mission = currentMission();
  const orbit = orbitMode();
  const arcade = arcadeMode();
  el('start-panel').hidden = started;
  el('pause-panel').hidden = !started || state.status !== 'paused' || Boolean(openDialog());
  el('complete-panel').hidden = !started || !finished();
  el('pause-button').disabled = !started || finished();
  const pauseLabel = state.status === 'paused' ? 'Resume' : 'Pause';
  el('pause-button').setAttribute('aria-label', pauseLabel); el('pause-button').dataset.tooltip = pauseLabel;
  icon('pause-icon', state.status === 'paused' ? 'play' : 'pause');
  canvas.tabIndex = playing() ? 0 : -1;
  audio.setStatus(started ? openDialog() || state.status === 'failed' ? 'paused' : state.status : 'idle');
  audio.setStage(orbit || arcade ? 'world' : state.stage, state.boss?.phase ?? 0);
  audio.setTheme(orbit ? 'orbit' : mission.theme);
  document.body.classList.toggle('is-orbit', orbit);
  document.body.classList.toggle('is-arcade', arcade);
  document.body.style.setProperty('--world-accent', mission.color);
  el('agent-controls').hidden = !orbit;
  el('character-choice').hidden = started;
  el('character-select').disabled = started;
  el('character-select').value = campaign.leader;
  el('quest-readout').hidden = orbit || arcade;
  el('combat-controls').hidden = orbit || arcade;
  el('touch-controls').hidden = orbit || arcade;
  el('arcade-controls').hidden = !arcade;
  el('task-ribbon').hidden = arcade || orbit && state.finale;
  text('build-label', `${CHARACTERS[campaign.leader].name.toUpperCase()} / ${arcade ? 'ARCADE BREAK' : `TRIVIA / WORLD ${mission.number} OF 8`}`);
  text('mission-number', String(mission.number).padStart(2, '0'));
  text('world-label', mission.world ? `${mission.world.traversal} / ${mission.world.difficulty}` : mission.subtitle);
  text('level-title', mission.title);
  text('level-counter', arcade ? 'Arcade' : `${mission.number} / 8`);
  text('start-eyebrow', arcade ? `ARCADE / AFTER WORLD ${mission.number}` : `WORLD ${mission.number} / ${mission.world?.traversal ?? mission.subtitle}`);
  text('start-title', mission.title);
  text('game-objective', mission.intro);
  text('start-label', 'Start level');
  icon('interact-icon', orbit && !interactionFor(state) ? 'play' : 'brain-circuit');
  icon('arcade-action-icon', arcade && state.kind === 'drive' ? 'zap' : 'crosshair');
  canvas.setAttribute('aria-label', `${mission.title}, level ${mission.number}, ${CHARACTERS[campaign.leader].name}`);
  const bindings = Object.fromEntries(Object.entries(preferences.bindings).map(([action, code]) => [action, keyLabel(code)]));
  text('keyboard-help', arcade
    ? `${bindings.left} and ${bindings.right} move; mouse or touch dragging also steers. ${state.kind === 'drive'
      ? `${bindings.jump} or ${bindings.boost} boosts, ${bindings.climbDown} brakes.` : `Hold ${bindings.jump} or ${bindings.fire} to fire.`} Escape pauses.`
    : orbit
    ? `${bindings.left} and ${bindings.right} move the saucer. Mouse or touch dragging also moves it. ${bindings.jump} launches. ${bindings.patch}, ${bindings.query}, ${bindings.aegis} activate repair, analysis, defense. Escape pauses.`
    : `${bindings.left} and ${bindings.right} move. Hold ${bindings.jump}, W, or Up Arrow for a full jump. ${bindings.climbUp} and ${bindings.climbDown} climb ladders or ropes. Jump to dismount. ${bindings.boost} boosts. ${bindings.attack} attacks, ${bindings.fire} fires, ${bindings.helper} commands your recruited team. ${bindings.interact} interacts with terminals. ${bindings.pulse} activates Debug Pulse. Escape pauses.`);
  hud();
}

function syncPanels() {
  const dialog = openDialog();
  el('panel-backdrop').hidden = !dialog;
  el('game-ui').inert = Boolean(dialog);
  canvas.inert = Boolean(dialog);
  el('game-viewport').classList.toggle('panel-open', Boolean(dialog));
  panels();
}

function showPanel(id, focusId) {
  el(id).show();
  syncPanels();
  el(focusId).focus({ preventScroll: true });
}
function persistCampaign() { writeStorage(campaignKey, saveCampaign(campaign)); }
function activateRun() {
  state = campaign.run; previous = 0; lastStation = null; taskSignature = '';
  cancelSpeech(); captionBoss = null; bossCaptionId = 0; partyCaptionId = 0;
  clearInput(); audio.setStatus('idle'); audio.reset(); resize(); panels();
}
function start(retry = false) {
  if (retry) retryLevel(campaign);
  started = true; activateRun();
  if (preferences.music || preferences.effects) void audio.unlock();
  canvas.focus({ preventScroll: true });
  say(currentMission().intro); missionMessageUntil = state.time + 7;
  persistCampaign();
}
function pause(value, focus = true) {
  if (!started || finished()) return;
  if (value) cancelSpeech();
  pauseCampaign(campaign, value); clearInput(); previous = 0; panels();
  if (!value && (preferences.music || preferences.effects)) void audio.unlock();
  if (focus) (value ? el('resume-button') : canvas).focus({ preventScroll: true });
  announce(value ? 'Game paused.' : 'Game resumed.');
}
function showResults() {
  const mission = currentMission();
  const orbit = orbitMode();
  const arcade = arcadeMode();
  const won = state.status === 'complete';
  persistCampaign();
  text('result-eyebrow', arcade ? won ? 'Arcade complete' : 'Arcade round ended'
    : won ? campaign.finished ? 'Campaign complete' : `Level ${mission.number} complete` : 'Recovery reserve depleted');
  text('complete-title', won ? campaign.finished ? 'Control restored.' : `${mission.title} restored.` : 'Signal lost.');
  text('completion-summary', won ? mission.ending : arcade ? 'Your campaign progress is safe.' : 'The current wave is checkpointed. Retry with a fresh reserve.');
  text('final-score', (state.score + (state.finale ? campaign.segmentScore : 0)).toLocaleString());
  text('final-items-label', arcade ? state.kind === 'drive' ? 'Distance' : 'Cleared' : orbit ? 'Wave' : 'Items');
  text('final-sparks', arcade ? state.kind === 'drive' ? `${Math.floor(state.distance)} m` : state.destroyed
    : orbit ? `${state.wave + 1} / 5` : `${state.collected.size} / ${state.world.sparks.length}`);
  text('final-combo-label', 'Campaign best');
  text('final-combo', [...Object.values(campaign.scores), ...Object.values(campaign.arcadeScores)]
    .reduce((total, score) => total + score, 0).toLocaleString());
  el('mission-badges').hidden = orbit || arcade;
  if (!orbit && !arcade) {
    const badges = { explorer: state.world.sparks.filter(item => item.secret && state.collected.has(item.id)).length >= 10,
      debugger: won, collaborator: missionReady(state) };
    for (const [name, earned] of Object.entries(badges)) {
      el(`badge-${name}`).classList.toggle('earned', earned);
      el(`badge-${name}`).setAttribute('aria-label', `${name}: ${earned ? 'earned' : 'not earned'}`);
    }
  }
  const destination = nextDestination(campaign);
  el('next-level-button').hidden = !destination || !won && !arcade;
  text('next-level-label', destination ? `Next: ${destination.title}` : 'Campaign complete');
  text('replay-label', won ? arcade ? 'Replay arcade' : 'Replay level' : arcade ? 'Retry arcade' : 'Retry wave');
  clearInput(); panels();
  ((won || arcade) && destination ? el('next-level-button') : el('replay-button')).focus({ preventScroll: true });
  announce(won ? `${mission.title} complete.` : arcade ? 'Arcade round ended.' : 'Flight ended. Retry the current wave.');
}

function renderWorkstation(feedback = '') {
  const station = taskStation;
  const job = state.missionProgress.jobs[station.id] ??= { status: 'idle' };
  prepareQuiz(station, job);
  const view = workView(station, job);
  icon('task-product-icon', view.task.icon);
  renderQuiz(document, view, `Level ${currentMission().number}: ${currentMission().title}`, feedback || job.feedback || '');
}

function openTask(station) {
  if (!playing() || !station.workflow) return;
  cancelSpeech(); clearInput(); taskStation = station;
  renderWorkstation();
  showPanel('task-dialog', 'task-title');
}
function openMap() {
  if (playing()) pause(true, false);
  clearInput();
  const rows = CAMPAIGN.flatMap(mission => {
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'level-option'; button.style.setProperty('--level-accent', mission.color);
    button.disabled = mission.index > campaign.unlocked;
    const number = document.createElement('span'); number.className = 'level-option-number'; number.textContent = String(mission.number).padStart(2, '0');
    const name = document.createElement('span'); name.textContent = mission.title;
    const status = document.createElement('small'); status.textContent = campaign.completed.has(mission.id) ? 'Completed'
      : mission.index > campaign.unlocked ? 'Locked' : mission.index === campaign.levelIndex ? 'Current level' : 'Available';
    button.append(number, name, status);
    button.addEventListener('click', () => {
      if (!selectLevel(campaign, mission.index)) return;
      started = false; el('level-dialog').close(); activateRun(); persistCampaign();
      el('start-button').focus({ preventScroll: true });
    });
    const bonus = INTERLUDES[mission.id];
    if (!bonus) return [button];
    const arcadeButton = document.createElement('button'); arcadeButton.type = 'button';
    arcadeButton.className = 'level-option arcade-option'; arcadeButton.disabled = mission.index >= campaign.unlocked;
    const badge = document.createElement('span'); badge.className = 'level-option-number'; badge.textContent = '+';
    const title = document.createElement('span'); title.textContent = bonus.title;
    const detail = document.createElement('small'); detail.textContent = campaign.arcadeCompleted.has(bonus.id) ? 'Arcade cleared' : 'Arcade interlude';
    arcadeButton.append(badge, title, detail);
    arcadeButton.addEventListener('click', () => {
      if (!selectInterlude(campaign, mission.index)) return;
      started = false; el('level-dialog').close(); activateRun(); persistCampaign(); el('start-button').focus({ preventScroll: true });
    });
    return [button, arcadeButton];
  });
  el('level-list').replaceChildren(...rows);
  showPanel('level-dialog', 'close-levels');
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
  clearInput(); showPanel('settings-dialog', 'close-settings');
});
el('close-settings').addEventListener('click', () => el('settings-dialog').close());
el('fullscreen-button').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el('mission-panel').requestFullscreen();
  } catch { announce('Full screen is unavailable in this browser.'); }
});
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  el('fullscreen-button').setAttribute('aria-label', label);
  el('fullscreen-button').dataset.tooltip = label;
  resize();
});
el('settings-dialog').addEventListener('close', () => {
  syncPanels();
  if (!openDialog()) (started && state.status === 'paused' ? el('resume-button') : el('settings-button')).focus({ preventScroll: true });
});
const quizEditor = createQuizEditor(document, CAMPAIGN, () => campaign.quizOverrides, overrides => {
  campaign.quizOverrides = validQuizOverrides(overrides);
  if (!started && !arcadeMode()) { selectLevel(campaign, campaign.levelIndex); activateRun(); }
  return writeStorage(quizStorageKey, campaign.quizOverrides);
});
el('quiz-editor-button').addEventListener('click', () => {
  quizEditor.selectLevel(CAMPAIGN[campaign.levelIndex].id);
  el('settings-dialog').close(); showPanel('quiz-editor-dialog', 'quiz-editor-title');
});
el('close-quiz-editor').addEventListener('click', () => el('quiz-editor-dialog').close());
el('quiz-editor-dialog').addEventListener('close', () => {
  syncPanels();
  (started && state.status === 'paused' ? el('resume-button') : el('settings-button')).focus({ preventScroll: true });
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
el('restart-button').addEventListener('click', () => start(true));
el('replay-button').addEventListener('click', () => start(true));
el('resume-button').addEventListener('click', () => pause(false));
el('next-level-button').addEventListener('click', () => {
  if (!advanceCampaign(campaign)) return;
  started = false; activateRun(); persistCampaign(); el('start-button').focus({ preventScroll: true });
});
el('levels-button').addEventListener('click', openMap);
el('results-map-button').addEventListener('click', openMap);
el('close-levels').addEventListener('click', () => el('level-dialog').close());
el('level-dialog').addEventListener('close', () => {
  syncPanels();
  if (state.status === 'paused') el('resume-button').focus({ preventScroll: true });
});
for (const id of ['task-cancel','task-done','close-workspace']) el(id).addEventListener('click', () => el('task-dialog').close());
el('task-form').addEventListener('submit', event => {
  event.preventDefault();
  submitTask('check');
});
el('task-next').addEventListener('click', () => submitTask('next'));
el('task-retry').addEventListener('click', () => submitTask('retry'));
function submitTask(action) {
  if (!taskStation) return;
  if (interactionFor(state, taskStation.id)?.id !== taskStation.id) {
    text('task-feedback', 'This quiz is not available here. Return to its checkpoint.');
    el('task-feedback').hidden = false; el('task-feedback').focus(); return;
  }
  const job = state.missionProgress.jobs[taskStation.id] ?? {};
  const view = workView(taskStation, job);
  const answer = new FormData(el('task-form')).get('answer');
  const events = [];
  const accepted = interact(state, { action, questionIndex: view.questionIndex, attempt: view.attempt,
    answer, stationId: taskStation.id }, events);
  processEvents(events);
  if (accepted) {
    renderWorkstation();
    el('work-scroll').scrollTop = 0;
    (action === 'check' ? el('task-feedback') : el('work-step-title')).focus({ preventScroll: true });
    if (action === 'check') el('task-feedback').scrollIntoView({ block: 'nearest' });
  } else {
    text('task-feedback', events.at(-1)?.text ?? 'Choose an answer.');
    el('task-feedback').hidden = false;
    el('task-feedback').focus();
  }
  hud();
}
el('task-dialog').addEventListener('close', () => {
  taskStation = null; clearInput(); previous = 0; syncPanels();
  (state.status === 'paused' ? el('resume-button') : canvas).focus({ preventScroll: true });
});
el('character-select').addEventListener('change', () => {
  if (started) return;
  campaign = createCampaign(el('character-select').value, saveCampaign(campaign), campaign.quizOverrides);
  activateRun(); persistCampaign();
});
let pointerPauseIntent = null;
el('pause-button').addEventListener('pointerdown', () => { pointerPauseIntent = state.status !== 'paused'; });
el('pause-button').addEventListener('pointercancel', () => { pointerPauseIntent = null; });
el('pause-button').addEventListener('click', event => {
  const value = event.detail > 0 && pointerPauseIntent !== null ? pointerPauseIntent : state.status !== 'paused';
  pointerPauseIntent = null; pause(value);
});
window.addEventListener('keydown', event => {
  const dialog = openDialog();
  if (dialog) {
    if (event.code === 'Escape') { event.preventDefault(); dialog.close(); }
    if (event.code === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button,select,input,textarea,a[href],[tabindex="0"]')]
        .filter(node => !node.matches(':disabled') && node.getClientRects().length);
      const first = focusable[0]; const last = focusable.at(-1);
      if (first && event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (last && !event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
    return;
  }
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
  if (playing() && !el('task-dialog').open && !event.relatedTarget?.closest('[data-action]')) pause(true, false);
});
function pointSaucer(event) {
  const bounds = playfieldBounds(); orbitPointer = (event.clientX - bounds.left) / bounds.scale;
}
canvas.addEventListener('pointerdown', event => {
  if (!playing() || event.button !== 0) return;
  event.preventDefault(); canvas.focus({ preventScroll: true });
  if (orbitMode() || arcadeMode()) {
    canvas.setPointerCapture(event.pointerId); pointSaucer(event);
    if (orbitMode() && state.phase === 'ready') jumpPressed = true;
  } else {
    const bounds = playfieldBounds();
    const x = (event.clientX - bounds.left) / bounds.scale + (state.stage === 'boss' ? 0 : state.cameraX);
    const y = (event.clientY - bounds.top) / bounds.scale;
    const station = missionStations(state).find(item => Math.abs(item.x - x) < 70 && y > item.y - 130 && y < item.y + 20);
    if (station) {
      if (interactionFor(state)?.id === station.id) openTask(station);
      else { say(`${station.title}: workstation out of reach. ${missionObjective(state).summary}`); missionMessageUntil = state.time + 6; }
    }
  }
});
canvas.addEventListener('pointermove', event => {
  if (playing() && (orbitMode() || arcadeMode()) && (event.pointerType === 'mouse' || canvas.hasPointerCapture(event.pointerId))) pointSaucer(event);
});
controls.forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (!playing() || button.disabled || event.button !== 0) return;
    if (button.dataset.action === 'interact') { event.preventDefault(); return; }
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.action); press(button.dataset.action);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(name, event => { pointers.delete(event.pointerId); });
  }
  button.addEventListener('click', event => {
    if ((event.detail === 0 || button.dataset.action === 'interact') && playing() && !button.disabled) press(button.dataset.action);
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
    const app = orbitMode() || arcadeMode() ? undefined : state.world.sparks.find(item => item.id === event.id)?.app;
    const soundKey = event.type === 'spark' ? `spark:${app}` : event.type;
    const completion = ['levelComplete','campaignComplete','arcadeComplete'].includes(event.type);
    if (!played.has(soundKey)) { audio.effect(completion ? { type: 'complete' } : event, app); played.add(soundKey); }
    if (event.type === 'missionMessage') { say(event.text); missionMessageUntil = state.time + 6; }
    if (event.type === 'missionTask') persistCampaign();
    if (event.type === 'checkpoint') { say(`${event.name} checkpoint online.`); persistCampaign(); }
    if (event.type === 'respawn') { clearInput(); say(`Back at ${event.name}. Your team and completed tasks are safe.`); }
    if (event.type === 'bossEnter') { clearInput(); taskSignature = ''; say(`Three quizzes complete. ${currentMission().boss} awaits.`); missionMessageUntil = state.time + 5; }
    if (event.type === 'damage') announce(`${event.health} health remaining.`);
    if (event.type === 'helperUnlocked') { say(`${event.name} has joined the team.`, 'TEAM'); persistCampaign(); }
    if (event.type === 'partyRecover') announce(`${CHARACTERS[event.character].name} regrouped.`);
    if (event.type === 'bossExposed') announce('Core exposed.');
    if (event.type === 'bossDefeated') { clearInput(); say(`${currentMission().boss} is stabilizing.`); }
    if (event.type === 'agent') say({ patch: 'Recovery net restored.', query: 'Priority targets marked.', aegis: 'Missile defense active.' }[event.name], 'TEAM');
    if (event.type === 'recovery') say('Recovery charge used. The core is back on your shield.');
    if (event.type === 'net') say('Core recovered. No recovery charge spent.');
    if (event.type === 'powerup') say(`${{ wide: 'Wide Shield', multi: 'Multiball', magnet: 'Magnetic Catch', laser: 'Debug Laser', net: 'Recovery Net', microsoft: 'Microsoft protection', blaster: 'Debug Blaster' }[event.kind]} online.`);
    if (event.type === 'wave') say(`${ORBIT.waves[event.wave]}. ${event.wave === 4 ? 'Recovery reserve restored. We are repairing the defense, not removing it.' : 'Sector checkpoint online.'}`);
    if (event.type === 'quizRequired') openTask(event.station);
    if (event.type === 'arcadeWave') say(`AI Invaders / Wave ${event.wave}.`);
    if (event.type === 'finaleStart') {
      clearInput(); panels(); say('Board the saucer. Restore the Monolith command interface and return control to the team.');
    }
    if (completion || event.type === 'failed') showResults();
  }
}
function frame(now) {
  const dt = previous ? (now - previous) / 1000 : 0; previous = now;
  if (playing()) {
    const held = new Set([...keys.values(), ...pointers.values()]);
    const input = { left: held.has('left'), right: held.has('right'), jumpHeld: held.has('jump'),
      up: held.has('climbUp'), down: held.has('climbDown'),
      jumpPressed, boostPressed, interactPressed, agentPressed, pointerX: orbitPointer,
      fire: held.has('fire') || now < fireUntil, attackPressed, helperPressed, pulsePressed };
    const slow = !arcadeMode() && held.has('focus') && campaign.unlocked >= 6 ? .5 : 1;
    const events = updateCampaign(campaign, input, dt * slow);
    state = campaign.run;
    audio.setStage(orbitMode() || arcadeMode() ? 'world' : state.stage, state.boss?.phase ?? 0);
    jumpPressed = false; boostPressed = false; interactPressed = false; agentPressed = null;
    attackPressed = false; helperPressed = false; pulsePressed = false; processEvents(events);
  }
  const reduced = preferences.reducedMotion || motion.matches;
  syncQuestDialogue();
  (arcadeMode() ? renderArcade : orbitMode() ? renderOrbit : render)(ctx, state, reduced,
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

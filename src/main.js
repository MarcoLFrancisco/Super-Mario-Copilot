import '../vendor/lucide.min.js';
import { LEVEL, VIEW } from './level.js';
import { createState, setPaused, update, interactionAt } from './engine.js';
import { createOrbit, updateOrbit, setOrbitPaused, ORBIT, AGENTS } from './orbit.js';
import { render } from './art.js';
import { renderOrbit } from './orbit-art.js';
import { createAudio } from './audio.js';

const el = id => document.getElementById(id);
const text = (id, value) => {
  const node = el(id);
  if (node.textContent !== String(value)) node.textContent = value;
};
const icons = () => globalThis.lucide.createIcons();
function icon(id, name) {
  const node = document.createElement('i'); node.dataset.lucide = name;
  el(id).replaceChildren(node); icons();
}
const canvas = el('game-canvas');
const ctx = canvas.getContext('2d');
const controls = [...document.querySelectorAll('[data-action]')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = createAudio();
const defaultBindings = { left: 'KeyA', right: 'KeyD', jump: 'Space', boost: 'ShiftLeft',
  interact: 'KeyE', patch: 'Digit1', query: 'Digit2', aegis: 'Digit3' };
const bindingNames = { left: 'Move left', right: 'Move right', jump: 'Jump / Launch',
  boost: 'Copilot Dash', interact: 'Accept bridge', patch: 'Patch', query: 'Query', aegis: 'Aegis' };
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
  bestOrbit: Number.isFinite(savedProgress?.bestOrbit) ? savedProgress.bestOrbit : 0 };
const savedPrefs = readStorage('mission-copilot-preferences-v1', {});
const volume = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
const preferences = { music: savedPrefs?.music === true, effects: savedPrefs?.effects === true,
  musicVolume: volume(savedPrefs?.musicVolume, 45), effectsVolume: volume(savedPrefs?.effectsVolume, 65),
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
const runs = {};
const keys = new Map();
const pointers = new Map();
const playing = () => started && state.status === 'playing' && !el('settings-dialog').open;
const finished = () => state.status === 'complete' || state.status === 'failed';
const announce = message => text('game-announcement', message);
function say(message) { text('subtitle', message); announce(message); }
function clearInput() {
  keys.clear(); pointers.clear(); jumpPressed = false; boostPressed = false;
  interactPressed = false; agentPressed = null; orbitPointer = null;
}
function press(action) {
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
  const width = mode === 'orbit' ? state.width : state.viewWidth;
  const density = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== width * density || canvas.height !== VIEW.height * density) {
    canvas.width = width * density; canvas.height = VIEW.height * density;
    canvas.style.aspectRatio = `${width} / ${VIEW.height}`;
  }
}
function hud() {
  const orbit = mode === 'orbit';
  text('score-value', state.score.toLocaleString());
  text('items-label', orbit ? 'Recoveries' : 'Energy cells');
  text('sparks-value', orbit ? state.charges : state.collected.size);
  text('sparks-total', orbit ? 3 : LEVEL.sparks.length);
  text('combo-label', orbit ? 'Wave' : 'Combo');
  text('combo-value', orbit ? `${state.wave + 1} / 5` : `x${state.combo}`);
  text('checkpoint-label', orbit ? 'Sector' : 'Checkpoint');
  text('checkpoint-value', orbit ? ORBIT.waves[state.wave] : LEVEL.checkpoints[state.checkpointIndex].name);
  text('boost-label', orbit ? 'Compute' : 'Copilot Dash');
  text('boost-value', orbit ? `${Math.floor(state.compute)} / 100` : !state.abilities.dash ? 'Locked'
    : state.player.boostCooldown > 0 ? `${state.player.boostCooldown.toFixed(1)}s` : 'Ready');
  const request = orbit ? null : interactionAt(state);
  const bossActive = !orbit && state.boss.phase !== 'idle' && state.boss.phase !== 'defeated';
  text('mission-objective', orbit ? state.phase === 'ready' ? 'Energy core latched' : state.phase === 'wave-clear'
    ? 'Sector restored' : state.wave === 4 ? 'Repair the Orbital Firewall' : 'Clear the corrupted blocks'
    : bossActive ? state.boss.phase === 'exposed' ? 'Restart switch exposed' : state.boss.phase === 'telegraph'
      ? 'Loading rings incoming' : 'Restore the Setup Wizard'
    : state.boss.health === 0 ? 'Return power to the campus beacon' : request ? `${request.name}: awaiting approval` : 'Restore campus access');
  el('boss-health').hidden = !bossActive;
  if (bossActive) text('boss-health', `${3 - state.boss.health} / 3 resets`);
  el('interact-button').disabled = !playing() || (orbit ? state.phase !== 'ready' : !request);
  text('interact-label', orbit ? 'Launch core' : 'Accept bridge');
  el('boost-button').disabled = !playing() || orbit || !state.abilities.dash || state.player.boostCooldown > 0;
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
  document.body.classList.toggle('is-orbit', orbit);
  el('agent-controls').hidden = !orbit; el('boost-button').hidden = orbit;
  el('jump-button').setAttribute('aria-label', orbit ? 'Launch core' : 'Jump');
  el('mission-panel').setAttribute('aria-labelledby', `${mode}-tab`);
  for (const name of ['campus', 'orbit']) {
    el(`${name}-tab`).setAttribute('aria-selected', String(mode === name));
    el(`${name}-tab`).tabIndex = mode === name ? 0 : -1;
  }
  el('orbit-tab').disabled = !progress.campusComplete;
  el('orbit-tab').title = progress.campusComplete ? 'Orbit simulator' : 'Restore Campus to unlock Orbit';
  el('orbit-lock').hidden = progress.campusComplete;
  text('mission-number', orbit ? '07' : '01');
  text('world-label', orbit ? 'Azure Orbit / Flight simulator' : 'Restore the connection');
  text('level-title', orbit ? 'Breakout Protocol' : 'Copilot Campus');
  text('start-eyebrow', orbit ? 'Azure Orbit / Flight simulator' : 'Mission 01 / Reboot Campus');
  text('start-title', orbit ? 'A little more space.' : 'A little help. A giant leap.');
  text('game-objective', orbit ? 'The orbital defense has been compromised. Bit is in the pilot seat. Sparq has assembled the team.'
    : 'Doctor Null has locked the campus in an endless approval meeting. Bit and Sparq have other plans.');
  text('start-label', orbit ? 'Begin flight' : 'Begin mission');
  icon('interact-icon', orbit ? 'play' : 'check');
  canvas.setAttribute('aria-label', orbit ? 'Azure Orbit flying saucer brick-breaking game' : 'Copilot Campus platform game');
  const bindings = Object.fromEntries(Object.entries(preferences.bindings).map(([action, code]) => [action, keyLabel(code)]));
  text('keyboard-help', orbit
    ? `Move with ${bindings.left} and ${bindings.right}, or drag on the canvas. ${bindings.jump} launches the core. ${bindings.patch}, ${bindings.query}, and ${bindings.aegis} assign Patch, Query, and Aegis. Escape pauses.`
    : `Move with ${bindings.left} and ${bindings.right}. Hold ${bindings.jump} to jump higher. ${bindings.interact} accepts a nearby bridge. ${bindings.boost} dashes after unlocking it. Escape pauses.`);
  hud();
}
function start(retry = false) {
  audio.setStatus('idle'); audio.reset();
  const width = el('game-viewport').clientWidth < 720 ? 720 : VIEW.width;
  state = mode === 'orbit' ? createOrbit({ width, wave: retry ? state.wave : 0 }) : createState({ dashUnlocked: progress.campusComplete });
  started = true; previous = 0; lastSuggestion = null;
  if (preferences.music || preferences.effects) void audio.unlock();
  clearInput(); resize(); panels(); canvas.focus({ preventScroll: true });
  say(mode === 'orbit' ? 'You requested more space. I may have misunderstood.'
    : 'Doctor Null eliminated all workplace problems. Starting with the doors.');
}
function pause(value, focus = true) {
  if (!started || finished()) return;
  (mode === 'orbit' ? setOrbitPaused : setPaused)(state, value);
  clearInput(); previous = 0; panels();
  if (!value && (preferences.music || preferences.effects)) void audio.unlock();
  if (focus) (value ? el('resume-button') : canvas).focus({ preventScroll: true });
  announce(value ? 'Mission paused.' : 'Mission resumed.');
}
function chooseMode(next) {
  if (next === mode || (next === 'orbit' && !progress.campusComplete)) return;
  if (playing()) pause(true, false);
  runs[mode] = { state, started }; mode = next;
  const run = runs[mode];
  state = run?.state ?? (mode === 'campus' ? createState({ dashUnlocked: progress.campusComplete })
    : createOrbit({ width: el('game-viewport').clientWidth < 720 ? 720 : VIEW.width }));
  started = run?.started ?? false; previous = 0;
  clearInput(); resize(); panels();
  if (started && finished()) showResults(false);
  (started ? state.status === 'paused' ? el('resume-button') : el('replay-button') : el('start-button')).focus({ preventScroll: true });
  say(mode === 'orbit' ? 'Flight simulator online. Your team is standing by.' : 'Campus connection restored.');
}
function showResults(save = true) {
  const orbit = mode === 'orbit';
  const won = state.status === 'complete';
  if (save) {
    if (orbit) { progress.orbitComplete ||= won; progress.bestOrbit = Math.max(progress.bestOrbit, state.score); }
    else { progress.campusComplete ||= won; progress.bestCampus = Math.max(progress.bestCampus, state.score); }
    writeStorage('mission-copilot-progress-v1', progress);
  }
  text('result-eyebrow', won ? 'Control restored' : 'Recovery reserve depleted');
  text('complete-title', won ? orbit ? 'Orbit, back in balance.' : 'Campus, back online.' : 'Signal lost.');
  text('completion-summary', won ? orbit ? 'Better tools. Human judgment. And a flying saucer.'
    : 'Copilot Dash unlocked. The Orbit simulator is online.' : 'The current sector is checkpointed. A fresh recovery reserve is ready.');
  text('final-score', state.score.toLocaleString());
  text('final-items-label', orbit ? 'Sector' : 'Cells');
  text('final-sparks', orbit ? `${state.wave + 1} / 5` : `${state.collected.size} / ${LEVEL.sparks.length}`);
  text('final-combo-label', orbit ? 'Best score' : 'Best combo');
  text('final-combo', orbit ? progress.bestOrbit.toLocaleString() : `x${state.bestCombo}`);
  el('mission-badges').hidden = orbit;
  if (!orbit) {
    const badges = { explorer: LEVEL.sparks.filter(item => item.secret && state.collected.has(item.id)).length >= 10,
      debugger: state.boss.health === 0, collaborator: state.acceptedSuggestions.size === LEVEL.suggestions.length };
    for (const [name, earned] of Object.entries(badges)) {
      el(`badge-${name}`).classList.toggle('earned', earned);
      el(`badge-${name}`).setAttribute('aria-label', `${name}: ${earned ? 'earned' : 'not earned'}`);
    }
  }
  el('orbit-unlock-button').hidden = orbit || !won; el('campus-return-button').hidden = !orbit;
  text('replay-label', won ? 'Replay mission' : 'Retry sector');
  clearInput(); panels(); (orbit ? el('replay-button') : el('orbit-unlock-button')).focus({ preventScroll: true });
  announce(won ? 'Mission complete. Results are ready.' : 'Flight ended. Retry the current sector.');
}
function savePreferences() { writeStorage('mission-copilot-preferences-v1', preferences); }
function audioControls() {
  for (const bus of ['music', 'effects']) {
    audio.setVolume(bus, preferences[bus] ? preferences[`${bus}Volume`] / 100 : 0);
    el(`${bus}-enabled`).checked = preferences[bus]; text(`${bus}-output`, `${preferences[`${bus}Volume`]}%`);
  }
  const any = preferences.music || preferences.effects;
  const label = any ? 'Mute sound' : 'Enable sound';
  el('sound-button').setAttribute('aria-pressed', String(any));
  el('sound-button').setAttribute('aria-label', label); el('sound-button').dataset.tooltip = label;
  icon('sound-icon', any ? 'volume-2' : 'volume-x');
}
async function toggleAudio(bus) {
  if (audioBusy) return;
  audioBusy = true;
  try {
    const next = bus ? !preferences[bus] : !(preferences.music || preferences.effects);
    if (next && !await audio.unlock()) {
      text('audio-status', 'Audio is unavailable in this browser.'); audioControls(); return;
    }
    if (bus) preferences[bus] = next; else preferences.music = preferences.effects = next;
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
for (const name of ['campus', 'orbit']) el(`${name}-tab`).addEventListener('click', () => chooseMode(name));
document.querySelector('.mission-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.code)) return;
  event.preventDefault();
  const next = ['ArrowRight', 'End'].includes(event.code) && progress.campusComplete ? 'orbit' : 'campus';
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
  clearInput(); if (playing()) pause(true, false); audio.setStatus('paused');
});
window.addEventListener('pagehide', event => { if (!event.persisted) void audio.dispose(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearInput(); if (playing()) pause(true, false); }
});
new ResizeObserver(resize).observe(el('game-viewport'));
function processEvents(events) {
  if (finished()) audio.setStatus(state.status === 'complete' ? 'complete' : 'paused');
  const played = new Set();
  for (const event of events) {
    if (!played.has(event.type)) { audio.effect(event); played.add(event.type); }
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
      jumpPressed, boostPressed, interactPressed, agentPressed, pointerX: orbitPointer };
    const events = (mode === 'orbit' ? updateOrbit : update)(state, input, dt);
    jumpPressed = false; boostPressed = false; interactPressed = false; agentPressed = null; processEvents(events);
  }
  const reduced = preferences.reducedMotion || motion.matches;
  (mode === 'orbit' ? renderOrbit : render)(ctx, state, reduced,
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

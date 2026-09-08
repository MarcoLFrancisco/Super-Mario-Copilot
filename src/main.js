import { LEVEL } from './level.js';
import { createState, setPaused, update } from './engine.js';
import { render } from './art.js';
import { createAudio } from './audio.js';

const el = id => document.getElementById(id);
const text = (id, value) => {
  const node = el(id);
  if (node.textContent !== String(value)) node.textContent = value;
};
const canvas = el('game-canvas');
const ctx = canvas.getContext('2d');
const controls = [...document.querySelectorAll('[data-action]')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let state = createState();
let started = false;
let previous = 0;
const audio = createAudio();
const enabled = { music: false, effects: false };
const items = new Map(LEVEL.sparks.map(item => [item.id, item]));
let audioBusy = false;
const keys = new Map();
const pointers = new Map();
let jumpPressed = false;
let boostPressed = false;
const mapping = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', ShiftLeft: 'boost', ShiftRight: 'boost' };
const playing = () => started && state.status === 'playing';
const announce = message => text('game-announcement', message);
function clearInput() {
  keys.clear(); pointers.clear(); jumpPressed = false; boostPressed = false;
}
function press(action) {
  if (action === 'jump') jumpPressed = true;
  if (action === 'boost') boostPressed = true;
}
function hud() {
  text('score-value', state.score.toLocaleString());
  text('sparks-value', state.collected.size);
  text('sparks-total', LEVEL.sparks.length);
  text('combo-value', `×${state.combo}`);
  text('checkpoint-value', LEVEL.checkpoints[state.checkpointIndex].name);
  text('boost-value', state.player.boostCooldown > 0 ? `${state.player.boostCooldown.toFixed(1)}s` : 'Ready');
}
function panels() {
  el('start-panel').hidden = started;
  el('pause-panel').hidden = !started || state.status !== 'paused';
  el('complete-panel').hidden = !started || state.status !== 'complete';
  el('pause-button').disabled = !started || state.status === 'complete';
  text('pause-button', state.status === 'paused' ? 'Resume' : 'Pause');
  controls.forEach(button => { button.disabled = !playing(); });
  canvas.tabIndex = playing() ? 0 : -1;
  audio.setStatus(started ? state.status : 'idle');
}
function start() {
  audio.setStatus('idle'); audio.reset();
  state = createState(); started = true; previous = 0;
  if (enabled.music || enabled.effects) void audio.unlock();
  clearInput(); panels(); hud(); canvas.focus({ preventScroll: true });
  announce('Adventure started. Reach the Copilot beacon.');
}
function pause(value, focus = true) {
  if (!started || state.status === 'complete') return;
  setPaused(state, value); clearInput(); previous = 0; panels();
  if (!value && (enabled.music || enabled.effects)) void audio.unlock();
  if (focus) (value ? el('resume-button') : canvas).focus({ preventScroll: true });
  announce(value ? 'Adventure paused.' : 'Adventure resumed.');
}
function audioControls() {
  for (const bus of ['music', 'effects']) {
    audio.setVolume(bus, enabled[bus] ? Number(el(`${bus}-volume`).value) / 100 : 0);
    el(`${bus}-button`).setAttribute('aria-pressed', String(enabled[bus]));
    text(`${bus}-button`, `${bus === 'music' ? 'Music' : 'Effects'}: ${enabled[bus] ? 'on' : 'off'}`);
  }
  const any = enabled.music || enabled.effects;
  el('sound-button').setAttribute('aria-pressed', String(any));
  text('sound-button', any ? 'Mute all sound' : 'Enable all sound');
}
async function toggleAudio(bus) {
  if (audioBusy) return;
  audioBusy = true;
  try {
    const next = bus ? !enabled[bus] : !(enabled.music || enabled.effects);
    if (next && !await audio.unlock()) {
      text('audio-status', 'Audio unavailable. Gameplay still works without sound. Try enabling audio again.');
      return;
    }
    if (bus) enabled[bus] = next;
    else enabled.music = enabled.effects = next;
    audioControls();
    text('audio-status', 'Audio preferences updated. Music plays during gameplay; resume if paused. Volume zero is silent.');
  } finally { audioBusy = false; }
}
el('sound-button').addEventListener('click', () => { void toggleAudio(); });
for (const bus of ['music', 'effects']) {
  el(`${bus}-button`).addEventListener('click', () => { void toggleAudio(bus); });
  el(`${bus}-volume`).addEventListener('input', audioControls);
}
for (const id of ['start-button', 'restart-button', 'replay-button']) el(id).addEventListener('click', start);
el('resume-button').addEventListener('click', () => pause(false));
// Preserve the pre-blur intent: clicking Pause must not immediately resume.
let pointerPauseIntent = null;
el('pause-button').addEventListener('pointerdown', () => { pointerPauseIntent = state.status !== 'paused'; });
el('pause-button').addEventListener('pointercancel', () => { pointerPauseIntent = null; });
el('pause-button').addEventListener('click', event => {
  const value = event.detail > 0 && pointerPauseIntent !== null ? pointerPauseIntent : state.status !== 'paused';
  pointerPauseIntent = null;
  pause(value);
});
window.addEventListener('keydown', event => {
  if (event.code === 'Escape' && started && state.status !== 'complete') {
    event.preventDefault();
    if (!event.repeat) pause(state.status !== 'paused');
    return;
  }
  const action = mapping[event.code];
  if (!action || !playing() || document.activeElement !== canvas || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  if (!keys.has(event.code) && !event.repeat) press(action);
  keys.set(event.code, action);
});
window.addEventListener('keyup', event => { keys.delete(event.code); });
canvas.addEventListener('blur', () => { if (playing()) pause(true, false); });
canvas.addEventListener('pointerdown', () => { if (playing()) canvas.focus({ preventScroll: true }); });
controls.forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (!playing() || event.button !== 0) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.action);
    press(button.dataset.action);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(name, event => { pointers.delete(event.pointerId); });
  }
  // Keyboard or assistive activation; pointer activation was handled above.
  button.addEventListener('click', event => {
    if (event.detail === 0 && playing()) press(button.dataset.action);
  });
});
window.addEventListener('blur', () => {
  clearInput();
  if (playing()) pause(true, false);
  audio.setStatus('paused');
});
window.addEventListener('pagehide', event => {
  if (!event.persisted) void audio.dispose();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearInput(); if (playing()) pause(true); }
});
function frame(now) {
  const dt = previous ? (now - previous) / 1000 : 0;
  previous = now;
  if (playing()) {
    const held = new Set([...keys.values(), ...pointers.values()]);
    const events = update(state, { left: held.has('left'), right: held.has('right'), jumpPressed, boostPressed }, dt);
    jumpPressed = false; boostPressed = false;
    if (state.status === 'complete') audio.setStatus('complete');
    const played = new Set();
    for (const event of events) {
      const app = items.get(event.id)?.app;
      const key = event.type === 'spark' ? `${event.type}:${app}` : event.type;
      if (!played.has(key)) { audio.effect(event, app); played.add(key); }
      if (event.type === 'checkpoint') announce(`Checkpoint reached: ${event.name}.`);
      if (event.type === 'respawn') announce(`Back at ${event.name}. Your app collectibles and score are kept.`);
      if (event.type === 'complete') {
        clearInput();
        text('final-score', state.score.toLocaleString());
        text('final-sparks', `${state.collected.size} / ${LEVEL.sparks.length}`);
        text('final-combo', `×${state.bestCombo}`);
        text('completion-summary', `Mario reached the beacon! You collected ${state.collected.size} of ${LEVEL.sparks.length} app items.`);
        panels(); el('replay-button').focus({ preventScroll: true });
        announce('Level complete! Your results are ready.');
      }
    }
  }
  render(ctx, state, motion.matches); hud();
  requestAnimationFrame(frame);
}
if (ctx) {
  panels(); hud();
  el('start-button').disabled = false;
  el('sound-button').disabled = false;
  el('audio-settings').disabled = false;
  audioControls();
  text('audio-status', 'Enable music and effects independently below, or use Enable all sound. Audio starts off and pauses with gameplay.');
  text('load-status', 'Mario is ready! Audio is optional. Enable sound, then start your adventure.');
  requestAnimationFrame(frame);
} else {
  text('load-status', 'Canvas graphics are unavailable. Please use a browser with Canvas 2D support.');
}

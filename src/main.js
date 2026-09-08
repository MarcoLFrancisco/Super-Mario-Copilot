import { LEVEL } from './level.js';
import { createState, setPaused, update } from './engine.js';
import { render } from './art.js';

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
let audio;
let sound = false;
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
}
function start() {
  state = createState(); started = true; previous = 0;
  clearInput(); panels(); hud(); canvas.focus({ preventScroll: true });
  announce('Adventure started. Reach the Copilot beacon.');
}
function pause(value) {
  if (!started || state.status === 'complete') return;
  setPaused(state, value); clearInput(); previous = 0; panels();
  (value ? el('resume-button') : canvas).focus({ preventScroll: true });
  announce(value ? 'Adventure paused.' : 'Adventure resumed.');
}
function tone(type) {
  if (!sound || audio?.state !== 'running') return;
  const frequency = { jump: 440, boost: 220, spark: 880, checkpoint: 660, respawn: 150, complete: 1046 }[type];
  if (!frequency) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.4, now + .12);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(.045, now + .01);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .18);
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.start(now); oscillator.stop(now + .2);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
el('sound-button').addEventListener('click', async () => {
  if (audioBusy) return;
  audioBusy = true;
  try {
    if (sound) {
      sound = false;
      await audio.suspend();
    } else {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio unavailable');
      audio ||= new Audio();
      await audio.resume(); sound = true;
    }
  } catch {
    sound = false; announce('Audio unavailable. You can still play without sound.');
  } finally {
    audioBusy = false;
    el('sound-button').setAttribute('aria-pressed', String(sound));
    text('sound-button', `Sound: ${sound ? 'on' : 'off'}`);
  }
});
for (const id of ['start-button', 'restart-button', 'replay-button']) el(id).addEventListener('click', start);
el('resume-button').addEventListener('click', () => pause(false));
el('pause-button').addEventListener('click', () => pause(state.status !== 'paused'));
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
canvas.addEventListener('blur', () => { if (playing()) pause(true); });
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
window.addEventListener('blur', () => { clearInput(); if (playing()) pause(true); });
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
    const played = new Set();
    for (const event of events) {
      if (!played.has(event.type)) { tone(event.type); played.add(event.type); }
      if (event.type === 'checkpoint') announce(`Checkpoint reached: ${event.name}.`);
      if (event.type === 'respawn') announce(`Back at ${event.name}. Your sparks and score are kept.`);
      if (event.type === 'complete') {
        clearInput();
        text('final-score', state.score.toLocaleString());
        text('final-sparks', `${state.collected.size} / ${LEVEL.sparks.length}`);
        text('final-combo', `×${state.bestCombo}`);
        text('completion-summary', `Beacon activated! You discovered ${state.collected.size} of ${LEVEL.sparks.length} prompt sparks.`);
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
  text('load-status', 'Ready to explore. Sound is optional. Focus the game to use keyboard controls.');
  requestAnimationFrame(frame);
} else {
  text('load-status', 'Canvas graphics are unavailable. Please use a browser with Canvas 2D support.');
}

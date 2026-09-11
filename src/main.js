import { LEVEL, PRODUCTIVITY, PRODUCTIVITY_TOTALS, productivityCounts } from './level.js';
import { ARENA, COMBAT } from './encounters.js';
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
const speech = window.speechSynthesis;
const speechAvailable = Boolean(speech && window.SpeechSynthesisUtterance);
let voiceEnabled = false;
let utterance = null;
let speechTimer;
let captionBoss = null;
let captionId = 0;
function cancelSpeech() {
  clearTimeout(speechTimer);
  if (utterance) {
    utterance.onend = null; utterance.onerror = null;
    utterance = null;
    try { speech.cancel(); } catch { /* Captions remain available. */ }
  }
}
function voiceControls() {
  el('boss-voice-button').setAttribute('aria-pressed', String(voiceEnabled));
  text('boss-voice-button', `Boss voice: ${voiceEnabled ? 'on' : 'off'}`);
}
function speakCaption(caption) {
  cancelSpeech();
  if (!voiceEnabled || !speechAvailable || document.hidden || !document.hasFocus()) return;
  if (!playing() && state.status !== 'complete') return;
  try {
    const line = new SpeechSynthesisUtterance(caption.text);
    line.lang = 'en-US'; line.rate = 1.05; line.pitch = .8; line.volume = .65;
    const voices = speech.getVoices();
    const local = voices.find(v => v.localService && /^en(?:-|$)/i.test(v.lang));
    if (local) line.voice = local;
    utterance = line;
    line.onend = () => {
      if (utterance === line) { clearTimeout(speechTimer); utterance = null; }
    };
    line.onerror = () => {
      if (utterance !== line) return;
      cancelSpeech(); voiceEnabled = false; voiceControls(); audioControls();
      text('boss-voice-status', 'Speech unavailable or blocked. Captions remain available; you can retry the voice toggle.');
    };
    speech.speak(line);
    // Do not leave delayed browser speech queued beyond its caption window.
    speechTimer = setTimeout(cancelSpeech, Math.max(1, caption.remaining) * 1000);
  } catch {
    cancelSpeech(); voiceEnabled = false; voiceControls(); audioControls();
    text('boss-voice-status', 'Speech unavailable. Dialogue captions still work.');
  }
}
function syncDialogue() {
  const boss = started && state.stage === 'boss' ? state.boss : null;
  if (boss !== captionBoss) {
    cancelSpeech(); captionBoss = boss; captionId = 0;
    text('boss-caption', '');
  }
  const caption = boss?.dialogue.current;
  el('boss-dialogue-panel').hidden = !boss;
  if (caption && caption.id !== captionId) {
    captionId = caption.id;
    text('boss-caption', caption.text);
    speakCaption(caption);
  } else if (!caption) {
    cancelSpeech();
    // Retain the last line for reading until the next line or encounter reset.
  }
}
el('boss-voice-button').addEventListener('click', () => {
  if (!speechAvailable) return;
  voiceEnabled = !voiceEnabled;
  cancelSpeech(); voiceControls(); audioControls();
  text('boss-voice-status', voiceEnabled
    ? 'Voice enabled for new boss lines. Resume if paused. Local English voices are preferred; your browser may use an online voice.'
    : 'Boss voice off. Dialogue captions remain available.');
});
const keys = new Map();
const pointers = new Map();
let jumpPressed = false;
let boostPressed = false;
let fireUntil = 0;
let melee = {};
const mapping = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', ShiftLeft: 'boost', ShiftRight: 'boost', KeyF: 'fire', KeyJ: 'attack', KeyK: 'helper' };
const playing = () => started && state.status === 'playing';
const announce = message => text('game-announcement', message);
function clearInput() {
  melee = {};
  keys.clear(); pointers.clear(); jumpPressed = false; boostPressed = false; fireUntil = 0;
}
function press(action) {
  if (action === 'attack') melee.attackPressed = true;
  if (action === 'helper') melee.helperPressed = true;
  if (action === 'jump') jumpPressed = true;
  if (action === 'boost') boostPressed = true;
  // Preserve a quick tap until at least one simulation step can consume it.
  if (action === 'fire') fireUntil = performance.now() + 100;
}
function hud() {
  text('score-value', state.score.toLocaleString());
  text('sparks-value', state.collected.size);
  text('sparks-total', LEVEL.sparks.length);
  text('combo-value', `×${state.combo}`);
  text('checkpoint-value', state.stage === 'boss' ? ARENA.checkpointName : LEVEL.checkpoints[state.checkpointIndex].name);
  text('health-value', `${state.combat.health} / ${COMBAT.maxHealth}`);
  text('weapon-value', state.combat.blaster ? 'Ready · F to fire' : 'Find a reward brick');
  text('protection-value', state.combat.protection > 0 ? `${state.combat.protection.toFixed(1)}s` : 'Inactive');
  const counts = productivityCounts(state.collected);
  for (const app of Object.keys(PRODUCTIVITY)) {
    text(`count-${app}`, `${counts[app]} / ${PRODUCTIVITY_TOTALS[app]}`);
  }
  el('fire-button').disabled = !playing() || !state.combat.blaster;
  const helpers = ['donkey', 'mario'].filter(id => state.party.unlocked.has(id))
    .map(id => id === 'donkey' ? 'Donkey' : 'Mario');
  el('helper-button').disabled = !playing() || helpers.length === 0;
  text('party-status', `Leader: Marco · Helpers: ${helpers.join(' + ') || 'Find surprise boxes'}`);
  el('boss-hud').hidden = !started || state.stage !== 'boss';
  if (state.boss) {
    const boss = state.boss;
    el('boss-health').max = boss.maxHealth;
    el('boss-health').value = boss.health;
    text('boss-health', `${boss.health} / ${boss.maxHealth}`);
    text('boss-health-value', `${boss.health} / ${boss.maxHealth}`);
    text('boss-phase', `${ARENA.phases[boss.phase].name} · ${boss.mode}`);
    const tips = {
      intro: 'Prepare: climb toward the right platform. Your blaster is ready.',
      warning: ['Token burst incoming: keep moving.', 'Leave the marked column; agents are incoming.', 'Energy waves incoming: jump or climb.'][boss.phase],
      attack: 'Dodge the attacks. The core is shielded.',
      exposed: 'Core exposed! Hold F or Fire from the right platform.',
      defeated: 'Core patched. Review your final productivity results.'
    };
    text('boss-hint', tips[boss.mode] || 'Watch the arena warnings.');
  }
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
  cancelSpeech(); captionBoss = null; captionId = 0;
  text('boss-caption', ''); el('boss-dialogue-panel').hidden = true;
  audio.setStatus('idle'); audio.reset();
  state = createState(); started = true; previous = 0;
  if (enabled.music || enabled.effects) void audio.unlock();
  clearInput(); panels(); hud(); canvas.focus({ preventScroll: true });
  announce('Marco’s adventure started. Tap J or Attack for kickboxing. Discover Donkey and Mario in surprise boxes, then tap K or Helpers. Find a blaster and reach the AI core.');
}
function pause(value, focus = true) {
  if (!started || state.status === 'complete') return;
  if (value) cancelSpeech();
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
  const any = enabled.music || enabled.effects || voiceEnabled;
  el('sound-button').setAttribute('aria-pressed', String(any));
  text('sound-button', any ? 'Mute all sound' : 'Enable all sound');
}
async function toggleAudio(bus) {
  if (audioBusy) return;
  audioBusy = true;
  try {
    const next = bus ? !enabled[bus] : !(enabled.music || enabled.effects || voiceEnabled);
    if (next && !await audio.unlock()) {
      text('audio-status', 'Audio unavailable. Gameplay still works without sound. Try enabling audio again.');
      return;
    }
    if (bus) enabled[bus] = next;
    else {
      enabled.music = enabled.effects = next;
      // Speech requires its own opt-in, but Mute all must silence it too.
      if (!next) {
        voiceEnabled = false; cancelSpeech(); voiceControls();
        text('boss-voice-status', 'Boss voice off. Dialogue captions remain available.');
      }
    }
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
  cancelSpeech();
  clearInput();
  if (playing()) pause(true, false);
  audio.setStatus('paused');
});
window.addEventListener('pagehide', event => {
  cancelSpeech();
  if (!event.persisted) void audio.dispose();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelSpeech(); clearInput(); if (playing()) pause(true); }
});
function frame(now) {
  const dt = previous ? (now - previous) / 1000 : 0;
  previous = now;
  if (playing()) {
    const held = new Set([...keys.values(), ...pointers.values()]);
    const events = update(state, { left: held.has('left'), right: held.has('right'),
      fire: held.has('fire') || now < fireUntil, jumpPressed, boostPressed, ...melee }, dt);
    melee = {};
    jumpPressed = false; boostPressed = false;
    audio.setStage(state.stage, state.boss?.phase ?? 0);
    if (state.status === 'complete') audio.setStatus('complete');
    const played = new Set();
    for (const event of events) {
      const app = items.get(event.id)?.app;
      const key = event.type === 'spark' ? `${event.type}:${app}` : event.type;
      if (!played.has(key)) { audio.effect(event, app); played.add(key); }
      if (event.type === 'checkpoint') announce(`Checkpoint reached: ${event.name}.`);
      if (event.type === 'respawn') {
        clearInput();
        announce(`Back at ${event.name}. Health restored; your app collectibles and score are kept.`);
      }
      if (event.type === 'bossEnter') {
        clearInput();
        announce('AI core checkpoint reached. Blaster equipped. Dodge warnings and shoot during exposed-core windows.');
      }
      if (event.type === 'damage') announce(`Hit! ${event.health} health remaining.`);
      if (event.type === 'powerup') announce(event.kind === 'microsoft'
        ? 'Microsoft protection active for 10 seconds. Falls still cause respawn.'
        : 'Debug Blaster equipped. Hold F or Fire to shoot.');
      if (event.type === 'helperUnlocked') announce(`${event.name} joined Marco! Tap K or Helpers to attack.`);
      if (event.type === 'blockReward') announce('Reward released beneath the block. Touch it to collect.');
      if (event.type === 'bossWarning' || event.type === 'bossPhase') announce(`${event.name}. Watch the arena warning.`);
      if (event.type === 'bossExposed') announce('Core exposed! Fire from the right platform.');
      if (event.type === 'complete') {
        clearInput();
        text('final-score', state.score.toLocaleString());
        text('final-sparks', `${state.collected.size} / ${LEVEL.sparks.length}`);
        text('final-combo', `×${state.bestCombo}`);
        const counts = productivityCounts(state.collected);
        for (const app of Object.keys(PRODUCTIVITY)) {
          text(`final-${app}`, `${counts[app]} / ${PRODUCTIVITY_TOTALS[app]}`);
        }
        text('completion-summary', `Marco patched the Hallucination Engine! You collected ${state.collected.size} of ${LEVEL.sparks.length} app items.`);
        panels(); el('replay-button').focus({ preventScroll: true });
        announce('Level complete! Your results are ready.');
      }
    }
  }
  syncDialogue();
  render(ctx, state, motion.matches); hud();
  requestAnimationFrame(frame);
}
if (ctx) {
  panels(); hud();
  el('start-button').disabled = false;
  el('sound-button').disabled = false;
  el('audio-settings').disabled = false;
  el('boss-voice-button').disabled = !speechAvailable;
  voiceControls();
  text('boss-voice-status', speechAvailable
    ? 'Optional boss voice starts off. Captions work without speech. Enable voice separately; resume after changing controls.'
    : 'Browser speech is unavailable. Boss dialogue captions still work.');
  audioControls();
  text('audio-status', 'Enable music and effects independently below, or use Enable all sound. Audio starts off and pauses with gameplay.');
  canvas.setAttribute('aria-describedby', 'keyboard-help combat-help party-help party-status game-objective');
  text('combat-controls-status', 'Combat ready. Tap J or Attack for kickboxing; K or Helpers commands unlocked companions. Hold F or Fire after collecting a blaster. The boss arena supplies one automatically.');
  text('load-status', 'Marco is ready! Discover Donkey and Mario in surprise boxes, collect app items, and challenge the AI core. Audio is optional.');
  requestAnimationFrame(frame);
} else {
  text('load-status', 'Canvas graphics are unavailable. Please use a browser with Canvas 2D support.');
}

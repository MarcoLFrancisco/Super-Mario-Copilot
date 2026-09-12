import { SCORE, VOICES, JINGLES, musicStep, midiFrequency } from './music.js';

// Call unlock() from a user gesture; failure returns false, never blocks play.
// setStatus: playing/paused/complete/idle. Set complete before its event.
// effect(event, app) accepts engine events and optional collectible app name.
export function createAudio() {
  let ctx, buses, noise, timer;
  let status = 'idle', disposed = false, step = 0, next = 0;
  const volumes = { music: 0, effects: 0 };
  const active = new Set();
  const beat = 60 / SCORE.bpm;
  const audible = () => ctx?.state === 'running' && !document.hidden && !disposed;
  function stop(bus) {
    for (const entry of active) {
      if (!bus || entry.bus === bus) {
        entry.gain.gain.cancelScheduledValues(ctx.currentTime);
        entry.gain.gain.setValueAtTime(0, ctx.currentTime);
        try { entry.source.stop(); } catch { /* Already ended. */ }
      }
    }
  }
  function note(event, when, bus) {
    const voice = VOICES[event.voice];
    if (!voice || !audible() || !volumes[bus] || active.size >= 96) return;
    const duration = Math.max(.025, event.beats * beat);
    const source = voice.kind === 'noise' ? ctx.createBufferSource() : ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    if (voice.kind === 'noise') {
      source.buffer = noise; source.loop = true;
      filter.type = 'highpass';
    } else {
      source.type = voice.wave || 'sine';
      const pitch = voice.kind === 'kick' ? 145 : midiFrequency(event.midi);
      source.frequency.setValueAtTime(pitch, when);
      if (voice.kind === 'kick' || event.endMidi !== undefined) {
        const end = voice.kind === 'kick' ? 42 : midiFrequency(event.endMidi);
        source.frequency.exponentialRampToValueAtTime(end, when + duration);
      }
      filter.type = 'lowpass';
    }
    filter.frequency.value = voice.cutoff || 800;
    pan.pan.value = event.pan || 0;
    const peak = Math.max(.0002, Math.min(.3, event.gain));
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + voice.attack);
    gain.gain.exponentialRampToValueAtTime(peak * .55, when + duration);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration + voice.release);
    source.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(buses[bus]);
    const entry = { source, gain, bus };
    active.add(entry);
    source.onended = () => {
      active.delete(entry);
      source.disconnect(); filter.disconnect(); gain.disconnect(); pan.disconnect();
    };
    source.start(when); source.stop(when + duration + voice.release + .02);
  }
  function schedule() {
    if (!audible() || status !== 'playing' || !volumes.music) return;
    const now = ctx.currentTime;
    if (next < now) next = now + .02;
    while (next < now + .12) {
      musicStep(step).forEach(event => note(event, next, 'music'));
      step = (step + 1) % SCORE.loopSteps;
      next += SCORE.secondsPerStep;
    }
  }
  function sync() {
    if (!ctx) return;
    for (const bus of ['music', 'effects']) {
      const allowed = audible() && (status === 'playing' || (bus === 'effects' && status === 'complete'));
      buses[bus].gain.setValueAtTime(allowed ? volumes[bus] : 0, ctx.currentTime);
      if (!allowed || !volumes[bus]) stop(bus);
    }
    const running = audible() && status === 'playing' && volumes.music > 0;
    if (!running) {
      clearInterval(timer); timer = undefined;
    } else if (timer === undefined) {
      next = ctx.currentTime + .03;
      timer = setInterval(schedule, 25); schedule();
    }
  }
  async function unlock() {
    if (disposed) return false;
    try {
      if (!ctx) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return false;
        ctx = new Audio();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -16; compressor.ratio.value = 4;
        const master = ctx.createGain(); master.gain.value = .65;
        compressor.connect(master); master.connect(ctx.destination);
        buses = { music: ctx.createGain(), effects: ctx.createGain() };
        Object.values(buses).forEach(bus => { bus.gain.value = 0; bus.connect(compressor); });
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        ctx.onstatechange = sync;
      }
      await ctx.resume();
      sync(); return ctx.state === 'running';
    } catch {
      return false;
    }
  }
  function setVolume(bus, value) {
    if (!Object.hasOwn(volumes, bus) || !Number.isFinite(value)) return;
    volumes[bus] = Math.max(0, Math.min(1, value)); sync();
  }
  function setStatus(value) {
    if (!['idle', 'playing', 'paused', 'complete'].includes(value)) return;
    status = value; sync();
  }
  function reset() {
    stop(); step = 0;
    clearInterval(timer); timer = undefined; sync();
  }
  function effect(event, app = 'copilot') {
    if (!audible() || !volumes.effects) return;
    if (status !== 'playing' && !(status === 'complete' && event.type === 'complete')) return;
    const now = ctx.currentTime + .005;
    if (JINGLES[event.type]) {
      JINGLES[event.type].forEach(n => note(n, now + n.at * beat, 'effects'));
      return;
    }
    if (event.type === 'spark') {
      const root = { outlook: 79, excel: 76, teams: 81, copilot: 84 }[app] || 84;
      const offset = Math.min(7, Math.max(0, (event.combo || 1) - 1));
      [0, 7].forEach((interval, i) => note({ voice: 'bell', midi: root + offset + interval,
        beats: .18, gain: .1 }, now + i * .045, 'effects'));
      return;
    }
    const sounds = {
      jump: { voice: 'lead', midi:  sixty(), endMidi: 84, beats: .3, gain: .12 },
      boost: { voice: 'bass', midi: 48, endMidi: 79, beats: .45, gain: .17 },
      respawn: { voice: 'lead', midi: 67, endMidi: 43, beats: .65, gain: .12 },
      suggestion: { voice: 'bell', midi: 76, endMidi: 88, beats: .45, gain: .12 },
      bossHit: { voice: 'bell', midi: 72, endMidi: 91, beats: .55, gain: .14 },
      enemy: { voice: 'bass', midi: 60, endMidi: 43, beats: .2, gain: .1 },
      brick: { voice: 'bell', midi: 81, beats: .15, gain: .08 },
      bounce: { voice: 'lead', midi: 69, beats: .1, gain: .065 },
      launch: { voice: 'lead', midi: 60, endMidi: 84, beats: .3, gain: .1 },
      recovery: { voice: 'lead', midi: 67, endMidi: 48, beats: .5, gain: .1 },
      powerup: { voice: 'bell', midi: 84, endMidi: 96, beats: .5, gain: .12 },
      agent: { voice: 'bell', midi: 74, endMidi: 81, beats: .3, gain: .1 },
      net: { voice: 'lead', midi: 60, endMidi: 79, beats: .3, gain: .1 },
      defend: { voice: 'bell', midi: 69, beats: .2, gain: .09 },
      portal: { voice: 'lead', midi: 79, endMidi: 60, beats: .3, gain: .08 }
    };
    if (sounds[event.type]) note(sounds[event.type], now, 'effects');
  }
  function sixty() { return 60; }
  function visibility() {
    if (document.hidden) status = 'paused';
    sync();
  }
  document.addEventListener('visibilitychange', visibility);
  async function dispose() {
    disposed = true; clearInterval(timer); stop();
    document.removeEventListener('visibilitychange', visibility);
    if (ctx) {
      ctx.onstatechange = null;
      try { await ctx.close(); } catch { /* Closing is best effort. */ }
    }
  }
  return { unlock, setVolume, setStatus, reset, effect, dispose };
}

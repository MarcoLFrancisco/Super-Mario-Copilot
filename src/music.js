// Original score data; no audio nodes, timers, downloads, or side effects.
// Audio engine calls musicStep(integer) once per sixteenth note.
// Events: {voice, midi, beats, gain, pan}. Durations use quarter-note beats.
// Percussion uses midi:null. The audio engine supplies each voice's timbre.
export const SCORE = Object.freeze({
  title: 'Inbox to Infinity',
  bpm: 132,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  bars: 16,
  loopSteps: 256,
  secondsPerStep: 60 / 132 / 4
});

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const VOICES = freeze({
  lead: { wave: 'triangle', attack: .008, release: .07, cutoff: 4200 },
  bass: { wave: 'triangle', attack: .006, release: .05, cutoff: 900 },
  chord: { wave: 'sine', attack: .025, release: .12, cutoff: 2400 },
  bell: { wave: 'sine', attack: .003, release: .18, cutoff: 7000 },
  kick: { kind: 'kick', attack: .002, release: .12 },
  snare: { kind: 'noise', attack: .002, release: .075, cutoff: 1600 },
  hat: { kind: 'noise', attack: .001, release: .025, cutoff: 6500 }
});

// Harmony: Cmaj7 / Am7 / Fmaj7 / G, with a brighter bridge and turnaround.
const harmony = freeze([
  [48, 60, 64, 67, 71], [45, 60, 64, 67, 69],
  [41, 60, 64, 65, 69], [43, 59, 62, 67, 69],
  [48, 60, 64, 67, 71], [45, 60, 64, 67, 69],
  [41, 60, 64, 65, 69], [43, 59, 62, 67, 71],
  [50, 62, 65, 69, 72], [43, 62, 67, 69, 71],
  [40, 59, 64, 67, 71], [45, 60, 64, 69, 72],
  [41, 60, 65, 69, 72], [43, 59, 62, 67, 71],
  [48, 60, 64, 67, 72], [43, 59, 62, 67, 71]
]);

// Each entry is [sixteenth-note position, MIDI pitch, duration in beats].
const melody = freeze([
  [[0, 76, .5], [3, 79, .25], [4, 83, .5], [7, 81, .25], [8, 79, .75], [12, 76, .5], [15, 74, .25]],
  [[0, 72, .75], [4, 76, .5], [7, 79, .25], [9, 81, .5], [12, 79, .75]],
  [[0, 77, .5], [3, 76, .25], [5, 72, .5], [8, 69, .5], [11, 72, .25], [12, 77, .75]],
  [[0, 74, .5], [3, 79, .25], [4, 81, .5], [8, 79, .5], [11, 74, .25], [14, 71, .5]],
  [[0, 76, .5], [2, 79, .25], [5, 84, .5], [8, 83, .5], [11, 79, .25], [12, 76, .75]],
  [[0, 81, .75], [4, 79, .25], [6, 76, .5], [9, 72, .5], [12, 76, .75]],
  [[0, 77, .5], [3, 81, .25], [4, 84, .75], [8, 81, .5], [11, 77, .25], [14, 76, .5]],
  [[0, 74, .5], [4, 71, .5], [7, 74, .25], [8, 79, 1], [14, 76, .5]],
  [[0, 77, .75], [4, 81, .5], [7, 84, .25], [9, 86, .5], [12, 84, .75]],
  [[0, 83, .5], [3, 81, .25], [4, 79, .75], [8, 74, .5], [12, 79, .75]],
  [[0, 83, .75], [4, 79, .5], [7, 76, .25], [9, 74, .5], [12, 76, .75]],
  [[0, 81, .5], [3, 84, .25], [4, 88, .75], [8, 84, .5], [11, 81, .25], [14, 79, .5]],
  [[0, 77, .5], [3, 81, .25], [4, 84, .5], [7, 81, .25], [8, 77, .75], [12, 76, .5]],
  [[0, 74, .5], [3, 79, .25], [4, 83, .75], [8, 81, .5], [11, 79, .25], [14, 74, .5]],
  [[0, 76, .5], [3, 79, .25], [4, 84, 1], [10, 79, .5], [13, 76, .5]],
  [[0, 74, .5], [3, 71, .25], [4, 67, .5], [8, 71, .5], [11, 74, .25], [14, 79, .5]]
]);

export function midiFrequency(midi) {
  if (!Number.isFinite(midi)) throw new TypeError('A finite MIDI pitch is required');
  return 440 * 2 ** ((midi - 69) / 12);
}

export function musicStep(index) {
  if (!Number.isSafeInteger(index) || index < 0) return [];
  const position = index % SCORE.loopSteps;
  const bar = Math.floor(position / 16);
  const step = position % 16;
  const chord = harmony[bar];
  const events = [];
  const add = (voice, midi, beats, gain, pan = 0) => {
    events.push({ voice, midi, beats, gain, pan });
  };
  for (const [at, pitch, duration] of melody[bar]) {
    if (step === at) add('lead', pitch, duration * .88, .13, -.08);
  }
  if (step % 4 === 0) {
    const bass = [chord[0], chord[0] + 12, chord[0] + 7, chord[0] + 12][step / 4];
    add('bass', bass, .65, .18);
  }
  if (step === 2 || step === 10) {
    chord.slice(1, 4).forEach((pitch, i) => add('chord', pitch, .55, .035, (i - 1) * .3));
  }
  if (step === 6 || step === 14) {
    add('bell', chord[step === 6 ? 3 : 4] + 12, .3, .045, .3);
  }
  if (step === 0 || step === 8 || (bar % 4 === 3 && step === 14)) add('kick', null, .25, .2);
  if (step === 4 || step === 12) add('snare', null, .2, .07);
  if (step % 2 === 0) add('hat', null, .08, step % 4 ? .035 : .02, -.25);
  if (bar % 4 === 3 && (step === 13 || step === 15)) add('hat', null, .06, .025, .25);
  return events;
}

// Jingle offsets and durations are beats at SCORE.bpm, not seconds.
// Playback belongs to the effects bus, independent of the background music.
export const JINGLES = freeze({
  checkpoint: [
    { at: 0, midi: 76, beats: .2, voice: 'bell', gain: .12 },
    { at: .25, midi: 79, beats: .2, voice: 'bell', gain: .12 },
    { at: .5, midi: 84, beats: .8, voice: 'bell', gain: .12 }
  ],
  complete: [
    { at: 0, midi: 72, beats: .25, voice: 'lead', gain: .14 },
    { at: .3, midi: 76, beats: .25, voice: 'lead', gain: .14 },
    { at: .6, midi: 79, beats: .25, voice: 'lead', gain: .14 },
    { at: 1, midi: 84, beats: .5, voice: 'lead', gain: .14 },
    { at: 1.6, midi: 81, beats: .25, voice: 'lead', gain: .12 },
    { at: 2, midi: 84, beats: 1.5, voice: 'bell', gain: .14 },
    { at: 2, midi: 60, beats: 1.5, voice: 'chord', gain: .07 },
    { at: 2, midi: 64, beats: 1.5, voice: 'chord', gain: .06 },
    { at: 2, midi: 67, beats: 1.5, voice: 'chord', gain: .06 }
  ]
});

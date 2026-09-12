import { PHYSICS } from './level.js';

export function createMissionProgress() {
  return { jobs: {}, resources: new Set(), rewardedTasks: new Set(), module: 'speed', pulse: 0, pulseCooldown: 0, focused: 0,
    liftsSynchronized: false, geometryVersion: 0, dialogue: '', dialogueId: 0 };
}

export function missionStations(state) {
  return (state.stage === 'boss' ? state.arena : state.world).stations ?? [];
}

function progressFor(state, station) {
  return state.missionProgress.jobs[station.id] ?? { status: 'idle', remaining: station.duration ?? 0 };
}

function dependenciesFor(state, station) {
  const stations = missionStations(state);
  return (station.requires ?? []).filter(key => {
    const prerequisite = stations.find(candidate => candidate.key === key);
    return !prerequisite || progressFor(state, prerequisite).status !== 'complete';
  });
}

export function missionReady(state) {
  return missionStations(state).filter(station => !station.optional)
    .every(station => progressFor(state, station).status === 'complete');
}

export function interactionFor(state) {
  if (!state.missionProgress) return null;
  const center = state.player.x + PHYSICS.playerWidth / 2;
  const feet = state.player.y + PHYSICS.playerHeight;
  return missionStations(state).filter(station => Math.abs(center - station.x) < 100 && Math.abs(feet - station.y) < 70)
    .sort((first, second) => Math.abs(first.x - center) - Math.abs(second.x - center))[0] ?? null;
}

export function stationStatus(state, station) {
  const job = progressFor(state, station);
  if (job.status === 'complete') return 'Complete';
  if (job.status === 'rollback') return 'Rollback required';
  if (job.status === 'working' || job.status === 'queued') {
    const missing = dependenciesFor(state, station);
    if (missing.length) return `Blocked: ${missing.join(', ')}`;
    if (station.resource && !state.missionProgress.resources.has(station.resource)) return `Needs ${station.resource}`;
    if (station.action === 'pair' && interactionFor(state)?.id !== station.id) return 'Waiting at terminal';
    return `Working: ${Math.ceil(job.remaining)}s`;
  }
  return 'Ready';
}

function message(state, text, events) {
  state.missionProgress.dialogue = text;
  state.missionProgress.dialogueId += 1;
  events.push({ type: 'missionMessage', text });
}

function complete(state, station, events) {
  const job = state.missionProgress.jobs[station.id] ??= {};
  if (job.status === 'complete') return;
  job.status = 'complete'; job.remaining = 0;
  if (!state.missionProgress.rewardedTasks.has(station.id)) {
    state.score += 250; state.missionProgress.rewardedTasks.add(station.id);
  }
  if (station.bridge && !state.geometry.platforms.some(platform => platform.id === station.bridge.id)) {
    state.geometry.platforms.push({ ...station.bridge }); state.missionProgress.geometryVersion += 1;
  }
  if (station.action === 'sync') state.missionProgress.liftsSynchronized = true;
  message(state, station.message ?? `${station.title} complete.`, events);
  events.push({ type: 'missionTask', id: station.id, title: station.title });
}

export function interact(state, choice, events) {
  const station = interactionFor(state);
  if (!station) return false;
  const job = state.missionProgress.jobs[station.id] ??= { status: 'idle', remaining: station.duration ?? 0 };
  if (job.status === 'complete' || job.status === 'working' || job.status === 'queued') return false;
  if (job.status === 'rollback') {
    complete(state, station, events);
    message(state, 'Previous version restored. The deployment is contained; the corrected result can proceed.', events);
    return true;
  }
  const missing = dependenciesFor(state, station);
  if (missing.length && station.action !== 'delegate') {
    message(state, `Blocked: complete ${missing.join(' and ')} first.`, events); return false;
  }
  if (station.choices && !choice) {
    message(state, `${station.title}: a decision is required.`, events); return false;
  }
  if (station.choices && !station.choices.some(([key]) => key === choice)) return false;
  if (station.action === 'model' || station.action === 'evaluate') state.missionProgress.module = choice;
  if (station.answer && choice !== station.answer) {
    message(state, station.failure ?? 'That does not satisfy the agreed outcome. The current system is unchanged.', events);
    return false;
  }
  if (station.duration) {
    job.status = 'queued'; job.remaining = station.duration;
    message(state, station.resource && !state.missionProgress.resources.has(station.resource)
      ? `${station.title} queued. Missing ${station.resource}.` : `${station.title} assigned.`, events);
  } else complete(state, station, events);
  return true;
}

export function updateMission(state, input, dt, events) {
  if (!state.missionProgress) return;
  const progress = state.missionProgress;
  progress.pulse = Math.max(0, progress.pulse - dt);
  progress.pulseCooldown = Math.max(0, progress.pulseCooldown - dt);
  if (input.pulsePressed && progress.pulseCooldown === 0) {
    progress.pulse = 3; progress.pulseCooldown = 5;
    events.push({ type: 'debugPulse' });
  }
  if (state.stage === 'world') {
    for (const resource of state.world.resources ?? []) {
      if (!progress.resources.has(resource.key)
        && Math.abs(state.player.x + PHYSICS.playerWidth / 2 - resource.x) < 36
        && Math.abs(state.player.y + PHYSICS.playerHeight / 2 - resource.y) < 45) {
        progress.resources.add(resource.key);
        message(state, `${resource.label} recovered. Queued work can resume.`, events);
      }
    }
    for (const platform of state.geometry.platforms) {
      if (!platform.motion) continue;
      const oldX = platform.x; const oldY = platform.y;
      const motion = platform.motion;
      const offset = progress.liftsSynchronized ? 0 : Math.sin(state.time * Math.PI * 2 / motion.period) * motion.distance;
      platform.x = motion.x + (motion.axis === 'x' ? offset : 0);
      platform.y = motion.y + (motion.axis === 'y' ? offset : 0);
      if (state.player.grounded && Math.abs(state.player.y + PHYSICS.playerHeight - oldY) < 1
        && state.player.x + PHYSICS.playerWidth > oldX && state.player.x < oldX + platform.w) {
        state.player.x += platform.x - oldX; state.player.y += platform.y - oldY;
      }
    }
  }
  if (input.interactPressed || input.choice) interact(state, input.choice, events);
  const capacity = state.mission.index >= 4 ? 2 : 1;
  let active = 0;
  for (const station of missionStations(state)) {
    const job = progress.jobs[station.id];
    if (!job || !['queued','working'].includes(job.status)) continue;
    const blocked = dependenciesFor(state, station).length > 0
      || station.resource && !progress.resources.has(station.resource)
      || station.action === 'pair' && interactionFor(state)?.id !== station.id;
    if (blocked || active >= capacity) { job.status = 'queued'; continue; }
    active += 1; job.status = 'working'; job.remaining = Math.max(0, job.remaining - dt);
    if (job.remaining === 0) {
      if (station.action === 'deployment') {
        job.status = 'rollback'; message(state, station.message ?? 'The trial drifted. Roll back before deploying again.', events);
      } else complete(state, station, events);
    }
  }
  if (state.boss) state.boss.objectivesLocked = !missionReady(state);
}
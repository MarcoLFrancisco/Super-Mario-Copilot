import { climbFor } from './actor-physics.js';

export function actionForKey(code, bindings, player = null, world = null, arcadeKind = null) {
  const assigned = Object.entries(bindings).find(([, key]) => key === code)?.[0];
  const action = assigned ?? (code === 'ArrowUp' ? player && world && (player.climbing || climbFor(player, world)) ? 'climbUp' : 'jump'
    : { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'climbDown', KeyW: 'jump', ShiftRight: 'boost' }[code]);
  if (arcadeKind === 'invaders') return { patch: 'invader-shield', query: 'invader-wingman', aegis: 'invader-chain', pulse: 'invader-pulse' }[action]
    ?? (!action && code === 'Digit4' ? 'invader-pulse' : action);
  return action;
}
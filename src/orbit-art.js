import { ORBIT, ballPosition, reboundVelocity } from './orbit.js';
import { drawCharacter, drawSparq } from './character.js';

const colors = ['#e5ba55', '#df897a', '#67c9b6', '#79b9d5'];

function rectangle(ctx, x, y, width, height, color, radius = 3) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = color; ctx.fill();
}

function label(ctx, text, x, y, size = 14, color = '#e4f3eb') {
  ctx.fillStyle = color; ctx.font = `600 ${size}px 'Trebuchet MS', sans-serif`;
  ctx.fillText(text, x, y);
}

function drawSaucer(ctx, state, reducedMotion) {
  const paddle = state.paddle;
  const hullY = paddle.y + 38;
  ctx.save();
  ctx.strokeStyle = state.shieldTime > 0 ? '#f7d76d' : '#8ee5d2'; ctx.lineWidth = 3;
  ctx.fillStyle = state.shieldTime > 0 ? '#f7d76d18' : '#8ee5d218';
  ctx.beginPath();
  for (const [index, [horizontal, vertical]] of [[-.5, 25], [-.375, 5], [-.175, -12],
    [.175, -12], [.375, 5], [.5, 25], [.5, 42], [-.5, 42]].entries()) {
    const x = paddle.x + horizontal * paddle.w;
    const y = paddle.y + vertical;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b7ebed22'; ctx.strokeStyle = '#bfe8e1'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(paddle.x, hullY - 2, 39, 48, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
  drawCharacter(ctx, { x: paddle.x - 17, y: paddle.y - 10, vx: 0, vy: 0,
    facing: 1, grounded: true, boostTime: 0 }, state.time, true);
  ctx.strokeStyle = '#6cd5c0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(paddle.x - 17, hullY - 18); ctx.lineTo(paddle.x - 29, hullY - 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(paddle.x + 11, hullY - 15); ctx.lineTo(paddle.x + 16, hullY - 6); ctx.stroke();
  rectangle(ctx, paddle.x - 20, hullY - 8, 42, 7, '#2e5d60');
  ctx.fillStyle = '#f0f0d9'; ctx.strokeStyle = '#1b494d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(paddle.x, hullY + 4, paddle.w / 2, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#478c8b';
  ctx.beginPath(); ctx.ellipse(paddle.x, hullY + 13, paddle.w / 3, 9, 0, 0, Math.PI); ctx.fill();
  for (let light = -2; light <= 2; light += 1) {
    rectangle(ctx, paddle.x + light * paddle.w / 6 - 5, hullY + 3, 10, 4,
      light % 2 ? '#e5b952' : '#47bda6', 1);
  }
  if (!reducedMotion) {
    ctx.strokeStyle = '#69d1c07a'; ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(paddle.x + side * 30, hullY + 22);
      ctx.lineTo(paddle.x + side * 32, hullY + 29 + Math.sin(state.time * 15) * 3); ctx.stroke();
    }
  }
  drawSparq(ctx, paddle.x + 27, hullY - 22, state.time, reducedMotion);
  ctx.restore();
}

export function renderOrbit(ctx, state, reducedMotion = false, options = {}) {
  ctx.save();
  ctx.setTransform(ctx.canvas.width / state.width, 0, 0, ctx.canvas.height / ORBIT.height, 0, 0);
  ctx.fillStyle = '#122a31'; ctx.fillRect(0, 0, state.width, ORBIT.height);
  for (let star = 0; star < 100; star += 1) {
    const x = (star * 193 + 73) % state.width;
    const y = (star * 139 + 13) % 680;
    ctx.fillStyle = star % 4 === 0 ? '#9fbfc4' : '#54787f';
    ctx.fillRect(x, y, star % 7 === 0 ? 2 : 1, 1);
  }
  ctx.strokeStyle = '#376c74'; ctx.lineWidth = 1;
  ctx.strokeRect(18, 34, state.width - 36, 652);
  for (let tick = 60; tick < 680; tick += 32) {
    ctx.fillStyle = '#69a5ab'; ctx.fillRect(18, tick, 5, 1); ctx.fillRect(state.width - 23, tick, 5, 1);
  }
  ctx.fillStyle = '#39777d'; ctx.beginPath(); ctx.moveTo(0, 702);
  ctx.quadraticCurveTo(state.width / 2, 650, state.width, 702); ctx.lineTo(state.width, 720); ctx.lineTo(0, 720); ctx.fill();
  ctx.strokeStyle = '#a6d8ca'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 702);
  ctx.quadraticCurveTo(state.width / 2, 650, state.width, 702); ctx.stroke();
  const armorRemaining = state.bricks.some(brick => brick.kind === 'armor');
  for (const [index, brick] of state.bricks.entries()) {
    const color = brick.kind === 'core' ? armorRemaining ? '#7e9291' : '#a1f1c4'
      : colors[(Math.floor(brick.y / 40) + state.wave) % colors.length];
    rectangle(ctx, brick.x - brick.w / 2, brick.y - brick.h / 2 + 4, brick.w, brick.h, '#081c23');
    rectangle(ctx, brick.x - brick.w / 2, brick.y - brick.h / 2, brick.w, brick.h, color);
    ctx.fillStyle = '#ffffff70'; ctx.fillRect(brick.x - brick.w / 2 + 3, brick.y - brick.h / 2 + 2, brick.w - 6, 2);
    if (options.highContrast || (state.queryTime > 0 && index < 3)) {
      ctx.strokeStyle = state.queryTime > 0 && index < 3 ? '#ffeb8a' : '#ffffff'; ctx.lineWidth = 2;
      ctx.strokeRect(brick.x - brick.w / 2 - 2, brick.y - brick.h / 2 - 2, brick.w + 4, brick.h + 4);
    }
    for (let health = 0; health < brick.hp; health += 1) {
      rectangle(ctx, brick.x - brick.hp * 4 + health * 8, brick.y - 2, 5, 4, '#254d51', 1);
    }
    if (brick.kind === 'core') {
      ctx.textAlign = 'center'; label(ctx, armorRemaining ? 'FIREWALL' : 'RESTORE', brick.x, brick.y + 21, 10, '#204748');
      ctx.textAlign = 'left';
    }
  }
  for (const barrier of state.barriers) {
    rectangle(ctx, barrier.x - barrier.w / 2, barrier.y - barrier.h / 2, barrier.w, barrier.h, '#e5e7cc');
    for (let stripe = -55; stripe < 60; stripe += 20) rectangle(ctx, barrier.x + stripe, barrier.y - 4, 9, 8, '#447379', 0);
  }
  for (const [index, portal] of state.portals.entries()) {
    ctx.strokeStyle = '#92ded5'; ctx.lineWidth = 4; ctx.beginPath();
    ctx.ellipse(portal.x, portal.y, 23, 29, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#f6d771'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.ellipse(portal.x, portal.y, 17, 23, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; label(ctx, index === 0 ? 'A > B' : 'B > A', portal.x, portal.y + 47, 11);
    ctx.textAlign = 'left';
  }
  for (const ball of state.balls) {
    const position = ballPosition(ball);
    if (ball.attached) {
      const velocity = reboundVelocity(ball.offset / (state.paddle.w / 2) || .2);
      ctx.setLineDash([5, 8]); ctx.lineWidth = 2; ctx.strokeStyle = '#9fdfd4';
      ctx.beginPath(); ctx.moveTo(position.x, position.y - 12);
      ctx.lineTo(position.x + velocity.x * .38, position.y + velocity.y * .38); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = '#f9f2c9'; ctx.strokeStyle = '#e4b951'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(position.x, position.y, ORBIT.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(position.x - 3, position.y - 4, 4, 3);
  }
  for (const drop of state.drops) {
    rectangle(ctx, drop.x - 14, drop.y - 14, 28, 28, '#dcf2cf', 5);
    ctx.textAlign = 'center'; label(ctx, { wide: 'W', multi: '3', magnet: 'M', laser: 'L', net: 'N' }[drop.kind],
      drop.x, drop.y + 5, 16, '#245751'); ctx.textAlign = 'left';
  }
  for (const laser of state.lasers) {
    ctx.fillStyle = '#fae992'; ctx.fillRect(laser.x - 2, laser.y, 4, state.paddle.y - 30 - laser.y);
  }
  for (const missile of state.missiles) {
    if (missile.warning > 0) {
      ctx.setLineDash([6, 8]); ctx.strokeStyle = '#efaa8a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(missile.x, missile.y); ctx.lineTo(missile.x, state.paddle.y + 30); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, '!', missile.x - 3, missile.y - 12, 20, '#ffcb95');
    } else {
      ctx.fillStyle = '#f2967d'; ctx.beginPath(); ctx.moveTo(missile.x, missile.y + 12);
      ctx.lineTo(missile.x - 7, missile.y - 7); ctx.lineTo(missile.x + 7, missile.y - 7); ctx.fill();
    }
  }
  if (state.netCharges > 0) {
    ctx.strokeStyle = '#a2edc8'; ctx.lineWidth = 3; ctx.setLineDash([10, 4]);
    ctx.beginPath(); ctx.moveTo(25, 680); ctx.lineTo(state.width - 25, 680); ctx.stroke(); ctx.setLineDash([]);
  }
  drawSaucer(ctx, state, reducedMotion);
  if (state.phase === 'wave-clear') {
    ctx.textAlign = 'center'; label(ctx, 'SECTOR RESTORED', state.width / 2, 430, 28);
  }
  ctx.restore();
}
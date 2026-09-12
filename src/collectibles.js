import { APPS } from './level.js';

// World-space drawing: caller applies the camera and skips collected IDs.
// Items retain level.js fields {id,x,y,radius,secret,app}; physics is unchanged.
export const COLLECTIBLE_NAMES = Object.freeze({
  outlook: 'Energy cell', excel: 'Energy cell',
  copilot: 'Energy cell', teams: 'Energy cell'
});

function panel(ctx, x, y, w, h, radius, fill, stroke = '#ffffff99') {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .8; ctx.stroke(); }
}
function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
function dot(ctx, x, y, radius, color) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}
function gradient(ctx, top, bottom) {
  const g = ctx.createLinearGradient(-8, -12, 8, 12);
  g.addColorStop(0, top); g.addColorStop(1, bottom); return g;
}
function badge(ctx, letter, x, y, color) {
  panel(ctx, x, y, 11, 12, 2, color, '#ffffff66');
  ctx.fillStyle = '#ffffff'; ctx.font = "bold 9px 'Segoe UI', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(letter, x + 5.5, y + 6.5);
}
function email(ctx) {
  panel(ctx, -10, -10, 21, 18, 3, '#087bc0');
  panel(ctx, -7, -7, 20, 16, 2, gradient(ctx, '#ffffff', '#a9ddff'), '#d9f4ff');
  line(ctx, [[-6, 7], [3, 0], [12, 7]], '#64a8d3');
  line(ctx, [[-6, -6], [3, 1], [12, -6]], '#257db5', 1.3);
  badge(ctx, 'O', -14, -3, '#0965ba');
  dot(ctx, 11, -9, 3.5, '#ffcd67');
  dot(ctx, 10.4, -10, .9, '#fff8d7');
}
function sheet(ctx) {
  panel(ctx, -7, -12, 19, 24, 2, gradient(ctx, '#ffffff', '#c7f7df'), '#edfff6');
  panel(ctx, -7, -12, 19, 6, 2, '#15975e', null);
  ctx.fillStyle = '#57be8b';
  ctx.fillRect(-3, -3, 5, 4); ctx.fillRect(4, 3, 5, 4);
  for (let y = -4; y <= 8; y += 6) line(ctx, [[-4, y], [10, y]], '#65b98f', .7);
  for (let x = -4; x <= 10; x += 7) line(ctx, [[x, -4], [x, 8]], '#65b98f', .7);
  badge(ctx, 'X', -14, -4, '#107c41');
  line(ctx, [[-2, -9], [6, -9]], '#c5ffe3');
}
function conversation(ctx) {
  panel(ctx, -3, -11, 17, 14, 4, gradient(ctx, '#c9baff', '#7767c9'));
  line(ctx, [[10, 2], [12, 6], [5, 2]], '#a898ec', 2);
  panel(ctx, -13, -4, 23, 15, 4, gradient(ctx, '#a69bff', '#5544af'));
  ctx.beginPath(); ctx.moveTo(-8, 9); ctx.lineTo(-10, 14); ctx.lineTo(-2, 10);
  ctx.fillStyle = '#6251bc'; ctx.fill();
  for (let i = 0; i < 3; i++) dot(ctx, -7 + i * 6, 3.5, 1.5, '#ffffff');
  dot(ctx, -10, -9, 4, '#e8e0ff');
  line(ctx, [[-12, -9], [-8, -9]], '#7764c5', 1.2);
}
function copilot(ctx) {
  // Interwoven multicolor ribbons, deliberately not a star-shaped token.
  const colors = [['#53e4ee', '#3689ef'], ['#8572ff', '#d48bdc'], ['#ffca8f', '#f075ab']];
  colors.forEach(([top, bottom], i) => {
    ctx.save(); ctx.rotate(i * Math.PI * 2 / 3 - .35);
    ctx.beginPath();
    ctx.moveTo(-10, -3);
    ctx.bezierCurveTo(-11, -13, 1, -14, 5, -6);
    ctx.bezierCurveTo(8, 0, 13, 3, 8, 9);
    ctx.bezierCurveTo(4, 14, -3, 8, -3, 3);
    ctx.bezierCurveTo(-3, -2, -7, 1, -10, -3);
    ctx.closePath(); ctx.fillStyle = gradient(ctx, top, bottom); ctx.fill();
    ctx.strokeStyle = '#ffffff70'; ctx.lineWidth = .7; ctx.stroke();
    ctx.restore();
  });
  dot(ctx, 0, 0, 2.3, '#eaffff');
}

export function drawCollectible(ctx, item, time = 0, reducedMotion = false) {
  const app = Object.hasOwn(APPS, item.app) ? item.app : 'copilot';
  const t = reducedMotion ? 0 : time;
  const bob = reducedMotion ? 0 : Math.sin(t * 3 + item.x * .03) * 2;
  ctx.save(); ctx.translate(item.x, item.y + bob);
  const scale = item.radius / 11;
  ctx.scale(scale, scale);
  if (item.secret) {
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 17, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffe49aaa'; ctx.lineWidth = 1; ctx.stroke();
    dot(ctx, 0, -17, 2, '#ffe8a6');
  }
  ctx.rotate(reducedMotion ? 0 : Math.sin(t * 2 + item.x) * .06);
  ctx.shadowColor = '#071d4b88'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
  panel(ctx, -8, -11, 16, 22, 4, '#fff5d2', '#725e29');
  panel(ctx, -5, -7, 10, 14, 2, APPS[app].color, null);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -5, 2, 10); ctx.fillRect(-4, -1, 8, 2);
  ctx.fillStyle = '#725e29'; ctx.fillRect(-3, -13, 6, 2); ctx.fillRect(-3, 11, 6, 2);
  ctx.restore();
}

// Renderer retains transient {item, startedAt, points} effects outside engine
// state, drawing each with age = state.time - startedAt for at most .55s.
export function drawPickup(ctx, item, age, points = 0, reducedMotion = false) {
  if (!Number.isFinite(age) || age < 0 || age >= .55) return;
  const progress = age / .55;
  const color = APPS[item.app]?.color ?? APPS.copilot.color;
  ctx.save(); ctx.translate(item.x, item.y);
  ctx.globalAlpha *= 1 - progress;
  if (!reducedMotion) {
    ctx.beginPath(); ctx.arc(0, 0, 10 + progress * 26, 0, Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = 2 * (1 - progress); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const distance = 8 + progress * 31;
      ctx.save();
      ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance + progress * progress * 12);
      ctx.rotate(angle + progress * 3);
      ctx.fillStyle = i % 2 ? '#ffffff' : color;
      ctx.fillRect(-2, -2, 4, 4); ctx.restore();
    }
  }
  ctx.font = "bold 13px 'Segoe UI', sans-serif";
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.lineWidth = 3; ctx.strokeStyle = '#13294b'; ctx.fillStyle = '#ffffff';
  const message = points > 0 ? `+${points}` : 'Collected!';
  const y = reducedMotion ? -18 : -18 - progress * 20;
  ctx.strokeText(message, 0, y); ctx.fillText(message, 0, y);
  ctx.restore();
}

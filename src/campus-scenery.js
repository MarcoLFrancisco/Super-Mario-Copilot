import { VIEW, APPS } from './campus-level.js';

// Background uses viewport coordinates; platforms use world coordinates.
// Caller sets canvas scaling and applies camera translation only to platforms.
const palettes = {
  excel: ['#abd9e5', '#e6f3dc', '#a3cbbb', '#7bab9f'],
  outlook: ['#adcfeb', '#edf5df', '#a9c9c6', '#8bb3b4'],
  teams: ['#c4dae8', '#f4e2dc', '#b4c6c4', '#8fafa9'],
  copilot: ['#e7d9c9', '#f8e9ce', '#b7c8ba', '#8cafa4']
};
function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}
function oval(ctx, x, y, rx, ry, color) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}
function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function gradient(ctx, y, h, top, bottom) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top); g.addColorStop(1, bottom); return g;
}
function cloud(ctx, x, y, size) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  oval(ctx, 0, 10, 65, 15, '#588ca91c');
  oval(ctx, -29, 0, 34, 19, '#f6fcff');
  oval(ctx, 0, -12, 37, 30, '#ffffff');
  oval(ctx, 35, 0, 34, 19, '#f0f9ff');
  oval(ctx, 5, 9, 52, 11, '#e4f3fa');
  ctx.restore();
}

export function drawBackground(ctx, cameraX, zone, time = 0, reducedMotion = false) {
  const colors = palettes[zone.app] ?? palettes.copilot;
  const t = reducedMotion ? 0 : time;
  ctx.save();
  rect(ctx, 0, 0, VIEW.width, VIEW.height, gradient(ctx, 0, VIEW.height, colors[0], colors[1]));
  oval(ctx, 1050, 95, 39, 39, '#fff6d6');
  for (let band = 0; band < 3; band++) {
    ctx.beginPath();
    ctx.moveTo(-60, 140 + band * 32);
    ctx.bezierCurveTo(340, -30 + band * 40, 730, 280 + band * 30, 1350, 100 + band * 35);
    ctx.strokeStyle = ['#a6ffed25', '#d8ccff35', '#ffe1bd30'][band];
    ctx.lineWidth = 22; ctx.stroke();
  }
  for (let layer = 0; layer < 2; layer++) {
    const spacing = 330;
    const offset = cameraX * (.08 + layer * .08);
    const first = Math.floor(offset / spacing) - 1;
    for (let i = first; i <= first + 6; i++) {
      const x = i * spacing - offset;
      const height = 155 + ((i * 71 % 110) + 110) % 110;
      oval(ctx, x + 170, 660 + layer * 80, 250, height + layer * 80, colors[2 + layer]);
      oval(ctx, x + 140, 530 + layer * 90, 4, 11, '#ffffff22');
    }
  }
  const offset = cameraX * .25;
  const first = Math.floor(offset / 230) - 1;
  for (let i = first; i <= first + 7; i++) {
    const x = i * 230 - offset;
    const h = 95 + ((i * 43 % 110) + 110) % 110;
    const y = 565 - h;
    rect(ctx, x + 9, y - 8, 104, h + 8, '#ffffff20');
    rect(ctx, x, y, 100, h, gradient(ctx, y, h, '#eefaff99', '#b9d7ed44'));
    rect(ctx, x, y, 100, 17, '#f2f9ed77');
    for (let row = 0; row < Math.floor((h - 28) / 23); row++) {
      for (let col = 0; col < 4; col++) rect(ctx, x + 10 + col * 22, y + 28 + row * 23, 12, 10, '#ffffff55');
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = ((i * 233 - cameraX * .12 + t * 6) % 1600 + 1600) % 1600 - 140;
    cloud(ctx, x, 95 + (i * 79 % 200), .6 + i % 3 * .22);
  }
  const mist = gradient(ctx, 600, 120, '#d9f3ff00', '#e2f8ff88');
  rect(ctx, 0, 600, VIEW.width, 120, mist);
  ctx.restore();
}

export function drawPlatform(ctx, p, time = 0, reducedMotion = false) {
  const app = APPS[p.app] ?? APPS.copilot;
  const t = reducedMotion ? 0 : time;
  ctx.save();
  // The bright top remains exactly at the engine's landing coordinate.
  rect(ctx, p.x + 5, p.y + 9, p.w, p.h + 5, '#16375225');
  rect(ctx, p.x, p.y, p.w, p.h, gradient(ctx, p.y, p.h, app.color, app.dark));
  rect(ctx, p.x, p.y, p.w, 5, '#e6fff4');
  rect(ctx, p.x, p.y + 5, p.w, 3, app.color);
  rect(ctx, p.x, p.y + p.h - 4, p.w, 4, app.dark);
  rect(ctx, p.x, p.y + 8, 3, p.h - 12, '#ffffff60');
  rect(ctx, p.x + p.w - 4, p.y + 8, 4, p.h - 12, '#071c3444');
  ctx.beginPath(); ctx.rect(p.x + 5, p.y + 8, p.w - 10, p.h - 12); ctx.clip();
  for (let x = p.x + 8, i = 0; x < p.x + p.w - 8; x += 36, i++) {
    if (p.app === 'excel') {
      rect(ctx, x, p.y + 10, 30, 12, i % 3 ? '#d2ffdf25' : '#e5ffb355');
      line(ctx, [[x, p.y + 16], [x + 30, p.y + 16]], '#e7fff755');
      line(ctx, [[x + 15, p.y + 10], [x + 15, p.y + 22]], '#e7fff755');
    } else if (p.app === 'outlook') {
      rect(ctx, x + 3, p.y + 11, 24, 12, '#def5ffb0');
      line(ctx, [[x + 3, p.y + 11], [x + 15, p.y + 19], [x + 27, p.y + 11]], '#297ba9');
    } else if (p.app === 'teams') {
      rect(ctx, x + 2, p.y + 11, 27, 10, '#e5ddff80');
      for (let j = 0; j < 3; j++) oval(ctx, x + 9 + j * 7, p.y + 16, 1.5, 1.5, '#ffffff');
    } else {
      for (let j = 0; j < 3; j++) {
        oval(ctx, x + 8 + j * 8, p.y + 16 + Math.sin(t * 2 + i + j) * 2, 6, 4, ['#b7f5dd', '#fff2b4', '#ffc7b2'][j]);
      }
    }
  }
  ctx.restore();
  if (p.kind === 'secret') {
    ctx.save();
    rect(ctx, p.x + 8, p.y + p.h + 3, 25, 13, '#5b4779');
    ctx.font = "bold 9px 'Segoe UI', sans-serif";
    ctx.fillStyle = '#ffe5a1'; ctx.textAlign = 'center';
    ctx.fillText('×2', p.x + 20, p.y + p.h + 13);
    ctx.restore();
  }
}

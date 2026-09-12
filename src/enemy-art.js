// World-space artwork. Caller applies camera translation and visibility
// culling. Functions read combat objects without modifying simulation state.
function box(ctx, x, y, w, h, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}
function oval(ctx, x, y, rx, ry, color) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}
function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
function metal(ctx, top, bottom, height) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, top); g.addColorStop(1, bottom); return g;
}
function text(ctx, value, x, y, size, color) {
  ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center';
  ctx.fillStyle = color; ctx.fillText(value, x, y);
}

export function drawEnemy(ctx, enemy, reducedMotion = false) {
  if (enemy.dead) return;
  const t = reducedMotion ? 0 : enemy.age;
  ctx.save(); ctx.translate(enemy.x, enemy.y);
  if (enemy.facing < 0) { ctx.translate(enemy.w, 0); ctx.scale(-1, 1); }
  if (enemy.kind === 'worm') {
    oval(ctx, 21, 21, 20, 2, '#11293944');
    for (let i = 0; i < 5; i++) {
      const x = 5 + i * 7;
      const y = 13 + Math.sin(t * 9 - i) * 1.3;
      line(ctx, [[x - 2, y + 4], [x - 3, 21]], '#493454', 2);
      oval(ctx, x, y, 6, 7, metal(ctx, '#eda6e0', '#743a91', 22));
      oval(ctx, x - 1, y - 2, 3, 1.5, '#ffd3f2');
      box(ctx, x - 1, y + 2, 2, 2, '#adff9d');
    }
    oval(ctx, 35, 11, 7, 9, '#82539f');
    line(ctx, [[35, 5], [32, 1]], '#dfadeb', 1.5);
    box(ctx, 35, 7, 5, 5, '#1e213f'); box(ctx, 37, 8, 2, 2, '#c4ff8e');
    line(ctx, [[36, 16], [40, 15]], '#ffd2eb');
  } else if (enemy.kind === 'drone') {
    oval(ctx, 16, 15, 15, 10, metal(ctx, '#c5d8ee', '#56698f', 28));
    box(ctx, 3, 12, 26, 9, '#303450');
    box(ctx, 8, 13, 16, 7, '#ffbdcf');
    line(ctx, [[8, 13], [16, 18], [24, 13]], '#9b345e');
    for (const x of [5, 27]) {
      line(ctx, [[x, 10], [x, 4]], '#344661', 2);
      oval(ctx, x, 3, reducedMotion ? 6 : 4 + Math.abs(Math.sin(t * 35)) * 3, 1.7, '#cbf7ff');
    }
    box(ctx, 12, 24, 8, 4, '#f26499');
    if (enemy.warning > 0) {
      // Persistent shape and text communicate danger without flashing.
      line(ctx, [[16, -19], [25, -5], [7, -5], [16, -19]], '#ffdc78', 2);
      text(ctx, '!', 16, -8, 10, '#fff5bc');
      box(ctx, 2, 30, 28, 3, '#27314d');
      box(ctx, 2, 30, 28 * Math.min(1, enemy.warning), 3, '#ffb36d');
    }
  } else {
    const stride = Math.sin(t * 12) * 2;
    for (const [x, offset] of [[7, stride], [23, -stride]]) {
      line(ctx, [[x, 24], [x + offset, 30]], '#6a7697', 3);
      box(ctx, x - 4 + offset, 30, 9, 4, '#29364f');
    }
    box(ctx, 3, 16, 24, 12, metal(ctx, '#b9a9cd', '#555575', 30));
    box(ctx, 1, 5, 28, 15, '#343d5c');
    box(ctx, 3, 6, 24, 3, '#b5cce7');
    box(ctx, 5, 11, 20, 7, '#171e34');
    box(ctx, 8, 12, 4, 3, '#ff819b'); box(ctx, 20, 12, 4, 3, '#ff819b');
    line(ctx, [[15, 5], [18, 1]], '#b4cee4');
    oval(ctx, 18, 1, 2, 2, '#ffbf80');
    text(ctx, '<!>', 15, 25, 7, '#a9ffe5');
    for (const x of [1, 29]) oval(ctx, x, 22, 2, 4, '#8092ab');
    if (enemy.health === 1) line(ctx, [[15, 6], [12, 9], [16, 11]], '#ffe3b1');
  }
  ctx.restore();
}

export function drawProjectile(ctx, shot) {
  if (shot.life <= 0) return;
  ctx.save(); ctx.translate(shot.x, shot.y);
  const color = shot.owner === 'player' ? '#80ffdd' : '#ff91b2';
  ctx.shadowColor = color; ctx.shadowBlur = 7;
  if (shot.kind === 'wave') {
    line(ctx, [[0, shot.h], [5, 8], [12, 1], [22, 9], [shot.w, shot.h]], color, 3);
    line(ctx, [[7, shot.h], [13, 12], [20, shot.h]], '#ffe4f1', 2);
  } else {
    box(ctx, 0, 0, shot.w, shot.h, color);
    ctx.shadowBlur = 0;
    if (shot.kind === 'patch') {
      line(ctx, [[2, shot.h / 2], [4, shot.h - 2], [shot.w - 2, 2]], '#145b61', 1.3);
    } else if (shot.kind === 'spam') {
      line(ctx, [[1, 1], [shot.w / 2, shot.h / 2], [shot.w - 1, 1]], '#762c5c');
    } else text(ctx, '{}', shot.w / 2, shot.h - 3, 9, '#652b60');
  }
  ctx.restore();
}

export function drawPowerup(ctx, item, time = 0, reducedMotion = false) {
  if (item.collected) return;
  ctx.save(); ctx.translate(item.x, item.y);
  const halo = ctx.createRadialGradient(item.w / 2, item.h / 2, 3, item.w / 2, item.h / 2, 27);
  halo.addColorStop(0, '#b3eaff77'); halo.addColorStop(1, '#b3eaff00');
  box(ctx, -15, -15, item.w + 30, item.h + 30, halo);
  if (['helper-marco', 'helper-donkey', 'helper-mario'].includes(item.kind)) {
    const [name, color, highlight] = item.kind === 'helper-marco'
      ? ['Marco', '#137d89', '#a4fff0']
      : item.kind === 'helper-donkey'
        ? ['Donkey', '#655f79', '#a9fff1']
        : ['Mario', '#b93643', '#ffd6b0'];
    box(ctx, 0, 0, item.w, item.h, color);
    box(ctx, 1, 1, item.w - 2, 3, highlight);
    text(ctx, name[0], item.w / 2, item.h - 6, 18, '#ffffff');
    text(ctx, name, item.w / 2, -8, 12, '#ffffff');
  } else if (item.kind === 'microsoft') {
    const gap = 2, size = (Math.min(item.w, item.h) - gap) / 2;
    ['#f35325', '#81bc06', '#05a6f0', '#ffba08'].forEach((color, i) => {
      const x = (i % 2) * (size + gap), y = Math.floor(i / 2) * (size + gap);
      box(ctx, x, y, size, size, color); box(ctx, x, y, size, 1, '#ffffff99');
    });
  } else {
    box(ctx, 1, 7, 20, 10, '#5165a6'); box(ctx, 6, 17, 7, 8, '#354777');
    box(ctx, 18, 9, 8, 6, '#a2ffe6'); text(ctx, '+', 10, 15, 11, '#ffffff');
  }
  const pulse = reducedMotion ? 0 : Math.sin(time * 3) * 1.5;
  ctx.strokeStyle = '#d9ffffaa'; ctx.lineWidth = 1;
  ctx.strokeRect(-4 - pulse, -4 - pulse, item.w + 8 + pulse * 2, item.h + 8 + pulse * 2);
  ctx.restore();
}

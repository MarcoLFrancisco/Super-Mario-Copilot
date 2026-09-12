import { PHYSICS } from './campus-level.js';

function capsule(ctx, x, y, width, height, color, radius = 3) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = '#173d42'; ctx.lineWidth = 1.2; ctx.stroke();
}

export function drawCharacter(ctx, player, time = 0, reducedMotion = false) {
  const stride = player.grounded && !reducedMotion
    ? Math.sin(time * 20) * Math.min(1, Math.abs(player.vx) / PHYSICS.speed) : 0;
  ctx.save();
  ctx.translate(player.x + PHYSICS.playerWidth / 2, player.y);
  ctx.scale(player.facing < 0 ? -1 : 1, 1);
  if (player.boostTime > 0 && !reducedMotion) {
    for (let trail = 0; trail < 4; trail += 1) {
      ctx.fillStyle = `rgba(20, 166, 161, ${.6 - trail * .12})`;
      ctx.fillRect(-28 - trail * 12, 14 + trail * 7, 15, 3);
    }
  }
  capsule(ctx, -19, 20, 11, 18, '#dfbb50');
  capsule(ctx, -17, 24, 6, 8, '#214c4d', 1);
  ctx.fillStyle = '#aafce2'; ctx.fillRect(-16, 26, 4, 2);
  for (const side of [-1, 1]) {
    const offset = player.grounded ? stride * side * 3 : side === 1 ? -4 : 0;
    capsule(ctx, side * 5 - 4, 33, 8, 9 + offset, '#23575b', 2);
    capsule(ctx, side * 5 - 5, 40 + offset, 15, 6, '#ffffff', 2);
    ctx.fillStyle = '#54cdb2'; ctx.fillRect(side * 5 - 4, 44 + offset, 13, 2);
  }
  capsule(ctx, -10, 21, 22, 15, '#f37f67', 5);
  ctx.fillStyle = '#ffcfaa'; ctx.fillRect(-2, 22, 2, 10);
  capsule(ctx, 8, player.grounded ? 25 + stride * 2 : 17, 6, 11, '#f79a7e');
  capsule(ctx, 8, player.grounded ? 33 + stride * 2 : 15, 6, 5, '#c48c66', 2);
  capsule(ctx, -10, 3, 24, 20, '#d5a17a', 7);
  ctx.fillStyle = '#263839';
  ctx.beginPath(); ctx.moveTo(-11, 13); ctx.lineTo(-13, 5); ctx.lineTo(-8, 2);
  ctx.lineTo(-3, 4); ctx.lineTo(1, 0); ctx.lineTo(7, 3); ctx.lineTo(13, 2);
  ctx.lineTo(15, 9); ctx.lineTo(4, 8); ctx.lineTo(-3, 12); ctx.closePath(); ctx.fill();
  capsule(ctx, -12, 10, 5, 8, '#5cc8c4', 2);
  ctx.fillStyle = '#173d42'; ctx.fillRect(7, 12, 3, 4);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 12, 1, 1);
  ctx.strokeStyle = '#754936'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(6, 19); ctx.lineTo(10, 18); ctx.stroke();
  ctx.restore();
}

export function drawSparq(ctx, x, y, time = 0, reducedMotion = false, waiting = false) {
  ctx.save(); ctx.translate(x, y + (reducedMotion ? 0 : Math.sin(time * 3) * 4));
  ctx.fillStyle = '#f9d66a'; ctx.strokeStyle = '#705b27'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.quadraticCurveTo(4, -4, 14, 0);
  ctx.quadraticCurveTo(4, 4, 0, 15); ctx.quadraticCurveTo(-4, 4, -14, 0);
  ctx.quadraticCurveTo(-4, -4, 0, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#264345'; ctx.fillRect(-5, -2, 3, 4); ctx.fillRect(3, -2, 3, 4);
  if (waiting) {
    capsule(ctx, -8, -35, 16, 16, '#ffffff', 4);
    ctx.fillStyle = '#146967'; ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
    ctx.textAlign = 'center'; ctx.fillText('?', 0, -23);
  }
  ctx.restore();
}

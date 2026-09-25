import { PHYSICS } from './level.js';

export function characterMotion(actor, time = 0) {
  const climbing = Boolean(actor.climbing);
  const airborne = !actor.grounded && !climbing;
  const speed = Math.min(1, Math.abs(actor.vx ?? 0) / PHYSICS.speed);
  const walking = actor.grounded && speed > .025 && !actor.attack;
  const phase = climbing ? (actor.climbDistance ?? Math.abs(actor.vy ?? 0) * time) * .13
    : (actor.walkDistance ?? Math.abs(actor.vx ?? 0) * time) * .095;
  const stride = walking ? Math.sin(phase) * (.7 + speed * .3) : climbing ? Math.sin(phase) : 0;
  return { climbing, airborne, stride,
    backLift: climbing ? 4 + stride * 3 : walking ? Math.max(0, Math.cos(phase)) * 5 : 0,
    frontLift: climbing ? 4 - stride * 3 : walking ? Math.max(0, -Math.cos(phase)) * 5 : 0,
    bob: walking ? Math.abs(Math.sin(phase)) * 1.1 : 0,
    backArm: climbing ? -2.7 + stride * .35 : airborne ? .9 : -stride,
    frontArm: climbing ? -2.7 - stride * .35 : airborne ? -2.5 : stride };
}

// Draw in world coordinates after the caller applies its camera transform.
// Uses engine player fields; never mutates state or changes collision bounds.
// Custom procedural fan artwork, not an imported Nintendo sprite asset.
export function drawCharacter(ctx, player, time = 0, reducedMotion = false, kickExtension = null) {
  const t = reducedMotion ? 0 : time;
  const motion = characterMotion(player, time);
  const { airborne, stride, bob } = motion;
  const boosting = player.boostTime > 0;
  const outline = '#45282c';
  ctx.save();
  ctx.translate(player.x + PHYSICS.playerWidth / 2, player.y);
  ctx.scale(PHYSICS.playerWidth / 34, PHYSICS.playerHeight / 46);

  function ellipse(x, y, rx, ry, fill, stroke = true) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = .8;
      ctx.stroke();
    }
  }
  function shape(points, fill, stroke = true) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = .8;
      ctx.stroke();
    }
  }
  function line(points, color, width = 1) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  function shade(top, bottom, y, height) {
    const gradient = ctx.createLinearGradient(0, y, 0, y + height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    return gradient;
  }
  if (!airborne) ellipse(0, 46, 15, 2, '#07152a40', false);
  ctx.scale(player.facing < 0 ? -1 : 1, 1);
  if (boosting && !reducedMotion) {
    const trail = ctx.createLinearGradient(-66, 0, -10, 0);
    trail.addColorStop(0, '#6ceaff00');
    trail.addColorStop(1, '#a1f5ff99');
    for (let i = 0; i < 3; i++) {
      const y = 15 + i * 9;
      line([[-64 + i * 9, y + Math.sin(t * 24 + i) * 2], [-18, y]], trail, 3 - i * .5);
    }
  }
  ctx.translate(0, -bob);
  const red = shade('#ff535b', '#bf122d', 20, 14);
  const blue = shade('#438fff', '#17439b', 26, 16);
  const skin = shade('#ffe0b2', '#efaa79', 9, 16);

  function arm(x, y, angle, back = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ellipse(0, 4, 3.4, 6, back ? '#b92137' : red);
    ellipse(0, 10, 4.1, 4.1, shade('#ffffff', '#c9d9ef', 7, 7));
    ellipse(3, 9, 1.6, 2, '#f4f8ff');
    line([[-1.8, 9], [-1.6, 11]], '#9babc5', .6);
    line([[.1, 9], [.3, 11]], '#9babc5', .6);
    ctx.restore();
  }
  function leg(x, angle, back = false, lift = 0, kick = false) {
    ctx.save();
    ctx.translate(x, 34);
    if (kick) ctx.rotate(angle);
    const footX = kick ? 0 : Math.sin(angle) * 11;
    const kneeX = kick ? 0 : footX * .4 + lift * .4;
    line([[0,0],[kneeX,4 - lift * .2],[footX,8.6 - lift]], outline, 7.2);
    line([[0,0],[kneeX,4 - lift * .2],[footX,8.6 - lift]], back ? '#19438c' : blue, 5.8);
    line([[kneeX - 1,4 - lift * .2],[footX - 1,7.5 - lift]], '#70a7eb', 1);
    ellipse(footX + 1.6, 8.6 - lift, 6, 3, shade('#a36538', '#563021', 6, 6));
    line([[footX - 3,10.5 - lift],[footX + 6,10.5 - lift]], '#35252a', 1);
    line([[footX + .5,7 - lift],[footX + 4,7.3 - lift]], '#d79d65', .8);
    ctx.restore();
  }
  const jumpAngle = player.vy < 0 ? -.9 : -.5;
  arm(-8, 24, motion.backArm, true);
  leg(-5, airborne ? .85 : stride * .95, true, airborne ? 3 : motion.backLift, airborne);
  // Pose the existing front leg for helper kicks; never add an extra limb.
  leg(5, kickExtension === null
    ? (airborne ? jumpAngle : -stride * .95)
    : -1.48 * kickExtension, false, airborne ? 2 : motion.frontLift, kickExtension !== null || airborne);
  ellipse(0, 28, 10, 9, red);
  shape([[-8, 26], [-5, 28], [6, 28], [9, 26], [9, 36], [-8, 36]], blue);
  shape([[-7, 22], [-3.5, 22], [-3, 30], [-6.5, 30]], '#438aff');
  shape([[4, 22], [7.5, 23], [7, 30], [3.8, 30]], '#5a9dff');
  ellipse(-4.5, 29, 1.5, 1.5, '#ffe272');
  ellipse(5.5, 29, 1.5, 1.5, '#ffe272');
  line([[-2, 32], [3, 32], [3, 35], [-2, 35]], '#83b9ff', .65);
  arm(9, 24, motion.frontArm);

  // Hair, face, ear, and the unmistakable rounded nose and moustache.
  ellipse(-1.5, 14.2, 11.4, 10.5, '#663822');
  ellipse(1.6, 15.3, 10.5, 10.2, skin);
  ellipse(-8, 16, 3.4, 4, skin);
  line([[-9, 15], [-7.5, 14.5], [-7.2, 17]], '#c58259', .8);
  shape([[-8, 9], [-4, 10], [-5, 18], [-8, 17]], '#643421');
  ellipse(7, 13.5, 3, 4.5, '#fffdf4');
  ellipse(8.1, 14, 1.45, 2.6, '#2984d0', false);
  ellipse(8.5, 14, .75, 1.8, '#172c43', false);
  ellipse(8.6, 13.1, .4, .6, '#ffffff', false);
  line([[4.5, 9.1], [7, 8.2], [9.1, 9]], '#5f3325', 1.6);
  ellipse(12, 17, 4.6, 3.8, skin);
  ellipse(12.5, 15.7, 1.7, .7, '#ffe9c5', false);
  for (const [x, y, r] of [[1, 20, 2.8], [4, 21, 3], [7, 21, 2.8], [9.5, 20, 2.2]]) {
    ellipse(x, y, r, 2, '#493024', false);
  }
  line([[4, 24], [7, 23.8]], '#b26b50', .7);

  // Red cap with front badge and a shaded projecting brim.
  ellipse(-.7, 6.5, 12.2, 6.2, shade('#ff6266', '#d91c36', 0, 12));
  shape([[-12, 6], [-9, 2], [0, .4], [8, 2.5], [10, 8], [-11, 9]], shade('#ff4f55', '#d31830', 0, 9));
  ellipse(6.5, 9.1, 10, 2.1, '#b51a2b');
  line([[-8, 3.5], [-3, 2], [1, 2.2]], '#ff9b91', 1);
  ellipse(3.4, 5.3, 4.4, 3.5, '#fff7e9');
  line([[.9, 7], [1.4, 3.8], [3.3, 5.8], [5.1, 3.8], [5.8, 7]], '#db2338', 1.1);
  ctx.restore();
}

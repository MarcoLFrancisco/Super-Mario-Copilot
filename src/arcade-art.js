import { VIEW } from './level.js';
import { drawPartyActor } from './party-art.js';

function panel(ctx, x, y, width, height, color, radius = 4) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
}

function polygon(ctx, points, color) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

function line(ctx, points, color, width = 2) {
  ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

function circle(ctx, x, y, radius, fill) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}

function label(ctx, text, x, y, size, color = '#ffffff', align = 'center') {
  ctx.font = `800 ${size}px 'Trebuchet MS', sans-serif`; ctx.textAlign = align;
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function pilot(ctx, state, x, y, scale = 1, moving = false, reducedMotion = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  drawPartyActor(ctx, { id: state.pilot, x: -17, y: 0, facing: 1, vx: moving ? 180 : 0,
    vy: 0, grounded: true, boostTime: 0, attack: null }, state.time, reducedMotion);
  ctx.restore();
}

function roadPoint(state, depth) {
  return { x: 640 + state.curve * (1 - depth) * 160, y: 225 + depth * depth * 390, half: 25 + depth * 315 };
}

function car(ctx, x, y, scale, color, driver, state, reducedMotion) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  panel(ctx, -34, -10, 68, 49, '#24363e', 8);
  panel(ctx, -38, -8, 11, 38, '#17272d', 3); panel(ctx, 27, -8, 11, 38, '#17272d', 3);
  polygon(ctx, [[-31,22],[-27,-34],[-19,-48],[19,-48],[27,-34],[31,22]], color);
  polygon(ctx, [[-23,-12],[-18,-33],[18,-33],[23,-12]], '#224e65');
  line(ctx, [[-15,-28],[13,-17]], '#a6eef5', 3);
  if (driver) pilot(ctx, state, 0, -51, .66, false, reducedMotion);
  panel(ctx, -33, 8, 66, 25, color, 5);
  panel(ctx, -29, 17, 16, 6, '#ffe284', 2); panel(ctx, 13, 17, 16, 6, '#ffe284', 2);
  panel(ctx, -11, 20, 22, 7, '#eef9ea', 1);
  panel(ctx, -34, 30, 68, 6, '#bddbe0', 2);
  ctx.restore();
}

function driving(ctx, state, reducedMotion) {
  const sky = ctx.createLinearGradient(0, 0, 0, 370);
  sky.addColorStop(0, state.difficulty > 1 ? '#519ab5' : '#63c9dc'); sky.addColorStop(1, '#ffdfb0');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  circle(ctx, 1020, 174, 58, '#fff1b5');
  polygon(ctx, [[0,280],[210,110],[340,255],[530,138],[680,290],[860,170],[1120,288],[1280,180],[1280,405],[0,405]], '#548d83');
  polygon(ctx, [[0,330],[180,260],[370,323],[540,241],[700,320],[980,243],[1280,325],[1280,430],[0,430]], '#7db888');
  ctx.fillStyle = '#63c8d5'; ctx.fillRect(0, 285, 470, 435);
  for (let wave = 0; wave < 14; wave += 1) {
    const height = 300 + wave * 31;
    line(ctx, [[0,height],[420 - wave * 12,height]], wave % 2 ? '#95e3e4' : '#c2f0eb', 3);
  }
  polygon(ctx, [[455,230],[690,230],[1280,720],[95,720]], '#a4d189');
  for (let strip = 0; strip < 55; strip += 1) {
    const far = roadPoint(state, strip / 54); const near = roadPoint(state, (strip + 1) / 54);
    const band = (strip + Math.floor(state.distance / 20)) % 4 < 2;
    polygon(ctx, [[far.x-far.half-14,far.y],[far.x+far.half+14,far.y],[near.x+near.half+16,near.y],[near.x-near.half-16,near.y]], band ? '#fff0d2' : '#e8836b');
    polygon(ctx, [[far.x-far.half,far.y],[far.x+far.half,far.y],[near.x+near.half,near.y],[near.x-near.half,near.y]], band ? '#46565c' : '#405159');
    if (band) for (const lane of [-1/3, 1/3]) polygon(ctx,
      [[far.x+far.half*lane-1,far.y],[far.x+far.half*lane+1,far.y],
        [near.x+near.half*lane+3,near.y],[near.x+near.half*lane-3,near.y]], '#f0f1cc');
  }
  for (let tree = 0; tree < 12; tree += 1) {
    const depth = ((tree / 12 + state.distance / 2500) % 1);
    const position = roadPoint(state, depth); const side = tree % 2 ? 1 : -1;
    const x = position.x + side * (position.half + 60 + depth * 90); const size = .2 + depth;
    line(ctx, [[x,position.y],[x - 10*size,position.y-90*size]], '#7e7156', 7*size);
    for (const reach of [-1,1]) {
      polygon(ctx, [[x-10*size,position.y-90*size],[x+reach*65*size,position.y-112*size],[x+reach*42*size,position.y-72*size]], '#286e57');
      polygon(ctx, [[x-10*size,position.y-90*size],[x+reach*52*size,position.y-60*size],[x+reach*43*size,position.y-40*size]], '#348767');
    }
  }
  for (const item of state.traffic.filter(item => !item.dead).sort((first, second) => second.z - first.z)) {
    if (item.token) {
      circle(ctx, item.x, item.y, 15*item.scale, '#ffdb70');
      label(ctx, '+', item.x, item.y + 7*item.scale, 22*item.scale, '#5e5526');
    } else car(ctx, item.x, item.y, item.scale, item.color, false, state, reducedMotion);
  }
  if (state.boostTime > 0) {
    for (const side of [-1,1]) polygon(ctx, [[state.player.x+side*20-6,621],[state.player.x+side*20+6,621],
      [state.player.x+side*20,650]], '#ffd06b');
  }
  ctx.save(); ctx.globalAlpha = state.grace > 0 ? .65 : 1;
  car(ctx, state.player.x, state.player.y, 1.35, '#f45e64', true, state, reducedMotion);
  ctx.restore();
  const remaining = Math.max(0, state.goal - state.distance);
  if (remaining < 800) {
    const position = roadPoint(state, Math.max(.1, 1 - remaining / 900));
    line(ctx, [[position.x-position.half,position.y],[position.x-position.half,position.y-70],
      [position.x+position.half,position.y-70],[position.x+position.half,position.y]], '#effcf2', 6);
    panel(ctx, position.x-position.half, position.y-90, position.half*2, 24, '#27545c', 1);
    label(ctx, 'FINISH', position.x, position.y-72, 16, '#ffdf86');
  }
}

function invaders(ctx, state, reducedMotion) {
  ctx.fillStyle = '#091d25'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  for (let star = 0; star < 110; star += 1) {
    const x = star * 137 % 1280; const y = (star * 73 + (reducedMotion ? 0 : state.time * 5)) % 540;
    panel(ctx, x, y, star % 8 ? 2 : 4, 2, star % 3 ? '#cce8e0' : '#efc97c', 0);
  }
  for (let tower = 0; tower < 17; tower += 1) {
    const height = 50 + tower * 37 % 120; const x = tower * 80;
    panel(ctx, x, 670-height, 65, height, '#18434c', 2);
    for (let window = 0; window < 4; window += 1) panel(ctx, x+10+window*13, 685-height, 6, 8, '#5f9186', 1);
  }
  line(ctx, [[0,623],[1280,623]], '#95e7b2', 3);
  for (const enemy of state.invaders) {
    if (enemy.dead) continue;
    const color = ['#c4ed83', '#79dcd1', '#ffa591'][enemy.row];
    const offset = reducedMotion ? 0 : Math.sin(state.time * 5 + enemy.x) * 3;
    panel(ctx, enemy.x-20, enemy.y-14, 40, 28, color, 5);
    panel(ctx, enemy.x-11, enemy.y-6, 7, 6, '#143138', 1); panel(ctx, enemy.x+4, enemy.y-6, 7, 6, '#143138', 1);
    line(ctx, [[enemy.x-13,enemy.y+12],[enemy.x-23,enemy.y+22+offset]], color, 5);
    line(ctx, [[enemy.x+13,enemy.y+12],[enemy.x+23,enemy.y+22-offset]], color, 5);
    line(ctx, [[enemy.x,enemy.y-13],[enemy.x,enemy.y-24]], color, 3);
    circle(ctx, enemy.x, enemy.y-25, 4, '#fff0b4');
  }
  for (const bunker of state.bunkers) {
    if (bunker.dead) continue;
    for (let cell = 0; cell < bunker.health; cell += 1) panel(ctx, bunker.x-68+cell*17, bunker.y-12, 15, 24, '#6ed9b1', 2);
  }
  for (const projectile of state.shots) panel(ctx, projectile.x-3, projectile.y-8, 6, 16,
    projectile.owner === 'playerShot' ? '#fff1a0' : '#ff897c', 2);
  ctx.save(); ctx.globalAlpha = state.grace > 0 ? .65 : 1;
  const x = state.player.x;
  polygon(ctx, [[x-35,615],[x-23,589],[x,579],[x+23,589],[x+35,615]], '#77d8d2');
  panel(ctx, x-6, 555, 12, 35, '#d3f7dc', 3);
  pilot(ctx, state, x, 558, .95, false, reducedMotion);
  ctx.restore();
  if (state.waveDelay > 0) label(ctx, `WAVE ${state.wave}`, 640, 365, 42, '#d9f690');
}

function pang(ctx, state, reducedMotion) {
  const sky = ctx.createLinearGradient(0, 120, 0, 650);
  sky.addColorStop(0, '#6bbbc9'); sky.addColorStop(1, '#e0f0d1');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  for (let building = 0; building < 7; building += 1) {
    const x = building * 195-25; const top = 275 + building % 3 * 35;
    panel(ctx, x, top, 172, 350, ['#ce9c95','#83b5ae','#d8c085'][building % 3], 5);
    polygon(ctx, [[x-8,top],[x+85,top-42],[x+180,top]], '#486b75');
    for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3; column += 1) panel(ctx,
      x+19+column*48, top+30+row*70, 27, 39, '#ddf1e6', 4);
  }
  for (let flag = 0; flag < 18; flag += 1) {
    const x = flag * 75; const height = 210 + Math.sin(flag * .35) * 20;
    polygon(ctx, [[x,height],[x+50,height+5],[x+22,height+40]], ['#ef7e83','#ffd479','#65c8b4'][flag % 3]);
  }
  line(ctx, [[0,625],[1280,625]], '#346b65', 8);
  for (let tile = 0; tile < 24; tile += 1) panel(ctx, tile*58, 630, 55, 90, tile % 2 ? '#c3dcce' : '#a6c9c0', 1);
  for (const rope of state.ropes) {
    line(ctx, [[rope.x,rope.base],[rope.x,rope.tip]], '#fff2c3', 5);
    polygon(ctx, [[rope.x-8,rope.tip+9],[rope.x,rope.tip-5],[rope.x+8,rope.tip+9]], '#214d62');
  }
  for (const bubble of state.bubbles) {
    const color = ['#b7eb93','#ffb36f','#f691b3'][bubble.tier];
    circle(ctx, bubble.x, bubble.y, bubble.radius, color);
    ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.arc(bubble.x-2, bubble.y-2, bubble.radius-5, Math.PI*1.05, Math.PI*1.6); ctx.stroke();
    ctx.strokeStyle = '#315760'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bubble.x,bubble.y,bubble.radius,0,Math.PI*2); ctx.stroke();
    label(ctx, bubble.tier === 2 ? '{ }' : bubble.tier === 1 ? '< >' : '*', bubble.x, bubble.y+7,
      bubble.radius*.6, '#36575f');
  }
  ctx.save(); ctx.globalAlpha = state.grace > 0 ? .65 : 1;
  pilot(ctx, state, state.player.x, 571, 1.08, false, reducedMotion);
  ctx.restore();
}

export function renderArcade(ctx, state, reducedMotion = false) {
  ctx.save();
  try {
    ctx.setTransform(ctx.canvas.width / VIEW.width, 0, 0, ctx.canvas.height / VIEW.height, 0, 0);
    ({ drive: driving, invaders, pang })[state.kind](ctx, state, reducedMotion);
  } finally { ctx.restore(); }
}
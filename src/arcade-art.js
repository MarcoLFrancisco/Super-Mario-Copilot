import { VIEW } from './level.js';
import { drawPartyActor } from './party-art.js';
import { drawAppIcon } from './collectibles.js';
import { INVADER_TOOLS } from './arcade.js';

let interceptor = null;
let loadingInterceptor = null;

export function loadArcadeArt(createImage = () => new Image()) {
  if (interceptor) return Promise.resolve(interceptor);
  if (loadingInterceptor) return loadingInterceptor;
  const url = new URL('../images/Interceptor.png', import.meta.url);
  url.search = new URL(import.meta.url).search;
  loadingInterceptor = new Promise((resolve, reject) => {
    const image = createImage();
    image.decoding = 'async';
    image.onload = () => {
      if (image.naturalWidth !== 1024 || image.naturalHeight !== 1024) {
        reject(new Error('The interceptor artwork does not match this release. Reload the game.'));
        return;
      }
      interceptor = image; resolve(image);
    };
    image.onerror = () => reject(new Error('Could not load images/Interceptor.png. Retry loading.'));
    image.src = url.href;
  }).catch(error => { loadingInterceptor = null; throw error; });
  return loadingInterceptor;
}

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

export function drawInterceptor(ctx, state, reducedMotion = false) {
  if (!interceptor) throw new Error('Load interceptor artwork before rendering AI Invaders.');
  const player = state.player;
  const time = reducedMotion ? 0 : state.time;
  const recoil = reducedMotion ? 0 : player.recoil * 12;
  ctx.save(); ctx.translate(player.x, player.y);
  ctx.rotate(reducedMotion ? 0 : player.bank);
  for (const side of [-1, 1]) {
    const engineX = side * 17;
    const plume = 14 + (reducedMotion ? 0 : Math.sin(time * 31 + side) * 3) + Math.min(5, Math.abs(player.vx) / 100);
    const flame = ctx.createLinearGradient(engineX, 32, engineX, 37 + plume);
    flame.addColorStop(0, '#aefaff'); flame.addColorStop(.35, '#1aabff'); flame.addColorStop(1, '#047dff00');
    polygon(ctx, [[engineX-5,32],[engineX+5,32],[engineX+3,43],[engineX,37+plume],[engineX-3,43]], flame);
    line(ctx, [[engineX,33],[engineX,43]], '#d7ffff', 2);
  }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(interceptor, -56, -59 + recoil, 112, 112);
  if (player.recoil > 0) {
    for (const side of [-1, 1]) line(ctx, [[side * 13,-29 + recoil],[side * 13,-36 + recoil]], '#affaff', 2);
  }
  const protectedShip = state.grace > 0 || state.abilities?.shield.active > 0;
  ctx.beginPath(); ctx.ellipse(0, 0, 29, 30, 0, 0, Math.PI * 2);
  ctx.strokeStyle = protectedShip ? '#94f6ff' : '#5bdaed44'; ctx.lineWidth = protectedShip ? 2 : 1; ctx.stroke();
  if (protectedShip) {
    const ripple = reducedMotion ? 0 : Math.sin(time * 8) * 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 34 + ripple, 36 + ripple, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#8af2ff55'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}

function orbitalNetwork(ctx, state, reducedMotion) {
  const time = reducedMotion ? 0 : state.time;
  const sky = ctx.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, '#070d13'); sky.addColorStop(.62, '#102122'); sky.addColorStop(1, '#163432');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  for (let layer = 0; layer < 3; layer += 1) {
    for (let star = 0; star < 62; star += 1) {
      const horizontal = (star * 167 + layer * 331) % 1280;
      const vertical = 156 + (star * 79 + layer * 53 + time * (layer + 1) * .9) % 485;
      panel(ctx, horizontal, vertical, layer === 2 && star % 13 === 0 ? 2.8 : 1.2, layer === 2 ? 1.8 : 1,
        ['#c4e8ef40', '#91bcb270', '#edf6f0bb'][layer], 0);
    }
  }
  const planet = ctx.createRadialGradient(1091, 202, 12, 1138, 288, 146);
  planet.addColorStop(0, '#637570'); planet.addColorStop(.45, '#304840'); planet.addColorStop(1, '#111e23');
  circle(ctx, 1122, 290, 132, planet);
  ctx.save(); ctx.beginPath(); ctx.arc(1122, 290, 132, 0, Math.PI * 2); ctx.clip();
  for (let band = 0; band < 8; band += 1) {
    ctx.beginPath(); ctx.ellipse(1123, 199 + band * 31, 150, 29, -.18, 0, Math.PI * 2);
    ctx.strokeStyle = band % 2 ? '#b5ba9330' : '#759c9620'; ctx.lineWidth = 9; ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(1122, 290, 135, Math.PI * .85, Math.PI * 1.7);
  ctx.strokeStyle = '#94d8c04d'; ctx.lineWidth = 3; ctx.stroke();
  circle(ctx, 174, 261, 37, '#685d5144');
  ctx.beginPath(); ctx.arc(174, 261, 37, Math.PI, Math.PI * 1.55);
  ctx.strokeStyle = '#d1b88855'; ctx.lineWidth = 2; ctx.stroke();

  ctx.save(); ctx.globalAlpha = .46;
  ctx.translate(630 + Math.sin(time * .08) * 4, 420);
  ctx.beginPath(); ctx.ellipse(0, 0, 192, 41, -.14, 0, Math.PI * 2);
  ctx.strokeStyle = '#536f78'; ctx.lineWidth = 17; ctx.stroke();
  ctx.strokeStyle = '#7ac9d4'; ctx.lineWidth = 2; ctx.stroke();
  for (const side of [-1, 1]) {
    line(ctx, [[side*38,0],[side*218,17],[side*331,47]], '#6b828b', 8);
    polygon(ctx, [[side*200,-6],[side*346,13],[side*368,70],[side*205,47]], '#294a5b');
    for (let panelIndex = 0; panelIndex < 5; panelIndex += 1) {
      const horizontal = side * (212 + panelIndex * 28);
      line(ctx, [[horizontal,-1 + panelIndex*4],[horizontal + side*12,50 + panelIndex*3]], '#8bc2d65a', 2);
    }
    polygon(ctx, [[side*68,-10],[side*113,-86],[side*136,-79],[side*97,1]], '#78979f');
    line(ctx, [[side*105,-77],[side*115,-57]], '#99e7eb', 3);
  }
  polygon(ctx, [[-65,-16],[-36,-56],[30,-56],[68,-16],[43,41],[-40,41]], '#7899a4');
  polygon(ctx, [[-43,-17],[-23,-38],[26,-38],[46,-12],[28,22],[-26,22]], '#163749');
  polygon(ctx, [[-22,9],[-3,-27],[11,-27],[0,1],[20,1],[26,12]], '#66c3ed');
  for (const position of [-155, -117, 119, 155]) panel(ctx, position, 4, 12, 4, '#a7dbcf', 1);
  ctx.restore();
  for (let stream = 0; stream < 5; stream += 1) {
    const horizontal = stream * 283 - 50;
    const path = [[horizontal,720],[horizontal+70,556],[horizontal+192,482],[631,422]];
    line(ctx, path, '#74b7ad16', 1.5);
    const progress = (time * .025 + stream * .2) % 1;
    const packetX = horizontal + 70 + progress * 122;
    const packetY = 556 - progress * 74;
    panel(ctx, packetX, packetY, 5, 2, '#75dbcb55', 0);
  }
  line(ctx, [[0,648],[1280,648]], '#63877f66', 1);
  for (let mark = 0; mark < 32; mark += 1) line(ctx, [[mark*40,651],[mark*40+13,651]], '#aac5ae44', 2);
}

function rogueBot(ctx, enemy, time, reducedMotion) {
  const idle = reducedMotion ? 0 : Math.sin(time * 3.8 + enemy.serial) * 2;
  ctx.save(); ctx.translate(enemy.x, enemy.y);
  const lit = enemy.hitFlash > 0 ? '#f7fbff' : '#b7d9cf';
  if (enemy.kind === 'interceptor') {
    const tilt = enemy.mode === 'diving' || enemy.mode === 'flanking' ? Math.sin(enemy.maneuver.elapsed * 3) * .16 : 0;
    ctx.rotate(reducedMotion ? 0 : tilt);
    polygon(ctx, [[0,-19],[-8,-2],[-25,6],[-20,13],[-7,10],[0,20],[7,10],[20,13],[25,6],[8,-2]], lit);
    polygon(ctx, [[0,-11],[-6,5],[0,13],[6,5]], '#243448');
    line(ctx, [[-18,7],[-10,4]], '#ffb374', 3); line(ctx, [[18,7],[10,4]], '#ffb374', 3);
    line(ctx, [[-6,-8],[-11,-18-idle]], '#73c8df', 2); line(ctx, [[6,-8],[11,-18-idle]], '#73c8df', 2);
  } else if (enemy.kind === 'armored') {
    polygon(ctx, [[-15,-23],[15,-23],[29,-8],[29,10],[14,23],[-14,23],[-29,10],[-29,-8]], '#91adb4');
    polygon(ctx, [[-12,-16],[12,-16],[20,-5],[20,8],[10,16],[-10,16],[-20,8],[-20,-5]], '#263a49');
    panel(ctx, -12, -6, 24, 12, enemy.hitFlash > 0 ? '#ffffff' : '#e9c482', 2);
    for (let plate = 0; plate < enemy.health; plate += 1) panel(ctx, -12 + plate * 9, 19, 6, 4, '#daf2f0', 1);
    line(ctx, [[-28,-9],[-34,3],[-29,14]], '#517887', 5);
    line(ctx, [[28,-9],[34,3],[29,14]], '#517887', 5);
    if (enemy.shielded || enemy.shieldCycle > 3.2) {
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 32, 0, 0, Math.PI * 2);
      ctx.setLineDash(enemy.shielded ? [] : [5, 5]);
      ctx.strokeStyle = enemy.shielded ? '#83ddff' : '#83ddff66'; ctx.lineWidth = 2; ctx.stroke();
    }
  } else if (enemy.kind === 'command') {
    for (const side of [-1, 1]) {
      line(ctx, [[side*13,0],[side*30,5],[side*39,15+idle]], '#739cac', 5);
      panel(ctx, side*30-8, -11, 16, 29, '#8cabb8', 4);
      panel(ctx, side*30-4, -7, 8, 9, '#f7cb7e', 2);
    }
    polygon(ctx, [[-22,-19],[0,-29],[22,-19],[25,12],[0,24],[-25,12]], '#dae3e1');
    panel(ctx, -15, -10, 30, 20, '#18313b', 4);
    for (const eye of [-8, 0, 8]) circle(ctx, eye, 0, 2, '#ffbca0');
    line(ctx, [[-12,-21],[0,-37],[12,-21]], '#ffcb86', 3);
  } else {
    panel(ctx, -18, -13, 36, 26, lit, 5);
    panel(ctx, -12, -7, 24, 11, '#153139', 3);
    panel(ctx, -8, -4, 5, 4, '#82f2d4', 1); panel(ctx, 3, -4, 5, 4, '#82f2d4', 1);
    line(ctx, [[-12,11],[-20,18+idle]], '#7ebcac', 4);
    line(ctx, [[12,11],[20,18-idle]], '#7ebcac', 4);
    line(ctx, [[0,-13],[0,-24]], '#9bd8d2', 2); circle(ctx, 0, -25, 3, '#f4d39a');
  }
  ctx.restore();
  if (enemy.fireWarning > 0) {
    ctx.save(); ctx.setLineDash([5, 8]);
    line(ctx, [[enemy.x,enemy.y + 25],[enemy.x + (enemy.aimX - enemy.x) * .25,610]], '#ffb48942', 1.5);
    ctx.setLineDash([]); ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.w / 2 + 9, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffb875'; ctx.lineWidth = 2; ctx.stroke();
    polygon(ctx, [[enemy.x-5,enemy.y+29],[enemy.x+5,enemy.y+29],[enemy.x,enemy.y+37]], '#ffd095');
    ctx.restore();
  }
  if (enemy.mode === 'diveWarning' || enemy.mode === 'flankWarning') {
    ctx.save(); ctx.setLineDash([7, 8]); ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y + 22);
    ctx.quadraticCurveTo(enemy.maneuver.targetX, 575, enemy.homeX, enemy.homeY);
    ctx.strokeStyle = '#ffbf7466'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    polygon(ctx, [[enemy.maneuver.targetX-11,566],[enemy.maneuver.targetX,578],[enemy.maneuver.targetX+11,566]], '#ffd394');
    ctx.restore();
  }
}

function defenseNode(ctx, node, index) {
  ctx.save(); ctx.translate(node.x, node.y);
  if (node.dead) {
    for (const side of [-1, 1]) polygon(ctx, [[side*60,12],[side*48,-3],[side*23,10]], '#40575a');
    line(ctx, [[-66,15],[66,15]], '#71847e', 2); ctx.restore(); return;
  }
  polygon(ctx, [[-74,10],[-64,-16],[-25,-16],[-17,-23],[17,-23],[25,-16],[64,-16],[74,10],[53,18],[-53,18]],
    node.hitFlash > 0 ? '#e4eaf0' : '#506c76');
  panel(ctx, -61, -10, 122, 18, '#132a35', 3);
  for (let cell = 0; cell < node.maxHealth; cell += 1) {
    panel(ctx, -57+cell*14.5, -6, 11, 10, cell < node.health ? '#67dcb9' : '#3e525b', 1);
    if (cell >= node.health) line(ctx, [[-57+cell*14.5,-5],[-49+cell*14.5,3]], '#c6a277', 1);
  }
  line(ctx, [[-60,-17],[-26,-17]], '#b8d1db', 2); line(ctx, [[26,-17],[60,-17]], '#b8d1db', 2);
  circle(ctx, -4, -21, 4, '#d9f8ff'); circle(ctx, 3, -25, 5, '#d9f8ff'); circle(ctx, 9, -21, 4, '#d9f8ff');
  label(ctx, `N0${index+1}`, 0, 32, 10, '#a9c8bd');
  ctx.restore();
}

function orchestrationCore(ctx, state, reducedMotion) {
  const core = state.core;
  if (!core || core.dead) return;
  const exposed = core.mode === 'exposed';
  if (core.attack === 'sweep' && ['warning', 'attack'].includes(core.mode)) {
    const left = Math.min(core.sweepFrom, core.sweepTo) - 25;
    const width = Math.abs(core.sweepFrom - core.sweepTo) + 50;
    panel(ctx, left, 291, width, 333, '#ed986818', 0);
    line(ctx, [[left,618],[left+width,618]], '#eeab7877', 2);
    for (let marker = left+16; marker < left+width; marker += 38) line(ctx, [[marker,612],[marker+9,619]], '#f6ba8788', 2);
  }
  if (state.beam) {
    const beam = state.beam;
    line(ctx, [[core.x,core.y+48],[beam.x,beam.y-beam.h/2]], '#ffac7355', 8);
    panel(ctx, beam.x-21, beam.y-beam.h/2, 42, beam.h, '#ff754b22', 0);
    line(ctx, [[beam.x,beam.y-beam.h/2],[beam.x,beam.y+beam.h/2]], '#ff866bbb', 12);
    line(ctx, [[beam.x,beam.y-beam.h/2],[beam.x,beam.y+beam.h/2]], '#fff0bf', 3);
  }
  ctx.save(); ctx.translate(core.x, core.y);
  const angle = reducedMotion ? 0 : state.time * .13;
  ctx.save(); ctx.rotate(angle);
  for (let plate = 0; plate < 6; plate += 1) {
    ctx.save(); ctx.rotate(plate*Math.PI/3);
    polygon(ctx, [[-22,-78],[22,-78],[29,-62],[0,-51],[-29,-62]], '#455b66');
    line(ctx, [[-17,-72],[17,-72]], exposed ? '#a1ffe0' : '#d4a276', 3); ctx.restore();
  }
  ctx.restore();
  polygon(ctx, [[-65,-48],[-28,-62],[28,-62],[65,-48],[80,0],[58,46],[0,57],[-58,46],[-80,0]], core.hitFlash > 0 ? '#ffffff' : '#d1dedf');
  polygon(ctx, [[-57,-35],[-24,-48],[24,-48],[57,-35],[65,0],[47,32],[0,42],[-47,32],[-65,0]], '#18353d');
  const gap = exposed ? 15 : 0;
  polygon(ctx, [[-52-gap,-32],[-9-gap,-27],[-9-gap,27],[-47-gap,22],[-58-gap,0]], '#688d98');
  polygon(ctx, [[52+gap,-32],[9+gap,-27],[9+gap,27],[47+gap,22],[58+gap,0]], '#688d98');
  panel(ctx, -20, -24, 40, 47, exposed ? '#8ffff0' : '#faad75', 6);
  panel(ctx, -12, -16, 24, 30, exposed ? '#e4fff7' : '#692c2e', 3);
  for (const side of [-1, 1]) {
    line(ctx, [[side*38,-36],[side*73,-62],[side*91,-57]], '#7797a2', 4);
    circle(ctx, side*91, -57, 4, '#ffc385');
  }
  if (core.mode === 'warning') {
    ctx.beginPath(); ctx.arc(0, 0, 88, 0, Math.PI*2); ctx.strokeStyle = '#f9bd87'; ctx.lineWidth = 2; ctx.stroke();
  }
  label(ctx, exposed ? 'CORE OPEN' : core.mode === 'warning' ? 'CHARGING' : 'SHIELDED', 0, 104, 12, exposed ? '#aaffe0' : '#eac098');
  ctx.restore();
}

function combatEffects(ctx, state, reducedMotion) {
  for (const effect of state.effects) {
    const progress = 1 - effect.life / (effect.kind === 'pulse' ? .55 : .38);
    ctx.save(); ctx.globalAlpha = Math.min(.9, effect.life * 3);
    if (effect.kind === 'chain') line(ctx, [[effect.x,effect.y],[effect.x+(effect.targetX-effect.x)*.45,effect.y-9],
      [effect.targetX,effect.targetY]], '#f7d38c', 2);
    else if (effect.kind === 'shield' || effect.kind === 'pulse' || effect.kind === 'repair') {
      const radius = effect.kind === 'pulse' ? reducedMotion ? 44 : effect.radius * progress
        : 12 + (reducedMotion ? 6 : progress * 28);
      ctx.beginPath(); ctx.arc(effect.x, effect.y, Math.max(2, radius), 0, Math.PI*2);
      ctx.strokeStyle = effect.kind === 'repair' ? '#99ffd0' : '#9beaff'; ctx.lineWidth = 2; ctx.stroke();
    } else if (reducedMotion || effect.kind === 'hit') {
      line(ctx, [[effect.x-5,effect.y],[effect.x+5,effect.y]], '#ffedbd', 2);
      line(ctx, [[effect.x,effect.y-5],[effect.x,effect.y+5]], '#ffedbd', 2);
    } else {
      for (let particle = 0; particle < 8; particle += 1) {
        const angle = particle * Math.PI/4 + effect.serial * .3;
        const radius = 6 + progress * (effect.large ? 65 : 28);
        const horizontal = effect.x + Math.cos(angle) * radius;
        const vertical = effect.y + Math.sin(angle) * radius;
        line(ctx, [[horizontal,vertical],[horizontal+Math.cos(angle)*4,vertical+Math.sin(angle)*4]], particle % 2 ? '#c8f6e9' : '#ffd08a', 2);
      }
    }
    ctx.restore();
  }
}

function invaders(ctx, state, reducedMotion) {
  orbitalNetwork(ctx, state, reducedMotion);
  orchestrationCore(ctx, state, reducedMotion);
  for (const enemy of state.invaders) {
    if (enemy.dead) continue;
    rogueBot(ctx, enemy, state.time, reducedMotion);
  }
  state.bunkers.forEach((node, index) => defenseNode(ctx, node, index));
  for (const pickup of state.pickups) {
    const tool = INVADER_TOOLS[pickup.kind];
    const color = tool?.color ?? '#b0f6ca';
    ctx.save(); ctx.translate(pickup.x, pickup.y);
    polygon(ctx, [[0,-17],[17,-7],[17,7],[0,17],[-17,7],[-17,-7]], '#17323c');
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    if (pickup.kind === 'wingman') drawAppIcon(ctx, 'copilot', 0, 0, 22);
    else label(ctx, { shield: 'S', chain: 'C', pulse: 'P', repair: '+' }[pickup.kind], 0, 5, 17, color);
    label(ctx, pickup.kind === 'repair' ? 'REPAIR' : { shield: 'AZURE', wingman: 'COPILOT', chain: 'AUTOMATE', pulse: 'DEFENDER' }[pickup.kind], 0, -24, 9, color);
    ctx.restore();
  }
  for (const projectile of state.shots) {
    if (projectile.dead) continue;
    const friendly = projectile.owner === 'playerShot';
    const direction = friendly ? 1 : -1;
    line(ctx, [[projectile.x,projectile.y+direction*17],[projectile.x,projectile.y]], friendly ? '#69f4e477' : '#ff906f66', 4);
    if (friendly) line(ctx, [[projectile.x,projectile.y-8],[projectile.x,projectile.y+7]], '#d0fff4', 2.5);
    else polygon(ctx, [[projectile.x,projectile.y+8],[projectile.x-5,projectile.y],[projectile.x,projectile.y-8],[projectile.x+5,projectile.y]], '#ff9b7c');
  }
  if (state.abilities.wingman.active > 0) {
    const horizontal = Math.min(1245, state.player.x+43);
    const vertical = 555 + (reducedMotion ? 0 : Math.sin(state.time*5)*2);
    polygon(ctx, [[horizontal-15,vertical+6],[horizontal,vertical-13],[horizontal+15,vertical+6]], '#b5e4ce');
    panel(ctx, horizontal-6, vertical-3, 12, 5, '#2d6a72', 2);
    line(ctx, [[horizontal-5,vertical+8],[horizontal,vertical+17],[horizontal+5,vertical+8]], '#82dfff', 2);
  }
  drawInterceptor(ctx, state, reducedMotion);
  combatEffects(ctx, state, reducedMotion);
  if (state.waveDelay > 0) label(ctx, state.wave === 4 ? 'ROGUE ORCHESTRATION CORE' : `SECTOR ${state.wave}`, 640, 350, 26, '#ddf2dc');
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
    drawAppIcon(ctx, 'copilot', bubble.x, bubble.y, bubble.radius * 1.55);
  }
  ctx.save(); ctx.globalAlpha = state.grace > 0 ? .65 : 1;
  pilot(ctx, state, state.player.x, 571, 1.08, false, reducedMotion);
  ctx.restore();
}

export function renderArcade(ctx, state, reducedMotion = false) {
  ctx.save();
  try {
    ctx.setTransform(ctx.canvas.width / VIEW.width, 0, 0, ctx.canvas.height / VIEW.height, 0, 0);
    ({ invaders, pang })[state.kind](ctx, state, reducedMotion);
  } finally { ctx.restore(); }
}
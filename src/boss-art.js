import { ARENA } from './encounters.js';

// Arena coordinates; caller sets canvas scale. Background goes before solid
// platforms; telegraphs and boss go afterward, before player/projectiles.
// Crown, claws and ribbons are decorative. Corner brackets mark the unchanged
// rectangular collision envelope around the sculpted reactor.
function rect(c, x, y, w, h, color) {
  c.fillStyle = color; c.fillRect(x, y, w, h);
}
function line(c, points, color, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function ellipse(c, x, y, rx, ry, color, fill = true) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { c.fillStyle = color; c.fill(); }
  else { c.strokeStyle = color; c.lineWidth = 2; c.stroke(); }
}
function label(c, value, x, y, size = 14, color = '#e7faff') {
  c.font = `bold ${size}px 'Segoe UI', sans-serif`;
  c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#101729';
  c.strokeText(value, x, y); c.fillStyle = color; c.fillText(value, x, y);
}

export function drawArena(c, time = 0, reducedMotion = false) {
  const t = reducedMotion ? 0 : time;
  c.save();
  const sky = c.createLinearGradient(0, 0, 0, ARENA.height);
  sky.addColorStop(0, '#080d22'); sky.addColorStop(1, '#302653');
  rect(c, 0, 0, ARENA.width, ARENA.height, sky);
  for (let i = 0; i < 11; i++) {
    const x = 20 + i * 119;
    rect(c, x, 155, 92, 440, '#101c34');
    rect(c, x + 3, 158, 86, 3, '#698cb655');
    for (let row = 0; row < 13; row++) {
      const y = 171 + row * 31;
      rect(c, x + 8, y, 76, 24, '#1c2b46');
      rect(c, x + 14, y + 7, 38, 2, '#567292');
      rect(c, x + 14, y + 13, 27, 2, '#334968');
      ellipse(c, x + 70, y + 11, 2, 2, (row + i) % 3 ? '#69dbc0' : '#d393e2');
    }
  }
  for (let i = 0; i < 7; i++) {
    const x = 70 + i * 185;
    line(c, [[x, 0], [x, 90], [x + 35, 120], [x + 35, 150]], '#5a78a455', 3);
    const y = reducedMotion ? 60 : (t * 24 + i * 23) % 85;
    rect(c, x - 2, y, 4, 10, '#8deaff99');
  }
  rect(c, 310, 37, 660, 61, '#111d39');
  label(c, 'THE HALLUCINATION ENGINE', 640, 63, 23);
  label(c, 'VERIFY OUTPUT • PATCH THE CORE', 640, 85, 12, '#8de9e4');
  const floor = c.createLinearGradient(0, 595, 0, ARENA.height);
  floor.addColorStop(0, '#253959'); floor.addColorStop(1, '#0b162d');
  rect(c, 0, 595, ARENA.width, ARENA.height - 595, floor);
  for (let x = -400; x < 1700; x += 100) line(c, [[640 + (x - 640) * .5, 595], [x, 720]], '#77d8ff22');
  for (const y of [610, 635, 670, 715]) line(c, [[0, y], [1280, y]], '#77d8ff22');
  c.restore();
}

export function drawBossWarnings(c, boss) {
  if (boss.defeated) return;
  c.save();
  for (const zone of boss.zones) {
    if (!zone.active && boss.mode !== 'warning') continue;
    rect(c, zone.x, zone.y, zone.w, zone.h, zone.active ? '#ff668866' : '#ffce6622');
    line(c, [[zone.x, zone.y], [zone.x, zone.y + zone.h]], '#ffd385', 3);
    line(c, [[zone.x + zone.w, zone.y], [zone.x + zone.w, zone.y + zone.h]], '#ffd385', 3);
    for (let y = 20; y < zone.h; y += 42) {
      line(c, [[zone.x + 8, y], [zone.x + 25, y + 17]], '#ffcf8e88', 3);
    }
    label(c, zone.active ? 'DANGER' : 'MOVE!', zone.x + zone.w / 2, 135, 13, '#ffe1a7');
  }
  if (boss.mode === 'warning') {
    const tips = { tokens: 'PROJECTILE BURST INCOMING', agents: 'MARKED COLUMN ACTIVATING', waves: 'FLOOR WAVES INCOMING' };
    const attack = (boss.arena ?? ARENA).phases[boss.phase].attack;
    rect(c, 240, 106, 800, 35, '#35223eee');
    label(c, tips[attack], 640, 129, 16, '#ffdb95');
  } else if (boss.mode === 'exposed') {
    label(c, boss.objectivesLocked ? 'CONTROL SYSTEMS STILL LOCKED' : 'CORE EXPOSED', 640, 128, 16, '#98ffe1');
  }
  c.restore();
}

function drawDialogueBubble(c, boss) {
  const caption = boss.dialogue.current;
  if (!caption) return;
  c.save();
  c.font = "bold 17px 'Segoe UI', sans-serif";
  const rows = [];
  let row = '';
  for (const word of caption.text.split(' ')) {
    const candidate = row ? `${row} ${word}` : word;
    if (row && c.measureText(candidate).width > 330) {
      rows.push(row); row = word;
    } else row = candidate;
  }
  if (row) rows.push(row);
  const width = 366, height = 39 + rows.length * 23;
  const x = Math.max(16, Math.min(ARENA.width - width - 16, boss.x + boss.w / 2 - width / 2));
  const y = Math.max(151, boss.y - height - 40);
  const anchor = Math.max(x + 22, Math.min(x + width - 22, boss.x + boss.w / 2));
  c.shadowColor = '#00000066'; c.shadowBlur = 12;
  rect(c, x, y, width, height, '#eff8ff');
  c.shadowBlur = 0;
  c.strokeStyle = '#8be6ec'; c.lineWidth = 2; c.strokeRect(x, y, width, height);
  c.beginPath(); c.moveTo(anchor - 9, y + height);
  c.lineTo(anchor, y + height + 14); c.lineTo(anchor + 9, y + height);
  c.closePath(); c.fillStyle = '#eff8ff'; c.fill();
  c.textAlign = 'left'; c.fillStyle = '#476687';
  c.font = "bold 10px 'Segoe UI', sans-serif";
  c.fillText('HALLUCINATION ENGINE', x + 17, y + 18);
  c.font = "bold 17px 'Segoe UI', sans-serif"; c.fillStyle = '#172940';
  rows.forEach((text, i) => c.fillText(text, x + 17, y + 42 + i * 23));
  c.restore();
}

export function drawBoss(c, boss, reducedMotion = false) {
  const t = reducedMotion ? 0 : boss.age;
  const exposed = boss.mode === 'exposed';
  const dissolve = boss.defeated
    ? (reducedMotion ? 1 : Math.min(1, (boss.defeatTime || 0) / 1.8)) : 0;
  const color = boss.defeated ? '#89ffd7' : exposed ? '#90ffe6' : ['#b6a1ff', '#ffaccb', '#ffba87'][boss.phase];
  c.save(); c.translate(boss.x + boss.w / 2, boss.y + boss.h / 2);
  const glow = c.createRadialGradient(0, 0, 20, 0, 0, 170);
  glow.addColorStop(0, color + '55'); glow.addColorStop(1, color + '00');
  rect(c, -170, -170, 340, 340, glow);
  c.lineCap = 'round'; c.lineJoin = 'round';
  // Bounded procedural effects: no image assets or growing particle arrays.
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    const sway = Math.sin(t * 1.6 + i) * 15;
    c.beginPath(); c.moveTo(side * 38, 38);
    c.bezierCurveTo(side * (115 + sway), 70, side * 12, 102,
      side * (75 + sway), 125 + (i % 2) * 12);
    c.strokeStyle = ['#64e8ff66', '#c896ff66', '#ff9bd866', '#87ffe366'][i];
    c.lineWidth = 5 - i * .6; c.stroke();
  }
  for (let ring = 0; ring < 2; ring++) {
    c.save(); c.rotate((ring ? -.5 : .5) + t * .13);
    ellipse(c, 0, 0, 112, 45 + ring * 18, color + '66', false);
    ellipse(c, 112, 0, 3, 3, '#ecfaff'); c.restore();
  }
  const metal = c.createLinearGradient(-65, -80, 65, 80);
  metal.addColorStop(0, '#d1e6fb'); metal.addColorStop(.24, '#526b91');
  metal.addColorStop(.55, '#15253f'); metal.addColorStop(.82, '#738bab');
  metal.addColorStop(1, '#203451');
  c.save(); c.globalAlpha *= 1 - dissolve * .8;
  for (const side of [-1, 1]) {
    const windup = boss.mode === 'warning' ? boss.windup : 0;
    const strike = reducedMotion ? (boss.mode === 'attack' ? 8 : 0) : boss.attackPulse * 55;
    const elbow = 18 + Math.sin(t * 1.8) * 7 - windup * 48 + strike;
    c.save(); c.translate(side * dissolve * 30, dissolve * 15); c.scale(side, 1);
    line(c, [[49, -14], [96, elbow], [91, 81 - windup * 18]], '#0a1429', 17);
    line(c, [[49, -14], [96, elbow], [91, 81 - windup * 18]], '#657b9e', 10);
    line(c, [[51, -17], [94, elbow - 3]], color, 2);
    ellipse(c, 96, elbow, 10, 10, metal);
    ellipse(c, 96, elbow, 4, 4, color);
    c.translate(91, 81 - windup * 18);
    ellipse(c, 0, 0, 11, 13, metal);
    for (let finger = -1; finger <= 1; finger++) {
      c.beginPath(); c.moveTo(finger * 7, 5);
      c.quadraticCurveTo(finger * 18, 26, finger * 8 - 3, 34);
      c.strokeStyle = '#c8d9ed'; c.lineWidth = 4; c.stroke();
      ellipse(c, finger * 8 - 3, 34, 2, 2, color);
    }
    c.restore();
  }
  for (let i = -2; i <= 2; i++) {
    c.save(); c.translate(i * 23, -67 - (2 - Math.abs(i)) * 8 - dissolve * 46);
    c.rotate(i * .22 + (reducedMotion ? 0 : Math.sin(t + i) * .035));
    c.beginPath(); c.moveTo(-9, 7); c.quadraticCurveTo(-13, -8, -5, -24);
    c.lineTo(0, -37); c.lineTo(9, -12); c.quadraticCurveTo(13, 0, 9, 7);
    c.closePath(); c.fillStyle = metal; c.fill();
    c.strokeStyle = color; c.lineWidth = 1.5; c.stroke();
    line(c, [[0, -25], [0, -3]], '#e0fbff', 2); c.restore();
  }
  c.restore();
  const reactor = c.createRadialGradient(-20, -27, 3, 0, 0, 73);
  reactor.addColorStop(0, '#f0ffff'); reactor.addColorStop(.22, color);
  reactor.addColorStop(.55, exposed || boss.defeated ? '#287d88' : '#343c77');
  reactor.addColorStop(1, '#09172d');
  ellipse(c, 0, 0, 68, 73, reactor);
  ellipse(c, 0, 0, 68, 73, color, false);
  c.save(); c.globalAlpha *= .35;
  ellipse(c, -18, -34, 29, 12, '#ffffff'); c.restore();
  // Armor opens during vulnerability and separates when the core is patched.
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1);
    c.translate((exposed ? 9 : 0) + dissolve * 32, dissolve * 22);
    c.globalAlpha *= 1 - dissolve * .9;
    c.beginPath(); c.moveTo(12, -69);
    c.bezierCurveTo(72, -87, 87, -24, 65, 40);
    c.quadraticCurveTo(51, 75, 20, 79);
    c.lineTo(34, 46); c.bezierCurveTo(58, 4, 48, -40, 12, -69);
    c.closePath(); c.fillStyle = metal; c.fill();
    c.strokeStyle = color; c.lineWidth = 1.5; c.stroke();
    c.beginPath(); c.moveTo(33, -55); c.bezierCurveTo(69, -39, 71, 6, 48, 44);
    c.strokeStyle = '#d7efff99'; c.lineWidth = 2; c.stroke();
    for (let i = 0; i < 3; i++) line(c, [[53, i * 9], [63, i * 9 - 5]], color, 2);
    c.restore();
  }
  ellipse(c, 0, -15, 49, 37, '#09162cdd');
  if (!boss.defeated) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const x = sx * boss.w / 2, y = sy * boss.h / 2;
    line(c, [[x - sx * 11, y], [x, y], [x, y - sy * 11]],
      exposed ? '#a8ffe9' : '#91a7c477', exposed ? 2 : 1);
  }
  if (boss.defeated && !reducedMotion) {
    c.save(); c.globalAlpha *= 1 - dissolve;
    ellipse(c, 0, 0, 72 + dissolve * 105, 76 + dissolve * 105, '#b5fff0', false);
    for (let i = 0; i < 18; i++) {
      const angle = i * Math.PI * 2 / 18;
      const radius = 72 + dissolve * (65 + i % 3 * 17);
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      line(c, [[x, y], [x + Math.cos(angle) * 9, y + Math.sin(angle) * 9]], color, 2);
    }
    c.restore();
  }
  const caption = boss.dialogue.current;
  const mood = boss.defeated ? 'defeated' : boss.recoil > 0 ? 'hurt'
    : exposed ? 'worried' : boss.mode === 'warning' || boss.phase === 2 ? 'angry'
    : caption?.mood ?? 'smug';
  const blinking = !reducedMotion && !boss.defeated && boss.age % 4.7 > 4.55;
  const eyeHeight = blinking ? 1.5 : mood === 'worried' ? 11 : 8;
  for (const side of [-1, 1]) {
    const x = side * 25;
    if (boss.defeated) {
      line(c, [[x - 9, -17], [x - 2, -10], [x + 10, -24]], color, 3);
    } else if (mood === 'hurt') {
      line(c, [[x - 7, -23], [x + 7, -11]], '#ffd4df', 3);
      line(c, [[x + 7, -23], [x - 7, -11]], '#ffd4df', 3);
    } else {
      ellipse(c, x, -18, 12, eyeHeight, '#d4f7ff');
      if (!blinking) {
        ellipse(c, x + boss.lookX * 5, -18 + boss.lookY * 3, 4, 5, '#253b64');
        ellipse(c, x + boss.lookX * 5 + 1, -20 + boss.lookY * 3, 1, 1, '#ffffff');
      }
    }
    const tilt = mood === 'angry' ? -side * 6 : mood === 'worried' ? side * 5 : -side * 2;
    line(c, [[x - 11, -35 + tilt], [x + 11, -35 - tilt]], color, 3);
  }
  const talking = Boolean(caption) && !boss.defeated;
  if (talking) {
    // Caption-driven mouth movement does not claim phoneme synchronization.
    for (let i = 0; i < 7; i++) {
      const h = reducedMotion ? 5 : 3 + Math.abs(Math.sin(t * 14 + i * 1.7)) * 10;
      rect(c, -23 + i * 7, 8 - h / 2, 4, h, color);
    }
  } else if (mood === 'worried') {
    ellipse(c, 0, 8, 8, 6, color, false);
  } else {
    line(c, [[-22, 3], [-12, boss.defeated ? 13 : 8], [12, 8], [22, 2]], color, 3);
  }
  label(c, boss.defeated ? 'VERIFIED' : exposed ? 'PATCH NOW' : 'SHIELDED', 0, 54, 12, color);
  if (!exposed && !boss.defeated) {
    c.save();
    c.beginPath(); c.ellipse(0, 0, 66, 71, 0, 0, Math.PI * 2); c.clip();
    for (let y = -70; y < 75; y += 16) {
      for (let x = -80; x < 80; x += 24) {
        const offset = (Math.floor(y / 16) % 2) * 12;
        line(c, [[x + offset, y], [x + offset + 6, y - 4],
          [x + offset + 18, y - 4], [x + offset + 24, y]], '#b6cdff26');
      }
    }
    c.restore();
  }
  if (!boss.dialogue.current) {
    for (const [i, message] of ['FACT? NULL', 'TRUST: 0%', 'RETRY...'].entries()) {
      const x = -185 + i * 92, y = -160 + (i % 2) * 24;
      rect(c, x, y, 86, 29, '#24314be8');
      line(c, [[x, y], [x + 86, y]], color, 2);
      label(c, message, x + 43, y + 19, 10, color);
    }
  }
  c.restore();
  // Draw in arena coordinates so bubbles stay inside the viewport and below
  // the attack-guidance banner, without altering the core's collision shape.
  drawDialogueBubble(c, boss);
}

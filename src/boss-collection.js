import { WIZARD_RIG } from '../images/Boss1-rig.js';
import { BOSS_COLLECTION } from '../images/Boss-collection.js';
import { drawRobotLayers, wizardMatrices } from './wizard-rig.js';

export const BOSS_DESIGNS = Object.freeze(Object.fromEntries(Object.entries(BOSS_COLLECTION.designs)
  .map(([key, value]) => [key, Object.freeze(value)])));
const textures = new Map();
let loading = null;
const silhouettes = Object.freeze({
  merge: { torso: 1.06, head: .94, leftArm: 1.13, rightArm: .94, spread: .06 },
  scope: { torso: 1.15, head: .9, leftArm: 1.02, rightArm: 1.02, spread: .17 },
  foundry: { torso: 1.08, head: .93, leftArm: 1.16, rightArm: 1.16, spread: .05 },
  planner: { torso: .92, head: 1.04, leftArm: .93, rightArm: .93, spread: .2 },
  meeting: { torso: 1.04, head: 1.06, leftArm: 1.07, rightArm: 1.07, spread: .12 },
  monolith: { torso: .98, head: .92, leftArm: 1.05, rightArm: 1.05, spread: .025 },
  firewall: { torso: 1.1, head: .95, leftArm: 1.1, rightArm: 1.1, spread: .16 },
  orchestrator: { torso: 1.02, head: .94, leftArm: 1.13, rightArm: 1.13, spread: .2 }
});
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function loadBossCollection(createImage = () => new Image()) {
  if (textures.size === Object.keys(BOSS_DESIGNS).length) return Promise.resolve(textures);
  if (loading) return loading;
  loading = Promise.all(Object.entries(BOSS_DESIGNS).map(([key, design]) => new Promise((resolve, reject) => {
    if (textures.has(key)) { resolve(); return; }
    const image = createImage(key);
    const url = new URL(`../images/${design.file}`, import.meta.url);
    url.search = new URL(import.meta.url).search;
    image.decoding = 'async';
    image.onload = () => {
      if (image.naturalWidth !== BOSS_COLLECTION.atlasSize[0] || image.naturalHeight !== BOSS_COLLECTION.atlasSize[1]) {
        reject(new Error(`The ${design.title} artwork does not match this release.`));
        return;
      }
      textures.set(key, image); resolve();
    };
    image.onerror = () => reject(new Error(`Could not load artwork for ${design.title}. Retry loading.`));
    image.src = url.href;
  }))).then(() => textures).catch(error => { loading = null; throw error; });
  return loading;
}

export function themedBossPose(boss, style, reducedMotion = false) {
  const shape = silhouettes[style];
  if (!shape) throw new RangeError(`Unknown boss design: ${style}`);
  const time = reducedMotion ? 0 : boss.age ?? 0;
  const warning = boss.mode === 'warning';
  const exposed = boss.mode === 'exposed' && !boss.objectivesLocked;
  const windup = warning ? clamp(boss.windup ?? 0, 0, 1) : 0;
  const pulse = boss.mode === 'attack' ? clamp((boss.attackPulse ?? 0) * 3, 0, 1) : 0;
  const recoil = clamp((boss.recoil ?? boss.hitFlash ?? 0) * 2, 0, 1);
  const unstable = (boss.phase ?? 0) === 2 && !reducedMotion ? Math.sin(time * 13) : 0;
  const calm = Math.sin(time * 1.8);
  const split = style === 'merge' ? Math.sin(time * 1.6) * .025 : 0;
  const pose = {
    body: { y: exposed ? 8 : calm * 2, angle: unstable * .009 - recoil * .025 },
    torso: { scaleX: shape.torso, scaleY: style === 'monolith' ? 1.04 : 1 },
    head: { scaleX: shape.head, scaleY: shape.head, angle: -recoil * .09 + split + unstable * .014 },
    leftArm: { angle: shape.spread + windup * .2 - pulse * .13 + calm * .016,
      scaleX: shape.leftArm, scaleY: shape.leftArm },
    rightArm: { angle: -shape.spread - windup * .2 + pulse * .13 - calm * .016,
      scaleX: shape.rightArm, scaleY: shape.rightArm },
    leftFist: { angle: windup * .45 - pulse * .17 + (exposed ? -.13 : 0), scaleX: shape.leftArm },
    rightFist: { angle: -windup * .45 + pulse * .17 + (exposed ? .13 : 0), scaleX: shape.rightArm },
    leftLeg: { angle: .04 + calm * .008, y: exposed ? 5 : 0 },
    rightLeg: { angle: -.04 - calm * .008, y: exposed ? 5 : 0 },
    leftBoot: { angle: -.04 }, rightBoot: { angle: .04 },
    leftEye: { x: (boss.lookX ?? 0) * 2, scaleY: exposed ? 1.1 : warning ? .7 : 1 },
    rightEye: { x: (boss.lookX ?? 0) * 2, scaleY: exposed ? 1.1 : warning ? .7 : 1 },
    mouth: { scaleY: boss.dialogue?.current && !reducedMotion ? .9 + Math.sin(time * 14) * .18 : 1 }
  };
  if (style === 'planner' || style === 'orchestrator') {
    pose.leftArm.angle += .08 * Math.sin(time * 2.5);
    pose.rightArm.angle += .08 * Math.cos(time * 2.5);
  }
  if (style === 'meeting') {
    pose.head.angle += Math.sin(time * 3) * .025;
    pose.leftFist.angle += .045 * Math.sin(time * 6);
    pose.rightFist.angle -= .045 * Math.sin(time * 6);
  }
  if (boss.defeated) {
    const progress = reducedMotion ? 1 : clamp((boss.defeatTime ?? 0) / 1.8, 0, 1);
    pose.body = { y: progress * 85, angle: progress * .075 };
    pose.head = { scaleX: shape.head, scaleY: shape.head, angle: progress * .18 };
    pose.leftArm.angle = -.16 * progress; pose.rightArm.angle = .16 * progress;
    pose.leftFist.angle = -.23 * progress; pose.rightFist.angle = .23 * progress;
    pose.leftEye.scaleY = pose.rightEye.scaleY = 1 - progress * .9;
    pose.mouth.scaleY = 1 - progress * .7;
  }
  return pose;
}

export function themedBossBounds(boss, style = boss.arena?.bossStyle ?? 'monolith', reducedMotion = false, matrices = null) {
  const scale = Math.min(boss.h / 790, boss.w / 560);
  const centerX = boss.x + boss.w / 2, baseY = boss.y + boss.h;
  const transforms = matrices ?? wizardMatrices(boss, reducedMotion, themedBossPose(boss, style, reducedMotion));
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const layer of WIZARD_RIG.layers) {
    const [sourceX, sourceY, width, height] = layer.source;
    const matrix = transforms[layer.name];
    for (const horizontal of [sourceX, sourceX + width]) for (const vertical of [sourceY, sourceY + height]) {
      const x = centerX + (matrix[0] * horizontal + matrix[2] * vertical + matrix[4] - WIZARD_RIG.origin[0]) * scale;
      const y = baseY + (matrix[1] * horizontal + matrix[3] * vertical + matrix[5] - WIZARD_RIG.origin[1]) * scale;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  return { x: left - 3, y: top - 3, w: right - left + 6, h: Math.max(bottom, baseY + 11) - top + 6,
    scale, centerX, baseY };
}

function bracket(ctx, bounds, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (const side of [-1, 1]) for (const vertical of [-1, 1]) {
    const horizontal = bounds.x + (side > 0 ? bounds.w : 0);
    const height = bounds.y + (vertical > 0 ? bounds.h : 0);
    ctx.beginPath(); ctx.moveTo(horizontal - side * 10, height); ctx.lineTo(horizontal, height);
    ctx.lineTo(horizontal, height - vertical * 10); ctx.stroke();
  }
  ctx.restore();
}

export function drawThemedBoss(ctx, boss, style, reducedMotion = false) {
  const image = textures.get(style);
  if (!image) throw new Error(`Load ${style} artwork before drawing its encounter.`);
  const design = BOSS_DESIGNS[style];
  const pose = themedBossPose(boss, style, reducedMotion);
  const matrices = wizardMatrices(boss, reducedMotion, pose);
  const bounds = themedBossBounds(boss, style, reducedMotion, matrices);
  ctx.save();
  if (!boss.defeated) for (const side of [-1, 1]) {
    const horizontal = bounds.centerX + side * 153 * bounds.scale;
    const base = bounds.baseY - 5;
    const length = 8 + (reducedMotion ? 0 : Math.sin((boss.age ?? 0) * 14 + side) * 2);
    const flame = ctx.createLinearGradient(horizontal, base, horizontal, base + length);
    flame.addColorStop(0, `${design.accent}9c`); flame.addColorStop(1, `${design.accent}00`);
    ctx.fillStyle = flame; ctx.beginPath(); ctx.moveTo(horizontal - 5, base); ctx.lineTo(horizontal + 5, base);
    ctx.lineTo(horizontal, base + length); ctx.closePath(); ctx.fill();
  }
  drawRobotLayers(ctx, image, matrices, bounds.centerX, bounds.baseY, bounds.scale);
  if (!boss.defeated && boss.mode === 'exposed' && !boss.objectivesLocked) bracket(ctx, boss, '#a1ffe0');
  if (!boss.defeated && (boss.phase ?? 0) > 0) {
    ctx.strokeStyle = design.accent; ctx.lineWidth = 1.5;
    const center = bounds.centerX, middle = boss.y + boss.h * .61;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(center + side * 37, middle - 13);
      ctx.lineTo(center + side * 31, middle - 4); ctx.lineTo(center + side * 39, middle + 2);
      ctx.lineTo(center + side * 29, middle + 12); ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawArmoredCore(ctx, core, style, time = 0, reducedMotion = false, exposed = false, warning = false, target = core) {
  const image = textures.get(style);
  if (!image) throw new Error(`Load ${style} artwork before drawing the core.`);
  const design = BOSS_DESIGNS[style];
  const torso = WIZARD_RIG.layers.find(layer => layer.name === 'torso');
  const center = WIZARD_RIG.chest;
  const sourceX = torso.frame[0] + center[0] - torso.source[0];
  const sourceY = torso.frame[1] + center[1] - torso.source[1];
  ctx.save(); ctx.translate(core.x, core.y);
  ctx.beginPath(); ctx.roundRect(-core.w / 2, -core.h / 2, core.w, core.h, Math.min(9, core.h / 6)); ctx.clip();
  const steel = ctx.createLinearGradient(-core.w / 2, -core.h / 2, core.w / 2, core.h / 2);
  steel.addColorStop(0, '#d8e7f0'); steel.addColorStop(.08, '#6c8599'); steel.addColorStop(.35, '#1a2b3e');
  steel.addColorStop(.78, '#506a7e'); steel.addColorStop(1, '#b4cdd6');
  ctx.fillStyle = steel; ctx.fillRect(-core.w / 2, -core.h / 2, core.w, core.h);
  const panelWidth = Math.min(core.w * .55, core.h * .87);
  const breathing = reducedMotion ? 0 : Math.sin(time * 2) * .6;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, sourceX, sourceY, center[2], center[3], -panelWidth / 2, -panelWidth / 2 + breathing, panelWidth, panelWidth);
  const open = exposed ? 1 : warning ? .18 : .04;
  for (const side of [-1, 1]) {
    const offset = side * (panelWidth / 2 + 5 + open * 6);
    ctx.save(); ctx.translate(offset, 0);
    const width = core.w * .2;
    ctx.fillStyle = steel; ctx.beginPath(); ctx.roundRect(-width / 2, -core.h * .39, width, core.h * .78, 3); ctx.fill();
    ctx.strokeStyle = design.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-side * width / 2, -core.h * .28); ctx.lineTo(-side * width / 2, core.h * .28); ctx.stroke();
    for (let vent = 0; vent < 5; vent += 1) {
      ctx.fillStyle = '#0d1c2b'; ctx.fillRect(-width * .3, -core.h * .28 + vent * core.h * .12, width * .6, 3);
    }
    ctx.restore();
  }
  ctx.restore();
  const marked = exposed ? target : core;
  bracket(ctx, { x: marked.x - marked.w / 2, y: marked.y - marked.h / 2, w: marked.w, h: marked.h },
    exposed ? '#a1ffe0' : warning ? '#ffcb88' : design.accent);
}
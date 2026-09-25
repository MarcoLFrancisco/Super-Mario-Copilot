import { WIZARD_RIG } from '../images/Boss1-rig.js';

const identity = Object.freeze([1, 0, 0, 1, 0, 0]);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const smooth = value => {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
};
const layers = Object.fromEntries(WIZARD_RIG.layers.map(layer => [layer.name, layer]));
let atlas = null;
let loading = null;

export function loadWizardRig(createImage = () => new Image()) {
  if (atlas) return Promise.resolve(atlas);
  if (loading) return loading;
  const url = new URL('../images/Boss1-rig.png', import.meta.url);
  url.search = new URL(import.meta.url).search;
  loading = new Promise((resolve, reject) => {
    const image = createImage();
    image.decoding = 'async';
    image.onload = () => {
      if (image.naturalWidth !== WIZARD_RIG.atlasSize[0] || image.naturalHeight !== WIZARD_RIG.atlasSize[1]) {
        reject(new Error('The Setup Wizard sprite atlas does not match this release. Reload the game.'));
        return;
      }
      atlas = image;
      resolve(image);
    };
    image.onerror = () => reject(new Error('Could not load the Setup Wizard artwork. Check images/Boss1-rig.png.'));
    image.src = url.href;
  }).catch(error => {
    loading = null;
    throw error;
  });
  return loading;
}

function multiply(parent, child) {
  return [
    parent[0] * child[0] + parent[2] * child[1],
    parent[1] * child[0] + parent[3] * child[1],
    parent[0] * child[2] + parent[2] * child[3],
    parent[1] * child[2] + parent[3] * child[3],
    parent[0] * child[4] + parent[2] * child[5] + parent[4],
    parent[1] * child[4] + parent[3] * child[5] + parent[5]
  ];
}

function jointMatrix(pivot, joint = {}) {
  const cosine = Math.cos(joint.angle ?? 0), sine = Math.sin(joint.angle ?? 0);
  const horizontal = joint.scaleX ?? 1, vertical = joint.scaleY ?? 1;
  const matrix = [cosine * horizontal, sine * horizontal, -sine * vertical, cosine * vertical, 0, 0];
  matrix[4] = pivot[0] + (joint.x ?? 0) - matrix[0] * pivot[0] - matrix[2] * pivot[1];
  matrix[5] = pivot[1] + (joint.y ?? 0) - matrix[1] * pivot[0] - matrix[3] * pivot[1];
  return matrix;
}

export function wizardPose(boss, reducedMotion = false) {
  const time = reducedMotion ? 0 : boss.age;
  const direction = boss.facing ?? -1;
  const jumping = boss.mode === 'leaping';
  const moving = Math.abs(boss.vx ?? 0) > 1 && !jumping;
  const stride = moving ? Math.sin((boss.walkDistance ?? 0) * .08) : 0;
  const pace = boss.phase === 2 ? 1.2 : 1;
  const warning = boss.mode === 'warning';
  const attacking = boss.mode === 'attack';
  const recovery = boss.mode === 'exposed';
  const windup = warning ? smooth(boss.windup ?? 0) : 0;
  const pulse = clamp((boss.attackPulse ?? 0) * 3, 0, 1);
  const panic = boss.phase === 2 ? Math.sin(time * 17) : 0;
  const finishRaise = attacking && boss.attackType === 'desperation' && boss.attackStep === 2
    ? smooth(((boss.attackElapsed ?? 0) - .65) / 1) : 0;
  const raise = boss.attackType === 'slam' ? windup : finishRaise;
  const slamImpact = attacking && (boss.attackType === 'slam'
    || (boss.attackType === 'desperation' && boss.attackStep === 3)) ? pulse : 0;
  const charge = boss.attackType === 'charge' && (warning || attacking);
  const power = ['overload', 'countdown', 'burst'].includes(boss.attackType) && (warning || attacking);
  const recoil = (boss.recoil ?? 0) * 2;
  const intro = boss.mode === 'intro' ? Math.sin(smooth(boss.age / 2.6) * Math.PI) : 0;
  const breathing = !reducedMotion && !power && !boss.defeated ? Math.sin(time * 2.1) : 0;
  const stuck = recovery && ['slam', 'desperation'].includes(boss.attackType) ? smooth((boss.timer - 3.8) / .8) : 0;
  const joints = {
    body: { y: power ? 0 : -Math.abs(stride) * 5 + breathing * 2 + slamImpact * 155 + stuck * 80 + (recovery ? 9 : 0),
      angle: charge ? direction * (warning ? -.07 * windup : .09) : -direction * recoil * .055 },
    torso: {},
    head: { angle: power ? 0 : -intro * .045 + panic * .012 + recoil * .04,
      y: recovery ? 5 : -intro * 4 },
    leftArm: { angle: .32 * raise - .09 * stride + .055 * panic - slamImpact * .08,
      y: -raise * 11 + slamImpact * 6 },
    rightArm: { angle: -.32 * raise - .09 * stride - .055 * panic + slamImpact * .08 - intro * .12,
      y: -raise * 11 + slamImpact * 6 },
    leftFist: { angle: .48 * raise + .065 * stride - slamImpact * .19 },
    rightFist: { angle: -.48 * raise - .065 * stride + slamImpact * .19 - intro * .26 },
    leftLeg: { angle: -stride * .11 * pace, x: stride * 26, y: -Math.max(0, stride) * 28 },
    rightLeg: { angle: stride * .11 * pace, x: -stride * 26, y: -Math.max(0, -stride) * 28 },
    leftBoot: { angle: stride * .09 * pace },
    rightBoot: { angle: -stride * .09 * pace },
    leftEye: { x: power ? 0 : (boss.lookX ?? 0) * 2, scaleY: 1 },
    rightEye: { x: power ? 0 : (boss.lookX ?? 0) * 2, scaleY: 1 },
    mouth: { scaleY: boss.dialogue?.current && !reducedMotion ? .85 + Math.sin(time * 12) * .2 : 1 }
  };
  if (power) {
    joints.leftArm.angle = .13 + windup * .12;
    joints.rightArm.angle = -.13 - windup * .12;
    joints.leftFist.angle = .25 + Math.sin(time * 5) * .035;
    joints.rightFist.angle = -.25 - Math.sin(time * 5) * .035;
  }
  if (charge) {
    joints.leftFist.angle += .12;
    joints.rightFist.angle -= .12;
    joints.head.angle = -direction * .035;
  }
  if (attacking && ['volley', 'desperation'].includes(boss.attackType) && !slamImpact && !finishRaise) {
    const arm = (boss.attackStep ?? 0) % 2 ? 'leftArm' : 'rightArm';
    const fist = arm === 'leftArm' ? 'leftFist' : 'rightFist';
    joints[arm].angle += (arm === 'leftArm' ? .16 : -.16) * pulse;
    joints[fist].angle += (arm === 'leftArm' ? -.22 : .22) * pulse;
  }
  if (!reducedMotion && !boss.defeated && boss.age % 4.8 > 4.63) {
    joints.leftEye.scaleY = .12; joints.rightEye.scaleY = .12;
  } else if (boss.phase === 2) {
    joints.leftEye.scaleY = 1.1; joints.rightEye.scaleY = 1.1;
  }
  if (recovery) {
    joints.head.angle += direction * .035;
    joints.leftFist.angle -= .12; joints.rightFist.angle += .12;
  }
  if (boss.mode === 'jumpWarning' || jumping || boss.mode === 'landing') {
    const crouch = boss.mode === 'jumpWarning' ? smooth(boss.windup ?? 0)
      : boss.mode === 'landing' ? smooth(boss.timer / .55) : 0;
    const tuck = jumping ? Math.sin(Math.PI * boss.leap.elapsed / boss.leap.duration) : 0;
    joints.body = { y: crouch * 36, angle: jumping ? direction * .045 : 0 };
    joints.leftLeg = { y: -tuck * 38 + crouch * 8, angle: -.16 * tuck };
    joints.rightLeg = { y: -tuck * 30 + crouch * 8, angle: .16 * tuck };
    joints.leftBoot = { angle: .16 * tuck };
    joints.rightBoot = { angle: -.16 * tuck };
    joints.leftArm = { angle: .15 * tuck + crouch * .1 };
    joints.rightArm = { angle: -.15 * tuck - crouch * .1 };
    joints.leftFist = { angle: .3 * tuck };
    joints.rightFist = { angle: -.3 * tuck };
  }
  if (boss.defeated) {
    const defeat = boss.defeatTime ?? 0;
    const fall = smooth(defeat / 1.15);
    const rise = smooth((defeat - 1.55) / .75);
    const crouch = fall * (1 - rise);
    const defiant = Math.sin(rise * Math.PI);
    if (boss.mode === 'fleeing' || boss.mode === 'escaped') {
      joints.body = { y: -Math.abs(stride) * 9, angle: direction * .12 };
      joints.head = { angle: -direction * .1, y: -4 };
      joints.leftArm = { angle: -.28 * stride };
      joints.rightArm = { angle: .28 * stride };
      joints.leftFist = { angle: .25 + stride * .16 };
      joints.rightFist = { angle: -.25 - stride * .16 };
      joints.leftLeg = { angle: -stride * .16, x: stride * 34, y: -Math.max(0, stride) * 40 };
      joints.rightLeg = { angle: stride * .16, x: -stride * 34, y: -Math.max(0, -stride) * 40 };
      joints.leftBoot = { angle: stride * .13 };
      joints.rightBoot = { angle: -stride * .13 };
      joints.leftEye = { scaleY: 1.12 };
      joints.rightEye = { scaleY: 1.12 };
      joints.mouth = { scaleY: .7 };
    } else {
      joints.body = { y: crouch * 105, angle: direction * crouch * .075 };
      joints.head = { angle: crouch * .18 - defiant * .12, y: crouch * 13 };
      joints.rightArm = { angle: -.3 * defiant + crouch * .08, y: crouch * 12 };
      joints.rightFist = { angle: -.5 * defiant + crouch * .14 };
      joints.leftArm = { angle: -crouch * .13, y: crouch * 9 };
      joints.leftFist = { angle: -crouch * .18 };
      joints.leftLeg = { angle: -.075 * crouch, y: crouch * 10 };
      joints.rightLeg = { angle: .075 * crouch, y: crouch * 10 };
      joints.leftBoot = { angle: .075 * crouch };
      joints.rightBoot = { angle: -.075 * crouch };
      joints.leftEye = { scaleY: 1 - crouch * .88 };
      joints.rightEye = { scaleY: 1 - crouch * .88 };
      joints.mouth = { scaleY: 1 - crouch * .7 };
    }
  }
  return joints;
}

export function wizardMatrices(boss, reducedMotion = false, pose = wizardPose(boss, reducedMotion)) {
  const matrices = { body: jointMatrix(WIZARD_RIG.bodyPivot, pose.body) };
  function resolve(name) {
    if (matrices[name]) return matrices[name];
    const layer = layers[name];
    const parent = layer.parent ? resolve(layer.parent) : identity;
    matrices[name] = multiply(parent, jointMatrix(layer.pivot, pose[name]));
    return matrices[name];
  }
  for (const layer of WIZARD_RIG.layers) resolve(layer.name);
  return matrices;
}

export function wizardChestBounds(boss) {
  const scale = WIZARD_RIG.scale * boss.w / 250;
  return { x: boss.x + boss.w / 2 + (WIZARD_RIG.chest[0] - WIZARD_RIG.origin[0]) * scale - 5,
    y: boss.y + boss.h + (WIZARD_RIG.chest[1] - WIZARD_RIG.origin[1]) * scale - 5,
    w: WIZARD_RIG.chest[2] * scale + 10, h: WIZARD_RIG.chest[3] * scale + 10 };
}

export function wizardCrownY(boss) {
  return boss.y + boss.h + (layers.head.source[1] - WIZARD_RIG.origin[1]) * WIZARD_RIG.scale * boss.w / 250;
}

export function drawWizardRig(ctx, boss, reducedMotion = false) {
  if (!atlas) throw new Error('Setup Wizard artwork must load before rendering the encounter.');
  const matrices = wizardMatrices(boss, reducedMotion);
  const scale = WIZARD_RIG.scale * boss.w / 250;
  const floor = boss.arena?.platforms.find(platform => platform.id === 'arena-floor')?.y ?? boss.y + boss.h;
  const shadowScale = boss.w / 250 * Math.max(.6, 1 - (floor - boss.y - boss.h) / 400);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(boss.x + boss.w / 2, floor + 2, 187 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#07142666'; ctx.fill();
  ctx.translate(boss.x + boss.w / 2, boss.y + boss.h);
  ctx.scale(scale, scale); ctx.translate(-WIZARD_RIG.origin[0], -WIZARD_RIG.origin[1]);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const name of WIZARD_RIG.drawOrder) {
    const layer = layers[name];
    ctx.save(); ctx.transform(...matrices[name]);
    ctx.drawImage(atlas, ...layer.frame, ...layer.source);
    ctx.restore();
  }
  ctx.restore();
  if ((boss.interruptible || boss.mode === 'exposed') && !boss.defeated) {
    const chest = wizardChestBounds(boss);
    const accent = boss.interruptible ? '#ffe68c' : '#93ffe3';
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = accent;
    for (const horizontal of [-1, 1]) for (const vertical of [-1, 1]) {
      const pointX = chest.x + (horizontal > 0 ? chest.w : 0);
      const pointY = chest.y + (vertical > 0 ? chest.h : 0);
      ctx.beginPath(); ctx.moveTo(pointX - horizontal * 12, pointY);
      ctx.lineTo(pointX, pointY); ctx.lineTo(pointX, pointY - vertical * 12); ctx.stroke();
    }
    if (boss.interruptible) {
      ctx.setLineDash([12, 7]); ctx.strokeStyle = '#74dfff88';
      ctx.beginPath(); ctx.ellipse(boss.x + boss.w / 2, boss.y + boss.h / 2 - 22,
        boss.w / 2 + 30, boss.h / 2 + 35, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}
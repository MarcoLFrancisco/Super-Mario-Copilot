import { PHYSICS } from './level.js';
import { BUMBLEBEE_RIG } from '../images/Bumblebee-rig.js';

const parts = Object.fromEntries(BUMBLEBEE_RIG.layers.map(part => [part.name, part]));
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
let artwork = null;
let loading = null;

export function loadBumblebeeArt(createImage = () => new Image()) {
  if (artwork) return Promise.resolve(artwork);
  if (loading) return loading;
  const url = new URL('../images/Bumblebee-rig.png', import.meta.url);
  url.search = new URL(import.meta.url).search;
  loading = new Promise((resolve, reject) => {
    const image = createImage();
    image.decoding = 'async';
    image.onload = () => {
      if (image.naturalWidth !== BUMBLEBEE_RIG.atlasSize[0] || image.naturalHeight !== BUMBLEBEE_RIG.atlasSize[1]) {
        reject(new Error('The Bumblebee artwork does not match this release. Reload the game.'));
        return;
      }
      artwork = image; resolve(image);
    };
    image.onerror = () => reject(new Error('Could not load Bumblebee artwork. Retry loading.'));
    image.src = url.href;
  }).catch(error => { loading = null; throw error; });
  return loading;
}

export function bumblebeePose(actor, time = 0, reducedMotion = false, { extension = 0, talking = false } = {}) {
  const clock = reducedMotion ? 0 : time;
  const direction = actor.attack?.facing ?? actor.facing ?? 1;
  const speed = clamp(Math.abs(actor.vx ?? 0) / PHYSICS.speed, 0, 1);
  const climbing = Boolean(actor.climbing);
  const airborne = !actor.grounded && !climbing;
  const phase = climbing ? (actor.climbDistance ?? 0) * .12 : (actor.walkDistance ?? speed * time * 260) * .14;
  const stride = climbing || speed > .02 ? Math.sin(phase) : 0;
  const lean = direction * (speed * .045 + extension * .07 + (actor.boostTime > 0 ? .08 : 0));
  const bob = climbing ? stride * 12 : airborne ? clamp(-(actor.vy ?? 0) / 30, -10, 18)
    : speed > .02 ? -Math.abs(stride) * 23 : Math.sin(clock * 2.2) * 8;
  const blinkPhase = clock % 4.6;
  const blink = !reducedMotion && blinkPhase > 4.4 ? Math.max(.08, Math.abs(blinkPhase - 4.5) / .1) : 1;
  return {
    body: { y: bob, angle: lean },
    shell: {},
    face: { x: direction * 2, angle: -lean * .25 },
    cap: { angle: -lean * .55 + (reducedMotion ? 0 : Math.sin(clock * 2.6) * .008), y: -Math.abs(stride) * 4 },
    bands: { angle: -lean * .15 },
    leftEar: { angle: stride * .03 + extension * .05, x: -extension * 4 },
    rightEar: { angle: -stride * .03 - extension * .05, x: extension * 4 },
    microphone: { angle: -extension * .15 + (talking ? Math.sin(clock * 7) * .012 : 0) },
    leftEye: { x: direction * (speed * 7 + extension * 6), y: airborne ? -5 : 0, scaleY: blink },
    rightEye: { x: direction * (speed * 7 + extension * 6), y: airborne ? -5 : 0, scaleY: blink },
    mouth: { scaleY: talking && !reducedMotion ? .7 + Math.sin(clock * 13) * .25 : extension > 0 ? .8 : 1 },
    chain: { angle: -lean * .15, y: Math.abs(stride) * 2 },
    pendant: { angle: -stride * .09 - lean * .7, y: airborne ? -6 : Math.abs(stride) * 5 }
  };
}

export function drawBumblebee(ctx, actor, time = 0, reducedMotion = false, options = {}) {
  if (!artwork) throw new Error('Load Bumblebee artwork before rendering the character.');
  const pose = bumblebeePose(actor, time, reducedMotion, options);
  const scale = PHYSICS.playerHeight / BUMBLEBEE_RIG.height;
  const center = actor.x + PHYSICS.playerWidth / 2;
  const feet = actor.y + PHYSICS.playerHeight;
  const direction = actor.attack?.facing ?? actor.facing ?? 1;
  const hover = actor.climbing || !actor.grounded || Math.abs(actor.vx ?? 0) > 5;
  ctx.save();
  if (actor.grounded) {
    ctx.fillStyle = '#061b2c38'; ctx.beginPath(); ctx.ellipse(center, feet + 1, 15, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  const travel = actor.climbing ? actor.climbDistance ?? 0 : actor.walkDistance ?? 0;
  const length = hover ? 5 + (reducedMotion ? 0 : Math.abs(Math.sin(travel * .12)) * 2) : 3;
  ctx.strokeStyle = hover ? '#74e8ffbb' : '#74e8ff55'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(center - 8, feet - 2); ctx.quadraticCurveTo(center, feet + length, center + 8, feet - 2); ctx.stroke();
  ctx.translate(center, feet - 2);
  ctx.scale(scale, scale);
  ctx.translate(-BUMBLEBEE_RIG.origin[0], -BUMBLEBEE_RIG.origin[1]);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  function transformPart(name) {
    const part = parts[name];
    if (part?.parent) transformPart(part.parent);
    const pivot = name === 'body' ? BUMBLEBEE_RIG.bodyPivot : part.pivot;
    const joint = pose[name];
    ctx.translate(pivot[0] + (joint.x ?? 0), pivot[1] + (joint.y ?? 0));
    ctx.rotate(joint.angle ?? 0);
    ctx.scale(joint.scaleX ?? 1, joint.scaleY ?? 1);
    ctx.translate(-pivot[0], -pivot[1]);
  }
  for (const name of BUMBLEBEE_RIG.drawOrder) {
    const part = parts[name];
    ctx.save(); transformPart(name);
    ctx.drawImage(artwork, ...part.frame, ...part.source);
    ctx.restore();
  }
  ctx.restore();
  if ((options.extension ?? 0) > 0) {
    const radius = 5 + options.extension * 11;
    ctx.save(); ctx.translate(center + direction * (19 + options.extension * 15), actor.y + 24);
    ctx.scale(direction, 1);
    ctx.strokeStyle = options.active ? '#a6f3ff' : '#65c6ee88'; ctx.lineWidth = options.active ? 2 : 1;
    for (const offset of [0, 5]) {
      ctx.beginPath(); ctx.arc(-radius, 0, radius + offset, -.65, .65); ctx.stroke();
    }
    ctx.restore();
  }
}
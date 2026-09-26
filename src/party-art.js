import { PHYSICS as P } from './level.js';
import { CHARACTERS, ATTACKS, visibleParty } from './party.js';
import { drawCharacter, characterMotion } from './character.js';
import { drawBumblebee } from './bumblebee-art.js';

// World coordinates; caller owns camera, culling and damage-grace opacity.
// Artwork only: never advance timers, mutate actors or resolve damage here.
export function drawParty(ctx, party, time = 0, reducedMotion = false, speaker = null) {
  const actors = visibleParty(party);
  for (const actor of actors.slice(1).reverse()) {
    drawPartyActor(ctx, actor, time, reducedMotion, { talking: speaker === actor.id });
  }
  drawPartyActor(ctx, actors[0], time, reducedMotion, { talking: speaker === actors[0].id });
}

export function drawPartyActor(ctx, actor, time = 0, reducedMotion = false, options = {}) {
  if (!actor || !CHARACTERS[actor.id]) return;
  const attack = actor.attack;
  const spec = attack && ATTACKS[attack.kind];
  const active = spec && attack.elapsed >= spec.start && attack.elapsed < spec.end;
  const phase = spec ? Math.max(0, Math.min(1, attack.elapsed / spec.duration)) : 0;
  const extension = spec ? (active ? 1 : Math.sin(phase * Math.PI) * .55) : 0;
  const motion = characterMotion(actor, time);
  const stride = motion.stride;
  const facing = attack ? attack.facing : actor.facing;
  const marco = actor.id === 'marco';
  const donkey = actor.id === 'donkey';
  const outfit = CHARACTERS.marco.appearance;
  ctx.save();
  try {
    if (actor.id === 'bumblebee') drawBumblebee(ctx, actor, time, reducedMotion, { ...options, extension, active });
    if (actor.id === 'mario') {
      drawCharacter(ctx, actor, time, reducedMotion,
        attack?.kind === 'kick' ? extension : null);
    }
    ctx.translate(actor.x + P.playerWidth / 2, actor.y);
    ctx.scale(P.playerWidth / 34 * (facing < 0 ? -1 : 1), P.playerHeight / 46);
    const oval = (x, y, rx, ry, color) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#122239'; ctx.lineWidth = .7; ctx.stroke();
    };
    const line = (points, color, width = 1) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    };
    const poly = (points, color) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#122239'; ctx.lineWidth = .7; ctx.stroke();
    };
    const gradient = (top, bottom, y, h) => {
      const fill = ctx.createLinearGradient(0, y, 0, y + h);
      fill.addColorStop(0, top); fill.addColorStop(1, bottom); return fill;
    };
    const leg = (x, angle, color, hoof = false, lift = 0, kick = false) => {
      ctx.save(); ctx.translate(x, 33);
      if (kick) ctx.rotate(angle);
      const footX = kick ? 0 : Math.sin(angle) * 11;
      const kneeX = kick ? 0 : footX * .45 + lift * .4;
      line([[0,0],[kneeX,5 - lift * .2],[footX,10 - lift]], '#122239', 6.8);
      line([[0,0],[kneeX,5 - lift * .2],[footX,10 - lift]], color, 5.3);
      if (!hoof) line([[kneeX - 1,5 - lift * .2],[footX - 1,9 - lift]], '#7fb2e2', 1);
      oval(footX + 1, 10 - lift, hoof ? 3.8 : 5, 2.5, hoof ? '#283443' : '#ecf7ff');
      if (!hoof) line([[footX - 2,11 - lift],[footX + 5,11 - lift]], '#366481', 1);
      ctx.restore();
    };
    if (marco || donkey) {
      if (actor.grounded) oval(0, 46, 14, 1.5, '#07152a33');
      if (actor.boostTime > 0 && !reducedMotion) {
        for (let i = 0; i < 3; i++) {
          line([[-43 + i * 6, 19 + i * 7], [-17, 19 + i * 7]], '#90f5ff88', 2);
        }
      }
    }
    if (marco) {
      const skin = gradient('#ffdbb8', '#c98a66', 10, 20);
      const jeans = gradient('#5287cf', outfit.jeans, 31, 13);
      // Keep the supporting leg steady throughout the kickboxing pose.
      leg(-5, attack?.kind === 'kick' ? 0 : motion.airborne ? .75 : stride * .95, '#21467f', false,
        motion.airborne ? 3 : motion.backLift, motion.airborne);
      leg(5, attack?.kind === 'kick' ? -1.48 * extension : motion.airborne ? -.8 : -stride * .95, jeans, false,
        motion.airborne ? 2 : motion.frontLift, attack?.kind === 'kick' || motion.airborne);
      const backHandY = motion.climbing ? 10 + stride * 3 : 31;
      line([[-8,24],[-12 - stride * 3,motion.climbing ? 17 : 29],[-10 - stride * 6,backHandY]], outfit.shirt, 5);
      oval(-10 - stride * 6, backHandY, 2.6, 3, skin);
      poly([[-8, 21], [7, 21], [11, 26], [7, 28], [8, 34], [-8, 34], [-9, 27], [-12, 26]],
        gradient('#70f2e7', outfit.shirt, 21, 13));
      line([[-6, 33], [6, 33]], '#142c4b', 1.8);
      line([[0, 34], [0, 40]], '#88b6eb', .7);
      line([[-5, 35], [-3, 37]], '#a9c8ef', .7);
      poly([[-3, 24], [0, 22], [3, 25], [0, 28]], '#e7ffff');
      const punch = attack?.kind === 'punch' ? extension : 0;
      const handX = 12 + punch * 27 + (attack ? 0 : stride * 6);
      const handY = motion.climbing ? 10 - stride * 3 : attack ? 23 : 30;
      line([[8,25],[12 + punch * 8,motion.climbing ? 17 : 27 - punch * 3],[handX,handY]], skin, 4.5);
      oval(handX, handY, 3.6, 3, skin);
      line([[handX - 2,handY - 1],[handX + 2,handY - 1]], '#efffff', 1.6);
      oval(-1, 14, 10, 10, outfit.hair);
      oval(2, 15, 8.5, 9, skin);
      oval(-7, 16, 2.8, 3.6, skin);
      poly([[-8, 9], [-3, 9], [-5, 18], [-8, 17]], outfit.hair);
      oval(10, 17, 2.8, 2.2, skin);
      line([[3, 21], [7, 21]], '#975b4a', .8);
      const lenses = gradient('#b4fff4', outfit.lenses, 12, 6);
      poly([[-3, 12], [3, 12], [2, 17], [-2, 17]], lenses);
      poly([[5, 12], [11, 12], [10, 17], [6, 17]], lenses);
      line([[-7, 12], [-3, 13], [3, 13], [5, 13], [11, 12]], '#111b29', 1.5);
      line([[-1, 13], [1, 15]], '#e3fffa', .8);
      line([[7, 13], [9, 15]], '#e3fffa', .8);
      oval(-1, 7, 11, 6, gradient('#416ba2', outfit.cap, 1, 11));
      oval(7, 10, 10, 1.8, outfit.cap);
      line([[-7, 6], [-3, 3], [1, 3]], '#7298bf', .8);
      poly([[1, 5], [3, 3], [5, 5], [3, 7]], '#8affed');
    }
    if (donkey) {
      line([[-10, 28], [-17, 25], [-19, 29]], '#716b80', 2);
      oval(-19, 30, 2, 3, '#303343');
      leg(-7, attack ? extension * 1.6 : motion.airborne ? .7 : stride * .95, '#787589', true,
        motion.airborne ? 3 : motion.backLift, Boolean(attack) || motion.airborne);
      // Plant the supporting leg during the kick instead of continuing its run cycle.
      leg(6, attack ? 0 : motion.airborne ? -.7 : -stride * .95, '#a3a1ad', true,
        motion.airborne ? 2 : motion.frontLift, motion.airborne);
      oval(-1, 29, 12, 9, gradient('#b4b1bf', '#706e80', 21, 16));
      oval(8, 20, 6, 10, '#a3a0ae');
      oval(4, 7, 2.5, 7, '#9691a5');
      oval(11, 6, 2.5, 7, '#aaa5b6');
      line([[4, 3], [4, 9]], '#d5acb7', 1.5);
      line([[11, 2], [11, 8]], '#d5acb7', 1.5);
      oval(10, 15, 7, 7, '#aaa6b7');
      poly([[3, 10], [2, 15], [5, 13], [5, 9]], '#363442');
      oval(14, 20, 6, 4, '#dfd5d2');
      oval(12, 13, 2, 2.7, '#ffffff');
      oval(13, 14, .8, 1.4, '#17283c');
      oval(17, 19, .8, .7, '#524657');
      line([[12, 22], [16, 22]], '#645668', .8);
      poly([[4, 23], [12, 25], [7, 29], [2, 26]], '#25d9d2');
    }
    // A steady contact marker remains with reduced motion; decorative arcs do not.
    if (active) {
      const direction = spec.backward ? -1 : 1;
      // Match the hitbox's outer edge relative to the actor's center,
      // converting world pixels into this sprite's local coordinates.
      const tip = direction * (P.playerWidth / 2 - 4 + spec.reach) * 34 / P.playerWidth;
      const y = (spec.top + spec.height / 2) * 46 / P.playerHeight;
      line([[tip - 3, y], [tip + 3, y]], '#e4fffc', 2);
      if (!reducedMotion) {
        line([[direction * 18, y - 9], [tip * .8, y - 7], [tip, y]], '#80fff3aa', 2.5);
      }
    }
  } finally {
    ctx.restore();
  }
}

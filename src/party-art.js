import { PHYSICS as P } from './level.js';
import { CHARACTERS, ATTACKS, visibleParty } from './party.js';
import { drawCharacter } from './character.js';

// World coordinates; caller owns camera, culling and damage-grace opacity.
// Artwork only: never advance timers, mutate actors or resolve damage here.
export function drawParty(ctx, party, time = 0, reducedMotion = false) {
  const actors = visibleParty(party);
  for (const actor of actors.slice(1).reverse()) {
    drawPartyActor(ctx, actor, time, reducedMotion);
  }
  drawPartyActor(ctx, actors[0], time, reducedMotion);
}

export function drawPartyActor(ctx, actor, time = 0, reducedMotion = false) {
  if (!actor || !CHARACTERS[actor.id]) return;
  const attack = actor.attack;
  const spec = attack && ATTACKS[attack.kind];
  const active = spec && attack.elapsed >= spec.start && attack.elapsed < spec.end;
  const phase = spec ? Math.max(0, Math.min(1, attack.elapsed / spec.duration)) : 0;
  const extension = spec ? (active ? 1 : Math.sin(phase * Math.PI) * .55) : 0;
  const t = reducedMotion ? 0 : time;
  const stride = actor.grounded
    ? Math.sin(t * 19) * Math.min(1, Math.abs(actor.vx) / P.speed) : .55;
  const facing = attack ? attack.facing : actor.facing;
  const marco = actor.id === 'marco';
  const donkey = actor.id === 'donkey';
  const outfit = CHARACTERS.marco.appearance;
  ctx.save();
  try {
    if (actor.id === 'mario') drawCharacter(ctx, actor, time, reducedMotion);
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
    const leg = (x, angle, color, hoof = false) => {
      ctx.save(); ctx.translate(x, 33); ctx.rotate(angle);
      poly([[-3, 0], [3, 0], [3, 9], [-3, 9]], color);
      oval(1, 10, hoof ? 3.8 : 5, 2.5, hoof ? '#283443' : '#ecf7ff');
      if (!hoof) line([[-2, 11], [5, 11]], '#366481', 1);
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
      leg(-5, stride * .55, '#21467f');
      leg(5, attack?.kind === 'kick' ? -1.48 * extension : -stride * .55, jeans);
      oval(-10, 27, 3, 6, outfit.shirt);
      oval(-10 - stride * 2, 32, 2.6, 3, skin);
      poly([[-8, 21], [7, 21], [11, 26], [7, 28], [8, 34], [-8, 34], [-9, 27], [-12, 26]],
        gradient('#70f2e7', outfit.shirt, 21, 13));
      line([[-6, 33], [6, 33]], '#142c4b', 1.8);
      line([[0, 34], [0, 40]], '#88b6eb', .7);
      line([[-5, 35], [-3, 37]], '#a9c8ef', .7);
      poly([[-3, 24], [0, 22], [3, 25], [0, 28]], '#e7ffff');
      const punch = attack?.kind === 'punch' ? extension : 0;
      line([[8, 25], [12 + punch * 8, 27 - punch * 3], [12 + punch * 27, 23]], skin, 4.5);
      oval(12 + punch * 27, 23, 3.6, 3, skin);
      line([[10 + punch * 27, 22], [14 + punch * 27, 22]], '#efffff', 1.6);
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
      leg(-7, attack ? extension * 1.6 : stride * .5, '#787589', true);
      leg(6, -stride * .5, '#a3a1ad', true);
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
    if (actor.id === 'mario' && attack) {
      leg(5, -1.48 * extension, '#438fff');
    }
    // A steady contact marker remains with reduced motion; decorative arcs do not.
    if (active) {
      const direction = spec.backward ? -1 : 1;
      const tip = direction * (13 + spec.reach * 34 / P.playerWidth);
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

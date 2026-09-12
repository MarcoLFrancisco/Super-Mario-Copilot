import { LEVEL, VIEW, APPS, PHYSICS, zoneAt } from './level.js';
import { drawParty } from './party-art.js';
import { visibleParty } from './party.js';
import { drawPartyBubble } from './party-bubbles.js';
import { drawCollectible, drawPickup } from './collectibles.js';
import { drawBackground, drawPlatform } from './scenery.js';
import { ARENA } from './encounters.js';
import { drawEnemy, drawProjectile, drawPowerup } from './enemy-art.js';
import { drawArena, drawBossWarnings, drawBoss } from './boss-art.js';
import { drawWorldBackground, drawWorldPlatform, drawMissionObjects, drawCampaignBoss } from './world-art.js';
import { missionReady } from './missions.js';

function drawCombatScene(ctx, state, reducedMotion, visible) {
  const { combat, blocks, player } = state;
  for (const block of blocks.blocks) {
    if (block.broken || !visible(block.x, block.w)) continue;
    ctx.save();
    const bump = reducedMotion ? 0 : Math.sin(block.bump / .18 * Math.PI) * 4;
    ctx.translate(block.x, block.y - bump);
    const reward = block.kind === 'reward';
    ctx.fillStyle = block.used ? '#58677c' : reward ? '#b97722' : APPS[block.app].dark;
    ctx.fillRect(0, 0, block.w, block.h);
    ctx.fillStyle = block.used ? '#97a6b7' : reward ? '#ffe19a' : APPS[block.app].color;
    ctx.fillRect(1, 1, block.w - 2, 3);
    ctx.strokeStyle = '#13263e'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, block.w - 2, block.h - 2);
    if (reward) {
      ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = block.used ? '#ced8e4' : '#fff6d9';
      ctx.fillText(block.used ? '·' : '?', block.w / 2, 24);
    } else {
      ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(32, 16);
      ctx.moveTo(16, 0); ctx.lineTo(16, 16);
      ctx.moveTo(8, 16); ctx.lineTo(8, 32);
      ctx.moveTo(24, 16); ctx.lineTo(24, 32); ctx.stroke();
    }
    ctx.restore();
  }
  if (!reducedMotion) {
    ctx.save();
    for (const piece of blocks.debris) {
      if (!visible(piece.x, 16)) continue;
      ctx.globalAlpha = Math.max(0, piece.life / .6);
      ctx.fillStyle = APPS[piece.app].color;
      ctx.fillRect(piece.x, piece.y, 12, 12);
    }
    ctx.restore();
  }
  for (const item of [...combat.pickups, ...blocks.pickups]) {
    if (visible(item.x, item.w)) drawPowerup(ctx, item, state.time, reducedMotion);
  }
  if (state.stage === 'boss') {
    drawBossWarnings(ctx, state.boss);
    if (state.mission.id) drawCampaignBoss(ctx, state.boss, state.mission, reducedMotion);
    else drawBoss(ctx, state.boss, reducedMotion);
  }
  for (const enemy of combat.enemies) {
    if (visible(enemy.x, enemy.w)) drawEnemy(ctx, enemy, reducedMotion);
  }
  for (const shot of combat.shots) {
    if (visible(shot.x, shot.w)) drawProjectile(ctx, shot);
  }
  ctx.save();
  if (combat.protection > 0 || combat.grace > 0) {
    const x = player.x + PHYSICS.playerWidth / 2;
    const y = player.y + PHYSICS.playerHeight / 2;
    const colors = combat.protection > 0
      ? ['#f35325', '#81bc06', '#05a6f0', '#ffba08'] : ['#d6f5ff'];
    colors.forEach((color, i) => {
      const start = i * Math.PI * 2 / colors.length;
      ctx.beginPath();
      ctx.ellipse(x, y, 25, 32, 0, start, start + Math.PI * 2 / colors.length);
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    });
    if (combat.protection > 0) {
      ctx.font = "bold 12px 'Segoe UI', sans-serif";
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#12253e'; ctx.lineWidth = 3;
      const remaining = `${combat.protection.toFixed(1)}s`;
      ctx.strokeText(remaining, x, player.y - 14);
      ctx.fillText(remaining, x, player.y - 14);
    }
  }
  // Steady translucency conveys damage grace without rapid flashing.
  if (combat.grace > 0 && combat.protection <= 0) ctx.globalAlpha = .65;
  drawParty(ctx, state.party, state.time, reducedMotion);
  if (combat.blaster) {
    const facing = state.party.actors[state.party.leader].facing;
    const x = facing < 0 ? player.x - 6 : player.x + PHYSICS.playerWidth - 5;
    ctx.fillStyle = '#465e99'; ctx.fillRect(x, player.y + 25, 11, 6);
    ctx.fillStyle = '#9dffe5';
    ctx.fillRect(facing < 0 ? x : x + 8, player.y + 26, 3, 4);
  }
  ctx.restore();
}

// Transient visuals stay outside simulation state and reset with each run.
const visuals = new WeakMap();
function renderUpgrade(ctx, state, reducedMotion, options) {
  const world = state.world ?? LEVEL;
  const campaign = Boolean(state.mission?.id);
  let effects = visuals.get(state);
  if (!effects) {
    effects = { seen: new Set(state.collected), pickups: [], health: state.combat.health,
      deaths: state.deaths, impactAt: -1 };
    visuals.set(state, effects);
  }
  if (state.combat.health < effects.health || state.deaths > effects.deaths) effects.impactAt = state.time;
  effects.health = state.combat.health; effects.deaths = state.deaths;
  for (const item of world.sparks) {
    if (state.collected.has(item.id) && !effects.seen.has(item.id)) {
      effects.seen.add(item.id);
      effects.pickups.push({ item, startedAt: state.time });
    }
  }
  effects.pickups = effects.pickups.filter(effect => state.time - effect.startedAt < .55);
  const arena = state.stage === 'boss';
  const camera = arena ? 0 : state.cameraX;
  const visible = (x, width = 50) => x + width > camera - 80 && x < camera + VIEW.width + 80;
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  };
  const label = (text, x, y, size = 13) => {
    ctx.font = `600 ${size}px 'Segoe UI', sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = '#143652';
    ctx.strokeText(text, x, y); ctx.fillStyle = '#ffffff'; ctx.fillText(text, x, y);
  };
  ctx.save();
  try {
    ctx.setTransform(ctx.canvas.width / VIEW.width, 0, 0, ctx.canvas.height / VIEW.height, 0, 0);
    if (!reducedMotion && state.time - effects.impactAt < .2) {
      ctx.translate(Math.sin(state.time * 110) * (options.shake ?? 0) * 4, 0);
    }
    if (campaign) drawWorldBackground(ctx, state.mission, camera, state.time, reducedMotion, arena);
    else if (arena) drawArena(ctx, state.time, reducedMotion);
    else drawBackground(ctx, camera, zoneAt(state.player.x), state.time, reducedMotion);
    ctx.translate(-camera, 0);
    for (const platform of arena ? (state.arena ?? ARENA).platforms : (state.geometry ?? world).platforms) {
      if (!visible(platform.x, platform.w)) continue;
      if (campaign) drawWorldPlatform(ctx, platform, state.mission, state.time, reducedMotion, options.highContrast);
      else drawPlatform(ctx, platform, state.time, reducedMotion);
    }
    if (campaign) drawMissionObjects(ctx, state, visible);
    if (!arena) {
    for (const item of world.sparks) {
      if (visible(item.x) && !state.collected.has(item.id)) {
        drawCollectible(ctx, item, state.time, reducedMotion);
      }
    }
    for (const hazard of world.hazards) {
      if (!visible(hazard.x, hazard.w)) continue;
      rect(hazard.x, hazard.y, hazard.w, hazard.h, '#641c49');
      rect(hazard.x, hazard.y, hazard.w, 3, '#ff9eb9');
      for (let x = hazard.x + 3; x < hazard.x + hazard.w - 3; x += 10) {
        rect(x, hazard.y + 5, 5, 5, '#ff5a86');
      }
      label('!', hazard.x + hazard.w / 2 - 3, hazard.y + 22, 15);
    }
    world.checkpoints.forEach((checkpoint, index) => {
      if (!visible(checkpoint.x)) return;
      const active = index <= state.checkpointIndex;
      rect(checkpoint.x - 3, checkpoint.y - 91, 6, 91, '#345375');
      rect(checkpoint.x - 1, checkpoint.y - 91, 2, 91, '#e9fbff');
      rect(checkpoint.x + 3, checkpoint.y - 88, 35, 23, active ? '#137f58' : '#546c96');
      label(active ? '✓' : 'C', checkpoint.x + 13, checkpoint.y - 71, 16);
      rect(checkpoint.x - 10, checkpoint.y - 5, 20, 5, '#e4f7ff');
    });
    for (const sign of world.signs) {
      if (visible(sign.x, 350)) label(sign.text, sign.x, sign.y);
    }
    const goal = world.goal;
    if (visible(goal.x, goal.w)) {
      rect(goal.x, goal.y, 7, goal.h, '#566bad');
      rect(goal.x + goal.w - 7, goal.y, 7, goal.h, '#566bad');
      rect(goal.x + 2, goal.y, 2, goal.h, '#beffff');
      rect(goal.x + goal.w - 5, goal.y, 2, goal.h, '#fbd2ff');
      rect(goal.x, goal.y - 5, goal.w, 9, '#c1bdff');
      rect(goal.x, goal.y + goal.h - 9, goal.w, 9, '#ecf7ff');
      drawCollectible(ctx, { x: goal.x + goal.w / 2, y: goal.y + 48,
        radius: 23, app: 'copilot', secret: false }, state.time, reducedMotion);
      label(campaign && !missionReady(state) ? 'TASKS PENDING' : 'BOSS GATE', goal.x + 9, goal.y - 15, 12);
    }
    }
    drawCombatScene(ctx, state, reducedMotion, visible);
    // A steady, text-labeled marker distinguishes the controlled actor from AI.
    const leader = state.party.actors[state.party.leader];
    if (leader.x + PHYSICS.playerWidth > camera && leader.x < camera + VIEW.width
        && leader.y + PHYSICS.playerHeight > 0 && leader.y < VIEW.height) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const markerX = Math.max(camera + 20, Math.min(camera + VIEW.width - 20,
        leader.x + PHYSICS.playerWidth / 2));
      const markerY = Math.max(18, Math.min(VIEW.height - 8,
        leader.y + PHYSICS.playerHeight + 17));
      label('YOU', markerX, markerY, 12);
      ctx.restore();
    }
    for (const effect of arena ? [] : effects.pickups) {
      if (visible(effect.item.x)) {
        drawPickup(ctx, effect.item, state.time - effect.startedAt, 0, reducedMotion);
      }
    }
    // Balloons use logical screen coordinates and restore the camera transform.
    // Only present actors can speak; boss captions retain visual priority.
    if (!campaign && !state.boss?.dialogue.current) {
      drawPartyBubble(ctx, state.partyDialogue.current, visibleParty(state.party), camera);
    }
  } finally {
    ctx.restore();
  }
}

// Renderer contract: player {x,y,vx,facing,boostTime}, cameraX,
// collected Set of spark IDs, checkpointIndex, time (seconds), status.
// Rendering never changes simulation state. Coordinates remain 1280 × 720.
export function render(ctx, state, reducedMotion = false, options = {}) {
  return renderUpgrade(ctx, state, reducedMotion, options);
}

// Legacy renderer retained temporarily; it is not called by the application.
function renderLegacy(ctx, state, reducedMotion = false) {
  const t = reducedMotion ? 0 : state.time;
  const camera = state.cameraX;
  const zone = zoneAt(state.player.x);
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const line = (x, y, xx, yy, color, width = 1) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xx, yy); ctx.stroke();
  };
  const orb = (x, y, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  const label = (text, x, y, color, size = 14) => {
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px 'Segoe UI', sans-serif`;
    ctx.fillText(text, x, y);
  };
  const glow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const star = (x, y, r, color) => {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const d = i % 2 ? r * .3 : r;
      const xx = x + Math.cos(a) * d, yy = y + Math.sin(a) * d;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.closePath(); ctx.fill();
  };
  const icon = (app, x, y, s) => {
    const a = APPS[app];
    rect(x + s * .18, y - s * .12, s, s, a.dark);
    rect(x, y, s, s, a.color);
    if (app === 'outlook') {
      rect(x + s * .48, y + s * .18, s * .62, s * .58, '#d8f3ff');
      line(x + s * .48, y + s * .18, x + s * .8, y + s * .48, a.dark);
      line(x + s * 1.1, y + s * .18, x + s * .8, y + s * .48, a.dark);
    } else if (app === 'teams') {
      orb(x + s, y + s * .16, s * .18, '#e0d8ff');
      rect(x + s * .87, y + s * .4, s * .28, s * .38, '#d2c5ff');
    } else if (app === 'copilot') {
      ['#65eaff', '#9294ff', '#f0a1d9'].forEach((c, i) => {
        ctx.strokeStyle = c; ctx.lineWidth = s * .13;
        ctx.beginPath();
        ctx.ellipse(x + s / 2, y + s / 2, s * .34, s * .2, i * Math.PI / 3, 0, Math.PI * 2);
        ctx.stroke();
      });
      return;
    }
    label(a.glyph, x + s * .12, y + s * .76, '#082b3c', s * .7);
  };
  const visible = (x, w = 80) => x + w > camera - 120 && x < camera + VIEW.width + 120;
  ctx.save();
  ctx.setTransform(ctx.canvas.width / VIEW.width, 0, 0, ctx.canvas.height / VIEW.height, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, '#090f2b'); sky.addColorStop(.65, zone.sky); sky.addColorStop(1, '#427a91');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  glow(990, 130, 290, '#bc8cff30');
  for (let i = 0; i < 65; i++) {
    const x = ((i * 197.3 - camera * .08) % 1400 + 1400) % 1400;
    orb(x, 25 + (i * 71 % 320), i % 3 === 0 ? 1.7 : .8, '#d9f8ff99');
  }
  for (let layer = 0; layer < 3; layer++) {
    const factor = .12 + layer * .13;
    for (let i = -1; i < 12; i++) {
      const x = i * 170 - (camera * factor % 170);
      const h = 80 + ((i + 20) * 47 % 160);
      const y = 560 + layer * 45 - h;
      rect(x, y, 112, h + 180, ['#28496855', '#26415b88', '#1c354fbb'][layer]);
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 4; col++) rect(x + 12 + col * 24, y + 16 + row * 25, 9, 3, '#9adfff28');
      }
    }
  }
  for (let i = 0; i < 9; i++) {
    const x = ((i * 239 - camera * .22 + t * 5) % 1600 + 1600) % 1600 - 150;
    const y = 160 + i % 3 * 110;
    orb(x, y, 36, '#bcecff12'); orb(x + 40, y - 15, 50, '#bcecff12'); orb(x + 84, y, 32, '#bcecff12');
  }
  ctx.translate(-camera, 0);
  for (const p of LEVEL.platforms) {
    if (!visible(p.x, p.w)) continue;
    const a = APPS[p.app];
    rect(p.x + 9, p.y + 12, p.w, p.h + 12, '#030d2244');
    rect(p.x, p.y, p.w, p.h, a.dark);
    rect(p.x, p.y, p.w, 5, a.color);
    rect(p.x + 4, p.y + 6, p.w - 8, 2, '#ffffff55');
    for (let x = p.x + 34; x < p.x + p.w; x += 38) {
      line(x, p.y + 9, x, p.y + 25, a.color + '66');
      if (p.app === 'excel') line(x - 30, p.y + 17, x, p.y + 17, a.color + '66');
    }
    icon(p.app, p.x + 10, p.y + 35, 20);
    if (p.kind === 'secret') star(p.x + p.w - 15, p.y + 43, 7, '#ffe5a3');
  }
  for (const s of LEVEL.sparks) {
    if (!visible(s.x) || state.collected.has(s.id)) continue;
    const y = s.y + Math.sin(t * 3 + s.x) * 3;
    glow(s.x, y, 25, s.secret ? '#efb1ff55' : '#ffe58a44');
    star(s.x, y, s.radius, s.secret ? '#f1baff' : '#ffe18a');
    star(s.x - 2, y - 2, 4, '#ffffff');
  }
  for (const h of LEVEL.hazards) {
    if (!visible(h.x)) continue;
    rect(h.x, h.y, h.w, h.h, '#621c56');
    for (let x = h.x; x < h.x + h.w; x += 12) star(x + 6, h.y + 7, 7, '#ff719b');
    label('!', h.x + h.w / 2 - 3, h.y + 23, '#ffffff', 16);
  }
  LEVEL.checkpoints.forEach((c, i) => {
    if (!visible(c.x)) return;
    const active = i <= state.checkpointIndex;
    line(c.x, c.y, c.x, c.y - 88, '#b9e7ff', 4);
    glow(c.x, c.y - 87, 35, active ? '#7dffbd55' : '#80cfff22');
    star(c.x, c.y - 87, 15, active ? '#86ffc1' : '#9fb5ce');
  });
  for (const s of LEVEL.signs) if (visible(s.x, 350)) label(s.text, s.x, s.y, '#def1ffbb', 13);
  const g = LEVEL.goal;
  if (visible(g.x, g.w)) {
    glow(g.x + 35, g.y + 55, 150, '#c0aaff66');
    rect(g.x, g.y + g.h - 12, g.w, 12, '#a8deff');
    line(g.x + 6, g.y + g.h, g.x + 6, g.y, '#a9afff', 5);
    line(g.x + g.w - 6, g.y + g.h, g.x + g.w - 6, g.y, '#87efff', 5);
    icon('copilot', g.x + 10, g.y + 24, 44);
  }
  const p = state.player;
  ctx.save(); ctx.translate(p.x + PHYSICS.playerWidth / 2, p.y);
  if (p.facing < 0) ctx.scale(-1, 1);
  if (p.boostTime > 0) {
    glow(-20, 25, 48, '#80eaff77');
    for (let i = 0; i < 5; i++) star(-22 - i * 13, 22 + Math.sin(t * 20 + i) * 9, 5 - i * .6, '#b4f4ff');
  }
  rect(-19, 21, 9, 18, '#687cc2');
  rect(-12, 20, 27, 20, '#c4e4ff');
  rect(-9, 25, 20, 10, '#687ce0');
  star(1, 30, 6, '#a4ffff');
  orb(0, 12, 17, '#e5f3ff');
  rect(-10, 5, 26, 13, '#15294f');
  rect(3, 9, 4, 4, '#85f4ff'); rect(11, 9, 3, 4, '#85f4ff');
  const stride = Math.sin(t * 18) * Math.min(4, Math.abs(p.vx) / 70);
  rect(-11, 39, 10, 7 - stride, '#8295d9'); rect(5, 39, 10, 7 + stride, '#a7bcf4');
  ctx.restore(); ctx.restore();
}

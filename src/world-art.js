import { VIEW } from './level.js';
import { missionStations, stationStatus } from './missions.js';

function panel(ctx, x, y, width, height, color, radius = 3, border = null) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = color; ctx.fill();
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1.5; ctx.stroke(); }
}

function line(ctx, points, color, width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke();
}

function oval(ctx, x, y, horizontal, vertical, color) {
  ctx.beginPath(); ctx.ellipse(x, y, horizontal, vertical, 0, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}

function label(ctx, value, x, y, size = 12, color = '#eaf7ff', align = 'left') {
  ctx.font = `600 ${size}px 'Trebuchet MS', sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y);
}

function gear(ctx, x, y, radius, time, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(time);
  for (let tooth = 0; tooth < 12; tooth += 1) {
    ctx.rotate(Math.PI / 6); panel(ctx, radius - 6, -6, 15, 12, color, 1);
  }
  ctx.strokeStyle = color; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.arc(0, 0, radius - 8, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
  for (let spoke = 0; spoke < 4; spoke += 1) {
    ctx.rotate(Math.PI / 2); line(ctx, [[10,0],[radius - 15,0]], color, 6);
  }
  ctx.restore();
}

function server(ctx, x, y, width, height, accent, dark = '#294555') {
  panel(ctx, x, y, width, height, dark, 5, '#c9eeff35');
  panel(ctx, x + 7, y + 9, width - 14, 20, '#101f2c', 2);
  for (let row = 0; row < (height - 40) / 24; row += 1) {
    panel(ctx, x + 7, y + 38 + row * 24, width - 14, 17, '#142d3d', 2);
    line(ctx, [[x + 14,y + 43 + row * 24],[x + width - 23,y + 43 + row * 24]], '#a2c8d06b', 1);
    panel(ctx, x + width - 18, y + 44 + row * 24, 4, 4, row % 4 ? accent : '#ffd682', 1);
  }
}

function skyline(ctx, mission, camera, time, theme) {
  const accent = mission.color;
  const offset = camera * .22;
  const spacing = theme === 'github' ? 360 : 300;
  const first = Math.floor(offset / spacing) - 1;
  for (let building = first; building < first + 7; building += 1) {
    const x = building * spacing - offset;
    const variation = Math.abs(building * 67 % 120);
    ctx.save();
    if (theme === 'campus') {
      const top = 275 - variation / 2;
      panel(ctx, x + 15, top, 190, 330, '#d0eaf08c', 3, '#f2feff99');
      panel(ctx, x + 205, top + 25, 26, 305, '#668fac6b');
      for (let row = 0; row < 8; row += 1) {
        for (let column = 0; column < 5; column += 1) {
          panel(ctx, x + 28 + column * 34, top + 22 + row * 31, 23, 20,
            (row + column) % 5 ? '#7bbccc77' : '#fff4bc88', 1);
        }
      }
      line(ctx, [[x + 35,top + 296],[x + 245,top + 296],[x + 290,top + 274]], '#d0f8f76b', 8);
      line(ctx, [[x + 48,top + 282],[x + 260,top + 282]], '#ffffff66', 2);
      label(ctx, ['RESEARCH','INNOVATION','CAMPUS'][Math.abs(building) % 3], x + 34, top + 16, 9, '#214b6799');
    } else if (theme === 'github') {
      line(ctx, [[x + 175,650],[x + 168,345],[x + 115,260],[x + 108,65]], '#173a37', 52);
      line(ctx, [[x + 177,650],[x + 171,344],[x + 121,258],[x + 115,70]], '#456c5499', 8);
      for (const [height, side] of [[180,-1],[285,1],[390,-1]]) {
        const end = x + 170 + side * 125;
        line(ctx, [[x + 170,height + 60],[end,height],[end + side * 45,height - 95]], '#3b766480', 18);
        line(ctx, [[x + 170,height + 60],[end,height],[end + side * 45,height - 95]], '#a2d9ab66', 2);
        oval(ctx, end + side * 45, height - 95, 9, 9, '#8acaa599');
        panel(ctx, end - 38, height - 20, 76, 23, '#153b3999', 3, '#8edfba55');
        label(ctx, ['main','feature','release'][Math.abs(height / 5) % 3], end, height - 4, 10, '#bce8cbb0', 'center');
      }
      for (let stream = 0; stream < 3; stream += 1) {
        const streamX = x + 260 + stream * 9;
        line(ctx, [[streamX,100],[streamX,570]], '#6de8c319', 3);
        panel(ctx, streamX, 100 + (time * 36 + stream * 51 + variation) % 470, 2, 30, '#b4ffe055', 0);
      }
    } else if (theme === 'cowork') {
      panel(ctx, x, 120 + variation / 3, 245, 480, '#332e457d', 4, '#ffddbd33');
      for (let shelf = 0; shelf < 4; shelf += 1) {
        const shelfY = 175 + shelf * 104;
        panel(ctx, x + 7, shelfY + 62, 230, 12, '#d2a58755', 2);
        for (let book = 0; book < 7; book += 1) {
          const height = 42 + (book * 13 + shelf * 19) % 35;
          const bookX = x + 20 + book * 29;
          panel(ctx, bookX, shelfY + 61 - height, 23, height,
            ['#78afad77','#ddbd9677','#d58fa077','#9aa6c477'][(book + shelf) % 4], 2);
          line(ctx, [[bookX + 4,shelfY + 30],[bookX + 19,shelfY + 30]], '#fce6c96b', 2);
        }
      }
      panel(ctx, x + 170, 208, 66, 55, '#f3d79799', 1);
      line(ctx, [[x + 180,224],[x + 224,224]], '#96715488', 2);
      line(ctx, [[x + 180,234],[x + 214,234]], '#96715488', 2);
    } else if (theme === 'foundry') {
      server(ctx, x + 35, 315, 110, 290, '#eeae686b', '#2e384caa');
      line(ctx, [[x + 220,30],[x + 220,180],[x + 270,230]], '#172b35', 30);
      line(ctx, [[x + 220,30],[x + 220,180],[x + 270,230]], '#a1b7ba88', 18);
      for (let seam = 0; seam < 5; seam += 1) panel(ctx, x + 204, 35 + seam * 28, 32, 6, '#d1dddd44', 1);
      gear(ctx, x + 230, 460, 55, time * .18 + building, '#97a6a566');
      gear(ctx, x + 286, 530, 37, -time * .27, '#deb98466');
      line(ctx, [[x + 40,55],[x + 40,120],[x + 98,170],[x + 115,210]], '#182c3c99', 24);
      line(ctx, [[x + 40,55],[x + 40,120],[x + 98,170],[x + 115,210]], '#bdd0cc88', 11);
      oval(ctx, x + 98, 170, 13, 13, '#e3bd8488');
      line(ctx, [[x + 103,210],[x + 98,235]], '#dde7dc88', 5);
      line(ctx, [[x + 124,210],[x + 134,232]], '#dde7dc88', 5);
      panel(ctx, x + 5, 625, 280, 25, '#31465299');
    } else if (theme === 'agents') {
      const height = 250 + variation;
      panel(ctx, x + 22, 590 - height, 125, height, '#15384a99', 3, '#8dcfce44');
      panel(ctx, x + 153, 335 - variation, 100, 255 + variation, '#2a586799', 3, '#a7dec333');
      for (let row = 0; row < 10; row += 1) {
        for (let window = 0; window < 4; window += 1) {
          panel(ctx, x + 35 + window * 26, 610 - height + row * 28, 11, 13,
            (window + row + building) % 4 ? '#7cbdc55a' : '#f8d78488', 1);
        }
      }
      line(ctx, [[x - 50,520],[x + 350,520]], '#90bab966', 12);
      line(ctx, [[x - 50,510],[x + 350,510]], '#e4f5cf55', 2);
      const train = x - 40 + (time * 18 + variation * 3) % 260;
      panel(ctx, train, 486, 100, 25, '#d7d2a988', 6);
      for (let window = 0; window < 5; window += 1) panel(ctx, train + 9 + window * 17, 492, 10, 10, '#27455799', 2);
      line(ctx, [[x + 188,145],[x + 188,255]], '#9de3d188', 2);
      oval(ctx, x + 188, 145, 5, 5, '#e3d79c88');
    } else if (theme === 'teams') {
      panel(ctx, x + 18, 45, 234, 610, '#2d385e66', 6, '#c9c8ee44');
      for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          const tileX = x + 30 + column * 72; const tileY = 74 + row * 106;
          panel(ctx, tileX, tileY, 64, 83, '#8293b144', 4, '#cfd7f322');
          oval(ctx, tileX + 32, tileY + 28, 10, 11, '#c5c8db55');
          panel(ctx, tileX + 16, tileY + 42, 32, 17, '#c5c8db44', 7);
          panel(ctx, tileX + 9, tileY + 70, 46, 3, '#c5c8db44', 1);
        }
      }
      panel(ctx, x + 262, 40, 8, 580, '#22345055', 0);
      const elevator = 170 + (Math.sin(time * .28 + building) + 1) * 150;
      panel(ctx, x + 252, elevator, 30, 54, '#c0d4e04a', 4, '#d1dafa55');
      for (let dot = 0; dot < 4; dot += 1) oval(ctx, x + 267, 84 + dot * 24, 3, 3, accent + '55');
    } else {
      server(ctx, x + 25, 170, 96, 430, '#82e7bb88');
      server(ctx, x + 180, 95, 96, 505, '#e9c17088');
      for (let circuit = 0; circuit < 5; circuit += 1) {
        const height = 140 + circuit * 85;
        line(ctx, [[x + 117,height],[x + 144,height],[x + 157,height + 26],[x + 179,height + 26]], '#8abaaa77', 3);
        panel(ctx, x + 140, height + 5, 6, 6, circuit % 2 ? '#e4c47c88' : '#8ff7d488', 1);
      }
    }
    ctx.restore();
  }
}

export function drawWorldBackground(ctx, mission, camera, time, reducedMotion, arena = false) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, mission.sky[0]); sky.addColorStop(1, mission.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const clock = reducedMotion ? 0 : time;
  const chapter = mission.world.zones.find(zone => camera + 400 >= zone.x && camera + 400 < zone.end);
  const theme = arena ? mission.theme : chapter?.theme ?? mission.theme;
  if (theme === 'campus') {
    oval(ctx, 1075, 95, 42, 42, '#fff9d1');
    for (let cloud = 0; cloud < 8; cloud += 1) {
      const x = ((cloud * 247 - camera * .08 + clock * 4) % 1560 + 1560) % 1560 - 120;
      const y = 95 + cloud % 3 * 52;
      oval(ctx, x, y, 70, 17, '#effdff77'); oval(ctx, x + 24, y - 14, 37, 26, '#ffffff77');
    }
  } else if (theme !== 'cowork' && theme !== 'teams') {
    for (let detail = 0; detail < 65; detail += 1) {
      const x = ((detail * 173 - camera * .04) % VIEW.width + VIEW.width) % VIEW.width;
      panel(ctx, x, 20 + detail * 67 % 240, detail % 7 ? 1 : 2, 1, '#d3f2e866', 0);
    }
  }
  ctx.save(); ctx.globalAlpha = .45;
  for (let building = -1; building < 10; building += 1) {
    const x = building * 170 - camera * .08 % 170;
    panel(ctx, x, 190 + Math.abs(building * 71 % 200), 124, 480, '#142d4255', 1);
  }
  ctx.restore();
  skyline(ctx, mission, camera, clock, theme);
  const haze = ctx.createLinearGradient(0, 565, 0, 720);
  haze.addColorStop(0, '#16394b00'); haze.addColorStop(1, theme === 'campus' ? '#e2f6edaa' : '#122936bb');
  ctx.fillStyle = haze; ctx.fillRect(0, 565, VIEW.width, 155);
  if (arena) {
    panel(ctx, 0, 0, VIEW.width, 150, '#0d20314a', 0);
    label(ctx, mission.boss.toUpperCase(), VIEW.width / 2, 58, 25, '#f4fcff', 'center');
    label(ctx, mission.title, VIEW.width / 2, 85, 13, mission.color, 'center');
  }
}

export function drawWorldPlatform(ctx, platform, mission, time, reducedMotion, highContrast = false) {
  const { x, y, w, h } = platform;
  const theme = platform.theme ?? mission.theme;
  ctx.save();
  panel(ctx, x + 5, y + 8, w, h + 8, '#081c3c45', 2);
  const side = ctx.createLinearGradient(0, y, 0, y + h);
  side.addColorStop(0, mission.ground[0]); side.addColorStop(1, mission.ground[1]);
  panel(ctx, x, y, w, h, side, theme === 'github' ? 7 : 3, '#122c4699');
  panel(ctx, x + 2, y, w - 4, 5, '#f0fff6', 1);
  const clock = reducedMotion ? 0 : time;
  for (let tile = 9; tile < w - 15; tile += 34) {
    if (theme === 'campus') {
      panel(ctx, x + tile, y + 8, 27, h - 13, '#eefaffaa', 3, '#31758b66');
      line(ctx, [[x + tile + 9,y + 13],[x + tile + 16,y + 13]], '#3f6d86', 1);
    } else if (theme === 'github') {
      line(ctx, [[x + tile,y + 16],[x + tile + 30,y + 16]], '#1e684f', 3);
      oval(ctx, x + tile + 13, y + 16, 4, 4, '#c6f5ce');
      line(ctx, [[x + tile + 13,y + 16],[x + tile + 24,y + 9]], '#2b7a59', 2);
    } else if (theme === 'cowork') {
      for (let page = 0; page < 3; page += 1) line(ctx, [[x + tile,y + 12 + page * 4],[x + tile + 25,y + 12 + page * 4]], '#f8f0d9aa', 1);
    } else if (theme === 'foundry') {
      const offset = (clock * 18) % 34;
      line(ctx, [[x + tile - offset,y + 8],[x + tile + 10 - offset,y + h - 6]], '#374f5d99', 7);
    } else if (theme === 'agents') {
      panel(ctx, x + tile, y + 12, 23, 6, '#194f6688', 1);
      panel(ctx, x + tile, y + 23, 23, 2, '#c1ffd088', 0);
    } else if (theme === 'teams') {
      panel(ctx, x + tile, y + 8, 26, 15, '#544b8488', 3);
      for (let dot = 0; dot < 3; dot += 1) oval(ctx, x + tile + 7 + dot * 6, y + 15, 1.5, 1.5, '#eee9ff');
    } else {
      line(ctx, [[x + tile,y + 10],[x + tile + 9,y + 18],[x + tile + 24,y + 18]], '#225d66', 2);
      oval(ctx, x + tile + 25, y + 18, 3, 3, '#f2d878');
    }
  }
  if (platform.motion) {
    line(ctx, [[x + 10,y],[x + 10,y - 75]], '#deeff96b', 2);
    line(ctx, [[x + w - 10,y],[x + w - 10,y - 75]], '#deeff96b', 2);
    panel(ctx, x + w / 2 - 10, y + h + 3, 20, 8, '#e8f8f3', 2);
  }
  if (platform.kind === 'secret') {
    panel(ctx, x + 9, y + h + 3, 28, 14, '#3b3d54', 2);
    label(ctx, 'x2', x + 23, y + h + 14, 10, '#ffdc87', 'center');
  }
  if (highContrast) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); }
  ctx.restore();
}

export function drawMissionObjects(ctx, state, visible) {
  const progress = state.missionProgress;
  if (!progress) return;
  for (const station of missionStations(state)) {
    if (!visible(station.x - 100, 260)) continue;
    const status = stationStatus(state, station);
    const complete = status === 'Complete';
    if (station.bridge && !complete) {
      const bridge = station.bridge;
      ctx.save(); ctx.setLineDash([10, 7]); ctx.strokeStyle = state.mission.color; ctx.lineWidth = 3;
      ctx.strokeRect(bridge.x, bridge.y, bridge.w, bridge.h); ctx.restore();
      label(ctx, 'PROPOSED', bridge.x + bridge.w / 2, bridge.y - 13, 10, state.mission.color, 'center');
    }
    panel(ctx, station.x - 13, station.y - 36, 26, 36, '#29475a', 3, '#7bafbd');
    panel(ctx, station.x - 31, station.y - 74, 62, 42, complete ? '#1b6559' : '#18394e', 5, state.mission.color);
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = complete ? '#a2ffe1' : '#f1d680';
    if (complete) line(ctx, [[station.x - 12,station.y - 54],[station.x - 3,station.y - 46],[station.x + 15,station.y - 63]], '#a2ffe1', 3);
    else {
      panel(ctx, station.x - 16, station.y - 62, 32, 3, state.mission.color, 1);
      panel(ctx, station.x - 16, station.y - 54, status.startsWith('Working') ? 25 : 18, 3, '#d1e4f2', 1);
      panel(ctx, station.x - 16, station.y - 46, 10, 3, '#d1e4f2', 1);
    }
    ctx.restore();
    label(ctx, station.title, station.x, station.y - 92, 12, '#f4fcff', 'center');
    if (progress.pulse > 0 || !['Ready','Complete'].includes(status)) {
      label(ctx, status, station.x, station.y - 112, 11, complete ? '#a3fbd5' : '#ffe19e', 'center');
    }
  }
  if (state.stage !== 'boss') for (const resource of state.world.resources ?? []) {
    if (progress.resources.has(resource.key) || !visible(resource.x, 70)) continue;
    panel(ctx, resource.x - 15, resource.y - 18, 30, 36, '#eef7e7', 3, '#548a83');
    panel(ctx, resource.x - 9, resource.y - 11, 18, 3, '#478881', 1);
    panel(ctx, resource.x - 9, resource.y - 4, 14, 3, '#478881', 1);
    label(ctx, '!', resource.x, resource.y + 12, 14, '#967536', 'center');
    if (progress.pulse > 0) label(ctx, resource.label, resource.x, resource.y - 30, 12, '#fff0aa', 'center');
  }
}

export function drawCampaignBoss(ctx, boss, mission, reducedMotion) {
  const time = reducedMotion ? 0 : boss.age;
  const exposed = boss.mode === 'exposed' && !boss.objectivesLocked;
  const color = exposed || boss.defeated ? '#9afbd0' : mission.color;
  const { x, y, w, h } = boss;
  ctx.save();
  if (boss.defeated) ctx.globalAlpha = Math.max(.25, 1 - (boss.defeatTime ?? 0) / 2.5);
  const metal = ctx.createLinearGradient(x, y, x + w, y + h);
  metal.addColorStop(0, '#d9eafa'); metal.addColorStop(.4, '#7593a8'); metal.addColorStop(1, '#253d52');
  const center = x + w / 2;
  if (mission.bossStyle === 'wizard') {
    for (const side of [-1, 1]) {
      const reach = side * (105 + Math.sin(time * 2) * 6);
      line(ctx, [[center + side * 50,y + 65],[center + reach,y + 95],[center + reach,y + 160]], '#203a55', 18);
      line(ctx, [[center + side * 50,y + 65],[center + reach,y + 95],[center + reach,y + 160]], '#a9c6d2', 10);
      panel(ctx, center + reach - 16, y + 147, 32, 23, '#d9f0e9', 5, color);
    }
    panel(ctx, x, y, w, h, metal, 14, color);
    panel(ctx, x + 20, y - 25, w - 40, 25, '#eef7ed', 6, color);
    panel(ctx, x + 18, y + 81, w - 36, 42, '#263c55', 4);
    for (let item = 0; item < 3; item += 1) panel(ctx, x + 29, y + 91 + item * 9, 75 - item * 16, 4, color, 1);
  } else if (mission.bossStyle === 'merge') {
    for (const side of [-1, 1]) {
      const gap = exposed ? 13 : 2;
      panel(ctx, center + (side < 0 ? -70 - gap : gap), y, 68, h, side < 0 ? '#528f75' : '#5876a6', 8, color);
      line(ctx, [[center + side * 52,y + 22],[center + side * 95,y - 16],[center + side * 116,y + 10]], color, 12);
      oval(ctx, center + side * 116, y + 10, 12, 12, '#def5d5');
    }
    line(ctx, [[center,y + 45],[center,y + 120]], exposed ? '#d0ffe7' : '#ddaf74', 8);
  } else if (mission.bossStyle === 'scope') {
    const expansion = 12 + Math.sin(time) * 7;
    for (const side of [-1, 1]) {
      panel(ctx, x + (side < 0 ? -expansion - 45 : w + expansion), y + 35, 44, 105, '#b28e7d', 3, '#f2d6a9');
      for (let floor = 0; floor < 4; floor += 1) panel(ctx, x + (side < 0 ? -expansion - 37 : w + expansion + 8), y + 44 + floor * 22, 28, 10, '#f2dec5', 2);
    }
    panel(ctx, x, y, w, h, '#c5a794', 5, '#ffe1af');
    panel(ctx, x + 12, y + 90, w - 24, 48, '#f1e3cf', 2);
    for (let note = 0; note < 3; note += 1) panel(ctx, x + 22 + note * 30, y + 103, 22, 25, ['#efbe77','#dc9cac','#9fd3c7'][note], 1);
  } else if (mission.bossStyle === 'foundry') {
    gear(ctx, x - 25, y + 110, 44, -time, '#c4b28c');
    gear(ctx, x + w + 23, y + 105, 39, time * 1.2, '#94bfc4');
    panel(ctx, x, y, w, h, metal, 5, color);
    for (let vent = 0; vent < 6; vent += 1) panel(ctx, x + 20, y + 86 + vent * 9, w - 40, 4, '#162e3f', 1);
    panel(ctx, x + 35, y - 36, 25, 36, '#b4c6cf', 2);
    panel(ctx, x + 85, y - 24, 20, 24, '#b4c6cf', 2);
  } else if (mission.bossStyle === 'planner') {
    panel(ctx, x, y, w, h, '#345d66', 9, color);
    for (let task = 0; task < 4; task += 1) {
      const position = time * .3 + task * Math.PI / 2;
      const taskX = center + Math.cos(position) * 122;
      const taskY = y + h / 2 + Math.sin(position) * 88;
      line(ctx, [[center,y + 85],[taskX,taskY]], '#86cfc588', 2);
      panel(ctx, taskX - 22, taskY - 14, 44, 28, '#d8e7cd', 3, '#7bbbb5');
      line(ctx, [[taskX - 13,taskY - 3],[taskX + 13,taskY - 3]], '#43767a', 2);
    }
  } else if (mission.bossStyle === 'meeting') {
    for (const side of [-1, 1]) {
      panel(ctx, center + side * 105 - 28, y + 35, 56, 120, '#394362', 5, '#b7b3e7');
      for (const height of [65,118]) {
        oval(ctx, center + side * 105, y + height, 21, 21, '#182d44');
        oval(ctx, center + side * 105, y + height, 12, 12, '#a3a8c8');
        oval(ctx, center + side * 105, y + height, 5, 5, '#375276');
      }
    }
    panel(ctx, x, y, w, h, metal, 8, color);
    panel(ctx, x + 18, y + 90, w - 36, 42, '#3b466b', 4);
    for (let sound = 0; sound < 9; sound += 1) {
      const height = 6 + Math.abs(Math.sin(time * 4 + sound)) * 22;
      panel(ctx, x + 26 + sound * 10, y + 112 - height / 2, 5, height, color, 1);
    }
  } else {
    panel(ctx, x - 9, y - 32, w + 18, h + 45, '#122a3c', 2, color);
    for (let plate = 0; plate < 7; plate += 1) {
      panel(ctx, x + 8, y + 64 + plate * 12, w - 16, 8, '#587e89', 1);
      panel(ctx, x + 18, y + 66 + plate * 12, 4, 3, plate % 2 ? '#ffcc6c' : '#8ee9cf', 0);
    }
    for (const side of [-1, 1]) line(ctx, [[center + side * 70,y + 75],[center + side * 135,y + 115],[center + side * 135,y + 165]], '#97b8c0', 14);
  }
  panel(ctx, x + 15, y + 14, w - 30, 48, '#11283a', 8, color);
  for (const side of [-1, 1]) {
    const eyeX = center + side * 24;
    if (boss.defeated) line(ctx, [[eyeX - 8,y + 34],[eyeX,y + 41],[eyeX + 10,y + 28]], '#bcffdc', 3);
    else {
      oval(ctx, eyeX, y + 36, exposed ? 10 : 12, boss.mode === 'warning' ? 5 : 10, color);
      oval(ctx, eyeX + boss.lookX * 3, y + 37, 3, 5, '#17324b');
    }
  }
  if (!boss.defeated) {
    ctx.strokeStyle = exposed ? '#caffdc' : '#99bbd0'; ctx.lineWidth = exposed ? 3 : 1;
    ctx.strokeRect(x, y, w, h);
  }
  label(ctx, boss.defeated ? 'RESTORED' : boss.objectivesLocked ? 'SYSTEMS LOCKED' : exposed ? 'EXPOSED' : 'SHIELDED',
    center, y + h + 24, 12, color, 'center');
  ctx.restore();
}
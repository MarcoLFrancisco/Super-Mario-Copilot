import { VIEW, PHYSICS as P } from './level.js';

// Presentation only. Accepts party-dialogue.js's current caption and the
// currently present actors. Does not infer unlocks, advance timers, or speak.
const LABELS = Object.freeze({ marco: 'Marco', mario: 'Mario', donkey: 'Donkey' });
const COLORS = Object.freeze({ marco: '#087f86', mario: '#b5283d', donkey: '#685179' });
const FONT = '"Segoe UI", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

function characters(text) {
  return segmenter ? Array.from(segmenter.segment(text), part => part.segment)
    : Array.from(text);
}

// Preserve whole emoji graphemes where the browser supports segmentation.
// Long tokens are split only when necessary; ordinary text wraps at spaces.
export function wrapBubbleText(ctx, text, maxWidth) {
  if (!(maxWidth > 0)) return [];
  const lines = [];
  let line = '';
  for (const word of String(text).trim().split(/\s+/u).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) { lines.push(line); line = ''; }
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    for (const character of characters(word)) {
      if (line && ctx.measureText(line + character).width > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundedBox(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Call after world artwork. This function sets its own logical viewport
 * transform, so the caller may currently have a camera translation applied.
 * cameraX must be 0 in the arena, otherwise the renderer's world camera.
 * options.topInset can reserve space for another overlay. The caller should
 * suppress party captions while boss dialogue is displayed.
 * Returns balloon bounds in VIEW coordinates, or null when nothing is drawn.
 * The HTML transcript remains a separate integration responsibility.
 */
export function drawPartyBubble(ctx, caption, actors, cameraX = 0, options = {}) {
  if (!caption || !(caption.remaining > 0) || !caption.text) return null;
  if (!Object.hasOwn(LABELS, caption.character)) return null;
  const actor = actors.find(item => item.id === caption.character);
  if (!actor || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return null;
  const screenX = actor.x - cameraX;
  // Never attach an on-screen balloon to an invisible/off-screen companion.
  if (screenX + P.playerWidth <= 0 || screenX >= VIEW.width
      || actor.y + P.playerHeight <= 0 || actor.y >= VIEW.height) return null;
  const margin = 14;
  const top = Math.max(margin, Number.isFinite(options.topInset) ? options.topInset : margin);
  const availableHeight = VIEW.height - top - margin;
  if (availableHeight < 100) return null;
  const padding = 15;
  const width = Math.min(360, VIEW.width - margin * 2);
  const textWidth = width - padding * 2;
  const center = screenX + P.playerWidth / 2;
  ctx.save();
  try {
    ctx.setTransform(ctx.canvas.width / VIEW.width, 0, 0,
      ctx.canvas.height / VIEW.height, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    let size = 18;
    let lineHeight;
    let lines;
    let height;
    do {
      ctx.font = `500 ${size}px ${FONT}`;
      lines = wrapBubbleText(ctx, caption.text, textWidth);
      lineHeight = size + 5;
      height = padding * 2 + 25 + lines.length * lineHeight;
      if (height <= availableHeight || size === 14) break;
      size--;
    } while (size >= 14);
    // Do not silently truncate dialogue if a future caption exceeds the space.
    // The accessible transcript can still expose it when integration is added.
    if (height > availableHeight) return null;
    const x = clamp(center - width / 2, margin, VIEW.width - margin - width);
    const above = actor.y - height - 22;
    const below = actor.y + P.playerHeight + 22;
    const y = above >= top ? above
      : below + height <= VIEW.height - margin ? below
        : clamp(above, top, VIEW.height - margin - height);
    const color = COLORS[caption.character];
    const isAbove = y + height <= actor.y;
    const isBelow = y >= actor.y + P.playerHeight;
    ctx.fillStyle = '#f5fbff';
    ctx.strokeStyle = color;
    if (isAbove || isBelow) {
      const baseX = clamp(center, x + 23, x + width - 23);
      const baseY = isAbove ? y + height : y;
      const tipY = isAbove ? actor.y - 4 : actor.y + P.playerHeight + 4;
      ctx.beginPath();
      ctx.moveTo(baseX - 9, baseY);
      ctx.lineTo(clamp(center, margin, VIEW.width - margin), tipY);
      ctx.lineTo(baseX + 9, baseY);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    roundedBox(ctx, x, y, width, height, 13);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `700 15px ${FONT}`;
    ctx.fillText(LABELS[caption.character], x + padding, y + padding);
    ctx.fillStyle = '#14243b';
    ctx.font = `500 ${size}px ${FONT}`;
    lines.forEach((line, index) => {
      ctx.fillText(line, x + padding, y + padding + 25 + index * lineHeight);
    });
    return { x, y, w: width, h: height, character: caption.character };
  } finally {
    ctx.restore();
  }
}

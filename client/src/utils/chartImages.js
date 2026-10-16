// Draws the dashboard charts onto a canvas and returns PNGs for the Excel
// export (spreadsheet libraries can't create native charts). Rendered at 2x
// for crisp images; callers place them at half size. Light theme only.

const FONT = '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
const INK = '#0f1f1e';
const INK2 = '#4a5a58';
const MUTED = '#7c8a88';
const ACCENT = '#0d9488';
const SCALE = 2;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w * SCALE;
  c.height = h * SCALE;
  const ctx = c.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'middle';
  return { c, ctx };
}

const done = (c) => ({ dataUrl: c.toDataURL('image/png'), width: c.width, height: c.height });
const nf = new Intl.NumberFormat('en-IN');

function fitText(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

// slices: [{ label, count, share, color: 'RRGGBB' }]
export function donutChartPng(slices, total) {
  const W = 620;
  const H = 260;
  const { c, ctx } = canvas(W, H);
  if (!slices.length || !total) {
    ctx.fillStyle = MUTED;
    ctx.font = `14px ${FONT}`;
    ctx.fillText('No surgeries recorded', 24, H / 2);
    return done(c);
  }
  const cx = 130;
  const cy = H / 2;
  const R = 105;
  const r = R * 0.62;
  let a = -Math.PI / 2;
  for (const s of slices) {
    const sweep = (s.count / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, a, a + sweep);
    ctx.arc(cx, cy, r, a + sweep, a, true);
    ctx.closePath();
    ctx.fillStyle = `#${s.color}`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    a += sweep;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText(nf.format(total), cx, cy - 8);
  ctx.fillStyle = MUTED;
  ctx.font = `12px ${FONT}`;
  ctx.fillText('surgeries', cx, cy + 16);

  ctx.textAlign = 'left';
  const top = cy - (slices.length * 32) / 2 + 16;
  slices.forEach((s, i) => {
    const y = top + i * 32;
    ctx.fillStyle = `#${s.color}`;
    ctx.beginPath();
    ctx.roundRect(270, y - 6, 12, 12, 3);
    ctx.fill();
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = INK2;
    ctx.fillText(fitText(ctx, s.label, 190), 292, y);
    ctx.font = `700 14px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(nf.format(s.count), 540, y);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(`${(s.share * 100).toFixed(s.share < 0.1 ? 1 : 0)}%`, 600, y);
    ctx.textAlign = 'left';
  });
  return done(c);
}

// rows: [{ label, count }] -> horizontal bars, value at the tip
export function barChartPng(rows, unit = '') {
  const W = 620;
  const rowH = 34;
  const H = Math.max(80, rows.length * rowH + 24);
  const { c, ctx } = canvas(W, H);
  if (!rows.length) {
    ctx.fillStyle = MUTED;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`No ${unit ? 'instruments' : 'data'} recorded`, 24, H / 2);
    return done(c);
  }
  const labelW = 200;
  const x0 = labelW + 12;
  const maxW = W - x0 - 56;
  const max = Math.max(...rows.map((r) => r.count), 1);
  ctx.strokeStyle = '#c9d4d2';
  ctx.beginPath();
  ctx.moveTo(x0, 8);
  ctx.lineTo(x0, H - 12);
  ctx.stroke();
  rows.forEach((r, i) => {
    const y = 12 + i * rowH + rowH / 2;
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = INK2;
    ctx.textAlign = 'right';
    ctx.fillText(fitText(ctx, r.label, labelW - 4), labelW, y);
    const w = Math.max(2, (r.count / max) * maxW);
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.roundRect(x0, y - 10, w, 20, [0, 4, 4, 0]);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(nf.format(r.count), x0 + w + 6, y);
  });
  return done(c);
}

// rows: [{ label, count }] -> vertical columns (monthly trend), value above
export function columnChartPng(rows) {
  const W = 620;
  const H = 240;
  const { c, ctx } = canvas(W, H);
  if (!rows.length) {
    ctx.fillStyle = MUTED;
    ctx.font = `14px ${FONT}`;
    ctx.fillText('No dated surgeries in this period', 24, H / 2);
    return done(c);
  }
  const left = 40;
  const bottom = H - 34;
  const top = 24;
  const plotW = W - left - 12;
  // round the axis up to a clean 1/2/5 x 10^k step so ticks read 0, 5, 10, 15, 20
  const raw = Math.max(...rows.map((r) => r.count), 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => s >= raw);
  const max = step * 4;
  const slot = plotW / rows.length;
  const barW = Math.max(3, Math.min(34, slot * 0.6));
  // light gridlines at quarter steps
  ctx.strokeStyle = '#e3eae8';
  ctx.fillStyle = MUTED;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = bottom - ((bottom - top) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(W - 12, y);
    ctx.stroke();
    ctx.fillText(nf.format(step * i), left - 6, y);
  }
  const every = Math.ceil(rows.length / 12); // at most ~12 x labels
  rows.forEach((r, i) => {
    const x = left + slot * i + (slot - barW) / 2;
    const h = ((bottom - top) * r.count) / max;
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.roundRect(x, bottom - h, barW, Math.max(h, r.count ? 2 : 0), [4, 4, 0, 0]);
    ctx.fill();
    ctx.textAlign = 'center';
    if (rows.length <= 18 && r.count) {
      ctx.fillStyle = INK;
      ctx.font = `600 11px ${FONT}`;
      ctx.fillText(nf.format(r.count), x + barW / 2, bottom - h - 9);
    }
    if (i % every === 0) {
      ctx.fillStyle = MUTED;
      ctx.font = `11px ${FONT}`;
      ctx.fillText(r.label, x + barW / 2, bottom + 16);
    }
  });
  return done(c);
}

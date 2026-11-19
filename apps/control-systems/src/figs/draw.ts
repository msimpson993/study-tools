/** Hand-drawn pictures of the three running examples (house, car corner, antenna dish) and small block diagrams, in canvas pixels. */
import { text, col } from '@study/core';

type G = CanvasRenderingContext2D;
const line = (g: G, x1: number, y1: number, x2: number, y2: number, c: string, w = 2, dash: number[] = []) => { g.save(); g.strokeStyle = c; g.lineWidth = w; g.setLineDash(dash); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore(); };
export function arrowPx(g: G, x1: number, y1: number, x2: number, y2: number, c: string, w = 2, head = 7) {
  line(g, x1, y1, x2, y2, c, w); const a = Math.atan2(y2 - y1, x2 - x1);
  g.save(); g.fillStyle = c; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4)); g.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4)); g.closePath(); g.fill(); g.restore();
}
const rect = (g: G, x: number, y: number, w: number, h: number, stroke: string, fill?: string, lw = 1.6) => { g.save(); if (fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); } g.strokeStyle = stroke; g.lineWidth = lw; g.strokeRect(x, y, w, h); g.restore(); };
const alpha = (g: G, a: number, fn: () => void) => { g.save(); g.globalAlpha = a; fn(); g.restore(); };

/* ───────── house: two rooms side by side, heater in room 1 (living), bedroom = room 2 ───────── */
export interface HouseOpts { t1?: number; t2?: number; flows?: { heater: number; between: number; leak1: number; leak2: number }; thermostat?: boolean; sun?: boolean; stored?: [number, number]; labels?: boolean; dim?: number }
export function drawHouse(g: G, x: number, y: number, w: number, h: number, o: HouseOpts = {}) {
  const roofH = h * 0.22, bodyY = y + roofH, bodyH = h - roofH - 4, half = w / 2;
  alpha(g, o.dim ?? 1, () => {
    g.save(); g.strokeStyle = col.text(); g.lineWidth = 1.8; g.beginPath(); g.moveTo(x - 4, bodyY); g.lineTo(x + half, y); g.lineTo(x + w + 4, bodyY); g.stroke(); g.restore();
    const heat = (T: number | undefined) => (T === undefined ? undefined : `rgba(255,${Math.round(190 - Math.min(1, T / 25) * 120)},80,${0.12 + Math.min(1, T / 25) * 0.32})`);
    rect(g, x, bodyY, half, bodyH, col.text(), heat(o.t1)); rect(g, x + half, bodyY, half, bodyH, col.text(), heat(o.t2));
    const fs = Math.max(9, Math.min(11, w / 22));
    if (o.labels !== false) { text(g, 'living (1)', x + half / 2, bodyY + 10, col.muted(), 'center', fs); text(g, 'bedroom (2)', x + half * 1.5, bodyY + 10, col.muted(), 'center', fs); }
    if (o.t1 !== undefined) text(g, `${o.t1.toFixed(1)} K`, x + half / 2, bodyY + bodyH * 0.55, col.text(), 'center', fs + 1);
    if (o.t2 !== undefined) text(g, `${o.t2.toFixed(1)} K`, x + half * 1.5, bodyY + bodyH * 0.55, col.text(), 'center', fs + 1);
    // heater (in room 1, bottom left)
    rect(g, x + 6, bodyY + bodyH - 14, Math.min(26, half * 0.3), 9, col.bad(), 'rgba(255,90,90,.35)', 1.2);
    if (o.flows) {
      const F = o.flows, sc = (W: number) => Math.max(1, Math.min(7, W / 400));
      if (F.heater > 1) arrowPx(g, x + 20, bodyY + bodyH - 16, x + 20, bodyY + bodyH * 0.72, col.bad(), sc(F.heater));
      if (Math.abs(F.between) > 1) arrowPx(g, x + half - 16, bodyY + bodyH * 0.78, x + half + 16, bodyY + bodyH * 0.78, col.b(), sc(Math.abs(F.between)));
      if (F.leak1 > 1) arrowPx(g, x + 2, bodyY + bodyH * 0.35, x - 16, bodyY + bodyH * 0.35, col.a(), sc(F.leak1));
      if (F.leak2 > 1) arrowPx(g, x + w - 2, bodyY + bodyH * 0.35, x + w + 16, bodyY + bodyH * 0.35, col.a(), sc(F.leak2));
    }
    if (o.thermostat) { rect(g, x + w - 18, bodyY + bodyH * 0.45, 10, 14, col.c(), 'rgba(110,226,110,.25)', 1.2); }
    if (o.sun) { g.save(); g.fillStyle = col.e(); g.beginPath(); g.arc(x + w - 6, y + 4, 7, 0, 2 * Math.PI); g.fill(); g.restore(); }
    if (o.stored) { const bh = bodyH * 0.35; [0, 1].forEach((i) => { const f = Math.max(0, Math.min(1, o.stored![i])); rect(g, x + half * i + half - 14, bodyY + bodyH - 6 - bh, 6, bh, col.muted()); g.save(); g.fillStyle = col.b(); g.fillRect(x + half * i + half - 14, bodyY + bodyH - 6 - bh * f, 6, bh * f); g.restore(); }); }
  });
}

/* ───────── car corner: body (mass) on spring + shock over a wheel on the road ───────── */
export interface CornerOpts { z?: number; road?: number; ghostZ?: number; force?: number; wheel?: boolean; actuator?: boolean; scale?: number; dim?: number; labels?: boolean }
export function drawCorner(g: G, x: number, y: number, w: number, h: number, o: CornerOpts = {}) {
  const sc = o.scale ?? h * 2.2, zPx = (o.z ?? 0) * sc, rPx = (o.road ?? 0) * sc, cx = x + w / 2, bw = Math.min(w * 0.7, 120), bh = h * 0.2;
  const roadY = y + h - 6 - rPx, wheelR = Math.min(h * 0.11, 16), wheelY = roadY - wheelR, bodyY0 = y + h * 0.12, bodyY = bodyY0 - zPx;
  alpha(g, o.dim ?? 1, () => {
    line(g, x, y + h - 6, x + w * 0.35, y + h - 6, col.muted(), 2); line(g, x + w * 0.35, y + h - 6, x + w * 0.35, roadY, col.muted(), 2); line(g, x + w * 0.35, roadY, x + w, roadY, col.muted(), 2);
    g.save(); g.strokeStyle = col.text(); g.lineWidth = 2; g.beginPath(); g.arc(cx, wheelY, wheelR, 0, 2 * Math.PI); g.stroke(); g.restore();
    if (o.ghostZ !== undefined) { g.save(); g.setLineDash([4, 3]); g.strokeStyle = col.muted(); g.strokeRect(cx - bw / 2, bodyY0 - o.ghostZ * sc, bw, bh); g.restore(); }
    rect(g, cx - bw / 2, bodyY, bw, bh, col.text(), 'rgba(120,170,255,.18)');
    if (o.labels !== false) text(g, `body ${''}`.trim(), cx, bodyY + bh / 2, col.text(), 'center', Math.max(9, Math.min(11, w / 14)));
    // spring (zig-zag) left, shock (piston) right, between body bottom and wheel top
    const top = bodyY + bh, bot = wheelY - wheelR - 2, sx = cx - bw * 0.25, dx = cx + bw * 0.25, n = 6;
    g.save(); g.strokeStyle = col.c(); g.lineWidth = 1.8; g.beginPath(); g.moveTo(sx, top);
    for (let i = 1; i <= n; i++) g.lineTo(sx + (i % 2 ? 7 : -7), top + ((bot - top) * i) / (n + 1)); g.lineTo(sx, bot); g.stroke(); g.restore();
    const mid = (top + bot) / 2; line(g, dx, top, dx, mid + 4, col.b(), 1.8); rect(g, dx - 6, mid - 2, 12, bot - mid + 2, col.b()); line(g, dx - 4, mid + 4, dx + 4, mid + 4, col.b(), 2);
    line(g, sx, bot, dx, bot, col.text(), 1.4); line(g, cx, bot, cx, wheelY, col.text(), 1.4);
    if (o.actuator) { line(g, cx, top, cx, bot, col.d(), 3, [4, 3]); }
    if (o.force) { const L = Math.max(10, Math.min(36, Math.abs(o.force) / 40)); arrowPx(g, cx, bodyY - 2 - (o.force > 0 ? 0 : L), cx, bodyY - 2 - (o.force > 0 ? L : 0) + (o.force > 0 ? 0 : 0), col.e(), 2); }
    if (o.labels !== false) { text(g, 'k', sx - 12, mid, col.c(), 'right', 10); text(g, 'c', dx + 11, mid, col.b(), 'left', 10); }
  });
}

/* ───────── antenna dish on an azimuth pedestal, seen from above: dish angle θ, satellite direction r ───────── */
export interface DishOpts { theta?: number; ref?: number; wind?: boolean; torque?: number; dim?: number; scale?: number; labels?: boolean }
export function drawDish(g: G, x: number, y: number, w: number, h: number, o: DishOpts = {}) {
  const cx = x + w / 2, cy = y + h * 0.62, R = Math.min(w, h) * 0.42, s = o.scale ?? 1;
  const ang = (a: number) => -Math.PI / 2 + a * s; // 0 rad points up
  alpha(g, o.dim ?? 1, () => {
    g.save(); g.strokeStyle = col.muted(); g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.arc(cx, cy, R, -Math.PI * 0.95, -Math.PI * 0.05); g.stroke(); g.restore();
    if (o.ref !== undefined) { const a = ang(o.ref); line(g, cx, cy, cx + R * 1.08 * Math.cos(a), cy + R * 1.08 * Math.sin(a), col.e(), 1.4, [5, 3]); g.save(); g.fillStyle = col.e(); g.beginPath(); g.arc(cx + R * 1.12 * Math.cos(a), cy + R * 1.12 * Math.sin(a), 4, 0, 2 * Math.PI); g.fill(); g.restore(); if (o.labels !== false) text(g, 'satellite', cx + R * 1.12 * Math.cos(a) + 7, cy + R * 1.12 * Math.sin(a) - 7, col.e(), 'left', 10); }
    const a = ang(o.theta ?? 0), ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, dR = R * 0.55;
    // dish: an arc facing direction a
    g.save(); g.strokeStyle = col.a(); g.lineWidth = 3; g.beginPath(); g.arc(cx - ux * dR * 0.3, cy - uy * dR * 0.3, dR * 0.75, a - 1.0, a + 1.0); g.stroke(); g.restore();
    line(g, cx, cy, cx + ux * dR * 0.75, cy + uy * dR * 0.75, col.a(), 1.6); // feed arm
    g.save(); g.fillStyle = col.text(); g.beginPath(); g.arc(cx, cy, 4.5, 0, 2 * Math.PI); g.fill(); g.restore();
    rect(g, cx - 12, cy + 6, 24, 10, col.muted()); if (o.labels !== false) text(g, 'motor', cx, cy + 24, col.muted(), 'center', 9.5);
    if (o.torque) { const sgn = Math.sign(o.torque); g.save(); g.strokeStyle = col.b(); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 14, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9, sgn < 0); g.stroke(); g.restore(); }
    if (o.wind) { for (let i = 0; i < 3; i++) arrowPx(g, x + 4, y + 12 + i * 9, x + w * 0.28, y + 12 + i * 9, col.d(), 1.5, 5); if (o.labels !== false) text(g, 'wind', x + 4, y + 44, col.d(), 'left', 9.5); }
  });
}

/* ───────── block diagrams: a row of boxes with a feedback path ───────── */
export interface Block { label: string; color?: string; hi?: boolean; dim?: boolean }
export interface LoopDiagram { input: string; output: string; blocks: Block[]; feedback?: Block | true | null; dist?: string; sum?: boolean; noise?: string; hiSum?: boolean }
export function drawLoop(g: G, x: number, y: number, w: number, h: number, d: LoopDiagram, size = 10.5) {
  const n = d.blocks.length, midY = y + h * 0.35, inW = Math.max(26, Math.min(60, w * 0.12)), sumR = d.sum === false ? 0 : 8;
  const x0 = x + inW, x1 = x + w - inW, sumX = x0 + sumR, gap = 10, avail = x1 - (sumX + sumR + gap) - gap * n, bw = avail / n, bh = Math.min(30, h * 0.36);
  g.font = `${size}px system-ui, sans-serif`;
  text(g, d.input, x + 2, midY - 10, col.text(), 'left', size); arrowPx(g, x + 2, midY, sumX - sumR, midY, col.text(), 1.4, 6);
  if (sumR) { g.save(); g.strokeStyle = d.hiSum ? col.e() : col.text(); g.lineWidth = 1.5; g.beginPath(); g.arc(sumX, midY, sumR, 0, 2 * Math.PI); g.stroke(); g.restore(); text(g, '+', sumX - 10, midY - 9, col.muted(), 'center', 9); if (d.feedback) text(g, '−', sumX - 10, midY + 11, col.muted(), 'center', 10); }
  let cx = sumX + sumR + gap;
  d.blocks.forEach((b, i) => {
    alpha(g, b.dim ? 0.3 : 1, () => { rect(g, cx, midY - bh / 2, bw, bh, b.hi ? col.e() : b.color ?? col.text(), b.hi ? 'rgba(255,214,90,.12)' : undefined, b.hi ? 2.2 : 1.5); for (const [j, l] of fitLines(g, b.label, bw - 6, size).entries()) text(g, l, cx + bw / 2, midY + (j - (fitLines(g, b.label, bw - 6, size).length - 1) / 2) * (size + 2), b.hi ? col.e() : b.color ?? col.text(), 'center', size); });
    const nx = cx + bw + gap; arrowPx(g, cx + bw, midY, i === n - 1 ? x1 : nx, midY, col.text(), 1.4, 6);
    if (d.dist && i === n - 1) { arrowPx(g, cx - gap / 2, midY - h * 0.32, cx - gap / 2, midY - 4, col.d(), 1.4, 5); text(g, d.dist, cx - gap / 2, midY - h * 0.32 - 7, col.d(), 'center', size - 1); }
    cx = nx;
  });
  text(g, d.output, x1 + 4, midY - 10, col.text(), 'left', size);
  if (d.feedback) {
    const fbY = y + h * 0.82, xr = x1 - 6;
    line(g, xr, midY, xr, fbY, col.text(), 1.4);
    if (d.feedback === true) { line(g, xr, fbY, sumX, fbY, col.text(), 1.4); }
    else { const fw = Math.min(110, w * 0.3), fx = (sumX + xr) / 2 - fw / 2, b = d.feedback; line(g, xr, fbY, fx + fw, fbY, col.text(), 1.4); alpha(g, b.dim ? 0.3 : 1, () => { rect(g, fx, fbY - 12, fw, 24, b.hi ? col.e() : b.color ?? col.text(), undefined, b.hi ? 2.2 : 1.5); text(g, b.label, fx + fw / 2, fbY, b.hi ? col.e() : b.color ?? col.text(), 'center', size); }); line(g, fx, fbY, sumX, fbY, col.text(), 1.4); }
    arrowPx(g, sumX, fbY, sumX, midY + sumR, col.text(), 1.4, 6);
    if (d.noise) { text(g, d.noise, xr + 2, (midY + fbY) / 2, col.d(), 'left', size - 1); }
  }
}
function fitLines(g: G, s: string, maxW: number, size: number): string[] {
  g.font = `${size}px system-ui, sans-serif`; if (g.measureText(s).width <= maxW) return [s];
  const words = s.split(' '); const out: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}

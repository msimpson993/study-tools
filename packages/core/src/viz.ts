import { cssVar } from './plot';
import { labelRole, labelsOn, labelOverlaps, freeSpot, resetLabels, withLabelRole, labelGen, type LabelRect } from './labels';
import { mountFigure, type FigurePanel, type FigureMountOpts } from './figure';
import type { ControlSet } from './controls';
import type { FigureDef } from './types';

/**
 * Reusable drawing primitives for "picture first" figures (plane transformations, phasors, s-planes, heat maps).
 * All coordinates are *math* coordinates; a Frame maps them to CSS pixels with y pointing up.
 */
export type V2 = [number, number];
export type M2 = [[number, number], [number, number]];
export interface Frame { X(x: number): number; Y(y: number): number; ix(px: number): number; iy(py: number): number; w: number; h: number; sx: number; sy: number; box: { l: number; t: number; r: number; b: number } }

export const mulV = (M: M2, v: V2): V2 => [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
export const lerpM = (A: M2, B: M2, t: number): M2 => [[A[0][0] + (B[0][0] - A[0][0]) * t, A[0][1] + (B[0][1] - A[0][1]) * t], [A[1][0] + (B[1][0] - A[1][0]) * t, A[1][1] + (B[1][1] - A[1][1]) * t]];
export const IDENT: M2 = [[1, 0], [0, 1]];
export const det2 = (M: M2) => M[0][0] * M[1][1] - M[0][1] * M[1][0];
export const inv2 = (M: M2): M2 => { const d = det2(M) || 1e-12; return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]]; };
export const mm2 = (A: M2, B: M2): M2 => [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];

export const col = {
  text: () => cssVar('--text'), muted: () => cssVar('--muted'), grid: () => cssVar('--border'), strong: () => cssVar('--border-strong'),
  a: () => cssVar('--cyan'), b: () => cssVar('--org'), c: () => cssVar('--grn'), d: () => cssVar('--vio'), e: () => cssVar('--yel'), bad: () => cssVar('--bad'), ok: () => cssVar('--ok'), accent: () => cssVar('--accent'),
};

/** Equal-aspect frame (a unit step is the same length in x and y) centred on (cx, cy) showing at least ±r in both directions. */
export function planeFrame(w: number, h: number, r = 3, cx = 0, cy = 0, pad = 8, equal = true): Frame {
  const l = pad, t = pad, rr = Math.max(l + 1, w - pad), b = Math.max(t + 1, h - pad);
  const bw = Math.max(1, rr - l), bh = Math.max(1, b - t);
  const s = equal ? Math.min(bw, bh) / (2 * r) : 0;
  const sx = equal ? s : bw / (2 * r), sy = equal ? s : bh / (2 * r);
  const mx = l + bw / 2, my = t + bh / 2;
  return { w, h, sx, sy, box: { l, t, r: rr, b }, X: (x) => mx + (x - cx) * sx, Y: (y) => my - (y - cy) * sy, ix: (px) => cx + (px - mx) / sx, iy: (py) => cy - (py - my) / sy };
}
/** Free frame with independent x/y ranges (used for ordinary graphs inside a figure). */
export function rangeFrame(w: number, h: number, xr: V2, yr: V2, L = 40, R = 10, T = 8, B = 28): Frame {
  const bw = Math.max(1, w - L - R), bh = Math.max(1, h - T - B);
  const dx = (xr[1] - xr[0]) || 1, dy = (yr[1] - yr[0]) || 1;
  const sx = bw / dx, sy = bh / dy;
  return { w, h, sx, sy, box: { l: L, t: T, r: L + bw, b: T + bh }, X: (x) => L + (x - xr[0]) * sx, Y: (y) => T + bh - (y - yr[0]) * sy, ix: (px) => xr[0] + (px - L) / sx, iy: (py) => yr[0] + (T + bh - py) / sy };
}

export function wipe(g: CanvasRenderingContext2D, w: number, h: number) { g.setLineDash([]); g.clearRect(0, 0, w, h); resetLabels(g.canvas); }
export function clipBox(g: CanvasRenderingContext2D, f: Frame) { g.beginPath(); g.rect(f.box.l, f.box.t, f.box.r - f.box.l, f.box.b - f.box.t); g.clip(); }

/** Where a label of this size fits inside the canvas: shrinks it (to 72% at most), then slides it in from the edge, then splits it
 * into two lines, so an in-plot note never runs off the panel. Works in device pixels, so translated or scaled sub-panels are handled. */
export interface TextFit { size: number; x: number; lines: string[]; x0: number; x1: number }
export function fitText(g: CanvasRenderingContext2D, s: string, x: number, align: CanvasTextAlign, size: number): TextFit {
  const font = (z: number) => `${z}px system-ui,sans-serif`;
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null;
  const k = m && m.a > 0 ? m.a : 1, e = m ? m.e : 0, W = (g.canvas?.width || Infinity) / k, ox = -e / k; // canvas in user units: [ox, ox + W]
  const lo = ox + 2, hi = ox + W - 2;
  const span = (w: number, xx: number) => (align === 'center' ? [xx - w / 2, xx + w / 2] : align === 'right' || align === 'end' ? [xx - w, xx] : [xx, xx + w]);
  g.font = font(size); let w = g.measureText(s).width, z = size, lines = [s];
  if (m && (Math.abs(m.b) > 1e-9 || Math.abs(m.c) > 1e-9)) { const [r0, r1] = span(w, x); return { size, x, lines, x0: r0, x1: r1 }; } // rotated (axis titles): leave as drawn
  const room = (() => { const [a0, a1] = span(w, x); return w - Math.max(0, lo - a0) - Math.max(0, a1 - hi); })();
  if (w > room + 0.5 && Number.isFinite(W)) {
    z = Math.max(size * 0.72, size * Math.max(room, 1) / w); g.font = font(z); w = g.measureText(s).width;
    if (w > hi - lo) { // still wider than the whole panel: two lines, split at the space nearest the middle
      const sp = [...s.matchAll(/ /g)].map((q) => q.index as number); const mid = s.length / 2;
      const cut = sp.length ? sp.reduce((p, q) => (Math.abs(q - mid) < Math.abs(p - mid) ? q : p)) : -1;
      if (cut > 0) { lines = [s.slice(0, cut), s.slice(cut + 1)]; w = Math.max(...lines.map((l) => g.measureText(l).width)); }
    }
  }
  let [a0, a1] = span(w, x);
  if (a0 < lo) { x += lo - a0; } else if (a1 > hi) { x -= a1 - hi; }
  [a0, a1] = span(w, x);
  return { size: z, x, lines, x0: a0, x1: a1 };
}
/** The canvas is a compact tile, not the expanded overlay or a full-size fig box. */
export function isTileCanvas(g: CanvasRenderingContext2D): boolean {
  const cv = g.canvas as HTMLCanvasElement | undefined;
  return !!cv && typeof cv.closest === 'function' && !!cv.closest('.tile-frame') && !cv.closest('.fig-overlay, .fig-box');
}
const TILE_MIN_W = 200, TILE_MIN_H = 140;
/** Reserved band above a labelled plot for the header readout. */
export const PLOT_HEAD = 34;
/** Phone portrait (the 2-across tile layout). */
export function isPortraitPhone(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 699.98px)').matches;
}
/** Short landscape phones (e.g. 844×390), not a tall tablet. */
export function isLandscapePhone(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
}
/** Hide crowded notes and axis titles on any phone (portrait or short landscape), or a tile too small to fit them (~200×140). Tablet / desktop 40/60 tiles keep them. */
export function isThumb(g: CanvasRenderingContext2D): boolean {
  if (!isTileCanvas(g)) return false;
  if (isPortraitPhone() || isLandscapePhone()) return true;
  const box = (g.canvas.closest('.tile-frame') as HTMLElement | null) ?? g.canvas;
  const r = box.getBoundingClientRect();
  return r.width < TILE_MIN_W || r.height < TILE_MIN_H;
}
let persistLabels = 0;
/** Draw labels even on a compact tile (short keys that still fit). */
export function withPersistentLabels<T>(fn: () => T): T {
  persistLabels++;
  try { return fn(); } finally { persistLabels--; }
}
/** A usable, finite, strictly positive increment for a tick / grid loop. */
export function goodStep(step: number): boolean {
  return Number.isFinite(step) && step > 0;
}
/** Walk ticks from lo to hi; no-ops when the step is not a finite positive number (avoids a hung page). */
export function forTicks(lo: number, hi: number, step: number, fn: (v: number) => void): void {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !goodStep(step) || hi < lo) return;
  const n = Math.floor((hi - lo) / step);
  if (!Number.isFinite(n) || n > 10_000) return;
  for (let x = lo, i = 0; x <= hi + 1e-9 && i <= n + 2; x += step, i++) fn(x);
}
export function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, color = col.text(), align: CanvasTextAlign = 'left', size = 11, base: CanvasTextBaseline = 'middle') {
  const f = fitText(g, s, x, align, size);
  // keep clear of the labels already drawn on this canvas (see labels.ts): ticks give way, notes slide by whole lines, axis names stay
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null, cv = g.canvas as HTMLCanvasElement | undefined, role = labelRole();
  // compact / too-small tiles: drop crowded notes and axis titles; keep ticks, UNSTABLE, and persistent keys
  if (isThumb(g) && !persistLabels && (role === 'note' || role === 'axis') && !/UNSTABLE/i.test(s)) { logText(g, s, f, size, x, y, base, null, 0, true); return; }
  let rect: LabelRect | null = null, dy = 0, dx = 0;
  if (m && cv && Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9 && m.d > 0) {
    const n = f.lines.length, z = f.size, ext = base === 'top' || base === 'hanging' ? [0, 1.1] : base === 'middle' ? [-0.55, 0.55] : [-0.9, 0.25];
    const u0 = y - ((n - 1) / 2) * z * 1.15 + ext[0] * z, u1 = y + ((n - 1) / 2) * z * 1.15 + ext[1] * z;
    rect = { x0: m.a * f.x0 + m.e, x1: m.a * f.x1 + m.e, y0: m.d * u0 + m.f, y1: m.d * u1 + m.f, role };
    const list = labelsOn(cv);
    if (role === 'tick') { if (labelOverlaps(list, rect, -3)) { /* a number touching another label (within 3 px) reads as one: leave it out */ logText(g, s, f, size, x, y, base, rect, 0, true); return; } }
    else if (role === 'note') {
      // whole lines down or up, nearest first, as far as the canvas goes; a note that only hits the numbers at its left end may step right
      const L = z * 1.15 * m.d, H = cv.height || 2000, dys = [0]; for (let k = 1; k * L < H; k++) dys.push(k * L, -k * L);
      const spot = freeSpot(list, rect, dys, H, cv.width || Infinity) ?? [0, 0]; dx = spot[0]; dy = spot[1];
      rect = { ...rect, x0: rect.x0 + dx, x1: rect.x1 + dx, y0: rect.y0 + dy, y1: rect.y1 + dy };
    }
    list.push(rect);
  }
  const yy = y + (m && dy ? dy / m.d : 0), xx = f.x + (m && dx ? dx / m.a : 0);
  g.fillStyle = color; g.font = `${f.size}px system-ui,sans-serif`; g.textAlign = align; g.textBaseline = base;
  if (f.lines.length === 1) g.fillText(s, xx, yy);
  else f.lines.forEach((l, i) => g.fillText(l, xx, yy + (i - (f.lines.length - 1) / 2) * f.size * 1.15));
  logText(g, s, f, size, x, y, base, rect, dy || dx, false);
}
/** Test hook: when window.__textLog is an array, every label drawn records its extent against the canvas (device px), including rotated axis titles. */
function logText(g: CanvasRenderingContext2D, s: string, f: TextFit, size: number, x: number, y: number, base: CanvasTextBaseline, rect: LabelRect | null = null, dy = 0, skipped = false) {
  const log = (globalThis as unknown as { __textLog?: unknown[] }).__textLog; if (!Array.isArray(log)) return;
  const m = g.getTransform(); const cv = g.canvas as HTMLCanvasElement;
  const cvs = (globalThis as unknown as { __textCanvases?: HTMLCanvasElement[] }).__textCanvases; let ci = -1;
  if (Array.isArray(cvs)) { ci = cvs.indexOf(cv); if (ci < 0) { cvs.push(cv); ci = cvs.length - 1; } }
  const n = f.lines.length, z = f.size;
  const ext = base === 'top' || base === 'hanging' ? [0, 1.1] : base === 'middle' ? [-0.55, 0.55] : [-0.9, 0.25];
  const u0 = y - ((n - 1) / 2) * z * 1.15 + ext[0] * z, u1 = y + ((n - 1) / 2) * z * 1.15 + ext[1] * z;
  let x0: number, x1: number, y0: number, y1: number;
  if (rect && Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9) { x0 = rect.x0; x1 = rect.x1; y0 = rect.y0; y1 = rect.y1; }
  else {
    x0 = Infinity; x1 = -Infinity; y0 = Infinity; y1 = -Infinity;
    for (const px of [f.x0, f.x1]) for (const py of [u0, u1]) {
      const X = m.a * px + m.c * py + m.e, Y = m.b * px + m.d * py + m.f;
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    }
  }
  const card = cv.closest?.('[data-testid=step-card]') as HTMLElement | null;
  const where = cv.closest?.('.fig-overlay') ? 'expand' : cv.closest?.('.tile-frame') ? 'tile' : 'other';
  log.push({ s, x0, x1, y0, y1, W: cv.width, H: cv.height, cv: ci, id: cv.closest?.('[data-fig]')?.getAttribute('data-fig') || cv.getAttribute?.('data-figure') || cv.getAttribute?.('data-big') || cv.id || '', fitted: f.lines.length > 1 || f.size < size - 0.01 || Math.abs(f.x - x) > 0.5, role: rect?.role, moved: Math.abs(dy) > 0.01, skipped, gen: labelGen(cv), where, step: card?.getAttribute('data-step') || '' });
}
export function tline(g: CanvasRenderingContext2D, f: Frame, a: V2, b: V2, color: string, width = 1.5, dash: number[] = []) {
  g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath(); g.moveTo(f.X(a[0]), f.Y(a[1])); g.lineTo(f.X(b[0]), f.Y(b[1])); g.stroke(); g.setLineDash([]);
}
export function polyline(g: CanvasRenderingContext2D, f: Frame, pts: V2[], color: string, width = 2, dash: number[] = [], close = false) {
  if (pts.length < 2) return;
  g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(f.X(p[0]), f.Y(p[1])) : g.moveTo(f.X(p[0]), f.Y(p[1]))));
  if (close) g.closePath(); g.stroke(); g.setLineDash([]);
}
export function fillPoly(g: CanvasRenderingContext2D, f: Frame, pts: V2[], color: string) {
  g.fillStyle = color; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(f.X(p[0]), f.Y(p[1])) : g.moveTo(f.X(p[0]), f.Y(p[1])))); g.closePath(); g.fill();
}
export function dot(g: CanvasRenderingContext2D, f: Frame, p: V2, color: string, r = 4, ring = false) {
  g.beginPath(); g.arc(f.X(p[0]), f.Y(p[1]), r, 0, Math.PI * 2);
  if (ring) { g.strokeStyle = color; g.lineWidth = 2; g.stroke(); } else { g.fillStyle = color; g.fill(); }
}
export function cross(g: CanvasRenderingContext2D, f: Frame, p: V2, color: string, r = 5) {
  g.strokeStyle = color; g.lineWidth = 2; const x = f.X(p[0]), y = f.Y(p[1]);
  g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x - r, y + r); g.lineTo(x + r, y - r); g.stroke();
}
export function arrow(g: CanvasRenderingContext2D, f: Frame, a: V2, b: V2, color: string, width = 2, label?: string) {
  const x0 = f.X(a[0]), y0 = f.Y(a[1]), x1 = f.X(b[0]), y1 = f.Y(b[1]);
  const len = Math.hypot(x1 - x0, y1 - y0);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = width; g.setLineDash([]);
  if (len < 1) return;
  const ang = Math.atan2(y1 - y0, x1 - x0), hl = Math.min(10, len * 0.4);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - Math.cos(ang) * hl * 0.6, y1 - Math.sin(ang) * hl * 0.6); g.stroke();
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - hl * Math.cos(ang - 0.4), y1 - hl * Math.sin(ang - 0.4)); g.lineTo(x1 - hl * Math.cos(ang + 0.4), y1 - hl * Math.sin(ang + 0.4)); g.closePath(); g.fill();
  if (label) text(g, label, x1 + Math.cos(ang) * 10 + (Math.cos(ang) >= 0 ? 2 : -2), y1 + Math.sin(ang) * 10, color, Math.cos(ang) >= 0 ? 'left' : 'right', 12);
}
/** Infinite line through the origin (or p0) along direction d, clipped to the frame box. */
export function spanLine(g: CanvasRenderingContext2D, f: Frame, d: V2, color: string, width = 1.5, dash: number[] = [6, 4], p0: V2 = [0, 0]) {
  const big = 100 / Math.max(Math.hypot(d[0], d[1]), 1e-9);
  g.save(); clipBox(g, f); tline(g, f, [p0[0] - d[0] * big, p0[1] - d[1] * big], [p0[0] + d[0] * big, p0[1] + d[1] * big], color, width, dash); g.restore();
}
/** Axes with ticks at integers, optional labels. */
export function axes2(g: CanvasRenderingContext2D, f: Frame, xl = '', yl = '', step = 1) {
  const c = col.strong();
  g.save(); clipBox(g, f);
  tline(g, f, [f.ix(f.box.l), 0], [f.ix(f.box.r), 0], c, 1); tline(g, f, [0, f.iy(f.box.t)], [0, f.iy(f.box.b)], c, 1);
  g.restore();
  withLabelRole('axis', () => {
    if (xl) text(g, xl, f.box.r - 2, f.Y(0) - 8, col.muted(), 'right', 11);
    if (yl) text(g, yl, f.X(0) + 6, Math.max(10, f.box.t - 10), col.muted(), 'left', 11);
  });
  void step;
}
/** Tick numbers on a complex-plane frame (s-plane, z-plane): small ticks on the axes every `step` (x) and `ystep` (y), numbers inside the
 * box along its bottom and left edges so they never collide with the curves at the axes. Units belong in the axis names (axes2). */
export function planeTicks(g: CanvasRenderingContext2D, f: Frame, step: number, ystep = step) {
  const x0 = f.ix(f.box.l), x1 = f.ix(f.box.r), y0 = f.iy(f.box.b), y1 = f.iy(f.box.t), lab = (v: number) => String(+v.toFixed(3)).replace('-', '−');
  const ax = Math.min(Math.max(f.Y(0), f.box.t), f.box.b), ay = Math.min(Math.max(f.X(0), f.box.l), f.box.r);
  g.save(); g.strokeStyle = col.strong(); g.lineWidth = 1; g.setLineDash([]);
  forTicks(Math.ceil(x0 / step) * step, x1, step, (x) => {
    const px = f.X(x); g.beginPath(); g.moveTo(px, ax - 3); g.lineTo(px, ax + 3); g.stroke();
    if (Math.abs(x) > 1e-9) withLabelRole('tick', () => text(g, lab(x), px, f.box.b - 7, col.muted(), 'center', 10));
  });
  forTicks(Math.ceil(y0 / ystep) * ystep, y1, ystep, (y) => {
    const py = f.Y(y); g.beginPath(); g.moveTo(ay - 3, py); g.lineTo(ay + 3, py); g.stroke();
    if (Math.abs(y) > 1e-9) withLabelRole('tick', () => text(g, lab(y), f.box.l + 3, py, col.muted(), 'left', 10));
  });
  g.restore();
}
/** The integer grid pushed through M (a plane transformation): the 3Blue1Brown picture of a matrix. */
export function gridT(g: CanvasRenderingContext2D, f: Frame, M: M2, n = 6, color = col.grid(), width = 1, step = 1, alpha = 1) {
  g.save(); clipBox(g, f); g.strokeStyle = color; g.lineWidth = width; g.globalAlpha = alpha;
  for (let i = -n; i <= n; i++) {
    const k = i * step;
    const a = mulV(M, [k, -n * step]), b = mulV(M, [k, n * step]), c = mulV(M, [-n * step, k]), d = mulV(M, [n * step, k]);
    g.beginPath(); g.moveTo(f.X(a[0]), f.Y(a[1])); g.lineTo(f.X(b[0]), f.Y(b[1])); g.moveTo(f.X(c[0]), f.Y(c[1])); g.lineTo(f.X(d[0]), f.Y(d[1])); g.stroke();
  }
  g.restore();
}
/** Colour-mapped scalar field: fn(x, y) → RGBA via an offscreen low-resolution ImageData. */
export function heat(g: CanvasRenderingContext2D, f: Frame, fn: (x: number, y: number) => [number, number, number, number], cell = 4) {
  const bw = Math.floor(f.box.r - f.box.l), bh = Math.floor(f.box.b - f.box.t);
  const nw = Math.max(1, Math.floor(bw / cell)), nh = Math.max(1, Math.floor(bh / cell));
  const cv = document.createElement('canvas'); cv.width = nw; cv.height = nh;
  const cg = cv.getContext('2d')!, img = cg.createImageData(nw, nh);
  for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++) {
    const [r, gg, b, a] = fn(f.ix(f.box.l + (i + 0.5) * (bw / nw)), f.iy(f.box.t + (j + 0.5) * (bh / nh)));
    const o = (j * nw + i) * 4; img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = a;
  }
  cg.putImageData(img, 0, 0);
  g.save(); g.imageSmoothingEnabled = true; g.drawImage(cv, f.box.l, f.box.t, bw, bh); g.restore();
}
/** Simple axes + x ticks for a graph drawn through a rangeFrame. */
/** Tick text with enough decimals to tell neighbouring ticks apart. */
export function tickLabel(v: number, step: number): string {
  if (!Number.isFinite(v)) return '';
  if (Math.abs(v) < Math.max(Math.abs(step), 1e-12) * 1e-9) return '0';
  const dec = Math.max(0, Math.min(8, Math.ceil(-Math.log10(Math.abs(step) || 1) - 1e-12)));
  return String(+v.toFixed(dec)).replace('-', '−');
}
export function graphAxes(g: CanvasRenderingContext2D, f: Frame, xr: V2, yr: V2, xLabel: string, yLabel: string, xs = 0, ys = 0, xfmt?: (x: number) => string, yfmt?: (y: number) => string) {
  const nice = (span: number, n: number) => {
    if (!(span > 0) || !(n > 0)) return span > 0 ? span : 1;
    const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  };
  const fitStep = (span: number, px: number, start: number, minPx: number) => {
    let st = start;
    if (!goodStep(st) || !(span > 0) || !(px > 0)) return goodStep(st) ? st : (span > 0 ? span : 1);
    let guard = 0;
    while ((st / span) * px < minPx && st < span && guard++ < 24) {
      const nxt = nice(st * 2.01, 1);
      if (!goodStep(nxt) || nxt <= st) break;
      st = nxt;
    }
    return st;
  };
  const sx = fitStep(xr[1] - xr[0], f.box.r - f.box.l, xs || nice(xr[1] - xr[0], 6), 28);
  const sy = fitStep(yr[1] - yr[0], f.box.b - f.box.t, ys || nice(yr[1] - yr[0], 4), 22);
  g.lineWidth = 1; g.setLineDash([]);
  // the axis names first, so tick numbers that would sit on them give way
  withLabelRole('axis', () => {
    text(g, xLabel, (f.box.l + f.box.r) / 2, f.h - 5, col.text(), 'center', 11);
    // sit the y-title at the canvas edge, left of the tick-number column, and no taller than the plot box
    const yx = 10, yMid = (f.box.t + f.box.b) / 2, yRoom = Math.max(8, f.box.b - f.box.t - 4);
    g.font = '11px system-ui,sans-serif';
    const ySize = Math.max(5, Math.min(11, 11 * yRoom / Math.max(1, g.measureText(yLabel).width)));
    g.save(); g.translate(yx, yMid); g.rotate(-Math.PI / 2); text(g, yLabel, 0, 0, col.text(), 'center', ySize); g.restore();
  });
  withLabelRole('tick', () => {
    let lastX = '', lastPx = -Infinity;
    forTicks(Math.ceil(xr[0] / sx) * sx, xr[1], sx, (x) => {
      g.strokeStyle = col.grid(); g.beginPath(); g.moveTo(f.X(x), f.box.t); g.lineTo(f.X(x), f.box.b); g.stroke();
      const lab = xfmt ? xfmt(x) : tickLabel(x, sx), px = f.X(x);
      if (lab && lab !== lastX && Math.abs(px - lastPx) >= 26) { text(g, lab, px, f.box.b + 9, col.muted(), 'center', 10); lastX = lab; lastPx = px; }
    });
    let lastY = '', lastPy = Infinity;
    forTicks(Math.ceil(yr[0] / sy) * sy, yr[1], sy, (y) => {
      g.strokeStyle = col.grid(); g.beginPath(); g.moveTo(f.box.l, f.Y(y)); g.lineTo(f.box.r, f.Y(y)); g.stroke();
      const lab = yfmt ? yfmt(y) : tickLabel(y, sy), py = f.Y(y);
      if (lab && lab !== lastY && Math.abs(py - lastPy) >= 16) { text(g, lab, f.box.l - 4, py, col.muted(), 'right', 10); lastY = lab; lastPy = py; }
    });
  });
  g.strokeStyle = col.strong();
  if (yr[0] < 0 && yr[1] > 0) { g.beginPath(); g.moveTo(f.box.l, f.Y(0)); g.lineTo(f.box.r, f.Y(0)); g.stroke(); }
  if (xr[0] < 0 && xr[1] > 0) { g.beginPath(); g.moveTo(f.X(0), f.box.t); g.lineTo(f.X(0), f.box.b); g.stroke(); }
}
export function curve(g: CanvasRenderingContext2D, f: Frame, xs: ArrayLike<number>, ys: ArrayLike<number>, color: string, width = 2, dash: number[] = []) {
  g.save(); clipBox(g, f); g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath();
  let pen = false;
  for (let i = 0; i < xs.length; i++) { if (!Number.isFinite(ys[i])) { pen = false; continue; } const px = f.X(xs[i]), py = f.Y(ys[i]); if (pen) g.lineTo(px, py); else { g.moveTo(px, py); pen = true; } }
  g.stroke(); g.restore(); g.setLineDash([]);
}
export function fillBetween(g: CanvasRenderingContext2D, f: Frame, xs: ArrayLike<number>, ys: ArrayLike<number>, color: string, base = 0) {
  g.save(); clipBox(g, f); g.fillStyle = color; g.beginPath(); g.moveTo(f.X(xs[0]), f.Y(base));
  for (let i = 0; i < xs.length; i++) g.lineTo(f.X(xs[i]), f.Y(ys[i]));
  g.lineTo(f.X(xs[xs.length - 1]), f.Y(base)); g.closePath(); g.fill(); g.restore();
}
export const linspace = (a: number, b: number, n: number): number[] => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
export const deg = (d: number) => (d * Math.PI) / 180;

/** Build a figure mount function from a panel factory so a subject app registers one line per figure. */
export function figureOf(build: (c: ControlSet, def: FigureDef) => FigurePanel[]) {
  return (host: HTMLElement, def: FigureDef, controls: ControlSet, opts?: FigureMountOpts) => {
    const api = mountFigure(host, def, build(controls, def), controls, opts);
    return () => api.destroy();
  };
}

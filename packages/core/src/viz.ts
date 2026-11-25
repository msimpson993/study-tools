import { cssVar } from './plot';
import { labelRole, labelAnchor, labelsOn, labelOverlaps, freeSpot, resetLabels, withLabelRole, withAnchor, labelGen, type LabelRect, type LabelAnchor } from './labels';
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

/** Paint the plot background over a box so a grid line cannot run through a label (BUG-66). */
export function fillPlotBehind(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, pad = 2) {
  const a = Math.min(x0, x1) - pad, b = Math.max(x0, x1) + pad, c = Math.min(y0, y1) - pad, d = Math.max(y0, y1) + pad;
  g.save(); g.fillStyle = cssVar('--plot-bg'); g.fillRect(a, c, b - a, d - c); g.restore();
}
/** Stroke, then fill, a string so the glyph stays readable without a filled knock-out box (BUG-72). */
export function fillWithHalo(g: CanvasRenderingContext2D, s: string, x: number, y: number) {
  const z = parseFloat(g.font) || 10;
  g.save();
  g.strokeStyle = cssVar('--bg') || '#000';
  g.lineJoin = 'round';
  g.miterLimit = 2;
  g.lineWidth = Math.max(3, z * 0.3);
  g.strokeText(s, x, y);
  g.fillText(s, x, y);
  g.restore();
}
const NB = '\u00a0';
/** Join a name with its value, and the tokens of a formula, so wrap cannot split them (BUG-71). */
export function lockReadout(s: string): string {
  let t = s;
  t = t.replace(/ceiling\s+Ka\s*=\s*[\d.]+/g, (m) => m.replace(/ /g, NB));
  t = t.replace(/1\/\([^)]+\)/g, (m) => m.replace(/ /g, NB));
  t = t.replace(/\d+\/\d+/g, (m) => m.replace(/ /g, NB));
  t = t.replace(
    /\b(Ts|Tr|Tp|OS|Ka|K|ζ|ωn|ω|error|sag|offset|dip|τ|ratio|S|P|I)\s*(?:=|→)?\s*[+\-−]?\d[\d.]*\s*(?:\/\s*[\d.]+)?\s*(?:%|ms|s|rad\/s)?/g,
    (m) => m.replace(/ /g, NB),
  );
  return t;
}
/** At least `min` well-separated nice values on [lo, hi], always including 0 when it is in range (BUG-68). */
export function minNiceTicks(lo: number, hi: number, already: number[], min = 2): number[] {
  const inRange = (v: number) => Number.isFinite(v) && v >= lo - 1e-9 && v <= hi + 1e-9;
  const out: number[] = [];
  const add = (v: number) => {
    if (!inRange(v)) return;
    if (out.some((u) => Math.abs(u - v) < 1e-8)) return;
    out.push(v);
  };
  for (const v of already) add(v);
  if (lo <= 0 && 0 <= hi) add(0);
  const niceEnd = (v: number) => {
    if (!Number.isFinite(v)) return v;
    if (Math.abs(v) < 1e-12) return 0;
    const sign = v < 0 ? -1 : 1, a = Math.abs(v);
    const p = Math.pow(10, Math.floor(Math.log10(a)));
    const m = a / p;
    const cand = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p * sign;
    if (inRange(cand)) return cand;
    const down = (m < 1.5 ? 0.5 : m < 3.5 ? 1 : m < 7.5 ? 2 : 5) * p * sign;
    if (inRange(down)) return down;
    return v;
  };
  if (out.length < min) add(niceEnd(lo));
  if (out.length < min) add(niceEnd(hi));
  if (out.length < min) add(lo);
  if (out.length < min) add(hi);
  return out;
}
/** Extra tick values for a min-2 fill: nice ends first, then 0, then the raw ends. Odd mid-span values are not used (BUG-74). */
export function min2Candidates(lo: number, hi: number, already: number[]): number[] {
  const inRange = (v: number) => Number.isFinite(v) && v >= lo - 1e-9 && v <= hi + 1e-9;
  const niceEnd = (v: number) => {
    if (!Number.isFinite(v)) return v;
    if (Math.abs(v) < 1e-12) return 0;
    const sign = v < 0 ? -1 : 1, a = Math.abs(v);
    const p = Math.pow(10, Math.floor(Math.log10(a)));
    const m = a / p;
    const cand = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p * sign;
    if (inRange(cand)) return cand;
    const down = (m < 1.5 ? 0.5 : m < 3.5 ? 1 : m < 7.5 ? 2 : 5) * p * sign;
    if (inRange(down)) return down;
    return v;
  };
  const out: number[] = [];
  const add = (v: number) => {
    if (!inRange(v)) return;
    if (already.some((u) => Math.abs(u - v) < 1e-8)) return;
    if (out.some((u) => Math.abs(u - v) < 1e-8)) return;
    out.push(v);
  };
  add(niceEnd(lo));
  add(niceEnd(hi));
  if (lo <= 0 && 0 <= hi) add(0);
  add(lo);
  add(hi);
  // if still short, the two most separated already-nice values are the ends; caller draws what fits
  return out;
}
/** Whether a tick number at (px, py) would stay on the canvas (same test text() uses). */
export function tickOnCanvas(g: CanvasRenderingContext2D, lab: string, px: number, py: number, z: number, align: CanvasTextAlign = 'center') {
  const m = typeof g.getTransform === 'function' ? g.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  g.font = `${z}px system-ui,sans-serif`;
  const tw = g.measureText(lab).width;
  const a0 = align === 'right' || align === 'end' ? px - tw : align === 'center' ? px - tw / 2 : px;
  const a1 = a0 + tw, u0 = py - z * 0.55, u1 = py + z * 0.55;
  const x0 = m.a * a0 + m.c * u0 + m.e, x1 = m.a * a1 + m.c * u1 + m.e;
  const y0 = m.b * a0 + m.d * u0 + m.f, y1 = m.b * a1 + m.d * u1 + m.f;
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1), ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const cw = g.canvas.width || 0, ch = g.canvas.height || 0;
  return xa >= 1 && xb <= cw - 1 && ya >= 1 && yb <= ch - 1;
}



/** Wrap a readout to a measured pixel width (never an estimated character count). Prefer a sentence or '; ' cut, then a greedy word wrap. */
const wrapReadout = (g: CanvasRenderingContext2D, s: string, room: number, z: number): string[] => {
  g.font = `${z}px system-ui,sans-serif`;
  const width = (t: string) => g.measureText(t).width;
  const fits = (t: string) => width(t) <= room + 0.5;
  const wrapWords = (t: string): string[] => {
    const src = t.trim();
    if (!src || room <= 8 || fits(src)) return src ? [src] : [];
    const toks = src.split(' ').filter(Boolean);
    if (toks.length <= 1) return [src];
    const lines: string[] = [];
    let cur = '';
    for (const tok of toks) {
      const next = cur ? `${cur} ${tok}` : tok;
      if (cur && !fits(next)) { lines.push(cur); cur = tok; }
      else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  if (fits(s)) return [s];
  const parts: string[] = [];
  let rest = s;
  while (rest) {
    const sent = rest.indexOf('.  ');
    const semi = rest.indexOf('; ');
    if (sent >= 0 && (semi < 0 || sent <= semi)) {
      parts.push(rest.slice(0, sent + 1).trim());
      rest = rest.slice(sent + 1).trim();
    } else if (semi >= 0) {
      parts.push(rest.slice(0, semi).trim());
      rest = rest.slice(semi + 1).trim();
    } else {
      parts.push(rest);
      rest = '';
    }
  }
  const out: string[] = [];
  for (const p of (parts.length ? parts : [s])) out.push(...wrapWords(p));
  return out.length ? out : [s];
};

/** Caption-named readout: never shrink below 9 px; wrap if the row will not fit; do not slide into the plot (BUG-60 rest).
 *  Wrapped lines use a line height of at least 1.2× the font size and are logged as one block so the lines cannot collide with each other. */
export function textReadout(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left', size = 10, maxW?: number, maxBot?: number) {
  s = lockReadout(s);
  const m = typeof g.getTransform === 'function' ? g.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const k = m.a > 0 ? m.a : 1, W = (g.canvas?.width || 400) / k, ox = -(m.e || 0) / k;
  const lo = ox + 2, hi = ox + W - 2;
  const room = maxW ?? (align === 'right' || align === 'end' ? x - lo : hi - x);
  const oy = -(m.f || 0) / (m.d > 0 ? m.d : 1);
  const H = (g.canvas?.height || 400) / (m.d > 0 ? m.d : 1);
  const cap = maxBot ?? (oy + H - 2);
  const layout = (z: number) => {
    const lines = wrapReadout(g, s, Math.max(8, room), z);
    const n = lines.length, gap = z * 1.2;
    let y0 = y - ((n - 1) / 2) * gap;
    const top = y0 - z * 0.55, bot = y0 + (n - 1) * gap + z * 0.55;
    if (top < oy + 2) y0 += (oy + 2) - top;
    else if (bot > cap) y0 -= bot - cap;
    const yTop = y0 - z * 0.55, yBot = y0 + (n - 1) * gap + z * 0.55;
    return { z, lines, n, gap, y0, yTop, yBot, fits: yTop >= oy + 1 && yBot <= cap + 0.5 };
  };
  // required readouts stay at >= 9 px; an optional note (one with a maxBot cap) may shrink to 9 or be dropped if it still will not fit
  let plan = layout(Math.max(9, size));
  if (!plan.fits && maxBot != null) plan = layout(9);
  if (!plan.fits && maxBot != null) return;
  const { z, lines, n, gap, y0, yTop, yBot } = plan;
  withLabelRole('axis', () => {
    // phone / tiny tiles stay bare (same rule as text() for axis labels)
    if (isThumb(g) && !persistLabels) {
      const fit = { size: z, x, lines, x0: x, x1: x };
      logText(g, s, fit, z, x, y, 'middle', null, 0, true);
      return;
    }
    g.font = `${z}px system-ui,sans-serif`;
    const tw = Math.max(...lines.map((l) => g.measureText(l).width));
    const a0 = align === 'right' || align === 'end' ? x - tw : align === 'center' ? x - tw / 2 : x;
    const cv = g.canvas as HTMLCanvasElement | undefined;
    const rect: LabelRect = {
      x0: m.a * a0 + m.e, x1: m.a * (a0 + tw) + m.e,
      y0: (m.d > 0 ? m.d : 1) * yTop + m.f, y1: (m.d > 0 ? m.d : 1) * yBot + m.f,
      role: 'axis',
    };
    if (cv) labelsOn(cv).push(rect);
    g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
    for (let i = 0; i < n; i++) (simProjectStyle() ? fillWithHalo(g, lines[i], x, y0 + i * gap) : g.fillText(lines[i], x, y0 + i * gap));
    const fit = { size: z, x, lines, x0: a0, x1: a0 + tw };
    logText(g, s, fit, z, x, y0, 'middle', rect, 0, false);
  });
}

/** Force the next text() calls to split at this substring (e.g. " (" for a stacked "−6 (double)"). */
let textSplitAt: string | null = null;
export function withTextSplit<T>(at: string | null, fn: () => T): T {
  const old = textSplitAt; textSplitAt = at;
  try { return fn(); } finally { textSplitAt = old; }
}

/** Device-pixel axis-aligned clip, for the label-collision tests and for fitText. */
export type ClipRect = { x0: number; y0: number; x1: number; y1: number };
const clipStack = new WeakMap<CanvasRenderingContext2D, ClipRect[]>();
const boxToDevice = (g: CanvasRenderingContext2D, box: { l: number; t: number; r: number; b: number }): ClipRect => {
  const m = typeof g.getTransform === 'function' ? g.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const px of [box.l, box.r]) for (const py of [box.t, box.b]) {
    const X = m.a * px + m.c * py + m.e, Y = m.b * px + m.d * py + m.f;
    if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  return { x0, y0, x1, y1 };
};
const pushClip = (g: CanvasRenderingContext2D, box: { l: number; t: number; r: number; b: number }) => {
  const s = clipStack.get(g) ?? []; s.push(boxToDevice(g, box)); clipStack.set(g, s);
};
const popClip = (g: CanvasRenderingContext2D) => { const s = clipStack.get(g); if (s && s.length) s.pop(); };
/** The innermost tracked clip in device pixels, if a withClip / tracked clipBox is active. */
export const currentClip = (g: CanvasRenderingContext2D): ClipRect | null => {
  const s = clipStack.get(g); return s && s.length ? s[s.length - 1] : null;
};
export function clipBox(g: CanvasRenderingContext2D, f: Frame) { g.beginPath(); g.rect(f.box.l, f.box.t, f.box.r - f.box.l, f.box.b - f.box.t); g.clip(); }
/** Clip to the frame box, record it for label tests and fitText, and restore both on exit. */
export function beginClip(g: CanvasRenderingContext2D, box: { l: number; t: number; r: number; b: number }) {
  g.save(); g.beginPath(); g.rect(box.l, box.t, box.r - box.l, box.b - box.t); g.clip(); pushClip(g, box);
}
export function endClip(g: CanvasRenderingContext2D) { popClip(g); g.restore(); }
export function withClip<T>(g: CanvasRenderingContext2D, f: Frame, fn: () => T): T {
  beginClip(g, f.box);
  try { return fn(); } finally { endClip(g); }
}

type CurveLog = { pts: { x: number; y: number }[]; width: number; W: number; H: number; cv: number; id: string; gen: number; where?: string; step?: string };
const logCurve = (g: CanvasRenderingContext2D, pts: { x: number; y: number }[], width: number) => {
  const log = (globalThis as unknown as { __curveLog?: unknown[] }).__curveLog; if (!Array.isArray(log) || pts.length < 2) return;
  const m = typeof g.getTransform === 'function' ? g.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const cv = g.canvas as HTMLCanvasElement;
  const cvs = (globalThis as unknown as { __textCanvases?: HTMLCanvasElement[] }).__textCanvases; let ci = -1;
  if (Array.isArray(cvs)) { ci = cvs.indexOf(cv); if (ci < 0) { cvs.push(cv); ci = cvs.length - 1; } }
  const out: { x: number; y: number }[] = [];
  const step = Math.max(1, Math.ceil(pts.length / 80));
  for (let i = 0; i < pts.length; i += step) {
    const p = pts[i];
    out.push({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
  }
  const last = pts[pts.length - 1], L = out[out.length - 1];
  const lx = m.a * last.x + m.c * last.y + m.e, ly = m.b * last.x + m.d * last.y + m.f;
  if (!L || Math.hypot(L.x - lx, L.y - ly) > 0.5) out.push({ x: lx, y: ly });
  const card = cv.closest?.('[data-testid=step-card]') as HTMLElement | null;
  const where = cv.closest?.('.fig-overlay') ? 'expand' : cv.closest?.('.tile-frame') ? 'tile' : 'other';
  log.push({ pts: out, width, W: cv.width, H: cv.height, cv: ci, id: cv.closest?.('[data-fig]')?.getAttribute('data-fig') || cv.getAttribute?.('data-figure') || cv.getAttribute?.('data-big') || cv.id || '', gen: labelGen(cv), where, step: card?.getAttribute('data-step') || '' } satisfies CurveLog);
};

/** Where a label of this size fits inside the canvas: shrinks it (to 72% at most), then slides it in from the edge, then splits it
 * into two lines, so an in-plot note never runs off the panel. Works in device pixels, so translated or scaled sub-panels are handled. */
export interface TextFit { size: number; x: number; lines: string[]; x0: number; x1: number }
export function fitText(g: CanvasRenderingContext2D, s: string, x: number, align: CanvasTextAlign, size: number, minSize = 0): TextFit {
  const font = (z: number) => `${z}px system-ui,sans-serif`;
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null;
  const k = m && m.a > 0 ? m.a : 1, e = m ? m.e : 0, W = (g.canvas?.width || Infinity) / k, ox = -e / k; // canvas in user units: [ox, ox + W]
  const clip = currentClip(g);
  // when a plot clip is active, stay inside it (not just the canvas) so a letterboxed s-plane does not hide a minus in the gutter
  const lo = clip ? (clip.x0 - e) / k + 2 : ox + 2, hi = clip ? (clip.x1 - e) / k - 2 : ox + W - 2;
  const span = (w: number, xx: number) => (align === 'center' ? [xx - w / 2, xx + w / 2] : align === 'right' || align === 'end' ? [xx - w, xx] : [xx, xx + w]);
  g.font = font(size); let w = g.measureText(s).width, z = size, lines = [s];
  if (m && (Math.abs(m.b) > 1e-9 || Math.abs(m.c) > 1e-9)) { const [r0, r1] = span(w, x); return { size, x, lines, x0: r0, x1: r1 }; } // rotated (axis titles): leave as drawn
  const role = labelRole();
  const hint = textSplitAt && s.includes(textSplitAt) ? s.indexOf(textSplitAt) : -1;
  if (hint > 0) {
    lines = [s.slice(0, hint), s.slice(hint).trimStart()];
    w = Math.max(...lines.map((l) => g.measureText(l).width));
  }
  const room = (() => { const [a0, a1] = span(w, x); return w - Math.max(0, lo - a0) - Math.max(0, a1 - hi); })();
  // ticks never shrink (BUG-61 / 65): one size, kept on their tick. They may nudge horizontally
  // so a last x-number does not run off the canvas. Notes may shrink, but not below minSize (BUG-60 rest).
  if (role !== 'tick' && w > room + 0.5 && Number.isFinite(W)) {
    const floor = Math.max(0, minSize);
    z = Math.max(floor, Math.max(size * 0.72, size * Math.max(room, 1) / w));
    if (floor > 0) z = Math.max(z, floor);
    g.font = font(z); w = Math.max(...lines.map((l) => g.measureText(l).width));
    if (w > hi - lo && lines.length === 1) { // still wider than the whole panel: two lines, split at the space nearest the middle
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
/** Tick and readout rules added after 4e35f6d. Off by default so Control Systems and Linear Systems keep their round-14 look. */
let simProjectStyleDepth = 0;
export function withSimProjectStyle<T>(fn: () => T): T {
  simProjectStyleDepth++;
  try { return fn(); } finally { simProjectStyleDepth--; }
}
export function simProjectStyle(): boolean {
  if (simProjectStyleDepth > 0) return true;
  return typeof document !== 'undefined' && document.documentElement.dataset.simProject === '1';
}
/** @deprecated use simProjectStyle(); kept as an alias for existing call sites. */
export function isSimProjectCanvas(_g?: CanvasRenderingContext2D): boolean {
  return simProjectStyle();
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
let persistLabels = 0, forceTick = 0;
/** Draw labels even on a compact tile (short keys that still fit). */
export function withPersistentLabels<T>(fn: () => T): T {
  persistLabels++;
  try { return fn(); } finally { persistLabels--; }
}
/** Draw a tick even if it touches an axis name, used when we must keep a second labelled tick. */
export function withForcedTick<T>(fn: () => T): T {
  forceTick++;
  try { return fn(); } finally { forceTick--; }
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
export function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, color = col.text(), align: CanvasTextAlign = 'left', size = 11, base: CanvasTextBaseline = 'middle', minSize = 0): boolean {
  const f = fitText(g, s, x, align, size, minSize);
  // keep clear of the labels already drawn on this canvas (see labels.ts): ticks give way, notes slide by whole lines, axis names stay
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null, cv = g.canvas as HTMLCanvasElement | undefined, role = labelRole();
  // compact / too-small tiles: drop crowded notes and axis titles; keep ticks, UNSTABLE, and persistent keys
  if (isThumb(g) && !persistLabels && (role === 'note' || role === 'axis') && !/UNSTABLE/i.test(s)) { logText(g, s, f, size, x, y, base, null, 0, true); return false; }
  let rect: LabelRect | null = null, dy = 0, dx = 0;
  if (m && cv && role === 'tick') {
    const n = f.lines.length, z = f.size, ext = base === 'top' || base === 'hanging' ? [0, 1.1] : base === 'middle' ? [-0.55, 0.55] : [-0.9, 0.25];
    const u0 = y - ((n - 1) / 2) * z * 1.15 + ext[0] * z, u1 = y + ((n - 1) / 2) * z * 1.15 + ext[1] * z;
    const x0t = m.a * f.x0 + m.c * u0 + m.e, x1t = m.a * f.x1 + m.c * u1 + m.e;
    const y0t = m.b * f.x0 + m.d * u0 + m.f, y1t = m.b * f.x1 + m.d * u1 + m.f;
    const xa = Math.min(x0t, x1t), xb = Math.max(x0t, x1t), ya = Math.min(y0t, y1t), yb = Math.max(y0t, y1t);
    const cw = cv.width || 0, ch = cv.height || 0;
    if (xa < 1 || xb > cw - 1 || ya < 1 || yb > ch - 1) { logText(g, s, f, size, x, y, base, null, 0, true); return false; }
  }
  if (m && cv) {
    const n = f.lines.length, z = f.size, ext = base === 'top' || base === 'hanging' ? [0, 1.1] : base === 'middle' ? [-0.55, 0.55] : [-0.9, 0.25];
    const u0 = y - ((n - 1) / 2) * z * 1.15 + ext[0] * z, u1 = y + ((n - 1) / 2) * z * 1.15 + ext[1] * z;
    const axisAligned = Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9 && m.d > 0;
    if (axisAligned) {
      rect = { x0: m.a * f.x0 + m.e, x1: m.a * f.x1 + m.e, y0: m.d * u0 + m.f, y1: m.d * u1 + m.f, role };
    } else {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const px of [f.x0, f.x1]) for (const py of [u0, u1]) {
        const X = m.a * px + m.c * py + m.e, Y = m.b * px + m.d * py + m.f;
        if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
      }
      rect = { x0, x1, y0, y1, role };
    }
    const list = labelsOn(cv);
    if (axisAligned && role === 'tick') {
      // forced ticks pass the same test as ordinary ones (BUG-74): no tick-vs-tick, no tick-vs-name
      if (labelOverlaps(list, rect, -3)) { logText(g, s, f, size, x, y, base, rect, 0, true); return false; }
    }
    else if (axisAligned && role === 'note' && !labelAnchor()) {
      // whole lines down or up, nearest first; stay inside the plot clip when one is active (else the canvas)
      const clip = currentClip(g);
      const ymin = clip ? clip.y0 + 1 : 0, ymax = clip ? clip.y1 - 1 : (cv.height || 2000);
      const xmin = clip ? clip.x0 + 1 : 0, xmax = clip ? clip.x1 - 1 : (cv.width || Infinity);
      const L = z * 1.15 * m.d, dys = [0]; for (let k = 1; k * L < Math.max(8, ymax - ymin); k++) dys.push(k * L, -k * L);
      const spot = freeSpot(list, rect, dys, ymax, xmax, 0.5, true, ymin, xmin);
      if (spot) {
        const moved = { ...rect, x0: rect.x0 + spot[0], x1: rect.x1 + spot[0], y0: rect.y0 + spot[1], y1: rect.y1 + spot[1] };
        if (moved.x0 >= xmin - 0.5 && moved.x1 <= xmax + 0.5 && moved.y0 >= ymin - 0.5 && moved.y1 <= ymax + 0.5) {
          dx = spot[0]; dy = spot[1]; rect = moved;
        }
      }
    }
    list.push(rect);
  }
  const yy = y + (m && dy ? dy / m.d : 0), xx = f.x + (m && dx ? dx / m.a : 0);
  g.fillStyle = color; g.font = `${f.size}px system-ui,sans-serif`; g.textAlign = align; g.textBaseline = base;
  const paint = (str: string, px: number, py: number) => simProjectStyle() ? fillWithHalo(g, str, px, py) : g.fillText(str, px, py);
  if (f.lines.length === 1) paint(s, xx, yy);
  else f.lines.forEach((l, i) => paint(l, xx, yy + (i - (f.lines.length - 1) / 2) * f.size * 1.15));
  logText(g, s, f, size, x, y, base, rect, dy || dx, false);
  return true;
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
  const src = labelAnchor();
  let anchor: (LabelAnchor) | undefined;
  if (src) {
    const ax = m.a * src.x + m.c * src.y + m.e, ay = m.b * src.x + m.d * src.y + m.f;
    anchor = { kind: src.kind, x: ax, y: ay };
    if (src.x2 !== undefined && src.y2 !== undefined) {
      anchor.x2 = m.a * src.x2 + m.c * src.y2 + m.e;
      anchor.y2 = m.b * src.x2 + m.d * src.y2 + m.f;
    }
  }
  log.push({ s, x0, x1, y0, y1, size: z, W: cv.width, H: cv.height, cv: ci, id: cv.closest?.('[data-fig]')?.getAttribute('data-fig') || cv.getAttribute?.('data-figure') || cv.getAttribute?.('data-big') || cv.id || '', fitted: f.lines.length > 1 || f.size < size - 0.01 || Math.abs(f.x - x) > 0.5, role: rect?.role, moved: Math.abs(dy) > 0.01, skipped, gen: labelGen(cv), where, step: card?.getAttribute('data-step') || '', clip: currentClip(g) ?? null, anchor });
}

const logObstacle = (g: CanvasRenderingContext2D, rec: { kind: 'marker' | 'line' | 'inset'; pts?: { x: number; y: number }[]; width?: number; x?: number; y?: number; r?: number; device?: boolean }) => {
  const log = (globalThis as unknown as { __obstacleLog?: unknown[] }).__obstacleLog; if (!Array.isArray(log)) return;
  const m = typeof g.getTransform === 'function' ? g.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const cv = g.canvas as HTMLCanvasElement;
  const cvs = (globalThis as unknown as { __textCanvases?: HTMLCanvasElement[] }).__textCanvases; let ci = -1;
  if (Array.isArray(cvs)) { ci = cvs.indexOf(cv); if (ci < 0) { cvs.push(cv); ci = cvs.length - 1; } }
  const card = cv.closest?.('[data-testid=step-card]') as HTMLElement | null;
  const where = cv.closest?.('.fig-overlay') ? 'expand' : cv.closest?.('.tile-frame') ? 'tile' : 'other';
  const toDev = (p: { x: number; y: number }) => rec.device ? p : ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
  const pts = rec.pts?.map(toDev);
  const xy = rec.x !== undefined && rec.y !== undefined ? toDev({ x: rec.x, y: rec.y }) : null;
  log.push({ kind: rec.kind, pts, width: rec.width, x: xy?.x, y: xy?.y, r: rec.r, W: cv.width, H: cv.height, cv: ci, id: cv.closest?.('[data-fig]')?.getAttribute('data-fig') || cv.getAttribute?.('data-figure') || cv.getAttribute?.('data-big') || cv.id || '', gen: labelGen(cv), where, step: card?.getAttribute('data-step') || '' });
};
/** Device-space stroke of a zoom-inset frame, so label checks can treat the box as an obstacle. */
export function logInsetFrame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  logObstacle(g, { kind: 'inset', pts: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }], width: 1.5 });
}

const clipSeg = (a: { x: number; y: number }, b: { x: number; y: number }, r: { x0: number; y0: number; x1: number; y1: number }) => {
  let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y;
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  if (!clip(-dx, a.x - r.x0) || !clip(dx, r.x1 - a.x) || !clip(-dy, a.y - r.y0) || !clip(dy, r.y1 - a.y)) return null;
  return [{ x: a.x + t0 * dx, y: a.y + t0 * dy }, { x: a.x + t1 * dx, y: a.y + t1 * dy }] as const;
};
export function tline(g: CanvasRenderingContext2D, f: Frame, a: V2, b: V2, color: string, width = 1.5, dash: number[] = [], log = true) {
  g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath(); g.moveTo(f.X(a[0]), f.Y(a[1])); g.lineTo(f.X(b[0]), f.Y(b[1])); g.stroke(); g.setLineDash([]);
  if (log && dash.length) {
    const m = typeof g.getTransform === 'function' ? g.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const toDev = (x: number, y: number) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
    let p1 = toDev(f.X(a[0]), f.Y(a[1])), p2 = toDev(f.X(b[0]), f.Y(b[1]));
    const clip = currentClip(g);
    if (clip) { const cut = clipSeg(p1, p2, clip); if (!cut) return; p1 = cut[0]; p2 = cut[1]; }
    // already in device px — logObstacle will transform again, so pass via a device-space identity by logging after we disable that...
    logObstacle(g, { kind: 'line', pts: [p1, p2], width, device: true });
  }
}
export function polyline(g: CanvasRenderingContext2D, f: Frame, pts: V2[], color: string, width = 2, dash: number[] = [], close = false) {
  if (pts.length < 2) return;
  g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(f.X(p[0]), f.Y(p[1])) : g.moveTo(f.X(p[0]), f.Y(p[1]))));
  if (close) g.closePath(); g.stroke(); g.setLineDash([]);
  logCurve(g, pts.map((p) => ({ x: f.X(p[0]), y: f.Y(p[1]) })), width);
}
export function fillPoly(g: CanvasRenderingContext2D, f: Frame, pts: V2[], color: string) {
  g.fillStyle = color; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(f.X(p[0]), f.Y(p[1])) : g.moveTo(f.X(p[0]), f.Y(p[1])))); g.closePath(); g.fill();
}
export function dot(g: CanvasRenderingContext2D, f: Frame, p: V2, color: string, r = 4, ring = false) {
  g.beginPath(); g.arc(f.X(p[0]), f.Y(p[1]), r, 0, Math.PI * 2);
  if (ring) { g.strokeStyle = color; g.lineWidth = 2; g.stroke(); } else { g.fillStyle = color; g.fill(); }
  logObstacle(g, { kind: 'marker', x: f.X(p[0]), y: f.Y(p[1]), r: r + (ring ? 1 : 0) });
}
export function cross(g: CanvasRenderingContext2D, f: Frame, p: V2, color: string, r = 5) {
  g.strokeStyle = color; g.lineWidth = 2; const x = f.X(p[0]), y = f.Y(p[1]);
  g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x - r, y + r); g.lineTo(x + r, y - r); g.stroke();
  logObstacle(g, { kind: 'marker', x, y, r: r + 1 });
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
/** Layout of the s-plane axis names (σ along the real axis, jω at the top of the imaginary axis). */
export function axes2NameLayout(g: CanvasRenderingContext2D, f: Frame, xl = '', yl = '') {
  const names: { s: string; x: number; y: number; z: number; align: CanvasTextAlign; x0: number; x1: number; y0: number; y1: number }[] = [];
  if (xl) {
    const y = f.Y(0) - 18, xR = f.box.r - 2, room = xR - (f.X(0) + 14);
    let label = xl, z = 11;
    g.font = `${z}px system-ui,sans-serif`;
    let tw = g.measureText(label).width;
    while (z > 9 && tw > room && room > 0) { z -= 1; g.font = `${z}px system-ui,sans-serif`; tw = g.measureText(label).width; }
    if (tw > room) { label = 'σ'; z = Math.max(9, Math.min(11, z)); g.font = `${z}px system-ui,sans-serif`; tw = g.measureText(label).width; }
    names.push({ s: label, x: xR, y, z, align: 'right', x0: xR - tw, x1: xR, y0: y - z * 0.55, y1: y + z * 0.55 });
  }
  if (yl) {
    const y = Math.max(10, f.box.t - 10), x = f.X(0) + 6, z = 11;
    g.font = `${z}px system-ui,sans-serif`;
    const tw = g.measureText(yl).width;
    names.push({ s: yl, x, y, z, align: 'left', x0: x, x1: x + tw, y0: y - z * 0.55, y1: y + z * 0.55 });
  }
  return names;
}
/** Axes with ticks at integers, optional labels. */
export function axes2(g: CanvasRenderingContext2D, f: Frame, xl = '', yl = '', step = 1) {
  const c = col.strong();
  g.save(); clipBox(g, f);
  tline(g, f, [f.ix(f.box.l), 0], [f.ix(f.box.r), 0], c, 1); tline(g, f, [0, f.iy(f.box.t)], [0, f.iy(f.box.b)], c, 1);
  g.restore();
  withLabelRole('axis', () => {
    for (const n of axes2NameLayout(g, f, xl, yl)) text(g, n.s, n.x, n.y, col.muted(), n.align, n.z);
  });
  void step;
}
/** After the grid is painted, redraw each axis name. Simulation Project uses a text halo (BUG-66 / 72) and skips phone tiles (BUG-67). Other tutors keep the round-14 plot-background knock-out. */
export function knockOutAxes2Names(g: CanvasRenderingContext2D, f: Frame, xl = '', yl = '') {
  if (simProjectStyle()) {
    if (isThumb(g) && !persistLabels) return;
    for (const n of axes2NameLayout(g, f, xl, yl)) {
      g.fillStyle = col.muted(); g.font = `${n.z}px system-ui,sans-serif`; g.textAlign = n.align; g.textBaseline = 'middle';
      fillWithHalo(g, n.s, n.x, n.y);
    }
    return;
  }
  for (const n of axes2NameLayout(g, f, xl, yl)) {
    fillPlotBehind(g, n.x0, n.y0, n.x1, n.y1, 3);
    g.fillStyle = col.muted(); g.font = `${n.z}px system-ui,sans-serif`; g.textAlign = n.align; g.textBaseline = 'middle';
    g.fillText(n.s, n.x, n.y);
  }
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
/** Format a tick so a small end-value is not rounded to "0" against a coarse axis step. */
export function tickLabelFine(v: number, step: number): string {
  const fine = Math.min(Math.abs(step) || 1, Math.abs(v) || Math.abs(step) || 1);
  return tickLabel(v, fine);
}
/** Compact power-of-ten form (10³, 10⁻²) when a tight axis cannot hold the long tick. */
export function compactTickLabel(lab: string): string {
  const n = Number(lab.replace(/−/g, '-'));
  if (!Number.isFinite(n) || n === 0) return lab;
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  const exp = Math.round(Math.log10(a));
  if (exp !== 0 && Math.abs(exp) >= 2 && Math.abs(a - 10 ** exp) <= 1e-9 * Math.max(1, a)) {
    const map: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return `${sign}10${[...String(exp)].map((ch) => map[ch] ?? ch).join('')}`;
  }
  return lab;
}
/** Test hook: plot box in device px, plus the data range, when window.__plotLog is an array. */
export function logPlotFrame(g: CanvasRenderingContext2D, f: Frame) {
  const log = (globalThis as unknown as { __plotLog?: unknown[] }).__plotLog; if (!Array.isArray(log)) return;
  const m = typeof g.getTransform === 'function' ? g.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const toDev = (x: number, y: number) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
  const p1 = toDev(f.box.l, f.box.t), p2 = toDev(f.box.r, f.box.b);
  const cv = g.canvas as HTMLCanvasElement;
  const cvs = (globalThis as unknown as { __textCanvases?: HTMLCanvasElement[] }).__textCanvases; let ci = -1;
  if (Array.isArray(cvs)) { ci = cvs.indexOf(cv); if (ci < 0) { cvs.push(cv); ci = cvs.length - 1; } }
  const card = cv.closest?.('[data-testid=step-card]') as HTMLElement | null;
  const where = cv.closest?.('.fig-overlay') ? 'expand' : cv.closest?.('.tile-frame') ? 'tile' : 'other';
  log.push({
    x0: Math.min(p1.x, p2.x), y0: Math.min(p1.y, p2.y), x1: Math.max(p1.x, p2.x), y1: Math.max(p1.y, p2.y),
    W: cv.width, H: cv.height, cv: ci,
    id: cv.closest?.('[data-fig]')?.getAttribute('data-fig') || cv.getAttribute?.('data-figure') || cv.getAttribute?.('data-big') || cv.id || '',
    gen: labelGen(cv), where, step: card?.getAttribute('data-step') || '',
    xr: [f.ix(f.box.l), f.ix(f.box.r)], yr: [f.iy(f.box.b), f.iy(f.box.t)],
  });
}
export function graphAxes(g: CanvasRenderingContext2D, f: Frame, xr: V2, yr: V2, xLabel: string, yLabel: string, xs = 0, ys = 0, xfmt?: (x: number) => string, yfmt?: (y: number) => string, avoid?: { x: number; y: number; r?: number }[]) {
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
  let titleRight = 16;
  withLabelRole('axis', () => {
    text(g, xLabel, (f.box.l + f.box.r) / 2, f.h - 5, col.text(), 'center', 11);
    // sit the y-title at the canvas edge, left of the tick-number column, and no taller than the plot box
    const yx = 10, yMid = (f.box.t + f.box.b) / 2, yRoom = Math.max(8, f.box.b - f.box.t - 4);
    g.font = '11px system-ui,sans-serif';
    const ySize = Math.max(9, Math.min(11, 11 * yRoom / Math.max(1, g.measureText(yLabel).width)));
    g.save(); g.translate(yx, yMid); g.rotate(-Math.PI / 2); text(g, yLabel, 0, 0, col.text(), 'center', ySize); g.restore();
    // keep tick numbers to the right of the y-title strip (title AABB is ±0.55·size around yx)
    titleRight = yx + ySize * 0.55 + 4;
  });
  withLabelRole('tick', () => {
    const tickX = f.box.l - 4;
    const tickRoom = Math.max(6, tickX - titleRight);
    let lastX = '', lastPx = -Infinity;
    const simAxes = simProjectStyle();
    let cornerTaken = false;
    const xDrawn: number[] = [];
    const drawXTick = (x: number, force = false) => {
      const lab = xfmt ? xfmt(x) : (force ? tickLabelFine(x, sx) : tickLabel(x, sx));
      if (!lab || lab === lastX) return false;
      g.font = '10px system-ui,sans-serif';
      const tw = g.measureText(lab).width;
      let px = f.X(x);
      const inCorner = simAxes && px - tw / 2 < f.box.l + 4;
      // at most one tick in the corner where the axes meet (BUG-74); 0 may sit there if it is first
      if (inCorner && cornerTaken) return false;
      const onMarkX = (avoid ?? []).some((mk) => Math.hypot((mk.x ?? px) - px, (mk.y ?? (f.box.b + 9)) - (f.box.b + 9)) < (mk.r ?? 10));
      if (Math.abs(px - lastPx) < 26 || onMarkX) return false;
      if (simAxes && !tickOnCanvas(g, lab, px, f.box.b + 9, 10, 'center')) {
        const W = g.canvas.width || 0;
        const nudged = Math.min(W - 1 - tw / 2, Math.max(tw / 2 + 1, px));
        if (Math.abs(nudged - px) < 0.5 || Math.abs(nudged - lastPx) < 26) return false;
        if (!tickOnCanvas(g, lab, nudged, f.box.b + 9, 10, 'center')) return false;
        px = nudged;
      }
      let ok = false;
      withAnchor({ kind: 'line', x: f.X(x), y: f.box.t, x2: f.X(x), y2: f.box.b }, () => {
        ok = text(g, lab, px, f.box.b + 9, col.muted(), 'center', 10);
      });
      if (!ok) return false;
      if (inCorner) cornerTaken = true;
      lastX = lab; lastPx = px; xDrawn.push(x); return true;
    };
    const xPix = f.box.r - f.box.l;
    // two centre-aligned ticks need ≥ 26 px each; below that, only the two end values (BUG-74)
    const tightX = simAxes && xPix < 56;
    forTicks(Math.ceil(xr[0] / sx) * sx, xr[1], sx, (x) => {
      g.strokeStyle = col.grid(); g.beginPath(); g.moveTo(f.X(x), f.box.t); g.lineTo(f.X(x), f.box.b); g.stroke();
      if (simAxes) { if (!tightX) drawXTick(x); }
      else {
        const lab = xfmt ? xfmt(x) : tickLabel(x, sx), px = f.X(x);
        const onMarkX = (avoid ?? []).some((mk) => Math.hypot((mk.x ?? px) - px, (mk.y ?? (f.box.b + 9)) - (f.box.b + 9)) < (mk.r ?? 10));
        if (lab && lab !== lastX && Math.abs(px - lastPx) >= 26 && !onMarkX) {
          withAnchor({ kind: 'line', x: px, y: f.box.t, x2: px, y2: f.box.b }, () => {
            text(g, lab, px, f.box.b + 9, col.muted(), 'center', 10);
          });
          lastX = lab; lastPx = px;
        }
      }
    });
    if (simAxes) {
      if (!tightX) {
        for (const x of min2Candidates(xr[0], xr[1], xDrawn)) {
          if (xDrawn.length >= 2 && Math.abs(x) > 1e-9) continue;
          drawXTick(x, true);
        }
      }
      if (xDrawn.length < 2) {
        const W = g.canvas.width || 0;
        const endVals = [xr[0], xr[1]].filter((x, i, a) => a.findIndex((u) => Math.abs(u - x) < 1e-8) === i);
        const fullLab = (x: number) => xfmt ? xfmt(x) : tickLabelFine(x, sx);
        const placeEndX = (x: number, lab: string, z: number) => {
          if (!lab || lab === lastX || xDrawn.some((u) => Math.abs(u - x) < 1e-8)) return false;
          g.font = `${z}px system-ui,sans-serif`;
          const al: CanvasTextAlign = f.X(x) >= (f.box.l + f.box.r) / 2 ? 'right' : 'left';
          const px = al === 'right' ? Math.min(f.X(x), W - 2) : Math.max(f.X(x), 2);
          if (Math.abs(px - lastPx) < 8 || !tickOnCanvas(g, lab, px, f.box.b + 9, z, al)) return false;
          let ok = false;
          withAnchor({ kind: 'line', x: f.X(x), y: f.box.t, x2: f.X(x), y2: f.box.b }, () => {
            ok = text(g, lab, px, f.box.b + 9, col.muted(), al, z);
          });
          if (!ok) return false;
          lastX = lab; lastPx = px; xDrawn.push(x); return true;
        };
        const tryEnds = (labOf: (x: number) => string, z: number) => {
          for (const x of endVals) {
            if (xDrawn.length >= 2) break;
            placeEndX(x, labOf(x), z);
          }
        };
        tryEnds(fullLab, 10);
        if (xDrawn.length < 2) tryEnds(fullLab, 9);
        if (xDrawn.length < 2) tryEnds((x) => compactTickLabel(fullLab(x)), 9);
      }
    }
    // one size for every y tick, never below 9 (BUG-61); keep 0 / 1 / 2 on a 0–2 axis, centred on the line (BUG-65)
    const yLabs: { lab: string; y: number; py: number }[] = [];
    forTicks(Math.ceil(yr[0] / sy) * sy, yr[1], sy, (y) => {
      g.strokeStyle = col.grid(); g.beginPath(); g.moveTo(f.box.l, f.Y(y)); g.lineTo(f.box.r, f.Y(y)); g.stroke();
      const lab = yfmt ? yfmt(y) : tickLabel(y, sy);
      if (lab) yLabs.push({ lab, y, py: f.Y(y) });
    });
    const keepY = (lab: string) => lab === '0' || lab === '0.5' || lab === '1' || lab === '2' || lab === '−0.5' || lab === '−1' || lab === '−2';
    g.font = '10px system-ui,sans-serif';
    const yWide = yLabs.reduce((w, t) => Math.max(w, g.measureText(t.lab).width), 0);
    const ySize = yWide <= tickRoom + 0.5 ? 10 : 9;
    let lastY = '', lastPy = Infinity;
    const yDrawn: number[] = [];
    const drawYTick = (t: { lab: string; y: number; py: number }, force = false) => {
      const onMark = (avoid ?? []).some((mk) => {
        const r = mk.r ?? 10;
        if (Math.abs(mk.y - t.py) >= r) return false;
        return mk.x === undefined || mk.x < f.box.l + 10;
      });
      if (t.lab === lastY) return false;
      const inCornerY = simAxes && t.py + ySize * 0.55 > f.box.b - 4;
      if (inCornerY && cornerTaken) return false;
      if (Math.abs(t.py - lastPy) < 14) return false;
      if (!force && onMark) return false;
      const inside = f.box.l + 3;
      const outerOk = tickOnCanvas(g, t.lab, tickX, t.py, ySize, 'right');
      const innerOk = tickOnCanvas(g, t.lab, inside, t.py, ySize, 'left');
      if (!outerOk && !innerOk) return false;
      const tryPaintAt = (xLab: number, al: CanvasTextAlign, py: number) => {
        let ok = false;
        withAnchor({ kind: 'line', x: f.box.l, y: t.py, x2: f.box.r, y2: t.py }, () => {
          ok = text(g, t.lab, xLab, py, col.muted(), al, ySize);
        });
        return ok;
      };
      const tryPaint = (xLab: number, al: CanvasTextAlign, _forced: boolean) => tryPaintAt(xLab, al, t.py);
      // prefer the left pad; if that is off-canvas or sits on an axis name, sit just inside the plot.
      // never force a pad tick onto a title.
      const accept = (py: number) => { lastY = t.lab; lastPy = py; yDrawn.push(t.y); return true; };
      if (outerOk && tryPaint(tickX, 'right', false)) {
        if (inCornerY) cornerTaken = true;
        return accept(t.py);
      }
      // sit inside the plot only when well above the x-tick row, so the number stays a y-tick (BUG-74)
      const clearOfXRow = t.py < f.box.b - 12;
      if (clearOfXRow && innerOk && tryPaint(inside, 'left', false)) return accept(t.py);
      // a top-of-plot "1" often sits on the y-axis name; nudge it down so min-2 can still hold
      for (const dy of [6, 10, 14]) {
        const py = t.py + dy;
        if (Math.abs(py - lastPy) < 14 || py > f.box.b - 12) break;
        if (tickOnCanvas(g, t.lab, tickX, py, ySize, 'right') && tryPaintAt(tickX, 'right', py)) return accept(py);
        if (clearOfXRow && tickOnCanvas(g, t.lab, inside, py, ySize, 'left') && tryPaintAt(inside, 'left', py)) return accept(py);
      }
      // a bottom-of-plot tick that lost the corner or the x-tick row can still sit just above it
      if (t.py > f.box.b - 24) {
        for (const dy of [-6, -10, -14, -18, -22]) {
          const py = t.py + dy;
          if (py < f.box.t + 4 || Math.abs(py - lastPy) < 14) continue;
          if (tickOnCanvas(g, t.lab, tickX, py, ySize, 'right') && tryPaintAt(tickX, 'right', py)) return accept(py);
          if (tickOnCanvas(g, t.lab, inside, py, ySize, 'left') && tryPaintAt(inside, 'left', py)) return accept(py);
        }
      }
      return false;
    };
    if (!simAxes) {
      for (const t of yLabs) {
        const onMark = (avoid ?? []).some((mk) => {
          const r = mk.r ?? 10;
          if (Math.abs(mk.y - t.py) >= r) return false;
          return mk.x === undefined || mk.x < f.box.l + 10;
        });
        if (t.lab === lastY) continue;
        if (!keepY(t.lab) && (Math.abs(t.py - lastPy) < 14 || onMark)) continue;
        withAnchor({ kind: 'line', x: f.box.l, y: t.py, x2: f.box.r, y2: t.py }, () => {
          text(g, t.lab, tickX, t.py, col.muted(), 'right', ySize);
        });
        lastY = t.lab; lastPy = t.py;
      }
    } else {
      for (const t of yLabs) drawYTick(t);
      const yInsetG = (f.box.b - f.box.t) > 8 && f.sy ? 6 / f.sy : 0;
      for (const y of min2Candidates(yr[0], yr[1], yDrawn)) {
        if (yDrawn.length >= 2 && Math.abs(y) > 1e-9) continue;
        const lab = yfmt ? yfmt(y) : tickLabelFine(y, sy);
        if (lab) drawYTick({ lab, y, py: f.Y(y) }, true);
      }
      if (yDrawn.length < 2) {
        const already = yDrawn[0] ?? yr[0];
        const far = Math.abs(yr[1] - already) >= Math.abs(already - yr[0]) ? yr[1] : yr[0];
        const lab = yfmt ? yfmt(far) : tickLabelFine(far, sy);
        if (lab && !yDrawn.some((u) => Math.abs(u - far) < 1e-8)) {
          const pys = [f.Y(far), f.box.t + 16, (f.box.t + f.box.b) / 2, f.Y(far) + 12, f.Y(far) + 20];
          for (const py of pys) {
            if (py < f.box.t + 4 || py > f.box.b - 12 || Math.abs(py - lastPy) < 14) continue;
            if (drawYTick({ lab, y: far, py }, true)) break;
          }
        }
      }
    }
  });
  g.strokeStyle = col.strong();
  if (yr[0] < 0 && yr[1] > 0) { g.beginPath(); g.moveTo(f.box.l, f.Y(0)); g.lineTo(f.box.r, f.Y(0)); g.stroke(); }
  if (xr[0] < 0 && xr[1] > 0) { g.beginPath(); g.moveTo(f.X(0), f.box.t); g.lineTo(f.X(0), f.box.b); g.stroke(); }
  logPlotFrame(g, f);
}
export function curve(g: CanvasRenderingContext2D, f: Frame, xs: ArrayLike<number>, ys: ArrayLike<number>, color: string, width = 2, dash: number[] = []) {
  const pts: { x: number; y: number }[] = [];
  g.save(); clipBox(g, f); g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath();
  let pen = false;
  for (let i = 0; i < xs.length; i++) { if (!Number.isFinite(ys[i])) { pen = false; continue; } const px = f.X(xs[i]), py = f.Y(ys[i]); pts.push({ x: px, y: py }); if (pen) g.lineTo(px, py); else { g.moveTo(px, py); pen = true; } }
  g.stroke(); g.restore(); g.setLineDash([]);
  logCurve(g, pts.filter((p) => p.x >= f.box.l - 1 && p.x <= f.box.r + 1 && p.y >= f.box.t - 1 && p.y <= f.box.b + 1), width);
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

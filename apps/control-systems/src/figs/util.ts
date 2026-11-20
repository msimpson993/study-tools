/** Shared drawing helpers for the control-systems figures (canvas, core viz). Every plot labels its own curves inside the plot. */
import { rangeFrame, graphAxes, text, tline, col, freeBlockShift, withLabelRole, type V2 } from '@study/core';

export type V = Record<string, number | string | boolean>;
export const num = (v: V, k: string, d = 0) => (typeof v[k] === 'number' ? (v[k] as number) : v[k] === undefined || v[k] === '' ? d : Number(v[k]));
export const str = (v: V, k: string, d = '') => (v[k] === undefined ? d : String(v[k]));
export const on = (v: V, k: string) => v[k] === true || v[k] === 'true' || v[k] === 1;
/** Fixed decimals with a real minus sign. */
/** fixed decimals with a real minus sign; a value that rounds to zero prints as 0 (never “−0.000”) */
export const f = (x: number, d = 2) => (Number.isFinite(x) ? (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d).replace('-', '−') : '—');
/** Thousands with thin spaces: 14 400. */
export const k3 = (x: number, d = 0) => (Number.isFinite(x) ? x.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('-', '−') : '—');
export const DEG = 180 / Math.PI;
export interface Item { label: string; color: string; dash?: boolean }

/** Wrap a sentence into lines no wider than maxW px. */
export function wrap(g: CanvasRenderingContext2D, s: string, maxW: number, size = 10): string[] {
  g.font = `${size}px system-ui, sans-serif`; const out: string[] = []; let line = '';
  for (const word of s.split(' ')) { const t = line ? `${line} ${word}` : word; if (g.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out;
}
/** Draw wrapped text; returns the y after the last line. */
export function para(g: CanvasRenderingContext2D, s: string, x: number, y: number, maxW: number, color = col.text(), size = 10, align: CanvasTextAlign = 'left'): number {
  for (const l of wrap(g, s, maxW, size)) { text(g, l, x, y, color, align, size); y += size + 3; } return y;
}
/** A legend drawn INSIDE the plot (top-left by default), one row per item, wrapping when the plot is narrow. */
/** How much curve ink (saturated, opaque pixels: the coloured curves, not grey grid, axes or text) lies in a user-space box. */
function inkIn(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): number {
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null; if (!m || typeof g.getImageData !== 'function') return 0;
  const X0 = Math.max(0, Math.floor(m.a * x0 + m.e)), Y0 = Math.max(0, Math.floor(m.d * y0 + m.f)), X1 = Math.min(g.canvas.width, Math.ceil(m.a * x1 + m.e)), Y1 = Math.min(g.canvas.height, Math.ceil(m.d * y1 + m.f));
  if (X1 - X0 < 2 || Y1 - Y0 < 2) return 0;
  let d: Uint8ClampedArray; try { d = g.getImageData(X0, Y0, X1 - X0, Y1 - Y0).data; } catch { return 0; }
  let n = 0; for (let i = 0; i < d.length; i += 8) { if (d[i + 3] < 140) continue; const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); if (mx - mn > 60) n++; }
  return n;
}
/** The colour the canvas shows through to (it is transparent): the first opaque background up its parents. */
function pageBg(cv: HTMLCanvasElement | undefined): string {
  for (let el: Element | null = cv && typeof getComputedStyle === 'function' ? cv : null; el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor; if (c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c)) return c; }
  return '#1d2330';
}
/** An in-plot legend. It starts in the asked corner; if the curves already drawn run through that spot, it moves to whichever corner
 *  (or the middle of the right or left edge) has the least curve under it, so a legend never sits on the lines it names (pass 2, N5).
 *  Draw the curves first. */
export function legend(g: CanvasRenderingContext2D, fr: { box: { l: number; t: number; r: number; b: number } }, items: Item[], where: 'tl' | 'tr' | 'bl' | 'br' = 'tl', size = 10) {
  const W = fr.box.r - fr.box.l, maxW = Math.max(60, W - 34);
  g.font = `${size}px system-ui, sans-serif`;
  const base = items.map((it) => { const lines = wrap(g, it.label, maxW, size), widest = Math.max(...lines.map((l) => g.measureText(l).width)); return { it, lines, widest }; });
  const hgt = base.reduce((a, r) => a + r.lines.length * (size + 3) + 1, 0), bw = Math.max(...base.map((r) => r.widest)) + 22;
  type Spot = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr';
  const top = (sp: Spot) => (sp[0] === 't' ? fr.box.t + 9 : sp[0] === 'b' ? fr.box.b - 6 - items.length * (size + 4) : (fr.box.t + fr.box.b) / 2 - hgt / 2 + size * 0.6);
  const left = (sp: Spot) => sp[1] === 'l';
  const boxOf = (sp: Spot) => { const y = top(sp), x0 = left(sp) ? fr.box.l + 6 : fr.box.r - 6 - bw; return [x0, y - size * 0.6, x0 + bw, y - size * 0.6 + hgt] as const; };
  const order: Spot[] = [where, ...(['tr', 'tl', 'br', 'bl', 'mr', 'ml'] as Spot[]).filter((q) => q !== where)];
  const score = (sp: Spot) => { const [a, b, c, d] = boxOf(sp); return inkIn(g, a, b, c, d); };
  let best: Spot = where, bs = score(where);
  if (bs > 3) for (const sp of order.slice(1)) { const sc = score(sp); if (sc < bs) { best = sp; bs = sc; } if (bs <= 3) break; }
  let y = top(best);
  const rows = base.map((r) => ({ ...r, x0: left(best) ? fr.box.l + 6 : fr.box.r - 6 - r.widest - 22 }));
  const bx0 = Math.min(...rows.map((r) => r.x0)), bx1 = Math.max(...rows.map((r) => r.x0 + 21 + r.widest));
  // then slide the whole block (swatches with their rows) clear of labels already drawn (core labels.ts)
  y += freeBlockShift(g, bx0, y - size * 0.6, bx1, y - size * 0.6 + hgt, size + 3);
  // a small plot can have no clear spot: then the legend gets a card in the page colour, so its text never sits on a line
  if (bs > 3) { g.save(); g.fillStyle = pageBg(g.canvas as HTMLCanvasElement); g.globalAlpha = 0.88; g.beginPath(); g.roundRect?.(bx0 - 3, y - size * 0.6 - 3, bx1 - bx0 + 6, hgt + 4, 3); g.fill(); g.restore(); }
  withLabelRole('axis', () => {
    for (const { it, lines, x0 } of rows) {
      g.save(); g.strokeStyle = it.color; g.lineWidth = 2.2; g.setLineDash(it.dash ? [5, 3] : []); g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 16, y); g.stroke(); g.restore();
      for (const l of lines) { text(g, l, x0 + 21, y, it.color, 'left', size); y += size + 3; }
      y += 1;
    }
  });
}
/** A standard time plot frame with axes; returns the frame. */
export function plotFrame(g: CanvasRenderingContext2D, w: number, h: number, xr: V2, yr: V2, xl: string, yl: string, L = 48) {
  g.setLineDash([]); g.clearRect(0, 0, w, h); const fr = rangeFrame(w, h, xr, yr, L, 12, 10, 32); graphAxes(g, fr, xr, yr, xl, yl); return fr;
}
/** Horizontal dashed reference with a right-aligned label. */
export function hline(g: CanvasRenderingContext2D, fr: ReturnType<typeof rangeFrame>, y: number, xr: V2, label: string, color = col.muted(), below = false) {
  tline(g, fr, [xr[0], y], [xr[1], y], color, 1, [5, 4]); if (label) text(g, label, fr.box.r - 4, fr.Y(y) + (below ? 10 : -8), color, 'right', 10);
}
export const range = (ys: ArrayLike<number>[], pad = 0.08, lo0?: number, hi0?: number): V2 => {
  let lo = Infinity, hi = -Infinity; for (const a of ys) for (let i = 0; i < a.length; i++) { const v = a[i]; if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  if (lo0 !== undefined) lo = Math.min(lo, lo0); if (hi0 !== undefined) hi = Math.max(hi, hi0); if (!(hi > lo)) { hi = lo + 1; } const p = (hi - lo) * pad; return [lo - p, hi + p];
};
export const lin = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
/** A two-column readout table on its own canvas: label left, value right, each row on a fixed line. Both columns are drawn as 'axis'
 *  labels, so the label-placement pass never slides a value onto the next row; a label too long for the room left beside its value is
 *  shrunk (down to 8 px) and then cut with an ellipsis, so it can never wrap or push the value. Returns the y after the last row. */
export function readoutRows(g: CanvasRenderingContext2D, w: number, rows: [string, string, string][], y0 = 14, step = 17, size = 11) {
  const font = (z: number) => `${z}px system-ui,sans-serif`;
  let y = y0;
  for (const [k, val, c] of rows) {
    g.font = font(size); const vw = g.measureText(val).width, room = Math.max(20, w - 16 - vw - 10);
    let z = size, lab = k; g.font = font(z); let lw = g.measureText(lab).width;
    if (lw > room) { z = Math.max(8, (size * room) / lw); g.font = font(z); lw = g.measureText(lab).width; }
    while (lw > room && lab.length > 2) { lab = lab.slice(0, -2).trimEnd() + '…'; lw = g.measureText(lab).width; }
    withLabelRole('axis', () => { text(g, lab, 8, y, col.muted(), 'left', z); text(g, val, w - 8, y, c, 'right', size); });
    y += step;
  }
  return y;
}

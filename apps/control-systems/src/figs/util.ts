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
export function legend(g: CanvasRenderingContext2D, fr: { box: { l: number; t: number; r: number; b: number } }, items: Item[], where: 'tl' | 'tr' | 'bl' | 'br' = 'tl', size = 10) {
  const W = fr.box.r - fr.box.l, maxW = Math.max(60, W - 34); let y = where[0] === 't' ? fr.box.t + 9 : fr.box.b - 6 - items.length * (size + 4);
  g.font = `${size}px system-ui, sans-serif`;
  // lay the rows out first, then slide the whole block (swatches with their rows) clear of labels already drawn (core labels.ts)
  const rows = items.map((it) => { const lines = wrap(g, it.label, maxW, size), widest = Math.max(...lines.map((l) => g.measureText(l).width)); return { it, lines, x0: where[1] === 'l' ? fr.box.l + 6 : fr.box.r - 6 - widest - 22, widest }; });
  const hgt = rows.reduce((a, r) => a + r.lines.length * (size + 3) + 1, 0), bx0 = Math.min(...rows.map((r) => r.x0)), bx1 = Math.max(...rows.map((r) => r.x0 + 21 + r.widest));
  y += freeBlockShift(g, bx0, y - size * 0.6, bx1, y - size * 0.6 + hgt, size + 3);
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

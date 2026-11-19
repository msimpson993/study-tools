import { rangeFrame, graphAxes, text, fitText, cssVar, type Frame } from '@study/core';
export const num = (v: Record<string, number | string | boolean>, k: string) => Number(v[k]);
export const fmt = (x: number, d = 2) => (!Number.isFinite(x) ? '∞' : Math.abs(x) < 0.5 * 10 ** -d ? '0' : x.toFixed(d)).replace('-', '−');
export const clampN = (x: number, lim: number) => Math.max(-lim, Math.min(lim, x));
/** A graph frame with grid, ticks and axis names. */
export function graph(g: CanvasRenderingContext2D, w: number, h: number, xr: [number, number], yr: [number, number], xl: string, yl: string, xs = 0, ys = 0, L = 44, xfmt?: (x: number) => string, T = 8): Frame {
  const f = rangeFrame(w, h, xr, yr, L, 10, T, 30); graphAxes(g, f, xr, yr, xl, yl, xs, ys, xfmt); return f;
}
/** Text on a soft plot-coloured backing so it stays legible over grid lines and curves. */
export function note(g: CanvasRenderingContext2D, s: string, x: number, y: number, color = cssVar('--text'), align: CanvasTextAlign = 'left', size = 11, base: CanvasTextBaseline = 'middle') {
  // the backing follows the fitted label (shrunk, slid in or split over two lines so it never runs off the panel)
  const f = fitText(g, s, x, align, size), n = f.lines.length, hh = f.size * (1.15 * (n - 1) + 1.3);
  const yc = base === 'top' ? y + f.size * 0.5 : base === 'bottom' || base === 'alphabetic' ? y - f.size * 0.5 : y;
  g.save(); g.globalAlpha = 0.82; g.fillStyle = cssVar('--plot-bg') || cssVar('--panel'); g.fillRect(f.x0 - 3, yc - hh / 2, f.x1 - f.x0 + 6, hh); g.restore();
  text(g, s, x, y, color, align, size, base);
}
/** Tick label for multiples of π: −2π, −π, 0, π, 2π (and π/2 steps when asked). */
export const piTick = (x: number) => { const k = Math.round((2 * x) / Math.PI); if (k === 0) return '0'; const n = k / 2, s = n < 0 ? '−' : ''; const a = Math.abs(n); return Number.isInteger(a) ? `${s}${a === 1 ? '' : a}π` : `${s}${Math.abs(k) === 1 ? '' : Math.abs(k)}π/2`; };

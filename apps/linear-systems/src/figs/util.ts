import { rangeFrame, graphAxes, text, cssVar, type Frame } from '@study/core';
export const num = (v: Record<string, number | string | boolean>, k: string) => Number(v[k]);
export const fmt = (x: number, d = 2) => (!Number.isFinite(x) ? '∞' : Math.abs(x) < 0.5 * 10 ** -d ? '0' : x.toFixed(d)).replace('-', '−');
export const clampN = (x: number, lim: number) => Math.max(-lim, Math.min(lim, x));
/** A graph frame with grid, ticks and axis names. */
export function graph(g: CanvasRenderingContext2D, w: number, h: number, xr: [number, number], yr: [number, number], xl: string, yl: string, xs = 0, ys = 0, L = 44): Frame {
  const f = rangeFrame(w, h, xr, yr, L, 10, 8, 30); graphAxes(g, f, xr, yr, xl, yl, xs, ys); return f;
}
/** Text on a soft plot-coloured backing so it stays legible over grid lines and curves. */
export function note(g: CanvasRenderingContext2D, s: string, x: number, y: number, color = cssVar('--text'), align: CanvasTextAlign = 'left', size = 11, base: CanvasTextBaseline = 'middle') {
  g.font = `${size}px system-ui,sans-serif`; const w = g.measureText(s).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  g.save(); g.globalAlpha = 0.82; g.fillStyle = cssVar('--plot-bg') || cssVar('--panel'); g.fillRect(x0 - 3, y - size * 0.65, w + 6, size * 1.3); g.restore();
  text(g, s, x, y, color, align, size, base);
}

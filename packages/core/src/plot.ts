import { resetLabels } from './labels';
export interface Series { xs: ArrayLike<number>; ys: ArrayLike<number>; color: string; dash?: number[]; width?: number; kind?: 'line' | 'stem' }
export interface PlotSpec {
  xr: [number, number]; yr: [number, number];
  xLabel: string; yLabel: string;
  series: Series[];
  vlines?: { x: number; color: string; label?: string }[];
}
export const cssVar = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';

/** Size a canvas to its CSS box at device pixel ratio; returns CSS-pixel size. */
export function fitCanvas(cv: HTMLCanvasElement): { w: number; h: number; g: CanvasRenderingContext2D } {
  // Prefer the tile frame's CSS box: the canvas is absolutely positioned and can
  // report 0×0 (or a stale style.height) before it is wrapped or laid out.
  const box = (cv.closest('.tile-frame') as HTMLElement | null) ?? cv;
  const r = box.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.round(r.width), hgt = Math.round(r.height);
  const g = cv.getContext('2d')!;
  // Not laid out yet: don't invent a 40 px box that then gets full-size decorations
  // (header bands) and can drive a scale or tick step through zero.
  if (w < 8 || hgt < 8) { resetLabels(cv); return { w: 0, h: 0, g }; }
  if (cv.width !== w * dpr || cv.height !== hgt * dpr) { cv.width = w * dpr; cv.height = hgt * dpr; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  resetLabels(cv); // a new draw: forget the labels placed last time (labels.ts)
  return { w, h: hgt, g };
}

function niceStep(span: number, n: number): number {
  if (!(span > 0) || !(n > 0)) return span > 0 ? span : 1;
  const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
function forPlotTicks(lo: number, hi: number, step: number, fn: (v: number) => void) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isFinite(step) || step <= 0 || hi < lo) return;
  const n = Math.floor((hi - lo) / step);
  if (!Number.isFinite(n) || n > 10_000) return;
  for (let x = lo, i = 0; x <= hi + 1e-9 && i <= n + 2; x += step, i++) fn(x);
}

/** Axes + series with named axes (labels carry units). */
export function drawPlot(g: CanvasRenderingContext2D, w: number, h: number, spec: PlotSpec): void {
  const grid = cssVar('--border'), axis = cssVar('--muted'), txt = cssVar('--text');
  const L = 46, R = 10, T = 8, B = 34;
  const X = (x: number) => L + ((x - spec.xr[0]) / (spec.xr[1] - spec.xr[0])) * (w - L - R);
  const Y = (y: number) => T + (1 - (y - spec.yr[0]) / (spec.yr[1] - spec.yr[0])) * (h - T - B);
  g.clearRect(0, 0, w, h);
  g.font = '10px system-ui,sans-serif';
  g.lineWidth = 1;
  const sx = niceStep(spec.xr[1] - spec.xr[0], 6), sy = niceStep(spec.yr[1] - spec.yr[0], 5);
  g.fillStyle = axis; g.strokeStyle = grid;
  g.textAlign = 'center'; g.textBaseline = 'top';
  forPlotTicks(Math.ceil(spec.xr[0] / sx) * sx, spec.xr[1], sx, (x) => {
    g.beginPath(); g.moveTo(X(x), T); g.lineTo(X(x), h - B); g.stroke();
    g.fillText(String(+x.toFixed(4)), X(x), h - B + 3);
  });
  g.textAlign = 'right'; g.textBaseline = 'middle';
  forPlotTicks(Math.ceil(spec.yr[0] / sy) * sy, spec.yr[1], sy, (y) => {
    g.beginPath(); g.moveTo(L, Y(y)); g.lineTo(w - R, Y(y)); g.stroke();
    g.fillText(String(+y.toFixed(4)), L - 4, Y(y));
  });
  g.strokeStyle = axis;
  if (spec.yr[0] < 0 && spec.yr[1] > 0) { g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(w - R, Y(0)); g.stroke(); }
  if (spec.xr[0] < 0 && spec.xr[1] > 0) { g.beginPath(); g.moveTo(X(0), T); g.lineTo(X(0), h - B); g.stroke(); }
  g.save(); g.beginPath(); g.rect(L, T, w - L - R, h - T - B); g.clip();
  for (const v of spec.vlines ?? []) { g.strokeStyle = v.color; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(v.x), T); g.lineTo(X(v.x), h - B); g.stroke(); }
  for (const s of spec.series) {
    g.strokeStyle = s.color; g.lineWidth = s.width ?? 2; g.setLineDash(s.dash ?? []);
    if (s.kind === 'stem') {
      for (let i = 0; i < s.xs.length; i++) { g.beginPath(); g.moveTo(X(s.xs[i]), Y(0)); g.lineTo(X(s.xs[i]), Y(s.ys[i])); g.stroke(); }
    } else {
      g.beginPath();
      for (let i = 0; i < s.xs.length; i++) { const px = X(s.xs[i]), py = Y(s.ys[i]); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
    }
  }
  g.restore(); g.setLineDash([]);
  g.fillStyle = txt; g.font = '11px system-ui,sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'bottom';
  g.fillText(spec.xLabel, L + (w - L - R) / 2, h - 2);
  g.save(); g.translate(11, T + (h - T - B) / 2); g.rotate(-Math.PI / 2); g.textBaseline = 'top'; g.fillText(spec.yLabel, 0, 0); g.restore();
}

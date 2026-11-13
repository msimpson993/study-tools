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
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.max(40, Math.round(r.width)), hgt = Math.max(40, Math.round(r.height));
  if (cv.width !== w * dpr || cv.height !== hgt * dpr) { cv.width = w * dpr; cv.height = hgt * dpr; }
  const g = cv.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h: hgt, g };
}

function niceStep(span: number, n: number): number {
  const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
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
  for (let x = Math.ceil(spec.xr[0] / sx) * sx; x <= spec.xr[1] + 1e-9; x += sx) {
    g.beginPath(); g.moveTo(X(x), T); g.lineTo(X(x), h - B); g.stroke();
    g.fillText(String(+x.toFixed(4)), X(x), h - B + 3);
  }
  g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let y = Math.ceil(spec.yr[0] / sy) * sy; y <= spec.yr[1] + 1e-9; y += sy) {
    g.beginPath(); g.moveTo(L, Y(y)); g.lineTo(w - R, Y(y)); g.stroke();
    g.fillText(String(+y.toFixed(4)), L - 4, Y(y));
  }
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

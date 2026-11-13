/**
 * The 14 "things that go wrong" of the appendix as live core Figures. Each case runs the PROBLEM at the slider settings against the FIXED version
 * (dashed): the core simulator (simulatePid) where it can, the app-local `runLoop` for the delay, sensor lag, nonlinearity, rate limit, set-point filter and dead zone.
 */
import { figureOf, rangeFrame, graphAxes, curve, tline, dot, text, wipe, col, type FigurePanel, type V2 } from '@study/core';
import { simulatePid, pidMetrics, type PidSimOptions, type PlantId } from '@study/core/dsp';
import { runLoop } from './loopsim';

type V = Record<string, number | string | boolean>;
interface Series { t: ArrayLike<number>; y: ArrayLike<number>; color: string; dash?: boolean; width?: number }
interface Plot { title: string; y: string; xr: V2; yr: V2; series: Series[]; hl?: { y: number; label?: string }[]; vl?: { x: number; label?: string }[]; peak?: { t: number; y: number; label: string } }
const n = (v: V, k: string) => v[k] as number;
const sim = (o: PidSimOptions) => simulatePid({ dt: 0.01, N: 20, ...o });
const nz = (a: number | undefined) => a ?? 0;

const draw = (g: CanvasRenderingContext2D, w: number, h: number, p: Plot) => {
  wipe(g, w, h);
  const f = rangeFrame(w, h, p.xr, p.yr, 46, 14, 10, 32);
  graphAxes(g, f, p.xr, p.yr, 'time (s)', p.y);
  for (const l of p.hl ?? []) { tline(g, f, [p.xr[0], l.y], [p.xr[1], l.y], col.muted(), 1, [5, 4]); if (l.label) text(g, l.label, f.box.r - 4, f.Y(l.y) - 8, col.muted(), 'right', 10); }
  for (const l of p.vl ?? []) { tline(g, f, [l.x, p.yr[0]], [l.x, p.yr[1]], col.c(), 1, [3, 3]); if (l.label) text(g, l.label, f.X(l.x) + 4, f.box.t + 10, col.c(), 'left', 10); }
  const clip = (a: ArrayLike<number>) => Array.from(a, (y) => Math.max(p.yr[0] - (p.yr[1] - p.yr[0]), Math.min(p.yr[1] + (p.yr[1] - p.yr[0]), y)));
  for (const s of [...p.series].sort((a, b) => Number(!!b.dash) - Number(!!a.dash))) {
    const m = s.t.length, step = Math.max(1, Math.floor(m / 800)), xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < m; i += step) { xs.push(s.t[i]); ys.push(s.y[i]); }
    curve(g, f, xs, clip(ys), s.color, s.width ?? (s.dash ? 2 : 2.4), s.dash ? [6, 4] : []);
  }
  if (p.peak) { dot(g, f, [p.peak.t, p.peak.y], col.b(), 4); text(g, p.peak.label, f.X(p.peak.t) + 8, f.Y(p.peak.y) - 8, col.b(), 'left', 10.5); }
  };
const PB = () => col.b(), FX = () => col.c();
type Run = { t: number[]; u: number[] };
/** the control signal of the problem run against the fixed one: the second panel every case shows */
const uPlot = (a: Run, b: Run, xr: V2, extra: Partial<Plot> = {}): Plot => {
  const all = [...a.u, ...b.u].filter(Number.isFinite).sort((x, y) => x - y), lo = all[Math.floor(0.01 * (all.length - 1))], hi = all[Math.floor(0.99 * (all.length - 1))], pad = (hi - lo) * 0.1 || 0.5;
  return { title: 'Control signal u(t)', y: 'control u', xr, yr: [Math.max(-8, lo - pad), Math.min(8, hi + pad)], series: [{ t: a.t, y: a.u, color: PB(), width: 1.6 }, { t: b.t, y: b.u, color: FX(), dash: true }], ...extra };
};
const pk = (s: { t: number[]; y: number[] }, tEnd?: number): Plot['peak'] => { const m = pidMetrics({ ...s, r: s.y.map(() => 1), u: s.y, e: s.y, ym: s.y, up: s.y, ui: s.y, ud: s.y, d: s.y, unstable: false, substeps: 1, dt: 0.01, warnings: [] } as never, { tEnd }); return m.overshootPct > 1 ? { t: m.peakTime, y: m.peak, label: `≈ ${Math.round(m.overshootPct)} % over` } : undefined; };

type Case = (v: V) => Plot[];
const CASES: Record<string, Case> = {
  slow: (v) => { const a = sim({ plant: 'p2', Kp: n(v, 'Kp'), Ki: n(v, 'Ki'), T: 30 }), b = sim({ plant: 'p2', Kp: 1.5, Ki: 1, T: 30 }); return [{ title: 'Slow response', y: 'output y', xr: [0, 30], yr: [0, 1.2], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }] }, uPlot(a, b, [0, 30])]; },
  offset: (v) => { const a = sim({ plant: 'p2', Kp: n(v, 'Kp'), Ki: n(v, 'Ki'), T: 20 }), b = sim({ plant: 'p2', Kp: 2, Ki: 1, T: 20 }); return [{ title: 'Steady-state offset', y: 'output y', xr: [0, 20], yr: [0, 1.3], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }] }, uPlot(a, b, [0, 20])]; },
  overshoot: (v) => { const a = sim({ plant: 'p2', Kp: n(v, 'Kp'), Ki: n(v, 'Ki'), Kd: n(v, 'Kd'), T: 15 }), b = sim({ plant: 'p2', Kp: 2, Ki: 1, T: 15 }); return [{ title: 'Overshoot', y: 'output y', xr: [0, 15], yr: [0, 1.6], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }], peak: pk(a) }, uPlot(a, b, [0, 15])]; },
  oscillation: (v) => { const a = sim({ plant: 'p3', Kp: n(v, 'Kp'), T: 20 }), b = sim({ plant: 'p3', Kp: 2, T: 20 }); return [{ title: 'Sustained oscillation / instability (Kᵤ = 8)', y: 'output y', xr: [0, 20], yr: [-1.5, 3.5], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }] }, uPlot(a, b, [0, 20])]; },
  disturbance: (v) => { const o = { plant: 'p2' as PlantId, r: 0, T: 20, dist: { t: 1, amp: 1 } }, a = sim({ ...o, Kp: n(v, 'Kp'), Ki: n(v, 'Ki') }), b = sim({ ...o, Kp: 3, Ki: 3 }); return [{ title: 'Poor disturbance rejection (r = 0)', y: 'output y', xr: [0, 20], yr: [-0.1, 0.6], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 0, label: 'target' }], vl: [{ x: 1, label: 'load d = 1 hits' }] }, uPlot(a, b, [0, 20])]; },
  noise: (v) => { const o = { plant: 'p2' as PlantId, Kp: 2, Ki: 1, noise: 0.02, T: 10 }, a = sim({ ...o, Kd: n(v, 'Kd'), N: n(v, 'N') }), b = sim({ ...o, Kd: 0.5, N: 10 }); return [
    { title: 'Output', y: 'output y', xr: [0, 10], yr: [0, 1.3], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1 }] },
    { title: 'Control signal', y: 'control u', xr: [0, 10], yr: [-3, 6], series: [{ t: a.t, y: a.u, color: PB(), width: 1.4 }, { t: b.t, y: b.u, color: FX(), dash: true }] }]; },
  windup: (v) => { const o = { plant: 'p1' as PlantId, Kp: n(v, 'Kp'), Ki: n(v, 'Ki'), umax: 1.2, T: 6 }, a = sim({ ...o, aw: v.aw as never }), b = sim({ plant: 'p1', Kp: 2, Ki: 4, umax: 1.2, aw: 'clamp', T: 6 }); return [
    { title: 'Output', y: 'output y', xr: [0, 6], yr: [0, 1.4], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }], peak: pk(a) },
    { title: 'Control (limit ±1.2)', y: 'control u', xr: [0, 6], yr: [-0.6, 2.2], series: [{ t: a.t, y: a.u, color: PB() }, { t: b.t, y: b.u, color: FX(), dash: true }], hl: [{ y: 1.2, label: 'limit +1.2' }] }]; },
  kick: (v) => { const o = { plant: 'p2' as PlantId, Kp: 2, Ki: 1, T: 1.5 }, a = sim({ ...o, Kd: n(v, 'Kd'), N: n(v, 'N'), dOnMeasurement: !!v.dm }), b = sim({ ...o, Kd: 0.5, N: 20, dOnMeasurement: true }); return [{ title: 'Control signal at a set-point step', y: 'control u', xr: [0, 1.5], yr: [0, 13], series: [{ t: a.t, y: a.u, color: PB() }, { t: b.t, y: b.u, color: FX(), dash: true }] }, { title: 'Output y(t)', y: 'output y', xr: [0, 1.5], yr: [0, 1.3], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }] }]; },
  limits: (v) => {
    const a = sim({ plant: 'p2', Kp: 2, Ki: n(v, 'Ki'), r: 2, umax: n(v, 'umax'), aw: 'clamp', T: 12 }), b = sim({ plant: 'p2', Kp: 2, Ki: n(v, 'Ki'), r: 2, T: 12 });
    const c1 = runLoop({ taus: [1, 1, 1], Kp: 3, Ki: 0.8, T: 25, dt: 0.01 }), c2 = runLoop({ taus: [1, 1, 1], Kp: 3, Ki: 0.8, rmax: n(v, 'rmax'), T: 25, dt: 0.01 });
    return [{ title: 'Amplitude limit |u| ≤ umax', y: 'output y', xr: [0, 12], yr: [0, 2.4], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 2, label: 'r = 2' }] },
      { title: 'Rate limit on u', y: 'output y', xr: [0, 25], yr: [0, 2], series: [{ ...c2, color: PB() }, { ...c1, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }] }]; },
  delay: (v) => { const a = runLoop({ taus: [1], delay: n(v, 'delay'), Kp: n(v, 'Kp'), Ki: n(v, 'Ki'), T: 30, dt: 0.01 }), b = runLoop({ taus: [1], delay: n(v, 'delay'), Kp: 0.5, Ki: 0.4, T: 30, dt: 0.01 }); return [{ title: 'Time delay (dead time)', y: 'output y', xr: [0, 30], yr: [-1, 2.5], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }] }, uPlot(a, b, [0, 30])]; },
  sensorlag: (v) => { const o = { taus: [1, 0.5], sensTau: n(v, 'sensTau'), T: 25, dt: 0.01 }, a = runLoop({ ...o, Kp: n(v, 'Kp'), Ki: n(v, 'Ki') }), b = runLoop({ ...o, Kp: 0.8, Ki: 0.4 }); return [{ title: 'Measurement (sensor) lag', y: 'output y', xr: [0, 25], yr: [0, 2], series: [{ t: a.t, y: a.ym, color: col.d(), dash: true, width: 1.6 }, { t: a.t, y: a.y, color: PB() }, { t: b.t, y: b.y, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }] }, uPlot(a, b, [0, 25])]; },
  nonlinear: (v) => {
    const f = (u: number) => Math.max(0, u) ** 2, r = n(v, 'r'), run = (rr: number, kp: number, ki: number) => { const s = runLoop({ taus: [1, 0.5], f, Kp: kp, Ki: ki, T: 30, dt: 0.01, r: () => rr }); return { t: s.t, y: s.y.map((y) => y / rr), u: s.u }; };
    const pb = run(r, n(v, 'Kp'), n(v, 'Ki')), fx = run(r, 2 / 3, 0.5);
    return [{ title: 'Nonlinearity: the plant gain depends on the operating point', y: 'normalised output y / r', xr: [0, 30], yr: [0, 2.4], series: [{ ...run(1, 2, 1.5), color: col.a() }, { ...pb, color: PB() }, { ...fx, color: FX(), dash: true }], hl: [{ y: 1, label: 'y / r = 1' }] }, uPlot(pb, fx, [0, 30])]; },
  twodof: (v) => { const d = (t: number) => (t >= 15 ? -1 : 0), tf = n(v, 'tauf'), o = { taus: [1, 0.5], T: 30, dt: 0.01, d, Kp: n(v, 'Kp'), Ki: n(v, 'Ki') }, a = runLoop({ ...o, r: (t) => (tf > 0 ? 1 - Math.exp(-t / tf) : 1) }), b = runLoop({ ...o, Kp: 1.5, Ki: 4, r: (t) => 1 - Math.exp(-t / 1.5) }); return [{ title: 'Set-point response against disturbance response', y: 'output y', xr: [0, 30], yr: [0, 1.7], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }], vl: [{ x: 15, label: 'load −1 hits' }] }, uPlot(a, b, [0, 30], { vl: [{ x: 15, label: 'load −1 hits' }] })]; },
  limitcycle: (v) => { const o = { taus: [1, Infinity], Kp: 0.5, dz: n(v, 'dz'), T: 100, dt: 0.02 }, a = runLoop({ ...o, Ki: n(v, 'Ki') }), b = runLoop({ ...o, dz: 0.3, Ki: 0.3 }); return [{ title: 'Limit cycle from a dead zone', y: 'output y', xr: [0, 100], yr: [-0.5, 2.5], series: [{ ...a, color: PB() }, { ...b, color: FX(), dash: true }], hl: [{ y: 1, label: 'r = 1' }] }, uPlot(a, b, [0, 100])]; },
};
void nz;
const DUMMY: V = { Kp: 1, Ki: 1, Kd: 0, N: 20, aw: 'none', dm: false, umax: 2.5, rmax: 0.5, delay: 1, sensTau: 1.5, r: 9, tauf: 0, dz: 0.3 };
export const caseFigure = (id: string) => figureOf((): FigurePanel[] => {
  const run = CASES[id], plots = run(DUMMY);
  return plots.map((p, i) => ({ id: `p${i}`, title: p.title, x: 'time (s)', y: p.y, draw: (g: CanvasRenderingContext2D, w: number, h: number, v: V) => draw(g, w, h, run(v)[i]) }));
});
export const CASE_IDS = Object.keys(CASES);

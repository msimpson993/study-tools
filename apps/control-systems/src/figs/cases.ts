/** The 14 symptom cards (kept from pid-tuning). Build 1: twelve run on the antenna dish, G = 0.1/(s(s + 2)), with the tutor's numbers.py [F] settings;
 *  review 1: the nonlinearity and limit-cycle cards run on the dish with gear stiction (numbers.py [R4] sim_stick). */
/**
 * The 14 "things that go wrong" of the appendix as live core Figures. Each case runs the PROBLEM at the slider settings against the FIXED version
 * (dashed): the core simulator (simulatePid) where it can, the app-local `runLoop` for the delay, sensor lag, nonlinearity, rate limit, set-point filter and dead zone.
 */
import { figureOf, rangeFrame, graphAxes, curve, tline, dot, text, wipe, col, type FigurePanel, type V2 } from '@study/core';
import { runLoop } from './loopsim';
import { legend, type Item } from './util';
const f2 = (x: number) => String(+x.toFixed(2));
import { dishCard, cardMet, cardWind, dishSat, dishSim, deg, type CardOpts } from '../model/plants';
import { DISH, DISH_TUNED } from '../model/params';
import * as M from '../model/plants';
const stickCache = new Map<string, ReturnType<typeof M.simStick>>();

type V = Record<string, number | string | boolean>;
interface Series { t: ArrayLike<number>; y: ArrayLike<number>; color: string; dash?: boolean; width?: number }
interface Plot { title: string; y: string; xr: V2; yr: V2; series: Series[]; hl?: { y: number; label?: string }[]; vl?: { x: number; label?: string }[]; peak?: { t: number; y: number; label: string }; notes?: string[]; /** an in-plot legend (the full-screen legend box is not the only key) */ legend?: Item[]; legendAt?: 'tl' | 'tr' | 'bl' | 'br' }
const n = (v: V, k: string) => v[k] as number;
const on = (v: V, k: string) => v[k] === true || v[k] === 'true';
const nz = (a: number | undefined) => a ?? 0;

const draw = (g: CanvasRenderingContext2D, w: number, h: number, p: Plot) => {
  wipe(g, w, h);
  const f = rangeFrame(w, h, p.xr, p.yr, 46, 14, 10, 32);
  graphAxes(g, f, p.xr, p.yr, 'time (s)', p.y);
  for (const l of p.hl ?? []) { tline(g, f, [p.xr[0], l.y], [p.xr[1], l.y], col.muted(), 1, [5, 4]); if (l.label) text(g, l.label, f.box.r - 4, f.Y(l.y) - 8, col.muted(), 'right', 10); }
  for (const l of p.vl ?? []) { tline(g, f, [l.x, p.yr[0]], [l.x, p.yr[1]], col.c(), 1, [3, 3]); if (l.label) text(g, l.label, f.X(l.x) + 4, f.box.b - 8, col.c(), 'left', 10); }
  const clip = (a: ArrayLike<number>) => Array.from(a, (y) => Math.max(p.yr[0] - (p.yr[1] - p.yr[0]), Math.min(p.yr[1] + (p.yr[1] - p.yr[0]), y)));
  for (const s of [...p.series].sort((a, b) => Number(!!b.dash) - Number(!!a.dash))) {
    const m = s.t.length, step = Math.max(1, Math.floor(m / 800)), xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < m; i += step) { xs.push(s.t[i]); ys.push(s.y[i]); }
    curve(g, f, xs, clip(ys), s.color, s.width ?? (s.dash ? 2 : 2.4), s.dash ? [6, 4] : []);
  }
  (p.notes ?? []).forEach((l, i) => text(g, l, f.box.l + 6, f.box.t + 12 + i * 13, i ? FX() : PB(), 'left', 10));
  if (p.peak) { dot(g, f, [p.peak.t, p.peak.y], col.b(), 4); text(g, p.peak.label, f.X(p.peak.t) + 8, f.Y(p.peak.y) - 8, col.b(), 'left', 10.5); }
  if (p.legend?.length) legend(g, f, p.legend, p.legendAt ?? 'br');
  };
const PB = () => col.b(), FX = () => col.c();
type Run = { t: number[]; u: number[] };
/** the control signal of the problem run against the fixed one: the second panel every case shows */
/** a y range that holds every finite sample of the given traces inside x range xr (plus the optional fixed values), padded; nothing is clipped */
const fitY = (ys: { t: ArrayLike<number>; y: ArrayLike<number> }[], xr: V2, pad = 0.1, also: number[] = [], cap = Infinity): V2 => {
  let lo = Infinity, hi = -Infinity;
  for (const v of also) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  for (const s of ys) for (let i = 0; i < s.y.length; i++) { const v = s.y[i]; if (s.t[i] >= xr[0] && s.t[i] <= xr[1] && Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  if (!(hi > lo)) { lo -= 1; hi += 1; }
  const p = (hi - lo) * pad; return [Math.max(-cap, lo - p), Math.min(cap, hi + p)];
};
const uPlot = (a: Run, b: Run, xr: V2, extra: Partial<Plot> = {}): Plot => {
  return { title: 'Control signal u(t)', y: 'control u', xr, yr: fitY([{ t: a.t, y: a.u }, { t: b.t, y: b.u }], xr, 0.1, [], 1e3), series: [{ t: a.t, y: a.u, color: PB(), width: 1.6 }, { t: b.t, y: b.u, color: FX(), dash: true }], ...extra };
};


/** the torque of the problem run against the fixed one (dish cards, N·m) */
const tPlot = (a: Run, b: Run, xr: V2, extra: Partial<Plot> = {}): Plot => {
  // fits both runs' whole range, so a short starting spike stays in view (an unstable run still runs off the capped axis, on purpose)
  const [lo, hi] = fitY([{ t: a.t, y: a.u }, { t: b.t, y: b.u }], xr, 0.12);
  return { title: 'Motor torque', y: 'torque (N·m)', xr, yr: [Math.max(-2000, lo), Math.min(5000, hi)], series: [{ t: a.t, y: a.u, color: PB(), width: 1.6 }, { t: b.t, y: b.u, color: FX(), dash: true }], ...extra };
};
/* ── dish runs: numbers.py [F] at dt = 1e-4, cached, thinned for drawing ── */
const cache = new Map<string, ReturnType<typeof dishCard>>();
const card = (o: CardOpts) => { const k = JSON.stringify(o); let r = cache.get(k); if (!r) { r = dishCard(o); if (cache.size > 40) cache.clear(); cache.set(k, r); } return r; };
const thin = (s: { t: ArrayLike<number>; y: ArrayLike<number>; u: ArrayLike<number> }, f: (y: number) => number = (y) => y, t0 = -Infinity) => {
  const t: number[] = [], y: number[] = [], u: number[] = [], step = Math.max(1, Math.floor(s.t.length / 1600));
  for (let i = 0; i < s.t.length; i += step) if (s.t[i] >= t0) { t.push(s.t[i]); y.push(f(s.y[i])); u.push(s.u[i]); }
  return { t, y, u };
};
const TUNED = { Kp: DISH_TUNED.Kp, Ki: DISH_TUNED.Ki, Kd: DISH_TUNED.Kd };
const gains = (v: V) => ({ Kp: n(v, 'Kp'), Ki: n(v, 'Ki'), Kd: n(v, 'Kd') });
const R0 = DISH.step, WIND = DISH.wind;
const pct = (x: number) => (Math.abs(x) > 1e4 ? 'unstable' : `${Math.max(0, x).toFixed(1)} %`);
const mtxt = (m: ReturnType<typeof cardMet>, T: number) => (m.unstable ? 'unstable: the swing grows' : `%OS ${pct(m.OS)}, Ts ${m.Ts >= T - 0.01 ? `> ${T.toFixed(0)} s (still ringing)` : `${m.Ts.toFixed(2)} s`}, Tr ${m.Tr.toFixed(3)} s`);
const wtxt = (w: ReturnType<typeof cardWind>, T: number) => `wind peak ${w.peak.toFixed(2)}°, ${Math.abs(w.final) > 0.05 ? `stays ${Math.abs(w.final).toFixed(2)}° off` : `cleared in ${w.recover >= T - 0.01 ? `> ${T.toFixed(0)}` : w.recover.toFixed(1)} s`}`;
/** a dish step card: angle / target and torque, problem (solid) against the fix (dashed), with the [F] read-outs */
function stepCard(title: string, a: CardOpts, b: CardOpts, xr: V2, opt: { r?: number; yr?: V2; upto?: number } = {}): Plot[] {
  const r = opt.r ?? R0, sa = card(a), sb = card(b), T = a.T ?? 10, ma = cardMet(sa.t, sa.y, r, opt.upto), mb = cardMet(sb.t, sb.y, r, opt.upto);
  const pa = thin(sa, (y) => y / r), pb = thin(sb, (y) => y / r);
  return [{ title, y: 'angle ÷ target', xr, yr: opt.yr ?? [0, 2], series: [{ ...pa, color: PB() }, { ...pb, color: FX(), dash: true }], hl: [{ y: 1, label: `target ${r === R0 ? '0.1 rad' : `${r} rad`}` }], notes: [`solid: ${mtxt(ma, T)}`, `dashed: ${mtxt(mb, b.T ?? 10)}`] },
    tPlot({ t: pa.t, u: pa.u }, { t: pb.t, u: pb.u }, xr)];
}
/** a dish wind card: pointing error after a 20 N·m gust at tw, problem against the fix */
function windCard(title: string, a: CardOpts, b: CardOpts, tw: number, T: number): Plot[] {
  const sa = card({ ...a, T, wind: WIND, twind: tw }), sb = card({ ...b, T, wind: WIND, twind: tw }), wa = cardWind(sa.t, sa.y, tw), wb = cardWind(sb.t, sb.y, tw);
  const err = (y: number) => deg(y - R0), pa = thin(sa, err, tw - 2), pb = thin(sb, err, tw - 2), top = Math.max(1, Math.ceil(Math.max(wa.peak, wb.peak) * 1.3 * 2) / 2);
  return [{ title, y: 'pointing error (°)', xr: [tw - 2, T], yr: [-0.3, top], series: [{ ...pa, color: PB() }, { ...pb, color: FX(), dash: true }], hl: [{ y: 0, label: 'on target' }], vl: [{ x: tw, label: `${WIND} N·m wind` }], notes: [`solid: ${wtxt(wa, T - tw)}`, `dashed: ${wtxt(wb, T - tw)}`] },
    tPlot({ t: pa.t, u: pa.u }, { t: pb.t, u: pb.u }, [tw - 2, T])];
}

type Case = (v: V) => Plot[];
const CASES: Record<string, Case> = {
  slow: (v) => stepCard('Slow response on the dish', { ...gains(v), T: 20 }, { ...TUNED, T: 20 }, [0, 8], { yr: [0, 1.4] }),
  offset: (v) => windCard('Steady-state offset in the wind', gains(v), { Kp: 1000, Ki: 500, Kd: 120 }, 10, 40),
  overshoot: (v) => stepCard('Overshoot', { ...gains(v), T: 20 }, { Kp: 1000, Ki: 500, Kd: 120, T: 20 }, [0, 6]),
  oscillation: (v) => stepCard('Sustained oscillation (Ki near the 2Kp bound)', { ...gains(v), T: 20 }, { Kp: 1000, Ki: 500, Kd: 120, T: 20 }, [0, 20], { yr: [-0.2, 2.2] }),
  disturbance: (v) => windCard('Poor disturbance rejection', gains(v), TUNED, 10, 40),
  noise: (v) => {
    const o = { ...TUNED, noise: (DISH.noiseDeg * Math.PI) / 180, seed: 7, T: 4, dt: 1e-4, every: 10 }, filt = on(v, 'filter'), a = dishSim({ ...o, Kd: n(v, 'Kd'), Nf: filt ? n(v, 'Nf') : 1 / o.dt }), b = dishSim({ ...o, Nf: DISH.Nf });
    const rms = (u: number[]) => { const tail = u.slice(Math.floor(u.length / 2)); const m = tail.reduce((s, x) => s + x, 0) / tail.length; return Math.sqrt(tail.reduce((s, x) => s + (x - m) ** 2, 0) / tail.length); };
    return [{ title: 'Torque: chatter from differentiated sensor noise', y: 'torque (N·m)', xr: [0, 4], yr: fitY([a, b].map((r) => ({ t: r.t, y: r.u })), [0, 4], 0.08, [-250, 250]), series: [{ t: a.t, y: a.u, color: PB(), width: 1.2 }, { t: b.t, y: b.u, color: FX(), dash: true }], notes: [`solid: Kd ${n(v, 'Kd')}, ${filt ? `filtered D (N_f = ${n(v, 'Nf')} rad/s)` : 'ideal D (no filter)'}: torque jitter ${rms(a.u).toFixed(0)} N·m rms (last 2 s)`, `dashed: Kd 200, filtered D (N_f = ${DISH.Nf} rad/s): ${rms(b.u).toFixed(0)} N·m rms`] },
      { title: 'Angle ÷ target: the dish itself barely notices', y: 'angle ÷ target', xr: [0, 4], yr: [0, 1.4], series: [{ t: a.t, y: a.y.map((y) => y / R0), color: PB() }, { t: b.t, y: b.y.map((y) => y / R0), color: FX(), dash: true }], hl: [{ y: 1, label: 'target 0.1 rad' }] }];
  },
  windup: (v) => {
    const r = n(v, 'slew'), a = dishSat(TUNED.Kp, TUNED.Ki, TUNED.Kd, r, DISH.Tmax, v.aw === 'clamp'), b = dishSat(TUNED.Kp, TUNED.Ki, TUNED.Kd, r, DISH.Tmax, true);
    return [{ title: 'Windup on a long slew (200 N·m limit)', y: 'angle ÷ target', xr: [0, 8], yr: [0, 1.5], series: [{ t: a.t, y: a.y.map((y) => y / r), color: PB() }, { t: b.t, y: b.y.map((y) => y / r), color: FX(), dash: true }], hl: [{ y: 1, label: `target ${r} rad` }], notes: [`solid: %OS ${a.OS.toFixed(1)} %, Ts ${a.Ts.toFixed(2)} s`, `dashed (clamping): %OS ${b.OS.toFixed(1)} %, Ts ${b.Ts.toFixed(2)} s`] },
      { title: 'Torque and the integrator\'s share', y: 'torque (N·m)', xr: [0, 8], yr: fitY([{ t: a.t, y: a.u }, { t: a.t, y: a.ii }, { t: b.t, y: b.u }], [0, 8], 0.08, [-260, 400]), series: [{ t: a.t, y: a.u, color: PB() }, { t: a.t, y: a.ii, color: col.d(), width: 1.4 }, { t: b.t, y: b.u, color: FX(), dash: true }], hl: [{ y: DISH.Tmax, label: 'limit 200 N·m' }], legend: [{ label: `torque, ${v.aw === 'clamp' ? 'clamping' : 'no anti-windup'}`, color: PB() }, { label: 'integrator\'s share of it', color: col.d() }, { label: 'torque with clamping', color: FX(), dash: true }], legendAt: 'tr' }];
  },
  kick: (v) => {
    const a = card({ ...TUNED, dm: !!v.dm, Nf: DISH.Nf, T: 5, umax: on(v, 'limit') ? DISH.Tmax : null }), b = card({ ...TUNED, dm: true, Nf: DISH.Nf, T: 5 }), ma = cardMet(a.t, a.y, R0), mb = cardMet(b.t, b.y, R0);
    const peak = (u: ArrayLike<number>) => Array.from(u).reduce((s, x) => Math.max(s, Math.abs(x)), 0), pa = thin(a), pb = thin(b);
    return [{ title: 'Torque at the command step', y: 'torque (N·m)', xr: [0, 0.5], yr: [-300, Math.max(400, Math.ceil(peak(a.u) / 500) * 500 + 200)], series: [{ t: pa.t, y: pa.u, color: PB() }, { t: pb.t, y: pb.u, color: FX(), dash: true }], notes: [`solid (D on the error, filtered D N_f = 200): peak torque ${peak(a.u).toFixed(0)} N·m`, `dashed (D on the measurement, filtered D N_f = 200): ${peak(b.u).toFixed(0)} N·m`] },
      { title: 'Angle ÷ target', y: 'angle ÷ target', xr: [0, 3], yr: [0, 1.4], series: [{ t: pa.t, y: pa.y.map((y) => y / R0), color: PB() }, { t: pb.t, y: pb.y.map((y) => y / R0), color: FX(), dash: true }], hl: [{ y: 1, label: 'target 0.1 rad' }], notes: [`solid: ${mtxt(ma, 5)}`, `dashed: ${mtxt(mb, 5)}`] }];
  },
  limits: (v) => stepCard('Torque limit on a 2 rad slew (clamping on)', { ...TUNED, r: 2, T: 12, umax: n(v, 'umax'), aw: true }, { ...TUNED, r: 2, T: 12, umax: 1000, aw: true }, [0, 2], { r: 2, yr: [0, 1.3] }),
  delay: (v) => stepCard('Time delay in the measurement', { ...gains(v), T: 15, delay: n(v, 'delay') }, { Kp: 800, Ki: 200, Kd: 110, T: 15, delay: n(v, 'delay') }, [0, 5], { yr: [-0.5, 2.5] }),
  sensorlag: (v) => stepCard('Sensor lag in the measurement', { ...TUNED, T: 15, lag: n(v, 'lag') }, { ...TUNED, T: 15, lag: 0.02 }, [0, 4], { yr: [0, 1.6] }),
  nonlinear: (v) => {
    // review 1 (W7): the dish with gear stiction (numbers.py [R4]); PD (2000, 0, 200), each step normalised to its size; dashed: the same loop without friction
    const Ts = n(v, 'Ts'), Tc = n(v, 'Tc'), run = (r: number, ts: number, tc: number) => { const k = `nl|${r}|${ts}|${tc}`; if (!stickCache.has(k)) stickCache.set(k, M.simStick(2000, 0, 200, { r, T: 6, Ts: ts, Tc: tc, every: 20 })); const s = stickCache.get(k)!; return { t: s.t, y: Array.from(s.y, (y) => y / r), u: s.u, final: s.final }; };
    const panel = (r: number): Plot => { const a = run(r, Ts, Tc), b = run(r, 0, 0), short = ((r - a.final) * 180) / Math.PI;
      return { title: `${r} rad step (${f2((r * 180) / Math.PI)}°)`, y: 'angle ÷ step', xr: [0, 3], yr: [0, 1.3], series: [{ t: a.t, y: a.y, color: PB() }, { t: b.t, y: b.y, color: FX(), dash: true }], hl: [{ y: 1, label: 'target' }],
        legend: [{ label: `stiction ${f2(Ts)}/${f2(Tc)} N·m: stops ${short.toFixed(3)}° short (${f2((100 * (r - a.final)) / r)} %)`, color: PB() }, { label: 'no friction', color: FX(), dash: true }], legendAt: 'br' }; };
    return [panel(0.02), panel(0.2)];
  },
  twodof: (v) => {
    const a = card({ ...TUNED, T: 40, b: n(v, 'b'), wind: WIND, twind: 10 }), b = card({ ...TUNED, T: 40, b: 0.9, wind: WIND, twind: 10 }), pa = thin(a, (y) => y / R0), pb = thin(b, (y) => y / R0);
    const t1 = (s: typeof a) => { const m = cardMet(s.t, s.y, R0, 10); return `%OS ${pct(m.OS)}, Ts ${m.Ts.toFixed(2)} s; ${wtxt(cardWind(s.t, s.y, 10), 30)}`; };
    return [{ title: 'Set-point weight b: the step, then a 20 N·m gust at 10 s', y: 'angle ÷ target', xr: [0, 30], yr: [0, 1.4], series: [{ ...pa, color: PB() }, { ...pb, color: FX(), dash: true }], hl: [{ y: 1, label: 'target 0.1 rad' }], vl: [{ x: 10, label: 'wind' }], notes: [`solid: ${t1(a)}`, `dashed (b = 0.9): ${t1(b)}`] },
      tPlot({ t: pa.t, u: pa.u }, { t: pb.t, u: pb.u }, [0, 30], { vl: [{ x: 10, label: 'wind' }] })];
  },
  limitcycle: (v) => {
    // review 1 (W7): stiction plus integral action hunts forever; an integrator dead band δ stops it (numbers.py [R4])
    const edb = n(v, 'edb'), run = (d: number) => { const k = `lc|${d}`; if (!stickCache.has(k)) stickCache.set(k, M.simStick(2000, 1000, 200, { T: 200, edb: d, every: 200 })); const s = stickCache.get(k)!; return { t: s.t, y: Array.from(s.y, (y) => ((y - 0.1) * 180) / Math.PI), u: Array.from(s.u) }; };
    const de = edb > 0 ? edb : 0.003, a = run(0), b = run(de), dd = (de * 180) / Math.PI;
    // the legend is read from the run, not assumed (tutor build 4, 1e): after 60 s, does the error still cross zero?
    let cross = 0, lo = Infinity, hi = -Infinity; for (let i = 1; i < b.t.length; i++) if (b.t[i] >= 60) { if (Math.sign(b.y[i]) !== Math.sign(b.y[i - 1]) && b.y[i] !== 0) cross++; lo = Math.min(lo, b.y[i]); hi = Math.max(hi, b.y[i]); }
    const sticks = cross === 0, endE = b.y[b.y.length - 1], dTxt = de.toFixed(4).replace(/0+$/, ''), sg = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(3)}°`;
    const bLab = sticks ? `with a dead band δ = ${dTxt} rad: sticks at ${sg(endE)}` : `δ = ${dTxt} rad is too narrow: still hunts (${sg(lo)} … ${sg(hi)})`;
    return [{ title: 'Pointing error with stiction, tuned PID (2000, 1000, 200)', y: 'error (°)', xr: [0, 200], yr: [-0.5, 0.3], series: [{ ...a, color: PB(), width: 1.8 }, { ...b, color: FX(), dash: true }], hl: [{ y: dd }, { y: -dd, label: `±δ = ±${dd.toFixed(2)}°` }, { y: 0 }],
      legend: [{ label: 'tuned PID: hunts ±0.15°, period 23.9 s', color: PB() }, { label: bLab, color: FX(), dash: true }], legendAt: 'br' },
      { title: 'Motor torque: the integrator builds it up while the gear is stuck', y: 'torque (N·m)', xr: [0, 200], yr: [-70, 40], series: [{ t: a.t, y: a.u, color: PB(), width: 1.6 }, { t: b.t, y: b.u, color: FX(), dash: true }], hl: [{ y: 20, label: 'T_st = 20 N·m' }, { y: -20 }],
        legend: [{ label: 'tuned PID: torque ramps to ±T_st, breaks free, overshoots', color: PB() }, { label: sticks ? 'dead band: torque stops changing' : 'band too narrow: torque still ramps', color: FX(), dash: true }], legendAt: 'br' }];
  },
};
void nz;
/** values used once to build each card's panel list (titles do not depend on them) */
const DUMMY: V = { Kp: 2000, Ki: 1000, Kd: 200, N: 20, aw: 'none', dm: false, limit: false, umax: 200, slew: 2, delay: 0.05, lag: 0.05, b: 1, filter: false, Nf: 200, rmax: 0.5, sensTau: 1.5, r: 9, tauf: 0, dz: 0.3, Ts: 20, Tc: 10, edb: 0.003 };
export const caseFigure = (id: string) => figureOf((): FigurePanel[] => {
  const run = CASES[id], plots = run(DUMMY);
  return plots.map((p, i) => ({ id: `p${i}`, title: p.title, x: 'time (s)', y: p.y, draw: (g: CanvasRenderingContext2D, w: number, h: number, v: V) => draw(g, w, h, run(v)[i]) }));
});
export const CASE_IDS = Object.keys(CASES);

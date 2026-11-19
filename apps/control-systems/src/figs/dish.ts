/** Antenna-dish figures (PGAIN → TUNE and children): azimuth angle θ in rad (readouts in °), torque in N·m, t in s. Numbers from ../model. */
import { figureOf, drawSPlane, drawRootLocus, rangeFrame, graphAxes, withLabelRole, curve, tline, dot, text, col, type FigurePanel, type V2 } from '@study/core';
import { C, rlocus, type Cx } from '@study/core/dsp';
import { DISH, DISH_TUNED, BEAM } from '../model/params';
import { dishG, dishP, dishSim, dishMetrics, dishZN, iseClosed, iaeOf, telescopeISE, telescopeIAE, roots, deg, type DishSimOpts } from '../model/plants';
import { type V, num, str, on, f, k3, legend, plotFrame, hline, range, lin, para } from './util';
import { drawDish } from './draw';

const W = DISH.windAt;
const at = (t: number[], y: number[], tt: number) => y[Math.max(0, Math.min(y.length - 1, Math.round((tt / (t[t.length - 1] || 1)) * (t.length - 1))))];
/** Closed-loop poles of the dish under PID (ideal D; D on measurement and on error share them). */
export const dishPoles = (Kp: number, Ki: number, Kd: number): Cx[] => (Ki ? roots([1, (DISH.B + Kd) / DISH.J, Kp / DISH.J, Ki / DISH.J]) : roots([1, (DISH.B + Kd) / DISH.J, Kp / DISH.J]));
const degs = (a: number[]) => a.map(deg);
/** Wind peak (°) and time back inside 0.05° after the gust, from a run with the gust at W. */
function windStats(t: number[], y: number[], ref: number) {
  let pk = 0, last: number = W; for (let i = 0; i < t.length; i++) if (t[i] >= W) { const e = Math.abs(deg(y[i] - ref)); if (e > pk) pk = e; if (e > 0.05) last = t[i]; }
  return { peak: pk, recover: last - W };
}
const angleFrame = (g: CanvasRenderingContext2D, w: number, h: number, T: number, ys: number[][], ref: number) => plotFrame(g, w, h, [0, T], range(ys, 0.08, 0, ref * 1.1), 'time (s)', 'θ (°)');

/* ── PGAIN · figure:antenna ── */
export const antennaPanels = (): FigurePanel[] => [
  {
    id: 'scene', title: 'The dish turning to the satellite', x: 'picture (seen from above)', y: 'angle',
    draw(g, w, h, v) {
      g.clearRect(0, 0, w, h); const Kp = num(v, 'Kp', 40), r = num(v, 'step', 0.1), tt = num(v, 't', 2), s = dishSim({ Kp, r: () => r, T: 6, dt: 1e-3 }), th = at(s.t, s.y, tt), u = Kp * (r - th);
      drawDish(g, 0, 0, w * 0.6, h, { theta: th, ref: r, torque: u, scale: 4 });
      const x = w * 0.6, mw = w * 0.4 - 6; let y = 16;
      y = para(g, `t = ${f(tt, 2)} s`, x, y, mw, col.text(), 10.5); y = para(g, `target ${f(deg(r), 1)}°, dish ${f(deg(th), 2)}°`, x, y, mw, col.text(), 10);
      y = para(g, `error ${f(deg(r - th), 2)}° → torque Kp·e = ${f(u, 1)} N·m`, x, y + 2, mw, col.b(), 10);
      para(g, '(angles drawn 4× larger)', x, y + 4, mw, col.muted(), 9.5);
    },
  },
  {
    id: 'theta', title: 'Dish angle θ(t) after the step', x: 'time (s)', y: 'θ (°)',
    draw(g, w, h, v) {
      const Kp = num(v, 'Kp', 40), r = num(v, 'step', 0.1), T = 6, t = lin(0, T, 601), P = dishP(Math.max(Kp, 1e-6)), s = dishSim({ Kp, r: () => r, T, dt: 1e-3 }), y = degs(s.y);
      const fr = angleFrame(g, w, h, T, [y], deg(r)); hline(g, fr, deg(r), [0, T], `target ${f(deg(r), 1)}°`, col.e()); curve(g, fr, s.t, y, col.a(), 2.4); dot(g, fr, [num(v, 't', 2), deg(at(s.t, s.y, num(v, 't', 2)))], col.e(), 4);
      legend(g, fr, [{ label: Kp > 0 ? `Kp ${f(Kp, 0)}: ζ = ${f(P.zeta, 2)}, %OS ${f(P.m.OS, 1)} %, Ts ${f(P.m.Ts, 2)} s` : 'Kp = 0: no torque, no motion', color: col.a() }], 'br'); void t;
    },
  },
  {
    id: 'poles', title: 'Closed-loop poles: s² + 2s + Kp/10', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v) { const Kp = num(v, 'Kp', 40), fr = drawSPlane(g, w, h, { range: 15, reCenter: -2, poles: roots([1, 2, Kp / DISH.J]), labels: true, marks: [{ s: C(0, 0), shape: 'ring', color: col.muted() }, { s: C(-2, 0), shape: 'ring', color: col.muted() }] }); para(g, Kp > 10 ? 'past Kp = 10 the poles split and climb: σ stays −1' : 'Kp ≤ 10: two real poles', fr.box.l + 4, fr.box.t + 10, fr.box.r - fr.box.l - 8, col.muted(), 10); },
  },
];
export const antennaFigure = figureOf(antennaPanels);

/* ── PGAIN · figure:locus (preview) ── */
export const locusFigure = figureOf(() => {
  const L = dishG(), rl = rlocus(L, { kmax: 3000 });
  return [{ id: 'locus', title: 'Root locus of Kp·0.1/(s(s + 2)) (preview: not in LN1/2/4)', x: 'σ (1/s)', y: 'jω (rad/s)', draw(g, w, h, v) { drawRootLocus(g, w, h, { rl, L, K: num(v, 'Kp', 1000), range: 20, reCenter: -4, showAsymptotes: true, showReadout: true }); } },
    { id: 'step', title: 'The 0.1 rad step at this Kp (no torque limit)', x: 'time (s)', y: 'θ (°)', draw(g, w, h, v) {
      const Kp = num(v, 'Kp', 1000), s = dishSim({ Kp, Ki: 0, Kd: 0, T: 6, dt: 5e-4, umax: 1e9 }), m = dishMetrics(s.t, s.y, DISH.step);
      const fr = plotFrame(g, w, h, [0, 6], [0, Math.max(10, ...s.y.map(deg)) * 1.05], 'time (s)', 'θ (°)'); hline(g, fr, deg(DISH.step), [0, 6], '', col.e());
      curve(g, fr, s.t, s.y.map(deg), col.a(), 2.2); legend(g, fr, [{ label: `Kp ${f(Kp, 0)}: %OS ${f(m.OS, 1)} %, Tₛ ${f(m.Ts, 1)} s`, color: col.a() }], 'br');
    } }] as FigurePanel[];
});

/* ── SPEED · figure:speed ── */
export const speedFigure = figureOf(() => [
  {
    id: 'w', title: 'Speed loop: dish speed after a torque step', x: 'time (s)', y: 'ω / final',
    draw(g, w, h, v) {
      const Kw = num(v, 'Kw', 80), t = lin(0, 3, 301), tau0 = DISH.J / DISH.B, tau = DISH.J / (DISH.B + Kw), fr = plotFrame(g, w, h, [0, 3], [0, 1.12], 'time (s)', 'ω / final');
      hline(g, fr, 1, [0, 3], ''); curve(g, fr, t, t.map((q) => 1 - Math.exp(-q / tau0)), col.muted(), 1.8, [6, 4]); curve(g, fr, t, t.map((q) => 1 - Math.exp(-q / tau)), col.a(), 2.4);
      legend(g, fr, [{ label: `no feedback: τ = J/B = ${f(tau0, 2)} s`, color: col.muted(), dash: true }, { label: `K_ω = ${f(Kw, 0)}: τ = J/(B + K_ω) = ${f(tau, 3)} s (${f(tau0 / tau, 1)}× faster)`, color: col.a() }], 'br');
    },
  },
  {
    id: 'pole', title: 'The speed loop\'s one pole: −(B + K_ω)/J', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v) {
      const Kw = num(v, 'Kw', 80), p = -(DISH.B + Kw) / DISH.J;
      drawSPlane(g, w, h, { range: 24, reCenter: -10, poles: [C(p, 0)], marks: [{ s: C(-DISH.B / DISH.J, 0), label: 'no feedback −2', color: col.muted(), shape: 'ring' }, { s: C(p, 0), label: `${f(p, 1)} /s`, color: col.a(), shape: 'dot' }] });
    },
  },
] as FigurePanel[]);

/* ── SSE + TYPE · figure:sse ── */
export function sseRun(v: V) {
  const Kp = num(v, 'Kp', 1000), inp = str(v, 'input', 'wind'), pi = str(v, 'ctrl', 'p') === 'pi', Ki = pi ? 500 : 0, Td = num(v, 'wind', 20), rate = num(v, 'rate', 1) / (180 / Math.PI), T = 10;
  const o: DishSimOpts = { Kp, Ki, Kd: 0, T, dt: 5e-4 };
  if (inp === 'step') o.r = () => DISH.step; else if (inp === 'ramp') o.r = (t) => rate * t; else { o.r = () => 0; o.d = (t) => (t >= 1 ? Td : 0); }
  const s = dishSim(o), e = s.r.map((q, i) => q - s.y[i]), eEnd = e[e.length - 1];
  const theory = inp === 'step' ? 0 : pi ? 0 : inp === 'ramp' ? (DISH.B * rate) / Kp : -Td / Kp;
  return { s, e, eEnd, theory, inp, pi, Kp, T };
}
export const sseFigure = figureOf(() => [
  {
    id: 'e', title: 'Pointing error e = target − θ', x: 'time (s)', y: 'e (°)',
    draw(g, w, h, v) {
      const r = sseRun(v), ed = degs(r.e), fr = plotFrame(g, w, h, [0, r.T], range([ed], 0.1, -0.2, 0.2), 'time (s)', 'e (°)'); tline(g, fr, [0, 0], [r.T, 0], col.strong(), 1);
      g.save(); g.fillStyle = 'rgba(110,226,110,.13)'; const y0 = fr.Y(BEAM.theta3 / 2), y1 = fr.Y(-BEAM.theta3 / 2); g.fillRect(fr.box.l, Math.max(fr.box.t, Math.min(y0, y1)), fr.box.r - fr.box.l, Math.min(fr.box.b, Math.max(y0, y1)) - Math.max(fr.box.t, Math.min(y0, y1))); g.restore();
      curve(g, fr, r.s.t, ed, col.a(), 2.2);
      legend(g, fr, [{ label: `final error ${f(deg(r.eEnd), 3)}° (FVT: ${f(deg(r.theory), 3)}°)`, color: col.a() }, { label: `green band: half the ${BEAM.theta3}° beam`, color: col.ok() }], 'tr');
    },
  },
  {
    id: 'fvt', title: 'The final-value theorem for this input', x: 'formula', y: '',
    draw(g, w, h, v) {
      g.clearRect(0, 0, w, h); const r = sseRun(v); let y = 14;
      const L = r.pi ? 'L(s) = (Kp s + Ki)/(s²(Js + B)): two integrators (type 2)' : 'L(s) = Kp/(s(Js + B)): one integrator (type 1)';
      const lines = [L, r.inp === 'step' ? 'step: e_ss = lim s·E(s) = 0 (any integrator does it)' : r.inp === 'ramp' ? (r.pi ? 'ramp: type 2 ⇒ e_ss = 0' : `ramp ω_r: e_ss = ω_r/K_v, K_v = Kp/B = ${f(r.Kp / DISH.B, 1)} /s ⇒ ${f(deg(r.theory), 3)}°`) : r.pi ? 'wind: the integrator sits before the wind ⇒ e_ss = 0' : `wind T_d: e_ss = −T_d/Kp = ${f(deg(r.theory), 3)}° (doubling Kp halves it)`];
      for (const l of lines) y = para(g, l, 8, y, w - 16, col.text(), 10.5) + 4;
      para(g, r.pi ? 'PI here uses Ki = 500 N·m/(rad·s)' : `pointing loss ≈ 12(θ/θ₃)² dB = ${f(12 * (deg(r.theory) / BEAM.theta3) ** 2, 2)} dB`, 8, y, w - 16, col.muted(), 10);
    },
  },
] as FigurePanel[]);

/* ── INT · figure:integral ── */
export const integralFigure = figureOf(() => [
  {
    id: 'theta', title: 'Step at 0 s, wind gust at 3 s (if on)', x: 'time (s)', y: 'θ (°)',
    draw(g, w, h, v) {
      const Kp = num(v, 'Kp', 1000), Ki = num(v, 'Ki', 500), wind = on(v, 'wind'), T = 12, s = dishSim({ Kp, Ki, T, dt: 5e-4, d: wind ? (t) => (t >= W ? DISH.wind : 0) : undefined }), y = degs(s.y);
      const fr = angleFrame(g, w, h, T, [y], deg(DISH.step)); hline(g, fr, deg(DISH.step), [0, T], 'target 5.73°', col.e());
      if (s.unstable || Ki >= 2 * Kp) { para(g, `Ki ≥ 2Kp: unstable (Routh on s³ + 2s² + 0.1Kp s + 0.1Ki)`, fr.box.l + 6, fr.box.t + 10, fr.box.r - fr.box.l - 12, col.bad(), 11); }
      curve(g, fr, s.t, y, col.a(), 2.2);
      if (wind && !s.unstable) { // the wind's own effect: the with-wind run minus the no-wind run (numbers.py [R3]), not |θ − target|, which still holds the step's ringing
        const s0 = dishSim({ Kp, Ki, T, dt: 5e-4 }); let pk = 0; for (let i = 0; i < s.t.length; i++) if (s.t[i] >= W) pk = Math.max(pk, Math.abs(deg(s.y[i] - s0.y[i])));
        tline(g, fr, [W, fr.iy(fr.box.t)], [W, fr.iy(fr.box.b)], col.d(), 1, [3, 3]); text(g, `wind alone: peak ${f(pk, 2)}°`, fr.X(W) + 4, fr.box.b - 10, col.d(), 'left', 10); }
    },
  },
  {
    id: 'poles', title: 'Three poles: the integrator adds a slow one', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v) { const Kp = num(v, 'Kp', 1000), Ki = num(v, 'Ki', 500), p = dishPoles(Kp, Ki, 0); drawSPlane(g, w, h, { range: 22, reCenter: -4, poles: p, labels: true, shadeUnstable: true }); },
  },
] as FigurePanel[]);

/* ── DER · figure:derivative ── */
export const derivativeFigure = figureOf(() => {
  const run = (v: V) => { const Kp = num(v, 'Kp', 1000), Kd = num(v, 'Kd', 120), dm = str(v, 'dmode', 'meas') === 'meas'; return { Kp, Kd, dm, s: dishSim({ Kp, Kd, dm, T: 2, dt: 1e-4, every: 20, noise: on(v, 'noise') ? DISH.noiseDeg / deg(1) : 0 }) }; };
  return [
    {
      id: 'theta', title: 'θ(t): same poles, D on error or on measurement', x: 'time (s)', y: 'θ (°)',
      draw(g, w, h, v) {
        const r = run(v), y = degs(r.s.y), m = dishMetrics(r.s.t, r.s.y, DISH.step), fr = angleFrame(g, w, h, 2, [y], deg(DISH.step));
        hline(g, fr, deg(DISH.step), [0, 2], 'target', col.e()); curve(g, fr, r.s.t, y, col.a(), 2.2);
        legend(g, fr, [{ label: `${r.dm ? 'D on measurement' : 'D on error'}: %OS ${f(m.OS, 1)} %, ζ = ${f((DISH.B + r.Kd) / (2 * Math.sqrt(r.Kp * DISH.J)), 2)}`, color: col.a() }, ...(r.dm ? [] : [{ label: `zero at −Kp/Kd = ${f(-r.Kp / Math.max(r.Kd, 1e-9), 2)}`, color: col.b() }])], 'br');
      },
    },
    {
      id: 'u', title: 'Motor torque', x: 'time (s)', y: 'torque (N·m)',
      draw(g, w, h, v) {
        const r = run(v), lo = Math.min(...r.s.u), hi = Math.max(...r.s.u), cap = r.dm ? hi : Math.min(hi, 6 * Math.max(Math.abs(lo), r.Kp * DISH.step)), fr = plotFrame(g, w, h, [0, 2], [Math.min(lo, -20), cap * 1.1], 'time (s)', 'N·m');
        curve(g, fr, r.s.t, r.s.u.map((q) => Math.min(q, cap * 1.1)), col.b(), 1.8);
        text(g, r.dm ? `starts at Kp·0.1 = ${f(r.Kp * DISH.step, 0)} N·m, no spike` : `kick at t = 0: peak ${k3(hi)} N·m (D of a step)`, fr.box.r - 6, fr.box.t + 10, col.b(), 'right', 10);
      },
    },
  ] as FigurePanel[];
});

/* ── TUNE · figure:gains (raise one gain at a time from the tuned set) ── */
const base = DISH_TUNED;
function gainRun(Kp: number, Ki: number, Kd: number) { const s = dishSim({ Kp, Ki, Kd, T: 12, dt: 2e-4, d: (t) => (t >= W ? DISH.wind : 0) }), m = dishMetrics(s.t.filter((t) => t < W), s.y.slice(0, s.t.filter((t) => t < W).length), DISH.step); return { s, m, w: windStats(s.t, s.y, DISH.step) }; }
const gainPanel = (id: 'Kp' | 'Ki' | 'Kd', title: string): FigurePanel => ({
  id, title, x: 'time (s)', y: 'θ (°)',
  draw(g, w, h, v) {
    const val = num(v, id, base[id]), gs = { ...base, [id]: val }, a = gainRun(gs.Kp, gs.Ki, gs.Kd), b0 = gainRun(base.Kp, base.Ki, base.Kd), T = 12;
    const fr = plotFrame(g, w, h, [0, T], [0, 7], 'time (s)', 'θ (°)'); hline(g, fr, deg(DISH.step), [0, T], '', col.e());
    curve(g, fr, b0.s.t, degs(b0.s.y), col.muted(), 1.6, [6, 4]); curve(g, fr, a.s.t, degs(a.s.y), col.a(), 2.2);
    legend(g, fr, [{ label: `(${gs.Kp}, ${gs.Ki}, ${gs.Kd}): %OS ${f(a.m.OS, 1)} %, Ts ${f(a.m.Ts, 2)} s`, color: col.a() }, { label: `wind peak ${f(a.w.peak, 3)}°, back in 0.05° after ${f(a.w.recover, 1)} s`, color: col.d() }, { label: 'start (2000, 1000, 200)', color: col.muted(), dash: true }], 'br');
  },
});
export const gainsFigure = figureOf(() => [gainPanel('Kp', 'Raise Kp'), gainPanel('Ki', 'Raise Ki'), gainPanel('Kd', 'Raise Kd')]);

/* ── TUNE · figure:tunetable ── */
export const TUNE_ROWS: [string, string, string, string, string, string, string][] = [
  ['raise Kp 2000→4000', 'faster (0.16→0.09 s)', '↑ 7.4→14.3 %', '↓ 2.2→0.31 s', '↓ 0.556→0.319°', '↑ 4.8→7.0 s', '↑ more chatter'],
  ['raise Ki 1000→3000', '~ (0.16→0.14 s)', '↑ 7.4→16.8 %', '↓ 2.2→1.45 s', '~ 0.556→0.518°', '↓ 4.8→1.6 s', '– no change'],
  ['raise Kd 200→400', 'slower (0.16→0.33 s)', '~ 7.4→7.6 %', '↑ 2.2→3.6 s', '↓ 0.556→0.488°', '~ 4.8→4.8 s', '↑ much more chatter'],
];
/** The table's overshoot, settling and wind-peak numbers [P10], for the bar panel (the noise column is qualitative and left out). */
export const TUNE_START = { os: 7.4, ts: 2.2, wind: 0.556 };
export const TUNE_NUM = [{ id: 'Kp', os: 14.3, ts: 0.31, wind: 0.319 }, { id: 'Ki', os: 16.8, ts: 1.45, wind: 0.518 }, { id: 'Kd', os: 7.6, ts: 3.6, wind: 0.488 }];
export const tunetableFigure = figureOf(() => [
  {
    id: 'table', title: 'Raise one gain from (2000, 1000, 200): what changes', x: '', y: '', height: 340,
    draw(g, w, h, v) {
      g.clearRect(0, 0, w, h); const cols = ['rise 10–90 %', 'overshoot', 'settling', 'wind peak', 'wind recovery', 'noise in torque'];
      const pick = str(v, 'row');
      let y = 14; text(g, 'measured on the dish, D on measurement [P10]', 8, y, col.muted(), 'left', 10); y += 18;
      for (const r of TUNE_ROWS.filter((r) => pick === 'all' || !pick || r[0].includes(pick))) { text(g, r[0], 8, y, col.e(), 'left', 11); y += 15; for (let i = 0; i < cols.length; i++) { text(g, cols[i], 16, y, col.muted(), 'left', 10); text(g, r[i + 1], w - 8, y, col.text(), 'right', 10); y += 13; } y += 6; }
    },
  },
  {
    id: 'bars', title: 'Overshoot, settling and wind peak: one gain raised, against the start', x: 'gain raised', y: 'value ÷ start value', height: 280,
    draw(g, w, h, v) {
      g.clearRect(0, 0, w, h); const pick = str(v, 'row'), rows = TUNE_NUM.filter((r) => pick === 'all' || !pick || r.id === pick);
      // categories, not numbers, along x: each group is named under its bars, with its three values on a second line
      // a group narrower than ~170 px (phones, any font) stacks its three values on three lines instead of one, so neighbours can't touch
      const stack = (w - 60) / Math.max(rows.length, 1) < 170, yr: V2 = [0, 3.7], fr = rangeFrame(w, h, [0, rows.length], yr, 48, 12, 10, stack ? 74 : 50);
      graphAxes(g, fr, [0, rows.length], yr, '', 'value ÷ start (1 = no change)', 1, 0.5, () => '');
      text(g, 'gain raised (from 2000, 1000, 200)', (fr.box.l + fr.box.r) / 2, h - 6, col.text(), 'center', 11);
      tline(g, fr, [0, 1], [rows.length, 1], col.muted(), 1, [5, 4]);
      const keys: ['os' | 'ts' | 'wind', string, () => string][] = [['os', '%OS', col.a], ['ts', 'Ts', col.b], ['wind', 'wind peak', col.d]];
      rows.forEach((r, i) => {
        keys.forEach(([k, , c], j) => { const x0 = fr.X(i + 0.15 + j * 0.24), x1 = fr.X(i + 0.37 + j * 0.24), q = r[k] / TUNE_START[k]; g.fillStyle = c(); g.fillRect(x0, fr.Y(Math.min(q, 2.6)), x1 - x0, fr.Y(0) - fr.Y(Math.min(q, 2.6))); });
        withLabelRole('axis', () => { text(g, `raise ${r.id}`, fr.X(i + 0.5), fr.box.b + 10, col.text(), 'center', 10.5); const vals = [`${f(r.os, 1)} %`, `${f(r.ts, 2)} s`, `${f(r.wind, 3)}°`];
          if (stack) vals.forEach((t, j) => text(g, t, fr.X(i + 0.5), fr.box.b + 23 + 11 * j, col.muted(), 'center', 9));
          else text(g, vals.join(', '), fr.X(i + 0.5), fr.box.b + 23, col.muted(), 'center', 9); });
      });
      legend(g, fr, [...keys.map(([, l, c]) => ({ label: l, color: c() })), { label: 'start: 7.4 %, 2.2 s, 0.556°', color: col.muted(), dash: true }], 'tr');
    },
  },
] as FigurePanel[]);

/* ── INDEX · figure:index ── */
export function indexOf(plant: string, K: number, kind: string) {
  if (plant === 'dish') { const a1 = 2 + 0.1 * K; return kind === 'ISE' ? iseClosed(a1, 100) : iaeOf(a1, 100, 6, 6001, kind === 'ITAE'); }
  return kind === 'ISE' ? telescopeISE(K) : kind === 'IAE' ? telescopeIAE(K) : iaeOf(0.5 * K, 2.5, 80, 40001, true);
}
export const indexFigure = figureOf(() => [
  {
    id: 'e', title: 'Step error e(t) and the area the index adds up', x: 'time (s)', y: 'e',
    draw(g, w, h, v) {
      const plant = str(v, 'plant', 'dish'), K = num(v, plant === 'dish' ? 'Kr' : 'K3', plant === 'dish' ? 80 : 4), kind = str(v, 'index', 'ISE');
      const a1 = plant === 'dish' ? 2 + 0.1 * K : 0.5 * K, a0 = plant === 'dish' ? 100 : 2.5, T = plant === 'dish' ? 3 : 12, t = lin(0, T, 601);
      const disc = a1 * a1 - 4 * a0, e = t.map((tt) => { if (disc < 0) { const s = a1 / 2, wd = Math.sqrt(-disc) / 2; return Math.exp(-s * tt) * (Math.cos(wd * tt) + (s / wd) * Math.sin(wd * tt)); } const r1 = (-a1 + Math.sqrt(disc)) / 2, r2 = (-a1 - Math.sqrt(disc)) / 2; return ((r1 + a1) * Math.exp(r1 * tt) - (r2 + a1) * Math.exp(r2 * tt)) / (r1 - r2); });
      const shown = kind === 'ISE' ? e.map((q) => q * q) : kind === 'IAE' ? e.map(Math.abs) : e.map((q, i) => t[i] * Math.abs(q));
      const fr = plotFrame(g, w, h, [0, T], range([e, shown], 0.08), 'time (s)', 'e(t)'); tline(g, fr, [0, 0], [T, 0], col.strong(), 1);
      g.save(); g.fillStyle = 'rgba(255,170,60,.25)'; g.beginPath(); g.moveTo(fr.X(0), fr.Y(0)); t.forEach((tt, i) => g.lineTo(fr.X(tt), fr.Y(shown[i]))); g.lineTo(fr.X(T), fr.Y(0)); g.closePath(); g.fill(); g.restore();
      curve(g, fr, t, e, col.a(), 2.2);
      legend(g, fr, [{ label: 'error e(t)', color: col.a() }, { label: `shaded: ${kind === 'ISE' ? 'e²' : kind === 'IAE' ? '|e|' : 't·|e|'}; ${kind} = ${f(indexOf(plant, K, kind), 4)}`, color: col.b() }], 'tr');
    },
  },
  {
    id: 'curve', title: 'Index vs gain: the minimum is the "best" gain', x: 'gain', y: 'index',
    draw(g, w, h, v) {
      const plant = str(v, 'plant', 'dish'), kind = str(v, 'index', 'ISE'), [lo, hi] = plant === 'dish' ? [20, 200] : [2, 6], K = num(v, plant === 'dish' ? 'Kr' : 'K3', plant === 'dish' ? 80 : 4);
      const ks = lin(lo, hi, 61), ys = ks.map((k) => indexOf(plant, k, kind)), fr = plotFrame(g, w, h, [lo, hi], range([ys], 0.1), plant === 'dish' ? 'K_r (N·m·s/rad)' : 'K₃', kind);
      curve(g, fr, ks, ys, col.b(), 2.2); let im = 0; ys.forEach((q, i) => { if (q < ys[im]) im = i; }); dot(g, fr, [ks[im], ys[im]], col.ok(), 5); text(g, `min near ${f(ks[im], plant === 'dish' ? 0 : 2)}`, fr.X(ks[im]), fr.Y(ys[im]) + 14, col.ok(), 'center', 10);
      dot(g, fr, [K, indexOf(plant, K, kind)], col.e(), 4);
    },
  },
] as FigurePanel[]);

/* ── WINDUP · figure:windup ── */
export const windupFigure = figureOf(() => {
  const run = (v: V) => { const r = num(v, 'slew', 2), lim = num(v, 'limit', DISH.Tmax), aw = str(v, 'aw', 'none') as 'none' | 'clamp' | 'backcalc'; const s = dishSim({ ...base, r: () => r, umax: lim, aw, T: 8, dt: 2e-4, every: 25 }), m = dishMetrics(s.t, s.y, r); return { r, lim, aw, s, m }; };
  return [
    {
      id: 'theta', title: 'Slew to a new satellite with a torque limit', x: 'time (s)', y: 'θ (°)',
      draw(g, w, h, v) {
        const a = run(v), y = degs(a.s.y), fr = angleFrame(g, w, h, 8, [y], deg(a.r)); hline(g, fr, deg(a.r), [0, 8], `target ${f(deg(a.r), 1)}°`, col.e()); curve(g, fr, a.s.t, y, col.a(), 2.2);
        legend(g, fr, [{ label: `anti-windup ${a.aw}: %OS ${f(a.m.OS, 1)} %, Ts ${f(a.m.Ts, 2)} s`, color: col.a() }], 'br');
      },
    },
    {
      id: 'u', title: 'Torque (saturated stretch shaded) and the integrator', x: 'time (s)', y: 'N·m',
      draw(g, w, h, v) {
        const a = run(v), fr = plotFrame(g, w, h, [0, 8], range([a.s.u, a.s.ui], 0.08, -a.lim, a.lim), 'time (s)', 'N·m');
        g.save(); g.fillStyle = 'rgba(255,90,90,.15)'; a.s.t.forEach((t, i) => { if (a.s.sat[i]) g.fillRect(fr.X(t), fr.box.t, Math.max(1, fr.X(t + 0.005) - fr.X(t)), fr.box.b - fr.box.t); }); g.restore();
        hline(g, fr, a.lim, [0, 8], `limit ±${f(a.lim, 0)} N·m`, col.bad()); hline(g, fr, -a.lim, [0, 8], '', col.bad()); curve(g, fr, a.s.t, a.s.u, col.b(), 2); curve(g, fr, a.s.t, a.s.ui, col.d(), 1.8, [6, 4]);
        legend(g, fr, [{ label: 'applied torque', color: col.b() }, { label: 'integral term Ki∫e', color: col.d(), dash: true }], 'tr');
      },
    },
  ] as FigurePanel[];
});

/* ── METHODS · figure:zn ── */
export const znFigure = figureOf(() => {
  const run = (v: V) => {
    const plant = str(v, 'plant', 'lag'), zn = on(v, 'zn'), dm = on(v, 'dm');
    if (plant === 'p3') { const Ku = 8, Kp = zn ? 4.8 : num(v, 'K', 300) / 75, Ki = zn ? 2.6464 : 0, Kd = zn ? 2.1766 : 0; return { plant, zn, Ku, s: p3Sim(Kp, Ki, Kd, dm), r: 1, T: 20, Kp }; }
    const z = dishZN(), lag = plant === 'lag' ? DISH.lag : 0, Kp = zn && plant === 'lag' ? z.Kp : num(v, 'K', 300), Ki = zn && plant === 'lag' ? z.Ki : 0, Kd = zn && plant === 'lag' ? z.Kd : 0;
    return { plant, zn, Ku: plant === 'lag' ? z.Ku : Infinity, s: dishSim({ Kp, Ki, Kd, dm, lag, r: () => DISH.step, T: 8, dt: 2e-4, Nf: 1e4 }), r: DISH.step, T: 8, Kp };
  };
  return [
    {
      id: 'out', title: 'Response to a step (P only until you apply ZN)', x: 'time (s)', y: 'output / target',
      draw(g, w, h, v) {
        const a = run(v), y = a.s.y.map((q) => q / a.r), fr = plotFrame(g, w, h, [0, a.T], [Math.max(-1, Math.min(0, ...y)), Math.min(3, Math.max(1.3, ...y) * 1.05)], 'time (s)', 'output / target');
        hline(g, fr, 1, [0, a.T], ''); curve(g, fr, a.s.t, y, col.a(), 2.2); const m = metricsOf2(a.s.t, a.s.y, a.r);
        legend(g, fr, [{ label: a.zn ? `ZN gains: %OS ${f(m.OS, 1)} %` : `P, K = ${f(a.Kp, a.plant === 'p3' ? 2 : 0)}`, color: col.a() }], 'br');
      },
    },
    {
      id: 'read', title: 'Ziegler–Nichols: find Kᵤ, then use the table', x: 'recipe', y: '',
      draw(g, w, h, v) {
        g.clearRect(0, 0, w, h); const a = run(v), z = dishZN(); let y = 14;
        const lines = a.plant === 'dish' ? ['ideal dish: no ultimate gain', 's² + 2s + 0.1K is stable for every K, so P-only never rings forever: ZN has nothing to measure.', 'add the 0.05 s amplifier lag (plant seg) to use ZN.']
          : a.plant === 'lag' ? [`Routh on s³ + 22s² + 40s + 2K: Kᵤ = ${f(z.Ku, 0)} N·m/rad, ωᵤ = ${f(z.wu, 3)} rad/s, Tᵤ = ${f(z.Tu, 4)} s`, `PID: Kp = 0.6Kᵤ = ${f(z.Kp, 1)}, Tᵢ = Tᵤ/2 = ${f(z.Ti, 4)}, T_D = Tᵤ/8 = ${f(z.TD, 4)}`, `⇒ Ki = ${f(z.Ki, 1)}, Kd = ${f(z.Kd, 2)}`, 'ZN aims at fast disturbance rejection, not low overshoot.']
            : ['legacy p3 = 1/(s + 1)³: Kᵤ = 8, Tᵤ = 3.628 s', 'ZN PID: Kp 4.8, Ki 2.646, Kd 2.177', '43 % overshoot with the derivative filter (N = 20); 41 % with ideal D.'];
        for (const [i, l] of lines.entries()) y = para(g, l, 8, y, w - 16, i === 0 ? col.e() : col.text(), 10.5) + 4;
      },
    },
  ] as FigurePanel[];
});
function metricsOf2(t: number[], y: number[], r: number) { return dishMetrics(t, y, r); }
/** The legacy p3 = 1/(s + 1)³ loop, D on error or measurement (filter N = 20), unit step. */
function p3Sim(Kp: number, Ki: number, Kd: number, dm: boolean) {
  const dt = 1e-3, n = 20000, N = 20; let x1 = 0, x2 = 0, x3 = 0, xi = 0, xf = 0; const t: number[] = [], y: number[] = [];
  for (let i = 0; i <= n; i++) { const e = 1 - x3, ed = dm ? -x3 : e, ud = Kd * N * (ed - xf), u = Kp * e + Ki * xi + ud; if (i % 10 === 0) { t.push(i * dt); y.push(x3); } xi += dt * e; xf += dt * N * (ed - xf); const d1 = -x1 + u, d2 = -x2 + x1, d3 = -x3 + x2; x1 += dt * d1; x2 += dt * d2; x3 += dt * d3; }
  return { t, y, u: [] as number[] };
}
void iseClosed; void k3;

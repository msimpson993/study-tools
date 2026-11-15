/**
 * State-feedback chapter figures, all on the running cart A=[[0,1],[-2,-3]], B=[0,1]ᵀ, C=[1,0].
 * Gains K=[23,5], L=[37,512], N̄=25 are the worked numbers (Ackermann / duality / DC gain); sliders explore around them.
 */
import { figureOf, drawStepResponse, drawSPlane, rangeFrame, graphAxes, curve, tline, dot, text, wipe, col, type FigurePanel, type V2 } from '@study/core';
import { C, tf, step, rlocus, observerGain, simulateSfb, type Cx } from '@study/core/dsp';
import type { Mat } from '@study/core/dsp';

type V = Record<string, number | string | boolean>;
const num = (v: V, k: string, d = 0) => (typeof v[k] === 'number' ? (v[k] as number) : d);
const f2 = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('-', '−') : '—');

export const CART_A: Mat = [[0, 1], [-2, -3]], CART_B: Mat = [[0], [1]], CART_C: Mat = [[1, 0]];
export const CART_K = [23, 5], CART_L = [37, 512], CART_NBAR = 25;
const Kp = (v: V) => [num(v, 'k1', 23), num(v, 'k2', 5)];
const Lp = (v: V) => {
  const mul = Math.max(1, num(v, 'speed', 5));
  return observerGain(CART_A, CART_C, [C(-4 * mul, 3 * mul), C(-4 * mul, -3 * mul)]);
};

const sim = (v: V, o: { useEstimate: boolean; xh0?: number[]; noise?: number; r?: number; T?: number }) =>
  simulateSfb({
    A: CART_A, B: CART_B, C: CART_C, K: Kp(v), L: Lp(v), Nbar: num(v, 'Nbar', 25),
    r: () => (o.r ?? 1), x0: [0, 0], xh0: o.xh0 ?? [num(v, 'e0', 0.2), 0],
    useEstimate: o.useEstimate, T: o.T ?? 3, dt: 0.002, noise: o.noise ?? num(v, 'noise', 0),
  });

/* ── controllability / observability: phase plane + the two matrices ── */
export const ccFigure = figureOf(() => [
  {
    id: 'phase', title: 'The cart in the (x, ẋ) plane after a 1 N push', x: 'position x (m)', y: 'velocity ẋ (m/s)',
    draw(g, w, h, v) {
      wipe(g, w, h);
      const cancelled = !!v.hidden;
      // healthy cart: ẍ+3ẋ+2x=u; hidden mode: a parallel unstable state the input never reaches
      const dt = 0.01, n = 800, xs: number[] = [], vs: number[] = []; let x = num(v, 'x0', 0), vel = num(v, 'v0', 0);
      for (let i = 0; i <= n; i++) {
        xs.push(x); vs.push(vel);
        const a = cancelled ? -1 * x + 1 : -2 * x - 3 * vel + 1;
        vel += dt * a; x += dt * vel;
      }
      const xr: V2 = [-0.15, Math.max(0.7, Math.max(...xs) * 1.15)], yr: V2 = [Math.min(-0.2, Math.min(...vs) * 1.2), Math.max(0.5, Math.max(...vs) * 1.2)];
      const f = rangeFrame(w, h, xr, yr, 46, 14, 10, 32);
      graphAxes(g, f, xr, yr, 'position x (m)', 'velocity ẋ (m/s)');
      tline(g, f, [0, yr[0]], [0, yr[1]], col.muted(), 1, [3, 3]); tline(g, f, [xr[0], 0], [xr[1], 0], col.muted(), 1, [3, 3]);
      curve(g, f, xs, vs, col.a(), 2.2);
      dot(g, f, [xs[0], vs[0]], col.a(), 4);
      text(g, cancelled ? 'hidden unstable mode: the path is not the whole plane' : 'every (x, ẋ) is reachable from the force u', f.box.l + 6, f.box.t + 14, col.text(), 'left', 10.5);
    },
  },
  {
    id: 'mat', title: 'Pc and Po on this plant', x: '', y: '',
    draw(g, w, h, v) {
      wipe(g, w, h);
      const cancelled = !!v.hidden;
      const lines = cancelled
        ? ['Hidden mode (G(s) = 1/(s+1) looks fine):', 'A = diag(−1, +1),  B = (1, 0)ᵀ,  C = (1, 0)', 'Pc = [[1, −1], [0, 0]]    det Pc = 0', 'Po = [[1, 0], [−1, 0]]    det Po = 0', 'The +1 eigenvalue is neither reached', 'by u nor seen at y — G(s) hides it.']
        : ['Running cart:', 'Pc = [B  AB] = [[0, 1], [1, −3]]', 'det Pc = −1  (full rank: controllable)', 'Po = [C; CA] = [[1, 0], [0, 1]]', 'det Po = 1   (full rank: observable)', 'Position alone recovers velocity.'];
      const colr = cancelled ? col.bad() : col.ok();
      lines.forEach((s, i) => text(g, s, 16, 28 + i * 22, i === 0 ? col.text() : colr, 'left', 13));
    },
  },
] as FigurePanel[]);

/* ── full-state feedback vs output-feedback locus ── */
export const sfFigure = figureOf(() => [
  {
    id: 'plane', title: 'P-control locus vs state-feedback poles', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v) {
      const K = num(v, 'Kcmp', 7), poles: Cx[] = [C(-4, 3), C(-4, -3)];
      const rl = rlocus(tf([1], [1, 3, 2]), { kmax: 40 });
      // closed-loop P poles at K: s²+3s+(2+K)=0
      const disc = 9 - 4 * (2 + K), pP: Cx[] = disc >= 0 ? [C((-3 + Math.sqrt(disc)) / 2, 0), C((-3 - Math.sqrt(disc)) / 2, 0)] : [C(-1.5, Math.sqrt(-disc) / 2), C(-1.5, -Math.sqrt(-disc) / 2)];
      const k1 = Kp(v)[0], k2 = Kp(v)[1];
      // A-BK poles from char s²+(3+k2)s+(2+k1)
      const a1 = 3 + k2, a0 = 2 + k1, d2 = a1 * a1 - 4 * a0;
      const pK: Cx[] = d2 >= 0 ? [C((-a1 + Math.sqrt(d2)) / 2, 0), C((-a1 - Math.sqrt(d2)) / 2, 0)] : [C(-a1 / 2, Math.sqrt(-d2) / 2), C(-a1 / 2, -Math.sqrt(-d2) / 2)];
      void poles;
      const f = drawSPlane(g, w, h, {
        range: 8, reCenter: -2,
        poles: pK, labels: true, locus: rl.branches,
        marks: pP.map((s) => ({ s, shape: 'ring' as const, color: col.c() })),
      });
      text(g, `grey path / cyan rings: P control at K = ${f2(K, 1)}`, f.box.l + 6, f.box.b - 22, col.c(), 'left', 10);
      text(g, `green ×: state feedback, K = [${f2(k1, 1)}, ${f2(k2, 1)}]`, f.box.l + 6, f.box.b - 8, col.ok(), 'left', 10);
    },
  },
  {
    id: 'step', title: 'Step to 1 m: state feedback vs P control', x: 'time (s)', y: 'position (m)',
    draw(g, w, h, v) {
      const s = sim(v, { useEstimate: false, xh0: [0, 0], r: 1, T: 4 });
      const Gcl = tf([num(v, 'Kcmp', 7)], [1, 3, 2 + num(v, 'Kcmp', 7)]); // CG/(1+CG) with C=K, G=1/(s²+3s+2)
      const p = step(Gcl, 4, 500);
      drawStepResponse(g, w, h, {
        t: s.t, y: s.x.map((z) => z[0]), tEnd: 4, ref: 1, yRange: [-0.05, 1.4],
        ghost: { t: p.t, y: p.y, label: `P control, K = ${f2(num(v, 'Kcmp', 7), 1)}` },
        show: { overshoot: true, settling: true, band: true },
      });
    },
  },
] as FigurePanel[]);

/* ── observer: true vs estimated velocity, speed and noise sliders ── */
export const obsFigure = figureOf(() => [
  {
    id: 'vel', title: 'Velocity: true ẋ and the observer’s estimate', x: 'time (s)', y: 'velocity (m/s)',
    draw(g, w, h, v) {
      const s = sim(v, { useEstimate: true, r: 1, T: 2, noise: num(v, 'noise', 0) });
      wipe(g, w, h);
      const yv = s.x.map((z) => z[1]), ev = s.xh.map((z) => z[1]);
      const lo = Math.min(-0.2, ...yv, ...ev) * 1.1, hi = Math.max(0.2, ...yv, ...ev) * 1.15;
      const yr: V2 = [lo, hi], f = rangeFrame(w, h, [0, 2], yr, 46, 14, 10, 32);
      graphAxes(g, f, [0, 2], yr, 'time (s)', 'velocity (m/s)');
      curve(g, f, s.t, yv, col.a(), 2.4); curve(g, f, s.t, ev, col.b(), 2, [5, 3]);
      text(g, 'true ẋ', f.box.r - 6, f.box.t + 14, col.a(), 'right', 11);
      text(g, 'estimate ẋ̂', f.box.r - 6, f.box.t + 30, col.b(), 'right', 11);
      text(g, `observer ${f2(num(v, 'speed', 5), 1)}× the controller,  L ≈ [${f2(Lp(v)[0], 0)}, ${f2(Lp(v)[1], 0)}]`, f.box.l + 6, f.box.b - 8, col.text(), 'left', 10);
    },
  },
  {
    id: 'pos', title: 'Position: measurement (and noise) vs the estimate', x: 'time (s)', y: 'position (m)',
    draw(g, w, h, v) {
      const s = sim(v, { useEstimate: true, r: 1, T: 2, noise: num(v, 'noise', 0) });
      drawStepResponse(g, w, h, {
        t: s.t, y: s.x.map((z) => z[0]), tEnd: 2, ref: 1, yRange: [-0.1, 1.4],
        ghost: { t: s.t, y: s.xh.map((z) => z[0]), label: 'estimate x̂' },
        show: { band: false },
      });
    },
  },
] as FigurePanel[]);

/* ── separation: true-state vs estimated-state feedback ── */
export const sepFigure = figureOf(() => [
  {
    id: 'step', title: 'Step to 1 m: true-state vs estimated-state feedback', x: 'time (s)', y: 'position (m)',
    draw(g, w, h, v) {
      const a = sim(v, { useEstimate: false, xh0: [0, 0], r: 1, T: 3 });
      const b = sim(v, { useEstimate: true, r: 1, T: 3 });
      drawStepResponse(g, w, h, {
        t: a.t, y: a.x.map((z) => z[0]), tEnd: 3, ref: 1, yRange: [-0.05, 1.35],
        ghost: { t: b.t, y: b.x.map((z) => z[0]), label: 'u = −K x̂ (observer in the loop)' },
        show: { overshoot: true, settling: true, band: true },
      });
    },
  },
  {
    id: 'err', title: 'How far the two steps differ (|x_true-fb − x_obs-fb|)', x: 'time (s)', y: 'metres',
    draw(g, w, h, v) {
      const a = sim(v, { useEstimate: false, xh0: [0, 0], r: 1, T: 3 });
      const b = sim(v, { useEstimate: true, r: 1, T: 3 });
      const d = a.t.map((_, i) => Math.abs(a.x[i][0] - b.x[i][0]));
      const peak = Math.max(...d), tp = a.t[d.indexOf(peak)];
      wipe(g, w, h);
      const yr: V2 = [0, Math.max(0.08, peak * 1.3)], f = rangeFrame(w, h, [0, 3], yr, 46, 14, 10, 32);
      graphAxes(g, f, [0, 3], yr, 'time (s)', '|Δx| (m)');
      curve(g, f, a.t, d, col.b(), 2.2);
      tline(g, f, [tp, 0], [tp, peak], col.c(), 1, [3, 3]);
      text(g, `peak ${f2(peak, 3)} m at t = ${f2(tp, 2)} s   (e₀ = ${f2(num(v, 'e0', 0.2), 2)} m)`, f.box.l + 6, f.box.t + 14, col.text(), 'left', 10.5);
    },
  },
] as FigurePanel[]);

/* ── reference input: regulator vs tracker ── */
export const refinFigure = figureOf(() => [
  {
    id: 'step', title: 'A 1 m command: with and without N̄', x: 'time (s)', y: 'position (m)',
    draw(g, w, h, v) {
      const on = sim({ ...v, Nbar: num(v, 'Nbar', 25) }, { useEstimate: false, xh0: [0, 0], r: 1, T: 3 });
      const off = sim({ ...v, Nbar: 0 }, { useEstimate: false, xh0: [0, 0], r: 1, T: 3 });
      drawStepResponse(g, w, h, {
        t: on.t, y: on.x.map((z) => z[0]), tEnd: 3, ref: 1, yRange: [-0.05, 1.35],
        ghost: { t: off.t, y: off.x.map((z) => z[0]), label: 'regulator only (N̄ = 0) → 0' },
        show: { overshoot: true, settling: true, ess: true, band: true },
      });
    },
  },
  {
    id: 'u', title: 'The force u = −Kx + N̄ r', x: 'time (s)', y: 'u (N)',
    draw(g, w, h, v) {
      const s = sim(v, { useEstimate: false, xh0: [0, 0], r: 1, T: 3 });
      wipe(g, w, h);
      const hi = Math.max(4, Math.max(...s.u.map(Math.abs)) * 1.15), yr: V2 = [-hi * 0.2, hi];
      const f = rangeFrame(w, h, [0, 3], yr, 46, 14, 10, 32);
      graphAxes(g, f, [0, 3], yr, 'time (s)', 'u (N)');
      tline(g, f, [0, 0], [3, 0], col.muted(), 1, [3, 3]);
      curve(g, f, s.t, s.u, col.b(), 2.2);
      text(g, `N̄ = ${f2(num(v, 'Nbar', 25), 1)}   (N̄ = 25 → DC gain 1)`, f.box.l + 6, f.box.t + 14, col.text(), 'left', 11);
    },
  },
] as FigurePanel[]);

/**
 * Control-systems figures for the dives, all on the running cart (1 kg, k = 2, c = 3: G = 1/(s² + 3s + 2), poles −1 and −2) or a small
 * variation of it. Pictures come from core ctrlviz; the maths from @study/core/dsp.
 */
import { figureOf, drawStepResponse, drawSPlane, drawBode, drawHeightMap, drawJwSlice, splaneDrag, splaneFrame, wnZeta, poleFromWnZeta, rangeFrame, graphAxes, curve, tline, dot, text, wipe, col, type FigurePanel, type V2 } from '@study/core';
import { C, tf, tfFeedback, tfSeries, tfPoles, polyMul, step, impulse, simulatePid, pidClosedLoopPoles, isStable, rlocus, type TF, type Cx } from '@study/core/dsp';

type V = Record<string, number | string | boolean>;
const num = (v: V, k: string) => v[k] as number;
const f2 = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('-', '−') : '—');
export const CART = tf([1], [1, 3, 2]);
const tEndFor = (G: TF, lo = 4, hi = 40) => { const p = tfPoles(G).filter((z) => z.re < -1e-6); const slow = p.length ? Math.min(...p.map((z) => -z.re)) : 0.2; return Math.max(lo, Math.min(hi, 5.5 / slow)); };
const planeRange = (poles: Cx[], min = 3) => Math.max(min, Math.ceil(Math.max(...poles.map((p) => Math.hypot(p.re, p.im))) * 1.3));

/* ── 1 · the cart itself: mass, spring, damper → poles → motion ── */
export const cartFigure = figureOf(() => {
  const G = (v: V) => tf([1], [num(v, 'm'), num(v, 'c'), num(v, 'k')]);
  return [
    {
      id: 'plane', title: 'Poles of the cart', x: 'σ (1/s)', y: 'jω (rad/s)',
      draw(g, w, h, v) {
        const P = tfPoles(G(v)), range = planeRange(P), f = drawSPlane(g, w, h, { range, poles: P, labels: true, marks: tfPoles(CART).map((s) => ({ s, shape: 'ring' as const, color: col.muted() })) });
        const wn = Math.sqrt(num(v, 'k') / num(v, 'm')), z = num(v, 'c') / (2 * Math.sqrt(num(v, 'k') * num(v, 'm')));
        text(g, `ωn = ${f2(wn)} rad/s   ζ = ${f2(z)}`, f.box.l + 6, f.box.b - 22, col.text(), 'left', 11);
        text(g, 'grey rings: the running cart', f.box.l + 6, f.box.b - 8, col.muted(), 'left', 10);
      },
    },
    {
      id: 'step', title: 'Position after a 1 N push', x: 'time (s)', y: 'position (m)',
      draw: (g, w, h, v) => { const T = G(v), tEnd = tEndFor(T); drawStepResponse(g, w, h, { ...step(T, tEnd, 600), ref: 1 / num(v, 'k'), final: 1 / num(v, 'k'), ghost: { ...step(CART, tEnd, 600), label: 'running cart' }, show: { overshoot: true, settling: true, band: true }, yLabel: 'position (m)' }); },
    },
  ] as FigurePanel[];
});

/* ── 2 · |G(s)| as a landscape (gallery recipe) ── */
export const heightFigure = figureOf(() => {
  const G = (v: V) => (v.zero ? tf(polyMul([1 / num(v, 'zr') * -1, 1], [1]), [1, num(v, 'c'), 2]) : tf([1], [1, num(v, 'c'), 2]));
  return [
    { id: 'map', title: '|G(s)| over the s-plane', x: 'σ (1/s)', y: 'jω (rad/s)', draw: (g, w, h, v) => { drawHeightMap(g, w, h, { G: G(v), range: 3.5, reCenter: -0.8, omega: num(v, 'omega') }); } },
    { id: 'slice', title: '|G(jω)| along the jω axis', x: 'ω (rad/s)', y: '|G(jω)|', draw: (g, w, h, v) => { drawJwSlice(g, w, h, { G: G(v), wmax: 5, omega: num(v, 'omega'), db: !!v.db, ghost: CART }); } },
  ] as FigurePanel[];
});

/* ── 3 · first order K/(Ts+1) ── */
export const firstFigure = figureOf(() => [
  {
    id: 'plane', title: 'The one pole, at −1/T', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v) { const T = num(v, 'T'); const f = drawSPlane(g, w, h, { range: 5, reCenter: -1.5, poles: [C(-1 / T, 0)], labels: true }); text(g, `pole ${f2(-1 / T)}  →  T = ${f2(T)} s`, f.box.l + 6, f.box.t + 24, col.text(), 'left', 11); },
  },
  {
    id: 'step', title: 'Step response of K/(Ts + 1)', x: 'time (s)', y: 'output',
    draw(g, w, h, v) {
      wipe(g, w, h); const K = num(v, 'K'), T = num(v, 'T'), tEnd = 6, yr: V2 = [0, 3.2], f = rangeFrame(w, h, [0, tEnd], yr, 46, 14, 10, 32);
      graphAxes(g, f, [0, tEnd], yr, 'time (s)', 'output');
      const y = (t: number) => K * (1 - Math.exp(-t / T)), ts = Array.from({ length: 300 }, (_, i) => (tEnd * i) / 299);
      tline(g, f, [0, K], [tEnd, K], col.muted(), 1, [5, 4]); text(g, `final value K = ${f2(K)}`, f.box.r - 4, f.Y(K) - 8, col.muted(), 'right', 10);
      if (v.tan) { tline(g, f, [0, 0], [T, K], col.d(), 1.4, [4, 3]); text(g, 'initial tangent', f.box.l + 8, f.box.t + 12, col.d(), 'left', 10); }
      if (v.imp) curve(g, f, ts, ts.map((t) => (K / T) * Math.exp(-t / T)), col.c(), 1.8, [6, 4]);
      curve(g, f, ts, ts.map(y), col.a(), 2.4);
      tline(g, f, [T, 0], [T, y(T)], col.e(), 1.2, [3, 3]); dot(g, f, [T, y(T)], col.e(), 4.5); text(g, `63 % at t = T`, f.X(T) + 8, f.Y(y(T)) + 16, col.e(), 'left', 10.5);
      tline(g, f, [4 * T, 0], [4 * T, y(4 * T)], col.ok(), 1.2, [3, 3]); text(g, `98 % at 4T = ${f2(4 * T)} s`, f.X(4 * T) - 6, f.box.b - 10, col.ok(), 'right', 10.5);
    },
  },
] as FigurePanel[]);

/* ── 4 · dominant poles: a third pole in the way ── */
export const dominantFigure = figureOf(() => {
  const pair = (v: V) => tf([num(v, 'wn') ** 2], [1, 2 * num(v, 'zeta') * num(v, 'wn'), num(v, 'wn') ** 2]);
  const full = (v: V) => tfSeries(pair(v), tf([num(v, 'p')], [1, num(v, 'p')]));
  return [
    { id: 'plane', title: 'Three poles: which one matters?', x: 'σ (1/s)', y: 'jω (rad/s)', draw: (g, w, h, v) => { drawSPlane(g, w, h, { range: Math.max(4, Math.ceil(num(v, 'p') * 1.15)), reCenter: -0.5 * Math.max(4, num(v, 'p')), poles: tfPoles(full(v)), labels: false, wnCircles: [num(v, 'wn')] }); } },
    { id: 'step', title: 'Full response against the dominant pair alone', x: 'time (s)', y: 'output', draw: (g, w, h, v) => { const tEnd = Math.max(4, Math.min(30, 9 / (num(v, 'zeta') * num(v, 'wn')))); drawStepResponse(g, w, h, { ...step(full(v), tEnd, 600), ghost: { ...step(pair(v), tEnd, 600), label: 'dominant pair only' }, show: { overshoot: true, settling: true, band: true } }); } },
  ] as FigurePanel[];
});

/* ── 5 · P / PI / PID on the cart (core PID simulator, cart plant) ── */
const pidRun = (v: V) => simulatePid({ plant: CART, Kp: num(v, 'Kp'), Ki: num(v, 'Ki') || 0, Kd: num(v, 'Kd') || 0, N: 20, T: 14, dt: 0.01, dist: v.push ? { t: 8, amp: -1 } : null });
export const pidcartFigure = figureOf(() => [
  { id: 'step', title: 'Cart position under u = Kp·e + Ki·∫e + Kd·de/dt', x: 'time (s)', y: 'position (m, command r = 1)', draw: (g, w, h, v) => { const s = pidRun(v); drawStepResponse(g, w, h, { t: s.t, y: s.y, tEnd: 14, yRange: [-0.05, 1.5], show: { overshoot: !v.push, band: !v.push, ess: !v.push } }); } },
  { id: 'u', title: 'Force the controller applies', x: 'time (s)', y: 'u (N)', draw: (g, w, h, v) => { wipe(g, w, h); const s = pidRun(v), hi = Math.max(1.5, Math.min(40, Math.max(...s.u) * 1.1)), yr: V2 = [Math.min(-0.5, Math.min(...s.u) * 1.1), hi], f = rangeFrame(w, h, [0, 14], yr, 46, 14, 10, 32); graphAxes(g, f, [0, 14], yr, 'time (s)', 'u (N)'); if (v.push) { tline(g, f, [8, yr[0]], [8, yr[1]], col.c(), 1, [3, 3]); text(g, 'push d = −1 N', f.X(8) + 4, f.box.t + 10, col.c(), 'left', 10); } curve(g, f, s.t, s.u, col.b(), 2); } },
  { id: 'plane', title: 'Closed-loop poles', x: 'σ (1/s)', y: 'jω (rad/s)', draw: (g, w, h, v) => { const P = pidClosedLoopPoles(CART, { Kp: num(v, 'Kp'), Ki: num(v, 'Ki'), Kd: num(v, 'Kd'), N: 20 }), near = P.filter((p) => Math.hypot(p.re, p.im) < 12); drawSPlane(g, w, h, { range: planeRange(near.length ? near : P, 3), poles: P, labels: P.length <= 3 }); } },
] as FigurePanel[]);

/* ── 6 · steady-state error: P against PI (error picture) ── */
export const sseFigure = figureOf(() => [
  { id: 'step', title: 'Output: where does it end up?', x: 'time (s)', y: 'position (command r = 1)', draw: (g, w, h, v) => { const s = pidRun({ ...v, Kd: 0, push: false }); drawStepResponse(g, w, h, { t: s.t, y: s.y, tEnd: 14, yRange: [-0.05, 1.4], show: { ess: true, band: false } }); } },
  {
    id: 'err', title: 'Error e = r − y', x: 'time (s)', y: 'error',
    draw(g, w, h, v) {
      wipe(g, w, h); const Kp = num(v, 'Kp'), s = pidRun({ ...v, Kd: 0, push: false }), yr: V2 = [-0.3, 1.05], f = rangeFrame(w, h, [0, 14], yr, 46, 14, 10, 32);
      graphAxes(g, f, [0, 14], yr, 'time (s)', 'e'); tline(g, f, [0, 0], [14, 0], col.strong(), 1);
      if (!num(v, 'Ki')) { const ess = 1 / (1 + Kp * 0.5); tline(g, f, [0, ess], [14, ess], col.bad(), 1.2, [5, 4]); text(g, `e_ss = 1/(1 + Kp·G(0)) = ${f2(ess, 3)}`, f.box.r - 4, f.Y(ess) - 9, col.bad(), 'right', 10.5); } else text(g, 'the integrator keeps pushing until e = 0', f.box.r - 4, f.box.t + 12, col.ok(), 'right', 10.5);
      curve(g, f, s.t, s.e, col.b(), 2.4);
    },
  },
] as FigurePanel[]);

/* ── 7 · block diagram: reference and disturbance paths through one loop ── */
export const loopFigure = figureOf(() => {
  const L = (v: V) => tfSeries(tf([num(v, 'K')], [1]), CART);
  const Tr = (v: V) => tfFeedback(L(v)), Td = (v: V) => tfFeedback(CART, tf([num(v, 'K')], [1]));
  const panel = (id: string, title: string, G: (v: V) => TF, ylab: string, yr: V2, ref: number | null) => ({
    id, title, x: 'time (s)', y: ylab,
    draw: (g: CanvasRenderingContext2D, w: number, h: number, v: V) => { drawStepResponse(g, w, h, { ...step(G(v), 8, 500), ref: ref ?? 1, yRange: yr, ghost: { ...step(G({ ...v, K: 1 }), 8, 500), label: 'K = 1' }, show: ref === null ? {} : { overshoot: true, ess: true } }); },
  });
  return [panel('r', 'Y/R = CG/(1 + CG): the command path', Tr, 'position', [-0.05, 1.5], 1), panel('d', 'Y/D = G/(1 + CG): a unit push on the cart', Td, 'position (m)', [-0.02, 0.6], null)] as FigurePanel[];
});

/* ── 8 · state space: the same cart as two states ── */
export const statesFigure = figureOf(() => {
  const sim = (v: V) => {
    const k = num(v, 'k'), c = num(v, 'c'), dt = 0.01, n = 800, t: number[] = [], x1: number[] = [], x2: number[] = []; let a = 0, b = 0;
    const f = (p: number, q: number) => [q, -k * p - c * q + 1];
    for (let i = 0; i <= n; i++) {
      t.push(i * dt); x1.push(a); x2.push(b);
      const k1 = f(a, b), k2 = f(a + (dt / 2) * k1[0], b + (dt / 2) * k1[1]), k3 = f(a + (dt / 2) * k2[0], b + (dt / 2) * k2[1]), k4 = f(a + dt * k3[0], b + dt * k3[1]);
      a += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); b += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    }
    return { t, x1, x2 };
  };
  return [
    {
      id: 'x', title: 'The two states after a 1 N push', x: 'time (s)', y: 'x₁ position, x₂ velocity',
      draw(g, w, h, v) {
        wipe(g, w, h); const s = sim(v), all = [...s.x1, ...s.x2], yr: V2 = [Math.min(-0.1, Math.min(...all) * 1.1), Math.max(0.25, Math.max(...all) * 1.15)], f = rangeFrame(w, h, [0, 8], yr, 46, 14, 10, 32);
        graphAxes(g, f, [0, 8], yr, 'time (s)', 'x₁, x₂'); tline(g, f, [0, 0], [8, 0], col.strong(), 1);
        curve(g, f, s.t, s.x2, col.b(), 2.2); curve(g, f, s.t, s.x1, col.a(), 2.6);
        text(g, 'x₁ position', f.box.r - 6, f.box.t + 12, col.a(), 'right', 11); text(g, 'x₂ = velocity', f.box.r - 6, f.box.t + 27, col.b(), 'right', 11);
        text(g, `A = [[0, 1], [−${f2(num(v, 'k'), 1)}, −${f2(num(v, 'c'), 1)}]]`, f.box.l + 8, f.box.b - 10, col.text(), 'left', 11);
      },
    },
    { id: 'plane', title: 'Eigenvalues of A = the poles', x: 'σ (1/s)', y: 'jω (rad/s)', draw: (g, w, h, v) => { const P = tfPoles(tf([1], [1, num(v, 'c'), num(v, 'k')])); drawSPlane(g, w, h, { range: planeRange(P), poles: P, labels: true }); } },
  ] as FigurePanel[];
});

/* ── 9 · an RLC circuit has the same second-order shape ── */
export const rlcFigure = figureOf(() => {
  const G = (v: V) => tf([1], [num(v, 'L') * num(v, 'Cap'), num(v, 'R') * num(v, 'Cap'), 1]);
  return [
    { id: 'plane', title: 'Poles of the circuit', x: 'σ (1/s)', y: 'jω (rad/s)', draw(g, w, h, v) { const P = tfPoles(G(v)), f = drawSPlane(g, w, h, { range: planeRange(P, 1.5), poles: P, labels: true }); const wn = 1 / Math.sqrt(num(v, 'L') * num(v, 'Cap')), z = (num(v, 'R') / 2) * Math.sqrt(num(v, 'Cap') / num(v, 'L')); text(g, `ωn = 1/√(LC) = ${f2(wn)}   ζ = (R/2)√(C/L) = ${f2(z)}`, f.box.l + 6, f.box.t + 24, col.text(), 'left', 10.5); } },
    { id: 'step', title: 'Capacitor voltage after a 1 V step', x: 'time (s)', y: 'v_C (V)', draw: (g, w, h, v) => { const T = G(v), tEnd = tEndFor(T, 3, 60); drawStepResponse(g, w, h, { ...step(T, tEnd, 600), show: { overshoot: true, settling: true, band: true }, yLabel: 'v_C (V)' }); } },
  ] as FigurePanel[];
});

/* ── 10 · s-plane explorer with a pole pair and a zero ── */
export const pzFigure = figureOf((c) => {
  const zero = (v: V) => { const z = num(v, 'z'); return Math.abs(z) < 0.15 ? 0.15 * (z < 0 ? -1 : 1) : z; };
  const G = (v: V, withZero = true) => { const wn = num(v, 'wn'), zt = num(v, 'zeta'), den = [1, 2 * zt * wn, wn * wn]; return v.zero && withZero ? tf(polyMul([-1 / zero(v), 1], [wn * wn]), den) : tf([wn * wn], den); };
  const pole = (v: V) => poleFromWnZeta(num(v, 'wn'), num(v, 'zeta'));
  return [
    {
      id: 'plane', title: 'Poles × and zero ○ (drag them)', x: 'σ (1/s)', y: 'jω (rad/s)',
      draw: (g, w, h, v) => { const p = pole(v); drawSPlane(g, w, h, { range: 5, reCenter: -0.5, poles: [p, C(p.re, -p.im)], zeros: v.zero ? [C(zero(v), 0)] : [], handles: [p, ...(v.zero ? [C(zero(v), 0)] : [])], labels: true }); },
      pointer: splaneDrag({ range: 5, reCenter: -0.5, handles: () => [{ id: 'p', s: pole(c.values) }, ...(c.values.zero ? [{ id: 'z', s: C(zero(c.values), 0) }] : [])], upperOnly: true, realOnly: ['z'], onDrag: (id, s) => { if (id === 'z') c.set('z', Math.round(s.re * 10) / 10); else { const q = wnZeta(s); c.set('wn', Math.min(5, Math.max(0.5, q.wn))); c.set('zeta', Math.min(1.5, Math.max(0.05, q.zeta))); } } }),
    },
    { id: 'step', title: 'Step response (dashed: without the zero)', x: 'time (s)', y: 'output', draw: (g, w, h, v) => { const tEnd = Math.max(4, Math.min(25, 9 / (num(v, 'zeta') * num(v, 'wn')))); drawStepResponse(g, w, h, { ...step(G(v), tEnd, 600), ghost: { ...step(G(v, false), tEnd, 600), label: 'no zero' }, yRange: [-1.2, 2.2], show: { overshoot: true, band: true } }); } },
  ] as FigurePanel[];
});

/* ── 11 · moving everything left by a: multiplying by e^{−at} ── */
export const shiftFigure = figureOf(() => {
  const ts = Array.from({ length: 500 }, (_, i) => (10 * i) / 499);
  const h = (v: V) => { const wn = num(v, 'wn'), z = num(v, 'zeta'), wd = wn * Math.sqrt(Math.max(1e-6, 1 - z * z)); return (t: number) => Math.exp(-z * wn * t) * Math.sin(wd * t) / wd; };
  return [
    {
      id: 'plane', title: 'Every pole moves left by a', x: 'σ (1/s)', y: 'jω (rad/s)',
      draw(g, w, hh, v) { const p = poleFromWnZeta(num(v, 'wn'), num(v, 'zeta')), a = num(v, 'a'), q = C(p.re - a, p.im); drawSPlane(g, w, hh, { range: 5, reCenter: -1.2, poles: [q, C(q.re, -q.im)], marks: [{ s: p, shape: 'ring', color: col.muted() }, { s: C(p.re, -p.im), shape: 'ring', color: col.muted() }], labels: false }); },
    },
    {
      id: 'time', title: 'h(t) and e^(−at)·h(t)', x: 'time (s)', y: 'response',
      draw(g, w, hh, v) { wipe(g, w, hh); const fn = h(v), a = num(v, 'a'), yr: V2 = [-0.7, 0.9], f = rangeFrame(w, hh, [0, 10], yr, 46, 14, 10, 32); graphAxes(g, f, [0, 10], yr, 'time (s)', 'h(t)'); tline(g, f, [0, 0], [10, 0], col.strong(), 1); curve(g, f, ts, ts.map(fn), col.muted(), 1.8, [6, 4]); curve(g, f, ts, ts.map((t) => Math.exp(-a * t) * fn(t)), col.a(), 2.4); text(g, `multiplying by e^(−${f2(a, 1)}t) moves each pole by −${f2(a, 1)}`, f.box.r - 4, f.box.b - 10, col.text(), 'right', 10.5); },
    },
  ] as FigurePanel[];
});

/* ── 12 · partial fractions: the response is a sum of modes ── */
export const partialFigure = figureOf(() => {
  const ps = (v: V): [number, number] => { const a = num(v, 'p1'), b = num(v, 'p2'); return [a, Math.abs(a - b) < 0.05 ? b - 0.05 : b]; };
  const ts = Array.from({ length: 500 }, (_, i) => (8 * i) / 499);
  return [
    { id: 'plane', title: 'Two real poles', x: 'σ (1/s)', y: 'jω (rad/s)', draw: (g, w, h, v) => { const [a, b] = ps(v); drawSPlane(g, w, h, { range: 5, reCenter: -2, poles: [C(a, 0), C(b, 0)], labels: true }); } },
    {
      id: 'modes', title: 'h(t) = A₁e^(p₁t) + A₂e^(p₂t)', x: 'time (s)', y: 'response',
      draw(g, w, h, v) {
        wipe(g, w, h); const [a, b] = ps(v), r1 = 1 / (a - b), r2 = 1 / (b - a), m1 = (t: number) => r1 * Math.exp(a * t), m2 = (t: number) => r2 * Math.exp(b * t), top = Math.max(...ts.map((t) => Math.abs(m1(t) + m2(t))), ...ts.map((t) => Math.abs(m1(t))), 0.2), yr: V2 = [-top * 1.1, top * 1.1], f = rangeFrame(w, h, [0, 8], yr, 46, 14, 10, 32);
        graphAxes(g, f, [0, 8], yr, 'time (s)', 'h(t)'); tline(g, f, [0, 0], [8, 0], col.strong(), 1);
        curve(g, f, ts, ts.map(m1), col.b(), 1.8, [6, 4]); curve(g, f, ts, ts.map(m2), col.c(), 1.8, [6, 4]); curve(g, f, ts, ts.map((t) => m1(t) + m2(t)), col.a(), 2.6);
        text(g, `residues ${f2(r1)} and ${f2(r2)}`, f.box.r - 4, f.box.b - 10, col.text(), 'right', 10.5);
        text(g, `${f2(r1)}·e^(${f2(a)}t)`, f.box.r - 4, f.box.t + 11, col.b(), 'right', 10.5); text(g, `${f2(r2)}·e^(${f2(b)}t)`, f.box.r - 4, f.box.t + 25, col.c(), 'right', 10.5);
      },
    },
  ] as FigurePanel[];
});

/* ── 13 · final- and initial-value theorems ── */
export const fvtFigure = figureOf(() => {
  const G = (v: V) => tf([num(v, 'a'), num(v, 'b')], polyMul([1, 1], [1, -num(v, 'q')]));
  return [
    {
      id: 'step', title: 'y(t) for a unit step: what the theorems predict', x: 'time (s)', y: 'output',
      draw(g, w, h, v) {
        wipe(g, w, h); const q = num(v, 'q'), T = G(v), tEnd = 8, r = step(T, tEnd, 600), stable = isStable(T), fv = polyDc(v), yr: V2 = [-1.5, 2.5], f = rangeFrame(w, h, [0, tEnd], yr, 46, 14, 10, 32);
        graphAxes(g, f, [0, tEnd], yr, 'time (s)', 'output'); tline(g, f, [0, 0], [tEnd, 0], col.strong(), 1);
        tline(g, f, [0, fv], [tEnd, fv], stable ? col.ok() : col.bad(), 1.2, [5, 4]); text(g, `lim s→0 s·G(s)/s = G(0) = ${f2(fv)}${stable ? '' : '  (does NOT apply: unstable)'}`, f.box.r - 4, f.Y(fv) + 12, stable ? col.ok() : col.bad(), 'right', 10.5);
        const a = num(v, 'a'); tline(g, f, [0, 0], [1.2, a * 1.2], col.d(), 1.4, [4, 3]); text(g, `initial slope = lim s·G(s) = ${f2(a)}`, f.box.l + 8, f.box.t + 12, col.d(), 'left', 10.5);
        curve(g, f, r.t, r.y, col.a(), 2.4); void q;
      },
    },
    { id: 'plane', title: 'Poles of G(s)', x: 'σ (1/s)', y: 'jω (rad/s)', draw: (g, w, h, v) => { drawSPlane(g, w, h, { range: 4, reCenter: -0.8, poles: tfPoles(G(v)), labels: true }); } },
  ] as FigurePanel[];
});
const polyDc = (v: V) => num(v, 'b') / (1 * -num(v, 'q'));

/* ── 14 · Bode of the cart with integral action (gallery recipe) ── */
const L3 = tf([1], polyMul([1, 0], polyMul([1, 1], [1, 2])));
export const bodeFigure = figureOf(() => {
  const cl = (K: number) => tfFeedback(tf([K], L3.den));
  return [
    { id: 'bode', title: 'Bode with margins of K/(s(s+1)(s+2))', x: 'ω (rad/s)', y: 'dB, °', height: 300, draw: (g, w, h, v) => { drawBode(g, w, h, { L: tf([num(v, 'K')], L3.den), ghost: tf([1], L3.den), wmin: 0.05, wmax: 20 }); } },
    { id: 'step', title: 'Closed-loop step at this K', x: 'time (s)', y: 'position', height: 300, draw: (g, w, h, v) => { const T = cl(num(v, 'K')), ok = isStable(T); drawStepResponse(g, w, h, { ...step(T, 30, 900), yRange: [-0.3, 2.2], ghost: { ...step(cl(1), 30, 900), label: 'K = 1' }, show: { overshoot: ok, settling: ok, band: ok } }); } },
  ] as FigurePanel[];
});
void rlocus; void impulse; void splaneFrame;

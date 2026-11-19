/**
 * Kept tools from the old control-systems page (batch 3 §E): the retired cart (1 kg, k = 2, c = 3: G = 1/(s² + 3s + 2)) and the
 * generic s-plane sandboxes. Not the default example anywhere; reachable from the Figures list and the dives that cite them.
 */
import { figureOf, drawStepResponse, drawSPlane, drawBode, drawHeightMap, drawJwSlice, splaneDrag, splaneFrame, wnZeta, poleFromWnZeta, rangeFrame, graphAxes, curve, tline, dot, text, wipe, col, type FigurePanel, type V2 } from '@study/core';
import { C, tf, tfFeedback, tfSeries, tfPoles, polyMul, step, impulse, simulatePid, pidClosedLoopPoles, isStable, rlocus, bode, logspace, type TF, type Cx } from '@study/core/dsp';

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

/* ── 13 · final- and initial-value theorems ── */
export const fvtFigure = figureOf(() => {
  const G = (v: V) => tf([num(v, 'a'), num(v, 'b')], polyMul([1, 1], [1, -num(v, 'q')]));
  return [
    {
      id: 'step', title: 'y(t) for a unit step: what the theorems predict', x: 'time (s)', y: 'output',
      draw(g, w, h, v) {
        wipe(g, w, h); const q = num(v, 'q'), T = G(v), tEnd = 8, r = step(T, tEnd, 600), stable = isStable(T), fv = polyDc(v), yr: V2 = stable ? fitRange([r.y, [fv]], -1.5, 2.5) : [-1.5, 2.5], f = rangeFrame(w, h, [0, tEnd], yr, 46, 14, 10, 32);
        graphAxes(g, f, [0, tEnd], yr, 'time (s)', 'output'); tline(g, f, [0, 0], [tEnd, 0], col.strong(), 1);
        tline(g, f, [0, fv], [tEnd, fv], stable ? col.ok() : col.bad(), 1.2, [5, 4]); text(g, `lim s→0 s·G(s)/s = G(0) = ${f2(fv)}${stable ? '' : '  (does NOT apply: unstable)'}`, f.box.r - 4, f.Y(fv) + 12, stable ? col.ok() : col.bad(), 'right', 10.5);
        const a = num(v, 'a'); tline(g, f, [0, 0], [1.2, a * 1.2], col.d(), 1.4, [4, 3]); text(g, `initial slope = lim s·G(s) = ${f2(a)}`, f.box.l + 8, f.box.t + 12, col.d(), 'left', 10.5);
        curve(g, f, r.t, r.y, col.a(), 2.4); void q;
      },
    },
    { id: 'plane', title: 'Poles of G(s)', x: 'σ (1/s)', y: 'jω (rad/s)', draw: (g, w, h, v) => { drawSPlane(g, w, h, { range: 4, reCenter: -0.8, poles: tfPoles(G(v)), labels: true }); } },
  ] as FigurePanel[];
});
/** a stable response's range, never narrower than [lo, hi], padded (more on top, for the slope label); an unstable one keeps the fixed axis and runs off it on purpose */
const fitRange = (ys: ArrayLike<number>[], lo: number, hi: number): V2 => { for (const a of ys) for (let i = 0; i < a.length; i++) if (Number.isFinite(a[i])) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); } const p = (hi - lo) * 0.08; return [lo - (lo < -1.5 ? p : 0), hi + (hi > 2.5 ? 2.5 * p : 0)]; };
const polyDc = (v: V) => num(v, 'b') / (1 * -num(v, 'q'));

/* ── 14 · Bode of the cart with integral action (gallery recipe) ── */
const L3 = tf([1], polyMul([1, 0], polyMul([1, 1], [1, 2])));
/** the magnitude axis drawBode would pick, widened to hold the ghost too (so the K = 1 curve is not cut off at high ω) */
const bodeMagRange = (Ls: TF[], wmin: number, wmax: number): V2 => {
  const ws = logspace(wmin, wmax, 500), db = Ls.flatMap((L) => bode(L, ws).magDb).filter(Number.isFinite);
  return [Math.floor(Math.min(-30, ...db) / 20) * 20, Math.ceil(Math.max(20, ...db) / 20) * 20];
};
export const bodeFigure = figureOf(() => {
  const cl = (K: number) => tfFeedback(tf([K], L3.den));
  return [
    { id: 'bode', title: 'Bode with margins of K/(s(s+1)(s+2))', x: 'ω (rad/s)', y: 'dB, °', height: 300, draw: (g, w, h, v) => { const L = tf([num(v, 'K')], L3.den), ghost = tf([1], L3.den); drawBode(g, w, h, { L, ghost, wmin: 0.05, wmax: 20, magRange: bodeMagRange([L, ghost], 0.05, 20) }); } },
    { id: 'step', title: 'Closed-loop step at this K', x: 'time (s)', y: 'position', height: 300, draw: (g, w, h, v) => { const T = cl(num(v, 'K')), ok = isStable(T); drawStepResponse(g, w, h, { ...step(T, 30, 900), yRange: [-0.3, 2.2], ghost: { ...step(cl(1), 30, 900), label: 'K = 1' }, show: { overshoot: ok, settling: ok, band: ok } }); } },
  ] as FigurePanel[];
});
void rlocus; void impulse; void splaneFrame;

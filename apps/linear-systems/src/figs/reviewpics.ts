/**
 * Pictures for the Review pages' "Picture it." paragraphs and a few dive worked examples
 * (```picture:<id> caption``` fences). Every value is computed here from the problem's own numbers
 * (and checked in test/reviewpics.test.ts); the speaker chain reads a₀, a₁ from spk().
 */
import { rangeFrame, graphAxes, curve, text, dot, col, linspace, cssVar, withLabelRole, type QuizFigureDef } from '@study/core';
import { spk, UM_PER_V } from './ex';

type P2 = [number, number];
const TAU = 2 * Math.PI;

/* ---------- small drawing helpers (canvas pixels unless a frame is given) ---------- */
/** an equal-scale plane in the rectangle (x0, y0, pw, ph) centred on (cx, cy), half-height R */
function plane(x0: number, y0: number, pw: number, ph: number, cx: number, cy: number, R: number) {
  const s = ph / (2 * R), mx = x0 + pw / 2, my = y0 + ph / 2;
  return { s, l: x0, t: y0, r: x0 + pw, b: y0 + ph, X: (x: number) => mx + (x - cx) * s, Y: (y: number) => my - (y - cy) * s, ix: (px: number) => cx + (px - mx) / s };
}
type Pl = ReturnType<typeof plane>;
const seg = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, c: string, w = 1, dash: number[] = []) => { g.save(); g.strokeStyle = c; g.lineWidth = w; g.setLineDash(dash); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore(); };
const arrow = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, c: string, w = 1.4) => {
  seg(g, x0, y0, x1, y1, c, w); const a = Math.atan2(y1 - y0, x1 - x0), hd = 6;
  g.save(); g.fillStyle = c; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - hd * Math.cos(a - 0.45), y1 - hd * Math.sin(a - 0.45)); g.lineTo(x1 - hd * Math.cos(a + 0.45), y1 - hd * Math.sin(a + 0.45)); g.closePath(); g.fill(); g.restore();
};
const cross = (g: CanvasRenderingContext2D, x: number, y: number, c: string, r = 5) => { seg(g, x - r, y - r, x + r, y + r, c, 2); seg(g, x - r, y + r, x + r, y - r, c, 2); };
const ring = (g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, w = 1.4, dash: number[] = []) => { g.save(); g.strokeStyle = c; g.lineWidth = w; g.setLineDash(dash); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.restore(); };
const zero = (g: CanvasRenderingContext2D, x: number, y: number, c: string) => ring(g, x, y, 4.5, c, 2);
function planeAxes(g: CanvasRenderingContext2D, p: Pl, re: string, im: string) {
  g.save(); g.beginPath(); g.rect(p.l, p.t, p.r - p.l, p.b - p.t); g.clip();
  seg(g, p.l, p.Y(0), p.r, p.Y(0), col.strong()); if (p.X(0) > p.l && p.X(0) < p.r) seg(g, p.X(0), p.t, p.X(0), p.b, col.strong());
  g.restore();
  text(g, re, p.r - 2, p.Y(0) - 9, col.muted(), 'right', 10); if (p.X(0) > p.l && p.X(0) < p.r) text(g, im, p.X(0) + 4, p.t + 6, col.muted(), 'left', 10);
}
/** tick marks and values along the real axis */
function reTicks(g: CanvasRenderingContext2D, p: Pl, vals: number[]) { for (const v of vals) { seg(g, p.X(v), p.Y(0) - 3, p.X(v), p.Y(0) + 3, col.strong()); if (v) text(g, String(v).replace('-', '−'), p.X(v), p.Y(0) + 15, col.muted(), 'center', 9); } }
/** shade where the predicate holds, column by column (σ ranges) or by radius (|z| ranges) */
function shadeRe(g: CanvasRenderingContext2D, p: Pl, lo: number, hi: number, fill: string) {
  const a = Math.max(p.l, p.X(lo)), b = Math.min(p.r, p.X(hi)); if (b > a) { g.save(); g.fillStyle = fill; g.fillRect(a, p.t, b - a, p.b - p.t); g.restore(); }
}
function shadeRadius(g: CanvasRenderingContext2D, p: Pl, r0: number, r1: number, fill: string) {
  g.save(); g.beginPath(); g.rect(p.l, p.t, p.r - p.l, p.b - p.t); g.clip(); g.fillStyle = fill; g.beginPath();
  g.arc(p.X(0), p.Y(0), Math.min(r1 * p.s, 4000), 0, TAU); if (r0 > 0) g.arc(p.X(0), p.Y(0), r0 * p.s, 0, TAU, true); g.fill('evenodd'); g.restore();
}
function stemsAt(g: CanvasRenderingContext2D, f: ReturnType<typeof rangeFrame>, ns: number[], vs: number[], color: (n: number) => string) {
  ns.forEach((n, i) => { const c = color(n); seg(g, f.X(n), f.Y(0), f.X(n), f.Y(vs[i]), c, 1.6); dot(g, f, [n, vs[i]], c, 3.2); });
}
/** graph axes for a panel anywhere on the canvas: the axis names are drawn beside this panel (graphAxes would put them at the canvas edges) */
function axesAt(g: CanvasRenderingContext2D, f: ReturnType<typeof rangeFrame>, xr: P2, yr: P2, xl: string, yl: string, xs: number, ys: number, xfmt?: (x: number) => string) {
  withLabelRole('axis', () => {
    text(g, xl, (f.box.l + f.box.r) / 2, f.box.b + 24, col.text(), 'center', 10);
    g.save(); g.translate(f.box.l - 30, (f.box.t + f.box.b) / 2); g.rotate(-Math.PI / 2); text(g, yl, 0, 0, col.text(), 'center', 10); g.restore();
  });
  graphAxes(g, f, xr, yr, '', '', xs, ys, xfmt);
}
const BLUE = 'rgba(110,168,255,.16)', ORANGE = 'rgba(255,150,80,.16)', GREEN = 'rgba(110,226,110,.14)';

/* ---------- layout: two panels side by side, stacked on a phone; every note sits in a header band above its panel ---------- */
type R4 = { x: number; y: number; w: number; h: number };
type Line = [string, string];
const STACK_BELOW = 1.5; // canvas width / height under which the two panels stack (the phone aspect is 0.95)
function two(w: number, h: number): [R4, R4] {
  return w / h < STACK_BELOW ? [{ x: 0, y: 0, w, h: h / 2 }, { x: 0, y: h / 2, w, h: h / 2 }] : [{ x: 0, y: 0, w: w * 0.48, h }, { x: w * 0.5, y: 0, w: w * 0.5, h }];
}
/** the panel's key, one coloured line each, above the plot; returns what is left for the plot */
function header(g: CanvasRenderingContext2D, r: R4, lines: Line[], n = lines.length): R4 {
  withLabelRole('axis', () => lines.forEach(([s, c], i) => text(g, s, r.x + 6, r.y + 8 + 12 * i, c, 'left', 9.5)));
  const hh = 12 * n + 6; return { x: r.x, y: r.y + hh, w: r.w, h: r.h - hh };
}
const planeIn = (r: R4, cx: number, cy: number, R: number) => plane(r.x + 4, r.y, r.w - 8, r.h - 6, cx, cy, R);
const frameIn = (w: number, h: number, r: R4, xr: P2, yr: P2, l = 40) => rangeFrame(w, h, xr, yr, r.x + l, w - (r.x + r.w) + 8, r.y + 4, h - (r.y + r.h) + 30);
/** both panels' headers get the same height, so the plots line up when side by side */
const heads = (lines: Line[][]) => Math.max(...lines.map((l) => l.length));
const PH = { aspect: 2.1, phoneAspect: 0.95, maxWidth: 520 };

/* ---------- A1: inverse Z with the ring ROC 2 < |z| < 3 ---------- */
export const a1 = { A: 4 / 35, B: -2 / 5, C: 2 / 7, x: (n: number) => (n >= 1 ? (4 / 35) * 0.5 ** (n - 1) - (2 / 5) * (-2) ** (n - 1) : -(2 / 7) * (-3) ** (n - 1)) };
const picA1: QuizFigureDef = { ...PH, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const [A, B] = two(w, h);
  const lk: Line[][] = [[['green ring: the ROC 2 < |z| < 3', col.ok()], ['blue ×: inside the ring → right-sided', col.a()], ['orange ×: outside → left-sided', col.b()], ['dashed: unit circle, not in the ROC', col.muted()]],
    [['n ≥ 1: the ½ and −2 terms run forward', col.a()], ['n ≤ 0: the −3 term runs backward, shrinking', col.b()]]], n = heads(lk);
  const p = planeIn(header(g, A, lk[0], n), 0, 0, 3.6);
  shadeRadius(g, p, 2, 3, GREEN); ring(g, p.X(0), p.Y(0), 2 * p.s, col.ok(), 1); ring(g, p.X(0), p.Y(0), 3 * p.s, col.ok(), 1);
  ring(g, p.X(0), p.Y(0), p.s, col.muted(), 1.2, [4, 3]); planeAxes(g, p, 'Re z', 'Im z'); reTicks(g, p, [-3, -2, 1, 2, 3]);
  cross(g, p.X(0.5), p.Y(0), col.a()); cross(g, p.X(-2), p.Y(0), col.a()); cross(g, p.X(-3), p.Y(0), col.b());
  const ns = Array.from({ length: 9 }, (_, i) => i - 4), xs = ns.map(a1.x), f = frameIn(w, h, header(g, B, lk[1], n), [-4.6, 4.6], [-2, 3.6]);
  axesAt(g, f, [-4.6, 4.6], [-2, 3.6], 'n', 'x(n)', 2, 1); stemsAt(g, f, ns, xs, (k) => (k >= 1 ? col.a() : col.b()));
} };

/* ---------- A2: a double pole at −3 and y = t e^(−3t) ---------- */
const picA2: QuizFigureDef = { ...PH, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const [A, B] = two(w, h);
  const lk: Line[][] = [[['green: ROC Re s > −3', col.ok()], ['red ×: the double pole at −3 (×2)', col.bad()], ['yellow dashed: the contour, closed left for t > 0', col.e()]],
    [[`y = t e^(−3t): grows, peaks at t = 1/3 (${(1 / (3 * Math.E)).toFixed(3)}), decays`, col.a()]]], n = heads(lk);
  const p = planeIn(header(g, A, lk[0], n), -2, 0, 3);
  shadeRe(g, p, -3, 99, GREEN); planeAxes(g, p, 'Re s', 'Im s'); reTicks(g, p, [-4, -3, -2, -1, 1]);
  seg(g, p.X(-1.5), p.t, p.X(-1.5), p.b, col.e(), 1.4, [5, 3]); cross(g, p.X(-3), p.Y(0), col.bad());
  const ts = linspace(0, 2, 201), f = frameIn(w, h, header(g, B, lk[1], n), [0, 2], [0, 0.15], 44);
  axesAt(g, f, [0, 2], [0, 0.15], 't', 'y(t)', 0.5, 0.05); curve(g, f, ts, ts.map((t) => t * Math.exp(-3 * t)), col.a(), 2.4);
  dot(g, f, [1 / 3, 1 / (3 * Math.E)], col.e(), 4);
} };

/* ---------- A3: forced plus natural modes, y(n) from the recursion ---------- */
export function a3y(N: number) { const y: number[] = []; for (let n = 0; n < N; n++) y.push(-0.75 * (y[n - 1] ?? 0) - 0.125 * (y[n - 2] ?? 0) + 0.5 ** n); return y; }
const picA3: QuizFigureDef = { ...PH, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const [A, B] = two(w, h);
  const lk: Line[][] = [[['green: ROC |z| > ½ · dashed: unit circle', col.ok()], ['orange ×: input mode (½)ⁿ', col.b()], ['blue ×: natural modes (−¼)ⁿ, (−½)ⁿ', col.a()]],
    [['y(n): alternates (negative poles)', col.e()], ['and decays (all poles inside |z| = 1)', col.e()]]], n = heads(lk);
  const p = planeIn(header(g, A, lk[0], n), 0, 0, 1.25);
  shadeRadius(g, p, 0.5, 99, GREEN); ring(g, p.X(0), p.Y(0), p.s, col.muted(), 1.2, [4, 3]); planeAxes(g, p, 'Re z', 'Im z'); reTicks(g, p, [-1, -0.5, 0.5, 1]);
  cross(g, p.X(0.5), p.Y(0), col.b()); cross(g, p.X(-0.25), p.Y(0), col.a()); cross(g, p.X(-0.5), p.Y(0), col.a());
  const ns = Array.from({ length: 9 }, (_, i) => i), ys = a3y(9), f = frameIn(w, h, header(g, B, lk[1], n), [-0.6, 8.6], [-0.4, 1.1]);
  axesAt(g, f, [-0.6, 8.6], [-0.4, 1.1], 'n', 'y(n)', 2, 0.5); stemsAt(g, f, ns, ys, () => col.e());
} };

/* ---------- A4: the optimal path through the saddle of the Hamiltonian system ---------- */
export const a4 = (() => {
  const om = Math.sqrt(36.5), ch = (t: number) => Math.cosh(om * t), sh = (t: number) => Math.sinh(om * t) / om;
  const phi = (t: number) => [[ch(t) + 6 * sh(t), -sh(t) / 4], [-2 * sh(t), ch(t) - 6 * sh(t)]];
  const l0 = (2 - phi(1)[0][0]) / phi(1)[0][1];
  const x = (t: number) => phi(t)[0][0] + phi(t)[0][1] * l0, lam = (t: number) => phi(t)[1][0] + phi(t)[1][1] * l0;
  return { om, l0, x, lam, u: (t: number) => -lam(t) / 4, kStable: 4 * (6 + om), kUnstable: 4 * (6 - om) };
})();
const picA4: QuizFigureDef = { ...PH, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const [A, B] = two(w, h), ts = linspace(0, 1, 201);
  const lk: Line[][] = [[['yellow: optimal x(t), parked near 0', col.e()], ['dashed: straight line x = 1 + t (cost 136 vs 24.2)', col.muted()]],
    [[`yellow: the same path in (x, λ), from (1, ${a4.l0.toFixed(1)}) to x(1) = 2`, col.e()], ['blue dashed: stable direction (in) · orange: unstable (out)', col.muted()]]], n = heads(lk);
  const f = frameIn(w, h, header(g, A, lk[0], n), [0, 1], [-0.2, 2.2], 40);
  axesAt(g, f, [0, 1], [-0.2, 2.2], 't', 'x(t)', 0.25, 0.5);
  curve(g, f, ts, ts.map((t) => 1 + t), col.muted(), 1.4, [5, 3]); curve(g, f, ts, ts.map(a4.x), col.e(), 2.6);
  const q = frameIn(w, h, header(g, B, lk[1], n), [-0.2, 2.3], [-8, 55], 44);
  axesAt(g, q, [-0.2, 2.3], [-8, 55], 'x', 'λ', 0.5, 10);
  const xx = linspace(-0.2, 2.3, 50); g.save(); g.beginPath(); g.rect(q.box.l, q.box.t, q.box.r - q.box.l, q.box.b - q.box.t); g.clip();
  curve(g, q, xx, xx.map((v) => a4.kStable * v), col.a(), 1.2, [4, 3]); curve(g, q, xx, xx.map((v) => a4.kUnstable * v), col.b(), 1.2, [4, 3]); g.restore();
  curve(g, q, ts.map(a4.x), ts.map(a4.lam), col.e(), 2.4); dot(g, q, [1, a4.l0], col.bad(), 4); dot(g, q, [2, a4.lam(1)], col.ok(), 4);
} };

/* ---------- B1: poles +1, −1, −2, zeros ±j, and the impulse response ---------- */
export const b1y = (t: number) => Math.exp(t) / 3 - Math.exp(-t) + (5 / 3) * Math.exp(-2 * t);
const picB1: QuizFigureDef = { ...PH, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const [A, B] = two(w, h);
  const lk: Line[][] = [[['× poles (modes) · ○ zeros ±j', col.text()], ['red ×: +1, the unstable mode', col.bad()]], [['yellow: y(t), from y(0⁺) = 1', col.e()], ['red dashed: eᵗ/3, where it heads', col.bad()]]], n = heads(lk);
  const p = planeIn(header(g, A, lk[0], n), -0.5, 0, 1.9);
  planeAxes(g, p, 'Re s', 'Im s'); reTicks(g, p, [-2, -1, 1]);
  cross(g, p.X(1), p.Y(0), col.bad()); cross(g, p.X(-1), p.Y(0), col.a()); cross(g, p.X(-2), p.Y(0), col.a());
  zero(g, p.X(0), p.Y(1), col.ok()); zero(g, p.X(0), p.Y(-1), col.ok());
  const ts = linspace(0, 3, 241), f = frameIn(w, h, header(g, B, lk[1], n), [0, 3], [0, 7.5]);
  axesAt(g, f, [0, 3], [0, 7.5], 't', 'y(t)', 1, 2);
  curve(g, f, ts, ts.map((t) => Math.exp(t) / 3), col.bad(), 1.3, [5, 3]); curve(g, f, ts, ts.map(b1y), col.e(), 2.4);
} };

/* ---------- B2: a sensor as a projection; it misses the mode it is perpendicular to ---------- */
export const b2 = { v: [[-2, 4, 1], [0, 1, 1], [0, 0, 1]], lam: [-1, -2, -3], read: (f: number, gg: number) => b2.v.map((v) => f * v[1] + gg * v[2]) };
const picB2: QuizFigureDef = { aspect: 2.1, phoneAspect: 1.6, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const r = b2.read(1, 0), cs = [col.a(), col.b(), col.c()];
  const body = header(g, { x: 0, y: 0, w, h }, [['green arrow: sensor y = f x₂ + g x₃ with f = 1, g = 0', col.ok()], ['red dashed: its blind line (perpendicular); the λ = −3 mode lies on it', col.bad()],
    [b2.v.map((_, i) => `λ = ${String(b2.lam[i]).replace('-', '−')} reads ${r[i]}`).join(' · '), col.text()]]);
  // fit x₂ ∈ [−0.4, 4.4] and x₃ ∈ [−0.25, 1.35] whatever the shape (stacked phone or wide)
  const pw = body.w - 20, ph = body.h - 4, sc = Math.min(pw / 4.8, ph / 1.6), p = plane(body.x + 10, body.y, pw, ph, 2, 0.55, ph / (2 * sc));
  planeAxes(g, p, 'x₂', 'x₃');
  seg(g, p.X(0), p.t, p.X(0), p.b, col.bad(), 2.4, [6, 4]); arrow(g, p.X(0), p.Y(0), p.X(1.2), p.Y(0), col.ok(), 2.6);
  b2.v.forEach((v, i) => { arrow(g, p.X(0), p.Y(0), p.X(v[1]), p.Y(v[2]), cs[i], 2); const right = p.X(v[1]) > (p.l + p.r) / 2;
    text(g, `λ = ${String(b2.lam[i]).replace('-', '−')}`, p.X(v[1]) + (right ? -4 : 6), p.Y(v[2]) - 9, cs[i], right ? 'right' : 'left', 9.5); });
} };

/* ---------- integrator chains (phase-variable realizations) ---------- */
/**
 * u → [in] → Σ → ∫ → x_n → ∫ → … → x₁, with each state fed back to Σ through fb[i] (i = 0 is x_n)
 * and, if taps are given, summed into y through taps[i]; otherwise y = x₁.
 */
function chain(g: CanvasRenderingContext2D, w: number, h: number, o: { n: number; names: string[]; fb: string[]; taps?: string[]; inGain?: string; yLabel: string }) {
  g.clearRect(0, 0, w, h); const c = col.text(), m = col.muted();
  const GW = 62, yM = h * (o.taps ? 0.42 : 0.3), xIn = 16, xG = o.inGain ? xIn + 12 + GW / 2 : xIn, xS = o.inGain ? Math.max(w * 0.25, xG + GW / 2 + 24) : w * 0.14;
  const xEnd = Math.min(w * (o.taps ? 0.8 : 0.86), w - 44 - o.yLabel.length * 7), step = (xEnd - xS) / o.n;
  const box = (x: number, y: number, s: string, bw = 26, color = c) => { g.save(); g.fillStyle = cssVar('--plot-bg') || cssVar('--panel'); g.fillRect(x - bw / 2, y - 11, bw, 22); g.strokeStyle = color; g.lineWidth = 1.4; g.strokeRect(x - bw / 2, y - 11, bw, 22); g.restore(); text(g, s, x, y + 1, color, 'center', 11); };
  text(g, 'u', xIn - 8, yM, c, 'center', 12);
  if (o.inGain) { arrow(g, xIn, yM, xG - GW / 2, yM, c); box(xG, yM, o.inGain, GW); arrow(g, xG + GW / 2, yM, xS - 10, yM, c); } else arrow(g, xIn, yM, xS - 10, yM, c);
  ring(g, xS, yM, 10, c, 1.4); text(g, 'Σ', xS, yM + 1, c, 'center', 11);
  const nodes: number[] = [];
  for (let i = 0; i < o.n; i++) {
    const xi = xS + step * (i + 0.45), xn = xS + step * (i + 1);
    arrow(g, i ? nodes[i - 1] : xS + 10, yM, xi - 14, yM, c); box(xi, yM, '∫'); seg(g, xi + 13, yM, xn, yM, c, 1.4); dot(g, rangeFrame(w, h, [0, w], [h, 0], 0, 0, 0, 0), [xn, yM], c, 2.6);
    text(g, o.names[i], xn - 4, o.taps ? yM + 12 : yM - 12, col.e(), 'right', 11); nodes.push(xn);
  }
  const rows = nodes.map((_, i) => yM + 30 + i * ((h - 26 - (yM + 30)) / Math.max(1, o.n - 1 || 1)) * (o.n > 1 ? 1 : 0));
  nodes.forEach((xn, i) => {
    const yr = rows[i]; seg(g, xn, yM, xn, yr, m, 1.2); seg(g, xn, yr, xS, yr, m, 1.2); const xb = xS + (xn - xS) * (0.55 + 0.12 * (o.n - 1 - i) / Math.max(1, o.n - 1));
    const bw = Math.max(30, o.fb[i].length * 6.4 + 10); box(Math.max(xb, xS + 10 + bw / 2), yr, o.fb[i], bw, col.b()); // clear of the line up into Σ
  });
  arrow(g, xS, rows[rows.length - 1], xS, yM + 10, m, 1.2);
  if (o.taps) {
    const yT = h * 0.13; nodes.forEach((xn, i) => { seg(g, xn, yM, xn, yT, col.a(), 1.2); box(xn + 0, (yM + yT) / 2, o.taps![i], 30, col.a()); });
    seg(g, nodes[0], yT, nodes[nodes.length - 1], yT, col.a(), 1.2); arrow(g, nodes[nodes.length - 1], yT, w - 30, yT, col.a()); text(g, o.yLabel, w - 4, yT, col.a(), 'right', 12);
  } else { arrow(g, nodes[nodes.length - 1], yM, w - 14 - o.yLabel.length * 7, yM, c); text(g, o.yLabel, w - 4, yM, c, 'right', 12); }
}
const picB3: QuizFigureDef = { aspect: 1.75, maxWidth: 520, draw(g, w, h) {
  chain(g, w, h, { n: 3, names: ['x₃', 'x₂', 'x₁'], fb: ['−8', '−19', '−2'], taps: ['24', '22', '3'], yLabel: 'y' });
  text(g, 'orange: feedback −aₖ (A’s last row) · blue: output taps (C)', 4, h - 4, col.muted(), 'left', 9);
} };
/** the speaker's own realization: ẍ = −a₀x − a₁ẋ + a₀·(DC gain)·V, two integrators */
const picSpkChain: QuizFigureDef = { aspect: 2.0, maxWidth: 520, draw(g, w, h) {
  const p = spk();
  chain(g, w, h, { n: 2, names: ['ẋ', 'x'], fb: [`−a₁ = −${p.a1.toFixed(3)}`, `−a₀ = −${p.a0.toFixed(2)}`], inGain: `a₀ × ${UM_PER_V.toFixed(1)}`, yLabel: 'x (µm)' });
  text(g, 'u = V (volts) · per ms units · orange: A’s last row', 4, h - 4, col.muted(), 'left', 9);
} };


/* ---------- worked examples in the dives ---------- */
/** roc: h = e^(−t)u(t) (Re s > −1) convolved with x = e^(2t)u(−t) (Re s < 2): Y's ROC is the strip */
export const rocY = (t: number) => (t >= 0 ? Math.exp(-t) / 3 : Math.exp(2 * t) / 3);
const picRocStrip: QuizFigureDef = { ...PH, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const [A, B] = two(w, h);
  const lk: Line[][] = [[['blue: h’s ROC Re s > −1', col.a()], ['orange: x’s ROC Re s < 2', col.b()], ['yellow: the overlap −1 < Re s < 2, Y’s ROC', col.e()]],
    [['y is two-sided (a strip ROC):', col.e()], ['⅓e^(2t) for t < 0', col.b()], ['⅓e^(−t) for t > 0', col.a()]]], n = heads(lk);
  const p = planeIn(header(g, A, lk[0], n), 0.5, 0, 2.2);
  shadeRe(g, p, -1, 99, BLUE); shadeRe(g, p, -99, 2, ORANGE); shadeRe(g, p, -1, 2, 'rgba(255,220,90,.10)'); planeAxes(g, p, 'Re s', 'Im s'); reTicks(g, p, [-2, -1, 1, 2, 3]);
  seg(g, p.X(-1), p.t, p.X(-1), p.b, col.a(), 1.2, [4, 3]); seg(g, p.X(2), p.t, p.X(2), p.b, col.b(), 1.2, [4, 3]);
  cross(g, p.X(-1), p.Y(0), col.a()); cross(g, p.X(2), p.Y(0), col.b());
  const ts = linspace(-2.5, 3, 221), f = frameIn(w, h, header(g, B, lk[1], n), [-2.5, 3], [0, 0.42]);
  axesAt(g, f, [-2.5, 3], [0, 0.42], 't', 'y(t)', 1, 0.1);
  curve(g, f, ts.filter((t) => t <= 0), ts.filter((t) => t <= 0).map(rocY), col.b(), 2.4); curve(g, f, ts.filter((t) => t >= 0), ts.filter((t) => t >= 0).map(rocY), col.a(), 2.4);
} };
/** sampling: cos(2π·5t) sampled at 6 Hz gives the same samples as cos(2π·1t) */
export const alias56 = { fs: 6, f: 5, fa: 1, n: Array.from({ length: 7 }, (_, n) => n) };
const picAlias: QuizFigureDef = { aspect: 2.3, phoneAspect: 1.5, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const body = header(g, { x: 0, y: 0, w, h }, [['blue: 5 Hz · orange dashed: 1 Hz', col.text()], ['yellow: the samples at 6 Hz, shared by both', col.e()]]);
  const ts = linspace(0, 1, 600), f = frameIn(w, h, body, [0, 1], [-1.25, 1.25]);
  // ticks at n/6 from integers (adding 1/6 six times misses 3/6 by rounding)
  axesAt(g, f, [0, 1], [-1.25, 1.25], 't (s)', 'x', 1 / 6, 0.5, (t) => `${Math.round(t * 6)}/6`);
  curve(g, f, ts, ts.map((t) => Math.cos(TAU * 5 * t)), col.a(), 1.3); curve(g, f, ts, ts.map((t) => Math.cos(TAU * t)), col.b(), 2.2, [6, 4]);
  for (const n of alias56.n) dot(g, f, [n / 6, Math.cos((TAU * 5 * n) / 6)], col.e(), 4.5);
} };

export const reviewPictures: Record<string, QuizFigureDef> = {
  'pic-rev-a1': picA1, 'pic-rev-a2': picA2, 'pic-rev-a3': picA3, 'pic-rev-a4': picA4,
  'pic-rev-b1': picB1, 'pic-rev-b2': picB2, 'pic-rev-b3': picB3,
  'pic-spk-chain': picSpkChain, 'pic-ex-roc-strip': picRocStrip, 'pic-ex-alias': picAlias,
};

/**
 * Pictures for the Review pages' "Picture it." paragraphs and a few dive worked examples
 * (```picture:<id> caption``` fences). Every value is computed here from the problem's own numbers
 * (and checked in test/reviewpics.test.ts); the speaker chain reads a₀, a₁ from spk().
 */
import { rangeFrame, graphAxes, curve, text, dot, col, linspace, cssVar, type QuizFigureDef } from '@study/core';
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
function reTicks(g: CanvasRenderingContext2D, p: Pl, vals: number[]) { for (const v of vals) { seg(g, p.X(v), p.Y(0) - 3, p.X(v), p.Y(0) + 3, col.strong()); if (v) text(g, String(v).replace('-', '−'), p.X(v), p.Y(0) + 11, col.muted(), 'center', 9); } }
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
/** graph axes for a panel that does not start at the canvas edge: the y label is drawn rotated beside the panel */
function axesAt(g: CanvasRenderingContext2D, f: ReturnType<typeof rangeFrame>, xr: P2, yr: P2, xl: string, yl: string, xs: number, ys: number, xfmt?: (x: number) => string) {
  graphAxes(g, f, xr, yr, xl, '', xs, ys, xfmt);
  g.save(); g.translate(f.box.l - 30, (f.box.t + f.box.b) / 2); g.rotate(-Math.PI / 2); text(g, yl, 0, 0, col.muted(), 'center', 10); g.restore();
}
const BLUE = 'rgba(110,168,255,.16)', ORANGE = 'rgba(255,150,80,.16)', GREEN = 'rgba(110,226,110,.14)';

/* ---------- A1: inverse Z with the ring ROC 2 < |z| < 3 ---------- */
export const a1 = { A: 4 / 35, B: -2 / 5, C: 2 / 7, x: (n: number) => (n >= 1 ? (4 / 35) * 0.5 ** (n - 1) - (2 / 5) * (-2) ** (n - 1) : -(2 / 7) * (-3) ** (n - 1)) };
const picA1: QuizFigureDef = { aspect: 2.1, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const p = plane(4, 18, w * 0.46, h - 26, 0, 0, 3.6);
  shadeRadius(g, p, 2, 3, GREEN); ring(g, p.X(0), p.Y(0), 2 * p.s, col.ok(), 1); ring(g, p.X(0), p.Y(0), 3 * p.s, col.ok(), 1);
  ring(g, p.X(0), p.Y(0), p.s, col.muted(), 1.2, [4, 3]); planeAxes(g, p, 'Re z', 'Im z'); reTicks(g, p, [-3, -2, 1, 2, 3]);
  cross(g, p.X(0.5), p.Y(0), col.a()); cross(g, p.X(-2), p.Y(0), col.a()); cross(g, p.X(-3), p.Y(0), col.b());
  text(g, 'green ring: the ROC 2 < |z| < 3', 6, 8, col.ok(), 'left', 10);
  text(g, 'dashed: unit circle, not in the ROC', p.X(0), p.Y(-1) + 12, col.muted(), 'center', 9);
  text(g, 'blue ×: inside the ring → right-sided', p.l + 2, p.b - 16, col.a(), 'left', 9);
  text(g, 'orange ×: outside → left-sided', p.l + 2, p.b - 4, col.b(), 'left', 9);
  const ns = Array.from({ length: 9 }, (_, i) => i - 4), xs = ns.map(a1.x), f = rangeFrame(w, h, [-4.6, 4.6], [-2, 3.6], w * 0.5 + 34, 8, 18, 24);
  axesAt(g, f, [-4.6, 4.6], [-2, 3.6], 'n', 'x(n)', 2, 1); stemsAt(g, f, ns, xs, (n) => (n >= 1 ? col.a() : col.b()));
  text(g, 'n ≥ 1: the ½ and −2 terms run forward', f.box.r, f.box.t - 8, col.a(), 'right', 9);
  text(g, 'n ≤ 0: the −3 term runs backward, shrinking', f.box.l + 2, f.Y(-1.4), col.b(), 'left', 9);
} };

/* ---------- A2: a double pole at −3 and y = t e^(−3t) ---------- */
const picA2: QuizFigureDef = { aspect: 2.1, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const p = plane(4, 18, w * 0.46, h - 26, -2, 0, 3);
  shadeRe(g, p, -3, 99, GREEN); planeAxes(g, p, 'Re s', 'Im s'); reTicks(g, p, [-4, -3, -2, -1, 1]);
  seg(g, p.X(-1.5), p.t, p.X(-1.5), p.b, col.e(), 1.4, [5, 3]);
  cross(g, p.X(-3), p.Y(0), col.bad()); text(g, 'double pole (×2)', p.X(-3) - 6, p.Y(0) - 12, col.bad(), 'right', 9);
  text(g, 'green: ROC Re s > −3', 6, 8, col.ok(), 'left', 10);
  text(g, 'yellow: the contour,', p.X(-1.5) + 4, p.t + 22, col.e(), 'left', 9); text(g, 'closed left for t > 0', p.X(-1.5) + 4, p.t + 34, col.e(), 'left', 9);
  const ts = linspace(0, 2, 201), f = rangeFrame(w, h, [0, 2], [0, 0.15], w * 0.5 + 40, 8, 18, 24);
  axesAt(g, f, [0, 2], [0, 0.15], 't', 'y(t)', 0.5, 0.05); curve(g, f, ts, ts.map((t) => t * Math.exp(-3 * t)), col.a(), 2.4);
  dot(g, f, [1 / 3, 1 / (3 * Math.E)], col.e(), 4);
  text(g, `y = t e^(−3t): grows, peaks at t = 1/3 (${(1 / (3 * Math.E)).toFixed(3)}), decays`, f.box.r, f.box.t - 8, col.a(), 'right', 9);
} };

/* ---------- A3: forced plus natural modes, y(n) from the recursion ---------- */
export function a3y(N: number) { const y: number[] = []; for (let n = 0; n < N; n++) y.push(-0.75 * (y[n - 1] ?? 0) - 0.125 * (y[n - 2] ?? 0) + 0.5 ** n); return y; }
const picA3: QuizFigureDef = { aspect: 2.1, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const p = plane(4, 18, w * 0.46, h - 26, 0, 0, 1.25);
  shadeRadius(g, p, 0.5, 99, GREEN); ring(g, p.X(0), p.Y(0), p.s, col.muted(), 1.2, [4, 3]); planeAxes(g, p, 'Re z', 'Im z'); reTicks(g, p, [-1, -0.5, 0.5, 1]);
  cross(g, p.X(0.5), p.Y(0), col.b()); cross(g, p.X(-0.25), p.Y(0), col.a()); cross(g, p.X(-0.5), p.Y(0), col.a());
  text(g, 'green: ROC |z| > ½ · dashed: unit circle', 6, 8, col.ok(), 'left', 10);
  text(g, 'orange ×: input mode (½)ⁿ', p.l + 2, p.b - 16, col.b(), 'left', 9);
  text(g, 'blue ×: natural modes (−¼)ⁿ, (−½)ⁿ', p.l + 2, p.b - 4, col.a(), 'left', 9);
  const ns = Array.from({ length: 9 }, (_, i) => i), ys = a3y(9), f = rangeFrame(w, h, [-0.6, 8.6], [-0.4, 1.1], w * 0.5 + 40, 8, 18, 24);
  axesAt(g, f, [-0.6, 8.6], [-0.4, 1.1], 'n', 'y(n)', 2, 0.5); stemsAt(g, f, ns, ys, () => col.e());
  text(g, 'y(n): alternates (negative poles), all inside |z| = 1, so it decays', f.box.r, f.box.t - 8, col.e(), 'right', 9);
} };

/* ---------- A4: the optimal path through the saddle of the Hamiltonian system ---------- */
export const a4 = (() => {
  const om = Math.sqrt(36.5), ch = (t: number) => Math.cosh(om * t), sh = (t: number) => Math.sinh(om * t) / om;
  const phi = (t: number) => [[ch(t) + 6 * sh(t), -sh(t) / 4], [-2 * sh(t), ch(t) - 6 * sh(t)]];
  const l0 = (2 - phi(1)[0][0]) / phi(1)[0][1];
  const x = (t: number) => phi(t)[0][0] + phi(t)[0][1] * l0, lam = (t: number) => phi(t)[1][0] + phi(t)[1][1] * l0;
  return { om, l0, x, lam, u: (t: number) => -lam(t) / 4, kStable: 4 * (6 + om), kUnstable: 4 * (6 - om) };
})();
const picA4: QuizFigureDef = { aspect: 2.1, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const ts = linspace(0, 1, 201);
  const f = rangeFrame(w, h, [0, 1], [-0.2, 2.2], 36, w * 0.5 + 6, 18, 24);
  axesAt(g, f, [0, 1], [-0.2, 2.2], 't', 'x(t)', 0.25, 0.5);
  curve(g, f, ts, ts.map((t) => 1 + t), col.muted(), 1.4, [5, 3]); curve(g, f, ts, ts.map(a4.x), col.e(), 2.6);
  text(g, 'yellow: optimal x(t), parked near 0', f.box.l + 4, f.box.t - 8, col.e(), 'left', 9);
  text(g, 'dashed: straight line (cost 136 vs 24.2)', f.box.l + 4, f.Y(1.9), col.muted(), 'left', 9);
  const q = rangeFrame(w, h, [-0.2, 2.3], [-8, 55], w * 0.5 + 44, 8, 18, 24);
  axesAt(g, q, [-0.2, 2.3], [-8, 55], 'x', 'λ', 0.5, 10);
  const xx = linspace(-0.2, 2.3, 50); curve(g, q, xx, xx.map((v) => a4.kStable * v), col.a(), 1.2, [4, 3]); curve(g, q, xx, xx.map((v) => a4.kUnstable * v), col.b(), 1.2, [4, 3]);
  curve(g, q, ts.map(a4.x), ts.map(a4.lam), col.e(), 2.4); dot(g, q, [1, a4.l0], col.bad(), 4); dot(g, q, [2, a4.lam(1)], col.ok(), 4);
  text(g, 'blue: stable direction (in) · orange: unstable (out)', q.box.r, q.box.t - 8, col.muted(), 'right', 9);
  text(g, `start (1, ${a4.l0.toFixed(1)})`, q.X(1) + 6, q.Y(a4.l0), col.bad(), 'left', 9);
  text(g, 'end x(1) = 2', q.X(2) - 4, q.Y(a4.lam(1)) - 10, col.ok(), 'right', 9);
} };

/* ---------- B1: poles +1, −1, −2, zeros ±j, and the impulse response ---------- */
export const b1y = (t: number) => Math.exp(t) / 3 - Math.exp(-t) + (5 / 3) * Math.exp(-2 * t);
const picB1: QuizFigureDef = { aspect: 2.1, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const p = plane(4, 18, w * 0.46, h - 26, -0.5, 0, 1.9);
  planeAxes(g, p, 'Re s', 'Im s'); reTicks(g, p, [-2, -1, 1]);
  cross(g, p.X(1), p.Y(0), col.bad()); cross(g, p.X(-1), p.Y(0), col.a()); cross(g, p.X(-2), p.Y(0), col.a());
  zero(g, p.X(0), p.Y(1), col.ok()); zero(g, p.X(0), p.Y(-1), col.ok());
  text(g, '× poles (modes) · ○ zeros ±j', 6, 8, col.text(), 'left', 10);
  text(g, 'red: +1, unstable', p.X(1), p.Y(0) + 16, col.bad(), 'center', 9);
  const ts = linspace(0, 3, 241), f = rangeFrame(w, h, [0, 3], [0, 7.5], w * 0.5 + 34, 8, 18, 24);
  axesAt(g, f, [0, 3], [0, 7.5], 't', 'y(t)', 1, 2);
  curve(g, f, ts, ts.map((t) => Math.exp(t) / 3), col.bad(), 1.3, [5, 3]); curve(g, f, ts, ts.map(b1y), col.e(), 2.4);
  text(g, 'yellow: y(t), from y(0⁺) = 1', f.box.l + 4, f.box.t - 8, col.e(), 'left', 9);
  text(g, 'dashed: eᵗ/3, where it heads', f.box.l + 4, f.Y(5.6), col.bad(), 'left', 9);
} };

/* ---------- B2: a sensor as a projection; it misses the mode it is perpendicular to ---------- */
export const b2 = { v: [[-2, 4, 1], [0, 1, 1], [0, 0, 1]], lam: [-1, -2, -3], read: (f: number, gg: number) => b2.v.map((v) => f * v[1] + gg * v[2]) };
const picB2: QuizFigureDef = { aspect: 2.1, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const p = plane(w * 0.04, 22, w * 0.92, h - 30, 1.9, 0.55, 1.35);
  planeAxes(g, p, 'x₂', 'x₃'); const fS = 1, gS = 0, r = b2.read(fS, gS);
  seg(g, p.X(0), p.t, p.X(0), p.b, col.bad(), 2.4, [6, 4]);
  arrow(g, p.X(0), p.Y(0), p.X(1.2), p.Y(0), col.ok(), 2.6);
  const cs = [col.a(), col.b(), col.c()];
  b2.v.forEach((v, i) => { arrow(g, p.X(0), p.Y(0), p.X(v[1]), p.Y(v[2]), cs[i], 2); text(g, `λ = ${String(b2.lam[i]).replace('-', '−')}: reads ${r[i]}`, p.X(v[1]) + 6, p.Y(v[2]) - (i === 2 ? 2 : 8), cs[i], 'left', 9); });
  text(g, 'green: sensor y = f x₂ + g x₃ with f = 1, g = 0', 6, 8, col.ok(), 'left', 10);
  text(g, 'red dashed: its blind line (perpendicular); the λ = −3 mode lies on it', p.X(0) + 6, p.b - 6, col.bad(), 'left', 9);
} };

/* ---------- integrator chains (phase-variable realizations) ---------- */
/**
 * u → [in] → Σ → ∫ → x_n → ∫ → … → x₁, with each state fed back to Σ through fb[i] (i = 0 is x_n)
 * and, if taps are given, summed into y through taps[i]; otherwise y = x₁.
 */
function chain(g: CanvasRenderingContext2D, w: number, h: number, o: { n: number; names: string[]; fb: string[]; taps?: string[]; inGain?: string; yLabel: string }) {
  g.clearRect(0, 0, w, h); const c = col.text(), m = col.muted();
  const yM = h * (o.taps ? 0.42 : 0.3), xIn = 16, xG = o.inGain ? w * 0.13 : xIn, xS = o.inGain ? w * 0.25 : w * 0.14, xEnd = w * (o.taps ? 0.8 : 0.86), step = (xEnd - xS) / o.n;
  const box = (x: number, y: number, s: string, bw = 26, color = c) => { g.save(); g.fillStyle = cssVar('--plot-bg') || cssVar('--panel'); g.fillRect(x - bw / 2, y - 11, bw, 22); g.strokeStyle = color; g.lineWidth = 1.4; g.strokeRect(x - bw / 2, y - 11, bw, 22); g.restore(); text(g, s, x, y + 1, color, 'center', 11); };
  text(g, 'u', xIn - 8, yM, c, 'center', 12);
  if (o.inGain) { arrow(g, xIn, yM, xG - 30, yM, c); box(xG, yM, o.inGain, 58); arrow(g, xG + 29, yM, xS - 10, yM, c); } else arrow(g, xIn, yM, xS - 10, yM, c);
  ring(g, xS, yM, 10, c, 1.4); text(g, 'Σ', xS, yM + 1, c, 'center', 11);
  const nodes: number[] = [];
  for (let i = 0; i < o.n; i++) {
    const xi = xS + step * (i + 0.45), xn = xS + step * (i + 1);
    arrow(g, i ? nodes[i - 1] : xS + 10, yM, xi - 14, yM, c); box(xi, yM, '∫'); seg(g, xi + 13, yM, xn, yM, c, 1.4); dot(g, rangeFrame(w, h, [0, w], [h, 0], 0, 0, 0, 0), [xn, yM], c, 2.6);
    text(g, o.names[i], xn - 4, yM - 12, col.e(), 'right', 11); nodes.push(xn);
  }
  const rows = nodes.map((_, i) => yM + 30 + i * ((h - 26 - (yM + 30)) / Math.max(1, o.n - 1 || 1)) * (o.n > 1 ? 1 : 0));
  nodes.forEach((xn, i) => {
    const yr = rows[i]; seg(g, xn, yM, xn, yr, m, 1.2); seg(g, xn, yr, xS, yr, m, 1.2); const xb = xS + (xn - xS) * (0.55 + 0.12 * (o.n - 1 - i) / Math.max(1, o.n - 1));
    box(xb, yr, o.fb[i], Math.max(30, o.fb[i].length * 6.4 + 10), col.b());
  });
  arrow(g, xS, rows[rows.length - 1], xS, yM + 10, m, 1.2);
  if (o.taps) {
    const yT = h * 0.13; nodes.forEach((xn, i) => { seg(g, xn, yM, xn, yT, col.a(), 1.2); box(xn + 0, (yM + yT) / 2, o.taps![i], 30, col.a()); });
    seg(g, nodes[0], yT, nodes[nodes.length - 1], yT, col.a(), 1.2); arrow(g, nodes[nodes.length - 1], yT, w - 30, yT, col.a()); text(g, o.yLabel, w - 4, yT, col.a(), 'right', 12);
  } else { arrow(g, nodes[nodes.length - 1], yM, w - 14 - o.yLabel.length * 7, yM, c); text(g, o.yLabel, w - 4, yM, c, 'right', 12); }
}
const picB3: QuizFigureDef = { aspect: 2.3, maxWidth: 520, draw(g, w, h) {
  chain(g, w, h, { n: 3, names: ['x₃', 'x₂', 'x₁'], fb: ['−8', '−19', '−2'], taps: ['24', '22', '3'], yLabel: 'y' });
  text(g, 'orange: feedback −aₖ (A’s last row) · blue: output taps (C)', 4, h - 4, col.muted(), 'left', 9);
} };
/** the speaker's own realization: ẍ = −a₀x − a₁ẋ + a₀·(DC gain)·V, two integrators */
const picSpkChain: QuizFigureDef = { aspect: 2.3, maxWidth: 520, draw(g, w, h) {
  const p = spk();
  chain(g, w, h, { n: 2, names: ['ẋ', 'x'], fb: [`−a₁ = −${p.a1.toFixed(3)}`, `−a₀ = −${p.a0.toFixed(2)}`], inGain: `a₀ × ${UM_PER_V.toFixed(1)}`, yLabel: 'x (µm)' });
  text(g, 'u = V (volts) · per ms units · orange: A’s last row', 4, h - 4, col.muted(), 'left', 9);
} };

/* ---------- worked examples in the dives ---------- */
/** roc: h = e^(−t)u(t) (Re s > −1) convolved with x = e^(2t)u(−t) (Re s < 2): Y's ROC is the strip */
export const rocY = (t: number) => (t >= 0 ? Math.exp(-t) / 3 : Math.exp(2 * t) / 3);
const picRocStrip: QuizFigureDef = { aspect: 2.1, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const p = plane(4, 18, w * 0.46, h - 26, 0.5, 0, 2.2);
  shadeRe(g, p, -1, 99, BLUE); shadeRe(g, p, -99, 2, ORANGE); shadeRe(g, p, -1, 2, 'rgba(255,220,90,.10)'); planeAxes(g, p, 'Re s', 'Im s'); reTicks(g, p, [-2, -1, 1, 2, 3]);
  seg(g, p.X(-1), p.t, p.X(-1), p.b, col.a(), 1.2, [4, 3]); seg(g, p.X(2), p.t, p.X(2), p.b, col.b(), 1.2, [4, 3]);
  cross(g, p.X(-1), p.Y(0), col.a()); cross(g, p.X(2), p.Y(0), col.b());
  text(g, 'blue: h’s ROC Re s > −1 · orange: x’s Re s < 2', 6, 8, col.text(), 'left', 10);
  text(g, 'overlap: −1 < Re s < 2', p.X(0.5), p.b - 6, col.e(), 'center', 9);
  const ts = linspace(-2.5, 3, 221), f = rangeFrame(w, h, [-2.5, 3], [0, 0.42], w * 0.5 + 40, 8, 18, 24);
  axesAt(g, f, [-2.5, 3], [0, 0.42], 't', 'y(t)', 1, 0.1); curve(g, f, ts, ts.map(rocY), col.e(), 2.4);
  text(g, 'a strip ROC: y is two-sided', f.box.r, f.box.t - 8, col.e(), 'right', 9);
  text(g, '⅓e^(2t), t < 0', f.X(-1.2), f.Y(0.2), col.b(), 'center', 9); text(g, '⅓e^(−t), t > 0', f.X(1.7), f.Y(0.2), col.a(), 'center', 9);
} };
/** sampling: cos(2π·5t) sampled at 6 Hz gives the same samples as cos(2π·1t) */
export const alias56 = { fs: 6, f: 5, fa: 1, n: Array.from({ length: 7 }, (_, n) => n) };
const picAlias: QuizFigureDef = { aspect: 2.3, maxWidth: 520, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const ts = linspace(0, 1, 600), f = rangeFrame(w, h, [0, 1], [-1.25, 1.45], 40, 10, 10, 26);
  axesAt(g, f, [0, 1], [-1.25, 1.45], 't (s)', 'x', 1 / 6, 0.5, (t) => `${Math.round(t * 6)}/6`);
  curve(g, f, ts, ts.map((t) => Math.cos(TAU * 5 * t)), col.a(), 1.3); curve(g, f, ts, ts.map((t) => Math.cos(TAU * t)), col.b(), 2.2, [6, 4]);
  for (const n of alias56.n) dot(g, f, [n / 6, Math.cos((TAU * 5 * n) / 6)], col.e(), 4.5);
  text(g, 'blue: 5 Hz · orange dashed: 1 Hz · yellow: samples at 6 Hz, shared by both', f.box.l + 4, f.box.t + 6, col.text(), 'left', 10);
} };

export const reviewPictures: Record<string, QuizFigureDef> = {
  'pic-rev-a1': picA1, 'pic-rev-a2': picA2, 'pic-rev-a3': picA3, 'pic-rev-a4': picA4,
  'pic-rev-b1': picB1, 'pic-rev-b2': picB2, 'pic-rev-b3': picB3,
  'pic-spk-chain': picSpkChain, 'pic-ex-roc-strip': picRocStrip, 'pic-ex-alias': picAlias,
};

import { figureOf, planeFrame, rangeFrame, gridT, spanLine, arrow, dot, polyline, fillPoly, text, tline, axes2, wipe, curve, graphAxes, col, mulV, lerpM, IDENT, inv2, det2, deg, linspace, type M2, type V2 } from '@study/core';
import { eig2 } from '@study/core/dsp';
import { CART_A, eigPairs, fmt, num } from './common';

/* ───────────── eig: a matrix is a transformation of the plane ───────────── */
export const eigFigure = figureOf((c) => {
  const A = (): M2 => [[num(c.values, 'a'), num(c.values, 'b')], [num(c.values, 'c'), num(c.values, 'd')]];
  return [
    {
      id: 'grid', title: 'A moves every point of the plane', x: 'x₁ (position)', y: 'x₂ (velocity)',
      draw(g, w, h) {
        wipe(g, w, h);
        const f = planeFrame(w, h, 5), M = A(), Mt = lerpM(IDENT, M, num(c.values, 't'));
        gridT(g, f, IDENT, 8, col.strong(), 1, 1, 0.5);
        axes2(g, f);
        gridT(g, f, Mt, 8, col.accent(), 1.2, 1, 0.55);
        for (const [i, e] of eigPairs(M).entries()) spanLine(g, f, e.v, i ? col.b() : col.c(), 2, [7, 5]);
        const th = deg(num(c.values, 'th')), v: V2 = [1.6 * Math.cos(th), 1.6 * Math.sin(th)];
        const circle = linspace(0, Math.PI * 2, 90).map((a): V2 => mulV(Mt, [Math.cos(a), Math.sin(a)]));
        polyline(g, f, circle.map((q): V2 => [q[0] * 1.6, q[1] * 1.6]), col.muted(), 1.2, [3, 3], true);
        arrow(g, f, [0, 0], v, col.a(), 2.5, 'v');
        arrow(g, f, [0, 0], mulV(Mt, v), col.e(), 2.5, t01(c) < 0.02 ? '' : 'Av');
        const ev = eigPairs(M);
        if (!ev.length) text(g, 'no real eigen-direction: A rotates everything', f.box.l + 4, f.box.t + 8, col.bad(), 'left', 11);
      },
    },
    {
      id: 'align', title: 'Is Av still along v? (zeros = eigenvectors)', x: 'angle of v (°)', y: 'misalignment |sin∠(v, Av)|',
      draw(g, w, h) {
        wipe(g, w, h);
        const M = A(), f = rangeFrame(w, h, [0, 360], [0, 1.05], 40, 10, 8, 30);
        graphAxes(g, f, [0, 360], [0, 1.05], 'angle of v (°)', '|sin∠(v, Av)|', 90, 0.5);
        const xs = linspace(0, 360, 361), ys = xs.map((d) => { const v: V2 = [Math.cos(deg(d)), Math.sin(deg(d))], u = mulV(M, v); return Math.abs(v[0] * u[1] - v[1] * u[0]) / (Math.hypot(u[0], u[1]) || 1); });
        curve(g, f, xs, ys, col.e(), 2.5);
        for (const [i, e] of eigPairs(M).entries()) for (const base of [0, 180]) { const d = (((Math.atan2(e.v[1], e.v[0]) * 180) / Math.PI + base) % 360 + 360) % 360; tline(g, f, [d, 0], [d, 1.05], i ? col.b() : col.c(), 1.5, [5, 4]); dot(g, f, [d, 0], i ? col.b() : col.c(), 5); }
        const th = num(c.values, 'th'); const v: V2 = [Math.cos(deg(th)), Math.sin(deg(th))], u = mulV(M, v);
        const cur = Math.abs(v[0] * u[1] - v[1] * u[0]) / (Math.hypot(u[0], u[1]) || 1);
        dot(g, f, [th, cur], col.a(), 5);
        const ev = eig2(M);
        text(g, ev[0][1] === 0 ? `λ = ${fmt(ev[0][0])}, ${fmt(ev[1][0])}` : `λ = ${fmt(ev[0][0])} ± ${fmt(ev[0][1])}j`, f.box.r - 4, f.box.t + 10, col.muted(), 'right', 11);
      },
    },
  ];
});
const t01 = (c: { values: Record<string, number | string | boolean> }) => num(c.values, 't');

/* ───────────── diag: change of basis so that A is just stretching ───────────── */
export const diagFigure = figureOf((c) => {
  const basis = () => { const t1 = deg(num(c.values, 'th1')), t2 = deg(num(c.values, 'th2')); return { V: [[Math.cos(t1), Math.cos(t2)], [Math.sin(t1), Math.sin(t2)]] as M2, l1: num(c.values, 'l1'), l2: num(c.values, 'l2') }; };
  return [
    {
      id: 'x', title: 'Standard coordinates: x and Ax', x: 'x₁', y: 'x₂',
      draw(g, w, h) {
        wipe(g, w, h);
        const { V, l1, l2 } = basis(), f = planeFrame(w, h, 2.6);
        axes2(g, f);
        gridT(g, f, V, 8, col.strong(), 1, 1, 0.6);
        const v1: V2 = [V[0][0], V[1][0]], v2: V2 = [V[0][1], V[1][1]];
        spanLine(g, f, v1, col.c(), 2, [7, 5]); spanLine(g, f, v2, col.b(), 2, [7, 5]);
        const ph = deg(num(c.values, 'phi')), x: V2 = [Math.cos(ph), Math.sin(ph)];
        if (Math.abs(det2(V)) < 0.02) { text(g, 'eigenvectors are (almost) parallel: no basis', w / 2, h / 2, col.bad(), 'center', 12); return; }
        const xi = mulV(inv2(V), x);
        const A: M2 = [[0, 0], [0, 0]]; void A;
        const Ax = [V[0][0] * l1 * xi[0] + V[0][1] * l2 * xi[1], V[1][0] * l1 * xi[0] + V[1][1] * l2 * xi[1]] as V2;
        const p1: V2 = [v1[0] * xi[0], v1[1] * xi[0]];
        polyline(g, f, [[0, 0], p1, x], col.c(), 1.5, [3, 3]); polyline(g, f, [[0, 0], [v2[0] * xi[1], v2[1] * xi[1]], x], col.b(), 1.5, [3, 3]);
        arrow(g, f, [0, 0], x, col.a(), 2.5, 'x'); arrow(g, f, [0, 0], Ax, col.e(), 2.5, 'Ax');
      },
    },
    {
      id: 'xi', title: 'Eigen-coordinates ξ = V⁻¹x: A is just Λ', x: 'ξ₁ (along v₁)', y: 'ξ₂ (along v₂)',
      draw(g, w, h) {
        wipe(g, w, h);
        const { V, l1, l2 } = basis();
        if (Math.abs(det2(V)) < 0.02) { text(g, 'no eigenbasis, no ξ-plane (see Jordan form)', w / 2, h / 2, col.bad(), 'center', 12); return; }
        const Vi = inv2(V); let big = 1;
        for (let d = 0; d < 360; d += 5) { const q = mulV(Vi, [Math.cos(deg(d)), Math.sin(deg(d))]); big = Math.max(big, Math.abs(q[0]), Math.abs(q[1]), Math.abs(l1 * q[0]), Math.abs(l2 * q[1])); }
        const f = planeFrame(w, h, Math.min(60, big * 1.2));
        gridT(g, f, IDENT, 60, col.strong(), 1, Math.max(1, Math.round(big / 4)), 0.5); axes2(g, f, 'ξ₁', 'ξ₂');
        const ph = deg(num(c.values, 'phi')), x: V2 = [Math.cos(ph), Math.sin(ph)], xi = mulV(inv2(V), x);
        const L: V2 = [l1 * xi[0], l2 * xi[1]];
        polyline(g, f, [[0, 0], [xi[0], 0], xi], col.c(), 1.5, [3, 3]); polyline(g, f, [[0, 0], [0, xi[1]], xi], col.b(), 1.5, [3, 3]);
        arrow(g, f, [0, 0], xi, col.a(), 2.5, 'ξ'); arrow(g, f, [0, 0], L, col.e(), 2.5, 'Λξ');
        text(g, `ξ₁ → ${fmt(l1)} ξ₁,  ξ₂ → ${fmt(l2)} ξ₂`, f.box.l + 4, f.box.b - 6, col.muted(), 'left', 11);
      },
    },
  ];
});

/* ───────────── jordan: a shear that is not a stretch ───────────── */
export const jordanFigure = figureOf((c) => {
  const phi = (t: number): M2 => { const l = num(c.values, 'lam'), k = num(c.values, 'k'), e = Math.exp(l * t); return [[e, k * t * e], [0, e]]; };
  return [
    {
      id: 'shear', title: 'e^{At} drags the plane sideways as it shrinks', x: 'x₁', y: 'x₂',
      draw(g, w, h) {
        wipe(g, w, h);
        const f = planeFrame(w, h, 3), t = num(c.values, 't'), P = phi(t);
        gridT(g, f, IDENT, 6, col.grid(), 1); axes2(g, f);
        gridT(g, f, P, 6, col.accent(), 1.2);
        fillPoly(g, f, [[0, 0], mulV(P, [1, 0]), mulV(P, [1, 1]), mulV(P, [0, 1])], 'rgba(255,138,92,.28)');
        spanLine(g, f, [1, 0], col.c(), 2, [7, 5]);
        arrow(g, f, [0, 0], mulV(P, [1, 0]), col.a(), 2.5); arrow(g, f, [0, 0], mulV(P, [0, 1]), col.b(), 2.5);
        const tr = linspace(0, t, 40).map((s): V2 => mulV(phi(s), [0, 1]));
        polyline(g, f, tr, col.e(), 1.8);
        text(g, 'green: the only eigenvector direction', f.box.l + 4, f.box.b - 6, col.muted(), 'left', 10);
      },
    },
    {
      id: 'hump', title: 'Entries of e^{At}: the off-diagonal term t·e^{λt}', x: 'time t (s)', y: 'entry of e^{At}',
      draw(g, w, h) {
        wipe(g, w, h);
        const ts = linspace(0, 6, 180), l = num(c.values, 'lam'), k = num(c.values, 'k');
        const d = ts.map((t) => Math.exp(l * t)), o = ts.map((t) => k * t * Math.exp(l * t));
        const hi = Math.max(1.1, ...o.map((v) => Math.min(v, 6))), f = rangeFrame(w, h, [0, 6], [-0.1, Math.min(6, hi)], 40, 10, 8, 30);
        graphAxes(g, f, [0, 6], [-0.1, Math.min(6, hi)], 'time t (s)', 'entry of e^{At}');
        curve(g, f, ts, d, col.a(), 2.5); curve(g, f, ts, o, col.b(), 2.5);
        const t = num(c.values, 't'); tline(g, f, [t, f.iy(f.box.t)], [t, f.iy(f.box.b)], col.muted(), 1, [4, 3]);
      },
    },
  ];
});

/* ───────────── ortho: inner products as shadows, and orthogonality of sinusoids ───────────── */
export const orthoFigure = figureOf((c) => [
  {
    id: 'proj', title: '⟨u, w⟩ is the shadow of u on w', x: 'x₁', y: 'x₂',
    draw(g, w, h) {
      wipe(g, w, h);
      const f = planeFrame(w, h, 1.7), a = deg(num(c.values, 'alpha')), uu: V2 = [1.2 * Math.cos(a), 1.2 * Math.sin(a)];
      axes2(g, f); spanLine(g, f, [1, 0], col.grid(), 1, []);
      const s = uu[0];
      tline(g, f, uu, [s, 0], col.muted(), 1.5, [4, 3]);
      arrow(g, f, [0, 0], [s, 0], col.c(), 5);
      arrow(g, f, [0, 0], [1, 0], col.a(), 2.5, 'w'); arrow(g, f, [0, 0], uu, col.b(), 2.5, 'u');
      text(g, `⟨u, w⟩ = |u||w|cos α = ${fmt(s)}`, f.box.l + 4, f.box.t + 8, col.text(), 'left', 12);
      text(g, Math.abs(s) < 0.02 ? 'orthogonal: u casts no shadow on w' : 'green: the shadow (projection) of u on w', f.box.l + 4, f.box.b - 6, col.muted(), 'left', 10);
    },
  },
  {
    id: 'trig', title: 'Orthogonality of sinusoids: ∫ sin(mt) sin(nt) dt', x: 't (rad)', y: 'sin(mt)·sin(nt)',
    draw(g, w, h) {
      wipe(g, w, h);
      const m = num(c.values, 'm'), n = num(c.values, 'n'), ts = linspace(0, 2 * Math.PI, 400), ys = ts.map((t) => Math.sin(m * t) * Math.sin(n * t));
      const f = rangeFrame(w, h, [0, 2 * Math.PI], [-1.1, 1.1], 40, 10, 8, 30);
      graphAxes(g, f, [0, 2 * Math.PI], [-1.1, 1.1], 't (rad)', 'sin(mt) sin(nt)', Math.PI / 2, 0.5);
      fillBetween2(g, f, ts, ys);
      curve(g, f, ts, ys, col.text(), 2);
      let area = 0; for (let i = 1; i < ts.length; i++) area += ((ys[i] + ys[i - 1]) / 2) * (ts[i] - ts[i - 1]);
      text(g, `net area = ${fmt(area)}   (green − red)`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 12);
      text(g, m === n ? 'same frequency: all positive, area π' : 'different frequencies: positive and negative cancel', f.box.l + 4, f.box.b - 6, col.muted(), 'left', 10);
    },
  },
]);
function fillBetween2(g: CanvasRenderingContext2D, f: ReturnType<typeof rangeFrame>, xs: number[], ys: number[]) {
  g.save(); g.beginPath(); g.rect(f.box.l, f.box.t, f.box.r - f.box.l, f.box.b - f.box.t); g.clip();
  for (const [sign, color] of [[1, 'rgba(110,226,110,.45)'], [-1, 'rgba(239,91,91,.45)']] as const) {
    g.fillStyle = color; g.beginPath(); g.moveTo(f.X(xs[0]), f.Y(0));
    for (let i = 0; i < xs.length; i++) g.lineTo(f.X(xs[i]), f.Y(sign * ys[i] > 0 ? ys[i] : 0));
    g.lineTo(f.X(xs[xs.length - 1]), f.Y(0)); g.closePath(); g.fill();
  }
  g.restore();
}
void CART_A;

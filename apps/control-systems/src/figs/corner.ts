/** Car-corner figures (SECOND, SPECS, DOM, LOOP, series 4): one wheel's share of the car, t in s, z in cm. Numbers from ../model. */
import { figureOf, drawSPlane, splaneDrag, curve, tline, dot, text, col, fillBetween, type FigurePanel } from '@study/core';
import { C, tf, step, lsim, polyRoots, charPoly, acker, type TF, type Cx } from '@study/core/dsp';
import { CORNER, CORNER_DESIGN, WHEEL } from '../model/params';
import { cornerOf, cornerGu, cornerGw, cornerNumbers, cornerA, cornerB, cornerRelease, wheelA, wheelLoadStep, cornerK, cornerL, cornerNbar, cornerBump, cornerSep, metricsOf, roots, pctOS, type Corner } from '../model/plants';
import { type V, num, str, on, f, k3, legend, plotFrame, hline, range, lin, para } from './util';
import { drawCorner, drawLoop } from './draw';

/** Sliders give m in kg, k and c in kN/m, kN·s/m. */
export const cornerParams = (v: V): Corner => cornerOf({ m: num(v, 'm', CORNER.m), k: num(v, 'k', CORNER.k / 1000) * 1000, c: num(v, 'c', CORNER.c / 1000) * 1000 });
const T_CORNER = 3;
/** Body height (cm) for the chosen input: 1 kN load (pushes down), 5 cm road step, or release from 5 cm. */
export function cornerResp(v: V, T = T_CORNER, n = 601) {
  const p = cornerParams(v), inp = str(v, 'input', 'load'), t = lin(0, T, n);
  let y: number[];
  if (inp === 'road') y = step(cornerGw(p), t).y.map((q) => 5 * q);
  else if (inp === 'release') { const z = cornerRelease(5, 0, p); y = t.map(z); }
  else y = step(cornerGu(p), t).y.map((q) => -1000 * 100 * q);
  const final = inp === 'road' ? 5 : inp === 'release' ? 0 : (-1000 * 100) / p.k;
  return { p, t, y, final, inp };
}
const at = (t: number[], y: number[], tt: number) => { const i = Math.max(0, Math.min(t.length - 1, Math.round((tt / t[t.length - 1]) * (t.length - 1)))); return y[i]; };

/* ── SECOND · figure:corner ── */
export const cornerPanels = (): FigurePanel[] => [
  {
    id: 'scene', title: 'The corner: body on a spring and a shock', x: 'picture', y: 'body height',
    draw(g, w, h, v) {
      g.clearRect(0, 0, w, h); const r = cornerResp(v), tt = num(v, 't', 3), z = at(r.t, r.y, tt), nb = cornerNumbers(r.p);
      const road = r.inp === 'road' && tt > 0 ? 0.05 : 0;
      drawCorner(g, 8, 4, w * 0.55, h - 8, { z: z / 100, road, ghostZ: r.inp === 'release' ? 0 : undefined, force: r.inp === 'load' ? -1000 : 0, scale: (h - 8) * 2.4 });
      let y = 16; const x = w * 0.58, mw = w * 0.42 - 6;
      y = para(g, `t = ${f(tt, 2)} s   z = ${f(z, 2)} cm`, x, y, mw, col.text(), 10.5) + 4;
      y = para(g, `ωn = √(k/m) = ${f(nb.wn)} rad/s (${f(nb.fn)} Hz)`, x, y, mw, col.muted(), 10);
      y = para(g, `ζ = c/(2√(km)) = ${f(nb.zeta, 3)}`, x, y, mw, col.muted(), 10);
      y = para(g, `poles −${f(nb.sigma)} ± j${f(nb.wd)}`, x, y, mw, col.muted(), 10);
      para(g, r.inp === 'load' ? '1 kN load pushes the body down' : r.inp === 'road' ? 'the road steps up 5 cm' : 'held 5 cm up, then let go', x, y + 4, mw, col.e(), 10);
    },
  },
  {
    id: 'z', title: 'Body height z(t)', x: 'time (s)', y: 'z (cm)',
    draw(g, w, h, v) {
      const r = cornerResp(v), yr = range([r.y], 0.12, 0), fr = plotFrame(g, w, h, [0, T_CORNER], yr, 'time (s)', 'z (cm)');
      tline(g, fr, [0, 0], [T_CORNER, 0], col.strong(), 1); if (r.final) hline(g, fr, r.final, [0, T_CORNER], `final ${f(r.final, 2)} cm`, col.muted(), r.final < 0);
      curve(g, fr, r.t, r.y, col.a(), 2.4); const tt = num(v, 't', 3); dot(g, fr, [tt, at(r.t, r.y, tt)], col.e(), 4);
      if (r.inp !== 'release') {
        const m = metricsOf(r.t, r.y.map((q) => q / r.final), 1);
        if (m.OS > 0.05) { const pk = r.final * (1 + m.OS / 100); dot(g, fr, [m.Tp, pk], col.b(), 4); text(g, `${f(m.OS, 0)} % overshoot at Tp = ${f(m.Tp)} s`, fr.X(m.Tp) + 6, fr.Y(pk) + (r.final < 0 ? 10 : -10), col.b(), 'left', 10); }
        if (m.Ts < T_CORNER) { tline(g, fr, [m.Ts, yr[0]], [m.Ts, yr[1]], col.ok(), 1, [3, 3]); text(g, `Ts (2 %) = ${f(m.Ts)} s`, fr.X(m.Ts) + 4, r.final < 0 ? fr.box.t + 10 : fr.box.b - 10, col.ok(), 'left', 10); }
      } else text(g, `each swing ${f(cornerNumbers(r.p).period, 2)} s apart`, fr.box.r - 6, fr.box.t + 10, col.muted(), 'right', 10);
    },
  },
];
export const cornerFigure = figureOf(cornerPanels);

/* ── SPECS · figure:specs ── */
export const zetaForOS = (os: number) => { const l = Math.log(os / 100); return -l / Math.sqrt(Math.PI ** 2 + l * l); };
export const specsPanels = (c: { values: V; set(k: string, v: number | string | boolean): void }): FigurePanel[] => [
  {
    id: 'plane', title: 'Allowed region for the poles (shaded); the corner\'s poles', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v) {
      const os = num(v, 'os', 10), ts = num(v, 'ts', 1), z = zetaForOS(os), p = cornerParams(v), nb = cornerNumbers(p), sig = 4 / ts;
      const poles: Cx[] = nb.zeta < 1 ? [C(-nb.sigma, nb.wd), C(-nb.sigma, -nb.wd)] : roots([p.m, p.c, p.k]);
      const ok = poles.every((q) => -q.re >= sig - 1e-9 && (q.im === 0 || -q.re / Math.hypot(q.re, q.im) >= z - 1e-9));
      const fr = drawSPlane(g, w, h, { range: 12, reCenter: -6, poles, labels: true, zetaRays: [z], region: { zeta: z, sigma: sig }, handles: [poles[0]] });
      // the notes keep to the left part of the plane (inside the allowed region, away from the poles near σ = −2) and start below the
      // top grid number; the bottom one sits just under the σ axis, not on the tick numbers along the bottom (pass 2, N5)
      const nw = (fr.box.r - fr.box.l) * 0.58, xl = fr.box.l + 22, ym = (fr.box.t + fr.box.b) / 2;
      let y = para(g, `%OS ≤ ${f(os, 0)} % ⇒ ζ ≥ ${f(z, 3)}`, xl, fr.box.t + 24, nw, col.text(), 10);
      para(g, `Ts ≤ ${f(ts, 1)} s ⇒ σ ≥ 4/Ts = ${f(sig, 1)}/s`, xl, y + 2, nw, col.text(), 10);
      para(g, ok ? 'poles inside: specs met' : `poles outside: c = ${k3(p.c)} N·s/m misses`, xl, ym + 14, nw, ok ? col.ok() : col.bad(), 10.5);
    },
    pointer: splaneDrag({ range: 12, reCenter: -6, upperOnly: true, handles: () => { const nb = cornerNumbers(cornerParams(c.values)); return [{ id: 'p', s: C(-nb.sigma, nb.wd) }]; }, onDrag: (_id, s) => { const p = cornerParams(c.values), cc = Math.max(0.5, Math.min(6.4, (-2 * p.m * s.re) / 1000)); c.set('c', Math.round(cc * 20) / 20); } }),
  },
  {
    id: 'step', title: '1 kN load step on that corner', x: 'time (s)', y: 'z (cm)',
    draw(g, w, h, v) {
      const r = cornerResp({ ...v, input: 'load' }), fr = plotFrame(g, w, h, [0, T_CORNER], range([r.y], 0.12, 0), 'time (s)', 'z (cm)'), m = metricsOf(r.t, r.y.map((q) => q / r.final), 1);
      hline(g, fr, r.final, [0, T_CORNER], '', col.muted(), true); curve(g, fr, r.t, r.y, col.a(), 2.4);
      const os = num(v, 'os', 10), ts = num(v, 'ts', 1);
      legend(g, fr, [{ label: `%OS ${f(m.OS, 1)} % (limit ${f(os, 0)} %)`, color: m.OS <= os ? col.ok() : col.bad() }, { label: `Ts ${f(m.Ts, 2)} s (limit ${f(ts, 1)} s)`, color: m.Ts <= ts ? col.ok() : col.bad() }], 'br');
    },
  },
];
export const specsFigure = figureOf((c) => specsPanels(c));

/* ── DOM · figure:dominant (add the wheel) ── */
export const dominantFigure = figureOf(() => [
  {
    id: 'step', title: 'Body after a 1 kN load: one mass vs with the wheel', x: 'time (s)', y: 'z (cm)',
    draw(g, w, h, v) {
      const kt = num(v, 'kt', WHEEL.kt / 1000) * 1000, p = cornerOf(), r1 = cornerResp({ input: 'load' }), fr = plotFrame(g, w, h, [0, T_CORNER], [-6.5, 0.5], 'time (s)', 'z (cm)');
      curve(g, fr, r1.t, r1.y, col.a(), 2.2);
      if (on(v, 'wheel')) { const r2 = wheelLoadStep(-1000, p, WHEEL.mu, kt, T_CORNER, 5e-4); curve(g, fr, r2.t, r2.y.map((q) => q * 100), col.b(), 2, [6, 4]); }
      legend(g, fr, [{ label: 'body only (massless wheel, rigid tyre)', color: col.a() }, ...(on(v, 'wheel') ? [{ label: `with 40 kg wheel, tyre ${f(kt / 1000, 0)} kN/m`, color: col.b(), dash: true }] : [])], 'br');
    },
  },
  {
    id: 'poles', title: 'All the poles: body pair near the origin, wheel hop far left', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v) {
      const kt = num(v, 'kt', 200) * 1000, p = cornerOf(), body = roots([p.m, p.c, p.k]);
      const all = on(v, 'wheel') ? roots(charPoly(wheelA(p, WHEEL.mu, kt))) : body, hop = all.filter((q) => Math.abs(q.im) > 20 || q.re < -15);
      const fr = drawSPlane(g, w, h, { range: 90, reCenter: -40, poles: all, marks: on(v, 'wheel') ? body.map((s) => ({ s, shape: 'ring' as const, color: col.muted() })) : [] });
      if (hop.length) { const q = hop.find((x) => x.im > 0) ?? hop[0], wn = Math.hypot(q.re, q.im); const slow = all.filter((x) => !hop.includes(x)), sb = slow.find((x) => x.im > 0) ?? slow[0] ?? body[0]; // divide by the body pair WITH the wheel (numbers.py [R3]: 20.4/1.60 = 12.8×)
        para(g, `wheel hop |p| = ${f(wn, 1)} rad/s (${f(wn / 2 / Math.PI, 1)} Hz): decays ${f(q.re / sb.re, 1)}× faster than the body`, fr.box.l + 4, (fr.box.t + fr.box.b) / 2 - 34, (fr.box.r - fr.box.l) * 0.42, col.b(), 10); }
      else para(g, 'one mass: just the body pair −2 ± j7.75', fr.box.l + 4, fr.box.t + 10, fr.box.r - fr.box.l - 8, col.a(), 10);
    },
  },
] as FigurePanel[]);

/* ── LOOP · figure:loop (the corner is already a loop) ── */
export const loopPanels = (): FigurePanel[] => [
  {
    id: 'diagram', title: 'The corner redrawn as a feedback loop', x: 'block diagram', y: '',
    draw(g, w, h, v) {
      g.clearRect(0, 0, w, h); const stage = num(v, 'stage', 1), road = str(v, 'input', 'road') === 'road', p = cornerParams(v);
      if (stage < 1) { drawCorner(g, w * 0.25, 4, w * 0.5, h - 8, { road: road ? 0.05 : 0, actuator: !road, scale: (h - 8) * 2.2 }); text(g, road ? 'road w pushes through k and c' : 'actuator force u on the body', w / 2, h - 6, col.muted(), 'center', 10); return; }
      if (road) drawLoop(g, 4, 6, w - 8, h - 12, { input: 'road w', output: 'z', blocks: [{ label: `cs + k (${f(p.c / 1000, 1)}s + ${f(p.k / 1000, 1)}) kN`, color: col.b(), hi: true }, { label: `1/(ms²), m = ${f(p.m, 0)}`, color: col.a() }], feedback: true });
      else drawLoop(g, 4, 6, w - 8, h - 12, { input: 'force u', output: 'z', blocks: [{ label: `1/(ms²), m = ${f(p.m, 0)}`, color: col.a() }], feedback: { label: 'cs + k', color: col.b(), hi: true } });
      para(g, road ? 'Σ compares road and body: (w − z). The spring and shock push on that gap; the body integrates twice.' : 'u enters the sum; the spring and shock feed −(cs + k)z back.', 8, h - 22, w - 16, col.muted(), 10);
    },
  },
  {
    id: 'step', title: 'What the loop does: z(t)', x: 'time (s)', y: 'z (cm)',
    draw(g, w, h, v) {
      const road = str(v, 'input', 'road') === 'road', p = cornerParams(v), t = lin(0, T_CORNER, 601), G: TF = road ? cornerGw(p) : cornerGu(p);
      const y = step(G, t).y.map((q) => (road ? 5 * q : 1000 * 100 * q)), fr = plotFrame(g, w, h, [0, T_CORNER], range([y], 0.1, 0), 'time (s)', 'z (cm)');
      hline(g, fr, road ? 5 : 100000 / p.k, [0, T_CORNER], road ? 'road 5 cm' : `1 kN / k = ${f(100000 / p.k, 2)} cm`); curve(g, fr, t, y, col.a(), 2.4);
      text(g, road ? 'T = (cs + k)/(ms² + cs + k)' : 'z/u = 1/(ms² + cs + k)', fr.box.l + 6, fr.box.b - 10, col.muted(), 'left', 10);
    },
  },
];
export const loopFigure = figureOf(loopPanels);

/* ── STATE · figure:states ── */
export const statesPanels = (): FigurePanel[] => [
  {
    id: 'phase', title: 'State plane: height z vs vertical speed ż', x: 'z (cm)', y: 'ż (m/s)',
    draw(g, w, h, v) {
      const p = cornerParams(v), z0 = num(v, 'z0', 5), v0 = num(v, 'v0', 0), A = cornerA(p), t = lin(0, 4, 801);
      const zf = cornerRelease(z0 / 100, v0, p), zs = t.map(zf), dz = t.map((tt, i) => (i ? (zs[i] - zs[i - 1]) / (t[1] - t[0]) : v0));
      const fr = plotFrame(g, w, h, [-6, 6], [-0.7, 0.7], 'z (cm)', 'ż (m/s)'); tline(g, fr, [-6, 0], [6, 0], col.grid(), 1); tline(g, fr, [0, -0.7], [0, 0.7], col.grid(), 1);
      curve(g, fr, zs.map((q) => q * 100), dz, col.a(), 2.2); dot(g, fr, [z0, v0], col.e(), 5); dot(g, fr, [0, 0], col.ok(), 3);
      const ev = roots(charPoly(A)); para(g, `A = [[0, 1], [${f(A[1][0], 0)}, ${f(A[1][1], 1)}]]  eigenvalues ${f(ev[0].re)} ± j${f(Math.abs(ev[0].im))}`, fr.box.l + 4, fr.box.t + 10, fr.box.r - fr.box.l - 8, col.muted(), 10);
      text(g, 'start', fr.X(z0) + 6, fr.Y(v0) - 8, col.e(), 'left', 10);
    },
  },
  {
    id: 'z', title: 'The same motion in time', x: 'time (s)', y: 'z (cm)',
    draw(g, w, h, v) {
      const p = cornerParams(v), z0 = num(v, 'z0', 5), v0 = num(v, 'v0', 0), t = lin(0, 4, 801), zf = cornerRelease(z0 / 100, v0, p), y = t.map((tt) => zf(tt) * 100);
      const fr = plotFrame(g, w, h, [0, 4], range([y], 0.1, -1, 1), 'time (s)', 'z (cm)'); tline(g, fr, [0, 0], [4, 0], col.strong(), 1); curve(g, fr, t, y, col.a(), 2.4);
      text(g, 'ẋ = Ax: the state (z, ż) now fixes the whole future', fr.box.l + 6, fr.box.b - 10, col.muted(), 'left', 10);
    },
  },
];
export const statesFigure = figureOf(statesPanels);

/* ── CC · figure:cc ── */
type CcCase = { B: number[]; AB: number[]; Cr: number[]; CA: number[]; name: string; xl: string; yl: string };
function ccCase(v: V): CcCase {
  const which = str(v, 'plant', 'corner');
  if (which === 'corner') { const p = cornerOf(), A = cornerA(p); return { name: 'corner', B: [0, 1 / p.m], AB: [1 / p.m, A[1][1] / p.m], Cr: [1, 0], CA: [0, 1], xl: 'height z', yl: 'speed ż' }; }
  const a = -1.2, c = 1, A = [[a, c], [c, a]], Bv = which === 'two' ? [1, 1] : [1, 0], Cr = which === 'avg' ? [0.5, 0.5] : [0, 1];
  return { name: which, B: Bv, AB: [A[0][0] * Bv[0] + A[0][1] * Bv[1], A[1][0] * Bv[0] + A[1][1] * Bv[1]], Cr, CA: [Cr[0] * A[0][0] + Cr[1] * A[1][0], Cr[0] * A[0][1] + Cr[1] * A[1][1]], xl: 'living x₁', yl: 'bedroom x₂' };
}
export const ccFigure = figureOf(() => [
  {
    id: 'vec', title: 'Directions the input can push the state: B and AB', x: 'state 1', y: 'state 2',
    draw(g, w, h, v) {
      const k = ccCase(v), nrm = (u: number[]) => { const m = Math.hypot(u[0], u[1]) || 1; return [u[0] / m, u[1] / m]; }, b1 = nrm(k.B), b2 = nrm(k.AB);
      const fr = plotFrame(g, w, h, [-1.3, 1.3], [-1.3, 1.3], k.xl, k.yl, 40); tline(g, fr, [-1.3, 0], [1.3, 0], col.grid(), 1); tline(g, fr, [0, -1.3], [0, 1.3], col.grid(), 1);
      const ar = (d: number[], color: string, lab: string) => { tline(g, fr, [0, 0], [d[0], d[1]], color, 2.6); dot(g, fr, [d[0], d[1]], color, 4); text(g, lab, fr.X(d[0]) + 6, fr.Y(d[1]) - 8, color, 'left', 10.5); };
      ar(b1, col.a(), 'B'); ar(b2, col.b(), 'AB');
      const dc = k.B[0] * k.AB[1] - k.B[1] * k.AB[0], dob = k.Cr[0] * k.CA[1] - k.Cr[1] * k.CA[0];
      para(g, `det Pc = ${Math.abs(dc) < 1e-12 ? '0: B and AB in line, NOT controllable' : `${dc.toExponential(2)}: controllable`}`, fr.box.l + 4, fr.box.b - 24, fr.box.r - fr.box.l - 8, Math.abs(dc) < 1e-12 ? col.bad() : col.ok(), 10);
      para(g, `det Po = ${Math.abs(dob) < 1e-12 ? '0: NOT observable' : `${f(dob, 2)}: observable`}`, fr.box.l + 4, fr.box.b - 10, fr.box.r - fr.box.l - 8, Math.abs(dob) < 1e-12 ? col.bad() : col.ok(), 10);
    },
  },
  {
    id: 'resp', title: 'What the input does to each state', x: 'time', y: 'state',
    draw(g, w, h, v) {
      const k = ccCase(v);
      if (k.name === 'corner') { const p = cornerOf(), t = lin(0, 3, 601), y = step(cornerGu(p), t).y.map((q) => 1000 * 100 * q), dz = y.map((q, i) => (i ? (q - y[i - 1]) / (t[1] - t[0]) / 100 : 0)); const fr = plotFrame(g, w, h, [0, 3], range([y, dz], 0.1), 'time (s)', 'cm, m/s'); curve(g, fr, t, y, col.a(), 2.2); curve(g, fr, t, dz, col.b(), 2, [6, 4]); legend(g, fr, [{ label: 'height z (cm), 1 kN up', color: col.a() }, { label: 'speed ż (m/s)', color: col.b(), dash: true }], 'br'); return; }
      const t = lin(0, 24, 481), a = -1.2, P = 2500 * 0.0036, Bv = k.B, x1: number[] = [], x2: number[] = []; let s1 = 0, s2 = 0; const dt = t[1] - t[0];
      for (let i = 0; i < t.length; i++) { x1.push(s1); x2.push(s2); for (let j = 0; j < 20; j++) { const d1 = a * s1 + s2 + P * Bv[0], d2 = s1 + a * s2 + P * Bv[1]; s1 += (dt / 20) * d1; s2 += (dt / 20) * d2; } }
      const fr = plotFrame(g, w, h, [0, 24], range([x1, x2], 0.08, 0), 'time (h)', 'K above outdoor'); curve(g, fr, t, x1, col.b(), 2.2); curve(g, fr, t, x2, col.a(), 2.2, k.name === 'two' ? [6, 4] : []);
      legend(g, fr, [{ label: 'living room x₁', color: col.b() }, { label: k.name === 'two' ? 'bedroom x₂ (same curve: they move together)' : 'bedroom x₂', color: col.a(), dash: k.name === 'two' }], 'br');
    },
  },
] as FigurePanel[]);

/* ── SF · figure:sf (+ ACK) ── */
const sfTarget = (v: V) => ({ s: num(v, 'sigma', 8), wd: num(v, 'wd', 6) });
export function sfRun(v: V) {
  const { s, wd } = sfTarget(v), p = cornerOf(), K = acker(cornerA(p), cornerB(p), [C(-s, wd), C(-s, -wd)]), bump = str(v, 'input', 'bump') === 'bump';
  if (bump) { const a = cornerBump(K, CORNER_DESIGN.bump.h, CORNER_DESIGN.bump.dur, 2, 2e-4), pz = cornerBump(null, CORNER_DESIGN.bump.h, CORNER_DESIGN.bump.dur, 2, 2e-4); return { K, t: a.t, y: a.y.map((q) => q * 100), yp: pz.y.map((q) => q * 100), u: a.u, accA: Math.max(...a.acc.map(Math.abs)), accP: Math.max(...pz.acc.map(Math.abs)), bump }; }
  const t = lin(0, 2, 801), Ga = tf([1 / p.m], [1, (p.c + K[1]) / p.m, (p.k + K[0]) / p.m]), y = step(Ga, t).y.map((q) => -1000 * 100 * q), yp = step(cornerGu(p), t).y.map((q) => -1000 * 100 * q);
  const u = y.map((q, i) => -(K[0] * q / 100 + K[1] * (i ? (q - y[i - 1]) / 100 / (t[1] - t[0]) : 0)));
  return { K, t, y, yp, u, accA: NaN, accP: NaN, bump };
}
export const sfFigure = figureOf((c) => [
  {
    id: 'plane', title: 'Pick the closed-loop poles (drag); K follows', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v) {
      const { s, wd } = sfTarget(v), r = sfRun(v), p = cornerOf();
      const fr = drawSPlane(g, w, h, { range: 14, reCenter: -6, poles: [C(-s, wd), C(-s, -wd)], labels: true, handles: [C(-s, wd)], marks: roots([p.m, p.c, p.k]).map((q) => ({ s: q, shape: 'ring' as const, color: col.muted(), label: q.im > 0 ? 'passive' : undefined })) });
      let y = fr.box.t + 10; const mw = fr.box.r - fr.box.l - 8;
      y = para(g, `K = [k₁, k₂] = [${k3(r.K[0])} N/m, ${k3(r.K[1])} N·s/m]: extra spring, extra shock`, fr.box.l + 4, y, mw, col.text(), 10);
      if (on(v, 'ack')) { const a1 = 2 * s, a0 = s * s + wd * wd; para(g, `Ackermann: want s² + ${f(a1, 1)}s + ${f(a0, 1)}; have s² + 4s + 64 ⇒ k₁ = m(${f(a0, 1)} − 64), k₂ = m(${f(a1, 1)} − 4)`, fr.box.l + 4, y + 2, mw, col.e(), 10); }
    },
    pointer: splaneDrag({ range: 14, reCenter: -6, upperOnly: true, handles: () => { const t = sfTarget(c.values); return [{ id: 'p', s: C(-t.s, t.wd) }]; }, onDrag: (_id, s) => { c.set('sigma', Math.round(Math.max(1, Math.min(16, -s.re)) * 2) / 2); c.set('wd', Math.round(Math.max(0, Math.min(14, s.im)) * 2) / 2); } }),
  },
  {
    id: 'resp', title: 'Body height: active vs passive', x: 'time (s)', y: 'z (cm)',
    draw(g, w, h, v) {
      const r = sfRun(v), T = r.t[r.t.length - 1], fr = plotFrame(g, w, h, [0, T], range([r.y, on(v, 'ghost') ? r.yp : r.y], 0.1, 0), 'time (s)', 'z (cm)');
      tline(g, fr, [0, 0], [T, 0], col.strong(), 1); if (on(v, 'ghost')) curve(g, fr, r.t, r.yp, col.muted(), 1.8, [6, 4]); curve(g, fr, r.t, r.y, col.a(), 2.4);
      const uPk = Math.max(...r.u.map(Math.abs));
      legend(g, fr, [{ label: 'active, u = −Kx', color: col.a() }, ...(on(v, 'ghost') ? [{ label: 'passive', color: col.muted(), dash: true }] : []), { label: r.bump ? `peak accel ${f(r.accA, 2)} m/s² (passive ${f(r.accP, 2)}); peak force ${k3(uPk)} N` : `peak actuator force ${k3(uPk)} N`, color: col.muted() }], 'br');
    },
  },
] as FigurePanel[]);

/* ── OBS · figure:obs ── */
export function obsRun(v: V) {
  const speed = num(v, 'speed', 5), e0 = num(v, 'e0', 1) / 100, noise = on(v, 'noise'), p = cornerOf(), A = cornerA(p), K = cornerK(), L = cornerL(speed), dt = 1e-4, T = 1.5, n = Math.round(T / dt);
  let x = [0, 0], xh = [e0, 0], seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  const t: number[] = [], z: number[] = [], zh: number[] = [], vz: number[] = [], vh: number[] = []; let nz = 0;
  for (let i = 0; i < n; i++) {
    if (i % 10 === 0) nz = noise ? 0.002 * rnd() * 2 : 0; // ±2 mm sensor noise, held 1 ms
    const u = -(K[0] * x[0] + K[1] * x[1]) - 1000, y = x[0] + nz, inn = y - xh[0];
    const xn = [x[0] + dt * x[1], x[1] + dt * (A[1][0] * x[0] + A[1][1] * x[1] + u / p.m)];
    xh = [xh[0] + dt * (xh[1] + L[0] * inn), xh[1] + dt * (A[1][0] * xh[0] + A[1][1] * xh[1] + u / p.m + L[1] * inn)]; x = xn;
    if (i % 20 === 0) { t.push(i * dt); z.push(x[0] * 100); zh.push(xh[0] * 100); vz.push(x[1]); vh.push(xh[1]); }
  }
  return { t, z, zh, vz, vh, L, speed };
}
export const obsFigure = figureOf(() => [
  {
    id: 'z', title: 'Height: real body vs the observer\'s estimate', x: 'time (s)', y: 'z (cm)',
    draw(g, w, h, v) {
      const r = obsRun(v), fr = plotFrame(g, w, h, [0, 1.5], range([r.z, r.zh], 0.1), 'time (s)', 'z (cm)'); curve(g, fr, r.t, r.z, col.a(), 2.4); curve(g, fr, r.t, r.zh, col.b(), 2, [6, 4]);
      legend(g, fr, [{ label: 'real body z (measured)', color: col.a() }, { label: 'estimate ẑ', color: col.b(), dash: true }, { label: `L = [${k3(r.L[0])}, ${k3(r.L[1])}] (×${r.speed} the controller poles)`, color: col.muted() }], 'br');
    },
  },
  {
    id: 'v', title: 'Speed: never measured, only estimated', x: 'time (s)', y: 'ż (m/s)',
    draw(g, w, h, v) {
      const r = obsRun(v), fr = plotFrame(g, w, h, [0, 1.5], range([r.vz, r.vh], 0.1), 'time (s)', 'ż (m/s)'); tline(g, fr, [0, 0], [1.5, 0], col.strong(), 1); curve(g, fr, r.t, r.vz, col.a(), 2.4); curve(g, fr, r.t, r.vh, col.b(), 1.8, [6, 4]);
      legend(g, fr, [{ label: 'real ż', color: col.a() }, { label: 'estimate (built from z alone)', color: col.b(), dash: true }], 'br');
    },
  },
] as FigurePanel[]);

/* ── SEP · figure:sep ── */
export const sepFigure = figureOf(() => [
  {
    id: 'step', title: '+2 cm ride height: true-state vs estimate feedback', x: 'time (s)', y: 'z (cm)',
    draw(g, w, h, v) {
      const r = cornerSep(num(v, 'e0', 1) / 100, CORNER_DESIGN.rideStep, num(v, 'speed', 5), 1.5, 5e-5), y = r.y.map((q) => q * 100), yf = r.yf.map((q) => q * 100);
      const fr = plotFrame(g, w, h, [0, 1.5], range([y, yf], 0.1, 0), 'time (s)', 'z (cm)'); fillBetween(g, fr, r.t, y, 'rgba(255,170,60,.22)', 0); // difference shading drawn below
      g.clearRect(0, 0, 0, 0); curve(g, fr, r.t, yf, col.a(), 2.4); curve(g, fr, r.t, y, col.b(), 2, [6, 4]);
      legend(g, fr, [{ label: 'feedback on true state', color: col.a() }, { label: 'feedback on estimate', color: col.b(), dash: true }, { label: `max gap ${f(r.dmax * 100, 3)} cm at ${f(r.tmax, 3)} s`, color: col.muted() }], 'br');
    },
  },
  {
    id: 'poles', title: 'Four closed-loop poles: controller pair + observer pair', x: 'σ (1/s)', y: 'jω (rad/s)',
    draw(g, w, h, v) {
      const sp = num(v, 'speed', 5), ctl = [C(-8, 6), C(-8, -6)], obs = ctl.map((q) => C(q.re * sp, q.im * sp));
      const fr = drawSPlane(g, w, h, { range: Math.max(20, 9 * sp), reCenter: -4 * sp, poles: [...ctl, ...obs], labels: true });
      para(g, 'separation: the observer adds its own two poles, the controller\'s stay put', fr.box.l + 4, fr.box.b - 12, fr.box.r - fr.box.l - 8, col.muted(), 10);
    },
  },
] as FigurePanel[]);

/* ── REF · figure:refin ── */
export function refRun(v: V) {
  const r = num(v, 'r', 2) / 100, kErr = num(v, 'kerr', 0) / 100, p = cornerOf(), K = cornerK(), N = cornerNbar(K), useN = v.nbar === undefined ? true : on(v, 'nbar'), kr = p.k * (1 + kErr), t = lin(0, 1.5, 751);
  // with N̄: u = −Kx + N̄r; without: u = −k₁(z − r) − k₂ż (feedback on the height error only)
  const g0 = useN ? N : K[0], G = tf([g0 / p.m], [1, (p.c + K[1]) / p.m, (kr + K[0]) / p.m]), y = step(G, t).y.map((q) => q * r);
  const u = y.map((q, i) => g0 * r - K[0] * q - K[1] * (i ? (q - y[i - 1]) / (t[1] - t[0]) : 0));
  return { t, y: y.map((q) => q * 100), u, final: (100 * g0 * r) / (kr + K[0]), rr: r * 100, N, useN };
}
export const refinFigure = figureOf(() => [
  {
    id: 'z', title: 'Ride height command r and the body', x: 'time (s)', y: 'z (cm)',
    draw(g, w, h, v) {
      const r = refRun(v), fr = plotFrame(g, w, h, [0, 1.5], [0, Math.max(0.5, r.rr * 1.25)], 'time (s)', 'z (cm)'); hline(g, fr, r.rr, [0, 1.5], `command r = ${f(r.rr, 1)} cm`, col.e()); curve(g, fr, r.t, r.y, col.a(), 2.4);
      text(g, r.rr > 0 ? `ends at ${f(r.final, 3)} cm (${f((100 * r.final) / r.rr, 1)} % of r)` : 'no command', fr.box.l + 6, fr.box.b - 10, col.a(), 'left', 10.5);
    },
  },
  {
    id: 'u', title: 'Actuator force', x: 'time (s)', y: 'u (N)',
    draw(g, w, h, v) {
      const r = refRun(v), fr = plotFrame(g, w, h, [0, 1.5], range([r.u], 0.1, 0), 'time (s)', 'u (N)'); curve(g, fr, r.t, r.u, col.d(), 2.2);
      legend(g, fr, [{ label: r.useN ? `u = −Kx + N̄r, N̄ = ${k3(r.N)} N/m: starts ${k3(r.u[0])} N, holds ${k3(r.u[r.u.length - 1])} N` : `u = −k₁(z − r) − k₂ż: starts ${k3(r.u[0])} N`, color: col.d() }], 'tr');
    },
  },
] as FigurePanel[]);
void lsim; void polyRoots; void pctOS; void cornerL;

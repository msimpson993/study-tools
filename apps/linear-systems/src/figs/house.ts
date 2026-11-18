/** Live figures on the two-room house: x = (T₁, T₂) in K above outdoors, t in hours, heater power in kW. */
import { figureOf, planeFrame, gridT, spanLine, arrow, dot, cross, polyline, text, tline, axes2, wipe, curve, col, linspace, lerpM, IDENT, deg, type V2 } from '@study/core';
import { houseA, houseEig, houseExpm, toModal, heaterB, mulMV, cayley, expm2, eigs, thermostatA, KP_UNSTABLE, ctrb, obsv, modeWeights, gramian, inv, symEig, reachCost, leastEnergyU, simHouse, HB, type M2 } from './ex';
import { num, fmt, graph, note } from './util';

const A_of = (v: Record<string, number | string | boolean>) => houseA(num(v, 'kw'), num(v, 'leak'));
const EV: [V2, V2] = [[Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2]];

/* ───────────── eig: the house matrix as a transformation of the (T₁, T₂) plane ───────────── */
export const eigFigure = figureOf((c) => {
  const A = () => A_of(c.values);
  const side = (th: number, M: M2) => { const v: V2 = [Math.cos(th), Math.sin(th)], a = mulMV(M, v); return v[0] * a[1] - v[1] * a[0]; };
  return [
    {
      id: 'plane', title: 'Where A sends the plane of room temperatures', x: 'T₁ (K above outdoors)', y: 'T₂ (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const M = lerpM(IDENT, A(), num(c.values, 't')), f = planeFrame(w, h, 3);
        gridT(g, f, IDENT, 6, col.grid(), 1, 1, 0.6); gridT(g, f, M, 6, col.accent(), 1, 1, 0.55); axes2(g, f, 'T₁', 'T₂');
        const { avg, diff } = houseEig(num(c.values, 'kw'), num(c.values, 'leak'));
        spanLine(g, f, EV[0], col.c(), 1.8); spanLine(g, f, EV[1], col.b(), 1.8);
        note(g, `average mode (1, 1): λ = ${fmt(avg)}`, f.box.r - 4, f.box.t + 10, col.c(), 'right', 10);
        note(g, `difference mode (1, −1): λ = ${fmt(diff)}`, f.box.r - 4, f.box.t + 24, col.b(), 'right', 10);
        const th = deg(num(c.values, 'th')), v: V2 = [2 * Math.cos(th), 2 * Math.sin(th)], Av = mulMV(M, v);
        arrow(g, f, [0, 0], v, col.a(), 2.5, 'v'); arrow(g, f, [0, 0], Av, col.e(), 2.5, 'Av');
      },
    },
    {
      id: 'turn', title: 'How far Av is pushed off v’s line, for every direction of v', x: 'direction of v (°)', y: 'v × Av (sideways part)',
      draw(g, w, h) {
        wipe(g, w, h);
        const M = lerpM(IDENT, A(), num(c.values, 't')), ths = linspace(0, 180, 361), ys = ths.map((d) => side(deg(d), M));
        const top = Math.max(0.5, ...ys.map(Math.abs)) * 1.15, f = graph(g, w, h, [0, 180], [-top, top], 'direction of v (°)', 'sideways part of Av', 45);
        tline(g, f, [45, -top], [45, top], col.c(), 1.5, [6, 4]); tline(g, f, [135, -top], [135, top], col.b(), 1.5, [6, 4]);
        curve(g, f, ths, ys, col.accent(), 2.5);
        const d0 = ((num(c.values, 'th') % 180) + 180) % 180; dot(g, f, [d0, side(deg(d0), M)], col.a(), 5);
        note(g, 'zero only on the dashed eigen-directions', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
      },
    },
  ];
});

/* ───────────── diag: in mode coordinates A is just Λ ───────────── */
export const diagFigure = figureOf((c) => {
  const probe = (): V2 => { const p = deg(num(c.values, 'phi')); return [3 * Math.cos(p), 3 * Math.sin(p)]; };
  return [
    {
      id: 'x', title: 'Room temperatures x = (T₁, T₂) and Ax', x: 'T₁ (K)', y: 'T₂ (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const A = A_of(c.values), f = planeFrame(w, h, 4.2), x = probe(), Ax = mulMV(A, x), xi = toModal(x);
        gridT(g, f, [[1, 1], [1, -1]], 6, col.grid(), 1, 1, 0.8); axes2(g, f, 'T₁', 'T₂');
        spanLine(g, f, [1, 1], col.c(), 1.5); spanLine(g, f, [1, -1], col.b(), 1.5);
        const leg: V2 = [xi[0], xi[0]]; polyline(g, f, [[0, 0], leg, x], col.c(), 2, [5, 3]); polyline(g, f, [leg, x], col.b(), 2, [5, 3]);
        arrow(g, f, [0, 0], x, col.a(), 2.5, 'x'); arrow(g, f, [0, 0], Ax, col.e(), 2.5, 'Ax');
        note(g, `x = ${fmt(xi[0], 1)}·(1, 1) + ${fmt(xi[1], 1)}·(1, −1)`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
      },
    },
    {
      id: 'xi', title: 'Same vector in mode coordinates ξ = (average, half-difference): Λξ', x: 'ξ₁ = (T₁ + T₂)/2 (K)', y: 'ξ₂ = (T₁ − T₂)/2 (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const { avg, diff } = houseEig(num(c.values, 'kw'), num(c.values, 'leak')), f = planeFrame(w, h, 4.2), xi = toModal(probe()), L: V2 = [avg * xi[0], diff * xi[1]];
        gridT(g, f, IDENT, 6, col.grid(), 1, 1, 0.8); axes2(g, f, 'ξ₁', 'ξ₂');
        polyline(g, f, [[0, 0], [xi[0], 0], xi], col.c(), 2, [5, 3]); polyline(g, f, [[xi[0], 0], xi], col.b(), 2, [5, 3]);
        arrow(g, f, [0, 0], xi, col.a(), 2.5, 'ξ'); arrow(g, f, [0, 0], L, col.e(), 2.5, 'Λξ');
        note(g, `Λ = diag(${fmt(avg)}, ${fmt(diff)}): each leg scaled on its own`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
      },
    },
  ];
});

/* ───────────── expm: x(t) = e^(At)x(0) and its modes ───────────── */
export const expmFigure = figureOf((c) => {
  const run = () => {
    const kw = num(c.values, 'kw'), leak = num(c.values, 'leak'), x0: V2 = [num(c.values, 'x1'), num(c.values, 'x2')], T = num(c.values, 'tmax'), ts = linspace(0, T, 241);
    const xs = ts.map((t) => mulMV(houseExpm(t, kw, leak), x0)), xi = ts.map((t, i) => toModal(xs[i]));
    return { ts, xs, xi, T, x0, ...houseEig(kw, leak) };
  };
  const yr = (vals: number[]): [number, number] => { const lo = Math.min(0, ...vals), hi = Math.max(1, ...vals), p = (hi - lo) * 0.08; return [lo - p, hi + p]; };
  return [
    {
      id: 'x', title: 'Room temperatures x(t) = e^(At) x(0)', x: 'time t (h)', y: 'T₁, T₂ (K above outdoors)',
      draw(g, w, h) {
        wipe(g, w, h);
        const r = run(), f = graph(g, w, h, [0, r.T], yr(r.xs.flat()), 'time t (h)', 'K above outdoors');
        curve(g, f, r.ts, r.xs.map((x) => x[0]), col.a(), 2.5); curve(g, f, r.ts, r.xs.map((x) => x[1]), col.b(), 2.5);
        if (r.T >= 1) { tline(g, f, [1, f.iy(f.box.t)], [1, f.iy(f.box.b)], col.muted(), 1, [4, 3]); note(g, `1 h: gap down to ${fmt(100 * Math.exp(r.diff), 0)}%`, f.X(1) + 4, f.box.t + 10, col.muted(), 'left', 10); }
      },
    },
    {
      id: 'xi', title: 'Modal coordinates ξ = (average, half-difference): pure exponentials', x: 'time t (h)', y: 'ξ₁, ξ₂ (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const r = run(), f = graph(g, w, h, [0, r.T], yr(r.xi.flat()), 'time t (h)', 'mode coordinate (K)');
        curve(g, f, r.ts, r.xi.map((x) => x[0]), col.c(), 2.5, [6, 4]); curve(g, f, r.ts, r.xi.map((x) => x[1]), col.d(), 2.5, [6, 4]);
        note(g, `ξ₁ ∝ e^(${fmt(r.avg)}t), τ = ${fmt(-1 / r.avg, 1)} h · ξ₂ ∝ e^(${fmt(r.diff)}t), τ = ${fmt(-60 / r.diff, 0)} min`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 10);
      },
    },
  ];
});

/* ───────────── flow: the phase plane of the house ───────────── */
export const flowFigure = figureOf((c) => {
  const traj = () => { const A = houseA(), x0: V2 = [num(c.values, 'x1'), num(c.values, 'x2')], ts = linspace(0, 6, 241); return { A, ts, xs: ts.map((t) => mulMV(houseExpm(t), x0)) }; };
  return [
    {
      id: 'plane', title: 'Every state flows along ẋ = Ax: fast onto the diagonal, then slowly to 0', x: 'T₁ (K)', y: 'T₂ (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const { A, ts, xs } = traj(), f = planeFrame(w, h, 7, 4, 4), t = num(c.values, 't');
        axes2(g, f, 'T₁', 'T₂'); spanLine(g, f, [1, 1], col.c(), 1.5); spanLine(g, f, [1, -1], col.b(), 1.5);
        g.globalAlpha = 0.5; for (let x = -2; x <= 11; x += 1.5) for (let y = -2; y <= 11; y += 1.5) { const d = mulMV(A, [x, y]), n = Math.hypot(...d) || 1; arrow(g, f, [x, y], [x + (0.6 * d[0]) / n, y + (0.6 * d[1]) / n], col.muted(), 1); } g.globalAlpha = 1;
        const k = Math.min(ts.length - 1, Math.round((t / 6) * (ts.length - 1)));
        polyline(g, f, xs, col.muted(), 1.5, [4, 3]); polyline(g, f, xs.slice(0, k + 1), col.a(), 2.5); dot(g, f, xs[k], col.e(), 6);
        note(g, `t = ${fmt(t, 1)} h: (${fmt(xs[k][0], 1)}, ${fmt(xs[k][1], 1)}) K`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
      },
    },
    {
      id: 'time', title: 'The same motion against time', x: 'time t (h)', y: 'K above outdoors',
      draw(g, w, h) {
        wipe(g, w, h);
        const { ts, xs } = traj(), all = xs.flat(), f = graph(g, w, h, [0, 6], [Math.min(0, ...all) - 0.5, Math.max(1, ...all) + 0.5], 'time t (h)', 'K above outdoors'), t = num(c.values, 't');
        curve(g, f, ts, xs.map((x) => x[0]), col.a(), 2.5); curve(g, f, ts, xs.map((x) => x[1]), col.b(), 2.5);
        tline(g, f, [t, f.iy(f.box.t)], [t, f.iy(f.box.b)], col.e(), 1.5, [4, 3]);
      },
    },
  ];
});

/* ───────────── cayley: e^(At) = α₀(t) I + α₁(t) A ───────────── */
export const cayleyFigure = figureOf((c) => {
  return [
    {
      id: 'alpha', title: 'The two coefficients α₀(t) and α₁(t)', x: 'time t (h)', y: 'α₀, α₁',
      draw(g, w, h) {
        wipe(g, w, h);
        const A = A_of(c.values), t = num(c.values, 't'), ts = linspace(0, 6, 241), al = ts.map((s) => cayley(A, s));
        const all = al.flatMap((a) => [a.a0, a.a1]), f = graph(g, w, h, [0, 6], [Math.min(-0.1, ...all) - 0.05, Math.max(1, ...all) + 0.08], 'time t (h)', 'coefficient');
        curve(g, f, ts, al.map((a) => a.a0), col.a(), 2.5); curve(g, f, ts, al.map((a) => a.a1), col.b(), 2.5);
        const a = cayley(A, t); dot(g, f, [t, a.a0], col.a(), 5); dot(g, f, [t, a.a1], col.b(), 5);
        note(g, `t = ${fmt(t, 2)} h: α₀ = ${fmt(a.a0, 3)}, α₁ = ${fmt(a.a1, 3)}`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 11);
      },
    },
    {
      id: 'check', title: 'α₀I + α₁A rebuilds e^(At) exactly', x: 'matrix entry', y: 'value',
      draw(g, w, h) {
        wipe(g, w, h);
        const kw = num(c.values, 'kw'), leak = num(c.values, 'leak'), A = houseA(kw, leak), t = num(c.values, 't'), P = expm2(A, t), Q = houseExpm(t, kw, leak), a = cayley(A, t);
        const cx = w / 2, cy = h / 2 - 6, dx = Math.min(130, w / 4), dy = 30;
        note(g, `α₀I + α₁A = ${fmt(a.a0, 3)}·I + ${fmt(a.a1, 3)}·A`, cx, 16, col.text(), 'center', 12);
        for (const i of [0, 1]) for (const j of [0, 1]) { const x = cx + (j - 0.5) * dx, y = cy + (i - 0.5) * dy * 1.6; note(g, fmt(P[i][j], 4), x, y, col.a(), 'center', 15); note(g, `modes: ${fmt(Q[i][j], 4)}`, x, y + 15, col.muted(), 'center', 10); }
        g.strokeStyle = col.strong(); g.lineWidth = 1.5; for (const s of [-1, 1]) { const x = cx + s * dx * 1.05; g.beginPath(); g.moveTo(x - s * 6, cy - dy * 1.4); g.lineTo(x, cy - dy * 1.4); g.lineTo(x, cy + dy * 1.4); g.lineTo(x - s * 6, cy + dy * 1.4); g.stroke(); }
        note(g, `e^(At) at t = ${fmt(t, 2)} h (blue: Cayley–Hamilton; grey: ½[[e₁+e₂, e₁−e₂], …])`, cx, h - 12, col.muted(), 'center', 10);
      },
    },
  ];
});

/* ───────────── stab: thermostat feedback u = −kp·T₁ ───────────── */
export const stabFigure = figureOf((c) => {
  return [
    {
      id: 'poles', title: 'Eigenvalues of the loop A − B·kp·C as the gain changes', x: 'Re λ (1/h)', y: 'Im λ (1/h)',
      draw(g, w, h) {
        wipe(g, w, h);
        const kp = num(c.values, 'kp'), f = planeFrame(w, h, 3.2, -1.6, 0, 8, false);
        g.fillStyle = 'rgba(255,90,90,.10)'; g.fillRect(f.X(0), f.box.t, f.box.r - f.X(0), f.box.b - f.box.t);
        axes2(g, f, 'Re λ', 'Im λ');
        for (const k of linspace(-0.5, 1, 61)) for (const l of eigs(thermostatA(k))) dot(g, f, [Math.max(-4.7, l[0]), l[1]], col.muted(), 1.6);
        for (const l of eigs(thermostatA(kp))) cross(g, f, [Math.max(-4.7, l[0]), l[1]], l[0] > 0 ? col.bad() : col.a(), 7);
        const ls = eigs(thermostatA(kp)).map((l) => fmt(l[0])).join(', ');
        note(g, `kp = ${fmt(kp)} kW/K → λ = ${ls} /h`, f.box.l + 4, f.box.t + 10, col.text(), 'left', 11);
        note(g, `unstable below kp = ${fmt(KP_UNSTABLE, 3)} (heater wired backwards)`, f.box.l + 4, f.box.b - 6, col.bad(), 'left', 10);
      },
    },
    {
      id: 'resp', title: 'Room temperatures after a 2 K upset in room 1', x: 'time t (h)', y: 'deviation (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const kp = num(c.values, 'kp'), ts = linspace(0, 6, 241), Acl = thermostatA(kp), xs = ts.map((t) => mulMV(expm2(Acl, t), [2, 0]));
        const f = graph(g, w, h, [0, 6], [-1, 6], 'time t (h)', 'deviation from setpoint (K)');
        curve(g, f, ts, xs.map((x) => x[0]), col.a(), 2.5); curve(g, f, ts, xs.map((x) => x[1]), col.b(), 2.5);
        const lmax = Math.max(...eigs(Acl).map((l) => l[0])), T = 0.25;
        note(g, lmax < 0 ? `stable: sampled every 15 min, |e^(λT)| = ${fmt(Math.exp(lmax * T), 3)} < 1` : `unstable: |e^(λT)| = ${fmt(Math.exp(lmax * T), 3)} > 1 at T = 15 min`, f.box.r - 4, f.box.t + 10, lmax < 0 ? col.ok() : col.bad(), 'right', 10);
      },
    },
  ];
});

/* ───────────── ctrl: which way can the heater push the rooms? ───────────── */
export const ctrlFigure = figureOf((c) => {
  return [
    {
      id: 'plane', title: 'B and AB: the directions one heater can push (K/h per kW)', x: 'T₁ (K)', y: 'T₂ (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = num(c.values, 'split'), { B, AB, det } = ctrb(s), f = planeFrame(w, h, 5.5);
        axes2(g, f, 'T₁', 'T₂'); spanLine(g, f, [1, 1], col.c(), 1.2); spanLine(g, f, [1, -1], col.b(), 1.2);
        const run = simHouse(houseA(), heaterB(s), () => 1, [0, 0], 3, 120); polyline(g, f, run.x, col.d(), 2);
        note(g, '1 kW for 3 h', f.X(run.x[120][0]) + 6, f.Y(run.x[120][1]), col.d(), 'left', 10);
        arrow(g, f, [0, 0], B, col.a(), 2.5, 'B'); arrow(g, f, [0, 0], AB, col.e(), 2.5, 'AB');
        note(g, `det [B, AB] = ${fmt(det, 2)}  →  ${Math.abs(det) > 1e-6 ? 'rank 2: every (T₁, T₂) reachable' : 'rank 1: only the diagonal'}`, f.box.l + 4, f.box.b - 6, Math.abs(det) > 1e-6 ? col.ok() : col.bad(), 'left', 11);
      },
    },
    {
      id: 'pbh', title: 'PBH test: how hard the heater pushes each mode', x: 'heater share in room 1', y: 'push on the mode (K/h per kW)',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = num(c.values, 'split'), ss = linspace(0, 1, 101), f = graph(g, w, h, [0, 1], [-2.2, 4], 'heater share in room 1, s', 'push on the mode', 0.25, 1);
        curve(g, f, ss, ss.map((q) => modeWeights(q, 1).bAvg), col.c(), 2.5); curve(g, f, ss, ss.map((q) => modeWeights(q, 1).bDiff), col.b(), 2.5);
        const m = modeWeights(s, 1); dot(g, f, [s, m.bAvg], col.c(), 5); dot(g, f, [s, m.bDiff], col.b(), 5);
        note(g, `average: ${fmt(m.bAvg, 2)} · difference: ${fmt(m.bDiff, 2)}${Math.abs(m.bDiff) < 1e-6 ? ' → the λ = −2.2 mode is uncontrollable' : ''}`, f.box.r - 4, f.box.t + 10, Math.abs(m.bDiff) < 1e-6 ? col.bad() : col.text(), 'right', 10);
      },
    },
  ];
});

/* ───────────── obs: what one thermostat reading can tell apart ───────────── */
export const obsFigure = figureOf((c) => {
  const XA: V2 = [8, 2], XB: V2 = [2, 8];
  return [
    {
      id: 'y', title: 'Sensor reading y(t) for two different starting states', x: 'time t (h)', y: 'y = c·T₁ + (1 − c)·T₂ (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const cc = num(c.values, 'c'), ts = linspace(0, 4, 201), y = (x0: V2) => ts.map((t) => { const x = mulMV(houseExpm(t), x0); return cc * x[0] + (1 - cc) * x[1]; });
        const f = graph(g, w, h, [0, 4], [0, 9], 'time t (h)', 'sensor reading y (K)');
        curve(g, f, ts, y(XA), col.a(), 2.5); curve(g, f, ts, y(XB), col.b(), 2.5, [7, 4]);
        const o = obsv(cc);
        note(g, Math.abs(o.det) > 1e-6 ? `det [C; CA] = ${fmt(o.det, 2)}: the readings differ, so x(0) can be recovered` : 'det [C; CA] = 0: identical readings, x(0) cannot be recovered', f.box.r - 4, f.box.t + 10, Math.abs(o.det) > 1e-6 ? col.ok() : col.bad(), 'right', 10);
      },
    },
    {
      id: 'plane', title: 'Starting states and the direction the sensor is blind to', x: 'T₁ (K)', y: 'T₂ (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const cc = num(c.values, 'c'), f = planeFrame(w, h, 5.5, 4, 4), o = obsv(cc);
        axes2(g, f, 'T₁', 'T₂'); spanLine(g, f, [1, 1], col.c(), 1.2); spanLine(g, f, [1, -1], col.b(), 1.2, [6, 4], [5, 5]);
        dot(g, f, XA, col.a(), 6); note(g, 'x_a = (8, 2)', f.X(XA[0]) + 8, f.Y(XA[1]), col.a(), 'left', 11);
        dot(g, f, XB, col.b(), 6); note(g, 'x_b = (2, 8)', f.X(XB[0]) + 8, f.Y(XB[1]), col.b(), 'left', 11);
        arrow(g, f, [5, 5], [5 + 3 * o.C[0], 5 + 3 * o.C[1]], col.e(), 2.5, 'C');
        if (Math.abs(o.det) < 1e-6) note(g, 'C ⟂ (1, −1): the difference mode is unobservable', f.box.l + 4, f.box.b - 6, col.bad(), 'left', 11);
        else note(g, `sensor weights C = (${fmt(o.C[0], 2)}, ${fmt(o.C[1], 2)})`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
      },
    },
  ];
});

/* ───────────── kalman: which modes are reached and seen ───────────── */
export const kalmanFigure = figureOf((c) => {
  const mw = () => modeWeights(num(c.values, 'split'), num(c.values, 'c'));
  return [
    {
      id: 'wires', title: 'Heater → modes → sensor: a wire is live when its weight is not zero', x: 'signal flow', y: 'modes',
      draw(g, w, h) {
        wipe(g, w, h);
        const m = mw(), ux = 46, yx = w - 46, mx = w / 2, rows = [{ n: 'average mode, λ = −0.2', b: m.bAvg, cc: m.cAvg, y: h * 0.34 }, { n: 'difference mode, λ = −2.2', b: m.bDiff, cc: m.cDiff, y: h * 0.68 }];
        note(g, 'heater u', ux, h / 2, col.text(), 'center', 12); note(g, 'sensor y', yx, h / 2, col.text(), 'center', 12);
        for (const r of rows) {
          const lb = Math.abs(r.b) > 1e-6, lc = Math.abs(r.cc) > 1e-6, bw = Math.min(170, w * 0.42);
          g.lineWidth = lb ? 1 + Math.abs(r.b) : 1; g.strokeStyle = lb ? col.e() : col.muted(); g.setLineDash(lb ? [] : [4, 4]); g.beginPath(); g.moveTo(ux + 30, h / 2); g.lineTo(mx - bw / 2, r.y); g.stroke();
          g.lineWidth = lc ? 1 + 2 * Math.abs(r.cc) : 1; g.strokeStyle = lc ? col.e() : col.muted(); g.setLineDash(lc ? [] : [4, 4]); g.beginPath(); g.moveTo(mx + bw / 2, r.y); g.lineTo(yx - 30, h / 2); g.stroke(); g.setLineDash([]);
          const cls = lb && lc ? 'reached and seen' : lb ? 'reached, not seen' : lc ? 'seen, not reached' : 'neither';
          g.strokeStyle = lb && lc ? col.ok() : col.strong(); g.lineWidth = 2; g.strokeRect(mx - bw / 2, r.y - 17, bw, 34);
          note(g, r.n, mx, r.y - 5, col.text(), 'center', 11); note(g, cls, mx, r.y + 9, lb && lc ? col.ok() : col.muted(), 'center', 10);
        }
      },
    },
    {
      id: 'imp', title: 'Heater pulse response: only reached-and-seen modes reach y', x: 'time t (h)', y: 'y(t) (K per kWh)',
      draw(g, w, h) {
        wipe(g, w, h);
        const m = mw(), ts = linspace(0, 5, 201), ya = ts.map((t) => m.bAvg * m.cAvg * Math.exp(-0.2 * t)), yd = ts.map((t) => m.bDiff * m.cDiff * Math.exp(-2.2 * t));
        const f = graph(g, w, h, [0, 5], [-2, 4], 'time t (h)', 'y(t) (K per kWh)');
        curve(g, f, ts, ya, col.c(), 1.5, [5, 3]); curve(g, f, ts, yd, col.b(), 1.5, [5, 3]); curve(g, f, ts, ts.map((_, i) => ya[i] + yd[i]), col.text(), 3);
        const G = [m.bAvg * m.cAvg ? `${fmt(m.bAvg * m.cAvg, 2)}/(s + 0.2)` : '', m.bDiff * m.cDiff ? `${fmt(m.bDiff * m.cDiff, 2)}/(s + 2.2)` : ''].filter(Boolean).join(' + ') || '0';
        note(g, `G(s) = ${G}`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 11);
      },
    },
  ];
});

/* ───────────── gramian: what reaching a state costs ───────────── */
export const gramianFigure = figureOf((c) => {
  return [
    {
      id: 'ellipse', title: 'States reachable from rest with a given energy ∫u²dt', x: 'T₁ (K)', y: 'T₂ (K)',
      draw(g, w, h) {
        wipe(g, w, h);
        const T = num(c.values, 'T'), s = num(c.values, 'split'), W = gramian(T, s), f = planeFrame(w, h, 14, 4, 2), e = symEig(W);
        axes2(g, f, 'T₁', 'T₂');
        if (e.l[0] < 1e-6 * e.l[1]) { spanLine(g, f, e.v[1], col.bad(), 2, []); note(g, 'W is singular: only one direction can be reached', f.box.l + 4, f.box.b - 6, col.bad(), 'left', 11); return; }
        for (const [E, cl] of [[5, col.c()], [13.43, col.a()], [45, col.d()]] as [number, string][]) {
          const pts: V2[] = linspace(0, 2 * Math.PI, 121).map((a) => { const p = Math.sqrt(E * e.l[0]) * Math.cos(a), q = Math.sqrt(E * e.l[1]) * Math.sin(a); return [p * e.v[0][0] + q * e.v[1][0], p * e.v[0][1] + q * e.v[1][1]]; });
          polyline(g, f, pts, cl, 2); const top = pts.reduce((m, q) => (q[1] > m[1] ? q : m)); note(g, `${E} kW²·h`, f.X(top[0]), f.Y(top[1]) - 9, cl, 'center', 10);
        }
        spanLine(g, f, e.v[0], col.b(), 1.2); note(g, `thin axis (${fmt(Math.abs(e.v[0][0]), 2)}, −${fmt(Math.abs(e.v[0][1]), 2)}): expensive`, f.box.l + 4, f.box.t + 10, col.b(), 'left', 10);
        const cost = reachCost([10, 7], T, s); dot(g, f, [10, 7], col.e(), 6);
        note(g, `(10, 7) K costs ${fmt(cost, 2)} kW²·h in ${fmt(T, 1)} h`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
      },
    },
    {
      id: 'cost', title: 'Least energy to reach (10, 7) K, against the time allowed', x: 'time allowed T (h)', y: 'energy (kW²·h)',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = num(c.values, 'split'), T = num(c.values, 'T'), Ts = linspace(0.5, 8, 61), cs = Ts.map((q) => Math.min(200, reachCost([10, 7], q, s)));
        const f = graph(g, w, h, [0.5, 8], [0, 200], 'time allowed T (h)', 'energy (kW²·h)');
        curve(g, f, Ts, cs, col.a(), 2.5); dot(g, f, [T, Math.min(200, reachCost([10, 7], T, s))], col.e(), 5);
        note(g, 'holding (10, 7) afterwards is a separate, steady cost', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
      },
    },
  ];
});

/* ───────────── optimal: the least-energy heater profile ───────────── */
export const optimalFigure = figureOf((c) => {
  const plan = () => { const Tf = num(c.values, 'Tf'), d: V2 = [num(c.values, 'x1T'), num(c.values, 'x2T')], u = leastEnergyU(d, Tf), run = simHouse(houseA(), heaterB(1), u, [0, 0], Tf, 240); return { Tf, d, u, run }; };
  return [
    {
      id: 'u', title: 'Least-energy heater power u(t) = Bᵀe^(Aᵀ(T−t))W⁻¹x_T', x: 'time t (h)', y: 'heater power (kW)',
      draw(g, w, h) {
        wipe(g, w, h);
        const p = plan(), us = p.run.t.map(p.u), top = Math.max(3, ...us) * 1.1, f = graph(g, w, h, [0, p.Tf], [Math.min(0, ...us) - 0.2, top], 'time t (h)', 'heater power (kW)');
        tline(g, f, [0, 2.5], [p.Tf, 2.5], col.bad(), 1.5, [6, 4]); note(g, '2.5 kW heater', f.box.l + 4, f.Y(2.5) - 8, col.bad(), 'left', 10);
        curve(g, f, p.run.t, us, col.e(), 3);
        if (Math.min(...us) < 0) { tline(g, f, [0, 0], [p.Tf, 0], col.strong(), 1); note(g, 'negative = cooling; a heater can’t do this', f.box.r - 4, f.box.t + 24, col.bad(), 'right', 10); }
        let E = 0; for (let i = 1; i < us.length; i++) E += ((us[i] ** 2 + us[i - 1] ** 2) / 2) * (p.run.t[i] - p.run.t[i - 1]);
        note(g, `energy ∫u²dt = ${fmt(E, 2)} kW²·h · u(0) = ${fmt(us[0], 2)}, u(T) = ${fmt(us[us.length - 1], 2)} kW`, f.box.r - 4, f.box.b - 8, col.text(), 'right', 10);
      },
    },
    {
      id: 'x', title: 'The rooms land on the illustrative target at t = T', x: 'time t (h)', y: 'K above outdoors',
      draw(g, w, h) {
        wipe(g, w, h);
        const p = plan(), all = p.run.x.flat(), f = graph(g, w, h, [0, p.Tf], [Math.min(0, ...all) - 0.5, Math.max(12, ...all) + 0.5], 'time t (h)', 'K above outdoors');
        curve(g, f, p.run.t, p.run.x.map((x) => x[0]), col.a(), 2.5); curve(g, f, p.run.t, p.run.x.map((x) => x[1]), col.b(), 2.5);
        dot(g, f, [p.Tf, p.d[0]], col.a(), 7, true); dot(g, f, [p.Tf, p.d[1]], col.b(), 7, true);
        note(g, `circles: target (${fmt(p.d[0], 1)}, ${fmt(p.d[1], 1)}) K at ${fmt(p.Tf, 1)} h`, f.box.l + 4, f.box.t + 10, col.muted(), 'left', 10);
      },
    },
  ];
});
void inv; void HB; void expm2;

/** Box pop-up figures (one renderer per box, panels picked by params.panel) and the kept pid-tuning quiz scope. All numbers from ../model. */
import { rangeFrame, graphAxes, curve, tline, dot, text, col, drawSPlane, withLabelRole, type QuizFigureDef, type QuizFigureRegistry, type V2 } from '@study/core';
import { C, step, tf } from '@study/core/dsp';
import { HOUSE_WALLS, CORNER_DESIGN, DISH, DISH_TUNED } from '../model/params';
import { houseG2, houseColdFront, houseSC, cornerOf, cornerGu, cornerNumbers, cornerRelease, cornerBump, cornerSep, cornerK, roots, deg, metricsOf, dc, houseA, housePoly } from '../model/plants';
import { houseRun } from './house';
import { obsRun, refRun } from './corner';
import { dishPoles } from './dish';
import { dishSim } from '../model/plants';
import { drawHouse, drawCorner, drawDish, drawLoop } from './draw';
import { legend, lin, para, f, range, wrap } from './util';
import { quizFigures as pidQuiz } from './pidquiz';

type G = CanvasRenderingContext2D; type P = Record<string, unknown>;
const panel = (p: P) => String(p.panel ?? 'a');
const fr = (g: G, w: number, h: number, xr: V2, yr: V2, xl: string, yl: string) => { g.setLineDash([]); g.clearRect(0, 0, w, h); const F = rangeFrame(w, h, xr, yr, 36, 8, 8, 26); graphAxes(g, F, xr, yr, xl, yl); return F; };
/** a text panel: rows of wrapped text, shrunk (down to 7.5 px) until every row fits the canvas height, so nothing is cut off */
const lines = (g: G, w: number, rows: [string, string][], y0 = 16, size = 11) => {
  g.clearRect(0, 0, 9999, 9999);
  const H = g.canvas.height / (g.getTransform().d || 1), need = (z: number) => y0 * (z / size) + rows.reduce((a, [s]) => a + wrap(g, s, w - 16, z).length * (z + 3) + 5, 0) - z / 2;
  let z = size; while (z > 7.5 && need(z) > H - 2) z -= 0.25;
  let y = y0 * (z / size); for (const [s, c] of rows) y = para(g, s, 8, y, w - 16, c, z) + 5;
};
const mini = (draw: QuizFigureDef['draw'], aspect = 1.3, maxWidth = 300): QuizFigureDef => ({ aspect, maxWidth, draw });
const degs = (a: number[]) => a.map(deg);

const corner = cornerOf(), cn = cornerNumbers(corner);
const loadStep = (c: number, T = 3) => { const p = cornerOf({ c }), t = lin(0, T, 301); return { t, y: step(cornerGu(p), t).y.map((q) => -1000 * 100 * q) }; };

export const popFigures: QuizFigureRegistry = {
  ...pidQuiz,
  'hero-three': mini((g, w, h) => {
    g.clearRect(0, 0, w, h); const cw = w / 3;
    drawHouse(g, 4, 6, cw - 8, h * 0.62, { t1: 24.55, t2: 20.45, labels: false }); drawCorner(g, cw + 4, 4, cw - 8, h * 0.72, { labels: true }); drawDish(g, 2 * cw + 2, 0, cw - 4, h * 0.78, { theta: 0.3, ref: 0.5, labels: false });
    // each plant's name wraps inside its own third, so the three never run into each other
    const lab = (s: string, x: number) => { const ls = wrap(g, s, cw - 8, 10.5); ls.forEach((l, i) => withLabelRole('axis', () => text(g, l, x, h - 8 - (ls.length - 1 - i) * 12.5, col.text(), 'center', 10.5))); };
    lab('house: heater → temperatures', cw / 2); lab('car corner: force → height', cw * 1.5); lab('dish: torque → angle', cw * 2.5);
    g.save(); g.globalAlpha = 0.28; for (let i = 0; i < 3; i++) { const x = i * cw + 8, yy = h - 26; g.strokeStyle = col.muted(); g.setLineDash([4, 3]); g.strokeRect(x, yy - 6, cw - 16, 6); } g.restore();
  }, 2.6, 560),

  'pop-heatflow': mini((g, w, h, p) => {
    if (panel(p) === 'a') { g.clearRect(0, 0, w, h); const r = houseRun(2500, HOUSE_WALLS.Gin, HOUSE_WALLS.Gout); drawHouse(g, 6, 6, w - 12, h - 12, { t1: r.s1, t2: r.s2, flows: { heater: 2500, between: HOUSE_WALLS.Gin * (r.s1 - r.s2), leak1: HOUSE_WALLS.Gout * r.s1, leak2: HOUSE_WALLS.Gout * r.s2 } }); return; }
    lines(g, w, [['living room (heater in):', col.muted()], ['ẋ₁ = 0.0036u − 1(x₁ − x₂) − 0.2x₁', col.b()], ['bedroom:', col.muted()], ['ẋ₂ = 1(x₁ − x₂) − 0.2x₂', col.a()], ['0.0036u: heater · 1(x₁ − x₂): through the shared wall · 0.2x: leak outdoors (per hour)', col.muted()]], 18, 11);
  }),

  'pop-ode2tf': mini((g, w, _h, p) => {
    const k = panel(p);
    if (k === 'a') lines(g, w, [['two first-order balances', col.muted()], ['ẋ₁ = −1.2x₁ + x₂ + 0.0036u', col.b()], ['ẋ₂ = x₁ − 1.2x₂', col.a()]]);
    else if (k === 'b') lines(g, w, [['from the bedroom: x₁ = ẋ₂ + 1.2x₂', col.muted()], ['put it in the living-room line:', col.muted()], ['ẍ₂ + 2.4ẋ₂ + 0.44x₂ = 0.0036u', col.e()]]);
    else lines(g, w, [['Laplace from rest: d/dt → s', col.muted()], ['G₂(s) = X₂/U = 0.0036 / (s² + 2.4s + 0.44)', col.e()], ['2.4 and 0.44 come straight from the ODE; the 0.0036 is the heater term', col.muted()]]);
  }),

  'pop-housemodes': mini((g, w, h, p) => {
    if (panel(p) === 'a') { const F = drawSPlane(g, w, h, { range: 2.6, reCenter: -1.2, poles: [C(-0.2), C(-2.2)], labels: true, xLabel: 'σ (1/h)', yLabel: 'jω (rad/h)' }); text(g, 'both real: no ringing', F.box.l + 4, F.box.t + 10, col.muted(), 'left', 10); return; }
    const t = lin(0, 6, 241), F = fr(g, w, h, [0, 6], [-1.1, 1.1], 'time (h)', 'K'); tline(g, F, [0, 0], [6, 0], col.strong(), 1);
    curve(g, F, t, t.map((q) => Math.exp(-0.2 * q)), col.c(), 2.2); curve(g, F, t, t.map((q) => Math.exp(-2.2 * q)), col.b(), 2); curve(g, F, t, t.map((q) => -Math.exp(-2.2 * q)), col.a(), 2, [5, 3]);
    legend(g, F, [{ label: 'slow: both rooms together (τ 5 h)', color: col.c() }, { label: 'fast: room 1 ↓ …', color: col.b() }, { label: '… room 2 ↑ (27 min)', color: col.a(), dash: true }], 'br', 9.5);
  }),

  'pop-first': mini((g, w, h, p) => {
    const r = houseRun(2500, HOUSE_WALLS.Gin, HOUSE_WALLS.Gout, 24, 241), y1 = r.t.map((q) => 20.45 * (1 - Math.exp(-q / 5))), F = fr(g, w, h, [0, 24], [0, 23], 'time (h)', 'K');
    if (panel(p) === 'a') { curve(g, F, r.t, r.x2, col.a(), 2.4); curve(g, F, r.t, y1, col.b(), 2, [6, 4]); legend(g, F, [{ label: 'true house', color: col.a() }, { label: '20.45(1 − e^(−t/5))', color: col.b(), dash: true }], 'br', 9.5); return; }
    curve(g, F, r.t, y1, col.b(), 2.2); for (const [tt, lab] of [[5, '63 % at τ = 5 h'], [20, '98 % at 4τ']] as [number, string][]) { const yy = 20.45 * (1 - Math.exp(-tt / 5)); tline(g, F, [tt, 0], [tt, yy], col.e(), 1, [3, 3]); dot(g, F, [tt, yy], col.e(), 3.5); text(g, lab, F.X(tt) + (tt > 12 ? -4 : 4), F.Y(yy) + 12, col.e(), tt > 12 ? 'right' : 'left', 9.5); }
  }),

  'pop-zeta': mini((g, w, h, p) => {
    if (panel(p) === 'a') { const F = drawSPlane(g, w, h, { range: 10, reCenter: -3, poles: [C(-cn.sigma, cn.wd), C(-cn.sigma, -cn.wd)], labels: true, zetaRays: [0.25], wnCircles: [8] }); text(g, 'ωn = 8, ζ = cos θ = 0.25', F.box.l + 4, F.box.b - 10, col.muted(), 'left', 10); return; }
    const runs = [[0.25, col.a()], [0.7, col.c()], [1, col.b()]] as [number, string][], F = fr(g, w, h, [0, 2], [-6, 0.4], 'time (s)', 'z (cm)');
    for (const [z, c] of runs) { const r = loadStep(z * cn.cCrit, 2); curve(g, F, r.t, r.y, c, 2); }
    legend(g, F, runs.map(([z, c]) => ({ label: `ζ = ${z}`, color: c })), 'tr', 9.5);
  }),

  'pop-specs': mini((g, w, h) => {
    const r = loadStep(corner.c), fin = -100000 / corner.k, m = metricsOf(r.t, r.y.map((q) => q / fin), 1), F = fr(g, w, h, [0, 3], [-6, 0.4], 'time (s)', 'z (cm)');
    g.save(); g.fillStyle = 'rgba(110,226,110,.15)'; g.fillRect(F.box.l, F.Y(fin * 0.98), F.box.r - F.box.l, F.Y(fin * 1.02) - F.Y(fin * 0.98)); g.restore();
    curve(g, F, r.t, r.y, col.a(), 2.2); const pk = fin * (1 + m.OS / 100); dot(g, F, [m.Tp, pk], col.b(), 4);
    text(g, `${f(m.OS, 0)} % at Tp ${f(m.Tp)} s`, F.X(m.Tp) + 6, F.Y(pk) + 10, col.b(), 'left', 10); tline(g, F, [m.Ts, -6], [m.Ts, 0.4], col.ok(), 1, [3, 3]); text(g, `Ts ${f(m.Ts, 1)} s`, F.X(m.Ts) + 4, F.box.t + 10, col.ok(), 'left', 10);
  }, 1.6, 360),

  'pop-loopcorner': mini((g, w, h, p) => {
    g.clearRect(0, 0, w, h);
    if (panel(p) === 'a') drawLoop(g, 2, 8, w - 4, h - 16, { input: 'road w', output: 'z', blocks: [{ label: 'cs + k', color: col.b() }, { label: '1/(ms²)', color: col.a() }], feedback: true }, 10);
    else drawLoop(g, 2, 8, w - 4, h - 16, { input: 'w', output: 'z', sum: false, blocks: [{ label: '(cs + k)/(ms² + cs + k)', color: col.e(), hi: true }] }, 10);
  }, 1.6, 340),

  'pop-pgain': mini((g, w, h, p) => {
    if (panel(p) === 'a') {
      const Ks = lin(0, 1000, 120), up: ReturnType<typeof C>[] = [], dn: ReturnType<typeof C>[] = []; for (const K of Ks) { const r = roots([1, 2, K / DISH.J]); up.push(r[0]); dn.push(r[1]); }
      drawSPlane(g, w, h, { range: 12, reCenter: -1, locus: [up, dn], poles: roots([1, 2, 4]), labels: false, marks: [{ s: C(-1, 0), label: 'Kp = 10', color: col.e() }] }); return;
    }
    const F = fr(g, w, h, [0, 4], [0, 10.5], 'time (s)', 'θ (°)');
    for (const [K, c] of [[40, col.c()], [1000, col.b()]] as [number, string][]) { const s = dishSim({ Kp: K, T: 4, dt: 1e-3, every: 10 }); curve(g, F, s.t, degs(s.y), c, 2); }
    legend(g, F, [{ label: 'Kp 40: 16 %', color: col.c() }, { label: 'Kp 1000: 73 %', color: col.b() }], 'br', 9.5);
  }),

  'pop-wind': mini((g, w, h, p) => {
    if (panel(p) === 'a') { g.clearRect(0, 0, w, h); drawDish(g, 0, 0, w, h, { theta: -0.02 * 8, ref: 0, wind: true, torque: -1, scale: 1 }); text(g, 'held 1.15° off (drawn 8× larger)', w / 2, h - 6, col.muted(), 'center', 10); return; }
    const s = dishSim({ Kp: 1000, r: () => 0, d: (t) => (t >= 0.5 ? DISH.wind : 0), T: 5, dt: 1e-3, every: 10 }), F = fr(g, w, h, [0, 5], [-0.2, 2.2], 'time (s)', 'θ (°)');
    tline(g, F, [0, 1.146], [5, 1.146], col.muted(), 1, [5, 4]); curve(g, F, s.t, degs(s.y), col.a(), 2); text(g, 'settles 1.15° off', F.box.r - 4, F.Y(1.146) - 8, col.muted(), 'right', 10);
  }),

  'pop-int': mini((g, w, h, p) => {
    if (panel(p) === 'a') {
      const F = fr(g, w, h, [0, 10], [-0.2, 2.2], 'time (s)', 'θ (°)');
      for (const [Ki, c] of [[0, col.b()], [500, col.a()]] as [number, string][]) { const s = dishSim({ Kp: 1000, Ki, r: () => 0, d: (t) => (t >= 0.5 ? DISH.wind : 0), T: 10, dt: 1e-3, every: 10 }); curve(g, F, s.t, degs(s.y), c, 2); }
      legend(g, F, [{ label: 'P: stays 1.15° off', color: col.b() }, { label: 'PI (Ki 500): back to 0', color: col.a() }], 'tr', 9.5); return;
    }
    const F = fr(g, w, h, [0, 3], [0, 11], 'time (s)', 'θ (°)');
    for (const [Ki, c] of [[0, col.b()], [500, col.a()], [1000, col.d()]] as [number, string][]) { const s = dishSim({ Kp: 1000, Ki, T: 3, dt: 1e-3, every: 10 }); curve(g, F, s.t, degs(s.y), c, 1.8); }
    legend(g, F, [{ label: 'Ki 0: 73 %', color: col.b() }, { label: 'Ki 500: 80 %', color: col.a() }, { label: 'Ki 1000: 87 %', color: col.d() }], 'br', 9.5);
  }),

  'pop-der': mini((g, w, h, p) => {
    if (panel(p) === 'a') {
      const F = fr(g, w, h, [0, 1.5], [0, 10.5], 'time (s)', 'θ (°)'), runs = [[0, true, col.muted(), 'P: 73 %'], [120, false, col.b(), 'D on error: 15.6 %'], [120, true, col.a(), 'D on measurement: 4.6 %']] as [number, boolean, string, string][];
      for (const [Kd, dm, c] of runs) { const s = dishSim({ Kp: 1000, Kd, dm, T: 1.5, dt: 1e-4, every: 20 }); curve(g, F, s.t, degs(s.y), c, 2); }
      legend(g, F, runs.map((r) => ({ label: r[3], color: r[2] })), 'br', 9.5); return;
    }
    drawSPlane(g, w, h, { range: 12, reCenter: -4, poles: dishPoles(1000, 0, 120), labels: true, marks: dishPoles(1000, 0, 0).map((s) => ({ s, shape: 'ring' as const, color: col.muted() })), zetaRays: [0.1, 0.7] });
  }),

  'pop-tune': mini((g, w, h) => {
    const F = fr(g, w, h, [0, 2], [0, 7], 'time (s)', 'θ (°)'), b = DISH_TUNED, runs = [[b.Kp, b.Ki, b.Kd, col.muted(), '(2000, 1000, 200)', true], [4000, b.Ki, b.Kd, col.b(), 'Kp 4000: 14 %', false], [b.Kp, 3000, b.Kd, col.d(), 'Ki 3000: 17 %', false], [b.Kp, b.Ki, 400, col.c(), 'Kd 400: sluggish', false]] as [number, number, number, string, string, boolean][];
    for (const [Kp, Ki, Kd, c, , dash] of runs) { const s = dishSim({ Kp, Ki, Kd, T: 2, dt: 2e-4, every: 20 }); curve(g, F, s.t, degs(s.y), c, dash ? 1.6 : 2, dash ? [5, 3] : []); }
    legend(g, F, runs.map((r) => ({ label: r[4], color: r[3], dash: r[5] })), 'br', 9.5);
  }, 1.6, 360),

  'pop-coldfront': mini((g, w, h, p) => {
    if (panel(p) === 'a') { g.clearRect(0, 0, w, h); drawHouse(g, 4, 4, w - 8, h * 0.62, { t1: 24, t2: 20, thermostat: true, labels: false }); drawLoop(g, 2, h * 0.66, w - 4, h * 0.34, { input: 'set point', output: 'bedroom', blocks: [{ label: 'thermostat', color: col.e() }, { label: 'house', color: col.a() }], feedback: true }, 9.5); return; }
    const F = fr(g, w, h, [0, 24], [-5.4, 0.4], 'time (h)', 'K'), runs = [[0, 0, col.muted(), 'open loop: −5 K'], [1100, 0, col.b(), 'P: −0.5 K'], [1100, 200, col.a(), 'PI: back to 0']] as [number, number, string, string][];
    for (const [Kp, Ki, c] of runs) { const r = houseColdFront(Kp, Ki, -5, 24, 2e-3); const tt = r.t.filter((_, i) => i % 40 === 0), yy = Array.from(r.y).filter((_, i) => i % 40 === 0); curve(g, F, tt, yy, c, 2); }
    legend(g, F, runs.map((r) => ({ label: r[3], color: r[2] })), 'br', 9.5);
  }),

  'pop-sens': mini((g, w, h) => {
    const t = lin(0, 24, 241), A0 = houseA(), A1 = houseA(HOUSE_WALLS.Gin, HOUSE_WALLS.Gout * 1.2), g0 = dc(houseG2(A0)), F = fr(g, w, h, [0, 24], [0, 1.15], 'time (h)', 'rise / nominal');
    const ol = (A: number[][]) => step(houseG2(A), t).y.map((q) => q / g0), pl = (A: number[][]) => { const G = houseG2(A), p = housePoly(A), k = G.num[0] * 1100; const T0 = (1100 * g0) / (1 + 1100 * g0); return step(tf([k], [p[0], p[1], p[2] + k]), t).y.map((q) => q / T0); };
    curve(g, F, t, ol(A0), col.muted(), 1.8); curve(g, F, t, ol(A1), col.muted(), 1.8, [5, 3]); curve(g, F, t, pl(A0), col.a(), 2); curve(g, F, t, pl(A1), col.a(), 2, [5, 3]);
    legend(g, F, [{ label: 'open loop: leak +20 % → −18 %', color: col.muted() }, { label: 'P thermostat: −2.2 %', color: col.a() }, { label: 'dashed: leakier walls', color: col.text(), dash: true }], 'br', 9.5);
  }, 1.5, 340),

  'pop-sc': mini((g, w, h, p) => {
    if (panel(p) === 'a') {
      const ws = lin(-2, 1.5, 200), S = ws.map((e) => houseSC(1100, 10 ** e).S), Cm = ws.map((e) => houseSC(1100, 10 ** e).C), F = fr(g, w, h, [-2, 1.5], [0, 1.4], 'log₁₀ ω (rad/h)', '|S|, |C|');
      curve(g, F, ws, S, col.c(), 2); curve(g, F, ws, Cm, col.d(), 2); legend(g, F, [{ label: '|S| rejects', color: col.c() }, { label: '|C| passes', color: col.d() }], 'tl', 9.5); return;
    }
    const F = fr(g, w, h, [0, 12], [-1.2, 0.3], 'time (h)', 'room (K)'), t = lin(0, 12, 241), k = houseG2().num[0], pp = housePoly();
    const P = step(tf([k * 1100], [1, pp[1], pp[2] + k * 1100]), t).y.map((q) => -q), PI = step(tf([k * 1100, k * 200], [1, pp[1], pp[2] + k * 1100, k * 200]), t).y.map((q) => -q);
    tline(g, F, [0, 0], [12, 0], col.strong(), 1); curve(g, F, t, P, col.b(), 2); curve(g, F, t, PI, col.a(), 2);
    legend(g, F, [{ label: 'P: 0.9 K cold', color: col.b() }, { label: 'PI: the full 1 K cold', color: col.a() }], 'tr', 9.5);
  }),

  'pop-states': mini((g, w, h, p) => {
    if (panel(p) === 'a') {
      g.clearRect(0, 0, w, h); drawLoop(g, 2, 6, w - 4, h * 0.6, { input: 'u/m', output: 'z', blocks: [{ label: '∫ → ż', color: col.b() }, { label: '∫ → z', color: col.a() }], feedback: { label: '−4ż − 64z', color: col.c() } }, 10);
      para(g, 'spring −k/m = −64, shock −c/m = −4 feed back to the acceleration', 8, h * 0.78, w - 16, col.muted(), 10); return;
    }
    const t = lin(0, 4, 401), z = cornerRelease(0.05), zs = t.map((q) => z(q) * 100), vs = zs.map((q, i) => (i ? (q - zs[i - 1]) / 100 / (t[1] - t[0]) : 0));
    const F = fr(g, w, h, [-6, 6], [-0.5, 0.5], 'z (cm)', 'ż (m/s)'); curve(g, F, zs, vs, col.a(), 2); dot(g, F, [5, 0], col.e(), 4); dot(g, F, [0, 0], col.ok(), 3);
  }),

  'pop-cc': mini((g, w, h, p) => {
    if (panel(p) === 'a') {
      const F = fr(g, w, h, [-1.2, 1.2], [-1.2, 1.2], 'height z', 'speed ż'); const B = [0, 1], AB = [1, -corner.c / corner.m], m = Math.hypot(AB[0], AB[1]);
      tline(g, F, [0, 0], [B[0], B[1]], col.a(), 2.4); text(g, 'B', F.X(0) + 6, F.Y(1) + 4, col.a(), 'left', 11); tline(g, F, [0, 0], [AB[0] / m, AB[1] / m], col.b(), 2.4); text(g, 'AB', F.X(AB[0] / m) - 4, F.Y(AB[1] / m) - 10, col.b(), 'right', 11); return;
    }
    const t = lin(0, 24, 241), y = t.map((q) => (2 * 2500 * 0.0036 / 0.2) * (1 - Math.exp(-0.2 * q)) / 2), F = fr(g, w, h, [0, 24], [0, 50], 'time (h)', 'K');
    curve(g, F, t, y, col.b(), 2.4); curve(g, F, t, y, col.a(), 1.6, [5, 3]); legend(g, F, [{ label: 'both rooms: the same curve', color: col.a(), dash: true }], 'br', 9.5);
  }),

  'pop-sf': mini((g, w, h, p) => {
    if (panel(p) === 'a') { drawSPlane(g, w, h, { range: 11, reCenter: -4, poles: [C(-8, 6), C(-8, -6)], labels: true, marks: roots([corner.m, corner.c, corner.k]).map((s) => ({ s, shape: 'ring' as const, color: col.muted(), label: s.im > 0 ? 'passive' : undefined })) }); return; }
    const a = cornerBump(cornerK(), CORNER_DESIGN.bump.h, CORNER_DESIGN.bump.dur, 2, 2e-4), ps = cornerBump(null, CORNER_DESIGN.bump.h, CORNER_DESIGN.bump.dur, 2, 2e-4), ev = (x: number[]) => x.filter((_, i) => i % 20 === 0), tt = ev(a.t);
    const F = fr(g, w, h, [0, 2], [-2, 4.3], 'time (s)', 'z (cm)'); curve(g, F, tt, ev(ps.y).map((q) => q * 100), col.muted(), 1.8, [5, 3]); curve(g, F, tt, ev(a.y).map((q) => q * 100), col.a(), 2.2);
    legend(g, F, [{ label: 'passive: 3.9 cm, rings', color: col.muted(), dash: true }, { label: 'active: 1.9 cm', color: col.a() }], 'tr', 9.5);
  }),

  'pop-obs': mini((g, w, h) => {
    const r = obsRun({ speed: 5, e0: 1 }), F = fr(g, w, h, [0, 0.6], range([r.z, r.zh].map((a) => a.slice(0, Math.round(a.length * 0.4))), 0.1), 'time (s)', 'z (cm)'), n = Math.round(r.t.length * 0.4);
    curve(g, F, r.t.slice(0, n), r.z.slice(0, n), col.a(), 2.2); curve(g, F, r.t.slice(0, n), r.zh.slice(0, n), col.b(), 2, [5, 3]); legend(g, F, [{ label: 'real body', color: col.a() }, { label: 'ghost estimate', color: col.b(), dash: true }], 'tr', 9.5);
  }, 1.6, 360),

  'pop-sep': mini((g, w, h) => {
    const r = cornerSep(0.01, CORNER_DESIGN.rideStep, 5, 1, 5e-5), F = fr(g, w, h, [0, 1], [0, 2.6], 'time (s)', 'z (cm)');
    g.save(); g.fillStyle = 'rgba(255,170,60,.3)'; g.beginPath(); r.t.forEach((t, i) => (i ? g.lineTo(F.X(t), F.Y(r.y[i] * 100)) : g.moveTo(F.X(t), F.Y(r.y[i] * 100)))); for (let i = r.t.length - 1; i >= 0; i--) g.lineTo(F.X(r.t[i]), F.Y(r.yf[i] * 100)); g.closePath(); g.fill(); g.restore();
    curve(g, F, r.t, r.yf.map((q) => q * 100), col.a(), 2.2); curve(g, F, r.t, r.y.map((q) => q * 100), col.b(), 2, [5, 3]);
    legend(g, F, [{ label: 'true-state feedback', color: col.a() }, { label: 'estimate feedback', color: col.b(), dash: true }], 'br', 9.5);
  }, 1.6, 360),

  'pop-ref': mini((g, w, h) => {
    const a = refRun({ r: 2, nbar: true }), b = refRun({ r: 2, nbar: false }), F = fr(g, w, h, [0, 1.5], [0, 2.5], 'time (s)', 'z (cm)');
    tline(g, F, [0, 2], [1.5, 2], col.e(), 1, [5, 4]); curve(g, F, a.t, a.y, col.a(), 2.2); curve(g, F, b.t, b.y, col.muted(), 1.8, [5, 3]);
    legend(g, F, [{ label: 'with N̄: arrives at 2 cm', color: col.a() }, { label: `without N̄: stops at ${f(b.final, 2)} cm`, color: col.muted(), dash: true }], 'br', 9.5);
  }, 1.6, 360),
};

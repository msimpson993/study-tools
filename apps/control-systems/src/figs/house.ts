/** House figures (series 0, 3): the core HOUSE model, time in hours. All numbers from ../model. */
import { figureOf, drawSPlane, drawHeightMap, drawJwSlice, splaneDrag, curve, tline, dot, text, col, fillBetween, type FigurePanel } from '@study/core';
import { C, tf, lsim, step, tfEval, cmul, cadd, cdiv, polyMul, polyAdd, type TF, type Cx } from '@study/core/dsp';
import { HOUSE, HOUSE_WALLS, THERMOSTAT } from '../model/params';
import { b, houseA, housePoly, houseG1, houseG2, houseSteadyAt, houseColdFront, houseSC, houseG2mag, dc, cornerGu, deltaQ, roots } from '../model/plants';
import { type V, num, str, on, f, legend, plotFrame, hline, range, lin, para } from './util';
import { drawHouse } from './draw';

/** Response from rest of A = [[−a, c], [c, −a]] to a constant heater u (W) in room 1: closed form through the two modes. */
export function houseRun(u: number, Gin: number, Gout: number, T = 24, n = 241) {
  const A = houseA(Gin, Gout), a = -A[0][0], c = A[0][1], [s1, s2] = houseSteadyAt(u, A), pa = -(a - c), pd = -(a + c);
  const t = lin(0, T, n), avg = (s1 + s2) / 2, dif = (s1 - s2) / 2;
  const x1 = t.map((tt) => avg * (1 - Math.exp(pa * tt)) + dif * (1 - Math.exp(pd * tt))), x2 = t.map((tt) => avg * (1 - Math.exp(pa * tt)) - dif * (1 - Math.exp(pd * tt)));
  return { t, x1, x2, s1, s2, A, pa, pd };
}

/* ── MODEL · figure:house ── */
export const housePanels = (): FigurePanel[] => [
  {
    id: 'house', title: 'The two rooms and their heat flows (steady state)', x: 'picture', y: 'heat flow (W)',
    draw(g, w, h, v) {
      g.clearRect(0, 0, w, h);
      const u = num(v, 'u', 2500), Gin = num(v, 'Gin', HOUSE_WALLS.Gin), Gout = num(v, 'Gout', HOUSE_WALLS.Gout), r = houseRun(u, Gin, Gout), To = num(v, 'Tout', 5);
      const flows = { heater: u, between: Gin * (r.s1 - r.s2), leak1: Gout * r.s1, leak2: Gout * r.s2 };
      const hx = Math.min(w * 0.12, 40), hw = w - 2 * hx, hh = Math.min(h - 70, hw * 0.55);
      drawHouse(g, hx, 8, hw, hh, { t1: r.s1, t2: r.s2, flows, stored: on(v, 'store') ? [r.s1 / 30, r.s2 / 30] : undefined });
      let y = 8 + hh + 14;
      y = para(g, `heater ${f(u, 0)} W → living room;  ${f(flows.between, 0)} W through the inner wall;  leaks ${f(flows.leak1, 0)} W + ${f(flows.leak2, 0)} W outdoors`, 6, y, w - 12, col.text(), 10);
      para(g, `At ${f(To, 0)} °C outside: living ${f(To + r.s1, 1)} °C, bedroom ${f(To + r.s2, 1)} °C${on(v, 'store') ? ' · bars: heat stored in each room (C_th × rise)' : ''}`, 6, y + 2, w - 12, col.muted(), 10);
    },
  },
  {
    id: 'temps', title: 'Room temperatures over a day, heater on from cold', x: 'time (h)', y: 'temperature above outdoor (K)',
    draw(g, w, h, v) {
      const u = num(v, 'u', 2500), r = houseRun(u, num(v, 'Gin', HOUSE_WALLS.Gin), num(v, 'Gout', HOUSE_WALLS.Gout)), yr = range([r.x1, r.x2], 0.1, 0, 5);
      const fr = plotFrame(g, w, h, [0, 24], [0, yr[1]], 'time (h)', 'K above outdoor');
      curve(g, fr, r.t, r.x1, col.b(), 2.2); curve(g, fr, r.t, r.x2, col.a(), 2.4);
      legend(g, fr, [{ label: `living room x₁ → ${f(r.s1)} K`, color: col.b() }, { label: `bedroom x₂ → ${f(r.s2)} K`, color: col.a() }], 'br');
      const A = r.A; text(g, `ẋ₁ = ${f(A[0][0])}x₁ + ${f(A[0][1])}x₂ + 0.0036u   ẋ₂ = ${f(A[1][0])}x₁ ${f(A[1][1])}x₂`, fr.box.l + 4, fr.box.t + 8, col.muted(), 'left', 9.5);
    },
  },
];
export const houseFigure = figureOf(housePanels);

/* ── TF · figure:tfbuild ── */
const TFSTEPS = [
  ['Two heat balances (each first order):', 'ẋ₁ = −1.2x₁ + x₂ + 0.0036u', 'ẋ₂ = x₁ − 1.2x₂'],
  ['Laplace, from rest (d/dt → s):', 'sX₁ = −1.2X₁ + X₂ + 0.0036U', 'sX₂ = X₁ − 1.2X₂  ⇒  X₁ = (s + 1.2)X₂'],
  ['Eliminate X₁: one second-order equation', '(s + 1.2)²X₂ − X₂ = 0.0036U', 's²X₂ + 2.4sX₂ + 0.44X₂ = 0.0036U'],
  ['The fraction G(s) = output / input:', 'G₂(s) = X₂/U = 0.0036/(s² + 2.4s + 0.44)', 'G₁(s) = X₁/U = 0.0036(s + 1.2)/(s² + 2.4s + 0.44)'],
];
export const tfbuildFigure = figureOf(() => [
  {
    id: 'eqs', title: 'From the ODEs to one fraction, step by step', x: 'step', y: 'equations',
    draw(g, w, h, v) {
      g.clearRect(0, 0, w, h); const k = Math.max(1, Math.min(4, Math.round(num(v, 'step', 4)))); let y = 14;
      for (let i = 0; i < k; i++) { const s = TFSTEPS[i], cur = i === k - 1; y = para(g, `${i + 1}. ${s[0]}`, 8, y, w - 16, cur ? col.e() : col.muted(), 10.5); for (const l of s.slice(1)) y = para(g, l, 22, y, w - 30, cur ? col.text() : col.muted(), 11); y += 4; }
      if (k === 4) para(g, str(v, 'out', 'bed') === 'bed' ? 'Bedroom: DC gain G₂(0) = 0.0036/0.44 = 8.18 K per kW, no zero.' : 'Living room: DC gain G₁(0) = 9.82 K per kW, zero at −1.2 (heat arrives directly).', 8, y, w - 16, col.ok(), 10.5);
    },
  },
  {
    id: 'step', title: 'What the fraction predicts: 2.5 kW from cold', x: 'time (h)', y: 'rise above outdoor (K)',
    draw(g, w, h, v) {
      const G = str(v, 'out', 'bed') === 'bed' ? houseG2() : houseG1(), r = step(G, 24, 400), y = r.y.map((q) => q * 2500), K = dc(G) * 2500;
      const fr = plotFrame(g, w, h, [0, 24], [0, Math.max(26, K * 1.1)], 'time (h)', 'K above outdoor');
      hline(g, fr, K, [0, 24], `final = G(0) × 2.5 kW = ${f(K)} K`); curve(g, fr, r.t, y, str(v, 'out', 'bed') === 'bed' ? col.a() : col.b(), 2.4);
    },
  },
] as FigurePanel[]);

/* ── POLES · figure:splane ── */
const sp = (v: V) => { const slow = num(v, 'slow', -0.2), fast = num(v, 'fast', -2.2), wi = num(v, 'w', 0); return { slow, fast, wi }; };
function splaneResp(v: V) {
  const { slow, fast, wi } = sp(v), F = 20.45, t = lin(0, 24, 481);
  if (wi > 1e-6) { // "what if": the slow pole becomes a complex pair σ ± jω (no house can do this); same final value
    const q = slow * slow + wi * wi, den = polyMul([1, -2 * slow, q], [1, -fast]), r = step(tf([F * q * -fast], den), t);
    return { t, y: r.y, m1: null as number[] | null, m2: null as number[] | null, F };
  }
  const r1 = (F * fast) / (slow - fast), r2 = (F * slow) / (fast - slow);
  return { t, y: t.map((tt) => F + r1 * Math.exp(slow * tt) + r2 * Math.exp(fast * tt)), m1: t.map((tt) => r1 * Math.exp(slow * tt)), m2: t.map((tt) => r2 * Math.exp(fast * tt)), F };
}
export const splaneFigure = figureOf((c) => [
  {
    id: 'plane', title: 'The poles on the s-plane (drag them)', x: 'σ (1/h)', y: 'jω (rad/h)',
    draw(g, w, h, v) {
      const { slow, fast, wi } = sp(v), poles: Cx[] = wi > 1e-6 ? [C(slow, wi), C(slow, -wi), C(fast, 0)] : [C(slow, 0), C(fast, 0)];
      const fr = drawSPlane(g, w, h, { range: 2.6, reCenter: -1.6, poles, labels: true, handles: [C(slow, wi), C(fast, 0)], marks: [{ s: C(-0.2, 0), shape: 'ring', color: col.muted() }, { s: C(-2.2, 0), shape: 'ring', color: col.muted() }] });
      para(g, wi > 1e-6 ? 'Off the axis: this "house" would ring. No arrangement of rooms and walls can do that.' : `slow ${f(slow)} /h (τ = ${f(-1 / slow, 1)} h) · fast ${f(fast)} /h (${f(-60 / fast, 0)} min) · grey rings: the real house`, fr.box.l + 4, fr.box.t + 10, fr.box.r - fr.box.l - 8, wi > 1e-6 ? col.bad() : col.text(), 10);
    },
    pointer: splaneDrag({ range: 2.6, reCenter: -1.6, handles: () => { const { slow, fast, wi } = sp(c.values); return [{ id: 'slow', s: C(slow, wi) }, { id: 'fast', s: C(fast, 0) }]; }, realOnly: ['fast'], upperOnly: true, onDrag: (id, s) => { if (id === 'fast') c.set('fast', Math.max(-4, Math.min(-0.5, s.re))); else { c.set('slow', Math.max(-1, Math.min(-0.05, s.re))); c.set('w', Math.max(0, Math.min(1.5, Math.abs(s.im)))); } } }),
  },
  {
    id: 'resp', title: 'Bedroom after 2.5 kW, and the motion of each pole', x: 'time (h)', y: 'rise (K)',
    draw(g, w, h, v) {
      const r = splaneResp(v), show = on(v, 'modes') && r.m1, yr = range(show ? [r.y, r.m1!, r.m2!] : [r.y], 0.08, 0, 22);
      const fr = plotFrame(g, w, h, [0, 24], yr, 'time (h)', 'K'); tline(g, fr, [0, 0], [24, 0], col.strong(), 1);
      if (show) { curve(g, fr, r.t, r.m1!, col.c(), 1.6, [5, 3]); curve(g, fr, r.t, r.m2!, col.d(), 1.6, [5, 3]); }
      curve(g, fr, r.t, r.y, col.a(), 2.4);
      legend(g, fr, [{ label: 'bedroom (sum)', color: col.a() }, ...(show ? [{ label: 'slow mode: both rooms together', color: col.c(), dash: true }, { label: 'fast mode: rooms even out', color: col.d(), dash: true }] : [])], 'br');
    },
  },
] as FigurePanel[]);

/* ── FIRST · figure:first (house stand-in) ── */
export const firstPanels = (): FigurePanel[] => [
  {
    id: 'step', title: 'The bedroom vs a one-pole stand-in K/(τs + 1)', x: 'time (h)', y: 'rise (K)',
    draw(g, w, h, v) {
      const tau = num(v, 'tau', 5), K = num(v, 'K', 8.18) * 2.5, t = lin(0, 30, 601), y1 = t.map((tt) => K * (1 - Math.exp(-tt / tau)));
      const fr = plotFrame(g, w, h, [0, 30], [0, Math.max(26, K * 1.12)], 'time (h)', 'K above outdoor');
      hline(g, fr, K, [0, 30], `K × 2.5 kW = ${f(K)} K`);
      let gap = 0;
      if (on(v, 'truth')) { const r = houseRun(2500, HOUSE_WALLS.Gin, HOUSE_WALLS.Gout, 30, 601); curve(g, fr, r.t, r.x2, col.a(), 2.4); gap = Math.max(...r.x2.map((q, i) => Math.abs(q - y1[i]))); }
      curve(g, fr, t, y1, col.b(), 2, [6, 4]);
      tline(g, fr, [tau, 0], [tau, K * 0.632], col.e(), 1.2, [3, 3]); dot(g, fr, [tau, K * 0.632], col.e(), 4); text(g, `63 % at τ = ${f(tau, 1)} h`, fr.X(tau) + 6, fr.Y(K * 0.632) + 12, col.e(), 'left', 10);
      if (4 * tau <= 30) { tline(g, fr, [4 * tau, 0], [4 * tau, K * 0.98], col.ok(), 1.2, [3, 3]); text(g, `98 % at 4τ = ${f(4 * tau, 0)} h`, fr.X(4 * tau) - 4, fr.box.b - 10, col.ok(), 'right', 10); }
      legend(g, fr, [...(on(v, 'truth') ? [{ label: `true house (max gap ${f(gap)} K)`, color: col.a() }] : []), { label: 'stand-in K(1 − e^(−t/τ))', color: col.b(), dash: true }], 'br');
    },
  },
  {
    id: 'gap', title: 'True house minus the stand-in', x: 'time (h)', y: 'gap (K)',
    draw(g, w, h, v) {
      const K = num(v, 'K', 8.18) * 2.5, tau = num(v, 'tau', 5), t = lin(0, 30, 301);
      const tr = t.map((q) => 20.45 - 22.5 * Math.exp(-0.2 * q) + 2.045 * Math.exp(-2.2 * q)), sd = t.map((q) => K * (1 - Math.exp(-q / tau))), d = tr.map((q, i) => q - sd[i]);
      const fr = plotFrame(g, w, h, [0, 30], range([d], 0.15), 'time (h)', 'gap (K)'); tline(g, fr, [0, 0], [30, 0], col.strong(), 1);
      curve(g, fr, t, d, col.d(), 2.2); const k = d.reduce((m, q, i) => (Math.abs(q) > Math.abs(d[m]) ? i : m), 0); dot(g, fr, [t[k], d[k]], col.d(), 4);
      legend(g, fr, [{ label: `largest gap ${f(d[k])} K at ${f(t[k], 1)} h (negative: the stand-in runs ahead)`, color: col.d() }], 'br');
    },
  },
];
export const firstFigure = figureOf(firstPanels);

/* ── REDUCE · figure:reduce ── */
function reduceModels(v: V) {
  const plant = str(v, 'plant', 'house'), method = str(v, 'method', 'match'), order = num(v, 'order', 1);
  if (plant === 'house') {
    const full = tf([0.0036 * 2500], housePoly()), d1 = Math.sqrt(deltaQ([1, 2.4 / 0.44, 1 / 0.44], 1)), tau = method === 'drop' ? 5 : d1, F = 20.45;
    return { full, red: tf([F], [tau, 1]), T: 30, txt: `${f(F)}/(${f(tau, 3)}s + 1)`, unit: 'h', yl: 'K' };
  }
  const full = tf([6], [1, 6, 11, 6]);
  if (order === 1) return method === 'drop' ? { full, red: tf([1], [1, 1]), T: 8, txt: '1/(s + 1)', unit: 's', yl: 'output' } : { full, red: tf([0.857], [1, 0.857]), T: 8, txt: '0.857/(s + 0.857)', unit: 's', yl: 'output' };
  return method === 'drop' ? { full, red: tf([2], [1, 3, 2]), T: 8, txt: '2/((s + 1)(s + 2))', unit: 's', yl: 'output' } : { full, red: tf([1.6036], [1, 2.5898, 1.6036]), T: 8, txt: '1.6036/(s² + 2.5898s + 1.6036)', unit: 's', yl: 'output' };
}
export const reduceFigure = figureOf(() => [
  {
    id: 'step', title: 'Full model vs the reduced one: step response', x: 'time', y: 'output',
    draw(g, w, h, v) {
      const m = reduceModels(v), a = step(m.full, m.T, 601), r = step(m.red, m.T, 601), gap = Math.max(...a.y.map((q, i) => Math.abs(q - r.y[i])));
      const fr = plotFrame(g, w, h, [0, m.T], range([a.y, r.y], 0.08, 0), `time (${m.unit})`, m.yl);
      curve(g, fr, a.t, a.y, col.a(), 2.4); curve(g, fr, r.t, r.y, col.b(), 2, [6, 4]);
      legend(g, fr, [{ label: str(v, 'plant', 'house') === 'house' ? 'full house (two poles)' : 'full 6/((s+1)(s+2)(s+3))', color: col.a() }, { label: `reduced ${m.txt}`, color: col.b(), dash: true }, { label: `max gap ${f(gap, 3)}`, color: col.muted() }], 'br');
    },
  },
  {
    id: 'mag', title: '|G(jω)| / |G(0)|: matched at low frequency', x: 'ω', y: 'relative gain',
    draw(g, w, h, v) {
      const m = reduceModels(v), wmax = m.unit === 'h' ? 2 : 5, ws = lin(0, wmax, 201), mag = (G: TF) => { const g0 = Math.hypot(...Object.values(tfEval(G, C(0, 0))) as [number, number]); return ws.map((q) => Math.hypot(...Object.values(tfEval(G, C(0, q))) as [number, number]) / g0); };
      const a = mag(m.full), r = mag(m.red), fr = plotFrame(g, w, h, [0, wmax], [0, 1.05], `ω (rad/${m.unit})`, 'relative gain');
      curve(g, fr, ws, a, col.a(), 2.4); curve(g, fr, ws, r, col.b(), 2, [6, 4]);
      legend(g, fr, [{ label: 'full model', color: col.a() }, { label: 'reduced model', color: col.b(), dash: true }], 'tr');
    },
  },
] as FigurePanel[]);

/* ── INV · figure:partial (house step as a sum of modes) ── */
export const partialFigure = figureOf(() => [
  {
    id: 'terms', title: 'X₂(s) = 9/(s(s + 0.2)(s + 2.2)): one term per pole', x: 'time (h)', y: 'K',
    draw(g, w, h, v) {
      const p1 = num(v, 'p1', -0.2), p2 = num(v, 'p2', -2.2), F = 20.45, r1 = (F * p2) / (p1 - p2), r2 = (F * p1) / (p2 - p1), t = lin(0, 24, 481);
      const y0 = t.map(() => F), y1 = t.map((tt) => r1 * Math.exp(p1 * tt)), y2 = t.map((tt) => r2 * Math.exp(p2 * tt)), y = t.map((_, i) => y0[i] + y1[i] + y2[i]);
      const fr = plotFrame(g, w, h, [0, 24], range([y, y1, y2, y0], 0.06), 'time (h)', 'K'); tline(g, fr, [0, 0], [24, 0], col.strong(), 1);
      if (on(v, 'terms')) { curve(g, fr, t, y0, col.muted(), 1.4, [5, 3]); curve(g, fr, t, y1, col.c(), 1.6, [5, 3]); curve(g, fr, t, y2, col.d(), 1.6, [5, 3]); }
      curve(g, fr, t, y, col.a(), 2.4);
      legend(g, fr, [{ label: `x₂(t) = ${f(F)} ${r1 < 0 ? '−' : '+'} ${f(Math.abs(r1))}e^(${f(p1)}t) ${r2 < 0 ? '−' : '+'} ${f(Math.abs(r2), 3)}e^(${f(p2)}t)`, color: col.a() }, ...(on(v, 'terms') ? [{ label: `step term ${f(F)}`, color: col.muted(), dash: true }, { label: `slow term (pole ${f(p1)})`, color: col.c(), dash: true }, { label: `fast term (pole ${f(p2)})`, color: col.d(), dash: true }] : [])], 'br');
      text(g, `residues sum to ${f(F + r1 + r2, 3)} (x₂(0) = 0)`, fr.box.l + 6, fr.box.t + 8, col.muted(), 'left', 10);
    },
  },
  {
    id: 'poles', title: 'Poles of X₂(s) and the residue each one carries', x: 'σ (1/h)', y: 'jω (rad/h)',
    draw(g, w, h, v) {
      const p1 = num(v, 'p1', -0.2), p2 = num(v, 'p2', -2.2), F = 20.45, r1 = (F * p2) / (p1 - p2), r2 = (F * p1) / (p2 - p1);
      drawSPlane(g, w, h, { range: 3, reCenter: -1.2, poles: [], marks: [{ s: C(0, 0), label: `s = 0: ${f(F)}`, color: col.muted(), shape: 'dot' }, { s: C(p1, 0), label: `${f(p1)}: ${f(r1)}`, color: col.c(), shape: 'dot' }, { s: C(p2, 0), label: `${f(p2)}: ${f(r2, 3)}`, color: col.d(), shape: 'dot' }] });
    },
  },
] as FigurePanel[]);

/* ── CIRC · figure:rlc (RLC, or the house as an RC circuit) ── */
export const rlcFigure = figureOf(() => [
  {
    id: 'circuit', title: 'The circuit', x: 'schematic', y: '',
    draw(g, w, h, v) {
      g.clearRect(0, 0, w, h);
      if (str(v, 'circ', 'rlc') === 'house') {
        const lines = ['House as a circuit: temperature ↔ voltage, heat flow ↔ current', 'heater = current source into node 1 (living room)', 'C₁ = C₂ = 1 MJ/K (each room) to ground (outdoor temperature)', 'inner wall R = 1/277.8 W/K = 3.6 mK/W between nodes 1 and 2', 'each outer wall R = 1/55.6 W/K = 18 mK/W to ground', 'same equations ⇒ the same G₂(s) = 0.0036/(s² + 2.4s + 0.44)'];
        let y = 14; for (const [i, l] of lines.entries()) y = para(g, l, 8, y, w - 16, i === 0 ? col.e() : col.text(), 10.5) + 2;
      } else {
        const R = num(v, 'R', 1), L = num(v, 'L', 1), Cp = num(v, 'Cap', 1), wn = 1 / Math.sqrt(L * Cp), z = (R / 2) * Math.sqrt(Cp / L);
        let y = 14; for (const l of ['Series R, L, C driven by a voltage step; output across C', `G(s) = 1/(LC s² + RC s + 1) = 1/(${f(L * Cp)}s² + ${f(R * Cp)}s + 1)`, `ωn = 1/√(LC) = ${f(wn)} rad/s,  ζ = (R/2)√(C/L) = ${f(z)}`, 'like the corner with m ↔ L, c ↔ R, k ↔ 1/C']) y = para(g, l, 8, y, w - 16, col.text(), 10.5) + 2;
      }
    },
  },
  {
    id: 'step', title: 'Step response', x: 'time', y: 'output',
    draw(g, w, h, v) {
      if (str(v, 'circ', 'rlc') === 'house') { const r = step(houseG2(), 24, 400), y = r.y.map((q) => q * 2500); const fr = plotFrame(g, w, h, [0, 24], [0, 24], 'time (h)', 'node 2 "voltage" = bedroom (K)'); curve(g, fr, r.t, y, col.a(), 2.4); hline(g, fr, 20.45, [0, 24], '20.45 K'); return; }
      const R = num(v, 'R', 1), L = num(v, 'L', 1), Cp = num(v, 'Cap', 1), G = tf([1], [L * Cp, R * Cp, 1]), T = Math.max(6, 10 * Math.sqrt(L * Cp)), r = step(G, T, 600);
      const fr = plotFrame(g, w, h, [0, T], [0, Math.max(1.2, Math.max(...r.y) * 1.08)], 'time (s)', 'v_C (V)'); hline(g, fr, 1, [0, T], 'input 1 V'); curve(g, fr, r.t, r.y, col.a(), 2.4);
    },
  },
] as FigurePanel[]);

/* ── PLANE · figure:plane (|G| landscape, jω slice) ── */
const planeG = (v: V): { G: TF; range: number; re: number; wmax: number; unit: string } => {
  const p = str(v, 'plant', 'bed');
  if (p === 'corner') return { G: tf([64], [1, 4, 64]), range: 10, re: -3, wmax: 16, unit: 'rad/s' };
  return { G: p === 'living' ? tf([0.44 / 1.2, 0.44], housePoly()) : tf([0.44], housePoly()), range: 2.6, re: -1.2, wmax: 2, unit: 'rad/h' };
};
export const planeFigure = figureOf(() => [
  { id: 'map', title: '|G(s)| over the s-plane: poles are peaks, zeros are pits', x: 'σ', y: 'jω', draw: (g, w, h, v) => { const P = planeG(v); drawHeightMap(g, w, h, { G: P.G, range: P.range, reCenter: P.re, omega: num(v, 'omega', 0.262) }); } },
  {
    id: 'slice', title: '|G(jω)| along the jω axis (frequency response, preview)', x: 'ω', y: '|G(jω)| / G(0)',
    draw(g, w, h, v) {
      const P = planeG(v); drawJwSlice(g, w, h, { G: P.G, wmax: P.wmax, omega: num(v, 'omega', 0.262) });
      if (str(v, 'plant', 'bed') !== 'corner') text(g, `daily heater cycle ω = 0.262 rad/h: |G₂| = ${f(houseG2mag(0.262) * 1000)} K/kW vs ${f(dc(houseG2()) * 1000)} at DC`, 8, 12, col.muted(), 'left', 9.5);
    },
  },
] as FigurePanel[]);

/* ── DIST · figure:regulate (cold front) ── */
const front = (v: V) => { const ctrl = str(v, 'ctrl', 'pi'), Kp = ctrl === 'open' ? 0 : num(v, 'Kp', 1100), Ki = ctrl === 'pi' ? num(v, 'Ki', 200) : 0; return houseColdFront(Kp, Ki, num(v, 'd', -5), 24, 2e-3); };
export const regulatePanels = (): FigurePanel[] => [
  {
    id: 'temp', title: 'Bedroom after a cold front (change from its set point)', x: 'time (h)', y: 'bedroom change (K)',
    draw(g, w, h, v) {
      const d = num(v, 'd', -5), r = front(v), tt = Array.from(r.t).filter((_, i) => i % 20 === 0), yy = Array.from(r.y).filter((_, i) => i % 20 === 0);
      const fr = plotFrame(g, w, h, [0, 24], [Math.min(d * 1.08, -1), 0.6], 'time (h)', 'K'); tline(g, fr, [0, 0], [24, 0], col.muted(), 1, [5, 4]); text(g, 'set point', fr.box.r - 4, fr.Y(0) - 8, col.muted(), 'right', 10);
      curve(g, fr, tt, yy, col.a(), 2.4); text(g, `after 24 h ${f(r.final, 2)} K · worst ${f(r.worst, 2)} K`, fr.box.l + 6, fr.box.b - 10, col.a(), 'left', 10.5);
    },
  },
  {
    id: 'heat', title: 'Extra heater power the thermostat adds', x: 'time (h)', y: 'extra power (W)',
    draw(g, w, h, v) {
      const r = front(v), tt = Array.from(r.t).filter((_, i) => i % 20 === 0), uu = Array.from(r.u).filter((_, i) => i % 20 === 0), need = (-num(v, 'd', -5) * 2 * HOUSE_WALLS.Gout);
      const fr = plotFrame(g, w, h, [0, 24], [0, Math.max(need * 1.4, 200)], 'time (h)', 'W'); hline(g, fr, need, [0, 24], `steady need ${f(need, 0)} W`);
      curve(g, fr, tt, uu, col.b(), 2.2); text(g, `now ${f(r.uFinal, 0)} W · peak ${f(r.peakU, 0)} W`, fr.box.l + 6, fr.box.t + 8, col.b(), 'left', 10.5);
    },
  },
];
export const regulateFigure = figureOf(regulatePanels);

/* ── SENS · figure:sens ── */
function sensRuns(v: V) {
  const Kp = num(v, 'Kp', 500), dl = num(v, 'dleak', 20) / 100, ctrl = str(v, 'ctrl', 'p'), A0 = houseA(), A1 = houseA(HOUSE_WALLS.Gin, HOUSE_WALLS.Gout * (1 + dl));
  const T = ctrl === 'open' ? 30 : 12;
  const sys = (A: number[][]): TF => {
    const G = houseG2(A), p = housePoly(A), k = G.num[G.num.length - 1];
    if (ctrl === 'open') return tf([k / dc(houseG2(A0))], p);
    if (ctrl === 'pi') return tf([k * Kp, k * THERMOSTAT.Ki], polyAdd(polyMul(p, [1, 0]), [k * Kp, k * THERMOSTAT.Ki]));
    return tf([k * Kp], polyAdd(p, [k * Kp]));
  };
  const n = step(sys(A0), T, 600), pr = step(sys(A1), T, 600), fn = n.y[n.y.length - 1], fp = pr.y[pr.y.length - 1];
  const g0 = dc(houseG2(A0)), g1 = dc(houseG2(A1)), S0 = ctrl === 'open' ? 1 : ctrl === 'pi' ? 0 : 1 / (1 + Kp * g0);
  return { n, p: pr, T, exact: 100 * (fp / fn - 1), pred: 100 * S0 * (g1 / g0 - 1), Kp, ctrl };
}
export const sensFigure = figureOf(() => [
  {
    id: 'resp', title: 'Nominal walls vs leakier walls', x: 'time (h)', y: 'rise / nominal final',
    draw(g, w, h, v) {
      const r = sensRuns(v), fr = plotFrame(g, w, h, [0, r.T], [0, 1.25], 'time (h)', r.ctrl === 'open' ? 'rise / nominal final' : 'bedroom / set point');
      curve(g, fr, r.n.t, r.n.y, col.a(), 2.4); curve(g, fr, r.p.t, r.p.y, col.b(), 2, [6, 4]);
      legend(g, fr, [{ label: 'walls as modelled', color: col.a() }, { label: `leak ${num(v, 'dleak', 20) >= 0 ? '+' : ''}${f(num(v, 'dleak', 20), 0)} %`, color: col.b(), dash: true }, { label: `final change ${f(r.exact, 2)} % (S(0)·ΔG/G predicts ${f(r.pred, 2)} %)`, color: col.muted() }], 'br');
    },
  },
  {
    id: 'S', title: '|S(jω)| of the P thermostat: how much model error gets through', x: 'ω (rad/h, log)', y: '|S|',
    draw(g, w, h, v) {
      const Kp = num(v, 'Kp', 1100), ws = lin(-2, 1.5, 300).map((e) => 10 ** e), S = ws.map((q) => houseSC(Kp, q).S), lx = ws.map(Math.log10);
      const fr = plotFrame(g, w, h, [-2, 1.5], [0, Math.max(1.5, Math.max(...S) * 1.1)], 'log₁₀ ω (rad/h)', '|S|'); hline(g, fr, 1, [-2, 1.5], '1 = no help');
      curve(g, fr, lx, S, col.c(), 2.4); const i = S.indexOf(Math.max(...S)); dot(g, fr, [lx[i], S[i]], col.c(), 4); text(g, `peak ${f(S[i])} at ${f(ws[i], 1)} rad/h`, fr.X(lx[i]) - 6, fr.Y(S[i]) - 10, col.c(), 'right', 10);
    },
  },
] as FigurePanel[]);

/* ── NOISE · figure:sc ── */
/** L(jω) of the P or PI thermostat: PI multiplies by (1 + Ki/(Kp s)). */
const scL = (v: V, s: Cx): Cx => { const Kp = num(v, 'Kp', 1100), pi = str(v, 'ctrl', 'p') === 'pi', G = houseG2(), L = tfEval(tf(G.num.map((q) => q * Kp), G.den), s); return pi ? cmul(L, cadd(C(1), cdiv(C(THERMOSTAT.Ki / Kp), s))) : L; };
export const scFigure = figureOf(() => [
  {
    id: 'sc', title: '|S| and |C| over frequency (preview: frequency response)', x: 'ω (rad/h, log)', y: 'magnitude',
    draw(g, w, h, v) {
      const ws = lin(-2, 1.5, 300).map((e) => 10 ** e), lx = ws.map(Math.log10), S: number[] = [], Cm: number[] = [];
      for (const q of ws) { const L = scL(v, C(0, q)), d = Math.hypot(1 + L.re, L.im); S.push(1 / d); Cm.push(Math.hypot(L.re, L.im) / d); }
      const fr = plotFrame(g, w, h, [-2, 1.5], [0, 1.45], 'log₁₀ ω (rad/h)', '|S|, |C|'); hline(g, fr, 1, [-2, 1.5], '');
      curve(g, fr, lx, S, col.c(), 2.2); curve(g, fr, lx, Cm, col.d(), 2.2);
      legend(g, fr, [{ label: '|S|: what the loop rejects (weather, model error)', color: col.c() }, { label: '|C|: what it passes (sensor error)', color: col.d() }], 'tl');
    },
  },
  {
    id: 'room', title: 'Thermostat reads high: the room vs the reading', x: 'time (h)', y: 'change (K)',
    draw(g, w, h, v) {
      const Kp = num(v, 'Kp', 1100), pi = str(v, 'ctrl', 'p') === 'pi', bias = num(v, 'bias', 1), flick = on(v, 'flicker'), T = 12, t = lin(0, T, 1201);
      const n = t.map((tt) => bias + (flick ? 0.6 * Math.sign(Math.sin(6 * tt)) : 0));
      const k = houseG2().num[0], Cs = pi ? tf([k * Kp, k * THERMOSTAT.Ki], polyAdd(polyMul(housePoly(), [1, 0]), [k * Kp, k * THERMOSTAT.Ki])) : tf([k * Kp], polyAdd(housePoly(), [k * Kp]));
      const r = lsim(Cs, n, t), room = r.y.map((q) => -q), reading = room.map((q, i) => q + n[i]);
      const fr = plotFrame(g, w, h, [0, T], [Math.min(-bias * 1.2 - (flick ? 0.6 : 0), -0.5), Math.max(bias * 1.6 + (flick ? 0.6 : 0), 0.6)], 'time (h)', 'K from set point');
      tline(g, fr, [0, 0], [T, 0], col.muted(), 1, [5, 4]); curve(g, fr, t, reading, col.muted(), 1.4); curve(g, fr, t, room, col.a(), 2.4);
      legend(g, fr, [{ label: `room: ends ${f(room[room.length - 1], 2)} K`, color: col.a() }, { label: 'what the thermostat reads', color: col.muted() }], 'tl');
    },
  },
] as FigurePanel[]);
void fillBetween; void C; void roots; void cornerGu; void HOUSE;

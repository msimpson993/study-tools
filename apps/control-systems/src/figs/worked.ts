/** Review 1 worked-example pictures: the corner's two-integrator diagram (ss), the RLC and house-as-RC schematics (circuits),
 *  where the extra heat goes after a cold front (dist) and the dish's torque balance against the wind (sse). Numbers from numbers.py [H4], [P]. */
import { figureOf, text, col, curve, withLabelRole, rangeFrame, graphAxes, type FigurePanel } from '@study/core';
import { HOUSE_WALLS, DISH } from '../model/params';
import { houseG2, dc } from '../model/plants';
import { type V, num, f, k3, plotFrame, legend } from './util';
import { arrowPx } from './draw';

type G = CanvasRenderingContext2D;
const ln = (g: G, pts: [number, number][], c: string, w = 1.6) => { g.save(); g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore(); };
const box = (g: G, cx: number, cy: number, bw: number, bh: number, label: string, c: string, size = 11) => {
  g.save(); g.strokeStyle = c; g.lineWidth = 1.6; g.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh); g.restore();
  withLabelRole('axis', () => text(g, label, cx, cy, c, 'center', size));
};
const sum = (g: G, cx: number, cy: number, r: number) => { g.save(); g.strokeStyle = col.text(); g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, r, 0, 2 * Math.PI); g.stroke(); g.restore(); withLabelRole('axis', () => text(g, 'Σ', cx, cy, col.text(), 'center', 12)); };
const lbl = (g: G, s: string, x: number, y: number, c = col.text(), al: CanvasTextAlign = 'center', size = 10.5) => withLabelRole('axis', () => text(g, s, x, y, c, al, size));

/* ── ss · figure:ssblock: force → ÷ m → Σ → ∫ → ż → ∫ → z, with the shock (−4ż) and spring (−64z) fed back ── */
export const ssblockFigure = figureOf((): FigurePanel[] => [{
  id: 'block', title: 'Inside the corner: two integrators', x: 'signal flow', y: '', height: 230,
  draw(g, w, h) {
    g.clearRect(0, 0, w, h);
    const cy = h * 0.36, S = Math.min(1, w / 640), bw = 62 * S, bh = 30, xs = [0.05, 0.2, 0.36, 0.52, 0.66, 0.82, 0.95].map((q) => q * w), st = col.a(), gn = col.b();
    lbl(g, 'u (N)', xs[0], cy - 16); arrowPx(g, xs[0] - 10, cy, xs[1] - bw / 2, cy, col.text(), 1.6, 6);
    box(g, xs[1], cy, bw, bh, '× 1/400', gn);
    arrowPx(g, xs[1] + bw / 2, cy, xs[2] - 12, cy, col.text(), 1.6, 6); sum(g, xs[2], cy, 12);
    arrowPx(g, xs[2] + 12, cy, xs[3] - bw / 2, cy, col.text(), 1.6, 6); lbl(g, 'z̈ (m/s²)', (xs[2] + 12 + xs[3] - bw / 2) / 2, cy - 22, col.text(), 'center', 10);
    box(g, xs[3], cy, bw * 0.7, bh, '∫', st, 13);
    arrowPx(g, xs[3] + bw * 0.35, cy, xs[5] - bw * 0.35, cy, col.text(), 1.6, 6); lbl(g, 'ż (m/s)', xs[4], cy - 14, st, 'center', 10.5);
    box(g, xs[5], cy, bw * 0.7, bh, '∫', st, 13);
    arrowPx(g, xs[5] + bw * 0.35, cy, xs[6] + 6, cy, col.text(), 1.6, 6); lbl(g, 'z (m)', xs[6] - 4, cy - 14, st, 'center', 10.5);
    // feedback: velocity through × 4 (c/m), height through × 64 (k/m), both subtracted at Σ
    const y1 = h * 0.62, y2 = h * 0.86;
    ln(g, [[xs[4], cy], [xs[4], y1], [xs[3] + bw * 0.4, y1]], st); box(g, xs[3], y1, bw * 0.8, 24, '× 4', gn, 10.5); arrowPx(g, xs[3] - bw * 0.4, y1, xs[2] + 2, y1, col.text(), 1.6, 0); ln(g, [[xs[2] + 2, y1], [xs[2] + 2, cy + 12]], col.text()); arrowPx(g, xs[2] + 2, y1, xs[2] + 2, cy + 13, col.text(), 1.6, 6);
    ln(g, [[xs[6] - 18, cy], [xs[6] - 18, y2], [xs[4] + bw * 0.4, y2]], st); box(g, xs[4], y2, bw * 0.8, 24, '× 64', gn, 10.5); ln(g, [[xs[4] - bw * 0.4, y2], [xs[2] - 2, y2]], col.text()); arrowPx(g, xs[2] - 2, y2, xs[2] - 2, cy + 13, col.text(), 1.6, 6);
    lbl(g, '−', xs[2] + 10, cy + 22, col.text(), 'left', 12); lbl(g, '−', xs[2] - 10, cy + 22, col.text(), 'right', 12);
    lbl(g, 'shock: c/m = 4 /s', xs[3], y1 + 20, gn, 'center', 9.5); lbl(g, 'spring: k/m = 64 /s²', xs[4], y2 + 20, gn, 'center', 9.5);
  },
}, {
  id: 'states', title: 'The two states after a step force', x: 'time (s)', y: 'z (mm) · ż (mm/s)', height: 220,
  draw(g, w, h, v: V) {
    // the same diagram, simulated: z̈ = u/400 − 4ż − 64z (Euler, 1 ms)
    const u = num(v, 'u', 400), T = 3, dt = 1e-3, t: number[] = [], z: number[] = [], zd: number[] = []; let x = 0, xd = 0;
    for (let i = 0; i <= T / dt; i++) { if (i % 10 === 0) { t.push(i * dt); z.push(x * 1000); zd.push(xd * 1000); } const a = u / 400 - 4 * xd - 64 * x; xd += dt * a; x += dt * xd; }
    const lo = Math.min(...zd, ...z), hi = Math.max(...zd, ...z), fr = plotFrame(g, w, h, [0, T], [lo - 0.1 * (hi - lo), hi + 0.15 * (hi - lo)], 'time (s)', 'mm · mm/s');
    curve(g, fr, t, zd, col.a(), 2, [6, 4]); curve(g, fr, t, z, col.a(), 2.4);
    legend(g, fr, [{ label: `height z → u/(400·64) = ${f((u / 25600) * 1000, 1)} mm`, color: col.a() }, { label: 'velocity ż → 0', color: col.a(), dash: true }], 'tr');
  },
}]);

/* ── circuits · figure:rlcschem: (a) series RLC, (b) the house as an RC network ── */
const resistor = (g: G, x1: number, y: number, x2: number, c: string) => { const n = 6, d = (x2 - x1) / (n * 2 + 2); const pts: [number, number][] = [[x1, y], [x1 + d, y]]; for (let i = 0; i < n * 2; i++) pts.push([x1 + d * (i + 1.5), y + (i % 2 ? 5 : -5)]); pts.push([x2 - d, y], [x2, y]); ln(g, pts, c, 1.6); };
const resistorV = (g: G, x: number, y1: number, y2: number, c: string) => { const n = 5, d = (y2 - y1) / (n * 2 + 2); const pts: [number, number][] = [[x, y1], [x, y1 + d]]; for (let i = 0; i < n * 2; i++) pts.push([x + (i % 2 ? 5 : -5), y1 + d * (i + 1.5)]); pts.push([x, y2 - d], [x, y2]); ln(g, pts, c, 1.6); };
const inductor = (g: G, x1: number, y: number, x2: number, c: string) => { const n = 4, r = (x2 - x1) / (2 * n); g.save(); g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i < n; i++) g.arc(x1 + r * (2 * i + 1), y, r, Math.PI, 0); g.stroke(); g.restore(); };
const capV = (g: G, x: number, y1: number, y2: number, c: string) => { const m = (y1 + y2) / 2; ln(g, [[x, y1], [x, m - 4]], c); ln(g, [[x - 11, m - 4], [x + 11, m - 4]], c, 2.2); ln(g, [[x - 11, m + 4], [x + 11, m + 4]], c, 2.2); ln(g, [[x, m + 4], [x, y2]], c); };
const ground = (g: G, x: number, y: number, c: string) => { ln(g, [[x - 10, y], [x + 10, y]], c); ln(g, [[x - 6, y + 4], [x + 6, y + 4]], c); ln(g, [[x - 2, y + 8], [x + 2, y + 8]], c); };
export const rlcschemFigure = figureOf((): FigurePanel[] => [
  {
    id: 'rlc', title: '(a) Series RLC', x: 'schematic', y: '', height: 220,
    draw(g, w, h) {
      g.clearRect(0, 0, w, h); const c = col.text(), top = h * 0.28, bot = h * 0.7, x0 = w * 0.1, xr = w * 0.78;
      // source V_in on the left, then R, L along the top, C down to ground on the right; V_out across C
      g.save(); g.strokeStyle = c; g.lineWidth = 1.6; g.beginPath(); g.arc(x0, (top + bot) / 2, 13, 0, 2 * Math.PI); g.stroke(); g.restore(); lbl(g, '+', x0, (top + bot) / 2 - 5, c, 'center', 10); lbl(g, '−', x0, (top + bot) / 2 + 6, c, 'center', 10);
      ln(g, [[x0, (top + bot) / 2 - 13], [x0, top], [x0 + w * 0.08, top]], c); resistor(g, x0 + w * 0.08, top, x0 + w * 0.28, col.b()); ln(g, [[x0 + w * 0.28, top], [x0 + w * 0.34, top]], c);
      inductor(g, x0 + w * 0.34, top, x0 + w * 0.54, col.d()); ln(g, [[x0 + w * 0.54, top], [xr, top]], c); capV(g, xr, top, bot, col.a()); ln(g, [[xr, bot], [x0, bot], [x0, (top + bot) / 2 + 13]], c); ground(g, (x0 + xr) / 2, bot, c);
      lbl(g, 'V_in', x0 - 18, (top + bot) / 2, c, 'right'); lbl(g, 'R', x0 + w * 0.18, top - 14, col.b()); lbl(g, 'L', x0 + w * 0.44, top - 14, col.d()); lbl(g, 'C', xr + 16, (top + bot) / 2, col.a(), 'left');
      ln(g, [[xr, top], [w * 0.92, top]], c, 1); ln(g, [[xr, bot], [w * 0.92, bot]], c, 1); lbl(g, '+', w * 0.93, top, c, 'left'); lbl(g, '−', w * 0.93, bot, c, 'left'); lbl(g, 'V_out', w * 0.93, (top + bot) / 2, col.a(), 'left');
      lbl(g, 'V_out/V_in = 1/(LCs² + RCs + 1)', w / 2, h - 16, col.text(), 'center', 11);
    },
  },
  {
    id: 'house', title: '(b) The house as an RC network', x: 'schematic', y: '', height: 220,
    draw(g, w, h, v: V) {
      g.clearRect(0, 0, w, h); const c = col.text(), top = h * 0.3, bot = h * 0.72, n1 = w * 0.3, n2 = w * 0.66;
      // current source u into node 1; C_th to ground at each node; R_in between; R_out from each node to ground (outdoors)
      g.save(); g.strokeStyle = col.b(); g.lineWidth = 1.6; g.beginPath(); g.arc(w * 0.08, (top + bot) / 2, 13, 0, 2 * Math.PI); g.stroke(); g.restore(); arrowPx(g, w * 0.08, (top + bot) / 2 + 8, w * 0.08, (top + bot) / 2 - 8, col.b(), 1.4, 5);
      ln(g, [[w * 0.08, (top + bot) / 2 - 13], [w * 0.08, top], [n1, top]], c); ln(g, [[w * 0.08, (top + bot) / 2 + 13], [w * 0.08, bot]], c);
      resistor(g, n1 + 4, top, n2 - 4, col.d()); ln(g, [[n1, top], [n1 + 4, top]], c); ln(g, [[n2 - 4, top], [n2, top]], c);
      for (const [x, nm] of [[n1, 'x₁'], [n2, 'x₂']] as [number, string][]) { capV(g, x - 18, top, bot, col.a()); ln(g, [[x - 18, top], [x + 18, top]], c); resistorV(g, x + 18, top, bot, col.c()); g.save(); g.fillStyle = c; g.beginPath(); g.arc(x, top, 3, 0, 2 * Math.PI); g.fill(); g.restore(); lbl(g, nm, x, top - 14, nm === 'x₂' ? col.a() : c); }
      ln(g, [[w * 0.08, bot], [n2 + 18, bot]], c); ground(g, (n1 + n2) / 2, bot, c);
      const vals = v.vals !== false; // the toggle: house values or symbols only
      lbl(g, vals ? 'u (0–2500 W)' : 'u', 2, bot + 16, col.b(), 'left', 9.5); lbl(g, vals ? 'R_in = 3.6 mK/W' : 'R_in', (n1 + n2) / 2, top - 14, col.d(), 'center', 9.5);
      lbl(g, vals ? 'C_th = 1 MJ/K (each)' : 'C_th', n1 - 18, bot + 30, col.a(), 'center', 9.5); lbl(g, vals ? 'R_out = 18 mK/W' : 'R_out', n2 + 26, (top + bot) / 2, col.c(), 'left', 9.5);
      lbl(g, 'output: x₂ (bedroom) · ground = outdoors', w / 2, h - 14, col.muted(), 'center', 10);
    },
  },
]);

/** A bar frame with the category names as the x tick labels (bars centred on 0, 1, 2). */
const barFrame = (g: G, w: number, h: number, names: string[], ymax: number, yl: string) => { g.setLineDash([]); g.clearRect(0, 0, w, h); const xr: [number, number] = [-0.5, names.length - 0.5], yr: [number, number] = [0, ymax], fr = rangeFrame(w, h, xr, yr, 48, 12, 10, 32); graphAxes(g, fr, xr, yr, '', yl, 1, 0, (x) => names[Math.round(x)] ?? ''); return fr; };
/* ── dist · figure:heatbars: where the extra heat goes after a −5 K front (numbers.py [H4]) ── */
const balance = (droop: number) => { const d = 5, dT2 = -droop, dT1 = 1.2 * dT2 + 0.2 * d; return { living: HOUSE_WALLS.Gout * (dT1 + d), bed: HOUSE_WALLS.Gout * (dT2 + d) }; };
export const heatbarsFigure = figureOf((): FigurePanel[] => [{
  id: 'bars', title: 'Extra heat after a −5 K front, split by wall', x: 'controller', y: 'extra heat (W)', height: 260,
  draw(g, w, h, v: V) {
    const Kp = num(v, 'Kp', 1100), L0 = Kp * dc(houseG2()), cases: [string, { living: number; bed: number }][] = [['open loop', { living: 0, bed: 0 }], ['P', balance(5 / (1 + L0))], ['PI', balance(0)]];
    const fr = barFrame(g, w, h, cases.map((c) => c[0]), 760, 'W');
    cases.forEach(([, c], i) => {
      const x0 = fr.X(i - 0.25), x1 = fr.X(i + 0.25), yb = fr.Y(0), yl = fr.Y(c.living), yt = fr.Y(c.living + c.bed);
      g.save(); g.fillStyle = col.b(); g.fillRect(x0, yl, x1 - x0, yb - yl); g.fillStyle = col.a(); g.fillRect(x0, yt, x1 - x0, yl - yt); g.restore();
      if (c.living + c.bed > 1) text(g, `${f(c.living, 0)} + ${f(c.bed, 0)} = ${f(c.living + c.bed, 0)} W`, (x0 + x1) / 2, yt - 9, col.text(), 'center', 10);
      else text(g, '0 W', (x0 + x1) / 2, yb - 9, col.muted(), 'center', 10);
    });
    legend(g, fr, [{ label: 'living-room wall leak', color: col.b() }, { label: 'bedroom wall leak', color: col.a() }], 'tl');
  },
}, {
  id: 'sag', title: 'How far the bedroom sags (steady)', x: 'controller', y: 'bedroom drop (K)', height: 220,
  draw(g, w, h, v: V) {
    const Kp = num(v, 'Kp', 1100), L0 = Kp * dc(houseG2()), sags: [string, number][] = [['open loop', 5], ['P', 5 / (1 + L0)], ['PI', 0]];
    const fr = barFrame(g, w, h, sags.map((c) => c[0]), 6, 'K');
    sags.forEach(([, d], i) => {
      const x0 = fr.X(i - 0.25), x1 = fr.X(i + 0.25), yb = fr.Y(0), yt = fr.Y(d);
      g.save(); g.fillStyle = col.c(); g.fillRect(x0, yt, x1 - x0, yb - yt); g.restore();
      text(g, `${f(d, 2)} K`, (x0 + x1) / 2, Math.min(yt, yb) - 9, d > 0 ? col.text() : col.muted(), 'center', 10);
    });
  },
}]);

/* ── sse · figure:torquebal: the wind's 20 N·m against the motor's Kp·e; they balance at e = 20/Kp ── */
export const torquebalFigure = figureOf((): FigurePanel[] => [{
  id: 'bal', title: 'Torque balance at rest: wind against Kp × error', x: 'pointing error e (°)', y: 'torque (N·m)', height: 240,
  draw(g, w, h, v: V) {
    const Kp = num(v, 'Kp', 1000), Td = DISH.wind as number, eStar = Td / Kp, eMax = Math.max(2.5, (eStar * 180) / Math.PI * 1.8);
    const fr = plotFrame(g, w, h, [0, eMax], [0, 45], 'pointing error e (°)', 'N·m');
    g.save(); g.strokeStyle = col.c(); g.lineWidth = 2.2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(fr.X(0), fr.Y(Td)); g.lineTo(fr.X(eMax), fr.Y(Td)); g.stroke(); g.restore();
    g.save(); g.strokeStyle = col.a(); g.lineWidth = 2.4; g.beginPath(); g.moveTo(fr.X(0), fr.Y(0)); const eTop = Math.min(eMax, ((45 / Kp) * 180) / Math.PI); g.lineTo(fr.X(eTop), fr.Y((Kp * eTop * Math.PI) / 180)); g.stroke(); g.restore();
    const xs = fr.X((eStar * 180) / Math.PI); g.save(); g.fillStyle = col.e(); g.beginPath(); g.arc(xs, fr.Y(Td), 4.5, 0, 2 * Math.PI); g.fill(); g.restore();
    text(g, `balance: e = ${f(Td, 0)}/${k3(Kp)} = ${f(eStar, 3)} rad = ${f((eStar * 180) / Math.PI)}°`, xs + 8, fr.Y(Td) + 14, col.e(), 'left', 10.5);
    legend(g, fr, [{ label: `wind torque ${f(Td, 0)} N·m`, color: col.c(), dash: true }, { label: `motor torque Kp·e (Kp = ${k3(Kp)} N·m/rad)`, color: col.a() }], 'tl');
  },
}, {
  id: 'time', title: 'The same balance in time: P holding the dish against the wind', x: 'time (s)', y: 'error (°)', height: 220,
  draw(g, w, h, v: V) {
    // target 0, wind 20 N·m from t = 0: J θ̈ + B θ̇ = Kp·e + 20, e = −θ (Euler, 1 ms)
    const Kp = num(v, 'Kp', 1000), Td = DISH.wind as number, T = 8, dt = 1e-3, t: number[] = [], e: number[] = []; let th = 0, om = 0;
    for (let i = 0; i <= T / dt; i++) { if (i % 10 === 0) { t.push(i * dt); e.push((-th * 180) / Math.PI); } om += (dt * (-Kp * th + Td - DISH.B * om)) / DISH.J; th += dt * om; }
    const eS = (-(Td / Kp) * 180) / Math.PI, lo = Math.min(...e), fr = plotFrame(g, w, h, [0, T], [lo * 1.15, Math.max(0.2, -lo * 0.15)], 'time (s)', '°');
    g.save(); g.strokeStyle = col.e(); g.lineWidth = 1; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(fr.X(0), fr.Y(eS)); g.lineTo(fr.X(T), fr.Y(eS)); g.stroke(); g.restore();
    g.save(); g.strokeStyle = col.a(); g.lineWidth = 2.2; g.beginPath(); t.forEach((q, i) => (i ? g.lineTo(fr.X(q), fr.Y(e[i])) : g.moveTo(fr.X(q), fr.Y(e[i])))); g.stroke(); g.restore();
    legend(g, fr, [{ label: `error settles at −20/Kp = ${f(eS)}°`, color: col.e(), dash: true }, { label: 'pointing error under P', color: col.a() }], 'tr');
  },
}]);

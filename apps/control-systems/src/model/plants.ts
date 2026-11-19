/**
 * Models of the three running examples (pure functions, no DOM): every number the page quotes comes from here,
 * and test/numbers.test.ts checks them against the tutor's numbers.py output.
 */
import { tf, polyRoots, polyMul, polyAdd, step, impulse, acker, observerGain, refGain, charPoly, C as cx, type TF, type Cx, type Mat } from '@study/core/dsp';
import { HOUSE, houseB, HOUSE_WALLS, CORNER, WHEEL, DISH, CORNER_DESIGN } from './params';

/* ───────────── shared helpers ───────────── */
export interface Metrics { final: number; peak: number; OS: number; Tp: number; Ts: number; Tr1090: number }
/** Step metrics with the tutor's definitions (numbers.py step_metrics): final value given or from the TF's DC gain,
 *  Ts = first sample after the last one outside ±2 %, rise = 90 % crossing − 10 % crossing. */
export function metricsOf(t: number[], y: number[], final: number): Metrics {
  let pk = -Infinity, ip = 0; for (let i = 0; i < y.length; i++) if (y[i] > pk) { pk = y[i]; ip = i; }
  const OS = Math.max(0, ((pk - final) / Math.abs(final)) * 100);
  let last = -1; for (let i = 0; i < y.length; i++) if (Math.abs(y[i] - final) > 0.02 * Math.abs(final)) last = i;
  const Ts = last < 0 ? 0 : last + 1 < y.length ? t[last + 1] : NaN;
  const cross = (l: number) => { for (let i = 0; i < y.length; i++) if (y[i] >= l * final) return t[i]; return NaN; };
  return { final, peak: pk, OS, Tp: t[ip], Ts, Tr1090: cross(0.9) - cross(0.1) };
}
export const dc = (G: TF) => G.num.reduce((s, c, i, a) => (i === a.length - 1 ? c : s), 0) / G.den[G.den.length - 1];
export function stepMetrics(G: TF, T: number, n = 20001, final?: number): Metrics {
  const r = step(G, T, n); return metricsOf(r.t, r.y, final ?? dc(G));
}
export const pctOS = (z: number) => (z < 1 ? 100 * Math.exp((-z * Math.PI) / Math.sqrt(1 - z * z)) : 0);
export const roots = (p: number[]): Cx[] => polyRoots(p).slice().sort((a, b) => b.re - a.re || b.im - a.im);
export const deg = (rad: number) => (rad * 180) / Math.PI;

/* ───────────── HOUSE (core HOUSE, time in hours) ───────────── */
export const b = houseB(); // 0.0036 K/h per W
/** A from wall conductances (W/K): defaults reproduce the core HOUSE.A exactly. */
export function houseA(Gin: number = HOUSE_WALLS.Gin, Gout: number = HOUSE_WALLS.Gout): Mat {
  const k = 3600 / HOUSE.Cth; return [[-(Gin + Gout) * k, Gin * k], [Gin * k, -(Gin + Gout) * k]];
}
/** Characteristic polynomial s² + 2a s + (a² − c²) for A = [[−a, c], [c, −a]]. */
export function housePoly(A: Mat = houseA()): number[] { const a = -A[0][0], c = A[0][1]; return [1, 2 * a, a * a - c * c]; }
/** Heater → bedroom (room 2) and heater → living room (room 1). */
export const houseG2 = (A: Mat = houseA()): TF => tf([b * A[1][0]], housePoly(A));
export const houseG1 = (A: Mat = houseA()): TF => tf([b, -b * A[1][1]], housePoly(A));
/** Outdoor → bedroom: both rooms leak to outdoors equally. */
export const houseGd = (A: Mat = houseA()): TF => { const leak = -(A[0][0] + A[0][1]); return tf([leak, leak * -A[1][1] + leak * A[1][0]], housePoly(A)); };
/** Steady room temperatures above outdoor for heater power u (W). */
export function houseSteadyAt(u: number, A: Mat = houseA()): [number, number] {
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0]; return [(-A[1][1] * b * u) / det, (A[1][0] * b * u) / det];
}
/** Bedroom after the 2.5 kW heater is switched on: partial fractions (residues) and x₂(t). */
export function houseStepResidues(u = HOUSE.P) {
  const K = b * u; // X2 = K/(s(s+0.2)(s+2.2))
  const [p1, p2] = [-0.2, -2.2];
  return { r0: K / (p1 * p2), r1: K / (p1 * (p1 - p2)), r2: K / (p2 * (p2 - p1)), x2: (t: number) => K / (p1 * p2) + (K / (p1 * (p1 - p2))) * Math.exp(p1 * t) + (K / (p2 * (p2 - p1))) * Math.exp(p2 * t) };
}
/** Thermostat in room 2 (P or PI), linear, small changes around the operating point: closed-loop set-point TF. */
export const thermostatTF = (Kp: number, Ki = 0): TF => (Ki ? tf([b * Kp, b * Ki], polyAdd(polyMul(housePoly(), [1, 0]), [b * Kp, b * Ki])) : tf([b * Kp], polyAdd(housePoly(), [b * Kp])));
/** Cold front d (K) on the outdoor temperature with a P/PI thermostat (Euler, dt in h): bedroom change and heater change. */
export function houseColdFront(Kp: number, Ki: number, d = -5, T = 24, dt = 1e-3, A: Mat = houseA()) {
  const leak = -(A[0][0] + A[0][1]); const n = Math.round(T / dt);
  let x1 = 0, x2 = 0, xi = 0; const y = new Float64Array(n), u = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const e = -x2, uu = Kp * e + Ki * xi; xi += e * dt;
    const d1 = A[0][0] * x1 + A[0][1] * x2 + b * uu + leak * d, d2 = A[1][0] * x1 + A[1][1] * x2 + leak * d;
    x1 += dt * d1; x2 += dt * d2; y[i] = x2; u[i] = uu;
  }
  let worst = Infinity, peakU = -Infinity; for (let i = 0; i < n; i++) { worst = Math.min(worst, y[i]); peakU = Math.max(peakU, u[i]); }
  return { t: Array.from({ length: n }, (_, i) => (i + 1) * dt), y, u, final: y[n - 1], worst, uFinal: u[n - 1], peakU };
}
/** |S(jω)| and |C(jω)| for the P thermostat (ω in rad/h). */
export function houseSC(Kp: number, w: number) {
  const p = housePoly(); const re = p[2] - w * w, im = p[1] * w, L = b * Kp; // L(jω) = L/(re + j im)
  const dRe = re + L, mag1L = Math.hypot(dRe, im), magD = Math.hypot(re, im);
  return { S: magD / mag1L, C: L / mag1L };
}
/** |G₂(jω)| (K/W). */
export const houseG2mag = (w: number, A: Mat = houseA()) => { const p = housePoly(A); return (b * A[1][0]) / Math.hypot(p[2] - w * w, p[1] * w); };

/* ───────────── CORNER (quarter car) ───────────── */
export interface Corner { m: number; k: number; c: number }
export const cornerOf = (o: Partial<Corner> = {}): Corner => ({ ...CORNER, ...o });
/** Force on the body → body height: 1/(ms² + cs + k). */
export const cornerGu = (p: Corner = cornerOf()): TF => tf([1 / p.m], [1, p.c / p.m, p.k / p.m]);
/** Road height → body height: (cs + k)/(ms² + cs + k). */
export const cornerGw = (p: Corner = cornerOf()): TF => tf([p.c / p.m, p.k / p.m], [1, p.c / p.m, p.k / p.m]);
export function cornerNumbers(p: Corner = cornerOf()) {
  const wn = Math.sqrt(p.k / p.m), zeta = p.c / (2 * Math.sqrt(p.k * p.m)), sigma = p.c / (2 * p.m), wd = Math.sqrt(Math.max(0, wn * wn - sigma * sigma));
  return { wn, fn: wn / (2 * Math.PI), zeta, sigma, wd, OS: pctOS(zeta), Tp: Math.PI / wd, TsFormula: 4 / sigma, period: (2 * Math.PI) / wd, sag: (p.m * 9.81) / p.k, cCrit: 2 * Math.sqrt(p.k * p.m) };
}
export const cornerA = (p: Corner = cornerOf()): Mat => [[0, 1], [-p.k / p.m, -p.c / p.m]];
export const cornerB = (p: Corner = cornerOf()): Mat => [[0], [1 / p.m]];
export const cornerC: Mat = [[1, 0]];
/** The corner with its wheel (4 states z, ż, z_w, ż_w; force between body and wheel). */
export function wheelA(p: Corner = cornerOf(), mu: number = WHEEL.mu, kt: number = WHEEL.kt): Mat {
  return [[0, 1, 0, 0], [-p.k / p.m, -p.c / p.m, p.k / p.m, p.c / p.m], [0, 0, 0, 1], [p.k / mu, p.c / mu, -(p.k + kt) / mu, -p.c / mu]];
}
export const wheelPoles = (p: Corner = cornerOf(), mu: number = WHEEL.mu, kt: number = WHEEL.kt) => roots(charPoly(wheelA(p, mu, kt)));
/** Body height after a force step F (N) on the body, with the wheel (RK4). */
export function wheelLoadStep(F = 1000, p: Corner = cornerOf(), mu: number = WHEEL.mu, kt: number = WHEEL.kt, T = 6, dt = 2e-4) {
  const A = wheelA(p, mu, kt), Bv = [0, 1 / p.m, 0, -1 / mu].map((v) => v * F), n = Math.round(T / dt);
  const f = (x: number[]) => A.map((r, i) => r.reduce((s, a, j) => s + a * x[j], 0) + Bv[i]);
  let x = [0, 0, 0, 0]; const t: number[] = [0], y: number[] = [0];
  for (let i = 0; i < n; i++) {
    const k1 = f(x), k2 = f(x.map((v, j) => v + (dt / 2) * k1[j])), k3 = f(x.map((v, j) => v + (dt / 2) * k2[j])), k4 = f(x.map((v, j) => v + dt * k3[j]));
    x = x.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); t.push((i + 1) * dt); y.push(x[0]);
  }
  return { t, y };
}
/** Release from height z0 at rest: z(t) = first component of e^{At}x0 (closed form for the underdamped pair). */
export function cornerRelease(z0: number, v0 = 0, p: Corner = cornerOf()) {
  const { sigma, wd } = cornerNumbers(p);
  return (t: number) => Math.exp(-sigma * t) * (z0 * Math.cos(wd * t) + ((v0 + sigma * z0) / wd) * Math.sin(wd * t));
}
/** State-feedback gains for target poles (Ackermann from core). */
export const sfPoles = (zeta: number = CORNER_DESIGN.zeta, wn: number = CORNER_DESIGN.wn): Cx[] => [cx(-zeta * wn, wn * Math.sqrt(1 - zeta * zeta)), cx(-zeta * wn, -wn * Math.sqrt(1 - zeta * zeta))];
export const cornerK = (poles: Cx[] = sfPoles(), p: Corner = cornerOf()) => acker(cornerA(p), cornerB(p), poles);
export const cornerL = (speed: number = CORNER_DESIGN.observerSpeed, poles: Cx[] = sfPoles(), p: Corner = cornerOf()) => observerGain(cornerA(p), cornerC, poles.map((q) => cx(q.re * speed, q.im * speed)));
export const cornerNbar = (K: number[] = cornerK(), p: Corner = cornerOf()) => refGain(cornerA(p), cornerB(p), cornerC, K);
/** Speed bump (half-sine of height h, duration dur) at the wheel, passive or with u = −Kx (Euler, as numbers.py). */
export function cornerBump(K: number[] | null, h: number = CORNER_DESIGN.bump.h, dur: number = CORNER_DESIGN.bump.dur, T = 3, dt = 1e-4, p: Corner = cornerOf()) {
  const n = Math.round(T / dt); let z = 0, v = 0; const t: number[] = [], y: number[] = [], acc: number[] = [], u: number[] = [];
  for (let i = 0; i < n; i++) {
    const ti = i * dt, w = ti < dur ? h * Math.sin((Math.PI * ti) / dur) : 0, wd = ti < dur ? ((h * Math.PI) / dur) * Math.cos((Math.PI * ti) / dur) : 0;
    const uu = K ? -(K[0] * z + K[1] * v) : 0, a = (-p.k * (z - w) - p.c * (v - wd) + uu) / p.m;
    const vn = v + dt * a; z = z + dt * v; v = vn; t.push((i + 1) * dt); y.push(z); acc.push(a); u.push(uu);
  }
  return { t, y, acc, u };
}
/** Ride-height step r with u = −Kx̂ + N̄r and an observer whose height estimate starts e0 off, against true-state feedback (Euler). */
export function cornerSep(e0: number, r: number = CORNER_DESIGN.rideStep, speed: number = CORNER_DESIGN.observerSpeed, T = 2, dt = 1e-5, p: Corner = cornerOf()) {
  const A = cornerA(p), Bm = 1 / p.m, K = cornerK(undefined, p), L = cornerL(speed, undefined, p), N = cornerNbar(K, p), n = Math.round(T / dt);
  let x = [0, 0], xh = [-e0, 0], xf = [0, 0]; const every = Math.max(1, Math.round(1e-3 / dt)); const t: number[] = [], d: number[] = [], y: number[] = [], yf: number[] = [];
  let dmax = 0, tmax = 0, d05 = 0;
  for (let i = 0; i < n; i++) {
    const u = -(K[0] * xh[0] + K[1] * xh[1]) + N * r, uf = -(K[0] * xf[0] + K[1] * xf[1]) + N * r, yy = x[0];
    x = [x[0] + dt * x[1], x[1] + dt * (A[1][0] * x[0] + A[1][1] * x[1] + Bm * u)];
    const inn = yy - xh[0];
    xh = [xh[0] + dt * (xh[1] + L[0] * inn), xh[1] + dt * (A[1][0] * xh[0] + A[1][1] * xh[1] + Bm * u + L[1] * inn)];
    xf = [xf[0] + dt * xf[1], xf[1] + dt * (A[1][0] * xf[0] + A[1][1] * xf[1] + Bm * uf)];
    const di = x[0] - xf[0]; if (Math.abs(di) > dmax) { dmax = Math.abs(di); tmax = i * dt; } if (i === Math.round(0.5 / dt)) d05 = Math.abs(di);
    if (i % every === 0) { t.push(i * dt); d.push(di); y.push(x[0]); yf.push(xf[0]); }
  }
  return { t, d, y, yf, dmax, tmax, d05, zEnd: x[0], K, L, N };
}

/* ───────────── DISH (antenna positioner) ───────────── */
export const dishG = (J: number = DISH.J, B: number = DISH.B): TF => tf([1 / J], [1, B / J, 0]);
export const dishLagG = (lag: number = DISH.lag): TF => tf([1 / DISH.J], polyMul([1, DISH.B / DISH.J, 0], [lag, 1]));
export function dishP(Kp: number) {
  const den = [1, DISH.B / DISH.J, Kp / DISH.J], wn = Math.sqrt(Kp / DISH.J), zeta = DISH.B / (2 * Math.sqrt(DISH.J * Kp));
  return { wn, zeta, poles: roots(den), m: stepMetrics(tf([Kp / DISH.J], den), 15) };
}
/** General dish loop (Euler, dt): PID with derivative filter N_f, D on measurement or error, torque limit and anti-windup, reference r(t), wind d(t) (N·m), seeded sensor noise (rad rms). */
export interface DishSimOpts { Kp: number; Ki?: number; Kd?: number; Nf?: number; dm?: boolean; r?: (t: number) => number; d?: (t: number) => number; umax?: number | null; aw?: 'none' | 'clamp' | 'backcalc'; noise?: number; seed?: number; T?: number; dt?: number; every?: number; lag?: number }
export function dishSim(o: DishSimOpts) {
  const Kp = o.Kp, Ki = o.Ki ?? 0, Kd = o.Kd ?? 0, Nf = o.Nf ?? DISH.Nf, dm = o.dm ?? true, r = o.r ?? (() => DISH.step), d = o.d ?? (() => 0), umax = o.umax ?? Infinity, aw = o.aw ?? 'none';
  const T = o.T ?? 12, dt = o.dt ?? 2e-4, n = Math.round(T / dt), every = o.every ?? Math.max(1, Math.round(0.01 / dt)), lag = o.lag ?? 0;
  let th = 0, om = 0, xi = 0, xf = 0, ua = 0, nz = 0, seed = (o.seed ?? 99) >>> 0 || 1;
  const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const out = { t: [] as number[], y: [] as number[], u: [] as number[], ui: [] as number[], r: [] as number[], sat: [] as boolean[], unstable: false };
  const nEvery = Math.max(1, Math.round(0.01 / dt));
  for (let i = 0; i <= n; i++) {
    const t = i * dt; if (o.noise && i % nEvery === 0) nz = o.noise * gauss();
    const ym = th + nz, rr = r(t), e = rr - ym, ed = dm ? -ym : e;
    const ud = Kd ? Kd * Nf * (ed - xf) : 0, un = Kp * e + Ki * xi + ud, us = Math.max(-umax, Math.min(umax, un));
    if (i % every === 0) { out.t.push(t); out.y.push(th); out.u.push(us); out.ui.push(Ki * xi); out.r.push(rr); out.sat.push(us !== un); }
    if (!Number.isFinite(th) || Math.abs(th) > 1e3) { out.unstable = true; break; }
    let integ = e; if (Ki && umax < Infinity) { if (aw === 'clamp' && un !== us && (un - us) * e > 0) integ = 0; else if (aw === 'backcalc') integ = e + (us - un) / Math.max(Kp, 1e-9); }
    if (Ki) xi += dt * integ; if (Kd) xf += dt * Nf * (ed - xf);
    const torque = lag ? ua : us; if (lag) ua += (dt * (us - ua)) / lag;
    om += (dt * (torque + d(t) - DISH.B * om)) / DISH.J; th += dt * om;
  }
  return out;
}
/** Step metrics of a dishSim run around its reference level r. */
export function dishMetrics(t: number[], y: number[], r: number) { return metricsOf(t, y.map((q) => q / r), 1); }
/** Closed loop of the dish with PID, D on measurement (no zero) or on error. Ideal derivative (as numbers.py). */
export function dishPid(Kp: number, Ki: number, Kd: number, dOnError = false): TF {
  const J = DISH.J, Bf = DISH.B;
  if (!Ki) return tf(dOnError ? [Kd / J, Kp / J] : [Kp / J], [1, (Bf + Kd) / J, Kp / J]);
  return tf(dOnError ? [Kd / J, Kp / J, Ki / J] : [Kp / J, Ki / J], [1, (Bf + Kd) / J, Kp / J, Ki / J]);
}
/** Response of the angle to a wind torque step Td (N·m) under P/PI/PID (D on measurement): peak (deg), recovery to 0.05°, final. */
export function dishWind(Kp: number, Ki: number, Kd: number, Td: number = DISH.wind, T = 30, n = 30001) {
  const J = DISH.J, Bf = DISH.B; const G = Ki ? tf([Td / J, 0], [1, (Bf + Kd) / J, Kp / J, Ki / J]) : tf([Td / J], [1, (Bf + Kd) / J, Kp / J]);
  const r = step(G, T, n); let pk = -Infinity, ip = 0, last = -1;
  r.y.forEach((y, i) => { if (y > pk) { pk = y; ip = i; } if (Math.abs(deg(y)) > 0.05) last = i; });
  return { t: r.t, y: r.y, peakDeg: deg(pk), tPeak: r.t[ip], recover: last >= 0 ? r.t[last] : 0, finalDeg: deg(r.y[r.y.length - 1]) };
}
/** Torque-limited PID (D on measurement), optional clamping anti-windup; Euler like numbers.py. */
export function dishSat(Kp: number, Ki: number, Kd: number, r: number, umax: number | null, aw: boolean, T = 12, dt = 1e-4) {
  const n = Math.round(T / dt); let th = 0, om = 0, xi = 0, pk = -Infinity, last = -1, peakU = 0;
  const every = Math.max(1, Math.round(0.005 / dt)); const t: number[] = [], y: number[] = [], u: number[] = [], ii: number[] = [];
  for (let i = 0; i < n; i++) {
    const e = r - th, un = Kp * e + Ki * xi - Kd * om, us = umax ? Math.max(-umax, Math.min(umax, un)) : un;
    if (!(aw && us !== un)) xi += e * dt;
    om += (dt * (us - DISH.B * om)) / DISH.J; th += dt * om;
    pk = Math.max(pk, th); if (Math.abs(th - r) > 0.02 * r) last = i; peakU = Math.max(peakU, Math.abs(us));
    if (i % every === 0) { t.push(i * dt); y.push(th); u.push(us); ii.push(Ki * xi); }
  }
  return { t, y, u, ii, OS: (100 * (pk - r)) / r, Ts: last * dt, peakU };
}
/** Ziegler–Nichols on the dish with the amplifier lag: Routh gives Ku, ωu. */
export function dishZN(lag: number = DISH.lag) {
  // J·lag s³ + (J + B·lag) s² + B s + K = 0, normalised by J·lag
  const a2 = (DISH.J + DISH.B * lag) / (DISH.J * lag), a1 = DISH.B / (DISH.J * lag), k = 1 / (DISH.J * lag);
  const Ku = (a2 * a1) / k, wu = Math.sqrt(a1), Tu = (2 * Math.PI) / wu, Kp = 0.6 * Ku, Ti = Tu / 2, TD = Tu / 8;
  return { Ku, wu, Tu, Kp, Ti, TD, Ki: Kp / Ti, Kd: Kp * TD };
}
export function dishZNClosed(dOnError: boolean, lag: number = DISH.lag) {
  const z = dishZN(lag), pden = polyMul([DISH.J, DISH.B, 0], [lag, 1]), base = polyMul([1, 0], pden);
  return dOnError ? tf([z.Kd, z.Kp, z.Ki], polyAdd(base, [z.Kd, z.Kp, z.Ki])) : tf([z.Kp, z.Ki], polyAdd(polyAdd(base, [z.Kd, 0, 0]), [z.Kp, z.Ki]));
}
/** Performance indices for the step error E = (s + a1)/(s² + a1 s + a0). */
export const iseClosed = (a1: number, a0: number) => (a0 + a1 * a1) / (2 * a0 * a1);
export function iaeOf(a1: number, a0: number, T = 6, n = 20001, timeWeighted = false) {
  const r = impulse(tf([1, a1], [1, a1, a0]), T, n); let s = 0;
  for (let i = 1; i < r.t.length; i++) { const dt = r.t[i] - r.t[i - 1], w0 = timeWeighted ? r.t[i - 1] : 1, w1 = timeWeighted ? r.t[i] : 1; s += 0.5 * dt * (w0 * Math.abs(r.y[i - 1]) + w1 * Math.abs(r.y[i])); }
  return s;
}
/** Golden-section minimum of f on [lo, hi]. */
export function argmin(f: (x: number) => number, lo: number, hi: number, tol = 1e-4) {
  const g = (Math.sqrt(5) - 1) / 2; let a = lo, bb = hi, c = bb - g * (bb - a), d = a + g * (bb - a), fc = f(c), fd = f(d);
  while (bb - a > tol) { if (fc < fd) { bb = d; d = c; fd = fc; c = bb - g * (bb - a); fc = f(c); } else { a = c; c = d; fc = fd; d = a + g * (bb - a); fd = f(d); } }
  return (a + bb) / 2;
}
/** Dish rate-feedback (K_r) optimum under ISE/IAE/ITAE at a given Kp. */
export function dishIndexOptimum(kind: 'ISE' | 'IAE' | 'ITAE', Kp = 1000) {
  const a0 = Kp / DISH.J, a1Of = (Kr: number) => DISH.B / DISH.J + Kr / DISH.J;
  if (kind === 'ISE') { const a1 = Math.sqrt(a0); return { Kr: (a1 - DISH.B / DISH.J) * DISH.J, zeta: a1 / (2 * Math.sqrt(a0)) }; }
  const Kr = argmin((k) => iaeOf(a1Of(k), a0, 6, 6001, kind === 'ITAE'), 20, 300, 0.01);
  return { Kr, zeta: a1Of(Kr) / (2 * Math.sqrt(a0)) };
}

/* ───────────── exam examples kept as in the notes ───────────── */
/** LN2 telescope: E = (s + K/2)/(s² + (K/2)s + 2.5). */
export const telescopeISE = (K3: number) => 1 / K3 + 0.1 * K3;
export const telescopeIAE = (K3: number) => iaeOf(0.5 * K3, 2.5, 80, 40001);
/** LN2 frequency-matching reduction: Δ terms from the ascending denominator coefficients. */
export function deltaQ(asc: number[], q: number) {
  const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1)); const D = (k: number) => (k < asc.length ? fact(k) * asc[k] : 0);
  let s = 0; for (let k = 0; k <= 2 * q; k++) s += ((-1) ** (k + q) * D(k) * D(2 * q - k)) / (fact(k) * fact(2 * q - k)); return s;
}

/* ───────────── failure cards on the dish (numbers.py [F]) ───────────── */
/** One card run, exactly as numbers.py [F] `sim`: Euler at dt, PID with set-point weight b, D on measurement (or error) with an
 *  optional first-order D filter N_f, torque limit with clamping anti-windup, a pure measurement delay and a first-order sensor lag,
 *  and a wind torque that switches on at `twind`. Returns time, angle and the applied torque. */
export interface CardOpts { Kp: number; Ki: number; Kd: number; r?: number; T?: number; dt?: number; wind?: number; twind?: number | null; umax?: number | null; aw?: boolean; dm?: boolean; Nf?: number | null; delay?: number; lag?: number; b?: number }
export function dishCard(o: CardOpts) {
  const { Kp, Ki, Kd } = o, r = o.r ?? 0.1, T = o.T ?? 10, dt = o.dt ?? 1e-4, wind = o.wind ?? 0, twind = o.twind ?? null, umax = o.umax ?? null, aw = !!o.aw, dm = o.dm ?? true, Nf = o.Nf ?? null, delay = o.delay ?? 0, lag = o.lag ?? 0, bw = o.b ?? 1;
  const n = Math.trunc(T / dt), J = DISH.J, B = DISH.B; // int(T/dt) as numbers.py
  let th = 0, om = 0, I = 0, yf = 0, dstate = 0, yprev = 0;
  const L = delay > 0 ? Math.max(1, Math.round(delay / dt)) + 1 : 0, buf = new Float64Array(L); let bi = 0;
  const t = new Float64Array(n), y = new Float64Array(n), u = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let ym = th;
    if (L) { ym = buf[bi]; buf[bi] = th; bi = (bi + 1) % L; }
    if (lag > 0) { yf += (dt * (ym - yf)) / lag; ym = yf; }
    const e = r - ym, sig = dm ? -ym : e;
    let dsig: number;
    if (Nf === null) dsig = i === 0 ? (dm ? 0 : Kd ? e / dt : 0) : (sig - yprev) / dt;
    else { dstate += dt * Nf * (sig - dstate); dsig = i > 0 ? Nf * (sig - dstate) : Nf * sig; }
    yprev = sig;
    const uc = Kp * (bw * r - ym) + Ki * I + Kd * dsig;
    const us = umax !== null ? Math.max(-umax, Math.min(umax, uc)) : uc;
    // clamping as in [P7] and the windup dive: stop integrating whenever the torque is saturated
    if (!(aw && umax !== null && us !== uc)) I += e * dt;
    const d = twind !== null && i * dt >= twind ? wind : 0;
    om += ((us - B * om - d) / J) * dt; th += om * dt;
    t[i] = i * dt; y[i] = th; u[i] = us;
  }
  return { t, y, u };
}
/** numbers.py [F] `met`: %OS, Ts = time of the last sample outside ±2 %, Tr = 90 % crossing − 10 % crossing. `upto` cuts the run (twodof). */
export function cardMet(t: ArrayLike<number>, y: ArrayLike<number>, r: number, upto = Infinity) {
  let pk = -Infinity, last = -1, i10 = -1, i90 = -1;
  for (let i = 0; i < y.length && t[i] < upto; i++) {
    if (y[i] > pk) pk = y[i];
    if (Math.abs(y[i] - r) > 0.02 * Math.abs(r)) last = i;
    if (i10 < 0 && y[i] >= 0.1 * r) i10 = i; if (i90 < 0 && y[i] >= 0.9 * r) i90 = i;
  }
  return { OS: (100 * (pk - r)) / r, Ts: last >= 0 ? t[last] : 0, Tr: t[Math.max(i90, 0)] - t[Math.max(i10, 0)], unstable: !Number.isFinite(pk) || Math.abs(pk) > 100 * Math.abs(r) };
}
/** numbers.py [F] `windm`: pointing error after the wind arrives at tw (degrees, about the 0.1 rad target). */
export function cardWind(t: ArrayLike<number>, y: ArrayLike<number>, tw: number, r = 0.1) {
  let pk = 0, lastOut = -1, fin = 0;
  for (let i = 0; i < y.length; i++) { if (t[i] < tw) continue; const e = deg(y[i] - r); fin = e; if (Math.abs(e) > pk) pk = Math.abs(e); if (Math.abs(e) > 0.05) lastOut = i; }
  return { peak: pk, final: fin, recover: lastOut >= 0 ? t[lastOut] - tw : 0 };
}
/** REF with N̄ off (u = −k₁(z − r) − k₂ż): the body stops at k₁/(k + k₁) of the command. */
export const cornerNbarOffRatio = (K: number[] = cornerK(), p: Corner = cornerOf()) => K[0] / (p.k + K[0]);

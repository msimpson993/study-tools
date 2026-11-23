/**
 * Dynamics for the four project machines. Every formula and default follows the tutor's
 * /workspace/cs-lab/numbers.py. Tests pin the outputs against test/fixtures/numbers_output.txt.
 * Do not change a number to "make a test pass"; send mismatches back to the tutor.
 */
import { tf, step, polyRoots, c2dZoh, type TF, type SS } from '@study/core/dsp';
import { MOTOR, BORER, DISK, ENGINE } from './params';

export type Metrics = { os: number; tr: number; ts: number; tp: number; peak: number; yf: number };

/** Step metrics matching numbers.py `metrics()`: overshoot vs final; rise 10–90 %; settling = last exit from a ±2 % band. */
export function metrics(t: ArrayLike<number>, y: ArrayLike<number>, yf?: number, band = 0.02): Metrics {
  const n = t.length, last = y[n - 1];
  const yFinal = yf ?? last;
  let ymax = -Infinity, ymin = Infinity, iMax = 0, iMin = 0;
  for (let i = 0; i < n; i++) {
    if (y[i] > ymax) { ymax = y[i]; iMax = i; }
    if (y[i] < ymin) { ymin = y[i]; iMin = i; }
  }
  const os = yFinal > 0
    ? Math.max(0, (ymax - yFinal) / yFinal * 100)
    : Math.max(0, (yFinal - ymin) / -yFinal * 100);
  const s = Math.sign(yFinal) || 1, yfa = Math.abs(yFinal);
  let i10 = 0, i90 = 0, got10 = false, got90 = false;
  for (let i = 0; i < n; i++) {
    const ya = y[i] * s;
    if (!got10 && ya >= 0.1 * yfa) { i10 = i; got10 = true; }
    if (!got90 && ya >= 0.9 * yfa) { i90 = i; got90 = true; if (got10) break; }
  }
  let lastOut = -1;
  const thresh = band * Math.abs(yFinal);
  for (let i = 0; i < n; i++) if (Math.abs(y[i] - yFinal) > thresh) lastOut = i;
  const ts = lastOut < 0 ? 0 : lastOut + 1 < n ? t[lastOut + 1] : t[n - 1];
  const peak = yFinal > 0 ? ymax : ymin;
  const tp = yFinal > 0 ? t[iMax] : t[iMin];
  return { os, tr: t[i90] - t[i10], ts, tp, peak, yf: yFinal };
}

export const timeGrid = (T: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => (T * i) / (n - 1));

/** Unit-step response of a rational TF on linspace(0, T, n), same grid as numbers.py. */
export function stepTf(num: number[], den: number[], T: number, n = 200001): { t: number[]; y: number[] } {
  return step(tf(num, den), timeGrid(T, n));
}

/** Bisection, same role as scipy.optimize.brentq (xtol). */
export function brentq(f: (x: number) => number, a: number, b: number, xtol = 1e-4): number {
  let lo = a, hi = b, flo = f(lo);
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if (Math.abs(hi - lo) < xtol) return mid;
    if (flo * fm <= 0) { hi = mid; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

/* ───────────────────────────── motor ───────────────────────────── */

export type MotorP = { J: number; b: number; Km: number; Ra: number; Kb: number; Ka: number; Kt: number };

export const motorParams = (o: Partial<MotorP> = {}): MotorP => ({
  J: o.J ?? MOTOR.J, b: o.b ?? MOTOR.b, Km: o.Km ?? MOTOR.Km, Ra: o.Ra ?? MOTOR.Ra,
  Kb: o.Kb ?? MOTOR.Kb, Ka: o.Ka ?? MOTOR.Ka, Kt: o.Kt ?? MOTOR.Kt,
});

export function motorDrag(p: MotorP, closed: boolean): number {
  const emf = p.Km * p.Kb / p.Ra;
  return p.b + emf + (closed ? p.Km * p.Ka * p.Kt / p.Ra : 0);
}

export function motorNumbers(p: Partial<MotorP> = {}) {
  const m = motorParams(p);
  const emfFric = m.Km * m.Kb / m.Ra;
  const dOpen = m.b + emfFric;
  const loopFric = m.Km * m.Ka * m.Kt / m.Ra;
  const dClosed = dOpen + loopFric;
  const tauOpen = m.J / dOpen, tauClosed = m.J / dClosed;
  const woInf = -1 / dOpen, wcInf = -1 / dClosed;
  const wo = (t: number) => woInf * (1 - Math.exp(-t / tauOpen));
  const wc = (t: number) => wcInf * (1 - Math.exp(-t / tauClosed));
  const ratio = wcInf / woInf;
  const kaFor = (r: number) => ((dOpen / r) - dOpen) * m.Ra / (m.Km * m.Kt);
  return {
    m, emfFric, dOpen, dClosed, loopFric, tauOpen, tauClosed, woInf, wcInf, wo, wc, ratio,
    kaFor02: kaFor(0.02), speedUp: tauOpen / tauClosed,
    tfOpen: tf([-1], [m.J, dOpen]), tfClosed: tf([-1], [m.J, dClosed]),
  };
}

/* ───────────────────────────── boring machine ───────────────────────────── */

export function borerCommandTf(K: number, Kd: number = BORER.Kd): TF {
  return tf([Kd, K], [1, 1 + Kd, K]);
}
export function borerPushTf(K: number, Kd: number = BORER.Kd): TF {
  return tf([1], [1, 1 + Kd, K]);
}
/** Sensitivity S(s) = s(s+1)/(s² + (1+Kd)s + K). */
export function borerS(K: number, s: { re: number; im: number }, Kd: number = BORER.Kd): { re: number; im: number; mag: number } {
  // s(s+1) / (s² + (1+Kd)s + K)
  const sr = s.re, si = s.im;
  const numR = sr * (sr + 1) - si * si, numI = si * (sr + 1) + sr * si;
  const denR = sr * sr - si * si + (1 + Kd) * sr + K, denI = 2 * sr * si + (1 + Kd) * si;
  const d2 = denR * denR + denI * denI;
  const re = (numR * denR + numI * denI) / d2, im = (numI * denR - numR * denI) / d2;
  return { re, im, mag: Math.hypot(re, im) };
}

export function borerPoles(K: number, Kd: number = BORER.Kd) {
  return polyRoots([1, 1 + Kd, K]);
}
export function borerZero(K: number, Kd: number = BORER.Kd) {
  return Kd === 0 ? null : -K / Kd;
}
export function borerWnZeta(K: number, Kd: number = BORER.Kd) {
  const wn = Math.sqrt(K), zeta = (1 + Kd) / (2 * wn);
  return { wn, zeta };
}

export function borerStep(K: number, Kd: number = BORER.Kd, T = 4, n = 200001) {
  const r = stepTf([Kd, K], [1, 1 + Kd, K], T, n);
  return { ...r, m: metrics(r.t, r.y, 1) };
}
export function borerPush(K: number, Kd: number = BORER.Kd, T = 4, n = 200001) {
  const r = stepTf([1], [1, 1 + Kd, K], T, n);
  return { ...r, m: metrics(r.t, r.y, 1 / K) };
}

/* ───────────────────────────── disk head ───────────────────────────── */

export function diskDen(Ka: number): number[] {
  return [1, 1020, 20000, 5000 * Ka];
}
export function diskSeekTf(Ka: number): TF {
  return tf([5000 * Ka], diskDen(Ka));
}
/** Y/T_d = −(s+1000)/den. */
export function diskShockTf(Ka: number): TF {
  return tf([-1, -1000], diskDen(Ka));
}
export function diskStandTf(Ka: number): TF {
  return tf([5 * Ka], [1, 20, 5 * Ka]);
}
export function diskPoles(Ka: number) {
  return polyRoots(diskDen(Ka));
}
export function diskSeek(Ka: number, T = 3, n = 300001) {
  const r = stepTf([5000 * Ka], diskDen(Ka), T, n);
  return { ...r, m: metrics(r.t, r.y, 1) };
}
export function diskStand(Ka: number, T = 3, n = 300001) {
  const r = stepTf([5 * Ka], [1, 20, 5 * Ka], T, n);
  return { ...r, m: metrics(r.t, r.y, 1) };
}
export function diskShock(Ka: number, T = 2, n = 200001) {
  const r = stepTf([-1, -1000], diskDen(Ka), T, n);
  return { ...r, m: metrics(r.t, r.y, -1 / (5 * Ka)) };
}
export const diskKaMax = DISK.KaMax;
export const diskOscW = Math.sqrt(20000);

/* ───────────────────────────── engine (stand-in) ───────────────────────────── */

export const engineWn2 = ENGINE.wn * ENGINE.wn;
export const engine2ZWn = 2 * ENGINE.zeta * ENGINE.wn;

/** Plant G(jω) including the exact delay e^(−jωτ). */
export function engineGjw(w: number, K = ENGINE.K, wn = ENGINE.wn, z = ENGINE.zeta, tau = ENGINE.tau): { re: number; im: number; mag: number; ang: number } {
  const sRe = 0, sIm = w;
  const denR = 1 - (w * w) / (wn * wn), denI = 2 * z * w / wn;
  const d2 = denR * denR + denI * denI;
  // K / den, then multiply by e^(-j w tau)
  const gRe0 = K * denR / d2, gIm0 = -K * denI / d2;
  const c = Math.cos(w * tau), s = Math.sin(w * tau); // e^(-jθ) = cosθ - j sinθ
  const re = gRe0 * c + gIm0 * s, im = gIm0 * c - gRe0 * s;
  return { re, im, mag: Math.hypot(re, im), ang: Math.atan2(im, re) };
}

export function engineLoopJw(P: number, I: number, w: number, K = ENGINE.K, wn = ENGINE.wn, z = ENGINE.zeta, tau = ENGINE.tau) {
  const G = engineGjw(w, K, wn, z, tau);
  // C = P + I/(jω) = P - j I/ω
  const cRe = P, cIm = w === 0 ? 0 : -I / w;
  return { re: cRe * G.re - cIm * G.im, im: cRe * G.im + cIm * G.re };
}

function unwrap(prev: number, ang: number): number {
  let a = ang;
  while (a - prev > Math.PI) a -= 2 * Math.PI;
  while (a - prev < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Margins of L = C·G, matching numbers.py `margins()` (first sample past each crossing, no interpolation). */
export function engineMargins(P: number, I: number, K = ENGINE.K, wn = ENGINE.wn, z = ENGINE.zeta, tau = ENGINE.tau, n = 200001) {
  const nPts = n;
  const w: number[] = Array.from({ length: nPts }, (_, i) => 10 ** (-2 + (5 * i) / (nPts - 1)));
  const mag: number[] = [], ph: number[] = [];
  let prev = 0;
  for (let i = 0; i < nPts; i++) {
    const L = engineLoopJw(P, I, w[i], K, wn, z, tau);
    mag.push(Math.hypot(L.re, L.im));
    const a = unwrap(i ? prev : Math.atan2(L.im, L.re), Math.atan2(L.im, L.re));
    ph.push(a); prev = a;
  }
  let ic = -1, ip = -1;
  for (let i = 0; i < nPts - 1; i++) {
    if (ic < 0 && Math.sign(mag[i] - 1) !== Math.sign(mag[i + 1] - 1) && Math.sign(mag[i] - 1) !== 0) ic = i;
    if (ip < 0 && Math.sign(ph[i] + Math.PI) !== Math.sign(ph[i + 1] + Math.PI) && Math.sign(ph[i] + Math.PI) !== 0) ip = i;
  }
  // numbers.py uses the first index of the diff, i.e. i, and evaluates at w[i]
  const wc = ic >= 0 ? w[ic] : NaN, pm = ic >= 0 ? 180 + ph[ic] * (180 / Math.PI) : NaN;
  const wp = ip >= 0 ? w[ip] : NaN, gm = ip >= 0 ? -20 * Math.log10(mag[ip]) : NaN;
  return { wc, pm, wp, gm };
}

function matVec(A: number[][], x: number[], b: number[], u: number): number[] {
  return A.map((row, i) => row.reduce((s, a, j) => s + a * x[j], 0) + b[i] * u);
}

/**
 * PI loop on the stand-in engine with a sample-buffer delay (numbers.py `sim_engine`).
 * y is the speed, u the throttle; dt defaults to 0.2 ms.
 */
export function simEngine(
  P: number, I: number,
  opts: { T?: number; dt?: number; K?: number; wn?: number; z?: number; tau?: number; r?: number } = {},
): { t: number[]; y: number[]; u: number[] } {
  const T = opts.T ?? 8, dt = opts.dt ?? ENGINE.dt, K = opts.K ?? ENGINE.K, wn = opts.wn ?? ENGINE.wn;
  const z = opts.z ?? ENGINE.zeta, tau = opts.tau ?? ENGINE.tau, r = opts.r ?? 1;
  const ss: SS = {
    A: [[0, 1], [-wn * wn, -2 * z * wn]],
    B: [0, K * wn * wn],
    C: [1, 0],
    D: 0,
  };
  const { Ad, Bd } = c2dZoh(ss, dt);
  const nd = Math.round(tau / dt);
  const buf = new Array<number>(nd + 1).fill(0);
  const n = Math.floor(T / dt) + 1;
  let x = [0, 0], xi = 0;
  const t = new Array<number>(n), y = new Array<number>(n), u = new Array<number>(n);
  for (let k = 0; k < n; k++) {
    const e = r - x[0], uk = P * e + I * xi;
    u[k] = uk;
    // np.roll(buf, 1); buf[0] = uk; ud = buf[nd]
    for (let i = nd; i > 0; i--) buf[i] = buf[i - 1];
    buf[0] = uk;
    const ud = buf[nd];
    t[k] = k * dt; y[k] = x[0];
    x = matVec(Ad, x, Bd, ud);
    xi += e * dt;
  }
  return { t, y, u };
}

export function engineStep(P: number, I: number, T = 8, dt: number = ENGINE.dt) {
  const r = simEngine(P, I, { T, dt });
  return { ...r, m: metrics(r.t, r.y, 1) };
}

/** Wrap an angle to (−π, π], matching Python's (x+π)%(2π)−π. */
function wrapPi(x: number): number {
  const twopi = 2 * Math.PI;
  let t = (x + Math.PI) % twopi;
  if (t < 0) t += twopi;
  return t - Math.PI;
}

/**
 * Emulated PID Tuner: ωc = 2/t_resp; target PM = 100·rob (deg);
 * ∠C = −180° + PM − ∠G(jωc), clamped to [−90°, 0°]; |C| = 1/|G|; P = |C|cos∠C, I = −|C|sin∠C·ωc.
 */
export function tuner(resp: number, rob: number, K = ENGINE.K, wn = ENGINE.wn, z = ENGINE.zeta, tau = ENGINE.tau): { P: number; I: number; clamped: boolean } {
  const wc = 2 / resp;
  const G = engineGjw(wc, K, wn, z, tau);
  let phC = ((-180 + 100 * rob) * Math.PI) / 180 - G.ang;
  phC = wrapPi(phC);
  const magC = 1 / G.mag;
  let clamped = false;
  if (phC < -Math.PI / 2) { phC = -Math.PI / 2; clamped = true; }
  if (phC > 0) { phC = 0; clamped = true; }
  const P = Math.max(magC * Math.cos(phC), 0);
  const I = -magC * Math.sin(phC) * wc;
  return { P, I, clamped };
}

/** P-only steady error on the stand-in: 1/(1 + P·K_e). */
export const enginePError = (P: number, K = ENGINE.K) => 1 / (1 + P * K);

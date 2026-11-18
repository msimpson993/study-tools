/**
 * The two running examples, in the units the figures draw (pure, unit-tested).
 * Speaker: time in ms, s in 1/ms (= krad/s), frequency in Hz; H(s) = X/V normalised to 1 at DC.
 * House: x = (T₁, T₂) in K above outdoors, time in hours, heater power in kW.
 */
import { SPEAKER, SPK, HOUSE } from '@study/core/models';

export type V2 = [number, number];
export type M2 = [[number, number], [number, number]];
export type Cx = [number, number];
export const TAU = 2 * Math.PI;

/* ───────────── speaker ───────────── */
/** a₀ = k/m and a₁ = R/m in ms units; `damp` scales the total damping R (1 = the real speaker, ζ ≈ 0.28). */
export function spk(damp = 1) {
  const a0 = SPK.k / SPK.m / 1e6, a1 = (damp * SPK.Rtot) / SPK.m / 1e3, wn = Math.sqrt(a0), sigma = a1 / 2, zeta = a1 / (2 * wn);
  const d0 = sigma * sigma - a0, disc = Math.abs(d0) < 1e-9 ? 0 : d0, wd = Math.sqrt(Math.max(0, -disc));
  const poles: Cx[] = disc < 0 ? [[-sigma, wd], [-sigma, -wd]] : [[-sigma + Math.sqrt(disc), 0], [-sigma - Math.sqrt(disc), 0]];
  return { a0, a1, wn, sigma, zeta, wd, poles, fd: (wd * 1000) / TAU, fn: (wn * 1000) / TAU };
}
/** damping multiplier that makes the speaker critically damped (ζ = 1) */
export const DAMP_CRIT = 1 / spk(1).zeta;
/** DC displacement per volt, µm/V */
export const UM_PER_V = (SPEAKER.Bl / (SPEAKER.Re * SPK.k)) * 1e6;

/** Impulse response h(t) of H(s) = a₀/(s² + a₁s + a₀), t in ms (units 1/ms). */
export function hImp(t: number, damp = 1): number {
  if (t < 0) return 0;
  const p = spk(damp), d = p.sigma * p.sigma - p.a0;
  if (Math.abs(d) < 1e-9) return p.a0 * t * Math.exp(-p.sigma * t);
  if (d < 0) return (p.a0 / p.wd) * Math.exp(-p.sigma * t) * Math.sin(p.wd * t);
  const r = Math.sqrt(d), r1 = -p.sigma + r, r2 = -p.sigma - r;
  return (p.a0 / (r1 - r2)) * (Math.exp(r1 * t) - Math.exp(r2 * t));
}
/** The two pole terms of h(t) (complex-conjugate pair → their real sum split as two halves; repeated → a₀ t e^{−σt} and 0). */
export function hTerms(t: number, damp = 1): [number, number] {
  if (t < 0) return [0, 0];
  const p = spk(damp), d = p.sigma * p.sigma - p.a0;
  if (Math.abs(d) < 1e-9) return [p.a0 * t * Math.exp(-p.sigma * t), 0];
  if (d < 0) { const v = (p.a0 / p.wd) * Math.exp(-p.sigma * t) * Math.sin(p.wd * t); return [v / 2, v / 2]; }
  const r = Math.sqrt(d), r1 = -p.sigma + r, r2 = -p.sigma - r, c = p.a0 / (r1 - r2);
  return [c * Math.exp(r1 * t), -c * Math.exp(r2 * t)];
}
/** Residue of H(s) at its upper (or first real) pole: c = a₀/(p₁ − p₂). */
export function residue(damp = 1): Cx {
  const p = spk(damp), [p1, p2] = p.poles, den: Cx = [p1[0] - p2[0], p1[1] - p2[1]], m = den[0] ** 2 + den[1] ** 2 || 1e-12;
  return [(p.a0 * den[0]) / m, (-p.a0 * den[1]) / m];
}
export const cmul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
export const cdiv = (a: Cx, b: Cx): Cx => { const m = b[0] ** 2 + b[1] ** 2 || 1e-300; return [(a[0] * b[0] + a[1] * b[1]) / m, (a[1] * b[0] - a[0] * b[1]) / m]; };
export const cabs = (a: Cx) => Math.hypot(a[0], a[1]);
/** H(s) for complex s in 1/ms. */
export function Hs(s: Cx, damp = 1): Cx { const p = spk(damp); return cdiv([p.a0, 0], [s[0] * s[0] - s[1] * s[1] + p.a1 * s[0] + p.a0, 2 * s[0] * s[1] + p.a1 * s[1]]); }
/** H(j2πf), f in Hz. */
export const Hf = (fHz: number, damp = 1): Cx => Hs([0, (TAU * fHz) / 1000], damp);
export const dB = (x: number) => 20 * Math.log10(Math.max(1e-12, x));
/** Frequency of the |H| peak and the −3 dB band (Hz), by a fine scan. */
export function peakBand(damp = 1) {
  let pk = 0, fp = 0;
  for (let f = 1; f <= 4000; f += 0.5) { const m = cabs(Hf(f, damp)); if (m > pk) { pk = m; fp = f; } }
  let lo = NaN, hi = NaN;
  for (let f = 1; f <= 4000; f += 0.5) if (cabs(Hf(f, damp)) >= pk / Math.SQRT2) { if (Number.isNaN(lo)) lo = f; hi = f; }
  return { fPeak: fp, peak: pk, lo, hi };
}
/** Laplace transform of h weighted on [0, T] numerically (for the ROC picture): ∫ h(t) e^{−st} dt. */
export function laplaceNum(s: Cx, h: (t: number) => number, T = 12, n = 1200): Cx {
  let re = 0, im = 0; const dt = T / n;
  for (let i = 0; i <= n; i++) { const t = i * dt, w = (i === 0 || i === n ? 0.5 : 1) * dt * h(t) * Math.exp(-s[0] * t); re += w * Math.cos(s[1] * t); im -= w * Math.sin(s[1] * t); }
  return [re, im];
}

/* sampled ring (impulse invariance): x[n] = T·h(nT) = b₁ rⁿ sin(θn)/sin θ, T = 1/fs */
export function ringDigital(fsKHz = 8, damp = 1) {
  const p = spk(damp), T = 1 / fsKHz, r = Math.exp(-p.sigma * T), th = p.wd * T, b1 = (T * p.a0 * r * Math.sin(th)) / Math.max(1e-12, p.wd);
  return { T, r, th, b1, a1: -2 * r * Math.cos(th), a2: r * r, fRing: (th * fsKHz * 1000) / TAU };
}
/** x[n] = T·h(nT) */
export const ringSample = (n: number, fsKHz = 8, damp = 1) => (n < 0 ? 0 : hImp(n / fsKHz, damp) / fsKHz);
/** DTFT of the sampled ring, closed form b₁e^{−jΩ}/(1 + a₁e^{−jΩ} + a₂e^{−2jΩ}). */
export function ringDTFT(Om: number, fsKHz = 8, damp = 1): Cx {
  const d = ringDigital(fsKHz, damp), e1: Cx = [Math.cos(Om), -Math.sin(Om)], e2: Cx = [Math.cos(2 * Om), -Math.sin(2 * Om)];
  return cdiv([d.b1 * e1[0], d.b1 * e1[1]], [1 + d.a1 * e1[0] + d.a2 * e2[0], d.a1 * e1[1] + d.a2 * e2[1]]);
}
/** The same digital model run as a difference equation y[n] = −a₁y[n−1] − a₂y[n−2] + b₁x[n−1]. */
export function diffEq(x: number[], fsKHz = 8, damp = 1): number[] {
  const d = ringDigital(fsKHz, damp), y: number[] = [];
  for (let n = 0; n < x.length; n++) y.push(-d.a1 * (y[n - 1] ?? 0) - d.a2 * (y[n - 2] ?? 0) + d.b1 * (x[n - 1] ?? 0));
  return y;
}
/** |DFT| of N samples of a steady cosine of f Hz at fs, optionally Hann-windowed, normalised so an on-bin tone reads 1 (0 dB). */
export function humDFT(fHz: number, N = 64, fsHz = 8000, hann = false): number[] {
  const x = Array.from({ length: N }, (_, n) => Math.cos((TAU * fHz * n) / fsHz) * (hann ? 0.5 - 0.5 * Math.cos((TAU * n) / N) : 1));
  const g = hann ? N / 4 : N / 2, out: number[] = [];
  for (let k = 0; k <= N / 2; k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const a = (-TAU * k * n) / N; re += x[n] * Math.cos(a); im += x[n] * Math.sin(a); } out.push(Math.hypot(re, im) / g); }
  return out;
}
/** |DFT| of N samples of the click ring (fs in kHz). */
export function ringDFT(N = 64, fsKHz = 8, damp = 1): number[] {
  const x = Array.from({ length: N }, (_, n) => ringSample(n, fsKHz, damp)), out: number[] = [];
  for (let k = 0; k < N; k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const a = (-TAU * k * n) / N; re += x[n] * Math.cos(a); im += x[n] * Math.sin(a); } out.push(Math.hypot(re, im)); }
  return out;
}
/** Alias of f (Hz) when sampled at fs (Hz): the frequency in [0, fs/2] that the samples show. */
export const aliasOf = (f: number, fs: number) => Math.abs(f - Math.round(f / fs) * fs);
/** ±1 square wave of f₀ Hz: cosine-free sine series b_k = 4/(πk) for odd k. Returns harmonic k's drive amplitude. */
export const squareCoef = (k: number) => (k % 2 ? 4 / (Math.PI * k) : 0);
/** Share of the square wave's power (mean square 1) carried by harmonics 1..N (Parseval: Σ b_k²/2 = 1). */
export const squarePowerShare = (N: number) => { let s = 0; for (let k = 1; k <= N; k++) s += squareCoef(k) ** 2 / 2; return s; };

/* ───────────── house ───────────── */
export const HB = 3600 / HOUSE.Cth * 1000; // K/h per kW (= 3.6)
export const houseA = (kw = 1, leak = 0.2): M2 => [[-kw - leak, kw], [kw, -kw - leak]];
export const houseEig = (kw = 1, leak = 0.2) => ({ avg: -leak, diff: -leak - 2 * kw });
export const heaterB = (split = 1): V2 => [HB * split, HB * (1 - split)];
export const mulM = (A: M2, B: M2): M2 => [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];
export const mulMV = (A: M2, v: V2): V2 => [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
export const tr = (A: M2): M2 => [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
export const det = (A: M2) => A[0][0] * A[1][1] - A[0][1] * A[1][0];
/** Eigenvalues of a real 2×2 matrix (re, im). */
export function eigs(A: M2): [Cx, Cx] {
  const t = A[0][0] + A[1][1], d = det(A), disc = (t * t) / 4 - d;
  return disc >= 0 ? [[t / 2 + Math.sqrt(disc), 0], [t / 2 - Math.sqrt(disc), 0]] : [[t / 2, Math.sqrt(-disc)], [t / 2, -Math.sqrt(-disc)]];
}
/** Cayley–Hamilton: e^{At} = α₀(t) I + α₁(t) A for any real 2×2 A (distinct, repeated or complex eigenvalues). */
export function cayley(A: M2, t: number): { a0: number; a1: number } {
  const [l1, l2] = eigs(A);
  if (l1[1] !== 0) { const s = l1[0], w = l1[1], e = Math.exp(s * t); const a1 = (e * Math.sin(w * t)) / w; return { a1, a0: e * Math.cos(w * t) - s * a1 }; }
  if (Math.abs(l1[0] - l2[0]) < 1e-9) { const l = l1[0], e = Math.exp(l * t); return { a1: t * e, a0: e - l * t * e }; }
  const e1 = Math.exp(l1[0] * t), e2 = Math.exp(l2[0] * t), dl = l1[0] - l2[0];
  return { a1: (e1 - e2) / dl, a0: (l1[0] * e2 - l2[0] * e1) / dl };
}
export function expm2(A: M2, t: number): M2 { const { a0, a1 } = cayley(A, t); return [[a0 + a1 * A[0][0], a1 * A[0][1]], [a1 * A[1][0], a0 + a1 * A[1][1]]]; }
/** House e^{At} from its two modes: ½[[e₁+e₂, e₁−e₂], [e₁−e₂, e₁+e₂]]. */
export function houseExpm(t: number, kw = 1, leak = 0.2): M2 { const { avg, diff } = houseEig(kw, leak), e1 = Math.exp(avg * t), e2 = Math.exp(diff * t); return [[(e1 + e2) / 2, (e1 - e2) / 2], [(e1 - e2) / 2, (e1 + e2) / 2]]; }
/** Modal coordinates of the house: ξ = (average, half-difference) so that x = ξ₁(1, 1) + ξ₂(1, −1). */
export const toModal = (x: V2): V2 => [(x[0] + x[1]) / 2, (x[0] - x[1]) / 2];
export const fromModal = (xi: V2): V2 => [xi[0] + xi[1], xi[0] - xi[1]];
/** Controllability matrix [B, AB] and its determinant for heater split s. */
export function ctrb(split = 1, kw = 1, leak = 0.2) { const A = houseA(kw, leak), B = heaterB(split), AB = mulMV(A, B); return { B, AB, det: B[0] * AB[1] - B[1] * AB[0] }; }
/** Observability matrix [C; CA] and its determinant for sensor weights C = (c, 1 − c). */
export function obsv(c = 1, kw = 1, leak = 0.2) { const A = houseA(kw, leak), C: V2 = [c, 1 - c], CA: V2 = [C[0] * A[0][0] + C[1] * A[1][0], C[0] * A[0][1] + C[1] * A[1][1]]; return { C, CA, det: C[0] * CA[1] - C[1] * CA[0] }; }
/** PBH / Kalman mode weights: how hard the heater pushes each mode (wᵀB) and how much the sensor sees it (Cv). */
export function modeWeights(split = 1, c = 1) { const B = heaterB(split); return { bAvg: (B[0] + B[1]) / 2, bDiff: (B[0] - B[1]) / 2, cAvg: c + (1 - c), cDiff: c - (1 - c) }; }
/** Controllability Gramian W(T) = ∫₀ᵀ e^{Aτ}BBᵀe^{Aᵀτ} dτ in K²/(kW²·h) (Simpson). */
export function gramian(T: number, split = 1, kw = 1, leak = 0.2, n = 400): M2 {
  const B = heaterB(split), W: M2 = [[0, 0], [0, 0]], h = T / n;
  for (let i = 0; i <= n; i++) {
    const wgt = (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * (h / 3), v = mulMV(houseExpm(i * h, kw, leak), B);
    W[0][0] += wgt * v[0] * v[0]; W[0][1] += wgt * v[0] * v[1]; W[1][1] += wgt * v[1] * v[1];
  }
  W[1][0] = W[0][1]; return W;
}
export const inv = (A: M2): M2 => { const d = det(A) || 1e-300; return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]]; };
/** Least energy E = dᵀ W⁻¹ d (kW²·h) to move from rest to d in time T. */
export function reachCost(d: V2, T: number, split = 1): number { const Wi = inv(gramian(T, split)), v = mulMV(Wi, d); return d[0] * v[0] + d[1] * v[1]; }
/** Eigen-decomposition of a symmetric 2×2 matrix (ascending), unit eigenvectors. */
export function symEig(W: M2): { l: V2; v: [V2, V2] } {
  const a = W[0][0], b = W[0][1], d = W[1][1], m = (a + d) / 2, r = Math.hypot((a - d) / 2, b), l1 = m - r, l2 = m + r;
  const v1: V2 = Math.abs(b) > 1e-12 ? [b, l1 - a] : a <= d ? [1, 0] : [0, 1], n1 = Math.hypot(v1[0], v1[1]);
  const u1: V2 = [v1[0] / n1, v1[1] / n1]; return { l: [l1, l2], v: [u1, [-u1[1], u1[0]]] };
}
/** Least-energy heater profile u(t) = Bᵀe^{Aᵀ(T−t)} W⁻¹ d (kW) from rest to target d at time T. */
export function leastEnergyU(d: V2, T: number, split = 1): (t: number) => number {
  const W = gramian(T, split), q = mulMV(inv(W), d), B = heaterB(split);
  return (t: number) => { const P = houseExpm(T - t), v = mulMV(tr(P), q); return B[0] * v[0] + B[1] * v[1]; };
}
/** RK4 for ẋ = Ax + Bu(t) (house units). */
export function simHouse(A: M2, B: V2, u: (t: number) => number, x0: V2, T: number, n = 300): { t: number[]; x: V2[] } {
  const ts: number[] = [], xs: V2[] = [], h = T / n; let x: V2 = [...x0] as V2;
  const f = (t: number, y: V2): V2 => { const ax = mulMV(A, y), uu = u(t); return [ax[0] + B[0] * uu, ax[1] + B[1] * uu]; };
  for (let i = 0; i <= n; i++) {
    const t = i * h; ts.push(t); xs.push([...x] as V2);
    const k1 = f(t, x), k2 = f(t + h / 2, [x[0] + (h / 2) * k1[0], x[1] + (h / 2) * k1[1]]), k3 = f(t + h / 2, [x[0] + (h / 2) * k2[0], x[1] + (h / 2) * k2[1]]), k4 = f(t + h, [x[0] + h * k3[0], x[1] + h * k3[1]]);
    x = [x[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), x[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
  }
  return { t: ts, x: xs };
}
/** Thermostat in room 1 driving the room-1 heater, u = −kp·T₁ (kp in kW per K): closed loop A − B kp C. */
export const thermostatA = (kp: number): M2 => { const A = houseA(); return [[A[0][0] - HB * kp, A[0][1]], [A[1][0], A[1][1]]]; };
/** The gain below which the loop is unstable: det(A − BkpC) = 0 ⇒ kp = (1/1.2 − 1.2)/3.6. */
export const KP_UNSTABLE = (1 / 1.2 - 1.2) / HB;

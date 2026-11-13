/**
 * Fixed-step closed-loop PID simulation (parallel form) and the usual loop-shaping helpers.
 *
 * CONTROLLER (parallel / "ideal with filtered D"):
 *     u_c = Kp·(b·r − y_m)  +  Ki·∫(r − y_m) dt  +  Kd·N·s/(s+N) · ed        e = r − y_m,  ed = e  (default)  or  −y_m  (dOnMeasurement)
 *   • Ki is the integral GAIN in 1/s units (Ki = Kp/Ti), Kd the derivative gain (Kd = Kp·Td); N is the derivative-filter
 *     pole in rad/s (filter 1/(1+s/N)), NOT the textbook "N = Td/Tf" ratio. Kd = 0 removes the filter state.
 *   • b ∈ [0,1] is the setpoint weight on the proportional term only (b = 1: standard error feedback; b = 0: P acts on
 *     −y only). The integral always acts on the full error, so there is no steady-state error from b.
 *   • Measurement noise n is added to y: y_m = y + n; noise is zero-order-held, Gaussian, seeded (xorshift32), period `noiseTs`.
 *
 * PLANT / SIGNALS:
 *   • Plant is a STRICTLY PROPER TF (no direct feed-through, so there is no algebraic loop). A step load disturbance
 *     `dist = {t, amp}` is ADDED AT THE PLANT INPUT: plant input = u_sat + d.
 *   • Actuator: u_sat = clamp(u_c, ±umax) (umax = null/Infinity: none).
 *   • Anti-windup (`aw`): 'none' | 'clamp' (conditional integration: the integrator stops while saturated and the error
 *     would push further into saturation; this is the legacy page's behaviour) | 'backcalc' (integrator state driven by
 *     Kt·(u_sat − u_c): d(ui)/dt = Ki·e + Kt·(u_sat − u_c); Kt in 1/s, default Ki/Kp = 1/Ti, or 1 when Kp = 0).
 *
 * NUMERICS:
 *   • Classic RK4. The output grid is `dt`; internally the step is split into `substeps` so that h·|λ|max ≤ 0.2 for the
 *     fastest of {plant poles, derivative filter N, closed-loop poles of the linear loop}, capped at 400 (a warning is
 *     returned if the cap binds). RK4 is stable for h·|λ| < 2.78, so the default 0.2 gives errors ≪ 1e-6 for smooth
 *     responses. Discontinuities (setpoint step at t = 0, disturbance at td, saturation corners) are resolved only to
 *     O(h): the disturbance switches at the first RK4 stage time ≥ td. Use dt ≤ td-resolution you care about.
 *   • Unstable closed loops stop when |y| > 1e4 (`unstable: true`, arrays truncated at that point).
 *
 * MATCHING THE LEGACY PAGE (/workspace/pid-tuning/src/pidsim.js, plants p1/p2/p3): with b = 1, aw ∈ {none, clamp},
 * dOnMeasurement as `dmeas` and the same seed, `simulatePid` reproduces its y/u/e trajectories to ~1e-9 when
 * substeps = 1 (checked against a frozen fixture in tests). Differences, all deliberate:
 *   1. `substeps` — legacy always integrates with the output dt; for dt·|λ|max > 0.2 (e.g. N = 100 at dt = 0.01) this
 *      code is MORE accurate than legacy.
 *   2. Metrics: legacy `os` is NaN for a non-positive final value and `ts` is the first SAMPLE after the last band
 *      violation; here overshoot is relative to |yFinal| (sign-aware) and Ts is interpolated to the band edge (≤ dt apart).
 *   3. New: setpoint weight b, 'backcalc' anti-windup, IAE/ISE, sensor-noise period option.
 *   Output `e` is the TRUE error r − y (no noise), exactly as in legacy.
 */
import { type Cx } from './complex';
import { TFError, tf, tfSeries, tfParallel, tfFeedback, tfPoles, polyAdd, polyRoots, stepMetrics, tf2ss, type TF } from './tf';

export type PlantId = 'p1' | 'p2' | 'p3';
/** Unity-DC-gain lags used by the original PID guide (G(s) = 1/(s+1), 1/((s+1)(0.5s+1)), 1/(s+1)³). */
export const PID_PLANTS: Record<PlantId, { name: string; label: string; tf: TF }> = {
  p1: { name: '1/(s+1)', label: 'First-order lag  G(s) = 1/(s + 1)', tf: tf([1], [1, 1]) },
  p2: { name: '1/((s+1)(0.5s+1))', label: 'Second-order lag  G(s) = 1/((s + 1)(0.5s + 1))', tf: tf([1], [0.5, 1.5, 1]) },
  p3: { name: '1/(s+1)^3', label: 'Third-order lag  G(s) = 1/(s + 1)³', tf: tf([1], [1, 3, 3, 1]) },
};
export type AntiWindup = 'none' | 'clamp' | 'backcalc';
export interface PidGains { Kp: number; Ki: number; Kd: number; N?: number }
export interface PidSimOptions extends Partial<PidGains> {
  plant: PlantId | TF;
  /** setpoint weight on P (default 1) */ b?: number;
  /** derivative acts on −y_m instead of the error (default false) */ dOnMeasurement?: boolean;
  /** horizon in s (default 20) */ T?: number; /** output step in s (default 0.01) */ dt?: number; /** reference level (default 1) */ r?: number;
  /** actuator limit ±umax; null/Infinity = none */ umax?: number | null;
  aw?: AntiWindup; Kt?: number;
  dist?: { t: number; amp: number } | null;
  /** sensor noise standard deviation (default 0) */ noise?: number; noiseTs?: number; seed?: number;
}
export interface PidSim {
  t: number[]; r: number[]; y: number[]; /** applied (saturated) control */ u: number[]; /** true error r − y */ e: number[]; /** measured y + noise */ ym: number[];
  up: number[]; ui: number[]; ud: number[]; /** disturbance signal */ d: number[];
  unstable: boolean; substeps: number; dt: number; warnings: string[];
}

/** Controller transfer function Kp + Ki/s + Kd·N·s/(s+N) (b and saturation are not representable here). */
export function pidTF(g: PidGains): TF {
  const N = g.N ?? 20; let c = tf([g.Kp || 0], [1]);
  if (g.Ki) c = tfParallel(c, tf([g.Ki], [1, 0]));
  if (g.Kd) { if (!(N > 0)) throw new TFError('pidTF: N must be > 0'); c = tfParallel(c, tf([g.Kd * N, 0], [1, N])); }
  return c;
}
const plantTF = (p: PlantId | TF): TF => (typeof p === 'string' ? (PID_PLANTS[p] ?? (() => { throw new TFError(`unknown plant ${p}`); })()).tf : p);
/** Loop transfer function L = C·G. */
export const pidLoopTF = (plant: PlantId | TF, g: PidGains): TF => tfSeries(pidTF(g), plantTF(plant));
/** Reference→output transfer function T = L/(1+L) (valid for b = 1, no saturation, no noise). */
export const pidClosedLoopTF = (plant: PlantId | TF, g: PidGains): TF => tfFeedback(pidLoopTF(plant, g));
/** Closed-loop poles, the roots of C.den·G.den + C.num·G.num. */
export function pidClosedLoopPoles(plant: PlantId | TF, g: PidGains): Cx[] { const L = pidLoopTF(plant, g); return polyRoots(polyAdd(L.den, L.num)); }

/** xorshift32 seeded generator used by the legacy page (so seeded noise matches it). */
export function seededRng(seed: number): () => number { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

export function simulatePid(o: PidSimOptions): PidSim {
  const G = plantTF(o.plant), ss = tf2ss(G), n = ss.A.length;
  if (Math.abs(ss.D) > 0 || G.num.length > G.den.length) throw new TFError('simulatePid: the plant must be strictly proper (no direct feed-through)');
  if (n === 0) throw new TFError('simulatePid: plant needs at least one state');
  const Kp = o.Kp ?? 0, Ki = o.Ki ?? 0, Kd = o.Kd ?? 0, N = o.N ?? 20, b = o.b ?? 1, r = o.r ?? 1, T = o.T ?? 20, dt = o.dt ?? 0.01;
  const nums = { Kp, Ki, Kd, N, b, r, T, dt };
  for (const [k, v] of Object.entries(nums)) if (!Number.isFinite(v)) throw new TFError(`simulatePid: ${k} must be a finite number`);
  if (!(T > 0) || !(dt > 0) || dt > T) throw new TFError('simulatePid: need 0 < dt ≤ T');
  if (Kd !== 0 && !(N > 0)) throw new TFError('simulatePid: N must be > 0 when Kd ≠ 0');
  if (b < 0 || b > 1.0000001) throw new TFError('simulatePid: setpoint weight b must be in [0, 1]');
  const umax = o.umax == null || o.umax === Infinity ? Infinity : o.umax;
  if (!(umax > 0)) throw new TFError('simulatePid: umax must be > 0 (or null for no limit)');
  const aw: AntiWindup = o.aw ?? 'none';
  const Kt = o.Kt ?? (Kp > 0 && Ki > 0 ? Ki / Kp : 1);
  const sig = o.noise ?? 0, noiseTs = o.noiseTs ?? 0.01, rand = seededRng(o.seed ?? 12345);
  const gauss = () => { const u1 = rand() || 1e-12, u2 = rand(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
  const dist = o.dist ?? null, dmeas = !!o.dOnMeasurement;

  // sub-stepping for accuracy/stability
  const warnings: string[] = [];
  let lam = Math.max(...tfPoles(G).map((p) => Math.hypot(p.re, p.im)), 0);
  if (Kd) lam = Math.max(lam, N);
  try { for (const p of pidClosedLoopPoles(G, { Kp, Ki, Kd, N })) lam = Math.max(lam, Math.hypot(p.re, p.im)); } catch { /* keep plant/filter estimate */ }
  let substeps = Math.max(1, Math.ceil((dt * lam) / 0.2));
  if (substeps > 400) { warnings.push(`step too coarse for the fastest mode (|λ| = ${lam.toExponential(2)} 1/s); capped at 400 substeps`); substeps = 400; }
  const h = dt / substeps;

  const { A, B, C: Cc } = ss, m = n + 2; // state: plant (n), integral of e (xi), derivative-filter state (xf)
  const S = new Float64Array(m);
  const yOf = (s: Float64Array) => { let y = 0; for (let i = 0; i < n; i++) y += Cc[i] * s[i]; return y; };
  const ctrl = (s: Float64Array, nv: number) => {
    const y = yOf(s), ym = y + nv, e = r - ym, ed = dmeas ? -ym : e;
    const up = Kp * (b * r - ym), ui = Ki * s[n], ud = Kd ? Kd * N * (ed - s[n + 1]) : 0, uu = up + ui + ud, us = Math.max(-umax, Math.min(umax, uu));
    return { y, ym, e, ed, up, ui, ud, uu, us };
  };
  const f = (s: Float64Array, t: number, nv: number, out: Float64Array) => {
    const c = ctrl(s, nv), d = dist && t >= dist.t ? dist.amp : 0, v = c.us + d;
    for (let i = 0; i < n; i++) { let a = B[i] * v; for (let j = 0; j < n; j++) a += A[i][j] * s[j]; out[i] = a; }
    let integ = c.e;
    if (Ki && umax < Infinity) {
      if (aw === 'clamp' && c.uu !== c.us && (c.uu - c.us) * c.e > 0) integ = 0;
      else if (aw === 'backcalc') integ = c.e + (Kt * (c.us - c.uu)) / Ki;
    }
    out[n] = Ki ? integ : 0; out[n + 1] = Kd ? N * (c.ed - s[n + 1]) : 0;
  };
  const steps = Math.round(T / dt), nEvery = Math.max(1, Math.round(noiseTs / dt));
  const out: PidSim = { t: [], r: [], y: [], u: [], e: [], ym: [], up: [], ui: [], ud: [], d: [], unstable: false, substeps, dt, warnings };
  let nv = 0;
  const k1 = new Float64Array(m), k2 = new Float64Array(m), k3 = new Float64Array(m), k4 = new Float64Array(m), tmp = new Float64Array(m);
  for (let k = 0; k <= steps; k++) {
    const t = k * dt;
    if (sig && k % nEvery === 0) nv = sig * gauss();
    const c = ctrl(S, nv);
    out.t.push(t); out.y.push(c.y); out.u.push(c.us); out.e.push(r - c.y); out.ym.push(c.ym); out.up.push(c.up); out.ui.push(c.ui); out.ud.push(c.ud); out.r.push(r); out.d.push(dist && t >= dist.t ? dist.amp : 0);
    if (!Number.isFinite(c.y) || Math.abs(c.y) > 1e4) { out.unstable = true; break; }
    if (k === steps) break;
    for (let q = 0; q < substeps; q++) {
      const ts = t + q * h;
      f(S, ts, nv, k1); for (let i = 0; i < m; i++) tmp[i] = S[i] + (h / 2) * k1[i];
      f(tmp, ts + h / 2, nv, k2); for (let i = 0; i < m; i++) tmp[i] = S[i] + (h / 2) * k2[i];
      f(tmp, ts + h / 2, nv, k3); for (let i = 0; i < m; i++) tmp[i] = S[i] + h * k3[i];
      f(tmp, ts + h, nv, k4);
      for (let i = 0; i < m; i++) S[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
  }
  return out;
}

export interface PidMetrics {
  unstable: boolean; /** ∫|e| dt over the window (true error, trapezoid) */ iae: number; /** ∫e² dt */ ise: number;
  overshootPct: number; settlingTime: number; /** reference − final value */ ess: number; /** max |applied u| */ peakU: number;
  riseTime: number; peak: number; peakTime: number; yFinal: number;
  /** response looks stationary in the last 20 % of the window and settles before 95 % of it */ settled: boolean;
}
/**
 * Metrics on the window [0, tEnd]: final value = mean of the last 5 % of the window (≥ 5 samples), band = ±2 % of it.
 * IAE/ISE are finite-horizon integrals: with a non-zero steady-state error they keep growing with the window length.
 * Overshoot and peak look at the WHOLE window, so a disturbance inside it counts (choose tEnd before td to isolate the setpoint response).
 */
export function pidMetrics(sim: PidSim, opts: { tEnd?: number; ref?: number; band?: number } = {}): PidMetrics {
  const nan = Number.NaN;
  if (sim.unstable) return { unstable: true, iae: nan, ise: nan, overshootPct: nan, settlingTime: nan, ess: nan, peakU: nan, riseTime: nan, peak: nan, peakTime: nan, yFinal: nan, settled: false };
  const ref = opts.ref ?? sim.r[0] ?? 1;
  let iEnd = sim.t.length - 1;
  if (opts.tEnd != null) for (let i = 0; i < sim.t.length; i++) if (sim.t[i] > opts.tEnd + 1e-12) { iEnd = i - 1; break; }
  if (iEnd < 4) throw new TFError('pidMetrics: window too short');
  const t = sim.t.slice(0, iEnd + 1), y = sim.y.slice(0, iEnd + 1);
  const w = Math.max(5, Math.round(0.05 * iEnd)); let yf = 0; for (let i = iEnd - w + 1; i <= iEnd; i++) yf += y[i]; yf /= w;
  let iae = 0, ise = 0, peakU = 0;
  for (let i = 1; i <= iEnd; i++) { const dt = t[i] - t[i - 1]; iae += 0.5 * (Math.abs(sim.e[i]) + Math.abs(sim.e[i - 1])) * dt; ise += 0.5 * (sim.e[i] ** 2 + sim.e[i - 1] ** 2) * dt; }
  for (let i = 0; i <= iEnd; i++) peakU = Math.max(peakU, Math.abs(sim.u[i]));
  const sm = stepMetrics(t, y, { final: yf, ref, band: opts.band });
  const j0 = Math.round(0.8 * iEnd); let lo = Infinity, hi = -Infinity; for (let i = j0; i <= iEnd; i++) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); }
  const stationary = hi - lo <= 0.04 * Math.max(Math.abs(yf), 1e-9);
  const settled = stationary && sm.settled && sm.settlingTime < t[iEnd] * 0.95;
  return { unstable: false, iae, ise, overshootPct: sm.overshootPct, settlingTime: sm.settlingTime, ess: ref - yf, peakU, riseTime: sm.riseTime, peak: sm.peak, peakTime: sm.peakTime, yFinal: yf, settled };
}

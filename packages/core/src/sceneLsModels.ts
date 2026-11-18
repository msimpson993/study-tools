/**
 * Models behind the two linear-systems scenes (pure, unit-tested): the earbud micro-speaker and the two-room house.
 */

/* ───────────── the earbud speaker (Thiele–Small parameters, SI units) ───────────── */
export const SPEAKER = { Mms: 0.084e-3, Rms: 0.173, Cms: 0.587e-3, Bl: 0.545, Re: 7.47, Le: 0.04e-3 } as const;
export function speakerDerived(p: { Mms: number; Rms: number; Cms: number; Bl: number; Re: number; Le: number } = SPEAKER) {
  const k = 1 / p.Cms, m = p.Mms, ws = Math.sqrt(k / m), Rel = (p.Bl * p.Bl) / p.Re, Rtot = p.Rms + Rel, crit = 2 * Math.sqrt(k * m);
  const zeta = Rtot / crit, zetaMech = p.Rms / crit, sigma = zeta * ws, wd = ws * Math.sqrt(Math.max(0, 1 - zeta * zeta));
  const Qms = (ws * m) / p.Rms, Qes = (ws * m * p.Re) / (p.Bl * p.Bl), Qts = (Qms * Qes) / (Qms + Qes);
  return {
    k, m, ws, fs: ws / (2 * Math.PI), Rel, Rtot, crit, zeta, zetaMech, sigma, wd, fd: wd / (2 * Math.PI), Qms, Qes, Qts,
    coilPole: -p.Re / p.Le,
    /** displacement per volt at DC (m/V) */ dcGain: p.Bl / (p.Re * k),
    /** frequency of the |X/V| peak (Hz) */ fPeak: (ws * Math.sqrt(Math.max(0, 1 - 2 * zeta * zeta))) / (2 * Math.PI),
    A: [[0, 1], [-k / m, -Rtot / m]] as [[number, number], [number, number]],
    B: [0, p.Bl / (p.Re * m)] as [number, number],
  };
}
export const SPK = speakerDerived();
/** |X/V|(f) relative to its DC value, for damping Rtot (default: the real speaker). */
export function speakerMag(f: number, Rtot = SPK.Rtot): number { const w = 2 * Math.PI * f, k = SPK.k, m = SPK.m; return k / Math.hypot(k - m * w * w, Rtot * w); }

/** RK4 of m ẍ + R ẋ + k x = (Bl/Re) V(t) on [0, T] (seconds); x in µm, v in mm/s. A click is an initial velocity. */
export function simulateSpeaker(V: (t: number) => number, T: number, o: { dt?: number; Rtot?: number; click?: number } = {}) {
  const dt = o.dt ?? 2e-6, n = Math.floor(T / dt) + 1, R = o.Rtot ?? SPK.Rtot, k = SPK.k, m = SPK.m, g = SPEAKER.Bl / SPEAKER.Re;
  const x = new Float64Array(n), v = new Float64Array(n), u = new Float64Array(n);
  let xx = 0, vv = (o.click ?? 0);
  const f = (t: number, a: number, b: number): [number, number] => [b, (g * V(t) - R * b - k * a) / m];
  for (let i = 0; i < n; i++) {
    const t = i * dt; x[i] = xx * 1e6; v[i] = vv * 1e3; u[i] = V(t);
    const k1 = f(t, xx, vv), k2 = f(t + dt / 2, xx + (dt / 2) * k1[0], vv + (dt / 2) * k1[1]), k3 = f(t + dt / 2, xx + (dt / 2) * k2[0], vv + (dt / 2) * k2[1]), k4 = f(t + dt, xx + dt * k3[0], vv + dt * k3[1]);
    xx += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); vv += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }
  return { dt, n, T, x, v, u };
}
/** Velocity jump (m/s) given by a voltage impulse of area q (V·s): Δẋ = (Bl/Re)·q/Mms. */
export const clickVelocity = (q: number) => ((SPEAKER.Bl / SPEAKER.Re) * q) / SPEAKER.Mms;

/* ───────────── the two-room house ───────────── */
/** Per hour. Temperatures in K above the outdoor temperature; heater power in W; C_th (J/K) is the heat capacity of a room. */
export const HOUSE = { A: [[-1.2, 1], [1, -1.2]] as [[number, number], [number, number]], Cth: 1.0e6, P: 1500, outdoor: 5, Tf: 3 } as const;
export const houseB = (Cth: number = HOUSE.Cth): number => 3600 / Cth; // K per hour per W
export const HOUSE_EIG = { avg: -0.2, diff: -2.2, tauAvg: 5, tauDiffMin: 60 / 2.2 } as const;
/** e^{At} for the symmetric house matrix: ½[[e₁ + e₂, e₁ − e₂], [e₁ − e₂, e₁ + e₂]], e₁ = e^{−0.2t}, e₂ = e^{−2.2t}. */
export function houseExpm(t: number): [[number, number], [number, number]] { const e1 = Math.exp(-0.2 * t), e2 = Math.exp(-2.2 * t); return [[(e1 + e2) / 2, (e1 - e2) / 2], [(e1 - e2) / 2, (e1 + e2) / 2]]; }
/** Steady state −A⁻¹Bu for a constant input vector bu (K/h). */
export function houseSteady(bu: [number, number]): [number, number] { const d = 1.44 - 1; return [(1.2 * bu[0] + bu[1]) / d, (bu[0] + 1.2 * bu[1]) / d]; }
/** Controllability Gramian W(T) = ∫₀ᵀ e^{Aτ} b bᵀ e^{Aᵀτ} dτ for b = (b₁, 0). Closed form via the modes. */
export function houseGramian(T: number, b1 = houseB()): [[number, number], [number, number]] {
  // e^{Aτ}b = (b₁/2)(e₁ + e₂, e₁ − e₂)
  const I = (a: number) => (1 - Math.exp(-a * T)) / a; // ∫ e^{−aτ}
  const s11 = I(0.4) + 2 * I(2.4) + I(4.4), s12 = I(0.4) - I(4.4), s22 = I(0.4) - 2 * I(2.4) + I(4.4), c = (b1 * b1) / 4;
  return [[c * s11, c * s12], [c * s12, c * s22]];
}
/** Least-energy heater power (W) that moves the house from x0 to xT in Tf hours: u(t) = bᵀ e^{Aᵀ(Tf−t)} W⁻¹ (xT − e^{A Tf} x0). (Pontryagin with L = u², λ constant along e^{−Aᵀt}.) */
export function houseOptimalU(x0: [number, number], xT: [number, number], Tf: number = HOUSE.Tf, b1 = houseB()) {
  const W = houseGramian(Tf, b1), E = houseExpm(Tf), r: [number, number] = [xT[0] - (E[0][0] * x0[0] + E[0][1] * x0[1]), xT[1] - (E[1][0] * x0[0] + E[1][1] * x0[1])];
  const det = W[0][0] * W[1][1] - W[0][1] * W[1][0], nu: [number, number] = [(W[1][1] * r[0] - W[0][1] * r[1]) / det, (-W[1][0] * r[0] + W[0][0] * r[1]) / det];
  return (t: number) => { const M = houseExpm(Tf - t); return b1 * (M[0][0] * nu[0] + M[0][1] * nu[1]); }; // symmetric e^{Aᵀ} = e^{A}; bᵀ picks row 1 × b₁
}
export interface HouseSim { dt: number; n: number; T: number; x1: Float64Array; x2: Float64Array; u1: Float64Array; u2: Float64Array }
/** RK4 of the house over T hours with heater powers u1(t), u2(t) in W (room 1, room 2). */
export function simulateHouse(x0: [number, number], u: (t: number) => [number, number], T: number, dt = 0.01, Cth: number = HOUSE.Cth): HouseSim {
  const n = Math.floor(T / dt + 1e-9) + 1, b = houseB(Cth), x1 = new Float64Array(n), x2 = new Float64Array(n), u1 = new Float64Array(n), u2 = new Float64Array(n);
  let a = x0[0], c = x0[1];
  const f = (t: number, p: number, q: number): [number, number] => { const [w1, w2] = u(t); return [-1.2 * p + q + b * w1, p - 1.2 * q + b * w2]; };
  for (let i = 0; i < n; i++) {
    const t = i * dt; const [w1, w2] = u(t); x1[i] = a; x2[i] = c; u1[i] = w1; u2[i] = w2;
    const k1 = f(t, a, c), k2 = f(t + dt / 2, a + (dt / 2) * k1[0], c + (dt / 2) * k1[1]), k3 = f(t + dt / 2, a + (dt / 2) * k2[0], c + (dt / 2) * k2[1]), k4 = f(t + dt, a + dt * k3[0], c + dt * k3[1]);
    a += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); c += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }
  return { dt, n, T, x1, x2, u1, u2 };
}

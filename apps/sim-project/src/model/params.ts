/** Handout and stand-in constants. Every value is the tutor's (numbers.py). Do not change. */

/** Example 4.4 / Table 4.2: armature-controlled DC motor. */
export const MOTOR = {
  Ra: 1,       // Ω
  Km: 10,      // N·m/A
  J: 2,        // kg·m²
  b: 0.5,      // N·m·s
  Kb: 0.1,     // V·s
  Ka: 54,      // amplifier gain
  Kt: 1,       // V·s (tachometer)
} as const;

/** Example 4.5: English Channel boring machine. Rate gain is fixed at 11 in the handout. */
export const BORER = {
  Kd: 11,
  K20: 20,
  K100: 100,
} as const;

/** §4.10 disk-drive head: coil 5000/(s+1000), arm 1/(s(s+20)). */
export const DISK = {
  coilNum: 5000,
  coilPole: 1000,
  armDamp: 20,
  Ka10: 10,
  Ka80: 80,
  /** Routh ceiling: 1020·20000/5000. */
  KaMax: 1020 * 20000 / 5000, // 4080
} as const;

/**
 * Stand-in engine (not in lab handout), rounded fit to the handout's four tuner tables:
 * G(s) = 311·3.42²·e^(−0.015s) / (s² + 6.3954s + 11.6964).
 */
export const ENGINE = {
  K: 311,
  wn: 3.42,
  zeta: 0.935,
  tau: 0.015,
  /** simulation step used in numbers.py */
  dt: 2e-4,
} as const;

/** Handout PID Tuner designs: (response time, robustness, P, I, Tr, Ts, OS%, peak, GM dB, w_gm, PM deg, w_pm). */
export const DESIGNS = {
  initial: { resp: 0.678, rob: 0.60, P: 0.0042253, I: 0.0092411, tr: 0.45, ts: 1.96, os: 7.5, peak: 1.08, gmDb: 25.4, wgm: 16.7, pm: 59.9, wpm: 2.95 },
  slower:  { resp: 3.1,   rob: 0.60, P: 0.0,       I: 0.0021263, tr: 2.06, ts: 3.45, os: 0.401, peak: 1.0, gmDb: 18.9, wgm: 3.27, pm: 69.3, wpm: 0.645 },
  final:   { resp: 1.5,   rob: 0.72, P: 0.0014551, I: 0.0043791, tr: 1.09, ts: 1.81, os: 0.0, peak: 0.999, gmDb: 32.8, wgm: 15.0, pm: 72.0, wpm: 1.33 },
} as const;

export type DesignName = keyof typeof DESIGNS;

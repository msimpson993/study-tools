/** Pure DSP helpers for the opt-in audio module (no Web Audio here, so they unit-test in Node). */
export interface Biquad { b: [number, number, number]; a: [number, number, number] } // a[0] = 1

/**
 * Bilinear transform of the analog low-pass H(s) = a0 / (s² + a1·s + a0) (s in rad/s), prewarped so the
 * digital response equals the analog one exactly at fWarp (Hz): s = K(1 − z⁻¹)/(1 + z⁻¹), K = ωw / tan(ωw / 2fs).
 */
export function bilinearLowpass2(a0: number, a1: number, fs: number, fWarp = Math.sqrt(a0) / (2 * Math.PI)): Biquad {
  const ww = 2 * Math.PI * fWarp, K = ww / Math.tan(ww / (2 * fs)), K2 = K * K;
  const d0 = K2 + a1 * K + a0, d1 = 2 * (a0 - K2), d2 = K2 - a1 * K + a0;
  return { b: [a0 / d0, (2 * a0) / d0, a0 / d0], a: [1, d1 / d0, d2 / d0] };
}
/** |H(e^{jω})| of a biquad at f Hz. */
export function biquadMag(c: Biquad, f: number, fs: number): number {
  const w = (2 * Math.PI * f) / fs, cr = (k: number) => Math.cos(k * w), si = (k: number) => -Math.sin(k * w);
  const nr = c.b[0] + c.b[1] * cr(1) + c.b[2] * cr(2), ni = c.b[1] * si(1) + c.b[2] * si(2);
  const dr = c.a[0] + c.a[1] * cr(1) + c.a[2] * cr(2), di = c.a[1] * si(1) + c.a[2] * si(2);
  return Math.hypot(nr, ni) / Math.hypot(dr, di);
}
/** Run a biquad over a signal (direct form I). */
export function biquadRun(c: Biquad, x: Float32Array): Float32Array {
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let n = 0; n < x.length; n++) { const v = c.b[0] * x[n] + c.b[1] * x1 + c.b[2] * x2 - c.a[1] * y1 - c.a[2] * y2; x2 = x1; x1 = x[n]; y2 = y1; y1 = v; y[n] = v; }
  return y;
}
/** Peak and −3 dB band of a magnitude function, scanned on [f0, f1] in steps of df Hz. */
export function peakBand(mag: (f: number) => number, f0 = 20, f1 = 5000, df = 0.1) {
  let pk = 0, fp = 0; for (let f = f0; f <= f1; f += df) { const m = mag(f); if (m > pk) { pk = m; fp = f; } }
  let lo = NaN, hi = NaN; const thr = pk / Math.SQRT2;
  for (let f = f0; f <= f1; f += df) if (mag(f) >= thr) { if (Number.isNaN(lo)) lo = f; hi = f; }
  return { fPeak: fp, peak: pk, peakDb: 20 * Math.log10(pk), lo, hi };
}
/** Exponential (log) sweep phase: instantaneous frequency f1·(f2/f1)^(t/T). */
export const logSweepFreq = (t: number, f1: number, f2: number, T: number) => f1 * Math.pow(f2 / f1, Math.min(1, Math.max(0, t / T)));
export function logSweep(fs: number, f1: number, f2: number, T: number): Float32Array {
  const n = Math.round(fs * T), x = new Float32Array(n), L = Math.log(f2 / f1);
  for (let i = 0; i < n; i++) { const t = i / fs; x[i] = Math.sin(((2 * Math.PI * f1 * T) / L) * (Math.exp((t * L) / T) - 1)); }
  return x;
}
/** Tone whose frequency follows f(t) (phase-continuous). */
export function chirp(fs: number, T: number, f: (t: number) => number): Float32Array {
  const n = Math.round(fs * T), x = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { x[i] = Math.sin(ph); ph += (2 * Math.PI * f(i / fs)) / fs; }
  return x;
}
/** Short linear fades (ms) at both ends so nothing clicks. */
export function fadeEnds(x: Float32Array, fs: number, ms = 8): Float32Array {
  const k = Math.min(Math.floor(x.length / 2), Math.round((fs * ms) / 1000));
  for (let i = 0; i < k; i++) { const g = i / k; x[i] *= g; x[x.length - 1 - i] *= g; }
  return x;
}
/** Scale so the largest |sample| sits at peakDb dBFS. */
export function normalizePeak(x: Float32Array, peakDb = -20): Float32Array {
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (!m) return x;
  const g = Math.pow(10, peakDb / 20) / m; for (let i = 0; i < x.length; i++) x[i] *= g; return x;
}
/** Apparent frequency of a tone f sampled at fs (folded into [0, fs/2]). */
export const foldFreq = (f: number, fs: number) => Math.abs(f - Math.round(f / fs) * fs);

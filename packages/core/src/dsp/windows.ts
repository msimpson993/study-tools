import { TAU } from './complex';
import { fftR2 } from './fft';

export type WindowKind = 'rect' | 'hann' | 'hamming' | 'blackman' | 'bh' | 'flattop' | 'kaiser' | 'tukey' | 'bartlett';

export interface WindowInfo { n: string; a?: number[]; ml: string; d: string }

/** Display names, MATLAB equivalents, cosine-sum coefficients and one-line guidance. */
export const WINS: Record<WindowKind, WindowInfo> = {
  rect: { n: 'Rectangular', a: [1], ml: 'rectwin(M)', d: 'No taper: narrowest main lobe, highest sidelobes. Exact for on-bin tones and for transients that fit inside the record.' },
  hann: { n: 'Hann', a: [0.5, 0.5], ml: 'hann(M,"periodic")', d: 'General-purpose. Sidelobes roll off at 18 dB/octave.' },
  hamming: { n: 'Hamming', a: [0.54, 0.46], ml: 'hamming(M,"periodic")', d: 'Places a null on the first Hann sidelobe (≈ −43 dB), but the far sidelobes barely decay. Good when interferers are close in.' },
  blackman: { n: 'Blackman', a: [0.42, 0.5, 0.08], ml: 'blackman(M,"periodic")', d: '3-term cosine sum: ≈ −58 dB sidelobes, with a wider main lobe.' },
  bh: { n: 'Blackman-Harris', a: [0.35875, 0.48829, 0.14128, 0.01168], ml: 'blackmanharris(M,"periodic")', d: '4-term, ≈ −92 dB sidelobes. For high-dynamic-range spectra such as spur and IMD measurements.' },
  flattop: { n: 'Flat-top', a: [0.21557895, 0.41663158, 0.277263158, 0.083578947, 0.006947368], ml: 'flattopwin(M,"periodic")', d: 'Very wide main lobe, but scallop loss ≈ 0 dB, so tones between bins read the right amplitude. Use it for calibration and power readings.' },
  kaiser: { n: 'Kaiser (β)', ml: 'kaiser(M,beta)', d: 'Tunable: larger β gives lower sidelobes and a wider lobe. β = 0 is rectangular, β ≈ 5 is Hamming-like, β ≈ 8.6 is Blackman-like.' },
  tukey: { n: 'Tukey (α)', ml: 'tukeywin(M,alpha)', d: 'Flat middle with cosine-tapered edges (α = tapered fraction). α = 0 is rectangular, α = 1 is Hann. Keeps most of a pulse unweighted.' },
  bartlett: { n: 'Bartlett (triangular)', ml: 'bartlett(M)', d: 'Triangle (rect ∗ rect): ≈ −26.5 dB sidelobes, falling at 12 dB/octave.' },
};

/** Modified Bessel function I0 (power series). */
export function I0(x: number): number {
  let s = 1, t = 1;
  for (let k = 1; k < 60; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; if (t < 1e-17 * s) break; }
  return s;
}

export interface WindowParams { beta?: number; alpha?: number }

/**
 * Window value at (possibly fractional) index n of an M-point window.
 * Cosine-sum windows are periodic (DFT-even, MATLAB "periodic"); Kaiser/Tukey/Bartlett are symmetric like MATLAB.
 */
export function windowAt(kind: WindowKind, n: number, M: number, p: WindowParams = {}): number {
  const W = WINS[kind];
  if (kind === 'rect') return 1;
  if (W.a) { let v = 0; W.a.forEach((a, k) => { v += (k % 2 ? -1 : 1) * a * Math.cos(TAU * k * n / M); }); return v; }
  if (M <= 1) return 1;
  const x = n / (M - 1);
  if (kind === 'kaiser') {
    const beta = p.beta ?? 6; const u = 2 * x - 1;
    return u < -1 || u > 1 ? 0 : I0(beta * Math.sqrt(Math.max(0, 1 - u * u))) / I0(beta);
  }
  if (kind === 'bartlett') return Math.max(0, 1 - Math.abs(2 * x - 1));
  if (kind === 'tukey') {
    const a = p.alpha ?? 0.5;
    if (a <= 0) return 1;
    if (x < a / 2) return 0.5 * (1 + Math.cos(TAU / a * (x - a / 2)));
    if (x > 1 - a / 2) return 0.5 * (1 + Math.cos(TAU / a * (x - 1 + a / 2)));
    return 1;
  }
  return 1;
}

export function windowSamples(kind: WindowKind, M: number, p: WindowParams = {}): number[] {
  const w: number[] = [];
  for (let n = 0; n < M; n++) w.push(windowAt(kind, n, M, p));
  return w;
}

export interface WindowMetrics {
  /** coherent gain Σw/M */ cg: number;
  /** equivalent noise bandwidth, bins */ enbw: number;
  /** scallop (half-bin) loss, dB */ scal: number;
  /** main-lobe full width (null to null), bins */ ml: number;
  /** −3 dB full width, bins */ bw3: number;
  /** peak sidelobe level, dB re peak */ psl: number;
}

export function windowMetrics(kind: WindowKind, M: number, p: WindowParams = {}): WindowMetrics {
  const w = windowSamples(kind, M, p);
  const s1 = w.reduce((a, b) => a + b, 0), s2 = w.reduce((a, b) => a + b * b, 0);
  let sr = 0, si = 0;
  w.forEach((v, n) => { sr += v * Math.cos(Math.PI * n / M); si -= v * Math.sin(Math.PI * n / M); });
  const pad = Math.max(32, Math.pow(2, Math.ceil(Math.log2(M * 64)))), P = pad / M;
  const re = new Float64Array(pad), im = new Float64Array(pad);
  w.forEach((v, n) => (re[n] = v));
  fftR2(re, im);
  const mag: number[] = [];
  for (let k = 0; k <= pad / 2; k++) mag.push(Math.hypot(re[k], im[k]));
  let k1 = 1;
  while (k1 < mag.length - 1 && !(mag[k1] <= mag[k1 - 1] && mag[k1] <= mag[k1 + 1])) k1++;
  let k3 = 0;
  while (k3 < mag.length - 1 && mag[k3] > mag[0] / Math.SQRT2) k3++;
  let psl = 0;
  for (let k = k1; k < mag.length; k++) psl = Math.max(psl, mag[k]);
  return {
    cg: s1 / M, enbw: M * s2 / (s1 * s1), scal: -20 * Math.log10(Math.hypot(sr, si) / s1),
    ml: 2 * k1 / P, bw3: 2 * k3 / P, psl: 20 * Math.log10(Math.max(psl, 1e-12) / mag[0]),
  };
}

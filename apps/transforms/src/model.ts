/**
 * The signal model behind every panel of the six-domains board.
 *
 * Both waveforms are X(s) = A (s − z0) / ((s − p1)(s − p2)) with x(0) = A:
 *   wave 'free': free response of s² + 2ζωₙ s + ωₙ² released from rest (x'(0)=0)  →  z0 = p1 + p2 = −2σ
 *   wave 'cos' : A e^{−σt}cos(ω_d t) (crit: A e^{−σt}, pole-zero cancel; over: A e^{−σt}cosh δt)  →  z0 = −σ
 *   under: p = −σ ± jω_d   crit: p1 = p2 = −σ   over: p = −σ ± δ
 * The z-domain model is the exact sampled version, so z-poles are e^{pT}.
 */
import { C, cadd, csub, cmul, cdiv, cabs, cexpj, cscale, cexp, TAU, type Cx } from '@study/core/dsp';

export interface ModelParams {
  A: number; wave: 'free' | 'cos'; mode: 'under' | 'crit' | 'over';
  sig: number; f0: number; dl: number; fs: number; M: number; N: number;
}

export interface Derived {
  T: number; mode: ModelParams['mode']; p1: Cx; p2: Cx; z0: Cx; q1: Cx; q2: Cx; R1: Cx | null; R2: Cx | null;
  rep: boolean; zz: Cx; wd: number; r: number; Wd: number; Wwrap: number; fa: number; wn: number; zeta: number;
  pmax: number; qmax: number; fchar: number; L: number; nyq: number; df: number; aliased: boolean;
}

export function derive(S: ModelParams): Derived {
  const T = 1 / S.fs, mode = S.mode;
  let p1: Cx, p2: Cx, wd = 0;
  if (mode === 'under') { wd = TAU * S.f0; p1 = C(-S.sig, wd); p2 = C(-S.sig, -wd); }
  else if (mode === 'crit') { p1 = C(-S.sig); p2 = C(-S.sig); }
  else { p1 = C(-S.sig + S.dl); p2 = C(-S.sig - S.dl); }
  const rep = mode === 'crit', z0 = S.wave === 'cos' ? C(-S.sig) : cadd(p1, p2);
  const q1 = cexp(cscale(p1, T)), q2 = cexp(cscale(p2, T));
  let R1: Cx | null = null, R2: Cx | null = null, zz: Cx;
  if (!rep) {
    R1 = cdiv(csub(p1, z0), csub(p1, p2)); R2 = cdiv(csub(p2, z0), csub(p2, p1));
    zz = cadd(cmul(R1, q2), cmul(R2, q1));
  } else { const c = (p1.re - z0.re) * T; zz = C(q1.re * (1 - c)); } // the zero of X(z) besides z = 0
  const Wd = wd * T, Wwrap = Math.atan2(Math.sin(Wd), Math.cos(Wd));
  const fa = mode === 'under' ? Math.abs(S.f0 - S.fs * Math.round(S.f0 / S.fs)) : 0;
  const prod = cmul(p1, p2).re, wn = prod > 0 ? Math.sqrt(prod) : NaN, zeta = prod > 0 ? S.sig / wn : NaN;
  const pmax = Math.max(p1.re, p2.re), qmax = Math.max(cabs(q1), cabs(q2));
  const fchar = mode === 'under' ? S.f0 : (isFinite(wn) ? wn / TAU : Math.abs(pmax) / TAU + 0.2);
  return {
    T, mode, p1, p2, z0, q1, q2, R1, R2, rep, zz, wd, r: cabs(q1), Wd, Wwrap, fa, wn, zeta, pmax, qmax, fchar,
    L: Math.min(S.M, S.N), nyq: S.fs / 2, df: S.fs / S.N, aliased: mode === 'under' && S.f0 > S.fs / 2 + 1e-12,
  };
}

/** x(t), causal. */
export function xt(t: number, d: Derived, S: Pick<ModelParams, 'A'>): number {
  if (t < 0) return 0;
  if (d.rep) { const p = d.p1.re; return S.A * Math.exp(p * t) * (1 + (p - d.z0.re) * t); }
  const e1 = cmul(d.R1!, cscale(cexpj(d.p1.im * t), Math.exp(d.p1.re * t)));
  const e2 = cmul(d.R2!, cscale(cexpj(d.p2.im * t), Math.exp(d.p2.re * t)));
  return S.A * (e1.re + e2.re);
}

/** Laplace transform X(s). */
export const Xs = (s: Cx, d: Derived, S: Pick<ModelParams, 'A'>): Cx =>
  cscale(cdiv(csub(s, d.z0), cmul(csub(s, d.p1), csub(s, d.p2))), S.A);

/** Fourier transform X(jω) (valid for σ > 0). */
export const Xjw = (w: number, d: Derived, S: Pick<ModelParams, 'A'>): Cx => Xs(C(0, w), d, S);

/** Z-transform of the samples x(nT), closed form. */
export function Xz(z: Cx, d: Derived, S: Pick<ModelParams, 'A'>): Cx {
  if (d.rep) {
    const q = d.q1, c = (d.p1.re - d.z0.re) * d.T, zq = csub(z, q); // z/(z−q) + c q z/(z−q)²
    return cscale(cadd(cdiv(z, zq), cscale(cdiv(cmul(q, z), cmul(zq, zq)), c)), S.A);
  }
  return cscale(cadd(cmul(d.R1!, cdiv(z, csub(z, d.q1))), cmul(d.R2!, cdiv(z, csub(z, d.q2)))), S.A);
}

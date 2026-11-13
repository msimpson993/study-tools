import { TAU, C, type Cx } from './complex';

/** In-place radix-2 FFT (forward, e^{-j...}). Length must be a power of two. */
export function fftR2(re: Float64Array | number[], im: Float64Array | number[]): void {
  const n = re.length;
  if (n & (n - 1)) throw new Error('fftR2: length must be a power of two');
  for (let i = 1, j = 0; i < n; i++) {
    let b = n >> 1;
    for (; j & b; b >>= 1) j ^= b;
    j ^= b;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -TAU / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const xr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const xi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + xr; im[i + k] = ui + xi;
        re[i + k + len / 2] = ur - xr; im[i + k + len / 2] = ui - xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/** Direct N-point DFT of the first `L` samples of xw (zero-padded/truncated to N): X[k] = Σ x[n] e^{-j2πkn/N}. */
export function dft(xw: ArrayLike<number>, N: number, L = xw.length): Cx[] {
  const X: Cx[] = [];
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < Math.min(L, xw.length); n++) {
      const th = -TAU * k * n / N;
      re += xw[n] * Math.cos(th); im += xw[n] * Math.sin(th);
    }
    X.push(C(re, im));
  }
  return X;
}

/** DTFT of a finite record at angular frequency w (rad/s) with sample period T. */
export function dtftAt(w: number, xw: ArrayLike<number>, T: number, L = xw.length): Cx {
  let re = 0, im = 0;
  for (let n = 0; n < Math.min(L, xw.length); n++) {
    const th = -w * n * T;
    re += xw[n] * Math.cos(th); im += xw[n] * Math.sin(th);
  }
  return C(re, im);
}

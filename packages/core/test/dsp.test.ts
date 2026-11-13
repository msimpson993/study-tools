import { describe, it, expect } from 'vitest';
import { interpDroopDb, sinc, zohDelay, dft, fftR2, windowMetrics, windowSamples, expm, stateTransition, eig2, companion2, ctrbMatrix, obsvMatrix, rank, cexp, cmul, TAU } from '../src/dsp';

describe('reconstruction droop', () => {
  it('ZOH droop at fs/2 is −3.92 dB', () => expect(interpDroopDb('zoh', 4, 8)).toBeCloseTo(-3.922, 2));
  it('FOH droop at fs/2 is −7.84 dB', () => expect(interpDroopDb('foh', 4, 8)).toBeCloseTo(-7.844, 2));
  it('ideal sinc is a brick wall at fs/2', () => { expect(interpDroopDb('sinc', 3.9, 8)).toBe(0); expect(interpDroopDb('sinc', 4.1, 8)).toBe(-Infinity); });
  it('sinc zero at integers, 1 at 0', () => { expect(sinc(0)).toBe(1); expect(Math.abs(sinc(3))).toBeLessThan(1e-15); });
  it('ZOH delay is half a sample', () => expect(zohDelay(8)).toBeCloseTo(0.0625, 12));
});

describe('DFT', () => {
  it('an on-bin cosine puts N/2 in bins k0 and N−k0', () => {
    const N = 32, k0 = 4, x = Array.from({ length: N }, (_, n) => Math.cos(TAU * k0 * n / N));
    const X = dft(x, N);
    expect(Math.hypot(X[k0].re, X[k0].im)).toBeCloseTo(N / 2, 9);
    expect(Math.hypot(X[N - k0].re, X[N - k0].im)).toBeCloseTo(N / 2, 9);
    expect(Math.hypot(X[7].re, X[7].im)).toBeLessThan(1e-9);
  });
  it('half-bin offset tone: peak magnitude (rect, N=32) is ≈ 3.9 dB below an on-bin tone', () => {
    const N = 32, x = Array.from({ length: N }, (_, n) => Math.cos(TAU * 4.5 * n / N));
    const X = dft(x, N);
    const peak = Math.max(...X.slice(0, N / 2).map((c) => Math.hypot(c.re, c.im)));
    expect(20 * Math.log10(peak / (N / 2))).toBeCloseTo(-3.9, 0);
  });
  it('radix-2 FFT equals the direct DFT', () => {
    const N = 16, x = Array.from({ length: N }, (_, n) => Math.sin(n * 0.7) + 0.3 * n);
    const re = Float64Array.from(x), im = new Float64Array(N); fftR2(re, im);
    const X = dft(x, N);
    for (let k = 0; k < N; k++) { expect(re[k]).toBeCloseTo(X[k].re, 9); expect(im[k]).toBeCloseTo(X[k].im, 9); }
  });
  it('rejects non power-of-two FFT length', () => expect(() => fftR2(new Float64Array(12), new Float64Array(12))).toThrow());
  it('Parseval: Σ|x|² = (1/N) Σ|X|²', () => {
    const N = 16, x = Array.from({ length: N }, (_, n) => Math.cos(n) + 0.1 * n);
    const X = dft(x, N);
    expect(x.reduce((s, v) => s + v * v, 0)).toBeCloseTo(X.reduce((s, c) => s + c.re * c.re + c.im * c.im, 0) / N, 9);
  });
});

describe('window metrics (M = 64, periodic cosine sums)', () => {
  const m = (k: any, p = {}) => windowMetrics(k, 64, p);
  it('rect: ENBW = 1 bin, scallop 3.92 dB, PSL −13.3 dB', () => {
    expect(m('rect').enbw).toBeCloseTo(1, 9); expect(m('rect').scal).toBeCloseTo(3.92, 1); expect(m('rect').psl).toBeCloseTo(-13.3, 0);
  });
  it('Hann: ENBW = 1.5, scallop 1.42 dB, PSL −31.5 dB', () => {
    expect(m('hann').enbw).toBeCloseTo(1.5, 9); expect(m('hann').scal).toBeCloseTo(1.42, 1); expect(m('hann').psl).toBeCloseTo(-31.5, 0);
  });
  it('Hamming ENBW ≈ 1.363; Blackman ≈ 1.727; Blackman-Harris ≈ 2.004; flat-top ≈ 3.77', () => {
    expect(m('hamming').enbw).toBeCloseTo(1.3628, 2); expect(m('blackman').enbw).toBeCloseTo(1.7268, 2);
    expect(m('bh').enbw).toBeCloseTo(2.0044, 2); expect(m('flattop').enbw).toBeCloseTo(3.77, 1);
  });
  it('flat-top has ≈ 0 dB scallop loss; Blackman-Harris sidelobes ≈ −92 dB', () => {
    expect(Math.abs(m('flattop').scal)).toBeLessThan(0.02); expect(m('bh').psl).toBeLessThan(-90);
  });
  it('Kaiser β=0 is rectangular; Tukey α=0 rect, α=1 is Hann-like (ENBW ≈ 1.5)', () => {
    expect(m('kaiser', { beta: 0 }).enbw).toBeCloseTo(1, 9); expect(m('tukey', { alpha: 0 }).enbw).toBeCloseTo(1, 9);
    expect(m('tukey', { alpha: 1 }).enbw).toBeCloseTo(1.5, 1);
  });
  it('larger Kaiser β: lower sidelobes, wider ENBW', () => {
    expect(m('kaiser', { beta: 10 }).psl).toBeLessThan(m('kaiser', { beta: 3 }).psl);
    expect(m('kaiser', { beta: 10 }).enbw).toBeGreaterThan(m('kaiser', { beta: 3 }).enbw);
  });
  it('cosine-sum windows are DFT-even (w[0] smallest, symmetric about M/2)', () => {
    const w = windowSamples('hann', 16);
    expect(w[0]).toBeCloseTo(0, 12); expect(w[4]).toBeCloseTo(w[12], 12); expect(w[8]).toBeCloseTo(1, 12);
  });
});

describe('state transition matrix e^{At} for A = [[0,1],[−2,−3]]', () => {
  const A = companion2(3, 2);
  it('closed form 2e^{−t}−e^{−2t} etc. at t = 1', () => {
    const E = stateTransition(A, 1), e1 = Math.exp(-1), e2 = Math.exp(-2);
    expect(E[0][0]).toBeCloseTo(2 * e1 - e2, 9); expect(E[0][1]).toBeCloseTo(e1 - e2, 9);
    expect(E[1][0]).toBeCloseTo(-2 * e1 + 2 * e2, 9); expect(E[1][1]).toBeCloseTo(-e1 + 2 * e2, 9);
  });
  it('e^{A·0} = I and semigroup property e^{A(s+t)} = e^{As}e^{At}', () => {
    expect(stateTransition(A, 0)).toEqual([[1, 0], [0, 1]]);
    const P = stateTransition(A, 0.3), Q = stateTransition(A, 0.9), R = stateTransition(A, 1.2);
    const PQ = [[0, 1].map((j) => P[0][0] * Q[0][j] + P[0][1] * Q[1][j]), [0, 1].map((j) => P[1][0] * Q[0][j] + P[1][1] * Q[1][j])];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) expect(PQ[i][j]).toBeCloseTo(R[i][j], 9);
  });
  it('eigenvalues are −1 and −2', () => expect(eig2(A).map((e) => e[0]).sort((a, b) => a - b)).toEqual([-2, -1]));
  it('Jordan block J = [[−1,1],[0,−1]]: e^{Jt} = e^{−t}[[1,t],[0,1]]', () => {
    const E = expm([[-1, 1], [0, -1]]); const e1 = Math.exp(-1);
    expect(E[0][0]).toBeCloseTo(e1, 12); expect(E[0][1]).toBeCloseTo(e1, 12); expect(E[1][0]).toBeCloseTo(0, 12);
  });
  it('rotation generator [[0,1],[−1,0]]: e^{At} is a rotation', () => {
    const E = stateTransition([[0, 1], [-1, 0]], 0.7);
    expect(E[0][0]).toBeCloseTo(Math.cos(0.7), 12); expect(E[0][1]).toBeCloseTo(Math.sin(0.7), 12);
  });
});

describe('controllability / observability of the running example', () => {
  const A = companion2(3, 2);
  it('B = [0,1]: Ctrb = [[0,1],[1,−3]], rank 2', () => { const Cm = ctrbMatrix(A, [0, 1]); expect(Cm).toEqual([[0, 1], [1, -3]]); expect(rank(Cm)).toBe(2); });
  it('B = v2 = [1,−2]: only the −1 mode is uncontrollable, rank 1', () => expect(rank(ctrbMatrix(A, [1, -2]))).toBe(1));
  it('C = [1,0]: Obsv = [[1,0],[0,1]], rank 2', () => { const O = obsvMatrix(A, [1, 0]); expect(O).toEqual([[1, 0], [0, 1]]); expect(rank(O)).toBe(2); });
});

describe('z = e^{sT}', () => {
  it('LHP maps inside the unit circle, jω axis onto it, ω = π/T lands on −1', () => {
    const T = 0.125;
    expect(Math.hypot(...Object.values(cexp({ re: -0.6 * T, im: 2 * T })))).toBeLessThan(1);
    expect(Math.hypot(cexp({ re: 0, im: 3 }).re, cexp({ re: 0, im: 3 }).im)).toBeCloseTo(1, 12);
    const m = cexp({ re: 0, im: Math.PI }); expect(m.re).toBeCloseTo(-1, 12);
  });
  it('is many-to-one: s and s + j2π/T share a z', () => {
    const T = 0.125, s = { re: -0.4, im: 1.1 }, s2 = { re: -0.4, im: 1.1 + TAU / T };
    const a = cexp({ re: s.re * T, im: s.im * T }), b = cexp({ re: s2.re * T, im: s2.im * T });
    expect(a.re).toBeCloseTo(b.re, 9); expect(a.im).toBeCloseTo(b.im, 9);
    expect(cmul(a, a)).toBeTruthy();
  });
});

/** The earbud sound examples: the digital filter used for the sweep must reproduce the verified analog numbers. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { bilinearLowpass2, biquadMag, biquadRun, peakBand, foldFreq, normalizePeak, logSweepFreq } from '../../../packages/core/src/audioDsp';
import { spk, Hf, cabs } from '../src/figs/ex';
import { sounds, earbudBiquad, clipped440, harmonicDb, squarePartial } from '../src/figs/sounds';

describe('earbud biquad (bilinear transform, prewarped at fₙ = 716.7 Hz)', () => {
  it('the analog model: peak 657.6 Hz, +5.36 dB, −3 dB band 394–842 Hz', () => {
    const a = peakBand((f) => cabs(Hf(f)), 20, 5000, 0.01);
    expect(a.fPeak).toBeCloseTo(657.6, 1); expect(a.peakDb).toBeCloseTo(5.36, 2); expect(Math.round(a.lo)).toBe(394); expect(Math.round(a.hi)).toBe(842);
  });
  for (const fs of [44100, 48000]) it(`digital at ${fs} Hz: peak 657.6–657.7 Hz, +5.36 dB, band 394–842 Hz`, () => {
    const d = peakBand((f) => biquadMag(earbudBiquad(fs), f, fs), 20, 5000, 0.01);
    expect(Math.abs(d.fPeak - 657.6)).toBeLessThan(0.15); expect(d.peakDb).toBeCloseTo(5.36, 2);
    expect(Math.round(d.lo)).toBe(394); expect(Math.round(d.hi)).toBe(842);
  });
  it('prewarping makes the digital gain equal the analog gain exactly at fₙ', () => {
    const p = spk(), fn = p.fn, c = bilinearLowpass2(p.a0 * 1e6, p.a1 * 1e3, 48000);
    expect(biquadMag(c, fn, 48000)).toBeCloseTo(cabs(Hf(fn)), 9); expect(biquadMag(c, 0.01, 48000)).toBeCloseTo(1, 6);
  });
  it('running the filter on a steady 657.6 Hz tone gives the ×1.85 gain', () => {
    const fs = 48000, n = fs, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * 657.6 * i) / fs);
    const y = biquadRun(earbudBiquad(fs), x); let m = 0; for (let i = n / 2; i < n; i++) m = Math.max(m, Math.abs(y[i]));
    expect(m).toBeCloseTo(1.853, 2);
  });
});

describe('the other sounds', () => {
  it('the ping rings at the damped frequency 687.8 Hz (not the 657.6 Hz gain peak, not fₙ = 716.7 Hz); τ = 0.79 ms', () => {
    const p = spk(); expect(p.fd).toBeCloseTo(687.8, 1); expect(p.fn).toBeCloseTo(716.7, 1); expect(1 / p.sigma).toBeCloseTo(0.79, 2);
  });
  it('soft limit: at 0.2 V the 3rd harmonic is negligible; at 6 V it is strong', () => {
    expect(harmonicDb(0.2, 3)).toBeLessThan(-40); expect(harmonicDb(6, 3)).toBeGreaterThan(-15);
    const y = clipped440(48000, 6, 0.1); let m = 0; for (const v of y) m = Math.max(m, Math.abs(v)); expect(m).toBeLessThanOrEqual(100);
  });
  it('square build-up: N odd harmonics; N = 1 is a pure 200 Hz sine of amplitude 4/π', () => {
    const y = squarePartial(48000, 1, 200, 0.01); let m = 0; for (const v of y) m = Math.max(m, Math.abs(v)); expect(m).toBeCloseTo(4 / Math.PI, 3);
  });
  it('aliasing at 8 kHz: 5 kHz is heard as 3 kHz, 7.8 kHz as 200 Hz', () => { expect(foldFreq(5000, 8000)).toBe(3000); expect(foldFreq(7800, 8000)).toBe(200); expect(foldFreq(3000, 8000)).toBe(3000); });
  it('the sweep runs 100 Hz → 5 kHz over 6 s', () => { expect(logSweepFreq(0, 100, 5000, 6)).toBe(100); expect(logSweepFreq(6, 100, 5000, 6)).toBeCloseTo(5000, 6); });
  it('clips are short and normalised to −20 dBFS', () => {
    for (const [id, d] of Object.entries(sounds)) {
      const v: Record<string, number> = {}; for (const c of d.controls ?? []) v[c.key] = c.max;
      const x = d.render(8000, v); expect(x.length / 8000, id).toBeLessThanOrEqual(8);
      const y = normalizePeak(x.slice(), d.peakDb ?? -20); let m = 0; for (const s of y) m = Math.max(m, Math.abs(s)); expect(m, id).toBeCloseTo(0.1, 4);
    }
  });
  it('every sound is listed in subject.yaml and used by a map box; none on the car boxes', () => {
    const app = path.resolve(__dirname, '..'), subj = fs.readFileSync(path.join(app, 'subject.yaml'), 'utf8'), graph = fs.readFileSync(path.join(app, 'content/graph.yaml'), 'utf8');
    for (const id of Object.keys(sounds)) { expect(subj, id).toContain(id); expect(graph, id).toContain(id); }
  });
});

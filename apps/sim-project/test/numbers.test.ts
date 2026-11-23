/**
 * Every number the page quotes is recomputed by src/model and checked here against the tutor's
 * numbers.py output (test/fixtures/numbers_output.txt, copied verbatim). Do not change a number
 * to make a test pass; send mismatches back to the tutor.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MOTOR, BORER, DISK, ENGINE, DESIGNS } from '../src/model/params';
import * as M from '../src/model/plants';
import { engineFitAt, FIT_POINTS } from '../src/figs/enginefit';

const OUT = fs.readFileSync(path.join(__dirname, 'fixtures/numbers_output.txt'), 'utf8');
const grab = (re: RegExp): number => { const m = OUT.match(re); if (!m) throw new Error(`no match ${re}`); return Number(m[1]); };
const nearAbs = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);
const near = (a: number, b: number, tol = 0.005) => nearAbs(a, b, Math.max(Math.abs(b) * tol, 1e-9));

describe('motor (Example 4.4)', () => {
  const n = M.motorNumbers();
  it('Table 4.2 parameters and open/closed sags, τ, ratio, Ka for 0.02', () => {
    expect(MOTOR).toEqual({ Ra: 1, Km: 10, J: 2, b: 0.5, Kb: 0.1, Ka: 54, Kt: 1 });
    nearAbs(n.emfFric, 1, 1e-12);
    nearAbs(n.dOpen, 1.5, 1e-12);
    nearAbs(n.tauOpen, grab(/tau_open = ([\d.]+)/), 5e-5);
    nearAbs(n.woInf, grab(/w_o\(inf\) = ([-\d.]+)/), 5e-5);
    nearAbs(n.wo(7), grab(/w_o\(7 s\) = ([-\d.]+)/), 5e-5);
    nearAbs(n.loopFric, 540, 1e-12);
    nearAbs(n.dClosed, 541.5, 1e-12);
    nearAbs(n.tauClosed * 1000, grab(/tau_closed = ([\d.]+) ms/), 5e-4);
    nearAbs(n.wcInf, grab(/w_c\(inf\) = ([-\d.]+)/), 5e-6);
    nearAbs(n.wc(0.02), grab(/w_c\(0\.02 s\) = ([-\d.]+)/), 5e-6);
    nearAbs(n.ratio, grab(/ratio w_c\/w_o = ([\d.]+)/), 5e-6);
    nearAbs(n.kaFor02, grab(/Ka > ([\d.]+) \(at Kt = 1\)/), 5e-4);
    nearAbs(n.speedUp, 361, 0.05);
  });
  it('Ka knob table and other knobs match the fixture', () => {
    for (const [k, sag, ratio, tauMs] of [
      [0, -0.66667, 1, 1333.33], [7.35, -1 / (1.5 + 73.5), 0.02, 2 / (1.5 + 73.5) * 1000], [54, n.wcInf, n.ratio, n.tauClosed * 1000],
    ] as [number, number, number, number][]) {
      const x = M.motorNumbers({ Ka: k });
      nearAbs(x.wcInf, sag, 2e-5);
      nearAbs(x.ratio, ratio, 2e-5);
      nearAbs(x.tauClosed * 1000, tauMs, 0.02);
    }
    const heavy = M.motorNumbers({ J: 4 });
    nearAbs(heavy.tauOpen, grab(/J=4: tau_o=([\d.]+)/), 5e-4);
    nearAbs(heavy.tauClosed * 1000, grab(/J=4: tau_o=[\d.]+ s, tau_c=([\d.]+) ms/), 5e-4);
    nearAbs(heavy.wcInf, n.wcInf, 1e-12);
  });
});

describe('boring machine (Example 4.5)', () => {
  it('K = 20 and K = 100: ζ, poles, overshoot, Ts, push offset and peak', () => {
    const s20 = M.borerStep(20), p20 = M.borerPush(20), z20 = M.borerWnZeta(20);
    const s100 = M.borerStep(100), p100 = M.borerPush(100), z100 = M.borerWnZeta(100);
    nearAbs(z20.wn, 4.4721, 5e-4); nearAbs(z20.zeta, 1.3416, 5e-4);
    nearAbs(s20.m.os, grab(/CHECK E2 PO K=20: ours ([\d.]+)/), 0.02);
    nearAbs(s20.m.ts, grab(/CHECK E2 Ts K=20: ours ([\d.]+)/), 0.003);
    nearAbs(p20.m.yf, 0.05, 1e-9);
    nearAbs(z100.wn, 10, 1e-9); nearAbs(z100.zeta, 0.6, 1e-9);
    nearAbs(s100.m.os, grab(/CHECK E2 PO K=100: ours ([\d.]+)/), 0.02);
    nearAbs(s100.m.ts, grab(/CHECK E2 Ts K=100: ours ([\d.]+)/), 0.003);
    nearAbs(p100.m.yf, 0.01, 1e-9);
    nearAbs(p100.m.peak, 0.01095, 2e-5);
    nearAbs(p100.m.tp, 0.393, 0.002);
    const poles20 = M.borerPoles(20).map((p) => p.re).sort((a, b) => a - b);
    nearAbs(poles20[0], -10, 1e-3); nearAbs(poles20[1], -2, 1e-3);
    const poles100 = M.borerPoles(100);
    nearAbs(poles100[0].re, -6, 1e-3); nearAbs(Math.abs(poles100[0].im), 8, 1e-3);
    nearAbs(M.borerZero(20)!, -20 / 11, 1e-4);
    nearAbs(M.borerZero(100)!, -100 / 11, 1e-4);
  });
  it('K = 36, K for 10 % overshoot, and the rate-gain knob', () => {
    const s36 = M.borerStep(36);
    nearAbs(s36.m.os, grab(/K=36: PO=([\d.]+)%/), 0.03);
    const K10 = M.brentq((K) => M.borerStep(K, BORER.Kd, 6, 60001).m.os - 10, 20, 100, 1e-3);
    nearAbs(K10, grab(/K for PO = 10%: ([\d.]+)/), 0.05);
    nearAbs(1 / K10, grab(/K for PO = 10%: [\d.]+ -> ess = ([\d.]+)/), 2e-4);
    for (const [kd, os] of [[0, 85.45], [5, 42.62], [20, 10.08]] as [number, number][]) {
      nearAbs(M.borerStep(100, kd, 8).m.os, os, 0.05);
    }
  });
  it('sensitivity |S| and the s/K shortcut at the handout frequencies', () => {
    const at = (K: number, w: number) => M.borerS(K, { re: 0, im: w }).mag;
    nearAbs(at(20, 0.1), 0.0050, 5e-5);
    nearAbs(at(20, 1), 0.0629, 5e-5);
    nearAbs(at(20, 10), 0.6968, 5e-4);
    nearAbs(at(20, 100), 0.9949, 5e-4);
    // peak Im(S) at K = 20
    let imMax = -Infinity, reAt = 0;
    const w = Array.from({ length: 4001 }, (_, i) => 10 ** (-1 + (4 * i) / 4000));
    for (const ww of w) {
      const s = M.borerS(20, { re: 0, im: ww });
      if (s.im > imMax) { imMax = s.im; reAt = s.re; }
    }
    nearAbs(imMax, grab(/K=20:[\s\S]*?max Im\(S\) = ([\d.]+)/), 5e-4);
    nearAbs(reAt, grab(/K=20:[\s\S]*?max Im\(S\) = [\d.]+ at Re = ([\d.]+)/), 5e-4);
    nearAbs(at(100, 0.1), 0.00101, 2e-5);
    let pk = 0, wp = 0;
    for (const ww of w) { const m = at(100, ww); if (m > pk) { pk = m; wp = ww; } }
    nearAbs(pk, grab(/K=100: \|S\| at[\s\S]*?peak \|S\|=([\d.]+)/), 5e-4);
    nearAbs(wp, grab(/K=100: \|S\| at[\s\S]*?peak \|S\|=[\d.]+ at w=([\d.]+)/), 0.3);
  });
});

describe('disk head (§4.10)', () => {
  it('Ka = 10 and 80: poles, seek metrics, stand-in, shock dip and offset', () => {
    expect(DISK.KaMax).toBe(4080);
    nearAbs(M.diskOscW, grab(/oscillation there at w = sqrt\(20000\) = ([\d.]+)/), 5e-4);
    const s10 = M.diskSeek(10), d10 = M.diskShock(10), st10 = M.diskStand(10);
    nearAbs(s10.m.os, 0, 0.05);
    nearAbs(s10.m.ts, 1.3965, 0.004);
    nearAbs(st10.m.os, 0, 0.05);
    nearAbs(d10.m.yf, -0.02, 1e-9);
    const s80 = M.diskSeek(80), d80 = M.diskShock(80), st80 = M.diskStand(80);
    nearAbs(s80.m.os, 17.11, 0.05);
    nearAbs(s80.m.ts, 0.4091, 0.003);
    nearAbs(s80.m.peak, 1.1711, 0.001);
    nearAbs(s80.m.tp, 0.1812, 0.002);
    nearAbs(st80.m.os, 16.30, 0.05);
    nearAbs(d80.m.yf, -0.0025, 1e-9);
    nearAbs(d80.m.peak, -0.002928, 2e-5);
    nearAbs(d80.m.tp, 0.1802, 0.002);
    const p10 = M.diskPoles(10).sort((a, b) => a.re - b.re);
    nearAbs(p10[0].re, -1000.051, 0.02);
    nearAbs(p10[1].re, -17.01, 0.02);
    nearAbs(p10[2].re, -2.939, 0.02);
    const p80 = M.diskPoles(80);
    const coil = p80.reduce((a, p) => (p.re < a.re ? p : a));
    const arm = p80.filter((p) => p !== coil);
    nearAbs(coil.re, -1000.408, 0.02);
    nearAbs(arm[0].re, -9.796, 0.02);
    nearAbs(Math.abs(arm[0].im), 17.432, 0.02);
  });
  it('Ka for 5 % overshoot, Ka = 200 overshoot, and the ceiling', () => {
    const Ka5 = M.brentq((K) => M.diskSeek(K, 3, 60001).m.os - 5, 10, 80, 1e-3);
    nearAbs(Ka5, grab(/Ka for PO = 5%: ([\d.]+)/), 0.05);
    nearAbs(-1 / (5 * Ka5), grab(/Ka for PO = 5%: [\d.]+ -> dist final ([-\d.]+)/), 2e-5);
    nearAbs(M.diskSeek(200).m.os, grab(/Ka >= 200 -> PO = ([\d.]+)%/), 0.05);
  });
});

describe('engine stand-in and emulated tuner (not in lab handout)', () => {
  it('page model coefficients and P-only error', () => {
    nearAbs(ENGINE.K, 311, 0);
    nearAbs(2 * ENGINE.zeta * ENGINE.wn, 6.3954, 5e-5);
    nearAbs(ENGINE.wn * ENGINE.wn, 11.6964, 5e-5);
    nearAbs(ENGINE.tau, 0.015, 0);
    nearAbs(M.enginePError(0.0042253), grab(/P=0\.0042253: final [\d.]+, error ([\d.]+)/), 2e-4);
    nearAbs(M.enginePError(0.01), grab(/P=0\.01: final [\d.]+, error ([\d.]+)/), 2e-4);
    const pOnly = M.simEngine(0.0042253, 0, { T: 6 });
    nearAbs(pOnly.y[pOnly.y.length - 1], 0.5679, 0.002);
  });
  it('handout-gain metrics and margins on the stand-in', () => {
    for (const [name, T] of [['initial', 8], ['slower', 12], ['final', 8]] as const) {
      const d = DESIGNS[name];
      const r = M.engineStep(d.P, d.I, T);
      const mrg = M.engineMargins(d.P, d.I);
      // pin to the "ours" line in the fixture
      const re = new RegExp(`(?:^|\\n)${name}\\s+slider[\\s\\S]*?ours : Tr=([\\d.]+)s Ts=([\\d.]+)s OS=([\\d.]+)% peak=([\\d.]+) \\| PM ([\\d.]+)° @ ([\\d.]+) \\| GM ([\\d.]+) dB @ ([\\d.]+)`);
      const g = OUT.match(re); if (!g) throw new Error(`no ours line for ${name}`);
      nearAbs(r.m.tr, +g[1], 0.006);
      nearAbs(r.m.ts, +g[2], 0.006);
      nearAbs(r.m.os, +g[3], 0.05);
      nearAbs(r.m.peak, +g[4], 0.002);
      nearAbs(mrg.pm, +g[5], 0.15);
      nearAbs(mrg.wc, +g[6], 0.01);
      nearAbs(mrg.gm, +g[7], 0.15);
      nearAbs(mrg.wp, +g[8], 0.05);
    }
  });
  it('emulated tuner reproduces the three presets and the P = 0 clamp', () => {
    const ini = M.tuner(0.678, 0.6), slo = M.tuner(3.1, 0.6), fin = M.tuner(1.5, 0.72);
    nearAbs(ini.P, grab(/initial : emulated P=([\d.]+)/), 2e-6);
    nearAbs(ini.I, grab(/initial : emulated P=[\d.]+ I=([\d.]+)/), 2e-6);
    expect(ini.clamped).toBe(false);
    nearAbs(slo.P, 0, 1e-9);
    nearAbs(slo.I, grab(/slower {2}: emulated P=[\d.]+ I=([\d.]+)/), 2e-6);
    expect(slo.clamped).toBe(true);
    nearAbs(fin.P, grab(/final {3}: emulated P=([\d.]+)/), 2e-6);
    nearAbs(fin.I, grab(/final {3}: emulated P=[\d.]+ I=([\d.]+)/), 2e-6);
    expect(fin.clamped).toBe(false);
    const thr = M.brentq((r) => { const t = M.tuner(r, 0.6); return t.clamped ? -1 : t.P - 1e-12; }, 1, 5, 1e-4);
    nearAbs(thr, grab(/P reaches 0 at response time ≈ ([\d.]+)/), 0.03);
  });
  it('robustness 0.4 / 0.8 and delay knob', () => {
    const a = M.tuner(0.678, 0.4), b = M.tuner(0.678, 0.8);
    const ra = M.engineStep(a.P, a.I, 14), rb = M.engineStep(b.P, b.I, 14);
    nearAbs(ra.m.os, grab(/resp=0\.678 rob=0\.40:[\s\S]*?OS=\s*([\d.]+)%/), 0.15);
    nearAbs(rb.m.os, 0, 0.05);
    nearAbs(rb.m.ts, grab(/resp=0\.678 rob=0\.80:[\s\S]*?Ts=([\d.]+)s/), 0.03);
    const d15 = M.engineMargins(0.0014551, 0.0043791, ENGINE.K, ENGINE.wn, ENGINE.zeta, 0.015);
    nearAbs(d15.pm, 72.1, 0.15);
    nearAbs(d15.gm, 32.7, 0.15);
    const d200 = M.simEngine(0.0014551, 0.0043791, { T: 10, tau: 0.2 });
    nearAbs(M.metrics(d200.t, d200.y, 1).os, 9.38, 0.15);
  });
});

describe('pass-1 numbers used by the staged content', () => {
  it('PI figure presets use the exact handout gains (I-only 0.4 %, 3.47 s)', () => {
    const initial = M.engineStep(0.0042253, 0.0092411, 8);
    const ionly = M.engineStep(0, 0.0021263, 12);
    nearAbs(initial.m.os, grab(/engine initial, handout gains: P=0\.0042253 I=0\.0092411 OS=([\d.]+)%/), 0.05);
    nearAbs(initial.m.ts, grab(/engine initial, handout gains:[\s\S]*?Ts=([\d.]+)s/), 0.006);
    expect(+initial.m.os.toFixed(1)).toBe(7.5);
    // stand-in at the exact slower gains: 0.4 % and 3.47 s (handout table 0.401 %, 3.45 s)
    nearAbs(ionly.m.os, 0.4, 0.08);
    nearAbs(ionly.m.ts, 3.47, 0.03);
    expect(+ionly.m.os.toFixed(1)).toBe(0.4);
    expect(+ionly.m.ts.toFixed(2)).toBe(3.47);
  });
  it('pins the new PASS1 figures: 361× vs 350, ζ = 0.49 at Ka = 80, 7.4 vs 7.5 %', () => {
    nearAbs(grab(/speed-up tau_o\/tau_c = ([\d.]+)/), 361, 0.05);
    nearAbs(grab(/handout plot axes 7 s \/ 0\.02 s = ([\d.]+)/), 350, 0.05);
    nearAbs(grab(/disk Ka=80 exact dominant pair zeta = ([\d.]+)/), 0.49, 0.001);
    const poles = M.diskPoles(80).filter((q) => q.re > -40 && Math.abs(q.im) > 0.5);
    const z = Math.abs(poles[0].re) / Math.hypot(poles[0].re, poles[0].im);
    nearAbs(z, 0.49, 0.002);
    nearAbs(grab(/engine initial, emulated gains:[\s\S]*?OS=([\d.]+)%/), 7.362, 0.02);
  });
});

describe('tabs-layout presets and new figures', () => {
  it('disk ka200 preset: shock offset −0.001, seek overshoot 37.18 %, Ts 0.3563 s', () => {
    const Ka = 200;
    const s = M.diskSeek(Ka), d = M.diskShock(Ka);
    nearAbs(s.m.os, 37.18, 0.05);
    nearAbs(s.m.ts, 0.3563, 0.003);
    nearAbs(d.m.yf, -0.001, 2e-5);
  });

  it('engine-fit stand-in curve matches the 8 fitted values (within 0.5 % / 0.2°)', () => {
    const fitMag = [190.42, 12.63, 303.02, 173.72, 278.36, 15.54, 9.83, 1.00];
    const fitPh = [-83.55, -172.54, -20.65, -90.10, -41.76, -168.65, -177.11, 134.39];
    FIT_POINTS.forEach((p, i) => {
      const g = engineFitAt(p.w, true);
      near(g.mag, fitMag[i], 0.005);
      // the last point is reported as +134.39° (wrapped); plotPhase is the unwrapped −225.65°
      const ph = i === 7 ? g.phase : g.plotPhase;
      nearAbs(ph, fitPh[i], 0.2);
    });
  });

  it('tuner final design reaches 2980 rpm at t₀ + 1.82 s on the linear stand-in', () => {
    const { P, I } = M.tuner(1.5, 0.72);
    const r = M.engineStep(P, I, 8, 1e-3);
    const tHit = M.firstCrossing(r.t, r.y, 0.98);
    nearAbs(tHit, grab(/engine emulated final gains:[\s\S]*?t0\+([\d.]+) s/), 0.01);
    nearAbs(tHit, 1.806, 0.01);
  });
});

describe('pass-2 pins (new presets and captions)', () => {
  it('motor Ka = 7.5 is just under the 0.02 line; Ka = 7.35 is not', () => {
    nearAbs(grab(/motor Ka=7\.35:[\s\S]*?ratio ([\d.]+)/), 0.02000, 5e-5);
    nearAbs(grab(/motor Ka=7\.5:[\s\S]*?ratio ([\d.]+)/), 0.01961, 5e-5);
    const n735 = M.motorNumbers({ Ka: 7.35 });
    const n75 = M.motorNumbers({ Ka: 7.5 });
    nearAbs(n735.ratio, 0.02000, 5e-5);
    nearAbs(n75.ratio, 0.01961, 5e-5);
    expect(n75.ratio < 0.02).toBe(true);
    expect(n735.ratio < 0.02).toBe(false);
    nearAbs(n75.tauClosed * 1000, 26.14, 0.05);
    nearAbs(n75.wcInf, -0.01307, 5e-5);
  });

  it('borer poles and zeros at K = 20, 36 and 100', () => {
    const z20 = M.borerZero(20), z36 = M.borerZero(36), z100 = M.borerZero(100);
    expect(z20).not.toBeNull(); expect(z36).not.toBeNull(); expect(z100).not.toBeNull();
    nearAbs(z20!, -1.8182, 5e-4);
    nearAbs(z36!, -3.2727, 5e-4);
    nearAbs(z100!, -9.0909, 5e-4);
    const p20 = M.borerPoles(20).map((q) => q.re).sort((a, b) => a - b);
    nearAbs(p20[0], -10, 0.05);
    nearAbs(p20[1], -2, 0.05);
    const p36 = M.borerPoles(36);
    p36.forEach((q) => nearAbs(q.re, -6, 0.05));
    const p100 = M.borerPoles(100);
    const pair = p100.filter((q) => Math.abs(q.im) > 0.5);
    expect(pair).toHaveLength(2);
    nearAbs(Math.abs(pair[0].im), 8, 0.05);
    nearAbs(pair[0].re, -6, 0.05);
  });

  it('disk Ka = 3981: real loop nearly rings forever, stand-in dies out', () => {
    const Ka = 10 ** 3.6;
    nearAbs(Ka, 3981.1, 0.2);
    const seek = M.diskSeek(Ka, 30);
    const stand = M.diskStand(Ka);
    nearAbs(seek.m.os, grab(/disk Ka=10\^3\.6=3981\.1: real loop PO=([\d.]+)%/), 0.05);
    nearAbs(seek.m.ts, 16.71, 0.08);
    nearAbs(stand.m.os, grab(/stand-in zeta=[\d.]+ PO=([\d.]+)%/), 0.05);
    nearAbs(stand.m.ts, 0.383, 0.01);
  });

  it('disk Ka = 80 stand-in and shock settling times', () => {
    nearAbs(M.diskStand(80).m.os, 16.30, 0.05);
    nearAbs(M.diskStand(80).m.ts, 0.4038, 0.003);
    nearAbs(M.diskShock(80).m.ts, 0.4081, 0.003);
    nearAbs(M.diskSeek(80).m.ts, 0.4091, 0.003);
  });

  it('engine initial at dt = 1 ms is 7.43 %; margins 60.0° / 25.4 dB', () => {
    const { P, I } = M.tuner(0.678, 0.6);
    const r = M.engineStep(P, I, 8, 1e-3);
    nearAbs(r.m.os, grab(/engine initial, emulated gains, dt=1\.0 ms: OS=([\d.]+)%/), 0.03);
    nearAbs(r.m.os, 7.43, 0.03);
    const mrg = M.engineMargins(P, I, ENGINE.K, ENGINE.wn, ENGINE.zeta, ENGINE.tau, 20001);
    nearAbs(mrg.pm, grab(/engine initial, emulated gains: PM ([\d.]+) deg/), 0.15);
    nearAbs(mrg.gm, grab(/engine initial, emulated gains: PM [\d.]+ deg @[\s\S]*?GM ([\d.]+) dB/), 0.15);
  });

  it('handout final gains reach 2980 rpm at t₀ + 1.816 s', () => {
    const r = M.engineStep(DESIGNS.final.P, DESIGNS.final.I, 8, 1e-3);
    const tHit = M.firstCrossing(r.t, r.y, 0.98);
    nearAbs(tHit, grab(/engine handout final gains:[\s\S]*?t0\+([\d.]+) s/), 0.01);
    nearAbs(tHit, 1.816, 0.01);
  });
});

describe('pass-3 pins (engine figure at dt = 1 ms)', () => {
  it('emulated final gains: Ts 1.802 s and Tr 1.088 s at dt = 1 ms', () => {
    const { P, I } = M.tuner(1.5, 0.72);
    const r = M.engineStep(P, I, 14, 1e-3);
    nearAbs(r.m.os, grab(/engine emulated final gains, dt=1\.0 ms: OS=([\d.]+)%/), 0.02);
    nearAbs(r.m.ts, grab(/engine emulated final gains, dt=1\.0 ms:[\s\S]*?Ts\(2%, sample after last exit\)=([\d.]+)s/), 0.002);
    nearAbs(r.m.tr, grab(/engine emulated final gains, dt=1\.0 ms:[\s\S]*?Tr=([\d.]+)s/), 0.002);
    nearAbs(M.firstCrossing(r.t, r.y, 0.98), grab(/engine emulated final gains, dt=1\.0 ms:[\s\S]*?0\.98 crossing \(interpolated\)=([\d.]+)s/), 0.002);
    nearAbs(r.m.ts, 1.802, 0.002);
    nearAbs(r.m.tr, 1.088, 0.003);
    expect(r.m.os).toBe(0);
  });

  it('emulated final gains at dt = 0.2 ms: Ts 1.806 s', () => {
    const { P, I } = M.tuner(1.5, 0.72);
    const r = M.engineStep(P, I, 14, 2e-4);
    nearAbs(r.m.ts, grab(/engine emulated final gains, dt=0\.2 ms:[\s\S]*?Ts\(2%, sample after last exit\)=([\d.]+)s/), 0.003);
    nearAbs(r.m.tr, grab(/engine emulated final gains, dt=0\.2 ms:[\s\S]*?Tr=([\d.]+)s/), 0.003);
    nearAbs(r.m.ts, 1.806, 0.003);
  });

  it('handout final gains: Ts 1.812 s at dt = 1 ms, 1.816 s at 0.2 ms', () => {
    const P = DESIGNS.final.P, I = DESIGNS.final.I;
    const r1 = M.engineStep(P, I, 14, 1e-3);
    const r2 = M.engineStep(P, I, 14, 2e-4);
    nearAbs(r1.m.ts, grab(/engine handout final gains, dt=1\.0 ms:[\s\S]*?Ts\(2%, sample after last exit\)=([\d.]+)s/), 0.003);
    nearAbs(r1.m.tr, grab(/engine handout final gains, dt=1\.0 ms:[\s\S]*?Tr=([\d.]+)s/), 0.003);
    nearAbs(M.firstCrossing(r1.t, r1.y, 0.98), grab(/engine handout final gains, dt=1\.0 ms:[\s\S]*?0\.98 crossing \(interpolated\)=([\d.]+)s/), 0.003);
    nearAbs(r2.m.ts, grab(/engine handout final gains, dt=0\.2 ms:[\s\S]*?Ts\(2%, sample after last exit\)=([\d.]+)s/), 0.003);
    nearAbs(r1.m.ts, 1.812, 0.003);
    nearAbs(r2.m.ts, 1.816, 0.003);
    expect(r1.m.os).toBe(0);
    expect(r2.m.os).toBe(0);
  });
});

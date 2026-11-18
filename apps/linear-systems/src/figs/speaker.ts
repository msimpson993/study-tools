/** Live figures on the earbud speaker: time in ms, s in 1/ms (= krad/s), frequency in Hz. H(s) = X/V normalised to 1 at DC. */
import { figureOf, planeFrame, spanLine, arrow, dot, cross, polyline, text, tline, axes2, wipe, curve, fillBetween, heat, clipBox, col, linspace, type V2 } from '@study/core';
import { spk, hImp, hTerms, residue, Hs, Hf, cabs, dB, peakBand, ringDigital, ringSample, ringDTFT, ringDFT, humDFT, aliasOf, squareCoef, squarePowerShare, UM_PER_V, DAMP_CRIT, TAU } from './ex';
import { num, fmt, graph, note } from './util';

const stems = (g: CanvasRenderingContext2D, f: ReturnType<typeof graph>, xs: number[], ys: number[], color: string, base = 0, r = 3) => xs.forEach((x, i) => { tline(g, f, [x, base], [x, ys[i]], color, 1.5); dot(g, f, [x, ys[i]], color, r); });

/* ───────────── lti: drive voltage ∗ impulse response = cone motion ───────────── */
export const ltiFigure = figureOf((c) => {
  const TM = 6, dt = 0.01;
  const vin = (tau: number) => {
    if (tau < 0) return 0;
    switch (String(c.values.input)) { case 'step': return 1; case 'burst': return tau < 3 / 0.69 ? Math.sin(TAU * 0.69 * tau) : 0; case 'click': return tau < 0.1 ? 1 : 0; default: return tau < 1 ? 1 : 0; }
  };
  const yAt = (t: number) => { let s = 0; for (let tau = 0; tau <= t; tau += dt) s += vin(tau) * hImp(t - tau) * dt; return s * UM_PER_V; };
  return [
    {
      id: 'slide', title: 'Flip h, slide it to t, multiply by the drive, add up the area', x: 'τ (ms)', y: 'V(τ), h(t − τ), product',
      draw(g, w, h) {
        wipe(g, w, h);
        const t = num(c.values, 't'), f = graph(g, w, h, [-0.5, TM], [-1.2, 1.3], 'τ (ms)', 'drive (V) · h (scaled)', 1, 0.5), xs = linspace(-0.5, TM, 551);
        const hs = xs.map((tau) => hImp(t - tau) / 3), prod = xs.map((tau, i) => vin(tau) * hs[i]);
        fillBetween(g, f, xs, prod, 'rgba(110,226,110,.4)');
        curve(g, f, xs, xs.map(vin), col.a(), 2.2); curve(g, f, xs, hs, col.b(), 2.2); curve(g, f, xs, prod, col.c(), 1.8);
        tline(g, f, [t, -1.2], [t, 1.3], col.muted(), 1, [4, 3]);
        note(g, `x(${fmt(t, 1)} ms) = area × ${fmt(UM_PER_V, 1)} µm/V = ${fmt(yAt(t), 1)} µm`, f.box.l + 6, f.box.t + 10, col.c(), 'left', 11);
      },
    },
    {
      id: 'out', title: 'Cone displacement x(t) = (h ∗ V)(t) builds up', x: 'time t (ms)', y: 'x (µm)',
      draw(g, w, h) {
        wipe(g, w, h);
        const t = num(c.values, 't'), ts = linspace(0, TM, 121), ys = ts.map(yAt), hi = Math.max(5, ...ys) * 1.15, lo = Math.min(0, ...ys) * 1.15, f = graph(g, w, h, [0, TM], [lo, hi], 'time t (ms)', 'cone displacement (µm)');
        curve(g, f, ts, ys, col.muted(), 1.5, [4, 3]);
        const k = ts.findIndex((q) => q > t), up = k < 0 ? ts.length : k; curve(g, f, ts.slice(0, up), ys.slice(0, up), col.c(), 3); dot(g, f, [t, yAt(t)], col.e(), 5);
      },
    },
  ];
});

/* ───────────── eigfn: a tone goes in, the same tone comes out ───────────── */
export const eigfnFigure = figureOf((c) => {
  return [
    {
      id: 'time', title: 'Drive cos(ωt) and cone response |H| cos(ωt + ∠H)', x: 'time t (ms)', y: 'normalised amplitude',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), t = num(c.values, 't'), H = Hf(fq), m = cabs(H), ph = Math.atan2(H[1], H[0]), om = (TAU * fq) / 1000, ts = linspace(0, 5, 501), top = Math.max(1.2, m * 1.15);
        const f = graph(g, w, h, [0, 5], [-top, top], 'time t (ms)', 'drive · cone (DC = 1)');
        curve(g, f, ts, ts.map((s) => Math.cos(om * s)), col.a(), 2); curve(g, f, ts, ts.map((s) => m * Math.cos(om * s + ph)), col.b(), 2.5);
        tline(g, f, [t, -top], [t, top], col.e(), 1.2, [4, 3]);
        note(g, `${fmt(fq, 0)} Hz in → ${fmt(fq, 0)} Hz out, ×${fmt(m, 2)}, lag ${fmt((-ph * 180) / Math.PI, 0)}°`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 11);
      },
    },
    {
      id: 'phasor', title: 'As phasors: e^(jωt) and H(jω)·e^(jωt) turn together', x: 'real part', y: 'imaginary part',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), t = num(c.values, 't'), H = Hf(fq), m = cabs(H), r = Math.max(1.3, m * 1.15), f = planeFrame(w, h, r), a = (TAU * fq * t) / 1000, ph = Math.atan2(H[1], H[0]);
        axes2(g, f, 'Re', 'Im');
        polyline(g, f, linspace(0, TAU, 97).map((q) => [Math.cos(q), Math.sin(q)] as V2), col.grid(), 1); polyline(g, f, linspace(0, TAU, 97).map((q) => [m * Math.cos(q), m * Math.sin(q)] as V2), col.grid(), 1, [3, 3]);
        arrow(g, f, [0, 0], [Math.cos(a), Math.sin(a)], col.a(), 2.5, 'in'); arrow(g, f, [0, 0], [m * Math.cos(a + ph), m * Math.sin(a + ph)], col.b(), 2.5, 'out');
        note(g, `H(j2π·${fmt(fq, 0)}) = ${fmt(H[0], 2)} ${H[1] < 0 ? '−' : '+'} ${fmt(Math.abs(H[1]), 2)}j`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
      },
    },
  ];
});

/* ───────────── ft: winding the click response round a circle ───────────── */
export const ftFigure = figureOf((c) => {
  const T = 8, ts = linspace(0, T, 801);
  return [
    {
      id: 'wind', title: 'h(t)·e^(−j2πft): the click response wound round at f', x: 'real part', y: 'imaginary part',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), om = (TAU * fq) / 1000, pts = ts.map((t) => [hImp(t) * Math.cos(-om * t), hImp(t) * Math.sin(-om * t)] as V2), X = Hf(fq), f = planeFrame(w, h, 3.2);
        axes2(g, f, 'Re', 'Im'); polyline(g, f, pts, col.a(), 1.6);
        arrow(g, f, [0, 0], [X[0], X[1]], col.e(), 2.5, 'X(f)');
        note(g, `f = ${fmt(fq, 0)} Hz: X(f) = ∫h e^(−j2πft) dt, |X| = ${fmt(cabs(X), 2)}`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
      },
    },
    {
      id: 'spec', title: 'The spectrum |X(f)| = |H(j2πf)| of the click response', x: 'frequency f (Hz)', y: '|X(f)|',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), fs = linspace(0, 2000, 401), ms = fs.map((q) => cabs(Hf(q))), f = graph(g, w, h, [0, 2000], [0, 2.1], 'frequency f (Hz)', '|X(f)| (DC = 1)', 500, 0.5);
        const b = peakBand(); g.fillStyle = 'rgba(110,226,110,.12)'; g.fillRect(f.X(b.lo), f.box.t, f.X(b.hi) - f.X(b.lo), f.box.b - f.box.t);
        curve(g, f, fs, ms, col.a(), 2.5); dot(g, f, [fq, cabs(Hf(fq))], col.e(), 5);
        note(g, `peak ${fmt(b.fPeak, 0)} Hz; −3 dB band ${fmt(b.lo, 0)}–${fmt(b.hi, 0)} Hz (green)`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 10);
      },
    },
  ];
});

/* ───────────── fs (and Parseval): a square-wave drive split into harmonics ───────────── */
export const fsFigure = figureOf((c) => {
  return [
    {
      id: 'sum', title: 'A ±1 V square-wave drive and its first N harmonics', x: 'time t (ms)', y: 'drive (V)',
      draw(g, w, h) {
        wipe(g, w, h);
        const f0 = num(c.values, 'f0'), N = num(c.values, 'N'), P = 1000 / f0, ts = linspace(0, 2 * P, 601), f = graph(g, w, h, [0, 2 * P], [-1.5, 1.5], 'time t (ms)', 'drive (V)', 0, 0.5);
        curve(g, f, ts, ts.map((t) => (Math.sin((TAU * t) / P) >= 0 ? 1 : -1)), col.muted(), 1.5, [4, 3]);
        curve(g, f, ts, ts.map((t) => { let s = 0; for (let k = 1; k <= N; k++) s += squareCoef(k) * Math.sin((TAU * k * t) / P); return s; }), col.a(), 2.5);
        note(g, `${N} harmonic${N > 1 ? 's' : ''} carry ${fmt(100 * squarePowerShare(N), 1)}% of the power (Parseval)`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 11);
      },
    },
    {
      id: 'lines', title: 'Harmonic amplitudes: in the drive, and at the cone after |H|', x: 'frequency (Hz)', y: 'amplitude',
      draw(g, w, h) {
        wipe(g, w, h);
        const f0 = num(c.values, 'f0'), N = num(c.values, 'N'), K = 15, top = Math.max(1.4, ...Array.from({ length: K }, (_, i) => squareCoef(i + 1) * cabs(Hf((i + 1) * f0)))) * 1.1;
        const f = graph(g, w, h, [0, (K + 1) * f0], [0, top], 'frequency (Hz)', 'amplitude (V or DC-normalised)');
        const fs = linspace(0, (K + 1) * f0, 300); curve(g, f, fs, fs.map((q) => cabs(Hf(q)) * 0.5), col.muted(), 1, [3, 3]);
        for (let k = 1; k <= K; k++) { if (!squareCoef(k)) continue; const x = k * f0, on = k <= N; tline(g, f, [x - f0 * 0.12, 0], [x - f0 * 0.12, squareCoef(k)], on ? col.a() : col.grid(), 4); tline(g, f, [x + f0 * 0.12, 0], [x + f0 * 0.12, squareCoef(k) * cabs(Hf(x))], on ? col.b() : col.grid(), 4); }
        note(g, 'dotted: ½|H(f)| · blue: drive 4/(πk) · orange: at the cone', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
      },
    },
  ];
});

/* ───────────── ortho: projecting the 200 Hz buzz onto one harmonic ───────────── */
export const orthoFigure = figureOf((c) => {
  const f0 = 200, P = 5, K = 15;
  const buzz = (t: number) => { let s = 0; for (let k = 1; k <= K; k += 2) { const H = Hf(k * f0); s += squareCoef(k) * cabs(H) * Math.sin((TAU * k * t) / P + Math.atan2(H[1], H[0])); } return s; };
  const proj = (m: number): [number, number] => { let a = 0, b = 0; const n = 2000; for (let i = 0; i < n; i++) { const t = (i + 0.5) * (P / n), y = buzz(t); a += (y * Math.cos((TAU * m * t) / P) * 2) / n; b += (y * Math.sin((TAU * m * t) / P) * 2) / n; } return [a, b]; };
  return [
    {
      id: 'prod', title: 'Buzz y(t) times the probe cos(2π·m·200t): the area is the inner product', x: 'time t (ms)', y: 'amplitude',
      draw(g, w, h) {
        wipe(g, w, h);
        const m = num(c.values, 'm'), ts = linspace(0, P, 501), ys = ts.map(buzz), pr = ts.map((t) => Math.cos((TAU * m * t) / P)), top = Math.max(1.3, ...ys.map(Math.abs)) * 1.1;
        const f = graph(g, w, h, [0, P], [-top, top], 'time t (ms), one 5 ms period', 'amplitude');
        fillBetween(g, f, ts, ts.map((_, i) => ys[i] * pr[i]), 'rgba(110,226,110,.35)');
        curve(g, f, ts, ys, col.a(), 2.5); curve(g, f, ts, pr, col.b(), 1.5, [5, 3]);
        const [a, b] = proj(m); note(g, `⟨probe, y⟩ → harmonic ${m} (${m * f0} Hz) has amplitude ${fmt(Math.hypot(a, b), 3)}`, f.box.l + 4, f.box.t + 10, col.c(), 'left', 11);
      },
    },
    {
      id: 'bars', title: 'Each harmonic’s amplitude, measured on its own', x: 'harmonic m', y: 'amplitude',
      draw(g, w, h) {
        wipe(g, w, h);
        const m = num(c.values, 'm'), ms = Array.from({ length: 9 }, (_, i) => i + 1), amps = ms.map((q) => Math.hypot(...proj(q))), f = graph(g, w, h, [0.4, 9.6], [0, Math.max(1, ...amps) * 1.15], 'harmonic m (× 200 Hz)', 'amplitude at the cone', 1);
        ms.forEach((q, i) => tline(g, f, [q, 0], [q, amps[i]], q === m ? col.e() : col.a(), q === m ? 10 : 7));
        note(g, 'even harmonics: projection 0 (the drive has none)', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
      },
    },
  ];
});

/* ───────────── sampling: the ring and its aliases ───────────── */
export const samplingFigure = figureOf((c) => {
  return [
    {
      id: 'time', title: 'A tone and its alias through the same samples', x: 'time t (ms)', y: 'amplitude',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), fs = num(c.values, 'fs') * 1000, fa = aliasOf(fq, fs), tm = 2, ts = linspace(0, tm, 1200), f = graph(g, w, h, [0, tm], [-1.3, 1.3], 'time t (ms)', 'amplitude', 0.5, 0.5);
        curve(g, f, ts, ts.map((t) => Math.cos((TAU * fq * t) / 1000)), col.a(), 1.8);
        curve(g, f, ts, ts.map((t) => Math.cos((TAU * fa * t) / 1000)), col.b(), 2, [7, 4]);
        for (let k = 0; k / (fs / 1000) <= tm; k++) { const t = k / (fs / 1000), v = Math.cos((TAU * fq * t) / 1000); tline(g, f, [t, 0], [t, v], col.e(), 1); dot(g, f, [t, v], col.e(), 3.5); }
        const bad = Math.abs(fa - fq) > 1e-6;
        note(g, bad ? `the samples cannot tell ${fmt(fq, 0)} Hz from ${fmt(fa, 0)} Hz` : 'below fs/2: the samples pin down the tone', f.box.r - 4, f.box.t + 10, bad ? col.bad() : col.ok(), 'right', 11);
      },
    },
    {
      id: 'spectrum', title: 'Sampling copies the spectrum at multiples of fs', x: 'frequency (kHz)', y: 'spectral lines',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f') / 1000, fs = num(c.values, 'fs'), R = Math.max(16, fs * 1.6), f = graph(g, w, h, [-R, R], [0, 1.3], 'frequency (kHz)', 'amplitude', fs / 2, 1);
        g.fillStyle = 'rgba(110,226,110,.12)'; g.fillRect(f.X(-fs / 2), f.box.t, f.X(fs / 2) - f.X(-fs / 2), f.box.b - f.box.t);
        for (let k = -4; k <= 4; k++) for (const sg of [1, -1]) { const x = sg * fq + k * fs; if (Math.abs(x) > R) continue; const base = k === 0, inB = Math.abs(x) <= fs / 2 + 1e-9; const cl = base ? col.a() : inB ? col.b() : col.muted(); tline(g, f, [x, 0], [x, 1], cl, base ? 3 : 2); dot(g, f, [x, 1], cl, 3.5); }
        note(g, `green: ±fs/2 = ±${fmt(fs / 2, 1)} kHz`, f.box.l + 4, f.box.t + 12, col.ok(), 'left', 10);
      },
    },
  ];
});

/* ───────────── dtft: the sampled ring and its periodic spectrum ───────────── */
export const dtftFigure = figureOf((c) => {
  return [
    {
      id: 'x', title: 'Samples x[n] = T·h(nT) of the click ring', x: 'sample n', y: 'x[n]',
      draw(g, w, h) {
        wipe(g, w, h);
        const fs = num(c.values, 'fs'), N = Math.round(fs * 3), ns = Array.from({ length: N }, (_, i) => i), xs = ns.map((n) => ringSample(n, fs)), top = Math.max(...xs.map(Math.abs)) * 1.2;
        const f = graph(g, w, h, [-0.5, N], [-top, top], `sample n (3 ms at ${fmt(fs, 1)} kHz)`, 'x[n]');
        const tt = linspace(0, N, 600); curve(g, f, tt, tt.map((q) => ringSample(q, fs)), col.muted(), 1, [3, 3]);
        stems(g, f, ns, xs, col.a());
      },
    },
    {
      id: 'X', title: '|X(e^(jΩ))|: periodic in Ω with period 2π', x: 'Ω (rad/sample)', y: '|X|',
      draw(g, w, h) {
        wipe(g, w, h);
        const fs = num(c.values, 'fs'), Om = num(c.values, 'Om'), os = linspace(-2 * Math.PI, 2 * Math.PI, 801), ms = os.map((o) => cabs(ringDTFT(o, fs)));
        const f = graph(g, w, h, [-2 * Math.PI, 2 * Math.PI], [0, Math.max(...ms) * 1.15], 'Ω (rad/sample)', '|X(e^(jΩ))|', Math.PI / 2);
        g.fillStyle = 'rgba(110,226,110,.10)'; g.fillRect(f.X(-Math.PI), f.box.t, f.X(Math.PI) - f.X(-Math.PI), f.box.b - f.box.t);
        curve(g, f, os, ms, col.a(), 2.5); dot(g, f, [Om, cabs(ringDTFT(Om, fs))], col.e(), 5);
        const d = ringDigital(fs); note(g, `Ω = ${fmt(Om, 2)} ↔ ${fmt((Om * fs * 1000) / TAU, 0)} Hz · ring peak Ω ≈ ${fmt(d.th, 2)}`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 10);
      },
    },
  ];
});

/* ───────────── dft: N samples → N bins on the DTFT ───────────── */
export const dftFigure = figureOf((c) => {
  return [
    {
      id: 'block', title: 'The N-sample block of the ring at 8 kHz', x: 'sample n', y: 'x[n]',
      draw(g, w, h) {
        wipe(g, w, h);
        const N = num(c.values, 'N'), ns = Array.from({ length: N }, (_, i) => i), xs = ns.map((n) => ringSample(n)), top = Math.max(...xs.map(Math.abs)) * 1.2, f = graph(g, w, h, [-0.5, N], [-top, top], 'sample n', 'x[n]');
        stems(g, f, ns, xs, col.a(), 0, 2.5);
        note(g, `ring is ${fmt(Math.exp(-spk().sigma * N / 8), 5)} of its start by n = ${N}`, f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
      },
    },
    {
      id: 'bins', title: '|X[k]| sits on the DTFT at Ω_k = 2πk/N (bins fs/N apart)', x: 'frequency (Hz)', y: '|X|',
      draw(g, w, h) {
        wipe(g, w, h);
        const N = num(c.values, 'N'), X = ringDFT(N), fq = linspace(0, 4000, 401), D = fq.map((q) => cabs(ringDTFT((TAU * q) / 8000))), top = Math.max(...D) * 1.15;
        const f = graph(g, w, h, [0, 4000], [0, top], 'frequency (Hz)', '|X|', 1000);
        curve(g, f, fq, D, col.muted(), 1.5, [4, 3]);
        const ks = Array.from({ length: N / 2 + 1 }, (_, k) => k); stems(g, f, ks.map((k) => (k * 8000) / N), ks.map((k) => X[k]), col.a(), 0, N > 64 ? 2 : 3);
        note(g, `${N} bins, ${fmt(8000 / N, 1)} Hz apart; the ring itself is ≈ 400 Hz wide`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 10);
      },
    },
  ];
});

/* ───────────── window: a steady hum between bins ───────────── */
export const windowFigure = figureOf((c) => {
  return [
    {
      id: 'block', title: '64 samples of a steady hum, with the window', x: 'sample n', y: 'amplitude',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), hann = c.values.win === 'hann', ns = Array.from({ length: 64 }, (_, i) => i), wn = ns.map((n) => (hann ? 0.5 - 0.5 * Math.cos((TAU * n) / 64) : 1));
        const f = graph(g, w, h, [-0.5, 64], [-1.2, 1.2], 'sample n (64 at 8 kHz = 8 ms)', 'amplitude', 8, 0.5);
        curve(g, f, ns, wn, col.d(), 1.5, [5, 3]); stems(g, f, ns, ns.map((n) => wn[n] * Math.cos((TAU * fq * n) / 8000)), col.a(), 0, 2);
        note(g, `${fmt(fq, 0)} Hz = bin ${fmt(fq / 125, 2)}`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 11);
      },
    },
    {
      id: 'db', title: 'DFT in dB: leakage into the neighbouring bins', x: 'bin k (125 Hz each)', y: 'level (dB)',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), hann = c.values.win === 'hann', X = humDFT(fq, 64, 8000, hann).map(dB), ks = X.map((_, k) => k).slice(0, 17);
        const f = graph(g, w, h, [-0.5, 16.5], [-60, 5], 'bin k (125 Hz each)', 'level (dB, on-bin tone = 0)', 2, 10);
        tline(g, f, [fq / 125, -60], [fq / 125, 5], col.e(), 1.5, [5, 3]);
        ks.forEach((k) => { tline(g, f, [k, -60], [k, Math.max(-60, X[k])], col.a(), 2); dot(g, f, [k, Math.max(-60, X[k])], col.a(), 3); });
        note(g, `bin 5: ${fmt(X[5], 1)} dB · bin 6: ${fmt(X[6], 1)} dB · bin 12: ${fmt(X[12], 1)} dB`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 10);
      },
    },
  ];
});

/* ───────────── laplace (and ROC): weight, integrate, map |H(s)| ───────────── */
export const laplaceFigure = figureOf((c) => {
  const damp = () => (c.values.sig === 'grow' ? -0.3 : 1);
  const abscissa = () => spk(damp()).poles[0][0];
  return [
    {
      id: 'integrand', title: 'h(t)·e^(−σt)·cos(ωt): the area is Re X(s)', x: 'time t (ms)', y: 'integrand',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = num(c.values, 'sigma'), om = num(c.values, 'omega'), d = damp(), T = 6, ts = linspace(0, T, 600), ys = ts.map((t) => hImp(t, d) * Math.exp(-s * t) * Math.cos(om * t));
        const top = Math.min(40, Math.max(1, ...ys.map(Math.abs)) * 1.1), f = graph(g, w, h, [0, T], [-top, top], 'time t (ms)', 'integrand');
        fillBetween(g, f, ts, ys.map((y) => Math.max(-top, Math.min(top, y))), 'rgba(110,226,110,.35)'); curve(g, f, ts, ys, col.c(), 2);
        const ok = s > abscissa(); let area = 0; for (let i = 1; i < ts.length; i++) area += ((ys[i] + ys[i - 1]) / 2) * (ts[i] - ts[i - 1]);
        note(g, ok ? `σ = ${fmt(s)} > ${fmt(abscissa())}: settles; Re H(s) = ${fmt(Hs([s, om], d)[0], 3)}` : `σ = ${fmt(s)} < ${fmt(abscissa())}: outside the ROC, the area keeps growing`, f.box.r - 4, f.box.t + 10, ok ? col.ok() : col.bad(), 'right', 10);
        void area;
      },
    },
    {
      id: 'map', title: '|H(s)| over the s-plane (s in 1/ms = krad/s)', x: 'σ = Re s', y: 'ω = Im s',
      draw(g, w, h) {
        wipe(g, w, h);
        const d = damp(), f = planeFrame(w, h, 6, -0.5, 0, 8, false), sc = abscissa(), s = num(c.values, 'sigma'), om = num(c.values, 'omega');
        heat(g, f, (x, y) => { const m = Math.log10(Math.max(1e-3, cabs(Hs([x, y], d)))), u = Math.max(0, Math.min(1, (m + 1.2) / 2.2)); return [Math.round(30 + 200 * u), Math.round(30 + 120 * u * u), Math.round(90 + 80 * (1 - u)), 255]; }, 5);
        g.save(); clipBox(g, f); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(f.box.l, f.box.t, f.X(sc) - f.box.l, f.box.b - f.box.t); g.restore();
        axes2(g, f, 'σ', 'ω'); tline(g, f, [sc, -8], [sc, 8], col.e(), 2, [6, 4]);
        note(g, `ROC: σ > ${fmt(sc)}`, f.X(sc) + 6, f.box.t + 12, col.e(), 'left', 11);
        for (const p of spk(d).poles) cross(g, f, p, '#fff', 6);
        dot(g, f, [s, om], col.c(), 6);
        note(g, 'brighter = larger |H(s)| · dimmed = outside the ROC', f.box.l + 4, f.box.b - 6, '#ddd', 'left', 10);
      },
    },
  ];
});

/* ───────────── inverse / jordan: poles, residues and the terms they give ───────────── */
export const inverseFigure = figureOf((c) => {
  return [
    {
      id: 'poles', title: 'Poles of H(s) = a₀/(s² + a₁s + a₀) and their residues', x: 'Re s (1/ms)', y: 'Im s (1/ms)',
      draw(g, w, h) {
        wipe(g, w, h);
        const d = snapD(num(c.values, 'damp')), p = spk(d), f = planeFrame(w, h, 6, -4, 0, 8, false), r = residue(d);
        axes2(g, f, 'Re s', 'Im s'); spanLine(g, f, [0, 1], col.grid(), 1, []);
        for (const q of p.poles) cross(g, f, q, col.bad(), 7);
        const rep = Math.abs(p.zeta - 1) < 0.01;
        note(g, `ζ = ${fmt(p.zeta, 3)} · poles ${p.poles.map((q) => `${fmt(q[0])}${q[1] ? (q[1] > 0 ? ' + ' : ' − ') + fmt(Math.abs(q[1])) + 'j' : ''}`).join(', ')}`, f.box.l + 4, f.box.t + 10, col.text(), 'left', 10);
        note(g, rep ? 'repeated pole: a₀/(s + σ)² → a₀ t e^(−σt) (Jordan block)' : p.wd > 0 ? `residue at the upper pole: ${fmt(r[0])} ${r[1] < 0 ? '−' : '+'} ${fmt(Math.abs(r[1]))}j` : `residues ±${fmt(Math.abs(r[0]), 2)}`, f.box.l + 4, f.box.b - 6, rep ? col.e() : col.text(), 'left', 10);
      },
    },
    {
      id: 'terms', title: 'h(t) = sum of one term per pole', x: 'time t (ms)', y: 'h(t) (1/ms)',
      draw(g, w, h) {
        wipe(g, w, h);
        const d = snapD(num(c.values, 'damp')), p = spk(d), ts = linspace(0, 4, 401), hs = ts.map((t) => hImp(t, d)), tm = ts.map((t) => hTerms(t, d));
        const lo = Math.min(...hs, 0), hi = Math.max(...hs), pad = (hi - lo) * 0.35 + 0.1, f = graph(g, w, h, [0, 4], [lo - pad, hi + pad], 'time t (ms)', 'h(t) (1/ms)');
        if (p.wd > 0) { const env = ts.map((t) => (p.a0 / p.wd) * Math.exp(-p.sigma * t)); curve(g, f, ts, env, col.muted(), 1.2, [4, 3]); curve(g, f, ts, env.map((v) => -v), col.muted(), 1.2, [4, 3]); }
        else { curve(g, f, ts, tm.map((q) => q[0]), col.b(), 1.8, [6, 4]); if (Math.abs(p.zeta - 1) > 0.01) curve(g, f, ts, tm.map((q) => q[1]), col.d(), 1.8, [6, 4]); }
        curve(g, f, ts, hs, col.a(), 3);
        note(g, p.wd > 0 ? 'complex pair: 2|c|e^(−σt)·sin(ω_d t) (dashed: envelope)' : Math.abs(p.zeta - 1) < 0.01 ? 'critical: a₀ t e^(−σt) (one term)' : 'two real poles: two exponentials (dashed) that cancel at t = 0', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
      },
    },
  ];
});

/* ───────────── tf: |H(jω)| as a ratio of distances ───────────── */
export const tfFigure = figureOf((c) => {
  return [
    {
      id: 'splane', title: 'Distances from the two poles to the point jω', x: 'Re s (1/ms)', y: 'Im s (1/ms)',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), d = num(c.values, 'damp'), p = spk(d), om = (TAU * fq) / 1000, f = planeFrame(w, h, 7, -2.5, 0);
        axes2(g, f, 'Re s', 'Im s'); tline(g, f, [0, -10], [0, 10], col.accent(), 2);
        const ds = p.poles.map((q) => { polyline(g, f, [q, [0, om]], col.b(), 1.8, [5, 3]); const L = Math.hypot(q[0], om - q[1]); note(g, fmt(L), f.X((q[0]) / 2) - 4, f.Y((q[1] + om) / 2), col.b(), 'right', 11); return L; });
        for (const q of p.poles) cross(g, f, q, col.bad(), 7); dot(g, f, [0, om], col.e(), 6);
        note(g, `|H| = a₀ / (d₁·d₂) = ${fmt(p.a0, 2)} / (${fmt(ds[0])}·${fmt(ds[1])}) = ${fmt(p.a0 / (ds[0] * ds[1]))}`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
      },
    },
    {
      id: 'mag', title: 'Frequency response |H(j2πf)| in dB', x: 'frequency f (Hz)', y: '|H| (dB)',
      draw(g, w, h) {
        wipe(g, w, h);
        const fq = num(c.values, 'f'), d = num(c.values, 'damp'), fs = linspace(1, 2500, 500), ys = fs.map((q) => dB(cabs(Hf(q, d)))), f = graph(g, w, h, [0, 2500], [-30, 15], 'frequency f (Hz)', '|H| (dB, DC = 0)', 500, 10);
        curve(g, f, fs, ys, col.a(), 2.5); dot(g, f, [fq, dB(cabs(Hf(fq, d)))], col.e(), 5);
        note(g, `${fmt(fq, 0)} Hz: ${fmt(dB(cabs(Hf(fq, d))), 1)} dB`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 11);
      },
    },
  ];
});

/* ───────────── zfilter (diffeq): the digital speaker model in the z-plane ───────────── */
export const zfilterFigure = figureOf((c) => {
  return [
    {
      id: 'zplane', title: 'Poles r·e^(±jθ) and zero of the difference equation; the point e^(jΩ)', x: 'Re z', y: 'Im z',
      draw(g, w, h) {
        wipe(g, w, h);
        const fs = num(c.values, 'fs'), fq = num(c.values, 'f'), dd = ringDigital(fs), Om = (TAU * fq) / (fs * 1000), f = planeFrame(w, h, 1.35), P: V2 = [Math.cos(Om), Math.sin(Om)];
        axes2(g, f, 'Re z', 'Im z'); polyline(g, f, linspace(0, TAU, 145).map((q) => [Math.cos(q), Math.sin(q)] as V2), col.strong(), 1.5);
        const poles: V2[] = [[dd.r * Math.cos(dd.th), dd.r * Math.sin(dd.th)], [dd.r * Math.cos(dd.th), -dd.r * Math.sin(dd.th)]];
        const L = poles.map((q) => { polyline(g, f, [q, P], col.b(), 1.6, [5, 3]); return Math.hypot(P[0] - q[0], P[1] - q[1]); });
        polyline(g, f, [[0, 0], P], col.c(), 1.6, [5, 3]);
        for (const q of poles) cross(g, f, q, col.bad(), 7); dot(g, f, [0, 0], col.c(), 6, true); dot(g, f, P, col.e(), 6);
        note(g, `r = ${fmt(dd.r, 3)}, θ = ${fmt(dd.th, 3)} rad · |H| ∝ 1/(${fmt(L[0])}·${fmt(L[1])})`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 10);
      },
    },
    {
      id: 'mag', title: 'Digital |H(e^(jΩ))| against the analogue |H(j2πf)|', x: 'frequency (Hz)', y: '|H| (dB)',
      draw(g, w, h) {
        wipe(g, w, h);
        const fs = num(c.values, 'fs'), fq = num(c.values, 'f'), top = (fs * 1000) / 2, fx = linspace(1, top, 400), f = graph(g, w, h, [0, top], [-40, 15], 'frequency (Hz)', '|H| (dB, DC = 0)', 0, 10);
        curve(g, f, fx, fx.map((q) => dB(cabs(Hf(q)))), col.muted(), 1.5, [5, 3]);
        curve(g, f, fx, fx.map((q) => dB(cabs(ringDTFT((TAU * q) / (fs * 1000), fs)))), col.a(), 2.5);
        const m = dB(cabs(ringDTFT((TAU * Math.min(fq, top)) / (fs * 1000), fs))); dot(g, f, [Math.min(fq, top), m], col.e(), 5);
        note(g, `y[n] = ${fmt(-ringDigital(fs).a1, 3)}y[n−1] − ${fmt(ringDigital(fs).a2, 3)}y[n−2] + ${fmt(ringDigital(fs).b1, 3)}x[n−1]`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 10);
      },
    },
  ];
});

/* ───────────── ss (and realize): the speaker's state (x, ẋ) ───────────── */
export const ssFigure = figureOf((c) => {
  const sim = () => {
    const p = spk(), amp = num(c.values, 'amp'), kind = String(c.values.input), dt = 0.005, n = 1200;
    const u = (t: number) => (kind === 'step' ? amp : kind === 'tone' ? amp * Math.sin((TAU * 690 * t) / 1000) : 0);
    let x = 0, v = kind === 'click' ? p.a0 * amp * 0.05 : 0; const ts: number[] = [], xs: number[] = [], vs: number[] = [], us: number[] = [];
    const F = (t: number, a: number, b: number): [number, number] => [b, p.a0 * (u(t) - a) - p.a1 * b];
    for (let i = 0; i <= n; i++) {
      const t = i * dt; ts.push(t); xs.push(x * UM_PER_V); vs.push(v * UM_PER_V); us.push(u(t));
      const k1 = F(t, x, v), k2 = F(t + dt / 2, x + (dt / 2) * k1[0], v + (dt / 2) * k1[1]), k3 = F(t + dt / 2, x + (dt / 2) * k2[0], v + (dt / 2) * k2[1]), k4 = F(t + dt, x + dt * k3[0], v + dt * k3[1]);
      x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); v += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    }
    return { ts, xs, vs, us, dt };
  };
  return [
    {
      id: 'phase', title: 'The state (x, ẋ) moves through the plane', x: 'cone position x (µm)', y: 'velocity ẋ (mm/s)',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = sim(), t = num(c.values, 't'), k = Math.min(s.ts.length - 1, Math.round(t / s.dt)), X = Math.max(5, ...s.xs.map(Math.abs)) * 1.15, V = Math.max(20, ...s.vs.map(Math.abs)) * 1.15;
        const f = planeFrame(w, h, 1, 0, 0, 8, false), sx = (x: number): V2 => [x / X, 0], pts = s.xs.map((x, i) => [x / X, s.vs[i] / V] as V2); void sx;
        axes2(g, f, 'x', 'ẋ'); polyline(g, f, pts, col.muted(), 1.2, [4, 3]); polyline(g, f, pts.slice(0, k + 1), col.a(), 2.5); dot(g, f, pts[k], col.e(), 6);
        note(g, `x = ${fmt(s.xs[k], 2)} µm, ẋ = ${fmt(s.vs[k], 1)} mm/s at t = ${fmt(t, 2)} ms`, f.box.l + 4, f.box.b - 6, col.text(), 'left', 11);
        note(g, `axes: ±${fmt(X, 1)} µm, ±${fmt(V, 0)} mm/s`, f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10);
      },
    },
    {
      id: 'time', title: 'Drive voltage and cone position against time', x: 'time t (ms)', y: 'x (µm)',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = sim(), t = num(c.values, 't'), top = Math.max(5, ...s.xs.map(Math.abs)) * 1.15, f = graph(g, w, h, [0, 6], [-top, top], 'time t (ms)', 'cone position x (µm)');
        const amp = Math.max(1e-6, num(c.values, 'amp')); curve(g, f, s.ts, s.us.map((u) => (u / amp) * top * 0.4), col.d(), 1.2, [3, 3]);
        curve(g, f, s.ts, s.xs, col.a(), 2.5); tline(g, f, [t, -top], [t, top], col.e(), 1.2, [4, 3]);
        note(g, `ẋ = Ax + Bu, A = [[0, 1], [−${fmt(spk().a0, 2)}, −${fmt(spk().a1, 3)}]] /ms`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 10);
      },
    },
  ];
});
/** Snap the damping factor onto critical when the slider is within a step of it, so the repeated-pole case is exact. */
const snapD = (d: number) => (Math.abs(d - DAMP_CRIT) < 0.006 ? DAMP_CRIT : d);

/**
 * Gallery of the reusable control-systems visuals in `@study/core` (ctrlviz.ts), all on the running cart:
 * a 1 kg cart on a spring (k = 2) and a damper (c = 3), G(s) = 1/(s² + 3s + 2), poles −1 and −2.
 * Built to dist/_gallery/index.html by scripts/build-gallery.ts; exercised by tests/e2e/ctrlviz.spec.ts.
 * It is also the copy-paste reference for the Tutor's figures: each figure is figureOf-style panels + a FigureDef.
 */
import { initTheme, toggleTheme, currentTheme, ControlSet, mountFigure, mountQuiz, Progress, scopeFigure, h, drawStepResponse, drawSPlane, drawRootLocus, drawBode, drawHeightMap, drawJwSlice, splaneDrag, locusDrag, wnZeta, poleFromWnZeta, suggestKMax, type FigureDef, type FigurePanel, type AppContent, type Question } from '../src';
import { simulatePid, C, tf, tfFeedback, step, rlocus, polyMul, timeGrid, isStable, type TF } from '../src/dsp';

initTheme();
const root = document.getElementById('app')!;
root.style.cssText = 'max-width:1100px;margin:0 auto;padding:1rem .8rem 3rem;color:var(--text);font:16px/1.5 system-ui,sans-serif';
const bar = h('div', { style: 'display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem' }, h('h1', { style: 'font-size:1.25rem;margin:0;flex:1' }, 'Control visuals — @study/core gallery'),
  h('button', { class: 'tbtn', dataset: { testid: 'theme' }, onclick: () => toggleTheme() }, currentTheme() === 'dark' ? '☾' : '☀'));
window.addEventListener('study-theme', () => { (bar.querySelector('button') as HTMLElement).textContent = currentTheme() === 'dark' ? '☾' : '☀'; });
root.append(bar, h('p', { style: 'color:var(--muted);margin:0 0 1rem' }, 'Every picture is the same cart (1 kg, spring k = 2, damper c = 3: poles −1, −2). Drag the handles, or use the sliders: they are the same controls.'));

const cart: TF = tf([1], [1, 3, 2]);
const L3: TF = tf([1], polyMul([1, 0], polyMul([1, 1], [1, 2]))); // the cart with integral action: K/(s(s+1)(s+2))
const normalized = (wn: number, zeta: number): TF => tf([wn * wn], [1, 2 * zeta * wn, wn * wn]);
const num = (v: Record<string, unknown>, k: string) => v[k] as number;

interface Gal { def: FigureDef; build: (c: ControlSet) => FigurePanel[] }
const gal: Gal[] = [];

/* ─── 1 ─ poles ⇄ step response ─── */
gal.push({
  def: {
    id: 'poles-step', title: 'Where the poles are decides how the cart moves', x: 'time (s) · σ (1/s)', y: 'position (m) · jω (rad/s)',
    legend: [{ label: 'step response', color: 'var(--cyan)' }, { label: 'running cart (ghost)', color: 'var(--muted)', dash: true }, { label: 'poles ×', color: 'var(--org)' }],
    howToRead: 'Left: the s-plane. Each × is a pole of the closed cart; drag it. Right: the cart’s step response. Left of the vertical axis everything decays; the farther left, the faster; the higher above the axis, the more it rings. The dashed rays are damping ratios ζ, the dashed arc is the natural frequency ωn.',
    lookFor: 'Drag the pole straight up: the ringing grows but the decay rate (its real part) does not change. Drag it left along the real axis: faster, no extra ringing.',
    controls: [
      { id: 'wn', label: 'Natural frequency ωn', type: 'range', min: 0.3, max: 6, step: 0.01, default: Math.SQRT2, group: 'primary', unit: 'rad/s' },
      { id: 'zeta', label: 'Damping ratio ζ', type: 'range', min: 0.05, max: 2, step: 0.01, default: 3 / (2 * Math.SQRT2), group: 'primary' },
      { id: 'marks', label: 'Show Tr, %OS, Ts, band, ess', type: 'toggle', default: true, group: 'more' },
    ],
    presets: [
      { id: 'cart', label: 'Running cart', set: { wn: Math.SQRT2, zeta: 3 / (2 * Math.SQRT2) }, about: 'Poles −1 and −2: overdamped, no overshoot.' },
      { id: 'crit', label: 'Critical', set: { wn: Math.SQRT2, zeta: 1 } },
      { id: 'half', label: 'ζ = 0.5', set: { wn: 2, zeta: 0.5 } },
      { id: 'ring', label: 'Rings', set: { wn: 3, zeta: 0.12 } },
    ],
  },
  build: (c) => [
    {
      id: 'plane', title: 'Poles in the s-plane (drag ×)', x: 'σ (1/s)', y: 'jω (rad/s)',
      draw: (g, w, h2, v) => { const wn = num(v, 'wn'), z = num(v, 'zeta'); const p = poleFromWnZeta(wn, z); drawSPlane(g, w, h2, { range: 4, poles: z >= 1 ? [C(-wn * (z - Math.sqrt(z * z - 1)), 0), C(-wn * (z + Math.sqrt(z * z - 1)), 0)] : [p, C(p.re, -p.im)], zetaRays: [0.5, 0.707], wnCircles: [wn], handles: [p], labels: true }); },
      pointer: splaneDrag({ range: 4, handles: () => [{ id: 'p', s: poleFromWnZeta(num(c.values, 'wn'), num(c.values, 'zeta')) }], upperOnly: true, onDrag: (_id, s) => { const q = wnZeta(s); c.set('wn', q.wn); c.set('zeta', Math.min(2, Math.max(0.05, q.zeta))); } }),
    },
    {
      id: 'step', title: 'Step response', x: 'time (s)', y: 'position (normalised)',
      draw: (g, w, h2, v) => { const wn = num(v, 'wn'), z = num(v, 'zeta'), on = !!v.marks, tEnd = Math.max(4, Math.min(30, 9 / (z * wn))); const r = step(normalized(wn, z), tEnd, 600), gh = step(normalized(Math.SQRT2, 3 / (2 * Math.SQRT2)), tEnd, 600); drawStepResponse(g, w, h2, { ...r, ghost: { ...gh, label: 'running cart' }, show: { timing: on, overshoot: on, band: on, settling: on, ess: on } }); },
    },
  ],
});

/* ─── 2 ─ root locus ─── */
const rl3 = rlocus(L3), KMAX3 = 12;
const cl = (K: number) => tfFeedback(tf([K], L3.den));
gal.push({
  def: {
    id: 'locus', title: 'Add integral action to the cart: the root locus', x: 'time (s) · σ (1/s)', y: 'position · jω',
    legend: [{ label: 'locus branches', color: 'var(--cyan)' }, { label: 'poles at gain K', color: 'var(--grn)' }, { label: 'jω crossing', color: 'var(--bad)' }],
    howToRead: 'Left: the three closed-loop poles as the integral gain K grows. Each coloured curve is one pole’s path, starting on a × (K = 0). The dots are where the poles are at the current K: drag along the curves. The red rings are where a path crosses the jω axis (stability lost); diamonds are breakaway points. Right: the step response at that K.',
    lookFor: 'Raise K: the two slow poles meet at the breakaway (about K = 0.38) and the cart starts to ring. At K = 6 the pair sits on the jω axis, and above it the cart is unstable.',
    controls: [{ id: 'K', label: 'Integral gain K', type: 'range', min: 0, max: KMAX3, step: 0.01, default: 2, group: 'primary' }],
    presets: [{ id: 'low', label: 'K = 0.38', set: { K: 0.385 }, about: 'Breakaway: two real poles collide.' }, { id: 'ok', label: 'K = 1', set: { K: 1 } }, { id: 'edge', label: 'K = 6', set: { K: 6 }, about: 'Marginal: a pole pair on the jω axis at ω = √2.' }, { id: 'bad', label: 'K = 9', set: { K: 9 } }],
  },
  build: (c) => [
    {
      id: 'locus', title: 'Root locus of K/(s(s+1)(s+2)) (drag the dots)', x: 'σ (1/s)', y: 'jω (rad/s)',
      draw: (g, w, h2, v) => { drawRootLocus(g, w, h2, { rl: rl3, L: L3, K: num(v, 'K'), range: 3.2, reCenter: -1.1 }); },
      pointer: locusDrag({ rl: rl3, range: 3.2, reCenter: -1.1, onK: (K) => c.set('K', Math.min(KMAX3, +K.toFixed(3))) }),
    },
    {
      id: 'step', title: 'Closed-loop step response at this K', x: 'time (s)', y: 'position',
      draw: (g, w, h2, v) => { const K = num(v, 'K'), T = cl(K), r = step(T, 30, 900), g0 = step(cl(1), 30, 900); drawStepResponse(g, w, h2, { ...r, yRange: [-0.3, 2.2], ghost: { ...g0, label: 'K = 1' }, show: { overshoot: isStable(T), settling: isStable(T), band: isStable(T) } }); },
    },
  ],
});

/* ─── 3 ─ Bode ─── */
gal.push({
  def: {
    id: 'bode', title: 'Gain and phase margin: how far from the edge?', x: 'ω (rad/s)', y: 'dB · degrees',
    legend: [{ label: '|L(jω)| (dB)', color: 'var(--cyan)' }, { label: 'phase', color: 'var(--org)' }, { label: 'K = 1 (ghost)', color: 'var(--muted)', dash: true }],
    howToRead: 'Top: loop gain in dB; bottom: loop phase. Where the gain crosses 0 dB, the green bar on the phase plot is the phase margin (distance above −180°). Where the phase crosses −180°, the green bar on the gain plot is the gain margin (how many dB you could add). Right: what that does to the step.',
    lookFor: 'Slide K up until the gain-margin bar shrinks to zero at K = 6: that is the jω-axis crossing of the root locus, seen from the other side.',
    controls: [{ id: 'K', label: 'Integral gain K', type: 'range', min: 0.2, max: 10, step: 0.01, default: 2, group: 'primary' }],
    presets: [{ id: 'k1', label: 'K = 1', set: { K: 1 } }, { id: 'k2', label: 'K = 2', set: { K: 2 } }, { id: 'k6', label: 'K = 6', set: { K: 6 }, about: 'Gain margin 0 dB.' }, { id: 'k9', label: 'K = 9', set: { K: 9 } }],
  },
  build: () => [
    { id: 'bode', title: 'Bode with margins', x: 'ω (rad/s)', y: 'dB, °', draw: (g, w, h2, v) => { drawBode(g, w, h2, { L: tf([num(v, 'K')], L3.den), ghost: tf([1], L3.den), wmin: 0.05, wmax: 20 }); }, height: 300 },
    { id: 'step', title: 'Step response at this K', x: 'time (s)', y: 'position', draw: (g, w, h2, v) => { const T = cl(num(v, 'K')), t = timeGrid(30, 900); const r = step(T, t); drawStepResponse(g, w, h2, { ...r, yRange: [-0.3, 2.2], show: { overshoot: isStable(T), settling: isStable(T), band: isStable(T) } }); }, height: 300 },
  ],
});

/* ─── 4 ─ height map ─── */
gal.push({
  def: {
    id: 'height', title: 'The transfer function as a landscape', x: 'σ · ω', y: 'jω · |G|',
    legend: [{ label: 'jω axis', color: 'var(--yel)' }, { label: 'poles ×', color: '#fff' }],
    howToRead: 'Left: |G(s)| as height over the s-plane (bright = tall, dark = low); poles are the peaks, zeros the pits. Walk up the yellow jω axis: the height you pass is the frequency response. Right: that cut, drawn flat (it is the Bode magnitude).',
    lookFor: 'Lower the damper c: the poles slide toward the jω axis, the peak rises, and the cut gets a resonance bump.',
    controls: [
      { id: 'c', label: 'Damper c', type: 'range', min: 0.2, max: 6, step: 0.01, default: 3, group: 'primary', unit: 'N·s/m' },
      { id: 'omega', label: 'Probe frequency ω', type: 'range', min: 0, max: 5, step: 0.01, default: 1, group: 'primary', unit: 'rad/s' },
      { id: 'db', label: 'Slice in dB', type: 'toggle', default: false, group: 'more' },
    ],
    presets: [{ id: 'cart', label: 'Running cart', set: { c: 3, omega: 1 } }, { id: 'light', label: 'Lightly damped', set: { c: 0.4, omega: 1.4 } }],
  },
  build: () => {
    const G = (v: Record<string, unknown>) => tf([1], [1, num(v, 'c'), 2]);
    return [
      { id: 'map', title: '|G(s)| over the s-plane', x: 'σ (1/s)', y: 'jω (rad/s)', draw: (g, w, h2, v) => { drawHeightMap(g, w, h2, { G: G(v), range: 3.5, reCenter: -0.8, omega: num(v, 'omega') }); } },
      { id: 'slice', title: '|G(jω)| along the jω axis', x: 'ω (rad/s)', y: '|G(jω)|', draw: (g, w, h2, v) => { drawJwSlice(g, w, h2, { G: G(v), wmax: 5, omega: num(v, 'omega'), db: !!v.db, ghost: cart }); } },
    ];
  },
});

/* ─── 5 ─ quiz with figures (fixed params, legacy "scope" plots) ─── */
{
  const registry = {
    // the legacy quiz_plots.js `overshoot` / `slow` scopes: one renderer, the question's FIXED params pick the loop
    loop: scopeFigure((p) => { const T = Number(p.T ?? 15), s = simulatePid({ plant: 'p2', Kp: Number(p.Kp), Ki: Number(p.Ki), T, dt: 0.01 }); return { xr: [0, T], yr: [0, Number(p.ymax ?? 1.5)], yLabel: 'output y', hl: [1], series: [{ t: s.t, y: s.y }] }; }),
  };
  const quiz: Question[] = [
    { id: 'qf-1', tags: ['gal'], kind: 'action', q: 'A PI loop’s step response is plotted above. It overshoots to about 1.4 and then settles. What would you change first?', choices: ['Lower Ki', 'Raise Ki', 'Add a delay', 'Nothing'], answer: 0, why: 'Overshoot with a slow return is integral windup of the error: lower Ki (or add a little Kp).', figure: { id: 'loop', params: { Kp: 2, Ki: 3.5, T: 15 }, alt: 'Step response overshooting to about 1.38 and then settling to 1.', caption: 'p2 plant, Kp = 2, Ki = 3.5' } },
    { id: 'qf-2', tags: ['gal'], kind: 'action', q: 'Same renderer, different fixed parameters: this loop rises slowly. What is wrong?', choices: ['Gains too small', 'Gains too large', 'Sensor noise', 'Nothing'], answer: 0, why: 'A smooth rise that takes 20 s means the loop is gentle: raise the gains.', figure: { id: 'loop', params: { Kp: 0.3, Ki: 0.2, T: 30, ymax: 1.2 }, alt: 'Step response rising slowly to 1 with no overshoot.' } },
    { id: 'qf-3', tags: ['gal'], kind: 'recognize', q: 'A question without a figure renders exactly as before.', choices: ['Yes', 'No'], answer: 0, why: 'Existing quizzes are unchanged.' },
    { id: 'qf-4', tags: ['gal'], kind: 'recognize', q: 'A question whose figure id has no renderer shows a visible fallback instead of failing.', choices: ['Yes', 'No'], answer: 0, why: 'Never silently drops the question.', figure: { id: 'nope', alt: 'A plot that is not registered in this build.' } },
    { id: 'qf-5', tags: ['gal'], kind: 'recall', q: 'Flashcard with a figure: what is the overshoot of the plot?', a: 'About 38 %: the peak is near 1.38.', figure: { id: 'loop', params: { Kp: 2, Ki: 3.5, T: 15 }, alt: 'Step response overshooting to about 1.38 and then settling to 1.' } },
  ];
  const content = { subject: { id: 'gallery', title: 'Gallery', centralQuestion: '?', blurb: '?', archetype: 'x', sections: [] }, maps: [], dives: [], quiz, glossary: [], figures: [], extra: {} } as unknown as AppContent;
  const sec = h('section', { id: 'fig-quiz', dataset: { gallery: 'quiz' }, style: 'margin:1.4rem 0' }, h('h2', { style: 'font-size:1.05rem;margin:.2rem 0 .5rem' }, 'Quiz questions with a fixed-parameter figure'));
  const host = h('div'); sec.append(host); root.append(sec);
  mountQuiz(host, content, new Progress('gallery', quiz, []), { figures: registry, title: 'Quiz figures', openDive: () => {}, back: () => {} });
}

const api: { id: string; controls: FigureDef['controls'] }[] = [];
for (const { def, build } of gal) {
  const controls = new ControlSet(def.controls, def.presets);
  const sec = h('section', { id: `fig-${def.id}`, dataset: { gallery: def.id }, style: 'margin:1.4rem 0' }, h('h2', { style: 'font-size:1.05rem;margin:.2rem 0 .5rem' }, def.title));
  const host = h('div', { class: 'viz-slot' });
  sec.append(host); root.append(sec);
  mountFigure(host, def, build(controls), controls);
  api.push({ id: def.id, controls: def.controls });
}
(window as unknown as { __gallery: unknown }).__gallery = { figures: api };
void suggestKMax;

/**
 * Staged signal-flow diagrams for the linear-systems scenes (`speaker`, `house`). Same idea as blockdiagram.ts (the
 * cart's loop, which stays untouched): content picks a stage with `exampleScene.diagram`, the strip is drawn under the
 * physical picture, and the parts a stage adds are outlined in the accent colour with a small "new" tag.
 * The stages belong to one scene each; scenedefs.ts validates the pairing.
 */
import { text, arrow, line, pick, font, type Pal, type Rect, type G } from './scenedraw';

export interface ChainBlock { id: string; x: number; y: number; w: number; /** label variants, longest first (the first that fits is drawn) */ label: string[]; kind?: 'box' | 'sum' | 'tap' }
export interface ChainWire { pts: [number, number][]; label?: string; at?: [number, number]; dashed?: boolean; id?: string; arrow?: boolean }
export interface ChainStage { scene: 'speaker' | 'house'; title: string; /** height in rows (one row ≈ 34 px) */ rows: number; blocks: ChainBlock[]; wires: ChainWire[]; added: string[]; /** one line of maths under the drawing */ eq?: string; says: string }

const b = (id: string, x: number, y: number, w: number, ...label: string[]): ChainBlock => ({ id, x, y, w, label });
const sum = (id: string, x: number, y: number): ChainBlock => ({ id, x, y, w: 0, label: ['Σ'], kind: 'sum' });
const wr = (pts: [number, number][], o: Partial<ChainWire> = {}): ChainWire => ({ pts, arrow: true, ...o });

export const CHAIN_STAGES: Record<string, ChainStage> = {
  'spk-chain': {
    scene: 'speaker', title: 'voltage to sound, block by block', rows: 2.6,
    says: 'Signal chain: the voltage V drives the coil current i (through Re and Le, against the back-EMF Bl·ẋ), the force Bl·i moves the diaphragm mass on its suspension, and in the sealed ear the pressure follows the displacement x.',
    blocks: [sum('s', 13, 0.8), b('coil', 30, 0.8, 17, '1/(Re + sLe)', 'coil', 'coil'), b('bl', 50, 0.8, 9, 'Bl'), b('mech', 70, 0.8, 21, '1/(Mms s² + Rms s + 1/Cms)', 'mass + spring', 'mech'), b('ear', 92, 0.8, 11, 'ear p ∝ x', 'ear', 'ear'), b('emf', 50, 2.0, 18, 'back-EMF Bl·s', 'Bl·s', 'Bl·s')],
    wires: [wr([[0, 0.8], [11, 0.8]], { label: 'V', at: [4, 0.45] }), wr([[15, 0.8], [21.5, 0.8]]), wr([[38.5, 0.8], [45.5, 0.8]], { label: 'i', at: [42, 0.45] }), wr([[54.5, 0.8], [59.5, 0.8]], { label: 'F', at: [57, 0.45] }), wr([[80.5, 0.8], [86.5, 0.8]], { label: 'x', at: [83.5, 0.45] }),
      wr([[83.5, 0.8], [83.5, 2.0], [59, 2.0]], { arrow: true }), wr([[41, 2.0], [13, 2.0], [13, 1.1]], { label: '−', at: [16, 1.5] })],
    added: ['coil', 'bl', 'mech', 'ear', 'emf'],
    eq: 'H(s) = X/V = (Bl/Re) / (Mms s² + (Rms + Bl²/Re) s + 1/Cms)   (Le dropped)',
  },
  'spk-model': {
    scene: 'speaker', title: 'two states are enough', rows: 2.2,
    says: 'The coil pole −Re/Le ≈ −186,750 rad/s is about 40 times faster than the mechanics, so the coil is replaced by its steady value i = (V − Bl·ẋ)/Re and the model has two states, x and ẋ: ẋ = Ax + BV.',
    blocks: [b('B', 22, 0.8, 12, 'B'), sum('s', 38, 0.8), b('int', 56, 0.8, 14, '∫ (2 states)', '∫'), b('C', 82, 0.8, 12, 'C'), b('A', 56, 1.9, 12, 'A')],
    wires: [wr([[0, 0.8], [16, 0.8]], { label: 'V', at: [5, 0.45] }), wr([[28, 0.8], [36, 0.8]]), wr([[40, 0.8], [49, 0.8]], { label: 'ẋ', at: [44.5, 0.45] }), wr([[63, 0.8], [76, 0.8]], { label: 'x = (x, ẋ)', at: [69.5, 0.45] }), wr([[88, 0.8], [100, 0.8]], { label: 'y = x', at: [95, 0.45] }),
      wr([[69.5, 0.8], [69.5, 1.9], [62, 1.9]]), wr([[50, 1.9], [38, 1.9], [38, 1.1]])],
    added: ['B', 'int', 'A', 'C'],
    eq: 'A = [[0, 1], [−k/m, −R/m]], B = (0, Bl/(Re·m))ᵀ; k = 1/Cms, R = Rms + Bl²/Re',
  },
  'spk-digital': {
    scene: 'speaker', title: 'the digital path', rows: 1.6,
    says: 'The digital path of the earbud: the microphone signal is sampled (ADC), filtered by a difference equation H(z) on the chip, and turned back into a voltage (DAC) for the speaker.',
    blocks: [b('adc', 22, 0.8, 14, 'ADC, T = 1/fs', 'ADC'), b('hz', 50, 0.8, 18, 'H(z) on the chip', 'H(z)'), b('dac', 78, 0.8, 14, 'DAC + hold', 'DAC')],
    wires: [wr([[0, 0.8], [15, 0.8]], { label: 'mic(t)', at: [6, 0.45] }), wr([[29, 0.8], [41, 0.8]], { label: 'x[n]', at: [35, 0.45] }), wr([[59, 0.8], [71, 0.8]], { label: 'y[n]', at: [65, 0.45] }), wr([[85, 0.8], [100, 0.8]], { label: 'V(t)', at: [93, 0.45] })],
    added: ['adc', 'hz', 'dac'],
    eq: 'y[n] = Σ b_k x[n−k] − Σ a_k y[n−k]   ⇔   H(z) = B(z)/A(z)',
  },
  'anc-ff': {
    scene: 'speaker', title: 'feedforward ANC', rows: 3.3,
    says: 'Feedforward noise cancelling: the outside reference mic hears the noise first; an adaptive filter W(z) shapes it so that, after the speaker path S, it arrives at the ear as anti-noise. The error mic tunes W with FxLMS.',
    blocks: [b('ref', 12, 0.8, 13, 'ref mic', 'ref'), b('W', 36, 1.9, 14, 'W(z) adaptive', 'W(z)'), b('S', 60, 1.9, 13, 'S: speaker', 'S'), b('P', 50, 0.8, 18, 'P: through the cup', 'P'), sum('e', 82, 0.8), b('lms', 60, 2.95, 18, 'FxLMS update', 'LMS')],
    wires: [wr([[0, 0.8], [5.5, 0.8]], { label: 'noise', at: [2, 0.4] }), wr([[18.5, 0.8], [41, 0.8]]), wr([[59, 0.8], [80, 0.8]], { label: 'd', at: [70, 0.45] }), wr([[22, 0.8], [22, 1.9], [29, 1.9]]), wr([[43, 1.9], [53.5, 1.9]]), wr([[66.5, 1.9], [82, 1.9], [82, 1.1]], { label: '−', at: [85, 1.5] }), wr([[84, 0.8], [100, 0.8]], { label: 'e at the ear', at: [93, 0.45] }), wr([[95, 0.8], [95, 2.95], [69, 2.95]], { dashed: true }), wr([[51, 2.95], [36, 2.95], [36, 2.25]], { dashed: true })],
    added: ['ref', 'W', 'lms'],
    eq: 'FxLMS: W ← W + μ · e · (Ŝ ∗ ref)',
  },
  'anc-fb': {
    scene: 'speaker', title: 'feedback ANC', rows: 2.2,
    says: 'Feedback noise cancelling: the error mic in the ear feeds a controller C(z) that drives the speaker against whatever it hears. It needs low latency and only works well at low frequencies.',
    blocks: [sum('e', 30, 0.8), b('C', 70, 1.9, 13, 'C(z)'), b('S', 47, 1.9, 13, 'S: speaker', 'S')],
    wires: [wr([[0, 0.8], [28, 0.8]], { label: 'd: noise', at: [12, 0.45] }), wr([[32, 0.8], [100, 0.8]], { label: 'e at the ear', at: [90, 0.45] }), wr([[86, 0.8], [86, 1.9], [76.5, 1.9]], { label: 'error mic', at: [93, 1.55] }), wr([[63.5, 1.9], [53.5, 1.9]]), wr([[40.5, 1.9], [30, 1.9], [30, 1.1]], { label: '−', at: [33, 1.5] })],
    added: ['C'],
    eq: 'e = d / (1 + S·C):  big loop gain → small residual',
  },
  'anc-hybrid': {
    scene: 'speaker', title: 'hybrid ANC', rows: 3.3,
    says: 'Hybrid noise cancelling: the feedforward filter W(z) from the reference mic and the feedback controller C(z) from the error mic both drive the speaker. Feedforward handles what it can predict, feedback cleans up the rest.',
    blocks: [b('ref', 12, 0.8, 13, 'ref mic', 'ref'), b('W', 32, 1.9, 12, 'W(z)'), sum('s', 48, 1.9), b('S', 62, 1.9, 11, 'S'), b('P', 50, 0.8, 14, 'P'), sum('e', 82, 0.8), b('C', 62, 2.95, 12, 'C(z)')],
    wires: [wr([[0, 0.8], [5.5, 0.8]], { label: 'noise', at: [2, 0.4] }), wr([[18.5, 0.8], [43, 0.8]]), wr([[57, 0.8], [80, 0.8]], { label: 'd', at: [70, 0.45] }), wr([[22, 0.8], [22, 1.9], [26, 1.9]]), wr([[38, 1.9], [46, 1.9]]), wr([[50, 1.9], [56.5, 1.9]]), wr([[67.5, 1.9], [82, 1.9], [82, 1.1]], { label: '−', at: [85, 1.5] }), wr([[84, 0.8], [100, 0.8]], { label: 'e', at: [95, 0.45] }), wr([[92, 0.8], [92, 2.95], [68, 2.95]]), wr([[56, 2.95], [48, 2.95], [48, 2.2]])],
    added: ['W', 'C', 's'],
    eq: 'u = W·ref − C·e',
  },
  'house-open': {
    scene: 'house', title: 'the house as ẋ = Ax + Bu', rows: 2.2,
    says: 'The house as a state-space model: the heater power u enters room 1 through B, the integrator holds the two temperatures, A couples the rooms and leaks heat outdoors, and the thermostat reads y = Cx.',
    blocks: [b('B', 20, 0.8, 16, 'B = (3600/C_th, 0)', 'B'), sum('s', 38, 0.8), b('int', 55, 0.8, 14, '∫ dt', '∫'), b('C', 82, 0.8, 13, 'C = [1, 0]', 'C'), b('A', 55, 1.9, 16, 'A (wall + leaks)', 'A')],
    wires: [wr([[0, 0.8], [12, 0.8]], { label: 'u (W)', at: [5, 0.45] }), wr([[28, 0.8], [36, 0.8]]), wr([[40, 0.8], [48, 0.8]], { label: 'ẋ', at: [44, 0.45] }), wr([[62, 0.8], [75.5, 0.8]], { label: 'x = (T₁, T₂)', at: [69, 0.45] }), wr([[88.5, 0.8], [100, 0.8]], { label: 'y', at: [95, 0.45] }), wr([[69, 0.8], [69, 1.9], [63, 1.9]]), wr([[47, 1.9], [38, 1.9], [38, 1.1]])],
    added: ['B', 'int', 'A', 'C'],
    eq: 'A = [[−1.2, 1], [1, −1.2]] /h',
  },
  'house-modal': {
    scene: 'house', title: 'in modal coordinates', rows: 2.6,
    says: 'The same house in modal coordinates: the input splits into an average channel 1/(s + 0.2) and a difference channel 1/(s + 2.2) that never talk to each other, and the output adds them back.',
    blocks: [b('in', 18, 1.35, 14, 'V⁻¹B', 'V⁻¹B'), b('avg', 50, 0.75, 22, 'average: 1/(s + 0.2)', 'avg 1/(s+0.2)', 'avg'), b('diff', 50, 1.95, 22, 'difference: 1/(s + 2.2)', 'diff 1/(s+2.2)', 'diff'), b('out', 82, 1.35, 12, 'CV', 'CV')],
    wires: [wr([[0, 1.35], [11, 1.35]], { label: 'u', at: [4, 1.0] }), wr([[25, 1.2], [39, 0.75]]), wr([[25, 1.5], [39, 1.95]]), wr([[61, 0.75], [76, 1.2]]), wr([[61, 1.95], [76, 1.5]]), wr([[88, 1.35], [100, 1.35]], { label: 'y', at: [95, 1.0] })],
    added: ['avg', 'diff'],
    eq: 'ξ = V⁻¹x:  ξ̇₁ = −0.2 ξ₁ + …,  ξ̇₂ = −2.2 ξ₂ + …',
  },
  'house-kalman': {
    scene: 'house', title: 'Kalman decomposition', rows: 2.6,
    says: 'Kalman decomposition of the house with the heat split between both rooms and a thermostat reading the average: the average is controllable and observable and is all the transfer function shows; the difference is neither, cut off from u and from y.',
    blocks: [b('co', 50, 0.8, 30, 'average: reachable + seen', 'average (c, o)', 'c, o'), b('nn', 50, 2.0, 30, 'difference: neither', 'difference (¬c, ¬o)', '¬c ¬o')],
    wires: [wr([[0, 0.8], [35, 0.8]], { label: 'u', at: [6, 0.45] }), wr([[65, 0.8], [100, 0.8]], { label: 'y', at: [94, 0.45] })],
    added: ['co', 'nn'],
    eq: 'H(s) = C(sI − A)⁻¹B sees only the c-and-o part',
  },
  'house-loop': {
    scene: 'house', title: 'the thermostat loop', rows: 2.2,
    says: 'The thermostat closes a loop: it compares the bedroom (room 2) reading with the set point and turns the heater power up or down. The plant is the same ẋ = Ax + Bu.',
    blocks: [sum('s', 14, 0.8), b('k', 34, 0.8, 16, 'thermostat', 'K'), b('h', 62, 0.8, 18, 'house ẋ = Ax + Bu', 'house'), b('c', 62, 1.9, 12, 'C')],
    wires: [wr([[0, 0.8], [12, 0.8]], { label: 'set', at: [5, 0.45] }), wr([[16, 0.8], [26, 0.8]]), wr([[42, 0.8], [53, 0.8]], { label: 'u', at: [47.5, 0.45] }), wr([[71, 0.8], [100, 0.8]], { label: 'T₁', at: [92, 0.45] }), wr([[86, 0.8], [86, 1.9], [68, 1.9]]), wr([[56, 1.9], [14, 1.9], [14, 1.1]], { label: '−', at: [17, 1.5] })],
    added: ['s', 'k'],
  },
};
export const CHAIN_STAGE_IDS = Object.keys(CHAIN_STAGES);
export const chainStagesOf = (scene: string): string[] => CHAIN_STAGE_IDS.filter((k) => CHAIN_STAGES[k].scene === scene);
export const isChainScene = (scene: string): boolean => scene === 'speaker' || scene === 'house';

/** Validate `diagram` for a chain scene (empty = fine). */
export function chainDiagramProblems(scene: string, raw: unknown, where: string): string[] {
  if (raw === undefined || raw === null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  if (!list.length) return [`${where}: diagram is empty`];
  const ok = chainStagesOf(scene), out: string[] = [], seen = new Set<string>();
  for (const s of list) {
    if (typeof s !== 'string' || !ok.includes(s)) out.push(`${where}: diagram stage ${JSON.stringify(s)} does not belong to scene "${scene}" (want ${ok.join(', ')})`);
    else if (seen.has(s)) out.push(`${where}: duplicate diagram stage "${s}"`);
    else seen.add(s);
  }
  return out;
}

export const chainStageHeight = (id: string, w: number): number => { const st = CHAIN_STAGES[id]; return st ? Math.round(st.rows * 34 + 24 + (st.eq ? 15 : 0) + (w < 400 ? 6 : 0)) : 0; };
export function chainStripHeight(ids: string[], w: number): number { if (!ids.length) return 0; if (ids.length > 1 && w >= 700) return Math.max(...ids.map((s) => chainStageHeight(s, (w - 8) / ids.length))); return ids.reduce((a, s) => a + chainStageHeight(s, w) + 8, -8); }
export function layoutChain(ids: string[], w: number, y: number): { stage: string; rect: Rect }[] {
  if (ids.length > 1 && w >= 700) { const cw = (w - 8 * (ids.length - 1)) / ids.length, hh = chainStripHeight(ids, w); return ids.map((stage, i) => ({ stage, rect: { x: i * (cw + 8), y, w: cw, h: hh } })); }
  let yy = y; return ids.map((stage) => { const hh = chainStageHeight(stage, w), r = { stage, rect: { x: 0, y: yy, w, h: hh } }; yy += hh + 8; return r; });
}

/** Draw one stage into r. `highlight` outlines the parts this stage adds (off on the compact hero). */
export function drawChainStage(g: G, r: Rect, id: string, P: Pal & { accent: string }, o: { highlight: boolean }) {
  const st = CHAIN_STAGES[id]; if (!st) return;
  g.save(); g.fillStyle = P.panel; g.strokeStyle = P.border; g.lineWidth = 1; g.beginPath(); if (typeof g.roundRect === 'function') g.roundRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 8); else g.rect(r.x, r.y, r.w, r.h); g.fill(); g.stroke(); g.restore();
  text(g, st.title, r.x + 8, r.y + 13, P.muted, { px: 10, wt: 700 });
  const top = r.y + 20, rowH = 34, X = (u: number) => r.x + 8 + (u / 100) * (r.w - 16), Y = (v: number) => top + v * rowH;
  for (const wv of st.wires) {
    const pts = wv.pts.map(([u, v]) => [X(u), Y(v)] as [number, number]);
    for (let i = 0; i < pts.length - 1; i++) { const last = i === pts.length - 2; if (last && wv.arrow !== false) arrow(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], P.text, 1.4, wv.dashed ? [4, 3] : []); else line(g, [pts[i], pts[i + 1]], P.text, 1.4, wv.dashed ? [4, 3] : []); }
  }
  const bh = Math.min(24, rowH * 0.7);
  for (const bl of st.blocks) {
    const cx = X(bl.x), cy = Y(bl.y), hl = o.highlight && st.added.includes(bl.id);
    if (bl.kind === 'sum') { g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fillStyle = P.elev; g.fill(); g.strokeStyle = hl ? P.accent : P.strong; g.lineWidth = hl ? 2.2 : 1.5; g.stroke(); g.fillStyle = P.text; g.font = font(10, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Σ', cx, cy + 0.5); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; continue; }
    const bw = (bl.w / 100) * (r.w - 16), x0 = cx - bw / 2, y0 = cy - bh / 2;
    g.beginPath(); if (typeof g.roundRect === 'function') g.roundRect(x0, y0, bw, bh, 6); else g.rect(x0, y0, bw, bh);
    g.fillStyle = P.elev; g.fill(); g.strokeStyle = hl ? P.accent : P.strong; g.lineWidth = hl ? 2.2 : 1.5; g.stroke();
    const lab = pick(g, 10, 700, bw - 6, ...bl.label);
    g.font = font(10, 700); const tw = g.measureText(lab).width, px = tw > bw - 4 ? Math.max(7.5, (10 * (bw - 4)) / tw) : 10;
    g.font = font(px, 700); g.fillStyle = hl ? P.accent : P.text; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, cx, cy + 0.5); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  }
  for (const wv of st.wires) if (wv.label && wv.at) text(g, wv.label, X(wv.at[0]), Y(wv.at[1]), P.muted, { align: 'center', px: 9.5, wt: 600, optional: true });
  if (st.eq) text(g, st.eq, r.x + 8, r.y + r.h - 6, P.muted, { px: 9.5, wt: 600 });
}

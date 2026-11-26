/** Lab block diagrams: summing junctions, feedback paths, disturbance inputs, optional script tags. */
import { col, text, wipe, withAnchor } from '@study/core';
import { arrow, box, wrap } from './util';

export type LabSys = 'motor-open' | 'motor-closed' | 'borer' | 'disk' | 'engine';

export type ScriptLine = { code: string; note?: string; warn?: string; frac: string; highlight: string };

export const SCRIPTS: Record<string, ScriptLine[]> = {
  'motor-open': [
    { code: 'Ra=1; Km=10; J=2; b=0.5; Kb=0.1;', warn: 'handout has f=0.5; b is undefined', frac: 'parameters', highlight: 'params' },
    { code: 'num1=[1]; den1=[J,b]; sys1=tf(num1,den1);', frac: '1/(Js + b) = 1/(2s + 0.5)', highlight: 'sys1' },
    { code: 'num2=[Km*Kb/Ra]; den2=[1]; sys2=tf(num2,den2);', frac: 'Km·Kb/Ra = 1', highlight: 'sys2' },
    { code: 'sys_o=feedback(sys1,sys2);', frac: '1/(2s + 0.5 + 1) = 1/(2s + 1.5)', highlight: 'loop' },
    { code: 'sys_o=-sys_o', frac: '−1/(2s + 1.5)', highlight: 'sign' },
    { code: '[yo,T]=step(sys_o);  yo(length(T))', frac: '−1/(2s + 1.5)  (step, last value)', highlight: 'step' },
  ],
  'motor-closed': [
    { code: 'Ra=1; Km=10; J=2; b=0.5; Kb=0.1; Ka=54; Kt=1;', frac: 'parameters (b=0.5, as Fig. 4.24 writes)', highlight: 'params' },
    { code: 'num1=[1]; den1=[J,b]; sys1=tf(num1,den1);', frac: '1/(Js + b)', highlight: 'sys1' },
    { code: 'num2=[Ka*Kt]; den2=[1]; sys2=tf(num2,den2);', frac: 'Ka·Kt = 54', highlight: 'sys2' },
    { code: 'num3=[Kb]; den3=[1]; sys3=tf(num3,den3);', frac: 'Kb = 0.1', highlight: 'sys3' },
    { code: 'num4=[Km/Ra]; den4=[1]; sys4=tf(num4,den4);', frac: 'Km/Ra = 10', highlight: 'sys4' },
    { code: 'sysa=parallel(sys2,sys3);', frac: 'Ka·Kt + Kb = 54.1', highlight: 'sysa' },
    { code: 'sysb=series(sysa,sys4);', frac: '(Ka·Kt + Kb)·Km/Ra = 541', highlight: 'sysb' },
    { code: 'sys_c=feedback(sys1,sysb);  sys_c=-sys_c', frac: '−1/(2s + 541.5)', highlight: 'loop' },
  ],
  'borer-step': [
    { code: 'numg=[1]; deng=[1 1 0]; sysg=tf(numg,deng);', frac: 'G = 1/(s(s + 1))', highlight: 'sysg' },
    { code: 'K1=100; num1=[11 K1]; den=[0 1]; sys1=tf(num1,den);', frac: 'Gc = K + 11s  (K = 100 shown)', highlight: 'sys1' },
    { code: 'sysa=series(sys1,sysg);', frac: 'Gc·G = (K + 11s)/(s(s + 1))', highlight: 'series' },
    { code: 'sysc=feedback(sysa,[1]);', frac: '(K + 11s)/(s² + 12s + K)', highlight: 'loop' },
  ],
  'borer-push': [
    { code: 'numg=[1]; deng=[1 1 0]; sysg=tf(numg,deng);', frac: 'G = 1/(s(s + 1))', highlight: 'sysg' },
    { code: 'K1=100; num1=[11 K1]; den=[0 1]; sys1=tf(num1,den);', frac: 'Gc = K + 11s', highlight: 'sys1' },
    { code: 'sysa=feedback(sysg,sys1);', frac: 'G/(1 + G·Gc) = 1/(s² + 12s + K)', highlight: 'loop' },
    { code: 'sysa=minreal(sysa);', frac: '1/(s² + 12s + K)  (cancelled)', highlight: 'minreal' },
  ],
  'disk-seek': [
    { code: 'Ka=10; nf=[5000]; df=[1 1000]; sysf=tf(nf,df);', frac: 'G₁ = 5000/(s + 1000)', highlight: 'sysf' },
    { code: 'ng=[1]; dg=[1 20 0]; sysg=tf(ng,dg);', frac: 'G₂ = 1/(s(s + 20))', highlight: 'sysg' },
    { code: 'sysa=series(Ka*sysf,sysg);', frac: 'Ka·G₁·G₂', highlight: 'series' },
    { code: 'sys=feedback(sysa,[1]);', frac: '5000Ka/(s³ + 1020s² + 20000s + 5000Ka)', highlight: 'loop' },
  ],
  'disk-shock': [
    { code: 'Ka=80; nf=[5000]; df=[1 1000]; sysf=tf(nf,df);', frac: 'G₁ = 5000/(s + 1000)', highlight: 'sysf' },
    { code: 'ng=[1]; dg=[1 20 0]; sysg=tf(ng,dg);', frac: 'G₂ = 1/(s(s + 20))', highlight: 'sysg' },
    { code: 'sys=feedback(sysg,Ka*sysf);', frac: 'G₂/(1 + Ka·G₁·G₂)', highlight: 'loop' },
    { code: 'sys=-sys;', frac: '−G₂/(1 + Ka·G₁·G₂)', highlight: 'sign' },
    { code: 't=[0:0.01:2]; y=step(sys,t);', frac: '−G₂/(1 + Ka·G₁·G₂)  (step)', highlight: 'step' },
  ],
};

export function scriptIdFor(sys: string): string {
  const k = normalizeSys(sys);
  if (k === 'motor-open') return 'motor-open';
  if (k === 'motor-closed') return 'motor-closed';
  if (k === 'borer') return 'borer-step';
  if (k === 'disk') return 'disk-seek';
  return '';
}

export function normalizeSys(sys: string): LabSys {
  const s = sys.toLowerCase();
  if (s.includes('motor') && s.includes('closed')) return 'motor-closed';
  if (s.includes('motor')) return 'motor-open';
  if (s.includes('borer') || s.includes('boring')) return 'borer';
  if (s.includes('disk')) return 'disk';
  return 'engine';
}

export type LabGeomBox = { id: string; x: number; y: number; w: number; h: number };
export type LabGeomSum = { id: string; x: number; y: number; r: number };
export type LabGeomSeg = { x1: number; y1: number; x2: number; y2: number; signal: string; hi: string[]; arrowEnd?: boolean };
export type LabGeomTip = { x: number; y: number; signal: string };
export type LabGeomSign = { x: number; y: number; text: string };
export type LabGeomTerm = { x: number; y: number; label: string; l?: number; t?: number; w?: number; h?: number; align?: CanvasTextAlign; size?: number };
export type LabGeomHop = { x: number; y: number; signal: string };
export type LabGeom = {
  boxes: LabGeomBox[];
  sums: LabGeomSum[];
  segs: LabGeomSeg[];
  tips: LabGeomTip[];
  signs: LabGeomSign[];
  terms: LabGeomTerm[];
  marks: LabGeomTerm[];
  hops: LabGeomHop[];
  stacked: boolean;
};
export type WireMeta = { signal: string; hi?: string[] };

function measureAt(g: CanvasRenderingContext2D | null | undefined, s: string, size = 9): number {
  if (g) {
    g.font = `${size}px system-ui, sans-serif`;
    return g.measureText(s).width;
  }
  if (typeof document !== 'undefined' && typeof (document as Document).createElement === 'function') {
    try {
      const c = (document as Document).createElement('canvas');
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.font = `${size}px system-ui, sans-serif`;
        return ctx.measureText(s).width;
      }
    } catch { /* unit tests stub document */ }
  }
  return s.length * size * 0.62;
}

function minBoxWidth(g: CanvasRenderingContext2D | null | undefined, label: string, size = 9): number {
  const words = label.split(' ').filter(Boolean);
  const longest = Math.max(0, ...words.map((w) => measureAt(g, w, size)));
  const full = measureAt(g, label, size);
  // keep wrapped labels to about 3 lines so a one-row box still has room for the rail
  const linesFor = (inner: number) => {
    let line = 0, n = 1;
    for (const word of words) {
      const w = measureAt(g, word, size);
      const add = line === 0 ? w : measureAt(g, ' ', size) + w;
      if (line + add > inner && line > 0) { n += 1; line = w; }
      else line += add;
    }
    return n;
  };
  let inner = Math.max(longest, full <= 90 ? full : longest);
  while (inner < full && linesFor(inner) > 3) inner += 4;
  return Math.max(32, inner + 16);
}

/** Forward-path labels used to decide whether a one-row layout fits at 9 px. */
function forwardLabels(kind: LabSys, words?: LabelWords): string[] {
  const pick = (symbol: string, value: string, plain: string) =>
    words === 'values' ? value : words === 'plain words' ? plain : symbol;
  if (kind === 'motor-open') return [pick('Km/Ra', '10 N·m/V', 'volts to torque'), pick('1/(Js+b)', '1/(2s + 0.5)', 'torque to speed')];
  if (kind === 'motor-closed') return [pick('Ka', '54', 'multiplies the speed shortfall'), pick('Km/Ra', '10 N·m/V', 'volts to torque'), pick('1/(Js+b)', '1/(2s + 0.5)', 'torque to speed')];
  if (kind === 'borer') return [pick('K + 11s', 'K = 20 or 100', 'push on the error now, plus 11 × how fast it is changing'), pick('1/(s(s+1))', '1/(s(s+1))', 'effort to position')];
  if (kind === 'disk') return [pick('Ka', '10 or 80', 'volts per unit error'), pick('G₁ = 5000/(s+1000)', '5000/(s+1000)', 'volts to force, builds in 1 ms'), pick('G₂ = 1/(s(s+20))', '1/(s(s+20))', 'force to position')];
  if (words) {
    return [
      pick('PI', 'P + I', 'error now + so far'),
      pick('Throttle & Manifold', 'nonlinear', 'throttle → air'),
      pick('Induction delay', 'e^{−0.015s}', 'air arrives late'),
      pick('Combustion', 'nonlinear', 'air → torque'),
      pick('Vehicle Dynamics', 'Teng, Tload', 'torque − load → speed'),
      pick('30/π', '30/π', 'rad/s to rpm'),
    ];
  }
  return ['PI', 'throttle & manifold', 'e^{−0.015s}', 'vehicle dynamics'];
}

/** True when a one-row layout can keep every label at ≥ 9 px and inside its box. */
export function labDiagramFitsHorizontal(sys: string, width: number, words?: LabelWords, g?: CanvasRenderingContext2D | null): boolean {
  const kind = normalizeSys(sys);
  const labels = forwardLabels(kind, words);
  const nSums = kind === 'motor-closed' ? 3 : kind === 'engine' ? 1 : 2;
  const boxes = labels.reduce((s, lab) => s + minBoxWidth(g, lab, 9), 0);
  // left reference, summers, gaps, right output label, padding
  const need = 24 + 22 + nSums * 28 + boxes + labels.length * 10 + 24 + 16;
  return width >= need;
}

/** Canvas height so a stacked (phone) or one-row (wide) diagram fits without sideways scroll. */
export function labDiagramHeight(sys: string, width: number, words?: LabelWords, g?: CanvasRenderingContext2D | null): number {
  const kind = normalizeSys(sys);
  const stacked = !labDiagramFitsHorizontal(kind, width, words, g);
  if (stacked) {
    if (kind === 'engine') return 640;
    if (kind === 'motor-closed') return 580;
    return 520;
  }
  if (kind === 'engine') return 440;
  return 300;
}

/** Structural parts — used by tests and by the renderer. */
export interface LabBlockParts {
  sys: LabSys;
  boxes: string[];
  sums: number;
  disturbances: string[];
  outputs: string[];
  hasFeedback: boolean;
  /** script snippets placed beside the blocks they build */
  scriptTags: { box: string; code: string }[];
}

export function labBlockParts(sys: string): LabBlockParts {
  const kind = normalizeSys(sys);
  if (kind === 'motor-open') {
    return {
      sys: kind,
      boxes: ['Km/Ra', '1/(Js+b)', 'Kb'],
      sums: 2,
      disturbances: ['T_d'],
      outputs: ['ω'],
      hasFeedback: true,
      scriptTags: [
        { box: '1/(Js+b)', code: 'sys1=tf([1],[J,b])' },
        { box: 'Km/Ra', code: 'num2=[Km*Kb/Ra]  (coil × back-EMF)' },
        { box: 'Kb', code: 'sys2=tf([Km*Kb/Ra],[1])' },
        { box: 'feedback', code: 'sys_o=feedback(sys1,sys2);  sys_o=-sys_o' },
      ],
    };
  }
  if (kind === 'motor-closed') {
    return {
      sys: kind,
      boxes: ['Ka', 'Km/Ra', '1/(Js+b)', 'Kt', 'Kb'],
      sums: 3,
      disturbances: ['T_d'],
      outputs: ['ω'],
      hasFeedback: true,
      scriptTags: [
        { box: '1/(Js+b)', code: 'sys1=tf([1],[J,b])' },
        { box: 'Ka', code: 'sys2=tf([Ka*Kt],[1])' },
        { box: 'Kt', code: 'sys2=tf([Ka*Kt],[1])' },
        { box: 'Kb', code: 'sys3=tf([Kb],[1])' },
        { box: 'Km/Ra', code: 'sys4=tf([Km/Ra],[1])' },
        { box: 'feedback', code: 'sysa=parallel(sys2,sys3);  sysb=series(sysa,sys4);  sys_c=feedback(sys1,sysb)' },
      ],
    };
  }
  if (kind === 'borer') {
    return {
      sys: kind,
      boxes: ['K+11s', '1/(s(s+1))'],
      sums: 2,
      disturbances: ['T_d'],
      outputs: ['Y'],
      hasFeedback: true,
      scriptTags: [
        { box: 'K+11s', code: 'sys1=tf([11 K1],[0 1])' },
        { box: '1/(s(s+1))', code: 'sysg=tf([1],[1 1 0])' },
        { box: 'feedback', code: 'sysa=series(sys1,sysg);  sysc=feedback(sysa,[1])' },
      ],
    };
  }
  if (kind === 'disk') {
    return {
      sys: kind,
      boxes: ['Ka', '5000/(s+1000)', '1/(s(s+20))'],
      sums: 2,
      disturbances: ['T_d'],
      outputs: ['Y'],
      hasFeedback: true,
      scriptTags: [
        { box: 'Ka', code: 'Ka=…' },
        { box: '5000/(s+1000)', code: 'sysf=tf([5000],[1 1000])' },
        { box: '1/(s(s+20))', code: 'sysg=tf([1],[1 20 0])' },
        { box: 'feedback', code: 'sysa=series(Ka*sysf,sysg);  sys=feedback(sysa,[1])' },
      ],
    };
  }
  return {
    sys: kind,
    boxes: ['PI', 'throttle & manifold', 'e^{−0.015s}', 'vehicle dynamics'],
    sums: 1,
    disturbances: [],
    outputs: ['rpm'],
    hasFeedback: true,
    scriptTags: [],
  };
}

export type LabelWords = 'plain words' | 'symbols' | 'values';
export interface BoxHit { id: string; x: number; y: number; w: number; h: number; tip: string }
export interface LabCaption { symbol: string; value: string; plain: string; tip: string }

export interface DrawLabOpts {
  sys: string;
  show?: string;
  /** id of the block or stage the current script line builds */
  highlight?: string;
  /** ids already built (live stepper); omit to draw the finished diagram */
  built?: Set<string>;
  /** When set, box captions switch between plain words, symbols and values (the `loop` figure). */
  words?: LabelWords;
  /** Filled with box hit-areas for hover/tap tooltips. */
  hits?: BoxHit[];
  /** Test hook: force a stacked or one-row layout. */
  layout?: 'stack' | 'row';
}

type Id = string;

function tone(id: Id, opts: DrawLabOpts, also?: Id[]): 'lit' | 'done' | 'wait' | 'full' {
  if (!opts.highlight && !opts.built) return 'full';
  const ids = [id, ...(also ?? [])];
  if (opts.highlight && ids.includes(opts.highlight)) return 'lit';
  // a loop / series / sign / step line lights the finished loop
  const hi = opts.highlight ?? '';
  if ((hi === 'loop' || hi === 'minreal' || hi === 'sign' || hi === 'step' || hi === 'series' || hi === 'sysb' || hi === 'sysa') && (id === 'feedback' || ids.some((x) => (opts.built ?? new Set()).has(x) || true))) {
    if (hi === 'loop' || hi === 'minreal' || hi === 'sign' || hi === 'step') {
      if (id === 'feedback') return 'lit';
    }
  }
  const built = opts.built;
  if (built && ids.some((x) => built.has(x))) return 'done';
  if (built) return 'wait';
  return 'full';
}

function stroke(t: ReturnType<typeof tone>): { color: string; width: number } {
  if (t === 'lit') return { color: col.e(), width: 2.4 };
  if (t === 'wait') return { color: col.muted(), width: 1.2 };
  return { color: col.text(), width: 1.5 };
}

function sum(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width = 1.5) {
  g.strokeStyle = color; g.lineWidth = width; g.setLineDash([]);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  // a light + in the middle so it reads as a summing junction
  text(g, 'Σ', x, y + 3, color, 'center', Math.max(8, r));
}

/** Arrow into a sum, with a + or − at the approach. */
function intoSum(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, sign: '+' | '−', color: string, r: number) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ex = x2 - Math.cos(ang) * (r + 1), ey = y2 - Math.sin(ang) * (r + 1);
  arrow(g, x1, y1, ex, ey, color);
  const mx = x2 - Math.cos(ang) * (r + 10), my = y2 - Math.sin(ang) * (r + 10);
  // offset the sign perpendicular so it sits beside the arrow
  const px = -Math.sin(ang) * 9, py = Math.cos(ang) * 9;
  text(g, sign, mx + px, my + py + 3, color, 'center', 10);
}

export function drawLabDiagram(g: CanvasRenderingContext2D, w: number, h: number, opts: DrawLabOpts): LabGeom {
  wipe(g, w, h);
  const kind = normalizeSys(opts.sys);
  const script = opts.show === 'script';
  const tags = script ? labBlockParts(kind).scriptTags : [];
  // a side column needs ~160 px and the diagram still needs ~220 px; otherwise put the script under the drawing
  const sideW = script && w >= 400 ? Math.min(250, Math.max(150, w * 0.32)) : 0;
  const botH = script && sideW === 0 ? Math.min(h * 0.42, 16 + tags.length * 16) : 0;
  const dw = w - sideW, dh = h - botH;

  const cap = !!opts.words && !script;
  const stacked = opts.layout === 'stack' ? true
    : opts.layout === 'row' ? false
    : !labDiagramFitsHorizontal(kind, dw, opts.words, g);
  const padL = dw < 200 ? 8 : 16, padR = dw < 200 ? 20 : 36;
  const padT = (dh < 140 ? 8 : 14) + (stacked ? 16 : 0);
  const padB = (dh < 140 ? 10 : 18) + (cap ? 30 : 0) + (stacked ? 12 : 0);
  const X = (x: number) => padL + (x / 100) * (dw - padL - padR);
  const Y = (y: number) => padT + (y / 100) * (dh - padT - padB);
  const W = (ww: number) => (ww / 100) * (dw - padL - padR);
  const H = (hh: number) => (hh / 100) * (dh - padT - padB);
  const r = Math.max(8, Math.min(12, W(4)));
  const SHAFT = 24; // visible arrow shaft outside a summer (tip is 1 px short of the rim)

  const geom: LabGeom = { boxes: [], sums: [], segs: [], tips: [], signs: [], terms: [], marks: [], hops: [], stacked };
  let boxSeq = 0, sumSeq = 0;
  const sigOf = (m?: WireMeta) => m?.signal ?? 'untagged';
  const hiOf = (m?: WireMeta) => m?.hi ?? [];
  const recSeg = (x1: number, y1: number, x2: number, y2: number, m?: WireMeta, arrowEnd = false) => {
    geom.segs.push({ x1, y1, x2, y2, signal: sigOf(m), hi: hiOf(m), arrowEnd });
    if (arrowEnd) geom.tips.push({ x: x2, y: y2, signal: sigOf(m) });
  };
  const arr = (x1: number, y1: number, x2: number, y2: number, color: string, m?: WireMeta) => {
    recSeg(x1, y1, x2, y2, m, true);
    arrow(g, x1, y1, x2, y2, color);
  };
  const into = (x1: number, y1: number, x2: number, y2: number, sign: '+' | '−', color: string, rr: number, m?: WireMeta) => {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const ex = x2 - Math.cos(ang) * (rr + 1), ey = y2 - Math.sin(ang) * (rr + 1);
    recSeg(x1, y1, ex, ey, m, true);
    const mx = x2 - Math.cos(ang) * (rr + 10), my = y2 - Math.sin(ang) * (rr + 10);
    const px = -Math.sin(ang) * 9, py = Math.cos(ang) * 9;
    geom.signs.push({ x: mx + px, y: my + py, text: sign });
    intoSum(g, x1, y1, x2, y2, sign, color, rr);
  };
  const recSum = (x: number, y: number, rr: number, color: string, width = 1.5, id?: string) => {
    const sid = id ?? `sum-${sumSeq++}`;
    geom.sums.push({ id: sid, x, y, r: rr });
    sum(g, x, y, rr, color, width);
    return sid;
  };
  const poly = (pts: { x: number; y: number }[], color: string, width = 1.5, dash: number[] = [], m?: WireMeta) => {
    if (pts.length < 2) return;
    g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < pts.length - 1; i++) recSeg(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, m, false);
  };
  const labelBox = (label: string, x: number, y: number, align: CanvasTextAlign, size: number) => {
    g.font = `${size}px system-ui, sans-serif`;
    const tw = g.measureText(label).width;
    const l = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    return { x, y, label, l, t: y - size * 0.85, w: tw, h: size * 1.15, align, size };
  };
  const term = (label: string, x: number, y: number, color: string, align: CanvasTextAlign, size: number) => {
    text(g, label, x, y, color, align, size);
    geom.terms.push(labelBox(label, x, y, align, size));
  };
  const mark = (label: string, x: number, y: number, color: string, align: CanvasTextAlign, size: number) => {
    text(g, label, x, y, color, align, size);
    geom.marks.push(labelBox(label, x, y, align, size));
  };
  const port = (label: string, x: number, y: number) => { geom.terms.push({ x, y, label }); };
  /** Upper plant box to a lower summer: corridor, then in from above — never on the summer's output side. */
  const plantFromAbove = (box: { l: number; b: number }, sx: number, sy: number, sign: '+' | '−', color: string, m: WireMeta, clearBelow?: number) => {
    const above = sy - r - SHAFT;
    const laneX = Math.max(sx + r + 6, Math.min(box.l - 6, (box.l + sx + r) / 2));
    const dropY = Math.max(box.b, clearBelow ?? box.b);
    if (dropY > box.b + 1) {
      poly([{ x: box.l, y: box.b }, { x: box.l, y: dropY }, { x: laneX, y: dropY }, { x: laneX, y: above }, { x: sx, y: above }], color, 1.5, [], m);
    } else {
      poly([{ x: box.l, y: box.b }, { x: laneX, y: box.b }, { x: laneX, y: above }, { x: sx, y: above }], color, 1.5, [], m);
    }
    into(sx, above, sx, sy, sign, color, r, m);
  };
  /** T_d has its own short arrow; the sign sits near the arrowhead, clear of the label. */
  const tdWidth = (size: number) => {
    g.font = `${size}px system-ui, sans-serif`;
    return g.measureText('T_d').width;
  };
  /** Summer x so a stacked T_d label fits left of the shaft tail, with `corridorLeft` clear for a return lane. */
  const stackedTdSumX = (size: number, corridorLeft: number) => {
    const startMin = corridorLeft + tdWidth(size) + 3;
    return Math.max(X(16), startMin + SHAFT + r);
  };
  const tdArrow = (sx: number, sy: number, sign: '+' | '−', color: string, size: number, m: WireMeta) => {
    // Fixed approach from the left (the plant link uses the top; the output uses the right).
    const startX = sx - r - SHAFT;
    // Pin the name to the left of the shaft's tail and exempt it from the shared
    // placer, which used to bump it down onto the shaft (BUG-103).
    withAnchor({ kind: 'line', x: startX, y: sy, x2: sx - r, y2: sy }, () => {
      term('T_d', startX - 3, sy, col.text(), 'right', size);
    });
    port('T_d', startX, sy);
    into(startX, sy, sx, sy, sign, color, r, m);
  };
  /** Right-hand return over the top, starting at the output — no trip below the output (no dead-end stub). */
  const overTopReturn = (outX: number, outY: number, topY: number, sx: number, sy: number, color: string, m: WireMeta) => {
    poly([{ x: outX, y: outY }, { x: outX, y: topY }, { x: sx, y: topY }], color, 1.5, [], m);
    into(sx, topY, sx, sy, '−', color, r, m);
  };
  /** Return along the bottom and up a left-hand lane, into the summer from below (Engine). */
  const bottomLeftReturn = (outX: number, outY: number, botY: number, leftX: number, sx: number, sy: number, color: string, m: WireMeta) => {
    const below = sy + r + SHAFT;
    poly([{ x: outX, y: outY }, { x: outX, y: botY }, { x: leftX, y: botY }, { x: leftX, y: below }, { x: sx, y: below }], color, 1.5, [], m);
    into(sx, below, sx, sy, '−', color, r, m);
  };

  const anchors: { id: string; x: number; y: number }[] = [];
  let typeSize = stacked ? 10 : 11;

  const colorOf = (id: Id, also?: Id[]) => stroke(tone(id, opts, also));

  const pick = (lab: string | LabCaption) => {
    if (typeof lab === 'string') return lab;
    if (opts.words === 'values') return lab.value;
    if (opts.words === 'plain words') return lab.plain;
    return lab.symbol;
  };
  const boxAt = (id: Id, x: number, y: number, ww: number, hh: number, lab: string | LabCaption, also?: Id[], lim?: { minX?: number; maxX?: number; minY?: number; maxY?: number }) => {
    const t = tone(id, opts, also), s = stroke(t);
    let px = X(x), py = Y(y), bw = W(ww), bh = H(hh);
    const label = pick(lab);
    g.lineWidth = s.width;
    // Shrink to the 9 px floor if needed, then grow or wrap so every line keeps
    // 4 px of inner padding past the text halo (BUG-105). Arrowheads stop at
    // the box edge, so that padding also keeps them clear of the letters.
    const INK_PAD = 4;
    const haloOf = (size: number) => Math.max(3, size * 0.3) / 2;
    const innerPad = (size: number) => INK_PAD + haloOf(size);
    let sz = typeSize;
    const measure = (size: number, inner: number) => {
      const lines = wrap(g, label, Math.max(4, inner), size);
      g.font = `${size}px system-ui, sans-serif`;
      const widest = Math.max(0, ...lines.map((ln) => g.measureText(ln).width));
      const pad = innerPad(size);
      const lh = size + 1;
      const tall = 2 * pad + 1.1 * size + Math.max(0, lines.length - 1) * lh;
      return { lines, widest, tall, pad, lh };
    };
    const clampBox = () => {
      const maxR = w - 2, maxB = h - 2;
      if (px < 2) { bw -= 2 - px; px = 2; }
      if (px + bw > maxR) { px = Math.max(2, maxR - bw); if (px + bw > maxR) bw = Math.max(12, maxR - px); }
      if (lim?.maxX != null && px + bw > lim.maxX) { px = Math.max(lim.minX ?? 2, lim.maxX - bw); if (px + bw > lim.maxX) bw = Math.max(12, lim.maxX - px); }
      if (lim?.minX != null && px < lim.minX) { bw -= lim.minX - px; px = lim.minX; if (lim.maxX != null && px + bw > lim.maxX) bw = Math.max(12, lim.maxX - px); }
      if (py < 2) { bh -= 2 - py; py = 2; }
      if (lim?.minY != null && py < lim.minY) py = lim.minY;
      if (lim?.maxY != null && py + bh > lim.maxY) { py = Math.max(lim.minY ?? 2, lim.maxY - bh); if (py + bh > lim.maxY) bh = Math.max(12, lim.maxY - py); }
      if (py + bh > maxB) { py = Math.max(lim?.minY ?? 2, maxB - bh); if (py + bh > maxB) bh = Math.max(12, maxB - py); }
    };
    for (let pass = 0; pass < 6; pass++) {
      let inner = Math.max(4, bw - 2 * innerPad(sz));
      let fitPass = measure(sz, inner);
      while (sz > 9 && (fitPass.tall > bh || fitPass.widest > inner)) {
        sz -= 1;
        inner = Math.max(4, bw - 2 * innerPad(sz));
        fitPass = measure(sz, inner);
      }
      let grown = false;
      if (fitPass.widest + 2 * fitPass.pad > bw + 0.25) {
        const extra = fitPass.widest + 2 * fitPass.pad - bw;
        px -= extra / 2; bw += extra; grown = true;
      }
      if (fitPass.tall > bh + 0.25) {
        const extra = fitPass.tall - bh;
        py -= extra / 2; bh += extra; grown = true;
      }
      const before = `${px.toFixed(2)},${py.toFixed(2)},${bw.toFixed(2)},${bh.toFixed(2)},${sz}`;
      clampBox();
      const after = `${px.toFixed(2)},${py.toFixed(2)},${bw.toFixed(2)},${bh.toFixed(2)},${sz}`;
      if (after === before && !grown) break;
    }
    const fit = measure(sz, Math.max(4, bw - 2 * innerPad(sz)));
    if (fit.tall > bh) {
      py -= (fit.tall - bh) / 2;
      bh = fit.tall;
      clampBox();
    }
    box(g, px, py, bw, bh, '', s.color, undefined, sz);
    const lh = fit.lh;
    // text() uses a middle baseline, so center the line stack in the box.
    const y0 = py + bh / 2 - ((fit.lines.length - 1) * lh) / 2;
    fit.lines.forEach((ln, i) => {
      withAnchor({ kind: 'marker', x: px + bw / 2, y: y0 + i * lh }, () => {
        text(g, ln, px + bw / 2, y0 + i * lh, col.text(), 'center', sz);
      });
    });
    if (opts.hits && typeof lab !== 'string') opts.hits.push({ id, x: px, y: py, w: bw, h: bh, tip: lab.tip });
    anchors.push({ id, x: px + bw / 2, y: py + bh + 6 });
    const gid = `${id}#${boxSeq++}`;
    geom.boxes.push({ id: gid, x: px, y: py, w: bw, h: bh });
    return { x: px, y: py, w: bw, h: bh, cx: px + bw / 2, cy: py + bh / 2, r: px + bw, b: py + bh, l: px, t: py, gid };
  };
  const L = (symbol: string, value: string, plain: string, tip: string): string | LabCaption =>
    opts.words ? { symbol, value, plain, tip } : symbol;

  const placeSpeedRef = (s1: { x: number; y: number }, pi: { l: number; t: number }, size: number) => {
    g.font = `${size}px system-ui, sans-serif`;
    const lab = 'Speed Ref', tw = g.measureText(lab).width;
    // Sit just above the incoming arrow, not up at the top of a tall first block
    // (that left a ~55 px gap on the wide 844×390 layout).
    let x = s1.x, y = Math.max(size * 0.8, s1.y - r - 8), align: CanvasTextAlign = 'center';
    if (x + tw / 2 > pi.l - 3 && y + size * 0.3 > pi.t) {
      x = Math.max(tw + 2, Math.min(s1.x - r - 4, pi.l - 4));
      align = 'right';
    }
    term(lab, x, y, col.text(), align, size);
  };

  const CAPTION: Record<string, string> = {
    'motor-open': 'drag felt by the load: b + Km·Kb/Ra = 1.5 N·m·s',
    'motor-closed': 'sag and time constant ÷ (1 + loop gain) = ÷ 361',
    borer: 'both responses share s² + 12s + K',
    disk: "the arm's 1/s gives zero step error",
    engine: 'nonlinear: no single transfer function; the tuner linearizes it',
  };

  const rail = 42;
  if (kind === 'motor-open') {
    if (stacked) {
      typeSize = dw < 300 ? 11 : 12;
      const boxH = 12;
      const plantX = 28, plantW = 48;
      const leftLane = 6;
      const sumX = stackedTdSumX(typeSize, leftLane + 6);
      const s1 = { x: sumX, y: Y(20) };
      term('Va', X(2) + 4, s1.y - 11, col.text(), 'center', typeSize);
      const coil = boxAt('sys2', plantX, 20 - boxH / 2, plantW, boxH, L('Km/Ra', '10 N·m/V', 'volts to torque', 'in: voltage Va. out: torque. what it does: turns volts into torque'), ['sys4'], { minX: sumX + r + 8 });
      const s2 = { x: sumX, y: Y(48) };
      const load = boxAt('sys1', plantX, 48 - boxH / 2, plantW, boxH, L('1/(Js+b)', '1/(2s + 0.5)', 'torque to speed', 'in: net torque. out: shaft speed ω. what it does: inertia and friction turn torque into speed'), undefined, { minX: sumX + r + 8 });
      const outX = Math.min(dw - 14, Math.max(load.r + 14, dw - 16));
      const outY = load.cy;
      term('ω', outX + 3, outY + 4, col.text(), 'left', Math.max(12, typeSize));
      const c1 = colorOf('sys2', ['sys4']), c2 = colorOf('sys1'), cf = colorOf('feedback', ['loop', 'sign', 'step']);
      const cKb = colorOf('sys2');
      recSum(s1.x, s1.y, r, c1.color, c1.width);
      recSum(s2.x, s2.y, r, c2.color, c2.width);
      const hiOm = { signal: 'omega', hi: ['feedback', 'loop', 'sign', 'step'] };
      const hiKb = { signal: 'kb-out', hi: ['sys2', 'feedback', 'loop', 'sign', 'step'] };
      port('Va', X(2), s1.y);
      into(X(2), s1.y, s1.x, s1.y, '+', c1.color, r, { signal: 'va', hi: ['sys2', 'sys4'] });
      arr(s1.x + r, s1.y, coil.l, coil.cy, c1.color, { signal: 'coil-in', hi: ['sys2', 'sys4'] });
      plantFromAbove(coil, s2.x, s2.y, '+', c2.color, { signal: 'plant', hi: ['sys1'] });
      arr(s2.x + r, s2.y, load.l, load.cy, c2.color, { signal: 'load-in', hi: ['sys1'] });
      arr(load.r, load.cy, outX, outY, cf.color, hiOm);
      const kb = boxAt('sys2', plantX, 76, plantW, boxH, L('Kb', '0.1 V·s', 'back-EMF: speed makes a voltage that fights the current', 'in: shaft speed ω. out: back-EMF voltage. what it does: the spinning motor makes a voltage that fights its own current'));
      tdArrow(s2.x, s2.y, '−', c2.color, typeSize, { signal: 'td', hi: ['sys1'] });
      // ω down the right into Kb from the right — not shared with Kb's output
      poly([{ x: outX, y: outY }, { x: outX, y: kb.cy }], cf.color, cf.width, [], hiOm);
      arr(outX, kb.cy, kb.r, kb.cy, cf.color, hiOm);
      // Kb returns on its own left-hand lane, into s1 from below with −
      const below = s1.y + r + SHAFT;
      poly([{ x: kb.l, y: kb.cy }, { x: leftLane, y: kb.cy }, { x: leftLane, y: below }, { x: s1.x, y: below }], cKb.color, cKb.width, [], hiKb);
      into(s1.x, below, s1.x, s1.y, '−', cKb.color, r, hiKb);
    } else {
    // Va → ⊕ → [Km/Ra] → ⊕ → [1/(Js+b)] → ω,  Kb on the feedback, T_d into the second sum
    term('Va', X(0) + 8, Y(rail) - 11, col.text(), 'center', 11);
    const s1 = { x: X(10), y: Y(rail) };
    const coil = boxAt('sys2', 16, rail - 10, 20, 20, L('Km/Ra', '10 N·m/V', 'volts to torque', 'in: voltage Va. out: torque. what it does: turns volts into torque'), ['sys4']);
    const s2 = { x: X(48), y: Y(rail) };
    const load = boxAt('sys1', 54, rail - 10, 24, 20, L('1/(Js+b)', '1/(2s + 0.5)', 'torque to speed', 'in: net torque. out: shaft speed ω. what it does: inertia and friction turn torque into speed'));
    const outX = X(92), outY = Y(rail);
    term('ω', outX + 8, outY + 4, col.text(), 'left', 12);
    const c1 = colorOf('sys2', ['sys4']), c2 = colorOf('sys1'), cf = colorOf('feedback', ['loop', 'sign', 'step']);
    const hiOm = { signal: 'omega', hi: ['feedback', 'loop', 'sign', 'step'] };
    const hiKb = { signal: 'kb-out', hi: ['sys2', 'feedback', 'loop', 'sign', 'step'] };
    recSum( s1.x, s1.y, r, c1.color, c1.width);
    recSum( s2.x, s2.y, r, c2.color, c2.width);
    port('Va', X(4), Y(rail));
    into( X(4), Y(rail), s1.x, s1.y, '+', c1.color, r, { signal: 'va', hi: ['sys2', 'sys4'] });
    arr( s1.x + r, s1.y, coil.l, coil.cy, c1.color, { signal: 'coil-in', hi: ['sys2', 'sys4'] });
    into( coil.r, coil.cy, s2.x, s2.y, '+', c2.color, r, { signal: 'plant', hi: ['sys1'] });
    arr( s2.x + r, s2.y, load.l, load.cy, c2.color, { signal: 'load-in', hi: ['sys1'] });
    arr( load.r, load.cy, outX, outY, cf.color, hiOm);
    // T_d from above into sum2, minus
    term('T_d', s2.x, Y(8), col.text(), 'center', 11);
    port('T_d', s2.x, Y(14));
    into( s2.x, Y(14), s2.x, s2.y, '−', c2.color, r, { signal: 'td', hi: ['sys1'] });
    // feedback under, through Kb, into sum1 minus — ω into Kb, Kb output is its own signal
    const kb = boxAt('sys2', 28, 74, 36, 20, L('Kb', '0.1 V·s', 'back-EMF: speed makes a voltage that fights the current', 'in: shaft speed ω. out: back-EMF voltage. what it does: the spinning motor makes a voltage that fights its own current'));
    poly([{ x: outX, y: outY }, { x: outX, y: kb.cy }, { x: kb.r, y: kb.cy }], cf.color, cf.width, [], hiOm);
    poly([{ x: kb.l, y: kb.cy }, { x: s1.x, y: kb.cy }], cf.color, cf.width, [], hiKb);
    into(s1.x, kb.cy, s1.x, s1.y, '−', cf.color, r, hiKb);
    }
  } else if (kind === 'motor-closed') {
    if (stacked) {
      typeSize = dw < 300 ? 11 : 12;
      const boxH = 10;
      const plantX = 30, plantW = 46;
      const leftLane = 18;
      const sumX = stackedTdSumX(typeSize, leftLane + 6);
      const sR = { x: sumX, y: Y(14) };
      term('0', X(2) + 4, sR.y - 11, col.text(), 'center', typeSize);
      const ka = boxAt('sys2', plantX, 14 - boxH / 2, plantW, boxH, L('Ka', '54', 'multiplies the speed shortfall', 'in: speed error (volts). out: amplifier voltage. what it does: multiplies the speed shortfall'), undefined, { minX: sumX + r + 8 });
      const sE = { x: sumX, y: Y(34) };
      const coil = boxAt('sys4', plantX, 34 - boxH / 2, plantW, boxH, L('Km/Ra', '10 N·m/V', 'volts to torque', 'in: coil voltage. out: torque. what it does: turns volts into torque'), ['sysb'], { minX: sumX + r + 8 });
      const sT = { x: sumX, y: Y(54) };
      const load = boxAt('sys1', plantX, 54 - boxH / 2, plantW, boxH, L('1/(Js+b)', '1/(2s + 0.5)', 'torque to speed', 'in: net torque. out: shaft speed ω. what it does: inertia and friction turn torque into speed'), undefined, { minX: sumX + r + 8 });
      const outX = Math.min(dw - 28, load.r + 24);
      const outY = load.cy;
      term('ω', (load.r + outX) / 2, outY - Math.max(12, typeSize), col.text(), 'center', Math.max(12, typeSize));
      const cKa = colorOf('sys2'), cCoil = colorOf('sys4', ['sysb']), cLoad = colorOf('sys1');
      const cFb = colorOf('feedback', ['loop', 'sign', 'step']);
      const cKt = colorOf('sys2'), cKb = colorOf('sys3', ['sysa']);
      recSum(sR.x, sR.y, r, cKa.color, cKa.width);
      recSum(sE.x, sE.y, r, cCoil.color, cCoil.width);
      recSum(sT.x, sT.y, r, cLoad.color, cLoad.width);
      const hiOm = { signal: 'omega', hi: ['feedback', 'loop', 'sign', 'step'] };
      const hiKt = { signal: 'kt-out', hi: ['sys2'] };
      const hiKb = { signal: 'kb-out', hi: ['sys3', 'sysa'] };
      port('0', X(2), sR.y);
      into(X(2), sR.y, sR.x, sR.y, '+', cKa.color, r, { signal: 'ref', hi: ['sys2'] });
      arr(sR.x + r, sR.y, ka.l, ka.cy, cKa.color, { signal: 'ka-in', hi: ['sys2'] });
      plantFromAbove(ka, sE.x, sE.y, '+', cCoil.color, { signal: 'ka-out', hi: ['sys4', 'sysb'] });
      arr(sE.x + r, sE.y, coil.l, coil.cy, cCoil.color, { signal: 'coil-in', hi: ['sys4', 'sysb'] });
      plantFromAbove(coil, sT.x, sT.y, '+', cLoad.color, { signal: 'coil-out', hi: ['sys1'] });
      arr(sT.x + r, sT.y, load.l, load.cy, cLoad.color, { signal: 'load-in', hi: ['sys1'] });
      arr(load.r, load.cy, outX, outY, cFb.color, hiOm);
      // Stack Kb above Kt, each the full width under the plant, so long
      // plain-word labels keep 4 px padding and ω can enter both from the
      // right — no tight gap that reads as Kt feeding Kb (BUG-106).
      const fbMinX = Math.max(leftLane + 16, load.l);
      const fbMaxX = outX - 8;
      const yPct = (py: number) => 100 * (py - padT) / Math.max(1, dh - padT - padB);
      const kb = boxAt('sys3', 50, yPct(load.b + 16), 40, boxH, L('Kb', '0.1 V·s', 'back-EMF: speed makes a voltage that fights the current', 'in: shaft speed ω. out: back-EMF voltage. what it does: the spinning motor makes a voltage that fights its own current'), ['sysa'], { minX: fbMinX, maxX: fbMaxX, minY: load.b + 12 });
      const kt = boxAt('sys2', 50, yPct(kb.b + 16), 40, boxH, L('Kt', '1 V·s', 'speed to volts', 'in: shaft speed ω. out: tachometer volts. what it does: a small generator on the shaft turns speed into volts'), undefined, { minX: fbMinX, maxX: fbMaxX, minY: kb.b + 12 });
      tdArrow(sT.x, sT.y, '−', cLoad.color, typeSize, { signal: 'td', hi: ['sys1'] });
      // ω down the right into each box from the right. Kb leaves left into the
      // electrical summer; Kt drops under itself and returns over the top.
      poly([{ x: outX, y: outY }, { x: outX, y: kt.cy }], cFb.color, cFb.width, [], hiOm);
      arr(outX, kb.cy, kb.r, kb.cy, cFb.color, hiOm);
      arr(outX, kt.cy, kt.r, kt.cy, cFb.color, hiOm);
      const floor = h - (cap ? 20 : 8);
      const underYKt = Math.min(floor, kt.b + 10);
      const kbLeft = leftLane;
      const kbRight = Math.min(dw - 8, Math.max(outX + 8, kt.r + 10));
      const topY = Math.min(sR.y - r - SHAFT, ka.t - 10, padT + 4);
      poly([
        { x: kt.cx, y: kt.b },
        { x: kt.cx, y: underYKt },
        { x: kbRight, y: underYKt },
        { x: kbRight, y: topY },
        { x: sR.x, y: topY },
      ], cKt.color, cKt.width, [], hiKt);
      into(sR.x, topY, sR.x, sR.y, '−', cKt.color, r, hiKt);
      poly([
        { x: kb.l, y: kb.cy },
        { x: kbLeft, y: kb.cy },
        { x: kbLeft, y: sE.y },
      ], cKb.color, cKb.width, [], hiKb);
      into(kbLeft, sE.y, sE.x, sE.y, '−', cKb.color, r, hiKb);
    } else {
    // 0 → ⊕ → [Ka] → ⊕ → [Km/Ra] → ⊕ → [1/(Js+b)] → ω
    //      −Kt         −Kb            −T_d
    term('0', X(0) + 8, Y(rail) - 11, col.text(), 'center', 11);
    const sR = { x: X(8), y: Y(rail) };
    const ka = boxAt('sys2', 14, rail - 10, 12, 20, L('Ka', '54', 'multiplies the speed shortfall', 'in: speed error (volts). out: amplifier voltage. what it does: multiplies the speed shortfall'));
    const sE = { x: X(34), y: Y(rail) };
    const coil = boxAt('sys4', 40, rail - 10, 16, 20, L('Km/Ra', '10 N·m/V', 'volts to torque', 'in: coil voltage. out: torque. what it does: turns volts into torque'), ['sysb']);
    const sT = { x: X(64), y: Y(rail) };
    const load = boxAt('sys1', 70, rail - 10, 18, 20, L('1/(Js+b)', '1/(2s + 0.5)', 'torque to speed', 'in: net torque. out: shaft speed ω. what it does: inertia and friction turn torque into speed'));
    const outX = X(96), outY = Y(rail);
    term('ω', outX + 4, outY + 4, col.text(), 'left', 12);
    const cKa = colorOf('sys2'), cCoil = colorOf('sys4', ['sysb']), cLoad = colorOf('sys1');
    const cFb = colorOf('feedback', ['loop', 'sign', 'step', 'sysa']);
    const hiOm = { signal: 'omega', hi: ['feedback', 'loop', 'sign', 'step'] };
    const hiKt = { signal: 'kt-out', hi: ['sys2'] };
    const hiKb = { signal: 'kb-out', hi: ['sys3', 'sysa'] };
    recSum( sR.x, sR.y, r, cKa.color, cKa.width);
    recSum( sE.x, sE.y, r, cCoil.color, cCoil.width);
    recSum( sT.x, sT.y, r, cLoad.color, cLoad.width);
    port('0', X(2), Y(rail));
    into( X(2), Y(rail), sR.x, sR.y, '+', cKa.color, r, { signal: 'ref', hi: ['sys2'] });
    arr( sR.x + r, sR.y, ka.l, ka.cy, cKa.color, { signal: 'ka-in', hi: ['sys2'] });
    into( ka.r, ka.cy, sE.x, sE.y, '+', cCoil.color, r, { signal: 'ka-out', hi: ['sys4', 'sysb'] });
    arr( sE.x + r, sE.y, coil.l, coil.cy, cCoil.color, { signal: 'coil-in', hi: ['sys4', 'sysb'] });
    into( coil.r, coil.cy, sT.x, sT.y, '+', cLoad.color, r, { signal: 'coil-out', hi: ['sys1'] });
    arr( sT.x + r, sT.y, load.l, load.cy, cLoad.color, { signal: 'load-in', hi: ['sys1'] });
    arr( load.r, load.cy, outX, outY, cFb.color, hiOm);
    term('T_d', sT.x, Y(8), col.text(), 'center', 11);
    port('T_d', sT.x, Y(14));
    into( sT.x, Y(14), sT.x, sT.y, '−', cLoad.color, r, { signal: 'td', hi: ['sys1'] });
    // two feedback boxes on the return: Kt under the first sum, Kb under the middle
    const kt = boxAt('sys2', 10, 72, 12, 16, L('Kt', '1 V·s', 'speed to volts', 'in: shaft speed ω. out: tachometer volts. what it does: a small generator on the shaft turns speed into volts'));
    const kb = boxAt('sys3', 36, 72, 12, 16, L('Kb', '0.1 V·s', 'back-EMF: speed makes a voltage that fights the current', 'in: shaft speed ω. out: back-EMF voltage. what it does: the spinning motor makes a voltage that fights its own current'), ['sysa']);
    const fy = Y(92);
    poly([{ x: outX, y: outY }, { x: outX, y: fy }, { x: Math.min(kt.cx, kb.cx), y: fy }], cFb.color, cFb.width, [], hiOm);
    const ktTop = kt.t - 6, kbTop = kb.t - 6;
    // input taps are ω (same geometry); outputs are their own signals
    poly([{ x: kt.cx, y: fy }, { x: kt.cx, y: kt.b }], cFb.color, 1.5, [], hiOm);
    poly([{ x: kt.cx, y: kt.t }, { x: kt.cx, y: ktTop }, { x: sR.x, y: ktTop }, { x: sR.x, y: sR.y + r + 1 }], colorOf('sys2').color, 1.5, [], hiKt);
    into(sR.x, ktTop, sR.x, sR.y, '−', colorOf('sys2').color, r, hiKt);
    poly([{ x: kb.cx, y: fy }, { x: kb.cx, y: kb.b }], cFb.color, 1.5, [], hiOm);
    poly([{ x: kb.cx, y: kb.t }, { x: kb.cx, y: kbTop }, { x: sE.x, y: kbTop }, { x: sE.x, y: sE.y + r + 1 }], colorOf('sys3', ['sysa']).color, 1.5, [], hiKb);
    into(sE.x, kbTop, sE.x, sE.y, '−', colorOf('sys3', ['sysa']).color, r, hiKb);
    }
  } else if (kind === 'borer') {
    if (stacked) {
      typeSize = dw < 300 ? 11 : 12;
      const boxH = 14;
      const plantX = 28, plantW = 50;
      const sumX = stackedTdSumX(typeSize, 6);
      const s1 = { x: sumX, y: Y(16) };
      term('R', X(2) + 4, s1.y - 11, col.text(), 'center', typeSize);
      const gc = boxAt('sys1', plantX, 16 - boxH / 2, plantW, boxH, L('K + 11s', 'K = 20 or 100', 'push on the error now, plus 11 × how fast it is changing', 'in: position error. out: steering effort. what it does: push on the error now, plus 11 × how fast it is changing'), undefined, { minX: sumX + r + 8 });
      const s2 = { x: sumX, y: Y(48) };
      const gplant = boxAt('sysg', plantX, 48 - boxH / 2, plantW, boxH, L('1/(s(s+1))', '1/(s(s+1))', 'effort to position', 'in: effort plus the rock T_d. out: cutter position Y. what it does: turns steering effort into position along the planned line'), undefined, { minX: sumX + r + 8 });
      const outX = Math.min(dw - 14, Math.max(gplant.r + 14, dw - 16));
      const outY = gplant.cy;
      term('Y', outX + 3, outY + 4, col.text(), 'left', Math.max(12, typeSize));
      const c1 = colorOf('sys1'), c2 = colorOf('sysg', ['series']), cf = colorOf('feedback', ['loop', 'minreal']);
      recSum(s1.x, s1.y, r, c1.color, c1.width);
      recSum(s2.x, s2.y, r, c2.color, c2.width);
      const hiFb = { signal: 'feedback', hi: ['feedback', 'loop', 'minreal'] };
      port('R', X(2), s1.y);
      into(X(2), s1.y, s1.x, s1.y, '+', c1.color, r, { signal: 'ref', hi: ['sys1'] });
      arr(s1.x + r, s1.y, gc.l, gc.cy, c1.color, { signal: 'gc-in', hi: ['sys1'] });
      plantFromAbove(gc, s2.x, s2.y, '+', c2.color, { signal: 'gc-out', hi: ['sysg', 'series'] });
      arr(s2.x + r, s2.y, gplant.l, gplant.cy, c2.color, { signal: 'plant-in', hi: ['sysg', 'series'] });
      arr(gplant.r, gplant.cy, outX, outY, cf.color, hiFb);
      tdArrow(s2.x, s2.y, '+', c2.color, typeSize, { signal: 'td', hi: ['sysg'] });
      const topY = Math.min(s1.y - r - SHAFT, gc.t - 10, padT + 4);
      overTopReturn(outX, outY, topY, s1.x, s1.y, cf.color, hiFb);
    } else {
    term('R', X(2), Y(rail) - 11, col.text(), 'center', 11);
    const s1 = { x: X(10), y: Y(rail) };
    const gc = boxAt('sys1', 16, rail - 10, 22, 20, L('K + 11s', 'K = 20 or 100', 'push on the error now, plus 11 × how fast it is changing', 'in: position error. out: steering effort. what it does: push on the error now, plus 11 × how fast it is changing'));
    const s2 = { x: X(50), y: Y(rail) };
    const gplant = boxAt('sysg', 56, rail - 10, 24, 20, L('1/(s(s+1))', '1/(s(s+1))', 'effort to position', 'in: effort plus the rock T_d. out: cutter position Y. what it does: turns steering effort into position along the planned line'));
    const outX = X(94), outY = Y(rail);
    term('Y', outX + 6, outY + 4, col.text(), 'left', 12);
    const c1 = colorOf('sys1'), c2 = colorOf('sysg', ['series']), cf = colorOf('feedback', ['loop', 'minreal']);
    const hiFb = { signal: 'feedback', hi: ['feedback', 'loop', 'minreal'] };
    recSum( s1.x, s1.y, r, c1.color, c1.width);
    recSum( s2.x, s2.y, r, c2.color, c2.width);
    port('R', X(4), Y(rail));
    into( X(4), Y(rail), s1.x, s1.y, '+', c1.color, r, { signal: 'ref', hi: ['sys1'] });
    arr( s1.x + r, s1.y, gc.l, gc.cy, c1.color, { signal: 'gc-in', hi: ['sys1'] });
    into( gc.r, gc.cy, s2.x, s2.y, '+', c2.color, r, { signal: 'gc-out', hi: ['sysg', 'series'] });
    arr( s2.x + r, s2.y, gplant.l, gplant.cy, c2.color, { signal: 'plant-in', hi: ['sysg', 'series'] });
    arr( gplant.r, gplant.cy, outX, outY, cf.color, hiFb);
    term('T_d', s2.x, Y(8), col.text(), 'center', 11);
    port('T_d', s2.x, Y(14));
    into( s2.x, Y(14), s2.x, s2.y, '+', c2.color, r, { signal: 'td', hi: ['sysg'] });
    const fy = Y(88);
    g.strokeStyle = cf.color; g.lineWidth = cf.width; g.setLineDash([]);
    poly([{ x: outX, y: outY }, { x: outX, y: fy }, { x: s1.x, y: fy }, { x: s1.x, y: s1.y + r + 1 }], cf.color, cf.width, [], hiFb);
    into( s1.x, fy, s1.x, s1.y, '−', cf.color, r, hiFb);
    }
  } else if (kind === 'disk') {
    if (stacked) {
      typeSize = dw < 300 ? 11 : 12;
      const boxH = 11;
      const plantX = 28, plantW = 50;
      const sumX = stackedTdSumX(typeSize, 6);
      const s1 = { x: sumX, y: Y(12) };
      term('R', X(2) + 4, s1.y - 11, col.text(), 'center', typeSize);
      const ka = boxAt('Ka', plantX, 12 - boxH / 2, plantW, boxH, L('Ka', '10 or 80', 'volts per unit error', 'in: position error. out: amplifier voltage. what it does: volts per unit error'), ['series'], { minX: sumX + r + 8 });
      const g1 = boxAt('sysf', plantX, 32 - boxH / 2, plantW, boxH, L('G₁ = 5000/(s+1000)', '5000/(s+1000)', 'volts to force, builds in 1 ms', 'in: voltage. out: force. what it does: the coil turns volts into force; current builds in about 1 ms'), ['series'], { minX: sumX + r + 8 });
      const s2 = { x: sumX, y: Y(54) };
      const g2 = boxAt('sysg', plantX, 54 - boxH / 2, plantW, boxH, L('G₂ = 1/(s(s+20))', '1/(s(s+20))', 'force to position', 'in: net force (coil minus shock). out: head position Y. what it does: the arm turns force into position'), undefined, { minX: sumX + r + 8 });
      const outX = Math.min(dw - 14, Math.max(g2.r + 14, dw - 16));
      const outY = g2.cy;
      term('Y', outX + 3, outY + 4, col.text(), 'left', Math.max(12, typeSize));
      const c1 = colorOf('Ka', ['series']), cG1 = colorOf('sysf', ['series']), cG2 = colorOf('sysg'), cf = colorOf('feedback', ['loop', 'sign', 'step']);
      recSum(s1.x, s1.y, r, c1.color, c1.width);
      recSum(s2.x, s2.y, r, cG2.color, cG2.width);
      const hiFb = { signal: 'feedback', hi: ['feedback', 'loop', 'sign', 'step'] };
      port('R', X(2), s1.y);
      into(X(2), s1.y, s1.x, s1.y, '+', c1.color, r, { signal: 'ref', hi: ['Ka', 'series'] });
      arr(s1.x + r, s1.y, ka.l, ka.cy, c1.color, { signal: 'ka-in', hi: ['Ka', 'series'] });
      arr(ka.cx, ka.b, g1.cx, g1.t, cG1.color, { signal: 'g1-in', hi: ['sysf', 'series'] });
      plantFromAbove(g1, s2.x, s2.y, '+', cG2.color, { signal: 'g1-out', hi: ['sysg'] });
      arr(s2.x + r, s2.y, g2.l, g2.cy, cG2.color, { signal: 'g2-in', hi: ['sysg'] });
      arr(g2.r, g2.cy, outX, outY, cf.color, hiFb);
      tdArrow(s2.x, s2.y, '−', cG2.color, typeSize, { signal: 'td', hi: ['sysg'] });
      const topY = Math.min(s1.y - r - SHAFT, ka.t - 10, padT + 4);
      // unity gain sits on the top bar of the return, not out on a stub
      mark('1', (outX + s1.x) / 2, topY - 8, colorOf('feedback').color, 'center', 10);
      overTopReturn(outX, outY, topY, s1.x, s1.y, cf.color, hiFb);
    } else {
    term('R', X(2), Y(rail) - 11, col.text(), 'center', 11);
    const s1 = { x: X(8), y: Y(rail) };
    const ka = boxAt('Ka', 14, rail - 10, 10, 20, L('Ka', '10 or 80', 'volts per unit error', 'in: position error. out: amplifier voltage. what it does: volts per unit error'), ['series']);
    const g1 = boxAt('sysf', 28, rail - 10, 24, 20, L('G₁ = 5000/(s+1000)', '5000/(s+1000)', 'volts to force, builds in 1 ms', 'in: voltage. out: force. what it does: the coil turns volts into force; current builds in about 1 ms'), ['series']);
    const s2 = { x: X(60), y: Y(rail) };
    const g2 = boxAt('sysg', 66, rail - 10, 22, 20, L('G₂ = 1/(s(s+20))', '1/(s(s+20))', 'force to position', 'in: net force (coil minus shock). out: head position Y. what it does: the arm turns force into position'));
    const outX = X(96), outY = Y(rail);
    term('Y', outX + 4, outY + 4, col.text(), 'left', 12);
    const c1 = colorOf('Ka', ['series']), cG1 = colorOf('sysf', ['series']), cG2 = colorOf('sysg'), cf = colorOf('feedback', ['loop', 'sign', 'step']);
    const hiFb = { signal: 'feedback', hi: ['feedback', 'loop', 'sign', 'step'] };
    recSum( s1.x, s1.y, r, c1.color, c1.width);
    recSum( s2.x, s2.y, r, cG2.color, cG2.width);
    port('R', X(2), Y(rail));
    into( X(2), Y(rail), s1.x, s1.y, '+', c1.color, r, { signal: 'ref', hi: ['Ka', 'series'] });
    arr( s1.x + r, s1.y, ka.l, ka.cy, c1.color, { signal: 'ka-in', hi: ['Ka', 'series'] });
    arr( ka.r, ka.cy, g1.l, g1.cy, cG1.color, { signal: 'g1-in', hi: ['sysf', 'series'] });
    into( g1.r, g1.cy, s2.x, s2.y, '+', cG2.color, r, { signal: 'g1-out', hi: ['sysg'] });
    arr( s2.x + r, s2.y, g2.l, g2.cy, cG2.color, { signal: 'g2-in', hi: ['sysg'] });
    arr( g2.r, g2.cy, outX, outY, cf.color, hiFb);
    term('T_d', s2.x, Y(8), col.text(), 'center', 11);
    port('T_d', s2.x, Y(14));
    into( s2.x, Y(14), s2.x, s2.y, '−', cG2.color, r, { signal: 'td', hi: ['sysg'] });
    // unit sensor on the return
    const fy = Y(88);
    mark('1', X(8) - 14, fy - 6, colorOf('feedback').color, 'center', 10);
    g.strokeStyle = cf.color; g.lineWidth = cf.width; g.setLineDash([]);
    poly([{ x: outX, y: outY }, { x: outX, y: fy }, { x: s1.x, y: fy }, { x: s1.x, y: s1.y + r + 1 }], cf.color, cf.width, [], hiFb);
    into( s1.x, fy, s1.x, s1.y, '−', cf.color, r, hiFb);
    }
  } else if (opts.words) {
    // engine (handout p.1): wide canvas keeps one row; on a phone, stack the plant
    // so labels stay readable instead of stretching into skinny tall boxes.
    const c = { color: col.a(), width: 1.8 }, cf = { color: col.text(), width: 1.5 }, cd = { color: col.b(), width: 1.8 };
    if (stacked) {
      typeSize = dw < 300 ? 11 : 12;
      const boxH = 9.2;
      // leave a right margin for Tload, N, and the rpm label
      const plantX = 18, plantW = 52;
      const s1 = { x: X(14), y: Y(7.5) };
      const leftLane = Math.max(6, s1.x - r - 12);
      const pi = boxAt('PI', 22, 7.5 - boxH / 2, 58, boxH, L('PI', 'P + I', 'error now + so far', 'in: speed error. out: throttle command. what it does: P and I make a throttle from the error now and the error so far'), undefined, { minX: s1.x + r + 4, maxX: dw - 24 });
      placeSpeedRef(s1, pi, typeSize);
      const th = boxAt('throttle', plantX, 22.5 - boxH / 2, plantW, boxH, L('Throttle & Manifold', 'nonlinear', 'throttle → air', 'in: throttle command and engine speed N. out: air charge. what it does: throttle angle and speed to air charge'));
      const del = boxAt('delay', plantX, 37.5 - boxH / 2, plantW, boxH, L('Induction delay', 'e^{−0.015s}', 'air arrives late', 'in: air charge. out: delayed air charge. what it does: air takes time to reach the cylinders'));
      const comb = boxAt('combustion', plantX, 52.5 - boxH / 2, plantW, boxH, L('Combustion', 'nonlinear', 'air → torque', 'in: delayed air charge and engine speed N. out: combustion torque. what it does: air charge to torque'));
      const veh = boxAt('vehicle', plantX, 67.5 - boxH / 2, plantW, boxH, L('Vehicle Dynamics', 'Teng, Tload', 'torque − load → speed', "in: combustion torque Teng and load Tload. out: engine speed (rad/s). what it does: torque minus load spins the engine"));
      const rpm = boxAt('rpm', plantX, 82.5 - boxH / 2, plantW, boxH, L('30/π', '30/π', 'rad/s to rpm', 'in: rad/s. out: rpm. what it does: converts shaft speed to rpm'));
      // feedback drops just past rpm, not past the (wider) PI — keeps it off the N bus
      const outX = Math.min(dw - 24, rpm.r + 14);
      const outY = rpm.cy;
      term('rpm', outX + 3, outY + 4, col.text(), 'left', typeSize);
      recSum(s1.x, s1.y, r, c.color, c.width);
      const hiFwd = { signal: 'forward', hi: ['PI'] };
      const hiFb = { signal: 'feedback', hi: ['feedback'] };
      // Start far enough left that the stacked ref shaft stays ≥ 20 px, even
      // on the ~257 px canvas of a 320 viewport.
      const refStart = Math.max(2, s1.x - r - 1 - SHAFT);
      port('Speed Ref', refStart, s1.y);
      into(refStart, s1.y, s1.x, s1.y, '+', col.text(), r, { signal: 'ref', hi: ['PI'] });
      arr(s1.x + r, s1.y, pi.l, pi.cy, c.color, hiFwd);
      arr(pi.cx, pi.b, th.cx, th.t, c.color, hiFwd);
      arr(th.cx, th.b, del.cx, del.t, c.color, hiFwd);
      arr(del.cx, del.b, comb.cx, comb.t, c.color, hiFwd);
      arr(comb.cx, comb.b, veh.cx, veh.t, c.color, hiFwd);
      arr(veh.cx, veh.b, rpm.cx, rpm.t, c.color, hiFwd);
      arr(rpm.r, rpm.cy, outX, outY, cf.color, hiFb);
      // Tload arrives from the right; label sits to the right of the arrow, not over the box
      const tloadX = veh.r + Math.max(12, W(4));
      arr(tloadX, veh.cy, veh.r, veh.cy, cd.color, { signal: 'tload', hi: ['vehicle'] });
      const tSz = Math.max(10, typeSize - 1);
      term('Tload', tloadX + 3, veh.cy - 7, col.text(), 'left', tSz);
      term('(drag)', tloadX + 3, veh.cy + 8, col.text(), 'left', tSz);
      // N bus stays to the right of the feedback drop, and above the Tload label (BUG-102)
      const nBus = Math.min(dw - 6, Math.max(outX + 10, tloadX + W(16)));
      const nY = veh.t + 3;
      poly([{ x: veh.r, y: nY }, { x: nBus, y: nY }, { x: nBus, y: th.cy }, { x: th.r, y: th.cy }], col.muted(), 1, [3, 3], { signal: 'N' });
      poly([{ x: nBus, y: comb.cy }, { x: comb.r, y: comb.cy }], col.muted(), 1, [3, 3], { signal: 'N' });
      term('N', nBus - 6, (th.cy + comb.cy) / 2, col.muted(), 'right', 10);
      // bottom-and-up-the-left return (2075cdb style): short jog just below rpm, up the left into the summer from below
      const botY = Math.min(h - (cap ? 28 : 10), rpm.b + 12);
      bottomLeftReturn(outX, outY, botY, leftLane, s1.x, s1.y, cf.color, hiFb);
    } else {
      const r1 = 40;
      const boxH = 26;
      const s1 = { x: X(7), y: Y(r1) };
      const pi = boxAt('PI', 11, r1 - boxH / 2, 13, boxH, L('PI', 'P + I', 'error now + so far', 'in: speed error. out: throttle command. what it does: P and I make a throttle from the error now and the error so far'));
      placeSpeedRef(s1, pi, typeSize);
      const th = boxAt('throttle', 26, r1 - boxH / 2, 16, boxH, L('Throttle & Manifold', 'nonlinear', 'throttle → air', 'in: throttle command and engine speed N. out: air charge. what it does: throttle angle and speed to air charge'));
      const del = boxAt('delay', 44, r1 - boxH / 2, 14, boxH, L('Induction delay', 'e^{−0.015s}', 'air arrives late', 'in: air charge. out: delayed air charge. what it does: air takes time to reach the cylinders'));
      const comb = boxAt('combustion', 60, r1 - boxH / 2, 13, boxH, L('Combustion', 'nonlinear', 'air → torque', 'in: delayed air charge and engine speed N. out: combustion torque. what it does: air charge to torque'));
      const veh = boxAt('vehicle', 75, r1 - boxH / 2, 14, boxH, L('Vehicle Dynamics', 'Teng, Tload', 'torque − load → speed', "in: combustion torque Teng and load Tload. out: engine speed (rad/s). what it does: torque minus load spins the engine"));
      const rpm = boxAt('rpm', 91, r1 - boxH / 2, 6, boxH, L('30/π', '30/π', 'rad/s to rpm', 'in: rad/s. out: rpm. what it does: converts shaft speed to rpm'));
      const outX = rpm.r + 12, outY = rpm.cy;
      term('rpm', outX + 2, outY + 4, col.text(), 'left', 10);
      recSum( s1.x, s1.y, r, c.color, c.width);
      const hiFwd = { signal: 'forward', hi: ['PI'] };
      const hiFb = { signal: 'feedback', hi: ['feedback'] };
      port('Speed Ref', X(1), Y(r1));
      into( X(1), Y(r1), s1.x, s1.y, '+', col.text(), r, { signal: 'ref', hi: ['PI'] });
      arr( s1.x + r, s1.y, pi.l, pi.cy, c.color, hiFwd);
      arr( pi.r, pi.cy, th.l, th.cy, c.color, hiFwd);
      arr( th.r, th.cy, del.l, del.cy, c.color, hiFwd);
      // stay on one rail: the extra canvas width (fig-wide) gives each box room to wrap
      arr( del.r, del.cy, comb.l, comb.cy, c.color, hiFwd);
      arr( comb.r, comb.cy, veh.l, veh.cy, c.color, hiFwd);
      arr( veh.r, veh.cy, rpm.l, rpm.cy, c.color, hiFwd);
      arr( rpm.r, rpm.cy, outX, outY, cf.color, hiFb);
      term('Tload (drag)', veh.cx, veh.t - 12, col.text(), 'center', 9);
      arr( veh.cx, veh.t - 8, veh.cx, veh.t, cd.color, { signal: 'tload', hi: ['vehicle'] });
      g.strokeStyle = col.muted(); g.lineWidth = 1; g.setLineDash([3, 3]);
      const ny = Y(14);
      poly([{ x: rpm.cx, y: rpm.t }, { x: rpm.cx, y: ny }, { x: th.cx, y: ny }, { x: th.cx, y: th.t }], col.muted(), 1, [3, 3], { signal: 'N' });
      poly([{ x: comb.cx, y: ny }, { x: comb.cx, y: comb.t }], col.muted(), 1, [3, 3], { signal: 'N' });
      term('N', (th.cx + comb.cx) / 2, ny - 4, col.muted(), 'center', 8);
      g.setLineDash([]);
      const fy = Y(92);
      g.strokeStyle = cf.color; g.lineWidth = cf.width; g.setLineDash([]);
      poly([{ x: outX, y: outY }, { x: outX, y: fy }, { x: s1.x, y: fy }, { x: s1.x, y: s1.y + r + 1 }], cf.color, cf.width, [], hiFb);
      into( s1.x, fy, s1.x, s1.y, '−', col.text(), r, hiFb);
    }
  } else {
    // engine (script stepper: a compact four-box path)
    term('rpm*', X(0), Y(rail) + 3, col.text(), 'left', 11);
    const s1 = { x: X(8), y: Y(rail) };
    const pi = boxAt('PI', 14, rail - 10, 10, 20, 'PI');
    const th = boxAt('throttle', 28, rail - 10, 22, 20, 'throttle & manifold');
    const del = boxAt('delay', 54, rail - 10, 16, 20, 'e^{−0.015s}');
    const veh = boxAt('vehicle', 74, rail - 10, 16, 20, 'vehicle dynamics');
    const outX = X(96), outY = Y(rail);
    term('rpm', outX + 2, outY + 4, col.text(), 'left', 11);
    const c = colorOf('PI'), cf = colorOf('feedback');
    const hiFwd = { signal: 'forward', hi: ['PI'] };
    const hiFb = { signal: 'feedback', hi: ['feedback'] };
    recSum( s1.x, s1.y, r, c.color, c.width);
    port('rpm*', X(2), Y(rail));
    into( X(2), Y(rail), s1.x, s1.y, '+', c.color, r, { signal: 'ref', hi: ['PI'] });
    arr( s1.x + r, s1.y, pi.l, pi.cy, c.color, hiFwd);
    arr( pi.r, pi.cy, th.l, th.cy, c.color, hiFwd);
    arr( th.r, th.cy, del.l, del.cy, c.color, hiFwd);
    arr( del.r, del.cy, veh.l, veh.cy, c.color, hiFwd);
    arr( veh.r, veh.cy, outX, outY, cf.color, hiFb);
    const fy = Y(88);
    g.strokeStyle = cf.color; g.lineWidth = cf.width; g.setLineDash([]);
    poly([{ x: outX, y: outY }, { x: outX, y: fy }, { x: s1.x, y: fy }, { x: s1.x, y: s1.y + r + 1 }], cf.color, cf.width, [], hiFb);
    into( s1.x, fy, s1.x, s1.y, '−', cf.color, r, hiFb);
  }

  if (script && tags.length) {
    const mono = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    if (sideW > 0) {
      const sx = dw + 6, sw = sideW - 12;
      tags.forEach((t, i) => {
        const y = 18 + i * ((dh - 24) / Math.max(1, tags.length));
        g.font = mono;
        const lines = wrap(g, t.code, sw, 9);
        text(g, t.box, sx, y, col.muted(), 'left', 8);
        lines.forEach((ln, j) => text(g, ln, sx, y + 12 + j * 11, col.text(), 'left', 9));
      });
    } else {
      const y0 = dh + 4, sw = w - 16;
      tags.forEach((t, i) => {
        const y = y0 + i * 14;
        text(g, `${t.box}:  ${t.code}`, 8, y, col.text(), 'left', 9);
      });
    }
  }

  if (cap) {
    const msg = CAPTION[kind];
    if (msg) {
      const lines = wrap(g, msg, Math.max(40, w - padL - 8), 10);
      lines.forEach((ln, i) => text(g, ln, padL, h - 4 - (lines.length - 1 - i) * 12, col.muted(), 'left', 10));
    }
  }
  return geom;
}

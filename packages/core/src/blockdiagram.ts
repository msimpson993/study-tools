/**
 * Staged block diagrams for an example scene: the loop is drawn under (or beside) the
 * physical picture and builds up box by box. Pure catalogue + layout + drawing; scene.ts
 * places the strip and supplies live signal values. Content picks a stage with
 * `exampleScene.diagram` (see docs/example-scenes.md).
 */
export const DIAGRAM_STAGES = ['open', 'states', 'loop', 'disturb', 'pid', 'noise', 'gain', 'sfb', 'observer', 'sep', 'refin'] as const;
export type DiagramStage = typeof DIAGRAM_STAGES[number];
export type DiagramSpec = DiagramStage | DiagramStage[];

/** Named pieces of the diagram. */
export type DiagramPart =
  | 'u' | 'G' | 'y' | 'x' | 'xdot'
  | 'r' | 'sum' | 'e' | 'C' | 'fb'
  | 'd' | 'P' | 'I' | 'D' | 'n' | 'K'
  | 'observer' | 'L' | 'xhat' | 'Nbar';

const BASE: Record<DiagramStage, DiagramPart[]> = {
  open: ['u', 'G', 'y'],
  states: ['u', 'G', 'y', 'x', 'xdot'],
  loop: ['r', 'sum', 'e', 'C', 'u', 'G', 'y', 'fb'],
  disturb: ['r', 'sum', 'e', 'C', 'u', 'G', 'y', 'fb', 'd'],
  pid: ['r', 'sum', 'e', 'C', 'P', 'I', 'D', 'u', 'G', 'y', 'fb'],
  noise: ['r', 'sum', 'e', 'C', 'u', 'G', 'y', 'fb', 'n'],
  gain: ['r', 'sum', 'e', 'C', 'K', 'u', 'G', 'y', 'fb'],
  sfb: ['u', 'G', 'y', 'x', 'xdot', 'K'],
  observer: ['u', 'G', 'y', 'observer', 'L', 'xhat'],
  sep: ['u', 'G', 'y', 'observer', 'L', 'xhat', 'K'],
  refin: ['r', 'Nbar', 'u', 'G', 'y', 'observer', 'L', 'xhat', 'K'],
};

/** Parts that first appear at this stage (highlighted, with a small "new" tag). */
const NEW: Record<DiagramStage, DiagramPart[]> = {
  open: ['G'],
  states: ['x', 'xdot'],
  loop: ['r', 'sum', 'e', 'C', 'fb'],
  disturb: ['d'],
  pid: ['P', 'I', 'D'],
  noise: ['n'],
  gain: ['K'],
  sfb: ['K'],
  observer: ['observer', 'L', 'xhat'],
  sep: ['K', 'observer'],
  refin: ['r', 'Nbar'],
};

export const isDiagramStage = (s: string): s is DiagramStage => (DIAGRAM_STAGES as readonly string[]).includes(s);

export function diagramStages(spec?: DiagramSpec | null): DiagramStage[] {
  if (!spec) return [];
  return Array.isArray(spec) ? spec : [spec];
}

/** Validate a content `diagram` value. Returns error messages (empty = ok). */
export function diagramProblems(raw: unknown, where: string): string[] {
  if (raw === undefined || raw === null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  if (!list.length) return [`${where}: diagram is empty`];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    if (typeof s !== 'string' || !isDiagramStage(s)) out.push(`${where}: unknown diagram stage ${JSON.stringify(s)} (want ${DIAGRAM_STAGES.join(', ')})`);
    else if (seen.has(s)) out.push(`${where}: duplicate diagram stage "${s}"`);
    else seen.add(s);
  }
  return out;
}

export const partsOf = (stage: DiagramStage): DiagramPart[] => BASE[stage].slice();
export const newPartsOf = (stage: DiagramStage): DiagramPart[] => NEW[stage].slice();

/** Height of one stage's drawing (px). */
export function diagramStageHeight(stage: DiagramStage, w: number): number {
  if (stage === 'open' || stage === 'states') return w < 340 ? 70 : 66;
  if (stage === 'pid') return w < 400 ? 128 : 120;
  if (stage === 'disturb') return w < 400 ? 124 : 116;
  if (stage === 'observer' || stage === 'sep' || stage === 'refin') return w < 400 ? 136 : 128;
  if (stage === 'sfb') return w < 400 ? 118 : 110;
  return w < 400 ? 112 : 104;
}

/** Side-by-side from this width; below it, two stages stack. */
export const DIAGRAM_SIDE_BY_SIDE = 700;

export function diagramStripHeight(stages: DiagramStage[], w: number): number {
  if (!stages.length) return 0;
  if (stages.length === 1) return diagramStageHeight(stages[0], w);
  if (w >= DIAGRAM_SIDE_BY_SIDE) return Math.max(...stages.map((s) => diagramStageHeight(s, (w - 8) / stages.length)));
  let h = 0;
  for (const s of stages) h += diagramStageHeight(s, w) + 8;
  return h - 8;
}

export interface DiagramRect { stage: DiagramStage; rect: { x: number; y: number; w: number; h: number } }

/** Place one or more stage panels under the main picture. */
export function layoutDiagrams(stages: DiagramStage[], w: number, y: number): DiagramRect[] {
  if (!stages.length) return [];
  if (stages.length === 1) return [{ stage: stages[0], rect: { x: 0, y, w, h: diagramStageHeight(stages[0], w) } }];
  if (w >= DIAGRAM_SIDE_BY_SIDE) {
    const gap = 8, cw = (w - gap * (stages.length - 1)) / stages.length, h = diagramStripHeight(stages, w);
    return stages.map((stage, i) => ({ stage, rect: { x: i * (cw + gap), y, w: cw, h } }));
  }
  const out: DiagramRect[] = [];
  let yy = y;
  for (const stage of stages) {
    const h = diagramStageHeight(stage, w);
    out.push({ stage, rect: { x: 0, y: yy, w, h } });
    yy += h + 8;
  }
  return out;
}

export interface DiagramPalette {
  text: string; muted: string; accent: string; elev: string; panel: string;
  strong: string; border: string; ok: string; bad: string; warn: string;
  s0: string; s1: string; s2: string; s3: string;
}
export interface DiagramSignals {
  u?: number; y?: number; e?: number; r?: number; d?: number;
  up?: number; ui?: number; ud?: number; ym?: number; K?: number;
}

const G_EQ = '1/(s² + 3s + 2)';

const fmt = (v: number, d = 2) => {
  if (!Number.isFinite(v)) return '';
  const s = v.toFixed(d);
  return s.replace(/\.?0+$/, '') || '0';
};

const STAGE_TITLE: Record<DiagramStage, string> = {
  open: 'open loop',
  states: 'plant with states',
  loop: 'closed loop',
  disturb: 'disturbance d',
  pid: 'C = P + I + D',
  noise: 'sensor noise',
  gain: 'gain K',
  sfb: 'state feedback K',
  observer: 'observer',
  sep: 'compensator',
  refin: 'reference input',
};

type G = CanvasRenderingContext2D;
type Rect = { x: number; y: number; w: number; h: number };

let LB: { x0: number; y0: number; x1: number; y1: number }[] = [];
let BND: Rect | null = null;
const begin = (r: Rect) => { LB = []; BND = r; };
const hits = (a: { x0: number; y0: number; x1: number; y1: number }) => LB.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0);

/** Always paints left-aligned at the computed box, so label-collision tests measure the true ink. */
function text(g: G, s: string, x: number, y: number, color: string, o: { align?: CanvasTextAlign; px?: number; wt?: number; optional?: boolean } = {}): boolean {
  let px = o.px ?? 10;
  g.font = `${o.wt ?? 600} ${px}px system-ui,sans-serif`;
  let w = g.measureText(s).width;
  if (BND) {
    const room = BND.w - 6;
    if (w > room) { px = Math.max(8, (px * room) / w); g.font = `${o.wt ?? 600} ${px}px system-ui,sans-serif`; w = g.measureText(s).width; }
  }
  let x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  if (BND) x0 = Math.min(Math.max(x0, BND.x + 3), BND.x + BND.w - 3 - w);
  let yy = y;
  if (BND) yy = Math.min(Math.max(yy, BND.y + px * 0.85 + 0.5), BND.y + BND.h - px * 0.25 - 0.5);
  const box = (yv: number) => ({ x0: x0 - 1, x1: x0 + w + 1, y0: yv - px * 0.85, y1: yv + px * 0.25 });
  if (hits(box(yy))) {
    if (o.optional) return false;
    let placed = false;
    for (const dy of [-(px + 1), px + 1, -2 * (px + 1), 2 * (px + 1)]) {
      const yv = yy + dy, bx = box(yv);
      if (!hits(bx) && (!BND || (bx.y0 >= BND.y && bx.y1 <= BND.y + BND.h))) { yy = yv; placed = true; break; }
    }
    if (!placed && o.optional) return false;
  }
  LB.push(box(yy));
  g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = color; g.fillText(s, x0, yy);
  return true;
}

function stroke(g: G, color: string, wd = 1.5) { g.strokeStyle = color; g.lineWidth = wd; g.setLineDash([]); g.lineJoin = 'round'; g.lineCap = 'round'; }
function arrow(g: G, x0: number, y0: number, x1: number, y1: number, color: string, wd = 1.6) {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1.5) return;
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = wd; g.lineCap = 'round';
  const a = Math.atan2(y1 - y0, x1 - x0), hl = Math.min(6, L * 0.6);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - Math.cos(a) * hl * 0.6, y1 - Math.sin(a) * hl * 0.6); g.stroke();
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - hl * Math.cos(a - 0.4), y1 - hl * Math.sin(a - 0.4)); g.lineTo(x1 - hl * Math.cos(a + 0.4), y1 - hl * Math.sin(a + 0.4)); g.closePath(); g.fill();
  g.restore();
}
function box(g: G, x: number, y: number, w: number, h: number, P: DiagramPalette, hl: boolean) {
  g.beginPath();
  if (typeof g.roundRect === 'function') g.roundRect(x, y, w, h, 6); else g.rect(x, y, w, h);
  g.fillStyle = P.elev; g.fill();
  g.strokeStyle = hl ? P.accent : P.strong; g.lineWidth = hl ? 2.2 : 1.5; g.stroke();
}
function tag(g: G, x: number, y: number, P: DiagramPalette) {
  const lab = 'new', px = 8, w = 22, h = 11;
  if (BND) {
    x = Math.min(Math.max(x, BND.x + 2), BND.x + BND.w - w - 2);
    y = Math.min(Math.max(y, BND.y + 1), BND.y + BND.h - h - 1);
  }
  g.fillStyle = P.accent;
  g.beginPath();
  if (typeof g.roundRect === 'function') g.roundRect(x, y, w, h, 4); else g.rect(x, y, w, h);
  g.fill();
  // left-aligned at the ink origin so collision tests see the true box
  g.font = `800 ${px}px system-ui,sans-serif`;
  const tw = g.measureText(lab).width;
  g.fillStyle = '#0b1020'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(lab, x + (w - tw) / 2, y + 9);
  LB.push({ x0: x, y0: y, x1: x + w, y1: y + h });
}
const hl = (stage: DiagramStage, p: DiagramPart) => NEW[stage].includes(p);
const col = (P: DiagramPalette, stage: DiagramStage, p: DiagramPart, fallback: string) => hl(stage, p) ? P.accent : fallback;

function plantBox(g: G, x: number, y: number, w: number, h: number, P: DiagramPalette, stage: DiagramStage) {
  const high = hl(stage, 'G');
  box(g, x, y, w, h, P, high);
  text(g, 'G(s)', x + w / 2, y + (stage === 'states' ? 15 : 16), P.text, { align: 'center', px: 11, wt: 800 });
  text(g, G_EQ, x + w / 2, y + (stage === 'states' ? 28 : 29), P.muted, { align: 'center', px: w >= 140 ? 9.5 : 8.5, wt: 600 });
  if (stage === 'states') {
    text(g, 'states x, ẋ', x + w / 2, y + h - 7, col(P, stage, 'x', P.s0), { align: 'center', px: 10, wt: 700 });
    if (hl(stage, 'x')) tag(g, x + 4, y + h - 14, P);
  }
  if (high) tag(g, x + w - 24, y + 2, P);
}

function title(g: G, r: Rect, stage: DiagramStage, P: DiagramPalette) {
  text(g, STAGE_TITLE[stage], r.x + 6, r.y + 12, P.muted, { px: 8.5, wt: 700, optional: true });
}

/**
 * Draw one staged diagram into `rect`. Coordinates are in CSS pixels of the scene canvas.
 * Newly added parts at this stage use the accent colour and a small "new" tag.
 */
export function drawBlockDiagram(
  g: G,
  rect: Rect,
  stage: DiagramStage,
  P: DiagramPalette,
  sig: DiagramSignals = {},
): void {
  g.save();
  g.beginPath(); g.rect(rect.x, rect.y, rect.w, rect.h); g.clip();
  g.fillStyle = P.panel; g.fillRect(rect.x, rect.y, rect.w, rect.h);
  g.strokeStyle = P.border; g.lineWidth = 1;
  g.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  begin(rect);
  title(g, rect, stage, P);
  if (stage === 'open' || stage === 'states') drawOpen(g, rect, stage, P, sig);
  else if (stage === 'pid') drawPid(g, rect, P, sig);
  else if (stage === 'sfb' || stage === 'observer' || stage === 'sep' || stage === 'refin') drawSfb(g, rect, stage, P, sig);
  else drawLoop(g, rect, stage, P, sig);
  g.restore();
}

function drawOpen(g: G, r: Rect, stage: DiagramStage, P: DiagramPalette, sig: DiagramSignals) {
  const pad = 8, mid = r.y + r.h * 0.58, left = r.x + pad, right = r.x + r.w - pad;
  const uCol = col(P, stage, 'u', P.s0), yCol = col(P, stage, 'y', P.ok);
  const uTxt = sig.u !== undefined ? `u = ${fmt(sig.u)}` : 'u';
  const yTxt = sig.y !== undefined ? `y = ${fmt(sig.y)}` : 'y';
  text(g, uTxt, left, mid - 8, uCol, { px: 10, wt: 700 });
  // reserve a consistent plant width so the arrows stay readable at 390 px
  const uW = 56, yW = 56;
  const bx = left + uW, bw = Math.max(120, right - yW - bx), by = mid - (stage === 'states' ? 24 : 20), bh = stage === 'states' ? 48 : 40;
  arrow(g, left + 28, mid, bx, mid, uCol);
  plantBox(g, bx, by, bw, bh, P, stage);
  arrow(g, bx + bw, mid, right - 28, mid, yCol);
  text(g, yTxt, right, mid - 8, yCol, { align: 'right', px: 10, wt: 700 });
}

function drawLoop(g: G, r: Rect, stage: DiagramStage, P: DiagramPalette, sig: DiagramSignals) {
  const pad = 8, mid = r.y + (stage === "disturb" ? 52 : 40), bot = r.y + r.h - 14;
  const left = r.x + pad, right = r.x + r.w - pad, W = right - left;
  const tight = W < 360;
  const cW = stage === 'gain' ? (tight ? 72 : 88) : (tight ? 48 : 58);
  const cH = 32, gH = 40, sumR = 8;
  const xR = left + 2;
  const xSum = left + (tight ? 40 : 52);
  const xC = xSum + sumR + 20;
  const afterC = xC + cW;
  const xDs = stage === 'disturb' ? afterC + 16 : afterC;
  const gW = Math.max(100, Math.min(tight ? 128 : 150, right - 40 - (stage === 'disturb' ? xDs + 16 : afterC + 16)));
  const xG = stage === 'disturb' ? xDs + 16 : afterC + 16;
  const xY = right - 2;

  const rCol = col(P, stage, 'r', P.text), eCol = col(P, stage, 'e', P.muted);
  const cCol = col(P, stage, 'C', P.text), kCol = col(P, stage, 'K', P.accent);
  const uCol = col(P, stage, 'u', P.s0), yCol = col(P, stage, 'y', P.ok);
  const fbCol = col(P, stage, 'fb', P.ok), dCol = col(P, stage, 'd', P.bad), nCol = col(P, stage, 'n', P.warn);

  const rTxt = sig.r !== undefined ? `r = ${fmt(sig.r, 1)}` : 'r';
  text(g, rTxt, xR, mid - 8, rCol, { px: 10, wt: 700 });
  arrow(g, xR + (tight ? 22 : 30), mid, xSum - sumR, mid, rCol);

  g.beginPath(); g.arc(xSum, mid, sumR, 0, 7); g.fillStyle = P.elev; g.fill();
  stroke(g, hl(stage, 'sum') ? P.accent : P.strong, hl(stage, 'sum') ? 2.2 : 1.5); g.stroke();
  text(g, '+', xSum - 1, mid - 11, P.muted, { align: 'center', px: 9, wt: 800, optional: true });
  text(g, '−', xSum + 8, mid + 14, P.muted, { align: 'center', px: 10, wt: 800, optional: true });

  arrow(g, xSum + sumR, mid, xC, mid, eCol);
  text(g, 'e', (xSum + sumR + xC) / 2, mid - 5, eCol, { align: 'center', px: 9, wt: 700, optional: true });

  const cHigh = hl(stage, 'C') || hl(stage, 'K');
  const cLab = stage === 'gain' ? (sig.K !== undefined ? `C: K = ${fmt(sig.K, sig.K % 1 ? 1 : 0)}` : 'C: u = K·e') : 'C';
  box(g, xC, mid - cH / 2, cW, cH, P, cHigh);
  text(g, cLab, xC + cW / 2, mid + 4, hl(stage, 'K') ? kCol : cCol, { align: 'center', px: tight ? 9 : 10, wt: 800 });
  if (cHigh) tag(g, xC + cW - 22, mid - cH / 2 - 5, P);

  let uFrom = afterC;
  if (stage === 'disturb') {
    arrow(g, afterC, mid, xDs - 7, mid, uCol);
    g.beginPath(); g.arc(xDs, mid, 7, 0, 7); g.fillStyle = P.elev; g.fill();
    stroke(g, dCol, 2.1); g.stroke();
    text(g, '+', xDs, mid + 4, P.muted, { align: 'center', px: 8, wt: 800, optional: true });
    arrow(g, xDs, mid - 26, xDs, mid - 7, dCol);
    uFrom = xDs + 7;
    // d label is painted after the plant box so G cannot cover it
  }
  arrow(g, uFrom, mid, xG, mid, uCol);
  text(g, sig.u !== undefined ? `u` : 'u', (uFrom + xG) / 2, mid - 5, uCol, { align: 'center', px: 9, wt: 700, optional: true });

  const gw = Math.max(96, Math.min(gW, xY - 26 - xG));
  plantBox(g, xG, mid - gH / 2, gw, gH, P, stage);
  const gR = xG + gw;
  arrow(g, gR, mid, xY - 18, mid, yCol);
  const yTxt = sig.y !== undefined ? `y = ${fmt(sig.y)}` : 'y';
  text(g, yTxt, xY, mid - 8, yCol, { align: 'right', px: 10, wt: 700 });

  if (stage === 'disturb') {
    const dTxt = sig.d !== undefined ? `d = ${fmt(sig.d, 1)}` : 'd';
    text(g, dTxt, xDs + 10, mid - 18, dCol, { px: 9, wt: 700 });
    if (hl(stage, 'd')) tag(g, xDs + 62, mid - 28, P);
  }

  const fbX = Math.min(xY - 8, gR + 12);
  stroke(g, fbCol, hl(stage, 'fb') ? 2 : 1.6);
  g.beginPath(); g.moveTo(fbX, mid + 6); g.lineTo(fbX, bot); g.lineTo(xSum, bot); g.lineTo(xSum, mid + sumR); g.stroke();
  arrow(g, xSum, mid + sumR + 8, xSum, mid + sumR, fbCol, hl(stage, 'fb') ? 2 : 1.6);
  const yLabX = stage === 'disturb' ? fbX - 16 : (fbX + xSum) / 2;
  text(g, 'y', yLabX, bot - 4, fbCol, { align: 'center', px: 9, wt: 700, optional: true });
  if (hl(stage, 'fb')) tag(g, yLabX + 10, bot - 14, P);

  if (stage === 'noise') {
    const nx = xSum + (fbX - xSum) * 0.62;
    arrow(g, nx, bot + 1, nx, bot - 1, nCol, 2);
    const nTxt = 'n';
    text(g, nTxt, nx + 8, bot + 1, nCol, { px: 10, wt: 800 });
    if (hl(stage, 'n')) tag(g, nx + 16, bot - 12, P);
  }
}

function drawPid(g: G, r: Rect, P: DiagramPalette, sig: DiagramSignals) {
  const pad = 8, mid = r.y + 52, bot = r.y + r.h - 14;
  const left = r.x + pad, right = r.x + r.w - pad, W = right - left;
  const tight = W < 360, sumR = 8, cW = tight ? 92 : 112, cH = 72, gH = 40;
  const xR = left + 2, xSum = left + (tight ? 40 : 52), xC = xSum + sumR + 20;
  const xG = xC + cW + 18, xY = right - 2;
  const rCol = col(P, 'pid', 'r', P.text), eCol = col(P, 'pid', 'e', P.muted);
  const uCol = col(P, 'pid', 'u', P.s0), yCol = col(P, 'pid', 'y', P.ok), fbCol = col(P, 'pid', 'fb', P.ok);

  text(g, sig.r !== undefined ? `r = ${fmt(sig.r, 1)}` : 'r', xR, mid - 8, rCol, { px: 10, wt: 700 });
  arrow(g, xR + 24, mid, xSum - sumR, mid, rCol);
  g.beginPath(); g.arc(xSum, mid, sumR, 0, 7); g.fillStyle = P.elev; g.fill();
  stroke(g, P.strong, 1.5); g.stroke();
  text(g, '+', xSum - 1, mid - 11, P.muted, { align: 'center', px: 9, wt: 800, optional: true });
  text(g, '−', xSum + 8, mid + 14, P.muted, { align: 'center', px: 10, wt: 800, optional: true });
  arrow(g, xSum + sumR, mid, xC, mid, eCol);
  text(g, 'e', (xSum + sumR + xC) / 2, mid - 5, eCol, { align: 'center', px: 9, wt: 700, optional: true });

  box(g, xC, mid - cH / 2, cW, cH, P, true);
  tag(g, xC + cW - 22, mid - cH / 2 + 2, P);
  text(g, 'C', xC + cW / 2, mid - cH / 2 + 14, P.text, { align: 'center', px: 10, wt: 800 });
  const rows: [DiagramPart, string, number | undefined, string][] = [
    ['P', 'P', sig.up, P.s1], ['I', 'I', sig.ui, P.s2], ['D', 'D', sig.ud, P.s3],
  ];
  rows.forEach(([p, lab, v, fallback], i) => {
    const yy = mid - cH / 2 + 28 + i * 13;
    text(g, v !== undefined ? `${lab}  ${fmt(v, 1)}` : lab, xC + cW / 2, yy, col(P, 'pid', p, fallback), { align: 'center', px: 9, wt: 700 });
  });

  arrow(g, xC + cW, mid, xG, mid, uCol);
  text(g, 'u', (xC + cW + xG) / 2, mid - 5, uCol, { align: 'center', px: 9, wt: 700, optional: true });
  const gw = Math.max(96, Math.min(tight ? 120 : 140, xY - 26 - xG));
  plantBox(g, xG, mid - gH / 2, gw, gH, P, 'pid');
  const gR = xG + gw;
  arrow(g, gR, mid, xY - 18, mid, yCol);
  text(g, sig.y !== undefined ? `y = ${fmt(sig.y)}` : 'y', xY, mid - 8, yCol, { align: 'right', px: 10, wt: 700 });
  const fbX = Math.min(xY - 8, gR + 12);
  stroke(g, fbCol, 1.6);
  g.beginPath(); g.moveTo(fbX, mid + 6); g.lineTo(fbX, bot); g.lineTo(xSum, bot); g.lineTo(xSum, mid + 8); g.stroke();
  arrow(g, xSum, mid + 16, xSum, mid + 8, fbCol, 1.6);
  text(g, 'y', (fbX + xSum) / 2, bot - 4, fbCol, { align: 'center', px: 9, wt: 700, optional: true });
}

function drawSfb(g: G, r: Rect, stage: DiagramStage, P: DiagramPalette, sig: DiagramSignals) {
  const pad = 8, left = r.x + pad, right = r.x + r.w - pad, mid = r.y + (stage === 'sfb' ? 52 : 58);
  const bot = r.y + r.h - 14, W = right - left, tight = W < 360;
  const gW = tight ? 108 : 128, gH = 40, kW = tight ? 54 : 64, kH = 32, oW = tight ? 86 : 100, oH = 36;
  if (stage === 'sfb') {
    const xK = left + (tight ? 8 : 20), xG = xK + kW + 36, xY = right - 4;
    const kCol = col(P, stage, 'K', P.accent), uCol = col(P, stage, 'u', P.s0), yCol = col(P, stage, 'y', P.ok);
    box(g, xK, mid - kH / 2, kW, kH, P, hl(stage, 'K'));
    text(g, 'K', xK + kW / 2, mid + 4, kCol, { align: 'center', px: 11, wt: 800 });
    if (hl(stage, 'K')) tag(g, xK + kW - 22, mid - kH / 2 - 5, P);
    arrow(g, xK + kW, mid, xG, mid, uCol);
    text(g, 'u = −Kx', (xK + kW + xG) / 2, mid - 6, uCol, { align: 'center', px: 9, wt: 700 });
    plantBox(g, xG, mid - gH / 2, Math.max(96, Math.min(gW, xY - 28 - xG)), gH, P, 'states');
    const gR = xG + Math.max(96, Math.min(gW, xY - 28 - xG));
    arrow(g, gR, mid, xY - 16, mid, yCol);
    text(g, 'y = x', xY, mid - 8, yCol, { align: 'right', px: 10, wt: 700 });
    // state feedback from the plant down to K
    stroke(g, kCol, 2); g.beginPath(); g.moveTo((xG + gR) / 2, mid + gH / 2); g.lineTo((xG + gR) / 2, bot); g.lineTo(xK + kW / 2, bot); g.lineTo(xK + kW / 2, mid + kH / 2); g.stroke();
    arrow(g, xK + kW / 2, mid + kH / 2 + 8, xK + kW / 2, mid + kH / 2, kCol, 2);
    text(g, 'x, ẋ', (xG + xK) / 2, bot - 4, col(P, stage, 'x', P.s0), { align: 'center', px: 9, wt: 700, optional: true });
    return;
  }
  // observer / sep / refin: plant on the top row, observer under it, K on the left
  const xR = left + 2, showR = stage === 'refin';
  const xN = showR ? left + (tight ? 36 : 48) : left;
  const xK = (showR ? xN + 28 : left + 6);
  const xG = xK + kW + 28, gw = Math.max(96, Math.min(gW, right - 50 - xG)), xY = Math.min(right - 4, xG + gw + 36);
  const kCol = col(P, stage, 'K', P.text), oCol = col(P, stage, 'observer', P.accent);
  const lCol = col(P, stage, 'L', P.accent), xhCol = col(P, stage, 'xhat', P.s2);
  const uCol = col(P, stage, 'u', P.s0), yCol = col(P, stage, 'y', P.ok), rCol = col(P, stage, 'r', P.text);
  const nCol = col(P, stage, 'Nbar', P.accent);

  if (showR) {
    text(g, 'r', xR, mid - 8, rCol, { px: 10, wt: 700 });
    if (hl(stage, 'r')) tag(g, xR, r.y + 16, P);
    arrow(g, xR + 14, mid, xN, mid, rCol);
    box(g, xN, mid - 14, 24, 28, P, hl(stage, 'Nbar'));
    text(g, 'N̄', xN + 12, mid + 4, nCol, { align: 'center', px: 9, wt: 800 });
    if (hl(stage, 'Nbar')) tag(g, xN + 6, mid - 22, P);
    arrow(g, xN + 24, mid, xK, mid, uCol);
  }

  if (stage !== 'observer') {
    box(g, xK, mid - kH / 2, kW, kH, P, hl(stage, 'K'));
    text(g, 'K', xK + kW / 2, mid + 4, kCol, { align: 'center', px: 11, wt: 800 });
    if (hl(stage, 'K')) tag(g, xK + kW - 22, mid - kH / 2 - 5, P);
    arrow(g, xK + kW, mid, xG, mid, uCol);
    text(g, 'u = −K x̂', (xK + kW + xG) / 2, mid - 6, uCol, { align: 'center', px: 9, wt: 700, optional: true });
  } else {
    text(g, 'u', xK + 8, mid - 8, uCol, { px: 10, wt: 700 });
    arrow(g, xK + 22, mid, xG, mid, uCol);
  }
  plantBox(g, xG, mid - gH / 2, gw, gH, P, 'loop');
  const gR = xG + gw;
  arrow(g, gR, mid, xY - 16, mid, yCol);
  text(g, 'y', xY, mid - 8, yCol, { align: 'right', px: 10, wt: 700 });

  const oX = xG, oY = bot - oH, oMid = oY + oH / 2;
  box(g, oX, oY, oW, oH, P, hl(stage, 'observer') || hl(stage, 'L'));
  text(g, stage === 'observer' ? 'observer  L' : 'observer', oX + oW / 2, oMid + 4, oCol, { align: 'center', px: 9, wt: 800 });
  if (hl(stage, 'observer') || hl(stage, 'L')) tag(g, oX + oW - 22, oY - 6, P);
  // y down into observer
  const yDrop = Math.min(xY - 8, gR + 10);
  stroke(g, yCol, 1.6); g.beginPath(); g.moveTo(yDrop, mid + 6); g.lineTo(yDrop, oMid); g.lineTo(oX + oW, oMid); g.stroke();
  arrow(g, oX + oW + 8, oMid, oX + oW, oMid, yCol, 1.6);
  // xhat from observer to K (or just labelled for observer-only)
  stroke(g, xhCol, hl(stage, 'xhat') ? 2 : 1.6);
  g.beginPath(); g.moveTo(oX, oMid); g.lineTo(xK + kW / 2, oMid); g.lineTo(xK + kW / 2, mid + kH / 2); g.stroke();
  if (stage !== 'observer') arrow(g, xK + kW / 2, mid + kH / 2 + 8, xK + kW / 2, mid + kH / 2, xhCol, 1.6);
  text(g, 'x̂', (oX + xK) / 2, oMid - 5, xhCol, { align: 'center', px: 10, wt: 800 });
  // also feed u into the observer (copy of the plant)
  const uDrop = xG - 10;
  stroke(g, uCol, 1.2); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(uDrop, mid + 4); g.lineTo(uDrop, oY); g.stroke(); g.setLineDash([]);
  arrow(g, uDrop, oY - 6, uDrop, oY, uCol, 1.2);
  text(g, 'u', uDrop + 6, (mid + oY) / 2, uCol, { px: 8, wt: 600, optional: true });
  void sig; void lCol;
}

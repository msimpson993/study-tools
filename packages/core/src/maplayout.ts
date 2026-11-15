/** Pure geometry for the question map: auto-layout in staggered rows, orthogonal edges, collision-avoided labels. No DOM. */
export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface InNode { id: string; label: string; detail?: string; kind?: string }
export interface InEdge { from: string; to: string; label?: string }
export interface NodeBox extends Rect { id: string; row: number; lines: string[]; detailLines: string[]; kind: string }
export interface EdgeGeom { key: string; from: string; to: string; points: Pt[]; dot: Pt; gapTop: number; gapBottom: number; /** hop-overs: where this line's horizontal piece jumps over another line's vertical piece */ hops: Hop[] }
export interface Label extends Rect { key: string; text: string }
export interface Geometry { width: number; height: number; nodeW: number; boxes: Record<string, NodeBox>; order: string[]; edges: EdgeGeom[] }

/** One small semicircular jump on a horizontal piece (segment `seg` = points[seg]→points[seg+1]): the arc runs from x0 to x1 (x0 < x1, in screen terms) and rises `ry` above the line. `n` crossings sit under it. */
export interface Hop { seg: number; x0: number; x1: number; y: number; ry: number; n: number }
export const QM_HOP_R = 7;
export const QM_CORNER_R = 7;
/** a hop may squeeze the corner next to it down to this, and shrink down to QM_HOP_MIN */
const QM_HOP_CORNER = 3;
const QM_HOP_MIN = 3.5;
export const QM_TRACK = 14;
export const QM_DOT_R = 6;
export const QM_LABEL_H = 18;
const QM_LABEL_CHAR = 6.4;
const QM_TITLE_CHAR = 7.4;
const QM_DETAIL_CHAR = 6.6;

export const edgeKey = (from: string, to: string): string => `${from}__${to}`;

export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let cur = '';
  for (const raw of words) {
    let word = raw;
    while (word.length > maxChars) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, maxChars - 1) + '-');
      word = word.slice(maxChars - 1);
    }
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= maxChars) cur = next;
    else { if (cur) lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1];
    kept[maxLines - 1] = last.length >= maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
    return kept;
  }
  return lines;
}

export function overlaps(a: Rect, b: Rect, pad = 0): boolean {
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
}

/** "Actual size" lays the map out at least this wide (4 columns of 184 px boxes with 52 px lanes + margins) so boxes keep their comfortable size; narrower screens pan. */
export const ACTUAL_MIN_WIDTH = 980;
export type MapView = 'fit' | 'actual';
/** Layout width for a view mode: `fit` follows the container (current behaviour), `actual` never goes below ACTUAL_MIN_WIDTH. */
export const layoutWidth = (view: MapView, containerWidth: number): number => (view === 'actual' ? Math.max(containerWidth, ACTUAL_MIN_WIDTH) : containerWidth);
/* ───────────────────────────── layout ─────────────────────────────
 * 1. ranks (longest path from the sources) and, inside every rank, a node order that minimises line crossings
 *    (barycenter sweeps, then adjacent swaps judged on the real routed drawing; cached per map + column count, deterministic);
 * 2. rows of at most `cols` boxes; 3. every line that passes a row gets its OWN vertical lane there (no two lines share a lane,
 *    channels are widened by shrinking the boxes when they would be too tight); 4. ports on the boxes follow the lanes;
 * 5. in every gap between rows the horizontal tracks are ordered to cross as little as possible. */
interface Graph { nodes: InNode[]; edges: InEdge[]; topo: string[]; rank: Record<string, number>; maxRank: number; parents: Record<string, string[]>; children: Record<string, string[]>; byId: Record<string, InNode>; sig: string; sized: Map<number, Record<string, { lines: string[]; detailLines: string[]; h: number }>> }
interface Params { nodeW: number; lane: number; margin: number; cols: number; width: number }
interface Built { geom: Geometry; overfull: number; stacked: number; crossings: number; wire: number }
const GRAPHS = new Map<string, Graph>();
const ORDERS = new Map<string, string[][]>();
const MIN_LANE_SP = 4, LANE_SP = 8;

function graphOf(nodes: InNode[], edges: InEdge[]): Graph {
  const sig = `${nodes.map((n) => `${n.id}:${n.kind ?? ''}:${n.label}:${n.detail ?? ''}`).join('|')}#${edges.map((e) => `${e.from}>${e.to}`).join(',')}`;
  const hit = GRAPHS.get(sig); if (hit) return hit;
  const children: Record<string, string[]> = {}, parents: Record<string, string[]> = {};
  for (const n of nodes) { children[n.id] = []; parents[n.id] = []; }
  for (const e of edges) { children[e.from].push(e.to); parents[e.to].push(e.from); }
  const indeg: Record<string, number> = {};
  for (const n of nodes) indeg[n.id] = parents[n.id].length;
  const topo: string[] = [], queue = nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
  while (queue.length) { const u = queue.shift() as string; topo.push(u); for (const v of children[u]) { indeg[v] -= 1; if (indeg[v] === 0) queue.push(v); } }
  if (topo.length !== nodes.length) throw new Error('question map has a cycle');
  const rank: Record<string, number> = {};
  for (const u of topo) rank[u] = parents[u].length ? Math.max(...parents[u].map((p) => rank[p] + 1)) : 0;
  const byId: Record<string, InNode> = {}; for (const n of nodes) byId[n.id] = n;
  const g: Graph = { nodes, edges, topo, rank, maxRank: Math.max(...topo.map((u) => rank[u])), parents, children, byId, sig, sized: new Map() };
  if (GRAPHS.size > 40) GRAPHS.clear();
  GRAPHS.set(sig, g); return g;
}
function sizesFor(G: Graph, nodeW: number) {
  const hit = G.sized.get(nodeW); if (hit) return hit;
  const out: Record<string, { lines: string[]; detailLines: string[]; h: number }> = {};
  for (const n of G.nodes) {
    const kind = n.kind ?? 'box', inner = nodeW - (kind === 'decision' ? 44 : 26);
    const lines = wrapText(n.label, Math.max(8, Math.floor(inner / QM_TITLE_CHAR)), 3);
    const detailLines = n.detail ? wrapText(n.detail, Math.max(8, Math.floor(inner / QM_DETAIL_CHAR)), 2) : [];
    out[n.id] = { lines, detailLines, h: Math.max(kind === 'decision' ? 60 : 50, 20 + lines.length * 15 + detailLines.length * 14) };
  }
  G.sized.set(nodeW, out); return out;
}

/** Order the tracks of one gap: each line comes down at xt, runs along its track and goes on down at xb. Returns track index per line. */
function orderTracks(items: { xt: number; xb: number }[]): { pos: number[]; crossings: number; overlaps: number } {
  const n = items.length, lo = items.map((s) => Math.min(s.xt, s.xb)), hi = items.map((s) => Math.max(s.xt, s.xb));
  // a line coming down at x (xt of j) and another line leaving its track downward at the same x (xb of i) run on top of each other when j's track is below i's
  const stack = (i: number, j: number) => i !== j && Math.abs(items[j].xt - items[i].xb) < 1.5;
  const parts = (pos: number[]) => {
    let c = 0, o = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (pos[i] < pos[j] && items[j].xt > lo[i] + EPS && items[j].xt < hi[i] - EPS) c++;
      else if (pos[i] > pos[j] && items[j].xb > lo[i] + EPS && items[j].xb < hi[i] - EPS) c++;
      if (stack(i, j) && pos[i] < pos[j]) o++;
    }
    return { c, o };
  };
  const cost = (pos: number[]) => { const r = parts(pos); return r.c + 8 * r.o; };
  let seq = items.map((_, i) => i).sort((p, q) => (items[p].xt + items[p].xb) - (items[q].xt + items[q].xb) || p - q);
  const toPos = (s: number[]) => { const p = new Array<number>(n); s.forEach((k, i) => (p[k] = i)); return p; };
  let best = cost(toPos(seq));
  for (let pass = 0; pass < 8 && best > 0 && n > 1; pass++) {
    let improved = false;
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const t = seq.slice(); const [m] = t.splice(i, 1); t.splice(k, 0, m);
      const c = cost(toPos(t)); if (c < best) { best = c; seq = t; improved = true; }
    }
    if (!improved) break;
  }
  const fin = parts(toPos(seq));
  return { pos: toPos(seq), crossings: fin.c, overlaps: fin.o };
}

function build(G: Graph, p: Params, order: string[][]): Built {
  const { nodeW, lane, margin, cols, width } = p, { edges, topo } = G, sized = sizesFor(G, nodeW);
  const rows: string[][] = [], centerX: Record<string, number> = {}, rowOf: Record<string, number> = {};
  for (let r = 0; r <= G.maxRank; r++) {
    const ids = order[r];
    for (let i = 0; i < ids.length; i += cols) {
      const chunk = ids.slice(i, i + cols), rowW = chunk.length * nodeW + (chunk.length - 1) * lane, startX = (width - rowW) / 2;
      chunk.forEach((u, j) => { centerX[u] = startX + j * (nodeW + lane) + nodeW / 2; rowOf[u] = rows.length; });
      rows.push(chunk);
    }
  }
  const gapCount: number[] = rows.map(() => 0);
  for (const e of edges) { const a = rowOf[e.from], b = rowOf[e.to]; if (b <= a) throw new Error(`edge ${e.from}->${e.to} does not go down`); for (let g = a; g < b; g++) gapCount[g]++; }
  const rowTop: number[] = [], gapTop: number[] = [], gapH: number[] = [];
  let y = 16;
  rows.forEach((row, i) => {
    rowTop[i] = y; y += Math.max(...row.map((u) => sized[u].h)); gapTop[i] = y;
    gapH[i] = i === rows.length - 1 ? 16 : Math.max(52, 26 + gapCount[i] * QM_TRACK); y += gapH[i];
  });
  const height = y, boxes: Record<string, NodeBox> = {};
  for (const u of topo) { const r = rowOf[u]; boxes[u] = { id: u, row: r, x: centerX[u] - nodeW / 2, y: rowTop[r], w: nodeW, h: sized[u].h, lines: sized[u].lines, detailLines: sized[u].detailLines, kind: G.byId[u].kind ?? 'box' }; }

  // ---- lanes: every line that passes a row gets its own vertical lane in a free interval of that row
  const freeCache: Array<Array<[number, number]> | undefined> = [];
  const freeIntervals = (r: number): Array<[number, number]> => {
    const hit = freeCache[r]; if (hit) return hit;
    const xs = rows[r].map((u) => boxes[u]).sort((a, b) => a.x - b.x), out: Array<[number, number]> = [];
    let left = 2;
    for (const b of xs) { if (b.x - 6 - left >= 12) out.push([left, b.x - 6]); left = b.x + b.w + 6; }
    if (width - 2 - left >= 12) out.push([left, width - 2]);
    if (!out.length) out.push([2, width - 2]);
    freeCache[r] = out; return out;
  };
  const keyOf = (e: InEdge) => edgeKey(e.from, e.to);
  const laneIv: Record<string, number[]> = {}, members: Record<string, { key: string; sortKey: number }[]> = {};
  for (const e of edges) {
    const k = keyOf(e), a = rowOf[e.from], b = rowOf[e.to], tx = centerX[e.to]; let cx = centerX[e.from]; laneIv[k] = [];
    for (let g = a + 1; g < b; g++) {
      const ints = freeIntervals(g); let bi = 0, bc = Infinity;
      ints.forEach((iv, i) => { const near = Math.min(Math.max(tx, iv[0]), iv[1]), c = Math.abs(near - tx) + 0.5 * Math.abs(near - cx); if (c < bc - 1e-9) { bc = c; bi = i; } });
      laneIv[k].push(bi); (members[`${g}:${bi}`] ??= []).push({ key: k, sortKey: tx + 0.001 * centerX[e.from] }); cx = (ints[bi][0] + ints[bi][1]) / 2;
    }
  }
  let overfull = 0; const laneX: Record<string, number[]> = {};
  for (const e of edges) laneX[keyOf(e)] = [];
  for (const [id, list] of Object.entries(members)) {
    const [g, bi] = id.split(':').map(Number), iv = freeIntervals(g)[bi], n = list.length, span = iv[1] - iv[0];
    const cap = Math.max(1, Math.floor((span - 8) / MIN_LANE_SP) + 1); if (n > cap) overfull += n - cap;
    const sp = n > 1 ? Math.max(1.5, Math.min(LANE_SP, (span - 8) / (n - 1))) : 0;
    list.sort((p1, p2) => p1.sortKey - p2.sortKey || p1.key.localeCompare(p2.key));
    list.forEach((m, i) => { laneX[m.key][g] = Math.min(iv[1] - 3, Math.max(iv[0] + 3, iv[0] + span / 2 + (i - (n - 1) / 2) * sp)); });
  }
  // ---- ports follow the lanes (the first / last x a line has to reach)
  const outPort: Record<string, number> = {}, inPort: Record<string, number> = {};
  const firstX = (e: InEdge) => (rowOf[e.to] - rowOf[e.from] > 1 ? laneX[keyOf(e)][rowOf[e.from] + 1] : centerX[e.to]);
  const lastX = (e: InEdge) => (rowOf[e.to] - rowOf[e.from] > 1 ? laneX[keyOf(e)][rowOf[e.to] - 1] : centerX[e.from]);
  for (const u of topo) {
    const outs = edges.filter((e) => e.from === u).sort((p1, q1) => firstX(p1) - firstX(q1) || centerX[p1.to] - centerX[q1.to] || keyOf(p1).localeCompare(keyOf(q1)));
    outs.forEach((e, i) => { outPort[keyOf(e)] = boxes[u].x + (boxes[u].w * (i + 1)) / (outs.length + 1); });
    const ins = edges.filter((e) => e.to === u).sort((p1, q1) => lastX(p1) - lastX(q1) || centerX[p1.from] - centerX[q1.from] || keyOf(p1).localeCompare(keyOf(q1)));
    ins.forEach((e, i) => { inPort[keyOf(e)] = boxes[u].x + (boxes[u].w * (i + 1)) / (ins.length + 1); });
  }
  // ---- tracks: per gap, order the horizontal runs to cross as little as possible
  const gapLines: Array<{ key: string; xt: number; xb: number }[]> = rows.map(() => []);
  for (const e of edges) {
    const k = keyOf(e), a = rowOf[e.from], b = rowOf[e.to];
    for (let g = a; g < b; g++) gapLines[g].push({ key: k, xt: g === a ? outPort[k] : laneX[k][g], xb: g === b - 1 ? inPort[k] : laneX[k][g + 1] });
  }
  const trackIdx: Array<Record<string, number>> = [];
  let crossings = 0, wire = 0, stacked = 0;
  gapLines.forEach((items, g) => {
    const res = items.length ? orderTracks(items) : { pos: [], crossings: 0, overlaps: 0 }; crossings += res.crossings; stacked += res.overlaps;
    trackIdx[g] = {}; items.forEach((it, i) => { trackIdx[g][it.key] = res.pos[i]; wire += Math.abs(it.xb - it.xt); });
  });
  const trackY = (g: number, key: string) => gapTop[g] + 13 + QM_TRACK / 2 + trackIdx[g][key] * QM_TRACK;

  const geoms: EdgeGeom[] = [];
  for (const e of edges) {
    const key = keyOf(e), sBox = boxes[e.from], tBox = boxes[e.to], a = sBox.row, b = tBox.row;
    const pts: Pt[] = [{ x: outPort[key], y: sBox.y + sBox.h }];
    for (let g = a; g < b; g++) {
      const ty = trackY(g, key), it = gapLines[g].find((q) => q.key === key) as { xt: number; xb: number };
      pts.push({ x: it.xt, y: ty }); pts.push({ x: it.xb, y: ty });
    }
    pts.push({ x: inPort[key], y: tBox.y });
    const p1 = pts[1], p2 = pts[2], dot = { x: (p1.x + p2.x) / 2, y: p1.y };
    const clean: Pt[] = [];
    for (const q of pts) { const last = clean[clean.length - 1]; if (!last || Math.abs(last.x - q.x) > 0.01 || Math.abs(last.y - q.y) > 0.01) clean.push(q); }
    geoms.push({ key, from: e.from, to: e.to, points: clean, dot, gapTop: gapTop[a], gapBottom: gapTop[a] + gapH[a], hops: [] });
  }
  void margin;
  return { geom: { width, height, nodeW, boxes, order: topo, edges: geoms }, overfull, stacked, crossings, wire };
}

const score = (b: Built) => b.overfull * 1e6 + b.stacked * 1e4 + b.crossings * 1000 + b.wire / 100;

/** A node order per rank with few crossings: barycenter sweeps for a start, then pairwise swaps in each rank kept only when the routed drawing gets better. */
function searchOrder(G: Graph, cols: number, p: Params): string[][] {
  const key = `${G.sig}@${cols}`, hit = ORDERS.get(key); if (hit) return hit;
  const ranks: string[][] = Array.from({ length: G.maxRank + 1 }, () => []);
  for (const u of G.topo) ranks[G.rank[u]].push(u);
  const pos = (ord: string[][]) => { const m: Record<string, number> = {}; ord.forEach((r) => r.forEach((u, i) => (m[u] = (i + 0.5) / r.length))); return m; };
  const sweep = (ord: string[][], down: boolean): string[][] => {
    const next = ord.map((r) => r.slice()), m = pos(ord), idx = Object.fromEntries(ord.flatMap((r) => r.map((u, i) => [u, i])));
    const seq = down ? Array.from({ length: G.maxRank }, (_, i) => i + 1) : Array.from({ length: G.maxRank }, (_, i) => G.maxRank - 1 - i);
    for (const r of seq) {
      const nb = (u: string) => { const l = (down ? G.parents[u] : G.children[u]).map((v) => m[v]); return l.length ? l.reduce((s, x) => s + x, 0) / l.length : m[u]; };
      next[r].sort((a, b) => nb(a) - nb(b) || idx[a] - idx[b]);
      next[r].forEach((u, i) => (m[u] = (i + 0.5) / next[r].length));
    }
    return next;
  };
  let cur = ranks, best = ranks, bestS = score(build(G, p, ranks));
  for (let i = 0; i < 8; i++) { cur = sweep(cur, i % 2 === 0); const s = score(build(G, p, cur)); if (s < bestS - 1e-9) { bestS = s; best = cur; } }
  best = best.map((r) => r.slice());
  for (let pass = 0; pass < 4; pass++) {
    let improved = false;
    for (let r = 0; r <= G.maxRank; r++) for (let i = 0; i < best[r].length; i++) for (let j = i + 1; j < best[r].length; j++) {
      const t = best.map((x) => x.slice()); [t[r][i], t[r][j]] = [t[r][j], t[r][i]];
      const s = score(build(G, p, t)); if (s < bestS - 1e-9) { bestS = s; best = t; improved = true; }
    }
    if (!improved) break;
  }
  if (ORDERS.size > 80) ORDERS.clear();
  ORDERS.set(key, best); return best;
}

export function computeGeometry(nodes: InNode[], edges: InEdge[], containerWidth: number): Geometry {
  const narrow = containerWidth < 600, margin = narrow ? 16 : 36, lane = narrow ? 30 : 52;
  let nodeW = 184, cols = 2;
  if (narrow) nodeW = Math.max(116, Math.min(176, Math.floor((containerWidth - 2 * margin - lane) / 2)));
  else cols = Math.max(2, Math.min(5, Math.floor((containerWidth - 2 * margin + lane) / (nodeW + lane))));
  const width = 2 * margin + cols * nodeW + (cols - 1) * lane, G = graphOf(nodes, edges);
  // the order is searched once per map and column count on a reference drawing, then reused at every width
  const refW = narrow ? 176 : 184, ref: Params = { nodeW: refW, lane: narrow ? 30 : 52, margin: narrow ? 16 : 36, cols, width: 2 * (narrow ? 16 : 36) + cols * refW + (cols - 1) * (narrow ? 30 : 52) };
  const order = searchOrder(G, cols, ref);
  // keep the usual spacing; when a row's channels are too tight for their lines, give the channels room by narrowing the boxes
  const minW = narrow ? 116 : 150;
  let best: Built | null = null;
  for (let w = nodeW; w >= Math.min(nodeW, minW); w -= 6) {
    const chan = (width - cols * w) / (cols + 1), p: Params = w === nodeW ? { nodeW, lane, margin, cols, width } : { nodeW: w, lane: chan, margin: chan, cols, width };
    const b = build(G, p, order);
    if (!best || b.overfull + b.stacked < best.overfull + best.stacked) best = b;
    if (b.overfull === 0 && b.stacked === 0) break;
  }
  const geom = (best as Built).geom; addHops(geom); return geom;
}


export function placeLabels(geom: Geometry, edges: InEdge[], priority: string[]): Label[] {
  const labelOf: Record<string, string> = {};
  for (const e of edges) if (e.label) labelOf[edgeKey(e.from, e.to)] = e.label;
  const order = [
    ...priority.filter((k) => labelOf[k] !== undefined),
    ...geom.edges.map((g) => g.key).filter((k) => labelOf[k] !== undefined && !priority.includes(k)),
  ];
  const boxes = Object.values(geom.boxes);
  const placed: Label[] = [];
  const dotRects = geom.edges.map((g) => ({ key: g.key, x: g.dot.x - QM_DOT_R - 2, y: g.dot.y - QM_DOT_R - 2, w: 2 * QM_DOT_R + 4, h: 2 * QM_DOT_R + 4 }));
  for (const key of order) {
    const g = geom.edges.find((x) => x.key === key);
    if (!g) continue;
    const maxW = Math.min(200, geom.width - 8);
    let text = labelOf[key];
    const maxChars = Math.floor((maxW - 16) / QM_LABEL_CHAR);
    if (text.length > maxChars) text = `${text.slice(0, maxChars - 1)}…`;
    // Try the full label first, then progressively shorter ones, at growing offsets from the dot (so a label is never dropped).
    const variants = [text, ...[18, 12, 8].filter((n) => n < text.length).map((n) => `${text.slice(0, n - 1)}…`)];
    const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 8, -8, 10, -10, 12, -12, 14, -14];
    const dys = [0, -QM_TRACK / 2, QM_TRACK / 2, -QM_TRACK, QM_TRACK, -1.5 * QM_TRACK, 1.5 * QM_TRACK, -2 * QM_TRACK, 2 * QM_TRACK];
    let done = false;
    for (const txt of variants) {
      const w = Math.ceil(txt.length * QM_LABEL_CHAR + 16);
      for (const dy of dys) {
        for (const k of offsets) {
          const cx = g.dot.x + k * 18;
          const rect = { x: cx - w / 2, y: g.dot.y - QM_LABEL_H / 2 + dy, w, h: QM_LABEL_H };
          if (rect.x < 2 || rect.x + rect.w > geom.width - 2) continue;
          if (rect.y < g.gapTop + 2 || rect.y + rect.h > g.gapBottom - 2) continue;
          if (boxes.some((b) => overlaps(rect, b, 4))) continue;
          if (placed.some((p) => overlaps(rect, p, 3))) continue;
          if (dotRects.some((d) => d.key !== key && overlaps(rect, d, 0))) continue;
          placed.push({ key, text: txt, ...rect });
          done = true;
          break;
        }
        if (done) break;
      }
      if (done) break;
    }
  }
  return placed;
}

export function roundedPath(points: Pt[], r = QM_CORNER_R, hops: Hop[] = []): string {
  if (points.length < 2) return '';
  /** the arcs of segment i in travel order, drawn from the straight part of the line */
  const hopPart = (i: number): string => {
    const hs = hops.filter((h) => h.seg === i); if (!hs.length) return '';
    const right = points[i + 1].x > points[i].x;
    hs.sort((a, b) => (right ? a.x0 - b.x0 : b.x0 - a.x0));
    return hs.map((h) => { const rx = (h.x1 - h.x0) / 2; return ` L ${right ? h.x0 : h.x1} ${h.y} A ${rx} ${h.ry} 0 0 ${right ? 1 : 0} ${right ? h.x1 : h.x0} ${h.y}`; }).join('');
  };
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y), l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    // a hop close to a corner makes that corner a little tighter instead of being dropped
    let rr = Math.min(r, l1 / 2, l2 / 2);
    for (const h of hops) { if (h.seg === i - 1) rr = Math.min(rr, Math.max(1, Math.min(Math.abs(h.x0 - p1.x), Math.abs(h.x1 - p1.x)))); else if (h.seg === i) rr = Math.min(rr, Math.max(1, Math.min(Math.abs(h.x0 - p1.x), Math.abs(h.x1 - p1.x)))); }
    const ax = p1.x - ((p1.x - p0.x) / (l1 || 1)) * rr, ay = p1.y - ((p1.y - p0.y) / (l1 || 1)) * rr;
    const bx = p1.x + ((p2.x - p1.x) / (l2 || 1)) * rr, by = p1.y + ((p2.y - p1.y) / (l2 || 1)) * rr;
    d += `${hopPart(i - 1)} L ${ax} ${ay} Q ${p1.x} ${p1.y} ${bx} ${by}`;
  }
  const last = points[points.length - 1];
  return `${d}${hopPart(points.length - 2)} L ${last.x} ${last.y}`;
}

export function arrowHead(points: Pt[], size = 7): string {
  const b = points[points.length - 1];
  const a = points[points.length - 2] ?? { x: b.x, y: b.y - 1 };
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const l = ang + Math.PI - Math.PI / 6, rr = ang + Math.PI + Math.PI / 6;
  return `M ${b.x + size * Math.cos(l)} ${b.y + size * Math.sin(l)} L ${b.x} ${b.y} L ${b.x + size * Math.cos(rr)} ${b.y + size * Math.sin(rr)}`;
}

/** Path from `id` to the root following parent links (BFS), root first. */
export function pathToRoot(id: string, edges: { from: string; to: string }[], rootId = 'root'): string[] {
  if (id === rootId) return [rootId];
  const parents: Record<string, string[]> = {};
  for (const e of edges) (parents[e.to] ??= []).push(e.from);
  const reachedFrom: Record<string, string> = {};
  const queue = [id];
  const seen: Record<string, boolean> = { [id]: true };
  let found = false;
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur === rootId) { found = true; break; }
    for (const p of parents[cur] ?? []) { if (seen[p]) continue; seen[p] = true; reachedFrom[p] = cur; queue.push(p); }
  }
  if (!found) return [id];
  const path: string[] = [];
  let step: string | undefined = rootId;
  while (step) { path.push(step); step = reachedFrom[step]; }
  return path;
}

export function neighborIds(id: string, edges: { from: string; to: string }[]): string[] {
  const out: string[] = [];
  for (const e of edges) { if (e.from === id) out.push(e.to); else if (e.to === id) out.push(e.from); }
  return out;
}

export function pathEdgeKeys(path: string[], edges: { from: string; to: string }[]): Set<string> {
  const have = new Set(edges.map((e) => edgeKey(e.from, e.to)));
  const keys = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) {
    const fwd = edgeKey(path[i], path[i + 1]), back = edgeKey(path[i + 1], path[i]);
    if (have.has(fwd)) keys.add(fwd); else if (have.has(back)) keys.add(back);
  }
  return keys;
}

/** Layout-quality report used by unit and browser tests: counts of node/node, label/node and label/label overlaps. */
export function overlapReport(geom: Geometry, labels: Label[]): { nodeNode: number; labelNode: number; labelLabel: number } {
  const bx = Object.values(geom.boxes);
  let nodeNode = 0, labelNode = 0, labelLabel = 0;
  for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) if (overlaps(bx[i], bx[j])) nodeNode++;
  for (const l of labels) for (const b of bx) if (overlaps(l, b)) labelNode++;
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (overlaps(labels[i], labels[j])) labelLabel++;
  return { nodeNode, labelNode, labelLabel };
}

export interface MapHighlight {
  /** the tapped box (node pick only) */ selected: string | null;
  /** boxes on the chain back to the root (a node pick: the box's own; an edge pick: the SOURCE box's, never the target) */ path: Set<string>;
  /** direct neighbours of the tapped box (node pick only) */ neigh: Set<string>;
  /** keys of the lines drawn as active (the chain for a node pick; the source's chain plus the tapped line for an edge pick) */ edges: Set<string>;
  /** line key to place its label first (edge pick) or the chain's labels (node pick) */ priority: string[];
}
/**
 * What the map highlights for a selection.
 *  - node pick: the box, the chain of questions back to the root, its neighbours (unchanged behaviour).
 *  - edge pick: everything up to the arrow: the source box and its chain back to the root (same `path` a tap on the source box gives,
 *    no "selected" box, no neighbours), the lines of that chain, and the tapped line. The target box and anything downstream stay dimmed.
 *  - no pick: nothing is highlighted and nothing is dimmed (the caller checks `pick !== null` for dimming).
 */
export function mapHighlight(pick: { kind: 'node' | 'edge'; id: string } | null, edges: { from: string; to: string }[]): MapHighlight {
  const out: MapHighlight = { selected: null, path: new Set(), neigh: new Set(), edges: new Set(), priority: [] };
  if (!pick) return out;
  if (pick.kind === 'edge') {
    const e = edges.find((x) => edgeKey(x.from, x.to) === pick.id);
    if (!e) return out;
    // everything up to the arrow: the source box and its chain back to the root, lit exactly as a tap on the source box lights it, plus the tapped line.
    // The target box is NOT lit (it stays dimmed) and nothing downstream is.
    const path = pathToRoot(e.from, edges).filter((id) => id !== e.to);
    out.path = new Set(path);
    out.edges = new Set([...pathEdgeKeys(path, edges), pick.id]);
    out.priority = [pick.id, ...pathEdgeKeys(path, edges)];
    return out;
  }
  out.selected = pick.id;
  const path = pathToRoot(pick.id, edges);
  out.path = new Set(path);
  out.neigh = new Set(neighborIds(pick.id, edges).filter((n) => !out.path.has(n)));
  out.edges = pathEdgeKeys(path, edges);
  out.priority = [...out.edges];
  return out;
}

/* ───────────────────────────── crossings and hop-overs ───────────────────────────── */

/** One place where two lines cross: the line with the horizontal piece (`over`, the one that hops) and the line with the vertical piece (`under`). */
export interface Crossing { over: string; under: string; x: number; y: number; seg: number }
const EPS = 0.5;
interface Seg { key: string; i: number; h: boolean; a: number; b: number; c: number }
/** Axis-aligned pieces of every line: horizontal pieces have `c` = y and span a..b (a < b); vertical ones have `c` = x. */
function segmentsOf(edges: { key: string; points: Pt[] }[]): Seg[] {
  const out: Seg[] = [];
  for (const g of edges) for (let i = 0; i < g.points.length - 1; i++) {
    const p = g.points[i], q = g.points[i + 1];
    if (Math.abs(p.y - q.y) < 0.01 && Math.abs(p.x - q.x) >= 0.01) out.push({ key: g.key, i, h: true, a: Math.min(p.x, q.x), b: Math.max(p.x, q.x), c: p.y });
    else if (Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) >= 0.01) out.push({ key: g.key, i, h: false, a: Math.min(p.y, q.y), b: Math.max(p.y, q.y), c: p.x });
  }
  return out;
}
/** Every crossing between two different lines. Orthogonal lines only ever cross horizontal-over-vertical, so the horizontal one is the one that hops. Touching at an end does not count. */
export function edgeCrossings(geom: { edges: { key: string; points: Pt[] }[] }): Crossing[] {
  const segs = segmentsOf(geom.edges), hs = segs.filter((s) => s.h), vs = segs.filter((s) => !s.h), out: Crossing[] = [];
  for (const h of hs) for (const v of vs) {
    if (h.key === v.key) continue;
    if (v.c > h.a + EPS && v.c < h.b - EPS && h.c > v.a + EPS && h.c < v.b - EPS) out.push({ over: h.key, under: v.key, x: v.c, y: h.c, seg: h.i });
  }
  return out.sort((p, q) => p.over.localeCompare(q.over) || p.seg - q.seg || p.x - q.x);
}
/** Places where two different lines run on top of each other (same row or column, overlapping): they read as one line. */
export function edgeOverlaps(geom: { edges: { key: string; points: Pt[] }[] }): number {
  const segs = segmentsOf(geom.edges); let n = 0;
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const p = segs[i], q = segs[j];
    if (p.key === q.key || p.h !== q.h || Math.abs(p.c - q.c) > 1.5) continue;
    if (Math.min(p.b, q.b) - Math.max(p.a, q.a) > 2) n++;
  }
  return n;
}

/**
 * Hop-overs. Wherever two lines cross, the line with the HORIZONTAL piece jumps over the one with the vertical piece (orthogonal lines only ever cross that way, so the rule never depends on drawing order).
 * Crossings closer than one arc width merge into one wider arc. A hop that would not fit on the straight part of its piece (the rounded corners and the dot are kept clear) is left as a plain crossing and counted by `unhoppedCrossings`.
 */
export function computeHops(edges: { key: string; points: Pt[] }[], R = QM_HOP_R): { hops: Record<string, Hop[]>; unhopped: Crossing[] } {
  const hops: Record<string, Hop[]> = {}, unhopped: Crossing[] = [], byKey = new Map(edges.map((e) => [e.key, e]));
  const groups = new Map<string, Crossing[]>();
  for (const c of edgeCrossings({ edges })) { const k = `${c.over}|${c.seg}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(c); }
  for (const list of groups.values()) {
    const e = byKey.get(list[0].over)!, i = list[0].seg, a = e.points[i], b = e.points[i + 1], lo = Math.min(a.x, b.x) + QM_HOP_CORNER, hi = Math.max(a.x, b.x) - QM_HOP_CORNER;
    const clusters: Crossing[][] = [];
    for (const c of list.sort((p, q) => p.x - q.x)) { const cur = clusters[clusters.length - 1]; if (cur && c.x - cur[cur.length - 1].x < 2 * R + 2) cur.push(c); else clusters.push([c]); }
    for (const cl of clusters) {
      // full-size arc when it fits; near the end of a piece it shrinks (never below QM_HOP_MIN), and the corner next to it tightens
      const r = Math.min(R, cl[0].x - lo, hi - cl[cl.length - 1].x);
      if (r < QM_HOP_MIN) { unhopped.push(...cl); continue; }
      (hops[e.key] ??= []).push({ seg: i, x0: cl[0].x - r, x1: cl[cl.length - 1].x + r, y: a.y, ry: r, n: cl.length });
    }
  }
  return { hops, unhopped };
}
function addHops(geom: Geometry): void {
  const { hops } = computeHops(geom.edges);
  for (const e of geom.edges) {
    e.hops = hops[e.key] ?? [];
    if (!e.hops.length) continue;
    // keep the dot (and so its label) clear of the arcs: slide it along its horizontal run to the nearest free spot
    const i = e.points.findIndex((p, k) => k < e.points.length - 1 && Math.abs(p.y - e.dot.y) < 0.01 && Math.abs(e.points[k + 1].y - e.dot.y) < 0.01 && e.dot.x >= Math.min(p.x, e.points[k + 1].x) - 0.01 && e.dot.x <= Math.max(p.x, e.points[k + 1].x) + 0.01);
    if (i < 0) continue;
    const a = Math.min(e.points[i].x, e.points[i + 1].x) + QM_DOT_R + 4, b = Math.max(e.points[i].x, e.points[i + 1].x) - QM_DOT_R - 4, pad = QM_DOT_R + 2;
    const busy = e.hops.filter((h) => h.seg === i).sort((p, q) => p.x0 - q.x0);
    if (!busy.some((h) => e.dot.x + pad > h.x0 && e.dot.x - pad < h.x1)) continue;
    const spots = [a, b, ...busy.flatMap((h) => [h.x0 - pad, h.x1 + pad])].filter((x) => x >= a && x <= b && !busy.some((h) => x + pad > h.x0 + 0.01 && x - pad < h.x1 - 0.01));
    if (spots.length) e.dot = { x: spots.reduce((m, x) => (Math.abs(x - e.dot.x) < Math.abs(m - e.dot.x) ? x : m)), y: e.dot.y };
  }
}
/** Crossings that stayed plain (no room for an arc). */
export const unhoppedCrossings = (geom: Geometry): number => computeHops(geom.edges).unhopped.length;

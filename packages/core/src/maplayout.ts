/** Pure geometry for the question map: auto-layout in staggered rows, orthogonal edges, collision-avoided labels. No DOM. */
export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface InNode { id: string; label: string; detail?: string; kind?: string }
export interface InEdge { from: string; to: string; label?: string }
export interface NodeBox extends Rect { id: string; row: number; lines: string[]; detailLines: string[]; kind: string }
export interface EdgeGeom { key: string; from: string; to: string; points: Pt[]; dot: Pt; gapTop: number; gapBottom: number }
export interface Label extends Rect { key: string; text: string }
export interface Geometry { width: number; height: number; nodeW: number; boxes: Record<string, NodeBox>; order: string[]; edges: EdgeGeom[] }

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

export function computeGeometry(nodes: InNode[], edges: InEdge[], containerWidth: number): Geometry {
  const narrow = containerWidth < 600;
  const margin = narrow ? 16 : 36;
  const lane = narrow ? 30 : 52;
  let nodeW = 184;
  let cols = 2;
  if (narrow) {
    nodeW = Math.max(116, Math.min(176, Math.floor((containerWidth - 2 * margin - lane) / 2)));
    cols = 2;
  } else {
    cols = Math.max(2, Math.min(5, Math.floor((containerWidth - 2 * margin + lane) / (nodeW + lane))));
  }
  const width = 2 * margin + cols * nodeW + (cols - 1) * lane;

  const children: Record<string, string[]> = {};
  const parents: Record<string, string[]> = {};
  for (const n of nodes) { children[n.id] = []; parents[n.id] = []; }
  for (const e of edges) { children[e.from].push(e.to); parents[e.to].push(e.from); }
  const indeg: Record<string, number> = {};
  for (const n of nodes) indeg[n.id] = parents[n.id].length;
  const topo: string[] = [];
  const queue = nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
  while (queue.length) {
    const u = queue.shift() as string;
    topo.push(u);
    for (const v of children[u]) { indeg[v] -= 1; if (indeg[v] === 0) queue.push(v); }
  }
  if (topo.length !== nodes.length) throw new Error('question map has a cycle');
  const rank: Record<string, number> = {};
  for (const u of topo) rank[u] = parents[u].length ? Math.max(...parents[u].map((p) => rank[p] + 1)) : 0;
  const maxRank = Math.max(...topo.map((u) => rank[u]));

  const byId: Record<string, InNode> = {};
  for (const n of nodes) byId[n.id] = n;
  const sized: Record<string, { lines: string[]; detailLines: string[]; h: number }> = {};
  for (const n of nodes) {
    const kind = n.kind ?? 'box';
    const inner = nodeW - (kind === 'decision' ? 44 : 26);
    const lines = wrapText(n.label, Math.max(8, Math.floor(inner / QM_TITLE_CHAR)), 3);
    const detailLines = n.detail ? wrapText(n.detail, Math.max(8, Math.floor(inner / QM_DETAIL_CHAR)), 2) : [];
    const hh = Math.max(kind === 'decision' ? 60 : 50, 20 + lines.length * 15 + detailLines.length * 14);
    sized[n.id] = { lines, detailLines, h: hh };
  }

  const rows: string[][] = [];
  const centerX: Record<string, number> = {};
  for (let r = 0; r <= maxRank; r++) {
    const ids = topo.filter((u) => rank[u] === r);
    const bary = (u: string) => {
      const ps = parents[u].filter((p) => centerX[p] !== undefined);
      return ps.length ? ps.reduce((sum, p) => sum + centerX[p], 0) / ps.length : width / 2;
    };
    ids.sort((a, b) => bary(a) - bary(b) || topo.indexOf(a) - topo.indexOf(b));
    for (let i = 0; i < ids.length; i += cols) {
      const chunk = ids.slice(i, i + cols);
      const rowW = chunk.length * nodeW + (chunk.length - 1) * lane;
      const startX = (width - rowW) / 2;
      chunk.forEach((u, j) => { centerX[u] = startX + j * (nodeW + lane) + nodeW / 2; });
      rows.push(chunk);
    }
  }
  const rowOf: Record<string, number> = {};
  rows.forEach((row, i) => row.forEach((u) => (rowOf[u] = i)));

  const gapEdges: string[][] = rows.map(() => []);
  const sortedEdges = [...edges].sort((p, q) => centerX[p.from] - centerX[q.from] || centerX[p.to] - centerX[q.to]);
  for (const e of sortedEdges) {
    const a = rowOf[e.from], b = rowOf[e.to];
    if (b <= a) throw new Error(`edge ${e.from}->${e.to} does not go down`);
    for (let g = a; g < b; g++) gapEdges[g].push(edgeKey(e.from, e.to));
  }

  const rowTop: number[] = [], rowH: number[] = [], gapTop: number[] = [], gapH: number[] = [];
  let y = 16;
  rows.forEach((row, i) => {
    rowTop[i] = y;
    rowH[i] = Math.max(...row.map((u) => sized[u].h));
    y += rowH[i];
    gapTop[i] = y;
    gapH[i] = i === rows.length - 1 ? 16 : Math.max(52, 26 + gapEdges[i].length * QM_TRACK);
    y += gapH[i];
  });
  const height = y;

  const boxes: Record<string, NodeBox> = {};
  for (const u of topo) {
    const r = rowOf[u];
    boxes[u] = { id: u, row: r, x: centerX[u] - nodeW / 2, y: rowTop[r], w: nodeW, h: sized[u].h, lines: sized[u].lines, detailLines: sized[u].detailLines, kind: byId[u].kind ?? 'box' };
  }

  const trackY = (g: number, key: string) => gapTop[g] + 13 + QM_TRACK / 2 + gapEdges[g].indexOf(key) * QM_TRACK;

  const outPort: Record<string, number> = {};
  const inPort: Record<string, number> = {};
  for (const u of topo) {
    const outs = edges.filter((e) => e.from === u).sort((p, q) => centerX[p.to] - centerX[q.to]);
    outs.forEach((e, i) => { outPort[edgeKey(e.from, e.to)] = boxes[u].x + (boxes[u].w * (i + 1)) / (outs.length + 1); });
    const ins = edges.filter((e) => e.to === u).sort((p, q) => centerX[p.from] - centerX[q.from]);
    ins.forEach((e, i) => { inPort[edgeKey(e.from, e.to)] = boxes[u].x + (boxes[u].w * (i + 1)) / (ins.length + 1); });
  }

  const channelUse: Record<string, number> = {};
  const freeIntervals = (r: number): Array<[number, number]> => {
    const xs = rows[r].map((u) => boxes[u]).sort((p, q) => p.x - q.x);
    const out: Array<[number, number]> = [];
    let left = 2;
    for (const b of xs) {
      if (b.x - 6 - left >= 12) out.push([left, b.x - 6]);
      left = b.x + b.w + 6;
    }
    if (width - 2 - left >= 12) out.push([left, width - 2]);
    return out;
  };

  const geoms: EdgeGeom[] = [];
  for (const e of edges) {
    const key = edgeKey(e.from, e.to);
    const sBox = boxes[e.from], tBox = boxes[e.to];
    const a = sBox.row, b = tBox.row;
    const tx = inPort[key];
    let cx = outPort[key];
    const pts: Pt[] = [{ x: cx, y: sBox.y + sBox.h }];
    for (let g = a; g < b; g++) {
      const ty = trackY(g, key);
      pts.push({ x: cx, y: ty });
      if (g === b - 1) {
        pts.push({ x: tx, y: ty });
        pts.push({ x: tx, y: tBox.y });
      } else {
        const ints = freeIntervals(g + 1);
        let best = ints[0];
        let bestCost = Infinity;
        for (const iv of ints) {
          const near = Math.min(Math.max(tx, iv[0]), iv[1]);
          const cost = Math.abs(near - tx) + 0.5 * Math.abs(near - cx);
          if (cost < bestCost) { bestCost = cost; best = iv; }
        }
        const ck = `${g + 1}:${best[0]}`;
        const used = channelUse[ck] ?? 0;
        channelUse[ck] = used + 1;
        const slots = Math.max(1, Math.floor((best[1] - best[0] - 8) / 8));
        const span = best[1] - best[0];
        const nx = best[0] + span / 2 + (((used % slots) - (slots - 1) / 2) * Math.min(8, (span - 8) / slots));
        pts.push({ x: nx, y: ty });
        cx = nx;
      }
    }
    const p1 = pts[1], p2 = pts[2];
    const dot = { x: (p1.x + p2.x) / 2, y: p1.y };
    const clean: Pt[] = [];
    for (const p of pts) {
      const last = clean[clean.length - 1];
      if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) clean.push(p);
    }
    geoms.push({ key, from: e.from, to: e.to, points: clean, dot, gapTop: gapTop[a], gapBottom: gapTop[a] + gapH[a] });
  }
  return { width, height, nodeW, boxes, order: topo, edges: geoms };
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

export function roundedPath(points: Pt[], r = 7): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y), l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = p1.x - ((p1.x - p0.x) / (l1 || 1)) * rr, ay = p1.y - ((p1.y - p0.y) / (l1 || 1)) * rr;
    const bx = p1.x + ((p2.x - p1.x) / (l2 || 1)) * rr, by = p1.y + ((p2.y - p1.y) / (l2 || 1)) * rr;
    d += ` L ${ax} ${ay} Q ${p1.x} ${p1.y} ${bx} ${by}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last.x} ${last.y}`;
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

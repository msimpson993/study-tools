import { describe, it, expect, vi } from 'vitest';
import { drawLabDiagram, labDiagramFitsHorizontal, labDiagramHeight, type LabGeom, type LabelWords } from '../src/figs/diagrams';

vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#888' }));
vi.stubGlobal('document', { documentElement: {} });

function fontSize(font: string) {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  return m ? Number(m[1]) : 11;
}

function record(w = 720, h = 360) {
  const texts: string[] = [];
  const canvas = { width: w, height: h };
  const state: any = { font: '11px system-ui', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, textAlign: 'left', textBaseline: 'alphabetic' };
  const g: any = new Proxy(state, {
    get(o, k: string) {
      if (k === 'canvas') return canvas;
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      // ~0.65 em is closer to system-ui than 6 px/char, so the shared placer
      // sees the same T_d vs plant-sign collision that happens on a real canvas.
      if (k === 'measureText') return (s: string) => ({ width: String(s).length * fontSize(o.font) * 0.65 });
      if (k === 'fillText' || k === 'strokeText') return (s: string) => { if (k === 'fillText') texts.push(String(s)); };
      if (k === 'save' || k === 'restore') return () => {};
      if (k in o) return o[k];
      return () => ({ addColorStop() {} });
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return { g: g as CanvasRenderingContext2D, texts, canvas, w, h };
}

type DrawnLabel = { s: string; x0: number; x1: number; y0: number; y1: number; skipped?: boolean; size?: number };

function beginTextLog() {
  const log: DrawnLabel[] = [];
  (globalThis as unknown as { __textLog?: DrawnLabel[] }).__textLog = log;
  return log;
}

function finalLabels(log: DrawnLabel[]) {
  return log.filter((e) => !e.skipped && e.s !== '+' && e.s !== '−' && e.s !== '-');
}

const SYSTEMS = ['motor-open', 'motor-closed', 'borer', 'disk', 'engine'] as const;
const WORDS: (LabelWords | undefined)[] = [undefined, 'plain words', 'symbols', 'values'];

const CAP = 3;

function closest(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const L2 = dx * dx + dy * dy;
  if (L2 < 1e-9) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L2));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

function trim(seg: LabGeom['segs'][number], at: (x: number, y: number) => boolean) {
  let { x1, y1, x2, y2 } = seg;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return null;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  if (at(x1, y1)) { x1 += ux * CAP; y1 += uy * CAP; }
  if (at(x2, y2)) { x2 -= ux * CAP; y2 -= uy * CAP; }
  if ((x2 - x1) * ux + (y2 - y1) * uy <= 0.5) return null;
  return { x1, y1, x2, y2 };
}

function hitsRect(seg: LabGeom['segs'][number], b: LabGeom['boxes'][number]): boolean {
  const t = trim(seg, (x, y) => x >= b.x - CAP && x <= b.x + b.w + CAP && y >= b.y - CAP && y <= b.y + b.h + CAP);
  if (!t) return false;
  const inside = (x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  if (inside(t.x1, t.y1) || inside(t.x2, t.y2)) return true;
  const edges: [number, number, number, number][] = [
    [b.x, b.y, b.x + b.w, b.y],
    [b.x + b.w, b.y, b.x + b.w, b.y + b.h],
    [b.x + b.w, b.y + b.h, b.x, b.y + b.h],
    [b.x, b.y + b.h, b.x, b.y],
  ];
  const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) => {
    const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(den) < 1e-9) return false;
    const s = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
    const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
    return s >= 0 && s <= 1 && u >= 0 && u <= 1;
  };
  return edges.some(([ax, ay, bx, by]) => cross(t.x1, t.y1, t.x2, t.y2, ax, ay, bx, by));
}

function hitsSum(seg: LabGeom['segs'][number], s: LabGeom['sums'][number]): boolean {
  const t = trim(seg, (x, y) => Math.hypot(x - s.x, y - s.y) <= s.r + CAP);
  if (!t) return false;
  const c = closest(s.x, s.y, t.x1, t.y1, t.x2, t.y2);
  return Math.hypot(c.x - s.x, c.y - s.y) + 0.25 < s.r;
}

function crossings(geom: LabGeom): string[] {
  const out: string[] = [];
  for (const seg of geom.segs) {
    const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    if (len < 1) continue;
    for (const b of geom.boxes) {
      if (hitsRect(seg, b)) {
        out.push(`seg (${seg.x1.toFixed(1)},${seg.y1.toFixed(1)})→(${seg.x2.toFixed(1)},${seg.y2.toFixed(1)}) crosses box ${b.id} @ (${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.w.toFixed(1)}×${b.h.toFixed(1)})`);
      }
    }
    for (const s of geom.sums) {
      if (hitsSum(seg, s)) {
        out.push(`seg (${seg.x1.toFixed(1)},${seg.y1.toFixed(1)})→(${seg.x2.toFixed(1)},${seg.y2.toFixed(1)}) crosses ${s.id} @ (${s.x.toFixed(1)},${s.y.toFixed(1)} r=${s.r.toFixed(1)})`);
      }
    }
  }
  return out;
}

describe('lab diagrams: connectors do not cross foreign summers or blocks', () => {
  const cases: { sys: typeof SYSTEMS[number]; words?: LabelWords; layout?: 'stack' | 'row'; w: number; h: number }[] = [];
  for (const sys of SYSTEMS) {
    for (const words of WORDS) {
      if (sys === 'engine' && words === undefined) {
        cases.push({ sys, words, layout: 'row', w: 800, h: 300 });
        continue;
      }
      cases.push({ sys, words, layout: 'stack', w: 280, h: 640 });
      cases.push({ sys, words, layout: 'row', w: 900, h: 360 });
    }
  }
  for (const sys of ['motor-open', 'motor-closed', 'borer', 'disk'] as const) {
    for (const w of [378, 544]) {
      cases.push({ sys, words: undefined, w, h: labDiagramHeight(sys, w) });
    }
  }

  it.each(cases)('$sys words=$words $layout @ $w', ({ sys, words, layout, w, h }) => {
    const rec = record(w, h);
    const geom = drawLabDiagram(rec.g, w, h, { sys, words, layout });
    if (layout) expect(geom.stacked).toBe(layout === 'stack');
    expect(geom.boxes.length).toBeGreaterThan(0);
    expect(geom.sums.length).toBeGreaterThan(0);
    expect(geom.segs.length).toBeGreaterThan(0);
    expect(crossings(geom), crossings(geom).join('\n')).toEqual([]);
  });
});

describe('lab diagrams: stack only when a 9 px one-row layout cannot fit', () => {
  it('prefers a one-row Block-this-line layout at 544 px (1280 two-col) for motor/borer/disk symbols', () => {
    for (const sys of ['motor-open', 'motor-closed', 'borer', 'disk'] as const) {
      expect(labDiagramFitsHorizontal(sys, 544), sys).toBe(true);
      expect(labDiagramHeight(sys, 544)).toBe(300);
    }
  });

  it('uses the honest 9 px fit at a 378 px (923 two-col) canvas', () => {
    const fits: Record<string, boolean> = {};
    for (const sys of ['motor-open', 'motor-closed', 'borer', 'disk'] as const) {
      fits[sys] = labDiagramFitsHorizontal(sys, 378);
    }
    // motor-closed has three summers + three boxes; disk has a long G₁ token.
    // The decision must be consistent with the height helper.
    for (const [sys, ok] of Object.entries(fits)) {
      expect(labDiagramHeight(sys, 378)).toBe(ok ? 300 : sys === 'motor-closed' ? 580 : 520);
    }
  });

  it('still stacks a phone-wide setup diagram with plain-word labels', () => {
    expect(labDiagramFitsHorizontal('motor-open', 255, 'plain words')).toBe(false);
    expect(labDiagramFitsHorizontal('disk', 255, 'plain words')).toBe(false);
    expect(labDiagramFitsHorizontal('engine', 255, 'plain words')).toBe(false);
  });
});

describe('stacked T_d has its own labelled arrow, not a merged T_d_ sign', () => {
  it('draws T_d and a minus (or plus, on the borer) as separate marks on motor, borer and disk', () => {
    for (const sys of ['motor-open', 'motor-closed', 'borer', 'disk'] as const) {
      const rec = record(280, 640);
      drawLabDiagram(rec.g, 280, 640, { sys, words: 'symbols', layout: 'stack' });
      expect(rec.texts.includes('T_d'), sys).toBe(true);
      const signs = rec.texts.filter((t) => t === '−' || t === '+');
      expect(signs.length, `${sys} signs ${rec.texts.join(',')}`).toBeGreaterThanOrEqual(2);
    }
  });
});

const NEAR = 3.5;
const TIP_GAP = 8;
const SIGN_GAP = 8;
const MARK_NEAR = 24;
const TERM_NEAR = 24;

function near(ax: number, ay: number, bx: number, by: number, d = NEAR) {
  return Math.hypot(ax - bx, ay - by) <= d;
}

function atBox(geom: LabGeom, x: number, y: number) {
  return geom.boxes.some((b) => {
    const l = b.x, r = b.x + b.w, t = b.y, bot = b.y + b.h;
    const onV = x >= l - NEAR && x <= r + NEAR && ((y >= t - NEAR && y <= t + NEAR) || (y >= bot - NEAR && y <= bot + NEAR));
    const onH = y >= t - NEAR && y <= bot + NEAR && ((x >= l - NEAR && x <= l + NEAR) || (x >= r - NEAR && x <= r + NEAR));
    const inside = x >= l - 1 && x <= r + 1 && y >= t - 1 && y <= bot + 1;
    return onV || onH || inside;
  });
}

function atSum(geom: LabGeom, x: number, y: number) {
  return geom.sums.some((s) => Math.abs(Math.hypot(x - s.x, y - s.y) - s.r) <= NEAR + 2 || Math.hypot(x - s.x, y - s.y) <= s.r + NEAR);
}

function atTerm(geom: LabGeom, x: number, y: number) {
  return geom.terms.some((t) => Math.hypot(x - t.x, y - t.y) <= TERM_NEAR);
}

function atHop(geom: LabGeom, x: number, y: number) {
  return (geom.hops ?? []).some((h) => Math.hypot(x - h.x, y - h.y) <= 8);
}

function key(x: number, y: number) {
  return `${Math.round(x * 2) / 2},${Math.round(y * 2) / 2}`;
}

function degreeMap(geom: LabGeom) {
  const d = new Map<string, { x: number; y: number; n: number; segs: LabGeom['segs'] }>();
  const bump = (x: number, y: number, seg: LabGeom['segs'][number]) => {
    const k = key(x, y);
    const cur = d.get(k) ?? { x, y, n: 0, segs: [] };
    cur.n += 1;
    cur.segs.push(seg);
    d.set(k, cur);
  };
  for (const seg of geom.segs) {
    bump(seg.x1, seg.y1, seg);
    bump(seg.x2, seg.y2, seg);
  }
  return d;
}

function onSegInterior(geom: LabGeom, x: number, y: number) {
  return geom.segs.some((s) => {
    if (near(s.x1, s.y1, x, y) || near(s.x2, s.y2, x, y)) return false;
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy;
    if (L2 < 1) return false;
    const t = ((x - s.x1) * dx + (y - s.y1) * dy) / L2;
    if (t <= 0.02 || t >= 0.98) return false;
    return Math.hypot(x - (s.x1 + t * dx), y - (s.y1 + t * dy)) <= NEAR;
  });
}

function anchored(geom: LabGeom, x: number, y: number) {
  return atBox(geom, x, y) || atSum(geom, x, y) || atTerm(geom, x, y) || atHop(geom, x, y) || onSegInterior(geom, x, y);
}

function collinearOpposite(a: LabGeom['segs'][number], b: LabGeom['segs'][number], px: number, py: number) {
  const aOther = near(a.x1, a.y1, px, py) ? { x: a.x2, y: a.y2 } : { x: a.x1, y: a.y1 };
  const bOther = near(b.x1, b.y1, px, py) ? { x: b.x2, y: b.y2 } : { x: b.x1, y: b.y1 };
  const ax = aOther.x - px, ay = aOther.y - py;
  const bx = bOther.x - px, by = bOther.y - py;
  const aL = Math.hypot(ax, ay), bL = Math.hypot(bx, by);
  if (aL < 1 || bL < 1) return false;
  const dot = (ax / aL) * (bx / bL) + (ay / aL) * (by / bL);
  const cross = Math.abs(ax * by - ay * bx) / (aL * bL);
  return dot < -0.97 && cross < 0.08;
}

const SHAFT_MIN = 20;

function segLen(s: LabGeom['segs'][number]) {
  return Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
}

function pointOnSeg(px: number, py: number, s: LabGeom['segs'][number], pad = 0) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy;
  if (L2 < 1e-9) return Math.hypot(px - s.x1, py - s.y1) <= NEAR + pad;
  const t = ((px - s.x1) * dx + (py - s.y1) * dy) / L2;
  if (t < 0 || t > 1) return false;
  return Math.hypot(px - (s.x1 + t * dx), py - (s.y1 + t * dy)) <= NEAR + pad;
}

function collinear(a: LabGeom['segs'][number], b: LabGeom['segs'][number]) {
  const adx = a.x2 - a.x1, ady = a.y2 - a.y1, aL = Math.hypot(adx, ady);
  const bdx = b.x2 - b.x1, bdy = b.y2 - b.y1, bL = Math.hypot(bdx, bdy);
  if (aL < 1 || bL < 1) return false;
  const crossDir = Math.abs(adx * bdy - ady * bdx) / (aL * bL);
  if (crossDir > 0.08) return false;
  const off = Math.abs((b.x1 - a.x1) * ady - (b.y1 - a.y1) * adx) / aL;
  return off <= NEAR;
}

function overlapRange(a1: number, a2: number, b1: number, b2: number) {
  const lo = Math.max(Math.min(a1, a2), Math.min(b1, b2));
  const hi = Math.min(Math.max(a1, a2), Math.max(b1, b2));
  return hi - lo;
}

function collinearOverlapLen(a: LabGeom['segs'][number], b: LabGeom['segs'][number]) {
  if (!collinear(a, b)) return 0;
  const adx = a.x2 - a.x1, ady = a.y2 - a.y1;
  if (Math.abs(adx) >= Math.abs(ady)) return overlapRange(a.x1, a.x2, b.x1, b.x2);
  return overlapRange(a.y1, a.y2, b.y1, b.y2);
}

function properIntersect(a: LabGeom['segs'][number], b: LabGeom['segs'][number]): { x: number; y: number; kind: 'cross' | 'tee' } | null {
  const ax = a.x2 - a.x1, ay = a.y2 - a.y1;
  const bx = b.x2 - b.x1, by = b.y2 - b.y1;
  const den = ax * by - ay * bx;
  const aL = Math.hypot(ax, ay), bL = Math.hypot(bx, by);
  if (aL < 1 || bL < 1) return null;
  if (Math.abs(den) < 1e-9) return null;
  const sx = b.x1 - a.x1, sy = b.y1 - a.y1;
  const t = (sx * by - sy * bx) / den;
  const u = (sx * ay - sy * ax) / den;
  const ep = 0.04;
  if (t < -0.02 || t > 1.02 || u < -0.02 || u > 1.02) return null;
  const x = a.x1 + t * ax, y = a.y1 + t * ay;
  const tEnd = t < ep || t > 1 - ep;
  const uEnd = u < ep || u > 1 - ep;
  if (tEnd && uEnd) return null; // shared endpoint / junction corner
  if (tEnd || uEnd) return { x, y, kind: 'tee' };
  return { x, y, kind: 'cross' };
}

function shaftOutside(geom: LabGeom, seg: LabGeom['segs'][number]) {
  // Length of the arrow that sits outside the target box or summer.
  const tipX = seg.x2, tipY = seg.y2;
  let cut = 0;
  for (const s of geom.sums) {
    const d0 = Math.hypot(seg.x1 - s.x, seg.y1 - s.y);
    const d1 = Math.hypot(tipX - s.x, tipY - s.y);
    if (d1 <= s.r + NEAR + 2) {
      if (d0 <= s.r + 0.5) return 0;
      const dx = tipX - seg.x1, dy = tipY - seg.y1, L = Math.hypot(dx, dy);
      if (L < 1) return 0;
      // distance from start to the summer rim along the segment
      const ux = dx / L, uy = dy / L;
      // start is outside: length to rim is d0 - r, but along the ray if it aims at the center-ish
      cut = Math.max(cut, Math.max(0, L - Math.max(0, s.r + 1 - d1)));
    }
  }
  for (const b of geom.boxes) {
    const inside = (x: number, y: number) => x >= b.x - 0.5 && x <= b.x + b.w + 0.5 && y >= b.y - 0.5 && y <= b.y + b.h + 0.5;
    if (!inside(tipX, tipY) && !atBox(geom, tipX, tipY)) continue;
    if (inside(seg.x1, seg.y1)) return 0;
    // trim the end that sits on/in the box; remaining length is the shaft
    const t = trim(seg, (x, y) => x >= b.x - CAP && x <= b.x + b.w + CAP && y >= b.y - CAP && y <= b.y + b.h + CAP);
    if (!t) return 0;
    cut = Math.max(cut, Math.hypot(t.x2 - t.x1, t.y2 - t.y1));
  }
  if (cut > 0) return cut;
  return segLen(seg);
}

function labelRects(geom: LabGeom) {
  const out: { label: string; l: number; t: number; r: number; b: number }[] = [];
  const add = (term: LabGeom['terms'][number]) => {
    if (term.w == null || term.h == null || term.l == null || term.t == null || term.w < 2) return;
    out.push({ label: term.label, l: term.l, t: term.t, r: term.l + term.w, b: term.t + term.h });
  };
  for (const t of geom.terms) add(t);
  for (const m of geom.marks) add(m);
  return out;
}

function segHitsRect(s: LabGeom['segs'][number], l: number, t: number, r: number, b: number) {
  const inside = (x: number, y: number) => x >= l && x <= r && y >= t && y <= b;
  if (inside(s.x1, s.y1) && inside(s.x2, s.y2)) return true;
  const edges: [number, number, number, number][] = [
    [l, t, r, t], [r, t, r, b], [r, b, l, b], [l, b, l, t],
  ];
  const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) => {
    const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(den) < 1e-9) {
      // collinear overlap with the edge
      return false;
    }
    const p = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
    const q = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
    return p >= 0 && p <= 1 && q >= 0 && q <= 1;
  };
  if (edges.some(([ax, ay, bx, by]) => cross(s.x1, s.y1, s.x2, s.y2, ax, ay, bx, by))) return true;
  // also treat a line that runs through the box interior
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy;
  if (L2 < 1) return inside(s.x1, s.y1);
  for (const [px, py] of [[(l + r) / 2, (t + b) / 2], [l, (t + b) / 2], [r, (t + b) / 2], [(l + r) / 2, t], [(l + r) / 2, b]] as [number, number][]) {
    const tt = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / L2));
    const x = s.x1 + tt * dx, y = s.y1 + tt * dy;
    if (inside(x, y)) return true;
  }
  return false;
}

function topologyProblems(geom: LabGeom, sys: string, drawn: DrawnLabel[] = []): string[] {
  const out: string[] = [];
  for (const seg of geom.segs) {
    if (!seg.signal || seg.signal === 'untagged') {
      out.push(`untagged segment (${seg.x1.toFixed(1)},${seg.y1.toFixed(1)})→(${seg.x2.toFixed(1)},${seg.y2.toFixed(1)})`);
    }
  }
  const bySig = new Map<string, LabGeom['segs']>();
  // A physical segment (same endpoints) must not be claimed by two signals.
  const seen = new Map<string, string>();
  for (const seg of geom.segs) {
    const a = key(seg.x1, seg.y1), b = key(seg.x2, seg.y2);
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    const prev = seen.get(k);
    if (prev && prev !== seg.signal) {
      out.push(`segment ${k} belongs to both ${prev} and ${seg.signal}`);
    } else {
      seen.set(k, seg.signal);
    }
    const list = bySig.get(seg.signal) ?? [];
    list.push(seg);
    bySig.set(seg.signal, list);
  }

  for (const hit of crossings(geom)) out.push(hit);

  for (let i = 0; i < geom.tips.length; i++) {
    for (let j = i + 1; j < geom.tips.length; j++) {
      const d = Math.hypot(geom.tips[i].x - geom.tips[j].x, geom.tips[i].y - geom.tips[j].y);
      if (d < TIP_GAP) {
        out.push(`arrowheads meet (${geom.tips[i].signal} & ${geom.tips[j].signal}) d=${d.toFixed(1)} at (${geom.tips[i].x.toFixed(1)},${geom.tips[i].y.toFixed(1)})`);
      }
    }
  }
  for (const tip of geom.tips) {
    for (const sign of geom.signs) {
      const d = Math.hypot(tip.x - sign.x, tip.y - sign.y);
      if (d < SIGN_GAP) {
        out.push(`arrowhead on sign ${sign.text} (${tip.signal}) d=${d.toFixed(1)} at (${tip.x.toFixed(1)},${tip.y.toFixed(1)})`);
      }
    }
  }

  const deg = degreeMap(geom);
  for (const { x, y, n, segs } of deg.values()) {
    if (n === 1 && !anchored(geom, x, y)) {
      out.push(`dead-end at (${x.toFixed(1)},${y.toFixed(1)}) signal=${segs[0]?.signal}`);
    }
    if (n === 2 && segs.length === 2 && collinearOpposite(segs[0], segs[1], x, y) && !anchored(geom, x, y)) {
      out.push(`dead-end stub / U-turn at (${x.toFixed(1)},${y.toFixed(1)}) signals=${segs.map((s) => s.signal).join(',')}`);
    }
  }

  if (sys === 'disk') {
    const ones = geom.marks.filter((m) => m.label === '1');
    if (ones.length < 1) out.push('disk is missing the unity-gain 1 mark');
    const fb = geom.segs.filter((s) => s.signal === 'feedback');
    for (const m of ones) {
      const ok = fb.some((s) => {
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
        const L2 = dx * dx + dy * dy;
        const t = L2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((m.x - s.x1) * dx + (m.y - s.y1) * dy) / L2));
        return Math.hypot(m.x - (s.x1 + t * dx), m.y - (s.y1 + t * dy)) <= MARK_NEAR;
      });
      if (!ok) out.push(`disk 1 at (${m.x.toFixed(1)},${m.y.toFixed(1)}) is not on the feedback return`);
    }
  }

  if (sys === 'motor-closed') {
    const litSegs = (id: string) => geom.segs.filter((s) => s.hi.includes(id));
    const lit = (id: string) => new Set(litSegs(id).map((s) => `${key(s.x1, s.y1)}|${key(s.x2, s.y2)}|${s.signal}`));
    for (const [A, B] of [['sys2', 'sys3'], ['sys1', 'sys3']] as const) {
      const a = lit(A), b = lit(B);
      for (const k of a) {
        if (b.has(k)) out.push(`${A} and ${B} share segment ${k}`);
      }
      for (const sa of litSegs(A)) {
        for (const sb of litSegs(B)) {
          const ol = collinearOverlapLen(sa, sb);
          if (ol > 4) out.push(`${A} and ${B} collinear-overlap ${ol.toFixed(1)}px ${sa.signal}/${sb.signal}`);
        }
      }
    }
  }

  for (const sign of geom.signs) {
    for (const t of geom.terms) {
      const d = Math.hypot(sign.x - t.x, sign.y - t.y);
      if (d < 6) out.push(`sign ${sign.text} overlaps label ${t.label} d=${d.toFixed(1)}`);
    }
  }

  // Collinear overlap between different signals (partial shared stretches, not just identical endpoints).
  for (let i = 0; i < geom.segs.length; i++) {
    for (let j = i + 1; j < geom.segs.length; j++) {
      const a = geom.segs[i], b = geom.segs[j];
      if (a.signal === b.signal) continue;
      const ol = collinearOverlapLen(a, b);
      if (ol > 4) {
        out.push(`collinear overlap ${a.signal}/${b.signal} ${ol.toFixed(1)}px at (${a.x1.toFixed(1)},${a.y1.toFixed(1)})`);
      }
    }
  }

  // Wire-vs-wire crossings. Same-signal tees are junctions. Different-signal
  // crosses or tees are allowed only at a labelled terminal — a hop does not
  // excuse a crossing (BUG-104).
  for (let i = 0; i < geom.segs.length; i++) {
    for (let j = i + 1; j < geom.segs.length; j++) {
      const a = geom.segs[i], b = geom.segs[j];
      if (a.signal === b.signal) continue;
      const hit = properIntersect(a, b);
      if (!hit) continue;
      const labelled = geom.terms.some((t) => Math.hypot(t.x - hit.x, t.y - hit.y) <= TERM_NEAR);
      if (labelled) continue;
      out.push(`wire ${a.signal} ${hit.kind} ${b.signal} at (${hit.x.toFixed(1)},${hit.y.toFixed(1)})`);
    }
  }

  // Final drawn label boxes (after the shared text() placer), not the intended
  // labelBox recorded before a nudge (BUG-103). Signs (+/−) are excluded; they
  // sit beside arrowheads by design.
  // Only named terminals / marks (not the Σ in a summer, not box copy). Match the
  // recorded name to the final drawn box from the placer.
  const named = new Set([...geom.terms, ...geom.marks].map((t) => t.label).filter((s) => s && s !== 'Σ'));
  const labs = finalLabels(drawn)
    .filter((e) => named.has(e.s) && e.s !== 'Σ')
    .map((e) => ({ label: e.s, l: e.x0, t: e.y0, r: e.x1, b: e.y1 }))
    .filter((lab) => !geom.sums.some((s) => {
      const cx = (lab.l + lab.r) / 2, cy = (lab.t + lab.b) / 2;
      return Math.hypot(cx - s.x, cy - s.y) <= s.r;
    }));
  const own: Record<string, string[]> = {
    omega: ['ω'], va: ['Va'], ref: ['0', 'R', 'Speed Ref', 'rpm*'],
    feedback: ['rpm', 'Y', 'ω', '1'], N: ['N'], tload: ['Tload', '(drag)', 'Tload (drag)'],
  };
  const overlapLen = (seg: LabGeom['segs'][number], l: number, t: number, r: number, b: number) => {
    const L = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    if (L < 1) return 0;
    const ux = (seg.x2 - seg.x1) / L, uy = (seg.y2 - seg.y1) / L;
    const n = Math.max(8, Math.ceil(L));
    let hits = 0;
    for (let i = 0; i <= n; i++) {
      const x = seg.x1 + ux * L * (i / n), y = seg.y1 + uy * L * (i / n);
      if (x >= l && x <= r && y >= t && y <= b) hits++;
    }
    return hits * (L / n);
  };
  // Wire-vs-label (including dashed lines). A short end-cap next to a label is
  // allowed (the wire may terminate at its name). A shaft or mid-run through a
  // label is not, except for mid-bus names (N, unity 1) on their own non-arrow run.
  for (const lab of labs) {
    const pad = 2;
    const l = lab.l - pad, t = lab.t - pad, r = lab.r + pad, b = lab.b + pad;
    for (const seg of geom.segs) {
      const midBus = !seg.arrowEnd && (own[seg.signal] ?? []).includes(lab.label);
      if (midBus) continue;
      const ol = overlapLen(seg, l, t, r, b);
      if (ol <= 0.5) continue;
      const cx = (lab.l + lab.r) / 2, cy = (lab.t + lab.b) / 2;
      const inBox = (x: number, y: number) => x >= l && x <= r && y >= t && y <= b;
      const nearStart = Math.hypot(seg.x1 - cx, seg.y1 - cy) <= TERM_NEAR || inBox(seg.x1, seg.y1);
      const nearTip = Math.hypot(seg.x2 - cx, seg.y2 - cy) <= 8 || inBox(seg.x2, seg.y2);
      const intoSummer = !!seg.arrowEnd && geom.sums.some((s) => Math.hypot(seg.x2 - s.x, seg.y2 - s.y) <= s.r + NEAR + 2);
      // Output names (ω, Y, rpm) may sit at either end of their stub. Input names
      // (Va, 0, rpm*) may sit at the tail. A label on a shaft or arrowhead into a
      // summer (T_d on 6da2858) is not an end-cap.
      if (!intoSummer && (nearStart || nearTip)) continue;
      if (intoSummer && nearStart && !nearTip) continue;
      out.push(`wire ${seg.signal} crosses label "${lab.label}" at (${lab.l.toFixed(1)},${lab.t.toFixed(1)})`);
    }
    // Arrowhead (7 px triangle) must not sit on a label. The tip itself has to
    // enter the label box — labels beside an output stub stay clear.
    const HEAD = 7;
    for (const tip of geom.tips) {
      const inside = tip.x >= lab.l - 1 && tip.x <= lab.r + 1 && tip.y >= lab.t - 1 && tip.y <= lab.b + 1;
      const along = geom.segs.find((s) => s.arrowEnd && Math.hypot(s.x2 - tip.x, s.y2 - tip.y) < 0.5);
      let headHits = inside;
      if (!headHits && along) {
        const L = Math.hypot(along.x2 - along.x1, along.y2 - along.y1) || 1;
        const ux = (along.x2 - along.x1) / L, uy = (along.y2 - along.y1) / L;
        // sample the triangle's spine from the tip back HEAD px
        for (let d = 0; d <= HEAD; d += 1.5) {
          const x = tip.x - ux * d, y = tip.y - uy * d;
          if (x >= lab.l && x <= lab.r && y >= lab.t && y <= lab.b) { headHits = true; break; }
        }
      }
      if (headHits) {
        out.push(`arrowhead ${tip.signal} covers label "${lab.label}" at (${tip.x.toFixed(1)},${tip.y.toFixed(1)})`);
      }
    }
  }

  // A recorded hop is a crossing that was papered over. None are allowed (BUG-104).
  for (const h of geom.hops ?? []) {
    out.push(`hop of ${h.signal} at (${h.x.toFixed(1)},${h.y.toFixed(1)})`);
  }

  // Box copy (final drawn, after the placer) must keep 4 px of inner padding on
  // each side, counting the Simulation Project text halo, and arrowheads must
  // stop clear of that ink (BUG-105). 9 px floor already comes from text().
  const BOX_INK_PAD = 4;
  const HEAD_LEN = 7;
  const HEAD_BOX_CLEAR = 12;
  const haloOf = (size: number) => Math.max(3, size * 0.3) / 2;
  const boxCopy = finalLabels(drawn).filter((e) => {
    if (!e.s || e.s === 'Σ' || e.s === '+' || e.s === '−' || e.s === '-') return false;
    const cx = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2;
    return geom.boxes.some((b) => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
  });
  for (const b of geom.boxes) {
    for (const e of boxCopy) {
      const cx = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2;
      if (cx < b.x || cx > b.x + b.w || cy < b.y || cy > b.y + b.h) continue;
      if ((e.size ?? 11) + 0.25 < 9) {
        out.push(`box ${b.id} text "${e.s}" is ${(e.size ?? 11).toFixed(1)}px, below 9`);
      }
      const h = haloOf(e.size ?? 11);
      const l = e.x0 - h, r = e.x1 + h, t = e.y0 - h, bot = e.y1 + h;
      const pl = l - b.x, pr = b.x + b.w - r, pt = t - b.y, pb = b.y + b.h - bot;
      if (pl + 0.25 < BOX_INK_PAD || pr + 0.25 < BOX_INK_PAD || pt + 0.25 < BOX_INK_PAD || pb + 0.25 < BOX_INK_PAD) {
        out.push(`box ${b.id} text "${e.s}" padding L=${pl.toFixed(1)} R=${pr.toFixed(1)} T=${pt.toFixed(1)} B=${pb.toFixed(1)}`);
      }
    }
  }
  for (const e of boxCopy) {
    const h = haloOf(e.size ?? 11);
    const l = e.x0 - h, r = e.x1 + h, t = e.y0 - h, bot = e.y1 + h;
    const hits = (x: number, y: number) => x >= l && x <= r && y >= t && y <= bot;
    for (const tip of geom.tips) {
      const along = geom.segs.find((s) => s.arrowEnd && Math.hypot(s.x2 - tip.x, s.y2 - tip.y) < 0.5);
      let headHits = hits(tip.x, tip.y);
      if (!headHits && along) {
        const L = Math.hypot(along.x2 - along.x1, along.y2 - along.y1) || 1;
        const ux = (along.x2 - along.x1) / L, uy = (along.y2 - along.y1) / L;
        for (let d = 0; d <= HEAD_LEN; d += 1.5) {
          if (hits(tip.x - ux * d, tip.y - uy * d)) { headHits = true; break; }
        }
      }
      if (headHits) {
        out.push(`arrowhead ${tip.signal} covers box text "${e.s}" at (${tip.x.toFixed(1)},${tip.y.toFixed(1)})`);
      }
    }
  }

  // An arrowhead stays at least 12 px from any block it does not enter (BUG-106).
  // Checked on stacked layouts, where a tight gap can make ω→Kb read as Kt→Kb.
  // The box this shaft starts on (an outgoing stub) and the box the tip enters
  // are exempt; packed one-row rails are not the bug.
  const distPointRect = (x: number, y: number, b: LabGeom['boxes'][number]) => {
    const dx = Math.max(b.x - x, 0, x - (b.x + b.w));
    const dy = Math.max(b.y - y, 0, y - (b.y + b.h));
    return Math.hypot(dx, dy);
  };
  if (geom.stacked) {
    for (const tip of geom.tips) {
      const along = geom.segs.find((s) => s.arrowEnd && Math.hypot(s.x2 - tip.x, s.y2 - tip.y) < 0.5);
      const start = along ? { x: along.x1, y: along.y1 } : tip;
      const pts = [{ x: tip.x, y: tip.y }];
      if (along) {
        const L = Math.hypot(along.x2 - along.x1, along.y2 - along.y1) || 1;
        const ux = (along.x2 - along.x1) / L, uy = (along.y2 - along.y1) / L;
        const ang = Math.atan2(uy, ux);
        pts.push({ x: tip.x - ux * HEAD_LEN, y: tip.y - uy * HEAD_LEN });
        pts.push({ x: tip.x - HEAD_LEN * Math.cos(ang - 0.4), y: tip.y - HEAD_LEN * Math.sin(ang - 0.4) });
        pts.push({ x: tip.x - HEAD_LEN * Math.cos(ang + 0.4), y: tip.y - HEAD_LEN * Math.sin(ang + 0.4) });
      }
      for (const b of geom.boxes) {
        if (distPointRect(tip.x, tip.y, b) <= NEAR) continue;
        if (distPointRect(start.x, start.y, b) <= NEAR) continue;
        const d = Math.min(...pts.map((p) => distPointRect(p.x, p.y, b)));
        if (d + 0.25 < HEAD_BOX_CLEAR) {
          out.push(`arrowhead ${tip.signal} within ${d.toFixed(1)}px of box ${b.id} at (${tip.x.toFixed(1)},${tip.y.toFixed(1)})`);
        }
      }
    }
  }

  // Every arrow into a summer has a visible shaft of at least 20 px outside that summer.
  for (const seg of geom.segs) {
    if (!seg.arrowEnd) continue;
    const tipSum = geom.sums.find((s) => {
      const dTip = Math.hypot(seg.x2 - s.x, seg.y2 - s.y);
      const dStart = Math.hypot(seg.x1 - s.x, seg.y1 - s.y);
      if (dTip > s.r + NEAR + 2) return false;
      if (dStart <= s.r + 0.5) return true; // started inside the summer — collapsed shaft
      return dTip < dStart - 0.5; // approaching from outside
    });
    if (!tipSum) continue;
    // Packed one-row ref/Va inputs stay short by design; stacked layouts and T_d
    // always need a visible 20 px shaft (BUG-100).
    if (!geom.stacked && seg.signal !== 'td') continue;
    const shaft = shaftOutside(geom, seg);
    if (shaft + 0.25 < SHAFT_MIN) {
      out.push(`short shaft ${shaft.toFixed(1)}px ${seg.signal} → (${seg.x2.toFixed(1)},${seg.y2.toFixed(1)})`);
    }
  }

  return out;
}

function stackedHeight(sys: string) {
  if (sys === 'motor-closed') return 580;
  if (sys === 'engine') return 640;
  return 520;
}

describe('lab diagrams: topology of every signal at 257, 320, 390, 923 and 1280', () => {
  const cases: { sys: typeof SYSTEMS[number]; words?: LabelWords; layout?: 'stack' | 'row'; w: number; h: number }[] = [];
  // 257 is the live canvas at a 320 viewport (93% frame + tab/fig padding).
  for (const w of [257, 320, 390, 923, 1280]) {
    for (const sys of SYSTEMS) {
      for (const words of WORDS) {
        if (sys === 'engine' && words === undefined) {
          // Script stepper is always a compact one-row path; only test it when that row fits.
          if (labDiagramFitsHorizontal(sys, w, words)) {
            cases.push({ sys, words, layout: 'row', w, h: 300 });
          }
          continue;
        }
        // Natural layout at this canvas width.
        const hNat = labDiagramHeight(sys, w, words);
        cases.push({ sys, words, w, h: hNat });
        // Forced stacked layout at every width (hand-placed narrow routes, plus wide canvas).
        cases.push({ sys, words, layout: 'stack', w, h: stackedHeight(sys) });
        // Forced one-row only when the 9 px fit says the row can actually be packed.
        if (labDiagramFitsHorizontal(sys, w, words)) {
          cases.push({ sys, words, layout: 'row', w, h: sys === 'engine' ? 360 : 300 });
        }
      }
    }
  }

  it.each(cases)('$sys words=$words $layout @ $w', ({ sys, words, layout, w, h }) => {
    const rec = record(w, h);
    const log = beginTextLog();
    const geom = drawLabDiagram(rec.g, w, h, { sys, words, layout });
    if (layout) expect(geom.stacked).toBe(layout === 'stack');
    expect(geom.boxes.length).toBeGreaterThan(0);
    expect(geom.sums.length).toBeGreaterThan(0);
    expect(geom.segs.length).toBeGreaterThan(0);
    const problems = topologyProblems(geom, sys, log);
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

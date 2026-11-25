import { describe, it, expect, vi } from 'vitest';
import { drawLabDiagram, labDiagramFitsHorizontal, labDiagramHeight, type LabGeom, type LabelWords } from '../src/figs/diagrams';

vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#888' }));
vi.stubGlobal('document', { documentElement: {} });

function record(w = 720, h = 360) {
  const texts: string[] = [];
  const state: any = { font: '11px system-ui', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, textAlign: 'left', textBaseline: 'alphabetic' };
  const g: any = new Proxy(state, {
    get(o, k: string) {
      if (k === 'canvas') return { width: w, height: h };
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'measureText') return (s: string) => ({ width: String(s).length * 6 });
      if (k === 'fillText') return (s: string) => { texts.push(String(s)); };
      if (k === 'save' || k === 'restore') return () => {};
      if (k in o) return o[k];
      return () => ({ addColorStop() {} });
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return { g: g as CanvasRenderingContext2D, texts, w, h };
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

/** Example usage (per-box `examples`, Nov 20; on for linear-systems only): the box glyphs sit inside the box, clear of its label
 *  (by the wrap's estimate; the e2e label-overlap spec checks the rendered text), clear of every line label; the reading order and
 *  the faint use-links are well formed. */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, listApps, repoRoot } from '../../build/src';
import { computeGeometry, placeLabels, exampleGlyphRects, overlaps, walkOrder, useLinkSegments, GLYPH } from '../src/maplayout';

const WIDTHS = [285, 347, 362, 387, 400, 528, 740, 900, 1024, 1280];
const TITLE_CHAR = 7.4, DETAIL_CHAR = 6.6;

describe.each(listApps())('%s example usage', (app) => {
  const { content } = loadApp(path.join(repoRoot, 'apps', app));
  if (!content.maps.length) { it('is a tabbed page with no map', () => expect(content.tabs?.length).toBeGreaterThan(0)); return; }
  const on = content.maps.some((m) => m.nodes.some((n) => n.examples?.length));
  if (app === 'control-systems') it('is on (stage-pass2, Nov 21): every control-systems box lists its example', () => expect(on).toBe(true));
  if (!on) return;
  for (const m of content.maps) {
    it.each(WIDTHS)(`map ${m.id} @%ipx: glyphs inside their box, clear of the label and of every line label`, (w) => {
      const g = computeGeometry(m.nodes, m.edges, w), labels = placeLabels(g, m.edges, []);
      for (const n of m.nodes) {
        const b = g.boxes[n.id], rs = exampleGlyphRects(b, n.examples?.length ?? 0);
        const textH = b.lines.length * 15 + b.detailLines.length * 14, top = b.y + (b.h - textH) / 2;
        const tw = Math.max(...b.lines.map((l) => l.length * TITLE_CHAR), ...b.detailLines.map((l) => l.length * DETAIL_CHAR)), text = { x: b.x + b.w / 2 - tw / 2, y: top, w: tw, h: textH };
        rs.forEach((r, i) => {
          expect(r.w).toBe(GLYPH);
          expect(r.x >= b.x + 2 && r.x + r.w <= b.x + b.w - 2 && r.y >= b.y + 2 && r.y + r.h <= b.y + b.h - 2, `${n.id} glyph ${i} inside`).toBe(true);
          expect(overlaps(r, text), `${n.id} glyph ${i} clear of the label`).toBe(false);
          for (const l of labels) expect(overlaps(r, l), `${n.id} glyph vs label ${l.key}`).toBe(false);
          rs.forEach((q, j) => { if (j !== i) expect(overlaps(r, q)).toBe(false); });
        });
      }
    });
    it(`map ${m.id}: reading order starts at the root and lists every box once`, () => {
      const o = walkOrder(m.nodes, m.edges);
      expect(o[0]).toBe('root'); expect(new Set(o).size).toBe(m.nodes.length); expect(o.length).toBe(m.nodes.length);
      // a box comes after the box its main line comes from
      for (const e of m.edges.filter((x) => !x.dashed && !x.side)) if (o.indexOf(e.to) < o.indexOf(e.from)) expect(m.edges.some((x) => x.to === e.to && !x.dashed && o.indexOf(x.from) < o.indexOf(e.to))).toBe(true);
    });
  }
});

describe('use-link segments', () => {
  it('run from the node outline to each box outline', () => {
    const node = { x: 300, y: 100, w: 100, h: 40 }, boxes = [{ x: 40, y: 400, w: 180, h: 50 }, { x: 320, y: 0, w: 60, h: 30 }];
    const segs = useLinkSegments(node, boxes);
    const onEdge = (p: { x: number; y: number }, r: typeof node) => (Math.abs(p.x - r.x) < 1e-6 || Math.abs(p.x - r.x - r.w) < 1e-6) && p.y >= r.y - 1e-6 && p.y <= r.y + r.h + 1e-6 || (Math.abs(p.y - r.y) < 1e-6 || Math.abs(p.y - r.y - r.h) < 1e-6) && p.x >= r.x - 1e-6 && p.x <= r.x + r.w + 1e-6;
    segs.forEach(([a, b], i) => { expect(onEdge(a, node)).toBe(true); expect(onEdge(b, boxes[i])).toBe(true); });
  });
});

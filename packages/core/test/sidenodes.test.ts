/** Example nodes (runningExample.refs, Nov 20): each running example is its own node in a side column beside its host box,
 *  joined by a short level dotted link. Placed after the chain, so the chain's boxes and lines never move for them. */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, listApps, repoRoot } from '../../build/src';
import { computeGeometry, placeLabels, placeSideNodes, sideNodeOverlaps, overlaps, overlapReport } from '../src/maplayout';

// map column widths the app really lays out: phones (390 → ~358), the split side map at 923 / 1024 / 1280, tablets and desktops
// real map columns: 285 (768 tablet split), 347 (923 split), 362 (390 phone), 387 (1024 split), 400 (1280 split), 528 (1600 split); 740–1348 unsplit
const WIDTHS = [285, 300, 330, 347, 362, 387, 400, 480, 528, 640, 740, 900, 1024, 1280, 1400];

describe.each(listApps())('%s Example nodes', (app) => {
  const { content } = loadApp(path.join(repoRoot, 'apps', app));
  const refs = content.subject.runningExample?.refs ?? [];
  if (!refs.length) { it('(no running-example refs)', () => expect(refs).toEqual([])); return; }
  for (const m of content.maps) {
    const on = refs.filter((r) => m.nodes.some((n) => n.id === r.at)).map((r) => ({ id: r.id, at: r.at, label: r.label }));
    if (!on.length) continue;
    it.each(WIDTHS)(`map ${m.id} @%ipx: beside the host, level link, nothing under a node, the chain's shape untouched`, (w) => {
      const g0 = computeGeometry(m.nodes, m.edges, w), before = JSON.stringify(g0);
      const { geom, nodes } = placeSideNodes(g0, on, placeLabels(g0, m.edges, []));
      expect(JSON.stringify(g0), 'the input drawing is not mutated').toBe(before);
      // the chain keeps its layout: every box keeps its x and size; a band opened between rows only moves later rows down
      const dx = geom.boxes[m.nodes[0].id].x - g0.boxes[m.nodes[0].id].x;
      for (const id of Object.keys(g0.boxes)) { expect(geom.boxes[id].x - g0.boxes[id].x).toBeCloseTo(dx, 6); expect(geom.boxes[id].y).toBeGreaterThanOrEqual(g0.boxes[id].y); expect(geom.boxes[id].w).toBe(g0.boxes[id].w); expect(geom.boxes[id].h).toBe(g0.boxes[id].h); }
      for (const a of Object.values(g0.boxes)) for (const c of Object.values(g0.boxes)) if (a.row === c.row) expect(geom.boxes[a.id].y - geom.boxes[c.id].y).toBeCloseTo(a.y - c.y, 6);
      // every example has its node; only on a dense Full-detail map in a narrow side column may one be left off (no clear
      // spot beside, under or over its box): it is always on the Big-picture map
      const missing = on.filter((r) => !nodes.some((n) => n.id === r.id)).map((r) => r.id);
      if (m === content.maps[0] || w >= 340) expect(missing, 'every example placed').toEqual([]); else expect(missing.length).toBeLessThanOrEqual(1);
      expect(nodes.map((n) => n.id)).toEqual(on.map((r) => r.id).filter((id) => !missing.includes(id)));
      expect(geom.width, 'the drawing never grows wider (Fit must still fit)').toBe(g0.width);
      const labels = placeLabels(geom, m.edges, [], nodes);
      expect(sideNodeOverlaps(geom, nodes, labels), 'no box, line, label or other example under a node').toBe(0);
      expect(overlapReport(geom, labels)).toEqual({ nodeNode: 0, labelNode: 0, labelLabel: 0 });
      for (const n of nodes) {
        const b = geom.boxes[n.at];
        expect(n.x).toBeGreaterThanOrEqual(0); expect(n.x + n.w).toBeLessThanOrEqual(geom.width);
        const level = Math.abs(n.link[0].y - n.link[1].y) < 0.01;
        if (level) {
          // beside its host: level with it, the link a horizontal stub from the host's side to the node's
          expect(n.link[0].y).toBeGreaterThan(b.y); expect(n.link[0].y).toBeLessThan(b.y + b.h);
          expect(n.link[0].x).toBeCloseTo(n.side === 'right' ? b.x + b.w : b.x, 5); expect(n.link[1].x).toBeCloseTo(n.side === 'right' ? n.x : n.x + n.w, 5);
          if (!n.column) expect(Math.abs(n.link[1].x - n.link[0].x)).toBeLessThanOrEqual(60);
        } else {
          // under (over) a full row: a short drop from the host's foot to the node's top (from its head to the node's foot)
          expect(n.column).toBe(true); expect(n.link[0].x).toBe(n.link[1].x);
          if (n.link[1].y > n.link[0].y) { expect(n.link[0].y).toBeCloseTo(b.y + b.h, 5); expect(n.link[1].y).toBeCloseTo(n.y, 5); }
          else { expect(n.link[0].y).toBeCloseTo(b.y, 5); expect(n.link[1].y).toBeCloseTo(n.y + n.h, 5); }
          expect(Math.abs(n.link[1].y - n.link[0].y)).toBeLessThanOrEqual(40);
          expect(n.link[0].x).toBeGreaterThan(b.x); expect(n.link[0].x).toBeLessThan(b.x + b.w); expect(n.link[0].x).toBeGreaterThan(n.x); expect(n.link[0].x).toBeLessThan(n.x + n.w);
        }
        // the link runs into no other box and crosses no line
        const lk = level ? { x: Math.min(n.link[0].x, n.link[1].x) + 1, y: n.link[0].y - 0.5, w: Math.abs(n.link[1].x - n.link[0].x) - 2, h: 1 } : { x: n.link[0].x - 0.5, y: Math.min(n.link[0].y, n.link[1].y) + 1, w: 1, h: Math.abs(n.link[1].y - n.link[0].y) - 2 };
        for (const bx of Object.values(geom.boxes)) if (bx.id !== n.at) expect(overlaps(lk, bx), `${n.id} link × box ${bx.id}`).toBe(false);
        for (const g of geom.edges) for (let i = 1; i < g.points.length; i++) { const p = g.points[i - 1], q = g.points[i]; expect(overlaps(lk, { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(q.x - p.x), h: Math.abs(q.y - p.y) }), `${n.id} link × ${g.key} @${w}`).toBe(false); }
        expect(n.lines.join(' '), 'whole words, never cut').toBe(on.find((r) => r.id === n.id)!.label);
      }
    });
  }
  // the Big-picture map (the one most readers walk) always finds a free spot beside its hosts at real column widths
  it('big map: free spots beside the hosts (no band) from the 923 split column (347 px) up', () => {
    const m = content.maps[0], on2 = refs.filter((r) => m.nodes.some((n) => n.id === r.at)).map((r) => ({ id: r.id, at: r.at, label: r.label }));
    for (const w of WIDTHS.filter((x) => x >= 347)) { const g = computeGeometry(m.nodes, m.edges, w); expect(placeSideNodes(g, on2, placeLabels(g, m.edges, [])).nodes.filter((n) => n.column).map((n) => n.id), `@${w}`).toEqual([]); }
  });
});

describe('placeSideNodes fallback', () => {
  it('with no free spot it opens a band under the host row instead of overlapping (and stays as wide)', () => {
    // two boxes fill the second row of a narrow drawing: no room beside B
    const geom = computeGeometry([{ id: 'root', label: 'A' }, { id: 'B', label: 'B' }, { id: 'C', label: 'C' }], [{ from: 'root', to: 'B' }, { from: 'root', to: 'C' }], 300);
    const { nodes, geom: g2 } = placeSideNodes(geom, [{ id: 'x', at: 'B', label: 'an example' }]);
    expect(nodes.length).toBe(1);
    expect(nodes[0].column).toBe(true); expect(g2.height).toBeGreaterThan(geom.height); expect(g2.width).toBe(geom.width);
    expect(sideNodeOverlaps(g2, nodes, [])).toBe(0);
  });
});

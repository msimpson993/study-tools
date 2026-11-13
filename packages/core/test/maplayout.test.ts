import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, listApps, repoRoot } from '../../build/src';
import { computeGeometry, placeLabels, overlapReport, pathToRoot, edgeKey } from '../src/maplayout';

const WIDTHS = [360, 390, 480, 640, 768, 900, 1024, 1150, 1280, 1400];

describe.each(listApps())('%s concept maps', (app) => {
  const { content } = loadApp(path.join(repoRoot, 'apps', app));
  for (const map of content.maps) {
    describe(`map ${map.id}`, () => {
      it.each(WIDTHS)('has no node/node, label/node or label/label overlaps at %ipx', (w) => {
        const geom = computeGeometry(map.nodes, map.edges, w);
        const labels = placeLabels(geom, map.edges, []);
        expect(overlapReport(geom, labels)).toEqual({ nodeNode: 0, labelNode: 0, labelLabel: 0 });
      });
      it('keeps every box and label inside the canvas', () => {
        for (const w of [390, 1400]) {
          const geom = computeGeometry(map.nodes, map.edges, w);
          const labels = placeLabels(geom, map.edges, []);
          for (const b of Object.values(geom.boxes)) {
            expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.w).toBeLessThanOrEqual(geom.width + 0.5);
          }
          for (const l of labels) { expect(l.x).toBeGreaterThanOrEqual(-0.5); expect(l.x + l.w).toBeLessThanOrEqual(geom.width + 0.5); }
        }
      });
      it('draws a label for every labelled edge and a path to the root from every node', () => {
        for (const w of [390, 768, 1000, 1400]) {
          const geom = computeGeometry(map.nodes, map.edges, w);
          const labels = placeLabels(geom, map.edges, []);
          const want = map.edges.filter((e) => e.label).map((e) => edgeKey(e.from, e.to));
          for (const k of want) expect(labels.some((l) => l.key === k), `label for ${k} at ${w}px`).toBe(true);
        }
        for (const n of map.nodes) expect(pathToRoot(n.id, map.edges)[0]).toBe('root');
      });
    });
  }
});

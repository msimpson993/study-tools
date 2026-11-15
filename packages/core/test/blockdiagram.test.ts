import { describe, it, expect } from 'vitest';
import {
  DIAGRAM_STAGES, partsOf, newPartsOf, diagramStages, diagramProblems,
  diagramStageHeight, diagramStripHeight, layoutDiagrams, DIAGRAM_SIDE_BY_SIDE,
  isDiagramStage,
} from '../src/blockdiagram';
import { sceneLayout } from '../src/scene';
import { sceneProblems } from '../src/scenedefs';

describe('block-diagram catalogue', () => {
  it('every stage has parts, and new parts are a subset of them', () => {
    expect(DIAGRAM_STAGES.length).toBe(7);
    for (const s of DIAGRAM_STAGES) {
      expect(isDiagramStage(s)).toBe(true);
      const parts = partsOf(s), added = newPartsOf(s);
      expect(parts.length).toBeGreaterThan(0);
      expect(added.length).toBeGreaterThan(0);
      expect(added.every((p) => parts.includes(p))).toBe(true);
    }
  });
  it('open is just the plant; later stages keep G and add the loop around it', () => {
    expect(partsOf('open')).toEqual(['u', 'G', 'y']);
    expect(newPartsOf('open')).toEqual(['G']);
    expect(partsOf('states')).toEqual(expect.arrayContaining(['x', 'xdot', 'G']));
    expect(newPartsOf('states')).toEqual(['x', 'xdot']);
    for (const s of ['loop', 'disturb', 'pid', 'noise', 'gain'] as const) {
      expect(partsOf(s)).toEqual(expect.arrayContaining(['r', 'sum', 'e', 'C', 'u', 'G', 'y', 'fb']));
    }
    expect(newPartsOf('loop')).toEqual(['r', 'sum', 'e', 'C', 'fb']);
    expect(newPartsOf('disturb')).toEqual(['d']);
    expect(newPartsOf('pid')).toEqual(['P', 'I', 'D']);
    expect(newPartsOf('noise')).toEqual(['n']);
    expect(newPartsOf('gain')).toEqual(['K']);
  });
  it('diagramStages normalises a single stage or a list; problems catch unknown and empty', () => {
    expect(diagramStages(undefined)).toEqual([]);
    expect(diagramStages('open')).toEqual(['open']);
    expect(diagramStages(['loop', 'disturb'])).toEqual(['loop', 'disturb']);
    expect(diagramProblems(undefined, 'x')).toEqual([]);
    expect(diagramProblems('open', 'x')).toEqual([]);
    expect(diagramProblems(['loop', 'disturb'], 'x')).toEqual([]);
    expect(diagramProblems('nope', 'w').join()).toMatch(/unknown diagram stage/);
    expect(diagramProblems([], 'w').join()).toMatch(/empty/);
    expect(diagramProblems(['loop', 'loop'], 'w').join()).toMatch(/duplicate/);
    expect(sceneProblems('cart', ['forces'], 'w', undefined, 'open')).toEqual([]);
    expect(sceneProblems('cart', ['loop'], 'w', { K: 7 }, 'bogus').join()).toMatch(/unknown diagram stage/);
  });
});

describe('block-diagram layout', () => {
  it('one stage is a strip under the given y; two stages stack on a phone and sit side by side when wide', () => {
    const one = layoutDiagrams(['open'], 390, 100);
    expect(one).toHaveLength(1);
    expect(one[0].rect).toMatchObject({ x: 0, y: 100, w: 390 });
    expect(one[0].rect.h).toBe(diagramStageHeight('open', 390));
    const phone = layoutDiagrams(['loop', 'disturb'], 390, 0);
    expect(phone).toHaveLength(2);
    expect(phone[0].rect.y).toBe(0);
    expect(phone[1].rect.y).toBeGreaterThan(phone[0].rect.h);
    expect(phone[0].rect.w).toBe(390);
    expect(diagramStripHeight(['loop', 'disturb'], 390)).toBe(phone[1].rect.y + phone[1].rect.h);
    const wideW = Math.max(DIAGRAM_SIDE_BY_SIDE, 760);
    const wide = layoutDiagrams(['loop', 'disturb'], wideW, 0);
    expect(wide[0].rect.y).toBe(wide[1].rect.y);
    expect(wide[1].rect.x).toBeGreaterThan(wide[0].rect.x);
    expect(wide[0].rect.x + wide[0].rect.w + wide[1].rect.w).toBeLessThanOrEqual(wideW + 0.5);
  });
  it('sceneLayout grows by the strip, keeps the cart at open-loop height, and puts insets under the diagram', () => {
    const w = 390;
    const F = sceneLayout('cart', ['forces', 'push'], w, false);
    const D = sceneLayout('cart', ['forces', 'push'], w, false, 'open');
    expect(F.diagrams).toEqual([]);
    expect(D.diagrams).toHaveLength(1);
    expect(D.diagrams[0].stage).toBe('open');
    expect(D.main.h).toBe(F.main.h);
    expect(D.diagrams[0].rect.y).toBeGreaterThanOrEqual(D.main.h);
    expect(D.h).toBeGreaterThan(F.h);
    expect(D.h - F.h).toBeGreaterThanOrEqual(D.diagrams[0].rect.h);
    // insets sit below the diagram, not on top of it
    expect(D.insets[0].rect.y).toBeGreaterThanOrEqual(D.diagrams[0].rect.y + D.diagrams[0].rect.h);
    const loopNoDiag = sceneLayout('cart', ['loop'], w, false);
    const loopDiag = sceneLayout('cart', ['loop'], w, false, 'loop');
    expect(loopDiag.main.h).toBeLessThan(loopNoDiag.main.h);
    expect(loopDiag.diagrams[0].rect.w).toBe(w);
    const two = sceneLayout('cart', ['disturb'], w, false, ['loop', 'disturb']);
    expect(two.diagrams).toHaveLength(2);
    expect(two.diagrams.every((d) => d.rect.x >= 0 && d.rect.x + d.rect.w <= w + 0.5)).toBe(true);
  });
  it('compact hero with a diagram has no insets but still has the strip', () => {
    const L = sceneLayout('cart', ['loop'], 390, true, 'loop');
    expect(L.insets).toEqual([]);
    expect(L.diagrams).toHaveLength(1);
    expect(L.h).toBeGreaterThan(L.main.h);
  });
});

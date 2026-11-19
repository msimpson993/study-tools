import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadApp, repoRoot } from '../../build/src';
import {
  CONTEXT_MAX, buildReference, stripHtml, trimContext, formatNum, formatValues,
  viewingFigure, liveUrl, pathLabels, pathForDive, pickFromHash, mapHashFor,
  nodeReference, edgeReference, diveReference, figureRefWithControls, quizReference,
} from '../src/copyref';
import { edgeKey } from '../src/maplayout';
import type { AppContent, MapNode } from '../src/types';

const sample: AppContent = {
  subject: {
    id: 'demo',
    title: 'Control systems',
    centralQuestion: 'How do we make a system do what we command?',
    blurb: '',
    archetype: 'guide',
    sections: [],
  },
  maps: [{
    id: 'chain',
    title: 'The question chain',
    nodes: [
      { id: 'root', label: 'How do we make a system do what we command?', short: 'The whole course in one question.' },
      { id: 'model', label: 'How do we describe a plant without re-solving its ODE?', dive: 'model', short: 'For a linear time-invariant plant, <b>G(s) = Y(s)/U(s)</b> (zero initial conditions) and blocks in series simply multiply.' },
      { id: 'splane', label: 'What is a pole or a zero, physically?', short: 'Poles mark the natural modes.' },
    ],
    edges: [
      { from: 'root', to: 'model', question: 'How do we write the plant down?', idea: 'Use a transfer function.' },
      { from: 'model', to: 'splane', question: 'What do the poles mean?', idea: 'Each pole is a mode <em>e<sup>pt</sup></em>.' },
    ],
  }],
  dives: [{
    id: 'model',
    title: 'The transfer function',
    category: 'model',
    chain: [
      { title: 'How do we make a system do what we command?' },
      { title: 'How do we describe a plant without re-solving its ODE?' },
    ],
    neighbors: [],
    html: '<p>A long dive body that should only be used as a fallback.</p>',
    addsToExample: 'Turns the cart into G(s) = 1/(s² + 3s + 2).',
  }],
  quiz: [{ id: 'q-model-1', tags: ['model'], kind: 'recall', q: 'What does <i>G(s)</i> equal at rest?' }],
  glossary: [],
  figures: [{
    id: 'step',
    title: 'Step response of the cart',
    x: 't (s)', y: 'x (m)',
    legend: [],
    howToRead: 'The curve is the cart position after a step command.',
    lookFor: 'Overshoot grows as damping drops.',
    controls: [],
    presets: [],
  }],
  extra: {},
};

describe('stripHtml / trimContext / formatValues', () => {
  it('strips tags and decodes common entities', () => {
    expect(stripHtml('A <b>bold</b> &amp; <i>italic</i>&#39;s &quot;quote&quot;')).toBe('A bold & italic\'s "quote"');
    expect(stripHtml('mode <em>e<sup>pt</sup></em>.')).toBe('mode ept.');
  });

  it('trims to about 300 characters on a word boundary and adds an ellipsis', () => {
    const words = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ');
    const out = trimContext(words);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(CONTEXT_MAX + 1);
    expect(out).not.toMatch(/word79/);
  });

  it('leaves short text alone', () => {
    expect(trimContext('  already short  ')).toBe('already short');
  });

  it('formats numbers compactly and lists control values', () => {
    expect(formatNum(2)).toBe('2');
    expect(formatNum(2.0)).toBe('2');
    expect(formatNum(0.5)).toBe('0.5');
    expect(formatNum(1.23456)).toBe('1.2346');
    expect(formatValues({ K: 2, zeta: 0.5, on: true, mode: 'step' })).toBe('K=2, zeta=0.5, on=on, mode=step');
    expect(viewingFigure('Step response of the cart', { K: 2, zeta: 0.5 }, 'deep dive'))
      .toBe("deep dive, figure 'Step response of the cart' (K=2, zeta=0.5)");
  });
});

describe('buildReference', () => {
  it('builds a compact multi-line packet a human or a bot can read', () => {
    const text = buildReference({
      pageTitle: 'Control systems',
      title: 'How do we describe a plant without re-solving its ODE?',
      url: 'https://msimpson993.github.io/study-tools/control-systems/#/node/model',
      path: [
        'How do we make a system do what we command?',
        'How do we describe a plant without re-solving its ODE?',
      ],
      viewing: "deep dive, figure 'Step response of the cart' (K=2, zeta=0.5)",
      context: 'For a linear time-invariant plant, G(s) = Y(s)/U(s) (zero initial conditions) and blocks in series simply multiply.',
    });
    expect(text).toBe([
      '[study-tools] Control systems > How do we describe a plant without re-solving its ODE?',
      'Path: How do we make a system do what we command? > How do we describe a plant without re-solving its ODE?',
      "Viewing: deep dive, figure 'Step response of the cart' (K=2, zeta=0.5)",
      'Link: https://msimpson993.github.io/study-tools/control-systems/#/node/model',
      'Context: For a linear time-invariant plant, G(s) = Y(s)/U(s) (zero initial conditions) and blocks in series simply multiply.',
    ].join('\n'));
  });

  it('strips HTML in context, omits an empty context line, and does not invent a path', () => {
    const text = buildReference({
      pageTitle: 'Control systems',
      title: 'A node',
      url: 'https://example.test/#/node/x',
      path: [],
      viewing: 'node panel',
      context: '<p>Short <b>answer</b>.</p>',
    });
    expect(text).toBe([
      '[study-tools] Control systems > A node',
      'Viewing: node panel',
      'Link: https://example.test/#/node/x',
      'Context: Short answer.',
    ].join('\n'));
    expect(buildReference({ pageTitle: 'P', title: 'T', url: '#/', path: ['Root'], viewing: 'node panel' }))
      .not.toMatch(/Context:/);
  });
});

describe('liveUrl / map hash helpers', () => {
  it('normalises hash paths to #/…', () => {
    expect(liveUrl('/node/model')).toBe('#/node/model');
    expect(liveUrl('#/dive/model')).toBe('#/dive/model');
    expect(liveUrl('quiz?qid=q-model-1')).toBe('#/quiz?qid=q-model-1');
  });

  it('parses #/node and #/edge into a map pick, and formats the matching hash', () => {
    expect(pickFromHash(sample, ['node', 'splane'])).toEqual({ mapId: 'chain', pick: { kind: 'node', id: 'splane' } });
    expect(pickFromHash(sample, ['edge', 'model__splane'])).toEqual({ mapId: 'chain', pick: { kind: 'edge', id: 'model__splane' } });
    expect(pickFromHash(sample, ['node', 'missing'])).toBeNull();
    expect(mapHashFor({ kind: 'node', id: 'model' })).toBe('#/node/model');
    expect(mapHashFor({ kind: 'edge', id: edgeKey('model', 'splane') })).toBe('#/edge/model__splane');
    expect(mapHashFor(null)).toBe('#/');
  });
});

describe('typed reference builders (fixture graph)', () => {
  it('node: path from the central question, short answer as context, #/node link', () => {
    const n = sample.maps[0].nodes[1];
    const text = nodeReference(sample, n, 'chain');
    expect(text).toContain('[study-tools] Control systems > How do we describe a plant without re-solving its ODE?');
    expect(text).toContain('Path: How do we make a system do what we command? > How do we describe a plant without re-solving its ODE?');
    expect(text).toContain('Viewing: node panel');
    expect(text).toContain('Link: #/node/model');
    expect(text).toContain('Context: For a linear time-invariant plant, G(s) = Y(s)/U(s)');
    expect(text).not.toMatch(/<b>/);
  });

  it('edge: names both ends and uses the question + idea as context', () => {
    const e = sample.maps[0].edges[1];
    const [from, to] = [sample.maps[0].nodes[1], sample.maps[0].nodes[2]];
    const text = edgeReference(sample, e, from, to, 'chain');
    expect(text).toContain('Viewing: edge from "How do we describe a plant without re-solving its ODE?" to "What is a pole or a zero, physically?"');
    expect(text).toContain('Link: #/edge/model__splane');
    expect(text).toContain('What do the poles mean?');
    expect(text).toContain('Each pole is a mode ept.');
  });

  it('dive: uses the chain of questions and the linked node\'s short answer', () => {
    const text = diveReference(sample, sample.dives[0]);
    expect(text).toContain('Viewing: deep dive');
    expect(text).toContain('Link: #/dive/model');
    expect(text).toContain('Path: How do we make a system do what we command? > How do we describe a plant without re-solving its ODE?');
    expect(text).toContain('Context: For a linear time-invariant plant');
  });

  it('figure: includes current slider values in the viewing line', () => {
    const text = figureRefWithControls(sample, sample.figures[0], { K: 2, zeta: 0.5 }, 'K=2&zeta=0.5', 'deep dive');
    expect(text).toContain("Viewing: deep dive, figure 'Step response of the cart' (K=2, zeta=0.5)");
    expect(text).toContain('Context: Overshoot grows as damping drops.');
    expect(text).toContain('Link: #/figure/step?K=2&zeta=0.5');
  });

  it('quiz: names the question id and strips markup from the prompt', () => {
    const text = quizReference(sample, sample.quiz[0]);
    expect(text).toContain('Viewing: quiz question q-model-1');
    expect(text).toContain('Link: #/quiz?qid=q-model-1');
    expect(text).toContain('Context: What does G(s) equal at rest?');
    expect(pathForDive(sample, sample.dives[0])[1]).toMatch(/describe a plant/);
    expect(pathLabels(sample, 'splane')).toEqual([
      'How do we make a system do what we command?',
      'How do we describe a plant without re-solving its ODE?',
      'What is a pole or a zero, physically?',
    ]);
  });
});

describe('control-systems running example (real content)', () => {
  const { content } = loadApp(path.join(repoRoot, 'apps', 'control-systems'));
  const model = content.maps[0].nodes.find((n: MapNode) => n.id === 'MODEL')!;

  it('builds a real node reference with the running example in context', () => {
    const text = nodeReference(content, model, content.maps[0].id);
    expect(text.startsWith(`[study-tools] ${content.subject.title} > `)).toBe(true);
    expect(text).toContain('Viewing: node panel');
    expect(text).toContain('Link: #/node/MODEL');
    expect(text).toMatch(/Path: .+/);
    expect(text).toMatch(/Context: .+/);
    expect(text.split('\n').length).toBeGreaterThanOrEqual(4);
    expect(text.split('\n').length).toBeLessThanOrEqual(6);
  });
});

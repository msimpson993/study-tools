import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { loadApp, listApps, repoRoot, ContentError } from '../src';

/** quiz.yaml `figure:` (schema + build validation + pass-through). Works on a temp copy of a shipped app. */
function copyApp(app: string): string {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'study-qf-')), target = path.join(dst, 'apps', app);
  fs.cpSync(path.join(repoRoot, 'apps', app), target, { recursive: true, filter: (s) => !s.includes('node_modules') });
  for (const other of listApps()) if (other !== app) fs.cpSync(path.join(repoRoot, 'apps', other), path.join(dst, 'apps', other), { recursive: true, filter: (s) => !s.includes('node_modules') }); // sibling apps for cross-app link checks
  return target;
}
const edit = (file: string, f: (y: any) => void) => { const y = YAML.parse(fs.readFileSync(file, 'utf8')); f(y); fs.writeFileSync(file, YAML.stringify(y)); };
const errorsOf = (dir: string): string => { try { loadApp(dir); return ''; } catch (e) { expect(e).toBeInstanceOf(ContentError); return (e as Error).message; } };
const APP = 'transforms';
const good = { id: 'scope1', params: { Kp: 2, Ki: 3.5, label: 'p2', on: true }, alt: 'Step response overshooting to about 1.38.', caption: 'p2, Kp = 2' };

describe('quiz figure field', () => {
  it('passes through to the built content, and questions without one are unchanged', () => {
    const dir = copyApp(APP); edit(path.join(dir, 'content/quiz.yaml'), (y) => { y[0].figure = good; });
    const { content } = loadApp(dir);
    expect(content.quiz[0].figure).toEqual(good); expect(content.quiz[1].figure).toBeUndefined();
    expect(loadApp(path.join(repoRoot, 'apps', APP)).content.quiz.every((q) => q.figure === undefined)).toBe(true);
  });
  it.each([
    ['missing alt', { id: 'a', params: {} }, /alt/],
    ['too-short alt', { id: 'a', alt: 'plot' }, /alt|minLength/],
    ['unknown key', { id: 'a', alt: 'A long enough alt text', width: 3 }, /additional|width/i],
    ['non-scalar param', { id: 'a', alt: 'A long enough alt text', params: { p: [1, 2] } }, /params|type/],
    ['bad id', { id: 'a b', alt: 'A long enough alt text' }, /pattern|id/],
  ])('rejects %s', (_n, fig, re) => {
    const dir = copyApp(APP); edit(path.join(dir, 'content/quiz.yaml'), (y) => { y[0].figure = fig; });
    expect(errorsOf(dir)).toMatch(re);
  });
  it('subject.yaml quizFigures, when present, must list every figure id used', () => {
    const dir = copyApp(APP); edit(path.join(dir, 'content/quiz.yaml'), (y) => { y[0].figure = good; });
    edit(path.join(dir, 'subject.yaml'), (y) => { y.quizFigures = ['other']; });
    expect(errorsOf(dir)).toMatch(/figure "scope1" is not in subject.yaml quizFigures \[other\]/);
    edit(path.join(dir, 'subject.yaml'), (y) => { y.quizFigures = ['other', 'scope1']; });
    expect(errorsOf(dir)).toBe('');
  });
  it('without a quizFigures list any id is accepted at build time (checked at runtime with a visible fallback)', () => {
    const dir = copyApp(APP); edit(path.join(dir, 'content/quiz.yaml'), (y) => { y[0].figure = { ...good, id: 'whatever' }; });
    expect(errorsOf(dir)).toBe('');
  });
});

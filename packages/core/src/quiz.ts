import { h, clear } from './dom';
import type { AppContent, Question } from './types';
import type { Progress } from './progress';

export interface QuizOpts {
  tags?: string[];
  title?: string;
  openDive(id: string): void;
  back(): void;
}

export function tagLabel(content: AppContent, tag: string): string {
  const d = content.dives.find((x) => x.id === tag);
  if (d) return d.title;
  for (const m of content.maps) { const n = m.nodes.find((x) => (x.quizTag ?? x.dive ?? x.id) === tag); if (n) return n.label; }
  return tag;
}

function shuffled<T>(a: T[]): T[] { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

/** Quiz engine: multiple choice with instant feedback, recall flashcards (tap to flip), topic filter, missed-only, shuffle. */
export function mountQuiz(host: HTMLElement, content: AppContent, progress: Progress, opts: QuizOpts): () => void {
  const root = h('div', { class: 'quiz', dataset: { testid: 'quiz' } });
  host.append(root);
  let flash = false;
  let missedOnly = false;
  let shuffle = false;
  let activeTags: Set<string> | null = opts.tags && opts.tags.length ? new Set(opts.tags) : null;
  let list: Question[] = [];
  let idx = 0;
  let chosen: number | null = null;
  let revealed = false;
  let graded: boolean | null = null;
  let session: { ok: number; bad: number } = { ok: 0, bad: 0 };
  const allTags = [...new Set(content.quiz.flatMap((q) => q.tags))];

  function rebuild() {
    let qs = content.quiz.filter((q) => !activeTags || q.tags.some((t) => activeTags!.has(t)));
    if (missedOnly) qs = qs.filter((q) => progress.answer(q.id) === 'm');
    list = shuffle ? shuffled(qs) : qs;
    idx = 0; chosen = null; revealed = false; graded = null; session = { ok: 0, bad: 0 };
  }

  function grade(q: Question, ok: boolean) {
    graded = ok; progress.setAnswer(q.id, ok);
    if (ok) session.ok++; else session.bad++;
  }

  function next() { idx++; chosen = null; revealed = false; graded = null; render(); }

  function render() {
    clear(root);
    const title = opts.title ?? 'Self-check';
    root.append(h('div', { class: 'row' },
      h('button', { class: 'tbtn', onclick: opts.back }, '← Back'),
      h('b', null, title),
      h('span', { style: 'flex:1' }),
      h('div', { class: 'st-seg', style: 'flex:0 0 auto;min-width:200px' },
        h('button', { class: flash ? '' : 'on', dataset: { mode: 'quiz' }, onclick: () => { flash = false; rebuild(); render(); } }, 'Quiz'),
        h('button', { class: flash ? 'on' : '', dataset: { mode: 'flash' }, onclick: () => { flash = true; rebuild(); render(); } }, 'Flashcards'))));
    // filters
    const chips = h('div', { class: 'chips' });
    chips.append(h('button', { class: `chip${!activeTags ? ' on' : ''}`, onclick: () => { activeTags = null; rebuild(); render(); } }, 'All topics'));
    for (const t of allTags) chips.append(h('button', { class: `chip${activeTags?.has(t) ? ' on' : ''}`, dataset: { tag: t }, onclick: () => { const n = new Set(activeTags ?? []); if (n.has(t)) n.delete(t); else n.add(t); activeTags = n.size ? n : null; rebuild(); render(); } }, tagLabel(content, t)));
    root.append(h('details', { class: 'fold', open: opts.tags && opts.tags.length ? undefined : undefined }, h('summary', null, 'Filter topics'), h('div', null, chips)));
    root.append(h('div', { class: 'row' },
      h('button', { class: `chip${missedOnly ? ' on' : ''}`, dataset: { testid: 'missed-only' }, onclick: () => { missedOnly = !missedOnly; rebuild(); render(); } }, 'Missed only'),
      h('button', { class: `chip${shuffle ? ' on' : ''}`, onclick: () => { shuffle = !shuffle; rebuild(); render(); } }, 'Shuffle')));
    if (!list.length) {
      root.append(h('div', { class: 'qcard' }, missedOnly ? 'Nothing missed in this selection. 🎉' : 'No questions are tagged to this selection yet. Pick another topic, or add questions to quiz.yaml.'));
      return;
    }
    if (idx >= list.length) {
      root.append(h('div', { class: 'qcard', dataset: { testid: 'quiz-done' } }, h('h3', null, 'Done'), h('p', null, `${session.ok} right, ${session.bad} missed out of ${list.length}.`),
        h('div', { class: 'row' }, h('button', { class: 'tbtn on', onclick: () => { rebuild(); render(); } }, 'Again'),
          session.bad ? h('button', { class: 'tbtn', onclick: () => { missedOnly = true; rebuild(); render(); } }, 'Missed only') : null,
          h('button', { class: 'tbtn', onclick: opts.back }, 'Back'))));
      return;
    }
    const q = list[idx];
    root.append(h('div', { class: 'prog' }, h('i', { style: `width:${(idx / list.length) * 100}%` })), h('div', { class: 'cm-sum' }, `Question ${idx + 1} of ${list.length} · ${q.kind}`));
    const card = h('div', { class: 'qcard', dataset: { testid: 'qcard', qid: q.id } });
    card.append(h('div', { class: 'qtext', html: q.q }));
    const isMcq = q.kind !== 'recall' && !!q.choices;
    if (flash || !isMcq) {
      // flashcard / recall: tap to flip, then self-grade
      const face = h('div', { class: 'flip', tabindex: 0, role: 'button', 'aria-label': 'Flip card', dataset: { testid: 'flip' }, onclick: () => { revealed = !revealed; render(); }, onkeydown: (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); revealed = !revealed; render(); } } });
      if (revealed) {
        const ans = isMcq ? `<p><b>${String.fromCharCode(65 + q.answer!)}.</b> ${q.choices![q.answer!]}</p>${q.why ?? ''}` : (q.a ?? '');
        face.append(h('div', { class: 'why', html: ans }));
      } else face.append(h('div', { class: 'cm-sum' }, 'Tap or press Space to flip'));
      card.append(face);
      if (revealed) card.append(h('div', { class: 'row' },
        h('button', { class: 'tbtn on', dataset: { testid: 'got-it' }, onclick: () => { grade(q, true); next(); } }, 'I got it'),
        h('button', { class: 'tbtn', dataset: { testid: 'missed-it' }, onclick: () => { grade(q, false); next(); } }, 'Missed it')));
    } else {
      q.choices!.forEach((c, i) => {
        const cls = chosen === null ? '' : i === q.answer ? ' right' : i === chosen ? ' wrong' : '';
        card.append(h('button', { class: `choice${cls}`, disabled: chosen !== null, dataset: { choice: String(i) }, onclick: () => { chosen = i; grade(q, i === q.answer); render(); } }, h('b', null, String.fromCharCode(65 + i)), h('span', { html: c })));
      });
      if (chosen !== null) {
        const wrong = chosen !== q.answer;
        card.append(h('div', { class: 'why', dataset: { testid: 'why' }, html: `<b>${wrong ? 'Not quite.' : 'Right.'}</b> ${q.why ?? ''}` }));
        const link = q.tags.find((t) => content.dives.some((d) => d.id === t));
        card.append(h('div', { class: 'row' },
          wrong && link ? h('button', { class: 'tbtn', dataset: { testid: 'review-link' }, onclick: () => opts.openDive(link) }, `Review: ${tagLabel(content, link)}`) : null,
          h('button', { class: 'tbtn on', dataset: { testid: 'next' }, onclick: next }, idx + 1 >= list.length ? 'Finish' : 'Next')));
      }
    }
    root.append(card);
  }

  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest?.('input,select,textarea')) return;
    const q = list[idx];
    if (!q) return;
    const isMcq = q.kind !== 'recall' && !!q.choices;
    if (!flash && isMcq) {
      const k = e.key.toLowerCase();
      const i = /^[1-6]$/.test(k) ? +k - 1 : /^[a-f]$/.test(k) ? k.charCodeAt(0) - 97 : -1;
      if (chosen === null && i >= 0 && i < q.choices!.length) { chosen = i; grade(q, i === q.answer); render(); }
      else if (chosen !== null && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); next(); }
    } else if (e.key === ' ' && !revealed) { e.preventDefault(); revealed = true; render(); }
  };
  document.addEventListener('keydown', onKey);
  rebuild();
  render();
  return () => { document.removeEventListener('keydown', onKey); root.remove(); };
}

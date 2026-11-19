import { h } from './dom';
import { choiceOrder } from './choiceorder';
import type { Question } from './types';
import type { Progress } from './progress';

/**
 * One inline question (map pop-up "intuition question", dive "Check yourself"). Tap a choice to see right/wrong and the why;
 * recall questions get a "Show answer" button. The pick survives re-renders (kept per question id for this page session), and
 * the result is saved to progress like an answer in the quiz.
 */
const picked = new Map<string, number>();
const shown = new Set<string>();
const orders = new Map<string, number[]>();

export function miniCheck(q: Question, progress?: Progress, onDone?: () => void): HTMLElement {
  const box = h('div', { class: 'mini-q', dataset: { testid: 'mini-q', qid: q.id } });
  const draw = () => {
    box.replaceChildren(h('div', { class: 'qtext', html: q.q }));
    const isMcq = q.kind !== 'recall' && !!q.choices;
    if (!isMcq) {
      if (shown.has(q.id)) box.append(h('div', { class: 'why', html: q.a ?? '' }));
      else box.append(h('button', { class: 'tbtn', dataset: { testid: 'mini-show' }, onclick: () => { shown.add(q.id); draw(); onDone?.(); } }, 'Show answer'));
      return;
    }
    let ord = orders.get(q.id); if (!ord) { ord = choiceOrder(q); orders.set(q.id, ord); }
    const chosen = picked.get(q.id);
    ord.forEach((i, pos) => {
      const cls = chosen === undefined ? '' : i === q.answer ? ' right' : i === chosen ? ' wrong' : '';
      box.append(h('button', { class: `choice${cls}`, disabled: chosen !== undefined, dataset: { choice: String(i) }, onclick: () => { picked.set(q.id, i); draw(); progress?.setAnswer(q.id, i === q.answer); onDone?.(); } }, h('b', null, String.fromCharCode(65 + pos)), h('span', { html: q.choices![i] })));
    });
    if (chosen !== undefined) box.append(h('div', { class: 'why', dataset: { testid: 'why' }, html: `<b>${chosen === q.answer ? 'Right.' : 'Not quite.'}</b> ${q.why ?? ''}` }));
  };
  draw();
  return box;
}

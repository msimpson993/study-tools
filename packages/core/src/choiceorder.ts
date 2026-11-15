import type { Question } from './types';

/**
 * Display order of a multiple-choice question's options.
 *
 * Authors list the correct answer first (or anywhere); the quiz engine shuffles what the learner sees so the
 * answer is not always in the same slot. `order[pos]` is the authored index of the choice shown at display
 * position `pos`; the correct answer moves with its text, so feedback and grading always use authored indices.
 *
 * Choices that point at the other choices ("Both", "Neither", "None of them", "All of the above", "A and B",
 * "Option C", …) only make sense after the options they refer to, so those are pinned after the shuffled
 * ones in their authored order. A question can opt out entirely with `fixedOrder: true` (quiz.yaml).
 */

/** bare references to the other options: the whole choice is "Both", "Neither", "None of them", "All of the above", "A and B", … */
const BARE_REF = /^(?:(?:both|neither|none|all|any|either)(?:\s+of)?(?:\s+(?:the|these|those|them|three|four|above|options?|answers?|choices?))*|(?:both\s+)?(?:options?\s+|choices?\s+|answers?\s+)?\(?[A-F]\)?\s*(?:,|and|&|or)\s*\(?[A-F]\)?(?:\s*(?:,|and|&|or)\s*\(?[A-F]\)?)*)[\s.!]*$/i;
/** explicit pointers anywhere in the text: "all of the above", "see option B", "choices 1 and 2", "(a)" */
const EXPLICIT_REF = /\b(?:above|below|previous|preceding)\s+(?:answers?|choices?|options?|statements?)\b|\b(?:all|none|both|neither|any|either) of the (?:above|below|previous|others|other)\b|\b(?:options?|choices?|answers?|statements?)\s+(?:[A-F1-6]|\([A-Fa-f]\))\b/i;

function plain(html: string): string { return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/\s+/g, ' ').trim(); }

/** true when this choice only makes sense relative to the other choices */
export function choiceReferencesOthers(choice: string): boolean {
  const t = plain(choice);
  return BARE_REF.test(t) || EXPLICIT_REF.test(t);
}

/** authored indices that must stay after the shuffled choices (they refer to the others) */
export function pinnedChoices(q: Pick<Question, 'choices'>): number[] {
  return (q.choices ?? []).flatMap((c, i) => (choiceReferencesOthers(c) ? [i] : []));
}

export function isFixedOrder(q: Pick<Question, 'choices' | 'fixedOrder'>): boolean {
  return !!q.fixedOrder || (q.choices ?? []).length < 2;
}

/** Fisher-Yates with an injectable rng (default Math.random) */
export function shuffleInPlace<T>(a: T[], rng: () => number = Math.random): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** order[pos] = authored index shown at display position pos */
export function choiceOrder(q: Pick<Question, 'choices' | 'fixedOrder'>, rng: () => number = Math.random): number[] {
  const n = (q.choices ?? []).length;
  const ident = Array.from({ length: n }, (_, i) => i);
  if (isFixedOrder(q)) return ident;
  const pinned = pinnedChoices(q);
  const free = ident.filter((i) => !pinned.includes(i));
  return [...shuffleInPlace(free, rng), ...pinned];
}

/** The pop-up word rule (every course): a SOFT cap of about 400 words of MAIN BODY per box and per line pop-up.
 * Main body = what the pop-up teaches: for a box its answer, "In rough words" and the running-example row
 * (a free-form box: short answer, detail and its callouts); for a line its "why ask it here" and its short answer.
 * Not counted: the restated question, Next-question / Look-across lists, equations and their keys, figure captions,
 * figure text, sound notes, buttons and navigation. Go over only when the idea needs it to be coherent; never pad.
 * The guard prints everything past SOFT_CAP and fails only past HARD_CAP. */
export const SOFT_CAP = 400;
export const HARD_CAP = 600;
export const words = (h: string) => h.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
interface BoxLike { short?: string; detail?: string; addsToExample?: string; accountsFor?: string; why?: string; recognize?: string; trap?: string; predict?: string; pop?: { rough?: string; example?: string } }
interface LineLike { why?: string; idea?: string }
export const boxBodyWords = (n: BoxLike) => n.pop
  ? words(n.short ?? '') + words(n.pop.rough ?? '') + words(n.pop.example ?? n.addsToExample ?? '')
  : [n.short, n.detail, n.addsToExample, n.accountsFor, n.why, n.recognize, n.trap, n.predict].reduce((a, s) => a + words(s ?? ''), 0);
export const lineBodyWords = (e: LineLike) => words(e.why ?? '') + words(e.idea ?? '');
/** prints the over-soft-cap list (a warning, not a failure) and returns the entries past the hard cap */
export function capReport(label: string, counts: Record<string, number>): string[] {
  const over = Object.entries(counts).filter(([, n]) => n > SOFT_CAP).sort((a, b) => b[1] - a[1]);
  if (over.length) console.warn(`[word cap] ${label}: ${over.length} pop-up(s) over the ~${SOFT_CAP}-word soft cap (main body):\n` + over.map(([k, n]) => `  ${k}: ${n}`).join('\n'));
  return over.filter(([, n]) => n > HARD_CAP).map(([k, n]) => `${k}: ${n} words (hard limit ${HARD_CAP})`);
}

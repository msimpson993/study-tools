import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';

export const CALLOUT_KINDS = ['short', 'why', 'recognize', 'trap', 'predict', 'note'] as const;
const LEADS: Record<string, string> = {
  short: 'Short answer', why: 'Why it matters', recognize: 'Recognize', trap: 'Trap', predict: 'Predict', note: 'Note',
};

export class MathErrors { list: string[] = []; figureRefs: { id: string; where: string }[] = [] }

/** Create a renderer. KaTeX errors are collected (not swallowed) so the build can fail on them. */
export function createMarkdown(errors: MathErrors, where: () => string) {
  const engine = {
    renderToString(tex: string, opts: Record<string, unknown>) {
      try {
        return katex.renderToString(tex, { ...opts, throwOnError: true, strict: 'ignore' });
      } catch (e) {
        errors.list.push(`${where()}: KaTeX error in "${tex.slice(0, 60)}": ${(e as Error).message}`);
        return `<code class="math-error">${tex}</code>`;
      }
    },
  };
  const md = new MarkdownIt({ html: true, linkify: false, typographer: false });
  md.use(texmath, { engine, delimiters: 'dollars', katexOptions: { displayMode: false } });
  const esc = md.utils.escapeHtml;
  const defaultFence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const t = tokens[idx];
    const info = t.info.trim();
    if (info === 'eq') {
      return `<div class="st-eq">${esc(t.content.trimEnd())}</div>\n`;
    }
    if (info.startsWith('figure:')) {
      const id = info.slice('figure:'.length).trim();
      errors.figureRefs.push({ id, where: where() });
      return `<div class="viz-slot" data-figure="${esc(id)}"></div>\n`;
    }
    if (info.startsWith('callout:')) {
      const [head, ...rest] = info.slice('callout:'.length).split(/\s+/);
      if (!(CALLOUT_KINDS as readonly string[]).includes(head)) {
        errors.list.push(`${where()}: unknown callout kind "${head}" (use ${CALLOUT_KINDS.join(', ')})`);
      }
      const lead = rest.length ? rest.join(' ') : LEADS[head] ?? head;
      return `<aside class="callout c-${esc(head)}"><b class="lead">${esc(lead)}</b><div class="cb">${md.render(t.content)}</div></aside>\n`;
    }
    return defaultFence(tokens, idx, options, env, self);
  };
  return md;
}

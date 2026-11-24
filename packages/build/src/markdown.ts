import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';

export const CALLOUT_KINDS = ['short', 'why', 'recognize', 'trap', 'predict', 'note', 'derivation'] as const;
const LEADS: Record<string, string> = {
  short: 'Short answer', why: 'Why it matters', recognize: 'Recognize', trap: 'Trap', predict: 'Predict', note: 'Note', derivation: 'Full derivation',
};

export class MathErrors { list: string[] = []; figureRefs: { id: string; where: string; preset?: string; params?: Record<string, string> }[] = []; pictureRefs: { id: string; where: string }[] = [] }

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
      const tokens = info.slice('figure:'.length).trim().split(/\s+/).filter(Boolean);
      const id = tokens[0] ?? '';
      const params: Record<string, string> = {};
      for (const tok of tokens.slice(1)) {
        const i = tok.indexOf('=');
        if (i > 0) params[tok.slice(0, i)] = tok.slice(i + 1);
      }
      const preset = params.preset;
      const panels = params.panels;
      errors.figureRefs.push({ id, where: where(), ...(preset ? { preset } : {}), params });
      // optional body `lookFor: …` gives this embed its own look-for line (a figure reused by another dive)
      const look = /^lookFor:\s*([\s\S]+)$/.exec(t.content.trim())?.[1]?.trim();
      const extra = Object.entries(params).filter(([k]) => k !== 'preset' && k !== 'panels');
      const paramAttr = extra.length ? ` data-params="${esc(JSON.stringify(Object.fromEntries(extra)))}"` : '';
      const panelsAttr = panels ? ` data-panels="${esc(panels)}"` : '';
      return `<div class="viz-slot" data-figure="${esc(id)}"${preset ? ` data-preset="${esc(preset)}"` : ''}${panelsAttr}${paramAttr}${look ? ` data-look="${esc(look)}"` : ''}></div>\n`;
    }
    if (info.startsWith('picture:')) { // a static captioned picture from the quiz-figure registry: ```picture:<id> Caption text```, body = alt text
      const [id, ...cap] = info.slice('picture:'.length).trim().split(/\s+/);
      errors.pictureRefs.push({ id, where: where() });
      if (!cap.length) errors.list.push(`${where()}: picture:${id} needs a caption after the id`);
      return `<div class="pic-slot" data-pic="${esc(id)}" data-cap="${esc(cap.join(' '))}" data-alt="${esc(t.content.trim())}"></div>\n`;
    }
    if (info.startsWith('callout:')) {
      const [head, ...rest] = info.slice('callout:'.length).split(/\s+/);
      if (!(CALLOUT_KINDS as readonly string[]).includes(head)) {
        errors.list.push(`${where()}: unknown callout kind "${head}" (use ${CALLOUT_KINDS.join(', ')})`);
      }
      const lead = rest.length ? rest.join(' ') : LEADS[head] ?? head;
      if (head === 'derivation') return `<details class="fold derivation" data-testid="derivation"><summary>${esc(lead)}</summary><div class="cb">${md.render(t.content)}</div></details>\n`;
      return `<aside class="callout c-${esc(head)}"><b class="lead">${esc(lead)}</b><div class="cb">${md.render(t.content)}</div></aside>\n`;
    }
    return defaultFence(tokens, idx, options, env, self);
  };
  return md;
}

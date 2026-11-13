import { h } from './dom';
import { fitCanvas } from './plot';
import { col, rangeFrame, graphAxes, curve, tline, text, type V2 } from './viz';
import type { QuizFigureRef } from './types';

/**
 * Small, non-interactive plots inside quiz questions (the legacy page's "scope" plots). A question names a renderer and passes
 * FIXED parameters in quiz.yaml:
 *
 *     figure: { id: overshoot, params: { Kp: 2, Ki: 3.5 }, alt: "Step response overshooting to about 1.38, then settling at 1." }
 *
 * and the app registers the renderer: `mountApp(content, { quizFigures: { overshoot: scopeFigure((p) => ({ … })) } })`.
 * `alt` is required (it labels the canvas for screen readers). An id with no renderer shows a visible fallback with the alt text
 * instead of throwing, so a question never disappears. If subject.yaml lists `quizFigures: [ids]`, the build checks the ids.
 */
export type QuizFigureParams = NonNullable<QuizFigureRef['params']>;
export interface QuizFigureDef {
  /** paint into a w×h CSS-pixel canvas; must be deterministic in `params` */ draw(g: CanvasRenderingContext2D, w: number, h: number, params: QuizFigureParams): void;
  /** width / height (default 360/176, the legacy scope) */ aspect?: number; /** CSS max width in px (default 440) */ maxWidth?: number;
}
export type QuizFigureRegistry = Record<string, QuizFigureDef>;

export interface ScopeSeries { t: ArrayLike<number>; y: ArrayLike<number>; /** CSS colour; default cycles through the palette */ color?: string; dash?: number[] }
export interface ScopeSpec {
  xr: V2; yr: V2; xLabel?: string; yLabel: string;
  /** dashed horizontal reference lines (e.g. the target 1) */ hl?: number[];
  series: ScopeSeries[]; legend?: { text: string; color: string }[];
}
/**
 * Build a scope-style quiz figure (time on x, one or more traces, optional reference lines and legend) from a function of the
 * question's params. The spec is computed once per distinct params and cached, so resizes and theme switches only redraw.
 */
export function scopeFigure(spec: (params: QuizFigureParams) => ScopeSpec): QuizFigureDef {
  const cache = new Map<string, ScopeSpec>();
  const get = (p: QuizFigureParams) => { const k = JSON.stringify(p); let s = cache.get(k); if (!s) { s = spec(p); cache.set(k, s); } return s; };
  return {
    draw(g, w, h, params) {
      const s = get(params), pal = [col.a(), col.b(), col.c(), col.d()];
      g.clearRect(0, 0, w, h);
      const f = rangeFrame(w, h, s.xr, s.yr, 42, 10, 10, 34);
      graphAxes(g, f, s.xr, s.yr, s.xLabel ?? 'time (s)', s.yLabel);
      for (const y of s.hl ?? []) tline(g, f, [s.xr[0], y], [s.xr[1], y], col.muted(), 1.2, [5, 4]);
      s.series.forEach((sr, i) => {
        const n = sr.t.length, step = Math.max(1, Math.floor(n / 600)), xs: number[] = [], ys: number[] = [];
        for (let k = 0; k < n; k += step) { xs.push(sr.t[k]); ys.push(sr.y[k]); }
        curve(g, f, xs, ys, sr.color ?? pal[i % pal.length], 2, sr.dash ?? []);
      });
      (s.legend ?? []).forEach((l, i) => text(g, l.text, f.box.l + 8, f.box.t + 12 + i * 13, l.color, 'left', 10.5));
    },
  };
}

/** Mount one question figure; returns the element and a cleanup. Unknown ids render a visible fallback. */
export function mountQuizFigure(ref: QuizFigureRef, registry: QuizFigureRegistry | undefined): { el: HTMLElement; destroy(): void } {
  const def = registry?.[ref.id];
  const cap = ref.caption ? h('figcaption', { class: 'qfig-cap' }, ref.caption) : null;
  if (!def) return { el: h('figure', { class: 'qfigure missing', dataset: { testid: 'quiz-figure-missing', figure: ref.id } }, h('div', { class: 'qfig-miss' }, `[figure “${ref.id}” is not available in this build] `, ref.alt), cap), destroy() {} };
  const cv = h('canvas', { role: 'img', 'aria-label': ref.alt, dataset: { testid: 'quiz-figure', figure: ref.id } });
  cv.style.cssText = `display:block;width:100%;max-width:${def.maxWidth ?? 440}px;aspect-ratio:${def.aspect ?? 360 / 176};margin:.1rem auto .5rem`;
  const el = h('figure', { class: 'qfigure', dataset: { figure: ref.id } }, cv, cap);
  const draw = () => { const f = fitCanvas(cv); def.draw(f.g, f.w, f.h, ref.params ?? {}); };
  const ro = new ResizeObserver(draw); ro.observe(cv);
  window.addEventListener('study-theme', draw);
  requestAnimationFrame(draw);
  return { el, destroy() { ro.disconnect(); window.removeEventListener('study-theme', draw); } };
}

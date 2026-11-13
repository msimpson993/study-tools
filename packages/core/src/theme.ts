import { storeGet, storeSet } from './store';
import katexCss from 'virtual:katex-css';
import themeCss from './styles/theme.css?inline';
import coreCss from './styles/core.css?inline';

export type Theme = 'dark' | 'light';
const KEY = 'study-tools:theme';

/** Inject core styles + KaTeX CSS and apply the persisted theme (true-black dark is the default). */
export function initTheme(): void {
  for (const css of [themeCss, katexCss, coreCss]) {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.append(st);
  }
  setTheme(storeGet<Theme>(KEY, 'dark'));
}
export function currentTheme(): Theme { return (document.documentElement.dataset.theme as Theme) || 'dark'; }
export function setTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
  storeSet(KEY, t);
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', t === 'dark' ? '#000000' : '#fafaf7');
  window.dispatchEvent(new CustomEvent('study-theme', { detail: t }));
}
export function toggleTheme(): Theme { const n: Theme = currentTheme() === 'dark' ? 'light' : 'dark'; setTheme(n); return n; }

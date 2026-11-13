/** Build every app to a single-file HTML (dist/<app>/index.html) and generate the hub (dist/index.html). */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import { parse } from 'yaml';
import { listApps, repoRoot } from '../packages/build/src';

const only = process.argv.slice(2);
const apps = listApps().filter((a) => !only.length || only.includes(a));

const t0 = Date.now();
for (const app of apps) {
  console.log(`\n▶ building ${app}`);
  await build({ configFile: path.join(repoRoot, 'apps', app, 'vite.config.ts'), logLevel: 'warn' });
  const f = path.join(repoRoot, 'dist', app, 'index.html');
  const kb = Math.round(fs.statSync(f).size / 1024);
  const html = fs.readFileSync(f, 'utf8');
  if (/<script[^>]+src=|<link[^>]+href="(?!data:)/.test(html)) throw new Error(`${app}: output is not self-contained (external script/link found)`);
  console.log(`  ✓ dist/${app}/index.html (${kb} KB, self-contained)`);
}

// ---------- hub ----------
const cards = listApps().map((id) => {
  const s = parse(fs.readFileSync(path.join(repoRoot, 'apps', id, 'subject.yaml'), 'utf8'));
  return { id, order: s.hub?.order ?? 99, title: s.title as string, q: s.centralQuestion as string, blurb: s.blurb as string, archetype: s.archetype as string };
}).sort((a, b) => a.order - b.order);
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const theme = fs.readFileSync(path.join(repoRoot, 'packages/core/src/styles/theme.css'), 'utf8');
const hub = `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#000000"><link rel="icon" href="data:,"><title>Study tools</title>
<style>${theme}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:980px;margin:0 auto;padding:1.4rem 1rem 3rem}
h1{margin:.2rem 0 .2rem;font-size:1.5rem}.sub{color:var(--muted);margin:0 0 1.2rem}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:.9rem}
a.card{display:block;background:var(--panel);border:1px solid var(--border);border-left:5px solid var(--accent);border-radius:14px;padding:.9rem 1rem;text-decoration:none;color:var(--text)}
a.card:hover,a.card:focus-visible{border-color:var(--accent);outline:none}
a.card h2{margin:0 0 .3rem;font-size:1.1rem}a.card .q{font-weight:600;font-size:.92rem;margin:.1rem 0 .4rem}a.card p{margin:.2rem 0;color:var(--muted);font-size:.88rem}
.tag{display:inline-block;border:1px solid var(--border);border-radius:99px;padding:0 .5rem;font-size:.7rem;color:var(--muted);margin-top:.3rem}
button{border:1px solid var(--border);background:var(--panel);color:var(--text);border-radius:9px;padding:.3rem .6rem;cursor:pointer;float:right}
footer{margin-top:2rem;color:var(--muted);font-size:.8rem}
</style></head><body><main>
<button id="th" aria-label="Toggle light/dark theme">☾</button>
<h1>Study tools</h1>
<p class="sub">Map-first interactive study pages. Each page opens on a question map; tap any box or line to go deeper. Every page is one self-contained file that also works offline.</p>
<div class="cards">
${cards.map((c) => `<a class="card" href="./${c.id}/index.html" data-app="${c.id}"><h2>${esc(c.title)}</h2><div class="q">${esc(c.q)}</div><p>${esc(c.blurb)}</p><span class="tag">${c.archetype === 'overview' ? 'overview board' : 'guide'} · opens on the question map</span></a>`).join('\n')}
</div>
<footer>Source: <a href="https://github.com/msimpson993/study-tools" style="color:var(--accent)">github.com/msimpson993/study-tools</a></footer>
</main>
<script>
(function(){var k='study-tools:theme',t;try{t=JSON.parse(localStorage.getItem(k)||'"dark"')}catch(e){t='dark'}
function ap(){document.documentElement.dataset.theme=t;document.getElementById('th').textContent=t==='dark'?'☾':'☀';document.querySelector('meta[name=theme-color]').content=t==='dark'?'#000000':'#fafaf7'}
ap();document.getElementById('th').onclick=function(){t=t==='dark'?'light':'dark';try{localStorage.setItem(k,JSON.stringify(t))}catch(e){}ap()}})();
</script></body></html>`;
fs.mkdirSync(path.join(repoRoot, 'dist'), { recursive: true });
fs.writeFileSync(path.join(repoRoot, 'dist', 'index.html'), hub);
fs.writeFileSync(path.join(repoRoot, 'dist', '.nojekyll'), '');
console.log(`\n✓ hub: dist/index.html (${cards.length} pages) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

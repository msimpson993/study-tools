import { test, expect, type Page } from '@playwright/test';

/* The pop-up word rule (every course; see docs/design-principles.md and packages/build/test/wordcap.ts): a SOFT cap of
   about 400 words of MAIN BODY per box and per line pop-up, as the reader sees it. Main body = the elements core marks
   data-body (a box's answer; a free-form box's answer, detail and callouts; a line's "why ask it here", or its short answer
   when it has no why). The restated question, rough words, running-example row, Next-question / Look-across lists,
   equations, keys, figures, captions, sound notes, buttons and navigation do not count. Over ~400 is printed as a warning; only
   past 600 fails. */
export const SOFT_CAP = 400, HARD_CAP = 600;
const count = (page: Page) => page.evaluate(() => {
  const p = document.querySelector('[data-testid=map-panel]') as HTMLElement;
  let n = 0;
  for (const b of p.querySelectorAll<HTMLElement>('[data-body]')) {
    const c = b.cloneNode(true) as HTMLElement;
    c.querySelectorAll('.pop-figs,.pop-figcap,figure,canvas,svg,.st-eq,button').forEach((e) => e.remove());
    c.style.cssText = `position:absolute;left:-9999px;top:0;width:${p.clientWidth}px`; document.body.append(c);
    n += c.innerText.split(/\s+/).filter(Boolean).length; c.remove();
  }
  return n;
});

export async function popWords(page: Page, app = 'linear-systems') {
  await page.goto(`/${app}/index.html`);
  await page.waitForFunction(() => !!(window as any).__study);
  const maps: { id: string; nodes: string[] }[] = await page.evaluate(() => (window as any).__study.content.maps.map((m: any) => ({ id: m.id, nodes: m.nodes.map((n: any) => n.id) })));
  const res: Record<string, number> = {};
  for (const [mi, m] of maps.entries()) {
    if (mi > 0) await page.locator(`button[role=tab][data-map="${m.id}"]`).first().click();
    for (const id of m.nodes) {
      await page.locator(`[data-testid=map-node][data-node="${id}"]`).first().dispatchEvent('click');
      await page.waitForTimeout(50); res[`${m.id}/${id}`] = await count(page);
      await page.getByTestId('panel-close').click();
    }
    const keys: string[] = await page.locator('[data-testid=map-edge]').evaluateAll((els) => els.map((e) => e.getAttribute('data-edge')!));
    for (const k of keys) {
      await page.locator(`[data-testid=map-edge][data-edge="${k}"]`).first().dispatchEvent('click');
      await page.waitForTimeout(50); res[`${m.id}/line ${k}`] = await count(page);
      await page.getByTestId('panel-close').click();
    }
  }
  return res;
}

for (const app of ['linear-systems', 'control-systems']) {
  test(`${app}: box and line pop-ups keep to the soft word cap (~${SOFT_CAP} words of main body, as rendered; fails only past ${HARD_CAP})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const res = await popWords(page, app);
    expect(Object.keys(res).filter((k) => k.includes('line ')).length).toBeGreaterThan(50);
    expect(Object.keys(res).filter((k) => !k.includes('line ')).length).toBeGreaterThan(50);
    // every pop-up has a counted main body (the data-body marks are in place)
    expect(Object.entries(res).filter(([, n]) => n === 0).map(([k]) => k)).toEqual([]);
    if (process.env.SHOW_WORDS) console.log(JSON.stringify(res));
    const over = Object.entries(res).filter(([, n]) => n > SOFT_CAP).sort((a, b) => b[1] - a[1]);
    if (over.length) console.warn(`[word cap] ${app}: ${over.length} pop-up(s) over the ~${SOFT_CAP}-word soft cap (main body):\n` + over.map(([k, n]) => `  ${k}: ${n}`).join('\n'));
    test.info().annotations.push({ type: 'over soft cap', description: over.length ? over.map(([k, n]) => `${k}: ${n}`).join(', ') : 'none' });
    expect(over.filter(([, n]) => n > HARD_CAP).map(([k, n]) => `${k}: ${n}`)).toEqual([]);
  });
}

test(`sim-project: box and line pop-ups keep to the soft word cap (~${SOFT_CAP} words of main body, as rendered; fails only past ${HARD_CAP})`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const res = await popWords(page, 'sim-project');
  expect(Object.keys(res).filter((k) => k.includes('line ')).length).toBeGreaterThan(15);
  expect(Object.keys(res).filter((k) => !k.includes('line ')).length).toBeGreaterThan(15);
  const over = Object.entries(res).filter(([, n]) => n > HARD_CAP);
  expect(over, over.map(([k, n]) => `${k}: ${n}`).join(', ')).toEqual([]);
});

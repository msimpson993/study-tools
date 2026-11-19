import { test, expect, type Page } from '@playwright/test';

/* Word guard for linear-systems pop-ups: every box AND every line, on both maps (a box shows a longer Next-question
   list on the Full-detail map, so it is counted there too), at most 150 words of teaching text as the reader sees it
   (question, answer, rough words, equation, captions, sound notes, running example and the Next-question list;
   buttons, nav, the path chips, quick check, the header and the sound controls do not count). */
const count = (page: Page) => page.evaluate(() => {
  const p = document.querySelector('[data-testid=map-panel]') as HTMLElement, c = p.cloneNode(true) as HTMLElement;
  c.querySelectorAll('.chain-nav,.acts,.path,.pop-ask,.cm-head,button,.aud-bar,.aud-ctl,canvas,svg,.pop-end').forEach((e) => e.remove());
  c.style.cssText = `position:absolute;left:-9999px;top:0;width:${p.clientWidth}px`; document.body.append(c);
  const n = c.innerText.split(/\s+/).filter(Boolean).length; c.remove(); return n;
});

export async function popWords(page: Page) {
  await page.goto('/linear-systems/index.html');
  await page.waitForFunction(() => !!(window as any).__study);
  const maps: { id: string; nodes: string[]; edges: string[] }[] = await page.evaluate(() => (window as any).__study.content.maps.map((m: any) => ({ id: m.id, nodes: m.nodes.map((n: any) => n.id), edges: m.edges.map((e: any) => `${e.from}->${e.to}`) })));
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

test('linear-systems: every box and line pop-up, on both maps, is 150 words or under, as rendered', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const res = await popWords(page);
  expect(Object.keys(res).filter((k) => k.includes('line ')).length).toBeGreaterThan(50);
  expect(Object.keys(res).filter((k) => !k.includes('line ')).length).toBeGreaterThan(50);
  if (process.env.SHOW_WORDS) console.log(JSON.stringify(res));
  expect(Object.entries(res).filter(([, n]) => n > 150).map(([k, n]) => `${k}: ${n}`)).toEqual([]);
});

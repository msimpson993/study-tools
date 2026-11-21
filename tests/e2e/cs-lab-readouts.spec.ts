import { test, expect, type Page } from '@playwright/test';
import { open } from './helpers';

/** control-systems PID Lab (pass 2, R1/R3): every readout value sits on its own label's row, right of the label, whatever the label
 * says, for every preset with the wind on and off, and with a window that ends before the gust. Uses core text()'s __textLog. */
interface E { s: string; x0: number; x1: number; y0?: number; y1?: number; cv: number; gen: number; skipped: boolean }
const BASE = ['Overshoot', 'Settling', 'Steady error', 'Wind peak', 'Peak torque', 'Stability'];
/** with the wind on, the R2 row "Offset at end (t = T s)" sits under the wind peak */
const labelsFor = (windOn: boolean) => (windOn ? [...BASE.slice(0, 4), 'Offset at end', ...BASE.slice(4)] : BASE);
async function rows(page: Page, LABELS: string[]) {
  await page.waitForTimeout(700);
  const log: E[] = await page.evaluate(() => (window as any).__textLog);
  const cvOf = [...log].reverse().find((e) => e.s.startsWith('Overshoot ('))!.cv, last = Math.max(...log.filter((e) => e.cv === cvOf).map((e) => e.gen));
  const mine = log.filter((e) => e.cv === cvOf && e.gen === last && !e.skipped && e.y0 !== undefined);
  if (!LABELS.includes('Offset at end')) expect(mine.some((e) => e.s.startsWith('Offset at end')), 'no offset row with the wind off').toBe(false);
  return LABELS.map((k) => {
    const lab = mine.find((e) => e.s.startsWith(k))!; expect(lab, `row “${k}”`).toBeTruthy(); const ym = (lab.y0! + lab.y1!) / 2;
    const val = mine.filter((e) => e !== lab && !LABELS.some((L) => e.s.startsWith(L)) && Math.abs((e.y0! + e.y1!) / 2 - ym) < 2 && e.x0 > lab.x0);
    return { k, lab, val, ym };
  });
}
async function check(page: Page, what: string, windOn: boolean) {
  const rs = await rows(page, labelsFor(windOn));
  for (const r of rs) {
    expect(r.val.length, `${what}: “${r.k}” has exactly one value on its row`).toBe(1);
    expect(r.val[0].x0, `${what}: “${r.k}” label ends before its value`).toBeGreaterThan(r.lab.x1);
  }
  for (let i = 1; i < rs.length; i++) expect(rs[i].ym - rs[i - 1].ym, `${what}: rows evenly spaced`).toBeGreaterThan(5);
  return rs;
}
for (const vw of [1366, 390]) test(`control-systems Lab @${vw}: readout values stay on their rows (all presets, wind on/off, short window)`, async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: vw, height: vw > 500 ? 900 : 844 });
  await page.addInitScript(() => { (window as any).__textLog = []; (window as any).__textCanvases = []; });
  await open(page, 'control-systems', '#/figure/lab'); await page.getByTestId('fig-stage').waitFor();
  const presets = page.locator('[data-testid=controls] .st-presets button'), wind = page.locator('[data-testid=controls] input[type=checkbox][data-k="wind"]');
  const n = await presets.count(); expect(n).toBeGreaterThan(5);
  for (let i = 0; i < n; i++) {
    const name = (await presets.nth(i).innerText()).trim();
    for (const want of [true, false]) {
      await presets.nth(i).click(); if ((await wind.isChecked()) !== want) await wind.click({ force: true });
      const rs = await check(page, `${name}, wind ${want ? 'on' : 'off'}`, want);
      if (want) expect(rs[4].lab.s, 'the offset row names the window end').toBe('Offset at end (t = 16 s)');
      if (want && /^P 1000/.test(name)) expect(rs[4].val[0].s, 'P leaves −T_d/Kp').toBe('−1.149°');
      const se = rs[2].lab.s;
      if (want) expect(se, 'the steady-error label names the time it is read').toContain('before gust'); else expect(se).toBe('Steady error');
    }
  }
  // R3: a window that ends before the 10 s gust has no gust in it
  await presets.first().click(); if (!(await wind.isChecked())) await wind.click({ force: true });
  // the window slider sits in the folded 'more' group: set it the way a drag would
  await page.locator('[data-testid=controls] input[type=range][data-k="T"]').first().evaluate((el: HTMLInputElement) => { el.value = '8'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  const rs = await check(page, 'window 8 s, wind on', true);
  expect(rs[2].lab.s).toBe('Steady error');
  expect(rs[3].val[0].s).toBe('— (no gust in window)');
  expect(rs[4].val[0].s).toBe('— (no gust in window)');
});

import { test, expect, type Page } from '@playwright/test';
import { open } from './helpers';

/** The quiz shows each question's choices in a shuffled order; grading follows the choice text, not the slot. */
const texts = (page: Page) => page.locator('[data-testid=qcard] button[data-choice] span').allInnerTexts();

test.describe('quiz: choices are shuffled on display', () => {
  test('the authored answer lands in different slots, and picking it is graded right however it is placed', async ({ page }) => {
    await open(page, 'control-systems', '#/quiz?tags=failures'); // the PID failure-card questions: most authored answers sit at index 0
    const slots = new Set<string>();
    for (let i = 0; i < 14; i++) {
      const card = page.getByTestId('qcard');
      if (!(await card.locator('button[data-choice]').count())) { await page.getByTestId('flip').click(); await page.getByTestId('missed-it').click(); continue; }
      const right = await page.evaluate((qid) => { const q = (window as any).__study.content.quiz.find((x: any) => x.id === qid); return q.answer; }, await card.getAttribute('data-qid'));
      const btn = card.locator(`button[data-choice="${right}"]`);
      slots.add((await btn.getAttribute('data-pos'))!);
      await btn.click();
      await expect(page.getByTestId('why')).toContainText('Right.');
      await page.getByTestId('next').click();
    }
    expect(slots.size).toBeGreaterThanOrEqual(3);
  });

  test('a re-render mid-question does not reshuffle, and a wrong pick keeps the order and marks the right one', async ({ page }) => {
    await open(page, 'control-systems', '#/quiz?tags=model');
    const before = await texts(page);
    expect(before.length).toBeGreaterThanOrEqual(2);
    const card = page.getByTestId('qcard');
    const qid = (await card.getAttribute('data-qid'))!;
    const right = await page.evaluate((id) => (window as any).__study.content.quiz.find((x: any) => x.id === id).answer, qid);
    const wrong = right === 0 ? 1 : 0;
    await card.locator(`button[data-choice="${wrong}"]`).click(); // renders again
    expect(await texts(page)).toEqual(before);
    await expect(card.locator('button.right')).toHaveAttribute('data-choice', String(right));
    await expect(card.locator('button.wrong')).toHaveAttribute('data-choice', String(wrong));
    await expect(page.getByTestId('why')).toContainText('Not quite.');
  });

  test('keyboard: the letter of the displayed slot answers, 1-4 too', async ({ page }) => {
    await open(page, 'control-systems', '#/quiz?tags=mini-exam'); // the first two are choice questions
    const card = page.getByTestId('qcard');
    const qid = (await card.getAttribute('data-qid'))!;
    const right = await page.evaluate((id) => (window as any).__study.content.quiz.find((x: any) => x.id === id).answer, qid);
    const pos = Number(await card.locator(`button[data-choice="${right}"]`).getAttribute('data-pos'));
    await page.keyboard.press(String.fromCharCode(97 + pos));
    await expect(page.getByTestId('why')).toContainText('Right.');
    await page.keyboard.press('Enter');
    const card2 = page.getByTestId('qcard');
    const q2 = (await card2.getAttribute('data-qid'))!;
    const right2 = await page.evaluate((id) => (window as any).__study.content.quiz.find((x: any) => x.id === id).answer, q2);
    const pos2 = Number(await card2.locator(`button[data-choice="${right2}"]`).getAttribute('data-pos'));
    await page.keyboard.press(String(pos2 + 1));
    await expect(page.getByTestId('why')).toContainText('Right.');
  });

  test('choices that point at the others ("Both", "Neither") stay after them', async ({ page }) => {
    await open(page, 'linear-systems', '#/quiz?qid=tr-recon-1'); // Zero-order hold / Ideal sinc / Both / Neither (from the retired transforms page)
    await expect(page.getByTestId('qcard')).toHaveAttribute('data-qid', 'tr-recon-1');
    for (let k = 0; k < 4; k++) { // a few fresh presentations
      expect((await texts(page)).slice(-2)).toEqual(['Both', 'Neither']);
      await page.reload(); await page.waitForFunction(() => !!(window as any).__study);
    }
  });

  test('a copied reference (#/quiz?qid=…) opens on that question', async ({ page }) => {
    await open(page, 'control-systems', '#/quiz');
    const id = await page.evaluate(() => (window as any).__study.content.quiz[7].id);
    await open(page, 'control-systems', `#/quiz?qid=${encodeURIComponent(id)}`);
    await expect(page.getByTestId('qcard')).toHaveAttribute('data-qid', id);
  });
});

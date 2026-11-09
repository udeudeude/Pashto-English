import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // This is intentionally an offline-friendly interface test. Remote pictograms
  // and translation providers may be unavailable without disabling local controls.
  await page.route('https://api.arasaac.org/**', route => route.abort());
  await page.route('https://api.iconify.design/**', route => route.abort());
  await page.goto('/');
});

test('core interface is bilingual and does not await a speech-model download', async ({ page }) => {
  await expect(page.locator('h1')).toContainText('پښتو');
  await expect(page.locator('#en')).toContainText('په انګلیسي خبرې وکړئ');
  await expect(page.locator('#ps')).toContainText('په پښتو خبرې وکړئ');
  await expect(page.locator('summary').first()).toContainText('اصلي خبرې');
  await expect(page.locator('#picture-column .picture-heading')).toContainText('انځورونه');
});

test('picture controls render; rejection grays out; alternatives open', async ({ page }) => {
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(() => {
    const original=document.getElementById('original');
    original.textContent='I need a ladder to reach the cashews in the jar on the shelf';
    const result=document.getElementById('result');
    result.lang='ps';
    result.textContent='زه زینې ته اړتیا لرم';
  });
  const cards=page.locator('#picture-column .picture-card');
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toContainText('ladder');
  await expect(cards.nth(1)).toContainText('cashew');
  await expect(cards.nth(2)).toContainText('jar');
  await expect(cards.nth(3)).toContainText('shelf');
  await expect(page.locator('.picture-actions button')).toHaveCount(8);
  await cards.nth(1).locator('.picture-actions button').first().click();
  await expect(cards.nth(1)).toHaveClass(/picture-rejected/);
  await cards.nth(1).locator('.picture-actions button').nth(1).click();
  await expect(page.locator('.picture-sheet')).toBeVisible();
  await expect(page.locator('.picture-sheet h2')).toContainText('cashew');
  await expect(page.locator('.picture-sheet-grid')).toContainText('Same word');
  await page.locator('.picture-sheet-close').click();
  await expect(page.locator('.picture-sheet')).toBeHidden();
  expect(errors).toEqual([]);
});

test('incorrect translation placeholder is not treated as successful translation', async ({ page }) => {
  await page.route('https://api.mymemory.translated.net/**', route => route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({responseStatus:200,responseData:{translatedText:'[Spanish]'}}),
  }));
  const result=await page.evaluate(async () => {
    try { return await translate('Hello','en','ps'); }
    catch(error) { return error.message; }
  });
  expect(result).toContain('Invalid translation placeholder');
});

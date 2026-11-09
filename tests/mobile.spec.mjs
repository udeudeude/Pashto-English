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
  expect(result).toContain('invalid placeholder');
});

test('Pashto playback uses the local voice engine even without a system Pashto voice', async ({ page }) => {
  await expect(page.locator('#test-pashto-voice')).toBeAttached();
  await expect.poll(() => page.evaluate(() => typeof window.pashtoVoice?.speak)).toBe('function');
  const spoken=await page.evaluate(async () => {
    let received=null;
    window.pashtoVoice.speak=async text => { received=text; };
    speak('سلام، تاسو څنګه یاست؟','ps');
    await Promise.resolve();
    return received;
  });
  expect(spoken).toBe('سلام، تاسو څنګه یاست؟');
});

test('bundled Pashto voice synthesizes speech on a user tap', async ({page}) => {
  test.setTimeout(120_000);
  await page.locator('summary').last().click();
  await expect(page.locator('#test-pashto-voice')).toBeVisible();
  await page.locator('#test-pashto-voice').click();
  await expect(page.locator('#status')).toContainText('Playing Pashto translation', {timeout:90_000});
});


test('teacher can exercise English-to-Pashto translation and audio without using a microphone', async ({page}) => {
  const requests=[];
  await page.route('https://api.mymemory.translated.net/**',route=>{
    const pair=new URL(route.request().url()).searchParams.get('langpair');
    requests.push(pair);
    return route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({responseStatus:200,responseData:{translatedText:'سلام'}})
    });
  });
  const translated=await page.evaluate(async()=>{
    let spoken='';
    window.pashtoVoice.speak=async text=>{spoken=text};
    document.getElementById('demo-hello').click();
    // Poll state via the existing controller, not a real microphone.
    while(document.getElementById('result').textContent!=='سلام')await new Promise(r=>setTimeout(r,15));
    await Promise.resolve();
    return {spoken,original:document.getElementById('original').textContent};
  });
  expect(translated).toEqual({spoken:'سلام',original:'Hello.'});
  expect(requests).toEqual(['en|ps']);
  await expect(page.locator('#replay')).toBeEnabled();
  await expect(page.locator('#result')).toHaveAttribute('dir','rtl');
  await expect(page.locator('#status')).toContainText(' / ');
});

test('Pashto-to-English practice uses the shared translation and replay controls', async ({page}) => {
  const requests=[];
  await page.route('https://api.mymemory.translated.net/**',route=>{
    const pair=new URL(route.request().url()).searchParams.get('langpair');
    requests.push(pair);
    return route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({responseStatus:200,responseData:{translatedText:'Hello, how are you?'}})
    });
  });
  await page.evaluate(()=>document.getElementById('demo-pashto').click());
  await expect(page.locator('#result')).toHaveText('Hello, how are you?');
  await expect(page.locator('#original')).toHaveAttribute('dir','rtl');
  await expect(page.locator('#result')).toHaveAttribute('dir','ltr');
  await expect(page.locator('#replay')).toBeEnabled();
  expect(requests).toEqual(['ps|en']);
});

test('a failed request clears earlier translation and disables stale Replay',async ({page})=>{
  await page.route('https://api.mymemory.translated.net/**',route=>{
    const q=new URL(route.request().url()).searchParams.get('q');
    const translatedText=q==='Hello.'?'سلام':'[Spanish]';
    return route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({responseStatus:200,responseData:{translatedText}})
    });
  });
  await page.evaluate(()=>{window.pashtoVoice.speak=async()=>{};document.getElementById('demo-hello').click()});
  await expect(page.locator('#result')).toHaveText('سلام');
  await expect(page.locator('#replay')).toBeEnabled();
  await page.evaluate(()=>document.getElementById('demo-water').click());
  await expect(page.locator('#result')).toContainText('Translation unavailable');
  await expect(page.locator('#replay')).toBeDisabled();
  await expect(page.locator('#status')).toContainText('invalid placeholder');
});

test('a slow previous translation cannot overwrite a newer sentence',async ({page})=>{
  await page.route('https://api.mymemory.translated.net/**',async route=>{
    const q=new URL(route.request().url()).searchParams.get('q');
    if(q==='Hello.')await new Promise(r=>setTimeout(r,180));
    return route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({responseStatus:200,responseData:{translatedText:q==='Hello.'?'سلام':'اوبه'}})
    });
  });
  await page.evaluate(async()=>{
    window.pashtoVoice.speak=async()=>{};
    const older=window.pashtoApp.demo('Hello.','en');
    const newer=window.pashtoApp.demo('I need water.','en');
    await Promise.all([older,newer]);
  });
  await expect(page.locator('#result')).toHaveText('اوبه');
  await expect(page.locator('#original')).toHaveText('I need water.');
});

test('Pashto recording does not replace the shared replay handler',async ({page})=>{
  const previous=await page.evaluate(()=>document.getElementById('replay').onclick.toString());
  expect(previous).toContain('lastSpeech');
  const controller=await page.evaluate(()=>Object.keys(window.pashtoApp));
  expect(controller).toEqual(expect.arrayContaining(['begin','process','fail','demo']));
});

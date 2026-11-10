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
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(0)).toContainText('need');
  await expect(cards.nth(1)).toContainText('ladder');
  await expect(cards.nth(2)).toContainText('reach');
  await expect(cards.nth(3)).toContainText('cashew');
  await expect(cards.nth(4)).toContainText('jar');
  await expect(cards.nth(5)).toContainText('shelf');
  await expect(page.locator('.picture-actions button')).toHaveCount(12);
  await cards.nth(3).locator('.picture-actions button').first().click();
  await expect(cards.nth(3)).toHaveClass(/picture-rejected/);
  await cards.nth(3).locator('.picture-actions button').nth(1).click();
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

test('failed translation cannot leave pictures that look like a successful result',async ({page})=>{
 await page.evaluate(()=>{
  const original=document.getElementById('original');
  original.textContent='The ladder is outside.';
  const result=document.getElementById('result');
  result.lang='ps';result.textContent='زینه';
 });
 await expect(page.locator('#picture-column .picture-card')).toHaveCount(2);
 await page.evaluate(()=>{
  const result=document.getElementById('result');
  result.removeAttribute('lang');
  result.textContent='Translation unavailable / ژباړه نشته';
 });
 await expect(page.locator('#picture-column .picture-card')).toHaveCount(0);
 await expect(page.locator('#picture-column .picture-stack')).toContainText('له ژباړې وروسته');
});


test('real image alternatives are offered for same, related and similar-sounding words',async({page})=>{
 const testSvg='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="12" fill="currentColor"/></svg>';
 const requested=[];
 await page.route(/https:\/\/api\.arasaac\.org\/v1\/pictograms\/en\/search\//,route=>{
  const word=decodeURIComponent(route.request().url().split('/').pop()).toLowerCase();
  requested.push(word);
  return route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify([{_id:101,keywords:[{keyword:word}]}])});
 });
 await page.route(/https:\/\/static\.arasaac\.org\/pictograms\//,route=>route.fulfill({
  status:200,contentType:'image/svg+xml',body:testSvg
 }));
 await page.route(/https:\/\/api\.iconify\.design\/search\?/,route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({icons:['mdi:bookshelf']})
 }));
 await page.route(/https:\/\/api\.iconify\.design\/.+\.svg/,route=>route.fulfill({
  status:200,contentType:'image/svg+xml',body:testSvg
 }));
 await page.evaluate(()=>{
  document.getElementById('original').textContent='I need the shelf';
  const result=document.getElementById('result');
  result.lang='ps';result.textContent='زه یوې طاقچې ته اړتیا لرم';
 });
 const card=page.locator('#picture-column .picture-card').filter({hasText:'shelf'});
 await expect(page.locator('#picture-column .picture-card')).toHaveCount(2);
 await expect(card).toHaveCount(1);
 await expect(card.locator('img')).toHaveCount(1);
 await expect.poll(()=>card.locator('img').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
 await card.locator('.picture-actions button').nth(1).click();
 await expect(page.locator('.picture-sheet')).toBeVisible();
 const groups=page.locator('.picture-choice-group');
 await expect(groups).toHaveCount(3);
 await expect.poll(()=>groups.nth(0).locator('img').count()).toBeGreaterThan(0);
 await expect.poll(()=>groups.nth(1).locator('img').count()).toBeGreaterThan(0);
 await expect.poll(()=>groups.nth(2).locator('img').count()).toBeGreaterThan(0);
 expect(requested).toContain('shelf');
 expect(requested).toContain('cabinet');
 expect(requested).toContain('shell');
 await groups.nth(1).getByRole('button',{name:/cabinet/i}).first().click();
 await expect(page.locator('.picture-sheet')).toBeHidden();
 await expect(card.locator('.word')).toHaveText('shelf');
 await expect(card.locator('.picture-choice-note')).toContainText('Image: cabinet');
});

test('a cashew is never silently illustrated as a peanut',async({page})=>{
 await page.route(/https:\/\/api\.arasaac\.org\/v1\/pictograms\/en\/search\//,route=>
  route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify([{_id:99,keywords:[{keyword:'peanut'}]}])})
 );
 await page.route(/https:\/\/api\.iconify\.design\/search\?/,route=>
  route.fulfill({status:200,contentType:'application/json',body:'{"icons":[]}'})
 );
 await page.evaluate(()=>{
  document.getElementById('original').textContent='I need cashews';
  const result=document.getElementById('result');
  result.lang='ps';result.textContent='کاجو';
 });
 const card=page.locator('#picture-column .picture-card').filter({hasText:'cashew'});
 await expect(page.locator('#picture-column .picture-card')).toHaveCount(2);
 await expect(card).toHaveCount(1);
 await expect(card.locator('.word')).toHaveText('cashew');
 await expect(card.locator('img')).toHaveCount(0);
 await card.locator('.picture-actions button').nth(1).click();
 await expect(page.locator('.picture-choice-group').first()).toContainText('No exact pictogram found');
 const related=page.locator('.picture-choice-group').nth(1);
 await expect(related).toContainText('peanut');
 await expect(page.locator('.picture-sheet h2')).toContainText('cashew');
});


test('the English and Pashto headings are on separate physical lines',async({page})=>{
 const lines=page.locator('h1.app-title span');
 await expect(lines).toHaveCount(2);
 await expect(lines.nth(0)).toHaveText('Pashto ↔ English');
 await expect(lines.nth(1)).toHaveText('پښتو ↔ انګلیسي');
 await expect(lines.nth(1)).toHaveAttribute('dir','rtl');
 const bounds=await lines.evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom})));
 expect(bounds[1].top).toBeGreaterThanOrEqual(bounds[0].bottom);
});

test('previously unknown picturable words receive actual pictures in sentence order',async({page})=>{
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64"/></svg>';
 await page.route('https://api.arasaac.org/**',route=>{
  const word=decodeURIComponent(route.request().url().split('/').pop());
  const ids={telescope:6031,observe:6032,star:6033};
  return route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify(ids[word]?[{_id:ids[word],keywords:[{keyword:word}]}]:[])});
 });
 await page.route('https://static.arasaac.org/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:svg}));
 await page.evaluate(()=>{
  document.getElementById('original').textContent='I need a telescope to observe the stars.';
  const result=document.getElementById('result');result.lang='ps';result.textContent='په پښتو کې د ازموینې ژباړه';
 });
 const cards=page.locator('#picture-column .picture-card');
 await expect.poll(async()=>cards.count()).toBe(4);
 await expect.poll(async()=>cards.locator('.word').allTextContents()).toEqual(['need','telescope','observe','star']);
 for(const word of ['telescope','observe','star']){
  const card=cards.filter({hasText:word});
  await expect(card.locator('img')).toHaveCount(1);
  await expect.poll(()=>card.locator('img').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
 }
});

test('do not invent icons for purely grammatical words or unrelated search results',async({page})=>{
 await page.route('https://api.arasaac.org/**',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify([{_id:314,keywords:[{keyword:'peanut'}]}])
 }));
 await page.evaluate(()=>{
  document.getElementById('original').textContent='We will carry the mysterious objects for you.';
  const result=document.getElementById('result');result.lang='ps';result.textContent='د ازموینې ژباړه';
 });
 await expect(page.locator('#picture-column .picture-card').filter({hasText:'carry'})).toHaveCount(1);
 await expect(page.locator('#picture-column .picture-card').filter({hasText:'mysterious'})).toHaveCount(0);
 await expect(page.locator('#picture-column .picture-card').filter({hasText:'you'})).toHaveCount(0);
});

test('a table is not depicted by a chair when image providers are unavailable',async({page})=>{
 await page.evaluate(()=>{
  document.getElementById('original').textContent='I need a table';
  const result=document.getElementById('result');result.lang='ps';result.textContent='د ازموینې ژباړه';
 });
 const card=page.locator('#picture-column .picture-card').filter({hasText:'table'});
 await expect(card).toHaveCount(1);
 await expect(card.locator('.emoji')).toHaveText('❔');
});

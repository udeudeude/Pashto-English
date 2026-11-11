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
  await expect(page.locator('#picture-column .picture-heading')).toHaveCount(0);
  await expect(page.locator('#picture-column')).toHaveAttribute('aria-label', /Illustrations in English word order/);
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
  await expect(page.locator('#status')).toContainText('Playing / غږېږي', {timeout:90_000});
  await expect(page.locator('#status')).toHaveAttribute('aria-label',/Playing Pashto translation/);
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


test('the left picture rail scrolls independently to items below the viewport',async({page})=>{
 const sentence='I need a ladder, a shelf, a jar, a book, a chair, water, rice, medicine, a car, a bus, a train, a phone, a window, a clock, a teacher, a doctor, a school, and a table.';
 await page.evaluate(text=>{
  document.getElementById('original').textContent=text;
  const result=document.getElementById('result');
  result.lang='ps';result.textContent='د پښتو ازمایښتي ژباړه';
 },sentence);
 const rail=page.locator('#picture-column');
 const cards=rail.locator('.picture-card');
 await expect.poll(()=>cards.count()).toBeGreaterThan(12);
 const measured=await rail.evaluate(el=>{
  const card=el.querySelector('.picture-card');
  return {
   scrollHeight:el.scrollHeight,
   clientHeight:el.clientHeight,
   overflowY:getComputedStyle(el).overflowY,
   railTouchAction:getComputedStyle(el).touchAction,
   cardTouchAction:getComputedStyle(card).touchAction
  };
 });
 expect(measured.scrollHeight).toBeGreaterThan(measured.clientHeight);
 expect(measured.overflowY).toBe('auto');
 expect(measured.railTouchAction).toContain('pan-y');
 expect(measured.cardTouchAction).toContain('pan-y');
 const atBottom=await rail.evaluate(el=>{
  el.scrollTop=el.scrollHeight;
  return {position:el.scrollTop,bottom:el.scrollHeight-el.clientHeight};
 });
 expect(atBottom.position).toBeGreaterThan(0);
 expect(atBottom.position).toBeCloseTo(atBottom.bottom,0);
 await expect(cards.last()).toBeVisible();
});

test('rejected picture can be restored immediately and after a visual refresh',async({page})=>{
 await page.evaluate(()=>{
  document.getElementById('original').textContent='I need a book';
  const result=document.getElementById('result');result.lang='ps';result.textContent='کتاب';
 });
 const card=page.locator('#picture-column .picture-card').filter({hasText:'book'});
 const toggle=card.locator('.picture-action-reject');
 await expect(toggle).toHaveText('×');
 await toggle.click();
 await expect(card).toHaveClass(/picture-rejected/);
 await expect(toggle).toHaveText('↶');
 await expect(toggle).toHaveAttribute('aria-label',/Undo picture rejection/);
 await toggle.click();
 await expect(card).not.toHaveClass(/picture-rejected/);
 await expect(toggle).toHaveText('×');
 await toggle.click();
 await page.evaluate(()=>{
  const result=document.getElementById('result');
  result.textContent=result.textContent; // Re-render the same sentence.
 });
 const redrawn=page.locator('#picture-column .picture-card').filter({hasText:'book'});
 await expect(redrawn).toHaveClass(/picture-rejected/);
 await redrawn.locator('.picture-action-reject').click();
 await expect(redrawn).not.toHaveClass(/picture-rejected/);
});

test('picture action icons no longer consume a row below the illustration',async({page})=>{
 await page.evaluate(()=>{
  document.getElementById('original').textContent='I have a book';
  const result=document.getElementById('result');result.lang='ps';result.textContent='کتاب';
 });
 const card=page.locator('#picture-column .picture-card').filter({hasText:'book'});
 const sizes=await card.evaluate(el=>{
  const actions=el.querySelector('.picture-actions');
  const buttons=Array.from(actions.querySelectorAll('button'));
  const box=el.getBoundingClientRect(),buttonsRect=buttons.map(b=>b.getBoundingClientRect());
  const action=actions.getBoundingClientRect();
  return {cardHeight:box.height,actionPosition:getComputedStyle(actions).position,
   top:action.top,cardTop:box.top,bottom:action.bottom,cardBottom:box.bottom,
   buttons:buttonsRect.map(b=>({width:b.width,height:b.height}))};
 });
 expect(sizes.actionPosition).toBe('static');
 expect(sizes.cardHeight).toBeLessThan(140);
 expect(sizes.top).toBeGreaterThanOrEqual(sizes.cardTop);
 expect(sizes.bottom).toBeLessThan(sizes.cardBottom);
 expect(sizes.buttons.every(b=>b.width<=28&&b.height<=28)).toBe(true);
 const alignment=await card.evaluate(el=>{
  const word=el.querySelector('.picture-caption .word').getBoundingClientRect();
  const actions=el.querySelector(':scope > .picture-actions').getBoundingClientRect();
  const image=el.querySelector(':scope > img, :scope > .emoji').getBoundingClientRect();
  return {word,actions,image,layout:getComputedStyle(el).display,
   actionDirection:getComputedStyle(el.querySelector('.picture-actions')).flexDirection};
 });
 expect(alignment.layout).toBe('grid');
 expect(alignment.actionDirection).toBe('column');
 // The two small buttons must be to the RIGHT, never on top of the image.
 expect(alignment.actions.left).toBeGreaterThanOrEqual(alignment.image.right-2);
 // The word must have the entire card width on the row below the image.
 expect(alignment.word.top).toBeGreaterThanOrEqual(alignment.image.bottom-2);
 expect(alignment.word.top).toBeGreaterThanOrEqual(alignment.actions.bottom-2);
 expect(alignment.word.width).toBeGreaterThan(alignment.image.width);
});

test('vertical touch movement leaves rejection alone; diagonal gesture can reject',async({page})=>{
 await page.evaluate(()=>{
  document.getElementById('original').textContent='I need a book';
  const result=document.getElementById('result');result.lang='ps';result.textContent='کتاب';
 });
 const card=page.locator('#picture-column .picture-card').filter({hasText:'book'});
 // Synthetic touch events test gesture classification; they do not simulate
 // physical Safari scrolling. That is covered separately by the layout test.
 await card.evaluate(el=>{
  const event=(type,x,y)=>{
   const touch={clientX:x,clientY:y};
   const ev=new Event(type,{bubbles:true,cancelable:true});
   Object.defineProperty(ev,'touches',{value:type==='touchend'?[]:[touch]});
   Object.defineProperty(ev,'changedTouches',{value:[touch]});
   el.dispatchEvent(ev);
  };
  event('touchstart',40,50);
  event('touchmove',43,115);
  event('touchend',43,115);
 });
 await expect(card).not.toHaveClass(/picture-rejected/);
 await card.evaluate(el=>{
  const event=(type,x,y)=>{
   const touch={clientX:x,clientY:y};
   const ev=new Event(type,{bubbles:true,cancelable:true});
   Object.defineProperty(ev,'touches',{value:type==='touchend'?[]:[touch]});
   Object.defineProperty(ev,'changedTouches',{value:[touch]});
   el.dispatchEvent(ev);
  };
  event('touchstart',30,40);
  event('touchmove',95,58);
  event('touchend',95,58);
 });
 await expect(card).toHaveClass(/picture-rejected/);
 await card.locator('.picture-action-reject').click();
 await expect(card).not.toHaveClass(/picture-rejected/);
});

// Microphone lifecycle tests use deterministic browser fakes, not real recordings.
async function fakePashtoMicrophone(page,{pending=false}={}){
 await page.evaluate(({pending})=>{
  window.captureStats={requests:0,stops:0,recorders:0};
  const createStream=()=>{
   const track={readyState:'live',stop(){
    if(this.readyState==='ended')return;
    this.readyState='ended';window.captureStats.stops++;
   }};
   return {getTracks:()=>[track]};
  };
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>{
   window.captureStats.requests++;
   return pending?new Promise(resolve=>{window.grantMicrophone=()=>resolve(createStream())}):Promise.resolve(createStream());
  }});
  window.MediaRecorder=class{
   constructor(){this.state='inactive';window.captureStats.recorders++;window.fakeRecorder=this}
   start(){this.state='recording'}
   stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.())}
  };
  // Linux WebKit may lack native MediaRecorder. Recheck after installing the fake.
  window.capabilityReport();
 },{pending});
 await expect(page.locator('#ps')).toBeEnabled();
}
test('Pashto permission can be cancelled without opening a second microphone',async({page})=>{
 await fakePashtoMicrophone(page,{pending:true});
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Cancel');
 await page.locator('#ps').click();
 await page.evaluate(()=>window.grantMicrophone());
 await expect.poll(()=>page.evaluate(()=>window.captureStats)).toEqual({requests:1,stops:1,recorders:0});
 await expect(page.locator('#ps')).toContainText('Speak Pashto');
});
test('new conversation stops Pashto microphone and ignores its late stop callback',async({page})=>{
 await fakePashtoMicrophone(page);
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Stop');
 await page.evaluate(()=>{
  window.pashtoApp.begin('en');window.pashtoStatus('New conversation / نوې خبرې');
 });
 await expect.poll(()=>page.evaluate(()=>window.captureStats.stops)).toBeGreaterThan(0);
 await expect(page.locator('#ps')).toContainText('Speak Pashto');
 await expect(page.locator('#status')).toHaveText('New conversation / نوې خبرې');
});
test('Pashto microphone error releases capture and leaves retry available',async({page})=>{
 await fakePashtoMicrophone(page);
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Stop');
 await page.evaluate(()=>window.fakeRecorder.onerror({error:new Error('capture failed')}));
 await expect(page.locator('#result')).toContainText('Translation unavailable');
 await expect(page.locator('#ps')).toContainText('Speak Pashto');
 await expect.poll(()=>page.evaluate(()=>window.captureStats.stops)).toBeGreaterThan(0);
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Stop');
});
test('Pashto recording stops automatically after twenty seconds',async({page})=>{
 await page.evaluate(()=>{
  const original=window.setTimeout;
  window.setTimeout=(callback,delay,...args)=>{
   if(delay===20_000){window.recordingDeadline=callback;return 0}
   return original(callback,delay,...args);
  };
 });
 await fakePashtoMicrophone(page);
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Stop');
 await page.evaluate(()=>window.recordingDeadline());
 await expect(page.locator('#ps')).toContainText('Speak Pashto');
 await expect(page.locator('#status')).toContainText('No usable speech');
 await expect.poll(()=>page.evaluate(()=>window.captureStats.stops)).toBeGreaterThan(0);
});
test('real module worker loads lazily, transcribes and recovers after runtime failure',async({page})=>{
 // Mock only the remote library; exercise the real local worker and messaging.
 await page.route('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1',route=>route.fulfill({
  contentType:'application/javascript',body:`
   export const env={backends:{onnx:{wasm:{}}}};
   export async function pipeline(task,model,options){
    if(env.allowLocalModels!==false||env.backends.onnx.wasm.numThreads!==1)throw Error('Incorrect runtime configuration');
    return async(audio,options)=>{
     if(audio[0]===1)throw Error('wasm initialization failed');
     if(options.language!=='pashto'||options.task!=='transcribe')throw Error('Incorrect language');
     return {text:'سلام'};
    };
   }`,
 }));
 const result=await page.evaluate(async()=>{
  const {createRecognitionClient}=await import('./lib/recognition-client.mjs');
  const client=createRecognitionClient({timeoutMs:15_000});
  let failure='';
  try{await client.recognize(new Float32Array([1]))}catch(error){failure=error.message}
  const text=await client.recognize(new Float32Array([0]));client.cancel();
  return {failure,text};
 });
 expect(result).toEqual({failure:'wasm initialization failed',text:'سلام'});
});

test('share QR, resource previews, self-test and footer appear in requested order', async ({ page }) => {
 const resources=page.locator('.resource-section');
 const cards=resources.locator('a.resource-card');
 await expect(cards).toHaveCount(2);
 await expect(resources.locator('h2')).toContainText('د پښتو');
 await expect(cards.nth(0)).toHaveAttribute('href','https://dsal.uchicago.edu/dictionaries/heston/');
 await expect(cards.nth(1)).toHaveAttribute('href','https://www.parsemus.org/free-english-lessons-for-pashto-speakers/');
 for(const card of await cards.all()){
   await expect(card).toHaveAttribute('target','_blank');
   await expect(card.locator('img')).toHaveAttribute('alt',/homepage/i);
   const image=card.locator('img');
   await image.scrollIntoViewIfNeeded();
   await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 }
 const share=page.locator('.share-section');
 await expect(share.locator('h2')).toContainText('دا اپ شریک کړئ');
 await expect(share.locator('.share-qr-link')).toHaveAttribute('href','https://udeudeude.github.io/Pashto-English/');
 await expect(share.locator('img')).toHaveAttribute('src','./assets/resources/share-app.svg');
 const qr=share.locator('img');
 await qr.scrollIntoViewIfNeeded();
 await expect.poll(()=>qr.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 const ordered=await page.evaluate(()=>{
   const nodes=[
     document.querySelector('.share-section'),
     document.querySelector('.resource-section'),
     document.querySelector('#self-test'),
     document.querySelector('details.panel:not(#self-test) > summary')?.closest('details'),
     document.querySelector('footer')
   ];
   return nodes.every((node,i)=>i===nodes.length-1||Boolean(
     node.compareDocumentPosition(nodes[i+1])&Node.DOCUMENT_POSITION_FOLLOWING
   ));
 });
 expect(ordered).toBe(true);
});

test('cancelling Pashto while translation is pending prevents late speech and Replay',async({page})=>{
 await fakePashtoMicrophone(page);
 await page.evaluate(()=>{
  window.AudioContext=class{
   async decodeAudioData(){return {duration:0.5}}
   async close(){}
  };
  window.OfflineAudioContext=class{
   createBufferSource(){return {connect(){},start(){}}}
   async startRendering(){return {getChannelData:()=>new Float32Array(8000).fill(0.01)}}
  };
  window.Worker=class{
   postMessage({id}){queueMicrotask(()=>this.onmessage({data:{id,type:'result',text:'سلام'}}))}
   terminate(){}
  };
  window.translate=()=>new Promise(resolve=>{window.finishTranslation=resolve});
  window.spokenAfterCancel=0;
  window.speak=()=>window.spokenAfterCancel++;
 });
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Stop');
 await page.evaluate(()=>window.fakeRecorder.ondataavailable({data:new Blob(['fake audio'])}));
 await page.locator('#ps').click();
 await expect(page.locator('#original')).toHaveText('سلام');
 await expect(page.locator('#ps')).toContainText('Cancel');
 await page.locator('#ps').click();
 await page.evaluate(()=>window.finishTranslation('Hello'));
 await expect(page.locator('#replay')).toBeDisabled();
 await expect(page.locator('#result')).toHaveAttribute('aria-label',/Waiting for speech/);
 expect(await page.evaluate(()=>window.spokenAfterCancel)).toBe(0);
});


test('all image sources are searched; ARASAAC and Iconify options coexist',async({page})=>{
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48"/></svg>';

 await page.route(/https:\/\/api\.arasaac\.org\/v1\/pictograms\/en\/search\//,route=>{
   const term=decodeURIComponent(route.request().url().split('/').pop());
   return route.fulfill({status:200,contentType:'application/json',
     headers:{'access-control-allow-origin':'*'},
     body:JSON.stringify([{_id:152,keywords:[{keyword:term,type:2}]}])});
 });
 await page.route(/https:\/\/static\.arasaac\.org\/pictograms\//,route=>
   route.fulfill({status:200,contentType:'image/png',path:'assets/resources/heston-homepage.png'}));
 await page.route(/https:\/\/api\.iconify\.design\/search\?/,route=>
   route.fulfill({status:200,contentType:'application/json',body:'{"icons":["mdi:box"]}'}));
 await page.route(/https:\/\/api\.iconify\.design\/.+\.svg/,route=>
   route.fulfill({status:200,contentType:'image/svg+xml',body:svg}));
 const sources=await page.evaluate(async()=>{
   const choices=await window.pictureCatalog.find('box',{max:6});
   return [...new Set(choices.map(x=>x.source))];
 });
 expect(sources).toEqual(expect.arrayContaining(['ARASAAC','Iconify']));
 await expect(page.locator('#picture-column select')).toHaveCount(0);
 await expect(page.locator('.picture-source-label')).toContainText('ARASAAC + Iconify');
 await expect(page.locator('.picture-source-label')).toBeHidden();
 await page.evaluate(()=>{
  document.getElementById('original').textContent='Open the box';
  const result=document.getElementById('result');
  result.lang='ps';result.textContent='بکس خلاص کړئ';
 });
 const card=page.locator('#picture-column .picture-card').filter({hasText:'box'});
 await expect(card).toHaveCount(1);
 await expect.poll(()=>card.locator('img').count()).toBeGreaterThan(0);
 await card.locator('.picture-action-alternatives').click();
 const picker=page.locator('.picture-choice-group').first();
 await expect.poll(()=>picker.locator('button').count()).toBeGreaterThan(1);
 // Mocked image responses can be rejected by browser decoders. The catalog
 // must expose both providers; the separate online WebKit/Chromium smoke suite
 // verifies that REAL ARASAAC and Iconify images render in this picker.
 expect(sources).toEqual(expect.arrayContaining(['ARASAAC','Iconify']));
 await expect(picker).toContainText('Iconify');
});

test('ARASAAC failure is communicated, rather than silently presenting Iconify as ARASAAC',async({page})=>{
 await page.route('https://api.arasaac.org/**',route=>route.abort());
 await page.evaluate(async()=>{await window.pictureCatalog.find('ladder',{max:6})});
 await expect(page.locator('.picture-source-label')).toContainText('ARASAAC unavailable');
 await expect(page.locator('.picture-source-label')).toBeVisible();
});

test('English recognition stops on background and discards a late transcript',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='ios-webkit','iOS uses explicit local audio recording, not Safari Web Speech');
 await page.addInitScript(()=>{
   window.SpeechRecognition=window.webkitSpeechRecognition=class {
     constructor(){window.fakeEnglishRecognition=this}
     start(){this.started=true}
     stop(){this.stopped=true}
     abort(){this.aborted=true}
   };
 });
 await page.reload();
 await expect(page.locator('#en')).toBeEnabled();
 await page.locator('#en').click();
 await expect(page.locator('#en')).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:true});
   document.dispatchEvent(new Event('visibilitychange'));
 });
 await expect(page.locator('#en')).toHaveAttribute('aria-pressed','false');
 expect(await page.evaluate(()=>window.fakeEnglishRecognition.aborted)).toBe(true);
 await expect(page.locator('#status')).toContainText('background');
 await expect(page.locator('#replay')).toBeDisabled();
});

test('English microphone stops on second tap and immediately after a final recognition result',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='ios-webkit','iOS uses explicit local audio recording, not Safari Web Speech');
 await page.addInitScript(()=>{
   window.SpeechRecognition=window.webkitSpeechRecognition=class{
     constructor(){window.recordingSessions=(window.recordingSessions||[]);window.recordingSessions.push(this)}
     start(){}
     abort(){this.aborted=true}
   };
 });
 await page.reload();
 await page.locator('#en').click();
 await page.locator('#en').click();
 expect(await page.evaluate(()=>window.recordingSessions[0].aborted)).toBe(true);
 await page.locator('#en').click();
 await page.route('https://api.mymemory.translated.net/**',route=>route.fulfill({
   status:200,contentType:'application/json',
   body:'{"responseStatus":200,"responseData":{"translatedText":"کتاب"}}'
 }));
 await page.evaluate(()=>{
   const rec=window.recordingSessions[1];
   rec.onresult({results:[[{transcript:'book'}]]});
 });
 expect(await page.evaluate(()=>window.recordingSessions[1].aborted)).toBe(true);
 await expect(page.locator('#original')).toHaveText('book');
 await expect(page.locator('#en')).toHaveAttribute('aria-pressed','false');
});


test('iPhone English recognition never invokes Web Speech and uses owned local tracks',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='ios-webkit','iPhone-specific input route');
 const result=await page.evaluate(()=>({
  localEnglish:window.pashtoSpeechInput?.localEnglish,
  safety:window.pashtoMicrophoneSafety?.state()
 }));
 expect(result.localEnglish).toBe(true);
 // The Linux WebKit test runtime lacks a native MediaRecorder; install the
 // supported recorder mock before asserting the capability label.
 await fakePashtoMicrophone(page);
 await expect(page.locator('#capabilities')).toContainText('experimental local model');
 await page.evaluate(()=>{
  window.SpeechRecognition=class{start(){window.browserEnglishCalled=true}};
  window.webkitSpeechRecognition=window.SpeechRecognition;
 });
 await page.locator('#en').click();
 await expect(page.locator('#en')).toContainText('Stop');
 expect(await page.evaluate(()=>window.captureStats.requests)).toBe(1);
 expect(await page.evaluate(()=>window.browserEnglishCalled)).toBeUndefined();
 const during=await page.evaluate(()=>window.pashtoMicrophoneSafety.state());
 expect(during.streams).toBe(1);
 await page.locator('#en').click();
 await expect.poll(()=>page.evaluate(()=>window.captureStats.stops)).toBe(1);
 await expect(page.locator('#en')).toContainText('Speak English');
 expect(await page.evaluate(()=>window.pashtoMicrophoneSafety.state().streams)).toBe(0);
});

test('iPhone English recording transcribes in English then translates after microphone release',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='ios-webkit','iPhone-specific local English speech');
 await fakePashtoMicrophone(page);
 await page.route('https://api.mymemory.translated.net/**',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:'{"responseStatus":200,"responseData":{"translatedText":"سلام"}}'
 }));
 await page.evaluate(()=>{
  window.AudioContext=class{
   async decodeAudioData(){return {duration:.5}}
   async close(){}
  };
  window.OfflineAudioContext=class{
   createBufferSource(){return {connect(){},start(){}}}
   async startRendering(){return {getChannelData:()=>new Float32Array(8000).fill(.01)}}
  };
  window.Worker=class{
   postMessage({id,language}){
    window.capturedWorkerLanguage=language;
    queueMicrotask(()=>this.onmessage({data:{id,type:'result',text:'Hello'}}))
   }
   terminate(){}
  };
  window.pashtoVoice.speak=async()=>{};
 });
 await page.locator('#en').click();
 await expect(page.locator('#en')).toContainText('Stop');
 await page.evaluate(()=>window.fakeRecorder.ondataavailable({data:new Blob(['simulated speech'])}));
 await page.locator('#en').click();
 expect(await page.evaluate(()=>window.captureStats.stops)).toBe(1);
 await expect(page.locator('#original')).toHaveText('Hello');
 await expect(page.locator('#result')).toHaveText('سلام');
 expect(await page.evaluate(()=>window.capturedWorkerLanguage)).toBe('english');
 await expect(page.locator('#en')).toContainText('Speak English');
 expect(await page.evaluate(()=>window.pashtoMicrophoneSafety.state().streams)).toBe(0);
});

test('active Pashto microphone tracks are stopped synchronously on background and blur',async({page})=>{
 await fakePashtoMicrophone(page);
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Stop');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 expect(await page.evaluate(()=>window.captureStats.stops)).toBe(1);
 await expect(page.locator('#ps')).toContainText('Speak Pashto');
 expect(await page.evaluate(()=>window.pashtoMicrophoneSafety.state().streams)).toBe(0);
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Stop');
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:true});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 expect(await page.evaluate(()=>window.captureStats.stops)).toBe(2);
 await expect(page.locator('#ps')).toContainText('Speak Pashto');
 expect(await page.evaluate(()=>window.pashtoMicrophoneSafety.state().streams)).toBe(0);
});

test('late microphone permission grant after background is stopped without recording',async({page})=>{
 await fakePashtoMicrophone(page,{pending:true});
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Cancel');
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:true});
  document.dispatchEvent(new Event('visibilitychange'));
  window.grantMicrophone();
 });
 await expect.poll(()=>page.evaluate(()=>window.captureStats.stops)).toBe(1);
 expect(await page.evaluate(()=>window.captureStats.recorders)).toBe(0);
 expect(await page.evaluate(()=>window.pashtoMicrophoneSafety.state().streams)).toBe(0);
});

test('native recognition has a hard timeout when no events ever fire',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='ios-webkit','iPhone never uses Web Speech');
 await page.addInitScript(()=>{
  window.SpeechRecognition=window.webkitSpeechRecognition=class{
   constructor(){window.stuckBrowserRecognition=this}
   start(){}
   abort(){this.aborted=true}
   stop(){this.stopped=true}
  };
 });
 await page.reload();
 await page.evaluate(()=>{
  const original=window.setTimeout;
  window.setTimeout=(callback,delay,...rest)=>{
   if(delay===12000){window.fireSpeechPrivacyDeadline=callback;return 0}
   return original(callback,delay,...rest);
  };
 });
 await page.locator('#en').click();
 await expect(page.locator('#en')).toContainText('Stop');
 await page.evaluate(()=>window.fireSpeechPrivacyDeadline());
 await expect(page.locator('#en')).toContainText('Speak English');
 expect(await page.evaluate(()=>({
  aborted:window.stuckBrowserRecognition.aborted,
  stopped:window.stuckBrowserRecognition.stopped,
  registered:window.pashtoMicrophoneSafety.state().recognizers
 }))).toEqual({aborted:true,stopped:true,registered:0});
 await expect(page.locator('#status')).toContainText('timed out');
});

test('iPhone English audio tracks are stopped on pagehide without another user tap',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='ios-webkit','iPhone privacy pathway');
 await fakePashtoMicrophone(page);
 await page.locator('#en').click();
 await expect(page.locator('#en')).toContainText('Stop');
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 expect(await page.evaluate(()=>window.captureStats.stops)).toBe(1);
 await expect(page.locator('#en')).toContainText('Speak English');
 expect(await page.evaluate(()=>window.pashtoMicrophoneSafety.state().streams)).toBe(0);
 await expect(page.locator('#replay')).toBeDisabled();
});

test('background cancellation does not unlock or resume speech playback',async({page})=>{
 await fakePashtoMicrophone(page);
 await page.evaluate(()=>{
   window.unlockCount=0;
   window.pashtoVoice.unlock=()=>window.unlockCount++;
 });
 await page.locator('#ps').click();
 await expect(page.locator('#ps')).toContainText('Stop');
 await page.evaluate(()=>{
  window.unlockCount=0;
  window.dispatchEvent(new Event('blur'));
 });
 expect(await page.evaluate(()=>window.unlockCount)).toBe(0);
 expect(await page.evaluate(()=>window.captureStats.stops)).toBe(1);
});


test('main communication controls require minimal reading and keep full accessibility labels',async({page})=>{
 const intro=page.locator('main > .content-column > .screenreader-only').first();
 await expect(intro).toContainText('Choose the spoken language');
 expect(await intro.evaluate(el=>{
  const style=getComputedStyle(el);
  return style.position==='absolute'&&style.width==='1px'&&style.overflow==='hidden';
 })).toBe(true);
 const panel=page.locator('.speech-panel');
 await expect(panel.locator('.choices button')).toHaveCount(2);
 await expect(page.locator('#en')).toHaveAttribute('aria-label',/Speak English/);
 await expect(page.locator('#ps')).toHaveAttribute('aria-label',/Speak Pashto/);
 await expect(page.locator('#en small')).toBeHidden();
 await expect(page.locator('#ps small')).toBeHidden();
 await page.evaluate(()=>window.pashtoStatus('Playing Pashto translation. Speech is experimental. / د پښتو ژباړې غږ غږول کېږي. دا ازمایښتي دی.'));
 await expect(page.locator('#status')).toHaveText('▶ Playing / غږېږي');
 await expect(page.locator('#status')).toHaveAttribute('aria-label',/Speech is experimental/);
 await page.evaluate(()=>window.pashtoStatus('Ready. Speak or open the self-test.'));
 await expect(page.locator('#status')).toBeHidden();
 await page.evaluate(()=>window.pashtoStatus('Microphone permission denied. / مایکروفون ته اجازه نه ده ورکړل شوې.'));
 await expect(page.locator('#status')).toBeVisible();
 await expect(page.locator('#status')).toHaveText(/Microphone permission denied/);
});

test('long English words retain full-width captions and controls remain right of pictures',async({page})=>{
 await page.evaluate(()=>{
  document.getElementById('original').textContent='I need medicine and a book';
  const result=document.getElementById('result');
  result.lang='ps';result.textContent='د ازموينې ژباړه';
 });
 const card=page.locator('#picture-column .picture-card').filter({hasText:'medicine'});
 await expect(card).toHaveCount(1);
 const geometry=await card.evaluate(el=>{
  const art=el.querySelector(':scope > img, :scope > .emoji').getBoundingClientRect();
  const controls=el.querySelector(':scope > .picture-actions').getBoundingClientRect();
  const label=el.querySelector('.picture-caption').getBoundingClientRect();
  return {
   artRight:art.right,controlsLeft:controls.left,controlsBottom:controls.bottom,
   labelTop:label.top,labelWidth:label.width,cardWidth:el.getBoundingClientRect().width,
   word:el.querySelector('.word')?.textContent
  };
 });
 expect(geometry.word).toBe('medicine');
 expect(geometry.controlsLeft).toBeGreaterThanOrEqual(geometry.artRight-2);
 expect(geometry.labelTop).toBeGreaterThanOrEqual(geometry.controlsBottom-2);
 expect(geometry.labelWidth).toBeGreaterThan(geometry.cardWidth-15);
});

test('handheld microphones and playback speed control work without changing the transcript', async ({page}) => {
 await expect(page.locator('#en')).toContainText('🎤 🗣️');
 await expect(page.locator('#ps')).toContainText('🎤 🗣️');
 const speed=page.locator('#playback-speed');
 await expect(speed).toHaveValue('1');
 await speed.selectOption('0.7');
 await expect(speed).toHaveValue('0.7');
 await speed.selectOption('1.3');
 await expect(speed).toHaveValue('1.3');
 const result=await page.evaluate(async()=>{
   const calls=[];
   window.pashtoVoice={speak:(text,opts)=>{calls.push({text,opts});return Promise.resolve()}};
   document.getElementById('playback-speed').value='0.85';
   await speak('سلام','ps');
   return calls;
 });
 expect(result).toEqual([{text:'سلام',opts:{speed:0.85}}]);
});

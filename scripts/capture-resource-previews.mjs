// Capture faithful, browser-rendered homepage previews for two external resources.
// Run: node scripts/capture-resource-previews.mjs
// These are static 1200x720 webpage screenshots, not generated illustrations.
import { chromium } from '@playwright/test';
import { mkdir, stat } from 'node:fs/promises';

const entries=[
  {
    id:'heston',
    url:'https://dsal.uchicago.edu/dictionaries/heston/',
    file:'assets/resources/heston-homepage.png',
    required:['Pashto','Dictionary']
  },
  {
    id:'parsemus',
    url:'https://www.parsemus.org/free-english-lessons-for-pashto-speakers/',
    file:'assets/resources/parsemus-homepage.png',
    required:['Pashto','English']
  }
];

await mkdir('assets/resources',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const item of entries){
  const context=await browser.newContext({
    viewport:{width:1200,height:720},
    deviceScaleFactor:1,
    reducedMotion:'reduce',
    locale:'en-US',
    colorScheme:'light'
  });
  try{
   const page=await context.newPage();
   const response=await page.goto(item.url,{waitUntil:'domcontentloaded',timeout:55000});
   if(!response||response.status()>=400)throw Error(item.id+': target returned HTTP '+response?.status());
   // Preserve the real page instead of compositing text or an invented mockup.
   await page.waitForTimeout(2200);
   const text=(await page.locator('body').innerText({timeout:12000})).toLowerCase();
   for(const term of item.required)if(!text.includes(term.toLowerCase()))
    throw Error(item.id+': expected '+term+' not found in rendered page. Avoid saving an error-screen screenshot.');
   await page.screenshot({path:item.file,type:'png',animations:'disabled',caret:'hide',timeout:20000});
   const info=await stat(item.file);
   if(info.size<5000)throw Error(item.id+': screenshot suspiciously small ('+info.size+' bytes)');
   console.log(item.id+': '+response.status()+' '+info.size+' bytes, '+await page.title()+', '+page.url());
  }finally{await context.close()}
 }
}finally{await browser.close()}

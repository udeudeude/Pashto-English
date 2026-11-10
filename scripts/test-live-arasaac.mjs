// Explicitly online browser smoke test, not part of the offline regression suite.
// Uses only harmless dictionary words; does not upload user conversations.
import {chromium,webkit} from '@playwright/test';
for(const [name,browserType] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await browserType.launch({headless:true});
 const page=await browser.newPage();
 try{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:20000});
  const result=await page.evaluate(async()=>{
   const catalog=window.pictureCatalog;
   if(!catalog)throw Error('Picture catalog not installed');
   const choices=await catalog.find('look',{max:8});
   const arasaac=choices.find(x=>x.source==='ARASAAC');
   const iconify=choices.find(x=>x.source==='Iconify');
   if(!arasaac)throw Error('ARASAAC returned no matching images: '+JSON.stringify(catalog.status()));
   if(!iconify)throw Error('Iconify returned no images');
   const image=await new Promise((resolve,reject)=>{
    const img=new Image();
    const limit=setTimeout(()=>reject(Error('Image download timed out')),10000);
    img.onload=()=>{clearTimeout(limit);resolve({width:img.naturalWidth,height:img.naturalHeight})};
    img.onerror=()=>{clearTimeout(limit);reject(Error('ARASAAC image failed to load'))};
    img.src=arasaac.url;
   });
   return {count:choices.length,sources:[...new Set(choices.map(x=>x.source))],image,
    status:catalog.status(),firstPictogram:arasaac.url};
  });
  console.log(name+' '+JSON.stringify(result));
  if(result.image.width<20)throw Error('ARASAAC image not rendered');
  // End-to-end check: the actual sentence picture rail must prefer a loaded
  // ARASAAC pictogram, and its alternative picker must retain BOTH sources.
  await page.evaluate(()=>{
    const original=document.getElementById('original');
    const translated=document.getElementById('result');
    original.textContent='Look at the box';
    translated.lang='ps';
    translated.textContent='بکس ته وګوره';
  });
  await page.waitForFunction(()=>{
    const card=[...document.querySelectorAll('.picture-card')].find(c=>c.querySelector('.word')?.textContent==='look');
    const img=card?.querySelector(':scope > img');
    return img?.complete&&img.naturalWidth>0&&img.title.includes('ARASAAC');
  },null,{timeout:30000});
  const card=page.locator('#picture-column .picture-card').filter({hasText:'look'});
  await card.locator('.picture-action-alternatives').click();
  await page.waitForFunction(()=>{
    const section=document.querySelector('.picture-choice-group');
    return section?.textContent.includes('ARASAAC')&&section?.textContent.includes('Iconify');
  },null,{timeout:30000});
  console.log(name+' main rail and alternatives show real ARASAAC + Iconify choices');
 }finally{await page.close();await browser.close()}
}

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
 }finally{await page.close();await browser.close()}
}

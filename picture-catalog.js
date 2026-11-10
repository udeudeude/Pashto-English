/* Existing pictograms only. No generated imagery or guessed image IDs.
 * Shared search for the sentence column and the alternatives panel.
 * Picture candidates are unverified illustrations, not translations.
 */
(() => {
 'use strict';
 const api='https://api.arasaac.org/v1/pictograms/en/search/';
 const iconApi='https://api.iconify.design/';
 const directIcons={
   shelf:['mdi:bookshelf'],bookcase:['mdi:bookshelf'],bookshelf:['mdi:bookshelf'],
   rack:['mdi:library-shelves'],cabinet:['mdi:cabinet'],drawer:['mdi:file-cabinet'],
   shell:['game-icons:seashell','mdi:sea-shell'],
   self:['mdi:account'],cash:['mdi:cash'],letter:['mdi:email-outline'],
   car:['mdi:car'],pot:['mdi:pot'],cap:['mdi:baseball-cap'],
   bottle:['mdi:bottle-wine'],glass:['mdi:glass-mug-variant'],
   ladder:['mdi:ladder'],stairs:['mdi:stairs'],
   almond:['game-icons:almond'],peanut:['game-icons:peanut'],
   // 'top' has many context-dependent senses. No unverified default picture.
 };
 // Search alternatives are explicit *queries*, not claims of equivalent meaning.
 // Never show peanut or books as a standalone picture of cashew or shelf.
 const queryAliases={
   shelf:['shelves','wall shelf'],
   cashew:['cashew nut'],
   bookcase:['bookshelf'],
   rack:['shelving unit'],
   shell:['seashell'],
   ladder:['step ladder'],
   top:['top surface'],
   self:['person']
 };
 const cache=new Map();
 const health={arasaac:'idle',iconify:'idle'};
 function mark(source,state){
   if(health[source]===state)return;
   health[source]=state;
   window.dispatchEvent(new CustomEvent('picture-source-state',{detail:{...health}}));
 }
 const normalize=x=>String(x||'').trim().toLowerCase();
 const imageUrl=id=>'https://static.arasaac.org/pictograms/'+id+'/'+id+'_300.png';
 const iconUrl=id=>{
   const [set,name]=id.split(':');
   return iconApi+encodeURIComponent(set)+'/'+encodeURIComponent(name)+'.svg';
 };
 async function json(url,timeout=7500){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
   try{
     const response=await fetch(url,{signal:controller.signal});
     if(!response.ok)throw Error('Image search '+response.status);
     return await response.json();
   }finally{clearTimeout(timer)}
 }
 function distinct(items){
   const found=new Set();
   return items.filter(p=>p?.url&&!found.has(p.url)&&(found.add(p.url),true));
 }
 function searchMatches(item,query){
   const labels=(item?.keywords||[]).map(k=>normalize(k?.keyword));
   if(!labels.length)return false;
   const target=normalize(query);
   // Search may return broader topics: demand at least a labeled match.
   return labels.some(x=>x===target||x.endsWith(' '+target)||x.startsWith(target+' ')||
     x.includes(' '+target+' '));
 }
 const actionWords=new Set('look see read open close help walk run jump ask speak listen give take write eat drink sit stand reach wash show point'.split(' '));
 async function arasaac(term,max){
   const queries=[term,...(queryAliases[normalize(term)]||[])];
   const results=[];
   let responded=false,failed=false;
   for(const query of queries.slice(0,2)){
     try{
       const data=await json(api+encodeURIComponent(query));
       responded=true;
       if(!Array.isArray(data))throw Error('Unexpected ARASAAC response');
       for(const item of data){
         const id=item?._id;
         if(!Number.isInteger(id)||!searchMatches(item,query))continue;
         const matches=(item.keywords||[]).filter(k=>normalize(k.keyword)===normalize(query));
         const type=actionWords.has(normalize(term))?3:2;
         const matchScore=matches.length?10:1;
         const senseScore=matches.some(k=>k.type===type)?3:0;
         results.push({kind:'image',word:term,source:'ARASAAC',url:imageUrl(id),score:matchScore+senseScore});
       }
     }catch(error){failed=true}
     if(results.length>=max)break;
   }
   mark('arasaac',responded?'ok':failed?'error':'ok');
   return distinct(results.sort((a,b)=>b.score-a.score)).slice(0,max)
     .map(({score,...candidate})=>candidate);
 }
 function iconSearchMatches(id,query){
   const basename=id.split(':').slice(1).join(':').toLowerCase();
   const term=query.replace(/\s+/g,'-').toLowerCase();
   // Searching for "shelf" can match "bookshelf" but not unrelated "books".
   return basename.includes(term);
 }
 async function icons(term,max){
   const query=normalize(term),known=(directIcons[query]||[]).map(id=>({
     kind:'image',word:term,source:'Iconify',url:iconUrl(id)
   }));
   try{
     const data=await json(iconApi+'search?query='+encodeURIComponent(term)+'&limit=48',6500);
     mark('iconify','ok');
     if(Array.isArray(data?.icons)){
       for(const id of data.icons){
         if(typeof id!=='string'||!/^[a-z0-9-]+:[a-z0-9-]+$/i.test(id))continue;
         if(!iconSearchMatches(id,query))continue;
         const set=id.split(':')[0];
         if(!['mdi','tabler','ph','lucide','game-icons','material-symbols','solar'].includes(set))continue;
         known.push({kind:'image',word:term,source:'Iconify',url:iconUrl(id)});
       }
     }
   }catch(e){mark('iconify','error');/* Curated icon URLs remain available when search is offline. */}
   return distinct(known).slice(0,max);
 }
 async function find(term,{max=8}={}){
   const normalized=normalize(term);
   if(!normalized||!/^[a-z][a-z -]{0,55}$/i.test(normalized))return [];
   const key=normalized+'|'+max;
   if(cache.has(key))return cache.get(key);
   const promise=(async()=>{
     // Reserve places for BOTH providers. Previously an abundant ARASAAC
     // search filled the entire list before Iconify was considered.
     const pictogramLimit=Math.max(1,Math.ceil(max*.6));
     const iconLimit=Math.max(1,max-pictogramLimit);
     const [pictograms,vectorIcons]=await Promise.all([
       arasaac(normalized,pictogramLimit),
       icons(normalized,iconLimit)
     ]);
     return distinct([...pictograms,...vectorIcons]).slice(0,max);
   })();
   cache.set(key,promise);
   // If ARASAAC is unavailable, retry on the next request instead of
   // caching an Iconify-only fallback indefinitely.
   promise.then(result=>{
     if(!result.length||health.arasaac==='error')cache.delete(key)
   },()=>cache.delete(key));
   return promise;
 }
 function immediate(term){
   const word=normalize(term);
   return (directIcons[word]||[]).map(id=>({kind:'image',word,source:'Iconify',url:iconUrl(id)}));
 }
 window.pictureCatalog={find,immediate,status:()=>({...health})};
})();
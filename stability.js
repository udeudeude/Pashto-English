/* Local, dependency-free pictogram controls. Speech services load separately. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const related={top:['lid','cap','roof','shelf'],shelf:['rack','bookcase','cabinet'],cashew:['almond','peanut','walnut'],jar:['bottle','glass','container'],ladder:['stairs','step','stool'],reach:['stretch','touch','grab']};
const sounding={top:['tap','tip','pot'],shelf:['self','shell'],cashew:['cash'],jar:['jaw','car'],ladder:['latter','letter'],reach:['rich','beach']};
const symbols={ladder:'🪜',jar:'🫙',cashew:'❔',shelf:'📚',lid:'🫙',cap:'🧢',roof:'🏠',rack:'📚',bookcase:'📚',cabinet:'🗄️',almond:'🌰',peanut:'🥜',walnut:'🌰',bottle:'🍾',glass:'🥛',container:'📦',stairs:'🪜',step:'🪜',stool:'🪑',stretch:'🙆',touch:'👆',grab:'🤲',tap:'🚰',tip:'💡',pot:'🍲',self:'🧍',shell:'🐚',cash:'💵',jaw:'🦷',car:'🚗',latter:'🔤',letter:'✉️',rich:'💰',beach:'🏖️'};
const ps={ladder:'زینه',cashew:'کاجو',jar:'جار',shelf:'طاقچه',house:'کور',water:'اوبه',book:'کتاب',school:'ښوونځی',car:'موټر',mother:'مور',father:'پلار',tea:'چای',bread:'ډوډۍ',help:'مرسته'};
const cache=new Map(),chosen=new Map(),rejected=new Set();let sentence='',serial=0;
const overlay=document.createElement('div');overlay.className='picture-sheet';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
const inner=document.createElement('section');inner.className='picture-sheet-inner';
const close=document.createElement('button');close.className='picture-sheet-close';close.type='button';close.textContent='Close / بندول';
const title=document.createElement('h2'),grid=document.createElement('div');grid.className='picture-sheet-grid';
inner.append(close,title,grid);overlay.append(inner);document.body.append(overlay);
close.onclick=()=>{overlay.hidden=true;serial++};
overlay.addEventListener('click',e=>{if(e.target===overlay)close.click()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close.click()});
function emoji(value){
 const span=document.createElement('span');span.className='emoji picture-sheet-emoji';span.textContent=value;span.setAttribute('aria-hidden','true');return span;
}
function image(src,name){
 const img=document.createElement('img');img.src=src;img.alt=name;img.draggable=false;
 img.onerror=()=>img.replaceWith(emoji('❔'));return img;
}
function updateRejectButton(card){
 const toggle=card.querySelector('.picture-action-reject');
 if(!toggle)return;
 const isRejected=card.classList.contains('picture-rejected');
 const glyph=isRejected?'↶':'×';
 const name=isRejected?'Undo picture rejection / د انځور ردول بېرته اخیستل':'Gray out picture / انځور خړول';
 if(toggle.textContent!==glyph)toggle.textContent=glyph;
 toggle.setAttribute('aria-label',name);
 toggle.setAttribute('title',name);
 toggle.setAttribute('aria-pressed',String(isRejected));
}
function setRejected(card,isRejected,showSlash=true){
 const key=card.dataset.pictureKey||card.dataset.word;
 if(isRejected)rejected.add(key);else rejected.delete(key);
 card.classList.toggle('picture-rejected',isRejected);
 card.querySelector('.picture-stroke')?.remove();
 updateRejectButton(card);
 if(!isRejected||!showSlash)return;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('picture-stroke');svg.setAttribute('viewBox','0 0 100 100');
 const line=document.createElementNS('http://www.w3.org/2000/svg','line');
 for(const [k,v] of Object.entries({
  x1:'8',y1:'8',x2:'92',y2:'92',stroke:'#d92d20','stroke-width':'7','stroke-linecap':'round'
 }))line.setAttribute(k,v);
 svg.append(line);card.append(svg);
 setTimeout(()=>svg.remove(),700);
}
function apply(card,choice){
 const old=card.querySelector(':scope > img, :scope > .emoji');if(!old)return;
 old.replaceWith(choice.kind==='image'?image(choice.url,choice.word):emoji(choice.symbol));
 setRejected(card,false,false);
 card.querySelector('.picture-choice-note')?.remove();
 // A related or similar-sounding picture depicts another concept. Make that
 // visible, rather than quietly relabeling it as the recognized word.
 if(choice.word && choice.word!==card.dataset.word){
  const note=document.createElement('small');note.className='picture-choice-note';
  note.textContent='Image: '+choice.word+' / د انځور کلمه: '+choice.word;
  card.querySelector('.picture-caption')?.before(note);
 }
}
function reject(card){setRejected(card,true)}
// Every category prefers actual public pictograms; emoji are only a last resort.
function group(en,pa){
 const section=document.createElement('section');section.className='picture-choice-group';
 const h=document.createElement('h3');h.textContent=en+' / '+pa;
 const items=document.createElement('div');items.className='picture-choice-candidates';
 section.append(h,items);grid.append(section);
 return items;
}
function option(container,card,choice,source){
 if(!choice?.url && choice?.kind!=='emoji')return;
 const b=document.createElement('button');b.type='button';
 const name=choice.word||card.dataset.word;
 const visual=choice.kind==='image'?image(choice.url,name):emoji(choice.symbol||'❔');
 b.append(visual);
 const small=document.createElement('small');
 const provenance=source||choice.source||'Picture / انځور';
 small.textContent=name+(ps[name]?' / '+ps[name]:'')+' · '+provenance;
 b.setAttribute('aria-label',name+(ps[name]?' / '+ps[name]:'')+' · '+provenance);
 b.append(small);
 if(choice.kind==='image'){
   // Do not turn an unavailable image into another unexplained emoji.
   visual.onerror=()=>b.remove();
 }
 b.onclick=()=>{chosen.set(card.dataset.word,choice);apply(card,choice);close.click()};
 container.append(b);
 return b;
}
function note(container,en,pa){
 const p=document.createElement('p');p.className='picture-note';
 p.textContent=en+' / '+pa;container.append(p);return p;
}
async function openOptions(card){
 const word=card.dataset.word,request=++serial;
 const catalog=window.pictureCatalog;
 overlay.hidden=false;
 title.textContent='Pictures for '+word+' / د انځور بدیلونه';
 grid.replaceChildren();
 const exact=group('Same word: '+word,'هماغه کلمه');
 const relatedItems=group('Related concepts','اړوند مفاهیم');
 const soundingItems=group('Similar-sounding words','ورته غږېدونکې کلمې');
 const source=$('original')?.textContent||'';
 const sourceIsPashto=/[\u0600-\u06ff]/u.test(source);
 // Show existing image on the card as a choice, including its original source.
 const current=card.querySelector(':scope > img');
 const seen={exact:new Set(),related:new Set(),sounding:new Set()};
 function add(target,seenGroup,choice,caption){
  if(overlay.hidden||request!==serial)return;
  if(choice?.url && seen[seenGroup].has(choice.url))return;
  if(choice?.url)seen[seenGroup].add(choice.url);
  option(target,card,choice,caption);
 }
 if(current?.src)add(exact,'exact',{kind:'image',word,url:current.src,source:'Current picture'},'Current / اوسنی');
 for(const choice of catalog?.immediate(word)||[])add(exact,'exact',choice,'Iconify');
 const searchingExact=note(exact,'Searching existing pictograms…','شته انځورونه لټول کېږي…');
 // Render high-confidence, curated icons immediately, so pressing the picker
 // never has to wait for all remote searches before showing useful pictures.
 const relatedWords=(related[word]||[]).slice(0,6);
 const soundingWords=sourceIsPashto?[]:(sounding[word]||[]).slice(0,5);
 if(!relatedWords.length)relatedItems.closest('.picture-choice-group').hidden=true;
 if(!soundingWords.length&&!sourceIsPashto)soundingItems.closest('.picture-choice-group').hidden=true;
 for(const relatedWord of relatedWords)
  for(const choice of catalog?.immediate(relatedWord)||[])add(relatedItems,'related',choice,'Related / اړوند');
 if(sourceIsPashto){
  note(soundingItems,'Pashto sound-alikes need verified pronunciation data.','د پښتو ورته غږونو لپاره تایید شوې تلفظي سرچینې پکار دي.');
 }else{
  for(const similarWord of soundingWords)
   for(const choice of catalog?.immediate(similarWord)||[])add(soundingItems,'sounding',choice,'Similar sound / ورته غږ');
 }
 const loadingRelated=relatedWords.length?note(relatedItems,'Finding related pictures…','اړوند انځورونه لټول کېږي…'):null;
 const loadingSound=soundingWords.length?note(soundingItems,'Finding similar-sounding words…','ورته غږېدونکي انځورونه لټول کېږي…'):null;
 const isCurrent=()=>!overlay.hidden&&request===serial;
 async function loadGroup(words,target,seenGroup,limit,caption,loading){
  if(!catalog){loading?.remove();return;}
  // The catalog caches results, and each request has its own short timeout.
  const data=await Promise.all(words.map(w=>catalog.find(w,{max:limit}).catch(()=>[])));
  if(!isCurrent())return;
  loading?.remove();
  for(let i=0;i<words.length;i++)
   for(const choice of data[i])add(target,seenGroup,choice,caption);
 }
 const jobs=[
   (async()=>{
     const images=await (catalog?.find(word,{max:10})||Promise.resolve([])).catch(()=>[]);
     if(!isCurrent())return;
     searchingExact.remove();
     for(const choice of images)add(exact,'exact',choice,choice.source);
     if(!exact.querySelector('button')){
       note(exact,'No exact pictogram found; do not substitute an unrelated object.','سم انځور ونه موندل شو؛ د بل شي انځور مه کاروئ.');
     }
   })(),
   loadGroup(relatedWords,relatedItems,'related',2,'Related image / اړوند انځور',loadingRelated)
 ];
 if(!sourceIsPashto)jobs.push(loadGroup(soundingWords,soundingItems,'sounding',2,'Similar sound / ورته غږ',loadingSound));
 await Promise.all(jobs);
 if(!isCurrent())return;
 // Expose emoji only when a category genuinely has no retrievable image.
 for(const [target,category,terms] of [
  [relatedItems,'related',relatedWords],
  [soundingItems,'sounding',soundingWords]
 ]){
   if(target.querySelector('button')||!terms.length)continue;
   note(target,'No pictograms loaded; simplified symbols below.','انځورونه ښکته نه شول؛ لاندې ساده نښې دي.');
   for(const candidate of terms){
     const symbol=symbols[candidate];
     if(symbol)option(target,card,{kind:'emoji',word:candidate,symbol},'Emoji fallback / د ایموجي بدیل');
   }
 }
 const disclaimer=document.createElement('p');disclaimer.className='picture-note';
 disclaimer.textContent='These are suggested illustrations, not verified meanings. Choosing one never changes the translation. / دا وړاندیز شوي انځورونه دي، تایید شوې ماناوې نه دي؛ په ټاکلو سره ژباړه نه بدلېږي.';
 grid.append(disclaimer);
}

function enhance(card,key){
 if(card.dataset.controls==='active')return;
 const label=card.querySelector('.word')?.textContent?.trim();if(!label)return;
 card.dataset.controls='active';
 card.dataset.word=label;
 card.dataset.pictureKey=key;
 for(const img of card.querySelectorAll('img'))img.draggable=false;
 const actions=document.createElement('div');actions.className='picture-actions';
 const wrong=document.createElement('button');
 wrong.type='button';wrong.className='picture-action-reject';
 wrong.textContent='×';
 const alternatives=document.createElement('button');
 alternatives.type='button';alternatives.className='picture-action-alternatives';
 alternatives.textContent='▦';
 alternatives.setAttribute('aria-label','Alternative pictures / نور انځورونه');
 alternatives.title='Alternative pictures / نور انځورونه';
 wrong.onclick=()=>setRejected(card,!card.classList.contains('picture-rejected'));
 alternatives.onclick=()=>openOptions(card);
 actions.append(wrong,alternatives);
 const labelRow=document.createElement('div');
 labelRow.className='picture-caption';
 const wordNode=card.querySelector('.word');
 labelRow.append(wordNode);
 // Controls run vertically beside the image, leaving the complete width
 // below for the word. Do not shrink the label to make space for buttons.
 card.append(actions,labelRow);
 const wasRejected=rejected.has(key);
 if(chosen.has(label))apply(card,chosen.get(label));
 if(wasRejected)setRejected(card,true,false);
 else updateRejectButton(card);
 // Safari must be allowed to scroll the left rail. Touch handlers are passive:
 // do not preventDefault on the card or intercept vertical scrolling.
 let point=null,timer=0;
 const clear=()=>{clearTimeout(timer);timer=0};
 card.addEventListener('touchstart',e=>{
  if(e.target.closest('button')||e.touches.length!==1)return;
  clear();
  const t=e.touches[0];point={x:t.clientX,y:t.clientY};
  timer=setTimeout(()=>{
   if(point){point=null;openOptions(card)}
  },650);
 },{passive:true});
 card.addEventListener('touchmove',e=>{
  if(!point||e.touches.length!==1)return;
  const t=e.touches[0];
  if(Math.hypot(t.clientX-point.x,t.clientY-point.y)>12)clear();
 },{passive:true});
 card.addEventListener('touchend',e=>{
  if(!point){clear();return}
  clear();
  const t=e.changedTouches[0];
  const dx=t.clientX-point.x,dy=t.clientY-point.y;
  point=null;
  // Only a deliberate, mostly horizontal diagonal marks rejection.
  // A primarily vertical swipe always remains a native scroll gesture.
  if(Math.abs(dx)>40&&Math.abs(dy)>12&&Math.abs(dx)>Math.abs(dy)*1.4){
   setRejected(card,true);
  }
 },{passive:true});
 card.addEventListener('touchcancel',()=>{point=null;clear()});
 card.addEventListener('contextmenu',e=>{e.preventDefault();openOptions(card)});
 card.addEventListener('dragstart',e=>e.preventDefault());
}
function sync(){
 const list=document.querySelector('#picture-column .picture-stack');if(!list)return;
 const current=($('original')?.textContent||'')+'|'+($('result')?.textContent||'');
 if(current!==sentence){
  sentence=current;
  chosen.clear();
  rejected.clear();
  const rail=document.getElementById('picture-column');
  if(rail)rail.scrollTop=0;
 }
 const occurrences=new Map();
 for(const card of list.querySelectorAll('.picture-card')){
  const word=card.querySelector('.word')?.textContent.trim();
  if(!word)continue;
  const occurrence=occurrences.get(word)||0;
  occurrences.set(word,occurrence+1);
  enhance(card,word+'#'+occurrence);
 }
}
const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});sync();
window.pashtoDiagnostics=()=>({
 version:'stability-1',
 cards:document.querySelectorAll('.picture-card').length,
 controls:document.querySelectorAll('.picture-actions button').length,
 title:document.querySelector('h1')?.textContent||''
});
})();
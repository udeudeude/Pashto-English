/* Local, dependency-free pictogram controls. Speech services load separately. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const related={top:['lid','cap','roof','shelf'],shelf:['rack','bookcase','cabinet'],cashew:['almond','peanut','walnut'],jar:['bottle','glass','container'],ladder:['stairs','step','stool'],reach:['stretch','touch','grab']};
const sounding={top:['tap','tip','pot'],shelf:['self','shell'],cashew:['cash'],jar:['jaw','car'],ladder:['latter','letter'],reach:['rich','beach']};
const symbols={ladder:'🪜',jar:'🫙',cashew:'❔',shelf:'📚',lid:'🫙',cap:'🧢',roof:'🏠',rack:'📚',bookcase:'📚',cabinet:'🗄️',almond:'🌰',peanut:'🥜',walnut:'🌰',bottle:'🍾',glass:'🥛',container:'📦',stairs:'🪜',step:'🪜',stool:'🪑',stretch:'🙆',touch:'👆',grab:'🤲',tap:'🚰',tip:'💡',pot:'🍲',self:'🧍',shell:'🐚',cash:'💵',jaw:'🦷',car:'🚗',latter:'🔤',letter:'✉️',rich:'💰',beach:'🏖️'};
const ps={ladder:'زینه',cashew:'کاجو',jar:'جار',shelf:'طاقچه',house:'کور',water:'اوبه',book:'کتاب',school:'ښوونځی',car:'موټر',mother:'مور',father:'پلار',tea:'چای',bread:'ډوډۍ',help:'مرسته'};
const cache=new Map(),chosen=new Map();let sentence='',serial=0;
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
function apply(card,choice){
 const old=card.querySelector(':scope > img, :scope > .emoji');if(!old)return;
 old.replaceWith(choice.kind==='image'?image(choice.url,choice.word):emoji(choice.symbol));
 card.classList.remove('picture-rejected');card.querySelector('.picture-stroke')?.remove();
}
function reject(card){
 card.classList.add('picture-rejected');chosen.delete(card.dataset.word);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('picture-stroke');svg.setAttribute('viewBox','0 0 100 100');
 const line=document.createElementNS('http://www.w3.org/2000/svg','line');
 for(const [key,val] of Object.entries({x1:'8',y1:'8',x2:'92',y2:'92',stroke:'#d92d20','stroke-width':'7','stroke-linecap':'round'}))line.setAttribute(key,val);
 svg.append(line);card.append(svg);setTimeout(()=>svg.remove(),700);
}
function group(en,pa){
 const h=document.createElement('h3');h.textContent=en+' / '+pa;grid.append(h);
}
function option(card,choice,source){
 const b=document.createElement('button');b.type='button';
 b.append(choice.kind==='image'?image(choice.url,choice.word):emoji(choice.symbol));
 const name=choice.word||card.dataset.word,small=document.createElement('small');
 small.textContent=name+(ps[name]?' / '+ps[name]:'')+' · '+source;b.append(small);
 b.onclick=()=>{chosen.set(card.dataset.word,choice);apply(card,choice);close.click()};
 grid.append(b);
}
async function fromArasaac(word){
 if(cache.has(word))return cache.get(word);
 let candidates=[];
 try{
  const response=await fetch('https://api.arasaac.org/v1/pictograms/en/search/'+encodeURIComponent(word));
  if(response.ok){
   const list=await response.json();
   candidates=list.filter(item=>(item.keywords||[]).some(k=>k.keyword?.toLowerCase()===word.toLowerCase())).slice(0,12)
    .map(item=>({kind:'image',word,url:'https://static.arasaac.org/pictograms/'+item._id+'/'+item._id+'_300.png'}));
  }
 }catch(e){/* Offline options are still available. */}
 cache.set(word,candidates);return candidates;
}
async function openOptions(card){
 const word=card.dataset.word,request=++serial;
 overlay.hidden=false;title.textContent='Pictures for '+word+' / د انځور بدیلونه';grid.replaceChildren();
 group('Same word','هماغه کلمه');
 const entry=window.__pictureVocab?.find(x=>x.label===word);
 option(card,{kind:'emoji',word,symbol:entry?.emoji||symbols[word]||'❔'},'Emoji');
 if(entry?.icon)option(card,{kind:'image',word,url:'https://api.iconify.design/iconoir/'+encodeURIComponent(entry.icon)+'.svg'},'Iconoir');
 const status=document.createElement('p');status.className='picture-note';status.textContent='Searching for pictures… / د انځورونو لټون…';grid.append(status);
 const pictures=await fromArasaac(word);
 if(overlay.hidden||serial!==request)return;
 status.remove();
 for(const pict of pictures)option(card,pict,'ARASAAC');
 group('Related things','اړوند شیان');
 for(const name of related[word]||[])option(card,{kind:'emoji',word:name,symbol:symbols[name]||'❔'},'Related / اړوند');
 group('Similar-sounding words','ورته غږېدونکې کلمې');
 const source=$('original')?.textContent||'';
 if(/[\u0600-\u06ff]/.test(source)){
  const note=document.createElement('p');note.className='picture-note';
  note.textContent='Pashto sound-alikes require verified pronunciation data. / د پښتو د ورته غږونو لپاره تایید شوي معلومات پکار دي.';grid.append(note);
 }else{
  for(const name of sounding[word]||[])option(card,{kind:'emoji',word:name,symbol:symbols[name]||'❔'},'Sounds similar / ورته غږ');
 }
 const note=document.createElement('p');note.className='picture-note';
 note.textContent='A picture is a suggestion, not a change to the translation. / انځور وړاندیز دی؛ ژباړه نه بدلوي.';grid.append(note);
}
function enhance(card){
 if(card.dataset.controls==='active')return;
 const label=card.querySelector('.word')?.textContent?.trim();if(!label)return;
 card.dataset.controls='active';card.dataset.word=label;
 for(const img of card.querySelectorAll('img'))img.draggable=false;
 const actions=document.createElement('div');actions.className='picture-actions';
 const wrong=document.createElement('button');wrong.type='button';wrong.textContent='✕';wrong.setAttribute('aria-label','Reject illustration / انځور ردول');
 const alternatives=document.createElement('button');alternatives.type='button';alternatives.textContent='▦';alternatives.setAttribute('aria-label','Alternative pictures / نور انځورونه');
 wrong.onclick=()=>reject(card);alternatives.onclick=()=>openOptions(card);
 actions.append(wrong,alternatives);card.append(actions);
 if(chosen.has(label))apply(card,chosen.get(label));
 let point=null,timer=0;
 const clear=()=>{clearTimeout(timer);timer=0};
 card.addEventListener('touchstart',e=>{
  if(e.target.closest('button')||e.touches.length!==1)return;
  e.preventDefault();clear();const t=e.touches[0];point={x:t.clientX,y:t.clientY};
  timer=setTimeout(()=>{if(point){point=null;openOptions(card)}},550);
 },{passive:false});
 card.addEventListener('touchmove',e=>{
  if(!point)return;e.preventDefault();const t=e.touches[0];
  if(Math.hypot(t.clientX-point.x,t.clientY-point.y)>14)clear();
 },{passive:false});
 card.addEventListener('touchend',e=>{
  if(!point){clear();return}e.preventDefault();clear();
  const t=e.changedTouches[0],dx=t.clientX-point.x,dy=t.clientY-point.y;point=null;
  if(Math.abs(dx)>28&&Math.abs(dy)>28)reject(card);
 },{passive:false});
 card.addEventListener('touchcancel',()=>{point=null;clear()});
 card.addEventListener('contextmenu',e=>{e.preventDefault();openOptions(card)});
 card.addEventListener('dragstart',e=>e.preventDefault());
}
function sync(){
 const list=document.querySelector('#picture-column .picture-stack');if(!list)return;
 const current=($('original')?.textContent||'')+'|'+($('result')?.textContent||'');
 if(current!==sentence){sentence=current;chosen.clear()}
 for(const card of list.querySelectorAll('.picture-card'))enhance(card);
}
const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});sync();
window.pashtoDiagnostics=()=>({
 version:'stability-1',
 cards:document.querySelectorAll('.picture-card').length,
 controls:document.querySelectorAll('.picture-actions button').length,
 title:document.querySelector('h1')?.textContent||''
});
})();
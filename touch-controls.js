// Reliable iPhone interaction layer: explicit buttons and touch gestures.
// Independent of optional picture-corrections.js so a failure there cannot disable controls.
(function(){
'use strict';
const css=document.createElement('style');
css.textContent=`
.picture-card{position:relative!important;-webkit-touch-callout:none!important;-webkit-user-select:none!important;user-select:none!important;touch-action:none!important}
.picture-card img,.picture-card .emoji,.picture-card .word{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;pointer-events:none!important}
.picture-card .picture-actions{display:flex;gap:4px;width:100%;justify-content:center;margin-top:4px}
.picture-card .picture-actions button{min-height:34px;min-width:35px;padding:4px;border:1px solid #ccd5df;background:white;border-radius:8px;font-size:1.05rem;touch-action:manipulation}
.picture-card.picture-rejected{background:#e5e7eb!important;border:2px dashed #9ca3af!important}
.picture-card.picture-rejected>img,.picture-card.picture-rejected>.emoji{filter:grayscale(1)!important;opacity:.25!important}
.picture-card.picture-rejected>.word{opacity:.5}
.picture-options-overlay{position:fixed;inset:0;background:#0009;z-index:9999;display:flex;align-items:flex-end;justify-content:center}
.picture-options-overlay[hidden]{display:none!important}
.picture-options-panel{background:white;border-radius:18px 18px 0 0;padding:16px;width:min(100%,620px);max-height:80dvh;overflow:auto}
.picture-options-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.picture-options-grid button{padding:8px;min-height:90px;border:1px solid #dce3e9;background:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.picture-options-grid img{width:65px;height:65px;object-fit:contain}
.picture-options-grid .emoji{font-size:2.4rem}
.picture-options-grid small{font-size:.72rem}
.picture-options-grid h3{grid-column:1/-1;font-size:1rem;margin:10px 0 0}
`;
document.head.append(css);
const overlay=document.createElement('div');overlay.className='picture-options-overlay';overlay.hidden=true;
const panel=document.createElement('div');panel.className='picture-options-panel';
const close=document.createElement('button');close.textContent='Close / بندول';close.style.cssText='min-height:40px;padding:8px 15px;background:#e8eef5';
const heading=document.createElement('h2');const grid=document.createElement('div');grid.className='picture-options-grid';
panel.append(close,heading,grid);overlay.append(panel);document.body.append(overlay);
close.onclick=()=>overlay.hidden=true;overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.hidden=true});
const related={top:['lid','cap','roof','shelf'],shelf:['rack','bookcase','cabinet'],cashew:['almond','peanut','walnut'],jar:['bottle','container','glass'],ladder:['stairs','step','stool'],reach:['touch','grab','stretch']};
const sounds={top:['tap','tip','pot'],shelf:['self','shell'],cashew:['cash'],jar:['jaw','car'],ladder:['latter','letter'],reach:['rich','beach']};
const icons={lid:'🫙',cap:'🧢',roof:'🏠',shelf:'📚',rack:'📚',bookcase:'📚',cabinet:'🗄️',almond:'🌰',peanut:'🥜',walnut:'🌰',bottle:'🍾',container:'📦',glass:'🥛',stairs:'🪜',step:'🪜',stool:'🪑',touch:'👆',grab:'🤲',stretch:'🙆',tap:'🚰',tip:'💡',pot:'🍲',self:'🧍',shell:'🐚',cash:'💵',jaw:'🦷',car:'🚗',latter:'🔤',letter:'✉️',rich:'💰',beach:'🏖️'};
function image(url){const img=document.createElement('img');img.src=url;img.alt='';img.draggable=false;return img}
function option(label,source,node,onClick){
 const b=document.createElement('button');b.type='button';b.append(node);
 const caption=document.createElement('small');caption.textContent=label+' · '+source;b.append(caption);b.onclick=onClick;grid.append(b);
}
function group(title){const h=document.createElement('h3');h.textContent=title;grid.append(h)}
async function open(card){
 const label=card.querySelector('.word')?.textContent?.trim()||'';
 if(!label)return;
 overlay.hidden=false;heading.textContent='Pictures for '+label+' / د انځورونو انتخاب';grid.replaceChildren();
 const current=card.querySelector(':scope > img,:scope > .emoji');
 const fallback=window.__pictureVocab?.find(x=>x.label===label)?.emoji||'🔎';
 const choose=node=>{const previous=card.querySelector(':scope > img,:scope > .emoji');if(previous)previous.replaceWith(node);card.classList.remove('picture-rejected');overlay.hidden=true};
 group('Same meaning / ورته مانا');
 const e=document.createElement('span');e.className='emoji';e.textContent=fallback;option(label,'Emoji',e,()=>{const n=document.createElement('span');n.className='emoji';n.textContent=fallback;choose(n)});
 const match=window.__pictureVocab?.find(x=>x.label===label);
 if(match?.icon)option(label,'Iconoir',image('https://api.iconify.design/iconoir/'+encodeURIComponent(match.icon)+'.svg'),()=>choose(image('https://api.iconify.design/iconoir/'+encodeURIComponent(match.icon)+'.svg')));
 const place=document.createElement('p');place.textContent='Searching ARASAAC… / د انځورونو لټون';grid.append(place);
 try{
  const response=await fetch('https://api.arasaac.org/v1/pictograms/en/search/'+encodeURIComponent(label));
  if(response.ok){
   const data=await response.json();if(!overlay.hidden){
    for(const entry of data.filter(p=>(p.keywords||[]).some(k=>k.keyword?.toLowerCase()===label.toLowerCase())).slice(0,10)){
     const url='https://static.arasaac.org/pictograms/'+entry._id+'/'+entry._id+'_300.png';
     option(label,'ARASAAC',image(url),()=>choose(image(url)));
    }
   }
  }
 }catch(e){}
 place.remove();if(overlay.hidden)return;
 group('Related things / اړوند شیان');
 for(const word of related[label]||[]){const span=document.createElement('span');span.className='emoji';span.textContent=icons[word]||'🔎';option(word,'related',span,()=>{const n=document.createElement('span');n.className='emoji';n.textContent=icons[word]||'🔎';choose(n)})}
 const original=document.getElementById('original')?.textContent||'';
 group(/[\u0600-\u06ff]/.test(original)?'Pashto sound-alikes: not yet verified / ورته غږونه':'English sound-alikes / ورته غږونه');
 if(!/[\u0600-\u06ff]/.test(original))for(const word of sounds[label]||[]){const span=document.createElement('span');span.className='emoji';span.textContent=icons[word]||'🔎';option(word,'sounds similar',span,()=>{const n=document.createElement('span');n.className='emoji';n.textContent=icons[word]||'🔎';choose(n)})}
}
function reject(card){card.classList.add('picture-rejected')}
function enhance(card){
 if(card.dataset.touchFixed)return;card.dataset.touchFixed='yes';
 const actions=document.createElement('div');actions.className='picture-actions';
 const wrong=document.createElement('button');wrong.type='button';wrong.textContent='✕';wrong.title='Reject picture / انځور ردول';wrong.setAttribute('aria-label',wrong.title);
 const alternatives=document.createElement('button');alternatives.type='button';alternatives.textContent='▦';alternatives.title='Alternative pictures / نور انځورونه';alternatives.setAttribute('aria-label',alternatives.title);
 wrong.onclick=e=>{e.stopPropagation();reject(card)};
 alternatives.onclick=e=>{e.stopPropagation();open(card)};
 actions.append(wrong,alternatives);card.append(actions);
 let start=null,timer=null,opened=false;
 const stop=()=>{clearTimeout(timer);timer=null};
 card.addEventListener('touchstart',e=>{
  if(e.target.closest('.picture-actions'))return;
  if(e.touches.length!==1)return;e.preventDefault();opened=false;
  const t=e.touches[0];start={x:t.clientX,y:t.clientY};
  timer=setTimeout(()=>{if(start){opened=true;start=null;open(card)}},600);
 },{passive:false});
 card.addEventListener('touchmove',e=>{
  if(!start)return;e.preventDefault();
  const t=e.touches[0];if(Math.hypot(t.clientX-start.x,t.clientY-start.y)>14)stop();
 },{passive:false});
 card.addEventListener('touchend',e=>{
  if(!start){stop();return}e.preventDefault();stop();
  const t=e.changedTouches[0];const dx=t.clientX-start.x,dy=t.clientY-start.y;start=null;
  if(Math.abs(dx)>25&&Math.abs(dy)>25)reject(card);
 },{passive:false});
 card.addEventListener('touchcancel',()=>{start=null;stop()});
 card.addEventListener('contextmenu',e=>{e.preventDefault();open(card)});
 card.addEventListener('dragstart',e=>e.preventDefault());
}
const stack=document.querySelector('#picture-column .picture-stack');
if(stack){
 const observer=new MutationObserver(()=>{for(const card of stack.querySelectorAll('.picture-card'))enhance(card)});
 observer.observe(stack,{childList:true});for(const card of stack.querySelectorAll('.picture-card'))enhance(card);
}
})();

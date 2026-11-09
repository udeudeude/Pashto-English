// Teacher pictogram correction controls. No generated imagery; uses existing licensed sources.
const column=document.getElementById('picture-column');
const stack=column?.querySelector('.picture-stack');
const corrections=new Map();
const candidates=new Map();
let currentSentence='';
const css=document.createElement('style');
css.textContent=`
.picture-card{position:relative;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer}.picture-card img,.picture-card .emoji,.picture-card .word{pointer-events:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.picture-card.rejected{background:#e5e7eb;border:2px dashed #9ca3af;color:#6b7280}.picture-card.rejected img,.picture-card.rejected .emoji{filter:grayscale(1);opacity:.35}.picture-card.rejected .word{opacity:.55}
.picture-card.rejected::after{content:'↻';position:absolute;right:5px;top:3px;color:#6b7280;font-weight:bold}
.picture-card .gesture-stroke{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
.picture-card .gesture-stroke line{stroke:#d92d20;stroke-width:7;stroke-linecap:round}
.picture-picker{position:fixed;inset:0;z-index:999;background:#0008;display:flex;align-items:end;justify-content:center}
.picture-picker[hidden]{display:none}
.picture-picker .sheet{background:white;color:#16283b;width:min(100%,650px);max-height:82dvh;overflow:auto;border-radius:22px 22px 0 0;padding:18px}
.picture-picker .options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.picture-picker .option{min-height:100px;padding:8px;border:1px solid #dce3e9;background:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}
.picture-picker .option img{height:65px;width:75px;object-fit:contain}
.picture-picker .option .emoji{font-size:2.8rem}
.picture-picker .option small{font-size:.68rem}
.picture-picker .close{min-height:42px;padding:10px;background:#e8eef5}
`;
document.head.append(css);
const modal=document.createElement('div');modal.className='picture-picker';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
modal.innerHTML='<div class="sheet"><button class="close" type="button">Close alternatives</button><h2>Choose a picture</h2><div class="options"></div></div>';
document.body.append(modal);
modal.querySelector('.close').onclick=()=>modal.hidden=true;
modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.hidden=true});
function emojiNode(value){const s=document.createElement('span');s.className='emoji';s.textContent=value||'🔎';return s}
function sourceImage(src,emoji){
 const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=src;img.onerror=()=>img.replaceWith(emojiNode(emoji));return img;
}
function applyChoice(card,choice){
 const old=card.querySelector('img,.emoji');if(!old)return;
 old.replaceWith(choice.type==='emoji'?emojiNode(choice.value):sourceImage(choice.value,card.dataset.emoji));
 card.classList.remove('rejected');
}
async function alternatives(label,emoji,icon){
 const key=label.toLowerCase();
 if(candidates.has(key))return candidates.get(key);
 const list=[{type:'emoji',value:emoji,source:'Emoji'}];
 if(icon)list.push({type:'image',value:'https://api.iconify.design/iconoir/'+encodeURIComponent(icon)+'.svg',source:'Iconoir'});
 try{
  const response=await fetch('https://api.arasaac.org/v1/pictograms/en/search/'+encodeURIComponent(label));
  if(response.ok){
   const data=await response.json();
   const exact=data.filter(p=>(p.keywords||[]).some(k=>k.keyword?.toLowerCase()===key)).slice(0,12);
   for(const p of exact)list.push({type:'image',value:'https://static.arasaac.org/pictograms/'+p._id+'/'+p._id+'_300.png',source:'ARASAAC'});
  }
 }catch(e){/* Offline choices remain usable. */}
 candidates.set(key,list);return list;
}

// Curated semantic and English phonetic alternatives. These are suggestions, not corrections.
const relatedWords={
 top:['lid','cap','shelf','roof','surface'],shelf:['rack','cabinet','bookcase','ledge'],
 cashew:['peanut','almond','walnut','nut'],jar:['bottle','container','glass','lid'],
 ladder:['stairs','step','stool'],reach:['touch','grab','stretch'],
 house:['home','building','room'],water:['drink','river','rain'],
 medicine:['pill','tablet','bottle'],phone:['telephone','tablet','radio'],
 bread:['toast','rice','food'],coat:['jacket','shirt','sweater']
};
const soundWords={
 top:['tap','tip','pot','stop'],shelf:['self','shell'],cashew:['cash','casual'],
 jar:['jaw','car'],ladder:['latter','letter'],reach:['rich','ridge','beach'],
 cap:['cat','cab','cup'],lid:['lead','lit'],coat:['code','goat'],
 pen:['pin','pan'],bed:['bad','bet'],rice:['rise','lice'],
 water:['waiter'],book:['buck','look'],ship:['sheep','chip']
};
// Small reviewed Pashto concept lexicon. Do not equate romanized spellings with
// Pashto pronunciations: future phonetic search requires a tested Pashto model.
const pashtoConcepts={'کور':'house','کار':'work','اوبه':'water','ډوډۍ':'bread','کتاب':'book','مور':'mother','پلار':'father','ماشوم':'child','موټر':'car','ښوونځی':'school','ډاکټر':'doctor','پیسې':'money','چای':'tea'};
const pashtoNearForms={'کور':['کار'],'کار':['کور']};
function spokenLanguage(){
 const text=document.getElementById('original')?.textContent||'';
 return /[\u0600-\u06ff]/.test(text)?'ps':'en';
}
function pashtoPossibilities(label){
 const text=document.getElementById('original')?.textContent||'';
 const tokens=text.match(/[\u0600-\u06ff]+/g)||[];
 const possible=new Set();
 for(const token of tokens){
  const translated=pashtoConcepts[token];
  if(translated===label)for(const other of pashtoNearForms[token]||[])if(pashtoConcepts[other])possible.add(pashtoConcepts[other]);
 }
 return [...possible];
}
function nearbyConcepts(label,kind){
 if(kind==='related')return relatedWords[label]||[];
 if(spokenLanguage()==='ps')return pashtoPossibilities(label);
 return soundWords[label]||[];
}
function optionForWord(word,kind){
 const match=window.__pictureVocab?.find(v=>v.label===word||v.forms?.includes(word));
 return {word,type:'emoji',value:match?.emoji||({lid:'🫙',cap:'🧢',shelf:'📚',roof:'🏠',peanut:'🥜',almond:'🌰',walnut:'🌰',nut:'🌰',bottle:'🍾',glass:'🥛',cabinet:'🗄️',rack:'🗄️',bookcase:'📚',stairs:'🪜',step:'🪜',stool:'🪑',touch:'👆',grab:'🤲',stretch:'🙆',cash:'💵',car:'🚗',work:'🛠️',shell:'🐚',ship:'🚢',sheep:'🐑',chip:'🍟'}[word]||'🔎'),source:kind==='related'?'Related concept':'Similar sound'};
}

async function openPicker(card){
 const label=card.dataset.label,emoji=card.dataset.emoji,icon=card.dataset.icon;
 const area=modal.querySelector('.options');
 modal.querySelector('h2').textContent='Choose picture: '+label;
 modal.hidden=false;
 const request=Symbol('request');modal.activeRequest=request;
 area.replaceChildren();
 const loading=document.createElement('p');loading.textContent='Finding alternatives…';area.append(loading);
 const exact=await alternatives(label,emoji,icon);
 if(modal.hidden||modal.activeRequest!==request)return;
 area.replaceChildren();
 function addGroup(title,options){
  if(!options.length)return;
  const heading=document.createElement('h3');heading.textContent=title;
  heading.style.cssText='grid-column:1/-1;margin:10px 0 0;font-size:1rem';
  area.append(heading);
  for(const option of options){
   const button=document.createElement('button');button.type='button';button.className='option';
   button.append(option.type==='emoji'?emojiNode(option.value):sourceImage(option.value,emoji));
   const source=document.createElement('small');source.textContent=option.word?option.word+' · '+option.source:option.source;
   button.append(source);
   button.onclick=()=>{
    corrections.set(label,option);applyChoice(card,option);
    // A different concept is a proposed correction, not a verified translation.
    if(option.word&&option.word!==label){
     card.dataset.suggestedWord=option.word;
     card.setAttribute('aria-label',label+' illustrated as '+option.word+'; check the spoken word');
    }
    modal.hidden=true;
   };
   area.append(button);
  }
 }
 addGroup('Same word: different pictures',exact);
 addGroup('Similar or related things',nearbyConcepts(label,'related').map(w=>optionForWord(w,'related')));
 addGroup(spokenLanguage()==='ps'?'Similar-sounding Pashto words (limited verified vocabulary)':'Similar-sounding English words',nearbyConcepts(label,'sound').map(w=>optionForWord(w,'sound')));
 const note=document.createElement('p');note.style.cssText='grid-column:1/-1;font-size:.8rem;color:#526477';
 note.textContent='Similar-sounding words are possibilities, not confirmed speech. Choosing a picture does not change the translation. Pashto suggestions are limited to reviewed word pairs.';
 area.append(note);
}

function enhance(card){
 if(card.dataset.enhanced)return;
 card.dataset.enhanced='yes';
 const label=card.querySelector('.word')?.textContent?.trim();if(!label)return;
 card.dataset.label=label;
 const current=card.querySelector('.emoji')?.textContent;
 const vocab=window.__pictureVocab?.find(v=>v.label===label);
 card.dataset.emoji=vocab?.emoji||current||'🔎';
 card.dataset.icon=vocab?.icon||label;
 const saved=corrections.get(label);if(saved)applyChoice(card,saved);
 card.setAttribute('title','Hold for alternate pictures; slash diagonally to reject');
 card.setAttribute('tabindex','0');card.setAttribute('role','button');
 card.setAttribute('aria-label',label+'. Hold for alternatives, swipe diagonally to reject.');
 let down=null,timer=null,held=false,swiped=false;
 const clear=()=>{clearTimeout(timer);timer=null};
 const begin=(x,y)=>{
  down={x,y};held=false;swiped=false;clear();
  timer=setTimeout(()=>{if(down&&!swiped){held=true;down=null;openPicker(card)}},550);
 };
 const move=(x,y)=>{
  if(!down||held)return;
  if(Math.hypot(x-down.x,y-down.y)>15){swiped=true;clear()}
 };
 const finish=(x,y)=>{
  clear();if(!down||held){down=null;return}
  const dx=x-down.x,dy=y-down.y;down=null;
  if(Math.abs(dx)>28&&Math.abs(dy)>28&&Math.abs(dx/dy)>.35&&Math.abs(dx/dy)<3){
   card.classList.add('rejected');
   card.querySelector('.gesture-stroke')?.remove();
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.classList.add('gesture-stroke');
   const line=document.createElementNS('http://www.w3.org/2000/svg','line');
   line.setAttribute('x1',dx>0?'8':'92');line.setAttribute('y1',dy>0?'8':'92');
   line.setAttribute('x2',dx>0?'92':'8');line.setAttribute('y2',dy>0?'92':'8');
   svg.append(line);card.append(svg);setTimeout(()=>svg.remove(),700);
   corrections.delete(label);
  }
 };
 // iOS Safari may turn a held image into text selection and a diagonal drag into
 // page scrolling. Explicit non-passive touch listeners suppress those defaults.
 card.addEventListener('touchstart',e=>{
  if(e.touches.length!==1)return;
  e.preventDefault();begin(e.touches[0].clientX,e.touches[0].clientY);
 },{passive:false});
 card.addEventListener('touchmove',e=>{
  e.preventDefault();if(e.touches.length===1)move(e.touches[0].clientX,e.touches[0].clientY);
 },{passive:false});
 card.addEventListener('touchend',e=>{
  e.preventDefault();if(e.changedTouches.length)finish(e.changedTouches[0].clientX,e.changedTouches[0].clientY);
 },{passive:false});
 card.addEventListener('touchcancel',()=>{clear();down=null});
 // Mouse and trackpad fallback. Touch gestures are handled above to avoid duplicates.
 card.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0)begin(e.clientX,e.clientY)});
 card.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')move(e.clientX,e.clientY)});
 card.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')finish(e.clientX,e.clientY)});
 card.addEventListener('dragstart',e=>e.preventDefault());
 card.addEventListener('selectstart',e=>e.preventDefault());
 card.addEventListener('contextmenu',e=>{e.preventDefault();clear();down=null;openPicker(card)});
 card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPicker(card)}});
 card.addEventListener('click',e=>{if(e.detail===0)openPicker(card)});

}
function sync(){
 const text=document.getElementById('original')?.textContent+'|'+document.getElementById('result')?.textContent;
 if(text!==currentSentence){currentSentence=text;corrections.clear()}
 for(const card of stack?.querySelectorAll('.picture-card')||[])enhance(card);
}
new MutationObserver(sync).observe(stack,{childList:true});
new MutationObserver(sync).observe(document.getElementById('original'),{childList:true,subtree:true});
new MutationObserver(sync).observe(document.getElementById('result'),{childList:true,subtree:true});
sync();

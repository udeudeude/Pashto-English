// Teacher pictogram correction controls. No generated imagery; uses existing licensed sources.
const column=document.getElementById('picture-column');
const stack=column?.querySelector('.picture-stack');
const corrections=new Map();
const candidates=new Map();
let currentSentence='';
const css=document.createElement('style');
css.textContent=`
.picture-card{position:relative;touch-action:pan-y;user-select:none;-webkit-user-select:none}
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
async function openPicker(card){
 const label=card.dataset.label,emoji=card.dataset.emoji,icon=card.dataset.icon;
 const area=modal.querySelector('.options');area.replaceChildren();modal.querySelector('h2').textContent='Choose picture: '+label;
 modal.hidden=false;
 const loading=document.createElement('p');loading.textContent='Finding alternatives…';area.append(loading);
 const options=await alternatives(label,emoji,icon);
 if(modal.hidden)return;
 area.replaceChildren();
 for(const option of options){
  const button=document.createElement('button');button.type='button';button.className='option';
  button.append(option.type==='emoji'?emojiNode(option.value):sourceImage(option.value,emoji));
  const source=document.createElement('small');source.textContent=option.source;button.append(source);
  button.onclick=()=>{corrections.set(label,option);applyChoice(card,option);modal.hidden=true};
  area.append(button);
 }
 if(!options.length)area.textContent='No alternatives available.';
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
 let down=null,timer=null,held=false,stroke=null;
 const clear=()=>{clearTimeout(timer);timer=null};
 card.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  down={x:e.clientX,y:e.clientY,time:Date.now()};held=false;
  clear();timer=setTimeout(()=>{if(down){held=true;openPicker(card)}},650);
 });
 card.addEventListener('pointermove',e=>{
  if(!down||held)return;
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>12)clear();
 });
 card.addEventListener('pointerup',e=>{
  clear();if(!down||held){down=null;return}
  const dx=e.clientX-down.x,dy=e.clientY-down.y;down=null;
  if(Math.abs(dx)>32&&Math.abs(dy)>32&&Math.abs(dx/dy)>.35&&Math.abs(dx/dy)<3){
   card.classList.add('rejected');
   const old=card.querySelector('.gesture-stroke');old?.remove();
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.classList.add('gesture-stroke');
   const line=document.createElementNS('http://www.w3.org/2000/svg','line');
   line.setAttribute('x1',dx>0?'8':'92');line.setAttribute('y1',dy>0?'8':'92');
   line.setAttribute('x2',dx>0?'92':'8');line.setAttribute('y2',dy>0?'92':'8');
   svg.append(line);card.append(svg);setTimeout(()=>svg.remove(),800);
   corrections.delete(label);
  }
 });
 card.addEventListener('pointercancel',()=>{clear();down=null});
 card.addEventListener('contextmenu',e=>{e.preventDefault();clear();openPicker(card)});
 card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPicker(card)}});
 card.addEventListener('click',()=>{if(card.classList.contains('rejected'))openPicker(card)});
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

// Vocabulary visualization: ordered English tokens, with a consistent picture column.
// External libraries are optional enhancements. Emoji always remain as a fallback.
const words = [
 ['house','🏠','home','house houses home homes'],
 ['person','🧍','user','person people human'],
 ['child','🧒','user','child children kid kids baby babies'],
 ['family','👨‍👩‍👧','group','family families'],
 ['mother','👩','user','mother mom mum'],['father','👨','user','father dad'],
 ['teacher','🧑‍🏫','user','teacher teachers'],['doctor','🧑‍⚕️','user','doctor doctors'],
 ['school','🏫','school','school schools'],['hospital','🏥','hospital','hospital hospitals'],
 ['store','🏪','shop','store stores shop shops market markets'],
 ['bathroom','🚻','bathroom','bathroom bathrooms toilet toilets restroom restrooms'],
 ['car','🚗','car','car cars'],['bus','🚌','bus','bus buses'],['train','🚆','train','train trains'],
 ['bike','🚲','bicycle','bike bikes bicycle bicycles'],['phone','📱','smartphone-device','phone phones telephone telephones'],
 ['book','📖','book','book books'],['pen','🖊️','edit-pencil','pen pens pencil pencils'],
 ['paper','📄','page','paper papers'],['key','🔑','key','key keys'],['door','🚪','door','door doors'],
 ['chair','🪑','chair','chair chairs'],['bed','🛏️','bed','bed beds'],['table','🪑','table','table tables'],
 ['clock','🕒','clock','clock clocks time'],['money','💵','coins','money cash dollar dollars'],
 ['water','💧','droplet','water'],['food','🍽️','cutlery','food meal meals'],
 ['bread','🍞','bread-slice','bread'],['rice','🍚','bowl','rice'],['milk','🥛','glass','milk'],
 ['tea','🍵','cup','tea'],['coffee','☕','coffee-cup','coffee'],
 ['apple','🍎','apple','apple apples'],['banana','🍌','fruit','banana bananas'],
 ['egg','🥚','egg','egg eggs'],['medicine','💊','pharmacy-cross-circle','medicine medicines pill pills'],
 ['shirt','👕','t-shirt','shirt shirts'],['shoe','👟','sneaker','shoe shoes'],
 ['coat','🧥','shirt','coat coats'],['hand','✋','hand','hand hands'],
 ['foot','🦶','footprints','foot feet'],['eye','👁️','eye','eye eyes'],
 ['ear','👂','ear','ear ears'],['head','👤','user','head heads'],
 ['dog','🐕','dog','dog dogs'],['cat','🐈','cat','cat cats'],
 ['tree','🌳','tree','tree trees'],['flower','🌼','flower','flower flowers'],
 ['sun','☀️','sun-light','sun'],['moon','🌙','half-moon','moon'],
 ['rain','🌧️','rain','rain'],['snow','❄️','snow-flake','snow'],
 ['fire','🔥','fire-flame','fire'],['road','🛣️','road','road roads street streets'],
 ['eat','🍽️','cutlery','eat eats eating ate eaten'],
 ['drink','🥤','glass','drink drinks drinking drank drunk'],
 ['sleep','😴','bed','sleep sleeps sleeping slept'],
 ['walk','🚶','walking','walk walks walking walked'],
 ['run','🏃','running','run runs running ran'],
 ['sit','🪑','chair','sit sits sitting sat'],
 ['stand','🧍','user','stand stands standing stood'],
 ['read','📖','book','read reads reading'],
 ['write','✍️','edit-pencil','write writes writing wrote written'],
 ['listen','👂','ear','listen listens listening listened hear hears hearing heard'],
 ['speak','🗣️','voice','speak speaks speaking spoke spoken talk talks talking talked'],
 ['look','👀','eye','look looks looking looked see sees seeing saw seen'],
 ['go','➡️','arrow-right','go goes going went gone'],
 ['come','⬅️','arrow-left','come comes coming came'],
 ['stop','🛑','stop','stop stops stopping stopped'],
 ['help','🤝','hand','help helps helping helped'],
 ['wash','🧼','washing-machine','wash washes washing washed'],
 ['cook','🍳','cooking','cook cooks cooking cooked'],
 ['open','📂','open-new-window','open opens opening opened'],
 ['close','🚪','lock','close closes closing closed shut'],
 ['give','🤲','hand','give gives giving gave given'],
 ['buy','🛒','cart','buy buys buying bought'],
 ['pay','💳','credit-card','pay pays paying paid'],
 ['work','🛠️','tools','work works working worked'],
 ['happy','😊','emoji','happy happier happiest glad joyful'],
 ['sad','😢','emoji-sad','sad sadder saddest unhappy'],
 ['angry','😠','emoji-angry','angry angrier angriest'],
 ['sick','🤒','healthcare','sick ill unwell'],
 ['hot','🔥','fire-flame','hot hotter hottest warm warmer'],
 ['cold','🥶','snow-flake','cold colder coldest chilly'],
 ['big','🐘','expand','big bigger biggest large larger largest'],
 ['small','🐜','collapse','small smaller smallest little tiny'],
 ['fast','⚡','flash','fast faster fastest quick quicker quickest'],
 ['slow','🐢','hourglass','slow slower slowest'],
 ['good','👍','thumbs-up','good better best'],
 ['bad','👎','thumbs-down','bad worse worst'],
 ['yes','✅','check-circle','yes'],['no','❌','cancel','no'],
 ['up','⬆️','arrow-up','up above'],['down','⬇️','arrow-down','down below'],
 ['left','⬅️','arrow-left','left'],['right','➡️','arrow-right','right'],
 ['one','1️⃣','number-1-square','one'],['two','2️⃣','number-2-square','two'],
 ['three','3️⃣','number-3-square','three']
].map(([label,emoji,icon,forms])=>({label,emoji,icon,forms:forms.split(' ')}));

window.__pictureVocab=words;
const result=document.getElementById('result');
const original=document.getElementById('original');
const main=document.querySelector('main');
main.classList.add('visual-layout');
const aside=document.createElement('aside');
aside.id='picture-column';
aside.className='picture-column';
aside.setAttribute('aria-label','Illustrations in English word order / انځورونه د انګلیسي کلمو په ترتیب');
const heading=document.createElement('h2');heading.textContent='Pictures / انځورونه';heading.className='picture-heading';
const stack=document.createElement('div');stack.className='picture-stack';
const picker=document.createElement('select');picker.setAttribute('aria-label','Picture source / د انځور سرچینه');
for(const [value,label] of [['arasaac','ARASAAC'],['iconoir','Iconoir'],['emoji','Emoji / ایموجي']]){
 const option=document.createElement('option');option.value=value;option.textContent=label;picker.append(option);
}
picker.value='arasaac';
aside.append(heading,picker,stack);
const content=document.createElement('div');content.className='content-column';
while(main.firstChild)content.append(main.firstChild);
main.append(aside,content);
const style=document.createElement('style');
style.textContent=`
.visual-layout{max-width:950px;display:grid;grid-template-columns:minmax(110px,28%) minmax(0,1fr);gap:12px;padding:12px;align-items:start}
.picture-column{position:sticky;top:8px;max-height:calc(100dvh - 16px);overflow:auto;background:white;border:1px solid #dce3e9;border-radius:16px;padding:10px 6px;min-height:65vh}
.picture-heading{text-align:center;font-size:1rem;margin:3px 0 8px}
#picture-column select{width:100%;max-width:100%;font:inherit;font-size:.78rem;margin-bottom:10px}
.picture-stack{display:flex;flex-direction:column;gap:10px}
.picture-card{border:1px solid #dce3e9;border-radius:12px;min-height:92px;padding:8px 3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:#f8fafc}
.picture-card img{width:68px;height:68px;object-fit:contain}
.picture-card .emoji{font-size:2.8rem;line-height:1.3}
.picture-card .word{font-size:.83rem;text-align:center;overflow-wrap:anywhere}
.content-column{min-width:0}.content-column .panel{padding:14px;margin:12px 0}
.content-column h1{font-size:1.3rem}.content-column .choices{gap:8px}
.content-column .choices button{font-size:1rem;padding:12px 4px;min-height:85px}
@media(min-width:650px){.visual-layout{grid-template-columns:185px minmax(0,1fr);gap:20px;padding:24px}}
`;
document.head.append(style);
const stop=new Set('i me my mine you your yours he she it we they them the a an to of in on at for from with by and or but is are was were be been being have has had do does did need needs needed can could would should will this that these those there here as if then than into onto about today tomorrow before after very just please'.split(' '));
const irregular={cashews:'cashew',shelves:'shelf',knives:'knife',feet:'foot',teeth:'tooth',children:'child',men:'man',women:'woman'};
const emoji={ladder:'🪜',cashew:'❔',jar:'🫙',shelf:'❔',faucet:'🚰',mattress:'🛏️',curtain:'🪟',hinge:'🚪',washer:'🔩'};
const verifiedSearch={ladder:'ladder',jar:'jar',shelf:null,cashew:null};
const iconCache=new Map();
let renderVersion=0;
function englishText(){
 // Do not show apparently verified pictures when translation is missing or failed.
 // The source transcript may exist even after a translation error.
 if(result.getAttribute('lang')==='en')return result.textContent;
 if(result.getAttribute('lang')==='ps')return original.textContent;
 return '';
}
function matches(){
 const tokens=englishText().toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)||[];
 const output=[];
 for(const token of tokens){
  if(stop.has(token))continue;
  const known=words.find(w=>w.forms.includes(token));
  const base=irregular[token]||(token.endsWith('ies')?token.slice(0,-3)+'y':token.endsWith('s')&&!token.endsWith('ss')?token.slice(0,-1):token);
  // Unknown words are not assumed to be nouns. Search only if a vetted entry exists.
  if(known)output.push(known);
  else if(Object.hasOwn(verifiedSearch,base))output.push({label:base,emoji:emoji[base]||'🔎',icon:base,unknown:true});
  if(output.length>=30)break;
 }
 return output;
}
function emojiNode(value){
 const span=document.createElement('span');span.className='emoji';span.textContent=value;span.setAttribute('aria-hidden','true');return span;
}
function imageNode(src,emojiFallback){
 const img=document.createElement('img');img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.src=src;
 img.onerror=()=>img.replaceWith(emojiNode(emojiFallback));
 return img;
}
// Prefer real pictograms, use emoji only when no matching image is accessible.
// "shelf" and "cashew" must not be silently replaced with books or peanuts.
async function availablePicture(item,card,version,sourceName){
 const catalog=window.pictureCatalog;
 if(!catalog)return;
 let visual=card.querySelector(':scope > img, :scope > .emoji');
 const isCurrent=()=>version===renderVersion&&card.isConnected;
 function show(choice,fallback){
  if(!isCurrent()||!choice?.url)return;
  const previous=card.querySelector(':scope > img, :scope > .emoji');
  if(!previous)return;
  if(previous.tagName==='IMG'&&previous.src===choice.url)return;
  const img=document.createElement('img');
  img.src=choice.url;
  img.alt='';
  img.draggable=false;
  img.loading='lazy';
  img.referrerPolicy='no-referrer';
  img.title=item.label+' · '+choice.source;
  img.onerror=()=>{
   if(!isCurrent()||!img.isConnected)return;
   if(fallback)fallback();else img.replaceWith(emojiNode(item.emoji));
  };
  previous.replaceWith(img);
 }
 // A small set of manually mapped icons can appear immediately; ARASAAC
 // results then replace them if a better matching image is available.
 const immediate=catalog.immediate(item.label);
 if(immediate?.length)show(immediate[0]);
 const pictures=await catalog.find(item.label,{
  max:6,prefer:sourceName==='iconoir'?'iconify':'arasaac'
 }).catch(()=>[]);
 if(!isCurrent()||!pictures.length)return;
 let index=0;
 function next(){
  if(index>=pictures.length){
   // Keep the valid existing icon if all returned image URLs fail.
   const fallback=immediate?.[0];
   if(fallback)show(fallback,()=>{const old=card.querySelector(':scope > img');old?.replaceWith(emojiNode(item.emoji))});
   else{
    const old=card.querySelector(':scope > img');
    old?.replaceWith(emojiNode(item.emoji));
   }
   return;
  }
  const candidate=pictures[index++];
  show(candidate,next);
 }
 next();
}
function draw(){
 const version=++renderVersion;
 stack.replaceChildren();
 const items=matches();
 if(!items.length){
  const p=document.createElement('p');p.className='muted';p.textContent='Pictures appear after translation. / انځورونه له ژباړې وروسته ښکاري.';p.style.fontSize='.8rem';stack.append(p);return;
 }
 for(const item of items){
  const card=document.createElement('div');card.className='picture-card';
  const fallback=emojiNode(item.emoji);
  if(picker.value==='emoji')card.append(fallback);
  else {
   card.append(fallback);
   availablePicture(item,card,version,picker.value);
  }
  const label=document.createElement('span');label.className='word';label.textContent=item.label;card.append(label);stack.append(card);
 }
}
picker.onchange=draw;
new MutationObserver(draw).observe(result,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['lang']});
new MutationObserver(draw).observe(original,{childList:true,characterData:true,subtree:true});
draw();

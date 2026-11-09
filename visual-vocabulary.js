// Vocabulary visualization: ordered English tokens, with a consistent picture column.
// External libraries are optional enhancements. Emoji always remain as a fallback.
const words = [
 ['house','🏠','home','house houses home homes','home'],
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
const englishResult=document.getElementById('result'),original=document.getElementById('original');
const main=document.querySelector('main');
main.classList.add('visual-layout');
const pictureColumn=document.createElement('aside');pictureColumn.id='picture-column';pictureColumn.setAttribute('aria-label','Pictures in spoken word order');
const pictureHeading=document.createElement('div');pictureHeading.className='picture-heading';pictureHeading.textContent='Pictures';
const pictureStack=document.createElement('div');pictureStack.className='picture-stack';
const sourcePicker=document.createElement('select');sourcePicker.setAttribute('aria-label','Picture source');sourcePicker.style.cssText='width:100%;font:inherit;font-size:.75rem;margin-bottom:10px';
for(const [value,label] of [['iconoir','Iconoir + emoji'],['arasaac','ARASAAC + emoji'],['emoji','Emoji only']]){const option=document.createElement('option');option.value=value;option.textContent=label;sourcePicker.append(option)}
sourcePicker.value='arasaac';
sourcePicker.onchange=()=>renderPictures();
pictureColumn.append(pictureHeading,sourcePicker,pictureStack);
const contentColumn=document.createElement('div');contentColumn.className='content-column';
while(main.firstChild)contentColumn.append(main.firstChild);
main.append(pictureColumn,contentColumn);
const css=document.createElement('style');
css.textContent=`
main.visual-layout{max-width:850px;display:grid;grid-template-columns:minmax(92px,27%) minmax(0,1fr);gap:12px;align-items:start;padding:12px 10px 50px}
.picture-column{background:#fff;border:1px solid #dce3e9;border-radius:18px;min-height:70vh;padding:10px 6px;position:sticky;top:8px;max-height:calc(100dvh - 16px);overflow-y:auto}
.picture-heading{text-align:center;color:#536578;font-size:.85rem;font-weight:700;margin:4px 0 10px}
.picture-stack{display:flex;flex-direction:column;gap:12px;align-items:stretch}
.picture-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1px solid #e1e6ec;border-radius:12px;padding:9px 3px;background:#f7f9fc;min-height:88px}
.picture-card .emoji{font-size:2.5rem;line-height:1.2}
.picture-card img{width:54px;height:54px;object-fit:contain}
.picture-card .word{font-size:.78rem;text-align:center;overflow-wrap:anywhere}
.picture-card .source{font-size:.58rem;color:#667788}
.content-column{min-width:0}.content-column .panel{padding:14px;margin:12px 0}
.content-column h1{font-size:1.3rem}.content-column .choices{gap:8px}
.content-column .choices button{font-size:1rem;padding:12px 4px;min-height:85px}
@media(min-width:650px){main.visual-layout{grid-template-columns:185px minmax(0,1fr);gap:20px;padding:24px}.picture-column{padding:14px}}
`;
document.head.append(css);
function tokens(text){return [...text.toLowerCase().matchAll(/[a-z]+(?:'[a-z]+)?/g)].map(m=>m[0])}
const ignored=new Set('i me my mine you your he she it we they the a an to of in on at for from with by and or but is are was were be been being have has had do does did need needs needed can could would should will this that these those there here as if then than into onto about today tomorrow before after very just please'.split(' '));
const irregular={cashews:'cashew',shelves:'shelf',knives:'knife',feet:'foot',teeth:'tooth',children:'child',men:'man',women:'woman'};
const fallbackEmoji={ladder:'🪜',cashew:'🥜',jar:'🫙',shelf:'🗄️',faucet:'🚰',mattress:'🛏️',curtain:'🪟',hinge:'🚪',washer:'🔩'};
function visualMatches(){
 const english=englishResult.lang==='en'?englishResult.textContent:original.textContent;
 const result=[];
 for(const token of tokens(english)){
  const item=words.find(entry=>entry.forms.includes(token));
  if(item)result.push(item);
  else if(!ignored.has(token)&&token.length>2){
   const base=irregular[token]||(token.endsWith('ies')?token.slice(0,-3)+'y':token.endsWith('s')&&!token.endsWith('ss')?token.slice(0,-1):token);
   result.push({label:base,emoji:fallbackEmoji[base]||'🔎',icon:base,unknown:true});
  }
 }
 return result.slice(0,40);
}
async function arasaacImage(item,placeholder){
 try{
  const response=await fetch('https://api.arasaac.org/v1/pictograms/en/search/'+encodeURIComponent(item.label));
  if(!response.ok)throw Error('not found');
  const results=await response.json();
  const exact=results.find(x=>(x.keywords||[]).some(k=>k.keyword?.toLowerCase()===item.label));
  if(!exact?._id)throw Error('no exact match');
  const img=document.createElement('img');img.alt='';img.loading='lazy';img.src='https://static.arasaac.org/pictograms/'+exact._id+'/'+exact._id+'_300.png';
  img.onerror=()=>img.replaceWith(emojiElement(item.emoji));
  if(placeholder.isConnected)placeholder.replaceWith(img);
 }catch(e){/* Keep the emoji fallback if ARASAAC is unavailable. */}
}
function iconElement(item){
 const img=document.createElement('img');
 img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
 img.src='https://api.iconify.design/iconoir/'+encodeURIComponent(item.icon)+'.svg';
 img.onerror=()=>{img.replaceWith(emojiElement(item.emoji))};
 return img;
}
function emojiElement(emoji){const span=document.createElement('span');span.className='emoji';span.textContent=emoji;span.setAttribute('aria-hidden','true');return span}
function renderPictures(){
 pictureStack.replaceChildren();
 const matches=visualMatches();
 for(const item of matches){
  const card=document.createElement('div');card.className='picture-card';
  if(sourcePicker.value==='emoji')card.append(emojiElement(item.emoji));
  else if(sourcePicker.value==='arasaac'){
   const placeholder=emojiElement(item.emoji);card.append(placeholder);arasaacImage(item,placeholder);
  }else if(item.unknown){const placeholder=emojiElement(item.emoji);card.append(placeholder);arasaacImage(item,placeholder)}
  else card.append(iconElement(item));
  const label=document.createElement('span');label.className='word';label.textContent=item.label;
  card.append(label);pictureStack.append(card);
 }
 if(!matches.length){
  const message=document.createElement('p');message.className='muted';message.style.fontSize='.8rem';
  message.textContent='Pictures appear here after speech is translated.';pictureStack.append(message);
 }
}
new MutationObserver(renderPictures).observe(englishResult,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['lang']});
new MutationObserver(renderPictures).observe(original,{childList:true,characterData:true,subtree:true});
renderPictures();

const credits=document.createElement('p');credits.className='muted';credits.style.cssText='font-size:.68rem;line-height:1.35;margin-top:12px';credits.textContent='Iconoir: MIT license. ARASAAC pictograms: Government of Aragon / Sergio Palao, CC BY-NC-SA 4.0; used here for noncommercial educational purposes. Emoji: device fonts. ARASAAC matching is experimental.';pictureColumn.append(credits);

// Small, offline, conservative English noun-to-pictogram dictionary.
// Only shows matches in the English transcript/translation, not arbitrary Pashto text.
// A dictionary is intentionally used instead of guessing what unfamiliar words mean.
const entries = [
 ['person','🧍',['person','people','man','men','woman','women','adult','adults']],
 ['child','🧒',['child','children','kid','kids','baby','babies']],
 ['family','👨‍👩‍👧',['family','families']],['mother','👩',['mother','mom','mum']],
 ['father','👨',['father','dad']],['teacher','🧑‍🏫',['teacher','teachers']],
 ['doctor','🧑‍⚕️',['doctor','doctors']],['nurse','🧑‍⚕️',['nurse','nurses']],
 ['friend','🧑‍🤝‍🧑',['friend','friends']],['house','🏠',['house','houses','home','homes']],
 ['school','🏫',['school','schools']],['hospital','🏥',['hospital','hospitals']],
 ['store','🏪',['store','stores','shop','shops']],['bathroom','🚻',['bathroom','bathrooms','toilet','toilets','restroom','restrooms']],
 ['car','🚗',['car','cars']],['bus','🚌',['bus','buses']],['train','🚆',['train','trains']],
 ['bicycle','🚲',['bicycle','bicycles','bike','bikes']],['phone','📱',['phone','phones','telephone','telephones']],
 ['book','📖',['book','books']],['pen','🖊️',['pen','pens']],['pencil','✏️',['pencil','pencils']],
 ['paper','📄',['paper','papers']],['key','🔑',['key','keys']],['door','🚪',['door','doors']],
 ['chair','🪑',['chair','chairs']],['bed','🛏️',['bed','beds']],['table','🪑',['table','tables']],
 ['clock','🕒',['clock','clocks']],['money','💵',['money','cash','dollar','dollars']],
 ['water','💧',['water']],['food','🍽️',['food','meal','meals']],['bread','🍞',['bread']],
 ['rice','🍚',['rice']],['milk','🥛',['milk']],['tea','🍵',['tea']],
 ['coffee','☕',['coffee']],['apple','🍎',['apple','apples']],['banana','🍌',['banana','bananas']],
 ['egg','🥚',['egg','eggs']],['medicine','💊',['medicine','medicines','pill','pills']],
 ['shirt','👕',['shirt','shirts']],['shoe','👟',['shoe','shoes']],['coat','🧥',['coat','coats']],
 ['hand','✋',['hand','hands']],['foot','🦶',['foot','feet']],['eye','👁️',['eye','eyes']],
 ['ear','👂',['ear','ears']],['head','👤',['head','heads']],['dog','🐕',['dog','dogs']],
 ['cat','🐈',['cat','cats']],['tree','🌳',['tree','trees']],['flower','🌼',['flower','flowers']],
 ['sun','☀️',['sun']],['moon','🌙',['moon']],['rain','🌧️',['rain']],
 ['snow','❄️',['snow']],['fire','🔥',['fire']],['road','🛣️',['road','roads','street','streets']]
];
const root=document.getElementById('result');
const section=document.createElement('section');
section.className='panel';section.id='noun-icons';section.hidden=true;
section.setAttribute('aria-label','Pictures for recognized nouns');
const heading=document.createElement('h2');heading.textContent='Pictures';heading.style.fontSize='1.15rem';
const grid=document.createElement('div');grid.className='noun-grid';
section.append(heading,grid);
root.closest('section').after(section);
const style=document.createElement('style');
style.textContent='.noun-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(95px,1fr));gap:12px}.noun-card{border:1px solid #dce3e9;border-radius:14px;padding:10px 5px;text-align:center;background:#f8fafc}.noun-card .picture{display:block;font-size:3.1rem;line-height:1.4}.noun-card .word{display:block;font-size:.9rem;overflow-wrap:anywhere}';
document.head.append(style);
function render(){
 const english=root.lang==='en'?root.textContent:(document.getElementById('original')?.textContent||'');
 // When translation is Pashto, the original English utterance is the source.
 const normalized=english.toLowerCase().replace(/[^a-z\s'-]/g,' ');
 const words=new Set(normalized.split(/\s+/).filter(Boolean));
 const found=entries.filter(([, ,variants])=>variants.some(word=>words.has(word))).slice(0,12);
 grid.replaceChildren();
 for(const [label,emoji] of found){
  const card=document.createElement('div');card.className='noun-card';
  const picture=document.createElement('span');picture.className='picture';picture.textContent=emoji;picture.setAttribute('aria-hidden','true');
  const word=document.createElement('span');word.className='word';word.textContent=label;
  card.append(picture,word);grid.append(card);
 }
 section.hidden=found.length===0;
}
new MutationObserver(render).observe(root,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['lang']});
new MutationObserver(render).observe(document.getElementById('original'),{childList:true,characterData:true,subtree:true});
render();

// English content-word matching for a wider visual vocabulary.
// Articles, auxiliary verbs, and similar grammar words are not separate pictures.
const additions=[
 ['need','🤲','hand','need needs needed needing'],
 ['want','🙋','hand','want wants wanted wanting'],
 ['ask','❓','help-circle','ask asks asked asking question questions'],
 ['answer','💬','chat-bubble','answer answers answered answering reply replies replied'],
 ['show','👀','eye','show shows showing showed shown'],
 ['bring','🤲','hand','bring brings bringing brought'],
 ['carry','📦','package','carry carries carried carrying'],
 ['take','🤲','hand','take takes took taken taking'],
 ['put','📦','package','put puts putting placed placing'],
 ['make','🛠️','tools','make makes making made build builds built building'],
 ['find','🔎','search','find finds finding found search searching searched'],
 ['use','🛠️','tools','use uses using used'],
 ['wait','⏳','timer','wait waits waiting waited'],
 ['try','🔄','refresh','try tries tried trying'],
 ['repeat','🔁','repeat','repeat repeats repeated repeating'],
 ['understand','💡','light-bulb','understand understands understood understanding'],
 ['learn','🧠','book','learn learns learned learning'],
 ['teach','👨‍🏫','school','teach teaches teaching taught'],
 ['meet','🤝','group','meet meets meeting met'],
 ['leave','🚶','exit','leave leaves leaving left'],
 ['arrive','🏁','flag','arrive arrives arrived arriving'],
 ['move','↔️','arrows-cross','move moves moved moving'],
 ['turn','↩️','undo','turn turns turned turning'],
 ['hold','✋','hand','hold holds held holding'],
 ['touch','👆','hand','touch touches touching touched'],
 ['reach','🙋','hand','reach reaches reaching reached'],
 ['point','👉','hand','point points pointed pointing'],
 ['choose','✅','check-circle','choose chooses chosen choosing chose select selected'],
 ['change','🔄','refresh','change changes changed changing'],
 ['fix','🔧','tools','fix fixes fixed fixing repair repaired'],
 ['break','💔','broken-heart','break breaks breaking broke broken'],
 ['cut','✂️','scissors','cut cuts cutting'],
 ['clean','🧹','broom','clean cleans cleaning cleaned'],
 ['dirty','🧹','broom','dirty dirt'],
 ['lift','⬆️','arrow-up','lift lifts lifting lifted raise raised raising'],
 ['drop','⬇️','arrow-down','drop drops dropped dropping'],
 ['push','👉','hand','push pushes pushing pushed'],
 ['pull','🤲','hand','pull pulls pulling pulled'],
 ['fill','🫗','glass','fill fills filled filling'],
 ['empty','🫙','glass','empty empties emptied emptying'],
 ['start','▶️','play','start starts started starting begin begins began'],
 ['finish','🏁','flag','finish finishes finished finishing end ends ended ending'],
 ['remember','🧠','brain','remember remembers remembered remembering'],
 ['forget','❔','help-circle','forget forgets forgetting forgot forgotten'],
 ['know','💡','light-bulb','know knows known knowing knew'],
 ['think','💭','chat-bubble','think thinks thought thinking'],
 ['feel','❤️','heart','feel feels felt feeling'],
 ['like','❤️','heart','like likes liked liking love loves loved loving'],
 ['smile','🙂','emoji','smile smiles smiling smiled'],
 ['cry','😭','emoji-sad','cry cries cried crying'],
 ['laugh','😂','emoji','laugh laughs laughed laughing'],
 ['call','📞','phone','call calls called calling'],
 ['send','📤','send','send sends sent sending'],
 ['receive','📥','download','receive receives received receiving'],
 ['explain','🗣️','voice','explain explains explained explaining'],
 ['play','⚽','play','play plays played playing'],
 ['drive','🚙','car','drive drives driving drove driven'],
 ['ride','🚲','bicycle','ride rides rode riding ridden'],
 ['fly','✈️','airplane','fly flies flew flown flying'],
 ['swim','🏊','swimming','swim swims swam swimming'],
 ['climb','🧗','ladder','climb climbs climbed climbing'],
 ['jump','🤸','activity','jump jumps jumped jumping'],
 ['fall','⬇️','arrow-down','fall falls fell fallen falling'],
 ['friend','🧑‍🤝‍🧑','group','friend friends friendship'],
 ['neighbor','🏘️','home','neighbor neighbors neighbour neighbours'],
 ['man','👨','user','man men gentleman'],
 ['woman','👩','user','woman women lady ladies'],
 ['baby','👶','user','baby babies infant infants'],
 ['grandmother','👵','user','grandmother grandma granny'],
 ['grandfather','👴','user','grandfather grandpa granddad'],
 ['brother','👦','user','brother brothers'],
 ['sister','👧','user','sister sisters'],
 ['son','👦','user','son sons'],
 ['daughter','👧','user','daughter daughters'],
 ['name','🏷️','tag','name names named'],
 ['address','🏠','home','address addresses'],
 ['number','🔢','calculator','number numbers'],
 ['picture','🖼️','picture','picture pictures photo photos photograph photographs image images'],
 ['color','🎨','palette','color colors colour colours'],
 ['red','🔴','circle','red reddish'],
 ['blue','🔵','circle','blue bluish'],
 ['green','🟢','circle','green'],
 ['yellow','🟡','circle','yellow'],
 ['black','⚫','circle','black'],
 ['white','⚪','circle','white'],
 ['orange','🟠','circle','orange'],
 ['purple','🟣','circle','purple'],
 ['round','⚪','circle','round circular circle circles'],
 ['square','🟥','square','square squares'],
 ['triangle','🔺','triangle','triangle triangles'],
 ['long','📏','ruler','long longer longest'],
 ['short','📏','ruler','short shorter shortest'],
 ['heavy','🏋️','weight','heavy heavier heaviest'],
 ['full','🥛','glass','full fully'],
 ['new','✨','sparkles','new newer newest'],
 ['old','🏚️','home','old older oldest'],
 ['near','📍','map-pin','near nearby'],
 ['far','🗺️','map','far farther farthest'],
 ['inside','📦','package','inside indoors'],
 ['outside','🏞️','map','outside outdoors'],
 ['today','📅','calendar','today'],
 ['tomorrow','📅','calendar','tomorrow'],
 ['yesterday','📅','calendar','yesterday'],
 ['morning','🌅','sunrise','morning mornings'],
 ['afternoon','🌤️','sun-light','afternoon afternoons'],
 ['evening','🌇','sunset','evening evenings'],
 ['night','🌃','moon','night nights tonight'],
 ['day','☀️','sun-light','day days'],
 ['week','📅','calendar','week weeks'],
 ['month','📅','calendar','month months'],
 ['year','📅','calendar','year years'],
 ['minute','⏱️','timer','minute minutes'],
 ['hour','🕐','clock','hour hours'],
 ['early','⏰','clock','early earlier earliest'],
 ['late','⏰','clock','late later latest'],
 ['first','1️⃣','number-1-square','first'],
 ['last','🔚','flag','last final'],
 ['hungry','🍽️','cutlery','hungry hunger'],
 ['thirsty','🥤','glass','thirsty thirst'],
 ['tired','😴','bed','tired exhaustion exhausted'],
 ['hurt','🤕','healthcare','hurt hurts hurting injury injured'],
 ['pain','🤕','healthcare','pain painful ache aches aching'],
 ['healthy','💚','heart','healthy health'],
 ['safe','🛡️','shield','safe safety'],
 ['danger','⚠️','warning','danger dangerous hazard hazards'],
 ['important','❗','warning','important importance'],
 ['easy','✅','check-circle','easy easier easiest'],
 ['difficult','🧩','puzzle','difficult difficulty hard harder hardest'],
 ['same','🟰','equal','same identical equal'],
 ['different','≠','not-equal','different difference'],
 ['not','❌','cancel','not never without'],
 ['bottle','🍶','glass','bottle bottles'],
 ['cup','🥤','cup','cup cups'],
 ['plate','🍽️','cutlery','plate plates'],
 ['bowl','🥣','bowl','bowl bowls'],
 ['spoon','🥄','cutlery','spoon spoons'],
 ['fork','🍴','cutlery','fork forks'],
 ['knife','🔪','cutlery','knife knives'],
 ['pot','🍲','cooking','pot pots pan pans'],
 ['kitchen','🍳','cooking','kitchen kitchens'],
 ['fridge','🧊','fridge','fridge refrigerator refrigerators'],
 ['stove','♨️','cooking','stove stoves oven ovens'],
 ['sink','🚰','droplet','sink sinks'],
 ['soap','🧼','soap','soap'],
 ['towel','🧻','page','towel towels'],
 ['toothbrush','🪥','healthcare','toothbrush toothbrushes'],
 ['clothes','👕','shirt','clothes clothing'],
 ['pants','👖','pants','pants trousers'],
 ['hat','🧢','cap','hat hats'],
 ['socks','🧦','sock','socks sock'],
 ['gloves','🧤','hand','glove gloves'],
 ['bag','👜','bag','bag bags backpack backpacks'],
 ['box','📦','package','box boxes'],
 ['jar','🫙','glass','jar jars'],
 ['shelf','❔','bookshelf','shelf shelves'],
 ['ladder','🪜','ladder','ladder ladders'],
 ['stairs','🪜','stairs','stair stairs stairway stairways'],
 ['roof','🏠','home','roof roofs'],
 ['window','🪟','window','window windows'],
 ['wall','🧱','wall','wall walls'],
 ['floor','🟫','floor','floor floors'],
 ['ceiling','⬆️','home','ceiling ceilings'],
 ['room','🚪','home','room rooms'],
 ['garden','🌱','garden','garden gardens'],
 ['farm','🚜','tractor','farm farms'],
 ['field','🌾','leaf','field fields'],
 ['mountain','🏔️','mountain','mountain mountains'],
 ['river','🏞️','river','river rivers'],
 ['lake','🏞️','water','lake lakes'],
 ['ocean','🌊','water','ocean oceans sea seas'],
 ['beach','🏖️','beach','beach beaches'],
 ['bird','🐦','bird','bird birds'],
 ['fish','🐟','fish','fish fishes'],
 ['horse','🐎','horse','horse horses'],
 ['cow','🐄','cow','cow cows'],
 ['goat','🐐','goat','goat goats'],
 ['chicken','🐔','bird','chicken chickens'],
 ['sheep','🐑','sheep','sheep'],
 ['spider','🕷️','bug','spider spiders'],
 ['insect','🐞','bug','insect insects bug bugs'],
 ['pencil','✏️','edit-pencil','pencil pencils'],
 ['eraser','◻️','erase','eraser erasers'],
 ['notebook','📓','book','notebook notebooks'],
 ['classroom','🏫','school','classroom classrooms'],
 ['lesson','📖','book','lesson lessons'],
 ['homework','📝','edit-pencil','homework assignment assignments'],
 ['student','🧑‍🎓','school','student students pupil pupils'],
 ['library','📚','book','library libraries'],
 ['test','📝','edit-pencil','test tests exam exams quiz quizzes'],
 ['computer','💻','laptop','computer computers laptop laptops'],
 ['screen','🖥️','screen','screen screens'],
 ['keyboard','⌨️','keyboard','keyboard keyboards'],
 ['mouse','🖱️','mouse','mouse mice'],
 ['button','🔘','button','button buttons'],
 ['internet','🌐','internet','internet web website websites'],
 ['email','✉️','mail','email emails'],
 ['message','💬','chat-bubble','message messages text texts'],
 ['video','📹','video-camera','video videos'],
 ['music','🎵','music-note','music song songs'],
 ['sound','🔊','sound-high','sound sounds voice voices'],
 ['quiet','🤫','sound-off','quiet silently silent'],
 ['loud','🔊','sound-high','loud louder loudest'],
 ['traffic','🚦','traffic-light','traffic'],
 ['street','🛣️','road','street streets'],
 ['bridge','🌉','bridge','bridge bridges'],
 ['market','🛒','cart','market markets'],
 ['ticket','🎫','ticket','ticket tickets'],
 ['station','🚉','train','station stations'],
 ['airport','✈️','airplane','airport airports'],
 ['passport','🛂','id-card','passport passports'],
 ['medicine','💊','pharmacy','medication medications'],
 ['pharmacy','💊','pharmacy','pharmacy pharmacies'],
 ['police','👮','shield','police officer officers'],
 ['emergency','🚨','siren','emergency emergencies'],
 ['ambulance','🚑','ambulance','ambulance ambulances'],
 ['firefighter','🧑‍🚒','fire','firefighter firefighters'],
 ['birthday','🎂','cake','birthday birthdays'],
 ['holiday','🎊','calendar','holiday holidays'],
 ['party','🎉','party','party parties'],
 ['gift','🎁','gift','gift gifts'],
 ['ball','⚽','ball','ball balls'],
 ['game','🎲','gamepad','game games'],
 ['team','👥','group','team teams'],
 ['football','⚽','ball','football soccer'],
 ['basketball','🏀','basketball','basketball'],
 ['jacket','🧥','shirt','jacket jackets'],
 ['umbrella','☂️','umbrella','umbrella umbrellas'],
 ['raincoat','🧥','shirt','raincoat raincoats']
].map(([label,emoji,icon,forms])=>({label,emoji,icon,forms:forms.split(' ')}));

const grammarWords=new Set(
 'i me my mine myself we us our ours ourselves you your yours yourself yourselves '+
 'he him his himself she her hers herself it its itself they them their theirs themselves '+
 'who whom whose what which where why when how whether a an the some any each every '+
 'either neither all most many few fewer much little less of to in on at for from with '+
 'by and or but if as so than that this these those is am are was were be been being '+
 'have has had do does did can could may might must shall should will would '+
 'there here then thus because although while whereas until unless since '+
 'very just quite rather really perhaps probably maybe please about among between '+
 'through throughout across against around along into onto upon over under above below '+
 'behind beside beyond within once already yet also too still only even else ever '+
 'one another other others such more enough'.split(/\s+/u)
);
const irregular={
 cashews:'cashew',shelves:'shelf',knives:'knife',children:'child',women:'woman',men:'man',
 people:'person',feet:'foot',teeth:'tooth',mice:'mouse',geese:'goose',better:'good',
 best:'good',worse:'bad',worst:'bad',bought:'buy',brought:'bring',taught:'teach',
 thought:'think',went:'go',gone:'go',got:'get',ate:'eat',eaten:'eat',drank:'drink',
 drunk:'drink',swam:'swim',ran:'run',wrote:'write',written:'write',saw:'look',
 seen:'look',slept:'sleep',spoke:'speak',spoken:'speak',gave:'give',given:'give',
 took:'take',taken:'take',left:'leave',found:'find',made:'make',came:'come',
 felt:'feel',knew:'know',known:'know',held:'hold',fell:'fall',fallen:'fall'
};
const phrases=[
 ['thank you','thanks','🙏','heart'],
 ['ice cream','ice cream','🍨','ice-cream'],
 ['bus stop','bus stop','🚏','bus'],
 ['first aid','first aid','🩹','healthcare'],
 ['good morning','good morning','🌅','sunrise'],
 ['good night','good night','🌙','moon'],
 ['turn on','turn on','💡','light-bulb'],
 ['turn off','turn off','💡','light-bulb'],
 ['pick up','pick up','🤲','hand'],
 ['sit down','sit','🪑','chair'],
 ['stand up','stand','🧍','user']
].map(([form,label,emoji,icon])=>({form,label,emoji,icon,forms:[form],phrase:true}));
function makeIndex(vocabulary){
 const index=new Map();
 for(const entry of [...vocabulary,...additions]){
  for(const form of entry.forms||[])if(!index.has(form))index.set(form,entry);
  if(!index.has(entry.label))index.set(entry.label,entry);
 }
 return index;
}
function findKnown(token,index){
 if(index.has(token))return index.get(token);
 const candidates=[irregular[token]];
 if(token.endsWith('ies')&&token.length>4)candidates.push(token.slice(0,-3)+'y');
 if(token.endsWith('ing')&&token.length>5)candidates.push(token.slice(0,-3),token.slice(0,-3)+'e');
 if(token.endsWith('ed')&&token.length>4)candidates.push(token.slice(0,-2),token.slice(0,-1));
 if(token.endsWith('es')&&token.length>4)candidates.push(token.slice(0,-2));
 if(token.endsWith('s')&&token.length>3&&!token.endsWith('ss'))candidates.push(token.slice(0,-1));
 for(const word of candidates)if(word&&index.has(word))return index.get(word);
 return null;
}
function dynamicBase(token){
 if(irregular[token])return irregular[token];
 if(token.endsWith('ies')&&token.length>4)return token.slice(0,-3)+'y';
 if(token.endsWith('sses'))return token.slice(0,-2);
 if(token.endsWith('ing')&&token.length>6)return token.slice(0,-3);
 if(token.endsWith('ed')&&token.length>5)return token.slice(0,-2);
 if(token.endsWith('s')&&token.length>4&&!token.endsWith('ss')&&!token.endsWith('us'))return token.slice(0,-1);
 return token;
}
export function extractVisualConcepts(text,vocabulary,{max=30}={}){
 const tokens=String(text||'').toLowerCase().match(/[a-z]+(?:'[a-z]+)?/gu)||[];
 const index=makeIndex(vocabulary);
 const output=[];
 for(let i=0;i<tokens.length&&output.length<max;i++){
  const token=tokens[i];
  const combined=tokens.slice(i,i+2).join(' ');
  const phrase=phrases.find(item=>item.form===combined);
  if(phrase){output.push({...phrase});i++;continue}
  if(grammarWords.has(token))continue;
  const known=findKnown(token,index);
  if(known){output.push({...known});continue}
  if(!/^[a-z]{3,30}$/u.test(token))continue;
  output.push({label:dynamicBase(token),emoji:'🔎',icon:null,unknown:true,sourceToken:token});
 }
 return output;
}
export {additions,grammarWords};

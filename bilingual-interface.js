// Bilingual interface labels. User-generated translation text remains untouched.
(function(){
'use strict';
const labels={
 'Pashto ↔ English':'Pashto ↔ English / پښتو ↔ انګلیسي',
 'Tap the language being spoken. The other language should play aloud. Experimental prototype.':'Tap the spoken language. Translation should play aloud. Experimental. / د خبرې شوې ژبې تڼۍ کېکاږئ. ژباړه باید په غږ واورېدل شي. ازمایښتي بڼه.',
 'Speak English':'Speak English / په انګلیسي خبرې وکړئ',
 'Speak Pashto':'Speak Pashto / په پښتو خبرې وکړئ',
 'Translation':'Translation / ژباړه',
 'Nothing translated yet.':'Nothing translated yet. / لا ژباړه نشته.',
 'Replay translation':'Replay translation / ژباړه بیا واورئ',
 'Show original speech':'Show original speech / اصلي خبرې ښکاره کړئ',
 'Compatibility and privacy':'Compatibility and privacy / سازګاري او محرمیت',
 'Pictures':'Pictures / انځورونه',
 'ARASAAC':'ARASAAC',
 'English':'English / انګلیسي',
 'Pashto':'Pashto / پښتو'
};
function updateStatic(){
 for(const el of document.querySelectorAll('h1,h2,summary,.picture-heading,.content-column .muted,button small,.panel>p.muted')){
  if(el.dataset.bilingual)return;
  const value=el.textContent.trim();
  if(labels[value]){el.textContent=labels[value];el.dataset.bilingual='yes'}
 }
 const en=document.getElementById('en'),ps=document.getElementById('ps');
 if(en&&!en.dataset.bilingual){en.innerHTML='🎙 English<small>Speak English / په انګلیسي خبرې وکړئ</small>';en.dataset.bilingual='yes'}
 if(ps&&!ps.dataset.bilingual){ps.innerHTML='🎙 پښتو<small>Speak Pashto / په پښتو خبرې وکړئ</small>';ps.dataset.bilingual='yes'}
 const replay=document.getElementById('replay');
 if(replay&&!replay.dataset.bilingual){replay.textContent='▶ Replay / بیا واورئ';replay.dataset.bilingual='yes'}
}
updateStatic();
const status=document.getElementById('status');
const known=[
 [/no Pashto voice is installed/i,' / په دې وسیله کې د پښتو غږ نشته.'],
 [/no detectable Pashto speaking voice/i,' / په دې وسیله کې د پښتو غږ ونه موندل شو.'],
 [/Listening for English/i,' / انګلیسي خبرې اورېدل کېږي…'],
 [/Listening for Pashto/i,' / پښتو خبرې اورېدل کېږي…'],
 [/Translating/i,' / ژباړه روانه ده…'],
 [/Translation ready/i,' / ژباړه چمتو ده.'],
 [/Preparing Pashto recognition/i,' / د پښتو پېژندنه چمتو کېږي…'],
 [/Recognizing Pashto/i,' / پښتو خبرې پېژندل کېږي…'],
 [/Microphone/i,' / د مایکروفون ستونزه.'],
 [/unavailable|failed|error/i,' / ستونزه رامنځته شوه.']
];
if(status){
 let busy=false;
 new MutationObserver(()=>{
  if(busy)return;
  const text=status.textContent;
  if(text.includes(' / '))return;
  const item=known.find(([pattern])=>pattern.test(text));
  if(item){busy=true;status.textContent=text+item[1];busy=false}
 }).observe(status,{childList:true,characterData:true,subtree:true});
}
})();

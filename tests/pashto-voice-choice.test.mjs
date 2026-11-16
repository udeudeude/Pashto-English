import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../pashto-voice-choice.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));

function harness(available=[]){
  let voices=available,deviceBehavior=null;
  const localCalls=[],nativeCalls=[],messages=[];
  let cancelled=0,localStops=0,unlockCalls=0;
  // Deterministic clock: exercise both timeout paths without sleeping.
  let nextTimeoutId=0;
  const timeouts=new Map();
  const fakeSetTimeout=(callback,delay)=>{
    const id=++nextTimeoutId;
    timeouts.set(id,{callback,delay});
    return id;
  };
  const fakeClearTimeout=id=>timeouts.delete(id);
  function button(){
    return {
      attrs:{},handler:null,
      addEventListener(name,listener){if(name==='click')this.handler=listener},
      setAttribute(name,value){this.attrs[name]=value},
      click(){this.handler?.()},
    };
  }
  const elements={
    'pashto-voice-choices':{hidden:true},
    'voice-local':button(),
    'voice-device':button(),
    'result':{lang:'ps',textContent:'سلام، تاسو څنګه یاست؟',
      getAttribute(name){return name==='lang'?this.lang:null}},
    'replay':{disabled:false},
    'playback-speed':{value:'0.7'},
  };
  const synth={
    getVoices(){return voices},
    cancel(){cancelled++},
    addEventListener(){},
    speak(utterance){
      nativeCalls.push(utterance);
      if(deviceBehavior)return deviceBehavior(utterance);
      queueMicrotask(()=>{utterance.onstart?.();utterance.onend?.()});
    },
  };
  const existing={
    unlock(){unlockCalls++},
    stop(){localStops++},
    async speak(text,options){localCalls.push({text,options});return {played:true}},
  };
  class FakeObserver{observe(){}}
  class FakeUtterance{constructor(text){this.text=text}}
  const window={
    pashtoVoice:existing,
    speechSynthesis:synth,
    SpeechSynthesisUtterance:FakeUtterance,
    pashtoStatus(text){messages.push(text)},
    addEventListener(){},
  };
  const document={
    getElementById(id){return elements[id]||null},
    addEventListener(){},
  };
  runInNewContext(source,{window,document,MutationObserver:FakeObserver,
    setTimeout:fakeSetTimeout,clearTimeout:fakeClearTimeout,console});
  return {
    elements,window,localCalls,nativeCalls,messages,
    get cancelled(){return cancelled},
    get localStops(){return localStops},
    get unlockCalls(){return unlockCalls},
    get pendingTimeouts(){return [...timeouts.values()].map(entry=>entry.delay)},
    fireNextTimeout(){
      const next=[...timeouts].sort((a,b)=>a[1].delay-b[1].delay)[0];
      assert.ok(next,'Expected a pending playback timeout');
      timeouts.delete(next[0]);
      next[1].callback();
    },
    setVoices(value){voices=value;window.pashtoVoiceChoice.refresh()},
    setDeviceBehavior(fn){deviceBehavior=fn},
  };
}

const localPashto={lang:'ps-AF',name:'Pashto',localService:true};

test('Only a real, declared local Pashto voice can expose the second button',()=>{
  const app=harness([{lang:'fa-IR',localService:true},
    {lang:'ps-AF',localService:false},{lang:'psfake',localService:true}]);
  assert.equal(app.elements['pashto-voice-choices'].hidden,true);
  assert.equal(app.window.pashtoVoice.available().device,false);
  assert.equal(app.window.pashtoVoice.select('device'),false);
  app.setVoices([localPashto]);
  assert.equal(app.elements['pashto-voice-choices'].hidden,false);
  assert.equal(app.elements['voice-local'].attrs['aria-pressed'],'true');
  assert.equal(app.elements['voice-device'].attrs['aria-pressed'],'false');
});

test('Speaker choices remain hidden for English or while translation is pending',()=>{
  const app=harness([localPashto]);
  app.elements['result'].lang='en';
  app.window.pashtoVoiceChoice.refresh();
  assert.equal(app.elements['pashto-voice-choices'].hidden,true);
  app.elements.result.lang='ps';
  app.elements.replay.disabled=true;
  app.window.pashtoVoiceChoice.refresh();
  assert.equal(app.elements['pashto-voice-choices'].hidden,true);
  app.elements.replay.disabled=false;
  app.window.pashtoVoiceChoice.refresh();
  assert.equal(app.elements['pashto-voice-choices'].hidden,false);
});

test('Tapping device voice immediately speaks Pashto at selected speed',async()=>{
  const app=harness([localPashto]);
  app.elements['voice-device'].click();
  await settle();
  assert.equal(app.window.pashtoVoice.mode(),'device');
  assert.equal(app.elements['voice-device'].attrs['aria-pressed'],'true');
  assert.equal(app.nativeCalls.length,1);
  assert.equal(app.nativeCalls[0].lang,'ps-AF');
  assert.equal(app.nativeCalls[0].voice,localPashto);
  assert.equal(app.nativeCalls[0].rate,0.7);
  assert.equal(app.nativeCalls[0].text,'سلام، تاسو څنګه یاست؟');
  assert.equal(app.localCalls.length,0);
  assert.ok(app.unlockCalls>=1);
});

test('Native synthesis error reverts to bundled voice without hiding text',async()=>{
  const app=harness([localPashto]);
  app.setDeviceBehavior(utterance=>queueMicrotask(()=>
    utterance.onerror?.({error:'synthesis-failed'})));
  app.elements['voice-device'].click();
  await settle();
  assert.equal(app.window.pashtoVoice.mode(),'local');
  assert.equal(app.elements['voice-local'].attrs['aria-pressed'],'true');
  assert.equal(app.localCalls.length,1);
  assert.equal(app.localCalls[0].text,'سلام، تاسو څنګه یاست؟');
  assert.equal(app.localCalls[0].options.speed,0.7);
  assert.ok(app.messages.some(item=>item.includes('local voice')));
});

test('Cancellation prevents stale device failure from starting fallback speech',async()=>{
  const app=harness([localPashto]);
  let oldUtterance;
  app.setDeviceBehavior(value=>{oldUtterance=value});
  app.elements['voice-device'].click();
  app.window.pashtoVoice.stop();
  oldUtterance.onerror?.({error:'interrupted'});
  await settle();
  assert.equal(app.localCalls.length,0);
  assert.ok(app.cancelled>0);
});

test('Disappearing device voice reselects local engine and hides comparison',()=>{
  const app=harness([localPashto]);
  app.window.pashtoVoice.select('device');
  app.setVoices([]);
  assert.equal(app.window.pashtoVoice.mode(),'local');
  assert.equal(app.elements['pashto-voice-choices'].hidden,true);
});

test('The default always remains the existing bundled Pashto voice',async()=>{
  const app=harness([localPashto]);
  const returned=await app.window.pashtoVoice.speak('پښتو',{speed:1.3});
  assert.equal(app.localCalls.length,1);
  assert.equal(app.localCalls[0].options.speed,1.3);
  assert.equal(returned.played,true);
  assert.equal(app.nativeCalls.length,0);
});

test('Device voice that never starts falls back after the bounded startup deadline',async()=>{
  const app=harness([localPashto]);
  app.setDeviceBehavior(()=>{});
  app.elements['voice-device'].click();
  assert.deepEqual(app.pendingTimeouts,[4500]);
  app.fireNextTimeout();
  await settle();
  assert.equal(app.window.pashtoVoice.mode(),'local');
  assert.equal(app.localCalls.length,1);
  assert.equal(app.localCalls[0].text,'سلام، تاسو څنګه یاست؟');
  assert.deepEqual(app.pendingTimeouts,[]);
  assert.ok(app.messages.some(text=>text.includes('local voice')));
});

test('Device voice that starts but never ends recovers to bundled eSpeak',async()=>{
  const app=harness([localPashto]);
  app.setDeviceBehavior(utterance=>queueMicrotask(()=>utterance.onstart?.()));
  app.elements['voice-device'].click();
  await settle();
  assert.equal(app.localCalls.length,0);
  assert.equal(app.pendingTimeouts.length,1);
  assert.ok(app.pendingTimeouts[0]>=20000);
  app.fireNextTimeout();
  await settle();
  assert.equal(app.window.pashtoVoice.mode(),'local');
  assert.equal(app.localCalls.length,1);
  assert.ok(app.cancelled>0);
  assert.deepEqual(app.pendingTimeouts,[]);
});

test('A stopped device voice never resurrects speech after the start event',async()=>{
  const app=harness([localPashto]);
  app.setDeviceBehavior(utterance=>queueMicrotask(()=>utterance.onstart?.()));
  app.elements['voice-device'].click();
  await settle();
  assert.equal(app.pendingTimeouts.length,1);
  app.window.pashtoVoice.stop();
  assert.deepEqual(app.pendingTimeouts,[]);
  assert.equal(app.localCalls.length,0);
});

test('Normally completed native speech clears its completion watchdog',async()=>{
  const app=harness([localPashto]);
  app.elements['voice-device'].click();
  await settle();
  assert.deepEqual(app.pendingTimeouts,[]);
  assert.equal(app.localCalls.length,0);
});

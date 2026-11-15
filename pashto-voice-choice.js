/* A genuinely available *local* Pashto device voice can be compared with
 * bundled eSpeak. Never use Persian or an unidentified online voice as Pashto.
 * This layer wraps, but does not replace, the proven bundled voice.
 */
(() => {
  'use strict';
  const existing=window.pashtoVoice;
  const group=document.getElementById('pashto-voice-choices');
  if(!existing || !group)return;
  const localSpeak=existing.speak.bind(existing);
  const localStop=existing.stop.bind(existing);
  const unlock=existing.unlock.bind(existing);
  let selected='local',generation=0,nativeTask=null;

  function deviceVoice(){
    const engine=window.speechSynthesis;
    if(!engine || typeof engine.getVoices!=='function' ||
       typeof window.SpeechSynthesisUtterance!=='function')return null;
    try{
      // The locale must actually be Pashto. Require a declared local service
      // so voice comparison cannot silently send speech text to a remote TTS.
      return engine.getVoices().find(item=>item && item.localService===true &&
        /^ps(?:-|_|$)/i.test(item.lang||''))||null;
    }catch(error){return null}
  }

  function stop(){
    generation++;
    localStop();
    if(nativeTask){
      const task=nativeTask;
      nativeTask=null;
      task.cancel();
      try{window.speechSynthesis?.cancel()}catch(error){}
    }
  }

  function refresh(){
    const supported=!!deviceVoice();
    if(selected==='device'&&!supported){
      selected='local';
      stop();
    }
    const translated=document.getElementById('result');
    const replay=document.getElementById('replay');
    const hasPashto=translated?.getAttribute('lang')==='ps' &&
      !replay?.disabled && /[\u0600-\u06ff]/u.test(translated.textContent||'');
    group.hidden=!(hasPashto&&supported);
    for(const [id,mode] of [['voice-local','local'],['voice-device','device']]){
      const button=document.getElementById(id);
      if(button)button.setAttribute('aria-pressed',String(selected===mode));
    }
  }

  function select(mode){
    if(mode!=='local'&&mode!=='device')return false;
    if(mode==='device'&&!deviceVoice()){
      refresh();
      return false;
    }
    if(selected!==mode){
      stop();
      selected=mode;
    }
    refresh();
    return true;
  }

  function speakOnDevice(text,{speed=1}={},version){
    const found=deviceVoice();
    const synthesis=window.speechSynthesis;
    if(!found || !synthesis)return Promise.reject(Error('No local Pashto device voice'));
    if(!text || !/[\u0600-\u06ff]/u.test(text))
      return Promise.reject(Error('The text does not contain Pashto script.'));
    const boundedSpeed=Math.max(0.7,Math.min(1.3,Number(speed)||1));
    // This is called synchronously from the person's tap, while native speech
    // still has the browser's user-activation permission.
    return new Promise((resolve,reject)=>{
      const utterance=new window.SpeechSynthesisUtterance(text);
      utterance.lang=found.lang;
      utterance.voice=found;
      utterance.rate=boundedSpeed;
      let finished=false,started=false,watchdog;
      const task={cancel:()=>finish(null,{cancelled:true})};
      function finish(error,result){
        if(finished)return;
        finished=true;
        clearTimeout(watchdog);
        utterance.onstart=null;
        utterance.onend=null;
        utterance.onerror=null;
        if(nativeTask===task)nativeTask=null;
        if(error)reject(error);else resolve(result);
      }
      nativeTask=task;
      utterance.onstart=()=>{
        started=true;
        clearTimeout(watchdog);
        if(version!==generation)return;
        window.pashtoStatus?.('Playing Pashto translation with device voice. / د ټیلیفون په غږ پښتو غږېږي.');
      };
      utterance.onend=()=>finish(null,{played:true,engine:'device',speed:boundedSpeed});
      utterance.onerror=event=>finish(Error('Device voice error: '+(event?.error||'unknown')));
      watchdog=setTimeout(()=>{
        if(started)return;
        finish(Error('Device Pashto voice did not start.'));
        try{synthesis.cancel()}catch(error){}
      },4500);
      try{
        synthesis.cancel();
        synthesis.speak(utterance);
      }catch(error){finish(error)}
    });
  }

  async function speak(text,options={}){
    stop();
    const version=generation;
    if(selected==='device'){
      try{
        const result=await speakOnDevice(text,options,version);
        if(version!==generation)return {cancelled:true};
        return result;
      }catch(error){
        if(version!==generation)return {cancelled:true};
        selected='local';
        refresh();
        window.pashtoStatus?.(
          'Device Pashto voice failed; playing the local voice. / د ټیلیفون غږ کار ونه کړ؛ ځايي غږ غږېږي.'
        );
      }
    }
    if(version!==generation)return {cancelled:true};
    return localSpeak(text,options);
  }

  function tryChoice(mode){
    const result=document.getElementById('result');
    if(group.hidden || result?.getAttribute('lang')!=='ps')return;
    // Unlock the bundled sound context before any awaiting or voice selection.
    unlock();
    if(!select(mode))return;
    const text=result.textContent;
    const speed=Number(document.getElementById('playback-speed')?.value)||1;
    speak(text,{speed}).catch(()=>{});
  }

  document.getElementById('voice-local')?.addEventListener('click',()=>tryChoice('local'));
  document.getElementById('voice-device')?.addEventListener('click',()=>tryChoice('device'));
  window.speechSynthesis?.addEventListener?.('voiceschanged',refresh);
  if(typeof MutationObserver==='function'){
    const observer=new MutationObserver(refresh);
    const result=document.getElementById('result');
    const replay=document.getElementById('replay');
    if(result)observer.observe(result,{childList:true,characterData:true,subtree:true,
      attributes:true,attributeFilter:['lang']});
    if(replay)observer.observe(replay,{attributes:true,attributeFilter:['disabled']});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  window.addEventListener('pagehide',stop);
  Object.assign(existing,{speak,stop,select,mode:()=>selected,
    available:()=>({local:true,device:!!deviceVoice()})});
  window.pashtoVoiceChoice={refresh};
  refresh();
})();
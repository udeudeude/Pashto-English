/* Experimental free Pashto voice built on eSpeak NG via Spellophone 0.2.1.
 * Runs locally in the phone after downloading open-source program and voice data.
 * Speech intelligibility MUST be evaluated by fluent Afghan Pashto speakers.
 * Do not confuse successful synthesis with accurate translation/pronunciation.
 */
(() => {
  'use strict';
  const PACKAGE = new URL('./vendor/pashto-voice/',document.baseURI).href.replace(/\/$/,'');
  const dialectSelect=document.getElementById('pashto-dialect');
  const dialects=new Set(['ps','ps-x-northwest','ps-x-southeast','ps-x-yusufzai']);
  const selectedVoice=()=>dialects.has(dialectSelect?.value)?dialectSelect.value:'ps';
  try{
    const saved=localStorage.getItem('pashto-pronunciation');
    if(dialectSelect&&dialects.has(saved))dialectSelect.value=saved;
  }catch{} // Playback must also work when browser storage is unavailable.
  let enginePromise=null;
  let audioContext=null;
  let playing=null;
  let playVersion=0;
  const notify=(en,ps)=>{
    const text=en+' / '+ps;
    if(window.pashtoStatus) {
      // pashtoStatus is the existing English-to-bilingual status adapter.
      // Writing directly avoids adding an incorrect second translation.
      document.getElementById('status').textContent=text;
    } else document.getElementById('status').textContent=text;
  };
  function unlock(){
    try {
      if(!audioContext) audioContext=new (window.AudioContext||window.webkitAudioContext)();
      if(audioContext.state==='suspended') audioContext.resume().catch(()=>{});
    } catch(e) { /* Report errors when actual playback is requested. */ }
  }
  async function loadEngine(){
    if(enginePromise)return enginePromise;
    enginePromise=(async()=>{
      notify('Downloading Pashto speech engine…','د پښتو غږیز سیستم ښکته کېږي…');
      const {createEspeak}=await import(PACKAGE+'/dist/browser.js');
      const espeak=await createEspeak({
        dataUrl:PACKAGE+'/espeak-ng-data/',
        languages:['ps'],
        wasmUrl:PACKAGE+'/wasm/espeak-ng.wasm'
      });
      // Validate this precise voice rather than falling back silently to Persian.
      const hasPashto=espeak.listVoices().some(v=>
        v.languages?.some(lang=>lang.name==='ps' || lang.name?.startsWith('ps-'))
      );
      if(!hasPashto)throw Error('The loaded speech engine does not contain Pashto.');
      espeak.setVoice('ps');
      return espeak;
    })().catch(e=>{enginePromise=null;throw e});
    return enginePromise;
  }
  function stop(){
    ++playVersion;
    if(playing){
      try{playing.stop()}catch(e){}
      playing=null;
    }
  }
  async function speakPashto(text,{slow=false}={}){
    const version=++playVersion;
    if(!text || !/[\u0600-\u06ff]/u.test(text))throw Error('The text does not contain Pashto script.');
    const espeak=await loadEngine();
    if(version!==playVersion)return {cancelled:true};
    unlock();
    if(!audioContext)throw Error('This browser cannot play generated sound.');
    // Produces signed, 16-bit, 22,050 Hz mono samples.
    // Change synthesis rate, not playback rate: preserve voice pitch.
    const voice=selectedVoice(),rate=slow?130:175;
    const generated=espeak.synthesize(text,{voice,rate});
    if(!generated.samples?.length || !Number.isFinite(generated.sampleRate))
      throw Error('The Pashto voice returned no playable audio.');
    const samples=generated.samples;
    const buffer=audioContext.createBuffer(1,samples.length,generated.sampleRate);
    const data=buffer.getChannelData(0);
    let nonzero=false;
    for(let i=0;i<samples.length;i++){
      const normalized=samples[i]/32768;
      data[i]=normalized;
      if(Math.abs(normalized)>0.0001)nonzero=true;
    }
    if(!nonzero)throw Error('The Pashto voice generated silence.');
    await audioContext.resume();
    if(version!==playVersion)return {cancelled:true};
    if(audioContext.state!=='running')throw Error('Audio playback is blocked. Tap Replay to permit sound.');
    // Stop the previous source without invalidating this newest request.
    if(playing){try{playing.stop()}catch(e){}playing=null}
    const source=audioContext.createBufferSource();
    source.buffer=buffer;source.connect(audioContext.destination);
    playing=source;
    source.onended=()=>{if(playing===source)playing=null};
    source.start();
    notify('Playing Pashto translation. Speech is experimental.','د پښتو ژباړې غږ غږول کېږي. دا ازمایښتي دی.');
    return {duration:buffer.duration,sampleRate:generated.sampleRate,voice,rate};
  }
  async function tryVoice(text,options){
    unlock();
    try{return await speakPashto(text,options)}
    catch(error){
      notify('Pashto voice unavailable: '+error.message,'د پښتو غږ کار نه کوي. مهرباني وکړئ بیا هڅه وکړئ.');
      throw error;
    }
  }
  const testButton=document.getElementById('test-pashto-voice');
  if(testButton)testButton.addEventListener('click',()=>{
    // Unlock must occur directly during the tap, before network requests.
    unlock();
    tryVoice('سلام، تاسو څنګه یاست؟').catch(()=>{});
  });
  if(dialectSelect)dialectSelect.addEventListener('change',()=>{
    stop();
    try{localStorage.setItem('pashto-pronunciation',selectedVoice())}catch{}
    tryVoice('سلام، تاسو څنګه یاست؟').catch(()=>{});
  });
  window.pashtoVoice={unlock,stop,speak:tryVoice,selectedVoice};
})();
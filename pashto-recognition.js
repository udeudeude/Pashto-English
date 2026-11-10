import {explainPashtoRecognitionFailure} from './lib/speech-errors.mjs';
import {validateRecognitionAudio} from './lib/recognition-audio.mjs';
import {createRecognitionClient} from './lib/recognition-client.mjs';

// Safari has documented Web Speech audio-session leaks and stuck input.
// On Apple mobile devices, record a SHORT audio clip through an owned
// MediaStream and send it to local Whisper, for English AND Pashto.
const isAppleMobile=/(iPad|iPhone|iPod)/i.test(navigator.userAgent)||
 (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const safety=window.pashtoMicrophoneSafety;
const client=createRecognitionClient();
const buttons={
 ps:document.getElementById('ps'),
 en:document.getElementById('en')
};
let capture=null,recording=null;
const status=s=>window.pashtoStatus?window.pashtoStatus(s):document.getElementById('status').textContent=s;
function explainInputFailure(error,language){
 if(language==='ps')return explainPashtoRecognitionFailure(error);
 const detail=String(error?.message||error||'');
 if(/permission|denied|notallowederror/i.test(detail))
  return 'Microphone permission denied. / مایکروفون ته اجازه نه ده ورکړل شوې.';
 if(/short|no audio|silent|empty|signal/i.test(detail))
  return 'No usable English speech was recorded. / د کار وړ انګلیسي خبرې ثبت نه شوې.';
 if(/wasm|webassembly|backend|aborted|memory|timed out/i.test(detail))
  return 'English speech recognition could not start on this phone. / په دې تلیفون کې د انګلیسي غږ پېژندنه پیل نه شوه.';
 return 'English speech recognition failed. Please try again. / د انګلیسي غږ پېژندنه ناکامه شوه. بیا هڅه وکړئ.';
}
const labels={
 ps:'🎙 پښتو<small>Speak Pashto / په پښتو خبرې وکړئ</small>',
 en:'🎙 English<small>Speak English / په انګلیسي خبرې وکړئ</small>'
};
function resetButton(lang){
 const button=buttons[lang];
 if(!button)return;
 button.innerHTML=labels[lang];
 button.setAttribute('aria-pressed','false');
}
function microphoneAvailable(){
 return Boolean(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder);
}
async function decodeForWhisper(blob){
 const Context=window.AudioContext||window.webkitAudioContext;
 if(!Context||!window.OfflineAudioContext)throw Error('Audio decoding is unavailable.');
 const context=new Context();
 try{
  const audio=await context.decodeAudioData(await blob.arrayBuffer());
  if(!audio.duration||audio.duration<0.2)throw Error('Recording was too short.');
  if(audio.duration>21)throw Error('Recording is too long.');
  const length=Math.ceil(audio.duration*16000);
  const offline=new OfflineAudioContext(1,length,16000);
  const source=offline.createBufferSource();
  source.buffer=audio;source.connect(offline.destination);source.start();
  const rendered=await offline.startRendering();
  return validateRecognitionAudio(rendered.getChannelData(0));
 }finally{await context.close().catch(()=>{})}
}
function haltTracks(current){
 if(!current?.stream)return;
 if(safety)safety.stopStream(current.stream);
 else for(const track of current.stream.getTracks?.()||[]){
  try{track.stop()}catch(error){}
 }
 current.stream=null;
}
function cancelCapture(){
 const current=capture;
 capture=null;recording=null;
 if(current){
  current.cancelled=true;
  clearTimeout(current.timer);
  current.timer=null;
  if(current.recorder?.state==='recording'){
   try{current.recorder.stop()}catch(error){}
  }
  haltTracks(current);
  client.cancel();
  resetButton(current.lang);
 }
}
window.addEventListener('pashto-session-start',cancelCapture);
function cancelSession(reason='user'){
 if(!capture){client.cancel();return}
 const lang=capture.lang;
 // Discard queued transcripts and translations without unlocking audio
 // playback during Safari background transitions.
 window.pashtoApp?.cancel();
 status(reason==='background'
  ?'Microphone off. Recording stopped when the app lost focus. / مایکروفون بند دی. د اپ د شالید کېدو له امله ثبت ودرېد.'
  :'Cancelled. Tap to speak again. / لغوه شو. د بیا خبرو لپاره تڼۍ کېکاږئ.');
}
window.addEventListener('pashto-microphone-stop',()=>cancelSession('background'));
// Handle hidden pages even if the supervisor script could not initialize.
window.addEventListener('pagehide',()=>cancelSession('background'));
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)cancelSession('background');
});
window.addEventListener('blur',()=>{
 if(capture?.stream)cancelSession('background');
});
function stopRecording(current){
 if(!current||capture!==current||current.cancelled)return;
 clearTimeout(current.timer);
 current.timer=null;
 recording=null;
 const recorder=current.recorder;
 if(recorder?.state==='recording'){
  try{recorder.stop()}catch(error){
   window.pashtoApp?.fail(explainInputFailure(error,current.lang),current.session);
   cancelCapture();return;
  }
 }
 // MediaRecorder.onstop may not arrive promptly on Safari. Stop the actual
 // microphone tracks NOW, not at a later callback or after Whisper finishes.
 haltTracks(current);
 buttons[current.lang].textContent='× Cancel / لغوه کړئ';
 buttons[current.lang].setAttribute('aria-pressed','false');
 status('Microphone off. Processing speech… / مایکروفون بند دی. خبرې څېړل کېږي…');
}
async function startLocalCapture(lang){
 if(!microphoneAvailable()||document.hidden||!safety?.isForeground()){
  status('Microphone recording is unavailable or the app is not in front. / مایکروفون نشته یا اپ په مخکینۍ پرده کې نه دی.');
  return;
 }
 if(capture){
  if(recording?.state==='recording'){stopRecording(capture);return}
  cancelSession();
  return;
 }
 const app=window.pashtoApp;
 if(!app){status('The translation controller is unavailable. / د ژباړې سیستم نشته.');return}
 const session=app.begin(lang);
 const current={cancelled:false,stream:null,recorder:null,timer:null,lang,session};
 capture=current;
 const token=safety.token();
 const button=buttons[lang];
 button.textContent='× Cancel / لغوه کړئ';
 button.setAttribute('aria-pressed','false');
 const valid=()=>capture===current&&!current.cancelled&&app.isCurrent(session)&&!document.hidden;
 const progress=stage=>{
  if(!valid())return;
  status(stage==='loading'
    ?'Microphone off. Preparing speech recognition model… / مایکروفون بند دی. د غږ پېژندنې سیستم چمتو کېږي…'
    :'Microphone off. Recognizing speech… / مایکروفون بند دی. خبرې پېژندل کېږي…');
 };
 status('Waiting for microphone permission… / د مایکروفون اجازې ته انتظار…');
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  if(!valid()||!safety.registerStream(stream,token)){
   safety.stopStream(stream);
   // In particular, an expired permission/focus lease must not strand the
   // interface in Cancel with no recorder and no usable microphone.
   if(capture===current){
    cancelCapture();
    status('Microphone permission was interrupted. Tap to try again. / د مایکروفون اجازه ودرېده. بیا هڅه وکړئ.');
   }
   return;
  }
  current.stream=stream;
  const recorder=new MediaRecorder(stream);
  current.recorder=recorder;
  const chunks=[];
  let captureError=null;
  recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)};
  recorder.onerror=event=>{
   captureError=event.error||Error('Recording failed.');
   if(valid()){
    app.fail(explainInputFailure(captureError,lang),session);
    cancelCapture();
   }
  };
  recorder.onstop=async()=>{
   clearTimeout(current.timer);
   current.timer=null;
   haltTracks(current);
   if(!valid())return;
   recording=null;
   button.textContent='× Cancel / لغوه کړئ';
   button.setAttribute('aria-pressed','false');
   try{
    if(captureError)throw captureError;
    if(!chunks.length)throw Error('No audio was recorded.');
    const type=recorder.mimeType||chunks[0]?.type||'audio/mp4';
    const pcm=await decodeForWhisper(new Blob(chunks,{type}));
    if(!valid())return;
    const transcript=await client.recognize(pcm,progress,lang==='en'?'english':'pashto');
    if(valid())await app.process(transcript,lang,session);
   }catch(error){
    if(valid())app.fail(explainInputFailure(error,lang),session);
   }finally{
    if(capture===current){
     haltTracks(current);
     capture=null;resetButton(lang);
    }
   }
  };
  if(!valid()){haltTracks(current);return}
  recorder.start();
  recording=recorder;
  button.textContent='■ Stop / ودروئ';
  button.setAttribute('aria-pressed','true');
  status(lang==='ps'
   ?'Listening to Pashto. Tap again to stop. / پښتو خبرې اورېدل کېږي. د بندولو لپاره بیا کېکاږئ.'
   :'Listening to English. Tap again to stop. / انګلیسي خبرې اورېدل کېږي. د بندولو لپاره بیا کېکاږئ.');
  // The deadline is a backup for a forgotten button press.
  current.timer=setTimeout(()=>{
   if(valid()&&recorder.state==='recording')stopRecording(current);
  },20000);
 }catch(error){
  haltTracks(current);
  if(valid()){app.fail(explainInputFailure(error,lang),session);cancelCapture()}
 }
}
buttons.ps.onclick=()=>startLocalCapture('ps');
if(isAppleMobile){
 // The main page must not start webkitSpeechRecognition while the module
 // loads: its iOS path is disabled before this script becomes available.
 buttons.en.onclick=()=>startLocalCapture('en');
 const previous=window.capabilityReport;
 window.capabilityReport=()=>{
  previous?.();
  buttons.en.disabled=!microphoneAvailable();
 };
 window.capabilityReport();
}
window.pashtoSpeechInput={
 localEnglish:isAppleMobile,
 microphoneAvailable,
 state:()=>({active:!!capture,language:capture?.lang||null,
  recording:recording?.state==='recording',hasStream:!!capture?.stream})
};

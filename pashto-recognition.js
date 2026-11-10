import {explainPashtoRecognitionFailure} from './lib/speech-errors.mjs';
// Experimental on-device Pashto recognition using multilingual Whisper.
// Remote model loads only on first recording, never during page startup.
// Both language paths use the shared translation/replay controller.
import {validateRecognitionAudio} from './lib/recognition-audio.mjs';
import {createRecognitionClient} from './lib/recognition-client.mjs';
const client=createRecognitionClient();
let recording=null,capture=null;
const status=s=>window.pashtoStatus?window.pashtoStatus(s):document.getElementById('status').textContent=s;
const pashtoButton=document.getElementById('ps');
const resetButton=()=>{
 pashtoButton.innerHTML='🎙 پښتو<small>Speak Pashto / په پښتو خبرې وکړئ</small>';
};
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
function cancelCapture(){
 const current=capture;capture=null;
 if(current){
  current.cancelled=true;
  clearTimeout(current.timer);
  if(current.recorder?.state==='recording')current.recorder.stop();
  current.stream?.getTracks().forEach(track=>track.stop());
  client.cancel();
 }
 recording=null;resetButton();
}
window.addEventListener('pashto-session-start',cancelCapture);
function cancelSession(){
 if(capture){
  window.pashtoApp.begin('ps'); // Invalidate translation already in flight too.
  status('Cancelled. Tap to speak again. / لغوه شو. د بیا خبرو لپاره تڼۍ کېکاږئ.');
 }else client.cancel();
}
window.addEventListener('pagehide',cancelSession);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSession()});
pashtoButton.onclick=async()=>{
 if(capture){
  if(recording?.state==='recording'){recording.stop();return}
  cancelSession();
  return;
 }
 const app=window.pashtoApp;
 if(!app){status('The translation controller is unavailable. / د ژباړې سیستم نشته.');return}
 const session=app.begin('ps');
 const current={cancelled:false,stream:null,recorder:null,timer:null};
 capture=current;
 const valid=()=>capture===current&&!current.cancelled&&app.isCurrent(session);
 const progress=stage=>{
  if(!valid())return;
  status(stage==='loading'?'Preparing Pashto recognition model. First download may be large…':'Recognizing Pashto speech on this phone…');
 };
 pashtoButton.textContent='× Cancel / لغوه کړئ';
 status('Waiting for microphone permission… / د مایکروفون اجازې ته انتظار…');
 try{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)
   throw Error('Microphone recording is not supported by this browser.');
  // Permission dialogs cannot be aborted. Dispose of late streams immediately.
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  current.stream=stream;
  if(!valid()){stream.getTracks().forEach(track=>track.stop());return}
  const recorder=new MediaRecorder(stream);
  current.recorder=recorder;recording=recorder;
  const chunks=[];
  let captureError=null;
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
  recorder.onerror=event=>{
   captureError=event.error||Error('Recording failed.');
   // Some browsers do not send a usable stop event after failure.
   if(valid()){app.fail(explainPashtoRecognitionFailure(captureError),session);cancelCapture()}
  };
  recorder.onstop=async()=>{
   clearTimeout(current.timer);
   stream.getTracks().forEach(track=>track.stop());
   if(!valid())return;
   recording=null;pashtoButton.textContent='× Cancel / لغوه کړئ';
   try{
    if(captureError)throw captureError;
    if(!chunks.length)throw Error('No audio was recorded.');
    const type=recorder.mimeType||chunks[0]?.type||'audio/mp4';
    const pcm=await decodeForWhisper(new Blob(chunks,{type}));
    if(!valid())return;
    const transcript=await client.recognize(pcm,progress);
    if(valid())await app.process(transcript,'ps',session);
   }catch(error){
    if(valid())app.fail(explainPashtoRecognitionFailure(error),session);
   }finally{
    if(capture===current){capture=null;resetButton()}
   }
  };
  recorder.start();
  pashtoButton.textContent='■ Stop / ودروئ';
  status('Listening to Pashto. Tap again to stop.');
  // Bound memory and inference cost; short utterances are the supported unit.
  current.timer=setTimeout(()=>{if(valid()&&recorder.state==='recording')recorder.stop()},20_000);
 }catch(error){
  current.stream?.getTracks().forEach(track=>track.stop());
  if(valid()){app.fail(explainPashtoRecognitionFailure(error),session);cancelCapture()}
 }
};

import {explainPashtoRecognitionFailure} from './lib/speech-errors.mjs';
// Experimental on-device Pashto recognition using multilingual Whisper.
// Remote model loads only on first recording, never during page startup.
// Both language paths use the shared translation/replay controller.
let recognizerPromise=null,recording=null;
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
  const length=Math.ceil(audio.duration*16000);
  const offline=new OfflineAudioContext(1,length,16000);
  const source=offline.createBufferSource();
  source.buffer=audio;source.connect(offline.destination);source.start();
  const rendered=await offline.startRendering();
  return rendered.getChannelData(0);
 }finally{await context.close().catch(()=>{})}
}
async function recognize(buffer){
 status('Preparing Pashto recognition model. First download may be large…');
 if(!recognizerPromise){
  recognizerPromise=import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1')
   .then(({pipeline})=>pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',{dtype:'q8',device:'wasm'}))
   .catch(error=>{recognizerPromise=null;throw error});
 }
 const recognizer=await recognizerPromise;
 status('Recognizing Pashto speech on this phone…');
 const result=await recognizer(buffer,{language:'pashto',task:'transcribe'});
 return String(result.text||'').trim();
}
pashtoButton.onclick=async()=>{
 if(recording){
  if(recording.state!=='inactive')recording.stop();
  return;
 }
 const app=window.pashtoApp;
 if(!app){status('The translation controller is unavailable.');return}
 const session=app.begin('ps');
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
  app.fail('Microphone recording is not supported by this browser.',session);return;
 }
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}
 catch(error){app.fail('Microphone permission failed: '+error.message,session);return}
 let recorder;
 try{recorder=new MediaRecorder(stream)}
 catch(error){
  stream.getTracks().forEach(track=>track.stop());
  app.fail('Recording format unsupported: '+error.message,session);return;
 }
 const chunks=[];
 let captureError=null;
 recording=recorder;
 pashtoButton.textContent='■ Stop / ودروئ';
 status('Listening to Pashto. Tap again to stop.');
 recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
 recorder.onerror=event=>{captureError=event.error||Error('Recording failed.')};
 recorder.onstop=async()=>{
  recording=null;resetButton();
  stream.getTracks().forEach(track=>track.stop());
  try{
   if(captureError)throw captureError;
   if(!chunks.length)throw Error('No audio was recorded.');
   const type=recorder.mimeType||chunks[0]?.type||'audio/mp4';
   const pcm=await decodeForWhisper(new Blob(chunks,{type}));
   const transcript=await recognize(pcm);
   await app.process(transcript,'ps',session);
  }catch(error){
   console.error('Pashto speech recognition failed (technical details)',error);
   app.fail(explainPashtoRecognitionFailure(error),session);
  }
 };
 try{recorder.start()}
 catch(error){
  recording=null;resetButton();
  stream.getTracks().forEach(track=>track.stop());
  app.fail('Recording failed: '+error.message,session);
 }
};
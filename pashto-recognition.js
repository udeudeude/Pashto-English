// Experimental on-device Pashto recognition using multilingual Whisper.
// Runs in the browser; downloads model weights on first use.
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
let recognizerPromise=null, recording=null;
const status=s=>document.getElementById('status').textContent=s;
const pashtoButton=document.getElementById('ps');
pashtoButton.disabled=false;
pashtoButton.onclick=async()=>{
 if(recording){recording.stop();return}
 if(!navigator.mediaDevices?.getUserMedia){status('Microphone recording is not supported by this browser.');return}
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}
 catch(e){status('Microphone permission failed: '+e.message);return}
 const recorder=new MediaRecorder(stream),chunks=[];
 recording=recorder;
 pashtoButton.textContent='■ Stop Pashto recording';
 status('Listening to Pashto. Tap again to stop.');
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 recorder.onerror=()=>status('Audio recording failed.');
 recorder.onstop=async()=>{
  recording=null;pashtoButton.innerHTML='🎙 پښتو<small>Speak Pashto</small>';
  stream.getTracks().forEach(t=>t.stop());
  try{
   status('Preparing Pashto recognition model. First download may be large…');
   if(!recognizerPromise)recognizerPromise=pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',{dtype:'q8',device:'wasm'}).catch(e=>{recognizerPromise=null;throw e});
   const recognizer=await recognizerPromise;
   status('Recognizing Pashto speech on this phone…');
   const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
   const bytes=await blob.arrayBuffer();
   const context=new (window.AudioContext||window.webkitAudioContext)();
   const audio=await context.decodeAudioData(bytes);
   const length=Math.ceil(audio.duration*16000);
   const offline=new OfflineAudioContext(1,length,16000);
   const source=offline.createBufferSource();source.buffer=audio;source.connect(offline.destination);source.start();
   const resampled=await offline.startRendering();
   await context.close();
   const result=await recognizer(resampled.getChannelData(0),{language:'pashto',task:'transcribe'});
   const transcript=(result.text||'').trim();
   if(!transcript)throw Error('No Pashto speech was recognized.');
   document.getElementById('original').textContent=transcript;
   status('Translating recognized Pashto…');
   const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(transcript)+'&langpair=ps|en';
   const response=await fetch(url);if(!response.ok)throw Error('Translation service unavailable.');
   const data=await response.json();
   if(data.responseStatus!==200||!data.responseData?.translatedText)throw Error('Translation failed.');
   const english=data.responseData.translatedText;
   const output=document.getElementById('result');output.textContent=english;output.lang='en';
   status('English translation ready. Tap Replay to hear it.');
   window.pashtoEnglishAudio={text:english,lang:'en'};
   const replay=document.getElementById('replay');
   replay.disabled=false;
   replay.onclick=()=>{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(english);u.lang='en-US';speechSynthesis.speak(u)};
   replay.click();
  }catch(e){status('Pashto recognition unavailable: '+e.message)}
 };
 try{recorder.start()}catch(e){recording=null;stream.getTracks().forEach(t=>t.stop());status('Recording failed: '+e.message)}
};

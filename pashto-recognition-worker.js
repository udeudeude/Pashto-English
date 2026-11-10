import {loadRecognitionEngine,PASHTO_TRANSCRIPTION_OPTIONS} from './lib/recognition-engine.mjs';
// Remote imports are confined to this disposable worker, never page startup.
let recognizerPromise;
self.onmessage=async({data:{id,audio}})=>{
 try{
  self.postMessage({id,type:'progress',stage:'loading'});
  recognizerPromise??=loadRecognitionEngine();
  const recognizer=await recognizerPromise;
  self.postMessage({id,type:'progress',stage:'recognizing'});
  const result=await recognizer(audio,PASHTO_TRANSCRIPTION_OPTIONS);
  self.postMessage({id,type:'result',text:String(result.text||'').trim()});
 }catch(error){
  // Parent terminates this worker: resetting only the pipeline promise cannot
  // reset Transformers.js's retained failed WebAssembly initialization promise.
  self.postMessage({id,type:'error',message:String(error?.message||error)});
 }
};

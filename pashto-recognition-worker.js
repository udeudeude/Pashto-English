// Remote imports are confined to this disposable worker, never page startup.
let recognizerPromise;
self.onmessage=async({data:{id,audio}})=>{
 try{
  self.postMessage({id,type:'progress',stage:'loading'});
  recognizerPromise??=import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1')
   .then(({pipeline,env})=>{
    env.allowLocalModels=false;
    // GitHub Pages does not supply cross-origin isolation headers.
    env.backends.onnx.wasm.numThreads=1;
    env.backends.onnx.wasm.proxy=false;
    return pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',{dtype:'q8',device:'wasm'});
   });
  const recognizer=await recognizerPromise;
  self.postMessage({id,type:'progress',stage:'recognizing'});
  const result=await recognizer(audio,{language:'pashto',task:'transcribe'});
  self.postMessage({id,type:'result',text:String(result.text||'').trim()});
 }catch(error){
  // Parent terminates this worker: resetting only the pipeline promise cannot
  // reset Transformers.js's retained failed WebAssembly initialization promise.
  self.postMessage({id,type:'error',message:String(error?.message||error)});
 }
};

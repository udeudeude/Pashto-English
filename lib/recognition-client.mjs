// One active request per worker. Termination also clears failed runtime caches.
export function createRecognitionClient({
 createWorker=()=>new Worker(new URL('../pashto-recognition-worker.js',import.meta.url),{type:'module'}),
 timeoutMs=180_000,
}={}){
 let worker=null,pending=null,nextId=0;
 const stop=(error)=>{
  worker?.terminate();worker=null;
  if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null}
 };
 return {
  cancel(){stop(new DOMException('Recognition cancelled','AbortError'))},
  recognize(audio,onProgress=()=>{},language='pashto'){
   if(pending)return Promise.reject(Error('Recognition is already running.'));
   return new Promise((resolve,reject)=>{
    const id=++nextId;
    try{
     worker??=createWorker();
     pending={id,resolve,reject,timer:setTimeout(()=>stop(Error('Recognition timed out.')),timeoutMs)};
     worker.onmessage=({data})=>{
      if(!pending||data.id!==pending.id)return;
      if(data.type==='progress'){onProgress(data.stage);return}
      if(data.type==='error'){stop(Error(data.message));return}
      if(data.type==='result'){
       clearTimeout(pending.timer);pending=null;resolve(data.text);
      }
     };
     worker.onerror=event=>{event.preventDefault?.();stop(Error(event.message||'Speech worker failed.'))};
     worker.onmessageerror=()=>stop(Error('Speech worker response failed.'));
     worker.postMessage({id,audio,language},[audio.buffer]);
    }catch(error){stop(error);reject(error)}
   });
  },
 };
}

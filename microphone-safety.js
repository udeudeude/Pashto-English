/* Fail-closed microphone ownership for both speech input paths.
 * No recording restarts automatically after backgrounding.
 * Track stoppage is synchronous and independent of MediaRecorder.onstop.
 */
(()=>{
 'use strict';
 const streams=new Set(),recognizers=new Set();
 let generation=0;
 const isForeground=()=>!document.hidden&&(typeof document.hasFocus!=='function'||document.hasFocus());
 function stopStream(stream){
  if(!stream)return;
  streams.delete(stream);
  for(const track of stream.getTracks?.()||[]){
   try{track.stop()}catch(error){console.warn('Microphone track stop failed:',error)}
  }
 }
 function stopRecognition(recognition){
  if(!recognition)return;
  recognizers.delete(recognition);
  // Safari sometimes reports onend without actually releasing its audio
  // session. Force both completion and discard; never rely on onend alone.
  try{recognition.abort()}catch(error){}
  try{recognition.stop()}catch(error){}
 }
 function stopAll(reason='background'){
  ++generation;
  for(const rec of [...recognizers])stopRecognition(rec);
  for(const stream of [...streams])stopStream(stream);
  window.dispatchEvent(new CustomEvent('pashto-microphone-stop',{detail:{reason}}));
 }
 function registerStream(stream,token){
  if(!stream)return false;
  if(token!==generation||!isForeground()){
   stopStream(stream);
   return false;
  }
  streams.add(stream);
  for(const track of stream.getTracks?.()||[]){
   track.addEventListener?.('ended',()=>{
    if([...(stream.getTracks?.()||[])].every(t=>t.readyState==='ended'))
     streams.delete(stream);
   },{once:true});
  }
  return true;
 }
 function registerRecognition(recognition,token){
  if(token!==generation||!isForeground()){
   stopRecognition(recognition);
   return false;
  }
  recognizers.add(recognition);
  return true;
 }
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)stopAll('hidden');
 },{capture:true});
 window.addEventListener('pagehide',()=>stopAll('pagehide'),{capture:true});
 window.addEventListener('blur',()=>{
  // Permission prompts can briefly blur the page before any track exists.
  // Once capture is active, however, loss of focus immediately stops it.
  if(streams.size||recognizers.size)stopAll('blur');
 },{capture:true});
 document.addEventListener('freeze',()=>stopAll('freeze'),{capture:true});
 window.pashtoMicrophoneSafety={
  token:()=>generation,
  isForeground,
  registerStream,registerRecognition,stopStream,stopRecognition,stopAll,
  state:()=>({streams:streams.size,recognizers:recognizers.size,foreground:isForeground()})
 };
})();
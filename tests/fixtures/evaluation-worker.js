import {loadRecognitionEngine,PASHTO_TRANSCRIPTION_OPTIONS,DEFAULT_RECOGNITION_MODEL} from '../../lib/recognition-engine.mjs';
const models={
 tiny:DEFAULT_RECOGNITION_MODEL,
 pashtoBase:{model:'ihanif/ps_base_l1',revision:'221eb2307d850d69e1578c1ebcdec7ba6a44ce45'},
};
const key=new URL(self.location.href).searchParams.get('model');
let engine;
self.onmessage=async({data:{id,audio}})=>{
 try{
  if(!models[key])throw Error('Unknown evaluation model');
  self.postMessage({id,type:'progress',stage:'loading'});
  engine??=loadRecognitionEngine(models[key]);
  const recognize=await engine;
  self.postMessage({id,type:'progress',stage:'recognizing'});
  const result=await recognize(audio,PASHTO_TRANSCRIPTION_OPTIONS);
  self.postMessage({id,type:'result',text:String(result.text||'').trim()});
 }catch(error){self.postMessage({id,type:'error',message:String(error.message||error)})}
};

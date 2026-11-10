import {test,expect} from '@playwright/test';
import {scorePairs} from '../lib/pashto-metrics.mjs';
import {mkdir,writeFile} from 'node:fs/promises';

test('compare generic tiny with Pashto-trained base on the same public Afghan speech',async({page},info)=>{
 test.skip(process.env.PASHTO_BENCHMARK!=='1','Opt-in external dataset/model evaluation');
 test.setTimeout(600_000);
 // Do not retain browser traces: they can contain corpus audio/transcripts.
 const get=async url=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(60_000)});
  if(!response.ok)throw Error(`Evaluation source returned ${response.status}`);
  return response;
 };
 const data=await (await get('https://datasets-server.huggingface.co/rows?dataset=google/fleurs&config=ps_af&split=test&offset=0&length=20')).json();
 const selected=data.rows.filter(item=>item.row.num_samples>=3200&&item.row.num_samples<=320000).slice(0,8);
 expect(selected.length).toBe(8);
 // Corpus clips and transcripts stay in process memory; only aggregate results are saved.
 const clips=[];
 for(const item of selected){
  const row=item.row;
  const src=Array.isArray(row.audio)?row.audio[0]?.src:row.audio?.src;
  if(!src)throw Error('Dataset audio URL missing');
  clips.push({rowIndex:item.row_idx,reference:row.transcription,bytes:Array.from(new Uint8Array(await (await get(src)).arrayBuffer()))});
 }
 await page.route('https://api.arasaac.org/**',route=>route.abort());
 await page.route('https://api.iconify.design/**',route=>route.abort());
 await page.goto('/');
 const reports=[];
 for(const model of ['tiny','pashtoBase']){
  const observations=await page.evaluate(async({model,clips})=>{
   const {createRecognitionClient}=await import('./lib/recognition-client.mjs');
   const {validateRecognitionAudio}=await import('./lib/recognition-audio.mjs');
   const client=createRecognitionClient({timeoutMs:180_000,createWorker:()=>new Worker(`./tests/fixtures/evaluation-worker.js?model=${model}`,{type:'module'})});
   const context=new AudioContext();const output=[];
   try{
    for(const clip of clips){
     const decoded=await context.decodeAudioData(new Uint8Array(clip.bytes).buffer);
     const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);
     const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
     const samples=validateRecognitionAudio((await offline.startRendering()).getChannelData(0));
     const started=performance.now();
     const hypothesis=await client.recognize(samples);
     output.push({hypothesis,elapsedMs:Math.round(performance.now()-started),durationSeconds:decoded.duration});
    }
    return output;
   }finally{client.cancel();await context.close()}
  },{model,clips:clips.map(({bytes})=>({bytes}))});
  const score=scorePairs(observations.map((o,i)=>({reference:clips[i].reference,hypothesis:o.hypothesis})));
  reports.push({model,...score,totalMs:observations.reduce((n,x)=>n+x.elapsedMs,0),firstClipMs:observations[0].elapsedMs,totalAudioSeconds:observations.reduce((n,x)=>n+x.durationSeconds,0)});
 }
 const report={dataset:'google/fleurs',config:'ps_af',split:'test',license:'CC-BY-4.0',source:'https://huggingface.co/datasets/google/fleurs',selection:'first eight rows in first twenty test rows with duration 0.2–20 seconds',rowIndexes:clips.map(x=>x.rowIndex),browser:info.project.name,reports,limitations:'Small convenience sample of read speech, not conversation accuracy. Training overlap cannot be ruled out. Runner timing is not phone performance.'};
 await mkdir('test-results/aggregate',{recursive:true});
 await writeFile(`test-results/aggregate/recognition-${info.project.name}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
});

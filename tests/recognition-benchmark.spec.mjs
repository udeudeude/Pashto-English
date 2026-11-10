import {test,expect} from '@playwright/test';
import {scorePairs} from '../lib/pashto-metrics.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';

test('compare generic tiny with Pashto-trained base on the same public Afghan speech',async({page},info)=>{
 test.skip(process.env.PASHTO_BENCHMARK!=='1','Opt-in external dataset/model evaluation');
 test.setTimeout(600_000);
 // Do not retain browser traces: they can contain corpus audio/transcripts.
 const {clips,datasetRevision}=JSON.parse(await readFile('/tmp/pashto-evaluation.json','utf8'));
 expect(clips.length).toBe(8);
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
     const decoded=await context.decodeAudioData(Uint8Array.from(atob(clip.audioBase64),c=>c.charCodeAt(0)).buffer);
     const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);
     const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
     const samples=validateRecognitionAudio((await offline.startRendering()).getChannelData(0));
     const started=performance.now();
     const hypothesis=await client.recognize(samples);
     output.push({hypothesis,elapsedMs:Math.round(performance.now()-started),durationSeconds:decoded.duration});
    }
    return output;
   }finally{client.cancel();await context.close()}
  },{model,clips:clips.map(({audioBase64})=>({audioBase64}))});
  const score=scorePairs(observations.map((o,i)=>({reference:clips[i].reference,hypothesis:o.hypothesis})));
  reports.push({model,...score,totalMs:observations.reduce((n,x)=>n+x.elapsedMs,0),firstClipMs:observations[0].elapsedMs,totalAudioSeconds:observations.reduce((n,x)=>n+x.durationSeconds,0)});
 }
 const report={dataset:'google/fleurs',config:'ps_af',split:'test',license:'CC-BY-4.0',source:'https://huggingface.co/datasets/google/fleurs',datasetRevision,selection:'first eight distinct reference texts in original test.tsv with duration 0.2–20 seconds',rowIndexes:clips.map(x=>x.rowIndex),browser:info.project.name,reports,limitations:'Small convenience sample of read speech, not conversation accuracy. Training overlap cannot be ruled out. Runner timing is not phone performance.'};
 await mkdir('test-results/aggregate',{recursive:true});
 await writeFile(`test-results/aggregate/recognition-${info.project.name}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
});

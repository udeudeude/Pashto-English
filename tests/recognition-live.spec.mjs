import {test,expect} from '@playwright/test';

// Explicit opt-in: downloads the actual third-party runtime and model.
// Silence tests engine execution only, never Pashto accuracy/intelligibility.
test('actual Whisper runtime loads and executes in the browser worker',async({page},testInfo)=>{
 test.skip(process.env.PASHTO_LIVE_MODEL!=='1','Network/model smoke test is opt-in');
 test.setTimeout(240_000);
 await page.route('https://api.arasaac.org/**',route=>route.abort());
 await page.route('https://api.iconify.design/**',route=>route.abort());
 await page.goto('/');
 const report=await page.evaluate(async()=>{
  const {createRecognitionClient}=await import('./lib/recognition-client.mjs');
  const client=createRecognitionClient({timeoutMs:180_000});
  const start=performance.now(),stages=[];
  try{
   const text=await client.recognize(new Float32Array(16_000),stage=>stages.push({stage,elapsedMs:Math.round(performance.now()-start)}));
   return {executed:true,elapsedMs:Math.round(performance.now()-start),stages,outputCharacters:text.length,
    interpretation:'Engine execution on synthetic silence only. No speech accuracy evidence.'};
  }catch(error){
   return {executed:false,elapsedMs:Math.round(performance.now()-start),stages,error:error.message};
  }finally{client.cancel()}
 });
 await testInfo.attach('recognition-runtime-report',{body:JSON.stringify(report,null,2),contentType:'application/json'});
 console.log(JSON.stringify({browser:testInfo.project.name,...report}));
 expect(report.executed,report.error).toBe(true);
 expect(report.stages.map(item=>item.stage)).toContain('recognizing');
});

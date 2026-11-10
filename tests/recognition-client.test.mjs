import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecognitionClient} from '../lib/recognition-client.mjs';
function setup(timeoutMs=1000){
 const workers=[];
 const client=createRecognitionClient({timeoutMs,createWorker(){
  const worker={terminated:false,postMessage(data){this.sent=data},terminate(){this.terminated=true},reply(data){this.onmessage({data:{id:this.sent.id,...data}})}};
  workers.push(worker);return worker;
 }});
 return {client,workers};
}
test('reuses a healthy worker and forwards progress without completing early',async()=>{
 const {client,workers}=setup();const stages=[];
 const result=client.recognize(new Float32Array(1600),stage=>stages.push(stage));
 workers[0].reply({type:'progress',stage:'loading'});
 workers[0].reply({type:'result',text:'سلام'});
 assert.equal(await result,'سلام');assert.deepEqual(stages,['loading']);
 const next=client.recognize(new Float32Array(1600));
 assert.equal(workers.length,1);
 workers[0].reply({type:'result',text:'بیا'});assert.equal(await next,'بیا');client.cancel();
});
test('engine failure destroys poisoned runtime and retry creates a fresh worker',async()=>{
 const {client,workers}=setup();const result=client.recognize(new Float32Array(1));
 workers[0].reply({type:'error',message:'wasm failed'});
 await assert.rejects(result,/wasm failed/);assert.equal(workers[0].terminated,true);
 const retry=client.recognize(new Float32Array(1));assert.equal(workers.length,2);
 workers[1].reply({type:'result',text:'سلام'});assert.equal(await retry,'سلام');client.cancel();
});
test('cancellation rejects pending work and late results cannot complete a newer request',async()=>{
 const {client,workers}=setup();const first=client.recognize(new Float32Array(1));client.cancel();
 await assert.rejects(first,{name:'AbortError'});
 const next=client.recognize(new Float32Array(1));
 workers[0].reply({type:'result',text:'old'});
 workers[1].reply({type:'result',text:'new'});assert.equal(await next,'new');client.cancel();
});
test('a stalled worker times out and terminates',async()=>{
 const {client,workers}=setup(10);
 await assert.rejects(client.recognize(new Float32Array(1)),/timed out/);
 assert.equal(workers[0].terminated,true);
});
test('concurrent recognition cannot overwrite pending work',async()=>{
 const {client,workers}=setup();const first=client.recognize(new Float32Array(1));
 await assert.rejects(client.recognize(new Float32Array(1)),/already running/);
 workers[0].reply({type:'result',text:'first'});assert.equal(await first,'first');client.cancel();
});
test('worker startup and message errors reject and permit retry',async()=>{
 const {client,workers}=setup();const first=client.recognize(new Float32Array(1));
 workers[0].onerror({message:'Import blocked',preventDefault(){}});
 await assert.rejects(first,/Import blocked/);
 const next=client.recognize(new Float32Array(1));workers[1].onmessageerror();
 await assert.rejects(next,/response failed/);
 const bad=createRecognitionClient({createWorker(){throw Error('Worker unsupported')}});
 await assert.rejects(bad.recognize(new Float32Array(1)),/Worker unsupported/);
});

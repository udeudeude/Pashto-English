import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSpeechText, speakWithFallback} from '../lib/voice-fallback.mjs';

test('normalization preserves Pashto letters and diacritics',()=>{
 assert.equal(normalizeSpeechText('  سلام،  تاسو\n څنګه ياست؟  '),'سلام، تاسو څنګه ياست؟');
 assert.equal(normalizeSpeechText('ښ ځ څ ړ ږ ګ ڼ ۍ ې'),'ښ ځ څ ړ ږ ګ ڼ ۍ ې');
 assert.equal(normalizeSpeechText('مَـننه'),'مَـننه');
});

test('optional neural synthesis falls back on error or invalid result',async()=>{
 const calls=[];
 const fallback=async(text,options)=>{calls.push({text,options});return {played:true,duration:1}};
 const first=await speakWithFallback({neural:async()=>{throw Error('unavailable')},fallback,text:'سلام',options:{speed:0.7}});
 assert.equal(first.engine,'espeak');
 const second=await speakWithFallback({neural:async()=>({played:false}),fallback,text:'سلام'});
 assert.equal(second.engine,'espeak');
 assert.equal(calls.length,2);
 assert.deepEqual(calls[0].options,{speed:0.7});
});

test('verified neural output bypasses fallback; cancellation prevents late fallback',async()=>{
 let fallbackCalls=0;
 const fallback=async()=>{fallbackCalls++;return {played:true}};
 const result=await speakWithFallback({neural:async()=>({played:true}),fallback,text:'سلام'});
 assert.equal(result.engine,'neural');
 let current=true;
 const cancelled=await speakWithFallback({neural:async()=>{current=false;throw Error('stale')},fallback,text:'سلام',isCurrent:()=>current});
 assert.equal(cancelled.cancelled,true);
 assert.equal(fallbackCalls,0);
});

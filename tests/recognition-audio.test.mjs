import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRecognitionAudio} from '../lib/recognition-audio.mjs';
test('digital silence cannot reach the speech model',()=>{
 assert.throws(()=>validateRecognitionAudio(new Float32Array(16000)),/No audio signal/);
 assert.throws(()=>validateRecognitionAudio(new Float32Array(16000).fill(1e-7)),/No audio signal/);
});
test('quiet nonzero audio is retained without normalization',()=>{
 const audio=new Float32Array(16000).fill(0.001);
 assert.equal(validateRecognitionAudio(audio),audio);
});
test('empty, too short, too long, and corrupt audio are rejected',()=>{
 for(const length of [0,3199])assert.throws(()=>validateRecognitionAudio(new Float32Array(length)),/too short/);
 assert.throws(()=>validateRecognitionAudio(new Float32Array(336001)),/too long/);
 for(const invalid of [NaN,Infinity,-Infinity]){
  const audio=new Float32Array(16000).fill(0.01);audio[42]=invalid;
  assert.throws(()=>validateRecognitionAudio(audio),/No usable audio/);
 }
});

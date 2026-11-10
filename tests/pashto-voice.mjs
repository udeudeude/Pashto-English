import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createEspeak, encodeWav } from '../vendor/pashto-voice/dist/node.js';

const espeak=await createEspeak({languages:['ps']});
const available=espeak.listVoices();
const pashto=available.filter(voice=>voice.languages?.some(lang=>lang.name==='ps'||lang.name?.startsWith('ps-')));
assert.ok(pashto.length>0,'The installed eSpeak NG build does not have Pashto voice definitions');
espeak.setVoice('ps');

const phrase='سلام، تاسو څنګه یاست؟';
const {samples,sampleRate}=espeak.synthesize(phrase);
assert.ok(sampleRate>8000&&sampleRate<96000,'Unexpected speech sample rate');
assert.ok(samples.length>sampleRate/5,'The synthesis contained no meaningful audio duration');
let peak=0;
for(const sample of samples)peak=Math.max(peak,Math.abs(sample));
assert.ok(peak>30,'The synthesis returned silence');
const wav=encodeWav(samples,sampleRate);
assert.ok(wav.byteLength>4000,'The resulting audio file is unexpectedly small');

await mkdir('test-results',{recursive:true});
await writeFile('test-results/pashto-voice.wav',wav);
console.log(JSON.stringify({
  result:'PASHTO_AUDIO_GENERATED_NOT_HUMAN_VERIFIED',
  voices:pashto.map(voice=>voice.name),
  durationSeconds:Number((samples.length/sampleRate).toFixed(2)),
  sampleRate,
  peak,
  wavBytes:wav.byteLength,
  text:phrase
},null,2));

const slower=espeak.synthesize(phrase,{rate:130});
assert.ok(slower.samples.length>samples.length*1.2,'Slower synthesis must lengthen speech without changing sample rate');
assert.equal(slower.sampleRate,sampleRate);
const normalAgain=espeak.synthesize(phrase,{rate:175});
assert.equal(espeak.getParameter('rate'),175,'Temporary rate override must restore normal speed');
assert.ok(Math.abs(normalAgain.samples.length-samples.length)<sampleRate*0.02,'Normal duration must be restored (allow synthesis jitter)');
console.log(JSON.stringify({slowDurationSeconds:slower.samples.length/slower.sampleRate,normalDurationSeconds:samples.length/sampleRate}));

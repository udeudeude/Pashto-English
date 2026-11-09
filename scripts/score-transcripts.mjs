// Usage: node scripts/score-transcripts.mjs predictions.jsonl
// JSONL lines: {"reference":"Pashto text","hypothesis":"recognized Pashto text"}
// Only aggregate counts are printed; do not put real speaker recordings in Git.
import { readFile } from 'node:fs/promises';
import { scorePairs } from '../lib/pashto-metrics.mjs';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/score-transcripts.mjs predictions.jsonl');process.exit(2)}
try{
 const lines=(await readFile(path,'utf8')).split(/\r?\n/u).filter(Boolean);
 const pairs=lines.map((line,i)=>{
  try{return JSON.parse(line)}catch{throw Error('Invalid JSON line '+(i+1))}
 });
 console.log(JSON.stringify(scorePairs(pairs),null,2));
}catch(error){console.error(error.message);process.exit(1)}

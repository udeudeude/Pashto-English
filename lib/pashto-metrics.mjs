// Pure text-only evaluation helpers. No speech recordings or speaker IDs are stored.
export function normalizePashto(text){
 return String(text||'').normalize('NFKC')
  // Tatweel and optional vowel marks are not generally present in transcripts.
  .replace(/\u0640/g,'')
  .replace(/[\u064b-\u065f\u0670]/g,'')
  // Regularize spacing and punctuation, NOT the distinct Pashto yeh letters.
  .replace(/[،؛؟,.!?:"“”‘’(){}\[\]«»]+/gu,' ')
  .replace(/\s+/gu,' ').trim();
}
export function editDistance(a,b){
 // O(min(a,b)) memory; efficient for clips under 30 seconds.
 if(a.length<b.length)[a,b]=[b,a];
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const next=[i];
  for(let j=1;j<=b.length;j++){
   const substitute=prev[j-1]+(a[i-1]===b[j-1]?0:1);
   next[j]=Math.min(prev[j]+1,next[j-1]+1,substitute);
  }
  prev=next;
 }
 return prev[b.length];
}
export function scorePairs(pairs){
 let clips=0,wordErrors=0,wordCount=0,charErrors=0,charCount=0;
 for(const item of pairs){
  if(typeof item.reference!=='string'||typeof item.hypothesis!=='string')
   throw Error('Each item must have reference and hypothesis strings.');
  const reference=normalizePashto(item.reference);
  const hypothesis=normalizePashto(item.hypothesis);
  if(!reference)continue;
  const refWords=reference.split(' '),hypWords=hypothesis?hypothesis.split(' '):[];
  const refChars=Array.from(reference.replace(/\s/gu,''));
  const hypChars=Array.from(hypothesis.replace(/\s/gu,''));
  wordErrors+=editDistance(refWords,hypWords);wordCount+=refWords.length;
  charErrors+=editDistance(refChars,hypChars);charCount+=refChars.length;
  clips++;
 }
 return {clips,wordErrors,referenceWords:wordCount,
   wordErrorRate:wordCount?Number((wordErrors/wordCount).toFixed(4)):null,
   characterErrors:charErrors,referenceCharacters:charCount,
   characterErrorRate:charCount?Number((charErrors/charCount).toFixed(4)):null};
}
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePashto,editDistance,scorePairs} from '../lib/pashto-metrics.mjs';
test('normalizer preserves distinct Pashto letter shapes and normalizes punctuation',()=>{
 assert.equal(normalizePashto('سلام،   تاسو؟'),'سلام تاسو');
 assert.notEqual(normalizePashto('ي'),normalizePashto('ې'));
 assert.equal(normalizePashto('سَلام'),'سلام');
});
test('Levenshtein handles substitutions, insertions, deletions and empty strings',()=>{
 assert.equal(editDistance(['a','b','c'],['a','d','c']),1);
 assert.equal(editDistance(['a'],[]),1);
 assert.equal(editDistance([],['a','b']),2);
 assert.equal(editDistance(Array.from('کتاب'),Array.from('کتب')),1);
});
test('aggregate word/character error rates are computed from references',()=>{
 const pairs=[{reference:'سلام تاسو',hypothesis:'سلام تاسو'},
              {reference:'زه اوبه غواړم',hypothesis:'زه اوبه'}];
 const score=scorePairs(pairs);
 assert.equal(score.clips,2);
 assert.equal(score.referenceWords,5);
 assert.equal(score.wordErrors,1);
 assert.equal(score.wordErrorRate,.2);
 assert.ok(score.characterErrorRate>0);
});
test('empty references are excluded and invalid rows fail loudly',()=>{
 assert.equal(scorePairs([{reference:'',hypothesis:''}]).clips,0);
 assert.throws(()=>scorePairs([{reference:null,hypothesis:'abc'}]),/strings/);
});

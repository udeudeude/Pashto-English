import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const corpus=JSON.parse(readFileSync(new URL('../audits/published-pashto-examples.json',import.meta.url),'utf8'));
test('published bilingual fixtures preserve provenance and uncertainty',()=>{
 assert.equal(corpus.schemaVersion,1);
 assert.ok(corpus.references.length>=2);
 const ids=new Set();
 for(const item of corpus.references){
  assert.ok(!ids.has(item.id));ids.add(item.id);
  assert.match(item.id,/^PUB-\d{3}$/);
  assert.ok(item.english.trim()&&item.pashto.trim());
  assert.match(item.pashto,/[\u0600-\u06ff]/u);
  assert.match(item.sourceUrl,/^https:\/\//);
  assert.ok(item.source&&item.license&&item.notes);
  assert.equal(item.confidence,'published-unverified');
 }
});

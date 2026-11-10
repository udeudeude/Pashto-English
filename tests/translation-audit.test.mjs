import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const corpus=JSON.parse(readFileSync(new URL('../audits/translation-contrast-corpus.json',import.meta.url),'utf8'));
const highRisk=['NEG-03','NUM-01','SAFE-01'];
test('translation probes are distinct, paired, and never misrepresented as Pashto ground truth',()=>{
  assert.equal(corpus.version,1);
  assert.ok(corpus.cases.length>=12);
  const ids=corpus.cases.map(c=>c.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const c of corpus.cases){
    assert.match(c.id,/^[A-Z]+-\d{2}$/);
    assert.equal(c.english.length,2);
    assert.ok(c.english.every(s=>typeof s==='string'&&s.trim().length>0));
    assert.notEqual(c.english[0],c.english[1]);
    assert.equal(c.pashtoGold,null);
    assert.equal(c.validation,'unverified');
    assert.equal(c.requiresReference,true);
    assert.ok(c.contrast.trim());
  }
  for(const id of highRisk)assert.ok(ids.includes(id));
});

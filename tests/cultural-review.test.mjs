import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractVisualConcepts } from '../lib/visual-language.mjs';
import { culturalReviewFor } from '../lib/cultural-review.mjs';

const register = JSON.parse(readFileSync(new URL('../audits/cultural-findings.json', import.meta.url), 'utf8'));
const findings = new Map(register.findings.map(f => [f.id, f]));

test('all visual cultural review identifiers resolve to open register entries', () => {
  for (const term of ['okay','old','like','play','right','medicine','pain','emergency','danger','man','woman','police','family','classroom','homework','student']) {
    const review = culturalReviewFor(term);
    assert.equal(review.status, 'needs-review');
    for (const id of review.findingIds) {
      assert.ok(findings.has(id), term + ': missing ' + id);
      assert.equal(findings.get(id).status, 'needs-review');
    }
  }
  assert.equal(culturalReviewFor('table'), null);
});

test('extracted health and gesture concepts carry review metadata without changing labels', () => {
  const concepts = extractVisualConcepts('medicine okay emergency', []);
  assert.deepEqual(concepts.map(c => c.label), ['medicine','okay','emergency']);
  assert.deepEqual(concepts.map(c => c.culturalReview.findingIds[0]), ['CULT-03','CULT-01','CULT-03']);
});

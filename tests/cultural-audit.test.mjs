import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audit = JSON.parse(readFileSync(new URL('../audits/cultural-findings.json', import.meta.url), 'utf8'));
const severities = new Set(['critical', 'high', 'moderate', 'minor']);

test('cultural findings have unique identifiers and explicit uncertainty', () => {
  assert.equal(audit.schemaVersion, 1);
  assert.ok(audit.findings.length >= 10);
  const ids = audit.findings.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of audit.findings) {
    assert.match(item.id, /^CULT-\d{2}$/);
    assert.ok(severities.has(item.severity));
    assert.ok(audit.evidenceLevels.includes(item.evidence));
    assert.ok(audit.statusValues.includes(item.status));
    for (const key of ['area', 'source', 'risk', 'validation']) {
      assert.ok(typeof item[key] === 'string' && item[key].trim(), item.id + ': ' + key);
    }
    assert.ok(Array.isArray(item.terms) && item.terms.length > 0);
    assert.notEqual(item.status, 'validated', 'Unreviewed finding cannot claim validation');
  }
});

test('high-stakes and gesture reviews remain explicitly open', () => {
  for (const id of ['CULT-01', 'CULT-03']) {
    const item = audit.findings.find(finding => finding.id === id);
    assert.ok(item);
    assert.equal(item.status, 'needs-review');
  }
});

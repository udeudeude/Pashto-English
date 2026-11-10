// Cultural review annotations are caution metadata, not claims about Afghan users.
// The corresponding evidence register is audits/cultural-findings.json.
const reviewTerms = new Map([
  ['okay', ['CULT-01']],
  ['old', ['CULT-02']], ['like', ['CULT-02']], ['play', ['CULT-02']],
  ['right', ['CULT-02']],
  ['medicine', ['CULT-03']], ['pain', ['CULT-03']],
  ['emergency', ['CULT-03']], ['danger', ['CULT-03']],
  ['man', ['CULT-07']], ['woman', ['CULT-07']], ['police', ['CULT-07']],
  ['family', ['CULT-07']], ['classroom', ['CULT-09']],
  ['homework', ['CULT-09']], ['student', ['CULT-09']]
]);
export function culturalReviewFor(label) {
  const ids = reviewTerms.get(String(label || '').toLowerCase()) || [];
  return ids.length ? { status: 'needs-review', findingIds: [...ids] } : null;
}

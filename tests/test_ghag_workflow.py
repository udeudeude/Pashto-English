import unittest
from pathlib import Path

class ExperimentWorkflowTests(unittest.TestCase):
    def test_pinned_revision_and_evidence_artifacts_required(self):
        source=(Path(__file__).resolve().parents[1]/'.github/workflows/ghag-inference.yml').read_text()
        self.assertIn('workflow_dispatch:',source)
        self.assertIn('ghag-conversion.py inspect --revision',source)
        self.assertIn('revision.txt',source)
        self.assertIn('pip-freeze.txt',source)
        self.assertIn('upload-artifact@v4',source)
        self.assertNotIn('--accept-download',source)

if __name__=='__main__':
    unittest.main()

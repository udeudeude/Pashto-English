import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

script = Path(__file__).resolve().parents[1] / 'experiments' / 'ghag-conversion.py'
spec = importlib.util.spec_from_file_location('ghag_conversion', script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ConversionTests(unittest.TestCase):
    def test_inspect_writes_parseable_report_without_weights(self):
        hub = types.ModuleType('huggingface_hub')
        hub.HfApi = lambda: SimpleNamespace(model_info=lambda repo, revision: SimpleNamespace(
            sha=revision, siblings=[SimpleNamespace(rfilename='config.json', size=123)]))
        hub.snapshot_download = lambda **kwargs: self.fail('inspect must not download weights')
        with tempfile.TemporaryDirectory() as folder, patch.dict(sys.modules, {'huggingface_hub': hub}):
            args = SimpleNamespace(stage='inspect', revision='a'*40, output=folder,
                                   accept_download=False, speaker=None)
            result = module.run(args)
            report = json.loads((Path(folder) / 'report.json').read_text(encoding='utf-8'))
            self.assertEqual(result, report)
            self.assertFalse(report['errors'])
            self.assertFalse(report['inference_verified'])
            self.assertEqual(report['files'][0]['name'], 'config.json')

    def test_mismatched_revision_is_rejected_and_recorded(self):
        hub = types.ModuleType('huggingface_hub')
        hub.HfApi = lambda: SimpleNamespace(model_info=lambda repo, revision: SimpleNamespace(
            sha='b'*40, siblings=[]))
        hub.snapshot_download = lambda **kwargs: self.fail('revision mismatch must not download')
        with tempfile.TemporaryDirectory() as folder, patch.dict(sys.modules, {'huggingface_hub': hub}):
            result = module.run(SimpleNamespace(stage='inspect', revision='a'*40,
                output=folder, accept_download=False, speaker=None))
            self.assertEqual(result['errors'][0]['type'], 'RuntimeError')
            self.assertTrue(json.loads((Path(folder) / 'report.json').read_text())['errors'])

if __name__ == '__main__':
    unittest.main()

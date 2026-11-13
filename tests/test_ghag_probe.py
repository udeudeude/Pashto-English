import unittest
import importlib.util
from pathlib import Path

spec=importlib.util.spec_from_file_location('ghag_probe',Path(__file__).resolve().parents[1]/'scripts'/'probe-ghag-artifacts.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ProbeTests(unittest.TestCase):
    def test_reports_missing_files_without_fabricating_sizes(self):
        model={'sha':'abc','cardData':{'license':'apache-2.0'}}
        tree=[{'path':'best_model.pth','type':'file','size':1024,'lfs':{'oid':'sha256:abc'}}]
        report=module.report(model,tree)
        self.assertEqual(report['revision'],'abc')
        self.assertEqual(report['artifacts'][0]['bytes'],1024)
        self.assertFalse(report['artifacts'][1]['present'])
        self.assertIsNone(report['artifacts'][1]['bytes'])
        self.assertFalse(report['inference_verified'])
        self.assertFalse(report['browser_compatible'])

if __name__=='__main__':
    unittest.main()

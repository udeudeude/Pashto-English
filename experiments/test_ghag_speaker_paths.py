"""Regression tests for Ghag's Coqui VITS speaker-file configuration.

These tests use only Python's standard library and never download weights.
"""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("ghag-conversion.py")
spec = importlib.util.spec_from_file_location("ghag_conversion", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SpeakerPathsTests(unittest.TestCase):
    def test_embedding_paths_are_single_element_lists_at_both_config_levels(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "speakers-converted.json"
            config = {"model_args": {"use_d_vector_file": True, "d_vector_file": "old.pth"},
                      "d_vector_file": "old.pth", "speakers_file": "speakers.json"}
            updated = module.configure_speaker_embedding_paths(config, path)
            self.assertEqual(updated["d_vector_file"], [str(path)])
            self.assertEqual(updated["model_args"]["d_vector_file"], [str(path)])
            self.assertEqual(updated["speakers_file"], "speakers.json")
            parsed = json.loads(json.dumps(updated))
            self.assertIsInstance(parsed["model_args"]["d_vector_file"], list)
            self.assertEqual(len(parsed["model_args"]["d_vector_file"]), 1)
            self.assertEqual(parsed["model_args"]["d_vector_file"][0], str(path))

    def test_missing_model_args_fails_before_model_initialization(self):
        with self.assertRaisesRegex(ValueError, "model_args"):
            module.configure_speaker_embedding_paths({}, Path("speakers.json"))

    def test_other_model_options_are_not_modified(self):
        config = {"model_args": {"use_d_vector_file": True, "d_vector_dim": 512,
                                 "num_speakers": 11},
                  "language_ids_file": "language_ids.json"}
        updated = module.configure_speaker_embedding_paths(config, Path("converted.json"))
        self.assertEqual(updated["model_args"]["d_vector_dim"], 512)
        self.assertEqual(updated["model_args"]["num_speakers"], 11)
        self.assertEqual(updated["language_ids_file"], "language_ids.json")


if __name__ == "__main__":
    unittest.main()

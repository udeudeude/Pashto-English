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

    def test_integer_speaker_ids_are_not_mistaken_for_d_vectors(self):
        ids = {"speaker_01": 0, "speaker_02": 1}
        self.assertEqual(module.classify_speaker_metadata(ids), "speaker_id_map")

    def test_real_clip_embedding_metadata_is_recognized(self):
        samples = {"clip_1.wav": {"name": "speaker_01", "embedding": [0.1, 0.2]}}
        self.assertEqual(module.classify_speaker_metadata(samples), "clip_d_vectors")

    def test_unknown_speaker_metadata_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unrecognized"):
            module.classify_speaker_metadata({"speaker_01": {"id": 0}})
        with self.assertRaisesRegex(ValueError, "nonempty"):
            module.classify_speaker_metadata({})

    def test_diagnostic_signal_is_nonempty_and_never_a_published_voice(self):
        import soundfile as sf
        with tempfile.TemporaryDirectory() as directory:
            wav = Path(directory) / "synthetic.wav"
            module.make_diagnostic_reference(wav)
            samples, rate = sf.read(str(wav))
            self.assertEqual(rate, 16000)
            self.assertEqual(len(samples), 64000)
            self.assertGreater(max(samples), 0.01)


    def test_direct_synthesis_uses_custom_model_synthesizer_and_language(self):
        class FakeSynthesizer:
            def __init__(self):
                self.calls = []
            def tts(self, **kwargs):
                self.calls.append(kwargs)
                return [0.1, 0.2]
        fake = FakeSynthesizer()
        self.assertEqual(module.synthesize_directly(fake, "سلام", "published_speaker"),
                         [0.1, 0.2])
        self.assertEqual(fake.calls, [{
            "text": "سلام", "language_name": "ps",
            "split_sentences": False, "speaker_name": "published_speaker"}])
        fake.calls.clear()
        self.assertEqual(module.synthesize_directly(
            fake, "سلام", "unused", Path("/tmp/diagnostic.wav")), [0.1, 0.2])
        self.assertEqual(fake.calls, [{
            "text": "سلام", "language_name": "ps",
            "split_sentences": False, "speaker_wav": "/tmp/diagnostic.wav"}])

    def test_direct_synthesis_requires_speaker_conditioning(self):
        class FakeSynthesizer:
            def tts(self, **kwargs):
                raise AssertionError("Should not call synthesizer without a speaker")
        with self.assertRaisesRegex(ValueError, "speaker"):
            module.synthesize_directly(FakeSynthesizer(), "سلام", None)


if __name__ == "__main__":
    unittest.main()

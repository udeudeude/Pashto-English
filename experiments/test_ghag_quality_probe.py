"""Offline regression tests for independent Pashto speech recognition scoring."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import ghag_quality_probe as probe


class GhagQualityProbeTests(unittest.TestCase):
    def test_pashto_punctuation_does_not_change_scored_words(self):
        score = probe.compare_text("سلام، تاسو څنګه یاست؟", "سلام تاسو څنګه یاست")
        self.assertEqual(score["word_edits"], 0)
        self.assertEqual(score["character_edits"], 0)

    def test_different_pashto_graphemes_remain_different(self):
        score = probe.compare_text("ی ۍ ې", "ي ي ي")
        self.assertEqual(score["word_edits"], 3)
        self.assertGreater(score["character_error_rate"], 0)

    def test_errors_can_exceed_one_and_empty_hypothesis_is_not_success(self):
        score = probe.compare_text("سلام", "سلام سلام سلام")
        self.assertGreater(score["word_error_rate"], 1)
        self.assertEqual(probe.compare_text("سلام", "")["word_error_rate"], 1)

    def test_zero_length_reference_rejected(self):
        with self.assertRaisesRegex(ValueError, "Empty normalized"):
            probe.compare_text("؟؟!!", "څنګه")

    def test_reference_loader_binds_exact_dataset_split_and_row(self):
        def good_loader(url, limit):
            self.assertEqual(limit, 1_000_000)
            parts = urlsplit(url)
            self.assertEqual(parts.hostname, "datasets-server.huggingface.co")
            params = parse_qs(parts.query)
            self.assertEqual(params["dataset"], ["google/fleurs"])
            self.assertEqual(params["config"], ["ps_af"])
            self.assertEqual(params["split"], ["validation"])
            self.assertEqual(params["offset"], ["0"])
            return json.dumps({
                "dataset": "google/fleurs", "config": "ps_af",
                "split": "validation",
                "rows": [{"row_idx": 0, "row": {
                    "transcription": "دا عامه خپره شوې وینا ده",
                }}],
            }).encode("utf-8")
        self.assertEqual(probe.public_reference_transcript(loader=good_loader),
                         "دا عامه خپره شوې وینا ده")

    def test_reference_transcript_rejects_wrong_language_or_index(self):
        for config, row_idx in (("en_us", 0), ("ps_af", 1)):
            with self.subTest(config=config, row_idx=row_idx):
                body = json.dumps({
                    "dataset": "google/fleurs", "config": config,
                    "split": "validation", "rows": [{
                        "row_idx": row_idx, "row": {"transcription": "سلام"},
                    }],
                }).encode()
                with self.assertRaises(ValueError):
                    probe.public_reference_transcript(loader=lambda u, m: body)

    def test_report_never_includes_actual_transcribed_text(self):
        with TemporaryDirectory() as temp:
            ref = Path(temp) / "public.wav"
            gen = Path(temp) / "generated.wav"
            report = Path(temp) / "report.json"
            ref.write_bytes(b"f" * 128)
            gen.write_bytes(b"g" * 128)
            fake_whisper = SimpleNamespace(load_model=lambda name, device: object())
            fake_torch = SimpleNamespace(__version__="test-version")
            calls = []
            def recognize(_model, wav):
                calls.append(wav.name)
                if wav == ref:
                    return "سلام دنیا", {"detected_language": "ps",
                                          "pashto_language_probability": 0.7,
                                          "recognition_seconds": 0.01}
                return "سلام تاسو څنګه یاست", {"detected_language": "ps",
                                                 "pashto_language_probability": 0.8,
                                                 "recognition_seconds": 0.02}
            with patch.dict("sys.modules", {"whisper": fake_whisper, "torch": fake_torch}), \
                 patch.object(probe, "public_reference_transcript", return_value="سلام دنیا"), \
                 patch.object(probe, "recognize", side_effect=recognize):
                result = probe.run(ref, gen, report)
            self.assertEqual(calls, ["public.wav", "generated.wav"])
            self.assertTrue(result["asr_control_usable_for_exploration"])
            self.assertFalse(result["pronunciation_verified"])
            text = report.read_text(encoding="utf-8")
            self.assertNotIn("سلام دنیا", text)
            self.assertNotIn("سلام تاسو", text)
            self.assertEqual(json.loads(text)["ghag_generated"]["character_error_rate"], 0)

    def test_bad_control_never_marks_quality_evaluation_informative(self):
        with TemporaryDirectory() as temp:
            ref = Path(temp) / "reference.wav"
            gen = Path(temp) / "generated.wav"
            for p in (ref, gen):
                p.write_bytes(b"0" * 128)
            fake_whisper = SimpleNamespace(load_model=lambda name, device: object())
            fake_torch = SimpleNamespace(__version__="test")
            with patch.dict("sys.modules", {"whisper": fake_whisper, "torch": fake_torch}), \
                 patch.object(probe, "public_reference_transcript", return_value="سلام دنیا"), \
                 patch.object(probe, "recognize", side_effect=[
                     ("nonsense", {"detected_language": "en",
                                   "pashto_language_probability": 0.01,
                                   "recognition_seconds": 0.1}),
                     ("سلام تاسو څنګه یاست", {"detected_language": "ps",
                                              "pashto_language_probability": 0.9,
                                              "recognition_seconds": 0.1}),
                 ]):
                result = probe.run(ref, gen, Path(temp) / "report.json")
            self.assertFalse(result["asr_control_usable_for_exploration"])
            self.assertFalse(result["pronunciation_verified"])
            self.assertIn("failed", result["interpretation"])

    def test_requires_real_waveforms_and_valid_model_choice(self):
        with TemporaryDirectory() as temp:
            empty = Path(temp) / "missing.wav"
            with self.assertRaisesRegex(ValueError, "Only a bounded"):
                probe.run(empty, empty, Path(temp) / "report.json", "turbo")
            with self.assertRaisesRegex(ValueError, "Both real-reference"):
                probe.run(empty, empty, Path(temp) / "report.json")

    def test_ephemeral_control_reuses_original_reference_request(self):
        from ghag_quality_probe import ephemeral_control_transcript
        with TemporaryDirectory() as directory:
            path = Path(directory) / "reference-transcript.txt"
            path.write_text("سلام، تاسو څنګه یاست؟\n", encoding="utf-8")
            self.assertEqual(ephemeral_control_transcript(path), "سلام، تاسو څنګه یاست؟")
            path.write_text("", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "ephemeral"):
                ephemeral_control_transcript(path)

    def test_optional_espeak_baseline_reuses_exact_source_text_and_rejects_missing_wav(self):
        with TemporaryDirectory() as temp:
            ref = Path(temp) / "public.wav"
            ghag = Path(temp) / "ghag.wav"
            espeak = Path(temp) / "espeak.wav"
            for path in (ref, ghag, espeak):
                path.write_bytes(b"0" * 128)
            expected_calls = []
            def recognize(_model, audio):
                expected_calls.append(Path(audio).name)
                recognized = ("سلام دنیا" if audio == ref else
                              "سلام تاسو څنګه یاست" if audio == ghag else "تاسو څنګه یاست")
                return recognized, {
                    "detected_language": "ps", "pashto_language_probability": 0.8,
                    "recognition_seconds": 0.1,
                }
            fake_whisper = SimpleNamespace(load_model=lambda name, device: object())
            fake_torch = SimpleNamespace(__version__="test")
            with patch.dict("sys.modules", {"whisper": fake_whisper, "torch": fake_torch}), \
                 patch.object(probe, "recognize", side_effect=recognize), \
                 patch.object(probe, "public_reference_transcript", return_value="سلام دنیا"):
                result = probe.run(ref, ghag, Path(temp) / "report.json", espeak_wav=espeak)
            self.assertEqual(expected_calls, ["public.wav", "ghag.wav", "espeak.wav"])
            self.assertIn("espeak_generated", result)
            self.assertGreater(result["espeak_generated"]["word_error_rate"], 0)
            self.assertEqual(result["espeak_generated"]["source"],
                             "BUNDLED_ESPEAK_NG_PASHTO_VOICE")
            self.assertFalse(result["pronunciation_verified"])
            self.assertNotIn("سلام دنیا", str(result))
            espeak.unlink()
            with self.assertRaisesRegex(ValueError, "Real eSpeak"):
                probe.run(ref, ghag, Path(temp) / "fail.json", espeak_wav=espeak)


if __name__ == "__main__":
    unittest.main()

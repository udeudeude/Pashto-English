"""Offline, synthetic-only compact Pashto Whisper calibration gates."""
import contextlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import pashto_compact_whisper_probe as compact


def controls():
    return [{"row_index": i, "audio_sha256": f"{i+1:064x}"}
            for i in range(3)]


def provenance():
    return {
        "dataset": "google/fleurs", "configuration": "ps_af",
        "split": "test", "license": "cc-by-4.0",
        "source_parquet_sha256": compact.EXPECTED_PUBLIC_SHARD_SHA256,
    }


class CompactPashtoProbeTests(unittest.TestCase):
    def test_exact_three_public_source_controls_required(self):
        self.assertEqual(compact.verify_source(controls(), provenance()),
                         provenance())
        for broken in (controls()[:2], controls() + [controls()[0]],
                       [{**x, "row_index": 9} if i == 1 else x
                        for i, x in enumerate(controls())]):
            with self.subTest(broken=broken), self.assertRaises(ValueError):
                compact.verify_source(broken, provenance())

    def test_duplicate_and_wrong_dataset_or_license_rejected(self):
        duplicated = controls()
        duplicated[2]["audio_sha256"] = duplicated[1]["audio_sha256"]
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            compact.verify_source(duplicated, provenance())
        for key, value in (
            ("license", "cc-by-nc-4.0"), ("split", "train"),
            ("configuration", "en_us"), ("dataset", "other/fleurs"),
            ("source_parquet_sha256", "0" * 64),
        ):
            p = {**provenance(), key: value}
            with self.subTest(key=key), self.assertRaises(ValueError):
                compact.verify_source(controls(), p)

    def test_whisper_is_forced_to_pashto_and_bounded_generation(self):
        calls = []
        processor = lambda samples, **k: SimpleNamespace(input_features="spectrogram")
        processor.batch_decode = lambda tokens, skip_special_tokens: ["سلام"]
        class FakeWhisper:
            def generate(self, **kwargs):
                calls.append(kwargs)
                return [[1, 2, 3]]
        fake_torch = SimpleNamespace(inference_mode=contextlib.nullcontext)
        with patch.dict(sys.modules, {"torch": fake_torch}):
            result = compact.recognize(FakeWhisper(), processor, [0, .1])
        self.assertEqual(result, "سلام")
        self.assertEqual(calls[0]["language"], "pashto")
        self.assertEqual(calls[0]["task"], "transcribe")
        self.assertEqual(calls[0]["max_new_tokens"], 160)
        self.assertFalse(calls[0]["do_sample"])

    def test_model_license_rejected_before_public_audio_fetch(self):
        illegal = SimpleNamespace(
            sha="a" * 40, card_data={"license": "cc-by-nc-4.0"},
            pipeline_tag="automatic-speech-recognition")
        fake_hub = SimpleNamespace(
            HfApi=lambda: SimpleNamespace(model_info=lambda *a, **k: illegal))
        fake_trans = SimpleNamespace(
            WhisperFeatureExtractor=object, WhisperTokenizerFast=object,
            WhisperProcessor=object, AutoModelForSpeechSeq2Seq=object)
        with patch.dict(sys.modules, {
            "torch": SimpleNamespace(), "transformers": fake_trans,
            "huggingface_hub": fake_hub
        }), patch.object(compact, "fetch_three_controls") as fetch:
            with self.assertRaisesRegex(ValueError, "license"):
                compact.run()
        fetch.assert_not_called()

    def test_fast_public_tokenizer_and_exact_mel_config_precede_audio_download(self):
        called = []
        good = SimpleNamespace(
            sha="a" * 40, card_data={"license": "apache-2.0"},
            pipeline_tag="automatic-speech-recognition")
        fake_hub = SimpleNamespace(
            HfApi=lambda: SimpleNamespace(model_info=lambda *a, **k: good))
        class Tokenizer:
            unk_token_id = 0
            def convert_tokens_to_ids(self, token):
                return 50359 if token == "<|ps|>" else 0
        class Fast:
            @staticmethod
            def from_pretrained(repo, **kwargs):
                called.append(("fast-tokenizer", repo, kwargs))
                return Tokenizer()
        def feature(**kwargs):
            called.append(("mel-features", kwargs))
            return "known-feature-extractor"
        def processor(**kwargs):
            called.append(("processor", kwargs))
            return "model-processor"
        fake_trans = SimpleNamespace(
            WhisperFeatureExtractor=feature, WhisperTokenizerFast=Fast,
            WhisperProcessor=processor, AutoModelForSpeechSeq2Seq=object)
        fake_torch = SimpleNamespace(set_num_threads=lambda *_: None)
        with patch.dict(sys.modules, {
            "torch": fake_torch, "transformers": fake_trans,
            "huggingface_hub": fake_hub}), \
             patch.object(compact, "fetch_three_controls",
                          side_effect=RuntimeError("stop before public audio download")):
            with self.assertRaisesRegex(RuntimeError, "stop before public audio"):
                compact.run()
        self.assertEqual(called[0][0], "fast-tokenizer")
        self.assertEqual(called[0][1], compact.MODEL_ID)
        self.assertEqual(called[1][1]["sampling_rate"], 16000)
        self.assertEqual(called[1][1]["feature_size"], 80)
        self.assertEqual(called[1][1]["hop_length"], 160)
        self.assertEqual(called[1][1]["n_fft"], 400)
        self.assertEqual(called[2][0], "processor")
        self.assertEqual(compact.run.phase, "authentic-external-test-source")

    def test_error_reports_never_expose_sensitive_exception_messages(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "report.json"
            with patch.object(compact, "run", side_effect=RuntimeError(
                    "PRIVATE-PASHTO-TRANSCRIPT-AND-SHARE-LINK")), \
                 patch.object(sys, "argv", ["program", "--report", str(output)]):
                self.assertEqual(compact.main(), 1)
            text = output.read_text()
            self.assertNotIn("PRIVATE-PASHTO", text)
            data = json.loads(text)
            self.assertEqual(data["error_type"], "RuntimeError")
            self.assertFalse(data["generated_voice_scoring_executed"])


if __name__ == "__main__":
    unittest.main()

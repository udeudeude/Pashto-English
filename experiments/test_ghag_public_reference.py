"""Offline tests for the licensed, bounded FLEURS Pashto reference path."""
import io
import json
import math
import tempfile
from pathlib import Path
import unittest
from urllib.parse import parse_qs, urlsplit

import numpy as np
import soundfile as sf

from ghag_public_reference import (
    bounded_response, fetch_reference, reference_audio_url, validate_clip,
)


class FakeResponse(io.BytesIO):
    def __init__(self, data, url):
        super().__init__(data)
        self.url = url

    def geturl(self):
        return self.url


class ReferenceTests(unittest.TestCase):
    def setUp(self):
        self.audio_url = (
            "https://datasets-server.huggingface.co/assets/google/fleurs/"
            "--/ps_af/validation/0/audio/audio.wav"
        )
        timeline = np.arange(4 * 16000) / 16000
        wav = io.BytesIO()
        sf.write(wav, 0.1 * np.sin(2 * np.pi * 170 * timeline), 16000, format="WAV")
        self.wav_bytes = wav.getvalue()
        self.row = {"dataset": "google/fleurs", "config": "ps_af",
                    "split": "validation", "rows": [{"row_idx": 0, "row": {
                        "audio": [{"src": self.audio_url, "type": "audio/wav"}],
                        "transcription": "Do not publish sample text or identity",
                    }}]}

    def fake_opener(self, req, timeout):
        url = req.full_url
        if url == self.audio_url:
            return FakeResponse(self.wav_bytes, url)
        self.assertEqual(urlsplit(url).path, "/rows")
        qs = parse_qs(urlsplit(url).query)
        self.assertEqual(qs["config"], ["ps_af"])
        self.assertEqual(qs["offset"], ["0"])
        return FakeResponse(json.dumps(self.row).encode(), url)

    def test_audio_url_accepts_only_dataset_viewer_asset(self):
        self.assertEqual(reference_audio_url({"audio": [{"src": self.audio_url}]}),
                         self.audio_url)
        for url in ("file:///tmp/clip.wav", "http://datasets-server.huggingface.co/assets/x",
                    "https://evil.example/assets/x", "https://datasets-server.huggingface.co/rows"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                reference_audio_url({"audio": [{"src": url}]})

    def test_size_limit_and_redirect_blocked(self):
        def too_big(req, timeout):
            return FakeResponse(b"x" * 6, req.full_url)
        with self.assertRaisesRegex(ValueError, "size limit"):
            bounded_response(self.audio_url, 5, too_big)
        def bad_redirect(req, timeout):
            return FakeResponse(b"valid", "https://evil.example/out")
        with self.assertRaisesRegex(ValueError, "trusted"):
            bounded_response(self.audio_url, 100, bad_redirect)

    def test_cold_dataset_timeout_retries_once_without_relaxing_guards(self):
        calls = []
        def slow_then_success(req, timeout):
            calls.append(timeout)
            if len(calls) == 1:
                raise TimeoutError("cold metadata backend")
            return FakeResponse(b"ok", req.full_url)
        self.assertEqual(bounded_response(self.audio_url, 100, slow_then_success), b"ok")
        self.assertEqual(calls, [75, 75])

    def test_repeated_timeout_fails_closed(self):
        calls = []
        def always_timeout(req, timeout):
            calls.append(timeout)
            raise TimeoutError("metadata backend still unavailable")
        with self.assertRaises(TimeoutError):
            bounded_response(self.audio_url, 100, always_timeout)
        self.assertEqual(len(calls), 2)

    def test_download_decodes_and_records_only_safe_provenance(self):
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "reference.wav"
            metadata = fetch_reference(file, opener=self.fake_opener)
            wave, rate = sf.read(file)
            self.assertEqual(rate, 16000)
            self.assertEqual(len(wave), 64000)
            self.assertEqual(metadata["license"], "cc-by-4.0")
            self.assertEqual(metadata["speech_source"], "PUBLIC_HUMAN_SPEECH")
            self.assertFalse(metadata["training_cleaner_parity_verified"])
            self.assertFalse(metadata["speaker_identity_verified"])
            self.assertNotIn("transcription", str(metadata))
            self.assertNotIn("audio.wav", metadata["reference_wav_sha256"])

    def test_rejects_wrong_row_or_dataset(self):
        for key, value in (("dataset", "wrong/dataset"), ("config", "en_us"),
                           ("split", "test")):
            with self.subTest(key=key), tempfile.TemporaryDirectory() as tmp:
                old = self.row[key]
                self.row[key] = value
                try:
                    with self.assertRaises(ValueError):
                        fetch_reference(Path(tmp) / "reference.wav", opener=self.fake_opener)
                finally:
                    self.row[key] = old

    def test_short_silent_nonfinite_and_loud_clips_rejected(self):
        with self.assertRaises(ValueError):
            validate_clip(np.zeros(16000, dtype=np.float32), 16000)
        with self.assertRaises(ValueError):
            validate_clip(np.zeros(48000, dtype=np.float32), 16000)
        with self.assertRaises(ValueError):
            validate_clip(np.array([math.nan] * 48000, dtype=np.float32), 16000)
        with self.assertRaises(ValueError):
            validate_clip(np.ones(48000, dtype=np.float32) * 1.5, 16000)

    def test_rejects_excessive_row_index(self):
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(ValueError):
            fetch_reference(Path(tmp) / "x.wav", row_idx=10_000, opener=self.fake_opener)


if __name__ == "__main__":
    unittest.main()

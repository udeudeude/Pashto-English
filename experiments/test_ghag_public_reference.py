"""Offline tests for the licensed, bounded FLEURS Pashto reference path."""
import io
import hashlib
import json
import math
import tempfile
from pathlib import Path
import unittest
from urllib.parse import parse_qs, urlsplit
from urllib.error import HTTPError
from unittest.mock import patch

import numpy as np
import soundfile as sf

from ghag_public_reference import (
    bounded_response, fetch_reference, reference_audio_url, validate_clip,
    verify_preflight_reference,
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
                        "transcription": "دا یوه ازموینې جمله ده",
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
        # Live dataset viewer may return a revision-scoped, signed cache URL.
        cached = ("https://datasets-server.huggingface.co/cached-assets/google/fleurs/"
                  "--/revision/--/ps_af/validation/0/audio/audio.wav"
                  "?Expires=9999999999&Signature=opaque")
        self.assertEqual(reference_audio_url({"audio": [{"src": cached}]}), cached)
        for url in ("file:///tmp/clip.wav", "http://datasets-server.huggingface.co/assets/x",
                    "https://evil.example/assets/x", "https://datasets-server.huggingface.co/rows"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                reference_audio_url({"audio": [{"src": url}]})

    def test_temporary_503_retry_then_success_without_relaxing_bounds(self):
        calls = []
        delays = []
        def flaky(req, timeout):
            calls.append((req.full_url, timeout))
            if len(calls) == 1:
                raise HTTPError(req.full_url, 503, "temporarily unavailable", {}, None)
            return FakeResponse(b"ok", req.full_url)
        with patch("ghag_public_reference.time.sleep", side_effect=delays.append):
            self.assertEqual(bounded_response(self.audio_url, 100, flaky), b"ok")
        self.assertEqual(delays, [1])
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(timeout == 75 for _, timeout in calls))

    def test_persistent_503_fails_closed_and_403_does_not_retry(self):
        for code, expected_count, expected_delays in ((503, 3, [1, 3]), (403, 1, [])):
            calls, delays = [], []
            def failed(req, timeout):
                calls.append(timeout)
                raise HTTPError(req.full_url, code, "unavailable", {}, None)
            with self.subTest(code=code), patch(
                "ghag_public_reference.time.sleep", side_effect=delays.append
            ), self.assertRaises(HTTPError):
                bounded_response(self.audio_url, 100, failed)
            self.assertEqual(len(calls), expected_count)
            self.assertEqual(delays, expected_delays)

    def test_optional_public_control_text_remains_ephemeral(self):
        with tempfile.TemporaryDirectory() as directory:
            transcript = Path(directory) / "transcript.txt"
            metadata = fetch_reference(
                Path(directory) / "reference.wav",
                transcript_path=transcript, opener=self.fake_opener)
            self.assertEqual(transcript.read_text(encoding="utf-8"),
                             "دا یوه ازموینې جمله ده\n")
            self.assertNotIn("دا یوه ازموینې جمله ده", str(metadata))
            self.assertEqual(
                metadata["control_transcript_sha256"],
                hashlib.sha256(transcript.read_bytes()).hexdigest(),
            )

    def test_optional_public_control_rejects_missing_transcript(self):
        with tempfile.TemporaryDirectory() as directory:
            original = self.row["rows"][0]["row"].pop("transcription")
            try:
                with self.assertRaisesRegex(ValueError, "bounded transcript"):
                    fetch_reference(Path(directory) / "clip.wav",
                                    transcript_path=Path(directory) / "text.txt",
                                    opener=self.fake_opener)
            finally:
                self.row["rows"][0]["row"]["transcription"] = original

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
            self.assertNotIn("control_transcript_sha256", metadata)
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

    def test_reuse_preflight_validated_reference_without_any_second_network_request(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "reference.wav"
            text = Path(tmp) / "transcript.txt"
            manifest = Path(tmp) / "manifest.json"
            metadata = fetch_reference(path, transcript_path=text, opener=self.fake_opener)
            manifest.write_text(json.dumps(metadata), encoding="utf-8")
            verified = verify_preflight_reference(path, text, manifest)
            self.assertEqual(verified["reference_wav_sha256"], metadata["reference_wav_sha256"])
            self.assertEqual(verified["license"], "cc-by-4.0")

    def test_preflight_rejects_tampered_wav_wrong_row_and_empty_transcript(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "reference.wav"
            text = Path(tmp) / "transcript.txt"
            manifest = Path(tmp) / "manifest.json"
            metadata = fetch_reference(path, transcript_path=text, opener=self.fake_opener)
            manifest.write_text(json.dumps(metadata), encoding="utf-8")
            bad = {**metadata, "row_index": 1}
            manifest.write_text(json.dumps(bad), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "provenance"):
                verify_preflight_reference(path, text, manifest)
            manifest.write_text(json.dumps(metadata), encoding="utf-8")
            text.write_text("", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "transcript"):
                verify_preflight_reference(path, text, manifest)
            text.write_text("real public Pashto reference", encoding="utf-8")
            path.write_bytes(b"tampered WAV")
            with self.assertRaisesRegex(ValueError, "checksum"):
                verify_preflight_reference(path, text, manifest)


    def test_nonempty_wrong_transcript_is_rejected_even_with_valid_audio(self):
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "reference.wav"
            transcript = Path(tmp) / "transcript.txt"
            manifest = Path(tmp) / "manifest.json"
            metadata = fetch_reference(wav, transcript_path=transcript,
                                       opener=self.fake_opener)
            manifest.write_text(json.dumps(metadata), encoding="utf-8")
            transcript.write_text("دا یوه بله جمله ده\\n".replace("\\n", "\n"), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "transcript checksum mismatch"):
                verify_preflight_reference(wav, transcript, manifest)
            transcript.write_text("دا یوه ازموینې جمله ده\n", encoding="utf-8")
            metadata.pop("control_transcript_sha256")
            manifest.write_text(json.dumps(metadata), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "transcript checksum mismatch"):
                verify_preflight_reference(wav, transcript, manifest)

    def test_non_pashto_script_control_is_rejected_without_writing_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "reference.wav"
            transcript = Path(tmp) / "transcript.txt"
            original = self.row["rows"][0]["row"]["transcription"]
            self.row["rows"][0]["row"]["transcription"] = "This is not Pashto"
            try:
                with self.assertRaisesRegex(ValueError, "Pashto-script"):
                    fetch_reference(wav, transcript_path=transcript,
                                    opener=self.fake_opener)
                self.assertFalse(wav.exists())
                self.assertFalse(transcript.exists())
            finally:
                self.row["rows"][0]["row"]["transcription"] = original

    def test_invalid_audio_does_not_leave_unvalidated_transcript(self):
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "reference.wav"
            transcript = Path(tmp) / "transcript.txt"
            def bad_audio(req, timeout):
                if req.full_url == self.audio_url:
                    return FakeResponse(b"not an audio file", req.full_url)
                return self.fake_opener(req, timeout)
            with self.assertRaises(Exception):
                fetch_reference(wav, transcript_path=transcript, opener=bad_audio)
            self.assertFalse(transcript.exists())
            self.assertFalse(wav.exists())

    def test_transcript_must_not_overwrite_reference_waveform(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "same-file.wav"
            with self.assertRaisesRegex(ValueError, "separate paths"):
                fetch_reference(path, transcript_path=path, opener=self.fake_opener)
            self.assertFalse(path.exists())



if __name__ == "__main__":
    unittest.main()

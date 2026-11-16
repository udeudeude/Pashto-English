"""Offline regression coverage for experimental Pashto recognition controls.

Synthetic samples only. No person recordings, downloaded model, credentials,
transcripts or speaker identities are uploaded by this test module.
"""
import io
import json
import math
import struct
import unittest
from types import SimpleNamespace
import wave
from urllib.parse import parse_qs, urlsplit

import pashto_asr_controls as probe


def observations():
    sentences = [
        "سلام، تاسو څنګه یاست؟",
        "زه پښتو خبرې کوم.",
        "ښځه اوبه څښي."
    ]
    return [{
        "row_index": index, "reference": text, "hypothesis": text,
        "audio_sha256": f"{index + 1:064x}",
        "seconds": .03,
    } for index, text in enumerate(sentences)]


def synthetic_wav():
    # Fully synthetic sine signal, not a real voice or recording.
    rate = 16000
    raw = b"".join(struct.pack("<h", round(math.sin(i * 2 * math.pi * 440 / rate) * 1500))
                   for i in range(rate * 3))
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(raw)
    return buffer.getvalue()


class PashtoAsrControlTests(unittest.TestCase):
    def test_genuine_pashto_baseline_passes_exploratory_control_only(self):
        report = probe.summarize_controls(observations())
        self.assertEqual(report["independent_control_count"], 3)
        self.assertTrue(report["recognizer_passed_exploratory_control"])
        self.assertEqual(report["pooled_character_error_rate"], 0)
        self.assertEqual(report["pooled_word_error_rate"], 0)
        self.assertFalse(report["generated_voice_scoring_executed"])
        self.assertFalse(report["pronunciation_verified"])
        self.assertFalse(report["mobile_browser_verified"])

    def test_wrong_script_fails_even_with_a_few_pashto_characters(self):
        items = observations()
        items[1]["hypothesis"] = "hello world سلام"
        result = probe.summarize_controls(items)
        self.assertFalse(result["recognizer_passed_exploratory_control"])
        self.assertLess(result["controls"][1]["recognized_script_fraction"], .8)

    def test_incomplete_controls_fail_closed(self):
        report = probe.summarize_controls(observations()[:2])
        self.assertFalse(report["all_predeclared_controls_present"])
        self.assertFalse(report["recognizer_passed_exploratory_control"])
        self.assertIn("NO generated voice", report["interpretation"])

    def test_high_error_fails_closed_even_with_correct_script(self):
        records = observations()
        records[0]["hypothesis"] = "مننه مننه مننه مننه"
        records[1]["hypothesis"] = "مننه مننه مننه مننه"
        records[2]["hypothesis"] = "مننه مننه مننه مننه"
        report = probe.summarize_controls(records)
        self.assertFalse(report["recognizer_passed_exploratory_control"])
        self.assertGreater(report["pooled_character_error_rate"], .35)

    def test_duplicate_and_unapproved_rows_are_rejected(self):
        records = observations()
        records[1]["row_index"] = 0
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            probe.summarize_controls(records)
        records[1]["row_index"] = 99
        with self.assertRaisesRegex(ValueError, "unapproved"):
            probe.summarize_controls(records)

    def test_short_or_forged_provenance_digest_rejected(self):
        records = observations()
        for value in ("broken", "x" * 64):
            records[0]["audio_sha256"] = value
            with self.assertRaisesRegex(ValueError, "checksum"):
                probe.summarize_controls(records)

    def test_report_does_not_contain_text_or_speaker_identity(self):
        records = observations()
        report = probe.summarize_controls(records)
        serialized = json.dumps(report, ensure_ascii=False)
        for row in records:
            self.assertNotIn(row["reference"], serialized)
        self.assertNotIn("recognized_sha256", serialized)
        self.assertNotIn("speaker_id", serialized)
        self.assertNotIn("hypothesis", serialized)
        self.assertNotIn("سلام", serialized)

    def test_distinctive_pashto_letters_are_not_silently_normalized(self):
        coverage = probe.distinctive_pashto_coverage("ښځه ځي، ښ او ړ", "شزه زي، ش او ر")
        self.assertGreater(coverage["expected_distinctive"], 0)
        self.assertEqual(coverage["recovered_distinctive"], 0)
        self.assertEqual(probe.pashto_script_fraction("hello"), 0)
        self.assertEqual(probe.pashto_script_fraction("!!!"), 0)
        self.assertEqual(probe.pashto_script_fraction("سلام"), 1)

    def test_require_exact_model_revision_license_and_speech_task(self):
        good = SimpleNamespace(sha="a" * 40,
                               card_data={"license": "apache-2.0"},
                               pipeline_tag="automatic-speech-recognition")
        self.assertEqual(probe.validated_model_metadata(good),
                         ("a" * 40, "apache-2.0"))
        for change in ({"sha": "not-a-revision"},
                       {"card_data": {"license": "cc-by-nc-4.0"}},
                       {"card_data": None},
                       {"pipeline_tag": "text-generation"}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                probe.validated_model_metadata(SimpleNamespace(**{
                    **vars(good), **change
                }))

    def test_fetch_control_uses_test_split_and_trusted_audio(self):
        wav = synthetic_wav()
        requests = []
        def loader(url, cap):
            requests.append((url, cap))
            if "/rows?" in url:
                parameters = parse_qs(urlsplit(url).query)
                self.assertEqual(parameters["dataset"], ["google/fleurs"])
                self.assertEqual(parameters["config"], ["ps_af"])
                self.assertEqual(parameters["split"], ["test"])
                self.assertEqual(parameters["offset"], ["1"])
                return json.dumps({
                    "dataset": "google/fleurs", "config": "ps_af", "split": "test",
                    "rows": [{"row_idx": 1, "row": {
                        "transcription": "زه پښتو خبرې کوم.",
                        "audio": [{"src": "https://datasets-server.huggingface.co/assets/public-synthetic.wav"}],
                    }}],
                }).encode("utf-8")
            self.assertEqual(cap, 6_000_000)
            self.assertEqual(urlsplit(url).hostname, "datasets-server.huggingface.co")
            return wav
        result = probe.fetch_control(1, loader=loader)
        self.assertEqual(result["row_index"], 1)
        self.assertEqual(result["duration_seconds"], 3.0)
        self.assertEqual(len(result["samples"]), 16000 * 3)
        self.assertEqual(len(requests), 2)

    def test_unapproved_row_never_attempts_network_access(self):
        with self.assertRaisesRegex(ValueError, "Unapproved"):
            probe.fetch_control(42, loader=lambda *_: self.fail("unexpected network"))

    def test_wrong_metadata_or_unsafe_audio_link_fails_before_download(self):
        template = {
            "dataset": "google/fleurs", "config": "ps_af", "split": "test",
            "rows": [{"row_idx": 0, "row": {"transcription": "سلام",
                "audio": [{"src": "https://datasets-server.huggingface.co/assets/control.wav"}]}}],
        }
        for invalid in ("wrong_config", "unsafe_audio"):
            with self.subTest(invalid=invalid):
                response = json.loads(json.dumps(template))
                if invalid == "wrong_config":
                    response["config"] = "en_us"
                else:
                    response["rows"][0]["row"]["audio"][0]["src"] = "https://example.com/secret.wav"
                calls = []
                def loader(url, _limit):
                    calls.append(url)
                    return json.dumps(response).encode()
                with self.assertRaises(ValueError):
                    probe.fetch_control(0, loader=loader)
                self.assertEqual(len(calls), 1)

    def test_non_pashto_control_is_rejected_without_fetching_audio(self):
        response = {"rows": [{"row_idx": 0, "row": {
            "transcription": "Hello everyone.",
            "audio": [{"src": "https://datasets-server.huggingface.co/assets/recording.wav"}],
        }}]}
        with self.assertRaisesRegex(ValueError, "non-Pashto"):
            probe.fetch_control(0, loader=lambda url, limit: json.dumps(response).encode())


if __name__ == "__main__":
    unittest.main()

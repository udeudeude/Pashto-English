"""Offline tests for the privacy-preserving Ghag corpus-coverage probe."""
import json
import unittest
from urllib.parse import parse_qs, urlsplit

from ghag_corpus_audit import request_rows, summarize_coverage


class CorpusAuditTests(unittest.TestCase):
    def setUp(self):
        self.config = {"use_phonemes": False, "characters": {
            "characters": "سلامتویېۍيټډخڼ", "punctuations": " ،؟۔"}}

    def test_fetch_public_text_without_fetching_audio(self):
        def loader(url, maximum):
            parsed = urlsplit(url)
            self.assertEqual(parsed.hostname, "datasets-server.huggingface.co")
            self.assertEqual(maximum, 1_000_000)
            params = parse_qs(parsed.query)
            self.assertEqual(params["config"], ["ps_af"])
            self.assertEqual(params["offset"], ["2"])
            self.assertEqual(params["length"], ["2"])
            return json.dumps({
                "dataset": "google/fleurs", "config": "ps_af", "split": "validation",
                "rows": [
                    {"row_idx": 2, "row": {"transcription": "سلام؟",
                                            "audio": [{"src": "never downloaded"}]}},
                    {"row_idx": 3, "row": {"transcription": "ټول،"}},
                ],
            }).encode()
        self.assertEqual(request_rows(2, 2, loader), ["سلام؟", "ټول،"])

    def test_aggregates_without_transcripts_or_speaker_identity(self):
        result = summarize_coverage(self.config, ["سلام!؟", "ټول\u200f،", "یۍ"])
        self.assertEqual(result["sample_count"], 3)
        self.assertEqual(result["samples_changed_by_candidate_preview"], 1)
        self.assertEqual(result["preview_unsupported_characters"], 1)
        self.assertEqual(result["raw_unsupported_characters"], 2)
        self.assertEqual(result["preview_unsupported_codepoints"],
                         [{"code_point": "U+0021", "count": 1}])
        self.assertFalse(result["trained_cleaner_parity_verified"])
        rendered = json.dumps(result, ensure_ascii=False)
        self.assertNotIn("ټول", rendered)
        self.assertNotIn("سلام", rendered)
        self.assertNotIn('"transcription":', rendered)

    def test_reject_wrong_provenance_and_missing_rows(self):
        for row in ({"config": "en_us", "rows": []},
                    {"config": "ps_af", "rows": []}):
            with self.subTest(row=row), self.assertRaises(ValueError):
                request_rows(0, 2, lambda url, maximum: json.dumps(row).encode())

    def test_reject_missing_transcription(self):
        row = {"rows": [{"row_idx": 0, "row": {"audio": "not text"}}]}
        with self.assertRaisesRegex(ValueError, "transcript"):
            request_rows(0, 1, lambda url, maximum: json.dumps(row).encode())

    def test_bounded_batches_and_empty_corpus(self):
        with self.assertRaises(ValueError):
            request_rows(0, 500, lambda url, maximum: b"{}")
        with self.assertRaisesRegex(ValueError, "empty"):
            summarize_coverage(self.config, [])


    def test_pinned_text_only_fallback_never_downloads_audio(self):
        from ghag_corpus_audit import fetch_text_only_flores
        from tempfile import TemporaryDirectory
        from pathlib import Path
        from types import SimpleNamespace
        with TemporaryDirectory() as directory:
            path = Path(directory) / "text.devtest"
            path.write_text("سلام؟\nټول او تاسې؟\n", encoding="utf-8")
            calls = []
            def download(**kwargs):
                calls.append(kwargs)
                return str(path)
            texts, metadata = fetch_text_only_flores(
                SimpleNamespace(dataset_info=lambda name: SimpleNamespace(sha="a" * 40)),
                download, limit=2)
            self.assertEqual(texts, ["سلام؟", "ټول او تاسې؟"])
            self.assertEqual(calls[0]["repo_type"], "dataset")
            self.assertEqual(calls[0]["filename"], "devtest/pbt_Arab.devtest")
            self.assertEqual(metadata["revision"], "a" * 40)
            self.assertNotIn("سلام", str(metadata))


if __name__ == "__main__":
    unittest.main()

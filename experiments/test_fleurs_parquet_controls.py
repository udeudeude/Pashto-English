"""Synthetic, offline security and provenance tests for official FLEURS fallback."""
import hashlib
import io
import json
import math
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import soundfile as sf

import fleurs_parquet_controls as probe

ROOT = "https://huggingface.co/api/datasets/google/fleurs/parquet/ps_af/test/"
LIST = [ROOT + "0.parquet", ROOT + "1.parquet"]
TEXTS = [
    "سلام، تاسو څنګه یاست؟",
    "زه پښتو خبرې کوم.",
    "ښځه اوبه څښي.",
]


def fixture_audio():
    rate = 16_000
    signal = .07 * np.sin(np.arange(rate * 3, dtype=np.float32)
                          * (2 * math.pi * 220 / rate))
    buffer = io.BytesIO()
    sf.write(buffer, signal, rate, format="FLAC", subtype="PCM_16")
    return buffer.getvalue()


def make_shard(path, *, count=3, replacement=None):
    audio = fixture_audio()
    rows = [{"transcription": text,
             "audio": {"bytes": audio, "path": "sample.flac"}}
            for text in TEXTS[:count]]
    if replacement:
        rows[0].update(replacement)
    pq.write_table(pa.Table.from_pylist(rows), path)
    return audio


class FakeResponse:
    def __init__(self, data, final_url=ROOT + "0.parquet",
                 claimed=None):
        self.data = io.BytesIO(data)
        self.url = final_url
        self.headers = {"Content-Length": str(claimed)} if claimed is not None else {}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.data.close()

    def read(self, size):
        return self.data.read(size)

    def geturl(self):
        return self.url


class FleursParquetControlsTests(unittest.TestCase):
    def test_official_shard_urls_only(self):
        self.assertEqual(probe.approved_shard_url(ROOT + "0.parquet"),
                         ROOT + "0.parquet")
        approved = "https://huggingface.co/datasets/google/fleurs/resolve/refs%2Fconvert%2Fparquet/ps_af/test/0000.parquet"
        self.assertEqual(probe.approved_shard_url(approved), approved)
        for url in (
            "http://huggingface.co/api/datasets/google/fleurs/parquet/ps_af/test/0.parquet",
            "https://evil.huggingface.co/api/datasets/google/fleurs/parquet/ps_af/test/0.parquet",
            "https://huggingface.co/datasets/google/fleurs/resolve/main/ps_af/test/0000.parquet",
            "https://huggingface.co/api/datasets/google/fleurs/parquet/ps_af/train/0.parquet",
            "https://huggingface.co/api/datasets/google/fleurs/parquet/en_us/test/0.parquet",
            "https://u:p@huggingface.co/api/datasets/google/fleurs/parquet/ps_af/test/0.parquet",
            "https://huggingface.co/api/datasets/google/fleurs/parquet/ps_af/test/0.parquet#bad",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                probe.approved_shard_url(url)

    def test_first_shard_is_exact_pinned_pashto_test_split(self):
        loader = lambda url: (self.assertEqual(url, probe.LISTING_URL)
                              or json.dumps(LIST).encode())
        self.assertEqual(probe.resolve_first_shard(listing_loader=loader),
                         LIST[0])
        for shards in ([], [ROOT + "1.parquet"], LIST + [LIST[0]],
                       ["https://example.com/0.parquet"],
                       [ROOT.replace("/test/", "/train/") + "0.parquet"]):
            with self.subTest(shards=shards), self.assertRaises(ValueError):
                probe.resolve_first_shard(
                    listing_loader=lambda _: json.dumps(shards).encode())

    def test_bounded_trusted_download_and_hash(self):
        data = b"PAR1" * 100
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "shard.bin"
            response = lambda *_a, **_k: FakeResponse(data)
            meta = probe.safe_download(ROOT + "0.parquet", target,
                                       byte_cap=1000, opener=response)
            self.assertEqual(meta["sha256"], hashlib.sha256(data).hexdigest())
            self.assertEqual(meta["bytes"], len(data))
            with self.assertRaisesRegex(ValueError, "exceeds"):
                probe.safe_download(ROOT + "0.parquet", target,
                                    byte_cap=100, opener=response)
            redirect = lambda *_a, **_k: FakeResponse(data, "https://evil.example/private")
            with self.assertRaisesRegex(ValueError, "unapproved"):
                probe.safe_download(ROOT + "0.parquet", target,
                                    byte_cap=1000, opener=redirect)

    def test_parses_only_first_three_with_full_license_gates(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sample.parquet"
            raw = make_shard(path)
            controls = probe.extract_controls_from_shard(path)
            self.assertEqual([x["row_index"] for x in controls], [0, 1, 2])
            self.assertEqual([x["reference"] for x in controls], TEXTS)
            for control in controls:
                self.assertEqual(control["audio_sha256"], hashlib.sha256(raw).hexdigest())
                self.assertEqual(control["samples"].size, 16_000 * 3)
                self.assertEqual(control["duration_seconds"], 3)

    def test_bad_public_parquet_rows_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "shard.parquet"
            make_shard(p, count=2)
            with self.assertRaisesRegex(ValueError, "Insufficient"):
                probe.extract_controls_from_shard(p)
            make_shard(p, replacement={"transcription": "not Pashto"})
            with self.assertRaisesRegex(ValueError, "Pashto"):
                probe.extract_controls_from_shard(p)
            make_shard(p, replacement={"audio": {"bytes": None, "path": "https://example.com/recording"}})
            with self.assertRaisesRegex(ValueError, "embedded audio"):
                probe.extract_controls_from_shard(p)

    def test_complete_fetch_verifies_shard_bytes_and_never_reports_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "fixture.parquet"
            make_shard(source)
            raw = source.read_bytes()
            def downloader(url, target):
                self.assertEqual(url, ROOT + "0.parquet")
                target.write_bytes(raw)
                return {"sha256": hashlib.sha256(raw).hexdigest(),
                        "bytes": len(raw)}
            controls, evidence = probe.fetch_three_controls(
                listing_loader=lambda _: json.dumps(LIST).encode(),
                shard_downloader=downloader)
            self.assertEqual(len(controls), 3)
            self.assertEqual(evidence["row_indices"], [0, 1, 2])
            self.assertEqual(evidence["license"], "cc-by-4.0")
            serialized = json.dumps(evidence, ensure_ascii=False)
            for transcript in TEXTS:
                self.assertNotIn(transcript, serialized)
            self.assertNotIn("sample.flac", serialized)

    def test_forged_parquet_checksum_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "shard.parquet"
            make_shard(path)
            raw = path.read_bytes()
            def forged(_url, dest):
                dest.write_bytes(raw)
                return {"sha256": "a" * 64, "bytes": len(raw)}
            with self.assertRaisesRegex(ValueError, "checksum"):
                probe.fetch_three_controls(
                    listing_loader=lambda _: json.dumps(LIST).encode(),
                    shard_downloader=forged)


if __name__ == "__main__":
    unittest.main()

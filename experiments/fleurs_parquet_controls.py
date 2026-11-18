#!/usr/bin/env python3
"""Bounded, isolated fallback for genuine FLEURS Pashto test controls.

Use only the official CC BY 4.0 Google FLEURS converted Parquet dataset.
Never report text, audio, speaker fields, network access tokens or raw rows.
This is an ASR calibration source, not permission for voice training.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import tempfile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

DATASET = "google/fleurs"
CONFIG = "ps_af"
SPLIT = "test"
ROWS = (0, 1, 2)
LISTING_URL = "https://huggingface.co/api/datasets/google/fleurs/parquet/ps_af/test"
MAX_LISTING_BYTES = 100_000
MAX_SHARD_BYTES = 550_000_000
MAX_CLIP_BYTES = 6_000_000


def approved_shard_url(value):
    """Accept only Google's Pashto test split of Hugging Face's Parquet mirror."""
    if not isinstance(value, str):
        raise ValueError("Shard URL is not text")
    parsed = urlsplit(value)
    if parsed.scheme != "https" or parsed.hostname != "huggingface.co" \
       or parsed.username or parsed.password or parsed.fragment:
        raise ValueError("Unapproved FLEURS Parquet host")
    prefixes = (
        "/datasets/google/fleurs/resolve/refs%2Fconvert%2Fparquet/ps_af/test/",
        "/datasets/google/fleurs/resolve/refs/convert/parquet/ps_af/test/",
        "/api/datasets/google/fleurs/parquet/ps_af/test/",
    )
    if not any(parsed.path.startswith(prefix) for prefix in prefixes) or \
       not parsed.path.endswith(".parquet"):
        raise ValueError("Not an official FLEURS Pashto test shard")
    return value


def safe_download(url, destination, *, byte_cap, opener=urlopen):
    """Bound every response and reject third-party redirects and empty objects."""
    req = Request(url, headers={"User-Agent": "Pashto-English-FLEURS-Research/1.0"})
    size = 0
    digest = hashlib.sha256()
    with opener(req, timeout=100) as response:
        final = urlsplit(response.geturl())
        host = final.hostname or ""
        if final.scheme != "https" or not (
            host == "huggingface.co" or host.endswith(".hf.co")
            or host.endswith(".huggingface.co")
            or host.endswith(".xethub.hf.co")
        ):
            raise ValueError("FLEURS Parquet download redirected to unapproved host")
        length = response.headers.get("Content-Length")
        if length is not None and int(length) > byte_cap:
            raise ValueError("Remote public shard exceeds configured byte limit")
        with open(destination, "wb") as out:
            while True:
                chunk = response.read(min(1_048_576, byte_cap + 1 - size))
                if not chunk:
                    break
                size += len(chunk)
                if size > byte_cap:
                    raise ValueError("Public shard exceeds configured byte limit")
                out.write(chunk)
                digest.update(chunk)
    if size == 0:
        raise ValueError("Empty public Parquet response")
    return {"sha256": digest.hexdigest(), "bytes": size}


def resolve_first_shard(*, listing_loader=None):
    """Use the Hub's official API; refuse invented or non-first shard paths."""
    if listing_loader is None:
        def listing_loader(url):
            from tempfile import TemporaryDirectory
            with TemporaryDirectory(prefix="fleurs-index-") as tmp:
                path = Path(tmp) / "index.json"
                safe_download(url, path, byte_cap=MAX_LISTING_BYTES)
                return path.read_bytes()
    payload = json.loads(listing_loader(LISTING_URL))
    if not isinstance(payload, list) or not 1 <= len(payload) <= 32:
        raise ValueError("Missing or oversized official FLEURS Parquet shard listing")
    urls = [approved_shard_url(x) for x in payload]
    # The split's first shard MUST be at index zero. Never silently skip it.
    first = urlsplit(urls[0]).path.rsplit("/", 1)[-1]
    if first not in ("0.parquet", "0000.parquet", "00000.parquet"):
        raise ValueError("First FLEURS test shard is not index zero")
    if len(urls) != len(set(urls)):
        raise ValueError("Duplicate official FLEURS Parquet shards")
    return urls[0]


def extract_controls_from_shard(path):
    """Decode only three indexed rows from the first Parquet shard."""
    import pyarrow.parquet as pq
    import numpy as np
    import soundfile as sf
    import scipy.signal
    from ghag_public_reference import validate_clip
    from pashto_asr_controls import pashto_script_fraction

    parquet = pq.ParquetFile(str(path))
    cols = set(parquet.schema_arrow.names)
    if not {"audio", "transcription"}.issubset(cols):
        raise ValueError("FLEURS test shard lacks recognized audio/text columns")
    if parquet.metadata.num_rows < len(ROWS):
        raise ValueError("Insufficient Parquet control rows")
    try:
        batch = next(parquet.iter_batches(
            batch_size=len(ROWS), columns=["audio", "transcription"]))
    except StopIteration:
        raise ValueError("No accessible FLEURS test rows") from None
    if batch.num_rows != len(ROWS):
        raise ValueError("FLEURS Parquet batch has insufficient rows")
    rows = batch.to_pylist()
    controls = []
    for index, row in enumerate(rows):
        text = row.get("transcription")
        if not isinstance(text, str) or not 1 <= len(text.strip()) <= 500 or \
           pashto_script_fraction(text) < .8:
            raise ValueError("Invalid public Pashto test control transcript")
        audio = row.get("audio")
        if not isinstance(audio, dict):
            raise ValueError("FLEURS Parquet audio is not a row object")
        raw = audio.get("bytes")
        if not isinstance(raw, bytes) or not 0 < len(raw) <= MAX_CLIP_BYTES:
            # Never fetch arbitrary paths supplied inside a Parquet file.
            raise ValueError("Public test row missing bounded embedded audio bytes")
        signal, rate = sf.read(io.BytesIO(raw), dtype="float32")
        signal, info = validate_clip(signal, rate)
        if rate != 16000:
            divisor = math.gcd(rate, 16000)
            signal = scipy.signal.resample_poly(
                signal, 16000 // divisor, rate // divisor).astype(np.float32)
        controls.append({
            "row_index": index,
            "reference": text,
            "samples": signal,
            "audio_sha256": hashlib.sha256(raw).hexdigest(),
            "duration_seconds": info["duration_seconds"],
        })
    return controls


def fetch_three_controls(*, listing_loader=None, shard_downloader=None,
                         shard_parser=extract_controls_from_shard):
    """Return only three real controls, plus numeric-only source evidence."""
    shard_url = resolve_first_shard(listing_loader=listing_loader)
    with tempfile.TemporaryDirectory(prefix="fleurs-pashto-control-") as temporary:
        destination = Path(temporary) / "source.parquet"
        if shard_downloader is None:
            meta = safe_download(shard_url, destination, byte_cap=MAX_SHARD_BYTES)
        else:
            meta = shard_downloader(shard_url, destination)
        if not isinstance(meta, dict) or not isinstance(meta.get("sha256"), str) \
           or len(meta["sha256"]) != 64 or not 0 < meta.get("bytes", 0) <= MAX_SHARD_BYTES:
            raise ValueError("Invalid first-shard download evidence")
        if not destination.is_file() or destination.stat().st_size != meta["bytes"]:
            raise ValueError("Downloaded shard byte count disagrees with evidence")
        with destination.open("rb") as source:
            actual_digest = hashlib.file_digest(source, "sha256").hexdigest()
        if actual_digest != meta["sha256"]:
            raise ValueError("Downloaded shard checksum mismatch")
        controls = shard_parser(destination)
        if not isinstance(controls, list) or [x.get("row_index") for x in controls] != list(ROWS):
            raise ValueError("Parquet control rows are incomplete or not predeclared")
        return controls, {
            "retrieval_source": "official_google_fleurs_converted_parquet",
            "dataset": DATASET, "configuration": CONFIG, "split": SPLIT,
            "row_indices": list(ROWS), "license": "cc-by-4.0",
            "source_parquet_sha256": meta["sha256"],
            "source_parquet_bytes": meta["bytes"],
            "recording_count": len(controls),
        }

"""Acquire a bounded CC BY 4.0 Pashto FLEURS reference for isolated experiments.

Do not commit, upload, or publish any source speech, derivatives, embeddings,
checkpoint data or speaker identities. This tests voice conditioning only;
it cannot verify the model's missing training-time text cleaner.
"""
import hashlib
import io
import json
import math
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

DATASET = "google/fleurs"
CONFIG = "ps_af"
SPLIT = "validation"
LICENSE = "cc-by-4.0"
VIEWER = "https://datasets-server.huggingface.co"
MAX_JSON_BYTES = 1_000_000
MAX_AUDIO_BYTES = 6_000_000


def bounded_response(url, max_bytes, opener=urlopen):
    req = Request(url, headers={"User-Agent": "Pashto-English-Ghag-Research/1.0"})
    # HF's first cold FLEURS parquet row can take more than 30 seconds.
    # Retry ONLY transport timeouts; never retry validation failures.
    for attempt in range(2):
        try:
            with opener(req, timeout=75) as stream:
                final_url = stream.geturl()
                parsed = urlsplit(final_url)
                if parsed.scheme != "https" or parsed.hostname != "datasets-server.huggingface.co":
                    raise ValueError("Reference URL redirected away from trusted dataset viewer")
                data = stream.read(max_bytes + 1)
            if not data or len(data) > max_bytes:
                raise ValueError("Reference response is empty or exceeds configured size limit")
            return data
        except (TimeoutError, ConnectionError):
            if attempt:
                raise
    raise AssertionError("Unreachable reference acquisition state")


def reference_audio_url(row):
    """Extract only viewer-generated audio links; never arbitrary paths or URLs."""
    if not isinstance(row, dict):
        raise ValueError("FLEURS viewer row must be an object")
    clip = row.get("audio")
    if isinstance(clip, list) and clip:
        clip = clip[0]
    if not isinstance(clip, dict) or not isinstance(clip.get("src"), str):
        raise ValueError("FLEURS row does not expose a playable audio source")
    link = clip["src"]
    parsed = urlsplit(link)
    if (parsed.scheme != "https" or parsed.hostname != "datasets-server.huggingface.co"
            or not parsed.path.startswith(("/assets/", "/cached-assets/"))
            or parsed.username or parsed.password):
        raise ValueError("Unexpected FLEURS audio source URL")
    return link


def validate_clip(samples, sample_rate):
    """Reject silent/short/corrupt source speech before conditioning the model."""
    import numpy as np
    arr = np.asarray(samples, dtype=np.float32)
    if arr.ndim not in (1, 2) or not 8000 <= sample_rate <= 96000:
        raise ValueError("Unsupported public reference audio layout")
    if arr.ndim == 2:
        if arr.shape[1] not in (1, 2):
            raise ValueError("More than two channels in public reference")
        arr = arr.mean(axis=1)
    if not np.isfinite(arr).all() or arr.size / sample_rate < 2.5:
        raise ValueError("Public reference is too short or contains nonfinite samples")
    if arr.size / sample_rate > 30:
        raise ValueError("Public reference is too long")
    peak = float(np.max(np.abs(arr)))
    rms = float(np.sqrt(np.mean(np.square(arr, dtype=np.float64))))
    if peak < 0.003 or rms < 0.001:
        raise ValueError("Public reference is nearly silent")
    if peak > 1.05:
        raise ValueError("Public reference has invalid amplitude")
    return arr, {"duration_seconds": round(arr.size / sample_rate, 3),
                 "peak": round(peak, 6), "rms": round(rms, 6)}


def fetch_reference(output_path, *, row_idx=0, opener=urlopen, transcript_path=None):
    """Download just one public example via the Hugging Face dataset viewer.

    The dataset is CC BY 4.0. No voice/audio/embeddings are included in reports.
    This audit uses the public dataset viewer, not person-identifying metadata.
    """
    if type(row_idx) is not int or not 0 <= row_idx <= 100:
        raise ValueError("Reference row index must be a small nonnegative integer")
    url = VIEWER + "/rows?" + urlencode({
        "dataset": DATASET, "config": CONFIG, "split": SPLIT,
        "offset": row_idx, "length": 1})
    body = bounded_response(url, MAX_JSON_BYTES, opener)
    payload = json.loads(body)
    if payload.get("dataset") not in (None, DATASET) or payload.get("config") not in (None, CONFIG):
        raise ValueError("Dataset viewer returned an unexpected dataset/config")
    if payload.get("split") not in (None, SPLIT):
        raise ValueError("Dataset viewer returned an unexpected split")
    rows = payload.get("rows")
    if not isinstance(rows, list) or len(rows) != 1:
        raise ValueError("Dataset viewer returned no unique reference row")
    item = rows[0]
    if item.get("row_idx") != row_idx:
        raise ValueError("Dataset viewer returned an unexpected row index")
    row = item["row"]
    # Optional ephemeral control transcript for an *independent* ASR check.
    # It is never returned in metadata or added to GitHub workflow artifacts.
    if transcript_path is not None:
        text = row.get("transcription")
        if not isinstance(text, str) or not 1 <= len(text.strip()) <= 500:
            raise ValueError("Public real-speech control has no bounded transcript")
        transcript_file = Path(transcript_path)
        transcript_file.parent.mkdir(parents=True, exist_ok=True)
        transcript_file.write_text(text.strip() + "\n", encoding="utf-8")
    audio_url = reference_audio_url(row)
    original_bytes = bounded_response(audio_url, MAX_AUDIO_BYTES, opener)
    import numpy as np
    import soundfile as sf
    from scipy.signal import resample_poly
    samples, original_rate = sf.read(io.BytesIO(original_bytes), dtype="float32")
    mono, metrics = validate_clip(samples, original_rate)
    if original_rate != 16000:
        divisor = math.gcd(original_rate, 16000)
        mono = resample_poly(mono, 16000 // divisor, original_rate // divisor).astype(np.float32)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(output_path), mono, 16000, subtype="PCM_16")
    # Keep speaker text out of reports. Preserve immutable audio file hashes.
    return {
        "dataset": DATASET, "config": CONFIG, "split": SPLIT,
        "row_index": row_idx, "license": LICENSE,
        "attribution": "FLEURS (Conneau et al., 2022), Google; CC BY 4.0",
        "dataset_url": "https://huggingface.co/datasets/google/fleurs",
        "viewer_endpoint": url,
        "source_audio_sha256": hashlib.sha256(original_bytes).hexdigest(),
        "reference_wav_sha256": hashlib.sha256(output_path.read_bytes()).hexdigest(),
        "original_sample_rate": int(original_rate),
        "reference_sample_rate": 16000,
        "reference_metrics": metrics,
        "speech_source": "PUBLIC_HUMAN_SPEECH",
        "speaker_identity_verified": False,
        "training_cleaner_parity_verified": False,
    }

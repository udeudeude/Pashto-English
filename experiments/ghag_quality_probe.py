#!/usr/bin/env python3
"""Independent, privacy-limited ASR round-trip diagnostic for experimental Ghag.

This DOES NOT prove audible intelligibility, pronunciation or trained-cleaner
parity. First calibrate Whisper on the genuine public FLEURS reference itself.
No source recordings, generated speech or transcribed text enter the report.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import time
import unicodedata
from urllib.parse import urlencode

from ghag_public_reference import (
    CONFIG, DATASET, SPLIT, VIEWER, MAX_JSON_BYTES, bounded_response,
)

EXPECTED_INPUT = "سلام، تاسو څنګه یاست؟"
ASR_MODEL = "base"
MODEL_VERSION = "openai-whisper==20250625"


def normalized_text(value):
    """Lightweight *scoring-only* normalization, not a Ghag text cleaner."""
    if not isinstance(value, str):
        raise TypeError("Transcription must be a Unicode string")
    value = unicodedata.normalize("NFC", value).casefold()
    return re.sub(r"\s+", " ", "".join(
        " " if unicodedata.category(char).startswith("P") else char
        for char in value
    )).strip()


def edit_distance(reference, hypothesis):
    """Two-row Levenshtein distance for Unicode characters or word arrays."""
    prior = list(range(len(hypothesis) + 1))
    for i, left in enumerate(reference, 1):
        current = [i]
        for j, right in enumerate(hypothesis, 1):
            current.append(min(
                prior[j] + 1, current[-1] + 1,
                prior[j - 1] + (left != right),
            ))
        prior = current
    return prior[-1]


def compare_text(reference, hypothesis):
    """Return counts and diagnostic error rates without leaking either text."""
    a = normalized_text(reference)
    b = normalized_text(hypothesis)
    if not a:
        raise ValueError("Empty normalized reference transcript")
    return {
        "expected_sha256": hashlib.sha256(reference.encode("utf-8")).hexdigest(),
        "recognized_sha256": hashlib.sha256(hypothesis.encode("utf-8")).hexdigest(),
        "expected_characters": len(a),
        "recognized_characters": len(b),
        "expected_words": len(a.split()),
        "recognized_words": len(b.split()),
        "character_edits": edit_distance(a, b),
        "word_edits": edit_distance(a.split(), b.split()),
        "character_error_rate": round(edit_distance(a, b) / len(a), 4),
        "word_error_rate": round(edit_distance(a.split(), b.split()) / len(a.split()), 4),
    }


def public_reference_transcript(*, row_index=0, loader=bounded_response):
    """Fetch exactly the same indexed FLEURS row as the licensed audio source."""
    if type(row_index) is not int or not 0 <= row_index <= 100:
        raise ValueError("Unsafe FLEURS row index")
    url = VIEWER + "/rows?" + urlencode({
        "dataset": DATASET, "config": CONFIG, "split": SPLIT,
        "offset": row_index, "length": 1,
    })
    payload = json.loads(loader(url, MAX_JSON_BYTES))
    for field, expected in (("dataset", DATASET), ("config", CONFIG),
                             ("split", SPLIT)):
        if payload.get(field) not in (None, expected):
            raise ValueError("FLEURS transcript metadata mismatch: " + field)
    rows = payload.get("rows")
    if not isinstance(rows, list) or len(rows) != 1:
        raise ValueError("FLEURS transcript row missing or ambiguous")
    item = rows[0]
    if not isinstance(item, dict) or item.get("row_idx") != row_index:
        raise ValueError("Unexpected FLEURS transcript row index")
    row = item.get("row")
    if not isinstance(row, dict):
        raise ValueError("FLEURS transcript row missing content")
    transcript = row.get("transcription")
    if not isinstance(transcript, str) or not transcript.strip():
        raise ValueError("No public FLEURS transcription for calibration")
    return transcript


def recognize(model, audio_path):
    """Force Pashto transcription; also separately detect likely language."""
    import whisper
    audio = whisper.load_audio(str(audio_path))
    mel = whisper.log_mel_spectrogram(
        whisper.pad_or_trim(audio), n_mels=model.dims.n_mels
    ).to(model.device)
    _, scores = model.detect_language(mel)
    start = time.monotonic()
    result = model.transcribe(
        str(audio_path), language="ps", task="transcribe", verbose=False,
        fp16=False, temperature=0, beam_size=5, condition_on_previous_text=False,
    )
    seconds = round(time.monotonic() - start, 3)
    transcript = result.get("text")
    if not isinstance(transcript, str):
        raise ValueError("Recognizer returned no transcript")
    return transcript, {
        "detected_language": max(scores, key=scores.get),
        "pashto_language_probability": round(float(scores.get("ps", 0)), 5),
        "recognition_seconds": seconds,
    }


def run(reference_wav, generated_wav, output, model_name=ASR_MODEL):
    # Validate configuration and files without importing heavyweight models.
    if model_name not in ("base", "small"):
        raise ValueError("Only a bounded multilingual recognition model is allowed")
    paths = (Path(reference_wav), Path(generated_wav))
    if any(not p.is_file() or p.stat().st_size < 64 for p in paths):
        raise ValueError("Both real-reference and generated waveforms are required")
    import whisper
    import torch
    result = {
        "evaluation": "EXPLORATORY_INDEPENDENT_ASR_NOT_HUMAN_INTELLIGIBILITY",
        "whisper_package": MODEL_VERSION,
        "recognizer_model": model_name,
        "pinned_ghag_training_cleaner_verified": False,
        "speaker_identity_verified": False,
        "pronunciation_verified": False,
        "browser_verified": False,
        "audio_or_transcripts_published": False,
    }
    reference_transcript = public_reference_transcript()
    loaded = time.monotonic()
    model = whisper.load_model(model_name, device="cpu")
    result["recognizer_load_seconds"] = round(time.monotonic() - loaded, 3)
    result["torch_version"] = torch.__version__
    base_text, base_metrics = recognize(model, paths[0])
    synthetic_text, synthetic_metrics = recognize(model, paths[1])
    result["reference_calibration"] = {
        **compare_text(reference_transcript, base_text), **base_metrics,
        "source": "FLEURS_ps_af_validation_row_0",
    }
    result["ghag_generated"] = {
        **compare_text(EXPECTED_INPUT, synthetic_text), **synthetic_metrics,
        "source": "Ghag_original_weights_human_reference_UNVERIFIED_cleaner",
    }
    # This threshold merely screens obviously weak recognition controls; it
    # never converts an automated score into verified pronunciation.
    result["asr_control_usable_for_exploration"] = (
        result["reference_calibration"]["character_error_rate"] <= 0.35
        and result["reference_calibration"]["detected_language"] == "ps"
    )
    result["interpretation"] = (
        "Calibration control passed a predeclared exploratory threshold; "
        "generated-speech recognition remains an imperfect proxy."
        if result["asr_control_usable_for_exploration"] else
        "Reference ASR calibration failed; do NOT treat the generated-speech "
        "score as evidence of Ghag pronunciation quality."
    )
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference-wav", required=True)
    parser.add_argument("--generated-wav", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--model", choices=["base", "small"], default="base")
    args = parser.parse_args()
    try:
        run(args.reference_wav, args.generated_wav, args.report, args.model)
    except Exception as error:
        # Report failure without emitting audio or any ASR text.
        output = Path(args.report)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps({
            "evaluation": "EXPLORATORY_INDEPENDENT_ASR_FAILED",
            "error": type(error).__name__ + ": " + str(error),
            "pronunciation_verified": False,
        }, indent=2) + "\n")
        print(output.read_text(), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

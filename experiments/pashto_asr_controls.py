#!/usr/bin/env python3
"""Independent Pashto speech recognition control with explicit fail-closed gates.

This is a *research control*, never a voice-quality certificate or web-app runtime.
It assesses a publicly licensed, independently trained Pashto recognizer against
genuine FLEURS Pashto test speech BEFORE any voice-to-voice comparison.
All borrowed speech and transcripts remain in process memory and are never
published in workflow artifacts or diagnostic output.
"""
import argparse
import hashlib
import io
import json
import math
import sys
import time
import unicodedata
from urllib.parse import urlencode

from ghag_public_reference import (
    DATASET, CONFIG, VIEWER, MAX_JSON_BYTES, MAX_AUDIO_BYTES,
    bounded_response, reference_audio_url, validate_clip,
)
from ghag_quality_probe import compare_text, normalized_text

MODEL_ID = "ihanif/wav2vec2-xls-r-300m-pashto"
MODEL_LICENSE = "apache-2.0"
TEST_SPLIT = "test"  # NEVER reuse the Ghag conditioning validation row.
CONTROL_ROWS = (0, 1, 2)
CONTROL_LICENSE = "cc-by-4.0"
PASHTO_DISTINCTIVE = frozenset("ټځڅډړږښګڼېۍ")
MIN_CONTROLS = 3


def pashto_script_fraction(value):
    """Fraction of letters in Arabic-script block, NOT language classification.

    Dari, Arabic and Urdu also use this block. Exact Pashto transcription is
    measured separately by character/word edit distance; script alone is weak.
    """
    if not isinstance(value, str):
        raise TypeError("Recognized text must be a string")
    letters = [ch for ch in unicodedata.normalize("NFC", value)
               if unicodedata.category(ch).startswith("L")]
    if not letters:
        return 0.0
    return sum('\u0600' <= ch <= '\u06ff' for ch in letters) / len(letters)


def distinctive_pashto_coverage(reference, hypothesis):
    """Conservative count-only diagnostic; never publish source characters."""
    expected = [ch for ch in normalized_text(reference) if ch in PASHTO_DISTINCTIVE]
    predicted = [ch for ch in normalized_text(hypothesis) if ch in PASHTO_DISTINCTIVE]
    if not expected:
        return {"expected_distinctive": 0, "recovered_distinctive": 0}
    from collections import Counter
    wanted, produced = Counter(expected), Counter(predicted)
    return {
        "expected_distinctive": len(expected),
        "recovered_distinctive": sum(min(count, produced[letter])
                                     for letter, count in wanted.items())
    }


def summarize_controls(observations):
    """Produce aggregate-only calibration; no raw text, audio or speaker IDs."""
    if not isinstance(observations, list):
        raise TypeError("Control observations must be a list")
    seen = set()
    cases = []
    for row in observations:
        if not isinstance(row, dict):
            raise ValueError("Malformed calibration observation")
        index = row.get("row_index")
        if type(index) is not int or index not in CONTROL_ROWS or index in seen:
            raise ValueError("Duplicate, unapproved or missing control row index")
        seen.add(index)
        reference = row.get("reference")
        hypothesis = row.get("hypothesis")
        if not isinstance(reference, str) or not reference.strip() or \
           not isinstance(hypothesis, str):
            raise ValueError("Missing control text")
        if pashto_script_fraction(reference) < .8:
            raise ValueError("Public control does not appear to be Pashto-script text")
        metric = compare_text(reference, hypothesis)
        script_fraction = pashto_script_fraction(hypothesis)
        distinct = distinctive_pashto_coverage(reference, hypothesis)
        wav_digest = row.get("audio_sha256")
        if not isinstance(wav_digest, str) or len(wav_digest) != 64 or \
           any(ch not in '0123456789abcdef' for ch in wav_digest):
            raise ValueError("Missing exact audio provenance checksum")
        cases.append({
            "row_index": index,
            "audio_sha256": wav_digest,
            "reference_characters": metric["expected_characters"],
            "reference_words": metric["expected_words"],
            "character_edits": metric["character_edits"],
            "word_edits": metric["word_edits"],
            "character_error_rate": metric["character_error_rate"],
            "word_error_rate": metric["word_error_rate"],
            "recognized_script_fraction": round(script_fraction, 4),
            **distinct,
            "recognition_seconds": round(float(row.get("seconds", 0)), 3),
        })
    cases.sort(key=lambda x: x["row_index"])
    n_char = sum(x["reference_characters"] for x in cases)
    n_words = sum(x["reference_words"] for x in cases)
    n_edits = sum(x["character_edits"] for x in cases)
    word_edits = sum(x["word_edits"] for x in cases)
    all_rows_present = set(seen) == set(CONTROL_ROWS) and len(cases) >= MIN_CONTROLS
    pooled_cer = round(n_edits / n_char, 4) if n_char else None
    pooled_wer = round(word_edits / n_words, 4) if n_words else None
    passed = bool(
        all_rows_present and pooled_cer is not None and pooled_cer <= .35
        and all(x["character_error_rate"] <= .60
                and x["recognized_script_fraction"] >= .80 for x in cases)
    )
    return {
        "dataset": DATASET,
        "dataset_config": CONFIG,
        "dataset_split": TEST_SPLIT,
        "source_license": CONTROL_LICENSE,
        "control_row_indices": list(CONTROL_ROWS),
        "independent_control_count": len(cases),
        "required_control_count": MIN_CONTROLS,
        "all_predeclared_controls_present": all_rows_present,
        "controls": cases,
        "pooled_character_error_rate": pooled_cer,
        "pooled_word_error_rate": pooled_wer,
        "script_measure_is_not_language_identification": True,
        "recognizer_passed_exploratory_control": passed,
        "generated_voice_scoring_executed": False,
        "pronunciation_verified": False,
        "ghag_text_cleaner_parity_verified": False,
        "mobile_browser_verified": False,
        "speaker_identity_verified": False,
        "consent_for_voice_cloning_established": False,
        "interpretation": (
            "Control is provisionally suitable for further independent "
            "experiments, not for human intelligibility certification."
            if passed else
            "Control failed or is incomplete: NO generated voice may be "
            "rated or ranked with this recognizer."
        ),
    }


def fetch_control(row_index, *, loader=bounded_response):
    """Return one bounded CC BY 4.0 genuine Pashto test recording in memory."""
    if type(row_index) is not int or row_index not in CONTROL_ROWS:
        raise ValueError("Unapproved FLEURS calibration row")
    url = VIEWER + "/rows?" + urlencode({
        "dataset": DATASET, "config": CONFIG, "split": TEST_SPLIT,
        "offset": row_index, "length": 1,
    })
    payload = json.loads(loader(url, MAX_JSON_BYTES))
    for key, expected in (("dataset", DATASET), ("config", CONFIG),
                          ("split", TEST_SPLIT)):
        if payload.get(key) not in (None, expected):
            raise ValueError("Unexpected FLEURS control provenance")
    rows = payload.get("rows")
    if not isinstance(rows, list) or len(rows) != 1:
        raise ValueError("Missing or ambiguous public control row")
    item = rows[0]
    if not isinstance(item, dict) or item.get("row_idx") != row_index or \
       not isinstance(item.get("row"), dict):
        raise ValueError("Unexpected FLEURS control row index")
    reference = item["row"].get("transcription")
    if not isinstance(reference, str) or not 1 <= len(reference.strip()) <= 500 \
       or pashto_script_fraction(reference) < .8:
        raise ValueError("Missing or non-Pashto control transcript")
    audio_url = reference_audio_url(item["row"])
    raw = loader(audio_url, MAX_AUDIO_BYTES)
    import soundfile as sf
    import numpy as np
    import scipy.signal
    sound, sample_rate = sf.read(io.BytesIO(raw), dtype="float32")
    mono, info = validate_clip(sound, sample_rate)
    if sample_rate != 16000:
        divisor = math.gcd(sample_rate, 16000)
        mono = scipy.signal.resample_poly(mono, 16000 // divisor,
                                         sample_rate // divisor).astype(np.float32)
    return {
        "row_index": row_index,
        "reference": reference,
        "samples": mono,
        "audio_sha256": hashlib.sha256(raw).hexdigest(),
        "duration_seconds": info["duration_seconds"],
    }


def validated_model_metadata(info):
    """Require a verified public-model revision and explicit source license."""
    revision = getattr(info, "sha", None)
    card = getattr(info, "card_data", None)
    license_id = card.get("license") if hasattr(card, "get") else None
    if not isinstance(revision, str) or len(revision) != 40 or any(
            ch not in "0123456789abcdef" for ch in revision):
        raise ValueError("Recognizer model revision was not uniquely resolved")
    if license_id != MODEL_LICENSE:
        raise ValueError("Recognizer model license missing or changed")
    if getattr(info, "pipeline_tag", None) != "automatic-speech-recognition":
        raise ValueError("Model no longer declares speech recognition")
    return revision, license_id


def run():
    """Pinned-public-model CPU-only evaluation, keeping audio entirely ephemeral."""
    from huggingface_hub import HfApi
    from transformers import AutoModelForCTC, AutoProcessor
    import torch
    import transformers

    # The pinned Hugging Face Hub client accepts "expand", not "cardData"
    # as a direct model_info() parameter. The returned attribute is .card_data.
    # Never treat an absent license as approved, and do not use credentials.
    run.phase = "model-metadata"
    model_info = HfApi().model_info(
        MODEL_ID, expand=["sha", "cardData", "pipeline_tag"], token=False)
    revision, license_id = validated_model_metadata(model_info)
    # Public data retrieval can fail before inference (for example HTTP 503).
    # Validate all three authentic speech controls BEFORE downloading ~300M
    # model parameters. A source failure must not waste model downloads or
    # accidentally turn an incomplete control set into a speech-quality claim.
    controls = []
    for row_index in CONTROL_ROWS:
        run.phase = "public-test-audio-row-" + str(row_index)
        controls.append(fetch_control(row_index))
    torch.set_num_threads(2)
    loaded = time.monotonic()
    run.phase = "model-processor-load"
    processor = AutoProcessor.from_pretrained(
        MODEL_ID, revision=revision, trust_remote_code=False)
    run.phase = "model-weight-load"
    model = AutoModelForCTC.from_pretrained(
        MODEL_ID, revision=revision, trust_remote_code=False,
        use_safetensors=True)
    model.eval()
    load_seconds = round(time.monotonic() - loaded, 3)
    observations = []
    while controls:
        # Consume each control exactly once, releasing its audio array after
        # decoding rather than retaining all recordings to the end of the run.
        control = controls.pop(0)
        row_index = control["row_index"]
        run.phase = "model-decode-row-" + str(row_index)
        started = time.monotonic()
        inputs = processor(control["samples"], sampling_rate=16000,
                           return_tensors="pt")
        with torch.inference_mode():
            logits = model(**inputs).logits
        token_ids = torch.argmax(logits, dim=-1)
        hypothesis = processor.batch_decode(token_ids)[0]
        duration = time.monotonic() - started
        observations.append({
            "row_index": row_index,
            "reference": control["reference"],
            "hypothesis": hypothesis,
            "audio_sha256": control["audio_sha256"],
            "seconds": duration,
        })
        # Release each decoded public recording and transient hypothesis.
        del inputs, logits, token_ids, control, hypothesis
    run.phase = "aggregate-calibration"
    report = summarize_controls(observations)
    report["recognizer_model"] = MODEL_ID
    report["recognizer_revision"] = revision
    report["recognizer_license"] = license_id
    report["torch_version"] = torch.__version__
    report["transformers_version"] = transformers.__version__
    report["model_load_seconds"] = load_seconds
    report["runtime"] = "isolated_GitHub_CPU_not_mobile"
    return report


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--report", required=True)
    options = p.parse_args()
    from pathlib import Path
    target = Path(options.report)
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        run.phase = "startup"
        result = run()
        status = 0
    except Exception as exc:
        # Intentional no-text error reporting: upstream exceptions could include
        # a sample or URL. Preserve only the exception CLASS and safe gate state.
        result = {
            "evaluation": "PASHTO_PUBLIC_CONTROL_FAILED_NO_VOICE_SCORING",
            "error_type": type(exc).__name__,
            "failed_stage": getattr(run, "phase", "not-started"),
            "recognizer_model": MODEL_ID,
            "recognizer_passed_exploratory_control": False,
            "generated_voice_scoring_executed": False,
            "pronunciation_verified": False,
        }
        status = 1
    target.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n",
                      encoding="utf-8")
    print(json.dumps(result, indent=2, sort_keys=True))
    return status


if __name__ == "__main__":
    sys.exit(main())

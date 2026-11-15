"""Independent, control-gated Pashto recognition proxy for experimental Ghag output.

A real recorded Pashto utterance must first pass the same recognizer.
Agreement is NOT proof of intelligibility. No audio or recognized text is
included in reports or GitHub artifacts.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import unicodedata


def normalized_words(text):
    """Only Unicode punctuation/spacing normalization for *scoring*, not TTS."""
    if not isinstance(text, str):
        raise TypeError("Transcript must be a string")
    text = unicodedata.normalize("NFC", text).casefold()
    text = "".join(" " if unicodedata.category(c).startswith(("P", "Z", "C"))
                   else c for c in text)
    return tuple(re.findall(r"\S+", text))


def edit_distance(expected, observed):
    """Levenshtein distance with O(min(n, m)) memory."""
    if len(expected) < len(observed):
        expected, observed = observed, expected
    previous = list(range(len(observed) + 1))
    for i, left in enumerate(expected, 1):
        current = [i]
        for j, right in enumerate(observed, 1):
            current.append(min(current[j - 1] + 1, previous[j] + 1,
                               previous[j - 1] + int(left != right)))
        previous = current
    return previous[-1]


def comparison(expected, recognized):
    reference = normalized_words(expected)
    hypothesis = normalized_words(recognized)
    if not reference:
        raise ValueError("Expected transcript is empty after comparison normalization")
    return {
        "reference_words": len(reference),
        "hypothesis_words": len(hypothesis),
        "word_error_rate": round(edit_distance(reference, hypothesis) / len(reference), 4),
        "character_error_rate": round(edit_distance(
            tuple(" ".join(reference)), tuple(" ".join(hypothesis))
        ) / max(1, len(" ".join(reference))), 4),
        "reference_sha256": hashlib.sha256(expected.encode("utf-8")).hexdigest(),
        "hypothesis_sha256": hashlib.sha256(recognized.encode("utf-8")).hexdigest(),
    }


def assess_control(control, generated, *, maximum_control_cer=0.35):
    """Inconclusive if the independent recognizer fails on genuine speech."""
    if not 0 <= maximum_control_cer <= 1:
        raise ValueError("Control threshold outside [0, 1]")
    eligible = control["character_error_rate"] <= maximum_control_cer
    return {
        "control_recognizer_adequate_for_proxy": eligible,
        "control_character_error_rate_limit": maximum_control_cer,
        "generated_proxy_character_error_rate": generated["character_error_rate"],
        "generated_proxy_word_error_rate": generated["word_error_rate"],
        "interpretation": (
            "ASR proxy only: intelligibility and trained-cleaner parity unverified"
            if eligible else
            "INCONCLUSIVE: recognizer could not accurately transcribe real Pashto control"
        ),
        "pronunciation_verified": False,
        "trained_cleaner_parity_verified": False,
        "production_ready": False,
    }


def transcribe(model, path):
    """Force Pashto transcription without prompt or previous text."""
    segments, _ = model.transcribe(
        str(path), language="ps", task="transcribe", beam_size=3,
        condition_on_previous_text=False, vad_filter=False,
    )
    return " ".join(s.text.strip() for s in segments).strip()


def run(args):
    report = {
        "stage": "independent_asr_proxy", "proxy_validated": False,
        "pronunciation_verified": False, "trained_cleaner_parity_verified": False,
        "production_ready": False, "errors": [],
    }
    try:
        from huggingface_hub import HfApi, snapshot_download
        from faster_whisper import WhisperModel
        repository = "Systran/faster-whisper-small"
        revision = HfApi().model_info(repository).sha
        if not revision or len(revision) != 40:
            raise RuntimeError("Cannot pin independent recognizer to immutable revision")
        report["recognizer_model"] = repository
        report["recognizer_revision"] = revision
        model_path = snapshot_download(repo_id=repository, revision=revision)
        model = WhisperModel(model_path, device="cpu", compute_type="int8", cpu_threads=4)
        actual_control = transcribe(model, args.control_audio)
        actual_generated = transcribe(model, args.generated_audio)
        reference = Path(args.control_transcript).read_text(encoding="utf-8").strip()
        report["control"] = comparison(reference, actual_control)
        report["generated"] = comparison(args.generated_text, actual_generated)
        report["assessment"] = assess_control(report["control"], report["generated"])
        report["proxy_validated"] = report["assessment"]["control_recognizer_adequate_for_proxy"]
    except Exception as error:
        report["errors"].append({"type": type(error).__name__, "message": str(error)})
    finally:
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--control-audio", type=Path, required=True)
    parser.add_argument("--control-transcript", type=Path, required=True)
    parser.add_argument("--generated-audio", type=Path, required=True)
    parser.add_argument("--generated-text", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = run(args)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())

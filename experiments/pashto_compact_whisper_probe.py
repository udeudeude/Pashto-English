#!/usr/bin/env python3
"""CPU-only public Pashto control for a compact Whisper model.

This is a research comparison, NOT an on-device or translation accuracy claim.
Public CC BY 4.0 FLEURS Pashto test speech stays ephemeral, and GitHub receives
only numerical error rates, SHA-256 provenance, license and resource measures.
"""
import argparse
import json
from pathlib import Path
import resource
import sys
import time

from fleurs_parquet_controls import fetch_three_controls
from pashto_asr_controls import (
    summarize_controls, validated_model_metadata, MODEL_LICENSE,
    CONTROL_ROWS,
)

MODEL_ID = "ihanif/exp_008b_base_cv24_vanilla_no_aug"
EXPECTED_PUBLIC_SHARD_SHA256 = "f56d12655d4d4f09b6b1fa5228b90e2b4cb52a4485b540250509b16127193bed"


def verify_source(controls, source):
    """Require exactly the same three authentic, independently checked controls."""
    if not isinstance(controls, list) or not isinstance(source, dict):
        raise ValueError("Missing public control source")
    if [c.get("row_index") for c in controls] != list(CONTROL_ROWS):
        raise ValueError("Unapproved authentic control indices")
    if source.get("source_parquet_sha256") != EXPECTED_PUBLIC_SHARD_SHA256:
        raise ValueError("Official public shard changed; reassess source integrity")
    if source.get("dataset") != "google/fleurs" or source.get("configuration") != "ps_af" \
       or source.get("split") != "test" or source.get("license") != "cc-by-4.0":
        raise ValueError("Incorrect public Pashto data or license")
    hashes = [c.get("audio_sha256") for c in controls]
    if len(set(hashes)) != 3:
        raise ValueError("Duplicate or missing authentic speech recordings")
    return source


def recognize(loaded, processor, signal):
    """Explicit Pashto transcription, bounded generation, not language guessing."""
    import torch
    inputs = processor(signal, sampling_rate=16000, return_tensors="pt")
    features = getattr(inputs, "input_features", None)
    if features is None:
        raise ValueError("Whisper feature extractor returned no mel spectrogram")
    with torch.inference_mode():
        generated = loaded.generate(
            input_features=features, language="pashto", task="transcribe",
            do_sample=False, num_beams=1, max_new_tokens=160,
        )
    text = processor.batch_decode(generated, skip_special_tokens=True)
    if not isinstance(text, list) or len(text) != 1 or not isinstance(text[0], str):
        raise ValueError("Invalid model transcription output")
    return text[0]


def run():
    import torch
    from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
    import transformers
    from huggingface_hub import HfApi

    run.phase = "public-model-metadata"
    model_info = HfApi().model_info(
        MODEL_ID, expand=["sha", "cardData", "pipeline_tag"], token=False)
    revision, license_id = validated_model_metadata(model_info)
    if license_id != MODEL_LICENSE:
        raise ValueError("Recognizer model is no longer public Apache-2.0")

    run.phase = "authentic-external-test-source"
    controls, source = fetch_three_controls()
    verify_source(controls, source)
    torch.set_num_threads(2)

    run.phase = "compact-model-load"
    started = time.monotonic()
    run.phase = "compact-processor-load"
    processor = AutoProcessor.from_pretrained(
        MODEL_ID, revision=revision, trust_remote_code=False, token=False)
    run.phase = "compact-safetensors-weight-load"
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        MODEL_ID, revision=revision, trust_remote_code=False,
        use_safetensors=True, token=False)
    model.eval()
    load_seconds = round(time.monotonic() - started, 3)

    observations = []
    while controls:
        example = controls.pop(0)
        index = example["row_index"]
        run.phase = "compact-model-decode-row-" + str(index)
        started = time.monotonic()
        transcript = recognize(model, processor, example["samples"])
        observations.append({
            "row_index": index,
            "reference": example["reference"],
            "hypothesis": transcript,
            "audio_sha256": example["audio_sha256"],
            "seconds": time.monotonic() - started,
        })
        del example, transcript

    run.phase = "aggregate-calibration"
    report = summarize_controls(observations)
    report.update({
        "recognizer_model": MODEL_ID,
        "recognizer_revision": revision,
        "recognizer_license": license_id,
        "training_dataset_claimed_in_publications": "Common Voice Pashto 24",
        "training_dataset_verified_from_model_card": False,
        "external_test_dataset": "Google FLEURS ps_af test",
        "cross_domain_status": "candidate_only_not_independently_proven",
        "fleurs_source_parquet_sha256": source["source_parquet_sha256"],
        "model_load_seconds": load_seconds,
        "peak_process_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "cpu_torch_version": torch.__version__,
        "transformers_version": transformers.__version__,
        "mobile_browser_inference_verified": False,
        "generated_voice_scoring_executed": False,
        "comparison_to_other_models_not_statistically_validated": True,
    })
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    path = Path(args.report)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        run.phase = "startup"
        result = run()
        status = 0
    except Exception as error:
        # Never log text, source metadata messages, URLs, model output or voice.
        result = {
            "evaluation": "PUBLIC_COMPACT_PASHTO_MODEL_UNVERIFIED",
            "failed_stage": getattr(run, "phase", "startup"),
            "error_type": type(error).__name__,
            "recognizer_model": MODEL_ID,
            "recognizer_passed_exploratory_control": False,
            "generated_voice_scoring_executed": False,
            "mobile_browser_inference_verified": False,
        }
        status = 1
    path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n",
                    encoding="utf-8")
    print(json.dumps(result, indent=2, sort_keys=True))
    return status


if __name__ == "__main__":
    sys.exit(main())

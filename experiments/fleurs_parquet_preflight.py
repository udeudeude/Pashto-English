#!/usr/bin/env python3
"""Read-only three-row public FLEURS Parquet preflight; never publish voice/text."""
import argparse
import json
from pathlib import Path

from fleurs_parquet_controls import fetch_three_controls

def run():
    controls, source = fetch_three_controls()
    if len({c["audio_sha256"] for c in controls}) != len(controls):
        raise ValueError("FLEURS test controls do not have distinct audio")
    if len({c["reference"] for c in controls}) != len(controls):
        raise ValueError("FLEURS test controls do not have distinct reference text")
    return {
        "retrieval_verified": True,
        "three_distinct_genuine_speech_controls": True,
        "source": source,
        "public_audio_sha256": [c["audio_sha256"] for c in controls],
        "clip_durations_seconds": [c["duration_seconds"] for c in controls],
        "audio_retained_in_report": False,
        "transcripts_retained_in_report": False,
        "recognition_evaluated": False,
        "ghag_cleaner_verified": False,
        "pronunciation_verified": False,
        "mobile_inference_verified": False,
    }

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--report", required=True)
    opts = p.parse_args()
    try:
        result = run()
        status = 0
    except Exception as exc:
        result = {
            "retrieval_verified": False,
            "error_type": type(exc).__name__,
            "failed_stage": "official_fleurs_parquet_preflight",
            "recognition_evaluated": False,
            "pronunciation_verified": False,
        }
        status = 1
    dest = Path(opts.report)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(json.dumps(result, indent=2, sort_keys=True))
    raise SystemExit(status)

#!/usr/bin/env python3
"""Reproducible Ghag conversion experiment. Run in an isolated Python environment.

Stages: inspect, infer, export. Never downloads weights during import or CI.
This is an *experiment*: failures are recorded and never presented as success.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

REPO = "Nasimbahar/pashto-ghag-yourtts"
TEXT = "سلام، تاسو څنګه یاست؟"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def run(args):
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    report = {"stage": args.stage, "repository": REPO, "requested_revision": args.revision,
              "inference_verified": False, "onnx_export_verified": False,
              "browser_verified": False, "steps": [], "errors": []}
    try:
        from huggingface_hub import HfApi, snapshot_download
        api = HfApi()
        info = api.model_info(REPO, revision=args.revision)
        report["resolved_revision"] = info.sha
        if args.stage == "inspect":
            report["files"] = [{"name": f.rfilename, "size": f.size} for f in info.siblings]
            return report
        if not args.accept_download:
            raise RuntimeError("Model download requires --accept-download")
        start = time.monotonic()
        local = Path(snapshot_download(repo_id=REPO, revision=info.sha,
            local_dir=str(output / "checkpoint")))
        report["download_seconds"] = round(time.monotonic() - start, 2)
        report["checkpoint_files"] = [{"name": str(p.relative_to(local)),
            "bytes": p.stat().st_size, "sha256": sha256(p)}
            for p in sorted(local.rglob("*")) if p.is_file()]
        config = local / "config.json"
        if not config.exists():
            raise RuntimeError("Missing config.json; cannot load the model")
        report["config_keys"] = sorted(json.loads(config.read_text()).keys())
        if args.stage == "inspect-weights":
            return report
        # Coqui TTS provides the original inference path. Pin it separately;
        # dependency conflicts are an experiment result, not a reason to guess.
        from TTS.api import TTS
        import soundfile as sf
        t0 = time.monotonic()
        tts = TTS(model_path=str(local / "best_model.pth"),
                  config_path=str(config), progress_bar=False, gpu=False)
        report["load_seconds"] = round(time.monotonic() - t0, 2)
        speaker = args.speaker
        if not speaker:
            raise RuntimeError("Specify --speaker from the model's published speaker metadata; do not invent a speaker ID")
        t0 = time.monotonic()
        wav = tts.tts(text=TEXT, speaker=speaker, language="ps")
        report["inference_seconds"] = round(time.monotonic() - t0, 2)
        import numpy as np
        audio = np.asarray(wav, dtype=np.float32)
        if audio.size == 0 or not np.isfinite(audio).all() or float(np.max(np.abs(audio))) < 0.0001:
            raise RuntimeError("Generated audio is silent or invalid")
        sample_rate = int(tts.synthesizer.output_sample_rate)
        sf.write(str(output / "ghag-baseline.wav"), audio, sample_rate)
        report.update(inference_verified=True, samples=int(audio.size), sample_rate=sample_rate,
                      duration_seconds=round(audio.size / sample_rate, 3))
        if args.stage == "infer":
            return report
        # A full YourTTS graph requires text tokenization, speaker conditioning,
        # durations and waveform decoding. No unvalidated dummy ONNX is emitted.
        raise NotImplementedError("Full conditional YourTTS ONNX export is not established. Inspect model graph, text frontend, speaker embeddings and dynamic axes before implementing an export adapter.")
    except Exception as error:
        report["errors"].append({"type": type(error).__name__, "message": str(error)})
    finally:
        (output / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\\n")
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("stage", choices=["inspect", "inspect-weights", "infer", "export"])
    parser.add_argument("--revision", required=True, help="Immutable Hugging Face commit hash")
    parser.add_argument("--output", default="experiment-results/ghag")
    parser.add_argument("--accept-download", action="store_true")
    parser.add_argument("--speaker", help="Published speaker name or identifier")
    args = parser.parse_args()
    result = run(args)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())

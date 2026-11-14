#!/usr/bin/env python3
"""Reproducible Ghag conversion experiment. Run in an isolated Python environment.

Stages: inspect, infer, export. Never downloads weights during import or CI.
This is an *experiment*: failures are recorded and never presented as success.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time
import traceback
import resource

REPO = "Nasimbahar/pashto-ghag-yourtts"
TEXT = "سلام، تاسو څنګه یاست؟"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def configure_speaker_embedding_paths(config_data, speaker_json):
    """Coqui VitsArgs/VitsConfig declare d_vector_file as List[str].

    Passing a string makes Coqpit coerce it into individual characters,
    then EmbeddingManager tries to open '/' as a file. Keep both config
    levels aligned because VitsConfig.__post_init__ copies model_args.
    """
    model_args = config_data.get("model_args")
    if not isinstance(model_args, dict):
        raise ValueError("Ghag config is missing the VITS model_args object")
    paths = [str(speaker_json)]
    config_data["d_vector_file"] = paths
    model_args["d_vector_file"] = paths
    return config_data


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
        if info.sha != args.revision:
            raise RuntimeError("Resolved model revision does not match pinned commit")
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
        if getattr(args, 'diagnostic_identity_cleaner', False):
            # Diagnostic only: do NOT claim this matches the missing trained cleaner.
            from TTS.tts.utils.text import cleaners
            if hasattr(cleaners, 'pashto_grapheme_cleaners'):
                raise RuntimeError('Original Pashto cleaner now exists; remove diagnostic override')
            cleaners.pashto_grapheme_cleaners = lambda text: text
            report['text_cleaner_override'] = 'IDENTITY_DIAGNOSTIC_UNVERIFIED'
        # Upstream stores speaker embeddings as a PyTorch .pth file, while
        # Coqui's SpeakerManager expects a supported embedding-file format.
        # Convert ONLY inside the isolated runner; never unpickle in the browser.
        import torch
        import numpy as np
        speaker_file = local / 'speakers.pth'
        embeddings = torch.load(str(speaker_file), map_location='cpu', weights_only=False)
        def json_safe(value):
            if isinstance(value, dict):
                return {str(k): json_safe(v) for k, v in value.items()}
            if isinstance(value, (list, tuple)):
                return [json_safe(v) for v in value]
            if isinstance(value, np.ndarray):
                return value.tolist()
            if isinstance(value, torch.Tensor):
                return value.detach().cpu().tolist()
            if isinstance(value, (str, int, float, bool)) or value is None:
                return value
            raise TypeError('Unsupported embedding metadata type: ' + type(value).__name__)
        speaker_json = local / 'speakers-converted.json'
        speaker_json.write_text(json.dumps(json_safe(embeddings)), encoding='utf-8')
        config_data = json.loads(config.read_text())
        config_data = configure_speaker_embedding_paths(config_data, speaker_json)
        converted_config = local / 'config-converted.json'
        converted_config.write_text(json.dumps(config_data), encoding='utf-8')
        report['speaker_embedding_conversion'] = {'source': 'speakers.pth', 'format': 'json', 'entries': len(embeddings)}
        report['speaker_embedding_paths'] = config_data['model_args']['d_vector_file']
        t0 = time.monotonic()
        tts = TTS(model_path=str(local / "best_model.pth"),
                  config_path=str(converted_config), progress_bar=False, gpu=False)
        report["load_seconds"] = round(time.monotonic() - t0, 2)
        report["peak_rss_kib_after_load"] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
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
        peak = float(np.max(np.abs(audio)))
        rms = float(np.sqrt(np.mean(np.square(audio, dtype=np.float64))))
        report["waveform"] = {"peak": round(peak, 6), "rms": round(rms, 6),
                              "clipped_fraction": round(float(np.mean(np.abs(audio) >= 0.999)), 6)}
        report["peak_rss_kib_after_inference"] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        report["realtime_factor"] = round(report["inference_seconds"] / (audio.size / sample_rate), 3)
        sf.write(str(output / "ghag-baseline.wav"), audio, sample_rate)
        report.update(inference_verified=True, samples=int(audio.size), sample_rate=sample_rate,
                      duration_seconds=round(audio.size / sample_rate, 3))
        if args.stage == "infer":
            return report
        # A full YourTTS graph requires text tokenization, speaker conditioning,
        # durations and waveform decoding. No unvalidated dummy ONNX is emitted.
        raise NotImplementedError("Full conditional YourTTS ONNX export is not established. Inspect model graph, text frontend, speaker embeddings and dynamic axes before implementing an export adapter.")
    except Exception as error:
        report["errors"].append({"type": type(error).__name__, "message": str(error),
                                 "traceback": traceback.format_exc(limit=12)})
    finally:
        (output / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("stage", choices=["inspect", "inspect-weights", "infer", "export"])
    parser.add_argument("--revision", required=True, help="Immutable Hugging Face commit hash")
    parser.add_argument("--output", default="experiment-results/ghag")
    parser.add_argument("--accept-download", action="store_true")
    parser.add_argument("--speaker", help="Published speaker name or identifier")
    parser.add_argument("--diagnostic-identity-cleaner", action="store_true", help="UNVERIFIED identity cleaner solely to diagnose subsequent loading blockers")
    args = parser.parse_args()
    result = run(args)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())

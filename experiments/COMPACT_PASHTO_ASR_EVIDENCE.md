# Compact Pashto Whisper: independent three-control experiment

**Status 2026-11-17: genuine model test passed, experimental and not deployed.** The experimental 300-million-parameter Pashto Wav2Vec2 recognizer has passed its tiny three-row real FLEURS source control at pooled **25.65% character error** and **53.97% word error** (run 44225743400). We are now comparing a smaller, separately fine-tuned Whisper-based candidate on **the exact same three verified human-Pashto test rows**.

## Candidate

- [`ihanif/exp_008b_base_cv24_vanilla_no_aug`](https://huggingface.co/ihanif/exp_008b_base_cv24_vanilla_no_aug), Whisper-base, ~72.6 million parameters, public card claims **Apache-2.0** and reports **9.44% character error / 28.63% word error** on its own evaluation. These numbers are **author-reported**, not measured by this experiment.
- Model card lists training dataset as **unknown**, despite a related April 2026 Pashto fine-tuning paper reporting Common Voice 24 for a similarly named experiment. Exact data provenance, train/test leakage and licensing of training speech **must be independently verified** before treating our FLEURS split as truly unseen.
- Public weights are `model.safetensors` (about **290 MB**, before tokenizer and engine). The separately available 78 MB `ihanif/exp_001_base_vanilla-gguf` is a **different model**; its reported size is not this checkpoint's model size.

## Experiment

- `pashto_compact_whisper_probe.py`: asserts exact source Parquet SHA-256 `f56d12655d4d4f09b6b1fa5228b90e2b4cb52a4485b540250509b16127193bed`, FLEURS Pashto `ps_af` **test rows 0–2**, CC BY 4.0 source claims and nonduplicate clip checks; verifies model exact revision, Apache-2.0 license and speech-recognition task before loading. Loads `safetensors` only, never remote code.
- Explicit Pashto transcription at deterministic decoding settings; compares the same Unicode-sensitive character/word distances, script fraction and conservative failed-control thresholds used for the Wav2Vec2 experiment.
- `test_pashto_compact_whisper_probe.py`: five synthetic tests for source/hash/license, no-score failure, safe redacted reporting and forced decoding. No real speech leaves the experiment runner.
- `.github/workflows/pashto-compact-whisper-probe.yml`: offline tests first; experimental branch-only CPU job with source validation and temporary model/audio cleanup. Only aggregate JSON artifact allowed.

## Status and identified runtime blocker

- Initial full experiment [44226391846](https://github.com/udeudeude/Pashto-English/actions/runs/44226391846) passed offline tests but failed at processor load, not recognition.
- The followup [44226538118](https://github.com/udeudeude/Pashto-English/actions/runs/44226538118) similarly failed, pinpointing `ImportError` at `compact-processor-load`.
- Dependency classification [44226740405](https://github.com/udeudeude/Pashto-English/actions/runs/44226740405) isolated missing **protobuf**, before any model inference. The workflow now pins `protobuf==4.25.5` at commit `a093fef63b8e0a2dbbc4ad170ca76eb80c1b00f7`. **Await independent final-head results; do not claim model accuracy until successful real audio inference.**
- **Resolved incompatibility:** The v5.2-era checkpoint supplies a fast `tokenizer.json` but advertises a slow tokenizer whose `vocab.json` and `merges.txt` are absent. Transformers 4.46.3 cannot load it directly as a `WhisperProcessor` because the wrapper refuses a fast tokenizer. The audited script now explicitly loads `WhisperTokenizerFast` from the same pinned candidate, verifies its Pashto language token, and pairs it with a feature extractor constructed from the released **16,000 Hz, 80-mel, 400-point transform, 160-sample hop** metadata. It forwards audio feature extraction and text decoding through an intentionally narrow adapter rather than falling back to a different model or inventing vocabulary files.
- **Actual successful licensed speech inference**, [run 44227561822](https://github.com/udeudeude/Pashto-English/actions/runs/44227561822), original exact model revision `f97e4611e0c68d3713cdc72063f85144965a03fe`, Apache-2.0: **3 of 3 human FLEURS controls transcribed**. Pooled **character error 0.2454**, **word error 0.4603**; individual character errors **0.2991, 0.3143, 0.1304**; word errors **0.5600, 0.5294, 0.2857**. All three hypotheses scored **100% Arabic-script characters** by the script heuristic.
- The predeclared `recognizer_passed_exploratory_control=true`. **No generated speech, Ghag/eSpeak comparison or human pronunciation assessment was run.** The sample has only **63 reference words** and is too small for statistical superiority claims.
- GitHub CPU runtime: model load **7.629 seconds**, recognition **1.185, 0.931, 1.241 seconds** for the respective samples, process maximum **1,642,332 KiB (~1.57 GiB)**. None of these measures demonstrates iPhone memory, battery, bandwidth or latency. Public safetensors weight file is about **290 MB**.
- Same genuine source Parquet SHA-256 `f56d12655d4d4f09b6b1fa5228b90e2b4cb52a4485b540250509b16127193bed` as the full-size model. Smaller model currently has *slightly* lower observed errors (24.54% vs 25.65% character, 46.03% vs 53.97% word), but independence of the smaller candidate's training source has **not** been verified, and sample size is far too small for performance ranking.
- No personal data or user-supplied private corpus was used or committed. The temporary public test speech, model weights and tokenizer cache were not uploaded in the evidence artifact.

- Neither recognizer is part of the production web app; no private dataset has been evaluated, and no generated Ghag voice was scored.

## Gate to progress

1. Repeat and expand real-speech calibration beyond three sentences, with verified training-data provenance.
2. Demonstrate an independently verified cross-domain control and training-data nonoverlap before comparing Ghag/eSpeak voices.
3. Evaluate quantization and **real phone-browser** memory/download/latency, without uploading users' speech or displacing the existing working offline fallback.
4. Separately recover Ghag's unpublished `pashto_grapheme_cleaners` or independent authoritative equivalent; an ASR improvement cannot fix unverified Ghag grapheme processing.

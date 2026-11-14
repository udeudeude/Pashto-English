# Pashto Ghag conversion experiment

This is a **staged, reproducible feasibility experiment**, not a working browser voice. Nothing is bundled with the live app. No model weights or private recordings are committed.

**Verified as of 2026-11-14:** three independent CPU runs produced non-silent waveforms from the pinned checkpoint, but only with an artificial non-speech speaker reference and an unverified identity cleaner. This is **not verified spoken Pashto**. The 64-symbol pinned model alphabet and ten test sentences were audited in [GitHub Actions run 43621120024](https://github.com/udeudeude/Pashto-English/actions/runs/43621120024); that does not establish exact cleaner parity. See [the evidence gates](GHAG_EXECUTION_GATES.md) before claiming capability.

## Environment

Use a clean Linux environment with Python 3.10, enough memory and disk for the upstream checkpoint, and CPU inference initially. Record exact package versions with `python -m pip freeze > experiment-results/ghag/pip-freeze.txt`. Coqui TTS is version-sensitive: install a compatible pinned version only after inspecting the model's upstream instructions, and record that version and any patches. Install `huggingface_hub`, `numpy`, `soundfile`, and the selected compatible Coqui `TTS` release. Do not claim a reproducible inference run without recording the full lockfile.

## Commands

1. Run `python scripts/probe-ghag-artifacts.py` to inventory the upstream model without downloading weights. Record the immutable commit hash returned by the probe.
2. Run `python experiments/ghag-conversion.py inspect --revision <COMMIT_SHA>`. This records model metadata without weights.
3. Once storage and license suitability are checked, run `python experiments/ghag-conversion.py inspect-weights --revision <COMMIT_SHA> --accept-download`. This downloads the pinned checkpoint and records per-file hashes and sizes.
4. Inspect downloaded configuration and published speaker metadata first. The published `speakers.pth` is an integer speaker-ID map, **not** the required 512-dimensional precomputed d-vectors, so selecting its names as if they were d-vectors is invalid. The **diagnostic-only** command `python experiments/ghag-conversion.py infer --revision <COMMIT_SHA> --accept-download --diagnostic-identity-cleaner --diagnostic-synthetic-reference --speaker <PUBLISHED_SPEAKER>` attempts checkpoint inference with a synthetic tone as speaker reference and records `inference_verified=false` even when a non-silent waveform is produced. Neither the synthetic reference nor the identity cleaner is trained voice evidence.
5. Before any export attempt, recover or reproduce the *actual* trained text cleaner and legitimate speaker-conditioning path, then establish reproducible human-speech-conditioned inference. Full conditional ONNX export remains deliberately unimplemented. An experimental export invocation currently fails explicitly rather than emitting a misleading dummy graph.

Each stage writes `experiment-results/ghag/report.json`, with explicit booleans for inference, export and browser validation. Preserve each stage's report separately before running the next stage, because the report path is overwritten. The first two stages can be repeated without a GPU.

## Required next conversion engineering

Inspect the original YourTTS checkpoint and model graph, the text frontend, the speaker encoder or supported speaker IDs, conditioning vectors, duration and flow components, and the waveform decoder. Export components with pinned PyTorch/ONNX versions, test numerical behavior and dynamic input lengths against original inference, and only then attempt WebAssembly inference in iPhone WebKit. Measure model size, memory, first-audio latency, audio duration, and cancellation. Do not introduce paid services or depend on recruiting speakers.

## Limitations

The original checkpoint produced repeatable **diagnostic neural waveforms** but not validated natural or intelligible Pashto speech. There is no verified trained-cleaner implementation in the pinned published Python source; the minimal Unicode character-coverage audit must **not** be installed as a drop-in trained cleaner. Real speaker conditioning, pronunciation, ONNX export, and browser execution are unverified. The model's compatibility with older iPhones remains unknown. The experiment records errors rather than claiming unsupported success.

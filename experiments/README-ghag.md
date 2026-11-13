# Pashto Ghag conversion experiment

This is a **staged, reproducible feasibility experiment**, not a working browser voice. Nothing is bundled with the live app. No model weights or private recordings are committed.

## Environment

Use a clean Linux environment with Python 3.10, enough memory and disk for the upstream checkpoint, and CPU inference initially. Record exact package versions with `python -m pip freeze > experiment-results/ghag/pip-freeze.txt`. Coqui TTS is version-sensitive: install a compatible pinned version only after inspecting the model's upstream instructions, and record that version and any patches. Install `huggingface_hub`, `numpy`, `soundfile`, and the selected compatible Coqui `TTS` release. Do not claim a reproducible inference run without recording the full lockfile.

## Commands

1. Run `python scripts/probe-ghag-artifacts.py` to inventory the upstream model without downloading weights. Record the immutable commit hash returned by the probe.
2. Run `python experiments/ghag-conversion.py inspect --revision <COMMIT_SHA>`. This records model metadata without weights.
3. Once storage and license suitability are checked, run `python experiments/ghag-conversion.py inspect-weights --revision <COMMIT_SHA> --accept-download`. This downloads the pinned checkpoint and records per-file hashes and sizes.
4. Inspect the downloaded configuration and published speaker metadata, then run `python experiments/ghag-conversion.py infer --revision <COMMIT_SHA> --accept-download --speaker <PUBLISHED_SPEAKER>`. This attempts original-model CPU inference and writes `ghag-baseline.wav` only if non-silent finite audio is produced.
5. Only after successful original inference, run `python experiments/ghag-conversion.py export --revision <COMMIT_SHA> --accept-download --speaker <PUBLISHED_SPEAKER>`. **Currently this stage deliberately fails after baseline inference**, with an explicit error: full conditional ONNX export has not been implemented. It never emits a misleading dummy model.

Each stage writes `experiment-results/ghag/report.json`, with explicit booleans for inference, export and browser validation. Preserve each stage's report separately before running the next stage, because the report path is overwritten. The first two stages can be repeated without a GPU.

## Required next conversion engineering

Inspect the original YourTTS checkpoint and model graph, the text frontend, the speaker encoder or supported speaker IDs, conditioning vectors, duration and flow components, and the waveform decoder. Export components with pinned PyTorch/ONNX versions, test numerical behavior and dynamic input lengths against original inference, and only then attempt WebAssembly inference in iPhone WebKit. Measure model size, memory, first-audio latency, audio duration, and cancellation. Do not introduce paid services or depend on recruiting speakers.

## Limitations

No original inference, ONNX export, or browser execution has been verified in this pull request. The model's actual compatibility with older iPhones remains unknown. The experiment intentionally fails safely when prerequisites are absent and records errors rather than claiming success.

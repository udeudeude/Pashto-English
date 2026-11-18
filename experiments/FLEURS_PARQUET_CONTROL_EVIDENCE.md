# Public Pashto recognition control: alternate FLEURS source

**Status, 2026-11-17:** Official Google FLEURS Parquet fallback is implemented and its genuine **three-row `ps_af` test-split** preflight passed. **This is source acquisition, not evidence that recognition or any synthesized voice is accurate.**

## Failure explained

Repeated independent recognition jobs on experimental [PR #34](https://github.com/udeudeude/Pashto-English/pull/34) stopped at `public-test-audio-row-0` with a transport `HTTPError`, before model inference. The viewer endpoint is not reliable enough to be the experiment's only data source. A successful PR-only offline check previously looked green despite the real branch-only job failing; do not confuse those.

Hugging Face's [official Parquet dataset API](https://huggingface.co/docs/dataset-viewer/parquet#using-the-hugging-face-hub-api) exposes the Google FLEURS `ps_af` *test* split through a separate Hub endpoint, rather than the unreliable datasets-server viewer. The [Google FLEURS dataset](https://huggingface.co/datasets/google/fleurs) declares **CC BY 4.0**. This is not a new independent speech domain, and it cannot establish lack of training/evaluation overlap.

## Implementation and safeguards

- `fleurs_parquet_controls.py`: resolve only an official Google/FLEURS Pashto test shard from the Hub API. Require index zero, verify restricted HTTPS host, cap the shard at 550 million bytes and audio at six million bytes per recording, reject unapproved redirects, and compute streaming SHA-256 for the shard and original encoded speech. Decode only rows 0–2 as genuine test controls; reject missing or non-Pashto text, corrupted/short/silent audio, and arbitrary remote audio paths.
- `fleurs_parquet_preflight.py`: run source checks independently of any model, preserve only sample durations and content hashes; reject duplicates and never upload voice bytes or transcript content.
- `pashto_asr_controls.py`: on transient viewer transport failure only, discard partially fetched viewer rows and retry the **same three rows from the official Parquet source**. Do not fall back when transcript, provenance or authorization checks fail. The report describes which source was used; neither path authorizes user audio uploads or ranking a generated voice without a separate cross-domain evaluation.
- `test_fleurs_parquet_controls.py`: seven synthetic tests for source allowlists, URL path/split enforcement, byte limits, redirect constraints, complete embedded audio decoding, missing text/audio rejection, forged hash rejection, redaction, fixed row indices. `test_pashto_asr_controls.py` adds explicit transient fallback, access-control refusal and invalid-source refusal tests.
- Workflow `fleurs-parquet-controls.yml` runs offline tests, genuine **public** data-only preflight, then an isolated CPU recognition job. Private/user recordings and model weights are not uploaded as artifacts.

## Actual source-gate result

[Successful full data-only preflight, workflow 44225596349](https://github.com/udeudeude/Pashto-English/actions/runs/44225596349):

- **3/3 genuine distinct licensed Pashto recordings** retrieved, indexed and audio-decoded.
- Official shard size **402,394,758 bytes** and exact shard SHA-256 **`f56d12655d4d4f09b6b1fa5228b90e2b4cb52a4485b540250509b16127193bed`**.
- Real source code independently passed the seven synthetic cases before the expensive fetch.
- The **report contains no actual audio or transcripts**. The file temporarily downloaded on the runner is removed when the job ends.
- Recognition accuracy, device runtime, listener intelligibility and Ghag's training-cleaner parity remain **unverified** by this source preflight. The separate live recognizer job must produce real measured error rates before any interpretation.


## Measured independent recognizer inference: PASSED first exploratory gate

[Successful full-model workflow 44225743400](https://github.com/udeudeude/Pashto-English/actions/runs/44225743400) at code/workflow commit `67eefd60fd1c94c4b2bb66fe7228516cc2bc98b5`:

- Offline: **7/7 Parquet source and audio tests**, **17/17 recognizer-control tests**. Genuine data preflight passed and the isolated CPU recognizer loaded and decoded all three source-checked Pashto clips.
- Model `ihanif/wav2vec2-xls-r-300m-pashto`, exact resolved revision **`9ec5ce8ba20fe3975669fce8b622c74baf46a7c5`**, public model card **Apache-2.0**, runtime PyTorch 2.5.1 CPU and Transformers 4.46.3.
- Actual pooled **character error rate 0.2565** and **word error rate 0.5397** on `ps_af` test rows 0–2. Per-row character error rates: **0.3084, 0.3571, 0.1196**. Per-row word error rates: **0.6000, 0.7059, 0.3333**.
- Each human-speech hypothesis had **100% Arabic-script letters** by the predeclared script measure. This is not proof that a transcript contains correct Pashto.
- Initial model loading took **7.861 seconds** on the GitHub CPU runner; decode times **5.187, 1.720, 2.118 seconds** for three different recordings. Not a device or mobile memory/performance benchmark.
- Exact public shard SHA-256 matched the previous source-only preflight; only numerical/calibration and cryptographic provenance JSON was retained as a GitHub artifact, not audio, speech text, model weights or private material.
- **`recognizer_passed_exploratory_control=true`**, **`generated_voice_scoring_executed=false`**, **`pronunciation_verified=false`**. The narrow first gate has passed, not the cross-domain or human evaluation gates.

**Interpretation:** This is the first measured authentic-Pashto calibration after zero-shot Whisper failed. It independently reproduces useful, but still substantial, error on a tiny FLEURS sample from the recognizer's own dataset family. It cannot yet rank neural Ghag versus eSpeak, justify model deployment or establish reliable conversational transcription. The published model requires approximately **1.26 GB of safetensors weights** (before its processor and runtime), so it is not a drop-in offline iPhone solution.

## Next evidence gates

1. Confirm the full CPU recognition model succeeds with exact pinned weights and safely aggregate genuine Pashto calibration error rates. A failure remains a failure; do not assert model quality from its authors' published aggregate benchmark.
2. Test a second distribution that was not used to fine-tune the recognizer. The two October 2026 Mozilla corpora have unresolved internal rights flags; they are not automatically approved for this test or for training.
3. Locate Ghag's unpublished `pashto_grapheme_cleaners` source or obtain authoritative author confirmation. The diagnostic identity substitution is not evidence of original training-time normalization.
4. Obtain fluent-speaker pronunciation and meaning review and physical mobile checks before any production voice change.

**Production stays on bundled eSpeak.** This experimental branch does not modify the public app's speech-input or -output runtime.

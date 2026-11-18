# Recognition runtime evidence — November 9, 2026 (New York)

## Actual engine execution

Commit `c5a5fa7731f64c0e3ffe90e22717e1c340bf0f6c`, [GitHub run 42753363847](https://github.com/udeudeude/Pashto-English/actions/runs/42753363847), passed both browser tests using the real remotely downloaded Transformers.js 3.8.1 and onnx-community/whisper-tiny q8 model, in a local module worker with one WebAssembly thread.

| Emulated browser | Model ready | Total execution | Output on one second of digital silence |
| --- | ---: | ---: | --- |
| Android-sized Chromium | 2,566 ms | 3,806 ms | 7 characters |
| iPhone-sized WebKit | 3,409 ms | 4,604 ms | 7 characters |

These are GitHub runner measurements, NOT phone performance. Input was a zero-filled Float32Array at 16,000 samples/second. This proves library/model download and inference execution in these browser engines, not microphone decoding, Pashto accuracy, model intelligibility, or physical phone compatibility. Reports are attached to the run as `recognition-runtime-evidence`.

The nonempty output on silence is evidence of hallucination. The application now rejects digital silence, very short recordings, excessive duration and nonfinite samples before inference. The conservative peak threshold is 0.00001 (approximately -100 dBFS). This deliberately preserves quiet audio. It is not voice activity detection; background noise or real speech can still produce incorrect words.

## Why use a disposable worker?

[Transformers.js 3.8.1 source](https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/src/backends/onnx.js) retains a failed WebAssembly initialization promise and an inference promise chain. Recreating only the application's pipeline promise does not reset that module state. Terminating the worker on failure, cancellation or timeout creates a clean runtime on retry. Successful workers can be reused. Inference also no longer blocks the page's interface thread.

Configuration follows the [library settings](https://huggingface.co/docs/transformers.js/v3.8.1/custom_usage). Single-thread operation does not require cross-origin isolation headers unavailable on this GitHub Pages deployment. This does not identify the original physical iPhone startup failure's root cause.

## Published model sizes, not measured phone memory

The [model metadata](https://huggingface.co/api/models/onnx-community/whisper-tiny?blobs=true) reported revision `ff4177021cc41f7db950912b73ea4fdf7d01d8e7` during this session:

- `onnx/encoder_model_quantized.onnx`: 10,124,990 bytes.
- `onnx/decoder_model_merged_quantized.onnx`: 30,719,241 bytes.

Runtime binaries, tokenizers and configuration add further downloads. Memory during execution is larger than downloaded weight size and remains unmeasured. The model request currently uses the repository's default revision. Its model card points to `openai/whisper-tiny` but does not independently declare a license; preserve provenance and verify upstream licensing before redistributing weights. The app downloads weights from their existing host rather than vendoring them.

## Repeat and continue

- Fast checks: `npm run check && npm run test:recognition`, then `npm test`.
- Real-model check: `PASHTO_LIVE_MODEL=1 npx playwright test tests/recognition-live.spec.mjs --workers=1 --retries=0`.
- The separate `Actual recognition runtime smoke test` workflow runs for relevant pull-request changes and can be manually dispatched. Ordinary browser tests skip this network-dependent check.
- Next: use legitimately acquired transcribed Afghan Pashto speech and the existing `PASHTO_RECOGNITION_EVALUATION.md` guide. Measure real phone model download, memory and latency, compare recognized text with human references, and evaluate speech/non-speech discrimination. Do not use synthetic-silence execution as an accuracy score.

## November 17, 2026: unexpected browser-recognition end (stacked PR #35)

The browser may end a non-Apple English recognition session without delivering a transcript. The previous controller cleared the microphone but kept displaying Listening. The isolated fix reports a bilingual, retryable failure and cannot override completed speech or cancellation; the iPhone owned-recorder path remains unchanged. At [Actions run 44110774448](https://github.com/udeudeude/Pashto-English/actions/runs/44110774448), commit `398580db64ec36c8bf231a1a5c126147b764577d` passed both jobs, **94 mobile browser tests with 10 intentional skips**, including both new Android Chromium regressions, and generated actual bundled Pashto eSpeak output. The browser audio and translations in the two new tests are mocked; physical-phone behavior is **not** verified. Full reproduction and scope: [RECOGNITION_END_EVENT_EVIDENCE.md](RECOGNITION_END_EVENT_EVIDENCE.md). This branch is stacked on #32; neither it nor live production has been merged or changed.

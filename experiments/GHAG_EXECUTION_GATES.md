# Neural Pashto speech: execution gates

This is an evidence-based status register, not a claim that a neural voice is available.

| Gate | Evidence required | Status on 2026-11-13 |
| --- | --- | --- |
| 1. Diagnose current inference | Exact error from actual checkpoint run | Completed: missing `pashto_grapheme_cleaners` in Coqui 0.22.0; identity-cleaner diagnostic then exposed `ValueError: Unsupported file type` during initialization; full traceback run pending |
| 2. Reproduce text frontend and speaker selection | Documented cleaner implementation, correct symbol mapping and published speaker ID | Blocked: original cleaner implementation not yet recovered; diagnostic identity override is **not** a substitute |
| 3. Generate real neural audio | Non-silent waveform, known revision, speaker, input, sample rate, hashes | Blocked on model initialization; no neural waveform generated |
| 4. Measure speed and memory | Peak memory, model load seconds, real-time factor, clipping | Instrumentation added; no successful measurement yet |
| 5. Compression | Repeatable quantization with quality/performance comparison | Not started; baseline inference required |
| 6. ONNX conversion | Exported graph plus numerical parity tests | Not started; original inference required |
| 7. Mobile browser | Actual WebKit/Chromium inference, peak memory and time-to-audio | Not started; no browser model |
| 8. Integrate with eSpeak fallback | Working selectable adapter with cancellation and speed tests | Fallback contract exists; no neural adapter |
| 9. Pronunciation research | Independently sourced Pashto phonetic references and reproducible comparisons | Not validated |
| 10. Regression suite | Successful GitHub workflow checks for all code changes | In progress |
| 11. Deployment | Merged, deployed and verified on public site | Not applicable until a viable voice exists |

**Model facts:** pinned Ghag revision `4b2521265c173a1f6b2df9584a57046cdbe614a9`, main weights 1,078,558,774 bytes, speaker encoder 44,610,930 bytes. The published helper supports `speakers.pth` d-vectors, and `KNOWN_SPEAKERS.json` contains 11 entries. This does **not** prove the speaker encoder can be omitted for all voices.

**Safety:** Do not load untrusted model pickle files outside an isolated runner. Do not upload weights, private speech, or generated speaker recordings to public artifacts. The identity-cleaner override is solely a diagnostic to expose later load failures; its audio, if produced, is not a validated Pashto voice. Never replace the existing eSpeak engine until real browser playback and fallback have been demonstrated.

## Latest observed failure (2026-11-13)

The CPU workflow run 43510637777 downloaded the pinned checkpoint and reported `ValueError: Unsupported file type` after the explicitly unverified identity-cleaner override. It did not produce audio. A new run (43526987647) captures a Python traceback to locate the rejecting component. Do not interpret the identity override as a production Pashto normalizer.

## Speaker file loader diagnosis (2026-11-13, later run)

Run [43537980623](https://github.com/udeudeude/Pashto-English/actions/runs/43537980623) still failed in `SpeakerManager.read_embeddings_from_file -> load_file` with `ValueError: Unsupported file type`. The converted JSON configuration did not prevent the unsupported load. Commit `77193be` instruments the actual path requested and, in this isolated diagnostic only, returns the already-decoded embeddings when the original `speakers.pth` is requested. The experiment still uses an unverified identity text cleaner. This is not production code or validated speech. A fresh CPU run is pending.

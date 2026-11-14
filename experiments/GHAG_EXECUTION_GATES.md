# Neural Pashto speech: execution gates

This is an evidence-based status register, not a claim that a neural voice is available.

| Gate | Evidence required | Status on 2026-11-14 |
| --- | --- | --- |
| 1. Diagnose current inference | Exact error from actual checkpoint run | Confirmed: missing original `pashto_grapheme_cleaners`; later `ValueError` traced to a configuration path being split into characters (first attempted path `/`). Fixed VITS path type (offline tests passed); exposed incompatible integer speaker-ID mapping instead of 512-dimensional d-vectors. Synthetic reference diagnostic pending |
| 2. Reproduce text frontend and speaker selection | Documented cleaner implementation, correct symbol mapping and published speaker ID | Blocked: original cleaner implementation not yet recovered; diagnostic identity override is **not** a substitute |
| 3. Generate real neural audio | Non-silent waveform, known revision, speaker, input, sample rate, hashes | Original checkpoint initializes with synthetic non-speech conditioning, but **no waveform** yet; validated voice still blocked |
| 4. Measure speed and memory | Peak memory, model load seconds, real-time factor, clipping | Model-load timing and resident memory measured under synthetic diagnostic; no valid audio-speed baseline yet |
| 5. Compression | Repeatable quantization with quality/performance comparison | Not started; baseline inference required |
| 6. ONNX conversion | Exported graph plus numerical parity tests | Not started; original inference required |
| 7. Mobile browser | Actual WebKit/Chromium inference, peak memory and time-to-audio | Not started; no browser model |
| 8. Integrate with eSpeak fallback | Working selectable adapter with cancellation and speed tests | Fallback contract exists; no neural adapter |
| 9. Pronunciation research | Independently sourced Pashto phonetic references and reproducible comparisons | Not validated |
| 10. Regression suite | Successful GitHub workflow checks for all code changes | In progress; offline regression tests added |
| 11. Deployment | Merged, deployed and verified on public site | Not applicable until a viable voice exists |

**Model facts:** pinned Ghag revision `4b2521265c173a1f6b2df9584a57046cdbe614a9`, main weights 1,078,558,774 bytes, speaker encoder 44,610,930 bytes. The published helper supports `speakers.pth` d-vectors, and `KNOWN_SPEAKERS.json` contains 11 entries. This does **not** prove the speaker encoder can be omitted for all voices.

**Safety:** Do not load untrusted model pickle files outside an isolated runner. Do not upload weights, private speech, or generated speaker recordings to public artifacts. The identity-cleaner override is solely a diagnostic to expose later load failures; its audio, if produced, is not a validated Pashto voice. Never replace the existing eSpeak engine until real browser playback and fallback have been demonstrated.

## Latest observed failure (2026-11-13)

The CPU workflow run 43510637777 downloaded the pinned checkpoint and reported `ValueError: Unsupported file type` after the explicitly unverified identity-cleaner override. It did not produce audio. A new run (43526987647) captures a Python traceback to locate the rejecting component. Do not interpret the identity override as a production Pashto normalizer.

## Speaker file loader diagnosis (2026-11-13, later run)

Run [43537980623](https://github.com/udeudeude/Pashto-English/actions/runs/43537980623) still failed in `SpeakerManager.read_embeddings_from_file -> load_file` with `ValueError: Unsupported file type`. The converted JSON configuration did not prevent the unsupported load. Commit `77193be` instruments the actual path requested and, in this isolated diagnostic only, returns the already-decoded embeddings when the original `speakers.pth` is requested. The experiment still uses an unverified identity text cleaner. This is not production code or validated speech. A fresh CPU run is pending.

## 2026-11-14: root cause of repeated speaker loader failure

- The [latest pre-fix CPU attempt, run 43546896879](https://github.com/udeudeude/Pashto-English/actions/runs/43546896879), failed with `ValueError: Unsupported file type`. **The recorded `embedding_load_paths` is `["/"]`**, not `speakers.pth` and not the converted JSON file. The same `["/"]` appeared in run 43546757414. The `speakers.pth` decoder succeeded with **11 entries**. No neural audio was generated.
- Inspection of [Coqui TTS v0.22.0 VITS source](https://github.com/coqui-ai/TTS/blob/v0.22.0/TTS/tts/models/vits.py) and [VITS config](https://github.com/coqui-ai/TTS/blob/v0.22.0/TTS/tts/configs/vits_config.py) established that `d_vector_file` is declared as `List[str]`, while the experiment had set it to a **single string**. Config deserialization converted the string to a list of individual characters; the embedding manager consequently attempted to load `/` as a file. This error was **not** proof of corrupt checkpoint weights or an unsupported speaker binary.
- Updated `experiments/ghag-conversion.py` to put **one complete JSON file path in a one-element list**, both in root config and `model_args`; removed the experimental loader monkeypatch. This preserves other model settings. Added standard-library regression tests in `experiments/test_ghag_speaker_paths.py` and a workflow step that runs them *before downloading checkpoint weights*. The subsequent full CPU attempt is pending; this is a **hypothesis under execution**, not yet successful inference.
- The Pashto identity-cleaner override remains a diagnostic only, and cannot validate pronunciation or real voice quality. Follow the gate order above; do not proceed to compression or browser deployment based solely on corrected model initialization.

## 2026-11-14: next checkpoint metadata failure and isolated probe

- [CPU run 43606715329](https://github.com/udeudeude/Pashto-English/actions/runs/43606715329) passed the newly added speaker-path regression tests. It advanced beyond the invalid `/` path, then failed with `TypeError: 'int' object is not subscriptable` at `EmbeddingManager.read_embeddings_from_file`: Coqui expected objects with `name` and `embedding` fields, but the published `speakers.pth` holds **integer speaker IDs**, not precomputed speaker vectors. This is an actual compatibility problem with the published model package; converting the file to JSON does **not** turn IDs into d-vectors.
- The pinned archive contains `best_model.pth`, `speakers.pth`, `model_se.pth` and `config_se.json`, but no distinct precomputed d-vector file (as commonly distributed with YourTTS models). The original config reports `use_d_vector_file=true`, `use_speaker_embedding=false`, `d_vector_dim=512`. Built-in voice selection remains **unverified and blocked** without suitable conditioning.
- Commit `8d4291f` recognizes the metadata schema, refuses to misinterpret IDs as embeddings, and adds an explicitly labeled **non-speech synthetic conditioning** probe using the published speaker encoder. Only synthetic audio is used as *reference*, not real or private recordings, and no waveform or weights are uploaded as artifacts. This may locate subsequent model-load blockers, **not demonstrate an intelligible Pashto voice**. New classification and reference-signal tests were committed, and the workflow was changed to use this diagnostic flag. Await the real workflow result before claiming any stage passed.
- Still required: a reproducibly licensed real Pashto reference clip or the model author's original 512-dimensional d-vector data, the actual text cleaner and proper speaker mapping, plus neural waveform and pronunciation validation. Artificial conditioning must never be counted as a verified human voice.

## 2026-11-14: pinned model successfully initialized, synthesis not yet established

- [Run 43607220025](https://github.com/udeudeude/Pashto-English/actions/runs/43607220025) passed all speaker metadata regression tests and initialized the **actual pinned Ghag checkpoint** under Coqui 0.22.0 using the unverified identity text cleaner and a synthetic **non-speech** reference signal. The runner recorded model load **1.48 seconds** and peak resident memory after load **2,684,480 KiB (~2.56 GiB)**. This is a successful **model initialization diagnostic only**. No Pashto waveform was produced and these numbers do not characterize inference or phone performance.
- Next error: `AttributeError: 'TTS' object has no attribute 'is_multi_lingual'` arises from Coqui's high-level `TTS.tts()` validation when given the custom Ghag VITS config. Coqui's public underlying `Synthesizer.tts(text, speaker_name, language_name, speaker_wav, split_sentences)` API bypasses model-catalog assumptions. Commit `74f1527` switches to that method; commit `07a358c` adds dependency-free mock regression tests for reference-based and named-speaker invocation. Full synthesis rerun is pending.
- The temporary synthetic speaker reference is an engineering diagnostic, **not** a reproducible human voice. Do not mark real inference, Pashto cleaner fidelity, pronunciation, speaker selection, compression, or browser portability as passed based on this result.

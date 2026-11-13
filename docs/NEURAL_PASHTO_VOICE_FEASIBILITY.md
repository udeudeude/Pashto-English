# Pashto neural voice feasibility review (2026-11-12)

**Status:** research and a tested fallback interface, **not** a working neural Pashto model. The live voice remains local eSpeak NG. No model checkpoint was downloaded, converted or benchmarked on an iPhone in this milestone. Do not claim improved pronunciation from this change.

## Candidate comparison

| Candidate | Verified published facts | Licensing / deployment | Decision |
| --- | --- | --- | --- |
| [Pashto Ghag YourTTS](https://huggingface.co/Nasimbahar/pashto-ghag-yourtts) | Pashto-specific, 11 speakers, 44.148 h training material; 22,050 Hz; Coqui YourTTS/VITS-style PyTorch checkpoint `best_model.pth` plus speaker encoder and configuration; model card declares Apache 2.0. | Inference helper uses Python Coqui TTS. **No verified ONNX/browser export**; speaker embedding and text-cleaner dependencies must be ported. Check original recording licenses independently of model card. | First conversion investigation. Do not bundle until full graph and license are verified. |
| [Mangal Paktika VITS2](https://github.com/Hussainm10/Pashto-Text-to-Speech) | MB-iSTFT-VITS2; regional single-speaker accent; 458 MB published model; GPU-oriented instructions. | Repository states MIT for code but **weights/audio only for research and educational use**. No validated browser runtime. Reported 98% word accuracy is author-reported. | Do not ship weights without explicit redistribution permission; large for older phones. |
| [Meta MMS speech](https://huggingface.co/facebook/mms-tts) | 1,107-language VITS collection; published Pashto coverage lists `pus`. | CC BY-NC 4.0; verify exact Pashto generator artifact and tokenizer before attempting conversion. Noncommercial restriction matters for redistribution. | Secondary research candidate; verify artifact and legal scope first. |
| [Kokoro 82M](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) | English supported; existing ONNX exports and Apache 2.0 weights. | Not a Pashto model. English browser voices already exist without large downloads. | Optional English comparison, not a Pashto replacement. |
| Bundled eSpeak NG | Already integrated, local, experimental Pashto voice, waveform and browser checks exist. | GPL-3.0-or-later, attribution in `vendor/pashto-voice/SOURCE.txt`. | **Keep as default and fallback**. |

## Actual conversion barriers and proposed experiment

1. **Reproduce inference outside the browser.** Pin Pashto Ghag revision and Python/Coqui dependencies; generate a few consent-free public demonstration phrases using built-in speaker identities, not uploaded private voices. Record input and output samples, inference latency and peak memory.
2. **Map the full inference graph.** Determine whether the speaker encoder can be bypassed by using a built-in speaker ID or cached embeddings; inspect text normalization and symbol mapping; identify any custom Python operators and dynamic sequence-length behavior. A `.pth` file is **not** a browser-ready ONNX model.
3. **Export in stages.** First export and validate the text encoder, flow/duration and waveform generator with PyTorch and ONNX Runtime on a desktop, comparing output dimensions and non-silence. If export requires unsupported operations, document them rather than publishing a nonfunctional model.
4. **Measure phone feasibility.** Test quantized ONNX Runtime Web with WebAssembly on mobile WebKit, not WebGPU-only. Report model and auxiliary file sizes, peak resident memory, initial download, time to first audio, real-time factor, and cancellation. Prefer a Web Worker and lazy loading. A model that crashes or exhausts memory must not be selected.
5. **License and privacy gate.** Verify all weights, tokenizer files, text normalization dependencies, speaker data and redistribution permissions. No third-party synthesis endpoint should receive user conversations without explicit informed consent.
6. **Integrate only after success.** Use `lib/voice-fallback.mjs` to invoke an optional tested neural adapter and fall back to local eSpeak when initialization or synthesis fails. The adapter must return `{played:true}` only after audible playback actually starts; honor `isCurrent` to suppress stale fallback after cancellation. Maintain the existing bilingual, nonreading interface and playback-speed behavior.

## Safe incremental improvements made here

- `normalizeSpeechText` applies Unicode NFC, trims and collapses whitespace **only**. It does not invent pronunciation rules, remove diacritics, or substitute letters.
- Existing Pashto synthesis calls this normalization lazily. The new optional-voice fallback utility is independently tested but **no neural voice is registered yet**.
- Tests cover preservation of Pashto characters, fallback after neural failure, and cancellation without late speech. These are software checks, **not** Pashto intelligibility measurements.

## Research limitations

We have not confirmed the exact download sizes of all Ghag components, successful ONNX conversion, inference speed on older iPhones, or acoustic naturalness. The VITS2 author's reported listening accuracy is not independent evidence. Do not depend on recruiting Pashto speakers; use licensed reference recordings and reproducible measurements where available, recording unresolved phonetic questions explicitly.

## Next implementable milestone

Run a desktop proof of concept for the **Pashto Ghag** checkpoint, then a small, reproducible ONNX export experiment with pinned dependencies. Keep large weights out of the GitHub Pages repository until browser inference is demonstrated. Preserve all working eSpeak playback.

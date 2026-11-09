# Speech technology evaluation (November 2026)

This note captures technical leads, **not verified end-to-end components**. Free software is not the same as a free hosted service, and named language support does not establish intelligible output.

## Current app

- English speech recognition: `SpeechRecognition` browser service (browser/provider dependent).
- Pashto speech recognition: experimental `onnx-community/whisper-tiny` using Transformers.js, loaded **only on demand**. No dialect-specific benchmark or real-phone latency measurement yet.
- Translation: MyMemory free-tier endpoint. Rate limits and occasional invalid responses are known.
- English output: browser `SpeechSynthesis`.
- Pashto output: **not implemented** unless the device coincidentally offers a compatible voice; a fully spoken translation is therefore **not achieved**.

## Most promising free Pashto speech output

1. **eSpeak NG development branch** includes a Pashto voice `ps` in the 1.53.0 changelog. Source: https://github.com/espeak-ng/espeak-ng/blob/master/ChangeLog.md . This is an important change: older browser ports may contain **pre-1.53 builds without Pashto**. Verify the precise compiled version and that a voice/dictionary for `ps` is present before integrating.
2. **Spellophone** (https://spellophone.spellingcreator.org/guide/browser) packages eSpeak NG as WebAssembly with a browser API and on-demand dictionary downloads. Its own pinned source revision and availability of Pashto must be inspected; **do not assume the npm build has the voice**. Also review the GPL-3.0-or-later licensing obligations.
3. **Pashto Ghag** (https://huggingface.co/Nasimbahar/pashto-ghag-yourtts) is Apache-2.0, about 44 hours / 11 speakers of source recordings, but a neural voice model may be too demanding for unassisted mobile browser processing. Benchmark computational and deployment cost.
4. Meta MMS-TTS includes Pashto but has restrictive license conditions, which must be evaluated before public deployment.

## Suggested testing sequence

1. Confirm the exact tool release includes the Pashto dictionary and voice.
2. Produce *real audible files* for a small written Pashto test corpus, including common classroom vocabulary, names, questions, negation, numerals, and dialect variation.
3. Have fluent Afghan Pashto speakers evaluate intelligibility and pronunciation before integrating into the app.
4. Test iPhone Safari and Android Chrome performance, memory, browser audio playback restrictions, and resource downloads.
5. Only then connect it to the English-to-Pashto translation path, with explicit error messages when speech output cannot play.

## Reliability gates

The two independent speech directions need separate scores for recognition accuracy, translation accuracy, and synthesis intelligibility. Use human-reviewed reference utterances, not agreement between automated translation services. Reject unsupported-language and bracketed placeholders such as `[Spanish]`. Never tell users a translation is ready for listening unless the audio can actually be played.

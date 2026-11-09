# Pashto-English: current engineering handoff

Updated: 2026-11-09

## Start here

- Production repository: https://github.com/udeudeude/Pashto-English
- Published site: https://udeudeude.github.io/Pashto-English/
- Production branch: `main`
- **Last completed development branch:** `fix/shared-translation-and-self-test` (merged into `main`)
- **Most recent merged pull request:** https://github.com/udeudeude/Pashto-English/pull/3

Future ChatGPT Work and Chat sessions should check the latest branch, open pull requests, test results and this file **before doing new work**. Do not repeat implemented features. PR #3 was merged after green checks; review newly opened PRs before starting work.

## Work completed and merged in pull request #3

1. Unified English and Pashto recognized text, translation presentation, status handling, and Replay under `window.pashtoApp` in `index.html`. Previously, the Pashto recorder separately overwrote the Replay handler.
2. Added a bilingual **Try without another speaker** practice panel. The English-speaking teacher can test real English-to-Pashto and Pashto-to-English translation and synthesized output using four sample sentences without a microphone or Pashto partner. These are test phrases, **not verified translations**.
3. Cleared stale Replay state on new requests/failures. Out-of-order translations cannot overwrite the newer conversation. Translation network requests time out; invalid placeholders and obvious incorrect writing systems are rejected.
4. Improved experimental Pashto recording: permission and recording errors, microphone cleanup, duration/empty recording checks, and single shared translation pipeline.
5. Prevented queued Pashto synthesis from speaking an earlier sentence after the user starts another one.
6. Fixed the previously missing `picture-column` class so the entire left illustration column receives its intended layout. Added bilingual labels to the picture column's empty state and accessible controls.
7. Refused to show pictures from a transcript when there was no valid translation.
8. Added regression tests for self-tests, replay safety, out-of-order responses, bilingual layout, and failure pictograms.
9. Created a text-only word/character error-rate scorer for Pashto recognition, with unit tests; documented four public transcribed speech corpus candidates in `docs/PASHTO_RECOGNITION_EVALUATION.md`.

**Verification:** At PR #3 head `2b340ac8…`, GitHub Actions passed **22 mobile browser tests** across Chromium and WebKit, **4 transcript-scoring unit tests**, and the bundled Pashto waveform synthesis test. Merged to main at commit `c4698665cd145612925af139b74571587619bc6f`. Real-device and native-speaker checks are still outstanding.

## Existing verified implementation on main (PR #1 and PR #2)

- One phone-first HTML interface with bilingual main controls.
- Left-hand picture vocabulary with rejection and alternatives. Browser-simulated gestures and explicit buttons were tested; physical iPhone touch behavior remains unverified.
- Bundled eSpeak NG 1.53-development Pashto WebAssembly speech engine at `vendor/pashto-voice/`.
- eSpeak generated non-silent audio, which was played successfully in automated mobile-sized WebKit and Chromium tests.
- Experimental browser Whisper tiny Pashto speech recognition, imported only when needed. **Not benchmarked against actual Afghan speech.**
- Translation via free-tier MyMemory. It may be limited, inaccurate or unavailable.

## Most important remaining work without an available native speaker

1. **Benchmark Pashto recognition** with licensed, transcribed Pashto speech. Use `docs/PASHTO_RECOGNITION_EVALUATION.md` and `node scripts/score-transcripts.mjs local-hypotheses.jsonl`. Keep audio, speaker metadata and actual personal conversations out of the repository. Report the source, sample size, word/character error rates and device limitations.
2. Test on an actual iPhone and Android phone. The automated browser runs are not physical device tests. Verify touching reject, long press, permission prompts, microphone recording, synthesized playback and download size.
3. Evaluate more accurate free, sustainable English↔Pashto text translation. Keep rejected strings, placeholders and rate limits explicitly visible; do not disguise failures as successful speech.
4. Improve context-sensitive concept pictures, appropriate attribution and bilingual fixed labels without inventing Pashto translations.
5. Add safe diagnostic reporting that does not publish private conversation content.
6. Prepare human voice/translation evaluation material for a future fluent Pashto reviewer.

## What still requires a fluent Pashto speaker

- Intelligibility and naturalness of eSpeak output, including dialectal variants and numbers.
- Meaning, tone and context of English↔Pashto translations.
- In-real-world Pashto recognition on varied accents, dialects and noisy classrooms.

**Do not claim that automated tests or back-translation can replace human language review.**

## Handoff discipline

Keep work in a separate topic branch and open a pull request promptly. Push after every useful change. Record failed experiments as well as successful ones. Update this file at the end of each substantial session; explicitly state whether the pull request was merged and which tests passed. Never leave useful work only in an unpushed local workspace.

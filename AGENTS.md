# Engineering handoff: Pashto ↔ English

This file is for future ChatGPT Work sessions and other contributors. **Read it before changing code.**

## Product contract

The goal is a **free iPhone/Android spoken Pashto ↔ English communication aid** for Afghan Pashto speakers who may not read or write. No literacy, typing, payment card, or account should be required of the Pashto-speaking participant. The phone-only route is preferred; an optional computer-assisted fallback may be acceptable. Do not claim interpreter-level reliability without fluent-speaker evaluation.

All fixed interface text must be in English **and** Pashto. Pashto is written right-to-left. Transcripts and translations are inherently language-specific and should retain their natural script and direction.

The left picture column displays concepts in the order of their **English** occurrence, top to bottom. Pictures are suggestions, not verified meanings. Never substitute a guessed icon for a crucial phrase or silently alter a translation based on an image choice. Avoid ambiguous substitutions, such as a peanut for a cashew or a filing cabinet for a shelf.

## Current architecture and known limitations

- `index.html` contains the main interface, English browser recognition, text translation, and playback.
- `visual-vocabulary.js` creates the picture column. `lib/visual-language.mjs` extends the curated English concepts, filters grammar words, handles inflections and seeks real pictures for otherwise unrecognized meaning-bearing terms. Neither is a full linguistic parser, and more images do not automatically imply semantic correctness.
- `stability.js` places reject/undo and alternatives controls on the word-caption line, with optional swipe/hold gestures. `stability.css` contains its styles. `picture-catalog.js` is the shared provider for real ARASAAC and Iconify images in the main column **and** all picker categories. Emoji are fallbacks, not preferred illustrations. These files must load independently of remote speech-model libraries.
- `pashto-recognition.js` records bounded short utterances, checks decoded audio and delegates Whisper to `pashto-recognition-worker.js` through `lib/recognition-client.mjs`. The worker loads lazily, is terminated on failures/cancellation/timeouts, and is reused after success. Actual model download/inference passed Chromium/WebKit tests; accuracy and runtime on physical phones **remain unverified**. See `docs/RECOGNITION_RUNTIME.md`.
- Pashto speech synthesis: **experimental self-hosted eSpeak NG build** in `vendor/pashto-voice/` merged in pull request #2 and deployed from `main`. **Automated** mobile-sized WebKit/Chromium and Node waveform checks passed. Physical phone testing, speaker intelligibility evaluation, and translation quality remain unverified.
- The public MyMemory text translation endpoint has usage limits and unreliable outputs. It must not be represented as free unlimited reliable translation.
- Earlier unused files (`touch-controls.js`, `bilingual-interface.js`, `picture-corrections.js`, `noun-icons.js`) are **legacy**. Do not reactivate them or introduce overlapping control systems.

## Development rules

1. Inspect **main**, branches, existing pull requests, recent commits, and current test results at the start of every session.
2. Create a **new topic branch**, open a pull request, and merge only after checking tests and concurrent changes. Never force-push, overwrite another branch, or work around a failed check without explanation.
3. Keep the GitHub Pages production site on `main`. Branch changes are *not* live until merged/deployed.
4. Run `npm install`, `npm run check`, `npm run test:recognition`, and `npm test`. CI runs Android-sized Chromium and iPhone-sized WebKit tests. Browser emulation is not physical device testing.
5. For visual defects, reproduce on a phone-size viewport and inspect console errors, loaded images, touch behavior, and screenshot. Test the exact/related/similar-sound categories and inspect broken image requests. Do not repeatedly claim untested fixes work.
6. Do not make remote network/model imports a prerequisite for rendering the core interface.
7. Use and credit existing appropriately licensed icons and pictograms. **Never generate or modify images** unless the user explicitly asks for image creation or editing.
8. No secrets, paid services, private recordings, or uploaded identifying conversation data in the repository. Public speech corpora may prohibit redistribution even if labeled CC0.
9. Avoid unnecessary initialisms or abbreviations in user-facing labels.
10. Keep test cases for every corrected regression, especially touch-selection, missing controls, missing Pashto text, and false-success translations.

## Source-quality and safety

Treat transcription, translation, and output voice as **separate validated stages**. Distinguish unsupported capability from an error and from a successful result. Handle nonsense placeholder responses such as `[Spanish]` as failures. Do not pass confidential or medical conversations to free online services. Ask fluent Afghan Pashto speakers to verify both translation and pronunciation with diverse dialects.

## Next priorities

1. Verify picture controls on a *physical* iPhone Safari and Android Chrome, not just WebKit/Chromium automation.
2. Verify the existing bundled Pashto speech engine on a physical iPhone and Android phone and evaluate pronunciation with fluent speakers; do not repeat the completed WebAssembly port.
3. Measure Pashto speech recognition with legitimately acquired transcribed Afghan speech using `docs/PASHTO_RECOGNITION_EVALUATION.md` and `scripts/score-transcripts.mjs`; record phone memory, download size and latency.
4. Evaluate translation accuracy, rate limits, privacy, and a sustainable free implementation.
5. Improve semantic pictogram choice and sentence-level alignment, respecting source licenses.
6. Expand the bilingual translation review process.

## Handoff expectation

At the end of each working session, record which branch and pull request were changed, which tests ran, whether changes reached `main`, and which core capabilities remain unverified. Do not say the app is finished until spoken Pashto works in both directions.

## Runtime source-provider and microphone policy

Picture selection must search **all** available compatible image sources, not force a provider chooser. ARASAAC and Iconify provider responses must be identifiable, with errors visible; include actual network image-decoding smoke tests in addition to mocks. Stop all live browser speech recognition and microphone streams immediately when a page becomes hidden or unloaded; invalidate delayed results. Never knowingly leave a microphone recording in the background.

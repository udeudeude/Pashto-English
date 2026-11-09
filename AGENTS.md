# Engineering handoff: Pashto ↔ English

This file is for future ChatGPT Work sessions and other contributors. **Read it before changing code.**

## Product contract

The goal is a **free iPhone/Android spoken Pashto ↔ English communication aid** for Afghan Pashto speakers who may not read or write. No literacy, typing, payment card, or account should be required of the Pashto-speaking participant. The phone-only route is preferred; an optional computer-assisted fallback may be acceptable. Do not claim interpreter-level reliability without fluent-speaker evaluation.

All fixed interface text must be in English **and** Pashto. Pashto is written right-to-left. Transcripts and translations are inherently language-specific and should retain their natural script and direction.

The left picture column displays concepts in the order of their **English** occurrence, top to bottom. Pictures are suggestions, not verified meanings. Never substitute a guessed icon for a crucial phrase or silently alter a translation based on an image choice. Avoid ambiguous substitutions, such as a peanut for a cashew or a filing cabinet for a shelf.

## Current architecture and known limitations

- `index.html` contains the main interface, English browser recognition, text translation, and playback.
- `visual-vocabulary.js` creates the picture column. It is a limited English lexicon, not a full parser.
- `stability.js` provides visible reject/alternatives buttons and optional swipe/hold gestures. `stability.css` contains its styles. It must load independently of any remote speech-model library.
- `pashto-recognition.js` experimentally loads Whisper on demand. Accuracy and runtime on phones **remain unverified**.
- Pashto speech synthesis is **not implemented**. A browser voice is not a substitute for a real Pashto synthesis engine.
- The public MyMemory text translation endpoint has usage limits and unreliable outputs. It must not be represented as free unlimited reliable translation.
- Earlier unused files (`touch-controls.js`, `bilingual-interface.js`, `picture-corrections.js`, `noun-icons.js`) are **legacy**. Do not reactivate them or introduce overlapping control systems.

## Development rules

1. Inspect **main**, branches, existing pull requests, recent commits, and current test results at the start of every session.
2. Create a **new topic branch**, open a pull request, and merge only after checking tests and concurrent changes. Never force-push, overwrite another branch, or work around a failed check without explanation.
3. Keep the GitHub Pages production site on `main`. Branch changes are *not* live until merged/deployed.
4. Run `npm install`, `npm run check`, and `npm test`. CI runs Android-sized Chromium and iPhone-sized WebKit tests. Browser emulation is not physical device testing.
5. For visual defects, reproduce on a phone-size viewport and inspect console errors, loaded assets, touch behavior, and screenshot. Do not repeatedly claim untested fixes work.
6. Do not make remote network/model imports a prerequisite for rendering the core interface.
7. Use and credit existing appropriately licensed icons and pictograms. **Never generate or modify images** unless the user explicitly asks for image creation or editing.
8. No secrets, paid services, private recordings, or uploaded identifying conversation data in the repository.
9. Avoid unnecessary initialisms or abbreviations in user-facing labels.
10. Keep test cases for every corrected regression, especially touch-selection, missing controls, missing Pashto text, and false-success translations.

## Source-quality and safety

Treat transcription, translation, and output voice as **separate validated stages**. Distinguish unsupported capability from an error and from a successful result. Handle nonsense placeholder responses such as `[Spanish]` as failures. Do not pass confidential or medical conversations to free online services. Ask fluent Afghan Pashto speakers to verify both translation and pronunciation with diverse dialects.

## Next priorities

1. Verify picture controls on a *physical* iPhone Safari and Android Chrome, not just WebKit/Chromium automation.
2. Bring working, audible Pashto speech synthesis to the phone. Investigate the Pashto voice in eSpeak NG 1.53 and browser/WebAssembly ports, plus licensed neural alternatives, and verify quality with speakers.
3. Measure Pashto speech recognition using real recorded Afghan speech and on-device memory/latency.
4. Evaluate translation accuracy, rate limits, privacy, and a sustainable free implementation.
5. Improve semantic pictogram choice and sentence-level alignment, respecting source licenses.
6. Expand the bilingual translation review process.

## Handoff expectation

At the end of each working session, record which branch and pull request were changed, which tests ran, whether changes reached `main`, and which core capabilities remain unverified. Do not say the app is finished until spoken Pashto works in both directions.

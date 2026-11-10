# Pashto-English: current engineering handoff

Updated: 2026-11-09

## Picture usability follow-up: pull request #6 (merged)

Development branch: `fix/scroll-undo-compact-picture-controls` (merged into `main`)
Merged pull request: https://github.com/udeudeude/Pashto-English/pull/6
Squash merge commit: `90dbb61491b46e9379478f9c434ea9c83b217b1d`

An iPhone user identified three practical issues: pictograms below the bottom of the viewport could not be reached; a rejected picture could not be restored; and two large controls underneath every pictogram wasted vertical space.

Implementation:
- Make the left picture rail independently vertically scrollable using a viewport-height cap, `overflow-y:auto`, momentum scrolling, `overscroll-behavior`, and `touch-action:pan-y`.
- Remove `preventDefault()` from card touch listeners so iPhone Safari can perform native vertical panning. Preserve long-press alternatives; reserve diagonal rejection for clearly nonvertical strokes.
- Rejection now toggles between a gray, crossed-out picture and a restored picture via an ×/↶ button. Preserve this state across visual redraws of the same sentence and clear it for a new sentence.
- Move both controls into the picture card corners, reducing visible glyph size without reducing finger-sized interactive regions.
- Add automated WebKit/Chromium tests for scrollable picture overflow, restoration, persistence after redraw, compact card geometry and vertical-versus-diagonal touch behavior.

**Verified and merged:** Pull request #6 passed **42 Playwright mobile browser tests** (WebKit and Chromium), all JavaScript and unit checks, and separate non-silent Pashto waveform generation. The initial browser jobs stalled while downloading system/browser dependencies. We replaced that step with a version-matched official Playwright image (`mcr.microsoft.com/playwright:v1.65.0-noble`), which passed and makes subsequent testing more reliable. Real iPhone Safari touch scrolling remains to be checked on a physical phone: browser tests cover layout and synthetic gesture classification, not the real finger-pan compositor.

## Start here

- Production repository: https://github.com/udeudeude/Pashto-English
- Published site: https://udeudeude.github.io/Pashto-English/
- Production branch: `main`
- **Last completed development branch:** `fix/shared-translation-and-self-test` (merged into `main`)
- **Most recent merged pull request:** https://github.com/udeudeude/Pashto-English/pull/3
- **Latest merged image fix:** https://github.com/udeudeude/Pashto-English/pull/4, branch `fix/real-picture-alternatives` (merged into `main`).
- **Latest merged usability fix:** https://github.com/udeudeude/Pashto-English/pull/6, branch `fix/scroll-undo-compact-picture-controls`, merged into `main` at `90dbb61491b46e9379478f9c434ea9c83b217b1d`.

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

## Picture fix completed (pull request #4, merged into `main`)

A November 9 iPhone screenshot showed that the picker offered only emoji. Source inspection confirmed that `stability.js` hard-coded emoji for all related and similar-sounding suggestions; `visual-vocabulary.js` also suppressed primary picture searches for `shelf` and `cashew`. The new `picture-catalog.js` searches existing ARASAAC pictograms and Iconify icons for all categories. It supplies immediate known shelving icons, lets network images load asynchronously, deduplicates repeated images, filters mislabeled search results, and retains emoji only as a last resort. Selecting a related image leaves the translation word untouched but visibly identifies the illustrated concept. Pictogram author and license notices are in Compatibility and privacy.

Pull request #4 adds browser regression tests using mocked source endpoints. **Verified:** 26 Playwright mobile tests passed across iPhone-sized WebKit and Android-sized Chromium, including tests that real image elements appear in all three picker categories, and that a cashew is not silently represented by a peanut. Pashto waveform tests also passed. These browser tests mock external image endpoints and do not prove public providers will respond on a physical iPhone. Inspect the live iPhone site and confirm the bookshelf appears as a real pictogram rather than an emoji. The app needs a better way to evaluate and retain semantic correctness of pictures; a successful image load is not proof of a good semantic match.

Do not create or edit graphics to solve this; use existing appropriately licensed image resources.

## Completed and merged improvement: PR #5

A user iPhone screenshot revealed substantial omissions from the vertical picture column and a page heading that wrapped English and Pashto into the same broken line. PR #5:

1. Renders English and Pashto app titles on separate explicit lines using proper writing direction.
2. Adds 200+ more curated meaningful English concepts and inflections in `lib/visual-language.mjs`.
3. Looks up formerly unseen meaning-bearing words with ARASAAC and Iconify; cards for unknown words only appear after a genuinely matching pictogram loads. Existing known words retain their fallback symbols.
4. Preserves the original English concept order and avoids fabricating pictures for primarily grammatical words.
5. Includes Node and Playwright regression tests for title layout, word order, expansion, on-demand images, and not confusing a cashew with a peanut.
6. Replaces large raw Pashto WebAssembly failure messages with concise English/Pashto error messages. **This does not resolve the underlying WebAssembly backend failure.**

**Verification:** GitHub Actions passed **34 mobile Chromium/WebKit browser tests**, all added visual-language and recognition-error unit tests, and Pashto waveform generation on PR #5, head `3ae050062480230382d8286c2867a37f403377bf`. All changes were merged on November 9, 2026 (New York time). GitHub Pages deployment and real iPhone testing should be checked; the bilingual title should occupy exactly two lines and more meaning-bearing words should gain real pictograms when providers return them. The underlying Pashto recognition WebAssembly startup failure remains unresolved; only the error display was improved.

## Latest resources/share addition: pull request #7

Pull request https://github.com/udeudeude/Pashto-English/pull/7 adds a visible bilingual section at the **bottom** of the app (above the existing footer), with actual homepage screenshot previews linking to the University of Chicago's Heston Pashto–English audio dictionary and Parsemus Foundation's free English lessons for Pashto speakers. Underneath, it adds a scannable static SVG QR encoding the **exact** public URL `https://udeudeude.github.io/Pashto-English/`.

The screenshots are built with headless Chromium at 1200x720 and stored in `assets/resources/`; a separately generated, locally hosted SVG QR avoids third-party QR providers. Files were captured by GitHub Actions from the actual sites, with page-text checks. Test coverage includes file integrity, canonical URL generation, both links, screenshot loading, QR loading, bilingual labels and bottom placement. Do not claim deployment until pull request is merged and GitHub Pages completes its workflow.

If a screenshot later becomes stale because the external site's design changes, re-run the capture script on a reviewed development branch and verify the screenshot still depicts the intended live page. Do not create synthetic homepage illustrations.

# Pashto ↔ English

A free, phone-first, voice-to-voice translation project for English speakers communicating with Pashto-speaking adults who cannot read or write.

## Current status

**Experimental prototype, not a validated interpreter.** The static site includes two large microphone buttons, automatic speech recognition, translation, playback, replay, and capability reporting. The Pashto-speaking participant is not expected to read, type, or operate text controls.

### Try it

The production site is deployed from the main branch:

https://udeudeude.github.io/Pashto-English/

GitHub Pages deployment from **main** is already configured. New topic-branch commits are not visible on the production site until merged.

### Current implementation and limitations

- Uses browser SpeechRecognition (or webkitSpeechRecognition). Language support is browser/provider-dependent; `ps-AF` is requested but Pashto recognition is **not verified**.
- Uses the public MyMemory text translation endpoint. This is free within its service limits, **not unlimited**, and Pashto translation quality is unverified.
- English audio uses browser speech synthesis. An **experimental locally bundled Pashto speech engine** was merged in pull request #2. It has passed automated waveform generation, Chromium and WebKit playback tests. Physical iPhone and Android testing and fluent-speaker intelligibility evaluation are still required. The Pashto voice is GPL-3.0-or-later.
- English recognition and speech may work on supported browsers. iPhone Safari and Android Chrome need actual device tests.
- Speech and recognized text may be sent to browser and translation providers. No transcripts are intentionally persisted by this site.
- **Do not use for confidential, legal, medical, emergency, or high-stakes conversations.**

## Product requirements

1. Free to use; no payment method or account required.
2. Operates on iPhone and Android without an always-on home computer if feasible.
3. Spoken Pashto → spoken English and spoken English → spoken Pashto.
4. Pashto speaker never needs to read, write, or type.
5. Explicit failure states, easy replay, privacy-conscious defaults.
6. Validate recognition, translation, and speech quality with fluent Afghan Pashto speakers before presenting as reliable.

## Next engineering milestones

1. Benchmark Pashto speech recognition using legitimately acquired, transcribed Afghan Pashto recordings and real phones; see [evaluation guide](docs/PASHTO_RECOGNITION_EVALUATION.md).
2. Evaluate the existing offline-capable Pashto voice with fluent speakers, including dialect differences and numbers.
3. Evaluate more accurate and sustainable free Pashto–English translation against bilingual references.
4. Verify iPhone and Android microphone and touch behavior on physical devices.
5. Continue automated regression testing and realistic performance measurements.

## Development

This is a static web app. Open `index.html` through a local development server or GitHub Pages over HTTPS. Microphone permissions require a secure context. No build dependencies are needed for the prototype.

## Development workflow

Read [AGENTS.md](AGENTS.md) before working on the repository.

1. Work on a separate topic branch.
2. Run `npm install`, `npm run check`, and `npm test` (browser tests).
3. Open a pull request and inspect the automated results.
4. Merge verified changes to `main` to update GitHub Pages.
5. Verify on a real iPhone and Android phone before declaring touchscreen or speech functionality fixed.

The test suite exercises Chromium with an Android layout and WebKit with an iPhone layout. It does **not** prove on-device speech recognition, intelligible Pashto output, or real iPhone Safari touch handling. Those require additional physical-device and fluent-speaker testing.

The original `touch-controls.js`, `bilingual-interface.js`, and `picture-corrections.js` modules were replaced after problems on iPhone. They remain as legacy source files but are not loaded by the app. Do not reintroduce them.

### Experimental Pashto voice

The browser downloads GPL-licensed, locally hosted eSpeak NG engine and Pashto dictionary files on first use, then synthesizes translated Pashto text on the phone. It does **not** require a built-in Pashto system voice or an account. Expand **Compatibility and privacy** and tap **Test Pashto voice** to check audible output. Generated speech may sound robotic or contain errors, particularly with numbers; do not use without a fluent-speaker check. The voice source, license, and build provenance are in [`vendor/pashto-voice/`](vendor/pashto-voice/). Source build: eSpeak NG commit `688cb603...`; Spellophone commit `f6dc436c...`. The translation provider still receives recognized text.

Automated verification: **10 browser tests passed** (mobile-sized WebKit and Chromium), plus a separate Node 24 waveform-generation test. These do not establish on-device intelligibility or dependable translation.

## Test without a Pashto speaker

Open **Try without another speaker / د بل ویونکي پرته ازموینه**. Four example buttons exercise the actual public translation service and synthesized output, without a microphone. They support English-to-Pashto and Pashto-to-English. This is intended for the English-speaking teacher or developer; the Pashto-speaking participant does not need to read or type. These tests prove only that the mechanisms operate, **not** that the translations are linguistically correct.

The app shares one translation and replay controller for both directions, clears stale translations after failures, validates obvious service placeholders, and avoids displaying vocabulary illustrations as if a failed translation were successful.

For reproducible evaluation using publicly licensed transcribed Pashto recordings, consult [Pashto recognition evaluation](docs/PASHTO_RECOGNITION_EVALUATION.md). Do not redistribute audio or identifiable speaker data.

## Picture sources and licenses

The application prefers existing, labeled images from ARASAAC and Iconify rather than generated illustrations. The shared `picture-catalog.js` searches both providers for the vertical picture column and the picker. ARASAAC pictures are selected only when the provider's English keywords match the requested concept. Related and similar-sounding word choices are labeled as separate concepts, not silently substituted for the original words.

ARASAAC pictograms are created by **Sergio Palao**, owned by the **Government of Aragón**, and distributed under **Creative Commons Attribution–NonCommercial–ShareAlike**. Their terms require the author, government, origin, and license to be credited and exclude commercial uses: https://arasaac.org/terms-of-use . The website is intended as a free educational tool.

Iconify hosts existing icon collections; **each icon collection has its own license**, rather than sharing one Iconify-wide license: https://iconify.design/docs/icons/icon-set-basics.html . For example, Material Design Icons (including the verified bookshelf and library-shelves icons) are distributed under Apache 2.0.

If external image searches are unavailable, the interface retains simplified symbols, but does not intentionally illustrate *cashew* using a peanut or *shelf* using a stack of books. Existing images are suggestions until their contextual appropriateness has been checked.

## Picture coverage and title layout (November 2026)

The application shows its English name and Pashto name on **two separate lines** at phone widths. Visual concepts are in English sentence order. A larger catalog of over 200 additional common nouns, verbs, adjectives, time words, classroom and household concepts is maintained in `lib/visual-language.mjs`.

Words not in the curated catalog are not silently discarded: the app searches ARASAAC and Iconify for pictures labeled with the English term, and adds a card only if an image actually loads. It does not invent images or depict a different concept without labeling the difference. Grammar words such as *the*, *you*, and auxiliary *have* ordinarily do not get separate images, because an isolated illustration would be misleading. Compound concepts such as *thank you* and *bus stop* are treated as a phrase when possible.

The public image sources depend on connectivity and licenses. Missing online pictograms are not evidence that a word was missing from the speech transcript.

The iPhone screenshot in November 2026 also exposed a separate **Pashto speech recognition WebAssembly startup error**. Its interface wording is now concise and bilingual, but the backend failure itself has not yet been resolved. The experimental speech recognizer must still be tested on real devices.

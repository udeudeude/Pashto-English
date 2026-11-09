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
- Uses browser SpeechSynthesis for spoken output. A usable Pashto voice is **not generally installed** on phones; the app explicitly reports when one is missing.
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

1. Benchmark Pashto speech recognition on real iPhone and Android devices.
2. Evaluate deployable open Pashto speech synthesis models and their licenses, size, and phone performance.
3. Evaluate free or locally hosted Pashto–English translation models against real classroom utterances.
4. Replace unreliable browser-dependent components with verified alternatives.
5. Add automated tests, performance measurements, and clear offline/online status.

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

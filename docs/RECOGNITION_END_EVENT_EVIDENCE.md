# English recognition ending without a result: evidence

Date: November 17, 2026. Branch: `fix/english-recognition-unexpected-end`. Stacked pull request: [#35](https://github.com/udeudeude/Pashto-English/pull/35), based on concurrent translation-cancellation [#32](https://github.com/udeudeude/Pashto-English/pull/32), **not** production `main`.

## Failure and bounded correction

When the non-Apple browser speech recognizer fires `onend` without having delivered an `onresult`, the previous application stopped the recognizer and reset its microphone button but **left the screen saying Listening**. The phone had stopped listening. The [Web Speech specification](https://webaudio.github.io/web-speech-api/) requires an `end` event when a recognition session disconnects and does not make that event equivalent to a recognized transcript; [MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/end_event) describes it as disconnection.

The fix retains the existing hard microphone privacy deadline and stream supervisor, and treats a genuine, unhandled empty `onend` as a failure: it unregisters/stops the recognizer, explicitly reports an English/Pashto retry instruction, clears the success state and leaves the button available for a new attempt. An already completed or explicitly cancelled session cannot turn into this error because `stopBrowserRecognition` detaches event handlers and the callback checks the current recognizer.

**Scope:** Browser Web Speech path for English on non-Apple devices. On iPhone/iPad, English remains on the owned short-recording plus local recognition route; no native Safari Web Speech is re-enabled. Pashto recording, translation results, sound synthesis, installed device voices, eSpeak fallback, cloud endpoint choice, and neural experiments are not changed.

## Exact automated evidence

- [GitHub Actions run 44110774448](https://github.com/udeudeude/Pashto-English/actions/runs/44110774448) at code/test commit [`398580db64ec36c8bf231a1a5c126147b764577d`](https://github.com/udeudeude/Pashto-English/commit/398580db64ec36c8bf231a1a5c126147b764577d): **both jobs completed successfully** on November 17, 2026.
- **94 of 94 executed browser tests passed**, with **10 intentional skips**, across emulated mobile Android Chromium and iPhone WebKit. Both added `onend` regression tests executed and passed on Android Chromium. Their iPhone WebKit variants correctly skipped because that path does not use browser speech recognition.
- The first added test injects a browser recognizer whose `onend` fires with no transcript, checks microphone reset and recognition abort, visible bilingual retry and error status, disabled Replay, null stale handlers, then starts a fresh recognizer successfully.
- The second injects a queued `onend` callback *after* a successful `onresult`, with mocked MyMemory output, and checks that the translated text and Replay remain available.
- All existing JavaScript syntax, worker, cultural/translation review, pronunciation-fallback, picture, and microphone checks in this workflow passed. The separate job generated actual non-silent bundled eSpeak Pashto audio successfully; **no pronunciation-quality inference** follows from waveform generation.

## Reproduce and limits

Run `npm install --no-audit --no-fund && npm run check && npm run test:recognition && npm test`. The two targeted tests live in `tests/mobile.spec.mjs`.

The browser recognizers and translation request in these two tests are **deterministic fakes**, not actual spoken inputs. No actual Android handset, physical iPhone, microphone permission dialog or meaningful speech recognition accuracy was tested in this change. This fix improves the correctness of visible status and retry on one failure path; it does **not** establish live spoken-translation reliability or validate Pashto intelligibility. Production `main` and the live site remain unchanged, pending explicit review and release decisions. There is no new downloaded model, user speech, recording, or secret in this change.

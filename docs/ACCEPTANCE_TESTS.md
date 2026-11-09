# Verification checklist

The application is an experimental aid, **not a reliable interpreter**. Do not deploy for medical, legal, emergency, or other high-stakes decisions.

## Required functional acceptance tests

- [ ] On iPhone Safari, record an Afghan Pashto sentence; receive accurate English text and spoken English.
- [ ] On Android Chrome, repeat the same Pashto test.
- [ ] On both phones, speak an English sentence; hear intelligible Pashto audio, without requiring a Pashto voice to be installed.
- [ ] Replay the Pashto output after the first playback.
- [ ] No Pashto speaker needs to read, write, type, or navigate text controls.
- [ ] Clearly distinguish recognition failure, translation failure, and unavailable Pashto audio.
- [ ] Confirm no accidental recording or retention of conversations.
- [ ] Validate with multiple fluent speakers and dialects before describing the app as dependable.

## Visual vocabulary tests

- [ ] "I need a ladder to reach the cashews in the jar on the shelf." shows items in the correct order.
- [ ] Do not show a peanut as a cashew or a filing cabinet as a shelf.
- [ ] Repeated concepts are repeated in the column.
- [ ] A new utterance clears old illustrations.
- [ ] Switching image sources preserves concept order.
- [ ] Broken network images degrade gracefully.
- [ ] Illustrations are never represented as precise translations.
- [ ] Verify ARASAAC attribution and noncommercial license requirements before redistribution.

## Architecture risks

The current browser speech synthesis cannot generally speak Pashto on iPhones. The experimental on-device Whisper recognition model has not been verified on iPhone or Android. The public translation service has quotas and may produce dangerous mistranslations. These are **release-blocking gaps** for the central voice-to-voice objective.

## Next engineering work

1. Identify and benchmark Pashto speech synthesis with a real deployable browser or free-hosted implementation.
2. Test recognition accuracy and model loading on both phone platforms.
3. Establish a small, reviewed corpus of Afghan Pashto-English utterances, including dialect variation.
4. Introduce user-confirmed correction and replay controls.
5. Expand visual concepts using curated, semantically validated pictograms, not unrestricted keyword guesses.

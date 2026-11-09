# Current handoff: Pashto-English

Updated: 2026-11-09

## Branch and review state

Most recent voice development branch: `feature/pashto-browser-voice` (merged into `main`)

Merged pull request: https://github.com/udeudeude/Pashto-English/pull/2

Production branch: `main`, voice integration merged from pull request #2 on 2026-11-09.

Do **not** assume the code in pull request #2 is deployed to the website until its checks pass and the pull request merges.

## Progress this session

- Evaluated eSpeak NG 1.53+ Pashto support and Spellophone, a GPL-3.0-or-later WebAssembly browser implementation.
- Implemented `pashto-voice.js` experimental, on-device Pashto synthesis, with explicit `ps` voice check, real audio samples, and mobile Web Audio playback.
- Wired the experimental voice into Pashto translations and Replay, removing reliance on installed system Pashto voices for that path.
- Added a bilingual voice-test button in Compatibility and privacy.
- Added automated voice-synthesis test using Node 24 and pinned Spellophone 0.2.1. **Test failed decisively:** package lacks `ps_dict`; published Spellophone 0.2.1 is built from eSpeak NG **1.52.0** (before Pashto was added), despite broad multilingual claims. No WAV was generated.
- Added a browser regression test ensuring Pashto speech playback calls the on-device voice provider.
- Added a GitHub Actions job to save experimental audio as a workflow artifact.

## Critical next checks

1. Track the new `.github/workflows/experimental-pashto-build.yml` job: it attempts a reproducible build of newer eSpeak NG (pinned commit `688cb60368d6e0998f3632af8d1c3c2ad4191fc2`) through Spellophone's build tooling and tests real Pashto waveform generation.
2. **Do not merge PR #2 while its published package cannot synthesize Pashto.** If newer engine builds and outputs a valid WAV, integrate the tested compiled assets or a properly packaged build; do not silently fall back to Persian.
3. Download the WAV audio artifact from the newer-engine workflow (only if generation succeeds) and have an Afghan Pashto speaker judge intelligibility. Document the result.
4. Test iPhone Safari and Android Chrome, particularly whether downloads, WebAssembly, Pashto dictionary, and audio-unlock work together. Browser emulation alone is insufficient.
5. If functional, merge PR #2, verify GitHub Pages deployment, then improve recognition and translation fidelity.

## Blocking issues

- The **Pashto transcription** path is still experimental Whisper; no real-device and dialect benchmark.
- Translation uses MyMemory, a third-party service with limits and possible errors.
- Pashto speech quality from eSpeak NG has not been evaluated by a fluent speaker and known upstream bugs affect numerals. Thus no safety-critical use.
- Browser audio playback may be blocked without a direct user gesture. The app primes audio on the English microphone button and has explicit Replay and Test Pashto voice controls.
- Spellophone is GPL-3.0-or-later; preserve notices and link to exact source. If self-hosting code, follow the licensing requirements.

## Prior work / test workflow

Refer to `AGENTS.md`, `docs/ACCEPTANCE_TESTS.md`, `docs/SPEECH_OPTIONS.md`, and `tests/mobile.spec.mjs`.

The app must remain free, bilingual in all fixed interface copy, phone-first, and independently verifiable. Never record fabricated testing outcomes. Work on topic branches and make frequent recoverable commits.

## November 9 audio synthesis breakthrough

The original Spellophone 0.2.1 fails due to missing ps dictionary (its eSpeak NG version was 1.52.0). A new continuous-integration job **successfully compiled eSpeak NG 1.53 development version** pinned to `688cb603...`, generating a non-silent WAV (46,194 samples, 22,050 Hz, peak 28,953) and listing four Pashto voices. The follow-up build packages matching JavaScript, WebAssembly and language dictionaries into `vendor/pashto-voice/`. Once the vendor-assets commit lands, verify browser tests and the local speech test. Human review still required.

## Bundled voice integration checkpoint

A newer eSpeak NG source build produced a **non-silent 2.1-second Pashto recording** in the GitHub Actions runner. The compiled engine and dictionaries were committed by the build action to `vendor/pashto-voice/` on pull request #2. The app now loads these local compiled assets instead of the older incompatible published package. Automated WebKit, Chromium, and Node tests are being expanded to verify the bundled output, and fluent-speaker pronunciation review is still missing. Do not claim end-to-end readiness from an audio waveform alone.

## Browser validation and deployment checkpoint

PR #2 merged in commit `996cb25cd7b8df67ecfb724356ad2803e90dcb13`. Its checks **passed**: 10 simulated mobile WebKit/Chromium browser tests including in-browser Pashto playback, and independent non-silent waveform synthesis from the locally bundled engine. GitHub Pages deployment from main may still be propagating. Physical iPhone Safari, Android Chrome, and fluent Afghan Pashto speaker tests are required before claiming normal-use readiness. The translated text service remains a separate accuracy and quota risk. Next developer should inspect the live site first, then conduct physical-device testing and improve recognition/translation, not repeat the eSpeak bundle work.

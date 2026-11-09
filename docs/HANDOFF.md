# Current handoff: Pashto-English

Updated: 2026-11-09

## Branch and review state

Development branch: `feature/pashto-browser-voice`

Open pull request: https://github.com/udeudeude/Pashto-English/pull/2

Production branch: `main`, most recent merged stabilization pull request #1.

Do **not** assume the code in pull request #2 is deployed to the website until its checks pass and the pull request merges.

## Progress this session

- Evaluated eSpeak NG 1.53+ Pashto support and Spellophone, a GPL-3.0-or-later WebAssembly browser implementation.
- Implemented `pashto-voice.js` experimental, on-device Pashto synthesis, with explicit `ps` voice check, real audio samples, and mobile Web Audio playback.
- Wired the experimental voice into Pashto translations and Replay, removing reliance on installed system Pashto voices for that path.
- Added a bilingual voice-test button in Compatibility and privacy.
- Added automated voice-synthesis test using Node 24 and pinned Spellophone 0.2.1. The test generates `test-results/pashto-voice.wav` for human review; automation checks non-silent audio but cannot judge pronunciation.
- Added a browser regression test ensuring Pashto speech playback calls the on-device voice provider.
- Added a GitHub Actions job to save experimental audio as a workflow artifact.

## Critical next checks

1. See the outcome of the `browser-tests` and `pashto-voice-test` checks on pull request #2.
2. If either fails, fix it **on the same branch**, push and wait for passing checks.
3. Download the WAV audio artifact from the workflow and have an Afghan Pashto speaker listen and judge intelligibility. Document the result.
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

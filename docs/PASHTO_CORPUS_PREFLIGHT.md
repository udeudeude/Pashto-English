# Pashto speech corpus: access and offline preflight evidence

**Status on 2026-11-16:** published dataset descriptions inspected; an offline inspection tool has been implemented and tested using synthetic fixtures. **Neither dataset archive has been downloaded, decoded or listened to. No text/audio alignment, model training, pronunciation quality or speaker rights are independently verified.**

## Published candidates

| Source | Public catalog evidence | Limits |
| --- | --- | --- |
| [Pashto Book Summaries and Reviews TTS Corpus](https://mozilladatacollective.com/datasets/cmvgn8l8u000t08nwtq4u9tr6) | Mozilla Data Collective ID \`cmvgn8l8u000t08nwtq4u9tr6\`, released 2026-10-20. Steward states 1,810 aligned FLAC clips, 5.478 hours, one speaker, CC0-1.0. Steward **asserts signed permission for public distribution and AI training**. | Recording permissions are a steward assertion, not independently inspected. Book-derived/third-party rights and actual acoustic alignment are not certified. The catalog specifically warns that structural checks do not establish human listening quality. |
| [Pashto Multi-Speaker Informational Speech Corpus](https://mozilladatacollective.com/datasets/cmvgn9zo7000x07o4w7lexs8z) | ID \`cmvgn9zo7000x07o4w7lexs8z\`, released 2026-10-20. Steward states 3,880 aligned FLAC clips, 8.914 hours, five male speakers, CC0-1.0. Steward **asserts signed AI-training permission**. | No independent review of rights or clips; geographic, gender and age coverage are not representative. Hold out whole speakers when evaluating voice models to avoid leakage. |

**Access gate:** [Mozilla Data Collective's current API documentation](https://mozilladatacollective.com/api-reference/docs) says \`POST /api/datasets/{datasetId}/download\` requires authentication, a complete profile, terms agreement and any additional dataset approval. Even a sample download requires authenticated access. The public listing is not a license to bypass these controls. See also [Mozilla's download guidance](https://community.mozilladatacollective.com/using-the-mdc-python-sdk-library-to-download-datasets/). Do not add credentials to source files or GitHub workflows. Research cannot inspect the actual recordings without access through the approved flow.

## Implemented local inspection tool

\`experiments/pashto_corpus_preflight.py\` accepts a **locally obtained** gzip-compressed TAR archive and reads its entries sequentially without extracting them. It rejects unsafe paths, links, unexpected file types for audio inspection, excessive counts/sizes, repeated paths, unsupported or implausible FLAC STREAMINFO headers and unbounded transcripts. It reports only aggregate audio header durations, sample-rate/channel distributions and optional transcript-file mapping and speaker **counts**. Names, utterances, source paths, voice embeddings and sound bytes are never included in its JSON output.

**Structural-only inspection** (does not verify correspondence to transcripts):

\`\`\`sh
python3 experiments/pashto_corpus_preflight.py \
  /path/to/approved-archive.tar.gz \
  --dataset-id cmvgn8l8u000t08nwtq4u9tr6
\`\`\`

**Transcript mapping inspection** requires the actual archive's schema to have been independently examined; do not invent or assume field names:

\`\`\`sh
python3 experiments/pashto_corpus_preflight.py \
  /path/to/approved-archive.tar.gz \
  --dataset-id cmvgn9zo7000x07o4w7lexs8z \
  --manifest exact/path/inside/archive.jsonl \
  --audio-field actual_audio_path_field \
  --text-field actual_transcript_field \
  --speaker-field actual_speaker_field
\`\`\`

The code also supports a tab-separated manifest. Full-audio and manifest counts may differ from the catalog, and the script records the mismatch rather than hiding it. Its \`all_files_mapped_once\` means **filename association only**, not acoustic transcript alignment. FLAC header parsing is not decoding; a corrupt audio frame can pass. A public catalog's claim of speaker permission is not proof that all third-party rights have been cleared. The tool **always** reports \`training_ready=false\`, \`flac_decoding_verified=false\`, \`acoustic_alignment_verified=false\` and \`pronunciation_verified=false\`.

## Test evidence and next gates

- Offline standard-library regression suite uses only synthetic audio headers and synthetic text fixtures; exercises archive traversal and symlink defense, invalid headers/durations, duplicate/missing transcripts, Pashto script gate, speaker metadata, tabular and JSON lines, aggregate redaction and bounds. See \`experiments/test_pashto_corpus_preflight.py\`.
- The new GitHub workflow performs **only those local synthetic tests**. It does **not** access Mozilla, download copyrighted audio, upload transcripts or distribute synthesized speech.
- **Verified 2026-11-16:** [CI run 43959878430](https://github.com/udeudeude/Pashto-English/actions/runs/43959878430) passed at code/test commit `5f95ccf2e167ea833fa665a547a043befc9694c7`, including Python compilation, the command-line help check and **12/12 synthetic archive tests**. The prior [run 43959754729](https://github.com/udeudeude/Pashto-English/actions/runs/43959754729) also passed its 11/11 tests before the truncated-FLAC regression was added. These are offline test results, not tests of the actual Mozilla archives.
- **Final code/test checkpoint 2026-11-16:** [Offline synthetic corpus run 43960034638](https://github.com/udeudeude/Pashto-English/actions/runs/43960034638) passed **13/13** cases at commit `3561dce156ab2ffab4accf37ad042c7cdd3e6330`. It includes a file-path invocation regression that proves no archive entry was extracted to disk. The [normal pull-request workflow 43960034593](https://github.com/udeudeude/Pashto-English/actions/runs/43960034593) passed **88 browser tests with 8 intentional skips** on mobile-sized Chromium/WebKit, plus the actual bundled eSpeak Pashto waveform job. These workflows test the software against synthetic fixtures and the current web application, **not the real Mozilla speech corpora**.
- After lawful access, inspect the actual manifest schema, verify hashes against the distributor's signed download metadata, perform a local full decode and measured audio-level check on a bounded, speaker-diverse sample, check text/audio alignment independently, and record only aggregate results. Revisit source permissions, third-party material and dialect coverage before training.
- The single-speaker collection is a plausible first compact speech-synthesis *candidate*, not an established pronunciation reference. The multi-speaker collection is useful for dialect coverage and separated holdout tests. Do **not** infer that a corpus with five speakers can certify every Pashto accent.
- Keep Ghag's original \`pashto_grapheme_cleaners\` provenance gate unsatisfied; this independent dataset research does not fix it. No conversion, compression, inference benchmarking, ONNX export or mobile browser integration is justified by these metadata checks.
- The live web app, eSpeak voice and private conversations remain untouched.

**Evidence register policy:** record exact workflow run, commit and observed limitations after CI finishes. Never claim a real recording was evaluated based on synthetic tests.

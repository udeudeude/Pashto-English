# Evaluating Pashto speech recognition without an in-person speaker

Updated: 2026-11-09. This is an **evaluation method**, not a claim that recognition has been validated.

## Independent recorded speech sources

1. **Mozilla Common Voice 27.0 Pashto scripted speech.** Public-domain-style CC0 recordings with text. 2026-09-28 release, about 97.7 GB. https://mozilladatacollective.com/datasets/cmul9a3f008diny07cluf265u . Dataset terms **forbid rehosting and resharing** even where CC0 applies, so keep raw recordings out of this repository.
2. **Pashto Audio-Visual Speech Corpus.** About 9,421 validated sentence clips, 12.67 hours of speech, 1.33 GB archive, and transcriptions. Contributors include urban Afghan Pashto speakers. Dataset listing: https://mozilladatacollective.com/datasets/cmuzrhfbd006l07nxoe3inrzq . Data is for evaluation, never speaker identification.
3. **Pashto Multi-Speaker Informational Speech Corpus.** Around 3,880 clips and 8.914 hours, with several regional voices including Kabul, Kandahar, and Paktia. Dataset listing: https://mozilladatacollective.com/datasets/cmvgn9zo7000x07o4w7lexs8z .
4. **Common Voice spontaneous Pashto speech.** About 772 MB (2026 dataset listing), potentially useful for realistic conversation. https://commonvoice.mozilla.org/vmw/datasets .

Check current access conditions and terms before downloading. Do **not** place recordings, speaker metadata, or identifiable snippets in git, GitHub Actions logs, or public example files. Do not attempt to identify speakers.

## Evaluation procedure

1. Acquire a **small, authorized test subset** from a source with transcripts. Favor multiple dialects, ages, speaking rates, and noise levels. Keep a record of source name, dataset release, and inclusion criteria.
2. Keep the transcript reference and the recognition hypothesis separate. Decode audio using the **same** preprocessing used by the phone app.
3. Test the existing on-device Whisper tiny recognition first. Do not claim usable accuracy merely because some examples succeed.
4. Prepare a local UTF-8 JSON Lines file with one object per clip:
   `{"reference":"سلام تاسو","hypothesis":"سلام تاسو"}`
5. Run `node scripts/score-transcripts.mjs your-local-evaluation.jsonl`.
6. Record **word error rate** and **character error rate**, plus number of clips and source conditions, in a non-identifying report. A high error rate suggests improvement is necessary; a low rate on scripted audio alone does not establish conversational reliability.
7. Repeat with better-recognition candidates under the same test subset. Record first-download size, phone memory use, processing time, and actual iPhone/Android availability.
8. Keep train/test splits and speakers distinct. Watch for model training-data overlap and difficulty with numerals, proper names, negation, and borrowed words.

The scorer normalizes Unicode and optional vowel marks but **does not collapse distinct Pashto letter variants**. Its automated tests run in GitHub Actions. Without source audio and a locally generated hypothesis file, no recognition error rate can legitimately be reported.

## Separate problem: translation and speech intelligibility

Recognition accuracy is not translation accuracy. English↔Pashto translation still needs native-speaker review, appropriate bilingual reference translations, and contextual evaluation. A non-silent audio waveform is not evidence of intelligible Pashto. Do not substitute back-translation agreement for human verification.

## What a future Work session can do

Download an appropriately licensed **small evaluation subset**, run the current browser or equivalent recognition preprocessing, generate a hypothesis file **locally**, run this scorer, then preserve only aggregated metrics and reproducibility details. Avoid downloading a 97.7 GB corpus merely to assess a handful of common phrases.

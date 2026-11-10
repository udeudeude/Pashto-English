# Translation and Pashto pronunciation audit

## What is executable now

`audits/translation-contrast-corpus.json` provides paired English probes for negation, requests, kinship, number, time, gender and emergency commands. The permanent test checks the corpus structure and explicitly rejects fabricated Pashto reference translations. These checks do **not** establish translation quality.

## Translation accuracy: evidence protocol

For each probe, seek a legitimately reusable published Pashto example in an independent bilingual dictionary, grammar, learning resource or corpus. Store the source citation, dialect, license, sentence context and exact reference text before introducing expected Pashto output. Compare source meaning, negation, number, person, aspect and politeness in both directions. Model agreement is only a triage signal. Do not populate a gold reference by asking the same system under test to translate it.

Potential source starting points (availability and suitability must be checked per item):
- University of Chicago Digital South Asia Library, Heston Pashto dictionary: https://dsal.uchicago.edu/dictionaries/heston/
- Common Voice language datasets and licensing: https://commonvoice.mozilla.org/
- Mozilla speech dataset metadata: https://datacollective.mozillafoundation.org/

## Pronunciation: what can and cannot be verified automatically

The application currently bundles an experimental Pashto eSpeak NG voice. Automated tests can establish that the engine loads, outputs non-silent audio, and does not clip; they cannot establish natural pronunciation, dialect suitability, or comprehension. A defensible next stage is to obtain licensed Pashto speech with transcripts and phonetic references, normalize script variants, align reference phonemes with generated output, and report coverage and discrepancy by word. Acoustic similarity alone is not intelligibility. Avoid claiming a correct pronunciation merely because a model agrees.

No human Pashto-speaker recruitment is required to proceed with source-based evaluation or releases. Missing external recordings or references should be recorded as coverage gaps, not interpreted as passing tests.

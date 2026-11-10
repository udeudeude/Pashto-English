# Cultural and linguistic audit: independent verification protocol

**Policy:** Development, automated testing, merging and release must never depend on access to Pashto-speaking human testers. Native-speaker review may be incorporated when available, but it is optional additional evidence. Never describe machine-based evidence as native-speaker validation.

## Repeatable evidence sources

1. Prefer independently published Afghan Pashto dictionaries, grammars, educational materials, bilingual examples and appropriately licensed speech corpora. Record exact source, date, dialect and licensing restrictions.
2. Build contextual test fixtures for greetings, requests, refusals, negation, kinship, honorifics, classroom instructions, health, emergencies and ambiguous English words. Check both translation directions and preserve source texts.
3. Compare independent translation systems where legally and technically possible. Disagreement is a review signal; agreement does not establish truth.
4. Test picture candidates for exact English concept, grammatical sense, contextual ambiguity and accessibility. Do not assume pictogram provider ranking or gesture etiquette claims establish Afghan interpretation.
5. For speech recognition, use published recordings with independent reference transcripts and report error rates by available dialect and recording condition. For synthesis, measure non-silence, clipping, duration and phonetic correspondence where references exist; these cannot establish intelligibility.
6. Run physical-device accessibility and microphone privacy checks when devices are available, without requiring Pashto-speaking participants.

## Evidence and decisions

Use `audits/cultural-findings.json` as the canonical evidence register. Distinguish hypotheses, documented research, and optional speaker validation. A finding may be **remediated** on reproducible documentary and automated evidence without claiming that cultural comprehension has been empirically proven. Preserve regional disagreement and uncertainty. For high-stakes content, prefer explicit speech/text over ambiguous images, and never silently change translations based on pictures.

Every change should have a source reference or reproducible test, a stated confidence limitation, and a regression check. Missing human participants is **not** a blocker or failure condition.

## Optional research, never a dependency

If consenting Afghan Pashto speakers voluntarily become available, image-only unprompted comprehension, audio-only paraphrase and low-literacy usability studies can provide additional evidence. Keep participant data private, report aggregate findings, and do not generalize a small sample to all speakers. No such study is scheduled or assumed.

Issue #14 tracks the cultural audit. This protocol supersedes the previous participant-recruitment plan.

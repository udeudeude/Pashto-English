# Afghan Pashto cultural comprehension study protocol

Status: **not yet conducted**. This protocol is a research plan, not evidence of speaker validation.

## Participants and consent

Recruit consenting adult Afghan Pashto speakers across regional varieties, age groups and literacy experiences, including adults who do not read. Avoid treating any participant as representative of all Afghan speakers. Participation is voluntary; allow skipping any prompt and withdrawal at any point. Do not collect names, contact information, voice recordings, or identifying details in this public repository. Arrange a private, consented study record separately if needed.

## Image comprehension: unprompted first

1. Present each candidate image **without** its English label, Pashto label or provider name. Randomize order and avoid displaying the English prompt first.
2. Ask the participant to explain what it means, or demonstrate the meaning. Record the meaning in the participant's preferred language through a fluent facilitator. Avoid leading questions.
3. Ask how confident they are and whether the meaning changes by context or who is using the gesture.
4. Only then disclose the intended English concept, and ask whether the image would communicate that concept in a real conversation.
5. For gestures, distinguish recognition of foreign media conventions from locally customary use; never presume universal offense or approval.
6. Compare at least two alternative images for ambiguous or high-stakes concepts, including `okay`, `medicine`, `pain`, `emergency`, `danger`, `old`, `like` and `play`.

## Spoken dialogue and accessibility

Evaluate both English-to-Pashto and Pashto-to-English for greetings, requests, refusals, negation, kinship, honorifics, classroom instructions, medical needs, and emergency requests. Ask for spontaneous paraphrase of the **audio** before showing any text. Evaluate recognition, translation, and synthesized voice independently. Include dialect/context notes and disagreements. For nonreading participants, test the entire workflow without written instructions and without an assistant operating the phone for them.

## Scoring and acceptance

For each trial record a nonidentifying participant code, task identifier, context, dialect (optional), original response, intended meaning, unprompted comprehension (correct / partially correct / incorrect / unclear), prompted agreement separately, and qualitative explanation. Publish aggregate counts and disagreements, not personal recordings. Do not label an item `speaker-validated` on the basis of a single speaker, prompted agreement, or automated translation. Require independent reviewers and document sampling limitations. High-stakes terms remain under review until scenario-level comprehension and bilingual accuracy are demonstrated. Do not describe the app as certified for medical or emergency interpretation.

## Engineering follow-through

Use `audits/cultural-findings.json` to track evidence and remediation; `lib/cultural-review.mjs` attaches nonintrusive review metadata to selected vocabulary. Do not turn these hypotheses into hard-coded prohibitions. Each implemented correction needs a regression test and review of both language directions. Issue #14 is the canonical tracking issue.

# Independent Pashto recognizer control: why, evidence, and release gates

**Experimental branch** \`experiment/pashto-independent-asr-controls\` is stacked on \`experiment/ghag-speaker-inference\`. No change to the live app, default eSpeak, Pashto recognition worker or neural voice selection.

## Why the existing speech-quality proxy was invalid

Our original \`openai-whisper base\` evaluation failed to transcribe an authentic Pashto FLEURS human recording at all (character error rate **1.05**, word error rate **1.00**, wrongly detected Lithuanian). That control failure makes apparent scores for generated Ghag/eSpeak audio **uninterpretable**. See \`experiments/GHAG_EXECUTION_GATES.md\`. A published April 2026 Pashto benchmark independently reports pervasive script failure for zero-shot Whisper, and better Pashto-script fidelity from dedicated/alternative models: https://arxiv.org/abs/2604.04598 . Different source/corpus conditions mean external results cannot substitute for our measurements.

## New independent candidate

[\`ihanif/wav2vec2-xls-r-300m-pashto\`](https://huggingface.co/ihanif/wav2vec2-xls-r-300m-pashto), public Hugging Face model card: **Apache 2.0**, approximately **300 million parameters**, Wav2Vec2 connectionist temporal classification architecture. The author reports **19.72% character error** and **51.59% word error** on FLEURS \`ps_af\`. This is **self-reported**, may overlap in distribution with its FLEURS training data, and does not establish mobile feasibility, conversational accuracy, or suitability for judging generated voices.

Meta's MMS-1B and SeamlessM4T-v2 are additional research options; their sizes, license terms and separate test results must be reviewed before adoption. We do not install a commercial service, replace Whisper on the live site or use a cloud provider for real user utterances.

## New three-control experiment

\`experiments/pashto_asr_controls.py\`:

1. Queries the public model repository for the exact SHA-1 revision and confirms the declared Apache license and speech-recognition task. Load **safetensors only**, with \`trust_remote_code=False\`.
2. Loads the model on an isolated GitHub CPU runner. This is research only; no assumption that a phone can hold it.
3. Fetches exactly three **public CC BY 4.0 FLEURS \`ps_af\` *test* rows: 0, 1 and 2**, not Ghag's validation-row-0 speaker conditioning sample. Validates bounded audio URLs/bytes, clip duration/amplitude, Pashto transcript script and exact audio checksums. Audio and text remain ephemeral and no speaker identifiers are recovered.
4. Transcribes at 16 kHz and calculates **pooled character and word error**, per-sample results and fraction of letters using the Arabic-script Unicode block. Also counts exact matches of selected distinctive Pashto graphemes. The script fraction alone is **not** a Pashto-language detector, since Arabic, Urdu and Dari share the block.
5. **Fails closed** unless all three distinct controls are present, pooled character error is at most 0.35, each per-recording character error at most 0.60, and at least 80% of letters in each transcription use the expected Unicode block. These are exploratory calibration thresholds, **not** human intelligibility requirements. If any threshold fails, generated speech must not be ranked with that recognizer. Even if thresholds pass, \`generated_voice_scoring_executed=false\` and \`pronunciation_verified=false\`; require independent cross-domain controls before evaluating any voice.

The only GitHub artifact is a bounded JSON summary with dataset identifiers, exact audio checksums, numerical metrics, package versions and explicitly unverified gates. It never stores, prints or uploads actual recording bytes, speech transcripts, speaker identities, checkpoint weights or model-generated speech.

## Tests, uncertainty, and next steps

- \`experiments/test_pashto_asr_controls.py\` uses synthetic text and audio to check scoring thresholds, Unicode/script treatment, missing/duplicate records, transcript redaction, FLEURS test-split provenance, URL allowlists, no accidental downloads and explicit rejection of invalid controls.
- \`.github/workflows/pashto-asr-controls.yml\` runs synthetic tests for each change. Its optional bounded full-model CPU job runs only on its isolated branch push or explicit dispatch. Network/download failures will be recorded as **failures**, never fabricated recognition results.
- **Important limitation:** just three clips cannot establish reliable calibration for a real-world interpreter or all accents. FLEURS test shares the same broad source as the model's reported training/evaluation; it is a useful first gate but is not a true external-domain control. Before using the model to compare Ghag and eSpeak, verify non-overlap and cross-domain performance using more public licensed recordings. Preserve human-evaluation and Ghag-original-cleaner prerequisites.
- After actual workflow completes, add exact run identifiers, commits, results and failure modes. Real iPhone inference has not been attempted.

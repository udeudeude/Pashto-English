"""Public Pashto corpus symbol-coverage audit for pinned Ghag, not a trained cleaner.

Only aggregated Unicode codepoint frequencies are published. Source sentences,
audio URLs and recordings remain ephemeral.
"""
import hashlib
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlencode

from ghag_public_reference import VIEWER, bounded_response
from ghag_text_frontend import audit_sample, published_character_inventory

MODEL_REPO = "Nasimbahar/pashto-ghag-yourtts"
REVISION = "4b2521265c173a1f6b2df9584a57046cdbe614a9"
DATASET, CONFIG, SPLIT = "google/fleurs", "ps_af", "validation"
BATCH, MAX_EXAMPLES = 10, 40


def request_rows(offset, length, loader=bounded_response):
    """Fetch a bounded text-only view and validate every requested row."""
    if type(offset) is not int or type(length) is not int or offset < 0 or not 1 <= length <= 20:
        raise ValueError("Invalid bounded corpus request")
    url = VIEWER + "/rows?" + urlencode({
        "dataset": DATASET, "config": CONFIG, "split": SPLIT,
        "offset": offset, "length": length,
    })
    payload = json.loads(loader(url, 1_000_000))
    for key, expected in (("dataset", DATASET), ("config", CONFIG), ("split", SPLIT)):
        if payload.get(key) not in (None, expected):
            raise ValueError("Unexpected corpus provenance: " + key)
    items = payload.get("rows")
    if not isinstance(items, list) or len(items) != length:
        raise ValueError("Missing or incomplete corpus batch")
    texts = []
    for i, item in enumerate(items):
        if not isinstance(item, dict) or item.get("row_idx") != offset + i:
            raise ValueError("Corpus rows not in requested order")
        row = item.get("row")
        text = row.get("transcription") if isinstance(row, dict) else None
        if not isinstance(text, str) or not 1 <= len(text.strip()) <= 500:
            raise ValueError("Missing or unbounded public corpus transcript")
        texts.append(text)
    return texts


def summarize_coverage(config, transcripts):
    """Audit input coverage without persisting original or normalized text."""
    inventory = published_character_inventory(config)
    total = 0
    preview_missing = 0
    raw_missing = 0
    changed = 0
    unsupported = Counter()
    raw_unsupported = Counter()
    for sample in transcripts:
        if not isinstance(sample, str) or not sample:
            raise ValueError("Empty sample in fixed corpus")
        preview = audit_sample(sample, inventory)
        changed += int(preview["changed_by_preview"])
        total += preview["characters_checked"]
        preview_missing += preview["unsupported_count"]
        raw_missing += sum(c not in inventory for c in sample)
        raw_unsupported.update(c for c in sample if c not in inventory)
        unsupported.update({
            entry["character"]: entry["count"] for entry in preview["unsupported_characters"]
        })
    if not transcripts:
        raise ValueError("Corpus was empty")
    def codepoints(counts):
        return [{"code_point": f"U+{ord(char):04X}", "count": count}
                for char, count in sorted(counts.items(), key=lambda pair: ord(pair[0]))]
    return {
        "corpus": DATASET, "config": CONFIG, "split": SPLIT,
        "sample_count": len(transcripts),
        "total_preview_characters": total,
        "raw_unsupported_characters": raw_missing,
        "preview_unsupported_characters": preview_missing,
        "samples_changed_by_candidate_preview": changed,
        "raw_unsupported_codepoints": codepoints(raw_unsupported),
        "preview_unsupported_codepoints": codepoints(unsupported),
        "trained_cleaner_parity_verified": False,
        "pronunciation_verified": False,
        "meaning": "Character coverage only; no speech or transcripts are included",
    }


def run():
    from huggingface_hub import HfApi, hf_hub_download
    info = HfApi().model_info(MODEL_REPO, revision=REVISION)
    if info.sha != REVISION:
        raise RuntimeError("Pinned model configuration revision mismatch")
    path = Path(hf_hub_download(repo_id=MODEL_REPO, filename="config.json", revision=REVISION))
    config_bytes = path.read_bytes()
    config = json.loads(config_bytes)
    samples = []
    for offset in range(0, MAX_EXAMPLES, BATCH):
        samples.extend(request_rows(offset, BATCH))
    result = summarize_coverage(config, samples)
    result["model_revision"] = REVISION
    result["model_config_sha256"] = hashlib.sha256(config_bytes).hexdigest()
    return result


def main():
    result = run()
    output = Path("experiment-results/ghag/corpus-coverage.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()

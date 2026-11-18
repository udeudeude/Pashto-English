"""Public Pashto corpus symbol-coverage audit for pinned Ghag, not a trained cleaner.

Only aggregated Unicode codepoint frequencies are published. Source sentences,
audio URLs and recordings remain ephemeral.
"""
import hashlib
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlencode
from urllib.error import HTTPError

from ghag_public_reference import VIEWER, bounded_response
from ghag_text_frontend import audit_sample, published_character_inventory

MODEL_REPO = "Nasimbahar/pashto-ghag-yourtts"
REVISION = "4b2521265c173a1f6b2df9584a57046cdbe614a9"
DATASET, CONFIG, SPLIT = "google/fleurs", "ps_af", "validation"
BATCH, MAX_EXAMPLES = 10, 40
FLORES_REPO = "DGME/FLORES-200"
FLORES_FILE = "devtest/pbt_Arab.devtest"


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


def summarize_coverage(config, transcripts, *, corpus_label=DATASET):
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
        "corpus": corpus_label,
        "config": CONFIG if corpus_label == DATASET else "pbt_Arab",
        "split": SPLIT if corpus_label == DATASET else "devtest",
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


def fetch_text_only_flores(api, download, limit=MAX_EXAMPLES):
    """Independent Southern Pashto text-only fallback; not FLEURS audio transcripts."""
    if type(limit) is not int or not 1 <= limit <= 100:
        raise ValueError("Invalid FLORES sample limit")
    info = api.dataset_info(FLORES_REPO)
    if not info.sha or len(info.sha) != 40:
        raise RuntimeError("Cannot resolve immutable fallback dataset revision")
    path = Path(download(repo_id=FLORES_REPO, repo_type="dataset",
                         filename=FLORES_FILE, revision=info.sha))
    data = path.read_bytes()
    if not data or len(data) > 1_000_000:
        raise ValueError("FLORES text corpus exceeds safe size limit")
    lines = data.decode("utf-8").splitlines()
    if len(lines) < limit or any(not 1 <= len(s.strip()) <= 500 for s in lines[:limit]):
        raise ValueError("FLORES transcript corpus incomplete or invalid")
    return lines[:limit], {
        "repository": FLORES_REPO, "revision": info.sha,
        "filename": FLORES_FILE, "file_sha256": hashlib.sha256(data).hexdigest(),
        "license_note": "Published FLORES-200 text: aggregate research only; no lines redistributed",
    }


def run():
    from huggingface_hub import HfApi, hf_hub_download
    api = HfApi()
    info = api.model_info(MODEL_REPO, revision=REVISION)
    if info.sha != REVISION:
        raise RuntimeError("Pinned model configuration revision mismatch")
    path = Path(hf_hub_download(repo_id=MODEL_REPO, filename="config.json", revision=REVISION))
    config_bytes = path.read_bytes()
    config = json.loads(config_bytes)
    samples = []
    source = DATASET
    fallback = None
    try:
        for offset in range(0, MAX_EXAMPLES, BATCH):
            samples.extend(request_rows(offset, BATCH))
    except (HTTPError, TimeoutError, ConnectionError) as error:
        if isinstance(error, HTTPError) and error.code not in (429, 500, 502, 503, 504):
            raise
        # Do not mix corpora or mislabel FLORES text as FLEURS speech transcripts.
        samples, fallback = fetch_text_only_flores(api, hf_hub_download)
        source = "FLORES-200 Southern Pashto text (NOT FLEURS audio)"
        fallback["trigger"] = ("HTTP_" + str(error.code) if isinstance(error, HTTPError)
                               else type(error).__name__)
    result = summarize_coverage(config, samples, corpus_label=source)
    if fallback is not None:
        result["fallback_text_source"] = fallback
        result["fleurs_audio_transcripts_verified"] = False
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

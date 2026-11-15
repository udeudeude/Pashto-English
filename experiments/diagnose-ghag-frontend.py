#!/usr/bin/env python3
"""Inspect the pinned Ghag grapheme frontend without loading untrusted weights.

This audits symbol membership, not original cleaner equivalence or speech.
"""
import hashlib
import json
from pathlib import Path

from huggingface_hub import HfApi, hf_hub_download

from ghag_text_frontend import (
    audit_sample, extract_test_texts, published_character_inventory,
)
from ghag_number_hypotheses import audit_number_candidate_inventory

REPO = "Nasimbahar/pashto-ghag-yourtts"
REV = "4b2521265c173a1f6b2df9584a57046cdbe614a9"
CLEANER = "pashto_grapheme_cleaners"
PUBLIC_DEMO = "سلامونه، دا د پښتو غږ د ماډل ازموينه ده۔"
OUR_DIAGNOSTIC_INPUT = "سلام، تاسو څنګه یاست؟"


def diagnose():
    api = HfApi()
    info = api.model_info(REPO, revision=REV)
    if info.sha != REV:
        raise RuntimeError("Pinned upstream revision mismatch")
    config_path = Path(hf_hub_download(repo_id=REPO, filename="config.json", revision=REV))
    config_bytes = config_path.read_bytes()
    config = json.loads(config_bytes)
    inventory = published_character_inventory(config)

    # The published Python helper might call a cleaner without defining it.
    # Inspect only source files, never execute downloaded Python or unpickle.
    source_files = []
    declared_definitions = []
    for sibling in info.siblings:
        filename = sibling.rfilename
        if not filename.endswith(".py"):
            continue
        if sibling.size and sibling.size > 300_000:
            source_files.append({"path": filename, "inspected": False, "reason": "size_limit"})
            continue
        source = Path(hf_hub_download(
            repo_id=REPO, filename=filename, revision=REV
        )).read_text(encoding="utf-8")
        # Syntactic marker only: it is NOT equivalent to validating implementation.
        has_definition = ("def " + CLEANER + "(") in source
        source_files.append({
            "path": filename,
            "inspected": True,
            "sha256": hashlib.sha256(source.encode("utf-8")).hexdigest(),
            "defines_original_cleaner": has_definition,
            "references_cleaner": CLEANER in source,
        })
        if has_definition:
            declared_definitions.append(filename)

    # Inspect the model's prior published revisions for the missing cleaner,
    # without fetching weights or executing upstream scripts.
    historical_python_scan = []
    for commit in api.list_repo_commits(REPO)[:8]:
        if commit.commit_id == REV:
            continue
        historical_info = api.model_info(REPO, revision=commit.commit_id)
        entry = {"revision": commit.commit_id, "python_files": [],
                 "cleaner_definition_found": False}
        for sibling in historical_info.siblings:
            filename = sibling.rfilename
            if not filename.endswith(".py"):
                continue
            if sibling.size and sibling.size > 300_000:
                entry["python_files"].append({
                    "path": filename, "inspected": False, "reason": "size_limit"})
                continue
            source_bytes = Path(hf_hub_download(
                repo_id=REPO, filename=filename,
                revision=commit.commit_id)).read_bytes()
            body = source_bytes.decode("utf-8")
            has_definition = ("def " + CLEANER + "(") in body
            entry["python_files"].append({
                "path": filename, "sha256": hashlib.sha256(source_bytes).hexdigest(),
                "defines_original_cleaner": has_definition, "inspected": True})
            entry["cleaner_definition_found"] |= has_definition
        historical_python_scan.append(entry)

    samples = [
        {"origin": "experiment_input", "text": OUR_DIAGNOSTIC_INPUT},
        {"origin": "pinned_model_card_example", "text": PUBLIC_DEMO},
    ]
    for i, text in enumerate(extract_test_texts(config)):
        samples.append({"origin": f"config_test_sentence_{i + 1}", "text": text})
    audits = []
    for sample in samples:
        review = audit_sample(sample["text"], inventory)
        review["origin"] = sample["origin"]
        audits.append(review)
    unsupported_total = sum(item["unsupported_count"] for item in audits)
    return {
        "model_repository": REPO,
        "revision": REV,
        "config_sha256": hashlib.sha256(config_bytes).hexdigest(),
        "declared_text_cleaner": config.get("text_cleaner"),
        "use_phonemes": config.get("use_phonemes"),
        "grapheme_inventory_size": len(inventory),
        "character_inventory": "".join(sorted(inventory)),
        "source_files": source_files,
        "upstream_cleaner_definition_found": bool(declared_definitions),
        "upstream_cleaner_definition_paths": declared_definitions,
        "historical_python_source_scan": historical_python_scan,
        "historical_cleaner_definition_found": any(
            entry["cleaner_definition_found"] for entry in historical_python_scan),
        "sample_audits": audits,
        "number_candidate_inventory_audit": audit_number_candidate_inventory(inventory),
        "unsupported_sample_characters": unsupported_total,
        "candidate_normalization": "NFC, remove directional marks, normalize nonbreaking spaces only",
        "original_cleaner_parity_verified": False,
        "speaker_conditioning_verified": False,
        "human_voice_verified": False,
        "finding": (
            "A character coverage audit only. Neither an original cleaner "
            "implementation nor pronunciation is validated by this report."
        ),
    }


def main():
    output = Path("experiment-results/ghag/text-frontend.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    result = diagnose()
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()

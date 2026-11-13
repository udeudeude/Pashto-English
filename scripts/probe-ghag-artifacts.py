#!/usr/bin/env python3
"""Read public Ghag model metadata without downloading model weights.

Usage: python3 scripts/probe-ghag-artifacts.py
Network access is required; errors are reported rather than hidden.
"""
import json
import urllib.request
from urllib.parse import quote

REPOSITORY = "Nasimbahar/pashto-ghag-yourtts"
BASE = "https://huggingface.co/api/models/" + REPOSITORY
EXPECTED = ("best_model.pth", "config.json", "speakers.pth", "model_se.pth", "config_se.json", "KNOWN_SPEAKERS.json", "hf_infer_pashto_ghag_yourtts.py")


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Pashto-English-model-audit/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def report(model, tree):
    files = {item["path"]: item for item in tree if item.get("type") == "file"}
    entries = []
    for name in EXPECTED:
        item = files.get(name)
        entries.append({"name": name, "present": item is not None,
                        "bytes": item.get("size") if item else None,
                        "stored_as_large_file": bool(item.get("lfs")) if item else False})
    return {"repository": REPOSITORY, "revision": model.get("sha"),
            "declared_license": model.get("cardData", {}).get("license"),
            "artifacts": entries,
            "total_known_bytes": sum(x["bytes"] or 0 for x in entries),
            "inference_verified": False, "browser_compatible": False}


def main():
    model = fetch(BASE)
    revision = model["sha"]
    tree = fetch(BASE + "/tree/" + quote(revision, safe="") + "?recursive=true&expand=true")
    result = report(model, tree)
    print(json.dumps(result, indent=2))
    if not all(item["present"] for item in result["artifacts"]):
        raise SystemExit("Some expected inference files are missing; investigate before conversion")


if __name__ == "__main__":
    main()

"""Non-destructive, model-vocabulary-aware Pashto text audit.

This module is NOT the missing upstream pashto_grapheme_cleaners implementation.
It does not modify the shipped app or silently drop unsupported graphemes.
"""
from collections import Counter
import unicodedata


# Only Unicode formatting normalization. No linguistically speculative mappings:
# Pashto has distinct yeh, heh, and retroflex letters.
DIRECTIONAL_CONTROLS = frozenset(("\u200e", "\u200f", "\ufeff"))


def conservative_preview(text):
    """Return a minimal candidate for inspection, NOT trained-cleaner parity."""
    if not isinstance(text, str):
        raise TypeError("Expected Unicode string")
    return unicodedata.normalize(
        "NFC", "".join(" " if c == "\u00a0" else c
                       for c in text if c not in DIRECTIONAL_CONTROLS)
    )


def published_character_inventory(config):
    """Read grapheme/punctuation membership declared by the pinned config."""
    if not isinstance(config, dict) or config.get("use_phonemes") is not False:
        raise ValueError("Expected an explicitly grapheme-based model config")
    characters = config.get("characters")
    if not isinstance(characters, dict):
        raise ValueError("Expected a characters dictionary in the model config")
    alphabet = characters.get("characters")
    punctuation = characters.get("punctuations")
    if not isinstance(alphabet, str) or not alphabet:
        raise ValueError("Missing trained grapheme alphabet")
    if not isinstance(punctuation, str):
        raise ValueError("Missing trained punctuation alphabet")
    return set(alphabet + punctuation)


def audit_sample(text, inventory):
    """Show which Unicode characters an input may lose at tokenization.

    This is only a character membership check. Model alphabet membership
    does not prove the training cleaner, phonetics, or token indices match.
    """
    if not isinstance(inventory, (set, frozenset)) or not inventory:
        raise ValueError("Expected a nonempty character inventory")
    preview = conservative_preview(text)
    unsupported = Counter(c for c in preview if c not in inventory)
    return {
        "source_text": text,
        "candidate_preview": preview,
        "changed_by_preview": preview != text,
        "characters_checked": len(preview),
        "unsupported_count": sum(unsupported.values()),
        "unsupported_characters": [
            {"character": character, "code_point": f"U+{ord(character):04X}",
             "name": unicodedata.name(character, "UNASSIGNED"), "count": count}
            for character, count in sorted(unsupported.items(), key=lambda entry: ord(entry[0]))
        ],
        "training_cleaner_parity_verified": False,
    }


def extract_test_texts(config, limit=10):
    """Extract only text fields from published Coqui test sentence records."""
    samples = []
    raw = config.get("test_sentences", []) or []
    if not isinstance(raw, list):
        return samples
    for entry in raw:
        value = entry if isinstance(entry, str) else (
            entry[0] if isinstance(entry, (list, tuple)) and entry else None
        )
        if isinstance(value, str) and value.strip():
            samples.append(value)
        if len(samples) >= limit:
            break
    return samples

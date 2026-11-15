"""Sourced Pashto numeral *hypotheses*, never a Ghag production cleaner.

Public references agree on standalone 0-10 cardinals but grammar, dialect,
dates, prices, phone numbers and decimal notation need contextual treatment.
This tool NEVER rewrites input submitted to the model.
Sources: Omniglot /language/numbers/pashto.htm, Wikivoyage Pashto phrasebook,
Liganda Pashto number grammar (gender-sensitive 1 and 2), and the open
2023 Language Mentors International Pashto introductory course.
"""
import unicodedata

# Source concordance covers the ordinary standalone cardinal spellings.
# The gender alternatives here are recorded, never automatically chosen.
CARDINALS = (
    ("صفر",), ("یو", "یوه"), ("دوه", "دوې"), ("درې",),
    ("څلور",), ("پنځه",), ("شپږ",), ("اووه",),
    ("اته",), ("نهه",), ("لس",),
)
DIGIT_RANGES = ((0x30, 0x39), (0x660, 0x669), (0x6F0, 0x6F9))


def inspect_standalone_numeral(token):
    """Return possible readings or an explicit blocked reason; no replacement.

    Accept numerals only from ASCII, Arabic-Indic and Eastern Arabic/Persian
    sets. Refuse leading zeros (potential telephone/identifier) and >10.
    For 1 and 2 an explicit ambiguity warns against unlicensed grammar guesses.
    """
    if not isinstance(token, str) or not token:
        raise ValueError("Expected a nonempty string")
    if not all(any(lo <= ord(char) <= hi for lo, hi in DIGIT_RANGES) for char in token):
        raise ValueError("Only three documented decimal numeral scripts are accepted")
    numeric = "".join(str(unicodedata.decimal(c)) for c in token)
    n = int(numeric)
    reason = None
    if len(numeric) > 1 and numeric.startswith("0"):
        reason = "leading_zeros_or_identifier"
    elif n > 10:
        reason = "beyond_sourced_standalone_range"
    return {
        "numeric_value": n if not reason else None,
        "status": "blocked" if reason else "candidate_only",
        "reason": reason,
        "spelling_options": list(CARDINALS[n]) if not reason else [],
        "gender_or_context_sensitive": n in (1, 2) if not reason else True,
        "original_trained_cleaner_verified": False,
        "safe_to_synthesize_without_context": False,
    }

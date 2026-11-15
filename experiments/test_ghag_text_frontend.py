"""Standard-library regressions: never infer real pronunciation from coverage."""
import unittest

from ghag_text_frontend import (
    audit_sample, conservative_preview, extract_test_texts,
    published_character_inventory, require_raw_grapheme_coverage,
)


class GhagTextFrontendTests(unittest.TestCase):
    def setUp(self):
        self.config = {
            "use_phonemes": False,
            "characters": {"characters": "سلامتۆنګهۍڅښږځټډڼېیي",
                           "punctuations": " ،؟."},
        }
        self.inventory = published_character_inventory(self.config)

    def test_distinct_pashto_graphemes_survive_normalization(self):
        text = "ښږڅځټډڼۍېیي"
        self.assertEqual(conservative_preview(text), text)

    def test_nfc_and_bidi_controls_only(self):
        self.assertEqual(conservative_preview("ا\u200f\u00a0م\u200e"), "ا م")
        self.assertEqual(conservative_preview("ا\u0654"), "\u0623")

    def test_unseen_character_is_reported_without_deletion(self):
        report = audit_sample("سلام!؟", self.inventory)
        self.assertEqual(report["candidate_preview"], "سلام!؟")
        self.assertEqual(report["unsupported_count"], 1)
        self.assertEqual(report["unsupported_characters"][0]["character"], "!")
        self.assertEqual(report["unsupported_characters"][0]["code_point"], "U+0021")
        self.assertFalse(report["training_cleaner_parity_verified"])

    def test_supported_characters_do_not_imply_cleaner_parity(self):
        report = audit_sample("سلام؟", self.inventory)
        self.assertEqual(report["unsupported_count"], 0)
        self.assertFalse(report["training_cleaner_parity_verified"])

    def test_character_inventory_rejects_missing_or_phonemic_config(self):
        with self.assertRaisesRegex(ValueError, "grapheme"):
            published_character_inventory({"use_phonemes": True,
                "characters": self.config["characters"]})
        with self.assertRaisesRegex(ValueError, "punctuation"):
            published_character_inventory({"use_phonemes": False,
                "characters": {"characters": "سلام"}})

    def test_preview_does_not_convert_language_specific_yeh_or_heh(self):
        text = "يیۍېهۀ"
        self.assertEqual(conservative_preview(text), text)

    def test_extract_upstream_examples_without_speaker_metadata(self):
        config = {"test_sentences": [
            ["سلام!", "speaker_sensitive_identifier"],
            ["ښه راغلاست", "other_speaker"],
            {"text": "not a Coqui sentence"}, "", [], ["پښتو"],
        ]}
        self.assertEqual(extract_test_texts(config), ["سلام!", "ښه راغلاست", "پښتو"])

    def test_preflight_rejects_numbers_in_both_scripts(self):
        for candidate in ("سلام 123", "سلام ۱۲۳"):
            with self.subTest(candidate=candidate), self.assertRaisesRegex(
                ValueError, "absent from the model inventory"
            ):
                require_raw_grapheme_coverage(candidate, self.inventory)

    def test_preflight_rejects_latin_and_unknown_punctuation(self):
        with self.assertRaisesRegex(ValueError, "U\\+0021"):
            require_raw_grapheme_coverage("سلام!", self.inventory)
        with self.assertRaisesRegex(ValueError, "U\\+0041"):
            require_raw_grapheme_coverage("سلام A", self.inventory)

    def test_preflight_never_silently_normalizes_source(self):
        with self.assertRaisesRegex(ValueError, "unverified normalization"):
            require_raw_grapheme_coverage("سلام\u200f", self.inventory)

    def test_preflight_accepts_unmodified_known_graphemes_only(self):
        text = "سلام؟"
        self.assertEqual(require_raw_grapheme_coverage(text, self.inventory), text)


if __name__ == "__main__":
    unittest.main()

"""Offline regressions for control-gated and orthography-aware ASR proxy."""
import unittest
from ghag_quality_proxy import (
    assess_control, comparison, edit_distance, normalized_words, transcribe,
)


class QualityProxyTests(unittest.TestCase):
    def test_pashto_letters_preserved(self):
        self.assertNotEqual(normalized_words("یې"), normalized_words("يي"))
        self.assertNotEqual(normalized_words("ټول"), normalized_words("تول"))
        self.assertEqual(normalized_words("سلام، تاسو څنګه یاست؟"),
                         ("سلام", "تاسو", "څنګه", "یاست"))

    def test_nfc_and_punctuation_scoring_only(self):
        self.assertEqual(normalized_words("  أَ؟\u00a0سلام۔ "), ("أَ", "سلام"))
        self.assertNotEqual(normalized_words("ه"), normalized_words("ۀ"))

    def test_edit_and_word_error(self):
        self.assertEqual(edit_distance("kitten", "sitting"), 3)
        self.assertEqual(edit_distance((), ()), 0)
        result = comparison("سلام تاسو", "سلام")
        self.assertEqual(result["word_error_rate"], 0.5)
        self.assertEqual(len(result["hypothesis_sha256"]), 64)
        self.assertNotIn("سلام", str(result))

    def test_insertions_can_exceed_one(self):
        self.assertGreater(comparison("سلام", "نه نه نه نه")["word_error_rate"], 1)

    def test_empty_reference_rejected(self):
        with self.assertRaisesRegex(ValueError, "empty"):
            comparison("؟!!!", "سلام")

    def test_failed_control_is_inconclusive(self):
        result = assess_control({"character_error_rate": .6},
                                {"character_error_rate": 0, "word_error_rate": 0})
        self.assertFalse(result["control_recognizer_adequate_for_proxy"])
        self.assertIn("INCONCLUSIVE", result["interpretation"])
        self.assertFalse(result["pronunciation_verified"])

    def test_passed_control_never_verifies_pronunciation(self):
        result = assess_control({"character_error_rate": .15},
                                {"character_error_rate": .2, "word_error_rate": .5})
        self.assertTrue(result["control_recognizer_adequate_for_proxy"])
        self.assertFalse(result["pronunciation_verified"])
        self.assertFalse(result["production_ready"])

    def test_recognizer_is_forced_to_pashto(self):
        class Segment:
            def __init__(self, text):
                self.text = text
        class Model:
            def transcribe(self, path, **opts):
                self.opts = opts
                return iter([Segment(" سلام "), Segment(" پښتو ")]), None
        model = Model()
        self.assertEqual(transcribe(model, "/tmp/clip.wav"), "سلام پښتو")
        self.assertEqual(model.opts["language"], "ps")
        self.assertEqual(model.opts["task"], "transcribe")
        self.assertFalse(model.opts["condition_on_previous_text"])


if __name__ == "__main__":
    unittest.main()

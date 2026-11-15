"""Independent numeral candidates MUST NOT be treated as a trained cleaner."""
import unittest
from ghag_number_hypotheses import inspect_standalone_numeral


class PashtoNumberHypothesesTests(unittest.TestCase):
    def test_three_digit_scripts_share_the_same_possible_cardinals(self):
        for symbol in ("5", "٥", "۵"):
            result=inspect_standalone_numeral(symbol)
            self.assertEqual(result["spelling_options"], ["پنځه"])
            self.assertFalse(result["safe_to_synthesize_without_context"])

    def test_zero_ten_and_gender_ambiguity(self):
        self.assertEqual(inspect_standalone_numeral("۰")["spelling_options"], ["صفر"])
        self.assertEqual(inspect_standalone_numeral("10")["spelling_options"], ["لس"])
        self.assertEqual(inspect_standalone_numeral("۱")["spelling_options"], ["یو", "یوه"])
        self.assertTrue(inspect_standalone_numeral("۲")["gender_or_context_sensitive"])

    def test_reject_telephone_prefix_and_out_of_range_values(self):
        self.assertEqual(inspect_standalone_numeral("۰۰۱")["reason"],
                         "leading_zeros_or_identifier")
        self.assertEqual(inspect_standalone_numeral("۱۲")["reason"],
                         "beyond_sourced_standalone_range")
        self.assertEqual(inspect_standalone_numeral("200")["spelling_options"], [])

    def test_reject_unsafe_numerals_and_mixed_text(self):
        for text in ("", "-1", "1.5", "1kg", "۱-۲", "١/٢", "१२", " ۵"):
            with self.subTest(text=text), self.assertRaises(ValueError):
                inspect_standalone_numeral(text)

    def test_no_candidate_is_mistaken_for_verified_pronunciation(self):
        for symbol in ("1", "۱۰", "٩", "7"):
            result=inspect_standalone_numeral(symbol)
            self.assertFalse(result["original_trained_cleaner_verified"])
            self.assertFalse(result["safe_to_synthesize_without_context"])


if __name__=="__main__":
    unittest.main()

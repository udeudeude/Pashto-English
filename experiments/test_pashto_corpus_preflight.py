"""Offline tests use synthetic FLAC STREAMINFO headers, never real speaker data."""
import io
import json
import tarfile
import tempfile
import unittest
from pathlib import Path

from pashto_corpus_preflight import audit, flac_header

BOOK = 'cmvgn8l8u000t08nwtq4u9tr6'
MULTI = 'cmvgn9zo7000x07o4w7lexs8z'


def fake_flac(rate=16000, channels=1, samples=32000):
    packed = (rate << 44) | ((channels - 1) << 41) | ((16 - 1) << 36) | samples
    return b'fLaC' + bytes([0x80, 0, 0, 34]) + bytes(10) + packed.to_bytes(8, 'big') + bytes(16)


def tar_bytes(files, *, extra=None):
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode='w:gz') as archive:
        for name, content in files.items():
            header = tarfile.TarInfo(name)
            header.size = len(content)
            archive.addfile(header, io.BytesIO(content))
        if extra is not None:
            archive.addfile(extra)
    raw.seek(0)
    return raw


class CorpusPreflightTests(unittest.TestCase):
    def setUp(self):
        self.clips = {'audio/one.flac': fake_flac(), 'audio/two.flac': fake_flac(22050, 2, 66150)}
        self.rows = [
            {'audio_file': 'one.flac', 'text': 'سلام، تاسو څنګه یاست؟', 'speaker_id': 'private_1'},
            {'audio_file': 'audio/two.flac', 'text': 'زه اوبه غواړم.', 'speaker_id': 'private_2'}]

    def scan(self, *, files=None, manifest='manifest.jsonl', kind=BOOK, speaker=True, **kwargs):
        files = dict(self.clips if files is None else files)
        if manifest:
            files[manifest] = '\n'.join(json.dumps(x, ensure_ascii=False) for x in self.rows).encode()
        return audit(tar_bytes(files), dataset_id=kind, manifest=manifest,
                     text_field='text' if manifest else None,
                     audio_field='audio_file' if manifest else None,
                     speaker_field='speaker_id' if speaker else None, **kwargs)

    def test_read_only_summary_and_privacy(self):
        result = self.scan()
        self.assertEqual(result['flac_header_count'], 2)
        self.assertEqual(result['manifest_row_count'], 2)
        self.assertEqual(result['distinct_speakers_in_manifest'], 2)
        self.assertTrue(result['all_files_mapped_once'])
        self.assertFalse(result['training_ready'])
        rendered = json.dumps(result, ensure_ascii=False)
        for secret in ['سلام', 'اوبه', 'private_1', 'one.flac']:
            self.assertNotIn(secret, rendered)
        self.assertFalse(result['catalog_counts_match'])

    def test_structural_only_cannot_claim_alignment(self):
        result = self.scan(manifest=None)
        self.assertFalse(result['all_files_mapped_once'])
        self.assertIsNone(result['manifest_row_count'])

    def test_reject_mismatched_and_duplicate_audio(self):
        self.rows[1]['audio_file'] = 'one.flac'
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            self.scan()
        self.rows[1]['audio_file'] = 'missing.flac'
        with self.assertRaisesRegex(ValueError, 'Missing or ambiguous'):
            self.scan()

    def test_reject_missing_and_non_pashto_text(self):
        for invalid in ['English only', '', 'x' * 501]:
            with self.subTest(invalid=invalid[:15]):
                self.rows[0]['text'] = invalid
                with self.assertRaisesRegex(ValueError, 'transcript'):
                    self.scan()

    def test_reject_missing_speaker_metadata(self):
        self.rows[1]['speaker_id'] = ''
        with self.assertRaisesRegex(ValueError, 'speaker'):
            self.scan()

    def test_safe_tar_rejects_traversal_and_links(self):
        for name in ['../evil.flac', '/etc/passwd', 'audio\\bad.flac', 'x/./bad.flac']:
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'Unsafe'):
                audit(tar_bytes({name: fake_flac()}), dataset_id=BOOK)
        link = tarfile.TarInfo('audio/link.flac')
        link.type = tarfile.SYMTYPE
        link.linkname = 'audio/one.flac'
        with self.assertRaisesRegex(ValueError, 'links or special'):
            audit(tar_bytes(self.clips, extra=link), dataset_id=BOOK)

    def test_bad_headers_rejected(self):
        for data in [b'ID3' + bytes(39), b'fLaC' + bytes(38), fake_flac(samples=0)]:
            with self.subTest(data=data[:4]), self.assertRaises(ValueError):
                audit(tar_bytes({'audio/clip.flac': data}), dataset_id=BOOK)

    def test_truncated_header_is_a_clean_rejection(self):
        with self.assertRaisesRegex(ValueError, 'STREAMINFO'):
            flac_header(b'fLaC', 42)

    def test_bounds_and_allowlist(self):
        with self.assertRaisesRegex(ValueError, 'allowlist'):
            audit(tar_bytes(self.clips), dataset_id='some-other-id')
        with self.assertRaisesRegex(ValueError, 'Too many'):
            audit(tar_bytes(self.clips), dataset_id=BOOK, max_files=1)
        with self.assertRaisesRegex(ValueError, 'Manifest requires'):
            audit(tar_bytes(self.clips), dataset_id=MULTI, manifest='manifest.tsv')

    def test_accept_common_tar_root_prefix_without_accepting_traversal(self):
        result = self.scan(files={'./audio/one.flac': fake_flac(),
                                  './audio/two.flac': fake_flac(22050, 2, 66150)})
        self.assertEqual(result['flac_header_count'], 2)
        self.assertTrue(result['all_files_mapped_once'])

    def test_archive_path_interface_without_audio_extraction(self):
        with tempfile.TemporaryDirectory() as directory:
            archive_path = Path(directory) / 'licensed-archive.tar.gz'
            archive_path.write_bytes(tar_bytes(self.clips).getvalue())
            before = sorted(item.name for item in Path(directory).iterdir())
            report = audit(str(archive_path), dataset_id=BOOK)
            self.assertEqual(report['flac_header_count'], 2)
            self.assertEqual(before, sorted(item.name for item in Path(directory).iterdir()))

    def test_tsv_manifest(self):
        files = dict(self.clips)
        files['manifest.tsv'] = 'audio_file\ttext\tspeaker_id\none.flac\tسلام\ta\naudio/two.flac\tمننه\tb\n'.encode()
        result = audit(tar_bytes(files), dataset_id=MULTI, manifest='manifest.tsv',
                       text_field='text', audio_field='audio_file', speaker_field='speaker_id')
        self.assertEqual(result['manifest_row_count'], 2)

    def test_forged_flac_header_does_not_claim_audio_quality(self):
        record = flac_header(fake_flac(), 42)
        self.assertEqual(record['duration'], 2)
        report = self.scan()
        self.assertFalse(report['flac_decoding_verified'])
        self.assertFalse(report['pronunciation_verified'])


if __name__ == '__main__':
    unittest.main()

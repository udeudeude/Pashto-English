"""Offline, read-only Pashto speech corpus integrity gate.

Use only on archives obtained through the distributor's approved download flow.
Never extracts archive content or prints audio, transcripts or speaker identifiers.
Passing the gate does NOT validate speech quality, linguistic correctness or consent.
"""
import argparse
import csv
import io
import json
import re
import tarfile
from collections import Counter
from pathlib import PurePosixPath

MAX_FILES = 25000
MAX_MEMBER = 80 * 1024 * 1024
MAX_TOTAL = 3 * 1024 * 1024 * 1024
MAX_MANIFEST = 32 * 1024 * 1024
MAX_ROW = 16000
PS_LETTER = re.compile(r"[\u0621-\u064a\u0671-\u06d3]")

CATALOG = {
    'cmvgn8l8u000t08nwtq4u9tr6': {'clips': 1810, 'speakers': 1, 'hours': 5.478},
    'cmvgn9zo7000x07o4w7lexs8z': {'clips': 3880, 'speakers': 5, 'hours': 8.914},
}


def safe_path(raw):
    if not isinstance(raw, str) or not raw or '\\' in raw or '\x00' in raw:
        raise ValueError('Unsafe archive path')
    if raw.startswith('./'):
        raw = raw[2:]  # Common tar root prefix; nested dot segments still fail.
    path = PurePosixPath(raw)
    if path.is_absolute() or any(p in ('..', '.', '') for p in raw.split('/')):
        raise ValueError('Unsafe archive path')
    return str(path)


def flac_header(header, size):
    """Check STREAMINFO bounds; never claim to decode or listen to a recording."""
    if size < 42 or header[:4] != b'fLaC' or header[4] & 0x7f != 0:
        raise ValueError('Not an ordinary FLAC STREAMINFO header')
    length = int.from_bytes(header[5:8], 'big')
    if length != 34:
        raise ValueError('Invalid FLAC STREAMINFO length')
    flags = int.from_bytes(header[18:26], 'big')
    rate, channels = flags >> 44, ((flags >> 41) & 7) + 1
    bits = ((flags >> 36) & 31) + 1
    samples = flags & ((1 << 36) - 1)
    if not 8000 <= rate <= 192000 or not 1 <= channels <= 2 or not 8 <= bits <= 32:
        raise ValueError('Unexpected FLAC format')
    duration = samples / rate
    if not .25 <= duration <= 60:
        raise ValueError('Invalid speech segment duration')
    return {'sample_rate': rate, 'channels': channels, 'bit_depth': bits,
            'duration': duration}


def manifest_rows(payload, kind):
    if kind == 'jsonl':
        for line in payload.splitlines():
            if not line.strip():
                continue
            if len(line) > MAX_ROW:
                raise ValueError('Unbounded manifest row')
            row = json.loads(line)
            if not isinstance(row, dict):
                raise ValueError('Invalid JSONL manifest object')
            yield row
    elif kind == 'tsv':
        text = payload.decode('utf-8-sig')
        for row in csv.DictReader(io.StringIO(text), delimiter='\t'):
            yield row
    else:
        raise ValueError('Only JSONL or TSV manifests are permitted')


def resolve_clip(value, clips, basenames):
    if not isinstance(value, str) or not value:
        raise ValueError('Manifest has no audio path')
    name = safe_path(value)
    if name in clips:
        return name
    # Some manifests store audio basename only. Permit this only when unique.
    matches = basenames.get(PurePosixPath(name).name, ())
    if len(matches) == 1:
        return matches[0]
    raise ValueError('Missing or ambiguous audio reference')


def audit(path, *, dataset_id, manifest=None, text_field=None,
          audio_field=None, speaker_field=None, max_files=MAX_FILES):
    """Return aggregate metrics only. Never unpack files to disk."""
    if dataset_id not in CATALOG:
        raise ValueError('Dataset not on manually reviewed catalog allowlist')
    if bool(manifest) != bool(text_field and audio_field):
        raise ValueError('Manifest requires explicit text/audio field names')
    if max_files < 1 or max_files > MAX_FILES:
        raise ValueError('Invalid file cap')
    manifest = safe_path(manifest) if manifest else None
    if manifest and not manifest.endswith(('.jsonl', '.tsv')):
        raise ValueError('Unsupported manifest format')
    clips = {}
    basenames = {}
    seen = set()
    meta = None
    total_bytes = 0
    files = 0
    archive_stream = (tarfile.open(fileobj=path, mode='r|gz') if hasattr(path, 'read')
                      else tarfile.open(name=path, mode='r|gz'))
    with archive_stream as archive:
        for member in archive:
            if member.isdir() and member.name in ('.', './'):
                continue
            filename = safe_path(member.name.rstrip('/') if member.isdir() else member.name)
            if member.isdir():
                continue
            if not member.isfile():
                raise ValueError('Archive contains links or special files')
            files += 1
            if files > max_files or filename in seen:
                raise ValueError('Too many entries or duplicate archive paths')
            seen.add(filename)
            if member.size > MAX_MEMBER or member.size < 0:
                raise ValueError('Unbounded archive member')
            total_bytes += member.size
            if total_bytes > MAX_TOTAL:
                raise ValueError('Unbounded decompressed archive')
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError('Missing regular-file stream')
            if filename.lower().endswith('.flac'):
                details = flac_header(stream.read(42), member.size)
                clips[filename] = details
                basenames.setdefault(PurePosixPath(filename).name, []).append(filename)
            elif filename == manifest:
                if member.size > MAX_MANIFEST:
                    raise ValueError('Manifest exceeds memory cap')
                meta = stream.read(MAX_MANIFEST + 1)
                if len(meta) != member.size:
                    raise ValueError('Incomplete manifest')
    if not clips:
        raise ValueError('No FLAC recordings in archive')
    if not manifest:
        aligned = False
        speaker_count = None
        row_count = None
    else:
        if meta is None:
            raise ValueError('Requested manifest is absent')
        used = set()
        speakers = Counter()
        row_count = 0
        for row in manifest_rows(meta, manifest.rsplit('.', 1)[1]):
            row_count += 1
            if row_count > MAX_FILES:
                raise ValueError('Too many transcript rows')
            text = row.get(text_field)
            if not isinstance(text, str) or not 1 <= len(text.strip()) <= 500 or not PS_LETTER.search(text):
                raise ValueError('Missing or unsupported Pashto-script transcript')
            audio = resolve_clip(row.get(audio_field), clips, basenames)
            if audio in used:
                raise ValueError('Duplicate transcript-to-audio mapping')
            used.add(audio)
            if speaker_field:
                speaker = row.get(speaker_field)
                if not isinstance(speaker, str) or not speaker.strip() or len(speaker) > 100:
                    raise ValueError('Missing or invalid speaker value')
                speakers[speaker] += 1
        if used != set(clips):
            raise ValueError('Every FLAC file must have one matching transcript')
        aligned = True  # File associations, NOT speech-text acoustic alignment.
        speaker_count = len(speakers) if speaker_field else None
    by_rate = Counter(clip['sample_rate'] for clip in clips.values())
    by_channels = Counter(clip['channels'] for clip in clips.values())
    seconds = sum(clip['duration'] for clip in clips.values())
    published = CATALOG[dataset_id]
    return {
        'dataset_id': dataset_id, 'archive_entry_count': files,
        'flac_header_count': len(clips),
        'flac_duration_hours': round(seconds / 3600, 4),
        'sample_rates': dict(sorted(by_rate.items())),
        'channel_counts': dict(sorted(by_channels.items())),
        'manifest_row_count': row_count,
        'all_files_mapped_once': aligned,
        'distinct_speakers_in_manifest': speaker_count,
        'catalog_clip_count': published['clips'],
        'catalog_hours': published['hours'],
        'catalog_counts_match': len(clips) == published['clips'],
        'catalog_duration_within_one_percent': abs(seconds / 3600 - published['hours']) <= published['hours'] * .01,
        'speaker_count_matches_catalog': speaker_count == published['speakers'] if speaker_field else None,
        'flac_decoding_verified': False,
        'acoustic_alignment_verified': False,
        'pronunciation_verified': False,
        'speaker_consent_independently_verified': False,
        'training_ready': False,
        'note': 'Read-only structural preflight; no utterances, audio or identities in report.'
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', help='Locally and legitimately obtained .tar.gz archive')
    parser.add_argument('--dataset-id', required=True, choices=sorted(CATALOG))
    parser.add_argument('--manifest', help='Exact path to the JSONL or TSV transcript manifest inside archive')
    parser.add_argument('--text-field', help='Transcript field name (must inspect the original schema)')
    parser.add_argument('--audio-field', help='Audio file field name (must inspect the original schema)')
    parser.add_argument('--speaker-field', help='Optional speaker field for count-only verification')
    args = parser.parse_args()
    result = audit(args.archive, dataset_id=args.dataset_id, manifest=args.manifest,
                   text_field=args.text_field, audio_field=args.audio_field,
                   speaker_field=args.speaker_field)
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == '__main__':
    main()

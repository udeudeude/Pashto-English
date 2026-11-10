"""Fetch a small evaluation subset from Google's original FLEURS archive.
Never print transcripts or preserve recordings in git/artifacts. Output goes to /tmp.
Source: https://huggingface.co/datasets/google/fleurs (CC-BY-4.0, Google).
"""
import base64, csv, io, json, pathlib, tarfile, urllib.request

def read_url(url):
    return urllib.request.urlopen(url, timeout=90)

def prepare(destination):
    with read_url('https://huggingface.co/api/datasets/google/fleurs') as response:
        revision = json.load(response)['sha']
    root = f'https://huggingface.co/datasets/google/fleurs/resolve/{revision}/data/ps_af/'
    with read_url(root + 'test.tsv') as response:
        rows = list(csv.reader(io.StringIO(response.read().decode('utf-8')), delimiter='\t'))
    selected = {}
    references = set()
    for index, row in enumerate(rows):
        # Original FLEURS TSV: id, filename, raw text, normalized text,
        # character transcript, sample count, gender. Do not retain gender/id.
        if len(row) != 7:
            raise ValueError('Unexpected source transcript schema')
        samples = int(row[5])
        if 3200 <= samples <= 320000 and row[3] not in references:
            selected[row[1]] = {'rowIndex': index, 'reference': row[3]}
            references.add(row[3])
        if len(selected) == 8:
            break
    if len(selected) != 8:
        raise ValueError('Insufficient eligible clips')
    with read_url(root + 'audio/test.tar.gz') as response:
        # Streaming read, never extract archive paths to the filesystem.
        with tarfile.open(fileobj=response, mode='r|gz') as archive:
            remaining = set(selected)
            for member in archive:
                name = pathlib.PurePosixPath(member.name).name
                if name in remaining and member.isfile():
                    if member.size > 4_000_000:
                        raise ValueError('Unexpected audio size')
                    selected[name]['audioBase64'] = base64.b64encode(archive.extractfile(member).read()).decode('ascii')
                    remaining.remove(name)
                    if not remaining:
                        break
            if remaining:
                raise ValueError('Archive missing selected clips')
    report = {'datasetRevision': revision, 'clips': sorted(selected.values(), key=lambda x: x['rowIndex'])}
    pathlib.Path(destination).write_text(json.dumps(report), encoding='utf-8')
    print(json.dumps({'preparedClips': 8, 'datasetRevision': revision}))

if __name__ == '__main__':
    prepare('/tmp/pashto-evaluation.json')

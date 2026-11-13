#!/usr/bin/env python3
"""Diagnose the exact upstream Ghag text-cleaner dependency, without weights."""
import json
from pathlib import Path
from huggingface_hub import hf_hub_download

REPO='Nasimbahar/pashto-ghag-yourtts'
REV='4b2521265c173a1f6b2df9584a57046cdbe614a9'
config=json.loads(Path(hf_hub_download(repo_id=REPO,filename='config.json',revision=REV)).read_text())
helper=Path(hf_hub_download(repo_id=REPO,filename='hf_infer_pashto_ghag_yourtts.py',revision=REV)).read_text()
result={'revision':REV,'text_cleaner':config.get('text_cleaner'),
        'use_phonemes':config.get('use_phonemes'),
        'characters':config.get('characters'),
        'helper_cleaner_lines':[line.strip() for line in helper.splitlines() if 'cleaner' in line.lower()],
        'finding':'Original Coqui TTS 0.22.0 cannot resolve pashto_grapheme_cleaners; must reproduce the original cleaner, not silently replace it.',
        'inference_verified':False}
out=Path('experiment-results/ghag/text-frontend.json')
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(out.read_text())

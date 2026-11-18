#!/usr/bin/env python3
"""Inspect the pinned Ghag text frontend and speaker metadata without loading pickle.

Print bounded public metadata; never unpickle untrusted checkpoint files.
"""
import json
from pathlib import Path
from huggingface_hub import hf_hub_download

REPO='Nasimbahar/pashto-ghag-yourtts'
REVISION='4b2521265c173a1f6b2df9584a57046cdbe614a9'
NAMES=['config.json','config_se.json','KNOWN_SPEAKERS.json','hf_infer_pashto_ghag_yourtts.py','USAGE.md']

def inspect():
    result={'revision':REVISION,'files':{},'inference_verified':False,'speaker_encoder_eliminated':False}
    for name in NAMES:
        path=Path(hf_hub_download(repo_id=REPO,filename=name,revision=REVISION))
        raw=path.read_text(encoding='utf-8')
        entry={'bytes':path.stat().st_size}
        if name.endswith('.json'):
            data=json.loads(raw)
            entry['top_level_keys']=list(data)[:60] if isinstance(data,dict) else []
            if name=='KNOWN_SPEAKERS.json':
                entry['speaker_count']=len(data)
                entry['speaker_labels']=list(data)[:20] if isinstance(data,dict) else []
            if name=='config.json':
                entry['model']=data.get('model')
                entry['audio']=data.get('audio')
                entry['use_speaker_embedding']=data.get('use_speaker_embedding')
                entry['use_d_vector_file']=data.get('use_d_vector_file')
                entry['d_vector_dim']=data.get('d_vector_dim')
        elif name.endswith('.py'):
            entry['references']=[line.strip()[:200] for line in raw.splitlines()
                if any(term in line.lower() for term in ('speaker','d_vector','model_se','tts_to_file','tts.tts','language'))][:35]
        result['files'][name]=entry
    return result

if __name__=='__main__':
    output=Path('experiment-results/ghag/speaker-analysis.json')
    output.parent.mkdir(parents=True,exist_ok=True)
    try:
        result=inspect()
    except Exception as exc:
        result={'revision':REVISION,'error':{'type':type(exc).__name__,'message':str(exc)},'inference_verified':False}
    output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(output.read_text())
    if 'error' in result:raise SystemExit(1)

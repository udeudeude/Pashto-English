# Verified Ghag upstream artifact inventory (2026-11-13)

GitHub Actions run [43498861959](https://github.com/udeudeude/Pashto-English/actions/runs/43498861959) completed successfully. The workflow retrieved public Hugging Face metadata and executed the pinned `inspect` stage. No weights were downloaded and no speech was generated.

- Repository: `Nasimbahar/pashto-ghag-yourtts`
- Exact revision: `4b2521265c173a1f6b2df9584a57046cdbe614a9`
- Model-card declared license: `apache-2.0` (does not independently establish rights in training recordings)
- Main checkpoint `best_model.pth`: **1,078,558,774 bytes**
- Speaker encoder `model_se.pth`: **44,610,930 bytes**
- `speakers.pth`: 2,605 bytes
- `config.json`: 7,194 bytes
- `config_se.json`: 3,548 bytes
- `KNOWN_SPEAKERS.json`: 4,862 bytes
- `hf_infer_pashto_ghag_yourtts.py`: present

The main checkpoint and speaker encoder together are **1,123,169,704 bytes** before tokenizer, runtime and memory overhead. This makes direct, uncompressed iPhone deployment impractical as a default. Quantization and/or distillation are research requirements, not demonstrated solutions.

**Verification boundary:** Metadata inspection succeeded; checkpoint download, original Coqui inference, neural audio generation, ONNX export, and iPhone browser execution remain unverified. Avoid labeling this a neural voice release.

Next: inspect upstream inference script and configurations, determine whether the 44.6 MB speaker encoder can be eliminated at inference through cached embeddings, and run the original checkpoint in a bounded environment. Record peak memory and time-to-first-audio before considering conversion.

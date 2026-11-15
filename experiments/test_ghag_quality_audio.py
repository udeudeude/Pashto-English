"""Regression for ffmpeg-free, bounded actual waveform decoding."""
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import soundfile as sf

from ghag_quality_probe import decode_bounded_waveform, recognize


class AudioDecoderTests(unittest.TestCase):
    def create_audio(self, directory, rate, seconds, *, stereo=False, silent=False):
        waveform=np.zeros(round(rate*seconds),dtype=np.float32)
        if not silent:
            t=np.arange(waveform.size,dtype=np.float32)/rate
            waveform=.12*np.sin(2*np.pi*160*t).astype(np.float32)
        if stereo:
            waveform=np.stack((waveform,waveform),axis=-1)
        path=Path(directory)/"control.wav"
        sf.write(path,waveform,rate,subtype="PCM_16")
        return path

    def test_mono_and_stereo_normalize_to_whisper_sixteen_kilohertz(self):
        with tempfile.TemporaryDirectory() as directory:
            for rate in (16000,22050,48000):
                for stereo in (False,True):
                    with self.subTest(rate=rate,stereo=stereo):
                        path=self.create_audio(directory,rate,2,stereo=stereo)
                        decoded=decode_bounded_waveform(path)
                        self.assertEqual(decoded.ndim,1)
                        self.assertEqual(decoded.dtype,np.float32)
                        self.assertEqual(decoded.size,32000)
                        self.assertGreater(float(np.max(np.abs(decoded))),.01)

    def test_silent_short_missing_and_corrupt_files_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path=self.create_audio(directory,16000,2,silent=True)
            with self.assertRaisesRegex(ValueError,"Silent"):
                decode_bounded_waveform(path)
            path=self.create_audio(directory,16000,.05)
            with self.assertRaisesRegex(ValueError,"Empty"):
                decode_bounded_waveform(path)
            path.write_bytes(b"not a waveform")
            with self.assertRaises(Exception):
                decode_bounded_waveform(path)
            with self.assertRaisesRegex(ValueError,"Missing"):
                decode_bounded_waveform(Path(directory)/"not-found.wav")

    def test_whisper_never_invokes_ffmpeg_audio_loader(self):
        with tempfile.TemporaryDirectory() as directory:
            wav=self.create_audio(directory,16000,2)
            import sys
            class FakeMel:
                def to(self,device):
                    return self
            forbidden=lambda *a,**kw: (_ for _ in ()).throw(
                AssertionError("External ffmpeg loader must never be called"))
            fake=SimpleNamespace(
                load_audio=forbidden,
                pad_or_trim=lambda arr: arr,
                log_mel_spectrogram=lambda arr,n_mels: FakeMel(),
            )
            class Model:
                dims=SimpleNamespace(n_mels=80)
                device="cpu"
                def detect_language(self,mel):
                    return None,{"ps":.9,"en":.1}
                def transcribe(self,arr,**kwargs):
                    assert isinstance(arr,np.ndarray)
                    assert arr.dtype==np.float32
                    assert kwargs["language"]=="ps"
                    return {"text":"سلام"}
            with patch.dict(sys.modules,{"whisper":fake}):
                transcript,metrics=recognize(Model(),wav)
            self.assertEqual(transcript,"سلام")
            self.assertEqual(metrics["detected_language"],"ps")


if __name__=="__main__":
    unittest.main()

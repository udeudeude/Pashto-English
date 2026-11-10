// Reject digital silence and corrupt decoder output before Whisper can invent
// words. This is NOT voice activity detection: noise can still yield hallucinations.
export function validateRecognitionAudio(samples){
 if(!(samples instanceof Float32Array)||samples.length<3200)
  throw Error('No audio or recording too short.');
 if(samples.length>21*16000)throw Error('Recording is too long.');
 let peak=0;
 for(const sample of samples){
  if(!Number.isFinite(sample))throw Error('No usable audio was decoded.');
  peak=Math.max(peak,Math.abs(sample));
 }
 // About -100 dBFS: deliberately conservative, preserving quiet real speech.
 if(peak<=0.00001)throw Error('No audio signal was recorded.');
 return samples;
}

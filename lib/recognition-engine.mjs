// Shared by the app and opt-in evaluations; models run locally in a worker.
export const DEFAULT_RECOGNITION_MODEL={
 model:'onnx-community/whisper-tiny',
 revision:'ff4177021cc41f7db950912b73ea4fdf7d01d8e7',
};
export async function loadRecognitionEngine({model,revision}=DEFAULT_RECOGNITION_MODEL){
 const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
 env.allowLocalModels=false;
 env.backends.onnx.wasm.numThreads=1;
 env.backends.onnx.wasm.proxy=false;
 return pipeline('automatic-speech-recognition',model,{revision,dtype:'q8',device:'wasm'});
}
export const PASHTO_TRANSCRIPTION_OPTIONS={language:'pashto',task:'transcribe'};

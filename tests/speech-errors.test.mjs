import test from 'node:test';
import assert from 'node:assert/strict';
import {explainPashtoRecognitionFailure} from '../lib/speech-errors.mjs';
test('WebAssembly backend failure is described without dumping the raw error',()=>{
 const message=explainPashtoRecognitionFailure(new Error('ERR: [wasm] RuntimeError: Aborted(both async and sync fetching of the wasm failed). Build with -sASSERTIONS for more info.'));
 assert.match(message,/Pashto speech recognition could not start/);
 assert.match(message,/پښتو/);
 assert.doesNotMatch(message,/RuntimeError|Aborted|ASSERTIONS|wasm failed/i);
});
test('microphone access failure has actionable bilingual wording',()=>{
 const message=explainPashtoRecognitionFailure(new Error('NotAllowedError: permission denied'));
 assert.match(message,/Microphone permission was denied/);
 assert.match(message,/مایکروفون/);
});
test('other failures never leak untrusted raw error text into the interface',()=>{
 const message=explainPashtoRecognitionFailure(new Error('UNKNOWN PRIVATE ERROR OR AUDIO TRANSCRIPT'));
 assert.match(message,/Pashto speech recognition failed/);
 assert.doesNotMatch(message,/PRIVATE|TRANSCRIPT/);
});
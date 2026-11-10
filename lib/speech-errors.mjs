// Human-readable Pashto recognition failures; retain technical details in logs.
export function explainPashtoRecognitionFailure(error){
 const detail=String(error?.message||error||'Unknown error');
 if(/wasm|webassembly|backend|no available backend|runtimeerror|fetching.*failed|aborted\(/i.test(detail))
  return 'Pashto speech recognition could not start on this phone. The local speech engine failed to load. / په دې تلیفون کې د پښتو غږ پېژندنه پیل نه شوه. د غږ پېژندنې سیستم ونه چلېد.';
 if(/notallowederror|permission|denied/i.test(detail))
  return 'Microphone permission was denied. Enable microphone access in the browser settings. / مایکروفون ته اجازه نه ده ورکړل شوې. د براوزر په امستنو کې اجازه ورکړئ.';
 if(/memory|allocation|out of memory/i.test(detail))
  return 'This phone does not have enough available memory for Pashto recognition. / په دې تلیفون کې د پښتو غږ پېژندنې لپاره کافي حافظه نشته.';
 if(/no audio|too short|empty/i.test(detail))
  return 'No usable speech was recorded. Please try speaking again. / د کار وړ خبرې ثبت نه شوې. مهرباني وکړئ بیا خبرې وکړئ.';
 return 'Pashto speech recognition failed. Please try again. / د پښتو غږ پېژندنه ناکامه شوه. مهرباني وکړئ بیا هڅه وکړئ.';
}
// Generate a real, locally hosted QR encoding the precise public app URL.
// Run: node scripts/generate-share-qr.mjs
import QRCode from 'qrcode';
import { mkdir, writeFile } from 'node:fs/promises';
const appUrl='https://udeudeude.github.io/Pashto-English/';
const output='assets/resources/share-app.svg';
await mkdir('assets/resources',{recursive:true});
const svg=await QRCode.toString(appUrl,{
 type:'svg',errorCorrectionLevel:'H',margin:3,width:320,
 color:{dark:'#16283B',light:'#FFFFFFFF'}
});
await writeFile(output,svg,'utf8');
console.log('Generated '+output+' for '+appUrl);

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import QRCode from 'qrcode';

test('QR SVG exactly encodes the live Pashto-English website',async()=>{
 const expected=await QRCode.toString('https://udeudeude.github.io/Pashto-English/',{
  type:'svg',errorCorrectionLevel:'H',margin:3,width:320,
  color:{dark:'#16283B',light:'#FFFFFFFF'}
 });
 const actual=await readFile('assets/resources/share-app.svg','utf8');
 assert.equal(actual,expected,'The published QR must encode the exact app URL');
 assert.ok(actual.includes('<svg'));
 assert.ok(actual.length>2500,'A full QR matrix is expected');
});
test('resource screenshots are present, real images, not text placeholders',async()=>{
 for(const name of ['heston-homepage.png','parsemus-homepage.png']){
  const bytes=await readFile('assets/resources/'+name);
  assert.ok(bytes.length>5000,name+' screenshot missing or empty');
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' must be a genuine PNG file');
  assert.equal(bytes.readUInt32BE(16),1200,'Capture the full homepage width');
  assert.equal(bytes.readUInt32BE(20),720,'Capture the full homepage height');
 }
});


test('share QR precedes resources and compatibility, without redundant scan instructions',async()=>{
 const html=await readFile('index.html','utf8');
 const share=html.indexOf('<section class="panel share-section"');
 const resources=html.indexOf('<section class="panel resource-section"');
 const selfTest=html.indexOf('id="self-test"');
 const privacy=html.indexOf('<summary>Compatibility and privacy');
 assert.ok(share>=0&&resources>share&&selfTest>resources&&privacy>selfTest,'Expected QR, resources, self-test, then compatibility and privacy');
 assert.ok(!html.includes('Scan with another phone’s camera'));
 assert.ok(!html.includes('د بل تلیفون په کامره دا کوډ سکن کړئ'));
 assert.ok(html.includes('assets/resources/share-app.svg'));
});

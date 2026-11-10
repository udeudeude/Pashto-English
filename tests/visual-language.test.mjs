import test from 'node:test';
import assert from 'node:assert/strict';
import {extractVisualConcepts} from '../lib/visual-language.mjs';
const known=[
 {label:'ladder',forms:['ladder','ladders'],emoji:'🪜'},
 {label:'book',forms:['book','books'],emoji:'📖'},
 {label:'read',forms:['read','reading'],emoji:'📖'},
 {label:'good',forms:['good','better'],emoji:'👍'},
 {label:'big',forms:['big','bigger','biggest'],emoji:'📐'},
 {label:'bike',forms:['bicycle','bicycles'],emoji:'🚲'},
 {label:'cashew',forms:['cashew','cashews'],emoji:'❔'},
 {label:'jar',forms:['jar','jars'],emoji:'🫙'},
 {label:'shelf',forms:['shelf','shelves'],emoji:'❔'}
];
const select=text=>extractVisualConcepts(text,known).map(c=>c.label);
test('one picture per meaning-bearing concept in original English order',()=>{
 assert.deepEqual(select('I need a ladder to reach the cashews in the jar on the shelf'),
  ['need','ladder','reach','cashew','jar','shelf']);
});
test('auxiliary words, pronouns and quantifiers do not create misleading pictures',()=>{
 assert.deepEqual(select('Have you read any good books by me?'),['read','good','book']);
 assert.deepEqual(select('I have had any of them with you.'),[]);
});
test('content words not in the fixed vocabulary remain eligible for a real picture search',()=>{
 const parts=extractVisualConcepts('We need a telescope to observe the stars.',known);
 assert.deepEqual(parts.map(c=>c.label),['need','telescope','observe','star']);
 assert.deepEqual(parts.filter(c=>c.unknown).map(c=>c.label),['telescope','observe','star']);
});
test('irregular forms and suffixes do not cause lost or scrambled concepts',()=>{
 assert.deepEqual(select('The women brought the books and wrote a message.'),
 ['woman','bring','book','write','message']);
});
test('common expressions can be pictured as a single concept',()=>{
 assert.deepEqual(select('Thank you. Please sit down.'),['thanks','sit']);
});
test('picture count can be capped for long utterances',()=>{
 assert.equal(extractVisualConcepts('I need water and food and a towel and a bottle',known,{max:2}).length,2);
});

test('cashew stays a recognized concept, not a peanut substitute',()=>{
 const [item]=extractVisualConcepts('cashews',[]);
 assert.equal(item.label,'cashew');
 assert.equal(item.unknown,undefined);
 assert.notEqual(item.emoji,'🥜');
});

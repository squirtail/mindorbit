import test from 'node:test';
import assert from 'node:assert/strict';
import {extractJournalFeatures,analyzeJournalPatterns,journalSummaryForAI} from '../src/journal-analysis.js';
import {migrateState} from '../src/storage.js';
test('journal features are descriptive counts and contain no source words or entry text',()=>{
  const f=extractJournalFeatures({id:'entry-1',date:'2026-11-14',text:'Hello hello. Orbit!'});
  assert.equal(f.wordCount,3);assert.equal(f.uniqueWordCount,2);assert.equal(f.lexicalDiversity,.667);assert.equal(f.sentenceCount,2);
  assert.equal(f.text,undefined);assert.equal(f.words,undefined);assert.doesNotMatch(JSON.stringify(f),/Hello|Orbit/);
});
test('journal comparison requires entries on separate days in both periods',()=>{
  const features=['2026-11-01','2026-11-03','2026-11-10','2026-11-12'].map((date,i)=>extractJournalFeatures({id:String(i),date,text:i<2?'A quiet ordinary day.':'A longer reflection on a quiet and ordinary day aboard the station.'}));
  const result=analyzeJournalPatterns(features,{asOf:'2026-11-14'});assert.equal(result.enough,true);assert.ok(result.wordCountChange>0);assert.match(result.interpretation,/not evidence/);
  assert.equal(analyzeJournalPatterns(features.slice(-2),{asOf:'2026-11-14'}).enough,false);
});
test('AI summary explicitly excludes raw entries, identifiers, and injected extra fields',()=>{
  const p={enough:true,previous:{start:'2026-11-01',end:'2026-11-07',entries:2,days:2,meanWords:8,meanLexicalDiversity:.8,meanSentenceWords:4,text:'Secret',entryId:'private-id'},recent:{start:'2026-11-08',end:'2026-11-14',entries:2,days:2,meanWords:10,meanLexicalDiversity:.7,meanSentenceWords:5,text:'Secret'}};
  assert.doesNotMatch(JSON.stringify(journalSummaryForAI(p)),/Secret|private-id|"text"/);
});
test('empty or punctuation-only writing cannot produce a trend',()=>{
  const f=extractJournalFeatures({id:'a',date:'2026-11-14',text:'... !!!'});assert.equal(f.wordCount,0);assert.equal(analyzeJournalPatterns([f],{asOf:'2026-11-14'}).enough,false);
});
test('storage migration preserves private entries and defaults analysis off without creating features',()=>{
  const old={journal:[{id:'a',text:'Keep me'}],chat:[{text:'Also keep me'}]};
  const migrated=migrateState(old);assert.deepEqual(migrated.journal,old.journal);assert.deepEqual(migrated.chat,old.chat);assert.equal(migrated.journalAnalysis.enabled,false);assert.deepEqual(migrated.journalAnalysis.features,[]);
  assert.deepEqual(migrateState({...old,journalAnalysis:{enabled:false,features:[{wordCount:3}]}}).journalAnalysis.features,[]);
});

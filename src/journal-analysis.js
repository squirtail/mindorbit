import {dayKey,shiftDay,average,rounded} from './engine.js';

export function extractJournalFeatures(entry){
  if(!entry||typeof entry.text!=='string'||!dayKey(entry.date))throw new Error('A dated journal entry is required.');
  const normalized=entry.text.normalize('NFKC').toLocaleLowerCase();
  const words=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'word'}).segment(normalized)].filter(s=>s.isWordLike).map(s=>s.segment):normalized.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu)||[];
  const sentences=entry.text.split(/[.!?。！？]+/u).filter(s=>/[\p{L}\p{N}]/u.test(s)).length;
  const wordCount=words.length;
  return {entryId:entry.id,date:entry.date,wordCount,uniqueWordCount:new Set(words).size,lexicalDiversity:wordCount?rounded(new Set(words).size/wordCount,3):0,sentenceCount:sentences,averageSentenceWords:sentences?rounded(wordCount/sentences):0,version:1};
}
export function analyzeJournalPatterns(features,{asOf=new Date(),windowDays=7}={}){
  const end=dayKey(asOf),recentStart=shiftDay(end,-windowDays+1),previousEnd=shiftDay(recentStart,-1),previousStart=shiftDay(previousEnd,-windowDays+1);
  const valid=features.filter(f=>dayKey(f.date)&&f.wordCount>0&&Number.isFinite(f.lexicalDiversity));
  const period=(start,finish)=>{const selected=valid.filter(f=>dayKey(f.date)>=start&&dayKey(f.date)<=finish);return {start,end:finish,entries:selected.length,days:new Set(selected.map(f=>dayKey(f.date))).size,meanWords:rounded(average(selected.map(f=>f.wordCount))),meanLexicalDiversity:rounded(average(selected.map(f=>f.lexicalDiversity)),3),meanSentenceWords:rounded(average(selected.map(f=>f.averageSentenceWords)))};};
  const previous=period(previousStart,previousEnd),recent=period(recentStart,end),enough=previous.entries>=2&&recent.entries>=2&&previous.days>=2&&recent.days>=2;
  return {kind:'descriptive-journal-patterns',previous,recent,enough,wordCountChange:enough?rounded(recent.meanWords-previous.meanWords):null,lexicalDiversityChange:enough?rounded(recent.meanLexicalDiversity-previous.meanLexicalDiversity,3):null,interpretation:enough?'These are descriptive writing differences, not evidence of a psychological condition.':'At least two entries on two different days in each period are needed before comparing patterns.',limitations:'Topic, language, entry length, writing style, and time available affect these features. Sarcasm and distress cannot be inferred reliably from these counts.'};
}
export function journalSummaryForAI(patterns){
  if(!patterns.enough)throw new Error('Not enough entries for a comparison.');
  // Explicit projection: entry IDs, dates of individual entries, words, and raw text never leave this module.
  const project=p=>({start:p.start,end:p.end,entries:p.entries,days:p.days,meanWords:p.meanWords,meanLexicalDiversity:p.meanLexicalDiversity,meanSentenceWords:p.meanSentenceWords});
  return {previous:project(patterns.previous),recent:project(patterns.recent)};
}

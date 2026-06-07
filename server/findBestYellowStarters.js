import { getYellows, score } from './wordleCore.js';
import targetWords from '../data/targetWords.js';

const candidates = targetWords; // or all words? Wordle usually allows any valid word as starter.
const allWords = targetWords; // For simplicity, use target words as candidates too.

const results = [];

for (const g of allWords) {
  let totalYellows = 0;
  for (const w of targetWords) {
    totalYellows += getYellows(score(w, g));
  }
  results.push({ word: g, avgYellows: totalYellows / targetWords.length });
}

results.sort((a, b) => a.avgYellows - b.avgYellows);

console.log('Top 10 starters for minimizing yellows (first guess only):');
console.log(JSON.stringify(results.slice(0, 10), null, 2));

console.log('\nTop 10 starters for maximizing yellows (for comparison):');
console.log(JSON.stringify(results.slice(-10).reverse(), null, 2));

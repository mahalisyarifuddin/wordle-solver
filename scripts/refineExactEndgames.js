// Refine small subtrees of the shipped trees with an exact native optimizer.
// Requires g++ (C++17). The C++ DP is globally optimal for each selected state
// under the current weighted expected-turn objective and Hard Mode constraints.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import targetWords from '../data/targetWords.js';
import guessWords from '../server/guessWords.js';
import { getFrequencyWeights } from '../data/wordFrequencies.js';
import { buildMatrix } from './sogCommon.js';

const NT = targetWords.length;
const NG = guessWords.length;
const threshold = Number(process.argv.find(a => a.startsWith('--max-size='))?.slice(11) || 5);
const dryRun = process.argv.includes('--dry-run');
const selected = process.argv.slice(2).filter(a => !a.startsWith('--'));
const allTrees = [
  ...['tiare', 'trone', 'trace', 'torse', 'tarse', 'roate'].map(w => `data/${w}.tree.total.js`),
  ...['ranid', 'rants', 'manet', 'saner', 'rated', 'lanes'].map(w => `data/${w}.tree.js`),
  ...['tiare', 'trone', 'trace', 'torse', 'tores', 'tarse'].map(w => `data/${w}.tree.hard.js`),
  ...['toise', 'trace', 'toile', 'trone', 'soare', 'thale'].map(w => `data/${w}.tree.capped.js`),
  ...['trace', 'toise', 'trone', 'toile', 'soare', 'torse'].map(w => `data/${w}.tree.hard.capped.js`)
];
const files = selected.length ? selected : allTrees;
if (!(threshold >= 2 && threshold <= 12)) throw new Error('--max-size must be between 2 and 12');

const matrix = new Uint8Array(buildMatrix());
const targetIndex = new Map(targetWords.map((word, index) => [word, index]));
const guessIndex = new Map(guessWords.map((word, index) => [word, index]));
const trees = [];
const queries = [];
const sizeCounts = new Map();
const queryIds = new Map();
let id = 0;

const makeConstraints = () => ({ fixed: Array(5).fill('-'), minCounts: Array(26).fill(0) });
const childConstraints = (constraints, guess, pattern, hard) => {
  if (!hard) return constraints;
  const next = { fixed: constraints.fixed.slice(), minCounts: constraints.minCounts.slice() };
  const present = Array(26).fill(0);
  for (let i = 0; i < 5; i++) {
    const letter = guess.charCodeAt(i) - 97;
    if (pattern[i] === '2') next.fixed[i] = guess[i];
    if (pattern[i] !== '0') present[letter]++;
  }
  for (let i = 0; i < 26; i++) next.minCounts[i] = Math.max(next.minCounts[i], present[i]);
  return next;
};
const scoreInt = score => {
  let value = 0;
  let factor = 1;
  for (let i = 0; i < 5; i++) { value += (score.charCodeAt(i) - 48) * factor; factor *= 3; }
  return value;
};

for (const file of files) {
  const contents = fs.readFileSync(file, 'utf8');
  const tree = JSON.parse(contents.slice(contents.indexOf('{')));
  const hard = file.includes('.hard');
  const metric = file.endsWith('.tree.js') && !hard ? 1 : (file.includes('.capped.js') ? 2 : 0);
  const gammaMilli = metric === 2 ? 450 : 0;
  const visit = (node, words, constraints, turnsUsed, assign) => {
    if (words.length >= 2 && words.length <= threshold) {
      const stateKey = `${hard ? 1 : 0}|${metric}|${gammaMilli}|${turnsUsed}|${constraints.fixed.join('')}|${constraints.minCounts.join('')}|${words.join(',')}`;
      let queryId = queryIds.get(stateKey);
      if (queryId === undefined) {
        queryId = id++;
        queryIds.set(stateKey, queryId);
        queries.push({ id: queryId, hard, metric, gammaMilli, turnsUsed, words, constraints });
      }
      sizeCounts.set(words.length, (sizeCounts.get(words.length) || 0) + 1);
      trees.push({ file, tree, assign, queryId });
      return;
    }
    const gi = guessIndex.get(node.guess);
    if (gi === undefined) throw new Error(`Unknown tree guess '${node.guess}' in ${file}`);
    const row = gi * NT;
    for (const [pattern, child] of Object.entries(node.map)) {
      if (typeof child === 'string') continue;
      const wanted = scoreInt(pattern);
      const childWords = [];
      for (const tid of words) if (matrix[row + tid] === wanted) childWords.push(tid);
      if (childWords.length < 2) throw new Error(`Invalid subtree size ${childWords.length} at ${file} ${node.guess}/${pattern}`);
      const nextConstraints = childConstraints(constraints, node.guess, pattern, hard);
      visit(child, childWords, nextConstraints, turnsUsed + 1, replacement => { node.map[pattern] = replacement; });
    }
  };
  visit(tree, Array.from({ length: NT }, (_, i) => i), makeConstraints(), 0, null);
  trees[trees.length - 1].tree = tree;
}

console.log(`Found ${queries.length} exact-refinement subtrees (max size ${threshold}): ${[...sizeCounts].sort((a,b)=>a[0]-b[0]).map(([n,c])=>`${n}:${c}`).join(' ')}`);
if (dryRun) process.exit(0);
if (!queries.length) process.exit(0);

const work = 'computed/exact-endgame';
fs.mkdirSync(work, { recursive: true });
const wordsFile = path.join(work, 'targets.txt');
const guessesFile = path.join(work, 'guesses.txt');
const weightsFile = path.join(work, 'weights.bin');
const requestsFile = path.join(work, 'requests.txt');
const resultsFile = path.join(work, 'results.txt');
const matrixFile = `computed/scores-${NT}x${NG}.bin`;
fs.writeFileSync(wordsFile, targetWords.join('\n') + '\n');
fs.writeFileSync(guessesFile, guessWords.join('\n') + '\n');
fs.writeFileSync(weightsFile, Buffer.from(getFrequencyWeights('wordleAnswers').buffer));
fs.writeFileSync(requestsFile, queries.map(q => {
  const counts = q.constraints.minCounts.map(n => String(n)).join('');
  return [q.id, q.hard ? 1 : 0, q.metric, q.gammaMilli, q.turnsUsed, q.constraints.fixed.join(''), counts, q.words.length, ...q.words].join(' ');
}).join('\n') + '\n');

const executable = path.join(work, 'exactEndgame');
execFileSync('g++', ['-O3', '-std=c++17', 'scripts/exactEndgame.cpp', '-o', executable], { stdio: 'inherit' });
execFileSync(executable, [wordsFile, guessesFile, weightsFile, matrixFile, requestsFile, resultsFile], { stdio: 'inherit' });

const exactTrees = new Map();
for (const line of fs.readFileSync(resultsFile, 'utf8').split('\n')) {
  if (!line) continue;
  const first = line.indexOf('\t');
  const second = line.indexOf('\t', first + 1);
  exactTrees.set(Number(line.slice(0, first)), JSON.parse(line.slice(second + 1)));
}
for (const item of trees) {
  const replacement = exactTrees.get(item.queryId);
  if (!replacement) throw new Error(`Native optimizer omitted subtree ${item.queryId}`);
  if (!item.assign) throw new Error('Cannot replace exact-refinement root');
  item.assign(replacement);
}
const changed = new Set(trees.map(item => item.file));
const yellowsInPattern = pattern => [...pattern].filter(tile => tile === '1').length;
const recomputeRanking = (node, words) => {
  const gi = guessIndex.get(node.guess);
  const row = gi * NT;
  const counts = [];
  let yellows = 0;
  let depth = 0;
  for (const [pattern, child] of Object.entries(node.map)) {
    const wanted = scoreInt(pattern);
    const childWords = words.filter(tid => matrix[row + tid] === wanted);
    if (pattern === '22222') {
      counts[0] = (counts[0] || 0) + childWords.length;
    }
    else if (typeof child === 'string') {
      counts[1] = (counts[1] || 0) + childWords.length;
      yellows += yellowsInPattern(pattern) * childWords.length;
      depth = Math.max(depth, 1);
    }
    else {
      const result = recomputeRanking(child, childWords);
      result.counts.forEach((count, index) => { counts[index + 1] = (counts[index + 1] || 0) + count; });
      yellows += result.yellows + yellowsInPattern(pattern) * childWords.length;
      depth = Math.max(depth, 1 + result.depth);
    }
  }
  let last = counts.length - 1;
  while (last > 0 && !counts[last]) last--;
  node.ranking = { counts: Array.from({ length: last + 1 }, (_, i) => counts[i] || 0), yellows };
  node.depth = depth;
  return { counts: node.ranking.counts, yellows, depth };
};
for (const file of changed) {
  const item = trees.find(tree => tree.file === file);
  recomputeRanking(item.tree, Array.from({ length: NT }, (_, i) => i));
  fs.writeFileSync(file, `export default ${JSON.stringify(item.tree)}`);
}
console.log(`Wrote exact small-state subtrees to ${changed.size} tree files.`);

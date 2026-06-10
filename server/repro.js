
import { setHardMode, getHardModeConstraints, isHardModeValidOptimized, score } from './wordleCore.js';
import { Heuristic, Ranking, ComputationNode } from './wordleCompute.js';
import targetWords from './targetWords.js';
import guessWords from './guessWords.js';
import partition from './partition.js';

setHardMode(true);

const words1 = targetWords.filter(w => score(w, 'salet') === '20011');
console.log('Words after SALET [20011]:', words1.length);

const words2 = words1.filter(w => score(w, 'store') === '21002');
console.log('Words after STORE [21002]:', words2.length);
console.log('Words:', words2);

const constraints1 = getHardModeConstraints('salet', '20011');
const constraints2 = getHardModeConstraints('store', '21002');

// Merging constraints manually for now to find possible guesses
const possible = guessWords.filter(g =>
    isHardModeValidOptimized(g, constraints1) &&
    isHardModeValidOptimized(g, constraints2)
);

console.log('Possible hard mode guesses:', possible.length);

const nodeStupe = new ComputationNode(words2, ['salet', 'store'], possible, true);
nodeStupe.openSpecificGuess('stupe');
const s1 = nodeStupe.guessNodes[0].createTree(Ranking.minimizeYellowsMetric);

const nodeSuite = new ComputationNode(words2, ['salet', 'store'], possible, true);
nodeSuite.openSpecificGuess('suite');
const s2 = nodeSuite.guessNodes[0].createTree(Ranking.minimizeYellowsMetric);

console.log('\nSTUPE tree ranking:', s1.ranking);
console.log('SUITE tree ranking:', s2.ranking);

const hGreens = new Heuristic(100, 1, 0, 10);
const scoreStupe = Heuristic.score(words2, 'stupe', partition(words2, 'stupe'), hGreens, true);
const scoreSuite = Heuristic.score(words2, 'suite', partition(words2, 'suite'), hGreens, true);

console.log('\nSTUPE heuristic score (yellowWeight=10):', scoreStupe);
console.log('SUITE heuristic score (yellowWeight=10):', scoreSuite);

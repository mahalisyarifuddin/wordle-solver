// Evaluates and finds the Top 6 Starters for each of the 5 Preexisting Modes
// under Frequency Weighting.
import fs from 'fs';
import { NT, NG, GUESSES, TARGETS, buildMatrix, buildStaticOrder, loadCalib, setStaticOrder, newSeenState, evalStarter, setTargetWeights } from './sogCommon.js';
import { getFrequencyWeights } from '../data/wordFrequencies.js';
import { buildFrequencyTree } from './buildFrequencyTree.js';
import { evaluateWeighted } from './sogEval.js';

const weights = getFrequencyWeights('wordleAnswers');
setTargetWeights(weights);

const matrixBuffer = buildMatrix();
const matrix = new Uint8Array(matrixBuffer);
const staticOrder = buildStaticOrder(matrix, weights).order;
setStaticOrder(staticOrder);

const calib = loadCalib('best25');
const st = newSeenState();

console.log('=== FINDING TOP STARTERS ACROSS 5 PREEXISTING MODES (FREQUENCY WEIGHTED) ===\n');

// 1. Scan top 150 candidates for Normal (Fastest, SoG Knee, Fewest) and Hard (Hard Mode, SoG Hard)
const candidates = staticOrder.slice(0, 120);

console.log('Evaluating Normal Mode candidates...');
const normalResults = [];
for (let i = 0; i < candidates.length; i++) {
  const g = candidates[i];
  const r0 = evalStarter(g, matrix, calib, 'normal', 150, st, 0.0, weights); // yw = 0
  const rKnee = evalStarter(g, matrix, calib, 'normal', 150, st, 0.45, weights); // yw = 0.45
  normalResults.push({
    guess: GUESSES[g],
    fastest: r0.e,
    sogKnee: rKnee.total,
    eKnee: rKnee.e,
    yKnee: rKnee.y
  });
}

console.log('Evaluating Hard Mode candidates...');
const hardResults = [];
for (let i = 0; i < candidates.length; i++) {
  const g = candidates[i];
  const r0 = evalStarter(g, matrix, calib, 'hard', 150, st, 0.0, weights); // yw = 0
  const rKnee = evalStarter(g, matrix, calib, 'hard', 150, st, 0.45, weights); // yw = 0.45
  hardResults.push({
    guess: GUESSES[g],
    hardFastest: r0.e,
    hardKnee: rKnee.total,
    eKnee: rKnee.e,
    yKnee: rKnee.y
  });
}

console.log('\n--- 1. Top 8 Normal Fastest Candidates ---');
normalResults.sort((a,b) => a.fastest - b.fastest);
normalResults.slice(0, 8).forEach((r, i) => console.log(`${i+1}. ${r.guess.toUpperCase()} E[g]=${r.fastest.toFixed(4)}`));

console.log('\n--- 2. Top 8 Normal SoG Knee (gamma=0.45) Candidates ---');
normalResults.sort((a,b) => a.sogKnee - b.sogKnee);
normalResults.slice(0, 8).forEach((r, i) => console.log(`${i+1}. ${r.guess.toUpperCase()} Knee=${r.sogKnee.toFixed(4)} (E[g]=${r.eKnee.toFixed(4)}, E[y]=${r.yKnee.toFixed(4)})`));

console.log('\n--- 3. Top 8 Hard Mode Candidates ---');
hardResults.sort((a,b) => a.hardFastest - b.hardFastest);
hardResults.slice(0, 8).forEach((r, i) => console.log(`${i+1}. ${r.guess.toUpperCase()} E[g]=${r.hardFastest.toFixed(4)}`));

console.log('\n--- 4. Top 8 Hard SoG Knee (gamma=0.45) Candidates ---');
hardResults.sort((a,b) => a.hardKnee - b.hardKnee);
hardResults.slice(0, 8).forEach((r, i) => console.log(`${i+1}. ${r.guess.toUpperCase()} Knee=${r.hardKnee.toFixed(4)} (E[g]=${r.eKnee.toFixed(4)}, E[y]=${r.yKnee.toFixed(4)})`));

// Pareto Knee Tuning for Frequency-Weighted Sea of Greens
import fs from 'fs';
import { buildMatrix, buildStaticOrder, loadCalib, evalStarter, setStaticOrder, newSeenState, NT, NG, GUESSES, setTargetWeights } from './sogCommon.js';
import { getFrequencyWeights } from '../data/wordFrequencies.js';

const weights = getFrequencyWeights('wordleAnswers');
setTargetWeights(weights);

const matrixBuffer = buildMatrix();
const matrix = new Uint8Array(matrixBuffer);
const staticOrder = buildStaticOrder(matrix, weights).order;
setStaticOrder(staticOrder);

const calib = loadCalib('best25');
const findIndex = word => GUESSES.indexOf(word.toLowerCase());

const startersToTest = ['slate', 'salet', 'trace', 'crane', 'least', 'stare', 'palet', 'cramp', 'poles', 'pores'];
const modes = ['normal', 'hard'];
const ywValues = [];
for (let w = 0; w <= 2.0001; w += 0.05) ywValues.push(parseFloat(w.toFixed(2)));

console.log('=== FREQUENCY-WEIGHTED PARETO KNEE TUNING ===');

const kneeSummary = [];

for (const mode of modes) {
  console.log(`\n============================= MODE: ${mode.toUpperCase()} =============================`);
  for (const starter of startersToTest) {
    const gi = findIndex(starter);
    if (gi < 0) continue;
    const st = newSeenState();
    const results = [];
    for (const yw of ywValues) {
      const r = evalStarter(gi, matrix, calib, mode, 600, st, yw, weights);
      results.push({ yw, e: r.e, y: r.y, total: r.total });
    }

    const eMin = Math.min(...results.map(r => r.e));
    const eMax = Math.max(...results.map(r => r.e));
    const yMin = Math.min(...results.map(r => r.y));
    const yMax = Math.max(...results.map(r => r.y));

    let bestDistLine = -Infinity;
    let bestKnee = null;
    let bestOrigin = Infinity;
    let bestOriginPt = null;

    for (const r of results) {
      const eNorm = eMax === eMin ? 0 : (r.e - eMin) / (eMax - eMin);
      const yNorm = yMax === yMin ? 0 : (r.y - yMin) / (yMax - yMin);
      const distToLine = (1 - (eNorm + yNorm));
      const distOrigin = Math.sqrt(eNorm * eNorm + yNorm * yNorm);
      if (distToLine > bestDistLine) {
        bestDistLine = distToLine;
        bestKnee = { ...r, eNorm, yNorm, distToLine };
      }
      if (distOrigin < bestOrigin) {
        bestOrigin = distOrigin;
        bestOriginPt = { ...r, eNorm, yNorm, distOrigin };
      }
    }

    kneeSummary.push({ mode, starter, bestKnee, bestOriginPt });
    console.log(`Starter ${starter.toUpperCase()} (${mode}):`);
    console.log(`  Guesses range: [${eMin.toFixed(4)}, ${eMax.toFixed(4)}] | Yellows range: [${yMin.toFixed(4)}, ${yMax.toFixed(4)}]`);
    console.log(`  Knee by max Pareto curvature: yw=${bestKnee.yw.toFixed(2)} (E[g]=${bestKnee.e.toFixed(4)}, E[y]=${bestKnee.y.toFixed(4)})`);
    console.log(`  Knee by min distance to utopia: yw=${bestOriginPt.yw.toFixed(2)} (E[g]=${bestOriginPt.e.toFixed(4)}, E[y]=${bestOriginPt.y.toFixed(4)})`);
  }
}

console.log('\n=== SUMMARY OF RETUNED KNEE WEIGHTS (guesses:yellows ratio) ===');
for (const mode of modes) {
  const modeKnees = kneeSummary.filter(k => k.mode === mode);
  const avgCurv = modeKnees.reduce((a, b) => a + b.bestKnee.yw, 0) / modeKnees.length;
  const avgUtopia = modeKnees.reduce((a, b) => a + b.bestOriginPt.yw, 0) / modeKnees.length;
  console.log(`Mode ${mode}: average curvature knee yw = ${avgCurv.toFixed(3)}, average utopia knee yw = ${avgUtopia.toFixed(3)}`);
}

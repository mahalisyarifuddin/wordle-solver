import fs from 'fs';
import { buildMatrix, buildStaticOrder, loadCalib, evalStarter, setStaticOrder, newSeenState, NT, NG, GUESSES } from './sogCommon.js';

const matrixBuffer = buildMatrix();
const matrix = new Uint8Array(matrixBuffer);
const staticOrder = buildStaticOrder(matrix).order;
setStaticOrder(staticOrder);

const raw = JSON.parse(fs.readFileSync('data/calib.json','utf8'));
const mk = o=>{ const g=new Float64Array(o.g); const y=new Float64Array(o.y); g[1]=1; y[1]=0; return {g,y}; };
const calib = {
  normal: { g: mk(raw.normal.mean).g, y: mk(raw.normal.best25).y },
  hard: { g: mk(raw.hard.mean).g, y: mk(raw.hard.best25).y }
};

// Same ratio for normal and hard - test several candidate weights
const weightsToTest = [0.3, 0.35, 0.4, 0.45, 0.5];

for(const yw of weightsToTest){
  console.log(`\n\n========== SAME WEIGHT yw=${yw} ==========`);
  const st = newSeenState();
  const normalResults = [];
  const hardResults = [];
  
  // Scan all 14855 starters
  for(let gi=0; gi<NG; gi++){
    const rNormal = evalStarter(gi, matrix, calib, 'normal', 600, st, yw);
    normalResults.push({gi, word:GUESSES[gi], e:rNormal.e, y:rNormal.y, total:rNormal.total});
    const rHard = evalStarter(gi, matrix, calib, 'hard', 600, st, yw);
    hardResults.push({gi, word:GUESSES[gi], e:rHard.e, y:rHard.y, total:rHard.total});
  }
  normalResults.sort((a,b)=>a.total-b.total);
  hardResults.sort((a,b)=>a.total-b.total);
  
  console.log(`\nTop 20 NORMAL (yw=${yw}):`);
  for(let i=0;i<20;i++){
    const r=normalResults[i];
    console.log(`${i+1}. ${r.word.padEnd(8)} e=${r.e.toFixed(4)} y=${r.y.toFixed(4)} total=${r.total.toFixed(4)}`);
  }
  console.log(`\nTop 20 HARD (yw=${yw}):`);
  for(let i=0;i<20;i++){
    const r=hardResults[i];
    console.log(`${i+1}. ${r.word.padEnd(8)} e=${r.e.toFixed(4)} y=${r.y.toFixed(4)} total=${r.total.toFixed(4)}`);
  }
  
  fs.writeFileSync(`computed/sameWeight_${yw}_normal.json`, JSON.stringify(normalResults.slice(0,100), null, 2));
  fs.writeFileSync(`computed/sameWeight_${yw}_hard.json`, JSON.stringify(hardResults.slice(0,100), null, 2));
}

// Now also find overall best same weight by combined metric
// For each weight, compute best total (normal best + hard best) or average
console.log(`\n\n=== COMPARING WEIGHTS FOR SAME RATIO ===`);
for(const yw of weightsToTest){
  const normal = JSON.parse(fs.readFileSync(`computed/sameWeight_${yw}_normal.json`));
  const hard = JSON.parse(fs.readFileSync(`computed/sameWeight_${yw}_hard.json`));
  const bestNormal = normal[0];
  const bestHard = hard[0];
  const combined = bestNormal.total + bestHard.total;
  console.log(`yw=${yw}: normal best ${bestNormal.word} total=${bestNormal.total.toFixed(4)} (e=${bestNormal.e.toFixed(4)} y=${bestNormal.y.toFixed(4)}), hard best ${bestHard.word} total=${bestHard.total.toFixed(4)} (e=${bestHard.e.toFixed(4)} y=${bestHard.y.toFixed(4)}), combined=${combined.toFixed(4)}`);
}

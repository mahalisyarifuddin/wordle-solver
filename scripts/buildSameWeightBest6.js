import fs from 'fs';
import { buildMatrix, buildStaticOrder } from './sogCommon.js';
import * as sogBuild from './sogBuild.js';

let matrixBuffer = buildMatrix();
let matrix = new Uint8Array(matrixBuffer);
let staticOrder = buildStaticOrder(matrix).order;
let calibRaw = JSON.parse(fs.readFileSync('data/calib.json','utf8'));
let mk = o=>{ const g=new Float64Array(o.g); const y=new Float64Array(o.y); g[1]=1; y[1]=0; return {g,y}; };
let calib = {
  normal: { g: mk(calibRaw.normal.mean).g, y: mk(calibRaw.normal.best25).y },
  hard: { g: mk(calibRaw.hard.mean).g, y: mk(calibRaw.hard.best25).y }
};
sogBuild.setState({ matrix, calib, staticOrder });

const SAME_WEIGHT = 0.4; // same ratio for normal and hard - knee compromise

// Top candidates from fast scan top1000 yw=0.4
const normalCandidates = [
  'tones','pones','poles','toles','moles','tores','pores','doris','cones','lores',
  'mores','tales','coles','doles','noles','rones','cores','tines','lotes','lanes',
  'manet','palet','salet','saint','soree','soily','seine','slate','crane','trace'
];

const hardCandidates = [
  'tones','tores','lares','tares','lores','tales','toles','lanes','noles','tiles',
  'nares','tarns','pores','ranes','mores','rones','tires','lotes','salet','rales',
  'suint','saint','sleet','palet','soily','seine','slate','crane','trace','salet'
];

// Deduplicate
const uniq = arr => [...new Set(arr)];

const normalUniq = uniq(normalCandidates).slice(0,20);
const hardUniq = uniq(hardCandidates).slice(0,20);

console.log(`Building ${normalUniq.length} normal candidates with yw=${SAME_WEIGHT}`);
console.log(`Building ${hardUniq.length} hard candidates with yw=${SAME_WEIGHT}`);

const resultsNormal=[];
const resultsHard=[];

for(const w of normalUniq){
  sogBuild.setYellowWeight(SAME_WEIGHT);
  sogBuild.setUnfilteredDepth(1);
  console.log(`\n--- Building NORMAL ${w} yw=${SAME_WEIGHT} ---`);
  const t0=Date.now();
  try{
    const res = sogBuild.buildTreeForWorker(w, 'normal');
    console.log(`Result NORMAL ${w}: avgG=${res.avgG.toFixed(4)} avgY=${res.avgY.toFixed(4)} obj=${res.oneToOne.toFixed(4)} depth=${res.maxDepth} time=${((Date.now()-t0)/1000).toFixed(1)}s`);
    resultsNormal.push({starter:w, mode:'normal', yw:SAME_WEIGHT, avgG:res.avgG, avgY:res.avgY, oneToOne:res.oneToOne, maxDepth:res.maxDepth, tree:res.tree});
  }catch(e){
    console.log(`FAILED NORMAL ${w}: ${e.message}`);
  }
}
resultsNormal.sort((a,b)=>a.oneToOne-b.oneToOne);
console.log(`\n=== FINAL NORMAL TOP ${resultsNormal.length} (yw=${SAME_WEIGHT}) ===`);
for(let i=0;i<Math.min(15, resultsNormal.length); i++){
  const r=resultsNormal[i];
  console.log(`${i+1}. ${r.starter.padEnd(8)} avgG=${r.avgG.toFixed(4)} avgY=${r.avgY.toFixed(4)} obj=${r.oneToOne.toFixed(4)} depth=${r.maxDepth}`);
}
fs.writeFileSync(`computed/sameWeight_${SAME_WEIGHT}_normal_exact.json`, JSON.stringify(resultsNormal.map(r=>({starter:r.starter, avgG:r.avgG, avgY:r.avgY, oneToOne:r.oneToOne, maxDepth:r.maxDepth})), null, 2));

for(const w of hardUniq){
  sogBuild.setYellowWeight(SAME_WEIGHT);
  sogBuild.setUnfilteredDepth(1);
  console.log(`\n--- Building HARD ${w} yw=${SAME_WEIGHT} ---`);
  const t0=Date.now();
  try{
    const res = sogBuild.buildTreeForWorker(w, 'hard');
    console.log(`Result HARD ${w}: avgG=${res.avgG.toFixed(4)} avgY=${res.avgY.toFixed(4)} obj=${res.oneToOne.toFixed(4)} depth=${res.maxDepth} time=${((Date.now()-t0)/1000).toFixed(1)}s`);
    resultsHard.push({starter:w, mode:'hard', yw:SAME_WEIGHT, avgG:res.avgG, avgY:res.avgY, oneToOne:res.oneToOne, maxDepth:res.maxDepth, tree:res.tree});
  }catch(e){
    console.log(`FAILED HARD ${w}: ${e.message}`);
  }
}
resultsHard.sort((a,b)=>a.oneToOne-b.oneToOne);
console.log(`\n=== FINAL HARD TOP ${resultsHard.length} (yw=${SAME_WEIGHT}) ===`);
for(let i=0;i<Math.min(15, resultsHard.length); i++){
  const r=resultsHard[i];
  console.log(`${i+1}. ${r.starter.padEnd(8)} avgG=${r.avgG.toFixed(4)} avgY=${r.avgY.toFixed(4)} obj=${r.oneToOne.toFixed(4)} depth=${r.maxDepth}`);
}
fs.writeFileSync(`computed/sameWeight_${SAME_WEIGHT}_hard_exact.json`, JSON.stringify(resultsHard.map(r=>({starter:r.starter, avgG:r.avgG, avgY:r.avgY, oneToOne:r.oneToOne, maxDepth:r.maxDepth})), null, 2));

// Save top 6 trees for each mode
const top6Normal = resultsNormal.slice(0,6);
const top6Hard = resultsHard.slice(0,6);

for(const r of top6Normal){
  fs.writeFileSync(`data/${r.starter}.tree.same${SAME_WEIGHT}.js`, `export default ${JSON.stringify(r.tree)}`);
  console.log(`Saved data/${r.starter}.tree.same${SAME_WEIGHT}.js`);
}
for(const r of top6Hard){
  fs.writeFileSync(`data/${r.starter}.tree.hard.same${SAME_WEIGHT}.js`, `export default ${JSON.stringify(r.tree)}`);
  console.log(`Saved data/${r.starter}.tree.hard.same${SAME_WEIGHT}.js`);
}

console.log(`\n\n=== BEST 6 NORMAL (yw=${SAME_WEIGHT}) ===`);
top6Normal.forEach((r,i)=>console.log(`${i+1}. ${r.starter} avgG=${r.avgG.toFixed(4)} avgY=${r.avgY.toFixed(4)} obj=${r.oneToOne.toFixed(4)}`));
console.log(`\n=== BEST 6 HARD (yw=${SAME_WEIGHT}) ===`);
top6Hard.forEach((r,i)=>console.log(`${i+1}. ${r.starter} avgG=${r.avgG.toFixed(4)} avgY=${r.avgY.toFixed(4)} obj=${r.oneToOne.toFixed(4)}`));

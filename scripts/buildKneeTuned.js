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

const normalCandidates = ['soree','suint','seine','soily','saint','palet','salet','slate','saice','slice'];
const hardCandidates = ['suint','saint','sleet','seine','soily','palet','salet','slice','slate','shiny'];

const KNEE_NORMAL = 0.35;
const KNEE_HARD = 0.55;

const resultsNormal=[];
const resultsHard=[];

for(const w of normalCandidates){
  sogBuild.setYellowWeight(KNEE_NORMAL);
  sogBuild.setUnfilteredDepth(1);
  console.log(`\nBuilding normal ${w} yw=${KNEE_NORMAL}`);
  const t0=Date.now();
  const res = sogBuild.buildTreeForWorker(w, 'normal');
  console.log(`-> avgG=${res.avgG.toFixed(4)} avgY=${res.avgY.toFixed(4)} obj=${res.oneToOne.toFixed(4)} depth=${res.maxDepth} time=${((Date.now()-t0)/1000).toFixed(1)}s`);
  resultsNormal.push({starter:w, mode:'normal', yw:KNEE_NORMAL, avgG:res.avgG, avgY:res.avgY, oneToOne:res.oneToOne, maxDepth:res.maxDepth, tree:res.tree});
}
resultsNormal.sort((a,b)=>a.oneToOne-b.oneToOne);
console.log('\n=== NORMAL KNEE-TUNED (yw=0.35) sorted ===');
for(const r of resultsNormal){
  console.log(`${r.starter} avgG=${r.avgG.toFixed(4)} avgY=${r.avgY.toFixed(4)} obj=${r.oneToOne.toFixed(4)} depth=${r.maxDepth}`);
}
fs.writeFileSync('computed/knee_normal_final.json', JSON.stringify(resultsNormal.map(r=>({starter:r.starter, avgG:r.avgG, avgY:r.avgY, oneToOne:r.oneToOne, maxDepth:r.maxDepth})), null, 2));

for(const w of hardCandidates){
  sogBuild.setYellowWeight(KNEE_HARD);
  sogBuild.setUnfilteredDepth(1);
  console.log(`\nBuilding hard ${w} yw=${KNEE_HARD}`);
  const t0=Date.now();
  const res = sogBuild.buildTreeForWorker(w, 'hard');
  console.log(`-> avgG=${res.avgG.toFixed(4)} avgY=${res.avgY.toFixed(4)} obj=${res.oneToOne.toFixed(4)} depth=${res.maxDepth} time=${((Date.now()-t0)/1000).toFixed(1)}s`);
  resultsHard.push({starter:w, mode:'hard', yw:KNEE_HARD, avgG:res.avgG, avgY:res.avgY, oneToOne:res.oneToOne, maxDepth:res.maxDepth, tree:res.tree});
}
resultsHard.sort((a,b)=>a.oneToOne-b.oneToOne);
console.log('\n=== HARD KNEE-TUNED (yw=0.55) sorted ===');
for(const r of resultsHard){
  console.log(`${r.starter} avgG=${r.avgG.toFixed(4)} avgY=${r.avgY.toFixed(4)} obj=${r.oneToOne.toFixed(4)} depth=${r.maxDepth}`);
}
fs.writeFileSync('computed/knee_hard_final.json', JSON.stringify(resultsHard.map(r=>({starter:r.starter, avgG:r.avgG, avgY:r.avgY, oneToOne:r.oneToOne, maxDepth:r.maxDepth})), null, 2));

// Save top 3 trees for each mode as new data files
const topNormal = resultsNormal.slice(0,3);
const topHard = resultsHard.slice(0,3);

for(const r of topNormal){
  const name = `${r.starter}.tree.knee.js`;
  fs.writeFileSync(`data/${name}`, `export default ${JSON.stringify(r.tree)}`);
  console.log(`Saved data/${name}`);
}
for(const r of topHard){
  const name = `${r.starter}.tree.hard.knee.js`;
  fs.writeFileSync(`data/${name}`, `export default ${JSON.stringify(r.tree)}`);
  console.log(`Saved data/${name}`);
}

console.log('\nDone');

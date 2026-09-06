import { buildMatrix, buildStaticOrder } from './sogCommon.js';
import fs from 'fs';
import { setState, buildTreeForWorker } from './sogBuild.js';

let matrixBuffer = buildMatrix();
let matrix = new Uint8Array(matrixBuffer);
let staticOrder = buildStaticOrder(matrix).order;
let calibRaw = JSON.parse(fs.readFileSync('data/calib.json','utf8'));
let mk = o=>{ const g=new Float64Array(o.g); const y=new Float64Array(o.y); g[1]=1; y[1]=0; return {g,y}; };
let calib = {
  normal: { g: mk(calibRaw.normal.mean).g, y: mk(calibRaw.normal.best25).y },
  hard: { g: mk(calibRaw.hard.mean).g, y: mk(calibRaw.hard.best25).y }
};
setState({ matrix, calib, staticOrder });

const normalCandidates = ['soily','seine','slice','saice','saint','slant','suint','soree','shine','saine'];
const hardCandidates = ['slice','seine','soily','saice','slimy','saint','suint','sleet','slaty','slily'];

const buildAndLog = (starter, mode) => {
  const t0=Date.now();
  const res=buildTreeForWorker(starter, mode);
  const elapsed=((Date.now()-t0)/1000).toFixed(1);
  console.log(`[${mode}] ${starter.padEnd(8)} avgG=${res.avgG.toFixed(4)} avgY=${res.avgY.toFixed(4)} 1:1=${res.oneToOne.toFixed(4)} maxDepth=${res.maxDepth} (${elapsed}s) counts=${JSON.stringify(res.tree.ranking.counts)}`);
  return res;
};

console.log('=== SOG NORMAL batch ===');
let normalResults=[];
for(const w of normalCandidates){
  const r=buildAndLog(w,'normal');
  normalResults.push({starter:w, avgG:r.avgG, avgY:r.avgY, oneToOne:r.oneToOne, maxDepth:r.maxDepth, counts:r.tree.ranking.counts});
}
normalResults.sort((a,b)=>a.oneToOne-b.oneToOne);
console.log('\n=== SOG NORMAL sorted by 1:1 ===');
normalResults.forEach((r,i)=> console.log(`${i+1}. ${r.starter.padEnd(8)} 1:1=${r.oneToOne.toFixed(4)} avgG=${r.avgG.toFixed(4)} avgY=${r.avgY.toFixed(4)}`));
fs.writeFileSync('computed/sog_normal_batch.json', JSON.stringify(normalResults, null, 2));

console.log('\n=== SOG HARD batch ===');
let hardResults=[];
for(const w of hardCandidates){
  const r=buildAndLog(w,'hard');
  hardResults.push({starter:w, avgG:r.avgG, avgY:r.avgY, oneToOne:r.oneToOne, maxDepth:r.maxDepth, counts:r.tree.ranking.counts});
}
hardResults.sort((a,b)=>a.oneToOne-b.oneToOne);
console.log('\n=== SOG HARD sorted by 1:1 ===');
hardResults.forEach((r,i)=> console.log(`${i+1}. ${r.starter.padEnd(8)} 1:1=${r.oneToOne.toFixed(4)} avgG=${r.avgG.toFixed(4)} avgY=${r.avgY.toFixed(4)}`));
fs.writeFileSync('computed/sog_hard_batch.json', JSON.stringify(hardResults, null, 2));

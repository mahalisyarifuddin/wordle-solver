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

const normalStarters = ['soree','suint','seine','soily','salet','palet'];
const hardStarters = ['suint','saint','sleet','seine','soily','palet'];

const weightsNormal = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const weightsHard = [0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0];

const allResults = [];

const run = (word, mode, weights) => {
  const resList=[];
  for(const w of weights){
    console.log(`\n--- Building ${word} ${mode} yw=${w} ---`);
    sogBuild.setYellowWeight(w);
    sogBuild.setUnfilteredDepth(1);
    try{
      const t0=Date.now();
      const res = sogBuild.buildTreeForWorker(word, mode);
      const elapsed = ((Date.now()-t0)/1000).toFixed(1);
      console.log(`Result ${word} ${mode} yw=${w}: avgG=${res.avgG.toFixed(4)} avgY=${res.avgY.toFixed(4)} 1:1=${res.oneToOne.toFixed(4)} depth=${res.maxDepth} time=${elapsed}s`);
      resList.push({starter:word, mode, yw:w, avgG:res.avgG, avgY:res.avgY, oneToOne:res.oneToOne, maxDepth:res.maxDepth});
      allResults.push({starter:word, mode, yw:w, avgG:res.avgG, avgY:res.avgY, oneToOne:res.oneToOne, maxDepth:res.maxDepth});
    }catch(e){
      console.log(`FAILED ${word} ${mode} yw=${w}: ${e.message}`);
      console.log(e.stack);
    }
  }
  // knee analysis
  if(resList.length>=2){
    const eMin = Math.min(...resList.map(p=>p.avgG));
    const eMax = Math.max(...resList.map(p=>p.avgG));
    const yMin = Math.min(...resList.map(p=>p.avgY));
    const yMax = Math.max(...resList.map(p=>p.avgY));
    console.log(`\nKnee analysis for ${word} ${mode}: eRange [${eMin.toFixed(4)}, ${eMax.toFixed(4)}] yRange [${yMin.toFixed(4)}, ${yMax.toFixed(4)}]`);
    let bestDist=-Infinity, best=null;
    let bestOrigin=Infinity, bestO=null;
    for(const p of resList){
      const eNorm = (eMax===eMin)?0:(p.avgG - eMin)/(eMax-eMin);
      const yNorm = (yMax===yMin)?0:(p.avgY - yMin)/(yMax-yMin);
      const dist = 1 - (eNorm + yNorm); // distance below line x+y=1
      const origin = Math.sqrt(eNorm*eNorm + yNorm*yNorm);
      console.log(`  yw=${p.yw} avgG=${p.avgG.toFixed(4)} avgY=${p.avgY.toFixed(4)} eNorm=${eNorm.toFixed(3)} yNorm=${yNorm.toFixed(3)} distLine=${dist.toFixed(3)} origin=${origin.toFixed(3)}`);
      if(dist>bestDist){ bestDist=dist; best=p; best.eNorm=eNorm; best.yNorm=yNorm; best.dist=dist; best.origin=origin; }
      if(origin<bestOrigin){ bestOrigin=origin; bestO={...p, eNorm, yNorm, dist, origin}; }
    }
    if(best) console.log(`  ==> Knee by dist from line: yw=${best.yw} dist=${best.dist.toFixed(3)} origin=${best.origin.toFixed(3)}`);
    if(bestO) console.log(`  ==> Knee by origin: yw=${bestO.yw} origin=${bestO.origin.toFixed(3)} dist=${bestO.dist.toFixed(3)}`);
  }
  fs.writeFileSync(`computed/knee_${word}_${mode}.json`, JSON.stringify(resList, null, 2));
};

for(const w of normalStarters){
  run(w, 'normal', weightsNormal);
}
for(const w of hardStarters){
  run(w, 'hard', weightsHard);
}

fs.writeFileSync('computed/knee_all.json', JSON.stringify(allResults, null, 2));
console.log('\n=== ALL DONE ===');

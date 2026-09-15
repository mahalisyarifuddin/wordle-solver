import fs from 'fs';
import { buildMatrix, buildStaticOrder, loadCalib, evalStarter, setStaticOrder, newSeenState, NT, NG, GUESSES } from './sogCommon.js';

const matrixBuffer = buildMatrix();
const matrix = new Uint8Array(matrixBuffer);
const staticOrder = buildStaticOrder(matrix).order;
setStaticOrder(staticOrder);

// calib
const raw = JSON.parse(fs.readFileSync('data/calib.json','utf8'));
const mk = o=>{ const g=new Float64Array(o.g); const y=new Float64Array(o.y); g[1]=1; y[1]=0; return {g,y}; };
const calib = {
  normal: { g: mk(raw.normal.mean).g, y: mk(raw.normal.best25).y },
  hard: { g: mk(raw.hard.mean).g, y: mk(raw.hard.best25).y }
};

const findIndex = word => GUESSES.indexOf(word.toLowerCase());

const startersToTest = ['salet','soree','suint','seine','soily','slate','palet','crane'];
const modes = ['normal','hard'];
const ywValues = [];
for(let w=0; w<=2.0001; w+=0.1) ywValues.push(parseFloat(w.toFixed(2)));
// finer around suspected knee
const fine = [0.3,0.35,0.4,0.45,0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1.05,1.1,1.15,1.2,1.25,1.3,1.4,1.5];
for(const v of fine) if(!ywValues.includes(v)) ywValues.push(v);
ywValues.sort((a,b)=>a-b);

for(const mode of modes){
  console.log(`\n=== MODE ${mode} ===`);
  for(const starter of startersToTest){
    const gi = findIndex(starter);
    if(gi<0) continue;
    const st = newSeenState();
    const results = [];
    for(const yw of ywValues){
      const r = evalStarter(gi, matrix, calib, mode, 600, st, yw);
      results.push({yw, e:r.e, y:r.y, total:r.total});
    }
    // compute Pareto frontier for this starter across yw? Actually each yw gives different E,Y because candidate choice changes.
    // Let's find knee: normalize e and y to [0,1]
    const eMin = Math.min(...results.map(r=>r.e));
    const eMax = Math.max(...results.map(r=>r.e));
    const yMin = Math.min(...results.map(r=>r.y));
    const yMax = Math.max(...results.map(r=>r.y));
    // distance from line connecting (eMin,yMax) to (eMax,yMin) ??? typical knee: we want trade-off where both objectives low.
    // For Pareto, as yw increases, e should increase, y decrease. So extremes are low e high y and high e low y.
    // Normalize: eNorm = (e - eMin)/(eMax-eMin), yNorm = (y - yMin)/(yMax-yMin)
    // The ideal utopia is (0,0). Knee is point closest to origin? Or max distance from line between extremes?
    // We'll compute both: distance to line (eNorm+yNorm=1?) Let's compute standard knee detection: find point with max distance from line connecting (0,1) to (1,0) in normalized space? Actually extremes normalized: (0,1) = min e, max y ; (1,0)=max e, min y. Line between them is x+y=1. Distance to line = |x+y-1|/sqrt(2). Points below line (x+y<1) are better (Pareto improvement). So max negative distance (or minimal x+y) is knee? But we want max curvature.
    // Alternative: compute distance from origin: sqrt(x^2+y^2) minimal -> knee.
    // Let's compute both and also curvature via second derivative.
    let bestDistLine = -Infinity;
    let bestKnee = null;
    let bestOrigin = Infinity;
    let bestOriginPt = null;
    for(const r of results){
      const eNorm = (eMax===eMin)?0:(r.e - eMin)/(eMax-eMin);
      const yNorm = (yMax===yMin)?0:(r.y - yMin)/(yMax-yMin);
      const sum = eNorm + yNorm;
      const distToLine = (1 - sum); // positive if below line (better)
      const distOrigin = Math.sqrt(eNorm*eNorm + yNorm*yNorm);
      if(distToLine > bestDistLine){
        bestDistLine = distToLine;
        bestKnee = { ...r, eNorm, yNorm, distToLine, distOrigin };
      }
      if(distOrigin < bestOrigin){
        bestOrigin = distOrigin;
        bestOriginPt = { ...r, eNorm, yNorm, distToLine, distOrigin };
      }
    }
    console.log(`\nStarter ${starter.toUpperCase()} mode=${mode}`);
    console.log(`  e range [${eMin.toFixed(4)}, ${eMax.toFixed(4)}] y range [${yMin.toFixed(4)}, ${yMax.toFixed(4)}]`);
    console.log(`  Knee by max dist from line (below line): yw=${bestKnee.yw} e=${bestKnee.e.toFixed(4)} y=${bestKnee.y.toFixed(4)} total=${bestKnee.total.toFixed(4)} eNorm=${bestKnee.eNorm.toFixed(3)} yNorm=${bestKnee.yNorm.toFixed(3)} dist=${bestKnee.distToLine.toFixed(3)}`);
    console.log(`  Knee by closest to origin: yw=${bestOriginPt.yw} e=${bestOriginPt.e.toFixed(4)} y=${bestOriginPt.y.toFixed(4)} eNorm=${bestOriginPt.eNorm.toFixed(3)} yNorm=${bestOriginPt.yNorm.toFixed(3)} distOrigin=${bestOriginPt.distOrigin.toFixed(3)}`);

    // Print curve for key yw values
    for(const r of results.filter(r=>[0,0.2,0.4,0.5,0.6,0.7,0.8,0.9,1.0,1.2,1.5,2.0].includes(r.yw))){
      console.log(`    yw=${r.yw.toFixed(2)} e=${r.e.toFixed(4)} y=${r.y.toFixed(4)} total=${r.total.toFixed(4)}`);
    }
  }
}

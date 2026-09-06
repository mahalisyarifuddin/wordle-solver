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

console.log('building soily normal');
let t0=Date.now();
let res=buildTreeForWorker('soily','normal');
console.log(`soily normal done ${((Date.now()-t0)/1000).toFixed(1)}s avgG=${res.avgG.toFixed(4)} avgY=${res.avgY.toFixed(4)} 1:1=${res.oneToOne.toFixed(4)} maxDepth=${res.maxDepth}`);
console.log(`counts ${JSON.stringify(res.tree.ranking.counts)}`);

console.log('building slice normal');
t0=Date.now();
res=buildTreeForWorker('slice','normal');
console.log(`slice normal done ${((Date.now()-t0)/1000).toFixed(1)}s avgG=${res.avgG.toFixed(4)} avgY=${res.avgY.toFixed(4)} 1:1=${res.oneToOne.toFixed(4)}`);

console.log('building saint normal');
t0=Date.now();
res=buildTreeForWorker('saint','normal');
console.log(`saint normal done ${((Date.now()-t0)/1000).toFixed(1)}s`);

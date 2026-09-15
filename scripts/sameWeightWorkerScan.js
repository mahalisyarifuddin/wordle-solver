import fs from 'fs';
import { Worker } from 'worker_threads';
import { NG, buildMatrix, buildStaticOrder } from './sogCommon.js';

let matrixBuffer = buildMatrix();
let matrix = new Uint8Array(matrixBuffer);
let staticOrder = buildStaticOrder(matrix).order;
let calibRaw = JSON.parse(fs.readFileSync('data/calib.json','utf8'));
let mk = o=>{ const g=new Float64Array(o.g); const y=new Float64Array(o.y); g[1]=1; y[1]=0; return {g,y}; };
let calib = {
  normal: { g: mk(calibRaw.normal.mean).g, y: mk(calibRaw.normal.best25).y },
  hard: { g: mk(calibRaw.hard.mean).g, y: mk(calibRaw.hard.best25).y }
};

const runRange = (startIdx, endIdx, mode, budget, yw) => {
  return new Promise((resolve, reject)=>{
    const worker = new Worker('./scripts/sogScanWorker.js', {
      workerData: { startIdx, endIdx, matrixBuffer, calibJSON: calib, staticOrderArr: staticOrder, mode, budget, yw }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', c=>{ if(c!==0) reject(new Error(`worker exit ${c}`)); });
  });
};

const scanAll = async (mode, budget, yw) => {
  const SPLIT=4;
  const ranges=[];
  for(let i=0;i<SPLIT;i++) ranges.push([Math.floor(NG*i/SPLIT), Math.floor(NG*(i+1)/SPLIT)]);
  const results = (await Promise.all(ranges.map(([a,b])=>runRange(a,b,mode,budget,yw)))).flat();
  results.sort((a,b)=>a[3]-b[3]);
  return results;
};

const yw = 0.4; // same ratio for normal and hard - chosen as compromise knee
const budget = 600;

console.log(`Scanning normal yw=${yw} budget=${budget} over ${NG} words...`);
let normal = await scanAll('normal', budget, yw);
console.log(`Top 30 normal yw=${yw}:`);
for(let i=0;i<30;i++){
  const [gi,e,y,total]=normal[i];
  console.log(`${i+1}. gi=${gi} total=${total.toFixed(4)} e=${e.toFixed(4)} y=${y.toFixed(4)}`);
}
fs.writeFileSync(`computed/sameWeight_${yw}_normal_full.json`, JSON.stringify(normal.slice(0,200)));

console.log(`\nScanning hard yw=${yw} budget=${budget} over ${NG} words...`);
let hard = await scanAll('hard', budget, yw);
console.log(`Top 30 hard yw=${yw}:`);
for(let i=0;i<30;i++){
  const [gi,e,y,total]=hard[i];
  console.log(`${i+1}. gi=${gi} total=${total.toFixed(4)} e=${e.toFixed(4)} y=${y.toFixed(4)}`);
}
fs.writeFileSync(`computed/sameWeight_${yw}_hard_full.json`, JSON.stringify(hard.slice(0,200)));

// Also test yw=0.45 and 0.5 for comparison quickly with budget 200
for(const testYw of [0.35, 0.45, 0.5]){
  console.log(`\n\nQuick scan normal yw=${testYw} budget=200`);
  let res = await scanAll('normal', 200, testYw);
  console.log(`Top 10 normal yw=${testYw}:`);
  for(let i=0;i<10;i++){
    const [gi,e,y,total]=res[i];
    console.log(`${i+1}. gi=${gi} total=${total.toFixed(4)} e=${e.toFixed(4)} y=${y.toFixed(4)}`);
  }
  console.log(`Quick scan hard yw=${testYw} budget=200`);
  let resH = await scanAll('hard', 200, testYw);
  console.log(`Top 10 hard yw=${testYw}:`);
  for(let i=0;i<10;i++){
    const [gi,e,y,total]=resH[i];
    console.log(`${i+1}. gi=${gi} total=${total.toFixed(4)} e=${e.toFixed(4)} y=${y.toFixed(4)}`);
  }
}

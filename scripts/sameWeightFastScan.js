import fs from 'fs';
import { Worker } from 'worker_threads';
import { NG, buildMatrix, buildStaticOrder, GUESSES } from './sogCommon.js';

let matrixBuffer = buildMatrix();
let staticOrder = buildStaticOrder(new Uint8Array(matrixBuffer)).order;
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
  const SPLIT=6;
  const ranges=[];
  for(let i=0;i<SPLIT;i++) ranges.push([Math.floor(NG*i/SPLIT), Math.floor(NG*(i+1)/SPLIT)]);
  const results = (await Promise.all(ranges.map(([a,b])=>runRange(a,b,mode,budget,yw)))).flat();
  results.sort((a,b)=>a[3]-b[3]);
  return results;
};

const weights = [0.4];

for(const yw of weights){
  console.log(`\n=== FAST SCAN budget=200 yw=${yw} ===`);
  let normal = await scanAll('normal', 200, yw);
  console.log(`Top 30 NORMAL yw=${yw}:`);
  for(let i=0;i<30;i++){
    const [gi,e,y,total]=normal[i];
    console.log(`${i+1}. ${GUESSES[gi].padEnd(8)} gi=${gi} e=${e.toFixed(4)} y=${y.toFixed(4)} total=${total.toFixed(4)}`);
  }
  let hard = await scanAll('hard', 200, yw);
  console.log(`\nTop 30 HARD yw=${yw}:`);
  for(let i=0;i<30;i++){
    const [gi,e,y,total]=hard[i];
    console.log(`${i+1}. ${GUESSES[gi].padEnd(8)} gi=${gi} e=${e.toFixed(4)} y=${y.toFixed(4)} total=${total.toFixed(4)}`);
  }
  fs.writeFileSync(`computed/sameWeight_${yw}_normal_200.json`, JSON.stringify(normal.slice(0,100)));
  fs.writeFileSync(`computed/sameWeight_${yw}_hard_200.json`, JSON.stringify(hard.slice(0,100)));
}

// Also test other weights quickly
for(const yw of [0.35, 0.45, 0.5]){
  console.log(`\n=== FAST SCAN budget=200 yw=${yw} ===`);
  let normal = await scanAll('normal', 200, yw);
  console.log(`Top 10 NORMAL yw=${yw}:`);
  for(let i=0;i<10;i++){
    const [gi,e,y,total]=normal[i];
    console.log(`${i+1}. ${GUESSES[gi].padEnd(8)} total=${total.toFixed(4)} e=${e.toFixed(4)} y=${y.toFixed(4)}`);
  }
  let hard = await scanAll('hard', 200, yw);
  console.log(`Top 10 HARD yw=${yw}:`);
  for(let i=0;i<10;i++){
    const [gi,e,y,total]=hard[i];
    console.log(`${i+1}. ${GUESSES[gi].padEnd(8)} total=${total.toFixed(4)} e=${e.toFixed(4)} y=${y.toFixed(4)}`);
  }
}

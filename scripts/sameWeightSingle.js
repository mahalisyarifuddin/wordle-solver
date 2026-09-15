import fs from 'fs';
import { buildMatrix, buildStaticOrder, evalStarter, setStaticOrder, newSeenState, GUESSES } from './sogCommon.js';

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

const yw = 0.4;
const topN = 1000;
const candidates = staticOrder.slice(0, topN);
console.log(`Scanning yw=${yw} over top ${topN}`);

const st = newSeenState();
const normalRes=[];
const hardRes=[];
let count=0;
for(const gi of candidates){
  const rn = evalStarter(gi, matrix, calib, 'normal', 600, st, yw);
  normalRes.push({gi, word:GUESSES[gi], e:rn.e, y:rn.y, total:rn.total});
  const rh = evalStarter(gi, matrix, calib, 'hard', 600, st, yw);
  hardRes.push({gi, word:GUESSES[gi], e:rh.e, y:rh.y, total:rh.total});
  count++;
  if(count%200===0) console.log(`  scanned ${count}/${topN}`);
}
normalRes.sort((a,b)=>a.total-b.total);
hardRes.sort((a,b)=>a.total-b.total);
console.log(`\nTop 30 NORMAL yw=${yw}:`);
for(let i=0;i<30;i++){
  const r=normalRes[i];
  console.log(`${i+1}. ${r.word.padEnd(8)} e=${r.e.toFixed(4)} y=${r.y.toFixed(4)} total=${r.total.toFixed(4)}`);
}
console.log(`\nTop 30 HARD yw=${yw}:`);
for(let i=0;i<30;i++){
  const r=hardRes[i];
  console.log(`${i+1}. ${r.word.padEnd(8)} e=${r.e.toFixed(4)} y=${r.y.toFixed(4)} total=${r.total.toFixed(4)}`);
}
fs.writeFileSync(`computed/sameWeight_top${topN}_${yw}_normal.json`, JSON.stringify(normalRes.slice(0,50), null, 2));
fs.writeFileSync(`computed/sameWeight_top${topN}_${yw}_hard.json`, JSON.stringify(hardRes.slice(0,50), null, 2));

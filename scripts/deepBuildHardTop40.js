import fs from 'fs';
import { Worker } from 'worker_threads';
import { buildMatrix } from './sogCommon.js';
import targetWords from '../server/targetWords.js';
import guessWords from '../server/guessWords.js';

const sharedBuffer = buildMatrix();
console.log(`matrix ready`);
const PARALLELISM=2;
const runWorker = (starter) => new Promise((resolve, reject)=>{
  const w=new Worker('./server/recalcWorker.js', {workerData:{starter, metricName:'total', name:`${starter}.hard`, hardMode:true, sharedBuffer}, resourceLimits:{maxOldGenerationSizeMb:2048}});
  w.on('message', resolve); w.on('error', reject); w.on('exit',c=>c!==0&&reject(new Error(`exit ${c}`)));
});

import hardData from '../data/sogScanHard.json' with {type:'json'};
const ws = guessWords;
const top40 = hardData.hardGuesses.slice(0,40).map(e=>ws[e[0]]);
console.log(`building hard for top40 hardGuesses: ${top40.join(', ')}`);
const results=[];
for(let i=0;i<top40.length;i+=PARALLELISM){
  const batch=top40.slice(i,i+PARALLELISM);
  const t0=Date.now();
  const outs=await Promise.all(batch.map(s=>runWorker(s).then(r=>({starter:s, tree:r.tree}))));
  outs.forEach(({starter,tree})=>{
    const counts=tree.ranking.counts;
    const avg=counts.reduce((a,c,i)=>a+c*(i+1),0)/targetWords.length;
    console.log(`HARD ${starter.padEnd(8)} avg=${avg.toFixed(4)} max=${counts.length} ${JSON.stringify(counts)}`);
    results.push({starter, avg, counts});
  });
  console.log(`batch ${i/PARALLELISM+1} done ${((Date.now()-t0)/1000).toFixed(1)}s`);
}
results.sort((a,b)=>a.avg-b.avg);
console.log(`\n=== HARD TOP40 SORTED ===`);
results.forEach((r,i)=>console.log(`${String(i+1).padStart(2)}. ${r.starter.padEnd(8)} avg=${r.avg.toFixed(4)} max=${r.counts.length} counts=${JSON.stringify(r.counts)}`));
fs.writeFileSync('computed/hard_top40_exact.json', JSON.stringify(results,null,2));

// also compare with previous hard results (palet etc) - merge
const prev = JSON.parse(fs.readFileSync('computed/deep_hard_exact.json','utf8'));
const merged=[...results, ...prev];
const uniq=new Map();
merged.forEach(r=>{ if(!uniq.has(r.starter) || r.avg < uniq.get(r.starter).avg) uniq.set(r.starter,r); });
const all=[...uniq.values()].sort((a,b)=>a.avg-b.avg);
console.log(`\n=== MERGED HARD ALL (top 15) ===`);
all.slice(0,15).forEach((r,i)=>console.log(`${i+1}. ${r.starter} ${r.avg.toFixed(4)}`));
fs.writeFileSync('computed/hard_merged_exact.json', JSON.stringify(all,null,2));

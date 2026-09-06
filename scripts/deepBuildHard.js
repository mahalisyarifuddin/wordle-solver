import fs from 'fs';
import { Worker } from 'worker_threads';
import { buildMatrix } from './sogCommon.js';
import targetWords from '../server/targetWords.js';

const sharedBuffer = buildMatrix();
console.log(`matrix ready ${sharedBuffer.byteLength}`);
const PARALLELISM=2;

const runWorker = (starter, hardMode) => {
  return new Promise((resolve, reject)=>{
    const worker = new Worker('./server/recalcWorker.js', {
      workerData: { starter, metricName: 'total', name: `${starter}.tree.hard`, hardMode, sharedBuffer },
      resourceLimits: { maxOldGenerationSizeMb: 2048 }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', c=>{ if(c!==0) reject(new Error(`exit ${c}`))});
  });
};

const hardCandidates = ['salet','slate','least','trace','leant','cramp','reast','crate','toner','ronte','palet','tiare','saint','noter','riant','manet','rane','rante','rante','slane','crane','soare','roate','arose','arise','raise','aesir'];
// deduplicate and ensure valid words
import guessWords from '../server/guessWords.js';
const guessSet = new Set(guessWords);
// filter
const uniq = [...new Set(hardCandidates)].filter(w=>guessSet.has(w));
console.log(`building ${uniq.length} hard trees...`);

const results=[];
for(let i=0;i<uniq.length;i+=PARALLELISM){
  const batch=uniq.slice(i,i+PARALLELISM);
  const t0=Date.now();
  const outs = await Promise.all(batch.map(s=>runWorker(s,true).then(r=>({starter:s, tree:r.tree}))));
  outs.forEach(({starter, tree})=>{
    const counts=tree.ranking.counts;
    const total=counts.reduce((a,c,i)=>a+c*(i+1),0);
    const avg=total/targetWords.length;
    console.log(`HARD ${starter.padEnd(8)} avg=${avg.toFixed(4)} max=${counts.length} counts=${JSON.stringify(counts)} depth=${tree.depth}`);
    results.push({starter, avg, counts, depth:tree.depth, tree});
  });
  console.log(`batch ${i/PARALLELISM+1} done ${((Date.now()-t0)/1000).toFixed(1)}s`);
}
results.sort((a,b)=>a.avg-b.avg);
console.log(`\n=== HARD SORTED by avg ===`);
results.forEach((r,i)=> console.log(`${String(i+1).padStart(2)}. ${r.starter.padEnd(8)} avg=${r.avg.toFixed(4)} max=${r.counts.length} counts=${JSON.stringify(r.counts)}`));
fs.writeFileSync('computed/deep_hard_exact.json', JSON.stringify(results.map(r=>({starter:r.starter, avg:r.avg, counts:r.counts})), null, 2));

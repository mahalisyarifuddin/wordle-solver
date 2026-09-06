import fs from 'fs';
import { Worker } from 'worker_threads';
import { buildMatrix } from './sogCommon.js';
import targetWords from '../server/targetWords.js';
import guessWords from '../server/guessWords.js';

const sharedBuffer = buildMatrix();
console.log(`matrix ready`);
const PARALLELISM=2;

const runWorker = (starter) => {
  return new Promise((resolve, reject)=>{
    const worker = new Worker('./server/recalcWorker.js', {
      workerData: { starter, metricName: 'min', name: `${starter}.tree.min`, hardMode: false, sharedBuffer },
      resourceLimits: { maxOldGenerationSizeMb: 2048 }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', c=>{ if(c!==0) reject(new Error(`exit ${c}`))});
  });
};

// top fewest max candidates from fewestScan: seria, serai, paseo, saine, raise, ranes, nares, reans, nears, saner, snare, kaies, reais, soare, lares, rales, seral, arles, reals, lears
let fewestCandidates = ["seria","serai","paseo","saine","raise","ranes","nares","reans","nears","saner","snare","kaies","reais","soare","lares","rales","seral","arles","reals","lears","laers","earls","oaves","nates","lanes","aesir","arise","slane","leans","neals","seria","serai"];
// add shipped fewest for comparison
const shipped = ["rance","rants","rated","ronte","alter","lance","salet","slate","palet","manet","ranid","rated"];
fewestCandidates = [...new Set([...fewestCandidates, ...shipped])].filter(w=>guessWords.includes(w));
console.log(`building ${fewestCandidates.length} fewest (min) trees...`);
const results=[];
for(let i=0;i<fewestCandidates.length;i+=PARALLELISM){
  const batch=fewestCandidates.slice(i,i+PARALLELISM);
  const t0=Date.now();
  const outs = await Promise.all(batch.map(s=>runWorker(s).then(r=>({starter:s, tree:r.tree}))));
  outs.forEach(({starter, tree})=>{
    const counts=tree.ranking.counts;
    const total=counts.reduce((a,c,i)=>a+c*(i+1),0);
    const avg=total/targetWords.length;
    console.log(`MIN ${starter.padEnd(8)} avg=${avg.toFixed(4)} max=${counts.length} counts=${JSON.stringify(counts)}`);
    results.push({starter, avg, counts});
  });
  console.log(`batch ${i/PARALLELISM+1} done ${((Date.now()-t0)/1000).toFixed(1)}s`);
}
results.sort((a,b)=>{
  if(a.counts.length!==b.counts.length) return a.counts.length-b.counts.length;
  for(let i=a.counts.length-1;i>=0;i--) if(a.counts[i]!==b.counts[i]) return a.counts[i]-b.counts[i];
  return a.avg-b.avg;
});
console.log(`\n=== FEWEST SORTED (minimizeLongest) ===`);
results.forEach((r,i)=> console.log(`${String(i+1).padStart(2)}. ${r.starter.padEnd(8)} avg=${r.avg.toFixed(4)} max=${r.counts.length} tail=${r.counts.slice(-4)} counts=${JSON.stringify(r.counts)}`));
fs.writeFileSync('computed/deep_fewest2_exact.json', JSON.stringify(results, null, 2));

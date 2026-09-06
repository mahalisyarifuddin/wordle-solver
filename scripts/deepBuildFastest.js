import fs from 'fs';
import { Worker } from 'worker_threads';
import { buildMatrix } from './sogCommon.js';
import targetWords from '../server/targetWords.js';

const sharedBuffer = buildMatrix();
console.log(`matrix ready ${sharedBuffer.byteLength}`);
const PARALLELISM=2;

const runWorker = (starter, metricName, hardMode) => {
  return new Promise((resolve, reject)=>{
    const worker = new Worker('./server/recalcWorker.js', {
      workerData: { starter, metricName, name: `${starter}.tree.test`, hardMode, sharedBuffer },
      resourceLimits: { maxOldGenerationSizeMb: 2048 }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', c=>{ if(c!==0) reject(new Error(`exit ${c}`))});
  });
};

const buildBatch = async (candidates, metricName, hardMode) => {
  const results=[];
  for(let i=0;i<candidates.length;i+=PARALLELISM){
    const batch=candidates.slice(i,i+PARALLELISM);
    const t0=Date.now();
    const outs = await Promise.all(batch.map(starter=>runWorker(starter, metricName, hardMode).then(r=>({starter, tree:r.tree}))));
    outs.forEach(({starter, tree})=>{
      const counts=tree.ranking.counts;
      const total=counts.reduce((a,c,i)=>a+c*(i+1),0);
      const avg=total/targetWords.length;
      const yellows=tree.ranking.yellows||0;
      const oneToOne=avg + (yellows/targetWords.length);
      console.log(`${hardMode?'HARD':''} ${metricName} ${starter.padEnd(8)} avg=${avg.toFixed(4)} yellows=${(yellows/targetWords.length).toFixed(4)} 1:1=${oneToOne.toFixed(4)} max=${counts.length} counts=${JSON.stringify(counts)} depth=${tree.depth}`);
      results.push({starter, avg, yellows: yellows/targetWords.length, oneToOne, counts, depth:tree.depth, tree});
    });
    console.log(`batch ${i/PARALLELISM+1} done ${( (Date.now()-t0)/1000).toFixed(1)}s`);
  }
  // sort by metric
  if(metricName==='total'){
    results.sort((a,b)=>a.avg-b.avg);
  } else if(metricName==='min'){
    // minimizeLongest: sort by max length, then tail
    results.sort((a,b)=>{
      if(a.counts.length!==b.counts.length) return a.counts.length-b.counts.length;
      for(let i=a.counts.length-1;i>=0;i--) if(a.counts[i]!==b.counts[i]) return a.counts[i]-b.counts[i];
      return a.avg-b.avg;
    });
  }
  console.log(`\n=== SORTED ${metricName} ${hardMode?'HARD':''} ===`);
  results.forEach((r,i)=>{
    console.log(`${String(i+1).padStart(2)}. ${r.starter.padEnd(8)} avg=${r.avg.toFixed(4)} max=${r.counts.length} tail=${r.counts.slice(-3)} counts=${JSON.stringify(r.counts)}`);
  });
  return results;
};

// candidates from our fastest scan full top + known
const fastestCandidates = ['salet','toner','ronte','tiare','toran','toile','saint','trone','palet','noter','riant','train','manet','liane','leant','morel','morne','ranid','trine','oilet','telia','panel','maril','trial','rotan','crate','trace','slate','reast','crane','rance','rants','rated','alter','lance'];
const uniqueFastest = [...new Set(fastestCandidates)];

console.log(`\nBuilding ${uniqueFastest.length} total (fastest avg) trees...`);
const fastestResults = await buildBatch(uniqueFastest, 'total', false);
fs.writeFileSync('computed/deep_fastest_exact.json', JSON.stringify(fastestResults.map(r=>({starter:r.starter, avg:r.avg, counts:r.counts, yellows:r.yellows})), null, 2));

console.log(`\nBuilding fewest (min) for same candidates...`);
const fewestResults = await buildBatch(uniqueFastest, 'min', false);
fs.writeFileSync('computed/deep_fewest_exact.json', JSON.stringify(fewestResults.map(r=>({starter:r.starter, avg:r.avg, counts:r.counts})), null, 2));

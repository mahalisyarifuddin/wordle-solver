#!/usr/bin/env node
// Deep scan for best starters across 5 categories:
//  1) fastest avg (normal, totalGuesses, yw=0)
//  2) fewest (normal, minimizeLongest approximation: max bucket + tail)
//  3) hard fastest avg (hard, totalGuesses, yw=0)
//  4) sog (normal, 1:1)
//  5) sog hard (hard, 1:1 guesses:yellows, yw=1)
import fs from 'fs';
import { Worker } from 'worker_threads';
import { NT, NG, GUESSES, TARGETS, buildMatrix, buildStaticOrder, loadCalib, setStaticOrder, evalStarter, newSeenState } from './sogCommon.js';

let matrixBuffer, matrix, staticOrder, calib;

const SPLIT = 4;

const scanAll = async (mode, budget, candidateIndices = null, yw = 1) => {
  const runRange = (startIdx, endIdx) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./scripts/sogScanWorker.js', {
        workerData: { startIdx, endIdx, matrixBuffer, calibJSON: calib, staticOrderArr: staticOrder, mode, budget, yw }
      });
      let results = [];
      worker.on('message', (msg) => { results = msg; });
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`worker exit ${code}`));
        else resolve(results);
      });
    });
  };
  if (candidateIndices) {
    // Evaluate directly in main thread (only up to ~80 items, fast enough without workers)
    const st = newSeenState();
    const results = [];
    for (const g of candidateIndices) {
      const r = evalStarter(g, matrix, calib, mode, budget, st, yw);
      results.push([g, r.e, r.y, r.total]);
    }
    return results.sort((a,b)=>a[3]-b[3]);
  } else {
    const ranges = [];
    for (let i=0;i<SPLIT;i++) ranges.push([Math.floor(NG*i/SPLIT), Math.floor(NG*(i+1)/SPLIT)]);
    const results = (await Promise.all(ranges.map(([a,b])=>runRange(a,b)))).flat();
    return results.sort((a,b)=>a[3]-b[3]);
  }
};

// Monkey patch for customIndices handling: we need to modify worker to support it
// Instead we handle else case differently

const main = async () => {
  console.log(`Building matrix ${NT}x${NG}...`);
  matrixBuffer = buildMatrix();
  matrix = new Uint8Array(matrixBuffer);
  console.log('static order...');
  staticOrder = buildStaticOrder(matrix).order;
  setStaticOrder(staticOrder);
  calib = loadCalib(); // best25 default

  const tasks = process.argv[2] || 'fastest';
  if (tasks === 'fastest' || tasks === 'all') {
    console.log('\n=== FASTEST AVG (normal, yw=0, budget 600) ===');
    let t0=Date.now();
    const fastest = await scanAll('normal', 600, null, 0);
    console.log(`took ${((Date.now()-t0)/1000).toFixed(1)}s`);
    for (let i=0;i<40;i++) {
      const [g,e,y,tot]=fastest[i];
      console.log(`${String(i+1).padStart(3)}. ${GUESSES[g].padEnd(8)} guesses=${e.toFixed(4)} yellows=${y.toFixed(4)} total=${tot.toFixed(4)}`);
    }
    fs.writeFileSync('computed/scan_fastest.json', JSON.stringify(fastest.slice(0,200)));
    // refinement full
    console.log('\n=== FASTEST refinement full (top 80) ===');
    t0=Date.now();
    const top80 = fastest.slice(0,80).map(r=>r[0]);
    const fastestFull = await scanAll('normal','full', top80, 0);
    console.log(`took ${((Date.now()-t0)/1000).toFixed(1)}s`);
    for (let i=0;i<25;i++) {
      const [g,e,y,tot]=fastestFull[i];
      console.log(`${String(i+1).padStart(3)}. ${GUESSES[g].padEnd(8)} guesses=${e.toFixed(4)} yellows=${y.toFixed(4)} total=${tot.toFixed(4)}`);
    }
    fs.writeFileSync('computed/scan_fastest_full.json', JSON.stringify(fastestFull));
  }
  if (tasks === 'hard' || tasks === 'all') {
    console.log('\n=== HARD fastest (hard, yw=0, budget 600) ===');
    let t0=Date.now();
    const hard = await scanAll('hard', 600, null, 0);
    console.log(`took ${((Date.now()-t0)/1000).toFixed(1)}s`);
    for (let i=0;i<40;i++) {
      const [g,e,y,tot]=hard[i];
      console.log(`${String(i+1).padStart(3)}. ${GUESSES[g].padEnd(8)} guesses=${e.toFixed(4)} yellows=${y.toFixed(4)} total=${tot.toFixed(4)}`);
    }
    fs.writeFileSync('computed/scan_hard.json', JSON.stringify(hard.slice(0,200)));
    console.log('\n=== HARD refinement full (top 80) ===');
    t0=Date.now();
    const top80h = hard.slice(0,80).map(r=>r[0]);
    const hardFull = await scanAll('hard','full', top80h, 0);
    console.log(`took ${((Date.now()-t0)/1000).toFixed(1)}s`);
    for (let i=0;i<25;i++) {
      const [g,e,y,tot]=hardFull[i];
      console.log(`${String(i+1).padStart(3)}. ${GUESSES[g].padEnd(8)} guesses=${e.toFixed(4)} yellows=${y.toFixed(4)} total=${tot.toFixed(4)}`);
    }
    fs.writeFileSync('computed/scan_hard_full.json', JSON.stringify(hardFull));
  }
  if (tasks === 'sog' || tasks === 'all') {
    console.log('\n=== SOG normal (yw=1, budget 600) ===');
    let t0=Date.now();
    const sog = await scanAll('normal', 600, null, 1);
    console.log(`took ${((Date.now()-t0)/1000).toFixed(1)}s`);
    for (let i=0;i<40;i++) {
      const [g,e,y,tot]=sog[i];
      console.log(`${String(i+1).padStart(3)}. ${GUESSES[g].padEnd(8)} guesses=${e.toFixed(4)} yellows=${y.toFixed(4)} 1:1=${tot.toFixed(4)}`);
    }
    fs.writeFileSync('computed/scan_sog.json', JSON.stringify(sog.slice(0,200)));
    console.log('\n=== SOG refinement full (top 80) ===');
    t0=Date.now();
    const tops = sog.slice(0,80).map(r=>r[0]);
    const sogFull = await scanAll('normal','full', tops, 1);
    console.log(`took ${((Date.now()-t0)/1000).toFixed(1)}s`);
    for (let i=0;i<25;i++) {
      const [g,e,y,tot]=sogFull[i];
      console.log(`${String(i+1).padStart(3)}. ${GUESSES[g].padEnd(8)} guesses=${e.toFixed(4)} yellows=${y.toFixed(4)} 1:1=${tot.toFixed(4)}`);
    }
    fs.writeFileSync('computed/scan_sog_full.json', JSON.stringify(sogFull));
  }
  if (tasks === 'soghard' || tasks === 'all') {
    console.log('\n=== SOG hard (yw=1) ===');
    let t0=Date.now();
    const sogh = await scanAll('hard', 600, null, 1);
    console.log(`took ${((Date.now()-t0)/1000).toFixed(1)}s`);
    for (let i=0;i<40;i++) {
      const [g,e,y,tot]=sogh[i];
      console.log(`${String(i+1).padStart(3)}. ${GUESSES[g].padEnd(8)} guesses=${e.toFixed(4)} yellows=${y.toFixed(4)} 1:1=${tot.toFixed(4)}`);
    }
    fs.writeFileSync('computed/scan_soghard.json', JSON.stringify(sogh.slice(0,200)));
    console.log('\n=== SOG hard refinement full ===');
    t0=Date.now();
    const toph = sogh.slice(0,80).map(r=>r[0]);
    const soghFull = await scanAll('hard','full', toph, 1);
    console.log(`took ${((Date.now()-t0)/1000).toFixed(1)}s`);
    for (let i=0;i<25;i++) {
      const [g,e,y,tot]=soghFull[i];
      console.log(`${String(i+1).padStart(3)}. ${GUESSES[g].padEnd(8)} guesses=${e.toFixed(4)} yellows=${y.toFixed(4)} 1:1=${tot.toFixed(4)}`);
    }
    fs.writeFileSync('computed/scan_soghard_full.json', JSON.stringify(soghFull));
  }
  if (tasks === 'fewest' || tasks === 'all') {
    console.log('\n=== FEWEST (approx via max bucket + estimate) ===');
    // For fewest we scan via max largest bucket size and second largest, plus estimated total
    // Use a quick scan without 2-ply: just partition sizes
    const cnt = new Int32Array(243);
    const res = [];
    for (let g=0; g<NG; g++) {
      cnt.fill(0);
      const base = g*NT;
      let yellows=0;
      for (let t=0; t<NT; t++) {
        const s = matrix[base + t];
        cnt[s]++;
        // yellows not needed
      }
      let max=0, second=0, nb=0;
      for (let s=0; s<243; s++) {
        const c=cnt[s];
        if (!c) continue;
        nb++;
        if (c>max) {second=max; max=c;}
        else if (c>second) second=c;
      }
      // Use max as primary, second as secondary, nb tertiary, plus estimate for tie-break
      res.push([g, max, second, nb]);
    }
    res.sort((a,b)=>a[1]-b[1] || a[2]-b[2] || b[3]-a[3]);
    console.log(`top 40 by max bucket (smaller is better for worst-case):`);
    for (let i=0;i<40;i++) {
      const [g,max,second,nb]=res[i];
      console.log(`${String(i+1).padStart(3)}. ${GUESSES[g].padEnd(8)} max=${max} second=${second} buckets=${nb}`);
    }
    fs.writeFileSync('computed/scan_fewest_max.json', JSON.stringify(res.slice(0,500)));
    // Also do 2-ply estimate for total but with fewest weighting: we want to minimize longest tail, so we can run exact builds for top candidates from both max and fastest scans
  }
};

main().catch(e=>{console.error(e); process.exit(1)});

import fs from 'fs';
import { Worker } from 'worker_threads';
import { buildMatrix, buildStaticOrder } from './sogCommon.js';
import targetWords from '../server/targetWords.js';
import guessWords from '../server/guessWords.js';
import { setSharedScores } from '../server/partition.js';
import { setState as setSogState, buildTreeForWorker as buildSogTree } from './sogBuild.js';

const sharedBuffer = buildMatrix();
const sharedArray = new Uint8Array(sharedBuffer);
setSharedScores(sharedBuffer);
console.log(`matrix ready ${sharedBuffer.byteLength}`);

const staticOrder = buildStaticOrder(sharedArray).order;
let calibRaw = JSON.parse(fs.readFileSync('data/calib.json','utf8'));
let mk = o=>{ const g=new Float64Array(o.g); const y=new Float64Array(o.y); g[1]=1; y[1]=0; return {g,y}; };
let calib = {
  normal: { g: mk(calibRaw.normal.mean).g, y: mk(calibRaw.normal.best25).y },
  hard: { g: mk(calibRaw.hard.mean).g, y: mk(calibRaw.hard.best25).y }
};
setSogState({ matrix: sharedArray, calib, staticOrder });

const saveTree = (tree, name) => {
  fs.writeFileSync(`./data/${name}.js`, `export default ${JSON.stringify(tree)}`);
  console.log(`saved data/${name}.js  guess=${tree.guess} avgG=${(tree.ranking.counts.reduce((a,c,i)=>a+c*(i+1),0)/targetWords.length).toFixed(4)} yellows=${(tree.ranking.yellows/targetWords.length).toFixed(4)} depth=${tree.depth}`);
};

const runRecalcWorker = (starter, metricName, hardMode) => {
  return new Promise((resolve, reject)=>{
    const worker = new Worker('./server/recalcWorker.js', {
      workerData: { starter, metricName, name: `${starter}.tree`, hardMode, sharedBuffer },
      resourceLimits: { maxOldGenerationSizeMb: 2048 }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', c=>{ if(c!==0) reject(new Error(`exit ${c}`))});
  });
};

// Build total/min/hard via recalcWorker
const buildRecalc = async (starter, metricName, hardMode, filename) => {
  const res = await runRecalcWorker(starter, metricName, hardMode);
  saveTree(res.tree, filename);
  return res.tree;
};

// Build SOG via sogBuild
const buildSog = (starter, mode, filename) => {
  const res = buildSogTree(starter, mode);
  saveTree(res.tree, filename);
  return res.tree;
};

console.log('\n=== Building FASTEST (total) 6 ===');
await buildRecalc('salet','total',false,'salet.tree.total'); // already exists but rebuild to ensure consistent
await buildRecalc('palet','total',false,'palet.tree.total');
await buildRecalc('rants','total',false,'rants.tree.total');
await buildRecalc('manet','total',false,'manet.tree.total');
await buildRecalc('slate','total',false,'slate.tree.total');
await buildRecalc('morne','total',false,'morne.tree.total');

console.log('\n=== Building FEWEST (min) 6 ===');
await buildRecalc('rated','min',false,'rated.tree');
await buildRecalc('ranid','min',false,'ranid.tree');
await buildRecalc('rants','min',false,'rants.tree');
await buildRecalc('saner','min',false,'saner.tree');
await buildRecalc('manet','min',false,'manet.tree');
await buildRecalc('lanes','min',false,'lanes.tree');

console.log('\n=== Building HARD (total hard) 6 ===');
await buildRecalc('palet','total',true,'palet.tree.hard');
await buildRecalc('peart','total',true,'peart.tree.hard');
await buildRecalc('trape','total',true,'trape.tree.hard');
await buildRecalc('leant','total',true,'leant.tree.hard');
await buildRecalc('trine','total',true,'trine.tree.hard');
await buildRecalc('prate','total',true,'prate.tree.hard');

console.log('\n=== Building SOG normal 3 ===');
buildSog('soree','normal','soree.tree.greens');
buildSog('suint','normal','suint.tree.greens');
buildSog('seine','normal','seine.tree.greens');

console.log('\n=== Building SOG hard 3 ===');
buildSog('suint','hard','suint.tree.hard.greens');
buildSog('shiny','hard','shiny.tree.hard.greens');
buildSog('sleet','hard','sleet.tree.hard.greens');

console.log('\nAll final trees built. Validating with sogEval...');
import { spawnSync } from 'child_process';
const treesToValidate = [
  'salet.tree.total','palet.tree.total','rants.tree.total','manet.tree.total','slate.tree.total','morne.tree.total',
  'rated.tree','ranid.tree','rants.tree','saner.tree','manet.tree','lanes.tree',
  'palet.tree.hard','peart.tree.hard','trape.tree.hard','leant.tree.hard','trine.tree.hard','prate.tree.hard',
  'soree.tree.greens','suint.tree.greens','seine.tree.greens',
  'suint.tree.hard.greens','shiny.tree.hard.greens','sleet.tree.hard.greens'
];
const result = spawnSync('node', ['--max-old-space-size=8192','scripts/sogEval.js', ...treesToValidate], {encoding:'utf-8', maxBuffer: 10*1024*1024});
console.log(result.stdout);
console.log(result.stderr);

// Parallel recompute driver for all decision trees shipped by the web apps.
//
// The score matrix is shared (and disk-cached) via ../scripts/sogCommon.js in a
// guess-major layout; each tree job runs in its own worker so total/min/hard
// builds use all cores, and the 'greens' task uses the fast exact Sea of Greens
// builder (scripts/sogBuild.js) instead of the legacy slow heuristic path.
//
// Tasks:
//   total   - Fastest Average trees (total-guesses metric)
//   min     - Fewest 5+ trees (minimize-longest metric)
//   hard    - Hard Mode trees
//   greens  - Sea of Greens trees (exact builder, 8 trees)
//   all     - total + min + hard + greens
import fs from 'fs';
import { Worker } from 'worker_threads';
import { buildMatrix, buildStaticOrder } from '../scripts/sogCommon.js';
import targetWords from './targetWords.js';
import guessWords from './guessWords.js';
import { setSharedScores } from './partition.js';

// 2 works well on 2-core sandboxes; override with RECALC_PARALLELISM.
const PARALLELISM = Math.max( 1, Math.min( 4, parseInt( process.env.RECALC_PARALLELISM || '2', 10 ) || 2 ) );

const saveTree = ( tree, name ) => {
  fs.writeFileSync( `./data/${name}.js`, `export default ${JSON.stringify( tree )}` );
};

const runWorker = ( workerModule, workerData ) => {
  return new Promise( ( resolve, reject ) => {
    const worker = new Worker( workerModule, {
      workerData,
      // Match the main-process heap budget; worker threads otherwise run with
      // small default V8 limits and thrash GC on the big tree structures.
      resourceLimits: { maxOldGenerationSizeMb: 2048, maxYoungGenerationSizeMb: 256 }
    } );
    worker.on( 'message', resolve );
    worker.on( 'error', reject );
    worker.on( 'exit', ( code ) => {
      if ( code !== 0 ) reject( new Error( `Worker ${workerModule} stopped with exit code ${code}` ) );
    } );
  } );
};

const runTreeTasks = async ( tasks ) => {
  for ( let i = 0; i < tasks.length; i += PARALLELISM ) {
    const batch = tasks.slice( i, i + PARALLELISM );
    const t0 = Date.now();
    const results = await Promise.all( batch.map( task => runWorker( './server/recalcWorker.js', { ...task, sharedBuffer } ) ) );
    batch.forEach( ( task, k ) => {
      saveTree( results[ k ].tree, task.name );
    } );
    console.log( `${batch.map( t => t.name ).join( ', ' )} done. (${( ( Date.now() - t0 ) / 1000 ).toFixed( 1 )}s)` );
  }
};

// ---- legacy-metric trees (total / min / hard) ----
const taskTotal = async () => {
  const starters = [ 'salet', 'reast', 'crate', 'trace', 'slate', 'crane' ];
  console.log( `Generating ${starters.length} total-guess trees (${PARALLELISM} parallel)...` );
  await runTreeTasks( starters.map( s => ( { starter: s, metricName: 'total', name: `${s}.tree.total`, hardMode: false } ) ) );
};

const taskMin = async () => {
  const starters = [ 'rance', 'rants', 'rated', 'ronte', 'alter', 'lance' ];
  console.log( `Generating ${starters.length} minimize-longest trees (${PARALLELISM} parallel)...` );
  await runTreeTasks( starters.map( s => ( { starter: s, metricName: 'min', name: `${s}.tree`, hardMode: false } ) ) );
};

const taskHard = async () => {
  const starters = [ 'salet', 'slate', 'least', 'trace', 'leant', 'cramp' ];
  console.log( `Generating ${starters.length} hard-mode trees (${PARALLELISM} parallel)...` );
  await runTreeTasks( starters.map( s => ( { starter: s, metricName: 'total', name: `${s}.tree.hard`, hardMode: true } ) ) );
};

// ---- Sea of Greens trees: exact builder from scripts/sogBuild.js ----
const taskGreens = async () => {
  const matrix = new Uint8Array( sharedBuffer );
  const staticOrder = buildStaticOrder( matrix ).order;
  const c = JSON.parse( fs.readFileSync( 'data/calib.json', 'utf8' ) );
  const mk = o => { const g = new Float64Array( o.g ); const y = new Float64Array( o.y ); g[ 1 ] = 1; y[ 1 ] = 0; return { g, y }; };
  const calib = {
    normal: { g: mk( c.normal.mean ).g, y: mk( c.normal.best25 ).y },
    hard: { g: mk( c.hard.mean ).g, y: mk( c.hard.best25 ).y }
  };
  const builds = [
    [ 'soily', 'normal', 'soily.tree.greens' ],
    [ 'seine', 'normal', 'seine.tree.greens' ],
    [ 'seine', 'hard', 'seine.tree.hard.greens' ],
    [ 'slice', 'hard', 'slice.tree.hard.greens' ],
    [ 'saice', 'normal', 'saice.tree.greens' ],
    [ 'suint', 'normal', 'suint.tree.greens' ],
    [ 'shiny', 'hard', 'shiny.tree.hard.greens' ],
    [ 'suint', 'hard', 'suint.tree.hard.greens' ]
  ];
  console.log( `Generating ${builds.length} Sea of Greens trees (exact builder, ${PARALLELISM} parallel)...` );
  for ( let i = 0; i < builds.length; i += PARALLELISM ) {
    const batch = builds.slice( i, i + PARALLELISM );
    const results = await Promise.all( batch.map( ( [ starter, mode ] ) => {
      return runWorker( './scripts/sogBuildWorker.js', {
        starter, mode, matrixBuffer: sharedBuffer, calibJSON: calib, staticOrderArr: staticOrder
      } );
    } ) );
    batch.forEach( ( [ starter, mode, name ], k ) => {
      const r = results[ k ];
      saveTree( r.tree, name );
      console.log( `saved data/${name}.js  (${starter} ${mode}: avgG=${r.avgG.toFixed( 4 )} avgY=${r.avgY.toFixed( 4 )} 1:1=${r.oneToOne.toFixed( 4 )} depth=${r.maxDepth})` );
    } );
  }
};

const sharedBuffer = buildMatrix();
const sharedArray = new Uint8Array( sharedBuffer );
console.log( `Score matrix ready (${targetWords.length} targets x ${guessWords.length} guesses, guess-major, ${( sharedBuffer.byteLength / 1024 / 1024 ).toFixed( 1 )} MB)` );
setSharedScores( sharedBuffer );

const task = process.argv[ 2 ] || 'all';
const treeTasks = { total: taskTotal, min: taskMin, hard: taskHard, greens: taskGreens };

( async () => {
  if ( task === 'all' ) {
    for ( const [ name, fn ] of Object.entries( treeTasks ) ) {
      console.log( `\n=== ${name} ===` );
      const t0 = Date.now();
      await fn();
      console.log( `=== ${name} finished in ${( ( Date.now() - t0 ) / 1000 ).toFixed( 1 )}s ===` );
    }
  }
  else if ( treeTasks[ task ] ) {
    const t0 = Date.now();
    await treeTasks[ task ]();
    console.log( `\n${task} finished in ${( ( Date.now() - t0 ) / 1000 ).toFixed( 1 )}s` );
  }
  else {
    console.log( 'Specify task: all (default), total, min, hard, greens' );
  }
} )();

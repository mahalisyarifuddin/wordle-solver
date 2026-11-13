// Rebuild every shipped decision tree under the corrected corpus prior.
//
// The starter sets and per-mode objectives are the ones the apps ship
// (see scripts/buildAllPreexistingModes.js); this driver just batches them,
// runs two at a time (the sandbox has two cores), and then applies the exact
// C++ endgame refinement so small buckets are optimal.
//
// Usage: node scripts/rebuildAllTrees.js [--only=total,hard,capped,hardcapped,min] [--skip-refine]
import fs from 'node:fs';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import targetWords from '../data/targetWords.js';
import guessWords from '../server/guessWords.js';
import { buildMatrix } from './sogCommon.js';
import { setSharedScores } from '../server/partition.js';
import { evaluateWeighted } from './sogEval.js';
import { getFrequencyWeights } from '../data/wordFrequencies.js';

const rootDir = path.dirname( path.dirname( fileURLToPath( import.meta.url ) ) );
const weights = getFrequencyWeights( 'wordleAnswers' );

// One build spec per shipped tree. `metric` values follow refineExactEndgames:
//   0 = weighted expected turns, 2 = weighted + 0.45 * yellows (capped knee),
//   1 = minimize longest (Fewest mode, handled by the minimax builder).
const SPECS = [
  // Fastest Average (normal mode, minimise expected turns)
  ...[ 'torse', 'trone', 'trace', 'tiare', 'roate', 'tarse' ].map( s => ( {
    starter: s, mode: 'normal', yw: 0, file: `data/${s}.tree.total.js`, group: 'total'
  } ) ),
  // Hard Mode
  ...[ 'trace', 'trone', 'tiare', 'torse', 'tarse', 'tores' ].map( s => ( {
    starter: s, mode: 'hard', yw: 0, file: `data/${s}.tree.hard.js`, group: 'hard'
  } ) ),
  // Sea of Greens capped knee (gamma = 0.45)
  ...[ 'toise', 'thale', 'trace', 'toile', 'soare', 'trone' ].map( s => ( {
    starter: s, mode: 'normal', yw: 0.45, file: `data/${s}.tree.capped.js`, group: 'capped'
  } ) ),
  // Sea of Greens capped knee, Hard Mode
  ...[ 'trace', 'toile', 'toise', 'trone', 'soare', 'torse' ].map( s => ( {
    starter: s, mode: 'hard', yw: 0.45, file: `data/${s}.tree.hard.capped.js`, group: 'hardcapped'
  } ) )
];

const FEWEST = [ 'ranid', 'rants', 'manet', 'saner', 'rated', 'lanes' ]
  .map( s => ( { starter: s, group: 'min', file: `data/${s}.tree.js` } ) );

const arg = key => {
  const found = process.argv.find( a => a.startsWith( `--${key}=` ) );
  return found ? found.slice( key.length + 3 ) : null;
};
const only = arg( 'only' );
const skipRefine = process.argv.includes( '--skip-refine' );
const PARALLELISM = Math.max( 1, parseInt( process.env.REBUILD_PARALLELISM || '2', 10 ) || 2 );

const specs = SPECS.filter( s => !only || only.split( ',' ).includes( s.group ) );

const worker = new Worker( new URL( './treeBuildWorker.js', import.meta.url ), {
  workerData: { tasks: specs },
  resourceLimits: { maxOldGenerationSizeMb: 2048, maxYoungGenerationSizeMb: 256 }
} );

let done = 0;
worker.on( 'message', msg => {
  if ( msg.type === 'built' ) {
    const { task, tree, seconds } = msg;
    fs.writeFileSync( path.join( rootDir, task.file ), `export default ${JSON.stringify( tree )}` );
    const ev = evaluateWeighted( tree, weights );
    done++;
    console.log( `[${done}/${specs.length}] ${task.file} starter=${tree.guess} ${seconds.toFixed( 1 )}s  ` +
      `E[g]=${ev.weighted.expGuesses.toFixed( 4 )} E[y]=${ev.weighted.expYellows.toFixed( 4 )} depth=${ev.maxDepth}` );
  } else if ( msg.type === 'log' ) {
    console.log( msg.text );
  }
} );
worker.on( 'error', err => {
  console.error( 'worker error', err );
  process.exit( 1 );
} );
worker.on( 'exit', code => {
  if ( code !== 0 ) {
    console.error( `worker exited with ${code}` );
    process.exit( code || 1 );
  }
  if ( skipRefine || specs.length === 0 ) {
    console.log( 'Done (no exact refinement).' );
    return;
  }
  console.log( '\nApplying exact endgame refinement (max size 3)...' );
  import( 'node:child_process' ).then( ( { execFileSync } ) => {
    execFileSync( process.execPath, [ 'scripts/refineExactEndgames.js', '--max-size=3', ...specs.map( s => s.file ) ], {
      cwd: rootDir,
      stdio: 'inherit'
    } );
    console.log( 'Done.' );
  } );
} );

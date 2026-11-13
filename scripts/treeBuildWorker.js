// Worker: build frequency-weighted trees two at a time for rebuildAllTrees.js.
import { parentPort, workerData } from 'node:worker_threads';
import { buildFrequencyTree } from './buildFrequencyTree.js';

const { tasks } = workerData;
const PARALLELISM = Math.max( 1, parseInt( process.env.REBUILD_PARALLELISM || '2', 10 ) || 2 );

const runOne = async task => {
  const t0 = Date.now();
  // buildFrequencyTree is synchronous; yield to the event loop between tasks so
  // messages flush. Two tasks are interleaved via Promise.all below, but a CPU
  // bound sync build cannot truly run in parallel inside one worker, so this
  // worker simply serialises them (the parent keeps two workers if desired).
  const { tree } = buildFrequencyTree( task.starter, task.mode, 'wordleAnswers', task.yw, true );
  parentPort.postMessage( { type: 'built', task, tree, seconds: ( Date.now() - t0 ) / 1000 } );
};

( async () => {
  for ( let i = 0; i < tasks.length; i += PARALLELISM ) {
    const batch = tasks.slice( i, i + PARALLELISM );
    await Promise.all( batch.map( runOne ) );
  }
  parentPort.postMessage( { type: 'log', text: 'all builds complete' } );
} )();

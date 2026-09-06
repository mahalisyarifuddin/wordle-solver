// Deep Sea of Greens starter scan over the ENTIRE dictionary (all 14,855 guess
// words from tabatkins/wordle-list).
// Phase 1: 2-ply lookahead scan, normal + hard mode.
// Phase 2: full-dictionary 2-ply refinement for the top starters.
// Phase 3: light 3-ply refinement for the finalists.
import fs from 'fs';
import { Worker } from 'worker_threads';
import { NG, GUESSES, buildMatrix, buildStaticOrder, loadCalib, evalStarter, setStaticOrder, newSeenState } from './sogCommon.js';

let matrixBuffer, matrix, staticOrder, calib;

const runRange = ( startIdx, endIdx, mode, budget ) => {
  return new Promise( ( resolve, reject ) => {
    const worker = new Worker( './scripts/sogScanWorker.js', {
      workerData: {
        startIdx, endIdx, matrixBuffer, calibJSON: calib, staticOrderArr: staticOrder,
        mode, budget
      }
    } );
    worker.on( 'message', resolve );
    worker.on( 'error', reject );
    worker.on( 'exit', c => { if ( c !== 0 ) reject( new Error( `worker exit ${c}` ) ); } );
  } );
};

const scanAll = async ( mode, budget, list = null ) => {
  if ( list ) {
    // single-threaded scan over a fixed starter list
    const seenState = newSeenState();
    const out = [];
    for ( const g of list ) {
      const r = evalStarter( g, matrix, calib, mode, budget, seenState );
      out.push( [ g, r.e, r.y, r.total ] );
    }
    return out.sort( ( a, b ) => a[ 3 ] - b[ 3 ] );
  }
  const SPLIT = 2;
  const ranges = [];
  for ( let i = 0; i < SPLIT; i++ ) ranges.push( [ Math.floor( NG * i / SPLIT ), Math.floor( NG * ( i + 1 ) / SPLIT ) ] );
  const results = ( await Promise.all( ranges.map( ( [ a, b ] ) => runRange( a, b, mode, budget ) ) ) ).flat();
  return results.sort( ( a, b ) => a[ 3 ] - b[ 3 ] );
};

const printTop = ( label, results, n ) => {
  console.log( `\n=== ${label} ===` );
  for ( let i = 0; i < Math.min( n, results.length ); i++ ) {
    const [ g, e, y, total ] = results[ i ];
    console.log( `${String( i + 1 ).padStart( 3 )}. ${GUESSES[ g ].padEnd( 8 )} guesses=${e.toFixed( 4 )} yellows=${y.toFixed( 4 )} 1:1=${total.toFixed( 4 )}` );
  }
};

// ---- main ----
console.log( 'Building score matrix (2315 x 14855)...' );
matrixBuffer = buildMatrix();
matrix = new Uint8Array( matrixBuffer );
console.log( 'Building static candidate order...' );
staticOrder = buildStaticOrder( matrix ).order;
setStaticOrder( staticOrder );
calib = loadCalib();

let t0 = Date.now();
const normal = await scanAll( 'normal', 600 );
printTop( 'NORMAL scan (2-ply): top 40 of 14,855 starters', normal, 40 );
console.log( `  (took ${( ( Date.now() - t0 ) / 1000 ).toFixed( 0 )}s)` );

t0 = Date.now();
const hard = await scanAll( 'hard', 600, normal.slice( 0, 700 ).map( r => r[ 0 ] ) );
printTop( 'HARD scan (2-ply, top-700 normal starters): top 40', hard, 40 );
console.log( `  (took ${( ( Date.now() - t0 ) / 1000 ).toFixed( 0 )}s)` );

// Full-dictionary 2-ply refinement (all 14,855 second guesses for every big bucket)
t0 = Date.now();
const normalFull = await scanAll( 'normal', 'full', normal.slice( 0, 80 ).map( r => r[ 0 ] ) );
const hardFull = await scanAll( 'hard', 'full', hard.slice( 0, 80 ).map( r => r[ 0 ] ) );
printTop( 'NORMAL full-dict 2-ply refinement: top 25', normalFull, 25 );
printTop( 'HARD full-dict 2-ply refinement: top 25', hardFull, 25 );
console.log( `  (took ${( ( Date.now() - t0 ) / 1000 ).toFixed( 0 )}s)` );

fs.writeFileSync( 'data/sogScan.json', JSON.stringify( {
  normal: normal.slice( 0, 200 ), hard: hard.slice( 0, 200 ),
  normalFull: normalFull, hardFull: hardFull
} ) );
console.log( '\nsaved data/sogScan.json' );

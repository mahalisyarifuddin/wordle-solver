// Deep scan of ALL 14,855 guess words as hard-mode starters,
// objective: minimize average guesses (yw=0). Also rescans hard SoG (yw=1).
import fs from 'fs';
import { Worker } from 'worker_threads';
import { NG, GUESSES, buildMatrix, buildStaticOrder, loadCalib, evalStarter, setStaticOrder, newSeenState } from './sogCommon.js';

let matrixBuffer, matrix, staticOrder, calib;

const runRange = ( startIdx, endIdx, mode, budget, yw ) => {
  return new Promise( ( resolve, reject ) => {
    const worker = new Worker( './scripts/sogScanWorker.js', {
      workerData: {
        startIdx, endIdx, matrixBuffer, calibJSON: calib, staticOrderArr: staticOrder,
        mode, budget, yw
      }
    } );
    worker.on( 'message', resolve );
    worker.on( 'error', reject );
    worker.on( 'exit', c => { if ( c !== 0 ) reject( new Error( `worker exit ${c}` ) ); } );
  } );
};

const scanAll = async ( mode, budget, yw ) => {
  const SPLIT = 2;
  const ranges = [];
  for ( let i = 0; i < SPLIT; i++ ) ranges.push( [ Math.floor( NG * i / SPLIT ), Math.floor( NG * ( i + 1 ) / SPLIT ) ] );
  const results = ( await Promise.all( ranges.map( ( [ a, b ] ) => runRange( a, b, mode, budget, yw ) ) ) ).flat();
  return results.sort( ( a, b ) => a[ 3 ] - b[ 3 ] );
};

const scanList = ( list, mode, budget, yw ) => {
  const st = newSeenState();
  const out = [];
  for ( const g of list ) {
    const r = evalStarter( g, matrix, calib, mode, budget, st, yw );
    out.push( [ g, r.e, r.y, r.total ] );
  }
  return out.sort( ( a, b ) => a[ 3 ] - b[ 3 ] );
};

const printTop = ( label, results, n ) => {
  console.log( `\n=== ${label} ===` );
  for ( let i = 0; i < Math.min( n, results.length ); i++ ) {
    const [ g, e, y, total ] = results[ i ];
    console.log( `${String( i + 1 ).padStart( 3 )}. ${GUESSES[ g ].padEnd( 8 )} guesses=${e.toFixed( 4 )} yellows=${y.toFixed( 4 )} 1:1=${total.toFixed( 4 )}` );
  }
};

console.log( 'building score matrix...' );
matrixBuffer = buildMatrix();
matrix = new Uint8Array( matrixBuffer );
staticOrder = buildStaticOrder( matrix ).order;
setStaticOrder( staticOrder );
calib = loadCalib();

let t0 = Date.now();
const hardG = await scanAll( 'hard', 600, 0 ); // pure average guesses
printTop( 'HARD (min avg guesses): top 40 of 14,855', hardG, 40 );
console.log( `  (took ${( ( Date.now() - t0 ) / 1000 ).toFixed( 0 )}s)` );

t0 = Date.now();
const hardSoG = await scanAll( 'hard', 600, 1 ); // 1:1 guesses+yellows
printTop( 'HARD SoG (1:1): top 40', hardSoG, 40 );
console.log( `  (took ${( ( Date.now() - t0 ) / 1000 ).toFixed( 0 )}s)` );

fs.writeFileSync( 'data/sogScanHard.json', JSON.stringify( {
  hardGuesses: hardG.slice( 0, 200 ), hardSoG: hardSoG.slice( 0, 200 )
} ) );
console.log( '\nsaved data/sogScanHard.json' );

// Frequency-Weighted Starter Scan
// Evaluates starters under non-uniform prior word frequency distributions
// using 2-ply lookahead with calibrated est tables.
import fs from 'fs';
import { NT, NG, GUESSES, TARGETS, buildMatrix, buildStaticOrder, loadCalib, setStaticOrder, newSeenState, evalStarter, setTargetWeights } from './sogCommon.js';
import { getFrequencyWeights } from '../data/wordFrequencies.js';

const main = () => {
  const args = process.argv.slice( 2 );
  let mode = 'normal';
  let freqModel = 'wordleAnswers';
  let budget = 600;
  let topK = 30;
  let startersList = null;

  for ( const arg of args ) {
    if ( arg === 'hard' || arg === 'normal' ) mode = arg;
    else if ( arg.startsWith( '--freq=' ) ) freqModel = arg.slice( 7 );
    else if ( arg.startsWith( '--budget=' ) ) budget = arg.slice( 9 ) === 'full' ? 'full' : parseInt( arg.slice( 9 ), 10 );
    else if ( arg.startsWith( '--top=' ) ) topK = parseInt( arg.slice( 6 ), 10 );
    else if ( arg.startsWith( '--starters=' ) ) startersList = arg.slice( 11 ).split( ',' ).map( s => s.trim().toLowerCase() );
  }

  console.log( `=== Wordle Frequency Scan ===` );
  console.log( `Mode: ${mode} | Frequency Model: ${freqModel} | Budget: ${budget}` );

  const weights = getFrequencyWeights( freqModel );
  setTargetWeights( weights );

  console.log( 'Building score matrix...' );
  const matrixBuffer = buildMatrix();
  const matrix = new Uint8Array( matrixBuffer );

  console.log( 'Computing weighted static ordering...' );
  const staticOrder = buildStaticOrder( matrix, weights ).order;
  setStaticOrder( staticOrder );

  const calib = loadCalib( 'best25' );
  const st = newSeenState();

  let scanIndices = [];
  if ( startersList && startersList.length > 0 ) {
    const guessMap = new Map( GUESSES.map( ( w, i ) => [ w, i ] ) );
    for ( const w of startersList ) {
      const idx = guessMap.get( w );
      if ( idx !== undefined ) scanIndices.push( idx );
      else console.warn( `Warning: starter '${w}' not in dictionary.` );
    }
  } else {
    // Scan top static candidates or all guesses
    const scanCount = typeof budget === 'number' ? Math.min( 1000, NG ) : NG;
    scanIndices = staticOrder.slice( 0, scanCount );
  }

  console.log( `Scanning ${scanIndices.length} starters...` );
  const results = [];
  const t0 = Date.now();

  for ( let i = 0; i < scanIndices.length; i++ ) {
    const g = scanIndices[ i ];
    const r = evalStarter( g, matrix, calib, mode, budget, st, 0.35, weights );
    results.push( {
      guess: GUESSES[ g ],
      e: r.e,
      y: r.y,
      total: r.total
    } );

    if ( ( i + 1 ) % 200 === 0 || i + 1 === scanIndices.length ) {
      const elapsed = ( ( Date.now() - t0 ) / 1000 ).toFixed( 1 );
      console.log( `  Progress: ${i + 1}/${scanIndices.length} (${elapsed}s)` );
    }
  }

  results.sort( ( a, b ) => a.e - b.e || a.total - b.total );

  console.log( `\n=== Top ${Math.min( topK, results.length )} Starters Ranked by Weighted Expected Turns (E[guesses]) ===` );
  console.log( `Rank | Starter  | E[guesses] | E[yellows] | Knee Joint (0.35)` );
  console.log( `-----|----------|------------|------------|------------------` );
  for ( let i = 0; i < Math.min( topK, results.length ); i++ ) {
    const r = results[ i ];
    const rankStr = ( i + 1 ).toString().padStart( 4 );
    const guessStr = r.guess.toUpperCase().padEnd( 8 );
    const eStr = r.e.toFixed( 4 ).padStart( 10 );
    const yStr = r.y.toFixed( 4 ).padStart( 10 );
    const jointStr = r.total.toFixed( 4 ).padStart( 17 );
    console.log( `${rankStr} | ${guessStr} | ${eStr} | ${yStr} | ${jointStr}` );
  }
};

main();

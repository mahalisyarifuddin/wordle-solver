// Audit the priors used to build the shipped trees.
//
// Motivation: `getFrequencyWeights('wordleAnswers')` flattens every
// non-official-answer word to one shared epsilon weight, so the 12,540
// non-answer targets are exact ties. Any decision inside a bucket made of
// those words is then decided by iteration order (targetWords is sorted
// alphabetically), which produces the classic MOBIE > MOLIE > MOMIE > MOWIE >
// MOXIE march instead of guessing the actual word.
//
// This script reports, for every shipped tree:
//   - E[guesses] / E[yellows] under the old flat prior and under real
//     corpus frequencies (with and without an official-answer boost)
//   - how many words share the flat prior weight (the tie mass)
//   - the worst "alphabetical march": the longest run of consecutive
//     information guesses inside a bucket that a human would see
//
// Usage: node scripts/auditPriors.js [--trees=a,b] [--no-validate]
import fs from 'node:fs';
import targetWords from '../data/targetWords.js';
import { score } from '../server/wordleCore.js';
import { getFrequencyWeights, WORDLE_ANSWERS_SET } from '../data/wordFrequencies.js';
import { evaluateWeighted } from './sogEval.js';

const allTreeFiles = [
  ...['torse', 'trone', 'trace', 'tiare', 'roate', 'tarse'].map( w => `data/${w}.tree.total.js` ),
  ...['ranid', 'rants', 'manet', 'saner', 'rated', 'lanes'].map( w => `data/${w}.tree.js` ),
  ...['trace', 'trone', 'tiare', 'torse', 'tarse', 'tores'].map( w => `data/${w}.tree.hard.js` ),
  ...['toise', 'thale', 'trace', 'toile', 'soare', 'trone'].map( w => `data/${w}.tree.capped.js` ),
  ...['trace', 'toile', 'toise', 'trone', 'soare', 'torse'].map( w => `data/${w}.tree.hard.capped.js` )
];

const argFiles = process.argv.find( a => a.startsWith( '--trees=' ) );
const files = argFiles ? argFiles.slice( 8 ).split( ',' ).map( s => s.trim() ) : allTreeFiles;

const loadTree = file => {
  const contents = fs.readFileSync( file, 'utf8' );
  return JSON.parse( contents.slice( contents.indexOf( '{' ) ) );
};

// Longest run of consecutive guesses that are *not* the remaining answer
// (i.e. information-only guesses) inside a single bucket, plus the deepest path.
const marchStats = tree => {
  let worstRun = 0;
  let worstPath = null;
  let maxDepth = 0;
  let deepest = null;
  for ( const answer of targetWords ) {
    let node = tree;
    const guesses = [];
    while ( typeof node !== 'string' ) {
      const s = score( answer, node.guess );
      guesses.push( node.guess );
      if ( s === '22222' ) break;
      node = node.map[ s ];
      if ( node === undefined ) break;
    }
    if ( typeof node === 'string' ) guesses.push( node );
    let run = 0;
    let bestRun = 0;
    // The last guess is always the answer; runs of guesses that are not the
    // answer before it are pure "marching" through the bucket.
    for ( let i = 0; i < guesses.length - 1; i++ ) {
      if ( guesses[ i ] !== answer ) { run++; bestRun = Math.max( bestRun, run ); }
      else run = 0;
    }
    if ( bestRun > worstRun ) { worstRun = bestRun; worstPath = { answer, guesses }; }
    if ( guesses.length > maxDepth ) { maxDepth = guesses.length; deepest = { answer, guesses }; }
  }
  return { worstRun, worstPath, maxDepth, deepest };
};

// Prior bookkeeping: how much probability mass sits on exact ties.
const tieStats = weights => {
  const counts = new Map();
  for ( let i = 0; i < weights.length; i++ ) {
    const key = weights[ i ];
    counts.set( key, ( counts.get( key ) || 0 ) + 1 );
  }
  let tiedWords = 0;
  let tiedMass = 0;
  for ( const [ key, count ] of counts ) {
    if ( count > 1 ) { tiedWords += count; tiedMass += key * count; }
  }
  return { distinct: counts.size, tiedWords, tiedMass };
};

const models = {
  'corpus (real frequencies)': getFrequencyWeights( 'corpus' ),
  'corpus+answers x10': getFrequencyWeights( 'corpus', {} ) // placeholder, replaced below
};
// Build the answer-boosted variants explicitly.
models[ 'corpus+answers x10' ] = getFrequencyWeights( 'hybrid', { answerBoost: 10 } );
const oldPrior = getFrequencyWeights( 'wordleAnswers' );

const header = [ 'tree', 'flat: E[g]', 'corpus: E[g]', 'hybrid x10: E[g]', 'flat: march', 'corpus: march' ];
console.log( header.join( '\t' ) );
console.log( [ 1, 2, 3, 4, 5, 6 ].map( () => '' ).join( '\t' ) );

const rows = [];
for ( const file of files ) {
  const tree = loadTree( file );
  const flat = evaluateWeighted( tree, oldPrior );
  const corpus = evaluateWeighted( tree, models[ 'corpus (real frequencies)' ] );
  const hybrid = evaluateWeighted( tree, models[ 'corpus+answers x10' ] );
  const march = marchStats( tree );
  rows.push( {
    file,
    flatE: flat.weighted.expGuesses,
    corpusE: corpus.weighted.expGuesses,
    hybridE: hybrid.weighted.expGuesses,
    flatMarch: march.worstRun,
    flatPath: march.worstPath,
    maxDepth: march.maxDepth,
    deepest: march.deepest
  } );
}

rows.sort( ( a, b ) => b.flatE - a.flatE );
for ( const r of rows ) {
  console.log( `${r.file.padEnd( 34 )}\t${r.flatE.toFixed( 4 )}\t${r.corpusE.toFixed( 4 )}\t${r.hybridE.toFixed( 4 )}\t${r.flatMarch}\t${r.maxDepth}` );
}

console.log( '\nFlat-prior tie statistics:' );
const t = tieStats( oldPrior );
console.log( `  distinct weight values: ${t.distinct}/${oldPrior.length}` );
console.log( `  words on a shared weight: ${t.tiedWords} (${( t.tiedWords / oldPrior.length * 100 ).toFixed( 1 )}% of targets)` );
console.log( `  probability mass on ties: ${( t.tiedMass * 100 ).toFixed( 2 )}%` );
const tc = tieStats( models[ 'corpus (real frequencies)' ] );
console.log( `  real-frequency prior: ${tc.distinct}/${oldPrior.length} distinct values, ${( tc.tiedMass * 100 ).toFixed( 2 )}% tied mass` );

console.log( '\nWorst alphabetical march per tree (flat prior):' );
for ( const r of rows.slice( 0, 8 ) ) {
  if ( r.flatPath ) {
    console.log( `  ${r.file}: ${r.flatPath.guesses.join( ' > ' )}  (answer=${r.flatPath.answer}, run=${r.flatMarch})` );
  }
}

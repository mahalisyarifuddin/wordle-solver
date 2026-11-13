// Compare two tree files across every answer: alphabetical marches, depth, and
// the weighted objective. Used to verify a rebuild did not regress quality.
import fs from 'node:fs';
import targetWords from '../data/targetWords.js';
import { score } from '../server/wordleCore.js';
import { getFrequencyWeights } from '../data/wordFrequencies.js';
import { evaluateWeighted } from './sogEval.js';

const loadTree = file => {
  const contents = fs.readFileSync( file, 'utf8' );
  return JSON.parse( contents.slice( contents.indexOf( '{' ) ) );
};

const pathFor = ( tree, answer ) => {
  let node = tree;
  const guesses = [];
  while ( typeof node !== 'string' ) {
    const s = score( answer, node.guess );
    guesses.push( node.guess );
    if ( s === '22222' ) return guesses;
    node = node.map[ s ];
    if ( node === undefined ) return null;
  }
  guesses.push( node );
  return guesses;
};

const marchRun = ( guesses, answer ) => {
  let run = 0, best = 0;
  for ( let i = 0; i < guesses.length - 1; i++ ) {
    if ( guesses[ i ] !== answer ) { run++; best = Math.max( best, run ); }
    else run = 0;
  }
  return best;
};

const baseline = getFrequencyWeights( 'wordleAnswers' );
const stats = ( file, weights ) => {
  const tree = loadTree( file );
  const ev = evaluateWeighted( tree, weights );
  let maxDepth = 0, totalMarch = 0, worst = 0, worstWord = null, worstPath = null;
  for ( const answer of targetWords ) {
    const p = pathFor( tree, answer );
    if ( !p ) { worstPath = 'BROKEN: ' + answer; continue; }
    if ( p.length > maxDepth ) maxDepth = p.length;
    const run = marchRun( p, answer );
    totalMarch += run;
    if ( run > worst ) { worst = run; worstWord = answer; worstPath = p.join( ' > ' ); }
  }
  return { ev, maxDepth, avgMarch: totalMarch / targetWords.length, worst, worstWord, worstPath };
};

const [ fileA, fileB ] = process.argv.slice( 2 );
for ( const file of [ fileA, fileB ] ) {
  if ( !file ) continue;
  const s = stats( file, baseline );
  console.log( `\n${file}` );
  console.log( `  E[guesses]=${s.ev.weighted.expGuesses.toFixed(4)} E[yellows]=${s.ev.weighted.expYellows.toFixed(4)} L_capped=${s.ev.weighted.cappedScore.toFixed(4)} depth=${s.ev.maxDepth}` );
  console.log( `  max path length=${s.maxDepth}  avg info-only march=${s.avgMarch.toFixed(3)}  worst march=${s.worst} (${s.worstWord})` );
  console.log( `  worst path: ${s.worstPath}` );
}

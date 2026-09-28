// Exact evaluator + structural verifier for stored Wordle decision trees.
// Recomputes the ranking (guess counts + yellows) from the tree structure itself
// and cross-checks it against the stored ranking, verifies leaf coverage of the
// target dictionary, and validates every edge's score pattern.
import fs from 'fs';
import targetWords from '../data/targetWords.js';
import guessWords from '../server/guessWords.js';
import { fastScore, getYellows } from '../server/wordleCore.js';
import { getFrequencyWeights, WORDLE_ANSWERS_SET } from '../data/wordFrequencies.js';

const TARGETS = targetWords;
const TARGET_SET = new Set( TARGETS );
const GUESS_SET = new Set( guessWords );
const targetIndexMap = new Map( TARGETS.map( ( w, i ) => [ w, i ] ) );

// returns { counts, yellows, leaves, depth, wordStats } for a tree, walking recursively
const evalTree = ( tree, words, guessCount = 1, yellowsAccum = 0 ) => {
  const counts = [];
  const yellowsByDepth = {};
  const wordStats = new Map(); // word -> { depth, yellows }
  let leaves = 0;
  let maxDepth = 0;

  const stack = [ { node: tree, words, guessCount: 1, yellowsAccum: 0 } ];
  while ( stack.length ) {
    const { node, words, guessCount, yellowsAccum } = stack.pop();
    maxDepth = Math.max( maxDepth, guessCount - 1 );
    const map = node.map;
    for ( const score in map ) {
      const child = map[ score ];
      if ( score === '22222' ) {
        // solved by this node's own guess
        leaves++;
        counts[ guessCount ] = ( counts[ guessCount ] || 0 ) + 1;
        yellowsByDepth[ guessCount ] = ( yellowsByDepth[ guessCount ] || 0 ) + yellowsAccum;
        wordStats.set( node.guess, { depth: guessCount, yellows: yellowsAccum } );
        if ( typeof child !== 'string' || !TARGET_SET.has( child ) ) {
          throw new Error( `22222 branch must be a target word leaf (guess=${node.guess})` );
        }
      }
      else if ( typeof child === 'string' ) {
        // leaf word: guessed next, solved
        leaves++;
        counts[ guessCount + 1 ] = ( counts[ guessCount + 1 ] || 0 ) + 1;
        const totalY = yellowsAccum + getYellows( score );
        yellowsByDepth[ guessCount + 1 ] = ( yellowsByDepth[ guessCount + 1 ] || 0 ) + totalY;
        wordStats.set( child, { depth: guessCount + 1, yellows: totalY } );
        if ( !TARGET_SET.has( child ) ) {
          throw new Error( `Leaf '${child}' is not a target word (path guess=${node.guess} score=${score})` );
        }
      }
      else {
        stack.push( { node: child, words: null, guessCount: guessCount + 1, yellowsAccum: yellowsAccum + getYellows( score ) } );
      }
    }
  }
  return { counts, yellows: Object.values( yellowsByDepth ).reduce( ( a, b ) => a + b, 0 ), leaves, maxDepth, wordStats };
};

// Validate edge scores against the dictionary: recompute words per node from parent partition
const validateScores = ( tree, words ) => {
  const stack = [ { node: tree, words } ];
  let nodes = 0;
  let edges = 0;
  while ( stack.length ) {
    const { node, words } = stack.pop();
    nodes++;
    if ( !GUESS_SET.has( node.guess ) ) throw new Error( `Guess '${node.guess}' not in dictionary` );
    const map = node.map;
    for ( const score in map ) {
      edges++;
      let scoreInt = 0;
      for ( let i = 0; i < score.length; i++ ) scoreInt += ( score.charCodeAt( i ) - 48 ) * Math.pow( 3, i );
      const childWords = words.filter( w => fastScore( w, node.guess ) === scoreInt );
      const child = map[ score ];
      if ( typeof child === 'string' ) {
        if ( childWords.length !== 1 || childWords[ 0 ] !== child ) {
          throw new Error( `Leaf mismatch at guess=${node.guess} score=${score}: expected ${childWords} got '${child}'` );
        }
      }
      else {
        // verify subtree leaf words == childWords (coverage)
        stack.push( { node: child, words: childWords } );
      }
    }
  }
  return { nodes, edges };
};

const collectLeaves = tree => {
  const out = [];
  const stack = [ tree ];
  while ( stack.length ) {
    const node = stack.pop();
    for ( const score in node.map ) {
      const child = node.map[ score ];
      if ( typeof child === 'string' ) out.push( child );
      else stack.push( child );
    }
  }
  return out;
};

export const evaluateWeighted = ( tree, weights = null ) => {
  const { counts, yellows, leaves, maxDepth, wordStats } = evalTree( tree, TARGETS );
  const total = counts.reduce( ( a, b ) => a + b, 0 );
  if ( leaves !== TARGETS.length || total !== TARGETS.length ) {
    throw new Error( `Leaf count ${leaves}/${total} != ${TARGETS.length}` );
  }

  // Uniform evaluation
  let guessSum = 0;
  for ( let i = 0; i < counts.length; i++ ) guessSum += ( counts[ i ] || 0 ) * i;
  const avgGuesses = guessSum / TARGETS.length;
  const avgYellows = yellows / TARGETS.length;

  // Stored ranking cross-check
  const stored = tree.ranking;
  let storedSum = 0;
  for ( let i = 0; i < stored.counts.length; i++ ) storedSum += ( stored.counts[ i ] || 0 ) * ( i + 1 );
  const storedAvg = storedSum / TARGETS.length;
  const storedYellows = stored.yellows;

  let rankOk = true;
  if ( stored.counts.length !== counts.length - 1 ) {
    rankOk = Math.abs( storedAvg - avgGuesses ) < 1e-9 && Math.abs( storedYellows - yellows ) < 1e-9;
  }
  else {
    for ( let i = 0; i < stored.counts.length; i++ ) {
      if ( stored.counts[ i ] !== ( counts[ i + 1 ] || 0 ) ) { rankOk = false; break; }
    }
    rankOk = rankOk && Math.abs( storedYellows - yellows ) < 1e-9;
  }

  // Frequency-weighted evaluation
  let wExpG = 0;
  let wExpY = 0;
  let wPenalty = 0;
  let wWinRate = 0;
  let answersExpG = 0;
  let answersCount = 0;

  const wArray = weights || getFrequencyWeights( 'uniform' );
  for ( let i = 0; i < TARGETS.length; i++ ) {
    const word = TARGETS[ i ];
    const stat = wordStats.get( word );
    if ( !stat ) continue;
    const w = wArray[ i ];
    wExpG += w * stat.depth;
    wExpY += w * stat.yellows;
    if ( stat.depth > 6 ) {
      wPenalty += w * Math.pow( stat.depth - 6, 2 );
    } else {
      wWinRate += w;
    }

    if ( WORDLE_ANSWERS_SET.has( word ) ) {
      answersExpG += stat.depth;
      answersCount++;
    }
  }

  const avgGuessesWordleAnswers = answersCount > 0 ? answersExpG / answersCount : 0;
  const cappedScore = wExpG + 0.35 * wExpY + 1.0 * wPenalty;

  return {
    avgGuesses, avgYellows, oneToOne: avgGuesses + avgYellows,
    leaves, maxDepth, counts: counts.slice( 1 ),
    yellows, storedAvg, storedYellows, rankOk,
    weighted: {
      expGuesses: wExpG,
      expYellows: wExpY,
      expOneToOne: wExpG + wExpY,
      penalty: wPenalty,
      cappedScore: cappedScore,
      winRateWithin6: wWinRate,
      avgGuessesWordleAnswers
    }
  };
};

export const evaluate = tree => evaluateWeighted( tree, null );

const loadTree = name => {
  const filePath = name.endsWith('.js') ? name : `data/${name}.js`;
  const s = fs.readFileSync( filePath, 'utf8' );
  return JSON.parse( s.slice( s.indexOf( '{' ) ) );
};

const main = () => {
  const args = process.argv.slice( 2 );
  let freqModel = 'uniform';
  const names = [];

  for ( const arg of args ) {
    if ( arg.startsWith( '--freq=' ) ) {
      freqModel = arg.slice( 7 );
    } else {
      names.push( arg );
    }
  }

  const weights = getFrequencyWeights( freqModel );

  for ( const name of names ) {
    try {
      const tree = loadTree( name );
      const r = evaluateWeighted( tree, weights );
      const v = validateScores( tree, TARGETS );
      const leaves = collectLeaves( tree );
      const unique = new Set( leaves );
      console.log( `\n${name}: starter='${tree.guess}'  depth=${r.maxDepth}  leaves=${r.leaves} (unique=${unique.size})` );
      console.log( `  [Uniform]  avgGuesses=${r.avgGuesses.toFixed( 4 )}  avgYellows=${r.avgYellows.toFixed( 4 )}  1:1=${r.oneToOne.toFixed( 4 )}` );
      console.log( `  [Weighted (${freqModel})] E[guesses]=${r.weighted.expGuesses.toFixed( 4 )}  E[yellows]=${r.weighted.expYellows.toFixed( 4 )}  L_capped=${r.weighted.cappedScore.toFixed( 4 )}  WinRate<=6=${( r.weighted.winRateWithin6 * 100 ).toFixed( 2 )}%` );
      console.log( `  [NYT Answers (2315)] avgGuesses=${r.weighted.avgGuessesWordleAnswers.toFixed( 4 )}` );
      console.log( `  counts=${JSON.stringify( r.counts )}  rankOk=${r.rankOk}  scoreEdgesOk=${v.nodes} nodes / ${v.edges} edges verified` );
    }
    catch ( e ) {
      console.log( `\n${name}: FAILED - ${e.message}` );
    }
  }
};

if ( process.argv[ 1 ] && ( process.argv[ 1 ].endsWith( 'sogEval.js' ) || process.argv[ 1 ].includes( 'sogEval' ) ) ) {
  main();
}


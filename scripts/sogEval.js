// Exact evaluator + structural verifier for stored Wordle decision trees.
// Recomputes the ranking (guess counts + yellows) from the tree structure itself
// and cross-checks it against the stored ranking, verifies leaf coverage of the
// target dictionary, and validates every edge's score pattern.
import fs from 'fs';
import targetWords from '../data/targetWords.js';
import guessWords from '../server/guessWords.js';
import { fastScore, getYellows } from '../server/wordleCore.js';

const TARGETS = targetWords;
const TARGET_SET = new Set( TARGETS );
const GUESS_SET = new Set( guessWords );

// returns { counts, yellows, leaves, depth, maxCounts } for a tree, walking recursively
const evalTree = ( tree, words, guessCount = 1, yellowsAccum = 0 ) => {
  const counts = [];
  const yellowsByDepth = {};
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
        if ( typeof child !== 'string' || !TARGET_SET.has( child ) ) {
          throw new Error( `22222 branch must be a target word leaf (guess=${node.guess})` );
        }
      }
      else if ( typeof child === 'string' ) {
        // leaf word: guessed next, solved
        leaves++;
        counts[ guessCount + 1 ] = ( counts[ guessCount + 1 ] || 0 ) + 1;
        yellowsByDepth[ guessCount + 1 ] = ( yellowsByDepth[ guessCount + 1 ] || 0 ) + yellowsAccum + getYellows( score );
        if ( !TARGET_SET.has( child ) ) {
          throw new Error( `Leaf '${child}' is not a target word (path guess=${node.guess} score=${score})` );
        }
      }
      else {
        stack.push( { node: child, words: null, guessCount: guessCount + 1, yellowsAccum: yellowsAccum + getYellows( score ) } );
      }
    }
  }
  return { counts, yellows: Object.values( yellowsByDepth ).reduce( ( a, b ) => a + b, 0 ), leaves, maxDepth };
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

const evaluate = ( tree ) => {
  const { counts, yellows, leaves, maxDepth } = evalTree( tree, TARGETS );
  const total = counts.reduce( ( a, b ) => a + b, 0 );
  if ( leaves !== TARGETS.length || total !== TARGETS.length ) {
    throw new Error( `Leaf count ${leaves}/${total} != ${TARGETS.length}` );
  }
  let guessSum = 0;
  for ( let i = 0; i < counts.length; i++ ) guessSum += ( counts[ i ] || 0 ) * i;
  const avgGuesses = guessSum / TARGETS.length;
  const avgYellows = yellows / TARGETS.length;

  // cross-check stored ranking
  const stored = tree.ranking;
  let storedSum = 0;
  for ( let i = 0; i < stored.counts.length; i++ ) storedSum += ( stored.counts[ i ] || 0 ) * ( i + 1 );
  const storedAvg = storedSum / TARGETS.length;
  const storedYellows = stored.yellows;

  // compare stored counts (offset by 1) to recomputed
  let rankOk = true;
  if ( stored.counts.length !== counts.length - 1 ) {
    // stored counts length may differ; compare aggregate
    rankOk = Math.abs( storedAvg - avgGuesses ) < 1e-9 && Math.abs( storedYellows - yellows ) < 1e-9;
  }
  else {
    for ( let i = 0; i < stored.counts.length; i++ ) {
      if ( stored.counts[ i ] !== ( counts[ i + 1 ] || 0 ) ) { rankOk = false; break; }
    }
    rankOk = rankOk && Math.abs( storedYellows - yellows ) < 1e-9;
  }
  return {
    avgGuesses, avgYellows, oneToOne: avgGuesses + avgYellows,
    leaves, maxDepth, counts: counts.slice( 1 ),
    yellows, storedAvg, storedYellows, rankOk
  };
};

const loadTree = name => {
  const s = fs.readFileSync( `data/${name}.js`, 'utf8' );
  return JSON.parse( s.slice( s.indexOf( '{' ) ) );
};

const main = () => {
  const names = process.argv.slice( 2 );
  for ( const name of names ) {
    try {
      const tree = loadTree( name );
      const r = evaluate( tree );
      const v = validateScores( tree, TARGETS );
      const leaves = collectLeaves( tree );
      const unique = new Set( leaves );
      console.log( `\n${name}: starter='${tree.guess}'  depth=${r.maxDepth}  leaves=${r.leaves} (unique=${unique.size})` );
      console.log( `  avgGuesses=${r.avgGuesses.toFixed( 4 )}  avgYellows=${r.avgYellows.toFixed( 4 )}  1:1=${r.oneToOne.toFixed( 4 )}` );
      console.log( `  counts=${JSON.stringify( r.counts )}  rankOk=${r.rankOk}  scoreEdgesOk=${v.nodes} nodes / ${v.edges} edges verified` );
    }
    catch ( e ) {
      console.log( `\n${name}: FAILED - ${e.message}` );
    }
  }
};

main();

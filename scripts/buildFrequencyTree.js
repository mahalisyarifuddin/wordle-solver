// Exact Frequency-Weighted Decision Tree Builder
// Builds a decision tree optimized for a given prior word frequency distribution.
import fs from 'fs';
import targetWords from '../data/targetWords.js';
import guessWords from '../server/guessWords.js';
import { NT, NG, GUESSES, TARGETS, t2g, buildMatrix, buildStaticOrder, loadCalib, setStaticOrder, evalCandidate, setTargetWeights } from './sogCommon.js';
import { getYellows, getHardModeConstraints, isHardModeValidOptimized } from '../server/wordleCore.js';
import { getFrequencyWeights } from '../data/wordFrequencies.js';
import { evaluateWeighted } from './sogEval.js';

let matrix, calib, staticOrder, targetWeights;
let YELLOW_WEIGHT = 0.35;

const toScoreString = int => {
  let s = '';
  let v = int;
  for ( let i = 0; i < 5; i++ ) { s += v % 3; v = Math.floor( v / 3 ); }
  return s;
};

const YELLOWS_ARRAY = new Uint8Array( 243 );
for ( let i = 0; i < 243; i++ ) {
  let y = 0, v = i;
  for ( let k = 0; k < 5; k++ ) { if ( v % 3 === 1 ) y++; v = Math.floor( v / 3 ); }
  YELLOWS_ARRAY[ i ] = y;
}

const rankCandidates = ( words, base, len, mode, constraint, topN ) => {
  const est = calib[ mode ];
  const cnt2 = new Int32Array( 243 );
  const wcnt2 = new Float64Array( 243 );
  const touched = new Int32Array( 243 );
  const considered = new Uint8Array( NG );
  const results = [];

  const consider = gi => {
    if ( considered[ gi ] ) return;
    considered[ gi ] = 1;
    if ( mode === 'hard' && constraint && !isHardModeValidOptimized( GUESSES[ gi ], constraint ) ) return;
    const r = evalCandidate( words, base, len, gi, matrix, est, cnt2, touched, null, targetWeights, wcnt2 );
    if ( r.joint !== Infinity ) results.push( [ gi, r.E, r.Y, r.E + YELLOW_WEIGHT * r.Y ] );
  };

  const ibOnly = len <= 2;
  for ( let i = 0; i < len; i++ ) consider( t2g[ words[ base + i ] ] );
  const topStatic = Math.min( 1500, NG );
  for ( let k = 0; k < topStatic && !ibOnly; k++ ) consider( staticOrder[ k ] );

  if ( len >= 12 && !ibOnly ) {
    const cnt = new Float64Array( 243 );
    const onePly = [];
    for ( let gi = 0; gi < NG; gi++ ) {
      if ( considered[ gi ] ) continue;
      if ( mode === 'hard' && constraint && !isHardModeValidOptimized( GUESSES[ gi ], constraint ) ) continue;
      cnt.fill( 0 );
      let y = 0;
      for ( let i = 0; i < len; i++ ) {
        const t = words[ base + i ];
        const s = matrix[ gi * NT + t ];
        const w = targetWeights ? targetWeights[ t ] : 1;
        cnt[ s ] += w;
        y += YELLOWS_ARRAY[ s ] * w;
      }
      let sq = 0;
      for ( let s = 0; s < 243; s++ ) if ( cnt[ s ] ) sq += cnt[ s ] * cnt[ s ];
      onePly.push( [ gi, sq, y ] );
    }
    onePly.sort( ( a, b ) => a[ 1 ] - b[ 1 ] || a[ 2 ] - b[ 2 ] );
    const top = mode === 'hard' ? 120 : 80;
    for ( let i = 0; i < Math.min( top, onePly.length ); i++ ) consider( onePly[ i ][ 0 ] );
  }

  results.sort( ( a, b ) => a[ 3 ] - b[ 3 ] || a[ 1 ] - b[ 1 ] );
  return results.slice( 0, topN );
};

const buildGreedy = ( words0, base0, len0, mode, constraint0 ) => {
  const makeFrame = ( words, base, len, constraint, parent, scoreStr ) => ( {
    words, base, len, constraint, parent, scoreStr,
    started: false, guess: null, node: null, partition: null, pending: [], results: {}
  } );
  const assemble = fr => {
    const counts = [];
    let yellows = 0;
    let depth = 0;
    for ( let s = 0; s < 243; s++ ) {
      const child = fr.node.map[ toScoreString( s ) ];
      if ( child === undefined ) continue;
      const scoreStr = toScoreString( s );
      if ( scoreStr === '22222' ) {
        counts[ 0 ] = ( counts[ 0 ] || 0 ) + 1;
      }
      else if ( typeof child === 'string' ) {
        counts[ 1 ] = ( counts[ 1 ] || 0 ) + 1;
        yellows += getYellows( scoreStr );
        depth = Math.max( depth, 1 );
      }
      else {
        const r = child.ranking;
        let total = 0;
        for ( let i = 0; i < r.counts.length; i++ ) total += r.counts[ i ];
        for ( let i = 0; i < r.counts.length; i++ ) counts[ i + 1 ] = ( counts[ i + 1 ] || 0 ) + ( r.counts[ i ] || 0 );
        yellows += r.yellows + getYellows( scoreStr ) * total;
        depth = Math.max( depth, 1 + child.depth );
      }
    }
    fr.node.ranking = { counts: fillCounts( counts ), yellows };
    fr.node.depth = depth;
    return fr.node;
  };

  const stack = [ makeFrame( words0, base0, len0, constraint0, null, null ) ];
  let rootNode = null;

  while ( stack.length ) {
    const fr = stack[ stack.length - 1 ];
    if ( !fr.started ) {
      fr.started = true;
      if ( fr.len === 1 ) {
        stack.pop();
        const leafWord = TARGETS[ fr.words[ fr.base ] ];
        if ( fr.parent ) {
          fr.parent.results[ fr.scoreStr ] = leafWord;
        } else {
          rootNode = { guess: leafWord, map: { '22222': leafWord }, ranking: { counts: [ 1 ], yellows: 0 }, depth: 0 };
        }
        continue;
      }
      const top = rankCandidates( fr.words, fr.base, fr.len, mode, fr.constraint, 1 );
      if ( !top.length ) throw new Error( `no valid candidates for len=${fr.len}` );
      const gi = top[ 0 ][ 0 ];
      fr.guess = GUESSES[ gi ];
      fr.node = { guess: fr.guess, map: {}, ranking: null, depth: 0 };

      // Partition
      const row = gi * NT;
      const cnt = new Int32Array( 243 );
      for ( let i = 0; i < fr.len; i++ ) cnt[ matrix[ row + fr.words[ fr.base + i ] ] ]++;
      const offs = new Int32Array( 243 );
      let off = 0;
      for ( let s = 0; s < 243; s++ ) { offs[ s ] = off; off += cnt[ s ]; }
      const flat = new Int32Array( fr.len );
      const cur = new Int32Array( 243 );
      for ( let i = 0; i < fr.len; i++ ) {
        const t = fr.words[ fr.base + i ];
        const s = matrix[ row + t ];
        flat[ offs[ s ] + cur[ s ]++ ] = t;
      }
      fr.partition = { flat, offs, cnt };

      for ( let s = 0; s < 243; s++ ) {
        const n = cnt[ s ];
        if ( !n ) continue;
        const scoreStr = toScoreString( s );
        if ( scoreStr === '22222' ) {
          fr.results[ scoreStr ] = fr.guess;
        }
        else if ( n === 1 ) {
          fr.results[ scoreStr ] = TARGETS[ flat[ offs[ s ] ] ];
        }
        else {
          let childConstraint = null;
          if ( mode === 'hard' ) childConstraint = getHardModeConstraints( fr.guess, scoreStr );
          fr.pending.push( { s, base: offs[ s ], len: n, constraint: childConstraint, scoreStr } );
        }
      }
    }

    if ( fr.pending.length ) {
      const p = fr.pending.pop();
      stack.push( makeFrame( fr.partition.flat, p.base, p.len, p.constraint, fr, p.scoreStr ) );
    } else {
      for ( const sStr in fr.results ) fr.node.map[ sStr ] = fr.results[ sStr ];
      const res = assemble( fr );
      stack.pop();
      if ( fr.parent ) {
        fr.parent.results[ fr.scoreStr ] = res;
      } else {
        rootNode = res;
      }
    }
  }
  return rootNode;
};

const fillCounts = counts => {
  let last = 0;
  for ( let i = counts.length - 1; i >= 0; i-- ) {
    if ( counts[ i ] ) { last = i; break; }
  }
  const out = new Array( last + 1 );
  for ( let i = 0; i <= last; i++ ) out[ i ] = counts[ i ] || 0;
  return out;
};

const buildRoot = ( starter, mode ) => {
  const gi = GUESSES.indexOf( starter );
  const row = gi * NT;
  const cnt = new Int32Array( 243 );
  for ( let t = 0; t < NT; t++ ) cnt[ matrix[ row + t ] ]++;
  const offs = new Int32Array( 243 );
  let off = 0;
  for ( let s = 0; s < 243; s++ ) { offs[ s ] = off; off += cnt[ s ]; }
  const flat = new Int32Array( NT );
  const cur = new Int32Array( 243 );
  for ( let t = 0; t < NT; t++ ) {
    const s = matrix[ row + t ];
    flat[ offs[ s ] + cur[ s ]++ ] = t;
  }

  const map = {};
  const counts = [];
  let yellows = 0;
  let depth = 0;

  for ( let s = 0; s < 243; s++ ) {
    const n = cnt[ s ];
    if ( !n ) continue;
    const scoreStr = toScoreString( s );
    if ( scoreStr === '22222' ) {
      map[ scoreStr ] = starter;
      counts[ 0 ] = ( counts[ 0 ] || 0 ) + 1;
    }
    else if ( n === 1 ) {
      map[ scoreStr ] = TARGETS[ flat[ offs[ s ] ] ];
      counts[ 1 ] = ( counts[ 1 ] || 0 ) + 1;
      yellows += getYellows( scoreStr );
    }
    else {
      let childConstraint = null;
      if ( mode === 'hard' ) childConstraint = getHardModeConstraints( starter, scoreStr );
      const sub = buildGreedy( flat, offs[ s ], n, mode, childConstraint );
      map[ scoreStr ] = sub;
      const r = sub.ranking;
      let total = 0;
      for ( let i = 0; i < r.counts.length; i++ ) total += r.counts[ i ];
      for ( let i = 0; i < r.counts.length; i++ ) counts[ i + 1 ] = ( counts[ i + 1 ] || 0 ) + ( r.counts[ i ] || 0 );
      yellows += r.yellows + getYellows( scoreStr ) * total;
      depth = Math.max( depth, 1 + sub.depth );
    }
  }
  return { guess: starter, map, ranking: { counts: fillCounts( counts ), yellows }, depth };
};

export const buildFrequencyTree = ( starter, mode = 'normal', freqModel = 'wordleAnswers', yellowWeight = 0.35 ) => {
  YELLOW_WEIGHT = yellowWeight;
  matrix = new Uint8Array( buildMatrix() );
  targetWeights = getFrequencyWeights( freqModel );
  setTargetWeights( targetWeights );
  staticOrder = buildStaticOrder( matrix, targetWeights ).order;
  setStaticOrder( staticOrder );

  const raw = JSON.parse( fs.readFileSync( 'data/calib.json', 'utf8' ) );
  const mk = o => { const g = new Float64Array( o.g ); const y = new Float64Array( o.y ); g[ 1 ] = 1; y[ 1 ] = 0; return { g, y }; };
  calib = {
    normal: { g: mk( raw.normal.mean ).g, y: mk( raw.normal.best25 ).y },
    hard: { g: mk( raw.hard.mean ).g, y: mk( raw.hard.best25 ).y }
  };

  const t0 = Date.now();
  console.log( `Building exact tree for '${starter}' (${mode}) under freq='${freqModel}'...` );
  const sub = buildRoot( starter, mode );
  const tree = { guess: starter, map: sub.map, ranking: sub.ranking, depth: sub.depth };
  const elapsed = ( ( Date.now() - t0 ) / 1000 ).toFixed( 1 );
  console.log( `Tree built in ${elapsed}s.` );

  const evalRes = evaluateWeighted( tree, targetWeights );
  console.log( `[Uniform] avgGuesses=${evalRes.avgGuesses.toFixed( 4 )} avgYellows=${evalRes.avgYellows.toFixed( 4 )}` );
  console.log( `[Weighted] E[guesses]=${evalRes.weighted.expGuesses.toFixed( 4 )} E[yellows]=${evalRes.weighted.expYellows.toFixed( 4 )} L_capped=${evalRes.weighted.cappedScore.toFixed( 4 )}` );

  return { tree, eval: evalRes };
};

const main = () => {
  const args = process.argv.slice( 2 );
  let starter = 'crane';
  let mode = 'normal';
  let freqModel = 'wordleAnswers';
  let outFile = null;

  for ( const arg of args ) {
    if ( arg === 'normal' || arg === 'hard' ) mode = arg;
    else if ( arg.startsWith( '--freq=' ) ) freqModel = arg.slice( 7 );
    else if ( arg.startsWith( '--out=' ) ) outFile = arg.slice( 6 );
    else if ( !arg.startsWith( '--' ) ) starter = arg.toLowerCase();
  }

  const { tree } = buildFrequencyTree( starter, mode, freqModel );
  const saveName = outFile || `data/${starter}.tree.freq.${mode}.js`;
  fs.writeFileSync( saveName, `export default ${JSON.stringify( tree )}` );
  console.log( `Saved decision tree to ${saveName}` );
};

if ( process.argv[ 1 ] && ( process.argv[ 1 ].endsWith( 'buildFrequencyTree.js' ) || process.argv[ 1 ].includes( 'buildFrequencyTree' ) ) ) {
  main();
}

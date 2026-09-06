// Shared library for the Sea of Greens deep search.
// - Precomputed targetWords x guessWords score matrix (SharedArrayBuffer-backed)
// - Static candidate ordering for all guess words
// - Deep per-starter evaluation: 2-ply lookahead with calibrated estG/estY tables,
//   in-bucket words always included as candidates (exact near leaves)
import fs from 'fs';
import targetWords from '../data/targetWords.js';
import guessWords from '../server/guessWords.js';
import { fastScore, yellowsArray, isHardModeValidOptimized, getHardModeConstraints } from '../server/wordleCore.js';

export const NT = targetWords.length;           // 2315 answers
export const NG = guessWords.length;            // 14855 = full tabatkins/wordle-list dictionary
export const TARGETS = targetWords;
export const GUESSES = guessWords;

// target word -> index in guessWords (targets are all in guessWords)
export const t2g = new Int32Array( NT );
{
  const map = new Map( guessWords.map( ( w, i ) => [ w, i ] ) );
  for ( let i = 0; i < NT; i++ ) t2g[ i ] = map.get( targetWords[ i ] );
}

export const buildMatrix = ( buffer = null ) => {
  const buf = buffer || new SharedArrayBuffer( NT * NG );
  const m = new Uint8Array( buf );
  for ( let t = 0; t < NT; t++ ) {
    const base = t * NG;
    const w = targetWords[ t ];
    for ( let g = 0; g < NG; g++ ) m[ base + g ] = fastScore( w, guessWords[ g ] );
  }
  return buf;
};

// Static quality of every guess: expected squared bucket size vs all targets, avg yellows, entropy
export const buildStaticOrder = matrix => {
  const expSq = new Float64Array( NG );
  const avgY = new Float64Array( NG );
  const ent = new Float64Array( NG );
  const cnt = new Int32Array( 243 );
  for ( let g = 0; g < NG; g++ ) {
    cnt.fill( 0 );
    let y = 0;
    for ( let t = 0; t < NT; t++ ) {
      const s = matrix[ t * NG + g ];
      cnt[ s ]++;
      y += yellowsArray[ s ];
    }
    let sq = 0, e = 0;
    for ( let s = 0; s < 243; s++ ) {
      const c = cnt[ s ];
      if ( !c ) continue;
      sq += c * c;
      const p = c / NT;
      e -= p * Math.log2( p );
    }
    expSq[ g ] = sq / NT;
    avgY[ g ] = y / NT;
    ent[ g ] = e;
  }
  const order = [ ...Array( NG ).keys() ];
  order.sort( ( a, b ) => expSq[ a ] - expSq[ b ] || avgY[ a ] - avgY[ b ] || ent[ b ] - ent[ a ] );
  return { expSq, avgY, ent, order };
};

export const loadCalib = ( variant = 'best25' ) => {
  const c = JSON.parse( fs.readFileSync( 'data/calib.json', 'utf8' ) );
  const mk = o => { const g = new Float64Array( o.g ); const y = new Float64Array( o.y ); g[ 1 ] = 1; y[ 1 ] = 0; return { g, y }; };
  return { normal: mk( c.normal[ variant ] ), hard: mk( c.hard[ variant ] ) };
};

const toScoreString = int => {
  let s = '';
  let v = int;
  for ( let i = 0; i < 5; i++ ) { s += v % 3; v = Math.floor( v / 3 ); }
  return s;
};

// candidate budget for a bucket of size len. candK: 'full' = entire dictionary (for len>=20)
const budgetFor = ( len, candK ) => {
  if ( candK === 'full' ) return len >= 20 ? NG : Math.max( 30, Math.min( 600, Math.round( len * 4 ) ) );
  return Math.max( 30, Math.min( candK, Math.round( len * 4 ) ) );
};

// Evaluate one starter (guess index g) under the 1:1 (guesses+yellows) objective.
// Returns { e: expectedGuesses, y: expectedYellows } using 2-ply lookahead with est tables.
// mode: 'normal' | 'hard'. candK: candidate budget (number or 'full').
// st: optional {arr, v} state with monotonic generation stamps (shared across calls; never cleared).
export const newSeenState = () => ( { arr: new Int32Array( NG ), v: 0 } );
export const evalStarter = ( g, matrix, calib, mode, candK = 600, st = null, yw = 1 ) => {
  const est = calib[ mode ];
  const cnt = new Int32Array( 243 );
  const cnt2 = new Int32Array( 243 );
  const yel2 = new Int32Array( 243 );
  // flat bucket storage for this starter: targets grouped by score
  const bucketBase = new Int32Array( 243 );
  const bucketLen = new Int32Array( 243 );
  const flat = new Int32Array( NT );
  cnt.fill( 0 );
  for ( let t = 0; t < NT; t++ ) cnt[ matrix[ t * NG + g ] ]++;
  let off = 0;
  for ( let s = 0; s < 243; s++ ) {
    bucketBase[ s ] = off;
    bucketLen[ s ] = cnt[ s ];
    off += cnt[ s ];
  }
  cnt.fill( 0 );
  for ( let t = 0; t < NT; t++ ) {
    const s = matrix[ t * NG + g ];
    flat[ bucketBase[ s ] + cnt[ s ]++ ] = t;
  }

  if ( !st ) st = newSeenState();
  const seenGen = st.arr;

  let E = 1; // the starter guess itself
  let Y = 0;
  let y1 = 0;

  for ( let s = 0; s < 243; s++ ) {
    const len = bucketLen[ s ];
    if ( !len ) continue;
    const base = bucketBase[ s ];
    y1 += yellowsArray[ s ] * len;
    if ( s === 242 ) continue; // solved by starter (242 = '22222' in base-3 int encoding)
    if ( len === 1 ) {
      E += 1 / NT; // leaf word remains: 1 more guess
      continue;
    }
    let hardConstraint = null;
    if ( mode === 'hard' ) hardConstraint = getHardModeConstraints( GUESSES[ g ], toScoreString( s ) );

    st.v++; // per-bucket dedupe generation (monotonic across calls)
    const gen = st.v;
    const K = budgetFor( len, candK );
    let bestE = Infinity, bestY = Infinity, bestJoint = Infinity;
    // in-bucket words first (always optimal near leaves, always hard-valid)
    for ( let i = 0; i < len; i++ ) {
      const gi = t2g[ flat[ base + i ] ];
      if ( gi === g || seenGen[ gi ] === gen ) continue;
      seenGen[ gi ] = gen;
      const r = evalCandidate( flat, base, len, gi, matrix, est, cnt2, yel2, hardConstraint );
      const j = r.E + yw * r.Y;
      if ( j < bestJoint ) { bestJoint = j; bestE = r.E; bestY = r.Y; }
    }
    const topK = Math.min( K, NG );
    for ( let k = 0; k < topK; k++ ) {
      const gi = staticOrder[ k ];
      if ( gi === g || seenGen[ gi ] === gen ) continue;
      seenGen[ gi ] = gen;
      const r = evalCandidate( flat, base, len, gi, matrix, est, cnt2, yel2, hardConstraint );
      const j = r.E + yw * r.Y;
      if ( j < bestJoint ) { bestJoint = j; bestE = r.E; bestY = r.Y; }
    }
    if ( bestE === Infinity ) throw new Error( `no candidate for starter ${g} score ${s}` );
    E += len * bestE / NT;
    Y += len * bestY / NT;
  }
  Y += y1 / NT;
  return { e: E, y: Y, total: E + yw * Y };
};

// Evaluate candidate guess gi for bucket (flat[base..base+len)): 2-ply joint cost.
// hardConstraint: null or {fixed, minCounts} of the parent edge (hard mode).
export const evalCandidate = ( flat, base, len, gi, matrix, est, cnt2, yel2, hardConstraint ) => {
  if ( hardConstraint && !isHardModeValidOptimized( GUESSES[ gi ], hardConstraint ) ) {
    return { E: Infinity, Y: Infinity, joint: Infinity };
  }
  cnt2.fill( 0 );
  yel2.fill( 0 );
  for ( let i = 0; i < len; i++ ) {
    const t = flat[ base + i ];
    const s = matrix[ t * NG + gi ];
    cnt2[ s ]++;
    yel2[ s ] += yellowsArray[ s ];
  }
  let E = 1, Y = 0;
  for ( let s = 0; s < 243; s++ ) {
    const c = cnt2[ s ];
    if ( !c ) continue;
    if ( s === 242 ) continue; // solved by this guess (242 = '22222' int)
    Y += yel2[ s ] / len;
    if ( c === 1 ) {
      E += 1 / len; // leaf word: one more guess
    }
    else {
      E += c * est.g[ c ] / len;
      Y += c * est.y[ c ] / len;
    }
  }
  return { E, Y, joint: E + Y };
};

export let staticOrder = null;
export const setStaticOrder = o => { staticOrder = o; };

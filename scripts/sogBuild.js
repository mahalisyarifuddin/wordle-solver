// Sea of Greens exact tree builder.
// For each starter: greedy tree build where every node picks its guess by a deep search
// (in-bucket words + top-2000 static + one-ply top-100, ranked by 2-ply lookahead with
// calibrated reference-cost tables under the 1:1 guesses+yellows objective), followed by
// local-search passes that rebuild promising alternative subtrees and keep the best by
// EXACT evaluation. Rankings are computed exactly, bottom-up.
import fs from 'fs';
import { Worker } from 'worker_threads';
import { NT, NG, GUESSES, TARGETS, t2g, buildMatrix, buildStaticOrder, loadCalib, setStaticOrder, newSeenState, evalCandidate } from './sogCommon.js';
import { getYellows, getHardModeConstraints, isHardModeValidOptimized } from '../server/wordleCore.js';

let matrix, calib, staticOrder, matrixBuffer;
let guessIndexMap = null;
let YELLOW_WEIGHT = 1;
const setYellowWeight = w => { YELLOW_WEIGHT = w; };

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

// ---- candidate ranking for a node ----
// words: Int32Array of target indices (view via base/len). Returns [gi, E, Y, joint] sorted.
const rankCandidates = ( words, base, len, mode, constraint, topN ) => {
  const est = calib[ mode ];
  const cnt2 = new Int32Array( 243 );
  const touched = new Int32Array( 243 );
  const considered = new Uint8Array( NG );
  const results = [];
  const consider = gi => {
    if ( considered[ gi ] ) return;
    considered[ gi ] = 1;
    if ( mode === 'hard' && constraint && !isHardModeValidOptimized( GUESSES[ gi ], constraint ) ) return;
    const r = evalCandidate( words, base, len, gi, matrix, est, cnt2, touched, null );
    if ( r.joint !== Infinity ) results.push( [ gi, r.E, r.Y, r.E + YELLOW_WEIGHT * r.Y ] );
  };
  // in-bucket words (always hard-valid, always optimal near leaves). For the
  // last two words an in-bucket guess is the unique exact endgame; the
  // calibrated est tables badly misrank such splits (e.g. for the anagram
  // pair {aurei, uraei} a non-splitting guess scores better than the perfect
  // in-bucket guess), so rank tiny buckets by in-bucket words only.
  const ibOnly = len <= 2;
  for ( let i = 0; i < len; i++ ) consider( t2g[ words[ base + i ] ] );
  // top static
  const topStatic = Math.min( 2000, NG );
  for ( let k = 0; k < topStatic && !ibOnly; k++ ) consider( staticOrder[ k ] );
  // one-ply top candidates (partition quality on THIS node's words).
  // In hard mode, filter by validity BEFORE ranking so the best valid guesses survive.
  if ( len >= 12 && !ibOnly ) {
    const cnt = new Int32Array( 243 );
    const onePly = [];
    for ( let gi = 0; gi < NG; gi++ ) {
      if ( considered[ gi ] ) continue;
      if ( mode === 'hard' && constraint && !isHardModeValidOptimized( GUESSES[ gi ], constraint ) ) continue;
      cnt.fill( 0 );
      let y = 0;
      for ( let i = 0; i < len; i++ ) {
        const s = matrix[ gi * NT + words[ base + i ] ];
        cnt[ s ]++;
        y += YELLOWS_ARRAY[ s ];
      }
      let sq = 0;
      for ( let s = 0; s < 243; s++ ) if ( cnt[ s ] ) sq += cnt[ s ] * cnt[ s ];
      onePly.push( [ gi, sq, y ] );
    }
    onePly.sort( ( a, b ) => a[ 1 ] - b[ 1 ] || a[ 2 ] - b[ 2 ] );
    const top = mode === 'hard' ? 150 : 100;
    for ( let i = 0; i < Math.min( top, onePly.length ); i++ ) consider( onePly[ i ][ 0 ] );
  }
  results.sort( ( a, b ) => a[ 3 ] - b[ 3 ] || a[ 1 ] - b[ 1 ] );
  return results.slice( 0, topN );
};

// ---- greedy subtree build (iterative; no recursion depth limits) ----
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
  };

  const root = makeFrame( words0, base0, len0, constraint0, null, null );
  root.id = 0;
  let nextId = 1;
  const dbg = process.env.BUILD_TRACE && len0 <= 30;
  const stack = [ root ];
  if ( dbg ) console.log( '[bt] start len=' + len0 );
  let guard = 0;
  while ( stack.length ) {
    if ( ++guard > 500000 ) {
      const info = stack.slice( -8 ).map( f => `{started:${f.started} len:${f.len} pend:${f.pending ? f.pending.length : '?'} node:${f.node ? ( f.node.guess || '?' ) : '?'}}` ).join( ' <- ' );
      const dump = ( f, i ) => `#${i} len=${f.len} started=${f.started} pend=${f.pending ? f.pending.length : '?'} guess=${f.node ? f.node.guess : '?'} words=${f.words ? [ ...Array( Math.min( 4, f.len ) ).keys() ].map( k => TARGETS[ f.words[ f.base + k ] ] ).join( ',' ) : '?'}`;
      throw new Error( 'buildGreedy guard hit; stack=' + stack.length + ' top8: ' + info + ' | FIRST: ' + dump( stack[ 0 ], 0 ) + ' | MID: ' + dump( stack[ Math.floor( stack.length / 2 ) ], Math.floor( stack.length / 2 ) ) + ' | LAST: ' + dump( stack[ stack.length - 1 ], stack.length - 1 ) );
    }
    const fr = stack[ stack.length - 1 ];
    if ( !fr.started ) {
      fr.started = true;
      if ( fr.len === 1 ) {
        const w = TARGETS[ fr.words[ fr.base ] ];
        fr.node = { guess: w, map: { '22222': w }, ranking: { counts: [ 1 ], yellows: 0 }, depth: 1 };
        continue; // completed: will be popped by parent
      }
      const ranked = rankCandidates( fr.words, fr.base, fr.len, mode, fr.constraint, 1 );
      const gi = ranked[ 0 ][ 0 ];
      fr.guess = GUESSES[ gi ];
      fr.node = { guess: fr.guess, map: {} };
      const cnt = new Int32Array( 243 );
      const offs = new Int32Array( 244 );
      for ( let i = 0; i < fr.len; i++ ) cnt[ matrix[ gi * NT + fr.words[ fr.base + i ] ] ]++;
      for ( let s = 0; s < 243; s++ ) offs[ s + 1 ] = offs[ s ] + cnt[ s ];
      const flat = new Int32Array( fr.len );
      cnt.fill( 0 );
      for ( let i = 0; i < fr.len; i++ ) {
        const s = matrix[ gi * NT + fr.words[ fr.base + i ] ];
        flat[ offs[ s ] + cnt[ s ]++ ] = fr.words[ fr.base + i ];
      }
      fr.partition = { flat, offs };
      // Safety net: if the chosen guess failed to split (est tables can rank a
      // non-splitting guess first), force the best in-bucket word, which always
      // reduces the bucket. In-bucket guesses are hard-valid by construction.
      {
        let noProgress = false;
        for ( let s = 0; s < 243; s++ ) {
          if ( offs[ s + 1 ] - offs[ s ] === fr.len ) { noProgress = true; break; }
        }
        if ( noProgress ) {
          let bestGi = -1, bestMax = Infinity, bestY = Infinity;
          const bc = new Int32Array( 243 );
          const rec = new Int32Array( 244 );
          for ( let i = 0; i < fr.len; i++ ) {
            const gi2 = t2g[ fr.words[ fr.base + i ] ];
            bc.fill( 0 );
            let y = 0;
            for ( let k = 0; k < fr.len; k++ ) {
              const s2 = matrix[ gi2 * NT + fr.words[ fr.base + k ] ];
              bc[ s2 ]++;
              if ( s2 !== 242 ) y += YELLOWS_ARRAY[ s2 ];
            }
            let max = 0, nb = 0;
            for ( let s2 = 0; s2 < 243; s2++ ) if ( bc[ s2 ] ) { nb++; if ( bc[ s2 ] > max ) max = bc[ s2 ]; }
            // prefer a real split (max < len), then fewer yellows, then more buckets
            if ( max < bestMax || ( max === bestMax && ( y < bestY || ( y === bestY && nb > 1 ) ) ) ) {
              bestMax = max; bestY = y; bestGi = gi2;
            }
          }
          if ( bestGi === -1 ) throw new Error( `buildGreedy: no splitter for len=${fr.len}` );
          fr.guess = GUESSES[ bestGi ];
          fr.node = { guess: fr.guess, map: {} };
          cnt.fill( 0 );
          for ( let i = 0; i < fr.len; i++ ) cnt[ matrix[ bestGi * NT + fr.words[ fr.base + i ] ] ]++;
          for ( let s = 0; s < 243; s++ ) rec[ s + 1 ] = rec[ s ] + cnt[ s ];
          cnt.fill( 0 );
          for ( let i = 0; i < fr.len; i++ ) {
            const s = matrix[ bestGi * NT + fr.words[ fr.base + i ] ];
            flat[ rec[ s ] + cnt[ s ]++ ] = fr.words[ fr.base + i ];
          }
          fr.partition = { flat, offs: rec };
        }
      }
      for ( let s = 0; s < 243; s++ ) {
        const n = offs[ s + 1 ] - offs[ s ];
        if ( !n ) continue;
        const scoreStr = toScoreString( s );
        if ( s === 242 ) {
          fr.node.map[ scoreStr ] = TARGETS[ flat[ offs[ s ] ] ];
        }
        else if ( n === 1 ) {
          fr.node.map[ scoreStr ] = TARGETS[ flat[ offs[ s ] ] ];
        }
        else {
          let childConstraint = null;
          if ( mode === 'hard' ) childConstraint = getHardModeConstraints( fr.guess, scoreStr );
          fr.pending.push( { s, scoreStr, base: offs[ s ], len: n, constraint: childConstraint } );
        }
      }
      if ( fr.pending.length === 0 ) {
        assemble( fr );
        continue;
      }
      const c = fr.pending.pop();
      const nf = makeFrame( fr.partition.flat, c.base, c.len, c.constraint, fr, c.scoreStr );
      nf.id = nextId++;
      if ( dbg ) console.log( `[bt] push id=${nf.id} (parent=${fr.id}) len=${nf.len} score=${c.scoreStr}` );
      stack.push( nf );
    }
    else {
      const child = stack.pop();
      const parent = child.parent;
      if ( dbg ) console.log( `[bt] pop id=${child.id} len=${child.len} -> parent=${parent ? parent.id : 'ROOT'}` );
      if ( parent ) {
        parent.node.map[ child.scoreStr ] = child.node;
        if ( parent.pending.length ) {
          const c = parent.pending.pop();
          const nf = makeFrame( parent.partition.flat, c.base, c.len, c.constraint, parent, c.scoreStr );
          nf.id = nextId++;
          if ( dbg ) console.log( `[bt] push id=${nf.id} (parent=${parent.id}) len=${nf.len} score=${c.scoreStr}` );
          stack.push( nf );
        }
        else {
          if ( dbg ) console.log( `[bt] assemble parent=${parent.id} (len=${parent.len})` );
          assemble( parent );
        }
      }
      else if ( stack.length === 0 ) {
        return child.node;
      }
    }
  }
  return root.node;
};

const nodeStats = node => {
  const counts = node.ranking.counts;
  let size = 0, gsum = 0;
  for ( let i = 0; i < counts.length; i++ ) {
    const c = counts[ i ] || 0;
    size += c;
    gsum += c * ( i + 1 );
  }
  return { size, avgG: gsum / size, avgY: node.ranking.yellows / size, oneToOne: gsum / size + YELLOW_WEIGHT * node.ranking.yellows / size };
};

// fill sparse holes in a counts array with 0
const fillCounts = counts => {
  for ( let i = 0; i < counts.length; i++ ) if ( counts[ i ] === undefined ) counts[ i ] = 0;
  return counts;
};

// ---- recursive local improvement ----
// Tries alternative guesses at this node (rebuild subtree greedily, compare exactly),
// then recurses into the largest children (by current guess), top-down.
const improveNode = ( node, words, base, len, mode, constraint, alts, childBudget, nodeDepth = 0 ) => {
  let current = nodeStats( node );
  // The root's guess is the FIXED starter - never replace it.
  if ( nodeDepth > 0 ) {
    const ranked = rankCandidates( words, base, len, mode, constraint, alts );
    for ( const [ gi, E, Y, joint ] of ranked ) {
      if ( GUESSES[ gi ] === guessIndexMap.get( node.guess ) ) continue;
      if ( nodeDepth >= UNFILTERED_DEPTH && joint >= current.oneToOne + 0.04 ) continue; // allow near-miss estimates; exact eval decides
      const sub = buildGreedy( words, base, len, mode, constraint );
      const alt = nodeStats( { guess: sub.guess, map: sub.map, ranking: sub.ranking, depth: sub.depth } );
      if ( alt.oneToOne < current.oneToOne ) {
        node.guess = sub.guess;
        node.map = sub.map;
        node.ranking = sub.ranking;
        node.depth = sub.depth;
        current = alt;
      }
    }
  }
  // partition by the (possibly new) guess and improve children, largest first
  const gi = guessIndexMap.get( node.guess );
  const cnt = new Int32Array( 243 );
  const offs = new Int32Array( 244 );
  for ( let i = 0; i < len; i++ ) cnt[ matrix[ gi * NT + words[ base + i ] ] ]++;
  for ( let s = 0; s < 243; s++ ) offs[ s + 1 ] = offs[ s ] + cnt[ s ];
  const flat = new Int32Array( len );
  cnt.fill( 0 );
  for ( let i = 0; i < len; i++ ) {
    const s = matrix[ gi * NT + words[ base + i ] ];
    flat[ offs[ s ] + cnt[ s ]++ ] = words[ base + i ];
  }
  const children = [];
  for ( let s = 0; s < 243; s++ ) {
    const n = offs[ s + 1 ] - offs[ s ];
    if ( !n ) continue;
    const child = node.map[ toScoreString( s ) ];
    if ( typeof child === 'string' ) continue;
    let childConstraint = null;
    if ( mode === 'hard' ) childConstraint = getHardModeConstraints( node.guess, toScoreString( s ) );
    children.push( { child, base: offs[ s ], len: n, constraint: childConstraint } );
  }
  children.sort( ( a, b ) => b.len - a.len );
  for ( let i = 0; i < Math.min( childBudget, children.length ); i++ ) {
    const c = children[ i ];
    improveNode( c.child, flat, c.base, c.len, mode, c.constraint, alts, childBudget, nodeDepth + 1 );
  }
  // recompute this node's ranking/depth from possibly-improved children
  const counts = [];
  let yellows = 0;
  let depth = 0;
  for ( let s = 0; s < 243; s++ ) {
    const child = node.map[ toScoreString( s ) ];
    if ( child === undefined ) continue;
    const scoreStr = toScoreString( s );
    if ( scoreStr === '22222' ) {
      counts[ 0 ] = ( counts[ 0 ] || 0 ) + 1;
    }
    else if ( typeof child === 'string' ) {
      counts[ 1 ] = ( counts[ 1 ] || 0 ) + 1;
      yellows += getYellows( scoreStr );
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
  node.ranking = { counts: fillCounts( counts ), yellows };
  node.depth = depth;
};

// For the largest nodes, try alternatives even when the reference estimate is not better (escape local optima)
let UNFILTERED_DEPTH = 1;
const setUnfilteredDepth = d => { UNFILTERED_DEPTH = d; };

const localSearch = ( tree, words, mode, passes ) => {
  for ( let pass = 0; pass < passes; pass++ ) {
    const before = nodeStats( tree ).oneToOne;
    improveNode( tree, words, 0, NT, mode, null, pass === 0 ? 6 : ( pass === 1 ? 4 : 3 ), pass === 0 ? 8 : ( pass === 1 ? 6 : 5 ) );
    const after = nodeStats( tree ).oneToOne;
    console.log( `    pass ${pass + 1}: 1:1 ${before.toFixed( 4 )} -> ${after.toFixed( 4 )}` );
    if ( after >= before ) break;
  }
};

// ---- full build for a starter ----
// Root is forced to the starter; its buckets are built greedily.
const buildRoot = ( starter, mode ) => {
  const words = new Int32Array( NT );
  for ( let i = 0; i < NT; i++ ) words[ i ] = i;
  const gi = guessIndexMap.get( starter );
  const cnt = new Int32Array( 243 );
  const offs = new Int32Array( 244 );
  for ( let i = 0; i < NT; i++ ) cnt[ matrix[ gi * NT + i ] ]++;
  for ( let s = 0; s < 243; s++ ) offs[ s + 1 ] = offs[ s ] + cnt[ s ];
  const flat = new Int32Array( NT );
  cnt.fill( 0 );
  for ( let i = 0; i < NT; i++ ) {
    const s = matrix[ gi * NT + i ];
    flat[ offs[ s ] + cnt[ s ]++ ] = i;
  }
  const map = {};
  const counts = [];
  let yellows = 0;
  let depth = 0;
  for ( let s = 0; s < 243; s++ ) {
    const n = offs[ s + 1 ] - offs[ s ];
    if ( !n ) continue;
    const scoreStr = toScoreString( s );
    if ( s === 242 ) {
      map[ scoreStr ] = TARGETS[ flat[ offs[ s ] ] ];
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

const buildTree = ( starter, mode ) => {
  // per-mode yellow weight (tuned on the seine benchmark): normal 1.0, hard 0.7
  if ( mode === 'hard' && YELLOW_WEIGHT === 1 ) YELLOW_WEIGHT = 0.7;
  const words = new Int32Array( NT );
  for ( let i = 0; i < NT; i++ ) words[ i ] = i;
  const t0 = Date.now();
  const sub = buildRoot( starter, mode );
  const tree = { guess: starter, map: sub.map, ranking: sub.ranking, depth: sub.depth };
  const g = nodeStats( tree );
  console.log( `[${mode}] ${starter}: greedy: avgG=${g.avgG.toFixed( 4 )} avgY=${g.avgY.toFixed( 4 )} 1:1=${g.oneToOne.toFixed( 4 )} (${( ( Date.now() - t0 ) / 1000 ).toFixed( 1 )}s)` );
  localSearch( tree, words, mode, 3 );
  const s = nodeStats( tree );
  const maxDepth = ( () => { let d = 0; const stack = [ tree ]; while ( stack.length ) { const n = stack.pop(); d = Math.max( d, n.depth ); for ( const k in n.map ) { const c = n.map[ k ]; if ( typeof c !== 'string' ) stack.push( c ); } } return d; } )();
  console.log( `[${mode}] ${starter}: FINAL avgG=${s.avgG.toFixed( 4 )} avgY=${s.avgY.toFixed( 4 )} 1:1=${s.oneToOne.toFixed( 4 )} depth=${maxDepth} (${( ( Date.now() - t0 ) / 1000 ).toFixed( 1 )}s)` );
  return { tree, avgG: s.avgG, avgY: s.avgY, oneToOne: s.oneToOne, maxDepth };
};

const saveTree = ( tree, name ) => {
  fs.writeFileSync( `data/${name}.js`, `export default ${JSON.stringify( tree )}` );
};

// ---- worker hooks ----
export const setState = s => {
  matrix = s.matrix;
  calib = s.calib;
  staticOrder = s.staticOrder;
  guessIndexMap = new Map( GUESSES.map( ( w, i ) => [ w, i ] ) );
};
export const buildTreeForWorker = ( starter, mode ) => buildTree( starter, mode );
export { setUnfilteredDepth, setYellowWeight };
export { buildMatrix, loadCalib, buildStaticOrder };

// ---- worker orchestration ----
const runBuild = ( starter, mode ) => {
  return new Promise( ( resolve, reject ) => {
    const worker = new Worker( './scripts/sogBuildWorker.js', {
      workerData: { starter, mode, matrixBuffer, calibJSON: calib, staticOrderArr: staticOrder }
    } );
    worker.on( 'message', resolve );
    worker.on( 'error', reject );
    worker.on( 'exit', c => { if ( c !== 0 ) reject( new Error( `build worker exit ${c} for ${starter}` ) ); } );
  } );
};

const main = async () => {
  const buildList = JSON.parse( process.argv[ 2 ] );
  console.log( 'building score matrix...' );
  matrixBuffer = buildMatrix();
  matrix = new Uint8Array( matrixBuffer );
  console.log( 'static order...' );
  staticOrder = buildStaticOrder( matrix ).order;
  setStaticOrder( staticOrder );
  // builder calibration: mean (realistic) guesses + best25 (optimistic) yellows, tuned on benchmarks
  {
    const raw = JSON.parse( fs.readFileSync( 'data/calib.json', 'utf8' ) );
    const mk = o => { const g = new Float64Array( o.g ); const y = new Float64Array( o.y ); g[ 1 ] = 1; y[ 1 ] = 0; return { g, y }; };
    calib = {
      normal: { g: mk( raw.normal.mean ).g, y: mk( raw.normal.best25 ).y },
      hard: { g: mk( raw.hard.mean ).g, y: mk( raw.hard.best25 ).y }
    };
  }
  guessIndexMap = new Map( GUESSES.map( ( w, i ) => [ w, i ] ) );

  const results = [];
  let idx = 0;
  while ( idx < buildList.length ) {
    const batch = buildList.slice( idx, idx + 2 );
    idx += 2;
    const outs = await Promise.all( batch.map( ( [ starter, mode ] ) => runBuild( starter, mode ).then( r => ( { starter, mode, ...r } ) ) ) );
    results.push( ...outs );
  }
  results.sort( ( a, b ) => a.oneToOne - b.oneToOne );
  console.log( '\n===== FINAL (exact): sorted by 1:1 =====' );
  for ( const r of results ) {
    console.log( `${r.mode.padEnd( 6 )} ${r.starter.padEnd( 8 )} avgG=${r.avgG.toFixed( 4 )} avgY=${r.avgY.toFixed( 4 )} 1:1=${r.oneToOne.toFixed( 4 )} maxDepth=${r.maxDepth}` );
  }
};
import { fileURLToPath } from 'url';
if ( process.argv[ 1 ] && fileURLToPath( import.meta.url ) === process.argv[ 1 ] ) {
  main();
}

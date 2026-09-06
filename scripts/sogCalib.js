// Calibrate per-bucket-size expected remaining guesses (estG) and yellows (estY)
// by pooling every node of the repo's existing near-optimal trees.
// Tables are used as the depth-3+ evaluation in the deep starter scan and tree builder.
import fs from 'fs';
import targetWords from '../data/targetWords.js';
import { getYellows } from '../server/wordleCore.js';

const TARGETS = targetWords;
const NT = TARGETS.length; // full dictionary size (targets == guesses after full-dictionary integration)

const loadTree = name => {
  const s = fs.readFileSync( `data/${name}.js`, 'utf8' );
  return JSON.parse( s.slice( s.indexOf( '{' ) ) );
};

// Structurally recompute (size, total guesses, yellows) for a node, exact.
const nodeStats = node => {
  const counts = [];
  let yellows = 0;
  const stack = [ { node, guessCount: 1, yellowsAccum: 0 } ];
  while ( stack.length ) {
    const { node: n, guessCount, yellowsAccum } = stack.pop();
    for ( const score in n.map ) {
      const child = n.map[ score ];
      if ( score === '22222' ) {
        counts[ guessCount ] = ( counts[ guessCount ] || 0 ) + 1;
      }
      else if ( typeof child === 'string' ) {
        counts[ guessCount + 1 ] = ( counts[ guessCount + 1 ] || 0 ) + 1;
        yellows += yellowsAccum + getYellows( score );
      }
      else {
        stack.push( { node: child, guessCount: guessCount + 1, yellowsAccum: yellowsAccum + getYellows( score ) } );
      }
    }
  }
  let size = 0, gsum = 0;
  for ( let i = 0; i < counts.length; i++ ) {
    size += counts[ i ] || 0;
    gsum += ( counts[ i ] || 0 ) * i;
  }
  return { size, avgG: gsum / size, avgY: yellows / size };
};

// Bucket samples by size; tables: mean (pessimistic) and best25 (mean of best quartile, near-optimal reference)
const buildTable = samples => {
  const bySize = new Map();
  for ( const s of samples ) {
    if ( !bySize.has( s.size ) ) bySize.set( s.size, [] );
    bySize.get( s.size ).push( s );
  }
  const sizes = [ ...bySize.keys() ].sort( ( a, b ) => a - b );
  const mkTab = ( stat ) => {
    const tabG = new Float64Array( NT + 1 );
    const tabY = new Float64Array( NT + 1 );
    for ( const size of sizes ) {
      const arr = bySize.get( size ).slice().sort( ( a, b ) => a.avgG + a.avgY - ( b.avgG + b.avgY ) );
      const k = Math.max( 1, Math.round( arr.length * stat ) );
      const sel = arr.slice( 0, k );
      tabG[ size ] = sel.reduce( ( a, s ) => a + s.avgG, 0 ) / sel.length;
      tabY[ size ] = sel.reduce( ( a, s ) => a + s.avgY, 0 ) / sel.length;
    }
    tabG[ 1 ] = 1; tabY[ 1 ] = 0; // leaf word: one more guess, zero yellows
    return { tabG, tabY };
  };
  const interp = ( tab, known ) => {
    for ( let n = 2; n <= NT; n++ ) {
      if ( known.includes( n ) ) continue;
      const lo = known.filter( k => k < n ).pop();
      const hi = known.find( k => k > n );
      if ( lo === undefined || hi === undefined ) continue;
      const t = Math.log( n / lo ) / Math.log( hi / lo );
      tab[ n ] = tab[ lo ] * ( 1 - t ) + tab[ hi ] * t;
    }
    const tail = known.slice( -12 );
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for ( const k of tail ) {
      const x = Math.log( k ), y = tab[ k ];
      sx += x; sy += y; sxy += x * y; sxx += x * x;
    }
    const m = tail.length;
    const slope = ( m * sxy - sx * sy ) / ( m * sxx - sx * sx );
    const intercept = ( sy - slope * sx ) / m;
    for ( let n = ( tail[ tail.length - 1 ] + 1 ); n <= NT; n++ ) {
      tab[ n ] = Math.max( 0, slope * Math.log( n ) + intercept );
    }
  };
  const known = sizes.filter( s => s > 1 );
  const mean = mkTab( 1 );
  const best25 = mkTab( 0.25 );
  interp( mean.tabG, known ); interp( mean.tabY, known );
  interp( best25.tabG, known ); interp( best25.tabY, known );
  // enforce monotone non-decreasing tables (expected cost grows with bucket size)
  const monotone = tab => { for ( let n = 3; n <= NT; n++ ) if ( tab[ n ] < tab[ n - 1 ] ) tab[ n ] = tab[ n - 1 ]; };
  monotone( mean.tabG ); monotone( mean.tabY );
  monotone( best25.tabG ); monotone( best25.tabY );
  return { mean, best25 };
};

const main = () => {
  // Walk tree, collect (size, avgGuessesFromNode, avgYellowsFromNode) for every node
  const collect = ( tree, out ) => {
    const stack = [ tree ];
    while ( stack.length ) {
      const node = stack.pop();
      out.push( nodeStats( node ) );
      for ( const score in node.map ) {
        const child = node.map[ score ];
        if ( typeof child !== 'string' ) stack.push( child );
      }
    }
  };

  const normalTrees = [ 'trace.tree.total', 'slate.tree.total', 'crate.tree.total', 'crane.tree.total', 'reast.tree.total', 'salet.tree.total', 'seine.tree.greens' ];
  const hardTrees = [ 'salet.tree.hard', 'cramp.tree.hard', 'seine.tree.hard.greens' ];

  const normalSamples = [], hardSamples = [];
  normalTrees.forEach( n => collect( loadTree( n ), normalSamples ) );
  hardTrees.forEach( n => collect( loadTree( n ), hardSamples ) );

  const normal = buildTable( normalSamples );
  const hard = buildTable( hardSamples );

  fs.writeFileSync( 'data/calib.json', JSON.stringify( {
    normal: {
      mean: { g: [ ...normal.mean.tabG ], y: [ ...normal.mean.tabY ] },
      best25: { g: [ ...normal.best25.tabG ], y: [ ...normal.best25.tabY ] }
    },
    hard: {
      mean: { g: [ ...hard.mean.tabG ], y: [ ...hard.mean.tabY ] },
      best25: { g: [ ...hard.best25.tabG ], y: [ ...hard.best25.tabY ] }
    }
  } ) );

  console.log( 'samples normal:', normalSamples.length, ' hard:', hardSamples.length );
  console.log( 'size | estG(b25/norm) estY(b25/norm) | estG(b25/hard) estY(b25/hard)' );
  for ( const n of [ 2, 3, 4, 5, 8, 12, 20, 40, 80, 150, 300, 600, 1200, 2315, NT ] ) {
    console.log( `${String( n ).padStart( 4 )} | ${normal.best25.tabG[ n ].toFixed( 3 )}   ${normal.best25.tabY[ n ].toFixed( 3 )}        | ${hard.best25.tabG[ n ].toFixed( 3 )}   ${hard.best25.tabY[ n ].toFixed( 3 )}` );
  }
};
main();

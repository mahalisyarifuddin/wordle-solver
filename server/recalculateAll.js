import fs from 'fs';
import { Worker } from 'worker_threads';
import { setHardMode, fastScore } from './wordleCore.js';
import { Ranking, ComputationNode, Heuristic } from './wordleCompute.js';
import targetWords from './targetWords.js';
import guessWords from './guessWords.js';
import { setSharedScores } from './partition.js';

const saveTree = ( tree, name ) => {
  fs.writeFileSync( `./data/${name}.js`, `export default ${JSON.stringify( tree )}` );
};

const sharedBuffer = new SharedArrayBuffer( targetWords.length * guessWords.length );
const sharedArray = new Uint8Array( sharedBuffer );
console.log( 'Pre-calculating score matrix in shared buffer...' );
for ( let i = 0; i < targetWords.length; i++ ) {
  for ( let j = 0; j < guessWords.length; j++ ) {
    sharedArray[ i * guessWords.length + j ] = fastScore( targetWords[ i ], guessWords[ j ] );
  }
}
setSharedScores( sharedBuffer );

const runWorker = ( workerData ) => {
  return new Promise( ( resolve, reject ) => {
    const worker = new Worker( './server/optimizationWorker.js', { workerData: { ...workerData, sharedBuffer } } );
    worker.on( 'message', resolve );
    worker.on( 'error', reject );
    worker.on( 'exit', ( code ) => {
      if ( code !== 0 ) reject( new Error( `Worker stopped with exit code ${code}` ) );
    } );
  } );
};

const generate = async ( starter, metric, name, hardMode = false ) => {
  console.log( `Generating ${name}...` );
  setHardMode( hardMode );
  const node = new ComputationNode( targetWords, [], guessWords, true );
  node.openSpecificGuess( starter );
  const guessNode = node.guessNodes[ 0 ];

  if ( metric === Ranking.minimizeYellowsMetric ) {
    const branches = Object.entries( guessNode.map ).filter( ( [ s, n ] ) => typeof n !== 'string' );
    console.log( `Parallelizing ${branches.length} branches...` );

    const hParams = [ 100, 1, 0, 10 ];

    const batchSize = 20;
    for ( let i = 0; i < branches.length; i += batchSize ) {
      const batch = branches.slice( i, i + batchSize );
      console.log( `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil( branches.length / batchSize )}...` );
      const results = await Promise.all( batch.map( ( [ score, nextNode ] ) => {
        return runWorker( {
          words: nextNode.words,
          guesses: nextNode.guesses,
          possibleGuesses: nextNode.possibleGuesses,
          hardMode,
          heuristicParams: hParams,
          depth: 1
        } ).then( serialized => ( { score, serialized } ) );
      } ) );

      results.forEach( ( { score, serialized } ) => {
        guessNode.map[ score ] = ComputationNode.deserialize( serialized, guessNode.map[ score ].possibleGuesses );
      } );
    }
    guessNode.recomputeDepth();
  } else {
    const h = new Heuristic();
    const recurse = ( computationNode, depth ) => {
      if ( depth === 0 || computationNode.words.length <= 2 ) return;
      computationNode.broaden( h, computationNode.words.length > 50 ? 3 : 5 );
      computationNode.guessNodes.forEach( gn => {
        for ( const s in gn.map ) {
          if ( typeof gn.map[ s ] !== 'string' ) recurse( gn.map[ s ], depth - 1 );
        }
      } );
    };
    recurse( guessNode.map[ '00000' ], 1 );
  }

  const tree = guessNode.createTree( metric );
  saveTree( tree, name );
  console.log( `${name} done.` );
};

const task = process.argv[ 2 ];

( async () => {
  if ( task === 'greens' ) {
    const starters = [ 'slant', 'crane', 'salet' ];
    for ( const s of starters ) {
      await generate( s, Ranking.minimizeYellowsMetric, `${s}.tree.greens` );
      await generate( s, Ranking.minimizeYellowsMetric, `${s}.tree.hard.greens`, true );
    }
  } else if ( task === 'total' ) {
    const starters = [ 'salet', 'reast', 'crate', 'trace', 'slate', 'crane' ];
    for ( const s of starters ) await generate( s, Ranking.totalGuessesMetric, `${s}.tree.total` );
  } else if ( task === 'min' ) {
    const minStarters = [ 'rance', 'rants', 'rated', 'ronte', 'alter', 'lance' ];
    for ( const s of minStarters ) await generate( s, Ranking.minimizeLongestMetric, `${s}.tree` );
  } else if ( task === 'hard' ) {
    const hardStarters = [ 'salet', 'cramp' ];
    for ( const s of hardStarters ) await generate( s, Ranking.totalGuessesMetric, `${s}.tree.hard`, true );
  } else {
    console.log( 'Specify task: greens, total, min, hard' );
  }
} )();

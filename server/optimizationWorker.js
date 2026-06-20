import { parentPort, workerData } from 'worker_threads';
import { setHardMode } from './wordleCore.js';
import { ComputationNode, Heuristic, Ranking } from './wordleCompute.js';
import { setSharedScores } from './partition.js';

const { words, guesses, possibleGuesses, hardMode, heuristicParams, depth, sharedBuffer } = workerData;

if ( sharedBuffer ) {
  setSharedScores( sharedBuffer );
}

setHardMode( hardMode );
const h = new Heuristic( ...heuristicParams );
const node = new ComputationNode( words, guesses, possibleGuesses, true );

if ( words.length > 50 ) {
  node.broaden( h, 30 );
} else {
  node.broaden( h, 50 );
}

if ( depth > 0 ) {
    node.guessNodes.forEach( guessNode => {
      for ( const score in guessNode.map ) {
        const nextNode = guessNode.map[ score ];
        if ( typeof nextNode !== 'string' ) {
          nextNode.openNext( h );
        }
      }
      guessNode.recomputeDepth();
    } );
    node.depth = Math.min( ...node.guessNodes.map( g => g.depth ) );
}

const serialized = node.serialize();
parentPort.postMessage( serialized );

// Worker: generate one decision tree for the recalculateAll driver.
// Replicates the non-greens branch of the old server/recalculateAll.js generate():
// greedy breadth-first search guided by the Heuristic, then a 1-ply recurse on
// the '00000' bucket, and finally the requested exact metric tree.
import { parentPort, workerData } from 'worker_threads';
import { setHardMode } from './wordleCore.js';
import { Ranking, ComputationNode, Heuristic, setTargetWeights } from './wordleCompute.js';
import targetWords from './targetWords.js';
import guessWords from './guessWords.js';
import { setSharedScores } from './partition.js';

const { starter, metricName, name, hardMode, sharedBuffer } = workerData;

setSharedScores( sharedBuffer );
setHardMode( hardMode );
// The heuristic reads the corpus prior through this module-level setter. It was
// never called here, so minimax trees were built unweighted and could pick pure
// dictionary filler (DIRLS, BHAJI, ABAFT) as probes.
setTargetWeights( 'wordleAnswers' );

const node = new ComputationNode( targetWords, [], guessWords, true );
node.openSpecificGuess( starter );
const guessNode = node.guessNodes[ 0 ];

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

const metric = metricName === 'total' ? Ranking.totalGuessesMetric
  : metricName === 'weightedmin' ? Ranking.weightedMinimizeLongestMetric
  : Ranking.minimizeLongestMetric;
const tree = guessNode.createTree( metric, targetWords );
parentPort.postMessage( { tree } );


import { setHardMode } from './wordleCore.js';
import { Ranking, ComputationNode } from './wordleCompute.js';
import targetWords from './targetWords.js';
import guessWords from './guessWords.js';

const testStarter = 'salet';

console.log( 'Testing normal mode...' );
setHardMode( false );
let node = new ComputationNode( targetWords, [], guessWords, true );
node.openSpecificGuess( testStarter );
let tree = node.guessNodes[ 0 ].createTree( Ranking.totalGuessesMetric );
console.log( `Normal mode ${testStarter} ranking:`, tree.ranking.counts, 'Score:', new Ranking( tree.ranking.counts ).totalGuessesScore() );

console.log( 'Testing hard mode...' );
setHardMode( true );
node = new ComputationNode( targetWords, [], guessWords, true );
node.openSpecificGuess( testStarter );
tree = node.guessNodes[ 0 ].createTree( Ranking.totalGuessesMetric );
console.log( `Hard mode ${testStarter} ranking:`, tree.ranking.counts, 'Score:', new Ranking( tree.ranking.counts ).totalGuessesScore() );

console.log( 'Testing Sea of Greens...' );
setHardMode( false );
node = new ComputationNode( targetWords, [], guessWords, true );
node.openSpecificGuess( testStarter );
tree = node.guessNodes[ 0 ].createTree( Ranking.minimizeYellowsMetric );
console.log( `Sea of Greens ${testStarter} ranking:`, tree.ranking.counts, 'Yellows:', tree.ranking.yellows );

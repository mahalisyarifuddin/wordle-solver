
import guessWords from './guessWords.js';
import targetWords from './targetWords.js';
import { Ranking, Heuristic, ComputationNode } from './wordleCompute.js';
import { fastPartition, setHardMode } from './wordleCore.js';
import fs from 'fs';

const evaluateAll = ( metricName, isHardMode = false ) => {
  setHardMode( isHardMode );
  const metric = Ranking[ metricName ];
  const results = [];

  const yellowWeight = metricName === 'minimizeYellowsMetric' ? 1 : 0;
  const heuristic = new Heuristic( 100, 1, 0, yellowWeight );

  console.log( `Evaluating all words for ${metricName} (Hard Mode: ${isHardMode})...` );

  for ( let i = 0; i < guessWords.length; i++ ) {
    const guess = guessWords[ i ];
    const map = fastPartition( targetWords, guess );
    const score = Heuristic.score( targetWords, guess, map, heuristic, true );
    results.push( { guess, score } );
    if ( i % 1000 === 0 ) console.log( `Processed ${i} words...` );
  }

  results.sort( ( a, b ) => a.score - b.score );
  return results.slice( 0, 10 );
};

const strategies = [
  { metricName: 'totalGuessesMetric', isHardMode: false },
  { metricName: 'minimizeLongestMetric', isHardMode: false },
  { metricName: 'totalGuessesMetric', isHardMode: true, label: 'hardModeMetric' },
  { metricName: 'minimizeYellowsMetric', isHardMode: true }
];

const results = {};

for ( const strategy of strategies ) {
  const label = strategy.label || strategy.metricName;
  results[ label ] = evaluateAll( strategy.metricName, strategy.isHardMode );
  console.log( `Top words for ${label}:`, results[ label ].map( w => w.guess ).join( ', ' ) );
}

const generateTree = ( guess, metricName, isHardMode, label ) => {
  setHardMode( isHardMode );
  console.log( `Generating tree for ${guess} using ${metricName} (Hard Mode: ${isHardMode})...` );
  const metric = Ranking[ metricName ];
  const yellowWeight = metricName === 'minimizeYellowsMetric' ? 1 : 0;
  const heuristic = new Heuristic( 100, 1, 0, yellowWeight );

  const node = new ComputationNode( targetWords, [], guessWords, true );
  node.openSpecificGuess( guess, heuristic );
  const guessNode = node.guessNodes[ 0 ];

  const tree = guessNode.createLimitedTree( 6, metric );
  const filename = `./data/${guess}.tree.${label}.js`;
  fs.writeFileSync( filename, `export default ${JSON.stringify( tree )};` );
  console.log( `Saved ${filename}` );
};

for ( const strategy of strategies ) {
  const label = strategy.label || strategy.metricName;
  for ( let i = 0; i < 2; i++ ) {
    const guess = results[ label ][ i ].guess;
    try {
      generateTree( guess, strategy.metricName, strategy.isHardMode, label );
    } catch ( e ) {
      console.error( `Failed to generate tree for ${guess} ${label}: ${e.message}` );
    }
  }
}

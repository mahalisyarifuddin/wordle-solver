
import fs from 'fs';
import { setHardMode } from './wordleCore.js';
import { Ranking, ComputationNode, Heuristic } from './wordleCompute.js';
import targetWords from './targetWords.js';
import guessWords from './guessWords.js';

const saveTree = ( tree, name ) => {
  fs.writeFileSync( `./data/${name}.js`, `export default ${JSON.stringify( tree )}` );
};

const generate = ( starter, metric, name, hardMode = false ) => {
  console.log( `Generating ${name}...` );
  setHardMode( hardMode );
  const node = new ComputationNode( targetWords, [], guessWords, true );
  node.openSpecificGuess( starter );

  const h = ( metric === Ranking.minimizeYellowsMetric ) ? new Heuristic( 100, 1, 0, 50 ) : new Heuristic();

  // Recursively open more nodes to find better trees
  const recurse = ( computationNode, depth ) => {
    if ( depth === 0 || computationNode.words.length <= 2 ) {
      return;
    }

    // For larger sets, try a few options
    if ( computationNode.words.length > 50 ) {
      computationNode.broaden( h, 3 );
    } else {
      computationNode.broaden( h, 5 );
    }

    computationNode.guessNodes.forEach( guessNode => {
      for ( const score in guessNode.map ) {
        const nextNode = guessNode.map[ score ];
        if ( typeof nextNode !== 'string' ) {
          recurse( nextNode, depth - 1 );
        }
      }
    } );
  };

  recurse( node.guessNodes[ 0 ].map[ '00000' ], 1 );

  const tree = node.guessNodes[ 0 ].createTree( metric );
  saveTree( tree, name );
};

const task = process.argv[2];

if (task === 'greens') {
  generate( 'salet', Ranking.minimizeYellowsMetric, 'salet.tree.greens' );
  generate( 'salet', Ranking.minimizeYellowsMetric, 'salet.tree.hard.greens', true );
} else if (task === 'total') {
  const starters = [ 'salet', 'reast', 'crate', 'trace', 'slate', 'crane' ];
  starters.forEach( s => generate( s, Ranking.totalGuessesMetric, `${s}.tree.total` ) );
} else if (task === 'min') {
  const minStarters = [ 'rance', 'rants', 'rated', 'ronte', 'alter', 'lance' ];
  minStarters.forEach( s => generate( s, Ranking.minimizeLongestMetric, `${s}.tree` ) );
} else if (task === 'hard') {
  const hardStarters = [ 'salet', 'cramp' ];
  hardStarters.forEach( s => generate( s, Ranking.totalGuessesMetric, `${s}.tree.hard`, true ) );
} else {
  console.log('Specify task: greens, total, min, hard');
}

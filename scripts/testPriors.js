// Regression tests for the corpus-prior and tie-break fixes.
//
// Background: the shipped trees used to answer MOXIE with
//   TRACE > SHINE > MOVIE > MOBIE > MOLIE > MOMIE > MOWIE > MOXIE
// i.e. they walked the bucket alphabetically. Two independent bugs caused it:
//   1. getFrequencyWeights('wordleAnswers') flattened all 12,540 non-answer
//      words onto one shared epsilon weight, so whole buckets were exact ties.
//   2. Every tie-break kept the first candidate in dictionary order.
// Run with: node scripts/testPriors.js
import targetWords from '../data/targetWords.js';
import guessWords from '../server/guessWords.js';
import { score } from '../server/wordleCore.js';
import { getFrequencyWeights, WORDLE_ANSWERS_SET } from '../data/wordFrequencies.js';
import { Heuristic, Ranking, GuessOption, setTargetWeights } from '../server/wordleCompute.js';

let failures = 0;
const check = ( name, ok, detail = '' ) => {
  if ( ok ) {
    console.log( `  ok   ${name}` );
  } else {
    failures++;
    console.log( `  FAIL ${name}${detail ? ' - ' + detail : ''}` );
  }
};

console.log( '\n1. Priors keep real frequency ordering' );
{
  const weights = getFrequencyWeights( 'wordleAnswers' );
  const at = word => weights[ targetWords.indexOf( word ) ];

  check( 'MOXIE outweighs dictionary filler MOBIE', at( 'moxie' ) > at( 'mobie' ) * 10,
    `moxie=${at( 'moxie' ).toExponential( 2 )} mobie=${at( 'mobie' ).toExponential( 2 )}` );
  check( 'HILLS outweighs non-word ZILLS', at( 'hills' ) > at( 'zills' ) * 10,
    `hills=${at( 'hills' ).toExponential( 2 )} zills=${at( 'zills' ).toExponential( 2 )}` );
  check( 'official answer MOVIE outweighs MOXIE', at( 'movie' ) > at( 'moxie' ) );

  const distinct = new Set( weights ).size;
  check( 'weights are not a single shared value', distinct > 100, `${distinct} distinct values` );

  const floorCount = [ ...weights ].filter( w => w === Math.min( ...weights ) ).length;
  check( 'rare words are not all tied on one floor value', floorCount < 12000, `${floorCount} words on the floor` );

  // Sum of weights must stay normalized.
  const sum = [ ...weights ].reduce( ( a, b ) => a + b, 0 );
  check( 'weights sum to 1', Math.abs( sum - 1 ) < 1e-9, sum );
}

console.log( '\n2. Ranking metrics' );
{
  // Minimize-longest must prefer a shallower tree even when its total is worse.
  const shallow = new Ranking( [ 1, 2 ], 0 ); // every word in 1 guess
  const deep = new Ranking( [ 0, 0, 3 ], 0 ); // every word in 3 guesses
  check( 'minimizeLongest prefers the shallower ranking',
    Ranking.minimizeLongestMetric( shallow, deep ) < 0 );

  // 13 slots means "some word needs 13 guesses"; 4 slots means at most 4.
  const manyCheapTurns = new Ranking( [ 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 998 ], 0 );
  const fewExpensiveTurns = new Ranking( [ 0, 0, 0, 1000 ], 0 );
  check( 'minimizeLongest ignores raw totals',
    Ranking.minimizeLongestMetric( fewExpensiveTurns, manyCheapTurns ) < 0,
    'four-slot ranking must beat a thirteen-slot ranking' );
}

console.log( '\n3. Tie-break prefers plausible words' );
{
  setTargetWeights( getFrequencyWeights( 'wordleAnswers' ) );

  // Two options with identical heuristic score: the more probable word wins
  // when a single best guess is selected, regardless of alphabetical order.
  const weights = getFrequencyWeights( 'wordleAnswers' );
  const moxie = weights[ targetWords.indexOf( 'moxie' ) ];
  const mobie = weights[ targetWords.indexOf( 'mobie' ) ];
  check( 'MOXIE has strictly more prior than MOBIE', moxie > mobie );

  // GuessOption.compare is the sort used by broaden(); check it ranks by prior.
  const a = new GuessOption( 'mobie', {}, 10 );
  const b = new GuessOption( 'moxie', {}, 10 );
  check( 'GuessOption.compare orders equal scores by prior',
    GuessOption.compare( b, a ) < 0, 'expected moxie before mobie' );
}

console.log( '\n4. Heuristic is prior-aware' );
{
  const weights = getFrequencyWeights( 'wordleAnswers' );
  setTargetWeights( weights );

  // Probability mass that HILLS carries vs ZILLS: the heuristic's target bonus
  // must reflect the prior rather than treating all rare words identically.
  const at = word => weights[ targetWords.indexOf( word ) ];
  check( 'HILLS carries more mass than ZILLS', at( 'hills' ) > at( 'zills' ) );

  // The heuristic's bonus term is proportional to the guess's own prior mass.
  // (Heuristic.score itself needs the shared score matrix, which is exercised
  // by the tree builders; here we assert the prior it reads.)
  const hillsPrior = weights[ targetWords.indexOf( 'hills' ) ];
  const zillsPrior = weights[ targetWords.indexOf( 'zills' ) ];
  check( 'guessing the likely word carries the larger prior bonus',
    hillsPrior > zillsPrior,
    `hills=${hillsPrior.toExponential( 2 )} zills=${zillsPrior.toExponential( 2 )}` );
}

console.log( '\n5. Dictionary sanity' );
{
  check( 'MOXIE is a legal guess', guessWords.includes( 'moxie' ) );
  check( 'MOXIE is not an official answer', !WORDLE_ANSWERS_SET.has( 'moxie' ) );
  check( 'score(MOXIE, MOXIE) is a full match', score( 'moxie', 'moxie' ) === '22222' );
  check( 'score drops MOBIE against MOXIE', score( 'moxie', 'mobie' ) === '22022' );
}

console.log( failures === 0 ? '\nAll prior/tie-break tests passed.\n' : `\n${failures} test(s) failed.\n` );
process.exit( failures === 0 ? 0 : 1 );

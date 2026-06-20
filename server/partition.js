import { fastScore } from './wordleCore.js';
import targetWords from './targetWords.js';
import guessWords from './guessWords.js';

const targetWordIndexMap = new Map(targetWords.map((w, i) => [w, i]));
const guessWordIndexMap = new Map(guessWords.map((w, i) => [w, i]));

let sharedScores = null;

export const setSharedScores = ( buffer ) => {
  sharedScores = new Uint8Array( buffer );
};

const partition = ( words, guess ) => {
  const gIndex = guessWordIndexMap.get( guess );
  if ( gIndex === undefined ) {
    const map = {};
    for ( let i = 0; i < words.length; i++ ) {
      const match = fastScore( words[ i ], guess );
      let list = map[ match ];
      if ( !list ) list = map[ match ] = [];
      list.push( words[ i ] );
    }
    return map;
  }

  const map = {};
  const stride = guessWords.length;

  if ( sharedScores ) {
    for ( let i = 0; i < words.length; i++ ) {
      const tIndex = targetWordIndexMap.get( words[ i ] );
      const match = sharedScores[ tIndex * stride + gIndex ];
      let list = map[ match ];
      if ( !list ) list = map[ match ] = [];
      list.push( words[ i ] );
    }
  } else {
    for ( let i = 0; i < words.length; i++ ) {
      const match = fastScore( words[ i ], guess );
      let list = map[ match ];
      if ( !list ) list = map[ match ] = [];
      list.push( words[ i ] );
    }
  }

  return map;
};

export default partition;

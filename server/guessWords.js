// Full valid-guess dictionary integrated from
// https://raw.githubusercontent.com/tabatkins/wordle-list/main/words
// (14,855 unique 5-letter words from the game's source list).
//
// Full-dictionary integration: the answer/target list now contains every
// valid word (the original 2,315-word pre-NYT answer list is obsolete - the
// NYT's own answer pool has changed, e.g. BEIGE was #1905 on 2026-09-06), so
// the guess list is simply a sorted copy of targetWords.
import targetWords from './targetWords.js';

export default [ ...targetWords ].sort();

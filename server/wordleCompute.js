import guessWords from './guessWords.js';
import { IS_HARD_MODE, isHardModeValidOptimized, getHardModeConstraints, perfectScore, score, getYellows, fastToScoreString, fastDecodeYellows, yellowsArray } from './wordleCore.js';
import partition from './partition.js';

class ComputationNode {
  constructor( words, guesses, possibleGuesses, skip = false, heuristic = new Heuristic() ) {
    this.words = words;
    this.guesses = guesses;
    this.possibleGuesses = possibleGuesses;

    this.guessSet = new Set();
    this.guessNodes = [];
    this.depth = Number.POSITIVE_INFINITY;

    if ( !skip ) {
      this.openNext( heuristic );
    }
  }

  merge( computationNode ) {
    computationNode.guessNodes.forEach( guessNode => {
      const existing = this.guessNodes.find( g => g.guess === guessNode.guess );
      if ( existing ) {
        existing.merge( guessNode );
      } else {
        this.guessNodes.push( guessNode );
        this.guessSet.add( guessNode.guess );
      }
    } );
    this.depth = Math.min( ...this.guessNodes.map( guessNode => guessNode.depth ) );
  }

  serialize() {
    return {
      w: this.words,
      g: this.guesses,
      d: this.depth,
      n: this.guessNodes.map( guessNode => guessNode.serialize() )
    };
  }

  static deserialize( obj, possibleGuesses = guessWords ) {
    const node = new ComputationNode( obj.w, obj.g, possibleGuesses, true );
    node.depth = obj.d;
    node.guessNodes = obj.n.map( o => GuessNode.deserialize( o, possibleGuesses ) );
    for ( let i = 0; i < node.guessNodes.length; i++ ) {
      node.guessSet.add( node.guessNodes[ i ].guess );
    }
    return node;
  }

  createTree( metric = Ranking.minimizeLongestMetric ) {
    if ( this.guessNodes.length === 0 ) throw new Error( "No guess nodes" );
    let subtree = this.guessNodes[ 0 ].createTree( metric );
    for ( let i = 1; i < this.guessNodes.length; i++ ) {
      const possibleSubtree = this.guessNodes[ i ].createTree( metric );
      if ( metric( possibleSubtree.ranking, subtree.ranking ) < 0 ) {
        subtree = possibleSubtree;
      }
    }
    return subtree;
  }

  createLimitedTree( guessesLeft = 6, metric = Ranking.totalGuessesMetric ) {
    if ( this.guessNodes.length === 0 ) return null;
    let subtree = this.guessNodes[ 0 ].createLimitedTree( guessesLeft, metric );
    for ( let i = 1; i < this.guessNodes.length; i++ ) {
      const possibleSubtree = this.guessNodes[ i ].createLimitedTree( guessesLeft, metric );
      if ( !subtree || ( possibleSubtree && metric( possibleSubtree.ranking, subtree.ranking ) < 0 ) ) {
        subtree = possibleSubtree;
      }
    }
    return subtree;
  }

  widen( heuristic ) {
    if ( this.depth > 1 ) {
      if ( Math.random() < 0.1 ) {
        this.openNext( heuristic );
      } else {
        const guessNode = this.guessNodes[ Math.floor( Math.random() * this.guessNodes.length ) ];
        guessNode.widen();
        this.depth = Math.min( this.depth, guessNode.depth );
      }
    }
  }

  depthOpen( heuristic ) {
    if ( this.depth >= 1 ) this.openNext( heuristic );
    for ( let i = 0; i < this.guessNodes.length; i++ ) {
      this.guessNodes[ i ].depthOpen( heuristic );
      this.depth = Math.min( this.depth, this.guessNodes[ i ].depth );
    }
  }

  depthFix( heuristic ) {
    if ( this.depth === 1 ) {
      if ( !this.guessNodes.some( g => this.words.includes( g.guess ) ) ) {
        this.openNext( heuristic );
      }
    }
    for ( let i = 0; i < this.guessNodes.length; i++ ) {
      this.guessNodes[ i ].depthFix();
      this.depth = Math.min( this.depth, this.guessNodes[ i ].depth );
    }
  }

  fullRecomputeDepth() {
    this.depth = Math.min( ...this.guessNodes.map( g => {
      g.fullRecomputeDepth();
      return g.depth;
    } ) );
  }

  getOptions( heuristic ) {
    const options = [];
    for ( let i = 0; i < this.possibleGuesses.length; i++ ) {
      const guess = this.possibleGuesses[ i ];
      if ( this.guessSet.has( guess ) || this.guesses.includes( guess ) ) continue;
      const map = partition( this.words, guess );
      options.push( new GuessOption( guess, map, Heuristic.score( this.words, guess, map, heuristic, true ) ) );
    }
    options.sort( GuessOption.compare );
    return options;
  }

  getNextOption( heuristic ) {
    let bestOption = null;
    for ( let i = 0; i < this.possibleGuesses.length; i++ ) {
      const guess = this.possibleGuesses[ i ];
      if ( this.guessSet.has( guess ) || this.guesses.includes( guess ) ) continue;
      const map = partition( this.words, guess );
      const s = Heuristic.score( this.words, guess, map, heuristic, true );
      if ( !bestOption || s < bestOption.size ) {
        bestOption = new GuessOption( guess, map, s );
      }
    }
    return bestOption;
  }

  openSpecificGuess( guess, heuristic, skipChildSearch = false ) {
    if ( this.guessSet.has( guess ) ) return;
    this.openOption( new GuessOption( guess, partition( this.words, guess ), 1 ), heuristic, skipChildSearch );
  }

  broaden( heuristic, n = 5 ) {
    const options = this.getOptions( heuristic );
    for ( let i = 0; i < Math.min( n, options.length ); i++ ) {
      this.openOption( options[ i ], heuristic );
    }
  }

  openNext( heuristic ) {
    const option = this.getNextOption( heuristic );
    if ( option ) this.openOption( option, heuristic );
  }

  openOption( option, heuristic, skipChildSearch = false ) {
    const guessNode = new GuessNode( option, [ ...this.guesses, option.guess ], this.possibleGuesses, false, heuristic, skipChildSearch );
    this.guessNodes.push( guessNode );
    this.guessSet.add( option.guess );
    this.depth = Math.min( this.depth, guessNode.depth );
  }
}

class GuessOption {
  constructor( guess, map, size ) {
    this.guess = guess;
    this.map = map;
    this.size = size;
  }
  static compare( a, b ) { return a.size - b.size; }
}

class GuessNode {
  constructor( option, guesses, possibleGuesses, skip = false, heuristic = new Heuristic(), skipChildSearch = false ) {
    this.guess = option.guess;
    this.depth = 0;
    const map = {};
    if ( !skip ) {
      for ( const rawScore in option.map ) {
        const scoreString = fastToScoreString( rawScore );
        const words = option.map[ rawScore ];
        if ( words.length === 1 ) {
          map[ scoreString ] = words[ 0 ];
        } else {
          let newPG = possibleGuesses;
          if ( IS_HARD_MODE ) {
            const constraints = getHardModeConstraints( option.guess, scoreString );
            newPG = possibleGuesses.filter( g => isHardModeValidOptimized( g, constraints ) );
          }
          map[ scoreString ] = new ComputationNode( words, guesses, newPG, skipChildSearch, heuristic );
        }
      }
    }
    this.map = map;
    this.recomputeDepth();
  }

  merge( guessNode ) {
    for ( const score in this.map ) {
      const item = this.map[ score ];
      if ( typeof item !== 'string' ) item.merge( guessNode.map[ score ] );
    }
    this.recomputeDepth();
    return this;
  }

  depthOpen( heuristic ) {
    for ( const score in this.map ) {
      const item = this.map[ score ];
      if ( typeof item !== 'string' ) item.depthOpen( heuristic );
    }
    this.recomputeDepth();
  }

  depthFix( heuristic ) {
    for ( const score in this.map ) {
      const item = this.map[ score ];
      if ( typeof item !== 'string' ) item.depthFix( heuristic );
    }
    this.recomputeDepth();
  }

  recomputeDepth() {
    let d = 0;
    for ( const score in this.map ) {
      const item = this.map[ score ];
      d = Math.max( d, 1 + ( typeof item === 'string' ? 0 : item.depth ) );
    }
    this.depth = d;
  }

  fullRecomputeDepth() {
    for ( const score in this.map ) {
      const item = this.map[ score ];
      if ( typeof item !== 'string' ) item.fullRecomputeDepth();
    }
    this.recomputeDepth();
  }

  serialize() {
    const m = {};
    for ( const score in this.map ) {
      const item = this.map[ score ];
      m[ score ] = typeof item === 'string' ? item : item.serialize();
    }
    return { g: this.guess, d: this.depth, m: m };
  }

  static deserialize( obj, possibleGuesses = guessWords ) {
    const guessNode = new GuessNode( { guess: obj.g }, [], [], true );
    guessNode.depth = obj.d;
    const map = {};
    for ( const score in obj.m ) {
      const item = obj.m[ score ];
      let newPG = possibleGuesses;
      if ( IS_HARD_MODE ) {
        const constraints = getHardModeConstraints( obj.g, score );
        newPG = possibleGuesses.filter( g => isHardModeValidOptimized( g, constraints ) );
      }
      map[ score ] = typeof item === 'string' ? item : ComputationNode.deserialize( item, newPG );
    }
    guessNode.map = map;
    return guessNode;
  }

  createTree( metric = Ranking.minimizeLongestMetric ) {
    const map = {};
    const ranking = new Ranking();
    for ( const scoreString in this.map ) {
      const item = this.map[ scoreString ];
      const isString = typeof item === 'string';
      const subtree = isString ? item : item.createTree( metric );
      map[ scoreString ] = subtree;
      if ( scoreString === '22222' ) {
        ranking.addSelf();
      } else {
        const yellows = getYellows( scoreString );
        if ( isString ) ranking.addString( yellows );
        else ranking.addRanking( subtree.ranking, yellows );
      }
    }
    return { guess: this.guess, map: map, depth: this.depth, ranking: ranking };
  }

  createLimitedTree( guessesLeft = 6, metric = Ranking.totalGuessesMetric ) {
    const map = {};
    const ranking = new Ranking();
    for ( const scoreString in this.map ) {
      if ( guessesLeft === 1 && scoreString !== '22222' ) return null;
      const item = this.map[ scoreString ];
      const isString = typeof item === 'string';
      const subtree = isString ? item : item.createLimitedTree( guessesLeft - 1, metric );
      if ( !subtree ) return null;
      map[ scoreString ] = subtree;
      if ( scoreString === '22222' ) {
        ranking.addSelf();
      } else {
        const yellows = getYellows( scoreString );
        if ( isString ) ranking.addString( yellows );
        else ranking.addRanking( subtree.ranking, yellows );
      }
    }
    return { guess: this.guess, map: map, depth: this.depth, ranking: ranking };
  }

  widen() {
    const nodes = Object.values( this.map ).filter( n => typeof n !== 'string' );
    if ( nodes.length === 0 ) return;
    const maxD = Math.max( ...nodes.map( n => n.depth ) );
    const candidates = nodes.filter( n => n.depth === maxD );
    candidates[ Math.floor( Math.random() * candidates.length ) ].widen();
    this.recomputeDepth();
  }
}

class Heuristic {
  constructor( averageWeight = 100, bestWeight = 1, nextWeight = 0, yellowWeight = 0 ) {
    this.averageWeight = averageWeight;
    this.bestWeight = bestWeight;
    this.nextWeight = nextWeight;
    this.yellowWeight = yellowWeight;
  }
  static score( words, guess, map, heuristic, skipNext ) {
    let count = 0;
    let best = 0;
    let totalYellows = 0;
    for ( const rawScore in map ) {
      const length = map[ rawScore ].length;
      best = Math.max( best, length );
      count++;
      totalYellows += yellowsArray[ rawScore ] * length;
    }
    if ( count === 1 && words.length > 1 ) return 1e6;
    const isTarget = words.includes( guess );
    let size = heuristic.averageWeight * ( words.length - ( isTarget ? 1 : 0 ) ) / count + heuristic.bestWeight * best + heuristic.yellowWeight * totalYellows / words.length;
    if ( isTarget ) size -= 10;
    return size;
  }
}

class Ranking {
  constructor( counts = [ 0, 0 ], yellows = 0 ) {
    this.counts = counts;
    this.yellows = yellows;
  }
  addString( yellows = 0 ) { this.counts[ 1 ]++; this.yellows += yellows; }
  addSelf() { this.counts[ 0 ]++; }
  addRanking( ranking, yellows = 0 ) {
    const count = ranking.counts.reduce( ( a, b ) => a + b, 0 );
    this.yellows += ranking.yellows + yellows * count;
    for ( let i = 0; i < ranking.counts.length; i++ ) {
      if ( i + 1 >= this.counts.length ) this.counts.push( 0 );
      this.counts[ i + 1 ] += ranking.counts[ i ];
    }
  }
  totalGuessesScore() {
    let c = 0;
    for ( let i = 0; i < this.counts.length; i++ ) c += this.counts[ i ] * ( i + 1 );
    return c;
  }
  static minimizeLongestMetric( a, b ) {
    if ( a.counts.length !== b.counts.length ) return a.counts.length - b.counts.length;
    for ( let i = a.counts.length - 1; i >= 0; i-- ) {
      if ( a.counts[ i ] !== b.counts[ i ] ) return a.counts[ i ] - b.counts[ i ];
    }
    return 0;
  }
  static totalGuessesMetric( a, b ) {
    const diff = a.totalGuessesScore() - b.totalGuessesScore();
    return diff !== 0 ? diff : Ranking.minimizeLongestMetric( a, b );
  }
  static minimizeYellowsMetric( a, b ) {
    const aGuesses = a.totalGuessesScore();
    const bGuesses = b.totalGuessesScore();
    const aScore = aGuesses + 100 * a.yellows;
    const bScore = bGuesses + 100 * b.yellows;
    if ( aScore !== bScore ) return aScore - bScore;
    return Ranking.minimizeLongestMetric( a, b );
  }
}

export { ComputationNode, GuessNode, GuessOption, Ranking, Heuristic };

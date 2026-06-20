import saletGreens from '../data/salet.tree.greens.js';
import saletHardGreens from '../data/salet.tree.hard.greens.js';
import saletTotal from '../data/salet.tree.total.js';
import saletHard from '../data/salet.tree.hard.js';
import { Ranking } from './wordleCompute.js';

function evalTree(tree, name) {
    const ranking = new Ranking(tree.ranking.counts);
    ranking.yellows = tree.ranking.yellows;
    console.log(`${name}:`);
    console.log(`  Counts: [${tree.ranking.counts.join(', ')}]`);
    console.log(`  Avg Guesses: ${(ranking.totalGuessesScore() / 2315).toFixed(4)}`);
    console.log(`  Total Yellows: ${ranking.yellows}`);
    console.log(`  Avg Yellows: ${(ranking.yellows / 2315).toFixed(4)}`);
}

evalTree(saletTotal, 'Salet Normal (Fastest Avg)');
evalTree(saletGreens, 'Salet Normal (Sea of Greens)');
console.log('---');
evalTree(saletHard, 'Salet Hard (Fastest Avg)');
evalTree(saletHardGreens, 'Salet Hard (Sea of Greens)');

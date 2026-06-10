
import tree from '../data/salet.tree.hard.greens.js';

const result1 = '20011';
const nextNode = tree.map[result1];
console.log('Next guess after SALET [20011]:', nextNode.guess);

const result2 = '21002';
const finalNode = nextNode.map[result2];
console.log('Final guess after STORE [21002]:', finalNode.guess || finalNode);

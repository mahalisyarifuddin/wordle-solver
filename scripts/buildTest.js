import { setHardMode } from '../server/wordleCore.js';
import { Ranking, ComputationNode, Heuristic } from '../server/wordleCompute.js';
import targetWords from '../server/targetWords.js';
import guessWords from '../server/guessWords.js';
import { setSharedScores } from '../server/partition.js';
import { buildMatrix } from './sogCommon.js';
import fs from 'fs';

const sharedBuffer = buildMatrix();
setSharedScores(sharedBuffer);
console.log('matrix ready');

const build = (starter, hardMode, metricName) => {
  setHardMode(hardMode);
  const t0=Date.now();
  const node = new ComputationNode(targetWords, [], guessWords, true);
  node.openSpecificGuess(starter);
  const guessNode = node.guessNodes[0];
  const h = new Heuristic();
  const recurse = (cn, depth) => {
    if (depth===0 || cn.words.length<=2) return;
    cn.broaden(h, cn.words.length>50?3:5);
    cn.guessNodes.forEach(gn=>{
      for(const s in gn.map) if(typeof gn.map[s]!=='string') recurse(gn.map[s], depth-1);
    });
  };
  recurse(guessNode.map['00000'],1);
  const metric = metricName==='total'?Ranking.totalGuessesMetric:Ranking.minimizeLongestMetric;
  const tree = guessNode.createTree(metric);
  const avg = tree.ranking.counts.reduce((a,c,i)=>a+c*(i+1),0)/targetWords.length;
  console.log(`${starter} hard=${hardMode} metric=${metricName} avg=${avg.toFixed(4)} counts=${JSON.stringify(tree.ranking.counts)} time=${((Date.now()-t0)/1000).toFixed(1)}s depth=${tree.depth}`);
  return tree;
};

build('salet', false, 'total');
build('toner', false, 'total');
build('tiare', false, 'total');
build('crate', false, 'total');

// Builds exact decision trees for all 5 Preexisting Modes under Frequency Weighting
import fs from 'fs';
import { buildFrequencyTree } from './buildFrequencyTree.js';
import { evaluateWeighted } from './sogEval.js';
import { getFrequencyWeights } from '../data/wordFrequencies.js';

const weights = getFrequencyWeights('wordleAnswers');

const ALL_BUILDS = [
  // 1. Fastest Average (normal mode, gamma = 0)
  { file: 'data/salet.tree.total.js', starter: 'salet', mode: 'normal', yw: 0.0 },
  { file: 'data/slate.tree.total.js', starter: 'slate', mode: 'normal', yw: 0.0 },
  { file: 'data/trace.tree.total.js', starter: 'trace', mode: 'normal', yw: 0.0 },
  { file: 'data/crane.tree.total.js', starter: 'crane', mode: 'normal', yw: 0.0 },
  { file: 'data/least.tree.total.js', starter: 'least', mode: 'normal', yw: 0.0 },
  { file: 'data/reast.tree.total.js', starter: 'reast', mode: 'normal', yw: 0.0 },

  // 2. Fewest (normal mode, min depth)
  { file: 'data/slate.tree.js', starter: 'slate', mode: 'normal', yw: 0.0 },
  { file: 'data/salet.tree.js', starter: 'salet', mode: 'normal', yw: 0.0 },
  { file: 'data/trace.tree.js', starter: 'trace', mode: 'normal', yw: 0.0 },
  { file: 'data/least.tree.js', starter: 'least', mode: 'normal', yw: 0.0 },
  { file: 'data/crane.tree.js', starter: 'crane', mode: 'normal', yw: 0.0 },
  { file: 'data/stare.tree.js', starter: 'stare', mode: 'normal', yw: 0.0 },

  // 3. Hard Mode (hard mode, gamma = 0)
  { file: 'data/trace.tree.hard.js', starter: 'trace', mode: 'hard', yw: 0.0 },
  { file: 'data/slate.tree.hard.js', starter: 'slate', mode: 'hard', yw: 0.0 },
  { file: 'data/salet.tree.hard.js', starter: 'salet', mode: 'hard', yw: 0.0 },
  { file: 'data/least.tree.hard.js', starter: 'least', mode: 'hard', yw: 0.0 },
  { file: 'data/reast.tree.hard.js', starter: 'reast', mode: 'hard', yw: 0.0 },
  { file: 'data/crane.tree.hard.js', starter: 'crane', mode: 'hard', yw: 0.0 },

  // 4. SoG Capped Knee (normal mode, gamma = 0.45)
  { file: 'data/slate.tree.capped.js', starter: 'slate', mode: 'normal', yw: 0.45 },
  { file: 'data/salet.tree.capped.js', starter: 'salet', mode: 'normal', yw: 0.45 },
  { file: 'data/saine.tree.capped.js', starter: 'saine', mode: 'normal', yw: 0.45 },
  { file: 'data/saice.tree.capped.js', starter: 'saice', mode: 'normal', yw: 0.45 },
  { file: 'data/slane.tree.capped.js', starter: 'slane', mode: 'normal', yw: 0.45 },
  { file: 'data/soare.tree.capped.js', starter: 'soare', mode: 'normal', yw: 0.45 },

  // 5. SoG Capped Knee Hard (hard mode, gamma = 0.45)
  { file: 'data/slate.tree.hard.capped.js', starter: 'slate', mode: 'hard', yw: 0.45 },
  { file: 'data/salet.tree.hard.capped.js', starter: 'salet', mode: 'hard', yw: 0.45 },
  { file: 'data/saine.tree.hard.capped.js', starter: 'saine', mode: 'hard', yw: 0.45 },
  { file: 'data/slane.tree.hard.capped.js', starter: 'slane', mode: 'hard', yw: 0.45 },
  { file: 'data/saice.tree.hard.capped.js', starter: 'saice', mode: 'hard', yw: 0.45 },
  { file: 'data/soare.tree.hard.capped.js', starter: 'soare', mode: 'hard', yw: 0.45 }
];

console.log(`Building ${ALL_BUILDS.length} frequency-weighted decision trees across all 5 modes...`);

for (const b of ALL_BUILDS) {
  console.log(`\nBuilding: ${b.starter.toUpperCase()} (${b.mode}, yw=${b.yw}) -> ${b.file}...`);
  const { tree } = buildFrequencyTree(b.starter, b.mode, 'wordleAnswers', b.yw);
  fs.writeFileSync(b.file, `export default ${JSON.stringify(tree)}`);
}

console.log('\nAll 5-mode trees built and saved successfully!');

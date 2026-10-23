// Builds the empirically best-scoring starter sets for each shipped mode.
// All weighted modes are rebuilt from the corpus prior; the Fewest trees use
// the deeper minimax roots established by DEEP_SEARCH_REPORT.md. A native
// exact endgame pass is applied to all 30 resulting trees afterward.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { buildFrequencyTree } from './buildFrequencyTree.js';

const ALL_BUILDS = [
  // Fastest Average: normal mode, minimize expected guesses.
  ...['torse', 'trone', 'trace', 'tiare', 'roate', 'tarse'].map(starter => ({
    file: `data/${starter}.tree.total.js`, starter, mode: 'normal', yw: 0.0
  })),

  // Hard Mode: minimize frequency-weighted expected guesses.
  ...['trace', 'trone', 'tiare', 'torse', 'tarse', 'tores'].map(starter => ({
    file: `data/${starter}.tree.hard.js`, starter, mode: 'hard', yw: 0.0
  })),

  // Sea of Greens capped knee: gamma = 0.45.
  ...['toise', 'thale', 'trace', 'toile', 'soare', 'trone'].map(starter => ({
    file: `data/${starter}.tree.capped.js`, starter, mode: 'normal', yw: 0.45
  })),

  // Sea of Greens capped knee, Hard Mode: gamma = 0.45.
  ...['trace', 'toile', 'toise', 'trone', 'soare', 'torse'].map(starter => ({
    file: `data/${starter}.tree.hard.capped.js`, starter, mode: 'hard', yw: 0.45
  }))
];

console.log(`Building ${ALL_BUILDS.length} corpus-weighted trees for the top starters across four modes...`);
for (const b of ALL_BUILDS) {
  console.log(`\nBuilding: ${b.starter.toUpperCase()} (${b.mode}, yw=${b.yw}) -> ${b.file}...`);
  const { tree } = buildFrequencyTree(b.starter, b.mode, 'wordleAnswers', b.yw);
  fs.writeFileSync(b.file, `export default ${JSON.stringify(tree)}`);
}

console.log('\nApplying exact C++ endgame refinement (max candidate set size 3)...');
execFileSync(process.execPath, ['scripts/refineExactEndgames.js', '--max-size=3'], { stdio: 'inherit' });
console.log('\nAll mode trees rebuilt and endgame-refined successfully!');

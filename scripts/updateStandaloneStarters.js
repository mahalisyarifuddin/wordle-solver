// Sync the selected starter/tree sets into the dependency-free and standalone apps.
import fs from 'node:fs';

const groups = [
  {
    title: 'Fastest Average',
    items: [['T_TOTAL_TORSE', 'TORSE'], ['T_TOTAL_TRONE', 'TRONE'], ['T_TOTAL_TRACE', 'TRACE'], ['T_TOTAL_TIARE', 'TIARE'], ['T_TOTAL_ROATE', 'ROATE'], ['T_TOTAL_TARSE', 'TARSE']]
  },
  {
    title: 'Fewest',
    items: [['T_MIN_RANID', 'RANID'], ['T_MIN_RANTS', 'RANTS'], ['T_MIN_MANET', 'MANET'], ['T_MIN_SANER', 'SANER'], ['T_MIN_RATED', 'RATED'], ['T_MIN_LANES', 'LANES']]
  },
  {
    title: 'Hard Mode',
    items: [['T_HARD_TRACE', 'TRACE'], ['T_HARD_TRONE', 'TRONE'], ['T_HARD_TIARE', 'TIARE'], ['T_HARD_TORSE', 'TORSE'], ['T_HARD_TARSE', 'TARSE'], ['T_HARD_TORES', 'TORES']]
  },
  {
    title: 'SoG Capped Knee',
    items: [['T_CAPPED_TOISE', 'TOISE'], ['T_CAPPED_THALE', 'THALE'], ['T_CAPPED_TRACE', 'TRACE'], ['T_CAPPED_TOILE', 'TOILE'], ['T_CAPPED_SOARE', 'SOARE'], ['T_CAPPED_TRONE', 'TRONE']]
  },
  {
    title: 'SoG Capped Knee Hard',
    items: [['T_CAPPED_TRACE_HARD', 'TRACE (HARD)'], ['T_CAPPED_TOILE_HARD', 'TOILE (HARD)'], ['T_CAPPED_TOISE_HARD', 'TOISE (HARD)'], ['T_CAPPED_TRONE_HARD', 'TRONE (HARD)'], ['T_CAPPED_SOARE_HARD', 'SOARE (HARD)'], ['T_CAPPED_TORSE_HARD', 'TORSE (HARD)']]
  }
];

const dataFile = key => {
  const start = key.replace(/^T_/, '').toLowerCase();
  if (start.startsWith('total_')) return `data/${start.slice(6)}.tree.total.js`;
  if (start.startsWith('min_')) return `data/${start.slice(4)}.tree.js`;
  if (start.startsWith('hard_')) return `data/${start.slice(5)}.tree.hard.js`;
  if (start.startsWith('capped_')) {
    const name = start.slice(7);
    if (name.endsWith('_hard')) return `data/${name.slice(0, -5)}.tree.hard.capped.js`;
    return `data/${name}.tree.capped.js`;
  }
  throw new Error(`Unsupported tree key: ${key}`);
};
const variableName = key => {
  const s = key.replace(/^T_/, '').toLowerCase();
  if (s.startsWith('total_')) return `total${s.slice(6).replace(/(^|_)([a-z])/g, (_, _sep, c) => c.toUpperCase())}Tree`;
  if (s.startsWith('min_')) return `min${s.slice(4).replace(/(^|_)([a-z])/g, (_, _sep, c) => c.toUpperCase())}Tree`;
  if (s.startsWith('hard_')) return `hard${s.slice(5).replace(/(^|_)([a-z])/g, (_, _sep, c) => c.toUpperCase())}Tree`;
  if (s.startsWith('capped_')) {
    let name = s.slice(7);
    const hard = name.endsWith('_hard');
    if (hard) name = name.slice(0, -5);
    const word = name.replace(/(^|_)([a-z])/g, (_, _sep, c) => c.toUpperCase());
    return `capped${hard ? 'Hard' : ''}${word}Tree`;
  }
  throw new Error(`Unsupported variable key: ${key}`);
};
const treeEntries = groups.flatMap(group => group.items).map(([key, label]) => {
  const file = dataFile(key);
  const source = fs.readFileSync(file, 'utf8');
  const tree = JSON.parse(source.slice(source.indexOf('{')));
  return { key, label, file, tree, variable: variableName(key) };
});

// Lightweight bundle: replace its inline tree registry and mode menu.
{
  const file = 'wordle-solver-lite.html';
  let html = fs.readFileSync(file, 'utf8');
  const start = html.indexOf('const TREES = {');
  const marker = '\n};\n\n(function(){';
  const end = html.indexOf(marker, start);
  if (start < 0 || end < 0) throw new Error('Could not locate lite TREES block');
  const body = treeEntries.map(entry => `  ${entry.key}: ${JSON.stringify(entry.tree)}`).join(',\n');
  html = html.slice(0, start) + `const TREES = {\n${body}\n};` + html.slice(end + '\n};'.length);
  const groupStart = html.indexOf('var GROUPS = ');
  const arrayStart = html.indexOf('[', groupStart);
  const groupEnd = html.indexOf('];', arrayStart);
  if (groupStart < 0 || arrayStart < 0 || groupEnd < 0) throw new Error('Could not locate lite GROUPS block');
  html = html.slice(0, groupStart) + `var GROUPS = ${JSON.stringify(groups)};` + html.slice(groupEnd + 2);
  html = html.replace(/Sea of Greens \(1:1\) champions:[^<]*/, 'Corpus-frequency starters are ranked by mode below.');
  fs.writeFileSync(file, html);
}

// Fully inlined app: replace the tree declarations, then update button vars and labels.
{
  const file = 'wordle-solver-standalone.html';
  let html = fs.readFileSync(file, 'utf8');
  const declarationStarts = treeEntries.map(entry => html.indexOf(`const ${entry.variable} = `)).filter(index => index >= 0);
  const start = declarationStarts.length ? Math.min(...declarationStarts) : -1;
  const end = html.indexOf('const targetWords = ', start);
  if (start < 0 || end < 0) throw new Error('Could not locate standalone tree declaration block');
  const declarations = treeEntries.map(entry => `const ${entry.variable} = ${JSON.stringify(entry.tree)};`).join('\n');
  html = html.slice(0, start) + declarations + '\n\n' + html.slice(end);

  // Replace each entire six-button column below using its stable header span.
  const updateColumn = (header, entries) => {
    const h = html.indexOf(`new scenery.Text( '${header}'`);
    if (h < 0) return;
    const first = html.indexOf('createTreeButton(', h);
    const colEnd = html.indexOf("\n              ]\n            } )", first);
    if (first < 0 || colEnd < 0) throw new Error(`Could not locate button column ${header}`);
    const block = entries.map(([variable, label]) => `createTreeButton( ${variable}, '${label}' )`).join(',\n                ');
    // Replace from the first button through the last before children close.
    const close = html.lastIndexOf('                createTreeButton(', colEnd);
    const closeEnd = html.indexOf('\n', close);
    html = html.slice(0, first) + block + html.slice(closeEnd);
  };
  updateColumn('Fastest Average', [['totalTorseTree','TORSE'],['totalTroneTree','TRONE'],['totalTraceTree','TRACE'],['totalTiareTree','TIARE'],['totalRoateTree','ROATE'],['totalTarseTree','TARSE']]);
  updateColumn('Fewest', [['minRanidTree','RANID'],['minRantsTree','RANTS'],['minManetTree','MANET'],['minSanerTree','SANER'],['minRatedTree','RATED'],['minLanesTree','LANES']]);
  updateColumn('Hard Mode', [['hardTraceTree','TRACE'],['hardTroneTree','TRONE'],['hardTiareTree','TIARE'],['hardTorseTree','TORSE'],['hardTarseTree','TARSE'],['hardToresTree','TORES']]);
  updateColumn('SoG Capped Knee', [['cappedToiseTree','TOISE'],['cappedThaleTree','THALE'],['cappedTraceTree','TRACE'],['cappedToileTree','TOILE'],['cappedSoareTree','SOARE'],['cappedTroneTree','TRONE']]);
  updateColumn('SoG Capped Knee Hard', [['cappedHardTraceTree','TRACE (Hard)'],['cappedHardToileTree','TOILE (Hard)'],['cappedHardToiseTree','TOISE (Hard)'],['cappedHardTroneTree','TRONE (Hard)'],['cappedHardSoareTree','SOARE (Hard)'],['cappedHardTorseTree','TORSE (Hard)']]);
  html = html.replace('Optimized over the 14,855-word dictionary across uniform and frequency-weighted priors (~3.52 avg guesses per win under frequency weighting, ~4.14 under uniform).', 'Optimized over the 14,855-word dictionary with empirical English word-frequency priors conditioned on official Wordle answers.');
  fs.writeFileSync(file, html);
}

console.log('Updated standalone starter trees and menus.');

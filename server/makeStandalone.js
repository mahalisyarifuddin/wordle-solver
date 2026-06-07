
import fs from 'fs';
import path from 'path';

const htmlFile = 'index.html';
let html = fs.readFileSync( htmlFile, 'utf-8' );

// 1. Inline libraries
const libDir = 'lib';
const libFiles = [
  'jquery-2.1.0.min.js',
  'lodash-4.17.4.min.js',
  'scenery.min.js',
  'he-1.1.1.js',
  'himalaya-1.1.0.js',
  'flatqueue-1.2.1.js'
];

let libScript = '';
for ( const file of libFiles ) {
  const content = fs.readFileSync( path.join( libDir, file ), 'utf-8' );
  libScript += `\n/* ${file} */\n${content}\n`;
}

// Replace all lib scripts with one inlined script
html = html.replace( /<script src="lib\/.*?"><\/script>/g, '' );
html = html.replace( /<head>/, `<head>\n<script>\n${libScript}\n</script>` );

// 2. Inline data and trees
const dataDir = 'data';
const treeFiles = [
  { name: 'totalSaletTree', file: 'salet.tree.totalGuessesMetric.js' },
  { name: 'totalTraceTree', file: 'trace.tree.totalGuessesMetric.js' },
  { name: 'minSaletTree', file: 'salet.tree.minimizeLongestMetric.js' },
  { name: 'minTraceTree', file: 'trace.tree.minimizeLongestMetric.js' },
  { name: 'yellowSaletTree', file: 'salet.tree.minimizeYellowsMetric.js' },
  { name: 'yellowTraceTree', file: 'trace.tree.minimizeYellowsMetric.js' },
  { name: 'hardSaletTree', file: 'salet.tree.hardModeMetric.js' },
  { name: 'hardTraceTree', file: 'trace.tree.hardModeMetric.js' }
];

let dataScript = 'const targetWords = ' + fs.readFileSync( path.join( dataDir, 'targetWords.js' ), 'utf-8' ).replace( /export default /, '' ).replace( /;$/, '' ) + ';\n';

for ( const tree of treeFiles ) {
  const content = fs.readFileSync( path.join( dataDir, tree.file ), 'utf-8' ).replace( /export default /, '' ).replace( /;$/, '' );
  dataScript += `const ${tree.name} = ${content};\n`;
}

// Extract the main script logic
const scriptMatch = html.match( /<script type="module">([\s\S]*?)<\/script>/ );
let mainScript = scriptMatch[ 1 ];

// Remove imports
mainScript = mainScript.replace( /import .*? from '.*?';/g, '' );

// Fixup UI references to use our new names
mainScript = mainScript.replace( /totalReastTree/g, 'totalTraceTree' ); // substitute
mainScript = mainScript.replace( /totalCrateTree/g, 'totalSaletTree' );
mainScript = mainScript.replace( /totalTraceTree/g, 'totalTraceTree' );
mainScript = mainScript.replace( /totalSlateTree/g, 'totalSaletTree' );
mainScript = mainScript.replace( /totalCraneTree/g, 'totalTraceTree' );

// Add "Sea of Greens" to the UI and update other categories
const newHBoxChildren = `
          spacing: 10,
          children: [
            new scenery.FlowBox( {
              orientation: 'vertical',
              children: [
                new scenery.Text( 'Fastest Average', { font: selectionHeaderFont, fill: gray, layoutOptions: { bottomMargin: 5 } } ),
                createTreeButton( totalSaletTree ),
                createTreeButton( totalTraceTree )
              ]
            } ),
            new scenery.FlowBox( {
              orientation: 'vertical',
              children: [
                new scenery.Text( 'Fewest 5+', { font: selectionHeaderFont, fill: gray, layoutOptions: { bottomMargin: 5 } } ),
                createTreeButton( minSaletTree ),
                createTreeButton( minTraceTree )
              ]
            } ),
            new scenery.FlowBox( {
              orientation: 'vertical',
              children: [
                new scenery.Text( 'Hard Mode', { font: selectionHeaderFont, fill: gray, layoutOptions: { bottomMargin: 5 } } ),
                createTreeButton( hardSaletTree ),
                createTreeButton( hardTraceTree )
              ]
            } ),
            new scenery.FlowBox( {
              orientation: 'vertical',
              children: [
                new scenery.Text( 'Sea of Greens', { font: selectionHeaderFont, fill: gray, layoutOptions: { bottomMargin: 5 } } ),
                createTreeButton( yellowSaletTree ),
                createTreeButton( yellowTraceTree )
              ]
            } ),
          ]`;

mainScript = mainScript.replace( /new scenery\.HBox\( \{[\s\S]*?children: \[[\s\S]*?\]\n\s+\} \)/, `new scenery.HBox( {${newHBoxChildren}\n        } )` );

mainScript = mainScript.replace( /new scenery\.Text\( \`\$\{computeAverageGuesses\( tree \)\.toFixed\( 2 \)\} \$\{depth === 1 \? 'total avg\. guesses' : 'avg\. guesses left'\}, \$\{words\.length\} words, \$\{Object\.values\( tree\.map \)\.length\} colorings\`,/ ,
  ( match ) => 'new scenery.Text( `${computeAverageGuesses( tree ).toFixed( 2 )} ${depth === 1 ? \'total avg. guesses\' : \'avg. guesses left\'}${tree.ranking && tree.ranking.yellows !== undefined ? \`, ${(tree.ranking.yellows / 2315).toFixed(2)} avg. yellows\` : \'\'}, ${words.length} words, ${Object.values( tree.map ).length} colorings`,' );

// Wrap everything and replace
const finalScript = `<script>\n${dataScript}\n${mainScript}\n</script>`;
html = html.replace( /<script type="module">[\s\S]*?<\/script>/, finalScript );

fs.writeFileSync( 'index.html', html );
console.log( 'Updated index.html to be standalone' );

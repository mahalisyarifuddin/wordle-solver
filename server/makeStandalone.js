
import fs from 'fs';

let html = fs.readFileSync( 'index.html', 'utf-8' );

// 1. Replace LOCAL library scripts with inlined content (but keep CDN links)
const localLibScripts = [
  'lib/scenery.min.js',
  'lib/he-1.1.1.js',
  'lib/himalaya-1.1.0.js',
  'lib/flatqueue-1.2.1.js'
];

localLibScripts.forEach( scriptPath => {
  const scriptContent = fs.readFileSync( scriptPath, 'utf-8' );
  // Simple global replace for the script tag
  const scriptTag = `<script src="${scriptPath}"></script>`;
  html = html.split( scriptTag ).join( `<script>${scriptContent}</script>` );
} );

// 2. Resolve and inline ESM imports from the module script
const esmImports = [];
// Only match imports that are NOT commented out
const importRegex = /^[^/]*import (\w+) from '([^']+)';/gm;
let match;
while ( ( match = importRegex.exec( html ) ) !== null ) {
  esmImports.push( { variable: match[ 1 ], path: match[ 2 ] } );
}

// Sort imports to put data trees last or just process them
let inlinedData = '';
esmImports.forEach( imp => {
  const fullPath = imp.path.startsWith( './' ) ? imp.path.slice( 2 ) : imp.path;
  let content = fs.readFileSync( fullPath, 'utf-8' );
  // Transform "export default { ... }" to "const variable = { ... };"
  content = content.replace( /export default /, `const ${imp.variable} = ` );
  if ( !content.trim().endsWith( ';' ) ) {
    content += ';';
  }
  inlinedData += content + '\n';

  // Remove the import line from the HTML
  const importLine = `import ${imp.variable} from '${imp.path}';`;
  html = html.replace( importLine, '' );
} );

// 3. Inject inlined data and remove type="module" from the script tag
// Also ensure we don't accidentally match commented out module scripts
html = html.replace( '<script type="module">', `<script>\n${inlinedData}` );

fs.writeFileSync( 'wordle-solver-standalone.html', html );
console.log( 'Created wordle-solver-standalone.html' );

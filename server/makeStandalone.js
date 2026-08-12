
import fs from 'fs';

let html = fs.readFileSync( 'index.html', 'utf-8' );

// Escape sequences that would prematurely terminate an inline <script> element:
//  - "</script" closes the element (HTML spec: even inside a JS string/comment it
//    ends script data; the backslash trick is safe for JS strings, regexes and comments)
//  - "<!--" switches the tokenizer into the script-data *escaped* state, where a later
//    "</script" still closes the element (and "<!--<!--<script" would enter the
//    double-escaped state, where "</script" does NOT close it). Neutralize both so
//    inlined library code can never corrupt the page.
const escapeInline = content => {
  return content
    .replace( /(?<!\\)<\/script/gi, '<\\/script' )
    .replace( /(?<!\\)<!--/g, '<\\!--' );
};

// 1. Replace ALL library script tags (local files AND CDN links) with inlined content,
// making the standalone fully self-contained / offline-capable.
const libScripts = [
  { tag: '<script src="https://code.jquery.com/jquery-2.1.0.min.js"></script>', path: 'lib/jquery-2.1.0.min.js' },
  { tag: '<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.4/lodash.min.js"></script>', path: 'lib/lodash-4.17.4.min.js' },
  { tag: '<script src="lib/scenery.min.js"></script>', path: 'lib/scenery.min.js' },
  { tag: '<script src="lib/he-1.1.1.js"></script>', path: 'lib/he-1.1.1.js' },
  { tag: '<script src="lib/himalaya-1.1.0.js"></script>', path: 'lib/himalaya-1.1.0.js' },
  { tag: '<script src="lib/flatqueue-1.2.1.js"></script>', path: 'lib/flatqueue-1.2.1.js' }
];

libScripts.forEach( ( { tag, path } ) => {
  const scriptContent = escapeInline( fs.readFileSync( path, 'utf-8' ) );
  html = html.split( tag ).join( `<script>${scriptContent}</script>` );
} );

// 2. Strip dead commented-out dev-environment <script> tags from the module content.
// They contained literal "</script>" which would terminate the inline script element
// early (see escapeInline above), killing the entire app.
html = html.replace( /^\s*<!--\s*<script\b[\s\S]*?<\/script>\s*-->\s*$/gm, '' );

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
html = html.replace( '<script type="module">', `<script>\n${escapeInline( inlinedData )}` );

fs.writeFileSync( 'wordle-solver-standalone.html', html );
console.log( 'Created wordle-solver-standalone.html' );

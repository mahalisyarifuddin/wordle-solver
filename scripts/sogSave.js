// Build the final Sea of Greens champion trees and write them to data/.
import fs from 'fs';
import { buildMatrix, buildStaticOrder } from './sogCommon.js';
import { setState, buildTreeForWorker } from './sogBuild.js';

const matrixBuffer = buildMatrix();
const matrix = new Uint8Array( matrixBuffer );
const staticOrder = buildStaticOrder( matrix ).order;
const c = JSON.parse( fs.readFileSync( 'data/calib.json', 'utf8' ) );
const mk = o => { const g = new Float64Array( o.g ); const y = new Float64Array( o.y ); g[ 1 ] = 1; y[ 1 ] = 0; return { g, y }; };
const calib = {
  normal: { g: mk( c.normal.mean ).g, y: mk( c.normal.best25 ).y },
  hard: { g: mk( c.hard.mean ).g, y: mk( c.hard.best25 ).y }
};
setState( { matrix, calib, staticOrder } );

const builds = [
  [ 'soily', 'normal', 'soily.tree.greens' ],
  [ 'seine', 'normal', 'seine.tree.greens' ],
  [ 'seine', 'hard', 'seine.tree.hard.greens' ],
  [ 'slice', 'hard', 'slice.tree.hard.greens' ],
  [ 'saice', 'normal', 'saice.tree.greens' ],
  [ 'suint', 'normal', 'suint.tree.greens' ],
  [ 'shiny', 'hard', 'shiny.tree.hard.greens' ],
  [ 'suint', 'hard', 'suint.tree.hard.greens' ]
];

for ( const [ starter, mode, name ] of builds ) {
  const r = buildTreeForWorker( starter, mode );
  fs.writeFileSync( `data/${name}.js`, `export default ${JSON.stringify( r.tree )}` );
  console.log( `saved data/${name}.js  (${starter} ${mode}: avgG=${r.avgG.toFixed( 4 )} avgY=${r.avgY.toFixed( 4 )} 1:1=${r.oneToOne.toFixed( 4 )} depth=${r.maxDepth})` );
}

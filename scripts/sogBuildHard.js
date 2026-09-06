// Exact-build additional Hard Mode trees (min avg guesses, yw=0) and
// additional Hard Sea of Greens trees (1:1 guesses:yellows, yw=1), then save + rank.
import fs from 'fs';
import { buildMatrix, buildStaticOrder } from './sogCommon.js';
import { setState, buildTreeForWorker, setYellowWeight } from './sogBuild.js';

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

// [starter, mode, yw, filename]
const builds = JSON.parse( process.argv[ 2 ] );

const results = [];
for ( let i = 0; i < builds.length; i += 2 ) {
  const batch = builds.slice( i, i + 2 );
  const outs = await Promise.all( batch.map( async ( [ starter, mode, yw, name ] ) => {
    setYellowWeight( yw );
    const t0 = Date.now();
    const r = buildTreeForWorker( starter, mode );
    fs.writeFileSync( `data/${name}.js`, `export default ${JSON.stringify( r.tree )}` );
    const s = { starter, mode, yw, name, avgG: r.avgG, avgY: r.avgY, oneToOne: r.oneToOne, maxDepth: r.maxDepth, secs: ( ( Date.now() - t0 ) / 1000 ).toFixed( 1 ) };
    console.log( `built ${name} (${starter} ${mode} yw=${yw}): avgG=${r.avgG.toFixed( 4 )} avgY=${r.avgY.toFixed( 4 )} 1:1=${r.oneToOne.toFixed( 4 )} depth=${r.maxDepth} ${s.secs}s` );
    return s;
  } ) );
  results.push( ...outs );
}
console.log( '\n===== ALL BUILDS (sorted by objective) =====' );
results.sort( ( a, b ) => a.oneToOne - b.oneToOne );
for ( const r of results ) {
  console.log( `${r.mode.padEnd( 6 )} ${r.starter.padEnd( 8 )} yw=${r.yw} avgG=${r.avgG.toFixed( 4 )} avgY=${r.avgY.toFixed( 4 )} obj=${r.oneToOne.toFixed( 4 )} -> ${r.name}` );
}

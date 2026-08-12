// Worker: build one exact Sea of Greens tree for (starter, mode).
import { parentPort, workerData } from 'worker_threads';
import { NT, NG, buildMatrix, buildStaticOrder, setStaticOrder, newSeenState } from './sogCommon.js';
import { buildTreeForWorker } from './sogBuild.js';

const { starter, mode, matrixBuffer, calibJSON, staticOrderArr } = workerData;

const mod = await import( './sogBuild.js' );
mod.setState( { matrix: new Uint8Array( matrixBuffer ), calib: calibJSON, staticOrder: staticOrderArr } );
const { tree, avgG, avgY, oneToOne, maxDepth } = mod.buildTreeForWorker( starter, mode );
parentPort.postMessage( { avgG, avgY, oneToOne, maxDepth, tree } );

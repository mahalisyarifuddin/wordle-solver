// Worker for the deep Sea of Greens starter scan.
// Evaluates guess indices [startIdx, endIdx) with 2-ply lookahead + calibrated est tables.
import { parentPort, workerData } from 'worker_threads';
import { NT, NG, evalStarter, setStaticOrder, newSeenState } from './sogCommon.js';

const { startIdx, endIdx, matrixBuffer, calibJSON, staticOrderArr, mode, budget, yw = 1 } = workerData;
const matrix = new Uint8Array( matrixBuffer );
setStaticOrder( staticOrderArr );
const calib = calibJSON;
const seenState = newSeenState();

const results = [];
for ( let g = startIdx; g < endIdx; g++ ) {
  const r = evalStarter( g, matrix, calib, mode, budget, seenState, yw );
  results.push( [ g, r.e, r.y, r.total ] );
}
parentPort.postMessage( results );

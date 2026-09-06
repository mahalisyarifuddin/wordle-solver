import { buildMatrix, buildStaticOrder } from './sogCommon.js';
import targetWords from '../server/targetWords.js';
import guessWords from '../server/guessWords.js';

const matrix = new Uint8Array(buildMatrix());
const NT=targetWords.length, NG=guessWords.length;
console.log(`matrix ${NT}x${NG}`);

const cnt = new Int32Array(243);
const results=[];
for(let g=0; g<NG; g++){
  cnt.fill(0);
  const base=g*NT;
  for(let t=0; t<NT; t++) cnt[matrix[base+t]]++;
  let max=0, second=0, buckets=0, maxScore=-1;
  for(let s=0; s<243; s++){
    const c=cnt[s];
    if(!c) continue;
    buckets++;
    if(c>max){ second=max; max=c; maxScore=s; }
    else if(c>second) second=c;
  }
  results.push([g, max, second, buckets, maxScore]);
}
results.sort((a,b)=>a[1]-b[1] || a[2]-b[2] || b[3]-a[3]);
console.log(`top 40 by max bucket:`);
for(let i=0;i<40;i++){
  const [g,max,second,buckets,score]=results[i];
  console.log(`${String(i+1).padStart(2)}. ${guessWords[g].padEnd(8)} max=${max} second=${second} buckets=${buckets} maxScore=${score}`);
}
import fs from 'fs';
fs.writeFileSync('computed/fewest_max_scan.json', JSON.stringify(results.slice(0,500)));
// also find where known min starters rank
const known=['rance','rants','rated','ronte','alter','lance','salet','slate','palet','manet','rated','ranid'];
for(const w of known){
  const gi=guessWords.indexOf(w);
  const pos = results.findIndex(r=>r[0]===gi);
  console.log(`${w} rank ${pos+1} max ${results[pos][1]}`);
}

// Builds wordle-solver-lite.html: a dependency-free, vanilla HTML/CSS/JS
// version of the Wordle solver that consumes the same decision trees.
// No scenery, no jquery/lodash — just the trees + ~10KB of plain code, so it
// renders instantly in any browser, in sandboxed iframes, and from file://.
import fs from 'fs';

const readTree = name => {
  const s = fs.readFileSync( `data/${name}.js`, 'utf8' );
  return s.slice( s.indexOf( '{' ) );
};

// [file, varName, label]
const GROUPS = [
  { title: 'Fastest Average', items: [
    [ 'salet.tree.total', 'T_TOTAL_SALET', 'SALET' ],
    [ 'reast.tree.total', 'T_TOTAL_REAST', 'REAST' ],
    [ 'crate.tree.total', 'T_TOTAL_CRATE', 'CRATE' ],
    [ 'trace.tree.total', 'T_TOTAL_TRACE', 'TRACE' ],
    [ 'slate.tree.total', 'T_TOTAL_SLATE', 'SLATE' ],
    [ 'crane.tree.total', 'T_TOTAL_CRANE', 'CRANE' ]
  ] },
  { title: 'Fewest 5+', items: [
    [ 'rance.tree', 'T_MIN_RANCE', 'RANCE' ],
    [ 'rants.tree', 'T_MIN_RANTS', 'RANTS' ],
    [ 'rated.tree', 'T_MIN_RATED', 'RATED' ],
    [ 'ronte.tree', 'T_MIN_RONTE', 'RONTE' ],
    [ 'alter.tree', 'T_MIN_ALTER', 'ALTER' ],
    [ 'lance.tree', 'T_MIN_LANCE', 'LANCE' ]
  ] },
  { title: 'Hard Mode', items: [
    [ 'salet.tree.hard', 'T_HARD_SALET', 'SALET' ],
    [ 'slate.tree.hard', 'T_HARD_SLATE', 'SLATE' ],
    [ 'least.tree.hard', 'T_HARD_LEAST', 'LEAST' ],
    [ 'trace.tree.hard', 'T_HARD_TRACE', 'TRACE' ],
    [ 'leant.tree.hard', 'T_HARD_LEANT', 'LEANT' ],
    [ 'cramp.tree.hard', 'T_HARD_CRAMP', 'CRAMP' ]
  ] },
  { title: 'Sea of Greens', items: [
    [ 'soily.tree.greens', 'T_GREENS_SOILY', 'SOILY' ],
    [ 'seine.tree.greens', 'T_GREENS_SEINE', 'SEINE' ],
    [ 'saice.tree.greens', 'T_GREENS_SAICE', 'SAICE' ],
    [ 'seine.tree.hard.greens', 'T_GREENS_SEINE_HARD', 'SEINE (HARD)' ],
    [ 'slice.tree.hard.greens', 'T_GREENS_SLICE_HARD', 'SLICE (HARD)' ],
    [ 'shiny.tree.hard.greens', 'T_GREENS_SHINY_HARD', 'SHINY (HARD)' ]
  ] }
];

let treeBlocks = 'const TREES = {\n';
GROUPS.forEach( g => g.items.forEach( ( [ file, varName ] ) => {
  treeBlocks += `  ${varName}: ${readTree( file )},\n`;
} ) );
treeBlocks += '};\n';

const groupsJson = JSON.stringify( GROUPS.map( g => ( {
  title: g.title,
  items: g.items.map( ( [ , varName, label ] ) => [ varName, label ] )
} ) ) );

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Wordle Solver</title>
<link rel="icon" href="data:,"/>
<style>
  :root{--gray:#787C7E;--yellow:#C9B458;--green:#6AAA64;--black:#1A1A1B;--link:#1B00F1;}
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body{touch-action:manipulation;}
  body{font-family:'Clear Sans','Helvetica Neue',Arial,sans-serif;margin:0;color:var(--black);background:#fff;}
  .wrap{max-width:780px;margin:0 auto;padding:16px;}
  h1{font-size:34px;margin:0 0 10px;}
  .help{font-size:14px;color:#555;margin:0 0 14px;line-height:1.5;}
  .help a{color:var(--link);}
  .cols{display:flex;flex-wrap:wrap;gap:22px;margin-bottom:16px;}
  .col h2{font-size:13px;color:var(--gray);margin:0 0 6px;text-transform:uppercase;letter-spacing:.4px;font-weight:700;}
  .col a{display:block;font-size:14px;font-weight:700;color:var(--link);text-decoration:underline;margin:3px 0;cursor:pointer;}
  .row{display:flex;gap:5px;margin:6px 0;}
  .tile{width:62px;height:62px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#fff;user-select:none;cursor:pointer;background:var(--gray);}
  .tile.yellow{background:var(--yellow);}
  .tile.green{background:var(--green);}
  .stats{font-size:14px;color:var(--gray);margin:4px 0;}
  .copy{font-size:14px;color:var(--link);cursor:pointer;text-decoration:underline;display:inline-block;margin:4px 0;}
  .thumbs{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0;}
  .thumb{display:flex;gap:2px;cursor:pointer;border:2px solid transparent;border-radius:5px;padding:2px;}
  .thumb.sel{border-color:var(--black);}
  .thumb .t{width:31px;height:31px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;background:var(--gray);}
  .thumb .t.yellow{background:var(--yellow);}
  .thumb .t.green{background:var(--green);}
  .note{font-size:14px;color:var(--gray);}
  .err{color:#B00020;}
  .foot{margin-top:22px;font-size:12px;color:#999;}
  @media (max-width:380px){ .tile{width:54px;height:54px;font-size:28px;} .thumb .t{width:27px;height:27px;font-size:14px;} }
</style>
</head>
<body>
<div class="wrap">
  <h1>WORDLE<span style="color:#6AAA64">Solver</span></h1>
  <p class="help">Click one of the starting guesses, I'll give you the rest!<br>
  Click the letters to change the color to match your Wordle result, then you'll be given another guess (or click a thumbnail option below).<br>
  Sea of Greens (1:1 guesses:yellows) champions: <b>SOILY</b> 5.2225 · <b>SEINE (hard)</b> 5.3425.</p>
  <div class="cols" id="cols"></div>
  <div id="tree"></div>
  <div class="foot">Lightweight standalone (no libraries) — same optimized decision trees as the full app.</div>
</div>
<script>
__TREES__
(function(){
'use strict';
var GROUPS = __GROUPS__;
var COLORS = {0:'gray',1:'yellow',2:'green'};
var COLOR_NAMES = {0:'black',1:'yellow',2:'green'};
var LEN = 5;

function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }

function nodeStats(node){
  var counts = node.ranking.counts;
  var total = 0, gsum = 0;
  for(var i = 0; i < counts.length; i++){ total += counts[i] || 0; gsum += (counts[i] || 0) * (i + 1); }
  var avgY = node.ranking.yellows != null ? node.ranking.yellows / total : null;
  return { total: total, avgG: gsum / total, avgY: avgY, colorings: Object.keys(node.map).length };
}

function tileRow(word, score, onTile){
  var row = el('div','row');
  var tiles = [];
  for(var i = 0; i < LEN; i++){
    (function(idx){
      var t = el('div','tile ' + COLORS[score[idx]]);
      t.textContent = word[idx].toUpperCase();
      if(onTile){ t.addEventListener('click', function(){ onTile(idx); }); }
      tiles.push(t); row.appendChild(t);
    })(i);
  }
  return { row: row, tiles: tiles };
}

function copyText(text){
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).catch(function(){ copyFallback(text); });
  } else { copyFallback(text); }
}
function copyFallback(text){
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  } catch(e){}
}

function buildNode(node, depth, history, container){
  container.innerHTML = '';
  if(typeof node === 'string'){
    var lr = tileRow(node, '22222');
    container.appendChild(lr.row);
    container.appendChild(el('div','note','solved'));
    return;
  }
  var stats = nodeStats(node);
  var score = '00000';
  var touched = false; // the original app only shows a child branch after the user sets a score

  var g = tileRow(node.guess, score, function(idx){
    score = score.slice(0, idx) + ((parseInt(score[idx], 10) + 1) % 3) + score.slice(idx + 1);
    touched = true;
    paint();
  });

  var statsLine = el('div','stats',
    stats.avgG.toFixed(2) + (depth === 1 ? ' total avg. guesses' : ' avg. guesses left') +
    ', ' + stats.total + ' words' +
    (stats.avgY != null ? ', ' + stats.avgY.toFixed(2) + ' avg. yellows' : '') +
    ', ' + stats.colorings + ' colorings');

  var copy = el('a','copy','Copy as text');
  copy.addEventListener('click', function(){
    var text = history.concat([{ guess: node.guess, score: score }]).map(function(e){
      return e.guess.split('').map(function(l, i){
        return l.toUpperCase() + '(' + COLOR_NAMES[e.score[i]] + ')';
      }).join(' ');
    }).join('\\n');
    copyText(text);
  });

  var thumbs = el('div','thumbs');
  var thumbEls = [];
  Object.keys(node.map).sort().forEach(function(k){
    (function(key){
      var th = el('div','thumb');
      for(var i = 0; i < LEN; i++){
        var c = el('div','t ' + COLORS[key[i]]);
        c.textContent = node.guess[i].toUpperCase();
        th.appendChild(c);
      }
      th.addEventListener('click', function(){ score = key; touched = true; paint(); });
      thumbs.appendChild(th); thumbEls.push({ el: th, key: key });
    })(k);
  });

  var childArea = el('div','child');

  function paint(){
    for(var i = 0; i < LEN; i++){
      g.tiles[i].className = 'tile ' + COLORS[score[i]];
    }
    for(var j = 0; j < thumbEls.length; j++){
      thumbEls[j].el.className = 'thumb' + (thumbEls[j].key === score ? ' sel' : '');
    }
    childArea.innerHTML = '';
    if(!touched) return; // wait for the user to set a score
    if(score === '22222'){
      // solved by this guess
    } else if(node.map[score] === undefined){
      childArea.appendChild(el('div','note err','no match found'));
    } else if(typeof node.map[score] === 'string'){
      var lr2 = tileRow(node.map[score], '22222');
      childArea.appendChild(lr2.row);
      childArea.appendChild(el('div','note','solved'));
    } else {
      buildNode(node.map[score], depth + 1, history.concat([{ guess: node.guess, score: score }]), childArea);
    }
  }

  container.appendChild(g.row);
  container.appendChild(statsLine);
  container.appendChild(copy);
  container.appendChild(thumbs);
  container.appendChild(childArea);
  paint();
}

// build the strategy columns
var cols = document.getElementById('cols');
var treeArea = document.getElementById('tree');
GROUPS.forEach(function(group){
  var col = el('div','col');
  col.appendChild(el('h2', null, group.title));
  group.items.forEach(function(item){
    var tree = TREES[item[0]];
    var a = el('a', null, item[1]);
    a.addEventListener('click', function(){ buildNode(tree, 1, [], treeArea); });
    col.appendChild(a);
  });
  cols.appendChild(col);
});
})();
</script>
</body>
</html>`;

fs.writeFileSync( 'wordle-solver-lite.html', html
  .replace( '__TREES__', treeBlocks )
  .replace( '__GROUPS__', groupsJson ) );
console.log( 'Created wordle-solver-lite.html (' + ( html.length / 1024 ).toFixed( 0 ) + ' KB template)' );

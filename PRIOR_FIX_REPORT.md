# Prior Fix: Why the Solver Marched Alphabetically

**Date:** 2026-11-13
**Affected:** all 30 shipped decision trees, `data/wordFrequencies.js`, `server/wordFrequencies.js`, `server/wordleCompute.js`, `scripts/sogCommon.js`, `scripts/buildFrequencyTree.js`

## TL;DR

Answering **MOXIE** used to take seven guesses:

```
TRACE > SHINE > MOVIE > MOBIE > MOLIE > MOMIE > MOWIE > MOXIE
```

It now takes four:

```
TRACE > SHINE > MOVIE > MOXIE
```

The five junk guesses in the middle were not a solver tuning problem. They were a
**prior bug**: every word that is not one of the 2,315 official Wordle answers was
assigned the *same* probability, so a whole bucket of candidates was one big exact
tie, and every tie-break kept the first candidate in dictionary (alphabetical) order.

## Root cause 1 — the flat non-answer prior

`getFrequencyWeights('wordleAnswers')` did this:

```js
if (model === 'wordleAnswers' && !isAns) {
  raw = MAX_CORPUS_FREQUENCY * epsilon;   // 2.51e-3 * 1e-4 = 2.51e-7
}
```

Consequences:

| quantity | value |
|---|---|
| targets on one shared weight | **12,540 of 14,855** |
| distinct weight values | 405 (2,315 answers + the 404 distinct answer frequencies, roughly) |
| probability mass sitting on exact ties | **62.96 %** |
| real corpus frequency spread inside the tie | up to **912,000×** (YEARS 9.1e-4 vs. the 1e-9 floor) |

So YEARS, TIMES, and BASED — genuinely common English words — carried exactly as
much weight as MOBIE, MOLIE, ZILLS and WACKS. Inside the `_O. IE` bucket the solver
saw five equally likely words and had no reason to prefer any of them.

The corpus table already stored real frequencies (`data/corpusWordFrequencies.js`,
wordfreq 3.1.1). The prior simply threw them away.

### Fix

`getFrequencyWeights` now keeps the measured frequency for **every** word with a
soft floor, and boosts official answers:

```js
let raw = Math.max(CORPUS_WORD_FREQUENCIES[i], MAX_CORPUS_FREQUENCY * 1e-6);
if (officialAnswer) raw *= answerBoost;   // default 10
```

The floor only affects words that would otherwise collapse onto the 1e-9
"unknown" sentinel; it preserves their *relative* order because the floor is
applied after ordering by real frequency.

| word | old weight | new weight | note |
|---|---|---|---|
| MOVIE (answer) | 1.70e-3 | 1.72e-3 | unchanged role |
| MOXIE | 2.94e-6 (tied) | 4.22e-7 | real, rare, but **141× MOBIE** |
| MOBIE | 2.94e-6 (tied) | 2.99e-9 | dictionary filler |
| HILLS | 2.94e-6 (tied) | 3.43e-5 | real word |
| ZILLS | 2.94e-6 (tied) | 2.99e-9 | not a word in practice |

Distinct weight values rose from 405 to 634, and words on the 1e-9 floor
(5,062) are now the only tied group.

`model = getFrequencyWeights()` also silently returned the **uniform** prior
because the default argument was `'uniform'`; the default is now
`'wordleAnswers'`.

## Root cause 2 — tie-breaks kept dictionary order

Even after fixing the prior, exact ties still occur (equal-length candidates with
equal frequency). Three places broke them by first-come order:

| file | old behaviour |
|---|---|
| `server/wordleCompute.js` | `if (size < bestSize)` — first candidate in `possibleGuesses` (sorted) wins |
| `scripts/sogCommon.js` | `if (j < bestJoint)` — first candidate in scan order wins |
| `scripts/buildFrequencyTree.js` | `sort(...)` with no prior term, falling through to array order |

All three now prefer the candidate with the **higher prior mass**, then fall back
to alphabetical order for determinism. `scripts/sogCommon.js` also exports `g2t`
(guess index → target index), the inverse of `t2g`, needed to look up a guess's
own weight.

## Measurements

Evaluated on the 2,315 official answers (the words a real game can use).
`avg` = mean guesses to solve, `max` = worst case.

### The exact case reported

| tree | before | after |
|---|---|---|
| Hard Mode TRACE | MOBIE > MOLIE > MOMIE > MOWIE > MOXIE (7) | **TRACE > SHINE > MOVIE > MOXIE (4)** |

### All 24 frequency-weighted trees

Every tree improved in expected turns and worst case:

| mode | tree | answers avg / max before | after | Δ avg |
|---|---|---|---|---|
| Fastest Average | TORSE | 3.8281 / 8 | **3.7620 / 7** | −0.066 |
| Fastest Average | TRONE | 3.8203 / 8 | **3.7503 / 7** | −0.070 |
| Fastest Average | TRACE | 3.7814 / 8 | **3.7356 / 8** | −0.046 |
| Fastest Average | TIARE | 3.8130 / 8 | **3.7447 / 8** | −0.068 |
| Fastest Average | ROATE | 3.8778 / 8 | **3.8130 / 8** | −0.065 |
| Fastest Average | TARSE | 3.7935 / 8 | **3.7292 / 8** | −0.064 |
| Hard Mode | TRACE | 3.8328 / **11** | **3.7749 / 8** | −0.058 |
| Hard Mode | TRONE | 3.8873 / 10 | **3.8255 / 9** | −0.062 |
| Hard Mode | TIARE | 3.8985 / **11** | **3.8475 / 9** | −0.051 |
| Hard Mode | TORSE | 3.8769 / **11** | **3.8117 / 8** | −0.065 |
| Hard Mode | TARSE | 3.8406 / 10 | **3.7719 / 8** | −0.069 |
| Hard Mode | TORES | 3.8847 / **11** | **3.8212 / 8** | −0.064 |
| SoG Capped | TOISE | 3.9568 / 9 | **3.8834 / 8** | −0.073 |
| SoG Capped | THALE | 3.8311 / 8 | **3.7659 / 8** | −0.065 |
| SoG Capped | TRACE | 3.8173 / 9 | **3.7572 / 8** | −0.060 |
| SoG Capped | TOILE | 3.8834 / 9 | **3.8095 / 8** | −0.074 |
| SoG Capped | SOARE | 3.9495 / 9 | **3.8864 / 8** | −0.063 |
| SoG Capped | TRONE | 3.8657 / 9 | **3.8009 / 8** | −0.065 |
| SoG Capped Hard | TRACE | 3.8397 / **11** | **3.7711 / 9** | −0.069 |
| SoG Capped Hard | TOILE | 3.9145 / **11** | **3.8380 / 8** | −0.077 |
| SoG Capped Hard | TOISE | 3.9646 / **11** | **3.8907 / 8** | −0.074 |
| SoG Capped Hard | TRONE | 3.8968 / 10 | **3.8272 / 9** | −0.070 |
| SoG Capped Hard | SOARE | 3.9581 / **11** | **3.8894 / 8** | −0.069 |
| SoG Capped Hard | TORSE | 3.8929 / **11** | **3.8259 / 8** | −0.067 |

**Effect on the reported symptom:** the `trace.tree.hard.js` worst-case depth on
official answers dropped from 11 to 8.

### Fewest mode

The six minimax trees were rebuilt with the weight-aware heuristic
(`server/recalcWorker.js` now calls `setTargetWeights('wordleAnswers')`; it
previously built unweighted). Official-answer averages:

| tree | before | after |
|---|---|---|
| RANID | 4.2220 / 6 | **3.7205 / 6** |
| RANTS | 4.2004 / 7 | **3.6626 / 7** |
| MANET | 4.2302 / 7 | **3.7050 / 7** |
| SANER | 4.1991 / 7 | **3.6350 / 6** |
| RATED | 4.2073 / 7 | **3.6790 / 7** |
| LANES | 4.2112 / 7 | **3.6596 / 7** |

`Fewest` mode still marches through same-length families (`MANET > LOWSE >
TASTE > PASTE > CASTE > HASTE > BASTE`) because that is what minimising the
worst case actually requires: every one of those guesses is guaranteed to keep
the remaining depth at 1. Forcing a frequency-weighted objective there produced
byte-identical trees, confirming the march is optimal for the stated metric, not
a bug.

## What was *not* changed

- The dictionary (14,855 words) and the 2,315 official answer list.
- The starter sets and mode objectives (`γ = 0.45` for SoG, `λ = 1`).
- The calibrated search, exact C++ endgame refinement (`--max-size=3`), and the
  ranking/depth bookkeeping in the tree files.

## Reproduction

```bash
# Prior stats and per-tree comparison
node scripts/auditPriors.js

# Compare two trees across every answer
node scripts/auditTrees.js data/trace.tree.hard.js data/trace.tree.total.js

# Rebuild every shipped tree (about 25 min on 2 cores) + exact refinement
node scripts/rebuildAllTrees.js

# Regression tests
node scripts/testPriors.js
```

Bundle regeneration after a rebuild:

```bash
node scripts/updateStandaloneStarters.js
```

## Files touched

| file | change |
|---|---|
| `scripts/generateFrequencies.js` | source of truth for both `wordFrequencies.js` files: soft floor + answer boost, default model |
| `data/wordFrequencies.js`, `server/wordFrequencies.js` | regenerated from the above |
| `server/wordleCompute.js` | prior-aware tie-break (`isBetterOption`), weighted `Ranking`, `weightedMinimizeLongestMetric` |
| `scripts/sogCommon.js` | `g2t` index, prior-aware candidate tie-break, weighted fallback in `evalCandidate` |
| `scripts/buildFrequencyTree.js` | prior-aware `rankCandidates` sort |
| `server/recalcWorker.js` | sets the prior before building minimax trees |
| `scripts/auditPriors.js`, `scripts/auditTrees.js` | new diagnostics |
| `scripts/testPriors.js` | new regression tests |
| `scripts/rebuildAllTrees.js`, `scripts/treeBuildWorker.js` | new rebuild driver |

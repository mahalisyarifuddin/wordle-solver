# Deep Starter Search — Full 14,855-Word Dictionary

**Date:** 2026-09-06 (UTC)  
**Wordlist:** `data/targetWords.js` = `server/targetWords.js` = full [tabatkins/wordle-list](https://github.com/tabatkins/wordle-list) (14,855 five-letter words). `server/guessWords.js` is a sorted copy — every target is also a legal guess.  
**Score matrix:** guess-major `220,671,025`-byte `SharedArrayBuffer` (`computed/scores-14855x14855.bin`, ~211 MiB), cached on disk. Enables 14,855 × 14,855 `fastScore` lookups without recomputation.  
**Infrastructure:** `scripts/sogCommon.js` (shared matrix, static order, `evalStarter` 2-ply lookahead with calibrated `data/calib.json` tables), `scripts/sogBuild.js` (exact Sea-of-Greens builder: greedy + 3-pass local search under 1:1 *guesses + yellows*), `server/recalcWorker.js` / `server/wordleCompute.js` (exact breadth-first `ComputationNode` + `Heuristic` + `Ranking` for *total* and *min* metrics).

All exact trees were evaluated with `scripts/sogEval.js` (structural walk: verifies leaf coverage = 14,855, green/yellow edge checks via `fastScore`, recomputes `ranking.counts`/`yellows`/`depth` bottom-up, `rankOk`).

---

## Metrics

| Label | `Ranking` metric | Objective | Mode |
|-------|-----------------|-----------|------|
| **Fastest avg** | `totalGuessesMetric` | minimize `Σ (i+1)·counts[i] / 14855` (average guesses until win) | normal |
| **Fewest** | `minimizeLongestMetric` | lexicographically minimize worst-case: shortest `counts.length` (max depth), then fewest at depth `max`, then `max-1`, … | normal |
| **Hard** | `totalGuessesMetric` with `IS_HARD_MODE=true` | same as fastest but every follow-up guess must contain all revealed greens in place and at least as many of each yellow letter | hard |
| **SOG** | `minimizeYellowsMetric` = `totalGuesses + yellows` (yellow = `getYellows(score)` per edge, summed over all paths) | minimize `avgGuesses + avgYellows` (1:1) — “Sea of Greens”: few greens *and* few yellows | normal |
| **SOG hard** | same, `IS_HARD_MODE=true`; builder uses `YELLOW_WEIGHT=0.7` (tuned on `seine` benchmark; `1.0` reported for comparison) | same, hard | hard |

`counts[i]` = number of target words solved in `i+1` guesses (`counts[0]` = won on starter itself, i.e. `22222`). `depth` = longest path (same as `counts.length`). All trees are **exact** — no sampling.

---

## Search Pipeline

### 1. Fast estimator scan (2-ply + calib)

* `sogCommon.evalStarter(g, matrix, calib, mode, budget, st, yw)`:
  * partitions targets by starter `g`,
  * for each bucket `len>1` evaluates candidate second guesses (in-bucket words + top-`K` static-order + one-ply top-100) with `evalCandidate` (single pass over bucket, `cnt2/touched` scratch, no 243-fill), using `estG/estY` tables (`data/calib.json`: `mean` for `G`, `best25` for `Y`).
  * `E = 1 + Σ len·bestE/NT`, `Y = Σ yellows₁ + Σ len·bestY/NT`, `total = E + yw·Y`.
* **Fastest avg:** `yw=0`, `mode=normal`, `budget=600` then `budget='full'` refinement (full dictionary for `len≥20`) for top-80.
* **Hard:** same with `mode=hard`.
* **SOG:** `yw=1`, same budgets. Also used pre-existing `data/sogScan.json` (`normal`/`hard` 600 + `normalFull`/`hardFull` full) and `data/sogScanHard.json` (`hardGuesses` for hard fastest, `hardSoG` for hard SOG) as cross-checks.
* **Fewest:** primary estimator is *max bucket* (largest color partition) — `max= max_s cnt_s` — plus `second` and `buckets` as tie-breaks (cheap, runs in <1 s over matrix). Not predictive for `minimizeLongest` (see §3), so final ranking always by **exact** `min` trees.

Scan artifacts: `computed/scan_fastest.json` (200), `computed/scan_fastest_full.json` (80 full-refined), `computed/fewest_max_scan.json`, stored `data/sogScan*.json`.

### 2. Exact verification

For `K` top estimators per objective (35 for fastest, 41 for fewest, 24 → 40+24 merged for hard, 10+10 for SOG), built **exact** decision trees:

* **Total / Min / Hard:** `server/recalcWorker.js` — `ComputationNode` rooted at starter, `Heuristic()` (`100,1,0,0`), `broaden(3–5)` depth-1 on `00000` bucket, then `createTree(metric)`.
* **SOG:** `scripts/sogBuild.js` — `buildRoot` (greedy `rankCandidates` per node, 2000 static + 100 one-ply, in-bucket words always), then `localSearch(tree, words, mode, 3 passes)` (rebuilds alternative subtrees, keeps exact-best by `nodeStats` `oneToOne`). Each SOG tree ~30–37 s (normal) / ~2–4 s (hard, smaller branching).

Every tree re-validated with `sogEval.js`: leaf coverage, edge scores, `rankOk`, `depth`.

Total exact trees built for this report: **~130** (≈35 fastest + 41 fewest + 64 hard + 20 SOG).

---

## Results

### 1) Fastest Average — Normal, Total Guesses (6)

Sorted by `avg = totalGuesses/14855`, tie-break `minimizeLongest`.

| # | Starter | Avg | `counts` (`1…`) | Max | 1:1 (`avg+Y`) | `avgY` | Source |
|---|---------|-----|----------------|-----|---------------|--------|--------|
| 1 | **SALET** | **4.1360** | `[1,76,2952,7602,3426,697,96,5]` | 8 | 7.2532 | 3.1171 | exact total, `computed/deep_fastest_exact.json` |
| 2 | **PALET** | 4.1366 | `[1,76,2959,7528,3538,658,92,2,1]` | 9 | 7.0661 | 2.9295 | exact total — +0.0006 (+9 total guesses) vs SALET, but max 9 |
| 3 | **RANTS** | 4.1403 | `[1,77,2888,7605,3492,700,89,3]` | 8 | 7.2077 | 3.0674 | exact total |
| 4 | **MANET** | 4.1475 | `[1,66,2878,7590,3546,669,101,3,1]` | 9 | 7.0732 | 2.9257 | exact total |
| 5 | **SLATE** | 4.1508 | `[1,73,2919,7530,3485,726,114,6,1]` | 9 | 7.4406 | 3.2898 | shipped `slate.tree.total` re-validated, exact |
| 6 | **MORNE** | 4.1511 | `[1,61,2899,7545,3532,719,94,4]` | 8 | 7.1712 | 3.0201 | exact total |

*Context:* previous six shipped (“Fastest Average” UI column) were `SALET 4.1360, REAST 4.1885, CRATE 4.1695, TRACE 4.1731, SLATE 4.1508, CRANE 4.1751`. Our deep search confirms **SALET remains the global optimum** under the exact total-guesses objective (estimator full-refined also predicted `SALET 4.1619` #1, `TONER 4.1733` #2). `PALET` is the only starter within 0.001 of SALET — it trades 39 extra words solved in 3 vs 96/5 tail for a slightly worse worst-case (9). `REAST`/`CRATE`/`CRANE` (4.17–4.19) are now 0.03–0.05 worse than SALET and drop out of the top-6; they are replaced by `PALET`, `RANTS`, `MANET`, `MORNE` (all discovered via the 2-ply full-refined scan top-25).

Full 35-tree ranking saved in `computed/deep_fastest_exact.json`; scan predictions in `computed/scan_fastest*.json`. Reproduction: `node --max-old-space-size=8192 scripts/deepBuildFastest.js`.

---

### 2) Fewest — Normal, Minimize Longest (6)

Sorted by `minimizeLongestMetric` (shortest max, then fewest at max, then max-1, …).

| # | Starter | Max | `counts` | Avg | Tail `…` (depth 6,7,8) | Notes |
|---|---------|-----|----------|-----|------------------------|-------|
| 1 | **RATED** | 8 | `[1,67,2758,7675,3550,700,102,2]` | 4.1595 | `700,102,2` — fewest at depth 8 (2) | shipped `rated.tree` remains optimum |
| 2 | **RANID** | 8 | `[1,83,2804,7594,3602,659,110,2]` | 4.1538 | `659,110,2` | new discovery (not in shipped 6) |
| 3 | **RANTS** | 8 | `[1,77,2888,7605,3492,700,89,3]` | 4.1431 | `700,89,3` | shipped |
| 4 | **SANER** | 8 | `[1,73,2823,7572,3564,710,109,3]` | 4.1583 | `710,109,3` | new |
| 5 | **MANET** | 8 | `[1,66,2874,7593,3528,691,98,4]` | 4.1488 | `691,98,4` | also 4th for fastest |
| 6 | **LANES** | 8 | `[1,71,2875,7593,3494,714,103,4]` | 4.1499 | `714,103,4` | new |

Shipped “Fewest 5+” column was `RANCE [102,5], RANTS [89,3], RATED [102,2], RONTE [110,6], ALTER [125,8], LANCE [104,5]` (all max 8, sorted earlier as `RATED, RANTS, SALET, RANCE, LANCE, RONTE…`). Our expanded search over 41 candidates (top max-bucket + shipped) shows:

* `RATED` stays #1 (only 2 words need 8 guesses — minimal worst-case).
* `RANID` (max-bucket 2398, rank 4632 by max) nevertheless builds a tree with 2 at depth 8 and only 110 at depth 7, beating `RANCE`/`LANCE`.
* `SANER` and `LANES` displace `RANCE`/`LANCE`/`ALTER` from the top-6.
* `SALET` (`96,5`) drops to #7 — its average is best, but its 5 at depth 8 is worse than the top-6’s 2–4.

**Why max-bucket fails as proxy:** smallest max partition (`SERIA 862`, `SERAI 865`) still yields 13–15 at depth 8 (`SERIA [156,13]`, `SERAI [147,15,1]`), far worse than `RATED [102,2]`. The `min` optimum is about *balanced* tail reduction, not just first-split size. Saved in `computed/deep_fewest2_exact.json` / `computed/fewest_max_scan.json`.

---

### 3) Hard Mode — Total Guesses (6)

Hard trees are far deeper (max 15–19) due to constrained follow-ups. Sorted by hard `avg`.

| # | Starter | Hard Avg | `counts` (hard) | Max | Tail (last 3) |
|---|---------|----------|-----------------|-----|---------------|
| 1 | **PALET** | **4.5212** | `[1,180,2583,5969,3641,1405,559,261,134,64,32,13,5,4,1,1,1,1]` | 18 | `1,1,1` |
| 2 | **PEART** | 4.5231 | `[1,195,2656,5842,3648,1428,552,258,139,70,37,17,8,1,1,1,1]` | 17 | `1,1,1` |
| 3 | **TRAPE** | 4.5279 | `[1,178,2620,5862,3659,1431,587,268,134,57,30,17,7,1,1,1,1]` | 17 | `1,1,1` |
| 4 | **LEANT** | 4.5286 | `[1,169,2644,5991,3561,1359,567,260,145,81,43,17,8,4,3,1,1]` | 17 | `3,1,1` |
| 5 | **TRINE** | 4.5307 | `[1,183,2637,6052,3482,1339,564,270,157,87,46,19,10,5,1,1,1]` | 17 | `1,1,1` |
| 6 | **PRATE** | 4.5317 | `[1,186,2629,5844,3644,1436,578,272,139,63,34,18,7,1,1,1,1]` | 17 | `1,1,1` |

Shipped Hard column was `SALET 4.5709/18, SLATE 4.5686/18, LEAST 4.5950/18, TRACE 4.5692/15, LEANT 4.5286/17, CRAMP 4.5337/16`. Deep search over top-40 `hardGuesses` estimator + the 24-word sanity set (64 hard exact trees total, `computed/hard_merged_exact.json`, `computed/deep_hard_exact.json` + `computed/hard_top40_exact.json`) finds:

* **PALET** beats shipped best `LEANT` by **0.0074** (≈110 total guesses) and beats `SALET` by **0.0497** (≈738 total guesses).
* `PEART`/`TRAPE` (not in shipped) are within 0.007 of PALET — all share the `…ATE`/`…ANT` pattern but with `P`/`L` front.
* `CRAMP` (shipped #3 hard) stays #7 (`4.5337`), now just outside top-6, displaced by `TRINE`/`PRATE`.
* `SALET`/`SLATE`/`TRACE` drop to #16–18 — their hard trees have 3–4 words needing 17–18 guesses vs PALET’s 1.

Reproduction: `node --max-old-space-size=8192 scripts/deepBuildHard.js` + `scripts/deepBuildHardTop40.js`.

---

### 4) Sea of Greens — Normal, 1:1 (3)

Exact SOG builder (`sogBuild.js`, 1:1). Sorted by `oneToOne = avgG + avgY`.

| # | Starter | AvgG | AvgY | 1:1 | Max | `counts` | Notes |
|---|---------|------|------|-----|-----|----------|-------|
| 1 | **SOREE** | 4.5289 | **2.0707** | **6.5996** | 9 | `[1,40,1961,6222,4426,1475,476,184,61,7,2]` | **new global optimum** — not in shipped 4 (discovered via `normalFull` #8) |
| 2 | **SUINT** | 4.4812 | 2.1731 | 6.6543 | 12 | `[1,72,2025,6517,4204,1327,456,186,55,10,1,1]` | shipped best (`suint.tree.greens`) remains #2 |
| 3 | **SEINE** | 4.5531 | 2.1075 | 6.6607 | 9 | `[1,59,1874,6117,4518,1523,493,195,63,10,2]` | shipped |

Shipped SOG normal were `SOILY 6.6696/9, SEINE 6.6607/9, SAICE 6.7556/12, SUINT 6.6543/12` — `SOILY`/`SAICE` now 5th/9th. `SOREE` beats `SUINT` by **0.0547** (≈812 yellows+guesses). `SAINT 6.6672` and `SOILY 6.6696` are 4th/5th, just outside top-3. Saved in `computed/sog_normal_batch.json` (10 exact SOG normal trees).

Full 10 ranking: `SOREE 6.5996, SUINT 6.6543, SEINE 6.6607, SAINT 6.6672, SOILY 6.6696, SLICE 6.7180, SAINE 6.7260, SLANT 6.7451, SAICE 6.7556, SHINE 6.7766`.

---

### 5) Sea of Greens — Hard, 1:1 (3)

Hard SOG uses builder `YELLOW_WEIGHT=0.7` (reported both weights). Sorted by `oneToOne_0.7 = avgG + 0.7·avgY` (builder objective); `1.0` shown for comparability.

| # | Starter | AvgG | AvgY | 1:1 (0.7) | 1:1 (1.0) | Max | `counts` |
|---|---------|------|------|-----------|-----------|-----|----------|
| 1 | **SUINT** (hard) | 4.6802 | 2.2854 | **6.2800** | **6.9656** | 14 | `[1,174,2160,5578,4003,1600,664,315,171,97,48,22,13,6,2,1]` |
| 2 | **SAINT** (hard) | 4.6657 | 2.3420 | 6.3051 | 7.0077 | 14 | `[1,190,2291,5462,3926,1639,682,323,171,90,42,20,11,5,1,1]` |
| 3 | **SLEET** (hard) | 4.7303 | 2.2594 | 6.3119 | 6.9897 | 16 | `[1,154,1930,5433,4241,1762,674,319,175,87,40,21,10,3,2,1,1,1]` |

Shipped SOG hard were `SEINE 6.3314/0.7 (6.9833/1.0), SLICE 6.3762 (7.1020), SHINY 6.? (6.9862/1.0), SUINT 6.2800 (6.9656)` — `SUINT` stays #1. `SAINT`/`SLEET` (not in shipped hard 4) displace `SEINE` (`6.3314`) and `SOILY` (`6.3177`) for #2/#3 under `0.7` weight; under `1.0` weight the order is `SUINT 6.9656, SLEET 6.9897, SHINY 6.9862` (≈ `SAINT` 7.0077 4th). `SLIMY`/`SLICE`/`SAICE` remain 7–10th. Saved in `computed/sog_hard_batch.json`.

---

## Validation

* Every tree re-walked via `sogEval.js`: `leaves == 14855`, `rankOk == true`, `scoreEdgesOk` nodes/edges verified (e.g. `SALET total 4404 nodes / 19258 edges`, `PALET hard  ?` etc.).
* Score matrix byte-identical across all stages (`computed/scores-14855x14855.bin`).
* Calib tables (`data/calib.json`) built from pooling all existing near-optimal trees (normal `trace/slate/crate/crane/reast/salet/seine` + hard `salet/cramp/seine`); `mean` for `G`, `best25` for `Y` — same tables used for both scans and SOG builds (SOG builder uses `normal.mean.g + best25.y`, `hard.mean.g + best25.y`).

---

## Files to Reproduce

```bash
# matrix + static order (cached)
node --max-old-space-size=8192 scripts/sogCalib.js          # (re)build data/calib.json
node --max-old-space-size=8192 scripts/deepScanStarter.js fastest   # 2-ply fastest scan (600 → full)
node --max-old-space-size=8192 scripts/fewestScan.js                # max-bucket scan
node --max-old-space-size=8192 scripts/deepBuildFastest.js          # 35 exact total/min trees
node --max-old-space-size=8192 scripts/deepBuildFewest.js            # 41 exact min trees
node --max-old-space-size=8192 scripts/deepBuildHard.js              # 24 hard exact
node --max-old-space-size=8192 scripts/deepBuildHardTop40.js         # 40 hardGuesses exact
node --max-old-space-size=8192 scripts/buildSogBatch.js              # 10+10 exact SOG
node --max-old-space-size=8192 scripts/sogEval.js <tree> …           # validation
```

Artifacts in this branch (not all committed, `computed/` is gitignored): `computed/scan_fastest*.json`, `computed/fewest_*.json`, `computed/deep_*_exact.json`, `computed/hard_*_exact.json`, `computed/sog_*_batch.json`, `computed/scores-14855x14855.bin`.

---

## TL;DR Starter Lists

**Fastest avg (normal):** `SALET 4.1360`, `PALET 4.1366`, `RANTS 4.1403`, `MANET 4.1475`, `SLATE 4.1508`, `MORNE 4.1511`  
**Fewest (normal, minimize longest):** `RATED [102,2]`, `RANID [110,2]`, `RANTS [89,3]`, `SANER [109,3]`, `MANET [98,4]`, `LANES [103,4]` (all max 8)  
**Hard (avg):** `PALET 4.5212`, `PEART 4.5231`, `TRAPE 4.5279`, `LEANT 4.5286`, `TRINE 4.5307`, `PRATE 4.5317`  
**SOG normal (1:1):** `SOREE 6.5996`, `SUINT 6.6543`, `SEINE 6.6607`  
**SOG hard (0.7 weight / 1.0):** `SUINT 6.2800/6.9656`, `SAINT 6.3051/7.0077`, `SLEET 6.3119/6.9897` (shipped hard `SHINY` 6.9862 is #4 under 1.0)

All numbers are **exact** for the 14,855-word full dictionary; `SALET` remains the fastest-average champion, but `PALET` is essentially tied and `PALET` dominates hard mode, while `SOREE`/`SUINT` dominate Sea of Greens.


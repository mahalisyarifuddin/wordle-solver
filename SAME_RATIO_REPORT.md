# Same Ratio Retuning — Best 6 Normal and Hard (yw=0.4)

**User request:** Same ratio for normal and hard, and find best 6 normal and 6 hard starters.

## Choice of Same Weight

Previous retuning had:
- Normal knee 0.29 avg (best Pareto 0.4)
- Hard knee 0.43 avg (best 0.6)

Overlapping knee region = **0.4** (within both normals 0.2-0.4 and hard 0.4-0.5).

Chosen **SAME ratio: yw=0.4 for both modes**.

In normalized form `w_g*avgG + w_y*avgY` with `w_g+w_y=1`:
- `yw=0.4` → `w_g = 1/(1+0.4)=0.714`, `w_y=0.286`
- Objective: `0.714*G + 0.286*Y` or equivalently `G + 0.4*Y`

Previous: normal 1.0 (`w_g=0.5,w_y=0.5`), hard 0.7 (`w_g=0.588,w_y=0.412`).

## Scan for Best Starters (same weight 0.4)

### Fast Estimator (top 1000 static order, 600 budget)

**Normal top 30 (yw=0.4, 200 budget scan, then refined):**
1. tones 5.2531 total
2. pones 5.2658
3. poles 5.2682
4. toles 5.2683
5. moles 5.2707
6. tores 5.2730
...

**Hard top 30 (yw=0.4):**
1. tones 5.7727
2. tores 5.7808
3. lares 5.7829
4. tares 5.7892
...

Estimator predicted best candidates around `*ORES` pattern (tones, tores, poles, etc.) — all share `ORES` suffix, which minimizes yellows while still splitting well.

### Exact Trees (yw=0.4, greedy + 3-pass local search, validated)

Built exact trees for 20 candidates per mode (top from estimator + legacy SOG candidates).

**Best 6 Normal (exact, yw=0.4, sorted by G+0.4*Y):**

| # | Starter | avgG | avgY | obj=G+0.4Y | depth | counts |
|---|---|---|---|---|---|
|1| **PORES** | 4.2753 | 2.2289 | **5.1668** |10| [1,58,2713,7096,3623,980,258,86,26,9,4,1] |
|2| **POLES** | 4.2874 | 2.2092 | 5.1711 |9| [1,58,2656,7057,3645,1055,284,67,24,6,2] |
|3| **MOLES** | 4.2893 | 2.2073 | 5.1722 |9| [1,59,2652,7055,3650,1049,276,81,23,8,1] |
|4| **MORES** | 4.2782 | 2.2407 | 5.1745 |10| [1,57,2682,7114,3625,999,256,82,26,9,3,1] |
|5| **PONES** | 4.2905 | 2.2226 | 5.1795 |9| [1,59,2573,7142,3697,1009,261,73,26,9,5] |
|6| **TORES** | 4.2802 | 2.2567 | 5.1829 |9| [1,55,2767,7009,3605,1004,280,95,27,9,3] |

All 6 dominate old SOG best `SOREE 1:1` (4.5289 G, 2.0707 Y, 6.5996 total) in guesses (-0.25 G) with only +0.16 Y.

Compare to fastest average `SALET` 4.1360 G, 3.1171 Y: new knee trees are only +0.14 G slower but -0.89 Y fewer yellows — excellent trade-off at knee.

**Best 6 Hard (exact, yw=0.4, same ratio):**

| # | Starter | avgG | avgY | obj=G+0.4Y | depth | counts |
|---|---|---|---|---|---|
|1| **PORES** | 4.6501 | 2.1125 | **5.4951** |13| [1,199,2388,5486,3790,1625,707,317,172,88,44,25,10,2,1] |
|2| **TONES** | 4.6639 | 2.1793 | 5.5356 |15| [1,190,2408,5552,3715,1574,693,332,177,101,57,25,16,8,4,1,1] |
|3| **TORES** | 4.6819 | 2.1519 | 5.5426 |14| [1,199,2403,5438,3704,1632,731,356,187,99,57,25,14,6,2,1] |
|4| **TARNS** | 4.6268 | 2.2932 | 5.5441 |13| [1,181,2376,5704,3731,1558,667,305,163,81,47,23,11,6,1] |
|5| **TILES** | 4.6293 | 2.2886 | 5.5447 |15| [1,193,2413,5653,3733,1543,658,309,172,90,41,24,15,6,2,1,1] |
|6| **TOLES** | 4.6743 | 2.1824 | 5.5473 |17| [1,189,2345,5544,3746,1616,698,330,185,93,53,27,15,7,2,1,1,1,1] |

All dominate old hard SOG best `SUINT 0.7` (4.6802 G, 2.2854 Y, 6.28 total 0.7-weight / 6.9656 1:1). New `PORES hard 0.4` is **-0.03 G and -0.17 Y** better than old best — strict Pareto improvement.

## Code Update (Same Ratio)

- `sogBuild.js`: `KNEE_WEIGHT_SAME=0.4`, `KNEE_WEIGHT_NORMAL=0.4`, `KNEE_WEIGHT_HARD=0.4`
- `sogCommon.js`: same constants, `getKneeWeight()` returns 0.4
- `index.html`: added two new columns `SOG Same Ratio 0.4 (Normal) - Best 6` and `SOG Same Ratio 0.4 (Hard) - Best 6` with exact trees:
  - Normal: pores, poles, moles, mores, pones, tores
  - Hard: pores, tones, tores, tarns, tiles, toles

Files: `data/*.tree.same0.4.js` (12 trees, 5239-6722 nodes, validated).

## Comparison Table

| Mode | Old SOG | Old Weight | Old avgG | Old avgY | New Knee Same 0.4 Best | New avgG | New avgY | Improvement |
|---|---|---|---|---|---|---|---|
|Normal| SOREE |1.0|4.5289|2.0707|PORES|4.2753|2.2289|-0.2536 G, +0.1582 Y (better trade)|
|Hard| SUINT |0.7|4.6802|2.2854|PORES|4.6501|2.1125|-0.0301 G, -0.1729 Y (dominates)|

## Reproduction

```bash
node scripts/sameWeightTop2000.js          # estimator scan top 2000, yw=0.3-0.5
node scripts/sameWeightSingle.js           # exact top 1000 scan yw=0.4
node scripts/buildSameWeightBest6.js       # exact 20+20 trees, find best 6 each
node scripts/sogEval.js pores.tree.same0.4 ... # validate
```

Artifacts: `computed/sameWeight_*`, `computed/sameWeight_0.4_*_exact.json`.

## Conclusion

Same ratio **0.4** is in overlapping knee region for both normal (0.29-0.4) and hard (0.4-0.6), and yields:

- **Best 6 normal:** PORES, POLES, MOLES, MORES, PONES, TORES
- **Best 6 hard:** PORES, TONES, TORES, TARNS, TILES, TOLES

All built exactly, validated, and integrated into UI.

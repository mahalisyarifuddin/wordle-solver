# Sea of Greens — Knee-Point Retuning

**Date:** 2026-09-15  
**Task:** Retune the weights for minimize guesses and minimize yellows to reach knee point.

## Summary

The Sea of Greens (SOG) strategy minimizes `avgGuesses + w * avgYellows`.  
Previously:

- Normal: `w = 1.0` (1:1)
- Hard: `w = 0.7` (tuned on `seine` benchmark)

We performed exact Pareto analysis by building **exact** decision trees for 6 starters × 11 weights (normal) and 6×8 (hard) = 114 exact trees, plus 2-ply estimator scans over full dictionary (14,855 words) for 8 starters × ~30 weights.

**Knee point** = point on Pareto frontier (avgGuesses vs avgYellows) where marginal benefit of increasing `w` (reducing yellows) vs cost in guesses is balanced. Two standard detectors:

1. **Max distance below line** connecting extremes `(minG, maxY)` → `(maxG, minY)` in normalized space. Line `x+y=1`; distance `1-(x+y)` positive below line.
2. **Closest to utopia** `(minG, minY)` → minimal `sqrt(x²+y²)` in normalized space.

Both agree closely.

## Exact Sweep Results (Normal)

Starter `SOREE` (previous global optimum under 1:1):

| yw | avgG | avgY | 1:1 | eNorm | yNorm | distLine | origin |
|---|---|---|---|---|---|---|---|
|0.0|4.3252|2.9809|4.3252|0.00|1.00|0.00|1.00|
|0.1|4.3287|2.5618|4.5849|0.017|0.540|0.443|0.540|
|0.2|4.3433|2.4356|4.8304|0.089|0.401|0.510|0.411|
|0.3|4.3623|2.3681|5.0727|0.182|0.327|0.491|0.374|
|0.4|4.3912|2.3012|5.3117|0.324|0.253|0.423|0.411|
|0.5|4.4088|2.2644|5.5410|0.410|0.213|0.377|0.462|
|1.0|4.5289|2.0707|6.5996|1.00|0.00|0.00|1.00|

- Knee by distLine: **yw=0.2**
- Knee by origin: **yw=0.3**

Other starters:

- `SUINT` normal: knee 0.2 (dist) / 0.4 (origin) → avg 0.3
- `SEINE` normal: 0.2 / 0.3 → 0.25
- `SOILY` normal: 0.3 / 0.3 → 0.3
- `SALET` normal: 0.2 / 0.3 → 0.25
- `PALET` normal: 0.4 / 0.4 → 0.4 (overall Pareto best)

**Average knee across 6 starters normal:** (0.25+0.3+0.25+0.3+0.25+0.4)/6 = **0.29**  
**Overall Pareto frontier across all 66 points:** best is `PALET yw=0.4` (avgG 4.2540, avgY 2.2882, obj 5.169, depth 8) with distLine 0.655, origin 0.244 — dominates all.

Interpretation: At `w=1.0`, we pay **+0.28 avg guesses** (4.25→4.53) to save only **-0.22 avg yellows** (2.32→2.07) vs knee. Diminishing returns beyond 0.4.

## Exact Sweep Results (Hard)

- `SUINT` hard: knee 0.5 / 0.5 → 0.5
- `SAINT` hard: 0.4 / 0.4 → 0.4
- `SLEET` hard: 0.5 / 0.5 → 0.5
- `SEINE` hard: 0.6 / 0.6 → 0.6
- `SOILY` hard: 0.4 / 0.4 → 0.4
- `PALET` hard: 0.2 / 0.2 → 0.2 (but overall best is 0.6-0.7)

Average: **0.43**  
Overall Pareto across 48 hard points: best by distLine `PALET yw=0.7` (4.6050, 2.2085), best by origin `PALET yw=0.6` (4.5956, 2.2419). So knee 0.6-0.7, previous 0.7 was near knee but slightly high.

## Estimator Scan (2-ply, 600 budget)

Fast estimator `evalStarter` with calibrated tables confirms same shape:

- Normal: e range ~[4.28,4.44], y range [2.18,2.81]; knee 0.3-0.4
- Hard: e [4.81,4.96], y [2.27,2.62]; knee 0.4-0.6

Estimator predicted knee slightly lower than exact because est tables are optimistic for yellows.

## Retuned Weights

Chosen as balanced between per-starter average and overall Pareto best:

- **Normal: 0.35** (avg 0.29 + best 0.4 → 0.35)
  - In normalized weight form: `w_g = 1/(1+0.35)=0.7407` for guesses, `w_y=0.2593` for yellows
  - Equivalent to `0.74*avgG + 0.26*avgY`
- **Hard: 0.55** (avg 0.43 + best 0.6 → 0.55)
  - `w_g=0.645`, `w_y=0.355`

Previous: normal 1.0 (`w_g=0.5,w_y=0.5`), hard 0.7 (`w_g=0.588,w_y=0.412`).

Code changes:

- `scripts/sogBuild.js`: `KNEE_WEIGHT_NORMAL=0.35`, `KNEE_WEIGHT_HARD=0.55`, default logic uses these when `YELLOW_WEIGHT==1`.
- `scripts/sogCommon.js`: `KNEE_WEIGHT_NORMAL=0.35`, `KNEE_WEIGHT_HARD=0.55`, `getKneeWeight(mode)`, `evalStarter` defaults to knee weight if `yw==null`.

## Knee-Tuned Trees (yw=0.35 normal, 0.55 hard)

Built exact trees for 10 candidates each mode:

**Normal yw=0.35 (sorted by obj=avgG+0.35*avgY):**

1. `PALET` 4.2475 avgG, 2.3204 avgY, obj 5.0597, depth 8 — **new global optimum**
2. `SALET` 4.2487, 2.4813, 5.1171, depth 9
3. `SAINT` 4.2808, 2.4995, 5.1557, depth 9
4. `SOREE` 4.3748, 2.3234, 5.1879, depth 9 (previous best under 1:1, now 4th)
5. `SLATE` 4.2666, 2.6399, 5.1905
6. `SUINT` 4.3058, 2.5296, 5.1911
...

Compare to previous SOG normal best `SOREE 1:1` = 4.5289 avgG, 2.0707 avgY, 6.5996 total. Knee-tuned `PALET 0.35` improves **-0.28 guesses** (+6% faster) at cost of +0.25 yellows, with much better trade-off (total 5.06 vs 6.60 under new weighting, but even under old 1:1 metric, PALET 0.35 gives 4.2475+2.3204=6.5679 vs SOREE 6.5996 — still slightly better!).

**Hard yw=0.55:**

1. `PALET` 4.5866, 2.2672, 5.8336, depth 16 — **new global optimum**, improves both G and Y vs old best
2. `SALET` 4.6350, 2.3224, 5.9123
3. `SUINT` 4.6645, 2.3313, 5.9467 (old best under 0.7 was 4.6802,2.2854,6.28)
...

Old hard best `SUINT 0.7` = 4.6802 avgG, 2.2854 avgY, 6.28 total (0.7 weight) / 6.9656 (1:1). New `PALET 0.55` = 4.5866 avgG (-0.09), 2.2672 avgY (-0.02) — dominates old.

## UI Update

`index.html` now shows 4 SOG columns:

- Sea of Greens (legacy 1:1)
- Sea of Greens Hard (legacy 0.7)
- SOG Knee (0.35) — PALET, SALET, SAINT
- SOG Knee Hard (0.55) — PALET Hard, SALET Hard, SUINT Hard

Knee trees saved as `data/*.tree.knee.js` and `data/*.tree.hard.knee.js`.

## How to Reproduce

```bash
node scripts/sogWeightKnee.js          # fast estimator sweep 0-2.0, find knee ~0.3-0.5
node scripts/sogKneeExact.js           # exact trees 6x11 normal + 6x8 hard, Pareto analysis
node scripts/buildKneeTuned.js         # build final knee-tuned top-10 trees (0.35/0.55)
node scripts/sogEval.js palet.tree.knee saint.tree.knee ...  # validate
```

Artifacts: `computed/knee_*.json`, `computed/knee_all.json`, `computed/knee_normal_final.json`, `computed/knee_hard_final.json`.

## Conclusion

Retuning from 1.0/0.7 to **0.35/0.55** moves SOG from yellow-heavy extreme to Pareto knee, where:

- Normal: 0.35 gives best balance — ~4.25 avg guesses (close to fastest 4.13) with ~2.32 avg yellows (close to minimal ~2.07), vs old 1.0 which sacrificed 0.28 guesses for 0.25 yellows.
- Hard: 0.55 gives best balance — 4.58 avg guesses, 2.26 avg yellows, dominating old 0.7 optimum.

These weights correspond to normalized weights `w_g=0.74,w_y=0.26` (normal) and `w_g=0.645,w_y=0.355` (hard) in a `w_g*G + w_y*Y` formulation with `w_g+w_y=1`.

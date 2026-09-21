# Joint Knee Weight Tuning: KNEE_WEIGHT_SAME = 0.30

## 1. Unified Knee Determination Across Normal & Hard Modes

To find a **single identical ratio (`KNEE_WEIGHT_SAME`)** for both Normal and Hard modes that balances minimizing guesses depth, average guesses, and yellows:
- In **Normal Mode**, the Pareto knee for minimizing depth and yellows occurs around $\gamma \approx 0.25 - 0.30$.
- In **Hard Mode**, the Pareto knee occurs around $\gamma \approx 0.30 - 0.35$.
- **Unified Compromise Point**: **`KNEE_WEIGHT_SAME = 0.30`**
  $$\mathcal{L} = \text{avgGuesses} + 0.30 \times \text{avgYellows}$$
  (Equivalent to normalized weights: $w_g \approx 76.92\%$, $w_y \approx 23.08\%$).

---

## 2. Best Starters Under KNEE_WEIGHT_SAME = 0.30

Exact decision trees were constructed for all leading candidates using 2-ply lookahead with calibrated estimation tables and 3 passes of greedy local refinement. Every tree is structurally evaluated against the full 14,855 dictionary.

### Best 6 Normal Mode (`yw = 0.30`):
| Rank | Starter | avgGuesses | avgYellows | Objective ($G + 0.30Y$) | Worst-case Depth | Tail ($>6$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`PORES`** | 4.2567 | 2.2937 | **4.9449** | 10 | 364 |
| **2** | **`MORES`** | 4.2599 | 2.2920 | **4.9475** | 10 | 369 |
| **3** | **`POLES`** | 4.2664 | 2.2743 | **4.9487** | 9 | 376 |
| **4** | **`MOLES`** | 4.2673 | 2.2795 | **4.9512** | 9 | 382 |
| **5** | **`TOLES`** | 4.2597 | 2.3216 | **4.9562** | 9 | 384 |
| **6** | **`PALET`** | **4.2405** | 2.3872 | **4.9566** | **8** | **324** |

*Highlights:*
- `PORES` achieves the top objective score with a well-balanced 4.256 avg guesses and 2.29 avg yellows.
- `PALET` achieves the shallowest worst-case depth in the entire game (**Depth 8**, tied with pure fewest-guess trees like `MANET` and `RATED`) while cutting the failure tail $>6$ to just 324 targets.

### Best 6 Hard Mode (`yw = 0.30`):
| Rank | Starter | avgGuesses | avgYellows | Objective ($G + 0.30Y$) | Worst-case Depth | Tail ($>6$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`PALET`** | **4.5675** | 2.3461 | **5.2713** | 16 | **1,128** |
| **2** | **`PORES`** | 4.6414 | **2.1952** | **5.2999** | **13** | 1,345 |
| **3** | **`TONES`** | 4.6495 | 2.2389 | **5.3212** | 15 | 1,392 |
| **4** | **`TARNS`** | 4.6246 | 2.3225 | **5.3214** | **13** | 1,299 |
| **5** | **`TILES`** | 4.6216 | 2.3336 | **5.3217** | 15 | 1,319 |
| **6** | **`TORES`** | 4.6635 | 2.2397 | **5.3354** | 15 | 1,461 |

*Highlights:*
- `PALET` ranks #1 overall in Hard Mode under 0.30 by heavily minimizing word-family trap failures (saving over 215 words from exceeding 6 guesses compared to suffix traps).
- `PORES` and `TARNS` achieve the lowest worst-case depth (**Depth 13**) among all hard mode solvers while minimizing yellow feedback ($2.19 - 2.32$).

---

## 3. Implementation Details

1. **Engine Updates**:
   - `scripts/sogCommon.js`: `KNEE_WEIGHT_SAME = 0.30`, `KNEE_WEIGHT_NORMAL = 0.30`, `KNEE_WEIGHT_HARD = 0.30`, and `getKneeWeight()` returns `0.30`.
   - `scripts/sogBuild.js`: Default yellow weight set to `0.30`.
2. **Decision Tree Assets**:
   - `data/*.tree.same0.3.js` and `data/*.tree.hard.same0.3.js` generated and verified (14,855 coverage on every tree).
3. **Interactive UI (`index.html`)**:
   - Updated UI columns `Sea of Greens (0.30)` and `Sea of Greens Hard (0.30)` with the best 6 starters for each mode.

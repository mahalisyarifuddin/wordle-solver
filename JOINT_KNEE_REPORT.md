# Joint Knee Retuning — Best 6 Normal and Hard (yw = 0.35)

## 1. Geometric Pareto Knee Determination

The Sea of Greens objective balances average guesses and average yellows:
$$\mathcal{L} = \text{avgGuesses} + \gamma \times \text{avgYellows}$$

We performed an empirical multi-objective sweep for $\gamma \in [0.05, 1.00]$ across diverse starters across the full 14,855-word dictionary using two criteria:
1. **$\text{distLine}$**: Maximum distance below the secant line $x + y = 1$ between extremes in normalized space.
2. **$\text{origin}$**: Minimum distance to the ideal utopia point $(0,0)$.

### Empirical Knee Range:
- **Normal Mode Knee Range**: $\gamma \in [0.25, 0.35]$ (mean $\approx 0.313$)
- **Hard Mode Knee Range**: $\gamma \in [0.30, 0.40]$ (mean $\approx 0.362$)
- **Joint / Unified Knee Across All Modes**: **$\gamma^* = 0.35$** (normalized weights: $w_g = 74.1\%$, $w_y = 25.9\%$)

---

## 2. Best 6 Starters Under Joint Knee ($\gamma = 0.35$)

Exact decision trees were built with greedy search + local refinement and verified structurally (14,855 targets verified on every edge and leaf).

### Best 6 Normal Mode:
| Rank | Starter | avgGuesses | avgYellows | Objective ($G + 0.35Y$) | Tail ($>6$) | Max Depth |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`PORES`** | 4.2682 | 2.2545 | **5.0573** | 381 | 10 |
| **2** | **`PALET`** | 4.2475 | 2.3204 | **5.0597** | 324 | 8 |
| **3** | **`MOLES`** | 4.2839 | 2.2198 | **5.0608** | 383 | 9 |
| **4** | **`MORES`** | 4.2723 | 2.2559 | **5.0619** | 373 | 10 |
| **5** | **`POLES`** | 4.2763 | 2.2459 | **5.0624** | 380 | 9 |
| **6** | **`PONES`** | 4.2857 | 2.2547 | **5.0749** | 374 | 9 |

*Note: `PALET` significantly reduces the $>6$ tail (only 324 targets vs 380+), with max depth only 8, while `PORES` provides minimal objective score.*

### Best 6 Hard Mode:
| Rank | Starter | avgGuesses | avgYellows | Objective ($G + 0.35Y$) | Tail ($>6$) | Max Depth |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`PALET`** | 4.5678 | 2.3389 | **5.3864** | 1,124 | 16 |
| **2** | **`PORES`** | 4.6464 | 2.1269 | **5.3909** | 1,355 | 13 |
| **3** | **`TONES`** | 4.6532 | 2.2164 | **5.4290** | 1,392 | 15 |
| **4** | **`TILES`** | 4.6243 | 2.3128 | **5.4338** | 1,318 | 15 |
| **5** | **`TARNS`** | 4.6271 | 2.3087 | **5.4351** | 1,305 | 13 |
| **6** | **`TOLES`** | 4.6683 | 2.2010 | **5.4387** | 1,403 | 17 |

*Key finding: In Hard Mode, `PALET` takes #1 overall under the 0.35 joint knee by dramatically curbing the tail of word-family traps (saving over 230 words from exceeding 6 guesses compared to suffix traps).*

---

## 3. Updates Made
1. **Engine Constants**:
   - `scripts/sogCommon.js`: Set `KNEE_WEIGHT_SAME = 0.35`, `KNEE_WEIGHT_NORMAL = 0.35`, `KNEE_WEIGHT_HARD = 0.35`.
   - `scripts/sogBuild.js`: Updated builder default weight to `0.35`.
2. **Exact Decision Trees**:
   - Generated and verified 12 new exact tree models in `data/*.tree.*same0.35.js`.
3. **Interactive UI**:
   - Updated `index.html` to import and expose the new Best 6 starters for Normal and Hard under the 0.35 joint knee.

# Retuning for Knee of Guesses Depth & Yellows

## 1. Multi-Objective Analysis: Worst-Case Depth vs. Yellows

When balancing **worst-case guesses depth** (the maximum number of guesses needed to guarantee a solve across all 14,855 target words) and **yellows** (average yellows per game), the optimization dynamics differ between Normal and Hard modes.

### A. Normal Mode:
In Normal mode, the solver can make arbitrary consonant probe guesses when needed.
- At $\gamma = 0$ (pure fastest / fewest), trees like `MANET`, `RATED`, and `RANTS` achieve a depth of **8**, with high yellows ($\approx 2.93 - 3.12$).
- At $\gamma = 0.25$, **`PALET`** retains the theoretical minimum depth of **8**, while driving average yellows down from $2.93$ to **$2.32$** (a $21\%$ reduction in yellows with **zero depth penalty**).
- At $\gamma \ge 0.35 - 1.00$, starters like `PORES` and `SOREE` increase depth to **10 – 12**, saving only $\approx 0.15 - 0.25$ additional yellows but inflating the tail of words requiring $>6$ guesses by $+60$ to $+400$ words.
- **Normal Mode Depth-Yellow Knee**: **$\gamma = 0.25$** (or $w_g = 80\%, w_y = 20\%$).

### B. Hard Mode:
In Hard mode, green letter patterns cannot be abandoned to probe missing letters.
- At $\gamma = 0$ (pure hard fastest), starters like `PALET` and `PEART` achieve avg guesses $4.52$ but suffer depths of **16 – 18** and yellows of $2.62 - 2.78$.
- At $\gamma = 0.35$, **`PORES`** achieves the shallowest depth of any yellow-minimizing hard solver (**depth 13 – 15**), while achieving near-minimal yellows (**$2.12$**).
- At $\gamma > 0.50$, vowel-heavy starters like `SEINE` or `SLEET` reach depths of **17 – 18** and average guesses of $4.73 - 4.81$.
- **Hard Mode Depth-Yellow Knee**: **$\gamma = 0.35$** (or $w_g = 74\%, w_y = 26\%$).

### C. Joint Knee Compromise:
- If a single unified weight is enforced across both modes: **$\gamma^* = 0.30$**.
- Mode-calibrated knees: **$\gamma_{\text{normal}} = 0.25$**, **$\gamma_{\text{hard}} = 0.35$**.

---

## 2. Updated Weights in Engine

- `scripts/sogCommon.js`:
  - `KNEE_WEIGHT_NORMAL = 0.25`
  - `KNEE_WEIGHT_HARD = 0.35`
  - `KNEE_WEIGHT_SAME = 0.30`
  - `getKneeWeight(mode)` dynamically returns $0.25$ for Normal and $0.35$ for Hard.
- `scripts/sogBuild.js`: Updated to match the calibrated knee weights.

---

## 3. Best Performing Starters Under Depth-Yellow Retuning

### Normal Mode ($\gamma = 0.25$ Knee):
1. **`PALET`**: **Depth 8** (minimum worst-case), avgGuesses **4.2475**, avgYellows **2.3204**, tail $>6$: **324**
2. **`PORES`**: Depth 10, avgGuesses 4.2682, avgYellows 2.2545, tail $>6$: 381
3. **`MOLES`**: Depth 9, avgGuesses 4.2839, avgYellows 2.2198, tail $>6$: 383
4. **`MORES`**: Depth 10, avgGuesses 4.2723, avgYellows 2.2559, tail $>6$: 373
5. **`POLES`**: Depth 9, avgGuesses 4.2763, avgYellows 2.2459, tail $>6$: 380
6. **`PONES`**: Depth 9, avgGuesses 4.2857, avgYellows 2.2547, tail $>6$: 374

### Hard Mode ($\gamma = 0.35$ Knee):
1. **`PORES`**: **Depth 13** (shallowest worst-case), avgYellows **2.1269** (lowest yellows), avgGuesses 4.6464
2. **`TARNS`**: **Depth 13**, avgYellows 2.3087, avgGuesses 4.6271, tail $>6$: 1,305
3. **`PALET`**: Depth 16, avgYellows 2.3389, avgGuesses **4.5678**, tail $>6$: **1,124** (lowest tail)
4. **`TILES`**: Depth 15, avgYellows 2.3128, avgGuesses 4.6243
5. **`TONES`**: Depth 15, avgYellows 2.2164, avgGuesses 4.6532
6. **`TOLES`**: Depth 17, avgYellows 2.2010, avgGuesses 4.6683

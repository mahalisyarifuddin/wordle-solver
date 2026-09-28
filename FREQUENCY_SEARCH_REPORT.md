# Frequency-Weighted Wordle Solver: 5-Mode Starters & Retuned Pareto Knee

**Date:** 2026-09-28  
**Dictionary:** Full 14,855 five-letter words (`data/targetWords.js`).  
**Priors:** Solution-weighted Wordle Answers ($\mathcal{W}_{\text{answers}} = 2,315$) with legal coverage over all 14,855 words.  
**Retuned Joint Pareto Knee:** $\gamma = 0.45$ (guesses:yellows ratio $1 : 0.45$), $\lambda = 1.0$.

---

## 1. Retuning the Guesses:Yellows Knee Point under Frequency Weighting

Under uniform priors over 14,855 words, the Pareto knee ratio was $\gamma = 0.30 - 0.35$. Under natural language frequency / Wordle solution weighting, the search was scanned across $\gamma \in [0.0, 2.0]$ in fine $0.05$ increments to identify the maximum Pareto curvature and minimal Euclidean distance to the utopia point $(E[\text{guesses}]_{\min}, E[\text{yellows}]_{\min})$:

- **Normal Mode Curvature Knee:** $\gamma \approx 0.410 - 0.465$ (consensus at **$\gamma = 0.45$**)
- **Hard Mode Curvature Knee:** $\gamma \approx 0.445 - 0.520$ (consensus at **$\gamma = 0.45$**)
- **Unified Capped Knee Formulation:**
  $$\mathcal{L}_{\text{capped}, w} = \mathbb{E}_P[\text{depth}] + 0.45 \cdot \mathbb{E}_P[\text{yellows}] + 1.0 \sum_{w: \text{depth}(w) > 6} P(w) \cdot (\text{depth}(w) - 6)^2$$

---

## 2. Best Starters Across All 5 Preexisting Modes

All 30 decision trees are generated using exact frequency-weighted branch partitioning, lookahead, and dynamic tree assembly:

### 1) Fastest Average (Normal Mode, $\gamma = 0, \lambda = 1.0$)
*Minimizes expected turns until solution.*
| Rank | Starter | $\mathbb{E}[\text{guesses}]$ | $\mathbb{E}[\text{yellows}]$ | $\mathcal{L}_{\text{capped}}$ | Win Rate ($\le 6$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`SLATE`** | **3.4874** | 2.6121 | **4.4017** | **100.00%** |
| **2** | **`TRACE`** | **3.4935** | 2.6928 | 4.4360 | 99.96% |
| **3** | **`SALET`** | **3.4943** | 2.6708 | 4.4291 | 99.96% |
| **4** | **`REAST`** | **3.5038** | 2.9931 | 4.5514 | 99.91% |
| **5** | **`CRANE`** | **3.5069** | **2.5974** | 4.4177 | 99.91% |
| **6** | **`LEAST`** | **3.5159** | 2.9335 | 4.5427 | 99.96% |

---

### 2) Fewest (Normal Mode, Minimize Max Depth + Tail Penalty)
*Minimizes worst-case turn count and eliminates turn-count failures.*
| Rank | Starter | Max Depth | $\mathbb{E}[\text{guesses}]$ | $\mathcal{L}_{\text{capped}}$ | Win Rate ($\le 6$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`SLATE`** | **9** | **3.4874** | **4.4017** | **100.00%** |
| **2** | **`SALET`** | **9** | 3.4943 | 4.4291 | 99.96% |
| **3** | **`TRACE`** | **9** | 3.4935 | 4.4360 | 99.96% |
| **4** | **`CRANE`** | **9** | 3.5069 | 4.4177 | 99.91% |
| **5** | **`LEAST`** | **9** | 3.5159 | 4.5427 | 99.96% |
| **6** | **`STARE`** | **9** | 3.5164 | 4.5080 | 99.96% |

---

### 3) Hard Mode ($\gamma = 0, \lambda = 1.0$)
*Minimizes expected turns under Hard Mode constraints.*
| Rank | Starter | $\mathbb{E}[\text{guesses}]$ | $\mathbb{E}[\text{yellows}]$ | $\mathcal{L}_{\text{capped}}$ | Win Rate ($\le 6$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`TRACE`** | **3.5761** | 2.5618 | 4.4778 | **99.65%** |
| **2** | **`SLATE`** | **3.5783** | **2.3862** | **4.4181** | 99.57% |
| **3** | **`LEAST`** | **3.5813** | 2.7775 | 4.5598 | 99.52% |
| **4** | **`SALET`** | **3.5843** | 2.5130 | 4.4676 | 99.61% |
| **5** | **`REAST`** | **3.5921** | 2.8112 | 4.5867 | 99.44% |
| **6** | **`CRANE`** | **3.6119** | 2.5294 | 4.5032 | 99.52% |

---

### 4) SoG Capped Knee (Normal Mode, $\gamma = 0.45, \lambda = 1.0$)
*Optimizes the Sea of Greens Pareto knee: minimizes turns while heavily reducing yellow tile feedback.*
| Rank | Starter | $\mathcal{L}_{\text{capped}}$ | $\mathbb{E}[\text{guesses}]$ | $\mathbb{E}[\text{yellows}]$ | Win Rate ($\le 6$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`SLANE`** | **4.2106** | 3.5380 | 1.9216 | **100.00%** |
| **2** | **`SLATE`** | **4.2188** | **3.5164** | 2.0066 | **100.00%** |
| **3** | **`SAICE`** | **4.2273** | 3.5955 | **1.8036** | 100.00% |
| **4** | **`SAINE`** | **4.2419** | 3.5885 | 1.8653 | 100.00% |
| **5** | **`SALET`** | **4.2439** | 3.5393 | 2.0117 | 100.00% |
| **6** | **`SOARE`** | **4.2709** | 3.5661 | 2.0122 | 100.00% |

---

### 5) SoG Capped Knee Hard (Hard Mode, $\gamma = 0.45, \lambda = 1.0$)
*Sea of Greens Pareto knee in Hard Mode.*
| Rank | Starter | $\mathcal{L}_{\text{capped}}$ | $\mathbb{E}[\text{guesses}]$ | $\mathbb{E}[\text{yellows}]$ | Win Rate ($\le 6$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`SLANE`** | **4.3163** | **3.5999** | 2.0273 | **99.60%** |
| **2** | **`SLATE`** | **4.3277** | 3.6102 | 2.0242 | 99.56% |
| **3** | **`SAICE`** | **4.3416** | 3.6673 | **1.8895** | 99.52% |
| **4** | **`SAINE`** | **4.3519** | 3.6591 | 1.9526 | 99.52% |
| **5** | **`SALET`** | **4.3563** | 3.6020 | 2.1355 | 99.60% |
| **6** | **`SOARE`** | **4.3964** | 3.6703 | 2.0398 | 99.56% |

---

## 3. Web App Integration Summary

The web apps maintain the clean 5-column layout with all decision trees re-evaluated and replaced by their frequency-weighted counterparts:

- `index.html`: Fully interactive, loads all 30 frequency-weighted trees with SVG/Scenery UI.
- `wordle-solver-lite.html`: Standalone, lightweight version bundling all 30 trees into zero-dependency client code.
- `wordle-solver-standalone.html`: Fully inlined single-file app.

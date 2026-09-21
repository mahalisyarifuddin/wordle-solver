# Lambda-Capped Best Starters Across All Modes

## 1. Unified Lambda-Capped Formulation

For all modes, trajectories exceeding 6 guesses are penalized quadratically according to:
$$\mathcal{L}_{\text{capped}}(\gamma, \lambda) = \text{avgGuesses} + \gamma \times \text{avgYellows} + \lambda \sum_{d > 6} (d - 6)^2 \cdot \frac{\text{counts}[d]}{N}$$

where:
- $\lambda = 1.0$ is the nominal quadratic penalty weight for excess turns ($d > 6$).
- $\mathcal{P} = \sum_{d > 6} (d - 6)^2 \frac{\text{counts}[d]}{N}$ is the empirical penalty rate.
- For **Fastest**, **Fewest**, and **Hard Mode**, $\gamma = 0$ (no yellow penalty).
- For **Sea of Greens (SoG)**, $\gamma = 0.35$ (the unified joint Pareto knee).

---

## 2. Best Starters Ranked per Mode Under $\mathcal{L}_{\text{capped}}$

Evaluated exactly across all 14,855 target words:

### 1) Fastest Average (Normal Mode, $\gamma = 0, \lambda = 1.0$):
*Balances minimizing average guesses while penalizing words taking $>6$ turns.*
| Rank | Starter | $\mathcal{L}_{\text{capped}}$ | avgGuesses | Penalty Rate $\mathcal{P}$ | Tail ($>6$) | Max Depth |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`SALET`** | **4.1439** | **4.1360** | 0.0078 | 101 | **8** |
| **2** | **`PALET`** | **4.1439** | 4.1366 | **0.0073** | **95** | 9 |
| **3** | **`RANTS`** | **4.1477** | 4.1403 | 0.0074 | 101 | **8** |
| **4** | **`MANET`** | **4.1557** | 4.1475 | 0.0082 | 105 | 9 |
| **5** | **`LANES`** | **4.1579** | 4.1499 | 0.0080 | 107 | **8** |
| **6** | **`MORNE`** | **4.1585** | 4.1511 | 0.0074 | 98 | **8** |

*Note: `SALET` and `PALET` virtually tie for #1 (within 0.00003). `PALET` achieves the fewest total words failing the 6-turn limit (only 95 words), while `SALET` has a slight edge on pure average.*

---

### 2) Fewest (Normal Mode, Minimize Max Depth + Tail Penalty $\lambda = 1.0$):
*Minimizes the maximum worst-case turns needed, tie-broken by the quadratic tail penalty.*
| Rank | Starter | Max Depth | Penalty Rate $\mathcal{P}$ | Tail ($>6$) | avgGuesses |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`RANTS`** | **8** | **0.0068** | **92** | 4.1431 |
| **2** | **`MORNE`** | **8** | **0.0074** | 98 | 4.1511 |
| **3** | **`RATED`** | **8** | **0.0074** | 104 | 4.1595 |
| **4** | **`MANET`** | **8** | **0.0077** | 102 | 4.1488 |
| **5** | **`SALET`** | **8** | **0.0078** | 101 | 4.1360 |
| **6** | **`RANID`** | **8** | **0.0079** | 112 | 4.1538 |

*Note: `RANTS` wins #1 under the capped fewest metric, having the absolute lowest penalty rate ($\mathcal{P} = 0.0068$) and fewest 7+ guess words (only 92 targets out of 14,855).*

---

### 3) Hard Mode ($\gamma = 0, \lambda = 1.0$):
*Hard Mode without yellow constraints, heavily penalizing sequential word-family traps $>6$.*
| Rank | Starter | $\mathcal{L}_{\text{capped}}$ | avgGuesses | Penalty Rate $\mathcal{P}$ | Tail ($>6$) | Max Depth |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`CRAMP`** | **4.8399** | 4.5337 | **0.3062** | **957** | **16** |
| **2** | **`TRAPE`** | **4.9216** | 4.5279 | 0.3937 | 1,104 | 17 |
| **3** | **`PALET`** | **4.9284** | **4.5212** | 0.4071 | 1,076 | 18 |
| **4** | **`PEART`** | **4.9439** | 4.5231 | 0.4207 | 1,085 | 17 |
| **5** | **`PRATE`** | **4.9445** | 4.5317 | 0.4128 | 1,115 | 17 |
| **6** | **`LEANT`** | **5.0003** | 4.5286 | 0.4717 | 1,130 | 17 |

*Note: In Hard Mode, `CRAMP` is the undisputed leader under the lambda cap. By probing `C`, `R`, `M`, and `P` on guess 1, it avoids falling into common suffix traps, keeping words exceeding 6 turns under 1,000 (957 words vs 1,300+ for vowel starters).*

---

### 4) Sea of Greens Normal ($\gamma = 0.35, \lambda = 1.0$):
| Rank | Starter | $\mathcal{L}_{\text{capped}}$ | avgGuesses | avgYellows | Tail ($>6$) | Max Depth |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`PALET`** | **5.1128** | **4.2475** | 2.3204 | **324** | **10** |
| **2** | **`POLES`** | **5.1222** | 4.2874 | **2.2092** | 383 | 11 |
| **3** | **`MOLES`** | **5.1235** | 4.2839 | 2.2198 | 383 | 11 |
| **4** | **`PORES`** | **5.1302** | 4.2682 | 2.2545 | 381 | 12 |
| **5** | **`MORES`** | **5.1310** | 4.2599 | 2.2920 | 369 | 12 |
| **6** | **`TOLES`** | **5.1357** | 4.2597 | 2.3216 | 384 | 11 |

---

### 5) Sea of Greens Hard ($\gamma = 0.35, \lambda = 1.0$):
| Rank | Starter | $\mathcal{L}_{\text{capped}}$ | avgGuesses | avgYellows | Tail ($>6$) | Max Depth |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`PALET`** | **5.8109** | 4.5678 | 2.3389 | 1,124 | 18 |
| **2** | **`CRAMP`** | **5.8149** | **4.5337** | 2.7858 | **957** | **16** |
| **3** | **`PORES`** | **5.9017** | 4.6464 | **2.1269** | 1,355 | **15** |
| **4** | **`TRAPE`** | **5.9116** | 4.5279 | 2.8286 | 1,104 | 17 |
| **5** | **`PRATE`** | **5.9132** | 4.5317 | 2.7677 | 1,115 | 17 |
| **6** | **`PEART`** | **5.9176** | 4.5231 | 2.7822 | 1,085 | 17 |

---

## 3. Summary of Champions Across All 5 Modes

| Mode | Objective Description | #1 Champion | Tail ($>6$) | Max Depth | avgGuesses | avgYellows |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Fastest (Capped)** | Minimize guesses + penalty | **`SALET`** / **`PALET`** | 101 / 95 | 8 / 9 | 4.1360 | 3.12 / 2.93 |
| **Fewest (Capped)** | Minimize worst-case depth | **`RANTS`** | **92** | **8** | 4.1431 | 3.06 |
| **Hard Mode (Capped)** | Hard mode minimize traps | **`CRAMP`** | **957** | **16** | 4.5337 | 2.79 |
| **SoG Normal (Capped)** | Joint knee + cap penalty | **`PALET`** | **324** | **10** | 4.2475 | 2.32 |
| **SoG Hard (Capped)** | Joint knee + hard cap penalty | **`PALET`** | 1,124 | 18 | 4.5678 | 2.34 |

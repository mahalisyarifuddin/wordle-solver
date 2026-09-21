# Unified Lambda-Capped Joint Knee — Best Starters Report

## 1. Unified Objective Formulation

To prevent the solver from falling into deep word-family traps (like the 9-guess `PA_ER` trap with `PORES`), we evaluate candidates under the **Unified Lambda-Capped Joint Knee Objective**:
$$\mathcal{L}_{\text{capped}}(\gamma, \lambda) = \text{avgGuesses} + \gamma \times \text{avgYellows} + \lambda \sum_{d > 6} (d - 6)^2 \cdot \frac{\text{counts}[d]}{N}$$

where:
- $\gamma = 0.35$ is the unified joint Pareto knee ratio across all modes.
- $\lambda = 1.0$ is the nominal weight for quadratically penalizing excess turns beyond turn 6.
- $\mathcal{P} = \sum_{d > 6} (d - 6)^2 \frac{\text{counts}[d]}{N}$ is the normalized penalty rate.

---

## 2. Top Starters Ranked Under $\mathcal{L}_{\text{capped}}$

All exact decision trees evaluated against the full 14,855 dictionary:

### Best 6 Normal Mode:
| Rank | Starter | $\mathcal{L}_{\text{capped}}$ | avgGuesses | avgYellows | Tail ($>6$) | Max Depth | Penalty Rate $\mathcal{P}$ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`PALET`** | **5.1128** | **4.2475** | 2.3204 | **324** | **10** | **0.0532** |
| **2** | **`POLES`** | **5.1222** | 4.2874 | **2.2092** | 383 | 11 | 0.0615 |
| **3** | **`MOLES`** | **5.1235** | 4.2839 | 2.2198 | 383 | 11 | 0.0627 |
| **4** | **`PORES`** | **5.1302** | 4.2682 | 2.2545 | 381 | 12 | 0.0730 |
| **5** | **`MORES`** | **5.1310** | 4.2599 | 2.2920 | 369 | 12 | 0.0689 |
| **6** | **`TOLES`** | **5.1357** | 4.2597 | 2.3216 | 384 | 11 | 0.0635 |

*Key finding:* `PALET` takes #1 overall in Normal Mode because it slashes the $>6$ failure tail down to 324 targets (saving $\approx 60$ targets compared to vowel-heavy starters) with the lowest penalty rate ($\mathcal{P} = 0.0532$).

### Best 6 Hard Mode:
| Rank | Starter | $\mathcal{L}_{\text{capped}}$ | avgGuesses | avgYellows | Tail ($>6$) | Max Depth | Penalty Rate $\mathcal{P}$ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **`PALET`** | **5.8109** | 4.5678 | 2.3389 | 1,124 | 18 | 0.4245 |
| **2** | **`CRAMP`** | **5.8149** | **4.5337** | 2.7858 | **957** | **16** | **0.3062** |
| **3** | **`PORES`** | **5.9017** | 4.6464 | **2.1269** | 1,355 | **15** | 0.5109 |
| **4** | **`TRAPE`** | **5.9116** | 4.5279 | 2.8286 | 1,104 | 17 | 0.3937 |
| **5** | **`PRATE`** | **5.9132** | 4.5317 | 2.7677 | 1,115 | 17 | 0.4128 |
| **6** | **`PEART`** | **5.9176** | 4.5231 | 2.7822 | 1,085 | 17 | 0.4207 |

*Key finding:* Under the capped objective in Hard Mode, **`PALET`** and **`CRAMP`** decisively defeat pure vowel-heavy starters (`TONES`, `TORES`, `SEINE`). By probing critical high-frequency consonants early, `CRAMP` keeps the tail under 1,000 words (penalty rate only $0.3062$), while `PALET` balances consonant elimination with a lower yellow footprint ($2.3389$).

---

## 3. UI and Repository Integration

- **Tree Assets**: Saved under `data/*.tree.capped.js` and `data/*.tree.hard.capped.js`.
- **Interactive UI**: `index.html` updated with two dedicated columns:
  - `SoG Capped Knee`: `PALET`, `POLES`, `MOLES`, `PORES`, `MORES`, `TOLES`
  - `SoG Capped Knee Hard`: `PALET (Hard)`, `CRAMP (Hard)`, `PORES (Hard)`, `TRAPE (Hard)`, `PRATE (Hard)`, `PEART (Hard)`

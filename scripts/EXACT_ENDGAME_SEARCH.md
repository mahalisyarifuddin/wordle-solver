# Exact endgame tree refinement

`node scripts/buildAllPreexistingModes.js` automatically runs the exact endgame pass with `--max-size=3` after rebuilding its 30 shipped trees. The checked-in trees were refined over 68,496 distinct states (up to three candidates). To run it separately, use `node scripts/refineExactEndgames.js`; by default this refines states up to size five. The script compiles `exactEndgame.cpp` with `g++ -O3`. Use `--max-size=3` for the reproducible shipped-tree scope, `--dry-run` to count states, or pass specific tree paths to limit refinement. Requires a C++17 compiler.

For each selected state the native solver enumerates every legal guess, branches on the actual Wordle feedback partition, memoizes candidate-set/constraint states, uses lower-bound pruning, and collapses equivalent non-answer partitions in normal mode. It solves the shipped objectives as follows:

- Ordinary and Hard Mode trees: globally minimum frequency-weighted expected remaining turns (with Hard Mode legality enforced).
- `.capped.js` trees: minimum `E[turns] + 0.45 E[yellows] + E[(turns - 6)_+^2]`, accounting for the path depth before the subtree.
- Normal `.tree.js` fewest trees: minimum worst-case remaining turns.

The optimum is exact **within each selected endgame state** and its stated objective. The larger prefixes, including the chosen starting word, still come from the frequency-aware tree builder and are not globally certified. Increasing `--max-size` improves coverage but can increase runtime sharply; full exact search from the 14,855-word root is not tractable with this state-space approach.

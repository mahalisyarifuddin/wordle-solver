#!/usr/bin/env python3
"""Generate the bundled five-letter English frequency table.

Requires wordfreq==3.1.1: python -m pip install wordfreq==3.1.1
The resulting table follows data/targetWords.js ordering and stores relative
per-word token frequencies from wordfreq's English `large` list (minimum 1e-9).
"""
import re
from pathlib import Path
from wordfreq import word_frequency

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "data/targetWords.js").read_text()
words = re.findall(r"'([a-z]{5})'", source)
if not words or len(set(words)) != len(words):
    raise SystemExit("Could not parse unique targetWords from data/targetWords.js")
frequencies = [word_frequency(word, "en", wordlist="large", minimum=1e-9) for word in words]

header = '''// English word-frequency estimates aligned to data/targetWords.js.
// Generated with wordfreq 3.1.1, English `large` list, word_frequency(),
// unknown-word floor 1e-9. Values are relative per-token frequencies.
// Data attribution: wordfreq (Robyn Speer); includes Google Books Ngrams,
// SUBTLEX, Leeds Internet Corpus, Wikipedia, ParaCrawl, and OpenSubtitles.
// See https://github.com/rspeer/wordfreq and its data/license notices.
export const CORPUS_WORD_FREQUENCIES = new Float64Array([
'''
lines = []
for i in range(0, len(frequencies), 8):
    lines.append("  " + ", ".join(f"{value:.9g}" for value in frequencies[i:i+8]) + ",")
(ROOT / "data/corpusWordFrequencies.js").write_text(header + "\n".join(lines) + "\n]);\n")
print(f"Generated frequencies for {len(words)} words; {sum(x == 1e-9 for x in frequencies)} use the unknown-word floor.")

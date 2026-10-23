// Exact expected-turn optimizer for small remaining Wordle candidate sets.
// Searches every legal guess and recursively solves the resulting states.
// Inputs (whitespace-separated paths): targets, guesses, weights.bin,
// score-matrix.bin, requests.txt, output.txt.
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

struct Constraints {
  bool hard = false;
  int metric = 0; // 0 expected turns, 1 minimax turns, 2 capped turns + yellow cost
  int gammaMilli = 0;
  int turnsUsed = 0;
  std::array<char, 5> fixed{{0, 0, 0, 0, 0}};
  std::array<uint8_t, 26> minCount{};
};

struct Result {
  double cost = 0;
  int guess = -1;
};

static int NT, NG;
static std::vector<std::string> targets, guesses;
static std::vector<int> guessTarget;
static std::vector<double> weights;
static std::vector<uint8_t> scores;
static std::unordered_map<std::string, Result> memo;

static std::string stateKey(const std::vector<int>& words, const Constraints& c) {
  std::string key;
  key.reserve(1 + 5 + 26 + words.size() * 4);
  key.push_back(c.hard ? 1 : 0);
  key.push_back(static_cast<char>(c.metric));
  key.push_back(static_cast<char>(c.gammaMilli & 0xff));
  key.push_back(static_cast<char>((c.gammaMilli >> 8) & 0xff));
  key.push_back(static_cast<char>(c.turnsUsed & 0xff));
  key.push_back(static_cast<char>((c.turnsUsed >> 8) & 0xff));
  key.append(c.fixed.data(), c.fixed.size());
  key.append(reinterpret_cast<const char*>(c.minCount.data()), c.minCount.size());
  for (int w : words) {
    for (int b = 0; b < 4; ++b) key.push_back(static_cast<char>((w >> (b * 8)) & 0xff));
  }
  return key;
}

static bool validHardGuess(const std::string& guess, const Constraints& c) {
  if (!c.hard) return true;
  std::array<int, 26> count{};
  for (int i = 0; i < 5; ++i) {
    if (c.fixed[i] && guess[i] != c.fixed[i]) return false;
    if (guess[i] < 'a' || guess[i] > 'z') return false;
    count[guess[i] - 'a']++;
  }
  for (int i = 0; i < 26; ++i) if (count[i] < c.minCount[i]) return false;
  return true;
}

static Constraints childConstraints(const Constraints& parent,
                                    const std::string& guess, int score) {
  Constraints c = parent;
  if (!c.hard) return c;
  int nonGray[26]{};
  int value = score;
  int tile[5];
  for (int i = 0; i < 5; ++i) { tile[i] = value % 3; value /= 3; }
  for (int i = 0; i < 5; ++i) {
    if (tile[i] == 2) c.fixed[i] = guess[i];
    if (tile[i] != 0) nonGray[guess[i] - 'a']++;
  }
  for (int i = 0; i < 26; ++i) c.minCount[i] = std::max<int>(c.minCount[i], nonGray[i]);
  return c;
}

static std::string scoreString(int score) {
  std::string s(5, '0');
  for (int i = 0; i < 5; ++i) { s[i] = char('0' + score % 3); score /= 3; }
  return s;
}

static double solve(const std::vector<int>& words, const Constraints& c) {
  if (words.size() <= 1) {
    const int extra = c.metric == 2 ? std::max(0, c.turnsUsed + 1 - 6) : 0;
    return 1.0 + (c.metric == 2 ? extra * extra : 0.0);
  }
  const std::string key = stateKey(words, c);
  const auto found = memo.find(key);
  if (found != memo.end()) return found->second.cost;

  double totalMass = 0;
  for (int t : words) totalMass += weights[t];
  if (!(totalMass > 0)) totalMass = static_cast<double>(words.size());

  double bestCost = INFINITY;
  int bestGuess = -1;
  std::array<std::vector<int>, 243> buckets;
  std::array<double, 243> mass{};
  std::unordered_map<std::string, int> seenPartitions;

  for (int g = 0; g < NG; ++g) {
    if (!validHardGuess(guesses[g], c)) continue;
    for (auto& bucket : buckets) bucket.clear();
    mass.fill(0);
    double yellowMass = 0;
    for (int t : words) {
      const int pattern = scores[static_cast<size_t>(g) * NT + t];
      buckets[pattern].push_back(t);
      mass[pattern] += weights[t];
      int p = pattern;
      for (int i = 0; i < 5; ++i) { if (p % 3 == 1) yellowMass += weights[t]; p /= 3; }
    }
    bool progress = !buckets[242].empty();
    if (!progress) {
      for (const auto& bucket : buckets) {
        if (!bucket.empty() && bucket.size() < words.size()) { progress = true; break; }
      }
    }
    if (!progress) continue;

    const int targetIndex = guessTarget[g];
    const bool guessesPossibleAnswer = targetIndex >= 0 &&
      std::binary_search(words.begin(), words.end(), targetIndex);
    if (!c.hard && c.gammaMilli == 0 && !guessesPossibleAnswer) {
      // For Normal Mode with no feedback-yellows objective, pattern labels have
      // no future effect. Collapse non-answer guesses inducing the same split.
      std::array<int, 243> canonical;
      canonical.fill(-1);
      int nextGroup = 0;
      std::string signature;
      signature.reserve(words.size());
      for (int t : words) {
        const int pattern = scores[static_cast<size_t>(g) * NT + t];
        if (canonical[pattern] < 0) canonical[pattern] = nextGroup++;
        signature.push_back(static_cast<char>(canonical[pattern]));
      }
      if (!seenPartitions.emplace(std::move(signature), g).second) continue;
    }

    double cost = 1.0;
    if (c.metric == 2) cost += (static_cast<double>(c.gammaMilli) / 1000.0) * yellowMass / totalMass;
    if (c.metric == 2 && !buckets[242].empty()) {
      const int extra = std::max(0, c.turnsUsed + 1 - 6);
      cost += (mass[242] / totalMass) * extra * extra;
    }
    bool pruned = false;
    for (int p = 0; p < 243; ++p) {
      if (buckets[p].empty() || p == 242) continue;
      const double probability = mass[p] / totalMass;
      const Constraints next = [&] {
        Constraints n = childConstraints(c, guesses[g], p);
        n.turnsUsed = c.turnsUsed + 1;
        return n;
      }();
      const double childCost = solve(buckets[p], next);
      if (c.metric == 1) {
        cost = std::max(cost, 1.0 + childCost);
      }
      else {
        cost += probability * childCost;
      }
      if (cost >= bestCost) { pruned = true; break; }
    }
    if (!pruned && cost < bestCost) {
      bestCost = cost;
      bestGuess = g;
    }
  }

  if (bestGuess < 0) {
    // The target words themselves are always legal, so this is a defensive
    // fallback for malformed inputs or an inconsistent Hard Mode constraint.
    bestGuess = words.front();
    bestCost = 1.0;
    for (size_t i = 1; i < words.size(); ++i) bestCost += weights[words[i]] / totalMass;
  }
  memo.emplace(key, Result{bestCost, bestGuess});
  return bestCost;
}

static void writeTree(std::ostream& out, const std::vector<int>& words,
                      const Constraints& c) {
  if (words.size() == 1) {
    out << '"' << targets[words.front()] << '"';
    return;
  }
  const std::string key = stateKey(words, c);
  auto it = memo.find(key);
  if (it == memo.end()) { solve(words, c); it = memo.find(key); }
  const int g = it->second.guess;
  out << "{\"guess\":\"" << guesses[g] << "\",\"map\":{";
  std::array<std::vector<int>, 243> buckets;
  for (auto& bucket : buckets) bucket.clear();
  for (int t : words) buckets[scores[static_cast<size_t>(g) * NT + t]].push_back(t);
  bool first = true;
  for (int p = 0; p < 243; ++p) {
    if (buckets[p].empty()) continue;
    if (!first) out << ',';
    first = false;
    out << '"' << scoreString(p) << "\":";
    if (p == 242 || buckets[p].size() == 1) {
      out << '"' << targets[buckets[p].front()] << '"';
    }
    else {
      Constraints next = childConstraints(c, guesses[g], p);
      next.turnsUsed = c.turnsUsed + 1;
      writeTree(out, buckets[p], next);
    }
  }
  out << "}}";
}

static std::vector<std::string> readWords(const std::string& path) {
  std::ifstream in(path);
  std::vector<std::string> words;
  std::string word;
  while (in >> word) words.push_back(word);
  return words;
}

int main(int argc, char** argv) {
  if (argc != 7) {
    std::cerr << "usage: exactEndgame targets guesses weights.bin scores.bin requests.txt output.txt\n";
    return 2;
  }
  targets = readWords(argv[1]);
  guesses = readWords(argv[2]);
  NT = static_cast<int>(targets.size());
  NG = static_cast<int>(guesses.size());
  std::unordered_map<std::string, int> targetIndex;
  for (int i = 0; i < NT; ++i) targetIndex.emplace(targets[i], i);
  guessTarget.resize(NG, -1);
  for (int g = 0; g < NG; ++g) {
    const auto it = targetIndex.find(guesses[g]);
    if (it != targetIndex.end()) guessTarget[g] = it->second;
  }
  weights.resize(NT);
  {
    std::ifstream in(argv[3], std::ios::binary);
    in.read(reinterpret_cast<char*>(weights.data()), static_cast<std::streamsize>(weights.size() * sizeof(double)));
    if (!in) { std::cerr << "failed reading weights\n"; return 3; }
  }
  scores.resize(static_cast<size_t>(NT) * NG);
  {
    std::ifstream in(argv[4], std::ios::binary);
    in.read(reinterpret_cast<char*>(scores.data()), static_cast<std::streamsize>(scores.size()));
    if (!in) { std::cerr << "failed reading score matrix\n"; return 4; }
  }

  std::ifstream requests(argv[5]);
  std::ofstream output(argv[6]);
  if (!requests || !output) { std::cerr << "failed opening query files\n"; return 5; }
  std::string line;
  while (std::getline(requests, line)) {
    if (line.empty()) continue;
    std::istringstream row(line);
    int id = 0, hard = 0, metric = 0, gammaMilli = 0, turnsUsed = 0, count = 0;
    std::string fixed, counts;
    row >> id >> hard >> metric >> gammaMilli >> turnsUsed >> fixed >> counts >> count;
    if (!row || fixed.size() != 5 || counts.size() != 26 || count < 2 || metric < 0 || metric > 2) {
      std::cerr << "bad request: " << line << '\n';
      return 6;
    }
    Constraints c;
    c.hard = hard != 0;
    c.metric = metric;
    c.gammaMilli = gammaMilli;
    c.turnsUsed = turnsUsed;
    for (int i = 0; i < 5; ++i) c.fixed[i] = fixed[i] == '-' ? 0 : fixed[i];
    for (int i = 0; i < 26; ++i) c.minCount[i] = static_cast<uint8_t>(counts[i] - '0');
    std::vector<int> words(count);
    for (int& w : words) row >> w;
    if (!row) { std::cerr << "bad word list: " << line << '\n'; return 7; }
    std::sort(words.begin(), words.end());
    const double cost = solve(words, c);
    output << id << '\t' << std::setprecision(17) << cost << '\t';
    writeTree(output, words, c);
    output << '\n';
    if (id % 100 == 0) std::cerr << "solved " << id << "; memo states=" << memo.size() << '\n';
  }
  return 0;
}

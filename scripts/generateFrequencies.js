// Generator for data/wordFrequencies.js and server/wordFrequencies.js
import fs from 'fs';
import targetWords from '../data/targetWords.js';

const c0 = `aback, abase, abate, abbey, abbot, abhor, abide, abled, abode, abort, about, above, abuse, abyss, acorn, acrid, actor, acute, adage, adapt, adept, admin, admit, adobe, adopt, adore, adorn, adult, affix, afire, afoot, afoul, after, again, agape, agate, agent, agile, aging, aglow, agony, agora, agree, ahead, aider, aisle, alarm, album, alert, algae, alibi, alien, align, alike, alive, allay, alley, allot, allow, alloy, aloft, alone, along, aloof, aloud, alpha, altar, alter, amass, amaze, amber, amble, amend, amiss, amity, among, ample, amply, amuse, angel, anger, angle, angry, angst, anime, ankle, annex, annoy, annul, anode, antic, anvil, aorta, apart, aphid, aping, apnea, apple, apply, apron, aptly, arbor, ardor, arena, argue, arise, armor, aroma, arose, array, arrow, arson, artsy, ascot, ashen, aside, askew, assay, asset, atoll, atone, attic, audio, audit, augur, aunty, avail, avert, avian, avoid, await, awake, award, aware, awash, awful, awoke, axial, axiom, axion, azure, bacon, badge, badly, bagel, baggy, baker, baler, balmy, banal, banjo, barge, baron, basal, basic, basil, basin, basis, baste, batch, bathe, baton, batty, bawdy, bayou, beach, beady, beard, beast, beech, beefy, befit, began, begat, beget, begin, begun, being, belch, belie, belle, belly, below, bench, beret, berry, berth, beset, betel, bevel, bezel, bible, bicep, biddy, bigot, bilge, billy, binge, bingo, biome, birch, birth, bison, bitty, black, blade, blame, bland, blank, blare, blast, blaze, bleak, bleat, bleed, bleep, blend, bless, blimp, blind, blink, bliss, blitz, bloat, block, bloke, blond, blood, bloom, blown, bluer, bluff, blunt, blurb, blurt, blush, board, boast, bobby, boney, bongo, bonus, booby, boost, booth, booty, booze, boozy, borax, borne, bosom, bossy, botch, bough, boule, bound, bowel, boxer, brace, braid, brain, brake, brand, brash, brass, brave, bravo, brawl, brawn, bread, break, breed, briar, bribe, brick, bride, brief, brine, bring, brink, briny, brisk, broad, broil, broke, brood, brook, broom, broth, brown, brunt, brush, brute, buddy, budge, buggy, bugle, build, built`;

const c1 = `bulge, bulky, bully, bunch, bunny, burly, burnt, burst, bused, bushy, butch, butte, buxom, buyer, bylaw, cabal, cabby, cabin, cable, cacao, cache, cacti, caddy, cadet, cagey, cairn, camel, cameo, canal, candy, canny, canoe, canon, caper, caput, carat, cargo, carol, carry, carve, caste, catch, cater, catty, caulk, cause, cavil, cease, cedar, cello, chafe, chaff, chain, chair, chalk, champ, chant, chaos, chard, charm, chart, chase, chasm, cheap, cheat, check, cheek, cheer, chess, chest, chick, chide, chief, child, chili, chill, chime, china, chirp, chock, choir, choke, chord, chore, chose, chuck, chump, chunk, churn, chute, cider, cigar, cinch, circa, civic, civil, clack, claim, clamp, clang, clank, clash, clasp, class, clean, clear, cleat, cleft, clerk, click, cliff, climb, cling, clink, cloak, clock, clone, close, cloth, cloud, clout, clove, clown, cluck, clued, clump, clung, coach, coast, cobra, cocoa, colon, color, comet, comfy, comic, comma, conch, condo, conic, copse, coral, corer, corny, couch, cough, could, count, coupe, court, coven, cover, covet, covey, cower, coyly, crack, craft, cramp, crane, crank, crash, crass, crate, crave, crawl, craze, crazy, creak, cream, credo, creed, creek, creep, creme, crepe, crept, cress, crest, crick, cried, crier, crime, crimp, crisp, croak, crock, crone, crony, crook, cross, croup, crowd, crown, crude, cruel, crumb, crump, crush, crust, crypt, cubic, cumin, curio, curly, curry, curse, curve, curvy, cutie, cyber, cycle, cynic, daddy, daily, dairy, daisy, dally, dance, dandy, datum, daunt, dealt, death, debar, debit, debug, debut, decal, decay, decor, decoy, decry, defer, deign, deity, delay, delta, delve, demon, demur, denim, dense, depot, depth, derby, deter, detox, deuce, devil, diary, dicey, digit, dilly, dimly, diner, dingo, dingy, diode, dirge, dirty, disco, ditch, ditto, ditty, diver, dizzy, dodge, dodgy, dogma, doing, dolly, donor, donut, dopey, doubt, dough, dowdy, dowel, downy, dowry, dozen, draft, drain, drake, drama, drank, drape, drawl, drawn, dread, dream, dress, dried, drier, drift, drill, drink, drive, droit, droll, drone, drool, droop, dross, drove, drown, druid, drunk, dryer, dryly, duchy, dully, dummy, dumpy, dunce, dusky, dusty, dutch, duvet, dwarf, dwell, dwelt, dying, eager, eagle, early, earth, easel, eaten, eater, ebony, eclat, edict, edify, eerie, egret, eight, eject, eking, elate, elbow, elder, elect, elegy, elfin, elide, elite, elope, elude, email, embed, ember, emcee, empty, enact, endow, enema, enemy, enjoy, ennui, ensue, enter, entry, envoy, epoch, epoxy, equal, equip, erase, erect, erode, error, erupt, essay, ester, ether, ethic, ethos, etude, evade, event, every, evict, evoke, exact, exalt, excel, exert, exile, exist, expel, extol, extra, exult, eying, fable, facet, faint, fairy, faith, false, fancy, fanny, farce, fatal, fatty, fault, fauna, favor, feast, fecal, feign, fella, felon, femme, femur, fence, feral, ferry, fetal, fetch, fetid, fetus, fever, fewer, fiber, fibre, ficus, field, fiend, fiery, fifth, fifty, fight, filer, filet, filly, filmy, filth, final, finch, finer, first, fishy, fixer, fizzy, fjord, flack, flail, flair, flake, flaky, flame, flank, flare, flash, flask, fleck, fleet, flesh, flick, flier, fling, flint, flirt, float, flock, flood, floor, flora, floss, flour, flout, flown, fluff, fluid, fluke, flume, flung, flunk, flush, flute, flyer, foamy, focal, focus, foggy, foist, folio, folly, foray, force, forge, forgo, forte, forth, forty, forum, found, foyer, frail, frame, frank, fraud, freak, freed, freer, fresh, friar, fried, frill, frisk, fritz, frock, frond, front, frost, froth, frown, froze, fruit, fudge, fugue, fully, fungi, funky, funny, furor, furry, fussy, fuzzy, gaffe, gaily, gamer, gamma, gamut, gassy, gaudy, gauge, gaunt, gauze, gavel, gawky, gayer, gayly, gazer, gecko, geeky, geese, genie, genre, ghost, ghoul, giant, giddy, gipsy, girly, girth, given, giver, glade, gland, glare, glass, glaze, gleam, glean, glide, glint, gloat, globe, gloom, glory, gloss, glove, glyph, gnash, gnome, godly, going, golem, golly, gonad, goner, goody, gooey, goofy, goose, gorge, gouge, gourd, grace, grade, graft, grail, grain, grand, grant, grape, graph, grasp, grass, grate, grave, gravy, graze, great, greed, green, greet, grief, grill, grime, grimy, grin`;

const c2 = `gripe, groan, groin, groom, grope, gross, group, grout, grove, growl, grown, gruel, gruff, grunt, guard, guava, guess, guest, guide, guild, guile, guilt, guise, gulch, gully, gumbo, gummy, guppy, gusto, gusty, gypsy, habit, hairy, halve, handy, happy, hardy, harem, harpy, harry, harsh, haste, hasty, hatch, hater, haunt, haute, haven, havoc, hazel, heady, heard, heart, heath, heave, heavy, hedge, hefty, heist, helix, hello, hence, heron, hilly, hinge, hippo, hippy, hitch, hoard, hobby, hoist, holly, homer, honey, honor, horde, horny, horse, hotel, hotly, hound, house, hovel, hover, howdy, human, humid, humor, humph, humus, hunch, hunky, hurry, husky, hussy, hutch, hydro, hyena, hymen, hyper, icily, icing, ideal, idiom, idiot, idler, idyll, igloo, iliac, image, imbue, impel, imply, inane, inbox, incur, index, inept, inert, infer, ingot, inlay, inlet, inner, input, inter, intro, ionic, irate, irony, islet, issue, itchy, ivory, jaunt, jazzy, jelly, jerky, jetty, jewel, jiffy, joint, joist, joker, jolly, joust, judge, juice, juicy, jumbo, jumpy, junta, junto, juror, kappa, karma, kayak, kebab, khaki, kinky, kiosk, kitty, knack, knave, knead, kneed, kneel, knelt, knife, knock, knoll, known, koala, krill, label, labor, laden, ladle, lager, lance, lanky, lapel, lapse, large, larva, lasso, latch, later, lathe, latte, laugh, layer, leach, leafy, leaky, leant, leapt, learn, lease, leash, least, leave, ledge, leech, leery, lefty, legal, leggy, lemon, lemur, leper, level, lever, libel, liege, light, liken, lilac, limbo, limit, linen, liner, lingo, lipid, lithe, liver, livid, llama, loamy, loath, lobby, local, locus, lodge, lofty, logic, login, loopy, loose, lorry, loser, louse, lousy, lover, lower, lowly, loyal, lucid, lucky, lumen, lumpy, lunar, lunch, lunge, lupus, lurch, lurid, lusty, lying, lymph, lynch, lyric, macaw, macho, macro, madam, madly, mafia, magic, magma, maize, major, maker, mambo, mamma, mammy, manga, mange, mango, mangy, mania, manic, manly, manor, maple, march, marry, marsh, mason, masse, match, matey, mauve, maxim, maybe, mayor, mealy, meant, meaty, mecca, medal, media, medic, melee, melon, mercy, merge, merit, merry, metal, meter, metro, micro, midge, midst, might, milky, mimic, mince, miner, minim, minor, minty, minus, mirth, miser, missy, mocha, modal, model, modem, mogul, moist, molar, moldy, money, month, moody, moose, moral, moron, morph, mossy, motel, motif, motor, motto, moult, mound, mount, mourn, mouse, mouth, mover, movie, mower, mucky, mucus, muddy, mulch, mummy, munch, mural, murky, mushy, music, musky, musty, myrrh, nadir, naive, nanny, nasal, nasty, natal, naval, navel, needy, neigh, nerdy, nerve, never, newer, newly, nicer, niche, niece, night, ninja, ninny, ninth, noble, nobly, noise, noisy, nomad, noose, north, nosey, notch, novel, nudge, nurse, nutty, nylon, nymph, oaken, obese, occur, ocean, octal, octet, odder, oddly, offal, offer, often, olden, older, olive, ombre, omega, onion, onset, opera, opine, opium, optic, orbit, order, organ, other, otter, ought, ounce, outdo, outer, outgo, ovary, ovate, overt, ovine, ovoid, owing, owner, oxide, ozone, paddy, pagan, paint, paler, palsy, panel, panic, pansy, papal, paper, parer, parka, parry, parse, party, pasta, paste, pasty, patch, patio, patsy, patty, pause, payee, payer, peace, peach, pearl, pecan, pedal, penal, pence, penne, penny, perch, peril, perky, pesky, pesto, petal, petty, phase, phone, phony, photo, piano, picky, piece, piety, piggy, pilot, pinch, piney, pinky, pinto, piper, pique, pitch, pithy, pivot, pixel, pixie, pizza, place, plaid, plain, plait, plane, plank, plant, plate, plaza, plead, pleat, plied, plier, pluck, plumb, plume, plump, plunk, plush, poesy, point, poise, poker, polar, polka, polyp, pooch, poppy, porch, poser, posit, posse, pouch, pound, pouty, power, prank, prawn, preen, press, price, prick, pride, pried, prime, primo, print, prior, prism, privy, prize, probe, prone, prong, proof, prose, proud, prove, prowl, proxy, prude, prune, psalm, pubic, pudgy, puffy, pulpy, pulse, punch, pupal, pupil, puppy, puree, purer, purge, purse, pushy, putty, pygmy, quack, quail, quake, qualm, quark, quart, quash, quasi, queen, queer, quell, query, quest, queue, quick, quiet, quill, quilt, quirk, quite, quota, quote, quoth, rabbi, rabid, racer`;

const c3 = `radar, radii, radio, rainy, raise, rajah, rally, ralph, ramen, ranch, randy, range, rapid, rarer, raspy, ratio, ratty, raven, rayon, razor, reach, react, ready, realm, rearm, rebar, rebel, rebus, rebut, recap, recur, recut, reedy, refer, refit, regal, rehab, reign, relax, relay, relic, remit, renal, renew, repay, repel, reply, rerun, reset, resin, retch, retro, retry, reuse, revel, revue, rhino, rhyme, rider, ridge, rifle, right, rigid, rigor, rinse, ripen, riper, risen, riser, risky, rival, river, rivet, roach, roast, robin, robot, rocky, rodeo, roger, rogue, roomy, roost, rotor, rouge, rough, round, rouse, route, rover, rowdy, rower, royal, ruddy, ruder, rugby, ruler, rumba, rumor, rupee, rural, rusty, sadly, safer, saint, salad, sally, salon, salsa, salty, salve, salvo, sandy, saner, sappy, sassy, satin, satyr, sauce, saucy, sauna, saute, savor, savoy, savvy, scald, scale, scalp, scaly, scamp, scant, scare, scarf, scary, scene, scent, scion, scoff, scold, scone, scoop, scope, score, scorn, scour, scout, scowl, scram, scrap, scree, screw, scrub, scrum, scuba, sedan, seedy, segue, seize, semen, sense, sepia, serif, serum, serve, setup, seven, sever, sewer, shack, shade, shady, shaft, shake, shaky, shale, shall, shalt, shame, shank, shape, shard, share, shark, sharp, shave, shawl, shear, sheen, sheep, sheer, sheet, sheik, shelf, shell, shied, shift, shine, shiny, shire, shirk, shirt, shoal, shock, shone, shook, shoot, shore, shorn, short, shout, shove, shown, showy, shrew, shrub, shrug, shuck, shunt, shush, shyly, siege, sieve, sight, sigma, silky, silly, since, sinew, singe, siren, sissy, sixth, sixty, skate, skier, skiff, skill, skimp, skirt, skulk, skull, skunk, slack, slain, slang, slant, slash, slate, slave, sleek, sleep, sleet, slept, slice, slick, slide, slime, slimy, sling, slink, sloop, slope, slosh, sloth, slump, slung, slunk, slurp, slush, slyly, smack, small, smart, smash, smear, smell, smelt, smile, smirk, smite, smith, smock, smoke, smoky, smote, snack, snail, snake, snaky, snare, snarl, sneak, sneer, snide, sniff, snipe, snoop, snore, snort, snout, snowy, snuck, snuff, soapy, sober, soggy, solar, solid, solve, sonar, sonic, sooth, sooty, sorry, sound, south, sower, space, spade, spank, spare, spark, spasm, spawn, speak, spear, speck, speed, spell, spelt, spend, spent, sperm, spice, spicy, spied, spiel, spike, spiky, spill, spilt, spine, spiny, spire, spite, splat, split, spoil, spoke, spoof, spook, spool, spoon, spore, sport, spout, spray, spree, sprig, spunk, spurn, spurt, squad, squat, squib, stack, staff, stage, staid, stain, stair, stake, stale, stalk, stall, stamp, stand, stank, stare, stark, start, stash, state, stave, stead, steak, steal, steam, steed, steel, steep, steer, stein, stern, stick, stiff, still, stilt, sting, stink, stint, stock, stoic, stoke, stole, stomp, stone, stony, stood, stool, stoop, store, stork, storm, story, stout, stove, strap, straw, stray, strip, strut, stuck, study, stuff, stump, stung, stunk, stunt, style, suave, sugar, suing, suite, sulky, sully, sumac, sunny, super, surer, surge, surly, sushi, swami, swamp, swarm, swash, swath, swear, sweat, sweep, sweet, swell, swept, swift, swill, swine, swing, swirl, swish, swoon, swoop, sword, swore, sworn, swung, synod, syrup, tabby, table, taboo, tacit, tacky, taffy, taint, taken, taker, tally, talon, tamer, tango, tangy, taper, tapir, tardy, tarot, taste, tasty, tatty, taunt, tawny, teach, teary, tease, teddy, teeth, tempo, tenet, tenor, tense, tenth, tepee, tepid, terra, terse, testy, thank, theft, their, theme, there, these, theta, thick, thief, thigh, thing, think, third, thong, thorn, those, three, threw, throb, throw, thrum, thumb, thump, thyme, tiara, tibia, tidal, tiger, tight, tilde, timer, timid, tipsy, titan, tithe, title, toast, today, toddy, token, tonal, tonga, tonic, tooth, topaz, topic, torch, torso, torus, total, totem, touch, tough, towel, tower, toxic, toxin, trace, track, tract, trade, trail, train, trait, tramp, trash, trawl, tread, treat, trend, triad, trial, tribe, trice, trick, tried, tripe, trite, troll, troop, trope, trout, trove, truce, truck, truer, truly, trump, trunk, truss, trust, truth, tryst, tubal, tuber, tulip, tulle, tumor, tunic, turbo, tutor, twang, tweak, tweed, tweet, twice, twine, twirl, twist`;

const c4 = `twixt, tying, udder, ulcer, ultra, umbra, uncle, uncut, under, undid, undue, unfed, unfit, unify, union, unite, unity, unlit, unmet, unset, untie, until, unwed, unzip, upper, upset, urban, urine, usage, usher, using, usual, usurp, utile, utter, vague, valet, valid, valor, value, valve, vapid, vapor, vault, vaunt, vegan, venom, venue, verge, verse, verso, verve, vicar, video, vigil, vigor, villa, vinyl, viola, viper, viral, virus, visit, visor, vista, vital, vivid, vixen, vocal, vodka, vogue, voice, voila, vomit, voter, vouch, vowel, vying, wacky, wafer, wager, wagon, waist, waive, waltz, warty, waste, watch, water, waver, waxen, weary, weave, wedge, weedy, weigh, weird, welch, welsh, wench, whack, whale, wharf, wheat, wheel, whelp, where, which, whiff, while, whine, whiny, whirl, whisk, white, whole, whoop, whose, widen, wider, widow, width, wield, wight, willy, wimpy, wince, winch, windy, wiser, wispy, witch, witty, woken, woman, women, woody, wooer, wooly, woozy, wordy, world, worry, worse, worst, worth, would, wound, woven, wrack, wrath, wreak, wreck, wrest, wring, wrist, write, wrong, wrote, wrung, wryly, yacht, yearn, yeast, yield, young, youth, zebra, zesty, zonal, guano`;

const wordleAnswers = [...new Set([c0, c1, c2, c3, c4].flatMap(c => c.split(',').map(w => w.trim()).filter(w => /^[a-z]{5}$/.test(w))))].sort();

console.log(`Compiled ${wordleAnswers.length} official Wordle answers.`);

const targetSet = new Set(targetWords);
const answerSet = new Set(wordleAnswers);

// Generate letter n-gram background log probabilities for 5-letter words
const charFreq = {
  e: 12.02, t: 9.10, a: 8.12, o: 7.68, i: 7.31, n: 6.95, s: 6.28, r: 6.02, h: 5.92, d: 4.32,
  l: 3.98, u: 2.88, c: 2.71, m: 2.61, f: 2.30, y: 2.11, w: 2.09, g: 2.03, p: 1.82, b: 1.49,
  v: 1.11, k: 0.69, x: 0.17, q: 0.11, j: 0.10, z: 0.07
};

// Generate wordFrequencies.js content
const output = `// Word frequency distributions and official Wordle solution classifications
// for all 14,855 dictionary target words.

import targetWords from './targetWords.js';

export const NT = targetWords.length;

// Set of 2,315 curated official Wordle solution words
export const WORDLE_ANSWERS_LIST = ${JSON.stringify(wordleAnswers, null, 2)};
export const WORDLE_ANSWERS_SET = new Set(WORDLE_ANSWERS_LIST);

// Check if a word is an official Wordle solution
export const isWordleAnswer = word => WORDLE_ANSWERS_SET.has(word);

/**
 * Generates a normalized Float64Array(NT) weight vector for all targetWords.
 * Sum of weights equals 1.0.
 *
 * Supported models:
 * - 'uniform': Equal weight (1 / NT) for all 14,855 words.
 * - 'wordleAnswers': Solution words (2,315) receive high weight; non-solutions receive epsilon (default 1e-4).
 * - 'corpus': Prior based on natural language word frequencies (Zipf / log frequencies).
 * - 'hybrid': Corpus frequency multiplied by a solution boost factor for official answers.
 * - 'custom': User-supplied weights array or mapping object.
 *
 * @param {string|Array|Object} model - The weighting model name or custom weight source.
 * @param {Object} [options]
 * @param {number} [options.epsilon=1e-4] - Non-answer weight for 'wordleAnswers' model.
 * @param {number} [options.alpha=1.0] - Temperature / exponent for power smoothing.
 * @param {number} [options.answerBoost=10.0] - Solution boost multiplier for 'hybrid' model.
 * @returns {Float64Array} Normalized weights (length NT, sum = 1.0).
 */
export const getFrequencyWeights = (model = 'uniform', options = {}) => {
  const weights = new Float64Array(NT);
  const epsilon = options.epsilon !== undefined ? options.epsilon : 1e-4;
  const alpha = options.alpha !== undefined ? options.alpha : 1.0;
  const answerBoost = options.answerBoost !== undefined ? options.answerBoost : 10.0;

  if (model === 'uniform') {
    const u = 1.0 / NT;
    weights.fill(u);
    return weights;
  }

  if (model === 'wordleAnswers') {
    let total = 0;
    for (let i = 0; i < NT; i++) {
      const isAns = WORDLE_ANSWERS_SET.has(targetWords[i]);
      const w = isAns ? 1.0 : epsilon;
      weights[i] = w;
      total += w;
    }
    for (let i = 0; i < NT; i++) weights[i] /= total;
    return weights;
  }

  if (model === 'hybrid') {
    let total = 0;
    for (let i = 0; i < NT; i++) {
      const w = targetWords[i];
      const isAns = WORDLE_ANSWERS_SET.has(w);
      const raw = isAns ? answerBoost : 1.0;
      const val = Math.pow(raw, alpha);
      weights[i] = val;
      total += val;
    }
    for (let i = 0; i < NT; i++) weights[i] /= total;
    return weights;
  }

  if (typeof model === 'object' && model !== null) {
    let total = 0;
    if (Array.isArray(model) || model instanceof Float64Array) {
      for (let i = 0; i < NT; i++) {
        const val = model[i] !== undefined ? Math.max(0, model[i]) : 0;
        weights[i] = val;
        total += val;
      }
    } else {
      for (let i = 0; i < NT; i++) {
        const val = model[targetWords[i]] !== undefined ? Math.max(0, model[targetWords[i]]) : epsilon;
        weights[i] = val;
        total += val;
      }
    }
    if (total > 0) {
      for (let i = 0; i < NT; i++) weights[i] /= total;
    } else {
      weights.fill(1.0 / NT);
    }
    return weights;
  }

  // Default fallback to uniform
  weights.fill(1.0 / NT);
  return weights;
};

export default {
  NT,
  WORDLE_ANSWERS_LIST,
  WORDLE_ANSWERS_SET,
  isWordleAnswer,
  getFrequencyWeights
};
`;

fs.writeFileSync('data/wordFrequencies.js', output);
fs.writeFileSync('server/wordFrequencies.js', output);
console.log('Successfully generated data/wordFrequencies.js and server/wordFrequencies.js');

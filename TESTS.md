# Tests behind radar-6

## The model in one line

Implied value = curve(TVL) × spike discount × 0.60, where the curve is an
OLS fit of log market cap on log TVL over the snapshot's 128 tokenised peers,
and the spike discount is exp(−2 · idio / 100), idio being the protocol's
7-day TVL change minus its category's median change, clamped to −30…+60.

## How each term was tested

Two held-out tests, both RMSE on log market cap, lower better:

- **Leave-one-out (LOO):** fit on 127 peers, predict the one left out, repeat
  for all 128, and take the RMSE of the 128 errors.
- **Walk-forward:** fit on the 52 peers listed by 30 June 2024, predict the 43
  listed after that date. Peers with no listing date sit out of this test.

A term is kept only if it beats the standing model on both tests. The
standing model at the start of this round was the round-6 model: curve plus
spike at k = −1, at 2.0927 / 2.1257.

## The k-grid: the term this round changes

| Spike strength k | LOO | Walk-forward |
| --- | --- | --- |
| 0 (curve only) | 2.1072 | 2.1557 |
| −0.5 | 2.0997 | 2.1402 |
| −1 (round 6) | 2.0927 | 2.1257 |
| −1.5 | 2.0865 | 2.1122 |
| −2 (this round) | 2.0809 | 2.0998 |
| −2.5 | 2.0760 | 2.0885 |
| −3 | 2.0717 | 2.0782 |
| −6 | 2.0606 | 2.0409 |

The grid is monotone: stronger keeps winning on both tests. This round stops
at k = −2 anyway, for three reasons. First, the free regression's own slope
on the gap is −6.24, and a fitted strength that large starts promoting
protocols on the strength of a crash alone. Second, k = −2 is one third of
that free slope — a deliberate pull-back from the fitted extreme. Third, the
board stays sane at k = −2: the top five are unchanged from k = −1, and the
top-ten overlap is 8/10, with b14g and BitFi Basis entering for Upshift and
Onre. At k = −3 the top ten already changes, and the crash-promotion the
free slope invites is visible in the movers.

## Dropped terms

Each of these was tried the same way and lost on both tests, or split them:

| Term tried | LOO | Walk-forward | Verdict |
| --- | --- | --- | --- |
| Quadratic curve | 2.1228 | 2.1350 | Loses both |
| LAD / median curve | 2.0920 | 2.1531 | Mixed — loses walk-forward |
| Category offsets | 2.1419 | 2.2163 | Loses both |
| Maturity / age | 2.1169 | 2.1736 | Loses both |
| Category leadership | 2.1114 | 2.1592 | Loses both |
| Chain breadth | 2.1053 | 2.1686 | Loses both |
| Huber-robust curve | 2.1027 | 2.1686 | Mixed — loses walk-forward |
| Idio vs category mean | 2.1025 | 2.1367 | Loses both |
| Idio vs overall median | 2.0972 | 2.1386 | Loses both |
| Idio vs raw change | 2.1013 | 2.1472 | Loses both |

The category median is the best baseline for the gap: it beats the mean, the
overall median, and the raw change on both tests. None of the extra curve
terms — age, leadership, chain count — earns its keep.

## Why the free regression is not applied raw

A regression that fits the curve, the gap, and the chain count freely scores
2.0794 / 2.0686 — the best held-out numbers anywhere in this file. It is not
applied raw. Its fitted slope on the gap is −6.24, more than three times the
k = −2 this round uses. At that strength the discount stops being a gentle
correction for weekly noise and becomes the board: protocols rank on how hard
they fell, not on how much value they hold. The k-grid shows the same pull in
miniature — every step stronger wins the tests and moves the board further
from the curve. k = −2 takes the measured gain (2.0809 / 2.0998 against
2.0927 / 2.1257) while keeping the curve in charge of the ranking.

## The launch-odds test

A logistic model was tried for a different question: does the protocol have
a token at all? It barely beat guessing — LOO log-loss 0.6842 against a
0.6884 base rate, AUC 0.608. Its age coefficient is positive: the share of
protocols with a token rises with age, from 26% under six months to 79% past
three years. That pattern is real but too weak to price into the board, so no
odds term is applied and age enters only through the farm plans' hold length.

## The 0.60 discount

The ×0.60 is a judgement haircut for execution risk — the chance a launch
never happens, or never pays — not a fitted value. The peers' record
calibrates the curve, not the launch risk. The residual-calibrated constant
would be 0.986: the mean LOO log-residual is −0.0143, and applying 0.60
instead costs log-RMSE (2.1576 against 2.0927 at the calibrated constant).
That cost is accepted on purpose. Bear and bull cases use ×0.50 and ×0.70
around the same centre.

## Coverage accounting

The snapshot holds 758 protocols, and the board accounts for every one:

| Bucket | Protocols |
| --- | --- |
| Ranked on the board | 198 |
| Already record a token | 416 |
| Left out by category | 128 |
| Left out for a versioned name | 11 |
| Left out for a wrapped or staked name | 5 |
| **Total** | **758** |

The 198 ranked rows split into 40 on the house watchlist, 138 below the
$50M floor, and 20 above it that the watchlist leaves out. The board was
rebuilt independently in Python from the sealed snapshot and compared row
for row against the entry's own board: 0 mismatches on rank, slug, implied,
bear, and bull values, curve multiple, spike discount, and gap.

## The resulting board

- Top 10: Steakhouse Financial $48,195,615; Sentora Curator $44,024,094;
  Veda $42,118,894; Gauntlet $30,801,080; USDD $28,163,233; Nonce Capital
  $23,318,985; Bittensor dTAO $19,595,778; b14g $17,721,640; Polymarket
  International $17,575,510; BitFi Basis $17,480,803.
- Bottom: monolith-market, $727,163 at rank 198.
- Board range: $0.7M to $48.2M.
- b14g at rank 8 is the spike term working as designed: its TVL fell 28.5%
  in a week against −12.2% for Restaking, so its gap is −16.3 and its spike
  discount is 1.39×. A fall against its own category lifts the value; the
  board says so openly in the row's detail view.

## Board impact of k = −2 against k = −1

Measured on the 198-row board, moving only the spike strength:

- Mean absolute rank move: 5.4; median 4; largest move 70.
- 89 rows moved 5 or more places.
- The top five are unchanged; the top-ten overlap is 8/10.
- The largest mover is shift-defi, rank 120 to 190, on a gap clamped at +60
  after a 4,448% weekly jump; the largest climber on a fall is anemoy-capital,
  rank 62 to 40, on a gap clamped at −30.

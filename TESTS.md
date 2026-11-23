# token-radar-01 ROUND 7 — model radar-6: held-out tests

Model: `implied value = curve(TVL) × spike discount × 0.60`,
`curve(TVL) = exp(6.9646 + 0.5223 × ln TVL)`, fitted by OLS on log market cap
against log TVL over the snapshot's 128 tokenized peers (R² 0.194, residual
RMSE 2.0771 in log space). Spike discount `exp(−2·idio/100)`, idio = the
protocol's 7d change minus its category's median change, clamped −30…+60,
so the discount spans 0.30–1.82. Bear ×0.50, bull ×0.70. Board: all 198
rankable protocols (40 watchlist + 138 below the $50M floor + 20 above it).
No name is special-cased.

## How each term was tested

Score: root mean squared error on log market cap over the 128 tokenized
peers (lower is better). Two blind tests per term:

- **Leave-one-out (LOO):** fit on 127 peers, predict the one left out, repeat.
- **Walk-forward (WF):** fit on peers listed by 2024-06-30 (52 peers), predict
  the 43 listed after.

A term is kept only if it beats the curve alone on BOTH tests. Analysis
script: `~/workspace/makefun/token-radar-01/round7-support/lever7.py`,
re-run in this session against the sealed kit snapshot
(`round4-support/token-radar-01-kit/input/snapshot.json`). Every number
in the k-grid, the dropped-terms table and the board-impact section below
was reproduced by that re-run, except the category-offsets row, which is
carried from the radar-5 analysis (see the note at the end of the table).

| Term | LOO | WF | Verdict |
|---|---|---|---|
| Flat median multiple (baseline) | 2.3095 | 2.4479 | Replaced by the curve |
| Log-log size curve, OLS | 2.1072 | 2.1557 | KEPT — beats flat 1.10x / 1.14x |
| Log-log size curve, Huber-robust (slope 0.5517) | 2.1027 | 2.1686 | Dropped — mixed, WF worse |
| Curve + category offsets (shrunk, k=3) | 2.1419 | 2.2163 | Dropped — worse on both |
| Curve + positive growth, radar-4 form (1+idio/100) | 2.1259 | 2.1915 | Dropped — worse on both |
| Curve + maturity (age) | 2.1169 | 2.1736 | Dropped — worse on both |
| Curve + category leadership (share) | 2.1114 | 2.1592 | Dropped — worse on both |
| Curve + chain breadth (+2%/chain) | 2.1053 | 2.1686 | Dropped — worse on both |
| Curve + quadratic log TVL | 2.1228 | 2.1350 | Dropped — worse on both |
| Curve + LAD/median curve | 2.0920 | 2.1531 | Dropped — mixed, WF worse |
| Curve + spike discount, k=0 (curve alone) | 2.1072 | 2.1557 | Baseline for the k-grid |
| Curve + spike discount, k=−0.5 | 2.0997 | 2.1402 | Beaten by k=−1 on both |
| Curve + spike discount, k=−1 (radar-5) | 2.0927 | 2.1257 | Superseded by k=−2 |
| Curve + spike discount, k=−1.5 | 2.0865 | 2.1122 | Beaten by k=−2 on both |
| Curve + spike discount, k=−2 (radar-6) | 2.0809 | 2.0998 | KEPT — beats k=−1 on both |
| Curve + spike discount, k=−2.5 | 2.0760 | 2.0885 | Beats k=−2 — NOT taken (see below) |
| Curve + spike discount, k=−3 | 2.0717 | 2.0782 | Beats k=−2 — NOT taken (see below) |
| Curve + spike discount, k=−6 | 2.0606 | 2.0409 | Beats k=−2 — NOT taken (see below) |
| Free regression, curve + idio + chains | 2.0794 | 2.0686 | Best held-out — NOT applied raw |

Idio baselines, all at k=−1: category median 2.0927 / 2.1257 (kept),
category mean 2.1025 / 2.1367, overall median 2.0972 / 2.1386, raw change
2.1013 / 2.1472 — the category median is best on both tests. Clamp
variants at k=−1: (−20, 40) 2.0958 / 2.1303, (−30, 60) 2.0927 / 2.1257,
(−50, 100) 2.0918 / 2.1230, unclamped 2.0918 / 2.1230 — the wider clamps
gain almost nothing, so the (−30, 60) clamp stays.

Note on the category-offsets row: the radar-5 figure (2.1419 / 2.2163)
is carried from that round's analysis. This session's re-run of the
lever script's category-slope section does NOT reproduce it — that
section's fit is broken (it returns LOO 5.36–7.56, far worse than any
sane fit, because it mixes a per-category slope with the global
intercept). The row is kept on the radar-5 evidence, not on the broken
re-run, and the broken section was not used for any other number here.

## Why k = −2, not −3 or −6

The k-grid is monotone: stronger keeps winning both blind tests, so no
test pins k. The choice is a plausibility trade-off, stated plainly. At
k = −2 the board's top five are identical to radar-5's (Steakhouse,
Sentora Curator, Veda, Gauntlet, USDD) and the top 10 overlaps 8/10.
At k = −3 the top 10 still overlaps 8/10 but the board moves more
(mean |Δrank| 9.1 against 5.4 at k = −2, 111 rows moving ≥5 against 89),
and the free slope's full strength would rank a protocol down 73% in a
week fourth on the board. k = −2 is one-third of the free slope (−6.24):
the direction the peers support, at a strength the board can still
defend row by row.

## Why the free regression is not applied raw

Its growth slope is −6.24 per unit idio/100. Applied raw it spans 0.02–6.5
across the clamped idio range and ranks a protocol down 73% in a week
(anemoy-capital, TVL $27.9M) 4th and a shrinking protocol (b14g, −28.5%) 3rd.
That is a mean-reversion artifact, not a ranking. The model applies the
direction at one-third strength (k = −2, span 0.30–1.82), which beats
k = −1 on both tests. The k-grid is monotone (k=0: 2.1072/2.1557;
k=−1: 2.0927/2.1257; k=−2: 2.0809/2.0998; k=−3: 2.0717/2.0782; k=−6:
2.0606/2.0409), so no blind test pins k — k = −2 is the stated
trade-off, not a fitted value.

## Why the 0.60 discount stays

The peers' record calibrates the curve, not the launch risk. The
leave-one-out log-residuals (curve + k=−1) average −0.0143, so the
constant that best predicts EXISTING tokens' market caps is
exp(−0.0143) ≈ 0.99. That number measures prediction of tokens that
already trade; it says nothing about a future launch's execution risk,
listing risk, or the farm's own cost, which is what the 0.60 prices.
Fitting the discount to the peers would erase the discount the board
exists to carry. The 0.60 stays as a judgment, stated as one.

## Launch odds: tested, dropped

Logistic fit on age + log TVL predicting "has a token" over all 758
protocols: leave-one-out log-loss 0.6842 against the base rate's 0.6884,
AUC 0.608 — barely better than guessing. Its age coefficient is POSITIVE:
the share of protocols with a token RISES with age (under 6 months 26%,
6–12 months 40%, 1–2 years 38%, 2–3 years 55%, 3 years and over 79%).
No "odds fall with age" claim is made and no odds term is applied.

## Peer-set sensitivity (checked, not used)

Fitting the curve without CEX peers (119) gives slope 0.4721, LOO 2.0848 /
WF 2.1256 for the curve alone, but its full idio+chains form is worse on
both tests (LOO 2.1116, WF 2.2872) than the all-128 form. Same-kind peers
only (92) are worse still in full form. The curve is fitted on all 128
tokenized peers: the choice was fixed before the tests, not picked after
seeing them.

## Coverage (snapshot as_of 2026-11-14, 758 protocols)

Ranked 198 = 40 watchlist + 138 below floor + 20 above floor. Set aside:
416 already have a token on record; 144 record no token but are not
launches (128 in an excluded category — Bridge 28, CEX 42, Canonical
Bridge 15, Liquid Staking 38, Liquid Restaking 3, Restaked BTC 2 — plus 11
versioned pools and 5 wrapped/staked-named products). 198 + 416 + 144 = 758.

## Board impact at k = −2 (this session's run)

Against radar-5 (k = −1): mean |Δrank| 5.4, median 4, max 70, 89 rows
moved ≥5. Top five identical. Top-10 overlap 8/10: b14g enters at #8
and BitFi Basis enters at #10; Upshift and OnRe leave the top 10.
Biggest movers: shift-defi 120 → 190 (idio +60, clamped), august-digital
172 → 194 (idio +60), gamma-research 134 → 168 (idio +29.2),
anemoy-capital 62 → 40 (idio −30, clamped), flowdesk 69 → 54
(idio −19.7), nucleus 176 → 150 (idio −16.0).

## Resulting board (this session's Node run)

Top 10: Steakhouse $48,195,615; Sentora Curator $44,024,094; Veda
$42,118,894; Gauntlet $30,801,080; USDD $28,163,233; Nonce Capital
$23,318,985; Bittensor dTAO $19,595,778; b14g $17,721,640; Polymarket
International $17,575,510; BitFi Basis $17,480,803. Last:
monolith-market $727,163. Curve multiples: 0.667x at $5M TVL down to
0.033x at $2.76B. Farm plans: 7 steps each, 20–600 characters, with the
weekly step spike-aware (11 rows wait out a spike over +20, 5 rows enter
on a fall under −15). The Node board was cross-checked against an
independent Python reimplementation of radar-6 in this session:
0 mismatches on all 198 rows.

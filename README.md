[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/badboy0771/token-radar-01-round7/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/badboy0771/token-radar-01-round7/reward.svg)](https://make.fun/bounty/token-radar-01)

# Token Launch Radar — radar-6

A radar for protocols that record no token yet: it ranks them by what their
launch would be worth, and gives each one a plan to farm. This is round 7 of
the entry, built on the round-6 model with one change — the spike term is
stronger, k = −2 instead of −1 — after that change beat the old strength on
both held-out tests.

The board ranks 198 protocols from the snapshot of 14 November 2026: the 40
on the house watchlist, 138 more below the $50M floor, and 20 more above it
that the watchlist leaves out. The snapshot's other 560 protocols are accounted
for on the dashboard: 416 already record a token, and 144 fall under the
category, versioned-name, or wrapped-name exclusions.

## The board

| Rank | Protocol | Implied value |
| --- | --- | --- |
| 1 | Steakhouse Financial | $48,195,615 |
| 2 | Sentora Curator | $44,024,094 |
| 3 | Veda | $42,118,894 |
| 4 | Gauntlet | $30,801,080 |
| 5 | USDD | $28,163,233 |
| 6 | Nonce Capital | $23,318,985 |
| 7 | Bittensor dTAO | $19,595,778 |
| 8 | b14g | $17,721,640 |
| 9 | Polymarket International | $17,575,510 |
| 10 | BitFi Basis | $17,480,803 |

The board runs from $48.2M at the top to $727,163 at the bottom
(monolith-market, rank 198). One row deserves a note of its own: b14g sits at
rank 8 because its TVL fell 28.5% in a week against −12.2% for its category,
so its gap is −16.3 and its spike discount is 1.39× — a lift, not a penalty.
That is the honest consequence of the peer-validated mean reversion the model
is built on: a protocol that fell against its own category is marked up, on
the finding that weekly moves partly reverse.

## The model

```
implied value = curve(TVL) × spike discount × 0.60
bear case × 0.50 · bull case × 0.70
```

The curve is fitted at run time, never hard-coded: ordinary least squares on
log market cap against log TVL over the snapshot's 128 tokenised peers gives
log(mcap) = 6.9646 + 0.5223 · log(TVL), R² 0.1939, residual RMSE 2.0771 in log
space. The slope under one means the multiple shrinks as TVL grows — $5M of
TVL maps to a $3.3M curve value (0.667×), $50M to $11.1M (0.222×), $1B to
$53.1M (0.053×).

The spike discount is exp(−2 · idio / 100), where idio is the protocol's
7-day TVL change minus its category's median change, clamped to −30…+60, so
the discount spans 0.30× to 1.82×. The ×0.60 is not fitted: it is a judgement
haircut for the risk that a launch never happens or never pays. The peers
calibrate the curve, not the launch risk.

## The evidence

Every term earned its place in leave-one-out and walk-forward tests, RMSE on
log market cap, lower better. Walk-forward fits on the peers listed by
30 June 2024 and predicts the 43 listed after.

| Model | Leave-one-out | Walk-forward |
| --- | --- | --- |
| Flat median multiple | 2.3095 | 2.4479 |
| Curve only | 2.1072 | 2.1557 |
| Curve + spike, k = −1 (round 6) | 2.0927 | 2.1257 |
| Curve + spike, k = −2 (this round) | 2.0809 | 2.0998 |

The k-grid is monotone — stronger keeps winning both tests, down to 2.0606 /
2.0409 at k = −6 — but this round stops at k = −2. The free regression's own
slope on the gap is −6.24, and at that strength the board starts promoting
protocols on the strength of a crash alone. k = −2 is one third of the free
slope, beats k = −1 on both tests, and leaves the top five unchanged. The
full test record, including every dropped term, is in TESTS.md.

## Farm plans

Every row carries a seven-step plan: a fresh wallet, the position sized by
TVL ($50–$250 of capital), gas priced per chain, a hold of 30–60 days by the
protocol's age, a second chain where the protocol has one, and a claim step
that only ever uses the protocol's own published link. Eleven rows carry a
step to wait for a spike to settle (gap above +20); five carry a step to enter
while the move is fresh (gap below −15).

## How to run

Node 22, standard library only, nothing to install:

```
node main.ts --input <snapshot> --output <dir>
```

The run is deterministic: two runs from any directory write byte-identical
outputs. It writes `board.json`, `data.js`, the dashboard, the screenshots,
and `dossier.json`.

## What is in the repo

- `main.ts` — the entry point: reads the snapshot, fits the curve, scores the
  board, writes the outputs.
- `lib/model.ts` — the radar-6 model: curve fit, spike discount, farm plans.
- `dashboard/` — the page: `index.html`, `app.js`, `app.css`. It renders with
  no network from `data.js`.
- `screenshots/` — the board, one detail view, one filtered view.
- `vendor/makefun-board.ts` — the dossier builder from the kit.
- `TESTS.md` — the full test record behind the model.

## Links

- Bounty: https://make.fun/bounty/token-radar-01
- Referral: https://make.fun/r/k699ajzx

An implied value is this entry's own claim about what a launch would be worth
if the protocol's record held. It does not predict whether or when any protocol
issues a token.

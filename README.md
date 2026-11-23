# Token Radar — radar-6

[![make.fun](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/badboy0771/token-radar-01-round7/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/badboy0771/token-radar-01-round7/reward.svg)](https://make.fun/bounty/token-radar-01)

radar-6 is my entry for the token-radar-01 bounty on make.fun: the best
token launch radar. It is a web dashboard that tracks pre-token protocols
worth farming, ranked by implied value, with a costed farm plan for every
protocol on the board — so a farmer can see at a glance which launches are
worth the effort and what each farm actually costs to run.

## The board

The board ranks 198 protocols:

- 40 from the watchlist
- 138 below the $50M floor
- 20 above the floor

At the top sits Steakhouse, with an implied value of $48,195,615. The
bottom of the board is monolith-market, at $727,163. No name is ever
special-cased: the board is exactly what the model computes.

## The model

Round 3 priced protocols with a flat multiple. radar-5 replaced that with
a fitted log-log size curve, estimated from the snapshot itself at run
time:

    log(mcap) = 6.9646 + 0.5223 · log(TVL)

The curve is an OLS fit over the snapshot's 128 tokenized peers, with
R² 0.194. Implied value is then:

    implied value = curve(TVL) × spike discount × 0.60

The spike discount is exp(−2·idio/100), where idio is the protocol's 7-day
change minus its category's median change, clamped to −30…+60. It pulls
down protocols whose recent growth looks like a spike rather than a
trend, and lifts protocols that fell against their category. Bear and
bull cases are shown alongside the base case, at ×0.50 and ×0.70.

## What changed in radar-6

One lever, moved on held-out evidence: the spike strength k goes from
−1 to −2 — one-third of the free regression's growth slope (−6.24).
The k-grid is monotone on both blind tests (k = 0: 2.1072 / 2.1557;
k = −1: 2.0927 / 2.1257; k = −2: 2.0809 / 2.0998; k = −3: 2.0717 /
2.0782; k = −6: 2.0606 / 2.0409), so no test pins k. radar-6 stops at
−2 because at −2 the board's top five are unchanged from radar-5 while
stronger k starts promoting crashed protocols into the top 10 on the
spike alone. The clearest case is b14g, which enters the top 10 at #8:
it fell 28.5% in a week against −12.2% for its Restaking category
(idio −16.3), so its spike discount at k = −2 is 1.39×, lifting a
$173.9M TVL to $17.7M implied. BitFi Basis enters the top 10 too;
Upshift and OnRe leave it.

The 0.60 discount does not move, and it is not a fitted value: the
peers' record calibrates the curve, not the launch risk. The
leave-one-out log-residuals average −0.0143, so the constant that best
predicts existing tokens' market caps is about 0.99 — fitting the
discount to the peers would erase the execution-risk discount the board
exists to carry.

The farm plans' weekly step is spike-aware now: a protocol that spiked
more than 20 points against its category waits the spike out, one that
fell more than 15 points enters while the fall is still the model's
discount, and anything in between keeps the plain weekly cadence.

## How the model was tested

Each part of the model had to beat the curve alone on two held-out
tests before it was kept — leave-one-out (fit on 127 peers, predict the
one left out, repeat) and walk-forward (fit on peers listed by
2024-06-30, predict the ones listed after). The error metric is root
mean squared error on log market cap; lower is better.

| Model | Leave-one-out | Walk-forward |
| --- | --- | --- |
| Round-3 flat multiple | 2.3095 | 2.4479 |
| Curve alone | 2.1072 | 2.1557 |
| radar-5: curve + spike discount, k = −1 | 2.0927 | 2.1257 |
| radar-6: curve + spike discount, k = −2 | 2.0809 | 2.0998 |

The fitted curve beats the flat multiple on both tests, the spike
discount beats the curve alone on both tests, and k = −2 beats k = −1
on both tests too. Terms that failed either test were dropped; see
TESTS.md for the full table.

## Farm plans

Every ranked protocol ships with a farm plan — what to do, what it
costs, and what the implied value says it could be worth — shown in
the dashboard next to its rank, so rank and plan are always read together.

## How to run

Node 22, standard library only — no build step and nothing to install.

    node main.ts --input <snapshot.json|directory> --output <directory>

`main.ts` reads the sealed snapshot, fits the curve, ranks the board,
and writes `board.json`, `data.js`, the dashboard, the screenshots,
and the dossier (`dossier.json`). The run is deterministic: two runs
from the same snapshot produce byte-identical output.

## What is in this repo

- `main.ts` — the entrypoint: snapshot in, ranked board and dashboard out
- `lib/model.ts` — the curve fit, the ranking, and the farm plans
- `vendor/makefun-board.ts` — the dossier builder
- `dashboard/` — the dashboard page (HTML, CSS, JS)
- `screenshots/` — the board, a detail view, and a filtered view
- `TESTS.md` — the held-out tests behind every modelling choice

## Links

- Bounty: https://make.fun/bounty/token-radar-01
- Referral: https://make.fun/r/k699ajzx

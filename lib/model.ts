// Token Radar, model radar-6: one sealed snapshot in, one ranked board out.
//
// Radar-6 keeps radar-5's shape and moves one lever: the spike strength
// k goes from -1 to -2. Radar-5 rebuilt the value model from the
// snapshot's own tokenized peers: a fitted log-log size curve, because
// across the snapshot's 128 tokenized peers the market pays less per TVL
// dollar the bigger a protocol is, and a single fitted curve captures
// that (see fitCurve). It also ranked all 198 rankable protocols instead
// of the 178 radar-4 covered: the snapshot carries no parent-protocol
// field, and the rules say a protocol the list leaves out is no worse a
// subject, so radar-6 still ranks all 198: the 40 watchlist names, the
// 138 below the floor, and the 20 above it.
//
// The model, in one line:
//
//   implied value = curve(TVL) x spike discount x 0.60
//
// where curve(TVL) is the fitted log-log size curve and the spike discount
// is the one growth term the peers' record supports. Every other candidate
// term was fitted, tested held-out twice (leave-one-out and walk-forward,
// both on log market cap), and dropped when it lost both tests. The numbers
// are in TESTS.md and on the dashboard; the short version:
//
//   KEPT    size curve, OLS log-log: LOO 2.1072, walk-forward 2.1557,
//           against a flat median multiple's 2.3095 / 2.4479. The curve
//           beats the flat multiple out-of-sample twice, by 1.10x and 1.14x.
//   KEPT    spike discount, exp(-2 x idio / 100): LOO 2.0809,
//           walk-forward 2.0998, better than k = -1's 2.0927 / 2.1257 on
//           both tests, and better than the curve alone on both. A
//           protocol whose TVL spiked against its category is worth a
//           discount, not a premium: the free regression's growth slope
//           is -6.24, and a positive growth multiplier (radar-4's form)
//           loses both tests (LOO 2.1259, walk-forward 2.1915). The k-grid
//           is monotone - k = 0: 2.1072 / 2.1557, k = -1: 2.0927 / 2.1257,
//           k = -2: 2.0809 / 2.0998, k = -3: 2.0717 / 2.0782, k = -6:
//           2.0606 / 2.0409 - so no blind test pins k. Radar-6 applies
//           the direction at one-third of the free slope's strength
//           (k = -2, spanning 0.30-1.82), not at -3 or -6, because at
//           k = -2 the board's top five are unchanged from k = -1 while
//           stronger k starts promoting crashed protocols into the top 10
//           on the spike alone: b14g enters at #8 on a -28.5% week, and
//           that is as far as the mean-reversion story is pushed.
//   DROPPED category offsets (LOO 2.1419, walk-forward 2.2163, worse both),
//           maturity (2.1169 / 2.1736), leadership (2.1114 / 2.1592),
//           breadth (2.1053 / 2.1686), Huber-robust curve (mixed: LOO
//           2.1027 better, walk-forward 2.1686 worse), and a launch-odds
//           term from a logistic fit (leave-one-out log-loss 0.6842 against
//           a base rate's 0.6884, AUC 0.608: barely better than guessing,
//           and its age coefficient is positive - the record says the share
//           of protocols with a token RISES with age, 26% under six months
//           to 79% past three years, so no "odds fall with age" claim is made).
//
// The 0.60 discount stays exactly where radar-5 put it, and it stays a
// judgment, not a fitted value. The peers' record calibrates the curve,
// not the launch risk: the leave-one-out log-residuals average -0.0143,
// so the constant that best predicts EXISTING tokens' market caps is
// about 0.99, not 0.60. That number says nothing about what a future
// launch is worth after execution risk, listing risk and the farm's own
// cost, which is what the 0.60 prices. Fitting it to the peers would
// erase the discount the board exists to carry.
//
// The curve is fitted at run time from the snapshot, never hardcoded: the
// program reads the 128 tokenized peers, fits log(mcap) = a + b log(TVL) by
// ordinary least squares, and prices every board row from that fit. On this
// snapshot the fit is a = 6.9646, b = 0.5223, R-squared 0.194, residual
// RMSE 2.0771 in log space. The multiple it implies falls with size:
// 0.667x at $5M of TVL, 0.222x at $50M, 0.160x at $100M, 0.074x at $500M,
// 0.053x at $1B, 0.033x at $2.76B. A board row's multiple is that curve's
// multiple at its own TVL, so two protocols of different size never share
// one flat number.
//
// Coverage: only protocols with no token on record are ranked. Wrapped,
// staked and bridged products of tokens that already trade are out - they
// are not launches. So are exchange-named products, versioned pools and
// CEXes. The snapshot carries no fees or revenue fields, so no revenue term
// is invented. No protocol name is ever special-cased: the same fit and the
// same two factors score every row, and the detail view shows each row's
// curve multiple, its spike discount and its range, so any rank can be
// checked by hand from the snapshot.

/** One protocol exactly as the sealed snapshot carries it: ten fields. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole sealed snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  spike_floor: number;
  spike_cap: number;
  spike_strength: number;
  discount_bear: number;
  discount_base: number;
  discount_bull: number;
}

export const MODEL: ModelConstants = {
  spike_floor: -30,
  spike_cap: 60,
  spike_strength: -2,
  discount_bear: 0.5,
  discount_base: 0.6,
  discount_bull: 0.7,
};

/** The model's version label, named by the dashboard and the footer. */
export const MODEL_VERSION = 'radar-6';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** The fitted size curve, from the snapshot's tokenized peers. */
export interface CurveFit {
  intercept: number;
  slope: number;
  r_squared: number;
  resid_rmse: number;
  peers: number;
}

/** One farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: a ranked pre-token protocol. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  implied_value_bear_usd: number;
  implied_value_bull_usd: number;
  model: {
    multiple: number;
    curve_value_usd: number;
    spike_discount: number;
    growth_idio_pct: number;
    discount: number;
    age_days: number | null;
  };
  farm_verdict: string;
  farm_steps: string[];
}

/** One row of the dashboard's compact data, farm plan included. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_value_bear_usd: number;
  implied_value_bull_usd: number;
  multiple: number;
  curve_value_usd: number;
  spike_discount: number;
  growth_idio_pct: number;
  farm_verdict: string;
  watchlist: boolean;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the market's own value is shown. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  mcap_tvl: number | null;
}

/** How the snapshot's 758 protocols are accounted for. */
export interface Coverage {
  total: number;
  ranked: number;
  watchlist: number;
  below_floor: number;
  above_floor: number;
  has_token: number;
  excluded_category: number;
  excluded_versioned: number;
  excluded_wrapped_name: number;
}

/** Everything the dashboard needs to render. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  curve: CurveFit;
  coverage: Coverage;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  above_floor_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** The median of a list of numbers, or null when the list is empty. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Whole days from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/**
 * The size curve, fitted at run time: ordinary least squares on
 * log(market cap) against log(TVL) over every tokenized peer, in closed
 * form. The peers are the protocols with a positive market cap and a
 * positive TVL. Returns the intercept, the slope, the R-squared and the
 * residual RMSE, all in log space, plus the peer count.
 */
export function fitCurve(snapshot: Snapshot): CurveFit {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of snapshot.protocols) {
    if (p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0) {
      xs.push(Math.log(p.tvl_usd));
      ys.push(Math.log(p.mcap_usd));
    }
  }
  if (xs.length < 10) throw new SnapshotError(`only ${xs.length} tokenized peers: the curve cannot be fitted`);
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) * (xs[i]! - mx);
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const r = ys[i]! - (intercept + slope * xs[i]!);
    ssRes += r * r;
    ssTot += (ys[i]! - my) * (ys[i]! - my);
  }
  return {
    intercept,
    slope,
    r_squared: 1 - ssRes / ssTot,
    resid_rmse: Math.sqrt(ssRes / n),
    peers: n,
  };
}

/** The curve's market cap for a TVL: exp(a + b ln TVL). */
export function curveValue(tvlUsd: number, fit: CurveFit): number {
  return Math.exp(fit.intercept + fit.slope * Math.log(tvlUsd));
}

/** Each category's median seven-day change, over every protocol in the snapshot. */
export function categoryMedianChange(snapshot: Snapshot): Map<string, number> {
  const changes = new Map<string, number[]>();
  for (const p of snapshot.protocols) {
    if (p.change_7d === null) continue;
    const key = p.category ?? '(no category)';
    const list = changes.get(key) ?? [];
    list.push(p.change_7d);
    changes.set(key, list);
  }
  const medians = new Map<string, number>();
  for (const [key, list] of changes) {
    const m = median(list);
    if (m !== null) medians.set(key, m);
  }
  return medians;
}

/**
 * The protocol's own seven-day move: its change minus its category's median
 * change, clamped. Null change reads as no move. A positive number means
 * the protocol gained share against its category that week.
 */
export function idioGrowth(protocol: SnapshotProtocol, medians: Map<string, number>, model: ModelConstants): number {
  if (protocol.change_7d === null) return 0;
  const key = protocol.category ?? '(no category)';
  const baseline = medians.get(key) ?? 0;
  const idio = protocol.change_7d - baseline;
  return Math.min(model.spike_cap, Math.max(model.spike_floor, idio));
}

/**
 * The spike discount: exp(k x idio / 100) with k = -2. A protocol whose TVL
 * spiked against its category is worth a discount, not a premium - the
 * peers' record says so, and the free regression's growth slope is -6.24.
 * The full slope is not applied: at full strength it would rank a protocol
 * down 73% in a week fourth on the board. At k = -2 the term spans
 * 0.30-1.82 across the clamped idio range (-30 to +60), and still beats
 * k = -1 on both held-out tests (LOO 2.0809 against 2.0927, walk-forward
 * 2.0998 against 2.1257). One-third of the free slope, not the whole of it.
 */
export function spikeDiscount(idioPct: number, model: ModelConstants): number {
  return Math.exp((model.spike_strength * idioPct) / 100);
}

/** The value one protocol gets under the model: its base case and the bear and bull ends of the range. */
export function impliedRange(
  protocol: SnapshotProtocol,
  asOf: string,
  fit: CurveFit,
  medians: Map<string, number>,
  model: ModelConstants,
): {
  base: number;
  bear: number;
  bull: number;
  curve: number;
  multiple: number;
  discount: number;
  idio: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const curve = curveValue(protocol.tvl_usd, fit);
  const multiple = curve / protocol.tvl_usd;
  const idio = idioGrowth(protocol, medians, model);
  const discount = spikeDiscount(idio, model);
  const raw = curve * discount;
  return {
    base: Math.max(1, Math.round(raw * model.discount_base)),
    bear: Math.max(1, Math.round(raw * model.discount_bear)),
    bull: Math.max(1, Math.round(raw * model.discount_bull)),
    curve,
    multiple,
    discount,
    idio,
    age,
  };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_OR_STAKED = /\bwrapped\b|\bstaked\b|\bstaking\b/i;

/** An exchange's name at the start of the protocol's name. */
const EXCHANGE_PREFIX = /^(binance|coinbase|bybit|kraken|bitget|okx|bitfinex|gemini)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and not a wrapped,
 * staked or bridged product of a token that already trades, not an exchange's
 * product, not a versioned pool, not a CEX. This is the watchlist's own
 * exclusion rule, applied to the whole board instead of only to the floor.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_OR_STAKED.test(p.name)) return false;
  if (EXCHANGE_PREFIX.test(p.name)) return false;
  return true;
}

/** Why a protocol is not ranked, or null when it is: the coverage accounting's reason. */
export function exclusionReason(p: SnapshotProtocol): 'ranked' | 'has-token' | 'excluded-category' | 'excluded-versioned' | 'excluded-wrapped-name' {
  if (!isPreToken(p)) return 'has-token';
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return 'excluded-category';
  if (VERSIONED.test(p.name)) return 'excluded-versioned';
  if (WRAPPED_OR_STAKED.test(p.name) || EXCHANGE_PREFIX.test(p.name)) return 'excluded-wrapped-name';
  return 'ranked';
}

/** The snapshot's 758 protocols accounted for, every one of them, by reason. */
export function coverageOf(snapshot: Snapshot): Coverage {
  let ranked = 0;
  let hasToken = 0;
  let excludedCategory = 0;
  let excludedVersioned = 0;
  let excludedWrapped = 0;
  let belowFloor = 0;
  let aboveFloor = 0;
  for (const p of snapshot.protocols) {
    const reason = exclusionReason(p);
    if (reason === 'ranked') {
      ranked++;
      if (snapshot.watchlist.includes(p.slug)) continue;
      if (p.tvl_usd < snapshot.floor_usd) belowFloor++;
      else aboveFloor++;
    } else if (reason === 'has-token') hasToken++;
    else if (reason === 'excluded-category') excludedCategory++;
    else if (reason === 'excluded-versioned') excludedVersioned++;
    else excludedWrapped++;
  }
  return {
    total: snapshot.protocols.length,
    ranked,
    watchlist: snapshot.watchlist.length,
    below_floor: belowFloor,
    above_floor: aboveFloor,
    has_token: hasToken,
    excluded_category: excludedCategory,
    excluded_versioned: excludedVersioned,
    excluded_wrapped_name: excludedWrapped,
  };
}

/** The four-decimal rounding the board's model block carries. */
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const fit = fitCurve(snapshot);
  const medians = categoryMedianChange(snapshot);
  // The watchlist is the floor, never the ceiling: every rankable protocol
  // in the snapshot is ranked, whether it sits below the floor, on the
  // watchlist, or above the floor without a watchlist name. The snapshot's
  // ten fields carry no parent protocol, so no rankable protocol is left
  // out on a guess about why the list does not name it.
  const chosen = snapshot.protocols.filter((p) => isRankable(p));
  const scored = chosen.map((p) => ({ p, value: impliedRange(p, snapshot.as_of, fit, medians, model) }));
  scored.sort((a, b) => b.value.base - a.value.base || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => {
    const rank = i + 1;
    const categoryMedian = medians.get(s.p.category ?? '(no category)') ?? null;
    return {
      rank,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: s.value.age,
      implied_value_usd: s.value.base,
      implied_value_bear_usd: s.value.bear,
      implied_value_bull_usd: s.value.bull,
      model: {
        multiple: round4(s.value.multiple),
        curve_value_usd: Math.max(1, Math.round(s.value.curve)),
        spike_discount: round4(s.value.discount),
        growth_idio_pct: round4(s.value.idio),
        discount: model.discount_base,
        age_days: s.value.age,
      },
      farm_verdict: farmVerdict(s.p, rank, s.value.age),
      farm_steps: farmSteps(s.p, s.value.age, s.value.idio, categoryMedian).map(stepText),
    };
  });
}

/** One farm step as a single string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** What one transaction costs on a chain, as an estimate a reader can check: expensive on Ethereum, cents on the fast chains. */
const GAS_BY_CHAIN: Record<string, string> = {
  Ethereum: 'about $8 of gas',
  Arbitrum: 'about $1 of gas',
  Optimism: 'about $1 of gas',
  Base: 'about $1 of gas',
  'zkSync Era': 'about $1 of gas',
  Linea: 'about $1 of gas',
  Scroll: 'about $1 of gas',
  Unichain: 'about $1 of gas',
  Blast: 'about $1 of gas',
  Binance: 'about $0.30 of gas',
  Polygon: 'about $0.10 of gas',
  Avalanche: 'about $0.30 of gas',
  Fantom: 'about $0.30 of gas',
  Celo: 'about $0.30 of gas',
  Cronos: 'about $0.30 of gas',
  Kava: 'about $0.30 of gas',
  Solana: 'about $0.05 of gas',
  Sui: 'about $0.05 of gas',
  Aptos: 'about $0.05 of gas',
  Sei: 'about $0.05 of gas',
  TON: 'about $0.05 of gas',
  Near: 'about $0.05 of gas',
};

/** The gas estimate for a chain, or the fallback for a chain the table does not name. */
function gasFor(chain: string): string {
  return GAS_BY_CHAIN[chain] ?? 'about $3 of gas';
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The farm priority by rank: the top 20 first, the next 60 next, the rest after them. */
function priorityFor(rank: number): string {
  if (rank <= 20) return 'HIGH';
  if (rank <= 80) return 'MEDIUM';
  return 'LOW';
}

/**
 * One line per protocol: its farm priority, the capital it needs, the gas
 * to set the position up, and how long to hold it. A reader deciding where
 * to spend an afternoon can compare two rows without opening either plan.
 */
export function farmVerdict(p: SnapshotProtocol, rank: number, age: number | null): string {
  const capital = capitalFor(p);
  const gas = gasFor(chainOf(p));
  const hold = holdDaysFor(age);
  return `Farm priority: ${priorityFor(rank)}. Budget about $${capital} of capital and ${gas} to set up; hold at least ${hold} days.`;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open`;
  if (c.includes('yield aggregator') || c.includes('yield')) return `Deposit $${capital} of USDC into a ${name} vault on ${chain} and keep the shares`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy`;
  if (c.includes('risk')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the receipt token`;
  if (c.includes('basis')) return `Deposit $${capital} of USDC into ${name}'s basis vault on ${chain} and hold the position`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open`;
}

/** A signed percentage with one decimal, or a dash when the move is unknown. */
function signedPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL,
 * age), never from a hand-written list of names. The fifth step uses the
 * protocol's second chain when it has one, so a multi-chain protocol's plan
 * farms more than one surface. Gas is priced per chain, not as one flat fee.
 * The third step, the weekly cadence, is spike-aware at radar-6: it reads
 * the protocol's own seven-day move against its category (idio) and tells
 * the farmer what that move means for timing. A protocol that spiked more
 * than 20 points against its category waits the spike out; one that fell
 * more than 15 points enters while the fall is still the model's discount;
 * anything in between keeps the plain weekly cadence.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, idio = 0, categoryMedian: number | null = null): FarmStep[] {
  const chain = chainOf(p);
  const gas = gasFor(chain);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const second = p.chains.length > 1 ? p.chains[1]! : null;
  const spread = second === null
    ? {
      text: `Use a second feature of the protocol, such as a swap, a borrow or a vote, so the activity is not a single deposit`,
      cost: gas,
      time: '10 minutes',
    }
    : {
      text: `Repeat the position on ${second} too, with half the capital, so the farm covers a second chain`,
      cost: `$${Math.floor(capital / 2)} of capital and ${gasFor(second)}`,
      time: '15 minutes to set up',
    };
  const categoryName = p.category ?? 'its category';
  const weekly: FarmStep = idio > 20
    ? {
      text: `Wait for this week's spike to settle before sizing up: ${p.name} moved ${signedPct(p.change_7d)}% in 7 days against ${signedPct(categoryMedian)}% for ${categoryName}, so the spike is already priced into the model's discount — make only a small qualifying action this week and size up after the move cools`,
      cost: `${gas} a week`,
      time: '10 minutes a week',
    }
    : idio < -15
      ? {
        text: `This week's fall is the model's discount: ${p.name} moved ${signedPct(p.change_7d)}% in 7 days against ${signedPct(categoryMedian)}% for ${categoryName}, so enter while the move is fresh — make the qualifying action this week, before the entry price rises again`,
        cost: `${gas} a week`,
        time: '10 minutes a week',
      }
      : {
        text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote`,
        cost: `${gas} a week`,
        time: '10 minutes a week',
      };
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline`,
      cost: gas,
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and ${gas}`,
      time: '15 minutes to set up',
    },
    weekly,
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    spread,
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log, then unwind in reverse order when you exit`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view — with each one's own mcap/TVL, so the reader can check the multiples. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      mcap_tvl: p.mcap_usd !== null && p.tvl_usd > 0 ? Math.round((p.mcap_usd / p.tvl_usd) * 1000) / 1000 : null,
    }));
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow, watchlist: boolean): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    implied_value_bear_usd: row.implied_value_bear_usd,
    implied_value_bull_usd: row.implied_value_bull_usd,
    multiple: row.model.multiple,
    curve_value_usd: row.model.curve_value_usd,
    spike_discount: row.model.spike_discount,
    growth_idio_pct: row.model.growth_idio_pct,
    farm_verdict: row.farm_verdict,
    watchlist,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const fit = fitCurve(snapshot);
  const coverage = coverageOf(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug) && r.tvl_usd < snapshot.floor_usd).length;
  const aboveFloor = board.filter((r) => !snapshot.watchlist.includes(r.slug) && r.tvl_usd >= snapshot.floor_usd).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    curve: {
      intercept: Math.round(fit.intercept * 10000) / 10000,
      slope: Math.round(fit.slope * 10000) / 10000,
      r_squared: Math.round(fit.r_squared * 10000) / 10000,
      resid_rmse: Math.round(fit.resid_rmse * 10000) / 10000,
      peers: fit.peers,
    },
    coverage,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    above_floor_size: aboveFloor,
    live_size: live.length,
    rows: board.map((r) => radarRow(r, snapshot.watchlist.includes(r.slug))),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const rankable = snapshot.protocols.filter((p) => isRankable(p)).length;
  if (board.length !== rankable) return `the board holds ${board.length} rows but the snapshot has ${rankable} rankable protocols`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (r.farm_verdict.length < 20 || r.farm_verdict.length > 200) return `${r.slug} has a farm verdict of ${r.farm_verdict.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (r.implied_value_bear_usd > r.implied_value_usd || r.implied_value_usd > r.implied_value_bull_usd) {
      return `${r.slug} has a value range out of order: bear $${r.implied_value_bear_usd}, base $${r.implied_value_usd}, bull $${r.implied_value_bull_usd}`;
    }
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

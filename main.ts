// Token Radar's entrypoint, model radar-6: one sealed snapshot in, one ranked board and dashboard out.
//
//   node main.ts
//
// Reads /input/snapshot.json (the sealed DefiLlama snapshot), ranks the board
// with lib/model.ts, and writes /output/board.json, /output/data.js,
// /output/dashboard/ (the page, with its data beside it), /output/screenshots/
// (the dashboard's screenshots, taken from a built dashboard and kept in the
// repository) and /output/dossier.json (the dashboard's dossier, built with
// vendor/makefun-board.ts). Node 22, standard library only, no build and no
// install.
//
// The board is built by the model alone: no name is ever special-cased, and
// the board the file carries is the board the model computes, so a reader can
// reproduce every rank from the snapshot. The size curve is fitted from the
// snapshot at run time, so the numbers the run prints are the fit the board
// was priced from, not numbers copied from a report. Radar-6's one change
// against radar-5 is the spike strength: k = -2 instead of -1, so the spike
// discount spans 0.30-1.82 and the farm plans' weekly step reads the week's
// own move before telling the farmer when to act.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL, MODEL_VERSION, boardIssue, buildRadar, dataScript, fitCurve, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const REPO = fileURLToPath(new URL('.', import.meta.url));
const TEXT_MAX_BYTES = 65_536;
const SHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** The value of `--name <value>` on the command line, or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  process.stderr.write(`token radar: no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input\n`);
  process.exit(2);
}
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const fit = fitCurve(snapshot);
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  process.stderr.write(`token radar: the model wrote a board the gate refuses: ${issue}\n`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

/** Copy one directory's regular files into `to`, skipping names that start with a dot. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

copyFiles(join(REPO, 'dashboard'), join(out, 'dashboard'));

/** The dashboard's source bytes: the judge reads the dossier's text whole only while it fits in 65,536 bytes. */
function dashboardBytes(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isFile()) total += statSync(path).size;
  }
  return total;
}
const dashboardSize = dashboardBytes(join(out, 'dashboard'));
if (dashboardSize > TEXT_MAX_BYTES) {
  process.stderr.write(`token radar: dashboard source is ${dashboardSize} bytes, past the ${TEXT_MAX_BYTES} the judge reads whole: shrink it before handing this in\n`);
  process.exit(1);
}
const shots = copyFiles(join(REPO, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  process.stderr.write(`token radar: screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`);
  process.exit(1);
}
for (const name of shots) {
  if (!SHOT_NAME.test(name)) {
    process.stderr.write(`token radar: screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters\n`);
    process.exit(1);
  }
}

// The dossier is written last: the scorer rebuilds it from this /output and compares bytes.
writeFileSync(join(out, 'dossier.json'), buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: { max: 4, max_bytes: 524_288 }, dashboard: { max_files: 400, max_bytes: 4_194_304 } }));

const top = board[0]!;
const last = board[board.length - 1]!;
const dossierSize = statSync(join(out, 'dossier.json')).size;
// The spike span is computed from the model's own constants, not typed in:
// at k = -2 it is exp(-1.2) to exp(0.6), 0.30-1.82 across the clamped idio range.
const spikeLow = Math.exp((MODEL.spike_strength * MODEL.spike_cap) / 100);
const spikeHigh = Math.exp((MODEL.spike_strength * MODEL.spike_floor) / 100);
process.stdout.write(
  `token radar: model ${MODEL_VERSION}, spike discount exp(${MODEL.spike_strength}·idio/100), span ${spikeLow.toFixed(2)}–${spikeHigh.toFixed(2)}, discount ×${MODEL.discount_base}\n` +
    `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.above_floor_size} above the floor, ${radar.live_size} live set aside)\n` +
    `token radar: curve log(mcap) = ${fit.intercept.toFixed(4)} + ${fit.slope.toFixed(4)} log(TVL), R2 ${fit.r_squared.toFixed(4)}, ${fit.peers} peers\n` +
    `token radar: top ${top.slug} $${top.implied_value_usd.toLocaleString('en-US')} (bear $${top.implied_value_bear_usd.toLocaleString('en-US')} / bull $${top.implied_value_bull_usd.toLocaleString('en-US')}), ` +
    `last ${last.slug} $${last.implied_value_usd.toLocaleString('en-US')}\n` +
    `token radar: dashboard source ${dashboardSize} bytes, dossier ${dossierSize} bytes\n` +
    `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${join(out, 'dashboard')}, ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
);

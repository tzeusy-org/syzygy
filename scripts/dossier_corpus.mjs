#!/usr/bin/env node
// The Polaris dossier corpus (pursuit 2026-11-21b R16 slice 1, syzygy-5dhm.74): check the corpus file, print the mechanism version,
// print the seal, or survey one pinned tree from its public listing.
//
//   node scripts/dossier_corpus.mjs --check [--file <corpus.json>]
//       validate the corpus (packages/polaris-dossier/src/corpus.ts, corpusRefusals: 40-hex commits, one shape per entry, every
//       required stratum, tier and trait held, the seal over the sealed members) and compute the mechanism version over this
//       checkout's files; prints the digest and its file count. Exit 0 when the corpus is valid, 1 when not, 2 on any other error
//   node scripts/dossier_corpus.mjs --digest [--file <corpus.json>]
//       print the mechanism version and one `<sha256>  <path>  <group>` line per member file
//   node scripts/dossier_corpus.mjs --seal [--file <corpus.json>]
//       print the SHA-256 of the sealed members (what `seal.sha256` must hold); it never writes the file
//   node scripts/dossier_corpus.mjs --survey <owner/name> <40-hex commit>
//       read the pinned commit's tree listing with `gh api repos/<owner/name>/git/trees/<commit>?recursive=1` (read only: paths,
//       modes and sizes, never a blob body) and print the entry's survey object: blob count, summed size, and the server-entry,
//       docs-tree, root-README and package-manifest traits as the structure record's own rules (derive.ts) give them over the
//       listing. A truncated listing is refused: the survey would undercount. Paths are never printed
//
// Run `npm run build` first: the corpus module and the structure rules are loaded from this checkout's dist. The mechanism version is
// taken over the working tree: record it from a clean checkout at a named commit.
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_FILE = 'docs/polaris-generation/dossier-corpus-v1.json';
const DIST = path.join(ROOT, 'packages/polaris-dossier/dist');
const load = async (name) => import(pathToFileURL(path.join(DIST, name)).href);

function fail(message, code = 2) {
  process.stderr.write(`dossier_corpus: ${message}\n`);
  process.exit(code);
}

function optionValue(argv, flag, fallback) {
  const at = argv.indexOf(flag);
  if (at < 0) return fallback;
  if (at + 1 >= argv.length) fail(`${flag} needs a value`);
  return argv[at + 1];
}

const tree = {
  list: (directory) => fs.readdirSync(path.join(ROOT, directory)),
  read: (file) => fs.readFileSync(path.join(ROOT, file)),
};

async function readCorpus(argv) {
  const file = optionValue(argv, '--file', DEFAULT_FILE);
  return { file, value: JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8')) };
}

async function check(argv) {
  const { corpusRefusals, mechanismVersion } = await load('corpus.js');
  const { file, value } = await readCorpus(argv);
  const refusals = corpusRefusals(value);
  const entries = Array.isArray(value.entries) ? value.entries.length : 0;
  for (const refusal of refusals) process.stdout.write(`refused: ${refusal}\n`);
  const version = value.mechanismVersion ? mechanismVersion(value.mechanismVersion, tree) : { ok: false, reason: 'no mechanismVersion' };
  if (version.ok) process.stdout.write(`mechanism version ${version.digest} over ${version.files.length} file(s)\n`);
  else process.stdout.write(`refused: ${version.reason}\n`);
  const ok = refusals.length === 0 && version.ok;
  process.stdout.write(`${file}: ${ok ? 'valid' : 'INVALID'} (${entries} entries, ${refusals.length + (version.ok ? 0 : 1)} refusal(s))\n`);
  process.exit(ok ? 0 : 1);
}

async function digest(argv) {
  const { mechanismVersion } = await load('corpus.js');
  const { value } = await readCorpus(argv);
  const version = mechanismVersion(value.mechanismVersion, tree);
  if (!version.ok) fail(version.reason, 1);
  for (const member of version.files) process.stdout.write(`${member.sha256}  ${member.path}  ${member.group}\n`);
  process.stdout.write(`${version.digest}\n`);
}

async function seal(argv) {
  const { corpusSeal } = await load('corpus.js');
  const { value } = await readCorpus(argv);
  process.stdout.write(`${corpusSeal(value)}\n`);
}

const BLOB_MODES = new Set(['100644', '100755', '120000']);
const ROOT_README = /^readme(?:\.[^/]*)?$/iu;

async function survey(argv) {
  const at = argv.indexOf('--survey');
  const repository = argv[at + 1], commit = argv[at + 2];
  if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/u.test(repository ?? '')) fail('--survey needs <owner/name>');
  if (!/^[0-9a-f]{40}$/u.test(commit ?? '')) fail('--survey needs a 40-hex commit');
  const { deriveStructure } = await load('derive.js');
  const text = execFileSync('gh', ['api', `repos/${repository}/git/trees/${commit}?recursive=1`], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 });
  const listing = JSON.parse(text);
  if (listing.truncated !== false) fail(`the listing of ${repository} at ${commit} is truncated; no survey`, 1);
  const blobs = listing.tree.filter((entry) => BLOB_MODES.has(entry.mode));
  let bytes = 0;
  for (const blob of blobs) bytes += blob.size;
  const record = deriveStructure(blobs.map((blob) => ({ path: blob.path, mode: blob.mode })), () => false);
  if (record.state !== 'derived') fail(`no structure record: ${record.why}`, 1);
  const out = {
    files: blobs.length,
    bytes,
    serverEntry: record.traits.serverEntry.holds,
    docsTree: record.traits.docsTree.matched,
    rootReadme: blobs.some((blob) => !blob.path.includes('/') && ROOT_README.test(blob.path)),
    packages: record.traits.packages.shape,
  };
  process.stdout.write(`${JSON.stringify(out)}\n`);
}

const argv = process.argv.slice(2);
const modes = ['--check', '--digest', '--seal', '--survey'].filter((mode) => argv.includes(mode));
if (modes.length !== 1) fail('give exactly one of --check, --digest, --seal or --survey');
if (!fs.existsSync(path.join(DIST, 'corpus.js'))) fail('packages/polaris-dossier/dist/corpus.js is missing: run `npm run build` first');
const run = { '--check': check, '--digest': digest, '--seal': seal, '--survey': survey }[modes[0]];
run(argv).catch((error) => fail(error instanceof Error ? error.message : String(error)));

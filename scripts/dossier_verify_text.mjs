#!/usr/bin/env node
// Check a free-form Markdown text against the 2026-11-21 pilot's pinned, screened tree (syzygy-5dhm.23, move R2 slice 1).
//
//   node scripts/dossier_verify_text.mjs --clone <bare clone> --text <file> [--out <new file>] [--html <new file>] [--manifest <file>] [--policy-file <file>]
//
// `syzygy dossier verify <run> --text <file>` is the command for a run that re-verifies under the declared-source model. The pilot's
// stored run is a legacy run that no longer re-verifies, so this script takes the pilot's subject from its manifest instead, as
// scripts/dossier_pilot_screened_tree.mjs does: the commit, the policy blob (or --policy-file) whose bytes must hash to the manifest's
// digest, and the screen configuration (project documentation, visibility, placement subject). Everything else is the command's own
// code, loaded from this checkout's dist (run `npm run build` first): `buildDossierScreen` (src/screen.ts), the re-hashing
// `openPinnedObjectReader` (src/git-object-reader.ts) over the bare clone, and `verifyText` (src/verify-text.ts), which checks every
// reference and quotation through the dossier check's `deriveFindings`. There is no filter in this file.
//
// Reads the clone's object store only (nothing is fetched, checked out or executed). Prints the tally and item counts as JSON, never a
// file body or a quotation; with --out writes the annotated copy to a new file outside this checkout, and with --html the same result as
// one page in the neutral shell R1's graders see (`renderVerifiedTextPage`, src/verify-text-page.ts; syzygy-5dhm.24), also a new file
// outside this checkout. Exit 0 when checked, 2 on a refusal.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = path.join(ROOT, 'docs', 'evidence', 'pursuit-2026-11-21b', 'pilot', 'manifest.json');
const DIST = path.join(ROOT, 'packages', 'polaris-dossier', 'dist');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

class Refusal extends Error {}
const refuse = (why) => { throw new Refusal(why); };
const inside = (parent, child) => { const relative = path.relative(parent, child); return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)); };

function parseArgs(argv) {
  const known = new Set(['--clone', '--text', '--out', '--html', '--manifest', '--policy-file']);
  const values = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i], value = argv[i + 1];
    if (!known.has(name) || value === undefined || value.startsWith('--') || values.has(name)) refuse(`usage: --clone <bare clone> --text <file> [--out <file>] [--html <file>] [--manifest <file>] [--policy-file <file>] (at ${name})`);
    values.set(name, value);
  }
  if (!values.has('--clone') || !values.has('--text')) refuse('--clone and --text are required');
  return values;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(fs.readFileSync(args.get('--manifest') ?? DEFAULT_MANIFEST, 'utf8'));
  const commit = manifest.commit, configuration = manifest.screenConfiguration;
  if (!/^[0-9a-f]{40}$/u.test(commit ?? '') || typeof manifest.policy?.sha256 !== 'string' || configuration?.subject?.commit !== commit) refuse('the manifest names no commit, policy digest or screen configuration');
  const newOutside = (flag) => {
    if (!args.has(flag)) return undefined;
    const target = path.resolve(args.get(flag));
    if (fs.existsSync(target) || inside(fs.realpathSync(ROOT), path.join(fs.realpathSync(path.dirname(target)), path.basename(target)))) refuse(`${flag} must name a new file outside this checkout`);
    return target;
  };
  const out = newOutside('--out');
  const html = newOutside('--html');
  if (out !== undefined && out === html) refuse('--out and --html must name two different files');
  if (!args.has('--policy-file') && !/^[0-9a-f]{40}$/u.test(manifest.policyBlob ?? '')) refuse('the manifest names no policy blob id (40 hexadecimal characters)');
  const policy = args.has('--policy-file') ? fs.readFileSync(args.get('--policy-file'))
    : execFileSync('git', ['-C', ROOT, 'cat-file', 'blob', manifest.policyBlob], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (sha256(policy) !== manifest.policy.sha256) refuse('the policy bytes do not hash to the digest the pilot bound');
  for (const module of ['screen.js', 'git-object-reader.js', 'verify-text.js', 'verify-text-run.js', 'verify-text-page.js']) if (!fs.existsSync(path.join(DIST, module))) refuse(`packages/polaris-dossier/dist/${module} is absent; run \`npm run build\` first`);
  const { buildDossierScreen } = await import(pathToFileURL(path.join(DIST, 'screen.js')).href);
  const { openPinnedObjectReader } = await import(pathToFileURL(path.join(DIST, 'git-object-reader.js')).href);
  const { verifyText } = await import(pathToFileURL(path.join(DIST, 'verify-text.js')).href);
  const load = buildDossierScreen(new Uint8Array(policy), configuration.projectDocumentation, configuration.subject, configuration.visibility);
  if (!load.ok) refuse(`the screen was refused: ${load.why}`);
  if (load.screen.policySha256 !== manifest.policy.sha256 || load.screen.policyVersion !== manifest.policy.policyVersion) refuse('the screen reports another policy than the pilot bound');
  const textFile = path.resolve(args.get('--text'));
  const { VERIFY_TEXT_MAX_BYTES } = await import(pathToFileURL(path.join(DIST, 'verify-text-run.js')).href);
  let stats;
  try { stats = fs.statSync(textFile); } catch { refuse(`the text ${textFile} cannot be read`); }
  if (!stats.isFile()) refuse(`the text ${textFile} is not a regular file`);
  if (stats.size > VERIFY_TEXT_MAX_BYTES) refuse(`the text ${textFile} is larger than the ${VERIFY_TEXT_MAX_BYTES}-byte text bound`);
  const bytes = fs.readFileSync(textFile);
  let markdown;
  try { markdown = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { refuse(`the text ${textFile} is not strict UTF-8`); }
  const reader = openPinnedObjectReader({ gitDir: path.resolve(args.get('--clone')), revision: commit });
  const { verified, annotated } = await verifyText(markdown, { pinned: commit, screen: load.screen, reader }, path.basename(textFile));
  if (out !== undefined) fs.writeFileSync(out, annotated, { flag: 'wx', mode: 0o644 });
  if (html !== undefined) {
    const { renderVerifiedTextPage } = await import(pathToFileURL(path.join(DIST, 'verify-text-page.js')).href);
    fs.writeFileSync(html, renderVerifiedTextPage(markdown, verified, { pinned: commit }), { flag: 'wx', mode: 0o644 });
  }
  process.stdout.write(`${JSON.stringify({
    text: { file: path.basename(textFile), sha256: sha256(bytes), bytes: bytes.length }, pinnedRevision: commit,
    screeningPolicy: { policyId: load.screen.policyId, policyVersion: load.screen.policyVersion, sha256: load.screen.policySha256 },
    claims: verified.claims.length, tally: verified.tally, cannotBeChecked: verified.tally.unanchored, items: verified.items, skipped: verified.skipped,
    annotated: out ?? null, page: html ?? null,
  }, null, 2)}\n`);
}

main().catch((cause) => {
  process.stderr.write(`dossier_verify_text: ${cause instanceof Refusal ? cause.message : cause?.stack ?? String(cause)}\n`);
  process.exit(2);
});

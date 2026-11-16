#!/usr/bin/env node
// Every consent act family's answer over one checkout's real `.syzygy/governance/decisions/` tree, at several instants
// (syzygy-bpyt.1.24, re-run after the rebase onto main). Evidence tool, not a check and not authority. The owner's condition for
// merging the act-family knobs (`pr640-policy-stem`, answer A, decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md) is a
// re-run of the verdict differential over the current decisions tree showing no verdict change: run this once in a tree built from
// the base commit and once in one built from the change, then compare the two outputs with `compare_verdicts.py`.
//
//   (in the tree) npm ci && npx tsc -b packages/polaris-generation-consent packages/polaris-dossier
//   node docs/evidence/syzygy-bpyt-1-24/verdicts_over_tree_2.mjs --tree <checkout> --out <file.json> --now <ISO> [--now <ISO> ...]
//
// It extends `verdicts_over_tree.mjs` (left unchanged: the 2026-11-04 record names its digest) three ways, so forms main added since
// cannot fall outside it: every exported act form (any object with a string `file` and a `stems` array, at any depth of the consent
// index or the dossier's gate sources) is read by itself; the dossier's package gate sources are asked every question they answer
// for every repository id and admitted revision the observation records hold; and the admission records port is asked each kind
// for each of those pairs. Each answer is its whole JSON, or the error it throws.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const one = name => { const i = argv.indexOf(name); if (i < 0 || i + 1 >= argv.length) throw new Error(`missing ${name}`); return argv[i + 1]; };
const all = name => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []));
const tree = path.resolve(one('--tree')), out = one('--out'), instants = all('--now').map(s => Date.parse(s));
if (instants.length === 0 || instants.some(n => !Number.isSafeInteger(n))) throw new Error('bad --now');
const load = rel => import(pathToFileURL(path.join(tree, rel)).href);
const consent = await load('packages/polaris-generation-consent/dist/index.js');
const gates = await load('packages/polaris-dossier/dist/gate-sources.js');
const sha = file => createHash('sha256').update(readFileSync(path.join(tree, file))).digest('hex');
const settle = async read => { try { return await read(); } catch (error) { return { threw: `${error?.name}: ${error?.message}` }; } };

const forms = [];
const walk = (value, at, depth) => {
  if (value === null || typeof value !== 'object' || depth > 5) return;
  if (typeof value.file === 'string' && Array.isArray(value.stems)) { forms.push([at, value]); return; }
  for (const [k, v] of Object.entries(value)) walk(v, `${at}.${k}`, depth + 1);
};
for (const [k, v] of Object.entries(consent)) walk(v, `consent.${k}`, 0);
for (const [k, v] of Object.entries(gates)) walk(v, `gates.${k}`, 0);
forms.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
const signoff = form => /SIGNOFF/.test(form.file);

async function answers(now) {
  const opts = { root: tree, now }, v = {};
  v.admission = await settle(async () => (await consent.createPackageAdmissionReader({ root: tree }).read()).map(r => `${r.recordId}@${r.version} inForceAt=${r.inForceAt}`));
  v.policyReader = await settle(async () => (await consent.createPackagePolicyReader({ root: tree }).read()).map(r => `${r.actIdentity} ${r.inForceAt}..${r.until}`));
  v.policyChain = await settle(() => consent.readPolicyActChain(opts));
  v.classAct = await settle(() => consent.readClassActState(opts));
  v.inForceEgress = await settle(() => consent.readInForceEgress(opts));
  for (const [at, form] of forms) {
    v[`form:${at}`] = await settle(() => (signoff(form) ? consent.readVersionedSignoffState({ ...opts, form }) : consent.readDigestBoundActState({ ...opts, form })));
  }
  const g = gates.createPackageGateSources({ root: tree, now: () => now });
  for (const q of ['registryEntry', 'screeningPolicy', 'd9', 'rfc720Ruling', 'observationRecords']) v[`gate:${q}`] = await settle(() => g[q]());
  const records = v['gate:observationRecords'];
  const pairs = new Map();
  for (const r of records?.ok ? records.records : []) for (const rev of [...r.admittedRevisions, 'f'.repeat(40)]) pairs.set(`${r.repositoryId} ${rev}`, [r.repositoryId, rev]);
  const repos = [...new Set([...pairs.values()].map(([id]) => id)), 'no-such-repository'].sort();
  const port = consent.createPackageAdmissionRecordsPort({ root: tree, now: () => now });
  for (const id of repos) {
    v[`gate:consentedRevisionsFor:${id}`] = await settle(() => g.consentedRevisionsFor(id));
    v[`gate:drawerFor:${id}`] = await settle(() => g.projectInput.drawerFor(id));
    v[`gate:statementsFor:${id}`] = await settle(() => g.providerStatements.statementsFor(id));
  }
  for (const [key, [id, rev]] of [...pairs.entries()].sort()) {
    v[`gate:observationConsentFor:${key}`] = await settle(() => g.observationConsentFor(id, rev));
    v[`gate:observationConsentNaming:${rev}`] = await settle(() => g.observationConsentNaming(rev));
    for (const kind of ['observation-consent', 'egress-consent', 'public-source-policy']) v[`port:${kind}:${key}`] = await settle(() => port.check({ kind, repositoryId: id, revision: rev }));
  }
  return JSON.parse(JSON.stringify(v));
}

const runs = [];
for (const now of instants) runs.push({ now: new Date(now).toISOString(), answers: await answers(now) });
const head = execFileSync('git', ['-C', tree, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['-C', tree, 'status', '--porcelain', '--', 'packages', '.syzygy'], { encoding: 'utf8' }).trim();
const decisions = execFileSync('git', ['-C', tree, 'ls-files', '-z', '.syzygy/governance/decisions'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const treeDigest = createHash('sha256').update(decisions.map(f => `${f}\0${sha(f)}\n`).join('')).digest('hex');
writeFileSync(out, JSON.stringify({
  tool: 'docs/evidence/syzygy-bpyt-1-24/verdicts_over_tree_2.mjs', commit: head, packagesOrDecisionsDirty: dirty.split('\n').filter(Boolean),
  subject: { decisionsFiles: decisions.length, decisionsTreeSha256: treeDigest, packageReaderSha256: sha('packages/polaris-generation-consent/src/package-reader.ts') },
  forms: forms.map(([at, f]) => `${at} ${f.file}`), runs,
}, null, 1) + '\n');
console.log(`${runs.length} instants x ${Object.keys(runs[0].answers).length} answers over ${decisions.length} decisions files at ${head}`);

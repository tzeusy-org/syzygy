#!/usr/bin/env node
// Every consent act family's verdict over one checkout's real `.syzygy/governance/decisions/` tree (syzygy-bpyt.1.24). Evidence tool,
// not a check and not authority. The owner's stop condition for aligning the act-family knobs (answer A to consent-withdrawal-knobs,
// decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md) is that no family's verdict over the current tree changes: run this
// once in a tree built from the base commit and once in one built from the change, and compare the two outputs' `verdicts`.
//
//   (in the tree) npm ci && npx tsc -b packages/polaris-generation-consent packages/polaris-dossier
//   node docs/evidence/syzygy-bpyt-1-24/verdicts_over_tree.mjs --tree <checkout> --now <ISO instant> --out <file.json>
//
// The readers are loaded from the tree's compiled packages and read the tree's own files. Each verdict is the read's state and its
// `why` (or, for the admission reader, the record ids, versions and in-force instants it returns, or the error it throws).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = name => { const i = process.argv.indexOf(name); if (i < 0 || i + 1 >= process.argv.length) throw new Error(`missing ${name}`); return process.argv[i + 1]; };
const tree = path.resolve(arg('--tree')), now = Date.parse(arg('--now')), out = arg('--out');
if (!Number.isSafeInteger(now)) throw new Error('bad --now');
const load = rel => import(pathToFileURL(path.join(tree, rel)).href);
const consent = await load('packages/polaris-generation-consent/dist/index.js');
const gates = await load('packages/polaris-dossier/dist/gate-sources.js');
const sha = file => createHash('sha256').update(readFileSync(path.join(tree, file))).digest('hex');
const opts = { root: tree, now };

const settle = async read => { try { return await read(); } catch (error) { return { threw: `${error?.name}: ${error?.message}` }; } };
const state = s => (s.threw !== undefined ? s : { state: s.state, ...(s.state === 'ok' ? { identity: s.act?.identity ?? s.final?.identity ?? s.recordId } : { why: s.why }) });
const verdicts = {};
verdicts.admission = await settle(async () => (await consent.createPackageAdmissionReader({ root: tree }).read()).map(r => `${r.recordId}@${r.version} inForceAt=${r.inForceAt}`));
verdicts.policyReader = await settle(async () => (await consent.createPackagePolicyReader({ root: tree }).read()).map(r => `${r.actIdentity} ${r.inForceAt}..${r.until}`));
verdicts.policyChain = state(await settle(() => consent.readPolicyActChain(opts)));
verdicts.classAct = state(await settle(() => consent.readClassActState(opts)));
verdicts.inForceEgress = state(await settle(() => consent.readInForceEgress(opts)));
verdicts.registryGitSource = state(await settle(() => consent.readDigestBoundActState({ ...opts, form: consent.REGISTRY_GIT_SOURCE_ACT_FORM })));
verdicts.localAgentSignoff = state(await settle(() => consent.readVersionedSignoffState({ ...opts, form: consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM })));
verdicts.d9 = state(await settle(() => consent.readDigestBoundActState({ ...opts, form: gates.D9_ACT_FORM })));
verdicts.rfc720 = state(await settle(() => consent.readDigestBoundActState({ ...opts, form: gates.RFC7_20_RULING_ACT_FORM })));
for (const [key, form] of Object.entries(gates.DRAWER_FORMS)) verdicts[`drawer:${key}`] = state(await settle(() => consent.readDigestBoundActState({ ...opts, form })));
verdicts.providerV2 = state(await settle(() => consent.readDigestBoundActState({ ...opts, form: gates.PROVIDER_V2_FORM })));
for (const [repo, list] of Object.entries(gates.STATEMENT_FORMS)) for (const s of list) {
  verdicts[`statement:${repo}:${s.agentTool}:${s.provider}`] = state(await settle(() => consent.readDigestBoundActState({ ...opts, form: s.form })));
  if (s.successor !== undefined) verdicts[`statement:${repo}:${s.agentTool}:${s.provider}:successor`] = state(await settle(() => consent.readDigestBoundActState({ ...opts, form: s.successor })));
}
const port = consent.createPackageAdmissionRecordsPort({ root: tree, now: () => now });
for (const kind of ['observation-consent', 'egress-consent', 'public-source-policy']) verdicts[`port:${kind}`] = await settle(() => port.check({ kind, repositoryId: 'redis-redis', revision: '498ecd0d6d007db11ddb3aea9428552598a78622' }));

const head = execFileSync('git', ['-C', tree, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const decisions = execFileSync('git', ['-C', tree, 'ls-files', '-z', '.syzygy/governance/decisions'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const treeDigest = createHash('sha256').update(decisions.map(f => `${f}\0${sha(f)}\n`).join('')).digest('hex');
writeFileSync(out, JSON.stringify({
  tool: 'docs/evidence/syzygy-bpyt-1-24/verdicts_over_tree.mjs', commit: head, now: new Date(now).toISOString(),
  subject: { decisionsFiles: decisions.length, decisionsTreeSha256: treeDigest, packageReaderSha256: sha('packages/polaris-generation-consent/src/package-reader.ts') },
  verdicts,
}, null, 1) + '\n');
console.log(`${Object.keys(verdicts).length} verdicts over ${decisions.length} decisions files at ${head}`);

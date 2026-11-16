// Reviewer live-record harness (R-GP-IMPL-OWNER-ACT-FIELDS-1).
// Usage: node live_diff.mjs <clone> <governance-revision> <out.json>
// Run once in the base clone and once in the head clone (each built with
// npm run build:poc); both read the SAME governance revision.
//  1. both gates through their production loaders at the revision;
//  2. every tracked blob at the revision (all extensions) through
//     parseOwnerActRecord, recording each present/malformed owner value;
//  3. a mutated-live-record corpus: each of the three live act records with
//     its Owner line substituted and its prose altered, through the gate.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, revision, out] = process.argv.slice(2);
const load = (p) => import(pathToFileURL(join(root, p)).href);
const core = await load('packages/three-surface-poc-core/dist/index.js');
const gov = await load('apps/three-surface-poc/dist/governance-inputs.js');
const walk = await load('apps/three-surface-poc/dist/walkthrough-inputs.js');
const INSTANT = '2026-10-21T18:00:00Z';
const opts = { repoRoot: root, governanceRevision: revision, evaluationInstant: INSTANT };

const bodyInputs = gov.loadBodyReadAuthorityInputs({ ...opts, evaluationId: 'evaluation:reviewer-live' });
const body = core.evaluateBodyReadAuthority(bodyInputs);
const judgment = core.evaluateWalkthroughJudgment(
  walk.walkthroughJudgmentInputsFor({ ...opts, evaluationId: 'evaluation:reviewer-live-judgment' })({ evaluationIdentity: 'reviewer-live' }),
);

// 2. every tracked blob
const names = execFileSync('git', ['-C', root, 'ls-tree', '-r', '-z', '--name-only', revision], { maxBuffer: 1 << 28 })
  .toString('utf8').split('\0').filter(Boolean);
const decoder = new TextDecoder('utf-8', { fatal: true });
let textFiles = 0;
let binaryOrInvalid = 0;
const owners = [];
for (const path of names) {
  const buf = execFileSync('git', ['-C', root, 'cat-file', 'blob', `${revision}:${path}`], { maxBuffer: 1 << 28 });
  let text;
  try {
    text = decoder.decode(buf);
  } catch {
    binaryOrInvalid++;
    continue;
  }
  textFiles++;
  const parsed = core.parseOwnerActRecord(text);
  if (parsed.owner.kind === 'missing') continue;
  owners.push({ path, kind: parsed.owner.kind, value: parsed.owner.kind === 'present' ? parsed.owner.value : parsed.owner.raw });
}

// 3. mutated live records
const PROSE = [
  ['none', (t) => t],
  ['title-claims-agent', (t) => t.replace(/^# /m, '# Drafted by agent: Claude Code — ')],
  ['effect-appended-agent-sentence', (t) => t.replace(/^## Effect\n\n/m, '## Effect\n\nThis act was drafted by codex and recorded by the syzygy daemon.\n\n')],
  ['effect-reflowed', (t) => t.replace(/(## Effect\n\n)([\s\S]*?)(\n\n## )/, (m, a, b, c) => a + b.replace(/\n/g, ' ') + c)],
  ['extra-head-recorded-by-agent', (t) => t.replace(/^(Owner: [^\n]*\n)/m, '$1\nRecorded by: agent: Claude Code\n')],
  ['owner-trailing-prose', (t) => t.replace(/^Owner: ([^\n]*)$/m, 'Owner: $1, recorded in a Claude Code session')],
  ['owner-continued', (t) => t.replace(/^Owner: ([^\n]*)$/m, 'Owner: $1\n(via agent: Claude Code)')],
  ['body-owner-after-heading', (t) => `${t}\nOwner: codex\n\nOwner: daemon\n`],
];
const OWNERS = ['<live>', 'Tzeusy', 'codex', 'gpt-5', 'GitHub Copilot', 'machine', 'Anthropic Claude', 'an llm', 'daemon',
  'automation: nightly', 'syzygy', 'ci/release', 'renovate[bot]', 'deploy-bot', 'review-agent', 'agent: Claude Code',
  'Somebody Else', 'Claudette', 'Tzeusy-bot', 'Tzeusy (via a Claude Code session)'];
const mutated = [];
for (const kind of ['consent', 'policy', 'registry']) {
  const live = bodyInputs[kind].actRecord;
  if (live.kind !== 'owner-act-record') {
    mutated.push({ kind, error: `live act record kind ${live.kind}` });
    continue;
  }
  for (const [proseId, prose] of PROSE) {
    for (const owner of OWNERS) {
      let text = live.text;
      if (owner !== '<live>') {
        if (!/^Owner: [^\n]*$/m.test(text)) throw new Error(`no Owner line in live ${kind} act`);
        text = text.replace(/^Owner: [^\n]*$/m, () => `Owner: ${owner}`);
      }
      text = prose(text);
      const ev = core.evaluateBodyReadAuthority({ ...bodyInputs, [kind]: { ...bodyInputs[kind], actRecord: { kind: 'owner-act-record', text } } });
      mutated.push({ kind, prose: proseId, owner, state: ev[kind].kind, caseId: ev[kind].kind === 'invalid' ? ev[kind].caseId : null, admits: ev.admits });
    }
  }
}

writeFileSync(out, JSON.stringify({
  revision,
  names: names.length,
  textFiles,
  binaryOrInvalid,
  ownerFields: owners.length,
  distinctOwners: [...new Set(owners.map((o) => o.value))],
  owners,
  body,
  judgment,
  mutated,
}, null, 2) + '\n');
console.log(`tracked ${names.length} text ${textFiles} other ${binaryOrInvalid} owner-fields ${owners.length} distinct ${new Set(owners.map((o) => o.value)).size} body.admits ${body.admits} judgment ${judgment.outcome.kind} mutated ${mutated.length}`);

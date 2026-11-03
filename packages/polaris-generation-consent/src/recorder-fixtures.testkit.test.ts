import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  loadRecorderForms, RECORDER_FORMS_TIMEOUT_MS, recorderRecordPaths, renderClassAct, renderDossierLocalAgentAct, renderLocalAgentSignoff, renderPolicyAct, renderProviderV2Act,
  renderRecorderAct, renderRegistryAct, type DossierLocalAgentActKey, type RecorderActKey,
} from './recorder-fixtures.testkit.js';

// The testkit renders each recorder once, with a slot per caller-supplied value, and fills the slots (syzygy-bpyt.4.8). This file
// holds every form it fills equal, byte for byte, to the recorder's own render of the same values, made the way the testkit made
// each render before: one `render_act` (or `render_record`) call with the values themselves. Each slot gets a value no other slot
// shares, so a slot filled from the wrong value, or left unfilled, differs.
beforeAll(loadRecorderForms, RECORDER_FORMS_TIMEOUT_MS);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const DIRECT_PY = `import json, pathlib, sys
sys.path.insert(0, 'scripts')
import record_public_repo_admission_acts as adm, record_public_egress_v2_act as eg2, record_rfc5_project_documentation_act as cls
import record_public_source_screening_scope_act as p1, record_public_source_screening_scope_v2_act as p2
import record_public_source_screening_scope_v3_act as p3, record_public_source_screening_scope_v4_act as p4
import record_public_source_screening_scope_v5_act as p5, record_dossier_local_agent_acts as dla
import record_dossier_agent_provider_v2_act as pv2, record_public_admission_registry_entries_acts as reg, record_versioned_signoff as vs

def render(c):
    f, a, d, i = c['form'], c.get('argument'), c.get('date'), c.get('instant')
    if f == 'recorder':
        m = eg2 if c['key'] == 'egress-anthropic-v2' else adm
        return m.render_act(m.ACT_BY_KEY[c['key']], a, d, 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*64, i)
    if f == 'policy':
        v, s = c['version'], c['superseded']
        if v == 1: return p1.render_act(p1.ACT, a, d, 'b'*64, 'c'*40, 'CONFIRM', p1.Selection('opening', 'label', 'description'), 'f'*64, i, '1'*64, '1.2.0-public-source-candidate.1')
        if v == 2: return p2.render_act(p2.ACT, a, 'none', d, 'b'*64, 'c'*40, 'CONFIRM', p2.Selection('opening', 'label', 'description'), 'f'*64, i, s, '2026-10-03', '1.2.0-public-source-candidate.2')
        if v == 3: return p3.render_act(p3.ACT, a, 'all', d, 'b'*64, 'c'*40, 'CONFIRM', p3.Selection('opening', 'label', 'description', p3.PACKET_WORDS[0]), 'f'*40, i, s, '2026-10-07', '1.4.0-public-source-candidate.1.none.code-all', 25)
        if v == 4: return p4.render_act(p4.ACT, a, 'span', d, 'b'*64, 'c'*40, 'CONFIRM', p4.OWNER_WORDS[0], 'f'*40, i, s, '2026-10-08', '1.5.0-public-source-candidate.1.none.code-all.redact-span', 'The effect paragraph.')
        return p5.render_act(p5.ACT, a, 'bcd', d, 'b'*64, 'c'*40, 'CONFIRM', p5.OWNER_WORDS[0], i, 'f'*40, i, s, '2026-10-20', '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd', 'The effect paragraph.')
    if f == 'class':
        return cls.render_act(a, d, 'b'*64, 'c'*40, 'CONFIRM', cls.Selection('opening', 'label', 'description'), 'f'*64, i)
    if f == 'dossier-local-agent':
        return dla.render_act(dla.ACT_BY_KEY[c['key']], a, d, 'b'*64, 'c'*40, 'CONFIRM', dla.Selection('opening', 'label', 'description'), 'f'*40, i)
    if f == 'provider-v2':
        return pv2.render_act(pv2.ACT, a, d, 'b'*64, 'c'*40, c['verdict'], pv2.Selection('opening', 'label', 'description', pv2.PACKET_WORDS[0]), 'f'*40, i, c['superseded'], c['supersededDate'])
    if f == 'registry':
        return reg.render_act(reg.ACT_BY_KEY['git-source-acquisition'], a, d, 'b'*64, 'c'*40, 'CONFIRM', reg.Selection('opening', 'label', 'description'), 'f'*64, i)
    if f == 'signoff':
        pkg = vs.real_packages()['public-git-source-acquisition-local-agent']
        return vs.render_record(pkg, '1.0', d, 'Extend Scope A and sign off v1.0', 'docs/reviews/R-STUB-RAW.md', 'c'*40, c['verdict'], c['disposition'], root=pathlib.Path(c['root']), instant=i)
    if f == 'paths':
        pkg = vs.real_packages()['public-git-source-acquisition-local-agent']
        return {'acts': {k: x.record.as_posix() for k, x in dla.ACT_BY_KEY.items()}, 'signoff': vs.record_rel(pkg, '1.0').as_posix()}
    raise ValueError(f)
sys.stdout.write(json.dumps([render(c) for c in json.load(sys.stdin)]))`;

/** The recorder's own render of each call, in one python3 run. */
async function direct(calls: readonly Record<string, unknown>[]): Promise<unknown[]> {
  const child = execFile('python3', ['-c', DIRECT_PY], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const done = new Promise<string>((resolve, reject) => {
    let out = '';
    let err = '';
    child.stdout!.on('data', (chunk: string) => { out += chunk; });
    child.stderr!.on('data', (chunk: string) => { err += chunk; });
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`direct render failed: ${err}`))));
  });
  child.stdin!.end(JSON.stringify(calls));
  return JSON.parse(await done) as unknown[];
}

const RECORDER_KEYS: readonly RecorderActKey[] = ['requests-observation', 'redis-observation', 'egress-anthropic', 'egress-anthropic-v2'];
const DOSSIER_KEYS: readonly DossierLocalAgentActKey[] = ['redis-no-evidence-drawer', 'redis-agent-anthropic', 'redis-agent-openai', 'd9-in-force', 'rfc7-20-reading-in-force'];
const A = '0123456789abcdef'.repeat(4);
const SUPERSEDED = 'fedcba9876543210'.repeat(4);
const DATE = '2026-10-11';
const INSTANT = '2026-10-12T08:09:10Z';
const SUPERSEDED_DATE = '2026-10-01';
const ENTRY_BYTES = 'entry bytes the sign-off digests\n';

interface Case { readonly name: string; readonly call: Record<string, unknown>; readonly kit: () => unknown }

let present = '';
let absent = '';
let cases: Case[] = [];
let expected: unknown[] = [];

beforeAll(async () => {
  present = fs.mkdtempSync(path.join(os.tmpdir(), 'recorder-kit-present-'));
  absent = fs.mkdtempSync(path.join(os.tmpdir(), 'recorder-kit-absent-'));
  const entry = path.join(present, installedPath());
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  fs.writeFileSync(entry, ENTRY_BYTES);
  const values = { argument: A, date: DATE, instant: INSTANT };
  cases = [
    ...RECORDER_KEYS.map((key) => ({ name: `recorder ${key}`, call: { form: 'recorder', key, ...values }, kit: () => renderRecorderAct(key, A, DATE, INSTANT) })),
    ...([1, 2, 3, 4, 5] as const).map((version) => ({
      name: `policy version ${version}`, call: { form: 'policy', version, superseded: SUPERSEDED, ...values }, kit: () => renderPolicyAct(A, DATE, INSTANT, version, SUPERSEDED),
    })),
    { name: 'policy version 1, default superseded', call: { form: 'policy', version: 1, superseded: '1'.repeat(64), ...values }, kit: () => renderPolicyAct(A, DATE, INSTANT) },
    { name: 'class', call: { form: 'class', ...values }, kit: () => renderClassAct(A, DATE, INSTANT) },
    ...DOSSIER_KEYS.map((key) => ({ name: `dossier local agent ${key}`, call: { form: 'dossier-local-agent', key, ...values }, kit: () => renderDossierLocalAgentAct(key, A, DATE, INSTANT) })),
    ...['CONFIRM', 'CONFIRM WITH EXCEPTIONS'].map((verdict) => ({
      name: `provider v2 ${verdict}`, call: { form: 'provider-v2', verdict, superseded: SUPERSEDED, supersededDate: SUPERSEDED_DATE, ...values },
      kit: () => renderProviderV2Act(A, DATE, INSTANT, SUPERSEDED, SUPERSEDED_DATE, verdict),
    })),
    { name: 'registry', call: { form: 'registry', ...values }, kit: () => renderRegistryAct(A, DATE, INSTANT) },
    ...[present, absent].flatMap((root) => ([['CONFIRM', null], ['CONFIRM WITH EXCEPTIONS', 'pkg/ROUND-1-DISPOSITIONS.md']] as const).map(([verdict, disposition]) => ({
      name: `sign-off, entry ${root === present ? 'installed' : 'absent'}, ${verdict}, disposition ${disposition ?? 'none'}`,
      call: { form: 'signoff', root, verdict, disposition, date: DATE, instant: INSTANT }, kit: () => renderLocalAgentSignoff(root, DATE, INSTANT, verdict, disposition),
    }))),
    { name: 'record paths', call: { form: 'paths' }, kit: () => recorderRecordPaths() },
  ];
  expected = await direct(cases.map(({ call }) => call));
}, 120_000);

afterAll(() => {
  for (const dir of [present, absent]) if (dir !== '') fs.rmSync(dir, { recursive: true, force: true });
});

/** The installed entry's path, read from the sign-off the testkit renders: the record names it on its `Installed entry:` line. */
function installedPath(): string {
  const line = /^Installed entry: (.+)$/m.exec(renderLocalAgentSignoff(os.tmpdir(), DATE, INSTANT));
  if (line === null) throw new Error('the sign-off names no installed entry');
  return line[1]!;
}

describe('recorder testkit renders', () => {
  it('fill every form exactly as the recorder renders the same values', () => {
    expect(cases.length).toBe(4 + 5 + 1 + 1 + 5 + 2 + 1 + 4 + 1);
    expect(cases.map(({ name, kit }) => [name, kit()])).toEqual(cases.map(({ name }, index) => [name, expected[index]]));
  });

  it('digest the installed entry, and write absent without one', () => {
    const installed = renderLocalAgentSignoff(present, DATE, INSTANT);
    expect(installed).toMatch(/^Installed entry SHA-256: [0-9a-f]{64}$/m);
    expect(installed).not.toContain('Installed entry SHA-256: absent');
    expect(renderLocalAgentSignoff(absent, DATE, INSTANT)).toContain('Installed entry SHA-256: absent');
  });

  it('refuse an empty disposition, which the recorder would write as none', () => {
    expect(() => renderLocalAgentSignoff(present, DATE, INSTANT, 'CONFIRM', '')).toThrow(/empty disposition/);
  });
});

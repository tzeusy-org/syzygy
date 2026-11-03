/** Test support. Owner-act text rendered by the real recorders (scripts/record_public_repo_admission_acts.py, the registry-entry recorder and
 * scripts/record_public_egress_v2_act.py), so a reader's expected forms are tested against what the writer writes.
 *
 * Each recorder renders once per process, when this module loads, through one asynchronous python3 run (syzygy-bpyt.4.8): it renders
 * every act form with a NUL-delimited slot (`\0argument\0`) for each value a caller supplies, and a render fills the slots. A render
 * therefore never blocks the vitest worker, and costs no child process. The recorders treat each slotted value as opaque text (they
 * interpolate it and branch on none); recorder-fixtures.testkit.test.ts holds a render made this way equal to the recorder's own
 * render of the same values, per form. */
import { execFile } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { sha256 } from '@syzygy/support';

export type RecorderActKey = 'requests-observation' | 'redis-observation' | 'egress-anthropic' | 'egress-anthropic-v2';
export type DossierLocalAgentActKey = 'redis-no-evidence-drawer' | 'redis-agent-anthropic' | 'redis-agent-openai' | 'd9-in-force' | 'rfc7-20-reading-in-force';
const RECORDER_KEYS: readonly RecorderActKey[] = ['requests-observation', 'redis-observation', 'egress-anthropic', 'egress-anthropic-v2'];
const DOSSIER_LOCAL_AGENT_KEYS: readonly DossierLocalAgentActKey[] = ['redis-no-evidence-drawer', 'redis-agent-anthropic', 'redis-agent-openai', 'd9-in-force', 'rfc7-20-reading-in-force'];
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** The python3 program that renders every form, each with a slot per caller-supplied value, as one JSON object. The arguments of
 * each `render_act` call are the ones the per-call renders passed before syzygy-bpyt.4.8, with each interpolated value a slot. The
 * sign-off renders over two scratch roots, one holding the installed entry and one not, with the entry's digest a slot. */
const RENDER_TEMPLATES_PY = `import json, pathlib, sys, tempfile
sys.path.insert(0, 'scripts')
import record_public_repo_admission_acts as adm, record_public_egress_v2_act as eg2, record_rfc5_project_documentation_act as cls
import record_public_source_screening_scope_act as p1, record_public_source_screening_scope_v2_act as p2
import record_public_source_screening_scope_v3_act as p3, record_public_source_screening_scope_v4_act as p4
import record_public_source_screening_scope_v5_act as p5, record_dossier_local_agent_acts as dla
import record_dossier_agent_provider_v2_act as pv2, record_public_admission_registry_entries_acts as reg, record_versioned_signoff as vs
recorder_keys, dossier_keys = json.loads(sys.argv[1]), json.loads(sys.argv[2])
S = lambda name: '\\0' + name + '\\0'
A, D, I, SUP, SUPD, V, DISP, SHA = map(S, ['argument', 'date', 'instant', 'superseded', 'supersededDate', 'verdict', 'disposition', 'sha'])
t = {}
for key in recorder_keys:
    m = eg2 if key == 'egress-anthropic-v2' else adm
    t['recorder:' + key] = m.render_act(m.ACT_BY_KEY[key], A, D, 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*64, I)
m = p1
t['policy:1'] = m.render_act(m.ACT, A, D, 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*64, I, '1'*64, '1.2.0-public-source-candidate.1')
m = p2
t['policy:2'] = m.render_act(m.ACT, A, 'none', D, 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*64, I, SUP, '2026-10-03', '1.2.0-public-source-candidate.2')
m = p3
t['policy:3'] = m.render_act(m.ACT, A, 'all', D, 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description', m.PACKET_WORDS[0]), 'f'*40, I, SUP, '2026-10-07', '1.4.0-public-source-candidate.1.none.code-all', 25)
m = p4
t['policy:4'] = m.render_act(m.ACT, A, 'span', D, 'b'*64, 'c'*40, 'CONFIRM', m.OWNER_WORDS[0], 'f'*40, I, SUP, '2026-10-08', '1.5.0-public-source-candidate.1.none.code-all.redact-span', 'The effect paragraph.')
m = p5
t['policy:5'] = m.render_act(m.ACT, A, 'bcd', D, 'b'*64, 'c'*40, 'CONFIRM', m.OWNER_WORDS[0], I, 'f'*40, I, SUP, '2026-10-20', '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd', 'The effect paragraph.')
t['class'] = cls.render_act(A, D, 'b'*64, 'c'*40, 'CONFIRM', cls.Selection('opening', 'label', 'description'), 'f'*64, I)
for key in dossier_keys:
    t['dossier-local-agent:' + key] = dla.render_act(dla.ACT_BY_KEY[key], A, D, 'b'*64, 'c'*40, 'CONFIRM', dla.Selection('opening', 'label', 'description'), 'f'*40, I)
t['provider-v2'] = pv2.render_act(pv2.ACT, A, D, 'b'*64, 'c'*40, V, pv2.Selection('opening', 'label', 'description', pv2.PACKET_WORDS[0]), 'f'*40, I, SUP, SUPD)
t['registry'] = reg.render_act(reg.ACT_BY_KEY['git-source-acquisition'], A, D, 'b'*64, 'c'*40, 'CONFIRM', reg.Selection('opening', 'label', 'description'), 'f'*64, I)
pkg = vs.real_packages()['public-git-source-acquisition-local-agent']
digest = vs.beh.digest
vs.beh.digest = lambda data: SHA
try:
    with tempfile.TemporaryDirectory() as present, tempfile.TemporaryDirectory() as absent:
        entry = pathlib.Path(present) / pkg.installed
        entry.parent.mkdir(parents=True, exist_ok=True)
        entry.write_bytes(b'')
        for state, root in (('present', present), ('absent', absent)):
            for named, disposition in (('none', None), ('named', DISP)):
                t['signoff:' + state + ':' + named] = vs.render_record(pkg, '1.0', D, 'Extend Scope A and sign off v1.0', 'docs/reviews/R-STUB-RAW.md', 'c'*40, V, disposition, root=pathlib.Path(root), instant=I)
finally:
    vs.beh.digest = digest
paths = {'acts': {k: a.record.as_posix() for k, a in dla.ACT_BY_KEY.items()}, 'signoff': vs.record_rel(pkg, '1.0').as_posix()}
sys.stdout.write(json.dumps({'templates': t, 'paths': paths, 'installed': pkg.installed.as_posix()}))`;

interface Rendered {
  readonly templates: Readonly<Record<string, string>>;
  readonly paths: { readonly acts: Readonly<Record<DossierLocalAgentActKey, string>>; readonly signoff: string };
  readonly installed: string;
}

const RENDERED: Rendered = await (async () => {
  try {
    const { stdout } = await promisify(execFile)('python3', ['-c', RENDER_TEMPLATES_PY, JSON.stringify(RECORDER_KEYS), JSON.stringify(DOSSIER_LOCAL_AGENT_KEYS)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(stdout) as Rendered;
  } catch (error) {
    throw new Error(`recorder render failed: ${(error as { stderr?: string }).stderr ?? String(error)}`);
  }
})();

/** The form `id` with each slot filled from `values`. A slot with no value, or a form the recorders did not render, throws. */
function fill(id: string, values: Readonly<Record<string, string>>): string {
  const template = RENDERED.templates[id];
  if (template === undefined) throw new Error(`recorder render failed: no form ${id}`);
  return template.replace(/\0(\w+)\0/g, (_, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`recorder render failed: form ${id} has no value for slot ${name}`);
    return value;
  });
}

/** The act record the recorder renders for `key`, with the given argument digest, date and `Recorded at (UTC)` instant. */
export function renderRecorderAct(key: RecorderActKey, argument: string, date: string, instant: string): string {
  return fill(`recorder:${key}`, { argument, date, instant });
}

/** The public-source screening-scope policy act as scripts/record_public_source_screening_scope_act.py (version 1),
 * scripts/record_public_source_screening_scope_v2_act.py (version 2), scripts/record_public_source_screening_scope_v3_act.py
 * (version 3, variant `all`, superseding a version-2 act of 2026-10-07) or scripts/record_public_source_screening_scope_v4_act.py
 * (version 4, variant `span`, superseding a version-3 act of 2026-10-08) or scripts/record_public_source_screening_scope_v5_act.py
 * (version 5, variant `bcd`, superseding a version-4 act of 2026-10-20) renders it. Version 1 names its own superseded digest. */
export function renderPolicyAct(argument: string, date: string, instant: string, version: 1 | 2 | 3 | 4 | 5 = 1, supersededArgument = '1'.repeat(64)): string {
  return fill(`policy:${version}`, { argument, date, instant, superseded: supersededArgument });
}

/** The RFC5-14 project-documentation class amendment act as scripts/record_rfc5_project_documentation_act.py renders it. */
export function renderClassAct(argument: string, date: string, instant: string): string {
  return fill('class', { argument, date, instant });
}

/** One act of the local-agent dossier sitting as scripts/record_dossier_local_agent_acts.py renders it. */
export function renderDossierLocalAgentAct(key: DossierLocalAgentActKey, argument: string, date: string, instant: string): string {
  return fill(`dossier-local-agent:${key}`, { argument, date, instant });
}

/** The version-2 Redis Anthropic statement act as scripts/record_dossier_agent_provider_v2_act.py renders it, superseding a version-1
 * act of `supersededDate` over `superseded`, with the packet words the owner's option maps to. */
export function renderProviderV2Act(argument: string, date: string, instant: string, superseded: string, supersededDate: string, verdict = 'CONFIRM'): string {
  return fill('provider-v2', { argument, date, instant, superseded, supersededDate, verdict });
}

/** The version-tagged sign-off record of the local-agent source-acquisition entry, v1.0, as scripts/record_versioned_signoff.py renders
 * it over the entry installed under `root` (the record carries the SHA-256 of those bytes, or `absent` when `root` holds no entry
 * file), with the given verdict and disposition record (none when null). Reads `root` at each call. */
export function renderLocalAgentSignoff(root: string, date: string, instant: string, verdict = 'CONFIRM', disposition: string | null = null): string {
  // The recorder writes `disposition or "none"`: an empty disposition would read as none there and as itself here.
  if (disposition === '') throw new Error('recorder render failed: an empty disposition renders as none');
  const entry = path.join(root, RENDERED.installed);
  let installed: Uint8Array | null = null;
  try {
    if (statSync(entry).isFile()) installed = readFileSync(entry);
  } catch { /* no entry file: the recorder writes absent */ }
  const id = `signoff:${installed === null ? 'absent' : 'present'}:${disposition === null ? 'none' : 'named'}`;
  return fill(id, { date, instant, verdict, ...(disposition === null ? {} : { disposition }), ...(installed === null ? {} : { sha: sha256(installed) }) });
}

/** Where the recorders write each record, relative to the repository root: the five sitting acts (`Act.record`) and the v1.0
 * sign-off (`record_rel`). A reader keyed on another file name would read a recorded act as absent. */
export function recorderRecordPaths(): { readonly acts: Readonly<Record<DossierLocalAgentActKey, string>>; readonly signoff: string } {
  return { acts: { ...RENDERED.paths.acts }, signoff: RENDERED.paths.signoff };
}

/** Alterations of an act record that leave every head field as it was (syzygy-bpyt.8.10): the first paragraph of its Effect (`What
 * this records` in a sign-off) replaced by a grant of everything, its limits section (`What this does not do` in a sign-off) removed,
 * the owner's selection replaced by `Decline` (the label cell of the ceremony's selection row, else the first quoted owner words,
 * else the `Owner selection:` line), and a section withdrawing the act appended to the record itself. Each returns the text unchanged
 * when the record has nothing it applies to; a caller asserts it took. */
export const PROSE_ALTERATIONS: ReadonlyArray<readonly [name: string, alter: (text: string) => string]> = Object.freeze([
  ['effect-widened', (text: string) => text.replace(/(\n## (?:Effect|What this records)\n\n)[^\n]+(?:\n[^\n]+)*/, '$1The act grants every read, egress, write and execution, for every repository, tool and provider.')],
  ['limits-removed', (text: string) => text.replace(/\n## What this (?:act does not authorize|does not do)\n[\s\S]*?(?=\n## |$)/, '')],
  ['selection-replaced', (text: string) => {
    for (const [pattern, replacement] of [[/^\| "[^"\n]*" \| "/m, '| "Decline" | "'], [/^> .+$/m, '> Decline'], [/^Owner selection: .+$/m, 'Owner selection: Decline']] as const) {
      if (pattern.test(text)) return text.replace(pattern, replacement);
    }
    return text;
  }],
  ['withdrawal-appended', (text: string) => `${text}\n## Withdrawal\n\nThe owner withdraws this act; it no longer counts.\n`],
]);
/** The control for `PROSE_ALTERATIONS`: one head field every reader reads, the `Date:` line, altered. */
export const HEAD_FIELD_ALTERATION = (text: string): string => text.replace(/^(Date: .+)$/m, '$1 [altered]');

/** The public Git-hosting source-acquisition registry entry act as scripts/record_public_admission_registry_entries_acts.py renders it
 * (key `git-source-acquisition`). */
export function renderRegistryAct(argument: string, date: string, instant: string): string {
  return fill('registry', { argument, date, instant });
}

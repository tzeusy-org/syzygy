/** Test support. Owner-act text rendered by the real recorders (scripts/record_public_repo_admission_acts.py, the registry-entry recorder and
 * scripts/record_public_egress_v2_act.py), so a reader's expected forms are tested against what the writer writes. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type RecorderActKey = 'requests-observation' | 'redis-observation' | 'egress-anthropic' | 'egress-anthropic-v2';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const cache = new Map<string, string>();

/** The act record the recorder renders for `key`, with the given argument digest, date and `Recorded at (UTC)` instant. */
export function renderRecorderAct(key: RecorderActKey, argument: string, date: string, instant: string): string {
  const id = [key, argument, date, instant].join('|');
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const module = key === 'egress-anthropic-v2' ? 'record_public_egress_v2_act' : 'record_public_repo_admission_acts';
  const py = `import sys; sys.path.insert(0, 'scripts'); import ${module} as m
sys.stdout.write(m.render_act(m.ACT_BY_KEY['${key}'], '${argument}', '${date}', 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*64, '${instant}'))`;
  const run = spawnSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`recorder render failed: ${run.stderr}`);
  cache.set(id, run.stdout);
  return run.stdout;
}

/** The public-source screening-scope policy act as scripts/record_public_source_screening_scope_act.py (version 1),
 * scripts/record_public_source_screening_scope_v2_act.py (version 2), scripts/record_public_source_screening_scope_v3_act.py
 * (version 3, variant `all`, superseding a version-2 act of 2026-10-07) or scripts/record_public_source_screening_scope_v4_act.py
 * (version 4, variant `span`, superseding a version-3 act of 2026-10-08) or scripts/record_public_source_screening_scope_v5_act.py
 * (version 5, variant `bcd`, superseding a version-4 act of 2026-10-20) renders it. */
export function renderPolicyAct(argument: string, date: string, instant: string, version: 1 | 2 | 3 | 4 | 5 = 1, supersededArgument = '1'.repeat(64)): string {
  const id = ['policy', version, argument, date, instant, supersededArgument].join('|');
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const py = version === 1
    ? `import sys; sys.path.insert(0, 'scripts'); import record_public_source_screening_scope_act as m
sys.stdout.write(m.render_act(m.ACT, '${argument}', '${date}', 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*64, '${instant}', '1'*64, '1.2.0-public-source-candidate.1'))`
    : version === 2
      ? `import sys; sys.path.insert(0, 'scripts'); import record_public_source_screening_scope_v2_act as m
sys.stdout.write(m.render_act(m.ACT, '${argument}', 'none', '${date}', 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*64, '${instant}', '${supersededArgument}', '2026-10-03', '1.2.0-public-source-candidate.2'))`
      : version === 3
        ? `import sys; sys.path.insert(0, 'scripts'); import record_public_source_screening_scope_v3_act as m
sys.stdout.write(m.render_act(m.ACT, '${argument}', 'all', '${date}', 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description', m.PACKET_WORDS[0]), 'f'*40, '${instant}', '${supersededArgument}', '2026-10-07', '1.4.0-public-source-candidate.1.none.code-all', 25))`
        : version === 4
          ? `import sys; sys.path.insert(0, 'scripts'); import record_public_source_screening_scope_v4_act as m
sys.stdout.write(m.render_act(m.ACT, '${argument}', 'span', '${date}', 'b'*64, 'c'*40, 'CONFIRM', m.OWNER_WORDS[0], 'f'*40, '${instant}', '${supersededArgument}', '2026-10-08', '1.5.0-public-source-candidate.1.none.code-all.redact-span', 'The effect paragraph.'))`
          : `import sys; sys.path.insert(0, 'scripts'); import record_public_source_screening_scope_v5_act as m
sys.stdout.write(m.render_act(m.ACT, '${argument}', 'bcd', '${date}', 'b'*64, 'c'*40, 'CONFIRM', m.OWNER_WORDS[0], '${instant}', 'f'*40, '${instant}', '${supersededArgument}', '2026-10-20', '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd', 'The effect paragraph.'))`;
  const run = spawnSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`recorder render failed: ${run.stderr}`);
  cache.set(id, run.stdout);
  return run.stdout;
}

/** The RFC5-14 project-documentation class amendment act as scripts/record_rfc5_project_documentation_act.py renders it. */
export function renderClassAct(argument: string, date: string, instant: string): string {
  const id = ['class', argument, date, instant].join('|');
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const py = `import sys; sys.path.insert(0, 'scripts'); import record_rfc5_project_documentation_act as m
sys.stdout.write(m.render_act('${argument}', '${date}', 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*64, '${instant}'))`;
  const run = spawnSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`recorder render failed: ${run.stderr}`);
  cache.set(id, run.stdout);
  return run.stdout;
}

export type DossierLocalAgentActKey = 'redis-no-evidence-drawer' | 'redis-agent-anthropic' | 'redis-agent-openai' | 'd9-in-force' | 'rfc7-20-reading-in-force';

/** One act of the local-agent dossier sitting as scripts/record_dossier_local_agent_acts.py renders it. */
export function renderDossierLocalAgentAct(key: DossierLocalAgentActKey, argument: string, date: string, instant: string): string {
  const id = ['dossier-local-agent', key, argument, date, instant].join('|');
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const py = `import sys; sys.path.insert(0, 'scripts'); import record_dossier_local_agent_acts as m
sys.stdout.write(m.render_act(m.ACT_BY_KEY['${key}'], '${argument}', '${date}', 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*40, '${instant}'))`;
  const run = spawnSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`recorder render failed: ${run.stderr}`);
  cache.set(id, run.stdout);
  return run.stdout;
}

/** The version-2 Redis Anthropic statement act as scripts/record_dossier_agent_provider_v2_act.py renders it, superseding a version-1
 * act of `supersededDate` over `superseded`, with the packet words the owner's option maps to. */
export function renderProviderV2Act(argument: string, date: string, instant: string, superseded: string, supersededDate: string, verdict = 'CONFIRM'): string {
  const id = ['provider-v2', argument, date, instant, superseded, supersededDate, verdict].join('|');
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const py = `import sys; sys.path.insert(0, 'scripts'); import record_dossier_agent_provider_v2_act as m
sys.stdout.write(m.render_act(m.ACT, '${argument}', '${date}', 'b'*64, 'c'*40, '${verdict}', m.Selection('opening', 'label', 'description', m.PACKET_WORDS[0]), 'f'*40, '${instant}', '${superseded}', '${supersededDate}'))`;
  const run = spawnSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`recorder render failed: ${run.stderr}`);
  cache.set(id, run.stdout);
  return run.stdout;
}

/** The version-tagged sign-off record of the local-agent source-acquisition entry, v1.0, as scripts/record_versioned_signoff.py renders
 * it over the entry installed under `root` (the record carries the SHA-256 of those bytes), with the given verdict and disposition
 * record (none when null). Not cached: it reads `root`. */
export function renderLocalAgentSignoff(root: string, date: string, instant: string, verdict = 'CONFIRM', disposition: string | null = null): string {
  const py = `import json, pathlib, sys; sys.path.insert(0, 'scripts'); import record_versioned_signoff as m
pkg = m.real_packages()['public-git-source-acquisition-local-agent']
sys.stdout.write(m.render_record(pkg, '1.0', '${date}', 'Extend Scope A and sign off v1.0', 'docs/reviews/R-STUB-RAW.md', 'c'*40, sys.argv[2], json.loads(sys.argv[3]), root=pathlib.Path(sys.argv[1]), instant='${instant}'))`;
  const run = spawnSync('python3', ['-c', py, root, verdict, JSON.stringify(disposition)], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`recorder render failed: ${run.stderr}`);
  return run.stdout;
}

/** Where the recorders write each record, relative to the repository root: the five sitting acts (`Act.record`) and the v1.0
 * sign-off (`record_rel`). A reader keyed on another file name would read a recorded act as absent. */
export function recorderRecordPaths(): { readonly acts: Readonly<Record<DossierLocalAgentActKey, string>>; readonly signoff: string } {
  const py = `import json, sys; sys.path.insert(0, 'scripts'); import record_dossier_local_agent_acts as m, record_versioned_signoff as vs
pkg = vs.real_packages()['public-git-source-acquisition-local-agent']
sys.stdout.write(json.dumps({'acts': {k: a.record.as_posix() for k, a in m.ACT_BY_KEY.items()}, 'signoff': vs.record_rel(pkg, '1.0').as_posix()}))`;
  const run = spawnSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`recorder paths failed: ${run.stderr}`);
  return JSON.parse(run.stdout) as { acts: Record<DossierLocalAgentActKey, string>; signoff: string };
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
  const id = ['registry', argument, date, instant].join('|');
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const py = `import sys; sys.path.insert(0, 'scripts'); import record_public_admission_registry_entries_acts as m
sys.stdout.write(m.render_act(m.ACT_BY_KEY['git-source-acquisition'], '${argument}', '${date}', 'b'*64, 'c'*40, 'CONFIRM', m.Selection('opening', 'label', 'description'), 'f'*64, '${instant}'))`;
  const run = spawnSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`recorder render failed: ${run.stderr}`);
  cache.set(id, run.stdout);
  return run.stdout;
}

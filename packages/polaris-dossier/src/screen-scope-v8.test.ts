import * as fs from 'node:fs';
import * as path from 'node:path';
import { DECISIONS_DIR, POLICY_PATH } from '@syzygy/polaris-generation-consent';
import { loadRecorderForms, renderPolicyAct } from '@syzygy/polaris-generation-consent/testing';
import { sha256 } from '@syzygy/support';
import { tempDir } from '@syzygy/test-kit';
import { beforeAll, describe, expect, it } from 'vitest';
import { NON_PUBLIC_SUCCESSOR, policyAdmitsNonPublic } from './launch-cli.js';
import { buildDossierScreen, loadDossierScreen, type DossierScreen } from './screen.js';
import { V7, V8 } from './screening-v8.testkit.js';
import type { VisibilityDecision } from './source-visibility-gate.js';

await loadRecorderForms();

/** Screening scope version 8 (variant `pv`) in the dossier's screen. A public repository is screened exactly as under version 7, which
 * keeps the existing Redis consent's runs as they are; a private one never retains a body as redacted-span; and a policy without
 * `sourceVisibility` refuses a private one. Expected values are literals written from the policy text. Integration tier: the recorder forms are loaded from the recorder scripts. */

const REDIS = { repository: 'repository:redis-redis', commit: '498ecd0d6d007db11ddb3aea9428552598a78622' };
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const screenOf = (text: string, visibility: 'public' | 'private', subject = REDIS): DossierScreen => {
  const load = buildDossierScreen(encode(text), true, subject, visibility);
  if (!load.ok) throw new Error(load.why);
  return load.screen;
};
// A credential assignment in a project-documentation body: version 4's span redaction withholds the line and its guard lines.
const CREDENTIAL = ['# Setup', '', 'Run the server.', '', 'password = "hunter2hunter2"', '', 'Then stop it.', '', 'More text here.', '', 'End.', ''].join('\n');
const PATHS = ['README.md', 'docs/setup.md', 'src/server.c', '.env', 'keys/server.pem', 'redis.conf', 'src/README.md', 'SECURITY.md', 'docs/design.md', 'tests/a.tcl'];
const BODIES: readonly [string, string][] = [
  ['README.md', '# Redis\n\nA store.\n'],
  ['README.md', CREDENTIAL],
  ['src/server.c', 'int main(void) { return 0; }\n'],
  ['src/server.c', 'const char *password = "hunter2hunter2";\n'],
  ['README.md', '-----BEGIN RSA PRIVATE KEY-----\nabc\n'],
  ['README.md', '<script>alert(1)</script>\n'],
  ['redis.conf', 'requirepass foobared\n'],
];

describe.runIf(V7 !== null)('a public repository under version 8 is screened exactly as under version 7', () => {
  // Built in beforeAll: describe.runIf still runs this body at collection, and V7 is null once the act applies version 8.
  let before: DossierScreen, after: DossierScreen;
  beforeAll(() => { before = screenOf(V7!, 'public'); after = screenOf(V8, 'public'); });
  it('every path, its class, and every body of the population', () => {
    expect(PATHS.map(p => [p, after.screenPath(p), after.contentClass(p)])).toEqual(PATHS.map(p => [p, before.screenPath(p), before.contentClass(p)]));
    expect(BODIES.map(([p, b]) => after.screenTargetBody(b, p))).toEqual(BODIES.map(([p, b]) => before.screenTargetBody(b, p)));
    expect(BODIES.map(([p, b]) => after.screenBody(b, p))).toEqual(BODIES.map(([p, b]) => before.screenBody(b, p)));
  });
  it('the credential body is still retained as redacted-span, its line and guard lines withheld', () => {
    expect(after.screenTargetBody(CREDENTIAL, 'README.md')).toMatchObject({ kind: 'redacted', withheld: [4, 5, 6] });
    expect(after.visibility).toBe('public');
    expect(after.policyVersion).toBe('1.9.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p.v7-s.v8-pv');
  });
});

describe('a private repository under version 8', () => {
  const screen = screenOf(V8, 'private', { repository: 'repository:o-r', commit: 'a'.repeat(40) });
  it('excludes a detector-matched body whole in every class, never as redacted-span', () => {
    expect(screen.screenTargetBody(CREDENTIAL, 'README.md')).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
    expect(screen.screenTargetBody('const char *password = "hunter2hunter2";\n', 'src/server.c')).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
    expect(screen.visibility).toBe('private');
  });
  it('admits a clean body and screens paths as for a public one', () => {
    expect(screen.screenTargetBody('# Redis\n\nA store.\n', 'README.md')).toEqual({ kind: 'admitted' });
    expect(screen.screenPath('.env')).toBe('denied-path');
    expect(screen.screenPath('src/server.c')).toBeUndefined();
  });
  it('is what a version-8 screen built with no visibility gives: private, never the looser public', () => {
    const load = buildDossierScreen(encode(V8), true, { repository: 'repository:o-r', commit: 'a'.repeat(40) });
    expect(load.ok && [load.screen.visibility, load.screen.screenTargetBody(CREDENTIAL, 'README.md')]).toEqual(['private', { kind: 'excluded', outcome: 'secret-detector-match' }]);
  });
});

describe.runIf(V7 !== null)('a policy without sourceVisibility (version 7)', () => {
  it('refuses a private repository', () => {
    expect(buildDossierScreen(encode(V7!), true, REDIS, 'private')).toEqual({ ok: false, why: 'the screening policy cannot be applied: the repository is not public at this commit (no effective observation consent record of its pair states public through its carrier for every record), and this policy admits public repositories only' });
  });
});

describe('loadDossierScreen decides the subject\'s visibility under version 8 only', () => {
  const NOW = Date.UTC(2026, 10, 10);
  const recordsRoot = (policy: string): string => {
    const root = tempDir('dossier-screen-v8-');
    for (const [rel, body] of [[POLICY_PATH, policy], [`${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md`, renderPolicyAct(sha256(policy), '2026-10-04', '2026-10-04T10:00:00Z')]] as const) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), body);
    }
    return root;
  };
  const asked: unknown[] = [];
  const decide = (decision: VisibilityDecision) => async (subject: unknown) => { asked.push(subject); return decision; };
  it('builds the screen for the decided visibility', async () => {
    const root = recordsRoot(V8);
    const pub = await loadDossierScreen(root, NOW, undefined, REDIS, decide({ ok: true, visibility: 'public', carriers: [] }));
    const priv = await loadDossierScreen(root, NOW, undefined, REDIS, decide({ ok: true, visibility: 'private', carriers: [] }));
    expect([pub.ok && pub.screen.visibility, priv.ok && priv.screen.visibility]).toEqual(['public', 'private']);
    expect(asked).toEqual([REDIS, REDIS]);
  });
  it('refuses when a consent record cannot be read', async () => {
    const load = await loadDossierScreen(recordsRoot(V8), NOW, undefined, REDIS, decide({ ok: false, why: 'a launch consent record cannot be read: x' }));
    expect(load).toEqual({ ok: false, why: 'the screening policy cannot be applied: a launch consent record cannot be read: x' });
  });
  it('builds a screen for no subject as private', async () => {
    const load = await loadDossierScreen(recordsRoot(V8), NOW, undefined, null, async () => { throw new Error('not asked'); });
    expect(load.ok && load.screen.visibility).toBe('private');
  });
  it('the launch admits a repository not declared public only under version 8 (REQ-polaris-generation-046, line 25)', async () => {
    expect(await policyAdmitsNonPublic(recordsRoot(V8), NOW)).toEqual({ admitted: true, successor: NON_PUBLIC_SUCCESSOR });
    if (V7 !== null) expect(await policyAdmitsNonPublic(recordsRoot(V7), NOW)).toEqual({ admitted: false, successor: NON_PUBLIC_SUCCESSOR });
    expect(await policyAdmitsNonPublic(recordsRoot(V8), Date.UTC(2026, 9, 1))).toEqual({ admitted: false, successor: NON_PUBLIC_SUCCESSOR });
  });
  it.runIf(V7 !== null)('under version 7 asks nothing and builds public', async () => {
    const load = await loadDossierScreen(recordsRoot(V7!), NOW, undefined, REDIS, async () => { throw new Error('not asked'); });
    expect(load.ok && load.screen.visibility).toBe('public');
  });
});

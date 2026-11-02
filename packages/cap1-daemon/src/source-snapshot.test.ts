import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { actText, artifactText, defaultActFields, writeConsent } from '../test-support/consent-acts.js';
import { evaluateCapturedProject, evaluateProject } from './pipeline.js';
import { humanRoutes, HUMAN_ENTRY_ROUTE_PATH } from './routes-human.js';
import {
  captureProjectInputs,
  DAEMON_CAPTURE_VERSIONS,
  fsCaptureReader,
  type CaptureDependencies,
  type CaptureReader,
  type CapturedProjectInputs,
} from './source-snapshot.js';

// syzygy-u2a.2 — the captured snapshot: the evaluation's snapshot is the
// SHA-256 of a canonical manifest of every consumed input (asOf excluded),
// the capture reads each input once and revalidates it, and nothing after
// the capture reaches the filesystem. Expected values are literals or are
// recomputed here independently (node:crypto over the manifest JSON), never
// read back from the module under test.

const AS_OF = '2026-08-24T00:00:00Z';
const PROJECT = 'prj-snapshot';

const cleanups: string[] = [];
afterEach(() => {
  for (const dir of cleanups.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(dir);
  return dir;
}

const DECLARATION = `
schema_version: "1"
project:
  id: ${PROJECT}
  name: Snapshot Fixture
owner: test-owner@example.com
repositories:
  - id: repo-gov
    role: governance-root
    consent: c-gov
  - id: repo-src
    role: observed-source
    consent: c-src
consents:
  - c-gov
  - c-src
declarations:
  spec_root: openspec/
relations: []
profiles: []
`;

interface Fixture {
  readonly root: string;
  readonly src: string;
  readonly decisions: string;
}

function fixture(): Fixture {
  const root = tempDir('snap-root-');
  const src = tempDir('snap-src-');
  const decisions = join(root, '.syzygy', 'governance', 'decisions');
  mkdirSync(join(root, '.syzygy', 'intent'), { recursive: true });
  writeFileSync(join(root, '.syzygy', 'project.yaml'), DECLARATION, 'utf8');
  writeFileSync(join(root, '.syzygy', 'intent', 'OVERVIEW.md'), '# overview v1\n', 'utf8');
  writeConsent(decisions, { id: 'c-gov', project: PROJECT, repository: 'repo-gov' });
  writeConsent(decisions, { id: 'c-src', project: PROJECT, repository: 'repo-src' });
  return { root, src, decisions };
}

function deps(f: Fixture, extra: Partial<CaptureDependencies> = {}): CaptureDependencies {
  return {
    asOf: AS_OF,
    versions: DAEMON_CAPTURE_VERSIONS,
    repositoryRoots: { 'repo-gov': f.root, 'repo-src': f.src },
    ...extra,
  };
}

async function capture(f: Fixture, extra: Partial<CaptureDependencies> = {}): Promise<CapturedProjectInputs> {
  const result = await captureProjectInputs(f.root, deps(f, extra));
  if ('kind' in result) throw new Error(`capture failed: ${result.kind}`);
  return result;
}

// An independent canonical encoder: sorted keys, no whitespace.
function independentCanonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(independentCanonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${independentCanonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function countingReader(base: CaptureReader = fsCaptureReader): CaptureReader & { readonly calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    readBytes: (root, path) => {
      calls.push(`read:${path}`);
      return base.readBytes(root, path);
    },
    listRoot: (root) => {
      calls.push(`list:${root}`);
      return base.listRoot(root);
    },
  };
}

describe('the evaluation snapshot is the digest of the captured inputs', () => {
  it('a caller cannot inject a snapshot label; the snapshot is the sha256 of the canonical manifest', async () => {
    const f = fixture();
    const forged = { ...deps(f), evaluation: { snapshot: 'forged', asOf: AS_OF } } as CaptureDependencies;
    const result = await evaluateProject(f.root, forged);
    if (result.kind !== 'project-evaluated') throw new Error(result.kind);
    expect(result.model.evaluation.snapshot).not.toBe('forged');
    expect(result.model.evaluation.snapshot).toMatch(/^sha256:[0-9a-f]{64}$/);
    const manifest = result.capture.manifest;
    const sorted = {
      ...manifest,
      inputs: [...manifest.inputs].sort((a, b) =>
        a.kind === b.kind ? (a.subjectId < b.subjectId ? -1 : 1) : a.kind < b.kind ? -1 : 1,
      ),
    };
    const expected = `sha256:${createHash('sha256').update(independentCanonical(sorted)).digest('hex')}`;
    expect(result.model.evaluation.snapshot).toBe(expected);
    expect(JSON.stringify(manifest)).not.toContain(AS_OF);
    expect(JSON.stringify(manifest)).not.toContain(f.root);
  });

  it('the manifest names each consumed input class exactly once per subject, sorted by (kind, subjectId)', async () => {
    const captured = await capture(fixture());
    expect(captured.manifest.inputs.map((i) => [i.kind, i.subjectId, i.state])).toEqual([
      ['consent-artifact', 'c-gov', 'captured'],
      ['consent-artifact', 'c-src', 'captured'],
      ['declaration', 'declaration', 'captured'],
      ['entry', 'entry', 'captured'],
      ['owner-act', 'c-gov', 'captured'],
      ['owner-act', 'c-src', 'captured'],
      // syzygy-u2a.7: the admitted governance root's README (absent in this
      // fixture), and the observed source's README, never read.
      ['readme', 'repo-gov', 'missing'],
      ['readme', 'repo-src', 'not-read'],
      ['repository-root', 'repo-gov', 'captured'],
      ['repository-root', 'repo-src', 'captured'],
    ]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'a currency bound of %s (not a positive integer) is refused before any read',
    async (maxAgeSeconds) => {
      const f = fixture();
      let reads = 0;
      const reader = {
        readBytes: async () => { reads += 1; return { state: 'missing' } as const; },
        listRoot: async () => { reads += 1; return { state: 'missing' } as const; },
      };
      await expect(
        captureProjectInputs(f.root, {
          ...deps(f),
          reader: reader as unknown as CaptureDependencies['reader'],
          consentCurrencyBound: { maxAgeSeconds, declaredBy: 'fixture-bound (synthetic)' },
        }),
      ).rejects.toThrow('maxAgeSeconds must be a positive integer');
      expect(reads).toBe(0);
    },
  );

  it('identical inputs give one digest and one evaluation; a different asOf keeps the digest', async () => {
    const f = fixture();
    const first = await capture(f);
    const second = await capture(f);
    const later = await capture(f, { asOf: '2026-08-25T00:00:00Z' });
    expect(second.snapshot).toBe(first.snapshot);
    expect(JSON.stringify(evaluateCapturedProject(second))).toBe(JSON.stringify(evaluateCapturedProject(first)));
    expect(later.snapshot).toBe(first.snapshot);
    expect(later.asOf).toBe('2026-08-25T00:00:00Z');
  });

  const MUTATIONS: readonly (readonly [string, (f: Fixture) => Partial<CaptureDependencies> | void])[] = [
    ['declaration bytes', (f) => writeFileSync(join(f.root, '.syzygy', 'project.yaml'), `${DECLARATION}# edit\n`, 'utf8')],
    ['consent artifact bytes', (f) => {
      const spec = { id: 'c-src', project: PROJECT, repository: 'repo-src', attribution: 'other-owner' };
      writeConsent(f.decisions, spec);
    }],
    ['owner-act bytes', (f) => {
      const spec = { id: 'c-src', project: PROJECT, repository: 'repo-src' };
      const artifact = artifactText(spec);
      writeFileSync(join(f.decisions, 'c-src.act.yaml'), actText({ ...defaultActFields(spec, artifact), instant: '2026-08-02T00:00:00Z' }), 'utf8');
    }],
    ['repository observation', (f) => { rmSync(f.src, { recursive: true, force: true }); }],
    ['entry bytes', (f) => writeFileSync(join(f.root, '.syzygy', 'intent', 'OVERVIEW.md'), '# overview v2\n', 'utf8')],
    ['governance-root README bytes', (f) => writeFileSync(join(f.root, 'README.md'), '# readme\n', 'utf8')],
    ['repository link context', () => ({
      linkContexts: { 'repo-gov': { canonicalWebBase: 'https://forge.example/owner/repo', defaultBranch: 'main' } },
    })],
    ['markdown parser version', () => ({ versions: { ...DAEMON_CAPTURE_VERSIONS, markdownParser: 'marked@0.0.0+parse5@0.0.0;gfm=true' } })],
    ['observer version', () => ({ versions: { ...DAEMON_CAPTURE_VERSIONS, observer: 'cap1-observer/v2' } })],
    ['currency-bound configuration', () => ({ consentCurrencyBound: { maxAgeSeconds: 31536000, declaredBy: 'fixture-bound (synthetic)' } })],
    ['correlation result', () => ({
      correlation: { id: 'fixture-provider', correlate: async () => ({ state: 'not-found' as const }) },
    })],
  ];

  it.each(MUTATIONS)('changing the %s changes the digest', async (_name, mutate) => {
    const before = await capture(fixture());
    const f = fixture();
    const extra = mutate(f) ?? {};
    const after = await capture(f, extra);
    // Two fixtures differ only in temp paths, which never enter the manifest.
    const baseline = await capture(fixture());
    expect(baseline.snapshot).toBe(before.snapshot);
    expect(after.snapshot).not.toBe(before.snapshot);
  });
});

describe('capture order: consent is decided before any dependent read', () => {
  it('a refused pair causes zero root and zero entry reads; admitted ones are read once and revalidated once', async () => {
    const f = fixture();
    // Legacy governance-root consent (no act): refused.
    rmSync(join(f.decisions, 'c-gov.act.yaml'));
    const reader = countingReader();
    const captured = await capture(f, { reader });
    expect(captured.repositories.map((r) => [r.repositoryId, r.decision.authorization])).toEqual([
      ['repo-gov', 'Unknown'],
      ['repo-src', 'admitted'],
    ]);
    expect(reader.calls.filter((c) => c === `list:${f.root}`)).toHaveLength(0);
    expect(reader.calls.filter((c) => c === 'read:.syzygy/intent/OVERVIEW.md')).toHaveLength(0);
    // No README is read: the refused governance root's for its consent, the
    // admitted observed source's for its role (syzygy-u2a.7).
    expect(reader.calls.filter((c) => c === 'read:README.md')).toHaveLength(0);
    expect(captured.repositories.map((r) => r.readme)).toEqual([
      { state: 'not-read', reason: 'consent-not-admitted' },
      { state: 'not-read', reason: 'observed-source' },
    ]);
    expect(reader.calls.filter((c) => c === `list:${f.src}`)).toHaveLength(2);
    expect(captured.entry).toEqual({ state: 'not-read', reason: 'unconsented-governance-root' });
  });

  it('a reference naming an act file is refused before any filesystem access', async () => {
    const f = fixture();
    writeFileSync(join(f.root, '.syzygy', 'project.yaml'), DECLARATION.replace('consent: c-src', 'consent: c-gov.act'), 'utf8');
    const reader = countingReader();
    const captured = await capture(f, { reader });
    expect(reader.calls.some((c) => c.includes('c-gov.act.yaml.') || c.includes('c-gov.act.act'))).toBe(false);
    const src = captured.repositories.find((r) => r.repositoryId === 'repo-src');
    expect(src?.decision.authorization === 'Unknown' ? src.decision.diagnostic : 'admitted').toBe('reference-unresolvable');
  });

  // syzygy-bc8m — frozen §4 (CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-
  // INTERFACE.md): the provider "is called at most once per act per capture,
  // only for acts that passed checks 1–23". An entry's artifact naming another
  // repository fails check 2 (`record-subject-mismatch`) and is no withdrawal
  // any entry consults, so its otherwise valid act never reaches the provider.
  // A withdrawal for a declared pair is consulted (rules 3 and 4) and still
  // reaches it; a withdrawal for an undeclared repository does not.
  it('a pair failing check 2 never reaches the correlation provider', async () => {
    const f = fixture();
    writeFileSync(
      join(f.root, '.syzygy', 'project.yaml'),
      DECLARATION.replace('  - c-src\n', '  - c-src\n  - c-wd-gov\n  - c-wd-elsewhere\n'),
      'utf8',
    );
    writeConsent(f.decisions, { id: 'c-src', project: PROJECT, repository: 'repo-elsewhere' });
    writeConsent(f.decisions, { id: 'c-wd-gov', project: PROJECT, repository: 'repo-gov', grantState: 'withdrawn' });
    writeConsent(f.decisions, { id: 'c-wd-elsewhere', project: PROJECT, repository: 'repo-elsewhere', grantState: 'withdrawn' });
    const called: string[] = [];
    const correlation = {
      id: 'spy-provider',
      correlate: async ({ binding }: { readonly binding: { readonly artifactId: string } }) => {
        called.push(binding.artifactId);
        return { state: 'not-found' as const };
      },
    };
    const captured = await capture(f, { correlation });
    expect(called).toEqual(['c-gov', 'c-wd-gov']);
    const src = captured.repositories.find((r) => r.repositoryId === 'repo-src');
    expect(src?.decision.authorization === 'Unknown' ? src.decision.diagnostic : 'admitted').toBe('record-subject-mismatch');
    expect(
      captured.manifest.inputs.filter((i) => i.kind === 'consent-correlation').map((i) => i.subjectId),
    ).toEqual(['c-gov', 'c-wd-gov']);
  });

  it('a malformed asOf stops capture before any read', async () => {
    const f = fixture();
    const reader = countingReader();
    const result = await captureProjectInputs(f.root, deps(f, { reader, asOf: '2026-08-24' }));
    expect(result).toEqual({ kind: 'as-of-invalid' });
    expect(reader.calls).toEqual([]);
  });
});

describe('mid-capture and post-capture source changes', () => {
  it('a source changed between its read and its revalidation fails the capture by name, with no retry', async () => {
    const f = fixture();
    let first = true;
    const base = countingReader();
    const reader: CaptureReader = {
      readBytes: async (root, path) => {
        const read = await base.readBytes(root, path);
        if (first && path.endsWith('c-src.yaml')) {
          first = false;
          writeConsent(f.decisions, { id: 'c-src', project: PROJECT, repository: 'repo-src', attribution: 'changed' });
        }
        return read;
      },
      listRoot: base.listRoot,
    };
    const result = await captureProjectInputs(f.root, deps(f, { reader }));
    expect('kind' in result && result.kind).toBe('source-changed-during-capture');
    if ('kind' in result && result.kind === 'source-changed-during-capture') {
      // The act was first read after the change, so only the artifact moved.
      expect(result.changed.map((c) => [c.kind, c.subjectId])).toEqual([['consent-artifact', 'c-src']]);
    }
    // Each path was read exactly twice (capture + revalidation): no retry.
    expect(base.calls.filter((c) => c.endsWith('c-src.yaml'))).toHaveLength(2);
    const evaluation = await evaluateProject(f.root, deps(f, { reader }));
    expect(evaluation.kind).toBe('project-evaluated');
  });

  it('after capture, changing every source changes nothing the evaluation or /entry serves', async () => {
    const f = fixture();
    const captured = await capture(f);
    const before = evaluateCapturedProject(captured);
    writeFileSync(join(f.root, '.syzygy', 'intent', 'OVERVIEW.md'), '# overview TAMPERED\n', 'utf8');
    writeFileSync(join(f.root, 'README.md'), '[entry](.syzygy/intent/OVERVIEW.md)\n', 'utf8');
    rmSync(join(f.decisions, 'c-src.act.yaml'));
    writeFileSync(join(f.root, '.syzygy', 'project.yaml'), 'schema_version: "1"\n', 'utf8');
    const after = evaluateCapturedProject(captured);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    const entry = humanRoutes({ getEvaluation: () => after }).find((r) => r.path === HUMAN_ENTRY_ROUTE_PATH);
    const html = (await entry?.handle({} as never))?.body ?? '';
    expect(html).toContain('# overview v1');
    expect(html).not.toContain('TAMPERED');
    expect(Object.isFrozen(captured.manifest.inputs)).toBe(true);
  });
});

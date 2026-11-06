// syzygy-u2a.7 system test — discoverability over a real spawned daemon and
// real disk (CAP1-REQ-040/041/050…053/064). The oracle is independent of the
// daemon: the JSON and the HTML are parsed here, separately, each row is
// canonicalized to one complete tuple, and the two multisets are compared in
// both directions over the declared repository count. Every expected value
// is a literal of this file or a digest recomputed here with node:crypto.

import { createHash } from 'node:crypto';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FIXTURE_CONSENT_RECORD,
  FIXTURE_DECLARATION,
  FIXTURE_OWNER_ACT,
  readCredential,
  startDaemon,
  tempBase,
  writeCompleteFixture,
} from './harness.js';

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

const sha = (text: string): string => `sha256:${createHash('sha256').update(text).digest('hex')}`;

// A second, admitted observed-source repository beside the governance root:
// its consent record and owner act are the fixture's own, re-addressed.
function addObservedSource(fixtureRoot: string): void {
  const decisions = join(fixtureRoot, '.syzygy', 'governance', 'decisions');
  const record = FIXTURE_CONSENT_RECORD.replace('id: consent-gov-root', 'id: consent-observed').replace(
    'repository: repo-governance-root',
    'repository: repo-observed',
  );
  const act = FIXTURE_OWNER_ACT.replace('act-consent-gov-root', 'act-consent-observed')
    .replace('artifact: "consent-gov-root"', 'artifact: "consent-observed"')
    .replace(sha(FIXTURE_CONSENT_RECORD), sha(record));
  writeFileSync(join(decisions, 'consent-observed.yaml'), record, 'utf8');
  writeFileSync(join(decisions, 'consent-observed.act.yaml'), act, 'utf8');
  writeFileSync(
    join(fixtureRoot, '.syzygy', 'project.yaml'),
    FIXTURE_DECLARATION.replace(
      'consents:\n  - consent-gov-root\n',
      '  - id: repo-observed\n    role: observed-source\n    consent: consent-observed\nconsents:\n  - consent-gov-root\n  - consent-observed\n',
    ),
    'utf8',
  );
}

interface Served {
  readonly body: Record<string, unknown>;
  readonly html: string;
  readonly entryHtml: string;
}

async function serve(prepare: (fixtureRoot: string) => void): Promise<Served> {
  const base = tempBase('syz-sys-disc-');
  cleanups.push(() => rmSync(base, { recursive: true, force: true }));
  const fixtureRoot = join(base, 'fixture');
  writeCompleteFixture(fixtureRoot);
  prepare(fixtureRoot);
  const daemon = await startDaemon({ fixtureRoot, stateDir: join(base, 'state') });
  cleanups.push(async () => {
    await daemon.stop();
  });
  const html = await (await fetch(`${daemon.baseUrl}/`)).text();
  const entryHtml = await (await fetch(`${daemon.baseUrl}/entry`)).text();
  const token = readCredential(daemon.credentialPath);
  const body = (await (
    await fetch(`${daemon.baseUrl}/api/project`, { headers: { authorization: `Bearer ${token}` } })
  ).json()) as Record<string, unknown>;
  return { body, html, entryHtml };
}

// --- The independent oracle ------------------------------------------------

// Machine leaf path → the human attribute that carries the same fact. The
// row's coverage boundary is compared by record count; the boundary rows
// themselves are the coverage oracle's (syzygy-u2a.6).
const ROW_FIELDS: readonly (readonly [string, string])[] = [
  ['repositoryId', 'data-repository-id'],
  ['value', 'data-discoverability-value'],
  ['label', 'data-epistemic-label'],
  ['primaryReason', 'data-unknown-reason'],
  ['basis.kind', 'data-basis-kind'],
  ['basis.relativePath', 'data-basis-relative-path'],
  ['basis.digest', 'data-basis-digest'],
  ['basis.linksToEntry', 'data-basis-links-to-entry'],
  ['basis.failure', 'data-basis-failure'],
  ['evidence.relativePath', 'data-evidence-path'],
  ['evidence.digest', 'data-evidence-digest'],
  ['proposal', 'data-proposal-state'],
  ['evaluationId', 'data-evaluation-id'],
  ['explanation.selection', 'data-explanation-selection'],
  ['explanation.evaluation.snapshot', 'data-evaluation-snapshot'],
  ['explanation.evaluation.asOf', 'data-evaluation-as-of'],
  ['explanation.scenarioContext', 'data-scenario-context'],
  ['explanation.evidenceClassification.label', 'data-explanation-label'],
  ['explanation.evidenceClassification.reasons.primary', 'data-explanation-reason-primary'],
  ['explanation.evidenceClassification.reasons.secondary', 'data-explanation-reason-secondary'],
  ['explanation.unknownReasons.primary', 'data-explanation-reason-primary'],
  ['explanation.unknownReasons.secondary', 'data-explanation-reason-secondary'],
  ['explanation.sourceRevision', 'data-source-revision'],
  ['explanation.coverageAndConsentBoundary.projectId', 'data-boundary-project-id'],
  ['explanation.coverageAndConsentBoundary.records#', 'data-boundary-record-count'],
  ['explanation.coverageAndConsentBoundary.declaredCapturedScopes', 'data-boundary-declared-scopes'],
];

// The declared captured scopes, spelled `repository:scope` and space-joined
// on both sides.
function withScopeSpelling(row: unknown): unknown {
  const copy = JSON.parse(JSON.stringify(row)) as {
    explanation?: { coverageAndConsentBoundary?: { declaredCapturedScopes?: unknown } };
  };
  const boundary = copy.explanation?.coverageAndConsentBoundary;
  if (boundary !== undefined && Array.isArray(boundary.declaredCapturedScopes)) {
    boundary.declaredCapturedScopes = (boundary.declaredCapturedScopes as { repositoryId: string; capturedScope: string }[]).map(
      (scope) => `${scope.repositoryId}:${scope.capturedScope}`,
    );
  }
  return copy;
}

function leaves(value: unknown, prefix = ''): [string, string][] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return value.length === 0 ? [] : [[prefix, value.join(' ')]];
    }
    return [[`${prefix}#`, String(value.length)]];
  }
  if (typeof value !== 'object') return [[prefix, String(value)]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) =>
    leaves(inner, prefix === '' ? key : `${prefix}.${key}`),
  );
}

function unescape(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function attrsOf(fragment: string): Map<string, string> {
  return new Map(
    [...fragment.matchAll(/ ([a-z-]+)="([^"]*)"/g)].map((a) => [a[1] as string, unescape(a[2] as string)]),
  );
}

function machineTuples(body: Record<string, unknown>): { tuples: string[]; escaped: string[] } {
  const plane = body['discoverability'] as { state: string; rows?: unknown[] };
  const rows = (plane.rows ?? []).map(withScopeSpelling);
  const known = new Set(ROW_FIELDS.map(([path]) => path));
  const escaped = rows.flatMap((row) => leaves(row).map(([path]) => path)).filter((path) => !known.has(path));
  const tuples = rows.map((row) => {
    const flat = new Map(leaves(row));
    return JSON.stringify(ROW_FIELDS.map(([path]) => flat.get(path) ?? null));
  });
  return { tuples, escaped };
}

function humanTuples(html: string): string[] {
  const section = html.match(/<section class="discoverability" data-section="discoverability">[\s\S]*?<\/section>/)?.[0] ?? '';
  return [...section.matchAll(/<li( data-discoverability-row="[^"]*"[^>]*)>[\s\S]*?<details([^>]*)>/g)].map((match) => {
    const row = attrsOf(match[1] ?? '');
    const drawer = attrsOf(match[2] ?? '');
    const merged = new Map([...row, ...drawer]);
    return JSON.stringify(
      ROW_FIELDS.map(([, name]) => {
        const value = merged.get(name);
        return value === undefined || value === '' ? null : value;
      }),
    );
  });
}

function count(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function disagreements(body: Record<string, unknown>, html: string, declared: number): string[] {
  const { tuples: machine, escaped } = machineTuples(body);
  const human = humanTuples(html);
  const m = count(machine);
  const h = count(human);
  const problems = escaped.map((path) => `machine field outside the tuple: ${path}`);
  for (const key of new Set([...m.keys(), ...h.keys()])) {
    if ((m.get(key) ?? 0) !== (h.get(key) ?? 0)) {
      problems.push(`count ${m.get(key) ?? 0} machine vs ${h.get(key) ?? 0} human: ${key}`);
    }
  }
  if (machine.length !== declared) problems.push(`machine rows ${machine.length} != declared ${declared}`);
  if (human.length !== declared) problems.push(`human rows ${human.length} != declared ${declared}`);
  return problems;
}

const LINKING_README = '# Fixture\n\nStart at [the project entry](.syzygy/intent/OVERVIEW.md).\n';

describe('syzygy-u2a.7 — discoverability rows on both channels of the spawned daemon', () => {
  it('serves one complete row per declared repository, equal as multisets, and every row mutation is caught', async () => {
    const served = await serve((root) => {
      addObservedSource(root);
      writeFileSync(join(root, 'README.md'), LINKING_README, 'utf8');
    });
    const plane = served.body['discoverability'] as { state: string; rows: Record<string, unknown>[] };
    expect(plane.state).toBe('available');
    expect(
      plane.rows.map((row) => {
        const { evaluationId: _id, explanation: _why, ...tuple } = row;
        return tuple;
      }),
    ).toStrictEqual([
      {
        repositoryId: 'repo-governance-root',
        value: 'yes',
        label: 'Observed',
        primaryReason: null,
        basis: { kind: 'readme-captured', relativePath: 'README.md', digest: sha(LINKING_README), linksToEntry: true },
        evidence: { relativePath: 'README.md', digest: sha(LINKING_README) },
        proposal: 'not-produced',
      },
      {
        repositoryId: 'repo-observed',
        value: 'not-applicable',
        label: 'Observed',
        primaryReason: null,
        basis: { kind: 'no-governance-root' },
        evidence: null,
        proposal: 'not-produced',
      },
    ]);
    expect(disagreements(served.body, served.html, 2)).toStrictEqual([]);

    const machine = (): Record<string, unknown> => JSON.parse(JSON.stringify(served.body)) as Record<string, unknown>;
    const rowsOf = (body: Record<string, unknown>) =>
      (body['discoverability'] as { rows: Record<string, unknown>[] }).rows;
    const section = served.html.match(/<section class="discoverability" data-section="discoverability">[\s\S]*?<\/section>/)?.[0];
    const firstRow = section?.match(/<li data-discoverability-row="repo-governance-root"[\s\S]*?<\/details><\/li>/)?.[0];
    if (section === undefined || firstRow === undefined) throw new Error('fixture rows not found');
    const inSection = (edit: (text: string) => string): string => served.html.replace(section, edit(section));
    const mutants: Record<string, [Record<string, unknown>, string]> = {
      'machine removes a row': (() => {
        const body = machine();
        rowsOf(body).pop();
        return [body, served.html];
      })(),
      'machine duplicates a row': (() => {
        const body = machine();
        rowsOf(body).push(rowsOf(body)[0] as Record<string, unknown>);
        return [body, served.html];
      })(),
      'machine alters a value': (() => {
        const body = machine();
        (rowsOf(body)[0] as Record<string, unknown>)['value'] = 'no';
        return [body, served.html];
      })(),
      'machine alters the evidence digest': (() => {
        const body = machine();
        ((rowsOf(body)[0] as Record<string, unknown>)['evidence'] as Record<string, unknown>)['digest'] = `sha256:${'e'.repeat(64)}`;
        return [body, served.html];
      })(),
      'machine adds an unparitied field': (() => {
        const body = machine();
        (rowsOf(body)[1] as Record<string, unknown>)['note'] = 'extra';
        return [body, served.html];
      })(),
      'human removes a row': [machine(), inSection((t) => t.replace(firstRow, ''))],
      'human duplicates a row': [machine(), inSection((t) => t.replace(firstRow, firstRow + firstRow))],
      'human alters a value': [
        machine(),
        inSection((t) => t.replace('data-discoverability-value="yes"', 'data-discoverability-value="no"')),
      ],
      'human drops the explanation selection': [
        machine(),
        inSection((t) => t.replace(/ data-explanation-selection="[^"]*"/, '')),
      ],
    };
    const survivors = Object.entries(mutants).flatMap(([name, [body, page]]) =>
      disagreements(body, page, 2).length === 0 ? [name] : [],
    );
    expect(survivors).toStrictEqual([]);
  });

  it('a README that names the entry only in text and code serves a truthful no on both channels', async () => {
    const readme = 'The entry is at .syzygy/intent/OVERVIEW.md.\n\n```\n[e](.syzygy/intent/OVERVIEW.md)\n```\n';
    const served = await serve((root) => writeFileSync(join(root, 'README.md'), readme, 'utf8'));
    const plane = served.body['discoverability'] as { rows: Record<string, unknown>[] };
    expect(plane.rows.map((row) => [row['repositoryId'], row['value']])).toStrictEqual([['repo-governance-root', 'no']]);
    expect(disagreements(served.body, served.html, 1)).toStrictEqual([]);
  });

  it('an unclassifiable entry link makes the plane unavailable on both channels, never no', async () => {
    const href = 'https://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md';
    const readme = `See <${href}>.\n`;
    const served = await serve((root) => writeFileSync(join(root, 'README.md'), readme, 'utf8'));
    expect(served.body['discoverability']).toStrictEqual({
      state: 'unavailable',
      reason: 'target-unclassifiable',
      repositoryId: 'repo-governance-root',
      readme: { relativePath: 'README.md', digest: sha(readme) },
      href,
      classifier: 'repository-locator-unavailable',
    });
    const paragraph = served.html.match(/<p data-plane-state="unavailable" data-plane-reason="target-unclassifiable"[^>]*>/)?.[0] ?? '';
    const attrs = attrsOf(paragraph);
    expect([
      attrs.get('data-repository-id'),
      attrs.get('data-readme-path'),
      attrs.get('data-readme-digest'),
      attrs.get('data-unclassifiable-href'),
      attrs.get('data-classifier-reason'),
    ]).toStrictEqual(['repo-governance-root', 'README.md', sha(readme), href, 'repository-locator-unavailable']);
    expect(served.html).not.toContain('data-discoverability-value=');
  });

  it('the authority and proposal planes are served as their named states on both channels', async () => {
    const served = await serve(() => undefined);
    expect(served.body['authorityExposures']).toStrictEqual({ state: 'unavailable', reason: 'authority-input-not-designed' });
    expect(served.body['proposals']).toStrictEqual({ state: 'not-produced', reason: 'proposal-input-not-designed' });
    expect(served.html).toContain('data-plane-state="unavailable" data-plane-reason="authority-input-not-designed"');
    expect(served.html).toContain('data-plane-state="not-produced" data-plane-reason="proposal-input-not-designed"');
  });

  // syzygy-s6cp: a consent-refused governance root never reads the entry,
  // and both channels say so with the same distinct state and reason.
  it('a consent-refused governance root serves a distinct not-read entry on both channels', async () => {
    const served = await serve((root) =>
      rmSync(join(root, '.syzygy', 'governance', 'decisions', 'consent-gov-root.act.yaml')),
    );
    expect(served.body['entry']).toStrictEqual({
      state: 'not-read',
      reason: 'unconsented-governance-root',
      label: 'Unknown',
      unknownReason: 'unconsented-source-or-provider',
    });
    const section = served.entryHtml.match(/<section data-section="entry-content"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? '';
    const p = attrsOf(section.match(/<p[^>]*>/)?.[0] ?? '');
    expect(attrsOf(section.match(/<section[^>]*>/)?.[0] ?? '').get('data-entry-state')).toBe('not-read');
    expect([p.get('data-not-read-reason'), p.get('data-epistemic-label'), p.get('data-unknown-reason')]).toStrictEqual([
      'unconsented-governance-root',
      'Unknown',
      'unconsented-source-or-provider',
    ]);
    expect(served.entryHtml).not.toContain('data-entry-state="unreadable"');
  });
});

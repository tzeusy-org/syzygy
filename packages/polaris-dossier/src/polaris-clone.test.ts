import { describe, expect, it } from 'vitest';
import { cliVisibilityOf } from './cli.js';
import { supervisorSource, type SupervisorSourcePorts } from './polaris.js';
import type { SelectedUrlSource } from './url-acquisition.js';
import type { VisibilityDecision } from './source-visibility-gate.js';

const COMMIT = 'a'.repeat(40);
const SOURCE: SelectedUrlSource = {
  transportLocator: 'https://example.invalid/o/r', normalizedLocator: 'example.invalid/o/r', transport: 'https', selector: null,
  revision: { mode: 'remote-default', reference: 'refs/heads/release-next', identifier: COMMIT, objectFormat: 'sha1' },
  provenance: { classification: 'source-metadata', label: 'Inferred', locatorSha256: '1'.repeat(64), selectorSha256: null,
    advertisement: { sha256: '2'.repeat(64), bytes: 117 } },
};
const INPUT = { url: 'https://example.invalid/o/r', scratchRoot: '/owned-clones', screen: { screenBody: () => undefined } };
function fixture(head = COMMIT) {
  const calls: { kind: string; value: unknown }[] = [];
  const ports: SupervisorSourcePorts = {
    select: async input => { calls.push({ kind: 'select', value: input }); return { ok: true, source: SOURCE, operations: [] }; },
    acquire: async input => { calls.push({ kind: 'acquire', value: input }); return { ok: true, clone: '/owned-clones/unique/clone', workspace: '/owned-clones/unique', source: input.source, operations: [] }; },
    head: clone => { calls.push({ kind: 'head', value: clone }); return { ok: true, commit: head, via: 'detached HEAD', gitDir: '/provided/.git' }; },
  };
  return { ports, calls };
}

describe('supervisor source selection and acquisition', () => {
  it('resolves remote default once and passes the selected immutable source to fresh acquisition', async () => {
    const { ports, calls } = fixture();
    expect(await supervisorSource(INPUT, ports)).toMatchObject({ ok: true, clone: '/owned-clones/unique/clone', workspace: '/owned-clones/unique', source: { revision: { reference: 'refs/heads/release-next', identifier: COMMIT } } });
    expect(calls.map(call => call.kind)).toEqual(['select', 'acquire']);
    expect(calls[0]!.value).not.toHaveProperty('revision');
    expect((calls[1]!.value as { source: SelectedUrlSource }).source).toBe(SOURCE);
  });

  it('checks a supplied clone against the selected current remote tip without acquiring or modifying it', async () => {
    const { ports, calls } = fixture();
    expect(await supervisorSource({ ...INPUT, clone: '/provided' }, ports)).toMatchObject({ ok: true, clone: '/provided', workspace: null });
    expect(calls.map(call => call.kind)).toEqual(['select', 'head']);
  });

  it('refuses a stale or unreadable supplied HEAD rather than fetching into it or silently changing the pin', async () => {
    const { ports, calls } = fixture('b'.repeat(40));
    expect(await supervisorSource({ ...INPUT, clone: '/provided' }, ports)).toMatchObject({ ok: false, code: 'pin-mismatch', reason: expect.stringContaining('was not modified') });
    expect(calls.map(call => call.kind)).toEqual(['select', 'head']);
    const unreadable: SupervisorSourcePorts = { ...ports, head: () => ({ ok: false, reason: 'unreadable nonsecret fixture' }) };
    expect(await supervisorSource({ ...INPUT, clone: '/provided' }, unreadable)).toMatchObject({ ok: false, code: 'pin-mismatch' });
    expect(calls.filter(call => call.kind === 'acquire')).toHaveLength(0);
  });

  it('passes an explicit selector to selection and stops before a clone read when selection refuses', async () => {
    const { ports, calls } = fixture();
    const rejected: SupervisorSourcePorts = { ...ports, select: async input => {
      calls.push({ kind: 'select', value: input });
      return { ok: false, code: 'ref-ambiguous', stage: 'selection', reason: 'Use an exact remote reference.', operations: [] };
    } };
    expect(await supervisorSource({ ...INPUT, revision: 'release', clone: '/provided' }, rejected)).toMatchObject({ ok: false, code: 'ref-ambiguous' });
    expect(calls).toEqual([{ kind: 'select', value: { locator: INPUT.url, revision: 'release', scratchRoot: INPUT.scratchRoot, screen: INPUT.screen } }]);
  });

  it('preserves an unconfirmed acquisition and retained path instead of claiming cleanup or trying again', async () => {
    const { ports, calls } = fixture();
    const unconfirmed: SupervisorSourcePorts = { ...ports, acquire: async () => {
      calls.push({ kind: 'acquire', value: null });
      return { ok: false, code: 'termination-unconfirmed', stage: 'fetch', reason: 'Inspect local processes.', operations: [], retainedWorkspace: '/owned-clones/retained' };
    } };
    expect(await supervisorSource(INPUT, unconfirmed)).toMatchObject({ ok: false, code: 'termination-unconfirmed', retainedWorkspace: '/owned-clones/retained' });
    expect(calls.map(call => call.kind)).toEqual(['select', 'acquire']);
  });
});

describe('cliVisibilityOf: the decision the supervisor fetches by', () => {
  const injected = async (): Promise<VisibilityDecision> => ({ ok: true, visibility: 'public', carriers: [] });
  it('is the injected decision when one is given', () => {
    expect(cliVisibilityOf({ visibilityOf: injected })).toBe(injected);
  });
  it('is none, so nothing is fetched, when the gate sources are injected and no decision is', () => {
    expect(cliVisibilityOf({ sources: {} as never })).toBeUndefined();
  });
  it('is this checkout\'s own decision when nothing is injected', () => {
    expect(typeof cliVisibilityOf({})).toBe('function');
  });
});

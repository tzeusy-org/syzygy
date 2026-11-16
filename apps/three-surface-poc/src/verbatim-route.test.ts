// PWB-REQ-011's transient exact-requirement route (as amended 2026-09-05):
// every gate refuses with its own reason, the admitted case reads exactly the
// evaluation's object id once per render, nothing is cached, and the Polaris
// route serves the selected requirement blocks while the machine channel
// never carries them. The selection grammar is checked against the live
// Butlers baseline-spec heading shape restated here by hand.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Route, RouteContext, RouteResponse } from '@syzygy/http-host';
import { PWB_RESOURCE_LIMITS, type GitRunner, type PocModel } from '@syzygy/three-surface-poc-core';

import { selectRequirementSections, type VerbatimLeaf, type VerbatimRefusal } from './capability-detail.js';
import { renderPolarisPage } from './polaris.js';
import { POC_MACHINE_PATH, pocRoutes } from './routes.js';
import { buildFixtureModel } from './test-model-fixture.js';
import {
  ADMITTING_AUTHORITY,
  PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH,
  PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PURPOSE,
  PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
  REJECTING_AUTHORITY,
  SECRET_SENTINEL,
  UNREADABLE_GIT,
  forgedBlobGit,
  projectShapeFixtureGit,
} from './test-project-shape-fixture.js';
import { gitBlobReaderFor, verbatimRouteReader } from './verbatim-route.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const SPEC = PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH;
const SPEC_TEXT = PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC[SPEC] as string;

function observed(texts = PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC): PocModel {
  return buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(texts) } });
}
function sourceOf(model: PocModel, path: string) {
  if (model.projectShape.kind !== 'observed') throw new Error(model.projectShape.kind);
  const source = model.projectShape.sources.find((candidate) => candidate.path === path);
  if (source === undefined) throw new Error(`no source ${path}`);
  return source;
}
function leafOf(model: PocModel, path = SPEC): VerbatimLeaf {
  if (model.projectShape.kind !== 'observed') throw new Error(model.projectShape.kind);
  return { path, revision: model.projectShape.identity.revision, identity: sourceOf(model, path).identity };
}
/** The fixture git runner, recording every command and, in `reads`, each
 * object whose body was read. */
function blobReader(texts = PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC): { read: GitRunner; reads: string[]; calls: string[][] } {
  const git = projectShapeFixtureGit(texts);
  const reads: string[] = [];
  const calls: string[][] = [];
  return {
    reads,
    calls,
    read: (args) => {
      calls.push([...args]);
      if (args[0] === 'cat-file' && args[1] === 'blob') reads.push(args[2] ?? '');
      return git(args);
    },
  };
}
function refusalOf(value: Uint8Array | VerbatimRefusal | undefined): VerbatimRefusal {
  if (value === undefined || value instanceof Uint8Array) throw new Error(`expected a refusal, got ${value === undefined ? 'undefined' : 'bytes'}`);
  return value;
}

describe('requirement selection grammar (PWB-REQ-011 amended)', () => {
  it('selects each `### Requirement:` block with its scenarios and withholds Purpose prose, the title and inter-block text', () => {
    const selected = selectRequirementSections(SPEC_TEXT);
    expect(selected).toEqual(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS);
    expect(JSON.stringify(selected)).not.toContain(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PURPOSE);
  });
  it('follows the live Butlers heading shape: h1 title, h2 Purpose and Requirements, h3 requirements, h4 scenarios', () => {
    const text = ['# Title', '', '## Purpose', '', 'Why.', '', '## Requirements', '', '### Requirement: A', '', 'Body A.', '', '#### Scenario: A1', '', '- **WHEN** x', '- **THEN** y', '', '### Requirement: B', '', 'Body B.', '', '## Trailing', '', 'Not a requirement.', ''].join('\n');
    const selected = selectRequirementSections(text);
    expect(selected.map((requirement) => requirement.title)).toEqual(['A', 'B']);
    expect(selected[0]?.text).toBe(['### Requirement: A', '', 'Body A.', '', '#### Scenario: A1', '', '- **WHEN** x', '- **THEN** y'].join('\n'));
    expect(selected[1]?.text).toBe(['### Requirement: B', '', 'Body B.'].join('\n'));
    expect(selectRequirementSections('# Title\n\n## Purpose\n\nOnly prose.\n')).toEqual([]);
    // A deeper heading inside a block stays in the block; an h1/h2/h3 ends it.
    expect(selectRequirementSections('### Requirement: C\n\n##### Deep\n\ntext\n# End\nafter\n')[0]?.text).toBe('### Requirement: C\n\n##### Deep\n\ntext');
    // CRLF input is accepted; blocks are joined with LF.
    expect(selectRequirementSections('### Requirement: D\r\n\r\nBody.\r\n')[0]?.text).toBe('### Requirement: D\n\nBody.');
  });
});

describe('verbatim route gates', () => {
  it('is no route at all when the evaluation observed no shape', () => {
    const { read, reads } = blobReader();
    expect(verbatimRouteReader(buildFixtureModel(cleanups), read)).toBeUndefined();
    expect(verbatimRouteReader(buildFixtureModel(cleanups, { projectShape: { authority: REJECTING_AUTHORITY, runGit: projectShapeFixtureGit() } }), read)).toBeUndefined();
    expect(reads).toEqual([]);
  });

  it('admits the evaluation’s own admitted baseline-spec object and reads exactly that object id', () => {
    const model = observed();
    const { read, reads } = blobReader();
    const route = verbatimRouteReader(model, read);
    if (route === undefined) throw new Error('no route');
    const bytes = route(leafOf(model));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes as Uint8Array)).toBe(SPEC_TEXT);
    const anchor = sourceOf(model, SPEC).anchor;
    expect(anchor.kind === 'blob' && reads).toEqual([(anchor as { objectId: string }).objectId]);
    // No caching: a second resolution reads again.
    route(leafOf(model));
    expect(reads).toHaveLength(2);
  });

  it('refuses a path outside the population, a non-baseline source, and a denied path', () => {
    const model = observed();
    const route = verbatimRouteReader(model, blobReader().read);
    if (route === undefined) throw new Error('no route');
    expect(refusalOf(route({ ...leafOf(model), path: 'openspec/specs/nowhere/spec.md' })).refused).toBe('unconsented-source-or-provider');
    expect(refusalOf(route(leafOf(model, 'about/README.md'))).refused).toBe('unconsented-source-or-provider');
  });

  it('refuses a leaf bound to another revision or another identity', () => {
    const model = observed();
    const { read, reads } = blobReader();
    const route = verbatimRouteReader(model, read);
    if (route === undefined) throw new Error('no route');
    const leaf = leafOf(model);
    expect(refusalOf(route({ ...leaf, revision: 'f'.repeat(40) })).refused).toBe('reference-unresolvable');
    expect(refusalOf(route({ ...leaf, identity: leaf.identity.replace(/#.*$/, `#${'0'.repeat(40)}`) })).refused).toBe('reference-unresolvable');
    expect(reads).toEqual([]);
  });

  it('screens the transient body itself: phase B classifies baseline specs path-only, so a secret in the spec is refused here, named by detector, never by bytes', () => {
    const model = observed({ ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [SPEC]: `${SPEC_TEXT}\ntoken AKIA${'A'.repeat(16)} ${SECRET_SENTINEL}\n` });
    // The evaluation's own record never saw the body.
    expect(sourceOf(model, SPEC).record).toMatchObject({ outcome: 'classified', basis: 'path-only', detectorsRun: 0 });
    const { read, reads } = blobReader({ ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [SPEC]: `${SPEC_TEXT}\ntoken AKIA${'A'.repeat(16)} ${SECRET_SENTINEL}\n` });
    const route = verbatimRouteReader(model, read);
    if (route === undefined) throw new Error('no route');
    const refused = refusalOf(route(leafOf(model)));
    expect(refused.refused).toBe('excluded-content');
    expect(refused.detail).toContain('known-token-formats');
    expect(refused.detail).not.toContain(SECRET_SENTINEL);
    expect(refused.detail).not.toContain('AKIA');
    expect(reads).toHaveLength(1);
  });

  it('refuses active content in the spec body (inert Markdown code contexts stay admitted)', () => {
    const active = { ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [SPEC]: `${SPEC_TEXT}\n<script>alert(1)</script>\n` };
    const activeModel = observed(active);
    const activeRoute = verbatimRouteReader(activeModel, blobReader(active).read);
    if (activeRoute === undefined) throw new Error('no route');
    const refused = refusalOf(activeRoute(leafOf(activeModel)));
    expect(refused.refused).toBe('excluded-content');
    expect(refused.detail).toContain('script-element');
    expect(refused.detail).not.toContain('alert');
    const inert = { ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [SPEC]: `${SPEC_TEXT}\nSee \`<script>\` as a code span.\n` };
    const inertModel = observed(inert);
    const inertRoute = verbatimRouteReader(inertModel, blobReader(inert).read);
    if (inertRoute === undefined) throw new Error('no route');
    expect(inertRoute(leafOf(inertModel))).toBeInstanceOf(Uint8Array);
  });

  // syzygy-bpyt.16 (ruled on syzygy-bpyt.1.14): the route's active-content scan reads a CRLF or CR spec as it reads its LF form. The first
  // addition was admitted under CRLF and CR before the fix (a backtick opener with a backtick in its info text hides a script element as
  // an inline span), the second refused (a tilde fence the mask did not recognize, leaving the script element it holds in the open).
  it.each([['LF', '\n'], ['CRLF', '\r\n'], ['CR', '\r']])('%s: the spec body is refused or served as its LF form is', (_name, end) => {
    const refusedAddition = '\n```a`b\n<script>alert(1)</script>\n```\n';
    const servedAddition = '\n~~~\n<script>alert(1)</script>\n~~~\nAfter.\n';
    const bodyOf = (addition: string): string => `${SPEC_TEXT}${addition}`.replace(/\r?\n/g, end);
    const refusedTexts = { ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [SPEC]: bodyOf(refusedAddition) };
    const refusedModel = observed(refusedTexts);
    const refusedRoute = verbatimRouteReader(refusedModel, blobReader(refusedTexts).read);
    if (refusedRoute === undefined) throw new Error('no route');
    const refused = refusalOf(refusedRoute(leafOf(refusedModel)));
    expect(refused.refused).toBe('excluded-content');
    expect(refused.detail).toContain('malformed-code-context');
    expect(refused.detail).not.toContain('alert');
    const servedTexts = { ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [SPEC]: bodyOf(servedAddition) };
    const servedModel = observed(servedTexts);
    const servedRoute = verbatimRouteReader(servedModel, blobReader(servedTexts).read);
    if (servedRoute === undefined) throw new Error('no route');
    const served = servedRoute(leafOf(servedModel));
    expect(served).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(served as Uint8Array)).toBe(bodyOf(servedAddition));
  });

  it('refuses bytes that do not hash to the exact object, a body over the per-source envelope, and non-text bytes', () => {
    const model = observed();
    const leaf = leafOf(model);
    const forged = verbatimRouteReader(model, forgedBlobGit(new TextEncoder().encode(`${SPEC_TEXT}\n`)));
    if (forged === undefined) throw new Error('no route');
    expect(refusalOf(forged(leaf)).refused).toBe('reference-unresolvable');
    const tooLarge = verbatimRouteReader(model, blobReader().read, undefined, { ...PWB_RESOURCE_LIMITS, maxBytesPerSource: 16 });
    if (tooLarge === undefined) throw new Error('no route');
    expect(refusalOf(tooLarge(leaf)).refused).toBe('excluded-content');
    const binary = { ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [SPEC]: `${SPEC_TEXT}\u0000` };
    const binaryModel = observed(binary);
    const binaryRoute = verbatimRouteReader(binaryModel, blobReader(binary).read);
    if (binaryRoute === undefined) throw new Error('no route');
    expect(refusalOf(binaryRoute(leafOf(binaryModel))).refused).toBe('excluded-content');
  });

  it('refuses a source the evaluation itself excluded, reading nothing', () => {
    const model = observed();
    const source = sourceOf(model, SPEC);
    const excluded: PocModel = JSON.parse(JSON.stringify(model)) as PocModel;
    if (excluded.projectShape.kind !== 'observed') throw new Error('unreachable');
    const target = excluded.projectShape.sources.find((candidate) => candidate.path === SPEC) as { record: unknown };
    target.record = {
      path: SPEC,
      outcome: 'excluded',
      exclusion: { redactionClass: 'excluded-artifact', repositoryRelativePath: SPEC, exclusionReason: 'denied-path', detail: 'test' },
      unknown: { failureState: 'sourceMissingOrUnreadable', degradationState: 'degraded', unknownReason: 'excluded-content' },
    };
    const { read, reads } = blobReader();
    const route = verbatimRouteReader(excluded, read);
    if (route === undefined) throw new Error('no route');
    expect(refusalOf(route({ path: SPEC, revision: excluded.projectShape.identity.revision, identity: source.identity })).refused).toBe('excluded-content');
    expect(reads).toEqual([]);
  });

  it('returns undefined (Unknown, unreachable) when Git cannot serve the object', () => {
    const model = observed();
    const route = verbatimRouteReader(model, UNREADABLE_GIT);
    if (route === undefined) throw new Error('no route');
    expect(route(leafOf(model))).toBeUndefined();
  });
});

// syzygy-bpyt.6.17: the route reads through the core's bounded read. The size is checked before the body moves, the production
// runner holds stdout to the envelope, and Git's stderr is captured rather than reaching the daemon's.
describe('bounded read (syzygy-bpyt.6.17)', () => {
  const SPEC_BYTES = new TextEncoder().encode(SPEC_TEXT).byteLength;
  const withEnvelope = (maxBytesPerSource: number) => ({ ...PWB_RESOURCE_LIMITS, maxBytesPerSource });
  const objectIdOf = (model: PocModel): string => {
    const anchor = sourceOf(model, SPEC).anchor;
    if (anchor.kind !== 'blob') throw new Error(anchor.kind);
    return anchor.objectId;
  };
  /** A real repository holding the fixture texts' blobs, minus `omit`. */
  function repositoryWith(texts: Readonly<Record<string, string>>, omit: readonly string[] = []): string {
    const root = mkdtempSync(join(tmpdir(), 'verbatim-route-'));
    cleanups.push(root);
    execFileSync('git', ['init', '-q', root], { stdio: ['ignore', 'pipe', 'pipe'] });
    for (const [path, text] of Object.entries(texts)) {
      if (omit.includes(path)) continue;
      const file = join(root, 'blob.tmp');
      writeFileSync(file, text);
      execFileSync('git', ['-C', root, 'hash-object', '-w', file], { stdio: ['ignore', 'pipe', 'pipe'] });
    }
    return root;
  }

  it('refuses a body over the per-source envelope having asked Git only its size, never its body', () => {
    const model = observed();
    const { read, reads, calls } = blobReader();
    const route = verbatimRouteReader(model, read, undefined, withEnvelope(SPEC_BYTES - 1));
    if (route === undefined) throw new Error('no route');
    const refused = refusalOf(route(leafOf(model)));
    expect(refused).toEqual({ refused: 'excluded-content', detail: `${SPEC} exceeds the per-source envelope (${SPEC_BYTES} > ${SPEC_BYTES - 1} bytes); nothing was rendered.` });
    expect(calls).toEqual([['cat-file', '-s', objectIdOf(model)]]);
    expect(reads).toEqual([]);
  });

  it('serves a body exactly at the envelope, reading it once', () => {
    const model = observed();
    const { read, reads } = blobReader();
    const route = verbatimRouteReader(model, read, undefined, withEnvelope(SPEC_BYTES));
    if (route === undefined) throw new Error('no route');
    expect(new TextDecoder().decode(route(leafOf(model)) as Uint8Array)).toBe(SPEC_TEXT);
    expect(reads).toEqual([objectIdOf(model)]);
  });

  it('the production runner holds Git’s stdout to the envelope: one byte over and the read itself fails', () => {
    const model = observed();
    const root = repositoryWith(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC);
    const objectId = objectIdOf(model);
    expect(gitBlobReaderFor(root, withEnvelope(SPEC_BYTES))(['cat-file', 'blob', objectId]).byteLength).toBe(SPEC_BYTES);
    expect(() => gitBlobReaderFor(root, withEnvelope(SPEC_BYTES - 1))(['cat-file', 'blob', objectId])).toThrow();
    // Through the route, against real Git: at the envelope served, past it refused, a missing object Unknown.
    const at = verbatimRouteReader(model, gitBlobReaderFor(root, withEnvelope(SPEC_BYTES)), undefined, withEnvelope(SPEC_BYTES));
    expect(at?.(leafOf(model))).toBeInstanceOf(Uint8Array);
    const over = verbatimRouteReader(model, gitBlobReaderFor(root, withEnvelope(SPEC_BYTES - 1)), undefined, withEnvelope(SPEC_BYTES - 1));
    expect(refusalOf(over?.(leafOf(model))).refused).toBe('excluded-content');
    const empty = repositoryWith(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [SPEC]);
    expect(verbatimRouteReader(model, gitBlobReaderFor(empty))?.(leafOf(model))).toBeUndefined();
  });

  it('captures Git’s stderr on the failure and writes none of it to the daemon’s stderr', () => {
    const model = observed();
    const root = repositoryWith(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [SPEC]);
    const objectId = objectIdOf(model);
    const written: string[] = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
      written.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    });
    let failure: unknown;
    let routed: unknown;
    try {
      try {
        gitBlobReaderFor(root)(['cat-file', 'blob', objectId]);
      } catch (error) {
        failure = error;
      }
      routed = verbatimRouteReader(model, gitBlobReaderFor(root))?.(leafOf(model));
    } finally {
      spy.mockRestore();
    }
    // Captured: Git's diagnostic rides on the thrown error.
    expect(String((failure as { stderr?: Buffer } | undefined)?.stderr ?? '')).toMatch(/fatal|not a valid object/);
    expect(routed).toBeUndefined();
    // Not inherited: nothing non-empty reached process stderr.
    expect(written.filter((chunk) => chunk !== '')).toEqual([]);
  });
});

describe('Polaris route with the verbatim reader', () => {
  const context = (path: string): RouteContext => ({ request: { method: 'GET', path, query: new URLSearchParams(), headers: { host: '127.0.0.1:1' } } });
  const bodyOf = (response: RouteResponse | Promise<RouteResponse>): string => {
    if (response instanceof Promise) throw new Error('POC routes answer synchronously');
    return String(response.body);
  };
  const routeAt = (routes: readonly Route[], path: string): Route => {
    const found = routes.find((route) => route.path === path);
    if (found === undefined) throw new Error(`no route at ${path}`);
    return found;
  };

  it('serves the selected requirement blocks on the Polaris human route only; the machine channel never carries them', () => {
    const model = observed();
    const { read, reads } = blobReader();
    const routes = pocRoutes(() => model, undefined, (current) => ({ verbatim: verbatimRouteReader(current, read) }));
    const body = bodyOf(routeAt(routes, '/polaris').handle(context('/polaris')));
    expect(body).toContain('data-verbatim="rendered"');
    for (const requirement of PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS) expect(body).toContain(`data-verbatim-requirement="${requirement.title}"`);
    expect(body).toContain('The switchboard SHALL resolve the sender');
    expect(body).not.toContain(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PURPOSE);
    expect(reads).toHaveLength(1);
    const machineBody = bodyOf(routeAt(routes, POC_MACHINE_PATH).handle(context(POC_MACHINE_PATH)));
    expect(machineBody).not.toContain('SHALL resolve the sender');
    expect(machineBody).not.toContain(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PURPOSE);
    expect(reads).toHaveLength(1);
    // Every human render reads afresh: nothing is cached between requests.
    bodyOf(routeAt(routes, '/polaris').handle(context('/polaris')));
    expect(reads).toHaveLength(2);
    // Without the render input (the default), the same route renders nothing verbatim.
    const bare = bodyOf(routeAt(pocRoutes(() => model), '/polaris').handle(context('/polaris')));
    expect(bare).toContain('data-verbatim="not-rendered"');
    expect(bare).not.toContain('SHALL resolve the sender');
  });

  it('renders directly with the route: the same selection, nothing stored on the model', () => {
    const model = observed();
    const before = JSON.stringify(model);
    const html = renderPolarisPage(model, '', {}, { verbatim: verbatimRouteReader(model, blobReader().read) });
    expect(html).toContain('data-verbatim="rendered"');
    expect(html).not.toContain(PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PURPOSE);
    expect(JSON.stringify(model)).toBe(before);
  });
});

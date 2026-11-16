import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BUTLERS_POC_SEEDS, buildPocModel, type PocModel, type PocUnknown } from '@syzygy/three-surface-poc-core';

import { renderOrreryPage } from './orrery.js';
import { renderPolarisPage } from './polaris.js';
import { buildFixtureModel, fixtureRepoWithGit } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, projectShapeFixtureGit } from './test-project-shape-fixture.js';
import { renderTrajectoryPage } from './trajectory.js';

// M4 slices 1–2 (P-71 Q1, Q4): every Unknown the three surfaces disclose
// carries a closed RFC2-24 reason and a route, and every rendered route has
// its machine twin under the same id. Expected values are literals here,
// never imported from the module under test.

const CLOSED_REASONS = [
  'missing-declaration', 'missing-evidence', 'no-currency-bound-declared', 'stale-beyond-currency-bound',
  'mapping-coverage-absent', 'unconsented-source-or-provider', 'excluded-content', 'contradicted-pending-adjudication',
  'challenge-suspended', 'source-uncaptured-or-unreachable', 'reference-unresolvable', 'execution-blocked',
];

type Surface = 'polaris' | 'trajectory' | 'orrery';
const RENDER: Readonly<Record<Surface, (model: PocModel, mountPrefix?: string) => string>> = {
  polaris: renderPolarisPage, trajectory: renderTrajectoryPage, orrery: renderOrreryPage,
};

interface Disclosure { readonly id: string; readonly inner: string }

/** Every element carrying `data-unknown-disclosure`, with its whole
 * subtree, found by tag depth over the served body (styles and scripts
 * removed), independently of the renderers. */
function disclosures(html: string): Disclosure[] {
  const body = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const out: Disclosure[] = [];
  for (const open of body.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\sdata-unknown-disclosure="([^"]*)"[^>]*>/g)) {
    const tag = open[1]!;
    const start = open.index! + open[0].length;
    let depth = 1;
    let end = body.length;
    for (const next of body.slice(start).matchAll(new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g'))) {
      depth += next[1] === '/' ? -1 : 1;
      if (depth === 0) { end = start + next.index!; break; }
    }
    out.push({ id: open[2]!, inner: open[0] + body.slice(start, end) });
  }
  return out;
}

/** The disclosure's primary reason: the marker's own attribute, else the
 * first reason reference inside it (Polaris links the reason to its gap). */
function reasonOf(disclosure: Disclosure): string | undefined {
  return /^<[^>]*\sdata-unknown-reason="([^"]*)"/.exec(disclosure.inner)?.[1]
    ?? /\sdata-unknown-reason="([^"]*)"/.exec(disclosure.inner)?.[1];
}

/** The rendered route sentence after "Route:", markup removed. */
function routeOf(disclosure: Disclosure): string | undefined {
  const text = disclosure.inner.replace(/<[^>]+>/g, '');
  return /Route:\s*([^.]+)\./.exec(text)?.[1]?.trim() || undefined;
}

/** An Unknown badge or `provenance-none` span outside every disclosure:
 * covered only when it carries the marker, sits inside one, or shares its
 * exact-table row with the row's own marker. The legend is presentation. */
function uncovered(html: string): string[] {
  const body = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const failures: string[] = [];
  const stack: { tag: string; attrs: string }[] = [];
  for (const match of body.matchAll(/<(\/)?([a-z][a-z0-9]*)([^<>]*)>/gi)) {
    const [, closing, tag = '', attrs = ''] = match;
    if (closing !== undefined) {
      const index = stack.map((entry) => entry.tag).lastIndexOf(tag);
      if (index >= 0) stack.splice(index);
      continue;
    }
    const unknownBadge = /\sclass="[^"]*\bepistemic epistemic-unknown\b/.test(attrs);
    const none = /\sclass="[^"]*\bprovenance-none\b/.test(attrs);
    if (unknownBadge || none) {
      const inside = [{ tag, attrs }, ...stack];
      const legend = inside.some((entry) => /\sclass="legend"/.test(entry.attrs));
      const marked = inside.some((entry) => /\sdata-unknown-disclosure="/.test(entry.attrs));
      const row = [...stack].reverse().find((entry) => entry.tag === 'tr');
      const rowId = row === undefined ? undefined : /\sdata-(?:entity|relationship)-id="([^"]*)"/.exec(row.attrs)?.[1];
      if (!legend && !marked && rowId === undefined) failures.push(match[0]);
      if (!legend && !marked && rowId !== undefined) failures.push(`row:${rowId}`);
    }
    if (!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tag) && !attrs.trimEnd().endsWith('/')) {
      stack.push({ tag, attrs });
    }
  }
  // A row-held badge is covered by the row's own marker, and only by it.
  const rowsMarked = new Set(disclosures(html).map((disclosure) => disclosure.id));
  return failures.filter((failure) => !failure.startsWith('row:') || !rowsMarked.has(failure.slice('row:'.length)));
}

interface Sweep { readonly denominator: number; readonly failures: readonly string[] }

/** The AC1 sweep for one served page. */
function sweep(html: string): Sweep {
  const failures: string[] = [];
  const all = disclosures(html);
  for (const disclosure of all) {
    const reason = reasonOf(disclosure);
    if (reason === undefined || !CLOSED_REASONS.includes(reason)) failures.push(`${disclosure.id}: reason ${reason ?? 'absent'}`);
    if (routeOf(disclosure) === undefined) failures.push(`${disclosure.id}: no route`);
  }
  for (const tag of uncovered(html)) failures.push(`unmarked Unknown: ${tag}`);
  return { denominator: all.length, failures };
}

// ---------------------------------------------------------------------------
// Models: the plain fixture, the observed project shape, unreachable
// observers, no seeds at all, and a materialized item whose worker change
// is observed without verification.

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

const cleanups: string[] = [];
const models = new Map<string, PocModel>();

beforeAll(() => {
  models.set('plain', buildFixtureModel(cleanups));
  models.set('observed-shape', buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } }));
  {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    const realGit = (root: string, args: readonly string[]): string => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    models.set('unreachable', buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: revision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@unreachable', asOf: '2026-08-30T12:00:00Z' },
      runGit: (root, args) => { if (args[0] === 'ls-tree') throw new Error('refused'); return realGit(root, args); },
      runWorkItemQuery: () => { throw new Error('connection refused'); },
    }));
    // A seed set naming a repository with no materialization support: the
    // one model state with no dispatch, so the action's Unknown is routed.
    models.set('unsupported-repository', buildPocModel({
      seeds: { ...BUTLERS_POC_SEEDS, project: { ...BUTLERS_POC_SEEDS.project, repositoryId: 'repository:unsupported-poc' } },
      repoRoot,
      repositoryRevision: revision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@unsupported-repository', asOf: '2026-08-30T12:00:00Z' },
      runWorkItemQuery: () => { throw new Error('connection refused'); },
    }));
  }
  {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    for (const [path, contents] of [
      ['src/butlers/connectors/whatsapp_user_client.py', 'x = 1\n'],
      ['tests/connectors/test_whatsapp_user_client.py', 'def test_normalization(): pass\n'],
    ] as const) {
      mkdirSync(dirname(join(repoRoot, path)), { recursive: true });
      writeFileSync(join(repoRoot, path), contents, 'utf8');
    }
    git(repoRoot, ['add', '-A']);
    git(repoRoot, ['commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-sweep-1]']);
    const changed = git(repoRoot, ['rev-parse', 'HEAD']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', changed]);
    git(repoRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);
    const rows = [{ revision: 'dolt-rev-2', id: 'bu-sweep-1', title: 'Materialized work item', status: 'in_progress', issue_type: 'task', priority: 2, created_at: '2026-08-30T00:00:00Z', updated_at: '2026-08-30T00:00:00Z', closed_at: null }];
    models.set('worker-change', buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: changed,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@worker-change', asOf: '2026-08-30T12:00:00Z' },
      materializationRecord: { beadId: 'bu-sweep-1', externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization', targetRepoRoot: repoRoot, createdAt: '2026-08-30T00:00:00Z', doltRevisionAtCreation: 'dolt-rev-1', attribution: 'test-actor' },
      runWorkItemQuery: (_root, sql) => sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: 'dolt-rev-2' }]),
    }));
  }
});

afterAll(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function model(name: string): PocModel {
  const found = models.get(name);
  if (found === undefined) throw new Error(`no model ${name}`);
  return found;
}

// The per-surface denominators measured at this slice, one row per model.
// A disclosure that disappears, or a new one that arrives unrouted, moves
// a figure or fails the sweep.
// SEC-5 (syzygy-jytt) added one withheld-title mark per rendered card and
// the board's notice: plain and observed-shape 11 → 17 (five cards, one
// notice), worker-change 4 → 6 (one card, one notice).
// syzygy-bpyt.7.1 removed the seedless build; its no-seeds row (8, 2, 1)
// became unsupported-repository, the remaining state with no dispatch.
const DENOMINATORS: Readonly<Record<string, Readonly<Record<Surface, number>>>> = {
  plain: { polaris: 21, trajectory: 17, orrery: 9 },
  'observed-shape': { polaris: 13, trajectory: 17, orrery: 9 },
  unreachable: { polaris: 24, trajectory: 1, orrery: 10 },
  'unsupported-repository': { polaris: 22, trajectory: 2, orrery: 9 },
  'worker-change': { polaris: 19, trajectory: 6, orrery: 7 },
};

describe('every surface Unknown carries a closed reason and a route (M4 slice 1, POC-REQ-060)', () => {
  for (const [name, expected] of Object.entries(DENOMINATORS)) {
    it(`${name}: per-surface denominators, zero exceptions on each`, () => {
      const counts: Record<string, number> = {};
      for (const surface of ['polaris', 'trajectory', 'orrery'] as const) {
        const result = sweep(RENDER[surface](model(name)));
        expect(result.failures, `${name}/${surface}`).toEqual([]);
        counts[surface] = result.denominator;
      }
      process.stdout.write(`[M4 unknown sweep] ${JSON.stringify({ model: name, ...counts })}\n`);
      expect(counts).toEqual(expected);
    });
  }

  it('reaches the worker-change, materialization, region and lifecycle disclosures somewhere in the population', () => {
    const ids = new Set<string>();
    for (const name of Object.keys(DENOMINATORS)) {
      for (const surface of ['polaris', 'trajectory', 'orrery'] as const) {
        for (const disclosure of disclosures(RENDER[surface](model(name)))) ids.add(disclosure.id.replace(/^(work-item|worker-change):[^/]+/, '$1:*'));
      }
    }
    for (const id of ['worker-change:*/verification', 'work-item:*/verification', 'materialization', 'region:code-structure', 'region:work-items', 'region:work-item-titles', 'relationship:intent-to-work', 'region:unmapped-code']) {
      expect(ids, id).toContain(id);
    }
    expect([...ids].some((id) => id.endsWith('/lifecycle')), 'a proposal lifecycle disclosure').toBe(true);
  });

  it('carries the script-built Orrery unmapped block\'s reason and route in its data island, twinned with the machine entity', () => {
    const html = renderOrreryPage(model('plain'));
    const island = JSON.parse(/<script type="application\/json" id="orrery-data">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? 'null') as { unmappedRegionUnknown: unknown };
    expect(island.unmappedRegionUnknown).toEqual({ reason: 'mapping-coverage-absent', route: 'Run or declare the mapping', actor: 'owner', verb: 'declare', target: 'artifact' });
    expect(html).toContain('unmapped.dataset.unknownReason = known.reason;');
  });

  it('fails when a disclosure loses its reason, gains a thirteenth, drops its route, or an Orrery row re-emits a bare provenance-none span', () => {
    const polaris = renderPolarisPage(model('plain'));
    const trajectory = renderTrajectoryPage(model('plain'));
    const orrery = renderOrreryPage(model('plain'));
    const mutants: [string, string, string][] = [
      ['polaris blank reason', polaris, polaris.replace('<span data-unknown-reason="missing-evidence">', '<span data-unknown-reason="">')],
      ['trajectory blank reason', trajectory, trajectory.replace('data-unknown-reason="missing-evidence"', 'data-unknown-reason=""')],
      ['orrery blank reason', orrery, orrery.replace('data-unknown-reason="missing-evidence"', 'data-unknown-reason=""')],
      ['thirteenth reason', orrery, orrery.replace('data-unknown-reason="mapping-coverage-absent"', 'data-unknown-reason="none-modelled"')],
      ['dropped route', trajectory, trajectory.replace(/Route: <span data-unknown-route[^>]*>[^<]*<\/span>\./, '')],
      ['bare provenance-none', orrery, orrery.replace(/<span class="provenance-none" data-unknown-disclosure="[^"]*" data-unknown-reason="[^"]*">/, '<span class="provenance-none">')],
    ];
    for (const [label, original, mutated] of mutants) {
      expect(mutated, label).not.toBe(original);
      expect(sweep(original).failures, label).toEqual([]);
      expect(sweep(mutated).failures.length, label).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC2: per-tuple machine parity, by id, over both id sets.

interface RenderedRoute { readonly id: string; readonly reason: string | undefined; readonly routes: readonly unknown[]; readonly action: unknown }

function renderedRoutes(html: string): RenderedRoute[] {
  return disclosures(html)
    .filter((disclosure) => disclosure.inner.includes('data-unknown-route="'))
    .map((disclosure) => {
      const action = /<a href="[^"#]*\/(trajectory)#([^"]*)"[^>]*data-cross-surface-class="action-route" data-cross-source="([^"]*)"/.exec(disclosure.inner);
      return {
        id: disclosure.id,
        reason: reasonOf(disclosure),
        routes: [...disclosure.inner.matchAll(/<span data-unknown-route="([^"]*)" data-route-actor="([^"]*)" data-route-verb="([^"]*)" data-route-target="([^"]*)">([^<]*)<\/span>/g)]
          .map((route) => ({ reason: route[1], route: route[5], actor: route[2], verb: route[3], target: route[4] })),
        action: action === null ? null : { surface: action[1], anchor: action[2], source: action[3] },
      };
    });
}

function machineUnknowns(m: PocModel): Map<string, PocUnknown> {
  const out = new Map<string, PocUnknown>();
  for (const item of [...m.entities, ...m.relationships]) if (item.epistemic.label === 'Unknown') out.set(item.id, item.epistemic);
  for (const subject of m.unknownSubjects) out.set(subject.id, subject.epistemic);
  return out;
}

describe('every rendered route has its machine twin under the same id (M4 slice 2, PWB-REQ-020)', () => {
  for (const name of Object.keys(DENOMINATORS)) {
    it(`${name}: per tuple by id, and over both id sets`, () => {
      const m = model(name);
      const machine = machineUnknowns(m);
      const renderedIds = new Set<string>();
      let tuples = 0;
      for (const surface of ['polaris', 'trajectory', 'orrery'] as const) {
        for (const rendered of renderedRoutes(RENDER[surface](m))) {
          tuples += 1;
          renderedIds.add(rendered.id);
          const twin = machine.get(rendered.id);
          expect(twin, `${surface} ${rendered.id} has no machine twin`).toBeDefined();
          expect(rendered.reason, `${surface} ${rendered.id} reason`).toBe(twin?.closedReason);
          expect(rendered.routes, `${surface} ${rendered.id} routes`).toEqual(twin?.resolutionRoutes);
          expect(rendered.action, `${surface} ${rendered.id} action route`).toEqual(
            twin?.actionRoute === undefined ? null : { ...twin.actionRoute, source: rendered.id });
        }
      }
      expect([...renderedIds].sort(), `${name} rendered ids`).toEqual([...machine.keys()].sort());
      expect(tuples).toBeGreaterThanOrEqual(renderedIds.size);
      process.stdout.write(`[M4 route parity] ${JSON.stringify({ model: name, tuples, ids: renderedIds.size, machine: machine.size })}\n`);
    });
  }

  it('fails when a rendered route, reason or action route parts from its machine twin', () => {
    const m = model('plain');
    const orrery = renderOrreryPage(m);
    const check = (html: string): boolean => renderedRoutes(html).every((rendered) => {
      const twin = machineUnknowns(m).get(rendered.id);
      return twin !== undefined && rendered.reason === twin.closedReason
        && JSON.stringify(rendered.routes) === JSON.stringify(twin.resolutionRoutes)
        && JSON.stringify(rendered.action) === JSON.stringify(twin.actionRoute === undefined ? null : { ...twin.actionRoute, source: rendered.id });
    });
    expect(check(orrery)).toBe(true);
    const actionless = orrery.replace(/ <a href="[^"]*" aria-label="[^"]*" data-cross-surface-class="action-route"[^>]*>[^<]*<\/a>/, '');
    const reworded = orrery.replace('>Produce or capture evidence</span>', '>Capture evidence</span>');
    const reactor = orrery.replace('data-route-actor="operator"', 'data-route-actor="owner"');
    for (const mutated of [actionless, reworded, reactor]) {
      expect(mutated).not.toBe(orrery);
      expect(check(mutated)).toBe(false);
    }
  });
});

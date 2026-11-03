import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import type { PocModel } from '@syzygy/three-surface-poc-core';

import type { PolarisNarrative } from './polaris-narrative.js';
import { renderPolarisPresentation } from './polaris.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, projectShapeFixtureGit } from './test-project-shape-fixture.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** How the Polaris surface would be named if something cited it. */
const POLARIS_SURFACE = /(^|[^A-Za-z0-9-])\/polaris\b|polaris\.ts\b|apps\/three-surface-poc\/src\/polaris|\/api\/poc\b|^polaris$/i;

const GENERATOR_REQUIREMENT = /^REQ-polaris-generation-\d{3}$/;

/** Owner decisions of the local-agent dossier mode, the P-107 waiting-sessions direction its v1.2 cites, and the one-command-run
 * direction; each must be declared by a `Decision ID:` line under decisions/. */
const DOSSIER_DECISION = /^POLARIS-DOSSIER-(?:LOCAL-AGENT-[A-Z0-9]+(?:-[A-Z0-9]+)*|WAITING-SESSIONS|ONE-COMMAND-RUN)-\d{4}-\d{2}-\d{2}$/;

/** A `Decision ID:` declaration line: the id in code ticks, then the line's end or a parenthetical (the waiting-sessions direction names
 * the id's origin that way). Any other trailing text, such as "withdrawn", does not declare. */
const DECISION_DECLARATION = /^Decision ID: `([A-Z0-9-]+)`(?:$| \()/gm;

/** Owner directions on the dossier's local agent CLI runner (P-111); each must be declared by a `Decision ID:` line under decisions/. */
const DOSSIER_RUNNER_DECISION = /^DOSSIER-(?:LOCAL-CLI-SUBPROCESS|CLI-RUNNER-[A-Z0-9]+(?:-[A-Z0-9]+)*)-\d{4}-\d{2}-\d{2}$/;

/** P-115's drafting direction; its owning Decision ID must also be declared. */
const MACHINE_CEILING_DECISION = /^OWNER-DIRECTION-MACHINE-CEILING-2026-10-15$/;

/** Hand-typed warrant id families (a new family must be added here). */
const WARRANT_FAMILIES = [
  GENERATOR_REQUIREMENT,
  DOSSIER_DECISION,
  DOSSIER_RUNNER_DECISION,
  MACHINE_CEILING_DECISION,
  /^(VIS|SEC|SDR|RFC\d+|CC-[A-Z]+|POC-REQ|PWB-REQ|CAP1-REQ)-\d+[a-z]?(\([a-z]\))?$/,
  /^(POC|POLARIS|PWB-STATE1-AMENDMENT)-DIR-\d{4}-\d{2}-\d{2}$/,
  // Redis local-agent owner directions: `Decision ID:` in decisions/REDIS-LOCAL-AGENT-SITTING-DIRECTION.md.
  /^REDIS-LOCAL-AGENT-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{4}-\d{2}-\d{2}$/,
  /^P-\d+-ruling-\d{4}-\d{2}-\d{2}( \(decisions\/[A-Z0-9-]+\.md\))?$/,
  /^decisions\/[A-Z0-9-]+\.md$/,
  /^[a-z0-9-]+\/(POC|PWB|CAP1)-REQ-\d+$/,
];

function walk(directory: string, accept: (path: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path, accept, out);
    else if (accept(path)) out.push(path);
  }
  return out;
}

/**
 * Every tracked file under the roots that `accept` admits, read from git
 * independently of {@link walk} (syzygy-jsyi). The walk also reads untracked
 * files, so it must contain this population; a faster or narrower walk that
 * drops a tracked file fails here, not silently.
 */
function trackedPopulation(roots: readonly string[], accept: (path: string) => boolean): string[] {
  return execFileSync('git', ['-C', REPO_ROOT, 'ls-files', '-z', '--', ...roots], { encoding: 'utf8' })
    .split('\0')
    .filter((path) => path !== '' && !path.split('/').some((part) => part === 'node_modules' || part === 'dist' || part === '.git'))
    .map((path) => join(REPO_ROOT, path))
    // A tracked file deleted in the working tree is not there to sweep.
    .filter((path) => accept(path) && existsSync(path));
}

function expectPopulationCovered(walked: readonly string[], roots: readonly string[], accept: (path: string) => boolean): void {
  const tracked = trackedPopulation(roots, accept);
  const walkedSet = new Set(walked);
  expect(tracked.length).toBeGreaterThan(0);
  expect(tracked.filter((path) => !walkedSet.has(path)).map((path) => relative(REPO_ROOT, path)), `tracked files the walk missed, of ${tracked.length} tracked and ${walked.length} walked`).toEqual([]);
}

function machineReferences(model: PocModel, narrative: PolarisNarrative): string[] {
  const refs: string[] = [];
  for (const entity of model.entities) for (const item of entity.provenance) refs.push(item.source, item.revision);
  for (const relationship of model.relationships) for (const item of relationship.provenance) refs.push(item.source, item.revision);
  const shape = model.projectShape;
  if (shape.kind === 'observed') {
    for (const source of shape.sources) refs.push(source.path, source.identity);
    for (const group of [shape.projectAccount, shape.items, shape.facts, Object.values(shape.classes)]) {
      for (const entry of group) for (const support of entry.claim.support) refs.push(support.path, support.sourceIdentity ?? '');
    }
  }
  refs.push(model.proposedWork.proposal.path, model.proposedWork.delta.path);
  if (model.proposedWork.currentAuthority.kind === 'baseline-spec') refs.push(model.proposedWork.currentAuthority.path);
  for (const block of narrative.blocks) for (const anchor of block.anchors) refs.push(anchor.targetId, anchor.locator);
  return refs.filter((ref) => ref !== '');
}

describe('Zero downstream citations of Polaris as authority (PWB-REQ-014)', () => {
  it('no machine reference on the model or its narrative anchors targets the Polaris surface', () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) } });
    const { narrative } = renderPolarisPresentation(model);
    const refs = machineReferences(model, narrative);
    expect(refs.length).toBeGreaterThan(100);
    expect(refs.filter((ref) => POLARIS_SURFACE.test(ref))).toEqual([]);
    // The anchors' own targets are project artifacts, evidence, decisions or
    // work — never a presentation surface.
    for (const block of narrative.blocks) for (const anchor of block.anchors) expect(anchor.targetClass).not.toMatch(/presentation|polaris|surface/i);
  });

  it('every OpenSpec warrant entry belongs to a known id family and none targets Polaris (POLARIS-DIR-* ids are owner decisions)', () => {
    const isSpec = (path: string): boolean => path.endsWith('.md');
    const specs = walk(join(REPO_ROOT, 'openspec'), isSpec);
    expectPopulationCovered(specs, ['openspec'], isSpec);
    const entries: { file: string; key: string; value: string }[] = [];
    const declaredGeneratorRequirements = new Set<string>();
    for (const file of specs) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/^ID: (REQ-polaris-generation-\d{3})$/gm)) {
        declaredGeneratorRequirements.add(match[1] as string);
      }
      for (const block of text.matchAll(/```yaml\s*\nwarrants:\n([\s\S]*?)```/g)) {
        for (const line of (block[1] as string).split('\n')) {
          const match = /^\s+([a-z_]+):\s*(.*)$/.exec(line);
          if (match === null) continue;
          const list = (match[2] as string).replace(/^\[|\]$/g, '').split(/,(?![^(]*\))/).map((entry) => entry.trim().replace(/^["']|["']$/g, '')).filter((entry) => entry !== '');
          for (const value of list) entries.push({ file: relative(REPO_ROOT, file), key: match[1] as string, value });
        }
      }
    }
    expect(specs.length).toBeGreaterThan(3);
    expect(entries.length).toBeGreaterThan(300);
    const unknownFamily = entries.filter((entry) => !WARRANT_FAMILIES.some((family) => family.test(entry.value)));
    expect(unknownFamily, 'warrant entries outside every hand-typed id family').toEqual([]);
    expect(entries.filter((entry) => POLARIS_SURFACE.test(entry.value))).toEqual([]);
    const decisionsDirectory = join(REPO_ROOT, '.syzygy/governance/decisions');
    const declaredDecisions = new Set<string>();
    for (const file of walk(decisionsDirectory, isSpec)) {
      for (const match of readFileSync(file, 'utf8').matchAll(DECISION_DECLARATION)) declaredDecisions.add(match[1] as string);
    }
    for (const entry of entries.filter((candidate) => DOSSIER_RUNNER_DECISION.test(candidate.value) || MACHINE_CEILING_DECISION.test(candidate.value))) {
      expect(entry.key).toBe('decisions');
      expect(declaredDecisions.has(entry.value), `${entry.value} must have an owning Decision ID declaration`).toBe(true);
    }
    const polarisNamed = entries.filter((entry) => /polaris/i.test(entry.value));
    expect(polarisNamed.length).toBeGreaterThan(0);
    for (const entry of polarisNamed) {
      if (GENERATOR_REQUIREMENT.test(entry.value)) {
        expect(entry.key).toBe('parent_requirements');
        expect(declaredGeneratorRequirements.has(entry.value), 'parent requirement must have an owning declaration').toBe(true);
      } else if (DOSSIER_DECISION.test(entry.value)) {
        expect(entry.key).toBe('decisions');
        expect(declaredDecisions.has(entry.value), `${entry.value} must have an owning Decision ID declaration`).toBe(true);
      } else {
        expect(entry.key).toBe('decisions');
        expect(entry.value).toMatch(/^POLARIS-DIR-\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('reads a Decision ID declaration only at the line end or before a parenthetical (mutant: leave the end unanchored)', () => {
    const declared = (text: string): string[] => [...text.matchAll(DECISION_DECLARATION)].map((match) => match[1] as string);
    expect(declared('Decision ID: `A-1`\nDecision ID: `B-2` (named for the\ndirection)\n')).toEqual(['A-1', 'B-2']);
    expect(declared('Decision ID: `A-1` (withdrawn; see B)\n')).toEqual(['A-1']);
    expect(declared('Decision ID: `A-1` withdrawn\nDecision ID: `B-2`, superseded\nDecision ID: `C-3`x\n')).toEqual([]);
  });

  it('recognizes dossier decision identity syntax without accepting presentation references', () => {
    for (const value of ['POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05', 'POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05', 'POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08', 'POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14']) {
      expect(DOSSIER_DECISION.test(value)).toBe(true);
    }
    for (const value of ['POLARIS-DOSSIER-LOCAL-AGENT-2026-10-05', 'POLARIS-DOSSIER-LOCAL-AGENT-MODE', 'POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05/polaris', 'polaris-dossier-local-agent-mode-2026-10-05', 'POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05 (/polaris)', 'POLARIS-DOSSIER-WAITING-SESSIONS', 'POLARIS-DOSSIER-WAITING-SESSIONS-X-2026-10-08', 'POLARIS-DOSSIER-2026-10-08', 'POLARIS-DOSSIER-ONE-COMMAND-RUN', 'POLARIS-DOSSIER-ONE-COMMAND-RUN-X-2026-10-14']) {
      expect(DOSSIER_DECISION.test(value)).toBe(false);
    }
    for (const value of ['DOSSIER-LOCAL-CLI-SUBPROCESS-2026-10-15', 'DOSSIER-CLI-RUNNER-REPAIR-AND-DISCLOSE-2026-10-15']) {
      expect(DOSSIER_RUNNER_DECISION.test(value)).toBe(true);
    }
    for (const value of ['DOSSIER-LOCAL-CLI-SUBPROCESS', 'DOSSIER-2026-10-15', 'DOSSIER-CLI-RUNNER-2026-10-15', 'DOSSIER-LOCAL-CLI-SUBPROCESS-2026-10-15 (/polaris)', 'dossier-local-cli-subprocess-2026-10-15']) {
      expect(DOSSIER_RUNNER_DECISION.test(value)).toBe(false);
    }
  });

  it('recognizes generator requirement identity syntax without accepting presentation references', () => {
    expect(GENERATOR_REQUIREMENT.test('REQ-polaris-generation-001')).toBe(true);
    for (const value of ['polaris', '/polaris', '/api/poc', 'polaris.ts', 'REQ-polaris-generation-1', 'REQ-polaris-generation-001/preview']) {
      expect(GENERATOR_REQUIREMENT.test(value)).toBe(false);
    }
  });

  it('no source/authority/provenance field in the governance, spec, code or docs trees names the Polaris surface', () => {
    const roots = ['.syzygy/governance', 'openspec', 'packages', 'apps', 'docs'];
    const isSwept = (path: string): boolean => /\.(md|json|ya?ml|ts)$/.test(path);
    const files = roots.flatMap((root) => walk(join(REPO_ROOT, root), isSwept));
    expect(files.length).toBeGreaterThan(500);
    expectPopulationCovered(files, roots, isSwept);
    const hits: string[] = [];
    for (const file of files) {
      if (file.endsWith('polaris-authority-sweep.test.ts')) continue;
      // A retained raw review is a reviewer's verbatim output kept unchanged
      // (CC-REV-6); it anchors findings to Polaris source lines and is never
      // a project artifact, evidence record or warrant citing Polaris as
      // authority. Same population `check_governance._is_raw_review` exempts
      // from CG-1b and CG-15.
      if (relative(REPO_ROOT, file).startsWith('docs/reviews/') && file.endsWith('-RAW.md')) continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (/^\s*["']?(source|authority|warrants?|primary|evidence|provenance|cites?|anchor)["']?\s*[:=]/i.test(line) && POLARIS_SURFACE.test(line)) {
          hits.push(`${relative(REPO_ROOT, file)}:${index + 1}: ${line.trim().slice(0, 120)}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});

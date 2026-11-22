// PWB-REQ-020 — one exhaustive, multiplicity-preserving parity sweep over
// every project-wide marker Polaris presents (task 4.3, syzygy-1z3.19).
//
// The oracle is independent: a hand-written extractor over the served HTML
// and hand-written projections over the machine answer (`/api/poc` is
// `JSON.stringify(model)` verbatim, so the machine channel here is that
// string parsed back). It imports no production vocabulary or rendering
// code — only types, which are erased. Every marker family is compared as a
// multiset (order-insensitive, duplicates preserved), and every comparison
// reports both channel denominators beside its differences, so a run that
// passes states "N human markers against N machine values, zero
// differences" per family, never a bare green.
import { createHash } from 'node:crypto';
import { rmSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import type { PocModel, ProjectShape, ProjectShapeClaim } from '@syzygy/three-surface-poc-core';
import { responseIdentityPreimage } from '@syzygy/three-surface-poc-core';

import { renderPolarisPage } from './polaris.js';
import { POC_MACHINE_PATH, POLARIS_PRESENTATION_PATH, pocRoutes } from './routes.js';
import { reobserveRoutes } from './reobserve-action.js';
import { buildFixtureModel, fixtureRepoWithGit } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, PROJECT_SHAPE_FIXTURE_TEXTS, PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET, REJECTING_AUTHORITY, projectShapeFixtureGit } from './test-project-shape-fixture.js';
import { walkthroughJudgmentFixture, type JudgmentFixtureState } from './test-walkthrough-judgment-fixture.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The state matrix: every body-read authority state the shape can carry ×
// every judgment presentation state, each rendered once.

const SHAPE_STATES = ['not-evaluated', 'not-admitted', 'observation-failed', 'observed', 'observed-degraded', 'observed-excluded', 'observed-undiscovered'] as const;
type ShapeState = (typeof SHAPE_STATES)[number];
const JUDGMENT_STATES = ['not-evaluated', 'absent-run-record', 'absent-judgment', 'unlawful', 'lawful-state-1', 'lawful-state-2'] as const;
type JudgmentState = (typeof JUDGMENT_STATES)[number];

function modelFor(shapeState: ShapeState, judgmentState: JudgmentState): PocModel {
  const walkthroughJudgment = judgmentState === 'not-evaluated' ? {} : { walkthroughJudgment: walkthroughJudgmentFixture(judgmentState as JudgmentFixtureState) };
  switch (shapeState) {
    case 'not-evaluated':
      return buildFixtureModel(cleanups, walkthroughJudgment);
    case 'not-admitted':
      return buildFixtureModel(cleanups, { projectShape: { authority: REJECTING_AUTHORITY, runGit: projectShapeFixtureGit() }, ...walkthroughJudgment });
    case 'observation-failed': {
      const inner = projectShapeFixtureGit();
      const failing = (args: readonly string[]): Uint8Array => {
        if (args[0] === 'ls-tree') throw new Error('fixture: tree listing refused');
        return inner(args);
      };
      return buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: failing }, ...walkthroughJudgment });
    }
    case 'observed':
      return buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() }, ...walkthroughJudgment });
    case 'observed-excluded':
      // A secret-bearing source is withheld hash-not-body, so the
      // observation carries a degradation state (PWB-RECON-02 family).
      return buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET) }, ...walkthroughJudgment });
    case 'observed-undiscovered': {
      // A pillar home with no index (the live Spec and Spine shape): the
      // pillar is Unknown with a reason, and the whole-shape claim with it.
      const texts: Record<string, string> = { ...PROJECT_SHAPE_FIXTURE_TEXTS, 'about/spec-and-spine/notes.md': 'Specs live under openspec/.\n' };
      delete texts['about/spec-and-spine/README.md'];
      return buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(texts) }, ...walkthroughJudgment });
    }
    case 'observed-degraded': {
      // One phase-B body read fails: the source stays in the population as
      // Unknown, so reason counts, gaps and Unknown disclosures are rendered.
      const inner = projectShapeFixtureGit();
      const refused = blobObjectId(PROJECT_SHAPE_FIXTURE_TEXTS[DEGRADED_SOURCE] as string);
      const degraded = (args: readonly string[]): Uint8Array => {
        if (args[0] === 'cat-file' && args[2] === refused) throw new Error('fixture: body read refused');
        return inner(args);
      };
      return buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: degraded }, ...walkthroughJudgment });
    }
  }
}

const DEGRADED_SOURCE = 'about/heart-and-soul/vision.md';

/** Git's blob object id, computed here rather than imported. */
function blobObjectId(text: string): string {
  const body = new TextEncoder().encode(text);
  return createHash('sha1').update(`blob ${body.byteLength}\0`).update(body).digest('hex');
}

// ---------------------------------------------------------------------------
// Independent human-channel extractor.

function decode(text: string): string {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function attrsOf(rawAttrs: string): Map<string, string> {
  // Valueless (boolean) attributes such as `data-non-citable` map to ''.
  return new Map([...rawAttrs.matchAll(/\s([A-Za-z][\w-]*)(?:="([^"]*)")?/g)].map((match) => [match[1] as string, decode(match[2] ?? '')]));
}

interface LeafMarker {
  readonly tag: string;
  readonly attrs: Map<string, string>;
  readonly text: string;
}

/** Every element carrying `attribute`, with its text — which must be a leaf
 * (no child element): a marker whose value is split across children is a
 * parity defect, recorded and failed. */
function leafMarkers(html: string, attribute: string): LeafMarker[] {
  const out: LeafMarker[] = [];
  const open = new RegExp(`<([a-z]+)((?:\\s[A-Za-z][\\w-]*(?:="[^"]*")?)*)\\s${attribute}="([^"]*)"((?:\\s[A-Za-z][\\w-]*(?:="[^"]*")?)*)>`, 'g');
  for (const match of html.matchAll(open)) {
    const tag = match[1] as string;
    const start = (match.index as number) + match[0].length;
    const end = html.indexOf('<', start);
    const text = decode(html.slice(start, end)).replace(/\s+/g, ' ').trim();
    if (!html.startsWith(`</${tag}>`, end)) throw new Error(`non-leaf ${attribute} marker <${tag}${match[2]}${match[4]}> — its value is not one text node`);
    const attrs = attrsOf(`${match[2]}${match[4]}`);
    attrs.set(attribute, decode(match[3] as string));
    out.push({ tag, attrs, text });
  }
  return out;
}

/** Elements carrying `attribute` whose content may hold children: the
 * attribute value plus the raw inner HTML up to the matching close tag. */
function containers(html: string, attribute: string): { readonly value: string; readonly attrs: Map<string, string>; readonly inner: string }[] {
  const out: { value: string; attrs: Map<string, string>; inner: string }[] = [];
  const open = new RegExp(`<([a-z]+)((?:\\s[A-Za-z][\\w-]*(?:="[^"]*")?)*)\\s${attribute}="([^"]*)"((?:\\s[A-Za-z][\\w-]*(?:="[^"]*")?)*)>`, 'g');
  for (const match of html.matchAll(open)) {
    const tag = match[1] as string;
    const start = (match.index as number) + match[0].length;
    // Walk nested same-tag elements to the matching close.
    let depth = 1;
    let end = -1;
    for (const inner of html.slice(start).matchAll(new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g'))) {
      depth += inner[1] === '/' ? -1 : 1;
      if (depth === 0) {
        end = start + (inner.index as number);
        break;
      }
    }
    if (end === -1) throw new Error(`unclosed <${tag} ${attribute}>`);
    out.push({ value: decode(match[3] as string), attrs: attrsOf(`${match[2]}${match[4]}`), inner: html.slice(start, end) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Multiset comparison, reporting both denominators.

interface FamilyReport {
  readonly family: string;
  readonly human: number;
  readonly machine: number;
  readonly onlyHuman: readonly string[];
  readonly onlyMachine: readonly string[];
}

function compareMultisets(family: string, human: readonly string[], machine: readonly string[]): FamilyReport {
  const count = (values: readonly string[]): Map<string, number> => {
    const map = new Map<string, number>();
    for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  };
  const h = count(human);
  const m = count(machine);
  const onlyHuman: string[] = [];
  const onlyMachine: string[] = [];
  for (const [value, n] of h) for (let i = m.get(value) ?? 0; i < n; i += 1) onlyHuman.push(value);
  for (const [value, n] of m) for (let i = h.get(value) ?? 0; i < n; i += 1) onlyMachine.push(value);
  return { family, human: human.length, machine: machine.length, onlyHuman: onlyHuman.sort(), onlyMachine: onlyMachine.sort() };
}

function short(digest: string): string {
  return digest.replace(/^sha256:/, '').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Machine-channel projections (hand-typed from the PWB-REQ-020 statement of
// what Polaris presents; never imported).

type Observed = Extract<ProjectShape, { kind: 'observed' }>;
const CLASSES = ['project-account-section', 'principle', 'topology-component', 'success-criterion', 'catalog-entry', 'roster-identity', 'design-contract', 'baseline-spec', 'craft-policy'] as const;
const CLASSES_WITH_ITEM_TABLES = CLASSES.filter((cls) => cls !== 'project-account-section');

/** The shape's whole claim population (reconciled facts included), the
 * denominator of the shape-level reason counts. */
function shapeClaimPopulation(shape: ProjectShape): readonly ProjectShapeClaim[] {
  if (shape.kind !== 'observed') return [shape.claim];
  return [
    shape.claim,
    ...shape.projectAccount.map((entry) => entry.claim),
    ...shape.sources.map((entry) => entry.claim),
    ...shape.items.map((entry) => entry.claim),
    ...CLASSES.map((cls) => shape.classes[cls].claim),
    ...shape.facts.map((entry) => entry.claim),
  ];
}

/** The claims Polaris presents with their own tuple: everything above except
 * the reconciled facts (whose content reaches the reader through the item
 * rows and class aggregates; only a contradicted fact is presented as such)
 * and the project-account-section items (presented once, as the account's
 * own section claims, never as an item table). */
function presentedClaimPopulation(shape: ProjectShape): readonly ProjectShapeClaim[] {
  if (shape.kind !== 'observed') return [shape.claim];
  const omitted = new Set([...shape.facts.map((fact) => fact.claim.claimId), ...shape.items.filter((item) => item.class === 'project-account-section').map((item) => item.claim.claimId)]);
  return [...shapeClaimPopulation(shape).filter((claim) => !omitted.has(claim.claimId)), ...shape.contradictions.map((fact) => fact.claim)];
}

function epistemicTuple(claim: ProjectShapeClaim): string {
  const e = claim.epistemic as unknown as {
    label: string;
    tier?: string;
    freshness?: string;
    reasons?: { primary: string; secondary: readonly string[] };
    basis?: string;
  };
  const primary = e.reasons !== undefined ? e.reasons.primary : e.basis !== undefined ? e.basis : 'none';
  const secondary = e.reasons !== undefined ? e.reasons.secondary : [];
  return [claim.claimId, e.label, e.tier ?? 'unstated', primary, secondary.join(','), e.freshness ?? 'unstated'].join('|');
}

function anchorsOf(claim: ProjectShapeClaim): { where: string[]; digests: string[] } {
  const where: string[] = [];
  const digests: string[] = [];
  for (const support of claim.support) {
    where.push(support.line === undefined ? support.path : `${support.path}:${support.line}`);
    if (support.contentDigest !== undefined) digests.push(short(support.contentDigest));
  }
  return { where, digests };
}

function denominatorSentence(aggregate: Observed['classes'][keyof Observed['classes']]): string {
  const denominator = aggregate.denominator.kind === 'known' ? `${aggregate.denominator.value} declared` : `denominator Unknown (${aggregate.denominator.reasons.join(', ')})`;
  return `${denominator}; ${aggregate.modeled} modeled, ${aggregate.unknown} Unknown, ${aggregate.contradicted} contradicted; ${aggregate.sourcesWithUnknownDenominator} source(s) unreadable.`;
}

function countsSentence(shape: Observed): string {
  const c = shape.counts;
  return `${c.classification.classifiedByBasis.body} of ${c.sources} source bodies readable; ${c.classification.classifiedByBasis['path-only']} path-only source identities; ${c.items} items (${c.modeled} modeled, ${c.unknown} Unknown, ${c.contradicted} contradicted); ${c.facts} facts (${c.contradictedFacts} contradicted); ${c.exclusions} exclusion(s).`;
}

function reasonCountsOf(claims: readonly ProjectShapeClaim[]): { primary: Map<string, number>; secondary: Map<string, number> } {
  const primary = new Map<string, number>();
  const secondary = new Map<string, number>();
  for (const claim of claims) {
    const e = claim.epistemic as unknown as { reasons?: { primary: string; secondary: readonly string[] } };
    if (e.reasons === undefined) continue;
    primary.set(e.reasons.primary, (primary.get(e.reasons.primary) ?? 0) + 1);
    for (const reason of e.reasons.secondary) secondary.set(reason, (secondary.get(reason) ?? 0) + 1);
  }
  return { primary, secondary };
}

function mapEntries(map: ReadonlyMap<string, number> | Readonly<Partial<Record<string, number>>>): string[] {
  const entries = map instanceof Map ? [...map.entries()] : Object.entries(map).filter((entry): entry is [string, number] => typeof entry[1] === 'number');
  return entries.filter(([, n]) => n > 0).map(([reason, n]) => `${reason}=${n}`);
}

/** Every string the machine answer carries, plus every 12-character digest
 * or revision prefix of one — the membership population for the legacy
 * provenance markers, whose selection is the capability slice's. */
function machineStrings(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    out.add(value);
    out.add(value.replace(/^sha256:/, '').slice(0, 12));
    out.add(value.slice(0, 12));
  } else if (Array.isArray(value)) {
    for (const item of value) machineStrings(item, out);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) machineStrings(item, out);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The sweep.

interface SweepResult {
  readonly reports: readonly FamilyReport[];
  readonly parityFields: readonly string[];
  readonly machineOnlyReports: readonly { readonly family: string; readonly human: number; readonly machine: number }[];
}

function sweep(model: PocModel): SweepResult {
  const html = renderPolarisPage(model);
  const routes = pocRoutes(() => model);
  const served = (path: string): Record<string, unknown> => {
    const route = routes.find((candidate) => candidate.path === path);
    if (route === undefined) throw new Error(`missing machine route ${path}`);
    const answer = route.handle({ request: { method: 'GET', path, query: new URLSearchParams(), headers: {} } });
    if (answer instanceof Promise || answer.status !== 200) throw new Error(`machine route ${path} did not serve a body`);
    return JSON.parse(answer.body) as Record<string, unknown>;
  };
  const machine = served(POC_MACHINE_PATH) as unknown as PocModel;
  const presentation = served(POLARIS_PRESENTATION_PATH);
  const shape = machine.projectShape;
  const reports: FamilyReport[] = [];

  // 1. Typed leaf markers, grouped by field.
  const parity = leafMarkers(html, 'data-parity-field');
  const byField = new Map<string, string[]>();
  for (const marker of parity) {
    const field = marker.attrs.get('data-parity-field') as string;
    byField.set(field, [...(byField.get(field) ?? []), marker.text]);
  }
  const human = (field: string): string[] => byField.get(field) ?? [];
  const expected = new Map<string, string[]>();
  const observed = shape.kind === 'observed' ? shape : undefined;

  // Shape identity.
  expected.set('shape-revision', observed === undefined ? [] : [observed.identity.revision.slice(0, 12)]);
  expected.set('shape-manifest-digest', observed === undefined ? [] : [short(observed.identity.manifestDigest)]);
  expected.set('shape-observation-digest', observed === undefined ? [] : [short(observed.identity.observationDigest)]);
  expected.set('shape-tree', observed === undefined || observed.claim.epistemic.label !== 'Observed' ? [] : ['git-ls-tree']);
  // Sources: one row per source, population never shrinking.
  expected.set('shape-source-path', observed === undefined ? [] : observed.sources.map((source) => source.path));
  expected.set('shape-source-identity', observed === undefined ? [] : observed.sources.filter((source) => source.claim.epistemic.label === 'Observed').map((source) => source.identity));
  expected.set('shape-source-digest', observed === undefined ? [] : observed.sources.flatMap((source) => (source.claim.support[0]?.contentDigest === undefined ? [] : [short(source.claim.support[0].contentDigest)])));
  // Anchors: every rendered Observed item / account / class claim cites each
  // of its supports exactly once, in the human channel's own multiplicity.
  const provenance = containers(html, 'data-claim-provenance').map((entry) => entry.value);
  const anchoredClaims = new Map<string, ProjectShapeClaim>();
  if (observed !== undefined) {
    for (const item of observed.items) anchoredClaims.set(item.claim.claimId, item.claim);
    for (const entry of observed.projectAccount) anchoredClaims.set(entry.claim.claimId, entry.claim);
    for (const cls of CLASSES) anchoredClaims.set(observed.classes[cls].claim.claimId, observed.classes[cls].claim);
  }
  const anchorWhere: string[] = [];
  const anchorDigests: string[] = [];
  for (const claimId of provenance) {
    const claim = anchoredClaims.get(claimId);
    if (claim === undefined) continue;
    const anchors = anchorsOf(claim);
    anchorWhere.push(...anchors.where);
    anchorDigests.push(...anchors.digests);
  }
  expected.set('shape-anchor', anchorWhere);
  expected.set('shape-anchor-digest', anchorDigests);
  // Body-read authority state: one marker per authority, plus mode and the
  // evaluation the states were disclosed at.
  const authority = shape.authority;
  expected.set('authority-state', authority === undefined ? [] : authority.authorities.map((entry) => `${entry.authority} — ${entry.state}`));
  expected.set('authority-mode', authority === undefined ? [] : [authority.authorizationMode]);
  expected.set('authority-evaluation-id', authority === undefined ? [] : [authority.evaluationId]);
  // PWB-REQ-005 on the human surface (PWB-RECON-01): each authority's exact
  // disclosure sentence, in authority order.
  expected.set('authority-disclosure', authority === undefined ? [] : authority.authorities.map((entry) => entry.disclosure));
  expected.set('authority-may-not-id', authority === undefined ? [] : authority.mayNot.map((entry) => entry.id));
  expected.set('authority-may-not-statement', authority === undefined ? [] : authority.mayNot.map((entry) => entry.statement));
  expected.set('authority-may-not-act', authority === undefined ? [] : authority.mayNot.flatMap((entry) => entry.actIdentity === undefined ? [] : [entry.actIdentity]));
  expected.set('authority-may-not-digest', authority === undefined ? [] : authority.mayNot.flatMap((entry) => entry.artifactDigest === undefined ? [] : [entry.artifactDigest]));
  // Discovery and degradation (PWB-RECON-02): one state marker per pillar,
  // one reason per Unknown pillar, the degradation state when there is one.
  expected.set('shape-pillar-state', observed === undefined ? [] : observed.discovery.map((pillar) => `${pillar.key} — ${pillar.state}`));
  expected.set('shape-pillar-reason', observed === undefined ? [] : observed.discovery.flatMap((pillar) => (pillar.state === 'unknown' ? [pillar.reason] : [])));
  expected.set('shape-degradation-state', observed?.degradation === undefined ? [] : [observed.degradation.degradationState]);
  // Walkthrough judgment: every state field, both digests, the disclosure
  // sentence and every traversed path (repeats included).
  const judgment = machine.walkthroughJudgment;
  const j = new Map<string, string[]>();
  if (judgment.kind === 'not-evaluated') {
    j.set('judgment-detail', [judgment.detail]);
  } else {
    const { evaluation } = judgment;
    const outcome = evaluation.outcome;
    j.set('judgment-evaluation-id', [evaluation.evaluationId]);
    j.set('judgment-evaluation-instant', [evaluation.evaluationInstant]);
    j.set('judgment-kind', [outcome.kind]);
    if (outcome.kind === 'absent') {
      j.set('judgment-absent-what', [outcome.what]);
      j.set('judgment-detail', [outcome.detail]);
      j.set('judgment-criterion', [outcome.criterion]);
    } else if (outcome.kind === 'unlawful') {
      j.set('judgment-recorded', [outcome.recorded]);
      j.set('judgment-case', [outcome.caseId]);
      j.set('judgment-detail', [outcome.detail]);
      j.set('judgment-criterion', [outcome.criterion]);
      j.set('judgment-contradiction', [outcome.contradiction.clause]);
      j.set('judgment-run-record-digest', [short(outcome.runRecordDigest)]);
      j.set('judgment-digest', [short(outcome.judgmentDigest)]);
    } else {
      j.set('judgment-verdict', [`${outcome.verdict.criterion}=${outcome.verdict.value}`]);
      j.set('judgment-judging-party', [outcome.verdict.judgingParty]);
      j.set('judgment-evidence-kind', [outcome.evidenceKind]);
      j.set('judgment-state-label', [outcome.stateLabel]);
      j.set('judgment-independently-verified', [outcome.independentlyVerified ? 'yes' : 'no']);
      j.set('judgment-disclosure', [outcome.disclosure]);
      j.set('judgment-act', [outcome.actIdentity]);
      j.set('judgment-act-instant', [outcome.actInstant]);
      j.set('judgment-digest', [short(outcome.judgmentDigest)]);
      j.set('judgment-run-record', [`${outcome.runRecord.identity}@${short(outcome.runRecord.digest)}`]);
      j.set('judgment-mode', [outcome.runRecord.mode]);
      j.set('judgment-surface-version', [outcome.runRecord.surfaceVersion]);
      j.set('judgment-run-evaluation-identity', [outcome.runRecord.evaluationIdentity]);
      j.set('judgment-rationale', [outcome.verdict.rationale]);
      j.set('judgment-traversed-path', [...outcome.runRecord.traversedPaths]);
    }
  }
  for (const [field, values] of j) expected.set(field, values);
  // Every judgment-* field the human channel could carry is claimed by some
  // state; a field rendered in this state but expected empty is a difference.
  for (const field of byField.keys()) if (field.startsWith('judgment-') && !expected.has(field)) expected.set(field, []);
  for (const [field, values] of expected) reports.push(compareMultisets(`parity-field:${field}`, human(field), values));

  // Legacy provenance markers (capability slice): recoverable by membership.
  // The two region cites name the observer's method, which the machine answer
  // carries as the region's `kind: 'observed'` fact rather than as a string;
  // they are admitted only while that region is observed.
  const strings = machineStrings(machine);
  if (machine.codeStructure.kind === 'observed') strings.add('git-ls-tree');
  if (machine.workItems.kind === 'observed') strings.add('beads-dolt');
  for (const field of ['provenance-source', 'provenance-revision', 'current-authority-path', 'proposal-change-id']) {
    const values = human(field);
    const missing = values.filter((value) => !strings.has(value));
    reports.push({ family: `parity-field:${field}`, human: values.length, machine: values.length - missing.length, onlyHuman: missing, onlyMachine: [] });
  }
  // No typed field escapes the sweep.
  const covered = new Set([...expected.keys(), 'provenance-source', 'provenance-revision', 'current-authority-path', 'proposal-change-id']);
  const uncovered = [...byField.keys()].filter((field) => !covered.has(field));
  reports.push({ family: 'parity-field:<uncovered>', human: uncovered.length, machine: 0, onlyHuman: uncovered, onlyMachine: [] });

  // 2. Claim tuples: every rendered epistemic tuple equals the machine claim's.
  const population = shapeClaimPopulation(shape);
  const claimsById = new Map(population.map((claim) => [claim.claimId, claim]));
  const tuples = leafMarkers(html, 'data-claim-id').map((marker) => {
    const a = marker.attrs;
    return [a.get('data-claim-id'), a.get('data-epistemic-label'), a.get('data-epistemic-tier'), a.get('data-epistemic-primary-reason'), a.get('data-epistemic-secondary-reasons'), a.get('data-epistemic-freshness')].join('|');
  });
  const tupleExpected = tuples.map((tuple) => {
    const claim = claimsById.get(tuple.split('|')[0] as string);
    return claim === undefined ? `<no machine claim for ${tuple}>` : epistemicTuple(claim);
  });
  reports.push(compareMultisets('claim-tuple', tuples, tupleExpected));
  // Every claim the machine carries is rendered at least once (tuple line).
  const renderedIds = new Set(tuples.map((tuple) => tuple.split('|')[0] as string));
  const presented = presentedClaimPopulation(shape).map((claim) => claim.claimId);
  reports.push(compareMultisets('claim-population', [...renderedIds].filter((id) => claimsById.has(id)), presented));

  // 3. Unknown disclosures name only claims (or regions/entities) the machine
  // holds as Unknown.
  const disclosures = containers(html, 'data-unknown-disclosure').map((entry) => entry.value);
  const unknownExpected = disclosures.map((id) => {
    const claim = claimsById.get(id);
    if (claim !== undefined) return claim.epistemic.label === 'Unknown' ? id : `<${id} is ${claim.epistemic.label} in the machine answer>`;
    const entity = machine.entities.find((candidate) => candidate.id === id);
    if (entity !== undefined) return entity.epistemic.label === 'Unknown' ? id : `<${id} is ${entity.epistemic.label}>`;
    const relationship = machine.relationships.find((candidate) => candidate.id === id);
    if (relationship !== undefined) return relationship.epistemic.label === 'Unknown' ? id : `<${id} is ${relationship.epistemic.label}>`;
    // Capability deep-dive parts (`<capability>/<part>`): the capability is a
    // machine entity, and the part is disclosed Unknown whenever no admitted
    // declaration carries it — recoverable by the entity's membership.
    const slash = id.lastIndexOf('/');
    if (slash > 0 && machine.entities.some((candidate) => candidate.id === id.slice(0, slash))) return id;
    if (id === 'region:code-structure') return machine.codeStructure.kind === 'unknown' ? id : `<${id} is observed>`;
    if (id === 'region:work-items') return machine.workItems.kind === 'unknown' ? id : `<${id} is observed>`;
    return `<no machine subject for ${id}>`;
  });
  reports.push(compareMultisets('unknown-disclosure', disclosures, unknownExpected));
  // …and, the other way round, every Unknown relationship and entity the
  // machine holds is disclosed exactly once (a collapsed or dropped
  // disclosure is a difference, not a shorter list).
  reports.push(compareMultisets('unknown-relationships', disclosures.filter((id) => id.startsWith('relationship:')), machine.relationships.filter((r) => r.epistemic.label === 'Unknown').map((r) => r.id)));
  reports.push(compareMultisets('unknown-entities', disclosures.filter((id) => machine.entities.some((e) => e.id === id)), machine.entities.filter((e) => e.epistemic.label === 'Unknown').map((e) => e.id)));

  // 4. Aggregate reason counts and on-demand coverage sentences.
  for (const which of ['primary', 'secondary'] as const) {
    const lists = containers(html, `data-reason-counts-${which}`);
    const humanRows: string[] = [];
    const machineRows: string[] = [];
    for (const list of lists) {
      const rows = containers(list.inner, 'data-reason').map((row) => `${list.value}:${row.value}=${row.attrs.get('data-count')}`);
      humanRows.push(...rows);
      if (observed !== undefined && list.value === observed.claim.claimId) {
        machineRows.push(...mapEntries(reasonCountsOf(population.slice(1))[which]).map((entry) => `${list.value}:${entry}`));
      } else if (observed !== undefined) {
        const cls = CLASSES.find((candidate) => observed.classes[candidate].claim.claimId === list.value);
        machineRows.push(...(cls === undefined ? [`<no aggregate ${list.value}>`] : mapEntries(observed.classes[cls].reasonCounts[which]).map((entry) => `${list.value}:${entry}`)));
      } else {
        machineRows.push(`<reason counts for ${list.value} in a ${shape.kind} shape>`);
      }
    }
    reports.push(compareMultisets(`reason-counts:${which}`, humanRows, machineRows));
  }
  const coverage = containers(html, 'data-coverage-counts');
  const coverageHuman = coverage.map((entry) => `${entry.value}: ${leafMarkers(entry.inner, 'data-copy-role').at(-1)?.text ?? ''}`);
  const coverageMachine = coverage.map((entry) => {
    if (observed === undefined) return `<coverage for ${entry.value} in a ${shape.kind} shape>`;
    if (entry.value === observed.claim.claimId) return `${entry.value}: ${countsSentence(observed)}`;
    const cls = CLASSES.find((candidate) => observed.classes[candidate].claim.claimId === entry.value);
    return cls === undefined ? `<no aggregate ${entry.value}>` : `${entry.value}: ${denominatorSentence(observed.classes[cls])}`;
  });
  reports.push(compareMultisets('coverage-counts', coverageHuman, coverageMachine));

  // 5. Populations: item rows per class, source rows, exclusions,
  // contradictions, gaps — exact multisets against the machine answer.
  const itemRows: string[] = [];
  const itemExpected: string[] = [];
  const classesWithTables: string[] = [];
  for (const section of containers(html, 'data-polaris-class')) {
    const rows = containers(section.inner, 'data-polaris-item').map((row) => `${section.value}:${row.value}`);
    // An item container is a three-column table or, for a class whose items
    // carry no statement, a compact list; both are detected by their literal
    // opening so a hoisted attribute cannot masquerade as one.
    if (section.inner.includes('<tbody>') || section.inner.includes('<ul class="item-list"')) classesWithTables.push(section.value);
    itemRows.push(...rows);
    // Expected rows come from the machine answer alone, never gated on the
    // container being detected: a class whose container vanished reports its
    // items as missing instead of an empty-versus-empty pass.
    if (observed !== undefined && (CLASSES_WITH_ITEM_TABLES as readonly string[]).includes(section.value)) {
      itemExpected.push(...observed.items.filter((item) => item.class === section.value).map((item) => `${section.value}:${item.claim.claimId}`));
    }
  }
  reports.push(compareMultisets('item-rows', itemRows, itemExpected));
  // A class item container (table or compact list) exists exactly when the
  // machine holds at least one item of that class; an empty class is an
  // aggregate statement, never an empty container.
  reports.push(compareMultisets('classes-with-item-tables', classesWithTables, observed === undefined ? [] : CLASSES_WITH_ITEM_TABLES.filter((cls) => observed.items.some((item) => item.class === cls))));
  reports.push(compareMultisets('source-rows', containers(html, 'data-polaris-source').map((row) => row.value), observed === undefined ? [] : observed.sources.map((source) => source.claim.claimId)));
  reports.push(compareMultisets('exclusions', containers(html, 'data-polaris-exclusion').map((row) => row.value), observed === undefined ? [] : observed.exclusions.map((exclusion) => exclusion.repositoryRelativePath)));
  reports.push(compareMultisets('contradictions', containers(html, 'data-polaris-fact').map((row) => row.value), observed === undefined ? [] : observed.contradictions.map((fact) => fact.claim.claimId)));
  const gaps = containers(html, 'data-polaris-gap').map((row) => {
    const count = /:\s*(\d+) claim\(s\)/.exec(row.inner)?.[1] ?? '?';
    return `${row.value}=${count}`;
  });
  reports.push(compareMultisets('gaps', gaps, mapEntries(reasonCountsOf(population).primary)));

  // 6. The judgment section's state attribute.
  const judgmentSections = containers(html, 'data-judgment-state').map((section) => section.value);
  reports.push(compareMultisets('judgment-state', judgmentSections, [judgment.kind === 'not-evaluated' ? 'not-evaluated' : judgment.evaluation.outcome.kind]));

  // 7. The catalog reconciliation (M14 slice 4): each figure as
  // name|state|value. Counts come from the machine answer, sums are summed
  // here, and the marker count is this sweep's own occurrence count over
  // the served HTML; an unobserved shape carries one Unknown and no number.
  const figuresHuman = leafMarkers(html, 'data-figure').map((marker) => `${marker.attrs.get('data-figure')}|${marker.attrs.get('data-figure-state')}|${marker.text}`);
  const markerOccurrences = [...html.matchAll(/\sdata-polaris-item="/g)].length;
  const classCounts = observed === undefined ? [] : CLASSES.map((cls) => [cls, observed.items.filter((item) => item.class === cls).length] as const);
  const signed = (value: number): string => (value < 0 ? `\u2212${-value}` : String(value));
  const figuresMachine = observed === undefined
    ? ['reconciliation|Unknown|Unknown']
    : [
        `sources|Observed|${observed.sources.length}`,
        `items|Observed|${observed.items.length}`,
        ...classCounts.map(([cls, count]) => `class:${cls}|Observed|${count}`),
        `sum:nine-classes|Inferred|${classCounts.reduce((sum, [, count]) => sum + count, 0)}`,
        `sum:eight-classes|Inferred|${classCounts.filter(([cls]) => cls !== 'project-account-section').reduce((sum, [, count]) => sum + count, 0)}`,
        `markers|Inferred|${markerOccurrences}`,
        `remainder|Unknown|${signed(markerOccurrences - observed.items.length)}`,
      ];
  reports.push(compareMultisets('catalog-reconciliation', figuresHuman, figuresMachine));

  const machineOnlyReports = [
    { family: 'response-identity:contentKey', human: 0, machine: machine.responseIdentity.contentKey === '' ? 0 : 1 },
    { family: 'response-identity:excludes', human: 0, machine: machine.responseIdentity.excludes.length },
    { family: 'response-identity:stableAcross', human: 0, machine: machine.responseIdentity.stableAcross.length },
    { family: 'response-identity:varyingWith', human: 0, machine: machine.responseIdentity.varyingWith.length },
    { family: 'route-links:poc', human: 0, machine: machine.links?.length ?? 0 },
    { family: 'route-links:polaris-presentation', human: 0, machine: Array.isArray(presentation.links) ? presentation.links.length : 0 },
  ];
  return { reports, parityFields: [...byField.keys()].sort(), machineOnlyReports };
}

// ---------------------------------------------------------------------------

const MATRIX = SHAPE_STATES.flatMap((shapeState) => JUDGMENT_STATES.map((judgmentState) => [shapeState, judgmentState] as const));

describe('PWB-REQ-020 exhaustive Polaris parity sweep', () => {
  it.each(MATRIX)('%s shape / %s judgment: every marker family matches the machine answer as a multiset', (shapeState, judgmentState) => {
    const model = modelFor(shapeState, judgmentState);
    const { reports } = sweep(model);
    const differences = reports.filter((report) => report.onlyHuman.length > 0 || report.onlyMachine.length > 0);
    expect(differences, JSON.stringify(reports.map((report) => `${report.family}: human ${report.human} / machine ${report.machine}`), null, 1)).toEqual([]);
    // Denominators are real: something was compared in every state.
    expect(reports.reduce((sum, report) => sum + report.human, 0)).toBeGreaterThan(0);
    for (const report of reports) expect(report.human, report.family).toBe(report.machine);
  });

  it('the observed-degraded / lawful-state-2 matrix cell carries every marker family with a non-empty denominator, and state (2) alone claims independent verification', () => {
    const model = modelFor('observed-degraded', 'lawful-state-2');
    const { reports, parityFields } = sweep(model);
    const nonEmpty = new Set(reports.filter((report) => report.human > 0).map((report) => report.family));
    for (const family of ['claim-tuple', 'claim-population', 'unknown-disclosure', 'unknown-relationships', 'reason-counts:primary', 'coverage-counts', 'item-rows', 'source-rows', 'gaps', 'judgment-state', 'parity-field:authority-state', 'parity-field:authority-disclosure', 'parity-field:shape-pillar-state', 'parity-field:judgment-disclosure', 'parity-field:judgment-traversed-path', 'parity-field:shape-anchor', 'parity-field:shape-source-path', 'catalog-reconciliation']) {
      expect(nonEmpty.has(family), family).toBe(true);
    }
    expect(parityFields).toContain('judgment-independently-verified');
    // The degradation family has a real denominator only where the
    // observation is degraded: the excluded-source cell.
    const excluded = sweep(modelFor('observed-excluded', 'lawful-state-2'));
    expect(excluded.reports.find((report) => report.family === 'parity-field:shape-degradation-state')?.human).toBe(1);
    const undiscovered = sweep(modelFor('observed-undiscovered', 'lawful-state-2'));
    expect(undiscovered.reports.find((report) => report.family === 'parity-field:shape-pillar-reason')?.human).toBe(1);
    const html = renderPolarisPage(model);
    expect(leafMarkers(html, 'data-parity-field').filter((m) => m.attrs.get('data-parity-field') === 'judgment-independently-verified').map((m) => m.text)).toEqual(['yes']);
    expect(leafMarkers(html, 'data-parity-field').filter((m) => m.attrs.get('data-parity-field') === 'judgment-state-label').map((m) => m.text)).toEqual(['Syzygy-verified']);
    const state1 = renderPolarisPage(modelFor('observed', 'lawful-state-1'));
    expect(leafMarkers(state1, 'data-parity-field').filter((m) => m.attrs.get('data-parity-field') === 'judgment-independently-verified').map((m) => m.text)).toEqual(['no']);
    expect(leafMarkers(state1, 'data-parity-field').filter((m) => m.attrs.get('data-parity-field') === 'judgment-disclosure').map((m) => m.text)).toEqual([
      "Owner-trusted only; same-tree forgeable from Syzygy's perspective. Digest detects drift, not authorship or attendance.",
    ]);
    expect(leafMarkers(state1, 'data-parity-field').filter((m) => m.attrs.get('data-parity-field') === 'authority-disclosure').map((m) => m.text)).toEqual(
      Array.from({ length: 3 }, () => "Owner-trusted only; same-tree forgeable from Syzygy's perspective. Digest detects drift, not authorship or attendance."),
    );
    // The traversed-path fixture repeats a path; both channels keep three.
    const traversed = leafMarkers(html, 'data-parity-field').filter((m) => m.attrs.get('data-parity-field') === 'judgment-traversed-path').map((m) => m.text);
    expect(traversed).toEqual(['/polaris', '/entry', '/polaris']);
  });

  it('renders the currency probe without a freshness field and keeps its identity/counts aligned with the machine evidence block', () => {
    const model = modelFor('observed', 'lawful-state-2');
    const html = renderPolarisPage(model);
    const evidence = model.evaluation.evidence;
    const probe = evidence.probe;
    const section = html.match(/<section class="currency-probe"[\s\S]*?<\/section>/)?.[0] ?? '';
    expect(section).toContain(`data-currency-probe-evaluation="${probe.evaluationId}"`);
    expect(section).toContain(`data-currency-probe-pinned="${probe.pinnedRevision}"`);
    expect(section).toContain(`data-currency-probe-current="${probe.currentRevision}"`);
    expect(section).toContain(`data-currency-probe-changed="${probe.changedSources}"`);
    expect(section).toContain(`data-currency-probe-added="${probe.addedSources}"`);
    expect(section).not.toContain('data-epistemic-freshness');
    expect(evidence.currencyBounds).toEqual([]);
  });

  // Pursuit N3 slice 3 (syzygy-u05.3): the resource-ledger headroom is one
  // machine block and one status-slot entry, compared per tuple by id. The
  // human extractor and the machine projection are hand-written here.
  it.each(SHAPE_STATES)('%s shape: every resource tuple on the served /polaris status entry matches the machine block by id', (shapeState) => {
    const model = modelFor(shapeState, 'lawful-state-2');
    const routes = pocRoutes(() => model);
    const serve = (path: string, headers: Record<string, string>): string => {
      const route = routes.find((candidate) => candidate.path === path);
      if (route === undefined) throw new Error(`missing route ${path}`);
      const answer = route.handle({ request: { method: 'GET', path, query: new URLSearchParams(), headers } });
      if (answer instanceof Promise || answer.status !== 200) throw new Error(`route ${path} did not serve a body`);
      return answer.body;
    };
    const html = serve('/polaris', { host: '127.0.0.1:1' });
    const machine = JSON.parse(serve(POC_MACHINE_PATH, {})) as { resourceHeadroom: { entries: { id: string; declared: number; observed: { state: string; value?: number }; remaining: { state: string; value?: number } }[]; cost: { id: string; state: string; bodiesRead?: number; bytes?: number; parsePasses?: number; worstSourcePasses?: number } } };
    const value = (o: { state: string; value?: number }): string => (o.state === 'observed' ? String(o.value) : 'unknown');
    const block = machine.resourceHeadroom;
    const machineTuples = new Map<string, string>([
      ...block.entries.map((entry) => [entry.id, `${entry.declared}|${value(entry.observed)}|${value(entry.remaining)}`] as const),
      [block.cost.id, block.cost.state === 'observed' ? `${block.cost.bodiesRead}|${block.cost.bytes}|${block.cost.parsePasses}|${block.cost.worstSourcePasses}` : 'unknown|unknown|unknown|unknown'],
    ]);
    const lines = [...html.matchAll(/<p class="operability-resources"[^>]*>([\s\S]*?)<\/p>/g)];
    expect(lines).toHaveLength(1);
    const humanTuples = [...(lines[0]?.[1] ?? '').matchAll(/<span data-resource-tuple="([^"]*)"([^>]*)>([^<]*)<\/span>/g)].map((match) => {
      const attrs = new Map([...(match[2] ?? '').matchAll(/\s(data-[a-z-]+)="([^"]*)"/g)].map((a) => [a[1] as string, a[2] as string]));
      const tuple = match[1] === 'resource-cost'
        ? ['data-bodies-read', 'data-bytes', 'data-parse-passes', 'data-worst-source-passes'].map((name) => attrs.get(name)).join('|')
        : ['data-declared', 'data-observed', 'data-remaining'].map((name) => attrs.get(name)).join('|');
      return { id: match[1] as string, tuple, text: match[3] as string };
    });
    expect(humanTuples.map((t) => t.id).sort()).toEqual([...machineTuples.keys()].sort());
    expect(new Set(humanTuples.map((t) => t.id)).size).toBe(8);
    for (const human of humanTuples) {
      expect(human.tuple, human.id).toBe(machineTuples.get(human.id));
      // The visible words carry the same numbers, or Unknown — never a 0 for an unread value.
      for (const part of human.tuple.split('|')) {
        if (part === 'unknown') expect(human.text, human.id).toContain('Unknown');
        else expect(human.text, human.id).toContain(part);
      }
    }
    const observed = shapeState.startsWith('observed');
    expect(block.cost.state).toBe(observed ? 'observed' : 'unknown');
    expect(block.entries.filter((entry) => entry.observed.state === 'unknown').map((entry) => entry.id)).toEqual(observed
      ? ['resource-headroom:maxHumanResponseBytes', 'resource-headroom:maxMachineResponseBytes']
      : ['resource-headroom:maxSources', 'resource-headroom:maxBytesPerSource', 'resource-headroom:maxTotalBytes', 'resource-headroom:maxIndexDepth', 'resource-headroom:maxParsePassesPerSource', 'resource-headroom:maxHumanResponseBytes', 'resource-headroom:maxMachineResponseBytes']);
  });

  it('declares the human-triggered re-observe action as a parity family with an empty machine denominator (syzygy-u05.2)', () => {
    const model = modelFor('observed', 'lawful-state-2');
    const machineBody = JSON.stringify(model);
    const actions = reobserveRoutes({ reobserve: async () => ({ kind: 'failed', reason: 'unused' }) });
    const machineRoutes = pocRoutes(() => model).filter((route) => route.credentialClass !== 'human-open');
    const report = {
      family: 'action:reobserve',
      human: actions.filter((route) => route.method === 'POST' && route.credentialClass === 'human-open').length,
      machine: machineRoutes.filter((route) => route.path.includes('/reobserve')).length + machineBody.split('/polaris/reobserve').length - 1,
    };
    expect(actions.map((route) => `${route.method} ${route.path} ${route.credentialClass}`)).toEqual([
      'POST /polaris/reobserve human-open',
      'POST /butlers-syzygy/polaris/reobserve human-open',
    ]);
    expect(machineRoutes.length).toBeGreaterThan(0);
    expect(report).toEqual({ family: 'action:reobserve', human: 2, machine: 0 });
  });

  it('declares response identity and both route-link fields as machine-only parity families with real denominators', () => {
    const { machineOnlyReports } = sweep(modelFor('observed', 'lawful-state-2'));
    expect(machineOnlyReports).toEqual([
      { family: 'response-identity:contentKey', human: 0, machine: 1 },
      { family: 'response-identity:excludes', human: 0, machine: 27 },
      { family: 'response-identity:stableAcross', human: 0, machine: 1 },
      { family: 'response-identity:varyingWith', human: 0, machine: 3 },
      { family: 'route-links:poc', human: 0, machine: 15 },
      { family: 'route-links:polaris-presentation', human: 0, machine: 15 },
    ]);
  });

  it('resolves every declared exclusion on the complete observed fixture', () => {
    const model = buildFixtureModel(cleanups, {
      projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) },
      walkthroughJudgment: walkthroughJudgmentFixture('lawful-state-2'),
    });
    const preimage = responseIdentityPreimage(model);
    expect(preimage.resolved).toHaveLength(27);
    expect(preimage.resolved).toEqual([...model.responseIdentity.excludes]);
  });

  it('keeps the response identity stable when a complete evaluation changes only its as-of instant', () => {
    const options = {
      projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) },
      walkthroughJudgment: walkthroughJudgmentFixture('lawful-state-2'),
    } as const;
    const fixtureRepo = fixtureRepoWithGit(cleanups);
    const first = buildFixtureModel(cleanups, { ...options, fixtureRepo, evaluationAsOf: '2026-08-30T12:00:00Z' });
    const second = buildFixtureModel(cleanups, { ...options, fixtureRepo, evaluationAsOf: '2026-08-30T12:01:00Z' });
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
    expect(first.responseIdentity.contentKey).toBe(second.responseIdentity.contentKey);
  });

  it('distinguishes one project-shape byte while the legacy inputsDigest remains equal', () => {
    const fixtureRepo = fixtureRepoWithGit(cleanups);
    const changedTexts = {
      ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
      'about/heart-and-soul/vision.md': `${PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC['about/heart-and-soul/vision.md']}changed byte\n`,
    };
    const common = { fixtureRepo, evaluationAsOf: '2026-08-30T12:00:00Z', walkthroughJudgment: walkthroughJudgmentFixture('lawful-state-2') } as const;
    const first = buildFixtureModel(cleanups, { ...common, projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) } });
    const second = buildFixtureModel(cleanups, { ...common, projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(changedTexts) } });
    expect(first.evaluation.inputsDigest).toBe(second.evaluation.inputsDigest);
    expect(first.responseIdentity.contentKey).not.toBe(second.responseIdentity.contentKey);
  });
});

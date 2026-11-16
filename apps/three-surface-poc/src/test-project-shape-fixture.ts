// Test support: exports with no non-test importer are consumed by tests only, by design.

import { createHash } from 'node:crypto';

import { itemClaim, type BodyReadAuthorityEvaluation, type GitRunner, type PocModel, type UnknownReason } from '@syzygy/three-surface-poc-core';

/**
 * An in-memory Butlers-shaped tree for surface tests that need the shared
 * model's `projectShape` to be `observed`. The texts follow the P2.5
 * grammar exactly (heading text, column-0 anchors, one declaration per
 * identity); `SECRET_SENTINEL` marks a body that the secret policy must
 * exclude so a rendering test can prove hash-not-body.
 */
const PROJECT_SHAPE_FIXTURE_COMMIT = '4'.repeat(40);
const PROJECT_SHAPE_FIXTURE_COMMITTED_AT = '2026-08-15T10:00:00+00:00';
export const SECRET_SENTINEL = 'EXCLUDED-BODY-SENTINEL-7f3a';

const VISION = [
  '# Fixture',
  '',
  '## What Butlers Is',
  '',
  'A household of agents that keep promises.',
  '',
  '## What Success Looks Like',
  '',
  '- Every promise is visible.',
  '- Nothing is inferred silently.',
  '',
  '## What Butlers Is Not',
  '',
  'Not a chat toy.',
  '',
  '## Non-Negotiable Rules',
  '',
  '1. **Fail closed** — silence is Unknown.',
  '2. **Cite or stay quiet** — every claim carries a source.',
  '',
].join('\n');

const ARCHITECTURE = ['# Architecture', '', '## Runtime', '', 'One process.', ''].join('\n');

const V1 = [
  '# v1',
  '',
  '## What v1 Ships',
  '',
  'Ships text.',
  '',
  '### Core Infrastructure',
  '',
  '- **Bus** - the message bus',
  '',
  '### Staffers',
  '',
  '### Butlers',
  '',
  '- **Atlas** - maps',
  '- **Bishop** - moves',
  '',
  '### Modules',
  '',
  '### Connectors',
  '',
  '### Dashboard',
  '',
  '### Identity System',
  '',
  '### Situational Awareness',
  '',
  '### Observability',
  '',
  '## What v1 Defers',
  '',
  'Defers text.',
  '',
  '## Success Criteria',
  '',
  '1. Ships on time.',
  '',
].join('\n');

const CRAFT_README = ['# Craft', '', '### Reading Order', '', '| Order | File |', '|---|---|', '| 1 | [Spec policy](policies/cc-spec.md) |', ''].join('\n');

const ROOT_LINKS = [
  '# Fixture',
  '',
  '[Heart and Soul](heart-and-soul/) · [Legends and Lore](legends-and-lore/) ·',
  '[Spec and Spine](spec-and-spine/) · [Lay and Land](lay-and-land/) · [Craft and Care](craft-and-care/)',
  '',
];
// The registry's precedence grammar (PWB-REQ-004 as amended), shaped as the
// live Butlers root writes it: bold Layer, code-span Home.
const ROOT_PRECEDENCE = [
  '### Precedence Order When Layers Disagree',
  '',
  '| # | Layer | Owns | Home |',
  '|---|-------|------|------|',
  '| 1 | **Heart and Soul** | Principles, scope boundaries, the 7 non-negotiable rules | `about/heart-and-soul/` |',
  '| 2 | **Legends and Lore** | Wire contracts, state machines, data models, sanctioned rule exceptions | `about/legends-and-lore/rfcs/` |',
  '| 3 | **Spec and Spine** | Feature behaviour, acceptance scenarios (WHEN/THEN), per-butler contracts | `openspec/specs/` |',
  '| 4 | **Craft and Care** | Execution-quality standards, test scope, review gates, observability bar | `about/craft-and-care/` |',
  '| 5 | **Lay and Land** | Topology snapshot \u2014 where components live, how they connect, stability levels | `about/lay-and-land/` |',
  '| 6 | **Roster config** | Live butler identity: `butler.toml`, `MANIFESTO.md`, `CLAUDE.md`, skills, API routes | `roster/{butler}/` |',
  '| 7 | **Code** | Runtime behaviour \u2014 executed source, migrations, tests | `src/`, `alembic/`, `tests/` |',
  '',
];
// The stated summary: one staffer against V1's empty Staffers heading (row 1
// decides for V1 when the table is admitted; a contradiction without it),
// two butlers in agreement with V1.
const ROOT_SUMMARY = [
  '## Key Architectural Facts',
  '',
  '- **3 daemons** \u2014 1 staffers (Switchboard) + 2 domain',
  '  butlers, each on its own port.',
  '',
];
/** Line of the daemons item in the root with the table / without it. */
export const PROJECT_SHAPE_FIXTURE_ROOT_SUMMARY_LINE = ROOT_LINKS.length + ROOT_PRECEDENCE.length + 3;
export const PROJECT_SHAPE_FIXTURE_ROOT_SUMMARY_LINE_WITHOUT_PRECEDENCE = ROOT_LINKS.length + 3;
/** First data row of the precedence table (row 1); row n is at this + n - 1. */
export const PROJECT_SHAPE_FIXTURE_ROOT_ROW_1_LINE = ROOT_LINKS.length + 5;

export const PROJECT_SHAPE_FIXTURE_TEXTS: Readonly<Record<string, string>> = {
  'about/README.md': [...ROOT_LINKS, ...ROOT_PRECEDENCE, ...ROOT_SUMMARY].join('\n'),
  'about/heart-and-soul/README.md': '- [Vision](vision.md)\n- [Architecture](architecture.md)\n- [v1](v1.md)\n',
  'about/heart-and-soul/vision.md': VISION,
  'about/heart-and-soul/architecture.md': ARCHITECTURE,
  'about/heart-and-soul/v1.md': V1,
  'about/legends-and-lore/README.md': ['# Lore', '', '## Index', '', '| Contract | Status |', '| --- | --- |', '| [RFC 0001](0001.md) | accepted |', ''].join('\n'),
  'about/legends-and-lore/0001.md': '# RFC 0001\n',
  'about/spec-and-spine/README.md': 'Specs.\n',
  'about/lay-and-land/README.md': '[Components](components.md)\n',
  'about/lay-and-land/components.md': ['# Components', '', '## 1 Runtime', '', '| Component | Role |', '|---|---|', '| **Daemon** | serves |', ''].join('\n'),
  'about/craft-and-care/README.md': CRAFT_README,
  'about/craft-and-care/policies/cc-spec.md': '# Spec policy\n',
  'openspec/specs/alpha/spec.md': '# Alpha\n',
  'roster/atlas/butler.toml': '[butler]\nname = "atlas"\n',
  'roster/bishop/butler.toml': '[butler]\nname = "bishop"\n',
};

/** The same tree with the root index carrying the stated summary but no
 * precedence table, so the one-against-zero staffer count has no row to
 * decide it and stays contradicted with both anchors kept. */
export const PROJECT_SHAPE_FIXTURE_TEXTS_WITHOUT_PRECEDENCE: Readonly<Record<string, string>> = {
  ...PROJECT_SHAPE_FIXTURE_TEXTS,
  'about/README.md': [...ROOT_LINKS, ...ROOT_SUMMARY].join('\n'),
};

/** The same tree with the craft index carrying a secret-shaped token: the
 * policy excludes that body, so its craft-policy items are Unknown. */
/** The same tree plus the baseline spec the followed OpenSpec change amends,
 * so `proposedWork.currentAuthority` resolves to an Observed shape item. */
export const PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH = 'openspec/specs/switchboard-identity/spec.md';
/** Purpose prose the amended PWB-REQ-011 route must withhold. */
export const PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PURPOSE = 'PURPOSE-PROSE-NEVER-RENDERED: the switchboard resolves who is speaking.';
/** The two requirement blocks the route may select, byte-for-byte. */
export const PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS: readonly { readonly title: string; readonly text: string }[] = [
  {
    title: 'Inbound message identity resolution',
    text: [
      '### Requirement: Inbound message identity resolution',
      '',
      'The switchboard SHALL resolve the sender of every inbound message to an entity.',
      '',
      '#### Scenario: Owner sends a message',
      '',
      '- **WHEN** the owner sends a message',
      '- **THEN** the sender resolves to the owner entity',
    ].join('\n'),
  },
  {
    title: 'Routing log identity enrichment',
    text: ['### Requirement: Routing log identity enrichment', '', 'The routing log SHALL carry the resolved entity.', '', '#### Scenario: Log captures identity', '', '- **THEN** the log row names the entity'].join('\n'),
  },
];
export const PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC: Readonly<Record<string, string>> = {
  ...PROJECT_SHAPE_FIXTURE_TEXTS,
  [PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH]: [
    '# Switchboard identity',
    '',
    '## Purpose',
    '',
    PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PURPOSE,
    '',
    '## Requirements',
    '',
    PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS[0]?.text,
    '',
    PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_REQUIREMENTS[1]?.text,
    '',
  ].join('\n'),
};

export const PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET: Readonly<Record<string, string>> = {
  ...PROJECT_SHAPE_FIXTURE_TEXTS,
  'about/craft-and-care/README.md': `${CRAFT_README}\ntoken AKIA${'A'.repeat(16)} ${SECRET_SENTINEL}\n`,
};

/** The admitted extraction grammar cannot produce an item from an absent
 * source, or duplicate one identity across sources. Force the two coverage
 * states at the model-to-renderer seam without opening another repository. */
export function projectShapeItemStateFixture(model: PocModel, state: 'unknown' | 'contradicted'): PocModel {
  const shape = model.projectShape;
  if (shape.kind !== 'observed') throw new Error('item-state fixture needs an observed shape');
  const item = shape.items.find((candidate) => candidate.class === 'principle');
  if (item === undefined) throw new Error('fixture has no principle item');
  const anchors = state === 'unknown'
    ? [{ path: 'about/heart-and-soul/missing-source.md', line: 1 }]
    : [...item.anchors, { path: 'about/heart-and-soul/competing-source.md', line: 1 }];
  const unknownReason: UnknownReason = state === 'unknown' ? 'source-uncaptured-or-unreachable' : 'contradicted-pending-adjudication';
  const changed = { ...item, state, anchors, unknownReason, claim: itemClaim({ ...item, state, anchors, unknownReason }, new Map(), item.claim.evaluationId) };
  return { ...model, projectShape: { ...shape, items: shape.items.map((candidate) => candidate === item ? changed : candidate) } };
}

const encoder = new TextEncoder();

function sha1Blob(bytes: Uint8Array): string {
  return createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
}

/** A byte-level Git runner over the fixture texts: resolves every revision
 * to the fixture commit, lists the tree only at that commit and serves
 * blobs and their sizes by object id. Anything else throws. */
export function projectShapeFixtureGit(texts: Readonly<Record<string, string>> = PROJECT_SHAPE_FIXTURE_TEXTS): GitRunner {
  const entries = Object.entries(texts).map(([path, text]) => {
    const body = encoder.encode(text);
    return { path, body, objectId: sha1Blob(body) };
  });
  const byOid = new Map(entries.map((entry) => [entry.objectId, entry.body]));
  const listing = entries.map((e) => `100644 blob ${e.objectId} ${String(e.body.byteLength).padStart(7)}\t${e.path}\x00`).join('');
  return (args: readonly string[]): Uint8Array => {
    switch (args[0]) {
      case 'rev-parse':
        return encoder.encode(`${PROJECT_SHAPE_FIXTURE_COMMIT}\n`);
      case 'show':
        return encoder.encode(`${PROJECT_SHAPE_FIXTURE_COMMITTED_AT}\n`);
      case 'ls-tree':
        if (args[4] !== PROJECT_SHAPE_FIXTURE_COMMIT) throw new Error(`fixture lists trees only at the resolved commit, not ${args[4] ?? ''}`);
        return encoder.encode(listing);
      case 'cat-file': {
        const body = byOid.get(args[2] ?? '');
        if (body === undefined) throw new Error(`fixture has no object ${args[2] ?? ''}`);
        if (args[1] === '-s') return encoder.encode(`${body.byteLength}\n`);
        if (args[1] !== 'blob') throw new Error(`unexpected git command ${args.join(' ')}`);
        return body;
      }
      default:
        throw new Error(`unexpected git command ${args.join(' ')}`);
    }
  };
}

/** A Git runner that answers `cat-file` for any object id with `body` (its
 * size, or the bytes themselves): a forged object, whatever was asked for. */
export function forgedBlobGit(body: Uint8Array): GitRunner {
  return (args) => (args[0] === 'cat-file' && args[1] === '-s' ? encoder.encode(`${body.byteLength}\n`) : body);
}

/** A Git runner that can serve nothing. */
export const UNREADABLE_GIT: GitRunner = (args) => {
  throw new Error(`fixture: git cannot run ${args.join(' ')}`);
};

/** A valid state-(1) evaluation of all three effect acts, for tests only. */
export const ADMITTING_AUTHORITY: BodyReadAuthorityEvaluation = {
  evaluationId: 'evaluation:test-admitting',
  evaluationInstant: '2026-09-04T00:00:00Z',
  admits: true,
  authorizationMode: 'owner-trusted-bootstrap',
  consent: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:consent', artifactDigest: 'sha256:c'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  policy: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:policy', artifactDigest: 'sha256:p'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  registry: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:registry', artifactDigest: 'sha256:r'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  contradiction: undefined,
};

/** An evaluation whose consent act is absent: the gate refuses. */
export const REJECTING_AUTHORITY: BodyReadAuthorityEvaluation = {
  evaluationId: 'evaluation:test-rejecting',
  evaluationInstant: '2026-09-04T00:00:00Z',
  admits: false,
  authorizationMode: 'rejected',
  consent: { kind: 'absent', what: 'artifact-missing', artifactDigest: undefined },
  policy: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:policy', artifactDigest: 'sha256:p'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  registry: { kind: 'invalid', caseId: 'registry:phrase-mismatched', detail: 'wrong phrase', artifactDigest: 'sha256:r'.padEnd(71, '0'), claimedProvenance: 'state-1' },
  contradiction: { clause: 'RFC3-16(a)', definedTerm: 'authorization-bearing governance artifact', statement: 'No effective act.', failing: [] },
};

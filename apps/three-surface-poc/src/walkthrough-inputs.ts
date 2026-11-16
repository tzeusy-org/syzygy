// Walkthrough-judgment inputs (task 4.6, PWB-REQ-021/022).
//
// The daemon evaluates the cold-open walkthrough pair — execution record
// under `.syzygy/governance/records/`, owner judgment under
// `.syzygy/governance/decisions/` with its owner act record — from the
// Syzygy governance tree on every model build, the way the three body-read
// authorities are. The controlled expectations live here, never in the
// artifacts. Until the recording session writes the run record the pair is
// absent and the evaluation is `absent` (Unknown, never met) — no verdict is
// invented, and nothing here performs an owner act.

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  JUDGMENT_CORRELATION_UNAVAILABLE,
  type ActRecordInput,
  type ReadinessTraversal,
  type WalkthroughBinding,
  type WalkthroughJudgmentExpectations,
  type WalkthroughJudgmentInputs,
  type WalkthroughJudgmentInputsFor,
} from '@syzygy/three-surface-poc-core';
import { sha256 } from '@syzygy/support';

import { POLARIS_HUMAN_PATH, POLARIS_TAILNET_PATH, sourceSlug } from './polaris.js';
import { POLARIS_SOURCE_PATH, POLARIS_SOURCE_TAILNET_PATH, SOURCE_IDENTITY_PARAM } from './polaris-source.js';
import {
  actIdentityOf,
  classifyMissingRecord,
  defaultRunGit,
  batchReaderFor,
  defaultReadGitBlob,
  gitTreeReaders,
  lifecycleFor,
  readArtifact,
  readOptionalText,
  resolveRecordingTag,
  type LoadGovernanceInputsOptions,
} from './governance-inputs.js';

// Test seam: exported for the tests; production code reaches it only inside this file.
/** The one scheduled walkthrough. Identities are serial, not dated, so the
 * record and act may be performed on whatever day the owner chooses.
 *
 * The schedule carries no surface version and no evaluation identity of
 * its own (the former placeholders `polaris@0.0.0` / `not-yet-recorded`
 * could bind no record — PWB-LIVE-12): both are derived from the exact
 * evaluation the daemon serves, `pwbSurfaceVersion` from the Polaris
 * and core source trees at the observer revision and the evaluation identity from
 * the observed shape's observation digest (`walkthroughEvaluationIdentity`,
 * core). The daemon prints both and Polaris shows both, so the recording
 * session copies rather than invents them.
 *
 * The route population is Polaris only (PWB-REQ-021 as amended): the human
 * page and its exact-source route, each direct and through the tailnet
 * mount. A record naming any other surface is `traversed-paths-wrong`
 * under PWB-REQ-022 and `path-outside-polaris` under readiness. */
export const PWB_WALKTHROUGH_SCHEDULE = {
  criterion: 'polaris-cold-open-comprehension',
  runRecordIdentity: 'PWB-WALKTHROUGH-001',
  runRecordPath: '.syzygy/governance/records/PWB-WALKTHROUGH-001.md',
  judgmentPath: '.syzygy/governance/decisions/PWB-COLD-OPEN-WALKTHROUGH-JUDGMENT-001.md',
  judgmentActRecordPath: '.syzygy/governance/decisions/PWB-COLD-OPEN-WALKTHROUGH-JUDGMENT-ACT.md',
  mode: 'nonvisual-keyboard-only',
  surfaceRoutes: [POLARIS_HUMAN_PATH, POLARIS_TAILNET_PATH, POLARIS_SOURCE_PATH, POLARIS_SOURCE_TAILNET_PATH],
  actIdentity: 'PWB-COLD-OPEN-WALKTHROUGH-JUDGMENT-001',
  actType: 'adopt-walkthrough-judgment',
  phrasePrefix: 'ADOPT POLARIS COLD-OPEN WALKTHROUGH JUDGMENT',
  recordingTag: 'pwb-adopt-walkthrough-judgment-signed-001',
} as const;

/** The trees whose bytes render the surface a reader walks: the Polaris
 * app source and the shared core package it renders from (PWB-RECON-03:
 * a core-only change moves what the page says, so it moves the version).
 * The version is a digest over both Git tree ids at the observer revision,
 * so it changes with any change to either tree and with nothing else —
 * committing the run record does not move it. */
const POLARIS_SURFACE_TREES = ['apps/three-surface-poc/src', 'packages/three-surface-poc-core/src'] as const;
const POLARIS_SURFACE_NAME = 'polaris' as const;

/** `polaris@<12 hex of sha256 over the surface tree ids, newline-joined>`.
 * When either tree cannot be resolved the version names that state
 * (`polaris@unresolved`) so no record can match it — fail closed, never a
 * placeholder that a record could be written against. */
export function pwbSurfaceVersion(runGit: (repoRoot: string, args: readonly string[]) => string, repoRoot: string, observerRevision: string): string {
  const trees: string[] = [];
  for (const path of POLARIS_SURFACE_TREES) {
    let tree: string;
    try {
      tree = runGit(repoRoot, ['rev-parse', `${observerRevision}:${path}`]).trim();
    } catch {
      return `${POLARIS_SURFACE_NAME}@unresolved`;
    }
    if (!/^[0-9a-f]{40,64}$/.test(tree)) return `${POLARIS_SURFACE_NAME}@unresolved`;
    trees.push(tree);
  }
  return `${POLARIS_SURFACE_NAME}@${sha256(trees.join('\n')).slice(0, 12)}`;
}

// The other act-bound artifacts a judgment act could be mis-paired to.
const OTHER_ACT_BOUND_ARTIFACTS = [
  '.syzygy/governance/decisions/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md',
  '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json',
  '.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json',
] as const;

// Test seam: exported for the tests; production code reaches it only inside this file.
/** The controlled evaluation input for the scheduled walkthrough, bound
 * to one exact surface version and evaluation identity. */
export function pwbWalkthroughExpectations(evaluationInstant: string, binding: WalkthroughBinding): WalkthroughJudgmentExpectations {
  const s = PWB_WALKTHROUGH_SCHEDULE;
  return {
    observingProject: 'project:syzygy',
    owner: 'Tzeusy',
    evaluationInstant,
    // The PWB state-(1) amendment sign-off; PWB-REQ-022 accepts state (1)
    // only from that act onward.
    governingActInstant: '2026-09-02',
    criterion: s.criterion,
    runRecordIdentity: s.runRecordIdentity,
    surfaceVersion: binding.surfaceVersion,
    evaluationIdentity: binding.evaluationIdentity,
    mode: s.mode,
    surfaceRoutes: [...s.surfaceRoutes],
    judgment: {
      artifactPath: s.judgmentPath,
      actIdentity: s.actIdentity,
      actType: s.actType,
      phrasePrefix: s.phrasePrefix,
      recordingTag: s.recordingTag,
      scopeAnchors: [s.runRecordIdentity, s.criterion],
      a1: { kind: 'absent' },
    },
    otherActBoundArtifacts: [...OTHER_ACT_BOUND_ARTIFACTS],
  };
}

interface LoadWalkthroughJudgmentInputsOptions extends LoadGovernanceInputsOptions {
  /** The exact surface version and evaluation identity the pair must name. */
  readonly binding: WalkthroughBinding;
}

/** The daemon's seam: `buildPocModel` calls this with the exact
 * evaluation identity of the shape it observed; the surface version is
 * the Polaris tree at the governance (observer) revision. */
export function walkthroughJudgmentInputsFor(options: LoadGovernanceInputsOptions): WalkthroughJudgmentInputsFor {
  const runGit = options.runGit ?? defaultRunGit;
  const surfaceVersion = options.governanceRevision === undefined
    ? `${POLARIS_SURFACE_NAME}@unresolved`
    : pwbSurfaceVersion(runGit, resolve(options.repoRoot), options.governanceRevision);
  return (binding) => loadWalkthroughJudgmentInputs({ ...options, binding: { surfaceVersion, evaluationIdentity: binding.evaluationIdentity } });
}

// Test seam: exported for the tests; production code reaches it only inside this file.
export function loadWalkthroughJudgmentInputs(options: LoadWalkthroughJudgmentInputsOptions): WalkthroughJudgmentInputs {
  const runGit = options.runGit ?? defaultRunGit;
  const readGitBlob = options.readGitBlob ?? defaultReadGitBlob;
  const repoRoot = resolve(options.repoRoot);
  const tree = options.governanceRevision === undefined
    ? undefined
    : gitTreeReaders(runGit, readGitBlob, repoRoot, options.governanceRevision, batchReaderFor(options));
  const read = options.readFile ?? tree?.read ?? ((path: string) => new Uint8Array(readFileSync(path)));
  const list = options.listDirectory ?? tree?.list ?? ((path: string) => readdirSync(path));
  const prefetch = options.readFile === undefined ? tree?.prefetch : undefined;
  const s = PWB_WALKTHROUGH_SCHEDULE;
  const expectations = pwbWalkthroughExpectations(options.evaluationInstant, options.binding);

  const runArtifact = readArtifact(read, join(repoRoot, s.runRecordPath));
  const judgmentArtifact = readArtifact(read, join(repoRoot, s.judgmentPath));
  const record = readOptionalText(read, join(repoRoot, s.judgmentActRecordPath));
  const recordText = record?.text;
  const actRecord: ActRecordInput =
    recordText === undefined
      ? classifyMissingRecord(runGit, repoRoot, s.recordingTag, judgmentArtifact)
      : { kind: 'owner-act-record', text: recordText };

  return {
    evaluationId: options.evaluationId,
    runRecord: { path: s.runRecordPath, artifact: runArtifact },
    judgment: {
      path: s.judgmentPath,
      artifact: judgmentArtifact,
      actRecord,
      lifecycle: lifecycleFor(read, list, repoRoot, s.judgmentActRecordPath, recordText === undefined ? undefined : actIdentityOf(recordText), prefetch),
      recordingTag: resolveRecordingTag(runGit, readGitBlob, repoRoot, s.recordingTag, s.judgmentActRecordPath, record?.bytes),
    },
    expectations,
    correlate: JUDGMENT_CORRELATION_UNAVAILABLE,
  };
}

/** PWB-REQ-021 readiness traversal (as amended 2026-09-05): a traversed path
 * is lawful only when it is Polaris itself (direct or tailnet mount) or
 * Polaris's exact-source route of the same evaluation. That route is
 * spelled three ways: the `#polaris-source-<slug>` fragment of a Polaris
 * route naming a source in this evaluation's population; the exact-source
 * page `/polaris/source` (direct or mounted) bare — it resolves identities
 * only against this evaluation's signed population, so it can show no
 * other evaluation's source; or that page with `?identity=` naming a
 * population source's path. Every other surface, and a source this
 * evaluation does not carry, is outside Polaris. */
export function pwbReadinessTraversal(): ReadinessTraversal {
  const polarisRoutes = [POLARIS_HUMAN_PATH, POLARIS_TAILNET_PATH] as const;
  const sourceRoutes = [POLARIS_SOURCE_PATH, POLARIS_SOURCE_TAILNET_PATH] as const;
  return {
    polarisRoutes,
    isExactSourceRoute: (path, sourcePaths) => {
      const query = path.indexOf('?');
      const hash = path.indexOf('#');
      const routeEnd = Math.min(query < 0 ? path.length : query, hash < 0 ? path.length : hash);
      const route = path.slice(0, routeEnd);
      if ((sourceRoutes as readonly string[]).includes(route)) {
        if (query < 0) return hash < 0;
        const identity = new URLSearchParams(path.slice(query + 1, hash < 0 ? path.length : hash)).get(SOURCE_IDENTITY_PARAM);
        if (identity === null) return false;
        const colon = identity.indexOf(':');
        const pathEnd = identity.indexOf('#');
        const sourcePath = colon < 0 ? '' : identity.slice(colon + 1, pathEnd < 0 ? identity.length : pathEnd);
        return sourcePaths.includes(sourcePath);
      }
      if (hash < 0 || query >= 0) return false;
      if (!(polarisRoutes as readonly string[]).includes(route)) return false;
      const fragment = path.slice(hash + 1);
      const prefix = 'polaris-source-';
      if (!fragment.startsWith(prefix)) return false;
      const slug = fragment.slice(prefix.length);
      return sourcePaths.some((sourcePath) => sourceSlug(sourcePath) === slug);
    },
  };
}

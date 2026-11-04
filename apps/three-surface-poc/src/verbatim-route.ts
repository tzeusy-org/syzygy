// PWB-REQ-011's transient exact-requirement route (as amended 2026-09-05).
//
// When the current requirement leaf belongs to a baseline
// `openspec/specs/*/spec.md` exact Git object already in the signed,
// admitted population, Polaris may transiently encode that requirement and
// its scenarios verbatim — after the unchanged authority, exact-object,
// whole-body secret, inert-content and identity checks have all admitted the
// same object. The reader below is that route: it is derived from the model
// being rendered, decides per leaf from the shape's own records, reads the
// exact object id once per render, screens the transient body with the same
// approved detectors and active-content scan the pipeline uses, and stores,
// logs and caches nothing. Any failed gate is a typed refusal that leaves the
// text Unknown with its reason and discloses no body bytes; the selection of
// requirement blocks and the identity check happen in `resolveVerbatim`.
//
// Why the route screens the body itself: phase B classifies baseline specs
// path-only (their item identity is the directory name, so the pipeline
// deliberately never reads their bodies). The evaluation therefore holds no
// whole-body secret or inert-content verdict for them, and this route runs
// those unchanged checks on the bytes it reads before any of them may be
// encoded. No new consent is granted here: the object is already a member of
// the signed population under the one consented content class.
//
// The body is read through the core's one bounded read, `readBoundedBlob`,
// under the route's own policy (syzygy-bpyt.6.17). Git is first asked the
// object's size (`cat-file -s`), so a body over the per-source envelope is
// refused before any of its bytes move; the production runner also holds
// stdout to that envelope and captures Git's stderr, so neither an
// over-envelope body nor a Git diagnostic reaches the daemon.
import { execFileSync } from 'node:child_process';

import {
  PWB_RESOURCE_LIMITS,
  PWB_SECRET_POLICY,
  compileDetectors,
  createResourceLedger,
  deniedPathReason,
  detectSecrets,
  readBoundedBlob,
  scanActiveContent,
  type BlobReadPolicy,
  type GitRunner,
  type PocModel,
  type PwbResourceLimits,
  type SecretClassificationPolicy,
} from '@syzygy/three-surface-poc-core';

import type { VerbatimLeafReader, VerbatimRefusal } from './capability-detail.js';

/**
 * The route's Git runner: one command against `repoRoot`, stdout held to the
 * per-source envelope (a longer output kills the read and throws) and stderr
 * captured on the thrown error, never inherited by the daemon.
 */
export function gitBlobReaderFor(repoRoot: string, limits: PwbResourceLimits = PWB_RESOURCE_LIMITS): GitRunner {
  return (args) =>
    new Uint8Array(execFileSync('git', [...args], { cwd: repoRoot, maxBuffer: limits.maxBytesPerSource, stdio: ['ignore', 'pipe', 'pipe'] }));
}

const OBJECT_SIZE = /^(0|[1-9][0-9]*)\n?$/;

/** The object's size as Git declares it, or `undefined` when Git cannot say. */
function declaredSize(runGit: GitRunner, objectId: string): number | undefined {
  let output: Uint8Array;
  try {
    output = runGit(['cat-file', '-s', objectId]);
  } catch {
    return undefined;
  }
  const match = OBJECT_SIZE.exec(new TextDecoder().decode(output));
  return match === null ? undefined : Number(match[1]);
}

// The route's screen: the pipeline's whole-body secret detectors, then its
// active-content scan, both over the transient text and both uncharged.
function verbatimReadPolicy(detectors: ReturnType<typeof compileDetectors>): BlobReadPolicy {
  return {
    phase: 'verbatim',
    refusals: [],
    screen: (text) => {
      const detector = detectSecrets(detectors, text);
      if (detector !== undefined) return { kind: 'excluded', reason: 'secret-matched', detail: detector };
      const active = scanActiveContent(text);
      if (active.length > 0) return { kind: 'excluded', reason: 'active-content', detail: String(active.length), activeContent: active };
      return { kind: 'safe' };
    },
    trailingPasses: [],
  };
}

// The route is held to the per-source envelope alone, as it always was: the
// evaluation's cumulative byte and parse-pass budgets belong to the
// evaluation's own ledger, and applying them to a render-time read would
// change what the route serves (GP-Q0).
function verbatimLedgerLimits(limits: PwbResourceLimits): PwbResourceLimits {
  return { ...limits, maxTotalBytes: Number.POSITIVE_INFINITY, maxParsePassesPerSource: Number.POSITIVE_INFINITY };
}

function refusal(refused: VerbatimRefusal['refused'], detail: string): VerbatimRefusal {
  return { refused, detail };
}

/**
 * The route, or `undefined` when the evaluation observed no shape (no
 * population, no gate to consult, so the leaf stays outside the consented
 * class exactly as before).
 */
export function verbatimRouteReader(
  model: PocModel,
  runGit: GitRunner,
  policy: SecretClassificationPolicy = PWB_SECRET_POLICY,
  limits: PwbResourceLimits = PWB_RESOURCE_LIMITS,
): VerbatimLeafReader | undefined {
  const shape = model.projectShape;
  if (shape.kind !== 'observed') return undefined;
  const detectors = compileDetectors(policy);
  return (leaf) => {
    // 1. Authority: only a source the P1-gated evaluation admitted into the
    //    signed population, under the baseline-spec rule, at this revision.
    const source = shape.sources.find((candidate) => candidate.path === leaf.path);
    if (source === undefined) {
      return refusal('unconsented-source-or-provider', `${leaf.path} is not a source of this evaluation's signed population; nothing was read.`);
    }
    if (source.rule !== 'baseline-spec-tree') {
      return refusal('unconsented-source-or-provider', `${leaf.path} is not a baseline spec (${source.rule}); the exact-requirement route applies to baseline specs only.`);
    }
    if (leaf.revision !== shape.identity.revision) {
      return refusal('reference-unresolvable', `${leaf.path} is bound to ${leaf.revision.slice(0, 12)} but this evaluation observed ${shape.identity.revision.slice(0, 12)}; nothing was read.`);
    }
    if (source.identity !== leaf.identity) {
      return refusal('reference-unresolvable', `${leaf.path}'s captured identity is not this evaluation's exact object; nothing was read.`);
    }
    if (source.record.outcome === 'excluded') {
      return refusal('excluded-content', `${leaf.path} was excluded by policy in this evaluation (${source.record.exclusion.redactionClass}); nothing was read.`);
    }
    if (source.record.outcome !== 'classified') {
      return refusal('source-uncaptured-or-unreachable', `${leaf.path}'s body was not admitted in this evaluation (${source.record.outcome}); nothing was read.`);
    }
    if (source.anchor.kind !== 'blob') {
      return refusal('reference-unresolvable', `${leaf.path} is ${source.anchor.kind} at this revision; there is no exact object to read.`);
    }
    const denied = deniedPathReason(leaf.path);
    if (denied !== undefined) {
      return refusal('excluded-content', `${leaf.path} is denied by the classification policy (${denied}); nothing was read.`);
    }
    // 2. Exact object, read bounded: the declared size against the envelope
    //    before any byte moves, one `cat-file blob`, and the bytes hashed to
    //    this evaluation's exact object.
    const objectId = source.anchor.objectId;
    const sizeBytes = declaredSize(runGit, objectId);
    if (sizeBytes === undefined) return undefined;
    const objectFormat = objectId.length === 64 ? 'sha256' : 'sha1';
    const ledger = createResourceLedger(verbatimLedgerLimits(limits));
    const read = readBoundedBlob({ runGit, ledger, limits, path: leaf.path, objectFormat }, { objectId, sizeBytes }, verbatimReadPolicy(detectors));
    // 3. Whole-body secret and inert-content checks, the pipeline's own,
    //    over the transient text; the refusal names the detector or form,
    //    never the bytes.
    switch (read.kind) {
      case 'bytes':
        break;
      case 'git-read-failed':
        return undefined;
      case 'over-limit':
        return refusal('excluded-content', `${leaf.path} exceeds the per-source envelope (${sizeBytes} > ${limits.maxBytesPerSource} bytes); nothing was rendered.`);
      case 'object-id-mismatch':
        return refusal('reference-unresolvable', `${leaf.path}: the bytes served do not hash to this evaluation's exact object; nothing was rendered.`);
      case 'contains-nul':
        return refusal('excluded-content', `${leaf.path} is not text; nothing was rendered.`);
      case 'not-utf-8':
        return refusal('excluded-content', `${leaf.path} is not UTF-8 text; nothing was rendered.`);
      case 'excluded': {
        if (read.reason === 'secret-matched') {
          return refusal('excluded-content', `${leaf.path} matched the classification policy's ${read.detail} detector (${policy.policyId} ${policy.policyVersion}); nothing was rendered.`);
        }
        const forms = [...new Set((read.activeContent ?? []).map((finding) => finding.form))].join(', ');
        return refusal('excluded-content', `${leaf.path} carries active content (${forms}); nothing was rendered.`);
      }
    }
    // 4. Identity and requirement selection follow in `resolveVerbatim`.
    return read.bytes;
  };
}

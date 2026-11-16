// Walkthrough readiness — PWB-REQ-021 as amended by the 2026-09-05
// truth-and-readiness amendment.
//
// The retained cold-open walkthrough record carries the owner's own-words
// answers. Readiness is the execution-side check that the record is a
// well-formed, same-evaluation, Polaris-only answer population whose cited
// sources and authorities resolve against the evaluation the owner read and
// whose evaluation suffered no PWB-REQ-006 resource breach. It is machine-
// readable and owner-visible, and it is an execution fact only: never a
// verdict, never a score, never proof of comprehension. Nothing here reads
// an answer's meaning.
//
// Readiness is deliberately separate from PWB-REQ-022. It shares no case
// with the 84 present-invalid plus 2 absent act-validity population, mints
// no `verdict-unlawful`, and never changes the judgment evaluator's
// outcome; a structurally lawful pair can be not ready and a valid owner
// act can retain a negative judgment. Every arm below is evaluated (a
// sweep, not a first-failure), so the owner sees every reason at once.

import { sha256 } from '@syzygy/support';

import { canonicalJson } from './project-shape-manifest.js';
import type { ProjectShape } from './project-shape-model.js';
import type { RunRecordInput } from './walkthrough-judgment.js';
import { parseRunRecord } from './walkthrough-judgment.js';

// ---------------------------------------------------------------------
// Closed vocabularies (the requirement's own).
// ---------------------------------------------------------------------

/** The nine answer identities PWB-REQ-021 names, in the requirement's order. */
export const ANSWER_IDENTITIES = [
  'why',
  'promises',
  'refusals-and-rule',
  'capabilities-and-fit',
  'exact-requirement',
  'unknown-or-contradiction',
  'claim-strength',
  'architecture-and-groups',
  'v1-success',
] as const;
type AnswerIdentity = (typeof ANSWER_IDENTITIES)[number];

/** The ten readiness arms, one per clause of the requirement's readiness
 * sentence. Each makes readiness false; none is an act-validity case. */
export const READINESS_ARMS = [
  'answer-missing',
  'answer-empty',
  'answer-duplicate',
  'answer-unrecognized',
  'anchor-unresolved',
  'surface-mismatch',
  'evaluation-mismatch',
  'path-outside-polaris',
  'resource-breach',
  'authority-unresolvable',
] as const;
type ReadinessArm = (typeof READINESS_ARMS)[number];

const ANSWERS_SECTION = 'Answers' as const;
const SOURCES_LABEL = 'Sources:';
const AUTHORITY_LABEL = 'Authority:';

// ---------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------

/** The route population a readiness traversal may use: Polaris itself and
 * its same-evaluation exact-source route. Supplied by the surface, never
 * read from the record. */
export interface ReadinessTraversal {
  readonly polarisRoutes: readonly string[];
  /** True only for an exact-source route of the same evaluation: the
   * surface decides how such a route is spelled, the evaluation supplies
   * the source paths it may point at (empty when no shape was observed). */
  readonly isExactSourceRoute: (path: string, sourcePaths: readonly string[]) => boolean;
}

/** The same-evaluation source population anchors and authorities resolve
 * against. `unavailable` when the evaluation observed no shape: nothing
 * resolves then, and the reason is retained. */
export type ReadinessPopulation =
  | {
      readonly kind: 'observed';
      readonly sources: readonly { readonly path: string; readonly admitted: boolean }[];
      readonly limitBreaches: number;
    }
  | { readonly kind: 'unavailable'; readonly reason: string };

/** What a record for this evaluation must name: the one exact surface
 * version and evaluation identity (PWB-REQ-021 "one exact surface version
 * and evaluation identity"). Never a placeholder. */
export interface WalkthroughBinding {
  readonly surfaceVersion: string;
  readonly evaluationIdentity: string;
}

export interface WalkthroughReadinessInputs {
  readonly runRecord: RunRecordInput;
  readonly expectations: WalkthroughBinding;
  readonly traversal: ReadinessTraversal;
  readonly population: ReadinessPopulation;
}

/** The exact evaluation identity a walkthrough record binds to (as
 * amended 2026-09-05). An observed shape's identity digests its
 * deterministic inputs — repository and revision, manifest digest,
 * discovery/observer/implementation versions, resource limits, and the
 * consent, policy and registry acts the authority evaluation rested on
 * (their identities and artifact digests) — and nothing time-bound: the
 * authority's per-run `evaluationId` and every capture instant are left
 * out, so the identity is the same after a daemon restart or a Syzygy
 * commit that changes none of those inputs, and changes with any of them.
 * (The observation digest itself is not used: it carries the per-run
 * authority evaluation id.) A shape that was not observed has no exact
 * evaluation to bind: the identity names that state, so no record can
 * match it. Always an identifier (`[a-z0-9-]`). */
export function walkthroughEvaluationIdentity(shape: ProjectShape): string {
  if (shape.kind !== 'observed') return `pwb-unobserved-${shape.kind}`;
  const inputs = shape.identity.deterministicInputs;
  const authority = inputs.authority.kind === 'evaluated'
    ? { kind: 'evaluated', consent: inputs.authority.consent, policy: inputs.authority.policy, registry: inputs.authority.registry }
    : { kind: inputs.authority.kind };
  const stable = { ...inputs, authority };
  const digest = sha256(canonicalJson(stable));
  return `pwb-eval-${digest.slice(0, 24)}`;
}

// ---------------------------------------------------------------------
// Outputs.
// ---------------------------------------------------------------------

interface AnswerAnchor {
  readonly path: string;
  readonly line: number;
  readonly resolved: boolean;
}

interface RetainedAnswer {
  readonly identity: string;
  /** The owner's own words, retained verbatim and never judged here. */
  readonly text: string;
  readonly anchors: readonly AnswerAnchor[];
  readonly authority?: { readonly path: string; readonly resolved: boolean };
}

interface ReadinessFinding {
  readonly arm: ReadinessArm;
  readonly detail: string;
}

export type WalkthroughReadiness =
  | { readonly kind: 'no-run-record'; readonly ready: false; readonly detail: string; readonly expected: WalkthroughBinding }
  | {
      readonly kind: 'evaluated';
      readonly ready: boolean;
      readonly findings: readonly ReadinessFinding[];
      readonly answers: readonly RetainedAnswer[];
      readonly surfaceVersion: string | undefined;
      readonly evaluationIdentity: string | undefined;
      readonly traversedPaths: readonly string[];
      /** What the record must name to be this evaluation's. */
      readonly expected: WalkthroughBinding;
    };

/** Served-response breaches sit outside the input ledger. Project their count
 * into the existing resource-breach arm at render time, without changing the
 * retained run record or the PWB-REQ-022 judgment. */
export function withServedResourceBreaches(
  readiness: WalkthroughReadiness,
  inputCount: number | null,
  servedCount: number,
): WalkthroughReadiness {
  if (servedCount === 0 || readiness.kind !== 'evaluated') return readiness;
  const otherFindings = readiness.findings.filter(finding => finding.arm !== 'resource-breach');
  return {
    ...readiness,
    ready: false,
    findings: [
      ...otherFindings,
      { arm: 'resource-breach', detail: `PWB-REQ-006 breaches: input ${inputCount === null ? 'Unknown' : inputCount}; served ${servedCount}` },
    ],
  };
}

// ---------------------------------------------------------------------
// Answers grammar (pure text → retained answers; no validity).
//
//   ## Answers
//
//   ### <identity>
//
//   <own words, any number of paragraphs>
//
//   Sources: `<path>:<line>`, `<path>:<line>`
//   Authority: `<path>`
//
// Each `### ` heading under `## Answers` opens one answer; the section ends
// at the next `## ` heading. `Sources:` and `Authority:` lines are
// citations, not own words.
// ---------------------------------------------------------------------

interface ParsedAnswer {
  readonly identity: string;
  readonly line: number;
  readonly text: string;
  readonly anchors: readonly { readonly raw: string; readonly path?: string; readonly line?: number }[];
  readonly authority?: { readonly raw: string; readonly path?: string };
}

const ANCHOR = /^`([^`\s:]+(?:\/[^`\s:]+)*):(\d+)`$/;
const AUTHORITY = /^`([^`\s]+)`$/;

function answersSection(text: string): readonly string[] | undefined {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${ANSWERS_SECTION}`);
  if (start < 0) return undefined;
  const body: string[] = [];
  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index] ?? '';
    if (line.startsWith('## ')) break;
    body.push(line);
  }
  return body;
}

export function parseAnswers(text: string): readonly ParsedAnswer[] | undefined {
  const body = answersSection(text);
  if (body === undefined) return undefined;
  const out: ParsedAnswer[] = [];
  let current: { identity: string; line: number; words: string[]; anchors: ParsedAnswer['anchors'][number][]; authority?: ParsedAnswer['authority'] } | undefined;
  const flush = (): void => {
    if (current === undefined) return;
    out.push({
      identity: current.identity,
      line: current.line,
      text: current.words.join('\n').trim(),
      anchors: current.anchors,
      ...(current.authority === undefined ? {} : { authority: current.authority }),
    });
    current = undefined;
  };
  body.forEach((rawLine, offset) => {
    const line = rawLine.trim();
    const heading = /^### (.*)$/.exec(rawLine);
    if (heading !== null) {
      flush();
      current = { identity: (heading[1] ?? '').trim(), line: offset, words: [], anchors: [] };
      return;
    }
    if (current === undefined) return;
    if (line.startsWith(SOURCES_LABEL)) {
      for (const raw of line.slice(SOURCES_LABEL.length).split(',').map((part) => part.trim()).filter((part) => part !== '')) {
        const match = ANCHOR.exec(raw);
        current.anchors.push(match === null ? { raw } : { raw, path: match[1] as string, line: Number(match[2]) });
      }
      return;
    }
    if (line.startsWith(AUTHORITY_LABEL)) {
      const raw = line.slice(AUTHORITY_LABEL.length).trim();
      const match = AUTHORITY.exec(raw);
      current.authority = match === null ? { raw } : { raw, path: match[1] as string };
      return;
    }
    current.words.push(line);
  });
  flush();
  return out;
}

// ---------------------------------------------------------------------
// Evaluation.
// ---------------------------------------------------------------------

function isAnswerIdentity(value: string): value is AnswerIdentity {
  return (ANSWER_IDENTITIES as readonly string[]).includes(value);
}

export function evaluateWalkthroughReadiness(inputs: WalkthroughReadinessInputs): WalkthroughReadiness {
  const { artifact, path } = inputs.runRecord;
  const expected: WalkthroughBinding = { surfaceVersion: inputs.expectations.surfaceVersion, evaluationIdentity: inputs.expectations.evaluationIdentity };
  if (artifact.kind !== 'present') {
    return { kind: 'no-run-record', ready: false, detail: `The walkthrough run record ${path} is ${artifact.kind}; there is no answer population to assess.`, expected };
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(artifact.bytes);
  } catch {
    return { kind: 'no-run-record', ready: false, detail: `The walkthrough run record ${path} is not UTF-8 text; there is no answer population to assess.`, expected };
  }
  const findings: ReadinessFinding[] = [];
  const finding = (arm: ReadinessArm, detail: string): void => {
    findings.push({ arm, detail });
  };

  // 1–4. The answer population: exactly one non-empty entry per identity.
  const parsed = parseAnswers(text);
  const answers: RetainedAnswer[] = [];
  const seen = new Map<string, number>();
  if (parsed === undefined) {
    for (const identity of ANSWER_IDENTITIES) finding('answer-missing', `no \`## ${ANSWERS_SECTION}\` section; ${identity} is absent`);
  } else {
    for (const answer of parsed) {
      const count = (seen.get(answer.identity) ?? 0) + 1;
      seen.set(answer.identity, count);
      if (!isAnswerIdentity(answer.identity)) {
        finding('answer-unrecognized', `\`### ${answer.identity}\` names no PWB-REQ-021 identity`);
      } else if (count > 1) {
        finding('answer-duplicate', `${answer.identity} appears ${count} times`);
      }
      if (answer.text === '') finding('answer-empty', `${answer.identity} carries no own-words text`);
    }
    for (const identity of ANSWER_IDENTITIES) if (!seen.has(identity)) finding('answer-missing', `${identity} is absent`);
  }

  // 5 and 10. Source anchors and cited authorities resolve against the
  // same-evaluation population: an anchor resolves to any source in the
  // complete population (an Unknown source is still a source the reader
  // saw); an authority resolves only to an admitted source, because an
  // excluded one is not current authority anyone could read.
  const population = inputs.population;
  const sourcesByPath = population.kind === 'observed' ? new Map(population.sources.map((source) => [source.path, source])) : undefined;
  for (const answer of parsed ?? []) {
    const anchors: AnswerAnchor[] = [];
    for (const anchor of answer.anchors) {
      if (anchor.path === undefined || anchor.line === undefined || anchor.line < 1) {
        finding('anchor-unresolved', `${answer.identity}: ${anchor.raw} is not a \`path:line\` anchor`);
        continue;
      }
      const resolved = sourcesByPath?.has(anchor.path) ?? false;
      if (!resolved) {
        finding(
          'anchor-unresolved',
          sourcesByPath === undefined
            ? `${answer.identity}: ${anchor.path}:${anchor.line} cannot be resolved — ${population.kind === 'unavailable' ? population.reason : 'no population'}`
            : `${answer.identity}: ${anchor.path}:${anchor.line} names no source in this evaluation`,
        );
      }
      anchors.push({ path: anchor.path, line: anchor.line, resolved });
    }
    let authority: RetainedAnswer['authority'];
    if (answer.authority !== undefined) {
      if (answer.authority.path === undefined) {
        finding('authority-unresolvable', `${answer.identity}: ${answer.authority.raw} is not a backticked path`);
      } else {
        const source = sourcesByPath?.get(answer.authority.path);
        const resolved = source?.admitted ?? false;
        if (!resolved) {
          finding(
            'authority-unresolvable',
            sourcesByPath === undefined
              ? `${answer.identity}: ${answer.authority.path} cannot be resolved — ${population.kind === 'unavailable' ? population.reason : 'no population'}`
              : source === undefined
                ? `${answer.identity}: ${answer.authority.path} names no source in this evaluation`
                : `${answer.identity}: ${answer.authority.path} is not admitted in this evaluation (Unknown)`,
          );
        }
        authority = { path: answer.authority.path, resolved };
      }
    }
    answers.push({ identity: answer.identity, text: answer.text, anchors, ...(authority === undefined ? {} : { authority }) });
  }

  // 6–7. One exact surface version and evaluation identity.
  const record = parseRunRecord(text);
  const surfaceVersion = record.surfaceVersion.kind === 'present' ? record.surfaceVersion.value : undefined;
  if (surfaceVersion !== inputs.expectations.surfaceVersion) {
    finding('surface-mismatch', `record surface ${surfaceVersion === undefined ? `(${record.surfaceVersion.kind})` : surfaceVersion} is not ${inputs.expectations.surfaceVersion}`);
  }
  const evaluationIdentity = record.evaluationIdentity.kind === 'present' ? record.evaluationIdentity.value : undefined;
  if (evaluationIdentity !== inputs.expectations.evaluationIdentity) {
    finding('evaluation-mismatch', `record evaluation ${evaluationIdentity === undefined ? `(${record.evaluationIdentity.kind})` : evaluationIdentity} is not ${inputs.expectations.evaluationIdentity}`);
  }

  // 8. Every traversed path is Polaris or its same-evaluation exact-source route.
  const traversedPaths = record.traversedPaths.kind === 'present' ? record.traversedPaths.value : [];
  const sourcePaths = population.kind === 'observed' ? population.sources.map((source) => source.path) : [];
  for (const traversed of traversedPaths) {
    if (inputs.traversal.polarisRoutes.includes(traversed) || inputs.traversal.isExactSourceRoute(traversed, sourcePaths)) continue;
    finding('path-outside-polaris', `${traversed} is neither Polaris nor its exact-source route in this evaluation`);
  }

  // 9. Any PWB-REQ-006 breach.
  if (population.kind === 'observed' && population.limitBreaches > 0) {
    finding('resource-breach', `${population.limitBreaches} PWB-REQ-006 resource breach(es) in this evaluation`);
  }

  return {
    kind: 'evaluated',
    ready: findings.length === 0,
    findings,
    answers,
    surfaceVersion,
    evaluationIdentity,
    traversedPaths,
    expected,
  };
}

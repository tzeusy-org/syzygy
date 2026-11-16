import {
  aggregate,
  consentDecisionTuple,
  evaluationId,
  coverageBoundary,
  explainAnswer,
  extractDistinctions,
  presentClasses,
  renderEntry,
  renderHuman,
  resolveExplanationReferences,
  serveEntryRoute,
  HUMAN_ENTRY_PATH,
  type AuthorityCitation,
  type AuthorityExposure,
  type DiscoverabilityWithProposal,
  type EntryContent,
  type ExplanationFactSet,
  type FacetAnswer,
  type HumanView,
  type ConsentCitation,
  type RepositoryCoverage,
  type ServedFact,
  type UntrustedConsentRecordView,
} from '@syzygy/cap1-core';
import { escapeHtml, type Route, type RouteResponse } from '@syzygy/http-host';

import type { ProjectEvaluation } from './pipeline.js';

export { escapeHtml };

// RT5 — the server-rendered human page and the "Why this answer?"
// explanation drawer (CAP1-REQ-020…023, 040…046, 050…053), plus the
// human entry document route. Everything on these pages is rendered
// SERVER-SIDE from unchanged core outputs over the SAME evaluation
// source the machine endpoint uses (one FactModel, two consumers —
// RFC6-13; parity by construction, CAP1-REQ-041). The pages carry no
// client-side fact computation: the emitted HTML contains no script at
// all; progressive disclosure is native `<details>`/`<summary>`.
//
// Module discipline: no filesystem, no clock, no randomness. Every disk
// fact arrives through the injected dependencies (the evaluation source
// and the entry-source reader); every interpolated string is
// HTML-escaped — facts come from observed files and are untrusted
// content.
//
// Honest degradation (VIS-2; CAP1-REQ-022/034/044): the no-declaration
// and invalid-declaration arms render their NAMED states — the verbatim
// Unknown label and reason, or the named validation failures — never a
// fake page and never a favourable summary. Nothing in this module
// styles an Unknown or Gap as success; the stylesheet colour-codes no
// state at all, and every distinction is carried machine-readably as a
// data-* attribute or literal text (CAP1-REQ-064; RFC7-33/34 —
// recoverable without colour, position, or layout).

// --- Route paths -------------------------------------------------------

// The project page mounts at the root, replacing the RT3 minimal root
// route at composition time.
export const HUMAN_PAGE_PATH = '/' as const;

// Where the daemon serves the human entry DOCUMENT. This is a transport
// pathname only; the entry's one fixed publication location stays
// `.syzygy/intent/OVERVIEW.md` (HUMAN_ENTRY_PATH, CAP1-REQ-020) and is
// rendered verbatim on both pages — the served entry path the REQ-020
// oracle compares is that value, never this mount point.
export const HUMAN_ENTRY_ROUTE_PATH = '/entry' as const;

// --- Injected dependencies ----------------------------------------------

// The entry document's source as the capture recorded it — a named
// result, so an unreadable entry arrives as its named state and renders
// honestly (CAP1-REQ-022), never as a thrown error and never as a fake
// page. The route never touches the filesystem: it renders the bytes the
// evaluation's capture read, or the named reason none were read.
export type EntrySourceRead =
  | { readonly state: 'present'; readonly text: string }
  | { readonly state: 'absent' }
  | { readonly state: 'unreadable'; readonly reason: string };

export interface HumanRouteDependencies {
  // The ONE evaluation source — the same one the machine endpoint (RT4)
  // is composed over, so both channels serve identical fact sets by
  // construction (CAP1-REQ-041/043).
  readonly getEvaluation: () => ProjectEvaluation | Promise<ProjectEvaluation>;
  // Authority citations the entry routes its reader to (CAP1-REQ-021).
  // Supplied by composition; absence renders as an empty citation list,
  // never as invented citations.
  readonly entryAuthorities?: readonly AuthorityCitation[] | undefined;
  // Optional provenance beyond the pipeline's own arms. When the
  // composition computes discoverability findings (CAP1-REQ-050…053) or
  // authority exposures (CAP1-REQ-046), they render here as the core
  // exposes them; when absent, the page renders the DISCLOSED absence —
  // never a fabricated finding and never a favourable default.
  readonly getDiscoverability?:
    | (() =>
        | readonly DiscoverabilityWithProposal[]
        | Promise<readonly DiscoverabilityWithProposal[]>)
    | undefined;
  readonly getAuthorityExposures?:
    | (() => readonly AuthorityExposure[] | Promise<readonly AuthorityExposure[]>)
    | undefined;
}

// --- HTML escaping -------------------------------------------------------

// Every interpolated value passes through escapeHtml, which the host
// package owns (@syzygy/http-host, syzygy-bpyt.7.3) and this module
// re-exports, as it did when the function was defined here.

function attr(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

// --- Shared page chrome ---------------------------------------------------

// Deliberately colourless: no rule here keys a colour to a state, so no
// Unknown or Gap can ever read as success by styling (VIS-2). Every
// state distinction is text and data-* attributes (CAP1-REQ-064).
const PAGE_STYLE = [
  '<style>',
  'body{font-family:system-ui,sans-serif;margin:2rem auto;max-width:52rem;line-height:1.5;padding:0 1rem}',
  'section{margin:1.5rem 0}',
  'details{border:1px solid currentColor;padding:.5rem;margin:.5rem 0}',
  'summary{cursor:pointer}',
  'dt{font-weight:bold}',
  'code{font-family:ui-monospace,monospace}',
  '</style>',
].join('');

function page(title: string, bodyAttrs: string, body: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    `<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${PAGE_STYLE}</head>`,
    `<body${bodyAttrs}>`,
    body,
    '</body>',
    '</html>',
  ].join('\n');
}

function htmlResponse(body: string): RouteResponse {
  return { status: 200, contentType: 'text/html; charset=utf-8', body };
}

// --- Fact rendering (full disclosure; CAP1-REQ-041/045/064) ---------------

// One served fact as one rendered unit. The epistemic label, Unknown
// reason(s), tier, and freshness each travel BOTH as literal text and as
// a data-* attribute on the unit itself — machine-readable, recoverable
// without colour, position, or layout (CAP1-REQ-045/064; RFC7-33/34).
function renderFact(fact: ServedFact): string {
  const attrs: string[] = [attr('data-fact-name', fact.name)];
  for (const distinction of extractDistinctions(fact)) {
    // Distinction names are the core's closed spellings — already valid
    // kebab-case attribute suffixes.
    attrs.push(attr(`data-${distinction.name}`, distinction.value));
  }
  if (fact.epistemic.label === 'Unknown' && 'basis' in fact.epistemic) {
    attrs.push(attr('data-unknown-basis', fact.epistemic.basis));
  }

  const parts: string[] = [
    `<span class="fact-name">${escapeHtml(fact.name)}</span>: `,
    `<span class="fact-value">${escapeHtml(fact.value)}</span> `,
    `<span class="fact-label">[${escapeHtml(fact.epistemic.label)}]</span>`,
  ];
  if (fact.epistemic.label === 'Unknown' && 'reasons' in fact.epistemic) {
    const { primary, secondary } = fact.epistemic.reasons;
    parts.push(
      ` <span class="fact-reason">(reason: ${escapeHtml(primary)}` +
        (secondary.length > 0
          ? `; secondary: ${escapeHtml(secondary.join(', '))}`
          : '') +
        ')</span>',
    );
  }
  if (fact.epistemic.label === 'Unknown' && 'basis' in fact.epistemic) {
    parts.push(` <span class="fact-basis">(basis: ${escapeHtml(fact.epistemic.basis)})</span>`);
  }
  return `<li${attrs.join('')}>${parts.join('')}</li>`;
}

// Renders EVERY section the core human view carries — the presentation
// sections plus the 'Further facts' full-disclosure section. There is no
// filter here: a fact core renderHuman yields is a fact this page shows
// (CAP1-REQ-041; RFC6-21 — minimal display never subtracts facts).
function renderDisclosureSections(view: HumanView): string {
  return view.sections
    .map(
      (section) =>
        `<section class="disclosure"${attr('data-section-heading', section.heading)}>` +
        `<h2>${escapeHtml(section.heading)}</h2>` +
        `<ul>${section.facts.map(renderFact).join('')}</ul>` +
        '</section>',
    )
    .join('\n');
}

// --- The "Why this answer?" drawer (CAP1-REQ-040/044) ---------------------

type EvaluatedArm = Extract<ProjectEvaluation, { kind: 'project-evaluated' }>;

// Builds one answer's explanation fact set FROM THE EVALUATION'S OWN
// PROVENANCE — the served fact's epistemic state, its Unknown reasons
// verbatim, and the coverage-and-consent boundary the pipeline computed.
// No class outside the accepted contract's list is invented; classes the
// provenance does not carry stay absent and render as absent
// (CAP1-REQ-040: "No field outside the accepted contract's classes is
// invented").
function explanationFor(
  evaluation: EvaluatedArm,
  servedFact: ServedFact | undefined,
): ExplanationFactSet {
  const epistemic = servedFact?.epistemic;
  return {
    selection: evaluation.model.selection,
    evaluation: evaluation.model.evaluation,
    scenarioContext: evaluation.model.scenarioContext,
    evidenceClassification: epistemic,
    unknownReasons:
      epistemic !== undefined && epistemic.label === 'Unknown' && 'reasons' in epistemic
        ? epistemic.reasons
        : undefined,
    coverageAndConsentBoundary: coverageBoundary(evaluation.coverage),
  };
}

// The internal identifiers this evaluation can resolve: its declared
// repositories and its actually-loaded consent records. Used to follow
// every drawer reference and disclose the remainder BY NAME — a sweep
// with a denominator, never a bare boolean (verification rule 9).
function knownReferences(evaluation: EvaluatedArm): ReadonlySet<string> {
  const known = new Set<string>();
  for (const entry of evaluation.declarationObservation.result.ok
    ? evaluation.declarationObservation.result.declaration.repositories
    : []) {
    known.add(entry.id);
  }
  for (const input of evaluation.capture.consentInputs) {
    if (input.artifact.state === 'loaded') known.add(input.artifact.record.id);
  }
  return known;
}

// CAP1-REQ-046 v1.0: the consent decision per repository, as text — the
// same tuple the machine answer carries (`consentDecisionTuple`), each
// field readable without colour, position or hover, inside the
// keyboard-reachable explanation (a native <details>).
export const CONSENT_EFFECT_DISCLAIMER =
  'Consent authorizes observation only; it is not evidence that any effect succeeded.';

function renderConsentDecisions(evaluation: EvaluatedArm): string {
  const id = evaluationId(evaluation.model.evaluation);
  const items = evaluation.consentDecisions.map((decision) => {
    const tuple = consentDecisionTuple(decision);
    const base =
      attr('data-consent-decision', tuple.repositoryId) +
      attr('data-consent-reference', tuple.reference) +
      attr('data-consent-authorization', tuple.authorization) +
      attr('data-evaluation-id', id);
    if (tuple.authorization === 'admitted') {
      const a1 =
        tuple.a1AuditRecord === null || typeof tuple.a1AuditRecord === 'string'
          ? 'explicitly absent'
          : `${tuple.a1AuditRecord.id} (${tuple.a1AuditRecord.digest})`;
      return (
        `<li${base}${attr('data-consent-provenance', tuple.provenance ?? '')}>` +
        `${escapeHtml(tuple.repositoryId)}: observation admitted — provenance ${escapeHtml(tuple.provenance ?? '')}; ` +
        `consent artifact ${escapeHtml(tuple.artifactId ?? '')} (${escapeHtml(tuple.artifactDigest ?? '')}); ` +
        `owner act ${escapeHtml(tuple.actId ?? '')} (${escapeHtml(tuple.actRecordDigest ?? '')}) by ${escapeHtml(tuple.owner ?? '')} at ${escapeHtml(tuple.actInstant ?? '')}, scope ${escapeHtml(tuple.scope ?? '')}; ` +
        `A1 audit identity: ${escapeHtml(a1)}; evaluation ${escapeHtml(id)}.</li>`
      );
    }
    const untrusted = tuple.untrustedRecord;
    const untrustedText =
      untrusted === null
        ? ''
        : ` Recorded consent ${escapeHtml(untrusted.recordId)} (${escapeHtml(untrusted.artifactDigest)}) — untrusted content, not honored: project ${escapeHtml(untrusted.projectId)}, repository ${escapeHtml(untrusted.repositoryId)}, scope ${escapeHtml(untrusted.scope)}, attribution ${escapeHtml(untrusted.attribution)}, grant state ${escapeHtml(untrusted.grantState)}.`;
    return (
      `<li${base}${attr('data-epistemic-label', 'Unknown')}${attr('data-unknown-reason', tuple.reason ?? '')}${attr('data-consent-diagnostic', tuple.diagnostic ?? '')}${attr('data-consent-diagnostic-reference', tuple.diagnosticReference ?? '')}${attr('data-resolution-route', tuple.route ?? '')}>` +
      `${escapeHtml(tuple.repositoryId)}: authorization Unknown — reason ${escapeHtml(tuple.reason ?? '')}; diagnostic ${escapeHtml(tuple.diagnostic ?? '')} (reference ${escapeHtml(tuple.diagnosticReference ?? '')}); route ${escapeHtml(tuple.route ?? '')}; evaluation ${escapeHtml(id)}.` +
      `${untrustedText}</li>`
    );
  });
  return `<ul>${items.join('')}</ul><p>${escapeHtml(CONSENT_EFFECT_DISCLAIMER)}</p>`;
}

function renderDrawer(evaluation: EvaluatedArm, answer: FacetAnswer): string {
  const servedFact = evaluation.model.facts.find((fact) => fact.name === answer.name);
  const factSet = explanationFor(evaluation, servedFact);
  const serving = explainAnswer(factSet);

  if (!serving.served) {
    // Unreachable for an evaluated project (the fact set above is always
    // constructible), but the arm renders honestly if ever reached: the
    // literal Unknown with its verbatim reasons, nothing more favourable
    // (CAP1-REQ-044 — the unavailable arm cannot carry a summary).
    return (
      `<details${attr('data-explains', answer.name)}${attr('data-explanation-served', 'false')}>` +
      `<summary>Why this answer?</summary>` +
      `<p data-epistemic-label="Unknown">${escapeHtml(serving.value)} ` +
      `(reason: ${escapeHtml(serving.reasons.primary)})</p></details>`
    );
  }

  const known = knownReferences(evaluation);
  const resolution = resolveExplanationReferences(factSet, (reference) => known.has(reference));
  const classes = presentClasses(factSet);
  const boundary = factSet.coverageAndConsentBoundary;

  const rows: string[] = [];
  rows.push(
    `<dt>Evaluation identity</dt><dd${attr('data-evaluation-snapshot', factSet.evaluation.snapshot)}${attr('data-evaluation-as-of', factSet.evaluation.asOf)}>snapshot <code>${escapeHtml(factSet.evaluation.snapshot)}</code>, as of <code>${escapeHtml(factSet.evaluation.asOf)}</code></dd>`,
  );
  rows.push(`<dt>Selection</dt><dd>${escapeHtml(factSet.selection)}</dd>`);
  rows.push(`<dt>Scenario context</dt><dd>${escapeHtml(factSet.scenarioContext)}</dd>`);
  if (factSet.evidenceClassification !== undefined) {
    const classification = factSet.evidenceClassification;
    rows.push(
      `<dt>Evidence classification</dt><dd${attr('data-epistemic-label', classification.label)}>label ${escapeHtml(classification.label)}` +
        (classification.tier !== undefined ? `, tier ${escapeHtml(classification.tier)}` : '') +
        (classification.freshness !== undefined
          ? `, freshness ${escapeHtml(classification.freshness)}`
          : '') +
        '</dd>',
    );
  }
  if (factSet.unknownReasons !== undefined) {
    rows.push(
      `<dt>Unknown reasons</dt><dd${attr('data-unknown-reason-primary', factSet.unknownReasons.primary)}>primary: ${escapeHtml(factSet.unknownReasons.primary)}; secondary: [${escapeHtml(factSet.unknownReasons.secondary.join(', '))}]</dd>`,
    );
  }
  rows.push(
    `<dt>Consent decisions</dt><dd>${renderConsentDecisions(evaluation)}</dd>`,
  );
  if (boundary !== undefined) {
    rows.push(
      `<dt>Coverage and consent boundary</dt><dd>${boundary.records
        .map((record) => renderBoundaryRecord(record))
        .join('')}</dd>`,
    );
  }
  // The answer's own constituent facts — REQ-033's observable, cited in
  // the drawer: scope, producing evaluation, facts, and stated basis.
  rows.push(
    `<dt>Constituent facts (scope ${escapeHtml(answer.factSet.scope)})</dt>` +
      `<dd><ul>${answer.factSet.facts
        .map(
          (fact) =>
            `<li${attr('data-constituent-fact', fact.name)}>${escapeHtml(fact.name)}: ${escapeHtml(fact.value)}</li>`,
        )
        .join('')}</ul>` +
      `<p>Stated basis: ${escapeHtml(answer.factSet.basis.join(', '))}</p></dd>`,
  );
  rows.push(
    `<dt>Explanation classes present</dt><dd${attr('data-present-classes', classes.join(' '))}>${escapeHtml(classes.join(', '))}</dd>`,
  );
  rows.push(
    `<dt>Internal references</dt><dd${attr('data-reference-count', String(resolution.references.length))}${attr('data-unresolved-count', String(resolution.unresolved.length))}>` +
      `${resolution.references.length} followed; unresolved: ` +
      (resolution.unresolved.length === 0
        ? 'none of the followed set'
        : escapeHtml(resolution.unresolved.join(', '))) +
      '</dd>',
  );

  return (
    `<details${attr('data-explains', answer.name)}${attr('data-explanation-served', 'true')}>` +
    `<summary>${escapeHtml(serving.name)}</summary>` +
    `<dl>${rows.join('')}</dl>` +
    '</details>'
  );
}

// --- Coverage and consent (CAP1-REQ-010…016 exposure on the page) ----------

// One coverage row: every field of the core `RepositoryCoverage` entry
// travels as a data-* attribute on the row AND as literal text, so the
// whole tuple is recoverable without colour, position or hover
// (CAP1-REQ-064) and the machine channel's `coverageBoundary` row can be
// compared to it field by field (CAP1-REQ-041). Scope, attribution and grant
// state render with the boundary (CAP1-REQ-011).
function citationAttrs(citation: ConsentCitation): string {
  return (
    attr('data-consent-record-reference', citation.reference) +
    attr('data-consent-record-id', citation.recordId) +
    attr('data-consent-record-digest', citation.artifactDigest) +
    attr('data-consent-scope', citation.scope) +
    attr('data-consent-attribution', citation.attribution) +
    attr('data-consent-grant-state', citation.grantState) +
    attr('data-consent-provenance', citation.provenance)
  );
}

function citationText(citation: ConsentCitation): string {
  return (
    `consent record ${escapeHtml(citation.recordId)} (${escapeHtml(citation.artifactDigest)}) via reference ${escapeHtml(citation.reference)}: ` +
    `scope ${escapeHtml(citation.scope)}, attribution ${escapeHtml(citation.attribution)}, grant state ${escapeHtml(citation.grantState)}, provenance ${escapeHtml(citation.provenance)}`
  );
}

function untrustedAttrs(view: UntrustedConsentRecordView | null): string {
  if (view === null) return '';
  return (
    attr('data-untrusted-trust', view.trust) +
    attr('data-untrusted-record-id', view.recordId) +
    attr('data-untrusted-record-digest', view.artifactDigest) +
    attr('data-untrusted-project-id', view.projectId) +
    attr('data-untrusted-repository-id', view.repositoryId) +
    attr('data-untrusted-scope', view.scope) +
    attr('data-untrusted-attribution', view.attribution) +
    attr('data-untrusted-grant-state', view.grantState)
  );
}

function untrustedText(view: UntrustedConsentRecordView | null): string {
  if (view === null) return '';
  return (
    ` Recorded consent ${escapeHtml(view.recordId)} (${escapeHtml(view.artifactDigest)}) — ${escapeHtml(view.trust)}, not honored: ` +
    `project ${escapeHtml(view.projectId)}, repository ${escapeHtml(view.repositoryId)}, scope ${escapeHtml(view.scope)}, attribution ${escapeHtml(view.attribution)}, grant state ${escapeHtml(view.grantState)}.`
  );
}

function coverageRow(attrs: string, text: string): string {
  return `<span class="coverage-record"${attrs}>${text}</span> `;
}

function renderBoundaryRecord(record: RepositoryCoverage): string {
  const base =
    attr('data-repository-id', record.repositoryId) + attr('data-coverage-state', record.state);
  const repo = escapeHtml(record.repositoryId);
  switch (record.state) {
    case 'observed':
      return coverageRow(
        base +
          attr('data-consent-state', record.consent.grantState) +
          attr('data-captured-scope', record.capturedScope) +
          citationAttrs(record.consent),
        `${repo}: observed; captured scope ${escapeHtml(record.capturedScope)}; ${citationText(record.consent)}`,
      );
    case 'unconsented': {
      const unknown =
        attr('data-epistemic-label', record.label) +
        attr('data-unknown-reason', record.reason) +
        attr('data-presentation', record.presentation) +
        attr('data-policy-resolution-route', record.resolutionRoute) +
        attr('data-coverage-basis', record.basis) +
        attr('data-consent-reference', record.reference) +
        attr('data-resolution-route', record.route);
      const lead =
        `${repo}: ${escapeHtml(record.label)} — ${escapeHtml(record.reason)} (a standing policy state; resolution route: ${escapeHtml(record.resolutionRoute)}). ` +
        `Declared consent reference ${escapeHtml(record.reference)}; `;
      if (record.basis === 'withdrawn') {
        // R-S2 finding #4: a withdrawn pair cites WHICH withdrawal record
        // defeated the grant.
        return coverageRow(
          base +
            attr('data-consent-state', 'unconsented') +
            unknown +
            attr('data-withdrawn-record-id', record.consent.recordId) +
            citationAttrs(record.consent) +
            untrustedAttrs(record.untrustedRecord),
          `${lead}withdrawn by ${citationText(record.consent)}; route ${escapeHtml(record.route)}.${untrustedText(record.untrustedRecord)}`,
        );
      }
      return coverageRow(
        base +
          attr('data-consent-state', 'unconsented') +
          unknown +
          attr('data-consent-diagnostic', record.diagnostic) +
          attr('data-consent-diagnostic-reference', record.diagnosticReference) +
          untrustedAttrs(record.untrustedRecord),
        `${lead}diagnostic ${escapeHtml(record.diagnostic)} (reference ${escapeHtml(record.diagnosticReference)}); route ${escapeHtml(record.route)}.${untrustedText(record.untrustedRecord)}`,
      );
    }
    case 'capture-failed':
    case 'stale':
      return coverageRow(
        base +
          attr('data-consent-state', record.consent.grantState) +
          attr('data-epistemic-label', record.label) +
          attr('data-unknown-reason', record.reason) +
          citationAttrs(record.consent),
        `${repo}: ${escapeHtml(record.label)} — ${escapeHtml(record.reason)}; ${citationText(record.consent)}`,
      );
    case 'degraded-partial':
      return coverageRow(
        base +
          attr('data-consent-state', record.consent.grantState) +
          attr('data-captured-scope', record.capturedScope) +
          attr('data-declared-scope', record.declaredScope) +
          attr('data-uncaptured-label', record.uncaptured.label) +
          attr('data-uncaptured-reason', record.uncaptured.reason) +
          citationAttrs(record.consent),
        `${repo}: partial — captured ${escapeHtml(record.capturedScope)} of ${escapeHtml(record.declaredScope)}; remainder ${escapeHtml(record.uncaptured.label)} (${escapeHtml(record.uncaptured.reason)}); ${citationText(record.consent)}`,
      );
  }
}

// --- Optional provenance sections (CAP1-REQ-046, 050…053) -------------------

function renderAuthoritySection(exposures: readonly AuthorityExposure[] | undefined): string {
  if (exposures === undefined || exposures.length === 0) {
    // Disclosed absence — a fact of the render, never a fabricated
    // exposure and never silence (VIS-2).
    return (
      '<section class="authority" data-section="authority-exposure">' +
      '<h2>Authority exposure</h2>' +
      '<p data-state="absent">No authority exposures were supplied at this evaluation.</p>' +
      '</section>'
    );
  }
  const items = exposures
    .map((exposure) => {
      // Stamp and effective status: two SEPARATE attributes and two
      // separate text spans, readable apart (CAP1-REQ-046) — never one
      // merged field. Where they disagree the disagreement is a
      // disclosed fact with the effective status governing.
      const disagreement =
        exposure.disagreement === undefined
          ? ''
          : `<span class="disagreement" data-disagreement-disclosed="true">disagreement disclosed: stamp says ${escapeHtml(exposure.disagreement.stamp)}, effective status is ${escapeHtml(exposure.disagreement.effectiveStatus)} — the effective status governs</span>`;
      const basis =
        typeof exposure.effectiveBasis === 'string'
          ? escapeHtml(exposure.effectiveBasis)
          : `record ${escapeHtml(exposure.effectiveBasis.recordId)} (${escapeHtml(exposure.effectiveBasis.provenanceState)})`;
      return (
        `<li${attr('data-artifact-id', exposure.artifactId)}${attr('data-self-declared-stamp', exposure.selfDeclaredStamp)}${attr('data-effective-status', exposure.effectiveStatus)}${attr('data-governs', exposure.governs)}>` +
        `${escapeHtml(exposure.artifactId)} — owning authority ${escapeHtml(exposure.owningAuthority.authority)} at ${escapeHtml(exposure.owningAuthority.governingRevision)}; ` +
        `self-declared stamp: <span class="stamp">${escapeHtml(exposure.selfDeclaredStamp)}</span>; ` +
        `effective status: <span class="effective">${escapeHtml(exposure.effectiveStatus)}</span> (basis: ${basis}). ` +
        disagreement +
        '</li>'
      );
    })
    .join('');
  return (
    '<section class="authority" data-section="authority-exposure">' +
    '<h2>Authority exposure</h2>' +
    `<ul>${items}</ul>` +
    '</section>'
  );
}

function renderDiscoverabilitySection(
  findings: readonly DiscoverabilityWithProposal[] | undefined,
): string {
  if (findings === undefined || findings.length === 0) {
    return (
      '<section class="discoverability" data-section="discoverability">' +
      '<h2>Repository discoverability</h2>' +
      '<p data-state="absent">No discoverability findings were supplied at this evaluation.</p>' +
      '</section>'
    );
  }
  const items = findings
    .map((entry) => {
      const finding = entry.current;
      const findingAttrs =
        attr('data-repository-id', finding.repositoryId) +
        attr('data-discoverability-value', finding.value) +
        attr('data-epistemic-label', finding.epistemic.label) +
        (finding.basis !== undefined ? attr('data-basis', finding.basis) : '');
      // A proposal renders BESIDE the finding as proposed material,
      // machine-readably distinct, never as an applied change and never
      // improving the finding (CAP1-REQ-053).
      const proposals = entry.proposed
        .map(
          (proposal) =>
            `<span class="proposal"${attr('data-proposal-id', proposal.proposalId)}${attr('data-proposed-vs-current', proposal.marking)}${attr('data-adopted-vs-unadopted', String(proposal.adopted))}${attr('data-status-authority', proposal.statusAuthority)}>` +
            `proposed (unapplied): ${escapeHtml(proposal.subject)}</span>`,
        )
        .join(' ');
      return (
        `<li${findingAttrs}>${escapeHtml(finding.repositoryId)}: ${escapeHtml(finding.value)} [${escapeHtml(finding.epistemic.label)}]` +
        (finding.basis !== undefined ? ` (basis: ${escapeHtml(finding.basis)})` : '') +
        (proposals.length > 0 ? ` ${proposals}` : '') +
        '</li>'
      );
    })
    .join('');
  return (
    '<section class="discoverability" data-section="discoverability">' +
    '<h2>Repository discoverability</h2>' +
    `<ul>${items}</ul>` +
    '</section>'
  );
}

// --- The project page -------------------------------------------------------

function renderEvaluatedPage(
  evaluation: EvaluatedArm,
  discoverability: readonly DiscoverabilityWithProposal[] | undefined,
  authorityExposures: readonly AuthorityExposure[] | undefined,
): string {
  // ONE fact model, rendered by the unchanged core renderer. No
  // presentation spec is passed: core's own full-disclosure guarantee
  // then routes every fact into the 'Further facts' section — the
  // full-disclosure sweep target — and this page renders every section
  // the view carries, whatever a future presentation assigns.
  const view = renderHuman(evaluation.model);
  const entryRoute = serveEntryRoute(evaluation.projectId);

  const header =
    '<header>' +
    `<h1>Project ${escapeHtml(String(evaluation.projectId))}</h1>` +
    `<p${attr('data-selection', view.selection)}${attr('data-scenario-context', view.scenarioContext)}${attr('data-evaluation-snapshot', view.evaluation.snapshot)}${attr('data-evaluation-as-of', view.evaluation.asOf)}>` +
    `Selection <code>${escapeHtml(view.selection)}</code>, evaluated at snapshot <code>${escapeHtml(view.evaluation.snapshot)}</code> as of <code>${escapeHtml(view.evaluation.asOf)}</code>, scenario context <code>${escapeHtml(view.scenarioContext)}</code>.</p>` +
    '<p data-artifact-class="presentation-artifact" data-non-citable="true">This page is a generated presentation artifact — never a citable basis for any fact it renders.</p>' +
    '</header>';

  // The seven shape answers, each independently rendered with its value,
  // verbatim epistemic label, verbatim Unknown reasons, and its own
  // "Why this answer?" drawer (CAP1-REQ-030/034/035/040).
  const answers = evaluation.answers.answers
    .map((answer) => {
      const servedFact = evaluation.model.facts.find((fact) => fact.name === answer.name);
      const label = servedFact?.epistemic.label ?? 'Unknown';
      const render = answer.render;
      const reasonText =
        render.value === 'Unknown' && 'reasons' in render
          ? `<p class="answer-reason"${attr('data-unknown-reason-primary', render.reasons.primary)}>reason: ${escapeHtml(render.reasons.primary)}${render.reasons.secondary.length > 0 ? `; secondary: ${escapeHtml(render.reasons.secondary.join(', '))}` : ''}</p>`
          : '';
      const deferredText =
        render.value === 'not evaluated' && 'basis' in render
          ? `<p class="answer-basis" data-unknown-basis="deferred">basis: ${escapeHtml(render.basis)}</p>`
          : '';
      return (
        `<article class="answer"${attr('data-answer-name', answer.name)}${attr('data-answer-value', render.value)}${attr('data-epistemic-label', label)}>` +
        `<h3>${escapeHtml(answer.name)}</h3>` +
        `<p>Answer: <span class="answer-value">${escapeHtml(render.value)}</span> <span class="answer-label">[${escapeHtml(label)}]</span></p>` +
        reasonText +
        deferredText +
        renderDrawer(evaluation, answer) +
        '</article>'
      );
    })
    .join('\n');

  // The one honest aggregate over the answers: membership count and full
  // epistemic composition disclosed, expandable to members, carrying NO
  // epistemic state of its own (CAP1-REQ-044/031; RFC6-17).
  const agg = aggregate(evaluation.model.facts);
  const aggregateSection =
    `<details class="aggregate"${attr('data-membership-count', String(agg.composition.membershipCount))}>` +
    `<summary>Aggregate composition over ${agg.composition.membershipCount} answers: ${agg.composition.byLabel
      .map((entry) => `${escapeHtml(entry.label)} ${entry.count}`)
      .join(', ')}</summary>` +
    `<p>Per-primary-reason: ${
      agg.composition.byPrimaryReason.length === 0
        ? 'none'
        : agg.composition.byPrimaryReason
            .map((entry) => `${escapeHtml(entry.reason)} ${entry.count}`)
            .join(', ')
    }. Secondary annotations (disclosed separately, never folded in): ${
      agg.composition.secondaryReasons.length === 0
        ? 'none'
        : agg.composition.secondaryReasons
            .map((entry) => `${escapeHtml(entry.reason)} ${entry.count}`)
            .join(', ')
    }.</p>` +
    `<ul>${agg.members.map(renderFact).join('')}</ul>` +
    '</details>';

  const coverageSection =
    '<section class="coverage" data-section="coverage-and-consent">' +
    '<h2>Coverage and consent</h2>' +
    `<ul>${evaluation.coverage.repositories
      .map((record) => `<li>${renderBoundaryRecord(record)}</li>`)
      .join('')}</ul>` +
    '</section>';

  // Human entry discoverability from this page (CAP1-REQ-020): the ONE
  // fixed entry, linked, its publication path rendered verbatim, never
  // an identity — and no second front door is offered.
  const entrySection =
    '<section class="entry" data-section="human-entry">' +
    '<h2>Human entry</h2>' +
    `<p${attr('data-entry-path', entryRoute.path)}${attr('data-entry-path-is-identity', String(entryRoute.isIdentity))}>` +
    `The project's one human entry is published at <code>${escapeHtml(entryRoute.path)}</code> ` +
    `(a publication location, never an identity) — <a href="${escapeHtml(HUMAN_ENTRY_ROUTE_PATH)}">read the entry document</a>.</p>` +
    '</section>';

  const body = [
    header,
    '<section class="answers" data-section="shape-answers"><h2>The seven shape answers</h2>',
    answers,
    aggregateSection,
    '</section>',
    renderDisclosureSections(view),
    coverageSection,
    renderAuthoritySection(authorityExposures),
    renderDiscoverabilitySection(discoverability),
    entrySection,
  ].join('\n');

  return page(
    `Project ${String(evaluation.projectId)} — served facts`,
    attr('data-evaluation-kind', evaluation.kind) +
      ' data-non-citable="true" data-artifact-class="presentation-artifact"',
    body,
  );
}

// The two degraded arms render their NAMED states — verbatim labels,
// verbatim reasons, named validation failures — never a fake page,
// never a favourable summary, and never a shape answer that was not
// computed (VIS-2; CAP1-REQ-022's honesty discipline applied to the
// page itself).
function renderDegradedPage(
  evaluation: Exclude<ProjectEvaluation, EvaluatedArm>,
): string {
  if (evaluation.kind === 'capture-failed') {
    const failure = evaluation.failure;
    const changed =
      failure.kind === 'source-changed-during-capture'
        ? `<ul class="changed">${failure.changed
            .map(
              (input) =>
                `<li${attr('data-changed-kind', input.kind)}${attr('data-changed-subject', input.subjectId)}>${escapeHtml(input.kind)}: ${escapeHtml(input.subjectId)}</li>`,
            )
            .join('')}</ul>`
        : '';
    const body =
      '<header><h1>No project evaluated</h1></header>' +
      '<section data-section="degradation">' +
      `<p${attr('data-capture-failure', failure.kind)} data-epistemic-label="Unknown">` +
      `The capture failed (${escapeHtml(failure.kind)}); nothing was evaluated and no partial snapshot is served. Nothing is retried.</p>` +
      changed +
      '</section>';
    return page(
      'No project evaluated',
      attr('data-evaluation-kind', evaluation.kind) +
        ' data-non-citable="true" data-artifact-class="presentation-artifact"',
      body,
    );
  }

  if (evaluation.kind === 'no-declaration-observed') {
    const observation = evaluation.declarationObservation;
    const body =
      '<header><h1>No project evaluated</h1></header>' +
      `<section data-section="degradation">` +
      `<p${attr('data-observation-kind', observation.kind)}${attr('data-epistemic-label', observation.label)}${attr('data-unknown-reason', observation.reason)}>` +
      `Declaration at <code>${escapeHtml(observation.relativePath)}</code>: ${escapeHtml(observation.label)} — reason: ${escapeHtml(observation.reason)}.</p>` +
      '<p>No shape answers are served: nothing was evaluated, and absence of evidence is never rendered as success.</p>' +
      '</section>';
    return page(
      'No project evaluated',
      attr('data-evaluation-kind', evaluation.kind) +
        ' data-non-citable="true" data-artifact-class="presentation-artifact"',
      body,
    );
  }

  const failures = evaluation.failures
    .map(
      (failure) =>
        `<li${attr('data-failure-kind', failure.kind)}>` +
        `${escapeHtml(failure.kind)}${failure.field !== undefined ? ` (${escapeHtml(failure.field)})` : ''}: ${escapeHtml(failure.detail)}</li>`,
    )
    .join('');
  const body =
    '<header><h1>Declaration read but invalid</h1></header>' +
    '<section data-section="degradation">' +
    '<p>The declaration was read but did not validate; registration failed and no shape answers are served for an unregistered project. The named failures:</p>' +
    `<ul class="failures">${failures}</ul>` +
    '</section>';
  return page(
    'Declaration invalid',
    attr('data-evaluation-kind', evaluation.kind) +
      ' data-non-citable="true" data-artifact-class="presentation-artifact"',
    body,
  );
}

// --- The entry document route (CAP1-REQ-020…023) ---------------------------

// The entry as the evaluation's capture holds it. The capture read the
// entry only when the governance root's consent was admitted (CAP1-REQ-016);
// otherwise the entry is Unknown for that reason — never re-read here.
function entrySourceFrom(evaluation: ProjectEvaluation): EntrySourceRead {
  if (evaluation.kind === 'capture-failed') {
    return { state: 'unreadable', reason: evaluation.failure.kind };
  }
  const entry = evaluation.capture.entry;
  switch (entry.state) {
    case 'captured':
      return { state: 'present', text: entry.text };
    case 'missing':
      return { state: 'absent' };
    case 'unreadable':
      return { state: 'unreadable', reason: entry.failureCode };
    case 'not-read':
      return { state: 'unreadable', reason: 'unconsented-source-or-provider' };
  }
}

function entryContentFrom(read: EntrySourceRead): EntryContent {
  switch (read.state) {
    case 'present':
      return { state: 'present', text: read.text };
    case 'absent':
      return { state: 'absent' };
    case 'unreadable':
      return { state: 'unreadable', reason: read.reason };
  }
}

function renderEntryPage(
  read: EntrySourceRead,
  authorities: readonly AuthorityCitation[],
): string {
  const rendering = renderEntry(entryContentFrom(read), authorities);
  const assessment = rendering.assessment;

  let contentSection: string;
  switch (rendering.content.state) {
    case 'present':
      // The entry text is observed-file content: untrusted, escaped, and
      // served as preformatted text — the daemon renders no markup FROM
      // the file (no client-side or server-side interpretation of
      // untrusted content as HTML).
      contentSection =
        `<section data-section="entry-content" data-entry-state="present">` +
        `<pre class="entry-text">${escapeHtml(rendering.content.text)}</pre></section>`;
      break;
    case 'absent':
      contentSection =
        '<section data-section="entry-content" data-entry-state="absent">' +
        `<p${attr('data-assessment-kind', assessment.kind)}>` +
        `The entry document is absent — a finding${assessment.kind === 'finding' ? ` (${escapeHtml(assessment.detail)})` : ''}, rendered as such, never a silently missing page.</p></section>`;
      break;
    case 'unreadable':
      contentSection =
        '<section data-section="entry-content" data-entry-state="unreadable">' +
        `<p data-epistemic-label="Unknown"${attr('data-assessment-kind', assessment.kind)}>` +
        `The entry document is unreadable: Unknown — reason: ${escapeHtml(rendering.content.reason)}.</p></section>`;
      break;
    case 'stale':
    case 'contradictory':
      // Both sides render, the authority governing — disclosed, never
      // silently reconciled (CAP1-REQ-022). The daemon's entry reader
      // does not mint these arms today; the renderer stays total.
      contentSection =
        `<section data-section="entry-content"${attr('data-entry-state', rendering.content.state)}>` +
        `<p${attr('data-assessment-kind', assessment.kind)} data-authority-wins="true">Disagreement disclosed — the authority governs.</p>` +
        `<pre class="authority-text">${escapeHtml(rendering.content.authorityText)}</pre>` +
        `<pre class="entry-text">${escapeHtml(rendering.content.entryText)}</pre></section>`;
      break;
  }

  const citations =
    authorities.length === 0
      ? '<p data-state="absent">No authority citations were supplied for this entry.</p>'
      : `<ul>${authorities
          .map(
            (citation) =>
              `<li${attr('data-authority-identifier', citation.identifier)}${attr('data-authority-kind', citation.kind)}>${escapeHtml(citation.identifier)} (${escapeHtml(citation.kind)})</li>`,
          )
          .join('')}</ul>`;

  const body =
    '<header>' +
    '<h1>Human entry</h1>' +
    `<p${attr('data-entry-path', HUMAN_ENTRY_PATH)} data-entry-path-is-identity="false">Published at <code>${escapeHtml(HUMAN_ENTRY_PATH)}</code> — a publication location, never an identity.</p>` +
    `<p data-non-citable="true" data-artifact-class="presentation-artifact">This entry is governed presentation: non-citable, a presentation artifact, never the source of any project fact.</p>` +
    '</header>' +
    contentSection +
    '<section data-section="entry-authorities"><h2>Routes to authority</h2>' +
    citations +
    '</section>';

  return page(
    'Human entry',
    ' data-non-citable="true" data-artifact-class="presentation-artifact"' +
      attr('data-entry-state', rendering.content.state),
    body,
  );
}

// --- The route factory -------------------------------------------------------

/**
 * The RT5 human-open routes: `GET /` (the server-rendered project page,
 * replacing the RT3 minimal root route at composition time) and
 * `GET /entry` (the human entry document). Both render exclusively from
 * the injected evaluation source and entry reader — the module holds no
 * filesystem, clock, or randomness of its own.
 */
export function humanRoutes(deps: HumanRouteDependencies): Route[] {
  return [
    {
      method: 'GET',
      path: HUMAN_PAGE_PATH,
      credentialClass: 'human-open',
      async handle(): Promise<RouteResponse> {
        const evaluation = await deps.getEvaluation();
        if (evaluation.kind !== 'project-evaluated') {
          return htmlResponse(renderDegradedPage(evaluation));
        }
        const discoverability =
          deps.getDiscoverability === undefined ? undefined : await deps.getDiscoverability();
        const authorityExposures =
          deps.getAuthorityExposures === undefined
            ? undefined
            : await deps.getAuthorityExposures();
        return htmlResponse(
          renderEvaluatedPage(evaluation, discoverability, authorityExposures),
        );
      },
    },
    {
      method: 'GET',
      path: HUMAN_ENTRY_ROUTE_PATH,
      credentialClass: 'human-open',
      async handle(): Promise<RouteResponse> {
        const evaluation = await deps.getEvaluation();
        return htmlResponse(
          renderEntryPage(entrySourceFrom(evaluation), deps.entryAuthorities ?? []),
        );
      },
    },
  ];
}

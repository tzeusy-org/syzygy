import { escapeHtml } from '@syzygy/http-host';
import {
  WORK_ITEM_GOVERNING_INTENT_REGION_ID,
  WORK_ITEM_TITLES_REGION_ID,
  WORK_ITEM_VERIFICATION_REGION_ID,
  WORK_ITEMS_REGION_ID,
  STATUS_TO_COLUMN,
  parseTrajectoryView,
  projectTrajectoryView,
  workerChangeVerificationId,
  type TrajectoryNarrowing,
  type TrajectoryEligibility,
  type TrajectoryEligibilityReason,
  groupAnchor,
  type TrajectoryGroupSlice,
  type TrajectoryGrouping,
  type TrajectoryItemEligibility,
  type TrajectoryViewRefusal,
  type TrajectoryViewRequest,
  type PocModel,
  type PocUnknown,
  type WorkerChangeObserved,
  CHANGE_KINDS,
  CHANGE_WINDOWS,
  CHANGE_WINDOW_REASON_TEXT,
  TRAJECTORY_PAGE_SIZE,
  type ChangeWindow,
  type TrajectoryChangeWindow,
  isTitleAdmitted,
  closedItemLanding,
  TRAJECTORY_COMMIT_JOINS_ID,
  type TrajectoryClosedLanding,
  type WorkItemFact,
  type WorkItemTitle,
} from '@syzygy/three-surface-poc-core';
import type { TrajectoryAnswer, TrajectoryAnswerId, TrajectoryColumn, TrajectoryLaneItem, WorkItemStatus } from '@syzygy/three-surface-poc-core';
import type { TestArtifactVerificationResult } from '@syzygy/three-surface-poc-core';

import {
  MATERIALIZE_PANEL_STYLE,
  currentMaterializedBeadId,
  renderMaterializePanel,
} from './materialize-action.js';
import { substrateEvaluationFooter } from './evaluation-footer.js';
import { pageShell, type HumanOperabilityStatus } from './page-shell.js';
import { TAILNET_MOUNT_PREFIX, withMountPrefix } from './tailnet.js';
import { epistemicClassName } from './design-tokens.js';
import { unknownMarker, unknownRoute, unknownSubject } from './unknown-marker.js';
import { TIME_MEASURES_STYLE, timeMeasuresRegion } from './trajectory-time-chart.js';

export const TRAJECTORY_HUMAN_PATH = '/trajectory' as const;
export const TRAJECTORY_TAILNET_PATH = `${TAILNET_MOUNT_PREFIX}/trajectory` as const;

const COLUMN_ORDER: readonly TrajectoryColumn[] = [
  'Backlog',
  'Claimed',
  'Blocked',
  'Deferred',
  'Pinned',
  'Hooked',
  'Closed',
];


const WORKER_CHANGE_STATE_LABEL = {
  planned: 'No commit observed',
  active: 'Commit observed, not on the default branch',
  'changed-or-merged': 'Commit on the default branch',
} as const;

function verificationBadge(
  model: PocModel,
  beadId: string,
  verification: TestArtifactVerificationResult,
  governingIntentId: string | null,
): string {
  // There is no Verified arm: the core resolver has no Verified result,
  // since no record Syzygy reads comes from a run it launched or observed.
  const id = workerChangeVerificationId(beadId);
  const unknown = unknownSubject(model, id);
  if (verification.kind === 'reported' && governingIntentId !== null) {
    // The declared table has Observed and Unknown only (POC-REQ-060). An
    // operator-reported run caps at report-fact (RFC5-19), so it takes the
    // Unknown encoding with the operator's summary and its disclosure,
    // never the Observed one and never the word Verified. The element is the
    // verification relationship, which is Unknown; RFC2-25 places
    // `report-fact` inside Observed, as a fact about the report, so the tier
    // is named only in the text and disclosure, never as this element's
    // tier attribute (#383 round 3, note 4).
    return `<span class="epistemic epistemic-unknown" data-parity-field="worker-change-verification"${unknownMarker(id, unknown)} title="${escapeHtml(verification.disclosure)}">Verification: Not verified by Syzygy — operator-reported (report-fact): ${escapeHtml(verification.record.summary)}. ${escapeHtml(verification.disclosure)} ${unknownRoute(unknown)}</span>`;
  }
  if (verification.kind === 'reported') {
    return `<span class="epistemic epistemic-unknown" data-parity-field="worker-change-verification"${unknownMarker(id, unknown)} title="The captured test artifact has no governing intent identity in this evaluation.">Verification: Unknown — governing intent identity unavailable. ${unknownRoute(unknown)}</span>`;
  }
  return `<span class="epistemic epistemic-unknown" data-parity-field="worker-change-verification"${unknownMarker(id, unknown)} title="${escapeHtml(verification.reason)}">Verification: Not verified. ${unknownRoute(unknown)}</span>`;
}

function workerChangeBadge(
  model: PocModel,
  workerChange: WorkerChangeObserved | null,
  verification: TestArtifactVerificationResult,
  governingIntentId: string | null,
): string {
  if (workerChange === null) {
    return '';
  }
  const label = WORKER_CHANGE_STATE_LABEL[workerChange.state];
  const detail =
    workerChange.state === 'planned'
      ? 'No git activity observed yet on the bounded source seam.'
      : workerChange.commit === null
        ? ''
        : `<code class="wi-id">${escapeHtml(workerChange.commit.sha.slice(0, 12))}</code>${
            workerChange.commit.containingRef.kind === 'ref'
              ? ` on <code class="wi-id">${escapeHtml(workerChange.commit.containingRef.ref)}</code>`
              : ''
          }`;
  return `<div class="worker-change" data-parity-field="worker-change-state">
    <span class="worker-change-label">External worker: ${escapeHtml(label)}</span>
    <span class="worker-change-note">Independent of the Bead status above: this row is the worker-change state observed from git on the bounded seam, not the Beads status.</span>
    ${detail === '' ? '' : `<span class="worker-change-detail">${detail}</span>`}
    ${verificationBadge(model, workerChange.beadId, verification, governingIntentId)}
  </div>`;
}

/** RFC8-2(b), RFC8-15, RFC8-30: closure in the tracker is never completion.
 * One standing sentence, derived from the rendered items (never a constant),
 * says how many are closed and that verification is Unknown for each of them
 * (machine twin: trajectory.rendered[] status 'closed' and verification). It
 * is not a new Unknown disclosure: the verification notice is, and each
 * card's verification mark refers to it. */
function closureNotice(rendered: readonly TrajectoryLaneItem[]): string {
  const closed = rendered.filter((item) => item.status === 'closed');
  const unverified = closed.filter((item) => item.verification === 'unknown').length;
  return `<p class="closure-notice notice" data-parity-field="trajectory-closure-notice">
        <span data-parity-field="trajectory-closed-count">${closed.length}</span> of these items are closed in the tracker. Closed is the tracker's word, not a verification:
        verification is Unknown for <span data-parity-field="trajectory-closed-unverified-count">${unverified}</span> of them, because no test evidence is ingested for a work item, and a commit that names an item shows where it landed, not that it works; the <a href="#n-verification">verification notice</a> gives the reason and route.
      </p>`;
}

/** The element id of each board-level disclosure a card mark refers to. */
const NOTICE_ELEMENT_ID = {
  [WORK_ITEM_TITLES_REGION_ID]: 'n-titles',
  [WORK_ITEM_GOVERNING_INTENT_REGION_ID]: 'n-intent',
  [WORK_ITEM_VERIFICATION_REGION_ID]: 'n-verification',
  [WORK_ITEMS_REGION_ID]: 'n-work-items',
  [TRAJECTORY_COMMIT_JOINS_ID]: 'n-commit-joins',
} as const;

type BoardDisclosureId = keyof typeof NOTICE_ELEMENT_ID;

/** syzygy-t3jk.15: a card's mark for an Unknown its board discloses once.
 * It keeps the encoding class, its parity field, the closed reason and its
 * label; it names the board disclosure (`data-unknown-ref`) and links to
 * it, where the reason sentence and route stand with their count. It reads
 * nothing per item from `model.unknownSubjects`, so it renders for any
 * served item. */
function cardMark(field: string, ref: BoardDisclosureId, className: string, reason: string, label: string): string {
  const notice = NOTICE_ELEMENT_ID[ref];
  return `<span class="epistemic ${className}" data-parity-field="${field}" data-unknown-ref="${ref}" data-unknown-reason="${escapeHtml(reason)}">${escapeHtml(label)} <a class="mark-ref" href="#${notice}" aria-describedby="${notice}">reason and route</a></span>`;
}

/** POC-REQ-043: the item's own verification, which is always Unknown. */
function itemVerification(): string {
  return cardMark('work-item-verification', WORK_ITEM_VERIFICATION_REGION_ID, 'epistemic-unknown', 'missing-evidence', 'Verification: Unknown');
}

/** POC-REQ-014: the card's governing-intent mark, from the item's served
 * `governedBy`. The class is the POC-REQ-060 table's for its label, so no
 * state but Unknown can take the Unknown encoding. */
function itemGoverningIntent(governedBy: { readonly label: string; readonly closedReason: string }): string {
  return cardMark('work-item-governed-by', WORK_ITEM_GOVERNING_INTENT_REGION_ID, epistemicClassName(governedBy.label as PocUnknown['label']), governedBy.closedReason, `Governing intent: ${governedBy.label}`);
}

/** POC-REQ-043 (syzygy-t3jk.15): verification is Unknown for every served
 * item; the board says so once, with the served, inside and outside counts
 * the machine answer carries, the reason and its route. */
function verificationRegion(model: PocModel, counts: { readonly served: number; readonly inside: number; readonly outside: number }): string {
  if (model.workItems.kind !== 'observed') return '';
  const unknown = unknownSubject(model, WORK_ITEM_VERIFICATION_REGION_ID);
  return `<p class="verification-count notice" id="${NOTICE_ELEMENT_ID[WORK_ITEM_VERIFICATION_REGION_ID]}" data-parity-field="work-item-verification-count"${unknownMarker(WORK_ITEM_VERIFICATION_REGION_ID, unknown)}>
        Verification: Unknown for <span data-parity-field="verification-unknown-count">${counts.served}</span> of ${model.workItems.items.length} observed work items;
        <span data-parity-field="verification-unknown-inside">${counts.inside}</span> are in this selection and <span data-parity-field="verification-unknown-outside">${counts.outside}</span> are outside it.
        ${escapeHtml(unknown.reason)} Reason: <code>${escapeHtml(unknown.closedReason)}</code>. ${unknownRoute(unknown)}
      </p>`;
}

/** POC-REQ-044's fifth answer refers to POC-REQ-014's board disclosure. */
const GOVERNING_INTENT_DISCLOSURE = WORK_ITEM_GOVERNING_INTENT_REGION_ID;

/** POC-REQ-044 (syzygy-t3jk.16): README.md:99's five questions. */
const ANSWER_QUESTION: Readonly<Record<TrajectoryAnswerId, string>> = {
  remains: 'What remains?',
  running: 'What is running?',
  changed: 'What changed?',
  cost: 'What did it cost?',
  intent: 'Has the result been verified against intent?',
};

/** An answer part that is its own disclosure: label, basis, closed reason
 * and route in place, under the subject id the machine answer names. */
function answerDisclosure(model: PocModel, field: string, id: string, label: string): string {
  const unknown = unknownSubject(model, id);
  return `<span class="epistemic epistemic-unknown" data-parity-field="${field}"${unknownMarker(id, unknown)}>${escapeHtml(label)}: Unknown. ${escapeHtml(unknown.reason)} Reason: <code>${escapeHtml(unknown.closedReason)}</code>. ${unknownRoute(unknown)}</span>`;
}

/** syzygy-t3jk.21: what the changed answer needs from the request. */
interface ChangedContext {
  readonly window: ChangeWindow;
  /** The current view, so a window link keeps it. */
  readonly view: Partial<TrajectoryViewRequest> | null;
  readonly mountPrefix: string;
}

const CHANGE_WINDOW_NAME: Readonly<Record<ChangeWindow, string>> = {
  day: 'Last day',
  week: 'Last week',
  'since-last': 'Since the last evaluation',
};

/** How many changed items the page lists; the rest are counted (POC-REQ-044). */
export const CHANGED_LIST_LIMIT = 250;

/** syzygy-t3jk.21: the changed answer for the selected window, with links to
 * the others. Counts are the tracker's net change between the two named
 * revisions: never a velocity, a verdict or a per-person figure. */
function changedAnswer(model: PocModel, windows: readonly TrajectoryChangeWindow[], context: ChangedContext): string {
  const selected = windows.find((window) => window.window === context.window)!;
  const view = context.view;
  const firstOutlinePage = view?.group === 'parent' && view.status === null && view.governingIntent === null && view.page === 1;
  const links = CHANGE_WINDOWS.map((name) => {
    const window = windows.find((entry) => entry.window === name)!;
    const figure = window.kind === 'observed' ? `${window.facts.length} changed` : `Unknown: <code>${escapeHtml(window.reason)}</code>`;
    const label = `${escapeHtml(CHANGE_WINDOW_NAME[name])} (<span data-parity-field="answer-changed-${name}-count">${figure}</span>)`;
    return name === context.window
      ? `<strong aria-current="true" data-change-window-link="${name}">${label}</strong>`
      : `<a data-change-window-link="${name}" href="${viewHref(context.mountPrefix, { ...(firstOutlinePage ? null : view), changed: name })}#answers-heading">${label}</a>`;
  }).join(' · ');
  const head = `<p class="change-windows">Window: ${links}.</p>`;
  // R-T6S1-CHANGES-1 F2: an Unknown window keeps its reason and route on
  // every page, not only when it is the selected one.
  const unknownElsewhere = windows.some((window) => window.kind === 'unknown' && window.window !== context.window);
  const disclosureId = windows.find((window) => window.kind === 'unknown')?.disclosure;
  if (selected.kind === 'unknown') {
    return `${head}<p data-parity-field="answer-changed" data-change-window="${selected.window}" data-change-state="unknown">${escapeHtml(CHANGE_WINDOW_NAME[selected.window])}: Unknown, because ${escapeHtml(CHANGE_WINDOW_REASON_TEXT[selected.reason])} (<code data-parity-field="answer-changed-reason">${escapeHtml(selected.reason)}</code>); never a zero. ${answerDisclosure(model, 'answer-changed-disclosure', selected.disclosure, 'What changed')}</p>`;
  }
  const point = (field: string, label: string, commit: { readonly revision: string; readonly at: string }): string =>
    `${label} <code data-parity-field="${field}" data-revision="${escapeHtml(commit.revision)}">${escapeHtml(commit.revision.slice(0, 8))}</code> (<time datetime="${escapeHtml(commit.at)}">${escapeHtml(commit.at)}</time>)`;
  const counts = CHANGE_KINDS.map((kind) => `<span data-parity-field="answer-changed-${kind}">${selected.counts[kind]}</span> ${kind}`).join(', ');
  const served = new Map([...(model.workItems.kind === 'observed' ? model.workItems.items : [])].map((item) => item.id).sort().map((id, index) => [id, Math.floor(index / TRAJECTORY_PAGE_SIZE) + 1]));
  const listed = selected.facts.slice(0, CHANGED_LIST_LIMIT).map((fact) => {
    const page = served.get(fact.id);
    const id = page === undefined
      ? `<code>${escapeHtml(fact.id)}</code>`
      : `<a href="${viewHref(context.mountPrefix, { page })}#${escapeHtml(encodeURIComponent(`workitem-${fact.id}`))}"><code>${escapeHtml(fact.id)}</code></a>`;
    const statuses = `${fact.from === null ? '—' : `<code>${escapeHtml(fact.from)}</code>`} → ${fact.to === null ? '—' : `<code>${escapeHtml(fact.to)}</code>`}`;
    return `<li data-change-kind="${fact.kind}" data-change-id="${escapeHtml(fact.id)}">${itemName(model, fact.id, id)} ${fact.kind} (${statuses})</li>`;
  }).join('');
  const remainder = selected.facts.length - Math.min(selected.facts.length, CHANGED_LIST_LIMIT);
  const list = selected.facts.length === 0
    ? '<p>No item changed state between these revisions: an observed zero.</p>'
    : `<ol class="change-list">${listed}</ol>${remainder === 0 ? '' : `<p><span data-parity-field="answer-changed-unlisted">${remainder}</span> more changed items are not listed here; the machine answer lists every one.</p>`}`;
  const elsewhere = unknownElsewhere && disclosureId !== undefined
    ? `<p class="answer-note">${answerDisclosure(model, 'answer-changed-disclosure', disclosureId, 'Other windows')}</p>`
    : '';
  return `${head}${elsewhere}<p data-parity-field="answer-changed" data-change-window="${selected.window}">Between ${point('answer-changed-from', 'revision', selected.from)} and ${point('answer-changed-to', 'the observed revision', selected.to)}: <span data-parity-field="answer-changed-total">${selected.facts.length}</span> items changed state (${counts}). <span data-parity-field="answer-changed-updated-only">${selected.updatedWithoutStatusChange}</span> more were updated without a status change, and <span data-parity-field="answer-changed-outside-prefix">${selected.outsidePrefix}</span> changed rows are outside this tracker's prefix, counted only. Net change between the two revisions, from the tracker's history; not a rate or a verdict.</p>${list}`;
}

/** How many commits a card lists; the machine answer lists every one. */
export const CARD_COMMIT_LIMIT = 3;

const MERGED_LABEL = 'Merged (by naming convention, reduced fidelity)';

function noNamingCommitLabel(truncated: boolean, read: number): string {
  return truncated ? `Closed, no commit names it in the newest ${read} read` : 'Closed, no commit names it';
}

/** POC-REQ-065 (syzygy-t3jk.26): the closed items' landings in the remains
 * answer, never a bare "merged" and never a verdict word. */
function closedLandingSentence(model: PocModel, landing: TrajectoryClosedLanding): string {
  const closed = `<span data-parity-field="answer-remains-closed-landing-closed">${landing.closed}</span>`;
  if (landing.state === 'unknown') {
    return ` <span id="${NOTICE_ELEMENT_ID[TRAJECTORY_COMMIT_JOINS_ID]}">Of ${closed} closed items, ${answerDisclosure(model, 'answer-remains-closed-landing', landing.disclosure, 'Where each landed')}</span>`;
  }
  const older = landing.historyTruncated
    ? ` Only the newest <span data-parity-field="answer-remains-closed-landing-read">${landing.commitsRead}</span> commits were read; a commit in older history may name an item counted here as having none.`
    : ` The observed revision's whole history was read (<span data-parity-field="answer-remains-closed-landing-read">${landing.commitsRead}</span> commits).`;
  return ` Of ${closed} closed items, <span data-parity-field="answer-remains-closed-landing-merged">${landing.mergedByConvention}</span> are merged by naming convention: a commit reachable from the observed revision names each one, a reduced-fidelity join that shows where work landed, not that it satisfied its intent. <span data-parity-field="answer-remains-closed-landing-none">${landing.noNamingCommitRead}</span> are closed with no commit that names them.${older}`;
}

/** POC-REQ-065: a card's commits and, for a closed item, its landing. */
function itemCommits(model: PocModel, item: WorkItemFact): string {
  const joins = model.commitJoins;
  if (joins.kind !== 'observed') {
    if (item.status !== 'closed') return '';
    const unknown = unknownSubject(model, TRAJECTORY_COMMIT_JOINS_ID);
    return cardMark('work-item-landing', TRAJECTORY_COMMIT_JOINS_ID, 'epistemic-unknown', unknown.closedReason, 'Landing: Unknown');
  }
  const landing = closedItemLanding(item, joins);
  const commits = joins.items.find((entry) => entry.id === item.id)?.commits ?? [];
  const label = landing === null
    ? ''
    : `<span class="wi-landing" data-parity-field="work-item-landing" data-landing="${landing}">${escapeHtml(landing === 'merged-by-convention' ? MERGED_LABEL : noNamingCommitLabel(joins.truncated, joins.read))}</span>`;
  if (commits.length === 0) return label === '' ? '' : `<div class="wi-commits">${label}</div>`;
  const listed = commits.slice(0, CARD_COMMIT_LIMIT)
    .map((commit) => `<span class="wi-commit"><code data-parity-field="work-item-commit">${escapeHtml(commit.hash.slice(0, 12))}</code> <time datetime="${escapeHtml(commit.at)}">${escapeHtml(commit.at)}</time></span>`)
    .join('');
  const more = commits.length > CARD_COMMIT_LIMIT
    ? `<span class="wi-commit"><span data-parity-field="work-item-commits-unlisted">${commits.length - CARD_COMMIT_LIMIT}</span> more in the machine answer</span>`
    : '';
  return `<div class="wi-commits">${label}<span class="wi-commits-head">Commits naming it (<span data-parity-field="work-item-commit-count">${commits.length}</span>, by naming convention):</span>${listed}${more}</div>`;
}

function answerBody(model: PocModel, answer: TrajectoryAnswer, context: ChangedContext): string {
  if (answer.state === 'unknown' && answer.disclosure === WORK_ITEMS_REGION_ID) {
    const unknown = unknownSubject(model, WORK_ITEMS_REGION_ID);
    return cardMark(`answer-${answer.id}`, WORK_ITEMS_REGION_ID, 'epistemic-unknown', unknown.closedReason, 'Unknown: work items were not observed');
  }
  switch (answer.id) {
    case 'remains': {
      if (!('byStatus' in answer)) break;
      const parts = (Object.keys(STATUS_TO_COLUMN) as WorkItemStatus[])
        .map((status) => `<span data-parity-field="answer-remains-${status}">${answer.byStatus[status]}</span> <code>${escapeHtml(status)}</code>`)
        .join(' · ');
      return `<span data-parity-field="answer-remains-served">${answer.served}</span> served work items, by tracker status: ${parts}. Counted over every served item, not this board's selection. These are the tracker's items only, not checked against materialization records; approved intent that no proposal covers, and approved intent not yet materialized, are not enumerated here.${closedLandingSentence(model, answer.closedLanding)}`;
    }
    case 'running': {
      if (!('claimed' in answer)) break;
      return `<span data-parity-field="answer-running-claimed">${answer.claimed}</span> of <span data-parity-field="answer-running-served">${answer.served}</span> served work items are claimed in the tracker (status <code>in_progress</code>), which is the tracker's claim. Liveness: <span class="liveness-state" data-parity-field="answer-running-liveness">${escapeHtml(answer.liveness)}</span>. No staleness bound is declared for claims, so no claimed item can be shown as active; declaring the bound in quality policy resolves it.`;
    }
    case 'changed':
      if ('windows' in answer) return changedAnswer(model, answer.windows, context);
      break;
    case 'cost':
      if (answer.state === 'unknown') {
        const disclosure = answerDisclosure(model, `answer-${answer.id}`, answer.disclosure, 'Cost');
        // syzygy-t3jk.17: elapsed time is measured; the other costs stay Unknown.
        return `${disclosure} Elapsed time is measured: see <a href="#time-measures">lead time and age</a>.`;
      }
      break;
    case 'intent': {
      if (!('unknownProvenance' in answer)) break;
      const provenance = unknownSubject(model, answer.unknownProvenance.disclosure);
      const members = answer.reconciliationChain.members;
      const materialized = `<span data-parity-field="answer-intent-chain-materialized">${answer.reconciliationChain.materialized}</span>`;
      const chain = typeof members === 'number'
        ? `<span data-parity-field="answer-intent-chain-members">${members}</span> of ${materialized}`
        : `${answerDisclosure(model, 'answer-intent-chain-members', members.disclosure, 'Members')} Of ${materialized}`;
      return `<ul class="answer-counts">
          <li>Unknown-provenance: <span data-parity-field="answer-intent-unknown-provenance">${answer.unknownProvenance.count}</span> of <span data-parity-field="answer-intent-unknown-provenance-served">${answer.unknownProvenance.served}</span> served work items have no traceable warrant. ${cardMark('answer-intent-unknown-provenance-mark', GOVERNING_INTENT_DISCLOSURE, 'epistemic-unknown', provenance.closedReason, 'Governing intent: Unknown')}</li>
          <li>Reconciliation chain: ${chain} materialized work items whose change is on the default branch. For each member: <span class="chain-state" data-parity-field="answer-intent-chain-evidence">reconciliation evidence absent / Unknown</span>; running a reconciliation evaluation resolves it.</li>
          <li>Orphaned work, of <span data-parity-field="answer-intent-orphaned-served">${answer.orphanedWork.served}</span> served work items: not checked. ${answerDisclosure(model, 'answer-intent-orphaned', answer.orphanedWork.disclosure, 'Count')}</li>
        </ul>
        <p class="answer-note">The three counts are separate and never added together. Each item's own verification is in the <a href="#n-verification">verification notice</a>.</p>`;
    }
  }
  throw new Error(`unrenderable Trajectory answer ${answer.id}`);
}

/** POC-REQ-044: the five answers, first on the page, in their fixed order;
 * an Unknown answer is rendered, never dropped. */
function answersRegion(model: PocModel, answers: readonly TrajectoryAnswer[], context: ChangedContext): string {
  return `<section class="answers" aria-labelledby="answers-heading" data-parity-field="trajectory-answers">
      <h2 id="answers-heading" class="answers-heading">Five answers about the work</h2>
      <dl>${answers.map((answer) => `
        <div class="answer" data-parity-field="trajectory-answer" data-answer-id="${answer.id}"><dt>${escapeHtml(ANSWER_QUESTION[answer.id])}</dt><dd>${answerBody(model, answer, context)}</dd></div>`).join('')}
      </dl>
    </section>`;
}

/** POC-REQ-040 (syzygy-t3jk.15): what is known about the item, as text:
 * its tracker priority and recorded instants, exactly as served. */
function itemFacts(item: TrajectoryLaneItem): string {
  const instant = (field: string, label: string, value: string): string =>
    `${label} <time data-parity-field="${field}" datetime="${escapeHtml(value)}">${escapeHtml(value)}</time>`;
  return `<span class="wi-facts">priority <span data-parity-field="work-item-priority">${item.priority}</span> · ${instant('work-item-created', 'created', item.createdAt)} · ${instant('work-item-updated', 'updated', item.updatedAt)}${item.closedAt === null ? '' : ` · ${instant('work-item-closed', 'closed', item.closedAt)}`}</span>`;
}

const ELIGIBILITY_REASONS = {
  'tracker-deferred': 'The tracker records this item as deferred.',
  'work-item-revision-unavailable': 'No exact work-item revision was available for the dependency read.',
  'dependency-read-failed': 'The dependency read failed.',
  'dependency-result-malformed': 'The dependency read returned an unexpected result.',
  'dependency-revision-unverified': 'The dependency read lacked a matching source revision witness.',
  'unlisted-edge-type': 'A dependency row has an unlisted edge type.',
  'external-blocker': 'A blocking row has an external target.',
  'wisp-blocker': 'A blocking row has a wisp target.',
  'out-of-prefix-blocker': 'A blocking row has a target outside the observed prefix.',
  'unobserved-blocker': 'A blocking target has no observed work-item status.',
} as const satisfies Record<TrajectoryEligibilityReason, string>;

function eligibilityCount(label: string, count: number): string {
  return `<span data-eligibility-count="${escapeHtml(label)}">${escapeHtml(label)} ${count}</span>`;
}

function eligibilityRegion(eligibility: TrajectoryEligibility): string {
  const counts = Object.entries(eligibility.counts).map(([label, count]) => eligibilityCount(label, count));
  const feed = eligibility.feed.kind === 'unknown'
    ? `Unknown. ${ELIGIBILITY_REASONS[eligibility.feed.reason]}`
    : [
        eligibilityCount('rows', eligibility.feed.counts.total),
        ...Object.entries(eligibility.feed.counts.byType).map(([label, count]) => eligibilityCount(label, count)),
        eligibilityCount('unlisted', eligibility.feed.counts.unlisted),
        eligibilityCount('external', eligibility.feed.counts.external),
        eligibilityCount('wisp', eligibility.feed.counts.wisp),
        eligibilityCount('out-of-prefix', eligibility.feed.counts.outOfPrefix),
      ].join(' · ');
  return `<section class="notice" aria-label="Work-item eligibility">
    <p>Eligibility across ${eligibilityCount('served non-closed', eligibility.served)} items. ${counts.join(' · ')}</p>
    <p data-dependency-feed="${eligibility.feed.kind}">Dependency rows. ${feed}</p>
  </section>`;
}

function itemEligibility(model: PocModel, eligibility: TrajectoryItemEligibility | undefined, mountPrefix: string): string {
  if (eligibility === undefined) return '';
  const reasons = eligibility.reasons.map((reason) =>
    `<span data-eligibility-reason="${reason}">${ELIGIBILITY_REASONS[reason]}</span>`,
  ).join(' ');
  const block = eligibility.block;
  const cause = block === undefined ? '' :
    `<span data-blocked-cause="${block.causes[0] ?? 'unknown'}">Cause ${block.causes[0] ?? 'Unknown'}.</span>`;
  const blockers = block === undefined || block.blockers.length === 0 ? '' :
    `<div>Blockers ${block.blockers.map(({ id, page }) =>
      itemName(model, id, `<a data-blocker-id="${escapeHtml(id)}" href="${viewHref(mountPrefix, { page })}#${encodeURIComponent(`workitem-${id}`)}">${escapeHtml(id)}</a>`),
    ).join(', ')}</div>`;
  return `<div class="wi-facts"><span data-trajectory-eligibility="${eligibility.state}">Eligibility ${eligibility.state}.</span> ${reasons} ${cause}${blockers}</div>`;
}

/** POC-REQ-014: the served count of the governing-intent Unknown beside how
 * many the rendered selection holds and how many fall outside it, with the
 * reason, its RFC2-24 route and what resolves an item. `inside` is counted
 * over the cards this page renders. */
function governingIntentRegion(model: PocModel, rendered: readonly TrajectoryLaneItem[]): string {
  if (model.workItems.kind !== 'observed') return '';
  const count = model.workItems.governedByUnknownCount;
  const subjects = new Map(model.workItems.items.map((item) => [item.id, item.governedBy]));
  const inside = rendered.filter((item) => {
    const governedBy = subjects.get(item.id);
    return governedBy?.label === 'Unknown' && governedBy.closedReason === 'source-uncaptured-or-unreachable';
  }).length;
  const unknown = unknownSubject(model, WORK_ITEM_GOVERNING_INTENT_REGION_ID);
  return `<p class="governing-intent-count notice" id="${NOTICE_ELEMENT_ID[WORK_ITEM_GOVERNING_INTENT_REGION_ID]}" data-parity-field="work-item-governed-by-count"${unknownMarker(WORK_ITEM_GOVERNING_INTENT_REGION_ID, unknown)}>
        Governing intent: Unknown for <span data-parity-field="governed-by-unknown-count">${count}</span> of ${model.workItems.items.length} observed work items;
        <span data-parity-field="governed-by-unknown-inside">${inside}</span> are in this selection and <span data-parity-field="governed-by-unknown-outside">${count - inside}</span> are outside it.
        ${escapeHtml(unknown.reason)} Reason: <code>${escapeHtml(unknown.closedReason)}</code>. ${unknownRoute(unknown)}
        Supplying an item's warrant resolves its governing intent.
      </p>
      <input type="checkbox" class="narrow-toggle" id="narrow-governing-intent-unknown">
      <label class="narrow-label" for="narrow-governing-intent-unknown">Show only items whose governing intent is Unknown</label>`;
}

/** POC-REQ-063: how many UTF-16 code units of a title a list shows. The
 * card shows the whole title; a list names many items, so its title is
 * clipped to cap each reference's cost. A card's blockers have no count
 * bound, so this caps a page's bytes per blocker, not the page
 * (syzygy-262m). */
export const LIST_TITLE_LIMIT = 60;

/** A title cut to `LIST_TITLE_LIMIT` code units, never inside a surrogate
 * pair, or null when it already fits. */
function clipTitle(text: string): string | null {
  if (text.length <= LIST_TITLE_LIMIT) return null;
  const end = /[\uD800-\uDBFF]/.test(text[LIST_TITLE_LIMIT - 1]!) ? LIST_TITLE_LIMIT - 1 : LIST_TITLE_LIMIT;
  return text.slice(0, end);
}

/** POC-REQ-063: the one place a work item's title becomes HTML, for its
 * card and for every list that names it. An admitted title is the item's
 * own text, escaped, in a <bdi> so its bidirectional controls cannot reorder
 * the page; a withheld one is a mark naming its reason and referring to the
 * one withheld-title disclosure. `list` clips the text (see clipTitle). */
function titleHtml(model: PocModel, title: WorkItemTitle, field: string, className: string, list: boolean): string {
  if (isTitleAdmitted(title)) {
    const clipped = list ? clipTitle(title.text) : null;
    return clipped === null
      ? `<bdi class="${className}" data-parity-field="${field}">${escapeHtml(title.text)}</bdi>`
      : `<bdi class="${className}" data-parity-field="${field}" data-title-clipped="${LIST_TITLE_LIMIT}">${escapeHtml(clipped)}</bdi>…`;
  }
  const unknown = unknownSubject(model, WORK_ITEM_TITLES_REGION_ID);
  return cardMark(field, WORK_ITEM_TITLES_REGION_ID, epistemicClassName(unknown.label), unknown.closedReason, `Title: withheld (${title.withheld})`);
}

/** POC-REQ-063: the card's title, whole. */
function itemTitle(model: PocModel, title: WorkItemTitle): string {
  return titleHtml(model, title, 'work-item-title', 'wi-name', false);
}

const SERVED_BY_ID = new WeakMap<object, ReadonlyMap<string, WorkItemFact>>();

/** POC-REQ-063 (syzygy-t3jk.24): an item's display name in a list: its
 * identifier as the list renders it (`idHtml`), then, for a served item, its
 * title as the policy served it. Every list that names a work item calls
 * this, so no list reads a title any other way. An item not served (a
 * removed item in the changed list) stays named by its identifier. */
function itemName(model: PocModel, id: string, idHtml: string): string {
  if (model.workItems.kind !== 'observed') return idHtml;
  let served = SERVED_BY_ID.get(model.workItems);
  if (served === undefined) {
    served = new Map(model.workItems.items.map((item) => [item.id, item]));
    SERVED_BY_ID.set(model.workItems, served);
  }
  const item = served.get(id);
  if (item === undefined) return idHtml;
  return `<span class="wi-ref" data-title-of="${escapeHtml(id)}">${idHtml} ${titleHtml(model, item.title, 'work-item-ref-title', 'wi-ref-name', true)}</span>`;
}

/** POC-REQ-063: the board's one statement about titles: the policy, the
 * admitted count and, while any title is withheld, the withheld count with
 * its reason and route. */
function titlesRegion(model: PocModel): string {
  if (model.workItems.kind !== 'observed') return '';
  const titles = model.workItems.titles;
  const total = model.workItems.items.length;
  const policy = `<code>${escapeHtml(titles.policyId)}</code> ${escapeHtml(titles.policyVersion)}`;
  const admitted = `<span data-parity-field="titles-admitted-count">${titles.admitted}</span> of ${total} observed work items`;
  if (titles.withheld === 0) {
    return `<p class="titles-notice notice" id="${NOTICE_ELEMENT_ID[WORK_ITEM_TITLES_REGION_ID]}" data-parity-field="work-item-titles">
        Titles: shown for ${admitted}, each screened by the title policy ${policy} (its secret detectors and its scan for markup and scripts).
      </p>`;
  }
  const unknown = unknownSubject(model, WORK_ITEM_TITLES_REGION_ID);
  return `<p class="titles-notice notice" id="${NOTICE_ELEMENT_ID[WORK_ITEM_TITLES_REGION_ID]}" data-parity-field="work-item-titles"${unknownMarker(WORK_ITEM_TITLES_REGION_ID, unknown)}>
        Titles: shown for ${admitted}, screened by the title policy ${policy}; ${escapeHtml(unknown.label)} for <span data-parity-field="titles-unknown-count">${titles.withheld}</span>. ${escapeHtml(unknown.reason)}
        Reason: <code>${escapeHtml(unknown.closedReason)}</code>. ${unknownRoute(unknown)}
      </p>`;
}

/** The item as served; a rendered item is always served. */
function servedItem(model: PocModel, itemId: string): WorkItemFact {
  const served = model.workItems.kind === 'observed' ? model.workItems.items.find((entry) => entry.id === itemId) : undefined;
  if (served === undefined) throw new Error(`rendered work item ${itemId} is not served`);
  return served;
}

function itemCard(
  model: PocModel,
  item: TrajectoryLaneItem,
  workerChange: WorkerChangeObserved | null,
  testArtifactVerification: TestArtifactVerificationResult,
  governingIntentId: string | null,
  demonstrated: boolean,
  eligibility: TrajectoryItemEligibility | undefined,
  mountPrefix: string,
  anchor = true,
): string {
  const served = servedItem(model, item.id);
  const governedBy = served.governedBy;
  // syzygy-t3jk.20: an item under two parents renders twice on a grouped
  // page; only its first card carries the fragment target.
  return `<li class="wi-card${demonstrated ? ' wi-card-demonstrated' : ''}"${anchor ? ` id="workitem-${escapeHtml(item.id)}"` : ''} data-governed-by="${escapeHtml(governedBy.label)}" data-work-item-id="${escapeHtml(item.id)}">
    ${demonstrated ? '<span class="demo-badge">Demonstrated item</span>' : ''}
    <a class="wi-title" href="#workitem-${escapeHtml(item.id)}" data-parity-field="work-item-id">${escapeHtml(item.id)}</a>
    ${itemTitle(model, served.title)}
    <span class="wi-status" data-parity-field="work-item-status">${escapeHtml(item.status)}</span>
    ${itemEligibility(model, eligibility, mountPrefix)}
    ${itemFacts(item)}
    ${itemGoverningIntent(governedBy)}
    ${itemVerification()}
    ${itemCommits(model, served)}
    ${workerChangeBadge(model, workerChange, testArtifactVerification, governingIntentId)}
  </li>`;
}

const TRAJECTORY_STYLE = `
  .scope-statement { max-width: 78ch; }
  .answers dl { display: grid; gap: .6rem; margin: 0 0 1.5rem; max-width: 96ch; }
  .answer { display: grid; grid-template-columns: minmax(10rem, 16rem) 1fr; gap: .2rem 1rem; border-top: 1px solid var(--line); padding-top: .5rem; }
  .answer dt { font-weight: 600; }
  .answers-heading { font-size: 1.1rem; margin: 0 0 .6rem; }
  .answer dd { margin: 0; }
  .answer-counts { margin: 0; padding-left: 1.1rem; display: grid; gap: .3rem; }
  .answer-note { margin: .4rem 0 0; color: var(--muted); }
  @media (max-width: 40rem) { .answer { grid-template-columns: 1fr; } }
  /* syzygy-t3jk.15: the seven columns stay one row and the board scrolls
     inside itself when narrower; no code identity widens the page. */
  code { overflow-wrap: anywhere; }
  .board { display: grid; grid-template-columns: repeat(7, minmax(10rem, 1fr)); gap: .75rem; padding: 1.5rem 0 3rem; overflow-x: auto; }
  .wi-facts { font-family: var(--font-mono); font-size: .68rem; color: var(--muted); overflow-wrap: anywhere; }
  .wi-facts a { color: var(--cyan); }
  .wi-facts a:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  .mark-ref { font-size: .68rem; color: inherit; }
  .board-column { background: linear-gradient(145deg, #102126, var(--panel)); border: 1px solid var(--line); padding: 1rem; min-width: 0; }
  .board-column h2 { font-size: 1.1rem; margin: 0 0 .8rem; }
  .board-column .count { color: var(--muted); font-family: var(--font-mono); font-size: .78rem; }
  .wi-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .7rem; }
  .wi-card { background: #091416; border: 1px solid var(--line); padding: .6rem .7rem; display: grid; gap: .3rem; position: relative; }
  .wi-title { display: block; font-family: var(--font-mono); font-size: .82rem; color: var(--ink); text-decoration: none; }
  .wi-title:hover, .wi-title:focus-visible { color: var(--cyan); }
  .wi-id { color: var(--muted); font-size: .7rem; }
  .wi-status { font-family: var(--font-mono); font-size: .7rem; color: var(--muted); text-transform: uppercase; }
  .worker-change { display: grid; gap: .2rem; padding-top: .2rem; border-top: 1px dashed var(--line); }
  .worker-change-detail { font-size: .72rem; color: var(--muted); }
  .worker-change-note { font-size: .68rem; color: var(--muted); }
  .worker-change-label { font-family: var(--font-mono); font-size: .7rem; text-transform: uppercase; color: var(--cyan); }
  .wi-card-demonstrated { border-color: var(--cyan); }
  .wi-commits { display: grid; gap: .15rem; font-size: .7rem; color: var(--muted); }
  .wi-commit { padding-left: .6rem; }
  .wi-commits code { overflow-wrap: anywhere; }
  .wi-landing { font-family: var(--font-mono); color: var(--ink); }
  .demo-badge { color: var(--cyan); font-family: var(--font-mono); font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; }
  .demo-callout { max-width: 78ch; }
  .governing-intent-count, .titles-notice { max-width: 78ch; }
  .wi-name { display: block; font-size: .82rem; overflow-wrap: anywhere; unicode-bidi: isolate; }
  .wi-ref-name { overflow-wrap: anywhere; unicode-bidi: isolate; }
  .narrow-label { font-family: var(--font-mono); font-size: .78rem; margin-left: .3rem; }
  .narrow-toggle:focus-visible + .narrow-label { outline: 2px solid var(--cyan); outline-offset: 2px; }
  .narrow-toggle:checked ~ .board .wi-card:not([data-governed-by="Unknown"]),
  .narrow-toggle:checked ~ .outline .wi-card:not([data-governed-by="Unknown"]) { display: none; }
  .outline { padding: 1.5rem 0 3rem; }
  .outline-groups { list-style: none; padding: 0; margin: 0; display: grid; gap: 1.2rem; }
  .outline-group { border-left: 2px solid var(--line); padding-left: .9rem; display: grid; gap: .4rem; }
  .outline-group h3 { font-size: 1rem; margin: 0; }
  .outline-group p { margin: 0; color: var(--muted); max-width: 78ch; }
  .outline-group .wi-list { grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); }
  .outline a:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  ${MATERIALIZE_PANEL_STYLE}
  ${TIME_MEASURES_STYLE}
  .view-nav { margin: 0 0 1rem; }
  .view-links { display: flex; flex-wrap: wrap; gap: .3rem 1rem; list-style: none; padding: 0; margin: .3rem 0; }
  .view-links a[aria-current="page"] { font-weight: 600; text-decoration-thickness: 2px; }
  .view-nav a:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  .view-note, .view-pages { color: var(--muted); }
`;

/** A view's query string, parameters in their declared order. */
function viewHref(mountPrefix: string, view: Partial<TrajectoryViewRequest> | null): string {
  const query = new URLSearchParams();
  if (view?.status) query.set('status', view.status);
  if (view?.governingIntent) query.set('governing-intent', view.governingIntent);
  if (view?.group) query.set('group', view.group);
  if (view?.selection) query.set('selection', view.selection);
  if (view?.changed) query.set('changed', view.changed);
  if (view?.page !== undefined) query.set('page', String(view.page));
  const text = query.toString();
  return escapeHtml(withMountPrefix(mountPrefix, TRAJECTORY_HUMAN_PATH) + (text === '' ? '' : `?${text}`));
}

/**
 * POC-REQ-042 (syzygy-t3jk.18): every served item is reachable. Real links,
 * never inside a details element and needing no script: the default
 * parent-grouped outline, recent work, every item by id, each status and
 * the governing-intent Unknown, as well as the current view's neighbours.
 */
function viewNavigation(model: PocModel, narrowing: TrajectoryNarrowing, answers: readonly TrajectoryAnswer[], mountPrefix: string): string {
  if (model.workItems.kind !== 'observed') return '';
  const remains = answers.find((answer) => answer.id === 'remains');
  const byStatus = remains !== undefined && remains.state === 'observed' && 'byStatus' in remains ? remains.byStatus : null;
  const view = narrowing.view;
  const link = (href: string, text: string, current: boolean): string =>
    `<li><a href="${href}"${current ? ' aria-current="page"' : ''}>${text}</a></li>`;
  const isView = (status: string | null, intent: string | null, group: string | null = null): boolean =>
    view.selection === undefined && view.status === status && view.governingIntent === intent && view.group === group;
  const nonClosed = byStatus === null ? null : model.workItems.items.length - byStatus.closed;
  const statuses = byStatus === null ? '' : (Object.keys(byStatus) as WorkItemStatus[])
    .map((status) => link(viewHref(mountPrefix, { status, page: 1 }), `<code>${escapeHtml(status)}</code> <span data-parity-field="trajectory-view-status-count" data-status="${escapeHtml(status)}">${byStatus[status]}</span>`, isView(status, null)))
    .join('');
  const pages = `<p class="view-pages" data-parity-field="trajectory-view-page">Page <span data-parity-field="trajectory-view-page-number">${view.page}</span> of <span data-parity-field="trajectory-view-page-count">${view.pageCount}</span>, over <span data-parity-field="trajectory-view-matching">${view.matching}</span> matching items.
        ${view.page > 1 ? `<a rel="prev" href="${viewHref(mountPrefix, { ...view, page: view.page - 1 })}">Previous page</a>` : ''}
        ${view.page < view.pageCount ? `<a rel="next" href="${viewHref(mountPrefix, { ...view, page: view.page + 1 })}">Next page</a>` : ''}</p>`;
  return `<nav class="view-nav" aria-labelledby="view-nav-heading" data-parity-field="trajectory-view-navigation">
      <h2 id="view-nav-heading" class="answers-heading">Reach every work item</h2>
      <ul class="view-links">
        ${nonClosed === null ? '' : link(viewHref(mountPrefix, { changed: view.changed }), `Non-closed items grouped by parent <span data-parity-field="trajectory-view-grouped-count">${nonClosed}</span>`, isView(null, null, 'parent'))}
        ${link(viewHref(mountPrefix, { selection: 'recent', changed: view.changed }), 'Recent work', view.selection === 'recent')}
        ${link(viewHref(mountPrefix, { page: 1 }), `All items by id <span data-parity-field="trajectory-view-all-count">${model.workItems.items.length}</span>`, isView(null, null))}
        ${statuses}
        ${link(viewHref(mountPrefix, { governingIntent: 'unknown', page: 1 }), `Governing intent Unknown <span data-parity-field="trajectory-view-intent-count">${model.workItems.governedByUnknownCount}</span>`, isView(null, 'unknown'))}
      </ul>
      <p class="view-note">${narrowing.pageSize} items per page, by ascending item id; grouped by parent, ${narrowing.pageSize} positions per page.</p>
      ${pages}
    </nav>`;
}

/** A fragment reference to an element id: URL-encoded, then HTML-escaped
 * (R-T4S2-OUTLINE-1 finding 2). */
function fragment(id: string): string {
  return `#${escapeHtml(encodeURIComponent(id))}`;
}

/** syzygy-t3jk.20: what a group's heading says. A parent is named with its
 * tracker status as recorded and never judged from its children; the four
 * classes say why their items sit under no named parent. */
function groupHeading(model: PocModel, group: TrajectoryGroupSlice, view: TrajectoryNarrowing['view'], mountPrefix: string): string {
  const key = group.key;
  switch (key.kind) {
    case 'parent': {
      const parent = group.parent!;
      const card = `${viewHref(mountPrefix, { page: parent.cardPage })}#${encodeURIComponent(`workitem-${key.id}`)}`;
      return `Parent ${itemName(model, key.id, `<a data-group-parent="${escapeHtml(key.id)}" href="${card}">${escapeHtml(key.id)}</a>`)}, tracker status <code data-group-parent-status>${escapeHtml(parent.status)}</code>`;
    }
    case 'parent-outside-tracker':
      return 'Parent outside this tracker';
    case 'parent-unobserved':
      return 'Parent not served';
    case 'no-parent':
      return 'No parent recorded';
    case 'parent-unknown':
      return 'Parent Unknown';
  }
}

const GROUP_NOTE = {
  'parent-outside-tracker': 'A parent row names an external item, a wisp or an item of another tracker; that parent is counted here and never named.',
  'parent-unobserved': 'A parent row names an item of this tracker that the observation did not serve.',
  'no-parent': 'No parent-child row names a parent for these items.',
} as const;

function groupRegion(model: PocModel, group: TrajectoryGroupSlice, view: NonNullable<TrajectoryNarrowing['view']>, mountPrefix: string, cards: string): string {
  const pageLink = (page: number, text: string, rel: string): string =>
    `<a data-group-continues="${rel}" href="${viewHref(mountPrefix, { ...view, page })}${fragment(group.anchor)}">${text} ${page}</a>`;
  const notes: string[] = [];
  const parent = group.parent;
  if (parent !== undefined) {
    if (parent.status === 'closed') notes.push('The parent is closed in the tracker and its items keep their own statuses; neither is read as the other\'s completion.');
    if (parent.under.length > 0) {
      notes.push(`The parent sits under ${parent.under.map(({ id, groupPage, cardPage }) => itemName(model, id, groupPage === null
        ? `<a data-group-under="${escapeHtml(id)}" href="${viewHref(mountPrefix, { page: cardPage })}#${encodeURIComponent(`workitem-${id}`)}">${escapeHtml(id)}</a>`
        : `<a data-group-under="${escapeHtml(id)}" href="${viewHref(mountPrefix, { ...view, page: groupPage })}${fragment(groupAnchor({ kind: 'parent', id }))}">${escapeHtml(id)}</a>`)).join(', ')}.`);
    }
    const cycle = parent.cycle;
    if (cycle !== null && 'members' in cycle) {
      notes.push(`<span data-group-cycle="${escapeHtml(cycle.members.join(' '))}">Parent-child cycle among ${cycle.members.map((id) => itemName(model, id, `<code>${escapeHtml(id)}</code>`)).join(', ')}: stated here once and not followed further.</span>`);
    } else if (cycle !== null) {
      const anchor = groupAnchor({ kind: 'parent', id: cycle.statedUnder });
      const href = cycle.page === null ? fragment(anchor) : `${viewHref(mountPrefix, { ...view, page: cycle.page })}${fragment(anchor)}`;
      notes.push(`<span data-group-cycle-ref="${escapeHtml(cycle.statedUnder)}">The parent is in a parent-child cycle, stated under ${itemName(model, cycle.statedUnder, `<a href="${href}">${escapeHtml(cycle.statedUnder)}</a>`)}.</span>`);
    }
  } else if (group.key.kind === 'parent-unknown') {
    notes.push(`<span data-group-reason="${group.key.reason}">The dependency rows were not read. ${ELIGIBILITY_REASONS[group.key.reason]}</span>`);
  } else if (group.key.kind !== 'parent') {
    notes.push(GROUP_NOTE[group.key.kind]);
  }
  const continuity = [
    group.continuedFromPage === null ? '' : `Continued from ${pageLink(group.continuedFromPage, 'page', 'prev')}.`,
    group.continuesOnPage === null ? '' : `Continues on ${pageLink(group.continuesOnPage, 'page', 'next')}.`,
  ].filter((part) => part !== '').join(' ');
  return `<li class="outline-group" data-group="${escapeHtml(group.anchor)}">
      <h3 id="${escapeHtml(group.anchor)}">${groupHeading(model, group, view, mountPrefix)}</h3>
      <p><span data-group-total>${group.total}</span> items in this group, <span data-group-on-page>${group.onPage.length}</span> on this page.${continuity === '' ? '' : ` ${continuity}`}</p>
      ${notes.map((note) => `<p>${note}</p>`).join('')}
      <ol class="wi-list">${cards}</ol>
    </li>`;
}

/** syzygy-t3jk.20: the grouped view's page, one region per group. */
function outlineRegion(model: PocModel, grouping: TrajectoryGrouping, view: TrajectoryNarrowing['view'], mountPrefix: string,
  card: (item: TrajectoryLaneItem, anchor: boolean) => string, rendered: readonly TrajectoryLaneItem[]): string {
  const byId = new Map(rendered.map((item) => [item.id, item]));
  const anchored = new Set<string>();
  const groups = grouping.groups.map((group) => groupRegion(model, group, view, mountPrefix, group.onPage.map((id) => {
    const item = byId.get(id);
    if (item === undefined) throw new Error(`grouped work item ${id} is not rendered`);
    const anchor = !anchored.has(id);
    anchored.add(id);
    return card(item, anchor);
  }).join(''))).join('');
  return `<section class="outline" aria-labelledby="outline-heading" data-parity-field="trajectory-outline">
      <h2 id="outline-heading" class="answers-heading">Work items grouped by parent</h2>
      <p class="view-note"><span data-parity-field="trajectory-outline-positions">${grouping.positions}</span> positions over every page: an item with several parents sits under each.</p>
      ${groups === '' ? '<p class="view-note">No matching work items.</p>' : `<ol class="outline-groups">${groups}</ol>`}
    </section>`;
}

function statusBoard(rendered: readonly TrajectoryLaneItem[], card: (item: TrajectoryLaneItem) => string): string {
  const byColumn = new Map<TrajectoryColumn, TrajectoryLaneItem[]>();
  for (const column of COLUMN_ORDER) {
    byColumn.set(column, []);
  }
  for (const item of rendered) {
    byColumn.get(item.column)?.push(item);
  }
  const columns = COLUMN_ORDER.map((column) => {
    const items = byColumn.get(column) ?? [];
    return `<section class="board-column" aria-label="${escapeHtml(column)} column">
        <h2>${escapeHtml(column)} <span class="count">(${items.length})</span></h2>
        <ol class="wi-list">${items.map((item) => card(item)).join('')}</ol>
      </section>`;
  }).join('');
  return `<div class="board" role="group" aria-label="Work-item board by status column">${columns}</div>`;
}

/** The Trajectory route: the default selection, or one declared view, or
 * the refusal of a parameter outside the declared set (POC-REQ-042). */
export function renderTrajectoryRoute(model: PocModel, mountPrefix: string, status: HumanOperabilityStatus | undefined, query: URLSearchParams): string | TrajectoryViewRefusal {
  const request = parseTrajectoryView(query);
  if (request === null) return renderTrajectoryPage(model, mountPrefix, status);
  if ('refused' in request) return request;
  // syzygy-t3jk.21: `changed` alone picks the changed answer's window and
  // keeps the default selection; with any other parameter it rides the view.
  const window = request.changed ?? 'day';
  const view = projectTrajectoryView(model.trajectory, model.workItems, request);
  if ('refused' in view) return view;
  return renderTrajectoryPage({ ...model, trajectory: view }, mountPrefix, status, window);
}

export function renderTrajectoryPage(model: PocModel, mountPrefix = '', status?: HumanOperabilityStatus, changed: ChangeWindow = 'day'): string {
  const trajectory = model.trajectory;
  const workerChange = model.workerChange.kind === 'observed' ? model.workerChange : null;
  let lede = 'Five work-item questions and the tracker observation status.';
  let body: string;
  if (trajectory.kind === 'unknown') {
    const unknown = unknownSubject(model, 'region:work-items');
    body = `${answersRegion(model, trajectory.answers, { window: changed, view: null, mountPrefix })}
      <p class="unavailable-notice" id="${NOTICE_ELEMENT_ID[WORK_ITEMS_REGION_ID]}"${unknownMarker('region:work-items', unknown)}>Unknown — ${escapeHtml(trajectory.reason)}. ${unknownRoute(unknown)} This is a distinct state from an observed-empty board: no board is rendered because the seeded work-item graph is unavailable. Independently observed work-item denominator: Unknown (work items were not independently observed).</p>`;
  } else {
    const demonstratedId = currentMaterializedBeadId(model);
    const demonstratedRendered =
      demonstratedId !== null && trajectory.rendered.some((item) => item.id === demonstratedId);
    const card = (item: TrajectoryLaneItem, anchor = true): string =>
      itemCard(
        model,
        item,
        workerChange !== null && workerChange.beadId === item.id ? workerChange : null,
        model.testArtifactVerification,
        model.governingIntentId,
        item.id === demonstratedId,
        trajectory.eligibility.items[item.id],
        mountPrefix,
        anchor,
      );
    const grouping = trajectory.grouping;
    const view = trajectory.narrowing.view;
    const layout = grouping === undefined ? 'in tracker status columns' : 'grouped by parent';
    lede = `Five answers over the full observed work-item population, then selected work items ${layout}. Times come from recorded instants.`;
    const board = grouping !== undefined
      ? outlineRegion(model, grouping, view, mountPrefix, card, trajectory.rendered)
      : statusBoard(trajectory.rendered, card);

    const demonstratedCallout =
      demonstratedId === null
        ? ''
        : demonstratedRendered
          ? `<p class="demo-callout notice">The demonstrated item is <a href="#workitem-${escapeHtml(demonstratedId)}"><code>${escapeHtml(demonstratedId)}</code></a> — the one work item this POC materialized through its human-triggered action. Every other card is real, unrelated Butlers backlog shown for context.</p>`
          : `<p class="demo-callout notice">The demonstrated item <code>${escapeHtml(demonstratedId)}</code> was materialized by this POC but falls outside the current board selection, so no card is shown for it.</p>`;

    body = `
      ${answersRegion(model, trajectory.answers, { window: changed, view: trajectory.narrowing.view, mountPrefix })}
      ${timeMeasuresRegion(trajectory.timeMeasures)}
      ${eligibilityRegion(trajectory.eligibility)}
      <p class="scope-statement notice" data-parity-field="trajectory-scope">
        Rendering ${trajectory.renderedCount} of ${trajectory.totalCount} observed work items (${trajectory.selectionRule});
        <span data-parity-field="trajectory-excluded-count">${trajectory.excludedCount}</span> items are outside this selection and not shown.
      </p>
      ${viewNavigation(model, trajectory.narrowing, trajectory.answers, mountPrefix)}
      ${closureNotice(trajectory.rendered)}
      ${governingIntentRegion(model, trajectory.rendered)}
      ${titlesRegion(model)}
      ${verificationRegion(model, trajectory.verificationUnknown)}
      ${demonstratedCallout}
      ${board}`;
  }

  body += renderMaterializePanel(model, mountPrefix);

  return pageShell({
    title: 'Trajectory · Syzygy three-surface POC',
    current: 'trajectory',
    eyebrow: `Trajectory · ${escapeHtml(model.project.name)} ${model.project.revision.slice(0, 12)}`,
    heading: 'Work and time, observed',
    lede,
    extraStyle: TRAJECTORY_STYLE,
    body,
    status,
    surfacePlanes: model.surfaces,
    footer: substrateEvaluationFooter({
      model,
      escapeHtml,
      revisionOf:
        "the observed Beads work-item database (Dolt) — a substrate distinct from the git tree the evaluation's project revision names",
      revision: trajectory.kind === 'observed' ? trajectory.doltRevision : null,
      skewChecks:
        trajectory.kind === 'observed' && model.workItems.kind === 'observed'
          ? [
              {
                label: "this surface's work-item capture instant",
                observed: model.workItems.capturedAt,
                expected: model.evaluation.asOf,
              },
            ]
          : [],
    }),
    escapeHtml,
    mountPrefix,
  });
}

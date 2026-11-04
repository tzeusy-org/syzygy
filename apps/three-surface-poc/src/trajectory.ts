import { escapeHtml } from '@syzygy/http-host';
import {
  WORK_ITEM_GOVERNING_INTENT_REGION_ID,
  WORK_ITEM_TITLES_REGION_ID,
  workItemGoverningIntentId,
  workItemVerificationId,
  workerChangeVerificationId,
  type PocModel,
  type PocUnknown,
  type WorkerChangeObserved,
} from '@syzygy/three-surface-poc-core';
import type { TrajectoryColumn, TrajectoryLaneItem } from '@syzygy/three-surface-poc-core';
import type { TestArtifactVerificationResult } from '@syzygy/three-surface-poc-core';

import {
  MATERIALIZE_PANEL_STYLE,
  currentMaterializedBeadId,
  renderMaterializePanel,
} from './materialize-action.js';
import { substrateEvaluationFooter } from './evaluation-footer.js';
import { pageShell, type HumanOperabilityStatus } from './page-shell.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { epistemicClassName } from './design-tokens.js';
import { unknownMarker, unknownRoute, unknownSubject } from './unknown-marker.js';

export const TRAJECTORY_HUMAN_PATH = '/trajectory' as const;
export const TRAJECTORY_TAILNET_PATH = `${TAILNET_MOUNT_PREFIX}/trajectory` as const;

const COLUMN_ORDER: readonly TrajectoryColumn[] = [
  'Backlog',
  'In Progress',
  'Blocked',
  'Deferred',
  'Pinned',
  'Hooked',
  'Done',
];

function timeOffsetPercent(
  instant: string,
  range: { readonly earliest: string; readonly latest: string },
): number {
  const earliestMs = Date.parse(range.earliest);
  const latestMs = Date.parse(range.latest);
  const span = latestMs - earliestMs;
  if (span <= 0) {
    return 0;
  }
  const clamped = Math.min(Math.max(Date.parse(instant) - earliestMs, 0), span);
  return (clamped / span) * 100;
}

function laneBar(
  item: TrajectoryLaneItem,
  range: { readonly earliest: string; readonly latest: string } | null,
): string {
  if (range === null) {
    return '';
  }
  const start = timeOffsetPercent(item.createdAt, range);
  const end = timeOffsetPercent(item.closedAt ?? item.updatedAt, range);
  const left = Math.min(start, end);
  const width = Math.max(end - start, 0.6);
  return `<div class="lane-track" aria-hidden="true"><div class="lane-bar" data-parity-field="time-lane" style="--lane-left:${left.toFixed(3)}%;--lane-width:${width.toFixed(3)}%"></div></div>`;
}

const WORKER_CHANGE_STATE_LABEL = {
  planned: 'Planned',
  active: 'Active',
  'changed-or-merged': 'Changed / merged',
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

function itemVerification(model: PocModel, itemId: string): string {
  const id = workItemVerificationId(itemId);
  const unknown = unknownSubject(model, id);
  return `<span class="epistemic epistemic-unknown" data-parity-field="work-item-verification"${unknownMarker(id, unknown)} title="${escapeHtml(unknown.reason)}">Verification: Unknown. ${unknownRoute(unknown)}</span>`;
}

/** POC-REQ-014: the card's governing-intent mark, read from the model under
 * the card's own id. The class is the POC-REQ-060 table's for the label the
 * model carries, so no state but Unknown can take the Unknown encoding. */
function itemGoverningIntent(itemId: string, unknown: PocUnknown): string {
  const id = workItemGoverningIntentId(itemId);
  return `<span class="epistemic ${epistemicClassName(unknown.label)}" data-parity-field="work-item-governed-by"${unknownMarker(id, unknown)} title="${escapeHtml(unknown.reason)}">Governing intent: ${escapeHtml(unknown.label)}. ${unknownRoute(unknown)}</span>`;
}

/** POC-REQ-014: the served count of the governing-intent Unknown beside how
 * many the rendered selection holds and how many fall outside it, with the
 * reason, its RFC2-24 route and what resolves an item. `inside` is counted
 * over the cards this page renders. */
function governingIntentRegion(model: PocModel, rendered: readonly TrajectoryLaneItem[]): string {
  if (model.workItems.kind !== 'observed') return '';
  const count = model.workItems.governedByUnknownCount;
  const subjects = new Map(model.unknownSubjects.map((subject) => [subject.id, subject.epistemic]));
  const inside = rendered.filter((item) => {
    const governedBy = subjects.get(workItemGoverningIntentId(item.id));
    return governedBy?.label === 'Unknown' && governedBy.closedReason === 'source-uncaptured-or-unreachable';
  }).length;
  const unknown = unknownSubject(model, WORK_ITEM_GOVERNING_INTENT_REGION_ID);
  return `<p class="governing-intent-count notice" data-parity-field="work-item-governed-by-count"${unknownMarker(WORK_ITEM_GOVERNING_INTENT_REGION_ID, unknown)}>
        Governing intent: Unknown for <span data-parity-field="governed-by-unknown-count">${count}</span> of ${model.workItems.items.length} observed work items;
        <span data-parity-field="governed-by-unknown-inside">${inside}</span> are in this selection and <span data-parity-field="governed-by-unknown-outside">${count - inside}</span> are outside it.
        Reason: <code>${escapeHtml(unknown.closedReason)}</code>. ${unknownRoute(unknown)}
        Supplying an item's warrant resolves its governing intent.
      </p>
      <input type="checkbox" class="narrow-toggle" id="narrow-governing-intent-unknown">
      <label class="narrow-label" for="narrow-governing-intent-unknown">Show only items whose governing intent is Unknown</label>`;
}

/** SEC-5: a card is named by its identifier; its title is never read, and
 * the card says so under the one withheld-title disclosure. */
function itemTitleWithheld(model: PocModel): string {
  const unknown = unknownSubject(model, WORK_ITEM_TITLES_REGION_ID);
  return `<span class="epistemic ${epistemicClassName(unknown.label)}" data-parity-field="work-item-title"${unknownMarker(WORK_ITEM_TITLES_REGION_ID, unknown)}>Title: withheld (SEC-5). ${unknownRoute(unknown)}</span>`;
}

/** The board-level statement of the withheld titles, with the reason. */
function titlesWithheldRegion(model: PocModel): string {
  if (model.workItems.kind !== 'observed') return '';
  const unknown = unknownSubject(model, WORK_ITEM_TITLES_REGION_ID);
  return `<p class="titles-withheld notice" data-parity-field="work-item-titles-withheld"${unknownMarker(WORK_ITEM_TITLES_REGION_ID, unknown)}>
        Titles: ${escapeHtml(unknown.label)} for every observed work item. ${escapeHtml(unknown.reason)}
        Reason: <code>${escapeHtml(unknown.closedReason)}</code>. ${unknownRoute(unknown)}
      </p>`;
}

function itemCard(
  model: PocModel,
  item: TrajectoryLaneItem,
  range: { readonly earliest: string; readonly latest: string } | null,
  workerChange: WorkerChangeObserved | null,
  testArtifactVerification: TestArtifactVerificationResult,
  governingIntentId: string | null,
  demonstrated: boolean,
): string {
  const governedBy = unknownSubject(model, workItemGoverningIntentId(item.id));
  return `<li class="wi-card${demonstrated ? ' wi-card-demonstrated' : ''}" id="workitem-${escapeHtml(item.id)}" data-governed-by="${escapeHtml(governedBy.label)}" data-work-item-id="${escapeHtml(item.id)}">
    ${demonstrated ? '<span class="demo-badge">Demonstrated item</span>' : ''}
    <a class="wi-title" href="#workitem-${escapeHtml(item.id)}" data-parity-field="work-item-id">${escapeHtml(item.id)}</a>
    ${itemTitleWithheld(model)}
    <span class="wi-status" data-parity-field="work-item-status">${escapeHtml(item.status)}</span>
    ${itemGoverningIntent(item.id, governedBy)}
    ${itemVerification(model, item.id)}
    ${workerChangeBadge(model, workerChange, testArtifactVerification, governingIntentId)}
    ${laneBar(item, range)}
  </li>`;
}

const TRAJECTORY_STYLE = `
  .scope-statement { max-width: 78ch; }
  .board { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; padding: 1.5rem 0 3rem; }
  .board-column { background: linear-gradient(145deg, #102126, var(--panel)); border: 1px solid var(--line); padding: 1rem; min-width: 0; }
  .board-column h2 { font-size: 1.1rem; margin: 0 0 .8rem; }
  .board-column .count { color: var(--muted); font-family: var(--font-mono); font-size: .78rem; }
  .wi-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .7rem; }
  .wi-card { background: #091416; border: 1px solid var(--line); padding: .6rem .7rem; display: grid; gap: .3rem; position: relative; }
  .wi-title { display: block; font-family: var(--font-mono); font-size: .82rem; color: var(--ink); text-decoration: none; }
  .wi-title:hover, .wi-title:focus-visible { color: var(--cyan); }
  .wi-id { color: var(--muted); font-size: .7rem; }
  .wi-status { font-family: var(--font-mono); font-size: .7rem; color: var(--muted); text-transform: uppercase; }
  .lane-track { position: relative; height: .35rem; background: #1a2c30; margin-top: .3rem; }
  .lane-bar { position: absolute; top: 0; height: 100%; left: var(--lane-left); width: var(--lane-width); background: var(--cyan); }
  .worker-change { display: grid; gap: .2rem; padding-top: .2rem; border-top: 1px dashed var(--line); }
  .worker-change-detail { font-size: .72rem; color: var(--muted); }
  .worker-change-note { font-size: .68rem; color: var(--muted); }
  .worker-change-label { font-family: var(--font-mono); font-size: .7rem; text-transform: uppercase; color: var(--cyan); }
  .wi-card-demonstrated { border-color: var(--cyan); }
  .demo-badge { color: var(--cyan); font-family: var(--font-mono); font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; }
  .demo-callout { max-width: 78ch; }
  .governing-intent-count, .titles-withheld { max-width: 78ch; }
  .narrow-label { font-family: var(--font-mono); font-size: .78rem; margin-left: .3rem; }
  .narrow-toggle:focus-visible + .narrow-label { outline: 2px solid var(--cyan); outline-offset: 2px; }
  .narrow-toggle:checked ~ .board .wi-card:not([data-governed-by="Unknown"]) { display: none; }
  ${MATERIALIZE_PANEL_STYLE}
`;

export function renderTrajectoryPage(model: PocModel, mountPrefix = '', status?: HumanOperabilityStatus): string {
  const trajectory = model.trajectory;
  const workerChange = model.workerChange.kind === 'observed' ? model.workerChange : null;
  let body: string;
  if (trajectory.kind === 'unknown') {
    const unknown = unknownSubject(model, 'region:work-items');
    body = `<p class="unavailable-notice"${unknownMarker('region:work-items', unknown)}>Unknown — ${escapeHtml(trajectory.reason)}. ${unknownRoute(unknown)} This is a distinct state from an observed-empty board: no board is rendered because the seeded work-item graph is unavailable. Independently observed work-item denominator: Unknown (work items were not independently observed).</p>`;
  } else {
    const byColumn = new Map<TrajectoryColumn, TrajectoryLaneItem[]>();
    for (const column of COLUMN_ORDER) {
      byColumn.set(column, []);
    }
    for (const item of trajectory.rendered) {
      byColumn.get(item.column)?.push(item);
    }
    const demonstratedId = currentMaterializedBeadId(model);
    const demonstratedRendered =
      demonstratedId !== null && trajectory.rendered.some((item) => item.id === demonstratedId);
    const columns = COLUMN_ORDER.map((column) => {
      const items = byColumn.get(column) ?? [];
      return `<section class="board-column" aria-label="${escapeHtml(column)} column">
        <h2>${escapeHtml(column)} <span class="count">(${items.length})</span></h2>
        <ol class="wi-list">${items
          .map((item) =>
            itemCard(
              model,
              item,
              trajectory.timeRange,
              workerChange !== null && workerChange.beadId === item.id ? workerChange : null,
              model.testArtifactVerification,
              model.governingIntentId,
              item.id === demonstratedId,
            ),
          )
          .join('')}</ol>
      </section>`;
    }).join('');

    const demonstratedCallout =
      demonstratedId === null
        ? ''
        : demonstratedRendered
          ? `<p class="demo-callout notice">The demonstrated item is <a href="#workitem-${escapeHtml(demonstratedId)}"><code>${escapeHtml(demonstratedId)}</code></a> — the one work item this POC materialized through its human-triggered action. Every other card is real, unrelated Butlers backlog shown for context.</p>`
          : `<p class="demo-callout notice">The demonstrated item <code>${escapeHtml(demonstratedId)}</code> was materialized by this POC but falls outside the current board selection, so no card is shown for it.</p>`;

    body = `
      <p class="scope-statement notice" data-parity-field="trajectory-scope">
        Rendering ${trajectory.renderedCount} of ${trajectory.totalCount} observed work items (${trajectory.selectionRule});
        <span data-parity-field="trajectory-excluded-count">${trajectory.excludedCount}</span> items are outside this selection and not shown.
      </p>
      ${governingIntentRegion(model, trajectory.rendered)}
      ${titlesWithheldRegion(model)}
      ${demonstratedCallout}
      <div class="board" role="group" aria-label="Work-item board by status column">${columns}</div>`;
  }

  body += renderMaterializePanel(model, mountPrefix);

  return pageShell({
    title: 'Trajectory · Syzygy three-surface POC',
    current: 'trajectory',
    eyebrow: `Trajectory · ${escapeHtml(model.project.name)} ${model.project.revision.slice(0, 12)}`,
    heading: 'Work and time, observed',
    lede: 'A board over the registered Beads Dolt database, columns from a declared status mapping, time from recorded instants only.',
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

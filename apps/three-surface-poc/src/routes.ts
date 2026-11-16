import { escapeHtml, type Route, type RouteResponse } from '@syzygy/http-host';
import { PWB_RESOURCE_LIMITS, buildResponseIdentity, withServedResourceBreaches, type PocEntity, type PocModel, type PocSurface, type PwbResourceLimits, type Reevaluation } from '@syzygy/three-surface-poc-core';

import { BROWSER_ORIGIN_REFUSAL, browserRequestAllowed } from './browser-origin.js';
import { epistemicText, exactTablesSection } from './exact-tables.js';
import { ORRERY_HUMAN_PATH, ORRERY_TAILNET_PATH, renderOrreryPage } from './orrery.js';
import { pageShell, type HumanOperabilityStatus } from './page-shell.js';
import { POLARIS_HUMAN_PATH, POLARIS_TAILNET_PATH, renderPolarisPage, renderPolarisPresentation, type PolarisRenderInputs } from './polaris.js';
import { POLARIS_SOURCE_PATH, POLARIS_SOURCE_TAILNET_PATH, renderPolarisSourcePage, SOURCE_IDENTITY_PARAM } from './polaris-source.js';
import { mountPrefixForRequest, TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { renderTrajectoryPage, TRAJECTORY_HUMAN_PATH, TRAJECTORY_TAILNET_PATH } from './trajectory.js';
import { ServedResponseRecorder } from './served-response-recorder.js';

export { BROWSER_ORIGIN_REFUSAL } from './browser-origin.js';

// Test seam: exported for the tests; production code reaches it only inside this file.
export const POC_HUMAN_PATH = '/' as const;
export const POC_MACHINE_PATH = '/api/poc' as const;
/** The authenticated machine presentation envelope (PWB-REQ-014/020): the
 * Polaris narrative — block, anchor and band multisets — as one JSON body
 * under the machine credential, derived from the same capture as the page.
 * It is a presentation artifact, never citable, and never part of `/api/poc`. */
export const POLARIS_PRESENTATION_PATH = '/api/poc/polaris' as const;
// Test seam: exported for the tests; production code reaches it only inside this file.
export const POLARIS_PRESENTATION_KIND = 'polaris-presentation' as const;

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface PolarisPresentationEnvelope {
  readonly kind: typeof POLARIS_PRESENTATION_KIND;
  readonly version: 1;
  readonly presentation: 'presentation-artifact';
  readonly citable: false;
  readonly evaluation: PocModel['evaluation'];
  readonly evidence: PocModel['evaluation']['evidence'];
  readonly project: { readonly revision: string };
  readonly narrative: ReturnType<typeof renderPolarisPresentation>['narrative'];
  readonly links: NonNullable<PocModel['links']>;
}

/** RFC 9110 weak comparison: a strong member matches a weak selected tag.
 * Malformed conditions are ignored, never promoted to a cache hit. */
function ifNoneMatchMatches(value: string | string[] | undefined, selected: string): boolean {
  if (value === undefined) return false;
  const raw = Array.isArray(value) ? value.join(',') : value;
  if (raw.trim() === '*') return true;
  const members: string[] = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] === '"') quoted = !quoted;
    if (raw[index] === ',' && !quoted) {
      members.push(raw.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quoted) return false;
  members.push(raw.slice(start).trim());
  if (members.some((member) => !/^(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/.test(member))) return false;
  const opaque = (tag: string): string => tag.startsWith('W/') ? tag.slice(2) : tag;
  return members.some((member) => opaque(member) === opaque(selected));
}

function surfacePanel(surface: PocSurface, model: PocModel): string {
  const entities = new Map(model.entities.map((entity) => [entity.id, entity]));
  const items = surface.entityIds
    .map((entityId) => entities.get(entityId))
    .filter((entity): entity is PocEntity => entity !== undefined)
    .map(
      (entity) => `
        <li class="surface-item" data-surface-entity="${escapeHtml(entity.id)}">
          <a href="#${escapeHtml(entity.id)}">${escapeHtml(entity.title)}</a>
          <span class="epistemic epistemic-${entity.epistemic.label.toLowerCase()}">${escapeHtml(entity.epistemic.label)}</span>
          <small>${escapeHtml(epistemicText(entity))}</small>
        </li>`,
    )
    .join('');

  return `
    <section class="surface surface-${surface.id}" id="${surface.id}" data-surface-id="${surface.id}">
      <div class="surface-state-label" data-surface-plane="${surface.id}">${escapeHtml(surface.state)} state</div>
      <div class="surface-kicker">${escapeHtml(surface.question)}</div>
      <h2>${escapeHtml(surface.title)}</h2>
      <ol class="surface-list">${items}</ol>
    </section>`;
}

const HOME_STYLE = `
  .surface-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; padding: 1rem 0 2rem; }
  .surface { min-width: 0; background: linear-gradient(145deg, #102126, var(--panel)); border: 1px solid var(--line); padding: clamp(1.2rem, 3vw, 2rem); box-shadow: 0 18px 45px #0008; }
  .surface-polaris { grid-column: span 7; }
  .surface-trajectory { grid-column: span 5; margin-top: 3rem; }
  .surface-orrery { grid-column: 2 / span 10; }
  .surface h2 { font-size: clamp(2rem, 4vw, 3.4rem); margin: .2rem 0 1rem; }
  .surface-kicker { color: var(--muted); font-size: .78rem; }
  .surface-state-label { color: var(--cyan); font: .72rem/1.4 var(--font-mono); text-transform: uppercase; letter-spacing: .06em; }
  .surface-list { padding: 0; margin: 0; list-style: none; counter-reset: item; }
  .surface-item { display: grid; grid-template-columns: minmax(11rem, 1fr) auto; gap: .4rem 1rem; padding: .8rem 0; border-top: 1px solid var(--line); }
  .surface-item small { grid-column: 1 / -1; color: var(--muted); }
  .tables { padding: 1rem 0 5rem; }
  .tables h2 { font-size: 2.4rem; margin-top: 3rem; }
  .provenance { list-style: none; padding: 0; margin: 0; display: grid; gap: .5rem; }
  .provenance li { display: grid; gap: .1rem; }
  .provenance code { overflow-wrap: anywhere; font-size: .72rem; color: #a9c0bf; }
  .provenance-none { color: var(--unknown); font-size: .8rem; }
  @media (max-width: 800px) { .surface-polaris, .surface-trajectory, .surface-orrery { grid-column: 1 / -1; margin-top: 0; } }
`;

// Test seam: exported for the tests; production code reaches it only inside this file.
export function renderPocPage(model: PocModel, mountPrefix = '', status?: HumanOperabilityStatus): string {
  const surfaces = model.surfaces.map((surface) => surfacePanel(surface, model)).join('');
  const body = `
    <p class="notice"><strong>POC, not product status.</strong> Desired, execution, and observed state remain distinct. Merge is not verification. Missing evidence is rendered Unknown.</p>
    <div class="surface-grid">${surfaces}</div>
    ${exactTablesSection(model, mountPrefix)}`;

  return pageShell({
    title: 'Syzygy · Butlers proof of concept',
    current: 'home',
    eyebrow: `Syzygy · local experiment · Butlers ${model.project.revision.slice(0, 12)}`,
    heading: 'One capability. Three honest views.',
    lede: `${model.project.name} · ${model.entities.find((entity) => entity.id === model.capabilityId)?.title ?? model.capabilityId}`,
    extraStyle: HOME_STYLE,
    body,
    footer: `Evaluation <code>${escapeHtml(model.evaluation.snapshot)}</code> as of <code>${escapeHtml(model.evaluation.asOf)}</code>. Machine facts: authenticated <code>GET ${POC_MACHINE_PATH}</code>.`,
    status,
    surfacePlanes: model.surfaces,
    escapeHtml,
    mountPrefix,
  });
}

// ---------------------------------------------------------------------
// Final-output ceilings (registry `resourceLimits.maxHumanResponseBytes` /
// `maxMachineResponseBytes`, `resourceLimitSemantics.breachResult`;
// PWB-REQ-006 as amended). The limit is measured against the final encoded
// HTTP body of each human HTML response and each authenticated machine
// JSON response. A breach emits only this bounded typed failure: the
// evaluation identity, the limit identity, its declared and observed
// values and the population counts. Nothing is truncated and no
// success-shaped model is served; readiness (PWB-REQ-021) is false.

const RESPONSE_LIMIT_FAILURE = 'response-limit-breached' as const;
const RESPONSE_LIMIT_STATUS = 503 as const;

type ResponseLimitIdentity = 'maxHumanResponseBytes' | 'maxMachineResponseBytes';

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface ResponseLimitFailure {
  readonly served: 'nothing';
  readonly failure: typeof RESPONSE_LIMIT_FAILURE;
  readonly evaluation: PocModel['evaluation'];
  readonly limit: ResponseLimitIdentity;
  readonly declared: number;
  readonly observed: number;
  readonly population:
    | { readonly kind: 'counted'; readonly sources: number; readonly items: number; readonly facts: number; readonly exclusions: number }
    | { readonly kind: 'unknown'; readonly reason: string };
  readonly readiness: false;
}

function populationOf(model: PocModel): ResponseLimitFailure['population'] {
  const shape = model.projectShape;
  if (shape.kind !== 'observed') return { kind: 'unknown', reason: `project shape ${shape.kind}` };
  return { kind: 'counted', sources: shape.counts.sources, items: shape.counts.items, facts: shape.counts.facts, exclusions: shape.counts.exclusions };
}

function responseLimitFailure(model: PocModel, limit: ResponseLimitIdentity, declared: number, observed: number): ResponseLimitFailure {
  return { served: 'nothing', failure: RESPONSE_LIMIT_FAILURE, evaluation: model.evaluation, limit, declared, observed, population: populationOf(model), readiness: false };
}

// Serves `body` only when its UTF-8 encoding fits the named ceiling.
export function boundedResponse(model: PocModel, limits: PwbResourceLimits, limit: ResponseLimitIdentity, contentType: string, body: string, recorder?: ServedResponseRecorder): RouteResponse {
  const observed = Buffer.byteLength(body, 'utf8');
  const declared = limits[limit];
  if (observed <= declared) return { status: 200, contentType, body };
  const failure = responseLimitFailure(model, limit, declared, observed);
  const event = recorder?.record({ evaluation: model.evaluation, limit, declared, observed, population: failure.population });
  return {
    status: RESPONSE_LIMIT_STATUS,
    contentType: 'application/json',
    body: JSON.stringify(failure),
    ...(event === undefined ? {} : { diagnostic: { kind: RESPONSE_LIMIT_FAILURE, ...event } as const }),
  };
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** The served-side projection changes only presentation/readiness. Observation
 * evidence and the PWB-REQ-022 judgment stay on their captured model. */
export function withServedReadiness(model: PocModel, recorder: ServedResponseRecorder): PocModel {
  const count = recorder.snapshot(model.evaluation).count;
  if (count === 0 || model.walkthroughReadiness.kind !== 'evaluated') return model;
  const inputCount = model.projectShape.kind === 'observed' ? model.projectShape.limitBreaches.length : null;
  const readiness = withServedResourceBreaches(model.walkthroughReadiness.readiness, inputCount, count);
  if (readiness === model.walkthroughReadiness.readiness) return model;
  const projected: PocModel = { ...model, walkthroughReadiness: { kind: 'evaluated', readiness } };
  return { ...projected, responseIdentity: buildResponseIdentity(projected) };
}

/** Render-time inputs for Polaris only (PWB-REQ-011's transient verbatim
 * route): derived per request from the model being rendered, never stored.
 * Absent → Polaris renders with no verbatim reader, so requirement text is
 * disclosed as outside the consented class. */
type PolarisRenderInputsFor = (model: PocModel) => PolarisRenderInputs;

export function pocRoutes(getModel: () => PocModel, limits: PwbResourceLimits = PWB_RESOURCE_LIMITS, polarisInputs?: PolarisRenderInputsFor, recorder = new ServedResponseRecorder(), credentialProvision?: () => 'minted' | 'reused' | undefined, reevaluation?: () => Reevaluation | null): readonly Route[] {
  const linksFor = (request: Parameters<Route['handle']>[0]['request']): NonNullable<PocModel['links']> => {
    const mount = mountPrefixForRequest(request.headers);
    const selfPath = mount !== '' && !request.path.startsWith(mount) ? `${mount}${request.path}` : request.path;
    const links = routes.map(({ path, method, credentialClass }) => ({ path, method, credentialClass, self: path === selfPath && method === request.method }));
    if (links.filter((link) => link.self).length !== 1) throw new Error('machine route has no unique self link');
    return links;
  };
  const servedModel = (): PocModel => withServedReadiness(getModel(), recorder);
  const statusFor = (model: PocModel): HumanOperabilityStatus => {
    const snapshot = recorder.snapshot(model.evaluation);
    return {
      evaluationDigest: model.evaluation.inputsDigest,
      projectRevision: model.project.revision,
      observerRevision: model.observerRevision,
      credentialProvision: credentialProvision?.() ?? null,
      inputBreaches: model.projectShape.kind === 'observed' ? model.projectShape.limitBreaches.length : null,
      servedBreaches: snapshot.count,
      latestBreach: snapshot.latest === null ? null : { limit: snapshot.latest.limit, sequence: snapshot.latest.sequence, declared: snapshot.latest.declared, observed: snapshot.latest.observed },
      reevaluation: reevaluation?.() ?? null,
      resourceHeadroom: model.resourceHeadroom,
    };
  };
  const html = (model: PocModel, body: string): RouteResponse => boundedResponse(model, limits, 'maxHumanResponseBytes', 'text/html; charset=utf-8', body, recorder);
  const humanHandle: Route['handle'] = ({ request }) => {
    if (!browserRequestAllowed(request.headers)) {
      return { status: 403, contentType: 'application/json', body: JSON.stringify(BROWSER_ORIGIN_REFUSAL) };
    }
    const model = servedModel();
    return html(model, renderPocPage(model, mountPrefixForRequest(request.headers), statusFor(model)));
  };
  const machineHandle: Route['handle'] = ({ request }) => {
    const projected = { ...servedModel(), links: linksFor(request) };
    const model: PocModel = { ...projected, responseIdentity: buildResponseIdentity(projected) };
    const full = boundedResponse(model, limits, 'maxMachineResponseBytes', 'application/json', JSON.stringify(model), recorder);
    if (full.status !== 200) return full;
    const etag = `W/"${model.responseIdentity.contentKey}"`;
    const revalidation = { etag, cacheControl: 'private, no-cache' } as const;
    return ifNoneMatchMatches(request.headers['if-none-match'], etag)
      ? { status: 304, contentType: full.contentType, body: '', revalidation }
      : { ...full, revalidation };
  };
  const presentationHandle: Route['handle'] = ({ request }) => {
    const model = servedModel();
    const { narrative } = renderPolarisPresentation(model, '', {}, polarisInputs === undefined ? {} : polarisInputs(model));
    const envelope: PolarisPresentationEnvelope = {
      kind: POLARIS_PRESENTATION_KIND,
      version: 1,
      presentation: 'presentation-artifact',
      citable: false,
      evaluation: model.evaluation,
      evidence: model.evaluation.evidence,
      project: { revision: model.project.revision },
      narrative,
      links: linksFor(request),
    };
    return boundedResponse(model, limits, 'maxMachineResponseBytes', 'application/json', JSON.stringify(envelope), recorder);
  };
  // The exact-source route: human-open like the page, keyed by the source
  // identity in the query, rendering only revision/digest-verified text.
  const sourceHandle: Route['handle'] = ({ request }) => {
    if (!browserRequestAllowed(request.headers)) {
      return { status: 403, contentType: 'application/json', body: JSON.stringify(BROWSER_ORIGIN_REFUSAL) };
    }
    const model = servedModel();
    const identity = request.query.get(SOURCE_IDENTITY_PARAM) ?? '';
    return html(model, renderPolarisSourcePage(model, identity, mountPrefixForRequest(request.headers), polarisInputs === undefined ? {} : polarisInputs(model), statusFor(model)));
  };

  function humanSurfaceRoutes(
    directPath: string,
    tailnetPath: string,
    render: (model: PocModel, mountPrefix: string, status: HumanOperabilityStatus) => string,
  ): readonly Route[] {
    const handle: Route['handle'] = ({ request }) => {
      if (!browserRequestAllowed(request.headers)) {
        return { status: 403, contentType: 'application/json', body: JSON.stringify(BROWSER_ORIGIN_REFUSAL) };
      }
      const model = servedModel();
      return html(model, render(model, mountPrefixForRequest(request.headers), statusFor(model)));
    };
    return [
      { method: 'GET', path: directPath, credentialClass: 'human-open', handle },
      { method: 'GET', path: tailnetPath, credentialClass: 'human-open', handle },
    ];
  }

  const routes: readonly Route[] = [
    { method: 'GET', path: POC_HUMAN_PATH, credentialClass: 'human-open', handle: humanHandle },
    {
      method: 'GET',
      path: TAILNET_MOUNT_PREFIX,
      credentialClass: 'human-open',
      handle: humanHandle,
    },
    {
      method: 'GET',
      path: `${TAILNET_MOUNT_PREFIX}/`,
      credentialClass: 'human-open',
      handle: humanHandle,
    },
    ...humanSurfaceRoutes(POLARIS_HUMAN_PATH, POLARIS_TAILNET_PATH, (model, mountPrefix, status) => renderPolarisPage(model, mountPrefix, {}, polarisInputs === undefined ? {} : polarisInputs(model), status)),
    { method: 'GET', path: POLARIS_SOURCE_PATH, credentialClass: 'human-open', handle: sourceHandle },
    { method: 'GET', path: POLARIS_SOURCE_TAILNET_PATH, credentialClass: 'human-open', handle: sourceHandle },
    ...humanSurfaceRoutes(TRAJECTORY_HUMAN_PATH, TRAJECTORY_TAILNET_PATH, renderTrajectoryPage),
    ...humanSurfaceRoutes(ORRERY_HUMAN_PATH, ORRERY_TAILNET_PATH, renderOrreryPage),
    {
      method: 'GET',
      path: POC_MACHINE_PATH,
      credentialClass: 'machine-credentialed',
      handle: machineHandle,
    },
    {
      method: 'GET',
      path: `${TAILNET_MOUNT_PREFIX}${POC_MACHINE_PATH}`,
      credentialClass: 'machine-credentialed',
      handle: machineHandle,
    },
    { method: 'GET', path: POLARIS_PRESENTATION_PATH, credentialClass: 'machine-credentialed', handle: presentationHandle },
    { method: 'GET', path: `${TAILNET_MOUNT_PREFIX}${POLARIS_PRESENTATION_PATH}`, credentialClass: 'machine-credentialed', handle: presentationHandle },
  ];
  return routes;
}

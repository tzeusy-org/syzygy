import { escapeHtml } from '@syzygy/http-host';
import type { PocModel, ProjectShape, UnknownReason } from '@syzygy/three-surface-poc-core';

import { resolveVerbatim, type VerbatimLeafReader, type VerbatimResolution } from './capability-detail.js';
import { pageShell, type HumanOperabilityStatus } from './page-shell.js';
import { copyAttr, copyText, roleAttr } from './polaris-copy.js';
import { TAILNET_MOUNT_PREFIX, withMountPrefix } from './tailnet.js';

/**
 * The exact-source route (PWB-REQ-011 as amended 2026-09-05; PWB-LIVE-13).
 *
 * `GET /polaris/source?identity=<source identity>` renders the requirement
 * and scenario text of one admitted baseline spec, byte-for-byte, from the
 * one Git object the evaluation captured — or nothing. The route accepts a
 * stable source identity (`<repository>@<revision>:<path>#<object id>`,
 * exactly as the sources table carries it), resolves it only against the
 * signed population of the current evaluation, and reads only that object
 * through the same render-time reader the deep dive uses: the reader
 * re-applies admission (P1-gated population, baseline-spec rule, exact
 * revision, exact identity, not excluded, classified, a blob), the resource
 * envelope, the secret detectors and the active-content scan, and
 * `resolveVerbatim` re-checks the digest and selects requirement blocks.
 * Working-tree bytes are never consulted; nothing is stored.
 *
 * The route is human-open like `/polaris` (browser-origin refusal applies,
 * tailnet mount rebinds links) and authenticates the text by revision and
 * digest, not by bearer: the same identity that names the row names the
 * text, and a mismatch renders Unknown with its reason and no bytes.
 * Polaris is never the authority for what it shows here (RFC7-1).
 */
export const POLARIS_SOURCE_PATH = '/polaris/source' as const;
export const POLARIS_SOURCE_TAILNET_PATH = `${TAILNET_MOUNT_PREFIX}/polaris/source` as const;
export const SOURCE_IDENTITY_PARAM = 'identity' as const;

/** The id slug of a source's row on `/polaris` (`polaris-source-<slug>`). */
export function sourceSlug(path: string): string {
  return path.replace(/[^A-Za-z0-9]+/g, '-');
}

/** The route href for one source identity under a mount. */
export function sourceRouteHref(mountPrefix: string, identity: string): string {
  return `${withMountPrefix(mountPrefix, POLARIS_SOURCE_PATH)}?${SOURCE_IDENTITY_PARAM}=${encodeURIComponent(identity)}`;
}

/** Every identity a served page links to the route, in document order with
 * repeats, read back from the links' own `href` (the one carrier of the
 * identity; no attribute restates it). The inverse of `sourceRouteHref`
 * under either mount. */
export function sourceRouteIdentities(html: string): string[] {
  // The attribute value is HTML-escaped after percent-encoding, so an
  // apostrophe (which encodeURIComponent leaves raw) arrives as `&#39;`:
  // capture the whole quoted value, unescape the entities, then decode.
  const pattern = new RegExp(`href="([^"]*${POLARIS_SOURCE_PATH.replace(/\//g, '\\/')}\\?${SOURCE_IDENTITY_PARAM}=[^"]*)"`, 'g');
  return Array.from(html.matchAll(pattern), (match) => {
    const href = unescapeAttribute(match[1] as string);
    const encoded = href.slice(href.indexOf(`${SOURCE_IDENTITY_PARAM}=`) + SOURCE_IDENTITY_PARAM.length + 1);
    return decodeURIComponent(encoded);
  });
}

function unescapeAttribute(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

type SourceRouteResolution =
  | { readonly kind: 'rendered'; readonly path: string; readonly resolution: Extract<VerbatimResolution, { kind: 'rendered' }> }
  | { readonly kind: 'not-rendered'; readonly path: string | undefined; readonly reason: UnknownReason; readonly route: string; readonly detail: string };

function shapeReason(shape: Exclude<ProjectShape, { kind: 'observed' }>): { readonly reason: UnknownReason; readonly route: string } {
  const epistemic = shape.claim.epistemic;
  const reason = 'reasons' in epistemic ? epistemic.reasons.primary : 'unconsented-source-or-provider';
  return { reason, route: shape.claim.resolutionRoutes[0]?.route ?? 'No route recorded' };
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/**
 * Resolves one identity against the evaluation. Only an identity the signed
 * population carries is ever handed to the reader; every other identity is
 * Unknown (reference-unresolvable) with nothing read.
 */
export function resolveSourceRoute(model: PocModel, identity: string, reader: VerbatimLeafReader | undefined): SourceRouteResolution {
  const shape = model.projectShape;
  if (shape.kind !== 'observed') {
    const { reason, route } = shapeReason(shape);
    return { kind: 'not-rendered', path: undefined, reason, route, detail: `The project shape is ${shape.kind}; no source population exists to resolve the identity against.` };
  }
  if (identity === '') {
    return { kind: 'not-rendered', path: undefined, reason: 'reference-unresolvable', route: 'Name a source identity from the sources table', detail: copyText('sentence.no-identity-named') };
  }
  const source = shape.sources.find((candidate) => candidate.identity === identity);
  if (source === undefined) {
    return { kind: 'not-rendered', path: undefined, reason: 'reference-unresolvable', route: 'Name a source identity from the sources table of this evaluation', detail: copyText('sentence.identity-not-in-population') };
  }
  const resolution = resolveVerbatim({ path: source.path, revision: shape.identity.revision, identity }, reader);
  if (resolution.kind === 'rendered') return { kind: 'rendered', path: source.path, resolution };
  return { kind: 'not-rendered', path: source.path, reason: resolution.reason, route: resolution.route, detail: resolution.detail };
}

interface PolarisSourceRenderInputs {
  readonly verbatim?: VerbatimLeafReader;
}

const FACT = roleAttr('project-fact');
const DISCLOSURE = roleAttr('epistemic-disclosure');

const SOURCE_STYLE = `
  .source-route .verbatim { white-space: pre-wrap; border: 1px solid var(--line); padding: .75rem; overflow-x: auto; font-family: var(--font-mono); }
  .source-route .unknown-disclosure { color: var(--unknown); border-left: 3px solid var(--unknown); padding-left: .9rem; }
  .source-route .notice { border: 1px dashed var(--line); padding: .75rem 1rem; }
  .source-route .identity { word-break: break-all; }
`;

/** Renders the exact-source route for one identity as a full page. */
export function renderPolarisSourcePage(model: PocModel, identity: string, mountPrefix = '', inputs: PolarisSourceRenderInputs = {}, status?: HumanOperabilityStatus): string {
  const resolved = resolveSourceRoute(model, identity, inputs.verbatim);
  const identityLine = identity === ''
    ? ''
    : `<p class="identity"${FACT}>${copyText('label.identity')} <code data-verbatim-identity="${escapeHtml(identity)}">${escapeHtml(identity)}</code></p>`;
  const back = resolved.path === undefined
    ? `<p><a href="${escapeHtml(withMountPrefix(mountPrefix, '/polaris'))}#polaris-shape-sources"${copyAttr('label.back-to-source-row')}>${escapeHtml(copyText('label.back-to-source-row'))}</a></p>`
    : `<p><a href="${escapeHtml(withMountPrefix(mountPrefix, '/polaris'))}#polaris-source-${escapeHtml(sourceSlug(resolved.path))}" data-source-ref="${escapeHtml(resolved.path)}"${copyAttr('label.back-to-source-row')}>${escapeHtml(copyText('label.back-to-source-row'))}</a></p>`;
  const body = resolved.kind === 'rendered'
    ? resolved.resolution.requirements
        .map((requirement) => `<pre class="verbatim" data-verbatim-text data-verbatim-requirement="${escapeHtml(requirement.title)}" data-verbatim-identity="${escapeHtml(resolved.resolution.identity)}"${roleAttr('project-fact', 'anchored-project-fact')}>${escapeHtml(requirement.text)}</pre>`)
        .join('\n')
    : `<p class="unknown-disclosure" data-unknown-disclosure="source-route" data-unknown-reason="${escapeHtml(resolved.reason)}"${DISCLOSURE}>${escapeHtml(copyText('label.unknown'))} — ${escapeHtml(resolved.reason)}. ${escapeHtml(copyText('label.route'))} ${escapeHtml(resolved.route)}.<br><small>${escapeHtml(resolved.detail)}</small></p>`;
  const section = `<section class="source-route" data-polaris-source-route data-verbatim="${resolved.kind === 'rendered' ? 'rendered' : 'not-rendered'}"${resolved.path === undefined ? '' : ` data-source-path="${escapeHtml(resolved.path)}"`}>
    <p class="notice"${copyAttr('source.not-authority')}>${escapeHtml(copyText('source.not-authority'))}</p>
    ${identityLine}
    ${body}
    ${back}
  </section>`;
  return pageShell({
    title: 'Polaris exact source · Syzygy three-surface POC',
    current: 'polaris',
    eyebrow: `Polaris · Butlers ${model.project.revision.slice(0, 12)}`,
    heading: copyText('source.heading'),
    lede: copyText('source.lede'),
    extraStyle: SOURCE_STYLE,
    body: section,
    footer: `Evaluation <code>${escapeHtml(model.evaluation.snapshot)}</code> as of <code>${escapeHtml(model.evaluation.asOf)}</code>.`,
    status,
    escapeHtml,
    mountPrefix,
  });
}

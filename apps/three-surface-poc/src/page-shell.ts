import { DESIGN_TOKENS_CSS, legendHtml, skipLinkHtml } from './design-tokens.js';
import type { PocSurface, Reevaluation, ResourceHeadroom } from '@syzygy/three-surface-poc-core';
import { doltClockText, observatoryLimbText, projectLimbText } from './reevaluation-copy.js';
import { resourceHeadroomLine } from './resource-headroom-line.js';
import type { ServedResponseLimit } from './served-response-recorder.js';
import { withMountPrefix } from './tailnet.js';

const RESPONSE_LIMIT_LABELS: Readonly<Record<ServedResponseLimit, string>> = {
  maxHumanResponseBytes: 'human',
  maxMachineResponseBytes: 'machine',
  maxBriefingResponseBytes: 'briefing',
};

type SurfaceRouteId = 'home' | 'polaris' | 'trajectory' | 'orrery';

const STATE_PURPOSE: Readonly<Record<PocSurface['state'], string>> = {
  desired: 'what this project is meant to be',
  execution: 'what work is underway',
  observed: 'what code and evidence show',
};

function surfacePlanePhrase(surface: PocSurface): string {
  return `${surface.title} · ${surface.state} state · ${STATE_PURPOSE[surface.state]}`;
}

// The legends open <main> (syzygy-u05.4), where nothing inherits the
// footer's framing role, so the state-plane line carries the role itself.
const STATE_LEGEND_ROLE = 'data-copy-role="project-fact" data-claim-role="non-normative-framing" data-presentation-artifact data-non-citable';

function surfaceStateLegend(surfaces: readonly PocSurface[], escapeHtml: (value: string) => string): string {
  if (surfaces.length === 0) return `<p class="state-plane-legend" data-surface-state-legend ${STATE_LEGEND_ROLE}>Surface state mapping unavailable: no seed-backed surfaces were evaluated.</p>`;
  return `<p class="state-plane-legend" data-surface-state-legend aria-label="Surface state plane legend" ${STATE_LEGEND_ROLE}>${surfaces.map(surface =>
    `<span data-surface-state-map="${escapeHtml(surface.id)}">${escapeHtml(surface.title)} holds the ${escapeHtml(surface.state)} state</span>`).join('; ')}.</p>`;
}

export interface HumanOperabilityStatus {
  readonly evaluationDigest: string | null;
  readonly projectRevision: string | null;
  readonly observerRevision: string | null;
  readonly credentialProvision: 'minted' | 'reused' | null;
  readonly inputBreaches: number | null;
  readonly servedBreaches: number | null;
  readonly latestBreach: { readonly limit: ServedResponseLimit; readonly sequence: number; readonly declared: number; readonly observed: number } | null;
  /** The latest named re-evaluation (syzygy-u05.2); absent renders Unknown. */
  readonly reevaluation?: Reevaluation | null;
  /** The model's resource-ledger headroom block (syzygy-u05.3); absent renders Unknown. */
  readonly resourceHeadroom?: ResourceHeadroom | null;
}

/** One compact, non-verdict summary. Prefixes are labeled as prefixes; full
 * identities remain on the existing detailed surface. */
function humanStatusLine(status: HumanOperabilityStatus | undefined, escapeHtml: (value: string) => string): string {
  const evaluation = status?.evaluationDigest === undefined || status.evaluationDigest === null ? 'Unknown (absent)' : `sha256:${status.evaluationDigest.slice(0, 12)}…`;
  const project = status?.projectRevision === undefined || status.projectRevision === null ? 'Unknown (no project rev)' : `${status.projectRevision.slice(0, 12)}…`;
  const observer = status?.observerRevision === undefined || status.observerRevision === null ? 'Unknown (no observer rev)' : `${status.observerRevision.slice(0, 12)}…`;
  const credential = status?.credentialProvision ?? 'Unknown (not supplied)';
  const input = status?.inputBreaches === undefined || status.inputBreaches === null ? 'Unknown (no shape)' : String(status.inputBreaches);
  const served = status?.servedBreaches === undefined || status.servedBreaches === null ? 'Unknown (no recorder)' : String(status.servedBreaches);
  const latest = status?.latestBreach === null || status?.latestBreach === undefined
    ? ''
    : `; ${RESPONSE_LIMIT_LABELS[status.latestBreach.limit]} #${status.latestBreach.sequence} ${status.latestBreach.observed}/${status.latestBreach.declared} B`;
  return `<p class="operability-status" data-human-status data-eval="${escapeHtml(status?.evaluationDigest?.slice(0, 12) ?? 'unknown')}" data-breaches="${status?.servedBreaches ?? 'unknown'}" data-copy-role="epistemic-disclosure" data-claim-role="epistemic-claim" data-presentation-artifact data-non-citable>Eval ${escapeHtml(evaluation)}; project ${escapeHtml(project)}; observer ${escapeHtml(observer)}; credential ${escapeHtml(credential)}; breaches input ${escapeHtml(input)}, served ${escapeHtml(served)}${latest}</p>
  <p class="operability-limbs" data-human-limbs data-copy-role="epistemic-disclosure" data-claim-role="epistemic-claim" data-presentation-artifact data-non-citable>Observed-project limb: ${escapeHtml(projectLimbText(status?.reevaluation ?? null))}; observatory limb: ${escapeHtml(observatoryLimbText(status?.reevaluation ?? null))}; Dolt clock: ${escapeHtml(doltClockText(status?.reevaluation ?? null))}</p>
  ${resourceHeadroomLine(status?.resourceHeadroom, escapeHtml)}`;
}

const NAV_ITEMS: readonly { readonly id: SurfaceRouteId; readonly href: string; readonly label: string }[] = [
  { id: 'home', href: '/', label: 'Overview' },
  { id: 'polaris', href: '/polaris', label: 'Polaris' },
  { id: 'trajectory', href: '/trajectory', label: 'Trajectory' },
  { id: 'orrery', href: '/orrery', label: 'Orrery' },
];

function siteNav(
  current: SurfaceRouteId,
  mountPrefix: string,
  escapeHtml: (value: string) => string,
): string {
  const items = NAV_ITEMS.map((item) => {
    const current_ = item.id === current ? ' aria-current="page"' : '';
    const href = withMountPrefix(mountPrefix, item.href);
    return `<li><a href="${escapeHtml(href)}"${current_} data-copy-role="action-label" data-claim-role="non-normative-framing" data-presentation-artifact data-non-citable>${escapeHtml(item.label)}</a></li>`;
  }).join('');
  return `<nav class="site-nav" aria-label="Three-surface POC sections"><ul>${items}</ul></nav>`;
}

interface PageShellInput {
  readonly title: string;
  readonly current: SurfaceRouteId;
  readonly eyebrow: string;
  readonly heading: string;
  readonly lede: string;
  readonly extraStyle?: string;
  readonly readingLayout?: boolean;
  readonly body: string;
  /** Early, native page shortcuts; Polaris uses these before the global nav. */
  readonly earlyLinks?: string;
  readonly sidebar?: string;
  readonly footer: string;
  readonly status?: HumanOperabilityStatus;
  /** One evaluated model table supplies the page phrase and all legend rows. */
  readonly surfacePlanes?: readonly PocSurface[];
  readonly escapeHtml: (value: string) => string;
  /** The mount this page is being rendered under (`''` direct, or
   * `TAILNET_MOUNT_PREFIX` when reached via `tailscale serve`) — every
   * nav link is built relative to it. Defaults to `''`. */
  readonly mountPrefix?: string;
}

export function pageShell(input: PageShellInput): string {
  const escapeHtml = input.escapeHtml;
  const mountPrefix = input.mountPrefix ?? '';
  const currentSurface = input.surfacePlanes?.find(surface => surface.id === input.current);
  const eyebrow = currentSurface === undefined ? input.eyebrow : surfacePlanePhrase(currentSurface);
  const stateLegend = input.surfacePlanes === undefined ? '' : surfaceStateLegend(input.surfacePlanes, escapeHtml);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.title)}</title>
  <style>${DESIGN_TOKENS_CSS}.operability-status{margin:.5rem auto 1rem;max-width:var(--content-width,90rem);padding:.4rem 1rem;border:1px solid var(--line);color:var(--muted);font:.75rem/1.45 var(--font-mono);overflow-wrap:anywhere}.state-plane-legend{color:var(--muted);font:.8rem/1.5 var(--font-mono);max-width:var(--content-width,90rem)}${input.extraStyle ?? ''}</style>
</head>
<body>
  ${skipLinkHtml('main-content')}
  ${input.earlyLinks ?? ''}
  ${input.readingLayout ? siteNav(input.current, mountPrefix, escapeHtml) : ''}
  ${input.sidebar === undefined ? '' : '<div class="reading-layout">'}
  <header>
    <div class="eyebrow" data-copy-role="project-fact" data-claim-role="non-normative-framing" data-presentation-artifact data-non-citable${currentSurface === undefined ? '' : ` data-surface-plane="${escapeHtml(currentSurface.id)}"`}>${escapeHtml(eyebrow)}</div>
    <h1 data-copy-role="project-fact" data-claim-role="non-normative-framing" data-presentation-artifact data-non-citable>${escapeHtml(input.heading)}</h1>
    <p class="lede" data-copy-role="scope-instruction" data-claim-role="non-normative-framing" data-presentation-artifact data-non-citable>${escapeHtml(input.lede)}</p>
  </header>
  ${humanStatusLine(input.status, escapeHtml)}
  ${input.sidebar === undefined ? '' : `<aside class="reading-sidebar">${input.sidebar}</aside>`}
  ${input.readingLayout ? '' : siteNav(input.current, mountPrefix, escapeHtml)}
  <main id="main-content">
    ${legendHtml(escapeHtml) + stateLegend}
    ${input.body}
  </main>
  <footer data-copy-role="project-fact" data-claim-role="non-normative-framing" data-presentation-artifact data-non-citable>${input.footer}</footer>
  ${input.sidebar === undefined ? '' : '</div>'}
</body>
</html>`;
}

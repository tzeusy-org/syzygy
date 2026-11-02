import { escapeHtml } from '@syzygy/http-host';
import type { PocModel, UnknownReason } from '@syzygy/three-surface-poc-core';

import { exactTablesSection } from './exact-tables.js';
import { substrateEvaluationFooter } from './evaluation-footer.js';
import { pageShell, type HumanOperabilityStatus } from './page-shell.js';
import { capabilityDeepDiveId, crossSurfaceHref } from './surface-links.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { unknownMarker, unknownRoute, unknownSubject } from './unknown-marker.js';

export const ORRERY_HUMAN_PATH = '/orrery' as const;
export const ORRERY_TAILNET_PATH = `${TAILNET_MOUNT_PREFIX}/orrery` as const;

interface OrreryDataIsland {
  readonly revision: string;
  readonly districts: readonly {
    readonly id: string;
    readonly path: string;
    readonly fileCount: number;
    readonly totalBytes: number;
    readonly languages: readonly string[];
  }[];
  readonly mappedRegions: readonly {
    readonly id: string;
    readonly path: string;
    readonly capabilityId: string;
    readonly capabilityHref: string | null;
    readonly capabilityTargetId: string;
    readonly sizeBytes: number;
  }[];
  readonly mappedFileCount: number;
  readonly unmappedFileCount: number;
  readonly totalFileCount: number;
  readonly unmappedRegionEntityId: string;
  /** The unmapped region's closed reason and route, from the model (M4 slice 1). */
  readonly unmappedRegionUnknown: { readonly reason: UnknownReason; readonly route: string; readonly actor: string; readonly verb: string; readonly target: string } | null;
}

const ORRERY_STYLE = `
  .unavailable-notice { max-width: 78ch; margin: 1rem 0; }
  #orrery-canvas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
    align-items: end;
    gap: .6rem;
    padding: 1.5rem 0 2rem;
    min-height: 8rem;
  }
  .orrery-block {
    position: relative;
    border: 1px solid var(--line);
    background: linear-gradient(160deg, #102126, var(--panel));
    padding: .6rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: var(--block-height, 4rem);
    overflow-wrap: anywhere;
  }
  .orrery-block .block-label { font-family: var(--font-mono); font-size: .68rem; color: var(--muted); }
  .orrery-block.mapped { border-color: var(--cyan); }
  .orrery-block.mapped a { display: block; color: var(--cyan); text-decoration: none; font-size: .78rem; }
  .orrery-block.unmapped { border-style: dashed; }
  .orrery-block.unmapped a { font-size: .78rem; text-decoration: none; }
  .orrery-scope { max-width: 78ch; }
  .orrery-height-legend { color: var(--muted); font-size: .78rem; max-width: 78ch; margin: 0 0 1rem; }
`;

/**
 * Deterministic (POC-REQ-050): a pure function of the JSON island's data,
 * itself the same `model.orrery` object served at `GET /api/poc` — no
 * randomness, no server-derived layout hints beyond directory grouping and
 * declared mappings.
 */
const CLIENT_SCRIPT = `
(function () {
  var dataEl = document.getElementById('orrery-data');
  var canvas = document.getElementById('orrery-canvas');
  if (!dataEl || !canvas) return;
  var data;
  try { data = JSON.parse(dataEl.textContent || '{}'); } catch (e) { return; }
  canvas.innerHTML = '';
  var maxBytes = 1;
  (data.districts || []).forEach(function (d) { if (d.totalBytes > maxBytes) maxBytes = d.totalBytes; });

  (data.districts || []).slice().sort(function (a, b) {
    return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  }).forEach(function (district) {
    var block = document.createElement('div');
    block.className = 'orrery-block';
    block.dataset.parityField = 'orrery-district';
    block.dataset.districtId = district.id;
    var height = 3 + (district.totalBytes / maxBytes) * 6;
    block.style.setProperty('--block-height', height.toFixed(2) + 'rem');
    var label = document.createElement('span');
    label.className = 'block-label';
    label.textContent = district.path + ' (' + district.fileCount + ' files)';
    block.appendChild(label);
    canvas.appendChild(block);
  });

  (data.mappedRegions || []).forEach(function (region) {
    var block = document.createElement('div');
    block.className = 'orrery-block mapped';
    var link = document.createElement('a');
    link.href = '#' + region.id;
    link.dataset.parityField = 'orrery-mapped-region';
    link.textContent = region.path;
    block.appendChild(link);
    if (region.capabilityHref) {
      var capabilityLink = document.createElement('a');
      capabilityLink.href = region.capabilityHref;
      capabilityLink.dataset.crossSurfaceClass = 'mapped-capability';
      capabilityLink.dataset.crossSource = region.id;
      capabilityLink.dataset.crossTarget = region.capabilityTargetId;
      capabilityLink.textContent = 'Read capability in Polaris: ' + region.capabilityId;
      capabilityLink.setAttribute('aria-label', capabilityLink.textContent);
      block.appendChild(capabilityLink);
    } else {
      var unavailable = document.createElement('span');
      unavailable.className = 'cross-surface-unavailable';
      unavailable.dataset.crossSurfaceUnavailable = 'mapped-capability';
      unavailable.textContent = 'Capability target unavailable in this evaluation: ' + region.capabilityId;
      block.appendChild(unavailable);
    }
    canvas.appendChild(block);
  });

  if (data.unmappedFileCount > 0) {
    var unmapped = document.createElement('div');
    unmapped.className = 'orrery-block unmapped';
    unmapped.dataset.unknownDisclosure = data.unmappedRegionEntityId;
    var unmappedLink = document.createElement('a');
    unmappedLink.href = '#' + data.unmappedRegionEntityId;
    unmappedLink.dataset.parityField = 'orrery-unmapped-region';
    unmappedLink.textContent = 'Unknown — Unmapped (' + data.unmappedFileCount + ' files)';
    unmapped.appendChild(unmappedLink);
    var known = data.unmappedRegionUnknown;
    if (known) {
      unmapped.dataset.unknownReason = known.reason;
      var route = document.createElement('span');
      route.dataset.unknownRoute = known.reason;
      route.dataset.routeActor = known.actor;
      route.dataset.routeVerb = known.verb;
      route.dataset.routeTarget = known.target;
      route.textContent = known.route;
      unmapped.appendChild(document.createTextNode(' Route: '));
      unmapped.appendChild(route);
      unmapped.appendChild(document.createTextNode('.'));
    }
    canvas.appendChild(unmapped);
  }
})();
`;

function unmappedRegionUnknown(model: PocModel): OrreryDataIsland['unmappedRegionUnknown'] {
  const entity = model.entities.find((candidate) => candidate.id === 'region:unmapped-code');
  if (entity === undefined || entity.epistemic.label !== 'Unknown') return null;
  const [route] = entity.epistemic.resolutionRoutes;
  return { reason: entity.epistemic.closedReason, route: route.route, actor: route.actor, verb: route.verb, target: route.target };
}

export function renderOrreryPage(model: PocModel, mountPrefix = '', status?: HumanOperabilityStatus): string {
  const orrery = model.orrery;
  let body: string;

  if (orrery.kind === 'unknown') {
    const observedFileDenominator =
      orrery.observedFileCount === undefined
        ? 'Unknown (code structure was not observed)'
        : String(orrery.observedFileCount);
    const mappedFileCount = orrery.mappedFileCount === undefined ? 'Unknown' : String(orrery.mappedFileCount);
    const unmappedFileCount = orrery.unmappedFileCount === undefined ? 'Unknown' : String(orrery.unmappedFileCount);
    const unknown = unknownSubject(model, 'region:code-structure');
    body = `<p class="unavailable-notice"${unknownMarker('region:code-structure', unknown)}>Unknown — ${escapeHtml(orrery.reason)} ${unknownRoute(unknown)} The seed-backed map is unavailable; observed-file denominator: ${escapeHtml(observedFileDenominator)}; mapped: ${escapeHtml(mappedFileCount)}; unmapped: ${escapeHtml(unmappedFileCount)}. The exact tables below remain the honest record of what is known.</p>
    ${exactTablesSection(model, mountPrefix)}`;
  } else {
    const island: OrreryDataIsland = {
      revision: orrery.revision,
      districts: orrery.districts,
      mappedRegions: orrery.mappedRegions.map(region => ({ ...region,
        capabilityHref: crossSurfaceHref(model, 'polaris', region.capabilityId, mountPrefix),
        capabilityTargetId: capabilityDeepDiveId(region.capabilityId),
      })),
      mappedFileCount: orrery.mappedFileCount,
      unmappedFileCount: orrery.unmappedFileCount,
      totalFileCount: orrery.totalFileCount,
      unmappedRegionEntityId: 'region:unmapped-code',
      unmappedRegionUnknown: unmappedRegionUnknown(model),
    };
    const islandJson = JSON.stringify(island).replace(/</g, '\\u003c');

    body = `
      <p class="orrery-scope notice" data-parity-field="orrery-scope">
        ${orrery.mappedFileCount} of ${orrery.totalFileCount} observed files sit in a declared mapping;
        <span data-parity-field="orrery-unmapped-count">${orrery.unmappedFileCount}</span> are unmapped and shown as an explicit Unknown region.
        Revision <code>${escapeHtml(orrery.revision.slice(0, 12))}</code>.
      </p>
      <noscript>
        <p class="unavailable-notice">The spatial city rendering requires JavaScript and is unavailable without it. The same facts are in the exact tables below.</p>
      </noscript>
      <section id="orrery-canvas" aria-label="Spatial code city (JavaScript-rendered; see exact tables for the no-script form)"></section>
      <p class="orrery-height-legend">District blocks have a minimum height that grows with relative byte size; longer labels may add height.</p>
      <script type="application/json" id="orrery-data">${islandJson}</script>
      <script>${CLIENT_SCRIPT}</script>
      ${exactTablesSection(model, mountPrefix)}`;
  }

  return pageShell({
    title: 'Orrery · Syzygy three-surface POC',
    current: 'orrery',
    eyebrow: `Orrery · ${escapeHtml(model.project.name)} ${model.project.revision.slice(0, 12)}`,
    heading: 'Where the code lives',
    lede: 'A deterministic spatial map over observed directory structure and declared capability-to-code mappings. Unmapped code stays visibly Unknown.',
    extraStyle: ORRERY_STYLE,
    body,
    status,
    surfacePlanes: model.surfaces,
    footer: substrateEvaluationFooter({
      model,
      escapeHtml,
      revisionOf: 'the observed code structure (git tree)',
      revision: orrery.kind === 'observed' ? orrery.revision : null,
      skewChecks:
        orrery.kind === 'observed'
          ? [
              {
                label: "this surface's code-structure revision",
                observed: orrery.revision,
                expected: model.project.revision,
              },
              ...(model.codeStructure.kind === 'observed'
                ? [
                    {
                      label: "this surface's code-structure capture instant",
                      observed: model.codeStructure.capturedAt,
                      expected: model.evaluation.asOf,
                    },
                  ]
                : []),
            ]
          : [],
    }),
    escapeHtml,
    mountPrefix,
  });
}

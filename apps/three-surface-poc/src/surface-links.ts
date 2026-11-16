import { escapeHtml } from '@syzygy/http-host';
import type { PocModel, PocSurface } from '@syzygy/three-surface-poc-core';

import { sourceSlug } from './polaris-source.js';
import { withMountPrefix } from './tailnet.js';

type SurfaceId = PocSurface['id'];
type CrossSurfaceClass = 'work-count' | 'code-count' | 'reality-entity' | 'governing-intent' | 'mapped-capability' | 'action-route';

const ROUTES: Readonly<Record<SurfaceId, string>> = {
  polaris: '/polaris', trajectory: '/trajectory', orrery: '/orrery',
};

export function capabilityDeepDiveId(capabilityId: string): string {
  return `polaris-deep-dive-${sourceSlug(capabilityId)}`;
}

/** A route is emitted only when the same evaluated model can supply its
 * target. Orrery entities live in the exact table, never inside details. */
export function crossSurfaceHref(model: PocModel, target: SurfaceId, targetId: string | null, mountPrefix: string): string | null {
  if (!model.surfaces.some(surface => surface.id === target)) return null;
  if (targetId !== null) {
    if (target === 'orrery' && !model.entities.some(entity => entity.id === targetId)) return null;
    if (target === 'polaris' && !model.entities.some(entity => entity.id === targetId && entity.kind === 'capability')) return null;
    // The one Trajectory fragment a model route names: the read-only
    // materialize preview (M4 slice 1's action route).
    if (target === 'trajectory' && targetId !== 'materialize-panel') return null;
  }
  const fragment = targetId === null ? '' : target === 'polaris' ? capabilityDeepDiveId(targetId) : targetId;
  return `${withMountPrefix(mountPrefix, ROUTES[target])}${fragment === '' ? '' : `#${fragment}`}`;
}

export function crossSurfaceLink(input: {
  readonly model: PocModel;
  readonly className: CrossSurfaceClass;
  readonly sourceId: string;
  readonly target: SurfaceId;
  readonly targetId: string | null;
  readonly mountPrefix: string;
  readonly label: string;
  /** `label-first`: the accessible name begins with the visible label, as
   * PWB-REQ-016 requires on a Polaris page where a differently targeted
   * element shares that label (P-99 v1.0). Absent: the surface's form. */
  readonly nameForm?: 'label-first';
}): string {
  const href = crossSurfaceHref(input.model, input.target, input.targetId, input.mountPrefix);
  const exactTarget = input.targetId === null ? input.target
    : input.target === 'polaris' ? capabilityDeepDiveId(input.targetId) : input.targetId;
  const attrs = `data-cross-surface-class="${input.className}" data-cross-source="${escapeHtml(input.sourceId)}" data-cross-target="${escapeHtml(exactTarget)}"`;
  if (href === null) return `<span class="cross-surface-unavailable" data-cross-surface-unavailable="${input.className}" ${attrs}>${escapeHtml(input.label)} — target unavailable in this evaluation</span>`;
  const targetName = input.model.surfaces.find(surface => surface.id === input.target)?.title ?? input.target;
  const name = input.nameForm === 'label-first' ? `${input.label} — read on ${targetName}` : `Read ${input.label} on ${targetName}`;
  return `<a href="${escapeHtml(href)}" aria-label="${escapeHtml(name)}" ${attrs}>${escapeHtml(input.label)}</a>`;
}

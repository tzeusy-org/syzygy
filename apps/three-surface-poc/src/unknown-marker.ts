import { escapeHtml } from '@syzygy/http-host';
import type { PocModel, PocUnknown } from '@syzygy/three-surface-poc-core';

import { crossSurfaceLink } from './surface-links.js';

// The one Unknown encoding the three surfaces share (POC-REQ-060; M4
// slice 1, P-71): a disclosure names its subject id, its closed RFC2-24
// reason and its route, each read from the model under that id, so the
// human route and its machine twin cannot differ.

/** The marker pair on the disclosure element itself. */
export function unknownMarker(id: string, epistemic: PocUnknown): string {
  return ` data-unknown-disclosure="${escapeHtml(id)}" data-unknown-reason="${escapeHtml(epistemic.closedReason)}"`;
}

/** "Route: <route>." per carried route, the route's machine form (actor,
 * verb, target) on its span (M4 slice 2). `label` is HTML; Polaris passes
 * its registered copy. */
export function unknownRoute(epistemic: PocUnknown, label = 'Route:'): string {
  return epistemic.resolutionRoutes
    .map((route) => `${label} <span data-unknown-route="${escapeHtml(route.reason)}" data-route-actor="${route.actor}" data-route-verb="${route.verb}" data-route-target="${route.target}">${escapeHtml(route.route)}</span>.`)
    .join(' ');
}

/** The action route, mount-prefix-aware, as a marked cross-surface link.
 * Following it writes nothing: it opens the read-only materialize preview. */
export function actionRouteLink(model: PocModel, id: string, epistemic: PocUnknown, mountPrefix: string, label = 'Materialize preview', nameForm?: 'label-first'): string {
  const action = epistemic.actionRoute;
  if (action === undefined) return '';
  return ` ${crossSurfaceLink({ model, className: 'action-route', sourceId: id, target: action.surface, targetId: action.anchor, mountPrefix, label, ...(nameForm === undefined ? {} : { nameForm }) })}`;
}

/** The model's Unknown for a non-claim subject; a disclosure with no
 * machine twin is a thrown invariant, never a rendered route. */
export function unknownSubject(model: PocModel, id: string): PocUnknown {
  const subject = model.unknownSubjects.find((entry) => entry.id === id);
  if (subject === undefined) throw new Error(`no machine Unknown for rendered disclosure ${id}`);
  return subject.epistemic;
}

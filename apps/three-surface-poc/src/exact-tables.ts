import { escapeHtml } from '@syzygy/http-host';
import type { PocEntity, PocModel, PocRelationship } from '@syzygy/three-surface-poc-core';

import { actionRouteLink, unknownMarker, unknownRoute } from './unknown-marker.js';

export function epistemicText(item: Pick<PocEntity | PocRelationship, 'epistemic'>): string {
  return item.epistemic.label === 'Observed' ? item.epistemic.basis : item.epistemic.reason;
}

function epistemicCell(item: PocEntity | PocRelationship): string {
  return `<td><span class="epistemic epistemic-${item.epistemic.label.toLowerCase()}" data-parity-field="epistemic-label">${escapeHtml(item.epistemic.label)}</span><br><small data-parity-field="epistemic-explanation">${escapeHtml(epistemicText(item))}</small></td>`;
}

// With no positive provenance the row's Unknown is disclosed here, in the
// shared marker with its closed reason and route (M4 slice 1): the
// `provenance-none` span is the marker, never a bare sibling of it.
function provenanceList(model: PocModel, item: PocEntity | PocRelationship, mountPrefix: string): string {
  if (item.provenance.length === 0) {
    if (item.epistemic.label !== 'Unknown') throw new Error(`${item.id}: Observed with no provenance`);
    return `<span class="provenance-none"${unknownMarker(item.id, item.epistemic)}>No positive provenance; this relationship remains Unknown. ${unknownRoute(item.epistemic)}${actionRouteLink(model, item.id, item.epistemic, mountPrefix)}</span>`;
  }
  return `<ul class="provenance">${item.provenance
    .map(
      (provenance) => `<li data-parity-provenance>
        <span data-parity-field="provenance-kind">${escapeHtml(provenance.kind)}</span>
        <code data-parity-field="provenance-source">${escapeHtml(provenance.source)}</code>
        <code data-parity-field="provenance-revision">${escapeHtml(provenance.revision)}</code>
        ${provenance.digest === undefined ? '' : `<code data-parity-field="provenance-digest">${escapeHtml(provenance.digest)}</code>`}
      </li>`,
    )
    .join('')}</ul>`;
}

// Test seam: exported for the tests; production code reaches it only inside this file.
export function entityRows(model: PocModel, mountPrefix = ''): string {
  return model.entities
    .map(
      (entity) => `<tr id="${escapeHtml(entity.id)}" data-entity-id="${escapeHtml(entity.id)}">
        <td><span class="kind" data-parity-field="entity-kind">${escapeHtml(entity.kind)}</span></td>
        <td><code data-parity-field="entity-id">${escapeHtml(entity.id)}</code><br><strong data-parity-field="entity-title">${escapeHtml(entity.title)}</strong><br><small data-parity-field="entity-detail">${escapeHtml(entity.detail)}</small></td>
        ${epistemicCell(entity)}
        <td>${provenanceList(model, entity, mountPrefix)}</td>
      </tr>`,
    )
    .join('');
}

// Test seam: exported for the tests; production code reaches it only inside this file.
export function relationshipRows(model: PocModel, mountPrefix = ''): string {
  return model.relationships
    .map(
      (relationship) => `<tr id="${escapeHtml(relationship.id)}" data-relationship-id="${escapeHtml(relationship.id)}">
        <td><span class="kind" data-parity-field="relationship-kind">${escapeHtml(relationship.kind)}</span></td>
        <td><code data-parity-field="relationship-id">${escapeHtml(relationship.id)}</code><br><a data-parity-field="relationship-from" href="#${escapeHtml(relationship.from)}">${escapeHtml(relationship.from)}</a><br>→ <a data-parity-field="relationship-to" href="#${escapeHtml(relationship.to)}">${escapeHtml(relationship.to)}</a></td>
        <td><span data-parity-field="relationship-statement">${escapeHtml(relationship.statement)}</span></td>
        ${epistemicCell(relationship)}
        <td>${provenanceList(model, relationship, mountPrefix)}</td>
      </tr>`,
    )
    .join('');
}

export function exactTablesSection(model: PocModel, mountPrefix = ''): string {
  return `<section class="tables" aria-label="Exact graph tables">
      <h2 id="entities">Exact entities</h2>
      <div class="table-wrap"><table><thead><tr><th>Kind</th><th>Entity</th><th>Epistemic state</th><th>Provenance</th></tr></thead><tbody>${entityRows(model, mountPrefix)}</tbody></table></div>
      <h2 id="relationships">Exact relationships</h2>
      <div class="table-wrap"><table><thead><tr><th>Kind</th><th>Path</th><th>Claim</th><th>Epistemic state</th><th>Provenance</th></tr></thead><tbody>${relationshipRows(model, mountPrefix)}</tbody></table></div>
    </section>`;
}

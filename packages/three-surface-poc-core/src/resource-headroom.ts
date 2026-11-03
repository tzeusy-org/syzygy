import type { ProjectShape } from './project-shape-model.js';
import { PWB_RESOURCE_LIMITS, type PwbResourceLimits } from './project-shape-observation.js';
import {
  DECLARED_RESOURCE_LIMIT_IDENTITIES,
  type ResourceLedgerCostRecord,
  type ResourceLimitObservation,
} from './resource-ledger.js';

// The resource ledger on the surfaces (pursuit N3 slice 3, syzygy-u05.3).
// One machine block, `PocModel.resourceHeadroom`, carries the ledger's
// headroom against all seven declared limits and its cost record, each a
// tuple with its own id so the human status entry is compared with it per
// tuple, by id. Purely derived from `ResourceLedgerSummary` (VIS-6): no new
// observation and no new limit. When no ledger ran (the project shape was
// not observed) every observed and remaining value and the cost record are
// Unknown with the reason, never zero (VIS-2); the declared limits are the
// registry's and stay known. The block carries no capture instant, so the
// response identity's content key covers it and no exclusion is added.

type ResourceHeadroomId = `resource-headroom:${keyof PwbResourceLimits}`;

export interface ResourceHeadroomEntry {
  readonly id: ResourceHeadroomId;
  readonly limit: keyof PwbResourceLimits;
  readonly declared: number;
  readonly observed: ResourceLimitObservation;
  readonly remaining: ResourceLimitObservation;
}

const RESOURCE_COST_ID = 'resource-cost' as const;

type ResourceCost =
  | ({ readonly id: typeof RESOURCE_COST_ID; readonly state: 'observed' } & ResourceLedgerCostRecord)
  | { readonly id: typeof RESOURCE_COST_ID; readonly state: 'unknown'; readonly reason: string };

export interface ResourceHeadroom {
  /** All seven declared limits, in the registry's order. */
  readonly entries: readonly ResourceHeadroomEntry[];
  readonly cost: ResourceCost;
}

function resourceHeadroomId(limit: keyof PwbResourceLimits): ResourceHeadroomId {
  return `resource-headroom:${limit}`;
}

export function resourceHeadroom(shape: ProjectShape, limits: PwbResourceLimits = PWB_RESOURCE_LIMITS): ResourceHeadroom {
  if (shape.kind === 'observed') {
    const { byLimit, cost } = shape.resourceUse;
    return {
      entries: DECLARED_RESOURCE_LIMIT_IDENTITIES.map((limit) => ({ id: resourceHeadroomId(limit), ...byLimit[limit] })),
      cost: { id: RESOURCE_COST_ID, state: 'observed', ...cost },
    };
  }
  const reason = `no resource ledger ran: the project shape is ${shape.kind}`;
  const unknown: ResourceLimitObservation = { state: 'unknown', reason };
  return {
    entries: DECLARED_RESOURCE_LIMIT_IDENTITIES.map((limit) => ({
      id: resourceHeadroomId(limit),
      limit,
      declared: limits[limit],
      observed: unknown,
      remaining: unknown,
    })),
    cost: { id: RESOURCE_COST_ID, state: 'unknown', reason },
  };
}

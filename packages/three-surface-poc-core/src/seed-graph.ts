// The seeded entity/relationship graph: validation and the role tables that
// map each seed to its claim. One row per role carries the kind the role
// requires, the claim's epistemic state and its provenance, so a role's whole
// meaning is read in one place (syzygy-bpyt.7.1).

import { observed, unknown, type PocEpistemic } from './epistemic.js';
import type { MaterializationEpistemic } from './model-slices.js';
import type { PocEntity, PocProvenance, PocRelationship, PocSurface } from './model.js';
import { PocObservationError } from './poc-observation-error.js';
import type { PocSeedEntity, PocSeedInput, PocSeedRelationship } from './poc-seeds.js';

export interface ObservedArtifact {
  readonly path: string;
  readonly digest: string;
}

export type SeedArtifacts = Readonly<Record<'design' | 'proposal' | 'requirement' | 'code' | 'test', ObservedArtifact>>;

export interface SeedObservationContext {
  readonly artifacts: SeedArtifacts;
  readonly mappingProvenance: PocProvenance;
  readonly gitProvenance: PocProvenance;
  readonly materialization: MaterializationEpistemic;
}

export function fileProvenance(artifact: ObservedArtifact, repositoryRevision: string): PocProvenance {
  return {
    kind: 'repository-file',
    source: artifact.path,
    revision: repositoryRevision,
    digest: `sha256:${artifact.digest}`,
  };
}

interface RoleClaim {
  readonly epistemic: (context: SeedObservationContext) => PocEpistemic;
  readonly provenance: (context: SeedObservationContext) => readonly PocProvenance[];
}

interface EntityRole extends RoleClaim {
  readonly kind: PocEntity['kind'];
  /** Replaces the seed's rendered detail; absent keeps it. */
  readonly detail?: (detail: string, context: SeedObservationContext) => string;
}

interface RelationshipRole extends RoleClaim {
  readonly kind: string;
}

const file = (name: keyof SeedArtifacts) => (context: SeedObservationContext): PocProvenance =>
  fileProvenance(context.artifacts[name], context.gitProvenance.revision);
const none = (): readonly PocProvenance[] => [];
const mapped = (name: 'code' | 'test') => (context: SeedObservationContext): readonly PocProvenance[] =>
  [file(name)(context), context.mappingProvenance];
const materialized = (context: SeedObservationContext): readonly PocProvenance[] => context.materialization.provenance;

const MISSING_TEST_ARTIFACT = 'No test artifact has been captured for this evaluation.';
const MISSING_RUNTIME = 'No current runtime observation was supplied.';

export const ENTITY_ROLES: Readonly<Record<PocSeedEntity['role'], EntityRole>> = {
  project: {
    kind: 'project',
    epistemic: () => observed('Git reported the configured repository revision.'),
    provenance: (context) => [context.gitProvenance],
  },
  capability: {
    kind: 'capability',
    epistemic: () => observed('Validated intent markers name this capability and record approval.'),
    provenance: (context) => [file('design')(context), file('requirement')(context)],
  },
  intent: {
    kind: 'intent',
    epistemic: () => observed('Required approval, identifier, and relationship markers were validated.'),
    provenance: (context) => [file('design')(context), file('proposal')(context), file('requirement')(context)],
  },
  code: {
    kind: 'code-region',
    epistemic: () => observed('The manually mapped code file was captured and hashed.'),
    provenance: mapped('code'),
  },
  'test-definition': {
    kind: 'test-definition',
    epistemic: () => observed('The manually mapped test file was captured and hashed.'),
    provenance: mapped('test'),
  },
  work: {
    kind: 'work-item',
    detail: (detail, context) =>
      context.materialization.beadId === null ? detail : `Materialized as Beads item ${context.materialization.beadId}.`,
    epistemic: (context) => context.materialization.epistemic,
    provenance: materialized,
  },
  'test-evidence': {
    kind: 'test-evidence',
    epistemic: () => unknown('missing-evidence', MISSING_TEST_ARTIFACT),
    provenance: none,
  },
  runtime: {
    kind: 'runtime',
    epistemic: () => unknown('missing-evidence', MISSING_RUNTIME),
    provenance: none,
  },
  'unknown-region': {
    kind: 'unknown-region',
    epistemic: () => unknown('mapping-coverage-absent', 'The first slice does not enumerate or map the remaining code.'),
    provenance: none,
  },
};

function materializationStatement(context: SeedObservationContext): PocEpistemic {
  const { beadId, origin } = context.materialization;
  if (beadId === null) {
    return unknown('missing-evidence', 'The human-triggered materialization step has not run.', { surface: 'trajectory', anchor: 'materialize-panel' });
  }
  const verb = origin === 'created' ? 'created' : origin === 'reused' ? 'reused the existing' : 'created or reused';
  return observed(`The human-triggered materialization step ${verb} Beads item ${beadId}.`);
}

export const RELATIONSHIP_ROLES: Readonly<Record<PocSeedRelationship['role'], RelationshipRole>> = {
  'project-to-capability': {
    kind: 'contains',
    epistemic: () => observed('The selected requirement is present in the configured repository.'),
    provenance: (context) => [file('requirement')(context)],
  },
  'capability-to-intent': {
    kind: 'governed-by',
    epistemic: () => observed('The relationship is declared by the bounded POC mapping.'),
    provenance: (context) => [file('requirement')(context), context.mappingProvenance],
  },
  'capability-to-code': {
    kind: 'mapped-to',
    epistemic: () => observed('The mapping and mapped file are both identified.'),
    provenance: mapped('code'),
  },
  'capability-to-test-definition': {
    kind: 'mapped-to',
    epistemic: () => observed('The mapping and mapped file are both identified.'),
    provenance: mapped('test'),
  },
  'intent-to-work': {
    kind: 'materializes-as',
    epistemic: materializationStatement,
    provenance: materialized,
  },
  'work-to-code': {
    kind: 'changes',
    epistemic: () => unknown('missing-evidence', 'No materialized work item or worker change was supplied.'),
    provenance: none,
  },
  'code-to-evidence': {
    kind: 'verified-by',
    epistemic: () => unknown('missing-evidence', MISSING_TEST_ARTIFACT),
    provenance: none,
  },
  'code-to-runtime': {
    kind: 'satisfies-at-runtime',
    epistemic: () => unknown('missing-evidence', MISSING_RUNTIME),
    provenance: none,
  },
  'capability-to-unmapped-region': {
    kind: 'coverage-unknown',
    epistemic: () => unknown('mapping-coverage-absent', 'The bounded POC mapping makes no claim about other code.'),
    provenance: none,
  },
};

// The role-to-kind maps validation reads, derived from the tables as plain
// objects so an unsupported role resolves exactly as a literal map would.
const kindByRole = <Role extends string, Kind>(table: Readonly<Record<Role, { readonly kind: Kind }>>): Readonly<Record<Role, Kind>> =>
  Object.fromEntries(Object.entries<{ readonly kind: Kind }>(table).map(([role, row]) => [role, row.kind])) as Record<Role, Kind>;
const ENTITY_KIND_BY_ROLE = kindByRole(ENTITY_ROLES);
const RELATIONSHIP_KIND_BY_ROLE = kindByRole(RELATIONSHIP_ROLES);

const SURFACE_IDS: ReadonlySet<PocSurface['id']> = new Set(['polaris', 'trajectory', 'orrery']);
const SURFACE_STATES: Readonly<Record<PocSurface['id'], PocSurface['state']>> = {
  polaris: 'desired', trajectory: 'execution', orrery: 'observed',
};

function duplicateValues(values: readonly string[], label: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) errors.push(`${label} contains duplicate id ${value}`);
    seen.add(value);
  }
}

export function validateSeedGraph(seeds: PocSeedInput): void {
  const errors: string[] = [];
  const entityIds = new Set<string>();
  const relationshipIds = new Set<string>();
  const capabilityIds = new Set<string>();

  for (const entity of seeds.entities) {
    if (entityIds.has(entity.id)) errors.push(`entities contains duplicate id ${entity.id}`);
    entityIds.add(entity.id);
    if (entity.id === '') errors.push('entities contains an empty id');
    const expectedKind = ENTITY_KIND_BY_ROLE[entity.role];
    if (expectedKind === undefined) {
      errors.push(`entity ${entity.id} has unsupported role ${String(entity.role)}`);
    } else if (entity.kind !== expectedKind) {
      errors.push(`entity ${entity.id} role ${entity.role} requires kind ${expectedKind}, got ${entity.kind}`);
    }
    if (entity.role === 'capability') capabilityIds.add(entity.id);
  }
  if (capabilityIds.size === 0) errors.push('entities has no capability role');

  for (const relationship of seeds.relationships) {
    if (relationshipIds.has(relationship.id)) {
      errors.push(`relationships contains duplicate id ${relationship.id}`);
    }
    relationshipIds.add(relationship.id);
    if (relationship.id === '') errors.push('relationships contains an empty id');
    const expectedKind = RELATIONSHIP_KIND_BY_ROLE[relationship.role];
    if (expectedKind === undefined) {
      errors.push(`relationship ${relationship.id} has unsupported role ${String(relationship.role)}`);
    } else if (relationship.kind !== expectedKind) {
      errors.push(`relationship ${relationship.id} role ${relationship.role} requires kind ${expectedKind}, got ${relationship.kind}`);
    }
    if (!entityIds.has(relationship.from)) {
      errors.push(`relationship ${relationship.id} has dangling from endpoint ${relationship.from}`);
    }
    if (!entityIds.has(relationship.to)) {
      errors.push(`relationship ${relationship.id} has dangling to endpoint ${relationship.to}`);
    }
  }

  const surfaceIds = seeds.surfaces.map((surface) => surface.id);
  duplicateValues(surfaceIds, 'surfaces', errors);
  for (const requiredSurface of SURFACE_IDS) {
    if (!surfaceIds.includes(requiredSurface)) errors.push(`surfaces is missing ${requiredSurface}`);
  }
  for (const surface of seeds.surfaces) {
    if (!SURFACE_IDS.has(surface.id)) errors.push(`surface has unsupported id ${String(surface.id)}`);
    if (surface.state !== SURFACE_STATES[surface.id]) {
      errors.push(`surface ${surface.id} requires state ${SURFACE_STATES[surface.id]}, got ${String(surface.state)}`);
    }
    duplicateValues(surface.entityIds, `surface ${surface.id} entityIds`, errors);
    duplicateValues(surface.relationshipIds, `surface ${surface.id} relationshipIds`, errors);
    for (const entityId of surface.entityIds) {
      if (!entityIds.has(entityId)) errors.push(`surface ${surface.id} has dangling entity member ${entityId}`);
    }
    for (const relationshipId of surface.relationshipIds) {
      if (!relationshipIds.has(relationshipId)) {
        errors.push(`surface ${surface.id} has dangling relationship member ${relationshipId}`);
      }
    }
  }

  const mappingIds: string[] = [];
  const mappingPaths: string[] = [];
  for (const mapping of seeds.orreryMappings) {
    mappingIds.push(mapping.id);
    mappingPaths.push(mapping.path);
    if (!capabilityIds.has(mapping.capabilityId)) {
      errors.push(`Orrery mapping ${mapping.id} has dangling capability ${mapping.capabilityId}`);
    }
  }
  duplicateValues(mappingIds, 'Orrery mappings', errors);
  duplicateValues(mappingPaths, 'Orrery mapping paths', errors);

  if (errors.length > 0) {
    throw new PocObservationError('invalid-seed-graph', undefined, errors.join('; '));
  }
}

function renderSeedText(text: string, seeds: PocSeedInput): string {
  return text.replace(
    /\{(projectName|codePath|testPath)\}/g,
    (_match, key: 'projectName' | 'codePath' | 'testPath') => {
      if (key === 'projectName') return seeds.project.displayName;
      if (key === 'codePath') return seeds.artifacts.code;
      return seeds.artifacts.test;
    },
  );
}

export function entityFromSeed(seed: PocSeedEntity, seeds: PocSeedInput, context: SeedObservationContext): PocEntity {
  const role = ENTITY_ROLES[seed.role];
  const detail = renderSeedText(seed.detail, seeds);
  return {
    id: seed.id,
    kind: seed.kind,
    title: renderSeedText(seed.title, seeds),
    detail: role.detail === undefined ? detail : role.detail(detail, context),
    epistemic: role.epistemic(context),
    provenance: role.provenance(context),
  };
}

export function relationshipFromSeed(
  seed: PocSeedRelationship,
  seeds: PocSeedInput,
  context: SeedObservationContext,
): PocRelationship {
  const role = RELATIONSHIP_ROLES[seed.role];
  return {
    id: seed.id,
    kind: seed.kind,
    from: seed.from,
    to: seed.to,
    statement: renderSeedText(seed.statement, seeds),
    epistemic: role.epistemic(context),
    provenance: role.provenance(context),
  };
}

/** Surface membership as served: Orrery holds every entity and relationship;
 * the other two keep their seeded members, copied so the model owns them. */
export function surfacesFromSeeds(
  seeds: PocSeedInput,
  entities: readonly PocEntity[],
  relationships: readonly PocRelationship[],
): PocSurface[] {
  return seeds.surfaces.map((surface) => ({
    id: surface.id,
    state: surface.state,
    title: surface.title,
    question: surface.question,
    entityIds: surface.id === 'orrery' ? entities.map((entity) => entity.id) : [...surface.entityIds],
    relationshipIds: surface.id === 'orrery' ? relationships.map((relationship) => relationship.id) : [...surface.relationshipIds],
  }));
}

export function capabilityIdFromSeeds(seeds: PocSeedInput): string {
  const capability = seeds.entities.find((entity) => entity.role === 'capability');
  if (capability === undefined) {
    throw new PocObservationError('invalid-seed-graph', undefined, 'entities has no capability role');
  }
  return capability.id;
}

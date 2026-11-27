import type { ProjectId, RepositoryId } from './identity.js';
import { UNKNOWN_REASONS } from './vocabulary.js';
import { parseDeclarationSource } from './yaml-dialect.js';

// Declaration reading, validation, registration, and root designation —
// pure functions over declaration text. Callers hand in source; no I/O
// happens here. Behavior is bound by CAP1-REQ-001…006 (the adopted spec)
// and RFC3-4/RFC3-5/RFC3-9 (the manifests contract).

// The closed top-level field set, in RFC3-5's table order. The set is
// CLOSED: a top-level field outside this list is a validation failure
// naming the field (RFC3-5; CAP1-REQ-003/004). Nothing in RFC3-5 marks
// any field optional, and inferring optionality would itself be the
// inference CAP1-REQ-004 prohibits — so every field is required.
export const DECLARATION_FIELDS = [
  'schema_version',
  'project',
  'owner',
  'repositories',
  'consents',
  'declarations',
  'relations',
  'profiles',
] as const;
export type DeclarationField = (typeof DECLARATION_FIELDS)[number];

// The closed per-entry repository role pair (RFC3-5, repositories[] row).
export const REPOSITORY_ROLES = ['governance-root', 'observed-source'] as const;
export type RepositoryRole = (typeof REPOSITORY_ROLES)[number];

// The Unknown reason for a missing/invalid declaration, taken from the
// closed vocabulary by position — the tuple type makes this a compile
// error if the vocabulary is ever reordered, so the spelling is imported,
// never restrung (RFC2-24; CAP1-REQ-002/006).
const MISSING_DECLARATION: 'missing-declaration' = UNKNOWN_REASONS[0];

export type NamedValidationFailure =
  | {
      readonly kind: 'unparseable' | 'missing-field' | 'unknown-field' | 'invalid-field';
      readonly field?: string;
      readonly detail: string;
    }
  | {
      readonly kind: 'write-boundary-contradiction';
      readonly field: string;
      readonly routedTo: 'owner';
      readonly detail: string;
    };

// Reserved write-boundary fields covered by the CAP1-REQ-061 conformance
// and route fixtures. Their presence is the contradiction (RFC3-3).
const WRITE_BOUNDARY_FIELDS = new Set([
  'write_roots',
  'writable_paths',
  'write_paths',
  'output_directory',
  'deploy_target',
]);

function writeBoundaryContradiction(field: string): NamedValidationFailure {
  return {
    kind: 'write-boundary-contradiction',
    field,
    routedTo: 'owner',
    detail: 'This field cannot widen the governed write boundary. Route this contradiction to the owner.',
  };
}

export interface RepositoryEntry {
  readonly id: RepositoryId;
  readonly role: RepositoryRole;
  readonly consent: string;
}

export interface RelationEntry {
  readonly type: string;
  readonly project: string;
}

// The typed structure for the closed fields. Every value is carried from
// the declaration source — never created, corrected, defaulted, or
// inferred (CAP1-REQ-004; RFC3-9).
export interface ProjectDeclaration {
  readonly schemaVersion: string;
  readonly project: { readonly id: ProjectId; readonly name: string };
  readonly owner: string;
  readonly repositories: readonly RepositoryEntry[];
  readonly consents: readonly string[];
  readonly declarations: Readonly<Record<string, unknown>>;
  readonly relations: readonly RelationEntry[];
  readonly profiles: readonly string[];
}

export type DeclarationReadResult =
  | { readonly ok: true; readonly declaration: ProjectDeclaration }
  | { readonly ok: false; readonly failures: readonly NamedValidationFailure[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a sequence';
  return typeof value === 'object' ? 'a mapping' : typeof value;
}

// Reads and validates a declaration source against the closed field set.
// Validation only reports: it never fills in, corrects, or guesses a
// field (CAP1-REQ-004). Every failure is named so a reader can enumerate
// what is wrong from the output alone (CAP1-REQ-002/003).
export function readDeclaration(source: string): DeclarationReadResult {
  const parsed = parseDeclarationSource(source);
  if (!parsed.ok) {
    // Unparseable input is one named failure carrying the dialect error
    // (CAP1-REQ-002, "Unparseable file" scenario).
    return {
      ok: false,
      failures: [{ kind: 'unparseable', detail: parsed.error }],
    };
  }

  const doc = parsed.value;
  if (!isPlainObject(doc)) {
    return {
      ok: false,
      failures: [
        {
          kind: 'invalid-field',
          detail: `declaration root must be a mapping of the closed field set; got ${describe(doc)}`,
        },
      ],
    };
  }

  const failures: NamedValidationFailure[] = [];
  const known = new Set<string>(DECLARATION_FIELDS);

  // Every missing required field is named, one failure each, so the
  // reader can enumerate what is missing from the output alone
  // (CAP1-REQ-003).
  for (const field of DECLARATION_FIELDS) {
    if (!(field in doc)) {
      failures.push({
        kind: 'missing-field',
        field,
        detail: `required field \`${field}\` is missing`,
      });
    }
  }

  // The field set is closed: every unknown top-level field is a named
  // failure (RFC3-5; CAP1-REQ-004 — an unrecognized field is surfaced,
  // never silently dropped or reinterpreted).
  for (const field of Object.keys(doc)) {
    if (WRITE_BOUNDARY_FIELDS.has(field)) {
      failures.push(writeBoundaryContradiction(field));
    } else if (!known.has(field)) {
      failures.push({
        kind: 'unknown-field',
        field,
        detail: `field \`${field}\` is not in the closed declaration field set`,
      });
    }
  }

  const invalid = (field: string, detail: string): void => {
    failures.push({ kind: 'invalid-field', field, detail });
  };

  // --- schema_version ---
  const schemaVersion = doc['schema_version'];
  if ('schema_version' in doc && !isNonEmptyString(schemaVersion)) {
    invalid('schema_version', `\`schema_version\` must be a non-empty string; got ${describe(schemaVersion)}`);
  }

  // --- project: opaque identifier + display-name label (RFC1-10) ---
  const project = doc['project'];
  let projectId: string | undefined;
  let projectName: string | undefined;
  if ('project' in doc) {
    if (!isPlainObject(project)) {
      invalid('project', `\`project\` must be a mapping with \`id\` and \`name\`; got ${describe(project)}`);
    } else {
      if (!isNonEmptyString(project['id'])) {
        invalid('project.id', '`project.id` (the opaque project identifier) must be a non-empty string');
      } else {
        projectId = project['id'];
      }
      if (!isNonEmptyString(project['name'])) {
        invalid('project.name', '`project.name` (the display-name label) must be a non-empty string');
      } else {
        projectName = project['name'];
      }
    }
  }

  // --- owner ---
  const owner = doc['owner'];
  if ('owner' in doc && !isNonEmptyString(owner)) {
    invalid('owner', `\`owner\` must be a non-empty string; got ${describe(owner)}`);
  }

  // --- repositories[] ---
  const repositories: RepositoryEntry[] = [];
  const rawRepositories = doc['repositories'];
  if ('repositories' in doc) {
    if (!Array.isArray(rawRepositories)) {
      invalid('repositories', `\`repositories\` must be a sequence; got ${describe(rawRepositories)}`);
    } else {
      rawRepositories.forEach((entry: unknown, i: number) => {
        if (!isPlainObject(entry)) {
          invalid(`repositories[${i}]`, `repository entry must be a mapping; got ${describe(entry)}`);
          return;
        }
        let entryOk = true;
        if (!isNonEmptyString(entry['id'])) {
          invalid(`repositories[${i}].id`, 'repository `id` (the opaque repository identifier, RFC1-2) must be a non-empty string');
          entryOk = false;
        }
        const role = entry['role'];
        if (!REPOSITORY_ROLES.includes(role as RepositoryRole)) {
          invalid(`repositories[${i}].role`, `repository \`role\` must be one of ${REPOSITORY_ROLES.join(' | ')}`);
          entryOk = false;
        }
        if (!isNonEmptyString(entry['consent'])) {
          invalid(`repositories[${i}].consent`, 'repository `consent` (the consent-record reference) must be a non-empty string');
          entryOk = false;
        }
        if (entryOk) {
          repositories.push({
            id: entry['id'] as RepositoryId,
            role: entry['role'] as RepositoryRole,
            consent: entry['consent'] as string,
          });
        }
      });
    }
  }

  // --- consents[] ---
  const consents: string[] = [];
  const rawConsents = doc['consents'];
  if ('consents' in doc) {
    if (!Array.isArray(rawConsents)) {
      invalid('consents', `\`consents\` must be a sequence of consent-record references; got ${describe(rawConsents)}`);
    } else {
      rawConsents.forEach((entry: unknown, i: number) => {
        if (!isNonEmptyString(entry)) {
          invalid(`consents[${i}]`, 'consent reference must be a non-empty string');
        } else {
          consents.push(entry);
        }
      });
    }
  }

  // --- declarations ---
  const declarations = doc['declarations'];
  if (isPlainObject(declarations)) {
    for (const field of Object.keys(declarations)) {
      if (WRITE_BOUNDARY_FIELDS.has(field)) {
        failures.push(writeBoundaryContradiction(`declarations.${field}`));
      }
    }
  } else if ('declarations' in doc) {
    invalid('declarations', `\`declarations\` must be a mapping of declaration-artifact references; got ${describe(declarations)}`);
  }

  // --- relations[] ---
  const relations: RelationEntry[] = [];
  const rawRelations = doc['relations'];
  if ('relations' in doc) {
    if (!Array.isArray(rawRelations)) {
      invalid('relations', `\`relations\` must be a sequence; got ${describe(rawRelations)}`);
    } else {
      rawRelations.forEach((entry: unknown, i: number) => {
        if (!isPlainObject(entry)) {
          invalid(`relations[${i}]`, `relation entry must be a mapping; got ${describe(entry)}`);
          return;
        }
        let entryOk = true;
        if (!isNonEmptyString(entry['type'])) {
          invalid(`relations[${i}].type`, 'relation `type` must be a non-empty string');
          entryOk = false;
        }
        if (!isNonEmptyString(entry['project'])) {
          invalid(`relations[${i}].project`, 'relation `project` (the counterpart project identifier) must be a non-empty string');
          entryOk = false;
        }
        if (entryOk) {
          relations.push({
            type: entry['type'] as string,
            project: entry['project'] as string,
          });
        }
      });
    }
  }

  // --- profiles[] ---
  const profiles: string[] = [];
  const rawProfiles = doc['profiles'];
  if ('profiles' in doc) {
    if (!Array.isArray(rawProfiles)) {
      invalid('profiles', `\`profiles\` must be a sequence of profile names; got ${describe(rawProfiles)}`);
    } else {
      rawProfiles.forEach((entry: unknown, i: number) => {
        if (!isNonEmptyString(entry)) {
          invalid(`profiles[${i}]`, 'profile name must be a non-empty string');
        } else {
          profiles.push(entry);
        }
      });
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return {
    ok: true,
    declaration: {
      schemaVersion: schemaVersion as string,
      project: { id: projectId as ProjectId, name: projectName as string },
      owner: owner as string,
      repositories,
      consents,
      declarations: declarations as Record<string, unknown>,
      relations,
      profiles,
    },
  };
}

export interface RegistrationFacts {
  readonly projectId: ProjectId;
  readonly displayName: string;
  // The source snapshot this registration was computed at — the answer
  // names its identified evaluation (CAP1-REQ-005). The as-of instant is
  // the caller's; this pure layer holds no clock.
  readonly revision: string;
  readonly validation: 'valid';
  // Root designation comes from the file's location, never a field value
  // (RFC3-4; CAP1-REQ-001).
  readonly rootDesignation: 'declared-location';
}

// The failed arm carries no facts field at the type level: invalid input
// never produces a partial registration (CAP1-REQ-002).
export type RegistrationResult =
  | { readonly status: 'registered'; readonly facts: RegistrationFacts }
  | {
      readonly status: 'failed';
      readonly failures: readonly NamedValidationFailure[];
      readonly dependentClaims: 'Unknown';
      readonly reason: 'missing-declaration';
    };

// A valid declaration registers exactly one project (CAP1-REQ-001); an
// invalid one is a named failure with every dependent claim Unknown
// (CAP1-REQ-002). Deterministic: a pure function of (read, revision) —
// no timestamps, no randomness (CAP1-REQ-005).
export function registerProject(
  read: DeclarationReadResult,
  revision: string,
): RegistrationResult {
  if (!read.ok) {
    return {
      status: 'failed',
      failures: read.failures,
      dependentClaims: 'Unknown',
      reason: MISSING_DECLARATION,
    };
  }
  return {
    status: 'registered',
    facts: {
      projectId: read.declaration.project.id,
      displayName: read.declaration.project.name,
      revision,
      validation: 'valid',
      rootDesignation: 'declared-location',
    },
  };
}

export interface RootCandidate {
  readonly repositoryId: RepositoryId;
  readonly hasDeclaration: boolean;
}

export type RootDesignationResult =
  | { readonly status: 'designated'; readonly root: RepositoryId }
  | {
      readonly status: 'contradiction';
      readonly kind: 'multiple-roots';
      readonly roots: readonly RepositoryId[];
      readonly routedTo: 'adjudication';
      readonly reason: 'contradicted-pending-adjudication';
    }
  | {
      readonly status: 'unknown';
      readonly scope: 'workspace';
      readonly reason: 'missing-declaration';
    };

// Governance-root designation by declaration location (RFC3-4). Exactly
// one declaring repository is the root. Two or more yield a contradiction
// on the adjudication route (RFC1-21; RFC2-24 reason 8) with no root picked.
// Zero yields workspace-level Unknown with `missing-declaration`
// (CAP1-REQ-006; RFC1-1).
export function designateRoots(
  candidates: readonly RootCandidate[],
): RootDesignationResult {
  const declaring = candidates
    .filter((candidate) => candidate.hasDeclaration)
    .map((candidate) => candidate.repositoryId);

  if (declaring.length === 1) {
    // declaring[0] is present by the length check; the non-null
    // assertion satisfies noUncheckedIndexedAccess without inventing a
    // value.
    return { status: 'designated', root: declaring[0] as RepositoryId };
  }
  if (declaring.length > 1) {
    return {
      status: 'contradiction',
      kind: 'multiple-roots',
      roots: declaring,
      routedTo: 'adjudication',
      reason: UNKNOWN_REASONS[7],
    };
  }
  return {
    status: 'unknown',
    scope: 'workspace',
    reason: MISSING_DECLARATION,
  };
}

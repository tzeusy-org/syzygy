import { sha256 } from '@syzygy/support';

import { canonicalJson } from './project-shape-manifest.js';

/**
 * The response identity describes the content carried by the machine model,
 * independent of capture instants.  The declaration is deliberately data:
 * consumers can inspect exactly which structural fields are omitted before
 * relying on `contentKey`.
 */
export interface ResponseIdentity {
  readonly contentKey: string;
  readonly excludes: readonly string[];
  readonly stableAcross: readonly string[];
  readonly varyingWith: readonly string[];
}

export interface ResponseIdentityDeclaration {
  readonly excludes: readonly string[];
  readonly stableAcross: readonly string[];
  readonly varyingWith: readonly string[];
}

/**
 * Capture-instant fields in the served model.  `[]` is the structural
 * wildcard for every member of the named array.  Keep this set unique and
 * lexically ordered: it is part of the response's inspectable contract.
 */
const RESPONSE_IDENTITY_EXCLUDES = Object.freeze([
  'codeStructure.capturedAt',
  'evaluation.asOf',
  'projectShape.authority.evaluationId',
  'projectShape.authority.evaluationInstant',
  'projectShape.claim.evaluationId',
  'projectShape.classes.baseline-spec.claim.evaluationId',
  'projectShape.classes.catalog-entry.claim.evaluationId',
  'projectShape.classes.craft-policy.claim.evaluationId',
  'projectShape.classes.design-contract.claim.evaluationId',
  'projectShape.classes.principle.claim.evaluationId',
  'projectShape.classes.project-account-section.claim.evaluationId',
  'projectShape.classes.roster-identity.claim.evaluationId',
  'projectShape.classes.success-criterion.claim.evaluationId',
  'projectShape.classes.topology-component.claim.evaluationId',
  'projectShape.facts[].claim.evaluationId',
  'projectShape.identity.capturedAt',
  'projectShape.identity.deterministicInputs.authority.evaluationId',
  'projectShape.items[].claim.evaluationId',
  'projectShape.projectAccount[].claim.evaluationId',
  'projectShape.sources[].claim.evaluationId',
  'projectShape.sources[].stamp.capturedAt',
  'proposedWork.currentAuthority.claim.evaluationId',
  'walkthroughJudgment.evaluation.evaluationId',
  'walkthroughJudgment.evaluation.evaluationInstant',
  'workItems.capturedAt',
] as const);

const RESPONSE_IDENTITY_STABLE_ACROSS = Object.freeze([
  'daemon restart at one evaluation input set',
] as const);

const RESPONSE_IDENTITY_VARYING_WITH = Object.freeze([
  'butlers revision',
  'observer revision',
  'project shape',
] as const);

interface PathSegment {
  readonly key: string;
  readonly all: boolean;
}

interface ParsedPath {
  readonly text: string;
  readonly segments: readonly PathSegment[];
}

interface ResponseIdentityPreimage {
  /** The cloned model after the response identity self-field and exclusions. */
  readonly value: unknown;
  /** Declared paths that found at least one property in the input. */
  readonly resolved: readonly string[];
}

function parsePath(path: string): ParsedPath {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error(`response identity exclusion path is empty`);
  }
  const rawSegments = path.split('.');
  if (rawSegments.some((segment) => segment === '')) {
    throw new Error(`response identity exclusion path is malformed: ${JSON.stringify(path)}`);
  }
  const segments = rawSegments.map((raw) => {
    const wildcard = raw.endsWith('[]');
    const key = wildcard ? raw.slice(0, -2) : raw;
    if (!/^[A-Za-z0-9_-]+$/.test(key)) {
      throw new Error(`response identity exclusion path is malformed: ${JSON.stringify(path)}`);
    }
    return { key, all: wildcard };
  });
  return { text: path, segments };
}

function parseDeclaration(declaration: ResponseIdentityDeclaration): readonly ParsedPath[] {
  const parsed = declaration.excludes.map(parsePath);
  const seen = new Set<string>();
  for (const path of parsed) {
    if (seen.has(path.text)) {
      throw new Error(`response identity exclusion path is duplicated: ${path.text}`);
    }
    seen.add(path.text);
  }
  const sorted = [...parsed].sort((left, right) => (left.text < right.text ? -1 : left.text > right.text ? 1 : 0));
  if (sorted.some((path, index) => path.text !== declaration.excludes[index])) {
    throw new Error('response identity exclusion paths must be in lexical order');
  }
  return sorted;
}

function cloneValue(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (ancestors.has(value)) {
    throw new Error('response identity input cannot be cloned: circular value');
  }
  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value)) return value.map((item) => cloneValue(item, nextAncestors));
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value)) copy[key] = cloneValue((value as Record<string, unknown>)[key], nextAncestors);
  return copy;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function declarationFor(model: unknown, declaration: ResponseIdentityDeclaration | undefined): ResponseIdentityDeclaration {
  if (declaration !== undefined) return declaration;
  if (!isObject(model) || !isObject(model.responseIdentity)) {
    throw new Error('response identity input must carry responseIdentity metadata');
  }
  return {
    excludes: model.responseIdentity.excludes as readonly string[],
    stableAcross: model.responseIdentity.stableAcross as readonly string[],
    varyingWith: model.responseIdentity.varyingWith as readonly string[],
  };
}

/** Remove one parsed path without treating an absent conditional branch as a failure. */
function removePath(value: unknown, path: ParsedPath, index: number): boolean {
  if (!isObject(value)) {
    throw new Error(`response identity exclusion path cannot traverse a non-object: ${path.text}`);
  }
  const segment = path.segments[index];
  if (segment === undefined) return false;
  if (!(segment.key in value)) return false;

  if (index === path.segments.length - 1) {
    if (segment.all) {
      if (!Array.isArray(value[segment.key])) return false;
      delete value[segment.key];
      return true;
    }
    delete value[segment.key];
    return true;
  }

  const child = value[segment.key];
  if (segment.all) {
    if (!Array.isArray(child)) {
      throw new Error(`response identity exclusion path expects an array at ${path.text}: ${segment.key}`);
    }
    let resolved = false;
    for (const member of child) {
      if (!isObject(member)) {
        throw new Error(`response identity exclusion path expects object members at ${path.text}`);
      }
      resolved = removePath(member, path, index + 1) || resolved;
    }
    return resolved;
  }
  if (child === undefined) return false;
  if (child === null || typeof child !== 'object') {
    throw new Error(`response identity exclusion path cannot traverse ${segment.key}: ${path.text}`);
  }
  return removePath(child, path, index + 1);
}

function omitSelfField(value: unknown): void {
  if (!isObject(value)) {
    throw new Error('response identity input must be an object');
  }
  const identity = value.responseIdentity;
  if (!isObject(identity)) {
    throw new Error('response identity input must carry responseIdentity metadata');
  }
  delete identity.contentKey;
}

/**
 * Produce the canonical response-identity preimage.  The operation is pure:
 * it clones the input, removes only the declared self-field and paths, and
 * returns the paths that were present.  Conditional shape branches may be
 * absent; malformed or duplicate declarations are always fatal.
 */
export function responseIdentityPreimage(
  model: unknown,
  declaration?: ResponseIdentityDeclaration,
): ResponseIdentityPreimage {
  const paths = parseDeclaration(declarationFor(model, declaration));
  const value = cloneValue(model);
  omitSelfField(value);
  const resolved: string[] = [];
  for (const path of paths) {
    if (removePath(value, path, 0)) resolved.push(path.text);
  }
  return { value, resolved };
}

/** Compute the response identity from a complete model carrying metadata. */
export function buildResponseIdentity(
  model: unknown,
  declaration?: ResponseIdentityDeclaration,
): ResponseIdentity {
  const activeDeclaration = declarationFor(model, declaration);
  const preimage = responseIdentityPreimage(model, activeDeclaration);
  let serialized: string;
  try {
    serialized = canonicalJson(preimage.value);
  } catch (cause) {
    throw new Error(
      `response identity canonicalization failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const contentKey = `sha256:${sha256(serialized)}`;
  return Object.freeze({
    contentKey,
    excludes: Object.freeze([...activeDeclaration.excludes]),
    stableAcross: Object.freeze([...activeDeclaration.stableAcross]),
    varyingWith: Object.freeze([...activeDeclaration.varyingWith]),
  });
}

/** Build metadata first, then hash the complete model with only contentKey omitted. */
export function responseIdentityMetadata(): Omit<ResponseIdentity, 'contentKey'> & { readonly contentKey: '' } {
  return {
    contentKey: '',
    excludes: RESPONSE_IDENTITY_EXCLUDES,
    stableAcross: RESPONSE_IDENTITY_STABLE_ACROSS,
    varyingWith: RESPONSE_IDENTITY_VARYING_WITH,
  };
}

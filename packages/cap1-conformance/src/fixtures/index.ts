import { createHash } from 'node:crypto';

import type { ConsentRecord, EvaluationIdentity, ProjectId, RepositoryId } from '@syzygy/cap1-core';

// Conformance fixture builders: the INPUT side only. Every conformance
// file states its expected values as hard-coded literals (AGENTS.md:
// expected values are never imported from the module under test, and
// never computed by a builder); what these builders share is the
// boilerplate a fixture needs to be a valid declaration, a consent
// record or an evaluation identity at all.

export const FIXTURE_OWNER = 'uniquosity@gmail.com';

// The as-of instant most conformance fixtures evaluate at.
export const FIXTURE_AS_OF = '2026-08-21T00:00:00Z';

export interface DeclaredRepository {
  readonly id: string;
  readonly role: 'governance-root' | 'observed-source';
  readonly consent: string;
}

export interface DeclaredRelation {
  readonly type: string;
  readonly project: string;
}

export interface ProjectYamlFields {
  readonly id: string;
  readonly name: string;
  readonly owner?: string;
  readonly repositories: readonly DeclaredRepository[];
  readonly consents: readonly string[];
  readonly relations?: readonly DeclaredRelation[];
  readonly profiles?: readonly string[];
}

// A block sequence under `key`, or the flow form `key: []` when empty.
function sequence(key: string, items: readonly string[]): string {
  return items.length === 0 ? `${key}: []\n` : `${key}:\n${items.join('')}`;
}

// The closed declaration the core reader accepts (`.syzygy/project.yaml`),
// with the fixed `declarations.spec_root` tail every fixture shares. The
// text starts and ends with a newline, as the inline fixtures did.
export function projectYaml(fields: ProjectYamlFields): string {
  const repositories = fields.repositories.map(
    (repository) =>
      `  - id: ${repository.id}\n    role: ${repository.role}\n    consent: ${repository.consent}\n`,
  );
  const consents = fields.consents.map((consent) => `  - ${consent}\n`);
  const relations = (fields.relations ?? []).map(
    (relation) => `  - type: ${relation.type}\n    project: ${relation.project}\n`,
  );
  const profiles = (fields.profiles ?? []).map((profile) => `  - ${profile}\n`);
  return [
    '\nschema_version: "1"\n',
    `project:\n  id: ${fields.id}\n  name: ${fields.name}\n`,
    `owner: ${fields.owner ?? FIXTURE_OWNER}\n`,
    sequence('repositories', repositories),
    sequence('consents', consents),
    'declarations:\n  spec_root: openspec/\n',
    sequence('relations', relations),
    sequence('profiles', profiles),
  ].join('');
}

export function evaluation(snapshot: string, asOf: string = FIXTURE_AS_OF): EvaluationIdentity {
  return { snapshot, asOf };
}

export interface ConsentFields {
  readonly id: string;
  readonly projectId: ProjectId;
  readonly repositoryId: RepositoryId;
  readonly grantState?: ConsentRecord['grantState'];
}

// An owner-attributed observe-scope consent record, in force unless the
// fixture says otherwise.
export function consent(fields: ConsentFields): ConsentRecord {
  return {
    id: fields.id,
    projectId: fields.projectId,
    repositoryId: fields.repositoryId,
    scope: 'observe',
    attribution: 'owner',
    grantState: fields.grantState ?? 'in-force',
  };
}

// --- Captured consent fixtures (CAP1-REQ-011/046 v1.0; syzygy-u2a.2) ------
//
// An in-memory observed tree read through the daemon's CaptureReader seam,
// so a conformance case counts every dependent-content read. Artifacts and
// cap1-owner-act/v1 records are SYNTHETIC: the owner field says so; no
// fixture act is a real owner act. Inputs only — each case states its
// expected admission, diagnostic and read count as literals.

export const ACT_FIXTURE_OWNER = 'fixture-owner (synthetic, not an owner act)';

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export interface ArtifactFields {
  readonly id: string;
  readonly project: string;
  readonly repository: string;
  readonly scope?: string;
  readonly grantState?: 'in-force' | 'withdrawn';
  readonly extra?: readonly string[];
}

export function consentArtifactText(fields: ArtifactFields): string {
  return [
    `id: ${fields.id}`,
    `project: ${fields.project}`,
    `repository: ${fields.repository}`,
    `scope: ${fields.scope ?? 'observe'}`,
    'attribution: test-owner',
    `grant_state: ${fields.grantState ?? 'in-force'}`,
    ...(fields.extra ?? []),
    '',
  ].join('\n');
}

// A value of `undefined` omits the key; `null` writes an explicit null.
export function ownerActText(
  artifact: ArtifactFields,
  artifactText: string,
  overrides: Readonly<Record<string, unknown>> = {},
): string {
  const fields: Record<string, unknown> = {
    schema: 'cap1-owner-act/v1',
    act: `act-${artifact.id}`,
    project: artifact.project,
    artifact: artifact.id,
    artifact_digest: `sha256:${sha256Hex(artifactText)}`,
    act_type: (artifact.grantState ?? 'in-force') === 'in-force' ? 'consent' : 'revoke',
    owner: ACT_FIXTURE_OWNER,
    instant: '2026-08-01T00:00:00Z',
    scope: artifact.scope ?? 'observe',
    supersedes: null,
    expires: null,
    actor: 'human',
    provenance: 'owner-adopted-bootstrap',
    a1_audit_record: null,
    ...overrides,
  };
  const scalar = (value: unknown): string =>
    value === null ? 'null' : typeof value === 'string' ? JSON.stringify(value) : String(value);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (typeof value === 'object' && value !== null) {
      lines.push(`${key}:`);
      for (const [inner, innerValue] of Object.entries(value)) lines.push(`  ${inner}: ${scalar(innerValue)}`);
    } else {
      lines.push(`${key}: ${scalar(value)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export const DECISIONS_PATH = '.syzygy/governance/decisions';

// An in-memory tree per root; `reads` counts every readBytes path and
// every listRoot root, so a case can assert zero dependent reads.
export class MemoryTree {
  readonly files = new Map<string, string>();
  readonly roots = new Set<string>();
  readonly reads = new Map<string, number>();

  put(root: string, path: string, text: string): this {
    this.roots.add(root);
    this.files.set(`${root}|${path}`, text);
    return this;
  }

  remove(root: string, path: string): this {
    this.files.delete(`${root}|${path}`);
    return this;
  }

  count(key: string): number {
    return this.reads.get(key) ?? 0;
  }

  reader(): {
    readBytes(root: string, path: string): Promise<
      | { state: 'read'; bytes: Uint8Array }
      | { state: 'missing' }
      | { state: 'unreadable'; code: string }
    >;
    listRoot(root: string): Promise<{ state: 'listed' } | { state: 'unreachable'; code: string }>;
  } {
    return {
      readBytes: async (root, path) => {
        const key = `${root}|${path}`;
        this.reads.set(key, this.count(key) + 1);
        if (!this.roots.has(root)) return { state: 'unreadable', code: 'ENOENT' };
        const text = this.files.get(key);
        return text === undefined ? { state: 'missing' } : { state: 'read', bytes: new TextEncoder().encode(text) };
      },
      listRoot: async (root) => {
        const key = `list|${root}`;
        this.reads.set(key, this.count(key) + 1);
        return this.roots.has(root) ? { state: 'listed' } : { state: 'unreachable', code: 'ENOENT' };
      },
    };
  }
}

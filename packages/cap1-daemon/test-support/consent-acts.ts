// Test support: synthetic consent artifacts and cap1-owner-act/v1 records
// for daemon tests. Every act written here is a FIXTURE, labelled so in its
// owner field — never a real owner act. Inputs only: expected values stay
// literals in the tests that use these writers.

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const FIXTURE_OWNER = 'fixture-owner (synthetic, not an owner act)';
export const FIXTURE_ACT_INSTANT = '2026-08-01T00:00:00Z';

export function sha256Hex(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export interface ArtifactSpec {
  readonly id: string;
  readonly project: string;
  readonly repository: string;
  readonly scope?: string;
  readonly attribution?: string;
  readonly grantState?: 'in-force' | 'withdrawn';
}

export function artifactText(spec: ArtifactSpec): string {
  return [
    `id: ${spec.id}`,
    `project: ${spec.project}`,
    `repository: ${spec.repository}`,
    `scope: ${spec.scope ?? 'observe'}`,
    `attribution: ${spec.attribution ?? 'test-owner'}`,
    `grant_state: ${spec.grantState ?? 'in-force'}`,
    '',
  ].join('\n');
}

// Act fields keyed as the encoding spells them. A value of `undefined`
// OMITS the key (the omitted-field cases); `null` writes an explicit null.
export type ActFields = Record<string, unknown>;

export function defaultActFields(spec: ArtifactSpec, artifactBytes: string): ActFields {
  return {
    schema: 'cap1-owner-act/v1',
    act: `act-${spec.id}`,
    project: spec.project,
    artifact: spec.id,
    artifact_digest: `sha256:${sha256Hex(artifactBytes)}`,
    act_type: (spec.grantState ?? 'in-force') === 'in-force' ? 'consent' : 'revoke',
    owner: FIXTURE_OWNER,
    instant: FIXTURE_ACT_INSTANT,
    scope: spec.scope ?? 'observe',
    supersedes: null,
    expires: null,
    actor: 'human',
    provenance: 'owner-adopted-bootstrap',
    a1_audit_record: null,
  };
}

function yamlScalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}

export function actText(fields: ActFields): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (typeof value === 'object' && value !== null) {
      lines.push(`${key}:`);
      for (const [inner, innerValue] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  ${inner}: ${yamlScalar(innerValue)}`);
      }
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

// Writes `<id>.yaml` and, unless `act` is `false`, `<id>.act.yaml` with the
// default bootstrap act overlaid by `act`. Returns both texts.
export function writeConsent(
  decisionsDir: string,
  spec: ArtifactSpec,
  act: ActFields | false = {},
): { readonly artifact: string; readonly act: string | undefined } {
  mkdirSync(decisionsDir, { recursive: true });
  const artifact = artifactText(spec);
  writeFileSync(join(decisionsDir, `${spec.id}.yaml`), artifact, 'utf8');
  if (act === false) return { artifact, act: undefined };
  const text = actText({ ...defaultActFields(spec, artifact), ...act });
  writeFileSync(join(decisionsDir, `${spec.id}.act.yaml`), text, 'utf8');
  return { artifact, act: text };
}

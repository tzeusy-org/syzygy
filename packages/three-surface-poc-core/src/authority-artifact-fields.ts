// Authority-artifact field extraction — pure bytes → typed fields.
//
// The three PWB-REQ-005 authority artifacts are the observation-consent
// record (Markdown), the secret-classification policy (JSON) and the
// observer's adapter-registry entry (JSON). PWB-REQ-005's three
// authority-specific case groups name the fields the evaluator must
// check on each: consent — observing project, configured repository,
// observation content class; policy — policy-owning project and policy
// version; registry — governance home, project, repository, read-only
// authority and empty write surface.
//
// Like `owner-act-record.ts`, this module only extracts. A field is
// `present` (with the raw value, typed `unknown` for JSON so that shape
// checks happen in exactly one place, the evaluator) or `missing`. Shape
// validity ("malformed") and semantic agreement with the controlled
// evaluation input ("wrong but present") are the evaluator's.

import { decodeUtf8, isRecord } from '@syzygy/support';

export type ArtifactField = { readonly kind: 'present'; readonly value: unknown } | { readonly kind: 'missing' };

interface ConsentArtifactFields {
  readonly observingProject: ArtifactField;
  readonly configuredRepository: ArtifactField;
  readonly contentClass: ArtifactField;
}

interface PolicyArtifactFields {
  readonly policyOwningProject: ArtifactField;
  readonly policyVersion: ArtifactField;
}

interface RegistryArtifactFields {
  readonly governanceHome: ArtifactField;
  readonly project: ArtifactField;
  readonly repository: ArtifactField;
  readonly readOnlyAuthority: ArtifactField;
  readonly writeSurface: ArtifactField;
}

type ArtifactParse<T> =
  | { readonly kind: 'parsed'; readonly fields: T }
  | { readonly kind: 'undecodable'; readonly detail: string };

const MISSING: ArtifactField = { kind: 'missing' };
function present(value: unknown): ArtifactField {
  return { kind: 'present', value };
}

// Consent record head: `Subject: \`(<observing>, <repository>)\`` and
// `Observation content class: \`<class>\``. A subject with one element
// yields a present project and a missing repository so the two remain
// independently decidable.
export function parseConsentArtifact(bytes: Uint8Array): ArtifactParse<ConsentArtifactFields> {
  const text = decodeUtf8(bytes);
  if (text === undefined) return { kind: 'undecodable', detail: 'not strict UTF-8' };
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const subjectLine = lines.find((line) => line.startsWith('Subject:'));
  const classLine = lines.find((line) => line.startsWith('Observation content class:'));

  let observingProject: ArtifactField = MISSING;
  let configuredRepository: ArtifactField = MISSING;
  if (subjectLine !== undefined) {
    const raw = subjectLine.slice('Subject:'.length).trim();
    const match = /^`\(([^`]*)\)`$/.exec(raw);
    if (match === null) {
      observingProject = present(raw);
    } else {
      const elements = (match[1] ?? '').split(',').map((element) => element.trim());
      observingProject = present(elements[0] ?? '');
      if (elements.length >= 2) configuredRepository = present(elements[1] ?? '');
    }
  }

  let contentClass: ArtifactField = MISSING;
  if (classLine !== undefined) {
    const raw = classLine.slice('Observation content class:'.length).trim();
    const match = /^`([^`]*)`$/.exec(raw);
    contentClass = present(match === null ? raw : (match[1] ?? ''));
  }

  return { kind: 'parsed', fields: { observingProject, configuredRepository, contentClass } };
}

function parseJson(bytes: Uint8Array): { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly detail: string } {
  const text = decodeUtf8(bytes);
  if (text === undefined) return { ok: false, detail: 'not strict UTF-8' };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, detail: 'not JSON' };
  }
}

function jsonField(object: Record<string, unknown>, key: string): ArtifactField {
  return Object.hasOwn(object, key) ? present(object[key]) : MISSING;
}

export function parsePolicyArtifact(bytes: Uint8Array): ArtifactParse<PolicyArtifactFields> {
  const json = parseJson(bytes);
  if (!json.ok) return { kind: 'undecodable', detail: json.detail };
  if (!isRecord(json.value)) return { kind: 'undecodable', detail: 'policy document is not an object' };
  return {
    kind: 'parsed',
    fields: {
      policyOwningProject: jsonField(json.value, 'policyOwningProject'),
      policyVersion: jsonField(json.value, 'policyVersion'),
    },
  };
}

// Registry: top-level `governanceHome` and `project`; the one entry's
// `subject.observedRepository`, `typedAuthority` (read-only authority)
// and `typedAuthority.writeSurface`. The entry is the first element of
// `entries`; a non-array or non-object entry surfaces as a present
// repository field holding the malformed container, so that the
// evaluator classifies it (never silently drops it).
export function parseRegistryArtifact(bytes: Uint8Array): ArtifactParse<RegistryArtifactFields> {
  const json = parseJson(bytes);
  if (!json.ok) return { kind: 'undecodable', detail: json.detail };
  if (!isRecord(json.value)) return { kind: 'undecodable', detail: 'registry document is not an object' };
  const root = json.value;
  const governanceHome = jsonField(root, 'governanceHome');
  const project = jsonField(root, 'project');

  let repository: ArtifactField = MISSING;
  let readOnlyAuthority: ArtifactField = MISSING;
  let writeSurface: ArtifactField = MISSING;
  if (Object.hasOwn(root, 'entries')) {
    const entries = root['entries'];
    const entry = Array.isArray(entries) ? entries[0] : undefined;
    if (!Array.isArray(entries) || entry === undefined || !isRecord(entry)) {
      repository = present(entries);
    } else {
      const subject = entry['subject'];
      if (isRecord(subject)) repository = jsonField(subject, 'observedRepository');
      else if (Object.hasOwn(entry, 'subject')) repository = present(subject);
      if (Object.hasOwn(entry, 'typedAuthority')) {
        const authority = entry['typedAuthority'];
        readOnlyAuthority = present(authority);
        if (isRecord(authority)) writeSurface = jsonField(authority, 'writeSurface');
      }
    }
  }
  return {
    kind: 'parsed',
    fields: { governanceHome, project, repository, readOnlyAuthority, writeSurface },
  };
}

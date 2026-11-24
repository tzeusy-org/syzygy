import { isAbsolute } from 'node:path';
import { decodeUtf8, isRecord, sha256 } from '@syzygy/support';
import {
  evaluateBodyReadAuthority,
  type BodyReadAuthorityInputs,
  type BodyReadAuthorityEvaluation,
} from '@syzygy/three-surface-poc-core';

import { loadBodyReadAuthorityInputs } from './governance-inputs.js';

export type ConsentBinding =
  | { readonly kind: 'admitted'; readonly locator: string; readonly authority: BodyReadAuthorityEvaluation; readonly briefingResponseLimit?: number }
  | { readonly kind: 'rejected'; readonly reason: 'body-read-not-admitted' | 'consent-locator-invalid' | 'authority-unavailable' };

interface ConsentBindingOptions {
  readonly repoRoot: string;
  readonly governanceRevision: string;
  readonly evaluationInstant: string;
}

export function currentConsentLocator(bytes: Uint8Array): string | undefined {
  const text = decodeUtf8(bytes);
  if (text === undefined) return undefined;
  const lines = text.split(/\r?\n/);
  const label = /^[ \t]*Current locator(?:[ \t]*:|[ \t]*$)/;
  const index = lines.findIndex((line) => label.test(line));
  if (index < 0 || lines.slice(index + 1).some((line) => label.test(line))) return undefined;
  const line = lines[index];
  if (line === undefined) return undefined;
  const declaration = /^Current locator: `([^`\x00-\x1f\x7f]+)`(.*)$/.exec(line);
  const locator = declaration?.[1];
  if (locator === undefined || locator.trim() !== locator || !isAbsolute(locator)) return undefined;
  const suffix = declaration?.[2];
  if (suffix === '' || suffix === ' (configuration, not repository identity)') return locator;
  if (suffix === ' (configuration, not repository' && lines[index + 1] === 'identity)') return locator;
  return undefined;
}

/** Read the ceiling from the same registry bytes that passed the authority evaluation. */
function briefingResponseLimit(artifact: BodyReadAuthorityInputs['registry']['artifact'], state: BodyReadAuthorityEvaluation['registry']): number | undefined {
  if (artifact.kind !== 'present' || state.kind !== 'valid' || sha256(artifact.bytes) !== state.artifactDigest) return undefined;
  const text = decodeUtf8(artifact.bytes);
  if (text === undefined) return undefined;
  try {
    const registry: unknown = JSON.parse(text);
    if (!isRecord(registry) || !Array.isArray(registry.entries) || registry.entries.length !== 1) return undefined;
    const entry: unknown = registry.entries[0];
    if (!isRecord(entry) || !isRecord(entry.resourceLimits)) return undefined;
    const limit = entry.resourceLimits.maxBriefingResponseBytes;
    return typeof limit === 'number' && Number.isSafeInteger(limit) && limit > 0 ? limit : undefined;
  } catch {
    return undefined;
  }
}

export function authorizePwbLocator(
  options: ConsentBindingOptions,
  load = loadBodyReadAuthorityInputs,
): ConsentBinding {
  try {
    const inputs = load({ ...options, evaluationId: `evaluation:pwb-body-read:${options.evaluationInstant}` });
    const authority = evaluateBodyReadAuthority(inputs);
    if (!authority.admits) return { kind: 'rejected', reason: 'body-read-not-admitted' };
    const artifact = inputs.consent.artifact;
    if (artifact.kind !== 'present' || authority.consent.kind !== 'valid' ||
        sha256(artifact.bytes) !== authority.consent.artifactDigest) {
      return { kind: 'rejected', reason: 'consent-locator-invalid' };
    }
    const locator = currentConsentLocator(artifact.bytes);
    if (locator === undefined) return { kind: 'rejected', reason: 'consent-locator-invalid' };
    const limit = briefingResponseLimit(inputs.registry.artifact, authority.registry);
    return { kind: 'admitted', locator, authority, ...(limit === undefined ? {} : { briefingResponseLimit: limit }) };
  } catch {
    return { kind: 'rejected', reason: 'authority-unavailable' };
  }
}

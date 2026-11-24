import { isAbsolute } from 'node:path';
import { decodeUtf8, sha256 } from '@syzygy/support';
import {
  evaluateBodyReadAuthority,
  type BodyReadAuthorityEvaluation,
} from '@syzygy/three-surface-poc-core';

import { loadBodyReadAuthorityInputs } from './governance-inputs.js';

export type ConsentBinding =
  | { readonly kind: 'admitted'; readonly locator: string; readonly authority: BodyReadAuthorityEvaluation }
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
    return locator === undefined
      ? { kind: 'rejected', reason: 'consent-locator-invalid' }
      : { kind: 'admitted', locator, authority };
  } catch {
    return { kind: 'rejected', reason: 'authority-unavailable' };
  }
}

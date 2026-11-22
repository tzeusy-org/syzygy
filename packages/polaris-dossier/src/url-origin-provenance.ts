import type { SessionContentClass } from './session-egress-policy.js';

export type UrlReportKind = 'draft' | 'inventory' | 'fidelity-verdict' | 'design-verdict' | 'check';
export interface UrlOriginMetadata {
  readonly id: string; readonly digest: string; readonly bytes: number;
  readonly classes: readonly SessionContentClass[]; readonly originIds: readonly string[];
}

/** Closed historical derivations. These are descriptive data only; the protected
 * stop seal and a fresh verification capability authenticate an import. */
export type UrlOriginDerivation =
  | { readonly kind: 'fixed'; readonly id: string }
  | { readonly kind: 'renderer' }
  | { readonly kind: 'source-span'; readonly path: string; readonly objectId: string; readonly offset: number; readonly limit: number }
  | { readonly kind: 'source-whole'; readonly path: string; readonly objectId: string }
  | { readonly kind: 'source-tree'; readonly offset: number; readonly limit: number }
  | { readonly kind: 'composition' }
  | { readonly kind: 'source-reply' }
  | { readonly kind: 'report'; readonly report: UrlReportKind; readonly role: string }
  | { readonly kind: 'authenticated-provider-output' };
export interface UrlOriginProvenanceNode {
  readonly key: string;
  /** Descriptive reference encoding, never an origin declaration or grant. */
  readonly referenceMode: 'declared' | 'inherited';
  readonly metadata: UrlOriginMetadata;
  readonly parents: readonly string[];
  readonly derivation: UrlOriginDerivation;
}
export interface UrlOriginProvenance {
  readonly format: 'polaris-url-origin-provenance/2';
  readonly nodes: readonly UrlOriginProvenanceNode[];
}
export interface UrlSemanticOriginDomain {
  readonly runId: string; readonly sourceBindingSha256: string; readonly sourcePin: string;
  readonly basePolicySha256: string; readonly originPolicySha256: string;
}

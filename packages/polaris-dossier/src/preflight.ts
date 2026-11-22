import type { GateSources } from './gate-sources.js';
import { deriveIdentity, dossierLocator, readLocator } from './launch-identity.js';
import { DOSSIER_POLICY_PATH, isDossierPolicyBinding, type PolicyBinding } from './policy-snapshot.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';

/** Metadata preparation only (033/046/047, D10). This checks the declared
 * locator and committed policy. It does not choose a revision, fetch a source,
 * validate run configuration, or claim that a dossier run is ready. */
export interface PreflightReport {
  readonly command: 'preflight';
  readonly outcome: 'prepared';
  readonly url: string;
  readonly repository: { readonly repositoryId: string | null; readonly identitySource: 'derived' | 'requires-explicit-identity' };
  readonly screeningPolicy: PolicyBinding;
  readonly label: 'Inferred';
  readonly revision: { readonly state: 'Unknown'; readonly reason: string };
  readonly visibility: { readonly default: 'private'; readonly label: 'Inferred' };
  readonly disclosures: readonly string[];
}

export type PreflightResult = { readonly ok: true; readonly report: PreflightReport; readonly screen: DossierScreen } | { readonly ok: false; readonly reason: string };

export async function preflight(input: string, sources: GateSources, _now: number): Promise<PreflightResult> {
  const parsed = dossierLocator(input, 'repository');
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const snapshot = await sources.declaredPolicy?.();
  if (snapshot === undefined || !snapshot.ok) return { ok: false, reason: snapshot === undefined
    ? 'no committed dossier policy source is available' : snapshot.why };
  if (snapshot.binding.path !== DOSSIER_POLICY_PATH || !isDossierPolicyBinding(snapshot.binding)) {
    return { ok: false, reason: 'preparation for a new run requires the current committed dossier policy binding' };
  }
  const screened = buildDossierScreen(snapshot.bytes, true, null, 'private');
  if (!screened.ok || screened.screen.policySha256 !== snapshot.binding.sha256
    || screened.screen.policyId !== snapshot.binding.policyId || screened.screen.policyVersion !== snapshot.binding.policyVersion) {
    return { ok: false, reason: 'the committed dossier policy cannot be applied or does not match its binding' };
  }
  if (screened.screen.screenBody(input) !== undefined || screened.screen.screenBody(parsed.url) !== undefined) {
    return { ok: false, reason: 'the repository locator is excluded by the committed metadata screening policy; it is not printed or stored' };
  }
  const locator = readLocator(input, 'operator');
  if (!locator.ok) return { ok: false, reason: 'the repository locator cannot be normalized' };
  const identity = deriveIdentity(locator.url);
  return { ok: true, screen: screened.screen, report: {
    command: 'preflight', outcome: 'prepared', url: parsed.url,
    repository: { repositoryId: identity === null ? null : identity.slice('repository:'.length),
      identitySource: identity === null ? 'requires-explicit-identity' : 'derived' },
    screeningPolicy: snapshot.binding, label: 'Inferred',
    revision: { state: 'Unknown', reason: 'no revision was selected; URL selection occurs at launch and local init pins the supplied HEAD' },
    visibility: { default: 'private', label: 'Inferred' },
    disclosures: [
      'The locator is a declaration, not proof of identity, public visibility, ownership or provider transmission.',
      'No observation consent, registry act, policy act, drawer or provider statement is required or read.',
      'This metadata-only preparation makes no network request, reads no observed repository object and writes no record.',
      'Prepared is not run readiness: the selected commit, supplied clone, declared provider/configuration and current policy still require validation at launch.',
    ],
  } };
}

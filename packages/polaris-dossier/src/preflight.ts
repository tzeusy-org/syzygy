import { RECORDS_WITHIN_REACH, type GateSources, type GateState } from './gate-sources.js';
import { dossierLocator } from './launch-identity.js';
import { quote } from './launch-revision.js';

/** `syzygy dossier preflight <url>` (design "Command surface"): whether the records a run needs are in force for the repository,
 * which revisions the consent names, whether a per-project statement is in force, and whether D9 and the RFC7-20 reading are in force.
 * The URL is parsed, never fetched; no object is read; nothing is written; Syzygy creates no record. The clone and checkout commands are
 * printed for the operator's session to run. */

export interface PreflightReport {
  readonly command: 'preflight';
  readonly outcome: 'ready' | 'not-ready';
  readonly url: string;
  readonly repository: { readonly repositoryId: string | null; readonly why?: string };
  readonly consentedRevisions: readonly { readonly label: string; readonly commit: string }[];
  readonly startGates: {
    readonly observationConsent: GateState;
    readonly registryEntry: GateState;
    readonly screeningPolicy: GateState;
  };
  readonly providerStatements: {
    readonly required: string;
    readonly inForce: readonly { readonly record: string; readonly provider: string; readonly contentClasses: readonly string[] }[];
  };
  readonly d9: GateState;
  readonly rfc720Ruling: GateState;
  /** The records the operator must have the owner make before a run can start; Syzygy creates none. */
  readonly missing: readonly string[];
  readonly cloneCommands: readonly string[];
  readonly disclosures: readonly string[];
}

export type PreflightResult = { readonly ok: true; readonly report: PreflightReport } | { readonly ok: false; readonly reason: string };

export async function preflight(input: string, sources: GateSources, now: number): Promise<PreflightResult> {
  const parsed = dossierLocator(input, 'repository');
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const url = parsed.url;
  const ids = await sources.repositoryIdsFor(url);
  const repositoryId = ids.length === 1 ? ids[0]! : null;
  const repositoryWhy = ids.length === 0
    ? `no observation consent in force has an Upstream that normalises to ${url}${sources.consentAbsenceFor === undefined ? '' : `: ${await sources.consentAbsenceFor(url)}`}`
    : ids.length > 1 ? `${ids.length} observation consents in force have an Upstream that normalises to ${url} (${ids.join(', ')}); which one governs is ambiguous` : undefined;
  const revisions = repositoryId === null ? [] : await sources.consentedRevisionsFor(repositoryId);
  const observationConsent: GateState = repositoryId === null
    ? { state: 'absent', why: repositoryWhy! }
    : revisions.length === 0 ? { state: 'absent', why: `the observation consent for ${repositoryId} names no revision in force` }
      : { state: 'ok', record: `observation consent for ${repositoryId}` };
  const [registryEntry, screeningPolicy, d9, rfc720Ruling] = await Promise.all([sources.registryEntry(), sources.screeningPolicy(), sources.d9(), sources.rfc720Ruling()]);
  const statements = repositoryId === null ? [] : await sources.providerStatements.statementsFor(repositoryId);
  const inForce = statements.filter(s => !s.withdrawn && s.act !== null && s.act.inForceAt <= now && s.contentClasses.length > 0)
    .map(s => ({ record: `${s.recordId}@${s.version}`, provider: s.provider, contentClasses: [...s.contentClasses] }));
  const missing = [
    ...(observationConsent.state === 'ok' ? [] : [`observation consent: ${observationConsent.why}`]),
    ...(registryEntry.state === 'ok' ? [] : [`source-acquisition registry entry: ${registryEntry.why}`]),
    ...(screeningPolicy.state === 'ok' ? [] : [`classification and screening policy: ${screeningPolicy.why}`]),
  ];
  return {
    ok: true,
    report: {
      command: 'preflight',
      outcome: missing.length === 0 ? 'ready' : 'not-ready',
      url,
      repository: repositoryWhy === undefined ? { repositoryId } : { repositoryId, why: repositoryWhy },
      consentedRevisions: revisions.map(r => ({ label: r.label, commit: r.commitId })),
      startGates: { observationConsent, registryEntry, screeningPolicy },
      providerStatements: {
        required: 'init decides from the project input and its own listing of the pinned tree whether the subject is governed; a governed subject, or one whose project input does not state whether a kernel evidence drawer exists, needs one in-force statement naming the agent provider declared in the run configuration',
        inForce,
      },
      d9,
      rfc720Ruling,
      missing,
      // One consented commit fetched alone into an empty repository, never a full clone: the agent reads whatever the clone holds,
      // and a full clone would hand it every commit the consent does not name. One block per revision, each in its own new directory.
      cloneCommands: revisions.flatMap(r => [
        `git init <dir>   # ${r.label}: a new, empty directory for this revision alone`,
        // The URL single-quoted: the locator rule admits `;`, `$(`, backticks and `|` in a path (R-PDJA-33-SLICE-C-1 finding 7).
        `git -C <dir> fetch --depth=1 ${quote(input)} ${r.commitId}`,
        'git -C <dir> checkout --detach FETCH_HEAD',
      ]),
      disclosures: [
        'the URL was parsed, not fetched; Syzygy made no network request and read no repository object',
        RECORDS_WITHIN_REACH,
      ],
    },
  };
}

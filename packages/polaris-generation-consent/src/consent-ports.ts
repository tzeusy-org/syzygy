import { digestCanonicalJson, type AdmissionDecision, type AttemptInput, type DispatchPermit, type GenerationSource, type PipelinePorts, type PipelineRequest } from '@syzygy/polaris-generation-core';
import { sha256 } from '@syzygy/support';
import { COMMIT_OBJECT_ID, parseAdmissionRecords, type AdmissionRecord, type AdmissionRecordReader } from './admission-record.js';
import { effective, ref, type Dead } from './in-force.js';

export { inForceRecords, notInForceRecords, type NotInForce } from './in-force.js';

/** The one Unknown every refusal here renders as (REQ-polaris-generation-001). */
export const UNCONSENTED = 'unconsented-source-or-provider' as const;

export type ConsentReason =
  | 'reader-failed' | 'provider-unmapped' | 'ambiguous-records' | 'record-missing' | 'not-in-force' | 'future-dated'
  | 'withdrawn' | 'revision-not-admitted' | 'repository-not-admitted' | 'class-unknown' | 'class-not-admitted' | 'audit-failed'
  | 'records-invalid' | 'clock-invalid' | 'empty-population' | 'identity-mismatch' | 'reserve-refused' | 'reserve-failed';

export interface ReliedRecord { readonly recordId: string; readonly version: string; readonly digest: string }

/** RFC5-15 audit record: identities and digests only, never source text. */
export interface ConsentAudit {
  readonly at: number;
  readonly phase: 'identity' | 'admit' | 'dispatch';
  readonly stage: AttemptInput['stage'];
  readonly providerRoute: string;
  readonly providerId: string | null;
  readonly decision: 'permitted' | 'refused';
  readonly unknown: typeof UNCONSENTED | null;
  readonly reasons: readonly ConsentReason[];
  readonly relied: readonly ReliedRecord[];
  readonly populationDigest: string;
}

export interface ConsentPortsOptions {
  readonly reader: AdmissionRecordReader;
  readonly now: () => number;
  /** The consenting project (`project:syzygy`), not the project being described. */
  readonly consentingProject: string;
  /** Provider route (as named in PipelineRequest.routes) to provider id. An unmapped route is refused. */
  readonly routeProviders: Readonly<Record<string, string>>;
  /** The request's own source population; `matches` binds the run to it. */
  readonly sources: readonly GenerationSource[];
  /** RFC5-14 class of one source, or null when it cannot be determined (refused). */
  readonly contentClassOf: (source: GenerationSource) => string | null;
  /** Class of the generator's own instruction text, which every request carries. */
  readonly instructionClass: string;
  /** Atomic durable reservation, run only after consent holds. */
  readonly reserve: PipelinePorts['admit'];
  /** Awaited before any permit; a failing audit refuses (fail closed). */
  readonly audit: (record: ConsentAudit) => Promise<void>;
}

export interface ConsentPorts {
  readonly permissionIdentity: PipelinePorts['permissionIdentity'];
  readonly admit: PipelinePorts['admit'];
  readonly permitted: PipelinePorts['permitted'];
  /** True only when the request carries exactly the source population these ports were built for. */
  readonly matches: (request: Pick<PipelineRequest, 'sources'>) => boolean;
}

const LIMITS = { maxBytes: 4_000_000, maxNodes: 200_000, maxDepth: 16 };
/** Every property of the source, with bodies and span texts replaced by their digests, so the
 * digest binds what would be sent (bodies, spans, classification basis, any segment fields), not just names. */
const sourceKey = (s: GenerationSource): Record<string, unknown> => {
  const { body, ...rest } = s;
  // The pipeline drops a body that a single full-file span already carries before it calls verifySources,
  // so the bound body is the explicit one, or that span's text: the same bytes digest the same either way.
  const only = s.spans.length === 1 ? s.spans[0]! : undefined;
  const fullSpan = only !== undefined && only.start === 0 && only.end === Buffer.byteLength(only.text) ? only.text : undefined;
  const effective = body ?? fullSpan;
  return { ...rest, bodyDigest: effective === undefined ? null : sha256(effective), spans: s.spans.map(span => ({ ...span, text: sha256(span.text) })) };
};
const populationDigest = (sources: readonly GenerationSource[]): string => digestCanonicalJson([...sources].map(sourceKey).sort((a, b) => String(a.sourceId).localeCompare(String(b.sourceId))), LIMITS).digest;

type Evaluation = { readonly ok: true; readonly relied: readonly ReliedRecord[] } | { readonly ok: false; readonly reasons: readonly ConsentReason[]; readonly relied: readonly ReliedRecord[] };

const DEAD_PRIORITY: readonly Dead[] = ['withdrawn', 'ambiguous-records', 'future-dated', 'not-in-force'];

function evaluate(records: readonly AdmissionRecord[], now: number, o: ConsentPortsOptions, providerId: string | null): Evaluation {
  if (providerId === null) return { ok: false, reasons: ['provider-unmapped'], relied: [] };
  const scoped = records.filter(r => r.project === o.consentingProject);
  const { live, dead } = effective(scoped, now);
  const reasons = new Set<ConsentReason>();
  const relied = new Map<string, ReliedRecord>();
  const rely = (r: AdmissionRecord): void => { relied.set(ref(r), { recordId: r.recordId, version: r.version, digest: r.digest }); };
  // Why a needed grant is absent: the strongest reason among dead records that would have matched it.
  const missing = (matches: (r: AdmissionRecord) => boolean): void => {
    const why = new Set([...dead].filter(([r]) => matches(r)).map(([, d]) => d));
    reasons.add(DEAD_PRIORITY.find(d => why.has(d)) ?? 'record-missing');
  };
  // Observation: every source in the population was read, so each (repository, revision) needs a commit-id grant.
  for (const s of o.sources) {
    const here = (r: AdmissionRecord): boolean => r.class === 'observation' && r.repositoryId === s.repositoryId;
    const grants = live.filter(here);
    if (grants.length === 0) { missing(here); continue; }
    const granted = COMMIT_OBJECT_ID.test(s.revision) ? grants.filter(r => r.admittedRevisions.includes(s.revision)) : [];
    if (granted.length === 0) { reasons.add('revision-not-admitted'); continue; }
    granted.forEach(rely);
  }
  // Egress: one record per (project, provider); it must list each repository and class of what could be sent.
  const forProvider = (r: AdmissionRecord): boolean => r.class === 'egress' && r.providerId === providerId;
  const egress = live.filter(forProvider);
  if (egress.length === 0) missing(forProvider);
  else if (egress.length > 1) reasons.add('ambiguous-records');
  else {
    const record = egress[0]!;
    rely(record);
    if (!record.contentClasses.includes(o.instructionClass)) reasons.add('class-not-admitted');
    for (const s of o.sources) {
      if (s.exclusion.excluded) continue;   // bodies of excluded sources never leave
      if (!record.admittedRepositories.includes(s.repositoryId)) { reasons.add('repository-not-admitted'); continue; }
      let cls: string | null;
      try { cls = o.contentClassOf(s); } catch { cls = null; }
      if (cls === null) reasons.add('class-unknown');
      else if (!record.contentClasses.includes(cls)) reasons.add('class-not-admitted');
    }
  }
  const list = [...relied.values()].sort((a, b) => `${a.recordId}@${a.version}`.localeCompare(`${b.recordId}@${b.version}`));
  return reasons.size === 0 ? { ok: true, relied: list } : { ok: false, reasons: [...reasons].sort(), relied: list };
}

/** Consent-backed `permissionIdentity`, `admit` and `permitted`. Each check
 * reads the records afresh; none caches a positive answer. Prefer `withConsent`,
 * which also takes over `verifySources` so the population sent is the population consented. */
export function createConsentPorts(options: ConsentPortsOptions): ConsentPorts {
  const population = populationDigest(options.sources);
  type Basis = Pick<AttemptInput, 'stage' | 'providerRoute'>;
  const providerOf = (input: Basis): string | null => (Object.hasOwn(options.routeProviders, input.providerRoute) ? options.routeProviders[input.providerRoute]! : null);
  /** Reads, validates and evaluates; every failure is attributed to its own cause and none permits. */
  const evaluateNow = async (input: Basis): Promise<Evaluation> => {
    if (options.sources.length === 0) return { ok: false, reasons: ['empty-population'], relied: [] };
    let now: number;
    try { now = options.now(); } catch { return { ok: false, reasons: ['clock-invalid'], relied: [] }; }
    if (!Number.isSafeInteger(now)) return { ok: false, reasons: ['clock-invalid'], relied: [] };
    let raw: readonly AdmissionRecord[];
    try { raw = await options.reader.read(); } catch { return { ok: false, reasons: ['reader-failed'], relied: [] }; }
    let records: readonly AdmissionRecord[];
    try { records = parseAdmissionRecords(raw); } catch { return { ok: false, reasons: ['records-invalid'], relied: [] }; }
    return evaluate(records, now, options, providerOf(input));
  };
  /** Audit of the final outcome. False when the sink failed (the caller then refuses). */
  const emit = async (input: Basis, phase: ConsentAudit['phase'], decision: 'permitted' | 'refused', reasons: readonly ConsentReason[], relied: readonly ReliedRecord[]): Promise<boolean> => {
    let at = 0;
    try { at = options.now(); } catch { at = 0; }
    try {
      await options.audit({ at, phase, stage: input.stage, providerRoute: input.providerRoute, providerId: providerOf(input), decision,
        unknown: decision === 'refused' ? UNCONSENTED : null, reasons: decision === 'refused' ? reasons : [], relied, populationDigest: population });
      return true;
    } catch { return false; }
  };
  const identityOf = (e: Evaluation & { ok: true }, input: Pick<AttemptInput, 'providerRoute'>): string =>
    digestCanonicalJson({ consentingProject: options.consentingProject, providerRoute: input.providerRoute, population, relied: e.relied }, LIMITS).digest;
  return {
    // The empty string is the pipeline's refusal signal for a missing identity (stop: admission-refused).
    permissionIdentity: async input => {
      const e = await evaluateNow(input);
      if (!e.ok) { await emit(input, 'identity', 'refused', e.reasons, e.relied); return ''; }
      return (await emit(input, 'identity', 'permitted', [], e.relied)) ? identityOf(e, input) : '';
    },
    admit: async (input: AttemptInput): Promise<AdmissionDecision> => {
      const e = await evaluateNow(input);
      if (!e.ok) { await emit(input, 'admit', 'refused', e.reasons, e.relied); return { kind: 'refused', reason: 'permission-withdrawn' }; }
      if (identityOf(e, input) !== input.permissionDigest) { await emit(input, 'admit', 'refused', ['identity-mismatch'], e.relied); return { kind: 'refused', reason: 'identity-mismatch' }; }
      let decision: AdmissionDecision;
      try { decision = await options.reserve(input); }
      catch (error) { await emit(input, 'admit', 'refused', ['reserve-failed'], e.relied); throw error; }
      if (decision.kind === 'refused') { await emit(input, 'admit', 'refused', ['reserve-refused'], e.relied); return decision; }
      // A reservation exists; if the audit cannot be written the attempt is uncertain, never silently permitted.
      return (await emit(input, 'admit', 'permitted', [], e.relied)) ? decision : { kind: 'refused', reason: 'uncertain' };
    },
    permitted: async (input: AttemptInput, _permit: DispatchPermit): Promise<boolean> => {
      const e = await evaluateNow(input);
      if (!e.ok) { await emit(input, 'dispatch', 'refused', e.reasons, e.relied); return false; }
      if (identityOf(e, input) !== input.permissionDigest) { await emit(input, 'dispatch', 'refused', ['identity-mismatch'], e.relied); return false; }
      return emit(input, 'dispatch', 'permitted', [], e.relied);
    },
    matches: request => { try { return populationDigest(request.sources) === population; } catch { return false; } },
  };
}

export type WithConsentOptions = Omit<ConsentPortsOptions, 'reserve'>;

/** Takes over `verifySources`, `permissionIdentity`, `admit` and `permitted` together, so a wiring cannot keep the
 * consent checks and drop the population binding. `base.admit` becomes the reservation run after consent holds, and
 * `base.verifySources` still runs after the population matches. */
export function withConsent(base: PipelinePorts, options: WithConsentOptions): PipelinePorts {
  const consent = createConsentPorts({ ...options, reserve: base.admit });
  return {
    ...base,
    verifySources: async request => consent.matches(request) && await base.verifySources(request),
    permissionIdentity: consent.permissionIdentity,
    admit: consent.admit,
    permitted: consent.permitted,
  };
}

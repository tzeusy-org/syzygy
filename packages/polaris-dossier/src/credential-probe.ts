import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import type { CredentialProbe } from './execution-rule.js';
import { RUN_LAYOUT } from './state-directory.js';
import { isoOf } from './iso-of.js';

/** The adapter-credential check of D9's credential condition (REQ-polaris-generation-033; R3-F1).
 *
 * Before a brief that permits execution, at every later step and at close, Syzygy attempts, as the operator's user, to read every
 * credential its configuration holds for its typed adapters. The attempt is an operating-system open for reading; nothing is read from
 * a file that opens, so the probe never holds a credential. A file that opens is a breach; one the operating system refuses (`EACCES`,
 * `EPERM`) is not readable; one that does not exist is absent. Anything else, a path that is not a regular file, a list source that is
 * unset, unreadable or malformed, or a configured typed adapter that declares a credential the repository's list does not hold, fails
 * closed. An explicitly declared empty list is valid (lead ruling, 2026-10-07): it says Syzygy holds no typed-adapter credential on this
 * host, the probe passes, and the disclosure says the list is operator-declared and Inferred. An agent tool's permission or deny rule is
 * never consulted: it does not change what the operating system lets the user read.
 *
 * The list comes from a source the disclosure names, and that source lies within the agent sessions' write reach. The check observes
 * what the operator's user could read at the instant it ran; that nothing the session started could read a credential between checks,
 * after close or through privilege escalation is Inferred. */

export const CREDENTIAL_LIST_ENV = 'SYZYGY_DOSSIER_CREDENTIAL_LIST';
export const CREDENTIAL_LIST_FORMAT = 'syzygy-adapter-credential-list/1';
const LIST_MAX_BYTES = 65_536;

export type CredentialList = { readonly ok: true; readonly paths: readonly string[] } | { readonly ok: false; readonly why: string };

export interface CredentialListSource {
  /** Where the list comes from, as the disclosure names it. */
  readonly describe: string;
  readonly list: () => CredentialList;
}

export type CredentialReadOutcome = 'readable' | 'not-readable' | 'absent' | 'unknown';

/** The operating-system read attempt for one path, injectable for tests. */
export type OpenForRead = (file: string) => { readonly opened: true; readonly regularFile: boolean } | { readonly opened: false; readonly code: string };

export const openForRead: OpenForRead = (file) => {
  let fd: number;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
  } catch (cause) {
    return { opened: false, code: (cause as NodeJS.ErrnoException).code ?? 'unknown-error' };
  }
  try {
    return { opened: true, regularFile: fs.fstatSync(fd).isFile() };
  } finally {
    fs.closeSync(fd);
  }
};

export function classifyRead(attempt: ReturnType<OpenForRead>): CredentialReadOutcome {
  if (attempt.opened) return attempt.regularFile ? 'readable' : 'unknown';
  if (attempt.code === 'EACCES' || attempt.code === 'EPERM') return 'not-readable';
  if (attempt.code === 'ENOENT') return 'absent';
  return 'unknown';
}

/** A list file: `{"format": "syzygy-adapter-credential-list/1", "credentials": ["/absolute/path", ...]}`. */
export function credentialListFromFile(file: string): CredentialListSource {
  return {
    describe: `the credential list file ${file}, which the agent sessions can write`,
    list: () => {
      let text: string;
      try {
        const stat = fs.statSync(file);
        if (!stat.isFile()) return { ok: false, why: `${file} is not a regular file` };
        if (stat.size > LIST_MAX_BYTES) return { ok: false, why: `${file} is larger than ${LIST_MAX_BYTES} bytes` };
        text = fs.readFileSync(file, 'utf8');
      } catch (cause) {
        return { ok: false, why: `${file} cannot be read (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` };
      }
      let value: unknown;
      try {
        value = parseBoundedJson(text, { maxBytes: LIST_MAX_BYTES, maxNodes: 1024, maxDepth: 2 });
      } catch {
        return { ok: false, why: `${file} is not one bounded JSON object` };
      }
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return { ok: false, why: `${file} is not a JSON object` };
      const record = value as Record<string, unknown>;
      if (Object.keys(record).sort().join(',') !== 'credentials,format' || record['format'] !== CREDENTIAL_LIST_FORMAT) {
        return { ok: false, why: `${file} is not a ${CREDENTIAL_LIST_FORMAT} document (exactly format and credentials)` };
      }
      const paths = record['credentials'];
      if (!Array.isArray(paths) || paths.some((entry) => typeof entry !== 'string' || !path.isAbsolute(entry) || entry.includes('\u0000'))) {
        return { ok: false, why: `${file} lists a credential that is not an absolute path` };
      }
      return { ok: true, paths: paths as string[] };
    },
  };
}

/** The list source named by the environment, or one that always fails when none is named. */
export function credentialListFromEnv(env: Readonly<Record<string, string | undefined>>): CredentialListSource {
  const file = env[CREDENTIAL_LIST_ENV];
  if (file === undefined || file === '') {
    return { describe: `no credential list (${CREDENTIAL_LIST_ENV} is not set)`, list: () => ({ ok: false, why: `no credential list source is configured: set ${CREDENTIAL_LIST_ENV} to a ${CREDENTIAL_LIST_FORMAT} file` }) };
  }
  return credentialListFromFile(file);
}

export interface CredentialProbeResult {
  readonly source: string;
  readonly outcomes: readonly { readonly path: string; readonly outcome: CredentialReadOutcome }[];
}

/** Credential paths that a typed adapter in this repository configures itself, added to every declared list. A sweep of `packages/`
 * and `apps/` on 2026-10-07 found none: no scheduler, version-control, CI or provider adapter here holds a credential path.
 * The cap1 daemon's `machine-credential.token` is deliberately absent: it authenticates clients to Syzygy, so it is not a credential
 * Syzygy holds for a typed adapter, and D9's credential condition does not name it. Every path a configured adapter declares in
 * `CONFIGURED_ADAPTER_DECLARATIONS` must also be here, or the probe fails closed. */
export const CONFIGURED_ADAPTER_CREDENTIALS: readonly string[] = Object.freeze([]);

/** A configured typed adapter's own statement of the credential paths it holds. */
export interface AdapterCredentialDeclaration {
  readonly adapter: string;
  readonly credentials: readonly string[];
}

/** The typed adapters configured in this repository that declare a credential, each with the paths it declares. The probe refuses
 * when any declared path is missing from `CONFIGURED_ADAPTER_CREDENTIALS`, so that hand-kept list cannot fall silently behind an
 * adapter (owner direction GP-Q7, 2026-10-21). A sweep on 2026-10-22 found none: neither adapter-registry entry declares a credential,
 * and no implementation source in `packages/` or `apps/` holds a typed-adapter credential path. */
export const CONFIGURED_ADAPTER_DECLARATIONS: readonly AdapterCredentialDeclaration[] = Object.freeze([]);

export const NO_ADAPTER_CREDENTIAL_DECLARED = 'no adapter credential declared; list operator-declared, Inferred';

/** The probe `brief` and every later step call. It refuses first when a configured adapter declares a credential `configured` does
 * not hold. Otherwise it reads the union of the declared list and `configured`; an explicitly declared empty list with nothing
 * configured passes, with a disclosure that says so, and an unset, unreadable or malformed source fails. */
export function createCredentialProbe(
  source: CredentialListSource, open: OpenForRead = openForRead, configured: readonly string[] = CONFIGURED_ADAPTER_CREDENTIALS,
  adapters: readonly AdapterCredentialDeclaration[] = CONFIGURED_ADAPTER_DECLARATIONS,
): CredentialProbe & { readonly last: () => CredentialProbeResult | null } {
  let last: CredentialProbeResult | null = null;
  return {
    last: () => last,
    probe: async () => {
      const described = `${source.describe}, together with ${configured.length} credential path${configured.length === 1 ? '' : 's'} configured by typed adapters in this repository`;
      const unlisted = adapters.flatMap(({ adapter, credentials }) => credentials.filter((file) => !configured.includes(file)).map((file) => `${adapter}: ${file}`));
      if (unlisted.length > 0) {
        last = { source: described, outcomes: [] };
        return { passed: false, why: `a configured typed adapter declares a credential the repository's adapter-credential list does not hold: ${unlisted.join(', ')}` };
      }
      const list = source.list();
      if (!list.ok) { last = { source: source.describe, outcomes: [] }; return { passed: false, why: `${list.why} (source: ${source.describe})` }; }
      const paths = [...new Set([...list.paths, ...configured])];
      if (paths.length === 0) {
        last = { source: described, outcomes: [] };
        return { passed: true, checked: 0, source: `${NO_ADAPTER_CREDENTIAL_DECLARED} (${described})` };
      }
      const outcomes = paths.map((file) => ({ path: file, outcome: classifyRead(open(file)) }));
      last = { source: described, outcomes };
      const readable = outcomes.filter((entry) => entry.outcome === 'readable').map((entry) => entry.path);
      const unknown = outcomes.filter((entry) => entry.outcome === 'unknown').map((entry) => entry.path);
      if (readable.length > 0) return { passed: false, why: `adapter credentials readable by the operator's user: ${readable.join(', ')}` };
      if (unknown.length > 0) return { passed: false, why: `the read attempt could not decide for: ${unknown.join(', ')}` };
      return { passed: true, checked: outcomes.length, source: described };
    },
  };
}

export const CREDENTIAL_CHECK_DISCLOSURE = 'The adapter-credential check is an operating-system read attempt as the operator\'s user at the instant of each step; its list comes from the source it names, which the agent sessions can write. That no process the session started could read a credential between checks, after close or through privilege escalation is Inferred. An agent tool\'s permission or deny rule does not satisfy it.';

export type CredentialStep = 'check' | 'inventory-check' | 'review-check' | 'render' | 'close';

export interface CredentialBreachFinding {
  readonly kind: 'adapter-credential-readable';
  readonly step: CredentialStep;
  readonly at: string;
  readonly why: string;
  readonly instruction: 'Run no further observed code: the permission to build and run the observed project has lapsed for this run.';
}

export type CredentialStepResult =
  | { readonly required: false; readonly why: string }
  | { readonly required: true; readonly passed: true; readonly checked: number; readonly source: string }
  | { readonly required: true; readonly passed: false; readonly finding: CredentialBreachFinding };

/** The step hook S6–S10 call. It is required once a brief has been issued that permits execution, or when the brief record cannot be
 * read to say it did not; a failure becomes a finding of that step and is appended to the run's breach log. */
export async function credentialStepCheck(runDir: string, step: CredentialStep, probe: CredentialProbe, now: number): Promise<CredentialStepResult> {
  const run = path.resolve(runDir);
  const briefIssued = fs.existsSync(path.join(run, RUN_LAYOUT.brief)) || fs.existsSync(path.join(run, RUN_LAYOUT.briefRecord));
  if (!briefIssued) return { required: false, why: 'no brief has been issued, so no permission to execute exists' };
  if (storedBriefArm(run) === 'sec-3') return { required: false, why: 'the brief carried SEC-3\'s rule and permits no execution' };
  const result = await probe.probe();
  if (result.passed) return { required: true, passed: true, checked: result.checked, source: result.source };
  const finding: CredentialBreachFinding = {
    kind: 'adapter-credential-readable', step, at: isoOf(now), why: result.why,
    instruction: 'Run no further observed code: the permission to build and run the observed project has lapsed for this run.',
  };
  fs.appendFileSync(path.join(run, RUN_LAYOUT.credentialBreaches), `${JSON.stringify(finding)}\n`, { mode: 0o600 });
  return { required: true, passed: false, finding };
}

/** The arm the stored brief record names; null when it cannot be read, which every caller treats as permitting (fail closed). */
export function storedBriefArm(run: string): 'sec-3' | 'permitting' | null {
  try {
    const record = parseBoundedJson(fs.readFileSync(path.join(run, RUN_LAYOUT.briefRecord), 'utf8'), { maxBytes: 262_144, maxNodes: 4096, maxDepth: 8 }) as { executionRule?: { arm?: unknown } };
    const arm = record.executionRule?.arm;
    return arm === 'sec-3' || arm === 'permitting' ? arm : null;
  } catch {
    return null;
  }
}

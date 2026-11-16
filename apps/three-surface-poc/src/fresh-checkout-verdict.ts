// Fresh-checkout verdict (bead syzygy-1z3.24.6; PWB-LIVE-14): the exit
// polarity of the fresh-checkout demonstration, as one pure function over
// every invariant the evidence record carries. Before this, the command
// recorded clone/head equality, the Butlers revision, authority admission,
// parity, limit breaches and the daemon's exit and then ignored all of them
// when choosing its exit code. Now every recorded falsifier moves the
// polarity: the command exits 0 only when every invariant holds, and the
// evidence names each one that did not.
//
// PWB-REQ-021 record readiness is recorded but deliberately not an
// invariant here: no run record exists until the owner has walked, so a
// `no-run-record` state is the expected pre-walk fact, not a defect. The
// walkthrough preflight (the mechanical readiness of the surface) is.

import { isRecord } from '@syzygy/support';

export const FRESH_CHECKOUT_INVARIANTS = [
  'clone-head-matches-source',
  'install',
  'build',
  'test',
  'machine-refused-without-credential',
  'machine-served-with-credential',
  'human-routes-served',
  'source-route-served',
  'tailnet-mount-served',
  'presentation-served-with-credential',
  'browser-origin-refused',
  'butlers-revision-matches-model',
  'shape-observed',
  'authority-admits',
  'parity',
  'limit-breaches',
  'preflight-ready',
  'daemon-exit-clean',
  'evidence-written',
] as const;
// Test seam: exported type the tests name; production code uses it only inside this file.
export type FreshCheckoutInvariant = (typeof FRESH_CHECKOUT_INVARIANTS)[number];

/** PWB-REQ-020 parity as the sweep oracle states it: every rendered claim
 * tuple carries the machine claim's exact state (a claim may be cited in
 * more than one place, so tuples outnumber distinct ids); the machine
 * answer carries each claim once; every machine claim is rendered and
 * every rendered claim is in the machine answer. */
export interface FreshCheckoutParity {
  readonly humanClaimTuples: number;
  readonly humanDistinctClaimIds: number;
  readonly humanTuplesMismatchingMachine: number;
  readonly machinePresentedClaimIds: number;
  readonly machineDistinctClaimIds: number;
  readonly machineIdsAbsentFromHuman: number;
  readonly humanIdsAbsentFromMachine: number;
}

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface FreshCheckoutInvariants {
  readonly cloneHeadMatchesSource: boolean;
  readonly installExitCode: number;
  readonly buildExitCode: number;
  readonly testExitCode: number;
  readonly refusedStatus: number;
  readonly machineStatus: number;
  /** Status of every human route fetched (`/`, `/polaris`, …); must be nonempty. */
  readonly humanRouteStatuses: readonly number[];
  readonly sourceRouteStatus: number;
  /** PWB-RECON-07 probes. The tailnet mount is the Polaris page fetched
   * with the tailnet Host header `tailscale serve` forwards: it must be
   * served, every internal link must carry the mount prefix, and it must
   * disclose exactly as many authority sentences as the direct page. */
  readonly tailnetMountStatus: number;
  readonly tailnetMountPrefixedLinks: boolean;
  readonly tailnetDisclosureMarkers: number;
  readonly directDisclosureMarkers: number;
  /** The machine presentation envelope: refused without the credential,
   * served with it as the presentation kind, never citable. */
  readonly presentationRefusedStatus: number;
  readonly presentationStatus: number;
  readonly presentationKind: string;
  readonly presentationCitable: boolean | null;
  /** A browser request carrying a foreign Origin is refused by reason. */
  readonly foreignOriginStatus: number;
  readonly foreignOriginReason: string;
  readonly daemonObservedRevision: string;
  readonly modelRevision: string;
  readonly shapeKind: string;
  /** `null` when no authority was evaluated at all. */
  readonly authorityAdmits: boolean | null;
  readonly parity: FreshCheckoutParity;
  readonly limitBreaches: number;
  readonly preflightReady: boolean;
  readonly daemonExitCode: number | null;
  readonly daemonStderr: string;
  /** One entry per refusal probe the demo sent: since #106 the daemon logs
   * one `daemon-http-outcome` line per non-2xx response, so its stderr must
   * carry exactly these and nothing else. */
  readonly expectedDaemonDiagnostics: readonly ExpectedDaemonDiagnostic[];
  readonly evidenceWritten: boolean;
}

/** A refusal the demo provoked on purpose, as the daemon must log it. */
export interface ExpectedDaemonDiagnostic {
  readonly method: string;
  readonly route: string;
  readonly status: number;
}

/** One stderr line as the verdict read it: the parsed object, or `null`
 * when the line is not a JSON object. */
type DaemonStderrLine = Readonly<Record<string, unknown>> | null;

/** Every stderr line, parsed one per line. Only the final newline is
 * dropped, so a blank line inside the stream is a non-JSON line. */
export function parseDaemonStderr(stderr: string): DaemonStderrLine[] {
  if (stderr === '') return [];
  const lines = stderr.endsWith('\n') ? stderr.slice(0, -1).split('\n') : stderr.split('\n');
  return lines.map((line) => {
    try {
      const value: unknown = JSON.parse(line);
      return isRecord(value) ? (value as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  });
}

/** Reasons the daemon gives only when it failed, never for a refusal. */
const FAILURE_REASONS: ReadonlySet<unknown> = new Set(['handler-failure', 'response-limit-breached']);

/** True when the stderr lines are exactly the expected multiset: each line
 * a `daemon-http-outcome` for one expected (method, route, status), none a
 * failure reason, none left over, none missing. A missing line fails too:
 * the probe's diagnostic is itself the evidence that refusals are logged. */
function daemonStderrIsExactlyProbes(stderr: string, expected: readonly ExpectedDaemonDiagnostic[]): boolean {
  const unmatched = [...expected];
  for (const line of parseDaemonStderr(stderr)) {
    if (line === null || line['kind'] !== 'daemon-http-outcome' || FAILURE_REASONS.has(line['reason'])) return false;
    const index = unmatched.findIndex((probe) => probe.method === line['method'] && probe.route === line['route'] && probe.status === line['status']);
    if (index === -1) return false;
    unmatched.splice(index, 1);
  }
  return unmatched.length === 0;
}

interface FreshCheckoutVerdict {
  readonly healthy: boolean;
  readonly failed: readonly FreshCheckoutInvariant[];
}

const HEX_REVISION = /^[0-9a-f]{40,64}$/;

/** Every invariant is checked; every failure is named. */
export function freshCheckoutVerdict(inputs: FreshCheckoutInvariants): FreshCheckoutVerdict {
  const failed: FreshCheckoutInvariant[] = [];
  const check = (name: FreshCheckoutInvariant, holds: boolean): void => {
    if (!holds) failed.push(name);
  };
  const parity = inputs.parity;
  check('clone-head-matches-source', inputs.cloneHeadMatchesSource);
  check('install', inputs.installExitCode === 0);
  check('build', inputs.buildExitCode === 0);
  check('test', inputs.testExitCode === 0);
  check('machine-refused-without-credential', inputs.refusedStatus === 401);
  check('machine-served-with-credential', inputs.machineStatus === 200);
  check('human-routes-served', inputs.humanRouteStatuses.length > 0 && inputs.humanRouteStatuses.every((status) => status === 200));
  check('source-route-served', inputs.sourceRouteStatus === 200);
  check('tailnet-mount-served', inputs.tailnetMountStatus === 200 && inputs.tailnetMountPrefixedLinks && inputs.directDisclosureMarkers > 0 && inputs.tailnetDisclosureMarkers === inputs.directDisclosureMarkers);
  check('presentation-served-with-credential', inputs.presentationRefusedStatus === 401 && inputs.presentationStatus === 200 && inputs.presentationKind === 'polaris-presentation' && inputs.presentationCitable === false);
  check('browser-origin-refused', inputs.foreignOriginStatus === 403 && inputs.foreignOriginReason === 'browser-origin-refused');
  check('butlers-revision-matches-model', HEX_REVISION.test(inputs.daemonObservedRevision) && inputs.daemonObservedRevision === inputs.modelRevision);
  check('shape-observed', inputs.shapeKind === 'observed');
  check('authority-admits', inputs.authorityAdmits === true);
  check(
    'parity',
    parity.humanClaimTuples > 0
      && parity.humanTuplesMismatchingMachine === 0
      && parity.machinePresentedClaimIds === parity.machineDistinctClaimIds
      && parity.humanDistinctClaimIds === parity.machineDistinctClaimIds
      && parity.machineIdsAbsentFromHuman === 0
      && parity.humanIdsAbsentFromMachine === 0,
  );
  check('limit-breaches', inputs.limitBreaches === 0);
  check('preflight-ready', inputs.preflightReady);
  check('daemon-exit-clean', inputs.daemonExitCode === 0 && daemonStderrIsExactlyProbes(inputs.daemonStderr, inputs.expectedDaemonDiagnostics));
  check('evidence-written', inputs.evidenceWritten);
  return { healthy: failed.length === 0, failed };
}

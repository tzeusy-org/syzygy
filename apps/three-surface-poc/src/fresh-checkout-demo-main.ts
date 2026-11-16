// `npm run poc:fresh-checkout-demo -- --repo <butlers>` — task 4.5
// (syzygy-1z3.21; exit gate and readiness preflight from syzygy-1z3.24.6):
// the fresh-checkout demonstration against the configured Butlers revision,
// with the exact test and runtime artifacts retained.
//
// What it does, from committed bytes only:
//   1. `git clone` this checkout into a temporary directory (tags included —
//      the body-read authority gate needs the signing tags);
//   2. `npm ci`, `npm run build`, then the clone's own test run to a JUnit
//      artifact;
//   3. start the clone's own built daemon against the one configured Butlers
//      repository (the daemon evaluates PWB-REQ-005 from the clone's
//      governance tree before any body read — this program reads nothing
//      from Butlers itself);
//   4. fetch every human route, the exact-source route for every identity
//      Polaris links, and the machine answer (unauthenticated must be
//      refused; authenticated must succeed); compare every Polaris claim
//      tuple with the machine answer's claim by id (state for state), both
//      denominators kept; run the clone's own browser check; evaluate the
//      walkthrough preflight over the served page and routes;
//   5. retain every artifact byte-exact, named by SHA-256, in a local
//      retention directory outside the repository (the consent excludes
//      network egress, and this repository is pushed), and write a
//      committed evidence record carrying digests, counts and states only —
//      never act digests, never Butlers text;
//   6. exit 0 only when every recorded invariant holds
//      (`fresh-checkout-verdict.ts` names each one that failed).
//
// The daemon (`main.ts`) never imports this file.
import { execFileSync, spawn } from 'node:child_process';
import * as http from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { PocModel, ProjectShape } from '@syzygy/three-surface-poc-core';
import { sha256 } from '@syzygy/support';

import { TAILNET_HOST } from './browser-origin.js';
import { FRESH_CHECKOUT_INVARIANTS, freshCheckoutVerdict, parseDaemonStderr, type ExpectedDaemonDiagnostic, type FreshCheckoutParity } from './fresh-checkout-verdict.js';
import { POLARIS_HUMAN_PATH } from './polaris.js';
import { POLARIS_PRESENTATION_PATH } from './routes.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { POLARIS_SOURCE_PATH, SOURCE_IDENTITY_PARAM, sourceRouteIdentities } from './polaris-source.js';
import { evaluateWalkthroughPreflight, presentedShapeClaims, type BrowserCheckInput, type SourceRouteOutcome } from './walkthrough-preflight.js';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

interface Timed {
  readonly seconds: number;
  readonly exitCode: number;
}

function run(cwd: string, command: string, args: readonly string[], log: string[]): Timed {
  const started = Date.now();
  let exitCode = 0;
  try {
    execFileSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (error: unknown) {
    exitCode = typeof (error as { status?: number }).status === 'number' ? (error as { status: number }).status : 1;
    const stderr = (error as { stderr?: Buffer }).stderr;
    log.push(`${command} ${args.join(' ')} exited ${exitCode}\n${stderr === undefined ? '' : stderr.toString('utf8').slice(-4000)}`);
  }
  return { seconds: Number(((Date.now() - started) / 1000).toFixed(1)), exitCode };
}

/** Root-tag attributes of a JUnit report, read without descending into cases. */
function junitTotals(xml: string): Record<string, string> {
  const root = /<testsuites\b([^>]*)>/.exec(xml) ?? /<testsuite\b([^>]*)>/.exec(xml);
  const out: Record<string, string> = {};
  if (root === null) return out;
  for (const match of (root[1] as string).matchAll(/([a-zA-Z]+)="([^"]*)"/g)) out[match[1] as string] = match[2] as string;
  return out;
}

interface Daemon {
  readonly baseUrl: string;
  readonly credentialPath: string;
  readonly observedRevision: string;
  /** The binding the daemon announced for a walkthrough record, when it did. */
  readonly walkthroughBinding: { readonly surfaceVersion: string; readonly evaluationIdentity: string } | null;
  stop(): Promise<number | null>;
  readonly stderr: () => string;
}

function startDaemon(cloneDir: string, butlersRepo: string, stateDir: string): Promise<Daemon> {
  const child = spawn(process.execPath, [join(cloneDir, 'apps', 'three-surface-poc', 'dist', 'main.js'), '--repo', butlersRepo, '--state-dir', stateDir, '--port', '0'], {
    cwd: cloneDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  let err = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    out += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    err += chunk;
  });
  const exited = new Promise<number | null>((resolveExit) => child.once('exit', (code) => resolveExit(code)));
  return new Promise<Daemon>((resolveDaemon, reject) => {
    const deadline = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`daemon did not announce its address within 120s\nstdout:\n${out}\nstderr:\n${err}`));
    }, 120_000);
    const tryResolve = (): void => {
      const url = /Syzygy Three-Surface POC: (http:\/\/127\.0\.0\.1:\d+)\//.exec(out);
      const credential = /Machine credential \((?:minted|reused)\) at: (.+)/.exec(out);
      const revision = /Observed revision: (\S+)/.exec(out);
      if (url?.[1] === undefined || credential?.[1] === undefined || revision?.[1] === undefined) return;
      clearTimeout(deadline);
      const surface = /Walkthrough surface version: (\S+)/.exec(out);
      const evaluation = /Walkthrough evaluation identity: (\S+)/.exec(out);
      resolveDaemon({
        baseUrl: url[1],
        credentialPath: credential[1].trim(),
        observedRevision: revision[1],
        walkthroughBinding: surface?.[1] !== undefined && evaluation?.[1] !== undefined ? { surfaceVersion: surface[1], evaluationIdentity: evaluation[1] } : null,
        stderr: () => err,
        stop: async () => {
          if (child.exitCode === null && child.signalCode === null) child.kill('SIGINT');
          return exited;
        },
      });
    };
    child.stdout?.on('data', tryResolve);
    void exited.then((code) => {
      clearTimeout(deadline);
      reject(new Error(`daemon exited (${String(code)}) before announcing its address\nstdout:\n${out}\nstderr:\n${err}`));
    });
  });
}

/** A request with explicit Host and Origin headers — the Fetch API drops a
 * set Host header, so the tailnet-mount and foreign-Origin probes
 * (PWB-RECON-07) go through `node:http` directly. */
function requestWithHeaders(baseUrl: string, path: string, headers: Readonly<Record<string, string>>): Promise<{ readonly status: number; readonly body: Uint8Array; readonly contentType: string }> {
  const target = new URL(`${baseUrl}${path}`);
  return new Promise((resolvePromise, reject) => {
    const request = http.request({ hostname: target.hostname, port: target.port, path: `${target.pathname}${target.search}`, method: 'GET', headers: { ...headers } }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolvePromise({ status: response.statusCode ?? 0, body: new Uint8Array(Buffer.concat(chunks)), contentType: response.headers['content-type'] ?? '' }));
    });
    request.on('error', reject);
    request.end();
  });
}

function countDisclosureMarkers(html: string): number {
  return html.split('data-parity-field="authority-disclosure"').length - 1;
}

/** Every internal link on a tailnet-mounted page carries the mount prefix
 * (a root-relative one resolves to the wrong host in the browser). */
function internalLinksPrefixed(html: string): boolean {
  const hrefs = Array.from(html.matchAll(/href="(\/[^"]*)"/g), (match) => match[1] as string);
  return hrefs.length > 0 && hrefs.every((href) => href === TAILNET_MOUNT_PREFIX || href.startsWith(`${TAILNET_MOUNT_PREFIX}/`));
}

async function fetchRoute(baseUrl: string, path: string, token?: string): Promise<{ readonly status: number; readonly body: Uint8Array; readonly contentType: string }> {
  const response = await fetch(`${baseUrl}${path}`, { headers: token === undefined ? {} : { authorization: `Bearer ${token}` } });
  return { status: response.status, body: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get('content-type') ?? '' };
}

/** What Polaris omits by design (the 4.3 parity oracle's rule: reconciled
 * facts fold into their account statements, project-account-section items
 * into the account itself); the presented population itself comes from
 * `presentedShapeClaims`, the one rule the preflight shares with the oracle. */
function omittedByDesign(shape: ProjectShape): Record<string, number> {
  if (shape.kind !== 'observed') return {};
  return { reconciledFacts: shape.facts.length, projectAccountSectionItems: shape.items.filter((item) => item.class === 'project-account-section').length };
}

function decodeAttr(text: string): string {
  return text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** The epistemic tuple the parity oracle compares, from a machine claim. */
function machineTuple(claim: { readonly claimId: string; readonly epistemic: unknown }): string {
  const e = claim.epistemic as { label: string; tier?: string; freshness?: string; reasons?: { primary: string; secondary: readonly string[] }; basis?: string };
  const primary = e.reasons !== undefined ? e.reasons.primary : e.basis !== undefined ? e.basis : 'none';
  const secondary = e.reasons !== undefined ? e.reasons.secondary : [];
  return [claim.claimId, e.label, e.tier ?? 'unstated', primary, secondary.join(','), e.freshness ?? 'unstated'].join('|');
}

/** Every rendered claim tuple on the page, in document order, as the oracle
 * reads it: id, label, tier, primary reason, secondary reasons, freshness. */
function humanTuples(html: string): readonly string[] {
  const attr = (span: string, name: string): string => decodeAttr(new RegExp(`${name}="([^"]*)"`).exec(span)?.[1] ?? '');
  return Array.from(html.matchAll(/<[a-z]+ [^>]*data-claim-id="[^>]*>/g), (match) => {
    const span = match[0];
    return ['data-claim-id', 'data-epistemic-label', 'data-epistemic-tier', 'data-epistemic-primary-reason', 'data-epistemic-secondary-reasons', 'data-epistemic-freshness'].map((name) => attr(span, name)).join('|');
  });
}

/** PWB-REQ-020 parity, multiplicity preserved: every rendered tuple against
 * the machine claim of the same id, and the two id populations against each
 * other. Counts only — the evidence record carries no claim text. */
function claimParity(html: string, shape: ProjectShape): FreshCheckoutParity & { readonly machineOmittedByDesign: Record<string, number> } {
  const tuples = humanTuples(html);
  const presented = presentedShapeClaims(shape);
  const byId = new Map(presented.map((claim) => [claim.claimId, machineTuple(claim)]));
  const humanIds = tuples.map((tuple) => tuple.split('|')[0] as string);
  const humanSet = new Set(humanIds);
  const machineSet = new Set(byId.keys());
  return {
    humanClaimTuples: tuples.length,
    humanDistinctClaimIds: humanSet.size,
    humanTuplesMismatchingMachine: tuples.filter((tuple) => byId.get(tuple.split('|')[0] as string) !== tuple).length,
    machinePresentedClaimIds: presented.length,
    machineDistinctClaimIds: machineSet.size,
    machineOmittedByDesign: omittedByDesign(shape),
    machineIdsAbsentFromHuman: [...machineSet].filter((id) => !humanSet.has(id)).length,
    humanIdsAbsentFromMachine: [...humanSet].filter((id) => !machineSet.has(id)).length,
  };
}

/** The exact-source route, once per identity the page links, read the way
 * the preflight needs it: rendered with a requirement count, not rendered
 * with the page's own reason, or unreachable. */
async function probeSourceRoutes(baseUrl: string, polarisHtml: string, retain: (name: string, bytes: Uint8Array) => string): Promise<{ readonly outcomes: Map<string, SourceRouteOutcome>; readonly routes: Record<string, unknown>[] }> {
  const identities = [...new Set(sourceRouteIdentities(polarisHtml))];
  const outcomes = new Map<string, SourceRouteOutcome>();
  const routes: Record<string, unknown>[] = [];
  let index = 0;
  for (const identity of identities) {
    const path = `${POLARIS_SOURCE_PATH}?${SOURCE_IDENTITY_PARAM}=${encodeURIComponent(identity)}`;
    const response = await fetchRoute(baseUrl, path);
    const body = new TextDecoder().decode(response.body);
    const verbatim = /data-polaris-source-route data-verbatim="([^"]*)"/.exec(body)?.[1];
    let outcome: SourceRouteOutcome;
    if (response.status !== 200 || verbatim === undefined) outcome = { state: 'unreachable', detail: `status ${response.status}${verbatim === undefined ? ', no source-route section' : ''}` };
    else if (verbatim === 'rendered') outcome = { state: 'rendered', requirements: body.split('data-verbatim-requirement="').length - 1 };
    else outcome = { state: 'not-rendered', reason: decodeAttr(/data-unknown-reason="([^"]*)"/.exec(body)?.[1] ?? 'unstated') };
    outcomes.set(identity, outcome);
    index += 1;
    const name = `polaris-source-${index}.html`;
    routes.push({ path: POLARIS_SOURCE_PATH, identityIndex: index, status: response.status, contentType: response.contentType, bytes: response.body.byteLength, sha256: retain(name, response.body), retainedAs: name, outcome });
  }
  return { outcomes, routes };
}

/** The clone's own browser check (`polaris-accessibility-main`), when a
 * browser exists on this machine; exit 2 means none was found and the check
 * was not performed — which the preflight reports, never hides. */
function browserCheck(cloneDir: string, retain: (name: string, bytes: string) => string, log: string[]): BrowserCheckInput & { readonly exitCode: number; readonly seconds: number; readonly sha256?: string } {
  const out = join(cloneDir, 'accessibility-browser-run.json');
  const timed = run(cloneDir, process.execPath, [join('apps', 'three-surface-poc', 'dist', 'polaris-accessibility-main.js'), '--out', out], log);
  if (timed.exitCode === 2) return { kind: 'not-performed', detail: 'no browser found on PATH (exit 2)', ...timed };
  let report: { commit?: string; totals?: { variants?: number; violations?: number } };
  try {
    report = JSON.parse(readFileSync(out, 'utf8')) as typeof report;
  } catch (error: unknown) {
    return { kind: 'not-performed', detail: `browser check exited ${timed.exitCode} without a readable report: ${error instanceof Error ? error.message : String(error)}`, ...timed };
  }
  const digest = retain('accessibility-browser-run.json', readFileSync(out, 'utf8'));
  if (typeof report.commit !== 'string' || typeof report.totals?.variants !== 'number' || typeof report.totals.violations !== 'number') {
    return { kind: 'not-performed', detail: `browser check report lacks commit or totals (exit ${timed.exitCode})`, ...timed, sha256: digest };
  }
  return { kind: 'performed', commit: report.commit, variants: report.totals.variants, violations: report.totals.violations, ...timed, sha256: digest };
}

/** A state-only summary of the project shape: no act digests, no Butlers text. */
function summarizeShape(shape: ProjectShape): Record<string, unknown> {
  const authority = shape.authority === undefined
    ? undefined
    : {
        admits: shape.authority.admits,
        authorizationMode: shape.authority.authorizationMode,
        authorities: shape.authority.authorities.map((entry) => ({ authority: entry.authority, state: entry.state, independentlyVerified: entry.independentlyVerified, invalidCase: entry.invalidCase ?? null })),
        contradiction: shape.authority.contradiction ?? null,
      };
  const claim = { label: shape.claim.epistemic.label, tier: shape.claim.epistemic.tier ?? null, freshness: shape.claim.epistemic.freshness ?? null };
  switch (shape.kind) {
    case 'not-evaluated':
      return { kind: shape.kind, detail: shape.detail, claim };
    case 'not-admitted':
      return { kind: shape.kind, authority, reason: shape.reason, secondaryReasons: shape.secondaryReasons, claim };
    case 'observation-failed':
      return { kind: shape.kind, authority, failure: shape.failure, claim };
    case 'observed':
      return {
        kind: shape.kind,
        authority,
        identity: {
          repositoryId: shape.identity.repositoryId,
          revision: shape.identity.revision,
          sourceClaimedInstant: shape.identity.sourceClaimedInstant,
          observer: shape.identity.observer,
          policy: shape.identity.policy,
          manifestIdentity: shape.identity.manifestIdentity,
          manifestDigest: shape.identity.manifestDigest,
          observationDigest: shape.identity.observationDigest,
        },
        counts: shape.counts,
        classes: Object.fromEntries(Object.entries(shape.classes).map(([name, aggregate]) => [name, { denominator: aggregate.denominator, modeled: aggregate.modeled, unknown: aggregate.unknown, contradicted: aggregate.contradicted, sourcesWithUnknownDenominator: aggregate.sourcesWithUnknownDenominator, label: aggregate.claim.epistemic.label }])),
        sources: shape.sources.map((source) => ({ path: source.path, label: source.claim.epistemic.label, reason: 'reasons' in source.claim.epistemic ? source.claim.epistemic.reasons.primary : null })),
        unknownItemsByReason: countBy(shape.items.filter((item) => item.claim.epistemic.label === 'Unknown').map((item) => ('reasons' in item.claim.epistemic ? item.claim.epistemic.reasons.primary : 'unstated'))),
        exclusions: shape.exclusions.length,
        limitBreaches: shape.limitBreaches.length,
        degradation: shape.degradation ?? null,
        // Phase A's discovery outcome per pillar (PWB-RECON-02): the cause of
        // a whole-shape Unknown is recorded here, as the page renders it.
        discovery: shape.discovery.map((pillar) => (pillar.state === 'discovered' ? { key: pillar.key, state: pillar.state, indexPath: pillar.indexPath, namedSources: pillar.namedSources } : { key: pillar.key, state: pillar.state, reason: pillar.reason, root: pillar.root, indexPath: pillar.indexPath })),
        contradictions: shape.contradictions.length,
        claim,
      };
  }
}

function summarizeReadiness(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  const presentation = value as { kind?: string; detail?: string; readiness?: { kind?: string; ready?: boolean; findings?: readonly { arm?: string }[] } };
  if (presentation.kind !== 'evaluated' || presentation.readiness === undefined) return { kind: presentation.kind ?? null, detail: presentation.detail ?? null };
  const readiness = presentation.readiness;
  return { kind: readiness.kind ?? null, ready: readiness.ready ?? null, arms: countBy((readiness.findings ?? []).map((finding) => finding.arm ?? 'unstated')) };
}

function countBy(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return out;
}

async function main(): Promise<number> {
  const butlersRepo = argument('--repo');
  if (butlersRepo === undefined) {
    process.stderr.write('usage: npm run poc:fresh-checkout-demo -- --repo <absolute-path-to-butlers> [--retain-dir <dir>] [--date YYYY-MM-DD]\n');
    return 2;
  }
  const date = argument('--date') ?? new Date().toISOString().slice(0, 10);
  const sourceRoot = process.cwd();
  const sourceHead = git(sourceRoot, ['rev-parse', 'HEAD']);
  const retainDir = resolve(argument('--retain-dir') ?? join(process.env['XDG_STATE_HOME'] ?? join(homedir(), '.local', 'state'), 'syzygy', `pwb-p4-5-fresh-checkout-demo-${date}`));
  mkdirSync(retainDir, { recursive: true });
  const base = mkdtempSync(join(tmpdir(), 'syzygy-poc-fresh-'));
  const cloneDir = join(base, 'clone');
  const stateDir = join(base, 'state');
  const log: string[] = [];
  const retained: { readonly name: string; readonly bytes: number; readonly sha256: string }[] = [];
  const retain = (name: string, bytes: Uint8Array | string): string => {
    const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
    const digest = sha256(data);
    writeFileSync(join(retainDir, name), data);
    retained.push({ name, bytes: data.byteLength, sha256: digest });
    return digest;
  };
  const say = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };

  try {
    // 1. Fresh clone of committed bytes, tags included.
    const cloneTimed = run(sourceRoot, 'git', ['clone', '--quiet', sourceRoot, cloneDir], log);
    if (cloneTimed.exitCode !== 0) throw new Error('git clone failed');
    const cloneHead = git(cloneDir, ['rev-parse', 'HEAD']);
    const signingTags = git(cloneDir, ['tag', '-l', 'pwb-*-signed-*']).split('\n').filter((tag) => tag !== '');
    say(`clone ${cloneHead.slice(0, 12)} (${cloneTimed.seconds}s), ${signingTags.length} signing tags`);

    // 2. Install, build, test in the clone.
    const install = run(cloneDir, 'npm', ['ci', '--no-audit', '--no-fund'], log);
    say(`npm ci exit ${install.exitCode} (${install.seconds}s)`);
    const build = run(cloneDir, 'npm', ['run', 'build'], log);
    say(`npm run build exit ${build.exitCode} (${build.seconds}s)`);
    const junitPath = join(base, 'vitest-junit.xml');
    const test = run(cloneDir, 'npx', ['vitest', 'run', '--reporter=junit', `--outputFile=${junitPath}`], log);
    const junitXml = readFileSync(junitPath, 'utf8');
    const junitDigest = retain('vitest-junit.xml', junitXml);
    const totals = junitTotals(junitXml);
    say(`vitest exit ${test.exitCode} (${test.seconds}s): ${JSON.stringify(totals)}`);

    // 3. The clone's own daemon against the configured Butlers repository.
    const daemon = await startDaemon(cloneDir, butlersRepo, stateDir);
    say(`daemon at ${daemon.baseUrl}, observed Butlers revision ${daemon.observedRevision}`);
    say(daemon.walkthroughBinding === null ? 'daemon announced no walkthrough binding' : `walkthrough binding ${daemon.walkthroughBinding.surfaceVersion} / ${daemon.walkthroughBinding.evaluationIdentity}`);
    const token = readFileSync(daemon.credentialPath, 'utf8').trim();

    // 4. Routes and the machine answer.
    const routes: Record<string, unknown>[] = [];
    const humanPaths = ['/', '/polaris', '/trajectory', '/orrery'] as const;
    const humanRouteStatuses: number[] = [];
    // Each refusal this demo provokes on purpose, as the daemon must log it
    // (one stderr line per non-2xx response since #106).
    const expectedDaemonDiagnostics: ExpectedDaemonDiagnostic[] = [];
    let polarisBytes: Uint8Array = new Uint8Array();
    for (const path of humanPaths) {
      const response = await fetchRoute(daemon.baseUrl, path);
      const name = `${path === '/' ? 'home' : path.slice(1)}.html`;
      humanRouteStatuses.push(response.status);
      if (path === '/polaris') polarisBytes = response.body;
      routes.push({ path, status: response.status, contentType: response.contentType, bytes: response.body.byteLength, sha256: retain(name, response.body), retainedAs: name });
    }
    const refused = await fetchRoute(daemon.baseUrl, '/api/poc');
    expectedDaemonDiagnostics.push({ method: 'GET', route: '/api/poc', status: 401 });
    routes.push({ path: '/api/poc', authenticated: false, status: refused.status, bytes: refused.body.byteLength });
    const machine = await fetchRoute(daemon.baseUrl, '/api/poc', token);
    routes.push({ path: '/api/poc', authenticated: true, status: machine.status, contentType: machine.contentType, bytes: machine.body.byteLength, sha256: retain('api-poc.json', machine.body), retainedAs: 'api-poc.json' });
    const model = JSON.parse(new TextDecoder().decode(machine.body)) as PocModel;

    // PWB-RECON-07 probes: the tailnet mount (by Host, the one signal that
    // survives `tailscale serve`), the machine presentation envelope, and a
    // foreign-Origin refusal.
    const tailnet = await requestWithHeaders(daemon.baseUrl, POLARIS_HUMAN_PATH, { Host: TAILNET_HOST, Origin: `https://${TAILNET_HOST}` });
    const tailnetHtml = new TextDecoder().decode(tailnet.body);
    routes.push({ path: POLARIS_HUMAN_PATH, host: TAILNET_HOST, status: tailnet.status, contentType: tailnet.contentType, bytes: tailnet.body.byteLength, sha256: retain('polaris-tailnet.html', tailnet.body), retainedAs: 'polaris-tailnet.html', prefixedLinks: internalLinksPrefixed(tailnetHtml), disclosureMarkers: countDisclosureMarkers(tailnetHtml) });
    const presentationRefused = await fetchRoute(daemon.baseUrl, POLARIS_PRESENTATION_PATH);
    expectedDaemonDiagnostics.push({ method: 'GET', route: POLARIS_PRESENTATION_PATH, status: 401 });
    routes.push({ path: POLARIS_PRESENTATION_PATH, authenticated: false, status: presentationRefused.status, bytes: presentationRefused.body.byteLength });
    const presentation = await fetchRoute(daemon.baseUrl, POLARIS_PRESENTATION_PATH, token);
    let presentationEnvelope: { kind?: unknown; citable?: unknown } = {};
    try {
      presentationEnvelope = JSON.parse(new TextDecoder().decode(presentation.body)) as { kind?: unknown; citable?: unknown };
    } catch {
      presentationEnvelope = {};
    }
    routes.push({ path: POLARIS_PRESENTATION_PATH, authenticated: true, status: presentation.status, contentType: presentation.contentType, bytes: presentation.body.byteLength, sha256: retain('api-poc-polaris.json', presentation.body), retainedAs: 'api-poc-polaris.json', kind: presentationEnvelope.kind ?? null, citable: presentationEnvelope.citable ?? null });
    const foreignOrigin = await requestWithHeaders(daemon.baseUrl, POLARIS_HUMAN_PATH, { Host: new URL(daemon.baseUrl).host, Origin: 'https://example.invalid' });
    expectedDaemonDiagnostics.push({ method: 'GET', route: POLARIS_HUMAN_PATH, status: 403 });
    let foreignOriginReason = '';
    try {
      foreignOriginReason = String((JSON.parse(new TextDecoder().decode(foreignOrigin.body)) as { reason?: unknown }).reason ?? '');
    } catch {
      foreignOriginReason = '';
    }
    routes.push({ path: POLARIS_HUMAN_PATH, origin: 'https://example.invalid', status: foreignOrigin.status, bytes: foreignOrigin.body.byteLength, reason: foreignOriginReason });
    say(`probes: tailnet mount ${tailnet.status} (${internalLinksPrefixed(tailnetHtml) ? 'links prefixed' : 'a root-relative link'}, ${countDisclosureMarkers(tailnetHtml)} disclosures); presentation ${presentationRefused.status}/${presentation.status} ${String(presentationEnvelope.kind ?? 'no kind')}; foreign origin ${foreignOrigin.status} ${foreignOriginReason || 'no reason'}`);

    // Parity: the same served Polaris bytes the record retains, every claim
    // tuple against the machine answer's claim of that id.
    const polarisHtml = new TextDecoder().decode(polarisBytes);
    const parity = claimParity(polarisHtml, model.projectShape);
    say(`parity: ${parity.humanClaimTuples} tuples over ${parity.humanDistinctClaimIds} human ids vs ${parity.machineDistinctClaimIds} machine ids; mismatching ${parity.humanTuplesMismatchingMachine}; absent ${parity.machineIdsAbsentFromHuman}/${parity.humanIdsAbsentFromMachine}`);

    // The exact-source route for every identity Polaris links.
    const sources = await probeSourceRoutes(daemon.baseUrl, polarisHtml, retain);
    routes.push(...sources.routes);
    const sourceRouteStatuses = sources.routes.map((route) => route['status'] as number);
    say(`source routes: ${sources.outcomes.size} identities; ${[...sources.outcomes.values()].filter((outcome) => outcome.state === 'rendered').length} rendered`);

    // The clone's own browser check, against the clone's built page variants.
    const browser = browserCheck(cloneDir, retain, log);
    say(browser.kind === 'performed' ? `browser check: ${browser.violations} violations across ${browser.variants} variants at ${browser.commit.slice(0, 12)} (${browser.seconds}s)` : `browser check not performed: ${browser.detail}`);

    // The walkthrough preflight: the semantic readiness of what was served.
    const preflight = evaluateWalkthroughPreflight({ model, polarisHtml, sourceRoutes: sources.outcomes, browserCheck: browser });
    say(`preflight ${preflight.ready ? 'ready' : 'not ready'}${preflight.findings.length === 0 ? '' : `: ${preflight.findings.map((finding) => finding.limb).join(', ')}`}`);

    const daemonExit = await daemon.stop();
    say(`daemon stopped (${String(daemonExit)}); project shape ${model.projectShape.kind}`);

    const shape = model.projectShape;
    const invariants = {
      cloneHeadMatchesSource: cloneHead === sourceHead,
      installExitCode: install.exitCode,
      buildExitCode: build.exitCode,
      testExitCode: test.exitCode,
      refusedStatus: refused.status,
      machineStatus: machine.status,
      humanRouteStatuses,
      // Every linked identity must be served; an unlinked page yields no
      // source status, which the verdict treats as not served.
      sourceRouteStatus: sourceRouteStatuses.length === 0 ? 0 : sourceRouteStatuses.every((status) => status === 200) ? 200 : (sourceRouteStatuses.find((status) => status !== 200) as number),
      tailnetMountStatus: tailnet.status,
      tailnetMountPrefixedLinks: internalLinksPrefixed(tailnetHtml),
      tailnetDisclosureMarkers: countDisclosureMarkers(tailnetHtml),
      directDisclosureMarkers: countDisclosureMarkers(polarisHtml),
      presentationRefusedStatus: presentationRefused.status,
      presentationStatus: presentation.status,
      presentationKind: typeof presentationEnvelope.kind === 'string' ? presentationEnvelope.kind : '',
      presentationCitable: typeof presentationEnvelope.citable === 'boolean' ? presentationEnvelope.citable : null,
      foreignOriginStatus: foreignOrigin.status,
      foreignOriginReason,
      daemonObservedRevision: daemon.observedRevision,
      modelRevision: model.project.revision,
      shapeKind: shape.kind,
      authorityAdmits: shape.authority === undefined ? null : shape.authority.admits,
      parity,
      limitBreaches: shape.kind === 'observed' ? shape.limitBreaches.length : 0,
      preflightReady: preflight.ready,
      daemonExitCode: daemonExit,
      daemonStderr: daemon.stderr(),
      expectedDaemonDiagnostics,
      evidenceWritten: false,
    };

    const evidence = {
      task: 'syzygy-1z3.21 (PWB task 4.5); exit gate and preflight syzygy-1z3.24.6; mount, envelope and Origin probes syzygy-1z3.24.8',
      kind: 'fresh-checkout demonstration against the configured Butlers revision',
      capturedAt: new Date().toISOString(),
      node: process.version,
      source: { root: sourceRoot, head: sourceHead },
      clone: { head: cloneHead, headMatchesSource: cloneHead === sourceHead, signingTags, seconds: cloneTimed.seconds },
      install: { ...install },
      build: { ...build },
      test: { ...test, junit: totals, junitSha256: junitDigest },
      butlers: { configuredRepository: butlersRepo, observedRevision: daemon.observedRevision, modelRevision: model.project.revision, observerRevision: model.observerRevision },
      walkthroughBinding: daemon.walkthroughBinding,
      evaluation: { snapshot: model.evaluation.snapshot, asOf: model.evaluation.asOf, inputsDigest: model.evaluation.inputsDigest },
      daemon: { exitCode: daemonExit, stderr: daemon.stderr().slice(-2000), stderrLines: parseDaemonStderr(daemon.stderr()), expectedDiagnostics: expectedDaemonDiagnostics },
      routes,
      parity,
      browserCheck: browser,
      // PWB-REQ-021 preflight: whether the served page could be walked; each
      // limb that failed by name. A failed preflight fails the exit below and
      // invites no owner judgment.
      preflight,
      projectShape: summarizeShape(model.projectShape),
      otherRegions: {
        codeStructure: model.codeStructure.kind,
        workItems: model.workItems.kind,
        workerChange: model.workerChange.kind,
        testArtifactVerification: model.testArtifactVerification.kind,
        proposedWork: (model as unknown as { proposedWork?: { kind?: string } }).proposedWork?.kind ?? null,
        walkthroughJudgment: (model as unknown as { walkthroughJudgment?: { kind?: string } }).walkthroughJudgment?.kind ?? null,
        // PWB-REQ-021 readiness: kind plus the ready flag and every arm that
        // fired — an execution fact, never a verdict; it does not move the
        // exit polarity below.
        walkthroughReadiness: summarizeReadiness((model as unknown as { walkthroughReadiness?: unknown }).walkthroughReadiness),
      },
      retention: { directory: retainDir, note: 'exact artifact bytes retained locally, outside the repository; the consent excludes network egress', files: retained },
      log,
      // The exit gate as it stood before this record was written: every
      // invariant named, each failure named. `evidence-written` is decided
      // after the write and can only lower the exit code, never raise it.
      verdictBeforeWrite: { invariants: FRESH_CHECKOUT_INVARIANTS, ...freshCheckoutVerdict({ ...invariants, evidenceWritten: true }) },
    };
    mkdirSync(join(sourceRoot, 'docs', 'evidence'), { recursive: true });
    const evidencePath = join(sourceRoot, 'docs', 'evidence', `pwb-p4-5-fresh-checkout-demo-${date}.json`);
    let evidenceWritten = false;
    try {
      writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
      evidenceWritten = readFileSync(evidencePath, 'utf8').length > 0;
    } catch (error: unknown) {
      log.push(`evidence write failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    say(`wrote ${evidencePath}; artifacts retained in ${retainDir}`);
    const verdict = freshCheckoutVerdict({ ...invariants, evidenceWritten });
    say(verdict.healthy ? 'healthy: every invariant holds' : `unhealthy: ${verdict.failed.join(', ')}`);
    return verdict.healthy ? 0 : 1;
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  },
);

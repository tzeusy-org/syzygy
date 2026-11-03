import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isArgvFault, readArgv } from './argv.js';
import { issueBrief } from './brief.js';
import { checkDraft } from './check.js';
import { closeRun } from './close.js';
import { createCredentialProbe, credentialListFromEnv } from './credential-probe.js';
import { DECLARATIONS, RUN_DIRECTORY_CHOICES, allowExecution } from './execution-choice.js';
import { PERMITTING_ARM_ENABLED } from './execution-rule.js';
import { createPackageGateSources, type GateSources } from './gate-sources.js';
import { initRun } from './init.js';
import { checkInventory, inventoryBrief } from './inventory.js';
import { preflight } from './preflight.js';
import type { ReverifyOptions } from './reverify.js';
import { RUN_CONFIG_JSON_LIMITS } from './run-config.js';
import { renderRun, type DossierRenderer } from './render.js';
import { reviewCheck, reviewPacket } from './review.js';
import type { ScreenLoader } from './screen.js';
import { handOver, launchForm } from './session-handover.js';
import { runStatus } from './status.js';
import { awaitSession } from './waiting-sessions.js';

/** The `syzygy dossier` command family (design "Command surface").
 *
 * Every command is non-interactive, prints a human summary and, with `--json`, the same content as
 * one JSON document. The human form is generated from that document, so the two cannot drift.
 * Exit status: 0 clean, 1 findings or refusal (reason printed), 2 usage error. The family serves no
 * route and opens no socket: it is a local program the operator's sessions run as the operator. */

export const EXIT = Object.freeze({ clean: 0, refused: 1, usage: 2, waiting: 3 });

export const STATE_ROOT_ENV = 'SYZYGY_DOSSIER_STATE_ROOT';

export const DOSSIER_USAGE = `syzygy dossier — operator-agent dossier runs

Usage: syzygy dossier <command> [--json] [arguments]

Commands:
  preflight <url>     report whether the observation consent, the source-acquisition
                      registry entry and the classification and screening policy are
                      in force for the repository, the revisions the consent names,
                      any per-project statement, and whether D9 and the RFC7-20
                      reading are in force; the URL is parsed, never fetched
  init <clone> --url <url> --config <run.json> [--state-root <dir>]
                      check the start gates, pin the clone's HEAD to a consented
                      revision, decide whether the subject is governed, and make the
                      run directory under the state root (or $${STATE_ROOT_ENV});
                      there is no default state root
  brief <run>         re-verify the pinned revision and issue the authoring brief
                      (brief.md) and the draft schema (draft.schema.json) in the run
                      directory, starting the deadline clock; a run is briefed once.
                      The brief carries SEC-3's execution rule, quoted from the
                      adopted security.md
  allow-execution <run> --revision <pinned> --declare owner-started-session,owners-own-host,owner-attends
                      record the owner's execution choice for this one run and its
                      pinned revision, with the operator's three declarations; run it
                      personally, never through an agent. Refused while D9 is not in
                      force, after the brief, or for another run or revision. It is
                      not an execution consent and approves no execution profile
  check <run> [--draft <file>]
                      re-verify the pinned revision, refuse past the deadline or the
                      repair-cycle limit, check the draft (drafts/next.json by
                      default) against the objects at the pinned revision, read from
                      the object store of the clone init recorded and re-hashed,
                      freeze it as revision N
                      and write checks/rev-N.json; exit 1 on any finding
  session-prompt <run> inventory|review|all [--kind <kind>] [--tool <tool>] [--tool-version <v>] [--model <m>] [--fresh]
                      at a hand-over: make the inventory session's directory under
                      <state root>/<run id>.sessions/, beside the run directory and
                      holding only the inventory brief, print the fixed prompt and
                      the command that starts an interactive session there
                      (claude '<prompt>', also behind !, or codex '<prompt>'), and
                      record the prompt's digest; Syzygy starts nothing. The tool, version and
                      model default to the run's declared values; when the run relies
                      on a per-project statement, a tool whose pair with the run's
                      provider has no statement in force listing the run's classes
                      is refused. review --kind
                      fidelity|design builds that review's packet and copies it,
                      with its digest, into the review session's directory there;
                      when a session of the kind is waiting (started by all), it delivers the
                      packet to that session as its next round instead, unless
                      --fresh is given. all, at the start of a run (v1.2, refused
                      until it is signed off):
                      make the inventory, fidelity-review and design-review
                      session directories, write the inventory brief, and print a
                      command per session that pre-approves only reading its
                      directory (the inventory also the clone) and its one
                      command, syzygy dossier await, and no write; Syzygy starts
                      nothing
  await <session-dir>/ [--round <n>] [--submit <file> [--stdin]] [--wait-minutes <m>]
                      run by a waiting session: wait (9 minutes a call by default,
                      never past the run's deadline; local files only) for round n
                      of its input, re-hash it against the digest Syzygy recorded,
                      and say what to read; exit 3 while still waiting. With
                      --submit, run the role's inventory-check or review-check on
                      a file inside the session directory; with --stdin as well,
                      Syzygy first writes that file (inventory.json, or
                      round-N/verdict.json for a delivered round) from standard
                      input, so the session needs no write permission
  launch-form <run> inventory|review terminal|bang [--kind fidelity|design]
                      record, once, how the operator declares the latest inventory
                      or review session (of the kind, fidelity by default) was
                      started; any other form is refused. An inventory or verdict
                      counts only once its launch form is recorded
  inventory-brief <run>
                      print Syzygy's own rendering of the latest inventory session's
                      brief, and whether the stored copy matches it
  inventory-check <run> [--inventory <file>]
                      check the inventory (the latest session's inventory.json by
                      default) as check checks a draft, refuse one declared under the
                      authoring session's identifier, freeze it as inventory/rev-N.json
                      and write inventory/checks/rev-N.json; exit 1 on any finding
  review-packet <run> --kind fidelity|design
                      build the fidelity packet from the latest passed draft revision
                      and the inventory of record (the draft without its discovery
                      account, the frozen inventory, every cited span as Syzygy reads
                      it now, the criteria and the verdict schema), or the design
                      packet from the latest site/<n>/ (every page without its
                      review-status region), write it under reviews/ with its digest
                      and print the digest
  review-check <run> [--kind fidelity|design] [--verdict <file>]
                      rebuild the packet and validate the verdict (the latest
                      session's verdict.json of the kind, fidelity by default):
                      schema, packet digest, pinned revision, session identifiers,
                      completeness, quotations and consistency; freeze it as
                      reviews/<kind>-verdict-N.json and record the result in
                      reviews/checks/; exit 1 when refused
  render <run>        verify the pinned revision again, re-derive every check of the
                      latest passed draft revision from objects read now, rebuild the
                      fidelity review of record, and render the dossier into a new
                      site/<n>/ with the run disclosure on every page and in
                      machine.json; a design review counts only while these pages,
                      outside the review-status region, are the pages it reviewed;
                      the draft layer is Unknown unless the owner's reading of
                      RFC7-20 is in force; exit 1 when refused
  close <run> [--usage-tokens <n>] [--usage-turns <n>]
                      verify the pinned revision again and write the run's
                      Execution Record (record.json), once, with the usage the
                      operator declares (a positive integer each, Inferred and
                      attributed to the operator, never a receipt) or, with none
                      declared, usage not recorded; it copies no prompt or
                      transcript body. Exit 1 when refused or on a
                      credential finding
  status <run>      report a run's state, limits spent, open findings and
                      reviews still required, from its run directory
  help                print this usage and exit

Every value status reports comes from files the agent sessions can write,
and is labelled Inferred. --json prints the same content as one JSON document;
the machine form, refusals included, is printed only with --json.
Exit status: 0 clean, 1 refusal, 2 usage error, 3 await still waiting.
`;

export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

/** What the commands read besides their arguments. The defaults are the process environment, the system clock and the records in
 * this Syzygy checkout. */
export interface CliPorts {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly now?: () => number;
  readonly sources?: GateSources;
  /** The object reader the step guard lists the pinned tree with; by default the re-hashing in-process reader. */
  readonly openReader?: ReverifyOptions['openReader'];
  /** The screen `check` applies; by default the policy the act chain puts in force in this checkout. */
  readonly loadScreen?: ScreenLoader;
  /** The multi-page dossier renderer `render` draws through; the `syzygy` composition root injects it. Without it `render` refuses. */
  readonly renderer?: DossierRenderer;
  /** Whether version 1.2 of the local-agent mode, which specifies waiting sessions, is signed off; by default read from the records root. */
  readonly waitModeSigned?: () => boolean;
  /** The pause between an `await` slice's looks at its session directory; a timer by default. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Standard input, read whole as bytes, for `await --submit --stdin`; null past `maxBytes`. The process's own by default. */
  readonly readStdin?: (maxBytes: number) => Promise<Uint8Array | null>;
}

/** The Syzygy checkout this package belongs to: packages/polaris-dossier/{src,dist} → the repository root. */
const RECORDS_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

/** The gate sources the commands read: the injected ones, or the records in this Syzygy checkout. */
export const cliGateSources = (ports: CliPorts): GateSources => ports.sources ?? createPackageGateSources({ root: RECORDS_ROOT, now: ports.now ?? Date.now });

/** How a command reads its arguments. `one`: exactly one argument and no option. `options`: `--name value` options (each at most
 * once, its value never starting with `-`) among positional arguments, of which there must be exactly one when `noun` names it; a
 * `flag` is taken out first wherever it stands, at most once. */
type CommandArgs =
  | { readonly kind: 'one'; readonly noun: string }
  | { readonly kind: 'options'; readonly options: readonly string[]; readonly flag?: string; readonly noun?: string };

interface CommandInput {
  readonly positional: readonly string[];
  readonly values: ReadonlyMap<string, string>;
  /** Whether the command's `flag` was given. */
  readonly flag: boolean;
}

/** What a step reads besides its arguments, beyond the gate sources and the clock: each a command asks for, as `deps` builds it. */
interface StepPorts {
  readonly probe: ReturnType<typeof createCredentialProbe>;
  readonly openReader?: NonNullable<CliPorts['openReader']>;
  readonly loadScreen?: NonNullable<CliPorts['loadScreen']>;
  readonly waitModeSigned?: NonNullable<CliPorts['waitModeSigned']>;
  readonly sleep?: NonNullable<CliPorts['sleep']>;
  readonly readStdin?: NonNullable<CliPorts['readStdin']>;
  readonly renderer?: DossierRenderer;
}

type StepDeps<K extends keyof StepPorts> = { readonly sources: GateSources; readonly now: () => number } & Pick<StepPorts, K>;

/** What every command reads and prints through: the one context, built once per invocation. */
function commandContext(json: boolean, io: CliIo, ports: CliPorts) {
  const now = ports.now ?? Date.now;
  const env: Readonly<Record<string, string | undefined>> = ports.env ?? process.env;
  const probe = (): StepPorts['probe'] => createCredentialProbe(credentialListFromEnv(env));
  return {
    json, now, env, io, probe,
    sources: (): GateSources => cliGateSources(ports),
    /** The gate sources and the clock, then each part named that the ports hold, in one fixed order. */
    deps: <K extends keyof StepPorts>(...parts: readonly K[]): StepDeps<K> => {
      const wants = (part: keyof StepPorts): boolean => (parts as readonly (keyof StepPorts)[]).includes(part);
      return {
        sources: cliGateSources(ports), now, ...(wants('probe') ? { probe: probe() } : {}),
        ...(wants('openReader') && ports.openReader ? { openReader: ports.openReader } : {}),
        ...(wants('loadScreen') && ports.loadScreen ? { loadScreen: ports.loadScreen } : {}),
        ...(wants('waitModeSigned') && ports.waitModeSigned ? { waitModeSigned: ports.waitModeSigned } : {}),
        ...(wants('sleep') && ports.sleep ? { sleep: ports.sleep } : {}),
        ...(wants('readStdin') && ports.readStdin ? { readStdin: ports.readStdin } : {}),
        ...(wants('renderer') && ports.renderer ? { renderer: ports.renderer } : {}),
      } as StepDeps<K>;
    },
    usageError: (detail: string): number => {
      io.stderr(`syzygy dossier: ${detail}\n\n${DOSSIER_USAGE}`);
      return EXIT.usage;
    },
    refused: (document: object): number => {
      if (json) io.stdout(`${JSON.stringify(document, null, 2)}\n`);
      io.stderr(renderHuman(document));
      return EXIT.refused;
    },
    report: (document: object, exit: number): number => {
      io.stdout(json ? `${JSON.stringify(document, null, 2)}\n` : renderHuman(document));
      return exit;
    },
  };
}
type CommandContext = ReturnType<typeof commandContext>;

interface DossierCommand {
  /** The command's line in DOSSIER_USAGE, up to its description. */
  readonly synopsis: string;
  readonly args: CommandArgs;
  readonly run: (input: CommandInput, ctx: CommandContext) => number | Promise<number>;
}

const RUN = 'the run directory';

/** Every `syzygy dossier` command but `help`, in DOSSIER_USAGE order. */
export const DOSSIER_COMMANDS: Readonly<Record<string, DossierCommand>> = Object.freeze({
  preflight: {
    synopsis: 'preflight <url>',
    args: { kind: 'one', noun: 'the repository URL' },
    run: async ({ positional: [url] }, ctx) => {
      const result = await preflight(url!, ctx.sources(), ctx.now());
      if (!result.ok) return ctx.refused({ command: 'preflight', outcome: 'refused', reason: result.reason });
      return ctx.report(result.report, result.report.outcome === 'ready' ? EXIT.clean : EXIT.refused);
    },
  },
  init: {
    synopsis: 'init <clone> --url <url> --config <run.json> [--state-root <dir>]',
    args: { kind: 'options', options: ['--url', '--config', '--state-root'], noun: 'the clone directory' },
    run: async ({ positional: [clone], values }, ctx) => {
      const url = values.get('--url'), configPath = values.get('--config');
      if (url === undefined || configPath === undefined) return ctx.usageError('init requires --url <url> and --config <run.json>');
      const stateRoot = values.get('--state-root') ?? ctx.env[STATE_ROOT_ENV];
      if (stateRoot === undefined || stateRoot === '') {
        return ctx.refused({ command: 'init', outcome: 'refused', stage: 'state-root', reason: `no state root: pass --state-root <dir> or set ${STATE_ROOT_ENV}; there is no default, and none is derived from the clone`, objectsRead: false });
      }
      const configText = readBounded(configPath, RUN_CONFIG_JSON_LIMITS.maxBytes);
      if (typeof configText !== 'string') return ctx.refused({ command: 'init', outcome: 'refused', stage: 'config', reason: configText.reason, objectsRead: false });
      const result = await initRun({ clone: clone!, url, configText, stateRoot }, ctx.deps());
      return result.ok ? ctx.report(result.report, EXIT.clean) : ctx.refused(result.refusal);
    },
  },
  brief: {
    synopsis: 'brief <run>',
    args: { kind: 'one', noun: RUN },
    run: async ({ positional: [run] }, ctx) => {
      const result = await issueBrief(run!, { ...ctx.deps('openReader'), permitting: {
        enabled: PERMITTING_ARM_ENABLED, choices: RUN_DIRECTORY_CHOICES, probe: ctx.probe(),
      } });
      return result.ok ? ctx.report(result.report, EXIT.clean) : ctx.refused(result.refusal);
    },
  },
  'allow-execution': {
    synopsis: 'allow-execution <run> --revision <pinned> --declare owner-started-session,owners-own-host,owner-attends',
    args: { kind: 'options', options: ['--revision', '--declare'], noun: RUN },
    run: async ({ positional: [run], values }, ctx) => {
      const revision = values.get('--revision'), declare = values.get('--declare');
      if (revision === undefined) return ctx.usageError('allow-execution requires --revision <pinned revision>');
      if (declare === undefined) return ctx.usageError(`allow-execution requires --declare ${Object.keys(DECLARATIONS).join(',')}`);
      const result = await allowExecution(run!, { revision, declarations: declare.split(',') }, ctx.deps('openReader'));
      return result.ok ? ctx.report(result.report, EXIT.clean) : ctx.refused(result.refusal);
    },
  },
  check: {
    synopsis: 'check <run> [--draft <file>]',
    args: { kind: 'options', options: ['--draft'], noun: RUN },
    run: async ({ positional: [run], values }, ctx) => {
      const draftFile = values.get('--draft');
      const result = await checkDraft(run!, draftFile === undefined ? {} : { draftFile }, ctx.deps('probe', 'openReader', 'loadScreen'));
      if (!result.ok) return ctx.refused(result.refusal);
      // `reviewVisibility` and `screenCensus` are on the report already (`checkSubject`), never in the stored record.
      return ctx.report(result.report, result.report.outcome === 'passed' ? EXIT.clean : EXIT.refused);
    },
  },
  'session-prompt': {
    synopsis: 'session-prompt <run> inventory|review|all [--kind <kind>] [--tool <tool>] [--tool-version <v>] [--model <m>] [--fresh]',
    args: { kind: 'options', options: ['--kind', '--tool', '--tool-version', '--model'], flag: '--fresh' },
    run: async ({ positional, values: v, flag: fresh }, ctx) => {
      const [run, role, ...extra] = positional;
      if (run === undefined || (role !== 'inventory' && role !== 'review' && role !== 'all') || extra.length > 0) return ctx.usageError('session-prompt takes the run directory and a role, inventory, review or all');
      const result = await handOver(run, {
        role, ...(fresh ? { fresh: true } : {}), ...(v.has('--kind') ? { kind: v.get('--kind')! } : {}), ...(v.has('--tool') ? { tool: v.get('--tool')! } : {}),
        ...(v.has('--tool-version') ? { toolVersion: v.get('--tool-version')! } : {}), ...(v.has('--model') ? { model: v.get('--model')! } : {}),
      }, ctx.deps('openReader', 'loadScreen', 'waitModeSigned'));
      return result.ok ? ctx.report(result.report, EXIT.clean) : ctx.refused(result.refusal);
    },
  },
  await: {
    synopsis: 'await <session-dir>/ [--round <n>] [--submit <file> [--stdin]] [--wait-minutes <m>]',
    args: { kind: 'options', options: ['--round', '--submit', '--wait-minutes'], flag: '--stdin', noun: 'the session directory' },
    run: async ({ positional: [session], values: v, flag: stdin }, ctx) => {
      const result = await awaitSession(session!, {
        ...(v.has('--round') ? { round: v.get('--round')! } : {}), ...(v.has('--submit') ? { submit: v.get('--submit')! } : {}),
        ...(v.has('--wait-minutes') ? { waitMinutes: v.get('--wait-minutes')! } : {}), ...(stdin ? { stdin: true } : {}),
      }, ctx.deps('probe', 'openReader', 'loadScreen', 'waitModeSigned', 'sleep', 'readStdin'));
      if (!result.ok) return ctx.refused(result.refusal);
      const outcome = result.report;
      return ctx.report(outcome, outcome.outcome === 'waiting' ? EXIT.waiting : outcome.outcome === 'submitted' && !outcome.passed ? EXIT.refused : EXIT.clean);
    },
  },
  'launch-form': {
    synopsis: 'launch-form <run> inventory|review terminal|bang [--kind fidelity|design]',
    args: { kind: 'options', options: ['--kind'] },
    run: async ({ positional, values }, ctx) => {
      const [run, role, form, ...extra] = positional;
      if (run === undefined || role === undefined || form === undefined || extra.length > 0) return ctx.usageError('launch-form takes the run directory, a role and the launch form the operator declares');
      const kind = values.get('--kind');
      const result = await launchForm(run, { role, form, ...(kind === undefined ? {} : { kind }) }, ctx.deps('openReader'));
      return result.ok ? ctx.report(result.report, EXIT.clean) : ctx.refused(result.refusal);
    },
  },
  'inventory-brief': {
    synopsis: 'inventory-brief <run>',
    args: { kind: 'one', noun: RUN },
    run: async ({ positional: [run] }, ctx) => {
      const result = await inventoryBrief(run!, ctx.deps('openReader', 'loadScreen'));
      if (!result.ok) return ctx.refused(result.refusal);
      if (ctx.json) return ctx.report(result.report, EXIT.clean);
      const { brief, ...summary } = result.report;
      ctx.io.stdout(`${brief}\n${renderHuman(summary)}`);
      return EXIT.clean;
    },
  },
  'inventory-check': {
    synopsis: 'inventory-check <run> [--inventory <file>]',
    args: { kind: 'options', options: ['--inventory'], noun: RUN },
    run: async ({ positional: [run], values }, ctx) => {
      const inventoryFile = values.get('--inventory');
      const result = await checkInventory(run!, inventoryFile === undefined ? {} : { inventoryFile }, ctx.deps('probe', 'openReader', 'loadScreen'));
      if (!result.ok) return ctx.refused(result.refusal);
      // The same advice `check` gives the author, on the report from `checkSubject`, as `await --submit` returns it too (syzygy-mea.3).
      return ctx.report(result.report, result.report.outcome === 'passed' ? EXIT.clean : EXIT.refused);
    },
  },
  'review-packet': {
    synopsis: 'review-packet <run> --kind fidelity|design',
    args: { kind: 'options', options: ['--kind'], noun: RUN },
    run: async ({ positional: [run], values }, ctx) => {
      const kind = values.get('--kind');
      if (kind === undefined) return ctx.usageError('review-packet requires --kind fidelity|design');
      const result = await reviewPacket(run!, { kind }, ctx.deps('openReader', 'loadScreen'));
      return result.ok ? ctx.report(result.report, EXIT.clean) : ctx.refused(result.refusal);
    },
  },
  'review-check': {
    synopsis: 'review-check <run> [--kind fidelity|design] [--verdict <file>]',
    args: { kind: 'options', options: ['--verdict', '--kind'], noun: RUN },
    run: async ({ positional: [run], values }, ctx) => {
      const verdictFile = values.get('--verdict');
      const kind = values.get('--kind');
      const result = await reviewCheck(run!, { ...(verdictFile === undefined ? {} : { verdictFile }), ...(kind === undefined ? {} : { kind }) }, ctx.deps('openReader', 'loadScreen'));
      if (!result.ok) return ctx.refused(result.refusal);
      return ctx.report(result.report, result.report.outcome === 'validated' ? EXIT.clean : EXIT.refused);
    },
  },
  render: {
    synopsis: 'render <run>',
    args: { kind: 'one', noun: RUN },
    run: async ({ positional: [run] }, ctx) => {
      const result = await renderRun(run!, ctx.deps('probe', 'openReader', 'loadScreen', 'renderer'));
      return result.ok ? ctx.report(result.report, EXIT.clean) : ctx.refused(result.refusal);
    },
  },
  close: {
    synopsis: 'close <run> [--usage-tokens <n>] [--usage-turns <n>]',
    args: { kind: 'options', options: ['--usage-tokens', '--usage-turns'], noun: RUN },
    run: async ({ positional: [run], values: v }, ctx) => {
      const result = await closeRun(run!, {
        ...(v.has('--usage-tokens') ? { usageTokens: v.get('--usage-tokens')! } : {}), ...(v.has('--usage-turns') ? { usageTurns: v.get('--usage-turns')! } : {}),
      }, ctx.deps('probe', 'openReader', 'loadScreen'));
      if (!result.ok) return ctx.refused(result.refusal);
      return ctx.report(result.report, result.report.outcome === 'closed' ? EXIT.clean : EXIT.refused);
    },
  },
  status: {
    synopsis: 'status <run>',
    args: { kind: 'one', noun: RUN },
    run: ({ positional: [run] }, ctx) => {
      const result = runStatus(run!, ctx.now);
      if (!result.ok) return ctx.refused({ command: 'status', outcome: 'refused', reason: result.reason, ...(result.refusals ? { refusals: result.refusals } : {}) });
      return ctx.report(result.report, EXIT.clean);
    },
  },
});

export async function runDossierCli(argv: readonly string[], io: CliIo, ports: CliPorts = {}): Promise<number> {
  const json = argv.includes('--json');
  const ctx = commandContext(json, io, ports);
  const { usageError } = ctx;
  const [name, ...rest] = argv.filter((arg) => arg !== '--json');
  if (name === undefined) return usageError('a command is required');
  if (name === 'help' || name === '--help' || name === '-h') {
    if (rest.length > 0) return usageError(`help takes no arguments; got ${rest.join(' ')}`);
    io.stdout(DOSSIER_USAGE);
    return EXIT.clean;
  }
  const command = Object.hasOwn(DOSSIER_COMMANDS, name) ? DOSSIER_COMMANDS[name]! : undefined;
  if (command === undefined) return usageError(`unknown dossier command: ${name}`);
  const shape = command.args;
  if (shape.kind === 'one') {
    const read = readArgv(rest, { valued: [], dashValue: 'refuse', repeat: 'refuse', positionals: true });
    if (isArgvFault(read)) return usageError(`unknown option for ${name}: ${read.arg}`);
    if (read.positional.length !== 1) return usageError(`${name} takes exactly one argument, ${shape.noun}`);
    return command.run({ positional: read.positional, values: read.values, flag: false }, ctx);
  }
  let options = rest;
  let flag = false;
  if (shape.flag !== undefined) {
    const given = rest.filter((arg) => arg === shape.flag).length;
    if (given > 1) return usageError(`${shape.flag} given more than once`);
    options = rest.filter((arg) => arg !== shape.flag);
    flag = given === 1;
  }
  const read = readArgv(options, { valued: shape.options, dashValue: 'refuse', repeat: 'refuse', positionals: true });
  if (isArgvFault(read)) {
    return usageError(read.fault === 'unknown' ? `unknown option: ${read.arg}` : read.fault === 'repeated' ? `${read.arg} given more than once` : `${read.arg} requires a value`);
  }
  if (shape.noun !== undefined && read.positional.length !== 1) return usageError(`${name} takes exactly one positional argument, ${shape.noun}`);
  return command.run({ positional: read.positional, values: read.values, flag }, ctx);
}

function readBounded(file: string, limit: number): string | { readonly reason: string } {
  try {
    const stats = fs.statSync(file);
    if (!stats.isFile()) return { reason: `${file} is not a regular file` };
    if (stats.size > limit) return { reason: `${file} is larger than the ${limit}-byte configuration bound` };
    return fs.readFileSync(file, 'utf8');
  } catch (cause) {
    return { reason: `${file} cannot be read (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` };
  }
}

/** A string leaf that holds a character which could end or break its line (a C0 or C1 control, DEL, U+2028, U+2029) is written as a JSON
 * string instead, so a value from the clone (a path a report names) stays on its own `key: value` line (syzygy-mea.3 round-1 note 3). */
const LINE_BREAKING = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
export const humanLeaf = (value: string): string => (LINE_BREAKING.test(value)
  ? JSON.stringify(value).replace(/[\u007f-\u009f\u2028\u2029]/gu, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`) : value);

/** One `key: value` line per leaf of the document, in document order, keys joined by dots. */
export function renderHuman(document: object): string {
  const lines: string[] = [];
  const walk = (value: unknown, key: string): void => {
    if (value !== null && typeof value === 'object') {
      const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
      if (entries.length === 0) lines.push(`${key}: (none)`);
      for (const [child, item] of entries) walk(item, key === '' ? child : `${key}.${child}`);
      return;
    }
    lines.push(`${key}: ${typeof value === 'string' ? humanLeaf(value) : String(value)}`);
  };
  walk(document, '');
  return `${lines.join('\n')}\n`;
}

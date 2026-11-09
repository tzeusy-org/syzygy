import { describe, expect, it } from 'vitest';
import { DOSSIER_COMMANDS, DOSSIER_USAGE, runDossierCli } from './cli.js';

/** syzygy-bpyt.8.2: `runDossierCli` dispatches one command table. Every command in it has its line in the usage text and the usage
 * text lists no command the table lacks; each reads its arguments as the hand-rolled parsers it replaced did. The usage lines and the
 * messages below are literals: the lines as DOSSIER_USAGE prints them, the messages as the golden over the CLI test corpus recorded
 * them at 9a30237e, before the table existed (`[<command>]` and `[<command>, '-5', …]`). */

/** Each command's usage line up to its description, in usage order. `help` is the one command outside the table. */
const SYNOPSES = [
  'preflight <url>',
  'init <clone> [--url <url>] --config <run.json> [--state-root <dir>] [--revision <rev>] [--identity <id>] [--upstream <url>]',
  'brief <run>',
  'allow-execution <run> --revision <pinned> --declare owner-started-session,owners-own-host,owner-attends',
  'check <run> [--draft <file>]',
  'session-prompt <run> inventory|review|all [--kind <kind>] [--tool <tool>] [--tool-version <v>] [--model <m>] [--fresh]',
  'await <session-dir>/ [--round <n>] [--submit <file> [--stdin]] [--wait-minutes <m>]',
  'launch-form <run> inventory|review terminal|bang [--kind fidelity|design]',
  'inventory-brief <run>',
  'inventory-check <run> [--inventory <file>]',
  'review-packet <run> --kind fidelity|design',
  'review-check <run> [--kind fidelity|design] [--verdict <file>]',
  'render <run>',
  'close <run> [--usage-tokens <n>] [--usage-turns <n>]',
  'status <run>',
];

/** What each command prints first with no argument, and with an unknown option before its arguments. */
const REFUSALS: Readonly<Record<string, readonly [string, string]>> = {
  preflight: ['preflight takes exactly one argument, the repository URL', 'unknown option for preflight: -5'],
  init: ['init takes exactly one positional argument, the clone directory', 'unknown option: -5'],
  brief: ['brief takes exactly one argument, the run directory', 'unknown option for brief: -5'],
  'allow-execution': ['allow-execution takes exactly one positional argument, the run directory', 'unknown option: -5'],
  check: ['check takes exactly one positional argument, the run directory', 'unknown option: -5'],
  'session-prompt': ['session-prompt takes the run directory and a role, inventory, review or all', 'unknown option: -5'],
  await: ['await takes exactly one positional argument, the session directory', 'unknown option: -5'],
  'launch-form': ['launch-form takes the run directory, a role and the launch form the operator declares', 'unknown option: -5'],
  'inventory-brief': ['inventory-brief takes exactly one argument, the run directory', 'unknown option for inventory-brief: -5'],
  'inventory-check': ['inventory-check takes exactly one positional argument, the run directory', 'unknown option: -5'],
  'review-packet': ['review-packet takes exactly one positional argument, the run directory', 'unknown option: -5'],
  'review-check': ['review-check takes exactly one positional argument, the run directory', 'unknown option: -5'],
  render: ['render takes exactly one argument, the run directory', 'unknown option for render: -5'],
  close: ['close takes exactly one positional argument, the run directory', 'unknown option: -5'],
  status: ['status takes exactly one argument, the run directory', 'unknown option for status: -5'],
};

/** The usage text's command lines, each up to its description: two spaces, then the line until a run of two spaces or its end. */
function usageLines(usage: string): string[] {
  const block = usage.slice(usage.indexOf('\nCommands:\n') + '\nCommands:\n'.length, usage.indexOf('\n\n', usage.indexOf('\nCommands:\n')));
  return block.split('\n').flatMap((line) => /^ {2}(\S.*?)(?: {2,}.*)?$/u.exec(line)?.[1] ?? []);
}

async function firstLine(argv: readonly string[]): Promise<{ exit: number; line: string; stdout: string }> {
  let stdout = '', stderr = '';
  const exit = await runDossierCli(argv, { stdout: (text) => { stdout += text; }, stderr: (text) => { stderr += text; } });
  return { exit, line: stderr.slice(0, stderr.indexOf('\n')), stdout };
}

describe('the dossier command table', () => {
  it('holds every command the usage text lists but help, in usage order, each under its own name and with its usage line', () => {
    expect(Object.entries(DOSSIER_COMMANDS).map(([name, command]) => [name, command.synopsis])).toEqual(SYNOPSES.map((line) => [line.split(' ')[0], line]));
    expect(usageLines(DOSSIER_USAGE)).toEqual([...SYNOPSES, 'help']);
  });

  it.each(SYNOPSES.map((line) => line.split(' ')[0]!))('%s refuses no argument and an unknown option as before, exit 2', async (name) => {
    const [none, unknown] = REFUSALS[name]!;
    expect(await firstLine([name])).toEqual({ exit: 2, line: `syzygy dossier: ${none}`, stdout: '' });
    expect(await firstLine([name, '-5'])).toEqual({ exit: 2, line: `syzygy dossier: ${unknown}`, stdout: '' });
  });
});

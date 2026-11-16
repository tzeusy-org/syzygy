import { parseArgs } from 'node:util';

/** The one argument reader of the `syzygy` entry: the daemon, `syzygy dossier` and `syzygy polaris` (syzygy-bpyt.8.2).
 *
 * node:util's parseArgs splits the list into tokens; the spec then decides what each token is, exactly as each family read its
 * arguments before this reader existed. Each token is judged by the whole argument it came from, so an option is recognised only
 * when that argument is the option's own literal name: `--name=value`, a group such as `-abc`, a negative number, a lone `-` and
 * `--` are each one unrecognised argument, as no family has ever taken them. */

export interface ArgvSpec {
  /** Options that take the next argument as their value, each `--<name>`: parseArgs is told their long names, so a short one could
   * never be read. */
  readonly valued: readonly string[];
  /** Options that take no value, read where they stand, each `--<name>` or `-<c>`. */
  readonly booleans?: readonly string[];
  /** Options that end the reading where they stand, whatever follows (the daemon's `--help`), each `--<name>` or `-<c>`. */
  readonly stopAt?: readonly string[];
  /** A value that starts with `-`: taken as the value, or refused as a missing value. */
  readonly dashValue: 'take' | 'refuse';
  /** A valued option given twice: the last value counts, or it is refused. */
  readonly repeat: 'last' | 'refuse';
  /** Whether an argument that is no option is a positional argument or unrecognised. */
  readonly positionals: boolean;
}

/** The first argument the spec does not admit, and why. */
export interface ArgvFault {
  readonly fault: 'unknown' | 'repeated' | 'missing-value';
  readonly arg: string;
}

export interface ArgvRead {
  readonly values: ReadonlyMap<string, string>;
  readonly flags: ReadonlySet<string>;
  readonly positional: readonly string[];
  /** The `stopAt` option the reading ended at, when it ended early. */
  readonly stoppedAt?: string;
}

export const isArgvFault = (read: ArgvRead | ArgvFault): read is ArgvFault => 'fault' in read;

const LONG = /^--[^-=][^=]*$/u;
const SHORT = /^-[^-]$/u;

/** Reads `args` by `spec`. A spec naming an option the reader could never see is a programming error, and throws. */
export function readArgv(args: readonly string[], spec: ArgvSpec): ArgvRead | ArgvFault {
  for (const name of spec.valued) if (!LONG.test(name)) throw new Error(`argv: the valued option ${name} is not --<name>`);
  for (const name of [...(spec.booleans ?? []), ...(spec.stopAt ?? [])]) {
    if (!LONG.test(name) && !SHORT.test(name)) throw new Error(`argv: the option ${name} is neither --<name> nor -<c>`);
  }
  const options = Object.fromEntries(spec.valued.map((name) => [name.slice(2), { type: 'string' as const }]));
  const { tokens } = parseArgs({ args: [...args], options, strict: false, allowPositionals: true, tokens: true });
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const positional: string[] = [];
  for (const token of tokens) {
    const arg = args[token.index]!;
    if (token.kind === 'positional') {
      if (!spec.positionals || arg.startsWith('-')) return { fault: 'unknown', arg };
      positional.push(arg);
    } else if (token.kind === 'option' && spec.valued.includes(arg)) {
      if (spec.repeat === 'refuse' && values.has(arg)) return { fault: 'repeated', arg };
      if (token.value === undefined || (spec.dashValue === 'refuse' && token.value.startsWith('-'))) return { fault: 'missing-value', arg };
      values.set(arg, token.value);
    } else if (spec.stopAt?.includes(arg)) {
      return { values, flags, positional, stoppedAt: arg };
    } else if (spec.booleans?.includes(arg)) {
      flags.add(arg);
    } else {
      return { fault: 'unknown', arg };
    }
  }
  return { values, flags, positional };
}

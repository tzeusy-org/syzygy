import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOSSIER_USAGE } from './cli.js';

/** The lint over the installed agent texts (syzygy-qkea.12; REQ-polaris-generation-033 and 035 at version 1.3; D9-N5, N1 and N6 as
 * signed; R3-F9): the Claude Code skill and the Codex instructions. Neither grants execution: each defers every session to the
 * execution rule in the brief or packet it was given (the run's `brief.md` for the authoring session, per the v1.1 review notes' note 1)
 * and, absent it, says the observed project is not built or run outside an explicit, opt-in execution profile. `allow-execution`
 * appears only as a command the operator types personally, beside the instruction never to run it, and the choice covers one run.
 * Every reported command carries its working directory and, where the brief asks, whether it is within the choice's scope. The texts
 * advise a generous deadline and closing before it passes. Every `syzygy dossier` command they name exists, with the options and
 * literal arguments its usage states and every option its usage requires. The description names any repository the operator holds the
 * consents for, not only public ones, and the request "generate me a Polaris dossier for <url>". Each predicate is shown to fire on a
 * mutated copy of the text. */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const TEXTS = ['.claude/skills/polaris-dossier/SKILL.md', '.codex/skills/polaris-dossier/SKILL.md'];

interface Synopsis { readonly positional: readonly string[]; readonly required: ReadonlySet<string>; readonly options: ReadonlyMap<string, readonly string[] | null> }

/** Each command's synopsis from the usage text: positional words (literal alternatives split on `|`, placeholders kept as `<…>`), every
 * option with its literal value alternatives (null for a placeholder value), and which options are required (outside brackets). */
function synopses(usage: string): ReadonlyMap<string, Synopsis> {
  const out = new Map<string, Synopsis>();
  for (const line of usage.split('\n')) {
    const match = /^ {2}([a-z][a-z-]*)((?: \S+)*?)(?: {2,}.*)?$/u.exec(line);
    if (match === null || match[1] === 'help') continue;
    const tokens = (match[2] ?? '').trim().split(/ +/u).filter((token) => token !== '');
    const positional: string[] = [];
    const required = new Set<string>();
    const options = new Map<string, readonly string[] | null>();
    let depth = 0;
    for (let i = 0; i < tokens.length; i++) {
      const raw = tokens[i]!;
      const opens = raw.startsWith('[');
      const token = raw.replace(/^\[|\]$/gu, '');
      if (opens) depth++;
      if (token.startsWith('--')) {
        const value = tokens[i + 1]?.replace(/\]$/u, '');
        const closesOnValue = tokens[i + 1]?.endsWith(']') ?? false;
        options.set(token, value === undefined || value.startsWith('<') ? null : value.split(/[|,]/u));
        if (depth === 0) required.add(token);
        i++;
        if (raw.endsWith(']') || closesOnValue) depth = Math.max(0, depth - 1);
        continue;
      }
      if (depth === 0) positional.push(token);
      if (raw.endsWith(']')) depth = Math.max(0, depth - 1);
    }
    out.set(match[1]!, { positional, required, options });
  }
  return out;
}
const SYNOPSES = synopses(DOSSIER_USAGE);

/** The code spans of a Markdown text, whitespace normalised; a span may cross a line break inside a paragraph. */
const codeSpans = (text: string): string[] => [...text.matchAll(/`([^`]+)`/gu)].map((match) => match[1]!.replace(/\s+/gu, ' ').trim());

/** Faults in the `syzygy dossier` commands a text names. */
function commandFaults(text: string): string[] {
  const faults: string[] = [];
  for (const span of codeSpans(text).filter((candidate) => candidate.startsWith('syzygy dossier '))) {
    const [, , command, ...args] = span.split(' ');
    const synopsis = command === undefined ? undefined : SYNOPSES.get(command);
    if (synopsis === undefined) { faults.push(`${span}: no such command`); continue; }
    const used = new Set<string>();
    const positional: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]!;
      if (!arg.startsWith('--')) { positional.push(arg); continue; }
      if (!synopsis.options.has(arg)) { faults.push(`${span}: ${command} takes no ${arg}`); i++; continue; }
      used.add(arg);
      const value = args[i + 1];
      i++;
      const allowed = synopsis.options.get(arg)!;
      if (allowed !== null && value !== undefined && !value.startsWith('<') && !value.split(/[|,]/u).every((part) => allowed.includes(part))) faults.push(`${span}: ${arg} takes ${allowed.join('|')}, not ${value}`);
    }
    for (const flag of synopsis.required) if (!used.has(flag)) faults.push(`${span}: ${command} requires ${flag}`);
    if (positional.length !== synopsis.positional.length) { faults.push(`${span}: ${command} takes ${synopsis.positional.length} positional argument(s), not ${positional.length}`); continue; }
    positional.forEach((word, index) => {
      const expected = synopsis.positional[index]!;
      if (expected.startsWith('<') || word.startsWith('<')) return;
      if (!word.split('|').every((part) => expected.split('|').includes(part))) faults.push(`${span}: ${word} is not one of ${expected}`);
    });
  }
  return faults;
}

/** The text's blocks: paragraphs and list items, each whitespace normalised. */
const blocks = (text: string): string[] => text.split(/\n\s*\n|\n(?=\s*(?:-|\d+\.) )/u).map((block) => block.replace(/\s+/gu, ' ').trim()).filter((block) => block !== '');
const sentences = (block: string): string[] => block.replace(/`[^`]*`/gu, (span) => span.replace(/[.;]/gu, ' ')).split(/(?<=[.;!?])\s+/u);

/** Sentences that grant building or running the observed project: a permissive verb with an execution verb and no negation or
 * deferral to the brief. */
function grantingSentences(text: string): string[] {
  const permission = /\b(?:you may|you can|may|can|are (?:allowed|permitted|free) to|feel free to|go ahead and|it is fine to|you should|you must)\b/iu;
  const execution = /\b(?:build|run|execute|compile|install|test)\b/iu;
  const negation = /\b(?:not|never|no|nothing|unless|only)\b|brief\.md|execution rule/iu;
  return blocks(text).flatMap(sentences).filter((sentence) => permission.test(sentence) && execution.test(sentence) && !negation.test(sentence));
}

/** Blocks naming `allow-execution` that do not make it the operator's to type personally, beside the instruction never to run it. */
function allowExecutionFaults(text: string): string[] {
  return blocks(text).filter((block) => block.includes('allow-execution'))
    .filter((block) => !/\bthe operator (?:types|to type)\b/u.test(block) || !/\bpersonally\b/u.test(block) || !/\bnever run (?:that command|it) yourself\b/iu.test(block));
}

const frontmatter = (text: string): Record<string, string> => Object.fromEntries((/^---\n([\s\S]*?)\n---\n/u.exec(text)?.[1] ?? '').split('\n').flatMap((line) => {
  const match = /^([a-z]+): (.*)$/u.exec(line);
  return match === null ? [] : [[match[1]!, match[2]!]];
}));

function descriptionFaults(text: string): string[] {
  const description = frontmatter(text)['description'] ?? '';
  const faults: string[] = [];
  if (!description.includes('any repository the operator holds the consents for')) faults.push('the description does not name any repository the operator holds the consents for');
  if (/\bpublic\b/iu.test(description)) faults.push('the description restricts itself to public repositories');
  return faults;
}

/** D9-N5 as signed in v1.1 and unchanged in v1.2, quoted from the change's own spec bytes (the test fails if a later version moves the sentence), and the
 * obligation the v1.1 review notes record against it (note 1): each session defers to the brief or packet it was given, the run's
 * `brief.md` only for the authoring session. */
const SPEC = 'openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md';
const N5 = 'The `/polaris-dossier` skill and the Codex instructions SHALL NOT grant execution themselves: they SHALL only defer to the execution rule in the run\'s `brief.md`, and absent that brief SHALL state that the observed project is not to be built or run outside an explicit, opt-in execution profile.';
const NEVER_RUN = 'The skill and agent texts SHALL tell the agent never to run that command.';

function deferralFaults(text: string): string[] {
  const flat = text.replace(/\s+/gu, ' ');
  const faults: string[] = [];
  if (!/\bgrants? no execution of (?:its|their) own\b/u.test(flat)) faults.push('the text does not say it grants no execution of its own');
  if (!/Follow the execution rule in the brief or packet this session was given: the run's `brief\.md` when you author, the inventory brief or review packet in a session handed over to\./u.test(flat)) faults.push('the text does not defer each session to the execution rule in the brief or packet it was given');
  if (!/Absent that brief, the observed project is not to be built or run outside an explicit, opt-in execution profile\./u.test(flat)) faults.push('the text does not say, absent the brief, that the project is not built or run outside an explicit, opt-in execution profile');
  return faults;
}

/** The owner's choice covers one run (D9-N1 as ruled: a run is one authoring session at one pinned revision), never a standing one. */
function runScopeFaults(text: string): string[] {
  return /The choice covers this one run at its pinned revision: never reuse one from an earlier run\./u.test(text.replace(/\s+/gu, ' ')) ? [] : ['the text does not say the choice covers this one run and is never reused'];
}

/** D9-N6 as signed: every reported command carries its working directory and, where the brief asks, whether it is within the scope. */
function commandReportFaults(text: string): string[] {
  const flat = text.replace(/\s+/gu, ' ');
  const faults: string[] = [];
  if (!/`executions`, with the working directory you ran it in\b/u.test(flat)) faults.push('the text does not ask for each command\'s working directory');
  if (!/where the brief asks, whether it falls within the scope the owner's choice names/u.test(flat)) faults.push('the text does not ask, where the brief does, whether a command falls within the scope the owner\'s choice names');
  return faults;
}

/** The deadline is applied literally: advise a generous one, and close before it passes. */
function deadlineFaults(text: string): string[] {
  const flat = text.replace(/\s+/gu, ' ');
  const faults: string[] = [];
  if (!/Advise a generous deadline\b/u.test(flat)) faults.push('the text does not advise a generous deadline');
  if (!/Close before the deadline passes: after it `close` refuses, the run gets no Execution Record and its usage is not recorded\./u.test(flat)) faults.push('the text does not say to close before the deadline passes');
  return faults;
}

/** The clone is made in the consent's form (syzygy-qkea.24): preflight's commands, one commit fetched alone, never a full clone; what
 * `init` checks is `.git`, and the working tree it does not inspect is stated (R-POLARIS-DOSSIER-CLONE-SHAPE-1 note N5). */
function cloneFormFaults(text: string): string[] {
  const flat = text.replace(/\s+/gu, ' ');
  return [
    ...(/Make the clone with the commands preflight prints, for a revision it names, in a new empty directory[^.]*: that one commit, fetched alone, never a full clone\./u.test(flat)
      ? [] : ['the text does not say to make the clone with preflight\'s commands, one commit fetched alone, never a full clone']),
    ...(flat.includes('`init` refuses a `.git` that holds more than the commit. It does not inspect the working tree, which you read, so put nothing else in that directory.')
      ? [] : ['the text does not say that init checks .git alone and leaves the working tree uninspected']),
  ];
}

/** The description triggers on the operator's plain request. */
function triggerFaults(text: string): string[] {
  return (frontmatter(text)['description'] ?? '').includes('"generate me a Polaris dossier for <url>"') ? [] : ['the description does not name the request "generate me a Polaris dossier for <url>"'];
}

const lint = (text: string): string[] => [
  ...commandFaults(text), ...grantingSentences(text).map((s) => `grants execution: ${s}`), ...allowExecutionFaults(text).map((b) => `allow-execution not the operator's: ${b}`),
  ...descriptionFaults(text), ...deferralFaults(text), ...runScopeFaults(text), ...commandReportFaults(text), ...deadlineFaults(text), ...cloneFormFaults(text), ...triggerFaults(text),
];

describe('agent texts (S11)', () => {
  it('reads every command synopsis from the usage text', () => {
    expect([...SYNOPSES.keys()].sort()).toEqual(['allow-execution', 'await', 'brief', 'check', 'close', 'init', 'inventory-brief', 'inventory-check', 'launch-form', 'preflight', 'render', 'review-check', 'review-packet', 'session-prompt', 'status']);
    expect(SYNOPSES.get('session-prompt')!.positional).toEqual(['<run>', 'inventory|review|all']);
    expect(SYNOPSES.get('await')!.positional).toEqual(['<session-dir>/']);
    expect(SYNOPSES.get('init')).toEqual({ positional: ['<clone>'], required: new Set(['--url', '--config']), options: new Map([['--url', null], ['--config', null], ['--state-root', null]]) });
    expect(SYNOPSES.get('launch-form')!.positional).toEqual(['<run>', 'inventory|review', 'terminal|bang']);
    expect(SYNOPSES.get('allow-execution')!.required).toEqual(new Set(['--revision', '--declare']));
    expect(SYNOPSES.get('review-check')!.options.get('--kind')).toEqual(['fidelity', 'design']);
  });

  it('quotes D9-N5 and the never-run sentence from the v1.3 spec bytes', () => {
    const spec = fs.readFileSync(path.join(ROOT, SPEC), 'utf8');
    expect(spec.split(N5)).toHaveLength(2);
    expect(spec.split(NEVER_RUN)).toHaveLength(2);
    expect(spec).toContain('Exact behavioral delta, version 1.3.');
  });

  for (const file of TEXTS) {
    it(`${file} passes the lint`, () => {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect(codeSpans(text).filter((span) => span.startsWith('syzygy dossier ')).length).toBeGreaterThan(10);
      expect(lint(text)).toEqual([]);
    });
  }

  it('each predicate fires on a mutated copy of the skill', () => {
    const text = fs.readFileSync(path.join(ROOT, TEXTS[0]!), 'utf8');
    const swap = (from: string, to: string): string => { expect(text.includes(from)).toBe(true); return text.replace(from, to); };
    expect(grantingSentences(`${text}\nYou may build and run the project to confirm a claim.\n`)).toEqual(['You may build and run the project to confirm a claim.']);
    expect(commandFaults(swap('`syzygy dossier check <run>`', '`syzygy dossier verify <run>`'))).toEqual(['syzygy dossier verify <run>: no such command']);
    expect(commandFaults(swap('`syzygy dossier check <run>`', '`syzygy dossier check <run> --strict x`'))).toEqual(['syzygy dossier check <run> --strict x: check takes no --strict']);
    expect(commandFaults(swap('`syzygy dossier init <clone> --url <url> --config <file> --state-root <dir>`', '`syzygy dossier init <clone> --url <url>`'))).toEqual(['syzygy dossier init <clone> --url <url>: init requires --config']);
    expect(commandFaults(swap('`syzygy dossier session-prompt <run> inventory`', '`syzygy dossier session-prompt <run> authoring`'))).toEqual(['syzygy dossier session-prompt <run> authoring: authoring is not one of inventory|review|all']);
    expect(commandFaults(swap('--kind fidelity|design --verdict verdict.json', '--kind summary --verdict verdict.json'))).toHaveLength(1);
    expect(allowExecutionFaults(swap('Never\n   run that command yourself', 'Run\n   that command yourself'))).toHaveLength(1);
    expect(descriptionFaults(swap('for any repository the operator holds the consents for', 'for any public repository'))).toHaveLength(2);
    expect(deferralFaults(swap('Follow the execution rule in\n  the brief or packet this session was given', 'Follow the execution rule in\n  the run\'s `brief.md`'))).toHaveLength(1);
    expect(deferralFaults(swap('This skill grants no execution of its own.', 'This skill grants execution.'))).toHaveLength(1);
    expect(deferralFaults(swap('Absent that brief, the observed project', 'Later, the observed project'))).toHaveLength(1);
    expect(runScopeFaults(swap('never\n   reuse one from an earlier run', 'reuse\n   one from an earlier run'))).toHaveLength(1);
    expect(commandReportFaults(swap('with the working directory you ran it in', 'with what it did'))).toHaveLength(1);
    expect(commandReportFaults(swap('whether it falls within the scope the owner\'s choice names', 'why'))).toHaveLength(1);
    expect(deadlineFaults(swap('Advise a generous deadline', 'Suggest a deadline'))).toHaveLength(1);
    expect(deadlineFaults(swap('Close before the deadline passes', 'Close when done'))).toHaveLength(1);
    expect(triggerFaults(swap('for example "generate me a Polaris dossier for <url>", ', ''))).toHaveLength(1);
    expect(cloneFormFaults(swap('fetched alone, never a full clone', 'or a full clone'))).toHaveLength(1);
    expect(cloneFormFaults(swap('Make the clone with the commands preflight prints', 'Clone the repository'))).toHaveLength(1);
    expect(cloneFormFaults(swap('so put nothing else in', 'so put anything in'))).toHaveLength(1);
  });

  it('the description lint holds the trigger phrase against the Codex text too', () => {
    const text = fs.readFileSync(path.join(ROOT, TEXTS[1]!), 'utf8');
    expect(triggerFaults(text)).toEqual([]);
    expect(triggerFaults(text.replace('"generate me a Polaris dossier for <url>"', '"make a site"'))).toHaveLength(1);
  });
});

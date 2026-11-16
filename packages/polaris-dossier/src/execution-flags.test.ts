import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { CREDENTIAL_LIST_ENV, CREDENTIAL_LIST_FORMAT } from './credential-probe.js';
import { checkDraftShape, localDraftSchema } from './draft-schema.js';
import { executionFlags, flagCommand } from './execution-flags.js';
import { REAL_ROOT, draft, fullFixtureRun, makeClone } from './full-run.testkit.js';
import type { DossierRenderer } from './render.js';
import { tempDir } from '@syzygy/test-kit';

/** The N6 runtime half (v1.1, REQ-polaris-generation-033; scenario "Reported command outside the named scope"): where execution was
 * permitted, a reported command without a working directory, with one outside the clone, or stated outside the owner's choice is flagged
 * beside the command, labelled Inferred; the draft is admitted, no step refuses and no command is hidden. Under SEC-3 nothing is flagged. */

let renderer: DossierRenderer;
beforeAll(async () => {
  const module = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
  renderer = ((await import(module)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
});

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const readJson = (file: string): Doc => JSON.parse(fs.readFileSync(file, 'utf8'));

const CLONE = '/home/operator/clones/kestrel';
const kinds = (entry: Record<string, unknown>): string[] => flagCommand(entry, CLONE).map((flag) => flag.kind);

describe('flagCommand', () => {
  it('flags nothing for a command run in the clone or below it, whatever scope it states or omits', () => {
    expect(kinds({ command: 'make', workingDirectory: CLONE, scope: 'within-scope' })).toEqual([]);
    expect(kinds({ command: 'make', workingDirectory: `${CLONE}/src/deps`, scope: 'within-scope' })).toEqual([]);
    expect(kinds({ command: 'make', workingDirectory: `${CLONE}/src/../tests` })).toEqual([]);
    expect(kinds({ command: 'make', workingDirectory: `${CLONE}/..cache` })).toEqual([]);
  });

  it('flags a command that reports no working directory', () => {
    expect(kinds({ command: 'make' })).toEqual(['no-working-directory']);
    expect(kinds({ command: 'make', workingDirectory: '   ' })).toEqual(['no-working-directory']);
    expect(kinds({ command: 'make', workingDirectory: 7 })).toEqual(['no-working-directory']);
  });

  it('flags a working directory outside the clone, a sibling sharing its prefix, a climb out of it, and one it cannot place', () => {
    expect(kinds({ command: 'ls', workingDirectory: '/tmp' })).toEqual(['working-directory-outside-clone']);
    expect(kinds({ command: 'ls', workingDirectory: `${CLONE}-other` })).toEqual(['working-directory-outside-clone']);
    expect(kinds({ command: 'ls', workingDirectory: `${CLONE}/src/../..` })).toEqual(['working-directory-outside-clone']);
    expect(kinds({ command: 'ls', workingDirectory: path.dirname(CLONE) })).toEqual(['working-directory-outside-clone']);
    // A shared string prefix is not containment, before or after `..` is normalised.
    expect(kinds({ command: 'ls', workingDirectory: `${CLONE}-x` })).toEqual(['working-directory-outside-clone']);
    expect(kinds({ command: 'ls', workingDirectory: `${CLONE}-x/src` })).toEqual(['working-directory-outside-clone']);
    expect(kinds({ command: 'ls', workingDirectory: `${CLONE}/../kestrel-x` })).toEqual(['working-directory-outside-clone']);
    expect(kinds({ command: 'ls', workingDirectory: `${CLONE}/src/../../kestrel-x/src` })).toEqual(['working-directory-outside-clone']);
    // `..` is normalised on both sides: a climb that comes back into the clone is inside it.
    expect(kinds({ command: 'ls', workingDirectory: `${CLONE}/../kestrel/src` })).toEqual([]);
    expect(flagCommand({ command: 'ls', workingDirectory: `${CLONE}/src` }, `${CLONE}/tmp/..`)).toEqual([]);
    expect(flagCommand({ command: 'ls', workingDirectory: `${CLONE}-x` }, `${CLONE}/`).map((flag) => flag.kind)).toEqual(['working-directory-outside-clone']);
    const relative = flagCommand({ command: 'ls', workingDirectory: 'the clone' }, CLONE);
    expect(relative).toEqual([{ kind: 'working-directory-outside-clone', detail: 'the reported working directory is not an absolute path, so Syzygy cannot place it within the clone', label: 'Inferred' }]);
  });

  it('flags a command the agent states falls outside the scope, beside any other flag', () => {
    expect(kinds({ command: 'curl x', workingDirectory: CLONE, scope: 'outside-scope' })).toEqual(['stated-outside-scope']);
    expect(kinds({ command: 'curl x', scope: 'outside-scope' })).toEqual(['no-working-directory', 'stated-outside-scope']);
  });
});

describe('executionFlags', () => {
  const entries = [
    { id: 'a', command: 'make', workingDirectory: CLONE, scope: 'within-scope' },
    { id: 'b', command: 'ls', workingDirectory: '/tmp' },
    { id: 'c', command: 'curl x', workingDirectory: CLONE, scope: 'outside-scope' },
  ];

  it('flags nothing under SEC-3\'s rule', () => {
    expect(executionFlags(entries, CLONE, 'sec-3')).toEqual({ applies: false, why: 'the brief carried SEC-3\'s rule and permitted no execution, so no reported command is flagged' });
  });

  it('flags every command where execution was permitted, and where the brief record cannot be read', () => {
    for (const arm of ['permitting', null] as const) {
      const flags = executionFlags(entries, CLONE, arm);
      if (!flags.applies) throw new Error('flags apply');
      expect(flags.flagged).toBe(2);
      expect(flags.label).toBe('Inferred');
      expect(flags.commands.map((command) => [command.position, command.id, command.scope, command.flags.map((flag) => flag.kind)])).toEqual([
        [1, 'a', 'within-scope', []],
        [2, 'b', 'not-stated', ['working-directory-outside-clone']],
        [3, 'c', 'outside-scope', ['stated-outside-scope']],
      ]);
    }
  });
});

describe('the draft schema admits a command whether or not it carries its working directory and scope', () => {
  const schema = (commit: string) => localDraftSchema({ pinnedRevision: commit, maxQuestions: 1 });
  const commit = 'a'.repeat(40);
  const withExecutions = (executions: unknown[]) => ({ ...draft(commit), executions });

  it('admits a command with neither, and one with both', () => {
    expect(checkDraftShape(schema(commit), withExecutions([{ id: 'x-1', command: 'make', purpose: 'Build.' }]))).toEqual([]);
    expect(checkDraftShape(schema(commit), withExecutions([{ id: 'x-1', command: 'make', workingDirectory: '/c', scope: 'outside-scope', purpose: 'Build.' }]))).toEqual([]);
  });

  it('still checks a field that is present', () => {
    expect(checkDraftShape(schema(commit), withExecutions([{ id: 'x-1', command: 'make', scope: 'maybe', purpose: 'Build.' }])))
      .toEqual([{ path: '$.executions[0].scope', detail: 'must be one of within-scope, outside-scope' }]);
    expect(checkDraftShape(schema(commit), withExecutions([{ id: 'x-1', command: 'make', workingDirectory: 3, purpose: 'Build.' }])))
      .toEqual([{ path: '$.executions[0].workingDirectory', detail: 'must be a string' }]);
    expect(checkDraftShape(schema(commit), withExecutions([{ id: 'x-1', workingDirectory: '/c', purpose: 'Build.' }])))
      .toEqual([{ path: '$.executions[0].command', detail: 'is required' }]);
  });
});

describe('check, render and close disclose the flags beside each command and refuse nothing (scenario "Reported command outside the named scope")', () => {
  const executions = (clone: string): Doc[] => [
    { id: 'x-in', command: 'make', workingDirectory: clone, scope: 'within-scope', purpose: 'Build the server.' },
    { id: 'x-sub', command: 'make test', workingDirectory: path.join(clone, 'src'), purpose: 'Run its tests; scope not stated.' },
    { id: 'x-out', command: 'ls -la', workingDirectory: `${clone}-other`, scope: 'within-scope', purpose: 'A directory beside the clone.' },
    { id: 'x-none', command: 'uname -a', scope: 'within-scope', purpose: 'No working directory reported.' },
    { id: 'x-scope', command: 'curl https://example.invalid/', workingDirectory: clone, scope: 'outside-scope', purpose: 'Stated outside the choice.' },
  ];

  async function run(permitted: boolean) {
    const dir = tempDir('dossier-flags-');
    const { clone, commit } = makeClone(path.join(dir, 'repo'));
    const list = path.join(dir, 'credentials.json');
    fs.writeFileSync(list, JSON.stringify({ format: CREDENTIAL_LIST_FORMAT, credentials: [] }));
    const result = await fullFixtureRun({ clone, commit, stateRoot: path.join(dir, 'state'), renderer, permitted, executions, env: { [CREDENTIAL_LIST_ENV]: list }, closeArgs: ['--usage-turns', '9'] });
    const sites = fs.readdirSync(path.join(result.run, 'site')).map(Number).sort((a, b) => a - b);
    return { ...result, clone, site: path.join(result.run, 'site', String(sites[sites.length - 1])) };
  }

  it('where execution was permitted: every step completes, and each flag is disclosed beside its command, labelled Inferred', async () => {
    const { run: runDir, steps, site } = await run(true);
    expect(steps.every((step) => step.exit === 0)).toBe(true);

    const checked = readJson(path.join(runDir, 'checks', 'rev-0.json'));
    expect(checked.outcome).toBe('passed');
    expect(checked.findings).toEqual([]);
    expect(checked.executionFlags.applies).toBe(true);
    expect(checked.executionFlags.flagged).toBe(3);
    expect(checked.executionFlags.commands.map((command: Doc) => [command.id, command.scope, command.flags.map((flag: Doc) => flag.kind)])).toEqual([
      ['x-in', 'within-scope', []],
      ['x-sub', 'not-stated', []],
      ['x-out', 'within-scope', ['working-directory-outside-clone']],
      ['x-none', 'within-scope', ['no-working-directory']],
      ['x-scope', 'outside-scope', ['stated-outside-scope']],
    ]);

    const page = fs.readFileSync(path.join(site, 'executions.html'), 'utf8');
    for (const command of ['make', 'make test', 'ls -la', 'uname -a', 'curl https://example.invalid/']) expect(page).toContain(command);
    const items = page.split('execution/').slice(1);
    const itemFor = (id: string): string => items.find((item) => item.startsWith(id))!;
    expect(itemFor('x-out')).toContain('Flagged (Inferred, self-reported): the reported working directory lies outside the clone the run record names');
    expect(itemFor('x-none')).toContain('Flagged (Inferred, self-reported): the agent reports no working directory for this command');
    expect(itemFor('x-none')).toContain('Working directory: not reported');
    expect(itemFor('x-scope')).toContain('Flagged (Inferred, self-reported): the agent states that this command falls outside the scope');
    expect(itemFor('x-sub')).toContain('Scope, as the agent states it: not stated');
    for (const id of ['x-in', 'x-sub']) expect(itemFor(id)).not.toContain('Flagged');

    const machine = fs.readFileSync(path.join(site, 'machine.json'), 'utf8');
    expect(machine).toContain('Flagged reported commands: 3 of 5');
    const scopeOwn = 'Whether a command falls within the scope of the owner\'s execution choice is the agent\'s own statement, labelled Inferred; Syzygy does not judge it.';
    expect(machine).toContain(scopeOwn);
    expect(checked.executionFlags.basis).toContain(scopeOwn);

    const record = readJson(path.join(runDir, 'record.json'));
    expect(record.reportedCommands.count).toBe(5);
    expect(record.reportedCommands.executionFlags).toMatchObject({ applies: true, flagged: 3, label: 'Inferred' });
    expect(record.reportedCommands.commands.map((command: Doc) => [command.id, command.workingDirectory === null, command.flags.map((flag: Doc) => flag.kind)])).toEqual([
      ['x-in', false, []],
      ['x-sub', false, []],
      ['x-out', false, ['working-directory-outside-clone']],
      ['x-none', true, ['no-working-directory']],
      ['x-scope', false, ['stated-outside-scope']],
    ]);
  });

  it('under SEC-3\'s rule: the same commands are disclosed and nothing is flagged', async () => {
    const { run: runDir, site } = await run(false);
    const checked = readJson(path.join(runDir, 'checks', 'rev-0.json'));
    expect(checked.executionFlags.applies).toBe(false);
    const page = fs.readFileSync(path.join(site, 'executions.html'), 'utf8');
    for (const command of ['make', 'make test', 'ls -la', 'uname -a', 'curl https://example.invalid/']) expect(page).toContain(command);
    expect(page).not.toContain('Flagged');
    expect(page).not.toContain('Scope, as the agent states it');
    expect(fs.readFileSync(path.join(site, 'machine.json'), 'utf8')).not.toContain('Flagged reported commands');
    const record = readJson(path.join(runDir, 'record.json'));
    expect(record.reportedCommands.executionFlags.applies).toBe(false);
    expect(record.reportedCommands.commands.every((command: Doc) => !('flags' in command))).toBe(true);
  });
});

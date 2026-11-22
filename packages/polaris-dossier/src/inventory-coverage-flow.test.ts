import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { runDossierCli, type CliPorts } from './cli.js';
import { FIXTURE_SCREEN, FIXTURE_URL, LATER, NOW, draft, fixtureSources, inventory, makeClone, type Doc } from './full-run.testkit.js';

// syzygy-5dhm.28: `syzygy dossier check` through the CLI, with the real reader of the inventory of record. The steps are those of the
// full fixture run up to the inventory's launch form; the expected advice is written out from the two fixture documents: the draft
// cites src/kestrel.c lines 1 and 2 to 3 and docs/notes.txt line 1, and the inventory's two entries cite src/kestrel.c line 1 and
// docs/notes.txt line 1.

describe('check after an inventory counts', () => {
  it('is Unknown before any inventory counts, then compares the draft with the inventory of record and honours the omission record', async () => {
    const dir = tempDir('dossier-coverage-flow-');
    const { clone, commit } = makeClone(path.join(dir, 'repo'));
    const stateRoot = path.join(dir, 'state');
    let clock = NOW;
    const ports: CliPorts = { env: {}, now: () => clock, sources: fixtureSources(commit), loadScreen: async () => FIXTURE_SCREEN };
    const cli = async (argv: readonly string[], expected = 0): Promise<Doc> => {
      let stdout = '', stderr = '';
      const exit = await runDossierCli([...argv, '--json'], { stdout: (t) => { stdout += t; }, stderr: (t) => { stderr += t; } }, ports);
      if (exit !== expected) throw new Error(`step ${argv.join(' ')} exited ${exit}: ${stderr || stdout}`);
      return JSON.parse(stdout) as Doc;
    };
    const write = (file: string, doc: Doc): void => fs.writeFileSync(file, JSON.stringify(doc, null, 2));

    await cli(['preflight', FIXTURE_URL]);
    const configFile = path.join(stateRoot, 'run-config.json');
    fs.mkdirSync(stateRoot, { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify({
      operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5',
      deadline: 'PT1H', agentTokenBudget: 100_000, maxRepairCycles: 6, maxQuestions: 1, audience: 'an operator', operatorIsOwner: true,
    }));
    const run = (await cli(['init', clone, '--visibility', 'public', '--url', FIXTURE_URL, '--config', configFile, '--state-root', stateRoot]))['run'] as string;
    await cli(['brief', run]);
    clock = LATER;
    fs.mkdirSync(path.join(run, 'drafts'), { recursive: true });
    const next = path.join(run, 'drafts', 'next.json');
    const v5 = (over: Doc = {}): Doc => ({ ...draft(commit), schemaVersion: 'polaris-dossier-local-draft-v5', ...over });

    write(next, v5());
    const first = await cli(['check', run]);
    expect(first['outcome']).toBe('passed');
    expect(first['inventoryCoverageAdvice']).toEqual({ state: 'unknown', why: 'no inventory counts: no inventory revision has been checked', note: expect.stringContaining('not zero uncovered entries') });

    const session = await cli(['session-prompt', run, 'inventory']);
    write(path.join(session['directory'] as string, 'inventory.json'), inventory(commit));
    const inventoryCheck = await cli(['inventory-check', run]);
    expect(inventoryCheck).not.toHaveProperty('inventoryCoverageAdvice');
    // Checked, but its session's launch form is not recorded: it does not count yet.
    write(next, v5());
    const pending = await cli(['check', run]);
    expect(pending['inventoryCoverageAdvice']).toMatchObject({ state: 'unknown', why: expect.stringMatching(/^no inventory counts: no launch form is recorded for inventory session 1/u) });
    await cli(['launch-form', run, 'inventory', 'terminal']);

    // The fixture draft covers both entries.
    write(next, v5());
    const both = await cli(['check', run]);
    expect(both['inventoryCoverageAdvice']).toMatchObject({ state: 'compared', inventory: { revision: 0, label: 'Inferred' }, counts: { entries: 2, covered: 2, omitted: 0, uncovered: 0 }, uncovered: [] });

    // A draft that no longer cites docs/notes.txt leaves `e-snap` uncovered; the advice names its identifier and path, not its statement.
    const sections = draft(commit)['sections'] as Doc[];
    const narrowed = [{ ...sections[0], paragraphs: [sections[0]!['paragraphs'][0]] }];
    write(next, v5({ sections: narrowed }));
    const missing = await cli(['check', run]);
    expect(missing['outcome']).toBe('passed');
    expect(missing['findings']).toEqual([]);
    expect(missing['inventoryCoverageAdvice']).toMatchObject({ counts: { entries: 2, covered: 1, omitted: 0, uncovered: 1 }, uncovered: [{ entryId: 'e-snap', paths: ['docs/notes.txt'], unnamedPaths: 0 }] });
    expect(JSON.stringify(missing['inventoryCoverageAdvice'])).not.toContain('It writes snapshots.');
    const stored = fs.readFileSync(missing['checkFile'] as string, 'utf8');
    expect(stored).not.toContain('inventoryCoverageAdvice');

    // The same draft with the omission recorded: nothing is listed, and the fidelity packet carries the record to the reviewer.
    write(next, v5({ sections: narrowed, inventoryOmissions: [{ entryId: 'e-snap', reason: 'Snapshots are outside this short dossier.' }] }));
    const omitted = await cli(['check', run]);
    expect(omitted['outcome']).toBe('passed');
    expect(omitted['inventoryCoverageAdvice']).toMatchObject({ counts: { entries: 2, covered: 1, omitted: 1, uncovered: 0 }, uncovered: [], omissions: { rows: 1, recorded: 1, duplicated: [], unmatched: [], alsoCovered: [] } });
    const fidelity = await cli(['session-prompt', run, 'review', '--kind', 'fidelity']);
    const packet = JSON.parse(fs.readFileSync(path.join(fidelity['directory'] as string, 'packet.json'), 'utf8')) as Doc;
    expect(packet['draft'].document.inventoryOmissions).toEqual([{ entryId: 'e-snap', reason: 'Snapshots are outside this short dossier.' }]);
  });
});

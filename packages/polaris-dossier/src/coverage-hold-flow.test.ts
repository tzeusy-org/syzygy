import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { runDossierCli, type CliPorts } from './cli.js';
import { FIXTURE_SCREEN, FIXTURE_URL, LATER, NOW, draft, fixtureSources, inventory, makeClone, type Doc } from './full-run.testkit.js';

// syzygy-5dhm.29 (REQ-polaris-generation-035 version 2.28): the fidelity review waits until every listed inventory entry has an outcome.
// The fixture inventory has two entries, `e-kestrel` (src/kestrel.c line 1) and `e-snap` (docs/notes.txt line 1); a draft whose sections
// keep only the first paragraph cites no line of docs/notes.txt and names no path of it, so `e-snap` has no outcome. Every expected
// value is written out.

const reviewFiles = (run: string): string[] => (fs.existsSync(path.join(run, 'reviews')) ? fs.readdirSync(path.join(run, 'reviews')) : []);
const packetDirs = (run: string): string[] => reviewFiles(run).filter((name) => name.startsWith('fidelity-packet-'));

describe('the fidelity review waits for inventory coverage', () => {
  it('issues no fidelity packet while a listed entry has no outcome, says why and what to do, and issues it once each entry has one', async () => {
    const dir = tempDir('dossier-coverage-hold-');
    const { clone, commit } = makeClone(path.join(dir, 'repo'));
    const stateRoot = path.join(dir, 'state');
    let clock = NOW;
    const ports: CliPorts = { env: {}, now: () => clock, sources: fixtureSources(commit), loadScreen: async () => FIXTURE_SCREEN };
    const cli = async (argv: readonly string[], expected = 0): Promise<Doc> => {
      let stdout = '', stderr = '';
      const exit = await runDossierCli([...argv, '--json'], { stdout: (t) => { stdout += t; }, stderr: (t) => { stderr += t; } }, ports);
      if (exit !== expected) throw new Error(`step ${argv.join(' ')} exited ${exit}: ${stderr || stdout}`);
      return JSON.parse(stdout === '' ? stderr : stdout) as Doc;
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
    const sections = draft(commit)['sections'] as Doc[];
    const narrowed = [{ ...sections[0], paragraphs: [sections[0]!['paragraphs'][0]] }];
    const as = (schemaVersion: string, over: Doc = {}): Doc => ({ ...draft(commit), schemaVersion, ...over });

    write(next, as('polaris-dossier-local-draft-v5'));
    expect((await cli(['check', run]))['outcome']).toBe('passed');
    const session = await cli(['session-prompt', run, 'inventory']);
    const listed = inventory(commit);
    // The fixture screen admits .c and .txt. The README entry passes inventory check but its only span is withheld from review.
    const readme = { id: 'e-readme', kind: 'term', label: 'inferred', statement: 'The project is named Kestrel.', citations: [{ id: 'c-readme', path: 'README.md', startLine: 1, endLine: 1 }], quotations: [] };
    write(path.join(session['directory'] as string, 'inventory.json'), { ...listed, entries: [...(listed['entries'] as unknown[]), readme] });
    await cli(['inventory-check', run]);
    await cli(['launch-form', run, 'inventory', 'terminal']);

    // Draft revision 1, schema v5, leaves `e-snap` without an outcome: both issuing commands refuse, and nothing is written.
    write(next, as('polaris-dossier-local-draft-v5', { sections: narrowed }));
    const held = await cli(['check', run]);
    expect(held['outcome']).toBe('passed');
    expect(held['revision']).toBe(1);
    const reason = 'The fidelity review waits, so no fidelity packet is issued: 1 entry of inventory revision 0 has no outcome in draft revision 1. '
      + 'An entry has an outcome when a block of the draft cites a span on one of its paths with overlapping lines, or a claim block\'s text names one of its paths, '
      + 'or the draft\'s `inventoryOmissions` records it with a reason. Without one: "e-snap" ("docs/notes.txt"). '
      + 'Next: in drafts/next.json, either represent each entry in a block that cites what it states, or add {"entryId": ..., "reason": ...} to `inventoryOmissions` '
      + `saying why a reader of this dossier does not need it; then run syzygy dossier check ${run} again. `
      + 'The packet is issued once a passed draft revision leaves no entry without an outcome; the reviewer still judges each entry and each reason.';
    const packetRefusal = await cli(['review-packet', run, '--kind', 'fidelity'], 1);
    expect(packetRefusal).toMatchObject({ command: 'review-packet', outcome: 'refused', stage: 'coverage', reason, coverage: { draftRevision: 1, inventoryRevision: 0 }, reasons: ['"e-snap" ("docs/notes.txt")'] });
    const sessionRefusal = await cli(['session-prompt', run, 'review', '--kind', 'fidelity'], 1);
    expect(sessionRefusal).toMatchObject({ command: 'session-prompt', outcome: 'refused', stage: 'coverage', reason, coverage: { draftRevision: 1, inventoryRevision: 0 }, reasons: ['"e-snap" ("docs/notes.txt")'] });
    expect(JSON.stringify(packetRefusal)).not.toContain('It writes snapshots.');
    expect(JSON.stringify(packetRefusal)).not.toContain('e-readme');
    expect(packetDirs(run)).toEqual([]);
    expect(reviewFiles(run).filter((name) => name.includes('fidelity'))).toEqual([]);

    // Draft revision 2, the same sections in schema v4, which can record no omission: issued as before.
    write(next, as('polaris-dossier-local-draft-v4', { sections: narrowed }));
    expect((await cli(['check', run]))['outcome']).toBe('passed');
    expect(await cli(['review-packet', run, '--kind', 'fidelity'])).toMatchObject({ outcome: 'built', draftRevision: 2, inventoryRevision: 0 });

    // Draft revision 3 records the omission: issued.
    write(next, as('polaris-dossier-local-draft-v5', { sections: narrowed, inventoryOmissions: [{ entryId: 'e-snap', reason: 'Snapshots are outside this short dossier.' }] }));
    expect((await cli(['check', run]))['outcome']).toBe('passed');
    expect(await cli(['review-packet', run, '--kind', 'fidelity'])).toMatchObject({ outcome: 'built', draftRevision: 3 });

    // The only remaining advice row is the withheld README entry. The v5 fidelity packet may issue.
    write(next, as('polaris-dossier-local-draft-v5'));
    const checked = await cli(['check', run]);
    expect(checked).toMatchObject({ outcome: 'passed', revision: 4, inventoryCoverageAdvice: {
      state: 'compared', uncovered: [{ entryId: 'e-readme', paths: ['README.md'], unnamedPaths: 0 }],
      note: expect.stringContaining('Advice: it sets no outcome and is not stored in the check record.'),
    } });
    expect((checked['inventoryCoverageAdvice'] as Doc)['note']).not.toContain('issues no fidelity packet while an entry is listed here');
    expect(await cli(['session-prompt', run, 'review', '--kind', 'fidelity'])).toMatchObject({ outcome: 'issued', role: 'review', kind: 'fidelity' });
    expect(packetDirs(run)).toHaveLength(3);
  });
});

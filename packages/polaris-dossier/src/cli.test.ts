import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderHuman, runDossierCli } from './cli.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { tempDir } from '@syzygy/test-kit';

// Design "Command surface": non-interactive; a human summary and, with --json, the same content as
// one JSON document; exit status 0 clean, 1 refusal, 2 usage error.
const run = async (argv: readonly string[]): Promise<{ code: number; stdout: string; stderr: string }> => {
  let stdout = '';
  let stderr = '';
  const code = await runDossierCli(argv, { stdout: (text) => { stdout += text; }, stderr: (text) => { stderr += text; } });
  return { code, stdout, stderr };
};
const SUBJECT: RunSubject = {
  repository: { url: 'https://github.com/redis/redis', repositoryId: 'redis-redis' },
  clone: { path: '/srv/clones/redis', declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit: '498ecd0d6d007db11ddb3aea9428552598a78622', label: '8.10.2', consentRecord: 'PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7', pinnedAt: '2026-10-07T10:00:00.000Z' },
  startGates: { registryEntry: 'PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-2026-10-07', screeningPolicy: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-04' },
  governed: { kind: 'non-governed', because: ['the project input fixture states that no kernel evidence drawer exists'] },
  providerStatement: null,
  workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
};

let runDir: string;
beforeEach(() => {
  runDir = tempDir('dossier-cli-');
  const parsed = parseRunConfig(JSON.stringify({
    operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic',
    model: 'claude-opus-5-5', deadline: 'PT1H', agentTokenBudget: 100_000, maxRepairCycles: 1, maxQuestions: 2,
    audience: 'an operator', operatorIsOwner: true,
  }));
  if (!parsed.ok) throw new Error('fixture configuration refused');
  fs.writeFileSync(path.join(runDir, 'run.json'), encodeRunRecord(parsed.config, SUBJECT));
});

/** Every leaf of a JSON document as `dotted.key: value`, computed here rather than by the module. */
const leaves = (value: unknown, key = ''): string[] => {
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return [`${key}: (none)`];
    return entries.flatMap(([child, item]) => leaves(item, key === '' ? child : `${key}.${child}`));
  }
  return [`${key}: ${String(value)}`];
};

describe('syzygy dossier', () => {
  it('exits 2 with usage when no command is given', async () => {
    const result = await run([]);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.startsWith('syzygy dossier: a command is required\n\nsyzygy dossier — operator-agent dossier runs\n')).toBe(true);
  });

  it.each([[['publish', 'r']], [['frobnicate']]])('exits 2 for a command this build does not have (%j)', async (argv) => {
    const result = await run(argv);
    expect(result.code).toBe(2);
    expect(result.stderr.startsWith(`syzygy dossier: unknown dossier command: ${argv[0]}\n`)).toBe(true);
  });

  it.each([[['status']], [['status', 'a', 'b']], [['status', '--verbose', 'a']], [['help', 'extra']]])('exits 2 for malformed arguments (%j)', async (argv) => {
    expect((await run(argv)).code).toBe(2);
  });

  it.each([[['help']], [['--help']], [['-h']]])('prints usage and exits 0 for %j', async (argv) => {
    const result = await run(argv);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.startsWith('syzygy dossier — operator-agent dossier runs\n')).toBe(true);
  });

  it('reports status, exit 0, with the human form carrying every JSON leaf in order', async () => {
    const human = await run(['status', runDir]);
    const json = await run(['status', runDir, '--json']);
    expect(human.code).toBe(0);
    expect(json.code).toBe(0);
    expect(human.stderr + json.stderr).toBe('');
    const document = JSON.parse(json.stdout) as Record<string, unknown>;
    expect(document['label']).toBe('Inferred');
    expect(human.stdout).toBe(`${leaves(document).join('\n')}\n`);
    expect(human.stdout).toContain('principal.credentialIdentity: Unknown\n');
  });

  it('accepts --json before the command', async () => {
    const result = await run(['--json', 'status', runDir]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).command).toBe('status');
  });

  it('refuses an unreadable run with exit 1, the reason on stderr and, with --json, the same reason as JSON', async () => {
    const missing = path.join(runDir, 'absent');
    const human = await run(['status', missing]);
    expect(human).toEqual({
      code: 1,
      stdout: '',
      stderr: `command: status\noutcome: refused\nreason: run directory ${missing} cannot be read (ENOENT)\n`,
    });
    const json = await run(['status', missing, '--json']);
    expect(json.code).toBe(1);
    expect(JSON.parse(json.stdout)).toEqual({ command: 'status', outcome: 'refused', reason: `run directory ${missing} cannot be read (ENOENT)` });
  });

  it('renders an empty list or object as (none)', async () => {
    expect(renderHuman({ a: [], b: {} })).toBe('a: (none)\nb: (none)\n');
  });

  it('writes a string leaf that could break its line as a JSON string, and leaves every other leaf as it was (syzygy-mea.3 round-1 note 3)', () => {
    expect(renderHuman({ a: 'plain text: with colons', n: 3 })).toBe('a: plain text: with colons\nn: 3\n');
    expect(renderHuman({ path: 'docs/a\nnext: forged' })).toBe('path: "docs/a\\nnext: forged"\n');
    expect(renderHuman({ p: 'a\rb' })).toBe('p: "a\\rb"\n');
    expect(renderHuman({ p: 'a\u2028b\u0085c\u007fd' })).toBe('p: "a\\u2028b\\u0085c\\u007fd"\n');
  });
});

describe('no route and no credential', () => {
  // REQ-polaris-generation-033: the commands serve no route, accept no network request and hold no
  // credential. A static sweep of the package's sources: no module that opens a socket is imported.
  const SRC = path.dirname(fileURLToPath(import.meta.url));
  const NETWORK = /from\s+['"](?:node:)?(?:net|http|https|http2|tls|dgram)['"]|import\(\s*['"](?:node:)?(?:net|http|https|http2|tls|dgram)['"]\s*\)/;
  const all = fs.readdirSync(SRC).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts')).sort();
  // The launched run's broker (candidate REQ-polaris-generation-041, prototype under POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14) talks to
  // its own sessions over Unix-domain sockets on the local file system: it imports node:net for that alone, listens on a path and never on
  // a port or host. Those two files are checked by the test below instead.
  const UNIX_SOCKET_ONLY = ['broker-client.ts', 'broker.ts'];
  const sources = all.filter((name) => !UNIX_SOCKET_ONLY.includes(name));

  it('sweeps a non-empty population of source files', async () => {
    expect(sources).toEqual(['argv.ts', 'brief.ts', 'census.ts', 'check-derive.ts', 'check-model.ts', 'check.ts', 'child-process.testkit.ts', 'class-gate.ts', 'cli.ts', 'clone-head.ts', 'clone-shape.ts', 'close.ts', 'credential-probe.ts', 'design-review.ts', 'doctrine-quote.ts', 'draft-schema.ts', 'execution-choice.ts', 'execution-flags.ts', 'execution-rule.ts', 'fs-patch.testkit.ts', 'full-run.testkit.ts', 'gate-sources.ts', 'git-object-reader.ts', 'github-url.ts', 'governed.ts', 'index.ts', 'init.ts', 'inventory.ts', 'iso-of.ts', 'launched.ts', 'outcome.ts', 'polaris.ts', 'preflight.ts', 'render.ts', 'reverify.ts', 'review-model.ts', 'review-packet.ts', 'review-verdict.ts', 'review.ts', 'run-config.ts', 'run-dir.ts', 'run-record.ts', 'screen.ts', 'session-handover.ts', 'session-statement.ts', 'session-view.ts', 'state-directory.ts', 'status.ts', 'waiting-sessions.ts']);
  });

  it.each(sources.map((name) => [name]))('%s imports no network module', (name) => {
    expect(NETWORK.test(fs.readFileSync(path.join(SRC, name), 'utf8'))).toBe(false);
  });

  it.each(UNIX_SOCKET_ONLY.map((name) => [name]))('%s uses node:net for Unix-domain sockets only', (name) => {
    const text = fs.readFileSync(path.join(SRC, name), 'utf8');
    expect(all).toContain(name);
    expect(/from\s+['"](?:node:)?(?:http|https|http2|tls|dgram)['"]/.test(text)).toBe(false);
    expect(/\.listen\(\s*(?!socket\b)/.test(text)).toBe(false);
    expect(/createConnection\(\s*(?!socket\b)/.test(text)).toBe(false);
  });

  it('the sweep pattern catches a network import (its own mutant)', async () => {
    expect(NETWORK.test("import * as net from 'node:net';")).toBe(true);
    expect(NETWORK.test("const http = await import('http');")).toBe(true);
  });
});

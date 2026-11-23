import { declaredSubjectFixture, policyFixture } from './full-run.testkit.js';
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
  repository: { url: 'github.com/redis/redis', repositoryId: 'redis-redis', role: 'observed-source' },
  clone: { path: '/srv/clones/redis', declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit: '498ecd0d6d007db11ddb3aea9428552598a78622', label: '8.10.2', pinnedAt: '2026-10-07T10:00:00.000Z' },
  ...declaredSubjectFixture(),
  governed: { kind: 'non-governed', because: ['the project input fixture states that no kernel evidence drawer exists'] },

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

describe('dossier network module boundaries', () => {
  // The ordinary dossier commands keep the no-route rule of REQ-polaris-generation-033.
  // The supervised runtimes carry their own local socket paths and fixed provider relay.
  const src = path.dirname(fileURLToPath(import.meta.url));
  const network = /from\s+['"](?:node:)?(net|http|https|http2|tls|dgram)['"]|import\(\s*['"](?:node:)?(net|http|https|http2|tls|dgram)['"]\s*\)/gu;
  const connections = /[^\n]*(?:\.listen\(|\bcreateConnection\(|\.request\(|\bnew Socket\()[^\n]*/gu;
  const transport: Readonly<Record<string, { readonly modules: readonly string[]; readonly calls: readonly string[] }>> = {
    'broker-client.ts': { modules: ['net'], calls: ['net.createConnection(socket)'] },
    'broker.ts': { modules: ['net'], calls: ['server.listen(socket)'] },
    'session-bridge.ts': { modules: ['http', 'net'], calls: [
      "http.request({ socketPath, method: 'POST', path: incoming.url, headers, setHost: false, agent: false }",
      "server.listen(0, '127.0.0.1',",
    ] },
    'session-broker.ts': { modules: ['net'], calls: ['server.listen(socket,'] },
    'session-launch.ts': { modules: ['net'], calls: ['server.listen(socket, resolve)'] },
    'session-machine-transport.ts': { modules: ['net'], calls: [] },
    'session-mcp.ts': { modules: ['net'], calls: ['createConnection({ path: socketPath })'] },
    'session-peer.ts': { modules: ['net'], calls: [] },
    'session-relay.ts': { modules: ['http', 'net', 'https'], calls: [
      "https.request({ hostname: 'api.anthropic.com', servername: 'api.anthropic.com', port: 443,",
      'ports.request(body, context, route)',
      'listener.listen(socket,',
    ] },
    'url-machine-peer.ts': { modules: ['net'], calls: [] },
    'url-role-plan.ts': { modules: ['net'], calls: [
      "server.listen(0, '127.0.0.1', resolve)",
      "server.listen(0, '127.0.0.1', resolve)",
    ] },
    'url-run-sessions.ts': { modules: ['net'], calls: ["probe.listen(0, '127.0.0.1', resolve)"] },
  };
  const readImports = (text: string): readonly string[] => [...text.matchAll(network)].map(match => (match[1] ?? match[2])!);
  const files = fs.readdirSync(src).filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts')).sort();

  it('finds each named transport and the ordinary command modules', () => {
    expect(files).toEqual(expect.arrayContaining([
      ...Object.keys(transport), 'cli.ts', 'init.ts', 'check.ts', 'render.ts', 'close.ts', 'relation-witness.ts', 'run-tree-read.ts', 'verify-text-run.ts', 'verify-text.ts',
    ]));
    expect(files.length).toBeGreaterThan(Object.keys(transport).length);
  });

  it.each(files)('%s has the declared network imports and connection call sites', name => {
    const text = fs.readFileSync(path.join(src, name), 'utf8');
    const declared = transport[name];
    expect(readImports(text)).toEqual(declared?.modules ?? []);
    if (declared === undefined) return;
    const actual = [...text.matchAll(connections)].map(match => match[0]);
    expect(actual).toHaveLength(declared.calls.length);
    for (const [index, call] of declared.calls.entries()) expect(actual[index]).toContain(call);
  });

  it('recognizes both static and dynamic network imports', () => {
    expect(readImports("import * as net from 'node:net';")).toEqual(['net']);
    expect(readImports("const http = await import('http');")).toEqual(['http']);
  });
});

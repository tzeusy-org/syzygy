import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileEveryOffsetMatcher, LINEAR_EQUIVALENTS, linearDetector, readConfigurationDetectors, type RedactionDetector } from './secret-redaction.js';

// syzygy-3efd.24: the dossier declared-source policy 2.0.0's `configurationDetectors`, read from the committed successor and run as the
// screens run them (each in its `linearDetector` form). Every planted value is fake and assembled from pieces, as the other detector
// tests write theirs, so no committed line reads as a credential assignment; expected detector ids are literals.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const V2 = JSON.parse(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json'), 'utf8'));
const SCOPE = V2.publicSourceScope;
const PRIOR_IDS: string[] = [...V2.detectors, ...SCOPE.scopeDetectors.detectors].map((detector: { id: string }) => detector.id);

const read = (scope: unknown = SCOPE) => readConfigurationDetectors(scope, PRIOR_IDS);
const DETECTORS = ((): readonly RedactionDetector[] => {
  const result = read();
  if (!result.ok) throw new Error(result.why);
  return result.detectors;
})();
const RUN = compileEveryOffsetMatcher(DETECTORS.map(linearDetector));
const firstId = (text: string): string | undefined => RUN.first(text)?.detectorId;

// Fake fragments: each keyword and value is joined at run time.
const PW = ['pass', 'word'].join('');
const SECRET = ['sec', 'ret'].join('');
const VALUE = ['hunter2', 'hunter2'].join('');
const LONG = ['abcdef', '0123456789'].join('');

describe('the configuration detectors read', () => {
  it('as the six the policy lists, in order', () => {
    expect(DETECTORS.map(detector => detector.id)).toEqual(['config-credential-key', 'kubernetes-secret-kind', 'hcl-secret-variable-default', 'dockerfile-secret-env',
      'netrc-machine-password', 'authorization-header-credential']);
  });
  it.each<[string, (block: Record<string, any>) => void, string]>([
    ['an edited rule', block => { block['rule'] += ' '; }, 'its configuration detectors rule is not the text this screen implements'],
    ['an edited consequence', block => { block['consequence'] += ' '; }, 'its configuration detectors consequence is not the text this screen implements'],
    ['no detector', block => { block['detectors'] = []; }, 'its configuration detectors declares no detector'],
    ['a repeated policy detector id', block => { block['detectors'][0]['id'] = PRIOR_IDS[0]; }, `its configuration detectors repeats the detector id ${PRIOR_IDS[0]}`],
    ['an extra field', block => { block['extra'] = 1; }, 'its configuration detectors carries the fields rule, detectors, consequence, extra, not exactly rule, detectors, consequence'],
    ['a detector with another field', block => { block['detectors'][1]['note'] = 'x'; }, "its configuration detectors detector kubernetes-secret-kind is not read as the policy's detectors are"],
  ])('and refuse %s', (_name, change, why) => {
    const block = JSON.parse(JSON.stringify(SCOPE.configurationDetectors));
    change(block);
    expect(read({ ...SCOPE, configurationDetectors: block })).toEqual({ ok: false, why });
  });
  it('and are absent from a scope that declares none', () => {
    const { configurationDetectors: _dropped, ...without } = SCOPE;
    expect(read(without)).toEqual({ ok: true, detectors: [] });
  });
});

describe('a planted value in each configuration format', () => {
  it.each<[string, string, string]>([
    // config-credential-key: quoted JSON keys, compound keys, the Docker auths entry, := assignments, and the spec's agent-text line.
    ['JSON', `{"${PW}": "${VALUE}"}\n`, 'config-credential-key'],
    ['YAML compound key', `${SECRET.toUpperCase()}_KEY_BASE: ${LONG}\n`, 'config-credential-key'],
    ['YAML nested', `db:\n  ${PW}_prod: ${VALUE}\n`, 'config-credential-key'],
    ['TOML', `api_key = "${LONG}"\n`, 'config-credential-key'],
    ['HCL assignment', `db_${PW} = "${VALUE}"\n`, 'config-credential-key'],
    ['Makefile :=', `TOKEN := ${LONG}\n`, 'config-credential-key'],
    ['Makefile ?=', `CLIENT_${SECRET.toUpperCase()} ?= ${LONG}\n`, 'config-credential-key'],
    ['Docker config auths', `{"auths": {"registry.example": {"auth": "dXNlcjpwYXNzd29yZA=="}}}\n`, 'config-credential-key'],
    ['agent text', `aws_${SECRET}_access_key = AbCdEfGhIjKlMn`, 'config-credential-key'],
    // kubernetes-secret-kind.
    ['Kubernetes YAML', `apiVersion: v1\nkind: Secret\nmetadata:\n  name: x\ndata:\n  k: dmFsdWU=\n`, 'kubernetes-secret-kind'],
    ['Kubernetes JSON', `{"apiVersion": "v1", "kind": "Secret", "data": {}}\n`, 'kubernetes-secret-kind'],
    ['Kubernetes with a comment', `kind: Secret # generated\n`, 'kubernetes-secret-kind'],
    // hcl-secret-variable-default.
    ['Terraform variable', `variable "db_${PW}" {\n  type    = string\n  default = "${VALUE}"\n}\n`, 'hcl-secret-variable-default'],
    // dockerfile-secret-env.
    ['Dockerfile ENV', `FROM scratch\nENV API_KEY ${LONG}\n`, 'dockerfile-secret-env'],
    ['Dockerfile ARG', `ARG GITHUB_TOKEN ${LONG}\n`, 'dockerfile-secret-env'],
    // netrc-machine-password.
    ['netrc', `machine example.invalid login me ${PW} ${VALUE}\n`, 'netrc-machine-password'],
    // authorization-header-credential.
    ['an Authorization header', `Authorization: Bearer ${LONG}\n`, 'authorization-header-credential'],
    ['a quoted header in JSON', `{"authorization": "token ${LONG}"}\n`, 'authorization-header-credential'],
  ])('%s is matched', (_name, body, id) => {
    expect(firstId(body)).toBe(id);
  });

  it.each<[string, string]>([
    ['a reference', `${PW}: \${DB_PASSWORD}\n`],
    ['a template', `${PW}: "{{ vault_value }}"\n`],
    ['a placeholder', `token: <your-token-here>\n`],
    ['a short value', `${PW}: short\n`],
    ['a key with no keyword', `username: ${LONG}\n`],
    ['SecretProviderClass', `kind: SecretProviderClass\n`],
    ['a variable without a default', `variable "db_${PW}" {\n  type = string\n}\n`],
    ['a variable defaulting to an interpolation', `variable "db_${PW}" {\n  default = "\${var.x}"\n}\n`],
    ['an ENV naming no secret', `ENV PATH /usr/local/bin:/usr/bin\n`],
    ['a header whose value is a reference', `Authorization: Bearer $TOKEN\n`],
  ])('%s is not matched', (_name, body) => {
    expect(firstId(body)).toBeUndefined();
  });
});

describe('the linear form of hcl-secret-variable-default', () => {
  const policyForm = DETECTORS.find(detector => detector.id === 'hcl-secret-variable-default') as Extract<RedactionDetector, { kind: 'regular-expression' }>;
  const linearForm = linearDetector(policyForm) as Extract<RedactionDetector, { kind: 'regular-expression' }>;
  it('is the one entry of LINEAR_EQUIVALENTS, keyed by the policy pattern and flags', () => {
    expect([...LINEAR_EQUIVALENTS.keys()]).toEqual([`${policyForm.pattern}/${policyForm.flags}`]);
    expect(linearForm.pattern).not.toBe(policyForm.pattern);
    expect(DETECTORS.filter(detector => detector !== policyForm).every(detector => linearDetector(detector) === detector)).toBe(true);
  });
  it('matches the same text at every offset as the policy form, over a seeded population', () => {
    const pieces = ['variable', ' ', '\t', '"', 'key', 'Pass' + 'word', 'SECRET', '{', '}', 'default', '=', 'abcdefgh', '$', '\n', '\r', 'x'];
    let seed = 0x9e3779b9;
    const next = (n: number): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
    const a = new RegExp(policyForm.pattern, 'iy'), b = new RegExp(linearForm.pattern, 'iy');
    // Each text follows the shape of a match, with each part kept, replaced by a random piece or followed by one at random.
    const shape = ['variable', ' ', '"', 'db_', 'key', '_x', '"', ' ', '{', '\n', 'type = 1', '\n', 'default', ' ', '=', ' ', '"', 'abcdefgh', '"', '}'];
    let compared = 0, differing = 0, matched = 0;
    for (let k = 0; k < 20_000; k++) {
      let text = '';
      for (const part of shape) {
        const roll = next(10);
        text += roll < 7 ? part : roll < 9 ? pieces[next(pieces.length)]! : part + pieces[next(pieces.length)]!;
      }
      for (let at = 0; at < text.length; at++) {
        a.lastIndex = at; b.lastIndex = at;
        const x = a.exec(text), y = b.exec(text);
        compared++;
        if (x !== null) matched++;
        if ((x?.[0] ?? null) !== (y?.[0] ?? null)) differing++;
      }
    }
    // The population is large and reaches matches, so agreement is not agreement on "no match".
    expect(compared).toBeGreaterThan(100_000);
    expect(matched).toBeGreaterThan(50);
    expect(differing).toBe(0);
  });
});

// Each detector over adversarial 160,000-character bodies (a long run of its keyword), first-match search as the screen runs it for a
// Stage-2 body and agent text. The review of the policy found one quadratic detector; the bound here is generous so that a slow host
// does not fail it, while a quadratic form at this length takes several seconds.
const N = 160_000;
const run = (unit: string): string => unit.repeat(Math.ceil(N / unit.length)).slice(0, N);
const ADVERSARIAL: readonly [string, string][] = [
  ['a run of the first keyword', run(PW)],
  ['a run of auth', run('auth')],
  ['keyword and colon', run(`${PW}:`)],
  ['keyword then blanks', `${PW}${' '.repeat(N)}`],
  ['an unterminated variable name', `variable "${run('key')}`],
  ['many open variable blocks', run('variable "key" {\n')],
  ['many open defaults', run('variable "key" { default = "')],
  ['kind runs', run('kind: ')],
  ['ENV runs', run(`ENV ${PW.toUpperCase()} `)],
  ['ENV then blanks', `ENV ${PW.toUpperCase()}${' '.repeat(N)}`],
  ['machine runs', run('machine x login y ')],
  ['authorization runs', run('authorization: bearer ')],
  ['a run of quotes', run('"')],
];
describe('each configuration detector is bounded on adversarial bodies', () => {
  it.each(DETECTORS.map(detector => [detector.id, detector] as const))('%s', (_id, detector) => {
    const one = compileEveryOffsetMatcher([linearDetector(detector)]);
    for (const [, body] of ADVERSARIAL) {
      const started = performance.now();
      one.first(body);
      expect(performance.now() - started).toBeLessThan(2_000);
    }
  }, 120_000);

  it('canary: the policy form of hcl-secret-variable-default is not bounded on the unterminated name', () => {
    const policyForm = DETECTORS.find(detector => detector.id === 'hcl-secret-variable-default')!;
    const body = `variable "${run('key').slice(0, 80_000)}`;
    const raw = compileEveryOffsetMatcher([policyForm]);
    const started = performance.now();
    raw.first(body);
    // About a second on the host this was written on (3.5 s at 160,000 characters); the linear form takes a few milliseconds.
    expect(performance.now() - started).toBeGreaterThan(200);
  }, 120_000);
});

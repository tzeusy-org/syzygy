import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { VerifiedBlob } from './git-object-reader.js';
import { deriveManifestFacts, type ManifestFacts } from './manifest-facts.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';

// syzygy-3efd.26 (REQ-polaris-generation-034 version 2.12): the five infrastructure recognizers in the manifestFacts member, and its
// coverage remainder, from a tree listing, the bound policy's screen and a reader double. Expected members, counts, reasons and identities
// are literals written from the fixture before the driver ran. The screen's outcomes for the fixture paths are fixed by running the bound
// policy's screen (the committed declared-source policies 1.0.0 and 2.0.0) and asserted as preconditions. The reader double fails the
// test on any path the stated dispositions do not read. Planted secret values are fake and assembled from pieces.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POLICY = {
  v1: new Uint8Array(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json'))),
  v2: new Uint8Array(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json'))),
};
const SUBJECT = { repository: 'repository:o-r', commit: 'a'.repeat(40) };
const SECRET_NAME = ['gh', 'p_', 'k'.repeat(36)].join('');

let V1: DossierScreen, V2: DossierScreen;
beforeAll(() => {
  const build = (bytes: Uint8Array): DossierScreen => { const load = buildDossierScreen(bytes, true, SUBJECT, 'public'); if (!load.ok) throw new Error(load.why); return load.screen; };
  V1 = build(POLICY.v1);
  V2 = build(POLICY.v2);
});

const idOf = (p: string): string => createHash('sha1').update(p).digest('hex');
type Tree = Record<string, string | { readonly mode: string }>;
/** The listing of `tree` (mode 100644 unless given) and a reader double that reads only `mayRead`, recording every path asked for. */
function fixture(tree: Tree, mayRead: readonly string[]) {
  const asked: string[] = [];
  const entries = Object.entries(tree).map(([p, v]) => ({ path: p, mode: typeof v === 'object' ? v.mode : '100644', id: idOf(p) }));
  const read = async (p: string): Promise<VerifiedBlob> => {
    asked.push(p);
    if (!mayRead.includes(p)) throw new Error(`the reader double was asked for ${JSON.stringify(p)}, which the dispositions do not read`);
    return { path: p, mode: '100644', id: '0'.repeat(40), bytes: new TextEncoder().encode(tree[p] as string) };
  };
  return { entries, read, asked };
}
const derive = (screen: DossierScreen, f: ReturnType<typeof fixture>): Promise<ManifestFacts> =>
  deriveManifestFacts({ entries: f.entries, screen, consented: null, read: f.read });
const derived = (m: ManifestFacts) => { if (m.state !== 'derived') throw new Error('expected a derived member'); return m; };
const entryOf = (m: ReturnType<typeof derived>, rule: string) => m.recognizers.find((r) => r.rule === rule)!;
const inferredFile = (p: string, facts: number, valuesLeftOut = 0) => ({ path: p, epistemic: 'inferred', unknownReason: null, parseFault: null, facts, valuesLeftOut });
const unknownFile = (p: string, unknownReason: string, parseFault: string | null = null) => ({ path: p, epistemic: 'unknown', unknownReason, parseFault, facts: null, valuesLeftOut: null });
/** A fact's kind, lines and members by name, without its id, rule and path. */
const brief = (m: ReturnType<typeof derived>, p: string) => m.facts.filter((f) => f.path === p).map(({ id: _id, rule: _rule, ruleVersion: _v, path: _path, epistemic: _e, ...rest }) => rest);

const T: Record<string, string> = {};
beforeAll(() => {
  Object.assign(T, {
    compose: 'services:\n  web:\n    image: nginx:${TAG}\n    ports:\n      - "8080:80"\n      - 443\n      - target: 9000\n        published: "9001"\n    depends_on: [db]\n  db:\n    depends_on:\n      cache:\n        condition: service_healthy\n',
    k8s: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\n---\n---\napiVersion: v1\nkind: Service\n',
    values: 'replicaCount: 1\n',
    template: 'kind: {{ .Values.kind }}\n',
    terraform: 'resource "aws_instance" "web" {\n  ami = "x"\n}\n\nresource "aws_s3_bucket" "logs" {}\n\nmodule "vpc" {\n  source = "./modules/vpc"\n}\n\nvariable "env" {}\n\ndata "aws_ami" "x" {}\n\nlocals {\n  script = <<EOF\nresource "x" "y" {\nEOF\n}\n',
    makefile: '.PHONY: build test\nbuild: deps\n\tdeploy: x\ntest:: build\n%.o: %.c\n$(BIN): main.o\nCC := gcc\nbuild: CFLAGS += -O2\nifeq ($(CC),gcc)\nbuild: other\nendif\n',
  });
});

describe('manifestFacts version 2.12: the five infrastructure recognizers under declared-source policy 2.0.0', () => {
  it('records Compose services, images, ports and dependencies (scenario "Compose services, images, ports and dependencies")', async () => {
    expect(V2.screenPath('compose.yaml')).toBeUndefined();
    const f = fixture({ 'compose.yaml': T['compose']! }, ['compose.yaml']);
    const m = derived(await derive(V2, f));
    expect(entryOf(m, 'compose-file')).toEqual({
      rule: 'compose-file', ruleVersion: 1, label: 'inferred', candidates: 1, secretPathsLeftOut: 0, setApart: 0, inferred: 1, unknown: 0, valuesLeftOut: 0, facts: 8,
      files: [inferredFile('compose.yaml', 8)], filesNotListed: 0,
    });
    const fact = (id: number, kind: string, lines: [number, number], members: Record<string, string>) =>
      ({ id: `_manifest-${id}`, fact: kind, rule: 'compose-file', ruleVersion: 1, path: 'compose.yaml', lines, ...members, epistemic: 'inferred' });
    expect(m.facts).toEqual([
      fact(1, 'service', [2, 9], { service: 'web' }),
      fact(2, 'service-image', [3, 3], { service: 'web', image: 'nginx:${TAG}' }),
      fact(3, 'service-port', [5, 5], { service: 'web', port: '8080:80' }),
      fact(4, 'service-port', [6, 6], { service: 'web', port: '443' }),
      fact(5, 'service-port', [7, 8], { service: 'web', port: '9001:9000' }),
      fact(6, 'service-depends-on', [9, 9], { from: 'web', to: 'db' }),
      fact(7, 'service', [10, 13], { service: 'db' }),
      fact(8, 'service-depends-on', [12, 13], { from: 'db', to: 'cache' }),
    ]);
    expect(Object.keys(m.facts[1]!)).toEqual(['id', 'fact', 'rule', 'ruleVersion', 'path', 'lines', 'service', 'image', 'epistemic']);
    expect(JSON.stringify(m)).not.toContain('service_healthy');
  });

  it('records Kubernetes objects across documents, a values file Inferred with zero facts, and no Helm template (scenario "Kubernetes objects across documents")', async () => {
    const tree: Tree = { 'k8s/app.yaml': T['k8s']!, 'deploy/values.yaml': T['values']!, 'deploy/chart/templates/svc.yaml': T['template']! };
    for (const p of ['k8s/app.yaml', 'deploy/values.yaml']) expect(V2.screenPath(p)).toBeUndefined();
    const f = fixture(tree, ['deploy/values.yaml', 'k8s/app.yaml']);
    const m = derived(await derive(V2, f));
    expect(f.asked).toEqual(['deploy/values.yaml', 'k8s/app.yaml']);
    expect(entryOf(m, 'kubernetes-manifest').files).toEqual([inferredFile('deploy/values.yaml', 0), inferredFile('k8s/app.yaml', 2)]);
    expect(brief(m, 'k8s/app.yaml')).toEqual([
      { fact: 'kubernetes-object', lines: [1, 4], kind: 'Deployment', name: 'api' },
      { fact: 'kubernetes-object', lines: [7, 8], kind: 'Service', name: null },
    ]);
    expect(m.remainder).toEqual({
      files: 3, secretPathsLeftOut: 0, candidates: 2, notCandidates: 1,
      places: [{ place: null, files: 0, notCandidates: 0 }, { place: 'deploy', files: 2, notCandidates: 1 }, { place: 'k8s', files: 1, notCandidates: 0 }],
      placesNotListed: 0, filesInPlacesNotListed: 0, notCandidatesInPlacesNotListed: 0,
    });
  });

  it('records Terraform resources and modules and never reads a variable or state file (scenario "Terraform resources and modules, ...")', async () => {
    const tree: Tree = { 'infra/main.tf': T['terraform']!, 'infra/prod.tfvars': 'password = "x"\n', 'infra/terraform.tfstate': '{}\n' };
    expect(V2.screenPath('infra/main.tf')).toBeUndefined();
    expect([V2.screenPath('infra/prod.tfvars'), V2.screenPath('infra/terraform.tfstate')]).toEqual(['denied-path', 'denied-path']);
    const f = fixture(tree, ['infra/main.tf']);
    const m = derived(await derive(V2, f));
    expect(f.asked).toEqual(['infra/main.tf']);
    expect(brief(m, 'infra/main.tf')).toEqual([
      { fact: 'terraform-resource', lines: [1, 3], type: 'aws_instance', name: 'web' },
      { fact: 'terraform-resource', lines: [5, 5], type: 'aws_s3_bucket', name: 'logs' },
      { fact: 'terraform-module', lines: [7, 9], name: 'vpc', source: './modules/vpc' },
    ]);
    const members = JSON.stringify([m.recognizers, m.facts]);
    expect(members).not.toContain('tfvars');
    expect(members).not.toContain('tfstate');
    expect(m.remainder).toEqual({
      files: 3, secretPathsLeftOut: 0, candidates: 1, notCandidates: 2,
      places: [{ place: null, files: 0, notCandidates: 0 }, { place: 'infra', files: 3, notCandidates: 2 }],
      placesNotListed: 0, filesInPlacesNotListed: 0, notCandidatesInPlacesNotListed: 0,
    });
  });

  it('records Make targets, and names a function call beyond-reader and a recipe before any rule syntax (scenario "Make targets")', async () => {
    const tree: Tree = { Makefile: T['makefile']!, 'a/Makefile': 'all: x\n$(eval $(call rule,x))\n', 'b/Makefile': '\techo hi\nall:\n' };
    for (const p of Object.keys(tree)) expect(V2.screenPath(p)).toBeUndefined();
    const m = derived(await derive(V2, fixture(tree, Object.keys(tree))));
    expect(entryOf(m, 'makefile').files).toEqual([inferredFile('Makefile', 2), unknownFile('a/Makefile', 'unparsed', 'beyond-reader'), unknownFile('b/Makefile', 'unparsed', 'syntax')]);
    expect(brief(m, 'Makefile')).toEqual([{ fact: 'make-target', lines: [2, 2], target: 'build' }, { fact: 'make-target', lines: [4, 4], target: 'test' }]);
  });

  it('sets apart a Compose file, a manifest and a Makefile under a test, vendored or generated path, never naming it', async () => {
    const tree: Tree = { 'test/fixtures/compose.yaml': 'services: {}\n', 'vendor/x/k8s/a.yaml': 'kind: A\n', 'build/Makefile': 'all:\n' };
    const f = fixture(tree, []);
    const m = derived(await derive(V2, f));
    expect(f.asked).toEqual([]);
    expect(['compose-file', 'kubernetes-manifest', 'makefile'].map((rule) => [entryOf(m, rule).candidates, entryOf(m, rule).setApart, entryOf(m, rule).files])).toEqual([[1, 1, []], [1, 1, []], [1, 1, []]]);
    expect(m.remainder.candidates).toBe(3);
  });
});

describe('manifestFacts version 2.12: the bound policy', () => {
  it('names CMake lists and the other makefile names Unknown and unread under 1.0.0 and 2.0.0 (scenario "CMake lists and other makefile names ...")', async () => {
    const tree: Tree = { 'CMakeLists.txt': 'project(a)\n', 'src/CMakeLists.txt': 'add_library(b x.c)\n', GNUmakefile: 'all:\n', 'tools/makefile': 'all:\n' };
    for (const screen of [V1, V2]) {
      for (const p of Object.keys(tree)) expect(screen.screenPath(p)).toBe('unknown-extraction-class');
      const f = fixture(tree, []);
      const m = derived(await derive(screen, f));
      expect(f.asked).toEqual([]);
      const cmake = entryOf(m, 'cmake-lists'), make = entryOf(m, 'makefile');
      expect([cmake.unknown, cmake.facts, cmake.files]).toEqual([2, 0, [unknownFile('CMakeLists.txt', 'unknown-extraction-class'), unknownFile('src/CMakeLists.txt', 'unknown-extraction-class')]]);
      expect([make.unknown, make.files]).toEqual([2, [unknownFile('GNUmakefile', 'unknown-extraction-class'), unknownFile('tools/makefile', 'unknown-extraction-class')]]);
    }
  });

  it('names every infrastructure file Unknown, unknown-extraction-class, under 1.0.0', async () => {
    const tree: Tree = { 'compose.yaml': T['compose']!, 'k8s/app.yaml': T['k8s']!, 'infra/main.tf': T['terraform']!, Makefile: T['makefile']! };
    const f = fixture(tree, []);
    const m = derived(await derive(V1, f));
    expect(f.asked).toEqual([]);
    expect(m.recognizers.slice(5).map((r) => [r.rule, r.files.map((x) => x.unknownReason)])).toEqual([
      ['compose-file', ['unknown-extraction-class']], ['kubernetes-manifest', ['unknown-extraction-class']], ['terraform-configuration', ['unknown-extraction-class']],
      ['makefile', ['unknown-extraction-class']], ['cmake-lists', []],
    ]);
  });
});

describe('manifestFacts version 2.12: malformed files and the read limit', () => {
  it('names each malformed infrastructure file Unknown, unparsed, with its fault, never as declaring nothing (scenario "Malformed infrastructure file ...")', async () => {
    const tree: Tree = {
      'compose.yaml': 'services:\n  - web\n',
      'b/docker-compose.yml': 'x-d: &d\n  image: a\nservices:\n  web:\n    <<: *d\n',
      'k8s/a.yaml': 'apiVersion: v1\nkind: 5\n',
      'infra/a.tf': 'resource "a" "b {\n}\n',
      'infra/b.tf': 'module "m" {\n  cidr = "x"\n}\n',
      'infra/c.tf': 'module "m" {\n  source = "./a"\n  source = "./b"\n}\n',
    };
    const m = derived(await derive(V2, fixture(tree, Object.keys(tree))));
    expect(m.recognizers.slice(5, 8).map((r) => [r.rule, r.inferred, r.unknown, r.facts, r.files])).toEqual([
      ['compose-file', 0, 2, 0, [unknownFile('b/docker-compose.yml', 'unparsed', 'beyond-reader'), unknownFile('compose.yaml', 'unparsed', 'field-type')]],
      ['kubernetes-manifest', 0, 1, 0, [unknownFile('k8s/a.yaml', 'unparsed', 'field-type')]],
      ['terraform-configuration', 0, 3, 0, [unknownFile('infra/a.tf', 'unparsed', 'syntax'), unknownFile('infra/b.tf', 'unparsed', 'field-type'), unknownFile('infra/c.tf', 'unparsed', 'duplicate-key')]],
    ]);
    expect(m.facts).toEqual([]);
  });

  it('reads and lists the first 100 of 110 .tf files, and counts the other 10 Unknown over-read-limit (scenario "Infrastructure files past the read limit")', async () => {
    const tree: Tree = {};
    const names = Array.from({ length: 110 }, (_, i) => `infra/${String(i).padStart(3, '0')}.tf`);
    for (const n of names) tree[n] = 'resource "a" "b" {}\n';
    const f = fixture(tree, names.slice(0, 100));
    const tf = entryOf(derived(await derive(V2, f)), 'terraform-configuration');
    expect(f.asked).toEqual(names.slice(0, 100));
    expect([tf.candidates, tf.inferred, tf.unknown, tf.facts, tf.files.length, tf.filesNotListed]).toEqual([110, 100, 10, 100, 100, 10]);
    expect([tf.files[0], tf.files[99]]).toEqual([inferredFile('infra/000.tf', 1), inferredFile('infra/099.tf', 1)]);
  });

  it('keeps 250 for the recognizers of version 2.7 beside 100 for those of version 2.12', async () => {
    const tree: Tree = {};
    for (let i = 0; i < 101; i++) { tree[`p/${String(i).padStart(3, '0')}/package.json`] = '{}'; tree[`k8s/${String(i).padStart(3, '0')}.yaml`] = 'a: 1\n'; }
    const all = Object.keys(tree);
    const m = derived(await derive(V2, fixture(tree, all)));
    expect([entryOf(m, 'npm-package-manifest').filesNotListed, entryOf(m, 'kubernetes-manifest').filesNotListed, entryOf(m, 'kubernetes-manifest').unknown]).toEqual([0, 1, 1]);
  });
});

describe('manifestFacts version 2.12: the coverage remainder', () => {
  it('sums to the tree: secret paths, candidates and the rest, by place (scenario "Coverage remainder sums to the tree")', async () => {
    const secret = `keys/${SECRET_NAME}`;
    const tree: Tree = {
      'compose.yaml': 'services: {}\n', Makefile: 'all:\n', 'README.md': '# x\n', '.github/workflows/ci.yml': 'on: push\n',
      'infra/main.tf': '', 'infra/prod.tfvars': 'x = 1\n', 'src/package.json': '{}', 'src/a.ts': '', 'src/b.ts': '', [secret]: '', vendor: { mode: '160000' },
    };
    expect(V2.screenBody(secret, secret) === 'secret-detector-match' || V2.screenPath(secret) === 'secret-detector-match').toBe(true);
    const f = fixture(tree, ['compose.yaml', 'Makefile', '.github/workflows/ci.yml', 'infra/main.tf', 'src/package.json']);
    const m = derived(await derive(V2, f));
    expect(m.remainder).toEqual({
      files: 10, secretPathsLeftOut: 1, candidates: 5, notCandidates: 4,
      places: [
        { place: null, files: 3, notCandidates: 1 }, { place: '.github', files: 1, notCandidates: 0 },
        { place: 'infra', files: 2, notCandidates: 1 }, { place: 'src', files: 3, notCandidates: 2 },
      ],
      placesNotListed: 0, filesInPlacesNotListed: 0, notCandidatesInPlacesNotListed: 0,
    });
    const r = m.remainder;
    expect(r.secretPathsLeftOut + r.candidates + r.notCandidates).toBe(r.files);
    expect([r.places.reduce((n, p) => n + p.files, 0), r.places.reduce((n, p) => n + p.notCandidates, 0)]).toEqual([9, 4]);
    // The candidates count is each recognizer entry's candidates less its secret paths, summed.
    expect(m.recognizers.reduce((n, e) => n + e.candidates - e.secretPathsLeftOut, 0)).toBe(5);
    const text = JSON.stringify(m);
    expect(text).not.toContain(SECRET_NAME);
    expect(text).not.toContain('"keys"');
  });

  it('lists the root and the first 250 of 260 top-level directories, and sums the other 10', async () => {
    const tree: Tree = {};
    for (let i = 0; i < 260; i++) tree[`d${String(i).padStart(3, '0')}/main.c`] = '';
    const r = derived(await derive(V2, fixture(tree, []))).remainder;
    expect([r.files, r.candidates, r.notCandidates, r.places.length, r.places[250], r.placesNotListed, r.filesInPlacesNotListed, r.notCandidatesInPlacesNotListed])
      .toEqual([260, 0, 260, 251, { place: 'd249', files: 1, notCandidates: 1 }, 10, 10, 10]);
  });

  it('shows a top-level directory that is not citable in the census form', async () => {
    const r = derived(await derive(V2, fixture({ 'ctl\u0001/x.c': '' }, []))).remainder;
    expect(r.places).toEqual([{ place: null, files: 0, notCandidates: 0 }, { place: '"ctl\\u0001"', files: 1, notCandidates: 1 }]);
  });
});

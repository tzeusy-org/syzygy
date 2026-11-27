import { describe, expect, it } from 'vitest';
import { DOSSIER_CORPUS_MANIFEST, dossierCorpusReaders } from '../../../ci-reader-inventory.js';
import {
  FULL_RUN_TRIGGERS, ROOTED, WALKS, matchesPullRequestCheckout, namesPath, parseGitPathList, parseNameStatus,
  planSelection as select, readerTokens, type ChangedPath,
} from '../../../ci-selection.js';

// syzygy-qu5j: which tests a pull request runs. The module graph itself is Vitest's; these pin the plan handed to it.
const M = (status: string, path: string, previous?: string): ChangedPath => (previous === undefined ? { status, path } : { status, path, previous });
const planSelection = (changed: readonly ChangedPath[], modules: ReadonlyMap<string, string>) => select(changed, () => modules);
const MODULES = new Map<string, string>([
  ['apps/a/src/trajectory.ts', "export const trajectory = 1;"],
  ['apps/a/src/rooted.testkit.ts', "export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));"],
  ['apps/a/src/cwd-reader.ts', "const where = process.cwd();"],
  ['apps/a/src/git-reader.ts', "execFileSync('git', ['rev-parse', '--show-toplevel']);"],
  ['apps/a/src/adoptions.test.ts', "readFileSync(join(ROOT, '.syzygy/governance/decisions/AGENT-ADOPTIONS.md'));"],
  ['apps/a/src/joins.ts', "const up = join(HERE, '..', 'docs');"],
  ['apps/a/src/fixture-reader.ts', "readFileSync(join(HERE, 'fixtures', 'one.json'));"],
  ['apps/a/src/source-reader.test.ts', "readFileSync(new URL('./trajectory.ts', import.meta.url));"],
  ['packages/p/src/prose.ts', "// see docs/README.md and AGENT-ADOPTIONS.md in prose"],
]);

describe('the pull-request selection plan', () => {
  it('hands a changed workspace module to the graph and finds the modules that read its source by name', () => {
    const plan = planSelection([M('M', 'apps/a/src/trajectory.ts')], MODULES);
    expect(plan).toMatchObject({ mode: 'selected', reasons: [], code: ['apps/a/src/trajectory.ts'] });
    expect(plan.documents).toEqual([{ path: 'apps/a/src/trajectory.ts', tokens: ['trajectory.ts'], readers: ['apps/a/src/source-reader.test.ts'] }]);
    expect(plan.related).toEqual(['apps/a/src/source-reader.test.ts', 'apps/a/src/trajectory.ts']);
  });

  it('answers a governed document with every module that locates the repository and every module naming its basename', () => {
    const plan = planSelection([M('M', '.syzygy/governance/decisions/AGENT-ADOPTIONS.md')], MODULES);
    expect(plan.mode).toBe('selected');
    expect(plan.code).toEqual([]);
    expect(plan.documents[0]!.readers).toEqual([
      'apps/a/src/adoptions.test.ts', 'apps/a/src/cwd-reader.ts', 'apps/a/src/git-reader.ts', 'apps/a/src/rooted.testkit.ts',
    ]);
  });

  it('reads a workspace file that is not a module by its basename and its directory', () => {
    const plan = planSelection([M('M', 'apps/a/src/fixtures/one.json')], MODULES);
    expect(plan.code).toEqual([]);
    expect(plan.documents).toEqual([{ path: 'apps/a/src/fixtures/one.json', tokens: ['one.json', 'fixtures'], readers: ['apps/a/src/fixture-reader.ts'] }]);
  });

  it('does not count a bare ".." join or a name in prose as a reader', () => {
    const plan = planSelection([M('M', 'docs/README.md')], new Map([...MODULES].filter(([path]) => ['apps/a/src/joins.ts', 'packages/p/src/prose.ts'].includes(path))));
    expect(plan.documents[0]!.readers).toEqual([]);
    expect(plan.related).toEqual([]);
  });

  it('runs every tier for a change the graph cannot bound, naming each trigger', () => {
    const triggers = ['package.json', 'apps/a/package.json', 'package-lock.json', '.npmrc', 'vitest.config.ts', 'vitest.tiers.ts', 'vitest.setup.ts',
      'packages/cap1-system/vitest.config.ts', 'tsconfig.json', 'packages/p/tsconfig.build.json', 'ci-selection.ts', 'ci-reader-inventory.ts', 'scripts/select_ci_tests.mjs',
      'scripts/run_ci_tier.mjs', 'scripts/check_unit_tmpdir.mjs', '.github/workflows/node-ci.yml',
      '.github/workflows/governance-docs.yml', '.github/workflows/generation-mutation-gate.yml'];
    for (const path of triggers) {
      const plan = planSelection([M('M', 'apps/a/src/trajectory.ts'), M('M', path)], MODULES);
      expect(plan, path).toMatchObject({ mode: 'full', code: [], documents: [], related: [] });
      expect(plan.reasons, path).toHaveLength(1);
      expect(plan.reasons[0], path).toMatch(new RegExp(`: ${path.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'u'));
    }
    expect(FULL_RUN_TRIGGERS.map(({ rule }) => rule)).toContain('workflow');
    expect(planSelection([M('R100', 'docs/former-workflow.yml', '.github/workflows/governance-docs.yml')], MODULES).reasons)
      .toEqual(['workflow: .github/workflows/governance-docs.yml']);
  });

  it('runs every tier when a workspace module is deleted or renamed, and only then', () => {
    expect(planSelection([M('D', 'apps/a/src/gone.ts')], MODULES).reasons).toEqual(['workspace module removed or renamed: apps/a/src/gone.ts']);
    expect(planSelection([M('R100', 'apps/a/src/new.ts', 'apps/a/src/old.ts')], MODULES).reasons).toEqual(['workspace module removed or renamed: apps/a/src/old.ts']);
    expect(planSelection([M('D', 'docs/old.md')], MODULES).mode).toBe('selected');
    expect(planSelection([M('A', 'apps/a/src/new.ts')], MODULES).mode).toBe('selected');
  });

  it('makes every guard that walks the changed module\'s workspace, or walks from the repository root, a reader', () => {
    const modules = new Map<string, string>([
      ['packages/s/src/purity.test.ts', "readdirSync(new URL('./', import.meta.url), { recursive: true });"],
      ['packages/t/src/other-walker.test.ts', "readdirSync(new URL('./', import.meta.url));"],
      ['apps/a/src/repo-guard.test.ts', "const ROOT = new URL('../../../', import.meta.url); execFileSync('git', ['ls-files']);"],
      ['apps/a/src/rooted-reader.test.ts', "readFileSync(new URL('../../../PROJECT-STATUS.md', import.meta.url));"],
      ['packages/s/src/lister.ts', 'export const list = (dir: string) => readdirSync(dir);'],
    ]);
    const plan = planSelection([M('A', 'packages/s/src/clock.ts')], modules);
    expect(plan.documents[0]!.readers).toEqual(['apps/a/src/repo-guard.test.ts', 'packages/s/src/purity.test.ts']);
    expect(plan.code).toEqual(['packages/s/src/clock.ts']);
  });

  it('hands a changed script module to the graph, and looks a renamed document up by both names', () => {
    expect(planSelection([M('M', 'scripts/derive.mjs')], MODULES).code).toEqual(['scripts/derive.mjs']);
    expect(planSelection([M('M', 'scripts/check.py')], MODULES).code).toEqual([]);
    const renamed = planSelection([M('R090', 'docs/NEW-NAME.md', '.syzygy/governance/decisions/AGENT-ADOPTIONS.md')], new Map([...MODULES].filter(([path]) => path === 'apps/a/src/adoptions.test.ts')));
    expect(renamed.documents[0]).toMatchObject({ tokens: ['AGENT-ADOPTIONS.md', 'NEW-NAME.md'], readers: ['apps/a/src/adoptions.test.ts'] });
  });

  it('selects nothing for an empty diff', () => {
    expect(planSelection([], MODULES)).toEqual({ mode: 'selected', reasons: [], code: [], documents: [], related: [] });
  });

  it('uses the exact full trigger or empty diff without reading the module inventory', () => {
    const unreadable = () => { throw new Error('unexpected module read'); };
    expect(select([M('M', '.github/workflows/synthetic.yml')], unreadable).reasons)
      .toEqual(['workflow: .github/workflows/synthetic.yml']);
    expect(select([], unreadable)).toMatchObject({ mode: 'selected', related: [] });
  });

  it('runs every tier when an otherwise selectable diff has no exact module inventory', () => {
    const change = [M('M', 'apps/a/src/trajectory.ts')];
    expect(select(change, () => undefined)).toEqual({
      mode: 'full', reasons: ['Tracked workspace modules could not be read exactly'], code: [], documents: [], related: [],
    });
    expect(select(change, () => MODULES).mode).toBe('selected');
  });
});

describe('its parts', () => {
  it('finds a path literal only between quotes, backticks or slashes', () => {
    expect(namesPath("join(ROOT, 'AGENT-ADOPTIONS.md')", 'AGENT-ADOPTIONS.md')).toBe(true);
    expect(namesPath('`decisions/AGENT-ADOPTIONS.md`', 'AGENT-ADOPTIONS.md')).toBe(true);
    expect(namesPath('"x/AGENT-ADOPTIONS.md/"', 'AGENT-ADOPTIONS.md')).toBe(true);
    expect(namesPath('see AGENT-ADOPTIONS.md here', 'AGENT-ADOPTIONS.md')).toBe(false);
    expect(namesPath("'AGENT-ADOPTIONSxmd'", 'AGENT-ADOPTIONS.md')).toBe(false);
  });

  it('names a path by its basename, and a workspace non-module also by its directory', () => {
    expect(readerTokens('docs/reviews/R-X-RAW.md')).toEqual(['R-X-RAW.md']);
    expect(readerTokens('PROJECT-STATUS.md')).toEqual(['PROJECT-STATUS.md']);
    expect(readerTokens('packages/p/src/model.ts')).toEqual(['model.ts']);
    expect(readerTokens('packages/p/src/fixtures/a.json')).toEqual(['a.json', 'fixtures']);
  });

  it('recognises the ways a module locates the repository', () => {
    for (const text of ["new URL('../../../', import.meta.url)", 'new URL("../..", import.meta.url)', 'process.cwd()', "['rev-parse', 'HEAD']", 'git rev-parse --show-toplevel']) {
      expect(ROOTED.test(text), text).toBe(true);
    }
    for (const text of ["join(HERE, '..')", "new URL('./x.ts', import.meta.url)", 'cwd'] as const) expect(ROOTED.test(text), text).toBe(false);
  });

  it('recognises a module that lists a directory', () => {
    for (const text of ['readdirSync(dir)', 'await readdir(dir)', 'opendirSync(dir)', 'globSync(pattern)', "['ls-files', '-z']"]) expect(WALKS.test(text), text).toBe(true);
    for (const text of ['readFileSync(path)', 'const readdirs = 1;', 'ls-files in prose']) expect(WALKS.test(text), text).toBe(false);
  });

  it('binds selection to the PR merge and its ordered distinct parents', () => {
    const base = 'a'.repeat(40);
    const head = 'b'.repeat(40);
    const merge = 'c'.repeat(40);
    const checkout = [merge, base, head];
    expect(matchesPullRequestCheckout(base, merge, checkout, base, head)).toBe(true);
    expect(matchesPullRequestCheckout(merge, merge, checkout, base, head)).toBe(false);
    expect(matchesPullRequestCheckout(base, head, checkout, base, head)).toBe(false);
    expect(matchesPullRequestCheckout(base, merge, [merge, head, base], base, head)).toBe(false);
    expect(matchesPullRequestCheckout(base, merge, [merge, base], base, head)).toBe(false);
    expect(matchesPullRequestCheckout(base, merge, [merge, base, head, 'd'.repeat(40)], base, head)).toBe(false);
    expect(matchesPullRequestCheckout(base, merge, checkout, base, undefined)).toBe(false);
    expect(matchesPullRequestCheckout(base, merge, [merge, base, base], base, base)).toBe(false);
    expect(matchesPullRequestCheckout(base, merge, [merge, base, 'HEAD'], base, 'HEAD')).toBe(false);
  });

  it('reads complete Git records without rewriting whitespace or Unicode', () => {
    const paths = ['M', ' a.ts', 'R087', 'old\tname.ts', 'new\nname-\u00e9.ts',
      'C100', 'source.md', 'copy.md', 'D', 'gone.md', ''];
    expect(parseNameStatus(new TextEncoder().encode(paths.join('\0')))).toEqual([
      { status: 'M', path: ' a.ts' },
      { status: 'R087', path: 'new\nname-\u00e9.ts', previous: 'old\tname.ts' },
      { status: 'C100', path: 'copy.md', previous: 'source.md' },
      { status: 'D', path: 'gone.md' },
    ]);
    expect(parseNameStatus(new Uint8Array())).toEqual([]);
  });

  it('preserves every listed pathname and refuses ambiguous inventory bytes', () => {
    const paths = ['first\u00e9.ts', ' \tsecond\n.ts'];
    const encoder = new TextEncoder();
    expect(parseGitPathList(encoder.encode(`${paths.join('\0')}\0`))).toEqual(paths);
    expect(parseGitPathList(new Uint8Array())).toEqual([]);
    expect(() => parseGitPathList(encoder.encode('unterminated.ts'))).toThrow();
    expect(() => parseGitPathList(encoder.encode('extra.ts\0\0'))).toThrow();
    expect(() => parseGitPathList(Uint8Array.of(0xff, 0))).toThrow();
  });

  it('refuses malformed or unrepresentable Git records', () => {
    for (const record of ['M', 'M\0a.ts', 'M\0\0', 'R099\0old.ts\0', 'C101\0old.md\0new.md\0', '?\0a.ts\0']) {
      expect(() => parseNameStatus(new TextEncoder().encode(record))).toThrow(/unreadable Git (?:path|name-status)/u);
    }
    expect(() => parseNameStatus(Uint8Array.of(77, 0, 0xff, 0))).toThrow();
  });
});


describe('tracked dossier corpus reader inputs', () => {
  const reader = 'packages/polaris-dossier/src/corpus.test.ts';
  const costs = 'docs/evidence/pursuit-2026-11-21b/measure-now.json';
  const references = '.claude/skills/polaris-dossier/references';
  const trackedReader = `import { mechanismVersion } from './corpus.js';
    import * as fs from 'node:fs';
    import * as path from 'node:path';
    import { fileURLToPath } from 'node:url';
    const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const MANIFEST = '${DOSSIER_CORPUS_MANIFEST}';
    const COSTS = '${costs}';
    const readJson = (file: string): Json => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')) as Json;
    const checkoutTree: MechanismTree = { list: (dir) => fs.readdirSync(path.join(ROOT, dir)), read: (file) => fs.readFileSync(path.join(ROOT, file)) };
    readJson(MANIFEST);
    readJson(COSTS);`;
  const manifest = {
    format: 'polaris-dossier-corpus/1',
    mechanismVersion: {
      format: 'polaris-dossier-mechanism/1',
      members: [{ group: 'agent-texts', path: `${references}/*.md` }, { group: 'agent-texts', path: 'docs/direct-only.md' }],
      excludeSuffixes: ['.draft.md'],
    },
  };
  const withInventory = (
    changed: readonly ChangedPath[],
    modules: ReadonlyMap<string, string> = new Map([[reader, trackedReader]]),
    declaration: unknown = manifest,
  ) => select(changed, () => modules, (sources) => dossierCorpusReaders(sources, declaration));
  const fullReason = (path: string) => `tracked test reader (${reader}): ${path}`;

  it('runs full for direct inputs and every matching member, including a newly tracked path', () => {
    for (const path of [DOSSIER_CORPUS_MANIFEST, costs, 'docs/direct-only.md', `${references}/new-reference.md`]) {
      expect(withInventory([M('A', path)]), path).toMatchObject({ mode: 'full', reasons: [fullReason(path)] });
    }
  });

  it('matches both change names and a deletion, while keeping the same basename elsewhere and excluded suffixes narrow', () => {
    const prior = `${references}/only.md`;
    expect(withInventory([M('R100', 'docs/former-reference.md', prior)]).reasons).toEqual([fullReason(prior)]);
    expect(withInventory([M('D', prior)]).reasons).toEqual([fullReason(prior)]);
    for (const path of [prior.replace('.claude/', '.codex/'), `${references}/nested/only.md`, `${references}/ignored.draft.md`]) {
      expect(withInventory([M('M', path)]).mode, path).toBe('selected');
    }
  });

  it('names a newly tracked related reader and refuses changed direct paths or an unresolved reader call', () => {
    const changed = [M('M', 'docs/unrelated.md')];
    const newReader = 'packages/polaris-dossier/src/extra-reader.test.ts';
    const modules = new Map([[reader, trackedReader], [newReader, "import { mechanismVersion as version } from './corpus.js'; version(manifest, tree);"]]);
    expect(withInventory(changed, modules).reasons).toEqual([`Unregistered dossier corpus test reader: ${newReader}`]);
    modules.set(newReader, "import type { MechanismTree } from './corpus.js';");
    expect(withInventory(changed, modules).mode).toBe('selected');
    for (const input of ["'docs/unlisted.md'", 'fromEnvironment()']) {
      const drifted = new Map([[reader, `${trackedReader} readJson(${input});`]]);
      expect(withInventory(changed, drifted).reasons).toEqual([`Tracked dossier corpus test reader inputs drifted: ${reader}`]);
    }
  });

  it('refuses shadowed audited bindings and preserves unrelated local names', () => {
    const changed = [M('M', 'docs/unrelated.md')];
    for (const scope of [
      "{ const MANIFEST = join('docs', 'fixture.json'); readJson(MANIFEST); }",
      "function inspect(MANIFEST) { readJson(MANIFEST); }",
      "{ const { MANIFEST } = fixture; readJson(MANIFEST); }",
      "{ const readJson = anotherReader; readJson(MANIFEST); }",
    ]) {
      expect(withInventory(changed, new Map([[reader, trackedReader + scope]])).reasons, scope)
        .toEqual([`Tracked dossier corpus test reader inputs drifted: ${reader}`]);
    }
    const ordinary = "{ const local = 'x'; use(local); readJson(MANIFEST); }";
    expect(withInventory(changed, new Map([[reader, trackedReader + ordinary]])).mode).toBe('selected');
  });

  it('refuses alternate read paths while preserving comments and spacing in the reviewed adapter', () => {
    const changed = [M('M', 'docs/unrelated.md')];
    for (const [before, after] of [
      ["path.join(ROOT, file), 'utf8'", "path.join(ROOT, file === COSTS ? 'docs/other.json' : file), 'utf8'"],
      ["'../../..'", "'../..'"],
      ['fs.readdirSync(path.join(ROOT, dir))', 'fs.readdirSync(path.join(ROOT, alternative(dir)))'],
      ["from 'node:fs'", "from './other-filesystem.js'"],
    ] as const) {
      const source = trackedReader.replace(before, after);
      expect(source).not.toBe(trackedReader);
      expect(withInventory(changed, new Map([[reader, source]])).reasons, after)
        .toEqual([`Tracked dossier corpus test reader inputs drifted: ${reader}`]);
    }
    const whitespace = trackedReader.replace('path.join(ROOT, file)', 'path.join( ROOT, /* repo-relative */ file )');
    expect(withInventory(changed, new Map([[reader, whitespace]])).mode).toBe('selected');
  });

  it('names a malformed declaration or an absent known consumer rather than choosing a narrow plan', () => {
    const changed = [M('M', 'docs/other.md')];
    const badMechanism = { ...manifest.mechanismVersion, members: [{ group: 'agent-texts', path: 'docs/*/outside.md' }] };
    expect(withInventory(changed, undefined, { ...manifest, mechanismVersion: badMechanism }).reasons)
      .toEqual(['Tracked dossier corpus reader manifest could not be read exactly']);
    expect(withInventory(changed, new Map()).reasons).toEqual([`Tracked dossier corpus test reader inputs drifted: ${reader}`]);
  });
});

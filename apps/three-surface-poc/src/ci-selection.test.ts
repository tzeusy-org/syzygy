import { describe, expect, it } from 'vitest';
import { FULL_RUN_TRIGGERS, ROOTED, namesPath, parseNameStatus, planSelection, readerTokens, type ChangedPath } from '../../../ci-selection.js';

// syzygy-qu5j: which tests a pull request runs. The module graph itself is Vitest's; these pin the plan handed to it.
const M = (status: string, path: string, previous?: string): ChangedPath => (previous === undefined ? { status, path } : { status, path, previous });
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
      'packages/cap1-system/vitest.config.ts', 'tsconfig.json', 'packages/p/tsconfig.build.json', 'ci-selection.ts', 'scripts/select_ci_tests.mjs',
      'scripts/run_ci_tier.mjs', 'scripts/check_unit_tmpdir.mjs', '.github/workflows/node-ci.yml'];
    for (const path of triggers) {
      const plan = planSelection([M('M', 'apps/a/src/trajectory.ts'), M('M', path)], MODULES);
      expect(plan, path).toMatchObject({ mode: 'full', code: [], documents: [], related: [] });
      expect(plan.reasons, path).toHaveLength(1);
      expect(plan.reasons[0], path).toMatch(new RegExp(`: ${path.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'u'));
    }
    expect(FULL_RUN_TRIGGERS.map(({ rule }) => rule)).toContain('workflow');
  });

  it('runs every tier when a workspace module is deleted or renamed, and only then', () => {
    expect(planSelection([M('D', 'apps/a/src/gone.ts')], MODULES).reasons).toEqual(['workspace module removed or renamed: apps/a/src/gone.ts']);
    expect(planSelection([M('R100', 'apps/a/src/new.ts', 'apps/a/src/old.ts')], MODULES).reasons).toEqual(['workspace module removed or renamed: apps/a/src/old.ts']);
    expect(planSelection([M('D', 'docs/old.md')], MODULES).mode).toBe('selected');
    expect(planSelection([M('A', 'apps/a/src/new.ts')], MODULES).mode).toBe('selected');
  });

  it('selects nothing for an empty diff', () => {
    expect(planSelection([], MODULES)).toEqual({ mode: 'selected', reasons: [], code: [], documents: [], related: [] });
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

  it('reads git name-status rows, renames with both paths', () => {
    expect(parseNameStatus('M\ta.ts\nR087\told.ts\tnew.ts\nD\tgone.md\n')).toEqual([
      { status: 'M', path: 'a.ts' }, { status: 'R087', path: 'new.ts', previous: 'old.ts' }, { status: 'D', path: 'gone.md' },
    ]);
    expect(() => parseNameStatus('M')).toThrow(/unreadable name-status row/u);
  });
});

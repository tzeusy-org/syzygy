import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import { buildDossierScreen, screenLoaderOf, type DossierScreen } from './screen.js';

// syzygy-3efd.69: the dossier's screen under the declared-source policy 3.0.0 (REQ-polaris-generation-046 from specification version
// 2.13, adoption row A-42): version 2.0.0 with 44 Stage-2 entries re-admitted. Expected outcomes are literals written from the policy
// text, path by path and body by body. Version 2.0.0's outcomes over the preservation tree are written as literals too, from its text,
// and cross-checked against a run of the version-2.0.0 screen, as the requirement's oracle says. Planted values are fake and assembled
// from pieces, as the other detector tests write theirs.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const V2 = readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json'), 'utf8');
const V3 = readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json'), 'utf8');
const V4 = readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json'), 'utf8');
const SUBJECT = { repository: 'repository:o-r', commit: 'a'.repeat(40) };
const screenOf = (text: string, visibility: 'public' | 'private' = 'public'): DossierScreen => {
  const load = buildDossierScreen(new TextEncoder().encode(text), true, SUBJECT, visibility);
  if (!load.ok) throw new Error(load.why);
  return load.screen;
};
const outcomeOf = (screen: DossierScreen, repositoryPath: string): string => screen.screenPath(repositoryPath) ?? `${screen.contentClass(repositoryPath)}/${screen.stageOf(repositoryPath)}`;
const INDETERMINATE = 'unknown-extraction-class';

// Each re-admitted entry, the list that holds it, and a path it places.
const READMITTED: readonly (readonly [string, string, string, string])[] = [
  // [list, entry, an admitted path, its outcome under 3.0.0]
  ['governanceTextExtensions', '.mdx', 'design/storage.mdx', 'governance-text/2'],
  ['governanceTextExtensions', '.adoc', 'design/storage.adoc', 'governance-text/2'],
  ['governanceTextExtensions', '.asciidoc', 'design/storage.asciidoc', 'governance-text/2'],
  ['proseExtensions', '.adoc', 'packages/api/docs/guide.adoc', 'project-documentation/2'],
  ['proseExtensions', '.asciidoc', 'packages/api/docs/guide.asciidoc', 'project-documentation/2'],
  ...['.hcl', '.proto', '.cmake', '.mk', '.Dockerfile'].map(e => ['configurationExtensions', e, `src/app/main${e}`, 'code-content/2'] as const),
  ...['.cxx', '.hxx', '.scala', '.sc', '.kts', '.groovy', '.gradle', '.clj', '.cljs', '.cljc', '.ex', '.exs', '.erl', '.hrl', '.hs', '.ml', '.mli',
    '.fs', '.fsx', '.dart', '.R', '.jl', '.m', '.mm', '.pl', '.pm', '.ps1', '.psm1', '.zig', '.nim', '.elm']
    .map(e => ['languageExtensions', e, `src/app/main${e}`, 'code-content/2'] as const),
  ['sourceFileNames', 'Containerfile', 'tools/Containerfile', 'code-content/2'],
  ['sourceFileNames', 'CMakeLists.txt', 'src/CMakeLists.txt', 'code-content/2'],
  ['sourceFileNamePrefixes', 'Containerfile.', 'tools/Containerfile.dev', 'code-content/2'],
];

// The same entry beside a refused word or stem, and below a vendored directory: both stay indeterminate.
const refusedOf = (list: string, entry: string): string =>
  list === 'governanceTextExtensions' ? `design/security${entry}`
    : list === 'proseExtensions' ? `packages/api/security/guide${entry}`
      : list === 'sourceFileNames' ? `audit/${entry}`
        : list === 'sourceFileNamePrefixes' ? `audit/${entry}dev`
          : `src/app/audit${entry}`;
const vendoredOf = (list: string, entry: string): string =>
  list === 'sourceFileNamePrefixes' ? `vendor/x/${entry}dev` : list === 'sourceFileNames' ? `vendor/x/${entry}` : `third_party/x/main${entry}`;

// The entries the census shows reaching no path, left out of 3.0.0: each stays indeterminate.
const LEFT_OUT: readonly (readonly [string, string])[] = [
  ['.mak', 'src/app/rules.mak'], ['.dockerfile', 'src/app/build.dockerfile'], ['.hh', 'src/app/main.hh'], ['.cts', 'src/app/main.cts'],
  ['.r', 'src/app/main.r'], ['.vb', 'src/app/main.vb'], ['makefile', 'src/makefile'], ['GNUmakefile', 'src/GNUmakefile'],
  ['docTreeRootsAnyDepth docs', 'pkg/docs/notes.txt'], ['docTreeRootsAnyDepth doc', 'pkg/doc/notes.txt'],
  ['docTreeRootsAnyDepth documentation', 'pkg/documentation/notes.txt'],
];

describe('the re-admission screen 3.0.0', () => {
  let screen: DossierScreen;
  let reach: DossierScreen;
  beforeAll(() => { screen = screenOf(V3); reach = screenOf(V2); });

  it('binds version 3.0.0 with version 2.0.0\'s two stages, detectors and refusal lists', () => {
    expect([screen.policyVersion, screen.twoStage, screen.configurationDetectors, screen.scopeDetectors, screen.governanceText, screen.documentationExemption])
      .toEqual(['dossier-declared-source/3.0.0', true, 6, 4, true, true]);
    expect(READMITTED.length).toBe(44);
  });

  it.each(READMITTED)('%s %s places its path at Stage 2; version 2.0.0 left it indeterminate', (_list, _entry, admitted, outcome) => {
    expect([outcomeOf(screen, admitted), outcomeOf(reach, admitted)]).toEqual([outcome, INDETERMINATE]);
  });

  it.each(READMITTED)('%s %s beside a refused word or stem, or below a vendored directory, stays indeterminate', (list, entry) => {
    expect([outcomeOf(screen, refusedOf(list, entry)), outcomeOf(screen, vendoredOf(list, entry))]).toEqual([INDETERMINATE, INDETERMINATE]);
  });

  it.each(LEFT_OUT)('%s, left out, stays indeterminate', (_entry, p) => {
    expect([outcomeOf(screen, p), outcomeOf(reach, p)]).toEqual([INDETERMINATE, INDETERMINATE]);
  });

  it('a re-admitted body is a Stage-2 body: scanned for active content with no exemption, and admitted when inert', () => {
    expect(screen.screenTargetBody('object Main { def main(args: Array[String]): Unit = if (1 < 2) println("x") }\n', 'src/app/Main.scala')).toEqual({ kind: 'admitted' });
    expect(screen.screenTargetBody('Future<void> main() async {}\n', 'src/app/main.dart')).toEqual({ kind: 'excluded', outcome: 'active-content' });
    expect(screen.screenTargetBody('= Storage\n\nWe chose it.\n', 'design/storage.adoc')).toEqual({ kind: 'admitted' });
    expect(screen.screenTargetBody('# Guide\n\n<div>x</div>\n', 'design/storage.mdx')).toEqual({ kind: 'excluded', outcome: 'active-content' });
  });
});

// Each configuration detector's form, planted in each re-admitted configuration format as the spec's Case defines it.
const PW = ['pass', 'word'].join('');
const VALUE = ['hunter2', 'hunter2'].join('');
const LONG = ['abcdef', '0123456789'].join('');
const DETECTOR_FORMS: readonly (readonly [string, string])[] = [
  ['config-credential-key', `db_${PW}: ${LONG}\n`],
  ['kubernetes-secret-kind', 'kind: Secret\n'],
  ['hcl-secret-variable-default', `variable "db_${PW}" {\n  default = "${VALUE}"\n}\n`],
  ['dockerfile-secret-env', `ENV DB_${PW.toUpperCase()} ${LONG}\n`],
  ['netrc-machine-password', `machine example.invalid login u ${PW} ${VALUE}\n`],
  ['authorization-header-credential', `Authorization: Bearer ${LONG}\n`],
];
const CONFIGURATION_FORMATS: readonly string[] = [
  'infra/main.hcl', 'api/service.proto', 'cmake/deps.cmake', 'build/rules.mk', 'images/app.Dockerfile', 'tools/Containerfile', 'src/CMakeLists.txt',
  'tools/Containerfile.dev', 'app/build.gradle', 'app/build.gradle.kts',
];

describe.each(['public', 'private'] as const)('configuration detectors under %s visibility', visibility => {
  let screen: DossierScreen;
  beforeAll(() => { screen = screenOf(V3, visibility); });
  it.each(CONFIGURATION_FORMATS)('in %s, each detector form excludes the body whole, and an inert body is admitted', format => {
    expect(outcomeOf(screen, format)).toBe('code-content/2');
    expect(DETECTOR_FORMS.map(([id, body]) => [id, screen.screenTargetBody(`# build\n${body}# end\n`, format)]))
      .toEqual(DETECTOR_FORMS.map(([id]) => [id, { kind: 'excluded', outcome: 'secret-detector-match' }]));
    expect(screen.screenTargetBody('# build\nname = "app"\n', format)).toEqual({ kind: 'admitted' });
  });
});

// One preservation tree: every path version 2.0.0 places keeps its class and stage, every denied path stays denied, every body keeps its
// outcome; only paths version 2.0.0 leaves indeterminate may change, and only to a re-admitted entry's class.
const TREE: readonly (readonly [string, string, string])[] = [
  // [path, version 2.0.0's outcome, version 3.0.0's outcome]
  ['README.md', 'project-documentation/1', 'project-documentation/1'],
  ['docs/guide.md', 'project-documentation/1', 'project-documentation/1'],
  ['src/a.c', 'code-content/1', 'code-content/1'],
  ['src/app/main.py', 'code-content/1', 'code-content/1'],
  ['Dockerfile', 'code-content/2', 'code-content/2'],
  ['Makefile', 'code-content/2', 'code-content/2'],
  ['outputs.tf', 'code-content/2', 'code-content/2'],
  ['config/app.json', 'code-content/2', 'code-content/2'],
  ['Cargo.toml', 'code-content/2', 'code-content/2'],
  ['src/app/main.mts', 'code-content/2', 'code-content/2'],
  ['design/storage.rst', 'governance-text/2', 'governance-text/2'],
  ['ARCHITECTURE.md', 'governance-text/2', 'governance-text/2'],
  ['docs/adr/0001-use-postgres.md', 'governance-text/2', 'governance-text/2'],
  ['packages/api/README.md', 'project-documentation/2', 'project-documentation/2'],
  ['packages/api/docs/guide.md', 'project-documentation/2', 'project-documentation/2'],
  ['packages/api/docs/guide.mdx', 'project-documentation/2', 'project-documentation/2'],
  ['.env', 'denied-path', 'denied-path'],
  ['.ssh/id_rsa', 'denied-path', 'denied-path'],
  ['GOVERNANCE.md', INDETERMINATE, INDETERMINATE],
  ['reports/q3-audit.md', INDETERMINATE, INDETERMINATE],
  ['notebooks/intro.ipynb', INDETERMINATE, INDETERMINATE],
  ['vendor/k8s/deploy.yaml', INDETERMINATE, INDETERMINATE],
  ['test-output.json', INDETERMINATE, INDETERMINATE],
  ['src/app/main.scala', INDETERMINATE, 'code-content/2'],
  ['infra/main.hcl', INDETERMINATE, 'code-content/2'],
  ['design/storage.adoc', INDETERMINATE, 'governance-text/2'],
  ['packages/api/docs/guide.adoc', INDETERMINATE, 'project-documentation/2'],
  ['src/app/main.vb', INDETERMINATE, INDETERMINATE],
];
const BODIES: readonly (readonly [string, string, string])[] = [
  // [path, body, the outcome under both versions]
  ['config/app.json', `{"${PW}": "${VALUE}"}\n`, 'secret-detector-match'],
  ['config/app.json', '{"a": "<b>x</b>"}\n', 'active-content'],
  ['src/a.c', 'int f(int a, int b) { return a<b && b>a; }\n', 'admitted'],
  ['design/storage.rst', 'Use Postgres\n============\n\nWe chose it.\n', 'admitted'],
  ['packages/api/README.md', '# API\n\n<img src="badge.svg" alt="build">\n', 'active-content'],
  ['README.md', '# API\n\n<img src="badge.svg" alt="build">\n', 'admitted'],
];

describe('version 2.0.0 outcomes preserved', () => {
  let screen: DossierScreen;
  let reach: DossierScreen;
  beforeAll(() => { screen = screenOf(V3); reach = screenOf(V2); });
  const kindOf = (s: DossierScreen, p: string, body: string): string => {
    const out = s.screenTargetBody(body, p);
    return out.kind === 'excluded' ? out.outcome : out.kind;
  };

  it('the literals written for version 2.0.0 agree with a run of the version-2.0.0 screen', () => {
    expect(TREE.map(([p]) => [p, outcomeOf(reach, p)])).toEqual(TREE.map(([p, before]) => [p, before]));
    expect(BODIES.map(([p, body]) => [p, kindOf(reach, p, body)])).toEqual(BODIES.map(([p, , out]) => [p, out]));
  });

  it('every path keeps version 2.0.0\'s outcome under 3.0.0 unless 2.0.0 left it indeterminate', () => {
    expect(TREE.map(([p]) => [p, outcomeOf(screen, p)])).toEqual(TREE.map(([p, , after]) => [p, after]));
    for (const [p, before, after] of TREE) if (before !== INDETERMINATE) expect([p, after]).toEqual([p, before]);
    expect(BODIES.map(([p, body]) => [p, kindOf(screen, p, body)])).toEqual(BODIES.map(([p, , out]) => [p, out]));
  });
});

describe('version 4.0.0 preserves the checked screening predicates', () => {
  it('pins the adopted disclosure text to its policy version', () => {
    const earlier = JSON.parse(V3), current = JSON.parse(V4);
    const earlierText = earlier.publicSourceScope.sourceVisibility.agentSessions;
    earlier.publicSourceScope.sourceVisibility.agentSessions = current.publicSourceScope.sourceVisibility.agentSessions;
    current.publicSourceScope.sourceVisibility.agentSessions = earlierText;
    for (const mixed of [earlier, current]) {
      const built = buildDossierScreen(new TextEncoder().encode(JSON.stringify(mixed)), true, SUBJECT, 'private');
      expect(built).toEqual({ ok: false, why: 'the screening policy cannot be applied: its source visibility agentSessions is not the text this screen implements' });
    }
  });

  it('changes the version, predecessor entry and only the two raw-activity descriptions', () => {
    const predecessor = JSON.parse(V3), successor = JSON.parse(V4);
    expect(successor.policyVersion).toBe('dossier-declared-source/4.0.0');
    successor.policyVersion = predecessor.policyVersion;
    successor.successor.predecessor = predecessor.successor.predecessor;
    successor.publicSourceScope.rawBodyHandling.rule = predecessor.publicSourceScope.rawBodyHandling.rule;
    successor.publicSourceScope.sourceVisibility.agentSessions = predecessor.publicSourceScope.sourceVisibility.agentSessions;
    expect(successor).toEqual(predecessor);
  });

  it.each(['public', 'private'] as const)('keeps the same path and body outcomes under %s visibility', visibility => {
    const screen = screenOf(V4, visibility);
    expect(TREE.map(([p]) => [p, outcomeOf(screen, p)])).toEqual(TREE.map(([p, , outcome]) => [p, outcome]));
    for (const [p, body, outcome] of BODIES) {
      const result = screen.screenTargetBody(body, p);
      expect(result.kind === 'excluded' ? result.outcome : result.kind, p).toBe(outcome);
    }
  });
});

describe('the step screen loader when a run cannot verify its bound policy', () => {
  const RESTART = (bound: string, version: string): string => `this run is bound to the screening policy ${bound} (${version}), which can no longer be read as its binding (the applied screen differs from the policy bytes bound to this run); `
    + 'a run is never re-screened under another version or moved to it, so start a new run, which binds .syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json (dossier-declared-source/4.0.0)';
  it.each([
    ['.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json', 'dossier-declared-source/4.0.0'],
    ['.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json', 'dossier-declared-source/3.0.0'],
    ['.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json', 'dossier-declared-source/2.0.0'],
    ['.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json', 'dossier-declared-source/1.0.0'],
  ])('bound to %s, refuses with the restart explanation', async (bound, version) => {
    const loader = screenLoaderOf(async () => ({ ok: true, screen: screenOf(V3) }), '/nonexistent', 0);
    expect(await loader({ ...SUBJECT, policyPath: bound, policySha256: 'f'.repeat(64) })).toEqual({ ok: false, why: RESTART(bound, version) });
  });
});

// The scenario "Re-admitted formats placed as code-content and screened", path by path and body by body, and the prefix rule's
// documentation exclusion (prefixExcludedExtensions): a Containerfile. name ending in a documentation extension is never placed by the
// prefix, so it is documentation, never code-content.
describe.each(['public', 'private'] as const)('the re-admission scenario under %s visibility', visibility => {
  let screen: DossierScreen;
  beforeAll(() => { screen = screenOf(V3, visibility); });
  it('the twelve are code-content at Stage 2, and the seven stay indeterminate', () => {
    const twelve = ['CMakeLists.txt', 'cmake/FindFoo.cmake', 'terragrunt.hcl', 'api/v1/service.proto', 'build.gradle.kts', 'src/main/scala/App.scala',
      'lib/app.ex', 'R/plot.R', 'src/main.zig', 'erlang.mk', 'Containerfile', 'Containerfile.fedora'];
    expect(twelve.map(p => [p, outcomeOf(screen, p)])).toEqual(twelve.map(p => [p, 'code-content/2']));
    const seven = ['build.mak', 'src/App.vb', 'R/plot.r', 'makefile', 'GNUmakefile', 'vendor/x/main.hcl', 'reports/results.scala'];
    expect(seven.map(p => [p, outcomeOf(screen, p)])).toEqual(seven.map(p => [p, INDETERMINATE]));
  });
  it('the HCL variable default and the Gradle key = "value" assignment are excluded whole, never retained as redacted-span', () => {
    expect(screen.screenTargetBody(`variable "db_${PW}" {\n  default = "${VALUE}"\n}\n`, 'infra/backend.hcl'))
      .toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
    expect(screen.screenTargetBody(`android {\n  ${PW} = "${VALUE}"\n}\n`, 'app/build.gradle')).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
    expect(screen.screenTargetBody('android {\n  namespace = "com.example.app"\n}\n', 'app/build.gradle')).toEqual({ kind: 'admitted' });
  });
  it('a Containerfile. name ending in a documentation extension is documentation, never code-content', () => {
    expect(['Containerfile.md', 'images/Containerfile.adoc', 'Containerfile.dev'].map(p => [p, outcomeOf(screen, p)]))
      .toEqual([['Containerfile.md', 'project-documentation/2'], ['images/Containerfile.adoc', 'project-documentation/2'], ['Containerfile.dev', 'code-content/2']]);
  });
});

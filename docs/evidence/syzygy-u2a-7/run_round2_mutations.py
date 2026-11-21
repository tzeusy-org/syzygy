"""Rule-6 mutants for the syzygy-u2a.7 round-2 repairs (owner answer pr585-round3).

Each mutant replaces exactly one occurrence of `old` with `new` in `file`, runs each listed vitest file in its tier,
then restores the file. A mutant is killed when every listed run exits non-zero. The record stores the literal
fragments, the commit, and the sha256 of every subject and test file, so it can be replayed from the record alone.

Run from the repository root with a clean tree: python3 docs/evidence/syzygy-u2a-7/run_round2_mutations.py <out.json>
"""
import hashlib, json, subprocess, sys

LINKS = 'packages/cap1-daemon/src/readme-links.ts'
SNAPSHOT = 'packages/cap1-daemon/src/source-snapshot.ts'
PIPELINE = 'packages/cap1-daemon/src/pipeline.ts'
HUMAN = 'packages/cap1-daemon/src/routes-human.ts'
LINKS_TEST = ('unit', 'packages/cap1-daemon/src/readme-links.test.ts')
SNAPSHOT_TEST = ('unit', 'packages/cap1-daemon/src/source-snapshot.test.ts')
MACHINE_TEST = ('integration', 'packages/cap1-daemon/src/routes-machine.test.ts')

MUTANTS = [
    # N2: Unicode white space at an end is a hazard.
    ('C1-edge-space-not-a-hazard', 'N2', LINKS,
     "  if (CONTROL.test(href) || EDGE_SPACE.test(href) || href.includes('\\\\')) return true;",
     "  if (CONTROL.test(href) || href.includes('\\\\')) return true;", [LINKS_TEST]),
    # N1/N3: a backslash is a hazard.
    ('C2-backslash-not-a-hazard', 'N1', LINKS,
     "  if (CONTROL.test(href) || EDGE_SPACE.test(href) || href.includes('\\\\')) return true;",
     "  if (CONTROL.test(href) || EDGE_SPACE.test(href)) return true;", [LINKS_TEST]),
    # N2: a trimming renderer's reading is one of the hazard readings.
    ('C3-no-trimmed-reading', 'N2', LINKS,
     "    for (const edges of [controls, controls.trim()]) {",
     "    for (const edges of [controls]) {", [LINKS_TEST]),
    # Dialect: a root-relative href is repository-root relative.
    ('C4-root-relative-off', 'N3', LINKS,
     "  const rooted = rest.startsWith('/');",
     "  const rooted = false;", [LINKS_TEST]),
    # Climb detection needs both sentinel roots.
    ('C5-one-sentinel-root', 'N3', LINKS,
     "  if (a.pathname.startsWith(rootA) && b.pathname.startsWith(rootB)) {",
     "  if (a.pathname.startsWith(rootA)) {", [LINKS_TEST]),
    # Relative-versus-absolute needs both sentinel hosts.
    ('C6-one-sentinel-host', 'N3', LINKS,
     "  if (first.host !== SENTINEL_HOSTS[0] || second.host !== SENTINEL_HOSTS[1]) {",
     "  if (first.host !== SENTINEL_HOSTS[0]) {", [LINKS_TEST]),
    # N3: the base's own scheme then a path is relative (https:path, https:/path).
    ('C7-same-scheme-prefix-kept', 'N3', LINKS,
     "    leadingScheme !== null && `${(leadingScheme[1] as string).toLowerCase()}:` === scheme",
     "    false && leadingScheme !== null && `${(leadingScheme[1] as string).toLowerCase()}:` === scheme", [LINKS_TEST]),
    # N2: only what the URL parser strips at the ends is stripped before the hazard screen.
    ('C8-no-parser-edge-strip', 'N2', LINKS,
     "  const href = rawHref.replace(URL_EDGE, '');",
     "  const href = rawHref;", [LINKS_TEST]),
    # An href the parser refuses that ends in the entry is never no.
    ('C9-unresolvable-is-other', 'N3', LINKS,
     "      return readingNamesEntry(href, scheme) ? AMBIGUOUS : OTHER;",
     "      return OTHER;", [LINKS_TEST]),
    # An escape run that is not UTF-8 is a hazard.
    ('C10-invalid-utf8-not-a-hazard', 'N3', LINKS,
     "      decodeURIComponent(run);\n    } catch {\n      return true;",
     "      decodeURIComponent(run);\n    } catch {\n      return false;", [LINKS_TEST]),
    # An encoded separator or a bare percent is a hazard.
    ('C11-percent-hazards-off', 'N3', LINKS,
     "  if (/%(?:2f|5c)/i.test(path) || /%(?![0-9A-Fa-f]{2})/.test(path)) return true;",
     "", [LINKS_TEST]),
    # N4: the not-read reason names the declaration's state.
    ('S1-invalid-folded-into-undeclared', 'N4', SNAPSHOT,
     "      if (!declaration.result.ok) return 'declaration-invalid';",
     "      if (!declaration.result.ok) return 'undeclared-governance-root';", [SNAPSHOT_TEST]),
    ('S2-unreadable-folded-into-missing', 'N4', SNAPSHOT,
     "      return 'declaration-unreadable';",
     "      return 'declaration-missing';", [SNAPSHOT_TEST]),
    # N5: no admitted declaration is #1 missing-declaration, not #6.
    ('P1-undeclared-reason-unconsented', 'N5', PIPELINE,
     "      return { state: 'not-read', reason, label: 'Unknown', unknownReason: MISSING_DECLARATION };",
     "      return { state: 'not-read', reason, label: 'Unknown', unknownReason: UNCONSENTED } as never;", [SNAPSHOT_TEST]),
    ('P2-unreadable-reason-missing-declaration', 'N5', PIPELINE,
     "      return { state: 'not-read', reason, label: 'Unknown', unknownReason: UNCAPTURED };",
     "      return { state: 'not-read', reason, label: 'Unknown', unknownReason: MISSING_DECLARATION } as never;", [SNAPSHOT_TEST]),
    # CAP1-REQ-012: the unconsented entry carries its resolution route on both channels.
    ('P3-machine-route-dropped', 'REQ-012', PIPELINE,
     "        resolutionRoute: UNCONSENTED_RESOLUTION_ROUTE,\n",
     "", [SNAPSHOT_TEST, MACHINE_TEST]),
    ('H1-human-route-dropped', 'REQ-012', HUMAN,
     "    read.reason === 'unconsented-governance-root'\n      ?",
     "    false\n      ?", [SNAPSHOT_TEST, MACHINE_TEST]),
    # N4: each cause says only its own state.
    ('H2-invalid-cause-says-missing', 'N4', HUMAN,
     "  'declaration-invalid': 'the project declaration failed validation, so no governance root is admitted',",
     "  'declaration-invalid': 'the project declaration is missing, so no governance root is declared',", [SNAPSHOT_TEST]),
    # F7 canary: a version test that reads only the root (main hoists parse5@8.1.0 there) must fail.
    ('F1-version-test-reads-root-only', 'F7', LINKS_TEST[1],
     "      const nested = lock.packages[`packages/cap1-daemon/node_modules/${name}`];\n"
     "      expect((nested ?? lock.packages[`node_modules/${name}`])?.version).toBe(pinned);\n"
     "      const installed = exists(`../node_modules/${name}/package.json`)\n"
     "        ? `../node_modules/${name}/package.json`\n"
     "        : `../../../node_modules/${name}/package.json`;\n"
     "      expect(installed === `../node_modules/${name}/package.json`).toBe(nested !== undefined);\n",
     "      expect(lock.packages[`node_modules/${name}`]?.version).toBe(pinned);\n"
     "      const installed = `../../../node_modules/${name}/package.json`;\n", [LINKS_TEST]),
]

DIGESTED = sorted({m[2] for m in MUTANTS} | {t[1] for m in MUTANTS for t in m[5]})


def sha(path: str) -> str:
    return 'sha256:' + hashlib.sha256(open(path, 'rb').read()).hexdigest()


def main() -> None:
    if subprocess.run(['git', 'status', '--porcelain', '--', 'packages'], capture_output=True, text=True).stdout:
        sys.exit('packages/ has uncommitted changes; commit first so the record names the bytes it ran on')
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    digests = {path: sha(path) for path in DIGESTED}
    results = []
    for ident, finding, path, old, new, tests in MUTANTS:
        original = open(path, encoding='utf-8').read()
        assert original.count(old) == 1, ident
        open(path, 'w', encoding='utf-8').write(original.replace(old, new))
        exits = {}
        try:
            for tier, test in tests:
                run = subprocess.run(['npx', 'vitest', 'run', '--project', tier, test], capture_output=True, text=True)
                exits[f'{tier}:{test}'] = run.returncode
        finally:
            open(path, 'w', encoding='utf-8').write(original)
        killed = all(code != 0 for code in exits.values())
        results.append({'id': ident, 'finding': finding, 'file': path, 'old': old, 'new': new,
                        'exitCodes': exits, 'outcome': 'killed' if killed else 'survived'})
        print(ident, 'killed' if killed else 'SURVIVED', exits, flush=True)
    assert {path: sha(path) for path in DIGESTED} == digests, 'a subject was not restored'
    record = {
        'subject': 'syzygy-u2a.7 round-2 repair rule-6 controlled mutations (WHATWG URL classifier for N1-N3, '
                   'declaration-state not-read reasons for N4, RFC2-24 reasons for N5, CAP1-REQ-012 resolution route), '
                   'answering docs/reviews/R-RT-U2A7-DISCOVERABILITY-EXACT-HEAD-2-RAW.md',
        'ranAt': commit,
        'subjectDigests': digests,
        'method': 'each mutant replaces exactly one occurrence of old with new in file, runs '
                  '`npx vitest run --project <tier> <test>` for each listed test, then restores the file; '
                  'killed means every listed run exited non-zero',
        'population': len(results),
        'killed': sum(r['outcome'] == 'killed' for r in results),
        'survived': [r['id'] for r in results if r['outcome'] != 'killed'],
        'mutants': results,
    }
    json.dump(record, open(sys.argv[1], 'w', encoding='utf-8'), indent=1)
    open(sys.argv[1], 'a', encoding='utf-8').write('\n')


main()

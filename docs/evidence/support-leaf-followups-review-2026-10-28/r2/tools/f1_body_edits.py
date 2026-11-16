"""F1's exact body replacements (review R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2), as old/new pairs, checked against the PR body:
each old text must occur exactly once, and no new text may already occur. Usage: f1_body_edits.py <body.md> [<out.md>]
With <out.md>, writes the body with every edit applied (for the coordinator; this review keeps no copy of the body)."""
import sys

EDITS = [
    ('F1(a) line 56',
     "node-ci's `npm test` step now refuses forms it accepted at `1a8864d9`, in the five items below. Today's sources pass every row.",
     "node-ci's `npm test` step now refuses forms that main `a15b6a04`, this PR's merge base, accepts, in the five items below; the forms of "
     "items 1 to 4 were accepted at `1a8864d9` too. Today's sources pass every row."),
    ('F1(b) line 73',
     "5. A workspace package whose `exports` or `main` target contains `/../` now throws, in any condition, `types` included. Before, an entry "
     "whose conditions all name `./dist/x/../state-directory.js` was joined to `src/state-directory.ts` and accepted; the whole S10 file now "
     "fails on it. E4, below, is that entry (round 1's N2); at `1a8864d9` it passed `no-egress.test.ts` (the review's `B-uniform-dotdot-entry`).",
     "5. A workspace package whose `exports` or `main` target contains `/../` now throws, in any condition, `types` and `source` included. "
     "Against main `a15b6a04` this refuses three forms that pass there in all seven test files that import the workspace-reach testkit, and "
     "that fail `no-egress.test.ts` at file level here with `…: its entry has a /../ segment, which Node refuses` (review "
     "R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2, rows B-/H-E4S-all-but-types, B-/H-types-only and B-/H-main): an entry whose `source`, `import` and "
     "`default` all name the `/../` form (`./src/x/../state-directory.ts`, `./dist/x/../state-directory.js`); a `types` condition alone with "
     "`/../`; and a `main` with `/../` (`apps/syzygy`). E4, below, changes `import` and `default` and leaves `source` as "
     "`./src/state-directory.ts`, so since #549 its conditions disagree and `a15b6a04` already refuses it: `no-egress.test.ts` fails there "
     "with `…: its entry is not a ./dist/X.js whose src/X.ts exists`, and so do four rows of `island-boundary.test.ts`, "
     "`subpath-imports.test.ts` and `workspace-reach.test.ts`. A string target with `/../` is refused there too, by #549's source-condition "
     "rows. At `1a8864d9`, before the `source` condition, E4's edit passed `no-egress.test.ts` (round 1's `B-uniform-dotdot-entry`)."),
    ('F1(c) line 74',
     "   - With the uniform edit, the whole S10 file `no-egress.test.ts` fails before any row runs, with the message "
     "`@syzygy/polaris-dossier/state-directory: its entry has a /../ segment, which Node refuses` (E4).",
     "   - With E4's edit, the whole S10 file `no-egress.test.ts` fails before any row runs, with the message "
     "`@syzygy/polaris-dossier/state-directory: its entry has a /../ segment, which Node refuses` (E4). With the `/../` check also dropped, "
     "it still fails, with `…: its entry is not a ./dist/X.js whose src/X.ts exists`."),
    ('F1(d) line 101',
     "  - E4, a uniform `/../` entry in `packages/polaris-dossier/package.json` (both `import` and `default`), fails `no-egress.test.ts` at "
     "file level with the `/../` message.",
     "  - E4, a `/../` entry in `packages/polaris-dossier/package.json` (`import` and `default`; its `source` condition unchanged), fails "
     "`no-egress.test.ts` at file level with the `/../` message. It does not pin the check: since #549 its `source` condition disagrees with "
     "its targets, so with the check dropped it fails by the unreadable-entry throw (review R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2, M1). E1 and "
     "E5 pin the check."),
    ('F1(e) line 111',
     "- **With the `/../` check dropped, a uniform `/../` entry passes the S10 file** (round 1's X2e).",
     "- **With the `/../` check dropped, an entry whose `source`, `import` and `default` all name the `/../` form passes the S10 file** "
     "(round 1's X2e, in its form since #549: review R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2, M2)."),
    ('F1(f) line 52',
     "and N6 (the testkit's test-only dist module imports `typescript`).",
     "and N6 (at `2f48eefa` the build emitted the testkit, which imports `typescript`; since #549 `npm run build` emits no test-support "
     "module, so N6 is moot at this head)."),
]

body = open(sys.argv[1], encoding='utf8').read()
ok = True
for label, old, new in EDITS:
    n_old, n_new = body.count(old), body.count(new)
    nbsp = (old + new).count(chr(0xa0))
    print(label, 'old occurs', n_old, 'new occurs', n_new, 'nbsp', nbsp)
    ok = ok and n_old == 1 and n_new == 0 and nbsp == 0
for label, old, new in EDITS:
    body = body.replace(old, new)
print('all edits apply:', ok)
if len(sys.argv) > 2 and ok:
    open(sys.argv[2], 'w', encoding='utf8').write(body)

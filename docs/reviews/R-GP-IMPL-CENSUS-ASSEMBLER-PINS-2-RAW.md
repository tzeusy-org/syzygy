# Review: PR #681 (syzygy-9k0e), census assembler survivor pins
Verdict: CONFIRM
Reviewed commit: 6cc5c1ae84c8296af57a3c8b05e3c317c89555f6
Subject: PR #681

Scope: one commit on top of #678 (`origin/agent/syzygy-bpyt.4.34`), one file: `docs/evidence/scratch-prefix-census-2026-10-23/assemble_census.py` (+25 -12). Fixture, literals and six mutants only; no assembler logic changed.

## 1. Gates, run at the head (detached worktree, TMPDIR /tmp/r681)
- `assemble_census.py --selftest <out>`: exit 0, `expected` meets, `unmutated` meets, 55 mutants, all killed, `holds: true`. The six new ones (r3-oldest-mtime-takes-the-max, r3-newest-mtime-takes-the-min, r3-never-sampled-long-gap-upper-bound-open, r3-never-sampled-long-gap-lower-bound-closed, r3-per-gap-names-lower-bound-closed, r3-published-count-from-the-classes-with-names) are each `killed: true`, each diverging on exactly the block it targets (`aggregate: leftovers` for the two mtime ones, `aggregate: longGaps` for the other four).
- `scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53 checks).

## 2. Literals
- Expected values are hard-coded in `EXPECTED_AGGREGATE`; none is computed from the code under test.
- Hand re-derivation, all matching the fixture:
  - `tk-` leftovers: k leaves `tk-ZZZZZZ` (10 B, mtime 1.0) and `tk-VVVVVV` (7 B, mtime 6.0): 2 entries, 17 B, oldest 1.0, newest 6.0 (distinct, so min/max swaps differ). f is seeded with both and keeps only `tk-ZZZZZZ`: leftBySIGKILL 2, stillThere 1, 10 B.
  - `w-MMMMMM` (3.2 s less 0.2 s offset = 3.0 s) sits on the upper bound of the long gap 1.0-3.0: inside, never sampled, so `w-` depends on long gaps. `x-NNNNNN` (4.2 less 0.2 = 4.0 s) sits on the lower bound of 4.0-6.0 and the upper bound of the short gap 3.5-4.0: outside the long gap, so `x-` does not depend. Counts move consistently: tracedNames 10 to 12, long-gap names 6 to 7 (gap 1.0-3.0: 3 to 4), shorter-gap names 4 to 5; 7 + 5 = 12.
  - `LG_PUBLISHED` gains `w-`, `x-`, `z-`; `z-` has no traced name, so 9 published classes against 8 classes with names; `publishedClassesThatDoNot` is `s-`, `x-`, `z-`.

## 3. Equivalence of the seventh survivor (first-seed-branch-off)
Judged independently; the claim holds.
- Argument: in `build_classes` the first branch fires only when `classify(name, mine)` returned `unattributed`, `chrome-singleton`, `vitest-project-directory` or `npm-compile-cache`. `classify` reaches those four returns only after `name in index.made` and `name in index.seen` both failed, so `name not in mine.seen`. The `elif` that follows has the condition `name in seed_names and earlier is not None and name not in mine.seen`, which is then true, and runs the same `classify(name, earlier)`. Whenever the first branch fires the second would give the identical result; nothing downstream reads which branch ran. No input separates them.
- Check 1: the mutant (`if False:` for the first branch), run through its own `--selftest` copy, still meets `unmutated` and `holds: true`.
- Check 2: 3000 random cases (seeded names drawn from chrome, nanoid, compile-cache, unattributed, mkdtemp and derived shapes; random traces per run; random seed and listing sets) compared `build_classes` of the original and the mutant: 0 differences.
- Distinguishing input: none found. The PR leaves the dead branch in place, correctly, since removing it is an assembler change.

## 4. Rule 10 and test growth
- Same file as the #678 review's section 5; no new bound digest is cited by this PR, the recorded self-test and census are not regenerated and the PR does not claim so. `check_governance` 0 FAIL.
- PR body states +6 ~1 -0; the diff has six new mutants and one extended fixture. Fixtures extend the existing AGG/LG tables rather than cloning setup.

## Exceptions
- None.

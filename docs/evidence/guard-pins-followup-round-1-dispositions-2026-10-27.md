# Guard pins follow-up: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.38`
(pull request #536). The change is test-only. It carries notes N1 to N4 of
the PR #531 review (`docs/reviews/R-GP-IMPL-GUARD-PINS-1-RAW.md`; dispositions
in `docs/evidence/guard-pins-round-1-dispositions-2026-10-27.md`) into three
files:
- `packages/polaris-generation-core/src/workspace-reach.testkit.ts`, whose
  local-version comment is rewritten (comment lines only; the pattern line is
  unchanged);
- `packages/polaris-generation-core/src/workspace-reach.test.ts`, with rows
  for six local-version sub-forms, the whole root manifest entry, and the
  remote tarball URL refusal;
- `packages/polaris-dossier/src/argv.test.ts`, with census rows for
  `latest.ts`, `notes.ts.md` and a module two levels under `src`.

The lane's evidence is under `docs/evidence/syzygy-bpyt-8-38/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `c1227667` | `r1-review.diff` sha256 `916b42679b39f9ee2c74fb90585d6f9d4fd82d0b62c5088d748943170be6f50a` |

The subject equals `git diff e5080f4dcdcc208127ae5dc0b915acf413df9764
c12276679a8ed4d3b6b9642215115b77dbfc49d4`: 21 files. Three are the files
above, and the other 18 are under the lane's evidence directory. The
code-only diff `git diff e5080f4d 831f40c1` hashes to
`37718512521253cbf50178a4dd0290cf1205f6214fd9875c45084eeefcf5ac8b`.

**Main moved (N5).** The PR body says "Main has not moved since the branch
point". That was true when the body was last written and false by the
review: #530 merged as `f7477f52` and changed the root and workspace
manifests, which are the resolver's inputs. #535 then merged as `9dba2589`,
touching none of the subject's files or the manifests. The reviewer checked
the subject on a local merge with `f7477f52`:
- the four guard files passed 165 of 165 in 5 of 5 runs;
- the #531 reviewer's 18 mutants gave the same outcomes;
- the island diff was 254/254 walks and 2,645/2,645 answers;
- the faithful-tree sweep found 13 manifests and 29 versions, 0 of them
  local or directory-shaped.

At landing, after the merge of main `9dba2589` and before the landing commit,
`git diff 9dba2589 HEAD` hashed to the subject digest. The battery ran on the
landing commit (rule 7).

The round found four notes and one process note, and no blocking finding.
Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Classes 1, 4 and 6, with no endpoint removed, by the reviewer's ruling
(section 2). This is what the PR declared.
- **Classes 1 and 4.** The testkit's resolver is the island guard's
  mechanism, and that guard is the rule-6 kill evidence for the 8.1 ruling's
  class-1 and class-4 claims. The change adds rows that pin the mechanism and
  moves no token of it: the testkit's comment-free emit is identical at base,
  head and the merge, and a one-character mutant of the pattern line makes it
  differ.
- **Class 6.** The census rows pin the `./argv` export of
  `@syzygy/polaris-dossier`. No manifest is in the subject.

GP-Q0's checks:
- **Differential.** It is degenerate for the product, since no product byte
  changes. The stand-in is the old testkit against the new over one tree:
  251/251 walks and 2,628/2,628 answers equal, and 254/254 and 2,645/2,645 on
  the merge. Its selftest, and a variant the reviewer wrote, fail as they
  should.
- **A rule-6 mutant per predicate.** All nine targets (R1 to R6, C1, C4 and
  S2) survive 157/157 at `e5080f4d` and are killed at `831f40c1`, each by its
  own row, and the same on the merge. The lane's four own mutants (O1 to O4)
  reproduce. Of the reviewer's own mutants, M2, M7, M8 and M9 survive (N1,
  N2), and M5 and M10 are equivalent on both trees.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing. It names N3's
  refusal.

**GP-Q0's stop clause** (`:95-96`) is not triggered. No product byte changes,
the resolver's accept and refuse set is unchanged, and no refusal is added or
removed.

## Notes

- **N1** (no row pins that the resolver reads the root manifest's
  declarations): M8, in which `localNames` skips the manifest whose `dir` is
  `.`, survives 165 of 165. The new root row pins what the workspace holds
  for the root, but not the resolver's use of it. The bead's R6 is still met
  by its own row. Filed as `syzygy-bpyt.8.39`, item 1, with the reviewer's
  checked row.
- **N2** (three refusals the comment names have no row): an `npm:` alias of a
  registry package (M7), `..` alone (M9), and an `http:` tarball URL (M2).
  - The PR body says "The two refusals the #531 notice already names are now
    pinned and described". That is true of the remote tarball URL, which the
    URL row pins. It is false of the `npm:` registry alias. Corrected here:
    that refusal is described in the comment but pinned by no row.
  - Filed as `syzygy-bpyt.8.39`, item 2, with the reviewer's three checked
    rows (169 of 169 together, each killing its own mutant alone).
- **N3** (an unnamed refusal from #531). Named here: the tarball arm also
  refuses a git dependency whose spec text ends in a tarball extension, such
  as `git+https://example.com/lib.tgz`, `git+ssh://git@example.com/lib.tar`,
  `someone/dossier.tgz` or `github:someone/dossier#v1.tar`. npm-package-arg
  12.0.2 types each as `git`, and the resolver answers that each names no
  module. So the PR body's residual "a git dependency stays outside" is false
  for these forms.
  - The refusal fails closed, in a test guard, and changes no answer in the
    tree: 0 of 24 versions at `c1227667` and 0 of 29 on the merge take this
    form. The pattern is unchanged from #531, so this PR changes nothing
    here. Under the reasoning of the #528 and #531 rulings it is within the
    fix direction once named, and the owner notice names it.
  - Narrowing the arm would change what the guard refuses, so it would need
    a GP-Q0 ruling first. An optional comment clause is item 3 of
    `syzygy-bpyt.8.39`.
- **N4** (the `npm:` comment clause does not say that npm installs every
  alias from the registry). No sentence is false. A comment-only rewrite is
  item 3 of `syzygy-bpyt.8.39`.
- **N5** (two PR-body sentences): "main has not moved" is corrected above,
  with the merge evidence. The battery line in the PR body is the lane's, at
  `c1227667`. The landing battery ran on the landing commit.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/guard-pins-followup-review-2026-10-27/`, 51 files. The raw's
section 8 lists 60 kept files with their sha256. At landing a script checked
all 60 against the reviewer's directory: 60 matched, 0 failed, and no kept
file was unlisted. The retained 51 are copies of those. Not retained, though
the raw quotes each one's result line: the governance, quotation, three
typecheck and four `npm ci` logs, 9 files.

## Acceptance criteria (raw section 6)

- AC1, the nine targets, each killed by its own row, with old and new
  fragments and commits recorded: met, and also on the merge.
- AC2, the comment matches npm's behaviour, names the N3 residual, and a URL
  row pins its refusal: met, with notes N3 and N4.
- AC3, the island walk unchanged, the Tests delta stated, an independent
  review, and GP-Q0's checks: met. The owner notice is posted at landing.
  `Tests: +8 ~2 -0`, re-derived by the reviewer.

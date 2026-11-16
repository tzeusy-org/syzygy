# R-GP-IMPL-GUARD-PINS-NOTES-2 — CC-REV-1 implementation review of syzygy-bpyt.49, round 1
Verdict: REVISE
Reviewed commit: 6f9c0a5b
Subject: r1-review.diff sha256 445f0b086adf88a4c8ff996dac03853ca10f0a72de9f2b34b208bc9ab6c6e105

Reviewer: fresh-context CC-REV-1 reviewer (rev-553), 2026-10-28. I did not author this change. Inputs: the brief
(`lead/b49/brief-r1.md`), the subject diff, the PR body, the bead (read with `bd show`, no mutation), the round-1 raw of PR #547
and the governing references it names.

One blocking finding, F1: the PR body's "Commits:" sentence is false at `6f9c0a5b`. It says `e8cd624e` holds "the new tools"
and `6f9c0a5b` holds "the records those tools wrote in a clean clone at `e8cd624e`". Two of the four new tools, `record.py` and
`site_drop.py`, are first committed in `6f9c0a5b`, and two of its records (`summary.json`, `site-drop.json`) were written by
them. The fix is PR-body text only, given exactly in F1; no byte of the diff changes. Everything else holds: each of N1, N2 and
N3 is met against the round-1 raw's own fix text, byte for byte; no guard, gate, test or product byte changes; every selftest,
probe and rule-6 tool re-runs to the committed figures; both probes re-run byte-identical to their committed records; hosted
`checks` and `node` pass. There are seven notes, N1–N7, all low and on evidence tooling: five sub-predicates of the new record
that no entry exercises, a guard-mutant row that may drop its edit, a guard depth that the rule-6 cases do not bound, a hook
placement that nothing live pins, and three small cold-reader items.

## 1. Subject identity

- [Observed] The diff. `git diff a1b9bde2 6f9c0a5b | sha256sum` in my clone prints
  `445f0b086adf88a4c8ff996dac03853ca10f0a72de9f2b34b208bc9ab6c6e105  -`, and `sha256sum` of the coordinator's
  `r1-review.diff` prints the same digest. **It matches.** `git diff --stat` gives "17 files changed, 1519 insertions(+), 22
  deletions(-)". `git merge-base a1b9bde2 6f9c0a5b` is `a1b9bde272f21dd5f110498c39e95f9f827344f4`, so the base is the merge
  base. `git log a1b9bde2..6f9c0a5b` lists exactly two commits, `e8cd624e` and `6f9c0a5b`.
- [Observed] The scope sweep, with its denominator. All 17 of the 17 changed paths start with `docs/evidence/`: 3 under
  `syzygy-bpyt-8-39/`, 5 under `syzygy-bpyt-39/`, 9 new under `syzygy-bpyt-49/`. So 0 of 17 are under `packages/`, `apps/`,
  `scripts/`, `.github/`, `.syzygy/` or `openspec/`.
- [Observed] The PR head. `gh pr view 553 --json headRefOid` prints `6f9c0a5bc2aa15754d14965195ed48c5f35f73fb`. The state is
  OPEN, and `mergeable`/`mergeStateStatus` print "MERGEABLE CLEAN".
- [Observed] The PR body. `gh pr view 553 -R Tzeusy/syzygy --json body --jq .body > f; sha256sum f` prints
  `1f12b420657f6077b47bf82e65bfe1fe16f1c11b8a468bf10bbc95f5f7176c8e`. **It matches the coordinator's frozen figure.** The file is
  5,425 bytes and ends in two newlines. Dropping the last byte, the newline `--jq` adds, gives
  `fcf8ccf60c116b23618c01425bac5de9f99713da29cdf79ed1c413665e1ce274`, which is the lane's `fcf8ccf6…`. So the lane's figure is the
  same body without the trailing newline `--jq` adds.
- [Observed] Where the commits sit. `git ls-tree -r --name-only e8cd624e docs/evidence/syzygy-bpyt-49/` lists exactly two files,
  `guard_probe.py` and `mutants.py`. `git diff --stat e8cd624e 6f9c0a5b` adds seven files: `guard.json`, `mutants.json`,
  `npmrc-trace-lane-probe-guarded.json`, `record.py` (193 lines), `site-drop.json`, `site_drop.py` (27 lines) and `summary.json`.
  This is the evidence behind F1.
- [Observed] Main since the base. Fetched at review time, `origin/main` is `1a8864d94f825fb7abff04f61a4588f325e2b098` (PR #550,
  `syzygy-bpyt.47`). `git diff --name-only a1b9bde2 origin/main` lists 28 paths:
  - `apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts` and `generation-mutation.ts`;
  - `docs/README.md`;
  - `docs/evidence/gen-plan-test-pr550-dispositions-2026-10-28.md`;
  - 21 files under `docs/evidence/gen-plan-test-review-2026-10-28/r2/`;
  - `docs/evidence/syzygy-bpyt-47/test-mutants.json` and `test_mutants.py`;
  - `docs/reviews/R-GP-IMPL-GEN-PLAN-TEST-2-RAW.md`.

  0 of the 28 are PR paths (`comm -12` over the two sorted lists prints nothing). None is read by a changed tool:
  - the three `record.py` files read only files in their own directory (`HERE / name`) and git objects at fixed commits;
  - the two probes and `guard_probe.py` read only their own tree path, npm on PATH and the scratch directory.

  Main moved again during the review. `git ls-remote origin refs/heads/main` then printed
  `e4a3a607333614575d0f3c40bcb063dea8fa0177` (PR #552). `git diff --name-only 1a8864d9 e4a3a607` lists 13 more paths:
  - two under `.syzygy/governance/decisions/` (`OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`, `README.md`);
  - `AGENTS.md` and `docs/README.md`;
  - eight `docs/reviews/V*-RAW.md` raws;
  - `scripts/check_docs_review_campaign_partition.py`.

  0 of the 13 are PR paths. None is read by a changed tool. PR #544 had not landed.
- [Observed] The local merges. `git merge 6f9c0a5b` onto `1a8864d9` is clean (tree `5bd737ea…`), and its diff to main is the
  same "17 files changed, 1519 insertions(+), 22 deletions(-)". On that merge, load 19.27 22.72 25.59 → 25.28 23.91 25.91:
  - 8.39: "summary.json matches ; problems: 0" and "selftest: 77/77 mutations make a check fail";
  - bpyt.39: "summary.json matches ; problems: 0 []" and "selftest: 27/27 mutations make a check fail";
  - bpyt.49: "summary.json matches ; problems: 0 []" and "selftest: 28/28 mutations make a check fail".

  I merged again onto the current main, `e4a3a607`. The merge is clean, with the same 17-file diff, and the same six result
  lines followed. `check_governance.py` there gives "32 OK, 21 WARN, 0 FAIL (53 checks)". Load 31.79 28.07 27.33 → 27.86
  27.73 27.26.
- [Observed] Hosted CI at `6f9c0a5b`. `gh pr checks 553` prints `checks pass 17m34s` and `node pass 4m52s`. The check-runs API for
  the commit gives `checks completed success 6f9c0a5b 2026-10-28T03:41:06Z` and `node completed success 6f9c0a5b
  2026-10-28T03:28:23Z`.

## 2. Clauses relied on, and the class ruling

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`): "Changes touching any of seven
  classes require review by an independent, fresh-context reviewer, and the agent performing the change never finally decides
  which classes it touches." Its classes (`:31-43`) are "authority boundaries", "graph identity", "deterministic observation",
  "security", "data migration", "public interface" and "certificate logic". And `:49-51`: "**The change record states** which
  classes the change touches, or "none," so a misclassification is a findable violation after the fact." with "**A reviewer or
  the owner** may reclassify at any time."
- **GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
  - Part 1 (`:51-55`): "Behavior-preserving" means none of the following changes: "a rendered byte, a wire format, a refusal
    string or an exit code"; "a signed or digest-bound artifact"; "a consent, security or retention decision".
  - Review rule (`:59-60`): "Each pull request states which CC-REV-1 classes it touches. Any pull request whose classes are not
    "none" gets the CC-REV-1 independent review".
  - The stop clause (`:95-96`): "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- **AGENTS.md** at `6f9c0a5b`: rule 6, "Mutate the input and confirm the check fails, per predicate, before trusting it"; rule 11,
  "An evidence record names its subject and the subject's digest"; and the guardrail "A rule-6 evidence record must store each
  mutant's `old`/`new` fragment and the commit it ran at; ids and outcomes alone are not re-runnable".

**My ruling: class none.** [Observed] The 17 paths are evidence tools and records under `docs/evidence/`. None is an authority
boundary, an identity, an observation path, a security or egress surface, a store, a public interface or a certificate. The two
probes' new refusal is a refusal of an evidence tool's own scratch directory. It is not a product refusal string, and no gate,
test, workflow or product module reads either probe (§3.7). On GP-Q0's stop clause: [Observed] nothing changes what a gate
accepts or refuses. The governance output is identical to the base except for the file count (§3.7). The one test that reads
these files generically passes (§3.7). Hosted CI passes. No signed or digest-bound artifact changes. [Observed] Over the
128 tracked files whose path contains `manifest` (any case), 0 contain any of the 17 paths. `git grep -l -F -f <paths>` over
`*MANIFEST*` and `.syzygy/governance/decisions/*` finds 0 files.

## 3. What I ran

All runs used my own clone at `6f9c0a5b` (`npm ci`: "added 117 packages", exit 0) and private TMPDIRs `/tmp/r553-1` …
`/tmp/r553-9`, all deleted afterwards. npm ran offline against `http://127.0.0.1:9/` in every probe run, with fixture projects in
scratch. No observed repository content was fetched.

### 3.1 The three selftests, and `--check`

At `6f9c0a5b` (load 32.94 28.54 27.11 → 32.47 28.77 27.23):
- 8.39: `--check` "summary.json matches ; problems: 0", exit 0; `--selftest` "selftest: 77/77 mutations make a check fail",
  exit 0, 0 SURVIVED lines.
- bpyt.39: `--check` "summary.json matches ; problems: 0 []", exit 0; `--selftest` "selftest: 27/27 mutations make a check fail",
  exit 0.
- bpyt.49: `--check` "summary.json matches ; problems: 0 []", exit 0; `--selftest` "selftest: 28/28 mutations make a check fail",
  exit 0.

### 3.2 The lane's rule-6 tools, re-run

- **`guard_probe.py`** (work `/tmp/r553-2/work`; load 33.60 28.41 27.05 at start). All 8 of 8 rows print "as expected". Each
  G0 refuses all three cases. G1 leaves `parent-node-modules` unrefused, G2 leaves `parent-package-json` and
  `grandparent-package-json`, and G3 leaves `grandparent-package-json`, for each probe. The last line reads "rerun {'exit': 0,
  'record': 'docs/evidence/syzygy-bpyt-39/root-exception-probe.json', 'recordSha256':
  'cea10b3c635d0239f6dbe0796d0b0c6bf48080bd4609586720ef454e69872ab9', 'equalsCommitted': True}". My `guard.json` **equals the
  committed one except for `commit`**, which records my clone's HEAD (`6f9c0a5b`) where the lane's records `e8cd624e`.
- **`mutants.py`** (load 26.34 27.78 27.06 → 36.21 31.41 28.50). All 15 of 15 rows print "as expected", with tallies
  77/77, 75/77, 76/77, 75/77, 75/77, 27/27 and 26/27 ×9. My `mutants.json` equals the committed one except for `commit`
  (the same reason).
- **`site_drop.py`** (load 31.48 28.68 27.21 → 26.22 27.81 27.06). "16 16" (sites, exercised). `cmp` with the committed
  `site-drop.json` prints nothing: **byte-identical**. [Observed] `grep -c -F 'problems.append('` over the record gives 16.

### 3.3 Determinism of the two probes

Caller cwd `/tmp/r553-5/caller`, which holds an empty `.npmrc`; scratch `/tmp/r553-5/a` and `/tmp/r553-5/r`. [Observed]
`/tmp/r553-5`, `/tmp` and `/` hold no `package.json` or `node_modules`. Load 29.36 30.19 28.20 → 26.66 29.54
28.02.
- `npm_alias_probe.py`: exit 0. `cmp` with `docs/evidence/syzygy-bpyt-8-39/npm-alias-probe.json` prints nothing: **byte-identical**,
  sha256 `e5f48acac3987f4bb32a18e341809f132e6f1ee4b064974ec5ec55a1aca48c1c`.
- `root_exception_probe.py`: exit 0. `cmp` with `docs/evidence/syzygy-bpyt-39/root-exception-probe.json` prints nothing:
  **byte-identical**, sha256 `cea10b3c635d0239f6dbe0796d0b0c6bf48080bd4609586720ef454e69872ab9`. A second, independent re-run,
  inside `guard_probe.py` (§3.2), gave the same digest.

### 3.4 The npmrc traces, re-run

`npmrc_trace.py` from `/tmp/r553-6/caller` (load 25.66 29.23 27.94 → 30.44 30.15 28.38). Each run exits 0:
- over CODE's `npm_alias_probe.py`, with `--compare` against `npm-alias-probe.json`: `callerNpmrcOpened` `[]`, and outside
  scratch only `/home/tze/.nvm/versions/node/v24.6.0/lib/node_modules/npm/npmrc`, openat ENOENT, count 24. The result **equals
  the committed `syzygy-bpyt-49/npmrc-trace-lane-probe-guarded.json` in every field but `caller`** (mine `/tmp/r553-6/caller`,
  the lane's `/tmp/la49/caller`);
- over `root_exception_probe.py`: `callerNpmrcOpened` `[]`, and the builtin npmrc ENOENT, count 25. The result equals the
  committed `syzygy-bpyt-39/npmrc-trace-root-exception-probe.json` in every field but `caller`, including `recordSha256`
  `cea10b3c…`.

### 3.5 The copied hunks, by script

`tools/hunks.py` reads the raw and the reviewer's tools from git (`a1b9bde2` for the tools, `6f9c0a5b` for the raw):
- **N1.** Re-deriving the reviewer's diff, `diff -u base f1-copy`, gives a body equal to the committed `tools/f1/*.py.diff` body
  for both probes (body sha256 `62aa2311…` for 8.39, `53248538…` for bpyt.39, each equal on both sides). The committed
  `npm_alias_probe.py` `cmp`-equals `tools/f1/npm_alias_probe.py`. The committed `root_exception_probe.py` differs from
  `tools/f1/root_exception_probe.py` in exactly two hunks: the two-line docstring sentence on `<timestamp>`, and the `re.sub`
  wrapping the write. Both are bead item 3, which is the lane's own text, since the raw gives no code for it.
- **N2.** The base 8.39 `record.py`, with `hook_fix_839.py`'s `FIXED` and `ADDED` applied, equals the committed file: "True 1
  1", where each `old` occurs once. `FIXED` sits at line `[400]`.
- **N3.** The raw's fenced N3 block has 7 entries, each present once in the committed record (`[1, 1, 1, 1, 1, 1, 1]`). Both
  lines of the check block are present once (`[1, 1]`). The eighth entry, quoted inline in the raw, is present once. The check
  sits at lines 113-114, right after base line 112, `problems.append(f'npmrc-trace {name}: compared with another record')`, which
  is "after `record.py:112`" as the raw says. The whole diff of the record is 10 added lines and no removed line. That set
  equals the 7 entries, the 2 check lines and the eighth entry.
- [Observed] Exactly the four `errorLines` change in `root-exception-probe.json`, by a JSON compare with the base: A4, A5, N4 and
  N5. No other field of any case or of the record changes.

### 3.6 My own mutants (rule 6)

`tools/own_mutants.py`, output `own-mutants.json` (work `/tmp/r553-8/w`; load 19.96 23.22 25.84 at start, 20.95 22.48 24.98 at
end). Each mutant is one edit to a scratch copy, and each `old` was asserted to occur once.

**Part G, the ancestor guard.** I used the lane's three cases plus one of my own, `great-grandparent-package-json` (scratch
`gg/g/p/s`, with `gg/package.json`). Each row below holds for both probes.

| Id | Edit | Unrefused | Killed by the lane's three cases |
|---|---|---|---|
| M-G0 | none | `[]` (all four refused, the great-grandparent included) | — |
| M-G1 | `while True:` → `for _ in range(2):` (two levels only) | `['great-grandparent-package-json']` | **No** (N3) |
| M-G2 | `os.path.exists` → `os.path.isfile` | `['parent-node-modules']` | yes |
| M-G3 | the parent skipped (`up` starts at the grandparent) | `['parent-package-json', 'parent-node-modules']` | yes |
| M-G4 | `('package.json', 'package.json')` (only `package.json` looked for) | `['parent-node-modules']` | yes |

**Part T, the timestamp mask.** Each run re-runs the root-exception probe and compares it with the committed record.

| Id | Edit | Exit | Byte-identical | Lines differing |
|---|---|---|---|---|
| M-T0 | none | 0 | **True** | 0 |
| M-T1 | `_\d{3}Z-debug-` → `_\d{2}Z-debug-` (misses the millisecond format) | 0 | False | 4 |
| M-T2 | the mask dropped | 0 | False | 4 |

So a mask that misses its format is caught by the byte compare that `guard.json`'s re-run row records. No selftest catches it,
because the selftests read stored records. It is caught by re-running, which is what the byte compare is for.

**Part R, the record checks** (`--check`, then `--selftest`):

| Id | Record | Edit | `--check` | `--selftest` |
|---|---|---|---|---|
| M-R1 | 8.39 | the hook moved back after the filter (the base line restored) | matches, 0 | **77/77, nothing survives** (N4) |
| M-R2 | bpyt.39 | `recordSha256` compared with the sha of `.read_bytes().strip()` | DIFFERS, 1 problem | "selftest: the unmutated inputs already fail": killed |
| M-R3 | bpyt.39 | `recordSha256` compared by its first 8 characters | matches | 27/27 (survives; a deliberate weakening, see below) |
| M-X1 | bpyt.49 | `rerun['exit'] != 0 or ` dropped | matches | **28/28** (N1) |
| M-X2 | bpyt.49 | `rerun['record'] != ROOT_RECORD or ` dropped | matches | **28/28** (N1) |
| M-X3 | bpyt.49 | ` or t['exit'] != 0` dropped (lane trace) | matches | **28/28** (N1) |
| M-X4 | bpyt.49 | `t['probe'] != PROBE or ` dropped | matches | **28/28** (N1) |
| M-X5 | bpyt.49 | `r['record'] != (R839 if … else R39) or ` dropped | matches | **28/28** (N1) |
| M-X6 | bpyt.49 | `len(builtin) != len(t['npmrcOutsideScratch']) or ` dropped | matches | 27/28, "a lane trace that read an ancestor npmrc" survives: killed |
| M-X7 | bpyt.49 | ` or (c['exit'] == 0) != open_case` dropped | matches | 27/28, "a refused case that exits 0" survives: killed |
| M-X8 | bpyt.49 | the tally compare replaced by `False` | matches | 27/28, "an unmutated selftest of another size" survives: killed |

M-R3 survives because the entry writes `'0' * 64`, and any prefix compare tells that apart from the real digest. A prefix
compare is a deliberate weakening rather than a plausible slip, and every `recordSha256` entry in the three records uses this
same `'0' * 64` convention. I do not raise it.

**Part D, extra entries in a copy of bpyt.49's `SELFTEST`** (unmutated record):

| Id | Entry | Result |
|---|---|---|
| M-D1 | G1's guard row with `old=None, new=None` | **28/29, SURVIVED** (N2) |
| M-D2 | the re-run row with `exit=1` | 29/29, killed |
| M-D3 | the lane trace with `exit=1` | 29/29, killed |
| M-D4 | row N3-E5 with `record` set to 8.39's | 29/29, killed (by the sha and the fragment checks) |

M-D2 and M-D3 are killed only because M-X1 and M-X3 have not been applied. Each is the entry those predicates lack (N1).

### 3.7 Gates and readers

- [Observed] Readers by name. `git grep -l -F` at `6f9c0a5b`, for each of `syzygy-bpyt-8-39`, `syzygy-bpyt-39` and
  `syzygy-bpyt-49`, over `.github`, `scripts`, `packages`, `apps`, `PROJECT-STATUS.md` and the root configs: 0 files for each.
- [Observed] Generic readers. `git grep -l -E "ls-files|readdirSync\(.*evidence|walk\("` over `*.test.ts` finds 11 test files.
  Two of them list the tracked population:
  - `build-output.test.ts` copies only root files, `apps/` and `packages/` (`:26`), so it never reads `docs/evidence/`;
  - `polaris-authority-sweep.test.ts` sweeps `docs` (`:185`), which includes all 17 paths.

  I ran that one alone: "Test Files 1 passed (1)" and "Tests 5 passed (5)", load 19.12 25.86 27.02 → 19.43 25.81 27.00. I did
  not run the full Vitest suite. No test file changed (Vitest +0 ~0 −0), and the one generic reader passes.
- [Observed] `python3 scripts/check_governance.py` at `6f9c0a5b`: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not
  asserted", exit 0. The same at `a1b9bde2` gives the same tally. A line diff of the two outputs differs only in the scope line,
  "7334 file(s) examined" → "7343". Those are the 9 new files. Two WARN lines name the round-1 raw's own sentences
  (`R-GP-IMPL-GUARD-PINS-NOTES-1-RAW.md -> syzygy-bpyt-39/npm_alias_probe.py`, `-> syzygy-bpyt-39/record_839.py`). They are
  present at the base too.
- [Observed] `python3 scripts/check_quotations.py`: exit 0.
- [Observed] The battery (`tools/battery.py`, which runs each command of `PROJECT-STATUS.md`'s block in turn at `6f9c0a5b`):
  "commit=6f9c0a5bc2aa15754d14965195ed48c5f35f73fb commands=116 nonzero=0". My count includes the block's two
  assignment lines, `CS=` and `DR=`. So 114 commands ran and 0 were nonzero, which matches the PR body's `commands=114
  nonzero=0`. The run took about an hour, ending at load 31.52 27.60 27.16. Its start load went to a file that I deleted
  unread [Unknown].
- [Observed] Landing. The repository allows merge, rebase and squash merges (`[true,true,true]`). The bpyt.49 record reads
  `git show e8cd624e:<path>`, as the bpyt.39 record reads `fafe3669`. [Observed] `fafe3669`, `81862261` and `38fa1596` are each
  ancestors of `a1b9bde2`, so earlier records survived by merge commits. A squash or rebase merge of #553 would leave
  `e8cd624e` reachable from no ref (N6).

## 4. Findings

### F1 — The PR body's "Commits:" sentence is false at `6f9c0a5b` (blocking: a false sentence in the PR body)

- **Evidence.** [Observed] The body reads: "Commits: `e8cd624e` (the changes and the new tools), then `6f9c0a5b` (the records
  those tools wrote in a clean clone at `e8cd624e`)." At `e8cd624e`, `docs/evidence/syzygy-bpyt-49/` holds two files,
  `guard_probe.py` and `mutants.py`. `6f9c0a5b` adds two more tools, `record.py` (193 lines) and `site_drop.py` (27 lines), with
  five records.
  - `site-drop.json` was written by `site_drop.py` over `record.py`, at `recordSha256`
    `fe1b8c236c22cf6dc756fe76de17d0087b708fdca3d270968cf1a5e02758a19e`. That is the sha256 of the record at `6f9c0a5b`, a file
    that does not exist at `e8cd624e`.
  - `summary.json` was written by `record.py`.

  So "the new tools" are not all in `e8cd624e`, and not every file of `6f9c0a5b` is a record that `e8cd624e`'s tools wrote. The
  commit message of `e8cd624e` itself says "New docs/evidence/syzygy-bpyt-49/ tools: guard_probe.py and mutants.py", which is
  accurate.
- **Failure scenario.** A cold reader, auditing where each record came from, checks out `e8cd624e` to re-run the new record and
  finds no `record.py` and no `site_drop.py`. Or the reader takes `summary.json` and `site-drop.json` for outputs of
  `guard_probe.py`/`mutants.py`. This is the provenance a rule-11 reader needs.
- **Exact fix (PR body only; the diff is unchanged).** Replace that sentence with:

  > Commits: `e8cd624e` (the changes, and the two tools that exercise them, `guard_probe.py` and `mutants.py`), then
  > `6f9c0a5b` (the records `guard.json`, `mutants.json` and `npmrc-trace-lane-probe-guarded.json`, which those tools and
  > `docs/evidence/syzygy-bpyt-39/npmrc_trace.py` wrote in a clean clone at `e8cd624e`; and the new record's own tools,
  > `record.py` and `site_drop.py`, with what they write, `summary.json` and `site-drop.json`).

  Check: after the edit, `gh pr view 553 --json body --jq .body | grep -c -F 'the changes and the new tools'` prints `0`.

### N1 — Five sub-predicates of the new `record.py` have no selftest entry (low; evidence tooling)

- **Evidence.** [Observed, §3.6] M-X1 to M-X5 each leave `--check` matching and the selftest at 28/28:
  - M-X1, `:103`: the re-run's `exit`;
  - M-X2, `:103`: the re-run's `record` path;
  - M-X3, `:107`: the lane trace's `exit`;
  - M-X4, `:107`: the lane trace's `probe` path;
  - M-X5, `:79`: a mutants row's `record` path.

  `site_drop.py`'s "16 of 16 exercised" is per site, and each of these sites is exercised by another operand of its `or` chain.
  This is the class round 1's N3 found in the bpyt.39 record (E1, E2, E5, E7).
- **Failure scenario.** A later edit drops `rerun['exit'] != 0 or`. A re-run that crashed after writing a byte-identical record
  then passes as a clean re-run, and the selftest still reports 28/28.
- **Proposed fix (verified, `proposed-fixes.json`).** Before the `'a product file in the subject'` entry, add:

  ```python
      'a root-exception re-run that failed': {'guard.json': lambda d: (d['rootExceptionRerun'].update(exit=1), d)[1]},
      'a root-exception re-run of another path': {'guard.json': lambda d: (d['rootExceptionRerun'].update(record=PROBE), d)[1]},
      'a lane trace whose run failed': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d.update(exit=1), d)[1]},
      'a lane trace of another probe path': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d.update(probe=ROOT_PROBE), d)[1]},
      'an unmutated row of the other record': {'mutants.json': lambda d: (row(d, 'N2-0-unmutated').update(record=R39, recordSha256=sha(blob(R39).decode())), d)[1]},
  ```

  With these and N2's fix, the copy gives "summary.json matches ; problems: 0 []" and "selftest: 34/34 mutations make a check
  fail". With each of M-X1 to M-X5 applied as well, it gives 33/34, and exactly its own entry is SURVIVED. Applying them means
  regenerating `summary.json`, since its `tools` row hashes `record.py`, and re-running `site_drop.py`.

### N2 — A guard-mutant row may drop its `old`/`new` and still pass (low; evidence tooling)

- **Evidence.** [Observed, §3.6 M-D1] For `mutants.json`, `:81` requires `old is None` exactly for the `-unmutated` rows. The
  guard block at `:94` checks only `old is not None and …`, so G1's row with `old=None, new=None` passes (28/29, SURVIVED). The
  AGENTS.md guardrail says "A rule-6 evidence record must store each mutant's `old`/`new` fragment … ids and outcomes alone are
  not re-runnable".
- **Failure scenario.** A regenerated `guard.json` loses a mutant's fragments, for example through a tool edit that stops writing
  them. The record still passes, and that mutant can no longer be re-run.
- **Proposed fix (verified).** In `:94`, replace `if r['probeSha256'] != sha(source) or (r['old'] is not None and` with
  `if r['probeSha256'] != sha(source) or (r['old'] is None) != (r['id'] == 'G0-unmutated') or (r['old'] is not None and`, and
  add the entry `'a guard mutant row with no edit': {'guard.json': lambda d: (guard_row(d, PROBE,
  'G1-node-modules-not-looked-for').update(old=None, new=None), d)[1]},`. With N1's entries this gives 34/34. With the new
  condition reverted, it gives 33/34 and exactly this entry SURVIVED.

### N3 — The guard's rule-6 cases reach two levels up, so a guard bounded at two levels passes them (low; evidence tooling)

- **Evidence.** [Observed, §3.6 M-G1] For both probes, `for _ in range(2):` in place of `while True:` refuses all three of the
  lane's cases. Only my `great-grandparent-package-json` case is left unrefused. The docstring and the guard message claim "any
  directory above". The unmutated guard does refuse the great-grandparent (M-G0), so the guard itself is right. What falls short
  is the evidence that it is unbounded.
- **Failure scenario.** A later "tidy" bounds the loop, and `guard.json` re-runs as expected. A scratch directory three levels
  below a caller's project then reads that project's `.npmrc`, which is round 1's F1 configuration.
- **Proposed fix (verified, both probes).** Add `'great-grandparent-package-json': ('gg', 'package.json', 'gg/g/p/s')` to
  `guard_probe.py`'s `CASES` and to `record.py`'s `CASES`. Add a mutant `('G4-two-levels-only', 'while True:\n', 'for _ in
  range(2):\n', ['great-grandparent-package-json'])`, with `UNREFUSED['G4-two-levels-only'] = ['great-grandparent-package-json']`.
  Then append `'great-grandparent-package-json'` to the expected unrefused lists of G2 and G3 in both files. [Inferred] G2 (no
  `package.json` looked for) and G3 (only the parent) each miss it too; I did not run those two with the new case. No finite
  case set bounds an unbounded loop, but this kills the next plausible bound after the one G3 already kills. [Observed] I
  verified the case and the mutant (`own-mutants.json`: M-G0 refuses it, M-G1 leaves only it). I did not run the edited
  `guard_probe.py`.

### N4 — The repaired hook placement is pinned by no live check (low; evidence tooling)

- **Evidence.** [Observed, §3.6 M-R1] Restoring the base line 400, which puts the hook after the filter, leaves 8.39's selftest
  at 77/77. Under either placement the new entry's injected path is not one of the bead's own, so it is killed either way. The
  placement is pinned only by `mutants.json`'s N2-H3 row, which binds `e8cd624e`'s blob. A later edit on disk is caught only by
  the `record.py` tool digest in 8.39's `summary.json`, and regenerating that file clears it.
- **Failure scenario.** A later edit moves the hook back and regenerates `summary.json`. Widening the filter (H3) then survives
  again, which is round 1's N2 restored, and every check passes.
- **Proposed fix (verified, `proposed-fixes.json` A0–A2).** In 8.39's `main()`, after the `'selftest: the unmutated inputs
  already fail'` exit, add a negative control:

  ```python
          MUTATE.update({'@since': lambda names: [*names, f'{HERE_REL}/x.json']})
          if main_summary()['problems']:
              print("selftest: this bead's own evidence path, added before the filter, is not filtered")
              sys.exit(1)
  ```

  With it: `--check` matches, and the selftest gives 77/77 (A0). With M-R1 as well, the selftest exits 1 with that message (A1).
  With H3 as well, it gives 76/77 and the new entry SURVIVED (A2). This is another in-place edit of 8.39's `record.py`, under the
  same ruling as N2's, so a follow-up bead is enough.

### N5 — 8.39's probe docstring routes to the traces of the previous blob (low; cold reader)

- **Evidence.** [Observed] `npm_alias_probe.py:12-13` ends "docs/evidence/syzygy-bpyt-39/ traces the files npm opens". The traces
  there bind the `fafe3669` blob (`677b0fe2…`). The current blob's trace (`d0681b01…`) is
  `docs/evidence/syzygy-bpyt-49/npmrc-trace-lane-probe-guarded.json`. The sentence is the reviewer's f1 text, kept byte for byte,
  so it is not false. It routes a reader to the traces of the previous version.
- **Proposed fix.** At the next edit of the probe, end the sentence "…traces the files npm opens, and
  docs/evidence/syzygy-bpyt-49/ traces this version (the ancestor guard)". Until then, record the route in the dispositions record.

### N6 — The record pins `e8cd624e`, which only a merge commit keeps reachable (low; landing)

- **Evidence.** [Observed, §3.7] `record.py` runs `git show e8cd624e:<path>` for every subject file and blob. The repository
  allows squash and rebase merges. A rebase-merge leaves the recorded commit reachable from no ref (the AGENTS.md guardrail). The
  earlier pins `fafe3669`, `81862261` and `38fa1596` are ancestors of main, so they landed by merge commit.
- **Failure scenario.** A squash or rebase merge. In a fresh clone of main, `record.py . --check` then dies on `git show`
  (CalledProcessError), with no summary line at all.
- **Fix.** Land #553 with a merge commit (`gh pr merge 553 --merge --match-head-commit <head>`). Then confirm
  `git merge-base --is-ancestor e8cd624e origin/main`, and record both in the dispositions record.

### N7 — `site-drop.json`'s `recordSha256` is checked by nothing (low; cold reader)

- **Evidence.** [Observed] `site-drop.json` names its subject and digest (`record`, `recordSha256` `fe1b8c23…`, equal to the
  committed `record.py`), so rule 11 is met. By design (`site_drop.py:3-4`), `record.py` does not read it. So when N1 or N2's fix
  edits `record.py`, `site-drop.json` goes stale silently, and only `summary.json`'s `record.py` digest moves.
- **Proposed fix.** When N1/N2 land, re-run `site_drop.py` in the same commit. Add one line to the dispositions record: the
  `site-drop.json` `recordSha256` must equal `summary.json`'s `tools["record.py"]`. A reader can check that with one command.

## 5. Changed outputs

- **Product, gate and test bytes: none.** [Observed] All 17 of 17 paths are under `docs/evidence/` (§1). `check_governance.py`'s
  output is identical to the base except the scope count (§3.7). The one test that reads these files generically passes.
- **Evidence outputs that change, each re-derived by me:**
  - `syzygy-bpyt-39/root-exception-probe.json`: 4 `errorLines` (A4, A5, N4, N5) now carry `<timestamp>`. My re-runs are
    byte-identical to it.
  - `syzygy-bpyt-39/npmrc-trace-root-exception-probe.json`: `probeSha256` `d7b29a54…`, `caller` `/tmp/la49/caller`,
    `recordSha256` `cea10b3c…`. My re-run equals it except `caller`.
  - `syzygy-bpyt-8-39/summary.json`: only `tools["npm_alias_probe.py"]` (`d0681b01…`) and `tools["record.py"]` (`b3e8d599…`).
    `--check` matches.
  - `syzygy-bpyt-39/summary.json`: only `tools["root_exception_probe.py"]` (`d7b29a54…`) and `tools["record.py"]`
    (`9e17f4e3…`). `--check` matches.
  - The 9 new `syzygy-bpyt-49/` files: `--check` matches, and the re-runs agree as §3.2–3.4 say.
- **What the probes now refuse.** A scratch directory with a `package.json` or a `node_modules` in any directory above it: exit
  1, with the guard's message. This is evidence tooling only (§2).

## 6. Each note taken, and each deviation

- **N1 (round 1): met.**
  - The precondition sentence and the Usage line are the reviewer's f1 text, byte for byte (§3.5).
  - The ancestor guard is the raw's code block, byte for byte. It refuses all three of the lane's cases and my
    great-grandparent case, for both probes (§3.2, §3.6).
  - The timestamp masking (bead item 3) makes the root-exception record byte-reproducible (§3.3). Exactly the 4 `errorLines` the
    review named change (§3.5).
  - The cascade: steps 1–3 are done. 8.39's `summary.json` is regenerated and gives 77/77, which is the bead's "77/77 with item
    2". The trace is re-run, and `syzygy-bpyt-39/summary.json` is regenerated.
- **N2 (round 1): met.** Line 400 is `FIXED`, byte for byte, and the new entry follows the non-evidence-path entry (§3.5).
  F-H1/F-H3/F-H4/F-S5 re-run with exactly the survivors the raw names (§3.2). The residual is N4: nothing live pins the placement.
- **N3 (round 1): met.** The seven entries, the check (after `:112`) and its entry are byte for byte (§3.5). 27/27, and each of
  P5, P10, P12, P16, E1, E2, E5, E7 and C1 leaves exactly its own entry (§3.2). The raw's "26/26" and "20/20" were for the entries
  alone and the check alone, so together they give 27/27, which is consistent.
- **Deviation: the bpyt.39 record's `HEAD` is not moved, and a new trace goes under `syzygy-bpyt-49/`.** This is sound. The
  raw's step 4 is conditional ("If the lane probe's "after" trace must bind the new probe blob"). Keeping `HEAD` at `fafe3669`
  keeps that record's subject as bpyt.39's own change. Its lane traces still bind that change's blobs (`git show
  {HEAD}:{PROBE}`), so no digest-bound evidence moves (rule 10). The new blob's trace sits with the record whose subject is the
  new blob, and that record checks it against `e8cd624e`'s `npm_alias_probe.py` (`:107`). The cost is N5's routing sentence.
- **Deviation: the new record directory and its tools** (`record.py`, `site_drop.py`, `guard_probe.py`, `mutants.py`). These are
  not in the raw. They are the rule-6 records that the bead's "Each change keeps the rule-6 record discipline (old/new and
  commit)" asks for. They store `old`/`new` and the commit (`mutants.json`, `guard.json`), except N2's gap.

## 7. Test quality

Bar: `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, read by `git show 6f9c0a5b:<path>`.
- Core rule (`:42`): "**A test is worth keeping only if some plausible bug makes it fail.**" Each of bpyt.49's 28 entries is
  killed by its check, and each guard case and mutant row kills a plausible guard bug (M-G2, M-G3, M-G4 are killed by the lane's
  cases).
- Workflow 2 (`:103-104`): "name a one-line bug in the code under test this test would *not* catch but should." Four such bugs:
  - M-X1 to M-X5, the new record's sub-predicates (N1);
  - M-D1, a guard row's lost fragments (N2);
  - M-G1, a two-level guard (N3);
  - M-R1, the hook moved back (N4).

  Each comes with a verified fix.
- Bar 4 (`:64-67`): "Expected values are literals or independently derived." Met. `SURVIVORS`, `TALLIES`, `CASES`, `UNREFUSED`
  and `SUBJECT` are literals, and `guard_probe.py` checks the refusal by the guard's literal message, not by the exit code alone.
- Bar 6 (`:78-79`): "A test that fails intermittently is worse than no test … Fix the nondeterminism (time, ordering, shared
  state)". Met for the root-exception record, which now re-runs byte-identical (§3.3). M-T1 and M-T2 show that the byte compare
  catches a mask that misses.
- Bar 10 (`:93-96`): "Reviews state the net test delta". Vitest: +0 ~0 −0, which matches the PR body. Evidence selftests:
  - 8.39 goes +1 (76 → 77; the diff adds 1 entry, and round 1 measured 76/76);
  - bpyt.39 goes +8 (19 → 27; the diff adds 8 entries, and round 1 measured 19/19);
  - bpyt.49 is new, with 28 entries;
  - rule-6 tools: `guard_probe.py` (8 rows), `mutants.py` (15 rows), `site_drop.py` (16 sites).

  None duplicates an existing entry. Each new 8.39 and bpyt.39 entry is the sole survivor of its own mutant (§3.2).

## 8. Cleanup

The scratch clone (`rev-553/clone`), the merge clones (`rev-553/merge`, `rev-553/merge2`) and the TMPDIRs `/tmp/r553-1` to `/tmp/r553-9` are
deleted. Nothing was pushed, commented, merged or dispatched. The governance, quotations and `npm ci` logs, the PR-body copy,
the run transcripts and the selftest outputs are deleted, and their result lines are quoted above. Kept files, relative to
`rev-553/`:

| Path | sha256 |
|---|---|
| `tools/hunks.py` | `bb78549ce87c1c94ff9c9eb395e8b997fdde09dcc18efdb71ac290a1cd50dc60` |
| `tools/own_mutants.py` | `8c1e9d48ba0c05ca33de6a3629eeb3c5849a621af604e15420ff5852322c8433` |
| `tools/proposed_fixes.py` | `583da6f146e7cf48702ce132cdee851a1f6990b4f017967a5b00a777bcfe4fc6` |
| `tools/battery.py` | `32b44493628ab557b4c82815fa1ea43285e4c7c4be301496f8b1306933c7ca61` |
| `own-mutants.json` | `ceba82c98df6596678bd145c468eb5649e0c9dbe4254aaf2db073eb8a58b085e` |
| `proposed-fixes.json` | `d107f7a203b8c776055371d84a2782b29aea16829c26f147bf92add3534662cf` |

Every kept file is under 12 KB. This raw, `R-GP-IMPL-GUARD-PINS-NOTES-2-RAW.md`, is the seventh file, and its digest is in the
reply.

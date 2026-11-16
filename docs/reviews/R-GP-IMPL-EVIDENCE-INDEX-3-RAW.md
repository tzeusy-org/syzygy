# Review round 3: generated evidence index class pins (syzygy-abf8)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 5665f9eff2935491a166cca09141d5db55bccb12
Subject: PR #715

Scope: the one-commit diff of `agent/syzygy-abf8` at `5665f9ef` over its base `agent/syzygy-bpyt.9.1` at `48ba9752` (PR #710): `scripts/build_evidence_index.py` only (+80 -6). Round 2 is `R-GP-IMPL-EVIDENCE-INDEX-2-RAW.md` (CONFIRM WITH EXCEPTIONS over `48ba9752`, G1-G3). Reviewer: fresh context, a detached worktree at the head, TMPDIR `/tmp/r715`, every command in the foreground. `[Observed]` means run here; `[Inferred]` means reasoned and not run.

## Gates at the head

- [Observed] `python3 scripts/build_evidence_index.py --summary`: `5499 rows: act-bound 3, governed-citer 60, code-reference 51, raw-review-citer 211, docs-citer 83, digest-cited 4093, evidence-only 509, listed-only 226, directory-named 135, none 128`. Matches the PR body (sum 5499).
- [Observed] `--selftest`: `36/36 selftest cases pass`. The PR diff adds 10 cases and changes the row-count literal 23 to 38 (the fixture file set grew by 15).
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`. `--selftest`: `433 fixtures, 0 failing`.
- [Observed] `python3 scripts/check_docs_review_campaign_partition.py --check`: `partition PASS: denominator=705; assigned=705; raw=671; other=34; unmatched=0; overlaps=0; campaigns=118`, second method `git ls-files=705; git ls-tree=705`. (At the PR head, before this raw is added.)
- [Observed] Stack: `git merge-base --is-ancestor origin/agent/syzygy-bpyt.9.1 HEAD` holds; the diff over the base touches only the script.
- [Observed] The docstring's "forty unrelated records quote [the empty digest]" is exact: `git grep -I -l -i <empty sha256>` lists 40 files.

## Round-2 findings

- G1 closed for the five named mutants. [Observed] The ten new cases pin them: a file both path-cited by an evidence citer and digest-cited (`dual-2026-01-01.json`), a mixed bare-path and prose file (`mixed-target`), an `openspec/` citer, `subject.path` object and non-string, and `COMMIT_KEYS` order. The expected values are literals (`"digest-cited"`, `"a/b.ts"`, `"def5678"`, `38`); only the fixture inputs (`dual_digest`, `EMPTY_SHA256`) are computed from fixture bytes, which is input, not an expected value. I ran my own versions of the first mutants below (M1, M2, M8: killed). But the same order and subtree predicates, for the new class, are not pinned (see N1).
- G2 closed. [Observed] `directory-named` is a visible class, checked before `none`, with a docstring paragraph ("Directory citation") and a class-list entry. A citer under the cited directory does not count.
- G3 closed. [Observed] `EMPTY_SHA256` is never a digest citation, and the docstring says a digest binds bytes so identical files share it. The 9 empty files now read `listed-only` 7 and `evidence-only` 2 (they are path-cited), which accounts exactly for digest-cited 4102 to 4093, evidence-only 507 to 509, listed-only 219 to 226.

## Second method for the totals (rules 2 and 9)

- [Observed] Digest side, `/tmp/r715/fourth.py`, written without importing the builder. It uses `git grep -P` (PCRE) with both `-I` and `-a` over the whole tree for 64-hex tokens (31,314 distinct) and excludes the empty digest.
  - 4,243 rows have a cited non-empty digest: `digest-cited` 4093, `raw-review-citer` 97, `code-reference` 31, `governed-citer` 13, `docs-citer` 6, `act-bound` 3.
  - 0 rows are `evidence-only`, `listed-only`, `directory-named` or `none` while their digest is cited, and 0 `digest-cited` or `act-bound` rows lack a citation. So the 4093 is exact, and the empty digest accounts for the other 9.
- [Observed] Directory side, `/tmp/r715/third.py`. It uses my own tokenizer, `/`-suffix walk, citer-dir resolution and ancestor walk, with candidate citers taken from a fixed-string `git grep -F` of each of 402 evidence directories (a superset). Over the 263 rows that are `directory-named` or `none` I computed 135 and 128, with **0 row differences**.
- [Inferred] Both implementations follow one docstring, so this shows the code matches its stated predicate, not that the predicate is complete. A loose-substring variant flags 12 `none` rows, all substring collisions (for example `syzygy-bpyt-7-1` inside `syzygy-bpyt-7-12`), none a token.
- [Observed] The rest of the classes (act-bound through listed-only) are unchanged by the diff except through the empty digest, and the round-2 reviewer's 0-difference second method covered them at `48ba9752`.

## Spot checks (`random.seed(715)`)

`directory-named`, 10 of 135. Each is under a directory a file outside it names by token.

- `syzygy-bpyt-7-12/lexer-vs-printer-head-695bf136.json`, named by `docs/reviews/R-GP-IMPL-POC-CORE-EXPORTS-1-RAW.md`
- `decisions-sweep-review-2026-10-22/results-timing.json`, named by `decisions-sweep-round-1-dispositions-2026-10-22.md`
- `island-decoupling-review-2026-10-22/tools/conserve.py`, named by `argv-guards-review-2026-10-25/tools/island_specs.py` (directory and `tools` subdirectory)
- `launch-gate-v2.5/dry-installed-replay.log`, named by `.syzygy/governance/decisions/LAUNCH-GATE-V2.5-AUTHORITY-DECISION.md` and `PENDING-OWNER-DECISIONS.md`
- `island-decoupling-review-2026-10-22/consent-after-reproduce.json`
- `consent-act-families-review-2026-10-22/tools/probe.mjs`
- `island-decoupling-review-2026-10-22/static-site-after.json`
- `syzygy-bpyt-4-2/surface-version-8fcf409c.json`, named by `observed-leaves-dispositions-2026-10-29.md`
- `syzygy-bpyt-54/sweep-selftest-e405d03e.json`, named by `R-GP-IMPL-SPREAD-SWEEP-2-RAW.md`
- `syzygy-bpyt-56/mutants-5877559c.json`, named by `observer-gate-dispositions-2026-10-28.md`

`none`, 10 of 128. Each has no digest citer, no path-token citer and no directory citer (0 loose-substring hits for 9; one explained).

- `polaris-dov-3-2-slice-6-proposal-disclosure-2026-10-03.json`
- `pwb-m5-slices-1-2-mutation-evidence-2026-09-23.json`
- `n9-signoff-reconciliation-mutants-2026-10-14.json`
- `contract-chain-act-instant-mutations-2026-09-28.json`
- `pwb-behavior-contract-repin-rule6-2026-10-02.json`
- `pwb-m11-restart-incomplete-identity-race-2026-09-23.json`
- `poc-restart-stale-fixture-audit-2026-09-23.json`
- `versioned-signoff-two-package-head-mutants-2026-10-14.json`
- `pwb-m5-slices-1-2-review-correction-mutation-evidence-2026-09-23.json`
- `syzygy-bpyt-7-1/README.md`: the loose hits are `syzygy-bpyt-7-12` and similar, not the token `syzygy-bpyt-7-1`. Correct.

## Rule-6 mutants of my own

Each `old` fragment occurs exactly once; each was run as `python3 <mutated copy> --selftest` at `5665f9ef`, then as a full `--summary` for the live effect. Base: `digest-cited 4093, evidence-only 509, listed-only 226, directory-named 135, none 128`.

| id | old -> new | selftest | live rows changed |
|---|---|---|---|
| M1 | `if hexd.lower() == EMPTY_SHA256:` -> `if False:` | killed | digest-cited 4102, evidence-only 507, listed-only 219 |
| M2 | `candidate_keys(token.rstrip("./"), citer_dir)` -> `candidate_keys(token, citer_dir)` | killed | directory-named 17, none 246 |
| M8 | `len(d) > len(EVIDENCE_PREFIX)}` -> `len(d) > len(EVIDENCE_PREFIX) + 40}` | killed | directory-named 2, none 261 |
| M3 | ` or posixpath.dirname(p).startswith(d + "/") for d in named_dirs)` -> ` for d in named_dirs)` (subtree) | **survived** | directory-named 102, none 161 (33 rows) |
| M6 | `directory-named` returned above the `("evidence","listing")` loop | **survived** | evidence-only 93, listed-only 2, directory-named 775 (about 640 rows) |
| M7 | `directory-named` returned first in `classify` | **survived** | digest-cited 42, raw-review-citer 103, directory-named 4975 (about 4,840 rows) |
| M4 | `not citer.startswith(key + "/")` -> `not citer.startswith(key)` | survived | 0 |
| M5 | ancestor loop `while len(d) > len(EVIDENCE_PREFIX)` body replaced by `pass` | survived | 0 |
| M9 | `hexd.lower() == EMPTY_SHA256` -> `hexd == EMPTY_SHA256` | survived | 0 (no uppercase empty digest is tracked) |

## Findings

### N1 (exception): the new class's order and subtree predicate have no fixture that kills them, the same shape as G1

- [Observed] M7 and M6 move `directory-named` above the digest and path classes. M7 reclassifies about 4,840 of 5499 rows and the selftest passes; M6 reclassifies about 640. The class-list docstring says "nothing above applies" and "Checked before `none`", so the order is the stated contract, and it is the same class of defect G1 named for `digest-cited`.
  - The fixture set has no file that is inside a cited directory and also path-cited, digest-cited or listed. All five `directory-named` and `none` fixture files carry no other citer.
- [Observed] M3 (the subtree clause) survives: every `directory-named` fixture (`dirfam/r1/inside.json`, `other.json`) sits directly in the cited directory, so a file two levels deep is never tested. 33 live rows depend on it.
- Recommendation: one file under `dirfam/r1/sub/` for the subtree case, and one file in `dirfam/r1/` that is also path-cited by a sibling or digest-cited (expect the higher class). The PR's mutant 8 (`return "none"`) is killed, but the order mutants are not tried.
- M4, M5 and M9 are zero-effect survivors, noted and not asked for.

### N2 (note): the mutants record names the old script, and the new mutants live only in the PR body

- [Observed] `docs/evidence/syzygy-bpyt-9-1-evidence-index-mutants-2026-11-04.json` carries `subjectSha256` `df9532dd…` (the script at `48ba9752`; `git show 48ba9752:scripts/build_evidence_index.py | sha256sum` equals it) and `commit` `005c73ad`. The head script is `08beb050…`.
- Acceptable under rule 11 as a record of that commit: it names its subject and the subject's digest, and the old bytes still hash to it. It is not a record of the head, and nothing claims it is.
- [Observed] The 8 mutants in the PR body give `old` and `new` fragments, so they are re-runnable, but the body is not a tracked record and PR bodies are not durable. Recommendation: a one-line pointer from the record or a second record for `.9.1` and `abf8`, when `syzygy-bpyt.9.2` freezes the script. Not a blocker.
- [Observed] The PR body's rule-6 mutant 8 text (`return "directory-named" if dir_named else "none"` -> `return "none"`) occurs exactly once in the head script.

## Verdict basis

G1, G2 and G3 are closed and the totals re-derive by a second method with 0 differences. The exception is N1: the new class's precedence is the unpinned live-effective predicate that G1 asked to be pinned, and a regression there would pass hosted CI while reclassifying most of the index. Dispatch nothing further until the author adds the two fixtures; a bare CONFIRM would then be the expected outcome.

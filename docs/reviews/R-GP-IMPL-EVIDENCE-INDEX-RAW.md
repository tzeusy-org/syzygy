# Review: generated evidence index (syzygy-bpyt.9.1)
Verdict: REVISE
Reviewed commit: fb5fd0116afc0e64da55f3e2f78a98ac36ecf905
Subject: PR #710

Scope: the diff of `agent/syzygy-bpyt.9.1` over its merge base with `agent/syzygy-5pem` (`2a99baa0`): `scripts/build_evidence_index.py` (new, 433 lines), `docs/evidence/INDEX.jsonl` (5493 rows), the mutant record `docs/evidence/syzygy-bpyt-9-1-evidence-index-mutants-2026-11-04.json`, two `governance-docs.yml` steps, two `PROJECT-STATUS.md` battery lines plus the count sentence, and four dated stale marks in `docs/README.md`. The partition-check lines in the same diff come from `f59a2f16`, an earlier head of #705, and are not reviewed here. Reviewer: fresh context, a scratch clone at the head, TMPDIR `/tmp/r710`. Every command ran in the foreground. Labels follow AGENTS.md: `[Observed]` means run here, `[Inferred]` means reasoned and not run.

## Gates at the head

- [Observed] `python3 scripts/build_evidence_index.py --check`: `OK  docs/evidence/INDEX.jsonl current (5493 rows: act-bound 3, governed-citer 60, code-reference 50, raw-review-citer 210, docs-citer 83, evidence-only 4275, none 812)`. It takes 14.9 s wall time.
- [Observed] `--selftest`: `20/20 selftest cases pass`.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`. `--selftest`: `433 fixtures, 0 failing`.
- [Observed] `python3 scripts/check_docs_review_campaign_partition.py --check`: `partition PASS: denominator=696; assigned=696; raw=662; other=34; unmatched=0; overlaps=0; campaigns=118`. It takes 3:12 wall time.
- [Observed] The population is `git ls-files docs/evidence | wc -l` = 5494. That is 5493 rows plus the index itself, so the denominator matches.

## Findings

### F1 (revise): the `none` class is mostly files that a raw review binds by digest

- [Observed] 528 of the 812 `none` rows have their exact current sha256 as a 64-hex token in another tracked file. The sweep covered every tracked file except `INDEX.jsonl` and the row's own file, and it is keyed by digest, so this is a lower bound on paths.
- [Observed] 619 of the 812 rows are named by digest or by basename token somewhere in the tree. 193 are named by neither.
- The common shape is the reviewer's own retained-evidence table, which gives the basename and the digest. Examples:
  - `docs/reviews/R-GP-IMPL-SPREAD-LOOPS-1-RAW.md:368`: `| \`own-differential-default.json\` | \`0758cdcc…\` |`. The index classes `docs/evidence/spread-loops-review-2026-10-28/r1/own-differential-default.json` as `none`.
  - `R-GP-IMPL-OBJECT-ISO-HELPERS-1-RAW.md:483` does the same for `merge-tests.json`.
  - `R-GP-IMPL-EFFECTIVE-OPTIONS-1-RAW.md:583` does the same for `tools/matrix2.py`.
- The predicate misses all of these, and the docstring says so: a nested file is cited by its basename only from its own directory, and "a digest alone … counts only for `act-bound`". So the class is honest about its predicate. It is not honest about reliance.
- [Inferred] `syzygy-bpyt.9.2` (retention) is the consumer this index is built for, and `none` is the class it would read as "safe to retire". The README's new mark, "the index's `none` class lists the files no tracked file cites, by the predicate in its builder", will be read that way. About two thirds of that class is digest-bound evidence.
- Recommendation (not a redesign):
  - Treat a citer that carries P's current sha256 as citing P, classed by the citer's kind. `act-bound` already scans for digests, but only in governed files.
  - Or resolve a bare basename against the evidence directories that the citer names elsewhere in its own text.
  - Either way, re-derive the 812 and state the predicate change in the docstring.

### F2 (exception): `evidence-only` mostly means "appears in another review's path listing"

- [Observed] 2726 of the 4275 `evidence-only` rows are cited only by files ending `.txt`, `.bin`, `.diff`, `.log`, `.sha256` or `.jsonl`.
- The largest lone citers are:
  - `KEPT-FILES.sha256`: 669. This is a same-directory retention manifest, so it is a real reliance.
  - `main-changed-paths.txt`: 498
  - `main-moved-paths-f7ea8584.txt`: 439
  - `main-changed.txt`: 368
  - `main-moved-paths.txt`: 213
  - `main-since-base.txt`: 112
- The `main-*` files are `git diff --name-only` captures inside unrelated review directories. Sampled examples:
  - `docs/evidence/syzygy-bpyt-8-36/own-head.log` is cited only by two such listings, in `scratch-prefix-census-review-2026-10-27/` and `support-leaf-review-2026-10-27/`.
  - `docs/evidence/package-reader-timeouts-review-2026-10-25/r3/probes/EARLYS-np/head-150-1.json` is in the same position.
- One reviewer's capture of main's changed paths lifts hundreds of rows from `none` to `evidence-only`. It also moves classes on PRs that add no evidence citation on purpose (see F4).
- Recommendation: separate "listed in a captured path dump" from "cited". Excluding citers whose every line is a bare path would do it. The listings stay in the denominator.

### F3 (exception): the "0 uncited" mark is at the sentence, but it routes to an unlike predicate

- [Observed] Each of the four marks is placed at its sentence, quotes the superseded words, and is dated 2026-11-04 with the bead. The 2026-09-06 bracket stays as written, so the CG-27 lesson is met. The "0 uncited" mark is a sub-bullet directly under the `[Observed — swept 2026-09-06 …]` bracket.
- The mark says "re-derive the figure from `evidence/INDEX.jsonl` (class `none`)". The two figures do not measure the same thing:
  - The 2026-09-06 figure searched "each basename and stem across every tracked `.md`, `.py`, `.ts`, `.json`, `.yml`, `.txt` and `.sh` outside this directory".
  - `none` counts no stems. It counts a nested file's basename only from its own directory, and it counts citers inside `docs/evidence/`.
- "Some files are now cited by nothing" is asserted on the predicate that F1 shows to be wrong. Name the predicate difference in the mark, or say "not cited by the index's predicate".

### F4 (exception, workflow cost): about one PR in three would have tripped `--check`, and this PR is already stale

- [Observed] I replayed the builder (head bytes) over the last 30 first-parent merges on main, `d9f5fd86` through `e3ef7a6b`, and compared each merge's generation with its parent's.
  - 9 of 30 change the index: #661 (+6), #665 (+1, 2 changed), #677 (1 class change), #678 (1 changed), #679 (+6), #689 (+1, 1 class change), #681 (1 changed), #697 (1 class change) and #693 (+6).
  - Three of the nine change only a class or a digest, and add no evidence file.
  - The nine merged within about four hours on 2026-11-03/04. #679, #689 and #681 landed within 37 minutes of each other.
  - Separately, `gh pr list --state merged --limit 30` shows 8 of 30 PRs touching `docs/evidence/` directly.
- [Observed] Merging the PR head with current main and running `--check` gives `FAIL … unindexed: docs/evidence/syzygy-nyir/{after-alone,before-alone,before-full-1,before-full-2,measurement,timeout-sizing}.json`. Those are #693's files, merged after this PR's base.
- [Observed] #705 merged as `96b0bab7` with its final head `be4566e3`. That head adds two partition lines, `--check` and `--selftest`, and sets the sentence to "one hundred and fifteen". This PR's "114 → 116" was written against #705's earlier head `f59a2f16`. After the rebase, the count is 117, and the workflow and battery partition lines conflict with #705's final form.
- [Observed] The base has a merge queue: GraphQL `mergeQueue.url` is set, and `governance-docs.yml` runs on `merge_group`.
  - [Inferred] Rows are sorted by path, so two regenerated indexes usually merge as text without a conflict. The combined index is still stale whenever either PR adds an evidence file the other did not see, or a citer that changes the other's row. The queue's run then ejects the second PR, and it must be rebased and regenerated. This is the same race AGENTS.md records for the old partition count.
- [Observed] The population grew from 388 files at `dd520e8d` (2026-10-21) to 5494 at this head.
- Recommendation:
  - Keep the builder and its `--selftest` in the battery.
  - Generate the index on demand instead of committing it. The README would point to `python3 scripts/build_evidence_index.py --print`, or to a hosted-run artifact.
  - Freeze a snapshot only into the `syzygy-bpyt.9.2` retention packet, at the commit that packet names.
  - The bead's outcome text asks for a committed file kept current by `--check`. Changing that is for the coordinator or the owner's direction, not this review. Committing only `path`, `sha256` and `family` would remove the citer-driven trips, the three class-only trips above, but not the ones from added files.

### F5 (exception): four predicates have no fixture that kills them

These are my own rule-6 mutants. Each ran as `python3 <mutated copy> --selftest` at `fb5fd011`.

| mutant | old → new | selftest | live rows changed |
|---|---|---|---|
| self-citation discard | `hit.discard(citer)` → `pass` | survived (exit 0) | 148 (145 `none` → `evidence-only`, 3 `evidence-only` → `raw-review-citer`) |
| RAW before evidence | `citer_kind` checks `-RAW.md` before the evidence prefix → evidence first | survived | 16 (`raw-review-citer` → `evidence-only`) |
| index excluded as citer | `if citer == INDEX_PATH: continue` → `pass` | survived (the fixture index is never `git add`-ed) | [Inferred] every row; not run |
| version-tail loop | `stem = cut` → `return cut` | survived (no fixture has two tail tokens) | not run |
| no-such-file diagnostic | `for p in sorted(have - want)` → `for p in []` | survived; benign, because `--check` still fails on the byte comparison | n/a |
| trailing-dot strip | `{token, token.rstrip(".")}` → `{token}` | killed | n/a |
| `/`-suffix forms | suffix list → `[form]` | killed | n/a |
| odd-backtick parity | `% 2 == 1` → `% 2 == 0` | killed | n/a |
| Markdown commit regex | label renamed | killed | n/a |
| mode filter | `in ("100644","100755")` → `True` | survived; there are 0 symlinks or gitlinks in the tree, so nothing to pin | n/a |

- The PR's "self-citation does not count" case is vacuous: `fam/README.md` never names itself, so the case passes with the discard removed. 148 live rows depend on the discard.
- `citer_kind` classes a `-RAW.md` under `docs/evidence/` as `raw`. The docstring defines `evidence-only` as "cited only by other files under `docs/evidence/`", so a file cited only by `docs/evidence/polaris-understanding-reconciliation-2026-09-28/HISTORY-REVIEW-*-RAW.md` contradicts the docstring. That affects 16 rows.

### F6 (note): the wrapped-citation join is correct and has no live effect

- [Observed] Removing the join changes 0 of 5493 rows on the real corpus.
- An independent sweep looked for a citation that spans the break, with a 120-character window either side and `>` stripped from the head. It covered 10,639 odd-backtick line pairs and found 2 such citations:
  - `docs/evidence/syzygy-bpyt-4-5/tools/pin_identity_mutants.py:8`
  - `test-clocks-review-2026-10-27/r3/tools/build_record_mutants_r3.py:7`
  - Both cite `syzygy-bpyt-4-5/tools/build_record.py`. The join catches both, and that row is already `raw-review-citer` by another citer.
- One edge case: a token with leading dots, `...HISTORY-REVIEW-13-RAW.md` in `HISTORY-REVIEW-14-RAW.md:69`, is not stripped, because `rstrip` only strips trailing dots.

## Second method for the denominator and the classes (rules 2 and 9)

- [Observed] The second method used ripgrep fixed-string substring matching (`rg -F -o -f`) over every tracked file except the index. The patterns were 9511: each row's path under `docs/evidence/` and its basename. A hit counted when `docs/evidence/<match>` was a row, or when the match resolved against the citer's directory. The same class order was applied.
- The two methods agree on 5457 of 5493 classes. All 36 differences are explained:
  - 18 `none` → `evidence-only` are substring false positives, such as `/tmp/…/merge-tests.json` inside a `.log` and a scratch `packages/…/zz-review-cost.test.ts` path.
  - 16 `evidence-only` → `none` are dir-relative subpaths (`r2/OFFERING.txt` from `RETENTION.json`) that the second method did not model. The builder is right on these.
  - 2 are the leading-dot edge in F6.

## Spot checks: 21 rows, 3 per class, `random.seed(710)`, each verified by `git grep -F`

- `act-bound`, all 3 rows (`polaris-generator-approval-offer-2026-09-12.json`, `launch-gate-v2.5/APPROVAL-MANIFEST.json`, `polaris-understanding-adoption-manifest-2026-09-13.json`): the digest is in `.syzygy/governance/decisions/` (`ACCEPTANCE-ACT-RECORD.md`, the act files, `LAUNCH-GATE-V2.5-AUTHORITY-DECISION.md`). Correct.
- `governed-citer` (`pwb-p2-7-model-mutation-run-2026-09-04.json`, `polaris-m2-evidence-currency-funnel-2026-09-14.json`, `pwb-p4-2-mutation-sweep-2026-09-06-parity-markers.json`): each is cited by a `contracts/candidates/pwb-*/IMPACT-LEDGER.md`. Correct.
- `code-reference`:
  - `syzygy-bpyt-4-31/repair-durations/production-reobserve.test.tests.json` is cited by `apps/three-surface-poc/src/production-reobserve.test.ts`.
  - `polaris-m7-literal-mutations-2026-09-23.json` is cited by `scripts/run_m7_literal_mutations.mjs`.
  - `syzygy-bpyt-6-3/dc3-decode-and-canonical-json-2026-10-25.json` is cited by `canonical-json-divergence.test.ts` and `AGENTS.md`.
  - Correct.
- `raw-review-citer`:
  - `pwb-p3-6-narrative-mutation-run-2026-09-04.json`: a raw cites it. Other citers are docs and evidence, and none is governed or code.
  - `polaris-m5-agent-briefing-funnel-2026-09-14.json` is cited by `R-POLARIS-M5-AGENT-BRIEFING-FUNNEL-2/3-RAW.md`.
  - `syzygy-bpyt-16/crlf-differential.mjs` is a raw citer by relative path.
  - Correct.
- `docs-citer` (`cap1-dead-planes-round-1-dispositions-2026-10-22.md`, `p114-machine-ceiling-install-2026-10-21.md`, `p100-restoration-review-binding-2026-10-21.json`): cited by `docs/review-campaigns/*.md` or `PROJECT-STATUS.md`. Correct, by the predicate. One caveat: `PROJECT-STATUS.md` is root Markdown, so it is a docs citer.
- `evidence-only`:
  - `syzygy-bpyt-4-31/hook-tool-validation/record.json` is cited by its sibling `check.json` and by listings.
  - `syzygy-bpyt-8-36/own-head.log` and `package-reader-timeouts-review-2026-10-25/r3/probes/EARLYS-np/head-150-1.json` are cited only by listings (F2).
  - Correct by the predicate.
- `none`:
  - `consent-act-families-review-2026-10-22/row-spec.json` is named by basename in `consent-act-families-round-1-dispositions-2026-10-22.md:33`, and as `out/row-spec.json` in `R-GP-IMPL-ACT-FAMILIES-1-RAW.md:394`.
  - `spread-loops-review-2026-10-28/r1/own-differential-default.json` and `r2/selftest-relative.json` are digest-bound in `R-GP-IMPL-SPREAD-LOOPS-1-RAW.md` and `-2-RAW.md`.
  - All three are right by the predicate and are the F1 false absence.
- Fields: 204 rows carry `subject`, 1264 `commit` and 24 `verdict`. The families match the bead's audit examples: `pwb-p4-5-fresh-checkout-demo` 27, `polaris-generator-rfc7-coverage` 5, `polaris-admission-reader-mutants` 5.

## Disposition asked

- Revise F1. The class that retention will read must not label digest-bound evidence `none`.
- Rebase onto `96b0bab7`: the count becomes 117, and #693's six files must be indexed.
- Decide F4's committed-file question with the coordinator before the next round.
- F2, F3 and F5 can land in the same revision.

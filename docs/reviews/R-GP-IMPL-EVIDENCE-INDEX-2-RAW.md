# Review round 2: generated evidence index (syzygy-bpyt.9.1)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 48ba975238f76f5540a9ca4142557f0f6d074a1d
Subject: PR #710 (round 2)

Scope: the diff of `agent/syzygy-bpyt.9.1` at `48ba9752` over its base `96b0bab7` (current `main`): `scripts/build_evidence_index.py` (new, 510 lines, sha256 `df9532ddd81855a58e000f6294e1cc4ebba3c2892d20b9c4df029e077b7a92b5`), the mutant record `docs/evidence/syzygy-bpyt-9-1-evidence-index-mutants-2026-11-04.json`, one `governance-docs.yml` step, one `PROJECT-STATUS.md` battery line plus the count sentence, and the `docs/README.md` route and four dated stale marks. Round 1 is `R-GP-IMPL-EVIDENCE-INDEX-RAW.md` (REVISE over `fb5fd011`, F1-F6). Reviewer: fresh context, a scratch clone at the head, TMPDIR `/tmp/r2710`, every command in the foreground. `[Observed]` means run here; `[Inferred]` means reasoned and not run.

## Gates at the head

- [Observed] `python3 scripts/build_evidence_index.py --summary`: `5499 rows: act-bound 3, governed-citer 60, code-reference 51, raw-review-citer 211, docs-citer 83, digest-cited 4102, evidence-only 507, listed-only 219, none 263`. This matches the coordinator's figures. The build takes 16.3 s.
- [Observed] `--selftest`: `26/26 selftest cases pass`.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`. CG-26: `116 checks examined, 0 findings — 116 published, 116 hosted, 116 shared`.
- [Observed] `python3 scripts/check_governance.py --selftest`: `433 fixtures, 0 failing`.
- [Observed] `python3 scripts/check_docs_review_campaign_partition.py --check`: `partition PASS: denominator=705; assigned=705; raw=671; other=34; unmatched=0; overlaps=0; campaigns=118`, and its second method gives `git ls-files=705; git ls-tree=705`.
- [Observed] Population: `git ls-files -s docs/evidence` lists 5499 entries (5495 mode 100644, 4 mode 100755, no symlink or gitlink). That equals the row count.
- [Observed] The mutant record's `subjectSha256` equals the head script's sha256. Its `commit` is `005c73ad`, and `git diff 005c73ad 48ba9752` does not touch the script. It holds 18 mutants, each with `old`, `new`, `exitCode` and `killed`, and all 18 are `killed: true`.

## Round-1 findings

- F1 closed. [Observed] The new `digest-cited` class takes any full 64-hex digest citation from a non-governed citer, and it sits above `evidence-only`. 0 of the 263 `none` rows have their full sha256 as a case-insensitive substring of any tracked file (`git grep -F -i -o -f` over all 263 digests). The docstring states the predicate change under "Digest citation" and in the class list.
- F2 closed. [Observed] The new `listing` citer kind and the `listed-only` class split captured path dumps from citations. A `KEPT-FILES.sha256` manifest (hash plus path on each line) is not a listing, so its reliance still counts.
- F3 closed. [Observed] The "0 uncited" sub-bullet now names the index's predicate: path token or full sha256, citers inside `docs/evidence/` and path dumps counted, no stem, no truncated digest. It says the two figures are "not comparable" and that a `none` file is "uncited by that predicate, not proven unused". The 2026-09-06 bracket stays as written. The other three marks quote their sentence and are dated 2026-11-04 with the bead.
- F4 closed. [Observed]
  - `git grep -F INDEX.jsonl` returns nothing at the head. No tracked `.jsonl` is a row-key snapshot, since my second method's snapshot detector skipped 0 files.
  - `--check` is gone (`error: unrecognized arguments: --check`).
  - The only CI reference is the `--selftest` step at `governance-docs.yml:407-408`, and the battery line is `PROJECT-STATUS.md:472`. Neither regenerates anything.
  - The base is current `main` (`96b0bab7`, #705's final head merged), and the count sentence is 116, which CG-26 confirms. No merge can make a committed index stale.
- F5 closed for the round-1 mutants. [Observed] The PR record kills every round-1 survivor that mattered: `hit.discard(citer)` → `pass`, the `-RAW.md`-under-evidence order, snapshot exclusion → `if False`, `stem = cut` → `return cut`, and the mode filter → `if True` (a symlink fixture now exists). The no-such-file diagnostic left with `--check`. New survivors are in G1.
- F6 closed (note). The leading-dot token is now listed under "Not a citation" in the docstring.

## Second method for the class totals (rules 2 and 9)

- [Observed] I wrote `/tmp/r2710/tools/second.py` from the docstring alone, without importing the builder.
  - Digest citations come from `git grep -I -o -i -P` (PCRE, a different engine) over the whole tree.
  - Path citations come from my own tokenizer, `/`-suffix walk, citer-dir resolution and odd-backtick join.
  - Citer kinds, snapshot exclusion and class order are re-implemented.
- [Observed] Result over the same 5499 paths: identical totals and **0 row differences** (`digest-cited 4102, evidence-only 507, none 263, listed-only 219, raw-review-citer 211, docs-citer 83, governed-citer 60, code-reference 51, act-bound 3`).
- [Inferred] Both implementations follow one docstring, so the agreement shows that the code matches its stated predicate. It does not show that the predicate is complete. The `none` sweeps below and G2 cover that.
- [Observed] A third, cruder method: fixed-string `git grep -F -o` of every `none` row's evidence-relative path over all tracked files gives 0 rows hit outside the file itself, and the full-digest sweep gives 0.

## Spot checks: 10 `digest-cited` and 10 `none`, `random.seed(7102)`, each by `git grep -F`

`digest-cited` rows. Each has its full digest in at least one other file, and every one is a real binding.

| row | digest citer |
|---|---|
| `package-reader-timeouts-review-2026-10-25/r3/probes/G-np/head-150-1.json` | `r3/KEPT-FILES.sha256` |
| `test-timeouts-review-2026-10-27/r1/tools/below_default.py` | `R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md` |
| `spread-loops-review-2026-10-28/r1/md-list.bin` | `R-GP-IMPL-SPREAD-LOOPS-1-RAW.md` |
| `launch-form-postcondition-review-2026-10-22/tools/compare.py` | `shared-mutation-runner-authorization-2026-10-29/r2/consumer-sweep.json`, plus one more |
| `support-leaf-guards-review-2026-10-28/r3/tools/fidelity_r3.py` | `R-GP-IMPL-SUPPORT-LEAF-GUARDS-3-RAW.md` |
| `package-reader-timeouts-review-2026-10-25/r2/tools/summarize_probes.py` | `r2/KEPT-FILES.sha256` |
| `package-reader-timeouts-review-2026-10-25/r3/probes/LOCKN/head-None-1.json` | `r3/KEPT-FILES.sha256` |
| `skipped-population-review-2026-10-25/run-full-2.json` | `kept-files-sha256.txt`, plus one more |
| `argv-fail-closed-review-2026-10-25/start-gates-durations.json` | `R-GP-IMPL-ARGV-FAIL-CLOSED-1-RAW.md` |
| `p115-implementation-authorization-2026-10-28/OWNER-ANSWER.json` | `RETENTION.json` |

`none` rows. Each has 0 digest citers and 0 files containing its evidence-relative path.

- 7 rows have 0 basename hits anywhere:
  - `island-decoupling-review-2026-10-22/tools/notice.py`
  - `capture-test-artifact-no-spawn-mutants-z774-2026-10-07.json`
  - `pwb-m11-status-role-evidence-2026-09-23.json`
  - `poc-restart-stale-fixture-audit-2026-09-23.json`
  - `polaris-keyboard-sweep-throttle-mutation-2026-10-03.json`
  - `contract-index-projection-mutants-2026-10-03.json`
  - `dossier-engine-252-mutants.json`
- `island-decoupling-review-2026-10-22/tools/bound.py`: the one basename hit is `r2_bound.py` in `R-ARBITRARY-PUBLIC-REPO-2-RAW.md:15`, which names a different file. Correct.
- `syzygy-bpyt-7-1/README.md`: the basename hits are other READMEs, and no tracked file outside the directory names `syzygy-bpyt-7-1`. Correct by the predicate.
- `syzygy-bpyt-6-5/differential-2026-11-03.json`: `R-GP-IMPL-PWB-ONE-BLOB-READER-CAPTURE-1-RAW.md:8` names it by bare basename ("the parent record `differential-2026-11-03.json`") from outside its directory. The docstring lists this as not a citation, so the row is right by the predicate. It is still a reliance, which is the residue described in G2.

## Findings

### G1 (exception): five live-effective predicates have no fixture that kills them

These are my own rule-6 mutants, each run as `python3 <mutated copy> --selftest` at `48ba9752`, with the live effect measured as a full build of the mutant against the head tree. Each `old` fragment occurs exactly once in the script.

| mutant | old → new | selftest | live rows changed |
|---|---|---|---|
| digest above evidence | `if digest_kinds: return "digest-cited"` moved below the `("evidence", "listing")` loop | **survived** | **3552** (2108 `digest-cited` → `evidence-only`, 1444 → `listed-only`) |
| listing needs every line bare | `all(BARE_LINE.match(line)` → `any(BARE_LINE.match(line)` | **survived** | **85** (`evidence-only` → `listed-only`) |
| `openspec/` is governed | `GOVERNED_PREFIXES = (".syzygy/", "openspec/")` → `(".syzygy/",)` | **survived** | 2 (`governed-citer` → `raw-review-citer` 1, → `code-reference` 1) |
| JSON subject object path | `elif isinstance(s, dict) and isinstance(s.get("path"), str):` → `elif False:` | **survived** | 16 (`subject` field only) |
| first commit key wins | `commit = v` + `break` → `commit = v` | **survived** | 2 (`commit` field only) |
| hex lookbehind | `(?<![0-9a-fA-F])` removed | survived | 0 |
| hex lookahead | `(?![0-9a-fA-F])` removed | survived | 0 |
| snapshot key set | `or set(row) != ROW_KEYS` removed | survived | 0 (no `.jsonl` of row-key objects is tracked) |
| snapshot suffix | `if not path.endswith(".jsonl"): return False` → `if False:` | survived | 0 |
| root non-`.md` is code | ` or ("/" not in path and not path.endswith(".md"))` removed | survived | 0 |
| `.github/` is code | `.github/` dropped from `CODE_PREFIXES` | survived | 0 |
| odd-backtick parity | `if line.count("`") % 2 == 1:` → `if True:` | survived | 0 |
| Markdown verdict `*` strip | `.strip("*").strip()` removed | survived | 0 |
| trailing-dot strip | `{token, token.rstrip(".")}` → `{token}` | killed | n/a |
| `/`-suffix forms | suffix list → `[form]` | killed | n/a |
| citer-dir resolution | `if citer_dir:` → `if False:` | killed | n/a |
| any digest is act-bound | `if "governed" in digest_kinds:` → `if digest_kinds:` | killed | n/a |
| date cut | `if m: stem = stem[: m.start()]` → `if False:` | killed | n/a |

- The first row is the precedence that closes F1. The docstring states it ("It sits above the evidence classes because a stored digest binds bytes"), and it decides the class of 3552 of 5499 rows. No fixture holds a file that is both path-cited by an evidence citer and digest-cited. The PR's mutant `if digest_kinds:` → `if False:` is killed only because `digest-2026-01-01.json` and `fam/r1/nested.json` have no other citer.
- The second row is F2's listing rule. No fixture has a file under `docs/evidence/` that mixes bare-path lines with prose lines.
- [Inferred] The index is not committed and only `--selftest` runs in CI. So the selftest is the only guard on these predicates, and a regression in either of the first two would pass hosted CI while it reclassified most of the population that `syzygy-bpyt.9.2` will freeze.
- The zero-effect survivors are noted for completeness. They are not asked to be fixed in this round.
- Recommendation: add one fixture file that is both digest-cited by a `KEPT`-style manifest and path-cited by an evidence citer (expect `digest-cited`), and one `docs/evidence/` file with a path line plus a prose line (expect its target to be `evidence-only`). An `openspec/` citer case would kill the third row.

### G2 (exception): a directory-level citation is neither counted nor listed as excluded, and it covers about half of `none`

- [Observed] Of the 263 `none` rows, 151 are nested.
  - For 140, some other tracked file names an ancestor directory as a token, either `docs/evidence/<dir>` or `<dir>`, with a trailing `/` or `.` stripped. Example: `consent-act-families-round-1-dispositions-2026-10-22.md` names `consent-act-families-review-2026-10-22/`, and 8 of that directory's files are `none`.
  - For 66, the basename is a token in another file.
  - 120 rows have neither.
- The docstring's "Not a citation, by this predicate" list names stems, run-time paths, globs, `../` misses, cross-directory basenames and leading-dot tokens. It does not name a citation of the containing directory. So a reader of `none` cannot tell from the stated predicate that "this review's evidence lives under `<dir>/`" was ignored.
- [Inferred] This is the F1 direction again (`none` read as retirable), at smaller scale. It is acceptable by the predicate, but it must be stated.
- Recommendation: add "a citation of a containing directory" to the docstring's not-a-citation list, and to the README's `none` mark. Counting it is optional, perhaps as its own class below `listed-only`.

### G3 (note): a digest citation binds bytes, so identical files share it

- [Observed] 171 digests are shared by 395 rows, and 373 of those rows are `digest-cited`.
- The 9 empty files (`e3b0c442…`) are all `digest-cited` because the empty-input digest appears in 40 unrelated records, for example `pwb-p4-5-fresh-checkout-demo-2026-09-04.json` and `p115-implementation-authorization-2026-10-28/MANIFEST.json`.
- [Observed] Over the 4102 `digest-cited` rows, 18 have no digest citer inside their own family directory and no digest citer that names their basename. 7 of the 18 are in a shared-digest group.
- [Inferred] The error runs conservative: it overstates reliance and keeps files. A sentence in the docstring that a digest citation is per byte content, not per path, would let `syzygy-bpyt.9.2` discount it. No change is required.

## Disposition asked

- F1-F6 are closed.
- G1: add the two or three fixtures so the precedence and listing predicates are pinned. They are cheap and need no redesign.
- G2: state the directory-citation exclusion in the docstring and the README mark.
- G3 needs no action beyond an optional sentence.
- None of G1-G3 changes a class total at this head.

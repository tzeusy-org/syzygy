# R-GP-IMPL-CAP1-OVERLAY-RECONCILE-1 — CC-REV-1 implementation review of syzygy-5oqc (CAP1 consent overlay composed into spec reconciliation R3/R4/R5), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 2bfc37ded2a7d74c7d0bd3521fcd3db06d848c55
Subject: PR #634

Reviewer: fresh-context beads-pr-reviewer-worker (syzygy-hobx). Merge base ea2c5889; six files, +1126 -24; four commits (`ad9cf65a`, `5c329704`, `b4410248`, `2bfc37de`).

## Method

- Scratch detached worktrees at `2bfc37de` (one for the gates, one for mutants), at `origin/main` `ea2c5889` (cascade control) and at the frozen P115 core `da9fde04`; TMPDIR `/tmp/r634`.
- `python3 scripts/check_spec_reconciliation.py --check` at the head: exit 0, "7 of 7 predicates without FAIL; PASS". R3 121 examined, 0 findings; R4 2305 examined over 88 files, 0 findings; R5 51 examined, 0 findings; R6 WARN 2 (the two pre-existing PWB pins, `syzygy-2g0d`).
- `python3 scripts/check_spec_reconciliation.py --selftest` at the head: exit 0 in 23:32, "SELFTEST PASS: clean scratch copy and its signed- and adopted-addition variants pass; 102 of 102 mutants killed by their expected predicate (commit 2bfc37ded2a7)". All 17 `cap1-overlay-*` rows say `killed`.
- `python3 scripts/check_governance.py` at the head: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `gh pr checks 634`: checks, node, node (unit), node (integration), node (e2e) all pass at the head. The `checks` job includes the `prepare_three_surface_poc_governedby_reference_recording --check` and `--selftest` steps, both success.
- Unresolved review threads on the PR: 0.
- Act-binding sweep: each of the six changed paths hashed at `origin/main` and at the head, and every tracked file grepped for both digests and for the path in `*MANIFEST*` files. No changed path is under `.syzygy/` or `openspec/`. `PROJECT-STATUS.md`, the evidence `README.md`, `census.json` and `selftest-witnesses.json`: 0 citers of either digest. `scripts/check_spec_reconciliation.py` (old digest: 6 citers) and `scripts/prepare_three_surface_poc_governedby_reference_recording.py` (old digest: 5 citers) are cited only by evidence snapshots under `docs/evidence/p115-implementation-authorization-2026-10-28/` and `docs/evidence/shared-mutation-runner-authorization-2026-10-29/refresh/`. Those records stay unchanged and keep describing the bytes they name. Neither script is an owned file of the P115 direction's `OWNED-FILES.json`, and neither is a row of any performed act's manifest. The governed inputs the checker reads (the bound CAP1 spec, the overlay change directory, the v1.0 sign-off record) are byte-identical between `origin/main`, the head and the frozen P115 core `da9fde04`.

## Independence of methods A and B

[Observed] Method A (`compose_cap1_by_id`, `scripts/check_spec_reconciliation.py:1127`) parses the bound file and the overlay separately with `parse_regex`, then replaces dictionary entries by identifier. Its guards are `_cap1_overlay_guard_regex`, `_foreign_headings_regex` and `_header_problems_regex`. Method B (`compose_cap1_by_text`, `:1172`) uses no regular expression. It splits at LF keeping terminators, finds blocks with `startswith("### Requirement: ")`, splices the overlay's lines into the bound text, and parses the spliced bytes with `parse_manual`. Its guards are the `_manual` siblings. They share no parser and no guard. They meet in three places: the parsed populations must be equal (`:1229`); B's bytes must hash to `composed_spec_sha256`; and both results must equal the literal census.

Reviewer code mutants confirm each side is load-bearing:
- C1: method B's splice replaced by `pass`. R3 FAIL, with "the two overlay compositions disagree" and "composed bytes do not hash".
- C2: method A's `comp[ident] = req` replaced by `pass`. R3 and R4 FAIL, with the disagreement, "42 requirements / 47 scenarios, expected 42 / 57", and R4 `requirement_count`.

## Termination only under the v1.0 sign-off and tag

[Observed] `cap1_overlay_signed` (`:1203`) is one gate in front of both methods. It requires `addition_records` to return exactly `[(CAP1-TRUSTED-BOOTSTRAP-CONSENT-SIGNOFF-v1.0.md, "1.0")]`, and that record to carry the line `Tag: cap1-trusted-bootstrap-consent-v1.0`. Otherwise `compose_cap1` counts the bound file alone and emits a finding, so R3 fails twice over: the finding itself and the literal 42 / 57. Reviewer input mutants:
- M4: an extra v1.1 record. R3 and R4 FAIL, "sign-off records [...], expected exactly".
- M9: the `Tag:` line removed. R3 and R4 FAIL.
- C3, a control: the tag condition dropped from the gate while the M9 input is kept. Exit 0, so the tag test is the only thing that kills M9. The PR's own `cap1-overlay-wrong-tag` mutant pins it.

## Reviewer rule-6 input mutants (all at the head, `--check`)

All eleven fail the check (exit 1):

| Id | Mutation | FAIL |
|---|---|---|
| M1 | overlay renames the CAP1-REQ-011 title | R1 R2 R3 R4 (digest, census.json drift) |
| M2 | overlay appends a third block CAP1-REQ-012 | R1 R2 R3 R4 ("overlay replaces" in A and B) |
| M3 | overlay blocks swapped (046 before 011) | R1 R2 R3 R4 ("overlay replaces" in A and B) |
| M4 | extra v1.1 sign-off record | R3 R4 |
| M5 | overlay header `-` for ` — ` on 046 | R1 R2 R3 R4 |
| M6 | overlay 046 header indented one space | R1 R2 R3 R4 |
| M7 | `GOVERNING-DEPENDENCIES.json` deleted | R3 R4 |
| M8 | bound file: prose inserted before CAP1-REQ-012 | R1 R2 R3 R4 |
| M9 | sign-off record `Tag:` line removed | R3 R4 |
| M10 | overlay: one extra scenario in 046 | R1 R2 R3 R4 (58 vs 57) |
| M11 | overlay level-1 title removed | R1 R2 R4 (prose outside blocks; R3 correctly unaffected) |

A reviewer control at `origin/main`: M8 there also prints "POC: per-requirement census differs from the literal at [('014', 2), ('014', 8)]". That cascade is pre-existing and is not introduced by this PR.

## The P115 selftest edit — GP-Q0 judgment

[Observed] The edit (`scripts/prepare_three_surface_poc_governedby_reference_recording.py:2555-2568`) is inside `selftest()` only. The script's `--check`, preview, apply and recording paths are byte-unchanged. It adds one expectation and then rewrites `census.json` inside the throwaway clone of `da9fde04`. The expectation requires three things: the family set equals the frozen one; families that differ ⊆ {CAP1}; and R3's findings are `[]` or exactly the census-drift sentence. The existing "candidate reconciliation and baseline census pass" case then runs on the regenerated census, where the literal per-requirement CAP1 counts (011: 8, 046: 4, totals 42 / 57) still bind.

Reviewer emulation of that predicate on a `da9fde04` worktree carrying the seven current tools:
- control: passes, diff `['CAP1']`;
- a POC scenario count changed in the frozen census: refused (diff `['CAP1','POC']`);
- a PWB family member added: refused (`['CAP1','PWB']`);
- the POLARIS family dropped: refused;
- one extra scenario appended to the frozen tree's overlay: refused (R3 carries the 58 / 57 literal and digest findings, not only the drift sentence).

What it gives up is one comparison: the frozen CAP1 census bytes against the current regeneration. That comparison became false by construction once the bead changed the census, and the frozen CAP1 inputs are byte-identical to the head's. Nothing any gate accepts or refuses on a real input changes; no rendered byte, wire format, refusal string, exit code or digest-bound artifact changes. Without the edit, the selftest's exit code would be a false failure. Under the reading recorded in `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` (GP-Q0 Part 1), this is **not a GP-Q0 owner question**. The census change it accommodates is the outcome the owner-filed bead `syzygy-5oqc` itself states.

## Exceptions

- **E1 — the witness commit is reachable from no ref.** `selftest-witnesses.json` names `"commit": "0bc07cc4da316add6ddbb157fedf4562613306c3"`. That is the pre-rebase twin of `5c329704`, and `git merge-base --is-ancestor 0bc07cc4 HEAD` fails. The checker blob is identical at both (`0c0a6fb11c7d84b85cf8c8208a9ee600830182b9`), as are `openspec/`, `.syzygy/` and `census.json`, so the 102 rows re-run at the head. Still, the record names a commit a later reader cannot fetch (the AGENTS.md rule-6 evidence note; rule 11). Re-run the witnesses at a reachable commit, or add the checker blob digest beside the commit. Evidence prose only; no gate changes.

## Notes

- N1: the disagreement finding (`:1229`) reports only requirement counts ("42 vs 42 requirements") when the populations differ in scenarios, as C1 and C2 show. It fails correctly, but the message names no difference.
- N2: method B's span reader takes the identifier as the text before ` — `. On a non-canonical header (M5) it reports the whole header with its newline as the "identifier". This is cosmetic, and both methods refuse.
- N3: method B splices with the same rule as the adoption builder's `compose` (`scripts/build_cap1_trusted_bootstrap_consent_adoption.py:116`: each block runs to the next requirement header). So the digest match shows two implementations agree, not two algorithms. The independent comparison is A against B. The record's "third method" wording for the `ADOPTION.md` figure is accurate as a separate program.
- N4: the checker refuses a reordered overlay (M3), which the builder would accept (`sorted`). This is stricter in the fail-closed direction and is noted only.

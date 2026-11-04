# Review: reconciliation nonregular sign-off entries (PR #714, syzygy-j5dg), round 3
Verdict: REVISE
Reviewed commit: cba689c2515c5b7f2fa51ab0747c1ca878fbffd9
Subject SHA-256: 00da7bc98a88281779e19f7834beda43b09be9dc09fb63f16303e2ca21c8939b

Subject: the exact bytes of `scripts/check_spec_reconciliation.py` at the reviewed commit, PR #714. Reviewer: fresh independent Codex reviewer, review lane `syzygy-gidd`, authenticated GitHub identity `Tzeusy`, 2026-11-04. I did not author or repair this source and made no semantic changes.

[Observed] The prepared local branch, remote PR head and reviewed source agree at the commit above. Preparation reported `rebased=false`, `rebase_reason=not-needed`, no cleanup and no push. The implementation diff against fetched main is one file, +352 / -7. The parity baseline is main `99040a5ce7096b07a753a792ba530cf7260551a9`, whose checker SHA-256 is `2f75bb22cae10696a517d7587c5a8bba266f8e1259187408ee094e9d48affa78`. Fetched main `4abf98ad828f358bc854154bb4fce0ff724a3590` has exactly that same checker digest. `code-subjects.json` in the evidence directory below binds these identities.

The acceptance criterion is: nothing main accepts changes; only crashes/hangs become refusals. Governing references read: CC-REV-1 and CC-REV-6; GP-Q0 parts 1 and 3; CC-TEST-1, CC-TEST-2 and CC-TEST-6; the engineering bar; and the doctrine's trust-and-evidence rules. GP-Q0's operative stop clause says: “Any change not listed here to what a gate accepts or refuses stops and returns to the owner.” This review treats the authority-record gate as CC-REV-1 class 1, its filesystem refusal policy as class 4, and its CLI/import behavior as class 6. It does not authorize a new admission policy.

## F6 — verdict-changing: a finite-writer FIFO changes from accepted to refused

[Observed] The unconditional FIFO branch at `scripts/check_spec_reconciliation.py:499` refuses every FIFO before reading it. A FIFO with an active writer that supplies a finite UTF-8 stream need not hang. Main reads such an entry successfully; the head refuses it.

I reproduced this independently at the real CLI, using two clean clones pinned to the baseline and reviewed commits above. Each clone received a real FIFO at `.syzygy/governance/decisions/J5DG-FINITE-SIGNOFF-v1.0.md`. An independent producer writes `A finite stream naming no package.\n`, closes its descriptor to provide EOF, waits for the reader's close event, and then supplies the same finite stream for the next read. The producer uses Linux inotify to avoid reopening before the previous reader closes. No checker function is replaced, mocked or changed.

| Mode | Main | Reviewed head |
|---|---|---|
| `--check` | exit 0; `7 of 7 predicates without FAIL; PASS` | exit 1; `REFUSED R1`; empty stdout |
| `--census` | exit 0; census JSON | exit 1; `REFUSED R1`; empty stdout |
| `--regenerate` | exit 0; no output or change needed | exit 1; `REFUSED R1`; empty stdout |

[Observed] The six runs completed without producer errors. Each clone's Git status was empty after removal of the synthetic FIFO. The baseline `--check` completed in about 10.5 seconds; the other two baseline modes each completed in under one second. The head's check completed in about 9.1 seconds and its other modes in under one second. These baseline runs neither crashed nor timed out.

[Observed] A separate minimal library counterexample agrees: with a finite writer supplying `Package: finite-stream-control\nVersion: 1.0\n`, main's `addition_records(root, "finite-stream-control")` returns the path, exact text and version `1.0`. The head raises `SignoffEntriesRefused` for the same entry. This is an accepted-input change on the import path too.

[Inferred] The current corpus misses this boundary because its FIFO case has no writer. That case correctly demonstrates a hang-to-refusal change, but cannot establish parity for FIFOs that successfully deliver a finite stream. `ENTRY_KIND_CASES` likewise creates a FIFO without a writer. The docstring's claim that a FIFO's read blocked is therefore too broad.

This is a current-outcome acceptance failure under the assigned criterion, not a request to invent another filesystem policy. It also reaches GP-Q0's stop clause. The unresolved finding is recorded at https://github.com/tzeusy-org/syzygy/pull/714#discussion_r4466932598. The final authorized repair/review cycle is exhausted; this review does not authorize another repair. The owner must disposition F6 before further implementation or acceptance-changing work.

## Prior findings and existing evidence

[Observed] Round-2 F5 is repaired at this head. Outside CLI collection, non-FIFO reads still call `path.read_text(encoding="utf-8")` directly, so native `OSError` subclasses and `UnicodeDecodeError` propagate unchanged. The existing consumer's exact-class/filename boundary is preserved. CLI collection catches native read errors and emits structured refusal; it restores its collection flag in `finally`.

[Observed] I independently enumerated imports across 1,050 tracked Python files using the AST, with each file parsed successfully, and confirmed the result with a Git text sweep: two in-process consumers and six import sites. They are `scripts/install_redis_sitting.py` (lines 590 and 1784) and `scripts/prepare_three_surface_poc_governedby_reference_recording.py` (lines 1794, 2039, 2100 and 2474). The broader retained textual census has 11 files, including prose and subprocess invocations; those are not eleven in-process consumers. I inspected the actual preparer handlers that admit only the fixture's `OSError` filename, plus the installer's reconciliation calls.

[Observed] Retained installer selftest output ends `selftest: 147 of 147 predicates held`. The required preparer selftest and check passed in hosted governance CI. Its signed replay explicitly names the current checker digest from this review. The optional local duplicate preparer run was stopped and is correctly labeled partial; I did not count it as a passed gate.

[Observed] I checked the retained 19-case by three-mode differential, its harness and subject bindings. Recounting the 57 JSONL rows by `Counter` and a separate per-category sum gives 39 `IDENTICAL`, 15 `crash->REFUSED`, and three `both-crash` rows. There is one row per case/mode pair; the 57 recorded tree comparisons match. The ordinary controls include the clean tree, a regular-file symlink, `/dev/null`, CRLF and an empty regular entry. The negative controls include a symlink/hardlink to a real record under another version name: `--check` remains exit 1 on both subjects while census and regeneration retain their previous behavior. The five crash/hang-to-refusal cases are directory, directory symlink, FIFO symlink without writer, non-UTF-8 and UTF-16 BOM. The shared crashes are the three `/dev/zero` rows, retained as a disclosed remainder, not counted as refusals. None of these nineteen cases supplies a finite writer to a FIFO.

[Observed] The recovery manifest's 37 file digests and sizes match their retained bodies. I confirmed each digest a second way with `sha256sum`, independently of Python's hashlib. This validates the retained bytes, not an inference of corpus completeness. F6 supplies the missing accepted-input counterexample.

## Hosted gates and test review

[Observed] I fetched the two hosted run records independently through GitHub. Both name exact source head `cba689c2515c5b7f2fa51ab0747c1ca878fbffd9` and conclude success:

- Governance run `41817084635`: one job, 123 steps, each successful. Its retained audit accounts for the 117 explicitly named workflow steps plus the action/setup/post steps.
- Node run `41817084683`: four jobs, 37 steps, each successful. Required PR checks `node`, `node (unit)`, `node (integration)`, `node (e2e)` and `checks` are successful.

[Observed] CI tests PR merge checkout `1e53c50f5f6b4b864d03fe2efdfc7d9b72ac1e1f`, merging this exact source head into `1f05489d749bc9dbc333b6ea0b29edd83b6dab45`; it is not a direct source-head checkout. The hosted selftest replay identifies the reviewed checker digest. Reconciliation selftest output records 111 of 111 mutants killed and three of three controls held. The governance check reports 32 OK, 21 WARN and 0 FAIL over 53 checks. I inspected the retained output and remotely fetched job/step records rather than rerunning unchanged passing hosted gates.

[Observed] The PR states `Tests: +12 ~0 -0`, matching nine kind fixtures and three accepted-input controls added to the existing selftest. The CLI polarity check exercises actual `main` calls; the library checks exercise real consumer-visible exceptions. These are behavior assertions, not source-string tests. The test population has a meaningful missing case, F6, despite its passing outcomes. No new Node tests were added in this diff.

## Retained independent evidence

Evidence root: `/home/orca/.tmp/syzygy-gidd-r3-review/`.

- `finite-fifo-cli.py`: runnable real-CLI producer/reproducer, SHA-256 `30d0a5524c881efe64d9da937e6d247785eff269fd35002fb6efc163e885e93b`.
- `finite-fifo-cli.json`: the six exact-subject results, full output digests, timings, producer outcomes and post-removal Git states, SHA-256 `7937f08fd1eaad4bde88d6d77da01d9ce5ecb2d54b8a029241b7bd2a8d9072e1`.
- `finite-fifo-cli.jsonl`: the same result rows streamed during execution; the six `.stdout` and six `.stderr` files preserve complete process outputs.
- `finite-fifo-library.json`: minimal import-path counterexample, SHA-256 `32ba646571db027cce6bb4b201251a1da8af00336abf0cf815b65ebeb36dcb17`.
- `independent-audit.json`: consumer census, retained-corpus recount and fetched hosted-step summary, SHA-256 `b5b2a505dc9f7da9528b35432fbfd4d0acf09c44ba6277653ad4561dda5123e2`.
- `code-subjects.json`, `hosted-governance-current.json`, `hosted-node-current.json`, `merge-readiness.json` and `F6-thread-result.json` preserve the associated subject/gate/thread records.

To rerun the primary reproducer, use the retained clean `main-cli` and `head-cli` clones, verify their HEADs against the identities above, then run `python3 /home/orca/.tmp/syzygy-gidd-r3-review/finite-fifo-cli.py`. The harness creates/removes only its named FIFO in those scratch clones. The retained recovery evidence inspected is `/home/orca/.tmp/syzygy-j5dg-recovery-20261104/`; no prior raw review was edited.

## Merge disposition

[Observed] Before preserving this raw, local reviewed HEAD and GitHub PR head still match the exact reviewed commit. The merge-readiness helper reports `merge_ok=false`, `unresolved_threads=1`, queue enabled and no non-green required check. A green hosted suite does not clear F6. No semantic repair, rebase, force-push, enqueue or merge was performed. This raw and the campaign append belong to the existing review-evidence branch `agent/syzygy-gidd` / PR #717, not the implementation branch. The exact verdict is **REVISE**.

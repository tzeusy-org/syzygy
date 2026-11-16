# R-BPYT33-DEPTH-GUARD-1 — independent review of PR #769 (narrowed)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 70601c969fddb81884cfc13443eb084f53e47633
Base: d065b481e0674cc98c21102c789fef7865653f60

Reviewer: fresh-context agent; did not author the change. Worktree
`.worktrees/review/r-769` (detached at 70601c96, `npm ci` exit 0), left clean.
`git merge-base 70601c96 origin/main` = d065b481 = origin/main at review time.
Diff vs base: 4 files, +258 −1 (`git diff --stat d065b481 HEAD`).

Exceptions are notes only; no finding requires revision.

## Findings

### F1 (note) — Direction record is byte-identical to 0f8f0298 apart from the stale mark
- [Observed] `git show 0f8f0298:<record>` and `4671cb996:<record>` both blob
  `fcd48a5e6c3485d57a78d660f9c5dab8b11cca14`.
- [Observed] `git diff --no-index <(git show 0f8f0298:<record>) <record>`: one
  hunk, 13 added lines after line 124, zero deleted or changed lines.
- [Observed] The mark (lines 125–137) sits immediately after the stale
  sentence (lines 120–124), is dated "Stale 2026-11-17", cites owner answer
  `bpyt33-direction-provenance` A in `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md`,
  quotes the old sentence word for word (re-wrapped only), and cites
  `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06.md` item 1
  (`pdja-surface-freeze`, answer A).
- [Observed] 11-06 item 1 reads "This replaces the start of that freeze and
  keeps its paths and its end"; submitted 2026-11-06T12:18:27Z, before the
  record's 2026-11-07 date, so "already false when written" holds.
  The mark's restatement of the new freeze start/release/end matches the
  picked option text. `scripts/surface-merge-freeze.json` exists; state
  `inactive`, `candidateHead: null`.
- [Observed] The 2026-11-15 answer's three bullets match what the PR does.

### F2 (note) — No act binds the record's digest
- Record sha256 at head `3a8cbb36…`; at 0f8f0298 `d2315d3b…`.
- [Observed] `git grep -F -l` over tracked files for both full digests, both
  12-char prefixes: 0 hits. For the decision-id stem: 1 citer
  (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md`), plus the file itself.
- [Observed] Second method: Python byte scan of all 9,616 tracked files for
  16-char prefixes of both digests: 0 hits; stem `SCOPE-EXCEPTION-2026-11-07`:
  the same 2 files.
- [Observed] `git grep -F 'BPYT-33'` in `*MANIFEST*`,
  `ACCEPTANCE-ACT-RECORD.md`, `scripts/check_governance.py`: 0 (rc=1).
- The record self-describes as a plain direction, not digest-bound (line 30–35).
  Editing it before landing retires nothing.

### F3 (note) — The scope exception covers the guard; one stated count does not re-derive
- Clause, record lines 45–48: "Add the one-line `depth < 6` condition to the
  existing final layer expansion in
  `packages/three-surface-poc-core/src/obfuscated-destination-equivalence.test.ts`.
  The loop still consumes depths 0 through 6. Only the unused depth-7
  expansion is avoided. The additional existing-case edit is expressly permitted."
- Line 54–55: "Preserve the 597871 ordered named exhaustive inputs, their
  alphabet, maximum depth, order, title and assertions."
- [Observed] Diff is one line (`-1 +1`), the guard only; title, alphabet,
  loop bound `depth <= 6`, and all three `expect` lines unchanged.
- [Observed] Byte growth 15 (`wc -c` head minus base); matches item 2.
- [Observed] Base file sha256 = `aef94e2e…4d5a` = record's preimage; head
  file = `606ee96e…38d3` = record's candidate. No drift.
- Exception: item 2 says self-read "input counts remain five whole files and
  2432 lines". [Observed] By the case's own `split('\n')`, the population is 5
  files and 2,522 lines at d065b481, at 70601c96, at 0f8f0298, at 8ee4d0f7, and
  at `170b306e` (last main commit before 2026-11-07T17:00). Confirmed in-runner
  by instrumenting the case (2,523 with my one injected line). The guard
  changes neither count (both 5/2,522). [Unknown] how 2,432 was derived. The
  figure is in historical record prose from 11-07 and the owner called the
  record true; not a reason to revise, but it should not be cited as a
  current count.

### F4 (note) — The guard does not change the 597,871 inputs (independent method)
- Method: instrumented the real test file in place (restored after; head
  sha256 re-verified `606ee96e…`). Inserted, right before the case's
  `expect(inputs.length)`, a write of sha256 over `JSON.stringify(inputs)`,
  `inputs.length` and final `layer.length`. Ran under vitest
  `--project unit -t 'followed by every string of up to six tokens'` for the
  guarded file and for a copy with only the guard removed.
- [Observed] guarded: n=597871, final layer 531,441, sha256
  `2d15ca1505e85c870e5825165e3e0f541ec5a4e0f83c0386210bac9ef7bca346`,
  first `](`, last `](;;;;;;`; 1 passed.
- [Observed] unguarded: n=597871, final layer 4,782,969, same sha256, same
  first/last; 1 passed.
- [Observed] Author's replica re-run reproduces `9c657b6d…f48f4` for both forms.

### F5 (note) — Drops are correct; nothing kept needs them
- [Observed] `6b7cbcf2` is an ancestor of origin/main; main's sweep has
  `}, 25_000);` at line 224.
- [Observed] #769's old hunk in `polaris-authority-sweep.test.ts`
  (`git diff 8ee4d0f7 0f8f0298`) changed comment lines only: −3/+5, all `//`.
- [Observed] At head, `fullgate-e8-2026-11-08` and
  `proof-applicability-2026-11-08`: 0 tracked citers.
  `timeout-measurement.json` and `syzygy-bpyt-33/README` are named only in
  `docs/evidence/syzygy-bpyt-43/execution/OPEN-PR-CUSTODY.json` and
  `docs/evidence/syzygy-bpyt-58/CUSTODY.json`, as captured path lists or
  stdout of #769's earlier file set. Historical custody snapshots, not
  inputs; nothing reads them as files.
- The guard, record and new evidence reference none of the dropped files.

### F6 (note) — Evidence record is honest and correctly labelled; digests re-derive
- [Observed] Re-derived: preimage `aef94e2e…`, guarded `606ee96e…`, script
  `7f35932e…31c3`, `bytesAdded` 15, replica counts and hash.
- The replica-based input claim carries `[Inferred: a replica of the case's
  loop…]`, which is correct for its method. F4 now gives an in-runner
  [Observed] for the same fact.
- Rule-6 block stores old/new fragments and reports SURVIVED honestly. It says
  the guard is resource-only, and the heap-cap attempt did not reach the worker.
- [Observed] Spot-check of RSS, same case, guarded, load ~11–15: 170,108 KB /
  2.87 s and 234,200 KB / 2.31 s. Inside the record's guarded range
  (170–257 MB).
- Minor: `rule6.result` sentence "No input or assertion distinguishes the two
  forms" sits under a blanket "Observed" while its input half rested on the
  replica. Rule-6 record names base commit and both file digests, not the
  head commit. The digest pins the bytes (rule 11), so it is acceptable.
- The record notes the frozen `CANDIDATE.patch` path is gone. [Observed] That
  directory does not exist under `/home/orca/.tmp/`.

### F7 (note) — Gates at 70601c96
- [Observed] `obfuscated-destination-equivalence.test.ts`: 13/13 passed.
- [Observed] `polaris-authority-sweep.test.ts`: 6/6 passed.
- [Observed] `npm run check`: exit 0; 188 files, 4512 passed, 1 skipped.
- [Observed] `check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53). No output
  line names the new record or evidence paths.
- [Observed] `check_docs_review_campaign_partition.py --check`: PASS,
  denominator 872, unmatched 0, overlaps 0; second method 872/872.
- [Observed] `check_surface_freeze.py --base origin/main`: 0 findings over 4 paths.
- `check:all` not run, per brief.

### F8 (note) — Remaining bead criteria: nothing in the PR claims discharge
- The record (lines 86–93) still requires the sweep's five complete-file
  attempts, timing witness and worst/headroom support. It says "No completion
  follows from this permission".
- PR body "What stays open" says the PR does not discharge them.
- The evidence record makes no completion claim. The bead
  `syzygy-bpyt.33` is BLOCKED (read-only `bd show`).
- Record lines 146–153 say ROOT must reconcile the tracker before a fresh
  worker applies the patch. [Unknown] whether that reconciliation was done;
  the record says it is a gate, and the PR does not claim it.

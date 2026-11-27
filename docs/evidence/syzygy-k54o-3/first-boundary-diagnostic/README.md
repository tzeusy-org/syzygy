# First-boundary diagnostic: owning PASS, genuine recovery FAIL

[Observed] Actual source commits are
`1a98aaebf5f590241b52d7cf195c7d2761121956` and its test-only successor
`22b540f0d8e1635e4fe36413d1dd4587be4a03b6` (final tree
`bee00db67b88d28229874b85c2e2465d126f2112`). The owning baseline and nine
mutants pass their acceptance criteria at 22b; the original genuine stop-resume
case fails. These are separate outcomes. Full gates were not run and F3
acceptance was not achieved.

The passive diagnostic retains the first operation refusal's scalar owner,
original baselines and already-read samples without private input, exception
text, source bodies, additional budget samples or changed limits. R3 corrects
one fixture expectation and two comment lines: the ledger captured `Date.now`
before the late spy, whereas its monotonic closure dynamically resolves
`performance.now`. Production session SHA-256 remains
`382645bb414dca8abe9c5f625edeff9bd6602308cae195e80ec9524eee93ee32`.

## Retained verification and failed attempts

| Subject/scope | Retained result |
|---|---|
| Source review history | R1 `REVISE`; R2 and R3 source reviews `PASS`, all retained verbatim |
| Original 1a98 owning attempt | Typecheck PASS; baseline 32 passed/1 failed of 33, ledger-refused wall-spy expectation; no mutants attempted; complete/unaccepted |
| Actual 22b owning verification | Typecheck PASS, 33/33 baseline PASS; all nine mutants fail their exact intended AssertionError, one selected failure and 32 selection skips each; complete/accepted |
| Original 22b genuine build | PASS, 17.058494 seconds, 367 inputs and ten outputs |
| Original 22b genuine case | FAIL at 525,159.520008 ms: one failed selection, six selection skips, seven-case population |

[Observed] Owning verification takes 378.174 seconds overall, including the
196.005-second baseline. Root reconciliation independently checks the complete
baseline by two methods, all nine mutant identities/signatures and all 35
terminal-declared raw files. Source/tools and 11 retained runtime objects stay
unchanged, with no forced/pending/remaining owned children or cleanup errors.
The prior failed 1a98 baseline stays failed; the test correction and successor
PASS do not erase it. Sealed operator reviews establish definition readiness,
not run success.

[Observed] Source test growth is two declarations and 12 expanded integration
cases (21 to 33). In the passing 22b run, the added cohort's summed case
durations are 117,636.313153 ms of 191,152.834417 ms summed across all cases.
These are within-run cohort costs, distinct from baseline wall time. They are
not a predecessor timing comparison, a net speedup, a CI-budget claim or a
waiver. The real 30.05-second timer wait and native guards make the cost
deliberate; `root-first-boundary-test-costs.json` retains the named cases.

## Exact initiating failure in the genuine case

[Observed] The original recovery completes unaccepted with exit one in
559.444099 seconds. The configured case bound remains 600 seconds, hooks 30
seconds and the ordinary worker configuration unchanged. The complete record
has no runner error, cleanup error, forced child, pending signal or remaining
owned child; source/tools and the freshly built runtime stay unchanged.
archive member ordinary-22b/raw/terminal.json is SHA-256
`65d7fd503934609f7291bcf80e633a0adb62cd78aa034de6b53ea1d339bd1f1b`.

[Observed] Standalone analysis of this completed output finds six of six
retained first-boundary occurrences equal, with no unmapped occurrence. The
first record is `origin: timer`, operation `tool`, turn 3: the fourth broker
invocation's original operation timer. Its original wall limit is 30,000 ms;
it fires after 30,039 wall ms and 30,038.613317 monotonic ms. This establishes
the original operation timer as the initiating boundary, not the outer
600-second case timeout or an owner gate.

[Observed] Current CPU and remaining CPU at that timer are both null/Unknown.
The unchanged CPU limit is 64,000,000 microseconds. The recorded admission CPU
value 1,187,550,271 microseconds is an original baseline; it cannot establish
CPU spent at the timer. No timer CPU expenditure or CPU-limit crossing is
inferred from a later cumulative ledger snapshot.

[Observed] Host-action settlement occurs 5.007 ms after the timer. The prepared
store recheck begins 173.959 ms before the timer and settles after it.
[Inferred] The later store/audit refusals are downstream of this retained
initiating timer. This diagnosis does not identify or claim an optimization;
source-cost assessment is separate and has no outcome asserted here.

`root-original-22b540-reconciliation.json` (SHA-256
`2df39b371ec191246db1799b447b634cd881c50491b6c554d61ab2d746ebe401`)
records the independent root checks. archive member diagnosis/analysis.json binds the same
subject, terminal and all seven raw files. The standalone analyzer and its
original README are retained under `diagnosis/analyzer-definition/`; this is
post-run evidence analysis, not product instrumentation.

## Scope and retention

[Observed] All seven completed original raw files plus the terminal were
selected by the terminal allowlist and hash-checked; the root also used an
independent SHA implementation. No TMP tree, observed fixture body, active
output, clone or node_modules tree was copied. Known session source backups
come only from the sealed owning raw-file lists and retain their exact digest.

[Observed] Historical staging state only: the retained `README-DRAFT.md` and
`DRAFT-*` declarations of “genuine pending” or Unknown describe R2 before this
completed original result. Their earlier pending state is superseded by the
FAIL above; they remain byte-identical historical artifacts. Likewise the
frozen source/operator/analyzer-preparation packets' “not applied” or
“no execution” statements describe their preparation stages. Their raw bytes
and verdict words were not rewritten to imply later outcomes.

[Unknown] Successful genuine recovery, full-suite acceptance and any performance
repair. The full canonical battery and `npm run check:all` were not run. The
observed original timer is evidence for the next bounded source assessment,
not evidence that F3 is complete.

The original R1/R2 staging directories remain unchanged. This final payload
preserves all 167 R2 staged files, completed original output, analysis and root
records. `proof.tar.gz` is deterministic;
`ARCHIVE-INDEX.json` binds every member and its readback digest. The packaging
definition is retained under `packaging/` and runs no repository product code.
Proposed A-325 names actual 1a98/22b and remains unappended/unreserved; A-324
main proof is separate. The root must recheck IDs before applying proof. No
primary source, commit or push was changed while assembling this checkpoint.

[Observed] This repository checkpoint installs the archive and adoption row. Proposed-row preparation statements in the frozen archive describe packaging before this installation.

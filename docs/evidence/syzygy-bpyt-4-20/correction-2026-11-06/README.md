# N12/N13 review correction — 2026-11-06

[Observed] The complete original outcome remains **OPEN**. The independent
review of `d0babb086ebb58999aec1291765e491e15ceae65` returned exactly
**INCOMPLETE — NOT READY TO MERGE; CORRECTIONS REQUIRED.** Its two findings
are preserved in [PRIOR-REVIEW-FINDINGS.json](PRIOR-REVIEW-FINDINGS.json).
This correction supplies the missing F2 comparison. F1 still prevents
completion of AC1/7/8; AC15 remains partial. All sixteen exact criteria remain
in [FULL-16-CRITERION-MAP.json](FULL-16-CRITERION-MAP.json).

[Observed] F2 was checked against GP-Q0 Part 1's review rule and the actual
`OWNER-DIRECTION-N12-N13-FIXTURE-SAFETY-2026-11-06` direction. The rule calls
for “an old-versus-new differential over a mutated-record corpus that includes
records with altered prose”. The existing record did not execute a predecessor
or vary input-record prose. The preceding index's row titled “Predicate
differential with altered prose” and `GUARD-MUTATED-PROSE-CORPUS.json` are
therefore retained **as historical predicate/source-docstring controls only**;
they do not discharge this GP-Q0 check. Their bytes have not been relabeled
or overwritten.

[Observed] The new [capture](capture/CAPTURE.json) binds a clean adapter
subject `94e224be7209c7db8a31948f246ed856ca89b153` and actual source versions:

| Boundary | Executed source | Safe seam |
|---|---|---|
| Predecessor | `32e16046d75a3d5346011be885377b06c9c49d20`, leak tool line 23 | Actual four-argument resolution statement |
| Guarded successor | `38eab812488c85198f37b8be18f1dd24cd5898f8`, lines 24–35, 38–39 | Actual helper, argument resolution and immediate guard call |

The [driver](admission_differential.py) selects and compiles those actual AST
nodes, checks their placement before the first discovery query, and excludes
imports, discovery, process launches, recursive deletion and result writing.
Both full source copies, commits, Git blob identities, file digests, exact
executed source segments and segment digests are retained in the
[per-row result](capture/RESULT.json). Neither full writer executes.

The [input corpus](capture/INPUT-RECORDS.json) contains eleven structured
fixture cases, each repeated under neutral prose, prose claiming an owner
grant and prose demanding refusal. These are explicit adapter records carrying
the tool's four positional arguments and controlled environment; narrative is
untrusted metadata, not a new native CLI input or authority source. Three
private-root cases admit; eight shared/ancestor/occupied/non-directory/alias
cases newly refuse. The empty HOME and empty ancestor of a missing TMPDIR
are explicit cases. A missing private descendant of HOME admits, preserving
the predicate's directional ancestry semantics. The cached temp directory is
an explicit synthetic state input, separate from the declared TMPDIR.

[Observed] The captured population is **33 comparisons / 66 admission-prefix
executions**: predecessor 33 admissions; successor 9 admissions and 24 refusals.
Each row matches its retained expected effect and inherited refusal fragment.
Each case has three different narrative texts, identical structured inputs and
identical outputs. Four deliberately corrupted result controls are rejected:
an invented predecessor refusal, dropped successor guard results, a missing
row and a prose-specific override. These validate this result checker; they
are separate from the existing fifteen predicate and five wiring mutants.

[Observed] The distinct outer [observer](capture_admission.py) prepared a new
owned fixture, mounted it read-only in a network-isolated namespace and waited
for the child to finish: exit 0, no timeout, about 0.27 seconds. The complete
[stdout](capture/stdout.log) and [stderr](capture/stderr.log) are retained.
Its eleven-entry [before](capture/FIXTURE-BEFORE.json) and
[after](capture/FIXTURE-AFTER.json) inventories match in bytes and recorded
metadata (paths, mode, inode, size, mtime and links). The full-writer result
path remains absent. Fixture storage remains for accountable inspection;
this proves neither host-wide process absence nor atomic same-root ownership.
This capture is task-process observation, not independent ROOT execution.

[Observed] F1 is unchanged. Both original literal no-proc runs reached their
300-second outer timeout; neither is a passing run or completed mutation kill.
[ROOT's disposition](ROOT-NO-PROC-DISPOSITION.json) establishes stock Node
`memoryUsage()` failure under the empty proc mount. [Inferred] The Tinypool
response path is a supported explanation of the missing runner result, not
proof of sole cause. This qualifies the preceding index's sentence “This
explains the missing runner completion.” No new causal basis or prerequisite
authorization was supplied; no expensive unchanged no-proc or broad run was
repeated and no runtime/framework/proc-memory behavior was substituted.

[Observed] Correction Vitest delta: **+0 ~0 -0**; cumulative repair Vitest
delta: **+0 ~2 -0**. The fifth-tool probe's six refusal, three predicate-mutant
and one wiring additions, ten guarded-script adapter invocations, sixteen
source-docstring controls and three real parser commands remain separately
counted at their original execution subjects. The correction adds 33 admission
comparisons and four checker controls, with no test identity or suite change.
[CORRECTION-DELTA.json](CORRECTION-DELTA.json) records these denominators.

[Observed] The previous review ruled classes 1/4/6 and evaluated all seven
floors at its old subject; its [ruling](PRIOR-REVIEW-CLASSES-AND-FLOORS.json)
is historical. Fresh review must rule the corrected subject's classes, truth,
evidence, inference, write, sign-off, security and identity floors. No floor,
criterion or authority gate is waived. The original `check` and clean-clone
`check:all` captures remain bound to source `38eab812`; they are not new runs
at this evidence successor. Hosted and protected merge-group gates remain
actual-tree gates. The GP-Q0 non-blocking cycle-report notice remains open.
Both November 3 app/core owner merge holds remain: actual
`syzygy-1z3.22` judgment **and** `syzygy-1z3.25` cycle report are still required.
This correction authorizes no landing, partial closure or new cycle.

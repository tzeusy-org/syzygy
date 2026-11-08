# Workspace guard preconditions — syzygy-bpyt.58

[Observed] GP-B2 Q4 selects the precondition test recorded in
`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`.
The implementation subject is `0db4d7b9d2a02966cfbbf1da696cd8979f2c7e45`;
the predecessor is `740279435178a882f1c2d526a2a7ea0bf2b52cbc`. The test is
`packages/polaris-generation-core/src/workspace-reach.test.ts`, titled
“requires every npm workspace to be @syzygy/-named and every dependency or
override spec to be a registry version shape”. It reads paths from root
workspace patterns, separately from the resolver's name-keyed map, and includes
the root for dependency specifications. The root is exempt only from workspace
naming. Unsupported discovery and failed reads cannot pass as empty populations.

[Observed as retained author-run reports] `PREDICATE-PROOFS.json` retains 45
validated selected-test executions: passing controls, deliberate input failures,
and predicate bypasses. It records complete old/new fixture fragments, subject,
test and tool hashes, command receipts, intended diagnostics, and executed-test
populations. The original four negative inputs run separately, including the
unscoped workspace with no `main` or `exports`. The version-rejection corpus also
contains protocol, alias, path, tarball, git, URL, tag, partial/range, suffix,
leading-zero and trailing-terminator inputs. Both root and workspace declarations,
all four dependency fields, direct and nested override strings including `.`,
and a newly included workspace pattern have controls. Selector keys are not
version values. Positive exact, caret, tilde and descriptive-prose controls pass.

[Observed as retained author-run reports] `OLD-NEW-DIFFERENTIAL.json` records
16 executions of eight corpus cases at base and head. Resolver/reach results,
derived aliases and the full fixture-driver S10 bundle agree for every pair.
The S10 functions are extracted unchanged from the actual guard, and their
fragment digests are retained. The no-entry unscoped witness is still bundled
from outside `src`; the resolver still treats a bare-directory dependency as
outside. The new precondition refuses those trees. Existing file/alias refusals
remain controls, rather than newly discovered blind spots. `SOURCE-INTEGRITY.json`
compares actual base/current bytes and comment-free TypeScript output: testkit
executable output and the existing island, daemon-path and S10 guards are
unchanged. The two testkit residual comments point to the precondition.

[Observed as retained author-run reports] `TEST-DELTA.json` reconciles reporter
totals with exact test-name populations: 81 predecessor tests and 82 current
tests pass in the existing file, **Tests: +1 ~0 -0**. The 36 tests in the existing
island and daemon-path caller files pass. `WORKSPACE-POPULATION.json` reconciles
actual npm discovery with root-pattern expansion and independent path iteration:
the 13 discovered workspace paths agree. Historical counts in Q4 and N5 remain
historical. `CACHE-INTEGRITY.json` verifies the exact 105 public lockfile tarballs
against SRI before private offline installs. These observations do not add a
dependency-admission policy or modify either reviewed resolver/egress guard.

[Observed] Earlier attempts are retained separately. The first diagnostic proof
ran the intended failing test but the JSON reporter omitted the manifest detail;
the assertion message was corrected before the current proof. A later intended
end-anchor bypass was still strict and is not counted as a valid bypass; an
exact Node characterization informed the corrected mutation. One differential
preparation used the historical dossier-site location and stopped before probe
execution. The `*-DISPOSITION.json` files explain each; no infrastructure retry
classification or hidden pass is claimed.

[Unknown at this packet commit] Broad checks, independent capture and execution,
fresh CC-REV-1 review, hosted checks, owner notice and protected landing are
separate remaining gates. This packet is an author report, not emitter-distinct
gate capture under CC-TEST-2. ROOT retains the exact committed clean-clone
`npm run check:all` output and its independent capture in the execution OWN,
then dispatches fresh review. The whole 17-obligation/14-AC outcome remains open
until those gates complete. `FULL-AC-MAP.json` and `ASSURANCE-AND-SCOPE.json`
retain the complete mapping, initial class 4 declaration and seven risk floors.

The original execution directory is
`/home/orca/.tmp/syzygy-bpyt58-full-outcome-20261106`. The proof tools in `tools/`
are retained execution subjects, not a permanent mutation framework. To repeat
them, copy them into a new private scratch directory, adapt the namespace paths,
clone the named reachable subjects there, verify the exact lockfile cache and
install offline in each clone before NodeNext. Do not execute a frozen original
wrapper: it reserves output filenames and appends attempt records. `prove.py`
and `prove-extras.py` exercise the one selected row; `differential.py` executes
the existing mechanisms over its recorded corpus. The normal product suite
keeps its current tier, timeout, worker and skip settings.

[Observed] `runs.tar.gz` retains the exact raw command receipts and streams;
`RUN-ARCHIVE-INDEX.json` binds every member by path, length and hash. Extract it
into private scratch to inspect individual reports. Normalized proof records above
remain directly readable. This packaging changes no retained member bytes.

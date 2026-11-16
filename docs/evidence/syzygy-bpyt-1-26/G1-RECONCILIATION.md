# G1 / R7 selected UTC-day implementation

[Observed] Historical G1 in `../syzygy-bpyt-8-7/reconciliation-gen1.json`
recorded unchanged=signed, Date 2099=signed and wrong Version=unsigned in
`../syzygy-bpyt-8-7/wait-mode-probe.json`. The frozen current-v1.3 R7 receipt
at the original decision baseline independently reproduced those controls.
Those expected current results describe old behavior, not the oracle for A.

[Observed] The actual owner selected A on 2026-11-05, recorded in
`../../../.syzygy/governance/decisions/OWNER-DIRECTION-POLARIS-WAIT-MODE-UTC-DAY-2026-11-05.md`.
The new operational gate checks the local-agent Date as a UTC effective day,
using one captured evaluation instant per operation and preserving matching
version/subject eligibility. The registry instant dialect remains separate.
Bound sign-offs, accepted specifications and historical evidence are unchanged.

[Observed] G1's historical prose “reads a byte-exact recorder's output” is
superseded as a description of the waiter on 2026-11-05: the retained waiter
checks a subset of the first twelve nonblank head lines and aggregate markers,
then the named review digest and installed version/bytes. This change adds the
selected Date predicate; it does not introduce full-template validation.
Likewise G1's suggested “date or recorded instant” / “unsigned” expectation is
superseded for A: this local-agent dialect has no recorded instant. Temporal
statuses distinguish future, missing/invalid Date and invalid evaluation;
the public refusal envelope remains unsigned/exit 1.

[Observed] Tests: +0 ~3 -0 top-level cases, no new test file or gate species.
The three existing waiter cases now hold literal date/calendar/UTC/timezone,
version/candidate-order, replay/removal/I/O, real-default four-flow and
human/JSON/no-effects/stdin assertions. Existing delivery round allocation,
wx/no-overwrite, record-first/delivery.json-last and partial-retry tests stay.
The new running-await characterization retains its entry-check residual.

[Inferred] Proposed CC-REV-1 classes 1, 4 and 6; floors 1–6 are preserved or
directly engaged. Technical complexity is moderate, authorization impact high.
Final independent exact-head review may reclassify. GP-Q0's extra differential,
predicate mutants and non-blocking cycle notice apply. This is the cycle
notice for coordinator reconciliation; sibling .8.27's default-binding work
is not claimed closed, and .4.16/.8.43/.3.2 retain their separate ownership.

[Observed] The execution inputs, attempts, raw outputs, changed-source
fragments, commands and scripted SHA-256 bindings are retained under
`/home/orca/.tmp/syzygy-m7-future-signoff-actual-a-implementation-20261105/`.
Those worker captures are report facts pending the coordinator's distinct
capture/review under CC-TEST-2. No final review, merge or Beads closure is
claimed here. All thirteen original criteria remain the reconciliation scope.

[Observed] Rollback reverts implementation without editing predecessors or
run history, but restoring future-Date acceptance requires the applicable
owner direction. No new package sign-off, registry fallback, producer metadata,
consent, execution, provider, egress, retention, release or other outcome is
part of this change.

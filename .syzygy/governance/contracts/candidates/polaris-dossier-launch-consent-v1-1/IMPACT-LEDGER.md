> **Candidate — binds nothing.** Impact ledger for semantic delta
> DOSSIER-LAUNCH-CONSENT-1.1 (`SEMANTIC-DELTA.md` in this directory), under
> CC-IMPACT-1 to CC-IMPACT-6. Every figure below was computed by script at
> `ed186d54bf163f4fe91dfa1c924ff9d2cc0425d0` (`main`, after PR #797); the
> predicates are published so that a reader can re-run them.

# Impact ledger — Polaris dossier launch-time consent, version 1.1

## Subject bytes

All digests are SHA-256 over the file bytes, computed by `sha256sum`.

| File, under `openspec/changes/polaris-dossier-launch-consent/` | v1.0 at `ed186d54` | v1.1 (patch applied) |
|---|---|---|
| `specs/polaris-generation/spec.md` | `149aa74464af1fe68dd62ab4652223651025c125a42fc1259623e06b494417cd` | `95172020bcae70cbfc6d5f6b9e9ad750b7e8da0e634a60017fe7e96845eee4a7` |
| `GOVERNING-DEPENDENCIES.md` (regenerated) | `458c0bff8cb4afecfe4802885f24f8f66318cfa5fe2e7d290a1b02121df2b95d` | `9a4d94dbd47cf34252f40247a3d588998bfa9d472badbf7b5c45860fd9aead67` |
| `design.md`, `proposal.md`, `tasks.md` and every other file | unchanged | unchanged |

The v1.0 digest is the `Manifest SHA-256` in the head of
`docs/reviews/R-POLARIS-LAUNCH-CONSENT-SIGNOFF-2-RAW.md`, the review the v1.0
record names; the builder checks that equality. The patch is
`proposed/spec.md.patch` (49 lines); it applies to the v1.0 bytes with
`git apply`, and reversing it restores them.

## Counts

[Observed] `scripts/count_polaris_effective_scenarios.py` over the effective
Polaris composition, in a scratch worktree of `ed186d54` with the patch
applied by the builder's `apply()`:

| Bytes | Requirements | Scenarios |
|---|---|---|
| v1.0 | 38 | 297 |
| v1.1 | 38 | 298 |

The one scenario v1.1 adds to REQ-polaris-generation-046 is "Name and URL
warning for a repository not declared public". No scenario is edited,
removed or renamed. The status page's figure without the local-agent
addition moves from 34 requirements and 221 scenarios to 34 and 222, because
that figure counts every addition but the local-agent spec, this one
included (the v1.0 owner sign-off page said so). `openspec validate
polaris-dossier-launch-consent --strict` (OpenSpec 1.9.0) reports the
change valid on the applied form.

## Text sweep

Predicate: for each phrase below, a byte-literal substring match (Python
`bytes in`) over every blob of `git ls-tree -r -z --name-only ed186d54`.
Population: **9,328 tracked files**. Every hit is listed; the
classification is the drafter's.

| Phrase | Files | Classification |
|---|---|---|
| `public declared or not` (the case variable v1.1 rewords) | 2 | the spec (changed here); the v8 package's `IMPACT-LEDGER.md`, which quotes the v1.0 line as evidence for v8's own reading (bytes the owner's held v8 selection read; not edited) |
| `REQ-polaris-generation-046` (the requirement amended) | 12 | the spec; the v1.0 package's `OWNER-SIGNOFF.md`, the change's `SEMANTIC-DELTA.md` and `proposal.md`, the review campaign page and `PENDING-OWNER-DECISIONS.md` (v1.0 history, still true of v1.0); the generated census (regenerated on install); `scripts/build_polaris_dossier_launch_consent.py` (names the requirement in its docstring; unchanged in meaning); the v8 package's `IMPACT-LEDGER.md`, `SEMANTIC-DELTA.md` and policy patch, and `scripts/build_public_source_screening_scope_v8.py` (below) |
| `name-on-branch` | 5 | the owner's answer record, the v8 packet, the v8 round-5 raw, `PENDING-OWNER-DECISIONS.md` and `decisions/README.md`: each names the owner's choice that v1.1 drafts; none states the spec's text |

### The v8 citers

The screening scope v8 package cites REQ-polaris-generation-046 for the
record's public declaration and for the dedicated reference. Its policy
patch's `consentRecordMetadata` note says a launch consent record "is
committed into the observing project's own governance repository, on a
dedicated reference Syzygy never pushes (REQ-polaris-generation-046); for a
private repository that makes its name, host path and commit ids tracked
objects of Syzygy's repository, one push by the operator from its remote."
[Inferred] v1.1 makes that statement part of the launch question and
changes nothing it relies on: the record's fields, the declaration, the
dedicated reference and the no-push rule are as at v1.0. Under v8 a
repository with no affirmative declaration counts as private; v1.1 warns in
the same case. No v8 byte needs to change, and none is edited.

## Implementation

[Observed] No file under `apps/`, `packages/` or `scripts/` implements
REQ-polaris-generation-046: the sweep's only script hits are the v1.0
builder (a docstring) and the v8 builder (a policy note). When launch
consent is implemented, the question text gains the warning for a
repository not declared public.

## Tooling (this package)

- `scripts/build_polaris_dossier_launch_consent_v1_1.py`: `--check`,
  `--selftest` (30 fixtures, a mutation per predicate), `apply()` for the
  recorder, and `signed_findings()`.
- `scripts/build_polaris_dossier_launch_consent.py`: its `--check` now runs
  `signed_findings()` in the applied state, so the battery tells v1.0's
  signed bytes from v1.1 bytes no record covers.
- `scripts/record_versioned_signoff.py`: the entry
  `polaris-dossier-launch-consent@1.1`, with a selftest routing it through a
  fixture.
- `scripts/prepare_three_surface_poc_governedby_reference_recording.py`: the
  entry joins the T17 census's closed `later` set.
- Not done here (CG-26): the battery, workflow and count-sentence lines for
  the v1.1 builder and recorder land at sign-off, in one integration commit.

## Scratch install

[Observed] In a scratch worktree of `ed186d54`, after `apply()` and
`check_spec_reconciliation.py --regenerate`:

- `check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL";
- `build_polaris_dossier_local_agent_mode.py --check`: OK (applied);
- `build_polaris_dossier_launch_consent.py --check`: FAILED, by design,
  with "is not the signed v1.0 bytes, and no later version is recorded" and
  "the tree carries the v1.1 patch, which no sign-off record covers", since
  no v1.1 record exists in a scratch install;
- `check_governance.py`: one FAIL, CG-1a, for the status page's link to the
  v1.1 record that the recorder writes in the same commit.

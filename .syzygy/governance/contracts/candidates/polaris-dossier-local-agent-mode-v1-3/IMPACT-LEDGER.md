> **Candidate — binds nothing.** Impact ledger for semantic delta
> DOSSIER-LOCAL-AGENT-1.3 (`SEMANTIC-DELTA.md` in this directory), under
> CC-IMPACT-1 to CC-IMPACT-6. Every figure below was computed by script on
> branch `agent/syzygy-mea-10-3-v1-3` at
> `1c3342717706872466a505bce60edb926935fe7a`, whose
> `openspec/changes/polaris-dossier-local-agent-mode/` bytes are v1.2 as on
> `main`; the predicates are published so that a reader can re-run them.

# Impact ledger — Polaris dossier local-agent mode, version 1.3

## Subject bytes

All digests are SHA-256 over the file bytes. "v1.3" is the v1.2 tree with the
three patches applied by `git apply` and `check_spec_reconciliation.py
--regenerate` run.

| File, under `openspec/changes/polaris-dossier-local-agent-mode/` | v1.2 | v1.3 (patches applied, regenerated) |
|---|---|---|
| `specs/polaris-generation/spec.md` | `d6bce6b3aca13098f8d7ca28cee6aed5475e7522b2305958580eb17c4ffc3ea2` | `51dafbaa9c51d083ed0f690d155f1d593dd04af3bf1885ecfd9a4d63f2e1a472` |
| `design.md` | `4e04bd40453b4026deaddc60c4d1a3d98801bb84b0422cac8c168467c5568e53` | `8f75336db0edcb873272586f34d27a4c9f17bf13ce38c3c06216275e46292a0e` |
| `proposal.md` | `73ace9e28e0eae2496c1810fbd5cbb4c7f946b636b49b42418ce98cdbefd0be4` | `afe81684bcf421ac3e12d8d024aa64ad1c5fbd86b0689fa267954cc2469c10eb` |
| `GOVERNING-DEPENDENCIES.md` (regenerated) | `b0da779018ed5f3d99f5decf63b4ecdc6c1704b4f96084547e4a01e740a4d73a` | `d5dd52515b5d7dae3ff9477c5e324fd5e42c0b713e8cbbc9f19a1b748e2df688` |
| `tasks.md` | `6ccaa6893947aa9cbb7dbe7b3704b7084167aee4bc74d4bf251b66115edd60c6` | unchanged |

The v1.3 spec digest is the reviewed subject: the sha256 of the installed
spec with `proposed/spec.md.patch` applied, which a review raw's
`Manifest SHA-256` line carries. The patches are under `proposed/`:
`spec.md.patch` (71 lines), `design.md.patch` (65) and `proposal.md.patch`
(39). Each applies to the v1.2 bytes with `git apply`. The regeneration also
rewrites `docs/evidence/spec-readability-reconciliation-2026-10-02/census.json`
(the Polaris scenario total and REQ-polaris-generation-034's four new
scenario names), and no other tracked file.

## Counts

[Observed] `scripts/count_polaris_effective_scenarios.py` over the effective
Polaris composition:

| Bytes | Requirements | Scenarios |
|---|---|---|
| v1.2 | 36 | 248 |
| v1.3 | 36 | 252 |

The four scenarios v1.3 adds, all to REQ-polaris-generation-034, are "Claim
inside a presentation element checked as a block", "Short label carries no
claim", "Code excerpt rendered from Syzygy's read" and "Presentation element
rendered inert". No scenario is edited, removed or renamed. `openspec
validate polaris-dossier-local-agent-mode --strict` reports the change valid
on the applied bytes.

## Install blocker

[Observed] The signed P115 sign-off
(`.syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md`,
2026-10-27) binds eight governing input specifications by digest, read from
its frozen `SOURCE-BINDINGS.json` (`governing_inputs()` in
`scripts/prepare_three_surface_poc_governedby_reference_recording.py`). One
of them is this change's spec, at its v1.2 digest (the first row of the
table above). Its signed
check (`binding_findings()`, reached through `is_signed()`) fails on any
current governing input that differs, with no allowance for a later signed
version of that input. On the v1.3 bytes it returns exactly one finding,
`current P115 governing input differs:
openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`.

[Observed] So the P115 transaction reads as unsigned once the v1.3 spec is
installed, and the battery fails downstream of it. In a throwaway clone
(below), after the recording, `check_spec_reconciliation.py --check` failed
R1 (the P115 transaction "incomplete or invalid"), R2 (15 findings: the POC
successor chain and five POC subjects read as stale) and R3 (the POC census,
26 / 34 against 26 / 28), and `check_governance.py` failed CG-7h (33
findings, the POC `CONTRACT-COVERAGE.md` row and the bootstrap chain built on
it). The same R1 to R3 failures appear with the patches merely applied in a
working tree, with no record written. The same tree with the v1.2 spec
passes 7 of 7.

Resolving it is not this package's to do: the P115 reading belongs to the P115
sign-off. The owner packet asks the question. [Inferred] The likely forms are
a P115 reader change that admits a governing input's later signed version
(the dossier builders' own signed check can say which bytes are signed), or
a P115 successor that re-binds its inputs. Either must land before, or with,
the v1.3 install.

## Checks on the applied bytes

[Observed] A rehearsal of the recording in a throwaway clone of
`1c334271` (`git clone --no-hardlinks`, under the session's scratch
directory), with a synthetic CONFIRM raw whose head carries the digest above,
applied the patches through `record_versioned_signoff.py --record
polaris-dossier-local-agent-mode --version 1.3`. That moved the status figure
to (36, 252), wrote the v1.3 record and aggregate block, and named four
records on the status page. After `--regenerate` and a commit:

- `record_versioned_signoff.py --check polaris-dossier-local-agent-mode
  --version 1.3` reported "regenerates exactly; applied tree verified", and
  `--version 1.2` reported "superseded by a later version";
- every dossier builder's `--check` (v1.0, v1.1, v1.2, v1.3) passed;
- `openspec validate --strict` passed;
- `check_spec_reconciliation.py --check`: R4 and R7 OK; R6 WARN with the two
  stale behaviour-contract pins it reports on `main` today (unrelated,
  `syzygy-2g0d`); R5 FAIL with one finding, the `openspec/README.md` row not
  naming the v1.3 record (an install-time edit); R1, R2 and R3 FAIL from the
  install blocker above.

## Text sweep

Predicate: for each phrase below, a byte-literal substring match (Python
`bytes in`) over every blob of `git ls-tree -r -z --name-only 1c334271`.
Population: **8,657 tracked files**. Hits inside this package's own
directory (its ledger and patches quote the phrases) are left out of the
counts. Every other hit is listed; the classification is the drafter's.

| Phrase changed by v1.3 | Files | Classification |
|---|---|---|
| `Exact behavioral delta, version 1.2` | 5 | the spec (changed here); the v1.2 package's `spec.md.patch` (historical record of v1.2, not edited); two retained raws, `docs/reviews/R-PR408-V12-INSTALL-1-RAW.md` and `-2-RAW.md` (verbatim, not edited); `packages/polaris-dossier/src/agent-texts.test.ts`, which pins the spec's head and moves at install |
| `these bytes bind only by the owner's sign-off of version 1.2` | 2 | the spec; the v1.2 package's patch (historical) |
| `> **Version 1.2.**` | 4 | `design.md` and `proposal.md` (changed here); the v1.2 package's two patches (historical) |
| `sign-off of version 1.2` | 7 | the three files changed here; the v1.2 package's `SEMANTIC-DELTA.md` and three patches (historical) |
| `polaris-dossier-local-draft-v2` | 8 | the schema module `packages/polaris-dossier/src/draft-schema.ts` and six test or test-kit files beside it, which the implementation bead moves (v2 stays accepted); one retained raw (verbatim) |

The decision v1.3 introduces as a warrant,
`OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`, appears outside this
package in 3 files at that commit: the direction record, its row in
`decisions/README.md`, and the v1.3 builder's docstring.

## Dependents

- **Implementation.** `packages/polaris-dossier` (the draft schema, the
  checker, the fidelity verdict's `blockSupport`) and the renderer
  (`packages/polaris-dossier/src/render.ts`,
  `apps/three-surface-poc/src/polaris-generation/dossier-site.ts`), under
  bead `syzygy-mea.10.5`, built in parallel and not on this branch.
- **Agent texts.** The brief's schema section, the `/polaris-dossier` skill
  and the Codex instructions describe the v2 schema; they are updated with
  the implementation, under the agent-text lint.
- **Generated.** `GOVERNING-DEPENDENCIES.md` and the census, regenerated at
  install; `PROJECT-STATUS.md`'s Polaris figure (the recorder moves it) and
  its routing line naming the latest record.
- **Signed P115 transaction.** The install blocker above.
- **Tooling.** `scripts/build_polaris_dossier_local_agent_mode_v1_3.py`
  (`--selftest`: 26 fixtures, 0 failing), the
  `polaris-dossier-local-agent-mode@1.3` entry in
  `scripts/record_versioned_signoff.py` (its `--selftest`: 170 fixtures, 0
  failing), and the v1.2 builder's peel and delegation (`--selftest`: 39
  fixtures, 0 failing); the v1.1 builder's unknown-version fixture moved
  from v1.3 to v1.4 (32 fixtures, 0 failing). [Observed, rule 6] With the
  v1.2 builder's peel disabled, 7 of the v1.3 builder's fixtures fail; with
  its "carries the v1.3 patches" finding removed, the fixture "applied
  without a v1.3 record: the battery fails" fails. The PROJECT-STATUS battery
  and the hosted workflow do not yet run the v1.3 builder's own `--check` and
  `--selftest` (CG-26 is registered once, at install); its signed-bytes check
  runs through the existing v1.0, v1.1 and v1.2 `--check` lines.
- **Not touched.** REQ-polaris-generation-033, 035, 036; the provider-mode
  requirements; RFC7; doctrine; the gate sources and screens.

## Overlap

Predicate: `git grep -l -F REQ-polaris-generation-034 -- openspec` at the
commit above: six files. Two are this change's spec and its generated
`GOVERNING-DEPENDENCIES.md`. Four sit in two candidate changes:

- `openspec/changes/polaris-dossier-arbitrary-public-repo/` (its
  `proposed/polaris-generation/spec.md`, generated union and `proposal.md`)
  reads 034 for its `maintainer-stated` and `reconstructed` blocks, whose
  quotations and premises 034 checks, and names 034 as a parent. It adds
  labels to claim blocks, so a claim inside an element would carry them as
  any claim block does; it says nothing of layout.
- `openspec/changes/polaris-dossier-one-command-run/proposed/polaris-generation/spec.md`
  names 034 as a parent only.

Neither edits 034's text, so the three compose without overlap; whichever
lands second regenerates its dependency rows. A second predicate,
`git grep -l -F polaris-dossier-local-draft -- openspec`, matches no file.

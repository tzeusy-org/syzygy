# Impact ledger — public Git source acquisition, local-agent version 1.1

> **Candidate — binds nothing.** This ledger says what signing version 1.1
> would touch, and what must travel with it. It performs nothing, and it
> quotes no digest; `PROPOSED-SUBJECTS.json` and the builder's `--digests`
> carry them.

## What the sign-off writes

[Observed, from `scripts/record_versioned_signoff.py` and the builder.]

| Path | Effect |
|---|---|
| `.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json` | Replaced by the proposed bytes, through `apply()` of `scripts/build_public_git_source_acquisition_local_agent_v1_1.py`, which refuses unless the package verifies and the installed bytes are v1.0's |
| decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.1.md (written at sign-off) | New dedicated record, naming the installed entry and the SHA-256 of its new bytes, `adopt-registry-entry`, state (1), A1 explicitly absent |
| `.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md` | One appended block, `versioned-signoff:public-git-source-acquisition-local-agent:v1.1` |
| tag | `public-git-source-acquisition-local-agent-v1.1`, on the commit carrying the above |

Nothing else is written by the recorder. The v1.0 record, the v1.0
candidate directory and its proposed bytes stay; the v1.1 builder uses the
v1.0 proposed bytes as its base and checks that they hash to the SHA-256
the v1.0 record names.

## What must change in the same commit as the sign-off

These are not drafted here, because they are implementation or battery
changes that only the signing lane may make, and the first needs an
implementation authorization.

1. **The gate's hard-wired v1.0 form.** [Observed]
   `packages/polaris-generation-consent/src/package-reader.ts`,
   `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`, names version 1.0 and the v1.0
   record's file. Its own comment says a later sign-off record "carries the
   `…-signoff` stem, so this reader takes it for a withdrawal of v1.0 and
   refuses", and "The commit that records a later version must change this
   form in the same commit". [Inferred] Without that change, recording v1.1
   makes every local-agent dossier read refuse: the reader finds the v1.1
   record, and the installed bytes no longer hash to v1.0's SHA-256.
2. **The battery.** `PROJECT-STATUS.md`, the hosted workflow and the count
   sentence (CG-26) carry `record_versioned_signoff.py --check
   public-git-source-acquisition-local-agent --version 1.0`. The sign-off
   commit adds the `--version 1.1` line and, if the owner wants the base
   check in the battery, the v1.1 builder's `--check`. This draft leaves the
   CG-26 triple alone, as the integration rule requires.
3. **The implementation of the copy step.** No file implements it
   (`implementationCoverage.copyStep`). It belongs to launch-consent v1.2's
   implementation and needs its own authorization.

## Tooling this draft changes

[Observed, this commit.]

- `scripts/build_public_git_source_acquisition_local_agent_v1_1.py`: the
  builder (`--check`, `--digests`, `--selftest`, `apply`, `applied`,
  `signed_findings`).
- `scripts/build_public_git_source_acquisition_local_agent.py` (v1.0): once
  a v1.1 record exists its check defers to the v1.1 builder's
  `signed_findings()`, instead of failing on installed bytes that are no
  longer v1.0's; one selftest fixture added. Its behaviour today, with no
  v1.1 record, is unchanged.
- `scripts/record_versioned_signoff.py`:
  - the package entry `public-git-source-acquisition-local-agent@1.1`, with
    a routing selftest;
  - `--check` of a registry-entry version that a later recorded version
    has replaced regenerates that record with the record's own SHA-256,
    instead of hashing the tree, which now holds the later bytes. Without
    this, recording v1.1 would make the battery's v1.0 line fail. A selftest
    fixture records v1.0 and then v1.1 over a stub entry and checks both;
    mutating the change back fails that fixture (rule 6, run this session).
    The guard on v1.0's bytes after v1.1 is the v1.1 builder's check, which
    hashes the v1.0 base against the v1.0 record;
- `scripts/prepare_three_surface_poc_governedby_reference_recording.py`:
  the T17 census closed set admits the new recorder key.

## Governance checks

- **CG-7d / CG-7e.** [Observed] Nothing to register. Version-tagged
  sign-offs carry no phrase and no digest argument (Scope A, item 4), and
  neither the v1.0 entry nor launch-consent v1.1 registered anything with
  `_act_subjects()` or `ACT_DIGEST_COPY_FILES`. The package's Markdown files
  carry no 64-hex token; the builder refuses one.
- **CG-26.** Left alone (above).
- **Review campaigns.** No raw is retained by this draft, so
  `docs/review-campaigns/` is unchanged. A campaign file or pattern for this
  package's raws is added in the commit that retains the first one.

## Who else reads the entry

[Observed, a sweep of `packages/`, `apps/` and `scripts/` for the
installed file name and the v1.0 record name.]

| Reader | What it reads | Effect of v1.1 |
|---|---|---|
| `package-reader.ts` (`LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`) | the record and the bytes' SHA-256 | Must change with the sign-off (item 1 above) |
| `start-gates.test.ts`, `gate-acts.test.ts` | fixtures naming the entry's path, the v1.0 record and the v1.0 tag as a run's `registryEntry` | [Inferred] follow item 1; a run record then names the v1.1 tag |
| `build_dossier_local_agent_acts.py` | the v1.0 sitting | Unchanged; the sitting manifest rows the v1.0 proposed file, which stays |
| `record_versioned_signoff.py`, the two builders | as above | Changed in this draft |

No product code reads the entry's `typedAuthority` text: the gate binds the
entry by its bytes' SHA-256, not by parsing its fields.

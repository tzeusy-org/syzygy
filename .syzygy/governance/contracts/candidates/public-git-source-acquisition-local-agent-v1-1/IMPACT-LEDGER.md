# Impact ledger — public Git source acquisition, local-agent version 1.1

> **Candidate — binds nothing.** This ledger says what signing version 1.1
> would touch, and what must travel with it. It performs nothing, and it
> quotes no digest; `PROPOSED-SUBJECTS.json` and the builder's `--digests`
> carry them.

## Binding

This package is bound to PR #812 at head `de9c1ba8`: its Proposed blocks
restate the copy step, the classes of run and the launch reads of the
post-apply launch-consent spec at that head. If #812 moves, this ledger and
the package are redrafted.

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
changes that only the signing lane may make. Items 1 and 1b change product
code and need an implementation authorization.

1. **The gate's hard-wired v1.0 form.** [Observed]
   `packages/polaris-generation-consent/src/package-reader.ts`,
   `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`, names version 1.0 and the v1.0
   record's file. Its own comment says a later sign-off record "carries the
   `…-signoff` stem, so this reader takes it for a withdrawal of v1.0 and
   refuses", and "The commit that records a later version must change this
   form in the same commit". [Inferred] Without that change, recording v1.1
   makes every local-agent dossier read refuse: the reader finds the v1.1
   record, and the installed bytes no longer hash to v1.0's SHA-256.
   [Observed] The production start gate reads the form through the
   constant, not the file name: `packages/polaris-dossier/src/gate-sources.ts:511`
   (`options.registryForm ?? LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`). Changing
   the form covers it by construction (round-1 Finding 7).
   [Observed] The form's record template (`package-reader.ts`, the
   registry sign-off template above the constant) spells the record's fixed
   lines: "Scope: the entry's own subject and read authority, nothing
   wider", "supersedes nothing" and "widens no egress, write or execution".
   The v1.1 record carries this version's own lines instead (see the
   recorder below), so a form for v1.1 needs a template that renders them,
   or the reader refuses the v1.1 record as malformed. That template is
   part of item 1.
1a. **The tests and scripts that pin the v1.0 form.** [Observed, a sweep of
   `packages/`, `apps/` and `scripts/` for the constant's name, 33
   occurrences in 10 files, read one by one, and the local `SIGNOFF`
   constant round 2 found; see "Who else reads the entry".] These must
   change in the same commit as item 1, or they fail once the v1.1 record
   exists:
   - `packages/polaris-generation-consent/src/real-tree.test.ts:43-44`
     expects identity `public-git-source-acquisition-local-agent-v1.0`
     whenever the form's record exists.
   - `packages/polaris-dossier/src/gate-acts.test.ts:581`, `:596` and
     `:613` pin the form's file name to the v1.0 record and its template's
     rendering to the v1.0 record's bytes.
   - `packages/polaris-dossier/src/gate-acts.test.ts:31` defines `SIGNOFF`
     as the v1.0 record's path, and `:220`, inside `expectFollowsTree`
     (called on the real tree at `:93`), expects
     `{ state: 'ok', record: 'public-git-source-acquisition-local-agent-v1.0' }`
     whenever that file exists. The v1.0 record stays after v1.1 is
     recorded, so this fails on the real tree once the form moves (round-2
     Finding 3). It reaches the record through a local constant, not the
     form; the first sweep, for the v1.0 record name, should have found it.
   - `scripts/measure_consent_gate_recognition.mjs:142` names the recorder's
     check key `--version 1.0` for the form's record.
   - **The v1.0 fixture family** (round-3 Finding 4). [Observed, a third
     sweep of the tracked files under `packages/`, `apps/` and `scripts/`
     for the literals `local-agent-v1.0` and `LOCAL-AGENT-SIGNOFF-v1.0`: 22
     lines in 7 files, read one by one.] `gate-acts.test.ts:63` (`world(…,
     true)`) writes the record at the fixed v1.0 path `SIGNOFF` with
     `renderLocalAgentSignoff`
     (`packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts:162`),
     and the tests that read it expect the v1.0 identity or its absence
     message: `gate-acts.test.ts:90`, `:221`, `:230`, `:269`, `:432-443`,
     `:503`, `:577`, `:612-615` and `:659-668`. `start-gates.test.ts:191`
     and `:1036` expect `public-git-source-acquisition-local-agent-v1.0` as a
     literal, and `:675` and `:678` name it in expected refusal text.
     `real-tree.test.ts:55` names it in a withdrawal probe. Once item 1
     moves the form to v1.1, the reader looks for the v1.1 record, so each
     of these, and the testkit renderer, must change in the same commit or
     be shown by that commit's test run still to hold. The remaining lines
     of the sweep (`gate-acts.test.ts:359`, `:376`, `:381-382`, which test
     v1.0's own withdrawal and register rows; the v1.0 builder, the recorder
     and `package-reader.ts:884`, the form itself) are named for
     completeness.
1b. **The launch reads narrowed to the closed list** (round-3 Finding 1;
   the owner's option 1, "Before you sign" item 1). [Observed] For a
   launch-consented run the entry closes the reads of the operator's clone
   to five things, and two of them are narrower than the code reads today:
   - `packages/polaris-dossier/src/launch-clone.ts:100-125`
     (`readCloneSnapshot`) walks every entry under `.git/refs/` and reads
     the value of every loose reference file: tags, every remote-tracking
     branch, the stash. Read (2) admits the names of all references but the
     values only of HEAD and the reference it names, the trunk-rule
     references, the local branch of the remote default's name and the
     reference `--revision` names (other values only as `packed-refs`
     carries them, used for nothing). The walk must read only those loose
     files' contents, listing the rest by name.
   - `packages/polaris-dossier/src/launch-revision.ts:33` and `:59-61`
     (`HEX_PREFIX = /^[0-9a-f]{4,64}$/`, then `ports.storedIds()`) list the
     store's object identifiers for any hexadecimal `--revision`, a full
     one included. Read (5) admits that listing "for an abbreviated
     --revision alone"; the listing must be skipped for a full identifier.
   This change must travel with the sign-off: signed without it, every
   launch-consented run's implementation reads outside the entry. It needs
   its own implementation authorization. [Observed] #812's own ledger at
   `de9c1ba8` ("Implementation impact") already requires the same
   narrowing for v1.2: "`init`'s pre-copy reads of the operator's clone
   become file-data reads of the listed references, remote URLs and the
   alternates file", and "`--revision` resolution and the reftable refusal
   follow 047's text". [Inferred] It does not name `launch-clone.ts` or the
   full-identifier listing, but #812's REQ-047 closes a launch-consented
   run's reads to the same list, so the v1.2 implementation needs this
   narrowing in any case, and it lands with that implementation when the
   two are signed together. Signed alone, this version needs it anyway.
   The enumeration of every read the launch path makes today, mapped to an
   entry clause or to this item, is in `ROUND-3-DISPOSITIONS.md`.
2. **The battery.** `PROJECT-STATUS.md`, the hosted workflow and the count
   sentence (CG-26) carry `record_versioned_signoff.py --check
   public-git-source-acquisition-local-agent --version 1.0`. The sign-off
   commit must add two lines, both required (round-1 Finding 3):
   - `record_versioned_signoff.py --check
     public-git-source-acquisition-local-agent --version 1.1`, which binds
     the installed v1.1 bytes to the v1.1 record;
   - `build_public_git_source_acquisition_local_agent_v1_1.py --check`,
     which proves the v1.1 package still verifies against the v1.0 bytes
     the v1.0 record names.
   Since round 1 the recorder's `--version 1.0` line holds the v1.0 record's
   SHA-256 line to the bytes v1.1's builder takes as its base (below), so a
   forged record line alone fails it. It does not catch a forged line and a
   forged base together, rewritten to agree: [Observed by the round-2
   reviewer] that pair passes the recorder line, and only the builders
   refuse it (the v1.1 builder: "the patch applied to the v1.0 bytes does
   not give the proposed bytes"). So the builder line is required for the
   base too, and it alone re-checks the v1.1 package's semantic predicates
   and patch after the sign-off (round-2 Finding 5). This draft leaves the CG-26 triple alone, as
   the integration rule requires.
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
    fixture records v1.0 and then v1.1 over a stub entry and checks both.
  - That SHA-256 line is never checked against itself alone (round-1
    Finding 3): a new `Package.replaced_bytes` names the bytes the later
    version takes as its base, and `--check` of the replaced version
    refuses unless the line is their SHA-256. A replaced version naming no
    such bytes fails closed. The v1.0 package names the v1.1 builder's
    `BASE`. A selftest fixture forges the line to 64 zeros and fails.
  - A registry entry's record may carry its own scope, supersession,
    "does not" and aggregate-closing text (round-1 Finding 2): four new
    `Package` fields, `None` by default, so every record already written
    regenerates byte for byte. Only the `@1.1` entry sets them: its scope
    names fetch, tags and state-directory writes; it "supersedes version 1.0
    of this entry", whose record stays the record of that version; and it
    says that, against version 1.0, it widens local execution and a local
    write in a copy-class run alone, and no network egress or write to an
    observed or external system. The fixed text stays for v1.0 and every
    other package; a selftest pins both.
  - The four v1.1 record texts (`GIT_SOURCE_V11_SCOPE`,
    `_SUPERSESSION`, `_DOES_NOT`, `_AGGREGATE`) are pinned in full, as
    literals, by the recorder selftest (round-2 Finding 4); they sit
    outside the package directory, so the review brief names them as
    reviewed bytes.
  - The rule-6 mutation records for these repairs are retained at
    `docs/evidence/syzygy-pdja-29/round-1-repairs-mutation-2026-11-10.json`
    and `docs/evidence/syzygy-pdja-29/round-2-repairs-mutation-2026-11-10.json`.
- `scripts/prepare_three_surface_poc_governedby_reference_recording.py`:
  the T17 census closed set admits the new recorder key.

## Governance checks

- **CG-7d / CG-7e.** [Observed] Nothing to register. Version-tagged
  sign-offs carry no phrase and no digest argument (Scope A, item 4), and
  neither the v1.0 entry nor launch-consent v1.1 registered anything with
  `_act_subjects()` or `ACT_DIGEST_COPY_FILES`. The package's Markdown files
  carry no 64-hex token; the builder refuses one.
- **CG-26.** Left alone (above).
- **Review campaigns.** `docs/review-campaigns/git-source-local-agent-v1-1.md`
  carries this package's raws (pattern `R-GIT-SOURCE-LOCAL-AGENT-V1-1-.*\.md`),
  added with the round-1 raw.

## Who else reads the entry

[Observed, two sweeps of `packages/`, `apps/` and `scripts/`: for the
installed file name and the v1.0 record name, and, after round-1 Finding 7
showed the first missed every reader that reaches them through the form,
for the constant `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM` (33 occurrences on 29 lines in 10 tracked files:
the definition, two re-exports and the readers below).]

| Reader | What it reads | Effect of v1.1 |
|---|---|---|
| `package-reader.ts` (`LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM` and its record template) | the record and the bytes' SHA-256 | Must change with the sign-off (item 1 above) |
| `gate-sources.ts:511`, the production start gate | the form, through the constant | Follows item 1 by construction |
| `real-tree.test.ts:43-44` | the form's record on the real tree, expecting the v1.0 identity | Must change in the same commit (item 1a) |
| `gate-acts.test.ts:581`, `:596`, `:613` | the form's file name and its template's rendering of the v1.0 record | Must change in the same commit (item 1a) |
| `gate-acts.test.ts:31`, `:220` (via `:93`) | the v1.0 record's path, by a local constant, expecting the v1.0 identity on the real tree | Must change in the same commit (item 1a) |
| `start-gates.test.ts:114-115` | the form's installed path and record path, as fixture inputs | [Inferred] follows item 1; the literals at `:191` and `:1036` do not (row above) |
| `gate-acts.test.ts:63`, `:90`, `:221`, `:230`, `:269`, `:432-443`, `:503`, `:577`, `:612-615`, `:659-668`, and `recorder-fixtures.testkit.ts:162` | the v1.0 record, written by the testkit renderer at the fixed v1.0 path and read back | Must change in the same commit, or be shown to hold (item 1a) |
| `start-gates.test.ts:191`, `:675`, `:678`, `:1036` | the v1.0 identity as a literal | Must change in the same commit, or be shown to hold (item 1a) |
| `launch-clone.ts:100-125`, `launch-revision.ts:33`, `:59-61` | the operator's clone, beyond the closed launch-read list | Must narrow in the same commit (item 1b) |
| `scripts/measure_consent_gate_recognition.mjs:100-153` | the form, and the recorder check key `--version 1.0` | The check key must change in the same commit (item 1a) |
| `scripts/differential_consent_act_families.mjs`, `scripts/differential_line_slot.mjs` | the form, as one reader among many | [Inferred] follow item 1; they read whatever form the constant names |
| `build_dossier_local_agent_acts.py` | the v1.0 sitting | Unchanged; the sitting manifest rows the v1.0 proposed file, which stays |
| `record_versioned_signoff.py`, the two builders | as above | Changed in this draft |

No product code reads the entry's `typedAuthority` text: the gate binds the
entry by its bytes' SHA-256, not by parsing its fields.

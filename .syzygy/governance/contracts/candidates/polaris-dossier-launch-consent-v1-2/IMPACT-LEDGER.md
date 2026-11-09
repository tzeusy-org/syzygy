# Impact ledger — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] The patch applies to the installed
> version 1.1 bytes on `main` (commit `715c59c4`), which hash to the digest
> the v1.1 review read. The record
> `.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.1.md`
> names that review, and `scripts/build_polaris_dossier_launch_consent_v1_2.py
> --check` compares the two. The subject digests are in `PROPOSED-SUBJECTS.json`,
> written by the builder, never by hand.

## Requirement impact

| Requirement | Effect |
|---|---|
| REQ-polaris-generation-046 | The preamble sorts runs into two classes at launch, keyed on the pinned revision: the run another act's consent covers with no launch record needed keeps every predecessor meaning; every other run is launch-consented. The pre-answer read list is scoped to the clones: Syzygy's reads of the operator's clone that 047 lists, the copy's form-check files and the `--revision` object's type, and the object reads, made in the copy where one exists (no type read of a `--revision` object); the copy step's Git processes are not Syzygy's reads, the copy lies outside REQ-046's write and removal absolutes, and the blob arm, the pre-answer arm and the oracle attribute reads by process. The question states the copy: one commit, made by Git over the local file transport with no network request; that Git read the operator's clone's configuration, references and object store, delta bases included; that Syzygy used nothing Git read but the copy; that agents are directed to the copy; that it was made before the answer, its blobs unread by Syzygy, and is removed on a decline. The run record and pages carry the same statements and the copy's location. The launch observation consent's scope is held in the copy. The write reading is extended to the copy's directory. The identity derivation keeps its v1.1 bytes: last two segments, every host, `https`, `http`, `ssh`, `git` and scp-form remotes. One sentence group says it applies to every host and adds a two-segment floor. The residuals now name the cross-host and cross-group share. Two paragraphs are added: locator forms (operator-given `https`, `http`, `git`, `ssh` and scp, as v1.1 normalises them, without credentials; remote locators in the same forms once their user information is removed; no URL that fails either rule printed, stored or recorded; an observation consent made by another act matching by its whole normalised `Upstream:` URL, in addition to every v1.1 match) and visibility for every host. Ten scenarios are added; the case, oracle and falsifier are extended; one `warrants.decisions` entry is added |
| REQ-polaris-generation-047 | The consented-HEAD branch's "changes nothing else" is narrowed to the pin. The trunk rule is made exact for remote-tracking references and several remotes, and `--revision` resolution for abbreviations (from names alone) and non-commits (refused from a `HEAD` other than the named identifier after a successful checkout; a failed checkout refused as "not shown to be a commit"; neither by Syzygy reading the object); the committer date stated only where read, else Unknown; every Git failure for the copy named as Git reported it; the terms copy-class run, no-copy run and a run whose copy step started defined once, and a copy-class run refused before its copy step stating only that no copy was made. "Did not fetch" becomes "made no network request". The HEAD paragraph is replaced: every run this requirement pins is a copy-class run unless another act's consent, or a launch observation consent recorded with version 1.1's scope, names its pinned revision, in which case the clone is the operator's, that consent's form binds it, a HEAD elsewhere is refused, and under a v1.1-scoped launch consent alone the clone must be in the one-commit form; the copy step (an empty directory and repository of Syzygy's own, a fetch of the pinned commit alone at depth one over the local file transport, a detached checkout, Git run with system and global configuration off, other transports refused, lazy fetching off and no hook path; form checked before the question; removed if the run ends before its brief, otherwise kept after the run until the operator removes it); what Git reads in the operator's clone; Syzygy's own closed list of reads there (locator files, named references as file data, remote names and URLs as text, the alternates file's existence, abbreviation names); refusals of reftable, alternates and a failed copy; from the copy on, REQ-033 to 036 apply to it unchanged; briefs and packets name the copy; the hooks and configuration residual, labelled Inferred. Sixteen scenarios are added, one v1.1 scenario ("HEAD elsewhere") now proceeds with a copy, and the first scenario's WHEN and THEN are amended; the case, observable, oracle independence and falsifier are replaced; one `warrants.decisions` entry is added |
| REQ-polaris-generation-001, 025, 033 to 036, 040 | Bytes unchanged. 033's object-read, re-hash and refusal rules apply to the copy unchanged; the copy is a clone of the form they were written for |

[Observed] Twenty-six scenarios are added, ten to 046 and sixteen to 047.
The change's spec goes from 28 `#### Scenario:` headings to 54, counted by
`grep -c` over the installed and the patched bytes on 2026-11-10.
`PROJECT-STATUS.md`'s effective-composition figure is 38 requirements and
302 scenarios today (`status_figure()`), so 328 after install [Inferred:
computed, not yet recounted with the patch applied]. It is recounted by
`apply()` at install, and `check_spec_reconciliation.py
--regenerate` follows.

## Behaviour that changes for existing users

- **Narrower: typed credentials.** An operator-given URL with credentials,
  a query or a fragment is refused. Under version 1.1 its user information
  was dropped silently.
- **Narrower: a typed bare user name over `https`, `http` or `git`.** Such a
  URL is refused, where version 1.1 dropped the user information silently.
  An `ssh` or scp user name alone is still admitted.
- **Not narrower: typed http and git.** An operator-given `http://` or
  `git://` upstream is admitted, as version 1.1 normalises it, credentials
  refused. [Inferred] This follows the coordinating session's reading of
  owner ruling 4 (`SEMANTIC-DELTA.md` D6), which the owner has not been
  asked; the sign-off page flags it.
- **Narrower: a remote URL that is not a locator.** It derives nothing,
  and is never printed, stored or recorded; the launch output names the
  remote and the rule.
- **Narrower: annotated tags, reftable, alternates and partial clones.** A
  `--revision` naming an annotated tag is refused before the question; a
  clone whose references are in the reftable backend, or that has an
  alternates file, is refused before any Git process starts; a clone
  missing an object the pinned tree reaches, a partial clone's included,
  fails the copy and is refused. [Observed] The implementation already
  refuses a non-commit `--revision`; whether it reads reftable is
  [Unknown].
- **Narrower: SHA-256 clones.** [Observed, round 4 note 7] A SHA-256 clone
  fails the copy (the copy's empty repository has the default object
  format, and the one-commit form refuses a SHA-256 repository), so a copy-class run refuses it. The signed registry entry admits SHA-256
  objects. Carried to the owner.
- **Narrower: full clones under a launch consent recorded by v1.1.** Such a
  consent's scope holds its revision in the operator's own clone with no
  fetch by Syzygy, so its runs are no-copy runs and need the one-commit form; a
  full clone is refused. [Observed, local refs only] No such record is
  known today.
- **Wider: a HEAD elsewhere.** A copy-class run no longer refuses
  when the operator's HEAD is another commit, detached or dirty; the copy
  is checked out at the pinned revision. A run whose revision another
  act's consent names still refuses, as before.
- **A cost the owner accepted: shared identities across hosts and groups.**
  This is owner ruling 3, "a same-named repo on two hosts would share
  consent records".
  - `gitlab.com/a/b` derives the identity of `github.com/a/b`. So do
    `group1/sub/p` and `group2/sub/p` on one host.
  - Unless the operator gives another identity, the second one launched
    matches the first one's records by identity, and relies on its drawer
    and agent-provider statements.
  - The question names those records and how they matched.
  - Observation consents name revisions and do not carry across.
  - A consent made by another act matches by URL only through its whole
    normalised `Upstream:` URL, so by URL it never reaches the other
    repository. It may still match by identity, which the question shows.
- **A cost carried to the owner: port and case merge.** Normalisation drops
  the port and case-folds, so two servers on one host at different ports, or
  two repositories differing only in case, share a normalised URL and an
  identity (round 1 note 10; the sign-off page states it).

## Implementation impact

[Inferred] After sign-off only, under a separate implementation direction:

- `init` makes the copy for every run that 047 says makes one: a directory
  and empty repository of Syzygy's own, a local fetch of the pinned commit
  alone, a detached checkout, in the stated Git environment; it then
  applies the existing single-commit clone-shape check
  (`packages/polaris-dossier/src/clone-shape.ts`) to the copy, and
  removes the copy when the run ends before its brief; a completed run's
  copy is kept and its location printed.
- `init`'s pre-copy reads of the operator's clone become file-data reads
  of the listed references, remote URLs and the alternates file, with the
  reftable and alternates refusals.
- The GitHub-only parser (`packages/polaris-dossier/src/github-url.ts`) and
  the `init` refusal that a run record carries a GitHub URL only give way
  to:
  - a locator parser for the admitted forms;
  - the remote-locator forms;
  - matching of other acts' consents by the whole normalised `Upstream:` URL.
- The identity derivation (`launch-identity.ts`) keeps its rule and gains
  the two-segment floor.
- The launch question, the launch output, the run record, the pages, the
  brief and every review packet gain the statements REQ-046 and 047 add, the
  copy statements included; briefs and packets name the copy.
- `--revision` resolution and the reftable refusal follow 047's text.

No product code changes with this package. `tasks.md` is unchanged.

The `warrants.decisions` lists gain
`OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09`. The change's
`GOVERNING-DEPENDENCIES.md` is generated at install from the warrants
(`scripts/check_spec_reconciliation.py --regenerate`), so it changes then.
It is not patched here.

## Records and acts read, none edited

- **The redis observation consent** (a performed act's record) keeps its
  one-commit form for runs that rely on it, and this version says so.
- **The source-acquisition registry entry: a conflict, flagged for the
  owner.** [Inferred, field by field in `SEMANTIC-DELTA.md` D9] The copy
  contradicts `fetch` ("none: Syzygy fetches nothing"), `readAuthority`
  (objects read from the operator's clone, "no process is started") and
  `stateDirectoryWrites` ("nothing is written to the clone"), and arguably
  `tags` (a tag object brought into the copy) and `writeSurface` (`[]`).
  D9's table also reads `authorityType`, `questions`, `databaseAccess`,
  `networkAccess`, `executeObservedCode`, `workingTreeRead` and `submodules`
  as not contradicted. Version 1.2 therefore cannot
  take effect under the entry as signed: it needs an owner-signed
  successor version first. This package does not draft it. The reference
  and remote-URL reads are carried from v1.1 as launch reads, not new
  conflicts. The fetch-form reading of version 1.0's design §5 still
  governs no-copy runs.
- **Screening scope v8** (held) and the installed v7 name no host or
  `github:` identity. The visibility carrier is the launch record's
  declaration, which this version leaves to the operator for every host.
- **The launch-record write consent** (performed) names only
  `repository:tzeusy-org-syzygy`, whose derivation is unchanged.

## Tooling registered at drafting time

- The builder `scripts/build_polaris_dossier_launch_consent_v1_2.py`
  (`--check`, `--selftest`, `--write-subjects`).
- The v1.1 builder peels an applied v1.2 patch and delegates
  `signed_findings()` here once v1.2 or later is recorded. Its
  unknown-later-version fixture moves from v1.2 to v1.3.
- The recorder's `polaris-dossier-launch-consent@1.2` package, with its
  routing selftest, and the P115 census's closed set of later packages.
- **No CG-7d or CG-7e registration.** A versioned sign-off binds a version
  tag, with no phrase and no digest argument
  (`OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02`), so there is no
  act phrase or packet digest copy to register.
- **The CG-26 battery triple is held for the sign-off commit,** as for
  version 1.1: the PROJECT-STATUS battery lines, the hosted workflow steps
  and the count sentence.

## Costs

- **A copy before the answer.** The copy, with the pinned tree's blobs and
  checked-out files, exists before the operator answers. Syzygy reads none
  of its blobs as content before the answer, the question says so, and a
  decline removes it.
- **Git reads the operator's clone.** To serve the copy, Git reads the
  clone's configuration, references and object store, the stored bytes of
  delta bases outside the pinned tree included. Syzygy uses none of it but
  the copy, and the question, the run record and the pages say so.
- **A residual about Git itself.** That Git starts no program the
  operator's clone's configuration or hooks name while serving the copy is
  relied on, labelled Inferred in the run record. A Git 2.53.0 fixture ran
  none (`SEMANTIC-DELTA.md` D2).
- **Agent reach.** Agents are directed to the copy, as the owner chose on
  2026-11-10, replacing ruling 2's disclosure. The operator's clone stays on
  the same host, so a session that ignores its brief can still read it;
  compliance is Inferred.
- **Disk.** Each completed copy-class run leaves one commit's
  objects and checkout in a directory of Syzygy's own, outside the run's
  state directory, until the operator removes it; the launch output names
  it. A run that ends before its brief removes its copy.
- **Shared identities** across hosts, groups and joined characters, as
  above.
- **Remote-tracking staleness.** The trunk tip is the clone's last fetch, as
  before. A full clone fetched long ago pins an old commit; the
  no-network statement and the update command are the remedy already in
  force.

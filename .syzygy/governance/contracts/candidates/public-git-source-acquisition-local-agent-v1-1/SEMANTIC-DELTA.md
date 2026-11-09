# Semantic delta GIT-SOURCE-LOCAL-AGENT-V1-1 — the source-acquisition entry admits the launch copy

> **Candidate — binds nothing.** Drafted by an agent lane (bead
> `syzygy-pdja.29`) so that the owner can decide it beside launch-consent
> v1.2. Only the owner signs (VIS-4). No act argument is quoted here; the
> builder's `--digests` prints the rows, and `PROPOSED-SUBJECTS.json`
> carries them.

**Artifact:** `.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`,
the source-acquisition registry entry for the local-agent mode, signed as
version 1.0 on 2026-10-07
(`decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md`).
The proposed bytes are `proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`,
which equal the installed v1.0 bytes with `proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json.patch`
applied.

**Declarations that move:** five, and nothing else.

- `typedAuthority.fetch`
- `typedAuthority.readAuthority`
- `typedAuthority.tags`
- `typedAuthority.stateDirectoryWrites`
- `implementationCoverage.copyStep` (a new key)

Every other byte of the entry is unchanged, the observer and registry
version strings included (see "What does not change").

**Change class:** Normative. A read authority is widened for one named
kind of run, the run that makes a copy, and bounded in words for the launch
reads it already rests on.

**Author:** agent lane (Claude Code, Opus 5.5). **Date:** 2026-11-10.

## Warrant

- [Observed] The owner's selection of 2026-11-10, recorded on PR #812's
  branch in decisions/OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md,
  section "Redesign after review round 3": "Redesign: copy trunk tip
  locally (Recommended)". That record says the selection "authorizes
  drafting only".
- [Observed] PR #812's semantic delta, decision D9 (branch head
  `e004db00`), says the copy step contradicts `fetch`, `readAuthority` and
  `stateDirectoryWrites`, that `tags` is arguably contradicted, and that
  `networkAccess`, `executeObservedCode`, `workingTreeRead` and
  `submodules` are not. It says the launch-consent version "cannot take
  effect under the entry as signed" and needs "an owner-signed successor
  version of the entry". This package is that successor, drafted.
- [Observed] The round-4 review of launch-consent v1.2
  (docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-4-RAW.md on PR #812's
  branch, verdict `REVISE`), Finding 3,
  named `stateDirectoryWrites` and `tags` as unnamed contradictions, and
  said that v1.1's reads of references and remote URLs are not new
  conflicts of the redesign.
- [Observed] The entry's own supersession clause: "a later edit is a new
  version signed separately".

## The copy step this version admits

As PR #812's REQ-polaris-generation-047 drafts it (head `e004db00`):

1. Before the copy, in a launch-consented run, Syzygy reads five things of
   the operator's clone as file data and honours none of them: the files
   that locate the Git directories; reference names and the values of the
   references the pinning rule needs, from loose files and `packed-refs`;
   the configuration file, as text, for remote names and URLs; whether
   `objects/info/alternates` exists; and, for an abbreviated `--revision`
   only, object identifiers from loose object names and pack indexes.
2. Syzygy creates an empty directory of its own and an empty repository in
   it (`git init --template=`).
3. It fetches the pinned commit alone, by full identifier, at depth one,
   with no tags and no submodules, from the operator's clone over
   `file://`, and checks it out detached. Every Git process runs with
   system and global configuration disabled, no other Git variable of the
   operator's environment, only the file transport allowed, lazy fetching
   off and no hook path.
4. It checks the copy's form, then reads objects from the copy alone under
   the signed rules.
5. It removes the copy where the run ends before its brief. Otherwise the
   copy is kept after the run, outside the run's state directory, until
   the operator removes it, and the launch output names where.

## Decisions

### E1. Which fields move, field by field

[Inferred, each row read against the copy step above.]

| Field | v1.0 says | Under the copy | This version |
|---|---|---|---|
| `fetch` | "none: Syzygy fetches nothing" | Contradicted: Syzygy runs one local fetch | Keeps v1.0's sentence for the run that makes no copy; adds the copy step, exactly |
| `readAuthority` | objects read from "the operator's clone's .git directory", "no process is started" | Contradicted: object reads are made in the copy; Git processes start | Keeps every v1.0 word but two clauses; names the copy as the object store and the copy's Git processes as the one exception; bounds the launch reads to five, as data |
| `tags` | "never read; ... any other type refuses" | Arguably contradicted: a `--revision` naming an annotated tag brings the tag object into a clone Syzygy made | Keeps v1.0's words; adds that in a copy only the tag's type is read, to refuse it, the object it names is never followed, and the copy is removed |
| `stateDirectoryWrites` | the run's state directory; "nothing is written to the clone" | Contradicted: the copy is written before, and outside, the state directory, and kept after the run | Keeps v1.0's state-directory clause; adds the copy's directory, bounded; closes the operator's clone by name |
| `implementationCoverage` | the reader's and the gate's declarations | Would claim the reader implements the copy | Adds `copyStep`: no file implements it yet, and until one does no run makes a copy |
| `networkAccess`, `executeObservedCode`, `workingTreeRead`, `submodules` | none; false; false; a gitlink is never followed | Not contradicted (D9 of PR #812): no network request, no hook or observed program runs, Syzygy reads no working tree, no submodules are fetched | Unchanged |

**On `tags`, my judgement.** The type read itself is not new: refusing any
other type already needs one, and v1.0's reader makes it ("a wrong type
refuses that step"). What is new is that Syzygy's own fetch writes a tag
object into a clone Syzygy made, and `tags` says "never read" without a
place for that. A reader of the entry alone could not tell that this is
admitted, so the field moves, by one appended clause, rather than resting
on a reading. The alternative, leaving `tags` byte-identical and stating
the reading here, is offered to the reviewer as Question 1 in the brief.

### E2. The run that makes no copy keeps v1.0's words

- `fetch` opens with v1.0's sentence unchanged but for "none" becoming
  "none in a run that makes no copy".
- `readAuthority` keeps "and no process is started" and adds "save, in a
  run that makes a copy, the Git processes fetch names", which is inert
  where no copy is made.
- `stateDirectoryWrites` keeps v1.0's first clause byte for byte; its
  closing clause now says "the operator's clone", which in a run that makes
  no copy is the clone v1.0 meant.

The redis consent's run is such a run; this version changes nothing it may
do. The fetch-form reading of the launch-consent change's design §5 still
governs it.

### E3. The launch reads, said in words

[Observed, PR #812 D9, "What is carried from v1.1, not new".] v1.1 as
signed already reads the operator's clone's references and remote URL
before the answer, and the clone-form check already reads the redis
clone's `.git` files. Both rest on the reading that v1.0's "no ref, ...
repository-local configuration, ... shallow file ... is read" bounds the
reader's object reads, not the launch reads. D9 asks the successor to say
so in words, and this version does: "Those words bound the object reads.
Besides them Syzygy reads, as data and never honoured, only the following,
which are the launch reads of the pinning, identity and clone-form rules
and not object reads." It then lists the five launch reads, the copy's form
check, and the no-copy run's form check where a consent states a form.

That sentence does not widen what v1.1 runs do: it states the reading they
already rest on and bounds it to a closed list. The reference and URL reads
are not new conflicts of the redesign, as round 4's Finding 3 says. What is
new is the list's extent (the trunk-rule references, the local branch of
the remote default's name, `packed-refs`, the existence of the alternates
file, and the names for an abbreviation), which REQ-047 of v1.2 adds.

### E4. "A run that makes a copy" is defined by REQ-047, unversioned

The entry says "a run REQ-polaris-generation-047 says runs on a copy". It
names no version of that requirement. Under REQ-047 as signed today (v1.1)
no run makes a copy, so every copy clause is inert; under v1.2, as drafted,
every launch-consented run whose pinned revision no other act's consent
names makes one. The form of the copy is fixed by the entry's own words, so
a later REQ-047 version that changed which runs copy could not change what
a copy may be.

### E5. Versions are not bumped

`registryVersion` and `observerVersion` stay `2.0.0-candidate.1`. The
nearest precedent, the machine-ceiling amendment of the Butlers entry
(`pwb-registry-machine-ceiling-amendment`), changed a declared value and
kept its version strings; the entry's identity scheme
(`observer-id-plus-version-plus-content-digest-plus-provenance-state`)
already separates the two versions by content digest, and the sign-off is
tagged `public-git-source-acquisition-local-agent-v1.1`. A bump would move
two more declarations and break the "every other byte unchanged" property
the builder checks. It is the reviewer's Question 2.

### E6. Residuals stated, not closed

- [Inferred] That Git starts no program the operator's clone's own
  configuration or hooks name while it serves the copy. `fetch` says this
  is Inferred, not checked, as REQ-047 does.
- [Observed] The `git-object-database` input class keeps its identity
  scheme `repository-id-plus-operator-declared-clone-git-dir`. In a run
  that makes a copy, the object database is the copy's, which the operator
  did not declare; the copy is derived from the declared clone by the
  fetch the entry names. Moving the scheme would change an identity the
  v1.0 builder pins, so it is left and named here; the reviewer's Question
  3 asks whether it must move.
- [Observed] `provenanceDisclosure` says the operator's clone "and every
  record the gates read lie within the operator's agent sessions' write
  reach". The copy lies within it too, and agents work in it. The sentence
  stays true and is not edited.

## What does not change

- Every declaration not listed above, byte for byte, including
  `networkAccess`, `writeSurface`, `databaseAccess`, `executeObservedCode`,
  `workingTreeRead`, `submodules`, `screening`, the resource limits,
  failure states and admission mappings, the input and output classes and
  the version strings. The builder proves this structurally and by the
  patch.
- The signed v1.0 record and the installed v1.0 bytes. Signing v1.1
  installs new bytes at the same path; it does not edit or retire the v1.0
  record (Scope A, item 2).
- The launch-consent specification, the local-agent mode specification,
  the screening policy, the write consent and the redis consent.

## Dependency on launch-consent v1.2

This version is useful only if launch-consent v1.2 (PR #812), with a copy
step of the form above, is signed. Each signed without the other:

- **This version signed, v1.2 not.** No run makes a copy (E4), so the copy
  clauses are inert. What remains live is the launch-reads sentence (E3),
  which bounds v1.1's existing reads to the five and the form check. That
  is a narrowing in words of what v1.1 already does, not a widening. The
  entry's bytes change, so the gate's hard-wired v1.0 form must change in
  the same commit (see IMPACT-LEDGER).
- **v1.2 signed, this version not.** v1.2 cannot take effect: no reading
  of "fetches nothing" or "no process is started" admits the copy (PR
  #812's D9). A run that would make a copy must refuse, or the
  implementation would read beyond the signed entry.
- **v1.2 changes again before signing.** These Proposed blocks restate the
  copy step as `e004db00` drafts it. Any change to the copy's form, its
  environment, the launch reads or the keeping of the copy needs this
  package redrafted and reviewed again before both are offered.

## Exact blocks

Each block is the declaration's full string value, exactly as it is in the
JSON, without the JSON escaping (none of these strings needs any).

### Change 1 (replace), `entries[0].typedAuthority.fetch`

**Current:**

```text
none: Syzygy fetches nothing. The operator prepares the clone with their own tools; to stay within the observation consent's stated fetch form the operator fetches the one consented commit alone (git fetch --depth=1 <upstream> <commit>) and checks it out
```

**Proposed:**

```text
none in a run that makes no copy: Syzygy fetches nothing. The operator prepares the clone with their own tools; to stay within the observation consent's stated fetch form the operator fetches the one consented commit alone (git fetch --depth=1 <upstream> <commit>) and checks it out. In a run that makes a copy, which is a run REQ-polaris-generation-047 says runs on a copy, one local fetch and nothing else, made before any object is read: Syzygy creates an empty directory of its own for the copy, outside the operator's clone and never at a location derived from its path, and in it an empty repository with an empty template (git init --template=); it fetches into that repository, from the operator's clone over Git's local file transport (a file:// URL) and from nowhere else, the pinned commit alone, named by its full object identifier, at a depth of one, with no tags and no submodules, and checks that commit out detached. Every Git process it starts for the copy runs with the system and global Git configuration disabled, with no other Git variable of the operator's environment, with every transport but the file transport refused, with lazy fetching of missing objects disabled and with no hook path, and no other process is started. A clone with an alternates file, or whose references are stored in the reftable backend, is refused before any Git process starts. The copy holds the pinned commit and the trees and blobs reachable from its root tree alone, in the form one commit fetched alone into an empty repository and checked out detached leaves, and Syzygy checks that form before the question. A failed fetch, a pinned identifier that names an object other than a commit (tags), or a copy that departs from that form refuses, and nothing is then fetched from anywhere else. To serve the copy Git reads the operator's clone's configuration, references and object store, the stored bytes of delta bases outside the pinned commit's objects included; Syzygy uses nothing Git read but the copy. That Git starts no program the operator's clone's own configuration or hooks name while it serves the copy is Inferred, not checked. The file URL of the operator's clone is not a locator and is never recorded or rendered as one
```

### Change 2 (replace), `entries[0].typedAuthority.readAuthority`

**Current:**

```text
Git object reads by object identifier at the run's pinned revision only: the pinned commit, its root tree and the trees and blobs reachable from it, walked down from the commit and never to a parent. Objects are read in process from the loose objects and version-2 packs of the operator's clone's .git directory; no ref, staging index (`.git/index`; the pack indexes under `objects/pack/` are read), working tree, repository-local configuration, hook, alternates file, grafts file, shallow file, replace ref or commit-graph is read, and no process is started. The hash algorithm is the one the consented identifier is written in (40 hex digits SHA-1, 64 SHA-256). Every commit, tree and blob on the path to each blob used is re-hashed from the bytes read, at every step that uses it; a mismatch, a missing object (one only an alternate or a replacement could supply included), an undecodable object or a wrong type refuses that step
```

**Proposed:**

```text
Git object reads by object identifier at the run's pinned revision only: the pinned commit, its root tree and the trees and blobs reachable from it, walked down from the commit and never to a parent. Objects are read in process from the loose objects and version-2 packs of the .git directory of the operator's clone, or, in a run that makes a copy (fetch), of the copy; no ref, staging index (`.git/index`; the pack indexes under `objects/pack/` are read), working tree, repository-local configuration, hook, alternates file, grafts file, shallow file, replace ref or commit-graph is read, and no process is started, save, in a run that makes a copy, the Git processes fetch names. The hash algorithm is the one the consented identifier is written in (40 hex digits SHA-1, 64 SHA-256). Every commit, tree and blob on the path to each blob used is re-hashed from the bytes read, at every step that uses it; a mismatch, a missing object (one only an alternate or a replacement could supply included), an undecodable object or a wrong type refuses that step. Those words bound the object reads. Besides them Syzygy reads, as data and never honoured, only the following, which are the launch reads of the pinning, identity and clone-form rules and not object reads. In a launch-consented run (REQ-polaris-generation-046 and 047), before any object is read, it reads in the operator's clone these five things alone: (1) the .git file or directory and the files that locate the Git directory and the common Git directory; (2) the names of its references, and the values of HEAD and the reference it names, of the references REQ-polaris-generation-047's trunk rule names, of the local branch of the remote default's name and of the reference --revision names, each from the loose reference files and packed-refs, where reading packed-refs also reads other references' values, which are used for nothing; (3) its configuration file, as text, for its remotes' names and URLs alone; (4) whether objects/info/alternates exists; (5) for an abbreviated --revision alone, the object identifiers its loose object file names and pack indexes give. In a run that makes a copy it reads no object of the operator's clone, and it reads the files of the copy's .git directory that the form check of fetch names. In a run that makes no copy, where the consent that covers the run states a form for the clone, it reads the files of the operator's clone's .git directory that the same form check names
```

### Change 3 (replace), `entries[0].typedAuthority.tags`

**Current:**

```text
never read; the pinned identifier must name a commit object, and any other type refuses
```

**Proposed:**

```text
never read; the pinned identifier must name a commit object, and any other type refuses; in a run that makes a copy, a pinned identifier that names an annotated tag brings that tag object into the copy, where only its type is read, to refuse it; the object it names is never followed, and the copy is removed
```

### Change 4 (replace), `entries[0].typedAuthority.stateDirectoryWrites`

**Current:**

```text
Syzygy's own state directory for the run, outside the clone and never at a location derived from the clone's path; nothing is written to the clone, the observed repository, its forks or its tracker
```

**Proposed:**

```text
Syzygy's own state directory for the run, outside the clone and never at a location derived from the clone's path; in a run that makes a copy, also the copy's directory (fetch), which Syzygy creates empty before the run's state directory exists, outside that directory and outside the operator's clone and never at a location derived from the operator's clone's path, writes only through the Git processes fetch names, removes where the run ends before its brief, and otherwise keeps after the run, until the operator removes it, at a location the launch output names; nothing is written to the operator's clone, the observed repository, its forks or its tracker
```

### Change 5 (insert), `entries[0].implementationCoverage.copyStep`

**Current:** absent. The key is inserted after `implementationCoverage.status`.

**Proposed:**

```text
[Observed] at this version's drafting no file implements the copy step, its Git environment, the five launch reads or the copy's directory, which typedAuthority.fetch, readAuthority, tags and stateDirectoryWrites declare for a run that makes a copy; the reader implements those declarations only as they concern the clone it reads objects from. The copy step is the launch step's (REQ-polaris-generation-047), which no implementation authorization covers yet; until it is implemented no run makes a copy
```

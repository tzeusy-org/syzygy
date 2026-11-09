# Semantic delta GIT-SOURCE-LOCAL-AGENT-V1-1 — the source-acquisition entry admits the launch copy

> **Candidate — binds nothing.** Drafted by an agent lane (bead
> `syzygy-pdja.29`) so that the owner can decide it beside launch-consent
> v1.2. Only the owner signs (VIS-4). No act argument is quoted here; the
> builder's `--digests` prints the rows, and `PROPOSED-SUBJECTS.json`
> carries them.
>
> **Bound to PR #812 at head `de9c1ba8`.** Every quotation of, and
> reliance on, launch-consent v1.2 below is to that head: the post-apply
> spec (v1.1 spec at that commit plus `proposed/spec.md.patch` of
> `polaris-dossier-launch-consent-v1-2`), its semantic delta and its owner
> direction. If #812 moves (for example, an owner-ordered round 11), this
> package is redrafted against the new head before either is offered.

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
version strings and `writeSurface` included (see "What does not change").

**Change class:** Normative. A read and write authority is widened for one
named class of run, the copy-class run, and the launch reads it already
rests on are bounded in words.

**Author:** agent lane (Claude Code, Opus 5.5). **Date:** 2026-11-10.

## Warrant

- [Observed] The owner's selection of 2026-11-10, recorded on PR #812's
  branch in decisions/OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md,
  section "Redesign after review round 3": "Redesign: copy trunk tip
  locally (Recommended)". That section says it "authorizes drafting only".
- [Observed] PR #812's semantic delta, decision D9, says launch-consent
  v1.2 "cannot take effect under the entry as signed" and needs "an
  owner-signed successor version of the entry". This package is that
  successor, drafted.
- [Observed] The round-4 review of launch-consent v1.2
  (docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-4-RAW.md on PR #812's branch),
  Finding 3, titled "D9 and the owner page leave a contradicted registry
  field unnamed, and present v1.1's reference and URL reads as new
  conflicts".
- [Observed] The entry's own supersession clause: "a later edit is a new
  version signed separately".

## The terms this version uses, and where each is defined

The run classes are defined in the entry's own words (round-1 Finding 1),
so that no guarantee v1.0 gives hangs on a term only #812 defines. `fetch`
says: "A copy-class run is a run that a version in force of
REQ-polaris-generation-047 requires to run on a copy of the operator's
clone; every other run is a no-copy run, and while no version in force
requires a copy every run is a no-copy run." `readAuthority`, `tags` and
`stateDirectoryWrites` point back to that sentence with "(fetch)".

So the entry decides which runs are copy-class by one fact outside it,
whether a version in force of REQ-047 requires the copy, and decides
everything else by its own words. While v1.2 is unsigned no version in
force requires a copy, so every run is a no-copy run and every copy clause
is inert.

The other terms are #812's, quoted from REQ-polaris-generation-047 of the
post-apply spec at `de9c1ba8`:

- **Named identifier.** "The full object identifier a run's pin rule
  gives, before any object is read, is the run's named identifier". It
  becomes the pinned commit only once it is shown to be a commit.
- **#812's own definition of the classes.** "A run that this rule requires
  to run on a copy is a copy-class run, and every other run with a named
  identifier is a no-copy run". With v1.2 in force the entry's definition
  and #812's pick out the same runs: the entry's "every other run" adds only
  runs with no named identifier, which make no copy under either text.
- **The copy step.** "the copy step has started once Syzygy has created
  that directory".
- **Stages.** Identifier named, copy step started, commit pinned, question
  asked (where needed), brief or packet delivered. The entry states no
  stage: it bounds what Syzygy may read, fetch and write, and the stage
  rule governs only statements the run makes.

## The copy step this version admits

As REQ-047 at `de9c1ba8` states it, for a copy-class run:

1. In every launch-consented run, Syzygy reads five things of the operator's
   clone, in process, as file data, and honours none of them (the entry
   admits, of what they list, only what the launch-consent requirements in
   force name; see E3): the files
   that locate the Git directories; reference names and the values of the
   references the pin rule needs, from loose files and `packed-refs`; the
   configuration file, as text, for remote names and URLs; whether
   `objects/info/alternates` exists; and, for an abbreviated `--revision`
   only, object identifiers from loose object names and pack indexes.
2. Before the question, or before the brief where no question is asked,
   Syzygy creates an empty directory of its own and an empty repository in
   it (`git init --template=`).
3. It fetches the object the named identifier names, alone, by full
   identifier, at depth one, with no tags and no submodules, from the
   operator's clone over `file://`, and checks it out detached. Every Git
   process runs with system and global configuration disabled, no other
   Git variable of the operator's environment, only the file transport
   allowed, lazy fetching off and no hook path. "these processes execute
   nothing of the observed repository and are not an execution choice".
4. Syzygy tells whether the named identifier is a commit from where the
   copy's detached checkout leaves the copy's `HEAD`. "Syzygy tells these
   cases apart without reading the object itself". It then checks the
   copy's form, and reads objects from the copy alone under the signed
   rules.
5. Where the run ends before its brief, Syzygy removes the copy. "Otherwise
   the copy is the run's clone for the rest of the run and is kept after
   it, outside the run's state directory, until the operator removes it".

A no-copy run makes no copy. Where only a launch observation consent of the
operator's-own-clone scope covers it, REQ-047 binds the operator's clone to
the one-commit form, checked before asking.

## Decisions

### E1. Which fields move, field by field

[Inferred, each row read against the copy step above and against PR #812's
D9 table at `de9c1ba8`.]

| Field | v1.0 says | Under the copy | This version |
|---|---|---|---|
| `fetch` | "none: Syzygy fetches nothing" | Contradicted: Syzygy runs one local fetch | Keeps v1.0's sentence for the no-copy run; defines the run classes in the entry's own words; adds the copy step, exactly |
| `readAuthority` | objects read from "the operator's clone's .git directory", "no process is started" | Contradicted: object reads are made in the copy; Git processes start | Keeps every v1.0 word but two clauses; names the copy as the object store and the copy's Git processes as the one exception; bounds the launch reads, the commit test and the form-check reads, as data |
| `tags` | "never read; ... any other type refuses" | Arguably contradicted (D9): a named identifier naming an annotated tag brings the tag object into a clone Syzygy made | Keeps v1.0's words; adds that Syzygy reads none of such an object, tells it is not a commit from the copy's `HEAD`, never follows it, uses it for nothing beyond the copy step and the refusal, and refuses |
| `stateDirectoryWrites` | the run's state directory; "nothing is written to the clone" | Contradicted: the copy is written outside the state directory, and kept after the run | Keeps v1.0's state-directory clause; adds the copy's directory, bounded; names Syzygy's own two writes to it (creating it, removing it) apart from Git's writes of its contents (round-1 Finding 6); says why `writeSurface` stays empty; closes the operator's clone by name |
| `writeSurface` | `[]` | Arguably contradicted (D9), which asks the successor to "say which" | Unchanged; `stateDirectoryWrites` now says which: the copy's directory is Syzygy's own local write, not a write to an observed or external system |
| `implementationCoverage` | the reader's and the gate's declarations | Would claim the reader implements the copy | Adds `copyStep`: no file implements it yet |
| `authorityType`, `questions`, `databaseAccess`, `networkAccess`, `executeObservedCode`, `workingTreeRead`, `submodules` | as v1.0 | Not contradicted (D9) | Unchanged |

**On `tags`, my judgement.** At `de9c1ba8` Syzygy no longer reads the
object to learn its type: it tells a non-commit from where the copy's
detached checkout leaves `HEAD`. So v1.0's "never read" stays true of
Syzygy. What is new is that Git, in a process Syzygy starts, writes such an
object into a clone Syzygy made, and the run then refuses on it. `tags`
says nothing of that, so the field moves by one appended clause rather than
resting on a reading. Leaving it byte-identical is offered to the reviewer
as Question 1.

### E2. The no-copy run keeps v1.0's words

- `fetch` opens with v1.0's sentence unchanged but for "none" becoming
  "none, save in a copy-class run", and then defines the run classes (see
  "The terms this version uses").
- `readAuthority` keeps "and no process is started" and adds "save, in a
  copy-class run, the Git processes fetch names", which is inert in a
  no-copy run.
- `stateDirectoryWrites` keeps v1.0's first clause byte for byte; its
  closing clause now says "the operator's clone", which in a no-copy run is
  the clone v1.0 meant.

The redis consent's run is a no-copy run under the entry's own definition,
whether or not v1.2 is signed: no version in force requires it to run on a
copy. It is also not launch-consented, so, as in #812, no closed list of
launch reads binds it (round-2 Finding 1): the entry says "A run that is
not launch-consented has no closed list of reads here beyond the object
reads, as under version 1.0". Its reads beyond the object reads are named
in words, not closed:

- its clone-form reads: "In every no-copy run (fetch), launch-consented or
  not, it reads the files of the operator's clone's .git directory that the
  form check binding that run reads". [Observed, from
  `packages/polaris-dossier/src/clone-shape.ts:146-250`, round-3 Finding 5]
  those are: whether `objects/info/alternates` and
  `objects/info/http-alternates` exist; the listing of the `.git`
  directory; `config`; `HEAD`; `FETCH_HEAD`; the walk of `refs/` (by name,
  refusing any ref file); the listings of `hooks`, `info`, `logs`,
  `branches`, `objects`, `objects/info`, `objects/pack` and each loose
  fan-out directory; `logs/HEAD`; `shallow`; and the object store's
  inventory (the pack indexes and loose object names);
- its HEAD check (REQ-polaris-generation-033): "REQ-polaris-generation-033's
  check of its HEAD reads HEAD and the reference HEAD names, from the loose
  reference files and packed-refs". [Observed, from
  `packages/polaris-dossier/src/clone-head.ts:8`] that check "reads
  `.git/HEAD`, at most one loose ref under `refs/heads/`, and
  `packed-refs`", and `init.ts` makes it in every run before the form check.

v1.0 admitted both by reading, not in words (E3). With no list closed for
that run, this version changes nothing it may do. The fetch-form reading of
the launch-consent change's design §5 still governs it.

### E3. The launch reads, said in words

PR #812's D9 asks that the successor say "in words that the launch reads
are not the adapter's object reads". v1.1 as signed already reads the
operator's clone's references and remote URL before the answer, and the
clone-form check already reads the redis clone's `.git` files; D9 says both
rest on the reading that v1.0's "no ref, ... repository-local
configuration, ... shallow file ... is read" bounds the reader's object
reads. This version says so: "Those words bound the object reads. The reads
of the pinning, identity and clone-form rules are launch reads, made as
data and never honoured, and not object reads."

It closes the list where #812 closes it, and only there. #812's REQ-047 at
`de9c1ba8`: "For every launch-consented run, the reads Syzygy itself makes,
in process, of the operator's clone SHALL be only these". The entry: "In a
launch-consented run (REQ-polaris-generation-046 and 047), besides the
object reads, Syzygy reads only the following". Round 2's Finding 1 chose
between this scoping and admitting the HEAD-check reads for every run under
a list closed for every run; the scoping was taken, because it makes the
entry claim no more than the spec does. The HEAD-check reads of a run that
is not launch-consented are still named, as an admission (E2). The list:

- in the operator's clone, five launch reads, "and of what they list only
  what the launch-consent requirements in force name";
- in a copy-class run, no object of the operator's clone; the commit test
  from the copy's `HEAD`, never by reading the object or from reference
  data; and the copy's form-check files;
- in every no-copy run, the operator's clone's form-check files, for the
  form another act's consent states or REQ-047's one-commit form, "the whole
  configuration file and the pack indexes included", to which the five-read
  list's configuration limit yields, as REQ-047 says.

**Which of the listed reads v1.1 already names** (round-2 Finding 2
corrected round 1's "v1.1's rules ask for none of them"). #812's D9 lists
"The reads v1.2 adds in the same class (the trunk-rule references, the
local branch of the remote default's name, `packed-refs`, the existence of
the alternates file, and loose object names and pack indexes for an
abbreviation)". Re-derived by script, read by read, against the installed
v1.1 spec (`openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`):

| D9 read | Named by v1.1? | v1.1's words, or why not |
|---|---|---|
| The trunk-rule references | [Observed] Yes | REQ-047: "the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch"; REQ-046 reads "the clone's references" before the answer |
| The local branch of the remote default's name | [Observed] No | 0 occurrences of "local branch" in the v1.1 spec; 5 in #812's |
| `packed-refs` | [Observed] Not by name (0 occurrences); [Inferred] yes as the store of references v1.1 names | v1.1 names the references and the HEAD check (REQ-033) reads them; where they are packed, reading them is reading `packed-refs`. [Observed] `clone-head.ts` reads `packed-refs` in every run today |
| Whether `objects/info/alternates` exists | [Observed] No | 0 occurrences of "alternates" in the v1.1 spec; 4 in #812's |
| Loose object names and pack indexes for an abbreviation | [Observed] Yes, the abbreviation; [Inferred] the reads are the means | REQ-047: "a full or unambiguous abbreviated object identifier ..., resolved once to a full object identifier"; resolving it needs the store's object identifiers. [Observed] `launch-revision.ts` lists "Every object identifier the clone's store names, for an abbreviation" |

So D9's phrase "The reads v1.2 adds" is exact only for the local branch of
the remote default's name and the existence of the alternates file. The
bound "of what they list only what the launch-consent requirements in force
name" admits, for a v1.1 run, the trunk-rule references, the references'
storage including `packed-refs`, and the abbreviation's resolution, which
v1.1 needs for its own trunk-tip pin [Inferred: without them, signing this
version alone would put v1.1's pin outside the entry]. It keeps out the
other two until v1.2 is in force. With v1.2 in force it admits v1.2's
reads, and no others.

**Signing closes reads v1.1's runs make today, and the code narrows to
match** (round-3 Finding 1, the owner's option 1). The list is #812's, and
#812's is narrower than the code that runs today. [Observed] In every
launch-consented run, `launch-clone.ts:100-125` reads the value of every
loose reference (tags, every remote-tracking branch, the stash), and
`launch-revision.ts:33` and `:59-61` list the store's object identifiers
for any hexadecimal `--revision`, a full identifier included. Read (2)
admits the values of named references only, and read (5) the listing for
an abbreviated `--revision` alone, and the bound "only what the
launch-consent requirements in force name" can only narrow them. So once
this version is signed, with or without v1.2, those reads lie outside the
entry, and the code must narrow in the same commit (IMPACT-LEDGER, item
1b). [Observed] #812's own ledger already requires that narrowing for v1.2
("`init`'s pre-copy reads of the operator's clone become file-data reads
of the listed references, remote URLs and the alternates file");
[Inferred] it lands with the v1.2 implementation when the two are signed
together. The other option, wording reads (2) and (5) broadly enough to
admit what the code does today but never wider than #812 once v1.2 is in
force, is put to the owner ("Before you sign", item 1). Round 3 asked that
every read the launch path makes today be mapped to a clause or to that
narrowing; the table is in `ROUND-3-DISPOSITIONS.md`.

### E4. "Copy-class run": the entry's definition, REQ-047 unversioned

The entry defines the classes itself (see "The terms this version uses")
and names no version of REQ-047: "a version in force of
REQ-polaris-generation-047". Under REQ-047 as signed today (v1.1) no
version in force requires a copy, so no run is copy-class and every copy
clause is inert; under #812 at `de9c1ba8` the class is decided at launch
from the consents and the named identifier. The copy's form is fixed by the
entry's own words, so a later REQ-047 version that changed which runs are
copy-class could not change what a copy may be.

### E5. Versions are not bumped

`registryVersion` and `observerVersion` stay `2.0.0-candidate.1`. The
nearest precedent, the machine-ceiling amendment of the Butlers entry
(`pwb-registry-machine-ceiling-amendment`), changed a declared value and
kept its version strings; the entry's identity scheme
(`observer-id-plus-version-plus-content-digest-plus-provenance-state`)
already separates the two versions by content digest, and the sign-off is
tagged `public-git-source-acquisition-local-agent-v1.1`. A bump is the
reviewer's Question 2.

### E6. Residuals stated, not closed

- [Inferred] That Git starts no program the operator's clone's own
  configuration or hooks name while it serves the copy. `fetch` says this
  is Inferred, not checked, as REQ-047 does.
- [Observed] The `git-object-database` input class keeps its identity
  scheme `repository-id-plus-operator-declared-clone-git-dir`. In a
  copy-class run the object database is the copy's, which Syzygy creates;
  the operator does not declare it. Under REQ-047 "the copy is the clone
  that REQ-polaris-generation-033 to 036 name", so one reading stretches
  "operator-declared clone" to cover it; read literally the scheme name is
  false for a copy-class run. Moving the scheme would change an identity
  the v1.0 builder pins, so it is left and named here. Round-1 Finding 9
  leaves the choice to the owner (OWNER-SIGNOFF, "Before you sign").
- [Observed] `provenanceDisclosure` says the operator's clone "and every
  record the gates read lie within the operator's agent sessions' write
  reach". The copy lies within it too, and agents work in it. The sentence
  stays true and is not edited.
- [Observed, round-1 Finding 4] Two unchanged fields read against the
  pre-consent reads and the copy. `subject.observedRepositories` says "a
  repository or revision no effective consent covers is not read";
  `authorizationModeDerivation` says every read needs "the pair's effective
  observation consent naming the pinned revision", and "every other
  combination refuses before any object is read". The launch reads are made
  before any consent covers the revision, and REQ-046 at `de9c1ba8` reads
  the commit and tree objects of the run's clone before the answer, which in
  a copy-class run is the copy. [Inferred] This tension already stood under
  v1.0 with launch-consent v1.1 signed, and #812's D9 lists neither field.
  What is new is that this version states the pre-consent reads in words,
  and that a copy-class run adds a pre-consent object store, the copy. The
  fields are left unmoved and named here; moving them is a scope question
  for the owner (OWNER-SIGNOFF, "Before you sign").

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

This version is useful only if launch-consent v1.2 (PR #812), with the copy
step of `de9c1ba8`, is signed. Each signed without the other:

- **This version signed, v1.2 not.** The entry's own definition then makes
  every run a no-copy run (E4), so every copy clause is inert and every
  guarantee v1.0 gives holds in v1.0's words: `fetch` says "none" of every
  run, `readAuthority` says "no process is started" of every run, and
  `stateDirectoryWrites` adds no directory. What is live and new:
  - for a launch-consented run, the closed launch-read list (E3). It admits
    what v1.1's rules name, and keeps out the local branch of the remote
    default's name and the alternates-file check, which only v1.2 names.
    It also closes two reads v1.1's runs make today: the value of every
    loose reference, and the store listing for a full `--revision`. Signing
    closes them, and the launch code must narrow to match in the same
    commit (IMPACT-LEDGER, item 1b), under its own implementation
    authorization;
  - for a run that is not launch-consented, no closed list, as under v1.0,
    and the HEAD-check and form-check reads named in words (E2).
  The entry's bytes change, so the gate's hard-wired v1.0 form in
  `package-reader.ts` and the tests that pin it must change in the same
  commit too (IMPACT-LEDGER, items 1 and 1a).
- **v1.2 signed, this version not.** v1.2 cannot take effect: D9 says no
  reading of "fetches nothing", "no process is started" or "nothing is
  written to the clone" admits the copy. A copy-class run must refuse, or
  the implementation would act beyond the signed entry.
- **v1.2 changes again before signing.** These Proposed blocks restate the
  copy step as `de9c1ba8` drafts it. Any change to the copy's form, its
  environment, the launch reads, the commit test or the copy's keeping
  needs this package redrafted and reviewed again before both are offered.

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
none, save in a copy-class run: Syzygy fetches nothing. The operator prepares the clone with their own tools; to stay within the observation consent's stated fetch form the operator fetches the one consented commit alone (git fetch --depth=1 <upstream> <commit>) and checks it out. A copy-class run is a run that a version in force of REQ-polaris-generation-047 requires to run on a copy of the operator's clone; every other run is a no-copy run, and while no version in force requires a copy every run is a no-copy run. In a copy-class run, one local fetch and nothing else, made before the question, or before the brief where no question is asked: Syzygy creates an empty directory of its own for the copy, outside the operator's clone and never at a location derived from its path, and in it an empty repository with an empty template (git init --template=); it fetches into that repository, from the operator's clone over Git's local file transport (a file:// URL) and from nowhere else, the object the run's named identifier names alone, by its full object identifier, at a depth of one, with no tags and no submodules, and checks that object out detached. Every Git process it starts for the copy runs with the system and global Git configuration disabled, with no other Git variable of the operator's environment, with every transport but the file transport refused, with lazy fetching of missing objects disabled and with no hook path, and no other process is started; these processes execute nothing of the observed repository. A clone whose references are stored in the reftable backend is refused before any Git process starts, and a clone with an alternates file before the copy step starts. The copy holds the pinned commit and the trees and blobs reachable from its root tree alone, in the form one commit fetched alone into an empty repository and checked out detached leaves, and Syzygy checks that form before the question. Every failure of a Git process for the copy refuses, naming that process and its failure as Git reported it; a named identifier not shown to be a commit refuses (tags); a copy that departs from that form refuses; and nothing is then fetched from anywhere else. To serve the copy Git reads the operator's clone's configuration, references and object store, the stored bytes of delta bases outside the named object's objects included; Syzygy uses nothing Git read but the copy. That Git starts no program the operator's clone's own configuration or hooks name while it serves the copy, for every Git process the copy step started, is Inferred, not checked. The file URL of the operator's clone is not a locator and is never recorded or rendered as one
```

### Change 2 (replace), `entries[0].typedAuthority.readAuthority`

**Current:**

```text
Git object reads by object identifier at the run's pinned revision only: the pinned commit, its root tree and the trees and blobs reachable from it, walked down from the commit and never to a parent. Objects are read in process from the loose objects and version-2 packs of the operator's clone's .git directory; no ref, staging index (`.git/index`; the pack indexes under `objects/pack/` are read), working tree, repository-local configuration, hook, alternates file, grafts file, shallow file, replace ref or commit-graph is read, and no process is started. The hash algorithm is the one the consented identifier is written in (40 hex digits SHA-1, 64 SHA-256). Every commit, tree and blob on the path to each blob used is re-hashed from the bytes read, at every step that uses it; a mismatch, a missing object (one only an alternate or a replacement could supply included), an undecodable object or a wrong type refuses that step
```

**Proposed:**

```text
Git object reads by object identifier at the run's pinned revision only: the pinned commit, its root tree and the trees and blobs reachable from it, walked down from the commit and never to a parent. Objects are read in process from the loose objects and version-2 packs of the .git directory of the operator's clone, or, in a copy-class run (fetch), of the copy; no ref, staging index (`.git/index`; the pack indexes under `objects/pack/` are read), working tree, repository-local configuration, hook, alternates file, grafts file, shallow file, replace ref or commit-graph is read, and no process is started, save, in a copy-class run, the Git processes fetch names. The hash algorithm is the one the consented identifier is written in (40 hex digits SHA-1, 64 SHA-256). Every commit, tree and blob on the path to each blob used is re-hashed from the bytes read, at every step that uses it; a mismatch, a missing object (one only an alternate or a replacement could supply included), an undecodable object or a wrong type refuses that step. Those words bound the object reads. The reads of the pinning, identity and clone-form rules are launch reads, made as data and never honoured, and not object reads. In a launch-consented run (REQ-polaris-generation-046 and 047), besides the object reads, Syzygy reads of the operator's clone and the copy only the following: in the operator's clone these five things alone, and of what they list only what the launch-consent requirements in force name: (1) the .git file or directory and the files that locate the Git directory and the common Git directory; (2) the names of its references, and the values of HEAD and the reference it names, of the references REQ-polaris-generation-047's trunk rule names, of the local branch of the remote default's name and of the reference --revision names, each from the loose reference files and packed-refs, where reading packed-refs also reads other references' values, which are used for nothing; (3) its configuration file, as text, for its remotes' names and URLs alone; (4) whether objects/info/alternates exists; (5) for an abbreviated --revision alone, the object identifiers its loose object file names and pack indexes give. In a copy-class run (fetch) it reads no object of the operator's clone, tells whether the named identifier is a commit only from where the copy's detached checkout leaves the copy's HEAD, never by reading that object or from reference data, and reads the files of the copy's .git directory that the form check of fetch reads. In every no-copy run (fetch), launch-consented or not, it reads the files of the operator's clone's .git directory that the form check binding that run reads, the form another act's consent states or the one-commit form REQ-polaris-generation-047 states, the whole configuration file and the pack indexes included, to which (3) yields. A run that is not launch-consented has no closed list of reads here beyond the object reads, as under version 1.0; besides its form-check reads above, REQ-polaris-generation-033's check of its HEAD reads HEAD and the reference HEAD names, from the loose reference files and packed-refs
```

### Change 3 (replace), `entries[0].typedAuthority.tags`

**Current:**

```text
never read; the pinned identifier must name a commit object, and any other type refuses
```

**Proposed:**

```text
never read; the pinned identifier must name a commit object, and any other type refuses; in a copy-class run (fetch), a named identifier that names an annotated tag or another object that is not a commit may bring that object into the copy through the Git processes fetch names: Syzygy reads none of it, tells that it is not a commit only from where the copy's detached checkout leaves the copy's HEAD, never follows it to any object it names, uses it for nothing beyond the copy step and that refusal, and refuses
```

### Change 4 (replace), `entries[0].typedAuthority.stateDirectoryWrites`

**Current:**

```text
Syzygy's own state directory for the run, outside the clone and never at a location derived from the clone's path; nothing is written to the clone, the observed repository, its forks or its tracker
```

**Proposed:**

```text
Syzygy's own state directory for the run, outside the clone and never at a location derived from the clone's path; in a copy-class run (fetch), also the copy's directory, outside the run's state directory and outside the operator's clone and never at a location derived from the operator's clone's path: Syzygy itself creates it, which starts the copy step, removes it with its contents where the run ends before its brief, and otherwise keeps it after the run, until the operator removes it, at a location the launch output names, and writes its contents only through the Git processes fetch names. That directory is Syzygy's own local write, as the state directory is, and not a write to an observed or external system, so writeSurface stays empty; nothing is written to the operator's clone, the observed repository, its forks or its tracker
```

### Change 5 (insert), `entries[0].implementationCoverage.copyStep`

**Current:** absent. The key is inserted after `implementationCoverage.status`.

**Proposed:**

```text
[Observed] at this version's drafting no file implements the copy step, its Git environment or the copy's directory, which typedAuthority.fetch, readAuthority, tags and stateDirectoryWrites declare for a copy-class run; the reader implements those declarations only as they concern the clone it reads objects from. The copy step is the launch step's (REQ-polaris-generation-047), which no implementation authorization covers yet. [Inferred] Until it is implemented and authorized, no run makes a copy
```

# Owner sign-off — public Git source acquisition, local-agent version 1.1

> **Candidate — binds nothing.** Drafted 2026-11-10 after your selection
> "Redesign: copy trunk tip locally (Recommended)" for launch-consent v1.2
> (decisions/OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md on PR
> #812's branch). That selection authorized drafting only. This page
> performs no act and carries no digest. Effect comes only from your
> version-tagged sign-off, recorded by `scripts/record_versioned_signoff.py`
> under `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, after an
> independent review (`REVIEW-BRIEF.md`) returns `CONFIRM` or a notes-only
> `CONFIRM WITH EXCEPTIONS`. It is not offered to you until that review has
> returned, and it should be offered together with launch-consent v1.2.
>
> **Bound to PR #812 at head `155f9c49`.** This package restates #812's
> copy step as that head drafts it, after your rulings of 2026-11-10 (SHA-256
> clones copied in their own object format; launch consents recorded under
> v1.1 now copy too). It was redrafted from `de9c1ba8`, then rebound to
> #812's round-11 and round-12 repairs (`ROUND-5-REDRAFT.md`,
> `ROUND-5-DISPOSITIONS.md`), and last to `155f9c49`, the bytes #812's
> round 17 confirmed with exceptions. If #812 changes again, this package is redrafted
> and reviewed again before it is offered.
>
> **Review.** Round 4 (`docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-4-RAW.md`)
> returned REVISE; its repair is in `ROUND-4-DISPOSITIONS.md`. You chose
> "Final review rounds (Recommended)" on 2026-11-10, which orders round 5
> of this package after this redraft, beside #812's round 11. Until round
> 5 returns, these bytes are unreviewed.

## The question you answer

> Extend Scope A to version 1.1 of the source-acquisition registry entry
> for the local-agent mode (`public-git-source-acquisition-local-agent`)
> and sign it? It lets a copy-class run copy the object its named
> identifier names from your clone into a one-commit clone of Syzygy's own
> with one local Git fetch, and read objects from that copy only. It bounds
> the reads Syzygy makes of your clone at launch to a closed list. A
> no-copy run keeps every v1.0 rule.

- **Option to select:** "Extend Scope A and sign source-acquisition entry
  v1.1". The recorder refuses a selection that does not carry the words
  "Extend Scope A", because Scope A names only the PWB observer entry and
  every other registry entry is signed under your extension to it, as v1.0
  was.
- **Other answer:** "Not yet", with what to change; nothing is recorded.

## What changes, in plain words

The entry sorts runs into two classes, in its own words. A **copy-class
run** is one that a version in force of the launch-consent rule
(REQ-polaris-generation-047) requires to work in a copy Syzygy makes. Every
other run is a **no-copy run** and works in your own clone: the redis run,
for example. Until you sign launch-consent v1.2, no version in force asks
for a copy, so every run is a no-copy run.

- **Today (v1.0)** the entry says Syzygy fetches nothing, starts no
  process, and reads objects only from your clone. #812's copy breaks all
  three.
- **Version 1.1** keeps those words for a no-copy run and adds, for a
  copy-class run:
  - the copy itself: a new empty directory, never inside any working tree
    (linked worktrees included), Git directory or common Git directory of
    your clone's repository or the governance home's, a run that would put
    it there being refused; `git init --template=` in your clone's object
    format (SHA-1 or SHA-256; no clone is refused for it, except that a
    format Git does not support fails `git init`, which refuses the run),
    then
    one fetch over `file://` of the object the run's named identifier
    names, alone, at depth one, with no tags and no submodules, your global
    and system Git configuration off, only the file transport allowed, lazy
    fetching off and no hooks;
  - from then on every object read is made in the copy; Syzygy reads no
    object of your clone;
  - Syzygy tells whether the named object is a commit from where the
    copy's checkout leaves `HEAD`, never by reading that object. An
    annotated tag may land in the copy; Syzygy reads none of it, follows
    it nowhere, and refuses;
  - the copy's directory is the one new place Syzygy writes. Syzygy itself
    creates it and, if the run ends before its brief, removes it, or, if
    that removal fails, keeps it and the launch output names it and the
    failure; Git writes what is inside it. Otherwise it is kept after the run until you
    remove it; the launch output says where it is.
- **For every launch-consented run**, the entry now names the five things
  Syzygy reads in your clone as plain data, obeying none of them: where the
  Git directory is and, in its common Git directory, the files that
  locate your linked worktrees; your references' names and the few values the trunk
  rule needs; your remotes' names and URLs from the configuration file
  and its object format (which v1.2 alone asks for; a copy is made in
  that format) and, to find your working trees, `core.bare` and
  `core.worktree` (v1.2 alone asks for these and the worktree files, to
  keep the copy out of them);
  whether an alternates file exists; and, for a shortened `--revision`
  only, object names. For such a run that list is closed, as v1.2 closes
  it, and Syzygy may read of it only what the launch-consent rules in force
  ask for. The rules you have already signed (v1.1) ask for most of it:
  the trunk-rule references, your references however Git stores them
  (`packed-refs` included), and the object names a shortened `--revision`
  needs. Only two items are asked for by v1.2 alone: the local branch named
  like the remote's default, and whether an alternates file exists.
  **Today's code (at this package's branch head) reads more than this
  list.** It reads the value of every
  reference in your clone (tags, every remote branch, the stash), and it
  lists every object name in your clone even for a full-length
  `--revision`. Signing closes those two reads, so the launch code must be
  narrowed to the list; that is implementation, under its own direction,
  after the sign-off ("Before you sign", item 1, "When the narrowing
  lands"). A third read, of a named object's whole body before its type
  is known, was outside v1.0 already; its repair (#816) has landed and
  this branch carries it, so the check now reads the object's type header
  (item 2). **As you ruled, until the narrowing lands, a launch may read
  outside the signed entry; and while v1.2 is in force and its copy step
  is unimplemented, copy-class runs are made without a copy and read your
  clone outside the entry ("Before you sign", item 1).**
- **Launch consents recorded under v1.1.** Under v1.2 as you ruled
  ("Copy anyway"), their runs are copy-class runs. The entry needs no
  words of its own for that: it calls a run copy-class whenever a
  launch-consent version in force requires the copy.
- **For a run started without launch consent** (the redis run, for
  example), the entry closes no list, just as v1.0 did not. It names in
  words what such a run already reads: the files its clone-form check
  needs, and the check that its `HEAD` is the consented commit (`HEAD`
  and the reference it names, `packed-refs` included).
- Nothing is written to your clone, ever.

## What it costs, and what stays uncertain

- [Inferred] Git, when it serves the copy, reads your clone's
  configuration, references and packs, including stored bytes of objects
  outside the named object's. Syzygy uses nothing Git read but the copy.
  The entry says so.
- [Inferred] Syzygy relies on Git not starting any program your clone's
  configuration or hooks name while it serves the copy. A scratch test with
  Git 2.53.0 found none ran (PR #812, D2); this is not checked per run.
- [Observed] No code implements the copy step yet, and no authorization
  covers it.

## Before you sign

1. **Sign this together with launch-consent v1.2, or not at all.**
   - Signed alone, every run stays a no-copy run, so v1.0's promises hold
     in v1.0's words for every run: nothing fetched, no process started,
     nothing written outside the state directory. What changes is that the
     entry now says in words what Syzygy reads of your clone at launch. For
     a run launched with consent that is a closed list, and **signing it
     closes two reads the code at this branch's head makes**: the value of
     every reference,
     and the object-name listing for a full-length `--revision`. The two
     v1.2-only items also stay out. For any other run it closes nothing, as
     v1.0 did not.
   - Two code changes follow the sign-off:
     - the gate code wired to v1.0 (`IMPACT-LEDGER.md`, items 1 and 1a: the
       reader in `packages/polaris-generation-consent/src/package-reader.ts`,
       its record template, and the tests and scripts that pin v1.0);
     - the launch reads narrowed to the list (`IMPACT-LEDGER.md`, item 1b:
       `packages/polaris-dossier/src/launch-clone.ts` reads only the named
       references' values, and `launch-revision.ts` lists object names for a
       shortened `--revision` only).
   - **When the narrowing lands** (the one statement `IMPACT-LEDGER.md`
     item 1b also makes). The narrowing is implementation, under the
     separate implementation direction #812 names; it is not in the
     sign-off commit. Until it lands, the code reads outside both entries.
     Launch-consent v1.2's own ledger already requires the same narrowing.
   - **Gate timing: ruled, not open.** On 2026-11-10 you chose "Land with
     sign-off" [Observed, as the coordinating session relayed it]. The gate
     code that accepts a v1.1 sign-off (item 1) lands with the sign-off.
     **So, until the launch-code narrowing (item 1b) lands, a launch may
     read outside the signed entry**: a run launched with consent can be made from the sign-off commit, and the
     launch code at this package's branch head (which carries #816) reads
     every reference's value and the object-name listing for a full-length
     `--revision` [Inferred, from that code]. #816 has landed, so item 1c
     no longer adds a read here (item 2).
   - **Copy-class runs without a copy: allowed and disclosed, as you
     ruled.** On 2026-11-10 you selected "Allow and disclose" [Observed, as
     the coordinating session relayed it]. "Copy-class" is what the
     launch-consent version in force requires; "makes a copy" is what the
     code does, and no code makes one yet. So while v1.2 is in force and
     its copy step is unimplemented, **every run v1.2 makes copy-class**
     (your "Copy anyway" runs on consents recorded under v1.1, and every
     run only a launch consent covers) **is made by today's code without a
     copy**. Such a run reads your clone's commit and trees before you
     answer, then its form and its blobs, **all outside the entry**, which
     says a copy-class run reads no object of your clone [Inferred, from
     the code]. **This ends with v1.2's implementation of the copy step, not
     with items 1b and 1c.**
   - **Your choice on that closed list.** This draft takes option 1.
     - *Option 1 (drafted): keep #812's list as it is, and narrow the
       code.* The entry then admits no more than launch-consent v1.2 does,
       and today's broader reads end with the signing commit.
     - *Option 2: word reads (2) and (5) broadly enough to admit what the
       code reads today,* so no code has to narrow for this sign-off. They
       could never be wider than v1.2's list once v1.2 is in force, so the
       code would have to narrow then anyway; until then the entry would
       admit reading every reference's value and the full object-name
       listing. Choosing it means a redraft and another review round.
   - Launch-consent v1.2 signed without this cannot take effect: its copy
     would exceed the entry.
   - If v1.2 moves from `155f9c49` before you sign, this package is
     redrafted and reviewed again.
2. **The `tags` field moves, and the version strings do not.** The
   round-1 reviewer agreed with both (Finding 8). On `tags`: Git can now
   put a tag into a copy Syzygy made, so the field says what happens to it
   rather than leaving that to a reading. **Until #816 the code did not
   keep `tags` "never read", under v1.0 or v1.1.** [Observed, at `bb89b8cc`]
   Before it knew that the object a `--revision` or trunk reference names
   was a commit, the launch read that object's whole body; when it was an
   annotated tag (or a blob), that read was outside `tags` and outside the
   installed REQ-046. v1.1 did not create that gap and does not close it;
   the code repair is filed for its own repair as `syzygy-pdja.30`
   (`IMPACT-LEDGER.md`, item 1c). That repair, PR #816, has merged to
   `main`, and this package's branch carries it. [Observed, from the code]
   The check now reads a loose object's first stored bytes, 64 at a time
   up to 1024, inflating them until the type header ends (some body bytes
   are inflated and discarded), or a pack entry's header and, for a delta,
   the headers of its bases down the chain. The round-5 reviewer's reading
   [Inferred]: a type test is presupposed by `tags` itself ("any other type
   refuses"), a header read is the least it can read, so it sits within
   `tags`, but only by that reading. This package takes that reading. Launch-consent v1.2 says Syzygy tells
   these cases apart "without reading the object itself"; the round-4
   reviewer notes that is hard to meet in a no-copy run, where REQ-047 has
   Syzygy read the named object as a commit object. That sentence is
   #812's to settle, not this package's.

   On the versions: the entry is told apart from v1.0 by its
   content digest already, and implementing the copy step will need yet
   another version of the entry anyway (E5).
3. **One name in the entry is now literally wrong for copy-class runs, and
   you choose whether to fix it.** The object store's identity scheme is
   called `repository-id-plus-operator-declared-clone-git-dir`. In a
   copy-class run the object store is the copy, which Syzygy made; you did
   not declare it. One reading says the copy counts as "the clone" because
   the launch rule says so. Fixing the name changes an identity the v1.0
   checks pin, and makes this package bigger; leaving it keeps a name that
   reads false for those runs. The reviewer left the choice to you
   (Finding 9; `SEMANTIC-DELTA.md`, E6). This draft leaves it.
4. **Two fields that this version does not touch say "nothing is read
   before consent".** `subject.observedRepositories` says a revision no
   consent covers "is not read", and `authorizationModeDerivation` says
   every read needs the consent "naming the pinned revision". But the
   launch reads happen before you answer, and in a copy-class run the copy
   is read before you answer too. This conflict already existed with
   launch-consent v1.1 and #812 does not raise it; what is new is that the
   entry now lists those early reads, and the copy is a new place they
   happen. Moving the two fields would widen this package's scope, so it
   is your call (Finding 4; `SEMANTIC-DELTA.md`, E6). This draft leaves
   them and names the conflict.
5. **`writeSurface` stays empty**, and `stateDirectoryWrites` now says why:
   the copy's directory is Syzygy's own local write, not a write to an
   observed or external system.

## What signing does

- The recorder checks the review, replaces the installed entry with the
  v1.1 bytes, writes decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.1.md
  and one block in `ACCEPTANCE-ACT-RECORD.md`, and prints the tag
  `public-git-source-acquisition-local-agent-v1.1` to create.
- It does not edit the v1.0 record. The v1.1 record says it supersedes
  version 1.0, and names its own scope and what it widens: local execution
  and a local write, and reading that copy in place of your clone, in a
  copy-class run alone, and no network egress. It also says that, for every
  launch-consented run, it closes in words the reads Syzygy makes of your
  clone.
- It is one of the separate acts a read needs. It gives no observation
  consent, adopts no screening policy, and authorizes no implementation.

## What it does not cover

- Launch-consent v1.2 itself, which is its own sign-off.
- The implementation of the copy step and the launch-read narrowing,
  which need their own authorization. The gate change lands in the
  sign-off commit, as you ruled ("Land with sign-off").
- The battery lines for v1.1, which the signing commit must add: the
  recorder's `--check` at `--version 1.1` and the v1.1 builder's `--check`
  (`IMPACT-LEDGER.md`, item 2).

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
> **Bound to PR #812 at head `e5a37fa1`.** This package restates #812's
> copy step as that head drafts it, after your rulings of 2026-11-10 (SHA-256
> clones copied in their own object format; launch consents recorded under
> v1.1 now copy too). It was redrafted from `de9c1ba8`
> (`ROUND-5-REDRAFT.md`). If #812 changes again, this package is redrafted
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
  - the copy itself: a new empty directory, `git init --template=` in
    your clone's object format (SHA-1 or SHA-256; no clone is refused for
    it), then
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
    creates it and, if the run ends before its brief, removes it; Git
    writes what is inside it. Otherwise it is kept after the run until you
    remove it; the launch output says where it is.
- **For every launch-consented run**, the entry now names the five things
  Syzygy reads in your clone as plain data, obeying none of them: where the
  Git directory is; your references' names and the few values the trunk
  rule needs; your remotes' names and URLs from the configuration file
  (and, in a copy-class run, its object format, so the copy can match it);
  whether an alternates file exists; and, for a shortened `--revision`
  only, object names. For such a run that list is closed, as v1.2 closes
  it, and Syzygy may read of it only what the launch-consent rules in force
  ask for. The rules you have already signed (v1.1) ask for most of it:
  the trunk-rule references, your references however Git stores them
  (`packed-refs` included), and the object names a shortened `--revision`
  needs. Only two items are asked for by v1.2 alone: the local branch named
  like the remote's default, and whether an alternates file exists.
  **Today's code reads more than this list.** It reads the value of every
  reference in your clone (tags, every remote branch, the stash), and it
  lists every object name in your clone even for a full-length
  `--revision`. Signing closes those two reads, so the launch code must be
  narrowed to the list; that is implementation, under its own direction,
  after the sign-off ("Before you sign", item 1, "When the narrowing
  lands"). A third read, of a named object's whole body before its type
  is known, is outside v1.0 already and stays outside until its repair
  lands (item 2, `syzygy-pdja.30`). **As you ruled, until those land, a
  launch may read outside the signed entry.**
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
     closes two reads today's code makes**: the value of every reference,
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
     **So, until the launch-code narrowing (item 1b) and `syzygy-pdja.30`
     (item 1c) land, a launch may read outside the signed entry**: a no-copy
     run launched with consent can be made from the sign-off commit, and
     today's launch code reads every reference's value, the object-name
     listing for a full-length `--revision`, and the whole body of a named
     object that is not a commit [Inferred, from the code; no product code
     changed since round 4]. A copy-class run cannot be made in that window:
     no code makes a copy.
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
   - If v1.2 moves from `e5a37fa1` before you sign, this package is
     redrafted and reviewed again.
2. **The `tags` field moves, and the version strings do not.** The
   round-1 reviewer agreed with both (Finding 8). On `tags`: Git can now
   put a tag into a copy Syzygy made, so the field says what happens to it
   rather than leaving that to a reading. **But the code does not keep
   `tags` "never read" today, under v1.0 or v1.1.** [Observed] Before it
   knows that the object a `--revision` or trunk reference names is a
   commit, the launch reads that object's whole body; when it is an
   annotated tag (or a blob), that read is outside `tags` and outside the
   installed REQ-046. v1.1 does not create that gap and does not close it;
   the code repair is filed for its own repair as `syzygy-pdja.30`
   (`IMPACT-LEDGER.md`, item 1c). That repair, PR #816, is merging; once it
   merges the check reads only the object's header (the ledger gives its
   state, labelled). Launch-consent v1.2 says Syzygy tells
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

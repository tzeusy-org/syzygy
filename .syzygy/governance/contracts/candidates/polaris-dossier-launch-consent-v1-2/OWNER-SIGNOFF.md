# Owner sign-off — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Rounds 1 to 3 of review returned
> `REVISE`. On 2026-11-10 you chose a redesign. Rounds 4 to 10, its first
> reviews, returned `REVISE` on the text's consistency and edge cases. One
> class of finding (a statement a refused run cannot truthfully make)
> recurred in rounds 6, 7, 9 and 10, so the coordinating session stopped the
> loop after round 10. On 2026-11-10 you ruled on the open points and ordered
> round 11 (`OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`, section
> "Rulings after review round 10, 2026-11-10"), applied in
> `ROUND-11-PREP.md`. Round 11 returned `REVISE`: three falsifier arms and
> one agent statement that a conforming run could not meet, and five notes.
> Its repair, with every falsifier arm tested, was read by a scoped round
> 12, which returned `REVISE`: the packet duty conflicted with
> REQ-polaris-generation-035's fixed packet contents, and the copy could lie
> inside the governance home. You then chose "Briefs only (Recommended)" and
> "One more fixes-only round (Recommended)" (direction record, section
> "Rulings after review round 12, 2026-11-10"). That fixes-only round 13
> returned `REVISE` on one point: the copy could still sit in a linked
> worktree of the governance home. Its repair was read by round 14, under
> your ruling "Fixes-only rounds until clean", which returned `REVISE` on one
> point: a run that issued one brief and not the other had to say both
> sessions were directed. Its repair was read by round 15, which returned
> `REVISE` on one point: a run whose copy step ended before Git read your
> clone had to say what Git read of it. Its repair was read by round 16,
> the last round under your ruling, which returned `REVISE` on one point:
> four scenarios still required a refused run to remove its copy even where
> the removal fails. These bytes are its repair
> (`ROUND-16-DISPOSITIONS.md`); no review has read them yet. Whether a
> round 17 runs is yours to decide. This page may be
> offered only after
> a `CONFIRM`, or a `CONFIRM WITH EXCEPTIONS` with notes only, over them. The
> install tooling is `scripts/build_polaris_dossier_launch_consent_v1_2.py`.
> Nothing here records a choice; only your selection after review binds this
> version.

## The one question

Do you sign version 1.2? A launch then takes your existing full clone,
copies the trunk-tip commit from it into a one-commit clone of Syzygy's own
with no network, and runs on that copy. It also accepts any https or ssh
repository URL on any host. It carries your rulings 3 and 4 of 2026-11-09
and your redesign and rulings of 2026-11-10. One point below, under
"Before you sign", must be settled before this version can be used; the
four others you ruled on 2026-11-10 are recorded under "Ruled".

- **Option:** "Sign launch-consent spec version 1.2"

## What it does

- **Your clone as it is, copied.** A launched run takes a normal clone,
  history, branches and tags included. Syzygy asks Git to copy the pinned
  commit alone from it, over Git's local file transport, into a fresh
  directory of Syzygy's own, and checks the copy out at that commit. Git runs
  with your system and global Git settings off, every network transport
  refused, no hooks and no fetching of missing objects. Syzygy checks that
  the copy holds one commit and nothing else, the same check it makes today
  on one-commit clones the operator prepares. The copy lives in a directory of Syzygy's own,
  outside your clone; a run that is refused or declined removes it (if the
  removal fails, the launch output says so and names where the copy is), and
  a completed run keeps it, naming where, until you remove it.
- **Then the signed rules, unchanged.** Every read, re-hash and refusal the
  signed local-agent rules state applies to the copy. Your clone is never
  fetched into, repacked, checked out or written to.
- **What Syzygy itself reads of your clone.** To pick the commit and propose
  the identity: the reference names and a few reference values, read as
  files; the remote names and URLs in the configuration, as text; whether an
  alternates file exists; and, for a short `--revision`, the stored object
  names. To keep the copy out of your clone's working trees: the files that
  locate its Git directories and its linked worktrees, and the two settings
  (`core.bare`, `core.worktree`) that say where its main working tree is,
  read as text. No object, no working tree, no index.
- **What Git reads of your clone.** To make the copy, Git reads your clone's
  configuration, references and object store, including older stored bytes
  it unpacks to rebuild the trunk-tip files. Those are Git's reads, not
  Syzygy's: Syzygy uses nothing of them but the copy, and the rule that
  Syzygy reads no file contents before your answer is about Syzygy's own
  reads. The question, the run record and the pages say so. A run whose
  copy step ended early says where it ended instead: if Syzygy never
  started the fetch, that Git read nothing of your clone; if the fetch was
  started and failed, that it failed, as Git reported.
- **Refused:** a clone missing an object the pinned commit needs (a partial
  clone, for example); a clone that borrows objects through an alternates
  file; a clone whose references are in Git's newer reftable format.
- **SHA-1 or SHA-256, as your clone is** (your ruling of 2026-11-10). The
  copy is made with the object format your clone's configuration records,
  SHA-1 where it records none, and the one-commit check expects that
  format's settings. No clone is refused for its object format, except that
  a format your Git does not support fails the copy, and the run is refused.
- **Consents recorded under version 1.1 get a copy too** (your ruling of
  2026-11-10, "Copy anyway"). A run that only such a consent covers runs on
  a copy like any other, so a full clone works for it. Its run record says
  that the copy goes beyond that consent's "no fetch by Syzygy" wording, or,
  where the fetch was started and failed, that it failed, as Git reported,
  or, where the copy step ended before Syzygy started the fetch, that no
  fetch was made.
- **Your checkout does not matter.** Your branch, a detached HEAD or
  uncommitted changes are left alone and never reach the run.
- **The agents work in the copy** (your redesign). The authoring and
  inventory briefs name the copy as the clone to work in and tell the
  session not to read yours. Review packets keep their fixed contents, with
  nothing added for the copy (your ruling "Briefs only (Recommended)").
- **The copy never sits in the governance home or in your clone.** Its
  directory is never inside any working tree of the governance home's
  repository, linked worktrees included, nor inside its Git directories, and
  never inside your clone's working tree or Git directories, or any working
  tree of your clone's repository, linked worktrees included. A run that would
  put it there is refused before any copy is made.
- **Trunk tip.** This is the commit your clone's `origin/HEAD` points to, as
  of your last fetch. With no `origin` default, it is the one other remote
  that records a default; where several do and none is `origin`, the launch
  is refused and asks for `--revision`. With no remote default at all, it is
  `main`, else `master`. A local branch with unpushed commits is never the
  default; the launch output tells you when it differs.
- **`--revision`** takes a commit. A tag that is an annotated tag object is
  refused rather than followed; give the commit it names. If Git cannot
  check the pinned object out, the launch is refused with Git's reason and
  says only that the object was not shown to be a commit.
- **Any https or ssh URL you type**, on any host, including `git@host:path`,
  and `http://` and `git://` URLs as version 1.1 already accepts them.
  - A typed `https://`, `http://` or `git://` URL that carries any user
    information, even a bare user name, is refused. So is any URL whose
    user information holds a `:`. An ssh user name alone (`git@host`) is
    fine.
  - A clone whose own remote is `http://` or `git://` still gets an
    identity proposed, as today (your ruling 4).
  - Credentials found in a remote are dropped, never stored, and flagged. A
    remote URL that is not a usable locator is never printed or stored.
- **Identities: two segments for every host** (your ruling 3).
  - `repository:<owner>-<repo>`, as GitHub repositories have today.
  - A GitLab subgroup path `group/sub/project` becomes
    `repository:sub-project`.
- **Existing consents still serve.** A consent made by another act now also
  matches a launch by its upstream URL, host and whole path. That adds a
  match; every way a consent matched before still works.
- **Public or not** is still your declaration, on every host. Syzygy never
  guesses it, and a repository not declared public stays private under the
  screening policy.

The redis consent, which says its clone holds one commit alone, keeps that
rule: a run at a commit it names is a no-copy run and works in your clone as
today, and a HEAD elsewhere is refused with the checkout command. A run at
such a commit that needs no launch record keeps every earlier rule
unchanged.

## What it costs

- **Same-named repositories share records** (your ruling 3). For example,
  `github.com/a/b` and `gitlab.com/a/b`, or two subgroups ending
  `sub/project`.
  - Unless you give another identity, the second one launched is proposed
    the first one's identity.
  - It then relies on the first one's drawer and provider statements.
  - The question names those records before you answer. Consents for
    specific commits never carry across.
- **The copy exists before you answer.** The question needs the commit's
  date and its file list, which Syzygy reads from the copy. So the copy,
  files included, is made before the question. Syzygy reads none of
  its file contents before your answer, and a decline removes it.
- **Git, not Syzygy, reads your packs.** Git reads your clone's object
  store, older stored bytes included, to build the copy. Syzygy relies on
  Git starting no program your clone's own settings or hooks name while it
  does; a test on Git 2.53.0 ran none, and the run record states it as
  Inferred.
- **The agents are told, not prevented.** Your clone stays on the same
  machine, so a session that ignores its brief could still read your
  history. Whether it stayed in the copy is Inferred. Syzygy records only
  what it did itself (a brief issued, a packet delivered); whether a
  session started or read it is that session's own report.
- **A refused run says how far it got.** The run record and pages state
  each thing only once the run reached it (a revision named, a copy made,
  the commit pinned, the question asked, a brief issued), and otherwise
  that it was not reached. A run that works in your own clone says no copy
  was made.
- **Port and case merge repositories** (the fourth disclosed residual).
  The identity rule, unchanged from version 1.1, drops any port and
  lowercases the URL, so two servers on one host at different ports, or two
  repositories whose names differ only in letter case, get one identity and
  match each other's records, and the second relies on the first one's
  drawer and provider statements unless you give another identity.
- **A version 1.1 consent's copy goes beyond its wording.** That consent
  says the commit is "held in the operator's own clone, with no fetch by
  Syzygy". The copy is a local fetch, and after it the run reads the
  commit from the copy, not from your clone, so it departs from both
  halves. [Inferred] The objects are the same bytes either way. The run
  record names only the "no fetch by Syzygy" wording, as your ruling
  named it; the spec text is left as the ruling made it (round 11 note 5).
  The consent is otherwise relied on as recorded.
- **Disk.** Each completed run leaves one commit's files in a directory of
  Syzygy's own, outside the run's state directory, until you remove it.
- **The run record keeps what Syzygy read before your answer.** Version
  1.0 kept the results of Syzygy's pre-answer reads to the question, the
  launch output and the records a confirmed answer makes; its review
  carried this to you as note G5. Version 1.2 also stores them in the run
  record, as the statements it requires there (the pinned revision, its
  date, the identity and URL), because a refused run must still say what
  it reached. The run record stays in the run's state directory.

## Before you sign

**A reading you accept by signing** (round 13, note 2). A review packet
carries exactly the contents REQ-polaris-generation-035 lists: the frozen
subject, the cited spans, the governing criteria, the verdict schema, the
pinned revision and the packet's digest. Two older signed rules also put
text in packets: REQ-polaris-generation-033's rule against building or
running your project (SEC-3), in every packet, and, in any packet that
mentions consent, version 1.1's instruction never to run or answer a consent
question. Version 1.2 counts both as part of the packet's
"governing criteria". [Observed] The product code already does: its
fidelity criteria carry the reviewer's operating instructions. The spec is
not changed for this; signing accepts that reading.

1. **The registry entry must change first.** The signed source-acquisition
   registry entry for the local-agent mode says, among other things:
   - "Syzygy fetches nothing", and that you prepare the clone with your own
     tools (`fetch`);
   - that objects are read from your clone's Git directory and "no process
     is started" (`readAuthority`);
   - that Syzygy writes only to the run's state directory and "nothing is
     written to the clone" (`stateDirectoryWrites`);
   - that tags are "never read" (`tags`);
   - that it has no write surface (`writeSurface`, an empty list).

   The redesign starts Git, makes a local fetch, reads objects from the
   copy, writes the copy outside the run's state directory and keeps it,
   and may bring an annotated tag into the copy before refusing it.
   [Inferred] No reading of the first three admits that, and the last two
   are arguable, so
   version 1.2 cannot be used until you sign a successor version of the
   entry. That successor is a separate package and question; it is not
   drafted here. Signing version 1.2 alone settles the specification, not
   the entry. Reading your clone's references and remote URLs is not new:
   version 1.1 already does it, and the entry's "no ref is read" is read as
   about the adapter's object reads, as versions 1.0 and 1.1 read it.

## Ruled on 2026-11-10

Recorded in `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`, sections
"Rulings after review round 10, 2026-11-10" and "Rulings after review round
12, 2026-11-10". They are no longer open.

- **Packets** ("Briefs only (Recommended)"): only the authoring and
  inventory briefs name the copy; review packets keep
  REQ-polaris-generation-035's fixed contents.
- **Next** ("One more fixes-only round (Recommended)"): one more review
  round, reading the fixes only.

- **Typed `http://` and `git://` URLs stay accepted** ("Keep http/git
  URLs"), credentials still refused, as drafted.
- **Port and case merge** ("Port/case merge"), accepted as drafted. It is
  now disclosed as the fourth residual beside the record list; the identity
  rule's bytes are unchanged.
- **SHA-256 clones are copied, not refused.** You left "Refuse SHA-256
  clones" unticked, so the copy takes your clone's object format. [Observed]
  On Git 2.53.0 a scratch SHA-256 repository fetched over `file://` into a
  SHA-256 copy checked out at the named commit with one commit held; into a
  SHA-1 copy the fetch failed (`ROUND-11-PREP.md`).
- **Consents recorded under version 1.1** ("Copy anyway (Recommended)"):
  version 1.2 copies for them too, the run record says the copy goes beyond
  that consent's "no fetch by Syzygy" wording, and a full clone works. The
  refusal of a full clone and the one-commit requirement for that case are
  gone. [Observed, local refs only] No such record exists in this checkout
  today.

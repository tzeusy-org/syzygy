# Owner sign-off — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Rounds 1 to 3 of review returned
> `REVISE`. On 2026-11-10 you chose a redesign. Rounds 4 to 9, its first
> reviews, returned `REVISE` on the text's consistency and edge cases; these
> bytes are the round-9 repair, and no review has read them yet. This page may be offered only after
> a `CONFIRM`, or a `CONFIRM WITH EXCEPTIONS` with notes only, over them. The
> install tooling is `scripts/build_polaris_dossier_launch_consent_v1_2.py`.
> Nothing here records a choice; only your selection after review binds this
> version.

## The one question

Do you sign version 1.2? A launch then takes your existing full clone,
copies the trunk-tip commit from it into a one-commit clone of Syzygy's own
with no network, and runs on that copy. It also accepts any https or ssh
repository URL on any host. It carries your rulings 3 and 4 of 2026-11-09
and your redesign of 2026-11-10. Five points below, under "Before you
sign", are yours to settle; the first must be settled before this version
can be used.

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
  outside your clone; a run that is refused or declined removes it, and a
  completed run keeps it, naming where, until you remove it.
- **Then the signed rules, unchanged.** Every read, re-hash and refusal the
  signed local-agent rules state applies to the copy. Your clone is never
  fetched into, repacked, checked out or written to.
- **What Syzygy itself reads of your clone.** To pick the commit and propose
  the identity: the reference names and a few reference values, read as
  files; the remote names and URLs in the configuration, as text; whether an
  alternates file exists; and, for a short `--revision`, the stored object
  names. No object, no working tree, no index.
- **What Git reads of your clone.** To make the copy, Git reads your clone's
  configuration, references and object store, including older stored bytes
  it unpacks to rebuild the trunk-tip files. Those are Git's reads, not
  Syzygy's: Syzygy uses nothing of them but the copy, and the rule that
  Syzygy reads no file contents before your answer is about Syzygy's own
  reads. The question, the run record and the pages say so.
- **Refused:** a clone missing an object the pinned commit needs (a partial
  clone, for example); a clone that borrows objects through an alternates
  file; a clone whose references are in Git's newer reftable format.
- **Your checkout does not matter.** Your branch, a detached HEAD or
  uncommitted changes are left alone and never reach the run.
- **The agents work in the copy** (your redesign). Every brief and review
  packet names the copy as the clone to work in and tells the session not to
  read yours.
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
  history. Whether it stayed in the copy is Inferred.
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
2. **Typed `http://` and `git://` URLs: kept, on a reading you have not
   given.** The draft first refused them, reading your ruling 4 ("Keep
   proposing for http/git") as about a clone's remotes only. The reviewer
   showed that version 1.1 already accepts them when typed. The coordinating
   session then read your ruling as a preference against narrowing version
   1.1, and directed that they stay accepted, credentials still refused.
   [Inferred] That reading is the coordinating session's, not yours. If you
   want typed `http://` and `git://` refused, say so; it is a small change
   to one paragraph and three scenarios, and needs a review round.
3. **Port and case merge two repositories into one.** The identity rule,
   unchanged from version 1.1, drops any port and lowercases the host and
   path. So two servers on one host at different ports, or two repositories
   on a case-sensitive host whose names differ only in case, get one
   normalised URL and one identity. Each then matches the other's records,
   by URL as well as by identity, and the second relies on the first one's
   drawer and provider statements unless you give another identity. The
   question names the records it matched. Version 1.2 does not change this
   and does not list it among the disclosed residuals. You may accept it as
   it is, ask for it to be disclosed as a fourth residual (the rule's bytes
   unchanged), or ask for a rule that keeps the port or the case.
4. **SHA-256 repositories are refused.** Git can store a repository with
   SHA-256 object names instead of the usual SHA-1. Syzygy's copy is an
   ordinary SHA-1 repository, and the one-commit check it already runs
   refuses the settings a SHA-256 copy needs, so a SHA-256 clone fails the
   copy and the launch is refused. The signed registry entry allows SHA-256
   objects, so this narrows what a launch accepts. You may accept that, or
   ask for the copy to take the clone's object format, which also changes
   the one-commit check and needs a review round.
5. **Consents recorded under version 1.1 keep their wording.** A launch
   consent recorded under version 1.1 says the commit is "held in the
   operator's own clone, with no fetch by Syzygy". A local copy is a fetch,
   so version 1.2 does not copy for such a consent: a later run at that
   commit works in your clone, as under version 1.1, and needs a one-commit
   clone; a full clone at that commit is refused, naming the reason. To use
   a full clone there, you would make a one-commit clone of that commit, as
   version 1.1 needed. [Observed, local refs only] No such record exists in
   this checkout today; this matters only if version 1.1 is used before you
   sign version 1.2.

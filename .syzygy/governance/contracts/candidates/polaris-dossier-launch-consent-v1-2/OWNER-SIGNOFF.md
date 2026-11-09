# Owner sign-off — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Rounds 1 and 2 of review
> returned `REVISE`; these bytes are the round-2 repair, and no review has
> read them yet. This
> page may be offered only after a `CONFIRM`, or a `CONFIRM WITH EXCEPTIONS`
> with notes only, over them. The install tooling is
> `scripts/build_polaris_dossier_launch_consent_v1_2.py`. Nothing here records
> a choice; only your selection after review binds this version.

## The one question

Do you sign version 1.2? It lets a launch read your existing full clone at
the trunk tip with no fetch, and accepts any https or ssh repository URL on
any host. It carries your four rulings of 2026-11-09. Three points below,
under "Before you sign", are yours to settle, and one of them rests on a
reading no one has asked you about.

- **Option:** "Sign launch-consent spec version 1.2"

## What it does

- **Your clone as it is.** A launched run takes a normal clone, history,
  branches and tags included. Syzygy reads only the pinned trunk-tip commit
  and what lies below it, as Git objects. To pin the commit and propose the
  identity it also reads reference names and a few reference values, and the
  remote names and URLs in the clone's configuration; none of that is
  content. It never reads a parent commit, another branch, your working tree
  or your index, runs nothing against the clone, and fetches nothing. A clone
  whose references are in Git's newer reftable format is refused.
- **Older bytes as delta input only.** Rebuilding a trunk-tip file may
  unpack an older version's stored bytes. They are never read as content,
  shown or sent. The question, the launch output, the run record, the pages
  and the consent's recorded scope say so (your ruling 1).
- **Trunk tip.** This is the commit your clone's `origin/HEAD` points to, as
  of your last fetch. With no `origin` default, it is the one other remote
  that records a default; where several do and none is `origin`, the launch
  is refused and asks for `--revision`. With no remote default at all, it is
  `main`, else `master`. A local branch with unpushed commits is never the
  default; the launch output tells you when it differs.
- **`--revision`** takes a commit. A tag that is an annotated tag object is
  refused rather than followed; give the commit it names.
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

## What it costs

- **Same-named repositories share records** (your ruling 3). For example,
  `github.com/a/b` and `gitlab.com/a/b`, or two subgroups ending
  `sub/project`.
  - Unless you give another identity, the second one launched is proposed
    the first one's identity.
  - It then relies on the first one's drawer and provider statements.
  - The question names those records before you answer. Consents for
    specific commits never carry across.
- **Your agents can see history** (your ruling 2).
  - Syzygy reads none of it as content. Beyond the pinned commit it reads
    only reference names and values, the stored object names, the remote
    lines of the configuration, the Git-directory files, the type of an
    object a `--revision` names, and delta-base bytes unpacked only to
    rebuild the pinned tree. The agent sessions can read everything in a
    full clone.
  - You chose disclosure over the recommended pinned-tree copy. The question,
    the run record and the pages say so, and every brief and review packet
    asks the session to stay at the pinned commit.
  - Whether it does is Inferred.
- **No dirty-checkout check.** Checking would mean reading your working
  tree. The launch output says the tree was not inspected and prints
  `git status` for you to run.

The redis consent, which says its clone holds one commit alone, keeps that
rule for every run made under it, including one that also records a
launch statement.

## Before you sign

1. **Typed `http://` and `git://` URLs: kept, on a reading you have not
   given.** The draft first refused them, reading your ruling 4 ("Keep
   proposing for http/git") as about a clone's remotes only. The reviewer
   showed that version 1.1 already accepts them when typed. The coordinating
   session then read your ruling as a preference against narrowing version
   1.1, and directed that they stay accepted, credentials still refused.
   [Inferred] That reading is the coordinating session's, not yours. If you
   want typed `http://` and `git://` refused, say so; it is a small change
   to one paragraph and three scenarios, and needs a review round.
2. **Port and case merge two repositories into one.** The identity rule,
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
3. **The registry entry's wording.** The signed source-acquisition registry
   entry lists the objects Syzygy may read "only", and says no reference or
   configuration is read. This version, and the reviewer, read the first as
   allowing a packed object's delta base to be unpacked to rebuild it, and
   the second as covering Syzygy's object reads, not the launch's reference
   and configuration reads. One more read lies outside the entry's list:
   when `--revision` names something that is not a commit, such as an
   annotated tag, Syzygy reads that one object's type, from its header
   only, to refuse it. If you read the entry more narrowly, it needs a
   signed successor before this version can be used; if you agree, you may
   still want a later registry version to say so in words.

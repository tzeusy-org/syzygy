# Owner sign-off — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] No review has read these bytes
> yet. This page may be offered only after a `CONFIRM`, or a
> `CONFIRM WITH EXCEPTIONS` with notes only, over them. The install tooling is
> `scripts/build_polaris_dossier_launch_consent_v1_2.py`. Nothing here records
> a choice; only your selection after review binds this version.

## The one question

Do you sign version 1.2? It lets a launch read your existing full clone at
the trunk tip with no fetch, and accepts any https or ssh repository URL on
any host. It carries your four rulings of 2026-11-09.

- **Option:** "Sign launch-consent spec version 1.2"

## What it does

- **Your clone as it is.** A launched run takes a normal clone, history,
  branches and tags included. Syzygy reads only the pinned trunk-tip commit
  and what lies below it, as Git objects. It never reads a parent commit,
  another branch, your working tree or your index, runs nothing in the
  clone, and fetches nothing.
- **Older bytes as delta input only.** Rebuilding a trunk-tip file may
  unpack an older version's stored bytes. They are never read as content,
  shown or sent, and the run says so (your ruling 1).
- **Trunk tip.** This is the commit your clone's `origin/HEAD` points to, as
  of your last fetch, else `main`, else `master`. A local branch with
  unpushed commits is never the default; the launch output tells you when it
  differs.
- **Any https or ssh URL you type**, on any host, including `git@host:path`.
  - A typed URL that carries a password or token is refused.
  - A clone whose own remote is `http://` or `git://` still gets an
    identity proposed, as today (your ruling 4).
  - Credentials found in a remote are dropped, never stored, and flagged.
- **Identities: two segments for every host** (your ruling 3).
  - `repository:<owner>-<repo>`, as GitHub repositories have today.
  - A GitLab subgroup path `group/sub/project` becomes
    `repository:sub-project`.
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
  - Syzygy reads none of it, but the agent sessions can read everything in a
    full clone.
  - You chose disclosure over the recommended pinned-tree copy. The question
    says so before you answer, and the brief asks the agent to stay at the
    pinned commit.
  - Whether it does is Inferred.
- **No dirty-checkout check.** Checking would mean reading your working
  tree. The launch output says the tree was not inspected and prints
  `git status` for you to run.
- **Typed `http://` or `git://` URLs are refused.** You type an https or
  ssh URL only when your clone has no usable remote.

The redis consent, which says its clone holds one commit alone, keeps that
rule for runs made under it.

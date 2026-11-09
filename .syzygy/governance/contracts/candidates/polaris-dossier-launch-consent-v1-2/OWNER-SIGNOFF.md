# Owner sign-off — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] No review has read these bytes
> yet. This page may be offered only after a `CONFIRM`, or a
> `CONFIRM WITH EXCEPTIONS` with notes only, over them. The install tooling is
> `scripts/build_polaris_dossier_launch_consent_v1_2.py`. Nothing here records
> a choice; only your selection after review binds this version.

## The one question

Do you sign version 1.2? It lets a launch read your existing full clone at
the trunk tip with no fetch, and accepts any https or ssh repository URL on
any host.

- **Option:** "Sign launch-consent spec version 1.2"

## What it does

- **Your clone as it is.** A launched run takes a normal clone, history,
  branches and tags included. Syzygy reads only the pinned trunk-tip commit
  and what lies below it, as Git objects. It never reads a parent commit,
  another branch, your working tree or your index, runs nothing in the
  clone, and fetches nothing.
- **Trunk tip.** This is the commit your clone's `origin/HEAD` points to, as
  of your last fetch, else `main`, else `master`. A local branch with
  unpushed commits is never the default; the launch output tells you when it
  differs.
- **Any https or ssh URL**, on any host, including `git@host:path`.
  - A URL that carries a password or token is refused. One found in the
    clone's own remote is dropped, never stored, and the launch output
    flags it.
  - `http`, `git://`, `file://` and local paths are not accepted.
- **Identities.** GitHub repositories keep the identities they have today
  (`repository:redis-redis`). Other hosts get the host in the identity
  (`repository:git.example.org-team-tool`), so a mirror elsewhere does not
  silently share a GitHub repository's records.
- **Public or not** is still your declaration, on every host. Syzygy never
  guesses it, and a repository not declared public stays private under the
  screening policy.

## What it costs

- **Your agent can see history.** Syzygy reads none of it, but the agent
  sessions can read everything in a full clone. The question says so before
  you answer, and the brief asks the agent to stay at the pinned commit;
  whether it does is Inferred.
- **"History stays unread" holds for content, not for every byte.** Git
  stores many files as differences from other versions. To rebuild a
  trunk-tip file Syzygy may have to unpack an older version's stored bytes,
  which it then discards unread. The strict alternative refuses such files,
  and how often that would bite is not measured (`SEMANTIC-DELTA.md`, owner
  point 1).
- **No dirty-checkout check.** Checking would mean reading your working
  tree. The launch output says the tree was not inspected and prints
  `git status` for you to run.
- **Narrower than v1.1 in one place.** A clone whose remote is `http://` or
  `git://` no longer proposes an identity; you give one.

The redis consent, which says its clone holds one commit alone, keeps that
rule for runs made under it.

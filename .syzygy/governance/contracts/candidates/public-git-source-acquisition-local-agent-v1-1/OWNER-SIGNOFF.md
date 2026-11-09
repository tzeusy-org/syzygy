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

## The question you answer

> Extend Scope A to version 1.1 of the source-acquisition registry entry
> for the local-agent mode (`public-git-source-acquisition-local-agent`)
> and sign it? It lets a run that makes a copy read your clone's references
> and remote URLs as data, copy the pinned commit from your clone into a
> one-commit clone of Syzygy's own with one local Git fetch, and read
> objects from that copy only. A run that makes no copy keeps every v1.0
> rule.

- **Option to select:** "Extend Scope A and sign source-acquisition entry
  v1.1". The recorder refuses a selection that does not carry the words
  "Extend Scope A", because Scope A names only the PWB observer entry and
  every other registry entry is signed under your extension to it, as v1.0
  was.
- **Other answer:** "Not yet", with what to change; nothing is recorded.

## What changes, in plain words

- **Today (v1.0)** the entry says Syzygy fetches nothing, starts no
  process, and reads objects only from your clone. Launch-consent v1.2's
  copy breaks all three.
- **Version 1.1** keeps those words for a run that makes no copy (the redis
  run, for example) and adds, for a run that makes a copy:
  - before the copy, Syzygy reads five things in your clone as plain data
    and obeys none of them: where the Git directory is; your references'
    names and the few values the trunk rule needs; your remotes' names and
    URLs from the configuration file; whether an alternates file exists;
    and, for a shortened `--revision` only, object names;
  - the copy itself: a new empty directory, `git init --template=`, then
    one fetch of the pinned commit alone over `file://`, depth one, no tags,
    no submodules, with your global and system Git configuration off, only
    the file transport allowed, lazy fetching off and no hooks;
  - from then on every object read is made in the copy; Syzygy reads no
    object of your clone;
  - the copy's directory is the one new place Syzygy writes. It is removed
    if the run ends early, and otherwise kept after the run until you
    remove it; the launch output says where it is;
  - an annotated tag named by `--revision` may land in the copy; Syzygy
    reads only its type, refuses, and removes the copy.
- Nothing is written to your clone, ever.
- The entry also says, in words, what v1.0 and v1.1 runs already rely on:
  reading references and remote URLs to pin a revision and propose an
  identity is a launch read, not an object read, and these reads are now a
  closed list.

## What it costs, and what stays uncertain

- [Inferred] Git, when it serves the copy, reads your clone's
  configuration, references and packs, including stored bytes of objects
  outside the pinned commit. Syzygy uses nothing Git read but the copy. The
  entry says so.
- [Inferred] Syzygy relies on Git not starting any program your clone's
  configuration or hooks name while it serves the copy. A scratch test with
  Git 2.53.0 found none ran (PR #812, D2); this is not checked per run.
- [Observed] No code implements the copy yet. Until it is implemented, and
  authorized, no run makes a copy.

## Before you sign

1. **Sign this together with launch-consent v1.2, or not at all.**
   - Signed alone, it changes nothing a run does today, but the entry's
     bytes change, so the gate code that is wired to v1.0 must change in
     the same commit (`IMPACT-LEDGER.md`, item 1), or every local-agent
     dossier read refuses.
   - Launch-consent v1.2 signed without this cannot take effect: its copy
     would exceed the entry.
   - If v1.2 changes again before you sign, this package is redrafted and
     reviewed again.
2. **The `tags` field moves.** Review round 4 called it arguably
   contradicted; I judged it should say so rather than rest on a reading
   (`SEMANTIC-DELTA.md`, E1).
3. **The version strings do not move** (E5), and the object-database
   identity scheme still says "operator-declared clone" (E6). Both are
   offered to the reviewer as questions.

## What signing does

- The recorder checks the review, replaces the installed entry with the
  v1.1 bytes, writes decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.1.md
  and one block in `ACCEPTANCE-ACT-RECORD.md`, and prints the tag
  `public-git-source-acquisition-local-agent-v1.1` to create.
- It does not edit or retire the v1.0 record.
- It is one of the separate acts a read needs. It gives no observation
  consent, adopts no screening policy, and authorizes no implementation.

## What it does not cover

- Launch-consent v1.2 itself, which is its own sign-off.
- The implementation of the copy step and the gate change, which need their
  own authorization.
- The battery lines for v1.1, added in the signing commit.

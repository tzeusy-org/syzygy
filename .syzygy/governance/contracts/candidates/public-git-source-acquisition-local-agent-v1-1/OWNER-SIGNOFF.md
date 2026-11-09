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
> **Bound to PR #812 at head `de9c1ba8`.** This package restates #812's
> copy step as that head drafts it. If #812 changes (for example, a round
> 11), this package is redrafted and reviewed again before it is offered.

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

#812 sorts runs into two classes. A **copy-class run** works in a copy
Syzygy makes. A **no-copy run** works in your own clone: one whose commit
another act's consent names (the redis run, for example), or one covered by
a launch consent recorded under version 1.1 whose scope holds the commit "in the operator's own clone"
scope.

- **Today (v1.0)** the entry says Syzygy fetches nothing, starts no
  process, and reads objects only from your clone. #812's copy breaks all
  three.
- **Version 1.1** keeps those words for a no-copy run and adds, for a
  copy-class run:
  - the copy itself: a new empty directory, `git init --template=`, then
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
  - the copy's directory is the one new place Syzygy writes. It is removed
    if the run ends before its brief, and otherwise kept after the run
    until you remove it; the launch output says where it is.
- **For every launch-consented run**, the entry now names the five things
  Syzygy reads in your clone as plain data, obeying none of them: where the
  Git directory is; your references' names and the few values the trunk
  rule needs; your remotes' names and URLs from the configuration file;
  whether an alternates file exists; and, for a shortened `--revision`
  only, object names. A no-copy run also reads the files its clone-form
  check needs.
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
   - Signed alone, its copy clauses do nothing, but the entry's bytes
     change. So the gate code wired to v1.0
     (`packages/polaris-generation-consent/src/package-reader.ts`) must
     change in the same commit (`IMPACT-LEDGER.md`, item 1), or every
     local-agent dossier read refuses.
   - Launch-consent v1.2 signed without this cannot take effect: its copy
     would exceed the entry.
   - If v1.2 moves from `de9c1ba8` before you sign, this package is
     redrafted and reviewed again.
2. **The `tags` field moves.** #812's D9 calls it arguably contradicted; I
   judged it should say so rather than rest on a reading
   (`SEMANTIC-DELTA.md`, E1).
3. **`writeSurface` stays empty**, and `stateDirectoryWrites` now says why:
   the copy's directory is Syzygy's own local write, not a write to an
   observed or external system.
4. **The version strings do not move** (E5), and the object-database
   identity scheme still says `repository-id-plus-operator-declared-clone-git-dir`
   (E6). Both are offered to the reviewer as questions.

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

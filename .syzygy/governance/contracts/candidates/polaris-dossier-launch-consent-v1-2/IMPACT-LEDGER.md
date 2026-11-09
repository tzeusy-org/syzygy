# Impact ledger — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] The patch applies to the installed
> version 1.1 bytes on `main` (commit `715c59c4`), which hash to the digest
> the v1.1 review read. The record
> `.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.1.md`
> names that review, and `scripts/build_polaris_dossier_launch_consent_v1_2.py
> --check` compares the two. The subject digests are in `PROPOSED-SUBJECTS.json`,
> written by the builder, never by hand.

## Requirement impact

| Requirement | Effect |
|---|---|
| REQ-polaris-generation-046 | The question states the agent sessions' reach in a full clone. The identity derivation keeps its v1.1 bytes: last two segments, every host, `https`, `http`, `ssh`, `git` and scp-form remotes. One sentence group says it applies to every host and adds a two-segment floor. The residuals now name the cross-host and cross-group share. Two paragraphs are added: locator forms (operator-given https and ssh only; remote locators adding http and git; credentials; consent lookup by the whole normalised `Upstream:` URL) and visibility for every host. Eight scenarios are added; the case, oracle and falsifier are extended; one `warrants.decisions` entry is added |
| REQ-polaris-generation-047 | The trunk rule is made exact for remote-tracking references and several remotes. The HEAD paragraph admits a detached HEAD and warns about the checkout. One paragraph group is added: the clone forms a launch-consented run accepts; the closed list of what Syzygy reads in them; the delta-base statement; missing objects; the working-tree disclosure; the brief's history instruction. Six scenarios are added; the case, observable, oracle independence and falsifier are extended; one `warrants.decisions` entry is added |
| REQ-polaris-generation-001, 025, 033 to 036, 040 | Bytes unchanged. 033's object-read, re-hash and refusal rules are read, never displaced: a full clone's reads are the same object reads |

[Observed] Fourteen scenarios are added. The change's spec goes from 28
`#### Scenario:` headings to 42, counted by `grep -c` over the installed and
the patched bytes on 2026-11-09. `PROJECT-STATUS.md`'s effective-composition
figure is 38 requirements and 302 scenarios today (`status_figure()`). It
is recounted by `apply()` at install, and `check_spec_reconciliation.py
--regenerate` follows.

## Behaviour that changes for existing users

- **Narrower: typed credentials.** An operator-given URL with credentials,
  a query or a fragment is refused. Under version 1.1 its user information
  was dropped silently.
- **Narrower: typed http and git.** An operator-given `http://` or `git://`
  upstream is refused. A clone's own `http://` or `git://` remote still
  derives as before (owner ruling 4; `SEMANTIC-DELTA.md` D6 says why typed
  URLs stay narrower).
- **A cost the owner accepted: shared identities across hosts and groups.**
  This is owner ruling 3, "a same-named repo on two hosts would share
  consent records".
  - `gitlab.com/a/b` derives the identity of `github.com/a/b`. So do
    `group1/sub/p` and `group2/sub/p` on one host.
  - Unless the operator gives another identity, the second one launched
    matches the first one's records by identity, and relies on its drawer
    and agent-provider statements.
  - The question names those records and how they matched.
  - Observation consents name revisions and do not carry across.
  - A consent made by another act is found only by its whole normalised
    `Upstream:` URL, so it never reaches the other repository.

## Implementation impact

[Inferred] After sign-off only, under a separate implementation direction:

- `init` stops applying the single-commit clone-shape check
  (`packages/polaris-dossier/src/clone-shape.ts`) to launch-consented runs.
  It keeps the check for runs that rely on another act's consent stating
  that form.
- The GitHub-only parser (`packages/polaris-dossier/src/github-url.ts`) and
  the `init` refusal that a run record carries a GitHub URL only give way
  to:
  - a locator parser for the three admitted forms;
  - the remote-locator forms;
  - consent lookup by the whole normalised `Upstream:` URL.
- The identity derivation (`launch-identity.ts`) keeps its rule and gains
  the two-segment floor.
- The launch question, the launch output, the run record, the pages and the
  brief gain the statements REQ-046 and 047 add, the delta-base statement
  included.

No product code changes with this package. `tasks.md` is unchanged.

The `warrants.decisions` lists gain
`OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09`. The change's
`GOVERNING-DEPENDENCIES.md` is generated at install from the warrants
(`scripts/check_spec_reconciliation.py --regenerate`), so it changes then.
It is not patched here.

## Records and acts read, none edited

- **The redis observation consent** (a performed act's record) keeps its
  one-commit form for runs that rely on it, and this version says so.
- **The source-acquisition registry entry.**
  - Its `typedAuthority.fetch` sentence is read as guidance for consents
    that state a fetch form. Version 1.0 made the same reading and asked a
    reviewer to test it.
  - Its `readAuthority` is read as admitting a delta base read solely to
    rebuild an in-scope packed object, as the owner allowed.
  - If a reviewer rejects either reading, the entry needs an owner-signed
    successor version first.
- **Screening scope v8** (held) and the installed v7 name no host or
  `github:` identity. The visibility carrier is the launch record's
  declaration, which this version leaves to the operator for every host.
- **The launch-record write consent** (performed) names only
  `repository:tzeusy-org-syzygy`, whose derivation is unchanged.

## Tooling registered at drafting time

- The builder `scripts/build_polaris_dossier_launch_consent_v1_2.py`
  (`--check`, `--selftest`, `--write-subjects`).
- The v1.1 builder peels an applied v1.2 patch and delegates
  `signed_findings()` here once v1.2 or later is recorded. Its
  unknown-later-version fixture moves from v1.2 to v1.3.
- The recorder's `polaris-dossier-launch-consent@1.2` package, with its
  routing selftest, and the P115 census's closed set of later packages.
- **No CG-7d or CG-7e registration.** A versioned sign-off binds a version
  tag, with no phrase and no digest argument
  (`OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02`), so there is no
  act phrase or packet digest copy to register.
- **The CG-26 battery triple is held for the sign-off commit,** as for
  version 1.1: the PROJECT-STATUS battery lines, the hosted workflow steps
  and the count sentence.

## Costs

- **The agent's reach grows, by the owner's choice.** In a full clone the
  author and review sessions can read history, other branches, the stash
  and reflogs, which no consent names.
  - The owner chose disclosure over the recommended pinned-tree copy (ruling
    2).
  - The question says so, and the brief asks the agent to stay at the pinned
    revision.
  - That it does is Inferred.
- **Pack bases.** Rebuilding a trunk-tip object may inflate the stored bytes
  of a historical object. They are never content, shown or sent, and the run
  says so (ruling 1).
- **No dirty-tree detection.** A checkout with uncommitted changes is not
  refused, only disclosed, because detecting it would read the working tree.
- **Shared identities** across hosts, groups and joined characters, as
  above.
- **Remote-tracking staleness.** The trunk tip is the clone's last fetch, as
  before. A full clone fetched long ago pins an old commit; the
  did-not-fetch statement and the update command are the remedy already in
  force.

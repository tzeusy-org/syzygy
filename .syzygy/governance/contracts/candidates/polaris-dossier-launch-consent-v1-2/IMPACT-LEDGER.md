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
| REQ-polaris-generation-046 | The pre-answer read list names the launch reads of references, configuration and Git-directory files, as 047's closed list does, apart from the object reads. The question states the agent sessions' reach in a full clone and that objects may be rebuilt from delta bases outside the pinned tree; the launch observation consent's recorded scope carries the same allowance. The run record and pages state the history reach. The identity derivation keeps its v1.1 bytes: last two segments, every host, `https`, `http`, `ssh`, `git` and scp-form remotes. One sentence group says it applies to every host and adds a two-segment floor. The residuals now name the cross-host and cross-group share. Two paragraphs are added: locator forms (operator-given `https`, `http`, `git`, `ssh` and scp, as v1.1 normalises them, without credentials; remote locators in the same forms once their user information is removed; no URL that fails either rule printed, stored or recorded; an observation consent made by another act matching by its whole normalised `Upstream:` URL, in addition to every v1.1 match) and visibility for every host. Ten scenarios are added; the case, oracle and falsifier are extended; one `warrants.decisions` entry is added |
| REQ-polaris-generation-047 | The consented-HEAD branch's "changes nothing else" is narrowed to the pin, so the rules below bind every launch-consented run, a repeat run included, and no other run; a consent of another act that states the clone's form binds every run relying on it. The trunk rule is made exact for remote-tracking references and several remotes, and `--revision` resolution for annotated tags and abbreviations. The HEAD paragraph admits a detached HEAD and warns about the checkout. One paragraph group is added: the clone forms a launch-consented run accepts; the closed list of what Syzygy reads in them, with the object reads under REQ-033's rule and the launch reads named apart; the delta-base statement in the launch output, run record and pages; the `--revision` type read; the reftable refusal; missing objects; the working-tree disclosure; the history instruction in every brief and packet issued to an agent session. Ten scenarios are added; the case, observable, oracle independence and falsifier are extended; one `warrants.decisions` entry is added |
| REQ-polaris-generation-001, 025, 033 to 036, 040 | Bytes unchanged. 033's object-read, re-hash and refusal rules are read, never displaced: a full clone's content reads are the same object reads, and the launch reads 046 and 047 name read no content |

[Observed] Twenty scenarios are added, ten to 046 and ten to 047. The
change's spec goes from 28 `#### Scenario:` headings to 48, counted by
`grep -c` over the installed and the patched bytes on 2026-11-09.
`PROJECT-STATUS.md`'s effective-composition figure is 38 requirements and
302 scenarios today (`status_figure()`), so 322 after install [Inferred:
computed, not yet recounted with the patch applied]. It is recounted by
`apply()` at install, and `check_spec_reconciliation.py
--regenerate` follows.

## Behaviour that changes for existing users

- **Narrower: typed credentials.** An operator-given URL with credentials,
  a query or a fragment is refused. Under version 1.1 its user information
  was dropped silently.
- **Narrower: a typed bare user name over `https`, `http` or `git`.** Such a
  URL is refused, where version 1.1 dropped the user information silently.
  An `ssh` or scp user name alone is still admitted.
- **Not narrower: typed http and git.** An operator-given `http://` or
  `git://` upstream is admitted, as version 1.1 normalises it, credentials
  refused. [Inferred] This follows the coordinating session's reading of
  owner ruling 4 (`SEMANTIC-DELTA.md` D6), which the owner has not been
  asked; the sign-off page flags it.
- **Narrower: a remote URL that is not a locator.** It derives nothing,
  and is never printed, stored or recorded; the launch output names the
  remote and the rule.
- **Narrower: annotated tags and reftable.** A `--revision` naming an
  annotated tag, and a clone whose references are in the reftable backend,
  are refused before the question. [Observed] The implementation already
  refuses a non-commit `--revision`; whether it reads reftable is [Unknown].
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
  - A consent made by another act matches by URL only through its whole
    normalised `Upstream:` URL, so by URL it never reaches the other
    repository. It may still match by identity, which the question shows.
- **A cost carried to the owner: port and case merge.** Normalisation drops
  the port and case-folds, so two servers on one host at different ports, or
  two repositories differing only in case, share a normalised URL and an
  identity (round 1 note 10; the sign-off page states it).

## Implementation impact

[Inferred] After sign-off only, under a separate implementation direction:

- `init` stops applying the single-commit clone-shape check
  (`packages/polaris-dossier/src/clone-shape.ts`) to launch-consented runs.
  It keeps the check for runs that rely on another act's consent stating
  that form.
- The GitHub-only parser (`packages/polaris-dossier/src/github-url.ts`) and
  the `init` refusal that a run record carries a GitHub URL only give way
  to:
  - a locator parser for the admitted forms;
  - the remote-locator forms;
  - matching of other acts' consents by the whole normalised `Upstream:` URL.
- The identity derivation (`launch-identity.ts`) keeps its rule and gains
  the two-segment floor.
- The launch question, the launch output, the run record, the pages, the
  brief and every review packet gain the statements REQ-046 and 047 add, the
  delta-base statement included.
- `--revision` resolution and the reftable refusal follow 047's text.

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
    rebuild an in-scope packed object, as the owner allowed, and its "no
    ref ... repository-local configuration" as scoped to the adapter's
    object reads, not to the launch reads. The `--revision` type read
    (round 2 finding 3) touches one object outside the entry's list, its
    header only, to refuse it; that reading goes to the owner too.
  - If the owner or a reviewer rejects a reading, the entry needs an
    owner-signed successor version first. The round-1 reviewer took the
    same readings and left the choice to the owner (finding 4).
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
  - The question, the run record and the pages say so, and every brief and
    packet asks the session to stay at the pinned revision.
  - That it does is Inferred.
- **Pack bases.** Rebuilding a trunk-tip object may inflate the stored bytes
  of a historical object. They are never content, shown or sent, and the
  question, the launch output, the run record, the pages and the consent's
  recorded scope say so (ruling 1).
- **No dirty-tree detection.** A checkout with uncommitted changes is not
  refused, only disclosed, because detecting it would read the working tree.
- **Shared identities** across hosts, groups and joined characters, as
  above.
- **Remote-tracking staleness.** The trunk tip is the clone's last fetch, as
  before. A full clone fetched long ago pins an old commit; the
  did-not-fetch statement and the update command are the remedy already in
  force.

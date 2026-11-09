# Impact ledger — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] The patch applies to the installed
> version 1.1 bytes on `main` (commit `715c59c4`), which hash to the digest
> the v1.1 review read
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.1.md`
> names that review; `scripts/build_polaris_dossier_launch_consent_v1_2.py
> --check` compares them). The subject digests are in `PROPOSED-SUBJECTS.json`,
> written by the builder, never by hand.

## Requirement impact

| Requirement | Effect |
|---|---|
| REQ-polaris-generation-046 | The question states the agent sessions' reach in a full clone. The identity rule admits only https, ssh and scp-form locators and qualifies a non-`github.com` identity by its host. The identity residuals are rewritten. Two paragraphs are added (admitted locator forms, credentials and consent lookup by normalised `Upstream:`; visibility for every host). Six scenarios are added; the case, oracle and falsifier are extended; one `warrants.decisions` entry is added |
| REQ-polaris-generation-047 | The trunk rule is made exact for remote-tracking references and several remotes. The HEAD paragraph admits a detached HEAD and warns about the checkout. One paragraph group is added (the clone forms a launch-consented run accepts, the closed list of what Syzygy reads in them, missing objects, the working-tree disclosure, the brief's history instruction). Six scenarios are added; the case, observable, oracle independence and falsifier are extended; one `warrants.decisions` entry is added |
| REQ-polaris-generation-001, 025, 033 to 036, 040 | Bytes unchanged. 033's object-read, re-hash and refusal rules are read, never displaced: a full clone's reads are the same object reads |

[Observed] Twelve scenarios are added. The change's spec goes from 28
`#### Scenario:` headings to 40, counted by `grep -c` over the installed and
the patched bytes on 2026-11-09. `PROJECT-STATUS.md`'s effective-composition
figure, 38 requirements and 302 scenarios today (`status_figure()`), is
recounted by `apply()` at install, and `check_spec_reconciliation.py
--regenerate` follows.

## Behaviour that narrows

- [Inferred] A clone whose selected remote is `http://`, `git://`, `file://`
  or a local path no longer proposes an identity or URL. The operator gives
  both as options, as for a clone with no remote. Version 1.1 normalised
  `http` and `git` remotes.
- An operator-given URL with credentials, a query or a fragment is refused.
  In version 1.1 the user information was dropped silently.

## Implementation impact

[Inferred] After sign-off only, under a separate implementation direction:

- `init` stops applying the single-commit clone-shape check
  (`packages/polaris-dossier/src/clone-shape.ts`) to launch-consented runs
  and keeps it for runs that rely on another act's consent stating that form;
- the GitHub-only parser (`packages/polaris-dossier/src/github-url.ts`) and
  the `init` refusal that a run record carries a GitHub URL only give way to
  a locator parser for the three admitted forms, with consent lookup by
  normalised `Upstream:`;
- the identity derivation (`launch-identity.ts`) gains the host-qualified
  form off `github.com`;
- the launch question, the launch output, the run record, the pages and the
  brief gain the statements REQ-046 and 047 add.

No product code changes with this package. `tasks.md` is unchanged. The
`warrants.decisions` lists gain `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09`,
so the change's `GOVERNING-DEPENDENCIES.md`, generated at install from the
warrants (`scripts/check_spec_reconciliation.py --regenerate`), changes at
install. It is not patched here.

## Records and acts read, none edited

- The redis observation consent (a performed act's record) keeps its
  one-commit form for runs that rely on it, and this version says so.
- The source-acquisition registry entry: its `typedAuthority.fetch` sentence
  is read as guidance for consents that state a fetch form, the same reading
  version 1.0 made and asked a reviewer to test. Its `readAuthority` is read
  as admitting a delta base read solely to rebuild an in-scope packed object.
  If a reviewer rejects either reading, the entry needs an owner-signed
  successor version first.
- Screening scope v8 (held) and the installed v7: no host or `github:`
  identity is named. The visibility carrier is the launch record's
  declaration, which this version leaves to the operator for every host.
- The launch-record write consent (performed): it names only
  `repository:tzeusy-org-syzygy`, whose derivation from `github.com` is
  unchanged.

## Tooling registered at drafting time

- The builder `scripts/build_polaris_dossier_launch_consent_v1_2.py`
  (`--check`, `--selftest`, `--write-subjects`).
- The v1.1 builder peels an applied v1.2 patch and delegates
  `signed_findings()` here once v1.2 or later is recorded. Its
  unknown-later-version fixture moves from v1.2 to v1.3.
- The recorder's `polaris-dossier-launch-consent@1.2` package, with its
  routing selftest, and the P115 census's closed set of later packages.
- No CG-7d or CG-7e registration. A versioned sign-off binds a version tag,
  with no phrase and no digest argument
  (`OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02`), so there is no
  act phrase or packet digest copy to register.
- The CG-26 battery triple (the PROJECT-STATUS battery lines, the hosted
  workflow steps and the count sentence) is held for the sign-off commit, as
  for version 1.1.

## Costs

- **The agent's reach grows.** In a full clone the agent sessions can read
  history, other branches, the stash and reflogs, which no consent names. The
  question says so and the brief asks the agent to stay at the pinned
  revision; that it does is Inferred.
- **Pack bases.** Rebuilding a trunk-tip object may inflate the stored bytes
  of a historical object. They are never content, but "history stays unread"
  holds for content, not for every stored byte (`SEMANTIC-DELTA.md`, owner
  point 1).
- **No dirty-tree detection.** A checkout with uncommitted changes is not
  refused, only disclosed, because detecting it would read the working tree.
- **Identity collisions** remain for joined or replaced characters, for
  ports, and for a host and a GitHub owner of the same name. They are
  disclosed as residuals.
- **Remote-tracking staleness.** The trunk tip is the clone's last fetch, as
  before. A full clone fetched long ago pins an old commit, and the
  did-not-fetch statement and the update command are the remedy already in
  force.

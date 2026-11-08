# Semantic delta — public-source screening scope, version 8 (private sources)

> **Candidate — binds nothing.** Drafted 2026-11-08 (`syzygy-pdja.23`). It
> carries no digest; the argument comes only from the manifest row. Nothing
> here is approved. It is offered to the owner only after a confirming review.

## Authority and subject

- **Direction:** the owner direction OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08
  (a decisions file, not yet on `main`),
  item `syzygy-pdja.21-public`, answer B: "Private too: a screening-policy
  successor admitting private sources is drafted, reviewed and offered to you
  separately". [Observed, in the drafting worktree of
  `agent/syzygy-pdja.21-launch-consent`; Unknown whether it has landed on
  `main` when this package is reviewed.] The direction binds no policy and
  says the successor is "never performed by an agent"; this package binds
  nothing either.
- **Subject:** the policy file
  `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`,
  at the bytes the version-7 act applied (variant `s`). The builder refuses
  any other base.
- **Change class:** normative; a security and privacy posture change (SEC-2,
  SEC-5), so one superseding `approve-policy` act (VIS-4). It widens which
  repositories the scope can read, so an agent may not perform it.

## The change, in full

Every edit is inside `publicSourceScope`, plus `policyVersion`
(`1.9.0-…v7-s.v8-pv`). The key keeps its name: code reads the scope by that
key [Observed: `SCOPE_KEY` in the builders; the screens in
`packages/polaris-dossier/src/screen.ts` and
`apps/three-surface-poc/src/polaris-generation/public-source-screening.ts`],
and renaming it would change every reader for no change in meaning.

1. **`purpose`:** "admit arbitrary public repositories" becomes "admit
   arbitrary repositories, public or private (sourceVisibility)".
2. **`observedRepositories`:** "an effective public-repository observation
   consent record" becomes "an effective observation consent record, of a
   public or a private repository (sourceVisibility)". The rest is unchanged:
   the policy still admits no repository by itself; only an observation
   consent does.
3. **New key `sourceVisibility`**, directly after `observedRepositories`:
   - `values` and `admitted`: both exactly `public`, `private`. `admitted` is
     the predicate a consumer reads to learn whether the effective policy
     admits non-public sources (the launch-consent draft's words).
   - `rule`: a repository is public only when its effective observation
     consent record states that it is public. A record that states no
     visibility, states it ambiguously or states it private makes the
     repository private, and a consumer that cannot read the statement treats
     it as private. The statement is the operator's declaration, labelled
     Inferred; Syzygy makes no network request and uses no credential to
     verify it. Visibility is read per pair, never inherited from a fork, an
     upstream or another pair.
   - `privateSourceRules`, `unchanged`, `agentSessions`, `consequence`: say in
     one place what differs for a private repository, what does not, what the
     policy cannot reach, and what it costs. They state rules written at the
     three sites below and add none of their own.
4. **`accessBoundary.networkEgressRoutes[0]`** (the shallow by-commit fetch
   from the upstream) applies to a public repository only. For a private
   repository Syzygy fetches nothing, reads only Git objects already in a
   clone the operator holds, and holds, reads, requests and uses no credential
   for its host.
5. **`secretRedaction.appliesTo`** applies to a public repository only. A
   private repository's body with any detector match is excluded whole, in
   every class, and never retained as redacted-span.
6. **`rawBodyHandling.rule`:** for a private repository, an egress consent
   covers its content, target-metadata included, only when the consent's
   record names that pair and states that the repository is private. A
   public-target egress consent, or one that does not state it, never covers
   it.

`scripts/build_public_source_screening_scope_v8.py` holds the six edits as
literal (old, new) pairs and the new key as a literal value. `--check` undoes
each edit, drops the key and requires the version-7 scope back byte for byte,
so no other rule can change unseen.

## Every consequence of private content, and the decision taken

Each is decided toward less exposure. Where the conservative choice has a
cost, the cost is in the owner packet.

| Consequence | Decision | Basis |
|---|---|---|
| **Admission.** The public-only wording refuses every repository whose record does not say public | Admit private repositories under the same per-repository observation consent; nothing else admits one | Answer B. [Observed] `observedRepositories` already says "the policy admits no repository" |
| **Who says a repository is private.** Syzygy cannot see a host's visibility without a network request | The record's statement, labelled Inferred. **Private is the default:** only a record that says public gets the public reading | [Inferred] A wrong "public" gets the looser rules (redaction, fetch); a wrong "private" only costs withheld files. Fail-closed |
| **Fetch and credentials.** A private upstream needs a credential to fetch | No fetch and no credential: Syzygy reads only a clone the operator holds | [Observed] `accessBoundary.credentialApi` is false. [Observed] The launch-consent draft already says "Syzygy fetches nothing" |
| **SEC-2, Syzygy's own provider egress** (provider mode) | Only under an egress consent that names the pair and states it private. A public-target egress consent never covers a private repository | [Observed] Both egress consent instances in the tree (`EGRESS-CONSENT-ANTHROPIC.md` under `public-repo-admission/instances/` and under `public-egress-v2/instances/`) and both templates are titled "Public-target egress consent"; the version-2 instance names its pairs. [Inferred] Naming the pair alone already excludes an unnamed private repository; the stated-private condition guards a pair whose visibility changes |
| **SEC-2, the operator-agent mode's agent sends** | **Not decidable by this policy.** Named in `agentSessions` | [Observed] REQ-polaris-generation-033: neither the statement's classes nor the screening policies bind the agent's reads or sends, and a non-governed subject needs no statement. See open question 1 |
| **SEC-5, detectors** | Unchanged: every detector runs on every body, and a match excludes or redacts exactly as for a public repository | [Observed] `detectors` already says "public visibility exempts nothing". [Inferred] A private repository is likelier to hold live secrets, because the host's public push protection and secret scanning did not apply to it. That changes nothing in the detectors, which already run on all content |
| **SEC-5, redacted-span retention** | **Off for private repositories:** any match excludes the whole body | [Observed] `withheldLines`: the whole body's content digest and Git object id stay recorded (RFC5-17), "so a guess at short withheld lines can be checked against them". [Inferred] For a public repository the guess gains nothing, because the body is published. For a private one, rendering every other line turns the digest into an offline oracle for the withheld line. [Observed] `secretRedaction.consequence` also says a secret next to a match but beyond the guard line is admitted, which matters more where secrets are live |
| **Digests of excluded private bodies** | Unchanged (RFC5-17 requires them) | [Inferred] A whole-body digest confirms a guess only when the guesser knows the rest of the body, which whole exclusion does not show. The residual is disclosed in `consequence`, not removed |
| **Excluded sources' metadata** | Unchanged | [Observed] `targetMetadataRule`: an excluded source's id is opaque, its path is not carried, and no body or digest is carried |
| **Storage, logging, rendering, retention** | Unchanged: run directory only, never logged, a generated editorial draft never published, no machine response | [Observed] `rawBodyHandling`. [Unknown] No retention period is stated for a run directory under either visibility, and this version adds none (open question 3) |
| **Agent review packets and page sinks** | Unchanged: the exemptions' `egress` rule governs what reaches an agent session | [Observed] `activeContent.codeContentExemption.egress` |
| **Third-party private repositories** (an employer's, a client's) | Not distinguished. The policy cannot tell who may disclose a repository | [Unknown] Whether the owner means "private repositories I hold" to include ones held under a confidentiality duty. Open question 2 |

## What this keeps

- Every detector, placement, class rule, exemption, denied path and limit.
- Every rule for a public repository is byte-unchanged in effect. The three
  stricter sites now say "public" where they applied to all, and public
  repositories are the only ones admitted today.
- The policy confers no consent and admits no repository.

## Mechanical and judged halves

- Mechanical: the six edits, the key and its place, the admitted list, the
  private default's wording and the detectors' "exempts nothing" sentence are
  pinned by `--check`. `--selftest` mutates each of them (18 cases).
- Judged: whether the decisions above are the conservative ones, whether a
  consequence is missing, and whether "states that the repository is public"
  can be read by an install without parsing free prose. See open question 4.

## What this does not do

- It amends no specification. The launch-consent change
  (`openspec/changes/polaris-dossier-launch-consent/`, on its own branch)
  keeps its bytes. The clauses that would read differently are listed in the
  impact ledger.
- It grants no observation, egress or write consent and admits no repository.
- It changes no doctrine. SEC-2's reach over the agent's own sends is
  REQ-polaris-generation-033's, and this package only names it.

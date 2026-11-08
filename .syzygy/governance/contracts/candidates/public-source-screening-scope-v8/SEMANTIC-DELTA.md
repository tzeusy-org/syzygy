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
   - `rule` (repaired after round 1, findings 1 and 2): visibility is decided
     per commit read, from the effective record that admits that commit (the
     pair's record naming that revision). It is public only when that record
     **and every other effective observation record of the same pair** state
     public through a carrier. Anything else (a record stating private,
     stating nothing, or unreadable) makes the repository private at every
     commit. A fork that a record places in an upstream's pair is part of that
     pair, so its private record makes the whole pair private. (Round 2,
     finding 3; defined in round 3, finding 4; its population named in round
     4, E1.) Every file at a location where observation consent records are
     read counts as a possible record: for launch records, every file at the
     launch records' location on the dedicated reference, a drawer or
     provider statement included; for the act forms, each named act file.
     Such a file, not shown to be revoked or superseded, whose kind cannot be
     read, or that reads as an observation consent record whose effectiveness
     or pair cannot be read, including one that cannot be read at all, could
     be a record of any pair. While one exists, every read under the scope is
     refused, with that file named, until it is read or revoked. The scope
     does not ignore it, guess its kind or pair or turn every pair private: a
     refusal names the fault, while a silent private reading would change the
     rules for every repository without saying why. **Its cost:** launch
     records lie within the agent sessions' write reach, so one malformed
     record written there stops every run, redis included. That costs
     availability, never exposure.
   - **The carriers, and the only ones.** A launch consent record states it by
     the operator's declaration whether the repository is public, which
     REQ-polaris-generation-046 already requires the record to carry. It is
     public only when that answer is affirmative, and the generic launch form
     reads it as one of exactly two values. (Round 2, finding 2.) The other
     carrier is closed in the policy bytes. A record made by the owner act
     recorded at `.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`,
     or at the requests act's file of the same family, and by no other act,
     states public by that act's form. A further act states public by form
     only when a later policy version names it, never because a code list of
     act forms grows. [Observed] Only the redis act is recorded today; the
     requests form in `ADMISSION_ACT_FORMS` names an act file that does not
     exist. No title or prose is a carrier. So redis stays public, by form,
     with no prose parsed. The statement stays the operator's or owner's
     declaration, labelled Inferred.
   - `privateSourceRules`, `unchanged`, `agentSessions`, `consequence`,
     `consentRecordMetadata`: say in one place what differs for a private
     repository, what does not, what the policy cannot reach, and what it
     costs. They state rules written at the four sites below and add none of
     their own.
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
7. **`contentClassification.rules[1].rule` (code-structure)**, added after
   round 2, finding 1, and widened after round 3, finding 1. For a private
   repository, the object id and size of a blob excluded or withheld **on any
   ground** are not code-structure. Grounds include a denied path, an
   indeterminate or unclassifiable blob, a detector match on its path or
   body, active content, and a strict-UTF-8, NUL or resource-limit failure.
   They are kept only in the run directory's check records and its local
   review packets, and are never rendered or carried in any egress (round 4,
   E2: the exclusion records hold neither, and this scope keeps their retained
   fields unchanged). Public repositories keep today's reading.
8. **`contentClassification.indeterminate`**, last sentence (round 3,
   finding 1): "Its path, object id and size remain code-structure" gains
   "except that, for a repository whose visibility is private, its object id
   and size do not, under the code-structure rule". The indeterminate rule
   therefore no longer contradicts edit 7 for private repositories.

`scripts/build_public_source_screening_scope_v8.py` holds the eight edits as
literal (old, new) pairs and the new key as a literal value. `--check` undoes
each edit, drops the key and requires the version-7 scope back byte for byte.
Beside that list it pins the number of edits (eight), the number per path, and
the set of scope paths the change may touch. An extra edit therefore fails even
when the list is extended to undo it, whether it lands at a new path or at one
already pinned. The pins sit in the same file as the list, so they catch an
appended entry, not an author who edits both. The manifest digest binds the
bytes either way.

## Every consequence of private content, and the decision taken

Each is decided toward less exposure. Where the conservative choice has a
cost, the cost is in the owner packet.

| Consequence | Decision | Basis |
|---|---|---|
| **Admission.** The public-only wording refuses every repository whose record does not say public | Admit private repositories under the same per-repository observation consent; nothing else admits one | Answer B. [Observed] `observedRepositories` already says "the policy admits no repository" |
| **Who says a repository is private.** Syzygy cannot see a host's visibility without a network request | The carrier of the record admitting the commit, and of every other record of the pair, labelled Inferred. **Private is the default:** public only when every effective record of the pair states public through a carrier | [Inferred] A wrong "public" gets the looser rules (redaction, fetch, public-target egress coverage); a wrong "private" only costs withheld files. Fail-closed. [Observed] At 913c6b7d the launch-consent draft proposes the upstream's identity for a fork at an upstream commit (its REQ-046, spec.md line 15), so per-pair reading alone would let a private fork read as public |
| **Fetch and credentials.** A private upstream needs a credential to fetch | No fetch and no credential: Syzygy reads only a clone the operator holds | [Observed] `accessBoundary.credentialApi` is false. [Observed] The launch-consent draft already says "Syzygy fetches nothing" |
| **SEC-2, Syzygy's own provider egress** (provider mode) | Only under an egress consent that names the pair and states it private. A public-target egress consent never covers a private repository | [Observed] Both egress consent instances in the tree (`EGRESS-CONSENT-ANTHROPIC.md` under `public-repo-admission/instances/` and under `public-egress-v2/instances/`) and both templates are titled "Public-target egress consent"; the version-2 instance names its pairs. [Inferred] Naming the pair alone already excludes an unnamed private repository; the stated-private condition guards a pair whose visibility changes |
| **SEC-2, the operator-agent mode's agent sends** | **Not decidable by this policy.** Named in `agentSessions` | [Observed] REQ-polaris-generation-033: neither the statement's classes nor the screening policies bind the agent's reads or sends, and a non-governed subject needs no statement. See open question 1 |
| **SEC-5, detectors** | Unchanged: every detector runs on every body, and a match excludes or redacts exactly as for a public repository | [Observed] `detectors` already says "public visibility exempts nothing". [Inferred] A private repository is likelier to hold live secrets, because the host's public push protection and secret scanning did not apply to it. That changes nothing in the detectors, which already run on all content |
| **SEC-5, redacted-span retention** | **Off for private repositories:** any match excludes the whole body | [Observed] `withheldLines`: the whole body's content digest and Git object id stay recorded (RFC5-17), "so a guess at short withheld lines can be checked against them". [Inferred] For a public repository the guess gains nothing, because the body is published. For a private one, rendering every other line turns the digest into an offline oracle for the withheld line. [Observed] `secretRedaction.consequence` also says a secret next to a match but beyond the guard line is admitted, which matters more where secrets are live |
| **Digests, object ids and sizes of excluded or withheld private blobs, on any ground** | **Withheld from pages and from every egress** (edits 7 and 8). They are kept only in the run directory's check records and its local review packets. Not moved into the exclusion records: RFC5-17 names neither field, `matchAction` and `unclassifiableExclusion` retain neither, and this scope keeps both exactly; a denied-path blob is never read and has no content digest to record (round 4, E2). The residual is disclosed in `sourceVisibility.consequence` | [Observed] Version 7 makes object ids and sizes code-structure (the class rule, and the indeterminate rule: "Its path, object id and size remain code-structure"). Code-structure can leave under an egress consent that lists it. The dossier renders the object id of an excluded blob (`packages/polaris-dossier/src/check-derive.ts`, which keeps it unless the path matched a detector, so a denied-path, indeterminate or body-matched blob keeps it; `packages/polaris-dossier/src/render.ts`, the discovery row and the source population). Round 3 found that denied paths (`.env`, `.pem`, `id_rsa`, the most secret-dense files) and indeterminate blobs are never run through a detector, so a detector-only rule missed them. [Inferred] A Git object id is a digest of the whole body. Where a guesser knows the rest of the body (a private fork of a public upstream whose file differs by one secret line, a template, earlier public history), it confirms a guessed secret offline, and the size narrows the secret's length. Withholding them, for every excluded or withheld private blob, closes the page and egress routes. What remains, stated rather than removed: whoever can read the run directory or the operator's clone, which holds every object id, can still confirm a guess; the pinned commit id, rendered on every discovery row and recorded in the launch record, digests the commit header and the root tree and so every object id in it, so a guesser who also knows the commit header (author, dates, message, parent) and the rest of the tree can confirm a guess against it: a narrower oracle, and one the scope cannot withhold (round 4, E4); and a secret that no detector matches in a body the scope admits is admitted and rendered under either visibility (SEC-5's general residual, unchanged). Alternative not taken: disclosing the residual and leaving the ids rendered and egressable |
| **Excluded sources' metadata** | Unchanged | [Observed] `targetMetadataRule`: an excluded source's id is opaque, its path is not carried, and no body or digest is carried |
| **Storage, logging, rendering, retention** | Unchanged: run directory only, never logged, a generated editorial draft never published, no machine response | [Observed] `rawBodyHandling`. [Unknown] No retention period is stated for a run directory under either visibility, and this version adds none (open question 3) |
| **Agent review packets and page sinks** | Unchanged: the exemptions' `egress` rule governs what reaches an agent session | [Observed] `activeContent.codeContentExemption.egress`. [Inferred] A review packet that Syzygy writes for the operator's agent session is not an external egress Syzygy makes, because in that mode Syzygy makes no provider call (REQ-polaris-generation-033). So `rawBodyHandling.rule`'s stated-private condition does not reach it. If a review role uses a different provider from the author, that provider receives the content on the operator's act. Open question 1 covers it |
| **The repository's identity in Syzygy's own repository** | Not governed by this policy; named in `consentRecordMetadata` | [Observed] The launch-consent draft stores the identity and normalised URL in the launch record and commits it on a dedicated reference that Syzygy never pushes. [Inferred] For a private repository, its name, host path and commit ids become tracked objects in Syzygy's repository, one operator push from its remote. Open question 2 |
| **Third-party private repositories** (an employer's, a client's) | Not distinguished. The policy cannot tell who may disclose a repository | [Unknown] Whether the owner means "private repositories I hold" to include ones held under a confidentiality duty. Open question 2 |

## What this keeps

- Every detector, placement, class rule, exemption, denied path and limit,
  except the code-structure rule and the last sentence of `indeterminate`
  (edits 7 and 8), which change for private repositories only.
- Every rule for a public repository is unchanged in effect, with two
  exceptions, both fail-closed. The admitted public repository (redis)
  states public by its act form, so it keeps the upstream fetch, partial
  redaction and its public-target egress coverage. The exceptions:
  - A public pair reads private once any other effective record of the pair
    states private (a private fork launched at an upstream commit), states
    nothing, or cannot be read (for example, a launch record whose
    declaration the generic form cannot read as one of its two values). It
    then loses partial redaction, the fetch, the rendering of excluded
    blobs' object ids, and its public-target egress coverage.
  - A record whose effectiveness or pair cannot be read refuses every read
    under the scope, public pairs included, until it is read or revoked.
  - The signed `privateSourceRules` names both exceptions (round 3,
    finding 2).
- The policy confers no consent and admits no repository.

## Mechanical and judged halves

- Mechanical: `--check` pins the eight edits, their count, their count per
  path, the scope paths they may touch, the key and its place, the admitted
  list, every text of the key, nine required phrases of the rule (carrier,
  pair, refusal, definition and default wording), and the detectors'
  "exempts nothing" sentence. `--selftest` has 47 cases: 4 controls and 43
  mutations. It reverts each edit, narrows edit 7 back to detector matches,
  guts each text of the key, drops each required phrase, and adds an extra
  edit both at a new path and at a pinned one.
- Judged: whether the decisions above are the conservative ones, and whether
  a consequence is missing. The carrier question is decided in the package
  (above), not left to the owner.

## What this does not do

- It amends no specification. The launch-consent change
  (`openspec/changes/polaris-dossier-launch-consent/`, on its own branch)
  keeps its bytes. The clauses that would read differently are listed in the
  impact ledger.
- It grants no observation, egress or write consent and admits no repository.
- It changes no doctrine. SEC-2's reach over the agent's own sends is
  REQ-polaris-generation-033's, and this package only names it.

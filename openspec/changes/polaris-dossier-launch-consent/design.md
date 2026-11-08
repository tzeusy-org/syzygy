# Design — Polaris on any repository, with consent asked at launch

> **Candidate — binds nothing.** Review material for
> `proposed/polaris-generation/spec.md`, revised after round 1
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-1-RAW.md`, REVISE; dispositions in
> `ROUND-1-DISPOSITIONS.md`). Labels follow the project's discipline:
> [Observed] was read this session from the file named, [Inferred] is the
> drafter's reading, [Unknown] was not established.

## 1. Which clauses govern, and why none needs amending

Each clause is quoted from its defining file (verification rule 8).

| Clause | What it says (quoted) | What launch consent does | Amendment? |
|---|---|---|---|
| RFC5-12 (`RFC-0005/consent-egress-secrets.md`) | "**Observation consent** — per repository: Syzygy may read and index it"; "Absent: no observation"; "Every consent record names its class, subject, scope, granting principal, grant instant, and revocation state." | One record per repository and revision, naming all six. Before the answer Syzygy reads references, one commit object (tree, parents, committer date only) and the tree listing, never a blob | No [Inferred]. The clause fixes granularity and fields, not ceremony or timing. The pre-answer metadata read is read as preparing the act the clause requires (naming its scope and the classes the statement must name), not as observation: nothing from it is indexed, stored or rendered beyond the question and the records. A reviewer should test this reading; the packet puts it to the owner under Q1 |
| RFC5-12, write class | "**Write consent** — per repository: Syzygy may write its two namespaces and reach declared adapter effects (SEC-4). Absent: read-only." | Recording a launch consent record is a write into Syzygy's own repository; REQ-046 requires an in-force write consent naming the record class, the dedicated reference and the location | No amendment; **one owner act** (packet Q3) |
| RFC3-7 (`RFC-0003/manifests-and-namespace.md`) | "**Consent records** are governance acts stored in `.syzygy/governance/decisions/`"; observation consent's "subject is the pair *(observing Project, repository)* … Every observed repository requires one, governed root or not"; egress consent: "**One record per *(Project, provider)* pair, naming the permitted set**" | Records sit under `.syzygy/governance/decisions/` in the tree of the dedicated reference's commits. One provider statement per (subject, provider), not per revision, reused while its classes cover the run; a wider set supersedes it by a recorded act | No [Inferred]. Two readings to test: that "stored in `.syzygy/governance/decisions/`" is met by that path in commits of a dedicated reference rather than the trunk; and that RFC3-7's one-per-pair rule, written for egress consent, is honoured by the statement even though REQ-033 says the statement is not an egress record. "Referenced — never embedded — from the declaration": §5 |
| RFC3-16(a) trust premise (`RFC-0003/governance-homes-and-owner-acts.md`) | "A machine may prepare an act for owner attendance; it may not mint, impersonate, approve, widen, revoke or reinterpret one. If an implementation accepts a forged record as an act, the resulting effect is unauthorized and is a trust-floor violation" | Syzygy prepares the question; only the owner's phrase makes the act. An agent-typed phrase is an unauthorized effect, which disclosure makes visible and does not cure (§3) | No |
| RFC3-16(c)(1) | State (1) is "preserved as the **exact owner phrase**, **exact content digest**, act record and **recording commit/tag**"; "after A1 exists, the act must explicitly select state (1)" | The phrase is exact and stored; the digest is bound; the act record is the record; the recording commit is Syzygy's commit on the dedicated reference, made before the record is relied on. While no A1 mechanism is in force the state is (1); once one is, the question asks the owner to select | No [Inferred]: every one of the four is present before the record counts |
| RFC3-16 lifecycle | "`decisions/` and consent records | active → superseded / revoked / expired"; "Effective status is read from the owner-act record, not from the stamp" | Records are active until revoked or superseded (a wider statement supersedes the narrower one) | No |
| RFC5-13 | "Consent revocation is prospective: it stops future acts (RFC5-11) and renders dependent claims Unknown" | Unchanged; a new answer after a revocation is a new grant and never reverses the old record | No |
| SEC-2 (`doctrine/security.md`) | "No governed-project content … is sent to a store or service the owner does not control — model providers included — without explicit, recorded, per-project consent"; "Onboarding consent must name the providers permitted for the project and the content classes they may receive; Syzygy renders that consent on the project's surface." | For a governed subject the answer creates a provider statement naming the provider and classes; the page cites it | No [Inferred]. The clause fixes the consent's content and its rendering, not its occasion; a launch is read as that subject's onboarding. The packet states this reading as Inferred |
| SEC-4 | "Syzygy writes into a governed repository only with recorded consent, and every write can be traced and undone." | Gated on the write consent; new files in a new commit on the dedicated reference only; attributed; revertable | No; needs the Q3 act |
| VIS-4 | Syzygy never adopts or decides on the owner's behalf | The owner answers; Syzygy records | No |
| REQ-033 (local-agent mode, in force) | "Syzygy SHALL write only to its own state directory for the run, never to a location derived from the clone's path" | Displaced for launch consent records and their recording commit only, by REQ-046 | Spec displacement in this change |

[Inferred] Conclusion: SEC-2, RFC3-7, RFC3-16, RFC5-12 and RFC5-13 permit
launch consent as drafted. The standing consent of the arbitrary-public-repo
change needed amendments because it dropped the per-repository record; this
change keeps it.

## 2. Three records, one question

A launch may record up to three separate records, because RFC5-12 makes each
consent "individually revocable and individually renderable":

- **Observation consent**, for the repository at the one pinned revision.
- **Drawer statement**, for the subject, when the owner states that no
  kernel evidence drawer exists. [Observed] Today the only source of a
  drawer statement is a per-repository owner act registered in code
  (`packages/polaris-dossier/src/gate-sources.ts`, `DRAWER_FORMS`), so every
  repository without one is governed. Asking at launch makes a non-governed
  repository reachable with no preparation. Packet Q9.
- **Provider statement**, for a governed subject or one whose drawer status
  is unknown: one per (subject, provider), reused across revisions while its
  classes cover the run's, superseded by a wider one by a recorded act.

The pre-answer reads (references, one commit object, the tree listing; no
blob) let the question state the governed conditions a path listing exposes
and the classes the path classification assigns. The commit message and the
author and committer identities are not used.

Records are read through one generic form for every repository. [Observed]
The current gate registers statement and drawer forms per repository
(`STATEMENT_FORMS`, `DRAWER_FORMS` in `gate-sources.ts`); keeping that would be
preparation by another name, so REQ-046 forbids per-repository code, phrase,
form or registry entry for launch records (slice 2).

## 3. Who answers

The question is asked only on the terminal the command was started from and
takes an exact owner phrase naming the consent, the repository identity and
the first twelve hexadecimal digits of the pinned revision. RFC3-16(c)(1)
preserves state (1) as "the exact owner phrase", so a phrase, not a yes, is
what the act needs; it also defeats a careless auto-approve.

An agent session with a terminal could still type it. Under RFC3-16(a)'s trust
premise that is not a residual disclosure cures: an implementation that
accepts an agent-typed phrase produces "an unauthorized effect" and "a
trust-floor violation". Disclosure makes the possibility visible; the
prohibition in every skill and agent text, and the owner's attendance, are
the only controls. The existing execution choice has the same exposure. The
stronger design is an out-of-band answer (a channel the agent cannot reach),
offered in packet Q5.

## 4. The revision

REQ-047 resolves "latest trunk commit" against the clone, with no network
request, because no act in force covers Syzygy fetching for this route and
REQ-040 says Syzygy makes no clone or fetch. [Inferred] The owner's "always
default to latest" may mean upstream's latest; packet Q8 asks whether to
fetch. A HEAD that differs from the pinned revision is refused with the
command to fix it, so REQ-033's HEAD check holds unchanged.

A run whose HEAD is already a revision an in-force consent names keeps
REQ-033's behaviour exactly: it pins HEAD and asks nothing. [Observed] Redis's
consent names fixed commits; a Redis clone at one of them runs as today.

[Observed] The prototype `syzygy polaris` (`packages/polaris-dossier/src/polaris.ts`)
currently defaults `--revision` to "the first preflight names". After sign-off
a run that no existing consent covers defaults to the trunk tip.

### Self-observation and the trunk tip

If launch records were committed to Syzygy's trunk, every recording commit
would move the trunk tip, so the next self-run's tip would never be a
consented revision and the commit holding the consent would itself be an
unconsented revision (round 1, F12). REQ-046 avoids this by recording on one
dedicated reference of the governance home that is never the trunk, never the
current branch and never a reference a run may pin. Syzygy creates the files
and the commit with Git object writes, touching no working tree, index or
other reference. The trunk tip is then unchanged by recording, and a second
self-run at the same tip finds the in-force record and asks nothing. The
records never enter the observed subject.

The cost: in-force records live on a reference the operator must push to keep
off-machine (Syzygy never pushes it), and readers read records from that
reference's commits rather than the working tree. A worktree of the
governance home shares its object store and references, so the separate
checkout for self-observation must be a separate clone with its own Git
directory.

## 5. What this change does not settle

- **Repository identity has no project declaration.** RFC3-7 says consent
  records are "referenced — never embedded — from the declaration", and no
  Syzygy project declaration lists the observed repositories. Redis's
  consent has the same gap. [Inferred] Pre-existing and orthogonal; flagged,
  not repaired.
- **Repository identity is derived from the clone's configuration.** The
  derivation (REQ-046) is fixed so an oracle can reproduce it and matches
  Redis's existing `repository:redis-redis` for its upstream URL [Inferred].
  The configuration lies within the agent sessions' write reach, and a clone
  re-identified under another URL at an unnamed commit escapes the
  revoked-record listing; both are disclosed, labelled Inferred.
- **Private repositories.** The classification policy's public-source scope
  admits "exactly the repository ids named by an effective public-repository
  observation consent record" [Observed:
  `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`,
  `publicSourceScope.observedRepositories`]. A repository not declared public
  is refused until a policy successor admits it (packet Q2). [Observed]
  Syzygy's own repository is public (`gh repo view`, 2026-11-08).
- **Owner placements are per repository and per commit.** The same scope's
  `contentClassification` (its `rules[3].ownerPlacements`) holds an entry for
  `repository:redis-redis` at one commit, placing three named paths, and says
  placements "name a repository only to place paths at commits its
  observation consent already admits" [Observed]. Placements are optional: a
  launched run at a revision no placement names runs, and the files a
  placement would have placed are withheld and render Unknown. Withheld files
  cost something: `OWNER-DIRECTION-REDIS-SCREENING-NEXT-2026-11-03.md`
  records that an inventory entry citing only withheld files "can block
  readiness for good" [Observed]. A trunk-tip run of a repository whose
  placements name an older commit loses them. Packet Q10 drafts an option to
  carry placements forward; it is not decided here.
- **The source-acquisition registry entry.** The installed entry
  (`declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`)
  says "to stay within the observation consent's stated fetch form the
  operator fetches the one consented commit alone" [Observed], presuming the
  consent precedes the clone. Under launch consent the operator's clone exists
  first, and the record states its fetch form as "the operator's own clone;
  Syzygy fetches nothing". [Inferred] The entry's sentence guides an
  operator's fetch made under an existing consent and does not bind a clone
  made before one; Syzygy still reads only objects of the pinned revision.
  A reviewer should test this; if it fails, the entry needs a successor
  version, not this change.

## 6. Relation to neighbouring changes

- `openspec/changes/polaris-dossier-arbitrary-public-repo/` drafted one
  standing consent for every public repository (REQ-037), which needed
  amendments to `architecture.md`, RFC1-2, RFC1-3, RFC1-4, RFC3-6, RFC3-7 and
  RFC5-12. The owner parked it (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md`,
  item 3, answer C). This change takes the per-repository route that change's
  packet Q0 offered as the alternative and edits none of its bytes. If both
  were ever adopted, the later-adopted change states the precedence. REQ-038
  and REQ-039 are untouched.
- `openspec/changes/polaris-dossier-one-command-run/` (REQ-040 to 045,
  unsigned) uses "launch record" for a session launch record. This change
  says "launch consent record" throughout, and cites REQ-033's statement
  disclosure rather than restating it.

## 7. Implementation slices (after sign-off; not filed as beads)

1. **Revision resolver and identity derivation.** The REQ-047 rule including
   the existing-consent branch, refusal on a HEAD mismatch, the launch output,
   and the REQ-046 identity derivation. Pure, tested against fixture clones.
2. **Launch consent record family.** One generic writer and reader for
   observation consent, drawer statement and provider statement records,
   with no per-repository code, phrase, form or registry entry; digest
   binding; the recording commit on the dedicated reference by Git object
   writes; the in-force check read from that reference; supersession and
   revocation; the decisions reader's stem rule (no name carries a stem in
   `ADMISSION_STEMS` or `ID_NEEDLES` of
   `packages/polaris-generation-consent/src/package-reader.ts`). The
   public-source scope reader and the drawer input accept the family.
3. **The question.** Metadata-only pre-answer reads; terminal-only prompt in
   `init` and, where REQ-040 is in force, `syzygy polaris`; the exact phrase;
   refusal paths; reuse; naming of matching records.
4. **Write gate.** Refuse to record unless the write consent is in force and
   names the record class, reference and location.
5. **Self-observation guard and disclosures.** The same-working-tree and
   same-Git-directory refusal, the run record and page disclosures, and the
   skill and agent texts that forbid answering.
6. **Conformance.** One conformance test per requirement, each scenario a
   case, expected values as literals, object reads captured by an
   instrumented object store; a rule-6 mutation pass over the refusal
   predicates.

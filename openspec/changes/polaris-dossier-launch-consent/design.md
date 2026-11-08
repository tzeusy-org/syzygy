# Design — Polaris on any repository, with consent asked at launch

> **Candidate — binds nothing.** Review material for
> `proposed/polaris-generation/spec.md`. Labels follow the project's
> discipline: [Observed] was read this session from the file named,
> [Inferred] is the drafter's reading, [Unknown] was not established.

## 1. Which clauses govern, and why none needs amending

Each clause is quoted from its defining file (verification rule 8).

| Clause | What it says (quoted) | What launch consent does | Amendment? |
|---|---|---|---|
| RFC5-12 (`RFC-0005/consent-egress-secrets.md`) | "**Observation consent** — per repository: Syzygy may read and index it"; "Every consent record names its class, subject, scope, granting principal, grant instant, and revocation state." | One record per repository, naming all six; scope is the one pinned revision | No [Inferred]: the clause fixes granularity and fields, not ceremony or timing |
| RFC5-12, write class | "**Write consent** — per repository: Syzygy may write its two namespaces and reach declared adapter effects (SEC-4). Absent: read-only." | Writing a launch record into Syzygy's own governance home is a write into Syzygy's repository; REQ-046 requires an in-force write consent first | No amendment; **one owner act** (packet Q3) |
| RFC3-7 (`RFC-0003/manifests-and-namespace.md`) | "**Consent records** are governance acts stored in `.syzygy/governance/decisions/`"; observation consent's "subject is the pair *(observing Project, repository)* … Every observed repository requires one, governed root or not." | Records are written under `decisions/`, subject (`project:syzygy`, repository) | No [Inferred]. The clause also says records are "referenced — never embedded — from the declaration"; see §5 for the pre-existing gap |
| RFC3-16 (`RFC-0003/governance-homes-and-owner-acts.md`) | "`decisions/` and consent records | active → superseded / revoked / expired"; "Effective status is read from the owner-act record, not from the stamp" | Each launch record is an owner-act record binding its consent content's exact digest, provenance state (1) | No [Inferred] |
| RFC5-13 | "Consent revocation is prospective: it stops future acts (RFC5-11) and renders dependent claims Unknown" | Unchanged; a new launch answer after a revocation is a new grant and never reverses the old record | No |
| SEC-2 (`doctrine/security.md`) | "No governed-project content … is sent to a store or service the owner does not control — model providers included — without explicit, recorded, per-project consent." | For a governed subject the same answer creates a separate per-project statement naming the provider and classes | No [Inferred]: the clause requires explicit, recorded and per-project; a typed answer recorded per repository is all three. Its sub-bullet "Onboarding consent must name the providers…" names onboarding as the occasion; [Inferred] a launch is that repository's onboarding, and a reviewer should test this reading |
| SEC-4 | "Syzygy writes into a governed repository only with recorded consent, and every write can be traced and undone." | Launch records are writes into Syzygy's own (governed) repository: gated on the write consent, one new file each, never an edit, revertable | No; needs the Q3 act |
| VIS-4 | Syzygy never adopts or decides on the owner's behalf | The owner answers; Syzygy records. An agent typing the answer would breach this, hence the residual of §3 | No |
| REQ-033 (local-agent mode, in force) | "Syzygy SHALL write only to its own state directory for the run, never to a location derived from the clone's path" | Displaced for launch records only, by REQ-046 | Spec displacement in this change |

[Inferred] Conclusion: SEC-2, RFC3-16, RFC5-12 and RFC5-13 permit launch
consent as drafted. The standing consent of the arbitrary-public-repo change
needed amendments because it dropped the per-repository record; this change
keeps it.

## 2. Two records, one answer

The question is asked once, but a governed subject gets two records, because
RFC5-12 makes each consent class "individually revocable and individually
renderable" and REQ-033 keeps the statement separate from the observation
consent. The owner may confirm the observation consent and decline the
statement; a governed run is then refused at the brief, as today.

Record layout (implementation detail, for the reviewer's orientation only):
one directory per launch under the location the write consent names, for
example `decisions/launch-consent/<repository-key>-<revision-12>/`, holding
the consent content and its owner-act record, and, for a governed subject,
the statement content and its own act record. The directory and file names
must carry none of the stems the consent package's decisions reader treats as
existing families, or the reader refuses the whole read [Observed:
`packages/polaris-generation-consent/src/package-reader.ts`, its
`ADMISSION_STEMS` and `ID_NEEDLES` lists].

## 3. Who answers

The question is asked only on the terminal the command was started from and
takes a typed confirmation. An agent session with a terminal could still type
it; the existing execution choice (`syzygy dossier allow-execution`) has the
same residual, and REQ-033 handles it by disclosure and by forbidding the
agent in the skill and agent texts. REQ-046 does the same. Two stronger
designs were considered and are offered in packet Q5:

- **Typed revision fragment.** The confirmation must include the pinned
  revision's first twelve hexadecimal digits. It defeats a careless
  auto-approve but not an agent that reads the question.
- **Out-of-band answer.** The answer comes through a channel the agent
  cannot reach (a separate operating-system user, a phone prompt). Strong,
  but it is new infrastructure and the owner ranked usefulness first in the
  one-command direction of 2026-10-14.

## 4. The revision

REQ-047 resolves "latest trunk commit" against the clone, with no network
request, because no act in force covers Syzygy fetching for this route and
REQ-040 says Syzygy makes no clone or fetch. [Inferred] The owner's
"always default to latest" may mean upstream's latest; packet Q8 asks
whether to fetch. The run does not change the clone's checkout: a HEAD that
differs from the pinned revision is refused with the command to fix it, so
REQ-033's HEAD check holds unchanged.

[Observed] The prototype `syzygy polaris` (`packages/polaris-dossier/src/polaris.ts`)
currently defaults `--revision` to "the first preflight names", that is, to
a revision an existing consent names. After sign-off its default becomes the
trunk tip.

## 5. What this change does not settle

- **Repository identity has no project declaration.** RFC3-7 says consent
  records are "referenced — never embedded — from the declaration", and no
  Syzygy project declaration lists the observed repositories. Redis's
  consent has the same gap. [Inferred] This is pre-existing and orthogonal;
  it is flagged here, not repaired.
- **Private repositories.** The classification policy's public-source scope
  admits "exactly the repository ids named by an effective public-repository
  observation consent record" [Observed:
  `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`,
  `publicSourceScope.observedRepositories`]. A private repository is outside
  it, so a launch on one is refused until a policy successor admits private
  sources (packet Q2). [Observed] Syzygy's own repository is public
  (`gh repo view`, 2026-11-08), so self-observation is inside the scope.
- **Whether a launch record is a "public-repository observation consent
  record"** in that policy's words. [Inferred] It is, when the operator
  declares the repository public: it is an observation consent whose subject
  is (`project:syzygy`, repository). The reader that implements the policy
  must accept the new record family; that is implementation (slice 2), and a
  reviewer should test the reading.
- **Commit practice.** Syzygy writes the record and never commits it.
  Whether the operator commits each record, and whether an uncommitted record
  may carry a run, is packet Q4.

## 6. Relation to the parked arbitrary-public-repo change

`openspec/changes/polaris-dossier-arbitrary-public-repo/` drafted one standing
consent for every public repository (REQ-037), which needed amendments to
`architecture.md`, RFC1-2, RFC1-3, RFC1-4, RFC3-6, RFC3-7 and RFC5-12. The
owner parked it (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md`,
item 3, answer C). This change takes the per-repository route that change's
packet Q0 offered as the alternative: the record stays per repository and
per revision, and only the ceremony moves to launch. It edits none of that
change's bytes. If both were ever adopted, a run would rest on whichever
record admits it; the later-adopted change states the precedence.

REQ-038 and REQ-039 (reconstructed motivations, comparisons) are untouched.

## 7. Implementation slices (after sign-off; not filed as beads)

1. **Revision resolver.** Trunk-tip resolution with no network request,
   refusal on a HEAD mismatch, and the launch output of REQ-047. Pure,
   tested against fixture clones.
2. **Launch-record family in the consent package.** Writer and reader for the
   observation consent and statement records, digest binding, the in-force
   check, revocation, and the decisions sweep's stem rule. The public-source
   scope reader accepts the family.
3. **The question.** Terminal-only prompt in `init` and, where REQ-040 is in
   force, `syzygy polaris`; exact confirmation; refusal paths; reuse of an
   in-force record; naming of revoked records.
4. **Write gate.** Refuse to record unless the write consent for Syzygy's own
   repository is in force and names the location; one new file per record,
   atomic, never an overwrite.
5. **Self-observation guard and disclosures.** The same-working-tree refusal,
   the run record and page disclosures, and the skill and agent texts that
   forbid answering.
6. **Conformance.** One conformance test per requirement, each scenario a
   case, expected values as literals; a rule-6 mutation pass over the
   refusal predicates.

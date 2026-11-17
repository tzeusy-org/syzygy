# D10 — retirements and supersessions

Every lower-level clause, act, direction or decision that requires an owner
act for something D10 makes agent-decided, with its fate. This file is bound
by the package manifest, so the owner's act adopts it as the register of what
D10 retires.

Fates:

- **Amended** or **retired** — the clause keeps its identifier and takes new
  text, or reads "Retired by GOVERNANCE-SIMPLIFICATION-D10", in a successor
  file under `proposed/` that the act installs.
- **Superseded** — from adoption, VIS-4's sentence "Lower rules follow this
  one" governs: an agent adoption satisfies the clause's owner act. The text
  is not edited here; the follow-on item named in `FOLLOW-ON.md` (F-n)
  rewrites it as ordinary agent work.
- **History** — a performed act record stays as it is. The gate it satisfied
  is no longer required, and the bytes it bound are not edited by D10.

"Bound" means the file's current sha256 is a row of a performed act's
manifest. [Observed: a Python scan of the 63 tracked `*MANIFEST*.txt` files
for each file's current sha256 and path, at the commit this package was built
on.] Under RFC3-16 as amended, a performed act's digest is history, not a
lock, so a superseded bound file may be rewritten by a later agent adoption.

## Why these four successor files, and no others

A successor is needed only where bound text states *who adopts what* or *the
consent classes*, because those clauses would otherwise contradict VIS-4 on
the day of adoption and RFC3-16 is itself the rule that locks bound bytes.
Four files carry that text:

| Successor (installed at the same path) | Bound by | Needed because |
|---|---|---|
| `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`, and its mirror under `contracts/candidates/rfcs/` | `ACTIVE-CONTRACT-MANIFEST.txt`; `contract-readability-restyle/CONTRACT-AMENDMENT-MANIFEST.txt` | RFC3-16 is the digest-bound act rule and the bound-bytes lock; it must change in the same act that ends it |
| `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`, and its mirror | `ACTIVE-CONTRACT-MANIFEST.txt`; `rfc5-project-documentation-class/CONTRACT-AMENDMENT-MANIFEST.txt` | RFC5-12 to RFC5-16 define the per-repository observation, per-provider egress and execution consent classes that SEC-2 and SEC-3 now drop |
| `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md` | `spec-policy-readability-restyle/SPEC-POLICY-AMENDMENT-MANIFEST.txt` | CC-SPEC-10 is the rule that specs are adopted by the owner at an exact digest |
| `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md` | the same manifest | CC-IMPACT-6 routes any lag to an owner act, and CC-IMPACT-7 pins a fixture by digest that "may not be edited" |

Behavioral specifications (PWB-REQ-005, REQ-polaris-generation-033 and -046,
CAP1-REQ-011) are left to follow-on work: they implement the consent model
but do not say who decides, and after D10 an agent may amend them.

## A. Amended or retired by the successor files

| Identifier | Where (today) | Bound | Fate |
|---|---|---|---|
| RFC3-15 install gates (`contracts/`, `policies/`, `decisions/` rows) | `RFC-0003/governance-homes-and-owner-acts.md`:78 | yes (above) | Amended: agent adoption; weakening the secret policy stays the owner's; the doctrine row is unchanged |
| RFC3-16 | same file:112 | yes | Amended: effective status is read from an adoption record (owner decision for an owner class, agent row otherwise) naming a commit; earlier acts and digests are history, not locks |
| RFC3-16(a) predicate and premise | same file | yes | Amended: honored at bytes with an adoption record; trust premise restated; the A1 state-(2) mechanism stays optional |
| RFC3-16(b) | same file | yes | Amended: binds a commit, not a typed phrase and digest; item 9 (A1 identity or its absence) retired |
| RFC3-16(c) | same file | yes | Amended by a note: the two provenance states describe acts before D10; later adoptions render `owner-decided` or `agent-adopted` |
| RFC5-12 | `RFC-0005/consent-egress-secrets.md`:95 | yes (above) | Amended: write consent only, for repositories the owner does not own; observation, egress and execution consent retired |
| RFC5-13 | same file:115 | yes | Amended by a note: governs revoking write consent and withdrawing a run's declared provider |
| RFC5-14 | same file:134 | yes | Amended: content leaves only for a provider declared for the run; the classification policy is agent-maintained, and letting matched or unclassifiable content out is the owner's |
| RFC5-15 | same file:199 | yes | Amended: a two-part choke point (declared provider; determinable and screened); the third part, a consent record carrying an owner act, retired |
| RFC5-16 | same file:249 | yes | Amended: the secret policy's owner-act requirement becomes "weakening is the owner's decision, other changes are agent adoptions"; a missing policy still blocks ingest |
| CC-SPEC-8 | `SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:266 | yes (above) | Amended: a reviewed N/A judgment is an agent adoption, or the owner's in an owner class |
| CC-SPEC-10 | same file:346 | yes | Amended: specs and spec versions are agent-adopted (log row and tag); owner only in the four classes |
| CC-IMPACT-1 to CC-IMPACT-4 | `SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`:74, 118, 145, 181 | yes (above) | Unchanged; agent-maintained under VIS-4 |
| CC-IMPACT-5 | same file:188 | yes | Amended: waits on the owner only in the four classes |
| CC-IMPACT-6 | same file:206 | yes | Amended: a spec may lag its shape change when the adoption row records it; no owner act or P-44 amendment needed |
| CC-IMPACT-7 | same file:242 | yes | Retired (the digest-pinned blind fixture run) |

## B. Superseded at adoption; text rewritten in follow-on work

| Identifier or record | Where | Bound | Fate |
|---|---|---|---|
| RFC5-18 and RFC5-18(c) (execution consent: an owner Decision approving a profile version) | `RFC-0005/execution-profiles.md`:91, :272 | yes (`ACTIVE-CONTRACT-MANIFEST.txt`) | Superseded: the profile is the agent's choice, recorded in the run's record (F-6) |
| Phase rules' owner N/A judgment: RFC1-33, RFC2-26, RFC3-33, RFC4-30, RFC5-27, RFC6-28, RFC7-38, RFC8-32, RFC9-52 | each RFC module, per `DIRECTIVE-REGISTER.md` | yes (`ACTIVE-CONTRACT-MANIFEST.txt`) | Superseded: an agent adoption records the judgment (CC-SPEC-8 as amended) (F-6) |
| RFC4-3 (observer identity and version are snapshot inputs) | `RFC-0004/general-contract.md`:100 | yes | Unchanged. It never required an owner act; the registry entry's owner act came from RFC3-16(a), now amended. The build records the reader's identity and version |
| CC-REV-1 (mandatory independent review classes) | `policies/craft-and-care/review-and-documentation.md`:16 | no | Kept as an engineering norm; "review before offering to the owner" has no owner to offer to outside the four classes (F-7) |
| CC-REV-2 owner route ("stops, routes to the owner") | same file:71, :75, :82 | no | Superseded: the agent resolves the contradiction and records it, except in an owner class. The doctrine carve-out (:99-103) stays (F-7) |
| CC-REV-4 ("Two failed review rounds … return to the owner") | same file:129, :139 | no | Superseded: no owner arbitration and no stopping rule; one independent review, fixes applied, the agent decides (F-7) |
| CC-REV-6 owner overrule | same file:161, :169-170 | no | Superseded: findings are still dispositioned; the owner overrules only in an owner class (F-7) |
| CC-SEC-2 (egress checked against the per-project consent record) | `policies/craft-and-care/security-and-secrets.md`:46 | no | Superseded: the code checks the run's declared provider and secret screening (F-7) |
| CC-SEC-3 (no execution outside an accepted profile) | same file:63 | no | Superseded by SEC-3 as amended (sandbox, or the owner's attended session, no per-run choice); P-117's conforming amendment is folded into F-7 |
| CC-SEC-4 (per-repository write consent before the first write) | same file:84 | no | Superseded: consent only for repositories the owner does not own (F-7) |
| NORMATIVE-CHANGE-WORKFLOW steps 3–5 and "An artifact edited after its act is, for the record, an artifact with no act" | `policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md`:73-104, :54-55 | no | Superseded: review is a norm, adoption is an agent row, a later edit is a new adoption (F-7) |
| SDR-37 (one coherent capability per OpenSpec change) | `decisions/SURFACE-DECISION-RECORD.md`:195; `SPECIFICATION-GRANULARITY-DECISION.md`:13, :86; `OPENSPEC-MULTI-CHANGE-DIRECTION.md`:20 | no | Superseded as an owner rule: change granularity is the agent's call (CC-SPEC-1's citation of it stays as guidance) |
| Scope A versioned sign-off, and its extensions | `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`:27-46; `OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md`; `OWNER-DIRECTION-SCOPE-A-CAP1-TRUSTED-BOOTSTRAP-CONSENT-2026-10-15.md` | no | Superseded: an agent adoption row replaces the owner's selection; version tags continue. The 27 sign-off records since 2026-10-01 are history |
| Review stopping rule | `OWNER-DIRECTION-REVIEW-STOPPING-RULE-2026-11-09.md` | no | Retired: "One review, not gating" (owner, 2026-11-17) |
| GP-Q0's owner route ("Behavior-preserving" means no change to a rendered byte, wire format, refusal string, exit code, signed artifact, or consent, security or retention decision) | `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:44-55 | no | Superseded: the agent fixes and reports behaviour changes; only a change that weakens secret detection or widens writes into other people's repositories or exposure stays with the owner. The PR review rule in the same direction stays as a norm |
| Separate drafting and implementation directions ("find the act") | `AGENTS.md`:27-28; e.g. `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`:42, :103, :143 and `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-IMPLEMENTATION-2026-11-12.md` | no | Superseded: an adoption authorizes its implementation; drafting needs no direction (F-8) |
| Implementation-authorization acts | `CAPABILITY-1-IMPLEMENTATION-AUTHORIZATION-ACT.md`, `PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md`, `PWB-IMPLEMENTATION-AUTHORIZATION-CONTINUATION-ACT.md`, `POLARIS-GENERATOR-IMPLEMENTATION-AUTHORIZATION-ACT.md` | digest acts | History; no future implementation needs one |
| No unattended agent coordination | `AGENTS.md`:103; `OWNER-DIRECTION-2026-10-03-OVERNIGHT-BEADS-LOOP.md`:31-34 ("this run only") | no | Retired: unattended loops are allowed; they report after (F-8) |
| CC-REV-2 lagging-specification exception decision (P-44) | `CC-REV-2-LAGGING-SPEC-EXCEPTION-DECISION.md` | no | Superseded by CC-IMPACT-6 as amended |

## C. Performed acts whose gate is no longer required (history)

All rows below are performed, digest-bound act records; D10 edits none of
them and none of the bytes they bound. [Observed: section headings in
`decisions/ACCEPTANCE-ACT-RECORD.md`, lines as cited.]

| Act class | Records | Fate |
|---|---|---|
| Screening-policy per-version chain (approve-policy) | `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md` and `-V2-` to `-V8-ACT.md` (record :1211, :1265, :1427, :1648, :1718, :1765, :1812, :1944); the Butlers policy acts `PWB-SECRET-CLASSIFICATION-POLICY-ACT.md`, `-AMENDMENT-ACT.md`, `-BEHAVIOR-CONTRACT-REPIN-ACT.md` | The chain ends. The policy at its current bytes is the adopted policy; later changes are agent adoptions unless they weaken detection or fail-closed classification (owner, SEC-5) |
| Observer registry acts (adopt-registry-entry) | `PWB-OBSERVER-REGISTRY-ENTRY-ACT.md`, `-ENTRY-AMENDMENT-`, `-CURRENCY-BRIEFING-AMENDMENT-`, `-BEHAVIOR-CONTRACT-REPIN-`, `-MACHINE-CEILING-ACT.md` (record :216, :303, :852, :1082, :1675); the public-git-source registry sign-offs v1.0 and v1.1 | No registry act is needed again; reader identity and version are engineering facts (RFC4-3). PWB-REQ-005 and REQ-033 follow in F-2 and F-4 |
| Observation consent | `PWB-BUTLERS-OBSERVATION-CONSENT-ACT.md` (:164); `PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md` (:1292) | Class retired (RFC5-12) |
| Agent-provider statements | `DOSSIER-LOCAL-AGENT-REDIS-AGENT-ANTHROPIC-ACT.md` (:1339); `DOSSIER-AGENT-PROVIDER-V2-REDIS-ANTHROPIC-ACT.md` (:1455) | Class retired; the run declares its provider (SEC-2, RFC5-14) |
| "In force" bind acts | `DOSSIER-LOCAL-AGENT-D9-IN-FORCE-ACT.md` (:1368); `DOSSIER-LOCAL-AGENT-RFC7-20-READING-IN-FORCE-ACT.md` (:1397) | No longer needed: an adoption is in force when committed (RFC3-16 as amended). D9 and the RFC7-20 reading stay in force as adopted |
| Launch-record write consent | `LAUNCH-CONSENT-WRITE-CONSENT-ACT.md` (:1895) | Class retired for Syzygy's own repository (SEC-4) |
| Contract and craft amendment acts | Waves A and B, acts 6 and 7, the general trusted-bootstrap transaction, the readability restyles, `RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md` | History; later contract and craft changes are agent adoptions |

Prepared but unperformed offerings are withdrawn, not performed: the
no-evidence drawer statement for redis-redis and the OpenAI provider
statement (`check_governance.py` registers their phrases; no act record
exists among the 48 `*-ACT.md` files in `decisions/` [Observed]), and the
unperformed candidate packages `public-admission-registry-entries/`,
`provider-route-messages-api-entry/` and `public-egress-v2/` [Observed: 0
mentions of the three directory names in `ACCEPTANCE-ACT-RECORD.md`]. Of the foundational
acts never performed (`FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md`
rows 2–5), CC-TEST-2, topology and the project overview become agent
adoptions; D3 (bounded mission) amends doctrine and stays with the owner.

## D. Behavioral specifications (follow-on agent adoptions)

Not digest-bound unless stated; each is version-signed or adopted. Their
owner-act requirements are superseded at adoption by VIS-4; the code keeps
enforcing them until the follow-on changes land.

| Requirement | Where | Bound | What goes | Follow-on |
|---|---|---|---|---|
| REQ-polaris-generation-033 (operator-agent mode) | `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`:7 (rules :9-13) | no | HEAD must equal a consented revision; registry entry, policy and provider-statement acts; drawer statement; D9 and RFC7-20 bind acts | F-1 |
| REQ-polaris-generation-046 (launch-time consent) | `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`:7 | no | TTY-only typed phrase per record; per-revision consent; the write-consent act; refusal of non-public repositories | F-1 |
| Public-git-source acquisition (registry entry, local-agent) | `contracts/candidates/public-git-source-acquisition-local-agent-v1-1/` | no | Registry sign-off as the source-acquisition gate | F-1 |
| PWB-REQ-005 (consent and policy authority precede every body read) | `openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md`:636 | yes (`pwb-opening-index-amendment` manifest) | The three owner acts (consent, policy, registry) | F-2 |
| CAP1-REQ-011 (consent is a visible recorded fact) | `openspec/changes/project-registration-and-honest-shape-visibility/specs/project-registration-and-honest-shape-visibility/spec.md`:359 | yes (`capability-1-readability-successor` manifest) | Observation consent as a registration precondition; write consent stays | F-2 |

## E. AGENTS.md hard prohibitions (follow-on F-8)

`AGENTS.md` is not bound. Its lines that encode retired gates: :27-28 ("find
the act"); :86-88 (no body read without per-repository consent and registry
and policy acts); :91-93 (never run or answer a consent command; only the
owner, in person at a terminal); :98 (never edit an artifact after an act has
bound its digest); :99-100 (one coherent category per change; never commit a
normative artifact while its gate is unresolved); :101-102 (escalation
triggers needing a new owner act); :103 (no unattended coordination); and in
the notes, :219 (behaviour changes go to the owner, GP-Q0) and :225-232 (the
consent reader not changed without the owner). Each is superseded at
adoption and rewritten by F-8.

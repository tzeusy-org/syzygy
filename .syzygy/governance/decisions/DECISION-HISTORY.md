# Decision history — resolved rows and register chronology

> **Historical record, deliberately off the default path.** This file holds
> what the pending register used to carry inline: the resolved-row
> narratives and the register's own as-of chronology. Nothing here is open,
> and nothing here is authority — every ruling below names the record that
> owns it, and that record wins. The live queue is
> [`PENDING-OWNER-DECISIONS.md`](PENDING-OWNER-DECISIONS.md).
>
> Moved here 2026-08-17 (convergence pass, round 2026-08i). The register's
> pre-refactor row narratives — including the long accumulated open-row
> cells — are preserved verbatim in git history at commit `9c43fc5`
> (`git show 9c43fc5:.syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md`).

## Triaged on 2026-11-21 (D10 FOLLOW-ON F-10: all 34 rows leave the owner register)

Under doctrine VIS-4 as amended by D10 the owner decides four classes only.
F-10 (`syzygy-k54o.10`) triaged every row of `PENDING-OWNER-DECISIONS.md`;
agent adoption A-13 in `AGENT-ADOPTIONS.md` records it, open to the owner's
veto. "Kept deferred" and "agent-class" are agent decisions, reversible by a
later adoption; "not adopted by this triage" means the package still waits
for an agent to adopt it after one review, or to withdraw it. The rows as
they stood are at commit `9e919a293`
(`git show 9e919a293:.syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md`).
P-5 and P-101 left earlier the same day (section below).

| # | Disposition |
|---|---|
| P-1 | The two launch-path wave acts were performed 2026-08-17; Waves C1/C2/D1/D2 stay **deferred by agent decision** (no mission work is planned; taking one up is a new adoption) |
| P-2 | CC-TEST-2: the owner's 2026-11-03 hold stands as decided; taking it up is an agent adoption, reported |
| P-3 | Topology bundle: as P-2 |
| P-4 | Project overview: as P-2 |
| P-12 | Knowledge-hygiene policy: as P-2 |
| P-10 | Routing-matrix confirming review: the owner's 2026-09-27 knowing deferral stands; RFC-0010 is deferred-wave material |
| P-15 | **Decided: no compact FD register here.** The founder decision log stays founder-local; the two extracted warrants are enough. Reversible by adoption |
| P-17 | Eight undefined public terms: kept deferred with the waves that define them |
| P-19 | Mission-envelope residuals: kept deferred with the D waves |
| P-20 | Fixture-set acceptance posture: kept deferred with P-29 |
| P-21 | `constrains:` arm (a): kept deferred with Wave C2, its consumer |
| P-23 | Mission-safety stage placement: kept deferred with the D waves |
| P-27 | RFC10-18 correction-plane defects: kept deferred with the D waves |
| P-29 | Wave C2 acceptance criterion: kept deferred with Wave C2 |
| P-30 | Stop/containment repair form: kept deferred with the D waves |
| P-32 | RFC11-15 ownership metadata: kept deferred with Wave C2 |
| P-43 | **Decided:** under D10 a made owner decision is a dated record in this directory that quotes the owner's words (an `OWNER-DIRECTION-*`, sign-off or act record), and a made agent decision is a row in `AGENT-ADOPTIONS.md`; no further marker. Spec-policy follow-up stays in `syzygy-4x77` |
| P-52 | POC test-coverage gaps: ordinary engineering backlog, tracked in `syzygy-k0np`, `syzygy-u05.13` and `syzygy-dov.16` |
| P-84 | Identity amendment: agent-class (adopt after one review, or withdraw); its open questions ride `syzygy-vk3f`. Not adopted by this triage |
| P-85 | Release-label amendment: agent-class; tracked in `syzygy-7yad`. Not adopted by this triage |
| P-95 | Behaviour-contract re-pin: agent-class; its gate effect is folded into FOLLOW-ON F-2 (`syzygy-k54o.2`), the re-derivation in `syzygy-fxro`. Not adopted by this triage |
| P-112 | Loaded-profile registry entry: agent-class; tracked in `syzygy-dov.24`. Not adopted by this triage |
| P-111 | Local CLI runner: Q1 (sign-off) is agent-class, tracked in `syzygy-bc0g`. Q2 (unscreened content to the provider) is owner-class and was answered 2026-11-21 (`secrets-raw-clone-to-provider`, A); its doctrine text is P-119 below |
| P-117 | CC-SEC-3 amendment: folded into CC-SEC-3 by agent adoption A-12 (2026-11-21). Credential-probe work that only tightens isolation is agent-class; anything letting observed code outside a sandbox reach a credential returns to the owner |
| P-118 | Launch-time consent: retired by D10 (reading needs no consent record); the candidate binds nothing and is not offered |
| P-53 | Already resolved 2026-09-15; row removed |
| P-104 | Already resolved 2026-10-07; row removed |
| P-105 | Already resolved 2026-10-08; row removed |
| P-106 | Already resolved 2026-10-08; row removed |
| P-107 | Already resolved 2026-10-14; row removed |
| P-110 | Already performed 2026-10-20; row removed |
| P-114 | Already performed 2026-10-20; row removed |
| P-115 | Already performed 2026-10-27; row removed |
| P-116 | Already performed 2026-11-03; row removed |

## Resolved on 2026-11-21 (P-120 — the owner lists Butlers as owned)

The owner wrote the row in [`OWNED-REPOSITORIES.md`](OWNED-REPOSITORIES.md)
in commit `c62d4cf79` ("I own butlers"; the row quotes "I own the butlers
repo"), naming `https://github.com/tzeusy-org/butlers`. Under SEC-4 Syzygy
now writes and pushes there without a per-repository consent.
The row as it stood in the register:

| # | Decision | Class | Owning record |
|---|---|---|---|
| P-120 | Add Butlers to [`OWNED-REPOSITORIES.md`](OWNED-REPOSITORIES.md): the owner chose this on 2026-11-21 (`owned-repos-butlers`, A); the row takes effect when the owner writes it, naming the remote. No agent edits that list | writes into repositories | [`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md`](OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md) |

## Resolved on 2026-11-21 (P-119 — doctrine amendment D11 adopted)

The owner adopted D11 in the Claude Code CLI on 2026-11-21, in the owner's
words: "Adopt D11". The five edits are applied to `doctrine/security.md`;
the record is row D11 of [`DOCTRINE-AMENDMENT-LOG.md`](DOCTRINE-AMENDMENT-LOG.md).
The row as it stood in the register:

| # | Decision | Class | Owning record |
|---|---|---|---|
| P-119 | Doctrine amendment **D11**: an agent session's own raw reads may reach the run's declared provider unscreened, disclosed on every run page; everything Syzygy itself sends, keeps or renders stays screened. It writes the owner's 2026-11-21 answer A on `secrets-raw-clone-to-provider` into SEC-2 and SEC-5. Adopt, amend or decline; until adopted, SEC-2 and SEC-5 stand as written | doctrine; secrets | `../contracts/candidates/doctrine-amendment-session-raw-reads-d11/PROPOSAL.md`; [`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md`](OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md) |

## Resolved on 2026-11-21 (P-5 and P-101 — doctrine amendments D3 and D7 withdrawn)

The owner answered the D10 F-10 questionnaire on 2026-11-21 through its
token-gated local web form, with an explicit instruction to apply the answers
now. Two of its seven items withdrew held doctrine amendments, each "as
superseded by D10": D10 rewrote the `vision.md` and `architecture.md` text
both anchor to, and removed the VIS-4 bounds they argued against. No doctrine
byte changes. Record: [`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md`](OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md).
The rows as they stood in the register:

| # | Decision | Owning record |
|---|---|---|
| P-5 | **Optional act 5** — adopt, amend, or decline the D3 bounded-mission doctrine amendment. **P-24 (D4) was ruled 2026-08-18: inside VIS-4's bounds, with the reviewer's §1.2 wording designated for act 5** (`D4-RULING-DECISION.md`) — a D3 rev2 carrying that wording, plus the VIS-3 fresh-reader review D3 §5 requires, precede the act *(Marked 2026-11-03: knowingly held. In the owner questionnaire you answered "A. Knowingly hold all five" for acts 2–5 and P-12; this records hold status only, and nothing is performed or declined (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md`).)* | `../contracts/candidates/DOCTRINE-AMENDMENT-BOUNDED-MISSION-D3.md` (rev1); `D4-RULING-DECISION.md` |

| # | Decision | Type | Blocks / earliest gate | Owning record |
|---|---|---|---|---|
| P-101 | Held derived computation, doctrine amendment D7 (`syzygy-u05.14`, vision pursuit move N14, "packet A, the molding half"): a closed class — observe, compute the difference from the last identified evaluation, stage a draft, hold — may run on a human act that did not request it, or on a hand-installed hook that fires only on human acts; never on a clock or watcher Syzygy owns; never notify, dispatch or reprioritize work, adopt, or set its own next trigger; never hold model output; relaxes no contract. Q1: inside or beyond VIS-4's stated bounds (the drafter recommends inside; "beyond" needs an adjudication RFC first and removes arm B). Q2: A adopt the two insertions (`vision.md` "Not autonomous" bullet, `architecture.md` loop paragraph), B an interpretation act with no doctrine byte (which would rule the change Clarifying, against the packet's Normative class), or C no change. Q3: strict hook test or installation-authorizes. Q4: entry criteria for the live fleet mandate on a roadmap or in `v1.md`. Q5 (added 2026-10-14, answered second): which reading of RFC2's merge-fact confinement arm A is adopted against — N narrow (recommended; RFC2-18's scope, the merge of a materialized work item, so arm A makes unprompted re-observation of a repository with no materialized merged work lawful at the doctrine level), W wide (any merge in a repository's history, so it does not), or narrow D7's own text (redraft). [Inferred] Accepted RFC2 confines every evaluation that captures a merge fact to a deliberately triggered pass, so D7 alone does not make unprompted re-observation of a repository with merges lawful *(marked 2026-10-14: true only on the wide reading; see Q5 and packet §4.1)*; the Butlers-side hook and the regeneration rehearsal are owner options and packet obligations only, nothing installed or run. Round 1 (2026-10-03) was `REVISE`; every finding was repaired once (`ROUND-1-DISPOSITIONS.md` beside the packet). Round 2 over the repaired bytes (2026-10-14, on your direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md`; `docs/reviews/R-DOCTRINE-AMENDMENT-D7-2-RAW.md`) was `REVISE`: one revise finding (the packet reads RFC2's "merge fact" as any merge in history, where RFC2-18 scopes it to a materialized work item reaching merge, so what arm A leaves unlawful may be overstated) and seven notes, all open (`ROUND-2-DISPOSITIONS.md`). Under the stopping rule the package is **not repaired again**, and the bytes are **unconfirmed** *(marked 2026-10-14, later the same day: "all open" and "not repaired again" are no longer true — on your further direction that day, relayed by the lead session, every round-2 finding, notes included, was repaired once; mapping in `ROUND-2-DISPOSITIONS.md` §"Repairs, 2026-10-14 (cycle 2)")*. **Round-2 findings repaired once on 2026-10-14, unconfirmed pending round 3** (brief: `REVIEW-BRIEF.md` §"Round 3"; a notes-only round clears, a `REVISE` comes back to you). The repair added Q5. *(Marked 2026-10-14, round 3: "unconfirmed pending round 3" is no longer true. Round 3 over the repaired bytes (`docs/reviews/R-DOCTRINE-AMENDMENT-D7-3-RAW.md`, at `7071a744`) was `REVISE`: one revise-level finding (Q5 states its arms' consequences inconsistently — arm W carries an [Unknown] on whether a plain owner ruling can fix the reading of accepted RFC2 text, arm N says "No further step", and §4, §6 item 1 and the ledger say three different things) and five notes, all open in `ROUND-3-DISPOSITIONS.md`. Under the stopping rule in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md` the package is **not repaired again**, no round 4 is dispatched, and the bytes are **unconfirmed**. Q1–Q5 stand; no ruling is recorded.)* *(Marked 2026-10-14, cycle 3: "not repaired again" and "no round 4" are no longer true. On your cycle-3 direction that day, relayed by the lead session — "One more cycle": make Q5 consistent, choosing a reading of accepted text being a contract-act matter (Unknown otherwise), align §4/§6 and the ledger, then one fresh review — every round-3 finding, notes included, was **repaired once on 2026-10-14, unconfirmed pending round 4** (`ROUND-3-DISPOSITIONS.md` §"Repairs, 2026-10-14 (cycle 3)"; brief `REVIEW-BRIEF.md` §"Round 4"). Q5's description above is superseded: Q5 now asks how the reading is to be fixed — U leave it to a contract act and fix none here (recommended; for a repository with merges but no materialized merged work, lawfulness stays [Unknown]), K commission a contract act carrying a named reading (form [Unknown], not drafted), or narrow D7's own text — because N and W were both a choice of reading a plain answer cannot make. §4.1 also weighs a broadest reading built from RFC4's citations of RFC2-19. **Q6 added:** how to resolve the Polaris understanding adoption recorder's gate, which D7's `vision.md` insertion trips (probe at `7460aec8`; shared with P-102's Q-A1); D7's ledger had called that recorder "unaffected". Section 1's doctrine bytes are unchanged. No ruling is recorded.)* *(Marked 2026-10-15, round 4: "unconfirmed pending round 4" is no longer true, and the cycle-3 direction "relayed by the lead session" is now recorded in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`. Round 4 over the repaired bytes (`docs/reviews/R-DOCTRINE-AMENDMENT-D7-4-RAW.md`, at `79f51fdf`) was `REVISE`: one revise-level finding (the one-position rule — which reading binds is fixed only by a contract act, [Unknown] until then — is applied to the narrow and wide readings but not to the broadest one built from RFC4's citations of RFC2-19, so the no-merge row is stated three ways) and four notes, all open in `ROUND-4-DISPOSITIONS.md`. After round 4 you answered "Park until RFC2 decided": **the packet is parked** (a dated banner heads it), an RFC2-18/19 contract clarification draft fixing which reading binds is commissioned (`syzygy-a4ry`), and D7 is redrafted against it (`syzygy-xhh2`, blocked by `syzygy-a4ry`). Q1–Q6 are not offered while parked; nothing is ruled.)* | doctrine amendment: owner adoption (VIS-4), no phrase | the molding half of the north star; any unprompted cadence slice; N2's hook option (also needs a write act, and an RFC2 amendment on the wide reading) *(marked 2026-10-15: "an RFC2 amendment on the wide reading" is superseded — which reading binds is a contract-act matter, [Unknown] until the commissioned RFC2-18/19 clarification, `syzygy-a4ry`, is acted on)* | `contracts/candidates/doctrine-amendment-held-derived-computation-d7/OWNER-DECISION-PACKET.md`; `ROUND-1-DISPOSITIONS.md` to `ROUND-4-DISPOSITIONS.md` beside it |

## Resolved on 2026-10-21 (P-79 follow-ups, and P-108's implementation)

The owner answered an adversarially-reviewed questionnaire on 2026-10-21
through its token-gated local web form, with an explicit instruction to apply
the answers now. Three of its four items rule on rows resolved earlier. No row
is open in `PENDING-OWNER-DECISIONS.md` for any of them: P-79 and P-108 left
the register when they were ruled and signed, so these entries are added here
and no row is added there. The fourth item confirmed
`OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-20.md`, through the
confirmation line in that record.

| # | What happened |
|---|---|
| P-79 (retained record layout) | **Ruled — A**: the retained evaluation record may carry one added top-level key, `claimStates`, holding only claim identity, epistemic tuple and challenge state; the six keys and four `evaluation` members stay. Record: [`POLARIS-RETAINED-EVALUATIONS-CLAIM-STATES-RULING-2026-10-21.md`](POLARIS-RETAINED-EVALUATIONS-CLAIM-STATES-RULING-2026-10-21.md). Bead `syzygy-dov.12.1` |
| P-79 (dismissal Q2 and Q7) | **Ruled — A**: no home for dismissal records for now; keeping a dismissal readable from a retained evaluation is a retention change, and none is made now, so the retained re-read limb stays unbuilt. Record: [`PWB-DISMISSAL-RECORDS-AND-RETENTION-RULING-2026-10-21.md`](PWB-DISMISSAL-RECORDS-AND-RETENTION-RULING-2026-10-21.md). Bead `syzygy-dov.12.3` |
| P-108 (implementation) | **Authorized — A**: exactly the signed text through M9 slices 4a, 4b and 8, with one acceptance condition on the marker populations; slices 5, 6b and 7 excluded. Record: [`OWNER-DIRECTION-P108-IMPLEMENTATION-2026-10-21.md`](OWNER-DIRECTION-P108-IMPLEMENTATION-2026-10-21.md) |

## Resolved on 2026-10-15 (P-108 signed v1.0; P-109 adopted v1.0, with implementation authorized)

The owner answered one multi-select structured question in the lead Claude
Code session on 2026-10-15, "Which cleared packets do you sign or adopt now?
(Unticked items wait.)", selecting "Sign P-108 v1.0", "Adopt P-109 v1.0" and
"Authorize P-109 impl" [Observed: as relayed by the lead session; quoted in
full in `OWNER-DIRECTION-SCOPE-A-CAP1-TRUSTED-BOOTSTRAP-CONSENT-2026-10-15.md`].
"Perform P-112 now" was not selected; P-112 stays in the register, marked.

| # | What happened |
|---|---|
| P-108 | **Signed v1.0** by version tag under the 2026-10-14 POC extension of Scope A (tag `three-surface-poc-vocabulary-epistemic-amendment-v1.0`). Record: [`THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md`](THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md). Q2 answered by signing with its recommended arm, "Marked renderings only". The seven round-2 notes are in the sibling `ROUND-2-DISPOSITIONS.md`. Note 13 (a zero marker population passes both rendering limbs) is the follow-up amendment bead `syzygy-nw3o`, as the owner's option named. D1–D4 were not asked and stay open (bead `syzygy-vk3f`). **Implementation is not authorized**: it needs its own implementation authorization. *Note 11, marked here because the cleared package is not edited:* the package's sentences saying the owner's two 2026-10-14 directions are "not recorded under `decisions/`" (`SEMANTIC-DELTA.md`; the packet's D4) and the packet's "unconfirmed pending round 2" are no longer true as of 2026-10-15: both directions are in `OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`, and round 2 cleared the bytes. |
| P-109 | **Adopted v1.0** by version tag under Scope A, extended to this one package by `OWNER-DIRECTION-SCOPE-A-CAP1-TRUSTED-BOOTSTRAP-CONSENT-2026-10-15.md` (tag `cap1-trusted-bootstrap-consent-v1.0`; Q1 adopt, Q2 "Extend Scope A to this package alone"). Record: [`CAP1-TRUSTED-BOOTSTRAP-CONSENT-SIGNOFF-v1.0.md`](CAP1-TRUSTED-BOOTSTRAP-CONSENT-SIGNOFF-v1.0.md). It fully replaces CAP1-REQ-011 and CAP1-REQ-046 as an overlay; the change's generated `ADOPTION.md` states the composition and supersedes the predecessor coverage surfaces round-4 note 1 names. Round-4 note 2 stays a known gap (`syzygy-0v4l`, a v1.1). Q3 answered: bounded implementation authorized by `OWNER-DIRECTION-CAP1-CONSENT-IMPLEMENTATION-2026-10-15.md` (`syzygy-u2a.2` then `.6`–`.9`). |

The rows as they stood in the register:

| # | Decision | Type | Blocks / earliest gate | Owning record |
|---|---|---|---|---|
| P-108 | Three-Surface POC vocabulary and epistemic-record amendment, the narrower redraft of P-84 on your 2026-10-14 direction ("Park, redraft narrower"): **POC-REQ-055** (every relationship carries an RFC1-25 name in a role pair the table assigns it, or an outside-closed-vocabulary flag with a reason; none of today's nine complies) and the **POC-REQ-060** amendment (Observed, Inferred and Unknown in one record shape on every entity and relationship; Inferred only from an agent's assertion, with no production constructor). It carries P-75 (A)'s Q2, Q3 and Q4; the signed RFC1-26 closure row is kept byte for byte, and RFC2-25 moves from Part B2 to Part A. Q1: sign v1.0, decline, or revise. Route: version tag under Scope A through `OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md` item 1, so no route question. Deferred scope, each with an owner question in the packet: D1 the subject identity requirement (POC-REQ-054), with evidence first recommended; D2 the ribbon, with the identity package recommended; D3 which M9 slices this sign-off makes eligible (4a, 4b and 8 recommended); D4 whether to record the narrowing of P-75 Q1 as a direction. The findings census over P-84's 43 findings is in its `SEMANTIC-DELTA.md`. **Pending sign-off; no review yet**: round 1 is briefed in `REVIEW-BRIEF.md` under a one-round stopping rule, and this version is not offered until a round clears it. *(Marked 2026-10-15: "no review yet" is no longer true. Round 1 (docs/reviews/R-M9-POC-VOCABULARY-EPISTEMIC-AMENDMENT-1-RAW.md, at `6d3923f3`) was `REVISE`: two revise findings (1, RFC2-25's Semantics column listed as an Unknown limb for one tier only; 2, the rendering limbs of POC-REQ-055 and POC-REQ-060 quantified over "every rendering" with no population or denominator) and seven notes (3–9). On your direction of 2026-10-15, "One cycle" [Observed: as relayed by the lead session; not recorded under `decisions/`] *(marked 2026-10-15: now recorded in `OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`)*, round-1 findings repaired once on 2026-10-15, unconfirmed pending round 2, notes included, mapped in `ROUND-1-DISPOSITIONS.md` "Repairs, 2026-10-15"; round 2 is briefed in `REVIEW-BRIEF.md` §"Round 2" under the same stopping rule and not yet run. A notes-only round 2 clears; a `REVISE` comes back to you with no further repair. One owner question was added, Q2: which renderings must show the flag and the Inferred encoding (marked renderings only recommended, and carried by this version). No ruling is recorded; Q1, Q2 and D1–D4 are open. Still not offered for sign-off.)* *(Marked 2026-10-15, round 2: "unconfirmed pending round 2", "not yet run" and "Still not offered for sign-off" are no longer true. Round 2 (docs/reviews/R-M9-POC-VOCABULARY-EPISTEMIC-AMENDMENT-2-RAW.md, at `a4a864e6`) was `CONFIRM WITH EXCEPTIONS` (raw line 4): seven notes (10–16), no revise. Under the round-2 stopping rule that **clears the exact bytes it read**; the notes are classified in `ROUND-2-DISPOSITIONS.md` and the package is not edited. **This version is ready for your Q1 (sign v1.0, decline, or revise)**, by version tag under Scope A; nothing is signed. Two notes for you to see first: note 11, the delta and the packet's D4 still say your two directions are not recorded under `decisions/`, though `OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md` now records both, and the packet's own status paragraph still reads "unconfirmed pending round 2" (left unedited because the cleared package is not edited); note 13, bearing on Q2, an empty or implementation-chosen marker population passes both rendering limbs at a reported zero, so with no declared markers those limbs decide nothing. Q1, Q2 and D1–D4 stay open.)* | specification sign-off (Scope A, POC extension) | M9 slices 4a, 4b and 8 (D3); roadmap D7 | `contracts/candidates/three-surface-poc-vocabulary-epistemic-amendment/OWNER-DECISION-PACKET.md`; `ROUND-1-DISPOSITIONS.md` and `ROUND-2-DISPOSITIONS.md` beside it |
| P-109 | Capability 1 trusted-bootstrap consent amendment (`syzygy-u2a.1`). The candidate `openspec/changes/cap1-trusted-bootstrap-consent/` fully replaces **CAP1-REQ-011** and **CAP1-REQ-046**. A consent act you perform that explicitly selects RFC3-16(a) state (1) admits observation of exactly that repository without an audit service. Every invalid act state fails closed before any dependent read. Both channels disclose "owner-adopted (bootstrap, uncorrelated)". The cost: bootstrap trusts your recorded tree, and a byte-identical forgery is undetectable, though still unauthorized. It was rebased onto main on 2026-10-15; only predecessor digests moved, and no requirement changed. Review 3 was `REVISE` (`docs/reviews/R-CAP1-TRUSTED-BOOTSTRAP-CONSENT-3-RAW.md` line 4). It had one revise finding, a false sentence in the rebase record, which was repaired once. Its one owner note is in the packet. **Repaired bytes unreviewed.** *(Marked 2026-10-15: no longer true. Round 4 `CONFIRM WITH EXCEPTIONS`, notes only (`docs/reviews/R-CAP1-TRUSTED-BOOTSTRAP-CONSENT-4-RAW.md` line 4), over the repaired bytes on main at `6ff75567`; under the stopping rule that clears them. Two owner notes are in `R-CAP1-TRUSTED-BOOTSTRAP-CONSENT-4-DISPOSITION.md`: the coverage surfaces adoption must supersede are wider than one row and the totals, and CAP1-REQ-046's refusal disclosure does not on its own require the refused artifact's identity. The lead took Q1's confirmation-round arm as a process step. **Owner-ready: v1.0 is now offered**; no ruling is recorded, and Q1's sign-off, Q2 and Q3 are open.)* The questions: Q1, order a confirmation round and then adopt v1.0 (recommended), adopt now, decline or revise; Q2, the route, either extend Scope A to this package (recommended) or phrase and digest; Q3, separately authorize the bounded consent implementation slice, or not yet. | specification adoption, then implementation authorization | `syzygy-u2a.1`, then `syzygy-u2a.2` and `.6`–`.9` (CAP1 snapshot, coverage and discoverability) | [`CAP1-TRUSTED-BOOTSTRAP-CONSENT-OWNER-DECISION-PACKET.md`](CAP1-TRUSTED-BOOTSTRAP-CONSENT-OWNER-DECISION-PACKET.md) |

## Resolved on 2026-10-15 (P-102 — doctrine amendment D8)

The owner adopted three of doctrine amendment D8's six clauses on
2026-10-15 in the lead Claude Code session, by structured questions, after
the package's round-4 fresh-context review
(docs/reviews/R-DOCTRINE-AMENDMENT-D8-4-RAW.md) returned `CONFIRM WITH
EXCEPTIONS` with notes only and cleared the bytes. Adopted: (b) the
attributed owner answer, (d) the observed-only project and (e)
self-observation; declined: (a) synthesis, (c) correspondence and (f)
figures. (b), (d1) and (e) are applied. **(d2), the `vision.md` half of (d),
is adopted and not yet applied:** the owner answered Q-A1 "Fresh
reconciliation review", so it lands only with a fresh reconciliation review
over the amended `vision.md`
([`DOCTRINE-AMENDMENT-D8-D2-RECONCILIATION-BRIEF.md`](../contracts/candidates/DOCTRINE-AMENDMENT-D8-D2-RECONCILIATION-BRIEF.md)
says what that needs). The owner's selected option texts, the deferred
questions (Q-D1, Q-S1, Q-S2) and the bytes applied are in the `D8` row of
[`DOCTRINE-AMENDMENT-LOG.md`](DOCTRINE-AMENDMENT-LOG.md). Package:
`../contracts/candidates/doctrine-amendment-inferred-first-class-d8/`. The
row as it stood in the register:

| # | Decision | Type | Blocks / earliest gate | Owning record |
|---|---|---|---|---|
| P-102 | Inferred as a first-class rendered state, doctrine amendment D8 (`syzygy-u05.15`, vision pursuit move N15, "packet B", batched with D7/P-101): six clauses, each with a no-change arm. Q1 (a) synthesis renders Inferred and Q3 (c) correspondence renders Inferred with challenge authority only: recommended **decline**, since `trust-and-evidence.md` and accepted RFC7-2/RFC1-16/RFC4-26 already permit both; their blockers are below doctrine *(marked 2026-10-14, round 3: this is Q1's pre-repair rationale. After the round-2 finding-2 repair the packet's reason for declining (a) is that accepted RFC7-20 already decides the rendering on Polaris, as an `editorial-draft`, not an Inferred claim; Q-C3 asks whether that should change. Round-3 raw note 5)*. Q2 (b) the attributed owner answer, neither evidence nor a warrant, Observed only as a fact about the record, never in place of an Unknown: recommended adopt. Q4 (d) the observed-only project and a second VIS-6 destination, the observing project's `.syzygy/**`: recommended adopt, as a trade-off against P-71-Q5's act route into the observed project. Q5 (e) self-observation never self-certifies Syzygy's alignment, convergence, genome-completeness or release verdict: recommended adopt, before any P-74 Q3 act *(marked 2026-10-14: "or release verdict" is no longer in the clause; repaired (e) sits beside the status-claim triggers, keeps evidence for all four floor properties open to this subject, adds no floor property, and Q5 gains a fifth-floor-bullet arm)*. Q6 (f) machine-drafted presentation is an `editorial-draft`: recommended decline. Below doctrine, asked not drafted: Q-C1 commission the inference profile; Q-C2 whether (d) needs the portfolio profile (SDR-30) first; Q-S1 a PWB synthesis copy role; Q-S2 POC class (ii) correspondences; Q-A1 how to resolve the Polaris understanding adoption recorder gate that any `vision.md` edit trips (shared with D7). [Inferred] Nothing adopts, writes or builds anything. Round 1 (2026-10-03) was `REVISE`; every finding was repaired once. Round 2 over the repaired bytes (2026-10-14, on your direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md`; `docs/reviews/R-DOCTRINE-AMENDMENT-D8-2-RAW.md`) was `REVISE`: three revise findings (clause (e)'s "release verdict" denial pulls against the trust floor; clause (a) collides with accepted RFC7-20, unnamed; the ledger still quotes (e)'s pre-repair trigger) and nine notes, all open. Under the stopping rule the package is **not repaired again**, and the bytes are **unconfirmed**. *(Marked 2026-10-14, later the same day: "not repaired again" and "all open" are superseded. On your direction in the lead session that day, one more cycle: all twelve round-2 findings were **repaired once on 2026-10-14, unconfirmed pending round 3**, mapped in `ROUND-2-DISPOSITIONS.md` "Repairs, 2026-10-14 (cycle 2)"; round 3 is briefed in `REVIEW-BRIEF.md` §"Round 3" and not yet run. Two owner questions were added: Q-C3, whether a Polaris synthesis should ever be an Inferred claim rather than RFC7-20's `editorial-draft` (an RFC 0007 amendment, not drafted); Q-D1, what happens on offboarding to records (d2) places about an observed-only project. No ruling is recorded.)* *(Marked 2026-10-14, round 3: "unconfirmed pending round 3" and "round 3 … not yet run" are no longer true. Round 3 over the repaired bytes (`docs/reviews/R-DOCTRINE-AMENDMENT-D8-3-RAW.md`, at `b913d1ef`) was `REVISE`: one revise-level finding (under the packet's own reading of "the governed plane", a (d2) dismissal placed in the observing project's tree either never takes effect or is the violation VIS-6 names, and the packet does not say which) and four notes, all open in `ROUND-3-DISPOSITIONS.md`. Under the stopping rule in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md` the package is **not repaired again**, no round 4 is dispatched, and the bytes are **unconfirmed**. No ruling is recorded.)* *(Marked 2026-10-14, cycle 3: "not repaired again" and "no round 4" are no longer true. On your cycle-3 direction that day, relayed by the lead session — "Drop dismissal from (d2)": dismissals of an observed-only project's gaps can't live in the observing project's tree, so VIS-6 stays intact; then one more cycle — the dismissal was dropped from (d2) and every round-3 finding, notes included, was **repaired once on 2026-10-14, unconfirmed pending round 4** (`ROUND-3-DISPOSITIONS.md` §"Repairs, 2026-10-14 (cycle 3)"; brief `REVIEW-BRIEF.md` §"Round 4"). (d2) now lists a promoted annotation and an attributed answer, says such a record never suppresses the project's gap, and says a dismissal of that gap takes effect only in the project's own plane and waits for an act naming that write. Clause (e), asked as Q5, is now headed "Self-observation never certifies Syzygy's own alignment" and cites no rule; Q5 gains an arm widening the denial to every status-claim trigger about Syzygy (not drafted). Clause (a) now reads "no claim while it stays one". No ruling is recorded.)* | doctrine amendment: owner adoption (VIS-4), no phrase | Inferred synthesis and correspondence on the surfaces (also need the inference profile and spec amendments); any write about an observed-only project (also needs its own act); applying (d2) also needs Q-A1 | `contracts/candidates/doctrine-amendment-inferred-first-class-d8/OWNER-DECISION-PACKET.md`; `ROUND-1-DISPOSITIONS.md` to `ROUND-3-DISPOSITIONS.md` beside it |

## Resolved on 2026-10-15 (P-98 — the opening-index amendment signed v1.0)

The owner answered P-98's Q1–Q12 and "Carry if review clears" after round 4
cleared its bytes, by structured questions in the lead Claude Code session
(recorded in
[`OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`](OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md)).
The P-99 sign-off then moved PWB `spec.md`, and the package was regenerated
over it (PR #448). Q1 "Sign v1.0" carried to the regenerated version on two
conditions, both verified before recording: round 5
(`docs/reviews/R-PWB-OPENING-INDEX-AMENDMENT-5-RAW.md`) returned
`CONFIRM WITH EXCEPTIONS` with notes only, and `proposed/spec.md.patch` is
byte-identical to the version round 4 read. Record:
[`PWB-OPENING-INDEX-AMENDMENT-SIGNOFF-v1.0.md`](PWB-OPENING-INDEX-AMENDMENT-SIGNOFF-v1.0.md).

| # | What happened |
|---|---|
| P-98 | **Signed v1.0** by version tag under Scope A (tag `pwb-opening-index-amendment-v1.0`). The four round-5 notes are in the sibling `ROUND-5-DISPOSITIONS.md`; round 4's seven stay open in `ROUND-4-DISPOSITIONS.md`. Q2 "Walkthrough identities"; Q3 "Words visible on arrival"; Q4 "Human surface only"; Q5 "Existing roles" (confirming both readings); Q6 "Leave for now"; Q7 "Covered by syzygy-k0np"; Q8 "Names from the table"; Q9 "Keep name and place"; Q10 "The opening window"; Q11 "Step outward"; Q12 "Disclose it, as now". Implementation is covered on landing by `OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-15.md` (`syzygy-u05.23`, gate `syzygy-00ls`). Signing moved PWB `spec.md`, so P-85 is regenerated over it and the P-95 re-pin package stays stale (`syzygy-fxro`, `syzygy-2g0d`) |

The row as it stood in the register:

| # | Decision | Type | Blocks / earliest gate | Owning record |
|---|---|---|---|---|
| P-98 | PWB opening-index amendment (`syzygy-u05.12`, slice A): PWB-REQ-010's first reading level begins with nine rows, one per PWB-REQ-021 walkthrough identity, each routed to a target the specification declares and showing the word offset where it begins, then one stopping line giving the largest offset and the total; never a verdict, claim or walkthrough fact (RFC7-31). Q1: sign v1.0, decline or revise. Q2: rows keyed to the walkthrough identities or to PWB-REQ-010's categories. Q3: count words in the flow on arrival or every word. Q4: offsets on the human surface only, or machine-readable too. Q5: the copy roles of the new strings. Q6: slice B, word offsets in the PWB-REQ-021 record, left for now or drafted. Q7: slice D, a separate POC-REQ-061 bead for the other surfaces. The packet discloses its order against P-99, P-96, P-86 and P-85 (five spec patches, 120 orders, one result) and that signing it re-stales the P-95 re-pin. Round 1 (2026-10-03) was `REVISE`: two revise findings (the word-count method, the stopping line's falsifier) and six notes. Every round-1 finding was repaired once. Round 2 over the repaired bytes (2026-10-14, on your direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md`; `docs/reviews/R-PWB-OPENING-INDEX-AMENDMENT-2-RAW.md`) was `REVISE`: two revise findings (the scenario still places the stopping line after the last indexed target; the new row-name sentence has no oracle, falsifier or scenario) and seven notes, all open. Under the stopping rule the package is **not repaired again and not cleared**; the confirmation-round option is spent, this version is not offered for sign-off (Scope A item 3), and the questions stand as written *(marked 2026-10-14, later the same day: "all open", "not repaired again" and "the questions stand as written" are no longer true. On your further direction that day, relayed by the lead session, every round-2 finding, notes included, was repaired once; mapping in `ROUND-2-DISPOSITIONS.md` §"Repairs, 2026-10-14 (cycle 2)")*. **Round-2 findings repaired once on 2026-10-14, unconfirmed pending round 3** (brief: `contracts/candidates/pwb-opening-index-amendment/REVIEW-BRIEF.md` §"Round 3"; a notes-only round clears, a `REVISE` comes back to you). The repair added Q8 (rows show their declared row names, and the undefined "names its question" sentence is dropped; or declare per-row accessible names) and Q9 (keep the stopping line's name and place, rename it, or move it). Still not cleared; no ruling is recorded. *(Marked 2026-10-14, round 3: "unconfirmed pending round 3" is no longer true. Round 3 over the repaired bytes (`docs/reviews/R-PWB-OPENING-INDEX-AMENDMENT-3-RAW.md`, at `d6b3784f`) was `REVISE`: one revise finding (the closed-`details` placement rule's scope is ambiguous, and on the intended reading the first scenario contradicts it) and nine notes, all open in `ROUND-3-DISPOSITIONS.md`. Under the stopping rule in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md` the package is **not repaired again and not cleared**, no round 4 is dispatched, and this version is not offered for sign-off. Q1–Q9 stand; no ruling is recorded. P-99, judged separately in the same round, cleared.)* *(Marked 2026-10-14, P-86 signed: the P-86 sign-off moved PWB `spec.md`, so a later version of this package is regenerated over it. [Observed 2026-10-14] Its builder's `--check` fails on the signed tree; it is not repaired here.)* *(Marked 2026-10-14, cycle 3: "not repaired again", "no round 4 is dispatched" and "fails on the signed tree" are no longer true. On your direction that day, "One more cycle each" for P-85 and P-98, relayed by the lead session, every round-3 finding, notes included, was repaired once, and the package was regenerated with `--write` over the P-86 sign-off; mapping in `ROUND-3-DISPOSITIONS.md` §"Repairs, 2026-10-14 (cycle 3)". **Round-3 findings repaired once on 2026-10-14, unconfirmed pending round 4** (brief: `contracts/candidates/pwb-opening-index-amendment/REVIEW-BRIEF.md` §"Round 4", not yet run; a notes-only round clears, a `REVISE` comes back to you). The repair added Q10 (the numbers describe the window the page opens in, or one fixed size), Q11 (the line steps out of a closed disclosure, paragraph, heading, list or table holding the last target's start, or out of closed disclosures only) and Q12 (disclose the recognizer's partial independence, or tie each target's heading to its row name); each recommends the version drafted. Still not cleared; no ruling is recorded.)* *(Marked 2026-10-15, round 4: "unconfirmed pending round 4", "not yet run" and "Still not cleared; no ruling is recorded" are no longer true. Round 4 over the repaired bytes (`docs/reviews/R-PWB-OPENING-INDEX-AMENDMENT-4-RAW.md`, at `83b29c96`) was `CONFIRM WITH EXCEPTIONS`: seven notes, no revise finding, which **clears** the bytes it read (manifest file digest on the raw's line 3) under the 2026-09-26 ruling; the notes are open in the sibling `ROUND-4-DISPOSITIONS.md`, and the package is not edited. You then answered, by structured questions recorded in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`: Q1 "Sign v1.0", Q2 "Walkthrough identities", Q3 "Words visible on arrival", Q4 "Human surface only", Q5 "Existing roles" (confirming both readings), Q6 "Leave for now", Q7 "Covered by syzygy-k0np", Q8 "Names from the table", Q9 "Keep name and place", Q10 "The opening window", Q11 "Step outward" and Q12 "Disclose it, as now"; and "Carry if review clears": Q1 carries to the version regenerated over the signed P-99 only if its confirmation review is notes-only and `proposed/spec.md.patch` is byte-identical. **Not signed.** The P-99 sign-off of 2026-10-15 moved PWB `spec.md`, so this package is regenerated over it and reviewed again first, by another change; [Observed 2026-10-15] its builder's `--check` fails on the signed tree until then.)* *(Marked 2026-10-15, regenerated: "fails on the signed tree until then" no longer holds. The package was regenerated with `--write` over the P-99 sign-off; `proposed/spec.md.patch` is byte-identical to the version round 4 read, and two manifest rows move (`ROUND-4-DISPOSITIONS.md` §"Regenerated over the P-99 sign-off, 2026-10-15"). The round-4 clearance does not carry to the regenerated bytes; one regeneration-confirmation round 5 is briefed (`REVIEW-BRIEF.md` §"Round 5"). Not signed until it returns notes only.)* | specification sign-off (Scope A) | an opening index on Polaris (needs a fresh authorization after sign-off) *(marked 2026-10-15: no longer true; implementation is authorized on landing of the v1.0 sign-off by `decisions/OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-15.md`, bead `syzygy-u05.23` behind gate `syzygy-00ls`)* | `contracts/candidates/pwb-opening-index-amendment/OWNER-DECISION-PACKET.md`; `ROUND-1-DISPOSITIONS.md` to `ROUND-4-DISPOSITIONS.md` beside it |

## Resolved on 2026-10-15 (P-99 — the accessible-name amendment signed v1.0)

The owner answered P-99's Q1–Q8 on 2026-10-14 in the lead Claude Code
session, by structured questions, after round 3 cleared its bytes. The
package was then regenerated over the P-86 sign-off, which moved its
manifest. The owner's cycle-3 answer "Carry if review clears" carried Q1
"Sign v1.0" to the regenerated version on two conditions, both verified
before recording: round 4
(`docs/reviews/R-PWB-ACCESSIBLE-NAME-AMENDMENT-4-RAW.md`) returned
`CONFIRM WITH EXCEPTIONS` with notes only, and `proposed/spec.md.patch` is
byte-identical to the version round 3 read. Records:
[`PWB-ACCESSIBLE-NAME-AMENDMENT-SIGNOFF-v1.0.md`](PWB-ACCESSIBLE-NAME-AMENDMENT-SIGNOFF-v1.0.md)
and
[`OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`](OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md).

| # | What happened |
|---|---|
| P-99 | **Signed v1.0** by version tag under Scope A (tag `pwb-accessible-name-amendment-v1.0`). The three round-4 notes stay open in the sibling `ROUND-4-DISPOSITIONS.md`; round 3's ten in `ROUND-3-DISPOSITIONS.md`. Q2 "All focusable"; Q3 "One h1, no skips"; Q4 "File a POC-REQ-061 bead" (filed as `syzygy-k0np`); Q5 "First ready lands first", so P-98 and P-85 are regenerated over this one and reviewed again; Q6 "Every Polaris page"; Q7 "Label + source path"; Q8 "No exemption". Authorizes no implementation. Signing moved PWB `spec.md`, so the P-95 re-pin package stays stale (`syzygy-fxro`, `syzygy-2g0d`) |

The row as it stood in the register:

| # | Decision | Type | Blocks / earliest gate | Owning record |
|---|---|---|---|---|
| P-99 | PWB accessible-name amendment (`syzygy-u05.12`, slice C): on Polaris, interactive elements with different targets get different browser-computed accessible names, headings never skip a level under one level-1 heading, and both checks run over a whole-project page reporting their denominators *(marked 2026-10-14: the scope is every Polaris page served at one whole-project evaluation, the pages listed from the machine answer, as the round-1 repair made it)* *(marked again 2026-10-14, round 3: "as the round-1 repair made it" is right only for the scope. Round 1 made the scope every Polaris page served; listing the pages from the machine answer is the cycle-2 repair of round-2 finding 2, `ROUND-2-DISPOSITIONS.md` row 2; round-3 raw finding 7)*. Q1: sign v1.0, decline or revise. Q2: which elements must have distinct names. Q3: how strict the heading rule is. Q4: slice D, a separate POC-REQ-061 bead for Trajectory, Orrery and home. Q5: order against P-98, P-96, P-86 and P-85. Q6: every Polaris page or the entry page only. Round 1 (2026-10-03, the same round as P-98) was `REVISE`: one revise finding (the sweep covered one page while the obligation binds every Polaris page) and six notes. Every round-1 finding was repaired once. Round 2 over the repaired bytes (2026-10-14, on your direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md`; `docs/reviews/R-PWB-ACCESSIBLE-NAME-AMENDMENT-2-RAW.md`) was `REVISE`: one revise finding (the label-in-name and identity sentence has no oracle, falsifier or scenario) and six notes, all open. Under the stopping rule the package is **not repaired again and not cleared**; the confirmation-round option is spent, this version is not offered for sign-off (Scope A item 3), and the questions stand as written *(marked 2026-10-14, later the same day: "all open", "not repaired again" and "the questions stand as written" are no longer true. On your further direction that day, relayed by the lead session, every round-2 finding, notes included, was repaired once; mapping in `ROUND-2-DISPOSITIONS.md` §"Repairs, 2026-10-14 (cycle 2)")*. **Round-2 findings repaired once on 2026-10-14, unconfirmed pending round 3** (brief: `contracts/candidates/pwb-opening-index-amendment/REVIEW-BRIEF.md` §"Round 3"; a notes-only round clears, a `REVISE` comes back to you). The repair added Q7 (a shared visible label starts the name, and exact-source links add the source's path from the machine answer; or the label only; or name every item, not drafted) and Q8 (no heading exempt, since the verbatim exemption covered nothing; or restore one). Still not cleared; no ruling is recorded. *(Marked 2026-10-14, round 3: "unconfirmed pending round 3" and "Still not cleared" are no longer true. Round 3 over the repaired bytes (`docs/reviews/R-PWB-ACCESSIBLE-NAME-AMENDMENT-3-RAW.md`, at `d6b3784f`) was `CONFIRM WITH EXCEPTIONS`: ten notes, no revise finding. Under the 2026-09-26 ruling that **clears** the bytes it read (manifest file digest on the raw's line 3), on the owner's second-cycle direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md`. The notes are dispositioned, open, in the sibling `ROUND-3-DISPOSITIONS.md`, and the package is not edited. Q1–Q8 are yours to answer on the cleared version; nothing is ruled or signed. Before a sign-off can be recorded the package needs registering in `scripts/record_versioned_signoff.py`. P-98, judged separately in the same round, is still `REVISE`.)* *(Marked 2026-10-14, owner answers: in the lead Claude Code session, by structured questions, you answered Q1 "Sign v1.0", Q2 "All focusable", Q3 "One h1, no skips", Q4 "File a POC-REQ-061 bead" (filed, owner-directed, as `syzygy-k0np`, which starts with its own premise check), Q5 "First ready lands first", Q6 "Every Polaris page", Q7 "Label + source path" and Q8 "No exemption". **Not recorded as signed.** P-86 was signed first in the same change, and that is where the Q5 option you took applies: "The second is regenerated over the first's applied bytes and reviewed again before it is offered." [Observed 2026-10-14, in a scratch worktree with P-86 applied] Regenerating this package leaves `proposed/spec.md.patch` unchanged and moves both `Source:` digests in the dependency patch. It also moves five of the manifest's eleven rows, and the round-3 raw's head binds that manifest file's digest, so the recorder refuses that raw for the regenerated bytes. Q2–Q8 stand as answered. The regenerated version needs one fresh review. Whether your Q1 answer then carries to it, or you are asked again, is yours to say. The package is not edited or regenerated here. It is registered in the recorder.)* *(Marked 2026-10-14, regenerated: "not edited or regenerated here" is no longer true. Under your Q5 answer the package was regenerated with `--write` over the P-86 sign-off. [Observed 2026-10-14] `proposed/spec.md.patch` is byte-identical to the version round 3 cleared; the dependency patch changes only its two `Source:` digest lines; five of the eleven manifest rows move (`CAPABILITY-COVERAGE.md`, `GOVERNING-DEPENDENCIES.md`, `design.md`, `proposal.md`, `spec.md`). The round-3 clearance does not carry to the regenerated manifest. The notes are not repaired, the package prose is not edited, and the regeneration is recorded in `ROUND-3-DISPOSITIONS.md` §"Regenerated over the P-86 sign-off, 2026-10-14". It awaits one regeneration-confirmation round, briefed in `contracts/candidates/pwb-opening-index-amendment/REVIEW-BRIEF.md` §"Round 4" and not yet run. Not signed; whether your Q1 answer carries to the regenerated version is yours to say.)* | specification sign-off (Scope A) | Polaris accessibility checks (needs a fresh authorization after sign-off) | `contracts/candidates/pwb-accessible-name-amendment/OWNER-DECISION-PACKET.md`; `ROUND-1-DISPOSITIONS.md` to `ROUND-3-DISPOSITIONS.md` beside it |

## Resolved on 2026-10-14 (P-86, P-100 — the cycle-2 clearances signed v1.0)

The owner answered both packets on 2026-10-14 in the lead Claude Code
session, by structured questions. Each answer came after the package's
latest fresh-context round returned `CONFIRM WITH EXCEPTIONS` with notes
only: P-86 round 4
(`docs/reviews/R-PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-4-RAW.md`) and
P-100 round 3 (`docs/reviews/R-N10-POC-GOVERNING-INTENT-3-RAW.md`). The
bytes were cleared under the 2026-09-26 stopping rule. Records:
[`PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-SIGNOFF-v1.0.md`](PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-SIGNOFF-v1.0.md)
and
[`THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md`](THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md).
P-99 (accessible name) was answered in the same sitting. It stays open in
the register because its own Q5 answer has it regenerated over P-86 and
reviewed again before it is offered; its row says so.

| # | What happened |
|---|---|
| P-86 | **Signed v1.0** by version tag under Scope A (tag `pwb-class-granular-extraction-amendment-v1.0`). The four notes stay open in the sibling `ROUND-4-DISPOSITIONS.md`. Q2 "Unknown, list headings"; Q3 "Independent + note"; Q4 "Multi-heading rows" (list and table rows naming two or more headings at one level); Q5 "First ready lands first", so P-85 is regenerated over this one, renumbered and reviewed again; Q6 "Separate REQ-004 delta" (not drafted); Q7 "Its body was read"; Q8 "Drafted order" (the code is changed at build where it differs). Authorizes no implementation. Signing moved PWB `spec.md`, so the P-95 re-pin package stays stale (`syzygy-fxro`, `syzygy-2g0d`) |
| P-100 | **Signed v1.0** by version tag under the Scope A extension to POC amendments (tag `three-surface-poc-governing-intent-amendment-v1.0`). The seven notes stay open in the sibling `ROUND-3-DISPOSITIONS.md`. Q1 "Syzygy's records only" is recorded as the direction for the later link amendment and authorizes nothing now; Q2 "Sign v1.0"; Q3 "Keep deferred". The package has no manifest, so its record carries the applied subject rows. P-84, the declared exclusive pair, is regenerated over it, and its next review re-judges POC-REQ-014's encoding arm against P-84's amended POC-REQ-060 (the raw's note 4, carried in the P-84 row). Authorizes no implementation |

The rows as they stood in the register:

| # | Decision | Type | Blocks / earliest gate | Owning record |
|---|---|---|---|---|
| P-86 | PWB class-granular extraction amendment (ruling P-82 (A), funnel move M15): one failing class no longer makes its whole source Unknown, an unenumerated heading is surfaced as a counted Unknown, and counts made without a read root index say so. Q1: sign v1.0, decline, revise, or order one confirmation round. Q2: an unenumerated heading counts Unknown with the headings listed, or each heading counts as one item. Q3: baseline specs and roster directories root-independent with a note, or dependent. Q4: the enclosure rule for list and table rows naming two or more headings at one level, or the V1 catalog only. Q5: order against P-85 (both add design decision 12 and capability row 34). Q6: the root-summary and precedence half of the Q3 ruling, deferred to a separate PWB-REQ-004 delta or carried here. Q7 (added 2026-10-14): whether the root index counts as read when its body reads but its grammar fails (recommended) or only when its grammar also holds. Q8 (added 2026-10-14, cycle 2): which rule names a source two rules admit — the drafted order (root index, pillar index, tree rule with its class, else pillar-named file; for a loaded profile the first tree population declared), with the code changed at build for a pillar index an earlier pillar's index names (recommended), or the code's registration order written into the text. Round 1 (2026-10-03) was `REVISE`; findings 1–9 were repaired and finding 10, which named residual risks, changed nothing (corrected 2026-10-03: this row first said every finding was repaired). Round 2 over the repaired bytes (2026-10-03, `syzygy-418x`) was `REVISE`: one revise finding and seven notes. On 2026-10-14 the owner directed one new version repairing all eight, then one fresh round; round-2 findings were repaired once on 2026-10-14. Round 3 over the repaired bytes (2026-10-14, `docs/reviews/R-PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-3-RAW.md`) was `REVISE`: one revise finding (rule provenance is undecidable for a source two population rules admit) and four notes, all open. Under the stopping rule in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md` and the brief's round-3 rule the package is **not edited and not cleared**; nothing is ruled and this version is not offered for sign-off *(marked 2026-10-14: superseded the same day by the owner's direction for one more cycle; all five round-3 findings, notes included, were repaired, adding Q8. **Round-3 findings repaired once on 2026-10-14, unconfirmed pending round 4**, prepared in the brief's §"Round 4" and not dispatched; mapping in `ROUND-3-DISPOSITIONS.md` §"Repairs, 2026-10-14 (cycle 2)". Still not cleared and not offered for sign-off; nothing is ruled)*. *(Marked 2026-10-14, round 4: "unconfirmed pending round 4", "not dispatched" and "Still not cleared and not offered for sign-off" are no longer true. Round 4 over the repaired bytes (`docs/reviews/R-PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-4-RAW.md`, at `c88a621f`) was `CONFIRM WITH EXCEPTIONS`: four notes, no revise finding. Under the 2026-09-26 ruling that **clears** the bytes it read (manifest file digest on the raw's line 3), on the owner's second-cycle direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md`. The notes are dispositioned, open, in the sibling `ROUND-4-DISPOSITIONS.md`, and the package is not edited. Q1–Q8 are yours to answer on the cleared version; nothing is ruled or signed. Before a sign-off can be recorded the package needs registering in `scripts/record_versioned_signoff.py`, and the P-85 `design.md` and capability-row collision stays under Q5.)* | specification sign-off | M15 implementation (needs a fresh authorization after sign-off) | `contracts/candidates/pwb-class-granular-extraction-amendment/OWNER-DECISION-PACKET.md`; `ROUND-1-DISPOSITIONS.md` to `ROUND-4-DISPOSITIONS.md` beside it |
| P-100 | Which work comes from which intent (`syzygy-u05.10`, vision pursuit move N10): no Butlers work item says which intent it serves. Q1: where the link comes from — Syzygy's own creation records only (a spec amendment, sign-off and authorization; no consent act), also reading `external_ref` (consent, secret-policy and registry acts first), or also reading `external_ref`, `description` and `design` (those acts plus an RFC 0004 amendment, since RFC4-15 says the work database is "never intent"); the drafter recommends Syzygy's own records only. Q2: sign the drafted POC-REQ-014 (every work item's intent link shows as a counted Unknown with a reason and route; nothing guessed from a title; no new field read; no link defined yet), and by which route, since Scope A does not cover POC amendments (as P-84 Q2) [superseded 2026-10-14: Scope A now covers POC specification amendments, `OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md`; the route question is answered]. Q3: keep the source-to-claims index deferred to a later PWB delta, or drop it. What the unread fields hold is [Unknown]. Round 1 (2026-10-03) was `REVISE`; every finding was repaired once (`ROUND-1-DISPOSITIONS.md` beside the packet). Round 2 over the repaired bytes (2026-10-14, on your direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md`; `docs/reviews/R-N10-POC-GOVERNING-INTENT-2-RAW.md`) was `REVISE`: four revise findings (the Trajectory arms contradict signed POC-REQ-042's bounded board; the oracle does not decide the marker, resolution sentence or non-green encoding; RFC8-24 has two unlisted limbs; the P-97 sibling is unnamed) and five notes, all open (`ROUND-2-DISPOSITIONS.md`). Under the stopping rule the package is **not repaired again and not cleared**, and this version is not offered for sign-off *(marked 2026-10-14, later the same day: "all open" and "not repaired again" are no longer true — on your further direction that day, relayed by the lead session, one more cycle ran)*. **Round-2 findings repaired once on 2026-10-14, unconfirmed pending round 3**, mapped in `ROUND-2-DISPOSITIONS.md` §"Repairs, 2026-10-14 (cycle 2)"; round 3 is briefed in `REVIEW-BRIEF.md` §"Round 3" and not yet run (a notes-only round clears, a `REVISE` comes back to you). The repair scoped POC-REQ-014's Trajectory arms to the bounded selection signed POC-REQ-042 allows (items off the board are counted, not filterable), gave each Trajectory arm a decision procedure, added the RFC8-24 rows, moved RFC8-21 to the applicable-uncovered part, and regenerated the patches over the signed P-97 bytes. No owner question was added; Q1 and Q3 are unchanged, Q2's route stays answered. P-84 stays a declared mutually exclusive pair. *(Marked 2026-10-14, round 3: "unconfirmed pending round 3" and "round 3 … not yet run" are no longer true. Round 3 over the repaired bytes (`docs/reviews/R-N10-POC-GOVERNING-INTENT-3-RAW.md`, at `52c1d0f5`) was `CONFIRM WITH EXCEPTIONS`: seven notes, no revise finding. Under the 2026-09-26 ruling that **clears** the ten files it read (package digest on the raw's line 3), on the owner's second-cycle direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md`. The notes are dispositioned, open, in the sibling `ROUND-3-DISPOSITIONS.md`, and no other package file is edited. Q1–Q3 are yours to answer on the cleared version; nothing is ruled or signed. Before a sign-off can be recorded the package needs registering in `scripts/record_versioned_signoff.py`, which today refuses a `Package digest:` head. If P-84 is signed first, this package's encoding arm is re-judged against the amended POC-REQ-060 (raw finding 4).)* | field admission: owner acts; requirement: specification sign-off | governing intent on Trajectory; move N10 implementation (needs an authorization after sign-off) | `contracts/candidates/three-surface-poc-governing-intent-amendment/OWNER-DECISION-PACKET.md`; `ROUND-1-DISPOSITIONS.md` to `ROUND-3-DISPOSITIONS.md` beside it |

## Resolved on 2026-10-14 (P-96, P-97 — the N9 machine-channel amendments signed v1.0)

The owner answered both packets on 2026-10-14 in the lead Claude Code
session, by structured questions, after the round-2 review
(`docs/reviews/R-N9-MACHINE-CHANNEL-AMENDMENTS-2-RAW.md`) returned
`CONFIRM WITH EXCEPTIONS` with notes only for both halves. Records:
[`PWB-ANCHOR-RESOLUTION-AMENDMENT-SIGNOFF-v1.0.md`](PWB-ANCHOR-RESOLUTION-AMENDMENT-SIGNOFF-v1.0.md),
[`THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-SIGNOFF-v1.0.md`](THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-SIGNOFF-v1.0.md)
and the route direction
[`OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md`](OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md).

| # | What happened |
|---|---|
| P-96 | **Signed v1.0** by version tag under Scope A (tag `pwb-anchor-resolution-amendment-v1.0`); the nine notes stay open in the sibling `ROUND-2-DISPOSITIONS.md`. Q2 "Keep RFC7-3": no contract amendment commissioned. Q3 "Leave it": no PWB-REQ-015 delta. Q4 "Machine only". Authorizes no implementation. Signing moved PWB `spec.md`, so the P-95 re-pin package is stale (`syzygy-fxro`, `syzygy-2g0d`) |
| P-97 | **Signed v1.0** by version tag (tag `three-surface-poc-block-provenance-amendment-v1.0`); the eight notes stay open in the PWB half's `ROUND-2-DISPOSITIONS.md`. Q2 "Extend Scope A to POC": Scope A now covers Three-Surface POC specification amendments, so P-84 and P-100 follow it when they clear. Q3 "Two identity values". Authorizes no implementation |

The rows as they stood in the register:

| # | Decision | Type | Blocks / earliest gate | Owning record |
|---|---|---|---|---|
| P-96 | PWB anchor-resolution amendment (`syzygy-u05.9`, pursuit move N9, PWB half): PWB-REQ-014 gains one anchor shape that names its block, and an `anchorsResolved` pair (anchors that resolve against the machine answer, over anchors) on each anchored block and the narrative; every narrative unit stays `non-citable`. [Observed] 883 of 902 at Butlers `32f38feb`. Q1: sign v1.0, decline or revise. Q2 (open, not drafted): keep RFC7-3 as accepted, or commission a contract amendment making citability follow resolved anchors. Q3: leave the deep-dive's second source-reference shape, or commission a PWB-REQ-015 delta. Q4: the pair machine-only, or rendered too. Signing it moves PWB `spec.md` again, so it interacts with P-95 (see its packet). Round 1 (2026-10-03, one round over both N9 packages) was `REVISE` for both; every finding was repaired once. Round 2 over the repaired bytes (2026-10-14, on your direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md`; `docs/reviews/R-N9-MACHINE-CHANNEL-AMENDMENTS-2-RAW.md`) was `CONFIRM WITH EXCEPTIONS` for this half: 0 revise findings and nine notes. Under your 2026-09-26 ruling the bytes it read are **cleared** (manifest digest on the raw's line 3); the notes are dispositioned, open, in `ROUND-2-DISPOSITIONS.md` beside the packet, and the package is not edited. Q1's *order one confirmation round* arm is spent; Q1–Q4 stay open. The sign-off recorder does not yet accept this raw's two-package head (see that record) | specification sign-off (Scope A) | its implementation slice (needs a fresh authorization after sign-off) | `contracts/candidates/pwb-anchor-resolution-amendment/OWNER-DECISION-PACKET.md`; `ROUND-1-DISPOSITIONS.md` and `ROUND-2-DISPOSITIONS.md` beside it |
| P-97 | Three-Surface POC block-provenance amendment (`syzygy-u05.9`, pursuit move N9, POC half): POC-REQ-001 and POC-REQ-010 each state their observation's provenance once, in the shape the machine answer's entities use, and no row restates the observation's revision or capture instant. [Observed] Today every one of 7,952 work items and 6,950 files repeats it: 772,900 bytes, 13.44% of `/api/poc`. Q1: sign v1.0, decline or revise. Q2: the sign-off route, recommended to follow your P-84 Q2 answer. Q3: the two identity values only, or every header value. Round 1 (2026-10-03, one round over both N9 packages) was `REVISE` for both; every finding was repaired once. Round 2 over the repaired bytes (2026-10-14, on your direction in `decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md`; `docs/reviews/R-N9-MACHINE-CHANNEL-AMENDMENTS-2-RAW.md`) was `CONFIRM WITH EXCEPTIONS` for this half: 0 revise findings and eight notes. Under your 2026-09-26 ruling the bytes it read are **cleared** (manifest digest on the raw's line 4); the notes are dispositioned, open, in the PWB half's `ROUND-2-DISPOSITIONS.md`, and the package is not edited. Q1's *order one confirmation round* arm is spent; Q1–Q3 stay open. The sign-off recorder does not yet accept this raw's two-package head (see that record) | specification sign-off (route per P-84 Q2) | its implementation slice (needs a fresh authorization after sign-off) | `contracts/candidates/three-surface-poc-block-provenance-amendment/OWNER-DECISION-PACKET.md`; the PWB half's `ROUND-1-DISPOSITIONS.md` and `ROUND-2-DISPOSITIONS.md` |

## Resolved on 2026-10-14 (P-18, P-49, P-50, P-51 — questionnaire answers of 2026-09-27)

The owner answered these rows on 2026-09-27 in a local questionnaire
packet, taking the recommended option on each with no edits, and
instructed on 2026-10-14 that the answers be applied. Record:
[`OPEN-REGISTER-OWNER-RULINGS-2026-09-27-DECISION.md`](OPEN-REGISTER-OWNER-RULINGS-2026-09-27-DECISION.md).

| # | What happened |
|---|---|
| P-18 | **Read — A** (record §5): doctrine's frozen-noun list fixes its thirteen words and forbids no others, so *Claim* (RFC1-24) is compatible; no doctrine edit. **P-18(a)** was ratified at the Wave A act, 2026-08-17 (acceptance record §7). **P-18(c)** is not a doctrine seam and sits with P-17's eight undefined terms, in effect deferred with it. C-1, C-2 and C-4 were not asked |
| P-49 | **Ruled — A** (record §3): the accepted population is the 324 headed clauses; RFC-0007's six lettered parts are named parts of their parents; no amendment. The matrix's per-part routes and its "45" stay with P-10 |
| P-50 | **Ruled — A** (record §1): "never partial registration" is CAP1-REQ-002's own stricter rule; no contract or charter edit |
| P-51 | **Ruled — A** (record §1): "a named failure" is CAP1-REQ-002's own stricter rule; no contract amendment and no vocabulary act |

The rows as they stood in the register:

| # | Decision | Type | Blocks / earliest gate | Owning record |
|---|---|---|---|---|
| P-18 | Three doctrine/contract vocabulary seams (C-1…C-6): governance-category counts, "Claim" outside doctrine's frozen nouns, `evidence tier` vs `rendering tier` | ruling | before OpenSpec multiplies them (advisory) | `round-2026-08/TERM-MIGRATION-REPORT.md` |
| P-49 | The accepted RFC-0007 module `narrative-contract.md` claims sub-clauses `RFC7-2(a)–(c)` and `RFC7-9(a)–(c)` in its frontmatter and closing summary, but **defines none of them in the module body** — the family count reads 41 by definition-header sweep, 47 by the module's own claim (accepted population 324 vs 330). Amend the module's count claims, or define the sub-clauses, or rule the frontmatter non-authoritative on counts | module amendment ruling — an accepted module's bytes; only the owner amends | before any artifact's clause-population claim must survive an adversarial count | `round-2026-08k/reviews/RS-3-AUTHORITY-RAW.md` observation 2; `contracts/rfcs/RFC-0007/narrative-contract.md` |
| P-50 | Capability 1 charter row 1.1's phrase **"never partial registration"** (atomicity of the registration transition) is anchored to no clause. `RFC3-9` fixes only the *consequence* of an invalid declaration (every dependent claim renders Unknown; no auto-repair) and `RFC3-5` fixes only the closed top-level field set — neither states an all-or-nothing registration transition, and verification rule 8 bars justifying a clause-level claim from adjacent prose. Two lawful repairs, both owner-only: **(a)** amend an accepted Wave A/B module (`RFC3-5` or `RFC3-9`) to state the atomic transition — enlarges what the owner already accepted, since RFC 0003 is bound; or **(b)** drop the atomicity phrase from `CAPABILITY-1-CHARTER.yaml` row 1.1 — weakens a row the owner deliberately authored. Recommend (b): a charter-row edit is the smaller, more reversible change against a module the owner has already accepted, but the owner may prefer (a) if atomic registration is intended production behavior. **Default if unanswered: neither repair is made — row 1.1 keeps the unanchored phrase, and no spec built on row 1.1 may cite atomicity as clause-backed until this rules** | contract amendment or charter ruling — only the owner disposes | before any spec cites row 1.1's atomicity as clause-backed | `round-2026-08g/reviews/RD-60-capability-1-outline-exercise-RAW.md` R1.1-A / observation B3; `contracts/rfcs/RFC-0003/manifests-and-namespace.md` (RFC3-5, RFC3-9); `contracts/candidates/CAPABILITY-1-CHARTER.yaml` row 1.1 |
| P-51 | Capability 1 charter row 1.1 requires an invalid project declaration to be **"a named failure."** No clause among row 1.1's governing set (`RFC1-1`, `RFC3-1`, `RFC3-4`, `RFC3-5`, `RFC3-9`) defines a failure-identifier vocabulary — `RFC3-9` fixes only the *consequence* of invalidity (every dependent claim renders Unknown; no auto-repair), so a parse/validate requirement's oracle has no domain to draw expected failure identifiers from (RD-60 outline review, row 1.1 finding B2, tabled there as "not a P-number"). This is structurally the same question **P-37** posed for the seven project-shape facet names: does a specification mint its own vocabulary, or must a contract be amended to own it? P-37 ruled (2026-08-16, recorded as **SDR-36**, `SURFACE-DECISION-RECORD.md`) that the Capability 1 specification is the drafting site for the facet names, not an RFC-0006 amendment — but that ruling named the facets specifically; it did not generically authorize every future vocabulary a spec might need. Two lawful paths, both owner-only: **(a)** rule that P-37's drafting-site precedent extends to the failure-identifier vocabulary too — the Capability 1 spec mints the failure identifiers, no RFC amendment required; or **(b)** treat this as its own question and require a Wave A/B contract amendment (most likely to `RFC3-9`) to own the vocabulary before any spec cites it. Recommend (a): the precedent is directly on point (same clause family, same "may a spec mint its own vocabulary" shape) and extending it costs zero bytes against an accepted module, whereas (b) reopens a bound contract. **Default if unanswered: neither repair is made — no requirement for row 1.1 may cite an expected failure-identifier value as clause-backed until this rules** | vocabulary-ownership ruling (P-37 precedent extension) or contract amendment — only the owner disposes | before any spec cites row 1.1's failure-identifier vocabulary as clause-backed | `round-2026-08g/reviews/RD-60-capability-1-outline-exercise-RAW.md` row 1.1 finding B2 / "The 'named failure' vocabulary" table row; `contracts/rfcs/RFC-0003/manifests-and-namespace.md` (RFC3-9); `contracts/candidates/CAPABILITY-1-CHARTER.yaml` row 1.1; `SURFACE-DECISION-RECORD.md` SDR-36 (the P-37 precedent) |

## Resolved on 2026-10-06 (P-103 — doctrine amendment D9)

The owner adopted doctrine amendment D9, SEC-3 and the owner's attended
agent session, with the words "Adopt D9 and v1 signed off" (the second half
is the separate dossier sign-off). The bare "Adopt D9" is read as the
packet's recommendations; that reading, and the doctrine bytes applied, are
in the `D9` row of [`DOCTRINE-AMENDMENT-LOG.md`](DOCTRINE-AMENDMENT-LOG.md).
Package:
`../contracts/candidates/doctrine-amendment-sec3-attended-agent-session-d9/`;
round-3 notes:
[`DOCTRINE-AMENDMENT-D9-REVIEW-NOTES.md`](../contracts/candidates/DOCTRINE-AMENDMENT-D9-REVIEW-NOTES.md).
The row as it stood in the register:

| # | Decision | Type | Blocks / earliest gate | Owning record |
|---|---|---|---|---|
| P-103 | SEC-3 and the owner's attended agent session, doctrine amendment D9 (owner direction `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05` item 1, "Allow on host, amend SEC-3", chosen over "Only in a sandbox" and "Forbid, disclose"; scope answered 2026-10-06 after round 2, POLARIS-DOSSIER-LOCAL-AGENT-D9-ROUND-2-DIRECTION.md: "Any feature, per-run choice", chosen over "Dossier briefs only" and "Any feature, standing choice"). Q1, which text and so whom SEC-3's execution rule binds (round 2 folded Q2 into it): arm A (recommended) binds Syzygy, what it launches or schedules, and every instruction a Syzygy feature gives an agent (a brief, prompt, skill or work item), and permits one case in any feature: a Syzygy instruction may let an attended session the owner started on the owner's own host build and run observed code, on a choice the owner records for that one run, naming what it covers; a standing or per-project record does not qualify. This is wider than the dossier ruling, by the owner's choice, and a future feature needs no new doctrine act. The conditions: the choice for the run is recorded first, claims resting on the run are Inferred, and every reported command is disclosed. The case's limits bind Syzygy's instruction, not the session. "Untrusted, everywhere" and the violation example stay verbatim, and the cost is stated. Arm W binds everyone with one exception, and it would make CI and hand-typed commands violations. The `v1.md` sentence is optional. Q3: RFC5-12 "Absent: no observed code runs" and RFC5-24 "never visible to observed-project code" change effect in the permitted case; recommended (b), the condition that no adapter credential is readable, at the operating-system level, by the session or any process it starts while any runs, plus (a), recording RFC5-12's effect, with (c), an RFC 0005 amendment, queued. Q4: CC-SEC-3 follows after D9; the dossier brief is its named case. Q5: definitions kept in place. [Inferred] Pre-existing and independent of D9: `poc:capture-test-artifact` runs observed pytest without a profile (bead `syzygy-4mbu`). Rounds 1 and 2 (2026-10-06) returned `REVISE`; each was repaired once (`ROUND-1-DISPOSITIONS.md`, `ROUND-2-DISPOSITIONS.md`), and round 3 is the last confirming round; a third `REVISE` returns to the owner. Adoption stays open. | doctrine amendment: owner adoption (VIS-4), no phrase | the local-agent dossier mode's sign-off (PR #353); any brief that lets an agent run observed code | `contracts/candidates/doctrine-amendment-sec3-attended-agent-session-d9/OWNER-DECISION-PACKET.md`; `ROUND-1-DISPOSITIONS.md` and `ROUND-2-DISPOSITIONS.md` beside it |

## Resolved on 2026-09-27 (P-25, P-25(c) — doctrine amendment D5)

The owner adopted doctrine amendment D5, a readability rewrite of all six
doctrine files, with the words "Adopt D5". D5 applies both pending editorial
amendments: the glossary citations name their file (P-25(a)) and the
glossary defines *actuator* (P-25(c)). Record:
[`DOCTRINE-AMENDMENT-D5-READABILITY.md`](DOCTRINE-AMENDMENT-D5-READABILITY.md).
The rows as they stood in the register:

| `P-nn` | Question | Kind | Blocks | Source |
|---|---|---|---|---|
| P-25 | Editorial doctrine amendment qualifying the three "README glossary" citations (drafted, not performed); three terms remain undefined anywhere reachable | doctrine amendment — only the owner applies | none | `policy-candidates/DOCTRINE-EDITORIAL-AMENDMENT-GLOSSARY-CITATION.md` |
| P-25(c) | The `actuator` definition — a minimal doctrine amendment with the exact glossary insertion, one inferred sentence flagged for the owner | doctrine amendment — only the owner applies | none | `policy-candidates/DOCTRINE-AMENDMENT-ACTUATOR-DEFINITION.md` |

## Resolved on 2026-09-21 (the Polaris pursuit rulings, P-68…P-83)

The sixteen rows filed 2026-09-13 through 2026-09-17 by the Polaris
pursuit's feature-request funnels (packets under `docs/design/`, one per
move M2–M16, plus the lane B direction question) were ruled by the owner
on 2026-09-21 in one questionnaire sitting, taking the recommended option
on every one of the packet's seventeen items with no edits. The rulings
record is `POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md`, which owns the full detail, quotes the owner's words,
and lists the fifty-six beads the rulings crystallized into. The rows'
full pre-ruling text is preserved in git history at `b7a29f2`.

| # | What happened |
|---|---|
| P-68 | **Ruled — A**: lane B proceeds by ceremony — RFC-0007 successor tooling (implementation plane), the held PWB-REQ-007 qualifier and a further review, then the contract act, then the PWB behavior act, each a separate dated owner act; nothing authorized yet. Bead `syzygy-dov.17` |
| P-69 | **Ruled — B**: the missing RFC2-9 bound is disclosed outside the freshness slot (claim stays Unknown) and a CC-REV-2 clarification scenario to PWB-REQ-007 gates slice 5 with its registry and continuation acts; slices 1–4 and 6 proceed under the continuation act. Beads `syzygy-dov.2.1`, `.2.2`, gates `.18`–`.20` |
| P-70 | **Ruled — A**: the M3 bundle; slices 1–4 after M2, 5–6 after them, freshness per P-69. Beads `syzygy-dov.3.1`, `.3.2` |
| P-71 | **Ruled — A**: slices 1–2 after M3 slice 5, slices 3–5 behind one opening-band CC-REV-2 scenario, pure drafter writes no file; `P-71-Q5` ruled Reading B — the return path never writes into Butlers on this answer. Beads `syzygy-dov.4.1`, `.4.2`, gate `.21` |
| P-72 | **Ruled — A**: one PWB delta names a closed derived read-only machine-view category; `maxBriefingResponseBytes` minted under a superseding registry act shared with P-69 Q2(a); slices 1–2 now. Beads `syzygy-dov.5.1`, `.5.2`, gates `.22`, `.18` |
| P-73 | **Ruled — A**: slices 1, 2, 3, 5 under the generator implementation act; slice 4 behind its edit-stage-deletion scenario, named by the record. Beads `syzygy-dov.6.1`–`.6.3`, gate `.23` |
| P-74 | **Ruled — A**: slices 1, 3, 4, 6 (design), 7 under the existing act, slice 7 first in the shared-model WIP-one slot; slice 5's fifth limb behind a registry act; slice 6's run behind three self-observation acts; population stays 195. Beads `syzygy-dov.8.1`–`.8.6`, gates `.24`, `.25` |
| P-75 | **Ruled — A**: one CC-REV-2 package against the three-surface spec after lane B's manifest is disposed of; `Inferred` as a typed landing zone; Q6 read generally — any pursuit slice tracing to a recorded finding lands under the improvement-cycles direction. Beads `syzygy-dov.9.1`, `.9.2`, gate `.26` |
| P-76 | **Ruled — A**: `git-tree-entry` admitted as the fifth RFC7-10 class; an observing project reading its own tree needs no consent record; the self-corpus category folds into P-72's delta. Beads `syzygy-dov.7.1`, `.7.2` |
| P-77 | **Ruled — A**: a response-identity digest (POC-REQ-004) in the WIP-one slot after M8 slice 7; compression behind a dated owner act; `machine-credentialed`; join key behind M9. Beads `syzygy-dov.10.1`–`.10.5`, gate `.27` |
| P-78 | **Ruled — A**: status surface machine-credentialed / human-open, breach line with population counts, breach-to-readiness against the two declared ceilings with no new limit, human line in `pageShell` under 400 bytes. Beads `syzygy-dov.11.1`, `.11.2` |
| P-79 | **Ruled — A**: retention is a posture change needing an owner act before anything ships; unbounded claim-tuple records, a capped band, a stage-1 unpromoted note only, dismissal by delta plus act. Beads `syzygy-dov.12.1`–`.12.3`, gates `.28`, `.29` |
| P-80 | **Ruled — A**: progressive enhancement over native details, source record hoisted (no delta), stateless filter designed after lane B with a rule-6 mutant; slices 3 and 5 named by the record. Beads `syzygy-dov.13.1`, `.13.2` |
| P-81 | **Ruled — A**: exact-source route to the 77 non-baseline sources behind a PWB-REQ-011 scenario and act, never the 9 withheld; legend sentence and labelled figures now; PWB-REQ-015 delta drafted only. Beads `syzygy-dov.14.1`–`.14.3`, gate `.30` |
| P-82 | **Ruled — A**: one CC-REV-2 delta to PWB-REQ-002 drafted behind lane B's manifest, no code. Bead `syzygy-dov.15.1` |
| P-83 | **Ruled — A**: build Q1, Q2, Q3, Q4 and the token cleanup half of Q6; design only Q5 and the palette/curation halves; six improvement-cycle beads `syzygy-dov.16.1`–`.16.6` |

## Resolved on 2026-09-13 (the Polaris page-size question, P-67)

The three batched questions from the M1 feature-request funnel
(`docs/design/POLARIS-M1-PAGE-SIZE-FUNNEL.md`, filed the same day) were
ruled by the owner in one reply agreeing with every recommendation. The
rulings record is `POLARIS-M1-PAGE-SIZE-OWNER-RULING-DECISION.md`, which
owns the full detail and quotes the reply verbatim.

| # | What happened |
|---|---|
| P-67 | **Ruled — Q1 yes, Q2 yes after lane A is measured, Q3 accept**: an implementation-only trim of the Polaris human page in the P-63 shape (narrative JSON off the page, compact list for statement-less classes) under bead `syzygy-dov.1`; the scoped-attributes semantic delta on PWB-REQ-007/014/020 to be drafted after the trim is measured, adoption by its own later act; and the honest target recorded — a smaller per-item slope and a removed constant, never a sublinear page under PWB-REQ-011/020/021. P-52 untouched. |

## Resolved on 2026-09-07 (the written-estate questions, P-54…P-59 and P-66)

The seven questions gathered by the documentation-estate packet
(`DOCUMENTATION-ESTATE-DECISION-PACKET.md`, written 2026-09-05, extended
2026-09-06) were ruled by the owner in one reply on 2026-09-07 agreeing with
every recommendation in it, and applied the same day so far as each arm
allows — two of the seven defer by their own terms and one is disclosure
only. The rulings record is `DOCUMENTATION-ESTATE-OWNER-RULINGS-DECISION.md`,
which owns the full detail and quotes the reply verbatim.

| # | What happened |
|---|---|
| P-54 | **Ruled — arm (b)**: `openspec/config.yaml` trimmed to its one live setting, `schema: spec-driven`; the shipped `context:` and `rules:` examples deleted, and this project's agent-facing context ruled to travel through `AGENTS.md` and the governed plane rather than tool config. A comment in the file states the ruling so the block is not reintroduced. The file's only evidence citation, in the Administration-1 launch-gate record, is anchored to commit `71e5986` and describes the scaffold rather than quoting its bytes, so the trim retires nothing. |
| P-55 | **Ruled — arm (b)**: this project does not use the OpenSpec archive and spec-materialization steps. `openspec/specs/` and `openspec/changes/archive/` each took a one-line README saying so. Neither directory had ever been tracked (git stores no empty directory), so the READMEs also make them exist in a clone for the first time — before this, the "two empty directories" a reader saw were present only in the authoring checkout. |
| P-56 | **Ruled — arm (b)**: `syzygy_begin_specification_stage_capability1_prompt.md` stays at the repository root and took a head note — what it opened, that the stage closed on 2026-08-20, that it is not an instruction to any agent reading the repository today, and why it is kept there. Not (a): (a) edits a decision record to buy a tidier root listing. The citation pinning it here, in `CAPABILITY-1-SPECIFICATION-AUTHORING-DECISION.md`, wraps across a line break ("(repository" / "root)"), which is why a basename sweep does not find it. |
| P-57 | **Ruled — arm (a)**: an agent was authorized to write `openspec/README.md` as navigation only — which change is adopted and under which act, which are candidate, what the empty directories mean — banner-marked never authority. **The arm reserved the owner's review of its text; the owner approved it 2026-09-08**, discharging the reservation. It is the governed plane's only agent-authored page. |
| P-58 | **Ruled — arm (a), folded into act 4 whenever the owner next takes it up**: the overview is to name VIS-1 and VIS-2 by identifier and keep the activity-is-not-proof sentence as prose rather than as one of two rules. The arm defers by its own terms — an agent may prepare the delta, only the owner performs the act — so `.syzygy/intent/OVERVIEW.md` is byte-unchanged and was not opened for editing. Prepared as delta **OVW-1** with P-59, unreviewed. |
| P-59 | **Ruled — arm (a), alongside P-58**: the overview's bolded "Nothing is implemented" is to be replaced by the route to `PROJECT-STATUS.md` that the next paragraph already takes. Same deferral; deliberately the same one delta, because a second edit to act 4's argument later would retire whatever confirmation the first earned. |
| P-66 | **Ruled — arm (b), with (a) riding along if a CC-SPEC amendment ever comes**: the amendment-history banner naming five of the nine phase rules CC-SPEC-8 defers to is a permanent, disclosed blemish. Nothing was edited — the file's bytes are a performed act's argument — and arm (c), a standalone amendment act for prose that binds nothing, was not taken. **This row and the rulings record are the disclosure; the next audit should not re-raise it.** |

Two things this pass recorded against the records themselves: the packet's
"none depends on another" holds for the questions but not for the
applications (P-57's index has to say what P-55 settled), and the register's
own published row counts had been one low since 2026-08-06 because their
stated predicate did not match the sub-lettered row `P-25(c)`. Both are
marked in place in the records that carried them.

## Resolved on 2026-09-07 (the PWB improvement-cycle questions, P-60…P-65)

The six questions gathered by the PWB cycle report
(`PWB-CYCLE-REPORT-DECISION-PACKET.md`, 2026-09-06) were ruled by the owner
in one reply on 2026-09-07 and applied the same day on that reply's own
apply instruction ("Follow your recommendations for all of the above. For
the butler page change, dispatch a subagent to do that"). Every item passed
independent adversarial subagent review (scope and recommendation verdicts)
in a local questionnaire packet before presentation; the review corrected
the two rows quoted below and found that the packet's "None depends on
another" was wrong for one pair. The rulings record is
`PWB-CYCLE-OWNER-RULINGS-DECISION.md`, which owns the full detail.

| # | What happened |
|---|---|
| P-60 | **Ruled — arm (a)/A**: repair the Butlers V1 page (nine edits over eight lines) so its catalog parses; no Syzygy act. The row's "one line uses a colon" understated it: the extractor stops at the first failure, and the page has five colon forms and four duplicate labels. **Owner edit to the boundary:** the edit is made by a dispatched agent on a Butlers branch, not by the owner's hand; merge stays the owner's and follows the P-63 trim. |
| P-61 | **Ruled — A**: bold the seven code-span first cells in the two Lay and Land tables (87 topology items); roster untouched, no grammar act. The row as written was wrong and is quoted here so the correction is checkable: it said the withheld roster files and the failing table "together … empty the catalog and topology populations and leave the roster denominator Unknown; readiness reports two limbs". The roster withholding gates no limb; the empty populations come from the two failing pages, and readiness reports three limbs. Same owner edit to the boundary as P-60. |
| P-62 | **Ruled — A**: add an index page at openspec/README.md in Butlers, linking only to directories, so Spec and Spine is discovered like the other four pillars. Written by the same dispatched agent as its own commit (the owner's "butler page change" read as covering it; droppable alone). Because this delegates drafting rather than a pre-reviewed edit, the commit is a proposal: its text goes before the owner verbatim and is final only on the owner's approval or knowing merge. |
| P-63 | **Ruled — A**: an implementation-only trim of the Polaris human page, measured before the P-60/P-61 repairs merge, target about 420 KB; if short, a registry act packet (raise or narrow) is drafted at once. Bead `syzygy-1z3.27`. The row's default, "the page serves until it crosses the ceiling, then reports the breach", misled by omission — at the ceiling the page serves nothing (HTTP 503, readiness false) — and its arm (c), "let the limit ledger report the breach", was false: no ledger sees a response-ceiling breach and nothing logs it. P-52 not ruled; the bead was filed on the item's stated boundary. |
| P-64 | **Ruled — A**: one sentence in the owner's words that following an Exact source link is a permitted walkthrough step, inserted below line 79 of the candidate walkthrough packet. The owner supplied it in a second reply the same day ("Yes, following the exact-source link is permitted.") and it was inserted verbatim as the last paragraph of "What is already in place"; the packet stays a candidate and binds nothing. |
| P-65 | **Ruled — A**: repair epic `syzygy-1z3.24` closed 2026-09-07 with criterion 4 (a passing retained run) recorded unmet and carried by `syzygy-1z3.22`'s readiness gate and by `syzygy-1z3.27`. The walkthrough stays gated on P-60, P-61, P-63 and a green preflight. |

## Resolved on 2026-08-19, second sitting (the Administration-1 owner inputs, P-45…P-48)

The four owner inputs queued by the Administration-1 repair pass
(2026-08-18) were ruled in one questionnaire sitting on 2026-08-19 and
applied the same day on the owner's explicit apply instruction. Every
item passed two rounds of independent adversarial subagent review
(scope and recommendation verdicts each) before presentation; the
review found and forced correction of two coordinator drafting defects
(a candidate artifact's phrase presented as a doctrine citation, and an
inverted claim about which arm guarantees the F2 verdict limb) — both
corrected before the owner saw the items. Each row names its own
decision record, which owns the full detail.

| # | What happened |
|---|---|
| P-45 | **Ruled — arm (a), the envelope stated**: engineering attention 2 hours/week; review capacity Claude-family agents plus the owner with occasional GPT 5.6-family review, no fixed cadence; model budget ceiling $200/month (Codex subscription); 2–3 concurrent workstreams; **first proving project: the syzygy repository itself**, butlers second. Settles Administration 1's A6 `Unknown`; the proving-project name is the risk-ordering record's own R2 partial test and gives R1 a named place to accrue evidence. The scope-versus-capacity assessment remains follow-on work. Record: `A6-RESOURCE-ENVELOPE-DECISION.md`. |
| P-46 | **Ruled — arm (b)**: no numeric governance-effort ceiling is declared; **case-by-case owner judgment is the recorded posture**. F6 stays `Not met` at future administrations knowingly and disclosed — a non-conjunct, non-blocking grade under instrument v2.4. Record: `F6-GOVERNANCE-CEILING-DECISION.md`. |
| P-47 | **Ruled — arm (a)**: the **governance-reduction plan is adopted as directed work** — banner-and-route retirements execute at their named gates without per-artifact re-asking; no deletion, no act-bound bytes, ever. Gates §1/§2/§4 had already arrived, so the declined P-44 offer and the sealed launch packet were banner-marked at the apply; §3 awaits the first accepted specification. No deferral is created; F2's grade at Administration 2 stays the grader's call. The plan's own doctrine-misattribution defect (found by the adversarial review) is disclosed in the record and queued in beads. Record: `F2-GOVERNANCE-REDUCTION-DECISION.md`. |
| P-48 | **Ruled — arm (a), N=2**: the repair↔administration cycle is bounded at **at most two further administrations**; if Administration 3 is not `READY`, the owner makes the launch decision directly on the record then in hand — the cycle ends either way. Answers the stop-condition half of F1's settlement; constrains when the decision stops being deferred, never its content. Record: `LAUNCH-REPAIR-STOP-CONDITION-DECISION.md`. |

## Resolved on 2026-08-19 (the 2026-08-18 questionnaire rulings, applied on explicit owner request)

Four rulings the owner recorded in the 2026-08-18 local questionnaire
sitting (items 10–13; the packet's own process note discloses that their
adversarial reviews were coordinator-direct rather than clean
independent-subagent passes). Each was applied canonically 2026-08-19,
on the owner's explicit apply instruction; each names its own decision
record, which owns the full detail.

| # | What happened |
|---|---|
| P-14 | **Ruled — MIT** (option B, owner-selected directly over the recommended legal-review-first arm; the copyleft-reach `[Unknown]` knowingly accepted unresolved by counsel). Applied: root `LICENSE` created, `README.md` §License and `CONTRIBUTING.md` posture updated. Record: `LICENSE-CHOICE-DECISION.md`; context: `LICENSE-DECISION-PACKET.md`. |
| P-16 | **Ruled — option A**: the term registry's 31 entries designated **non-binding working drafting vocabulary**; the registry stays candidate, banner unchanged, no entry citable as binding; P-17/P-18 stay open. Record: `TERM-REGISTRY-DRAFTING-VOCABULARY-DECISION.md`. |
| P-24 | **Ruled — option A**: doctrine question **D4** ruled *inside VIS-4's bounds*, and the reviewer's reason-stating §1.2 wording designated as the text act 5 would carry — clearing RC-7 F10 by an owner ruling rather than a side-effect sentence. Act 5 (P-5) stays open; the §1.1 autonomy-ceiling question stays unruled; no doctrine byte moved. Record: `D4-RULING-DECISION.md`. |
| P-44 | **Ruled — arm (b), declined**: no lagging-specification exception is added to CC-REV-2. Arm (a) was not lawfully choosable (RD-69 N4, offer defects) and was not chosen; any future exception is a fresh offer with a fresh review. The offer file is unedited. Record: `CC-REV-2-LAGGING-SPEC-EXCEPTION-DECISION.md`. |

## Resolved on 2026-08-17 (the four owner acts, and their §7 ratifications)

The acts themselves are recorded in
[`ACCEPTANCE-ACT-RECORD.md`](ACCEPTANCE-ACT-RECORD.md), which owns them;
these rows record only each queue row's disposal.

| # | What happened |
|---|---|
| P-41 | **Executed — act 6 performed 2026-08-17** (`CONFIRM CRAFT AMENDMENT: CC-SPEC@9889b7e3…`, one sitting with act 7). The specification-acceptance policy (CC-SPEC-1…11) is in force as owner-confirmed craft at its reviewed digest; the RD-51 → RD-69 (`REVISE`) → blocker repair → RD-70 (`CONFIRM WITH EXCEPTIONS`) cycle and the nine disclosed non-blocking findings travel with it. Owning records: `SPECIFICATION-ACCEPTANCE-DECISION.md`; `ACCEPTANCE-ACT-RECORD.md`; `../policies/craft-and-care/INSTALL-RECORD.md`. |
| P-42 | **Executed — act 7 performed 2026-08-17** (`CONFIRM CRAFT AMENDMENT: CC-IMPACT@cd6ec838…`, same sitting as act 6, satisfying the joint-sitting requirement). The shape-to-spec impact policy (CC-IMPACT-1…7) is in force at its reviewed digest. Owning records: `SHAPE-TO-SPEC-IMPACT-DECISION.md`; `ACCEPTANCE-ACT-RECORD.md`; `../policies/craft-and-care/INSTALL-RECORD.md`. |
| P-28 | **Resolved by ratification at the Wave A act** (acceptance record §7 item 16): performing the act with the drafted mission-extension profile riding in ratified it. The owner read §7 before the phrase (§2 step 0). Owning record: `ACCEPTANCE-ACT-RECORD.md` (Wave A entry). |
| P-22 | **Resolved by ratification at the Wave B act** (acceptance record §7 item 17): the RFC9-8(a) registry placement rode in and was ratified when the act was performed. Owning record: `ACCEPTANCE-ACT-RECORD.md` (Wave B entry). |

P-21 did **not** resolve at the acts — §7 item 18 ratifies only the
declaration's *presence* while sub-question (a) rides in unruled; its row
stays open in the register.

## Resolved on 2026-08-16 (owner ruling via adversarially-reviewed questionnaire packet)

Every ruling below is a **recorded decision, not a digest-binding act** —
none performs the Wave A or Wave B act, none runs the formal launch-gate
administration, and none authors OpenSpec. Each ruling was independently
adversarially reviewed (separate scope and recommendation verdicts) before
being presented, per the `user-questionnaire` subskill's mandatory gate; the
full packet, including the review record and one caught-and-corrected error
(a stale-framing discrepancy in an external plan's stated preference on
`P-33`), is the owner's local decision packet, not tracked in this
repository.

| # | What happened |
|---|---|
| P-31 | **Ruled.** Ratify the drafted `RFC2-19(a)` exemption as written — the merged-but-unreconciled Unknown carries no thirteenth reason; the `RFC2-24` list stays closed at twelve. Recorded as **SDR-34**, `SURFACE-DECISION-RECORD.md`. Zero bytes move; the Wave A confirmation is unaffected. |
| P-33 | **Ruled.** Install shape **(M)** — leave the accepted modules' internal path strings alone; install no companion package apparatus; install neither package-wide manifest. Recorded in `WAVE-A-INSTALL-SHAPE-DECISION.md`'s own template. Zero bytes move; both Wave A and Wave B confirmations are unaffected. This was the sole obstacle withholding the Wave A offer — **the offer is now unblocked; the Wave A act itself has not been performed.** |
| P-35 | **Ruled.** Full operating-constraints table filled in (option a) — 1 operator; attention and budget Unknown; independent-review capacity is Claude-family agents plus the owner, with occasional ad hoc other-model-family review; other rows recorded or Unknown. No date or delivery commitment. Recorded in `PROJECT-OPERATING-CONSTRAINTS-DECISION.md`. |
| P-36 | **Ruled.** The two-term rule: no verifying evidence → `Unknown`; evidence of non-satisfaction → `Gap`. Recorded as **SDR-35**, `SURFACE-DECISION-RECORD.md`; the term registry's `T-20`/`T-31` disclosed conflict note collapses to a pointer at that row. Zero bytes move on any contract module. |
| P-37 | **Ruled.** Seven project-shape facets adopted, no cross-facet rollup; drafting site = the Capability 1 specification (site a2), not an RFC-0006 amendment. Recorded as **SDR-36**, `SURFACE-DECISION-RECORD.md`, naming both the facets and the site. Both Wave A and Wave B confirmations are unaffected (the cheaper of the two drafting-site arms was chosen). |
| P-38 | **Ruled.** As drafted (option a): fixed entry `.syzygy/intent/OVERVIEW.md` identified with the primary narrative (RFC7-6, "not two front doors"); four-valued per-repository discoverability finding; propose-only root-README link. Recorded in `HUMAN-ENTRY-DECISION.md`. Zero bytes move; the Wave B confirmation is unaffected. |
| P-39 | **Ruled.** Pin current upstream OpenSpec, at **1.9.0** (refreshed at answer time from the packet's measured `1.8.0`, since upstream had published again and the owner had already upgraded). The schema/template format contract is confirmed byte-identical `1.8.0`→`1.9.0`; other tooling changes exist and are recorded `[Inferred]` non-breaking, not independently verified line-by-line. Recorded in `GOVERNANCE-SUBSTRATE-LOCK.yaml`'s `openspec` block. |
| P-40 | **Ruled.** One OpenSpec change governs one coherent capability, or one coherent change to one. Recorded as **SDR-37**, `SURFACE-DECISION-RECORD.md`. `FIRST-OPENSPEC-SEQUENCE.md` now cites the SDR row instead of asserting the rule in its own voice. Zero bytes move on any contract module. |
| P-34 | **Ruled (approved), arm (a).** The owner first ruled arm (c) after the v2.3 reviews (RD-65/RD-66, both `REVISE`, the fourth consecutive pair) — the structural v2.4 repair was committed (`4dd6e20`) and its review pair RD-67/RD-68 returned `REVISE`/`REVISE`, the fifth consecutive pair. The one structural repair held (no live forgery in v2.4), but two instance-patched class defects recurred as fresh BLOCKING false-`READY` paths. The owner weighed that under arm (c)'s reasoning and on 2026-08-16 ruled arm (a): **approved v2.4 as process policy, residuals disclosed, F5 not promoted**. The readiness standard's "launch-gate is owner-approved" conjunct is satisfied at v2.4; the formal (out-of-family) administration becomes runnable with the two residuals in hand. No unilateral v2.5 was begun; a bounded v2.5 remains an owner option, not a gate. Owning record: `LAUNCH-GATE-AUTHORITY-DECISION.md`. |

## Resolved on 2026-08-06 (owner override, recorded)

| # | What happened |
|---|---|
| P-26 | **Executed.** Owner override: re-pin `th-engineering` to the installed commit `f4cf1c7` (closing the drift instead of holding the 2026-07-30 pin) **and** vendor a byte-identical local copy in-tree at `.claude/skills/th-engineering/` and `.codex/skills/th-engineering/`, superseding the `PUBLIC-CLONE-AUTHORITY-MATRIX.md` "out of scope, do not import" disposition. CC-BAR-1 and CC-TEST-1…6 were re-checked against test-rigor's two new bars and the new engineering-bar Definition-of-Done item; no conflicts found, so no override text changed — `testing-and-verification.md` gained CC-TEST-7 recording the re-check, `engineering-bar.md`'s CC-BAR-1 gained a matching note. Full detail: `../policies/GOVERNANCE-SUBSTRATE-LOCK.yaml` `th_engineering`; `../policies/craft-and-care/INSTALL-RECORD.md` (2026-08-06 correction); `../policies/craft-and-care/README.md` "Adoption by reference" |

## Resolved during the 2026-08-05 round (recorded, not decisions to make)

| # | What happened |
|---|---|
| P-6 | **Executed.** The retired phrase was removed from both digest sets — `rfcs/RFC-0003/governance-homes-and-owner-acts.md` (act 1) and topology `README.md` (act 3). Both manifests regenerated; semantic deltas SD-1/SD-2 |
| P-7 | **Executed.** All nine canonical craft files now describe themselves truthfully as canonical; rule text byte-unchanged; digests regenerated (SD-3) |
| P-8 | **Executed.** `INSTALL-RECORD.md` binds craft force to the digest-bound acceptance act, not the retired phrase (SD-4) |
| P-9 | **Executed.** Candidate contracts, topology, acceptance record, reviews, validation scripts, decision warrants, and the license packet are tracked and clone-visible; raw interviews and bootstrap history stay founder-local (FD-021/FD-037) |
| P-11 | **Executed.** README, AGENTS.md, PROJECT-STATUS.md, CONTRIBUTING.md, SECURITY.md installed; `.gitignore` verified |
| P-13 | **Executed.** The overview's progressive-disclosure refactor landed (SD-9); its adoption is P-4 |

## The register's as-of chronology (oldest last)

- **2026-09-21** — the sixteen Polaris pursuit rows P-68…P-83 ruled in
  one owner questionnaire sitting (recommended option on all seventeen
  items, no edits) and routed as a plain owner direction: rows moved to
  resolved; `POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md` owns them; fifty-six beads crystallized under
  `syzygy-dov`. P-52 stays open.
- **2026-09-13** — P-67 (Polaris page size at the ceiling) filed and
  ruled the same day in one owner reply ("Agreed"); row moved to
  resolved; `POLARIS-M1-PAGE-SIZE-OWNER-RULING-DECISION.md` owns it.
  P-52 stays open.
- **2026-09-07** — the PWB cycle questions P-60…P-65 ruled in one owner
  reply (A on every row) and applied on its own apply instruction: rows
  moved to resolved; `PWB-CYCLE-OWNER-RULINGS-DECISION.md` owns them.
  P-52 stays open.
- **2026-08-20** — the owner's **launch decision**: Capability 1
  specification authoring authorized by explicit owner instruction
  (`CAPABILITY-1-SPECIFICATION-AUTHORING-DECISION.md`, which owns the
  decision). The Administration 1 `NOT READY` verdict stands as filed;
  the lifecycle stage moves from final pre-specification to
  specification defining. No queue row is disposed by this decision.
- **2026-08-19** — the 2026-08-18 questionnaire rulings applied: P-14
  (MIT), P-16, P-24 (D4), P-44 moved to resolved on the owner's explicit
  apply request. P-45…P-48 had been added 2026-08-18 by the
  Administration-1 repair pass (round 2026-08j).
- **2026-08-17** — the four owner acts: Waves A and B accepted (A then B),
  then craft acts 6 and 7 performed in one sitting. P-41/P-42 executed;
  P-22/P-28 resolved by §7 ratification; P-21 narrowed to its open
  sub-question (a). The register refactored the same day (this file
  created); resolved rows moved here.
- **2026-08-16** — eight rows ruled by the owner in one adversarially-reviewed
  questionnaire-packet sitting: P-31, P-33, P-35, P-36, P-37, P-38, P-39,
  P-40; P-34 ruled arm (c) then arm (a) the same day (see above).
- **2026-08-13** — P-43 and P-44 added; P-41/P-42 candidates amended against
  RD-51 and the two bounded packets added to the decisions home; P-34's row
  compressed (owner charter §8) after growing to 1,280 words of chronology.
- **2026-08-10** (round 2026-08e, launch closure) — rows P-25(c), P-34…P-41
  added (P-41 the same day, RD28-05), P-22 re-grounded, P-38 corrected to
  RFC7-40's four-value domain; the RFC7-39 entry-identity ruling disclosed at
  the acceptance record's §7 item 15 travels on P-38's packet; launch-scope
  index added before the open table (RD29-06).
- **2026-08-09** (round 2026-08d, structural closure) — the single
  foundational-contract act P-1 was restructured into **six wave acts**.
  Four open rows had their ground changed by candidate-byte repairs
  (P-21(c′), P-22, P-23, P-28); a candidate-byte repair is a drafting
  posture, not a decision. Later the same day the round's fresh-context
  review pass completed — fifteen reviews, every verdict `REVISE` — adding
  P-29…P-33.
- **2026-08-07** — P-28 added; P-21 extended with review RD-4's finding F-17
  (one arm of a pending question installed into candidate front matter while
  open).
- **2026-08-06c** — P-26 closed by owner override (see above); P-27 added
  from reviews RC-11 (`REVISE`) and RC-12 (`EXCEPTIONS`); vocabulary rows
  re-checked against `round-2026-08b/TERM-CLOSURE-REPORT.md`.
- **2026-08-05** — regenerated at the close of the human-clarity refactor
  round. The previous revision (as-of `adddc34`) is superseded: it listed
  P-6/P-7/P-8/P-9/P-11 as open when the round executed them, and routed most
  owning records to the git-excluded `_bootstrap/` tree.

## Superseded packet notes (2026-08-10)

P-12's packet became `KNOWLEDGE-HYGIENE-DECISION.md` and P-33's
`WAVE-A-INSTALL-SHAPE-DECISION.md` (both this directory), superseding the
round-08d packets file for those rows; the round-08d
`OWNER-DECISION-PACKETS.md` remained current for packets 1, 3, 4, 5, 9 and
12, with packet 6 stale and banner-marked (P-22's row and the packets file's
own banner said so).

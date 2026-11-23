# Feature request M12 — Retained evaluations, a rendered claim-state
delta, and the owner's note

> **Candidate — binds nothing.** Bead `syzygy-dov.12`, move M12 of the
> 2026-09-13 vision pursuit (`docs/pursuits/2026-09-13-vision-pursuit.md`),
> written in the shape of `docs/design/POLARIS-M1-PAGE-SIZE-FUNNEL.md` and
> its ten siblings. Planning only: nothing here authorizes implementation.
> Each question below names the arms the owner may take; naming a lawful arm
> is not a ruling that a slice is authorized. The owner disposes.

Date: 2026-09-15. Author: a funnel session (Claude), for the owner.

Size: **medium** (slices 1 and 2) / **large** (slices 3 and 4, neither of
which ships in this move's default).

Baseline: Syzygy `a9f671e` (main). The subject is what survives one run of
the POC daemon — today, nothing but a credential — and what the owner may
write back.

**Line-number convention, stated once.** Every line number is 1-based over
the file's bytes at `a9f671e` unless another commit or worktree is named;
`sed -n 'Np' <file>` selects line N.

**Line-count convention, stated once.** Every published line count is the
`wc -l` figure — physical newline-terminated lines — never the
split-on-newline count, which is one higher on every newline-terminated file
cited here.

**"The dossier", stated once.** The 2026-09-13 vision pursuit is a
three-file record set and "the dossier" names the set:
`docs/pursuits/2026-09-13-vision-pursuit.md` (**552** lines, whose `### M12`
section is at line 403), `docs/pursuits/2026-09-13-vision-pursuit-data.json`
(**5,014**) and `docs/pursuits/2026-09-13-vision-pursuit-harvest.json`
(**4,596**). M12 merges the agent moves L2-M6, L2-M7 and L2-M8 and rests on
the findings L2-F4 and L2-F5; each of those five objects lives in the two
JSON records, not in the prose digest, and every sentence this packet
attributes to one is located there.

**The dossier audited at `f4589e2`; this packet is at `a9f671e`.** Every one
of the **twelve** distinct files named in the "Line numbers re-verified at
`a9f671e`" table below is **byte-identical between those two commits**:
`git diff --name-only f4589e2 a9f671e` prints **146** paths this session and
**0** of the twelve is among them [Observed; denominator every path that diff
prints]. The twelve, named rather than described:

1. `apps/three-surface-poc/src/main.ts`
2. `apps/three-surface-poc/src/materialize-action.ts`
3. `packages/three-surface-poc-core/src/body-read-authority.ts`
4. `packages/three-surface-poc-core/src/walkthrough-judgment.ts`
5. `packages/three-surface-poc-core/src/walkthrough-readiness.ts`
6. `packages/three-surface-poc-core/src/project-shape-manifest.ts`
7. `packages/three-surface-poc-core/src/project-shape-observation.ts`
8. `packages/three-surface-poc-core/src/project-shape-model.ts`
9. `packages/three-surface-poc-core/src/materialization.ts`
10. `.syzygy/governance/doctrine/vision.md`
11. `.syzygy/governance/doctrine/architecture.md`
12. `openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md`

**The claim is about those twelve and no wider set.**
`apps/three-surface-poc/src/polaris.ts`, which the Measurements cite often,
**is** in the 146-row diff and is **not** among the twelve [Observed, both
checked this session]. So unlike M6's case, no dossier citation here is stale
because of drift; the two that are imprecise are imprecise at both commits,
and both are corrected below. [This paragraph read "the twelve are the nine
implementation files and three governance files named in Gate 0 and the
Measurements" until 2026-09-15; review 1's F8. That parenthetical identified
no set — Gate 0 names no implementation file, and the Measurements name more
than nine, including `polaris.ts`, which did change. The substantive
conclusion is unchanged: 0 of the twelve appear in the diff.]

**One re-split, disclosed.** The dossier gives M12 three slices. This packet
publishes **four**, because the dossier's own prerequisite line already
distinguishes two different gates inside its third slice ("owner act for the
note (retention posture); spec amendment for dismissal"), and a slice whose
gate is an act and a slice whose gate is a CC-REV-2 amendment cannot share a
row in Gate 3 or Gate 5 without one of them being mis-stated. Dossier slice 1
is slice 1, dossier slice 2 is slice 2, and dossier slice 3 becomes slices 3
and 4. [The quotation read "owner act for the note; spec amendment for
dismissal" until 2026-09-15, dropping the dossier's own parenthetical
"(retention posture)" with no ellipsis and no note; review 1's F1. Corrected
here and at every other site in this packet and in its evidence record.]

## The six questions for the owner

Batched, each with the recommended answer first. Everything below is the
evidence behind them. Q1 and Q2 gate slice 1 and therefore slice 2. Q3 is a
budget question shared with M1. Q4 and Q5 gate slices 3 and 4, neither of
which ships in the default. Q6 is the doctrinal question the delta band
turns on.

| # | Question | Recommended |
|---|---|---|
| Q1 | **Is a durable, per-evaluation claim-state record in the daemon's own state directory a change to retention posture, and therefore a named escalation trigger?** The continuation act reads, verbatim at `.syzygy/governance/decisions/PWB-IMPLEMENTATION-AUTHORIZATION-CONTINUATION-ACT.md` lines 150–156: "Stop and return to the owner before proceeding if implementation would need any of: a change to doctrine or an accepted contract; a further amendment to the signed PWB specification beyond the 2026-09-05 package; **a change to security, privacy, or retention posture beyond the 2026-09-05 approved secret-classification policy**; a change to the constraints or envelope the 2026-09-05 registry entry declares; any observation outside the consented content class or repository; or any scope beyond the signed change." The approved policy's own retention clause is `rawBodyHandling`, whose five members all read `"never"` — `storage`, `logging`, `rendering`, `machineResponse`, `externalEgress` (`.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` lines 178–184) — and it is a clause about **raw bodies**, which a claim-state record contains none of. What the record does contain is derived observed-project metadata: a claim identity per claim. Of the **1,149** claim objects in the retained machine capture there are **1,148** distinct identities, and those 1,148 split three ways. **1,117** are interpolated from observed-project text: 278 repository-relative source paths, 415 declared item class-and-key pairs, the 415 `claim:fact:item:` twins of those keys, and 9 catalog headings. **30** are composed wholly from closed vocabularies fixed in Syzygy's own source and carry no observed text at all: 9 `claim:class:` and 9 `claim:fact:count:` from `EXTRACTION_CLASSES`, a nine-value literal at `packages/three-surface-poc-core/src/project-shape-manifest.ts` lines 58–68, and 6 `claim:project-account:` and 6 `claim:fact:project-account:` from `PROJECT_ACCOUNT_KEYS`, a six-value literal at `packages/three-surface-poc-core/src/project-shape-extraction.ts` line 46. The remaining **1** (`claim:project-shape`) is a fixed literal; 1,117 + 30 + 1 = 1,148 [Observed, computed this session over the retained `/api/poc` capture; the six identity-construction sites are `packages/three-surface-poc-core/src/project-shape-model.ts` lines 367, 375, 383, 403, 430 and 447, each read at source]. [This sentence read "**1,148** carry an identity interpolated from observed-project text — 278 from a repository-relative source path, 416 from a declared item class and key, 439 from a fact name, 9 from a class name and 6 from a project-account key — and exactly **1** (`claim:project-shape`) is a fixed literal … the five derivation sites are … lines 367, 375, 383, 403 and 430" until 2026-09-15. Review 1's F2, F3 and F4, three defects in one sentence: 416 is a count of item *claim objects*, so the six published figures summed to 1,149 rather than to the 1,148 claimed; 30 of the 1,148 are closed-vocabulary and not observed-derived, so the number the owner was asked to weigh was ~31 too high in the direction favouring the recommendation; and construction site 447 was missing. **Q1's recommended answer, its three lawful arms and its default do not move**: 278 repository-relative paths and 415 declared item keys in a durable file are the substance the question turns on, and 1,117 of 1,148 is still the overwhelming majority.] | **Yes — treat it as a retention-posture change and obtain an owner act before slice 1 lands.** Writing derived observed-project metadata to disk, durably and across restarts, is a posture the 2026-09-05 package does not describe in either direction, and "beyond" a policy that says nothing about derived state is the reading that fails closed. **The counter-argument, and it is strong:** the state directory **already** holds two derived records written under the same authority — the materialization record (`packages/three-surface-poc-core/src/materialization.ts` lines 128–134) and the test-artifact record (`packages/three-surface-poc-core/src/test-artifact-verification.ts` lines 73–79) — so a third derived record is arguably the same posture at a larger size, and the act's word is "change", not "addition". **Second lawful arm:** rule it inside the existing authorization on that reading, and record the reading. **Third lawful arm:** rule it inside on a narrower ground — that the record may hold only claim identities the machine answer already serves, so it stores nothing not already disclosed. This packet does not rule which reading the trigger bears [Inferred]. **Default if unanswered: slice 1 does not ship, and slice 2 with it.** |
| Q2 | **What may a retained evaluation record hold, and how long may it live?** VIS-6(b) exempts observation records from rebuildability precisely so they may be kept, and its words are "historical evidence, immutable, evaluation-identified, marked stale, exempt from rebuildability" (`.syzygy/governance/doctrine/vision.md` lines 177–179). A retention **bound** therefore has to be reconciled with "immutable": pruning the oldest record destroys historical evidence doctrine has just exempted from rebuilding. The cost is measurable, not hypothetical: the canonical claim-identity-to-tuple map for the retained capture's 1,149 claim objects is **177,031 bytes**; adding each claim's resolution routes takes it to **203,379** [Observed, computed this session from the retained `/api/poc` body with the same key-sorted, undefined-dropping canonicalization `canonicalJson` uses]. | **Claim identity plus the epistemic tuple and challenge state only — no support anchors, no source bodies, no resolution routes — kept unbounded, with the on-disk total rendered beside the delta.** 177 KB per evaluation is a cost the owner can see and cap later; a cap chosen now by a delegate would be a delegate deciding how much of the project's history to destroy. **The counter-argument:** unbounded growth in a directory whose only current occupant is a 64-byte credential is a new operational surface nobody is watching, and a POC is the wrong place to discover that a state directory grew to hundreds of megabytes. **Second lawful arm:** cap at N records, oldest discarded, with the discard **counted and rendered** so the page never implies the history is complete. **Third lawful arm:** keep exactly one prior evaluation — the minimum that answers "what changed since I last looked" — and state on the page that no longer history exists. **Fourth lawful arm:** cap by total bytes rather than by count. **Default if unanswered: the third arm** — one prior evaluation, the smallest claim, and the one that cannot grow without bound. |
| Q3 | **May the delta band spend the response-ceiling headroom M1 lane A bought, and what is its cap?** After lane A the tailnet `/polaris` headroom is **612,665** bytes and the direct headroom **618,515** (ceiling 2,097,152 against 1,484,487 and 1,478,637 served bytes) [Observed, from `docs/evidence/pwb-m1-polaris-lane-a-measurement-2026-09-13.json`; the direct figure is the subtraction, computed this session]. A delta row must carry two epistemic tuples. On the **post-trim** lane A after-captures the page's own claim-tuple spans number **713** and average **586.4** bytes each (min 559, max 661, total 418,122, identical on both host forms); on the pre-trim retained capture they number **699** and average **586.3** (min 559, max 661, total 409,829). The per-tuple cost is **stable across the trim** — 0.1 bytes *higher* after it, because lane A removed narrative JSON and list markup rather than tuple spans [Observed, measured this session over the retained capture and over both lane A after-captures]. Two tuples per row is **1,172.8** bytes at the post-trim figure, so the tailnet headroom admits about **522** full rows against a population of **1,148** distinct claim identities — the band can breach the ceiling on its own [Inferred, an extrapolation from a measured per-tuple cost to a renderer nobody has built]. [Until 2026-09-15 this cell published 699 spans and 586.3 bytes with the gloss "that capture is the pre-trim page, so the per-tuple figure is an upper bound on a post-trim renderer", and 1,172.6 bytes per row; review 1's F6 — the post-trim captures were already in hand and refute the limiting sentence. 612,665 / 1,172.8 = 522.4, so the row figure does not move.] | **Yes, and cap the band at a declared row count with the remainder disclosed as a counted, routed Unknown — never silently truncated.** VIS-1 ranks comprehension second only to truth, and "what changed" is the question the owner's own sentence asks; but VIS-2 forbids a band that renders 522 of 1,148 changes and looks complete. **The counter-argument, and it is M1's:** the headroom is the whole subject of P-67 and P-68, lane A spent a 654,019-byte trim to buy it, the restated Q3 target of 1.4 MB is **not yet met** on either host form (short by 78,637 direct and 84,487 tailnet, per the same record), and a packet that charges that budget for a second band is spending another move's savings before lane B has landed. **Second lawful arm:** the delta renders on the machine channel only, where the headroom is **2,868,294** bytes (ceiling 8,388,608 against a 5,520,314-byte model) — zero cost on `/polaris`, and the owner reads it through an authenticated request rather than on the page. **Third lawful arm:** the human band renders only the **counts** — added, removed, tuple-changed, unchanged, with the denominator — and routes to the machine answer for the list. Its cost is a few hundred bytes. **Default if unanswered: the third arm.** |
| Q4 | **May an owner note be promoted by committing it out into the observed project's governed plane — and does any act in force permit that write?** VIS-6(a) specifies the promotion in terms: "promoting a note into governance (an annotation or a dismissal) commits it out to the governed plane, attributed and reasoned" (`.syzygy/governance/doctrine/vision.md` lines 173–174). Two facts stand against building it now. First, the act in force says the opposite in terms: `.syzygy/governance/decisions/PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md` lines 70–72 read "No write, egress, execution, deployment, release, recovery, or mission effect on Butlers or on any other repository. The observer registry entry the owner adopted declares an empty write surface; that remains the bound." The registry entry's `"writeSurface": []` is at line 125 of `.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json`, and those bytes are digest-bound by `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-ENTRY-AMENDMENT-ACT.md` — **no slice may edit them**. Second, **there is no governed plane in the observed project to commit into**: across the **278** distinct source paths of the retained observation, **0** begin `.syzygy` and **0** contain the path segment `local`; the population has three top-level segments and none of them is a governance root [Observed, computed this session over the retained machine capture's `projectShape` block; no observed-repository path is reproduced here]. | **Do not build promotion in this move, and put the act question to the owner as a question rather than answering it.** This packet does not rule whether a new owner act may authorize the write; it records that the act in force forbids it in terms and that the target directory does not exist in the proving project. **Lawful arms, all of them:** (a) a new owner act authorizing a bounded note write, which also needs a CC-REV-2 amendment over the registry's `writeSurface` and a new registry act, since the current bytes are digest-bound; (b) ship **stage 1 only** — the unpromoted note, which VIS-6(a) permits as personal presentation state that "may never affect truth, work, status, or certificates" (lines 171–173) — and ship no promotion at all; (c) promote into **Syzygy's own** `.syzygy/local/`, the directory architecture.md line 57 names ("personal presentation state (VIS-6a; never truth-bearing)"), which does not exist here either — **0** tracked files under `.syzygy/local/` or `.syzygy/cache/` over **556** tracked files under `.syzygy/` [Observed, swept this session] — and which is not the governed plane VIS-6(a)'s promotion sentence names; (d) do not build the note at all. **The counter-argument to (b), and it is why this is a question:** a note that can never be promoted is a note the owner writes into a directory that is deleted with the daemon's temp path, which is close to the "leave the page" response L2-F4 says is the only one available today. **Default if unanswered: no note ships, promoted or unpromoted.** |
| Q5 | **Is a dismissal that acts on a claim's own epistemic tuple an implementation of PWB-REQ-007, or an amendment to it?** PWB-REQ-007 fixes the tuple, verbatim at `openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md` lines 443–446: "Every project entity and project-fact claim SHALL have a stable semantic Claim identity plus an evaluation instance, be challengeable with resolvable support, and carry the closed label, tier, exactly one primary reason, zero or more closed secondary reasons, freshness, challenge state and evaluation identity that govern it." Its Case line enumerates "every admitted label, tier, reason, freshness, **challenge** and sibling state" (lines 454–456). In the implementation the challenge vocabulary is closed at one value: `export const CHALLENGE_STATES = ['unchallenged'] as const;` (`packages/three-surface-poc-core/src/project-shape-model.ts` line 83), above the comment "The POC has no challenge mechanism (RFC2-8 challenges are a deferred wave), so the only challenge state a claim can carry is closed at one" (lines 81–82). | **It is an amendment, and it needs a CC-REV-2 semantic delta plus a new owner act — this packet does not call the dismissal lawful or unlawful, only that the path to it is not conformance.** Adding a second admitted challenge value changes the closed vocabulary a signed requirement's Case line quantifies over. **The counter-argument:** PWB-REQ-007's sentence names "challenge state" without enumerating its values, so an owner may read the closed set as the implementation's choice rather than the specification's — in which case widening it is code against unchanged text. **Second lawful arm:** implement the dismissal **beside** the tuple, as its own disclosed claim with its own identity, leaving every existing tuple byte-identical — which needs no amendment but is exactly the "view filter over a rendered list" shape L2-M8 argues would violate VIS-6(a), so it trades one objection for another. **Third lawful arm:** do not build it. **A bound on every arm, quoted not argued:** doctrine already fixes the expiry's mechanism — "a dismissal without a reason current at the evaluation's as-of instant renders the gap again — expiry acts only through a new identified evaluation" (vision.md lines 175–177) — so no arm may evaluate an expiry against the wall clock. **Default if unanswered: slice 4 does not ship.** |
| Q6 | **Which evaluation does a delta claim belong to?** A delta is a statement about two identified evaluations and is true at neither alone. Doctrine's temporal rule, verbatim at `.syzygy/governance/doctrine/architecture.md` lines 221–229, fixes what a status evaluation is and what time may do to it: "Time is an explicit input, never an ambient one. A **status evaluation** is identified by the pair (source snapshot, **as-of instant**); every time-sensitive judgment — evidence currency, staleness, dismissal expiry — is computed at the evaluation's as-of instant. A wall clock never silently alters a displayed status: the passage of time changes a status only through a new identified evaluation, and it may only degrade a claim (toward stale or Unknown), never establish or improve one — **improvement requires a new source snapshot containing a permitted authoritative input, such as new evidence or an adjudication result**." M2's packet reached the same fork and ruled its own: its Q3 answer is "A second identified evaluation, never a freshness value" (docs/design/POLARIS-M2-EVIDENCE-CURRENCY-FUNNEL.md line 47, read read-only in the M2 worktree at `f2f37dd`). | **Render the delta as a claim of the current evaluation *about* two evaluations, carrying both identities, never as a field of either claim's tuple and never as a freshness value.** That keeps the pinned evaluation's tuples byte-identical, which is what PWB-REQ-014's anchor sentence requires of a captured target state ("Each anchor SHALL retain the target's captured label, tier and reason and SHALL not rewrite that target state on later reads", spec lines 770–771). **The counter-argument:** a claim of the current evaluation that reports a *transition* is reporting a fact no single snapshot contains, which is the shape architecture.md's "a source not captured in the snapshot must not influence its deterministic claims" (lines 217–219) exists to forbid — and reading a retained record as a *captured source* of the current evaluation is a construction, not a quotation. **Second lawful arm:** the delta is its own third identified evaluation, with its own identity and its own as-of instant, exactly as M2's horizon is. **Third lawful arm:** the delta is not a claim at all but a disclosed rendering artifact under PWB-REQ-014's "explicitly non-normative framing" role (spec lines 764–765), carrying no epistemic tuple. **Default if unanswered: the third arm** — the smallest claim, and the only one that mints no new evaluation identity. |

### Decided in this packet, not put to the owner

**The dossier's prerequisite line cannot be read off as written: its
first clause cannot be asserted without ruling Q1.** [This sentence read
"The dossier's prerequisite line does not survive as written, and the
half that fails is the first half" until 2026-09-15 — a form that
asserts Q1's own recommended answer as decided, inside a section headed
"not put to the owner"; review 2's G1. Superseded in place, not
deleted.] The dossier's line, quoted whole from
`docs/pursuits/2026-09-13-vision-pursuit.md` lines 415–416 at `a9f671e`:

> - **Prerequisite.** None for retention and delta; owner act for the note
>   (retention posture); spec amendment for dismissal.

The second and third clauses hold — and the second is weaker than the act
text, which forbids the write outright rather than merely failing to cover it
(Q4). **The first clause cannot be asserted without ruling Q1**, because
retention is the one part of this move that touches a *named* escalation
trigger by its own noun. The continuation act's trigger list says "a change
to security, privacy, or **retention** posture beyond the 2026-09-05
approved secret-classification policy" (lines 150–156, quoted whole in Q1),
and slice 1 is a proposal to retain something the daemon has never retained.
Whether "beyond" reaches slice 1's derived claim-state record is exactly
what Q1 asks — and on Q1's second and third lawful arms, which rule the
record inside the existing authorization on the same-posture reading or on
the narrower disclosure-limited one, the dossier's first clause stands. This
packet does not rule which reading the trigger bears [Inferred].

[This paragraph read "The **first clause does not**: retention is the one
part of this move that touches a *named* escalation trigger by its own
noun" until 2026-09-15. Review 2's G1: that wording asserts Q1's own
recommended answer as decided, in the section that says it is not put to
the owner, and Q1's second and third arms both leave the dossier's first
clause standing. Re-cast above as what Q1 asks; superseded wording marked
in place, not deleted. **Q1 itself is untouched** — same question, same
recommended answer, same three lawful arms, same default if unanswered,
byte for byte against `git show 4d61b73:` of this file.]

**What the evidence supports, stated exactly.** The dossier did read
retention posture into this move: it named the retention-posture trigger by
the trigger's own noun and attached it to the *note's* owner act, while
giving "none" for retention and delta. Whether that trigger also reaches
slice 1's derived claim-state record is Q1, and this packet does not rule it
[Observed for the act text and for the dossier line as quoted above; the
reading is the owner's to make, not this packet's]. [Until 2026-09-15 this
paragraph quoted the dossier value as "none for retention and delta; owner
act for the note; spec amendment for dismissal" — eliding "(retention
posture)" with no ellipsis — and closed: "what is not open is that the
dossier's 'none' was reached without the trigger list being read [Observed
for the act text and the dossier value; Inferred for the consequence]".
Review 1's F1, its one blocking finding: on the full line that ruling does
not stand, and a ruling about what another author did or did not read is not
a delegate's to make on this evidence. **The ruling is withdrawn.** The
question is unchanged: Q1's recommended answer, its three lawful arms and its
default if unanswered are exactly what they were.]

**The delta does not depend on M10, and the dossier's "Depends on … M10's
stable id" is a dependency this packet could not reproduce.** The dossier's
M12 section says the move "Depends on M2's horizon and M10's stable id".
M10's stable id is its slice 5, `logicalId`, and its subject is **narrative
anchor targets**: "Beside the existing revision-scoped `targetId`, a
sibling… opaque, revision-independent, never an anchor identity", landing in
`apps/three-surface-poc/src/polaris-narrative.ts`'s anchor constructors (the
M10 packet, docs/design/POLARIS-M10-MACHINE-CONTRACT-FUNNEL.md lines
1004–1018 and its Gate 3 row at line 722, read read-only in the M10
worktree at `95f31cb`). A claim-state delta does not join anchors; it joins
**claims**, and the claim identity it needs already exists, is already
revision-independent, and is already required to be stable by a signed
requirement:

- The type says so: "Stable semantic identity: the same subject keeps the
  same id across evaluations; `evaluationId` is the instance."
  (`packages/three-surface-poc-core/src/project-shape-model.ts` lines
  121–122, above `readonly claimId: string;` at 123).
- The specification says so: PWB-REQ-007's Case line requires the sweep to
  "enumerate every project entity, claim and aggregate across **two
  evaluations of the same semantic subjects**" and its Oracle line requires
  the checker to "verify stable semantic identity across the two evaluation
  instances" (PWB spec lines 453–454 and 460–461).
- The construction says so: all **six** interpolating `claimId` sites build a
  path, an item class and key, a fact name, a class name or an account key,
  and **none interpolates a revision** (`project-shape-model.ts` lines 367,
  375, 383, 403, 430 and **447** — the last being the Unknown arm of
  `projectAccountOf`, which interpolates the same closed-vocabulary account
  key as 430) [Observed, all six read at source this session. Predicate: the
  literal `claimId:` over that file returns **13** lines — the six above,
  **4** carrying the fixed literal `'claim:project-shape'` (345, 457, 611,
  659), **2** interface declarations (123, 157) and **1** pass-through
  (173)]. [This bullet read "all five … lines 367, 375, 383, 403, 430" until
  2026-09-15, omitting 447; review 1's F3. The conclusion is unchanged, since
  447 interpolates no revision either. Review 1 also states the file carries
  twelve `claimId:` lines of which "the remaining six are the fixed literal";
  re-derived here the count is **13** and the fixed-literal sites are **4**,
  so that half of the finding is **not confirmed** and is recorded rather
  than copied.]

So M10's Q5 is a genuine sequencing neighbour on the *constructor file*, and
this packet records that; it is not a prerequisite for the join key slice 2
needs, and **nothing in this packet decides any of M10's six questions**.

**What a claim-state delta would actually have found, measured rather than
assumed — and it is not what L2-M6 expects.** L2-M6 proposes appending "each
evaluation's canonical claim-state multiset (claimId -> epistemic tuple)"
and a band listing "only claims whose tuple differs". Over the retained
machine capture there are **1,149** claim objects, **1,148** distinct claim
identities — and exactly **2** distinct (epistemic, challenge) tuples across
all of them: 1,137 objects carry the tuple
`Observed / report-fact / fresh / unchallenged` and 12 carry
`Unknown / excluded-content (primary) / fresh / unchallenged`
[Observed, computed this session over the retained
`/api/poc` body; denominator the 1,149 objects found by a recursive sweep
for every object carrying both a `claimId` and an `epistemic` member]. A
tuple-difference band over that model is a band whose signal is almost
entirely **membership** — claims that appeared or disappeared — and only
marginally transition. The design in Gate 4 follows the measurement: the
band reports added, removed and tuple-changed as three separate counts with
one denominator, and does not present "tuple-changed" as the interesting
number. This is a correction to the move's shape, not to its warrant.

**One duplicate claim identity exists today, and a delta keyed naively on
`claimId` would double-count it.** Of the 1,149 claim objects, one identity
occurs twice — the same claim rendered once inside the project-shape item
list and once as the proposed work's current-authority citation, with
identical tuple and identical evaluation id [Observed, located this session
at the machine paths `projectShape.items[].claim` and
`proposedWork.currentAuthority.claim`]. This is the same per-tuple-never-
per-id shape AGENTS.md records for the PWB-REQ-020 parity sweep. The slice 2
oracle in Gate 4 asserts against both a **tuple** count and a **distinct
identity** count for exactly this reason.

**Both "already written twice" appenders are unreachable from production
code, and the dossier's sentence is about a pattern rather than a
mechanism.** L2-M6 proposes "reusing the `appendEvaluation` pattern already
written twice in this codebase". Both functions exist and both are exactly
as described. Neither is called anywhere but a test, and neither is
re-exported from the package index: over all of `apps/`, `packages/` and
`scripts/`, `appendEvaluation` occurs at **5** sites and
`appendJudgmentEvaluation` at **6**, and of those eleven, **2** are the
definitions and **9** are in `*.test.ts` files (4 and 5 respectively); a
search for either name in
`packages/three-surface-poc-core/src/index.ts` returns **0** [Observed,
swept this session; denominator every `.ts` file under those three trees].
So there is a proven *shape* to copy and **no persistence whatever** to
extend — which is the same thing L2-F5 found from the other end.

**Neither history is persisted, and the sweep that establishes it is
complete.** Every write into the daemon's state directory, across the three
source trees the prompt names, is one of exactly **three** sites, each
writing one named file with an explicit mode:

| Site | Writes | Mode |
|---|---|---|
| `packages/cap1-daemon/src/credentials.ts` lines 223–227 | `machine-credential.token` | dir `0o700`, file `0o600` |
| `packages/three-surface-poc-core/src/materialization.ts` lines 128–134 | `materialization-record.json` | dir `0o700`, file `0o600` |
| `packages/three-surface-poc-core/src/test-artifact-verification.ts` lines 73–79 | the test-artifact record | dir `0o700`, file `0o600` |

Predicate: the literal alternation `writeFileSync|writeFile|appendFileSync|appendFile|mkdirSync|mkdir|authorizeWrite|createWriteStream|rmSync|unlinkSync|renameSync|openSync|chmodSync`
as a Python `re` word-boundary match (verification rule 1: not a
`[^]]`-style class), over the **157** `.ts` files under
`apps/three-surface-poc/src`, `packages/three-surface-poc-core/src` and
`packages/cap1-daemon/src`, of which **81** are non-test. Result: **56**
matching lines in non-test files. Every one was read this session and
classified, and the partition is exhaustive and sums to 56: **11** import
lines; **31** writes in command-line entry points and test fixtures
(`fresh-checkout-demo-main.ts`, `polaris-accessibility-main.ts`,
`pwb-mutation-run-main.ts`, `pwb-mutation-sweep-main.ts`,
`capture-test-artifact-main.ts`, `cdp-browser.ts`,
`polaris-generation/pipeline-demo-main.ts`, `test-model-fixture.ts`); **2**
clear/delete helpers for the two records above; **3** comment lines naming
`authorizeWrite` in `packages/cap1-daemon/src/write-guard.ts` and
`packages/cap1-daemon/src/consent-loading.ts`; **2** the governed-plane
write path at `write-guard.ts` lines 187–188, which writes into
`openspec/**` or `.syzygy/**` and never into the state directory; **1** the
`authorizeWrite` call at `write-guard.ts` line 152; and **6** the three
state-directory sites above, two lines each. **0** of the 56 writes an
evaluation, an observation, a claim state or a judgment [Observed, every
line read this session].

And the retained capture agrees end to end: its state directory holds
**one** entry, `machine-credential.token`, 64 bytes, mode `0600`, in a
directory at mode `0700` [Observed, listed this session by name only; no
content was read].

**The exact-contents assertion M11 was blocked by does not bind the POC's
state directory, and this is the one place M11's analysis does not carry
over.** `packages/cap1-system/src/state-dir.system.test.ts` line 294 reads
`expect(readdirSync(benignTarget)).toEqual(['machine-credential.token'])`,
and M11's "no pidfile" decision turns on it. That test spawns
`apps/syzygy/dist/main.js` — the **Capability 1** daemon
(`packages/cap1-system/src/harness.ts` lines 29–31 and 126–139) — not the
POC. Over all of `apps/` and `packages/`, `readdirSync` occurs at **19**
sites in **8** files, and **exactly one** of them asserts a state
directory's exact contents: that line [Observed, swept this session;
denominator every `.ts` file under the two trees]. The POC's own state
directory already admits three files by construction and no test asserts
its contents at all. A retained evaluation record therefore breaks no
existing assertion — which removes the blocker, and **does not** answer Q1,
which is about posture rather than about a test.

**The two dossier line spans that are imprecise, corrected rather than
repeated.** Both stop one line short of the construct they name, at both
`f4589e2` and `a9f671e`:

| Dossier citation | What is actually there | Verdict |
|---|---|---|
| `body-read-authority.ts` 754-766 | The head comment begins at 754 and `export function appendEvaluation(` at 757; the body's `return` is at 766 and the closing brace at **767** | narrowed by one line at the tail |
| `walkthrough-judgment.ts` 810-823 | The head comment begins at 810 and `export function appendJudgmentEvaluation(` at 813; the `return` is at 823 and the closing brace at **824** | narrowed by one line at the tail |

Every other M12 citation re-locates exactly: `main.ts` line 134 is
`const asOf = new Date().toISOString();`; `project-shape-model.ts` 120–131
is the whole `ProjectShapeClaim` interface; vision.md 167–181 is VIS-6
entire (182 is blank); architecture.md 56–57 are the `cache/` and `local/`
rows; PWB spec line 439 is PWB-REQ-007's heading. **One dossier citation
does not support what it is cited for:** L2-M8's evidence lists
`project-shape-model.ts:89-102` beside `:120-131` as the `ChallengeState`
seam, but 89–102 is the `UNKNOWN_REASON_ROUTES` map — the twelve RFC2-24
resolution routes — and the challenge seam is at lines **81–84**
(`CHALLENGE_STATES` at 83, `ChallengeState` at 84) and line **129** (the
`challenge` field) [Observed, all read at source this session]. Nothing in
L2-M8's argument moves; the cite is repaired here rather than carried.

**No new bead is filed by this packet.** All four slices run under
`syzygy-dov.12`, the pursuit bead.

**The register row is P-79, and it landed with review 1.** At `a9f671e`
`.syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md` carries **26** rows
under the predicate `^| P-` — **21** open and **5** acceptance-act,
partitioned by the `##` section each row falls under — the highest number
appearing anywhere in the file is **P-67**, and the predicate `P-7[0-9]`
returns **0** hits [Observed, re-derived this session with Python `re`].
**P-79 is written on this branch in the review-1 pass**, taking this branch to
**22** open rows and **5** acceptance-act rows, **27** in all. The sibling
rows P-68…P-78 each live only on their own branch and none of them is on
main's register at this baseline. [This paragraph opened "**No register row
lands here.** Q1–Q6 would take **P-79**" and closed "the row for this packet
lands with review 1, batched, by instruction" until 2026-09-15; review 1 has
landed and the row with it.]

## Gate 0 — Baseline

| Pillar | Present | Constrains this request |
|---|---|---|
| Doctrine | `.syzygy/governance/doctrine/vision.md`, `.syzygy/governance/doctrine/architecture.md`, `.syzygy/governance/doctrine/security.md` | VIS-6 is the whole warrant (both exceptions); VIS-2 bounds what a delta may render; VIS-1 ranks the slices; VIS-4 keeps every gate human; SEC-4 and SEC-5 bound slices 1 and 3; SEC-1, SEC-2 and SEC-3 are swept and not engaged — Gate 2 says why |
| Decisions | `.syzygy/governance/decisions/THREE-SURFACE-POC-MODE-DIRECTION.md`, `.syzygy/governance/decisions/THREE-SURFACE-POC-IMPROVEMENT-CYCLES-DIRECTION.md`, `.syzygy/governance/decisions/PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md`, `.syzygy/governance/decisions/PWB-IMPLEMENTATION-AUTHORIZATION-CONTINUATION-ACT.md`, `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-ENTRY-AMENDMENT-ACT.md`, `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-ACT.md` | the first two authorize the POC and its improvement cycles; the third carries the write prohibition Q4 quotes; the fourth carries the retention trigger Q1 quotes; the fifth binds the registry bytes, including `"writeSurface": []`; the sixth binds the policy whose retention clause Q1 turns on |
| Specification | `openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md` (17 requirements, 31 scenarios, **1,152** lines) and `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md` (24 requirements, 24 scenarios, **1,008** lines) | PWB-REQ-007 fixes the tuple slice 4 would change and supplies the stable-identity sentence slice 2 needs; PWB-REQ-014 governs the delta band as a narrative unit and carries the personal-view-state prohibition slice 3 must satisfy; PWB-REQ-020 forces parity on any rendered delta fact; POC-REQ-032 and POC-REQ-060 bound the rendering [Observed, counted this session with the predicates `^### Requirement` and `^#### Scenario`] |
| Registry | `.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json` | digest-bound; its `"writeSurface": []` at line 125 is the bound Q4 names; **no slice edits it** |
| Policy (act-bound) | `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` | its `rawBodyHandling` block (lines 178–184) is the retention clause the continuation act's trigger measures "beyond"; **no slice edits it** |
| Contracts | `.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md` (RFC2-26), `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md` (RFC5-11) | RFC2-26's phase rule is run over all four slice rows in Gate 5; RFC5-11 separates a boundary *act* from a truth *claim*, which is what a note write is |
| Policies | `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` (CC-REV-2) | the amendment path Q5's first arm needs |

**Which statuses these acts are in.** `PROJECT-STATUS.md` is the page that
says which acts are in force and this packet restates none of its rows; each
decision record above was read at source this session and each is a dated
owner act or direction carrying no supersession notice naming it [Observed].
The registry JSON's own head says
`"status": "candidate-amendment-no-effect-until-owner-act"` (line 4) and the
secret-classification policy's filename ends `-CANDIDATE.json`; both are
**pre-act banners over bytes an act bound**, the same shape AGENTS.md
records for both adopted specifications. Read the act record, never the
package banner.

**One act that sounds relevant and is not.**
`.syzygy/governance/decisions/POLARIS-POST-CEILING-CORRECTION-AUTHORIZATION.md`
concerns a reconciliation-review ceiling and one edit to a design document;
it has nothing to do with retention, with a response ceiling, or with a
write into an observed repository, and no slice rides it [Observed, the
whole 30-line file read this session].

## Gate 1 — Motif

**A project that cannot remember yesterday cannot show what changed, and an
owner who knows a rendered claim is wrong has nowhere to put that
knowledge.** These are two halves of one doctrine rule. VIS-6 closes the set
of things Syzygy may hold that are not rebuildable at exactly two: the
owner's personal presentation state, with a specified promotion path, and
observation records, exempted from rebuildability *so that they may be
kept*. **Neither exception is implemented at all.**

**The specific shape, in four measurements.** (1) The evaluation instant is
minted once per model build and never stored: `main.ts` line 134 is
`const asOf = new Date().toISOString();`, inside a `buildModel()` closure
declared at line 113 and called at exactly **two** sites — line 187 at
startup and line 201 in `onMaterialized` [Observed; predicate: the literal
`buildModel()` in that file **excluding its own declaration at line 113**.
The raw literal occurs at **3** lines — 113, 187 and 201 — because the
declaration line contains it; **2** is the call-site count. This bracket
read "the only two occurrences of the literal `buildModel()` in the file"
until 2026-09-15, which is not a predicate that yields 2 — review 2's G2,
re-counted at source this session]. The underlying
`buildButlersPocModel(` has **3** non-test call sites across all trees, the
definition at `packages/three-surface-poc-core/src/model.ts` line 369, the
one production call at `main.ts` line 171 and one in
`apps/three-surface-poc/src/test-model-fixture.ts` line 133, plus 33 in
tests]. (2) Nothing writes an evaluation anywhere: three state-directory
write sites, none of them an evaluation, over a 56-line sweep enumerated
above; the retained capture's state directory holds one file. (3) The
evaluation identity does reach the owner, but only as an opaque footer
string. `pageShell`'s footer is filled at **3** sites that name the
evaluation — `apps/three-surface-poc/src/routes.ts` line 92,
`apps/three-surface-poc/src/polaris.ts` line 1630 and
`apps/three-surface-poc/src/polaris-source.ts` line 140 — each interpolating
`model.evaluation.snapshot` and `model.evaluation.asOf` into "Evaluation
<code>…</code> as of <code>…</code>." The rendered `snapshot` is a
four-field composite — an observed-repository revision, a working-tree
sha256, an observer revision and an inputs sha256, joined by `|` and built
at `packages/three-surface-poc-core/src/model.ts` line 689 — which in the
retained capture is a single **262**-character code span beside a
24-character instant [Observed, measured
this session; the field values are described, never reproduced, per CG-15].
(4) There is no place in the model for a note, a dismissal, an annotation or
an expiry: over both POC source trees plus `packages/cap1-core/src`, the
words `annotation`, `dismissal`, `presentationState` and `bookmark` have
**0** functional occurrences, which is L2-F4's own sweep and which this
packet reproduces at the specification level in Gate 5.

**And the two append-only appenders are a rehearsal nobody performed.**
`appendEvaluation` and `appendJudgmentEvaluation` are byte-for-byte the same
function over two types, each with a duplicate-identity guard and a
`deepFreeze`, each with a comment saying history "is append-only" and "never
rewrites" — and each reachable only from its own test file. The POC has
written the mechanism for keeping history twice and has never kept any.

**Success criteria, per slice.** Slice 1: after two runs, the daemon's state
directory holds two evaluation records and the older one is byte-identical
to what the first run wrote. Slice 2: a reader who opens Polaris after a new
Butlers commit is told how many claims appeared, how many disappeared, how
many changed tuple and out of how many — or is told, by name, that no prior
evaluation exists. Slice 3: the owner can attach a reasoned note to a claim
identity and that note changes no tuple, no count and no machine fact. Slice
4: a dismissal suppresses a gap only while its reason is current at the
evaluation's own as-of instant, and the gap returns by itself at the first
evaluation past the expiry.

**What M12 is not.** It is not a new observation, not a wider content class,
not a second repository, not a provider call, and not a challenge lifecycle
(RFC2-8 challenges are a deferred wave and stay deferred). Slices 1 and 2
write only into `apps/**`, `packages/**` and `docs/**`. Slices 3 and 4 are
sketched and **do not ship in this move's default**; slice 3's promotion
arm would write into a repository the act in force forbids writing to, and
slice 4 would change a tuple a signed requirement fixes.

## Measurements at `a9f671e`

Every figure below was taken this session in the worktree at `a9f671e`.
Method, predicate, denominator and raw output for each are in the evidence
record beside this packet.

### The one observation instant, and every place the model is built

`apps/three-surface-poc/src/main.ts` line 134, quoted at the site:

```
const asOf = new Date().toISOString();
```

It sits inside `function buildModel(): ReturnType<typeof buildButlersPocModel>`
(line 113) and is passed to the builder twice — once as
`evaluation: { snapshot, asOf }` (line 175) and once interpolated into two
per-run evaluation identities, `evaluation:pwb-body-read:${asOf}` (line 148)
and `evaluation:pwb-walkthrough-judgment:${asOf}` (line 168) [Observed, all
four read at source].

`buildModel()` is called at exactly **2** sites, under the predicate "the
literal `buildModel()` occurring in `apps/three-surface-poc/src/main.ts`,
**excluding the declaration at line 113**", denominator that file's
**253** lines. Without the exclusion the same literal occurs at **3**
lines — 113, 187 and 201 [Observed, `grep -n -F` this session; denominator
those 253 lines]. [The predicate was published without its exclusion
clause until 2026-09-15, so as written it returned 3 rather than the 2
stated; review 2's G2. The two call sites, and everything that rests on
them, are unchanged.]

| Line | Occasion | What the instant becomes |
|---|---|---|
| 187 | daemon startup: `let model = buildModel();` | the whole run's evaluation, unless a materialize arrives |
| 201 | `onMaterialized: () => { model = buildModel(); }` | a **new** evaluation, with a new `asOf` and a new inputs digest, replacing the old one in the closure the routes read |

So there are already **two** occasions on which an evaluation is created and
the previous one is discarded, and the second is human-triggered. Nothing
observes either transition. [Observed.]

### Nothing writes an evaluation: the sweep, its predicate and its denominator

Stated in full under "Decided in this packet" above. In summary: **157**
`.ts` files across the three trees, **81** non-test; **56** matching lines
under the write-verb alternation, partitioned exhaustively; **3** state-
directory write sites, writing the machine credential, the materialization
record and the test-artifact record; **0** writing an evaluation, an
observation, a claim state or a judgment.

The retained capture is the end-to-end confirmation: its state directory
holds one entry named `machine-credential.token`, 64 bytes, mode `0600`,
inside a directory at mode `0700`. Its contents were not read.

### The two append-only appenders, quoted whole

`packages/three-surface-poc-core/src/body-read-authority.ts`, the head
comment at 754–756 and the function at 757–767:

```
// Evaluation history is append-only: a later evaluation (for example one
// whose A1 correlation succeeded) is a new entry and never rewrites the
// state under which an earlier read occurred (PWB-REQ-005).
export function appendEvaluation(
  history: readonly BodyReadAuthorityEvaluation[],
  evaluation: BodyReadAuthorityEvaluation,
): readonly BodyReadAuthorityEvaluation[] {
  for (const earlier of history) {
    if (earlier.evaluationId === evaluation.evaluationId) {
      throw new Error(`evaluation ${evaluation.evaluationId} is already recorded; history is append-only`);
    }
  }
  return Object.freeze([...history, deepFreeze(evaluation)]);
}
```

`packages/three-surface-poc-core/src/walkthrough-judgment.ts`, the head
comment at 810–812 and the function at 813–824, is the same function over
`WalkthroughJudgmentEvaluation`, citing PWB-REQ-022 instead of PWB-REQ-005
and carrying one extra line the first does not, at line 818:
`// mutation-point: history-append-only`
— the rule-6 anchor the existing mutation suite already targets.

**Is either history persisted?** No. Both take a `history` array as an
argument and return a new frozen array; neither reads or writes a file;
neither is called outside its own test; neither is re-exported from
`packages/three-surface-poc-core/src/index.ts` [Observed, swept this
session: 5 occurrences of `appendEvaluation` and 6 of
`appendJudgmentEvaluation` across every `.ts` file under `apps/`,
`packages/` and `scripts/`, of which 2 are the definitions and 9 are inside
`*.test.ts`; 0 occurrences of either name in the package index]. **The
history they guard lives for the duration of one expression in one test.**

### `canonicalJson` and its three digest users

`packages/three-surface-poc-core/src/project-shape-manifest.ts` lines
331–335, quoted whole:

```
// Key-sorted JSON with `undefined` members dropped; the one canonical form
// every PWB sha256 identity (manifest, resource limits, observation) uses.
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
```

Over both POC trees it has **7** occurrences: the definition (333), one
in-file caller (`canonicalManifestJson`, 338), one import (**36** of
`project-shape-observation.ts`), one import (22 of `walkthrough-readiness.ts`)
and **3** digest sites [Observed, swept this session over every `.ts` file
under `apps/` and `packages/`; the import line read "336" until 2026-09-15 —
review 1's F9 — where line 336 is inside `resourceLimitsDigest` and the import
is the `canonicalJson,` member of the import list at line 36]:

| Site | Function | What it identifies |
|---|---|---|
| `project-shape-observation.ts` line 337 | `resourceLimitsDigest(limits)` | the declared resource envelope |
| `project-shape-observation.ts` line 635 | inline, in the observation builder | the **observation digest**, over the whole observation with every capture instant stripped (`stripCaptureInstant`, lines 642–650) |
| `walkthrough-readiness.ts` line 126 | `walkthroughEvaluationIdentity(shape)` | the readiness evaluation identity, `pwb-eval-` plus the first 24 hex characters |

### Which digests identify an evaluation today, and where the owner sees them

Four values, each computed in a different place:

| Field | Computed at | In the footer? |
|---|---|---|
| observed-repository revision | resolved before the model is built and passed in as `repositoryRevision` | yes, first field |
| working-tree digest | passed in as `workingTreeDigest`, composed into `snapshot` at `main.ts` lines 101–105 | yes, second field |
| observer revision | passed in as `observerRevision` | yes, third field |
| `inputsDigest` | `packages/three-surface-poc-core/src/model.ts` line 381, `sha256` over a five-key object — `repoRoot`, `repositoryRevision`, `observerRevision`, a five-artifact array, and a `mappingDigest` (lines 381–389) — and surfaced as `evaluation.inputsDigest` at line 691 | yes, fourth field |
| observation digest | `project-shape-observation.ts` line 635 | **no** |
| readiness evaluation identity | `walkthrough-readiness.ts` line 126 | **no** |

The footer is built at **3** sites — `routes.ts` line 92, `polaris.ts` line
1630 and `polaris-source.ts` line 140 — each interpolating
`model.evaluation.snapshot` and `model.evaluation.asOf` into
`Evaluation <code>…</code> as of <code>…</code>.`; the `routes.ts` one
appends a sentence about the machine endpoint. `snapshot` itself is composed
at `model.ts` line 689 as `` `${input.evaluation.snapshot}|inputs:sha256:${inputDigest}` ``.
In the retained capture the rendered `snapshot` is **262** characters inside
one `<code>` element and the instant is **24** more [Observed, measured this
session; the four field values are described by label and never reproduced,
per CG-15].

**What this means for a delta.** An evaluation's *identity* is already
complete and already rendered; what is missing is only that it is never
written down. A retained record needs to mint nothing.

### The claim population, and what a delta over it would actually say

Computed this session over the retained `/api/poc` body
(5,508,208 bytes on disk, evaluation as-of 2026-09-13T02:03:33.040Z).
Predicate: every JSON object anywhere in the payload carrying **both** a
`claimId` and an `epistemic` member, found by a recursive walk.

| Figure | Value |
|---|---|
| claim objects (tuple instances) | **1,149** |
| distinct claim identities | **1,148** |
| identities occurring twice | **1** |
| distinct (epistemic, challenge) tuples | **2** |
| objects carrying `Observed / report-fact / fresh / unchallenged` | **1,137** |
| objects carrying `Unknown / excluded-content / fresh / unchallenged` | **12** |
| canonical `claimId → {epistemic, challenge}` map | **177,031** bytes |
| the same map with `resolutionRoutes` added | **203,379** bytes |

By identity prefix, counting **distinct identities**: 278 `claim:source:`,
**415** `claim:item:`, 439 `claim:fact:`, 9 `claim:class:`, 6
`claim:project-account:` and 1 `claim:project-shape`, summing to **1,148**.
By the same prefixes, counting **claim objects (tuple instances)**: 278,
**416**, 439, 9, 6 and 1, summing to **1,149**. The single identity that
occurs twice is an item claim, which is the whole difference between the two
rows. The `claim:fact:` 439 decomposes **415** `item:`, **9** `count:`, **9**
`catalog-count:` and **6** `project-account:` [Observed, all three counts run
this session under the recursive-walk predicate above]. [The first row read
"416 `claim:item:` … summing to 1,148" until 2026-09-15, publishing a tuple
count as an identity count so that the six figures actually summed to 1,149;
review 1's F2 — the per-tuple-never-per-id trap this packet cites AGENTS.md
about, landing in this packet's own table.]

**The consequence for the design, stated plainly.** Two distinct tuples over
1,149 objects means a band that lists "only claims whose tuple differs" is a
band that will usually list nothing, while the population underneath it
changes substantially — 278 source identities are repository paths, and a
Butlers commit that adds or removes a declaration changes the identity set
without changing any surviving claim's tuple. **Membership is the signal;
transition is the rare case.** A band that reports only transitions would be
silently green in exactly the situation VIS-2 exists for.

### The stable identity a delta needs already exists, and carries no revision

`packages/three-surface-poc-core/src/project-shape-claim.ts` does not exist;
the type lives in `project-shape-model.ts` lines 120–131, quoted whole:

```
export interface ProjectShapeClaim {
  // Stable semantic identity: the same subject keeps the same id across
  // evaluations; `evaluationId` is the instance.
  readonly claimId: string;
  readonly evaluationId: string;
  // cap1-core's tuple verbatim: label, tier, reasons (primary + secondary), freshness.
  readonly epistemic: EpistemicState;
  // One route per carried reason, RFC2-24 order preserved.
  readonly resolutionRoutes: readonly ResolutionRoute[];
  readonly challenge: ChallengeState;
  readonly support: readonly ProjectShapeSupport[];
}
```

`EpistemicState` is the diffable object: a three-arm discriminated union at
`packages/cap1-core/src/epistemic.ts` lines 50–67, whose arms are
`{label: Observed|Inferred, tier?, freshness?}`,
`{label: Unknown, reasons: UnknownReasonSet, tier?, freshness?}` and
`{label: Unknown, basis: 'deferred', tier?, freshness?}` [Observed, read at
source]. So **an epistemic tuple type a delta could diff already exists**,
is already closed, and is already the thing both channels render.

### The challenge seam L2-M8 proposes to extend

`packages/three-surface-poc-core/src/project-shape-model.ts` lines 81–84,
quoted whole:

```
// The POC has no challenge mechanism (RFC2-8 challenges are a deferred
// wave), so the only challenge state a claim can carry is closed at one.
export const CHALLENGE_STATES = ['unchallenged'] as const;
export type ChallengeState = (typeof CHALLENGE_STATES)[number];
```

Every producer and consumer of the `challenge` field, swept this session
over every `.ts` file under `apps/` and `packages/`. **Predicate, stated
because the obvious one is wrong:** the **case-insensitive substring**
`challenge`, with a line excluded only when its single occurrence is the
unrelated Unknown reason `challenge-suspended`; `dist/` and `node_modules`
excluded; denominator **246** `.ts` files. The word-boundary predicate
`\bchallenge\b` — which is what a first pass reaches for — returns **35**
lines **case-sensitively** and **misses the constant and the type**, because
`_` is a word character (so `CHALLENGE_STATES` has no boundary after
`CHALLENGE`) and `ChallengeState` has none either. Run four ways over the
same 246 files it returns **35** case-sensitive with the
`challenge-suspended` exclusion, **36** case-insensitive with it, **43**
case-sensitive without it and **44** case-insensitive without it. The
substring predicate returns **50** lines, of which **25** are in `*.test.ts`
files and **25** are not [Observed, all five predicates run this session].

The **15**-line difference between 50 and 35 splits **7 non-test / 8 test**,
and only **2** of the 15 lie inside the seam L2-M8 proposes to extend:
`project-shape-model.ts` lines **83** and **84**, which are `CHALLENGE_STATES`
and `ChallengeState` themselves. The other 5 non-test lines are
`packages/cap1-core/src/drawer.ts` 59, 60, 114, 138 and 174 — the unrelated
Capability 1 lifecycle no M12 slice touches — and the 8 test lines are
`polaris-epistemic-tuples.test.ts` 42, `polaris-first-reading.test.ts` 88,
`req-040.conformance.test.ts` 163, 196, 225 and 227, and
`project-shape-model.test.ts` 19 and 351 [Observed, enumerated this session;
7 + 8 = 15]. The substantive point stands and is exactly those 2: the
word-boundary reading drops the constant and the type, so it would misdescribe
the seam. [This passage stated the rejected predicate as case-insensitive and
said "the 15-line difference was entirely in the non-test population" until
2026-09-15; review 1's F5. Only the case-sensitive form yields 35, and the
split is 7/8, not 15/0.]

The 25 non-test lines, partitioned exhaustively:

| Role | Site | What it does |
|---|---|---|
| **Producer** — the only one | `project-shape-model.ts` line 177 | `challenge: 'unchallenged',` inside `function claim(...)`, the single constructor every project-shape claim passes through |
| Vocabulary, type and field | `project-shape-model.ts` lines 81-84 and 129 | the two comment lines, `CHALLENGE_STATES`, `ChallengeState`, and `readonly challenge: ChallengeState;` |
| Unrelated, same word | `project-shape-model.ts` line 98 | the `UNKNOWN_REASON_ROUTES` entry for the reason `challenge-suspended`, which is RFC2-24 vocabulary and not this seam |
| Consumer (render) | `apps/three-surface-poc/src/polaris.ts` lines 301 and 314 | the doc comment, and the span that emits `data-challenge-state="…"` and appends ` · <value>` to the visible tuple |
| Consumer (legend group) | `apps/three-surface-poc/src/polaris.ts` line 358 | renders the challenge group of the epistemic legend |
| Consumer (copy) | `apps/three-surface-poc/src/polaris-copy.ts` lines 33, 43, 50, 51 | the lede, the `suspended` tier sentence, the challenge label and the one-sentence gloss for `unchallenged` |
| Consumer (readiness terms) | `apps/three-surface-poc/src/walkthrough-preflight.ts` line 216 | `terms.add(claim.challenge);` |
| Unrelated subsystem | `packages/cap1-core/src/drawer.ts` lines 56, 57, 59, 60, 113, 114, 138, 174, 175, 176 | the Capability 1 challenge lifecycle (RFC2-13, RFC6-19 class 6), a different plane that no M12 slice touches |

The 25 test lines are 6 in `polaris-epistemic-tuples.test.ts` (including the
membership oracle at line 110, `expect(CHALLENGE).toContain(challenge);`,
and the per-claim equality at line 133), 4 in `polaris-first-reading.test.ts`,
4 in `project-shape-model.test.ts`, 1 in `polaris-narrative.test.ts`, 1 in
`polaris-proposed-work.test.ts` and 9 in
`packages/cap1-conformance/src/req-040.conformance.test.ts`, the last nine
belonging to the unrelated Capability 1 lifecycle [Observed, each file's
count computed this session].

**So L2-M8's seam is real and narrow**: one producer, one closed constant,
one rendered attribute, one legend sentence, one readiness term set, and a
test that asserts every rendered value is a member of the constant. That is
also exactly why widening it is a specification question (Q5) and not an
implementation detail.

### `.syzygy/local/` and `.syzygy/cache/`: an absence with two denominators

architecture.md lines 56–57, quoted whole (they are two rows of a fenced
directory tree, so the leading pipes and comment markers are the source's
own):

```
    ├── cache/           # derived, rebuildable projections (VIS-6)
    └── local/           # personal presentation state (VIS-6a; never truth-bearing)
```

**In this repository:** `.syzygy/` contains three directories —
`governance`, `intent` and `map`. Over the **556** tracked files under
`.syzygy/`, **0** have a path beginning `.syzygy/local/` or `.syzygy/cache/`
[Observed, `git ls-files .syzygy` this session; the repository tracks 1,216
files in all]. Git stores no empty directory, so this measures the tracked
population and not the authoring checkout — the same caveat P-55's ruling
records for two other directories.

**In the observed project, as far as the consented scope reaches:** over the
**278** distinct source paths in the retained observation, **0** begin
`.syzygy` and **0** carry a path segment `local`; the population has three
top-level segments and none is a governance root [Observed, computed this
session over the retained capture's `projectShape` block]. **The remainder
is [Unknown] and must stay so:** the observation's population is the
manifest's scope, not the repository, and establishing whether a governance
tree exists outside that scope would require a read outside the consented
content class, which every act in force forbids. So the honest statement is
*not* "the observed project has no governed plane" but "no governed plane is
visible anywhere Syzygy is permitted to look."

### The ceiling the delta band would charge against

| Figure | Value | Source |
|---|---|---|
| human ceiling (`maxHumanResponseBytes`) | 2,097,152 | `packages/three-surface-poc-core/src/project-shape-observation.ts` line 81 |
| machine ceiling (`maxMachineResponseBytes`) | 8,388,608 | same file, line 82 |
| `/polaris` served, tailnet, after M1 lane A | 1,484,487 | `docs/evidence/pwb-m1-polaris-lane-a-measurement-2026-09-13.json` |
| `/polaris` served, direct, after M1 lane A | 1,478,637 | same record |
| tailnet headroom | **612,665** | same record, `result.tailnetHeadroom.after` |
| direct headroom | **618,515** | the subtraction, computed this session |
| machine body | 5,520,314 | same record, `result.machineModelBytes` |
| machine headroom | **2,868,294** | the subtraction, computed this session |
| claim-tuple spans on the retained **pre-trim** page | **699** | measured this session |
| mean bytes per rendered tuple span, pre-trim | **586.3** (min 559, max 661, total 409,829) | measured this session |
| claim-tuple spans on the **post-trim** lane A after-captures | **713** | measured this session; identical on both host forms |
| mean bytes per rendered tuple span, post-trim | **586.4** (min 559, max 661, total 418,122) | measured this session |

The retained page is the **pre-trim** capture (2,090,025 bytes) — but the
lane A after-captures are post-trim (1,478,637 direct, 1,484,487 tailnet) and
were measured directly rather than reasoned about. The per-tuple cost is
**stable across the trim**: 586.3 before, 586.4 after, because lane A removed
narrative JSON and list markup and not tuple spans. The arithmetic below uses
the post-trim figure. Two tuples per delta row is **1,172.8** bytes;
**612,665 / 1,172.8 = 522.4**, so **522** full rows fit before the tailnet
ceiling is reached, against a population of 1,148 distinct claims
[Inferred — an extrapolation from a measured cost to a renderer that does
not exist]. [This paragraph read "so 586.3 is an upper bound on what a
post-lane-A renderer costs per tuple; the arithmetic below uses it as such
and says so. Two tuples per delta row is **1,172.6** bytes;
**612,665 / 1,172.6 = 522**" until 2026-09-15; review 1's F6. The
conservatism was claimed rather than measured, and the measurement that
refutes it was already in the same scratch tree the headroom figures come
from. The 522 does not move.]

### Line numbers re-verified at `a9f671e`

| Cited as | At `a9f671e` | Verdict |
|---|---|---|
| `main.ts`:134 (dossier) | `const asOf = new Date().toISOString();` | exact |
| `body-read-authority.ts`:754-766 (dossier) | comment 754-756, function 757-767 | narrowed by one at the tail |
| `walkthrough-judgment.ts`:810-823 (dossier) | comment 810-812, function 813-824 | narrowed by one at the tail |
| `project-shape-manifest.ts`:333 (prompt) | `export function canonicalJson(` | exact |
| `project-shape-observation.ts`:337, :635; `walkthrough-readiness.ts`:126 (prompt) | the three digest sites | exact, all three |
| `project-shape-model.ts`:84 (prompt), :129 (prompt) | `export type ChallengeState`, `readonly challenge: ChallengeState;` | exact, both |
| `project-shape-model.ts`:120-131 (L2-M8) | the whole `ProjectShapeClaim` interface | exact |
| `project-shape-model.ts`:89-102 (L2-M8) | `UNKNOWN_REASON_ROUTES`, not the challenge seam | **wrong referent**; the seam is 81-84 and 129 |
| `vision.md`:167-181 (prompt), :176-179 and :170-179 (L2-M6, L2-M8) | VIS-6 entire (182 is blank); the expiry sentence; the exception (a) span | **exact for 167-181; approximate for the other two.** The expiry parenthetical spans **175-177**, so L2-M6's 176-179 opens mid-sentence and runs two lines past it into exception (b); exception (a) itself ends on 177, so L2-M8's 170-179 overruns by the same two lines. Both are the dossier's spans, not this packet's, which cites 175-177 in Q5 [the verdict cell read "exact, all three" until 2026-09-15 — review 1's F12] |
| `architecture.md`:56-57 (L2-M7) | the `cache/` and `local/` rows | exact |
| `architecture.md`:221-229 (L2-M6) | the temporal rule, whole | exact |
| `materialization.ts`:78-145 (L2-M7) | 78 closes a type; the record block is 80-141 | approximate; the cited span opens one line early and ends four late |
| `materialize-action.ts`:17-30 (L2-M7) | the two route paths, the back path and the attribution constant | exact |
| PWB spec:439 (L2-M8, for PWB-REQ-007) | `### Requirement: PWB-REQ-007 …` | exact |

## Gate 2 — Doctrine

**VIS-6 is the whole warrant, and it is quoted entire rather than
summarized.** `.syzygy/governance/doctrine/vision.md` lines 167–181:

> **VIS-6 — Syzygy is derived, with two closed exceptions.** Every fact
> Syzygy holds must be rebuildable from the artifact that owns it; its
> databases and views are projections, and content it authors is committed
> out to the governed plane, which becomes the authoritative source. The
> exceptions, closed: (a) the owner's **personal presentation state**
> (layouts, filters, bookmarks, unpromoted notes), which may never affect
> truth, work, status, or certificates — promoting a note into governance
> (an annotation or a dismissal) commits it out to the governed plane,
> attributed and reasoned, dismissals carrying an expiry (a dismissal
> without a reason current at the evaluation's as-of instant renders the gap
> again — expiry acts only through a new identified evaluation,
> architecture.md); (b) **observation records** — historical evidence,
> immutable, evaluation-identified, marked stale, exempt from
> rebuildability. *Violation:* any other fact living only inside Syzygy; a
> view preference influencing a status claim; a dismissal taking effect
> without living in the governed plane.

**What exception (b) gives slice 1, and what it does not.** It gives the
warrant: an observation record is *exempt from rebuildability*, which is the
only reason a durable evaluation store is not itself a VIS-6 violation. It
does not give the retention *bound* — "immutable" and a discard policy are
in tension, which is Q2 — and it does not say where the record lives, which
is why Q1 is about posture rather than about permission.

**What exception (a) gives slices 3 and 4, and the four constraints it
imposes.** Read at the clause: an unpromoted note is permitted and "may
never affect truth, work, status, or certificates"; promotion "commits it
out to the governed plane"; the promoted form is "attributed and reasoned";
and a dismissal carries an expiry that "acts only through a new identified
evaluation". The closing *Violation* line adds a fifth: "a dismissal taking
effect without living in the governed plane" is named as a violation
outright. Every one of the five is a design constraint in Gate 4 and none is
this packet's to relax.

**VIS-2 bounds the band.** Lines 96–106:

> **VIS-2 — No evidence means Unknown, not success.** No surface may declare
> a project aligned, converged, or genome-complete — nor turn anything green
> — without current evidence… Currency is judged at a status evaluation's
> identified as-of instant (architecture.md) — the wall clock never silently
> changes a displayed status. Until a claim class declares its currency
> bound, its evidence is not current and the claim renders Unknown.
> *Violation:* "spec-aligned ✓" computed from a stale index; a stale view
> silently green; a status flipping with no new identified evaluation.

Three consequences, all designed in below: (i) when **no** prior evaluation
is retained, the band renders a **named Unknown** with its reason, never an
empty "no changes" — an empty delta and an absent history are different
states and VIS-2 forbids collapsing them; (ii) a capped band discloses its
remainder rather than looking complete; (iii) no expiry, staleness or
"since" figure is computed from the wall clock.

**The temporal rule is the clause Q6 turns on.** architecture.md lines
221–229, quoted whole in Q6. Its second half is the one that constrains a
delta specifically: the passage of time "may only degrade a claim (toward
stale or Unknown), never establish or improve one — improvement requires a
new source snapshot containing a permitted authoritative input". A delta
that renders a claim moving from Unknown to Observed is therefore reporting
a *new snapshot's* fact, not time's effect, and the band must name the
snapshot that did it — which it can, because it holds both identities.
architecture.md lines 231–235 add what an observation record **is**: "the
immutable result of one identified evaluation", containing "deterministic
facts only", with "logical freshness state… identity-bearing". Slice 1's
record satisfies the first two by construction (it is a projection of one
model) and the third is why it stores freshness rather than recomputing it.

**VIS-1 ranks the slices.** Lines 82–94 order, verbatim: "The full
ordering, highest first: (1) truth and observation determinism; (2)
comprehension of the truth's presentation; (3) momentum (delivery speed);
(4) breadth of scope and fidelity of presentation; (5) reproducibility of
derived convenience… Lower ranks are spent before higher ones; rank 1 is
never spent. Comprehension is achieved by simplifying *presentation*, never
*content*." Slice 1 is rank
1: without it there is no observation record at all, and VIS-6(b) names one.
Slice 2 is rank 2: the facts exist once slice 1 lands, and the band is where
they become legible. Slices 3 and 4 are rank 1 again in principle — VIS-6(a)
is doctrine, not a convenience — which is exactly why neither may be built
without the gate it needs rather than in spite of it.

**VIS-4 and VIS-5.** This packet adopts nothing and labels nothing accepted.
Slices 1 and 2 write only into `apps/**`, `packages/**` and `docs/**`.
Slices 3 and 4 are the two that would cross into governed material, and both
are held behind an owner act and a CC-REV-2 amendment respectively, which is
the whole of Q4 and Q5.

**SEC-4 is the clause slice 3's promotion arm must satisfy, and it is not
the only one.** `.syzygy/governance/doctrine/security.md` lines 47–52:

> **SEC-4 — Writes are consented, attributed, and revertable.** Syzygy
> writes into a governed repository only after recorded per-repository
> consent (onboarding), and every write is attributed to Syzygy, atomic, and
> individually revertable. Syzygy never overwrites existing governance
> artifacts it did not author without surfacing the conflict. *Violation:*
> first-pass doctrine drafting silently replacing an existing
> `.syzygy/governance/` tree.

SEC-4 describes the *discipline* a governed write must meet; it is not a
grant, and the act in force independently forbids the write (Q4). The
existing human-triggered materialize action is the nearest precedent — it
creates a Bead in the observed project through `bd`, attributed by the fixed
constant `MATERIALIZE_ATTRIBUTION`, declared at `materialize-action.ts` lines
28–29 under its head comment at lines **26–27** [read "line 27" until
2026-09-15; review 2's G4] —
and the 2026-08-29 direction's own success list names "human-triggered work"
as something the experiment "must demonstrate"
(`.syzygy/governance/decisions/THREE-SURFACE-POC-MODE-DIRECTION.md` lines
18–19). **Whether that precedent reaches a note is not this packet's to
decide**: the PWB act's sentence at lines 70–72 is later, broader in its
words ("or on any other repository"), and grounded in a registry entry that
declares an empty write surface. Two readings are available — that the PWB
act bounds the PWB observer and leaves the earlier direction's action
untouched, or that it is a flat prohibition on the POC — and this packet
names both and rules neither [Inferred].

**SEC-5 bounds what a retained record may contain.** Lines 54–60: "A secret
reproduced in any Syzygy surface, store, or endpoint is a trust-floor
violation". Slice 1 creates a **new store**, which is the reason it is not
the cheap slice the dossier implies. The act-bound classification policy's
own retention clause is the bound, and the record satisfies it by
construction: `rawBodyHandling` reads `"storage": "never"` and the record
holds no body bytes at all — only claim identities and closed-vocabulary
tuple fields. What it *does* hold is 1,148 identities interpolated from
observed-project text, which is the substance of Q1.

**SEC-1, SEC-2 and SEC-3 are not engaged, and here is the sweep.** SEC-1
governs admission; no slice adds a route on the machine channel and the
note's POST route, if ever built, would ride the same
`browserRequestAllowed` check the existing materialize route uses
(`apps/three-surface-poc/src/materialize-action.ts`, the handler's first
branch). SEC-2 governs governed-project content leaving owner-controlled
infrastructure; no slice transmits anything anywhere and no slice adds a
client. SEC-3 governs executing observed code; no slice executes anything.
[Observed for the three mechanisms; the judgment that this exhausts the
three rules is [Inferred].]

**RFC5-11 separates a boundary act from a truth claim, which is what makes
slice 4 hard.** Quoted at its defined clause, located through
`DIRECTIVE-REGISTER.md` at
`.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md` line
244, under the `###` heading "3.5 Acts versus claims: the temporal rule at
the boundary" at line 242 — lines 244–252, whole:

> **RFC5-11.** RFC 0002's temporal machinery (identified evaluations, as-of
> instants, degradation-only) governs **truth claims**. Boundary enforcement
> — admitting a request, permitting an egress, launching a run — is an
> **act**, judged at the instant it is attempted against the then-current
> credential, consent, and profile state. Revocation therefore takes effect
> at the next act, immediately, without waiting for a new evaluation; the
> *recomputation* of its consequences on claims flows through RFC 0002's
> evaluations. [Inferred — without this clause, RFC2-4 read literally would
> delay revocation until someone triggers an evaluation, which no security
> rule could tolerate.]

A dismissal is on the **claims** side of that line, not the acts side: it is
not admission, egress or a run. So the immediate-effect carve-out RFC5-11
grants to revocation is unavailable to it, and VIS-6(a)'s "expiry acts only
through a new identified evaluation" stands without qualification. Slice 4's
design evaluates expiry at the evaluation's own `asOf` and never at
`Date.now()`.

## Gate 3 — Topology

| Slice | Lives in | Governed artifact touched |
|---|---|---|
| 1 Retained evaluation record | a new `packages/three-surface-poc-core/src/evaluation-retention.ts` (the pure record builder and the append-only history, mirroring `materialization.ts`'s file-backed posture and `body-read-authority.ts`'s duplicate-identity guard); `packages/three-surface-poc-core/src/index.ts` (one export line); `apps/three-surface-poc/src/main.ts` (one call after each of the two `buildModel()` sites, lines 187 and 201); `packages/three-surface-poc-core/src/project-shape-manifest.ts` (**read only** — `canonicalJson` is imported, not edited); `packages/three-surface-poc-core/src/project-shape-model.ts` (**read only** — `ProjectShapeClaim` is imported) | none |
| 2 Delta view | a new `packages/three-surface-poc-core/src/claim-state-delta.ts` (pure, injectable: two claim-state maps in, one counted delta out); `packages/three-surface-poc-core/src/model.ts` (one optional `claimDelta` block on `PocModel`, beside `evaluation`); `apps/three-surface-poc/src/polaris.ts` (the band); `apps/three-surface-poc/src/polaris-copy.ts` (its copy entries); `apps/three-surface-poc/src/polaris-parity-sweep.test.ts` (a new marker family with both denominators); `docs/THREE-SURFACE-POC.md` (what the band means and what it does not) | none |
| 3 Owner note (**does not ship**; Q1, Q2 and Q4) | a new `packages/three-surface-poc-core/src/owner-note.ts`; a POST route beside `apps/three-surface-poc/src/materialize-action.ts`; `packages/three-surface-poc-core/src/materialization.ts` (**read only** — the record posture is copied, not edited) | **none may be, and that is the point.** The promotion arm would write into another repository's governed plane, which the act in force forbids in terms and the registry's `"writeSurface": []` bounds; those registry bytes are digest-bound and **no slice edits them** |
| 4 Dismissal (**does not ship**; Q5) | `packages/three-surface-poc-core/src/project-shape-model.ts` (`CHALLENGE_STATES`, line 83); `apps/three-surface-poc/src/polaris.ts` line 314 and `apps/three-surface-poc/src/polaris-copy.ts` lines 50-51 (the rendered value and its gloss); `apps/three-surface-poc/src/walkthrough-preflight.ts` line 216 | **none edited.** The vocabulary change is an amendment to PWB-REQ-007's admitted set, which routes through CC-REV-2 and a new owner act; the specification bytes are act-bound |

Boundaries crossed by slices 1 and 2: **none**. Every file they name is in
the implementation plane. The `openspec/**` and `.syzygy/**` trees are read
for authority and written by no slice. The registry JSON and the
classification policy JSON are quoted and not edited.

Not touched by any slice: the observation pipeline
(`packages/three-surface-poc-core/src/project-shape-observation.ts` apart
from reading `PwbResourceLimits` and the digest sites), the extraction and
coverage stages, the PWB-REQ-022 judgment evaluator, and
`packages/three-surface-poc-core/src/walkthrough-readiness.ts` — slice 2
renders a band and adds no readiness arm, and `READINESS_ARMS` stays closed
at ten.

### The authorizing act, per slice

**There is no amendment overlay for either specification this move rests
on.** `openspec/changes/` holds five change directories and neither
`polaris-project-wide-butlers-model` nor `three-surface-poc-experience` has
a sibling amendment package; the two overlays that exist,
`polaris-manifesto-understanding-amendment` and the archive, belong to the
generator [Observed, listed this session]. The 2026-09-05 PWB amendment was
performed **in place**, against the same files, so the predecessor/overlay
column M6 and M4 carry has no analogue here and is replaced by the
predecessor-text column below: for each slice, whether the clause it rests
on is text the implementation-authorization act named, and where.

| Slice | Owner act needed | Named clause, and where it is | Predecessor text? | Named act and the trigger test |
|---|---|---|---|---|
| 1 Retained record | **Yes on the recommended arm of Q1; no on its second or third** | VIS-6(b), vision.md lines 177-179, is the doctrinal warrant; architecture.md lines 231-235 define what an observation record is. **No approved requirement names retention** — the Gate 5 sweep shows it | n/a — the clauses are doctrine, not specification text, and neither has been amended | Rides `.syzygy/governance/decisions/THREE-SURFACE-POC-IMPROVEMENT-CYCLES-DIRECTION.md` lines 55-56, "Improvement-cycle work must trace to POC-REQ-001..061 or to a recorded review finding" (L2-F5 is the finding), inside `.syzygy/governance/decisions/PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md` lines 59-61's implementation plane: "Code in the ordinary implementation plane only — `apps/**`, `packages/**`, tooling, root manifests — never inside `openspec/**` or `.syzygy/**`…" (the elision is the sentence's continuation, ", under the in-force craft policies and the vendored `th-engineering` standards", which runs to line 63). **Trigger at stake: retention posture**, continuation act lines 152-154. That is Q1 |
| 2 Delta view | **No**, on the recommended reading of Q6; **yes** if the owner rules the delta a second identified evaluation, since minting an evaluation identity is not a rendering change | PWB-REQ-007's stable-identity sentence (PWB spec lines 443-446) and its Case/Oracle pair naming "two evaluations of the same semantic subjects" (lines 453-454, 460-461); PWB-REQ-014 for the band as a narrative unit (lines 763-773); PWB-REQ-020 for parity (lines 906-910) | **all predecessor text.** PWB-REQ-007 and PWB-REQ-014 are in the requirement set the implementation act names and the 2026-09-05 amendment was performed in place against these same files, so there is no overlay-only clause on this row [Observed] | Same direction and act. No trigger crossed on the recommended reading: no doctrine or contract change, no spec amendment, no registry-envelope change, no observation outside the consented class. **But slice 2 cannot land before slice 1**, so Q1's answer gates it transitively |
| 3 Owner note | **Yes — unambiguously, on every arm that promotes**, and Q1 besides for the unpromoted half | VIS-6(a), vision.md lines 170-177, with its five constraints; SEC-4, security.md lines 47-52, for the discipline a governed write must meet; PWB-REQ-014's "Personal view state SHALL remain outside the truth model" (PWB spec lines 772-773) for the unpromoted half | predecessor text for PWB-REQ-014; VIS-6(a) and SEC-4 are doctrine | **The act in force forbids the write in terms**: `PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md` lines 70-72, "No write, egress, execution, deployment, release, recovery, or mission effect on Butlers or on any other repository. The observer registry entry the owner adopted declares an empty write surface; that remains the bound." A new act would also need a CC-REV-2 delta over the registry's `writeSurface` and a new registry act, since those bytes are digest-bound. **This packet does not rule whether such an act is available — that is Q4** |
| 4 Dismissal | **Yes — a CC-REV-2 semantic delta and a new owner act**, on the recommended reading of Q5 | PWB-REQ-007, PWB spec lines 443-446 and its Case line 454-456 enumerating "every admitted label, tier, reason, freshness, challenge and sibling state"; VIS-6(a)'s expiry sentence, vision.md lines 175-177 | predecessor text | The trigger is "a further amendment to the signed PWB specification beyond the 2026-09-05 package", continuation act lines 151-152, which needs CC-REV-2 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`) and a new act. **The specification bytes are act-bound and no slice edits them** |

**One open bound on every slice, stated not asked.** The PWB change's
`tasks.md` carries **35** checkbox lines under the predicate
`^- \[[ xX]\] `, of which **32** are checked and **3** are not: 4.6, 5.2 and
5.3 ("Report the completed improvement cycle to the owner before any next
cycle begins") [Observed, counted this session over a **138**-line file,
`wc -l`]. **No M12 slice duplicates an unchecked task** — none of the three
concerns retention, delta, note or dismissal — so M12 is new
improvement-cycle scope rather than unfinished signed work. 5.3 being
unchecked means the current cycle has not been reported to the owner; that
constraint is shared by all eleven sibling packets and is a sequencing fact
for whoever schedules them, not a question for this one [Inferred].

**What landing these slices retires.** Predicate: the file's
repository-relative path, or its basename where that basename is unique
across the repository, occurring in any tracked `.md`/`.txt` file under
`.syzygy/` or any tracked file whose basename contains `MANIFEST` or, for
`docs/evidence/`, whose basename contains `manifest`. Denominator: **538**
governance files plus **24** manifests plus **7** evidence manifests, union
**553** distinct files. Result over M12's **15**-file existing-file surface:
**0** manifest rows and **0** act records name any of them. Eight of the
fifteen occur in exactly one governance place,
`.syzygy/governance/contracts/candidates/pwb-truth-policy-amendment/IMPACT-LEDGER.md`,
which says of itself at its own lines 3-5: "**Candidate review input — never
authority.** This is the CC-REV-2 affected-consumer inventory. It performs
no act and authorizes no implementation." It is **not** a row of either
manifest in its own directory — both
`PWB-BEHAVIOR-AMENDMENT-MANIFEST.txt` and `PWB-EFFECT-AMENDMENT-MANIFEST.txt`
were searched this session for its basename and return **0** hits — so
unlike the general-trusted-bootstrap case AGENTS.md records, this ledger's
classifications bind nothing. The one other hit is
`apps/three-surface-poc/src/polaris.ts` inside
`docs/evidence/polaris-manifesto-example-mutation-2026-09-09.json`, which is
a rule-6 mutation record (`commit`/`file`/`old`/`new`/`exitCode`/`output`/
`restored`) and not a digest table [Observed, both read this session].

**Two basenames on the surface are not unique, and the sweep says so.**
`main.ts` occurs **2** times repository-wide (the other is
`apps/syzygy/src/main.ts`) and `index.ts` **4** times, over the repository's
**1,216** tracked files. Both were matched by **full path only** in the
sweep above and in both collision predicates below; the other thirteen
basenames are unique and were matched both ways [Observed, computed this
session]. A packet that assumed all fifteen basenames distinct would have
over-counted; this one does not.

Whether any other `docs/evidence/*.json` record binds these bytes by digest
is **[Unknown]** to this packet: the sweep covered the act corpus and the
seven evidence files whose basename contains `manifest`, not every evidence
digest table. The implementing bead must run that sweep and re-record
anything it retires, which is verification rule 10 applied to an evidence
record.

All four slices run under `syzygy-dov.12`, the pursuit bead; no new bead is
filed by this packet.

## Gate 4 — Design sketch, per slice

### Slice 1 — Every evaluation leaves a record (medium; Q1 and Q2)

**The record.** One JSON file per evaluation under the daemon's state
directory, named by the evaluation's own `inputsDigest` — the field is
already computed, already on the model, and already the last element of the
rendered footer, so the record needs to mint nothing:

```
evaluation-<inputsDigest>.json
{
  "schema": "syzygy-poc-evaluation-record/v1",
  "evaluation": { "snapshot", "snapshotLabel", "inputsDigest", "asOf" },
  "observerRevision": "...",
  "projectRevision": "...",
  "claimStates": { "<claimId>": { "epistemic": {...}, "challenge": "..." } },
  "counts": { "claimObjects": N, "distinctClaimIds": M }
}
```

**Why `inputsDigest` and not a mint.** **Q1** of the M10 packet establishes
that `inputsDigest` is *insensitive* to the project shape — a landed
assertion says so in terms
(`packages/three-surface-poc-core/src/model.test.ts`, cited by M10's Q1 at
its packet line 35, read read-only at `95f31cb`; M10's line 36 is its Q2,
which asks about `Content-Encoding: gzip` and the response ceiling). [The
first clause read "Q2 of the M10 packet" until 2026-09-15, contradicting its
own second clause; review 1's F10.] That is a
defect for an ETag and is **correct** for a filename: two builds with equal
inputs are the same evaluation and should collide to one record, and the
`claimStates` map inside disambiguates nothing because it would be equal
too. The record's *content* identity is separately covered: the same
duplicate-identity guard the two existing appenders use rejects a second
write under the same digest with different content, which is the rule-6
anchor below.

**Where it is written.** One call after each of `main.ts`'s two
`buildModel()` sites (187 and 201), so a materialize — which today silently
replaces one evaluation with another — leaves both on disk. This is the
first slice in the POC to make that transition observable at all.

**Posture.** Directory `0o700`, file `0o600`, mkdir-recursive — byte for
byte the posture `materialization.ts` lines 128-134 and
`test-artifact-verification.ts` lines 73-79 already use, so no new mode
decision is made.

**Fail-closed reading, and it is deliberately stricter than the nearest
precedent.** `main.ts` lines 114-124 catch a corrupt materialization record
and set it to `null`, with the reason stated at the site: "A corrupt record
must not crash startup or silently look unmaterialized — model.ts's own
confirmation step already renders Unknown for a record that fails to
resolve". For a materialization record `null` and corrupt are the same
downstream state, so that is correct there. **For an evaluation history they
are not the same state**: absent history means "this is the first run" and
corrupt history means "a record existed and cannot be read", and collapsing
them would render the second as the first — VIS-2's "a stale view silently
green" at the smallest scale. The loader therefore returns three
distinguishable outcomes — present, absent, unreadable — and the band
renders a different named Unknown for the last two.

**What the record must not contain.** No body bytes (SEC-5 and the policy's
`rawBodyHandling.storage: "never"`); no support anchors; no resolution
routes on the recommended arm of Q2 (they are derivable from the tuple by
`routesFor`, so storing them is 26,348 bytes of redundancy — 203,379 minus
177,031, computed this session).

**Oracle.** An independent reader — not the writer — parses the written file
with its own JSON reader and compares the `claimStates` map against a map
built directly from the in-memory model by a separately written walk, with
both denominators reported (claim objects and distinct identities). The
existing `polaris-parity-sweep` discipline is the model: compare multisets,
report both counts.

**Rule-6 mutants.** (a) Rewrite an existing record in place rather than
refusing; the duplicate-identity test must fail. (b) Drop `challenge` from
the stored tuple; the oracle's per-claim comparison must fail. (c) Read a
corrupt record as an empty history; the fail-closed test must fail. (d)
Write the record with mode `0o644`; the posture test must fail. (e) Name the
file by `asOf` rather than `inputsDigest`; the two-builds-one-record test
must fail. (f) Store the resolution routes as well; the byte-budget
assertion must fail.

**Cost.** 177,031 bytes per evaluation at the retained capture's population,
plus the file's envelope. Nothing is served, so no response ceiling is
engaged.

### Slice 2 — The band that answers "what changed" (medium; Q3 and Q6)

**The computation, pure and injectable.** A function
`claimStateDelta(previous, current)` takes two maps from claim identity to
`{epistemic, challenge}` and returns:

```
{
  previousEvaluation: { snapshotLabel, inputsDigest, asOf },
  currentEvaluation:  { snapshotLabel, inputsDigest, asOf },
  added:        readonly string[],
  removed:      readonly string[],
  tupleChanged: readonly { claimId, before, after }[],
  unchanged:    number,
  denominator:  { previous: number, current: number, union: number },
}
```

**Membership first, because the measurement says so.** Over the retained
capture there are exactly **2** distinct tuples across 1,149 claim objects,
so a band that lists only tuple changes would be silent while 278 source
identities churn underneath it. The band therefore reports four numbers —
added, removed, tuple-changed, unchanged — over one stated denominator, and
never presents "0 changed" without also presenting the membership counts.

**What it renders when there is no prior evaluation.** A **named Unknown**
with its reason and its route, never an empty band and never "no changes".
This is VIS-2's own violation list ("a stale view silently green") applied
at the smallest scale: *no history* and *no change* are different states.
POC-REQ-032's scenario "Unknown disclosed in the narrative" (POC spec lines
599-604) is the rendering contract this follows.

**What it renders when a claim's tuple changed from Unknown to Observed.**
The band names **both evaluation identities** and says which snapshot did
it, because architecture.md lines 226-229 make improvement impossible
without a new snapshot. It never says "since yesterday", never computes an
age, and never touches the wall clock.

**The three forms Q3 chooses between.** (i) The full band: every changed
claim with both tuples — bounded above at about **522** rows before the
tailnet ceiling, against 1,148 claims, so it needs a declared cap and a
disclosed remainder. (ii) Machine channel only: zero page bytes,
2,868,294 bytes of machine headroom. (iii) **Counts only** on the page with
a route to the machine answer for the list: a few hundred bytes. This packet
recommends (iii) as the default and says why in Q3.

**Parity.** Every delta fact the page renders must be recoverable from the
same evaluation's machine answer, per PWB-REQ-020 (spec lines 906-910) whose
scenario "Complete model has wire parity" (lines 928-933) requires the check
to "report both denominators". The band therefore adds a **new marker
family** to `polaris-parity-sweep.test.ts` with its own declared
denominators, rather than relying on the sweep's silence — the failure mode
M10's Q6 names, and the reason a machine-only form (arm ii) is not
automatically free either.

**The duplicate-identity trap, designed for.** One claim identity occurs
twice in the current payload. The delta keys on identity, so the comparison
must build its maps from **distinct identities** and assert that the two
tuple instances of a repeated identity are equal before collapsing them —
never `tuples === distinctIds`, which is the false invariant AGENTS.md
records for the parity sweep.

**Oracle.** A fixture with two hand-built claim-state maps whose expected
delta is a hard-coded literal (never imported from the module under test),
exercising: a claim only in `previous`, a claim only in `current`, a claim
whose tuple changed, a claim whose `challenge` changed with an equal
`epistemic`, and a repeated identity with equal tuples.

**Rule-6 mutants.** (a) Drop `removed` from the band; the fixture's removed
claim must make a test fail. (b) Render an empty band when no prior record
exists; the named-Unknown test must fail. (c) Compare tuples by `label`
alone; the challenge-only-change case must fail. (d) Collapse a repeated
identity without asserting tuple equality; the unequal-duplicate fixture
must fail. (e) Compute the delta against `Date.now()` rather than between
two recorded evaluations; the two-fixture test must fail. (f) Omit the
denominator from the rendered band; the parity family's denominator
assertion must fail.

### Slice 3 — The owner's note (does not ship; Q1, Q2 and Q4)

**Stage 1, which VIS-6(a) permits in terms.** A note attached to a claim
identity, held in the daemon's state directory under the same posture as
slice 1's record, carrying an author, an instant, a reason and the claim
identity. Doctrine's constraint is absolute and is the whole test: it "may
never affect truth, work, status, or certificates" (vision.md lines
172-173). The specification says the same thing in its own words —
"Personal view state SHALL remain outside the truth model" (PWB spec lines
772-773) — and PWB-REQ-014 already carries the oracle for it: its Case line
requires the sweep to be repeated "after injecting personal view state"
(lines 778-782) and its Oracle line requires that "injected personal state
never enters the truth model" (lines 791-792). **So the counterexample
battery slice 3 needs is already specified**; what does not exist is
anything for it to run against.

**Stage 2, promotion, which does not ship.** VIS-6(a) says promotion
"commits it out to the governed plane, attributed and reasoned". Three facts
decide that this move does not build it, and none of them is a judgment this
packet makes:

1. The act in force forbids the write in terms (quoted in Gate 3 and Q4).
2. The registry declares `"writeSurface": []` and those bytes are
   digest-bound; widening it is a CC-REV-2 amendment plus a new registry
   act.
3. **There is no governed plane in the observed project to write into**, as
   far as the consented scope reaches: 0 of 278 observed paths begin
   `.syzygy`. And `.syzygy/local/`, the home architecture.md line 57 names
   for unpromoted state, does not exist **in this repository either** — 0 of
   556 tracked files under `.syzygy/`.

**The shape it would take, recorded so the owner can rule on something
concrete.** `packages/three-surface-poc-core/src/owner-note.ts` mirroring
`materialization.ts`: a pure builder, injected IO, a fail-closed reader, an
idempotency key; one POST route beside `materialize-action.ts` with the same
`browserRequestAllowed` guard and a preview-before-write step; and — this is
the load-bearing part — **a distinct declaration class in the observation**
so a promoted note is never counted as one of the project's own
declarations. The materialize action is the proven precedent for the route
shape and for attribution (`MATERIALIZE_ATTRIBUTION`, declared at
`materialize-action.ts` lines 28-29 under its head comment at lines
**26-27**, "Fixed, never user-supplied — this action is human-triggered but
not human-identified"). [The quoted words were attributed to lines 28-29
until 2026-09-15; 28-29 are the declaration the comment describes — review
1's F11. The comment's own span then read "line 27" until 2026-09-15:
read at source, line 26 carries "Fixed, never user-supplied —" and line 27
"this action is human-triggered but not human-identified", so the quoted
sentence spans **26-27** — review 2's G4.]

**Rule-6 mutants, for whenever it is built.** (a) Let an unpromoted note
change any epistemic tuple; the PWB-REQ-014 injection oracle must fail. (b)
Let it change any count on the page; the count assertions must fail. (c) Let
it appear in `/api/poc`'s fact set; the parity denominator must fail. (d)
Promote without an attribution or without a reason; the write must be
refused. (e) Count a promoted note as a project declaration; the
declaration-class test must fail.

### Slice 4 — The dismissal with a live expiry (does not ship; Q5)

**Where it must act, and why that is the hard part.** L2-M8 is right that a
view filter over a rendered list would violate VIS-6(a) — doctrine's own
*Violation* line names "a dismissal taking effect without living in the
governed plane" — and right that the honest place is the claim's own
epistemic state. That is also exactly why it is an amendment: the tuple's
fields and the admitted values of `challenge` are fixed by PWB-REQ-007, and
the implementation's vocabulary is closed at one with a comment saying so.

**The expiry's mechanism is not open.** vision.md lines 175-177: "a
dismissal without a reason current at the evaluation's as-of instant renders
the gap again — expiry acts only through a new identified evaluation". So
the evaluation's own `asOf` is the only admissible clock, `Date.now()` is
never called at render, and RFC5-11's immediate-effect carve-out for
boundary acts does not reach a claim (Gate 2).

**Suspension only, never promotion.** A dismissal may move a claim toward
suspended or leave it where it is; it may never move a claim toward a
positive state. That is VIS-2 and architecture.md's degradation-only rule
together, and it is the assertion the counterexample battery exists to hold.

**Rule-6 mutants, for whenever it is built.** (a) Evaluate the expiry at
`Date.now()`; the two-evaluation fixture must fail. (b) Admit a dismissal
with no reason; the gap must still render. (c) Let a dismissal turn any
claim's label from Unknown to Observed; the degradation-only test must fail.
(d) Apply the dismissal on the page but not in `/api/poc`; the parity sweep
must fail. (e) Let an expired dismissal keep suppressing; the
past-expiry fixture must fail.

### Design bar for the human surface

The band is text in reading order with a heading, no chart and no colour
coding beyond the declared tokens POC-REQ-060 fixes. It carries no fragment
target inside a `<details>` (the guardrail AGENTS.md records). Its counts
are rendered as words and numbers, never as a bar or a trend, because
PWB-REQ-007's own sentence forbids trend and count walls in default Polaris
status presentation (spec lines 450-451). Every number it shows carries its
denominator in the same sentence.

## Gate 5 — Specification

Two signed specifications are in force over this surface and neither has an
amendment overlay: `polaris-project-wide-butlers-model` (17 requirements, 31
scenarios, 1,152 lines) and `three-surface-poc-experience` (24 requirements,
24 scenarios, 1,008 lines) [Observed, counted this session with the
predicates `^### Requirement` and `^#### Scenario`]. The 2026-09-05 PWB
amendment was performed against these same bytes, so every citation below is
to the effective text.

### No approved requirement names retention, delta, note or dismissal

Predicate: case-insensitive Python `re` search for each of `retain`,
`retention`, `delta`, `\bsince\b`, `annotat`, `dismiss`, `expir`,
`\bnotes?\b`, `history`, `append-only`, `previous` and `changed`, over the
**two `spec.md` files** — the only files in either change directory that
carry approved requirement text. Denominator: 1,008 + 1,152 = **2,160**
lines. Run this session; the counts are per matching line.

| Term | POC spec (1,008 lines) | PWB spec (1,152 lines) | What the hits actually are |
|---|---:|---:|---|
| `retain` | **0** | 15 | 14 are about retaining a *state, anchor, population or answer within one evaluation* — the closest, line 770, is "Each anchor SHALL retain the target's captured label, tier and reason and SHALL not rewrite that target state on later reads". **The fifteenth is different and is disclosed in full below**: line 1033 requires "a retained walkthrough execution record in `.syzygy/governance/records/`" |
| `retention` | **0** | **0** | — |
| `delta` | **0** | 1 | line 823, "Proposed deltas SHALL be adjacent to current text" — an OpenSpec proposal delta, not a claim-state delta |
| `since` (word) | **0** | **0** | — |
| `annotat` | **0** | **0** | — |
| `dismiss` | **0** | **0** | — |
| `expir` | **0** | 1 | line 242, a table row listing act lifecycle states "Stale; expired; superseded; revoked" — act validity, not dismissal expiry |
| `note` / `notes` | 1 | **0** | line 18, "Reader notes, binding on how this file is read" |
| `history` | 1 | 5 | POC line 715 is a Trajectory board scenario. PWB's five are the two correlation-history scenarios and their mutation lines |
| `append-only` | **0** | **0** | — |
| `previous` | **0** | 2 | lines 324 and 1138, both "a later evaluation correlates a … previously used/honored in state (1)" |
| `changed` | **0** | 3 | lines 791, 922, 925 — deletion, and mutation-marker vocabulary |

**One requirement does name a retained record, and it must be disclosed
before the absence claim is made, because a sweep that reported "0" here
would be false.** PWB-REQ-022's requirement text, verbatim at spec lines
1032–1035: "The POC SHALL NOT render the project-wide Polaris evaluation
successful unless a retained walkthrough execution record in
`.syzygy/governance/records/` and a separate owner judgment in
`.syzygy/governance/decisions/` both bind the exact walkthrough-record
identity, surface version and evaluation identity." Its Observable line adds
"a retained walkthrough execution record contains only the answers, paths,
surface/evaluation identity and nonvisual/keyboard flag" (line 985). **Three
things separate it from slice 1 and all three are load-bearing**: (i) it is
**authored by a human walkthrough and by an owner**, not written by the
daemon — the POC *reads* it and refuses to call the evaluation successful
without it; (ii) it lives in the **governed plane** of Syzygy's own tree, not
in the daemon's state directory, and writing there is exactly what the
implementation act forbids the implementation to do; (iii) `.syzygy/governance/records/`
**does not exist in this repository** — `.syzygy/governance/` holds five
directories and `records` is not among them, and 0 files are tracked under
that path [Observed, listed this session]. So the requirement contemplates
retention, in the opposite direction, at a path that is empty.

**With that disclosed, the plain statement holds: no approved requirement in
either signed specification names retention of an evaluation's claim state
by Syzygy, a claim-state delta, an owner note, an annotation, a dismissal or
an expiry of one.** The two PWB
scenarios that come closest are about preserving a state **within** an
evaluation's own record, and both are quoted whole here because a paraphrase
would overstate them:

> #### Scenario: Later correlation preserves prior authorization history
>
> - **WHEN** a later evaluation correlates an authority previously used in
>   state (1)
> - **THEN** the later evaluation may render that authority in state (2)
> - **AND** the earlier evaluation remains recorded as state (1)

(PWB spec lines 322–327; its PWB-REQ-022 twin, "Later correlation preserves
prior judgment history", is lines 1136–1141 and differs only in naming a
judgment.) Read at the clause: "the earlier evaluation **remains recorded**"
is a constraint on not rewriting provenance. It is **not** a requirement
that any evaluation be written to durable storage, and the two functions
that implement it — `appendEvaluation` and `appendJudgmentEvaluation` —
persist nothing (Measurements). An implementer could satisfy both scenarios
with the code that exists today, and does.

**The nearest thing to a retention requirement is doctrine, not
specification:** VIS-6(b)'s "observation records — historical evidence,
immutable, evaluation-identified, marked stale, exempt from rebuildability"
and architecture.md lines 231–235's definition of an observation record.
Which is precisely why RFC2-26 matters below: doctrine and an RFC are not
a specification of record from which work may be scheduled.

### What PWB-REQ-007 does give slice 2, quoted rather than characterized

PWB spec lines 443–446 and 453–456 and 459–463:

> Every project entity and project-fact claim SHALL have a stable semantic
> Claim identity plus an evaluation instance, be challengeable with
> resolvable support, and carry the closed label, tier, exactly one primary
> reason, zero or more closed secondary reasons, freshness, challenge state
> and evaluation identity that govern it.
>
> - **Case (sweep)**: enumerate every project entity, claim and aggregate
>   across two evaluations of the same semantic subjects, including fixtures
>   for every admitted label, tier, reason, freshness, challenge and sibling
>   state plus out-of-vocabulary and missing-currency cases.
> - **Oracle**: compare each tuple and tier meaning to independent literal
>   vocabularies and provenance-verified currency inputs; verify stable
>   semantic identity across the two evaluation instances; exhaust
>   challenge/sibling separation, aggregate label/tier/freshness/reason
>   counts and supports links; zero invalid, missing or folded values
>   decides.

This is the sentence that makes slice 2's join key a conformance matter
rather than a mint: the specification already quantifies over **two
evaluations of the same semantic subjects** and already requires the
identity to be stable across them. It does **not** say the two evaluations
must both exist at once, which is the gap slice 1 fills; and it is the same
sentence that makes slice 4 an amendment, because the closed vocabulary it
fixes is the one a dismissal would widen.

### The RFC2-26 test, run over all four slice rows

RFC-0002 is an accepted design contract in force. Its phase rule is quoted
verbatim at the defined clause, located through `DIRECTIVE-REGISTER.md` at
`.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md` line
196, under the `###` heading "Authority boundary at the OpenSpec seam
(binding phase rule)" at line 194 — lines 196–221, **the whole clause, both
paragraphs, with no elision**:

> **RFC2-26.** This contract schedules nothing: **it is not a specification
> of record from which implementation work may be scheduled**. No
> implementation work for user-observable consequences of this contract —
> evaluation and snapshot displays, claim and challenge rendering,
> Unknown-reason and rendering-tier presentation, reconciliation-chain and
> gap surfaces, API answers over epistemic state — may be scheduled solely
> from this RFC. Before implementation, every observable consequence either
> maps to an approved OpenSpec requirement and scenario in the governance
> root's `openspec/**` plane, or carries a reviewed N/A judgment proving it
> purely structural with no independently testable behavior. **The reviewed
> N/A judgment's home and gate.** A reviewed N/A judgment is a recorded
> owner judgment homed in `decisions/` (RFC3-15), and the judgment is
> honored only through an effective owner act under RFC3-16(a), in state (1)
> or state (2), with that state rendered; absent or invalid acts map nothing
> and leave the consequence unmapped and Unknown, never covered
> (RFC3-16(a)'s effect rule; VIS-2).
>
> **Rows are per observable consequence, not per clause.** A clause with
> five observable consequences and one mapped requirement is not covered;
> the matrix discloses the consequences it enumerates for each clause, so a
> complete-looking matrix over under-enumerated consequences is a defect of
> the matrix. At surface specification a clause-to-requirement coverage
> matrix over RFC2-1..RFC2-26 is produced — **that matrix is review
> material, never authority**. This clause creates no OpenSpec content now
> (none may exist during bootstrap). This clause binds the whole RFC 0002
> package, not this module alone. (Shape-parallel with RFC6-28, RFC7-38,
> RFC8-32, RFC9-52, RFC10-16, RFC11-12.)

**The denominator is four**: the four slice rows of Gate 3's
authorizing-act table [Observed, counted this session over that table]. The
test is run over all four. Every requirement and scenario cited below was
read at source this session.

| Slice | RFC2-26 consequence class | Approved requirement **and** scenario | Limb 1 |
|---|---|---|---|
| 1 Retained record | **"evaluation and snapshot displays"** is engaged only if the record is *displayed*, and slice 1 displays nothing — it writes a file. As a pure persistence change it enumerates **no** consequence of RFC-0002: it is not a rendering, not a claim, not an Unknown-reason presentation and not an API answer | **None.** The retention sweep above is the evidence: 0 occurrences of `retention` or `append-only` across both `spec.md` files, and the two `history` scenarios constrain non-rewriting rather than require persistence | **Unmapped, and this packet says so rather than reaching for a nearby requirement.** RFC2-26's limb 1 is not satisfied because nothing to satisfy it exists. Limb 2 — a reviewed N/A judgment — is **available in form but not obviously reachable**: the clause admits only a consequence "purely structural with no independently testable behavior", and a file on disk is independently testable. So slice 1 is scheduled from a **recorded review finding** (L2-F5) under the improvement-cycles direction's own limb, which is a different authority from RFC2-26's, and an owner who reads RFC2-26's bar as reaching a non-rendering change may want a requirement first. **This packet does not call slice 1 lawful or unlawful on that reading** |
| 2 Delta view | "evaluation and snapshot displays" (the band names two evaluation identities); "claim and challenge rendering" (it names tuples); "API answers over epistemic state" (the machine form answers with the same delta) | **PWB-REQ-007** (spec line 439) — its Case line, "enumerate every project entity, claim and aggregate across **two evaluations of the same semantic subjects**" (lines 453–454) — with scenario **"Missing current evidence remains explicit Unknown"** (lines 470–474), whose AND limb reads "its tier, freshness and evaluation identity remain visible". For the Unknown-when-no-history arm, **POC-REQ-032** (POC spec line 574), scenario **"Unknown disclosed in the narrative"** (lines 599–604). For parity, **PWB-REQ-020** (line 902), scenario **"Complete model has wire parity"** (lines 928–933). For the band as a narrative unit, **PWB-REQ-014** (line 759), scenario **"A project claim is supported without making Polaris authority"** (line 799) | **Available, and this is the strongest row in the packet.** PWB-REQ-007's Case line names the exact object slice 2 computes over — two evaluations of the same semantic subjects — and its Oracle line names the exact property slice 2 depends on. **The residue, stated:** no scenario's WHEN limb names a *rendered delta*; PWB-REQ-007's scenario is about a single claim's Unknown, and the requirement's Case line is an oracle instruction rather than a rendering obligation. An owner who reads RFC2-26's "per observable consequence" strictly may hold that a rendered delta band is a consequence no scenario enumerates and needs one through CC-REV-2 [Inferred] |
| 3 Owner note | "claim and challenge rendering" and "API answers over epistemic state" for the promoted form; for the unpromoted form, arguably none — doctrine says it may affect nothing | **PWB-REQ-014** (spec line 759), whose requirement text carries "Personal view state SHALL remain outside the truth model" (lines 772–773) and whose Case and Oracle lines already specify the injection counterexample (lines 778–782, 791–792). Its scenario is **"A project claim is supported without making Polaris authority"** (line 799) | **Partial, and in an unusual direction: the requirement carries a *prohibition* on personal state, not a permission for it.** PWB-REQ-014 tells an implementer what a note must never do; no requirement tells it what a note may do, and no scenario's WHEN limb names one being written. So limb 1 is satisfied for the *constraint* and unsatisfied for the *feature*. Slice 3 does not ship, and the gate that decides it is Q4's act question rather than this row |
| 4 Dismissal | "claim and challenge rendering" directly — a dismissal is a challenge-state value, which the clause names in terms | **PWB-REQ-007** (line 439), whose Case line enumerates "every admitted label, tier, reason, freshness, **challenge** and sibling state" (lines 454–456), with scenario **"Missing current evidence remains explicit Unknown"** (lines 470–474) | **Available as a *constraint* and unavailable as a *warrant*.** PWB-REQ-007 fixes the vocabulary a dismissal must join; it does not admit a second value, and the implementation's comment says the POC has no challenge mechanism because RFC2-8 challenges are a deferred wave. So the mapping exists and points the other way: the requirement is the reason slice 4 is an amendment. That is Q5, and this packet rules it neither way |

**What the test establishes and what it does not.** It establishes
[Observed] that slice 2 maps to a requirement whose Case line names its
exact object and to three further requirements for its rendering, Unknown
and parity obligations; that slice 1 maps to **nothing**, and that this is a
measured absence with a stated denominator rather than an oversight; and
that slices 3 and 4 map to a requirement that constrains them rather than
warranting them. It does **not** establish that any slice is lawful: that is
the owner's, and RFC2-26's own scope sentence — "This clause binds the whole
RFC 0002 package, not this module alone" (lines 219–220) — is a reading the
owner may take more or less broadly than this packet has.

### New WHEN/THEN scenarios, for the beads' acceptance contract, not the spec

These are acceptance criteria for the implementing beads. They are **not**
proposed spec text and nothing here amends a requirement.

**S1 (slice 1).** WHEN the daemon starts and builds its model, THEN exactly
one evaluation record is written under the state directory, named by that
evaluation's `inputsDigest`, with directory mode `0700` and file mode
`0600`, AND the state directory contains no other new entry.

**S2 (slice 1).** WHEN a materialize triggers a second model build in the
same process, THEN a second record exists, the first is byte-identical to
what it was before the rebuild, AND both are readable.

**S3 (slice 1).** WHEN a record already exists under an `inputsDigest` and a
build produces a *different* claim-state map under the same digest, THEN the
write is refused with the append-only error, AND the existing bytes are
unchanged.

**S4 (slice 1).** WHEN a retained record's bytes are truncated, THEN the
loader reports `unreadable` — not `absent` — AND no positive claim about
prior state is made.

**S5 (slice 1).** WHEN a record is written, THEN the bytes contain zero
occurrences of any source body, any support anchor and any credential value,
AND the file's top-level key set equals the declared literal set.

**S6 (slice 2).** WHEN two retained evaluations differ by one claim
identity present only in the later, THEN the delta reports that identity
under `added`, reports `tupleChanged` as empty, and reports the union
denominator; AND a band that showed only `tupleChanged` would render nothing
for this case.

**S7 (slice 2).** WHEN no prior evaluation is retained, THEN the band
renders a named Unknown with its reason and its route, AND the strings
meaning "no changes" and "up to date" appear zero times.

**S8 (slice 2).** WHEN a claim's `challenge` changes while its `epistemic`
is unchanged, THEN the delta reports it under `tupleChanged`, AND a
comparison on `epistemic` alone would miss it.

**S9 (slice 2).** WHEN one claim identity appears twice in an evaluation
with equal tuples, THEN the delta counts it once and reports both the tuple
count and the distinct-identity count; and WHEN the two instances disagree,
THEN the build fails rather than picking one.

**S10 (slice 2).** WHEN the band renders, THEN every fact it shows is
recoverable from the same evaluation's machine answer, AND the parity sweep
reports both denominators for the new marker family.

**S11 (slice 2).** WHEN the page is served with the band present, THEN the
encoded response is measured on both host forms and recorded against the
lane A figures, AND a response within one byte of `maxHumanResponseBytes` is
served while one byte over is not.

**S12 (slice 3, if ever built).** WHEN an unpromoted note is attached to
every claim identity in the model, THEN every epistemic tuple, every count,
every machine fact and every parity denominator is byte-identical to the
run without notes.

**S13 (slice 4, if ever built).** WHEN a dismissal's expiry precedes the
evaluation's own `asOf`, THEN the gap renders; AND WHEN the process clock is
advanced past the expiry without a new evaluation, THEN nothing about the
rendered page changes.

## Collision and sequencing

**The file-set intersection here is not zero**, because slice 2 renders on
the page every other Polaris move also renders on. Two predicates are
reported, and the second is reported in two columns, as M11's packet does —
its review 2 found that a full-path-only predicate drops continuation-form
and bare-basename citations and publishes a false absence, so both columns
are published here from the start rather than one being discovered later.

**M12's surface** is the **15** existing files M12's slices read or edit,
enumerated here rather than left to a cross-reference. The three new modules
(`packages/three-surface-poc-core/src/evaluation-retention.ts`,
`packages/three-surface-poc-core/src/claim-state-delta.ts` and
`packages/three-surface-poc-core/src/owner-note.ts`) cannot appear in any
sibling's packet and are excluded.

1. `apps/three-surface-poc/src/main.ts`
2. `apps/three-surface-poc/src/polaris.ts`
3. `apps/three-surface-poc/src/polaris-copy.ts`
4. `apps/three-surface-poc/src/materialize-action.ts`
5. `packages/three-surface-poc-core/src/index.ts`
6. `packages/three-surface-poc-core/src/model.ts`
7. `packages/three-surface-poc-core/src/project-shape-model.ts`
8. `packages/three-surface-poc-core/src/project-shape-manifest.ts`
9. `packages/three-surface-poc-core/src/project-shape-observation.ts`
10. `packages/three-surface-poc-core/src/body-read-authority.ts`
11. `packages/three-surface-poc-core/src/walkthrough-judgment.ts`
12. `packages/three-surface-poc-core/src/walkthrough-readiness.ts`
13. `packages/three-surface-poc-core/src/materialization.ts`
14. `packages/cap1-daemon/src/write-guard.ts`
15. `docs/THREE-SURFACE-POC.md`

This is the list the evidence record carries as `collision.m12_surface`, and
every one of the 15 resolves as a file in this worktree [Observed, each
checked this session]. **It is not Gate 3's existing-file set**, and the two
differ in both directions. Gate 3's topology table names **12** existing files
by full path, of which **2** are not on this surface —
`apps/three-surface-poc/src/polaris-parity-sweep.test.ts` and
`apps/three-surface-poc/src/walkthrough-preflight.ts`. **5** of the 15 are not
among those 12: `project-shape-observation.ts` and `walkthrough-readiness.ts`
are named only in Gate 3's "Not touched by any slice" prose;
`body-read-authority.ts` appears inside the slice-1 row as a bare basename and
never as a full path; and `walkthrough-judgment.ts` and `write-guard.ts` do
not appear in the Gate 3 section at all [Observed; predicate: every code span
in the four data rows of Gate 3's topology table that resolves as a file in
this worktree, denominator all spans in those rows]. [This sentence read
"is the **15** existing files of Gate 3 (the three new modules cannot appear
in any sibling's packet and are excluded)" until 2026-09-15; review 1's F7 —
the denominator was named as a set it is not, and a reader holding the packet
alone could not rebuild it. Every collision cell below was computed against
the 15 enumerated here, and re-running the three predicates against that list
reproduces every cell, so no figure moves.]

**Predicate A — citation.** Extract every code span from every Markdown file
under each sibling worktree's `docs/design/`; keep those beginning `apps/`,
`packages/`, `scripts/` or `docs/`, or equal to `package.json`; keep those
that resolve as a **file** in this worktree; intersect with M12's 15-file
surface.

**Predicate B — proposal.** The same extraction restricted to each packet's
`## Gate 3 — Topology` section, which is where a packet says what it would
*touch*. A citation is not a proposal (verification rule 5).

**B-full** keeps full paths only. **B-basename** adds one admission: a bare
code span with no `/` in it, counted when it equals the basename of a file
on M12's surface **and that basename is unique across the repository's 1,216
tracked files**. Two are not unique and are therefore matched by full path
only on both columns: `main.ts` (2 occurrences repo-wide) and `index.ts`
(4). The other thirteen are unique [Observed, computed this session].

| Sibling | Head read this session | A: citation ∩ 15 | B-full | B-basename | The B files (B-basename; **bold** = admitted only by the basename limb) |
|---|---|---:|---:|---:|---|
| M1 lane B, PR #35, P-68 | `4090f98` | 0 | **0** | **1** | **`polaris.ts`** — in continuation form; its Gate 3 names `polaris.ts` as a renderer lane A edits, and full-path matching sees neither it nor anything else on M12's surface |
| M2, PR #36, P-69 | `f2f37dd` | 4 | **4** | **5** | `main.ts`, `polaris-copy.ts`, `model.ts`, `project-shape-model.ts`, **`polaris.ts`** |
| M3, PR #37, P-70 | `6574600` | 3 | **2** | **2** | `polaris.ts`, `polaris-copy.ts` — both named in full |
| M4, PR #38, P-71 | `63b8e33` | 6 | **5** | **5** | `polaris.ts`, `polaris-copy.ts`, `materialization.ts`, `model.ts`, `project-shape-model.ts` |
| M5, PR #39, P-72 | `ba9ca61` | 4 | **3** | **4** | `polaris.ts`, `model.ts`, `project-shape-observation.ts`, **`project-shape-model.ts`** |
| M6, PR #40, P-73 | `83c9f60` | 0 | **0** | **1** | **`polaris.ts`** — in continuation form |
| M7, PR #42, P-76 | `f97baf4` | 2 | **1** | **2** | `project-shape-observation.ts`, **`polaris.ts`** |
| M8, PR #43, P-74 | `bce9039` | 10 | **7** | **9** | `main.ts`, `polaris.ts`, `polaris-copy.ts`, `body-read-authority.ts`, `model.ts`, `project-shape-model.ts`, `walkthrough-readiness.ts`, **`project-shape-manifest.ts`**, **`project-shape-observation.ts`** |
| M9, PR #41, P-75 | `65de02b` | 4 | **2** | **6** | `polaris.ts`, `model.ts`, **`materialize-action.ts`**, **`polaris-copy.ts`**, **`body-read-authority.ts`**, **`project-shape-model.ts`** |
| M10, PR #44, P-77 | `95f31cb` | 4 | **2** | **2** | `polaris.ts`, `model.ts` — both named in full |
| M11, PR #45, P-78 | `bbd6837` | 8 | **6** | **6** | `main.ts`, `polaris.ts`, `THREE-SURFACE-POC.md`, `model.ts`, `project-shape-observation.ts`, `walkthrough-readiness.ts` |

(Full paths for the last column are `apps/three-surface-poc/src/<name>` for
the app files, `packages/three-surface-poc-core/src/<name>` for `model.ts`,
`project-shape-model.ts`, `project-shape-manifest.ts`,
`project-shape-observation.ts`, `body-read-authority.ts` and
`walkthrough-readiness.ts`, `packages/three-surface-poc-core/src/` for
`materialization.ts`, and `docs/` for `THREE-SURFACE-POC.md`.)

**What the basename limb changes.** The column moves on **7 of the 11** rows
— M1 lane B 0→1, M2 4→5, M5 3→4, M6 0→1, M7 1→2, M8 7→9 and M9 2→6 — while
M3, M4, M10 and M11 do not move, their Gate 3 sections carrying no bare
surface basename. **Two rows that read as a clean zero under B-full are not
zero**: M1 lane B and M6 each name `polaris.ts` in continuation form, so a
full-path-only sweep would have published two false absences [Observed, both
columns computed this session over the eleven worktrees at the heads named].

**Per-file frequency across the eleven siblings' Gate 3 sections
(B-basename).** `polaris.ts` **11/11** — every sibling proposes to touch it;
`model.ts` **7/11**; `polaris-copy.ts` and `project-shape-model.ts` **5/11**;
`project-shape-observation.ts` **4/11**; `main.ts` **3/11**;
`body-read-authority.ts` and `walkthrough-readiness.ts` **2/11**;
`materialize-action.ts`, `project-shape-manifest.ts`, `materialization.ts`
and `docs/THREE-SURFACE-POC.md` **1/11** each. **Three files on M12's
surface are named by no sibling's Gate 3 at all**:
`packages/three-surface-poc-core/src/index.ts`,
`packages/three-surface-poc-core/src/walkthrough-judgment.ts` and
`packages/cap1-daemon/src/write-guard.ts` — **0/11** under both predicates
[Observed, both computed this session over the eleven worktrees at the heads
named].

**The largest overlap is M8** at 7 of 15 under B-full and 9 of 15 under
B-basename, and it survives on both readings; M11 is second at 6 and 6.
M12's own edit footprint is much smaller than its surface: slices 1 and 2
**edit** only `main.ts`, `model.ts`, `polaris.ts`, `polaris-copy.ts`, one
parity test, `docs/THREE-SURFACE-POC.md`, the package index and two new
files — the other six surface files are read, not written.

**Named collisions, per the prompt's list.**

- **M10 (P-77, PR #44) owns the stable claim id and `inputsDigest` on the
  machine contract.** M12's delta needs neither of M10's mints: it joins on
  `ProjectShapeClaim.claimId`, which exists, carries no revision and is
  required stable by PWB-REQ-007. Slice 1 *names its file* by `inputsDigest`,
  a field M10's Q1 analyses but does not change. **M12 decides none of M10's
  six questions and takes no position on any of them.** Where they do meet
  is the machine payload: if the owner takes Q3's second arm (delta on the
  machine channel only) that is a new top-level machine field, which is
  exactly M10's Q6 — so that arm holds behind M10's Q6 as well as Q3.
- **M2 (P-69, PR #36) owns the horizon.** M2's horizon compares a pinned
  evaluation's sources against the **live** repository head; M12's delta
  compares two **retained** evaluations. Different objects. But M2's Q3 is
  the same doctrinal fork as M12's Q6 and M2 has already ruled its own,
  recommending "A second identified evaluation, never a freshness value"
  (the M2 packet, docs/design/POLARIS-M2-EVIDENCE-CURRENCY-FUNNEL.md line
  47, read read-only at `f2f37dd`). **If the owner rules M2's Q3 that way,
  the same reading pushes M12's Q6 toward its second arm**, and the
  implementing bead should take the two answers together rather than build
  two different treatments of "a fact about more than one evaluation"
  [Inferred — a reading of two packets, not a measurement].
- **M4 (P-71, PR #38) owns the owner loop's evidence records and any
  owner-authored record class.** Slice 3's note is an owner-authored record,
  and that is M4's subject before it is M12's. M12 does not ship it; if the
  owner opens Q4, **the record class should be M4's and the claim binding
  M12's**, so two packets do not mint two owner-record schemes. M12's Gate 3
  names `materialization.ts` read-only for the posture, and M4's Gate 3
  names it too (1/11 above) — the one file where the two overlap.
- **M11 (P-78, PR #45) owns the status route that would list retained
  evaluations, and its Q1 is the disclosure-class question.** A status route
  that reports "N evaluations retained, oldest at …" is M11's route and
  M11's credential-class question, not a second answer to it. M12 adds one
  fact such a route could carry and **asks no disclosure question**; if M11's
  Q1 clears and slice 1 lands, the retained-record count is a natural row for
  that route and belongs in M11's design, not here.
- **M6 (P-73, PR #40) owns generator honesty.** No overlap at all: M6's Gate
  3 names nothing on M12's surface under B-full, and under B-basename names
  only `polaris.ts` in continuation form. The generator's own records are a
  different store with a different act.
- **M1 lane A (main, P-67) and lane B (PR #35, P-68) own the ceiling
  headroom slice 2 would charge.** Q3 is where the owner rules that. Lane B
  is still open over the same budget, so the implementing bead must
  **re-measure** on both host forms rather than reuse Q3's figures — a
  headroom taken today is a figure about today.

**Sequencing inside M12.** Slice 1 gates slice 2 absolutely: there is
nothing to diff until something is retained. Slice 1 gates on Q1 and Q2;
slice 2 additionally on Q3 and Q6 and, for its machine arm, on M10's Q6.
Slice 3 gates on Q4 and, for its record class, sequences behind M4. Slice 4
gates on Q5 and needs a CC-REV-2 delta and a new act before any code is
written.

**Not verifiable this session.** [Unknown] Whether the sibling branches'
actual diffs stay inside the paths their Gate 3 tables name — predicate B
measures what each packet *says*. [Unknown] What a real claim-state delta
between two Butlers revisions looks like: the only retained captures are two
evaluations of **different Syzygy observer revisions** against different
Butlers heads, and the daemon serves only the registered locator, so the
band's real-world row count cannot be measured before slice 1 exists.
[Unknown] Whether any `docs/evidence/*.json` digest table beyond the seven
whose basename contains `manifest` binds the bytes slices 1 and 2 would
edit.

## Gate 6 — Engineering bar

**What this packet computed rather than transcribed.** The claim population
(1,149 objects, 1,148 identities, 2 distinct tuples, 177,031 canonical
bytes) was computed from the retained machine capture by a recursive walk,
not read from any prior record. The write sweep's 56 lines were partitioned
by a script whose eight buckets sum to 56 with an explicitly empty "other"
bucket. Both collision predicates were recomputed from scratch over the
eleven sibling worktrees at the heads named. The act-corpus sweep's
denominator (553 files) is a union computed this session, not a figure
carried from a sibling packet.

**Three predicates this packet tested rather than assumed, because each had
a plausible wrong form.** (1) The `challenge` sweep: the word-boundary
predicate returns 35 lines **case-sensitively** (36 case-insensitively, and
43 / 44 without the `challenge-suspended` exclusion) and misses
`CHALLENGE_STATES` and `ChallengeState` outright; the substring predicate
returns 50, and the 15-line difference splits **7 non-test / 8 test**, of
which the 2 that matter are the constant and the type themselves. Published
with all the figures and the reason. [This item read "returns 35 lines"
without the case qualifier, and said the difference was "entirely in the
non-test population", until 2026-09-15;
review 1's F5.] (2) Basename uniqueness on the collision surface:
`main.ts` and `index.ts` are not unique over the repository's 1,216 tracked
files, so both are matched by full path only on both columns and the
limitation is stated rather than assumed away. (3) The retention absence
claim: a naive sweep over the two `spec.md` files would have reported no
retained record anywhere, and PWB-REQ-022 requires one — disclosed in full
before the absence is claimed, with the three reasons it is a different
object.

**Every absence claim carries its denominator.** No evaluation is written:
157 `.ts` files, 81 non-test, 56 matching lines, exhaustively partitioned.
No requirement names retention: 2,160 lines of approved requirement text,
twelve terms, per-term counts published. No governance directory in the
observed project: 278 observed source paths, with the remainder explicitly
[Unknown] and the reason it must stay so. No `.syzygy/local/`: 556 tracked
files under `.syzygy/`, with git's empty-directory behaviour disclosed. No
act binds M12's surface: 553 governance, manifest and evidence-manifest
files.

**Rule-6 mutants are specified per slice**, **22** in all across the four
slices (6 + 6 + 5 + 5), each naming the test that must fail and the
fixture that must produce the failure. The two that matter most are slice
1's (a) — rewrite an existing record in place — because it is the invariant
both existing appenders already guard and neither currently exercises
against a file; and slice 2's (d) — collapse a repeated claim identity
without asserting tuple equality — because a duplicate identity exists in
the current payload today and a naive delta would silently choose one.

**No act-bound byte is proposed for edit.** The registry entry, the
classification policy, both `spec.md` files and every act record are quoted
and never modified. The two slices that would require a bound byte to change
(3's registry `writeSurface`, 4's PWB-REQ-007 vocabulary) are held behind an
act and an amendment respectively, and both are questions rather than
recommendations.

**Conformance discipline.** Expected values in the slice oracles are
hard-coded literals and are never imported from the module under test
(slice 1's `claimStates` comparison builds its map by a separately written
walk; slice 2's delta fixture hard-codes the expected delta). The
copy-oracle lesson applies to slice 2's band: every label it introduces must
be a distinctive string, because a short label like `added` would be
"reached" by coincidence anywhere on a 1.4 MB page.

**Build discipline for the implementing bead.** A core type change requires
`tsc -b packages/three-surface-poc-core` before
`tsc --noEmit -p apps/three-surface-poc`, or the app reports phantom errors;
`build:poc` keeps `tsc -b --force`. **Stale since 2026-10-28.**
[PR #549](https://github.com/tzeusy-org/syzygy/pull/549)
(`syzygy-bpyt.4.2`) moved the no-emit root typecheck to workspace source.
Run `npm run typecheck` without a prior build. `npm run build:poc` invokes
`scripts/clean_build.mjs`, which clears the participating build outputs
before running the project build without `--force`.

Slice 2's page measurement needs a
committed, clean tree and a private daemon on `--port 0 --state-dir <scratch>`,
measured twice — direct and with the tailnet `Host` — never through a
loopback daemon on a fixed port.

**What this packet did not verify, and says so.** It did not run the POC
daemon, did not observe any repository, and made no provider call. It did
not measure a real delta between two Butlers revisions, because none can
exist before slice 1 does. It did not sweep every `docs/evidence/*.json` for
digest tables beyond the seven whose basename contains `manifest`. It ran
`python3 scripts/check_governance.py` in the worktree and read the tail
line.

**Independent review status: two, both retained.** Review 1 (2026-09-15,
verdict **REVISE**) read the bytes at commit `a55fe3a` and is retained
verbatim at
`docs/reviews/R-POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL-RAW.md`;
its twelve findings are dispositioned in "Review 1 and repairs
(2026-09-15)" below. Review 2 (2026-09-15, verdict **CONFIRM WITH
EXCEPTIONS**) read the bytes at commit `4d61b73` and is retained verbatim
at
`docs/reviews/R-POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL-2-RAW.md`;
its five findings are dispositioned in "Review 2 and repairs
(2026-09-15)" below. By verification rule 10 each review binds the bytes
it read and not these, so the review-1 repairs were uncovered until a
second review confirmed them (which has since happened — review 2,
2026-09-15; re-tensed 2026-09-15) and the review-2 exception repairs are
uncovered until a third does. The figures above are valid for `a9f671e`
and for the sibling heads named. [This paragraph read "**Independent
review status: one, retained.** … the repairs are uncovered until a
second review confirms them" until 2026-09-15, and "**Independent review
status: none.** This is a first draft. By verification rule 10 nothing in
it is confirmed" until 2026-09-15 before that.]

## Review 1 and repairs (2026-09-15)

An independent fresh-context review of this packet (read-only; only the
artifact, its governing references and the acceptance criteria) is retained
verbatim at `docs/reviews/R-POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL-RAW.md`
(**34,220** bytes, sha256
`549b38f1654b0bc33fc6329aae8b9747fb91260e63405ac6c393cf9ca84e2605`, computed
this session with `wc -c` and `sha256sum` and never transcribed). It reviewed
this packet and its evidence record as they stood at commit `a55fe3a`, the
first draft:

| File reviewed at `a55fe3a` | Bytes | sha256 |
|---|---:|---|
| `docs/design/POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL.md` | 136105 | `d65c7860608bf8f1520c27ff71501bd9e8861c840aeec0177e2a70e0f58ab924` |
| `docs/evidence/polaris-m12-retained-evaluations-funnel-2026-09-15.json` | 31585 | `9765554e546c159b676df90b702984211cd9e7c2ac5c1361c52222cb3b28485f` |

[Observed, each recomputed this session by `git show a55fe3a:<path>` piped to
`wc -c` and to `sha256sum`.] Its verdict word, copied exactly: **REVISE**.
Counts as the raw states them: **blocking 1 · non-blocking 7 · editorial 4**,
numbered F1–F12.

**Its six-question table, in one line:** all six questions are **genuine hard
human gates** (Q3 "partly", because the honesty constraint inside it is
settled rather than open), scope is truthful on all six with Q1's
dossier-comparison half qualified by F1 and Q3's per-tuple limiting sentence
by F6, the recommendation follows from the evidence on all six, every lawful
arm is named on all six rows, **no lawful arm is called unlawful anywhere**,
and **all six defaults are stated and all six fail closed**. Of the nine items
under "Decided in this packet, not put to the owner" the review calls eight
properly a delegate's and one a hidden owner question — that one is **F1**,
and the ruling it names is withdrawn above.

**Every one of the twelve findings was re-derived against source before being
applied.** None was applied on the review's say-so; **ten** re-derived
exactly and **two** only in part — F3, with the part that did not confirm
recorded at the site rather than copied, and F11, whose comment anchor this
pass took from review 1's raw as "line 27" where a re-derivation would have
produced **26-27** (review 2's G4; corrected in the F11 row below).
10 + 2 = 12. [This sentence read "eleven re-derived exactly and one (F3)
re-derived only in part" until 2026-09-15; superseded in place after review
2's G4 made F11 the second partial.]
read at `a9f671e`; the prefix census was re-run over the retained `/api/poc`
capture both by distinct identity and by claim object; `EXTRACTION_CLASSES`
and `PROJECT_ACCOUNT_KEYS` were read at source and their members matched
against the identities they explain; the `challenge` sweep was run five ways
over the same 246 files; the claim-tuple spans were measured on the pre-trim
capture and on both lane A after-captures; the 15-file surface was checked
path by path against this worktree and against Gate 3's topology table; the
146-row diff was re-run; and the five cited line spans (`canonicalJson`'s
import, M10's packet lines 35–36, `MATERIALIZE_ATTRIBUTION`'s comment,
`vision.md`'s expiry sentence) were each re-read at source.

| Finding | Severity | Disposition |
|---|---|---|
| F1 the dossier's prerequisite line is misquoted, and the elided words are the evidence against the packet's own ruling | blocking | **CONFIRMED.** `docs/pursuits/2026-09-13-vision-pursuit.md` lines 415–416 at `a9f671e` read "**Prerequisite.** None for retention and delta; owner act for the note (retention posture); spec amendment for dismissal"; the literal `retention posture` occurs **1** time in the dossier, **0** times in the packet's two quotations of that line and **0** times in the evidence record's `dossier.prerequisiteLine` [Observed; predicate `grep -n -F 'retention posture'` over all three files, and `grep -n -F 'owner act for the note'` to locate the quotation sites — 1 in the packet at its "does not survive" paragraph (that paragraph was re-cast 2026-09-15 under review 2's G1 and now opens "cannot be read off as written"), 1 in the re-split paragraph, 1 in the record]. Repaired at all three: the full line is now block-quoted with the parenthetical, the re-split paragraph carries it, and the record gains a dated sibling key. The correction is restated as what the evidence supports — the dossier attached the retention-posture trigger to the note's owner act and gave "none" for retention and delta; whether that trigger reaches slice 1's derived record is Q1. **The "reached without the trigger list being read" ruling is withdrawn** at all four places it appeared (the decided-in-this-packet paragraph, the funnel summary's dossier-corrections line, the recommended handoff, and by implication the record's `prerequisiteVerdict`, which gains a dated sibling). **Q1 is unchanged**: same question, same recommended answer, same three arms, same default |
| F2 the `claim:item:` prefix figure is a tuple count published as an identity count | non-blocking | **CONFIRMED, exactly.** Re-run this session over the retained `/api/poc` capture with the packet's own recursive-walk predicate: distinct identities 278 / **415** / 439 / 9 / 6 / 1 = **1,148**; claim objects 278 / **416** / 439 / 9 / 6 / 1 = **1,149**. Both rows are now published, in the Measurements and in the record's `byIdentityPrefix` (the 416 kept, marked, beside a dated tuple-instance sibling) |
| F3 "all five `claimId` sites" under-enumerates | non-blocking | **CONFIRMED IN PART.** The six interpolating sites re-derive exactly — 367, 375, 383, 403, 430 and **447**, the last the Unknown arm of `projectAccountOf` — and 447 was missing from the packet and from the record's array; repaired at both, and in the funnel summary. **Not confirmed:** the raw's incidental count of "twelve `claimId:` lines" of which "the remaining six are the fixed literal". The literal `claimId:` returns **13** lines in that file, of which **4** carry `'claim:project-shape'` (345, 457, 611, 659), **2** are interface declarations (123, 157) and **1** is a pass-through (173) [Observed, enumerated this session]. The corrected denominator is published at the site; the conclusion — no site interpolates a revision — is unchanged |
| F4 "1,148 … interpolated from observed-project text … exactly 1 is a fixed literal" overstates | non-blocking | **CONFIRMED, and quantified exactly.** The 1,148 partition **1,117** observed-derived (278 source paths + 415 item keys + their 415 `claim:fact:item:` twins + 9 catalog headings) / **30** closed-vocabulary / **1** fixed literal. The 30 are 9 `claim:class:` and 9 `claim:fact:count:` whose suffixes are all members of `EXTRACTION_CLASSES` (nine values, `project-shape-manifest.ts` lines 58–68) and 6 `claim:project-account:` and 6 `claim:fact:project-account:` whose suffixes are all members of `PROJECT_ACCOUNT_KEYS` (six values, `project-shape-extraction.ts` line 46) [Observed, both constants read at source and every suffix matched against them this session]. Q1's sentence now carries the split with the constants named, and the record mirrors it. **Q1's recommendation, arms and default do not change** |
| F5 the rejected predicate does not reproduce as stated, and "entirely in the non-test population" is false | non-blocking | **CONFIRMED, every figure.** Over the same 246 `.ts` files: `\bchallenge\b` case-sensitive with the `challenge-suspended` exclusion **35**, case-insensitive with it **36**, case-sensitive without it **43**, case-insensitive without it **44**; the accepted substring predicate **50** = **25** test + **25** non-test. The 15-line difference splits **7 non-test / 8 test** — `drawer.ts` 59, 60, 114, 138, 174 and `project-shape-model.ts` 83, 84 on one side, the eight the raw lists on the other. Both the Measurements passage and Gate 6 item (1) now state the predicate as case-sensitive, publish all four figures, and replace "entirely in the non-test population" with the 7/8 split and the observation that 2 of the 15 are the constant and the type themselves. Mirrored in the record's `challengeSweep` |
| F6 "586.3 is an upper bound on a post-trim renderer" is contradicted by the post-trim captures already in hand | non-blocking | **CONFIRMED, on both host forms.** Measured this session with the packet's own span predicate: the pre-trim retained capture carries **699** spans totalling **409,829** bytes, mean **586.3**, min 559, max 661; each lane A after-capture carries **713** spans totalling **418,122**, mean **586.4**, min 559, max 661, identical direct and tailnet. The post-trim cost is 0.1 bytes *higher*. Q3 and the Measurements now publish 586.4 as the post-trim figure and say the per-tuple cost is **stable across the trim** rather than an upper bound; the row figure is recomputed and survives — 612,665 / (2 × 586.4) = 612,665 / 1,172.8 = **522.4**, which still floors to the published **522**, and its `[Inferred]` label is kept. Mirrored in the record's `ceiling` by dated sibling keys |
| F7 "M12's surface is the 15 existing files of Gate 3" does not describe the 15 | non-blocking | **CONFIRMED, and the enumeration is now in the packet.** All 15 are listed and all 15 resolve as files in this worktree. Gate 3's topology table names **12** existing files by full path; **2** of those 12 are not on the surface (`polaris-parity-sweep.test.ts`, `walkthrough-preflight.ts`) and **5** of the 15 are not among the 12 — `project-shape-observation.ts` and `walkthrough-readiness.ts` appear only in Gate 3's "Not touched by any slice" prose, `body-read-authority.ts` appears in the slice-1 row as a bare basename and never as a full path, and `walkthrough-judgment.ts` and `write-guard.ts` do not appear in the Gate 3 section at all [Observed, this session]. **No collision cell is recomputed and none moves**: the enumeration matches the record's `collision.m12_surface` exactly, which is the list every cell was computed against, and the raw reproduced every cell independently |
| F8 the twelve-file drift claim's denominator is under-specified | non-blocking | **CONFIRMED.** `git diff --name-only f4589e2 a9f671e` prints **146** paths this session; **0** of the twelve distinct files of the "Line numbers re-verified at `a9f671e`" table appear in it, and `apps/three-surface-poc/src/polaris.ts` — which the Measurements cite and which is not one of the twelve — **does** appear [Observed, each of the twelve tested by exact whole-line match against the 146]. The twelve are now named one by one, the claim is scoped to them, and `polaris.ts` is called out. Mirrored in the record |
| F9 `canonicalJson` import site mis-cited | editorial | **CONFIRMED.** `grep -n -F 'canonicalJson' packages/three-surface-poc-core/src/project-shape-observation.ts` returns lines **36** (the import member), 337 and 635 (the two digest sites) this session; line 336 is inside `resourceLimitsDigest`. Corrected to 36, superseded value marked |
| F10 the M10 cross-reference contradicts itself | editorial | **CONFIRMED.** Read read-only at `95f31cb`: the M10 packet's line 35 is its **Q1**, which is where the `inputsDigest` insensitivity is established, and line 36 is its Q2, on `Content-Encoding: gzip` and the response ceiling. The first clause now says Q1 and names what Q2 actually asks |
| F11 `MATERIALIZE_ATTRIBUTION` comment anchored one line late | editorial | **CONFIRMED at the site that quotes it.** The words "Fixed, never user-supplied — this action is human-triggered but not human-identified" are at `apps/three-surface-poc/src/materialize-action.ts` lines **26–27** [this row read "line **27**" until 2026-09-15, copied from review 1's raw rather than re-derived; read at source this session, line 26 carries "Fixed, never user-supplied —" and line 27 "this action is human-triggered but not human-identified", so the quoted sentence spans 26–27 — review 2's G4, a dated correction and not a deletion]; lines 28–29 are the `export const MATERIALIZE_ATTRIBUTION = …` declaration. The quoting site is corrected. The other site cites 28–29 for the *constant* and not for the comment, so it was already accurate; it is made explicit rather than changed |
| F12 `vision.md`:176-179 is called "the expiry sentence" and marked "exact" | editorial | **CONFIRMED, and the same overrun is in the row's third span.** Read at source: the expiry parenthetical runs **175–177**, exception (a) ends on **177**, and 178–179 are exception (b)'s first two lines. So L2-M6's 176–179 opens mid-sentence and overruns by two lines, and L2-M8's 170–179 overruns by the same two. The verdict cell now reads "exact for 167-181; approximate for the other two", with both overruns stated and with the note that these are the dossier's spans, not the packet's, which cites 175–177 in Q5 |

**Recommended answers changed by this review: none.** **Q1** still recommends
treating a durable per-evaluation claim-state record as a retention-posture
change and obtaining an owner act before slice 1 lands; F1 changed the
*dossier comparison* beside it and withdrew a ruling, F2, F3 and F4 corrected
the figures inside it, and the question, the three lawful arms and the
default — slice 1 does not ship, and slice 2 with it — are word for word what
they were. **Q3** still recommends the capped band with the remainder
disclosed as a counted, routed Unknown; F6 replaced a claimed upper bound
with a measured figure and the 522 rows it turns on did not move, so neither
the recommendation nor the default (the third arm: counts on the page, list
on the machine channel) changed. Q2, Q4, Q5 and Q6 are untouched by every
finding. **No default-if-unanswered moved**, no seventh question was added,
and no sibling packet's question is re-asked.

**Register.** These six questions are registered as **P-79** in
`.syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md` on this branch, in
the same pass as these repairs. P-68 (M1 lane B), P-69 (M2), P-70 (M3), P-71
(M4), P-72 (M5), P-73 (M6), P-74 (M8), P-75 (M9), P-76 (M7), P-77 (M10) and
P-78 (M11) each live only on their own branch, as PRs #35–#45, and this row
lives only on this one.

**These repairs are uncovered.** Every edit in this pass was made after the
review, so by verification rule 10 the review binds the bytes it names —
commit `a55fe3a`, the two digests tabled above — and not these: **the twelve
repairs above are uncovered until a second independent fresh-context review
confirms them** (which has since happened — review 2, 2026-09-15, retained
at `docs/reviews/R-POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL-2-RAW.md`;
re-tensed 2026-09-15), and that review's raw would be a second `-RAW.md`
file, never an overwrite of this one. Superseded wording is marked in
place and dated, never deleted.
never deleted. One limitation is worth stating plainly, because no reader can
check it from the artifact: the claim that each finding was re-derived
*before* being applied asserts an ordering inside this session. The results
are checkable; the ordering is not [Observed for the results, Unknown for the
ordering].

**Conventions after these repairs**, re-derived over the final bytes of this
pass, last of all and iterated to a fixed point: **8** lines exceed
78 columns (predicate: lines outside fenced code blocks whose first non-space
character is not a pipe, length > 78; denominator: all **2,019** lines of
this file); **0** non-fence lines carry an odd backtick count, over
**1,931** non-fence lines (trailing empty segment not counted); the
non-fence lines carry **401** distinct code spans, of which
**108** contain a `/` and **32** of those do not
resolve as a path in this worktree. Those 32 partition
**4** declared absences, **3** proposed new modules, **6** tree globs, **2**
`<name>` placeholders, **2** HTTP route paths, **4** bare directory
fragments, **4** command lines, **1** gitignored build artifact, **1** path
inside the Polaris generation kit and **5** spans that are prose or code
rather than paths (an epistemic tuple string, a footer form, a source
comment): 4 + 3 + 6 + 2 + 2 + 4 + 4 + 1 + 1 + 5 = 32. Of those 8 over-78
lines **4** are forced by a single code span wider than 78 columns with its
delimiters — lines **57** (span 102), **236** (148), **342** (79) and
**1009** (85) — and the other **4** are wrapping choices rather than forced:
**430** (line 79 columns, longest span 64), **547** (92, the
double-backtick span **65** with its delimiters — review 2 reports 64, a
one-column difference in how the double delimiters are counted, immaterial
either way), **1350** (88, longest span 29) and **1794** (79,
longest span 32), each of which would fit inside 78 columns if the line were
wrapped before its span without breaking it. **0** non-fence line breaks a
code span [Observed, every figure enumerated
over the bytes this paragraph is part of and iterated to a fixed point, so
the figures are true of the bytes that carry them]. [The sentence above read
"Every one of the 8 over-78 lines is a line an unbreakable code span
forces" until 2026-09-15 — an "every" claim that fails on half its own
population; review 2's G5, re-measured span by span this session. Every
figure in this paragraph is true of the bytes at commit `4d61b73`, the bytes
review 2 read; the same conventions over the bytes this close-out produced,
with the over-78 lines enumerated by number, are re-derived at the end of
the review-2 section below.]
`python3 scripts/check_governance.py` was re-run after these edits and its
tail line read, not grepped.

## Review 2 and repairs (2026-09-15)

A second independent fresh-context review of the once-repaired packet
(read-only; only the artifact, its governing references and the acceptance
criteria) is retained verbatim at
`docs/reviews/R-POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL-2-RAW.md` (**33,703**
bytes, sha256
`f75576d0f18c180df785af338a6c718b617bd5180a3150b15746449351e9ebba`, computed
this session with `wc -c` and `sha256sum` and never transcribed). It reviewed
commit `4d61b73`, at which the four files it names hashed as follows —
recomputed this session with `git show 4d61b73:<path>` piped to `wc -c` and
to `sha256sum`:

| File reviewed at `4d61b73` | Bytes | sha256 |
|---|---:|---|
| `docs/design/POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL.md` | 166846 | `528f8eb8fa1cc90e504a689e2f91f0925fd7beda55b694713ca096cf58468ba0` |
| `docs/evidence/polaris-m12-retained-evaluations-funnel-2026-09-15.json` | 50409 | `70a1c880dd1af410d744ffd6b6d04fedf74134dac7197646ae7b7c07ecb0de8a` |
| `.syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md` | 34027 | `8dc39326a8d39f7e5cb8f0167126163a4ddeca18b2839ee74ae6e8ba36e90c34` |
| `docs/reviews/R-POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL-RAW.md` | 34220 | `549b38f1654b0bc33fc6329aae8b9747fb91260e63405ac6c393cf9ca84e2605` |

Its verdict word, copied exactly: **CONFIRM WITH EXCEPTIONS**. Its counts, as
the raw states them: **blocking 0 · non-blocking 2 · editorial 3** —
five findings, G1–G5, non-blocking G1–G2 and editorial G3–G5.

**Its verification of the review-1 repairs, in the raw's own verdict strings
for each row.** Ten of the twelve are verified repaired outright: F2
**REPAIRED**; F3 **REPAIRED, and the repair worker is right against the
raw**; F4 **REPAIRED, and the partition re-derives to the identity**; F5
**REPAIRED, all five predicates reproduce**; F6 **REPAIRED, on both host
forms**; F7 **REPAIRED, and the enumeration is exact**; F8 **REPAIRED**; F9
**REPAIRED**; F10 **REPAIRED**; F12 **REPAIRED** (one consequence missed,
G3). The blocking **F1** is **REPAIRED** (one residual, G1) — the residual
being the Q1 ruling still standing in "Decided in this packet, not put to
the owner", which G1 re-casts as what Q1 asks. **F11** is **PARTIAL** — see
G4: the declaration's own citation (lines 28-29) is right at both sites, but
the quoted comment spans lines 26-27 and the review-1 repair moved it to 27,
one line short at the head. So: **10 REPAIRED, 1 REPAIRED with a residual
(F1) and 1 PARTIAL (F11) over 12**, and the residue of each is the exception
named beside it.

**Review 2 confirms the packet's own correction of review 1 on F3.** The
literal `claimId:` returns **13** lines in
`packages/three-surface-poc-core/src/project-shape-model.ts`, not the twelve
review 1's raw asserted — 6 interpolating (367, 375, 383, 403, 430, 447),
4 fixed literal (345, 457, 611, 659), 2 interface declarations (123, 157)
and 1 pass-through (173); 6 + 4 + 2 + 1 = 13 [Observed, re-counted this
session with `grep -c -F 'claimId:'`, denominator that file]. The packet
recorded the raw's figure as not confirmed rather than copying it, and
review 2 calls that right.

**Every exception was re-derived against source before being applied; none
was applied on the review's say-so, and all five confirmed.** What no reader
can check from the bytes is the *ordering* — that the re-derivation came
first — which is an assertion about this session, not about the artifact
[Observed for the results, Unknown for the ordering]. The same limitation
applies to the claim that the convention figures below were computed last.

| Finding | Severity | Re-derivation | Disposition |
|---|---|---|---|
| G1 a ruling on Q1 survives in "Decided in this packet, not put to the owner" | non-blocking | **CONFIRMED.** Read this session: the section's first item opened "**The dossier's prerequisite line does not survive as written, and the half that fails is the first half**" and argued that "The **first clause does not**". The dossier's first clause is "None for retention and delta"; whether a prerequisite is required for retention is exactly Q1, and Q1's second arm (rule it inside the existing authorization on the same-posture reading) and third arm (rule it inside on the narrower disclosure-limited ground) each leave that clause standing — so the unqualified form asserted Q1's own recommended answer inside a section headed "not put to the owner" [Observed, the Q1 row and the Q1 section both re-read this session] | Applied as the raw recommends. The lead sentence and the argument are re-cast as what Q1 asks — "the first clause cannot be asserted without ruling Q1, because retention is the one part of this move that touches a named escalation trigger by its own noun" — with the superseded wording quoted and dated at both sites, and the same change made in the funnel summary's opening dossier clause. The live-occurrence sweep for "does not survive" / "does NOT survive" over the packet, the record and the register **as they stood at `4d61b73`** (predicate: exact substring, counted both line-wise and over the whitespace-flattened text; denominator all three whole files) found **3** in the packet, **2** in the record and **0** in the register: all five are handled — two re-cast, three now inside dated supersession or historical-locator brackets — and over the bytes this close-out produced **0** of the surviving occurrences is a live assertion — every one is inside a quotation, a dated supersession bracket or a locator note [Observed, re-swept this session both ways over all three files]. Mirrored in the record by dated sibling keys beside the existing `dossier` entry. **Q1's question, recommended answer, three lawful arms and default are unchanged**, byte for byte against `git show 4d61b73:` of this file |
| G2 the `buildModel()` count does not reproduce under its own published predicate | non-blocking | **CONFIRMED.** `grep -n -F 'buildModel()' apps/three-surface-poc/src/main.ts` returns **3** lines this session — **113** (the declaration `function buildModel(): ReturnType<typeof buildButlersPocModel> {`), **187** and **201** — over that file's **253** lines by `wc -l`. The packet named line 113 as the declaration in the same sentence, so the substantive claim (two call sites) was never wrong; the published predicate was [Observed] | Applied at both sites. Each now states the predicate as the literal excluding the declaration at line 113 and publishes **3** as the raw count beside the **2** call sites, with the superseded bracket and predicate quoted and dated. Mirrored in the record by a dated sibling key beside `measurements.evaluationInstant.predicate`. No figure that rests on the two call sites moves |
| G3 the re-verification tally was not updated by F12 | editorial | **CONFIRMED.** The verdict column of the table was re-read row by row this session: **9** wholly exact (the `main.ts`, `project-shape-manifest.ts`, `project-shape-observation.ts`/`walkthrough-readiness.ts`, `project-shape-model.ts`:84/:129, `project-shape-model.ts`:120-131, `architecture.md`:56-57, `architecture.md`:221-229, `materialize-action.ts`:17-30 and PWB-spec:439 rows), **2** narrowed by one at the tail, **1** approximate, **1** wrong referent and **1** mixed — the `vision.md` row, whose verdict F12 changed to "exact for 167-181; approximate for the other two" while the tally kept counting it among the exact. 9 + 2 + 1 + 1 + 1 = 14 [Observed; denominator the table's 14 rows] | Applied in the funnel summary: the tally publishes 9 exact, 2 narrowed, 1 approximate, 1 wrong referent and 1 mixed, with the superseded tally quoted and dated at the site. Mirrored in the record by a dated sibling key beside `lineSpanReverification.exact` |
| G4 F11's own line anchor is one line short, and was applied rather than re-derived | editorial | **CONFIRMED.** `apps/three-surface-poc/src/materialize-action.ts` read at source this session: line **26** ends "... Fixed, never user-supplied —", line **27** is "this action is human-triggered but not human-identified.", and lines **28-29** are the `MATERIALIZE_ATTRIBUTION` declaration. The quoted sentence therefore spans **26-27**, and review 1's raw said "line 27" in the same words, so the finding was applied rather than re-derived [Observed, lines 24-29 read] | Applied at four places: the quoting site and the earlier precedent sentence now cite lines **26-27**; the F11 disposition row carries a dated correction rather than a deletion; and the review-1 section's "eleven re-derived exactly" sentence is superseded in place to name F11 as the second partial beside F3 (10 + 2 = 12). Mirrored in the record by dated sibling keys beside the `review1` block's `dispositions.F11` and `re_derived_before_applying.editorial_spans`, neither of which is edited |
| G5 the "unbreakable code span" explanation of the 8 over-78 lines does not hold for 4 of them | editorial | **CONFIRMED, span by span.** Measured this session over the `4d61b73` bytes, longest code span per line including delimiters: **57** span 102, **236** span 148, **342** span 79 and **1009** span 85 are genuinely forced; **430** (line 79, longest span 64), **547** (92, the double-backtick span 65 here and 64 in the raw, a one-column difference in counting the double delimiters), **1350** (88, longest span 29) and **1794** (79, longest span 32) are not, and each would fit inside 78 columns if wrapped before its span. The count of 8 is exact; the "every" attached to it failed on half the population [Observed; denominator the 8 over-78 lines] | Applied by **annotating rather than reflowing** — the choice this pass made, because a reflow would move lines review 2 read for a cosmetic reason and risks breaking a span. The review-1 conventions paragraph now names the 4 forced lines with their span widths and states the other 4 as wrapping choices, with the superseded "every" sentence quoted and dated, and the paragraph pinned to the `4d61b73` bytes it describes. The same conventions over the bytes this close-out produced — where the line numbers have moved — are re-derived at the end of this section, computed last and iterated to a fixed point |

**Recommended answers changed after review 2: none, stated explicitly.**
Review 2's own six-question table answers "Recommendation follows?" **Yes**
for all six and "All lawful arms named?" **Yes** for all six; its "Genuine
hard human gate?" column is **Yes** for five and **Partly** for Q3, in the
same terms review 1 used, and it calls no arm and no default unlawful. It
records the defaults as all six stated and all six failing closed, and finds
no place where a trade-off is smoothed into consensus language [Observed,
read from the retained raw]. **Q1 through Q6 keep the recommendations, the
lawful arms and the defaults they carried into this review, word for word**;
no default-if-unanswered moved, no seventh question was added, and no
sibling packet's question is re-asked. All five exceptions are
presentational or evidentiary: G1 re-casts an assertion as the question it
belongs to, G2 repairs a predicate, G3 an arithmetic tally, G4 a line
anchor, G5 an "every" claim about line wrapping.

**What review 2 recorded for the owner rather than resolving.** Review 2
attaches no `[Unknown]` label of its own. It records **one** hidden owner
question in the packet — G1, the residue of F1 — and says every other item
under "Decided in this packet" is a measurement-backed correction a delegate
may properly make. It records one further non-material observation: the Q1
quotation of the continuation act's trigger paragraph adds bold emphasis
that the packet's "verbatim" framing does not flag. Both are carried here
unresolved rather than argued away; the first is applied above as G1, and
the second is left as the review states it [Observed, read from the raw].

By verification rule 10, review 2 binds the bytes it names — the four
digests tabled above, at commit `4d61b73` — and not these. Every edit in
this section and above it was made after that review, so **the five
exception repairs are uncovered until a third independent fresh-context
review confirms them**; that raw would be a third `-RAW.md` file, never an
overwrite of either retained one. Subject to that, and on review 2's
confirmation of the `4d61b73` bytes — CONFIRM WITH EXCEPTIONS, no blocking
finding, no recommended answer moved, and the review-1 repairs verified 10
REPAIRED, 1 REPAIRED with a residual and 1 PARTIAL over 12 — **this packet
stands at the owner gate**: P-79 is ready to be ruled.

**Conventions after the review-2 repairs**, re-derived over the final bytes
of this pass, last of all and iterated to a fixed point: **8** lines
exceed 78 columns (predicate: lines outside fenced code blocks whose first
non-space character is not a pipe, length > 78; denominator: all
**2,217** lines of this file); **0** non-fence lines carry an odd
backtick count, over **2,129** non-fence lines (trailing empty
segment not counted); the non-fence lines carry **420** distinct code
spans, of which **110** contain a `/` and **33** of those do
not resolve as a path in this worktree.

Enumerated by line number, the over-78 lines are **57**, **256**, **362**,
**455**, **578**, **1041**, **1385**, **1829**. Of them **4** are forced by a
single code span wider than 78 columns with its delimiters (57 span 102; 256
span 148; 362 span 79; 1041 span 85) and **4** are wrapping choices annotated
rather than reflowed, which is G5's disposition (455 line 79 longest span 64;
578 line 92 longest span 65; 1385 line 88 longest span 29; 1829 line 79
longest span 32).

**0** non-fence line breaks a code span. The rise against review 1's
401 / 108 / 32 is this section's own prose; the **1**
added non-resolving span is the command line
`grep -n -F 'buildModel()' apps/three-surface-poc/src/main.ts`, quoted in
G2's re-derivation [Observed, every figure enumerated over the bytes this
paragraph is itself part of and iterated to a fixed point, so the figures
are true of the bytes that carry them].
`python3 scripts/check_governance.py` was re-run after these edits and its
tail line read, not grepped.

## Funnel summary

```
## Feature Request: M12 - Retained evaluations, a rendered claim-state delta, and the owner's note
Size: medium (slices 1, 2) / large (slices 3, 4 - neither ships in the default)
Baseline: Syzygy a9f671e; the dossier audited at f4589e2 and all twelve distinct files of the "Line numbers re-verified at a9f671e" table - each named one by one at the head of this packet - are byte-identical between the two (git diff --name-only f4589e2 a9f671e prints 146 paths and 0 of the twelve is among them; polaris.ts IS among the 146 and is NOT one of the twelve) [the clause read "all twelve M12-cited files ... (git diff --numstat over the twelve: 0 rows)" until 2026-09-15; review 1's F8]. Of the 14 rows in the re-verification table, 9 re-locate exactly, 2 are narrowed by one line at the tail, 1 is approximate, 1 names the wrong construct (L2-M8's project-shape-model.ts:89-102 is UNKNOWN_REASON_ROUTES, not the challenge seam, which is 81-84 and 129) and 1 is mixed - the vision.md row, exact for 167-181 and approximate for the other two spans; 9+2+1+1+1 = 14 [the tally read "10 re-locate exactly, 2 are narrowed by one line at the tail, 1 is approximate, and 1 names the wrong construct" until 2026-09-15, when review 2's G3 found that F12 had changed the vision.md row's verdict without the tally following it; the table's verdict column re-read row by row this session, denominator its 14 rows]
- G1 Motif: VIS-6's two closed exceptions are both wholly unimplemented - one observation instant minted at main.ts:134, two build sites (187, 201), three state-directory write sites across 157 .ts files (credential, materialization record, test-artifact record) and 0 that write an evaluation; the retained capture's state directory holds one 64-byte file; the two append-only appenders exist, are byte-identical in shape, and are reachable only from their own tests (11 sites, 2 definitions, 9 in *.test.ts, 0 in the package index) [Observed, every figure measured this session with predicate and denominator]
- G2 Doctrine: VIS-6 quoted entire as the warrant, (b) for slice 1 and (a)'s five constraints for slices 3-4; VIS-2 for the no-history-is-not-no-change rule and the capped band; architecture.md's temporal rule 221-229 for what a delta may claim; VIS-1's ordering; SEC-4 and SEC-5 for the note and the new store; SEC-1/2/3 swept and not engaged; RFC5-11 quoted at its defined clause, putting a dismissal on the claims side of the acts/claims line so VIS-6a's expiry rule applies without qualification
- G3 Topology: apps/three-surface-poc/src + packages/three-surface-poc-core/src + packages/cap1-daemon/src (read only) + docs/; slices 1 and 2 cross no boundary and touch no governed artifact; slices 3 and 4 cannot be built without a bound byte changing, which is why neither ships; 0 act records and 0 manifest rows name any of the 15 surface files over 553 governance/manifest/evidence files, the only hits being a candidate CC-REV-2 inventory that says of itself it authorizes nothing and one rule-6 mutation record; no M12 slice duplicates an unchecked PWB task (35 boxes, 32 checked, open: 4.6, 5.2, 5.3)
- G4 Design: one record per evaluation named by inputsDigest, written after both buildModel() sites, 0700/0600, three-state loader (present/absent/unreadable); a pure claimStateDelta over two claim-state maps reporting added/removed/tupleChanged/unchanged against one denominator - membership first, because the retained capture has 2 distinct tuples over 1,149 objects; the note and the dismissal sketched with their gates named and neither built; 22 rule-6 mutants
- G5 Spec: the retention sweep over 2,160 lines of approved requirement text, twelve terms, per-term counts - 0 for retention, dismiss, annotat, since and append-only across both spec.md files, with PWB-REQ-022's retained walkthrough execution record disclosed in full as the one retained record that IS specified (human-authored, governed plane, at a path that does not exist). RFC2-26 run over all four slice rows (denominator 4): slice 2 maps to PWB-REQ-007, whose Case line names "two evaluations of the same semantic subjects" and whose Oracle line requires stable identity across them, plus POC-REQ-032, PWB-REQ-020 and PWB-REQ-014; slice 1 maps to NOTHING and the packet says so rather than reaching; slices 3 and 4 map to requirements that constrain them rather than warrant them
- G6 Bar: three predicates tested rather than assumed (the challenge word-boundary trap, basename non-uniqueness on the collision surface, the retention absence that PWB-REQ-022 falsifies); every absence claim with its denominator; both collision predicates published from the start with both columns; no act-bound byte proposed for edit; TWO independent reviews retained - review 1 (2026-09-15, verdict REVISE - 1 blocking, 7 non-blocking, 4 editorial, F1-F12; all twelve re-derived against source before being applied, ten confirmed exactly and two only in part, and no recommended answer moved) and review 2 (2026-09-15, verdict copied exactly: CONFIRM WITH EXCEPTIONS - blocking 0, non-blocking 2, editorial 3, G1-G5; it verified the review-1 repairs as 10 REPAIRED, 1 REPAIRED with a residual (F1) and 1 PARTIAL (F11) over 12, and moved no recommended answer), all five exceptions applied, and by verification rule 10 those five exception repairs are uncovered until a third review confirms them [this line read "NO independent review yet - this is a first draft, and by verification rule 10 nothing here is confirmed" until 2026-09-15, then "ONE independent review retained ... uncovered until a second review confirms them" until 2026-09-15, when review 2 landed; the "eleven confirmed and one confirmed only in part" clause is superseded by review 2 G4 to ten and two]
Acts: slices 1 and 2 ride THREE-SURFACE-POC-IMPROVEMENT-CYCLES-DIRECTION.md lines 55-56 (the recorded-finding limb, L2-F4 and L2-F5) inside PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md lines 59-61's implementation plane, continued by PWB-IMPLEMENTATION-AUTHORIZATION-CONTINUATION-ACT.md - but slice 1 touches the continuation act's retention-posture trigger by its own noun (lines 152-154), which is Q1. Slice 3's promotion is forbidden in terms by PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md lines 70-72 and bounded by a digest-bound registry declaring an empty write surface; slice 4 crosses the spec-amendment trigger at lines 151-152 and needs CC-REV-2 plus a new act
Open questions: Q1-Q6 above, registered as P-79 in PENDING-OWNER-DECISIONS.md on this branch, in the same pass as the review-1 repairs. Main's register at a9f671e carries 26 rows under ^| P- (21 open + 5 acceptance-act), its highest number anywhere is P-67, and P-7[0-9] returns 0 hits there; with P-79 this branch carries 22 open and 5 acceptance-act, 27 in all. The sibling rows P-68..P-78 each live only on their own branch [this line read "NOT yet registered ... It would take P-79" until 2026-09-15, when review 1 landed and the row with it]
Dossier corrections: the prerequisite's "none for retention and delta" cannot be asserted without ruling Q1 - retention is the one part of this move that touches a named escalation trigger by its own noun, while the dossier's full line attaches the retention-posture trigger to the note's owner act and gives "none" for retention and delta - whether that trigger reaches slice 1's derived record is Q1, and on Q1's second and third lawful arms the clause stands [this clause read "and the dossier reached 'none' without the trigger list being read" until 2026-09-15; review 1's F1, ruling withdrawn. It then read "does NOT survive" until 2026-09-15, when review 2's G1 re-cast it as what Q1 asks rather than what this packet concludes]; "Depends on ... M10's stable id" does not hold - M10's logicalId is a narrative-anchor sibling, while the claim identity a delta joins on already exists, carries no revision at any of its six construction sites [five until 2026-09-15; site 447 was omitted, review 1's F3], and is required stable by PWB-REQ-007's own Case and Oracle lines; L2-M6's "only claims whose tuple differs" band would be nearly silent, because the retained capture holds 2 distinct tuples over 1,149 claim objects while 278 of its 1,148 identities are repository paths that churn with any commit - membership is the signal; "the state directory holds only the machine credential" is true of the capture and understates the code, which admits three files; L2-M7's "the appendEvaluation pattern already written twice" is a pattern and not a mechanism, since neither appender is reachable outside its own test
Sign-off: pending - the owner's
Recommended handoff: rule Q1 first, because slice 1 gates everything and Q1 gates slice 1; then slice 1; then slice 2 in whichever of Q3's three forms the owner takes; slices 3 and 4 only after Q4 and Q5, and slice 3's record class behind M4
```

## Recommended handoff

**Rule Q1 before anything is built, because it is the only question whose
answer can stop the move.** Slice 2 cannot exist without slice 1 and slice 1
is a proposal to retain. If the owner reads the continuation act's
retention-posture trigger as reaching a derived record, an act comes first
and nothing here is lost — the packet's measurements stay valid and the
design is unchanged. If the owner reads it as already covered, on either of
the two narrower grounds Q1 names, the bead can start the same day. **What
should not happen is slice 1 landing under the dossier's "none" for retention
without Q1 being ruled, because the dossier's own line attaches the
retention-posture trigger to the note's act and says nothing either way about
whether it reaches a derived record.** [This sentence read "because the
dossier reached 'none' without reading the trigger list" until 2026-09-15;
review 1's F1, ruling withdrawn.]

**Then land slice 1, and land it as an observation record rather than as a
cache.** VIS-6(b) is what makes it lawful at all, and VIS-6(b)'s words are
"immutable, evaluation-identified". The bead should treat the append-only
guard as the primary invariant and the file as secondary: the duplicate-
identity refusal both existing appenders implement is the thing that has
never been exercised against durable bytes, and it is mutant (a).

**Then slice 2, in whichever of Q3's three forms the owner takes.** On the
recommended third form — counts on the page, list on the machine channel —
it costs a few hundred bytes and needs no re-measurement argument at all.
On the first form it needs a declared cap, a disclosed remainder, and a
before-and-after measurement on both host forms in the shape
`docs/evidence/pwb-m1-polaris-lane-a-measurement-2026-09-13.json` records,
**taken at the time the bead runs and not reused from this packet** — lane B
is still open over the same budget. On the second form it is a new top-level
machine field, which is M10's Q6 as well as this packet's Q3, and the bead
should not start it until both are ruled.

**Whatever form slice 2 takes, the band must distinguish three states, not
two.** No prior evaluation; a prior evaluation with no differences; and a
prior evaluation that cannot be read. Rendering the first or the third as
the second is VIS-2's named violation at the smallest available scale, and
it is the one mistake in this move that would make the page less honest than
it is today.

**If Q6 is ruled as M2's Q3 was**, the delta becomes a second identified
evaluation with its own identity and its own instant, and the bead should
take M2's and M12's answers together rather than build two treatments of "a
fact about more than one evaluation". If Q6 is ruled the recommended way,
the delta is a disclosed rendering artifact under PWB-REQ-014's
non-normative framing role, mints no identity, and is the cheapest honest
thing that answers the owner's question.

**Do not start slice 3 or slice 4.** Slice 3's promotion is forbidden in
terms by the act in force, bounded by a digest-bound registry declaring an
empty write surface, and pointed at a directory that does not exist in
either repository. Slice 4 would widen a vocabulary a signed requirement
fixes. Both are recorded here at design depth so the owner can rule on
something concrete, and both should stay recorded rather than built until
Q4 and Q5 are answered. **If Q4 is opened**, the note's record class is M4's
subject before it is M12's, and the two packets should mint one scheme.
**If Q5 is opened**, the CC-REV-2 delta comes before any code, and the
expiry's clock is settled already by doctrine — the evaluation's own `asOf`,
never `Date.now()`.

**One thing worth recording in the bead's close reason whichever way this
goes.** The POC already discards an evaluation silently, every time a
materialize rebuilds the model at `main.ts` line 201. Until slice 1 lands,
the owner who clicks materialize has replaced the evaluation they were
reading with a different one and has no way to see that it happened — and
the footer they would check now says something different than it did a
moment ago, with no record of what it said before.

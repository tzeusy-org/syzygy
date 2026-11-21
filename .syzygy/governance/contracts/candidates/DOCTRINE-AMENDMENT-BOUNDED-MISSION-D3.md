# Doctrine amendment packet — D3 (proposed, rev1): a human trigger may authorize a bounded mission

**WITHDRAWN 2026-11-21 by the owner, as superseded by D10** (answer
recorded in `../../decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md`). Act 5 is
not offered. The text below is history; a future mission amendment starts
from the D10 doctrine text.

**Status: DRAFT — not applied, not adopted.** Doctrine amendment is an owner
act (VIS-4; AGENTS.md adoption authority). This packet is a **minimally
revised** replacement for `DOCTRINE-AMENDMENT-BOUNDED-MISSION-DRAFT.md`
(sha256 `30efb7c5fc933e18fc5f5e5c3daaab7689881d9e51cb282e997f0a4c450ba173`),
which is **left untouched** at the owner's gate. The owner may adopt this
rev1 packet, amend, or decline; act 5 carries no magic phrase. (The
original draft remains readable for comparison, but the acceptance record
records that its `vision.md` insertion cannot be applied as written —
SD-8 — which is the defect rev1 exists to remove; adopting it would
require exactly the unrecorded editorial judgment rev1 eliminates.)

**Why a rev1 exists.** Three defects were found in the original draft during
the charter §14 review
(`round-2026-08/MISSION-CONTROL-REVIEW.md` §5.3). Two are in the amendment's
own text; one is an omission from the packet's mechanics. All three are
repaired below and itemized in §5. **The amendment's substance is unchanged:**
it fixes the *grain* of a human trigger and nothing else.

**What this amendment is for.** Owner direction OD-R10-2 asked for the minimal
clarification *if doctrine needs it*. Doctrine today ties one human act to one
propagate/sync pass (`architecture.md`), so a mission authorizing repeated
plan/materialize/execute/verify/re-plan cycles would need a fresh trigger per
cycle — functionally the routine-step approval charter §3 item 14 forbids.
`vision.md`'s "Not autonomous" bullet, read alone, fixes no grain and is not
itself the obstacle.

**Operative consequence of declining, stated plainly:** RFC-0010 can be
*accepted* without this amendment — it binds nothing doctrine forbids — but
Mission Control cannot lawfully *operate*: unamended, a human trigger is one
deliberate propagate/sync pass. Declining is a lawful choice; it keeps missions
out of operation until doctrine says otherwise.

**Why this amendment is not self-licensing under VIS-4 (the D4 question; the
owner may overrule this position):** VIS-4's two-part mechanism (accepted
adjudication RFC + explicit owner doctrine amendment) governs opening *autonomy
beyond VIS-4's stated bounds* — delegation of the always-human decision
classes. A bounded mission delegates **execution inside every gate** and never
adoption, approval, widening, or any always-human class, so this packet's
position is that it clarifies the *trigger grain* of an already-human-triggered
loop rather than opening autonomy beyond VIS-4's bounds — which is why a
doctrine amendment alone (this document, an owner act) is offered. If the owner
instead rules that a bounded mission *is* autonomy beyond VIS-4's stated
bounds, then VIS-4's own terms apply: an accepted adjudication RFC is **also**
required, this amendment alone is insufficient, and RFC-0010 would serve as
that adjudication RFC only after acceptance **and** explicit owner designation.
See §4 — that ruling also fixes the act order.

---

## 1. What it amends

Two sentences, clarified in place; no rule renumbered, no rule retired; VIS-1
through VIS-7 and SEC-1 through SEC-5 untouched.

### 1.1 `architecture.md` — "Snapshots and the loop", the loop paragraph

**Anchor (exact current text, `architecture.md` lines 246–248 at sha256
`e19d255f9a2f2ddaf4da83eb0fe74f17b17d96d31b31bb03f76accb1a2ac11de`):**

> The loop is **human-triggered**: someone specs a desired shape, then
> deliberately triggers a propagate/sync pass.

**Insertion point:** immediately after that sentence and **before** the
sentence beginning "Work-to-code and code-to-deployment…" — inside the same
paragraph, not appended to the paragraph's end.

**Text to insert, verbatim:**

> A human trigger may take either grain: one deliberate propagate/sync pass,
> or one deliberately approved **bounded mission** — a single owner act
> authorizing repeated plan/materialize/execute/verify/re-plan cycles strictly
> inside an explicit **autonomy envelope** that agents can never widen, ending
> at the envelope's own terminal conditions. An envelope is owner-approved and
> states at minimum the mission's objective, its resource and time bounds, its
> risk limits, the surfaces and change classes it may not touch, and its stop
> and completion conditions; the exact envelope fields are contract material,
> not doctrine. The mission grain does not alter what remains human: VIS-4's
> always-human classes, envelope approval and widening, and **every gate that
> would otherwise apply** — a mission is authority to proceed inside the gates,
> never authority to skip one.

**Resulting paragraph (after):**

> The loop: intent → observation → gaps → reviewed work → fleet execution →
> verification, with one upward arrow — verification and runtime evidence may
> open spec-indictment gaps that route to the owner. The loop is
> **human-triggered**: someone specs a desired shape, then deliberately
> triggers a propagate/sync pass. *A human trigger may take either grain: …
> never authority to skip one.* Work-to-code and code-to-deployment belong to
> the orchestration toolchain, outside Syzygy's body.

### 1.2 `vision.md` — "What Syzygy is not", the "Not autonomous." bullet

**Before (exact current text, `vision.md` lines 72–74 at sha256
`816ad50c59abb08ab85dcb1be18e39c4123695521914249d9ded1a980beafa86`):**

> - **Not autonomous.** The loop is human-triggered; autonomy beyond VIS-4's
>   stated bounds is licensed only through the mechanism VIS-4 names, never by
>   reinterpretation.

**Insertion point:** immediately after the word `human-triggered` and
**before** the semicolon. The rest of the bullet is unchanged.

**After (the complete amended bullet, verbatim):**

> - **Not autonomous.** The loop is human-triggered (a trigger may authorize
>   one propagate/sync pass or one bounded, envelope-limited mission — see
>   architecture.md; either grain is a deliberate human act, a mission is
>   authority to proceed inside every gate and never to skip one, and expiry or
>   exhaustion of a mission's envelope halts, never extends, its authority);
>   autonomy beyond VIS-4's stated bounds is licensed only through the
>   mechanism VIS-4 names, never by reinterpretation.

**Optional editorial variant, offered because the parenthetical is long.** If
the owner prefers two sentences to one, this is semantically identical and may
be selected at adoption instead; whichever is adopted is the one recorded:

> - **Not autonomous.** The loop is human-triggered — a trigger may authorize
>   one propagate/sync pass or one bounded, envelope-limited mission
>   (architecture.md). Either grain is a deliberate human act; a mission is
>   authority to proceed inside every gate and never to skip one; and expiry or
>   exhaustion of a mission's envelope halts, never extends, its authority.
>   Autonomy beyond VIS-4's stated bounds is licensed only through the
>   mechanism VIS-4 names, never by reinterpretation.

---

## 2. What it deliberately does not change

- **VIS-4's always-human classes and the spec-adoption gate mechanism** —
  untouched; a mission cannot open, widen, or substitute for that gate.
- **The second half of the "Not autonomous" bullet** — untouched, and it is
  load-bearing: it forecloses reading a mission as its own licensing mechanism
  for autonomy beyond VIS-4's bounds.
- **"Not autonomous" as posture** — a mission is a *human-triggered* act with a
  bounded envelope, not default autonomy; unattended reconciliation remains
  outside doctrine.
- **The idempotence invariant and the one-upward-arrow loop shape** — untouched.
  Each cycle inside a mission remains a pass, and a pass over an unchanged,
  no-gap snapshot still mutates nothing.
- **The exact autonomy-envelope field set** — contract material, not doctrine.
  Doctrine states a floor and the properties that must hold; the enumeration
  lives in the accepted contract that defines it.

---

## 3. What changed from the original draft, and why

| # | Change | Reason |
|---|---|---|
| 1 | `vision.md` insertion moved from **after** the semicolon to **before** it, with the anchor restated as a word rather than a quoted fragment ending in punctuation | The original anchor — *"after 'The loop is human-triggered;'"* — applied verbatim leaves a parenthetical stranded between a semicolon and the clause it precedes, with no punctuation joining them. The adoption mechanics say to amend "with the verbatim text above"; an instruction that cannot be applied without an unrecorded editorial judgment is a defect in an owner-act artifact, and VIS-3 requires fresh-reader review at material amendment. |
| 2 | `architecture.md`: the parenthetical *"(objective, budgets, risk limits, protected surfaces, stop conditions — at minimum; the envelope also bounds permitted write scope, tools, required gates and reviews, evidence obligations, and the completion predicate)"* replaced by a doctrine-level floor plus **"the exact envelope fields are contract material, not doctrine"** | The second half of the original parenthetical mirrored the accepted-contract field enumeration into doctrine, creating a second normative home for one norm: amend the contract's field set later and doctrine silently diverges. Charter §3 item 5 (typed authority) and the §16 knowledge-health detectors "duplicate normative claims" / "conflicting definitions". The **floor is kept** so doctrine stays self-contained and does not depend on a candidate artifact — and no contract is named, for the same reason. |
| 3 | `architecture.md` insertion point stated precisely ("immediately after that sentence and before 'Work-to-code…'") rather than "append" | "Append" is ambiguous between *after this sentence* and *at the end of the paragraph*. Same defect class as change 1, lower severity. |
| 4 | `vision.md` insertion now also carries the gate-preservation clause ("a mission is authority to proceed inside every gate and never to skip one") | **Flagged as a judgment call, not a repair.** The original carried this only in `architecture.md`. `vision.md` is the doctrine file a fresh reader opens first, and the charter's governing standard is that such a reader must not be misled. This restates a doctrine principle across two doctrine files — unlike change 2, it does not import an enumeration from another authority type and carries no drift risk. **If the owner judges it redundant, striking it does not weaken the amendment**: VIS-4 and the bullet's untouched second half already carry the guarantee. |
| 5 | §4 "Sequencing" added — packet prose only, **no doctrine text** | The original stated that RFC-0010/0011 do not depend on this amendment, but not the converse. See §4. |

Nothing else changed. The amendment's operative effect is identical to the
original draft's.

---

## 4. Sequencing — how this act relates to act 1

*This section is packet prose. Nothing here is proposed for insertion into
doctrine.*

Act 5 (this amendment) and act 1 (acceptance of the compacted foundational
contracts) are independent gates and may be performed in either order. The
order has consequences the owner should choose knowingly:

- **Act 5 before act 1.** Adopted, binding doctrine would use the terms
  *bounded mission* and *autonomy envelope* while no accepted contract defines
  either. The contract-side safeguards that make the concept safe —
  RFC10-7's unstated-is-narrowest rule, its propose-only cap, RFC10-8's
  no-self-widening rule — would not be in force. **Operational risk today is
  nil**: no implementation exists, and doctrine's own floor (§1.1) still
  requires an explicit owner-approved envelope that agents can never widen.
  The cost is governance hygiene: an adopted doctrine term with no binding
  definition is the "hidden active authority" condition the round's own health
  checks look for.
- **Act 1 before act 5.** Doctrine's floor lands on top of an accepted contract
  that already enumerates the envelope and fails closed. No residual.
- **If the owner rules D4 the other way** — that a bounded mission *is*
  autonomy beyond VIS-4's stated bounds — then act 1 before act 5 is not a
  preference but a requirement: VIS-4 demands an accepted adjudication RFC as
  well as the doctrine amendment, and RFC-0010 can only serve as that RFC after
  acceptance and explicit designation.

**Recommendation (agent recommendation, not a ruling): perform act 1 first.**
It is free, it removes the residual under every D4 outcome, and it does not
constrain the owner's D3 answer.

---

## 5. Adoption mechanics (if the owner adopts)

1. Amend both files in place with the verbatim text in §1, at the stated
   insertion points; if the §1.2 optional variant is preferred, record which
   text was adopted.
2. Record the amendment in the doctrine README's amendment log as **D3**, with
   the owner's adopting words and the date, following the D1 precedent (id,
   date, what changed at which sites, authority).
3. Record the act in `.syzygy/governance/decisions/`, citing this packet by
   path and digest.
4. One commit + one annotated tag.
5. Re-run the doctrine's fresh-reader review over the amended "Not autonomous"
   bullet and loop paragraph (VIS-3 requires it at material amendment), and
   store the raw verdict verbatim.

Under RFC3-16(c) this is an **owner-adopted bootstrap act** until correlation;
it is not a Syzygy-verified effective act, and must not be rendered as one.

**Digest of this packet:** compute at act time; it is not restated here, since
any edit to this file after a digest is stated would produce an artifact whose
act binds a digest it no longer has.

## 6. A disclosed objection to §1.2, raised after this packet was written

**Read this before adopting §1.2.** Adversarial review RC-7
(`round-2026-08b/reviews/RC-7-mission-safety-RAW.md`, finding F10, judged
*blocking*) holds that the §1.2 insertion **pre-answers open question D4**
rather than leaving it to the owner, and that the packet does not say so.

**The objection.** The insertion places a bounded mission inside VIS-4's bounds
by declaring it a species of human trigger. It does that inside the one
sentence whose second half exists to foreclose exactly that move — a point
this packet makes itself at §2. The packet *argues* the classification, at
§1's rationale, and the argument may well be right; but the argument is packet
prose that adoption does not carry, while the conclusion is doctrine text that
adoption does carry. An owner who adopts §1.2 to settle the mission question
would also, silently, have settled D4.

**What this means procedurally.** RC-7's disposition is that F10 "closes by an
owner ruling, not only by text": rule D4 first, then adopt whichever text the
ruling implies. If D4 is ruled the other way — that a bounded mission *is*
autonomy beyond VIS-4's stated bounds — then no `vision.md` insertion is lawful
without an accepted adjudication RFC (`doctrine/vision.md:127-131`), and act 1
precedes act 5 as a requirement rather than a recommendation.

**Reviewer-proposed alternative for §1.2, if D4 is ruled "inside the bounds".**
Unadopted, offered for comparison with §1.2's text, not a replacement of it:

> - **Not autonomous.** The loop is human-triggered — a trigger may authorize
>   one propagate/sync pass or one bounded, envelope-limited mission
>   (architecture.md). Either grain is a deliberate human act; a mission is
>   authority to proceed inside every gate and never to skip one; and expiry or
>   exhaustion of a mission's envelope halts, never extends, its authority.
>   **A mission delegates execution and never adoption, approval, envelope
>   widening, or any always-human class, and is for that reason inside VIS-4's
>   stated bounds rather than an exception to them.** Autonomy beyond VIS-4's
>   stated bounds is licensed only through the mechanism VIS-4 names, never by
>   reinterpretation.

The difference is one clause: it states the *reason* the classification holds
instead of assuming it, so a fresh reader can see it is an argued position and
can see what would falsify it.

**A second, separable point on §1.1.** RC-7 also observes that the
`architecture.md` floor requires objective, resource and time bounds, risk
limits, untouchable surfaces, and stop and completion conditions — but **not a
maximum autonomy level**. Adopting the floor as written therefore moves "how
autonomous may a mission be" permanently out of doctrine and into contract.
Its proposed one-clause addition, also unadopted:

> …the exact envelope fields are contract material, not doctrine — **except
> that an envelope always states a maximum autonomy level, and raising the
> level at which merges or deployments may occur without a human act is itself
> a doctrine amendment event.**

**Nothing here is adopted, and this section changes no proposed text.** It
exists so that adopting §1 is a knowing act. Recorded as owner item P-24 in
`../../decisions/PENDING-OWNER-DECISIONS.md`.

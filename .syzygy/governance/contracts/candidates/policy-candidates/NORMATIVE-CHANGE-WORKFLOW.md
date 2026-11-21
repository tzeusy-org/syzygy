> **Candidate — binds nothing.** The process around the candidate
> semantic-delta form. Its obligations live in the candidate knowledge-hygiene
> policy (CC-KNOW-7 through CC-KNOW-10, CC-KNOW-14), which binds only through
> its own owner craft-amendment act. Steps below that restate an installed
> clause cite it; the installed clause is the authority.

# Normative-change workflow

**Companion:** [`SEMANTIC-DELTA-TEMPLATE.md`](SEMANTIC-DELTA-TEMPLATE.md) —
the form, the change classes, and the rules on classes.

**Scope:** how a change to active-authority text moves from proposal to
adopted, and who does what at each step. **Non-scope:** what any change
should say; how a pre-D10 owner act was performed (history, in the
acceptance records); work scheduling and branch mechanics.

---

## The workflow

```
0. Classify        which lane, which authority owns the fact, is it gate-bound?
        ↓
1. Draft delta     the form; change class stated up front
        ↓
2. Blast radius    every dependent found, by a stated method
        ↓
3. Fresh review    one reviewer who neither authored it nor shared the session
        ↓
4. Disposition     every finding fixed, or explicitly overruled with rationale
        ↓
5. Adopt           an agent row in AGENT-ADOPTIONS.md; the owner in an owner class
        ↓
6. Propagate       every invalidated artifact, same logical change
        ↓
7. Regenerate      derived artifacts, after adoption
```

### 0 — Classify before drafting

Three questions, in order:

1. **Which lane?** Only active-authority changes need this workflow.
   Historical and evidence material is not edited to stay current; it is
   superseded and cited.
2. **Which authority owns this fact?** Doctrine, contract, spec, topology,
   policy, decision. If the answer is "more than one," stop — that is a
   duplicate-home defect (CC-REV-3) to surface *before* editing, not a
   precedence call to make while editing.
3. **Is it in an owner class?** Doctrine, weakening secret detection,
   writes into repositories the owner does not own, and exposure or release
   are the owner's (VIS-4 as amended by D10); everything else is adopted by
   an agent. When unsure, treat it as owner-class and ask. *(Amended
   2026-11-21, D10 FOLLOW-ON F-7. This question used to ask whether the
   artifact was digest-bound or gate-pending, and said "An artifact edited
   after its act is, for the record, an artifact with no act." Since D10 an
   act's digest is history, not a lock: a later edit is a new adoption
   (RFC3-16 as amended), and no manifest regeneration or digest-binding
   review is needed for it.)*

### 1 — Draft the delta

Per the template. The change class is stated **before** review so that a
reviewer can contradict it. Quote current and proposed text in full; a
summary at this step is where a semantic change hides.

### 2 — Establish blast radius

Find every artifact that cites, derives from, or depends on the affected
identifiers — including derived views, manifests, digests and reading paths.
**State the method**, because a blast radius with no stated method is an
assertion rather than a finding, and "no dependents" requires the sweep that
establishes it, run in the same session (CC-KNOW-16). On this machine a
zero-result pattern sweep needs a second method before it supports a
universal claim.

### 3 — Fresh-context review

The reviewer receives the delta, the artifacts, the governing doctrine and
contract references, and the acceptance criteria. The reviewer does **not**
receive the authoring conversation, the author's reasoning, or any signal of
a desired verdict (CC-REV-1).

- **A session that drafted the change is not fresh with respect to it**,
  whatever role it is later given.
- **Store raw reviewer output verbatim before synthesizing**, and copy
  verdict words exactly: if the report says `EXCEPTIONS`, the summary says
  `EXCEPTIONS`. [Observed — verdict smoothing has occurred in this repository
  and was caught by a confirming reviewer, not by the synthesizer.]
- **No rubber stamps.** A useful review names concrete risks even when it
  accepts; a review with no findings is itself a finding (CC-REV-6).

### 4 — Disposition

Every finding is fixed, or explicitly overruled by the accountable authority
with recorded rationale. Findings are never dropped (CC-REV-6).

**One review, not gating** (CC-REV-4 as amended 2026-11-21). Fix what it
finds, record the dispositions, and decide; do not dispatch confirmation
rounds to chase a clean verdict. A finding a fix cannot reach means upstream
ambiguity: return to the source decision that underspecified it.

### 5 — Adopt

Outside the four owner classes, the agent adopts: the change lands on the
default branch with one row in `decisions/AGENT-ADOPTIONS.md` naming the
commit, what changed, why and the revert command, and a specification
version also gets a tag (VIS-4 as amended by D10). In an owner class the
owner decides, recorded as the owner's words with the commit that applies
it; no phrase or digest ceremony. The adopting agent never labels its
adoption the owner's. *(Amended 2026-11-21, D10 FOLLOW-ON F-7: this step
read "Agents draft; the owner adopts" and sent gate-bound artifacts to an
acceptance ceremony.)*

### 6 — Propagate in the same logical change

Every invalidated authoritative artifact is updated in the same change
(CC-REV-2); "we'll sync the spec later" is a violation, not a plan, and an
open follow-up is syncing later by another name. Superseded material leaves
every default reading path in this same step, not a revision afterwards
(CC-KNOW-14).

**Contradictions stay explicit.** A contradiction discovered here is
surfaced and routed to the owner — never reconciled silently by picking the
reading that makes the change land.

### 7 — Regenerate derived artifacts

Indexes, manifests and generated maps regenerate **after** adoption, never in
anticipation of it (CC-KNOW-11). Then re-verify the self-referential counts
of every file the change touched, not only those whose fix was itself a count
(CC-KNOW-17). Digests are scripted, never hand-transcribed.

---

## Worked micro-example — a one-line edit that is not Editorial

The exemplar is **SD-1** in this round's delta register,
`../round-2026-08/SEMANTIC-DELTAS-THIS-ROUND.md` (read it there; it is not
restated in full here). Its shape:

> **Artifact:** a contract module's governance-homes row.
> **Stable IDs affected:** the one row; no clause renumbered.
> **Current meaning:** the install gate cites an acceptance phrase that has
> since been retired.
> **Proposed meaning:** the gate is the digest-bound act defined by the
> active acceptance record.
> **Class:** Clarifying/corrective — **not Editorial.**
> **Does not change:** the row's validator, any other row, any obligation.
> **Impact:** the prior manifest digest is invalidated → manifest regenerated
> → a new digest-binding review is required.
> **Review class:** digest-binding confirming review.

**What it teaches.** The edit swaps one phrase for another and looks like
cleanup. It is not: the named phrase is *retired*, so as written the module
states a precondition that can never be satisfied, and replacing it changes
**when the gate binds**. Class follows the obligation, not the diff size —
step 1. And a field that looks like paperwork does the real work here: the
**impact** field is what surfaces that a scripted digest, a manifest and a
review cycle all move with a two-word edit — step 2 feeding steps 6 and 7.

---

## Failure modes this workflow is built against

Each row names the step that catches it. The evidence column states what is
on record; where a row is motivated by policy rather than by an incident, it
says so rather than borrowing the authority of the evidenced rows.

| Failure | Caught at | Evidence |
|---|---:|---|
| A semantic change recorded as "unchanged" | 1, 3 | [Observed] — an equivalence review found an authority trigger moved from "no verifiable record" to "no record at all" while the migration matrix recorded it as unchanged; the reviewer held the act |
| Verdict smoothing during synthesis | 3 | [Observed] — two verdict labels softened a reviewer's own verdict word; caught by a confirming reviewer |
| An author reviewing their own normative work | 3 | [Observed] — recorded at this round's preflight as a disclosed conflict |
| Partial propagation of one logical change | 6 | [Observed] — a retired acceptance phrase remained the stated binding precondition in tracked governance files; repaired this round |
| A stale derived artifact presented as current | 7 | [Observed] — two stale cells in a generated load map, beneath a sentence claiming all figures were script output |
| A stale self-count after a fix batch | 7 | [Observed] — a module states its own size in words; a later-added section postdates the figure, and three derived figures depend on it |
| A new artifact creating duplicate authority | 0 | [Observed] — a draft policy proposed sixteen clauses of which six were already covered by the installed cluster; found by an overlap audit, not by the author |
| Renumbering breaking external citations | 1 | **Policy-motivated, not an incident.** One review found a citation landing on an unrelated clause and attributed it to a rename pass as a hedged guess; no renumbering incident is on record |

## What this workflow does not do

- **It has no enforcement.** Every step is a discipline, not a gate. The
  script-checkable parts — blast-radius sweeps, count re-verification,
  citation resolution — do not exist as checks yet.
- **It does not describe the retired owner acceptance ceremony**; the acts
  performed before D10 are history in the acceptance records.
- **It has not been executed end to end.** Steps 3, 4 and 6 describe practice
  this repository has followed in substance across prior review rounds; steps
  0, 1 and 2 are new and lightly exercised.
- **It assumes a reviewer who is available and genuinely fresh.** In a
  single-operator project that assumption is the weakest joint in the
  workflow, and no step here repairs it.

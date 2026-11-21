> **Approved** — owner decision D2 (2026-08-01), amendment B21 applied where noted. **This directory (`.syzygy/governance/policies/craft-and-care/`) is the canonical home of these policies.** The bootstrap-phase copy is preserved separately as historical review evidence. Binding force on implementation work begins with the owner's digest-bound acceptance of the foundational design contracts (the act defined in the active acceptance record; the policies cite RFC clauses that bind nothing until then).

# Engineering bar — Syzygy definition of done and merge/release constraints

Syzygy adds to the canonical bar: what "done" additionally requires here,
what may not merge, what may not release, and the floors no implementing
agent may lower.

- **Baseline:** the canonical `th-engineering` engineering-bar (biases 1–9,
  Definition of Done) applies by reference.

## CC-BAR-1 — Canonical bar adopted; precedence fixed

The canonical bar's default biases and Definition of Done are Syzygy's
baseline; every override of it is registered here.

- **Precedence on conflict:** adopted doctrine and owner rulings > this
  cluster > canonical bar (README).
- **Override register:** overrides of the canonical bar are recorded at the
  policy where they occur and indexed here. The register currently holds
  three:
  1. canonical bias 1 ("prefer cleanup over same-repo compatibility cruft")
     does **not** license deleting or renumbering identity-bearing
     artifacts — rule identifiers, entity IDs, evidence identities, and
     migration history are retired, never renumbered or erased (this clause;
     see CC-DEP-2, CC-REV-7);
  2. canonical test-rigor rule 2 (a fix without a failing-then-passing test
     is unverified — no exceptions) is overridden by CC-TEST-1's rare,
     recorded-infeasibility exception clause, as the phase charter requires;
  3. canonical test-rigor rule 6 ("never retry-until-green") is overridden by
     CC-TEST-4's narrowly conditioned infrastructure-retry clause.
- **An unregistered modification of the canonical bar is itself a
  violation:** the README's re-check-on-bar-change mechanism can only
  re-check overrides it can find.
- *Violation:* a cleanup pass that renumbers `CC-TEST-*` policies to close a
  gap left by a retired rule, breaking every existing citation.
- *Re-check record (2026-08-06):* the 2026-08-06 re-pin (README's "Adoption
  by reference") added canonical engineering-bar's Definition-of-Done item
  "Test delta accounted" to the adopted surface.
  - It does not conflict with, override, or get overridden by any override
    in this register.
  - See `testing-and-verification.md` CC-TEST-7 for the accompanying
    test-rigor re-check.

## CC-BAR-2 — Syzygy definition of done

A non-trivial change is done only when, in addition to the canonical
Definition of Done, all four conditions below hold.

1. **Invalidated artifacts updated in the same change.** Every authoritative
   artifact the change invalidates — behavioral specs, declared topology,
   contracts, policies — is updated in the **same logical change**.
   - This is the unified same-change rule; CC-REV-2 states it fully.
   - The one carve-out: doctrine amendments route through the owner gate
     rather than being edited in-change [Observed — FD-020 E1-b/E10,
     founder decision log].
2. **Evidence retained.** Verification evidence is a **retained, resolvable
   artifact**, not an assertion in a message or transcript (CC-TEST-3;
   SDR-9).
3. **New Unknowns rendered.** Any new Unknown the change introduces into a
   surface is rendered as Unknown, never defaulted to a confident state
   (VIS-2, SDR-6).
4. **Floors declared.** The change record states which risk floors
   (CC-BAR-5) it touched, or "none".
   - Where the change takes review, the reviewer **confirms** that
     statement.
   - A false "none" is a review failure at the time, and a findable
     violation after the fact.

- *Violation:* a change that alters observed-graph semantics, updates the code
  and tests, and leaves the governing contract text describing the old
  semantics "to fix later."

## CC-BAR-3 — Comprehensible truth is a merge constraint

VIS-1 and VIS-3 are enforced at merge time, not aspirationally.

- **No confident state over Unknown (VIS-1).** A change may not merge if it
  causes any surface to render a confident state where the underlying state
  is Unknown, or to simplify **content** rather than **presentation**.
  - VIS-1's boundary: honest aggregation of Unknowns is fine; substituting a
    neighbor's green for an Unknown is not.
- **Fresh-reader bar (VIS-3).** A change to a normative artifact may not
  merge if it degrades that artifact below the fresh-reader bar: a reader
  without authoring context must be able to restate its intent and
  constraints.
  - Reviewers reject on this ground alone, independent of functional
    correctness.
  - This merge constraint always holds and any reviewer may enforce it at
    any merge; the *formal* fresh-reader review runs on SDR-14's schedule —
    CC-REV-4. The two are not in conflict: the constraint is continuous, the
    ceremony is scheduled.
- *Violation:* an LLM-authored spec edit that is functionally accurate but
  compresses three constraints into jargon only the authoring session can
  unpack — merged because "the tests still pass."

## CC-BAR-4 — No green without current evidence is a release constraint

No Syzygy release ships a code path that can declare alignment, convergence,
genome-completeness, or any green/success state without a current,
resolvable evidence trail judged at an identified evaluation (VIS-2;
trust-and-evidence.md).

Concretely, at release review:

- **Traceable status paths.** Every status-rendering path is traceable to the
  evidence class and currency bound that authorizes it.
  - A claim class without a declared currency bound renders Unknown
    [Observed — trust-and-evidence.md].
- **Trust floor is release-blocking.** The trust floor (deterministic-layer
  identity, resolvable internal links, faithful legends, no secret material)
  is **release-blocking for Syzygy's own releases** (VIS-7).
  - A change that breaks it is rejectable regardless of whether it otherwise
    works.
- *Violation:* shipping a portfolio dashboard whose project tiles default to
  green when the observation index is missing, on the argument that "most
  projects are fine."

## CC-BAR-5 — Risk floors no implementing agent may downgrade

Seven floors bound every change: an implementing agent may strengthen them
but never lower them.

- **Implementing agents** — human-directed or fleet — may **strengthen**
  them in a change; they may never weaken, waive, special-case, or
  "temporarily" bypass them.
- **Changing them:** the parts that restate an owner class (the truth
  floor's secret clause, floor 6's secret and execution rules, and SEC-4's
  writes into repositories the owner does not own) change only by the
  owner, through doctrine; the rest by an agent adoption (VIS-4).

The floors, named:

1. **Truth floor** — deterministic-layer identity per identified
   evaluation; every rendered internal link resolves; every encoding means
   what its legend says; no secret in any surface, store, or endpoint
   (VIS-7; trust-and-evidence.md).
2. **Evidence floor** — no green/positive status without current evidence;
   missing evidence renders Unknown, never success, never zero (VIS-2;
   SDR-6).
3. **Inference floor** — inference holds challenge authority only; it never
   establishes or raises a positive status claim, and is never rendered
   indistinguishable from observed fact (trust-and-evidence.md).
4. **Write floor** — direct writes confined to `openspec/**` and
   `.syzygy/**`; all other effects through typed, explicitly authorized
   adapters; Syzygy never writes implementation code (VIS-5).
5. **Decision floor** — the four VIS-4 owner classes (doctrine; secrets and
   unsandboxed execution; writes into repositories the owner does not own;
   exposure beyond the tailnet and release) are decided by the owner;
   everything else by a recorded agent adoption (VIS-4).
6. **Security floor** — SEC-1 through SEC-5 defaults: authenticated by
   default, egress only to declared providers, untrusted observed code,
   attributed and revertable writes, secrets fail closed.
7. **Identity floor** — kernel identities and `.syzygy/**` schema migrations
   are identity-preserving; migrations never orphan or silently re-mint
   durable IDs (CC-DEP-2/3).

- *Violation:* a worker agent, blocked by the secret-detection policy on
  unclassifiable content, adds a bypass flag "for local development" —
  downgrading floor 6's fail-closed behavior without owner authority.

## CC-BAR-6 — Evidence and review scale with declared risk, floors excepted

Verification depth and review intensity scale with a change's declared
complexity/risk class [Observed — FD-020 E2/E9: evidence and review scale
with self-determined complexity]; the declaration is contestable, and
scaling applies above the floors.

- **Who declares:** the implementing agent makes the **initial** declaration
  (that is FD-020's efficiency intent).
- **The declaration is not final.** It is recorded in the change record, is
  **contested by default, and is never finally determined by the agent
  performing the change** where it would waive independent review or lower
  verification depth (mirroring VIS-4's classification rule).
  - A reviewer or the owner may reclassify.
  - A misdeclaration is a findable violation, not a judgment call.
- **Scaling applies above the floors:**
  - a trivial change still may not cross CC-BAR-5;
  - any change touching a CC-REV-1 mandatory-review class gets independent
    review regardless of its self-declared size.
- *Violation:* a "one-line" change self-labeled low-complexity that alters the
  evaluation-identity computation, merged without independent review because
  small diffs skip it.

## CC-BAR-7 — Changes stay reviewable

Unreviewably oversized diffs are rejected as such [Observed — FD-020 E4-e:
"reject … unreviewable oversized diffs"].

- **Split before review:** a change too large for a reviewer to reconstruct
  intent is split before review, not waved through after.
- **Why:** this is the merge-time face of the owner's founding complaint
  ("oversized diffs, scattered completions, no coherent account" —
  vision.md).
- *Violation:* a fleet worker delivering a single change that rewrites an
  adapter, reorganizes storage schemas, and reformats untouched files, with a
  commit message summarizing only the adapter work.

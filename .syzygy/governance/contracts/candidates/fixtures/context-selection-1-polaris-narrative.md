# Context-selection fixture 1 — Polaris narrative/requirement change

## Task

**Objective.** A governed work item: revise an adopted Polaris narrative
section whose claim block cites a requirement whose target anchor changed;
re-anchor and resubmit for adoption. Risk class: content change on the
intent surface; no code, no security surface.

**Warrant.** The named narrative entity and its claim block; the changed
requirement anchor; the adoption workflow the revision re-enters. Declared
change class: content change on the intent surface. The task authors no
OpenSpec requirement and schedules no implementation.

---

*Everything above the rule is the task. Everything below is the recorded
answer: a blind derivation (the protocol review RD-5 ran) receives the Task
section and the governed corpus only, derives a selection, and compares it
against what follows — reading no further until its own selection is
written down.*

**Selection rule trace (RFC11-4, traversal per RFC11-14).** Warrant names
the narrative entity → `applies_to: polaris` selects RFC-0007; the affected
clause set is the narrative model and adoption workflow → module
`narrative-contract` + package README (lookup + spanning invariants). The
claim block renders against evaluation vocabularies → RFC-0002
`rendering-vocabularies` + package README. Shape-defining adoption gates
are doctrine → `vision.md` (VIS-3/VIS-4).

**Phase-boundary rule, applied (RFC11-4 with RFC11-13).** Both selected
contracts declare `implementation_boundary: requires-openspec`, naming
RFC7-38 and RFC2-26; the declarations travel in the two loaded package
READMEs and are recorded here. The task edits adopted narrative content and
does **not** sit on the OpenSpec seam — it authors no requirement and
schedules nothing — so the boundary rule does not force the module defining
RFC7-38 (`rendering-and-surface`); RFC2-26's defining module
(`rendering-vocabularies`) is in the packet on its own merits. Contrast
fixture 8, which sits on the seam and therefore must load the defining
module. This is the single rule both fixtures apply. The pre-amendment
drafts of fixtures 1 and 8 read RFC11-4's old parenthetical in opposite
directions — review RD-5's contradiction finding — and the amended
RFC11-4/RFC11-13 rule is what closed it.

## Required context (mandatory, deterministic)

```
scripts/context_load.py rfcs/RFC-0007/README.md \
  rfcs/RFC-0007/narrative-contract.md rfcs/RFC-0002/README.md \
  rfcs/RFC-0002/rendering-vocabularies.md doctrine:vision.md
```

Measured: **16,585 words ≈ 22,390 estimated tokens.** Band position and
disposition against the proposed (non-installed) budget lines are owned by
`CONTEXT-BUDGET-REPORT.md` §1, computed from this anchored figure; this
fixture's prose makes no band claim of its own.

## Omitted applicable candidates, with reasons

- RFC-0007 `rendering-and-surface` — the task edits content, not surface
  rendering; its obligations bind the surface implementer, not the author,
  and the phase-boundary rule does not force it for a task off the seam
  (see the applied rule above).
- RFC-0002 core/challenge/reconciliation modules — the claim's evaluation
  is pinned by the packet's as-of; authoring consumes the rendering
  vocabulary only.
- RFC-0001, RFC-0006 — anchor and selection semantics are restated at
  authoring strength inside RFC7-11/11(a)/16; the deeper contracts bind
  the kernel, not this edit (moved to suggested, below).
- RFC-0003/0004/0005/0008/0009/0010/0011, `security.md`, all craft
  policies — no governed home change, no evidence capture, no client or
  execution surface touched.

## Why no applicable constraint was lost

Every clause the warrant's entities cite in the index
(`05-CONTRACT-INDEX.yaml`) resolves into the selected set or into the
suggested set below; the adoption gate (VIS-4, RFC7-23/24/25) and the
anchor obligations (RFC7-11(a)) are in the mandatory set. Each selected
contract's implementation-boundary declaration travels in its loaded README
and is recorded in the applied-rule paragraph above (RFC11-4's
mandatory-inclusion rule, consuming RFC11-13). The packet would render
**incomplete/Unknown** (RFC11-6) if the narrative's pinned evaluation were
stale — disclosed, not silently proceeded past.

## Suggested inferred additions (provenance: index adjacency)

RFC-0006 (selection-reference semantics behind RFC7-16); RFC-0001
clauses RFC1-19/RFC1-25 (anchor identity classes). Suggested because the
authoring-strength restatements suffice for this edit; the word cost of
every module is in `CONTEXT-BUDGET-REPORT.md` §3.

## Packet digest

sha256 over the mandatory files concatenated in listed order:
`592e3064733290e3…` (recompute: `cat <mandatory files> | sha256sum`).

**Selection: hand-authored golden selection. Measurement: mechanical.
Compiler implementation: absent.** `scripts/context_load.py` resolves a
path list it is handed and counts words; it has no notion of a task, a
warrant, a risk class, an `applies_to` value, or a dependency edge. The
selection above was made by a human and the trace is the reasoning that
produced it, written down — not a machine's output narrated afterwards.
The `Compiler: context_load.py, selection rules rev10-fixtures` line this
fixture used to carry was removed 2026-08-06: there is no compiler, and
`rev10-fixtures` resolved to nothing anywhere in the repository.

*Re-measured 2026-08-05 (refactor round): packet digest refreshed after the recorded RFC-0007 README correction (cross-module edge count, word-neutral); word/token figures unchanged; selection unchanged.*

*Re-measured 2026-08-05b by `scripts/check_governance.py` CG-18, which recomputes the digest and the word count from the declared mandatory set rather than trusting the recorded figures. Previous: 13,864 words, digest `4544d4b27646e905…`. Selection unchanged; the movement is contract edits landing under a fixture that had no mechanical freshness check until now.*

*Restructured 2026-08-08 (round-2026-08d): task/answer boundary added per
RD-5's blind-derivation protocol; the phase-boundary rule restated under
amended RFC11-4/RFC11-13, closing the fixture-1-vs-8 contradiction; every
transcribed measurement removed — the anchored `Measured:` field and the
packet digest are the only measurements this fixture states, and both are
machine-written by `build_budget_report.py` and recomputed by CG-18.*

*Re-measured 2026-08-10 by the same CG-18 method (declared mandatory set, listed order): the round-2026-08e RD-26 repair batch edited Wave A modules this packet loads. Previous: 14,771 words, digest `901ebc04972830bd…`. Selection unchanged; the movement is contract repairs landing under the fixture, which is the class this check exists to catch.*

*Re-measured 2026-11-22 by the same CG-18 method: the U2 contract amendment (orphan predicate; Contradiction adjudication route per D12) edited contract modules this packet loads. Previous: 16,505 words, digest `715aa7ec3e4359ce…`. Selection unchanged.*

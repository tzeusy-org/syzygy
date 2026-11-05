# Round 2 dispositions — public-source screening scope, version 6

> **Candidate — binds nothing.** Drafted 2026-11-05 (`syzygy-mcs4`).

Reviewed record: docs/reviews/R-SCREENING-SCOPE-V6-dfd1-2-RAW.md

Round 2 returned `REVISE` over `dfd18902`: three revise findings and two
notes. Every finding is repaired once below; the repair retires the round-2
manifest, and round 3, the last under the stopping rule, reviews the repaired
bytes. Figures below were re-derived at the repair, not copied from the raw.

## 1 — A quoted `user` directive and some other working spellings still pass (revise)

Repaired as the raw proposed. The ACL arm now opens `["']?user["']?`, and its
operator is `(?:[<>]|[#!](?=[0-9a-fA-F]{64}))`, so a `<password` removal and a
`!` hash removal are withheld too. Five new counterexamples: a double-quoted
and a single-quoted `user`, `<password`, `!` with 64 hex digits (each
withheld with its guard lines), and an ACL `!note` that stays readable. The
escaped and inner-quoted spellings (`require"pass"`, `"\x72equirepass"`,
`user … "\x3e…"`) are named residual 7, with three fixtures that reach; the
clause, the delta's cost table and the packet's list name it. The clause's
cost sentence now says "a blank and > or <". Mutants: the selftest replaces
the hashed-password mutant with five (`#`-hash blind, `!`-hash blind,
`<`-blind, any `#`, any `!`) and adds an unquoted-`user` mutant, all caught;
the selftest now holds 49 of 49 predicates (45 at `dfd18902`). The linear-time
check gained two adversarial lines (a quoted `user` followed by ` !` runs and
by near-`!` hashes) in both engines, now thirteen. The dialect check's `\s`
mutant was re-anchored to the new text and still splits the engines.
`--self-corpus` with the new pattern: 1 of 8,720 tracked UTF-8 text files at
`dfd18902` matches, the delta itself.

## 2 — The install ledger omits the version-5 builder's `base_bytes` refusal (revise)

Repaired in `IMPACT-LEDGER.md`: a row names `base_bytes` in
`build_public_source_screening_scope_v5.py` (lines 328-342) and its `--check`
refusing after the act, the five call sites in four test files (sweep:
`base_bytes` over `packages` and `apps`, those five lines and no other), and
the precedent: `b4230850` re-routed the version-3 and version-4 fixtures
through the version-5 builder, and `8f4532a9` and `76361363` the version-3
fixtures through the version-4 builder (each commit's message read).

## 3 — The package still says the draft's pattern and clause are carried byte for byte (revise)

Repaired in four places. `SEMANTIC-DELTA.md` now says the placement is
carried unchanged and the pattern and clause were carried and then widened in
rounds 1 and 2, and adds a "Changed again in round 2" paragraph. The builder's
docstring and comment describe the current pattern and say neither is
byte-identical to the draft. `REVIEW-BRIEF.md` criterion 1 asks whether each
difference from the draft is stated. `OWNER-DECISION-PACKET.md` gains a bullet
saying the detector is wider than the draft the owner's answer described, and
that wider means more withheld.

## 4 — Stale count and incomplete list in the ledger (note)

Repaired: "nine dialect probes and two declared-split probes", and
`recorder-fixtures.testkit.test.ts` joins the test-literal list.

## 5 — The claim that Redis accepts every widened shape is overstated (note)

Repaired: the delta now says Redis accepts most of the round-1 shapes, that
whether it splits on a vertical tab inside a line is Unknown, and that the
widening can then only over-match, withholding more and leaking nothing.

# R-POLARIS-LAUNCH-CONSENT-SIGNOFF-2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 46da209afc662f914f7fe198f675ef3e836545a2
Manifest SHA-256: 149aa74464af1fe68dd62ab4652223651025c125a42fc1259623e06b494417cd

Package: polaris-dossier-launch-consent, version 1.0.

Reviewer: independent fresh-context sign-off confirmation reviewer (round 2),
2026-11-08, per
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/REVIEW-BRIEF-SIGNOFF.md`,
with the lead's instruction to write this raw under the `-2` name and to check
each round-1 disposition against the bytes. `git rev-parse HEAD` in the
worktree equals the commit above. The `Manifest SHA-256` line is the SHA-256
of the subject
`openspec/changes/polaris-dossier-launch-consent/proposed/polaris-generation/spec.md`
(the package has no manifest file), computed by two methods:
`git show <commit>:<path> | sha256sum` and Python `hashlib.sha256` over the
working-tree file; both gave the digest above, equal by string to the
`Spec SHA-256` at `R-POLARIS-LAUNCH-CONSENT-4-RAW.md:4`.
Read: the package (`OWNER-SIGNOFF.md`, `REVIEW-BRIEF-SIGNOFF.md`,
`ROUND-1-DISPOSITIONS.md`), the round-1 sign-off raw, the round-2 and round-4
raws' finding sections, the spec's header and REQ-046 paragraphs, the
builder's docstring and `apply()`. No observed-repository body, dossier
output or credential was read; no dossier command was run. `apply()` was run
only in a scratch clone outside this worktree.

## Summary

The spec bytes are unchanged since `8e5754b9` and since round 1's
`2e630f5a`; the only commit since round 1 (`46da209a`) touches
`OWNER-SIGNOFF.md`, adds `ROUND-1-DISPOSITIONS.md`, the round-1 raw and a
campaign line. Round 1's revise finding is repaired: G6 now names forbidden
behaviours, not duties, and quotes the spec's requirement correctly. All four
dispositions are true of the bytes, with one wording imprecision (Finding 3).
The builder checks and installs as its docstring says. The three findings
below are notes; none changes what the owner signs.

## Findings

**Finding 1 — G6 still shortens two of the four behaviours past round 2's raw** (note)

File and line:
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/OWNER-SIGNOFF.md:72-73`.
Clause quoted: "reading records from any reference but the dedicated one; and
per-repository code. The last needs a structural test."
Round 2's G6 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-2-RAW.md:148-151`) reads:
"launch consent records read from any reference other than the dedicated
one, or from a working tree (spec.md:23); and per-repository code, phrase,
form or registry entry (spec.md:25)". The packet drops "or from a working
tree" and "phrase, form or registry entry", so it tells the owner of a
narrower untested set than the raw found. The polarity repair round 1 asked
for is correct and complete.
Repair I would accept: "reading records from any reference but the
dedicated one, or from a working tree; and per-repository code, phrase, form
or registry entry. The last needs a structural test." (A later version, or
before signing; it changes no spec byte.)

**Finding 2 — G9 sits under a heading that says it was carried through round 3** (note)

File and line:
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/OWNER-SIGNOFF.md:62-64`,
`:82-84`.
Clauses quoted: ":62 I6: carries round 3's H8 and round 2's G5 to G8
unchanged (below)." ":63-64 Round 2 (`R-POLARIS-LAUNCH-CONSENT-2-RAW.md`),
notes G5 to G8, carried through round 3 (its H8):". G9 is now listed under
that heading at :82, but round 3's H8 and round 4's I6 never carried it (round
1 of this sign-off found it uncarried, its Finding 2). The content of the G9
line is accurate: the sweep `grep -rnE "launch records?\b"` over the change
and candidate directories finds the shorthand at exactly four prose sites
(`design.md:63`, `:103`; `IMPACT-LEDGER.md:51`, `:72`) besides the packet's
and the disposition's own mentions of it.
Repair I would accept: say at :63-64 "notes G5 to G9; G5 to G8 carried
through round 3 (its H8), G9 carried from the sign-off review".

**Finding 3 — Disposition 3 says the I4 repair restates "the raw's condition"; it restates the spec's definition** (note)

File and line:
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/ROUND-1-DISPOSITIONS.md:11`;
`OWNER-SIGNOFF.md:54-58`.
Clauses quoted: disposition: "both restate the raw's condition (... consent
made by another act but relying on or recording a launch consent record)".
Round 4's I4 (`R-POLARIS-LAUNCH-CONSENT-4-RAW.md:115-116`): "once that run
relies on a launch-recorded drawer or provider statement". The packet's
"rely on or record a launch consent record" is the spec's definition of a
launch-consented run (spec.md:3, "a run that relies on or records any launch
consent record"), which is wider than the raw's "relies on". The packet is
accurate to the spec, and the wider set is the one the scenario at spec.md:140
reaches, so the owner is not misled; the disposition's description of its
own repair is what is imprecise. The disposition file is not owner-facing.
Repair I would accept: none needed for signing; a later disposition could say
"restates the spec's definition, which includes the raw's case".

## Question-by-question

1. **Subject digest and spec bytes.** Yes. The digest above equals round 4's
   head. `git diff --stat 8e5754b9 46da209a --
   openspec/changes/polaris-dossier-launch-consent/proposed/` printed
   nothing.
2. **Edits to the change directory since `8e5754b9`.** `git diff --stat
   8e5754b9 46da209a -- openspec/` touches exactly `OWNER-PACKET.md`,
   `SEMANTIC-DELTA.md` and `tasks.md` (4 insertions, 4 deletions), the round-4
   I1 repairs and the tick, as round 1 of this sign-off found. `git diff
   2e630f5a 46da209a -- openspec/` prints nothing, so no change-directory byte
   moved since round 1. No meaning changed.
3. **OWNER-SIGNOFF.md.** Question (:15-18), version 1.0 and option label
   (:20, "Sign launch-consent spec version 1.0") are exact and unchanged since
   round 1. The "does not" list (:31-39) is unchanged and grants nothing
   beyond the owner's answers. Open notes: I2, I3, I4, I5, I6, H8 (via I6),
   G5, G6, G7, G8 and G9 are carried; G6's polarity is now correct; G6
   remains shortened (Finding 1); G9's heading placement is loose (Finding 2).
   Each round-1 disposition checked against the bytes:
   - Disposition 1 (G6 repaired): true. :68-73 say "four forbidden
     behaviours are not named by the falsifier" and quote "Syzygy SHALL ask
     nothing and refuse" and "it SHALL refuse before asking", which match
     spec.md:29 ("Absent that consent, Syzygy SHALL ask nothing, refuse") and
     spec.md:27 ("SHALL refuse the run before asking"). Residue: Finding 1.
   - Disposition 2 (G9 carried; "launch consent record" at the G8 line):
     true. G9 at :82-84; :79 now reads "hides every launch consent record";
     no bare "launch record(s)" remains in the packet except G9's quotation
     of the shorthand (sweep above: 1 hit, :82). Residue: Finding 2. (:79 is
     85 columns, past the 78-column wrap; cosmetic.)
   - Disposition 3 (I3 and I4 repaired): I3 true, :51 "neither relies on nor
     records", matching the round-4 raw and spec.md:3. I4 repaired accurately
     to the spec; the disposition's wording is imprecise (Finding 3).
   - Disposition 4 (status-page figure carried): true, :85-88. Its claim
     that the "without" figure "means everything except the local-agent
     spec" holds by arithmetic: before apply 36 total and 32 without (a
     4-requirement local-agent addition); after apply 38 and 34, the same 4.
4. **Builder.** In this worktree: `--check` "OK: the package verifies
   (unapplied)" (exit 0); `--selftest` "25 fixtures, 0 failing";
   `count_polaris_effective_scenarios.py` "TOTAL: 36 requirements, 270
   scenarios" and "PROJECT-STATUS.md asserts: 36 requirements, 270
   scenarios"; local-agent builder `--check` "OK: the package verifies
   (applied)"; `record_versioned_signoff.py --check
   polaris-dossier-launch-consent --version 1.0` "not performed" (exit 0);
   `check_docs_review_campaign_partition.py --check` "unmatched=0"
   (denominator 789, before this raw was written). In a scratch clone at
   `46da209a`, `apply()` returned 0 and printed "installed
   `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`;
   PROJECT-STATUS.md now reads 38 requirements and 297 scenarios". `git
   status` there: spec deleted from `proposed/`, added under `specs/`;
   modified `PROJECT-STATUS.md`, `REVIEW-BRIEF-SIGNOFF.md`,
   `REVIEW-BRIEF.md`, `design.md`, `proposal.md`, as the docstring and
   `tasks.md` describe. After apply: builder `--check` "OK: the package
   verifies (applied)"; recount "38 requirements, 297 scenarios", equal to
   the page (`PROJECT-STATUS.md:51` 34/221 without, `:59` 38/297 with);
   local-agent builder `--check` "OK: the package verifies (applied)".

Subject: openspec/changes/dossier-hero-figure/proposed/polaris-generation/spec.md (REQ-polaris-generation-034 version 2.20 over 2.19)
Spec sha256: 894f5a163e2386cd2007b5dcacc75e0e5b6fac925ee2f5c3e91cbdcdfb974340
Verdict: REVISE
Reviewed commit: e090b645 (origin/agent/syzygy-3efd.29, based on origin/main 06075e67)

# Fresh-context specification review: dossier hero figure 2.20

Reviewer: independent fresh-context session, read-only. Scratch worktree `.worktrees/review/r29spec` detached at e090b645.

## What was verified

- [Observed] `sha256sum` of the subject at e090b645 = 894f5a163e2386cd2007b5dcacc75e0e5b6fac925ee2f5c3e91cbdcdfb974340, matching the brief, SEMANTIC-DELTA.md and `HERO_SUBJECTS` in `scripts/check_spec_reconciliation.py:672`.
- [Observed] Predecessor `openspec/changes/dossier-relation-types/proposed/polaris-generation/spec.md` hashes to f6d60b603bd7cc819aca86ae3d1a6de037ecb7717ca1fe214619f646c97afd9c, as SEMANTIC-DELTA states. `GOVERNING-DEPENDENCIES.json` is byte-identical to 2.19's (`cmp`).
- [Observed] Line diff (Python difflib, line then word level) predecessor 1192 lines -> subject 1257 lines: changes are exactly the title (line 1), preamble (line 3), line 40 (six word edits, as declared), five inserted paragraphs (lines 108-116), ten inserted scenarios (lines 1184-1237), and the Case/Observable/Form/Falsifier lines (1241-1245; 1176-1180 in the predecessor). Every other line is byte-identical and in order. This matches SEMANTIC-DELTA.md's "Amended in place", "Added" and "Removed: nothing" sections. Criterion 3 met.
- [Observed] Scenario headings: predecessor 168, subject 178 (`grep -c '^#### Scenario'`); `hero_cases` asserts 168 -> 178 and that every other Polaris requirement is unchanged (`check_spec_reconciliation.py`, diff lines 384-423).
- [Observed] `python3 scripts/check_spec_reconciliation.py --check` at e090b645: "7 of 7 predicates without FAIL; PASS" (R6 WARN report-only, two pre-existing behaviour-contract pins unrelated to this change). `scripts/count_polaris_effective_scenarios.py`: "TOTAL: 39 requirements, 488 scenarios", equal to PROJECT-STATUS.md, i.e. 2.20 is pending (no row) as the README says.
- [Observed] Version 2.20 is free: `git ls-remote --tags origin` shows only `polaris-dossier-relation-types-v2.19` among 2.18-2.20; `AGENT-ADOPTIONS.md` on origin/main has no 2.20 or hero row (last relevant row A-52, 2.19); across all `origin/agent/*` branches "Candidate version 2.20" occurs only on this branch and "Candidate version 2.18" only on syzygy-3efd.80, as D1 says.
- [Observed] The v1.7 quote in design.md D2 is verbatim at `.syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-7/proposed/spec.md.patch:86`: "With no hero the opening ends at the thesis, and reader advice MAY say so; a missing hero is no repair finding." The owner sign-off of v1.7 on 2026-11-17 is recorded in a syzygy-fnry.19 comment ("Owner sign-off 2026-11-17 (AskUserQuestion in the coordinating session): selected 'Sign dossier spec version 1.7' ... Recorder run delegated to the drafting lane"), and no `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.7.md` exists on origin/main (v1.0-v1.6 only). D2's facts are accurate.
- [Observed] `python3 scripts/check_spec_reconciliation.py --selftest` at e090b645 (TMPDIR scratch): "SELFTEST PASS: clean scratch copy and its signed- and adopted-addition variants pass; 463 of 463 mutants killed by their expected predicate; 89 of 89 controls held (commit e090b64503d0)"; 0 lines contain SURVIVED. The 18 `hero-*` witnesses: 4 held (pending, adopted 168 -> 178, vetoed restores 2.19, pending-claims-adoption), 14 killed (duplicate row, wrong tag, wrong revert, missing spec link, bad date, no reason, predecessor missing, subject changed, union changed, status route missing, four composition mutants).

## Findings

### F1 (blocking) The hero is not "straight after the introduction": open questions render between them

- Where: spec.md:112 ("so the hero is the first thing on the page after its header, whose last part is the introduction, the dossier's thesis"); spec.md:114, the brief v16 literal ("Syzygy draws it first on the overview, straight after the introduction."); spec.md:1187 scenario ("immediately after the header that ends with the introduction"); proposal.md and README.md ("the header that ends with the thesis").
- Evidence: [Observed] the landing page renderer at e090b645, `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:761`, builds the header as `<header ...><span class="eyebrow">...</span><h1>title</h1>${banner}${introduction}${unresolved}</header>${overviewFigures}...`, where `unresolved` (line 711, `openQuestionClaims`) renders each item of the draft's `unresolved` member as an Unknown aside claim after the introduction. [Observed] The requirement text never places those open questions: `unresolved` occurs once in the subject (line 172, as a citation source), and the carried v5 sentence (line 40) enumerates the header as "its title, any run-stopped banner and the introduction". [Inferred] So for any draft with open questions the header's last part is not the introduction, the scenario's "immediately after the header that ends with the introduction" cannot be constructed, and the brief v16 paragraph, a fixed literal issued to every authoring agent, tells the agent something false about where its figure renders. An implementer must either move open questions (a byte change the text does not authorise for v9-and-earlier, and leaves unsaid for v10) or ship a false brief sentence.
- Repair: state where a v10 landing page's open questions render relative to the hero (either keep them in the header and say "after the header: title, any run-stopped banner, the introduction and the draft's open questions"; or, for v10 only, place them after the hero region and list that as a moved byte in D7 and the delta). Reword the brief literal accordingly (for example "first on the overview, after the introduction and any open questions"), and fix scenario 1 and the proposal/README glosses to match.

### F2 (note) Omission scenario places the omission "first element after the header"; the paragraph places it first in the region

- Where: spec.md:1199 versus spec.md:112.
- Evidence: [Observed] The paragraph says "A declared omission renders first in the region" (inside the overview-figures section); the scenario says "the first element after the header carries `data-hero="omitted"`". [Inferred] The first element after the header is the region element itself, which carries no `data-hero`. A literal test of the scenario contradicts the paragraph.
- Repair: say "the first element of the region of overview figures", as scenario 1 does.

### F3 (note) Finding details are mostly unfixed, contrary to D5's claim

- Where: spec.md:110; design.md D5 ("The detail is a literal, and the scenarios fix it"); spec.md:1203-1204.
- Evidence: [Observed] Only two details are literal: the absent-`hero` detail and the `field-version` detail. The `hero` finding at `$.hero` for not-an-object / both / neither-with-other-member, the `$.hero.figure` finding ("its detail naming which of the two it fails and the diagram's identity"), and the `$.hero.omitted` finding have no literal. Unspecified cases: a diagram that fails both conditions (a `sequence` homed in a section): one finding or two, and which detail; `figure` not a string, where there is no diagram identity to name. [Inferred] Pass/fail and kind/path are decided by the text, so acceptance 1 holds at the level of kind and path; byte-exact details will be implementer-chosen and only then frozen in fixtures (Observable, line 1243).
- Repair: give literal details for each finding path (including the both-conditions and non-string cases), or correct D5 to say only the absent-`hero` detail is literal.

### F4 (note) Whether the v10 schema document admits a non-normative or presentation-element omission is unstated

- Where: spec.md:108, 110, 1217-1220; falsifier line 1245.
- Evidence: [Observed] The omission is "in a paragraph form the introduction may take (never a presentation element), labelled Inferred or Unknown and never non-normative". The finding list names only the non-normative case (`hero` at `$.hero.omitted`); a presentation element is left to "the findings any malformed claim block raises". The in-place replacement of `schema` findings covers only `$.hero` and `$.hero.figure`. [Inferred] If the v10 schema document narrows `omitted` to paragraph forms labelled inferred/unknown, a non-normative omission raises a `schema` finding at or below `$.hero.omitted` as well as the `hero` finding; if it does not narrow it, a presentation-element omission may pass schema with no stated finding. Scenario "Omission that makes no claim refused" does not say "only", so either reading passes it. This mirrors 2.16's subsection `answer` wording, so the ambiguity is inherited, but the hero text is where a reader decides it. Empty reason: [Inferred] decided by the shared claim-block `text` schema (refused as a malformed block), not by any sentence of this version.
- Repair: one sentence saying the v10 schema document admits in `omitted` exactly the claim-block forms the introduction may take with any label, so that the label rule is the `hero` finding's alone; and that a presentation element at `$.hero.omitted` is a `schema` finding there.

### F5 (note) `machine.json`'s `hero` under a withheld draft layer, and `rendered` for a notice

- Where: spec.md:112, 1222-1226.
- Evidence: [Observed] `hero` is carried "for a v10 draft only" with `diagram` "the named diagram's identity for `figure`"; the withheld scenario fixes only `"rendered": false`. `rendered` is true whenever the region opens with an element carrying `data-hero`, which includes the not-produced notice. [Inferred] Under a withheld draft layer this emits an agent-chosen identity from a withheld draft into the machine form; the text does not say whether that is intended (the `thesisBasis` precedent emits only an enum). Not a SEC-5 weakening on its face (identities are pattern-bound handles), but the text should decide it. `rendered: true` for a notice reads as "the figure rendered" to a consumer.
- Repair: state `form`/`diagram` under a withheld draft layer (for example `diagram` null), and either rename `rendered` or fix in the not-produced scenario that it is true with a notice.

### F6 (note) D2's account of the v1.7 departure is accurate; two precision gaps

- Evidence: [Observed] Quote verbatim (patch line 86); sign-off date and unrecorded recorder run accurate; AGENTS.md Orientation supports the standing ("Owner acts and rulings recorded before D10 stay in force as decided; a later change to what they decided is an adoption"), and spec class is outside the four owner classes. Nothing is labelled owner-approved: README and proposal say "no owner adoption is claimed". [Observed] v1.7 pins the same rule in two further places D2 does not name: its scenario (patch line 177, "a draft that names no hero gets no repair finding for it") and its falsifier ("or a missing hero is a repair finding"). [Inferred] The v1.7 sentence governs v1.7's schema-v5 code-excerpt hero, a different object from this figure hero; D2 treats it as a departure, which is the conservative and honest reading, but could say the conflict is one of intent, not of text that governs 2.x drafts.
- Repair: name the v1.7 scenario and falsifier alongside the quoted sentence so the reconciler finds all three; ensure the adoption row, as D2 promises, states the departure and its revert.

### F7 (note) Omission element type and accessible markup unstated

- Where: spec.md:112.
- Evidence: [Observed] The omission is "an element carrying `data-hero="omitted"`" holding the fixed `<p class="hero-omitted">` line and the claim block; its tag and any accessible name are not stated, so its bytes are implementer-chosen. No script is introduced (the carried script rules hold); the hero figure inherits every figure rule (caption, legend, tally, text-equivalent list).
- Repair: name the element (for example `<div data-hero="omitted">`), or say its tag is the renderer's choice and fixed in fixtures.

## Adversarial drafts, decided by the text

| Draft | Decision by the text | Where |
|---|---|---|
| Two heroes (`figure` and `omitted` both) | `hero` at `$.hero`, replacing `schema` | 110, 1212 |
| `figure` an array of two ids | `hero` at `$.hero.figure` (not a string); detail unfixed (F3) | 110 |
| Hero names a non-graph overview diagram | `hero` at `$.hero.figure` | 110, 1202 |
| Hero names a section/deep-dive graph diagram | `hero` at `$.hero.figure` | 110, 1202 |
| Both conditions fail | one or two findings: undecided (F3) | 110 |
| Hero figure also listed elsewhere | renders once; overview figures cannot be repeated by a list (carried v5 rule); hero excluded from the "every other figure" order | 40, 112 |
| Omission with non-normative block | `hero` at `$.hero.omitted`; whether a `schema` finding accompanies it undecided (F4) | 110, 1217 |
| Omission plus figure | `hero` at `$.hero` | 110 |
| v9 draft with `hero` | `field-version` at `$.hero`, literal detail, every other byte as 2.19 | 116, 1228 |
| Empty reason | malformed claim block via shared `text` schema [Inferred] | 110 |
| Hero diagram disposition `omitted` | no finding; notice first with `data-hero="figure"` | 110, 112, 1222 |

## Criteria

1. Rule unambiguous and testable: met at the level of kind and path; details and two edge cases open (F3, F4). Every finding path has a scenario.
2. Placement exact: region and first element exact; the "after the introduction" gloss and brief literal are false with open questions (F1, blocking); v9-and-earlier and provider bytes pinned (116); no script.
3. Carried text byte-identical except declared changes: met (verified by diff).
4. v1.7 departure stated accurately, with standing; nothing labelled owner-approved: met (F6 notes).
5. No secret-screening weakening, no new source reads: met ("neither form adds a label, a source or a read", 108; omission block is "withheld ... as the introduction is"); F5 asks the text to decide the withheld-layer identity.
6. Bookkeeping: SEMANTIC-DELTA consistent with the diff; census 168 -> 178 and `hero_cases` consistent; version 2.20 free. README promises review dispositions in design.md, to be added after this review.

## Verdict

REVISE, for F1 alone: a fixed brief literal and a scenario assert a placement the renderer and the carried text contradict whenever a draft has open questions. F2-F7 are notes.

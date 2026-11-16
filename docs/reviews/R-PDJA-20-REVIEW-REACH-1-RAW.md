R-PDJA-20-REVIEW-REACH-1 — review of the reviewReach advice (syzygy-pdja.20)
Reviewed commit: f29203c1e61edc2a2ce245cdcf8ba3e211a0cf6f
Subject: PR #802
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: fresh-context agent with no part in the change. Scope: `git diff origin/main...HEAD` (12 files, one commit, f29203c1),
the bead `syzygy-pdja.20`, the signed spec `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`
(v1.5, signed 2026-11-07, `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.5.md`), and the code the new
module mirrors (`review-packet.ts`, `review-verdict.ts`, `withheld-items.ts`, `check-derive.ts`). No observed repository body, no
dossier output and no credential was read; no dossier run was made. Every mutation made was restored and the tree confirmed clean.

## Criteria

**C1 — stays advice.** [Observed] `reviewReach` is built after the record and spread only into the report object
(`packages/polaris-dossier/src/check.ts:266-272`); the record (`...record`) and `findings` are untouched, and the exit code is computed
from `result.report.outcome` (`packages/polaris-dossier/src/cli.ts:323`), which the advice does not set. No consumer reads the field
besides the CLI's generic printer (`cli.ts:243-244`, `renderHuman` at `cli.ts:491`); a sweep of `packages/polaris-dossier/src/*.ts`
(non-test) for `reviewReach` finds only `review-reach.ts`, `check.ts`, `check-model.ts`, `brief.ts` and `polaris.ts`. No gate,
`review-verdict.ts` validation or render path is changed by the diff. The test at `check.test.ts:811-827` asserts outcome `passed`,
`findings: []` and that `checks/rev-0.json` contains neither `reviewReach` nor `unconfirmable`. Met. The meaning of a confirmation
under REQ-polaris-generation-035 is unchanged: `withheldBlocks` and `fit(...)` in `review-verdict.ts:93-107` are not in the diff.

**C2 — classification against the spec.** Met, with the wording exceptions in Findings 2 and 3. The clauses relied on:

- REQ-034 (spec.md:245): "A cited span is withheld when its blob is excluded whole by classification, path or body screening, when
  its blob's bytes are not valid UTF-8, or when any line of its range is one screening redacts in a retained body. A span a run's
  consented content classes keep from an agent-bound artifact is not withheld under this rule and keeps its existing treatment."
- REQ-034 (spec.md:245): "A withheld item is a claim block, an understanding item, or a diagram node or edge that cites at least one
  span, all of its cited spans being withheld, or that relies on such an unverifiable quotation or on a quotation whose range touches
  a redacted line. A withheld item SHALL render Unknown with `excluded-content` instead of blocking readiness".
- REQ-035 (spec.md:460): "For an inventory entry or withheld item as REQ-polaris-generation-034 defines them, the verdict's entry
  SHALL be `withheld`, which is no accuracy judgment and no support finding, is not an unresolved material omission and does not
  block readiness; validation SHALL refuse a verdict that marks such an entry accurate or supported, and SHALL refuse `withheld` for
  any other entry."
- REQ-035 (spec.md:460): "that every inventory entry and every claim block has an entry".

[Observed] `withheld-item` is decided by the shared `isWithheldItem` (`withheld-items.ts:27-31`), the same predicate verdict
validation uses (`review-verdict.ts:94`), over a per-span standing that maps `class-gated` to `other` (`review-reach.ts:88-91`), so a
class-gated span is "not withheld" exactly as the second sentence above requires. The span reading follows the packet: class gate
first on a screening-admitted body (`review-reach.ts:46` against `review-packet.ts:131-134`), then a range touching a redacted line,
then the retained span's own detector screen (`review-reach.ts:50-51` against `review-packet.ts:143`). All five `ScreenExclusion`
values (`screen.ts:50`) map to `withheld`, as in `packetSpanStanding` (`review-verdict.ts:12-17`). The block population is the
verdict's own: `collectBlocks(...).filter(textKey === 'text')` (`review-reach.ts:84-85` against `review-verdict.ts:60`), which is
the REQ-035 claim-block population including rich-element cells, steps, cards and callout children (`check-derive.ts:461-480`).
`unconfirmable` is restricted to `inferred` blocks (`review-reach.ts:94`), which is right: `review-verdict.ts:137-139` states an
unknown or non-normative block's support row "judges its label and names no span", so such a block can be judged supported without
any span. Quotation identities can only name the block's own citations (`check-derive.ts:213`), so the per-block reach map
(`review-reach.ts:86-87`) sees every span a quotation names. One residual divergence: the retained-span detector rule
(`review-reach.ts:51`) treats a span as withheld though no line of it is redacted; the quoted REQ-034 definition does not name that
case, but the packet already does (`review-packet.ts:143`, outcome `redacted-span`, standing `withheld`), so the advice agrees with
the operative validation. Pre-existing, not introduced here; not counted as a finding.

**C3 — population.** One input class is listed wrongly (Finding 1). Deliberate omissions, both defensible and both outside the
fidelity verdict's rows: understanding items and diagram nodes and edges, which REQ-034 makes withheld items but which carry no
`blockSupport` row and so cost no repair cycle at review (Finding 4, note). Mixed blocks (an admitted span beside withheld or gated
spans) are not listed, correctly: REQ-034 says "Any other block with both admitted and withheld spans keeps every other rule"; the
bead comment discloses that the admitted spans alone may not support the claim.

**C4 — tests and mutation record.** [Observed] Expected values in `review-reach.test.ts` and the two new `check.test.ts` cases are
literals (`consequence`, `at`, `blockId`, counts); `detail` and `note` are matched by distinctive substrings, which is adequate since
each substring is unique to one constant. The record `docs/evidence/syzygy-pdja-20/review-reach-mutants-2026-11-09.json` stores each
mutant's `old`/`new` fragment, the command, `ranAt` 9a93972e (not HEAD, disclosed), and sha256 digests of 9 subject files; all 9
digests equal the files at f29203c1 (scripted comparison, 9/9 True), so the record binds the reviewed bytes. Its 18/18 count is
computed from its own rows (18 rows, 18 `killed`). Re-run here, each alone over the record's five test files, each `old` asserted to
occur exactly once, each file restored and re-hashed:

| mutant | result |
|---|---|
| every-to-some | killed (exit 1; 2 failed, 276 passed of 278) |
| class-gate-after-redaction | killed (exit 1; 1 failed, 277 passed) |
| no-retained-span-detector | killed (exit 1; 1 failed, 277 passed) |
| no-path-screen-fallback | killed (exit 1; 2 failed, 276 passed) |
| reach-no-consent | killed (exit 1; 1 failed, 277 passed) |

Baseline over the same files: 278 passed. Met. The record has no mutant for the "never in the stored record" predicate (writing
`reviewReach` into the record); `check.test.ts:824-825` would catch it, but that predicate is unrecorded (no finding).

**C5 — brief version and prompt.** [Observed] `BRIEF_VERSION` moves v4 to v5 (`brief.ts:35`), asserted in `brief.test.ts:82,106`.
`briefVersion` is only written (`brief.ts:297,326`), never compared at a later step, so an in-flight v4 run is not refused (sweep of
non-test `packages`/`apps` `.ts` for `briefVersion`: 3 hits, all in `brief.ts`). The precedent bump (v3 to v4) is pdja.17's commit
55921b12. The rule (`brief.ts:39`) and the prompt sentence (`polaris.ts:393`) are static strings with no interpolation, so they carry
no project content (REQ-034, spec.md:230: "The brief SHALL carry no project content beyond the repository identity and the pinned
revision"). Brief, report note and prompt agree on the repair (cite an admitted file for the same fact, or state it as unknown).
Wording exceptions in Findings 2 and 3.

**C6 — checks.** [Observed] `npm run check` at f29203c1 in this worktree (its own `node_modules/@syzygy` links resolve into the
worktree): `tsc -p tsconfig.json` clean, then `Test Files 176 passed (176)`, `Tests 4067 passed (4067)`, exit 0.
`python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0. The WARNs are the checker's report-only and
downgraded families; the diff touches no file under `.syzygy/`, `openspec/` or `docs/` other than the new evidence JSON. Met.

**C7 — authority.** Covered. [Observed] Q2's selected answer reads "I draft the CC-REV-2 amendment, get it reviewed, bring it to you
for a version-tag sign-off, then implement" (`POLARIS-DOSSIER-LOCAL-AGENT-MODE-DIRECTION.md:51`), and direction item 5 says
"Implementation that depends on it waits for that sign-off". The governing version, v1.5, is signed
(`POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.5.md`, 2026-11-07). [Inferred] This change implements inside the signed text and does
not extend it: REQ-034 requires the brief to state "the citation and quotation rules", and the new rule restates consequences the
spec already fixes (withheld items render Unknown; `withheld` fits no other entry; a block with no entry or a non-supported entry
blocks readiness). It changes no gate, verdict validation, render, consent, screening or retention posture, so no escalation trigger
of the direction applies. pdja.17 (advice on the report, a brief rule, a v4 bump) is a fair precedent of the same shape.

## Findings

**Finding 1 — an absent path the path screen would exclude is listed as a `withheld-item`** (note)
`packages/polaris-dossier/src/review-reach.ts:42` falls back to `inputs.screen.screenPath(cited)` whenever the path is not in
`citedBlobs`. In `check-derive.ts:253` the only non-secret paths missing from `citedBlobs` are paths absent from the pinned tree
(`state === 'absent'` returns `[]`). So a block citing only an absent path that a denied-path rule or a path detector matches (for
example `.env` where the tree has none) is classed `withheld`, and the block is listed as a `withheld-item` that "renders Unknown".
The packet gives that span outcome `absent` (`review-packet.ts:101,148`), standing `other`, so verdict validation would not treat it
as withheld. This contradicts the module's own statement that "A span no check would pass (an absent path ...) counts as
`reaches-review` here" (`review-reach.ts:23-24`), and the test row "a denied path, not in the cited blobs" (`review-reach.test.ts:38`)
pins the wrong behaviour as a state `check` cannot produce for an existing file. Impact is small, since `check` already reports
`path-absent` for the same citation, but the advice then names the wrong repair. Repair: fall back to the path screen only for the
secret-path case (a `citedBlobs` entry with `path: null` and `screenPath(cited) === 'secret-detector-match'`), or pass the tree, and
relabel the test row as an absent path expecting `reaches-review`.

**Finding 2 — the brief rule's "A block ... can never be judged supported" is false for `unknown` blocks** (note)
`packages/polaris-dossier/src/brief.ts:39` says "A block none of whose cited spans the review is given can never be judged supported
... otherwise its row stays unresolved and blocks readiness." An `unknown` block citing only class-gated spans is judged on its
label and can be supported with no span (`review-verdict.ts:137-139`), and the code rightly does not list it
(`review-reach.ts:94`; test `unknown-gated` at `review-reach.test.ts:70`). The brief therefore tells the author something stricter
than the spec and the code, and could push an author to rewrite a valid Unknown block. Repair: "An Inferred block none of whose ...".

**Finding 3 — the report note says each listed block "cites only" unseen spans, which a quotation-route withheld item does not** (note)
`packages/polaris-dossier/src/review-reach.ts:70`: "Each block listed cites only spans the fidelity review will not be given." A
block that cites an admitted span and quotes a withheld one is a withheld item (REQ-034: "or that relies on such an unverifiable
quotation") and is listed (`review-reach.test.ts:69,86`, `quotes-withheld`), yet it cites `src/a.c`, which reaches the review. The
per-block `detail` (`review-reach.ts:74`, "or a span it quotes") is right; the note is not. Relatedly, "can never be judged
supported" for `unconfirmable` is a statement about reviewer conduct, not a validation: nothing refuses a `supported` row that names
a class-gated span (`draft-model.ts:133` asks only for a non-empty `sourceIds`; `review-verdict.ts:101-102` refuses only `withheld`
misfits). [Inferred] The claim is fair as advice under the fidelity criteria, but the note and brief state it as mechanical certainty.
Repair: "Each block listed rests only on spans ..." and "a review cannot confirm".

**Finding 4 — understanding items and diagram elements that are withheld items are not listed** (note)
`packages/polaris-dossier/src/review-reach.ts:85` skips every non-claim block, and diagrams are not visited at all. REQ-034 makes
"an understanding item, or a diagram node or edge" a withheld item too, rendering Unknown with none of its text. They have no
`blockSupport` row, so no repair cycle is lost at review and the bead's goal is met; but the bead also asks to "state on each check
which blocks cite only withheld files", and an author is not told that such an item's text will not render. The exclusion is
deliberate and pinned by the mutant `understanding-items-included`. Disclose the scope in the module head or the note, or file a
follow-up.

**Finding 5 — the commit message orders the class gate last** (note)
f29203c1's message says spans are read as "excluded or non-UTF-8 blobs, ranges touching a redacted line, retained spans a detector
matches, then the class gate". The code (`review-reach.ts:46`) and the packet (`review-packet.ts:131`) apply the class gate before
any redaction, and the mutant `class-gate-after-redaction` pins that order. The code is right; only the provenance text misstates it.
Not repairable in the commit; worth correcting in the PR body.

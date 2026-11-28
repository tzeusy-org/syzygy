# Review: syzygy-3efd.93 finding-detail screening
Verdict: REVISE
Reviewed commit: a696e0a2a350d7a60b33f28ab700948f5b418d3b
Reviewer: fresh-context general-purpose agent, 2026-11-29

Diff base: `3f04944bbe4de384cb0bd5c231ae36a01fda1a58` (`git merge-base origin/main a696e0a2a`). Review worktree
`/home/orca/.tmp/review-93` (detached at a696e0a2a, `npm ci` run, now removed). Probes lived in a throwaway
`packages/polaris-dossier/src/finding-names-probe.test.ts`, with one line added to the worktree's integration tier.
They reused the harness in `finding-names.test.ts` (lines 1-199), the same fixture policy, and `buildDossierScreen`.

## Checks run

- [Observed] `npm run typecheck`: clean.
- [Observed] `vitest run --project integration --project unit` over check, system-model, figure-plan,
  containment-figure, view-level, walk, finding-names, derived-base, cli and the provider golden test: 10 files and
  690 tests passed.
- [Observed] `git diff 3f04944bb a696e0a2a` touches no test file except `cli.test.ts` (the module-list literal
  gains `finding-names.ts`) and the new `finding-names.test.ts`. No existing expected detail literal changed.
- [Observed] `dossier-render-provider-golden.test.ts` has no diff from the base, and it passes.
- [Observed] The diff touches no `openspec/**` file and no `decisions/AGENT-ADOPTIONS.md` row.

## Sweep (criterion 1)

Population: the non-test modules of `packages/polaris-dossier/src`. That is 126 `.ts` files that are not
`*.test.ts`, less 6 `*.testkit.ts`, so 120 modules (this matches the author's denominator).

- Predicate A, the regex `\bdetail\s*:`: 224 occurrences on 219 lines, in 21 modules. The author reports 221. The
  difference is one of predicate, and neither figure is load-bearing.
- Predicate B: every occurrence whose same-line template interpolates. That gives 108 occurrences. Each
  interpolated expression was classified by hand.
- Predicate C, for builders that do not write `detail:` with an interpolation on the same line: the helper tables
  `WALK_DETAIL` and `LEVEL_DETAIL`, closures like `finding(detail)`, `add(kind, at, detail)` and
  `screened(...)`. These were read separately.

Two builders the author missed are findings 1 and 2. Everything else that interpolates a draft value is one of
these:

- handle-gated: `diagramName`, `containmentName`, `identityWords`, `handleOr` or `isHandle`;
- secret-path-gated by `pathLabel`;
- a fixed enum or constant;
- a value whose path is schema-checked as a handle before the builder runs, such as view entries
  (`system-model.ts:274`) and level/scope (`view-level.ts:132`).

The central screen backstops all of them for detector matches.

## Findings

1. **Blocking.** `packages/polaris-dossier/src/walk.ts:150,151,165,167,173` (`WALK_DETAIL.home`, `.kind`,
   `.element`, `.repeated` and `.uncited`).
   - Failure scenario: these name a draft identity with no handle check. `wellFormed` (walk.ts:49-63) checks only
     `typeof === 'string'`, and the schema check never sees walks. A diagram or paragraph whose id is not a handle
     still resolves the walk, so its id is copied into the detail.
   - [Observed] by calling `walkFindings` directly on a v16 doc whose diagram id is `src/app.ts` and whose
     paragraph id is `src/p.ts`. It returned `"src/app.ts: a walk's figure is drawn where the walk is"`,
     `"src/app.ts: a walk's figure is of a graph kind"`, and twice `"src/p.ts: a step's paragraph cites its sources"`.
   - [Inferred] from check.ts:373: the pipeline reaches this, because `walkFindings` runs on every parsed draft
     whatever the schema findings.
   - This is exactly the bead's pattern (a path-like id in a detail). It also falsifies the change's claim that
     "every finding builder that named an unchecked draft id now names it only if it is a handle". The central
     screen still withholds a detector match here, so no secret leaks; it is the handle rule that is broken.
   - Repair: wrap `read.figure`, `resolved.name` (the identity arm) and `step.block` in `handleOr(value, <path>)`.
     Add one test per detail.

2. **Blocking (same class, smaller).** `packages/polaris-dossier/src/derived-base.ts:202-204`.
   - Failure scenario: the `field-version` detail for a base end in a pre-v15 draft names
     `text(relationship['id'])` raw: `${id}: a base end needs draft schema …`. It is secret-screened by
     `screened(...)` but not handle-gated, so a relationship id `src/app.ts` is named.
   - [Inferred] from the code; not probed.
   - Repair: `handleOr(relationship['id'], \`$.model.relationships[${k}]\`)`.

3. **Blocking (process / spec).** The change alters spec-visible detail strings with no spec version and no
   `AGENT-ADOPTIONS.md` row.
   - Literal details the adopted spec states (newest text `openspec/changes/dossier-code-excerpts/proposed/polaris-generation/spec.md`):
     - "with the detail `no section has the identity "<target>"`";
     - "`` <identity>: no element of the model has this identity ``, `<identity>` being the identity named";
     - "`` <element or relationship>: every element and relationship of the model is shown by at least one view ``";
     - "`` <identity>: the hero is a figure homed on the overview ``, … `<identity>` being the diagram's identity".
   - What the branch now emits for a non-handle value instead:
     - `no section has the identity named here`;
     - `$.model.elements[0].parent: no element …`;
     - `the identity named here is already used at …`;
     - `` `whySection` names a value, … ``;
     - the new fixed `Finding detail withheld under source screening.`, which no spec clause states.
   - The spec states the handle-only rule only for v17 view-level details ("every identity a detail names is a
     handle", version 2.50), and "names `$.diagrams[<index>]` where the diagram has no well-formed identity" only for
     diagram names.
   - [Observed] No existing conformance or test literal changed. The changed branches were simply untested before,
     so the tests do not reveal the divergence.
   - This is not owner-class: it strengthens screening, and VIS-4 lets agents decide specifications. AGENTS.md
     still requires the decision to be recorded: "Before implementing, find the adoption row or the act — or
     adopt, and record it". Precedent: the same rule entered the spec as a version for view-level (2.50).
   - Repair: add an `AGENT-ADOPTIONS.md` row for this behaviour change. File or land a spec delta (the next 2.5x)
     that states three things:
     - (a) a finding detail names a draft identity only where it is a handle, and otherwise names the member's
       path or the words "named here";
     - (b) every detail is screened as a whole and word by word, and a match or an undecidable case is replaced
       by the fixed `Finding detail withheld under source screening.`, keeping kind and `at`;
     - (c) the per-builder fallback words.
     Merging with the row plus a filed spec follow-up bead would satisfy this finding.

4. **Note (screen soundness: fail-closed and no bypass).** `packages/polaris-dossier/src/finding-names.ts:24-27`
   and `check.ts:389-391`. [Observed] by reading and by test.
   - Fail-closed:
     - `admitOf` (derived-base.ts:508-517) maps a throw to `unavailable`;
     - `screenFindingDetails` admits only `=== 'admitted'`, so `unavailable` and `withheld` both withhold;
     - the existing test "withholds a detail screening cannot decide" covers the throw path.
   - No bypass in `checkSubject`:
     - every finding is pushed before line 391, including the credential findings at check.ts:298;
     - every consumer comes after it: `plan.record`, the record bound, `findingsLeftOut`, `log` and the report;
     - the refusals that return earlier carry no finding;
     - inventory goes through the same `checkSubject` (inventory.ts:337), so it is screened too;
     - render's re-derivation (render.ts:212-218) reports only `kind at at`, never a detail.
   - Residual: `admitOf`'s `isSecretPath` counts only `secret-detector-match`, not `denied-path`. A handle such as
     `id_rsa`, `credentials.json` or `server.pem`, which the live policy's `deniedPathBasenames`/`Suffixes` name, is
     admitted in a detail. [Observed] P6 shows `admit('id_rsa') === 'admitted'`. This matches the derived-base
     screening that version 2.35 adopted, so it is not a regression. State it in the spec delta of finding 3, or
     decide to withhold denied paths as well.

5. **Note (false positives).**
   - [Observed] P5:
     - 1,450 distinct fixed words were extracted from the detail templates and helper tables of the 120 modules;
       0 are withheld under the fixture policy (the live detectors);
     - 244 distinct literal `detail:` strings were extracted from `*.test.ts`; 0 change under the screen;
     - 690 existing tests pass unchanged.
   - [Observed] P7: a constructed ordinary detail is withheld. With diagram id `token`, the detail
     `token: datastore1 lies outside sys, the element this view is about` (`LEVEL_DETAIL.outside`) matches
     `credential-assignment` (`(?:…|token|…)\s*[:=]\s*…[^\s"'<>$]{8,}`).
   - The bare `${handle}: <word≥8 chars>` form can trip it when a diagram or element id is `token`, `secret`,
     `password`, `passwd` or `api-key`.
   - Effect: the author sees the withheld detail, and the finding keeps its kind and `at`. It is rare and fails
     safe.
   - Repair (optional): quote the identity in the bare `<id>:` forms, or accept the false positive and document it.

6. **Note (`at`, `blockId`, `citationId` and other report members carry draft values unscreened).** This is
   pre-existing and is the author's follow-ups (a) and (b).
   - [Observed] P3: an unknown object key shaped like a GitHub token gives a schema finding at
     `$.sections[0].ghp_kkkk…`, which is written to `checks/rev-0.json` and returned in the report.
   - [Observed] P2: a citation with id `ghp_kkkk…c` (a handle that the `known-token-formats` detector matches) and
     a path that does not exist gives `path-absent` with `citationId: "ghp_kkkk…c"` in the report and in
     `checks/rev-0.json`. The detail was admitted, because it names only `"nope.md"`.
   - [Inferred] from the code:
     - `worth-knowing` (check-derive.ts:797-799) records `blockId` raw;
     - reader advice (reader-advice.ts:48, 117) quotes the Pole `label`, which is free draft text;
     - figure advice (figure-plan.ts:301) carries `diagram: figure.id`;
     - the record's `session.sessionId` is draft text.
   - Criterion 1 as written ("no unscreened draft value reaches … the check report, the record") is therefore not
     met. The branch does not introduce any of these.
   - Repair (follow-up bead, P2 or higher): run `at`, `blockId` and `citationId` through the same admit in
     `screenFindingDetails`. For example, replace a matching `at` segment with its parent path plus `[member]`, and
     drop a matching id field. Screen advisory details the same way.

7. **Note, but high priority as a follow-up (author's [Unknown] follow-up (c), now [Observed]).** A passing draft
   with token-shaped handle ids renders them.
   - Probe P1: section id `ghp_k…ks` and paragraph id `ghp_k…k`. The draft passes check and renders 25 files. The
     token appears in:
     - `index.html`, 3 times: `<section id="section-<TOKEN>`, `data-claim-id="<TOKEN>"` and `id="block-<TOKEN>"`;
     - `contents.html`, once: `href="index.html#section-<TOKEN>"`;
     - `name-index.html`, once: `#block-<TOKEN>`;
     - `machine.json`, twice: claim `id` and `fragment`.
   - AGENTS.md forbids this: "never let a secret be … rendered". The defect is pre-existing and out of this diff.
   - Repair: at check, give a draft identity that the screen withholds a finding with a fixed detail, so the draft
     cannot pass. Renaming at render would break anchors and claim parity.

8. **Note (test rigor).** `docs/evidence/syzygy-3efd-93/finding-names-mutation-run2-2026-11-28.json`.
   - [Observed] 12 mutants: 3 on model-unviewed, 2 on `isHandle`, 3 on the screen predicate, 1 dropping the
     backstop, and 3 on builders (duplicate-id, dive sectionId, assetIds).
   - What they cover:
     - 5 of the 34 handle-gated builder lines;
     - the delimiter class only through `"` (the path-only test's quoted id), not through backtick, `(`, `)`, `,`
       or `;`.
   - Untested:
     - 29 builder lines: citation `identityWords`; figureStructure unresolved, participant and lane; `elementName`;
       containment nesting `handleOr`; hero ×2; `diagramFinding`; v4 diagram sectionId; edges from/to;
       repeatsDiagram ×2; poles ×4; whySection ×2; task-route `see.target`; system-model parent, unit-reference,
       relationship from/to and relation-challenged ×2; `groupName`; figure-plan ×2;
     - the inventory command through the screen;
     - the bounded-record path (`findingsLeftOut` and the bounded record carry screened details);
     - credential findings through the screen;
     - a screen that runs but whose result is not written back (for example, `screenFindingDetails` called with
       its return discarded);
     - the `denied-path` decision either way.
   - For a central security screen, 12/12 shows the predicate's main arms. It does not show coverage of the
     builders or of every exit.
   - Repair: add a table-driven test that feeds one non-handle and one token-shaped value to each of the 34 sites
     (plus findings 1 and 2), one bounded-record case and one inventory case. Add mutants for the delimiter class
     and for a discarded return.

9. **Note (performance).** `finding-names.ts:25`. [Observed] P5/P7, fixture policy, one run each:
   - 5,000 details of about 25 words each: 852 ms;
   - one detail of 20,000 words: 100 ms;
   - 50,000 duplicate-id details: 2,421 ms, about 48 µs per detail.
   - [Inferred] A 4 MiB draft (`DRAFT_MAX_BYTES`) of tiny duplicate ids could produce a few hundred thousand
     findings, so on the order of 10-25 s of screening. Derivation already costs O(findings), so this is acceptable.
   - Most words repeat across details: they are fixed words.
   - Repair (optional): memoize `admit` per distinct word in a `Map` local to the call. This changes no outcome and
     should cut the cost several-fold.

10. **Note (byte stability, criterion 4).** [Observed]
    - The provider golden test is byte-unchanged from the base, and it passes.
    - A passing draft has zero findings, so `screenFindingDetails([])` is the identity and the record and pages are
      unchanged by construction. The golden test and the existing render tests (view-level, walk, containment and
      derived-base suites) confirm this.
    - A finding whose detail is admitted is returned by reference (`finding`, not a copy), so its key order and
      bytes are unchanged.

11. **Note (wording consistency).** check-derive.ts:750/753 (hero) and figure-plan.ts:107-108 fall back to the
    path, most identity references fall back to `named here`, and whySection falls back to `a value`. All three are
    lawful, but the spec delta of finding 3 should fix one rule per detail family, so that the fallbacks don't drift
    further.

## Summary

Verdict REVISE: 11 findings, 3 blocking (1-3) and 8 notes (4-11).

- The central screen is sound: it is fail-closed, nothing in `checkSubject` bypasses it, and 0 of the 1,450 fixed
  words and 0 of the 244 fixture details change.
- The provider golden test and passing drafts are byte-stable.
- The sweep missed `walk.ts` (5 sites, observed) and `derived-base.ts:202-204` (1 site, inferred).
- The changed detail literals diverge from the adopted spec, and no adoption row or spec version records the change.
- Pre-existing leaks that the branch does not touch:
  - draft values reach the report and record through `at` and `citationId` (observed);
  - token-shaped handle ids appear in the rendered HTML and `machine.json` (observed).

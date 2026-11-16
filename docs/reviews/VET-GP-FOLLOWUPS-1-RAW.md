# VET-GP-FOLLOWUPS-1: adversarial review of owner-decision items syzygy-bpyt.1.15, 1.16 and 1.17

Reviewer: an independent subagent in fresh context (vet-gp), 2026-10-27. I did not draft the packet, and I changed none of its bytes.

Subject: `/home/tze/.tmp/user-questionnaire/syzygy-2026-10-27-gp-followups/packet.md`, 191 lines, sha256
`8de418c8f3fd20fe37b8a4f2fef0a6233cc2a5fe281bd123e8798b772ffe6104`. The file was unchanged between my first read and the time
of writing (mtime 18:10).

Commits read:
- main `41932c3b5aba567376fea3b32a80a54f8b6b30ab`, equal to `origin/main` at both fetches (start, and before writing).
- PR #540 head `6df4e623fc7dd3ac6d2d414a09c0d5fd5121de6e`: **OPEN, not merged**, read with `git show 6df4e623:<path>`.
- PR #541: the round-1 raw reviewed `5db78a26`. Its head has since moved to `58e8f604`. The testkit's diff from main at
  `58e8f604` is comment-only (1 hunk, every changed line a `*` comment line).

How I worked:
- I read no Butlers or other observed-repository body and opened no credential file.
- I used only `bd show` and `bd list --all --json`, with no mutation.
- The repository working tree is untouched: `git status` shows the same two untracked files as at the start.
- One scratch clone of `6df4e623` (`vet-gp/clone`) was used for `tsc -b` builds and for importing two built modules with
  `node`. It is now deleted. No daemon was started and no `npm ci` was run: the clone's `node_modules` linked the main checkout's
  entries, plus local `@syzygy/*` links to the clone's own packages.
- Retained tools, in `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/vet-gp/`:
  - `probe-gate.mjs`, sha256 `18a43c665cb4e8f719b3dcb102fe55003d8f9fcf72ce223e6e23d2a0c6a41dcb`;
  - `reach-app.mjs`, sha256 `8660672c953bb1f3b6b279523216856463bf2a8628ecf97144db3d076ba9a284`.

Governing references read:
- GP-Q0, Part 1 at `:52-55`, Part 3 at `:83-93`, and the stop clause at `:95-96`;
- VIS-2 (`vision.md:133-146`);
- the questionnaire `adversarial-review.md` and `packet-contract.md`;
- the tracked `.claude/skills/th-engineering/subskills/engineering-bar/SKILL.md`, principles 6 and 7. No tracked
  greenfield-parity skill exists: `git ls-files .claude/skills | grep -c greenfield` gives 0.

---

### syzygy-bpyt.1.15
- Scope verdict: Revise. It is a real owner gate: the output changes fall outside GP-Q0 Part 1, and Part 3 does not list
  them. It is one decision, with the right provenance. But the background misstates the governing clauses, hides two places the
  change reaches, and understates the P-112 interaction.
  - The clauses it misses are PWB-REQ-006's "SHALL never be interpreted as markup or a link" (`spec.md:798-801`), and the
    two "only active-content detection" restrictions on the mask (`spec.md:825` and policy `:443`).
  - The first hidden reach: `stripFences` also feeds `declaredPillarRoots`, which is the phase-A read gate's allowlist.
  - The second: the manifest population changes under an act-bound `discoveryVersion` that does not move.
  - P-112 is ready for decision, and C falsifies its current bytes.
  - The matrix priority (P2) disagrees with the bead's (P1).
- Recommendation verdict: Revise. C is the better-supported direction: VIS-2, `spec.md:798-801`, the module's own invariant,
  fewer rules, and B probably needs a new closed failure reason. But the defence of C has gaps:
  - "C needs no spec amendment" rests on `:167-168` alone. C's wording, "from the profile's reader, the same one the
    active-content gate uses", collides with the literal text of `spec.md:825` and policy `:443`, which the item ignores.
  - The item must state its reading or route that conflict to the owner.
  - It must sequence C against any P-112 act.
  - It must name what C does to the discovery version, to parse-pass charging and to the docs that change with it.
- Material corrections:
  1. "No clause states the link reader's rule" and "A clause fixes only one of them" are wrong as stated.
     - PWB-REQ-006 "Inert code contexts" (`spec.md:798-801`) says inline code spans and fenced code blocks "SHALL never be
       interpreted as markup or a link", and `:810-811` says "Code contexts SHALL use this exact UTF-8 line-oriented profile".
     - On a natural reading this already governs G3's mint direction, so A may be non-conformant to a signed spec, not only to
       VIS-2.
     - Add the clause and say how the item reads it.
  2. Restate "C needs no spec amendment" against the clauses that restrict the mask to one consumer:
     - `spec.md:825`: "The context mask SHALL affect only active-content detection, never secret scans".
     - The act-bound policy `:443`: "the resulting mask applies only to active-content detection and never to secret
       detectors".
     - `markdown-code-context.ts:6`: "The mask exists for one consumer".
     - Either C shares the profile's *recognition rule* and not the mask (read the "only" clauses as excluding secret
       detectors), or, on a literal reading, C needs a spec and policy amendment, which is an owner act. Say which.
  3. The item hides how far the change reaches.
     - `stripFences` is also the fence rule of `rootIndexPillarRoots` (`project-shape-manifest.ts:285-287`).
     - `rootIndexPillarRoots` and `indexLinkTargets` together make `declaredPillarRoots` (`:365-381`).
     - `declaredPillarRoots` is the allowlist of the phase-A read gate `admitPhaseARead`
       (`project-shape-observation.ts:157-177`, `:471-475`).
     - So C, and B too, changes which pillar-index bodies phase A admits and which named files phase B reads from Butlers.
       Both stay inside the existing `readAuthority`, but files whose links were hidden become reads, and files minted from
       code stop being reads.
     - Name `rootIndexPillarRoots`, `declaredPillarRoots` and the phase-A admission in the boundary and in the decision text.
       "Exactly two readers" is not the population.
  4. The discovery version.
     - PWB-REQ-001 (`spec.md:361-364`) binds the "source-discovery version and observer/parser version as deterministic
       evaluation inputs".
     - That version is the act-bound registry's `discoveryVersion` `pwb-discovery-v2-candidate.1` (registry `:11`), pinned
       equal to the code by `project-shape-manifest.test.ts:581`.
     - C changes the manifest for the affected shapes. A precedent kept the version for a conformance repair (`6fa339b6`,
       `syzygy-1z3.29`), but a version bump is a registry act, and P-112 carries its own open `discoveryVersion` question.
     - State which reading C takes.
  5. P-112 sequencing.
     - P-112 has been "ready for decision since 2026-10-15" (`PENDING-OWNER-DECISIONS.md:1344`; the owner chose to wait).
     - Choosing C means P-112 must not be performed at its current bytes:
       - performed before C lands, it binds into the registry a sentence that C then contradicts, so C becomes a registry
         change;
       - performed after, it binds a false description.
     - The exclusion "no act on P-112 is performed or implied" hides this. Say plainly that C forecloses P-112's current
       offering.
     - The redraft also changes the builder's hard-coded text (`build_pwb_registry_loaded_profile_amendment.py:267-269`) and
       retires the notes-only clearance at `fa9bc47e`.
  6. B's cons omit a likely spec amendment [Inferred]. B's "named reason" is a new extraction failure reason, while the spec
     names each shape's failures (`spec.md:140-147`; missing-heading, duplicate-key, malformed-row, ambiguous-leading-label).
     Adding one probably needs a CC-REV-2 amendment to the PWB spec, which C does not.
  7. The matrix gives P2, but `bd show syzygy-bpyt.1.15` gives `[P1 · OPEN]`. Reconcile them.
  8. Same-change documentation (engineering-bar principle 7) belongs in the boundary:
     - the `AGENTS.md:191-199` fence bullet, which ends "Do not merge or 'fix' one without the owner … G2 and G3 are open
       owner questions" (bead comment N6);
     - `markdown-code-context.ts:6`;
     - the dc3 record;
     - the GAP G2 and G3 rows. A fix flips 3 of the 4 and 5 of the 6; each block has one control that stays.
- Evidence freshness: `41932c3b`, which was `origin/main` at both fetches. Not inspected: live Butlers sources. Excluded by the
  brief; the item's `[Unknown]` is acceptable and explained. I ran no tests.

#### Evidence for syzygy-bpyt.1.15

1. [Observed, `git show 41932c3b:…/spec.md`] The spec text:
   - `:798-801`: "Inline code spans and fenced code blocks SHALL be inert Markdown contexts: markup-like examples inside them
     SHALL NOT alone cause active-content exclusion and SHALL never be interpreted as markup or a link."
   - `:810-811`: "Code contexts SHALL use this exact UTF-8 line-oriented profile."
   - `:825-826`: "The context mask SHALL affect only active-content detection, never secret scans."
   - The packet's own quotes at `:142-145` and `:167-168` match the file.
2. [Observed] The policy and the mask module:
   - Policy `POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json:443`: "the resulting mask applies only to
     active-content detection and never to secret detectors".
   - That file's sha256 `319e404ee413220550d65644f6c93db096ed1cda431760baec70a1e190adb0bd` is cited in
     `ACCEPTANCE-ACT-RECORD.md` and in `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md`, so the bytes are
     act-bound.
   - `markdown-code-context.ts:6`: "The mask exists for one consumer: active-content detection."
3. [Observed] Neither the record nor the earlier reviews engage `:798-801`.
   - The dc3 record's reader 3 has the verdict `"no-clause-states-the-rule"`, and its reading says "none states a fence or
     code-span rule for index links". It quotes neither `:798-801` nor `:825`.
   - Both PR #533 raws (`R-GP-IMPL-FENCE-RULES-1-RAW.md`, `-2-RAW.md`) were searched with `grep -F` for `798`,
     `interpreted as markup`, `or a link` and `only active-content`. The sweep gave 1 hit: R1 `:279`, a line number of the
     record, which is unrelated.
4. [Observed, at `41932c3b`] The readers and the phase-A gate:
   - `stripFences` is at `project-shape-manifest.ts:175-193`.
   - `rootIndexPillarRoots` calls `stripFences(text, false)` (`:285-287`).
   - `declaredPillarRoots` is built from `rootIndexPillarRoots` and `indexLinkTargets` (`:365-381`).
   - `admitPhaseARead` refuses `not-a-phase-a-seed-path` outside `declaredRoots` (`project-shape-observation.ts:167-177`).
   - `declaredRoots` is filled from `declaredPillarRoots(text)` (`:471-475`).
   - `namedSources: namedPaths.size` is at `project-shape-manifest.ts:488`.
5. [Observed] The discovery version:
   - Registry `:11` has `"discoveryVersion": "pwb-discovery-v2-candidate.1"`.
   - The registry's sha256 `f2b3573cfe35169f449a9eed36b4c3330ef037d6668bab0548dd5d5939293556` is the argument of
     `ADOPT POLARIS BUTLERS PROJECT-SHAPE OBSERVER REGISTRY ENTRY` (`ACCEPTANCE-ACT-RECORD.md:1683`, recorded
     2026-10-20T17:57:09Z).
   - `project-shape-manifest.test.ts:581` asserts `registry.entries[0]?.discoveryVersion` equals `PWB_DISCOVERY_VERSION`.
   - `git log -S"pwb-discovery-v2-candidate.1"` gives `305500dc` and `de472fa5` (2026-09-05), so the version moved only
     with that amendment.
   - The message of `6fa339b6` (syzygy-1z3.29, 2026-09-10) changed discovery output under the same version: "No registry,
     spec or policy change; implementation only under the PWB implementation authorization."
6. [Observed] Registry `:279`, on `maxParsePassesPerSource` (16): "a helper traversal is charged to its named caller pass,
   repeating a pass counts again, and an unregistered traversal is forbidden". The registered passes are at `:348-361`. This
   is a note for the implementing bead, not a correction: C must charge any mask traversal it adds.
7. [Observed] P-112:
   - Its register row (`PENDING-OWNER-DECISIONS.md:1344`) says "ready for decision since 2026-10-15" and "the owner left
     'Perform P-112 now' unselected".
   - It lists `discoveryVersion` among its open questions.
   - The patch's `:316` holds the parenthetical "(the source-population reader and the extraction reader each keep their own
     rule for fence indentation and closing)". Verified with `grep -F`.
   - The builder `:267-269` hard-codes the same text.
8. [Observed for digests and paths; Inferred for literals] Are the readers registry-bound, act-bound or digest-cited?
   - The sha256 of each module at `41932c3b` and its citers:
     - `project-shape-extraction.ts`, `642cf156ed37bfc0ced7cb338e640268fc0e02648913dd71be5dc4efe6ed0dbd`: 19 files;
     - `project-shape-manifest.ts`, `47435438b5d14c944e2c53a510d07b0a3253758d2628f5332123155831494d49`: 14 files;
     - `markdown-code-context.ts`, `a02c105a483d11a9e90d27aade01ef5ddee6b60b9e165a9a7193c5baaa21f8fe`: 14 files.
   - Every citer is under `docs/evidence/`. A 16-hex-prefix sweep gives the same counts. Each git blob id has 1 citer
     (`docs/evidence/fence-rules-review-2026-10-27/r2/r2-check-record.json`). That makes 0 citers under `.syzygy/`,
     `openspec/` or `scripts/`.
   - The governed trees cite the paths only from candidate-package prose (impact ledgers, semantic deltas, review briefs), the
     P-115 compatibility JSON, and two scripts.
   - The P-112 builder checks literals of `project-shape-manifest.ts` other than any fence rule (`:754-791`). Its
     behavioural witnesses use plain fences only (`:1443`, `:1570-1584`), so C would not break them [Inferred].
   - So neither reader file is registry-bound, act-bound or digest-cited by a governed file.
9. [Observed] The `fence-rules.test.ts` blocks at `41932c3b`:
   - `GAP G2` has 4 tests: 1 control, an `it.each` of 2, and the tab row.
   - `GAP G3` has 6 tests: an `it.each` of 3, 1 control, the info-string row and the tab row.
   - The packet's counts hold. "Any fix fails those tests" is true of 3 of the 4 and 5 of the 6.
10. [Observed] The background's other claims check out:
    - extraction `:16-17` (the invariant), `:157` (`FENCE`), `:160` (CR stripped) and `:173` (the closer test);
    - the G2 rows give `{ principle: 1 }` against `{ principle: 3 }`;
    - `g3-manifest-probe.json` gives `namedSources` 2 (plain fence) against 1 (a closer-shaped line with an info string),
      both with `ignoredLinks: []` and `state: "discovered"`;
    - the dc3 G4 reading supports "already fails closed" at the public reader.
    - One omission: G3 also mints from a link inside a single-line double-backtick span (dc3 `singleLineDoubleBacktickSpan`),
      and the background names only the multi-line span. A note, not a correction.
11. [Observed] Ordering C after `syzygy-bpyt.16` is right.
    - At `41932c3b` the profile does not recognize a CRLF opener or closer: `FENCE_OPENER` ends in `(.*)$` and the closer in
      ` *$` (`markdown-code-context.ts:60`, `:63`). `parseDoc` strips CR first (`:160`).
    - So C before `.16` would expose fenced text in CRLF sources to the extractor.
    - `bpyt.16`'s scope item 4 already adds "an extractor-equals-mask line-model test".
    - Note for the implementing bead: after `.16` the profile also ends a line at a bare CR, while `parseDoc` splits on LF
      only. The bead has to say how fenced lines map onto `parseDoc`'s lines.
12. [Inferred] The authority basis. The extractor and the link reader are readers. The stronger basis for the gate is GP-Q0
    Part 1 (`:52-55`, "a rendered byte") together with bead 6.3's own authority ("a rule that departs from its clause is
    reported, not changed", dc3 `authority`).
    - With correction 3 the stop clause also applies literally: `admitPhaseARead` is a gate.
    - One sentence on why this is not a conformance repair under the PWB implementation authorization, as `6fa339b6` was,
      would pre-empt the obvious challenge.

### syzygy-bpyt.1.16
- Scope verdict: Revise. It is a real owner gate (removing or adding a prefix changes what the gate refuses, so the stop clause
  applies; the #539 and #540 reviewers both say so), and it is one decision. But the framing, "the packages the daemon loads"
  against "the packages `build:poc` builds", omits the fact that decides it.
  - `npm run poc` compiles other projects in the same `tsc -b --force` run as the daemon's own packages.
  - A dirty build input of any compiled project can write the `dist/` of a package the daemon loads.
  - The item also omits the dependent bead `syzygy-bpyt.28`, and wrongly calls itself independent of 1.17.
- Recommendation verdict: Reject. B's central claim, "The 17 paths B stops refusing are code the daemon does not load, so no
  observation becomes less honest", is false.
  - Two uncommitted paths under `packages/cap1-daemon/` make the exact `build:poc` command exit 0. They replace
    `packages/http-host/dist/escape-html.js`, which the daemon's surfaces import, with an escaper that does not escape `<`.
  - The gate at `6df4e623` refuses that tree. B's five-prefix list accepts it (evidence 1).
  - The current gate already accepts the same kind of tree through `polaris-generation-core` (evidence 2). So A is unsound
    too, and C's cons are wrong.
  - Redraw the recommendation as one of:
    - C: protect every project the daemon's start builds;
    - D: B's equality guard over the build's own project list, after the daemon's build is made to compile exactly the import
      closure (`bpyt.28`, plus taking the generation packages out of the app's build references).
- Material corrections:
  1. Withdraw B's honesty claim and record the counterexample (evidence 1).
     - For this gate's purpose, the population is the import closure plus every project the daemon's start compiles, as long
       as `poc` is `build:poc && node …/main.js` with `tsc -b --force` (`package.json:15-16`).
     - The project already protects a package's `tsconfig.json` as "a dirty build input" for this reason
       (`git-observation.test.ts:123-124`).
  2. Correct A's and C's rows.
     - A leaves `polaris-generation-core` and `polaris-generation-consent` unprotected, though `build:poc` compiles both: the
       consent package through the `references` in `apps/three-surface-poc/tsconfig.json`.
     - Evidence 2 shows the current gate accepting a tree whose build replaces the escaper the daemon loads.
     - C's "Refuses on code the daemon never runs" and "ties the gate to a build script rather than to the runtime" are
       wrong: the build script writes the runtime.
  3. "Every refusal has a reason" is false at file granularity under every option.
     - The gate works by package. 53 of the 94 non-test modules under `apps/three-surface-poc/src` are not reached from
       `main.ts` (evidence 7), including 25 of the 26 under `polaris-generation/`.
     - Editing them already blocks startup today, so C's con "an operator editing generation code cannot start the daemon"
       is already true for the app's own generation code.
  4. Name the dependent bead `syzygy-bpyt.28` (blocked by 1.16). Its text: "Drop cap1-daemon from root build:poc … it is an
     exit-behaviour change in a failure case … Do not start before that ruling."
     - Under B, it removes `cap1-daemon` from both lists, which closes evidence 1 for that package and also ends the "a broken
       cap1-daemon still fails the build" mitigation.
     - Under A, it leaves a prefix that protects a package nothing builds or loads.
     - Say whether the chosen option decides `bpyt.28` or leaves it a separate owner question.
     - The exclusion "`build:poc` is unchanged" should say that the change is deferred to `bpyt.28`.
  5. 1.16 and 1.17 are coupled, so the preface's "They are independent of one another" is wrong.
     - #540's derivation guard (`git-observation.test.ts:144-153` at `6df4e623`) walks with the testkit's `reach` and
       `WORKSPACE` (`:17`).
     - An unscoped workspace that the daemon imports would therefore be skipped by B's equality guard, which is 1.17's hole.
  6. State the prerequisite: B's list and its guard exist only on #540, which is open and not merged.
- Evidence freshness: `41932c3b`, and the #540 head `6df4e623` (open, not merged), where the six-prefix list and the guard were
  read. Not inspected:
  - no daemon start (evidences 1 and 2 import built modules only);
  - no `npm ci`;
  - [Unknown] whether `npm run poc:restart` rebuilds;
  - no full Vitest run.

#### Evidence for syzygy-bpyt.1.16

1. [Observed, scratch clone of `6df4e623` with no prior `dist/`] The `cap1-daemon` plant.
   - The two paths:
     - `packages/cap1-daemon/tsconfig.json`: `outDir` `"dist"` → `"../http-host/dist"`, `declarationDir` added as
       `"dist-decl"`, `include` `["src"]` → `["src/escape-html.ts"]`;
     - a new untracked file `packages/cap1-daemon/src/escape-html.ts`: a copy of `packages/http-host/src/escape-html.ts` with
       its line `    .replace(/</g, '&lt;')` removed.
   - The run: `package.json`'s exact `build:poc` command (`tsc -b --force packages/support packages/cap1-core
     packages/http-host packages/cap1-daemon packages/three-surface-poc-core packages/polaris-generation-core
     apps/three-surface-poc`) exits 0.
   - The result: `packages/http-host/dist/escape-html.js` no longer has the `<` replacement.
   - `probe-gate.mjs` (sha256 above) imports the built `git-observation.js` and the built `http-host` barrel, and reads
     `git status --porcelain=v1 -z --untracked-files=all`. Its output:
     - `changedPaths`: `packages/cap1-daemon/tsconfig.json`, `packages/cap1-daemon/src/escape-html.ts`, and two
       `dist-decl/escape-html.d.ts*` files;
     - `"gateAt6df4e623Clean": false`, so the current gate refuses;
     - `"optionBClean": true`, so the same predicate with B's five prefixes accepts;
     - `"escapeHtmlOfScript": "<script&gt;"`.
   - The plant works because `tsc -b` builds `http-host` before `cap1-daemon` (`cap1-daemon/tsconfig.json` references it),
     and does not rebuild it later in the same run.
2. [Observed, the same clone] The `polaris-generation-core` plant, against today's gate.
   - First a clean `build:poc` exits 0. That leaves `dist/` in place, as it is in any operator checkout that has run the POC.
   - The plant: in `packages/polaris-generation-core/tsconfig.json`, set `outDir` to `"../http-host/dist"`, add
     `declarationDir` `"dist-decl"`, and set `include` to `["src/escape-html.ts","src/workspace-reach.testkit.ts"]`. Add the
     same untracked `src/escape-html.ts` as in evidence 1.
   - `build:poc` exits 0 again. The probe gives `"gateAt6df4e623Clean": true` (the current gate accepts),
     `"optionBClean": true` and `"escapeHtmlOfScript": "<script&gt;"`.
   - Two cruder variants fail loudly instead:
     - `include` limited to the one file breaks the app's build (TS6059 and TS6307, exit 2), because `git-observation.test.ts`
       imports the testkit source;
     - `declarationDir` `"dist"` with the full `include` overwrites `http-host/dist/index.js`, and `escapeHtml` stops being
       a function.
   - So the hole needs a deliberate config. It is a silent, honesty-breaking path, and nothing about it is exotic.
3. [Observed, `6df4e623`] Daemon surfaces import `escapeHtml` from `@syzygy/http-host`: `exact-tables.ts:1`,
   `materialize-action.ts:1`, `orrery.ts:1`, `polaris-reconciliation.ts:16` and `polaris-source.ts:1`.
4. [Observed] What the gate is for, and what it does not cover:
   - The snapshot's `observer:${capture.observerRevision}` is at `production-reobserve.ts:88`. The gate's only production
     call is in `poc-main.ts:133-137`.
   - The governance inputs are read from git objects at the observer revision (`governance-inputs.ts:396-405`,
     `gitTreeReaders`), so a dirty `.syzygy/` file does not leak into an evaluation. Non-code runtime reads are not a gap.
   - `tsconfig.base.json` has `"isolatedModules": true`. rev-540's §3.5 conclusion that a dirty file "cannot change what the
     daemon runs" is labelled [Inferred] there: it considered what is emitted, not where the emit lands.
5. [Observed] The `cap1-daemon` count:
   - 17 tracked paths at `41932c3b` and at `6df4e623` by `git ls-tree -r`, and 17 by `git ls-files` at HEAD (`41932c3b`).
   - The bead's "21" comes from `R-GP-IMPL-HOST-TIDY-1-RAW.md:137`. It is the refused population over four commits plus the
     reviewer's probes (`:256-262`), not a tracked count at one commit. The packet's 17 is right.
   - B stops refusing every path under the prefix, untracked ones included (evidence 1 uses an untracked file), not only those
     17.
6. [Observed] The build and its references:
   - `package.json:15-16` at `6df4e623` holds the `build:poc` and `poc` scripts.
   - `apps/three-surface-poc/tsconfig.json` references `polaris-generation-core` and `polaris-generation-consent`, and the
     planted build in evidence 2 compiled the consent package.
   - `git log -S"polaris-generation"` on `git-observation.ts` gives 0 commits: no generation prefix has ever existed.
7. [Observed] `reach-app.mjs` walks `apps/three-surface-poc/src/main.ts` with `ts.preProcessFile` (static, type-only and
   dynamic-literal edges; relative edges only):
   - it reaches 41 of the 94 non-test `.ts` modules under `apps/three-surface-poc/src`, 1 of them under `polaris-generation/`;
   - its `@syzygy/*` imports are `http-host`, `support` and `three-surface-poc-core`.
8. [Observed] `bd show syzygy-bpyt.28`: "Depends on syzygy-bpyt.1.16"; its text is quoted in correction 4.
9. [Observed] The #540 raw (`R-GP-IMPL-OBSERVER-SUPPORT-1-RAW.md` at `6df4e623`):
   - §3.5: "Ruling: the daemon entry's import graph is the right population for this guard".
   - N6: "the guard's population excludes packages named only by `build:poc` or by tsconfig `references`".
   - The packet's "ruled it the right population" is a fair summary for *the guard*. The raw did not test build-output
     placement.
10. [Observed] `R-GP-IMPL-HOST-TIDY-1-RAW.md:141-142`: "`build:poc` still runs `tsc -b --force … packages/cap1-daemon …`, so a
    broken cap1-daemon can still fail `npm run poc`'s build."
    - The packet's operator-command claim, labelled [Inferred], is Observed in the #540 raw §3.5: "No other entry … imports
      `poc-main` or the gate".

### syzygy-bpyt.1.17
- Scope verdict: Revise. It is one decision, with provenance (PR #541 round 1, N2), but four things are wrong.
  - The item asserts its owner-gate status without arguing it:
    - A is a test-only precondition that changes no guard's answer on any existing tree;
    - the packet contract routes "test scope" to autonomous resolution;
    - the basis should be stated: the island guard carries class-1 and class-4 evidence, and rev-541 and the testkit both
      read a tightening of the guards as needing a GP-Q0 ruling.
  - It misidentifies the guards it affects.
  - It claims independence from 1.16.
  - It leaves out a sibling residual of the same class (bare directory specs, testkit `:67-69`, from `syzygy-bpyt.8.38`),
    which no owner bead holds.
- Recommendation verdict: Revise. A is a reasonable choice that fails closed, but three things are wrong.
  - Option B is misdescribed: with the `localNames` mechanism the guards do not "follow such imports automatically". They
    fail on them.
  - A's pros do not separate it from B: both are test-only, and neither changes an answer today.
  - "Closes the hole at the point where it could open" is overstated: a bare directory-spec dependency opens the same hole
    while every workspace stays scoped.
- Material corrections:
  1. The guards affected.
     - The "daemon-path guard" is `packages/polaris-dossier/src/subpath-imports.test.ts`, whose entry is
       `apps/syzygy/src/main.ts` (testkit header `:5-6`; #541 raw `:70`). It is not item 2's guard.
     - The resolver's consumers are 3 test files at `41932c3b` (island-boundary, subpath-imports and workspace-reach) and 4 at
       `6df4e623`, which adds item 2's `git-observation.test.ts`.
     - Every guard that walks with `reach` is affected.
  2. Option B's row.
     - Under rev-541's (b) ("`localNames` adding every non-root manifest's own name"), an import of an unscoped name resolves
       to `undefined` (`resolveIn`, `:98`).
     - `reach` records it as unresolved (`:120`), so the guards' unresolved rows fail. The guards do not walk into the module.
     - Following the module would need a different change: resolve the name through the manifest's `exports`, as for
       `@syzygy/*`.
     - Either restate B as "fails a guard on any guarded import of such a name", so that A and B differ only in whether the
       workspace's existence or a guarded import fails, or offer the follow variant as its own option.
  3. A's distinguishing pros are wrong.
     - "Smallest change, and test-only", "No resolver answer changes today" and "no production code changes under A" are
       equally true of B.
     - The resolver lives in `workspace-reach.testkit.ts`, which only tests import.
     - `localNames` is consulted only for names outside `@syzygy/*`, and 12 of the 12 manifests are scoped, so B changes no
       answer on today's tree either.
     - State the real difference.
  4. Fold in, or cross-reference, the directory-spec residual (testkit `:67-69` at `41932c3b` and at `58e8f604`; bead
     `syzygy-bpyt.8.38`, closed, "needs a GP-Q0 ruling first").
     - A dependency declared as `"foo": "packages/polaris-dossier/"` is linked by npm and read by the resolver as outside,
       while every workspace stays scoped.
     - No owner bead holds this: the sweep in evidence 6 finds only 1.17 and the closed 8.38.
     - Add an option that closes both forms: for example, a precondition that every manifest's dependency spec is either a
       registry range or a form `LOCAL_VERSION` recognizes, or one that keys on npm-package-arg's type.
  5. A's population must be npm's workspace set: the root `package.json` `workspaces`, `packages/*` and `apps/*`. It must not
     be the testkit's hard-coded `apps`/`packages` directory listing (`:32`), or a workspace added under a new glob escapes
     both the precondition and the resolver.
  6. Correct the preface's claim of independence; see correction 5 of 1.16.
- Evidence freshness: `41932c3b` and the #540 head `6df4e623`.
  - The #541 round-1 raw reviewed `5db78a26`. It is in the coordinator scratchpad as
    `rev-541/R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-1-RAW.md`, sha256
    `dd2a451718e833893e19e753e9e18fad2beca47d1792d38b657f4c78b63952e6`, with the verdict `REVISE`.
  - #541's head is now `58e8f604`, where the testkit change from main is comment-only and names the N2 residual.
  - Not inspected: the review of the #541 repair (not yet run). The npm link behaviour for an unscoped workspace was not
    re-probed: I rely on the #541 raw's §3.5 cases 7-8, and on the `node_modules/@syzygy/*` symlinks named by package name.

#### Evidence for syzygy-bpyt.1.17

1. [Observed, `41932c3b`] The resolver:
   - `resolveIn` `:97-98`: for a bare name outside `@syzygy/`, `localNames(workspace).has(name) ? undefined : null`;
   - `reach` `:117-121`: `null` is skipped, and `undefined` is pushed to `unresolved`.
   - The resolver code is unchanged at `58e8f604`.
2. [Observed] The workspace names:
   - `apps/*/package.json` and `packages/*/package.json` give 12 manifests, all 12 `@syzygy/`-scoped, at `41932c3b`,
     `6df4e623` and `5db78a26` (`git ls-tree` plus `json.load`).
   - A second method: `npm query .workspace` in the main checkout gives 10 names, all 10 scoped. That install is stale: it
     dates from 2026-10-14 and lacks the `http-host` and `support` links. The two methods agree that 0 names are unscoped.
3. [Observed] The importers of `workspace-reach.testkit` (`git grep -l -F`):
   - at `41932c3b`: `packages/polaris-dossier/src/subpath-imports.test.ts`,
     `packages/polaris-generation-core/src/island-boundary.test.ts` and `…/workspace-reach.test.ts`;
   - at `6df4e623`: those three, plus `apps/three-surface-poc/src/git-observation.test.ts` (which imports `reach`,
     `readModule` and `WORKSPACE` at `:17`).
4. [Observed] The head of `subpath-imports.test.ts`: `const ENTRY = 'apps/syzygy/src/main.ts'`, and "the daemon entry
   statically imports two of this package's modules by subpath".
5. [Observed] The testkit's residual at `:67-69`: "npm also reads a directory spec with no leading `./` … as a directory. Those
   still read as outside the workspace; widening the pattern to them changes what the guards refuse and needs a GP-Q0 ruling
   first." At `58e8f604` it is joined by an N2 residual with the same closing words.
6. [Observed] A sweep of `bd list --all --json`: 871 beads, matched on the terms "directory spec", "directory-spec" and
   "unscoped". It gives 2 hits: `syzygy-bpyt.1.17` (open) and `syzygy-bpyt.8.38` (closed).
   - `.beads/issues.jsonl` is stale (2026-10-03) and holds neither id, so it was not used as the denominator.
7. [Observed] Testkit `:32` enumerates only `['apps', 'packages']`. The root `package.json` `workspaces` is
   `["packages/*", "apps/*"]`; they agree today, and nothing ties the one to the other.
8. [Observed] In the main checkout, `node_modules/@syzygy/*` entries are symlinks named after each package, pointing at its
   directory.
9. [Observed] #541 raw `:76-83`: "GP-Q0: nothing a gate accepts or refuses changes", measured as equal island answers. By that
   measure A changes no answer either. #541 raw `:353-355` reads both closures as needing a GP-Q0 ruling. The item should cite
   that reading as its basis and say why it holds for a precondition that refuses only a future tree.

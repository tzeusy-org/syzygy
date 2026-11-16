# VET-GP-FOLLOWUPS-2 — round 2 vet of syzygy-bpyt.1.15, 1.16 and 1.17

- Subject: `/home/tze/.tmp/user-questionnaire/syzygy-2026-10-27-gp-followups/packet.md`, sha256
  `f8ee5431c3bd8773b930394948782dd10c7956487531504f8186668bf5b99a6a` (re-derived by `sha256sum` before and during the vet;
  235 lines).
- Round 1: `VET-GP-FOLLOWUPS-1.md`, sha256 `bb29a17ba85049e2bf445f3d111036a3a6b21355c4ae1e0883a29972f3c2b189`.
- Refs, all re-read at write time [Observed]: `origin/main` is `41932c3b5aba`; PR #540 is OPEN at `6df4e623`; PR #541 is OPEN
  at `58e8f604`.
- Rules kept: read only (every repository read was `git show <commit>:<path>` or `git grep <commit>`); no observed-repository
  body; no credential file; no bd mutation (`bd show` only); no scratch clone (none made this round).

| Item | Scope | Recommendation |
|---|---|---|
| `syzygy-bpyt.1.15` | Pass | Revise |
| `syzygy-bpyt.1.16` | Pass | Revise |
| `syzygy-bpyt.1.17` | Revise | Pass |

### syzygy-bpyt.1.15
- Scope verdict: Pass. Round 1's scope corrections are applied truly. The clauses are now quoted correctly (`:798-801`,
  `:810-811`, `:825`, policy `:443`, `:142-145`, `:167-168`). The phase-A reach (`rootIndexPillarRoots` →
  `declaredPillarRoots` → `admitPhaseARead`) is stated. P-112's conflict and sequencing are stated, and so is the gate basis
  ("`admitPhaseARead` is a gate"). It is one decision. Only notes remain (N1–N4 below).
- Recommendation verdict: Revise. The "recognizer, not mask" reading is coherent, and it is handed to the owner rather than
  assumed. The discovery-version reasoning holds against its precedent. But this revision widened C: round 1's C used the
  profile's fences in the extractor and its spans only in the link reader, and the new C makes the extractor, the link reader
  and the root-index reader recognize "fences and spans by the profile's grammar". The profile's span rule closes "only at the
  next run of exactly the same length" (`spec.md:819-821`). It does not stop at a blank line, a list item, a heading or a table
  row. So on any text that holds two stray single backticks, C hides structure that today's readers and a CommonMark reader both
  see, and nothing signals it (evidence 1-3). That makes C's pro "The mints and the hides both go" false as written: the fence
  hides go, and a new class of span hides arrives. The fence-rule record measured neither direction of it (evidence 4).
- Material corrections:
  1. State the cross-block span trade, and choose its form. [Observed, probes against the `41932c3b` profile]:
     - a list item between two stray backticks is wholly masked (evidence 1);
     - a `##` heading and the item after it are wholly masked (evidence 1);
     - a pillar-table row's directory code span stops being a span: the stray backticks of the rows above and below pair with
       its delimiters (evidence 2);
     - two index links in a list, between stray backticks on lines two blank lines apart, are both masked, though today's
       reader keeps both (evidence 3).

     [Inferred] Under C as now worded, the consequences are:
     - the extractor would drop the hidden item and report the smaller set as complete (for example `{principle: 2}` where a
       reader sees three), or fail as `missing-heading` for a heading it hid;
     - `rootIndexPillarRoots` would `continue` past the broken row (`project-shape-manifest.ts:304`), so a pillar root, and
       with it that pillar's phase-A admission, drops silently;
     - the link reader would drop both links, which is G3's own "no ignored-link signal" outcome.

     Each probe text is `kind: "masked"`, which is well formed under the profile, so the active-content screen admits it, and
     `classifyPhaseA` runs before link discovery (`project-shape-observation.ts:448-458`).

     Make the item say this, and choose one of:
     - (a) C with profile fences for all three readers, and profile spans only in the link reader, where `:798-801` "never …
       a link" bites. The link-hide residual is then stated, or signalled as ignored links. This is round 1's C. Round 1 missed
       its link-hide half, which this vet records now.
     - (b) C as worded, plus a fail-closed signal wherever a profile span crosses a block boundary. That is a new failure
       reason, with B's likely spec amendment.
     - (c) C as worded, choosing the spec-literal reading of `:798-801` with `:810-811`, which makes every profile span inert.
       Choose it knowingly, and state the CommonMark divergence in the cons.

     For the extractor and the table reader, `:142-145` names only "fenced code", and `:167-168` leaves its recognition "to the
     observer". So (a) is lawful, and it does not need `:798-801` read broadly.
  2. C's pro "The CRLF fix (`syzygy-bpyt.16`) then covers every reader" is false: it covers the three readers that C moves onto
     the profile. The consent reader (G4) and the renderer keep their own rules, which is the boundary's own exclusion "no
     change to the consent reader or the renderer".
  3. C's cost omits a code change to the active-content gate's module. Correct the cons and the boundary to say that C edits
     its code, not only its comment at `:6`. [Observed] `markdown-code-context.ts` at `41932c3b` exports
     `MALFORMED_CODE_CONTEXTS`, `MalformedCodeContext`, `CodeContextMask` and `maskMarkdownCodeContexts` (`:36`, `:41`, `:43`,
     `:74`), and no separate recognizer. A shared recognizer needs that module to be refactored. The implementing bead then
     needs a differential showing the mask, and its malformed decisions, byte-identical on the fence-probe corpus and the
     scanner-path tests. It also needs the `:6` sentence kept true: under C's reading the *mask* still has one consumer, and
     the recognizer gains three.
- Evidence freshness: `41932c3b` (= `origin/main`). The profile copy `r2/mcc.ts` hashes equal to the `41932c3b` blob
  (`a02c105a…`). The probes import the profile only. No reader was run on the probe texts, so every reader consequence above is
  [Inferred] from the reader code at `41932c3b`. Not inspected: the renderer's treatment of cross-block spans; whether any live
  source has such a shape [Unknown], and it cannot be learned without a Butlers read.

#### Evidence for syzygy-bpyt.1.15 (round 2)

1. [Observed] `node r2/span-probe.mjs` (Node v24.6.0, the `41932c3b` profile) prints lines wholly blanked by the mask:
   - `listItems` (`1. **First.** uses \`x` / blank / `2. **Second.** two` / blank / `3. **Third.** y\` z`):
     `"kind": "masked", "spans": 1, "fences": 0, "blankedLines": ["2. **Second.** two"]`;
   - `heading` (a stray backtick, then `## Non-Negotiable Rules` and `1. **First.** one`, then another stray):
     `"kind": "masked", "spans": 1, "blankedLines": ["## Non-Negotiable Rules", "1. **First.** one"]`.
2. [Observed] `node r2/table-probe.mjs`, on a pillar table with a stray backtick in the rows above and below the Lay and Land row:
   `"kind": "masked", "spans": 3`. Row 5 masks to `"                      about/lay-and-land/   "`. So its pipes, its label
   and its backticks are inside spans, and its directory text is outside any span. `rootIndexPillarRoots` needs the cell to match
   `` /^`([^`]+\/)`$/ `` (`project-shape-manifest.ts:302`); today it reads the row cell by cell, with `stripFences(text, false)`
   (`:287`).
3. [Observed] `node r2/link-probe.mjs`: a paragraph with one lone backtick, a two-item link list, and a later paragraph with one
   lone backtick. The profile gives `"kind": "masked", "spans": 2`, and masks both `- [Vision](vision.md)` and `- [Rules](rules.md)`
   to blanks. Today's per-line strip (`` line.replace(/`[^`]*`/g, '') ``, `:190`) keeps both lines.
4. [Observed] The dc3 record (`41932c3b`, sha256 `f8b27b2e…`):
   - G2 measured "on the cases that no inline span touches (25 LF cases …)";
   - G3's span rows (`fence-rules.test.ts:233-235`) are three spans inside one paragraph, each with a `rendered` value of
     `<p><code>…</code></p>`, where the profile and CommonMark agree;
   - no case puts a span across a block boundary, so neither the hide direction nor its size is measured.
5. [Observed] The recognizer reading. `:825`: "The context mask SHALL affect only active-content detection, never secret scans".
   Policy `:443`: "the resulting mask applies only to active-content detection and never to secret detectors". Both "only"
   clauses contrast with secret scanning, and C's reading fits their words. The recommendation offers the stricter reading to the
   owner, with its amendment cost ("Say so in your answer"), so there is no authority leakage.
6. [Observed] The discovery-version precedent:
   - the registry's `discoveryVersion` is `pwb-discovery-v2-candidate.1` at `6ec141b9` (the parent of `6fa339b6`), at
     `6fa339b6` and at `41932c3b`;
   - `bd show syzygy-1z3.29`: "the code is narrower than the registry, so this is an implementation defect, no
     registry/spec/policy change", closed as "Implemented and independently reviewed in merged PR #29";
   - PWB-REQ-001 (`:361-364`) binds the "source-discovery version and observer/parser version". G2 is a parser change, which the
     observer revision already binds. G3 and the phase-A reach are discovery changes, and the precedent changed phase-A
     discovery under the same version.

   The reasoning holds, framed as a recommendation.
7. [Observed] The phase-A seed path classifies before it reads links: `deps.classifyPhaseA(text, charge)`, and an excluded seed
   returns `unavailable` before `charge('phase-a-link-discovery')` (`project-shape-observation.ts:448-461`). So C needs no
   malformed-text failure reason, and "adds no failure reason" holds for malformed input.
8. [Observed] The GAP rows: GAP G2 has a control plus three rows (`fence-rules.test.ts:205`, `:211` ×2, `:217`), and GAP G3 has
   three span rows, a control and two closer rows (`:242` ×3, `:249`, `:253`, `:260`). The packet's "3 of 4 and 5 of 6 flip;
   each block's control stays" matches.

#### Notes for syzygy-bpyt.1.15 (not material)
- N1. The first Background bullet is labelled [Observed], but it carries "On a natural reading, that clause already forbids G3's
  mints", which is [Inferred]. Label that sentence.
- N2. The boundary updates "the dc3 record" in place. Its digest has 0 citers, but it is the finished bead 6.3's evidence, and
  retained reviews cite it by path and line. Update it by a dated addendum or a successor record. Round 1 put this item on the
  list; this note refines it.
- N3. At the ruling, give the P-112 register row (`PENDING-OWNER-DECISIONS.md:1344`) a dated mark that names this ruling and the
  redraft it waits on.
- N4. The extractor already drops a trailing CR (`project-shape-extraction.ts:160`), so for it the CRLF fix adds only bare-CR
  handling.

### syzygy-bpyt.1.16
- Scope verdict: Pass. Round 1's six scope corrections are applied truly (see the check table below):
  - the build writes the runtime, which is now the decision's first sentence;
  - both counterexamples are recorded;
  - `bpyt.28` is named, with its own question kept;
  - the coupling to 1.17 is stated in the preface;
  - the #540 prerequisite is stated ("This item assumes #540 has landed");
  - the file-level claim is withdrawn.

  It is one decision, and a gate change. One option-independent residual should be disclosed (N1).
- Recommendation verdict: Revise. B is right, and its claims hold. Its derived population is exactly the eight projects in B's
  list, so it refuses both plants; "no build change" is true (evidence 1-3). But C, as drawn, cannot be built. Eighteen
  non-test app modules under `src/polaris-generation/` import the two generation packages, and the app project is itself in
  the import closure. So "the generation packages leave the app's build references" leaves `build:poc` compiling those modules
  against `dist/` declarations that are absent or stale (evidence 4). C's cost is a fourth change, and the row understates it.
- Material corrections:
  1. Correct C's row. Shrinking the build to the import closure first needs the app's `src/polaris-generation/` modules, with
     their operator `*-main.ts` entries, moved into a project of their own. Otherwise `build:poc` compiles 18 modules that import
     `@syzygy/polaris-generation-core` or `-consent` without building them, and the packages' `exports` resolve to
     `./dist/*.d.ts`. [Inferred] That is TS2307 on a fresh checkout, or phantom or stale types afterwards: the `AGENTS.md`
     guardrail on app typecheck through `dist` declarations. Count it in C's cons as four build changes: `bpyt.28`, the
     reference removal, the project split, and the operator commands' own build step.
- Evidence freshness: `41932c3b` and the #540 head `6df4e623` (OPEN), re-read this round.
  - The plants were not re-run: their changed paths are recorded in round 1, evidence 1-2, and the predicate is prefix
    membership.
  - No daemon start, no build, no `npm ci`.
  - The C infeasibility is [Inferred]; no build without the references was run.

#### Evidence for syzygy-bpyt.1.16 (round 2)

1. [Observed] `6df4e623:package.json`:
   - `"build:poc": "tsc -b --force packages/support packages/cap1-core packages/http-host packages/cap1-daemon
     packages/three-surface-poc-core packages/polaris-generation-core apps/three-surface-poc"` lists seven projects, and
     `polaris-generation-core` is among them directly, not only by reference;
   - `"poc": "npm run build:poc --silent && node apps/three-surface-poc/dist/main.js"`.
2. [Observed] Each project's `references` at `6df4e623`. Every one has `include` `["src"]`, `outDir` `dist`, and `extends`
   `../../tsconfig.base.json`, a protected exact input.

   | Project | References |
   |---|---|
   | `support` | none |
   | `cap1-core` | none |
   | `http-host` | `cap1-core` |
   | `cap1-daemon` | `cap1-core`, `http-host` |
   | `three-surface-poc-core` | `cap1-core`, `support` |
   | `polaris-generation-core` | `support` |
   | `polaris-generation-consent` | `polaris-generation-core`, `support` |
   | app | `http-host`, `three-surface-poc-core`, `polaris-generation-core`, `polaris-generation-consent`, `support` |

   - The transitive closure is 8 projects. It equals one level of references today, because `consent`'s references are already
     in the set.
   - The import closure, by static `from '@syzygy/…'` in non-test sources:
     - `http-host` imports `cap1-core`;
     - `three-surface-poc-core` imports `cap1-core` and `support`;
     - `cap1-core` and `support` import none.

     With the app's own `http-host`, `support` and `three-surface-poc-core` (round 1, evidence 7), it is five packages, all
     inside the 8.
   - So the union is the 8 projects, which is exactly B's six prefixes plus the two generation packages. Plant 1's paths are
     under `packages/cap1-daemon/`, and plant 2's under `packages/polaris-generation-core/`. Both prefixes are in B, so B
     refuses both trees [Inferred from the predicate and the recorded changed paths].
3. [Observed] "No build change" is true. B edits the gate's prefix list (`git-observation.ts:181-188`) and replaces the test at
   `git-observation.test.ts:144-153`, which is today a subset check ("It is a subset check, so the gate may protect more than
   the walk reaches"), with an equality check. No script or `tsconfig.json` changes. "Replace #540's guard" is accurate, and
   the boundary's own review covers it.
4. [Observed] 18 non-test files under `apps/three-surface-poc/src/polaris-generation/` import `@syzygy/polaris-generation-core`
   or `-consent` (`git grep -l` at `6df4e623`, test files excluded). Among them are the operator mains
   `dossier-main.ts`, `dossier-evaluation-main.ts`, `dossier-render-main.ts` and `pipeline-demo-main.ts`. Both packages'
   `exports` give `"types": "./dist/index.d.ts"`. The app manifest declares both as dependencies (`0.0.0`).
5. [Observed] The restart path, which was [Unknown] in round 1:
   - `"poc:restart": "node apps/three-surface-poc/dist/restart-main.js"` (`package.json:17`) builds nothing;
   - `restart.ts` respawns the listener's own argv, `node …/dist/main.js …` (`:79-80`, `:141-142`);
   - the successor runs the gate on the tree as it is at that moment (`poc-main.ts:133-136`,
     `deps.observeGitRepository(io.cwd())`);
   - `buildRevision` is `capture.observerRevision`, the HEAD at start (`poc-main.ts:179`); nothing records which tree a `dist/`
     was built from.

   See N1.
6. [Observed] The checks on round 1's corrections:

   | Round-1 correction | Applied truly? |
   |---|---|
   | 1. Withdraw B's honesty claim, record the counterexample | Yes. Background bullet 3, both plants, with exact effects matching round 1, evidence 1-2 |
   | 2. Correct A's and C's rows | Yes for A ("the observed hole … stays open"). C was redrawn, and the new C has the defect above |
   | 3. Withdraw "every refusal has a reason" | Yes. "53 of 94" equals 94 − 41 (round 1, evidence 7) |
   | 4. Name `bpyt.28`, and say whether the option decides it | Yes. Background, recommendation ("stays its own question under B") and exclusion |
   | 5. The 1.16/1.17 coupling | Yes, in the preface |
   | 6. State the #540 prerequisite | Yes |

#### Notes for syzygy-bpyt.1.16 (not material)
- N1. Disclose the option-independent residual in one sentence. After a dirty `build:poc` and a revert, `npm run poc:restart` (or
  a direct `node …/dist/main.js`) starts a daemon from the dirty-built `dist/` while every option's gate reads a clean tree
  (evidence 5) [Inferred: no run]. B closes the `npm run poc` path the counterexamples use. It does not close this one. A bead
  could bind the build's tree identity into `dist/`.
- N2. B's derivation should follow `references` transitively, as `tsc -b` does (evidence 2). One level suffices today, by
  coincidence.
- N3. B's derivation reads `build:poc`. Derive the build step from the `poc` script, or pin that `poc` runs `build:poc`, so that
  re-pointing `poc` at another build cannot leave the guard green.

### syzygy-bpyt.1.17
- Scope verdict: Revise. Every round-1 correction is applied:
  - the basis;
  - the guards;
  - B restated;
  - C (follow) added;
  - the directory-spec form folded in;
  - A reading npm's globs;
  - the coupling.

  The census is true: 5 distinct specs over 13 manifests at all three commits, by two methods (evidence 1). But the corrections
  introduced two false sentences:
  - "Four guards walk with this resolver". Three guards walk with `reach`. The fourth importer, `workspace-reach.test.ts`, is
    the resolver's own unit test. It calls no `reach`, walks no entry, and guards no tree invariant. Round 1 said
    "consumers", and the packet turned that into "guards" (evidence 2).
  - "Why it is yours: every option changes what the guards refuse on some tree". D changes nothing.
- Recommendation verdict: Pass. A is a real option, and its distinguishing pro is now true and separates it from B ("Fails on
  the PR that introduces either form, whether or not a guard reaches it"). B's mechanism is described correctly: the three
  guards assert `unresolved` empty, so a guarded import fails them. C is real. The recommendation traces to the testkit's and
  #541's GP-Q0 reading, and it leaks no authority. Notes N1–N3.
- Material corrections:
  1. Replace "Four guards walk with this resolver once #540 lands" with: three guards walk with `reach`
     (`island-boundary.test.ts`, `subpath-imports.test.ts` and #540's guard in `git-observation.test.ts`), and the resolver's
     own unit test (`workspace-reach.test.ts`) imports it. Change "Each would skip such a module" to apply to the three.
  2. Replace "every option changes what the guards refuse on some tree" with "every option but D".
- Evidence freshness: `41932c3b`, `6df4e623` (OPEN) and `58e8f604` (OPEN), re-read this round. npm's link behaviour for a bare
  directory spec was not probed: the packet's [Observed] there rests on the testkit comment (`:67-69`) and the #541 raw §3.5,
  not on a run.

#### Evidence for syzygy-bpyt.1.17 (round 2)

1. [Observed] The census.
   - Method 1: `python3 -I r2/census.py 41932c3b 6df4e623 58e8f604`. It takes the root and `apps/*/package.json`,
     `packages/*/package.json` from `git ls-tree -r -z`, `json.load`s each, and reads `dependencies`, `devDependencies`,
     `optionalDependencies`, `peerDependencies`, `bundleDependencies`, `bundledDependencies` and `overrides`.
     - `41932c3b manifests 13 all tracked package.json 13`;
     - `unscoped non-root []`;
     - `fields {'dependencies': 10, 'devDependencies': 1}`;
     - `distinct specs 5 {'0.0.0': 24, '^26.2.0': 1, '^5.5.0': 1, '^3.2.0': 1, '2.9.0': 1}`;
     - the same at `6df4e623`, and at `58e8f604` with `'0.0.0': 25`.
   - Method 2: a regex over the raw text of every tracked `package.json`. It finds `11` dependency blocks, with `28`, `28` and
     `29` entries and the same five specs.
   - So the packet's "12 of 12 workspaces are `@syzygy/`-scoped", "13 manifests" and the five specs are true at every commit read.
2. [Observed] The importers of `workspace-reach.testkit`:
   - at `6df4e623`: `git-observation.test.ts`, `subpath-imports.test.ts`, `island-boundary.test.ts` and
     `workspace-reach.test.ts`;
   - at `58e8f604`: the last three.

   Of these, `reach(` and an `unresolved` assertion appear in:
   - `subpath-imports.test.ts:148`, `:171` ("`expect(unresolved).toEqual([])`");
   - `island-boundary.test.ts:40`, `:52`;
   - `6df4e623:git-observation.test.ts:145`, `:147`.

   `workspace-reach.test.ts`'s only `describe` is "the shared workspace resolver". It imports `ROOT`, `WORKSPACE`, `resolve`
   and `resolveIn`, and has no `reach(` call at either commit.
3. [Observed] `LOCAL_VERSION` (`41932c3b` `:70`; its doc comment is `:59-69`) is `/^(?:file:|link:|workspace:|npm:|\.\.?(?:\/|$)|\/|~\/)|\.(?:tgz|tar|tar\.gz)$/iu`.
   - It does not match `packages/polaris-dossier/`, and none of the five live specs.
   - `localNames` reads four fields (`:76`).
   - The #541 raw `:353-355` reads both closures as needing a GP-Q0 ruling (raw sha256 `dd2a4517…`), as the packet cites.

#### Notes for syzygy-bpyt.1.17 (not material)
- N1. A's implementation should name the fields it reads. `localNames` reads four. npm's `overrides` also takes a spec, and an
  override to a directory would link local code under a name that the resolver reads as outside. [Unknown] Whether npm links a
  directory override was not probed. No manifest has `overrides` at any of the three commits (evidence 1). Include
  `overrides` in A's predicate, or name it as a residual.
- N2. A must not add `semver`: the boundary excludes adding a dependency. Use a closed list of spec shapes (exact `X.Y.Z`, and
  `^` and `~` ranges, which covers the five live specs), plus the `LOCAL_VERSION` forms. A then also refuses registry tags and
  git specs. That fails closed, and the cons should say it.
- N3. The preface's evidence snapshot names #540's head but not #541's `58e8f604`, which 1.17 reads. Also, `LOCAL_VERSION`
  is declared at `:70`, and the packet's `:59-69` is its doc comment. The packet's other testkit citations (`:32`, `:97-98`,
  `:117-121`) hold.

### Cleanup and kept files
No scratch clone was made this round, and none remains from round 1. These files are kept under the coordinator scratchpad's
`vet-gp/`:

| File | sha256 |
|---|---|
| `r2/mcc.ts` (copy of the `41932c3b` profile blob) | `a02c105a483d11a9e90d27aade01ef5ddee6b60b9e165a9a7193c5baaa21f8fe` |
| `r2/span-probe.mjs` | `418750cb515a8b718e6a2f3f5f112bd37b860b946c7d6675d4ec5ee57427a403` |
| `r2/table-probe.mjs` | `18df669912502b6527cafc5763bb060cc6d64d0e37381fb03024e6dcbc1cb7c5` |
| `r2/link-probe.mjs` | `7564d16cfc49a3249cad1d998dd83be8613d0cb6f4eba65515344dc037f97687` |
| `r2/census.py` | `66b3cdbda877e27eef99a454e936eef6742609de70c17bd66feaeae4f0f17529` |

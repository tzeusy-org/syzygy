# VET-GP-FOLLOWUPS-3 — round 3 vet of syzygy-bpyt.1.15, 1.16 and 1.17

- Subject: `/home/tze/.tmp/user-questionnaire/syzygy-2026-10-27-gp-followups/packet.md`. I re-derived its sha256 by
  `sha256sum`: `0968c3fd641cbda1fe49e9b75f6b86c63e05bf57a4d4eb9e95e5850a63cf6026`, 267 lines, matching the brief.
- Prior rounds:
  - `VET-GP-FOLLOWUPS-1.md`, sha256 `bb29a17ba85049e2bf445f3d111036a3a6b21355c4ae1e0883a29972f3c2b189`;
  - `VET-GP-FOLLOWUPS-2.md`, sha256 `91a9683c0b45d3aa45694ab2445867e0ce3c085324a98c3e7571796050849203`.
- Refs, re-read at write time [Observed]:
  - `origin/main` is `973965a8`;
  - #540 is MERGED as `973965a8` (parents `41932c3b` and `6df4e623`). The trees of `973965a8` and `6df4e623` are both
    `94acf08541bd4ddb049fe4c11510935062bfb928`, so the preface's identity claim is true;
  - #541 is OPEN at `58e8f604`.
- The reader, profile, testkit and guard files are byte-unchanged from `41932c3b` to `973965a8`: `git diff --stat` over
  - `project-shape-manifest.ts`, `project-shape-extraction.ts`, `markdown-code-context.ts` and `project-shape-observation.ts`;
  - the PWB `spec.md`;
  - `workspace-reach.testkit.ts`, `workspace-reach.test.ts`, `island-boundary.test.ts` and `subpath-imports.test.ts`;

  prints nothing.
- Rules kept: read only; no observed-repository body; no credential file; no bd mutation (`bd show` only); no scratch clone.
  - Disclosure: one `git fetch -q origin main` in the main checkout, to resolve `973965a8`. It moved the remote-tracking ref
    `origin/main` and `FETCH_HEAD`, and touched no tracked file or worktree. `git status` there shows the same two untracked
    files as at session start.
  - Source for the reader probes: a `git archive 973965a8` of three `src` trees, extracted into the scratchpad, run, and then
    deleted.

| Item | Scope | Recommendation |
|---|---|---|
| `syzygy-bpyt.1.15` | Pass | Revise |
| `syzygy-bpyt.1.16` | Revise | Pass |
| `syzygy-bpyt.1.17` | Pass | Revise |

Every material correction below gives exact replacement text. Old text is quoted exactly from the packet at `0968c3fd`.

### syzygy-bpyt.1.15
- Scope verdict: Pass. Round 2's corrections are applied:
  - the cross-block background bullet;
  - C narrowed to fences in all three readers and spans only in the link reader;
  - D added for the literal reading;
  - the CRLF reach set to three readers;
  - the refactor and its byte-identical differential, in C's cons and the boundary;
  - N1, N2 and N3.

  One sub-bullet misdescribes the vet's link probe (M1). It is a factual error, and its fix is one line, so I file it under
  Recommendation to keep this item's round 4 to three sentences. Taken alone, the scope is sound.
- Recommendation verdict: Revise. C is now the right shape, and the real readers confirm it on the probe texts (evidence 1).
  - Under C's rules the extractor and the table reader read all three items, the heading and all three pillar roots, as today.
  - Under the profile's spans every link vanishes, which is the named residual.
  - The profile's fence decisions do not depend on its span state on any well-formed text (evidence 3), so "fences by the
    profile's grammar" without spans is well defined.

  Three sentences are false:
  - D's `{principle: 2}`, a figure I introduced in round 2: the real extractor gives `{principle: 1}` (M2);
  - the link-probe paraphrase (M1);
  - the recommendation's clause basis for the table reader, which cites the extractor's clauses (M3, rule 8).
- Material corrections (exact text; each old string occurs exactly once in the packet at `0968c3fd`):
  - M1. Background, fourth sub-bullet of "The profile's span rule crosses blocks".
    Old:
    ```text
    - two index links two blank lines apart, which today's link reader keeps.
    ```
    New:
    ```text
    - two adjacent index links in a list, between stray backticks in the paragraphs before and after it, which today's link reader keeps.
    ```
    Why: in `r2/link-probe.mjs` the links are on adjacent lines; the stray backticks sit in the paragraphs either side, each one blank line from the list.
  - M2. Option D, cons.
    Old:
    ```text
    The extractor then reports the smaller set as complete (`{principle: 2}` where a reader sees three), or fails as `missing-heading`;
    ```
    New:
    ```text
    On the vet's list probe the span hides item 2 wholly and item 3's marker, so the extractor reads item 3's remainder as a continuation of item 1 and reports `{principle: 1}` as complete where a reader sees three; a hidden heading fails as `missing-heading`;
    ```
    Why: evidence 1 and 5 (`extractClass` on the masked text returns `"kind":"items"` with one item). The figure 2 was round 2's error.
  - M3. Recommendation, second paragraph.
    Old:
    ```text
    For the extractor and the table reader, `:142-145` names only "fenced code" and `:167-168` leaves its recognition "to the observer", so the profile's fences are enough.
    ```
    New:
    ```text
    For the extractor, `:142-145` names only "fenced code" and `:167-168` leaves its recognition "to the observer", so the profile's fences are enough. No clause states the root-index table reader's rule (the fence-rule record's reader 3: `no-clause-states-the-rule`); its `Directory` cell is itself a code span, read cell by cell, so it takes the profile's fences and keeps its own per-cell span.
    ```
    Why: `:142-145` and `:167-168` sit in PWB-REQ-002's nine-shape grammar; the pillar table is read by `rootIndexPillarRoots` in the manifest, and the dc3 record's reader 3 (`stripFences`, call sites `:200` and `:287`) is `governedBy` the plan and a code comment only, verdict `no-clause-states-the-rule` (evidence 4). Rule 8.
- Evidence freshness: `973965a8`, whose reader files equal `41932c3b`'s.
  - The readers were run on the probe texts from a `git archive` of `973965a8`.
  - "Under D" is proxied by giving the reader the profile's masked text. That proxy is faithful for the extractor and the
    link reader, and not for the table reader (evidence 2).
  - Not inspected: the renderer; any live source [Unknown].

#### Evidence for syzygy-bpyt.1.15 (round 3)

1. [Observed] `node --import ./register.mjs r3/extract-probe.mjs` and `r3/reader-probe.mjs` run the real `973965a8` readers
   (Node v24.6.0, type stripping, and a resolve hook mapping `.js` to `.ts`):
   - list probe: today `"items":[…"First."…,"Second."…,"Third."…]`; masked `"kind":"items",…"items":[{…"key":"First."…}]`;
   - heading probe: today one item, `First.`; masked `{"kind":"failed","failure":{"reason":"missing-heading",…}}`;
   - link probe: `linksToday: ["vision.md","rules.md"]` and `linksMasked: []`;
   - table probe, with a third pillar row added: `tableToday` has all three roots; `tableMasked: []`.

   On these fence-free texts, C's extractor and table reader (profile fences, no spans) read exactly what today's readers read,
   so C's pro "keep reading structure across stray backticks" holds, and C's link residual is real.
2. [Observed] The table proxy over-blanks. The mask also blanks every legitimate `Directory` code span, so every row fails,
   including rows no stray backtick touches. A recognizer-based reader under D would keep the cell text, and drop only the row
   whose delimiters were re-paired. So D's existing sentence, "`rootIndexPillarRoots` skips the broken row
   (`project-shape-manifest.ts:304`)", is the right model, and I do not correct it. A note: the root also survives if a
   root-index link declares it (`declaredPillarRoots`, `:370-378`).
3. [Observed] In `markdown-code-context.ts` (`r2/mcc.ts`, the `41932c3b` blob, unchanged at `973965a8`), a fence opener line is
   checked before the inline scan. A fence opener while a span is open returns `malformed: unclosed-inline-span`. So on every
   text the profile reads as well formed, its fence positions are independent of span state, and a fences-only use of its
   grammar matches the mask's fences. Every body the extractor and the phase-A readers see is profile well formed:
   - `git-object-reader.ts:368-369` returns `active-content` on any finding, including `malformed-code-context` (`:194-195`);
   - `project-shape-observation.ts:448-458` classifies seeds before link discovery.
4. [Observed] `973965a8:docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json` `readers`:
   - reader 2 (extraction) has `governedBy` `spec.md` `[142,145]` and `[167,168]` plus the plan;
   - reader 3 (links: `stripFences`, call sites `[200, 287]` "via indexLinkTargets (inline code removed) and
     rootIndexPillarRoots (inline code kept)") has `governedBy` `docs/PWB-IMPLEMENTATION-PLAN.md` `[129,133]` and a code
     comment, with `"verdict": "no-clause-states-the-rule"`.
5. [Observed] `r3/list-mask.mjs` prints the masked list text. Item 2 becomes all spaces, and item 3 becomes
   `"                 z"`, an indented line, which `topLevelListItems` (`project-shape-extraction.ts:221`) takes as a
   continuation (`/^[ \t]+\S/`).

#### Notes for syzygy-bpyt.1.15 (not material)
- N1. "N4 is carried to `syzygy-bpyt.16`": its comments at read time hold no N4 entry. Its 03:40 comment already covers the
  substance ("Record the bare-CR split difference against the extraction and link readers … Note it for G2/G3"), so nothing is
  lost. Under C, the "covers these three readers" pro holds only if C's readers also take the profile's line split, which
  that comment flags.
- N2. The discovery-version paragraph's "C brings the readers into line with `:798-801` and `:810-811`" reads more exactly as
  "C brings every reader's fences into line with `:810-811` and the link reader into line with `:798-801`". That is consistent
  with offering D as the literal reading.
- N3. C's residual names hidden links. In the root index, a hidden link can also drop a link-declared pillar home, or clear an
  ambiguity that today keeps phase A from admitting a home (`declaredPillarRoots`, `:377-378`). So the residual moves phase-A
  admission either way. C's first con already says admissions change, and the residual sentence could say so too.

### syzygy-bpyt.1.16
- Scope verdict: Revise. Round 2's corrections are applied truly:
  - C's four build changes;
  - the restart residual, in the background and the boundary;
  - `references` followed transitively;
  - the build step read from `poc`;
  - the 18-module bullet, verified at `973965a8`;
  - #540 landed at `973965a8`, with its six prefixes at `git-observation.ts:182-187`.

  One new sentence is false. The restart bullet says "Every option closes the `npm run poc` path the counterexamples use". A
  leaves the generation-package plant open, which is its own row's con, and C closes it only once its four changes land. Round
  2's N1 said "B closes".
- Recommendation verdict: Pass. B's row is now exact:
  - the population is read from `poc`, follows references transitively, and includes the import closure;
  - "Today this population is exactly the eight projects" is true (round 2, evidence 2);
  - "no build change" is true;
  - C is costed honestly, at four changes with a project split.

  The recommendation traces to VIS-2 and the gate's purpose, and leaks no authority. One note (N1) refines C's cost.
- Material corrections (exact text; the old string occurs exactly once):
  - M1. Background, the restart bullet.
    Old:
    ```text
    Every option closes the `npm run poc` path the counterexamples use.
    ```
    New:
    ```text
    B closes the `npm run poc` path the counterexamples use; A leaves its generation-package plant open, and C closes it only once its four build changes land. No option closes the restart path.
    ```
- Evidence freshness: `973965a8` (tree equal to `6df4e623`), re-read: `package.json` scripts, the gate, the guard
  (`git-observation.test.ts:145`, `:147`) and the generation imports. No build or daemon run.

#### Notes for syzygy-bpyt.1.16 (not material)
- N1. C's project split is entangled both ways [Observed at `973965a8`]:
  - the daemon path reaches `src/polaris-generation/isolated-git.ts` through `git-blob-batch.ts:10`, which
    `governance-inputs.ts:19` imports;
  - generation modules import the app's `../design-tokens.js` (`dossier-site.ts`, `draft-preview.ts`) and
    `../git-blob-batch.js` (`repo-corpus.ts`, `self-corpus.ts`).

  `polaris-generation/` holds 26 non-test modules, not 18. So "moving the app's 18 … modules and their operator entries"
  understates the split: the new project needs those shared modules too, or a reference back into the app.
- N2. B's "the eight projects named here": B's own text names three of them, and the other five are the background's prefixes.
  "the eight projects: the six prefixes above and the two generation packages" reads without a lookup.

### syzygy-bpyt.1.17
- Scope verdict: Pass. Round 2's corrections are applied truly:
  - the three `reach` guards are named apart from the unit test;
  - at `973965a8`, the three `unresolved` assertions are at `island-boundary.test.ts:52`, `subpath-imports.test.ts:171` and
    `git-observation.test.ts:147`;
  - `workspace-reach.test.ts` has no `reach(`;
  - "every option but D";
  - the preface names #541's head;
  - `LOCAL_VERSION` is at `:70`.

  One decision, with its gate basis argued.
- Recommendation verdict: Revise. A is still the right choice, but its newly widened predicate admits the form it was widened to
  catch. A allows "a form `LOCAL_VERSION` recognizes" in `overrides` too. `localNames` reads only `dependencies`,
  `devDependencies`, `optionalDependencies` and `peerDependencies` (`workspace-reach.testkit.ts:76`). So an override such as
  `"foo": "file:packages/x"` passes A, while the resolver still reads `foo` (declared elsewhere with a registry range) as
  outside the workspace, and every guard skips it. [Unknown] Whether npm links a `file:` override, as the packet says. Either
  way, A should fail closed there. The cons also say "it is the only way to cover them without a semver parser", which is an
  overclaim: a hand-written range grammar is another way.
- Material corrections (exact text; each old string occurs exactly once):
  - M1. Option A, option cell.
    Old:
    ```text
    Every spec in every manifest's `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies` and `overrides` has one of a closed list of shapes: an exact `X.Y.Z`, a `^` or `~` range, or a form `LOCAL_VERSION` recognizes.
    ```
    New:
    ```text
    Every spec in every manifest's `dependencies`, `devDependencies`, `optionalDependencies` and `peerDependencies` has one of a closed list of shapes: an exact `X.Y.Z`, a `^` or `~` range, or a form `LOCAL_VERSION` recognizes. Every string value in `overrides`, at any depth, is an exact `X.Y.Z` or a `^` or `~` range only, because `localNames` does not read `overrides`.
    ```
  - M2. Option A, cons cell.
    Old:
    ```text
    It also refuses registry tags (`latest`), git specs and wider ranges, which is failing closed, and it is the only way to cover them without a semver parser. Whether npm links a directory given in `overrides` is [Unknown]; no manifest has `overrides`, and A refuses one that is not on the list.
    ```
    New:
    ```text
    It also refuses registry tags (`latest`), git specs, wider ranges and, in `overrides`, every local form and `$` reference, which is failing closed and needs no semver parser. Whether npm links a directory given in `overrides` is [Unknown]; no manifest has `overrides` today.
    ```
- Evidence freshness: `973965a8` and `58e8f604` (OPEN), re-read. The testkit is unchanged from `41932c3b`. npm's
  `overrides` behaviour was not probed.

#### Notes for syzygy-bpyt.1.17 (not material)
- N1. The first Background bullet is labelled [Observed], but npm's reading of a bare directory spec was not observed in this
  packet's evidence. It rests on the testkit comment (`:67-69`) and the #541 review, as the review record's own freshness line
  says. Label that sentence by its source.

### Kept files (coordinator scratchpad `vet-gp/`)
`r3/tree/` was extracted from `git archive 973965a8` and deleted after the runs. It can be regenerated with
`git archive 973965a8 packages/three-surface-poc-core/src packages/support/src packages/cap1-core/src | tar -x -C r3/tree`.

| File | sha256 |
|---|---|
| `r3/hooks.mjs` | `5009ecd82eefc5a53147afcfd37be2682c941e2727ae9fa692a23809adfac66f` |
| `r3/register.mjs` | `fc80499284aefe0066f7fb33791350c45efbf8b549eb09c25cdbd587054be92d` |
| `r3/extract-probe.mjs` | `b758c0cdcd5504254128697d6e0e2a90c2fc6fb638cf774573bf1a85d4c8708f` |
| `r3/reader-probe.mjs` | `b833f31317c102ecf41230ae7139c2da683ec69d464ea30c18038d3b2defc404` |
| `r3/list-mask.mjs` | `bda3417a86746218ade8ec88005acc6abb82dee7681ffb5c71c294312c77b625` |
| `r3/build_mc.py` (writes the exact-text blocks and asserts each old string occurs once in the packet) | `fb214ae87e1f37c1a333b9dec488a3e15438f6519cdf90ceabeaa7804b64e38f` |

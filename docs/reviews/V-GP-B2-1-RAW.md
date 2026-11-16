# V-GP-B2-1 — independent vet of owner packet GP-B2, draft 1
Verdict: READY WITH EDITS
Packet: PACKET-DRAFT-1.md sha256 5c50ba0f37a27862803124f4180c7e2e58192930cb814c78bcabf2590fe46dda
Items: Q1 EDIT, Q2 EDIT, Q3 EDIT, Q4 EDIT, Q5 EDIT, Q6 PASS, Q7 EDIT, Q8 REMOVE

Vetter: an independent subagent in fresh context, 2026-10-28. I did not draft the packet and changed none of its bytes.

## 0. Subject, references and method

- [Observed: `sha256sum`] The packet hashes to `5c50ba0f37a27862803124f4180c7e2e58192930cb814c78bcabf2590fe46dda`, the brief's
  value. Every line number below is a line of those frozen bytes.
- [Observed: `tools/check_evidence_digests.py`, output `out/evidence-digest-check.txt`] The packet lists 71 evidence files; all
  71 exist under `work/evidence/` and hash to the listed digests (71 ok, 0 mismatch, 0 missing). The directory holds 71 files, so
  none is unlisted.
- [Observed: `git ls-remote`, `git log`] `origin/main` is `b7bab8eb` (the packet's snapshot is `b10e4da9`). Between them the
  only product change is a two-line comment in `apps/three-surface-poc/src/polaris-generation/generation-mutation.ts` plus its
  test. PR #544 is at `561e4f77`; PR #545 at `ecea355b`.
- Method: three scratch clones (`main` at `b7bab8eb`, PR #544 at `561e4f77`, and a throwaway plant clone at `b7bab8eb`), each
  with `npm ci` and a build, Node v24.6.0, private TMPDIR `/tmp/vgpb2-1`. Every input was synthetic or a tracked Syzygy file. No
  body of Butlers or of any other observed repository was read, no daemon was pointed at one, and no bd mutation ran (beads were
  read with `bd show` and `bd comments` only). Clones and TMPDIR are deleted (section 10).
- Engineering bar: `.claude/skills/th-engineering/subskills/engineering-bar/SKILL.md`. Every line range the packet cites for a
  bias or done-criterion matches (bias 1 `:52-58`, 2 `:59-63`, 3 `:64-66`, 4 `:67-70`, 5 `:71-73`, 6 `:74-77`, 7 `:78-83`,
  "Regression protected" `:106-107`) [Observed, by reading]. So do CC-OBS-1 `observability-and-operations.md:17-41`, CC-OBS-4
  `:82-97`, CC-TEST-1 `testing-and-verification.md:15-29` and CC-TEST-6 `:156-173`.

---

## Q1 — very long closed fence (`syzygy-bpyt.1.18`): EDIT

**1. Owner question?** Yes. GP-Q0 `:52-53` makes "an exit code" part of what a behavior-preserving change may not move, and the
fix turns a crash into accept-or-refuse decisions that no Part 3 row lists, so "Any change not listed here to what a gate accepts or
refuses stops and returns to the owner" (`:95-96`) applies. Only A conforms to the profile, so the answer is close to forced, but
the exit-code change and the PR #544 window are the owner's to see.

**2. Problem stated truly?** Yes for the fence; one sibling is missing.
- [Observed: my own `tools/vet-q1-trace.mjs`, independent of the drafter's tool: own fixture tree, own `runGit`, `main()` of
  `apps/three-surface-poc/dist/poc-main.js` with injected deps; outputs `out/vet-q1-trace-*.json`] A closed backtick fence of
  150,000 one-character lines:
  - at `main` `b7bab8eb`: LF throws `RangeError` in the mask, the scan, the object reader and `buildProjectShape`; `main()`
    returns 1 without serving, stderr exactly `syzygy POC: observation failed (unexpected observation failure (RangeError))`;
    `POST /polaris/reobserve` answers 502 with "Unknown — Maximum call stack size exceeded. The prior complete evaluation remains
    served.", and `/polaris` stays 200. CRLF and CR do not throw: the mask reports `fences 0, spans 1`, that is, the fence lines are
    not fence openers on `main` and the backticks are read as an inline span, so the text is admitted and the daemon serves.
  - at PR #544 `561e4f77`: LF, CRLF and CR all throw at every one of those surfaces; start exits 1 and re-observe answers 502 for
    all three.
  - with option A applied to the PR #544 build (the one spread replaced by a loop): all three line ends are masked as one fence,
    read, observed, served, and re-observe answers 200 (`out/vet-q1-trace-pr544-561e4f77-loopfix.json`).
- [Observed: `tools/vet-q1-loop-differential.mjs`] Option A against the unpatched PR #544 mask over every `git ls-files` path that
  decodes as UTF-8: 6,641 text files of 6,652 tracked, 0 outputs moved. 150,000- and 200,000-line rows in LF, CRLF and CR all go
  from a throw to `masked`; a script inside the fence stays masked, a script after it is visible to the scan.
- [Observed: `tools/vet-q1-depth.mjs`] Smallest throwing LF fence: 125,553 lines at the top of the stack, 100,750 lines 2,000
  frames deep. The packet's 125,534 and 103,535 are the same effect in another harness; "about 125,000" and the depth dependence
  hold.
- [Observed, by reading] The scan has six call sites in five files (option B's count); `git-object-reader.ts:363-365` rethrows
  anything but the parse-budget error; `http-host/src/server.ts:278-287` turns a handler throw into HTTP 500 `handler-failure`.
  The dossier rows stay [Inferred], as the packet labels them; `apps/syzygy/src/main.ts:286` is `process.exitCode = await main();`
  and `syzygy dossier …` reaches `runDossierCli` at `:172-185`.
- **Missing sibling.** [Observed: `tools/vet-q1-sibling-stack.mjs`, `out/vet-q1-sibling-stack-main.json`] The project-shape
  extractor makes the same one-call push for a source's items (`all.push(...result.items)`,
  `packages/three-surface-poc-core/src/project-shape-extraction.ts:647`, the same at PR #544). A synthetic `vision.md` of 862,162
  bytes (under the 1,048,576-byte per-source limit) with 130,000 success-criterion list items throws `RangeError` at that line, and
  `buildProjectShape` throws with it; 1,000 items extract normally (`out/vet-q1-sibling-spread-main.json`). It has no fence, so
  option A as written does not reach it, and PR #544 leaves that line unchanged. I ran it with LF line ends only; CRLF and CR were
  not run [Unknown].
  A sweep of shipped code (`out/vet-q1-spread-sweep-b7bab8eb.txt`: Python `re`
  `\.(push|unshift|splice)\(\s*\.\.\.|Math\.(max|min)\(\s*\.\.\.|String\.fromCharCode\(\s*\.\.\.|\.apply\(` per line over the 256
  non-test, non-`.d.ts` files under `packages/*/src` and `apps/*/src`) finds 32 such calls; these two are the only ones on the
  observation read path over one source's text. Others sit over repository-size inputs in the dossier pipeline (for example
  `repo-corpus.ts:246`, `discovery.ts:283`); whether any is reachable with an input that large is [Unknown].

**3. Scope.** One decision. The "PR #544 waits" sentence is an optional second choice, clearly defaulted, which is acceptable. What
the owner also needs: the extractor sibling (same decision, crash or read), and that it exists today.

**4. Recommendation.** A is sound: the profile reads a closed fence as inert at any length (`spec.md:816`), the fix is the smallest,
it fails no differently from a short fence, and it removes a dependence on stack depth. Bias 4 (`SKILL.md:67-70`) argues for fixing
the defect class, not one line, so A should cover the identical extractor call. The CC-OBS-1 citation ("no ambient inputs") is an
analogy, since stack depth is not in its list; the spec clause and bias 4 carry the recommendation without it.

**5. Readable cold?** Mostly. Undefined: "today's CRLF departure" (table, line 82); "the dossier screen" (line 88; the screening
step); "the project-shape extractor" is first defined in Q2. "One such file ... crashes the dossier command" (lines 71-72) states
as fact what the table labels [Inferred].

**6. Follow-through.** Stated for A (bead, PR, review, GP-Q0 checks). Not stated for B, C or D; see W1.

**Replacement texts.**

E1.1 — replace lines 66–67 with:
~~~text
**The decision.** When a text holds a closed fence of more than about 125,000 lines, or a source holds more than about 100,000 list
items, should Syzygy read it like any shorter text (A), refuse the source with a new named reason (B), refuse above a declared
length limit (C), or keep today's crash (D)?
~~~

E1.2 — replace lines 69–73 with:
~~~text
**What is at stake.** The mask hands every line of a closed fence to one JavaScript call at once
(`out.push(...pending.map(blank))`, `packages/three-surface-poc-core/src/markdown-code-context.ts:91`). Past about 125,000 lines
that call overflows the engine's stack and throws a `RangeError`, which nothing catches. One such file stops the POC daemon from
starting and [Inferred from the code, not run end to end] crashes the dossier command. Today only files with LF line ends crash.
PR #544 carries your CRLF ruling (bead `syzygy-bpyt.1.14`): CRLF and CR files are read like LF files, so they crash the same way.
The project-shape extractor (the reader that turns a Butlers document into items, such as the numbered principles in `vision.md`)
makes the same one-call push for a source's items, so a very long list crashes the project shape too, today, in an LF file;
PR #544 does not touch that call.
~~~

E1.3 — in line 82, replace `read as code [by today's CRLF departure, which #544 removes]` with:
~~~text
read as code: on `main` a fence line ending in CR is not a fence opener, so the backticks open an inline span instead (the CRLF departure PR #544 removes)
~~~

E1.4 — insert after line 97:
~~~text
- [Observed by the vetter, V-GP-B2-1 `vet-q1-sibling-stack.mjs`, at `b7bab8eb`] The extractor's identical call
  (`all.push(...result.items)`, `packages/three-surface-poc-core/src/project-shape-extraction.ts:647`, unchanged by PR #544) throws
  the same `RangeError` for a synthetic `vision.md` of 862,162 bytes, under the 1,048,576-byte read limit, holding 130,000 list
  items, with LF line ends; the project shape throws with it. That text holds no fence, so the mask fix alone does not reach it.
  [Unknown] with CRLF or CR line ends (not run), and whether any Butlers source holds that many items.
~~~

E1.5 — replace lines 104–106 with:
~~~text
- **A. Read it by the profile.** Replace the one call with a loop that pushes one blanked line at a time, and do the same at the
  extractor's identical call (`project-shape-extraction.ts:647`). *Changes:* a closed fence of any length is masked and a list of
  any length is extracted; the daemon starts and the dossier runs. *Costs:* two lines, plus a 200,000-line fence test in LF, CRLF
  and CR and a long-list test under the read limit. *Accepts* texts that crash today, with the decision a shorter fence or list
  would get. *Refuses* nothing new.
~~~

E1.6 — insert after line 113:
~~~text
B, C and D apply to the extractor's list the same way.
~~~

E1.7 — replace lines 123–128 with:
~~~text
**If you answer A, the agents will** carry out step 2 of `syzygy-bpyt.1.18` as its own pull request, right after PR #544 merges
(PR #544 moves the mask's line to `:119`, and a separate PR keeps #544's round-2 review valid). It holds both loops (the mask's and
the extractor's), the 200,000-line fence tests in LF, CRLF and CR, a long-list test under the read limit, a mutation per site that
restores the old call and must make its test fail, and this differential re-run at the PR's head. It gets an independent CC-REV-1
review (class 4, security; the reviewer may add class 3, deterministic observation), GP-Q0's three extra checks (`:61-66`: a
differential, one mutant per predicate, an owner notice in the cycle report bead `syzygy-bpyt.10`). The agents also file one bead
to check the other 30 argument-spread calls in shipped code for inputs that grow with an observed repository; any fix that turns a
crash into a decision comes back to you. If you want no window in which CRLF and CR files crash on `main`, say so, and PR #544
waits for this one.
~~~

E1.8 — replace lines 130–131 with:
~~~text
**Can it wait?** For fences, until PR #544 merges, at no cost on any file I could check; after that, every line ending crashes. The
extractor's list crash exists today in LF files and does not depend on PR #544. Meanwhile today's code stands.
~~~

---

## Q2 — fence departures G2 and G3 (`syzygy-bpyt.1.15`): EDIT

**1. Owner question?** Yes. C changes what phase A's read allowlist admits and what the extractor and manifest report, so `:95-96`
applies; it also contradicts the candidate text of P-112, an act only the owner performs.

**2. Problem stated truly?** Yes.
- [Observed: my own `tools/vet-q2-g2.mjs` at `b7bab8eb`, a different text from the drafter's: four principles, the fence between
  the first and second, closer indented 0, 1, 2 and 3 spaces; through `extractSource` and through `buildProjectShape`] With the
  closer at column 0, the extractor reports `{"principle": 4}` and the shape holds 4 principle items. With 1, 2 or 3 spaces of
  indent, which the profile allows, the extractor reports `{"principle": 1}` (key `Alpha` only), the shape holds 1 principle item,
  and `vision.md` is `classified` with an `Observed` claim. The profile masks one closed fence and leaves all four items visible.
  So the partial set reaches the shape as an Observed, complete-looking claim.
- [Observed, by reading] `project-shape-extraction.ts:14-17`, `vision.md:133` (VIS-2), `spec.md:142-143`, `:167-168`, `:798-801`,
  `:810-826` and `PENDING-OWNER-DECISIONS.md:1344` (P-112's row, "ready for decision since 2026-10-15", owner left it unticked
  2026-10-15) say what the packet quotes, with one exception: the quoted words "each keep their own rule for fence indentation and
  closing" are not in the register row. They are in P-112's proposed registry patch,
  `.syzygy/governance/contracts/candidates/pwb-registry-loaded-profile-amendment/proposed/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json.patch:316`.
- G3 not re-run (not required); the drafter re-ran the PR #533 reviewer's probe.

**3. Scope.** One decision over three readers and two rules. The grid omits "profile fences everywhere, keep the link reader's own
span rule"; that variant keeps code-minted links against `spec.md:798-801`, so leaving it out is defensible. Missing for the owner:
**C opens a new silent drop.** Today's link reader removes code spans one line at a time (`line.replace(/`[^`]*`/g, '')`,
`project-shape-manifest.ts:190`), so two stray single backticks on different lines hide nothing. The profile's span runs across
lines, so under C they make every link between them code. [Observed: `tools/vet-q2-stray-backticks.mjs`, the link reader run over
the text and over the profile's mask, which models C's reading of links] An index with one stray backtick before three links and
one after: today 3 links; through the profile 0; the active-content gate admits the text (0 findings). The packet calls this "One
residual stays", but it is new under C: today those links are read (which the specification forbids), and under C they drop
silently.

**4. Recommendation.** C remains the best of the four as recorded: it ends the observed hides and the code-minted links, takes only
what each reader's clause asks for, and needs no new failure reason. It is not fully fail-closed (AGENTS.md "Fail-closed polarity";
bias 6, `SKILL.md:74-77`), because of the stray-backtick drop above. B is the fail-closed option and costs a specification
amendment and an Unknown where C reads correctly. The owner should see that trade in so many words, and be able to ask for the
signal on that shape as a follow-on question; E2.4 and E2.5 give the text. No change of recommended letter is needed.

**5. Readable cold?** The hardest item; about four minutes. Undefined or jargon: "recognizer" (line 185), "code-minted links"
(lines 185, 195), "phase B" (line 164), "the root-index reader" (line 183; it reads the root index's pillar table, defined only in
line 161-162), "malformed decisions" (line 206). Bare identifiers that need the repository: `declaredPillarRoots`,
`admitPhaseARead` (fine as citations).

**6. Follow-through.** Stated for C, with the AGENTS.md bullet (`:204-212`, verified: line 212 says "G2 and G3 are open owner
questions"), the `fence-rules.test.ts` rows (`:197`, `:230`, verified) and the evidence addendum. Not stated for A, B or D; see W1.

**Replacement texts.**

E2.1 — replace lines 164–165 with:
~~~text
  any change here also changes which index files phase A reads, and so which files the second phase (**phase B**, the reads of the
  files those indexes name) reads, always within the existing read authority.
~~~

E2.2 — replace lines 166–167 with:
~~~text
- [Observed] P-112, a registry amendment ready for your decision since 2026-10-15 (you chose to wait; register row
  `PENDING-OWNER-DECISIONS.md:1344`), says in its proposed registry text that the two readers "each keep their own rule for fence
  indentation and closing" (`.syzygy/governance/contracts/candidates/pwb-registry-loaded-profile-amendment/proposed/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json.patch:316`).
~~~

E2.3 — replace lines 183–189 with:
~~~text
- **C. Share the fence rule; share the span rule only where links are read.** The extractor, the link reader and the root-index
  reader (which reads the root index's pillar table) recognize fences by the profile; the link reader also recognizes the profile's
  code spans. Each uses the profile's **recognizer** (the code that finds where each fence and span starts and ends), never its
  mask. *Changes:* the hides go, and so do links read from inside code ("code-minted" links). *Costs:* extraction, the manifest and
  phase-A admissions change on the affected shapes; the profile's module must expose a recognizer beside its mask and show the mask
  unchanged byte for byte. One silent drop is new: the profile's code span runs across lines and paragraphs, so two stray single
  backticks around a list of links make those links code. Today the link reader reads them as links, which the specification
  forbids (`spec.md:798-801`); under C they drop with no signal [Observed by the vetter, V-GP-B2-1 `vet-q2-stray-backticks.mjs`:
  three links today, none through the profile, and the gate admits the text]. Making that shape Unknown instead needs a new failure
  reason, a specification amendment, so it would come back to you as its own question. P-112 cannot be performed at its current
  bytes.
~~~

E2.4 — in line 197, insert after the sentence "D spreads the cross-paragraph span hide to items and headings.":
~~~text
C does not fail closed on one shape, the stray-backtick drop in its costs; it is recommended anyway because that shape occurs in no
file I could check, while B would turn every disagreement, including the correct G2 reading, into Unknown.
~~~

E2.5 — insert after line 212 (the end of the "If you answer C" paragraph):
~~~text
If you also want the stray-backtick drop signalled, answer "C, and signal the stray span"; the agents then bring the new failure
reason back to you as its own specification packet before that part is built.
~~~

---

## Q3 — observer-input gate's protected list (`syzygy-bpyt.1.16`): EDIT

**1. Owner question?** Yes. B adds refusals to a gate (`:95-96`).

**2. Problem stated truly?** Yes.
- [Observed: `tools/vet_q3_plant.py` and `tools/vet-q3-gate.mjs` in a throwaway clone of `b7bab8eb`; outputs
  `out/vet-q3-baseline.json`, `out/vet-q3-planted-generation-core.json`] After a clean `build:poc`, the gate reports the tree clean
  and the built `escapeHtml('<script>')` is `&lt;script&gt;`. With `packages/polaris-generation-core/tsconfig.json` pointed at
  `../http-host/dist` (including the testkit the app's tests import) and one untracked `src/escape-html.ts` without the `<`
  replacement, `npm run build:poc` exits 0, the gate reports the tree clean over six changed paths, and the daemon's built
  `escapeHtml('<script>')` returns `<script&gt;`. A first attempt that left the testkit out of the planted project made
  `build:poc` exit 2 and still wrote the weakened file; I discarded it, re-ran the clean build and planted again.
- [Observed: a Python walk of the tsconfig `references` from `build:poc`'s seven named projects] Eight projects are compiled; six
  have a prefix; the two without are `packages/polaris-generation-core` and `packages/polaris-generation-consent`. The two packages
  hold 72 tracked files. The `cap1-daemon` plant and the restart path were not re-run.

**3. Scope.** One decision. Missing for the owner: under B the list must equal a derived set, so a later build change moves the list
without a gate question of its own. `syzygy-bpyt.28` (drop `cap1-daemon` from `build:poc`; its description makes it an exit-code
change, so it returns to the owner) would then also drop that prefix and its 17 tracked files (at `b7bab8eb`) from refusal. The
owner should know that answering `.28` later decides both.

**4. Recommendation.** B is sound: it refuses more and accepts nothing new (fail-closed), it is the smallest change that closes the
observed hole, and a derived equality test beats a hand list (bias 5, `SKILL.md:71-73`; bias 6, `:74-77`). The cost to the owner's
own workflow (uncommitted edits to the generation packages block `npm run poc`) is stated.

**5. Readable cold?** Yes, about two minutes. `cap1-daemon` and "operator commands" are bare but inferable.

**6. Follow-through.** Stated for B; the restart residual is named but no bead is promised ("a separate bead", line 243, with no
owner). Not stated for A or C; see W1.

**Replacement texts.**

E3.1 — replace lines 254–258 with:
~~~text
- **B. Protect every project the daemon's start compiles or loads.** Add the two generation packages; keep `cap1-daemon/` while
  `build:poc` builds it. Replace the current test with one that derives the population (the projects of the build step the `poc`
  script runs, every project their tsconfig references reach, and the import closure) and requires the list to equal it.
  *Changes:* both observed edits are refused. *Costs:* an uncommitted edit to a generation package blocks daemon start, as edits
  to the app's own generation modules already do. *Refuses* more; accepts nothing new. Because the list must equal the derived set,
  a later build change moves it: when `syzygy-bpyt.28` drops `cap1-daemon` from the build (its own question for you, since a broken
  `cap1-daemon` would then no longer fail `npm run poc`), that prefix and its 17 tracked files leave the list in the same change, so
  answering that question decides both.
~~~

E3.2 — replace lines 271–272 with:
~~~text
owner notice. `build:poc`, the tsconfig references and the three root files stay as they are; `syzygy-bpyt.28` stays its own
question; the restart path is named as a residual in the record, and a bead is filed for it; any fix that makes a restart refuse
comes back to you.
~~~

---

## Q4 — unscoped workspaces and the import guards (`syzygy-bpyt.1.17` with PR #545 N5): EDIT

**1. Owner question?** Yes, but the packet's basis is thin and contradicts its own review line. A is test-only and changes no
product output, so on GP-Q0 `:52-55` alone an agent could add it. What makes it the owner's is that these guards are the test
evidence for two egress boundaries: the island guard (`island-boundary.test.ts:5-12`) keeps the `syzygy` command from loading the
parked provider code, and S10 proves the dossier run "must create no Internet-family socket at all" (PR #545 `no-egress.test.ts:13`
at `ecea355b`). CC-REV-1 class 4 is "anything under SEC-1…SEC-5, auth surfaces, egress paths"
(`review-and-documentation.md:37`), so a change to what that evidence accepts or refuses is a security decision (GP-Q0 `:55`) and
falls under `:95-96`. The packet instead says "The change is test-only, so no CC-REV-1 class is claimed" (line 328), and CC-REV-1
says class membership "is never finally determined by the agent performing the change" (`:45-46`). E4.3 and E4.4 align the two.

**2. Problem stated truly?** Yes.
- [Observed: my own `tools/vet-q4-unscoped.mjs`; output `out/vet-q4-unscoped.json`] On a synthetic tree with `packages/leak`
  (name `leak`) and `packages/scoped` (name `@syzygy/leak`), each with `index.js` at the package root and linked into
  `node_modules` by hand under its own name: the built resolver `resolveIn` at `b7bab8eb` returns `null` (outside the workspace)
  for `leak`, so a walk skips it. PR #545's `sourcesOnly` plugin, copied verbatim from `no-egress.test.ts` at `ecea355b`
  (`:47-63`) and run with esbuild 0.28.2, bundles `leak` from `packages/leak/index.js` with no refusal, and refuses `@syzygy/leak`
  with "@syzygy/leak resolves outside packages/*/src and apps/*/src: packages/scoped/index.js".
- [Observed: Python over the 13 manifests] 12 workspaces, 0 unscoped; 28 dependency entries, all exact or `^` versions (`0.0.0`
  ×24, `2.9.0`, `^26.2.0`, `^5.5.0`, `^3.2.0`); no `overrides`.
- [Inferred] That npm links an unscoped workspace under its own name is npm's workspace behaviour; neither probe ran npm.

**3. Scope.** One decision. Missing for the owner: A's rule ("No ... path") also settles the testkit's other named residual, a
dependency written as a bare directory (the testkit's examples: `packages/polaris-dossier/`, `.hidden-lib`, `a/b/c`), which npm
reads as a directory and the resolver reads as outside (`workspace-reach.testkit.ts:72-74`, `syzygy-bpyt.8.38`, "needs a GP-Q0
ruling first"). The follow-through updates "two
residual comments" but the owner is never told the answer closes two residuals. The summary row (line 21) also understates A.

**4. Recommendation.** A is sound: it fails on the PR that introduces either form whether or not a guard reaches it (bias 6), it
leaves both reviewed guards as reviewed (bias 2), and it refuses nothing present (28 of 28 fit).

**5. Readable cold?** Mostly. Undefined: "the island guard" and "the daemon-path guard" (line 288), "testkit", "N5".

**6. Follow-through.** Stated for A; review class needs the fix above. Not stated for B, C or D; see W1.

**Replacement texts.**

E4.1 — replace lines 287–289 with:
~~~text
`node_modules` under its own name, and Node loads it from there. Several tests guard which code a module can reach. Three of them
(the island guard, which keeps the `syzygy` command from loading the parked provider code; the daemon-path guard, which checks
what the `syzygy` command reaches when it starts the daemon rather than a dossier; and the observer-gate test of Q3) walk imports
with one shared resolver
(`packages/polaris-generation-core/src/workspace-reach.testkit.ts`). PR #545, still open, adds a fourth kind: the no-egress bundle
~~~

E4.2 — insert after line 311:
~~~text
  It also settles the testkit's other named residual: a dependency written as a bare directory, such as `packages/polaris-dossier/`
  or `a/b/c`, which npm reads as a directory and the resolver reads as outside the workspace (`workspace-reach.testkit.ts:72-74`,
  left open by `syzygy-bpyt.8.38` pending a GP-Q0 ruling). A refuses it as a path, so this one answer closes both residuals.
~~~

E4.3 — replace lines 325–329 with:
~~~text
**If you answer A, the agents will** open one bead under `syzygy-bpyt` for a test beside the testkit, with mutation rows for an
unscoped workspace, a `file:` dependency, a bare directory dependency and a path in `overrides`, each of which must fail it. It also
updates the testkit's two residual comments (`:72-78`) to name the test, and gives PR #545's N5 residual line (or a follow-up, if
#545 has landed) a pointer to it. The change is test-only; because the guards it backs are the evidence for the egress boundaries,
the pull request states CC-REV-1 class 4 and gets the independent review, GP-Q0's three extra checks and the owner notice (the
reviewer may drop the class if no security evidence moves).
~~~

E4.4 — replace lines 333–334 with:
~~~text
**Why it is yours.** It changes what the guards refuse, and these guards are the test evidence for two egress boundaries: the
`syzygy` command never loads the parked provider code (the island guard), and a dossier run opens no internet socket (S10).
A change to what that evidence accepts or refuses is a security decision (GP-Q0 `:55`) under `:95-96`; the testkit says the same
("closing it changes what the guards refuse and needs a GP-Q0 ruling first", `workspace-reach.testkit.ts:77-78`).
~~~

E4.5 — in line 21, replace `**A**: one precondition test that refuses such a package` with:
~~~text
**A**: one precondition test that refuses such a package, and any dependency spec that is not a plain registry version
~~~

---

## Q5 — engine text in refusal messages (`syzygy-bpyt.50`): EDIT

**1. Owner question?** Yes. GP-Q0 `:52-53` names "a refusal string" as something a behavior-preserving change may not move, and no
Part 3 row lists these. (It is outside Part 1's permission rather than literally inside `:95-96`, since no accept-or-refuse
decision moves; the packet's citation of `:53` is the right one.) Option C alone would be agent work.

**2. Problem stated truly?** Yes.
- [Observed: my own `tools/vet_q5_census.py` at `b7bab8eb`, output `out/vet-q5-census-b7bab8eb.json`] Population, the packet's
  rule: 241 files swept, 279 `.ts` files left out. The packet's regex, verbatim: 79 lines in 54 files; `.message` 68 and `.stack`
  4 by the regex and by literal `str.count` alike. The packet's class map (`engine-text-classes-b10e4da9.json`) holds 79 distinct
  sites, equal to the regex's hit set, none in two classes, counts 11/12/9/3/21/23.
- Second method, mine: every catch binding in the population (`catch (X)`, `.catch((X) =>`; names found: `cause` 96, `error` 54,
  `e` 4, `statCause` 1), and each use of that name as `.message`, `.stack`, `String(X)`, `${X}`, `X.toString()`, `inspect(X)`,
  `JSON.stringify(X)` or `+` concatenation: 55 lines, none outside the regex's 79.
- Denominator check: of the 279 left out, 15 are not `*.test.ts`; one of them is product code
  (`packages/three-surface-poc-core/src/test-artifact-verification.ts`, left out by the `test-` basename rule). All 15 have 0
  regex hits, so the boundary does not move the result.
- [Observed, by reading `content-classification.ts:135-165`] `compileDetectors` already throws fixed words for every malformed
  field except two: a non-object detector (the engine's `TypeError` on `detector.id`) and the `RegExp` compile error, which is
  exactly what A fixes. The probe's two refusal strings were not re-run.

**3. Scope.** Two decisions sit in one list: whether the governed sites change, and how far beyond them to go. The packet's own
recommendation paragraph names a fourth answer ("B restricted to the 21 catch-all sites", lines 392-393) that is not an option.
Make it option D.

**4. Recommendation.** A is sound and narrow: a refusal decided by digest-bound policy bytes should not vary with the engine
(CC-OBS-1 analogy), and naming detector and check is CC-OBS-4's "error class" context (`:82-97`); keeping the environment class's
OS and git words follows bias 3 (`SKILL.md:64-66`). The census test that "fails when an unlisted one appears" should key on file and
text, not line numbers, or every edit above a site breaks it; that is an implementation note for the bead, not a packet change.

**5. Readable cold?** Yes, about two minutes; the class table carries it.

**6. Follow-through.** Stated for A. Not stated for B, C or D; see W1.

**Replacement texts.**

E5.1 — replace lines 340–341 with:
~~~text
**The decision.** Which messages built from a caught error's text should change: only the screening-policy ones, at their source,
with a census test pinning the rest (A), all 47 product sites (B), none, with only the census test (C), or the screening-policy ones
and the 21 catch-all handlers (D)?
~~~

E5.2 — in line 356, append after `(279 test and test-support files left out).`:
~~~text
 One file the basename rule leaves out is product code, `packages/three-surface-poc-core/src/test-artifact-verification.ts`; it has no hit, so the result stands.
~~~

E5.3 — insert after line 385:
~~~text
- **D. Fix the governed and the catch-all classes.** As A for the 3 governed sites; each of the 21 catch-all handlers names its stage
  and the error's class (for example `RangeError`), never its message, as `startup-detail.ts:35-40` already does at daemon start;
  the census test pins the 23 environment sites. *Changes:* 24 texts, among them the re-observe 502 page and the HTTP 500 body.
  *Costs:* a bug's own wording no longer appears on those pages; the OS's and git's words stay.
~~~

E5.4 — replace lines 392–393 with:
~~~text
governed sites, and lists and pins the other 44. If you want the catch-all pages, such as the 502 page, to show only an error
class, answer D.
~~~

---

## Q6 — impossible owner-act dates (`syzygy-bpyt.1.21`): PASS

**1. Owner question?** Yes. A makes two gates refuse more (`:95-96`), and one of them is the body-read consent gate (GP-Q0 `:55`, "a
consent ... decision").

**2. Problem stated truly?** Yes.
- [Observed: `tools/vet-q6-dates.mjs` over the built `act-fields.js` at `b7bab8eb`] `isIsoDate` accepts 2026-02-29, 02-30, 02-31 and
  04-31, which the engine reads as 2026-03-01, 03-02, 03-03 and 05-01; it refuses 2026-02-32, 13-01 and 00-10. A read-back check
  refuses all seven and accepts 2026-02-28 and 2028-02-29.
- [Observed, by reading] `body-read-authority.ts:445`, `:517` and `walkthrough-judgment.ts:640`, `:703` call `isIsoDate` and then
  compare by text, as the packet says; `package-reader.ts:112` already reads back.
- [Observed: `tools/vet_q6_census.py`, a wider predicate than the packet's] Over the 1,001 tracked `.md` files under
  `.syzygy/governance/`: 262 lines carry a `date:` label in any case (none an `expires:` label), and 0 of the 5,642 `YYYY-MM-DD`
  tokens anywhere in those files is an impossible date.

**3. Scope.** One decision, two options; nothing missing.

**4. Recommendation.** A is sound, minimal and fail-closed; it reuses today's refusal reasons and matches the third reader (bias 5,
bias 6).

**5. Readable cold?** Yes, under two minutes.

**6. Follow-through.** Stated for A; B's ("record the reason in `act-fields.ts`") is in the option itself. W1 covers the rest.

---

## Q7 — line separator in a fence opener (`syzygy-bpyt.1.19`): EDIT

**1. Owner question?** Yes. It changes what the active-content gate accepts and refuses (`:95-96`).

**2. Problem stated truly?** Yes. [Observed: `tools/vet-q7-u2028.mjs`, U+2028 built by code point, on `main` and PR #544] The one-line
text (three backticks, U+2028, a script, three backticks) is admitted on both; without U+2028 it is malformed
(`backtick-fence-with-backtick-in-info-string`); the tilde text with U+2028 is malformed `unclosed-fence` on both, and admitted
without it.

**3. Scope.** One decision. Its follow-through refers to Q8, which leaves the packet.

**4. Recommendation.** A is sound: the spec's "this exact" profile (`spec.md:810-811`), one flag, and the reason it must follow PR #544
(on `main` a line may still end in CR) is right.

**5. Readable cold?** Yes.

**6. Follow-through.** Stated; needs the Q8 reference changed.

**Replacement text.**

E7.1 — replace lines 483–484 with:
~~~text
**If you answer A, the agents will** make it in one PR after PR #544, beside the finding-position change agents make on their own
(see "Also found"): the flag, the probe rows pinned as tests, this differential, a mutant, a CC-REV-1 review (class 4) with GP-Q0's
three extra checks and the owner notice.
~~~

---

## Q8 — finding positions in bare-CR texts (`syzygy-bpyt.1.20`): REMOVE

**1. Owner question?** No. GP-Q0 Part 1: "Behavior-preserving refactors may proceed under the acts already in force" (`:51`), where
behavior-preserving means none of "a rendered byte, a wire format, a refusal string or an exit code; a signed or digest-bound
artifact; a consent, security or retention decision" changes (`:52-55`). Unifying the position rule moves none of them, and no gate
accepts or refuses anything differently, so `:95-96` does not apply. The packet already says it "may not need you at all".

**2. Evidence for that.**
- [Observed: `tools/vet-q8-positions-reach.mjs`, output `out/vet-q8-positions-reach-b7bab8eb.json`] A source excluded for active
  content, built through `buildProjectShape` and the fixture `PocModel`: the shape's JSON has no `activeContent` and no `column`
  key; the model's only `column` keys are Trajectory board columns.
- [Observed, by reading every `scanActiveContent` caller] `content-classification.ts:195-196` keeps a count; `screen.ts:115`,
  `:132` and `public-source-screening.ts:181` keep whether any was found; `verbatim-route.ts:125-128` renders the set of forms in
  first-occurrence order; `git-object-reader.ts:359` stores the array in a transient read record that `content-classification.ts:393`
  reduces to a count.
- [Inferred, by reading `positionOf` and the sort at `git-object-reader.ts:218`] Under either line rule, sorting by line then column
  orders findings by text offset, so the one rendered list of forms keeps its order and no byte moves.

**3. Disposition.** Leaves the question list; the agents take B (the packet's own choice) under `syzygy-bpyt.1.20`, in the Q7 pull
request or alone, with PR #544's pin test flipped, a mutant and an independent review. A later page that shows a position gets its
own review then.

**Replacement texts.**

E8.1 — delete lines 491–526 (the blank line before the Q8 heading, the Q8 section and the rule after it), so line 490's rule is
followed by line 527's blank line and the "Also found" heading.

E8.2 — insert after line 536 (the end of the first "Also found" paragraph), with a blank line before it:
~~~text
Finding positions in old-Mac (bare CR) texts (bead `syzygy-bpyt.1.20`, formerly a question here). After PR #544 a malformed-code
finding counts CR, CRLF and LF as line ends, while every other finding counts LF only. No page, record, refusal string or exit code
shows a position: every caller keeps only a finding's form, a count, or whether any was found, and the one list of forms that is
rendered keeps its order under either rule [Observed by the vetter, V-GP-B2-1 `vet-q8-positions-reach.mjs`; the order Inferred from
`git-object-reader.ts:218`]. So using the mask's rule for every finding is behavior-preserving under GP-Q0 (`:52-55`), and the
agents make it beside Q7, with the pin test flipped, a mutant and an independent review.
~~~

---

## Side finding — the unsafe-link pattern's slowdown: agent work, EDIT to the note

**Owner question?** No, as the packet says: a rewrite that matches the same text moves no rendered byte, wire format, refusal string
or exit code (GP-Q0 `:52-55`). One timing consumer exists: a dossier run's declared deadline (`polaris-dossier/src/status.ts:139-145`,
`render.ts:31`) can be used up by a stall; that is timing, not a decision on the text, and the registry ledger takes no wall-clock
input (`resource-ledger.ts:17`, `:167`).

**Problem stated truly?** Mostly. [Observed: `tools/vet-side-unsafe-url.mjs` at `b7bab8eb`] `a =` plus 250, 500, 1,000 and 2,000
spaces plus `b` takes 40, 182, 948 and 4,737 ms; `apps/three-surface-poc/src/orrery.ts` (11,207 bytes) takes 29,771 ms through the
whole scan. That is about five times slower per doubling (an exponent near 2.3), not "roughly with the cube" (eight times).

E9.1 — in line 531, replace `slows down roughly with the cube of a run of spaces after `=`` with:
~~~text
slows down faster than the square of a run of spaces after `=` (about five times per doubling: 40, 182, 948 and 4,737 ms for 250, 500, 1,000 and 2,000 spaces in the vetter's re-run)
~~~

E9.2 — in line 536, replace `bead exists: I read beads only by id.` with:
~~~text
bead exists: I read beads only by id; the coordinator files or finds it before the next cycle. The one consumer that reads elapsed
time is a dossier run's declared deadline, which a stall can use up.
~~~

---

## The packet as a whole

**Order.** Right: Q1 is time-bound by PR #544, Q2 is the most consequential (P1, VIS-2), and the low-priority items close it. With Q8
removed the order stands.

**Summary against the sections.** Accurate except: Q1's row lacks the extractor sibling; Q2's "P1" is tracker jargon; Q4's row
understates A; the Q8 row and both paragraphs under the table name Q8; the title counts eight.

**"What this packet did not establish."** Incomplete; W3 adds five lines.

**Follow-through for non-recommended answers.** Every item states it only for the recommended letter. W1 adds one rule for all.

**Readability across the packet.** "PWB" is never expanded (line 53); "the dossier command" is given as `syzygy` alone (line 50), but
the command is `syzygy dossier …` (`apps/syzygy/src/main.ts:172`), with `syzygy polaris <url>` beside it (`:190`).

**Note, not an edit.** Q2 and Q3 say "An independent vetter passed this recommendation on 2026-10-27" with no path; the raws are
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/vet-gp/VET-GP-FOLLOWUPS-1.md` to `-4.md`
(round 4's table: 1.15, 1.16 and 1.17 Pass and Pass). Citing them by path would let the owner check.

W1 — insert after line 44:
~~~text

**If you pick an option other than the recommended one,** the agents carry it out under the same bead with the same review the
section names. An option that keeps today's code closes the bead with a dated note, and where a code comment or `AGENTS.md` names the
question as open, that line is edited in the same change. An option that needs a specification, policy or registry amendment comes
back to you as its own packet before any code changes.
~~~

W2 — summary and frame:
- Line 1: replace `eight follow-up questions` with `seven follow-up questions`.
- Line 18: replace the whole row with:
~~~text
| Q1 | `syzygy-bpyt.1.18` | A very long closed code fence crashes the active-content gate, and a very long list crashes the extractor the same way. Read both like any shorter text? | **A**: a loop in place of the one-call push, at both sites, in its own PR right after PR #544 | Answer before PR #544 merges: that PR makes CRLF and CR fences crash too |
~~~
- Line 19: replace `P1; work starts after PR #544` with `High (tracker priority P1); work starts after PR #544`.
- Line 21: E4.5.
- Line 25: delete the row.
- Lines 27–29: replace with:
~~~text
Two groups. Q1 and Q7 both touch the active-content gate's code reader after PR #544; they are separate answers. Q3 and Q4 are
coupled: Q3's derived test walks imports with the resolver Q4 is about. Q5's refusal class also shows up on a page in Q1's trace.
~~~
- Lines 31–32: replace with:
~~~text
Q7 was expected to be low priority, and that holds: its shape occurs in no file I could check. The former Q8 (finding positions in
old-Mac line-end texts) changes nothing any page, record or refusal shows, so it is not yours; see "Also found".
~~~
- Line 50: replace with:
~~~text
- **The dossier command**: `syzygy dossier …` (and the one-command `syzygy polaris <url>`), which writes a Polaris dossier, a multi-page explanatory site of a repository.
~~~
- Line 53: replace `the exact rule the PWB specification gives` with `the exact rule the PWB specification (Polaris's project-wide model of Butlers) gives`.

W3 — "What this packet did not establish":
- Line 540: replace `the shapes in Q1, Q2, Q7 or Q8` with `the shapes in Q1, Q2 or Q7, or bare-CR line ends`.
- Insert after line 545:
~~~text
- Q1: the throw thresholds depend on the harness as well as the stack depth (the vetter's re-run: 125,553 lines at the top of the
  stack, 100,750 at 2,000 frames); the extractor's list throw with CRLF or CR line ends, and what the surfaces show after it beyond
  the project shape; and whether any of the other 30 argument-spread calls in shipped code can meet an input that large [Unknown].
- Q2: option D's evidence is the 2026-10-27 vetter's, not re-run here; what G3 does to consumers beyond the manifest [Unknown].
- Q4: that npm links an unscoped workspace under its own name was not exercised; both probes made the `node_modules` link by hand
  [Inferred from npm's workspace behaviour].
- Q7: that the profile reads the one-line text as malformed [Inferred from `spec.md:815-817`].
- Side finding: whether a bead exists [Unknown].
~~~

## Verdict reasoning

Every problem above is fixed by the exact texts given. One edit set (Q1, E1.1–E1.8) carries a fact the drafter did not have, the
extractor's identical crash; I observed it myself and give its tool and output, so no further evidence is needed and the
recommended letter does not change, only its reach. Q5's new option D uses only the packet's own figures. No recommendation changes
letter. Hence READY WITH EDITS. If the coordinator prefers the drafter to re-run the Q1 sibling before the owner sees it, that is a
choice, not a gap in this vet.

## 10. Cleanup

Deleted: the clones `vet-1/main-clone`, `vet-1/pr544-clone` and `vet-1/plant-clone`, and the private TMPDIR `/tmp/vgpb2-1` (with
the Q4 synthetic tree and the Q1 patched mask copy inside it). Nothing else in `/tmp` was touched; no process outside my own tree
was signalled. No kept file exceeds 300 KB. Every kept file was checked for U+00A0 by Python: none.

Kept, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/lead/owner-batch-2/vet-1/`:

- `out/build-main.log` sha256 `597b358eb98f417637ea8ee02d8d875627f8aea14c146672ac6e228f81cae5a6`
- `out/build-pr544.log` sha256 `b1fb3e5eb7ec98e69daa88cfaf75d0d62abe9883114b772dfc9ccec2aacb6867`
- `out/evidence-digest-check.txt` sha256 `84b56b3466668c68bc9b382ea6e5c1d44366f6fd880022a821d6384a9cf662b2`
- `out/npm-ci-main.log` sha256 `b6640843f1adc9157410536aed53695255a92226d17e56daba188c8d3e39b40f`
- `out/npm-ci-plant.log` sha256 `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b`
- `out/npm-ci-pr544.log` sha256 `b6640843f1adc9157410536aed53695255a92226d17e56daba188c8d3e39b40f`
- `out/plant-build-clean.log` sha256 `ff04021c063a8dd33d96a8b56213397750f5dd8560c5b2c658a5f815184c9ef2`
- `out/vet-q1-depth-main.json` sha256 `ce44a1c125654bf0b72af7a45a7563f4ffb8666932490f2bad5284abd26c0da5`
- `out/vet-q1-loop-differential-pr544-561e4f77.json` sha256 `4c94c7586b4e41ca71dad2a9d35401b6107e74425e6bdc6b4613b28a4253166d`
- `out/vet-q1-sibling-spread-main.json` sha256 `86b87bc1f7d6ce6c0d2abec895eb912ba8af7b68234a475569d4ad6cc47b0849`
- `out/vet-q1-sibling-stack-main.json` sha256 `6dd17876b569fa29fa0adb4cfe92c70f500378b4d815c84cce09c115aa5ad93c`
- `out/vet-q1-spread-sweep-b7bab8eb.txt` sha256 `a933adaf995a74fbae94a773945a46241b289373e66e1941195ff9d32e9e27c1`
- `out/vet-q1-trace-main-b7bab8eb.json` sha256 `6d704d2719abe5cba64b07a425a2d16d03eca16e3f809019cc69d2bf70b89ba5`
- `out/vet-q1-trace-main.stderr` sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty)
- `out/vet-q1-trace-pr544-561e4f77-loopfix.json` sha256 `5ce8b75caa47dd10d5fa318bba2e9349d6c2c4ce3a458de7734217b5c06acb80`
- `out/vet-q1-trace-pr544-561e4f77.json` sha256 `defa8368330a63dda00aedd082a56a67a20c84bcd45f7b6a09005e1435db646c`
- `out/vet-q1-trace-pr544.stderr` sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty)
- `out/vet-q2-g2-main-b7bab8eb.json` sha256 `c120187332990462fdd8cfb8c429eef81ba3aceb77d0b706ae2ba77fa1c3a7c5`
- `out/vet-q2-stray-backticks-main.json` sha256 `a70e45dd5f373be0f6a7be0d35cbb002e05382f3eeb45d0a32ac6a4a7124067b`
- `out/vet-q3-baseline.json` sha256 `97f3d12f956af9e188623352e23458f25587d20da65464885b829cbb27627018`
- `out/vet-q3-plant-build.log` sha256 `ff04021c063a8dd33d96a8b56213397750f5dd8560c5b2c658a5f815184c9ef2` (the second, kept plant's build)
- `out/vet-q3-planted-generation-core.json` sha256 `d5580154993e5e08080326e415dc3e3f82a62dbe321594af3e7fada8e3886fa1`
- `out/vet-q3-rebuild-clean.log` sha256 `ff04021c063a8dd33d96a8b56213397750f5dd8560c5b2c658a5f815184c9ef2`
- `out/vet-q4-unscoped.json` sha256 `a532596aca24aa9a19134d59c3ca21a48876a76298d3c3e6b9e4dde6b86c49e4`
- `out/vet-q5-census-b7bab8eb.json` sha256 `f2ca82fed52c3529ed87f1d240868141ad0b28bd4d098275d033e4e4d7b32771`
- `out/vet-q6-census-b7bab8eb.txt` sha256 `bedffa11fe7dd0d2636955b72821a35f36ada3e4b544d474fd7293b2f48720fd`
- `out/vet-q6-dates-b7bab8eb.json` sha256 `6348bfecacfc891a51bd4596b5280a1b8bce684f7b0a1daf246e4af57951d4ef`
- `out/vet-q7-u2028-main.json` sha256 `ce3f55914822113e1e1627f99517292be35e7b8f834858f284106c633bc20199`
- `out/vet-q7-u2028-pr544.json` sha256 `ce3f55914822113e1e1627f99517292be35e7b8f834858f284106c633bc20199`
- `out/vet-q8-positions-reach-b7bab8eb.json` sha256 `45a8f0d0ce064d6f18d86c9a3c47b0f7af74395763ce513ebdf12c6051136441`
- `out/vet-side-unsafe-url-b7bab8eb.json` sha256 `8c8c9d3b4ea1bf5b9c41c99e72a6678102d6aa57d10b9248756598546da9ce00`
- `tools/check_evidence_digests.py` sha256 `acfe03d55ecaa08d2eb790dc464ccc4e4a4deae14e021840fb508de8d9163ef0`
- `tools/vet-q1-depth.mjs` sha256 `d214f99d0fa6536aade15c8ca0c9d0f6514bf2174551d5f390454a6c411bd416`
- `tools/vet-q1-excluded-why.mjs` sha256 `2f684b691f0e49cf2230339126b6574d494952047a54cad1e99fc6db112884a3` (fixture check: my first vision text failed the grammar; fixed before the kept runs)
- `tools/vet-q1-loop-differential.mjs` sha256 `f36c21e523349e285d0bf6a5fbba0b45e65369d13d1198f745ba35919b8a2bb1`
- `tools/vet-q1-sibling-spread.mjs` sha256 `303ad0628c4ff3d4945f9eddeabaf0423cadfcb2bc4073fdad54378cbd822e1e`
- `tools/vet-q1-sibling-stack.mjs` sha256 `35bdf2c50e1cf1edb296b8e30acb1fbc3d991b2542350437e3fe5daa967465d8`
- `tools/vet-q1-trace.mjs` sha256 `c900937c52a60f404bdd722c9e35ae81431ec39f4722456b3c24539d3f847630`
- `tools/vet-q2-g2.mjs` sha256 `965a5a047d76210ec64cf14102693e37e28640f2b0eba19f63a65c73e18ddead`
- `tools/vet-q2-stray-backticks.mjs` sha256 `17d7e0794d2391af58433c59c136214ee11a357c1187e7c7e1f5ade2f5545200`
- `tools/vet-q3-gate.mjs` sha256 `5b9764d004a84ace6eb34347d6a57e2c57e3ada9924a42d5c305ef82fb893fdd`
- `tools/vet-q4-unscoped.mjs` sha256 `7bb3f89c48b8790f16c0b63037db13dd4595ed2030977cbc022753d213066974`
- `tools/vet-q6-dates.mjs` sha256 `7b9ab8e6460d0b90f8598fcd81f3c92b3b9cb727c5f36728c44819e66326d54b`
- `tools/vet-q7-u2028.mjs` sha256 `a3e18f315ce1f9279d7dbfbfae4e511ee3c5ef6cf68f395caafc4d2ef7010c53`
- `tools/vet-q8-positions-reach.mjs` sha256 `4649158207f169746b3aba3d0a37e32d1d8d7147b43aaa8460d2069b81570422`
- `tools/vet-side-unsafe-url.mjs` sha256 `defcb28cad0b3335593bbcbddabccdca9e15cc80250616949e870b052fb694a5`
- `tools/vet_q3_plant.py` sha256 `245f2b20d078d11152ec02cce9c8bfdd8e1a4ddd9468bc984aa881979ac60f31`
- `tools/vet_q5_census.py` sha256 `557313abe19f7d79ed8753d790c31c7e2357285a398e6f916f27e3c8a16b7494`
- `tools/vet_q6_census.py` sha256 `3862f2628d81ba2519952015ea1423b74aab91708015604575eb599cc93e63e9`
- `tools/vet_check_raw.py` sha256 `30d31434b52fc5cf8e214c454f659d6872e99e46ddae412e0171e3591b3f6108` (checks this raw's head, U+00A0 count, file sizes and every row of this list against the live files)
- `tools/vet_verify_lines.py` sha256 `c887200a1da4f755af777ab127991370f382964374e4a79ee6a81add1dbd9519` (prints every cited line range at `b7bab8eb` by `git show`; run once, output read in session)

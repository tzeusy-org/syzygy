# R-GP-IMPL-SPREAD-SWEEP — review of PR #679 (syzygy-bpyt.54, argument-spread sweep), round 1
Verdict: REVISE
Reviewed commit: aed323e933060a87451b872bbfaebbd46e52f6ef
Subject: PR #679

Reviewer: independent fresh-context reviewer (Claude Opus 5.5, agent `w-rev-679` under review bead `syzygy-5081`). I did
not author the change and did not change it. No observed-repository content was read; every check below ran on Syzygy's
own checkout at the reviewed commit, in a detached worktree under a scratch directory, plus synthetic files I created.

Scope: the six added files under `docs/evidence/syzygy-bpyt-54/` (sweep, mutant harness, classification builder, and
three records), judged against bead `syzygy-bpyt.54`'s task text and AGENTS.md verification rules 2, 4, 6, 9 and 11.

## Verdict reasons

One "bounded" row is false and reproducibly reaches the RangeError the bead is about, so the record's per-site
classification and both totals rows are wrong. The disposition of that site does not change (it would be held as GP-Q0,
as the PR body already argues), but the deliverable is the classification, and a falsified bound is the defect the
classification exists to rule out. Everything else checks out: the population and its denominator re-derive exactly by
an independent method, the 4 holds are each correctly argued, and the records re-build byte-identically.

## Findings

### F1 (verdict-changing): `packages/polaris-dossier/src/state-directory.ts:71` is unbounded, not `os-limit` 67,584

[Observed] The row reads `bounded: true`, `boundClass: os-limit`, `ceiling: 67584`, with the bound "the tail of a path
that entered as an argv or environment string (... at most 65,536 components) plus one readlink target (PATH_MAX 4,096,
2,048 components)". The "plus one readlink target" step is wrong. `resolvePathIntent` rewrites
`candidate = path.resolve(target, ...components.slice(index + 1))` and loops; on the next pass `components` is the
rewritten candidate, so the trailing components of every link target followed so far accumulate. Each `lstat` path has
only non-link components before its last (earlier ones were already checked), so the kernel's ELOOP nesting limit never
applies, and the `visited` set only refuses revisiting the *same* link path. A chain of distinct links, each target
under PATH_MAX, grows the spread operand without limit.

Reproduction [Observed, node v24.6.0, default stack]: I copied `resolvePathIntent` verbatim from the reviewed commit
(state-directory.ts sha256 `d7de7e04e24afb4ec6f2f6da8695cb60620ee3fbcef010a0d29d8a761e613db1`), stripping only the type
annotations, into a scratch `.mjs`, created links `L0 -> L1/x/x/.../x` (1,900 `x` components, about 3,800 bytes each),
`L1 -> L2/x/...`, and so on, and called `resolvePathIntent(<dir>/L0)`:

```
n=10 links: {"resolved":true,"len":19006}
n=80 links: {"threw":"RangeError","msg":"Maximum call stack size exceeded"}
```

So the site throws at about 66 links of ordinary length. [Inferred] Who can lay such a chain: anyone controlling a
directory on the state-root or clone path the operator names; if the operator names a state root through the clone, the
observed repository's committed symlinks are on that path.

Repair asked: classify the row `bounded: false`, `boundClass: unbounded`, disposition `held: GP-Q0` (the PR body's own
argument that a loop changes a state-directory decision stands), and recompute both totals rows (all: 46 bounded lines,
5 unbounded, 5 held; shipped: 29 bounded, 5 unbounded, 5 held) and the PR body table and the "Remainder" section. The
1.5x margin sentence should be withdrawn, not reworded.

### F2 (exception): the rule-6 and selftest records name neither the commit nor the tool's digest

[Observed] `sweep-mutants-66837559.json` carries only `unmutatedSelftestExit`, `unmutatedFailures`, `mutants`, `killed`
and `total`; `sweep-selftest-66837559.json` carries only `selftest` and `failures`. Each mutant does carry its exact
`old`/`new` fragment. The commit appears only in the filename, and `66837559` is not a commit at which the tool exists
(the tool is added by `aed323e9`). AGENTS.md rule 11 and the rule-6 evidence-record lesson want the subject's digest and
the commit in the record. The classification record does carry `commit` and `toolSha256`, and `toolSha256`
(`808d6225e5d48c6dba773e09c018a3ce62563c57201d472154d99bdf58d52b93`) matches the file at the reviewed commit [Observed].
Repair asked: add `tool`, `toolSha256` and the commit the harness ran at to both records.

### F3 (note, no repair needed): the population predicate is wider than "test", but loses no hit

[Observed] The exclusion regex's `/test-` and `-test-` arms drop shipped modules: for example
`packages/three-surface-poc-core/src/test-artifact-verification.ts` is imported by `model.ts`, `model-slices.ts` and
`index.ts`, and `apps/three-surface-poc/src/capture-test-artifact*.ts` are a product entry point. An AST sweep over every
excluded file (below) finds 0 call or `new` spreads in them; the only excluded hit is a rest-parameter type inside
`fs-patch.testkit.ts:33`. The seven tracked code files outside `packages/*/src`, `apps/*/src` and `scripts/` (root
`vitest*.ts`, two `test-support/` files, one package `vitest.config.ts`) also return 0. So 288 is the right denominator
for the hits, but the record should not call the population "shipped" without that caveat.

## Sweep re-derivation (rule 2, rule 9)

Method A, independent of the author's tool: the TypeScript compiler's AST (`ts.createSourceFile`, TypeScript from a
sibling checkout's `node_modules`). Every `SpreadElement` whose parent is a `CallExpression` (this includes `super(...)`
and `Math.max/min(...)`) or a `NewExpression`, plus every call whose callee is a property named `apply`. Run over all 594
tracked `.ts/.mts/.cts/.tsx/.js/.mjs/.cjs/.jsx` files under `packages`, `apps` and `scripts` (excluding `.d.ts`), then
restricted to the author's population predicate, re-implemented by me.

| | author (method 1) | AST (method A) |
|---|---|---|
| population | 288 | 288 |
| calls | 55 | 55 |
| lines | 51 | 51 |
| lines only in one method | 0 | 0 |
| per-line multiplicity differences | 0 | 0 |

[Observed] Forms present in the 55: all 55 are call spreads; 37 of them are `Math.max`/`Math.min` calls; there are 0
`new X(...x)` spreads and 0 `.apply(` / `Reflect.apply(` calls in the population (and 0 in the whole 594-file tree
outside tests). So the denominator covers `push(...x)`, `f(...x)`, `new X(...x)` and `Math.max/min(...x)`; the `new`
form simply has no member.

Method B, my own Python `re` per raw line (call-shaped `(` then an optional argument list then `...`): 175 lines. It
over-matches object-literal and array spreads inside calls (`f({ ...x })`), so it is a superset check only: it misses
exactly one author line, `state-directory.ts:71`, whose `...` starts a continuation line, which the AST finds.

The author's `--selftest` passes at the reviewed commit, and `spread_sweep_mutants.py` re-run there kills 7 of 7 with
output identical to the committed `sweep-mutants-66837559.json`. `build_classification.py .` at the reviewed commit
rebuilds `spread-classification-66837559.json` identically except `commit` (it reads `HEAD`, so it names `aed323e9`;
`git diff --stat 66837559 aed323e9` is 6 files, all under `docs/evidence/syzygy-bpyt-54/`, so the swept bytes are the same).

## Bounded spot-checks (18 rows; 17 hold, 1 fails as F1)

Each was read at the cited line and its bound traced to code:

1. `fresh-checkout-demo-main.ts:445` (response-ceiling): routes come from links in served `/polaris` bytes, which are at
   most 2,097,152 or a 503. Holds.
2. `polaris-accessibility.ts:523` (code-constant): one evaluate per target over in-memory fixture pages. Holds [Inferred
   from the record's citation of the variants module].
3. `diagram-layout.ts:85` (closed-schema 40): `layer = nodes.map(...)`; draft-model.ts:29 `nodes: list(..., 1, 40)`. Holds.
4. `diagram-layout.ts:99`: one entry per layer, at most one per node. Holds.
5. `drawer.ts:324` (11): `secondary: distinct.slice(1)` over the closed twelve (facets.ts:112). Holds.
6. `clone-head.ts:59` (2049): HEAD read with `readSmall(..., MAX_REF_BYTES = 4096)` (lines 16, 48). Holds.
7. `discovery.ts:283` x2 (40): `partitionSubsystems` slices at `maxGroupBlobs`; both shipped budgets are 40 and the two
   callers pass `DOSSIER_DISCOVERY_BUDGET` or `DEFAULT_DISCOVERY_BUDGET`. Holds.
8. `dossier-profile.ts:202`, `:218`, `:222` (3): `openQuestions` has exactly three `out.push` sites (purpose, audience,
   scope). Holds.
9. `repo-corpus.ts:246` and `:250` (os-limit 6712): `segmentBody` keeps every piece but the last at least 80% of
   100,000 characters; `generationSourcesForRedactedBody` flushes early only to keep a short atomic marker whole.
   Holds.
10. `render.ts:321`: same two builders. Holds.
11. `dossier-site.ts:272` (closed-schema): one page's claims; the record itself marks the schema reliance [Inferred]. Holds.
12. `resource-ledger.ts:286`, `:298` (518): keyed by charged paths through the 512-read reader. Holds.
13. `check.ts:282` and the other `tool-own-state` `Math.max` rows: numbered names in the tool's own run directory. Holds
    [Inferred]; the operator's own state, not observed input.
14. `state-directory.ts:71`: fails, see F1.

## The four GP-Q0 holds

The bead's stop clause: a site "where the replacement turns a crash into an observable decision (an exit code, a
refusal, a served page) is a GP-Q0 stop-clause change". For every input below the threshold a loop is output-identical;
above it, each of these turns a crash into a decision, so none is a pure identical-output rewrite.

- `check.ts:206` — confirmed. [Observed] `findings.push(...derived.findings)` is after the `try` around
  `deriveFindings`, whose `add` pushes one element at a time (check-derive.ts:72-90, one `duplicate-id` per repeated id);
  the draft plan's `gate` is `() => ({ ok: true, found: null })` (check.ts:98), so a large parsed draft reaches it. A loop
  would go on to freeze `rev-N.json` and write the check record and its exit code, where today nothing is frozen.
- `discovery.ts:339` — confirmed. [Observed] the reply is capped at `byId.size` (line 333), the candidate-blob count;
  `repo-corpus.ts` lists the tree by `git ls-tree -r` with no file-count cap I could find, and no provider reply byte cap
  appears under `polaris-generation-core/src` or `three-surface-poc/src/polaris-generation` (0 hits for
  `maxReplyBytes|MAX_REPLY|replyBytes|maxResponseBytes|MAX_RESPONSE`) [Inferred: absence over those two trees only].
  A loop turns the rethrow into a ranked selection, an egress decision.
- `polaris-accessible-names.ts:336` — confirmed: one 2 MiB page can carry more nameless interactive elements than the
  threshold; a loop turns the crash into the sweep's exit code and evidence record.
- `polaris-accessible-names.ts:338` — confirmed, with a precision note: in `sweepPolarisNamesAndHeadings` every swept
  page is a listed page, so `page-not-in-machine-answer` cannot fire there and the count is at most the listed pages
  (1 + the machine answer's sources), not "every listed page plus every swept one". The conclusion (unbounded by
  anything but the response ceiling) is unchanged [Inferred].

## Rule 11

[Observed] The classification record names its commit (`66837559d0d1cc7f555f995683653f6884ed3fd1`), tool path, tool
sha256 and both regexes in full, and the classification record's own sha256 at the reviewed commit is
`962c499ecf4e53a0cdd1f8dda33df2e36bcb0aba74109edf73d038436296a426`. The mutant and selftest records do not; see F2.

## Battery

`python3 scripts/check_governance.py` at the reviewed commit: `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0 [Observed].
No implementation code changed, so I ran no test suite.

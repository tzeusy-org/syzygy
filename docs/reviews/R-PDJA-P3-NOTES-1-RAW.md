# R-PDJA-P3-NOTES-1 — review of the P3 notes PR (syzygy-pdja.18, .16, .24)
Reviewed commit: 508832e066e7c17b2faed8cfdaad249d8ff2536c
Subject: PR #805
Verdict: CONFIRM WITH EXCEPTIONS

Scope: `git diff origin/main...HEAD` at the commit above (16 files), the three beads (`bd show`),
`docs/reviews/R-PDJA-17-STANDARDS-1-RAW.md` notes 1-6, `docs/reviews/R-PDJA-8-LABELS-5-RAW.md`
notes 1-2, REQ-polaris-generation-034 in
`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`, and the
reader standard RS-13 in `.claude/skills/polaris-dossier/references/reader-standards.md`.
No observed-repository body, dossier output or credential was read; no dossier run was made.

## Findings

**Finding 1 — RS-13 narrowing loses whole classes of code symbols, two of them the standard's own examples** (note)

`packages/polaris-dossier/src/reader-advice.ts:48-51`; `packages/polaris-dossier/src/reader-standards.test.ts:98,103`.

RS-13 (`references/reader-standards.md:122-123`): "**RS-13 Titles say what a page explains**,
such as "How a write reaches the replicas", never a function, type or file name. *Counted.*"

[Observed] A scratch probe (a throwaway vitest file, deleted after) ran the old predicate (main)
and the new one over 32 titles:

| Title | old | new |
|---|---|---|
| The RedisModule hooks / Inside HttpServer / How EventLoop ticks / What ClientState holds / How ByteBuffer grows | PascalCase | none |
| Inside src/server / The lib/utils helpers / How net/http serves / Inside cmd/main | path | none |
| Inside App.js / How Server.js boots / Index.js exports | file | none |
| What parseURL accepts / How toJSON serialises / getID and its callers / The innerHTML sink | camelCase | none |
| xAdd internals | camelCase | none |
| What aeMain runs | camelCase | camelCase |
| The d3.js charts / Using three.js | file | file (still a false positive) |
| Inside src/ | none | path (gained) |
| Node.js, PostgreSQL, GitHub, iPhone, gRPC, I/O, read/write, TCP/IP, macOS, JavaScript, WebSocket, YouTube, TypeScript, WebAssembly, OpenSSL | flagged | none |

Judgement against the standard:
- The two-part PascalCase loss is the regression that matters. A two-part PascalCase word is the
  most common shape of a type name (`RedisModule`, `HttpServer`, `EventLoop`), and RS-13 names a
  type explicitly. The diff rewrote the previously pinned positives to fit the new rule
  (`'The RedisModule hooks'` became `'The RedisModuleCtx hooks'`, `'Inside src/server'` became
  `'Inside src/server/networking'`), so a class the suite used to pin as flagged is now unflagged,
  and only the code comment (`reader-advice.ts:43`) says so.
- The single-slash path loss (`src/server`, `net/http`) is the price of silencing `I/O`,
  `read/write` and `TCP/IP`, which the reviewer singled out as not proper names. That trade is
  defensible.
- The camelCase-ending-in-an-initialism loss (`parseURL`, `toJSON`, `getID`, `innerHTML`) is
  motivated by no reviewer example. The note's examples (`iPhone`, `gRPC`) are already handled by
  the two-lowercase-letters prefix. Only `macOS` needs "a lowercase letter after the capital", and
  a real identifier shape pays for it.
- Treating every capitalised `.js` name as a project name also drops `App.js`, a conventional
  React file name.

Acceptable for an advisory? Yes, on balance.
- The advice sets no outcome.
- The detail already exempts product and proper names.
- The rendered-design review judges every page against all the standards, RS-13 included. A false
  negative here costs one missed hint, and the design reviewer still sees the title.
- The reviewer's note asked to "narrow or allow-list", and the narrowing does stop the noise.

Two suggestions:
- Disclose the lost classes in the bead's close reason, or carry them as a follow-up bead.
- Consider keeping two-part PascalCase and allow-listing the handful of brands. The detail's
  "unless the word is a product or proper name" already covers a brand that gets flagged.

**Finding 2 — pdja.16 note 2's two surviving mutants are neither addressed nor carried** (requires change)

`syzygy-pdja.16` description; PR #805 body; `docs/reviews/R-PDJA-8-LABELS-5-RAW.md:23-24`.

The bead names three items under note 2: `threshold-4` survives, and "drop-base-side and
heads-by-index survive but behave alike on the reviewer's populations".
- [Observed] `threshold-4` is addressed: the new test
  (`apps/three-surface-poc/src/polaris-generation/diagram-layout.test.ts:351-360`) kills it (see
  Verification).
- [Observed] The PR body, the mutation record
  (`docs/evidence/syzygy-pdja-p3-notes/p3-notes-mutants-2026-11-09.json`) and the bead comment say
  nothing about `drop-base-side` or `heads-by-index`. The record's 29 mutants include neither.
- The reviewer graded both as equivalent on the observed populations, so no code change is owed.
  Acceptance criterion 1, though, needs each note addressed or explicitly carried.
- Change requested: no code. One sentence in the PR body or the bead's close reason, carrying both
  as accepted-equivalent mutants. Name the conditions under which each one differs:
  `heads-by-index` differs for parallel edges with identical paths, and `drop-base-side` differs
  for an end inside or near another head's base side.

**Finding 3 — the `past` assertion in the new margin test cannot kill a mutant its sibling misses** (note)

`apps/three-surface-poc/src/polaris-generation/diagram-layout.test.ts:357-359`.

The test checks two ends: one at exactly 1.5 px (`atMargin`) and one at 2 px (`past`).
- Any threshold above 1.5 refuses the 1.5 px end, so the `atMargin` expectation already fails for
  every threshold the `past` expectation would catch.
- The `past` case therefore adds no kill. It is harmless documentation of intent.
- The test is literal and correct: (50, 50) is exactly 1.5 px from the triangle's left side at
  x = 51.5.

**Finding 4 — the marker rule is pinned as a string; the real cascade does honour it** (note)

`apps/three-surface-poc/src/polaris-generation/dossier-site.ts:190`;
`apps/three-surface-poc/src/polaris-generation/dossier-reading.test.ts:304`.

[Observed] Headless Chrome (`google-chrome --headless=new`), `getComputedStyle` on a minimal page:
- The page carries the real `DRAFT_PREVIEW_CSS`, `LOCAL_CSS` and `DOSSIER_THEME_CSS`, the order
  `dossier-site.ts:203` emits.
- Its SVG has the same `<defs><marker><path/></marker></defs>` shape `diagram-layout.ts:379`
  writes, plus a line with `marker-end`.
- At this commit: marker path `stroke=none`, `fill=rgb(107, 106, 101)`; the line keeps its stroke.
- With the rule reverted to `{fill:var(--muted)}`: marker path `stroke=rgb(107, 106, 101)`, the
  reported defect.

The cascade works as intended:
- `.diagram-scroll svg marker path` has specificity (0,1,3).
- It beats `.diagram-scroll svg path` (0,1,2) whatever the source order.
- No rule of higher specificity matches the marker path. `g.edge:hover path` and `.inferred>path`
  do not reach `<defs>`.

The unit test pins only the string, so a later reordering or rewrite would be caught only by a
byte change. That is adequate here, because specificity, not order, carries the precedence. DOSSIER_CSS (`dossier-site.ts:105`, not exported) was not in the probe page; a sweep of its
rules for `path` selectors found none that strokes.

**Finding 5 — pdja.24's population is the clause's; two related consequences go untold** (note)

`packages/polaris-dossier/src/review-reach.ts:131-134,145-150`;
`packages/polaris-dossier/src/render.ts:593-603,652`.

REQ-polaris-generation-034 says: "A withheld item is a claim block, an understanding item, or a
diagram node or edge that cites at least one span, all of its cited spans being withheld, or that
relies on such an unverifiable quotation or on a quotation whose range touches a redacted line."
It also says: "A span a run's consented content classes keep from an agent-bound artifact is not
withheld under this rule and keeps its existing treatment."

[Observed] The new `elements` list matches this:
- It lists every understanding item, with no label restriction, as the render's
  `understandingItem` at `render.ts:636-645` applies none.
- It lists every diagram node and edge through the shared `isWithheldItem`, with each item's own
  citations, as `render.ts:596`, `:620` and `:624` read them.
- It omits class-gated-only elements, which `standingIn` maps to `other`, as the render's
  `spanStanding` does.
- No other draft element reaches `withheldNote` in `render.ts`. Its callers are `:461` (claim
  blocks, already in `blocks`), `:596`, `:602`, `:639` and `:652`.
- Inventory entries are not in a draft. The tests pin:
  - the gated exclusion (`review-reach.test.ts`, `u-gated`, `n-gated`; `check.test.ts`, the
    `c-x1e` edge);
  - the mixed exclusion (`u-mixed`, `n-mixed`);
  - a quotation-only inclusion (`limits[0]`);
  - an id-less node, which is listed as `null`.

Two consequences the advice does not tell the author:
- When every node and edge of a diagram is withheld, the diagram's title and relationship render
  as `Withheld item` (`render.ts:600-603,618`).
- So does a section's title over all-withheld content (`:605-608`).

These follow from the listed elements, so the advice is not wrong. A line in `ELEMENT_DETAIL`
would close the gap. Optional.

**Finding 6 — the brief version moves to v6; nothing reads it as a gate** (note)

`packages/polaris-dossier/src/brief.ts:35`.

The bump changes the value stored in a new run's `brief.json`.
- [Observed] A grep of non-test sources finds `BRIEF_VERSION` only where the brief writes it
  (`brief.ts:116,236,297,326`). No step guard, gate or check compares it.
- So criterion 2 holds: the change is to the brief's own text and record, not a gate, outcome,
  exit code or stored check record.
- The bump follows the precedent of `f29203c1` (pdja.20).

## Notes each bead names: addressed or carried

- pdja.18:
  - Note 1: addressed. The heading names its subject, and the brief adds a "does not itself hash
    to that digest" sentence. Both are pinned at `brief.test.ts` and `reader-standards.test.ts:33`.
  - Note 2: addressed, with Finding 1.
  - Note 3: resolved by the criterion-governs line, as the bead says.
  - Note 4: addressed (`cli.ts:322-323`).
  - Note 5: addressed. [Observed] `git show 9b108eab:<path> | sha256sum` reproduces all three new
    digests (both SKILL.md files and `cli.test.ts`), and each equals its bytes at `db185da4`.
  - Note 6: addressed (`check.test.ts:478-480`, `inventory.test.ts:361-363`).
- pdja.16:
  - Note 1: addressed by unstroking the marker (Finding 4).
  - Note 2: `threshold-4` is addressed. `drop-base-side` and `heads-by-index` are not carried
    (Finding 2).
- pdja.24: addressed. Extended with `elements`, `counts.withheldElements`, the note and the brief
  rule (Finding 5).

## Verification

- [Observed] HEAD `508832e066e7c17b2faed8cfdaad249d8ff2536c` on `agent/syzygy-pdja-p3-notes`.
- [Observed] Mutants re-run from `docs/evidence/syzygy-pdja-p3-notes/p3-notes-mutants-2026-11-09.json`.
  - Each mutant was applied alone. Its `old` fragment had to occur exactly once. Each ran its
    recorded tests, and the file was restored from the bytes read before it, with sha256
    re-checked.
  - All 7 were killed, each with the recorded failure count:

    | Mutant | Bead | Failed |
    |---|---|---|
    | `marker-stroked` | pdja.16 | 1 of 31 |
    | `head-margin-4` | pdja.16 | 1 of 37 |
    | `camel-any-after` | pdja.18 | 1 of 41 |
    | `pascal-two-parts` | pdja.18 | 2 of 41 |
    | `advice-on-parse-fault` | pdja.18 | 1 of 134 |
    | `no-edge-elements` | pdja.24 | 3 of 181 |
    | `gated-element-withheld` | pdja.24 | 2 of 181 |

  - `head-margin-4` is acceptance criterion 4's threshold: the new margin test fails at 4.
- [Observed] Literal expected values: the new expectations in `review-reach.test.ts`,
  `check.test.ts`, `reader-standards.test.ts` and `diagram-layout.test.ts` are hand-written
  literals. The digest in the brief heading is computed by `sha()`, which matches rule 3, and the
  existing test already did it that way.
- [Observed] `npm run check` passed: typecheck, then 176 test files and 4090 tests, exit 0.
- [Observed] `python3 scripts/check_governance.py` passed: "32 OK, 21 WARN, 0 FAIL (53 checks)".
  Each WARN line reports 0 findings or is a by-design bucket.
- [Observed] `git status --short` after every probe and mutant shows a clean tree, apart from
  this file.

## What I did not run

- The integration and e2e tiers.
- The 22 recorded mutants not listed above.
- A browser render of a real dossier. The cascade probe used a minimal page with the real CSS
  strings.

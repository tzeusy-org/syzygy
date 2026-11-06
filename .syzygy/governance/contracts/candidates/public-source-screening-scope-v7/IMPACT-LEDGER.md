# Impact ledger — public-source screening scope, version 7

> **Candidate — binds nothing.** Drafted 2026-11-06 (`syzygy-pdja.5`). It names
> what an act over this package's row would break or require. The install is
> separate work after the act and is not part of this package.

## Method

At this package's base (`origin/main` when the branch was cut), `git grep` over
`packages/`, `apps/` and `scripts/` (and `PROJECT-STATUS.md`, `.github/`) for:

- the version-6 version literal, `1.7.0-public-source-candidate…v6-p`: 18 lines
  outside the screening-scope builders, in 11 tracked files;
- the version-6 act file name, `…PUBLIC-SOURCE-SCOPE-V6-ACT.md`: 8 files outside
  the builders.

Figures are re-derived by those two sweeps, never carried; re-run them at the
install commit.

## What an act requires, in one landing

A policy act without its install turns `main` red, so these land together:

- `packages/polaris-generation-core/src/public-source-classification.ts`:
  `EXEMPTION_TEXTS.renderCondition` accepts the new text's digest;
  `pageSinkCspFinding` implements the closed set, replacing `FORBIDDEN_DIRECTIVES`.
  It refuses any non-ASCII byte first, drops its Unicode `trim` and `/\s+/u` split for
  ASCII whitespace, and compares tokens exactly, with one fixture per row of the
  builder's table.
- `packages/polaris-dossier/src/render.ts`: a new `PAGE_SINK_CONTRACT` id declares
  the script half, so the current id with a `script-src` is unconfirmed. The pinned
  hash set sits beside it in the core package, not in the injected renderer. Each
  page, read with a real HTML tokenizer, is checked both ways: every `<script>` has
  no `src` and hashes into the set, and every `script-src` hash is in the set. The
  check must not skip a page by file extension (`pageSinkUnconfirmed` skips files not
  ending `.html`, and the clause's page includes SVG).
- `apps/three-surface-poc/src/governance-inputs.ts` and
  `packages/three-surface-poc-core/src/git-object-reader.ts`: act records and
  policy identity, as the version-6 install changed them. Both are under the
  surface merge freeze paths: the install cannot land while
  `scripts/surface-merge-freeze.json` is frozen.
- The version literal's test readers, the recorder and its battery lines.
- A version-7 act recorder, written after a confirming review.

## What the feature then requires, separately

- A dossier spec version replacing the no-script text; signed by the owner.
- The script and its hash in the page policy. `dossier-site.ts` uses
  `DRAFT_PREVIEW_CSP_META` itself today, so the install splits that constant. Tests
  with scripts on and off, and a run over `file://`, which is how pages are
  opened. **[Observed]** Round 1 of review ran a hash-allowed inline script over
  `file://` on Chrome 120; **[Unknown]** other browsers are untried.
- Tests for the judged limbs: scripts-on against scripts-off DOM text on a canary; a
  scripts-off crawl reaching every page; a request listener seeing no request to a
  URL the renderer did not write; a source scan for the named constructors and
  elements, which covers what the listener cannot see (WebRTC, bare preconnect); a
  storage dump holding no page text; a page with ids that clobber the script's
  lookups; a fragment holding markup.
- `page-sink.test.ts` and its renderer contract. Provider and preview bytes stay
  pinned: the preview keeps its no-script policy.

## Not affected

Every detector, placement, class rule and consent. Butlers' reader takes the
same policy file; its pages are not rendered by this renderer. **[Inferred]**
from `apps/three-surface-poc/src/main.ts`'s import closure, which does not reach
the dossier renderer.

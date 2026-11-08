# Round 4 review brief — public-source screening scope, version 6 (narrow)

> **Candidate — binds nothing.** Not a review; carries no verdict. Round 4
> runs past the agreed three-round stopping rule on the owner's direction of
> 2026-11-05 ("proceed with `run a narrow round 4`"), relayed by the lead.

## Why a fourth round

Round 3 (docs/reviews/R-SCREENING-SCOPE-V6-d942-3-RAW.md, over `d942888a`)
returned `CONFIRM WITH EXCEPTIONS` with four notes. The version-6 recorder
cannot bind it: its finding 1 is tagged `(note; must be fixed before
landing)`, a qualifier the shared review parser refuses, and a raw is never
edited. Note 1 was repaired after round 3 by a re-wrap of
`SEMANTIC-DELTA.md`, which retired round 3 for that file (rule 10).

## What the reviewer is given

CC-REV-1: a fresh context holding only:

- the package, every file of
  `.syzygy/governance/contracts/candidates/public-source-screening-scope-v6/`,
  with `scripts/build_public_source_screening_scope_v6.py`,
  `scripts/redis_screening_v6_measure.py`,
  `scripts/dossier_run_citation_census.py` and the version-6 registration in
  `scripts/check_governance.py`;
- its governing references, as listed in `REVIEW-BRIEF.md` in that
  directory (the same hard limits apply: no target repository body, no
  `site/` or clone directory, no measurement-script run, no fixture text
  printed);
- the round-3 raw and `ROUND-3-DISPOSITIONS.md`;
- the acceptance criteria below.

## Acceptance criteria (narrow)

1. **Note 1.** Is the `SEMANTIC-DELTA.md` change since `d942888a` a
   whitespace-only re-wrap inside the fenced pattern display, and does it
   make `python3 scripts/check_governance.py` report 0 FAIL? Does the
   displayed pattern, with the wrap undone, still equal the pattern in the
   patch?
2. **Notes 2 to 4.** Is each dispositioned in `ROUND-3-DISPOSITIONS.md`
   truthfully and without changing a reviewed file (note 2 carried to the
   install bead `syzygy-n5jm`, note 3 carried as a named cost, note 4 stated
   there)? Is any disposition false or misleading to the owner?
3. **Nothing else changed.** Since `d942888a`, do the package files, the
   builder, the measurement and census scripts and the `check_governance.py`
   registration differ only by what the dispositions name? The branch was
   rebased onto `main`, so compare file bytes, not commit ancestry. The new
   files are `ROUND-3-DISPOSITIONS.md`, this brief, the round-3 raw, the
   campaign entry and the act recorder; the recorder is out of scope.
4. **Still sound.** The builder's `--check` and `--selftest` pass, and the
   manifest-file digest and row are unchanged from round 3.

Out of scope: re-reviewing what round 3 confirmed; whether to perform the
act; the recorder's code; the install.

## Recording — the contract the recorder parses

Any wording other than the grammar below makes the review unbindable, and
an unbindable raw cannot be repaired: it is stored verbatim either way.

**Head.** The recorder takes the first four non-blank lines of the raw.
Among them, exactly:

```text
Reviewed commit: <40 lowercase hex>
Manifest SHA-256: <SHA-256 of the manifest FILE>
Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE
```

The first non-blank line is the title. `Reviewed commit` must match
`^Reviewed commit: ([0-9a-f]{40})\s*$`; `Manifest SHA-256` must be the
exact string `Manifest SHA-256: <digest>`, the digest of the manifest
**file** as `python3 scripts/build_public_source_screening_scope_v6.py
--manifest-digest` prints it; `Verdict` must match `^Verdict: (.+?)\s*$`
and the recorder binds only `CONFIRM` or `CONFIRM WITH EXCEPTIONS`, spelled
exactly so.

**Findings.** One `## Findings` section, which ends at the next `##` or `#`
heading. Inside it:

- each finding opens a line as `**Finding N — title** (severity)`, matched by
  `^\*\*Finding (\d+) [—–-] [^\n]*?\*\*\s*\((blocking|revise|note)(?![A-Za-z])([^)\n]*)\)`,
  numbered continuously from 1;
- the severity is exactly `blocking`, `revise` or `note`. A `note` may carry
  a qualifier only after a comma or a colon, and only made of these clauses,
  comma-separated, each exactly: `for the owner`, `for the owner's view`,
  `reported for the owner`, `not resolved`, `editorial`. Any other qualifier
  (for example `(note; must be fixed before landing)`) is refused as
  ambiguous;
- no other line in the section may open with `N. ` (a numbered list item is
  read as a finding number), with a heading, bullet or `F<n>` label naming a
  finding, or may tag `blocking` or `revise` in parentheses, brackets or
  after `Severity:`. Put checks, recaps and command lists in a later `##`
  section;
- with no findings, write the heading and the word `None.`;
- only a round whose findings are all `note` clears the bytes. `CONFIRM WITH
  EXCEPTIONS` needs at least one finding, and each note is then
  dispositioned in a sibling `ROUND-4-DISPOSITIONS.md`.

The raw is stored as
`docs/reviews/R-SCREENING-SCOPE-V6-<first four hex of the reviewed commit>-4-RAW.md`.
No round 5 is dispatched.

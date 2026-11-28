# Finding-detail screening code review 1: dispositions

Review: `R93-CODE-REVIEW-RAW.md` in this directory, verdict `REVISE` (line 2), over `a696e0a2a`. It has 3 blocking findings and 8 notes. This is one round; no confirmation review follows (D10). The repairs are on `agent/syzygy-3efd.93` in `fbaec8e2c`, `ce4c6de8e`, the commits before them since `a696e0a2a`, and the commit that lands this file. The mutation records sit beside the runner in `docs/evidence/syzygy-3efd-93/`; runs 1 and 2 are not edited.

## 1. Blocking: `walk.ts` names an unchecked identity

Repaired. Each walk detail now names a handle, or otherwise the member's path:

- `WALK_DETAIL.home` and `.kind` take `handleOr(read.figure, <walk>.figure)`;
- `.element` takes `handleOr(read.figure, <walk>.figure)`;
- `.repeated` takes `handleOr(element.id, <step>.element)`;
- `.uncited` takes `handleOr(step.block, <step>.block)`.

Five site cases feed each a path-like and a token-shaped value through check: a figure homed elsewhere, a figure of no graph kind, a step naming no element drawn, a second step for one element, and an uncited paragraph. Each has its own mutant.

## 2. Blocking: the pre-v15 base end names an unchecked identity

Repaired. `derived-base.ts` now names the relationship by `handleOr(relationship['id'], $.model.relationships[k])`. There is a site case and a mutant.

## 3. Blocking: no adoption row or spec version records the changed details

Repaired, with a follow-up:

- Row A-347 in `decisions/AGENT-ADOPTIONS.md` records the behaviour change and its revert command. It strengthens screening only. Every identity detail it changes was untested before, so no existing literal moved. The one literal that moved is a `path-absent` detail naming a denied path, now withheld (note 4).
- The spec delta is a follow-up bead for team-lead. It should state:
  - (a) a finding detail names a draft identity only where it is a handle, and otherwise names the member's path or the words "named here", with the fallback fixed per detail family (finding 11);
  - (b) every detail is screened whole and word by word against the detectors, and each word against the denied-path rules. A match, or a case screening cannot decide, is replaced by `Finding detail withheld under source screening.`, keeping kind and `at`;
  - (c) the per-builder fallback words as built (listed in the PR body).
- No spec text was edited in this code lane.

## 4. Note: denied paths in a detail

Changed: the screen now withholds them. `screenFindingDetails` takes a `deniedWord` predicate, and check passes `screen.screenPath(word) === 'denied-path'`. So a word the policy denies as a path is withheld even where no detector matches it: a basename (`id_rsa`), a suffix (`server.pem`, `credentials.json`) or a directory.

- The predicate reads words only. A whole sentence is no path.
- A throw in either predicate withholds the detail.
- Tests cover all three denied ids through check, and the unit block covers the rule and its throw.
- This is stricter than the derived-base screening adopted in 2.35, which still admits denied paths in its own details. The spec delta should state both.
- One pinned literal moves with it, and only tighter. In `render.test.ts`'s two-stage table, a `path-absent` finding on a denied path that is absent (`denied/gone`) quoted the path, and now its detail is withheld. The table's own no-looser comparison against the predecessor still passes.

## 5. Note: false positives

Accepted and documented in the PR body. A diagram or element whose id is `token`, `secret`, `password`, `passwd` or `api-key`, followed by a word of 8 or more characters, can match `credential-assignment`. The detail is then withheld, failing safe, and the finding keeps its kind and `at`. Quoting every bare `<id>:` form would change many adopted detail literals, so that is left to the spec delta.

## 6. Note: `at`, `blockId`, `citationId` and advisories carry draft values

These pre-date this change and are not changed here. They go to a follow-up bead (P2) to screen `at` segments, `blockId`, `citationId`, the worth-knowing and reader-advice members, the figure advice's `diagram`, and the record's `sessionId`.

## 7. Note: a passing draft renders token-shaped handle ids

This pre-dates the change and is not changed here. It goes to a high-priority follow-up bead: at check, an identity the screen withholds draws a finding with a fixed detail, so such a draft cannot pass. Renaming at render would break anchors and claim parity.

## 8. Note: test rigor

Repaired.

- A table-driven test feeds a path-like and a token-shaped value through check to every builder line that names a draft identity: the 34 of the first change, plus the 5 walk lines and the base-end line of findings 1 and 2.
  - Each case names the finding it must draw.
  - No finding's detail may hold either value.
  - A path-like value may instead draw the schema finding at that member, and a refusal may not name either value.
- The runner has one generated mutant per builder line, 40 in all. Each guard is removed: `identityWords(x)` becomes `JSON.stringify(x)`, `handleOr(x, f)` becomes `String(x)`, and `isHandle(x)` becomes `true`.
- Run 3 killed 49 of 60, and six of its survivors are now killed by added cases. The other five are recorded as equivalent: lines that no value but a handle reaches, because the schema refuses any other value first (each reason is in the runner). The guards stay as defence in depth.
- New mutants:
  - the four delimiter characters;
  - the denied-word rule;
  - a discarded result (the write-back loop removed);
  - the memo key shared between whole details and words;
  - a throw admitted.
- A unit block tests:
  - the delimiter class, including `-`, `.`, `$` and `:`, which do not split;
  - the undecided and denied cases;
  - order and identity of admitted findings;
  - a throwing screen;
  - 200,000 findings in one call.
- Not added: a bounded-record case and an inventory case.
  - Both reach the screen through `checkSubject`, before every consumer, as the review's note 4 confirms by reading.
  - The `screen-result-discarded` and `backstop-dropped` mutants are killed at that single call site.

## 9. Note: performance

Repaired. Each distinct value is screened once per call, the whole detail and its words keyed apart. 200,000 identical details cost nine screen calls.

Check also wrote the screened findings back with `findings.splice(0, n, ...screened)`. That spreads every finding into one call, which AGENTS.md bounds by the stack ("Never hand a whole array to one call"). It now writes them back one at a time.

## 10. Note: byte stability

No change needed.

## 11. Note: wording consistency

Routed to the spec delta of finding 3. The fallbacks as built:

- the path for bare `<id>:` forms (hero, figure plan, model, walk);
- "named here" for identity references;
- "a value" for `whySection` under Poles.

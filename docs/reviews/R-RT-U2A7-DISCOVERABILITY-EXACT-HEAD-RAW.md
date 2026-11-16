# R-RT-U2A7 discoverability exact-head review (AC11) — RAW
Subject: PR #585 (`agent/syzygy-u2a.7`), diff 3353b2e6..58f8a1c4 — evidence-backed repository discoverability, required planes, machine `entry` (folds `syzygy-s6cp`)
Reviewed commit: 58f8a1c4655b5b0a0a4004dc1e841c6129856253
Verdict: REVISE
Date: 2026-11-03

Scope: [Observed] Fresh-context PR-review worker pass (review bead `syzygy-wves`, implementation bead `syzygy-u2a.7`), acceptance criterion 11: dependency, security, determinism and interface. Governing text read: the bead's description and design; Task 6 of `docs/superpowers/plans/2026-08-24-cap1-runtime-hardening-followups.md` (lines 1143–1335); CAP1-REQ-050 and CAP1-REQ-051 in the adopted Capability 1 spec; the owner-decision bead `syzygy-u2a.14` and `syzygy-s6cp`. The PR body was not taken as evidence; each claim below was checked against the diff, a probe, or a run in a detached scratch worktree at the reviewed commit (`npm ci` first).

## Verdict reasoning

The dependency admission, the read order, the snapshot manifest, the removal of the old interfaces and the two-channel parity all hold. Two defects in the link classifier change served answers:

- F1: links that do not point at the entry are classified as unclassifiable, and that hides every repository's finding.
- F2: a whitespace-split href gives a false `no`.

The design rule is "Unclassifiable target-looking -> unavailable, never no". F1 breaks the "target-looking" half and F2 breaks the "never no" half. Both are current-PR correctness defects in `readme-links.ts`.

## Findings

### F1 — Medium — over-broad `ambiguous-target` makes the whole plane unavailable from unrelated links

Location: `packages/cap1-daemon/src/readme-links.ts:100-111` (`decodedSegments`), `:188` (`classifyAbsolute`) and `:221-222` (`classifyHref`).

[Observed] The backslash, encoded-separator and malformed-escape tests run on every href before anyone asks whether that href could name the entry. `pipeline.ts` `discoverabilityPlane` then returns the unavailable plane for the whole project. Probe at the reviewed commit, with `NO_LINK_CONTEXT`:

```
[![npm](https://img.shields.io/npm/v/x.svg)](https://www.npmjs.com/package/%40scope%2Fname)
  -> {"state":"unclassifiable","reason":"ambiguous-target","href":"https://www.npmjs.com/package/%40scope%2Fname"}
Coverage is [100%](https://example.com/cov/100%)
  -> {"state":"unclassifiable","reason":"ambiguous-target","href":"https://example.com/cov/100%"}
[docs](docs\guide.md)
  -> {"state":"unclassifiable","reason":"ambiguous-target","href":"docs%5Cguide.md"}
```

The existing test `the first unclassifiable anchor is named when none qualifies` (`readme-links.test.ts`) pins this: `[b](x%2Fy)` is a link with no relation to `.syzygy/intent/OVERVIEW.md`, and the test expects it to be ambiguous.

Effect:

- A README that does not link the entry, but does link a scoped npm package, gets no `no` finding. That README is the CAP1-REQ-051 "Declined link is a truthful no" scenario.
- Every other declared repository's finding is suppressed with it.
- CAP1-REQ-050's falsifier includes "a finding missing for a declared repository".

The design (`syzygy-u2a.7` DESIGN, "Unclassifiable target-looking -> unavailable, never no") limits the unavailable outcome to target-looking hrefs. The module's own header limits climb and collapse to "onto the entry", but it gives the hazard checks no such limit.

Repair direction: make an href ambiguous only when one of its possible readings is the entry. Possible readings include the decoded and undecoded forms, a backslash read as a separator, and a case-folded path. Add `no` cases for unrelated hrefs that carry hazards.

### F2 — Medium — tab or newline inside an href yields a false `no` (fail-open)

Location: `packages/cap1-daemon/src/readme-links.ts:212-223` (`classifyHref`) and `:184-196` (`classifyAbsolute`).

[Observed] The WHATWG URL parser removes ASCII tab and newline from anywhere in the input, so a browser opens the entry for both of these. The reader says `no` for both:

```
<a href=".syzygy/intent/OVER&#9;VIEW.md">x</a>                                   -> {"state":"classified","linksToEntry":false}
<a href=".syzygy/intent/OVER&#10;VIEW.md">x</a>                                  -> {"state":"classified","linksToEntry":false}
<a href="ht&#9;tps://github.com/o/r/blob/main/.syzygy/intent/OVERVIEW.md">x</a>  (locator o/r, main) -> {"state":"classified","linksToEntry":false}
```

This is a `no` for a link that a renderer would follow to the entry, which is the outcome the module header says it rules out ("the reader cannot say what a renderer would open, so it says so"). No test covers internal whitespace or control characters.

Repair direction: remove ASCII tab and newline the way the URL parser does, or treat any C0 control character inside an href as ambiguous when the cleaned href would name the entry.

### F3 — Low — a trailing slash on the entry counts as `yes`

Location: `packages/cap1-daemon/src/readme-links.ts:124-128` (`normalize`).

[Observed] `[x](.syzygy/intent/OVERVIEW.md/)` returns `{"linksToEntry":true}`. The comment calls the trailing empty segment "a directory". A directory-form URL is not the entry file, and forges differ on whether it resolves. That makes it ambiguous at best; it is not a `yes` resting on evidence (CAP1-REQ-051).

### F4 — Low (owner routing) — a plane-wide `unavailable` state against CAP1-REQ-050's per-repository finding

Location: `packages/cap1-daemon/src/pipeline.ts` (`discoverabilityPlane`, the early `return judgment.plane`).

[Observed] Plan Step 6 says "unclassifiable target makes the plane unavailable", and the code does exactly that. CAP1-REQ-050's oracle is "one finding per declared repository", and its falsifier names "a finding missing for a declared repository". Under the plane-wide state, an unclassifiable link in one repository removes the findings for all of them.

[Inferred] This is a conflict between the plan and the spec, not an implementer's error. A per-repository `Unknown` row would also need a reason in the closed vocabulary, and choosing one is a vocabulary question. Either way it goes to the owner. F1 makes the conflict far more reachable today.

### F5 — Low — the `/entry` not-read sentence names consent when no root is declared

Location: `packages/cap1-daemon/src/routes-human.ts` (`renderNotReadEntrySection`); `source-snapshot.ts:578-580`.

[Observed] The capture code is `governanceRoot === undefined || … !== 'admitted'`, and both conditions produce `reason: 'unconsented-governance-root'`. The new sentence then reads "the governance root's observation consent is not admitted".

`degradation.system.test.ts` (commit 58f8a1c4) asserts this sentence for a project with no declaration, which the commit subject calls "an undeclared root". The reason code predates this PR. The served sentence that asserts consent is new here, and when nothing is declared it states something that is not so (VIS-2 honesty of the stated reason).

### F6 — Low — `<template>` content walk is untested

Location: `packages/cap1-daemon/src/readme-links.ts:89-90`.

[Observed] Own mutant O3 deletes `if (node.content !== undefined) anchorHrefs(node.content, out);`. With it applied, `readme-links.test.ts` passes: exit 0, survived. The branch is deliberate, because the comment says template content is a separate fragment, but no case pins it.

### F7 — Low — the reader version string is not tied to the installed pins

Location: `packages/cap1-daemon/src/readme-links.ts:38-39`.

[Observed] `README_LINK_READER_VERSION` is a literal, and `CaptureVersions.markdownParser` takes it into the manifest. The only test compares it to another literal. Bumping `marked` or `parse5` in `packages/cap1-daemon/package.json` would keep the old string, so the snapshot manifest would name a parser that did not run. A test that reads both packages' installed `version` fields would close this. The exact pins limit the risk, and `yamlParser` follows the same earlier pattern.

### N1 — Note — locator present: entry-ending absolute links that miss the locator give `no`

[Observed] With the locator `https://github.com/o/r` on `main`, these all return `no`:

- `http://github.com/o/r/blob/main/<entry>`
- `https://github.com/O/R/blob/main/<entry>`
- `…/blob/dev/<entry>`
- `…/tree/main/<entry>`

This matches the plan's literal text ("Absolute links count only through captured canonical repository locator context"). It is latent today, because `main.ts` supplies no locator (`syzygy-u2a.14`). Raise it in that owner decision: when the dialect is locator-exact, an entry-ending link that misses on scheme, case or ref is target-looking.

## Checks that hold

- Dependencies:
  - [Observed] The lock adds exactly 3 `node_modules/` entries (`git diff … -- package-lock.json | grep -c '^+    "node_modules/'` gives 3): `marked@18.0.10`, `parse5@8.0.1` and `entities@8.1.0`. The first two are exact in `packages/cap1-daemon/package.json`. The third is a transitive dependency, `parse5` → `entities: ^8.0.0`, and the lock fixes it at 8.1.0.
  - [Observed] Each lock `integrity` equals `npm view <pkg>@<ver> dist.integrity`, and none carries `hasInstallScript`.
  - [Observed] None of the three installed `package.json` files has a `preinstall`, `install`, `postinstall` or `prepare` script. `marked` has no dependencies, and `npm ls` shows one path for each.
  - [Observed] The pins match the plan's Step 1 command and its `README_LINK_READER_VERSION` literal.
- Bundle and egress:
  - [Observed] The full `npm test` run includes the S10 bundle tests (`no-egress.test.ts`, whose aliases include `@syzygy/cap1-daemon`). Its log reads `no-egress proof ran under strace: 14 network-class calls, traced calls from 1 task(s), 0 Internet-family`.
  - [Observed] `package.test.ts` pins the daemon barrel's new names, and the workspace-reach and product-build tests pass in the same run.
- HTML intermediate:
  - [Observed] `marked`'s output is a local in `extractReadmeEntryLink`. It goes only to `parseFragment`, and only href strings leave the function.
  - [Observed] Those href strings reach output in two places, `data-unclassifiable-href` and the `<code>` text of the unavailable plane, and both pass through `escapeHtml`. A private `Marked` instance is used.
- Read order:
  - [Observed] `source-snapshot.ts` reads `README.md` only in the admitted, root-present, non-observed-source branch, through `readRecorded`, so the read is revalidated. Refused and observed-source repositories get `not-read` descriptors.
  - [Observed] `pipeline.ts` `readmeJudgment` checks role, then consent, then README.
  - [Observed] Recorded mutants M5 and M8 cover the capture side, and M2b covers core.
- Determinism:
  - [Observed] The manifest descriptors cover `readme` and, when a locator is supplied, `link-context`. `markdownParser` is in `CaptureVersions`.
  - [Observed] `source-snapshot.test.ts` mutates the README bytes, the link context and the parser version, and each mutation changes the digest. It also asserts the same snapshot and the same evaluation JSON across repeated captures.
  - [Observed] The repeated-call determinism case in `readme-links.test.ts` passes.
- Removed interfaces:
  - [Observed] `git grep -E "getDiscoverability|getAuthorityExposures|OPEN_PROPOSALS|observeReadmeEvidence"` outside `docs/evidence`, `docs/reviews` and `.beads` finds one hit: the plan's own instruction to remove `OPEN_PROPOSALS`. The other hits are retained historical evidence and raws, which are not edited.
  - [Observed] `computeDiscoverabilityWithProposal` remains in core with conformance callers. It was not on the removal list.
- Required planes and machine `entry`:
  - [Observed] The shapes match the plan's `AuthorityPlane`, `ProposalPlane` and `EvaluatedProjectPlanes`.
  - The deviations are disclosed in the PR body: the unavailable discoverability arm drops `snapshot-input-unavailable` and adds identifying fields.
  - [Inferred] The machine `entry` serves only the captured entry, which was already served on `/entry` under the same consent. It is the `syzygy-s6cp` acceptance surface, not new interface.
- Absent locator:
  - [Observed] With no `linkContexts`, a target-looking absolute or protocol-relative link gives `repository-locator-unavailable`. The plane is then unavailable, never `no` (recorded mutants M3 and M4).
  - [Observed] `main.ts` is unchanged and passes none, which is the honest state while `syzygy-u2a.14` is open.

## Mutations re-run (rule 6)

Method: replace exactly one occurrence of `old` with `new`, run `npx vitest run <tests>` with `TMPDIR=/tmp/r585/t`, then restore. The scratch tree came back clean (`git status --short`: only an untracked `.beads.gate.lock`).

| id | source | file | outcome |
|---|---|---|---|
| M1-substring-extraction | recorded | readme-links.ts | killed (exit 1) |
| M3-unclassifiable-served-as-no | recorded | pipeline.ts | killed (exit 1) |
| M4-absolute-without-locator-ignored | recorded | readme-links.ts | killed (exit 1) |
| M7-root-escape-not-ambiguous | recorded | readme-links.ts | killed (exit 1) |
| M9-not-read-entry-as-unreadable | recorded | routes-human.ts | killed (exit 1) |
| M12-case-variant-counts | recorded | readme-links.ts | killed (exit 1) |
| O1 drop `/%(?:2f\|5c)/i` from `decodedSegments` | own | readme-links.ts | killed (exit 1) |
| O2 drop the raw-backslash test from `decodedSegments` | own | readme-links.ts | killed (exit 1) |
| O3 drop the `<template>` content walk | own | readme-links.ts | **survived** (exit 0), see F6 |
| O4 never mark an interior empty segment irregular | own | readme-links.ts | killed (exit 1) |

The recorded `old`/`new` fragments come from `docs/evidence/syzygy-u2a-7/mutations-2026-11-03.json`, and each one occurred exactly once at the reviewed commit.

## Gates at the reviewed commit (scratch worktree, `TMPDIR=/tmp/r585/t`)

- `npm ci`: exit 0
- `npm run typecheck`: exit 0
- `npm test`: exit 0. 258 test files passed and 3 were skipped (261). 6086 tests passed and 5 were skipped (6091).
- `npm run test:system`: exit 0. 11 test files passed and 1 was skipped. 57 tests passed and 1 was skipped.
- `SYZYGY_FRESH_CLONE=1 npm run test:system`: exit 0. 12 test files and 58 tests passed.
- `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `gh pr checks 585`: `checks` pass, `node` pass.

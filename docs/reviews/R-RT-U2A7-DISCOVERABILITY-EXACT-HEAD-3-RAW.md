# R-RT-U2A7-DISCOVERABILITY-EXACT-HEAD-3 — independent review of PR #585
Verdict: REVISE
Reviewed commit: ffc8263165a2d77ef425acfd7dbbe05cc5611b89
Base: 076b9c1feb2ada48c001b6c14f8377ba51c101a4

Date: 2026-11-17
Subject: PR #585 (`agent/syzygy-u2a.7`, `syzygy-u2a.7`), round-2 repairs `2a48248f5..ffc82631` (f08277fd, acbd7170, f6efa9d3, 7977cd07, d9c21448, ffc82631), under owner answer `pr585-round3` A (`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md:166-179`).
Base note: [Observed] `origin/main` at review time is 076b9c1f; the head's merge base is c46f8fc9. The two main commits between them touch no path under `packages/cap1-daemon`, `packages/cap1-core`, `packages/cap1-system`, `docs/design` or `package-lock.json` (`git diff --stat c46f8fc9c origin/main -- …` is empty).

Method: [Observed] Fresh context. Detached worktree `.worktrees/review/r-585-3` at the reviewed commit, `npm ci` first, `TMPDIR` in a private scratch directory. The PR body and commit messages were read as claims, not as evidence. Each claim below was checked against the code, a probe, a mutant or a gate run at the reviewed commit. Probe test files were written into the worktree only for the run and deleted; `git status --short` is empty at the end.

## Verdict reasoning

Five of the six round-2 findings close, and the CAP1-REQ-012 route is in place on both channels. All 9 mutants I ran (7 recorded, 2 of mine) were killed, and `npm run check`, `npm run test:system` and `check_governance.py` are green.

One defect remains that changes served answers, and it sits inside the class the owner directed this round to close (N1–N3, "decided the way a browser resolves it"). The classifier treats a same-scheme href followed by `/` (`https:/…`) as repository-root relative. The WHATWG parser, and so a browser, resolves it against the host root. That gives a false `yes` and a false `no` (R3-1). A test pins the false `yes`, under a comment saying each expected value is what a browser would open. Under owner answer `pr585-round3` A this verdict parks the PR.

## Round-2 findings

| id | round-2 finding (quoted) | repair at ffc82631 | status |
|---|---|---|---|
| N1 | "the F1 repair lets backslash network-path hrefs fall to `no`" | `readme-links.ts:236-270` `resolveHref` (two sentinel hosts, two sentinel roots), `:341` `hasHazard`, `:359` `hazardReadings`; tests `readme-links.test.ts:266-277` | Closed. Each of the four round-2 hrefs gives `ambiguous-target`, with and without the locator. My probe (below) found no backslash network-path form that gives `no` |
| N2 | "leading or trailing Unicode whitespace gives a false `yes`" | `readme-links.ts:331` `URL_EDGE` (C0 and U+0020 only), `:338` `EDGE_SPACE`, `:362` trimmed reading; tests `:279-296` | Closed. NBSP, BOM, U+2003, U+3000, U+2028 and U+200B at either end gave no false `yes` in the probe |
| N3 | "the absolute-URL path split diverges from WHATWG authority parsing" | Authority and path now come from `new URL` (`classifyAbsolute`, `:276-292`); tests `:305-318` | Partly closed. `https://forge.example\owner/…` gives `ambiguous-target`; `https:///forge.example/…` with the locator gives `yes`, which matches the parser. The same-scheme repair opened R3-1 |
| N4 | "F5's new sentence is untrue when the declaration is invalid or unreadable" | `source-snapshot.ts:208-228` `EntryNotReadReason` / `entryNotReadReason`; `routes-human.ts:925-931` `NOT_READ_ENTRY_CAUSE`; tests `source-snapshot.test.ts:262` | Closed. Five states, five sentences, each naming only its own cause. Recorded mutants S1, S2 and H2 cover the arms; I re-ran S2 and added O2 (unreadable sentence says "failed validation"), both killed |
| N5 | "the undeclared arm keeps primary Unknown reason #6, whose route is 'Record consent'" | `pipeline.ts:122-171` `NotReadEntry`, `notReadEntry` | Closed. Missing, invalid and no-root report #1 `missing-declaration`; for the unreadable arm see Q1 below |
| N6 | "the reviewed interface page still freezes a single not-read reason" | `docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md:332-337`, `:374-387` | Closed. Both stale sentences are marked in place, dated, the old text kept, the five-value set and the digest consequence named |
| REQ-012 | (owner answer: "the CAP1-REQ-012 consent-resolution route is added") | `pipeline.ts:162-168` `resolutionRoute: UNCONSENTED_RESOLUTION_ROUTE`; `routes-human.ts:933-946` `data-policy-resolution-route` and the route sentence | Closed for the entry. Recorded P3 and H1 cover it; I re-ran H1, killed on the unit and integration tiers |

### The coordinator's three engineering calls

- Q1, an unreadable declaration reports #10 rather than #1: sound on the merits. [Observed] RFC2-24 #1's condition is "No governing declaration (capability, topology, mapping, policy) exists" (`rendering-vocabularies.md`, RFC2-24 table row 1). An unreadable file establishes neither existence nor absence. `observation.ts:113-125` already maps `declaration-unreachable` to `source-uncaptured-or-unreachable` ("ABSENCE OF EVIDENCE, not evidence of absence"). Reporting #1 there would serve evidence of absence that the capture does not hold (VIS-2). The invalid arm keeps #1, which matches core's `registerProject` (`cap1-core/src/declaration.ts:338-345`, an invalid read gives `missing-declaration`). The owner's words were "the undeclared arm reports RFC2-24 reason #1", and this call narrows them for one state. It is disclosed in the PR body; the owner should hear it named (note R3-N4).
- Q2, N6 by dated in-place stale marks: sound. [Observed] No performed act's manifest or acceptance record names the page. Of every file on `origin/main`, only `docs/reviews/R-RT-U2A2-CONSENT-ENCODING-INTERFACE-2-RAW.md` cites the digest of its pre-edit bytes. Under rule 10 that review now confirms history only, as the PR body says. The marks follow the AGENTS.md "mark staleness at the stale sentence" form.
- F7, the version test follows Node's resolution order: sound. [Observed] `packages/cap1-daemon/node_modules/parse5` is 8.0.1 and the root `node_modules/parse5` is 8.1.0. The test (`readme-links.test.ts:41-60`) reads the nested copy first in both the lock and the install, and it asserts that the two agree on which copy exists. Recorded canary F1 (root-only reading) was killed when I re-ran it.

## New findings

### R3-1 — revise (Medium) — `https:/…` is read as repository-root relative, against the WHATWG parser: false `yes` and false `no`

Location: `packages/cap1-daemon/src/readme-links.ts:244-256` (a leading scheme equal to the base scheme is stripped, and the rest is `rooted` if it starts with `/`), the module comment at `:19-23` and `:233-235` ("a root-relative href (a leading `/`, or the base's own scheme then `/`) is repository-root relative, as a forge renders a README"), and the test `readme-links.test.ts:313` (`['same-scheme root-relative', 'https:/.syzygy/intent/OVERVIEW.md']` → `yes`).

[Observed] Node 24.6.0, at the reviewed commit:

```
classifier, NO_LINK_CONTEXT and LOCATOR alike:
[x](https:/.syzygy/intent/OVERVIEW.md)                          -> {"state":"classified","linksToEntry":true,"qualifyingHref":"https:/.syzygy/intent/OVERVIEW.md"}
<a href="https:/.syzygy/intent/OVERVIEW.md">                    -> {"state":"classified","linksToEntry":true,…}
[x](https:/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md)     -> {"state":"classified","linksToEntry":false}
<a href="https:\owner\repo\blob\main\.syzygy\intent\OVERVIEW.md"> -> {"state":"classified","linksToEntry":false}

WHATWG parser:
new URL("https:/.syzygy/intent/OVERVIEW.md", "https://forge.example/owner/repo/blob/main/README.md").href
  = https://forge.example/.syzygy/intent/OVERVIEW.md                  (host root: not the entry)
new URL("https:/.syzygy/intent/OVERVIEW.md", "https://forge.example/owner/repo").href
  = https://forge.example/.syzygy/intent/OVERVIEW.md
new URL("https:/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md", <either base>).href
  = https://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md   (the entry)
```

So:

- `https:/.syzygy/intent/OVERVIEW.md` is served `yes`. A browser opens `https://<forge>/.syzygy/intent/OVERVIEW.md`, which is not the entry. The `yes` does not rest on evidence of a link to the entry (CAP1-REQ-051). The test at `:313` pins this `yes`, under the describe comment at `:260-262`: "Each expected value below is what a browser would open, or ambiguous-target where renderers disagree." For this row that sentence is false.
- `https:/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md` is served `no`, and so is its backslash spelling `https:\owner\…`. A browser opens the entry. The module's own rule is "unclassifiable, never no" for a target-looking link. Both forms give `no` with no locator, the case that is live today because `main.ts` supplies no locator.

[Inferred] The comment's premise, that a forge renders `https:/x` as repository-root relative, is not observed anywhere in the PR. A forge's relative-link rewriting would normally skip an href that carries a scheme, which leaves the browser's reading. Whichever way a given forge behaves, the forge reading and the parser reading disagree here, and the module's rule for a disagreement is `ambiguous-target`, never `yes` or `no`.

Probe population: [Observed] 2,401 distinct hrefs × 2 contexts (no locator, the test `LOCATOR`) = 4,802 classifications. They are 79 base forms (relative, root-relative, network-path, same-scheme, absolute with case, port, userinfo, trailing dot, other branches, `raw`/`tree`, encoded dots and separators, double slashes, NUL, `;params`, other schemes, non-entry controls), each crossed with 37 wrappers: C0, space and Unicode edge characters (NBSP, BOM, U+0085, U+200B, U+2028, U+3000), interior tab and soft hyphen, all-backslash, `%2F`/`%5C`, a bare `%`, upper case, `.`/`..` and `%2e` segments, scheme case, query or fragment with a backslash or NBSP, an overlong `%C0%AF`, fullwidth `Ｏ`, NFKC. Each href was rendered as `<a href>` with every non-alphanumeric character as a numeric reference. The oracle used the href as `marked` + `parse5` hand it to the classifier: `new URL(href, "https://forge.example/owner/repo/blob/main/README.md")`, plus a forge rewrite of a scheme-less single leading `/` onto the repository root. Results:

- False `yes` (the classifier says `yes` and neither oracle reaches the entry): 13 per context, and every one is an `https:/` (any case) same-scheme root-relative form. Removing the `https:/` forms leaves 0.
- False `no` (the classifier says `no` and an oracle reaches the entry): 33 per context. 17 are the `https:/owner/repo/blob/main/<entry>` family (R3-1). 16 are the scheme-less `/owner/repo/blob/main/<entry>` family (note R3-N2).
- Throws: 0. Forms with no anchor: 0.

Repair direction: read `<scheme>:/x` the way the parser does, as a host-root path. Its path is then judged like an absolute URL: an entry suffix with no locator is `repository-locator-unavailable`, and with the locator it is compared to the locator prefix. Alternatively, answer `ambiguous-target` whenever the forge reading and the parser reading of a rooted href disagree about the entry. Change the `:313` expectation, and add `https:/owner/repo/blob/main/<entry>` and `https:\owner\…\<entry>` as cases with and without the locator.

## Notes (not blocking on their own)

- R3-N1 — note — `https:.syzygy/intent/OVERVIEW.md` (no slash) gives `yes`, which is what the parser gives against the blob README page. Against the repository landing page `https://forge.example/owner/repo` the parser gives `https://forge.example/owner/.syzygy/intent/OVERVIEW.md` [Observed]. Which base applies depends on where the README is rendered and on whether the forge rewrites a scheme-carrying href [Unknown]. Round 2's repair direction allowed "classify the remainder as a relative path", so I do not hold this against the round. `ambiguous-target` would be the more conservative answer.
- R3-N2 — note — a scheme-less `/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md` gives `no`. Under the forge dialect (root-relative onto the repository root, accepted since round 0) it names `owner/repo/blob/main/.syzygy/intent/OVERVIEW.md` in the repository, which is a nested near match, so `no` is consistent with that dialect. A renderer that does not rewrite README links opens the entry. This dialect predates this round and is not a finding here, but it is the same disagreement as R3-1.
- R3-N3 — note — the locator prefix compare is case-sensitive, so `https://forge.example/Owner/repo/blob/main/<entry>` gives `no` with the locator [Observed]. Owner names are case-insensitive on common forges [Inferred]. This is latent (no locator is supplied) and belongs to `syzygy-u2a.14`, which is excluded from this round.
- R3-N4 — note — Q1 serves #10 for an unreadable declaration, where the owner's answer reads "the undeclared arm reports RFC2-24 reason #1". I judge the call right (see Q1 above). The owner should hear that it narrows the answer.
- R3-N5 — note — the discoverability row for an unconsented repository (`basis: consent-not-admitted`) carries the route only through its drawer's coverage-boundary record (`routes-human.ts:449-459`, "a standing policy state; resolution route: record consent"), not on the row text (`:594-595`). The owner's REQ-012 item named the entry. I record this for completeness only.
- R3-N6 — note — a backslash or a NBSP in the query or fragment of an otherwise clean entry href (`.syzygy/intent/OVERVIEW.md?x=\`) is a hazard, so it gives `ambiguous-target` rather than `yes`. That fails closed, by design.

## Mutations (rule 6)

Method: replace exactly one occurrence of `old` with `new`, run `npx vitest run --project <tier> <file>` for each listed test, then restore. Recorded mutants were taken verbatim (old, new, tests) from `docs/evidence/syzygy-u2a-7/mutations-round2-2026-11-17.json`. Before the run, the unmutated baselines passed: `readme-links.test.ts` 90/90, `source-snapshot.test.ts` 30/30, `routes-machine.test.ts` (integration) 14/14, each exit 0. So every non-zero exit below is the mutant's.

| id | source | file | old → new | exits | outcome |
|---|---|---|---|---|---|
| C1-edge-space-not-a-hazard | recorded | readme-links.ts | per record | unit 1 | killed |
| C4-root-relative-off | recorded | readme-links.ts | per record | unit 1 | killed |
| C7-same-scheme-prefix-kept | recorded | readme-links.ts | per record | unit 1 | killed |
| S2-unreadable-folded-into-missing | recorded | source-snapshot.ts | per record | unit 1 | killed |
| P2-unreadable-reason-missing-declaration | recorded | pipeline.ts | per record | unit 1 | killed |
| H1-human-route-dropped | recorded | routes-human.ts | per record | unit 1, integration 1 | killed |
| F1-version-test-reads-root-only | recorded | readme-links.test.ts | per record | unit 1 | killed |
| O1-climbed-flag-dropped | own | readme-links.ts | `    : { kind: 'repository', pathname: clamped.pathname, climbed: true };` → `    : { kind: 'repository', pathname: clamped.pathname, climbed: false };` | unit 1 (`readme-links.test.ts`) | killed |
| O2-unreadable-sentence-says-invalid | own | routes-human.ts | `  'declaration-unreadable': 'the project declaration could not be read, so no governance root is admitted',` → `  'declaration-unreadable': 'the project declaration failed validation, so no governance root is admitted',` | unit 1 (`source-snapshot.test.ts`) | killed |

Population: 9. Killed: 9. Survived: 0. [Observed] C7 is killed by the test that pins R3-1's false `yes` among others, so the recorded kill of C7 does not show that the same-scheme reading is correct. No mutant reaches R3-1; the probe is its evidence.

## Scope

- [Observed] `git diff --name-only origin/main...HEAD` lists no path under `.syzygy/` or `openspec/` (0 of the changed paths).
- [Observed] `2a48248f5..ffc82631` touches 12 files: `packages/cap1-daemon/src/{pipeline,readme-links,routes-human,source-snapshot}.ts` and their tests (`readme-links`, `routes-machine`, `source-snapshot`), `packages/cap1-system/src/{degradation,discoverability}.system.test.ts`, the design page, and the two evidence files. Each one maps to an authorized item. Nothing touches `syzygy-u2a.14`'s locator source (`main.ts` and `linkContexts` are unchanged).
- [Observed] No new dependency. Neither `package-lock.json` nor any `package.json` changed in `2a48248f5..ffc82631`. Against `origin/main`, `packages/cap1-daemon/package.json` adds exactly `marked` 18.0.10 and `parse5` 8.0.1, the pins of the original PR. The lock adds `node_modules/marked` 18.0.10 and nests `packages/cap1-daemon/node_modules/parse5` 8.0.1 and `packages/cap1-daemon/node_modules/entities` 8.1.0. Main's root `parse5` 8.1.0 and `entities` 9.0.0 are untouched. Relative to the pre-rebase lock at `3c30b2e2`, where all three sat at the root, the only change is that parse5 and entities moved into the nested positions.

## Gates at the reviewed commit (review worktree, private `TMPDIR`)

- `npm ci`: exit 0
- `npm run check`: exit 0. Typecheck clean. 189 test files passed; 4,626 tests passed and 1 skipped (4,627)
- `npm run test:system`: exit 0. 11 files passed and 1 skipped (12); 57 tests passed and 1 skipped (58)
- `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)"
- `npm run check:all`: not run, per the brief (the coordinator runs it in a clean clone)
- The gates are green, and they pass with R3-1 present, because the test suite asserts the false `yes`
- `git status --short` in the review worktree: empty after the probes and mutants

# R-RT-U2A7 discoverability exact-head review, round 2 (AC11) — RAW
Subject: PR #585 (`agent/syzygy-u2a.7`), round-1 repairs f5b59f3f (F1, F2, F3, F6, F7) and 363aeaf3 (F5), mutation record 3c30b2e2 — evidence-backed repository discoverability, README link reader
Reviewed commit: 3c30b2e24d3e27a81492dd9d874dc1c348a57b61
Verdict: REVISE
Date: 2026-11-03

Scope: [Observed] Fresh-context round-2 confirmation by a PR-review worker (review bead `syzygy-h9mz`, implementation bead `syzygy-u2a.7`) of the round-1 `REVISE` in `R-RT-U2A7-DISCOVERABILITY-EXACT-HEAD-RAW.md` (on branch `agent/syzygy-wves`, PR #586, at the time of review). F4 and N1 are routed to the owner on `syzygy-u2a.14` and are not re-raised. Each claim below was checked against the diff, a probe, or a run in a detached scratch worktree at the reviewed commit (`npm ci` first, `TMPDIR=/tmp/r585b/t`). The implementer's PR body and commit messages were not taken as evidence. The PR branch was rebased between rounds; the repair diff reviewed is `9210b2e3..3c30b2e2` over `packages/`.

## Verdict reasoning

Six of the seven round-1 findings in scope are closed: F1, F2, F3, F6 and F7, and F5's sentence for the declared-but-unconsented case. Every round-1 probe now gives the answer round 1 asked for. 13 mutants (8 recorded, 5 of mine) were all killed.

Two defects remain that change served answers, so the verdict is REVISE:

- N1: the F1 repair opened a new hole. A backslash network-path href, which a browser opens as an absolute URL ending in the entry, gave `unclassifiable` at round 1. It now gives `no`. That is the outcome the brief told this round to rule out.
- N2: an href with leading or trailing Unicode whitespace (NBSP, BOM, U+2003, U+3000) gives `yes`, but a browser opens a different file. This predates round 1, which did not catch it.

F5's new reason is also untrue in a case the repair did not consider. An invalid or unreadable declaration that does name a governance root is served "no governance root is declared" (N4).

Under the stated stopping rule there is no round 3, so these findings go to the owner.

## Round-1 findings

| id | round-1 severity | status at 3c30b2e2 | evidence |
|---|---|---|---|
| F1 | Medium | Closed as stated; the repair opened N1 | The three round-1 probes (`%40scope%2Fname`, `cov/100%`, `docs\guide.md`) each give `{"state":"classified","linksToEntry":false}` |
| F2 | Medium | Closed | `&#9;`, `&#10;` and `&#13;` inside `.syzygy/intent/OVER…VIEW.md` each give `ambiguous-target`. A tab in the scheme gives `ambiguous-target` with the locator and without it, and so does `&#13;` in a Markdown link destination |
| F3 | Low | Closed | `OVERVIEW.md/`, `OVERVIEW.md/?a`, `OVERVIEW.md%2F` and the locator form with a trailing `/` each give `ambiguous-target` |
| F4 | Low (owner) | Out of scope (`syzygy-u2a.14`) | Not re-raised |
| F5 | Low | Partly closed; see N4 and N5 | The declared, refused root serves the consent sentence. A project with no declaration file serves "no governance root is declared". An invalid declaration serves the same sentence (N4) |
| F6 | Low | Closed | Own mutant O3 (delete the `<template>` content walk) was killed (exit 1) by the new `template content` case |
| F7 | Low | Closed | The new test reads `packages/cap1-daemon/package.json` (exact pin), `package-lock.json` and `node_modules/<pkg>/package.json` for both parsers and rebuilds the version string from them. Recorded mutant R14 covers it; I did not re-run R14 |

## New findings

### N1 — Medium — the F1 repair lets backslash network-path hrefs fall to `no`

Location: `packages/cap1-daemon/src/readme-links.ts:271` (only a literal `//` is treated as protocol-relative) and `:279` (a relative-path hazard asks `hazardReadings(path).some(isEntry)`, which matches only the whole path).

[Observed] For special schemes, the WHATWG URL parser treats `\` as `/`. So `\\host/…`, `/\host/…` and `\/host/…` are protocol-relative absolute URLs. Each of the following resolves against `https://forge.example/owner/repo/blob/main/README.md` to `https://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md` (`new URL(href, base).href`, node 24.6.0).

The classifier, at the reviewed commit and at the round-1 commit 58f8a1c4:

```
<a href="\\github.com/o/r/blob/main/.syzygy/intent/OVERVIEW.md">     NO_LINK_CONTEXT  round 2: {"state":"classified","linksToEntry":false}   round 1: ambiguous-target
<a href="\\forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md">  locator   round 2: {"state":"classified","linksToEntry":false}   round 1: ambiguous-target
<a href="/\forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md">  locator   round 2: {"state":"classified","linksToEntry":false}   round 1: ambiguous-target
<a href="\/forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md">  locator   round 2: {"state":"classified","linksToEntry":false}
control: [x](//github.com/o/r/blob/main/.syzygy/intent/OVERVIEW.md)  NO_LINK_CONTEXT  round 2: repository-locator-unavailable
```

The path has a hazard (a backslash), so it is read through `hazardReadings`. The backslash reading splits it into `[github.com, o, r, blob, main, .syzygy, intent, OVERVIEW.md]`. `isEntry` compares the whole list to the entry, finds no match, and returns `OTHER`.

The no-locator case is live today, because `main.ts` supplies no locator. Its control form, `//github.com/…`, is correctly `repository-locator-unavailable`. The backslash form of the same URL is `no`. That breaks the module's "unclassifiable, never no" rule for a target-looking absolute link.

The Markdown destination form `[x](/\github.com/…)` is not affected: marked encodes it as `/%5Cgithub.com/…`, which no browser reads as a network path. The defect needs a raw HTML anchor, which a README may contain.

Repair direction: treat any href whose first two characters are both `/` or `\` as protocol-relative. Alternatively, have the relative-hazard branch also ask `endsWithEntry` of each reading, and answer `unclassifiable` when the reading would be absolute. Add these hrefs as cases, with the locator and without it.

### N2 — Medium — leading or trailing Unicode whitespace gives a false `yes`

Location: `packages/cap1-daemon/src/readme-links.ts:264` (`rawHref.trim()`).

[Observed] `String.prototype.trim` removes every Unicode white space and line terminator, including U+00A0, U+FEFF, U+2003 and U+3000. The WHATWG URL parser strips only leading and trailing C0 controls and U+0020, and it percent-encodes the rest:

```
[x](&nbsp;.syzygy/intent/OVERVIEW.md)                  -> {"state":"classified","linksToEntry":true,…}  browser: …/blob/main/%C2%A0.syzygy/intent/OVERVIEW.md
<a href="&#xFEFF;.syzygy/intent/OVERVIEW.md">           -> {"state":"classified","linksToEntry":true,…}
[x](.syzygy/intent/OVERVIEW.md&#x2003;)                 -> {"state":"classified","linksToEntry":true,…}  browser: …/OVERVIEW.md%E2%80%83
<a href=".syzygy/intent/OVERVIEW.md&#x3000;">           -> {"state":"classified","linksToEntry":true,…}
```

The browser opens another file for each of these. The served `yes` does not rest on evidence of a link to the entry (CAP1-REQ-051 asks for a `yes` that rests on evidence). The same code was at 58f8a1c4: this is not a regression, but round 1 missed it.

Repair direction: strip only what the URL parser strips (C0 controls and U+0020 at either end). Treat any other leading or trailing white space as a hazard, the same way as an interior control character.

### N3 — Low — the absolute-URL path split diverges from WHATWG authority parsing

Location: `packages/cap1-daemon/src/readme-links.ts:231` (the `^scheme://[^/?#]*` strip) and `:247-251` (the prefix compare runs over the classifier's own segments, not `url.pathname`).

[Observed] Each of these resolves to the entry in node's URL parser, and the classifier gives `no`:

- `<a href="https://forge.example\owner/repo/blob/main/.syzygy/intent/OVERVIEW.md">`, with the locator. The authority regex consumes `forge.example\owner`, so the prefix compare sees `[repo, blob, main, …]`.
- `[x](https:///forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md)`, with the locator. WHATWG skips the extra slashes, but the classifier keeps `forge.example` as a path segment.
- `[x](https:.syzygy/intent/OVERVIEW.md)` and `[x](HTTPS:.syzygy/intent/OVERVIEW.md)`, without a locator. When the base has the same special scheme, a browser resolves these as relative references, so they open the entry. The classifier sees a scheme, treats `https:.syzygy` as one segment, and returns `OTHER`.

The first two cases depend on a locator, so they are latent today, like round-1 N1. The third case is live. All three predate round 1. [Inferred] Whether GitHub's renderer keeps a `https:`-relative href as written is not observed here.

Repair direction: compare against `url.pathname` after the hazard screen, rather than a regex strip. For a scheme with no `//`, either classify the remainder as a relative path or answer `ambiguous-target`.

### N4 — Low — F5's new sentence is untrue when the declaration is invalid or unreadable

Location: `packages/cap1-daemon/src/source-snapshot.ts:584-586`, `:369-372` (`declared` is `undefined` for any declaration that is not read-and-valid), and `packages/cap1-daemon/src/routes-human.ts:927-928`.

[Observed] I wrote a probe in a scratch copy, with the fixture of `source-snapshot.test.ts`. The declaration names `repo-gov` with `role: governance-root`, plus one unknown top-level field, so validation rejects it. The capture's entry is `{"state":"not-read","reason":"undeclared-governance-root"}`, and `/entry` serves:

```
The entry document was not read: no governance root is declared (undeclared-governance-root). Unknown — reason: unconsented-source-or-provider. Nothing is shown in its place.
```

The file does declare a governance root; the declaration failed validation. The same arm is taken when the declaration is unreadable. Round-1 F5 was about a stated cause that is not so (VIS-2). The repair swaps one such cause for another in these two cases.

Repair direction: name the reason by the declaration's state, for example "the project declaration is missing / invalid / unreadable", or keep one neutral reason whose sentence claims nothing beyond "no admitted governance root".

### N5 — Low — the undeclared arm keeps primary Unknown reason #6, whose route is "Record consent"

Location: `packages/cap1-daemon/src/pipeline.ts:119` and `:135`, and the `/entry` sentence above.

[Observed] RFC2-24 says "Reasons are distinct because their **resolution routes** are distinct". Reason #6 `unconsented-source-or-provider` routes to "Record consent". Reason #1 `missing-declaration` ("No governing declaration … exists") routes to drafting. The daemon already serves #1 elsewhere for an undeclared project: `observation.ts:50`, `source-snapshot.ts:223`.

After F5, one served sentence says "no governance root is declared" and then "Unknown — reason: unconsented-source-or-provider". The machine `entry` carries the same pair. The #6 pairing predates the repair, but the repair is what makes the two clauses disagree in one line.

[Inferred] Choosing the primary reason for this arm is a vocabulary decision within RFC2-24's twelve values. It belongs with N4's repair, or with the owner if the plan fixed #6.

### N6 — Low — the reviewed interface page still freezes a single not-read reason

Location: `docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md:331` and `:366-367`.

[Observed] The page says it "freezes the exact … authority-input interface", and it states that otherwise the entry is `{ state: 'not-read', reason: 'unconsented-governance-root' }`. 363aeaf3 widens `CapturedEntry` and `ServedEntry` to `EntryNotReadReason` (two values) and changes the manifest's `failureCode` for every project without a valid declaration. It does not touch the page. The snapshot digest of such projects changes as a result. No committed evidence or test pins one of those digests: `git grep` for either reason string outside `docs/reviews` finds only code, tests, this page, the plan and the new mutation record.

Repair direction: carry the second value onto the page in the same change, or record it as a disclosed deviation.

### Notes (not findings)

- [Observed] Double encoding (`.syzygy%252Fintent/OVERVIEW.md`, `OVERVIEW%252Emd`) gives `no`. One decode yields a literal `%2F` or `%2E` in a filename, which is not the entry. That is consistent with single-decode URL semantics.
- [Observed] Unicode case variants that are not ASCII case variants give `no`: `ſ` (U+017F), `ı` (U+0131), `İ` (U+0130) and a fullwidth `Ｏ`. No case-sensitive forge opens the entry for any of these. [Inferred] A full Unicode case-folding filesystem could open the `ſ` form. I judge that out of reach for a README renderer.
- [Observed] `%2e%2e` traversal: `x/%2e%2e/<entry>` gives `yes`, which matches the URL parser (it resolves to the entry). `%2e%2e/<entry>` above the root, alone or combined with a hazard, gives `ambiguous-target`. `a/%2E%2E\<entry>` in an HTML anchor gives `ambiguous-target`.
- [Observed] Mixed encoding with case, `.SYZYGY%2fintent/overview.md`, gives `ambiguous-target`. An invalid UTF-8 run that keeps the path from naming the entry (`OVER%ffVIEW.md`, `OVERVIEW.md%ff%2F`) gives `no`. The URL parser keeps those bytes too, so `no` is right.
- [Observed] F5's change to the snapshot digest is inside the manifest and is disclosed by the new `failureCode`. The new value is a daemon not-read code carried in `data-not-read-reason`, not an RFC2-24 Unknown reason. The primary `unknownReason` stays inside the closed twelve (but see N5).

## Mutations (rule 6)

Method: replace exactly one occurrence of `old` with `new` (each `old` occurs exactly once at 3c30b2e2), run `npx vitest run <unit tests>` with `TMPDIR=/tmp/r585b/t`, then restore. Recorded mutants were taken from `docs/evidence/syzygy-u2a-7/mutations-round1-2026-11-03.json`. R15 and R16 were run against their unit test only, not the system test. `git status --short` was empty afterwards.

| id | source | file | old → new | outcome |
|---|---|---|---|---|
| R1-relative-hazard-always-ambiguous | recorded | readme-links.ts | per record | killed (exit 1) |
| R4-absolute-hazard-always-other | recorded | readme-links.ts | per record | killed (exit 1) |
| R5-no-backslash-separator-reading | recorded | readme-links.ts | per record | killed (exit 1) |
| R8-controls-ignored | recorded | readme-links.ts | per record | killed (exit 1) |
| R11-directory-form-regular | recorded | readme-links.ts | per record | killed (exit 1) |
| R15-undeclared-folded-into-unconsented | recorded | source-snapshot.ts | per record | killed (exit 1) |
| R16-undeclared-sentence-names-consent | recorded | routes-human.ts | per record | killed (exit 1) |
| M7-root-escape-not-ambiguous | recorded | readme-links.ts | per record | killed (exit 1) |
| O3-template-walk-deleted | own (round 1) | readme-links.ts | `  if (node.content !== undefined) anchorHrefs(node.content, out);\n` → `` | killed (exit 1) |
| O5-absolute-hazard-whole-path | own | readme-links.ts | `hazardReadings(rawPath).some(endsWithEntry)` → `hazardReadings(rawPath).some(isEntry)` | killed (exit 1) |
| O6-bare-percent-trailing-only | own | readme-links.ts | `base.replace(/%(?![0-9A-Fa-f]{2})/g, '')` → `base.replace(/%$/g, '')` | killed (exit 1) |
| O7-control-clean-verdict-passed-through | own | readme-links.ts | `classifyCleanHref(trimmed.replace(CONTROL, ''), locator).kind === 'other' ? OTHER : AMBIGUOUS;` → `classifyCleanHref(trimmed.replace(CONTROL, ''), locator);` | killed (exit 1) |
| O8-directory-form-needs-two-segments | own | readme-links.ts | `(last === '' \|\| last === '.' \|\| last === '..')` → `(last === '' \|\| last === '.')` | killed (exit 1) |

Population: 13. Killed: 13. Survived: 0. No mutant targets N1–N3, since the tests do not cover those hrefs at all; the probes above are their evidence.

## Gates at the reviewed commit (scratch worktree, `TMPDIR=/tmp/r585b/t`)

- `npm ci`: exit 0
- `npm run typecheck`: exit 0
- `npm test`: exit 0; 258 test files passed and 3 skipped (261); 6117 tests passed and 5 skipped (6122). The log reads `no-egress proof ran under strace: 14 network-class calls, traced calls from 1 task(s), 0 Internet-family`. No probe file of this review appears in the log (`grep -c zz-` gives 0)
- `npm run test:system`: exit 0; 11 test files passed and 1 skipped (12); 57 tests passed and 1 skipped (58)
- `SYZYGY_FRESH_CLONE=1 npm run test:system`: exit 0; 12 test files and 58 tests passed
- `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)"
- `gh pr checks 585`: `checks` pass, `node` pass
- The gates are green, and none of them exercises N1–N3: the defects are in hrefs that no test carries

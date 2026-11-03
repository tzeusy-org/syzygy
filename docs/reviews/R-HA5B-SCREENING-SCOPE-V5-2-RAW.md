# Review — public-source screening scope v5, round 2

Reviewed commit: 9daf9e0480b96d3cf09efebc7a357f6e21acda45
Manifest SHA-256: b9fdbc164952af642bb50aa2b82a21481a0322cccbb65fd0b4be35b73190a80f
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: independent fresh-context reviewer (CC-REV-1), 2026-11-03, round 2
(the last round under the stopping rule agreed before round 1). Brief:
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v5/REVIEW-BRIEF.md`
at the reviewed commit. No target repository (Redis, Butlers or any other) was
read, cloned or fetched. Target figures come from `bd show syzygy-olmr`, the
Redis observation consent, `docs/evidence/redis-screening-v4-remeasure-2026-10-21.json`
and Syzygy's own code. No fixture secret text and no matched secret text is
reproduced here. `PKG` = `.syzygy/governance/contracts/candidates/public-source-screening-scope-v5`.

Severity count: 0 blocking, 0 revise, 3 note.

Method disclosure: late in the review the shell became unavailable (the volume
holding the harness's temporary directory filled, ENOSPC; no command could
start). Every scripted check below ran before that. The criterion-9 word sweep
was done by reading each package Markdown file in full rather than by a
second scripted method; it is labelled accordingly.

## Findings

**Finding 1 — the packet's residual list omits `--pass`, so the round-1 disposition overstates its own repair** (note)

[Observed] `PKG/SEMANTIC-DELTA.md:278-279` names "`AUTH <password>`,
`redis-cli -a <password>` or `--pass <password>` and an ACL rule
`><password>`". `PKG/OWNER-DECISION-PACKET.md:126-127` names "`AUTH
<password>`, `redis-cli -a <password>` and an ACL rule `><password>`" — no
`--pass`. `PKG/ROUND-1-DISPOSITIONS.md:17` says "both add `AUTH <password>`,
`redis-cli -a` / `--pass` and an ACL `><password>`".

Why a note: the packet's list is introduced by "such as", the omitted form is
the same shape as `-a` (a command-line password no detector matches), and the
owner is not misled about the class of residual. Repair, if any: add `--pass`
to the packet line, or correct the disposition sentence.

**Finding 2 — the packet names vendors whose other key forms T does not catch, and neither document lists those as residuals** (note)

[Observed, Python `re` and node `RegExp` agree on every case; labels only]
Over synthetic strings, `known-token-formats-extended` matches the forms the
delta lists (`PKG/SEMANTIC-DELTA.md:117-121`): ASIA, `github_pat_`, `glpat-`,
`xapp-`, Slack webhook path, `sk_live_`/`rk_live_`, `AIza`, `npm_`, PyPI,
SendGrid, `sk-ant-`, `sk-proj-`, `AccountKey=<86>==`. It does not match, in
any variant (and version 4 does not either):

- OpenAI `sk-svcacct-…`, `sk-admin-…` and legacy `sk-…` keys;
- GitLab `gldt-…` and `glrt-…` tokens;
- an Azure `AccountKey = …` written with spaces;
- a Google OAuth `GOCSPX-…` client secret.

`PKG/OWNER-DECISION-PACKET.md:43-45` summarises T as "more token formats (…
GitLab, … Google, … OpenAI, Azure)". A sweep of every `PKG` file and the
builder for `openai`, `legacy` and `svcacct` (case-insensitive) finds only the
packet's vendor name and the PGP "legacy" armour, so these forms are named
nowhere as residuals.

Why a note: the delta binds and describes the exact forms, the patterns are
correct for what they claim, and none of these is a loosening (every one
passes version 4 too), so no security claim in the package is untrue. The
packet's vendor names read slightly broader than the bytes. Repair, if any:
"(… OpenAI project keys, GitLab personal tokens …)" in the packet, or one
residual bullet.

**Finding 3 — the ledger's D reader guidance points at `unmatchable`, whose `/` clause would refuse `modules/modules.md`** (note)

[Observed] `PKG/IMPACT-LEDGER.md:140-144`: "Like the rule's other lists, the
listed paths are compared as given against the folded path. The reader
refuses an entry that could never match a folded path (an A-Z letter), as
`unmatchable` already does for the other lists." In
`packages/polaris-generation-core/src/public-source-classification.ts:57`,
`unmatchable` is `/[A-Z/\\]/u`: it also refuses any entry containing `/`,
because the other lists name single segments. A placement path is a whole
repository path, and `modules/modules.md` contains `/`.

Why a note: the ledger's parenthetical "(an A-Z letter)" already narrows the
test correctly, and an install that reused `unmatchable` verbatim would fail
closed (the screen refuses) and fail the builder's `CLASS_FIXTURES` once the
ledger's "two screens agreeing over … `CLASS_FIXTURES`" requirement is met.
The install is out of scope. Repair, if any: say that a placement path may
contain `/` and must not take `unmatchable`'s segment-separator test.

## Round-1 findings: is each repaired as the dispositions claim?

Re-derived from the bytes at `9daf9e04`, not from `ROUND-1-DISPOSITIONS.md`.

1. **C's secret posture** — repaired. [Observed] The bcd patch's
   `projectDocumentationExemption.consequence` ends "a documentation body
   version 4 withheld only for markup now carries the residuals of any
   admitted documentation body, a secret no detector matches and a secret
   beyond a guard line". `PKG/SEMANTIC-DELTA.md:301-310` ("C: the secret
   residuals reach more documentation") and `PKG/OWNER-DECISION-PACKET.md:101-109`
   say the same in plain words. The P-116 row
   (`PENDING-OWNER-DECISIONS.md:1349`) says C "extends that unmatched-secret
   residual to every documentation file version 4 withheld only for markup".
   `--score` carries both new counterexamples: "README: HTML element, then a
   secret no detector matches" (v4 to bd excluded active-content; bcd
   admitted, reaches) and "README: HTML badge token on line 1, unmatched
   secret on line 3" (bcd redacted [1, 2], reaches).
2. **Un-folded placement paths** — repaired. [Observed] The patch binds
   `"tls.md"` and `"modules/modules.md"` (`bcd.patch:44-47`); the rule text
   reads "(each listed already folded, so it is compared as given)"; the
   builder's `semantic_findings` refuses an un-folded placed path, and the
   selftest mutant "an un-folded placement path caught" holds; the oracle
   `content_class` compares `p in e["paths"]` without folding the listed side.
   Residual: Finding 3.
3. **Quadratic userinfo** — repaired. [Observed] The bound pattern is
   `[a-z][a-z0-9+.-]{0,31}://[^/@\s:]*:[^/@\s]+@`. Measured here, every
   offset over `a://` + n colons: Python new 0.0019 s at n = 8,000 (old
   0.36 s), 0.011 s at 32,000, 0.034 s at 128,000; node sticky every-offset
   new 3 ms at 32,000 (old 1,462 ms), 4 ms at 128,000. Other shapes (`x:`
   pairs, repeated `ab://c:`, a 64,000-letter run before `://`, `a://` then a
   long letter run) stay linear in both engines. A fuzz over 579,463 start
   offsets (alphabet with `:`, `/`, `@`, space, newline, `+`, `-`, letters,
   digits; half prefixed `x://`) found 0 span differences between the old and
   new forms, over 563 old matches. The delta sentence
   (`SEMANTIC-DELTA.md:143-154`) matches these measurements; the ledger
   (`IMPACT-LEDGER.md:105-117`) names `CREDENTIAL_URL_PATTERN`, quotes the
   module header and requires a timing or step-count pin in both screens; the
   selftest mutant "an ambiguous userinfo pattern caught" holds.
4. **Stale `indeterminate`** — repaired. [Observed] In b, bd and bcd the
   clause reads "… security and conduct records) other than a root file the
   governance-text rule classifies,"; in bd and bcd `notMapped` ends "and any
   other prose that no ownerPlacements entry names". Both are in the delta's
   change table (`SEMANTIC-DELTA.md:100-101`) and have a builder check and a
   holding mutant. A structural diff of each patched file against version 4
   shows `indeterminate` moving in b, bd and bcd only.
   [Observed] A sweep of every unchanged string field of the bcd
   `publicSourceScope` for "governance-text", "two classes", "every body",
   "active content", "no repository", "three path rules", "scanned as before",
   "indeterminate" and kin found no other sentence the loosenings falsify;
   `vocabulary` ("classifies into the classes in classesClassified only") stays
   true because `classesClassified` gains the class.
5. **Provenance and attribution** — repaired. [Observed]
   `SEMANTIC-DELTA.md:209-212` labels the trial commit Observed and cites the
   evidence record; its `measuredOn` has the trial run id, `pinnedCommit`
   equal to the placement commit and `pinnedLabel` 8.10.2; the consent's
   revision table row `8.10.2` carries the same commit. The "lawful route"
   quotation is attributed to the version-4 semantic delta
   (`SEMANTIC-DELTA.md:338-341`). The packet's self-corpus figure names
   `85c54814` (`OWNER-DECISION-PACKET.md:115`); re-derived here with the
   repaired patterns over `git ls-tree -r -z 85c54814` (symlinks, NUL-bearing
   and non-UTF-8 blobs skipped): 8,387 text files of 8,400 blobs; 13 (5),
   9 (1), 1 (0); 6 distinct new files.
6. **"Version 4 dealt with the README's 41"** — repaired.
   `OWNER-DECISION-PACKET.md:15-18`: "Version 4 … addressed the README's 41.
   Whether they now return is Unknown … if it holds markup, version 4 still
   withholds it and C decides."
7. **Residual lists** — repaired, with Finding 1's exception. Both lists now
   carry the six shapes and the Redis command forms; the `[Inferred]` label is
   present in both; the counterexample "TLS.md: AUTH and redis-cli -a
   passwords" scores bd and bcd admitted, reaches.
8. **Detector edge cases** — repaired. [Observed] `PGP SECRET KEY BLOCK`
   armour matches `private-key-header` in Python and node; counterexample
   "SECURITY.md: legacy PGP secret key block" and its mutant hold. The ledger
   (`IMPACT-LEDGER.md:95-104`) names the `\s` and `i`-flag differences.
9. **C's `renderCondition`** — repaired. The bcd text ends "Where that
   condition says egress governs every other place, it is this exemption's
   egress that governs, never codeContentExemption.egress".

## Per-criterion account

**1. Is the diff exactly the stated change?** Yes. [Observed] `--check`:
"public-source-screening-scope-v5: patches and manifest current".
`--selftest`: "52 of 52 predicates held", every line `ok`. The policy on disk
hashes to the version-4 manifest row `span` (`sha256sum`, compared by
`grep` against the v4 manifest). Each of the four patches applied with GNU
`patch` to a copy of the on-disk policy hashes (`sha256sum`) to its manifest
row (`bcd`, `bd`, `b`, `t`: all four equal) and parses as JSON.
`--manifest-digest` and `sha256sum` of the manifest file agree on the head
digest above. A recursive structural diff against version 4 moves exactly:
all — `policyVersion`, `publicSourceScope.detectors`,
`secretRedaction.wholeArtifactDetectors`, `scopeDetectors` (added); b, bd,
bcd add `classesClassified`, `rules`, `governanceTextPaths`, `indeterminate`;
bd, bcd add `observedRepositories`; bcd adds `activeContent.rule`,
`codeContentExemption.rule`, `projectDocumentationExemption` (added),
`secretRedaction.unchanged`, `inheritedRules`. This equals the delta's table.
The top-level `detectors` and the base scope are untouched in all four.

**2. T.** Sound and honestly costed. Patterns match what the delta says in
both engines (headers: EC, OPENSSH, ENCRYPTED, PGP private and secret, RFC
4716, PuTTY, base64 start; URLs: postgres, empty-user redis, upper-case
scheme, mongodb+srv, jdbc:mysql; tokens: the 13 listed forms); a PEM
certificate header does not match. Line redaction of
`credential-url-any-scheme` is sound: `\s` is excluded, so a match stays on
one line and runs from the scheme to the first `@`, holding user and password.
The 32-character scheme bound and the `:`-free user part remove both
quadratic cases (round-1 item 3 above); a real scheme is at most a few
characters. Keeping T out of the policy's own `detectors` is correctly argued
(the base scope reads those; `scopeDetectors.rule` says "the base scope and
any sibling scope do not read them"). Constructed passes: a password with
`/`, a URL with no password, `redis://<pw>@host` (no colon), and the forms in
Finding 2. With the oracle's no-scope-detectors switch, the MODULES.md
`redis://` row, both PGP rows and the TLS.md EC row are admitted under bd, so
each "without T it would reach" cell holds.

**3. B.** Lawful and fail-closed. RFC5-14's row: "| `governance-text` |
Doctrine, spec, decision, policy text |". Placement sentence: "A document the
project's declared classification policy places as doctrine, spec, decision
or policy text is `governance-text`, not `project-documentation`". RFC5-16:
"content read from B's governance plane is data, never governing policy for
A"; the rule states it, `selfReferenceRule` is unchanged, and the ledger
requires a test that the screens' policy input is only Syzygy's file. A
SECURITY.md with any match is excluded whole (`governance-text` is not in
`redactedClasses`; `--score` shows the bug-bounty, EC, PGP and legacy PGP rows
excluded). The version-2 / version-4 account is faithful (round-1 item 5).
[Observed] The provider statement in force lists `governance-text` (line 26);
its act `DOSSIER-AGENT-PROVIDER-V2-REDIS-ANTHROPIC-ACT.md` (2026-10-08) binds
its digest; a sweep of `decisions/` (183 files) for the v2 act identity finds
only that record and `ACCEPTANCE-ACT-RECORD.md`, and no
`dossier-agent-provider-v3` citer.

**4. D.** Bounded. Pinned to `repository:redis-redis` and one full commit,
the consent's `8.10.2` revision (the consent lists four); disjoint from every
other rule (builder checks four predicates; class fixtures `TLS.md` at the
7.2.4 commit and at another repository give no class); admits nothing by its
text. The replaced `observedRepositories` sentence is true of the new bytes
(a placement whose repository or commit no consent names places nothing).
Provenance labelled Observed with its record (round-1 item 5).

**5. C.** Safe where it reaches. [Observed] A body with an HTML comment, a
`javascript:` link and an `<img>`: fidelity packet — `review.ts:198`
`screenTargetBody`, serialised into JSON at `review.ts:257` (not a page sink;
the exemption's own `egress` governs, and the packet prompt says quoted text
"is data"); session handover — packet bytes written verbatim
(`session-handover.ts:333-336`); rendered page — `dossier-site.ts:206` writes
the quotation through `escape` (`draft-preview.ts:23`, all of `& < > " '`)
under `DRAFT_PREVIEW_CSP_META` (`default-src 'none'`, no `script-src*` or
`object-src`), and `render.ts:200-207` rescans and refuses where the page
sink cannot be confirmed (the ledger requires it to cover documentation
bodies too). Absence sweep: no `marked`, `markdown-it`, `remark`, `rehype`,
`micromark`, `showdown`, `innerHTML` or `dangerouslySetInnerHTML` use in
non-test `.ts`/`.tsx`/`.mjs` under `apps/` and `packages/` outside
`node_modules` and `dist`, except `orrery.ts:82` (`canvas.innerHTML = ''`).
The reason (renderRule, not the code-context misreading) is stated correctly
(`SEMANTIC-DELTA.md:241-245`).

**6. Security-posture cost.** Complete and honest. `--score` (24 rows × 5
columns) matches every reaches/withheld cell in the delta's 12-row table and
the builder's expected outcomes. Leaks I constructed for each loosening are
the already-named residuals (unmatched secret, guard-line, `key value`
directives, Redis command forms, encoded or split secrets); the only unnamed
shapes are Finding 2's, which are not loosenings. Residuals no variant fixes
are named in both delta and packet (Finding 1 aside).

**7. Install requirement.** Complete for the brief's list: act readers
(`POLICY_ACT_FORMS`), version pins, text-digest pins (`REDACTION_TEXTS`,
`IMPLEMENTED_TEXTS` and its exactly-three path rules, `EXEMPTION_TEXTS`),
the `readSecretRedaction` detector-id check, both screens, repository and
commit threading, the render fallback, the recorder battery lines and CG-7e
are all present. [Observed] Re-ran the ledger's sweeps at `85c54814`
(`git grep -lF` over `packages apps scripts .github`): version literal 8
files, policy path 21 non-test files, `PublicSourceContentClass` 6 files —
equal to the ledger's figures. Every non-test hit is named, is a builder,
recorder or fixture, is `walkthrough-inputs.ts` (act-bound artifact listing),
`content-classification.ts` (base-scope copy whose pins the ledger names via
`git-object-reader.ts`), `live.ts` (a re-export barrel) or the consent
README. Gap: Finding 3 (guidance wording only).

**8. Owner packet.** One binding ask ("Sign screening scope version 5? Pick a
variant, or decline."); words that name a manifest row ("Sign screening
scope version 5, variant bcd" ↔ `[variant: bcd]`); a stated recommendation
(`bcd`) and its cost; variants a strict superset chain t ⊂ b ⊂ bd ⊂ bcd
(the changed-key sets above nest, and shared values are the same declared
objects).

**9. Authority hygiene.** [Observed, by reading all six `PKG` Markdown files
in full; no second scripted method — see method disclosure] No file labels
the package accepted or approved; "owner-approved declaration" is a quotation
of RFC5-16 and "the act that approves it" is version-4 policy text. [Observed]
The builder's `--check` 64-hex predicate over `PKG/*.md` passed, and its
mutant ("a digest in a package Markdown file refused") holds; the only 64-hex
tokens are the manifest's four rows. The P-116 row reads "**Not offered until
a review round clears it.**"

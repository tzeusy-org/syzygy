# Review — public-source screening scope v5, round 1

Reviewed commit: db1fcd37f2adad0cbfb22424dd6e48345cf44530
Manifest SHA-256: 0a772dcc4ff8da289d28a7ef552e1097ba36601c961452fc54738deae432277e
Verdict: REVISE

Reviewer: independent fresh-context reviewer (CC-REV-1), 2026-11-03. Brief:
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v5/REVIEW-BRIEF.md`
at the reviewed commit. No target repository (Redis, Butlers or any other) was
read, cloned or fetched. Target figures come from `bd show syzygy-olmr`,
`bd show syzygy-skpn` and Syzygy's own records. No fixture secret text and no
matched secret text is reproduced here. Paths below are relative to the
working copy root; `PKG` = `.syzygy/governance/contracts/candidates/public-source-screening-scope-v5`.

Severity count: 0 blocking, 4 revise, 5 note.

## Findings

**Finding 1 — C changes the secret posture of documentation, and the package says it does not** (revise)

[Observed] `PKG/SEMANTIC-DELTA.md:271` says "**C: no secret posture change.**
Detectors still run first over the complete body ... and a match is handled
exactly as in version 4." `PKG/OWNER-DECISION-PACKET.md:95` says "C changes
nothing about secrets: detectors still run first." The P-116 register row
(`.syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md:1349`) prices C only
as "C lets hidden HTML comments reach the reviewer as text".

That is true of matched secrets and false of the population. Under version 4
a project-documentation body with any active-content form is excluded whole,
so every secret in it, matched or not, is withheld. Under `bcd` the same body
is admitted (or retained as `redacted-span`), so two residuals that version 4
confined to markup-free documentation now reach every documentation body
version 4 withheld for markup:

- a secret no detector matches;
- version 4's own redaction residual, a secret beyond the guard line
  (`secretRedaction.consequence`: "a secret in such a body that no detector
  matches (one beyond the guard line, or one continuing past it) is
  admitted").

Constructed with the builder's own oracle (`screen()` over `propose()` for each
variant, synthetic bodies, outcomes only):

| Body (synthetic) | v4 | t | b | bd | bcd |
|---|---|---|---|---|---|
| README.md: one HTML element, then `SECRET_KEY = "<unmatched value>"` | excluded (active-content) | excluded (active-content) | excluded (active-content) | excluded (active-content) | admitted, **reaches** |
| README.md: HTML badge with a `token=` URL on line 1, an unmatched secret on line 3 | excluded (active-content) | same | same | same | redacted, line 3 **reaches** |
| LICENSE.txt: `<owner>` placeholder, then a quoted JSON password | excluded (active-content) | same | same | same | admitted, **reaches** |

The builder's own `COUNTEREXAMPLES` row "README: HTML badge carrying a token on
line 1" already shows the shift (v4 excluded, `bcd` redacted [1, 2]), but the
prose reads it as no change. `00-RELEASENOTES` and `LICENSE.txt` are exactly
such bodies for Redis, and README.md may be one too (Finding 6).

Repair: in the delta, the packet and the register row, state that C extends
the unmatched-secret residual and the guard-line residual to every
documentation body that version 4 withheld only for markup. Add one such
counterexample to `COUNTEREXAMPLES` so `--score` shows it.

**Finding 2 — the owner placement lists un-folded paths, which the policy's own matching convention can never match** (revise)

[Observed] `bd` and `bcd` bind `ownerPlacements[0].paths` as `"TLS.md"` and
`"modules/MODULES.md"` (`PKG/proposed/...bcd.patch:44-47`). The rule text
reads: "a path that, compared after the same fold, equals one of the paths of
an ownerPlacements entry" (`bcd.patch:34`). The delta's own gloss
(`PKG/SEMANTIC-DELTA.md:175`) says: "the folded path equals a listed path".

[Observed] The project-documentation rule this extends folds only the blob
path ("Matching compares a copy of the path with its ASCII letters A-Z folded
to a-z"). The shared reader implements that one reading:
`packages/polaris-generation-core/src/public-source-classification.ts:11`
says "The rule's lists are compared, as given, against the ASCII-folded path.
An entry that could never match a folded path (an A-Z letter, a '/' or a
backslash) ... is malformed and refuses the screen" (`unmatchable`, line 57).

Read under that convention, which the delta's gloss repeats, folded `tls.md`
never equals `TLS.md`. D then places nothing, or an install that extends the
convention refuses the whole screen. [Observed] Only the builder's oracle folds both
sides (`content_class`: `p in [v2.ascii_fold(x) for x in e["paths"]]`), and
`CLASS_FIXTURES` (`TLS.md`, `tls.md` → project-documentation) pass only under
that reading. B avoided the problem: `governanceTextPaths` are lower-case, and
the builder checks it ("a governanceTextPaths entry is not a folded root
name"). No such check exists for placement paths.

The failure is closed (nothing is admitted), but the act would bind ambiguous
bytes, and the owner's D could be inert.

Repair: either list the placement paths folded (`tls.md`,
`modules/modules.md`) with a builder check like B's, or say in the rule that
both the blob path and the listed path are folded. Fix the delta's gloss to
match.

**Finding 3 — `credential-url-any-scheme` keeps a quadratic userinfo case; the delta's linearity claim is partial and the ledger omits the install requirement** (revise)

[Observed] `PKG/SEMANTIC-DELTA.md:135-138`: "The scheme is bounded at 32
characters, so a long letter run cannot make the every-offset scan
quadratic." That is true of the scheme. The userinfo half,
`[^/@\s]*:[^/@\s]+@`, is a nested ambiguous quantifier: `:` belongs to both
classes. A failed authority with many colons therefore backtracks
quadratically from each scheme start.

Measured on `a://` followed by n colons with no `@`:

| Engine | n = 2,000 | n = 4,000 | n = 8,000 | n = 16,000 | n = 32,000 |
|---|---|---|---|---|---|
| Python `re` | 0.020 s | 0.073 s | 0.291 s | — | — |
| node `RegExp` | — | — | 85 ms | 360 ms | 967 ms |

[Observed] Version 4's install knew this shape. In
`packages/polaris-generation-core/src/secret-redaction.ts`:

- `credentialUrls` (lines 110-126, "Exact linear recognition for the pinned
  URL pattern ... including those with many colons and no @") replaces the
  regex for the base `credential-bearing-url`.
- That replacement is keyed to the pattern text (`CREDENTIAL_URL_PATTERN`,
  line 53; line 148).
- The module header (line 31) asserts "other declared regexes have no nested
  ambiguous quantifier".

The new pattern differs, so `compileEveryOffsetMatcher` would run it through
the generic sticky path at every offset, up to 32 scheme starts per `://`, and
the header's invariant becomes false. `PKG/IMPACT-LEDGER.md:84-98` names
`compileEveryOffsetMatcher` and the `\s` dialect gap but not this requirement.

[Observed] The plain-regex `detectSecrets` path
(`packages/three-surface-poc-core/src/content-classification.ts:157-166`) is
already quadratic for the base `https?://` form. So this is not a new class of
cost. It is a second instance of one that version 4 repaired on the
redaction path. The per-object bound is `2 ** 30` bytes
(`packages/polaris-dossier/src/git-object-reader.ts:137`), and a public target
is untrusted input.

Repair (zero semantic cost): exclude `:` from the user part,
`[a-z][a-z0-9+.-]{0,31}://[^/@\s:]*:[^/@\s]+@`. Over a random fuzz of 298,296
start offsets (alphabet `ab:/@ .1`, with and without a `://` prefix), Python
`re.match` spans were identical for the two forms (0 differences). The
unambiguous form took 0.0001 s on the 8,000-colon input. Alternatively, keep the
pattern and add the linear recognizer to the impact ledger's T install list.
Either way, correct the delta sentence.

**Finding 4 — the bound `indeterminate` sentence still names root SECURITY and MANIFESTO as indeterminate in `b`, `bd` and `bcd`** (revise)

[Observed] `contentClassification.indeterminate` (policy line 210, unchanged by
all four patches: `grep -c` of the field name finds no hunk) reads:

> "every other admitted blob, including documentation outside the
> project-documentation rule's paths (for example src/README.md), documents
> whose path carries a word of the rule's docExcludedTokens (decision,
> specification, design, governance, policy, security and conduct records),
> ... is indeterminate and is treated as unclassifiable"

`security` and `manifesto` are both in `docExcludedTokens`. Root
`SECURITY.md` and `MANIFESTO` are documents whose path carries such a word. So
in the B variants the bound text says those files are indeterminate, while the
new governance-text rule classifies them. "Every other" can be read to resolve
the conflict, but "including" asserts the opposite. The package replaced
`observedRepositories` for exactly this kind of staleness under D, and per
AGENTS.md a false sentence in act-bound bytes can be corrected only by a
successor act.

A weaker case is in `bd` and `bcd`: `notMapped` still ends "and any other
prose", qualified only for nested READMEs, while root `TLS.md` is now mapped.

Repair: qualify `indeterminate` in the B variants (for example "... outside
governanceTextPaths ...") and add the field to the delta's change table and
the builder's allowed-change check.

**Finding 5 — provenance labels and attributions** (note)

- [Observed] The trial's commit is recorded as Observed in a Syzygy record:
  `docs/evidence/redis-screening-v4-remeasure-2026-10-21.json` has
  `measuredOn.runId` run-6648312f… and `measuredOn.pinnedCommit` equal to the
  placement commit, with `pinnedLabel` 8.10.2 and `label` Observed.
  `PKG/SEMANTIC-DELTA.md:188-191` labels the trial-revision link
  "[Inferred] ... from the bead's 'Redis 8.10.2 trial'". That label is
  conservative, not an overclaim. Cite the record and label the link Observed.
- `PKG/SEMANTIC-DELTA.md:301` attributes "The lawful route is a
  `governance-text` rule and a consent listing that class, a separate package"
  to "the version-4 packet's declined table". The sentence is in the
  version-4 SEMANTIC-DELTA's declined table
  (`public-source-screening-scope-v4/SEMANTIC-DELTA.md:288`). The version-4
  packet (`OWNER-DECISION-PACKET.md:90-94`) paraphrases it.
- `PKG/OWNER-DECISION-PACKET.md:101` gives the self-corpus figure without its
  commit. Re-run here: at 85c54814 the figures reproduce exactly (8,387 files;
  13/5, 9/1, 1/0; 6 distinct new files). At db1fcd37 they are 8,397; 19/11,
  13/5, 1/0, because the package and builder now match.

**Finding 6 — "Version 4 dealt with the README's 41" overstates what is known** (note)

[Observed] `PKG/OWNER-DECISION-PACKET.md:11-13` states it without a label.
`bd show syzygy-skpn` records the post-version-4 measurement as Unknown
("measurement stays Unknown until the next Redis run under v4"). [Inferred]
The trial's screen ran detectors before the active-content scan
(`screen.ts:116-121`), so whether README.md also holds markup was never
recorded. If it does, version 4 still withholds it, and C, not version 4,
decides the 41. The delta's "Why" table hints at this ("and no active-content
exclusion" in the `bcd` cell), but the packet does not. The packet should
mark the 41 as addressed by version 4 with its outcome Unknown, and name
README.md among the files C may affect. The ledger's per-file table already
does.

**Finding 7 — residuals: the packet's list is shorter than the delta's, and both omit Redis-shaped credentials** (note)

- Delta, `SEMANTIC-DELTA.md:244-249`, names six shapes: quoted JSON, JS
  `secretAccessKey`, Django `SECRET_KEY`, https password with `/`, a
  misaligned base64 key, and `key value` directives.
- Packet, `OWNER-DECISION-PACKET.md:103-106` ("Shapes no version catches"),
  names three. Django and `key value` appear elsewhere in the packet, under B
  and D. The misaligned base64 key appears nowhere in the packet.
- [Inferred, from general knowledge of Redis; nothing read] Neither document
  names the Redis-specific forms that D and C most plausibly admit:
  - `AUTH <password>`;
  - `redis-cli -a <password>` and `--pass <password>`;
  - an ACL rule `>password`.

  [Observed, Python oracle] `credential-assignment` matches none of them (no
  `:` or `=`, or no listed keyword), so they pass in every variant.

Naming them would make the D cost concrete.

**Finding 8 — detector edge cases and dialect differences beyond `\s`** (note)

Constructed bodies, each tested in Python `re` and in node `RegExp`. On the
41 realistic cases tested the two engines agree. All of the following pass:

- `-----BEGIN PGP SECRET KEY BLOCK-----` (legacy armour). `private-key-header`
  requires `PRIVATE KEY`. [Inferred] that this form occurs in the wild.
- A JSON-escaped URL, `redis:\/\/:pw@host`.
- A header split across concatenated string literals. This is covered by the
  generic split-secret residual in the `screen.ts` header, not by the delta.
- A scheme of a letter followed by 32 or more digits. No real scheme has this
  shape.

[Observed] The Python oracle and JS screens differ in three ways beyond the
`\s` note in the ledger:

| Input | Python | JS (no `u` flag) |
|---|---|---|
| U+212A (Kelvin sign) as the scheme letter, under the `i` flag | matches | does not match |
| U+FEFF in the userinfo | matches | does not match |
| U+001C–U+001F in the userinfo | does not match | matches |

None of these is a realistic credential. The install's run of the fixtures
through the TypeScript screens (ledger line 95-98) is the right control. Name
the `i`-flag folding beside `\s`.

**Finding 9 — C's `renderCondition` incorporates "egress governs it" from the code-content clause** (note)

[Observed] `projectDocumentationExemption.renderCondition` is
"codeContentExemption.renderCondition, read for a body this exemption names".
That incorporated text ends "Every other place such a body or a span of it
reaches is not a page sink; egress governs it". In its home object, `egress`
is `codeContentExemption.egress`, which says the body "counts as
screening-admitted code-content".

A literal reader could route a documentation body to code-content's
rules at non-page sinks. `class-gate.ts:33` admits code-content with no
statement, so that reading would fail open. The sibling
`projectDocumentationExemption.egress` resolves the reading, and the gate
classifies by `contentClass(path)`, not by this text. Still, "...; this
exemption's egress governs every other place" would remove the ambiguity
before the bytes bind.

## Per-criterion account

**1. Is the diff exactly the stated change?**

- [Observed] `--check`: "patches and manifest current".
- [Observed] `--selftest`: "47 of 47 predicates held". Every mutant printed
  `ok`; the denominator is the selftest's own 47.
- [Observed] The policy on disk hashes to the version-4 manifest row `span`.
- [Observed] I applied each of the four patches with GNU `patch` to a copy of
  the on-disk policy and hashed the result with `sha256sum`. All four equal the
  manifest rows `bcd`, `bd`, `b` and `t`, and each result parses as JSON.
- [Observed] A recursive structural diff of each `propose()` output against
  the version-4 JSON moves only these keys:
  - every variant: `policyVersion`, `publicSourceScope.detectors`,
    `scopeDetectors` (added) and
    `secretRedaction.wholeArtifactDetectors`;
  - `b`, `bd` and `bcd` add `contentClassification.classesClassified`,
    `governanceTextPaths` and `rules`;
  - `bd` and `bcd` add `observedRepositories`;
  - `bcd` adds `activeContent.rule`, `codeContentExemption.rule`,
    `projectDocumentationExemption` (added), `inheritedRules` and
    `secretRedaction.unchanged`.
- This matches the delta's change table. The top-level `detectors` and the
  base `scope` are untouched in all four.
- Exception: Finding 4, a field that should have moved and did not.

**2. T: are the tightenings sound and honestly costed?**

- Patterns: in Python and JS, the realistic header, scheme and vendor-token
  forms the delta lists all match: EC, DSA, ENCRYPTED, PKCS#8, PGP, RFC 4716,
  PuTTY and both base64 starts; postgres, redis with an empty user,
  mongodb+srv, amqp, jdbc:mysql and upper-case schemes; the 13 vendor forms.
  The listed residuals do not match: a password with `/`, a URL with no
  password, legacy OpenAI keys, `AccountKey = ` with spaces.
- A base64 certificate matches `private-key-header`, as the delta's cost
  states.
- Line redaction of `credential-url-any-scheme` is sound. `\s` is excluded, so
  the match is single-line, and it runs from the scheme to the first `@`, so
  user and password are inside or on the matched line.
- The 32-character bound removes the scheme-run case only (Finding 3).
- Keeping T out of the policy's own `detectors` is correctly argued. The base
  scope reads them, and `inheritedRules` plus `scopeDetectors.rule` confine T
  to this scope. [Observed] Neither instruction-text file
  (`prompts.ts`, `provider-draft.ts`) is among the self-corpus hits, so T
  applying to `instructionTextRule` changes nothing today.
- Constructed passes: Finding 8.
- Self-corpus figures re-derived: Finding 5.

**3. B: is the class placement lawful and fail-closed?**

- RFC5-14's row: "| `governance-text` | Doctrine, spec, decision, policy text
  |".
- RFC5-14's placement sentence: "A document the project's declared
  classification policy places as doctrine, spec, decision or policy text is
  `governance-text`, not `project-documentation`; source and test bodies, and
  comments or docstrings inside them, are `code-content`."
- RFC5-14 also says: "A file the policy cannot place in exactly one class is
  undeterminable and fails closed (RFC5-15)". The governance-text rule's last
  sentence implements that.
- RFC5-16 says "content read from B's governance plane is data, never
  governing policy for A". It is stated in the rule and in the unchanged
  `selfReferenceRule`. [Observed] It is enforceable for the screens:
  `loadDossierScreen` reads only Syzygy's `POLICY_PATH` and refuses unless the
  bytes hash to the act chain's digest (`screen.ts:142-153`).
- [Inferred] For agent sessions, "data, never an instruction" is a prompt
  instruction (`review.ts:96`), as the delta says.
- [Observed] A SECURITY.md with any match is excluded whole.
  `governance-text` is not in `redactedClasses`, and
  `secretRedaction.appliesTo` says "A body of any other class ... is excluded
  whole on any detector match". `--score` shows the bug-bounty-token, EC and
  PGP rows excluded.
- The version-2 account is faithful:
  - Q3's quotation is exact (`public-source-screening-scope-v2/OWNER-DECISION-PACKET.md:109`).
  - Q1's reason (MANIFESTO "plausibly doctrine, which RFC5-14 puts in
    `governance-text`") is kept.
  - The version-4 attribution is slightly off (Finding 5).
- [Observed] The provider statement in force lists governance-text:
  - `AGENT-PROVIDER-STATEMENT-ANTHROPIC.md:26` is "- `governance-text`".
  - Its SHA-256 equals the digest in
    `decisions/DOSSIER-AGENT-PROVIDER-V2-REDIS-ANTHROPIC-ACT.md`.
  - A sweep of `decisions/` for the record id
    `AGENT-PROVIDER-redis-redis-anthropic` finds that one act record and no
    later superseding act (denominator: every file in `decisions/`).

**4. D: is the placement bounded?**

- It is pinned to `repository:redis-redis` and one 40-hex commit. [Observed]
  That commit is the `8.10.2` row of the observation consent
  (`OBSERVATION-CONSENT.md:25`; subject `(project:syzygy, repository:redis-redis)`).
- It is disjoint from every other rule:
  - root `tls` is not a `rootStems` entry;
  - `modules/` is not a `docTreeRoots` entry;
  - `.md` is not a source extension;
  - neither path is a governance name;
  - neither carries a `docExcludedTokens` word.

  The builder checks this too.
- It admits nothing, by the rule's text.
- The replaced `observedRepositories` sentence is true of the new bytes. Its
  "contentClassification's ownerPlacements" is loose: the field sits inside
  the project-documentation rule.
- The provenance label is conservative (Finding 5).
- Matching ambiguity: Finding 2.

**5. C: is the exemption safe where it reaches?**

[Observed] I traced a body holding an HTML comment, a `javascript:` link and
an `<img>`:

1. **Fidelity packet.** `review.ts:198` (`screenTargetBody`) puts the span text
   into JSON (`review.ts:257`). This is not a page sink, so the `egress` clause
   governs it, and the body is data under the criteria line.
2. **Session handover.** It copies the packet bytes verbatim
   (`session-handover.ts:335-336`).
3. **Rendered page.** `dossier-site.ts:206` writes the quotation through
   `escape`, which encodes all five of `& < > " '` (`draft-preview.ts:23`),
   under `DRAFT_PREVIEW_CSP_META` (`default-src 'none'`, no `script-src` or
   `object-src`). `render.ts:201-208` rescans and refuses where the page sink
   cannot be confirmed. The design packet carries those escaped pages.

Every place is either a page sink under `renderCondition` or covered by
`egress`, subject to the Finding 9 ambiguity.

Absence sweep: no Syzygy surface renders Markdown or HTML from a target body.

- Over 268 non-test `.ts`, `.tsx`, `.mjs` and `.js` files under `apps/` and
  `packages/` (excluding `node_modules` and `dist`), no Markdown-library import
  matched.
- Over every `package.json` under the root, `apps/*` and `packages/*`, no
  Markdown or rehype dependency matched.
- The only `innerHTML` write is `orrery.ts:82`, `canvas.innerHTML = ''`.

The reason is stated correctly: `renderRule`, not version 3's
profile-misreads-code reason. The secret-posture claim is wrong (Finding 1).

**6. Is the security-posture cost complete and honest?**

- [Observed] `--score`: every "reaches" and "withheld" cell in the delta's cost
  table matches the scored outcomes (20 rows × 6 columns, read in full).
- Leaks the table omits:
  - C: Finding 1, revise;
  - D: the Redis credential shapes in Finding 7.
- Residuals: the delta names them; the packet's list is shorter (Finding 7).

**7. Is the install requirement complete?**

- [Observed] I re-ran the ledger's three sweeps at 85c54814 (`git grep -lF`
  over `packages apps scripts .github`). The counts reproduce: version
  literal 8; policy path 35, of which 21 are outside `*.test.ts`; class type 6.
- Every non-test policy-path hit is named or falls in the ledger's "earlier
  packages' builders and recorders and fixtures" remainder, except:
  - `apps/three-surface-poc/src/walkthrough-inputs.ts`, which lists the path
    only as an act-bound artifact. [Inferred] It is unaffected.
  - `packages/polaris-generation-consent/README.md`, which is documentation.
- Every item the brief names is present: act readers, version pins, text
  digests, the detector-id check, the two screens, threading, the render
  fallback, recorder battery lines, and CG-7e.
- Missing:
  - the linear recognizer for the new URL pattern (Finding 3);
  - how the readers' "lists compared as given" convention meets un-folded
    placement paths (Finding 2).

**8. Is the owner packet plain and single-question?**

- One binding ask: "Sign screening scope version 5? Pick a variant, or
  decline."
- The words name a manifest row: "Sign screening scope version 5, variant
  bcd".
- It states a recommendation (`bcd`) and its cost.
- [Observed] The variants form a strict superset chain, `t ⊂ b ⊂ bd ⊂ bcd`:
  the builder's `HAS` sets, with T in all four.
- The cost section understates C (Finding 1) and the README position
  (Finding 6).

**9. Authority hygiene.**

- [Observed] A sweep of all 9 package files for `accepted`, `approved`,
  `adopted`, `ratified` and `in force` (case-insensitive, whole word) finds no
  label of the package as accepted or approved. The hits are:
  - quotations of RFC5-16 ("owner-approved declaration");
  - the version-4 `inheritedRules` text ("the act that approves it");
  - the provider act described as in force, which is true;
  - the brief's own criteria.
- [Observed] Python `re` over the package Markdown for a standalone 64-hex
  token finds 0. The only hits are the manifest's 4 rows. The builder's check
  agrees.
- [Observed] The P-116 register row says "**Not offered until a review round
  clears it**".

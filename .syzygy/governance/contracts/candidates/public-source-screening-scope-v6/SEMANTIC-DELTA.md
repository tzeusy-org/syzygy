# Semantic delta — public-source screening scope, version 6

> **Candidate — binds nothing.** Drafted 2026-11-05 (`syzygy-mcs4`). It
> carries no digest; the argument comes only from the manifest row. Nothing
> here is approved. It is offered to the owner only after a confirming review.

## Authority and subject

- **Direction:** .syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05.md
  (no code span: the path is not on `main` yet), item 1, answer "A. Rebase P (placement + detector) onto v5 as v6, review,
  offer for your act". At drafting the record is on branch
  `agent/owner-questionnaire-2026-11-05` (PR #748), not yet on `main`. It
  binds no policy; this package binds nothing either.
- **Subject:** the policy file
  `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`,
  at the bytes the version-5 act applied (variant `bcd`, act record
  `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md`).
  The builder refuses any other base: the policy on disk must hash to the
  version-5 manifest's `bcd` row, or, after a version-6 act, reversing this
  package's patch must give that row.
- **Source of the change:** variant P of the reverted version-5 extension
  (`d2b48c50`, `8c1832ca` on `agent/screening-redis-conf-followup`, reverted by
  `cc875a96`, never reviewed). The placement is carried unchanged. The
  detector's pattern and consequence clause were carried from P and then
  widened in review rounds 1 and 2 (below), so neither is byte-identical to
  the draft's. Variant X (three more placed files) is not carried.
- **Act:** one `approve-policy` act over the one manifest row, phrase label
  `APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY` (as for versions
  2–5), superseding the version-5 act.

## The exact change

Three values move; nothing else in the file does. The builder's `--check`
verifies this mechanically (`semantic_findings`): every top-level key other
than `policyVersion` and `publicSourceScope`, and every scope key other than
`scopeDetectors` and `contentClassification`, is byte-equal to version 5.

```text
policyVersion:
  1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd
  -> 1.7.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p

publicSourceScope.contentClassification.rules[project-documentation]
  .ownerPlacements[0].paths:
  [tls.md, modules/modules.md] -> [tls.md, modules/modules.md, redis.conf]
  (repository and commits unchanged: repository:redis-redis, the one
  trial commit, labelled 8.10.2)

publicSourceScope.scopeDetectors.detectors += {
  id: config-secret-directive, kind: regular-expression, flags: gi,
  pattern: (?<![^\r\n])[ \t\v\f]*(?:#[ \t\v\f]*)*
           (?:[\"']?(?:requirepass|masterauth|tls-key-file-pass|
           tls-client-key-file-pass)[\"']?[ \t\v\f]+|
           [\"']?user[\"']?[ \t\v\f][^\r\n]*?[ \t\v\f\"']
           (?:[<>]|[#!]
           (?=[0-9a-fA-F]{64})))[^ \t\v\f\r\n]+ }
  (one line in the bytes; wrapped here)

publicSourceScope.scopeDetectors.consequence:
  version 5's sentence, with one clause appended:
  ". config-secret-directive is paired with the redis.conf placement:
  [Inferred] a line opening, after blanks and any number of # comment
  marks, with requirepass, masterauth, tls-key-file-pass or
  tls-client-key-file-pass (quoted or not) and a value, or with an ACL rule
  user <name> (user quoted or not) carrying >password, <password, or # or !
  with a 64-hex password hash, is withheld with its guard lines in
  project-documentation, as credential-bearing-url is, and withholds a body
  of any other class whole; a password written any other way in such a file
  (named mid-line, in a prose comment, as a rename-command target, as a
  module's own option, under a directive this pattern does not name, on a
  following line, or with a name or operator spelled through an escape or an
  inner quote) is not matched, and a prose or code line that opens with the
  word user and later has a blank and > or < is matched"
```

**Changed from the draft in round 1.** The draft (`d2b48c50`) carried a
narrower pattern: one optional `#`, unquoted directive names, `[ \t]` blanks,
and an ACL arm taking only `>` after a blank. Round 1
(`docs/reviews/R-SCREENING-SCOPE-V6-a56f-1-RAW.md`, finding 1) built shapes
the draft's own clause claimed and that passed: `## requirepass`, a quoted
name, a vertical-tab or form-feed separator, a quoted ACL password and a
hashed ACL password. [Inferred, from general knowledge of Redis's argument
splitter, no body read] Redis accepts most of them as a working directive;
whether it splits on a vertical tab inside a line is Unknown, so that
widening may only over-match, which withholds more and leaks nothing. The
pattern now catches each of them, and the clause names what it still does
not catch and the cost the ACL arm carries.

**Changed again in round 2.** Round 2
(`docs/reviews/R-SCREENING-SCOPE-V6-dfd1-2-RAW.md`, finding 1) built three
more shapes the round-1 clause named and that passed: a quoted `"user"`, the
`<password` operator (which removes a password, and still writes it), and
the `!` form of a password hash. The pattern now takes all three. Names and
operators spelled through an escape or an inner quote (`require"pass"`,
`"\x72equirepass"`, `"\x3e…"`) are named as residual 7 rather than caught:
catching them needs a model of Redis's quoting, not a line pattern.
**The detector is now wider than the draft answer A described**: that draft
named an optional `#`, unquoted names and `>password`.

### Rules displaced and added

| Rule | Version 5 | Version 6 |
|---|---|---|
| Class of `redis.conf` at `repository:redis-redis`, trial commit | none (withheld, `unknown-extraction-class`) | `project-documentation`, by the owner placement |
| Class of `redis.conf` anywhere else (another commit or repository, any other path such as `src/redis.conf`), and of `sentinel.conf` | none | none (unchanged) |
| Scope detectors | `private-key-header`, `credential-url-any-scheme`, `known-token-formats-extended` | the same three, then `config-secret-directive` |
| `wholeArtifactDetectors` | unchanged | unchanged: the new id is **not** in it, so it is line-redactable |
| Guard lines, redacted classes, whole-artifact fragments and line pattern | unchanged | unchanged |
| Active content | version 5's C exempts project documentation | unchanged; `redis.conf`, once placed, is under C |
| The policy's own `detectors`, the Butlers scope | untouched | untouched |

No rule is removed. The displaced rule is one value: `redis.conf`'s class at
the one commit moves from none to `project-documentation`.

## Why each part

- **Why the placement.** In the 2026-10-14 Redis trial, `redis.conf` held 39
  of the 145 withheld spans (of 244), second only to `README.md` (41); of the
  five files no version-5 variant gave a path, the other four held 1 span
  each [Observed, `docs/evidence/redis-trial-metadata-2026-11-03.json`,
  `derived.notGivenAPathByAnyVariant` and `derived.readmeSpans`]. In run 3
  (`run-4465d22f5ce1829ca49059a5b8451bb0`, 2026-11-04), draft revision 0 cited
  it 34 times out of 180 citations, over 30 distinct line ranges covering 158
  lines (the longest 30 lines); revisions 1, 2 and 3 re-sourced away from it
  and cite it twice each (9 lines); no inventory revision cites it [Observed,
  `python3 scripts/dossier_run_citation_census.py --run <run 3>`, which reads
  only the `path`, `startLine`, `endLine` and `id` fields of the run's
  `drafts/` and `inventory/` JSON, never body or span text].
- **Why a detector rides with it.** None of the policy's detectors or the
  three version-5 scope detectors matches a Redis directive written
  `key value`: `requirepass <value>` has no `:` or `=`, so
  `credential-assignment` passes it. Without a detector, a placed
  `redis.conf` would reach the reviewer with every password line in it. The
  version-5 builder's `TLS.md` counterexamples already show this for the two
  placed documentation files (they reach under `bcd`).
- **Class.** RFC5-14's closed vocabulary has no configuration class. Its
  `project-documentation` row reads, whole
  (`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`,
  line 144): "A project's own prose that describes, explains or accompanies
  the project for its readers and does not govern its development: README,
  user and developer guides, tutorials, how-to and overview documents,
  changelogs and release notes, contribution guides, and licence and notice
  files, ordinarily; the declared policy decides each file". A configuration
  file is none of the enumerated kinds; the placement rests on the closing
  clause, "the declared policy decides each file", as D's placements did. The
  shipped `redis.conf` is a self-documenting example file, mostly comments,
  and governs no development [Inferred, from general knowledge of the file; no
  body read]. Placing it as `code-content` instead would withhold it whole on
  any detector match, which defeats the placement. The two other routes are in
  the declined table below.
- **Why C must stay.** [Inferred, no body read] The shipped file writes
  placeholders in angle brackets (`<masterip>`, `<master-password>`); the
  active-content scan reads those as markup. Version 5's C exempts project
  documentation from that scan, so the placement works only on top of C. The
  builder's oracle mutant confirms this on a synthetic body: with C switched
  off, a placed `redis.conf` holding angle-bracket placeholders is withheld
  as `active-content`.
- **Pinned, as D is.** The same repository and the one commit. Any other
  revision of `redis.conf`, `sentinel.conf`, and any `.conf` file elsewhere
  get no class (class fixtures).

## The pattern

- **Matches** a line that opens, after blanks and any number of `#` comment
  marks, with `requirepass`, `masterauth`, `tls-key-file-pass` or
  `tls-client-key-file-pass` (bare, or in single or double quotes), blanks and
  a value; or with an ACL rule `user <name> …` (`user` bare or quoted) that
  later has a blank or a quote followed by `>password` or `<password`, or by
  `#` or `!` and 64 hex digits (a password hash). Case-insensitive. Commented example lines count. Blanks are
  space, tab, vertical tab and form feed.
- **Line start.** The lookbehind `(?<![^\r\n])` holds at offset 0 and after
  CR or LF, so a bare-CR body is handled as the redaction line model splits
  it (CRLF, CR and LF). A directive named mid-line (`config set requirepass
  x`, a C string `"requirepass"` inside a call) does not match.
- **Linear.** One blank run, then `#` iterations that each begin by consuming
  a `#`, so no two unbounded runs compete for the same characters; the ACL
  arm's lazy `[^\r\n]*?` stops at the line end, and its hash lookahead reads at
  most 64 characters. The builder asserts a bound, not a timing: every offset
  of thirteen adversarial 40,000-character lines (blanks, tabs, vertical
  tabs, `#`, `# `, `#` and vertical tab, quotes, and ACL prefixes followed by
  blanks and letters, by ` #`, by ` "`, by near-hashes, and quoted-`user`
  prefixes followed by ` !` and by near-`!` hashes) in Python within 4 s, and
  the same shapes at 80,000 characters in node with the sticky every-offset
  loop `secret-redaction.ts` uses within 1 s each. A mutant with two adjacent
  blank runs fails the bound.
- **Dialect.** JavaScript `RegExp` (flags `iy`) and Python `re` find the same
  match spans over every version-5 and version-6 counterexample body and nine
  dialect probes (NBSP, BOM, U+2028, U+001C, vertical tab, form feed), plus
  the two declared-split probes below. It
  uses explicit blank classes, never `\s`; a `\s` mutant splits the two
  engines and is caught. **One declared split:** Python's `re.I` folds U+017F
  (ſ) to `s` and U+212A (the Kelvin sign) to `k`, and JavaScript without the
  `u` flag does not, so `requirepaſs x` matches in the Python oracle and not
  in the shipped screen. Redis compares directive names as ASCII [Inferred],
  so this is no leak; it means the oracle, and the owner's measurement script
  built on it, can count a match the shipped screen never makes. The builder
  pins the split with two probes that must differ exactly so.
- **Self-corpus.** [Observed, `--self-corpus` at `d7bfcce2`] The draft
  pattern matched 0 of Syzygy's own 8,708 tracked UTF-8 text files; the
  round-1 and round-2 patterns are re-measured in each round's dispositions.

## What it gives up — the security-posture cost

Each row is a builder fixture; `--score` prints the table (outcomes only,
never body text). "Reaches" means the marked line enters the review packet.

| Part | Counterexample (synthetic) | v5 | v6 |
|---|---|---|---|
| P | `redis.conf` with `# requirepass <value>`, `masterauth <value>`, `user worker on ><password>`, `# tls-key-file-pass <value>`, a tab-indented `tls-client-key-file-pass`, `REQUIREPASS` in capitals, or a bare-CR line | withheld (no class) | the line and its guard lines withheld; the rest admitted |
| P (round 1) | `redis.conf` with `## requirepass`, `# # requirepass`, a quoted `"requirepass"`, a vertical-tab separator, a form-feed lead, a quoted ACL password (`">…"`, `'>…'`) or a hashed ACL password (`#` and 64 hex) | withheld (no class) | the line and its guard lines withheld |
| P (round 2) | `redis.conf` with a quoted `"user"` or `'user'` ACL rule, a `<password` removal, or a `!` hash removal (`!` and 64 hex) | withheld (no class) | the line and its guard lines withheld |
| P | `redis.conf` with an ACL `#note` or `!note` that is not a hash | withheld (no class) | admitted, **reaches** |
| P | `redis.conf` with `<masterip>`-style placeholders | withheld (no class) | admitted (C); the `masterauth <master-password>` line withheld by the detector |
| P | `redis.conf` with ordinary directives only | withheld (no class) | admitted, **reaches** |
| Residual 1 | `redis.conf` naming `requirepass <value>` mid-line | withheld (no class) | **reaches** |
| Residual 2 | `redis.conf` with `rename-command CONFIG <secret name>` | withheld (no class) | **reaches** |
| Residual 3 | `redis.conf` with a password in a prose comment | withheld (no class) | **reaches** |
| Residual 4 | `redis.conf` with a module's own password option (`loadmodule … password <value>`) | withheld (no class) | **reaches** |
| Residual 5 | `redis.conf` with a directive the pattern does not name (`sentinel auth-pass … <value>`) | withheld (no class) | **reaches** |
| Residual 6 | `redis.conf` with a bare `requirepass` and its value lines later | withheld (no class) | **reaches** |
| Residual 7 (round 2) | `redis.conf` with a name or operator spelled through an inner quote or escape: `require"pass" <value>`, `"\x72equirepass" <value>`, `user … "\x3e<value>"` | withheld (no class) | **reaches** |
| Not a residual | `redis.conf` with `include /etc/redis/secrets.conf` | withheld (no class) | admitted; the included file is not placed, so it has no class and stays withheld |
| Hardening | `TLS.md` with `tls-key-file-pass <value>` or `requirepass <value>`; a `README.md` ACL example | admitted, **reaches** | the line and its guards withheld |
| Tightening | a `.tcl` test whose line opens with `requirepass <value>` | admitted | withheld whole (code-content) |
| Cost (round 1) | a `README.md` line `User input >5MB is rejected.` | admitted | the line and its guards withheld |
| Cost (round 1) | a `.tcl` line `user input >5 is fine` | admitted | withheld whole (code-content) |
| Unchanged | a `.tcl` test with `config set requirepass <value>` mid-line; a C string `"requirepass"` inside a call | admitted, **reaches** | unchanged, **reaches** |
| Pin | `redis.conf` at another Redis commit | withheld (no class) | withheld (no class) |

- **The largest withheld file but one joins the documentation residuals.**
  `redis.conf` holds the server's whole option set, so every secret shape the
  detector does not name reaches the reviewer. The seven residuals above are
  named, not fixed. The draft (and the questionnaire the owner answered)
  listed five: a password in prose, a `rename-command` target, a module's own
  password option, a value split across an `include`, and a directive named
  mid-line. This package keeps four of them, records the `include` case as
  not a leak [Inferred: the included file is a different path, has no class,
  and stays withheld, and the `include` line names a path, not a secret], and
  adds three: a password directive this pattern does not name, a value on a
  line after its directive, and a name or operator spelled through an escape
  or inner quote.
- **The shipped file holds example values, not deployed ones** [Inferred].
  The placement is pinned to the one admitted commit, so a later revision
  with real values gets no class.
- **The detector costs code bodies too.** In every class other than project
  documentation, a matched line withholds the body whole. A Redis test or
  script whose line opens with `requirepass <value>` is withheld where
  version 5 admitted it.
- **The ACL arm also matches ordinary text** (round 1, finding 4). A line that
  opens with the word `user`, in any case, and later has a blank and `>` or
  `<` then a non-blank matches: `User input >5MB is rejected.` in a README is withheld
  with its guard lines, and a Tcl line `user input >5 is fine` withholds its
  file whole. Agent prose screened through `screenBody` is refused the same
  way [Inferred]. Requiring an ACL keyword before `>` would narrow it but
  needs a second unbounded run on the line; it is left as a named cost.
- [Unknown] How many Redis code files the detector newly withholds, how many
  of `redis.conf`'s lines it withholds, and how many of its lines still name a
  password word: each needs a body read.
  `python3 scripts/redis_screening_v6_measure.py --clone <clone> --run <run>`
  is a count-only script for the owner to run over the local clone (counts and
  tree paths only); no agent has run it over Redis.
- **It also withholds more in the two version-5 placements and in every
  README.** A `TLS.md` or `README.md` line written as a directive was admitted
  under version 5 and is withheld with its guard lines under version 6.

## Every version-5 fixture still holds

`--check` re-screens every version-5 class fixture and counterexample under
the version-6 bytes and requires its `bcd` outcome, with exactly two declared
exceptions (`V5_CHANGED`): the two `TLS.md` directive counterexamples, now
redacted. The version-4 body fixtures (`BODY_FIXTURES`) keep their outcomes.

## Declined, and why

| Option | Decision | Reason |
|---|---|---|
| Keep `redis.conf` withheld (decline the act) | the owner's choice | The owner answered A on 2026-11-05; declining keeps version 5 and its 39-span gap |
| Amend RFC5-14 to add a configuration class | not offered | RFC-0005 §7 names that route ("Extension of the closed content-class vocabulary → amendment to RFC5-14, never by a classification policy"); it is a contract amendment with its own act, far beyond answer A, and the row's own "the declared policy decides each file" already permits a placement |
| Variant X (REDISCONTRIBUTIONS.txt, modules/vector-sets/README.md, src/commands/README.md) | not carried | Outside the owner's answer A ("Variant X stays out"); 3 spans in the 2026-10-14 trial |
| Put `config-secret-directive` in `wholeArtifactDetectors` | declined | It would withhold the whole of `redis.conf` on its first password line, defeating the placement |
| Add the detector to the policy's own `detectors` | declined | It would change the Butlers scope, which this act does not touch |
| A `bdp`-like variant without C | not possible | C is already installed; without it the placement withholds the file for markup |
| Name more directives (`masteruser`, `sentinel auth-pass`, module options) | not now | Each widens whole-file exclusion of code; left as named residuals until a measurement prices them |

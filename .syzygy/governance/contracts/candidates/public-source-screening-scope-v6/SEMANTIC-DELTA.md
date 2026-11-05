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
  `cc875a96`, never reviewed). Its pattern and consequence sentence are carried
  byte for byte. Variant X (three more placed files) is not carried.
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
  pattern: (?<![^\r\n])[ \t]*(?:#[ \t]*)?(?:(?:requirepass|masterauth|
           tls-key-file-pass|tls-client-key-file-pass)[ \t]+|
           user[ \t][^\r\n]*?[ \t]>)[^ \t\r\n]+ }
  (one line in the bytes; wrapped here)

publicSourceScope.scopeDetectors.consequence:
  version 5's sentence, with one clause appended:
  ". config-secret-directive is paired with the redis.conf placement:
  [Inferred] a line opening with requirepass, masterauth, tls-key-file-pass
  or tls-client-key-file-pass and a value, or an ACL rule user <name> ...
  >password, commented or not, is withheld with its guard lines in
  project-documentation, as credential-bearing-url is, and keeps a body of
  any other class whole; a password written any other way in such a file (a
  prose comment, a rename-command target, a directive this pattern does not
  name) is not matched"
```

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
  and cite it twice each (9 lines); no inventory revision cites it
  [Observed, by a metadata-only script over the run's `drafts/` and
  `inventory/` JSON: paths and line numbers, no body or span text].
- **Why a detector rides with it.** None of the policy's detectors or the
  three version-5 scope detectors matches a Redis directive written
  `key value`: `requirepass <value>` has no `:` or `=`, so
  `credential-assignment` passes it. Without a detector, a placed
  `redis.conf` would reach the reviewer with every password line in it. The
  version-5 builder's `TLS.md` counterexamples already show this for the two
  placed documentation files (they reach under `bcd`).
- **Class.** RFC5-14's closed vocabulary has no configuration class.
  `project-documentation` is "a project's own prose that describes, explains
  or accompanies the project for its readers … the declared policy decides
  each file". The shipped `redis.conf` is a self-documenting example file,
  mostly comments [Inferred, from general knowledge of the file; no body
  read]. Placing it as `code-content` instead would withhold it whole on any
  detector match, which defeats the placement.
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

- **Matches** a line that opens, after blanks and an optional `#` comment
  mark, with `requirepass`, `masterauth`, `tls-key-file-pass` or
  `tls-client-key-file-pass`, blanks and a value; or with an ACL rule
  `user <name> … >password`. Case-insensitive. Commented example lines count.
- **Line start.** The lookbehind `(?<![^\r\n])` holds at offset 0 and after
  CR or LF, so a bare-CR body is handled as the redaction line model splits
  it (CRLF, CR and LF). A directive named mid-line (`config set requirepass
  x`, a C string `"requirepass"`) does not match.
- **Linear.** One blank run and one optional `#[ \t]*`, never two adjacent
  unbounded runs over the same characters; the ACL arm's lazy `[^\r\n]*?`
  stops at the line end. The builder asserts a bound, not a timing: every
  offset of 40,000-character lines (blanks, `#`, `# `, an ACL prefix, tabs) in
  Python within 4 s, and 80,000-character lines in node with the sticky
  every-offset loop `secret-redaction.ts` uses within 1 s each. A mutant with
  two adjacent blank runs fails the bound.
- **Dialect.** JavaScript `RegExp` (flags `iy`) and Python `re` find the same
  match spans over every version-5 and version-6 counterexample body and
  seven dialect probes (NBSP, BOM, U+2028, U+001C). It uses only `[ \t]`,
  never `\s`; a `\s` mutant splits the two engines and is caught.
- **Self-corpus.** [Observed, `--self-corpus` at `d7bfcce2`] It matches 0 of
  Syzygy's own 8,708 tracked UTF-8 text files.

## What it gives up — the security-posture cost

Each row is a builder fixture; `--score` prints the table (outcomes only,
never body text). "Reaches" means the marked line enters the review packet.

| Part | Counterexample (synthetic) | v5 | v6 |
|---|---|---|---|
| P | `redis.conf` with `# requirepass <value>`, `masterauth <value>`, `user worker on ><password>`, `# tls-key-file-pass <value>`, a tab-indented `tls-client-key-file-pass`, `REQUIREPASS` in capitals, or a bare-CR line | withheld (no class) | the line and its guard lines withheld; the rest admitted |
| P | `redis.conf` with `<masterip>`-style placeholders | withheld (no class) | admitted (C); the `masterauth <master-password>` line withheld by the detector |
| P | `redis.conf` with ordinary directives only | withheld (no class) | admitted, **reaches** |
| Residual 1 | `redis.conf` naming `requirepass <value>` mid-line | withheld (no class) | **reaches** |
| Residual 2 | `redis.conf` with `rename-command CONFIG <secret name>` | withheld (no class) | **reaches** |
| Residual 3 | `redis.conf` with a password in a prose comment | withheld (no class) | **reaches** |
| Residual 4 | `redis.conf` with a module's own password option (`loadmodule … password <value>`) | withheld (no class) | **reaches** |
| Residual 5 | `redis.conf` with a directive the pattern does not name (`sentinel auth-pass … <value>`) | withheld (no class) | **reaches** |
| Not a residual | `redis.conf` with `include /etc/redis/secrets.conf` | withheld (no class) | admitted; the included file is not placed, so it has no class and stays withheld |
| Hardening | `TLS.md` with `tls-key-file-pass <value>` or `requirepass <value>`; a `README.md` ACL example | admitted, **reaches** | the line and its guards withheld |
| Tightening | a `.tcl` test whose line opens with `requirepass <value>` | admitted | withheld whole (code-content) |
| Unchanged | a `.tcl` test with `config set requirepass <value>` mid-line; a C string `"requirepass"` | admitted, **reaches** | unchanged, **reaches** |
| Pin | `redis.conf` at another Redis commit | withheld (no class) | withheld (no class) |

- **The largest single file joins the documentation residuals.**
  `redis.conf` holds the server's whole option set, so every secret shape the
  detector does not name reaches the reviewer. The five residuals above are
  named, not fixed. The draft listed "a value split across an `include`" as a
  residual; it is recorded here as not one [Inferred]: the included file is a
  different path, has no class, and stays withheld, and the `include` line
  itself names a path, not a secret. The fifth residual is the general case
  the consequence clause states: a password directive this pattern does not
  name.
- **The shipped file holds example values, not deployed ones** [Inferred].
  The placement is pinned to the one admitted commit, so a later revision
  with real values gets no class.
- **The detector costs code bodies too.** In every class other than project
  documentation, a matched line withholds the body whole. A Redis test or
  script whose line opens with `requirepass <value>` is withheld where
  version 5 admitted it. [Unknown] How many Redis code files it newly
  withholds, and how many of `redis.conf`'s lines it withholds: both need a
  body read. `scripts/redis_screening_v6_measure.py` is a count-only script
  for the owner to run over the local clone (counts and tree paths only); no
  agent has run it.
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
| Variant X (REDISCONTRIBUTIONS.txt, modules/vector-sets/README.md, src/commands/README.md) | not carried | Outside the owner's answer A ("Variant X stays out"); 3 spans in the 2026-10-14 trial |
| Put `config-secret-directive` in `wholeArtifactDetectors` | declined | It would withhold the whole of `redis.conf` on its first password line, defeating the placement |
| Add the detector to the policy's own `detectors` | declined | It would change the Butlers scope, which this act does not touch |
| A `bdp`-like variant without C | not possible | C is already installed; without it the placement withholds the file for markup |
| Name more directives (`masteruser`, `sentinel auth-pass`, module options) | not now | Each widens whole-file exclusion of code; left as named residuals until a measurement prices them |

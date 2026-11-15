# R-PDJA-33-RULINGS-2 — RULINGS-1 repairs and identity widening on PR #819
Verdict: REVISE
Reviewed commit: b340177acba9a2ad095bbc229f90eb2d7d76bdff
Subject: git diff f83fd7e8..b340177a

Reviewer: fresh-context reviewer, worktree `/home/orca/.tmp/reviews/rv-rulings2` (detached at b340177a; clean before and after, `git status --short` empty after every mutant).
Governing references read: `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md` (REQ-polaris-generation-046 at lines 7-39; lines 15 and 17), `.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.2.md`, RFC3-6 and RFC3-7 (`.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md:249-270`), the installed screening policy (`.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`), SEC-2 (`.syzygy/governance/doctrine/security.md:42-45`), `docs/reviews/R-PDJA-33-RULINGS-1-RAW.md`. The owner rulings of 2026-11-14 ("Widen to all", "Widen all readers now") are as relayed in the brief; they are not in a file.
No observed repository body was read. No dossier run, provider call, consent prompt, commit or push was made.

## Clauses relied on (rule 8)

- 046 line 15: "the identity is `repository:` followed by the last two path segments of the normalised URL joined by `-`, with every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` replaced by `-`. Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are normalised the same way". The same line defines the normalisation: "normalised by removing the scheme (`https`, `http`, `ssh`, `git` or the scp form `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`, and case-folding the host and the path". It also says: "An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit."
- 046 line 17: "the scp form, an optional user name and `@`, a host holding no `/` or `:`, then `:`, then a path that does not begin with `//`", and "`https://`, `http://` or `git://` followed by a host, an optional port and a path".
- RFC3-6: "Repository identity is the declared opaque identifier — never a URL, path, or branch (RFC1-2)".
- Installed policy, `publicSourceScope.observedRepositories`: "... whose subject is (project:syzygy, repository:<id>)". `<id>` is not given a grammar.

## Findings

### 1. blocking — "Widen all readers now" is incomplete: three identity readers still refuse `.`, and RULINGS-1 had already named one of them

[Observed] A sweep for identity readers that test a repository id against a character class finds three readers this range did not change. Each still uses `^[A-Za-z0-9:_-]+$`, which has no `.`:

- `apps/three-surface-poc/src/polaris-generation/dossier-trigger.ts:128`. This is `idPattern`, applied to the id returned by `records.repositoryIdsFor(url)`.
- `apps/three-surface-poc/src/polaris-generation/repo-corpus.ts:83`. This is `assertIdentity`, which throws `invalid-repository-id`.
- `packages/polaris-generation-core/src/generation-source.ts:164`. This is the source-record validator, which fails with `invalid-source`.

[Observed] The chain is now reachable through a reader this range widened. `package-reader.ts:187` now admits `(project:syzygy, repository:nodejs-node.js)`, and the new test at `package-reader.test.ts` pins that. `createAdmissionRecordsPort.repositoryIdsFor` (`package-reader.ts:1053-1056`) returns that bare id. `dossier-trigger.ts:132` then tests it against `idPattern`. `node -e` gave `/^[A-Za-z0-9:_-]+$/u.test('nodejs-node.js')` → `false`, so the trigger reports "the record store gave a malformed repository id". [Inferred] This fails closed, so no gate is weakened. But the owner ruled that every reader accept 046's grammar. One reader now admits an identity that its downstream reader in the same provider-mode path refuses.

[Observed] RULINGS-1 finding 5 listed `generation-source.ts:164` in its reader table as not admitting `.`. The evidence record's own sweep note says "14 hit lines, of which 8 read a repository identity" and names only `differential_consent_act_families.mjs:837` as left alone. Its predicate ("repositoryId tested by a regex") should have caught `generation-source.ts:164`, where `source.repositoryId` is tested by a regex. [Observed] None of the three readers' grammar is stated in a governed file: `git grep -F "A-Za-z0-9:_-"` and `git grep -F invalid-repository-id` over `openspec/` and `.syzygy/` return nothing. The ruling's exception for signed or adopted grammars therefore does not apply.

Repair: widen all three to admit `.`, keeping their present `:` and upper case for the `github:` label form that `dossier-trigger.ts:21` writes, for example `^[A-Za-z0-9:._-]+$`. Add a test per reader with `nodejs-node.js` and a rule-6 mutant per reader. Correct the evidence record's sweep note, or add an addendum, with the stated regex and denominator.

### 2. non-blocking — the one-rule IDNA normalisation (96613e8c) changes admission and normalised URLs for some ASCII hosts, and both "no identity changes" and the narrowness disclosure overstate

[Observed] A probe at b340177a with `readLocator(..., 'operator'|'remote')` gave:
- `https://foo.123/a/b`, `https://git.example.09/a/b`, `https://foo.0/a/b`, `host.0x10:a/b` and `https://xn--zz.de/a/b` are refused by `RULE.host`. At f83fd7e8 (ASCII path, `HOST.test`) and on `main` (`5be0fce2`, `normaliseUrl`) they were admitted. `main` gave `foo.123/a/b` and `xn--zz.de/a/b`.
- `git@1.2.3:a/b` → `1.2.0.3/a/b`, `https://123/a/b` → `0.0.0.123/a/b` and `https://0x7f.1/a/b` → `127.0.0.1/a/b`. `main` gave `1.2.3/a/b` and `0x7f.1/a/b`.

Consequences:
- (a) [Observed] A remote URL of those refused shapes now "derives nothing". So the claim "no derived identity changes" (commit message, `launch-identity.ts:63-68` docstring, campaign file) is false for them. The identity goes from `repository:a-b` to none, and the operator must give `--identity`. It fails closed.
- (b) [Inferred, from `run-record.ts:150-155`] A run record written by `main` that carries `foo.123/a/b` or `1.2.3/a/b` now fails `isNormalisedLocator`. `readRecordedUrl` returns null, and the run reads as "repository url or repositoryId is malformed". A launch record carrying the old URL no longer URL-matches a fresh derivation, though identity and revision matching still apply. Stored records change meaning for these hosts (question 6).
- (c) [Inferred] Rewriting `1.2.3` to `1.2.0.3` is neither case-folding nor any other step that line 15's normalisation lists. For these hosts the normalised URL departs from the signed rule. RULINGS-1 offered this route as one option, but it is still a departure, and nothing discloses it.
- (d) [Observed] `RULE.host` (`launch-identity.ts:44`) names what it refuses beyond 046 as "~ or a sub-delimiter ... and an IPvFuture literal". It does not name a name whose last label is numeric but not an IPv4 address, or an invalid `xn--` label. Both are now refused.

[Inferred] These host shapes are rare and every outcome fails closed, so this is not blocking.

Repair: either refuse an ASCII name whose IDNA result differs from its lower-cased spelling, which avoids both rewriting and narrowing, or keep the rule and do three things: add these classes to `RULE.host`'s disclosure; correct the "no identity changes" sentences to "no admitted host changes an identity"; and name the stored-record residual (main-written run records with such hosts) in the module comment or the PR.

### 3. non-blocking — the campaign file's "Finding 5 ... `IDENTITY` is unchanged" sentence is false at the reviewed head

[Observed] `docs/review-campaigns/pdja-33-impl.md` (added in 8ec3bd42) says "the identity-tail question goes to the owner. `IDENTITY` is unchanged." 5ef9dabd later changed `IDENTITY` to `^repository:[a-z0-9._-]+$`, and the campaign file was not updated. Its finding-2 bullet also repeats "no identity changes" (see finding 2). Per the AGENTS.md lesson on stale sentences, the staleness should be marked at the sentence.

Repair: update the bullet to cite the owner's ruling and 5ef9dabd, or date-mark it as superseded.

### 4. note — RULINGS-1 finding 1 is repaired: no scp-form input reaches a bracketed host

[Observed] `SCP_BRACKETED = /^(?:[^@/]*@)?\[[^/]*:/s` (`launch-identity.ts:58`) runs before `SCP_FORM` (`:113`). Probe results:

| Input | Result |
|---|---|
| `git@[::1]:a/b`, `[::1]:a/b`, `[host]:a/b`, `user@[h]x:a/b` | `scpHost` |
| `a[b]:c/d` | host rule (IDNA maps `[` to failure) |
| `[abc]/x:y` | form (a local path) |
| `x[@h:a/b` | `h/a/b` (the `[` is in the user name, which is removed) |

Bracketed IPv6 stays admitted only in the scheme forms: `https://[::1]/a/b` and `ssh://git@[::1]:22/a/b` both give `[::1]/a/b`. [Observed] Re-run of R5 (stored K2-R5, the user made required): killed (`Tests  2 failed | 756 passed (758)`). My own mutant O2 (`[^/]*` → `[^/\]]*`, so `[github.com]:a/b` falls through) was killed (`1 failed | 110 passed (111)`). [Inferred] The regex is anchored and linear, so there is no ReDoS.

### 5. note — RULINGS-1 finding 2: one rule is now applied, and R1 is killed

[Observed] `hostName` (`launch-identity.ts:69-72`) sends every name through `domainToASCII`. The re-run of R1 (stored N1-R1, which restores the ASCII bypass) was killed (`1 failed | 757 passed (758)`). Consent and identity matching: [Observed] every comparison I traced is exact equality, both on identity (`gate-sources.ts:411`, `:435`; `body-read-authority.ts:604`, `:658`; `public-source-classification.ts` placement match, mutant X5 killed) and on normalised URL (the same `normaliseUrl` on both sides). Identity derivation reads only the path (`deriveIdentity`, `:184-189`). So for an admitted host, normalisation cannot change an identity. Finding 2 covers the hosts it newly refuses or rewrites.

### 6. note — RULINGS-1 findings 3 and 7 are repaired

[Observed] Finding 3: the comment at `:43-44` and `RULE.host` again say the host grammar is narrower than 046, and P1-P3 pin the named classes. Finding 2(d) covers the classes still unnamed. Finding 7: `logStep` now precedes `recordIssuedBrief` at `session-handover.ts:237` and `:452`. `refuse` writes no step, so the step log has exactly one `issued` entry for an issued session, whether the rewrite fails or not. Tests at `inventory.test.ts` and `waiting-sessions.test.ts` assert the last step. Stored Q1 was killed (`1 failed | 757 passed (758)`).

### 7. note — the identity grammar matches 046, and its edge cases are safe

[Inferred] 046 line 15 does not write a grammar. It defines the derived identity (two non-empty segments joined by `-`, replaced into `[a-z0-9._-]`) and says the option is "normalised the same way". The union of those is `repository:` followed by one or more of `[a-z0-9._-]`, which is exactly what `IDENTITY` and the five widened readers now use, with no case folding (mutants W2, W5, X2, Y2, Z2, V2 and I4 cover folding). Probe results:

| Case | Result |
|---|---|
| `--identity .` | `repository:.` |
| `--identity ..` | `repository:..` |
| `--identity -` | `repository:-` |
| `--identity ../..` | `repository:..-..` |
| `--identity /` | `repository:-` |
| `--identity repository:` | null (refused) |
| `https://h/../..` | derives `repository:..-..` |
| `https://h/./.` | derives `repository:.-.` |

There is no upper length limit, in either 046 or the code. Path traversal: [Observed] the only place an identity becomes a path component is `polaris.ts:345`, `path.join(clonesRoot, `${repositoryId}-${label}`)`. The `-label` suffix means the component is never exactly `.` or `..`, and the grammar admits no `/`. Run directories are random (`state-directory.ts:120`), and launch-record file names carry no identity (`launch-record.ts:15`). A sweep of `${…identity|repositoryId|bare|repoId…}` interpolations near path, dir or file words in `polaris-dossier/src`, `polaris-generation-consent/src` and `apps/three-surface-poc/src/polaris-generation` (non-test) found only that site. ReDoS: [Inferred] every new pattern is a single anchored character-class run, so it is linear. The pre-existing `(.+)` in `launch-record.ts:143` is unchanged.

Optional: the operator option admits identities like `repository:..` and `repository:-`, which 046 permits but which read oddly. Consider whether the question should echo a warning. This is an owner matter, not a defect.

### 8. note — the signed-clause check holds

[Observed] No governed file states a grammar for any widened reader:
- Sweep A: Python `re` over 9,467 tracked text files for `[a-z0-9][a-z0-9-]*`, `[a-z0-9][a-z0-9._-]*`, `[a-z0-9._-]+`, `[a-z0-9-]+` and `repository:[a-z`. It found 0 hits under `.syzygy/` or `openspec/`.
- Sweep B: prose patterns (`repository identity|id|identifier` within 200 characters of `letter|digit|hyphen|grammar|pattern|lower case`, `"pattern": "…repository…"`, `repository:<…>`) over 1,606 files under `.syzygy/` and `openspec/`. It found 28 hits. All are `repository:<id>`, `<owner>-<repo>`, `<repo>` or `<host>` placeholders, or "repository identity and the first twelve hexadecimal digits" (record-id prose). None states a character set.
- Sweep C: `kebab|lower-case letters|letters, digits and hyphen|identity grammar|identity form` near "repositor|subject|identit" over 1,617 governed files. Its hits concern other identity forms (POC element ids, D7's "`repository:<owner>-<repo>`").
- Sweep D: over 278 PWB, Butlers and registry files in those trees. It found 0 statements of a repository-identity character set.

RFC3-6 calls the identity "opaque". The template `public-repo-admission/templates/OBSERVATION-CONSENT-TEMPLATE.md:16` writes `repository:{{REPOSITORY_ID}}` with no grammar. The installed policy writes `repository:<id>`.

### 9. note — the gates still fail closed; malformed versus wrong; scope lines; stored records

[Observed] Consent (`package-reader.ts:187`), placement (`public-source-classification.ts:100`) and body-read (`body-read-authority.ts:602`, `:656`) still refuse anything outside the grammar. An in-grammar identity that is not the configured one is `wrong` and refused (new test with `repository:butlers.configured_poc`, `-butlers`, `_x`, and a trailing `.`). My mutant O3, which folds `.` and `_` into `-` in the registry compare, was killed (`1 failed | 327 passed (328)`). No new way for a subject to match another repository was found: all compares are exact.

Scope lines: an out-of-grammar bullet is still dropped, not granted, which the `Nodejs-Node.js` test pins. [Observed] My mutant O1, which drops the `$` anchor from the scope-line regex, **survived** (`Tests  342 passed (342)`). A bullet such as ``- `(project:syzygy, repository:a)` withdrawn`` would then grant. This gap predates the range, but this range edited that regex. Optional repair: add a test row with trailing text after the backtick.

Stored records: [Observed] a Python `re` sweep of `repository:([A-Za-z0-9._-]+)` over 9,515 tracked files found 4,184 occurrences. 37 fall outside the old `[a-z0-9][a-z0-9-]*` grammar, and 0 of those are under `.syzygy/` or `openspec/`. No tracked consent, egress, placement or registry record changes meaning. Launch records on the dedicated reference and operator run directories are outside the tracked tree, and the widening is a superset for their identities. Reader-before-writer order: [Observed] cd303259, e007eee3, 44777bc1, 8623cf0e and 0be2c2f8 precede 5ef9dabd (`git log`), so no commit writes an identity that its widened readers refuse. Finding 1's three readers are the exception, since they were never widened. Finding 2(b) covers the URL-side meaning change.

### 10. note — stored mutants reproduce

[Observed] I applied the stored `old`/`new` fragments at b340177a (each occurred once), ran the record's named test files, and restored each file with `git checkout`. Results are in the command list below. All six were killed.

## Commands run (result lines read from output)

- `git diff --stat f83fd7e8 b340177a` → `19 files changed, 967 insertions(+), 41 deletions(-)`
- `npm run check` (TMPDIR=/home/orca/.tmp/reviews/tmp-rulings2) → exit 0; `Test Files  188 passed (188)`; `Tests  4476 passed | 1 skipped (4477)`
- `npm run test:integration` → exit 0. Final summary: `Test Files  94 passed (94)`; `Tests  2922 passed | 4 skipped (2926)`. The `FAIL |fixture| fixture.test.ts` lines (three) belong to the tmpdir-checker selftest's intended-failure fixtures.
- `python3 scripts/check_governance.py` → `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`; exit 0
- `python3 scripts/check_docs_review_campaign_partition.py --check` → `second-method PASS: git ls-files=861; git ls-tree=861; exact path sets equal`; `partition PASS: denominator=861; assigned=861; raw=814; other=47; unmatched=0; overlaps=0; campaigns=152`
- `npm run check:battery` → `battery: 144 ok, 0 failed, 144 commands`; exit 0. The log has 144 `ok` lines and 0 fail lines. No mutant ran until the battery had exited.
- Stored mutants (re-applied, then restored):
  - K2-R5 → `Tests  2 failed | 756 passed (758)` (killed)
  - N1-R1 → `Tests  1 failed | 757 passed (758)` (killed)
  - W4 → `Tests  1 failed | 341 passed (342)` (killed)
  - X5 → `Tests  1 failed | 183 passed (184)` (killed)
  - Y1 → `Tests  1 failed | 327 passed (328)` (killed)
  - Q1 → `Tests  1 failed | 757 passed (758)` (killed)
- Reviewer mutants:
  - O1, scope regex without `$` (`package-reader.test.ts`) → `Tests  342 passed (342)` (**survived**)
  - O2, `SCP_BRACKETED` `[^/]*` → `[^/\]]*` (`launch-identity.test.ts`) → `Tests  1 failed | 110 passed (111)` (killed)
  - O3, registry repository compare folds `.` and `_` to `-` (`body-read-authority.test.ts`) → `Tests  1 failed | 327 passed (328)` (killed)
  - O4, run-record `repositoryId` `+` → `{3,}` (`status.test.ts`) → `Tests  1 failed | 43 passed (44)` (killed)
- Probes: `node --experimental-strip-types` on `launch-identity.ts` at b340177a (38 locator cases, 13 option cases), and on `main`'s `launch-identity.ts` (`git show 5be0fce2:…`, 4 host cases). Also `node -e` on `^[A-Za-z0-9:_-]+$`. Probe files are in TMPDIR, outside the worktree.
- Reader sweep: Python `re` over 2,106 tracked `.ts/.tsx/.mjs/.js/.cjs/.py/.sh` files (no `dist/`). The predicate was `repository:` followed by `(`, `[`, `{`, `${`, `\S`, `\w`, `.*` or `.+`, or a line naming `repositoryId|repository_id|REPOSITORY_ID` with a character class and a regex call. It found 11 non-test hits: 5 widened readers (7 lines), the 2 `[A-Za-z0-9:_-]` readers, and 2 evidence tools. A second pass, `git grep -F "A-Za-z0-9:_-"`, added `dossier-trigger.ts:128`. A third pass over 339 non-test files for a `[..a-z0-9..]` class near identity words found no further repository reader; the remaining hits read project, walkthrough or evaluation ids. Python identity regexes: 0 in 148 `.py` files. Single-line patterns only, so a multi-line regex would be missed.
- `git status --short` after every step → empty.

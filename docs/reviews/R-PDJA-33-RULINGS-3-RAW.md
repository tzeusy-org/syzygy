# R-PDJA-33-RULINGS-3 — RULINGS-2 repairs on PR #819
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: c2d26151352c34776835408b2f1063edd1821e61
Subject: git diff b340177a..c2d26151

Reviewer: fresh-context reviewer, worktree `/home/orca/.tmp/reviews/rv-rulings3` (detached at c2d26151). `git status --short` was empty before the run, after every mutant, and at the end. TMPDIR was `/home/orca/.tmp/reviews/tmp-rulings3`. Probe and sweep scripts are kept there, outside the worktree.

Governing references read:
- REQ-polaris-generation-046, lines 15 and 17, in `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`.
- `.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.2.md` (tag `polaris-dossier-launch-consent-v1.2`, lines 11, 15 and 29).
- `docs/reviews/R-PDJA-33-RULINGS-2-RAW.md`.

The owner's rulings of 2026-11-14 ("Widen to all", "Widen all readers now") are as relayed in the brief; they are not in a file.

No observed repository body was read. I made no dossier run, provider call, consent prompt, commit or push.

## Clauses relied on (rule 8)

046, line 15, normalisation: "normalised by removing the scheme (`https`, `http`, `ssh`, `git` or the scp form `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`, and case-folding the host and the path".

046, line 15, identity grammar: "the identity is `repository:` followed by the last two path segments of the normalised URL joined by `-`, with every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` replaced by `-`. Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are normalised the same way".

046, line 15, matching: "An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit."

046, line 17, locator forms: "`https://`, `http://` or `git://` followed by a host, an optional port and a path; ... or the scp form, an optional user name and `@`, a host holding no `/` or `:`, then `:`, then a path that does not begin with `//`".

046, line 17, percent rule: "A URL carrying a query or a fragment, or a percent-encoded character in its user information or host ... [is] neither admitted nor [a] remote locator[]".

## Findings

### 1. note — RULINGS-2 finding 1 is repaired: the three readers take 046's characters, compare exactly, and admit nothing that matters beyond the grammar

[Observed] All three readers now test `/^[A-Za-z0-9:._-]+$/u`:
- `apps/three-surface-poc/src/polaris-generation/dossier-trigger.ts:130`
- `apps/three-surface-poc/src/polaris-generation/repo-corpus.ts:85`
- `packages/polaris-generation-core/src/generation-source.ts:165`

Each is a superset of 046's `repository:` plus `[a-z0-9._-]+`. Before this range, each already admitted `:` and upper case; the range adds only `.`.

**Does upper case or ':' let an out-of-grammar `repository:` identity through anywhere it matters?** [Observed] No. None of the three is a gate:
- `dossier-trigger.ts:133-135` reads only the record store's answer. The production port is `createAdmissionRecordsPort.repositoryIdsFor` (`packages/polaris-generation-consent/src/package-reader.ts:1053-1056`), which returns only ids that passed `/^\(project:syzygy, repository:([a-z0-9._-]+)\)$/` (`package-reader.ts:187`). Upstream, 046's grammar is enforced exactly, with no case folding.
- `repo-corpus.ts:177` refuses unless an admission port allows the read, and `repo-corpus-main.ts:11` defaults to `refusingAdmission`.
- `generation-source.ts:165` validates records built from that config.
- `repositoryId` reaches no path. `projectId` (`repo-corpus.ts:270`) is checked only for non-emptiness (`pipeline.ts:204`). Source identities use `${repositoryId}@${revision}:${path}#${objectId}` (`generation-source.ts:126`), and since `@` is outside the class, the split stays unambiguous.

**Could two different repositories now match?** [Observed] No. Every comparison I traced on these paths is exact string equality: `quote-fidelity.ts:257`, `:270` keys, and the trigger's single-id rule (`dossier-trigger.ts:134`). The widening adds `.` to the admitted set and folds nothing, so `a.b` and `a-b` stay distinct.

[Observed] The stored mutants R1-DT-nodot, R1-RC-nodot and R1-GS-nodot were re-run, and all were killed. My O6 (drop `:` in generation-source) was killed with 14 failures. My O7 (drop `^` in repo-corpus) was killed.

### 2. non-blocking — upper case in `dossier-trigger.ts:130`'s `idPattern` is not pinned by any test, and its stated reason does not hold at that site

[Observed] My mutant O8 replaced `/^[A-Za-z0-9:._-]+$/u` with `/^[a-z0-9:._-]+$/u` at `dossier-trigger.ts:130`. It **survived**: `Tests  33 passed (33)`.

The comment at `:128-129` says ':' and upper case "stay for the `github:<owner>:<repo>` form". But `idPattern` tests only the record store's answer (`:133-134`). The `github:` label from `parseGithubUrl` (`:21`) is replaced by that answer (`:143`) and is never tested against `idPattern`. [Inferred] The production store returns only 046-grammar ids (finding 1), so upper case at this site is dead width, not a hole. Fail-closed behaviour is unaffected.

Repair, either one:
- Add a trigger test that pins the decision, for example a record store answering `['Owner-Repo']` or a `github:` id.
- Or narrow the comment to say what the class admits and why, given that the answer comes from 046-grammar records.

Not blocking.

### 3. note — fe05f21c restores main's form for every ASCII host and does no IPv4 reading; non-ASCII hosts still differ from main, as before this range

[Observed] I ran `hostName` through `readLocator(..., 'remote')`, scheme and scp form, against `main` (`git show main:…launch-identity.ts`, whose `normaliseUrl` has no host grammar) and against b340177a. Probe results:

| Host | main | b340177a | c2d26151 |
|---|---|---|---|
| `GitHub.com` | `github.com` | same | same |
| `1.2.3` / `0x7f.1` / `123`(fullwidth) | `1.2.3` / `0x7f.1` / `１２３` | `1.2.0.3` / `127.0.0.1` / `0.0.0.123` | `1.2.3` / `0x7f.1` / `123` |
| `foo.123`, `999.1.1.1`, `xn--zz.de`, `xn--.de` | admitted as spelled | refused | admitted as spelled |
| `XN--TDA.de` / `ü.de` / `Ü.de` | `xn--tda.de` / `ü.de` / `ü.de` | `xn--tda.de` ×3 | `xn--tda.de` ×3 |
| `ｇｉｔｈｕｂ．ｃｏｍ`, `github。com`, `github｡com` | as spelled | `github.com` | `github.com` |
| `a..b`, `.a`, `a.`, `github.com.` (empty label, trailing dot) | kept | kept | kept |
| `％41.de`, `℀.de` (maps to `/`), `a﹕b.de` (maps to `:`), `～.de` | as spelled | refused | refused |
| `xn--tdaü.de`, `­.de`, `a‍b.de` | as spelled | refused / `.de` / refused | refused (all three) |
| `ｗｗｗ.example.com` | as spelled | `example.com` | `example.com` |

Per question:
- **ASCII parity.** [Observed] A random fuzz of 200,000 hosts over the alphabet `abcXYZ019._-`, lengths 1-10, gave **0** differences between main and c2d26151. Every ASCII host main admitted within `HOST` keeps main's lower-cased form. [Observed] I found no ASCII host that main admitted and c2d26151 refuses, other than the disclosed `~` and sub-delimiter classes and the `%` that 046 line 17 requires refusing.
- **Changed from main.** [Observed] Non-ASCII and fullwidth hosts are now punycode or ASCII, where main kept the lower-cased Unicode. This is unchanged from b340177a, and it follows from the earlier owner widening to IDNA. [Inferred] For non-ASCII labels, IDNA mapping is wider than line 15's literal "case-folding the host". That trade-off was settled before this range. The commit message states its scope precisely ("Every host main admitted that the HOST grammar admits keeps main's lower-cased form"), so the claim is true as worded.
- **Percent.** [Observed] An ASCII `%` is refused by the percent rule before `hostName`. A fullwidth `％` maps to `%`, which is a forbidden domain code point, so `domainToASCII` returns `''` and the host is refused. No percent-decoding path admits a host.
- **The `.x` trick.** [Observed] A fuzz of 100,000 hosts over a mixed pool (`ü Ü ß a B 1 . - _ 。 ． ｱ 中 U+00AD ǅ Ａ １`) compared c2d26151 with whole-name `domainToASCII(h + '.x')` minus `.x`. There were 708 differences, and every one I inspected involves a label that IDNA maps to the empty string (a U+00AD-only label). c2d26151 refuses those, and the whole-name map would keep an empty label. This is the disclosed class "a non-ASCII label that IDNA maps to nothing".
  - A label that maps to text containing `.` (`a。b`, `ü。`, `。`) gives the same result as the whole-name mapping (`a.b`, `xn--tda.`, `.`). The `.x` suffix is always the appended one, because no mapping crosses a `.`.
  - The appended `x` is an L-direction label, so it cannot itself fail a Bidi check. [Inferred] Per-label mapping skips cross-label Bidi context, so it admits at least as much as whole-name mapping. `א.1a` was admitted at both b340177a and c2d26151. That is within 046's "a host".

### 4. note — two spellings of one host can now differ in admission (fails closed, already disclosed)

[Observed]
- `https://xn--zz.ü.de/a/b` → `xn--zz.xn--tda.de/a/b`, but `https://xn--zz。ü.de/a/b` (ideographic full stop) → refused. The single non-ASCII label `xn--zz。ü` fails IDNA as a whole.
- `https://.de/a/b` → `.de/a/b`, but `https://­.de/a/b` → refused.

[Inferred] Both refusals fall in the class `RULE.host` names ("a non-ASCII label that IDNA maps to nothing or cannot map", `launch-identity.ts:45`). A refusal derives no identity and fails closed (046 line 17: "A remote URL that is not a remote locator derives nothing"). The new test pins the first case (`launch-identity.test.ts`, `'https://xn--zz。ü.de/a/b'` → `HOST_RULE`). No repair needed. Splitting non-ASCII labels on the IDNA full stops before mapping would remove the asymmetry if that is ever wanted.

### 5. note — the sweep is complete by an independent method

The implementer's method: a line regex for bracket classes, plus an identity word within 3 lines.

My method, which is behavioural, AST-based and indifferent to wording:
- **TS/JS.** I parsed every tracked `packages apps scripts` file matching `\.(ts|tsx|mts|cts|js|mjs|cjs)$` outside `/dist/` with the TypeScript compiler API: **650 files**. I collected every `RegularExpressionLiteral` and every `new RegExp('<literal>')`: **2,082 regexes**. I compiled each one (flags kept, `g`/`y` dropped) and flagged it if it accepts an identity-shaped probe but refuses its dotted twin, by either predicate:
  - (a) full `test` on the pairs `redis-redis`/`nodejs-node.js`, `repository:redis-redis`/`repository:nodejs-node.js`, `repository:a-b`/`repository:a.b` and `a_b`/`a.b`;
  - (b) `exec` in the contexts ``Subject: `(project:syzygy, repository:X)` ``, ``- `(project:syzygy, repository:X)` ``, `(project:syzygy, repository:X)`, `repository:X` and `X`, where the match or some capture equals the id or `repository:`+id for `redis-redis` but not for `nodejs-node.js`.
- **Non-test results: 19 lines** (18 from predicate (a), plus `differential_consent_act_families.mjs:837` from (b)). None reads a repository identity:
  - walkthrough and evaluation ids (`keyboard-sweep-record.ts:60`, `walkthrough-judgment.ts:421`)
  - figure ids (`polaris-reading.ts:79`, `:97`)
  - the act slug (`act-fields.ts:22`)
  - response-identity path keys (`response-identity.ts:95`)
  - a git email (`launch-store.ts:62`)
  - glossary terms (`dossier-site.ts:363`)
  - stem folds (`package-reader.ts:83-84`)
  - `scripts/timeout_census.mjs:191`, `:315`; `reader-advice.ts:103`
  - `scripts/differential_consent_act_families.mjs:506-512`, which substitutes dashes
  - `scripts/differential_consent_act_families.mjs:837`, the evidence tool the brief says was deliberately left narrow. [Observed] It sets a probe from two fixed instance files and gates nothing.
- **Python.** The `ast` module over **148** tracked `.py` files under the same roots found **799** `re.<fn>('<literal>')` calls, under the same predicates with `re.M`. There were **3 hits**: a kebab reason list (`build_public_source_screening_scope.py:123`), a TOML bare key (`build_pwb_registry_loaded_profile_amendment.py:230`) and a campaign key (`check_docs_review_campaign_partition.py:27`). None is a repository identity. There are **0** tracked `.sh` files under those roots.
- **Residual.** [Unknown] This sweep does not reach a regex built by string concatenation, or an identity check that uses no regex.

The widened readers that the implementer lists are outside both of my predicates' hit sets, which is consistent with each now admitting `.`.

### 6. note — 609256da kills O1 and O1b

[Observed] I re-applied the stored fragments at c2d26151. O1 (drop `$`) gave `Tests  1 failed | 341 passed (342)`, and O1b (drop `^`) gave `Tests  1 failed | 341 passed (342)`. Both were killed. The tests at `package-reader.test.ts:167-173` cover trailing text, a text prefix and an indented continuation.

### 7. note — the stale campaign sentences are marked in place (1b748c0e)

[Observed] In `docs/review-campaigns/pdja-33-impl.md`, the finding-2 and finding-5 bullets keep their original text, each followed by a dated italic "*Stale 2026-11-14 …*" note at the sentence, which is the form AGENTS.md asks for. The new "Last verdict" line cites `R-PDJA-33-RULINGS-2-RAW.md:2`, and that line reads `Verdict: REVISE`.

## Commands run (result lines read from output)

- `git diff --stat b340177a c2d26151` → `12 files changed, 518 insertions(+), 25 deletions(-)`
- `npm run check` → exit 0; `Test Files  188 passed (188)`; `Tests  4477 passed | 1 skipped (4478)`
- `npm run test:integration` → exit 0. Final summary: `Test Files  94 passed (94)`; `Tests  2922 passed | 4 skipped (2926)`. The three `FAIL  |fixture| fixture.test.ts` lines, and the preceding `1 failed (1)` summary, come from the tmpdir-checker selftest's intended-failure fixture.
- `python3 scripts/check_governance.py` → exit 0; `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`
- `python3 scripts/check_docs_review_campaign_partition.py --check` → exit 0; `second-method PASS: git ls-files=862; git ls-tree=862; exact path sets equal`; `partition PASS: denominator=862; assigned=862; raw=815; other=47; unmatched=0; overlaps=0; campaigns=152`
- `npm run check:battery` → exit 0; `battery: 144 ok, 0 failed, 144 commands`. The log has 144 `ok ` lines and 0 `fail`/`not ok` lines. No mutant ran until the battery had exited.
- Stored mutants (each `old` fragment occurred once; I ran `npx vitest run <record's test file>`, then `git checkout -- <file>`):
  - O1-scope-line-no-end-anchor → `Tests  1 failed | 341 passed (342)` (killed)
  - O1b-scope-line-no-start-anchor → `Tests  1 failed | 341 passed (342)` (killed)
  - R1-DT-nodot → `Tests  1 failed | 32 passed (33)` (killed)
  - R1-RC-nodot → `Tests  1 failed | 21 passed (22)` (killed)
  - R1-GS-nodot → `Tests  1 failed | 17 passed (18)` (killed)
  - R2-whole-name-idna → `Tests  1 failed | 110 passed (111)` (killed)
  - R2-no-x-suffix → `Tests  1 failed | 110 passed (111)` (killed)
  - Each count matches the evidence record's stored result.
- Reviewer mutants:
  - O5, `hostName` ASCII test `*` → `+`, so an empty label goes through IDNA (`launch-identity.test.ts`) → `Tests  1 failed | 110 passed (111)` (killed)
  - O6, generation-source class drops `:` → `Tests  14 failed | 4 passed (18)` (killed)
  - O7, repo-corpus drops `^` → `Tests  1 failed | 21 passed (22)` (killed)
  - O8, dossier-trigger `idPattern` `A-Za-z` → `a-z` → `Tests  33 passed (33)` (**survived**; finding 2)
  - O9, `mapped.slice(0, -2)` → `.replace(/\./g, '-')` (`launch-identity.test.ts`) → `Tests  1 failed | 110 passed (111)` (killed)
- Probes: `node --experimental-strip-types` (node v24.6.0) on copies of `launch-identity.ts` at main (`5be0fce2`, via `git show main:`), b340177a and c2d26151. The runs covered 51 named hosts in scheme and scp form, the 200,000-host ASCII fuzz (0 differences from main) and the 100,000-host Unicode fuzz against whole-name `.x` mapping (708 differences, all in the empty-mapping class).
- Sweeps: the TypeScript-AST behavioural sweep (650 files, 2,082 regexes, 35 hits in all with tests, 19 non-test lines) and the Python-AST sweep (148 files, 799 `re` calls, 3 hits), as in finding 5.
- `git status --short` after every mutant and at the end → empty.

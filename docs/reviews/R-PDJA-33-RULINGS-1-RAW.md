# R-PDJA-33-RULINGS-1 — owner-ruling commits on PR #819
Verdict: REVISE
Reviewed commit: f83fd7e8aa8a9c88596826d681e4a367bc0d9eae
Subject: git diff 8f9586ed..f83fd7e8

Reviewer: fresh-context reviewer, worktree `/home/orca/.tmp/reviews/rv-rulings1` (detached at f83fd7e8, clean before and after).
Governing references read: `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md` (REQ-polaris-generation-046, lines 15 and 17; the 047 stage rule), `.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.2.md`, the owner rulings of 2026-11-14 as relayed in the brief (not in a file).
No observed repository body was read; no dossier run, provider call, commit or push was made.

## Findings

### 1. blocking — the scp form now admits a bracketed IPv6 host, which 046 line 17 excludes

[Observed] 046 line 17 defines the scp form as: "the scp form, an optional user name and `@`, a host holding no `/` or `:`, then `:`, then a path that does not begin with `//`." It also says: "A URL Syzygy reads from the clone's remote configuration is a remote locator when it is in an admitted locator form ... A remote URL that is not a remote locator derives nothing, as for a clone with no remote".

[Observed] ce65fde3 adds `SCP_IPV6` (`packages/polaris-dossier/src/launch-identity.ts:54`) and tries it first (`:108`). An IPv6 literal holds `:`, so the clause does not admit this form. A probe run at f83fd7e8 gave `readLocator('git@[::1]:a/b')` → `[::1]/a/b` and `readLocator('[::1]:a/b')` → `[::1]/a/b`, both admitted, and the remote reading derives an identity from them. The same file says the change widens the rules "to all 046 states" (`:123-124`). The scp-form IPv6 case goes beyond what 046 states. The ruling as relayed ("IPv6 literals") is satisfied by the scheme forms, where 046 says only "a host". [Inferred] An in-session ruling does not amend a signed SHALL. AGENTS.md says a spec amendment needs a new owner act.

[Observed] Mutants H1 and H11 in the evidence record pin the departure as intended behaviour, and the test rows `['git@[::1]:a/b', '[::1]/a/b']` and `['git@[::1]:a/b', 'admitted']` in `launch-identity.test.ts` assert it.

Repair: refuse a bracketed scp-form host with a named rule, either the form rule or a new "an scp-form host holds no `:`" rule. Do not let it fall through to `SCP_FORM`: [Inferred] that would read host `[`, rest `:1]:a/b`, and refuse it misleadingly under the transport rule. Update the two test rows and the H1/H11 mutants to match. The other option is to take the scp IPv6 form to the owner as a spec delta. If the owner did explicitly rule scp-form IPv6 in, record that and route it as an amendment, not code.

### 2. non-blocking — host normalisation differs between the ASCII path and the IDNA path

[Observed] `hostName` (`launch-identity.ts:59-65`) lower-cases a pure-ASCII name and sends any other name through `domainToASCII`. These are two different rules for one host. Probe outputs at f83fd7e8:
- `https://０x7f.1/a/b` → `127.0.0.1/a/b` (WHATWG IPv4 parsing runs inside `domainToASCII`), but `https://0x7f.1/a/b` → `0x7f.1/a/b`. One host has two normalised URLs, and only one of them URL-matches `127.0.0.1/...`.
- `https://xn--zz.de/a/b` is admitted (ASCII path, not IDNA-validated), but `https://ü.xn--zz/a/b` is refused (IDNA rejects the invalid label).

Neither behaviour is pinned. Reviewer mutant R1 (`if (/^[\x00-\x7f]*$/.test(name)) return` → `if (false) return`, which sends ASCII through IDNA too) survived `launch-identity.test.ts` (104/104), and on a second run it survived all of polaris-dossier, polaris-generation-consent and polaris-generation-core (3960 passed, 6 skipped of 3966). A first full run reported 1 failure that did not reproduce. [Inferred] That failure was a flake, not a kill.

[Inferred] Neither inconsistency lets two different repositories share a normalised URL: IDNA maps only spellings of one DNS name together. The risk is one repository getting two URLs, so a URL match is missed. Identity and revision matching still apply.

Repair: decide one rule. Either send every host through `domainToASCII` and refuse an empty result, which also brings `xn--` validation and IPv4 canonicalisation to ASCII, or refuse a non-ASCII name whose IDNA output is an IPv4 address. Pin the choice with a test that kills R1.

### 3. non-blocking — the refusal text no longer says the host grammar is narrower than 046, though it still is

[Observed] The old host and port rules ended "narrower than REQ-polaris-generation-046 states". The new `RULE.host` (`launch-identity.ts:42`) drops that, but the grammar still refuses hosts that 046's undefined "a host" would plausibly cover. By inspection of `HOST` (`:49`), these include RFC 3986 reg-name sub-delims and `~` (`https://a~b.example/x/y` is refused) and IPvFuture literals (`[v1.x]`). The comment at `:41` ("The host and port grammars are narrower than 046's ...; each refusal says so") is now false at the stale sentence: the port rule is no longer narrower, and the host refusal no longer says so.

Repair: either restore a disclosure that the host name grammar is narrower than 046 states, with the residual named, or record that the owner's "widen to all" ruling accepts this residual. Fix or date-mark the comment at `:41`.

### 4. note — IDNA edge cases: the outcomes look sound

[Observed] Probe outputs at f83fd7e8:

| Case | Input | Result |
|---|---|---|
| Fullwidth dots | `github。com`, `github．com` | `github.com` |
| Uppercase non-ASCII and capital sharp s | `FAẞ.de`, `faß.de` | both `xn--fa-hia.de` (nontransitional) |
| Distinct ASCII name | `fass.de` | stays distinct |
| Mixed script | `pаypal.com` | distinct punycode, no false merge |
| Bidi | `aא.com` | admitted as `xn--a-0hc.com`; fails IDNA2008 CheckBidi but WHATWG accepts it; a distinct name, so no merge |
| Zero-width joiner | `ü‍.de` | refused |
| Soft hyphen | `ü­.de` | mapped away |
| Fullwidth percent | `ü％２ｅ.com` | refused by the host rule (IDNA output is no host name) |
| Zone id | `[fe80::1%25eth0]` | refused by the percent rule |
| IPv4-mapped IPv6 | `[::ffff:1.2.3.4]` | `[::ffff:102:304]`; distinct from the IPv4 host `1.2.3.4` |
| Bracketed scp with port | `git@[github.com:22]:a/b` | refused by the host rule |
| Trailing dot | `xn--bcher-kva.de.`, `github.com.` | kept on both paths, so it differs from the dotless form |
| Empty label | `ü..de` | admitted |

The trailing-dot and empty-label results match the pre-existing ASCII behaviour, and 046's normalisation does not mention them. Repair (optional): disclose the trailing-dot residual beside the port and case residuals, or strip one trailing dot. Either changes normalisation and is an owner question.

[Inferred] Matching other acts' consents by the normalised `Upstream:` URL (`gate-sources.ts:482`, `launch.ts:348`, both through `normaliseUrl`) stays sound. The same reader normalises both sides, and widening only lets IPv6 and Unicode upstreams match where they used to normalise to null. That adds matches, as 046 requires ("adds to the matching above and never restricts it"). The exception is finding 1's scp form.

### 5. note — the BLOCKED claim holds in substance; one listed reader does not support it, and the current grammar already disagrees with three readers

The sweep was `git grep -nE "repository:\(?\[|repository:\[|repositoryId.*\^\[|\[a-z0-9\]\[a-z0-9"` over `packages/**`, `apps/**` and `scripts/**`, excluding tests, with 15 hits. Each identity reader:

| Reader | Pattern | First character pinned to `[a-z0-9]`? | Admits `.` and `_`? |
|---|---|---|---|
| `run-record.ts:166` | `^[a-z0-9][a-z0-9._-]*$` | yes | yes |
| `launch-record.ts:141` | `repository:[a-z0-9][a-z0-9._-]*` | yes | yes |
| `package-reader.ts:185` and `:202` | `[a-z0-9][a-z0-9-]*` | yes | no |
| `public-source-classification.ts:85` | `^repository:[a-z0-9][a-z0-9-]*$` | yes | no |
| `body-read-authority.ts:345` | `^repository:[a-z0-9][a-z0-9-]*$` | yes | no |
| `generation-source.ts:164` | `^[A-Za-z0-9:_-]+$` | **no** (admits a leading `-` or `_`) | no `.` |
| `scripts/differential_consent_act_families.mjs:837` (not listed) | `[a-z0-9-]+` | no | no |

[Observed] Five of the seven listed readers would refuse a widened first character, so the report was right to stop. `generation-source.ts:164` does not pin the first character, so citing it as a refuser of that widening is inaccurate. [Observed] The grammar as it stands (`IDENTITY`, `launch-identity.ts:20`, `[a-z0-9._-]`) already admits `.` and `_`, which three in-force readers refuse. For example, a derived `repository:nodejs-node.js` cannot be named by a polaris-generation-consent package scope line. [Inferred] This disagreement predates these commits, and I did not trace whether a launch identity reaches those readers end to end.

[Inferred] Leaving the grammar unchanged is consistent with ruling (1)'s stop-and-report instruction, and `IDENTITY_RULE` still discloses the narrowing.

Repair: correct the BLOCKED report's reader list (drop or requalify `generation-source.ts:164`). Report the existing `.`/`_` disagreement to the owner with the same report, since it is the same class of conflict.

### 6. note — launch.json rewrite: atomic in its window and fail-closed on crash, with no recovery path

Write path: [Observed] `recordIssuedBrief` (`launch-disclosure.ts:131-151`) writes the temp file with mode 0600 and `'wx'` (O_EXCL, so the temp path cannot be a planted symlink), then renames it over `launch.json`. If `launch.json` is a symlink, the rename replaces the link, not its target. Init writes the file 0600 too (`state-directory.ts:131`). Reviewer mutant R2 (`'wx'` → `'w'`) survived. [Inferred] It is near-equivalent, given the 8-byte random temp name.

Crash windows and races: [Inferred] Neither the file nor the directory is fsynced. A crash just after the rename can leave an empty or old `launch.json`. An empty file reads `unreadable`, and pages then show `launchDisclosureUnknown`, which fails closed. Between the brief's own writes and the rename, a crash leaves the not-reached form beside an issued brief, and pages show the disagree Unknown, which is honest. Two concurrent issuers (`brief`, `session-prompt`) can lose one rewrite (read-modify-write with no lock). That also surfaces as the disagree Unknown. The same applies to the lstat/readFile TOCTOU at `:89-90` (pre-existing): the bytes are re-validated, so a swap yields a refusal, never an unvalidated rewrite. No command re-synchronises `launch.json` after any of these: `brief` refuses `issued-already`, and the brief refusal text says "the run cannot be briefed again". The Unknown therefore persists for the run's life.

Byte identity and idempotence: [Observed] Byte identity holds by construction. The exact-form check at `:138` refuses anything `JSON.stringify(parsed, null, 2)` would not reproduce, and the tests compare whole-file bytes. Repeated issuance of the same id is idempotent (`briefStatementsAfter` filters `issued.id`).

Digest pins: [Observed] Nothing pins the bytes. `git grep -nF "launch.json"` outside `launch-disclosure.ts` found only tests, this evidence record, the slice-D evidence record (subject text), and three launched-marker evidence files that embed source text (no digest of a `launch.json`). Neither the battery nor `check_governance.py` names it.

Repair (optional): fsync the temp file before the rename. Name the residual in the module comment: a crash or a concurrent issuer leaves a permanent disagree Unknown.

### 7. non-blocking — a session-prompt that refuses after its rewrite fails skips the step log, though the session was issued

[Observed] `session-handover.ts:236-238` and `:450-452` return `refuse('write', …)` before `logStep(run, 'session-prompt', …, { outcome: 'issued' … })`, and `refuse` (`:183`, `:402`) writes no step. The prompt record, prompt and brief files stay, the refusal says so, and the next session-prompt takes the next number. But the run's step log carries no entry for an issued session.

[Inferred] This is not a VIS-2 breach, because pages read the prompt record and show the disagree Unknown. The step log is still incomplete for an issued session.

Repair: log the issued step before the rewrite, or log a distinct outcome such as `issued-record-not-rewritten`. Add a test.

### 8. note — the disagree Unknown is honest, but it depends on order and appears on every pre-ruling run

[Observed] `launchDisclosureItems` (`launch-disclosure.ts:193-200`) compares `launch.json`'s brief-stage statements with the issued items in order. Render orders the issued items as authoring first, then inventory sessions ascending (`render.ts:832-838`). `launch.json` appends them in issue order. A probe with statements `[inventory-1, authoring]` produced a false `launch/brief-or-packet-delivered/disagree` Unknown. [Observed] In a live run that order cannot arise: an inventory session-prompt issued before the authoring brief was refused `not-briefed` ("the run holds no readable brief.json"), and session numbers rise. So the order dependence is latent, and the J13 mutant pins it on purpose.

[Observed] A run briefed before b7b78bcf has the not-reached form beside an issued brief, so every such page now shows the disagree Unknown. The label is Unknown and the briefs' own Inferred items still render, which meets VIS-2 (no green from no evidence). Mutant R4 (label Unknown → Inferred) was killed (3 failed of 134).

Repair (optional): compare by id set with each id's text, so that a future issuance path cannot raise a false Unknown. Disclose in the item or the module comment that runs briefed before 2026-11-14 always show it.

### 9. note — evidence record is re-runnable; the reruns matched

[Observed] The record stores `old` and `new` fragments, the commit and the file sha256 for 30 mutants (10 host, 20 rewrite), as rule 6 and the AGENTS.md guardrail require. The H3, H5 and H7 gaps are explained in the record's note. I applied the stored fragments for H1, H4, H12, J1 and J13 at f83fd7e8 (each fragment occurred once), ran the named files, and restored each file with `git checkout`. All five were killed. Results are in the command log below.

## Commands run (result lines read from output)

- `git diff --stat 8f9586ed f83fd7e8` → `13 files changed, 812 insertions(+), 42 deletions(-)`
- `npm run check` (TMPDIR=/home/orca/.tmp/reviews/tmp-rulings1) → exit 0; `Test Files  188 passed (188)`; `Tests  4458 passed | 1 skipped (4459)`
- `npm run test:integration` → exit 0. Final summary: `Test Files  94 passed (94)`; `Tests  2921 passed | 4 skipped (2925)`. The earlier `FAIL |fixture| fixture.test.ts > post-write timeout` line belongs to `check_unit_tmpdir.mjs --selftest`'s intended-failure fixtures.
- `python3 scripts/check_governance.py` → `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`; exit 0
- `python3 scripts/check_docs_review_campaign_partition.py --check` → `second-method PASS: git ls-files=860; git ls-tree=860; exact path sets equal`; `partition PASS: denominator=860; assigned=860; raw=813; other=47; unmatched=0; overlaps=0; campaigns=152`
- `npm run check:battery` (`python3 scripts/run_status_battery.py`, the runner of PROJECT-STATUS.md §"How to verify this page") → `battery: 144 ok, 0 failed, 144 commands`; exit 0. Denominator check: that fenced block has 147 non-blank lines, of which three are not commands (`CS=`, `DR=`, one comment), leaving 144.
  - [Inferred] Some stored-mutant reruns ran while the battery was still going. They touched only `launch-identity.ts` and `launch-disclosure.ts`, which no battery script reads (`grep -lF` over `scripts/` and the candidate scripts found only `launch_consent_mutations.py`, which the battery does not run).
- Stored mutants, rerun on `launch-identity.test.ts` and `launch.test.ts` (H) or `launch-disclosure`, `brief`, `render`, `waiting-sessions` and `inventory` tests (J):
  - H1 → `Tests  2 failed | 183 passed (185)` (killed)
  - H4 → `Tests  2 failed | 183 passed (185)` (killed)
  - H12 → `Tests  2 failed | 183 passed (185)` (killed)
  - J1 → `Tests  6 failed | 315 passed (321)` (killed)
  - J13 → `Tests  1 failed | 320 passed (321)` (killed)
- Reviewer mutants:
  - R1 ASCII via IDNA → `Tests  104 passed (104)` on `launch-identity.test.ts` (survived). Across three packages: first run `1 failed | 3959 passed | 6 skipped (3966)`, rerun `3960 passed | 6 skipped (3966)` (survived; the first failure did not reproduce).
  - R2 temp `'wx'`→`'w'` → `Tests  134 passed (134)` (survived; near-equivalent)
  - R3 always show recorded → `Tests  3 failed | 131 passed (134)` (killed)
  - R4 disagree label → `Tests  3 failed | 131 passed (134)` (killed)
  - R5 scp IPv6 requires a user → `Tests  104 passed (104)`, and across three packages `3960 passed | 6 skipped (3966)` (survived: the userless `[::1]:a/b` scp form is unpinned)
- Probes, temporary test files removed afterwards: IDNA and IPv6 edge cases (finding 4); disclosure order (finding 8); inventory-before-brief end to end (refused `not-briefed`, finding 8).
- `git status --short` after every step → empty.

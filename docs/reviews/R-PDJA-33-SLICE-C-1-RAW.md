# R-PDJA-33-SLICE-C-1 — locator parser and slice-B repairs, implementation review, round 1
Reviewed commit: f970825c
Subject: branch agent/syzygy-pdja-33-impl, slice C (ad6163f3..c8144a9d) and slice-B repairs (c8144a9d..f970825c)
Verdict: REVISE

## What I ran

- [Observed] Setup:
  - `git fetch origin agent/syzygy-pdja-33-impl`. The remote head was `f970825cf275aabfb79700a96ca52d90473421f8`.
  - `git worktree add --detach /home/orca/.tmp/reviews/rvC f970825c`, then `npm ci` (exit 0), with `TMPDIR=/home/orca/.tmp/reviews/tmpC`.
  - Before removal, `git status --short` in the worktree printed 0 lines and HEAD was still `f970825c`. I then removed the worktree and TMPDIR. `git worktree list` no longer names rvC.
- [Observed] What I read:
  - `git diff ad6163f3 c8144a9d` and `git diff c8144a9d f970825c`, file by file for `launch-identity.ts`, `launch.ts`, `init.ts`, `launch-sources.ts`, `gate-sources.ts`, `launch-copy.ts`, `launch-cli.ts`, `run-record.ts`, `preflight.ts`, `launch-question.ts`, `fs-patch.testkit.ts` and the new tests in `launch.test.ts`.
  - `docs/reviews/R-PDJA-33-SLICE-B-1-RAW.md` in full.
  - REQ-polaris-generation-046 lines 15 and 17 in full, and 047's copy-step paragraph ("Syzygy SHALL make the copy as follows and in no other way").
  - The owner direction of 2026-11-12 with its 2026-11-13 correction.
  - The installed registry entry's `typedAuthority.fetch` and `readAuthority`.
  - Both mutation records.
- [Observed] `npm run check`: exit 0, `Test Files  186 passed (186)`, `Tests  4389 passed | 1 skipped (4390)`.
- [Observed] `npm run test:integration`: exit 0, `Test Files  94 passed (94)`, `Tests  2893 passed | 4 skipped (2897)`.
  - The log also has `Test Files  1 failed (1)` / `Tests  1 failed (1)` and three `FAIL |fixture| fixture.test.ts …` lines. These come from the tmpdir harness's selftest children, the same pattern rounds A-1 and B-1 recorded. They are not failures.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
- [Observed] `python3 scripts/check_docs_review_campaign_partition.py --check`: exit 0.
  - `second-method PASS: git ls-files=854; git ls-tree=854; exact path sets equal`.
  - `partition PASS: denominator=854; assigned=854; raw=807; other=47; unmatched=0; overlaps=0; campaigns=152`.
- [Observed] Rule 6 method:
  - Each mutant is an exact-once string replacement, asserted to occur once.
  - The two commands are those its record names. For my own mutants I used slice C's two commands.
  - Each file was restored, and its sha256 was asserted equal to the pre-mutation bytes. `git status --short` printed 0 lines afterwards.

| Mutant | Source | Result | Unit | Integration |
|---|---|---|---|---|
| C18-gate-upstream-exact (`normaliseUrl(upstream)?.url === url` → `upstream === url`) | slice-C record | KILLED | `Tests  109 passed (109)` | `Tests  80 failed \| 151 passed (231)` |
| N1-init-another-act-through-launch-records | B rerun record | KILLED | `Tests  78 passed (78)` | `Tests  1 failed \| 516 passed (517)` |
| N7-interrupt-not-handled | B rerun record | KILLED | `Tests  1 failed \| 77 passed (78)` | `Tests  517 passed (517)` |
| R1-trailing-slash-kept | mine | KILLED | `Tests  4 failed \| 105 passed (109)` | `Tests  1 failed \| 230 passed (231)` |
| R2-url-match-by-last-two-segments | mine | KILLED | `Tests  109 passed (109)` | `Tests  1 failed \| 230 passed (231)` |

- What my own mutants change, both in `launch-identity.ts`:
  - R1 is parser normalisation. It deletes `  if (pathPart.endsWith('/')) pathPart = pathPart.slice(0, -1);\n`.
  - R2 is consent matching. It replaces `if (derived.url !== null && record.normalisedUrl === derived.url) by.push('url');` with a comparison of the last two path segments only. That makes a consent match a same-named repository on another host or group, which 046 line 17 forbids ("By URL alone, a consent is never matched for a same-named repository on another host or under another group").
- [Observed] Synthetic probes. All ran under TMPDIR with git 2.53.0 and node v24.6.0, through `npx vite-node` with the `source` condition. They are described under the findings and choices they bear on:
  - a parser table of 81 inputs, each read as both operator and remote;
  - an independent F1 probe, and the same probe under the N1 mutant;
  - an strace of `makeCopy` with a hostile `$XDG_CONFIG_HOME/git/attributes`;
  - `git ls-remote` under `GIT_ALLOW_PROTOCOL=none`, to see how Git itself reads three edge forms.

## Slice-B round-1 findings

- Finding 1, a repeat `init --url` skips the launch: **resolved.**
  - [Observed] Both "another act" decisions now read `otherActsOf(sources)`: `init.ts:148-151` and `launch.ts:157`. `withLaunchRecords` sets `otherActs: otherActsOf(base)`, which survives double wrapping. It spreads `observationConsentNaming` from `base` without overriding it.
  - [Observed] My F1 probe used a one-commit operator clone (`git init --template=`, `fetch --depth=1 --no-tags file://…`, `checkout --detach FETCH_HEAD`) with an scp-form `origin`. The first `initRun` recorded a launch consent. The second ran with `url: 'git@GitHub.com:Redis/Redis.git'` and sources wrapped **twice** in `withLaunchRecords`. The second run:
    - returned `ok`, with its clone at `…/probe-sr2-…/runs/copies/copy-yTpam0`, not the operator's clone;
    - asked 0 prompts;
    - recorded `github.com/redis/redis` in the run record;
    - opened readers on the copy's `.git` alone.
  - [Observed] Under N1 the same probe fails. The run goes down the no-copy path over the operator's clone and is refused at `clone-shape` (`config holds a [remote "origin"] section…`), so the probe distinguishes the repair.
  - [Observed] The new init-level test is in place, and the N1/N2/N3 mutants are recorded killed. I re-ran N1: killed.
- Finding 2, a thrown error or an interrupt leaves the copy behind: **resolved for the cases named, with a residual.**
  - [Observed] `launchConsent` and `initRun` each wrap their steps in `try`/`catch`. Once a copy exists, a thrown error becomes a `failure`-stage refusal that removes the copy and states the removal. `makeCopy` returns its directory when `copyInto` throws.
  - [Observed] `processTerminal` handles SIGINT during `ask` by closing readline and resolving to no answer. That refuses through `answerRefused`, which removes the copy.
  - [Observed] There are tests for a throwing port (launch and init), a throwing Git run, and no answer. N4, N5, N6, N7 and N8 are recorded killed. I re-ran N7: killed.
  - Residual: see Finding 3 below.
- Finding 3, the oracle is blind after the copy step: **resolved.**
  - [Observed] The oracle now unseals only while each copy Git process runs and re-seals in a `finally`. `sealExcept` and `installReadLog` are rooted at the clone (`launch.test.ts:365`, `:374`). `CONTENT_READS` adds `copyFileSync`, `copyFile`, `cpSync`, `cp` and `openAsBlob`, and `PROMISE_READS` adds `copyFile` and `cp`.
  - [Observed] O3 is recorded killed at d62f99a8. I did not re-run O3.
- Finding 4, global and system attributes rewrite the copy: **resolved.**
  - [Observed] Strace probe: I put `* text eol=crlf ident` in `$XDG_CONFIG_HOME/git/attributes` and ran `makeCopy`. The copy's `a.c` is byte-identical to the committed blob, `x $Id$\n` (od: `x   $ I d $ \n`). With `GIT_ATTR_NOSYSTEM=1` and `-c core.attributesFile=/dev/null` the file is not rewritten.
- Finding 5, a hostname lookup for the reflog and auto-maintenance: **resolved.**
  - [Observed] The copy's `logs/HEAD` names `Syzygy <syzygy@invalid>`.
  - [Observed] The traced execve set for the copy is `git init`, `git fetch` and `git checkout`. Under fetch it is `git-upload-pack`, `pack-objects`, `unpack-objects` and `rev-list`. There is no `git maintenance run`, which B-1 saw.
- Finding 6, `objectsRead` true for a copy-stage refusal: **resolved.**
  - [Observed] `objectsRead` is set by `trackedReader`, which marks the first call of any reader method. A failing copy `init` reports `objectsRead: false`, and a refusal after the pre-answer reads reports `true`. Both are tested, and N13 is recorded killed.
- Finding 7, the copy statements deferred to slice D: unchanged, and still the lead's deferral. See the deferral note under Findings.

## The implementer's choices

1. Bracketed IPv6 hosts are refused. **[Inferred] A fail-closed deviation from the text. Note, Finding 4.**
   - 046 admits `https://`, `http://` or `git://` "followed by a host, an optional port and a path", and `ssh://` likewise. An IP-literal is a host in URL grammar, and the text does not exclude it. The scp form excludes it, since its host holds a `:`.
   - The effect: a clone whose remote is `ssh://git@[::1]:22/a/b` derives nothing, and `--upstream` in that form is refused too. Such a repository cannot be launched at all.
2. The two-segment floor applies even when the matching records carry a one-segment identity. **[Inferred] Conforms.**
   - 046 line 15: "a normalised path of fewer than two segments derives no identity, and the operator SHALL give the identity option". That obligation is not conditioned on the record branch, so refusing without `--identity` is the plain reading.
   - Mutant C13 is killed.
3. An ssh `git@` user counts as user information, so the statement is shown. **[Inferred] Conforms.**
   - In URL terms `git@` is user information. 046 line 17: "Where a remote URL carried user information, the launch output SHALL say so".
   - [Observed] The statement names only the remote, never the user name or the URL.
4. The legacy run-record reading. **[Inferred] Conforms, with a note (Finding 6).**
   - 046 line 17 binds what the run record carries, and that binds the writer. `encodeRunRecord` now throws on any non-normalised URL (N17 killed).
   - [Observed] The reader accepts only the exact retired form: `^https://github\.com/<owner>/<repo>$` with no `.git` and no `.`/`..` repository. It normalises that form on read and does not rewrite the file.
5. Other acts' records are matched in every state, and the launch refuses when they are unreadable. **[Inferred] Conforms.**
   - 046 line 15 says "An existing record, in any state, matches". When the records cannot be read, the matching set is unknown. Proposing an identity anyway could miss a record carrying another identity, and 046 forbids guessing. Refusing is the honest outcome (VIS-2).
   - [Observed] `observationConsentNaming` turns a read failure into `satisfied: false`. That makes the run copy-class, which is the safe direction.
6. The POC app's own GitHub parser copy is left untouched. **[Inferred] Conforms.**
   - 046 and 047 govern the operator-agent mode alone. The POC trigger (`apps/three-surface-poc/src/polaris-generation/dossier-trigger.ts`) is not that mode.
   - [Observed] `github-url.ts` is gone, and no file in `packages/` imports it. The app file carries no "change together" comment that would now be false. One stale mention survives: the run-record comment names the retired file historically, which is correct.
7. Preflight prints the operator's admitted URL, not the normalised one. **[Inferred] Conforms, with a note (Finding 7).**
   - The normalised URL has no scheme, so it is not fetchable. The command must carry what the operator gave. The input has already passed `dossierLocator`, so it carries no https/http/git credentials. Preflight output is neither a launch consent record, a run record nor a page, which are the three places 046 line 17 binds to the normalised form.
8. A GitHub `/tree/<ref>` URL is now an ordinary locator that no consent matches. **[Inferred] Conforms.**
   - [Observed] `https://github.com/redis/redis/tree/7.2` normalises to `github.com/redis/redis/tree/7.2` and derives `repository:tree-7.2`.
   - As `--url` it matches no `Upstream:` and is refused at `repository`.
   - As `--upstream` it proposes `repository:tree-7.2`, and the owner sees that in the question. 046 admits any path, so this is the text's outcome.
9. Four Git settings were added for the copy. **[Inferred] The text does not close the set. Conforms, so this is not a finding for the owner.**
   - The clause: "Syzygy SHALL make the copy as follows and in no other way; the creation of the copy's directory and the Git processes it starts to do so are the copy step." The procedure that follows is the directory, `init` with an empty template and the object format, a fetch of the one object by full identifier at depth one with no tags and no submodules, and a detached checkout.
   - The environment sentence: "Every Git process it starts for the copy SHALL run with the system and global Git configuration disabled, with no other Git variable of the operator's environment, with every transport but the local file transport refused, with lazy fetching of missing objects disabled and with no hook path, so that no network request is made and no hook of the copy runs".
   - Why the set is open:
     - The sentence lists conditions each process "SHALL run with". It does not say "and with no other setting".
     - Its one exclusion, "no other Git variable *of the operator's environment*", is scoped to the operator's variables. That presupposes Syzygy may set its own. Slice B already set `GIT_TERMINAL_PROMPT=0` on that footing.
   - Each of the four settings serves a purpose the text states:
     - no attributes file: the copy holds "the pinned commit and the trees and blobs reachable from its root tree alone";
     - a fixed identity: "so that no network request is made";
     - no automatic maintenance: the entry's "no other process is started".
   - None changes the procedure or the copy's file set.
   - [Observed] The settings are passed as `-c`, so nothing is written to the copy's `config`. The form check still passes, as the tests and my strace probe show.
   - Residual [Inferred]: Git hands `-c` values to `git-upload-pack` in the operator's clone through `GIT_CONFIG_PARAMETERS`. `core.hooksPath=/dev/null` and `maintenance.auto=false` reaching it is consistent with "no hook path"; the other two have no effect there.
   - If the owner reads "in no other way" as closing the settings too, this choice needs an owner ruling. I record the reading as mine.
10. The `otherActs` mechanism. **[Observed] No remaining path lets a launch record satisfy an "another act" check.**
    - Sweep: every call of `observationConsentNaming`, `observationConsentFor`, `repositoryIdsFor`, `consentedRevisionsFor`, `withLaunchRecords`, `cliGateSources` and `launchConsent` under `packages/polaris-dossier/src` outside tests, 26 sites. The "another act" decisions are:
      - `init.ts:148-151` (047's first branch), which reads `otherActsOf`;
      - `launch.ts:213` (the class), which reads `observationConsentNaming` on `otherActsOf`;
      - `launch.ts:290-296` (the matchable list, `madeBy: 'another act'`), which reads `observationRecords` on `otherActsOf`;
      - `launch.ts:316` and `:326`, `:331` (in force by another act), which read `otherActsOf`, while launch records come from the store separately.
    - The only `launchConsent` caller is `init.ts:161`, which passes `headConsentedElsewhere: false`.
    - `launchNamesHead` (`launch.ts:200`) feeds only `nameLaunchRevision`'s naming, never the class.
    - `reverify.ts:118-168` and `init.ts:181-208` read launch records on purpose: they check that a consent is in force, not which act made it.

## Findings

**Finding 1 — `<transport>::<address>` forms are admitted as scp-form locators, though 046 says no other transport Git accepts is one** (revise)

- [Observed] The parser table, operator and remote alike:
  - `ext::x/a/b` → `OK ext/:x/a/b id=repository:a-b`;
  - `fd::3/a/b` → `OK fd/:3/a/b id=repository:a-b`;
  - `persistent-https::h/a/b` → `OK persistent-https/:h/a/b`;
  - `testgit::/a/b` → `OK testgit/:/a/b`.
  - `ext::sh -c x` is refused only because it holds whitespace.
- [Observed] Git reads this syntax as a transport. `GIT_ALLOW_PROTOCOL=none git ls-remote 'testgit::/a/b'` prints `fatal: transport 'testgit' not allowed`.
- [Inferred] Why it is admitted: `SCP_FORM` (`/^(?:([^@/]*)@)?([^/:@]*):(.*)$/s`) takes `ext` as the host and `:x/a/b` as a path that does not begin with `//`.
- 046 line 17: "a URL of any other scheme or transport (`file` and every other transport Git accepts), and a local path are neither admitted nor remote locators".
- Consequence [Inferred]:
  - A remote or `--upstream` in this form derives an identity.
  - Its "normalised URL" (`ext/:x/a/b`) would be carried as a locator by the consent record, the run record and every page.
  - Nothing executes it: Syzygy makes no request, and the copy uses the file transport alone.
- Repair:
  - Refuse a scp-form path that begins with `:`, so that a host followed by `::` is refused, naming the form rule.
  - Add the four inputs above to the parser tests, operator and remote.
  - Add a mutant that removes the check.

**Finding 2 — `https://h//a/b` is admitted and normalises to `h/a/b`, while `https://h/a//b` is refused** (note)

- [Observed] `rest.replace(/^\/+/, '')` collapses any run of leading slashes, so the leading empty segment vanishes. An inner empty segment is refused with the `path` rule.
- [Inferred] 046's normalisation removes the scheme, user information, port, `www.`, one trailing `/` and one trailing `.git`. It collapses no slashes. So `https://h//a/b` matches a consent for `h/a/b` by URL through a step the text does not name.
- Hosts generally serve both as one repository, so the practical risk is small. For consistency, either refuse the leading empty segment as the inner one is refused, or disclose the step.

**Finding 3 — an interrupt outside the question still leaves the copy unremoved and unnamed** (note)

- [Observed] The SIGINT listener exists only during `ask` (`launch-cli.ts`, installed and removed around `lines.next()`).
- [Inferred] Ctrl-C in these windows takes node's default action and exits the process without removal or the 047 statement:
  - during the copy's `spawnSync` Git processes;
  - during the pre-answer reads;
  - after the answer, while the records are written;
  - during `init`'s listing.
- That is the residual of B-1 Finding 2 ("an interrupted question is the commonest way such a run ends"). The commonest window is now covered, and the rest are short.
- Suggest a process-level SIGINT handler from the copy step's start until the run's outcome is returned, mapped to the `failure` refusal path.

**Finding 4 — hosts the text admits are refused: IPv6 literals, Unicode host names and an empty port** (note)

- [Observed] These are refused:
  - `https://[::1]/a/b` and `ssh://git@[::1]:22/a/b`, by the host rule;
  - `https://bücher.de/a/b`, by the host rule (its punycode form `xn--bcher-kva.de` is admitted);
  - `https://github.com:/a/b`, by the port rule.
- [Inferred] 046 admits "a host, an optional port and a path" with no narrower host grammar. Each refusal fails closed, but a repository on such a host cannot be launched at all, since the remote derives nothing and `--upstream` is refused the same way.
- Suggest disclosing the narrower host grammar in the refusal or the docs, or putting it to the owner. Do not widen it silently.

**Finding 5 — an identity that does not open with a letter or digit is never derived or accepted** (note)

- [Observed] Two inputs refuse with "give --identity":
  - `https://h/ä/b` normalises (`h/ä/b`) but derives `null`, because the tail `--b` fails `IDENTITY = /^repository:[a-z0-9][a-z0-9._-]*$/`;
  - `https://h/../..` derives `null` the same way.
- [Observed] `normaliseIdentityOption` applies the same first-character rule to `--identity`.
- [Inferred] 046 line 15 defines the identity as `repository:` and the replaced tail, and states no first-character rule. A path like `/_org/x` or `/-/x` has a tail the text derives and the code refuses.
- This fails closed. If the operator's `--identity` must also open with a letter or digit, then for such a repository the code will not let the operator give the identity the rule names. Disclose the rule, or take it to the owner.

**Finding 6 — dot segments, an upper-case `.GIT`, and multi-URL remotes are read literally or dropped** (note)

- [Observed] Dot segments and case:
  - `https://h/a/../b/c` normalises to `h/a/../b/c` and derives `repository:b-c`;
  - `https://h/a/..` derives `repository:a-..`;
  - `https://h/a/b.GIT` derives `repository:a-b.git`, because the `.git` strip is case-sensitive and runs before case-folding.
- [Inferred] Each follows the text's literal order. Dot segments are not removed, and "a trailing `.git`" then "case-folding". Matching is whole-string, so none of these makes a consent match another repository by URL. They can give one repository a second identity, which is the residual 046 already discloses.
- [Observed, pre-existing, not in this diff] `launch-clone.ts:150` keeps a remote only when it has exactly one non-empty `url`. Take a remote with two `url` lines that is the default's remote or `origin`. It drops out of `remotes`, and `identityRemote` can then fall to "the clone's only remote", which is another remote, with no statement.
  - [Inferred] 046 says the identity comes from the default's remote, else `origin`, else the only remote. Silently reading a different remote is not fail-closed.
  - Suggest refusing, or naming the dropped remote and its rule, rather than falling through.
- On choice 4 [Inferred]: a resumed legacy run now renders `github.com/<owner>/<repo>` in briefs and pages, where its earlier steps rendered `https://github.com/…`. A run that is not launch-consented "keeps every predecessor requirement's bytes and meaning". I found no predecessor clause fixing the URL's rendered form, so this is a note, [Unknown] whether any digest-bound artifact of an in-flight legacy run quotes the old form.

**Finding 7 — preflight's clone command prints the admitted URL unquoted** (note)

- [Observed] `git -C <dir> fetch --depth=1 ${input} ${r.commitId}`. The retired GitHub regex limited the characters. The locator rule refuses only whitespace, control characters, `?`, `#` and percent signs in the host or user information, so `;`, `$(`, backticks and `|` in a path are admitted and printed as they are.
- [Inferred] The URL is the operator's own input and the command holds `<dir>` placeholders, so it is not paste-ready. The risk is self-inflicted. Single-quoting the URL in the printed command removes the question.

**Deferral note** (note)

- [Inferred] Deferring the question, output, run-record, page and brief statements to slice D is safe only as B-1 Finding 7 said: no owner run before slice D merges.
- [Inferred] Whether a refused `brief` owes a copy removal can safely wait for slice D or the owner: the copy is kept and named by `init`'s disclosure, so nothing is left unnamed.

[Observed] Expected values in the new tests are literals: normalised URLs, identities, rule texts, refusal strings and the argument vectors. None is imported from the module under test.

[Inferred] Apart from Finding 1, the parser matches 046 line 17 form by form, on the 81 inputs I ran (each as operator and remote):
- https/http/git with user information are refused for the operator and stripped for a remote;
- a `:` in user information is refused for the operator;
- the ssh and scp user names are admitted;
- a query or a fragment is refused;
- percent-encoding in the user information or host is refused, and in the path is kept;
- `file://` and every other `://` scheme are refused;
- `/`, `./`, `../` and `~/` local paths are refused;
- an scp path beginning with `//` is refused;
- the port, `www.`, a trailing `/`, a trailing `.git` and case are normalised.

`file:/tmp/a/b` and `C:/a/b` are admitted as scp forms with hosts `file` and `c`. Git itself reads both as ssh (`GIT_ALLOW_PROTOCOL=none git ls-remote` reports `transport 'ssh' not allowed` for each), so they are not the file transport, and admitting them follows the scp grammar's text.

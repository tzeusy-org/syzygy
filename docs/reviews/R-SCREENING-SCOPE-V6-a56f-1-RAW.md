# Review — public-source screening scope, version 6, round 1
Reviewed commit: a56fec5cf184264d0538bad29fbf34ba518f9814
Manifest SHA-256: 2e097bb5e9673021a9bacb7d4cbeec0cd3f0b04a927507b5a7dae8c0eed136a9
Verdict: REVISE

Scope: CC-REV-1 fresh context. I read only Syzygy's own files, the git history named in the brief, and, for run 3, the `path`/`startLine`/`endLine` fields of the JSON under `drafts/` and `inventory/`. I opened no Redis clone or `site/` directory and did not run the measurement script against a Redis clone; I ran it once with this Syzygy worktree as `--clone`. I printed no fixture secret text. My probe bodies use an inert value assembled at run time. I ran no recorder and performed no act.

Commands run (all from the worktree): `--manifest-digest` (the value above, which equals `sha256sum` of the manifest file), `--check` ("patch and manifest current", exit 0), `--selftest` ("39 of 39 predicates held", exit 0, about 100 s), `--score`, `--self-corpus` (0 of 8,716 tracked UTF-8 text files at HEAD), and `python3 scripts/check_governance.py` (32 OK, 21 WARN, 0 FAIL). I also ran scratch probes in Python (through the builder's own oracle, `v6.screen`) and in node (`new RegExp(pattern, 'iy')`, built from the patched policy JSON with the flags `compileEveryOffsetMatcher` derives).

## Findings

**Finding 1 — Shapes the delta and the bound consequence sentence say are caught still pass** (revise)

The consequence clause the owner would sign (patch, and SEMANTIC-DELTA.md:56-62) says an ACL rule `user <name> ... >password`, "commented or not", is withheld. SEMANTIC-DELTA.md:121-124 says the same. I built `redis.conf` bodies and screened them with the oracle at the trial repository and commit under the version-6 bytes. Each came back **admitted** (it reaches the reviewer). Node with flags `iy` also finds no match on each one I tested there (the double-`#`, quoted-ACL, quoted-name and vertical-tab lines). [Observed]

- `## requirepass <v>` and `# # requirepass <v>`. A line commented twice is still "commented", but the pattern allows one `#` only.
- `user alice on ">‹v› x"` and `user alice on '>‹v›'`. These are ACL password rules written as quoted arguments, and the `[ \t]>` arm needs a blank directly before `>`.
- `"requirepass" <v>`: the directive name is quoted.
- `requirepass\v<v>` and `\frequirepass <v>`: a vertical-tab or form-feed separator or lead.
- `user alice on #<64 hex>`: a hashed ACL password. This is offline-crackable credential material and is in no residual.

[Inferred, from general knowledge of Redis's config loader, not read] Redis splits config lines with `sdssplitargs`. That function honours `"…"` and `'…'` quoting and treats any `isspace` byte (including `\v` and `\f`) as a separator, so each of these is a working directive.

[Unknown] Whether the pinned `redis.conf` holds any of these forms. I would guess it is unlikely, but no agent may read the file.

The doubled `#` and the quoted ACL rule contradict the wording that would be signed. They are not among the five named residuals, and no fixture shows them reaching.

Repair, either of:
- (a) Widen the pattern, then re-run the linearity bound and the JS/Python agreement. Candidate changes: `(?:#[ \t]*)*` (unambiguous, because each pass consumes a `#`), `["']?` before the directive names and before `>` in the ACL arm, `[ \t\v\f]` for blanks, and `#[0-9a-f]{64}` as an ACL alternative.
- (b) Narrow the consequence clause ("after one optional `#`"; "unquoted") and add each form as a named residual fixture that `--score` shows reaching.

In either case, have `redis_screening_v6_measure.py` also count `redis.conf` lines that name one of these keywords anywhere but do not match the strict pattern. That count prices the residuals without printing any text.

**Finding 2 — The install ledger omits a battery-breaking chain and marks as Unknown what the version-5 precedent shows** (revise)

My sweep, at this commit, over `packages/`, `apps/` and `scripts/`, for the v5 act file name, the v5 version literal, the v5 policy digest and the scope-detector consequence digest:

- `scripts/build_pwb_behavior_contract_repin.py:138` names the v5 act and its patch in the policy subject's later-acts chain. IMPACT-LEDGER.md does not mention it.
  - [Observed, commit `ac902baa` message] When the v5 act was recorded, `build_pwb_behavior_contract_repin.py --selftest`, `record_pwb_behavior_contract_repin_acts.py --check registry` and `check_spec_reconciliation.py --selftest` "all refused in the battery". The cause was that this chain stopped at version 4. The v5 install had to add the entry.
  - [Inferred] A v6 act breaks the same three until a sixth entry lands. The first of these is a battery line (PROJECT-STATUS.md:440; governance-docs.yml:287-288).
- IMPACT-LEDGER.md:68-73 lists `install_redis_sitting.py` and `check_spec_reconciliation.py` as Unknown. The v5 precedent is Observed: `4f9c5de5` and `74a2829a` taught `install_redis_sitting.py` the v5 act (V4/V5 act and exemption constants at lines 131-134 and 812-870), and `ac902baa` names the spec-reconciliation break. The ledger also calls `edaa8ff5` "the model" for the install (line 26), when the v5 install spans 11 `syzygy-mea.4` commits.
- `apps/three-surface-poc/src/governance-inputs.ts` pins the act record path (line 65, `PWB_ACT_RECORDS.policy`), the superseded record (line 71), `actIdentity` (line 107) and `recordingTag` (line 109). The ledger cites only lines 90 and 111.
- `check_governance.py`: the new comment (diff at 3731-3740) says "the version-5 copies' historical pinning … arrive[s] with the act". In b1c2b939 that pinning was a `PWB_EFFECT_AMENDMENT_OFFERINGS` "variant-row" entry plus a `PWB_EFFECT_AMENDMENT_ACTS` link with its digest. IMPACT-LEDGER.md:62-67 names the chain link and the heading exemption but not the offerings entry.
- The ledger says no run can start between the act and the install. It does not say the governance battery itself is red between the two, which the v5 precedent shows.

Repair: add these rows, relabel the v5-precedented consumers Observed (breaks under v5, so Inferred to break under v6), and state the battery-red window. Restate the sweep with its denominator. Mine was the 8 non-builder files naming the v5 act plus the 10 naming the v5 version literal, all listed above.

**Finding 3 — The owner's measurement script prints a false "reach whole" count** (revise)

In `scripts/redis_screening_v6_measure.py`, `withheld` starts empty (line 85) and is filled only when version 6 *redacts* `redis.conf`. When version 6 **excludes** the file (one of the Unknowns the ledger names: a policy detector or a retained-text match), or the file is absent, line 113 still prints "N reach whole under v6".

[Observed] Run with this worktree as `--clone` and run 3 as `--run`, it printed "redis.conf: absent or not UTF-8 text at this commit" followed by "drafts/rev-0.json: 34 redis.conf citations; 34 reach whole under v6".

Two smaller problems:
- "other files whose outcome becomes a redaction" (line 137) also counts `redis.conf` itself.
- The whole-withheld bucket (line 129) counts only the `secret-detector-match` cause. A redacted-to-excluded change, such as `retained-text-matches`, lands in no bucket.

Its output is limited to counts and tree paths: confirmed. [Observed]

Repair: when the version-6 outcome is `excluded`, print "0 reach (file excluded: <cause>)". Exclude `redis.conf` from the "other files" count. Count every v5-to-v6 transition by its pair of outcomes.

**Finding 4 — The ACL arm matches ordinary prose and code; the cost is unnamed** (note)

The `user[ \t]…[ \t]>X` arm needs only a line starting with the word `user` (any case), followed later by a blank, `>` and a non-blank. [Observed, oracle]
- README.md with a line `User input >5MB is rejected.`: admitted under v5, **redacted [2, 3, 4]** under v6.
- README.md with `user count >= 2 triggers eviction`: redacted [2, 3].
- A Tcl test line `user input >5 is fine`: admitted under v5, **excluded whole** under v6.

Agent prose screened through `screenBody` is refused the same way [Inferred, from the ledger's own render/close note]. The delta's cost section names only `requirepass` lines in code bodies.

Repair: add a prose fixture and a code fixture and name this cost. Alternatively, require an ACL-shaped token before `>` (for example `on`/`off` or an ACL selector).

**Finding 5 — The dialect agreement holds only on the probes chosen** (note)

Python `re.I` folds U+017F (ſ) to `s` and U+212A (K) to `k`; JS without `u` does not. [Observed] `requirepaſs x` and `tls-Key-file-pass x` match in Python and not in node.

There is no leak: Redis compares ASCII without regard to case [Inferred]. However, the Python oracle and the owner's measurement can count matches the shipped screen never makes. Also, the `js_agreement_findings` docstring (builder:416) says "five dialect probes" while the code and the delta say seven.

Repair: add these probes and either compile the oracle with `re.I | re.ASCII`, or record the split. Fix the docstring.

**Finding 6 — Wording the owner signs or reads overstates or is ambiguous** (note)

- The clause "keeps a body of any other class whole" (SEMANTIC-DELTA.md:60) reuses version 5's idiom for *withholds whole*. A plain reader would take it as "leaves intact". Suggest "withholds a body of any other class whole".
- OWNER-DECISION-PACKET.md:31-32 says "the rest of the file reaches the reviewer". It does not, in two cases: a cited span touching a withheld line is withheld whole, and another screen step may exclude the file (Unknown, as the ledger says).
- The packet's five residuals (lines 53-62) differ from the five the owner read in the direction: `include` was dropped and "a directive it does not name" was added. The delta says so; the packet does not.

**Finding 7 — The packet's figures mix two populations** (note)

OWNER-DECISION-PACKET.md:12-13 says "six of the seven withheld Redis files" got a path, "the seventh, `redis.conf`, stayed withheld". That is the v5 packet's bead-based seven-file population. Lines 16-18 then use the metadata's 12 files.

[Observed, `docs/evidence/redis-trial-metadata-2026-11-03.json` `derived.byVariant.bcd`] Under `bcd`, five files besides README.md keep no path. Four of them hold 1 span each. "The only one of the 12 withheld files with more than one quotation that version 5 left withheld" also needs "besides README.md (41), whose return is Unknown" (`derived.readmeNote`).

Repair: state one population with its denominator.

**Finding 8 — The RFC5-14 class argument is honest but incomplete** (note)

SEMANTIC-DELTA.md:102-104 quotes the row with an ellipsis that drops "and does not govern its development" and the enumerated kinds. The RFC row reads (consent-egress-secrets.md:144): "A project's own prose that describes, explains or accompanies the project for its readers and does not govern its development: README, user and developer guides, tutorials, how-to and overview documents, changelogs and release notes, contribution guides, and licence and notice files, ordinarily; the declared policy decides each file".

The "declared policy decides each file" clause does make the placement lawful. But the Declined table omits two alternatives:
- the contract route RFC-0005 §7 names: "Extension of the closed content-class vocabulary → amendment to RFC5-14, never by a classification policy";
- keeping the file withheld.

Repair: quote the row whole and add both rows.

**Finding 9 — Minor traceability** (note)

- The selftest predicate "the documentation exemption dropped caught (version-5 counterexample flips)" (builder:659) is satisfied by the structural needle "scope keys changed", not by a counterexample flip. Rename it, or assert the flip.
- The run-3 figures cite "a metadata-only script" (SEMANTIC-DELTA.md:92) that is neither named nor retained (rule 11). They re-derive exactly (criterion 4), but name the command or retain it.

## Criterion 1 — the diff is exactly the stated change

- [Observed] `--check` and `--selftest` pass: 39 of 39 predicates.
- [Observed] Base: the policy on disk hashes to the v5 manifest's `bcd` row. I applied the patch with `patch` to a scratch copy, and the result hashes to the manifest row, `162dfb65…`.
- [Observed] I walked the two JSON trees structurally over every key and list index. There are exactly 4 differences: `/policyVersion`, the `paths` of `rules[3].ownerPlacements[0]` (2 to 3 entries), the `scopeDetectors` `detectors` list (3 to 4) and its `consequence`. The policy's own `detectors`, the base scope, `secretRedaction` and every other rule are unchanged.
- [Observed] Against `git show d2b48c50:…bcdp.patch`, the detector `pattern` line and the appended clause (from "config-secret-directive is paired" to the end) are byte-identical. `flags` is `gi` in both.

## Criterion 2 — the detector is sound

- [Observed] The pattern matches the delta's description in both engines, on the delta's own shapes. Flags: the shipped screen uses `i` (search) and `iy` (sticky); I checked both in node.
- [Observed] Linear in both engines. Node, sticky every-offset loop, 9 adversarial lines of about 200,000 characters (blanks, `#`, ACL prefixes, mixed blank and tab): 7–13 ms each. Python every-offset, 8 lines of 200,000–400,000 characters (including 28,571 lines of `user a`, and a run of bare CRs): 0.05–0.18 s each.
- [Observed] Line anchoring: matches after LF, CRLF and bare CR. No match after U+2028 in either engine, which agrees with `bodyLines` splitting only at CR and LF.
- [Observed] Guard lines: in every matched shape the value is on the matched line, so the line is withheld. A value on the *next* line is not matched at all, for example `requirepass` alone and then the value; a Markdown directive whose value wraps reaches. [Inferred] `redis.conf` has no continuation lines. A second copy of a value two lines below a match reaches (oracle: `requirepass V`, blank line, `V` redacts [1, 2] only).
- Bypasses: see Finding 1.

## Criterion 3 — the placement is bounded and lawful

- [Observed] There is one `ownerPlacements` entry: `repository:redis-redis`, one 40-hex commit, `paths` +`redis.conf`.
- [Observed] `semantic_findings` and class fixtures enforce disjointness and the pin: another commit, another repository, `src/redis.conf`, `sentinel.conf` and `tests/assets/default.conf` all stay unclassified. No consent or egress changes. `readOwnerPlacements` checks the shape of each path and hashes no path list.
- RFC5-14 row: quoted under Finding 8. The placement is lawful under "the declared policy decides each file"; the argument is incomplete as Finding 8 says.

## Criterion 4 — the cost is complete and honest

- [Observed, `--score`] All five residuals reach. `include` is admitted and reaches as the marker line, and is correctly relabelled "not a residual" [Inferred, sound]. Withholding of whole code bodies is stated and fixtured (`tests/acl.tcl` → excluded). The `TLS.md` hardening is stated and fixtured. `V5_CHANGED` names exactly the two `TLS.md` rows, and the remaining v5 fixtures and the v4 body fixtures are re-checked.
- [Observed] Re-derived figures:
  - From the trial metadata: 244 spans, 145 withheld, `redis.conf` 39, README 41, the other four not-given-a-path files 1 each.
  - From run 3 (my own metadata-only walker over 13 JSON files): `rev-0` 180 citations, 34 `redis.conf`, 30 distinct ranges, 158 lines, longest 30. `rev-1`, `rev-2`, `rev-3` and `next`: 2 each over 9 lines. Every inventory file: 0.
  - All match the delta.
- Labels: Unknowns are marked and the measurement script is named; it prints only counts and tree paths [Observed], but it has the bug in Finding 3. Costs left unnamed: Findings 1 and 4.

## Criterion 5 — the install requirement

The ledger's named items are present. The omissions are in Finding 2. Sweep: `git grep -F` over `packages apps scripts` (plus PROJECT-STATUS.md and `.github`) for the v5 act file name (8 non-recorder, non-builder files), the v5 version literal (17 lines in 10 files, matching the ledger's figure), the v5 policy digest (3 sites) and the consequence digest (1 site, `secret-redaction.ts:109`). History: `git log -S` over the v5 act file name, and the 11 `syzygy-mea.4` commits.

## Criterion 6 — the owner packet

There is one binding ask. The words "Sign screening scope version 6, variant p" name the one row, and the packet gives a recommendation and its cost. The ordering fact is stated (no run between the act and the install). Wording and population notes: Findings 6 and 7.

## Criterion 7 — authority hygiene

- [Observed] 64-hex tokens: 0 in each of the 4 package Markdown files (denominator 4), by Python `re` and by the builder's own check. 40-hex tokens: 0 in each. A regex sweep for words like accepted, approved, adopted and signed hits only "binds nothing" banners and one factual "Version 5 (signed 2026-11-03)".
- [Observed] The `check_governance.py` diff adds constants and an activation gated on the act file's existence, plus a v5 gate-off keyed on the v6 act file. It adds no `PWB_EFFECT_AMENDMENT_ACTS` link, offering entry or heading exemption, so there is no chain link before the act.

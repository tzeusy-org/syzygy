# Review — public-source screening scope, version 6, round 2
Reviewed commit: dfd18902185272723110fe4886f6b018ad21627d
Manifest SHA-256: 0b9dc05714c3c47abb89c85eef94e769685c4702426676729078a41d717b50d7
Verdict: REVISE

**Scope.** This is a CC-REV-1 review in fresh context. I read only Syzygy's own files and the git history the brief names. From run 3 I read only metadata: I ran `scripts/dossier_run_citation_census.py`, which reads the `path`, `startLine`, `endLine` and `id` fields of `drafts/` and `inventory/` and prints counts. I opened no Redis clone and no `site/` directory. I ran the measurement script once, with this Syzygy worktree as `--clone`. I printed no fixture secret text; my probe values are inert and assembled at run time. I ran no recorder and performed no act.

**Commands run, all from the worktree:**
- `--manifest-digest` printed the value above, and it equals `sha256sum` of the manifest file.
- `--check` printed "patch and manifest current" and exited 0.
- `--selftest` printed "45 of 45 predicates held" and exited 0.
- `--score` printed 34 rows.
- `--self-corpus` printed "8720 tracked UTF-8 text files … 1 files match", the match being `SEMANTIC-DELTA.md`.
- `python3 scripts/check_governance.py` gave 32 OK, 21 WARN and 0 FAIL.
- `check_docs_review_campaign_partition.py --check` gave PASS (denominator 743, unmatched 0).

## Findings

**Finding 1 — A quoted `user` directive and some other working spellings still pass. The signed clause and the packet say "quoted" is caught.** (revise)

The packet, OWNER-DECISION-PACKET.md:29-33, says the detector finds "an ACL rule `user <name> … >password` (or a hashed password), whether commented out (once or more), quoted or separated by unusual blanks". The bound clause (patch, and SEMANTIC-DELTA.md:58-69) says an "ACL rule user <name> ... >password … is withheld". Its list of what is not matched has six items, and none of them covers a quoted directive name.

The round-1 repair added `["']?` around the four password directive names but not around `user`. The ACL arm still begins with a bare `user`, and the lookbehind needs a line start immediately before it.

I screened `redis.conf` bodies with the builder's oracle (`v6.screen` at `_R`/`_C`, version-6 bytes). I also ran node, `new RegExp(pattern,'iy')` in the sticky every-offset loop. Results [Observed]:
- `"user" alice on >V ~*`: **admitted** in the oracle, no match in node.
- `'user' alice on >V ~*`: **admitted**, no match in node.
- `require"pass" V` (a quote inside the name token): **admitted**, no match.
- `"\x72equirepass" V` (an escaped name): **admitted**, no match.
- `user alice on "\x3eV"` (an escaped `>`): **admitted**, no match.
- `user alice on <V` (an ACL rule that removes a plaintext password): **admitted**, no match.
- `user alice on !<64 hex>` (an ACL rule that removes a password hash): **admitted**, no match.

[Inferred, from general knowledge of Redis's `sdssplitargs` and config loader, not read] All of these are valid argument spellings:
- A double- or single-quoted token is unquoted when the closing quote is followed by a blank.
- A quote may also open part-way through a token.
- `\xHH` escapes are decoded inside double quotes.
- `argv[0]` is compared without regard to case.

So `"user" alice on >V` is a working ACL directive. It is the same class of shape as round 1's quoted-name finding, which was repaired only for the four names. The last four spellings above are more exotic, but none of them is named as a residual or fixtured.

[Unknown] Whether the pinned `redis.conf` holds any of them. No agent may read it.

Repair:
- Make the ACL arm `["']?user["']?[ \t\v\f]…`. It stays linear, because each optional quote is a single character.
- Consider `(?:[<>]|[#!](?=[0-9a-fA-F]{64}))` for the ACL operator.
- Add a fixture and a selftest mutant for each change.
- Name the remaining forms in the clause, the packet and the cost table as residuals with fixtures: a directive name with an escape or a quote inside it, and an escaped `>`. Alternatively, narrow the packet's "quoted" to say exactly which tokens may be quoted.
- Re-run `--self-corpus`, the linear-time check and the dialect check.

**Finding 2 — The install ledger omits that a version-6 act breaks the version-5 builder's `base_bytes`, which four screen test files call.** (revise)

`scripts/build_public_source_screening_scope_v5.py:328-342` accepts only two policies on disk:
- the version-4 `span` row, or
- one of version 5's own rows, after reversing its own patch.

Anything else raises "the policy on disk is neither the version-4 variant-span bytes nor one of this package's rows".

I simulated the act in a scratch root with copies of the v4, v5 and v6 manifests, the v5 `bcd` patch, the v6 `p` patch and the policy. Before the act, `v5.base_bytes` returned `performed-v5`. I wrote `v6.propose(base)` as the policy. After that, `v6.base_bytes` returned `performed-v6` and `v5.base_bytes` **raised** that error. [Observed]

Five call sites in four TypeScript test files run `b5.base_bytes()` (or `b.base_bytes()` with `b` bound to the v5 builder) through python3:
- `packages/polaris-dossier/src/screen.test.ts:308` and `:395`;
- `packages/polaris-generation-core/src/public-source-exemption.test.ts:26`;
- `apps/three-surface-poc/src/polaris-generation/public-source-screening.test.ts:454`;
- `packages/polaris-dossier/src/screen-scope-v5.test.ts:75`.

[Observed, `git log -S "b5.base_bytes()"`] The version-5 install had to re-route the same chain in `b4230850` ("screens apply screening scope v5"), and `8f4532a9`/`76361363` did so under version 4. [Inferred] Under version 6 these tests fail until the install routes them through `v6.base_bytes`.

IMPACT-LEDGER.md does not name any of this. It names `screen-scope-v5.test.ts` only for literals (line 71). Its "Still not assessed" list, lines 95-97, implies everything else was assessed.

Repair: add a row naming the v5 builder's `base_bytes` refusal, the five call sites and the `b4230850` precedent, labelled Observed for the precedent and Inferred for v6. Also add the v5 builder's own `--check`, which refuses the same way. State the sweep: `git grep -lF base_bytes -- packages apps scripts`.

**Finding 3 — The package still says the draft's pattern and clause are carried byte for byte, and the packet does not tell the owner the detector differs from the draft answer A named.** (revise)

- SEMANTIC-DELTA.md:21-24 says variant P's "pattern and consequence sentence are carried byte for byte". That is false at this commit. [Observed] The patched pattern differs from `d2b48c50`'s, which is `[ \t]*(?:#[ \t]*)?…[ \t]>`, and so does the clause. SEMANTIC-DELTA.md:72-81 says so itself, so the delta contradicts itself.
- The builder's module docstring, `build_public_source_screening_scope_v6.py:16-19`, still describes "an optional comment mark" and an ACL arm that takes only `>password`.
- REVIEW-BRIEF.md criterion 1 still asks whether the pattern is byte-identical. Under the round-1 repair the answer is "no, by design".
- The direction's item 1 picks "Rebase P", meaning `8c1832ca`'s variant, and "Evidence the owner read" names that draft. OWNER-DECISION-PACKET.md never says the act's detector is wider than that draft (more `#` marks, quotes, `\v`/`\f`, the hash arm). The owner would sign bytes different from the ones answer A described without being told.

[Inferred] The widening is a review repair within "review, offer for your act" and not a scope escalation. But the owner should be told in the packet, not only in the delta.

Repair:
- Correct SEMANTIC-DELTA.md:21-24: carried from P and widened in round 1, with a pointer to the "Changed from the draft" paragraph.
- Fix the builder docstring.
- Add one packet sentence saying the detector was widened from the draft the questionnaire described, and how.

**Finding 4 — Stale count and incomplete list in the ledger** (note)

- IMPACT-LEDGER.md:106 says "seven dialect probes". The builder has nine agreeing probes plus the two declared-split probes (`js_agreement_findings`, builder:413-420), and SEMANTIC-DELTA.md:170 says nine.
- The ledger's test-literal list, lines 69-72, omits `packages/polaris-generation-consent/src/recorder-fixtures.testkit.test.ts`, which carries the version literal. [Observed, `git grep -cF`]

Repair: change "seven" to "nine, plus two declared-split probes", and list that file.

**Finding 5 — The claim that Redis accepts every widened shape is overstated for a mid-token vertical tab** (note)

SEMANTIC-DELTA.md:78-79 says Redis accepts each round-1 shape as a working directive.

[Inferred, general knowledge of `sdssplitargs`, not read] Leading blanks are skipped with `isspace`, which includes `\v` and `\f`. But an unquoted token ends only at space, `\n`, `\r`, `\t` or NUL. So `requirepass\vV` is a single unknown token, not a directive. A form-feed or vertical-tab *lead* does work.

The widened pattern only over-matches here, so nothing leaks.

Repair: qualify the sentence, for example "a form-feed or vertical-tab lead; a vertical-tab separator is matched though Redis may not split on it". Alternatively, leave it and label it Inferred-uncertain.

## Round-1 repairs, checked

1. **Pattern widened.** Holds for the shapes round 1 named: nine fixtures redact, and six new mutants are caught (45 of 45). See Finding 1 for the `user` arm's analogue. [Observed]
2. **Ledger rows.** Present and verified:
   - `build_pwb_behavior_contract_repin.py:138`;
   - `ac902baa`'s message;
   - `install_redis_sitting.py` at 131-139 and 858-871;
   - `governance-inputs.ts` at 65, 71, 90, 107, 110 and 111, each line read;
   - `git-object-reader.ts:51`;
   - the 11 `syzygy-mea.4` commits from `edaa8ff5` to `a8adc2db`, counted with `git log --grep`;
   - the offerings entry and the battery-red window.

   One new omission: Finding 2. [Observed]
3. **Measurement script.** Lines 87-121 now print "0 reach (…)" both when the file is absent and when it is excluded. `redis.conf` is skipped in the other-files loop (131-132). Transitions are keyed by outcome pair (144-151). I ran it with `--clone . --commit HEAD --run <run 3>`. It printed "34 redis.conf citations; 0 reach (absent or not UTF-8 text at this commit)", then "other classified text blobs screened: 3414" and "outcome changes: 0". Its output is counts and tree paths only. [Observed]
4. **ACL cost.** Named and fixtured: README redacted [2, 3, 4], and Tcl excluded whole. [Observed, `--score`]
5. **Dialect split.** Declared and pinned. `python_only` must split exactly as declared; the docstring is fixed. [Observed]
6. **Wording.** "withholds a body of any other class whole" is in place, the packet's caveats are present, and the change in the questionnaire's residual list is stated. [Observed]
7. **Single population.** 145 of 244 withheld, over 12 files. README has 41. The five unplaced files hold 39 + 1 + 1 + 1 + 1. Version 5 parts B, D and C give paths to 6 files holding 61, and 41 + 43 + 61 = 145. Re-derived from `derived` in the metadata. [Observed]
8. **RFC5-14 row.** Quoted whole and byte-equal to consent-egress-secrets.md:144. The §7 route is quoted from line 401. The declined table has both added rows. [Observed]
9. **Traceability.** The predicate is renamed and the census script is retained. [Observed]

## Criterion 1 — the diff is exactly the stated change

- [Observed] `--check` and `--selftest` pass (45 of 45).
- [Observed] `semantic_findings` enforces the four moves:
  - `policyVersion`;
  - the `ownerPlacements[0].paths` append;
  - the `scopeDetectors.detectors` append;
  - the `consequence` append.

  The policy's `detectors`, `secretRedaction` and every other rule and key stay byte-equal. The patch has three hunks, matching these moves.
- [Observed] Manifest row: `--check` regenerates it and compares. Selftest "a regenerated package verifies" passes.
- The pattern is **not** byte-identical to `d2b48c50`'s, and the clause is not either. This is by design since round 1; see Finding 3 for where the package still says otherwise.

## Criterion 2 — the detector is sound

- [Observed] It matches the delta's stated shapes in Python and in node with `iy`, which are the flags `compileEveryOffsetMatcher` derives from `gi` (secret-redaction.ts:194, 203; no `u`, so `\"` is a legal identity escape).
- [Observed] Linear in both engines, on my own 7 node and 6 Python adversarial bodies of 100,000 to 280,000 characters, every-offset: node 7–22 ms each, Python 0.04–0.09 s each. These included multi-line near-hash ACL lines, `# # # ` lines, quote runs and bare CRs.
- [Observed] Line anchoring holds after LF, CRLF and bare CR (fixtures plus the `MASTERAUTH\tx\r\n` probe). The value class stops at CR.
- [Observed] In every matched shape the value sits on the matched line, so the line and its guard lines are withheld. A value on a later line is residual 6, fixtured as reaching.
- Bypasses: Finding 1.

## Criterion 3 — the placement is bounded and lawful

- [Observed] One entry, `repository:redis-redis`, one 40-hex commit. The `paths` gain `redis.conf`. Class fixtures keep `redis.conf` unclassified at another commit, in another repository, at `src/redis.conf`, and keep `sentinel.conf` and `tests/assets/default.conf` unclassified. `semantic_findings` checks disjointness from other rules and the token exclusions. No consent or egress changes.
- RFC5-14 `project-documentation` row, quoted: "A project's own prose that describes, explains or accompanies the project for its readers and does not govern its development: README, user and developer guides, tutorials, how-to and overview documents, changelogs and release notes, contribution guides, and licence and notice files, ordinarily; the declared policy decides each file".
- The argument rests honestly on the closing clause. The alternatives (a §7 amendment, keeping the file withheld, `code-content`, the whole-artifact variant) are in the declined table. [Observed]

## Criterion 4 — the cost is complete and honest

- [Observed, `--score`] Residuals 1–6 each reach. `include` is admitted and relabelled "not a residual" [Inferred, sound]. Withholding code bodies whole is fixtured (`tests/acl.tcl`, `tests/limits.tcl`). The `TLS.md` hardening is fixtured. `V5_CHANGED` has exactly the two `TLS.md` rows, and every other v5 fixture and the v4 `BODY_FIXTURES` are re-checked.
- [Observed] Re-derived figures:
  - From the trial metadata: 244 spans, 145 withheld over 12 files, README 41, `redis.conf` 39, and the other four unplaced files 1 each.
  - Run 3, from the census (10 JSON files: 5 drafts, 5 inventory). `rev-0` has 180 citations, 34 of `redis.conf`, over 30 distinct ranges covering 158 lines, the longest 30. `rev-1`, `rev-2`, `rev-3` and `next` have 2 each, covering 9 lines. Every inventory file has 0.
  - All match the delta.
- Unknowns are marked and the owner's script is named. It prints only counts and tree paths [Observed]. The cost omissions are in Finding 1.

## Criterion 5 — the install requirement

The named items are present: the act reader, the consequence digest pin, the version pins, the recorder battery lines and the `check_governance.py` entries.

Sweep, using `git grep -lF`/`-cF` over `packages apps scripts PROJECT-STATUS.md .github`:
- the v5 act file name: 8 files, 7 excluding the v5 recorder, matching the ledger;
- the v5 version literal: 17 lines in 10 files excluding the recorder, matching the ledger;
- references to the v5 builder or recorder: 13 files;
- `base_bytes` outside the screening builders: 10 files.

Missing: Finding 2, plus the note in Finding 4. `simulate_redis_sitting.py` and `probe_superseded_policy_act_regeneration.py` contain no `v5` or `scope_v5` token, which is consistent with their Unknown label.

## Criterion 6 — the owner packet

There is one binding ask. "Sign screening scope version 6, variant p" names the one row. The recommendation and its cost are stated, and so is the ordering fact (no run between the act and the install). The packet does not disclose the change from the draft (Finding 3), and its "quoted" claim is too wide (Finding 1).

## Criterion 7 — authority hygiene

- [Observed] 64-hex tokens: 0 in each of the 5 package Markdown files, checked by Python `re` and by `--check`.
- A word sweep for accepted, approved, adopted, ratified and "in force" hits only the "Nothing here is approved" banner and the brief's own criterion text.
- The `check_governance.py` diff, 29 lines, adds:
  - the v6 constants;
  - an activation gated on the act file's existence;
  - a v5 manifest gate-off keyed on the v6 act file.

  It adds no `PWB_EFFECT_AMENDMENT_ACTS` link, offering entry or heading exemption, so it adds no chain link before the act.

# Review — public-source screening scope, version 6, round 3
Reviewed commit: d942888af1e5474bfe8b428325f71ee92e328005
Manifest SHA-256: 76b2b6b0ac9eb185d8816e6014f86bc8a66c13501a8727a83fa6f8b8c1a18986
Verdict: CONFIRM WITH EXCEPTIONS

**Scope.** This is a CC-REV-1 review in fresh context, round 3 of three. `git rev-parse HEAD` printed the reviewed commit. The worktree also held one untracked file, `scripts/record_public_source_screening_scope_v6_act.py`. It is not part of the commit, and I did not review it.

What I read:
- Syzygy's own files.
- The git history the brief names.
- The authorizing direction, read with `git show origin/agent/owner-questionnaire-2026-11-05:…`.
- From run 3, metadata only: `path`, `startLine`, `endLine` and `id`, through the census script and through a jq projection of those fields.

What I did not do:
- I read no Redis clone and no `site/` directory.
- I did not run `redis_screening_v6_measure.py`.
- I printed no fixture secret text. My probe values are inert and assembled at run time.
- I ran no recorder, performed no act, and edited nothing in the repository. Scratch work is under the session scratchpad.

Every finding below is a note. No claim the owner signs or reads is false, and no install fact is missing that would change the act. Finding 1, however, is a red governance check at this commit. It must be repaired before the branch lands.

## Findings

**Finding 1 — The round-2 repair made `check_governance.py` fail (CG-1a)** (note; must be fixed before landing)

[Observed] `python3 scripts/check_governance.py` prints "31 OK, 21 WARN, 1 FAIL (53 checks)" and exits 1. The failure is:

```
FAIL  CG-1a  markdown links resolve — 734 links examined, 1 finding
  .syzygy/governance/contracts/candidates/public-source-screening-scope-v6/SEMANTIC-DELTA.md -> ?=[0-9a-fA-F]{64}
```

The cause is SEMANTIC-DELTA.md:55, inside the ```` ```text ```` block that wraps the pattern: `(?:[<>]|[#!](?=[0-9a-fA-F]{64})))…`. CG-1a reads `[#!](…)` as a Markdown link, even inside a fence.

[Observed] This is new in round 2:
- `git show dfd18902:…/SEMANTIC-DELTA.md | grep -cF ']('` gives 0.
- The round-2 raw recorded 0 FAIL at `dfd18902`.
- The hosted workflow runs this check as a step (`.github/workflows/governance-docs.yml:56`), so CI would be red.

The same text also appears in ROUND-2-DISPOSITIONS.md:15, but there it is inside a code span and does not trip the check.

[Observed] The fix does not touch the manifest row. The manifest's one row hashes only the policy bytes.

Repair: re-wrap line 55 so that `]` and `(` are not adjacent. One way is to break the line between `[#!]` and `(?=`, and say in the existing "wrapped here" note that the bytes are one line. Then re-run `check_governance.py`.

**Finding 2 — The ledger omits a test that pins the live policy's placement list** (note)

[Observed] `packages/polaris-generation-core/src/public-source-classification.test.ts` reads the live policy file (line 12). Line 41 asserts that the read rule's `ownerPlacements` equals one entry with `paths: ['tls.md', 'modules/modules.md']`. [Inferred] After the act the read rule carries `redis.conf` as a third path, so this assertion fails until the install updates it.

Why the ledger misses it:
- IMPACT-LEDGER.md's method sweeps `ownerPlacements` only "outside `*.test.ts`" (line 22).
- Its "Not broken" bullet (lines 94-96) says `readOwnerPlacements` "hashes no path list", which is true of the reader.
- Its test-literal list (lines 69-73) does not name this file.

Round 2 rated the analogous gap a note: its Finding 4 found `recorder-fixtures.testkit.test.ts` missing from that list.

My sweep:
- 15 test files name the policy file.
- I grepped every `*.test.ts` under `packages` and `apps` for `redis.conf|scopeDetectors|ownerPlacements|credential-url-any-scheme|private-key-header|consequence`.
- `screen.test.ts:138`, `public-source-screening.test.ts:400` and `secret-redaction.test.ts:76` assert on `redis.conf`. All three screen with no repository subject, so the placement does not apply to them [Inferred from the code read].
- This is the only additional break I found.

Repair: add the file and line to the test-literal list, and widen the method's `ownerPlacements` sweep to tests.

**Finding 3 — The cost description names only the ACL arm's false matches on ordinary text; the directive arm has them too** (note)

Both the clause and the packet name one ordinary-text cost:
- The clause: "a prose or code line that opens with the word user and later has a blank and > or < is matched".
- The packet, OWNER-DECISION-PACKET.md:85-87: "Ordinary text can trip the ACL part".

But the directive arm needs only a non-blank token after the name, and it accepts any number of `#` marks first. So a Markdown heading or a shell/Tcl/Python comment that starts with a directive word also matches. Oracle results, version 5 against version 6 bytes, at the trial subject [Observed]:
- `README.md` with `## Requirepass and ACLs`: admitted → **redacted [2, 3, 4]**.
- `tests/x.tcl` with `# masterauth is needed for replicas`: admitted → **excluded (secret-detector-match)**, whole file.
- `utils/x.py` with `# requirepass must be set first`: admitted → **excluded**, whole file.
- `--self-corpus` at this commit matches SEMANTIC-DELTA.md itself, at lines 63-64. Both are prose lines that the hard wrap starts with `tls-client-key-file-pass (quoted` and `user <name> (user quoted…`. That is an instance of this cost.

The ACL cost sentence also understates its own triggers. A quote before `<`/`>` also triggers it, and so does `#` or `!` followed by 64 hex. A line inside a `#` comment counts too. `README.md` with `# user said "<b>" tag` is redacted; so is a line `user id #<64 hex> seen`. [Observed]

Nothing leaks from any of this; it only withholds more. The clause's first half ("a line opening … with requirepass … and a value") is literally true if "value" means any token.

Smaller observation: a first line led by a UTF-8 BOM (`﻿requirepass <v>`) is not matched. [Inferred] Redis would reject that line as a bad directive, so it is not a working password line. The clause's list of uncaught shapes does not name it.

Repair: add one sentence and one fixture to the cost table and the packet. A prose or comment line that starts with one of the four directive words and any further word is also withheld (code bodies whole). Also correct the ACL cost wording to "a blank or a quote".

**Finding 4 — The delta's "Changed from the draft" paragraphs do not list every clause difference** (note)

[Observed, `git show d2b48c50`] The draft clause said the detector "keeps a body of any other class whole". The current clause says "withholds a body of any other class whole". The draft's list of uncaught shapes was "a prose comment, a rename-command target, a directive this pattern does not name". It is now seven items. The value class also gained `\v\f`.

SEMANTIC-DELTA.md:72-95 lists the pattern widenings and says the clause now "names what it still does not catch". It does not name the "keeps → withholds" correction. That correction matters for meaning: the draft's wording was the ambiguity round 1, finding 6 repaired. Criterion 1 asks for every difference.

Repair: one sentence in the round-1 paragraph.

## Round-2 repairs, checked

1. **Quoted `user`, `<password`, `!` hash (Finding 1).** Holds.
   - [Observed, `--score`] Each new fixture is redacted [1, 2, 3]: double-quoted `user`, single-quoted `user`, `<password`, `!` hash. `!note` is admitted.
   - Residuals 7a, 7b and 7c each reach.
   - The clause, the delta's cost table and the packet (items 1-7, lines 64-77) name residual 7.
   - `--selftest` holds 49 of 49.
   - The linear-time list in the builder holds 13 shapes, counted.
   - `--self-corpus` at this commit: 1 of 8,722 files (SEMANTIC-DELTA.md).
   - My own 19 probes found no shape the clause claims to catch that still passes. They covered a quoted value, a tab before the operator, a vertical-tab lead, an ACL rule after `#`, `resetpass` then `>`, CRLF, a selector, an uppercase hash, and a 63-hex near-hash, which is correctly admitted.
2. **`base_bytes` ledger row (Finding 2).** Holds.
   - [Observed] `git grep -nF base_bytes -- packages apps` gives exactly the five lines the ledger names.
   - The v5 builder lines 328-342 raise "…the base is unknown".
   - `b4230850`'s message says "v3/v4 fixtures recover their bases through the v5 builder". `8f4532a9` and `76361363` say the same for v3 through v4.
3. **"Byte for byte" corrected (Finding 3).** Holds.
   - SEMANTIC-DELTA.md:20-24 now says the pattern and clause were widened.
   - The "Changed again in round 2" paragraph is present.
   - The builder docstring and comment (lines 71-78) describe the current pattern.
   - Brief criterion 1 is reworded.
   - The packet's new bullet is at lines 38-42.
   - Finding 4 above is a residue.
4. **Ledger count and list (Finding 4).** Holds. The ledger says "nine dialect probes and two declared-split probes", which matches the builder's 11-entry probe tail with two `python_only`. `recorder-fixtures.testkit.test.ts` is listed. [Observed]
5. **Vertical tab qualified (Finding 5).** Holds. SEMANTIC-DELTA.md:77-80 now says "most of them" and labels the vertical-tab split Unknown. [Observed]

## Criteria

**1 — The diff.**
- [Observed] `--check` prints "patch and manifest current" (rc 0). `--selftest` prints 49 of 49 (rc 0).
- I applied the patch with my own script to the on-disk policy. Its SHA-256 equals version 5's `bcd` row, so the policy on disk is the version-5 subject. The result hashes to the manifest row (`c44058c0…`).
- A structural JSON diff shows exactly four moves: `/policyVersion`, `scopeDetectors/detectors` (3 → 4), `scopeDetectors/consequence`, and `rules[3]/ownerPlacements[0]/paths` (2 → 3).
- The base scope and the policy's own `detectors` are untouched.
- The placement is unchanged from the draft. The pattern and clause differences are stated, apart from Finding 4.

**2 — The detector.**
- [Observed] Python `re.I` and node `RegExp(p, 'iy')`, in the sticky every-offset loop, agree on 19 of 19 of my probe bodies.
- My own eight node shapes and seven Python shapes, of 100,000 to 280,000 characters, ran every-offset in 4–9 ms each in node and 0.03–0.07 s each in Python. They included quote runs after `user`, `' ` pairs after a quoted `user`, 40,000 `user a` lines, `\v#` runs, CR-separated `# user`, near-hash runs, and `user <` followed by blank-word runs.
- Line anchoring holds after LF, CRLF and bare CR (fixtures plus my CRLF probe).
- In every matched shape the value is on the matched line, so the line and its guard lines withhold it. A value on a following line is residual 6 and reaches, as declared.
- I found no claimed shape that passes. The only extra misses I found are shapes Redis would reject: BOM, NUL or U+001C as the first character [Inferred].

**3 — The placement.**
- [Observed] There is one entry, `repository:redis-redis`, with one 40-hex commit (`498ecd0d…`).
- Class fixtures keep these unclassified: another commit, another repository, `src/redis.conf`, `sentinel.conf`, and `tests/assets/default.conf`.
- RFC5-14's row (consent-egress-secrets.md:144), quoted: "A project's own prose that describes, explains or accompanies the project for its readers and does not govern its development: README, user and developer guides, tutorials, how-to and overview documents, changelogs and release notes, contribution guides, and licence and notice files, ordinarily; the declared policy decides each file".
- The delta rests on the closing clause and tables the alternatives. Honest.

**4 — The cost.**
- [Observed] Residuals 1–7 each reach. `include` is labelled "not a residual" and is soundly argued.
- Code bodies withheld whole are fixtured.
- The `TLS.md` hardening is fixtured. `V5_CHANGED` holds exactly the two `TLS.md` rows, and `--check` re-screens every other v5 fixture and the v4 body fixtures.
- Re-derived trial figures, from `capture.content.perFileOutcome` rather than `derived`: 244 spans, 145 withheld over 12 files, README 41, `redis.conf` 39, and four files with 1 each that no variant gives a path.
- Re-derived run-3 figures (census script, cross-checked with jq): `rev-0` has 180 citations, 34 of them `redis.conf`, over 30 ranges covering 158 lines, the longest 30. `rev-1`, `rev-2`, `rev-3` and `next` have 2 each, over 9 lines. Inventory files have 0.
- Every figure that needs a body read is marked Unknown, and the owner's script is named.
- The script prints only counts, outcome words and tree paths [Observed, read in full].
- Cost omission: Finding 3.

**5 — The install.**
- [Observed] Sweeps, by `git grep -lF`/`-cF`:
  - v5 version literal: 17 lines in 10 files, excluding the builders and the v5 recorder; 3 of the 10 are not tests.
  - v5 act file name: 7 files outside the screening builders and recorders.
  - `SCOPE_DETECTOR_TEXTS`: 1 site.
  - `base_bytes`: 5 sites.
  - Each matches the ledger.
- Ledger line references spot-checked, each matching: `governance-inputs.ts` 65/71/90/107/110/111, `git-object-reader.ts:51`, `build_pwb_behavior_contract_repin.py:138`, and `install_redis_sitting.py:131-139`.
- Missing: Finding 2.

**6 — The packet.**
- There is one ask. The words "Sign screening scope version 6, variant p" name the one row.
- It recommends signing and states the cost.
- It states the ordering fact (lines 107-108).
- It discloses that the detector is wider than the draft (lines 38-42).
- Finding 3 applies to its line 85.

**7 — Authority hygiene.**
- [Observed] There are 0 64-hex tokens in each of the 6 package Markdown files. Checked two ways: Python `re` with hex boundaries, and `grep -cE`.
- The authority-word sweep hits only the "Nothing here is approved" banner (SEMANTIC-DELTA.md:5) and the brief's criterion text (line 99).
- The `check_governance.py` diff (29 lines) adds:
  - the v6 constants;
  - an activation gated on the act file;
  - a v5 gate-off keyed on the v6 act file.
- It adds no `PWB_EFFECT_AMENDMENT_ACTS` link, offering entry or exemption, so there is no chain link before the act.

## Commands run

All run from the worktree unless noted.
- `git rev-parse HEAD`; `git status --short`; `git diff --stat d7bfcce2 HEAD`; `git diff d7bfcce2 HEAD -- scripts/check_governance.py`
- `python3 scripts/build_public_source_screening_scope_v6.py --manifest-digest`, which equals `sha256sum` of the manifest file
- `… --check` (rc 0), `… --selftest` (49 of 49, rc 0), `… --score` (42 rows), `… --self-corpus`
- A scratch `apply.py`: applies the patch to the on-disk policy, hashes the result, and does a structural JSON diff
- A scratch `probe.py`: 19 bodies through `v6.screen` at version 5 and version 6 bytes, plus Python/node span agreement
- A scratch `lin.py`: every-offset timing on adversarial shapes in node and Python
- `python3 scripts/dossier_run_citation_census.py --run ~/.local/state/syzygy-dossier/run-4465d22f5ce1829ca49059a5b8451bb0`
- The same counts by `jq` over `drafts/*.json`, projecting `path`, `startLine` and `endLine` only
- Python over `docs/evidence/redis-trial-metadata-2026-11-03.json` (`perFileOutcome`)
- `git grep -nF/-lF/-cF` sweeps: the v5 version literal, the v5 act file name, `SCOPE_DETECTOR_TEXTS`, `base_bytes`, `scope_v5`, `known-token-formats-extended`, `modules/modules.md`, and tests naming the policy file and v6-changed fields
- `git show d2b48c50` (the draft pattern and clause); `git show dfd18902:…/SEMANTIC-DELTA.md`; the commit messages of `b4230850`, `8f4532a9` and `76361363`
- `git show origin/agent/owner-questionnaire-2026-11-05:.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05.md` (item 1)
- `python3 scripts/check_governance.py`: 31 OK, 21 WARN, 1 FAIL, rc 1
- `python3 scripts/check_docs_review_campaign_partition.py --check`: PASS, denominator 744, unmatched 0

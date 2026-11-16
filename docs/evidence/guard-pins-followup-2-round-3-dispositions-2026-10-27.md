# Guard pins, round 3: review dispositions, rounds 1 to 3

[Observed] This record gives the dispositions of the three CC-REV-1 review
rounds of `syzygy-bpyt.8.39` (pull request #541). The change is test-only, in
two files: `workspace-reach.test.ts` and `workspace-reach.testkit.ts` in
`packages/polaris-generation-core/src/`. It carries notes N1, N2 and N4 of the
PR #536 review, and N3's optional comment clause
(`docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-1-RAW.md`):
- a row pins that the resolver reads the root manifest's declarations;
- three refusals the testkit comment names get rows;
- the testkit's `npm:` comment clause is rewritten.

The lane's evidence and its checker, `record.py`, are under
`docs/evidence/syzygy-bpyt-8-39/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-1-RAW.md` | `REVISE` | `5db78a26` | `r1-review.diff` sha256 `c4dfc588a5d9639671974689576693a7cc22fcd7abe68c5a0e844b8568f7584c` |
| 2 | `docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-2-RAW.md` | `REVISE` | `58e8f604` | `r2-review.diff` sha256 `6b3da14cf9c3c9a551eca65c9e54a9bd058a3f2db9f7765ae5f709dafd64384f` |
| 3 | `docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-3-RAW.md` | `REVISE` | `93dc0390` | `r3-review.diff` sha256 `db9e4ee53a6c0eeb2e4af931f9ce0fb5d1344b0fd50bdd705bca71719a6c359b` |

The code commits, all over base `d38d7a3c`:
- `308a62f4`, the first;
- `5f0d5547`, the round-1 repair, where the whole suite ran;
- `00b7dcf7`, the round-2 repair;
- `c5fe2d40`, the round-3 repair.

The whole PR's code diff, `git diff d38d7a3c c5fe2d40` over the two files, is
+24/−4 and hashes to
`4e5166fcaa8f37ce230679774b410e9e8df7759777f5919d9b6858ddca65bf05`. The
evidence head is `39b52beb`.

Every blocking finding of all three rounds was the same sentence: the
testkit's `npm:` clause, which states what npm installs for an `npm:` alias.
Each round found the previous round's text false for a case the previous
round had not probed. In each round the guards were unaffected, because every
`npm:` alias is refused (failing closed), every workspace is
`@syzygy/`-scoped, and the `@syzygy/*` branch reads such a name first.

## Round 3's finding, and why there was no round 4

Round 3's F1: round 2's six lines are false as written when the root's
manifest and a workspace's manifest both declare the same alias (case Q1,
`wlib: npm:typescript@^5.5.0` in both). The text says npm links the
workspace. In fact npm fetches `typescript` from the registry, because it
skips only the root's declaration and reads the workspace's by its own range.
Over the 51 recorded cases, the text as written disagrees with npm on Q1
only. The reviewer gave exact six-line replacement text,
`f1-r3-replacement.txt`, sha256
`2aad70a67dbcb898a27f7b5f09641ac77a8d3d5c9790970cfd42ddfb8f2ef432` (now
`r3/f1-r3-replacement.txt` in the retained evidence). Applied to `00b7dcf7`'s
testkit, it gives an equal token stream (1,287 of 1,287 tokens) and an equal
emit.

**Ruling (coordinator, 2026-10-27).** Round 3's brief set its stopping rule
before the round: if a sentence of the clause were still false, the reviewer
would give exact text and the coordinator would take it to the owner rather
than run a round 4. Under the owner's direction that repair-versus-cycle
questions are the coordinator's, the coordinator took the reviewer's text,
with the follow-ons the reviewer listed, and ran no round 4. The lane applied
it at `c5fe2d40`. The coordinator then checked the result mechanically, and
all of the following hold [Observed]:
- **The testkit.** Lines 64-69 at `39b52beb` are byte for byte the
  replacement's six lines, and no other testkit byte changed from
  `93dc0390`. The whole file equals the reviewer's checked copy
  (`r3/tools/testkit-with-f1-r3.ts`, sha256
  `ca95245c8fd80b511d9b15c5fce3ab72eb2b5e5ef4bbd6fe9f7614721096bf79`), so
  round 3's token and emit equality covers it. `LOCAL_VERSION` stays at
  line 79.
- **The test file** is unchanged since `93dc0390`.
- **`record.py`** follows the reviewer's list:
  - `F1_CLAUSE` holds the six lines, pinned by the replacement's sha256;
  - `F1_RETIRED` gains round 2's "either the root's manifest declares it"
    and round 1's "and that workspace's version satisfies it" (round 3's N2);
  - `npm_alias_probe.py` gains case Q1, keyed by both manifests and expected
    to request `typescript` from the registry. The lane re-ran the probe
    offline: Q1 gives ENOTCACHED, and the other 14 results are byte-identical.
- **`record.py` on the landing tree**, merged with main:
  - `--check`: "summary.json matches ; problems: 0";
  - `--selftest`: "selftest: 74/74 mutations make a check fail".
- **Hosted CI.** `checks` and `node` pass at `39b52beb`.

## Class and the GP-Q0 ruling

All three rounds ruled classes 1, 4 and 6, with no endpoint removed (round 1
raw `:63`, round 2 raw `:80`, round 3 raw section 2):
- classes 1 and 4: the resolver is the island guard's mechanism, and that
  guard is the rule-6 kill evidence for the 8.1 ruling's class-1 and class-4
  claims;
- class 6: the resolver rows pin what the daemon-path guard refuses.

Every round found that nothing a gate accepts or refuses changes under GP-Q0.
The new rows pin behaviour the resolver already has. The two rows the
round-1 repair added each kill their mutant alone, at the head and on the
merge (round 2 raw section 6). The `npm:` clause is
comment text, with an equal token stream and emit. The owner notice that
GP-Q0 asks for classes 1 and 4 is posted on `syzygy-bpyt.10` at landing.

## Round 1: one blocking finding, four notes

Round 2 gives a verdict on each repair (round 2 raw section 6).
- **F1** ("npm installs it from the registry" is false: npm links an alias
  declared under a workspace's own name whose range that workspace's version
  satisfies). Not met in round 2: the false sentence is gone, but round 1's
  replacement, applied verbatim, was itself false for a root-manifest
  declaration (round 2's F1). It is superseded, through round 2's text, by
  round 3's.
- **N1** (two refusals the comment states had no row): met. The rows for a
  git spec ending in a tarball extension and an unversioned `npm:` alias each
  kill their mutant alone.
- **N2** (an unscoped workspace is read by its bare name as outside): met as a
  named residual in the testkit. The closure is the owner question
  `syzygy-bpyt.1.17`.
- **N3** (`record.py` did not check `scratchSha256`): met.
- **N4** ("the full run" meant two of nine projects): met. `suite.json` is
  one whole-suite run at `5f0d5547`.

Round 1's F1 asked this record to correct two earlier texts. Neither is
edited: a raw is kept verbatim under CC-REV-6, and the #536 record sits
beside its own reviewed bytes. Read them as follows.
- **The #536 raw's inference**
  (`docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-1-RAW.md:150`): "so npm fetches
  the alias target from the registry". This does not hold when the
  dependency's own name is a workspace's name. npm decides by the name the
  dependency is declared under. Round 3's six lines, now in the testkit,
  state when it links and when it fetches.
- **The #536 dispositions' N4**
  (`docs/evidence/guard-pins-followup-round-1-dispositions-2026-10-27.md:116-118`):
  "the `npm:` comment clause does not say that npm installs every alias from
  the registry". That premise is false, and the rewrite this PR carries does
  not say it.

## Round 2: one blocking finding, three notes

Round 3 gives a verdict on each repair (round 3 raw section 6).
- **F1** (round 1's text is false for a root-manifest declaration: npm skips
  a root declaration under a workspace's name, whatever its version, and
  links the workspace). The repair applied round 2's six lines exactly.
  Round 3 found them false as written for case Q1, as above, and they are
  replaced by round 3's text.
- **N1** (the probe read the host's npm config in two calls): repaired.
  Round 3's N3 found the remaining case.
- **N2** (an undated "today" count): repaired as "At syzygy-bpyt.8.39, 0 of
  the 12 workspaces are unscoped;". Round 3's N5 found one undated copy in
  the PR body (`:10`), which the lane has since dated.
- **N3** (process): partly repaired by round 3. Its remaining items are done
  at landing:
  - the main pointer and merge evidence are refreshed;
  - the battery ran on the landing commit;
  - this record is written.

## Round 3: one blocking finding, five notes

- **F1:** repaired by the reviewer's exact text, with no round 4, as ruled
  above.
- **N2** (`F1_RETIRED` banned two phrases, not round 1's rule): repaired in
  the F1 repair. Both phrases are added, each with a selftest mutation.
- **N1, N3, N4 and N5's `:60-63` item** are carried to `syzygy-bpyt.39`:
  - N1: two predicates of `record.py`'s comment-only check have no
    `--selftest` entry;
  - N3: the probe's `npm --version` call reads the caller's directory
    `.npmrc`;
  - N4: "which other package managers can link locally" is stated as fact,
    and no round observed it. This is [Unknown], and it stands unhedged in
    the testkit until that bead lands. Every alias is refused, failing
    closed, either way;
  - N5's `:60-63` item: the `file:` and `link:`/`workspace:` bullets do not
    carry the root-manifest exception.
- **N5's other items** (the dated PR-body count, and this record) are done.

## Retained review evidence

The three reviewers' tools and results are kept under
`docs/evidence/guard-pins-followup-2-review-2026-10-27/`, 133 files. Each
raw's cleanup section lists every kept file with its sha256. At landing, a
script checked each list against the reviewer's directory, and every file
matched its listed sha256 with no file unlisted:
- `r1/`: 44 of round 1's 52 listed files. Not retained: 7 logs (governance,
  quotations, two typecheck and three `npm ci`) and `pr-body-now.md`.
- `r2/`: 50 of round 2's 57. Not retained: 6 logs (governance, quotations,
  typecheck and three `npm ci`) and `pr-body-now.md`.
- `r3/`: 39 of round 3's 42. Not retained: 2 `npm ci` logs and `pr-body-r3.md`.

Each raw quotes the result lines of the logs it drops. A governance log
quotes the retired phrases it reports, so a tracked copy would fail CG-2a.
The three PR-body snapshots quote truncated digests of earlier evidence
states, which CG-15 refuses outside a raw; the PR body itself is on the pull
request, and each raw cites the lines it relied on.

Revise-severity findings open: 0. This is an implementation record and binds
nothing.

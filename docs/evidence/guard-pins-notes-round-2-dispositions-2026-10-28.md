# Guard-pin follow-up notes, second pass: review dispositions, round 1

[Observed] This record gives the dispositions of the CC-REV-1 review of
`syzygy-bpyt.49` (pull request #553). The change takes the notes N1, N2 and
N3 of PR #547's round-1 review
(`docs/reviews/R-GP-IMPL-GUARD-PINS-NOTES-1-RAW.md`; dispositions
`docs/evidence/guard-pins-notes-round-1-dispositions-2026-10-28.md`). It
changes evidence tooling only: 3 paths under `docs/evidence/syzygy-bpyt-8-39/`,
5 under `docs/evidence/syzygy-bpyt-39/` and a new record directory
`docs/evidence/syzygy-bpyt-49/`. No guard, test, product, workflow or
governed file changes.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-GUARD-PINS-NOTES-2-RAW.md` | `REVISE` | `6f9c0a5b` | `r1-review.diff` sha256 `445f0b086adf88a4c8ff996dac03853ca10f0a72de9f2b34b208bc9ab6c6e105` | `58610fe6644c0f24c284679ca5a713582f0f7dc7d99fec39c5fc54d5cb00e6b9` |

The subject equals `git diff a1b9bde2 6f9c0a5b`: 17 files, all under
`docs/evidence/`. The reviewer re-derived it (raw section 1).

## The one blocking finding, and why there was no round 2

[Observed] Round 1's only blocking finding, F1, was a sentence in the PR
body: "Commits: `e8cd624e` (the changes and the new tools), then `6f9c0a5b`
(the records those tools wrote …)". Two of the new tools, `record.py` and
`site_drop.py`, are first committed in `6f9c0a5b`, and two records are their
output. The reviewer gave exact replacement text. Lane A applied it to the
body by script, verbatim, with a short "Review round 1" paragraph, and pushed
no commit, so the head stays `6f9c0a5b`. The raw's own check,
`grep -c -F 'the changes and the new tools'` over the served body, prints 0.

As for PR #547, a PR-body sentence is not a reviewed head byte, so the
repair needed no fresh round. Everything else the reviewer checked held:
N1, N2 and N3 met with every copied hunk equal to the reviewer's text; the
three selftests 77/77, 27/27 and 28/28, also on local merges with `1a8864d9`
and `e4a3a607`; `guard_probe.py` 8/8, `mutants.py` 15/15, `site_drop.py`
16/16; both probes re-run byte-identical. Revise-severity findings open: 0.

## Class

[Observed] The reviewer ruled CC-REV-1 class none: evidence tooling only, and
nothing changes what a gate accepts or refuses. No owner notice is due.

## The notes

- **N1** (five sub-predicates of the new `record.py` have no selftest entry),
  **N2** (a guard-mutant row may drop its `old`/`new` and still pass), **N3**
  (the guard's cases reach only the grandparent), **N4** (no live check pins
  the 8.39 hook before the filter), **N5** (the 8.39 probe docstring routes
  to the previous blob's traces) and **N7** (nothing checks
  `site-drop.json`'s `recordSha256`): evidence tooling, carried to
  `syzygy-bpyt.69` with the reviewer's verified fixes.
- **N6** (the record pins `e8cd624e`, which only a merge commit keeps
  reachable): the PR lands by a merge commit.

## The landing

The landing commit merges main `a15b6a04` (PR #549 among others) into the
reviewed head `6f9c0a5b`, with no conflict. Of the PR's 17 paths, main
changed none since the merge base `a1b9bde2`, and every one is byte-equal to
`6f9c0a5b`. The battery at the landing commit and hosted `checks` and `node`
there are in the landing note on the pull request.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/guard-pins-notes-review-2026-10-28/r2/`, 6 files, beside
round 1's `r1/`. The raw's cleanup section lists 6 kept files with their
sha256. At landing, a script checked all 6 against the reviewer's directory:
6 matched, 0 failed, and no file was unlisted. No governance, quotation,
typecheck or `npm ci` log and no copy of the PR body was kept.

This is an implementation record and binds nothing.


## N1, N2 and N7 evidence-validator follow-up · 2026-11-24

[Observed] `syzygy-bpyt.69` follows the three evidence-validator notes in the
retained R1 [N1 and N2](../reviews/R-GP-IMPL-GUARD-PINS-NOTES-2-RAW.md#n1--five-sub-predicates-of-the-new-recordpy-have-no-selftest-entry-low-evidence-tooling)
and the N7 digest check on lines 384–391. The exact source and regenerated
records are at `484c2309308e9a31bca6ad6ea1c2ee72c509bc04`, over
`23d433ad87d64924754c59a8d20159be35364a54`. The pinned historical Git subject and
the original review and probe archives remain available. This follow-up ran
the retained-JSON validator in private scratch directories. Its inputs were
the committed JSON and pinned Git objects.

- N1 gives all five previously unexercised operands dedicated fixtures. The
  unmutated-row path fixture points at the other genuine record with its
  matching digest, isolating the path check.
- N2 requires two string fragments for a guard mutant, one occurrence of the
  old fragment and a different replacement. The unmutated row carries
  neither fragment. In a scratch instance the previous reader accepted the
  retained G1 row with either fragment or both set to null. The revised
  reader flags the individual missing-fragment fixtures.
- N7 checks the exact helper bytes against `summary.json`'s
  `tools["record.py"]` and `site-drop.json`'s `recordSha256`. It also
  checks `site-drop.json`'s named `record` path. This occurs in
  `--check`. The `--selftest` run used by `site_drop.py` relies only
  on the underlying records so that it can regenerate the site sweep.

[Observed] Exact SHA-256 identities for the three changed record files:

| File under `syzygy-bpyt-49/` | SHA-256 |
|---|---|
| `record.py` | `523e9b910c7ae4d247ebfc3ef4148890aca9966503d151bdf248c21233c09bfb` |
| `summary.json` | `cbc1109ab7372e9bff7ea793d22f0c974a360af5dd72a5ac742ca3b5d712374f` |
| `site-drop.json` | `97a8587b028cd76968b6024239cea042b85be2842bd1f706294571e328349d98` |

[Observed] Both ordinary inputs passed `--check`. The revised reader killed
36/36 selftest mutations. The derived sweep enumerated 16/16 append sites
and each recorded a nonzero run and its surviving fixtures. For each
replacement below in a scratch copy of the exact `record.py`, only the
named fixture survived, and the other 35 results and first refusal messages
matched the unchanged reader. The ordinary input passed before each
36-fixture run. The `old` and `new` values below are JSON strings.

```json
[
  {
    "old": "rerun['exit'] != 0 or ",
    "new": "",
    "fixture": "a root-exception re-run that failed",
    "refusal": "guard: the root-exception probe re-run did not write the committed record"
  },
  {
    "old": "rerun['record'] != ROOT_RECORD or ",
    "new": "",
    "fixture": "a root-exception re-run naming another record",
    "refusal": "guard: the root-exception probe re-run did not write the committed record"
  },
  {
    "old": " or t['exit'] != 0",
    "new": "",
    "fixture": "a lane trace whose run failed",
    "refusal": "npmrc-trace: not a passing run of CODE's npm_alias_probe.py"
  },
  {
    "old": "t['probe'] != PROBE or ",
    "new": "",
    "fixture": "a lane trace naming another probe",
    "refusal": "npmrc-trace: not a passing run of CODE's npm_alias_probe.py"
  },
  {
    "old": "r['record'] != (R839 if r['id'].startswith('N2') else R39) or ",
    "new": "",
    "fixture": "an unmutated row of the other record",
    "refusal": "mutants N2-0-unmutated: not CODE's docs/evidence/syzygy-bpyt-39/record.py"
  },
  {
    "old": "old is None and new is None",
    "new": "old is None",
    "fixture": "an unmutated guard row carrying a fragment",
    "refusal": "guard docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py G0-unmutated: not one edit of CODE's probe"
  },
  {
    "old": "isinstance(old, str) and isinstance(new, str)\n                and source.count(old) == 1 and old != new",
    "new": "old is None or (isinstance(old, str) and isinstance(new, str)\n                and source.count(old) == 1 and old != new)",
    "fixture": "a guard mutant missing its old fragment",
    "refusal": "guard docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py G1-node-modules-not-looked-for: not one edit of CODE's probe"
  },
  {
    "old": " and isinstance(new, str)",
    "new": "",
    "fixture": "a guard mutant missing its new fragment",
    "refusal": "guard docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py G1-node-modules-not-looked-for: not one edit of CODE's probe"
  }
]
```

[Observed] The older reader accepted each single-field change to
`site-drop.json`, first to set `record` to
`docs/evidence/syzygy-bpyt-49/site_drop.py` and then to set `recordSha256`
to 64 zeroes. The revised reader refused each with
`site-drop.json record identity and digest DIFFER` and a matching summary.
Both readers independently refused changing `summary.json`'s
`tools["record.py"]` to 64 zeroes, with
`summary.json DIFFERS ; problems: 0 []`. The revised reader still reported
that the site-drop identity and digest matched in that last control.
Restoring each field recovered the respective passing output and exit 0.

[Observed] N3, N4 and N5 remain open on `syzygy-bpyt.69`. N6 retains its
original merge-history disposition. Neither this follow-up nor its
verification exercised a live probe or changed product, guard or CI code.

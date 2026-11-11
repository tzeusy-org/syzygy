# Launch consent version 1.2, round 17: dispositions of record

Reviewed record: docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-17-RAW.md

[Observed] Round 17 returned **CONFIRM WITH EXCEPTIONS** over `155f9c490093f29dd77ba151b631d7e0c0c04997`, with eight notes and no finding that requires a change. The confirmation binds the package and post-apply spec bytes it read, and no byte of either has changed since. Notes that ask for a spec edit are left for a later version, not repaired here.

## 1 — Round-16 Finding 1 is repaired: the four scenarios now carry line 187's failed-removal exception

[Observed] No change.

## 2 — I re-ran the removal sweep by script: 50 occurrences on 16 lines, as stated; one class label is off by one, with no effect on the result

[Observed] Left. The reviewer is right: line 33's "never edits or removes one" is a prohibition, so class E holds 4 occurrences and class F holds 1, not 3 and 2. Neither class can tie a run to a removal that fails, so the sweep's result stands. `ROUND-16-DISPOSITIONS.md` is part of the confirmed package and is not edited. This record is where the correction lives.

## 3 — The re-keyed fetch-process branches are observable, mutually exclusive and exhaustive; round-16 Finding 4 is resolved

[Observed] No change. The reviewer's aside, that arms 046.5 and 047.16 omit "as Git reported" and so enforce less than the SHALL, is left for a later version.

## 4 — "which no other run states" at line 242 is now false under one of its two readings, because line 37 requires the new failed-fetch statement of every copy-class run

[Observed] Left for a later version. No arm makes the clause a prohibition, and no conforming run is forced into a false statement. The delta states the intent: "A no-copy run states no such thing". The confirmed spec bytes are not edited.

## 5 — Line 246 now names the not-removed statement as a copy statement; round-16 Notes 6 and 7 land

[Observed] No change.

## 6 — The `core.bare` / `core.worktree` read is no wider than needed, but it does not reach a repository that keeps those keys in `config.worktree`

[Observed] Left for a later version. It joins the two Unknowns carried from rounds 13 to 16: whether "inside" is judged on resolved paths, and how a pruned or locked worktree entry counts. [Unknown] How often operators' clones keep `core.bare` or `core.worktree` in `config.worktree`.

## 7 — No changed line conflicts with predecessor REQ-033 to REQ-036

[Observed] No change.

## 8 — Round-16 Notes 2, 3 and 8 need no action; the rest of the package agrees with the repair

[Observed] No change.

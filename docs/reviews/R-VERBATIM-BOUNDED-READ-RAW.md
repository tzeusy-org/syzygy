# R-VERBATIM-BOUNDED-READ — review of PR #729 (syzygy-bpyt.6.17), verbatim route through readBoundedBlob
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 8575f494ce319cfb67619ba6c2349d1b573e1436
Subject: PR #729 head; `apps/three-surface-poc/src/verbatim-route.ts` sha256 5f007660acee4dfe17a99dc6517330a63f65dde110d3e30eb1bbdbb17a9bde94, `packages/three-surface-poc-core/src/git-object-reader.ts` sha256 ddd0fd1f976adc5779b40b8f14f072fc429ac9ddf321fe0b1bb7ecb791119dee, evidence `docs/evidence/syzygy-bpyt-6-17/verbatim-bounded-read-differential-2026-11-04.json`

Reviewer: pr-review worker for syzygy-zfya, fresh context, 2026-11-04.
Merge base with origin/main: 3ee4c518f2cc2c3e1190de8b598f266f502948fa. Old
route compared: `f5640845:apps/three-surface-poc/src/verbatim-route.ts`
(sha256 e4d20442162dd42631a7ccd8016016a9f232fed8a5ef924ac08f899b389c6016),
byte-identical to the merge base's copy (`git diff f5640845 origin/main --
<path>` empty) [Observed].

## Summary

Nothing the route serves changes, and no unscanned or unbounded byte can be
served [Observed over 37 differential rows: the author's 21 and 16 of mine].
The authority gate and the scan order are unchanged. The exceptions are
about the evidence and about disclosure. They are not about the code's
safety:

- E1 (repair before merge): the evidence record says real git cannot
  produce `over-bound-forged` [Inferred there]. Real git can, through
  `refs/replace` [Observed]. The record needs correcting.
- E2 (disclose to the owner, GP-Q0): three reachable inputs, and one that
  needs a lying git binary, now get a different not-rendered reason. In
  each, both sides render nothing and the new code refuses earlier.

## 1. Security and consent (SEC-*, PWB-REQ-005/011)

- Gate order [Observed, diff read]. Every authority, population, rule,
  revision, identity, record-outcome, anchor and denied-path check
  (`verbatim-route.ts` steps 1 through the `deniedPathReason` check) is
  unchanged and still runs before any `runGit` call. The first Git call is
  `cat-file -s`, which returns a size and no body bytes.
- Scan order [Observed]. `verbatimReadPolicy.screen` runs `detectSecrets`
  and then `scanActiveContent`, the same order as the old route. Both run
  over the whole decoded text. `readBoundedBlob` runs the NUL check and
  strict UTF-8 before the screen and the object-id hash before those, so
  the bytes are only returned after the hash, NUL, UTF-8, secret and
  active-content checks. The old route ran the hash first, then size, then
  the same chain.
  - The ledger handed to it has `maxTotalBytes` and
    `maxParsePassesPerSource` set to `Infinity`. `evaluateLimit` allows
    those, since only `observed` must be finite. The screen ignores
    `charge`, so no new refusal can arise from the ledger [Observed, code
    read].
- TOCTOU between `cat-file -s` and `cat-file blob`. Object ids are content
  addresses, so a given id can only have two different answers if
  `refs/replace` changes between the calls or the `git` binary lies.
  - Either way the production runner caps stdout at
    `maxBuffer: limits.maxBytesPerSource`. Then `readBoundedBlob` hashes the
    bytes against the anchor's object id before any decode or scan.
  - So a size lie cannot cause buffering above the per-source envelope, and
    bytes that are not the consented object never reach a scan or the
    output.
- `-s` reports small but the blob streams large [Observed, case
  `git-size-lie-streams-3MiB`]. A git shim on PATH answered `-s` with `1`
  and streamed 3 MiB on `blob`.
  - New: execFileSync killed the read at the envelope, `readBoundedBlob`
    returned `git-read-failed`, and the route returned `undefined`. The
    runner returned 0 body bytes and wrote 0 stderr bytes.
  - Old: buffered all 3,145,728 bytes, then refused `reference-unresolvable`
    on the hash.
- Exact bound [Observed]. Node's `maxBuffer` admits exactly
  `maxBytesPerSource` bytes, matching `evaluateLimit`'s `<=`.
  - `bound-exact-default-1MiB` (1,048,576 bytes at the default limit) is
    served identically on both sides.
  - `bound-plus-1-default-1MiB` is refused identically, and new reads 0 body
    bytes where old read 1,048,577.
  - Production wires `gitBlobReaderFor(repoRoot)` and
    `verbatimRouteReader(current, …)` (`poc-main.ts:196`), both defaulting
    to `PWB_RESOURCE_LIMITS`, so the runner cap and the route's envelope
    agree. If a future caller passes different limits to the two, nothing
    enforces that they agree. That is a note, not a finding.
- Stderr [Observed]. Old wrote Git's stderr through `process.stderr` (71
  bytes for the non-blob case, 34 for the mid-read failure). New wrote 0
  writes in all 16 of my rows.
- Pre-existing, not introduced by this PR: neither the route's runner nor
  `git-observation.ts` passes `--no-replace-objects` /
  `GIT_NO_REPLACE_OBJECTS`. The Polaris generation isolation does pass it
  (`polaris-generation/isolated-git.ts`). Replace refs are what make E1/E2
  reachable.

## 2. GP-Q0 differential (reviewer-built, old f5640845 vs new 8575f494)

Method.
- The driver ran at the PR head in the integration tier and was not
  committed. It copies the f5640845 route to `verbatim-route-olddiff.ts`.
- Each side's production `gitBlobReaderFor` runs over a temporary sha1
  repository holding the fixture blobs. Replace refs are written after the
  evaluation, and a PATH shim stands in for git in the two failure modes.
- The outcome is compared as JSON: `undefined`, bytes (length, sha256), or
  refusal `{refused, detail}`.
- Driver sha256 56e83a84318d23f2282d7ce7dfd67b9aa95a0d90d7334c0e374303e1f18584be.
  Shim sha256 bb4cdaf624345da266e49fdd1fbc404d3c9f227ef0e9e50be934fa7c8b64c81f.
  Output sha256 15006113e93df58883c0d53c855130a14503a553c70986b085a83844950688ae.
  All three are retained outside the repo; the case list is reproduced
  below.

Denominator 16. Identical 12, different 4.

| case | spec bytes | limit | old | new | old/new body bytes buffered | same |
|---|---|---|---|---|---|---|
| bound-exact | 566 | 566 | bytes 566 | bytes 566 | 566/566 | yes |
| bound-plus-1 (limit len+1) | 566 | 567 | bytes 566 | bytes 566 | 566/566 | yes |
| bound-minus-1 (one over) | 566 | 565 | excluded-content | excluded-content | 566/0 | yes |
| bound-exact-default-1MiB | 1048576 | 1048576 | bytes 1048576 | bytes 1048576 | 1048576/1048576 | yes |
| bound-plus-1-default-1MiB | 1048577 | 1048576 | excluded-content | excluded-content | 1048577/0 | yes |
| binary-nul-within | 569 | 1048576 | excluded-content (not text) | same | 569/569 | yes |
| binary-nul-over | 569 | 16 | excluded-content (envelope) | same | 569/0 | yes |
| secret-just-past-bound | 594 | 567 | excluded-content (envelope) | same | 594/0 | yes |
| secret-just-inside-bound | 594 | 594 | excluded-content (detector) | same | 594/594 | yes |
| nonblob-tree-under (replace blob→tree) | 566 | 1048576 | undefined | undefined | 0/0 | yes |
| nonblob-tree-over (replace blob→tree) | 566 | 16 | undefined | excluded-content (envelope) | 0/0 | **no** |
| replace-blob-within | 566 | 1048576 | reference-unresolvable | reference-unresolvable | 576/576 | yes |
| replace-blob-over (limit len+4) | 566 | 570 | reference-unresolvable | excluded-content (envelope) | 587/0 | **no** |
| replace-blob-over-default-3MiB | 566 | 1048576 | reference-unresolvable | excluded-content (envelope) | 3145728/0 | **no** |
| git-fails-mid-read (shim: 100 bytes then exit 128) | 566 | 1048576 | undefined | undefined | 0/0 | yes |
| git-size-lie-streams-3MiB (shim) | 566 | 1048576 | reference-unresolvable | undefined | 3145728/0 | **no** |

In every row the source record is `classified`; the evaluation saw the
genuine blob. `undefined` renders as `source-uncaptured-or-unreachable`
(`capability-detail.ts` `resolveVerbatim`).

Where the four differences come from [Observed]:
- Both sides render nothing in all four. The new code refuses before a body
  byte moves, under a different reason word.
- The three `replace` rows use real git. `git replace -f <spec-oid> <other>`
  makes both `cat-file -s` and `cat-file blob` answer for the replacement.
  This is the author's `over-bound-forged` produced without a fake reader.
- It reaches production only if a replace ref is written into the observed
  repository after the evaluation and before the render.
  - At evaluation time the observer also honours replace refs, so the
    source would not be `classified` and an earlier gate refuses.
  - So the trigger needs write access to the observed repository's refs
    [Inferred].
- `git-size-lie-streams-3MiB` needs a git binary that misreports sizes. No
  real git does that [Inferred].

Judgment on the forged-case reason change: it can happen in production,
which contradicts the evidence record. It is still a "refuse earlier"
change: nothing that was served stops being served, nothing that was
refused starts being served, and the new code moves fewer bytes. The owner
should hear about it under GP-Q0 because the refusal vocabulary a reader
sees changes, not because of a consent or safety defect.

## 3. Mutations re-run (2 of 4, rule 6)

The baseline is `apps/three-surface-poc/src/verbatim-route.test.ts`
(integration) at the head: 20 passed. Each mutation was applied by exact
single-occurrence replacement in `verbatim-route.ts`, and the file was
restored afterwards (sha256 back to 5f007660…).

- M1 replaced `{ objectId, sizeBytes }, verbatimReadPolicy` with
  `{ objectId }, verbatimReadPolicy`. Killed: 2 failed, 18 passed. The two
  were "refuses a body over the per-source envelope having asked Git only
  its size, never its body" and "the production runner holds Git's stdout
  to the envelope: one byte over and the read itself fails". This matches
  the record.
- M3 replaced `, stdio: ['ignore', 'pipe', 'pipe'] }` with ` }`. Killed:
  1 failed, 19 passed. The one was "captures Git's stderr on the failure
  and writes none of it to the daemon's stderr". This matches the record.

## 4. Hosted CI at the head

`gh pr checks 729` [Observed]: checks pass, node pass, node (e2e) pass,
node (integration) pass, node (unit) pass. The PR is `MERGEABLE`.

## 5. Rule 11 on the evidence record

[Observed] The record names its subject path and digests.
- The old digest e4d20442… matches f5640845.
- The new digest 5f007660… and the core digest ddd0fd1f… match the bytes at
  8575f494.
- The driver digest 30689b5f… matches the committed driver.
- The "new" side names no commit, only "working tree on f5640845". Its
  digest equals the head bytes, so it can be re-checked.
- The record's `base` is f5640845 and the PR's merge base is 3ee4c518. The
  route file is identical at both, so the comparison still holds.
- Each mutant stores its `old` and `new` fragments.

## Findings

- E1 (repair, before merge). The evidence record's
  `differenceExplained.over-bound-forged` says "Real git cannot serve a blob
  that fails its own object id [Inferred], so no production input reaches
  this case." That is false for a repository with `refs/replace`; see
  `replace-blob-over` and `replace-blob-over-default-3MiB` above.
  - Correct the sentence to name the replace-ref path and the
    post-evaluation precondition.
  - The record should also state the non-blob replacement divergence
    (`nonblob-tree-over`: `undefined` became `excluded-content`), which its
    21 cases do not cover.
- E2 (owner disclosure, GP-Q0). Under replace refs or a size-lying binary,
  the reason rendered for a not-rendered leaf changes. It moves between
  reference-unresolvable, excluded-content and
  source-uncaptured-or-unreachable. What is served does not change.
  - Report this to the owner with the PR.
  - If the owner wants the old reason words kept, the narrow option is to
    run the route's (and the observer's) git with `--no-replace-objects`.
    Then a classified anchor can only resolve to its own object. That is a
    separate behaviour change (`replace-blob-within` would then serve the
    true consented object), so it needs its own bead and owner ruling. It is
    not a repair of this PR.
- N1 (note). The runner cap and the route's envelope agree only because both
  default to `PWB_RESOURCE_LIMITS`. A test or a single shared limits
  argument would pin that.

## Merge readiness

Ready once E1's evidence correction lands, which is a prose edit to the
record and no code change, and once E2 has been put to the owner. The code
at 8575f494 needs no change.

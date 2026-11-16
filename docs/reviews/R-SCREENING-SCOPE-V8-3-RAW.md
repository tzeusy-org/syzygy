# R-SCREENING-SCOPE-V8-3 — public-source screening scope, version 8 (private sources), round 3
Reviewed commit: fa258a0566f64374990d27c422bb5f244bc26488
Manifest SHA-256: 9128a0a2da6a4dccf5329f6630b2a2708e35af03dfc342dfd6cc9d3c75bde3a0
Verdict: REVISE

Reviewer: fresh-context independent reviewer (CC-REV-1), 2026-11-08. Brief:
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/REVIEW-BRIEF.md`
(round 3, the last round). No observed-repository body, dossier output, run
directory, `site/` file, clone or credential was read; no dossier command and
no provider call was made.

Abbreviations: `PKG` = `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8`;
`PATCH` = `PKG/proposed/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json.pv.patch`;
`POLICY` = `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`
(version-7 bytes on disk at the reviewed commit);
`BUILDER` = `scripts/build_public_source_screening_scope_v8.py`.

## Mechanical results (re-run this session at the reviewed commit)

- `python3 BUILDER --check`: "public-source-screening-scope-v8: patch and
  manifest current", exit 0 (in the worktree and in a scratch clone checked
  out at the reviewed commit).
- `--digests`: one row, `279b671b…`, `[variant: pv]`, equal to the manifest
  row (the act argument; not the head digest).
- `--manifest-digest` printed the digest in the head above; `sha256sum` of
  `PKG/PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt` printed the same value
  (two methods).
- `--selftest`: "43 of 43 passed".
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `git diff --stat 3a07714d fa258a05`: 11 files (seven package files, the
  patch, the builder, the campaign file, the round-2 raw).
- Rule-6 probes (mutated builder copies run inside the scratch clone):
  - per-path check disabled (`if False and per_path != EDITS_PER_PATH`):
    "FAIL an extra edit at a pinned path, count kept, is refused per path",
    42 of 43. The case fails for the reason it names.
  - phrase loop shortened to `RULE_PHRASES[:-1]`: "FAIL a rule without 'every
    read under this scope is refused' is found", 42 of 43.
  - edit 7's new text weakened in EDITS ("on its path or its body" → "on its
    path"): `--check` gives "FAIL pv: patch differs from its regeneration over
    the version-7 bytes" and "FAIL manifest differs from its regeneration",
    exit 1.
  - each of the seven `RULE_PHRASES` occurs exactly once in
    `SOURCE_VISIBILITY["rule"]`, so `replace(..., 1)` in each drop case
    removes the only copy.

## Criterion 1 — round-2 dispositions

| # | Repair answers the finding? | Locations and claims true? |
|---|---|---|
| 1 | Partly. Edit 7 closes the rendered/egress route for detector-matched private blobs only. Finding 1 | Install sites true: `packages/polaris-dossier/src/check-derive.ts:257-258`, `packages/polaris-dossier/src/render.ts:389-395` and `:679` |
| 2 | Yes. PATCH:24 names the two act files "and by no other act"; pinned (BUILDER:289-291) | [Observed] only `PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md` exists under `.syzygy/governance/decisions/`, as `SEMANTIC-DELTA.md:70-72` says |
| 3 | Yes, with a definitional gap. Finding 4 | PATCH:24, pinned by "every read under this scope is refused" |
| 4 | Yes | `RULE_PHRASES` (BUILDER:289), `EDITS_PER_PATH` (BUILDER:296-299), case at BUILDER:537; 43 = 4 controls + 39 mutations; `ROUND-1-DISPOSITIONS.md:11` says "four" with a dated correction |
| 5 | Yes in the delta and packet; not in the signed bytes. Finding 2 | `SEMANTIC-DELTA.md:134-145`; `PKG/OWNER-DECISION-PACKET.md:26-31` |

## Findings

### 1. Edit 7 withholds fingerprints only for detector-matched private blobs; denied-path and indeterminate private blobs keep object id and size rendered and egressable, so the signed residual statement is false — Moderate (revise) [Observed code; Observed policy text; Inferred reach]

PATCH:35 (edit 7) withholds "the object id and size of a blob that any
detector matched, on its path or its body". PATCH:28 (`consequence`) then
says: "The residual left is the run directory itself and the operator's
clone, which holds every object id; whoever can read either can still confirm
a guess."

That is not the whole residual. Detectors never run on two excluded
populations, so edit 7 never reaches them:

- Denied paths. `packages/polaris-dossier/src/screen.ts:156-158`:
  `screenPath` returns `'denied-path'` before `detectSecrets` is consulted on
  the path. POLICY:451-461 denies `.env`, `.env.local`, `.env.production`,
  `credentials.json`, `secrets.json`, `id_rsa`, `id_ed25519`, prefix `.env.`
  and suffixes `.pem`, `.key`, `.p12`, `.pfx` — the most secret-dense files a
  private repository holds. Their bodies are never read, so no detector
  "matched" them.
- Indeterminate blobs. POLICY:241: "excluded from reading and from egress …
  Its path, object id and size remain code-structure", which includes
  "configuration or data in an extension outside sourceExtensions". Edit 7
  does not amend `indeterminate`, and `unchanged` (PATCH:26) keeps
  contentClassification "except the code-structure rule above".
- (Also bodies excluded before detectors run: not-UTF-8, and resource-limit
  failures, POLICY:48; and bodies whose secret the literal detectors miss.)

[Observed] The dossier renders the object id of such a blob today:
`check-derive.ts:257-258` nulls `objectId` only when the outcome is
`secret-detector-match` and the path itself matched; a `denied-path` or
`unknown-extraction-class` outcome keeps it, and `render.ts:679` writes
`object <algorithm>:<objectId>`, `render.ts:395` puts it in the source
population. [Inferred] A private `.env` whose public upstream or template is
`.env.example` with the values blank is exactly the "template" case
`consequence` names; its object id remains a confirmation oracle on the
pages, and as code-structure it can leave under an egress consent that names
the private pair and lists code-structure. The size of an `id_rsa` or `.pem`
also reveals key type and length.

So the conservative choice is not the one taken: the consequence's own
reasoning ("an object id is a whole-body digest") applies to every excluded
private blob whatever the exclusion reason, and withholding it costs the same
"less specific exclusion row". The text that misstates the reach:

- PATCH:28 / BUILDER:167, "The residual left is the run directory itself and
  the operator's clone".
- `PKG/OWNER-DECISION-PACKET.md:42`, headline "A withheld private file's
  fingerprint stays out of pages and sends" (the body, lines 43-45, narrows
  it to "a file a secret detector matched"; the headline does not), and
  lines 82-84, "What remains: anyone who can read the run directory, or your
  clone".
- `SEMANTIC-DELTA.md:124`, "Withholding them from pages and egress closes
  those routes".

Edit 7 does not conflict with RFC5-17 (the exclusion record carries the
content digest and location reference; nothing requires the object id to be
rendered) or with `targetMetadataRule` (its fields carry no object id), and
it changes nothing for a public repository except through the named
joined-pair exception. Those parts hold.

Required: either widen edit 7 to every excluded blob of a private repository
(any exclusion reason; and amend `indeterminate`'s last sentence to match,
pinned by the per-path count), or correct `consequence`, the delta row and
the packet to name the denied-path, indeterminate and pre-detector
populations as a residual that stays rendered and egressable.

### 2. The signed bytes still say no public rule changes, beside the two exceptions the delta names — Minor [Observed]

PATCH:25 / BUILDER:133 (`privateSourceRules`, edited in this diff): "No rule
of this scope is relaxed for a private repository, and no rule for a public
repository changes". The round-2 repair of finding 5 names two fail-closed
changes to public repositories in `SEMANTIC-DELTA.md:134-145`, and the second
is written in the policy itself: PATCH:24, "while one exists every read under
this scope is refused", public pairs included. The delta and packet are
right; the signed sentence contradicts them. (Editorial in the same
sentence: "secretRedaction.appliesTo (…) and rawBodyHandling.rule (…) and
contentClassification's code-structure rule" lists four sites with two "and"s.)

Required: qualify the sentence ("and no rule for a public repository changes,
except that it reads private when its pair does, and that a record with no
readable pair refuses every read").

### 3. "Every … class rule" is said to be kept; edit 7 changes one — Minor [Observed]

`SEMANTIC-DELTA.md:133` ("What this keeps"): "Every detector, placement,
class rule, exemption, denied path and limit." `PKG/IMPACT-LEDGER.md:188`
("Not affected"): "Every detector, placement, class rule, exemption and
consent." Edit 7 amends the code-structure class rule (PATCH:35). Both
sentences predate edit 7 and were not updated.

Required: add "except the code-structure rule (edit 7)" at both sites.

### 4. "Effective-looking" is undefined, so a record unreadable as a whole has two readings — Minor [Inferred]

PATCH:24: "An effective-looking observation consent record whose pair cannot
be read … every read under this scope is refused". The refusal is
implementable and fail-closed for a record whose effectiveness can be read
but whose pair cannot. For a record that cannot be read at all (a launch
record commit on the dedicated reference that does not parse), whether it is
"effective-looking" is itself unreadable. One reading refuses (fail closed);
another treats it as not effective and ignores it, and if it was a private
fork's record of a public pair, that pair reads public (fail open). The rest
of the rule ("every other effective … record of the same pair … cannot be
read" → private) does not reach it, because its pair is unknown. The
requests/redis reader refuses the whole read on any unknown form
(`packages/polaris-generation-consent/src/package-reader.ts:30-32`), so the
gap is reachable only for launch records.

On the choice itself: refusal over "every pair private" is the better one
for the reason `ROUND-2-DISPOSITIONS.md:14` gives (a refusal names the fault,
VIS-2; a silent re-labelling would change every repository's rules without
saying why). Its cost, not stated anywhere: [Inferred] launch records live
in a reference within agent sessions' write reach (round-2 note N1), so one
malformed record written there stops every run, redis included. That is
availability only, and fail closed.

Required (one phrase): "a record whose effectiveness or pair cannot be read",
or define "effective-looking" as "not shown to be revoked or superseded".

## Criterion 4 — rule 6 (no separate finding)

Each new case fails for the reason it names (probes above). The per-path pin
catches an extra edit at a pinned path with the count held (BUILDER:537 case;
killed when the check is disabled). The docstring's limit (pins sit beside
EDITS, BUILDER docstring lines 20-22) is stated, as round 2 asked.

## Criterion 5 — regressions

- No rule is relaxed: edit 7 only removes object id and size from
  code-structure for private repositories; the other six edits are unchanged
  from round 2 (PATCH diff: edit 7, the new rule sentences,
  `privateSourceRules`, `unchanged`, `consequence`). [Observed]
- Public rules change beyond the two named exceptions only in the sense of
  Finding 2 (the signed sentence denies both); no third change found.

## Criterion 6 — owner packet

Plain. Incomplete on one point: Finding 1 (headline line 42 and "What
remains", lines 82-84). The joined-pair egress loss (round-2 finding 5) is now
stated at lines 26-31.

## Notes (no change required)

- N1 [Observed] `ROUND-1-DISPOSITIONS.md:12` still describes the round-1
  carrier ("A record from an act form that `ADMISSION_ACT_FORMS` types
  `consent-observation` … states public by form identity"), which round 2
  replaced. It is a record of what round 1 did, so it is true as history;
  a reader looking for the current carrier should be routed to
  `ROUND-2-DISPOSITIONS.md:13`.
- N2 [Observed] PATCH:24 names
  `PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md`, which does not exist;
  an act later recorded at that path states public by form. That is the
  owner's act and is disclosed at `SEMANTIC-DELTA.md:70-72`.
- N3 [Observed] `ROUND-1-DISPOSITIONS.md:11`'s correction says round 2 "adds
  two more" phrases; it also dropped one (`ADMISSION_ACT_FORMS`), giving
  seven. The count is right; the drop is unmentioned.

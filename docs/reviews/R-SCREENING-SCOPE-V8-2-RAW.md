# R-SCREENING-SCOPE-V8-2 — public-source screening scope, version 8 (private sources), round 2
Reviewed commit: 3a07714dffae87c9cb64ccd98c15aae8f1871ab5
Manifest SHA-256: c881881511404e7aea31b748a9982a65c13a1de0cc359db021b72937cb639aef
Verdict: REVISE

Reviewer: fresh-context independent reviewer (CC-REV-1), 2026-11-08. Brief:
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/REVIEW-BRIEF.md`
(round 2). No observed-repository body, dossier output, run directory, clone
or credential was read; no dossier command and no provider call was made.

Abbreviations: `PKG` = `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8`;
`PATCH` = `PKG/proposed/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json.pv.patch`;
`POLICY` = `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`
(version-7 bytes, `1.8.0-…v7-s`, on disk at the reviewed commit);
`BUILDER` = `scripts/build_public_source_screening_scope_v8.py`;
`LC` = `openspec/changes/polaris-dossier-launch-consent/proposed/polaris-generation/spec.md`
read at `913c6b7d` (`git show`, read only).

## Mechanical results (re-run this session at the reviewed commit)

- `python3 BUILDER --check`: "public-source-screening-scope-v8: patch and
  manifest current", exit 0.
- `--digests`: one row, `[variant: pv]`, equal to the manifest row
  (`b2907070…`, the act argument; not the head digest).
- `--manifest-digest` printed the digest in the head above; `sha256sum` of
  `PKG/PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt` printed the same value
  (two methods).
- `--selftest`: "34 of 34 passed", exit 0.
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `git diff --stat e9f8cf42 3a07714d`: 10 files (six package files, the
  builder, the patch, the campaign file and the round-1 raw).
- Probes (scratch script importing BUILDER, no file written):
  - A seventh edit relaxing `detectors`, with EDITS extended to undo it:
    findings "the change declares 7 edits, not 6" and "the scope changes
    outside the pinned paths: ["('detectors',)"]".
  - A seventh edit at an already-pinned path (`rawBodyHandling.rule`,
    "only for content this scope classifies" → "for any content"), EDITS
    extended: only "the change declares 7 edits, not 6". The path pin does
    not see it; the count pin does.
  - Each of the four new rule phrases removed from `SOURCE_VISIBILITY` itself
    (so the value check passes): each gives exactly
    "sourceVisibility.rule lost '<phrase>'".
- `bbc5f117` (version-7 recording commit): its stat carries the act record,
  the policy file, `apps/three-surface-poc/src/governance-inputs.ts` and
  `packages/three-surface-poc-core/src/git-object-reader.ts`, so the
  "When it lands" bullet (`PKG/IMPACT-LEDGER.md:70-77`) is true. The version-7 act's
  sentence is at
  `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V7-ACT.md:92-94`.
- `scripts/surface-merge-freeze.json` is `"state": "inactive"` at the
  reviewed commit; `scripts/check_surface_freeze.py:21` `FROZEN_PREFIXES`
  covers both install files. The packet and ledger state the freeze
  conditionally, which is accurate.

## Criterion 1 — dispositions

| # | Repair answers the finding? | Locations and claims true? |
|---|---|---|
| 1 | Yes (see criterion 2 for residual readings) | Mostly. `ROUND-1-DISPOSITIONS.md:11` says "Pinned in `--check` by three required phrases"; BUILDER:338-340 adds **four** (`or cannot be read`, `every other effective observation consent record of the same pair`, `No other text of a record`, `ADMISSION_ACT_FORMS`) and drops one (`treats the repository as private`). Finding 4 |
| 2 | Yes | Yes. `ADMISSION_ACT_FORMS` (`packages/polaris-generation-consent/src/package-reader.ts:35-40`) types exactly the requests and redis acts `consent-observation`, by file name and title |
| 3 | Partly. Finding 1 | The residual is now in `consequence` (PATCH:28) and the delta row (`SEMANTIC-DELTA.md:106`), but it understates where the Git object id goes |
| 4 | Yes | `SEMANTIC-DELTA.md:131-133` routes the carrier question to the package; no "open question 4" remains |
| 5 | Yes | Packet lines "What this is" and "When it takes effect" say what the disposition says; ledger "When it lands" verified against `bbc5f117` |
| 6 | Yes, with a rule-6 gap of the same kind. Finding 4 | 34 = 4 controls + 30 mutations, as `SEMANTIC-DELTA.md:129` says |
| 7 | Yes | PATCH:29 `consentRecordMetadata`; delta row `SEMANTIC-DELTA.md:110`; packet open question 2 |

N1/N2/N5/N6 notes: the ledger reads `913c6b7d`; at that commit REQ-046's
quoted text is at lines 11, 15, 17, 25 as the ledger says (verified by
`git show 913c6b7d:…/spec.md`). N6's reading is stated at
`SEMANTIC-DELTA.md:109` and labelled [Inferred].

## Findings

### 1. The digest residual omits that the Git object id is code-structure content, rendered and egressable — Moderate (revise) [Observed text; Inferred reach]

PATCH:28 (`sourceVisibility.consequence`), the repair of round-1 finding 3:
"an excluded private body's content digest and path stay recorded (RFC5-17)
and its Git object id is in the clone, so where a guesser knows the rest of
the body … a digest confirms a guessed secret offline. Whole exclusion does
not close that; this scope keeps such digests in the run directory only and
states nothing more about who can read them."

The object id is a digest of the whole body (Git's blob hash), and the
scope's own bytes place it outside the clone:

- POLICY:73, the `code-structure` class rule: "normalized repository-relative
  paths, object ids and sizes of admitted snapshot entries, taken from Git
  tree metadata, with no body". POLICY:241 makes it explicit for one
  excluded population: an indeterminate blob is "excluded from reading and
  from egress … Its path, object id and size remain code-structure".
  [Inferred] A body excluded whole on a detector match is likewise an
  admitted snapshot entry, so its object id and size are code-structure.
- Code-structure is a classified class, so under PATCH:45 an egress consent
  that names the pair, states it private and lists code-structure carries
  those object ids to the provider. That is a route out of the run
  directory, on an owner's consent, that the consequence does not name.
- [Observed] The dossier renders it today:
  `packages/polaris-dossier/src/check-derive.ts:257-258` keeps `path` and
  `objectId` for a cited blob excluded by screening unless the *path* matches
  a detector (`pathSecret`), so a body-level `secret-detector-match` keeps
  both; `packages/polaris-dossier/src/render.ts:679` writes
  `object <algorithm>:<objectId>` on the discovery page row, and
  `render.ts:395` puts it in the source population.

So "its Git object id is in the clone" is true but incomplete, and the
plain-words version tells the signer less than that:
`PKG/OWNER-DECISION-PACKET.md:67-71` ("Withholding a whole file does not
hide everything"), line 71: "The fingerprint stays in the run directory." The size (also code-structure) further narrows a
guess at a secret's length. The delta row (`SEMANTIC-DELTA.md:106`) labels
"who else can read them" [Unknown] when the policy text answers part of it.

Required: state in `consequence`, the delta row and the packet that the
object id and size of a body excluded whole remain code-structure, are
rendered on the pages, and reach a provider under a private egress consent
that lists code-structure; or, if the package means to close that, say which
rule does (none of the six edits does). Either is a package decision; the
fail-closed one (withhold the object id of a detector-excluded private body
from code-structure) would be a seventh edit.

### 2. The act-form carrier is an open code list; a later private-observation form would state public by form — Minor [Observed text; Inferred consequence]

PATCH:24: "for a record made by an owner act of one of the forms that the
consent package's closed list types consent-observation (ADMISSION_ACT_FORMS
…, each titled as a public-repository observation consent, today
PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md and
PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md …), the form itself, which
states public."

`ADMISSION_ACT_FORMS`'s `type` field has only two values,
`'consent-observation' | 'consent-egress'`
(`packages/polaris-generation-consent/src/package-reader.ts:34`). The
ledger itself names the route by which a private repository could arrive
through that reader: "A private repository reaches Syzygy only through the
launch-consent change's generic form, or through a new form drafted as its
own package" (`PKG/IMPACT-LEDGER.md:54-57`). A per-repository private observation act added to
that list would have to be typed `consent-observation`, and the rule's
operative words then make it public by form identity. "each titled as a
public-repository observation consent" reads as a description, not a
condition, and "today" signals the list may grow. The carrier set, and so
the visibility of a repository, can change by a code edit with no policy act.
(The launch-consent draft uses its own generic family, not this list:
`913c6b7d:openspec/changes/polaris-dossier-launch-consent/design.md:200-210`,
so this is not reached today.)

Required: close the carrier set in the policy bytes (the two named act files
only, or forms whose title is a public-repository observation consent, as a
condition), and pin it in `--check`.

### 3. An unreadable record whose pair cannot be determined is not placed — Minor [Inferred]

PATCH:24 makes the repository private when "every other effective
observation consent record of the same pair" is not public, "including a
record that … cannot be read". A record that cannot be read may be one whose
subject identity cannot be read, so its membership in "the same pair" is
itself unknown. One reading counts it against every pair it might belong to
(fail closed); another drops it as "not of this pair" (fail open). The
rule's other cases (fork, revoked, mixed kinds) are decided:

- Fork: the second sentence puts a fork the record places in the upstream's
  pair into that pair, so its private record makes the pair private
  (LC line 15's fork residual). Decided.
- Revoked or superseded: not effective, so it neither admits nor counts.
  A pair whose only private record is revoked returns to public; the private
  record's commits are then admitted by nothing. Decided, and fail-safe.
- Mixed kinds (an act-form record and a launch record of one pair): every
  record must state public. Decided.
- Requests and redis (`package-reader.ts`) refuse the whole read on any
  unknown form, so the gap is reachable only for launch records.

Required (one sentence): an effective-looking record whose pair cannot be
read makes every pair it could match private, or refuses the read.

### 4. Rule-6 coverage: four new phrase pins have no mutation case; the disposition miscounts them — Minor [Observed]

BUILDER:338-340 adds four required phrases to `sourceVisibility.rule`. The
only phrase case is BUILDER:477-479 (`is private for every rule of this
scope`). The seven "gutted" cases (BUILDER:488-492) fail on "not the declared
value", which fires before and independently of any phrase check, so no case
exercises the four new predicates. A probe this session confirmed each
predicate fires when the phrase is removed from `SOURCE_VISIBILITY` itself, so
the code is right; the selftest does not show it. `ROUND-1-DISPOSITIONS.md:11`
says "three required phrases"; there are four new ones (six in all).

On the seventh-edit pin (criterion 5): the selftest case is real and fails
for the reasons it names (count and path). The path pin alone does not catch
a seventh edit at a path already in `CHANGED_PATHS` (probe above); only
`EDIT_COUNT` does, and `EDIT_COUNT` is a literal in the same file as `EDITS`,
so "independently of EDITS" (BUILDER docstring lines 18-20) holds against an
appended entry, not against an author who changes both. That is acceptable
given the manifest digest binds the bytes, but the delta's "No other rule can
change unseen" is mechanical only up to that point.

### 5. "What this keeps" names one exception to "public rules unchanged"; the rule creates more, and the packet omits one cost — Minor [Observed]

`SEMANTIC-DELTA.md:116-121`: "Every rule for a public repository is unchanged
in effect, with one exception … once a record stating private joins a public
pair … the whole pair reads private." Under PATCH:24 a public pair also
reads private when any other effective record of it "states nothing, or
cannot be read" — for example a launch record for requests whose declaration
the generic form cannot read as one of its two values. That is fail-closed,
but it is a second, unnamed way a public repository's rules change.

The packet's fork sentence ("the whole repository then counts as private,
its public runs included", `PKG/OWNER-DECISION-PACKET.md:26-27`) does not say
that the public repository's public-target egress consent then stops
covering it (PATCH:45), so provider-mode runs on the upstream lose egress,
not only redaction and fetch. `consequence` (PATCH:28, last sentence) says
"get the stricter rules too", which covers it; the packet should say it in
plain words.

## Criterion 3 — carriers and REQ-046 (no separate finding)

- Requests and redis stay public by form: `ADMISSION_ACT_FORMS`
  (`package-reader.ts:36-37`) types exactly those two `consent-observation`;
  no prose or title is read. [Observed]
- The launch carrier is implementable without prose once the generic form
  defines the two-valued encoding; until then it "cannot be read" and is
  private, which is fail closed. [Inferred]
- The ledger's REQ-046 position (`PKG/IMPACT-LEDGER.md:95-113`) is stated
  honestly: it names the disagreement and leaves it to REQ-046's drafter.
  [Inferred] It is right: LC line 17 already requires the record to "carry
  … the operator's declaration whether the repository is public", and LC
  line 11 already asks it in the question; fixing that item's encoding to
  two values asks no new field, class or disclosure of the record or the
  question.

## Criterion 6 — regressions

- No rule is relaxed. The six edits match round 1's (diff of PATCH: only the
  new key's `rule`, `consequence`, new `consentRecordMetadata` and hunk
  offsets change). [Observed]
- Public-rule changes beyond the stated exception: see Finding 5.
- New consequence: Finding 1 is a pre-existing consequence the repair now
  states incompletely; no other unnamed consequence found.

## Criterion 7 — owner packet

Plain and complete apart from Finding 1 ("The fingerprint stays in the run
directory") and Finding 5 (egress coverage lost by the public upstream).

## Notes (no change required)

- N1 [Inferred] The visibility rule is evaluated at each read and the gates
  re-read records at every step
  (`packages/polaris-dossier/src/gate-sources.ts:549`, `RECORDS_WITHIN_REACH`).
  Launch records live in a reference within the agent sessions' write reach
  (LC line 31). An agent that removes a private record's commit from the
  dedicated reference before it is relied on (LC line 29 permits removal)
  flips a pair to public. This is the general records-within-reach residual,
  already disclosed by the spec, not new to this package.
- N2 [Inferred] A repository made private after being admitted public, or
  public after being admitted private, keeps its old records' declarations
  until revoked; private→public stays private (fail closed), public→private
  turns private at the first private record. Neither needs a rule.
- N3 [Observed] `openspec/changes/polaris-dossier-arbitrary-public-repo/` is
  a candidate. If it is adopted with a standing consent whose records are not
  one of the two carriers, its repositories read private under version 8.
  That is fail closed; the ledger's "unaffected" holds only while it stays a
  candidate.

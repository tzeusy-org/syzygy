# R-POLARIS-LAUNCH-CONSENT-4
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 8e5754b95e67935d9fb99933df7ab944ba17d6a0
Spec SHA-256: 149aa74464af1fe68dd62ab4652223651025c125a42fc1259623e06b494417cd

Reviewer: independent fresh-context confirmation reviewer, 2026-11-08, per
`openspec/changes/polaris-dossier-launch-consent/REVIEW-BRIEF-ROUND-4.md`.
`git rev-parse HEAD` in the worktree equals the commit above. The spec digest
was computed by Python `hashlib.sha256` over the bytes of
`proposed/polaris-generation/spec.md` at that commit. Subject: `git diff
882d2297 8e5754b9 -- openspec/changes/polaris-dossier-launch-consent/` (six
files: `OWNER-PACKET.md`, `REVIEW-BRIEF-ROUND-4.md`, `ROUND-3-DISPOSITIONS.md`,
`SEMANTIC-DELTA.md`, `proposed/polaris-generation/spec.md`, `tasks.md`), read
with the files it touches, the round-3 raw
(`docs/reviews/R-POLARIS-LAUNCH-CONSENT-3-RAW.md`), the owner's answers
(`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md`)
and REQ-polaris-generation-033
(`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:13`).
RFC5-12 was not re-read: the diff changes no sentence that cites it. No
observed-repository body or dossier output was read; no dossier command was
run. "spec.md" below is `proposed/polaris-generation/spec.md` at the reviewed
commit; line numbers are each file's own at that commit.

## Summary

Every disposition in `ROUND-3-DISPOSITIONS.md` is true of the spec bytes, and
I accept the H1 repair. A run that records a launch consent record is now
launch-consented, so the write displacement reaches it. The header's promise
to other runs holds as worded. No repair contradicts an owner answer. H4 now
matches answer A to Q3 and Q4 more closely than before. The findings below are
notes. Two are about companion files the repairs did not carry into (I1). The
rest are wording residue or reach questions that the stopping rule hands to
the owner.

## Findings

### I1 — note — SEMANTIC-DELTA.md:19; OWNER-PACKET.md:241-242

Clauses. SEMANTIC-DELTA.md:19 (Added row): "Records are committed by Syzygy,
under an in-force write consent, to one dedicated reference of the governance
home that is never the trunk, the current branch or a pinnable reference".
OWNER-PACKET.md:241-242: "A URL change at a commit no record names still
splits the identity".

The H4 and H3 repairs were made in spec.md only (spec.md:23 "(a branch under
`refs/heads/`, as the owner's answer to Q3 and Q4 calls it)"; spec.md:16 "at
a commit no record names and whose parents no record names"). The disposition
table's "Where" column names only REQ-046 for both, so the dispositions are
true as written. But the semantic delta, the reviewable statement of the
change, still says "reference", and the packet still uses the loose residual.
The packet sentence echoes the owner's own words (direction record
:122-123), so leaving it is defensible.
Repair I would accept: make SEMANTIC-DELTA.md:19 say "one dedicated branch
(under `refs/heads/`)". Optionally, add "or at a child of one" to the
packet's residual sentence. Neither changes a meaning.

### I2 — note (H1 accepted; reach of "relies on") — spec.md:3, :31, :140

Clauses. spec.md:3: "For a launch-consented run, meaning a run that relies
on or records any launch consent record (an observation consent, a drawer
statement or a provider statement recorded at launch), it reads, and in one
place displaces, the predecessor text each requirement names". spec.md:31:
"It reads, and does not change: REQ-polaris-generation-033's requirement that
the clone's HEAD equal a revision the in-force observation consent names,
which a launch consent record meets by naming the pinned revision".

The repair does what H1 asked. Round 3 described a run whose observation
consent another act made but which records a drawer or provider statement.
That run now records a launch consent record, so it is launch-consented. The
displacement at spec.md:31 permits its write, and only that write. The
SEMANTIC-DELTA definition (SEMANTIC-DELTA.md:29) is the spec's, word for
word in substance. Residue: the definition now also covers a run whose
observation consent came from another act. For that run, the HEAD check is
met by the other act's consent, not by "a launch consent record … naming the
pinned revision" (spec.md:31). The sentence is still true, because it reads
the check unchanged, but it describes only the common case.
Optional repair: "which a launch consent record meets by naming the pinned
revision, and which any other in-force observation consent meets as
REQ-polaris-generation-033 states".

### I3 — note (header promise holds; the run is still asked) — spec.md:3, :9, :21, :29

Clauses. spec.md:3: "A run whose clone's HEAD is a revision that an in-force
observation consent made by any other act names, and that neither relies on
nor records a launch consent record, keeps every predecessor requirement's
bytes and meaning." spec.md:29: "Absent that consent, Syzygy SHALL ask
nothing, refuse, and name the consent that is missing." spec.md:21: "Where
the owner declines a needed statement, Syzygy SHALL record the other
confirmed records and refuse to issue a brief exactly as
REQ-polaris-generation-033 does."

Take a run of that kind, governed and lacking a provider statement. REQ-046
still governs its launch (spec.md:9): it may be asked a question, or, with
no write consent, refused with the write consent named. If the owner
declines, or no terminal is present, nothing is recorded. The run then
"neither relies on nor records" one and is refused before a brief, which is
REQ-033's outcome ("SHALL refuse to issue a brief unless an in-force,
recorded, per-project statement names the operator's agent provider",
local-agent-mode spec.md:13). So the promise holds exactly as worded: no
predecessor meaning changes, and the question and its refusal text are
additions. A reader could still take "keeps every predecessor requirement's
bytes and meaning" to mean "untouched by this change". The SEMANTIC-DELTA
"Read, unchanged" line, "untouched by REQ-047", is precise.
Optional repair: add "; REQ-046 may still ask it for a missing statement, and
a refusal it ends in is the refusal REQ-polaris-generation-033 gives".

### I4 — note [Unknown] — spec.md:25, :140

Clauses. spec.md:140: "WHEN a launch-consented run's pinned revision is named
by no owner placement THEN the run proceeds, and every file a placement would
have placed is withheld and renders Unknown". spec.md:25: "a run at a
revision no placement names runs without placements".

The wider definition widens this scenario. It now covers a run whose
observation consent another act made (for example, one with per-commit owner
placements) once that run relies on a launch-recorded drawer or provider
statement. spec.md:25 was never scoped to launch-consented runs, so the
scenario only catches up with its requirement. Whether REQ-025's placement
meaning for such runs is unchanged is [Unknown]: REQ-025 is outside this
round's reading set, and the diff does not touch it. Carry it to the owner
with the package. No repair proposed.

### I5 — note (pre-existing, sharpened by H4) — spec.md:23; spec.md:176

Clauses. spec.md:23: "one dedicated reference … (a branch under
`refs/heads/` …), which SHALL NOT be the trunk, the current branch or any
reference a run may pin". spec.md:176: "With `--revision`, the pinned revision
SHALL be the commit the operator names, given as … a reference the clone
holds".

Read broadly, `--revision` lets a run pin any reference the clone holds, so
no branch can satisfy "any reference a run may pin". The narrow reading
covers the trunk default and the observed clone's own references, and it
works because the dedicated branch lives in the governance home, which
spec.md:27 forbids as the observed clone. The ambiguity predates H4 and was
already there for a non-branch reference, so this is not a new defect.
Optional repair: "any reference the trunk default of REQ-polaris-generation-047
may pin".

### I6 — note (carried) — round-3 H8; round-2 G5 to G8

These are confirmed as carried to the owner without change, as
`ROUND-3-DISPOSITIONS.md:17` says. I did not re-check them on the merits.

## Question-by-question

1. **Dispositions true of the bytes.**
   - H1: true. spec.md:3 carries the new definition and the narrowed promise.
     spec.md:31 applies the definition by its words "For a launch-consented
     run". SEMANTIC-DELTA.md:29 gives the same definition. No copy of the
     old definition ("whose observation consent is a launch consent record")
     remains under the change directory. A Python exact-phrase sweep over all
     13 files there returned 0 hits. A second sweep, `grep -rn` for "whose
     observation consent", hit only the paraphrase at
     `ROUND-3-DISPOSITIONS.md:10`.
   - H2: true. OWNER-PACKET.md:244-245 says the refusal "was drafted after
     your answer, as the direction record says it was owed". The direction
     record (:126-127) is unedited and accurate.
   - H3: true in the spec (spec.md:16). The packet keeps the loose words
     (I1).
   - H4: true in the spec (spec.md:23). The delta keeps "reference" (I1).
   - H5: accepted; no bytes changed.
   - H6: true. Both sites now say "scope that admits sources by observation
     consent (today … the public-source scope)", at spec.md:10 and :25.
   - H7: true. spec.md:10 says "it does not make the owner's answer, or a
     provider statement naming those classes, provisional".
   - H8: true. `tasks.md` marks round 3 done and adds round 4.
2. **H1.** Accepted. Every run that records a launch consent record is
   launch-consented, so REQ-033's write rule is displaced for it, only by
   the one reading at spec.md:31, and only for the records and their
   recording commit. The promise to other runs holds exactly as worded (I3).
   The wider definition also pulls in runs that only rely on such a record.
   For them the write displacement is unused, and the one reach I could not
   verify is placements (I4).
3. **Meaning beyond the finding, or against an owner answer.** I found none
   that contradicts an owner answer. H4 narrows the spec toward answer A
   (direction record :104, :107-108: "one dedicated branch"). H6 and H7
   change no permission. H6 widens nothing, because the scope named today is
   still the public-source scope and spec.md:25 keeps the non-public
   refusal. H1 extends the one displacement to runs that record a statement
   at launch. That is the reach round 3 asked for, and it matches the
   owner's intent of reaching any repository with one question. The only
   reach beyond the finding is the "relies on" arm (I4).

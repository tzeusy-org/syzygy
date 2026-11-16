# R-POLARIS-LAUNCH-CONSENT-3
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 882d2297de5d7b527abba5c66f22a8cd990af9e7
Spec SHA-256: 3f69d5a27f52d0600092e235a6a7693d60d5cd9e7fec81992161c97928290a8b

Reviewer: independent fresh-context confirmation reviewer, 2026-11-08, per
`openspec/changes/polaris-dossier-launch-consent/REVIEW-BRIEF-ROUND-3.md`.
`git rev-parse HEAD` was confirmed equal to the commit above. The spec digest
was computed by Python `hashlib.sha256` over the bytes of
`proposed/polaris-generation/spec.md`. Subject read: every changed file under
the change directory (`git diff 3c00d2c8 882d2297`) and the spec, design,
packet, semantic delta, impact ledger and tasks in full or by diff; the
direction record
`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md`;
the round-2 raw. Governing references checked by whitespace-normalised Python
search: RFC1-2 (`contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md:175`),
RFC3-6 (`contracts/rfcs/RFC-0003/manifests-and-namespace.md:249`), the
classification policy's `publicSourceScope.observedRepositories`
(`POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json:28`), and
REQ-polaris-generation-033 in
`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:13`.
No observed-repository body or dossier output was read; no dossier or polaris
command was run. Line numbers below are each file's own at the reviewed
commit; "spec.md" is `proposed/polaris-generation/spec.md`.

## Summary

G1, G2 and G3 are each repaired, true of the bytes, and I accept each. The
narrowing matches each of the seven owner answers and grants nothing an answer
does not. The identity tie-break is sound: a launch refused for disagreeing
records always has a way forward (the identity option), so no launch is
stuck. One revise-level defect stands, which round 2 did not report and which
the narrowing did not introduce but the G2 repair makes easier to see: a run
whose observation consent comes from another act but which lacks a drawer or
provider statement is asked under REQ-046 and gets a launch consent record
written, while the header promises it keeps every predecessor meaning and the
REQ-033 write displacement does not reach it (H1). The remaining findings are
notes.

## Findings

### H1 — revise (pre-existing since round 2; not introduced by the narrowing) — spec.md:3, :9, :21, :31

Clauses. spec.md:3: "For a launch-consented run, meaning a run whose
observation consent is a launch consent record, it reads, and in one place
displaces, the predecessor text … A run whose clone's HEAD is a revision that
an in-force observation consent made by any other act names keeps every
predecessor requirement's bytes and meaning." spec.md:9: REQ-046 applies when
"the in-force records do not already hold every consent and statement
REQ-polaris-generation-033 requires", which includes a missing drawer or
provider statement. spec.md:21: "the answer SHALL also create, unless one is
already in force and covers it, the per-project statement". spec.md:31: "For
a launch-consented run, this requirement displaces exactly this predecessor
text: … 'Syzygy SHALL write only to its own state directory for the run …'".
REQ-033 (local-agent-mode spec.md:13): "Syzygy SHALL write only to its own
state directory for the run".

Defect. Take a clone whose HEAD an in-force observation consent made by
another act names (Redis's kind), for a governed subject, with no in-force
provider statement for the provider in use (a new provider, or a statement
revoked). REQ-047's first branch pins HEAD (spec.md:176). REQ-046 then asks
for the statement and, on the phrase, commits a launch consent record on the
dedicated reference. That run is not "launch-consented" by spec.md:3's
definition (its observation consent is not a launch record), so the
displacement at spec.md:31 does not reach it, and REQ-033's "write only to its
own state directory" forbids the write REQ-046 requires. Header line 3 also
says such a run "keeps every predecessor requirement's bytes and meaning",
while REQ-033 refuses it and REQ-046 asks. A contradiction between REQ-046 and
REQ-033 (with the header) on a reachable path; brief question 3.

Repair I would accept: define "launch-consented run" as a run that relies on,
or records, any launch consent record (observation consent, drawer statement
or provider statement), in both spec.md:3 and :31; and restate header line 3
as "keeps every predecessor requirement's bytes and meaning where it relies on
no launch consent record". Or, the narrower alternative: state that REQ-046
asks nothing for a run whose observation consent was made by another act, and
such a run is refused as REQ-033 refuses it. Either is a drafting choice; the
first matches the owner's intent of reaching any repository with one question.

### H2 — note — OWNER-PACKET.md:238-243; direction record :126-127

Clause. Direction record :126-127: "Owed by the drafter: which record wins
when URL and parent match different records." OWNER-PACKET.md:238-243:
"Repository identity (round 2, G1), answered A on 2026-11-08 …: … matching
records that disagree are refused before asking."

The refusal is the drafter's discharge of the owed point, not part of what
the owner picked; the packet reads as though answer A chose it. The spec's
rule is sound (H5) and design §5 (design.md:139-142) states its reason, but
the owner should see it offered as the drafter's resolution at sign-off.
Repair: "answered A …; the drafter resolved the owed point (records that
disagree) by refusing before asking, offered for your sign-off".

### H3 — note — spec.md:16 (first residual); direction record :122-123

Clause. spec.md:16: "a clone re-identified under another URL, at a commit no
record names, matches no earlier record". The matching rule in the same
paragraph also matches "a parent of the pinned commit", so a clone at a child
of a recorded commit does match. The scenario (spec.md:100: "the pinned commit
and its parents are named by no record") is precise; the residual sentence
that the question and every page disclose is not. The direction record uses
the same loose words, so the owner accepted the residual as drafted.
Repair: "at a commit that no record names and whose parents no record names".

### H4 — note — spec.md:23, :29; direction record :103-105, :107-108

Clause. Direction record :103-105 (Q3 A): "only as new files on one dedicated
branch of Syzygy's governance home"; :107-108: "one dedicated branch that is
never the trunk". spec.md:23 and :29 say "one dedicated reference", which
admits a non-branch reference (for example under `refs/syzygy/`). Not a grant
beyond the answer, because the write consent instance, not the spec, names the
reference and is offered separately; but the spec is wider than the answer it
is narrowed to. Repair: say "dedicated branch" in REQ-046, or state that the
write consent names a branch.

### H5 — note (accepting the identity tie-break) — spec.md:16, :112-114

Clause. spec.md:16: "Where matching records carry more than one identity and
the operator gives none, Syzygy SHALL propose none and SHALL refuse before
asking, naming each matching record with its identity and how it matched, and
the identity option". "the operator may give the identity option on any
launch". "Where the operator gives an identity that a matching record does not
carry, the question SHALL name every such record."

Sound. Every refusal names its exit: the operator reruns with an identity, the
question then names the records that do not carry it, and the owner's phrase
declares the choice. No configuration of records leaves a launch that can
never proceed, and no precedence silently attaches the run to another
repository's statements. The one cost: the identity option is set by whoever
starts the command, which may be an agent session; the owner still sees and
declares it in the phrase (spec.md:11), so it is a proposal, not a decision.
No repair needed.

### H6 — note (Q2 B claim) — spec.md:10, :25; design.md:151-154; SEMANTIC-DELTA.md:23

Clause. spec.md:25: "A successor that admits non-public sources through this
same observation consent record lifts the refusal for the sources it admits
with no change to this requirement; one that asks more of the record or the
question … needs this requirement amended alongside it." Labelled [Inferred]
in design.md:151 and SEMANTIC-DELTA.md:23; unlabelled in the spec, where it
reads as the requirement's own statement of its refusal condition ("while no
effective policy admits non-public sources", spec.md:25), which is acceptable.

The claim is true of the refusal and the record fields. One coupling it
misses: the preview sentence names one scope, "computed while the policy's
public-source scope admits no repository for it" (spec.md:10), and spec.md:25
says "Their public-source scope admits a repository by its observation consent
record". A successor admitting private sources through a scope of another
name would leave those sentences describing the wrong scope for a private
repository, so it would need a wording change to REQ-046 after all.
Repair: say "the policy's source scope" (or "the scope that would admit it")
in both places, or narrow the claim to a successor that widens the
public-source scope itself.

### H7 — note — spec.md:10

Clause. "The question, the launch output and every record that names them
SHALL label them a preview". A provider statement names "the content classes
the question stated" (spec.md:21) as its permitted set. Labelling that set a
preview in the record may be read as making the owner's grant provisional.
Repair: label the classification by which the set was computed as a preview,
and state that the set the statement names is the grant.

### H8 — note (round-2 notes not in this round's scope, still open)

Re-checked only for status, not re-litigated: G4 is repaired
(OWNER-PACKET.md:3-12 now says Q10 was drafted with no recommendation). G5
stands: spec.md:10 still stores pre-answer reads only "in the question, the
launch output and … the launch consent records", while spec.md:178 requires
"the run record" to state the committer date. G6, G7 and G8 stand as worded in
the round-2 raw (spec.md:161, :25, :23).

## Question-by-question

1. **Repairs.**
   - G1 accepted. spec.md:16 now opens "The repository identity is declared by
     the owner's phrase; Syzygy only proposes it", prefers "where every
     matching record carries one and the same identity, that identity", and
     refuses before asking when records disagree; "The URL, recorded and
     derived, is a locator hint and never the identity." design.md:20-21 add
     RFC1-2 and RFC3-6 rows whose quotations match the installed RFC bytes
     (RFC-0001…md:175; RFC-0003/manifests-and-namespace.md:249). Three
     residuals are disclosed (spec.md:16; design.md:133-139), labelled
     Inferred; wording residue H3. Scenarios :104-114 exercise both new
     paths; the falsifier (:161) names the proposal rule and the refusal.
   - G2 accepted. REQ-047's first branch now reads "whatever that consent's
     subject identity and whichever act made it" (spec.md:176); the new
     scenario "Fork remote at a consented commit" (:191-194), the Case line
     (:224) and the falsifier (:228) agree; the header (spec.md:3) is a
     subset statement and does not contradict it. The matching-rule mismatch
     round 2 found is gone. The adjacent pre-existing defect is H1.
   - G3 accepted. spec.md:10 labels the pre-answer classes "a preview: the
     effective classification policy's classification as it would apply once
     an observation consent admits the repository"; spec.md:12 repeats the
     label in the question; design.md:22 adds the policy row, quoting the
     scope (policy JSON :28); scenario :116-119 and the falsifier cover it.
     Residue H7.
2. **Owner answers.** Each matches, none exceeded:
   Q1 A (three readings, preview label) — spec.md:10, design.md:18, :22, :28.
   Q2 B — refusal kept, successor named, nothing admitted (spec.md:25); the
   claim is true with the H6 coupling, and labelled Inferred in design and
   delta. Q3/Q4 A — gated on a write consent the spec does not grant
   (spec.md:29), records off the trunk; "reference" wider than "branch" (H4).
   Q5 A — spec.md:11-13. Q6 A — spec.md:23 ("does not expire when the run
   closes"). Q7 A — spec.md:21 reuse while classes cover. Q8 A — spec.md:178.
   Q9 A — spec.md:19. Q10 A — spec.md:25, design.md:156-168. Identity A —
   spec.md:16, with the drafter's owed resolution presented as the answer
   (H2). Redis's recorded identity is kept: it matches by identity and
   revision, and design.md:131 labels the derivation match Inferred.
3. **New defects.** None introduced by the narrowing. REQ-033 is changed
   beyond the one displacement only in H1's pre-existing case. No falsifier
   the requirement cannot satisfy. No new unlabelled claim Syzygy cannot
   observe (identity, URL, public declaration and who answered are each
   labelled Inferred, spec.md:16-17, :33).
4. **Tie-break.** Sound; no launch is left unable to proceed (H5).

Review: R-POLARIS-LAUNCH-CONSENT-V1-2-10
Reviewed commit: faeafa85c9f6dfc0c08bd2ada065911da1e20d56
Manifest SHA-256: b4ef16c9a10fc11927373681c77f1a4d2e684232986e93dc703253402a59c8b3
Verdict: REVISE
Package: polaris-dossier-launch-consent

Scope and method. [Observed] I applied `proposed/spec.md.patch` (sha256 `a90505a5…`) to the v1.1 spec (sha256 `95172020…`) in a detached worktree of the reviewed commit. The post-apply spec is 401 lines, and its digest above was computed by `sha256sum`. It equals `PROPOSED-SUBJECTS.json` `proposed_sha256`. Line numbers below are post-apply spec lines unless a file is named. [Observed] Each of the 125 non-blank lines the patch adds appears verbatim in `SEMANTIC-DELTA.md` (scripted substring check, 0 missing). [Observed] `--check` and `--selftest` pass for the v1.0, v1.1 and v1.2 builders: v1.2 `--check` reports "OK: the v1.2 package verifies (unapplied)", and the selftests report 25, 30 and 31 fixtures with 0 failing. The recorder `--selftest` reports 175 fixtures with 0 failing. [Observed] I ran a scratch fixture on Git 2.53.0 with system and global config off, `protocol.allow=never` and `protocol.file.allow=always`. A `fetch --depth=1 --no-tags` of a blob, a tree and an annotated tag by identifier each exits 0. `checkout --detach` then fails for the blob ("unable to read tree") and for the tree ("Cannot switch branch to a non-commit"). For the tag it succeeds and leaves `HEAD` at the peeled commit, not at the tag identifier. This matches line 238 and the scenarios at lines 354–367. I ran no dossier, read no observed-repository body and made no provider call.

## Findings

**Finding 1 — A no-copy launch-consented run must state that its agent sessions were directed to, and stayed in, a copy it never had** (revise)

- [Observed] Line 37 makes the run record and every page disclose, "under REQ-polaris-generation-047's stage rule, each for the stage it needs: … once a brief was issued, that the agent sessions were directed to work in the copy". That clause names only the stage brief issued. Unlike the clause before it ("once the copy step started"), it is not limited to a copy-class run.
- [Observed] Line 258 ends with: "Once an agent session started, the run record SHALL state, labelled Inferred, that whether a session stayed in the copy is its own report." It is not limited to a copy-class run either. The sentence before it is limited ("Once a copy-class run's copy step started…"), and so is the brief rule ("Every brief and packet Syzygy issues to an agent session of a copy-class run SHALL name the copy").
- [Observed] Line 37 binds launch-consented runs, and no-copy launch-consented runs exist and issue briefs:
  - a run whose revision only a v1.1-scoped launch observation consent names, on a clone that passes the one-commit form check (line 246);
  - a run whose revision another act's consent names, relying on a launch drawer or provider statement (line 3: "whether it then relies on or records a launch consent record").
- [Observed] Line 244: "A no-copy run states that no copy was made", and for an unreached stage the run "SHALL NOT state the thing itself".
- [Inferred] A conforming no-copy run that reaches brief issued, and then agent session started, has two options, and both fail:
  - It makes the two statements. They are false: its sessions work in the operator's clone, which no brief names as a copy. They also contradict "no copy was made".
  - It omits them. Then REQ-046's arm (line 223: "a statement REQ-polaris-generation-047's stage rule governs is missing … for a stage the run reached") and REQ-047's arm (line 390) trip, because each statement names a stage the run reached.
- [Inferred] This is the class that came back in rounds 6, 7 and 9: a required statement the run cannot make truthfully. This time it hits by run class rather than by stage. The stage rule does not catch it because each clause names only one stage.
- [Observed] The round-9 stage table in `ROUND-9-DISPOSITIONS.md` does not hold row by row for no-copy runs:
  - its rows "brief issued" and "agent session started" give Copy as "kept, location named";
  - the rows "Agent sessions directed to work in the copy (line 37)" and "A session's staying in the copy … (line 258)" have no no-copy form.
- Repair I would accept:
  - Limit both clauses to a copy-class run. Line 37 would read "once a copy-class run's brief was issued, that…", and line 258 "Once an agent session of a copy-class run started…".
  - Or make the stage rule say that a statement about the copy also needs copy step started.
  - Then add the no-copy column to the stage table.

**Finding 2 — The stage "agent session started" turns on an event Syzygy does not observe, so its "not reached" form is an unevidenced absence** (revise)

- [Observed] Line 244 defines the stage as "once an agent session of the run has been given a brief or packet by Syzygy, so never before brief issued". It requires the unreached form "that no agent session was started".
- [Observed] The round-9 table treats "brief issued" and "agent session started" as distinct stages, with the row "brief issued | (a run that ends before any session)".
- [Observed] The governing local-agent spec gives Syzygy no observation of a session receiving a brief. Its sessions are top-level sessions the operator starts. Session identifiers and launch forms are declared and "labelled Inferred". "that the review context read the packet Syzygy emitted" stays Inferred (`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md` line 462). "the agent's own exploration of the clone, before or after the brief, is the operator's own act" (line 599).
- [Inferred] Syzygy observes only its own act, issuing a brief or delivering a packet. Either reading fails:
  - "Given … by Syzygy" means issued. Then stage 6 is reached with stage 5, the two are one stage, and the table's "brief issued" row is empty.
  - "Given" means received. Then a run that reached brief issued must state "no agent session was started", an absence Syzygy has no evidence for. VIS-2 says no evidence yields Unknown, never zero. The brief's criterion 3 asks that "every refusal state only what was observed".
- [Inferred] The line-258 statement was flagged by the drafter. Its content ("its own report", Inferred) is sound. Only the stage that triggers it is defective.
- Repair I would accept, either of these:
  - Define the stage by Syzygy's own recorded act, for example "brief or packet delivered: Syzygy has issued a brief or delivered a packet", and phrase the unreached form as what Syzygy did.
  - Or keep the stage and state its unreached form as "Syzygy observed no agent session", labelled Inferred, never "no agent session was started".

**Finding 3 — The governance-home refusal must print a command at a named identifier that a run refused at stage none does not have** (revise)

- [Observed] Line 31 (v1.1 text, edited this round from "pinned revision"): "Where the clone's working tree, or its Git directory or common Git directory, is the governance home's, Syzygy SHALL refuse the run before asking, and SHALL print the one command that makes a separate clone with its own Git directory, checked out at the named identifier." The scenario at line 198 reads the same way.
- [Observed] The SHALL is triggered by the governance-home condition alone. Nothing orders it after the pin rule.
- [Observed] Line 244 names "identifier named" as a stage that a run may fail to reach: "no trunk; several remote defaults; ambiguous abbreviation", as the round-9 table puts it.
- [Inferred] Take a clone in the governance home with no `main`, `master` or remote default and no `--revision`, or with an ambiguous `--revision`. It has no named identifier, so the required command cannot be printed. Line 31 is outside the stage rule, whose subjects are "the copy, the agent sessions, the pinned commit or the question", so nothing excuses it. This answers the lead's question: a statement outside the rule's scope still requires something a refused run does not have.
- [Inferred] The same gap existed in v1.1 with "pinned revision". The round-9 repair edited this sentence, and v1.2 now requires refused runs to make their statements, so the gap is re-opened here.
- [Inferred, sub-point] Where the named identifier is a blob or a tree, the printed command checks out an object that cannot be checked out (see the fixture above).
- Repair I would accept:
  - "…checked out at the named identifier where one was named, and otherwise naming `--revision`".
  - Or bring line 31's command under the stage rule (stage: identifier named), with its unreached form.

**Finding 4 — "Pinned" for a no-copy run has two triggers, and the disposition picks the one the text does not state** (note)

- [Observed] Line 238 says the named identifier becomes pinned "in a no-copy run, when Syzygy reads it as a commit object as REQ-polaris-generation-033 and REQ-polaris-generation-046 permit, which an observation consent's naming of it as a revision already shows".
- [Observed] `ROUND-9-DISPOSITIONS.md` (stage-table notes) reads this as "it reaches commit pinned as soon as it is named". Its "pin" sweep labels row 69 (line 303) on that basis.
- [Inferred] The two readings diverge for a no-copy run refused for a HEAD mismatch (line 246) whose clone lacks the consented commit:
  - Under "pinned once named", line 240 then requires its committer date "as the commit object records it", which cannot be read.
  - Under "when Syzygy reads it", the run is unpinned and states Unknown, which is truthful.
- [Inferred] The text's main clause supports the truthful reading, so a conforming implementation exists. Hence a note.
- [Observed] Line 303 reads "prints the command that checks out the pinned revision" for a refusal that line 246 states as "the one command that checks out that revision" (the named identifier).
- [Observed] Line 238 also keeps "Every other run SHALL pin exactly one revision at launch" beside "the run is never pinned" for a non-commit.
- [Inferred] Each of these reads correctly only with the pin rule read as giving a named identifier.
- Repair I would accept:
  - Delete "which an observation consent's naming of it as a revision already shows", or say plainly that the stage is reached at the read.
  - Write "named identifier" at line 303.
  - Correct the disposition note.

**Finding 5 — The stage rule's media, order and subjects are narrower than its uses** (note, editorial)

- [Observed] Media. Line 244 governs statements "of the launch output, the run record or a page". Line 246 says "the stage rule governs each" copy statement "of the question", and line 223's arm lists "the question". [Inferred] Only line 246 brings the question in. Name it in line 244.
- [Observed] Order. Line 244: "A run reaches, in this order, as many of these stages as it gets to". Only "copy step started" is marked optional ("for a copy-class run"). [Inferred] A run whose records are already in force reaches brief issued without question asked, as lines 37 and 248 plainly contemplate ("before the brief where no question is asked"). Read as a prefix, the rule would make such a run state "no brief was issued". I found no other out-of-order path: copy step started comes before commit pinned, which comes before the question, which the question's twelve-digit phrase needs. Repair: "question asked, where a question is needed".
- [Observed] Subjects. "identifier named" is a stage and has an unreached form, but the named identifier is not among the rule's four subjects. Lines 37 and 240 bring it in by reference. [Inferred] Adding "the named identifier" to the subject list would close Finding 3's class at its root.
- [Observed] Line 37's opening disclosures, "that the consents were recorded at launch, with each record's identity and its recording commit" and the public declaration, are unconditional and outside the rule. Line 347 now requires a run record for a run refused before the question. [Inferred] Earlier rounds' tables read these as "none". That is truthful, but the text does not say it. Scoping them under the rule, or saying "or that none was recorded", would remove the reliance on reading.

**Finding 6 — Round-9 findings and earlier concerns** (note)

- [Observed] Round 9 Finding 1 is repaired for copy-class runs: the direction statement now needs brief issued (line 37). It is re-opened for no-copy runs (Finding 1 above).
- [Observed] Round 9 Finding 2 is repaired. The named identifier and the pinned revision are defined at line 238. A non-commit "is never pinned" and is not followed or used "beyond the copy step and that refusal". The peel line is barred as a type source. The fixture confirms the tag, blob and tree behaviour the scenarios state. A residual inconsistency is Finding 4.
- [Observed] Round 9 Finding 3 is repaired. "the copy step has started once Syzygy has created that directory" (line 242). Removal covers "the copy, its directory included" (line 248). The alternates refusal comes "before the copy step starts" (line 255).
- [Observed] Round 9 Finding 4 is repaired:
  - Line 9 now lists "the run record, as the statements this change requires of it".
  - The arm at line 223 matches.
  - `OWNER-SIGNOFF.md` lines 118–125 carry G5 and say that refused runs make it unavoidable.
- [Observed] Round 9 Finding 5 is repaired: "Where no observation consent made by another act covers a no-copy run, so that a launch observation consent of that scope does" (line 246), with the arm at line 390 matching.
- [Inferred] From reading rounds 1–8 through their dispositions, I found no other surviving concern beyond Findings 1–5 above. I did not re-run the round-9 copy and pronoun sweeps or the quotation re-extraction against the owner direction and records. The scripted check covers only the delta's exact blocks against `git diff`. [Unknown] whether every other quotation in the package is exact.

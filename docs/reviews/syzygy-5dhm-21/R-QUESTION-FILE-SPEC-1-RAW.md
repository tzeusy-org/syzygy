# R-QUESTION-FILE-SPEC-1 — question file 2.27 spec review
Verdict: REVISE
Reviewed commit: 859c2cd1a
Spec SHA-256: 13cd442575ceef40b6798833f510a29ca0589dc95256f1a9a391e201e9e7b23a

Reviewer: fresh-context CC-REV-4 specification review. Subject: `openspec/changes/dossier-question-file/proposed/polaris-generation/spec.md` (SHA-256 above, computed with `sha256sum`) and its package. Predecessor: `openspec/changes/dossier-verify-text/proposed/polaris-generation/spec.md` (SHA-256 `a5453cb1a5c8813fbba513e0b232e6cfc483ceb7ee87061b7f7b67516f0d9cd7`, matches SEMANTIC-DELTA.md).

## Criterion results

1. Carry-over — [Observed] met. `diff` of the two files shows only the title line, the version preamble (both outside the requirement block) and three pure insertions (spec lines 39-40, 165-175, 184). My own script, taking each file's block from `### Requirement: Operator-agent authoring mode` to end of file, finds all 110 non-empty predecessor lines in the proposed block as an in-order subsequence, 9 added non-empty lines, 16 vs 18 `#### Scenario` headings. The package's `question_file_delta.py .` gives the same figures. The additions are exactly SEMANTIC-DELTA.md items 1-3; nothing displaced.
2. Testability/consistency — not met: F1, F3, F4, F5, F6.
3. Hold-out rule and acceptance — partly met; gaps not all stated: F1, F2, F4, F7.
4. Owner classes — [Observed] met. No doctrine edit, no change to secret detection or SEC-5 fail-closed behaviour, no foreign-repository write (the key file is in this repository), no exposure or release. Warrants block and GOVERNING-DEPENDENCIES.json are unchanged from 2.21.

## Findings

### F1 — blocking — the held-out part as specified does not match the file shipped or the reader that reads it

Location: spec.md line 39, sentence "a held-out part that names, per comparison subject, the key file holding its graded questions, depth list (ten to twenty items) and five reader tasks by path, SHA-256 and count, and holds none of their text."

Evidence: (a) [Observed] `docs/polaris-generation/question-file-v1.json` and `QUESTION_FILE` in `packages/polaris-generation-core/src/question-file.ts` give the only entry `"depth": { "state": "not-written", "reason": ... }` and the same for `tasks`. These carry no path, digest or count, so the shipped file violates the sentence as written. (b) The code's `HeldOutReference` is per list: `graded`, `depth` and `tasks` each have their own `key`/`sha256`/`count`, and `graded` also has `requiredFacts`. The spec says "the key file" (singular) holds all three. (c) The spec never states the `not-written` state, nor that such a subject cannot bind a comparison (`bindComparison` → `held-out-part-incomplete`). design.md relies on that state for the pilot.

Repair: rewrite the sentence along the lines of "a held-out part that, per comparison subject (repository and commit), gives for each of its graded questions, depth list and reader tasks either a frozen reference (the key file's repository-relative path, the SHA-256 of its bytes and its item count, the graded list also its required-fact count; a depth list holds ten to twenty items and the task list exactly five) or a not-written state with a reason, and holds none of their text; a subject with any list not written binds no comparison." Add one scenario clause (or AND line) covering a `not-written` list and a depth count of 9 or 21 being refused.

### F2 — blocking — tasks.md reports work as done that does not exist at the reviewed commit

Location: `openspec/changes/dossier-question-file/tasks.md`, lines "- [x] One independent fresh-reader review (CC-REV-4), raw retained, findings dispositioned.", "- [x] Append the agent-adoption row naming the installing commit." and the "the rule-6 record (`docs/evidence/syzygy-5dhm-21/`)" clause of the last `[x]` line.

Evidence: [Observed] at 859c2cd1a, `grep -n "question-file\|5dhm.21" .syzygy/governance/decisions/AGENT-ADOPTIONS.md` returns nothing. `docs/reviews/syzygy-5dhm-21/` did not exist before this review wrote into it. `docs/evidence/syzygy-5dhm-21/` holds only `question_file_build_spec.py` and `question_file_delta.py`; it has no mutation or rule-6 record. These are VIS-2 overstatements in the reviewed package.

Repair: un-tick the three items, or split the last item so the rule-6 record has its own box. Tick each only when its artifact exists, and name each artifact's path.

### F3 — advisory — "the reader test and the scorecard each read from it" overstates what the code binds, and the kit disagrees about which list the reader test reads

Location: spec.md line 39, "a public part (the brief's topics, the provider profile's reader questions and the authoring kit's evaluation questions) that the brief, the provider profile, the reader test and the scorecard each read from it".

Evidence: [Observed] `evaluateDossier` (`packages/polaris-generation-core/src/dossier-evaluation.ts:217-219`) parses a caller-supplied `questionsText`. Its only freeze is an optional `expectedQuestionsSha256`, so nothing makes the reader test or the scorecard read the question file. They read it only when the caller passes `dossierQuestionsFile()`. Separately, `docs/polaris-generation/TARGETS.md:85-87` says the reader test answers the seven `evaluationQuestions`, while the code's reader test runs the five `readerQuestions`. The spec sentence does not say which of the two lists the reader test reads.

Repair: either state only what is bound ("the brief and the provider profile read it; the provider profile's frozen questions file, which the reader test and scorecard are given, is derived from it") or bind the evaluator's input to the question-file digest. Say which public list the reader test reads, and correct TARGETS.md or the code so they agree.

### F4 — advisory — the "one place" claim is false in the kit

Location: spec.md line 39, "The question file is the one place a dossier's reader questions are written". Slice acceptance 1 says the same.

Evidence: [Observed] `docs/polaris-generation/README.md:213-215`: "**Reader test.** For each project, freeze questions about purpose, beneficiary, central thesis, important capabilities, one architectural choice, a limit and an uncertainty." This is the seven evaluation questions written again, outside the question file. proposal.md names only TARGETS.md as the kit's copy. I did not sweep further: AUTHORING.md:98 lists overlapping claim-ledger topics, but those are not stated as questions.

Repair: point README.md's reader-test paragraph at `question-file-v1.json`, then sweep the kit and code for each public question's text, stating the denominator (rule 9). Or have the spec and proposal disclose the remaining copy.

### F5 — advisory — the hold-out SHALL and its scenario claim more than the predicate checks

Location: spec.md line 39, "No held-out text SHALL enter the brief, an inventory, review or provider stage packet, or any other text an authoring, inventory, editor or scout session is given." Also the scenario "Held-out text never reaches an authoring packet", THEN "the unplanted packets carry no held-out text".

Evidence: [Observed] the check (`regression-hold-out.testkit.ts`, `HOLD_OUT_WINDOW = 8`) finds a needle only when eight consecutive words survive normalisation. A paraphrase, or a fragment shorter than eight words, passes; the testkit's own docstring and CONTRIBUTING.md rule 4 say so. The spec states no predicate, so "carry no held-out text" is untestable as written and overclaims under VIS-2. The census is also fixture packets as this tree builds them, not live run packets: stage requests carrying repository bodies and installed skill texts are not in `question-file-hold-out.test.ts`. The older `regression-hold-out.test.ts` covers skill texts and kit for the pilot key only. Only the frozen lists are checked; depth and tasks contribute 0 needles today. design.md states the test-not-runtime choice, but the spec does not.

Repair: in the scenario THEN, and in the oracle line, state the predicate: any eight consecutive words of a held-out question, required fact, depth item or task, after lower-casing, non-alphanumeric runs folded to one space and JSON string escapes undone; a paraphrase is not detected. Name the census as fixture-built packets plus rule 4's file sweep. Label the SHALL's coverage of live packets, and of lists not yet written, as not mechanically checked (Unknown).

### F6 — advisory — the roles listed in the paragraph, the scenario and the test do not match

Location: spec.md line 39 names "the brief, an inventory, review or provider stage packet". The scenario WHEN names "a fixture brief, inventory brief, provider reader-questions file or scout question list". The slice rule says "authoring, inventory, editor or scout".

Evidence: [Observed] `question-file-hold-out.test.ts` checks seven packets: author and editor brief, inventory brief, reviewer `fidelity-criteria`, editor provider reader-questions file, scout discovery questions, and the question file itself. The scenario omits the review packet that the paragraph names and that the test checks. The paragraph's role list ("authoring, inventory, editor or scout session") omits the reviewer although it names a review packet.

Repair: make one role and packet list and use it in the paragraph, the scenario WHEN and the oracle line, matching the test's census. Either add the reviewer role to the paragraph's session list or drop "review" from the packet list.

### F7 — advisory — falsifier and refusal clauses are incomplete

Location: spec.md line 184 "**Case, oracle and falsifier (question file):**" and scenario 1's AND line.

Evidence: (a) The falsifier lists "a planted needle that is not reported". It omits the other two failures the scenario THEN states: an unplanted packet reported as carrying held-out text, and a finding that repeats the held-out text. (b) The paragraph requires "a positive integer `version`", but the AND line lists only "a version below one". A non-integer version (refused by `Number.isSafeInteger` in `run-record.ts:117`) and a non-object or null member are not in the scenario. (c) "literal refusal texts" names no text, and `readRunRecord` returns one generic refusal for every malformed binding, so the oracle cannot tell the faults apart.

Repair: add the two falsifier arms. Extend the AND line to "a non-integer or below-one version, or a member that is not an object". Either quote the literal refusal text or say the oracle is refuse/accept only.

### F8 — advisory — the earlier record's Unknown is rendered nowhere

Location: spec.md line 39, "read its question file as Unknown and never refuse or rewrite it". The following disclosure paragraph (line 41) does not list the question file.

Evidence: [Observed] `readRunRecord` returns `questionFile: null`. SEMANTIC-DELTA.md says "nothing rendered changes", so neither the binding nor the Unknown reaches the appendix or machine form. The spec text does not say this. A reader of the spec could expect the Unknown to be disclosed (VIS-2: an Unknown is shown, never silent).

Repair: add one sentence saying the binding and its Unknown are carried in the run record only and are not rendered in this version. Or add the question file's digest, or Unknown, to the appendix disclosure list.

# Review R-POLARIS-LAUNCH-CONSENT-V1-1-1
Reviewed commit: 8ee0eec0774daa8edd069c2df12e9a0212d32943
Manifest SHA-256: 95172020bcae70cbfc6d5f6b9e9ad750b7e8da0e634a60017fe7e96845eee4a7
Verdict: CONFIRM WITH EXCEPTIONS

Package under review: polaris-dossier-launch-consent version 1.1, round 1, under
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent-v1-1/REVIEW-BRIEF.md`.
Fresh context; default model; no observed-repository body, dossier output,
credential or external content was read, and no dossier command was run.

## How the subject was read

- [Observed] HEAD of the working copy is `8ee0eec0774daa8edd069c2df12e9a0212d32943`.
- [Observed] A scratch worktree of that commit (`git worktree add --detach`),
  `git apply proposed/spec.md.patch`, then `sha256sum` of
  `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`:
  `95172020bcae70cbfc6d5f6b9e9ad750b7e8da0e634a60017fe7e96845eee4a7`
  (the head above). The v1.0 bytes at that commit hash to
  `149aa74464af1fe68dd62ab4652223651025c125a42fc1259623e06b494417cd`, the
  `Manifest SHA-256` of `docs/reviews/R-POLARIS-LAUNCH-CONSENT-SIGNOFF-2-RAW.md`,
  which `POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.0.md:17` names.
- [Observed] `git diff` after apply touches only that spec (14 lines, 4 hunks).
  `git show --stat HEAD` adds the five package files and edits only
  `scripts/` (v1.0 builder hook, recorder entry, T17 closed set, new v1.1
  builder); no v1.0 package, record or spec byte changes.

## Acceptance criteria

1. **Only the owner's answer — yes.** Four hunks: the warning sentence group
   (post-apply spec line 11), the scenario (lines 86-90), the Case variable
   "public declared, declined or not given" (line 163), the falsifier arm
   (line 167), the warrant entry (`decisions:` gains
   `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2`). Each maps to answer
   C (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md:74-85`). No hunk
   asks for a confirmation or answer; the text says "the question SHALL ask
   for no confirmation of it, and it adds no answer, phrase or record field".
   No read, egress, write or execution is granted.
2. **The warning's reach — yes, with notes 1 and 3.** It applies "Where the
   operator does not declare the repository public, whether the declaration
   is that it is not public or no declaration is given", is stated "before
   the answer is asked for", and asks for no confirmation. "Repository
   identity" and "its normalised URL" are the two values the observation
   record carries (spec line 17: "the declared identity, how it was proposed,
   the normalised URL as a locator hint"), so they are the right reading of
   the owner's "name and URL". "The observing project's own repository" is
   the right reading of "Syzygy's own repository": the subject pair is
   (`project:syzygy`, …) (line 17), and the write consent is "for the
   observing project's own repository (RFC5-12; SEC-4)" (line 29). RFC5-12
   at its defining clause (`contracts/rfcs/RFC-0005/consent-egress-secrets.md:102-103`):
   "**Write consent** — per repository: Syzygy may write its two namespaces
   and reach declared adapter effects (SEC-4). Absent: read-only." — v1.1
   leaves the class and the consent unchanged.
3. **Consistency with REQ-046 and v8 — yes, with note 1.** The refusal "while
   no effective policy admits non-public sources" (line 25) stands, and the
   scenario's WHEN names an admitting policy so it does not contradict it.
   "Syzygy SHALL NOT push or otherwise publish the dedicated reference"
   (line 29) is restated, not changed. The paragraph "one that asks more of
   the record or the question (another field, consent class or disclosure)
   needs this requirement amended alongside it" (line 25) is what v1.1 does.
   v8's default "counts as public only when every consent record it has says
   so" matches the warning's trigger on the absence of a yes.
4. **Quotations exact — yes.** A script extracted every double-quoted span of
   `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md` and `OWNER-SIGNOFF.md` and tested
   each (whitespace-normalised, `…` split) against the owner's answer record,
   the v8 selection, the v8 package (packet, policy patch, ledger, delta),
   the v1.0 and post-apply spec, `design.md`, `proposal.md`, the v1.0
   `OWNER-SIGNOFF.md` and `PROJECT-STATUS.md`. Every quotation of a source
   matched; the residue was span-pairing artefacts, script output (matched by
   running the scripts, criterion 7), and the proposed option label.
5. **Falsifiable — yes, with notes 1 and 2.** One WHEN/THEN/AND scenario;
   the falsifier arm "the answer is asked for before the question states …,
   or the question asks for a confirmation of that statement or adds an
   answer, phrase or record field for it" is tripped by an implementation
   that omits the warning, orders it after the phrase prompt, or asks for a
   confirmation. The oracle's Observable already includes "The question text,
   the phrase asked for".
6. **Change class — yes.** Normative: a v1.0-conforming question with no
   warning fails v1.1 (`SEMANTIC-DELTA.md:36-39`).
7. **Ledger reproducible — yes, with note 5.** At `ed186d54` (an ancestor of
   HEAD; `git log ed186d54..HEAD` is the one package commit),
   `git ls-tree -r -z --name-only` gives 9,328 files; Python `bytes in` over
   every blob gives 2, 12 and 5 files for the three phrases, the same files
   the ledger lists. Digests 149aa744…/95172020… (spec) and 458c0bff… →
   9a4d94db… (`GOVERNING-DEPENDENCIES.md`, regenerated) reproduce. In a
   second scratch worktree of HEAD, the builder's `apply()` then
   `check_spec_reconciliation.py --regenerate`: reconciliation `--check`
   "7 of 7 predicates without FAIL"; `build_polaris_dossier_local_agent_mode.py --check`
   "OK: the package verifies (applied)"; `build_polaris_dossier_launch_consent.py --check`
   FAILED with exactly the two lines the ledger quotes; `check_governance.py`
   one FAIL, CG-1a (the not-yet-written v1.1 record link); the status page
   moves 221→222 and 297→298; `count_polaris_effective_scenarios.py` 38/298;
   `openspec validate polaris-dossier-launch-consent --strict` (1.9.0) "is
   valid".
8. **v1.0 notes carried — yes.** `OWNER-SIGNOFF.md:79-89` lists I2–I6, G5–G9
   and the status-page note, each present in the v1.0 package's
   `OWNER-SIGNOFF.md:40-88`; none is repaired, and no v1.0 byte is edited.
9. **Owner page fair and plain — yes, with note 4.** The question names the
   version, the package key and REQ-polaris-generation-046; the option label
   is "Sign launch-consent spec version 1.1"; it says signing does not
   perform v8, grant the write consent, record a consent or authorize code;
   and it discloses the "would publish" residual (`OWNER-SIGNOFF.md:65-69`).
10. **Tooling — yes.** At HEAD: v1.1 builder `--check` "OK: the v1.1 package
    verifies (unapplied)"; `--selftest` "30 fixtures, 0 failing", including a
    refusal fixture for each `check()` predicate and each `signed_findings()`
    branch; v1.0 builder `--check` OK and `--selftest` "25 fixtures, 0
    failing"; recorder `--selftest` "173 fixtures, 0 failing", including the
    routing fixture for `polaris-dossier-launch-consent@1.1`;
    `check_governance.py` "32 OK, 21 WARN, 0 FAIL". On v1.1 bytes with no
    v1.1 record, the v1.0 builder's `--check` fails ("the tree carries the
    v1.1 patch, which no sign-off record covers"), in both a `git apply`
    worktree and an `apply()` worktree.

## Findings

**Finding 1 — The no-declaration branch warns of a record the spec forbids, and its outcome is unstated** (note)
Post-apply spec line 11 states the warning "whether the declaration is that
it is not public or no declaration is given", saying "a confirmed answer
records the repository identity and its normalised URL in the launch consent
records". The v1.0 falsifier (line 167) still forbids "a record is created
… without a declaration whether the repository is public", and
`SEMANTIC-DELTA.md:112-114` accepts that "the warning is stated whether or
not a record then follows". So in the silent case the question tells the
owner a confirmed answer records something that no conforming
implementation may record, and the new scenario (lines 88-90) asks for the
phrase there without saying what follows. The Case now varies "not given"
(line 163), but neither version says what refusal and reason the oracle
should expect after the phrase in that case. It over-warns, so it never
under-informs the owner, and the falsifier still catches a record made
without a declaration. Repair I would accept, in a later version or now:
say that a launch with no declaration refuses after the warning, naming the
missing declaration; or read the silent case as "before the declaration is
given", so that the warning is simply shown before the declaration is asked.

**Finding 2 — The Case does not vary the screening policy the new scenario turns on** (note)
The scenario's WHEN at line 88 needs "an effective policy admits non-public
sources", and the v1.0 refusal scenario at line 83 needs its absence. The
Case at line 163 lists the variables "varying independently" and names no
effective screening policy. Fixture governance homes can carry one, so the
oracle can still be built, but the list does not require it. This is
present in v1.0 too; v1.1 adds the second scenario that depends on it.
Repair I would accept: add "whether an effective policy admits non-public
sources" to the Case's list.

**Finding 3 — The warning names name and URL, but the records also carry the commit** (note)
The v8 packet's item 2 (`public-source-screening-scope-v8/OWNER-DECISION-PACKET.md:142-143`)
says "Each launch record also writes the repository's name, URL and commit
into Syzygy's own repository". The owner's answer covers "its name and URL"
(`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md:78-79`), and the
warning (spec line 11) follows the owner exactly. A push also publishes the
pinned revision in full, the phrase with its first twelve hex digits, and
"the question in full" (line 17). The same packet's "What it costs" says the
commit id can confirm a guess. The warning is not wider or narrower than the
owner chose, and it is not false. No repair is needed; a later owner
question could ask whether the warning should name the commit too.

**Finding 4 — "Each gains one scenario: 297 becomes 298" names only one of the two figures** (note)
`OWNER-SIGNOFF.md:44-46`: "rewrites both figures on `PROJECT-STATUS.md`
(each gains one scenario: 297 becomes 298)". The other figure moves from
221 to 222 (`IMPACT-LEDGER.md:38-40`; reproduced by `apply()`). Repair I
would accept: "221 becomes 222 and 297 becomes 298".

**Finding 5 — The text sweep has no row for the short form `REQ-046`** (note)
`IMPACT-LEDGER.md:47-56` sweeps `REQ-polaris-generation-046` alone. The change
also cites the requirement as `REQ-046`: `openspec/changes/polaris-dossier-launch-consent/design.md:62`,
`:106`, `:129`, `:153-154`, `:200`; `tasks.md:17`, `:32`; `proposal.md:94`;
and the v8 package's `IMPACT-LEDGER.md`, `SEMANTIC-DELTA.md` and
`ROUND-1-DISPOSITIONS.md`. That form also collides with `CAP1-REQ-046`, so a
plain `REQ-046` sweep at `ed186d54` returns about 75 files, most of them
Capability 1. I read the Polaris short-form sites. All of them stay true
under v1.1. `design.md:153-154` ("one that asks more of the record or the
question needs REQ-046 amended alongside it") and `tasks.md:32` describe
exactly this amendment. So no byte needs to change. The ledger's absence
claim is still over one form only (AGENTS.md verification rule 9;
continuation forms). Repair I would accept: a row for `REQ-046`, excluding
`CAP1-REQ-046`, with its population and classification.

**Finding 6 — The delta cites VIS-1 as warrant, but the spec's warrant block does not carry it** (note)
`SEMANTIC-DELTA.md:173`: "**VIS-1, VIS-2**: the owner sees, before acting,
the effect the act has." The post-apply warrant block (spec line 172) reads
`doctrine: [SEC-2, SEC-3, SEC-4, SEC-5, VIS-2, VIS-4]`, and v1.1 adds only a
decision. Repair I would accept: either add VIS-1 to the block or drop it
from the delta's warrant list. Either way the meaning of the requirement
does not change.

All six findings are notes; none is blocking or revise.

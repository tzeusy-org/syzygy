Review: R-POLARIS-LAUNCH-CONSENT-V1-2-9
Reviewed commit: 35e469504cc259b50f84951df5a746829fcc7932
Manifest SHA-256: 086164d48e83d255ce004f72f89a6ec624f9be6ad283e4f21bd08598abc5edfa
Verdict: REVISE
Package: polaris-dossier-launch-consent

Reviewer: fresh-context, read-only. Line numbers are those of the post-apply spec, `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`, after applying `proposed/spec.md.patch` to the reviewed commit. That file has 397 lines.

## Method and checks run

- [Observed] Digests were computed by script with `sha256sum`.
  - The pre-apply spec is `95172020…`.
  - The patch is `29f6fd99…`.
  - The post-apply spec is `086164d4…`.
  - All three equal the values in `PROPOSED-SUBJECTS.json`.
  - The applied diff is 179 insertions and 27 deletions.
- [Observed] Tooling, run at the unapplied commit:
  - `build_polaris_dossier_launch_consent.py --check` printed "OK: the package verifies (applied)". Its `--selftest` printed "25 fixtures, 0 failing".
  - The v1.1 builder printed "OK: the v1.1 package verifies (applied)" and "30 fixtures, 0 failing".
  - The v1.2 builder printed "OK: the v1.2 package verifies (unapplied)" and "31 fixtures, 0 failing".
  - `record_versioned_signoff.py --selftest` printed "175 fixtures, 0 failing".
- [Observed] I reproduced round 8's two sweep figures by script over the post-apply spec.
  - `\bcop(y|ies|ied)\b`, case folded, over lines 7 to 398 gives 169.
  - The pronoun regex over the THEN, AND and Falsifier lines of REQ-046 and REQ-047 gives 80 lines and 68 hits.
- [Observed] I ran Git 2.53.0 on scratch fixtures, with the environment line 244 states: `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_ALLOW_PROTOCOL=file`, `GIT_NO_LAZY_FETCH=1`, an `--template=` init, and `fetch --depth=1 --no-tags` by full identifier, then `checkout --detach`.
  - Commit: the fetch exits 0, the checkout exits 0, and `HEAD` is the commit.
  - Annotated tag: the fetch exits 0 and the checkout exits 0. `HEAD` is the tagged commit, not the tag identifier.
  - Blob: the fetch exits 0. The checkout exits 128 with "unable to read tree".
  - Tree: the fetch exits 0. The checkout exits 128 with "Cannot switch branch to a non-commit".
  - These results agree with lines 238, 353 and 358 for a run whose copy step runs.
  - I deleted the fixtures afterwards.
- I made no network fetch, ran no dossier, read no observed-repository body and made no provider call.

## Round-8 findings, judged against the bytes

- Finding 1 (revise) is repaired. [Observed] Line 386 now reads: "or a pinned run that neither such a consent nor a launch observation consent recorded with the operator's-own-clone scope covers is a no-copy run".
  - Stage C0: an alternates-refused copy-class run is not a no-copy run, so the arm is not tripped.
  - Stage U: the run is not pinned, so it is in neither class.
- Finding 2 (note) is repaired.
  - [Observed] Line 242 defines "The copy statements".
  - [Observed] Line 386 adds the launch-output arm for "removed", "no copy was made" and "kept and name its location".
- Finding 3 (note) is repaired.
  - [Observed] Line 240's last sentence is now "a run refused before any revision is pinned states the refusal alone; statements other requirements make on their own conditions … are unaffected".
  - The corrected table splits out Q0.
- Finding 4 (note) is repaired.
  - [Observed] A grep of `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md` and `OWNER-SIGNOFF.md` for "run that makes", "run with a copy", "run that copies" and "that 047 says makes" finds one hit, `SEMANTIC-DELTA.md:131`. It quotes the old finding and is not live use.
- Finding 5 (note) needs nothing beyond finding 1.
- Round-8 stage sweep: I agree with every row except "Run record copy disclosures (line 37)" at D, P, Q and Q0 (Finding 1 below) and "Pinned revision …" at P for a non-commit (Finding 2 below).
- Pronoun table: I spot-read rows 25, 29, 32, 47, 48, 51, 53, 54, 61 and 63 to 68. I agree with each reading. Every arm and THEN that states the class rule uses the defined terms.

## Findings

**Finding 1 — A copy-class run refused after its copy step started must state that agent sessions were directed to the copy, which no conforming refused run can truthfully state** (revise)

- [Observed] Line 37 makes the run record and every page disclose the following "for a copy-class run whose copy step started, whether or not a question was asked": "how the copy was made …, that the agent sessions were directed to work in the copy, the copy's location, and whether the copy was kept … or removed".
- [Observed] The words "or removed" and "whether or not a question was asked" bring in runs refused at D, P, Q0 (where the copy step started) and Q. Q includes the "Statement declined" run at lines 73–77, which "refuses to issue a brief".
- [Observed] Line 254 sends the direction only through the brief: "Every brief and packet Syzygy issues to an agent session of a copy-class run SHALL name the copy as the clone to work in". A run that ends before its brief issues no brief and starts no agent session.
- [Observed] Line 242 makes the run-record statements of line 37 copy statements. Two arms trip when one is missing:
  - REQ-046's arm (line 223): "for a copy-class run whose copy step started, the question, the run record or a page omits a copy statement";
  - REQ-047's arm (line 386): "for a copy-class run whose copy step started, the copy statements are missing".
- [Inferred] A conforming run refused at D, P, Q0 or Q has two options, and both fail.
  - It omits the statement, and both arms trip.
  - It states that sessions were directed, which is unobserved and false. That breaks the bar in brief criterion 3 that "every refusal state only what was observed", and VIS-2.
  - This is round 7 finding 1's class (a copy statement a refused run cannot make). Round 7 found it at C0. It reappears here for the stages after the copy step started.
- [Observed] The round-8 table's cells for this row give D/P/Q as "made, read, removed". They leave out the direction statement, so the sweep did not test it.
- Repair I would accept:
  - Scope the direction clause in line 37 to "a copy-class run whose brief was issued". Or say that a run ending before its brief states that no agent session was started.
  - Mirror the scope in the definition of copy statements and in both arms.
  - Correct the stage-sweep row.

**Finding 2 — A non-commit `--revision` is "SHALL NOT pin" in one sentence and a pinned run in the next** (revise)

- [Observed] Line 238: "Where `--revision` names an object that is not a commit, an annotated tag included, Syzygy SHALL refuse, naming `--revision`, and SHALL NOT pin, use or follow it to any object it names."
- [Observed] The same paragraph, and the next two, treat that object as pinned:
  - "the pinned object is not a commit";
  - "naming `--revision` where one was given and otherwise the reference the pin came from";
  - "naming the pinned identifier";
  - the copy step fetches "the pinned commit alone, named by its full object identifier" (line 244), which for a tag fetches the tag identifier;
  - the class "is decided at launch, from the consents and the pinned revision" (line 242). A non-commit run must be a copy-class run to reach the checkout that detects it.
- [Observed] Line 240 lists the non-commit run among pinned refused runs ("Once a revision is pinned, the launch output and the run record SHALL state the pinned revision in full …; … a run refused for a non-commit state Unknown"). The sentence that follows says "a run refused before any revision is pinned states the refusal alone".
- [Observed] REQ-047's arm (line 386) trips when "a non-commit `--revision` is followed, pinned or used".
- [Inferred] So the run is pinned or it is not, and each answer breaks something.
  - If it is pinned, it states the full revision under line 240 and the "pinned" arm trips, while line 238's "SHALL NOT pin" is broken.
  - If it is not pinned, line 240's last sentence lets it state the refusal alone, against the same paragraph's "a run refused for a non-commit state Unknown". It also has no class to make the copy in.
- [Inferred, sub-point] Line 249 lets Syzygy read "the reference `--revision` names" from `packed-refs`. That file carries a `^<commit>` peel line under an annotated tag's value.
  - A conforming implementation may therefore refuse a packed annotated tag before any Git process starts, without "reading the object itself".
  - The scenario at line 353 would then be wrong in its THEN, "and removes the copy", because no copy exists.
- Repair I would accept:
  - Say what is pinned. For example: the resolved identifier is the run's pinned revision for the copy step and the refusal statements, and a non-commit is never followed or used as the run's revision beyond that.
  - Reword line 238's prohibition and the arm to match ("is followed, or used beyond the copy step and its refusal").
  - Either forbid the peel line as a type source, or write scenario 353's THEN as "removes the copy where its copy step started, and otherwise states that no copy was made".

**Finding 3 — The copy's directory can be created before the copy step starts, and nothing then removes it** (revise)

- [Observed] Line 244: "the Git processes it starts to do so are the copy step. It SHALL create an empty directory of its own for the copy … and in it an empty repository made with an empty template."
  - Creating the directory is not a Git process, so it can happen before the copy step starts.
  - Removal is required only "where its copy step started".
- [Observed] Line 35 permits "the copy its copy step makes, in a directory Syzygy creates for it and keeps or removes as that requirement states". REQ-047 states no fate for a directory whose copy step never started.
- [Observed] The scenario "Write consent absent" (lines 185–187) says the run "writes nothing outside the run's state directory, save the copy of a copy-class run whose copy step started, which it removes".
- [Inferred] Nothing orders the write-consent check, the alternates check (line 251) or the reftable check (line 249) after the directory is created.
  - A conforming implementation could create the directory, find the write consent absent or an alternates file, and refuse before `git init`.
  - That leaves an empty directory outside the state directory. The THEN at line 187 is tripped, and line 35's permission does not cover it.
- Repair I would accept, either of these:
  - Make the copy step start at the directory's creation, and adjust "before any Git process starts" where it is used as the C0 boundary.
  - Or require that the directory be created only after every pre-copy-step refusal check, and that any directory created be removed when the run ends before its brief.

**Finding 4 — The run record still carries Syzygy's own pre-answer reads that line 9 confines elsewhere; v1.2's refused-run rules make this unavoidable, and the owner page drops the carried note** (note, for the owner)

- [Observed] Line 9: Syzygy "SHALL store nothing from these reads except in the question, the launch output and, after a confirmed answer, the launch consent records".
- [Observed] Line 240: "Once a revision is pinned, the launch output and the run record SHALL state the pinned revision in full, the reference it came from …". It also makes a refused run state "the date where Syzygy read it". Line 37 puts the identity and normalised URL, which come from the configuration read, in the run record.
- [Inferred] A run refused before the answer, at N, P, Q0 or Q, has no later read to take these values from. Its run record must therefore store results of pre-answer reads, which line 9's SHALL forbids.
  - REQ-046's arm at line 223 ("stored outside the question, launch output and records") is not tripped only if "records" is read to include the run record. Line 9 does not read it that way.
- [Observed] This is v1.0 round 2's G5, which the v1.0 and v1.1 owner pages carried as a note.
  - [Observed] By grep, `OWNER-SIGNOFF.md` for v1.2 does not mention G5 or any carried note.
- Repair I would accept:
  - Add "the run record" to line 9's list and to the arm.
  - Or carry G5 onto the v1.2 owner page, stating that refused runs now make it unavoidable.

**Finding 5 — "Only such a launch observation consent" leaves open a revision named by launch consents of both scopes** (note, not resolved)

- [Observed] Line 242 says "Where only such a launch observation consent covers the run, the operator's clone SHALL hold the pinned commit … alone". The arm at line 386 is scoped "a run that only a launch observation consent recorded with the operator's-own-clone scope covers".
- [Inferred] Suppose launch consents of both the v1.1 scope and the v1.2 scope name the same revision. This could happen if an older binary recorded one, for example.
  - The v1.1-scope consent makes the run a no-copy run.
  - The run is not covered "only" by such a consent, so the one-commit form check does not bind it. It could run on a full clone unrefused.
  - I did not establish that the state is reachable under the record rules.
- Repair I would accept: "where no observation consent made by another act covers the run".

**Finding 6 — Earlier concerns: rounds 1 to 8 answered, except as above** (note)

- [Observed] Every round-8 finding is repaired (see the judgment section).
- [Inferred] Finding 1 reopens round 7 finding 1's class at later stages. Finding 4 is v1.0 round 2's G5, which has survived. I found no other surviving concern.

Review: R-POLARIS-LAUNCH-CONSENT-V1-2-12
Reviewed commit: 736d9fcd8a8b8bc786c2a024c8f4289ab8db31eb
Manifest SHA-256: 088d89787f126bcc8a99ee67f7733ae085af321db4883a853d88e03cf15a8eca
Verdict: REVISE
Package: polaris-dossier-launch-consent

Method. [Observed] I applied `proposed/spec.md.patch` with `git apply` in a detached worktree of 736d9fcd. The post-apply spec hashes to the digest above (`sha256sum`), which equals `proposed_sha256` in `PROPOSED-SUBJECTS.json`. The patch hashes to `patch_sha256`. I rebuilt the post-apply spec at e5a37fa1 from that commit's patch over the same base; the base spec bytes are identical at both commits, and the e5a37fa1 result hashes to 8aabbfe3…, round 11's digest. `diff` between the two post-apply specs changes exactly lines 11, 37, 223, 240, 254, 258 and 396, and no other line. Line numbers below are post-apply spec lines at 736d9fcd. Tooling, run on the unapplied tree:
- v1.0 builder `--check`: "OK: the package verifies (applied)"; `--selftest`: 25 fixtures, 0 failing.
- v1.1 builder `--check`: "OK: the v1.1 package verifies (applied)"; `--selftest`: 30 fixtures, 0 failing.
- v1.2 builder `--check`: "OK: the v1.2 package verifies (unapplied)"; `--selftest`: 31 fixtures, 0 failing.
- `record_versioned_signoff.py --selftest`: 175 fixtures, 0 failing.

I ran no dossier, read no observed-repository body and made no provider call. My only network use was `git fetch` of this repository. One fixture, a local file transport test under the scratch TMPDIR, has been deleted.

## Findings

**Finding 1 — The copy-class duty that every packet name the copy conflicts with REQ-polaris-generation-035's closed packet contents, and arm 047.23 checks that duty** (revise)

- [Observed] Line 258 says: "Every brief and packet Syzygy issues to an agent session of a copy-class run SHALL name the copy as the clone to work in and tell the session not to read the operator's clone".
  - Scenario line 310 says: "every brief and packet names the copy as the clone to work in".
  - Arm 047.23, repaired this round, reads: "a brief or packet of a copy-class run does not name the copy".
- [Observed] The predecessor REQ-polaris-generation-035 is at `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md` line 458. It says: "For each review Syzygy SHALL emit a review packet containing only the frozen subject (…), the cited spans as Syzygy read them, the governing criteria, the verdict schema, the pinned revision and the packet's own digest".
  - That list grew once before, to take the changed-block list, and it took an owner direction to do so.
- [Observed] This change does not displace or reread that sentence.
  - The preamble (line 3) says the change "reads, and in one place displaces, the predecessor text each requirement names". That one place is REQ-033's write sentence (line 35).
  - Line 258 says that, for the copy, "every read, re-hash, HEAD check and refusal they state applies to it unchanged".
  - In v1.1 the only packet duty was conditional. Scenario line 207 reads: "each that mentions consent tells the agent never to run a consent-asking command". So the conflict is new in v1.2.
  - `IMPACT-LEDGER.md` line 108 confirms the intent: "the brief and every review packet gain the statements REQ-046 and 047 add … briefs and packets name the copy".
- [Inferred] Every completed copy-class run delivers fidelity and rendered-design packets. Such a run either:
  - adds a copy location and a "do not read the operator's clone" instruction to a packet that REQ-035 says contains only six things, or
  - leaves them out and trips arm 047.23 and line 258.

  This is the recurring class: a required statement that some conforming run cannot truthfully meet. The arm sweep did not test the arm against the predecessor requirements the change reads. Its row reads "a no-copy run's brief has no copy to name".
- Repair I would accept, either of:
  - Limit the duty to briefs, meaning the authoring brief and the inventory brief, which have no closed content list. Then say what a review packet carries for a copy-class run. Change line 258, scenario line 310 and arm 047.23 together.
  - Name REQ-035's "containing only" sentence in line 35 as read to admit the copy's location and the instruction, and correct "in one place displaces" in line 3 if that reading is a displacement.

**Finding 2 — Arm 046.12's sweep repair exempts the copy from "edited or removed" but not from the same arm's working-tree branch** (revise)

- [Observed] Line 223, arm 046.12: "a file of the governance home or of the operator's clone, other than a file of a copy that a copy step makes, is edited or removed, a working tree, index or reference other than the dedicated one and those of a copy that a copy step makes changes, or the trunk tip moves".
  - The disposition's reason for the repair is: "removing the copy trips it if the copy's directory lies inside the governance home, which the body does not forbid".
- [Observed] The body still places the copy only "in a directory Syzygy creates for it" (line 35), as "an empty directory of its own … never derived from the operator's clone's path" (line 248), kept "outside the run's state directory" (line 248).
  - No sentence keeps that directory out of the governance home's working tree.
  - The falsifier's Observable (line 220) watches "every other reference, working tree and index of the governance home before and after".
- [Inferred] Take a conforming copy-class run whose copy directory Syzygy creates inside the governance home's working tree.
  - It adds a nested repository there and keeps it after the run.
  - So the governance home's working tree changes. That is not "those of a copy", which exempts only the copy's own working tree.
  - Line 35 says the copy's making, keeping and removal "lie outside every statement of this requirement that Syzygy … changes no working tree", yet the arm trips.
  - So the same case the sweep repaired for "edited or removed" stays open one clause later.
- Repair I would accept, either of:
  - The body forbids the copy's directory inside the governance home's working tree, Git directory or common Git directory.
  - The arm reads "…changes, other than by the making, keeping or removal of a copy that a copy step makes".

**Finding 3 — The no-copy agent statement says sessions "were directed" to the operator's clone, but no clause makes Syzygy direct them** (note, for the owner)

- [Observed] Lines 37 and 258 now prescribe one identical no-copy form: "that the agent sessions were directed to work in the operator's clone, that whether a session did so is its own report, labelled Inferred, and that no copy was made".
  - This lands round-11 Finding 2 and criterion 4, and it agrees with the stage rule's last sentence (line 244).
- [Observed] The copy-class form "directed to work in the copy" is backed by a duty: line 258 requires briefs to name the copy.
  - Nothing requires a no-copy brief or packet to name the operator's clone.
  - REQ-034's brief list names no clone location.
- [Inferred] The operator-agent mode treats the clone as the place sessions work. REQ-033 flags reported commands whose working directory "lies outside the clone". So the statement is defensible as a description of the mode.
  - Read literally, though, it asserts a direction Syzygy may never have given.
- Repair I would accept, either of:
  - "that the run's clone, where the agent sessions are to work, is the operator's clone, …".
  - A brief duty for no-copy runs that matches the copy-class one.

**Finding 4 — The question's two new stage tags name a stage but no run class** (note, editorial)

- [Observed] Line 11 adds "(stage: question asked)" twice. Every other tag names a class as well, for example line 240's "(stage: identifier named; both classes)" and line 242's "(stage: copy step started; copy-class)".
- [Observed] The stage rule (line 244) says each such statement "names the stage it needs and the run class that requires it, copy-class, no-copy or both".
- [Inferred] The second clause gets its class from the surrounding prose, "for a copy-class run". The first, "the agent sessions read the clone without restriction", names no class.
  - Neither tag makes any run fail to conform, so round-11 note 7 has landed in substance.
- Repair: "(stage: question asked; both classes)" and "(stage: question asked; copy-class)".

**Finding 5 — The arm table's v1.1 count is stale after the 047.2 repair: 22 arms are byte-identical, not 23** (note, editorial)

- [Observed] I split both falsifiers by script on top-level `;` outside parentheses. That gives 31 + 26 = 57 arms, which confirms the population.
- [Observed] Compared with the installed v1.1 falsifiers, 22 arms are byte-identical at 736d9fcd. At e5a37fa1 there were 23.
  - The arm that changed is 047.2. It now reads "a run started without `--revision` whose HEAD an in-force consent names", where v1.1 read "a run whose HEAD an in-force consent names".
  - `ROUND-11-DISPOSITIONS.md` still marks 047.2 "v1.1" and says "23 of them are byte-identical".
- Repair: correct the count and the 047.2 row in the next disposition page. The spec needs no change.

**Finding 6 — The 046.2 residual is real and rests on the body, not the arm** (note, not resolved)

- [Observed] Line 9 says Syzygy "SHALL store nothing from these reads except in the question, the launch output, the run record, as the statements this change requires of it, and … the launch consent records". Arm 046.2 matches it.
- [Observed] Line 37 requires "every rendered page" to disclose "the named identifier and how it was chosen". Those come from the pre-answer reference reads.
- [Inferred] On a strict reading, a run that renders pages as line 37 requires stores pre-answer read results in pages, which line 9 and the arm do not list.
  - The disposition reads pages as rendering the run record's statements. That reading is plausible but unwritten.
  - I agree with carrying the residual. It is for the owner, or a one-phrase repair: add "and every page, as the run record's statements" to line 9 and to the arm.

**Finding 7 — Round-11 findings 1 to 7, the repaired arms and the spot-checks, against the bytes** (note)

- [Observed] Round-11 Finding 1 is repaired verbatim in both arms, 046.5 at line 223 and 047.16 at line 396: "is refused because the operator's clone holds more than one commit, or history, branches, tags, stash or reflogs (the one-commit requirement version 1.1 carried)".
  - This matches ruling 4 of `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`.
  - [Inferred] The alternates, reftable and missing-object refusals no longer trip either arm.
  - A run that kept v1.1's wider form check would read files outside line 250's list, and arms 046.3 and 047.15 catch that.
- [Observed] Round-11 Finding 2 is repaired; see Finding 3 above for the remaining note.
- [Observed] Round-11 Finding 3 is repaired verbatim: "in a copy-class run, a clone with an alternates file is not refused before its copy step starts; in a launch-consented run, a reftable clone is not refused before any Git process starts".
  - Line 255 scopes alternates by class and line 253 sits under line 250's "For every launch-consented run". So neither the predecessor class nor a no-copy alternates run is bound.
- [Observed] Note 4 is repaired: line 254 now reads "its remotes' names and URLs and its object format (`extensions.objectFormat`)".
  - It falls under line 250's "every launch-consented run" heading.
  - Line 9's pre-answer list takes it through "of the operator's clone, the reads REQ-polaris-generation-047 lists".
  - It reaches only a configuration key.
  - [Inferred] The disposition uses this read to fix the identifier width for an abbreviated `--revision`. REQ-033 (local-agent spec line 13) says the hash algorithm for object reads is "never one the clone's configuration declares". This read is of configuration, not objects, and a mismatch fails the fetch, which line 258 refuses. So the result fails closed and is not a conflict, but the spec does not say what the width is taken from.
- [Observed] Note 5 is confined to `OWNER-SIGNOFF.md`. Line 242 is unchanged.
- [Observed] Note 6 is repaired at line 240 ("the reference it came from, or that `--revision` gave it") and in arm 047.6 ("its reference or that `--revision` gave it").
- [Observed] Note 7 tags are present; see Finding 4.
- [Observed] Of the 12 arms marked repaired, I confirm 10. Arm 047.23 fails (Finding 1) and arm 046.12 is incomplete (Finding 2). The 10 I confirm:
  - 046.4 and 047.24 (the stage rule): the no-copy forms now agree across lines 37, 244 and 258.
  - 046.5 and 047.16 (round-11 Finding 1).
  - 046.19: "from Git or SSH configuration" matches line 17.
  - 047.2: "started without `--revision`" matches line 238's first sentence.
  - 047.6 (note 6).
  - 047.12 and 047.13 (round-11 Finding 3).
  - 047.17: line 248's "never refused for its object format" sits inside the copy-class paragraph.
- [Observed] I spot-checked 13 hold arms by my own reading, and all hold:
  - REQ-046 arms: 046.1, 046.3, 046.6 (v1.1), 046.17 and 046.27 (v1.1).
  - Copy-class arms: 047.4, 047.5, 047.9, 047.11, 047.19, 047.20, 047.21 and 047.22.
  - For 047.11 I ran a fixture on Git 2.53.0. The operator clone carried `core.fsmonitor`, `uploadpack.packObjectsHook`, `core.pager`, `core.sshCommand`, `diff.external` and `core.alternateRefsCommand`, each set to a marker command, plus executable `pre-upload-pack`, `post-upload-pack`, `reference-transaction`, `post-checkout` and `pre-auto-gc` hooks. I ran `env -i`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_ALLOW_PROTOCOL=file` and `GIT_NO_LAZY_FETCH=1`, with `init --template=`, `fetch --depth=1 --no-tags --no-recurse-submodules file://… <tip>` and `checkout --detach` under `core.hooksPath=/dev/null`. Both exited 0 and no marker was created.
- [Observed] The prose pages match the changed lines:
  - Each of the seven post-apply lines appears verbatim in `SEMANTIC-DELTA.md`, and no e5a37fa1 form of them remains there.
  - The delta's object-format sentence now says "read as text in every launch-consented run".
  - `OWNER-SIGNOFF.md`, `IMPACT-LEDGER.md` and the campaign file name round 11 as `REVISE` at raw line 4, over e5a37fa1.
- [Unknown] Outside the changed lines and the clauses listed in the brief's Touches column, I tested only REQ-034, REQ-035 and REQ-033's hash-algorithm clause in the local-agent spec. I did not re-run the 26-clause class-qualifier sweep.

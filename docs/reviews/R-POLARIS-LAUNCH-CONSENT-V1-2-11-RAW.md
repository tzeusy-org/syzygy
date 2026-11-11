Review: R-POLARIS-LAUNCH-CONSENT-V1-2-11
Reviewed commit: e5a37fa17aa6da7264e608b06ad5bcdcb2b14e86
Manifest SHA-256: 8aabbfe394e5ef287718b588c8b1f5b5899a16b18a289940a1e4c36b3447a9ab
Verdict: REVISE
Package: polaris-dossier-launch-consent

Method. [Observed] I applied `proposed/spec.md.patch` to the commit in a detached scratch worktree. The post-apply spec hashes, by `sha256sum`, to the digest above, which equals `proposed_sha256` in `PROPOSED-SUBJECTS.json`. The spec has 55 scenarios (`grep -c '^#### Scenario:'`). I read the whole post-apply spec. Line numbers below are post-apply spec lines. `--check` and `--selftest` pass for all three builders:
- v1.0: "OK: the package verifies (applied)", 25 fixtures, 0 failing;
- v1.1: 30 fixtures, 0 failing;
- v1.2: "OK: the v1.2 package verifies (unapplied)", 31 fixtures, 0 failing.

`record_versioned_signoff.py --selftest` gives 175 fixtures, 0 failing. I ran no dossier, read no observed-repository body and made no provider call or network request beyond `git fetch` of this repository.

## Findings

**Finding 1 — The v1.1-consent falsifier arms trip on refusals the spec itself requires** (revise)

- [Observed] Line 223 (REQ-046 falsifier): "a run that only a launch observation consent recorded with version 1.1's scope covers is refused for its clone's form or history". Line 396 (REQ-047 falsifier): "a run that only a launch observation consent recorded with the operator's-own-clone scope covers is a no-copy run, is refused for its clone's form or history".
- [Observed] The spec's own Case (line 392) lists alternates, reftable and a partial clone's missing object as the operator's clone's form: "the operator's clone's form (full with history, branches, tags, stash and reflogs; one commit alone; partial with a missing object; with an alternates file; references in the reftable backend; a configuration and hooks naming commands)".
- [Observed] Such a run is now a copy-class run (line 242). For a copy-class run the body requires these refusals:
  - line 255: "in a copy-class run, a clone where it does SHALL be refused before the copy step starts";
  - line 253: a reftable clone "SHALL be refused before any Git process starts";
  - line 258: a clone that lacks an object reachable from the commit "fails the copy, and Syzygy SHALL refuse".
- [Inferred] So a conforming implementation that refuses a v1.1-scoped run on an alternates, reftable or partial clone, as the body requires, trips both arms. This is the recurring class in falsifier form: a predicate that some conforming run, here by its consent's scope and its clone's form, cannot meet. `ROUND-11-PREP.md` rows "2, 9" classify these arms as "(falsifier, not a statement)" and so never tested them against the refusals.
- Repair I would accept: bound both arms to the refusal ruling 4 removed. For example: "is refused because the operator's clone holds more than one commit, or history, branches, tags, stash or reflogs (the one-commit requirement version 1.1 carried)". Or: "is refused for its clone's form or history other than as this requirement refuses every copy-class run".

**Finding 2 — A no-copy run must state that its agent sessions "worked in" the operator's clone, an act Syzygy cannot observe** (revise)

- [Observed] Line 258 ends: "Once a copy-class run's brief or packet was delivered, the run record SHALL state, labelled Inferred, that whether a session stayed in the copy is its own report; for a no-copy run, it states that the sessions worked in the operator's clone and that no copy was made."
- [Observed] The stage rule (line 244) says: "Syzygy states nothing about whether an agent session started, received or read a brief or packet except as that session's own report, labelled Inferred."
- [Observed] REQ-046 line 37 gives a different no-copy form for the same run record: "for a no-copy run, once a brief or packet was delivered, that the agent sessions were directed to work in the operator's clone and no copy was made".
- [Inferred] "The sessions worked in the operator's clone" asserts that a session started and worked, as fact and not as the session's own report. Syzygy observes only that it issued a brief or delivered a packet. The operator may never start a session (local-agent spec: sessions are the operator's own act).
  - A conforming no-copy run that reaches brief or packet delivered can make line 258's statement only by breaking line 244. It can omit the statement only by tripping line 396's "a statement the stage rule governs is missing for a stage the run reached and a run class that requires it".
  - The two requirements also prescribe two different statements for one disclosure.
- [Inferred] This is the class of rounds 6, 7, 9 and 10, and it sits in the sentence round 10's Finding 1 repair wrote. `ROUND-10-DISPOSITIONS.md` (F1, "Line 258") and `ROUND-11-PREP.md` row 26 adopt the "worked in" wording as the no-copy form.
- Repair I would accept: "for a no-copy run, once a brief or packet was delivered, it states that the agent sessions were directed to work in the operator's clone, that whether a session did so is its own report, labelled Inferred, and that no copy was made". That matches line 37 and the stage rule.

**Finding 3 — REQ-047's alternates and reftable arm has no run class, so it binds runs the body does not refuse** (revise)

- [Observed] Line 396: "a reftable clone or a clone with an alternates file is not refused before any Git process starts".
- [Observed] The body limits both refusals:
  - alternates by class (line 255: "in a copy-class run, a clone where it does SHALL be refused before the copy step starts");
  - reftable by the list's heading (line 250: "For every launch-consented run, the reads Syzygy itself makes … SHALL be only these").
- [Observed] The preamble (line 3) says a run that another act's records fully cover "keeps every predecessor requirement's bytes and meaning". Line 252 is explicit that a no-copy run reads its consent's form check and nothing more.
- [Inferred] A conforming run of either of two kinds would be marked as a violation by the arm:
  - a no-copy run on a clone with an alternates file, under another act's consent that states no clone form;
  - a predecessor-class run on a reftable clone.
  
  The arm also tests "before any Git process starts", while the body and the scenario "Clone with an alternate" (lines 348–353) require "before its copy step starts", which is earlier. The arm is a weaker oracle than the clause it checks.
- Repair I would accept: "in a copy-class run, a clone with an alternates file is not refused before its copy step starts; in a launch-consented run, a reftable clone is not refused before any Git process starts".

**Finding 4 — The SHA-256 ruling lands, and the copy is achievable as written; one read-order gap remains** (note)

- [Observed] I reproduced `ROUND-11-PREP.md`'s fixture on Git 2.53.0 with `env -i`, system and global configuration off, `GIT_ALLOW_PROTOCOL=file` and `GIT_NO_LAZY_FETCH=1`.
  - The source was `git init --object-format=sha256` with two commits; the tip has 64 hex digits.
  - Into `git init --template= --object-format=sha256`: `fetch --depth=1 --no-tags --no-recurse-submodules file://… <tip>` exited 0 and `checkout --detach` exited 0. HEAD equals the tip, `rev-list --all` gives 1, and the config holds `repositoryformatversion = 1` and `[extensions] objectformat = sha256`. `.git` holds FETCH_HEAD, HEAD, config, index, logs, objects, refs and shallow.
  - Control into `--object-format=sha1`: fetch exit 128, "couldn't find remote ref <tip>".
  - The prep's results hold.
- [Observed] On places that assume SHA-1:
  - The spec's only digit count is the phrase's "first twelve hexadecimal digits" (line 11), which holds for either format.
  - Line 248 sets the form to "the form that one commit fetched alone into an empty repository of the same object format … the repository format version and object-format setting that format needs included".
  - `packages/polaris-dossier/src/git-object-reader.ts` line 17 already "takes the hash algorithm from the consented identifier (40 hex digits SHA-1, 64 SHA-256)".
  - `clone-shape.ts` still pins `repositoryformatversion` to `/^0$/` and refuses `extensions` (lines 15–17, 57). That is product code; the spec states the wider form the implementation must meet.
- [Observed] Git reads `extensions.objectformat` case-insensitively in its key (`[Extensions] ObjectFormat = sha256` gives `sha256`). It does not honour an `include.path` for it (object format via include only gives `sha1`), and it rejects the value `SHA256` ("invalid value for 'extensions.objectformat'"). [Inferred] A text read that folds key case and ignores includes matches Git. Any mismatch makes the fetch fail, and line 258 then refuses, so the failure is closed.
- [Inferred] Read-order gap. Line 254 allows the object-format read only "in a copy-class run", and line 242 decides the class "from the consents and the named identifier". Line 256 resolves an abbreviated `--revision` from "the object identifiers its loose object file names and pack indexes give". A pack index records no hash width, so before the class is known Syzygy must infer a SHA-256 clone's identifier width from file sizes. That is achievable, but the text leaves it implicit.
- Repair I would accept (for the owner): allow the `extensions.objectFormat` read in every launch-consented run, or before the class is decided. It is a configuration key, not repository content.

**Finding 5 — The v1.1-consent disclosure names only "no fetch by Syzygy", though the copy also departs from "held in the operator's own clone"** (note, for the owner)

- [Observed] v1.1's recorded scope (installed spec line 17) reads: "held in the operator's own clone, with no fetch by Syzygy". Line 242 requires only "that the copy goes beyond that consent's "no fetch by Syzygy" wording".
- [Observed] Ruling 4 in `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md` names exactly that wording, so the text lands the ruling as made.
- [Inferred] After the copy, blobs are read from the copy, not from the operator's clone. The disclosure is therefore narrower than the departure. The objects are content-identical, so this is a fairness point for the owner page, not a defect against the ruling.

**Finding 6 — "the reference it came from" has no referent for a `--revision` given as an identifier** (note, not resolved)

- [Observed] Line 240: "Once an identifier is named (stage: identifier named; both classes), they SHALL state the named identifier in full, the reference it came from". Line 238 itself contrasts "naming `--revision` where one was given and otherwise the reference the named identifier came from".
- [Observed] The wording is carried from v1.1 (installed line 184: "the pinned revision in full, the reference it came from").
- [Inferred] It is a statement a run with `--revision <hex>` makes only by reading "the reference" as "`--revision`". Repair: "the reference it came from, or that `--revision` gave it".

**Finding 7 — The prep tables disagree with the stage rule on the no-copy question, and the question's agent statements carry no stage** (note, editorial)

- [Observed] `ROUND-11-PREP.md` rows 5 and 6 give the no-copy form as "the question carries no copy statement". Line 244 says "a no-copy run's form of every copy statement is that no copy was made". Line 246 counts the question's copy statements among the copy statements.
- [Observed] The question's agent-session statements (line 11: "the agent sessions read the clone without restriction"; "the agent sessions are directed to work in the copy") name no stage. They are made before the brief or packet delivered stage.
- [Inferred] Read as statements of what will be directed, they are truthful. The stage rule's "names the stage it needs" is still not met in words. Repair: tag them (stage: question asked) and correct the prep rows.

**Finding 8 — Round-10 findings against the bytes** (note)

- [Observed] Finding 1 is repaired in REQ-046: line 37 carries class and stage for both directions. It is re-opened in REQ-047 line 258 (Finding 2 above).
- [Observed] Finding 2 is repaired. The final stage is "brief or packet delivered, once Syzygy has issued a brief or delivered a packet" (line 244). `agent session started` occurs only at line 244, as the prohibition, and line 396, as its arm. The string "no agent session" does not occur.
- [Observed] Finding 3 is repaired. Line 31 reads "checked out at the named identifier where one was named, and otherwise naming `--revision`".
- [Observed] Finding 4 is repaired. "which an observation consent's naming of it as a revision already shows" occurs 0 times. Line 303 reads "checks out the named identifier".
- [Observed] Finding 5 is repaired:
  - the question is among the stage rule's media;
  - "question asked, where a question is needed";
  - the named identifier is among the stage rule's subjects;
  - line 37 carries "or that none was recorded" and "or that none was made".
- [Observed] On criteria 19 to 21:
  - Criterion 20: no sentence in the spec, `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md` or `OWNER-SIGNOFF.md` makes a v1.1-scoped run a no-copy run. I swept for `one-commit`, `commit alone` and `version 1.1` near `no-copy`; the remaining hits describe the redis consent, the earlier drafts or the ruling.
  - Criterion 21: the fourth residual is at line 15, labelled Inferred, beside the other three.
- [Unknown] I did not re-run the full quotation re-extraction, the rule-9 sweep or the 196-occurrence "copy" sweep. Beyond Findings 1 to 3, I tested the stage-and-class rule only against the REQ-046 and REQ-047 statements quoted above.

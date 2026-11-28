# R35 code review: dispositions

Review: `R35-CODE-REVIEW-RAW.md` in this directory, verdict `CONFIRM WITH EXCEPTIONS` (line 2), over `790bda394`. No blocking finding, seven notes. One round; no confirmation review follows (D10).

The code and test repairs are in `0fbcadcc4`, then a merge of `origin/main` (`59377a61f`), then `a82ae1ec0` and `0fb0fd9b3`. The branch then merged `origin/main` again (`3760f645d`), which changed `check.ts`, `view-level.test.ts` and `walk.test.ts`. The mutation record is `docs/evidence/syzygy-3efd-35/walk-advice-code-mutation-r3-2026-11-29.json`, run at `3760f645d` by `walk_advice_code_mutation_r3.py`, with every subject file's digest at that commit (the same scores at `a82ae1ec0` and `0fb0fd9b3` before that merge):

- 55 mutants;
- 50 killed, 46 of them by an assertion and four by a thrown error;
- 5 argued equivalent, each with its reason in the record;
- no survivor that is not argued equivalent.

The two earlier records (`walk-advice-code-mutation-round1-2026-11-28.json` and `walk-advice-code-mutation-2026-11-28.json`) are kept as history of `3ceedaa35` and `d2ee135a8`.

## 1. Note: check's `hidden` path is untested

Repaired.

- New in `walk.test.ts`: the describe "under the committed dossier policy, a directory withheld at check is not read". It applies the rules of `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json` under the fixture's binding, so the screen keeps the fixture's policy identity.
- The tree holds `src/a.ts`, `kubeconfig/a.ts`, `.ssh/a.ts` and `.kube/notes`, and the walk has one step on each directory. Check gives `examined: 1` and one advisory, at the `src` step.
- Under the fixture policy, which denies none of these, the same draft reads all four steps.
- Mutant `check-hidden-unscreened`, a survivor in round 2, is killed. So is `check-hidden-denied-dropped`.

## 2. Note: denied directories are treated inconsistently

Repaired, fail-closed, as the lead preferred.

- What withholds a top-level directory at check:
  - a denied-path rule naming its own path (`kubeconfig`), as before;
  - now also, a `deniedDirectoryNames` entry naming it (`.ssh`, `.kube`), so that every path below it is denied.
  - It is still named on the directory map, which 2.35 allows.
- How it works:
  - `DossierScreen.deniesBelow(directory)` (`screen.ts`) asks `deniedDirectory` about a path one segment below the directory.
  - `walk-advice.ts` asks it only of a directory element, never of a unit's manifest path, which is a file path.
- The other reading, "a directory every file below which is denied", is not taken:
  - it depends on the files the tree holds, so the same directory could be read in one revision and withheld in the next;
  - on every directory the policy names, the two readings agree;
  - they differ only for a directory that holds nothing but denied basenames, whose name the policy does not screen.
- The spec text that defines "withheld at check" for a directory is the levels errata 2.55 (syzygy-3efd.91), aligned with this code.
- Unit tests:
  - a directory map in which only `.kube` is denied below;
  - a unit whose manifest path `deniesBelow` would answer for, which is still read.
- Mutants, all killed:
  - `base-denies-below-read`;
  - `base-denies-below-units`;
  - `check-denies-below-unscreened`;
  - `screen-denies-below-none`;
  - `screen-denies-below-final`.
- Dead branch: the secret half of check's `hidden` stays, as a fail-closed guard. Mutant `check-hidden-secret-dropped` is recorded as equivalent, with the review's own reason: secret paths are left out of both maps.

## 3. Note: the mutation evidence is not bound to the reviewed bytes

Repaired.

- The round 3 record ran at `3760f645d`, the code head after the repair and both merges of `origin/main`; no product or test file changes after it.
- Its `subject` holds the digest of each of the seven files it mutates or runs at that commit.
- The tests run are `walk-advice.test.ts`, `walk.test.ts`, `view-level.test.ts` (with the `levelFindings` merge) and `inventory.test.ts`.

## 4. Note: two equivalence arguments

- `base-not-shown-read`: kept as equivalent, with the review's agreement.
- `graph-kind-ignored`: no longer argued equivalent.
  - The `walkAdvice` docstring now states what a direct call reads: a walk that is malformed, or whose figure is missing or of no graph kind, is skipped and counted nowhere; and check passes the walk findings of the same draft.
  - New unit tests (describe "walk advice called directly, with no finding to skip a walk by") cover:
    - a `sequence` figure whose nodes carry the labels;
    - a missing figure;
    - a malformed walk;
    - a missing block;
    - a missing node;
    - a view kind with no view.
- Mutants, all killed:
  - `graph-kind-ignored`;
  - `walk-read-undefined-read`;
  - `walk-diagram-missing-read`;
  - `step-block-missing-counted`;
  - `node-missing-labelled`;
  - `view-record-ignored`.

## 5. Note: three D7 mutants are missing

Repaired. `d7-utf16-code-units`, `d7-one-new-word` and `d7-echo-word` are in the round 3 run, and all three are killed.

## 6. Note: some requirements and branches have no test

Repaired or answered:

- Inventory absence: `inventory.test.ts` asserts that the inventory-check report has no `walkAdvice` member.
- Disposition independence: a new test in `walk.test.ts` reads a walk over an omitted figure (3 examined, 2 advisories) and a walk in an omitted deep dive (2 examined, 1 advisory).
- Exit status and readiness:
  - The CLI's `check` exit status reads the outcome alone, and the gates-nothing test compares outcomes. `view-level.test.ts` now says so.
  - Readiness reads the run's files, which note 7's test compares byte for byte.
- The guards `plan.command === 'check'`, `parseFault === null` and `isRecord(walked)` decide nothing the rule does not already decide. Their mutants (`check-command-unguarded`, `check-parse-unguarded`, `check-record-unguarded`) are recorded as equivalent, with reasons.
- `isRecord(diagram['view'])`: tested (note 4).
- The composition-guarded branches: tested at unit level (note 4).
- The check-level `hidden` path: note 1.

## 7. Note: byte stability is asserted by absence of a string

Repaired.

- A new test in `walk.test.ts` checks and renders the same draft twice: once with the advice computed (3 advisories), and once with it forced off through the mocked module.
- It compares byte for byte every file check writes into the run: `checks/rev-0.json`, `derived/rev-0.json`, `draft.schema.json`, `drafts/next.json`, `drafts/rev-0.json`, `run-advice.json` and `steps.jsonl`. It also compares every file of the rendered site.
- Three files are not compared: `brief.json`, `brief.md` and `run.json`. Run setup writes them before check, and each names its run's own temporary clone or that clone's digest.

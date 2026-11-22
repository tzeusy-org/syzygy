# The 2026-11-21 Polaris dossier pilot: record and commands

A record and four scripts, kept so the comparison can be run again on a stored
or new dossier (bead syzygy-5dhm.133, move R29 slice 1). Not authority. The
pilot is uncalibrated: one repository (redis/redis at one commit), model
readers, a model grader, no human. A share here can show a loss; it cannot
support a claim that a dossier wins.

## What each file is

| File | What it is |
|---|---|
| `PROTOCOL.md` | The protocol, written before any arm ran. It names the tree, the dossier text and the synthesis by their names in the pilot's working directory. |
| `manifest.json` | The screened tree's counts, the policy digest and commit it was built with, and the newest dossier's page and word counts. |
| `key.json` | 24 questions, four of each of six kinds, with model answers, required facts and supporting lines. Never shown to an authoring session. |
| `questions.json` | The same questions as a reader gets them: id, kind and question only. |
| `plain-synthesis.txt` | The plain author's synthesis (arm P). The protocol and the first result file call it by its working name, a Markdown file; it is stored as text because it quotes another repository's paths. |
| `answers-D.json` … `answers-T.json` | One reader's answers per arm. D, E, F, G, H read one stored dossier each, P the synthesis, T the screened tree itself. |
| `runs.json` | The six stored runs: brief version, schema version, page and word counts by page class. |
| `runs-page-words.json` | The words per kept page of each run's last rendered site, from which the split in `runs.json` is re-derived, with each run's id and a digest of the pages measured. |
| `grading/`, `grading2/`, `grading3/` | Each blind grading: the grader's input and the grades it returned. |
| `labels-first-grading.json`, `labels-second-grading.json`, `labels-third-grading.json` | Which blind label was which arm. A grader is never given these. |
| `claims/result.json` | The claim check of the newest dossier and the synthesis, under labels X and Y. |
| `result.json`, `result2.json`, `result3.json` | The recorded totals of the three gradings. |
| `prompts/` | The prompt for each kind of session, with placeholders for paths. |

Arms: D is run 658f2f90 (brief version 7, the newest), E run d9411d26
(brief 1), F run 2ecdcab0 (brief 2), G run 4465d22f (brief 1), H run
ffe579c7 (brief 4), P the plain synthesis, T the source reader.

Not stored: the screened tree (rebuilt by the command below, never committed)
and the dossier text (converted again from the stored run's site).

## Reproduce the totals

```
python3 scripts/dossier_pilot_totals.py --check
```

It recomputes, from the stored grades and label maps, every arm's share of
required facts and its share per question kind for all three gradings, the
"not stated" counts and the claim-check totals, and compares them and nine
file digests with the three result files. It exits 1 and names each
difference if one differs; a figure a result file should record and lacks is
a difference too. `--selftest` changes one stored value in memory at a time
(a grade, a label map, a kind, a recorded share and thirteen more) and
confirms the check fails each time.

Recorded shares of required facts (81 facts over 24 questions):

| Arm | First grading | Second | Third |
|---|---|---|---|
| D, newest dossier | 0.34 | 0.327 | 0.333 |
| E, richest stored dossier | | 0.574 | 0.605 |
| F | | | 0.481 |
| G | | | 0.414 |
| H | | | 0.389 |
| P, plain synthesis | 0.481 | 0.457 | 0.469 |
| T, source reader | 0.944 | 0.951 | |

These rows are copied from the result files as of 2026-11-22; the command
above is the check, and the result files are the record.

## Check the stored runs' page counts

```
python3 scripts/dossier_pilot_runs.py --check
python3 scripts/dossier_pilot_runs.py --check --state-root <dossier state directory>
```

The first form re-derives each run's pages, words and split by page class
(reader, navigation, run, other) from `runs-page-words.json` and compares
them with `runs.json`. The second also converts each stored run's last site
again and compares its words per page, brief version and schema version with
the record; it needs the stored runs, so only the first runs in the battery.

`runs-page-words.json` names what was measured: each run's `runId` and, for a
run with a site, `siteDigest`, the SHA-256 of one line per kept page in path
order (the SHA-256 of the page's bytes, two spaces, the page's path, a line
feed). [Observed] Both were derived from the stored runs on 2026-11-22 and
the second form reproduced them. The first form cannot: without the stored
runs it holds a run id only to its form and to `runs.json`, and a digest only
to 64 hex digits, so a digest changed to another well-formed one passes the
battery and fails only the second form. The script exits 2, with one line and
no traceback, when either record is malformed.

## Run the comparison on another dossier

No script starts a session. An operator or an agent starts each one, fresh,
from the prompt named.

1. Dossier text, from a stored run's rendered site (read only; counts are
   printed, never page text):

   ```
   python3 scripts/dossier_site_to_text.py <run directory>/site/<n> <new text directory>
   ```

   Over run 658f2f90's site 1 it prints 15 pages, 12574 words and 27 source
   pages left out, the figures in `manifest.json`.

   Add `--reader` for the reading path alone (syzygy-5dhm.136): the pages of
   class `run`, which a dossier lists under its "About this run" entry, are
   left out too and counted with their words. The page classes are one
   definition, `scripts/dossier_page_classes.json`, which this script and
   `scripts/dossier_pilot_runs.py` both read. The pilot's arms were given the
   full text, so a share measured on the reader form is a different arm.

2. The screened tree, for the key, plain-author, source-reader and
   claim-checker sessions. Fetch the manifest's commit into a bare clone
   yourself; the script never fetches and runs nothing from the clone.

   ```
   npm run build
   node scripts/dossier_pilot_screened_tree.mjs --clone <bare clone> --out <new directory outside this checkout>
   ```

   It applies the dossier screen itself (the built `buildDossierScreen`) with
   the policy bytes whose digest the manifest records, and exits 1 if any
   count differs from the manifest (2 on a refusal or any other error).
   Without `--out` it compares and writes nothing. The counts depend on the
   screen's code as well as the policy, so a later screen change can move
   them; that difference is a finding. The screen is whatever the last build
   left in the package's dist directory: the output names the checkout's
   head and whether its worktree is dirty, and the only freshness check is
   that the built screen module is not older than its source file, so build
   immediately before a run you mean to record.

3. A reader session per arm: `prompts/reader-artifact.txt` for a dossier's
   text or the synthesis, `prompts/reader-source.txt` for the tree.

4. The grader's input, under labels drawn from a digest. Write the label map
   to a directory the grader is not pointed at.

   ```
   python3 scripts/dossier_pilot_grading_input.py --arms D,E,P --coin answers-E.json --out <input file> --labels-out <label file elsewhere>
   python3 scripts/dossier_pilot_grading_input.py --grading third --check
   ```

   The second form rebuilds a recorded grading's input and label map and
   compares both with the stored files.

5. A grader session from `prompts/grader.txt`, given the input file only.

`prompts/key.txt`, `prompts/plain-author.txt` and `prompts/claim-checker.txt`
are for a new key, a new synthesis and a new claim check.

## Limits

- [Observed] The pilot's sessions were started by hand and their prompts were
  not stored. [Inferred] The files in `prompts/` are written from the protocol
  and from the shape of the stored outputs; only the plain author's
  two-sentence instruction is the protocol's own wording. A session started
  from them is a new measurement, not a replay.
- The claim checker's prompt asks for a fixed-step sample of 30; the protocol
  says every tenth sentence and the stored check records a step of 4.
- [Observed] The stored claim check uses a fourth verdict, "partly" (2 of the
  dossier's 30 sampled claims), which the protocol does not define: it names
  supported, contradicted and not found only. The reconstructed prompt
  carries "partly" because the stored output does.
- The result files' digests bind the first grading's inputs only. The second
  and third gradings' grades and the three label maps are pinned as literals
  in `scripts/test_dossier_pilot.py`.
- The totals script totals a new grading only when its grades, label map and
  result sit under the names it lists; reporting a new arm beside the kept
  ones on each change is slice 2 of the move.
- `python3 scripts/test_dossier_pilot.py` runs the tests. Since 2026-11-22 it,
  the totals check and the selftests are lines of the status battery in
  `PROJECT-STATUS.md` and steps of the hosted workflow.
- When a change must report these shares, and what a drop may be called, is
  in `CONTRIBUTING.md` ("Changing the dossier brief, draft schema or
  renderer").

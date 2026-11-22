# Version 2.18 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] Predecessors, as the effective composition takes them at `c900e871`:

- REQ-polaris-generation-033: the MODIFIED text in `openspec/changes/dossier-raw-read-disclosure/proposed/polaris-generation/spec.md` (version 2.17, row A-51, `RAW_READ_SUBJECTS`).
- REQ-polaris-generation-035 and -048: the MODIFIED and ADDED texts in `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md` (version 2.1).

[Inferred] Once adopted, this version's three complete MODIFIED requirements replace those texts, composed after version 2.17 (so after every earlier version that touches them). IDs, names, Source lines, Scope lines and warrants blocks are unchanged, so `GOVERNING-DEPENDENCIES.json` is the union of the three predecessors' warrants. Scenarios: REQ-033 goes from 9 to 11, REQ-035 from 37 to 40, REQ-048 from 27 to 28; no other requirement changes. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] The new text was built from the predecessor bytes by a script that inserts only at anchors it asserts occur exactly once. A line diff of each requirement against its predecessor shows exactly: one inserted paragraph, the inserted scenarios, and the four Form lines **Case**, **Observable**, **Oracle** and **Falsifier** each extended at its end, their existing text kept as a prefix (the **Falsifier**'s final period moves after the added clause). **Oracle independence** is unchanged.

## Added

[Observed] REQ-033: after the paragraph beginning "Syzygy SHALL hold the run record and every record on which a check result, a limit or readiness rests in its own state directory for the run", the paragraph "Since version 2.18 every reader of a run file this requirement states SHALL read it by the reader rule ...". Two scenarios after "Checked relay evidence does not stand for raw-read traffic": "Run files read under their bounds" and "Run record past its bound".

[Observed] REQ-035: after the paragraph beginning "An inventory or review session MAY be started before its input exists", the paragraph "Since version 2.18 every reader of a file this requirement states that lies within the agent sessions' write reach ...". Three scenarios after "Supervised packet delivery uses only admitted MCP tools": "Review files read under their bounds", "Frozen verdict past its bound" and "Delivered packet read under its recorded size".

[Observed] REQ-048: after the paragraph beginning "The supervisor SHALL enforce033's deadline/repair/question gates", the paragraph "Since version 2.18 the supervisor SHALL read its own state ...". One scenario after "Verified default is explicit and unsupported model never falls back": "Supervisor state read under its bound".

[Observed] Form lines, each requirement: **Case** gains a sentence putting a FIFO, a symbolic link to a device, a directory, a file one byte past its bound and a file grown after its size was taken at each bounded path (and, for 033 and 035, a regular file exactly at each bound); **Observable** gains each reader's outcome and words and the bytes read; **Oracle** gains the outcomes and words fixed from the stated bounds before the readers run; **Falsifier** gains a clause, before its final period, for a reader that blocks, reads more than one byte past the bound, or takes (for 035, counts from) a file that is not a regular file or is past its bound.

## Amended

[Observed] None: no existing sentence of the three requirements changes; the file's title and preamble are its own.

## What a reader of the previous text would now do differently

[Inferred]

- Every reader of `run.json`, the step log, the breach log, the credential list, `execution-choice.json` and `record.json` opens the path once without blocking, refuses anything but a regular file, and reads at most one byte past the file's bound; where its outcome named an error code it names `not a regular file` or `larger than <bound> bytes`.
- Review check refuses a verdict grown past 4,194,304 bytes while read; review and the supervisor refuse a frozen verdict, and inventory counting, the fidelity packet and the coverage advice a frozen inventory, that is not a regular file or is past 4,194,304 bytes, with the stated words.
- `readRecord`'s callers and the supervisor read the review check, prompt, launch-form and delivery records under 262,144 bytes; the supervisor takes a review check record it cannot read as no checked verdict.
- The waiting command reads a round's delivery record before its packet and bounds the packet by the size that record states.
- The design packet reads each page file under what remains of the site's bound.
- The supervisor reads its state file under 16,777,216 bytes, and resume, attach and stop refuse a state file that is not a regular file or is past it as they refuse one that does not parse.

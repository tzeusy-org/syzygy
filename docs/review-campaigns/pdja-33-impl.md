# Polaris launch-consent v1.2 and source-acquisition entry v1.1, implementation

## Patterns

- `R-PDJA-33-.*\.md`

## What was under review

`syzygy-pdja.33`: the implementation of REQ-polaris-generation-046 and 047 (launch-consent spec v1.2) and registry entry v1.1's ledger items 1b and 3, in slices on `agent/syzygy-pdja-33-impl`, under `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-IMPLEMENTATION-2026-11-12.md`. Slice A narrows the launch reads of the operator's clone to the closed list; slice B adds the copy step; slice C reads locators by the admitted forms; slice D adds the statements 046 and 047 require of the question, the output, the run record, the pages and the briefs.

## Last verdict of record, and where the findings landed

`REVISE` (`R-PDJA-33-SLICE-C-1-RAW.md:4`), over `f970825c`, slice C and the slice-B repairs. The raw confirms slice-B findings 1 to 6 resolved and upholds the reading of 047's copy settings as properties. Each finding is repaired by its own commit on the same branch. The repair mutants are recorded in `docs/evidence/syzygy-pdja-33/slice-C-repair-mutation-2026-11-14.json`:

- Finding 1 (revise): Git's `<transport>::<address>` form read as an scp-form locator. An scp-form path beginning with ":" is now refused, for an operator's URL and a remote's (`495bf19e`).
- Finding 2 (note): a leading empty path segment was collapsed. It is now refused, as an inner one is (`cfa93e7c`).
- Finding 3 (note): an interrupt outside the question left the copy behind. A process-level SIGINT watch runs from the copy step to init's outcome and leads to the failure path, which removes the copy (`85bb5fb1`, `4c64ca0b`).
- Findings 4 and 5 (notes): the host, port and identity first-character rules are narrower than the text. Each refusal they cause now names its rule, `--identity`'s included. Nothing is widened; the question goes to the owner (`52950f09`).
- Finding 6 (note): an identity remote with several url lines fell through to another remote. It is now kept with no URL, and the refusal names it and the rule. Dot segments and `.GIT` stay literal (`200b8cdc`).
- Finding 7 (note): the URL in preflight's printed command is single-quoted (`7a9a9798`).

Earlier: `REVISE` (`R-PDJA-33-SLICE-B-1-RAW.md:4`), over `ad6163f3`, slice B and the slice-A repairs. Each finding is repaired by its own commit on the same branch, and the repair mutants are recorded with slice B's 25, re-run, in `docs/evidence/syzygy-pdja-33/slice-B-mutation-rerun-2026-11-13.json`:

- Finding 1 (blocking), a repeat `init --url` at a launch-consented HEAD ran on the operator's clone: every "another act" check reads the sources without launch records (`GateSources.otherActs`, `otherActsOf`), in `init` and throughout the launch (`ab7e5b0a`).
- Finding 2 (revise), a thrown error or an interrupt left the copy: a thrown error after the copy step starts is a `failure` refusal that removes the copy and says so; Ctrl-C or the end of input at a question is no answer (`87876848`). Whether a refused `brief` command owes a removal is left for slice D.
- Finding 3 (revise), the oracle after the copy step: the clone is re-sealed after each copy Git process, the copy entry points and `openAsBlob` are logged, and the log is rooted at the clone (`85bbfb11`, `d62f99a8`); mutant O3 is recorded killed.
- Findings 4 and 5 (notes), attributes, identity and maintenance: `GIT_ATTR_NOSYSTEM=1`, `core.attributesFile=/dev/null`, a fixed identity and `maintenance.auto=false`, after reading 047's copy paragraph as stating properties rather than a closed set of settings (`02508a19`).
- Finding 6 (note), `objectsRead` after a copy-stage refusal: decided from whether an object read ran (`1c6d6708`).
- Finding 7 (note), the copy statements deferred to slice D: no repair; the owner's run waits for slice D.

Earlier: `REVISE` (`R-PDJA-33-SLICE-A-1-RAW.md:4`), over `db109c54`, slice A round 1. Each finding was repaired by its own commit on the same branch:

- Finding 1 (revise), the read oracle saw only `openSync`: the fixtures make every non-admitted file unreadable (mode 000) and the oracle also patches the other read entry points; mutants R1 and R3 recorded killed in `docs/evidence/syzygy-pdja-33/slice-A-repair-mutation-2026-11-13.json`.
- Finding 2 (revise), every remote's HEAD read: `refs/remotes/origin/HEAD` admitted first, the others only when it is absent or not symbolic; the FULL fixture re-pinned.
- Finding 3 (note), the `.git/reftable` probe: dropped; the HEAD placeholder is the detection.
- Finding 4 (note), `--revision HEAD` refused: HEAD admitted as a candidate.
- Finding 5 (note), M10: recorded as surviving with the race unstaged, and killed where the oracle can report a link as a regular file.
- Finding 6 (note), the alternates refusal: wired to `snapshot.alternates` with the copy step in slice B (`fd48132a`).

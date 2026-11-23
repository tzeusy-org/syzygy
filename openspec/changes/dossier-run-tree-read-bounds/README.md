# dossier-run-tree-read-bounds

[Inferred] Candidate version 2.18 of the dossier specification line, for bead syzygy-3efd.80: three MODIFIED requirements, REQ-polaris-generation-033, -035 and -048, each extending the reader rule of REQ-polaris-generation-034 version 2.10 (one non-blocking open, regular files only, at most one byte read past a stated bound) to the run-tree files it states: the run record, step and breach logs, credential list, execution choice and close record (033); the verdicts, frozen inventories, review check, prompt, launch-form and delivery records, a waiting session's brief and delivered rounds, and the rendered pages the design packet reads (035); and the supervisor's own state (048). It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-run-tree-read-bounds-v2.18`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The owner of each file, the sweep and its denominator, every in-scope read with its bound, derivation and words, what the code must change, residuals and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective texts (033 at 2.17, 035 and 048 at 2.1) |
| `proposed/polaris-generation/spec.md` | The three complete MODIFIED requirements |
| `GOVERNING-DEPENDENCIES.json` | The union of their warrants (checked by `scripts/check_spec_reconciliation.py` R4), unchanged from the predecessors |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.17 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, while URL source 2.1 and raw-read disclosure 2.17 are effective and the spec still hashes to the reviewed bytes; until then it is pending.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the predecessor texts as effective again.

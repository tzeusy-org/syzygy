# dossier-derived-observed-facts

[Inferred] Candidate version 2.3 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 that lets Syzygy render, in the operator-agent mode, one figure it computes from the pinned tree (the repository root, its top-level directories and their containment, by rule `top-level-unit` version 1), whose elements are Observed derived structural facts carrying their rule, rule version, source path and evidence record (bead syzygy-3efd.27; owner decision `pursuit-2026-11-21-observed-derived`, option A). The currency bound those facts need is declared in [`POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1.json`](../../../.syzygy/governance/policies/POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1.json), installed by the same adoption. No element of a draft is upgraded, and no agent or model labels anything Observed. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-derived-observed-facts-v2.3`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals, the owner decision's boundary |
| `design.md` | The surface chosen, the rule, the record, the currency bound, and how each of the six conditions is met |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.2 text, with displaced lines quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4) |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.2 only once one seven-column ledger row carries its tag, names the installing commit, links the spec and the currency policy at that commit and gives a revert, and both files still hash to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.2's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.2 text as effective again.

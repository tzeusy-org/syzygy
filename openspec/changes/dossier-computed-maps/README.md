# dossier-computed-maps

[Inferred] Candidate version 2.9 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for beads syzygy-3efd.36 and syzygy-3efd.64. Every operator-agent render publishes three computed map pages that need nothing from the author: a directory map (`maps/directories.html`), Observed where the derived record is current, from the `top-level-unit` facts of version 2.3; a unit map (`maps/units.html`), placing the packages and modules the manifest files declare under the top-level directories that hold them, Inferred, from the manifest facts of version 2.7 re-derived at the render; and a CI pipeline map (`maps/ci.html`), the jobs of each GitHub Actions workflow and what each `needs`, Inferred, from the same facts. The unit map draws no arrow between packages: no rule states that a declared dependency names a package of the tree, so those arrows are deferred. Every map states its coverage and what the recognizers could not read, carries computed provenance on every figure and element (RFC7-28) and paginates rather than shrinks. Check's figure-fit advice that no change to a figure's graph members can clear leaves the report the author repairs from and is written once for the run to `run-advice.json`, with its count; the check record keeps every entry. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-computed-maps-v2.9`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | What the structure record holds today, which maps are possible and at what epistemic status, the advice classes, the bytes each change touches, what the code must change, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.8 text, with displaced lines quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.8's plus RFC9-27 and RFC9-44 |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.8 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.8's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.8 text as effective again.

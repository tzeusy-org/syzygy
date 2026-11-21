# dossier-manifest-recognizers

[Inferred] Candidate version 2.7 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 that adds declared manifest facts (bead syzygy-3efd.25, pursuit 2026-11-21 Q2 slice 2). Five versioned recognizers, `npm-package-manifest`, `cargo-manifest`, `python-project-manifest`, `go-module-manifest` and `github-actions-workflow`, each at version 1, read the `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod` and `.github/workflows/*.yml`/`.yaml` files that the bound screening policy admits, and `syzygy dossier check` stores what they declare (packages and modules, workspace member patterns, dependencies with their sections, workflows, triggers, jobs and needs), each fact with its rule, rule version, path and line span and labelled Inferred, with each recognizer's coverage, in the check record's member `manifestFacts`. A file the screen withholds or excludes, or that does not parse, is Unknown for that file and never yields a fact. No page, machine form, published file, brief, draft schema or provider byte changes. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-manifest-recognizers-v2.7`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The decisions the bead left open, the version label, the names fixed for the implementation, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.5 text, with displaced lines quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); unchanged from version 2.5 |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.5 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.5's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.5 text as effective again.

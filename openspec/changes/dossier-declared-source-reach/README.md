# dossier-declared-source-reach

[Inferred] Candidate version 2.6 of the dossier specification line: one MODIFIED REQ-polaris-generation-046 ("Declared local-source admission") and the screening-policy successor it binds, `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` (version `dossier-declared-source/2.0.0`), travelling as one semantic delta (bead syzygy-3efd.24, pursuit 2026-11-21 Q1 slice 2). The successor keeps every predecessor outcome (a path it newly denies aside) and, in a second classification stage, admits, within the owner's decision `pursuit-2026-11-21-source-reach` (option A), Markdown and reStructuredText design, architecture, ADR, RFC, specification and manifesto documents as governance-text, and, with formats narrowed to what a measured sample reaches (`design.md` D7), nested Markdown, MDX and reStructuredText documentation as project-documentation, and YAML, TOML, JSON, Terraform, Dockerfiles, Makefiles and four further extensions as code-content; it adds denied paths and configuration-format detectors. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-declared-source-reach-v2.6`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The decisions the bead left open, the measured baseline, the blast radius, what the code change must do, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes in the specification and the policy, extracted from the bytes |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4) |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.0 only once one seven-column ledger row carries its tag, names the commit carrying the adopted bytes, links the spec and the policy at that commit and gives a revert, and both still hash to the reviewed bytes; until then it is pending and the effective REQ-046 is version 2.0's. The predecessor policy file is not edited.

## Rollback after a veto

Keep the adoption row as history, run the row's recorded revert (the D7 narrowing, the post-review repair, then the install; together they remove the successor policy, this package and the checker wiring), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.0 text as effective again. If the classifier change has landed by then, revert it first: it is what makes runs bind the successor.

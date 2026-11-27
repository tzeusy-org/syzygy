# dossier-derived-base-views

[Inferred] Version 2.34 of the dossier specification line, over figure plan 2.33: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.38. It adds draft schema `polaris-dossier-local-draft-v15`, schema v14 plus `base`, in which a graph or containment view may start from the directory map or the unit map. The view reads that map read-only, as an embedded computed visual (RFC7-28). It may hide elements with a reason, group them under the draft's elements, give them display names, and draw cited arrows to them. Every derived element stays in Syzygy's words, and a chip Syzygy computes prints how many the figure shows of how many, with a link to the full map. Figure advice reads no base view. It also adds brief `polaris-dossier-brief-v23`. Drafts of schema v14 and earlier, the map pages and the provider mode keep their bytes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The choices made and why: the grounding in the two maps, the narrow exception and its doctrine and contract basis, operations, the chip, check and render, bounds, shared claims, the bytes that move, what the code must change, and residuals |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.33 text (figure plan), with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.33's, unchanged |
| `tasks.md` | Delivery |

[Observed] A-267 installed the exact proposed source at `e9eaf3e4601e997996186a57670defc62fd65591`. Its expected v2.34 tag was absent. Later independent review found an output-screening gap. A-332 records the retirement of this version claim and leaves the source and original row as history.

The tagged figure plan 2.33 supplies the current predecessor for REQ-polaris-generation-034. The [proposal](proposal.md) and [semantic delta](SEMANTIC-DELTA.md) retain the intermediate design and reviewed bytes.

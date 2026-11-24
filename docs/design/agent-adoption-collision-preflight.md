# Preflight for concurrent adoption rows and spec versions

[Observed] `syzygy-tqi9` records five interruptions across four November 22 pull requests. The adoption workflow binds a spec version to reviewed text, a Git tag, and a row naming the change and its revert. Authors currently choose a numeric row ID before those bytes reach the merge queue. Two branches can choose the same ID from the same base. [Normative change workflow, adoption step](../../.syzygy/governance/contracts/candidates/policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md)

## Incident replay

[Observed] For each head and base below, compare the canonical ledger against their merge base. A collision is a newly introduced row ID on both sides whose rows differ. The canonical `adoption_table_rows()` parser and an independent ledger row comparison found the claimed ID on five of five reported interruptions. The corrected heads preserve the incumbent rows and clear those conflicts against the respective bases. [Ledger](../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) · [Reconciliation checker](../../scripts/check_spec_reconciliation.py)

| PR and observed event in UTC | Candidate head | Incumbent main | Collision and disposition |
| --- | --- | --- | --- |
| [#888](https://github.com/tzeusy-org/syzygy/pull/888), first queue exit at 06:13:05 | `335618e6` | `1960dbc6` | `A-37` moved to `A-38` at `4d1f6f7e`. |
| [#893](https://github.com/tzeusy-org/syzygy/pull/893), force-push before first enqueue at 07:21:39 | `7573fb5e` | `619457bf` | `A-39` moved to `A-40` at `11b533f7`. The adoption commit's headline still says `A-39`. |
| [#896](https://github.com/tzeusy-org/syzygy/pull/896), first queue exit at 09:13:41 | `39bd5cfc` | `ac71dba4` | `A-43` moved to `A-44` at `3b01e79e`. |
| [#900](https://github.com/tzeusy-org/syzygy/pull/900), first queue exit at 14:09:32 | `c1d5e289` | `f329258a` | Both sides used `A-46` and dossier spec 2.14 for different changes. Recomposition at `e32e413e` installed the index and task routes as 2.15, then `4edff2fc` recorded `A-47`. |
| [#900](https://github.com/tzeusy-org/syzygy/pull/900), second queue exit at 15:14:23 | `4edff2fc` | `c1640080` | `A-47` moved to `A-48` at `f3e7170f`. The spec kept version 2.15. |

[Observed] Use the first-parent `main` committed before each queue exit or force-push above as the incumbent. Each incumbent was already present before the corresponding enqueue or, for #893, before the replacement head. GitHub's timeline gives the queue events and the before/after heads of the two force-pushes. The old #893 object can be fetched by `7573fb5ed5095c71342c5cf6e543167f1d86e20a` if it is absent locally.

[Unknown] The queue timeline exposes event types and timestamps, with no failure reason in the returned event objects. The row collisions are independently visible in the Git objects. The precise internal reason for each dequeue and a fleet-wide failure rate remain unmeasured.

[Observed] The first #900 repair replaced more than version labels. Both specifications modified REQ-polaris-generation-034 based on 2.12. The successor incorporated the intervening 2.14 text, including its 130 scenarios, and wired 148 scenarios after the index and task routes amendment. The conflict merge lists five affected files. [Conflict merge](https://github.com/tzeusy-org/syzygy/commit/31ab1333f00ce9780e5753c29ff77480aa7f5a92) · [Recomposition](https://github.com/tzeusy-org/syzygy/commit/e32e413e1c866587fa0b36ee98690e40a093ba5a)

## Delivery options

| Option | Expected effects and cost |
| --- | --- |
| Refresh against main immediately before enqueue | A read-only comparison would have surfaced the five replayed row collisions before enqueue or early repair. It can also report a specific spec family and version claimed by different packages. Automated renumbering would have to update every affected authority and evidence reference and re-establish review when the change alters composed text. A base movement between the comparison and enqueue can still occur. |
| Stable adoption identity | A collision-resistant identity derived from the delivery would remove dependence on the next integer for new rows. The existing ledger and reconciliation expect `A-N` and some successor checks use its numeric order. Migration needs compatibility for historical IDs, explicit ordering of revocations, and a write layout that avoids repeated edits to the same Markdown hunk. Spec version and predecessor conflicts remain separate. |
| Queue reservation or serialization | One updater can decide versions against the same current base, including the effect of an earlier queued amendment. A queue-time update would create a new head requiring content review where relevant and exact-head checks. Queue-policy and writer changes need their own design and authority. The existing queue already validates the final merge-group tree. |

## Proposed first delivery

[Inferred] A small operator preflight is the first useful delivery. Return collisions early while retaining the published identity model and the required merge-group validation. Use canonical Git objects and the same adoption-row and version bindings the repository already checks. A row ID is a collision only when both sides add that ID on different claims since their common ancestor. A version collision is two different packages claiming the same version within the same spec family. Report overlapping modified requirement IDs when the competing inputs supply them, so the author can locate the actual composition to recheck.

The command should take an exact candidate commit and freshly fetched base commit, resolve their unique common ancestor, and print both object identities with the offending row IDs, spec families, versions, and package paths. An unreadable ledger, ambiguous merge base, malformed binding or unavailable ref gives an explicit unavailable result without an apparently clean report. The command reads Git objects without editing the checkout, tags, PR, queue or authority records. Repository-assigned CI remains responsible for accepting the final tree. [Existing reconciliation bindings](../../scripts/check_spec_reconciliation.py) · [Effective Polaris composition](../../scripts/count_polaris_effective_scenarios.py)

Follow-on acceptance should replay the five historical candidate/base pairs and their five corrected heads, then exercise inherited rows, a fresh disjoint base, a malformed ledger, duplicate versions within one family and the same version across different families. Verify the exit and output contracts against exact object IDs and demonstrate that two independently advancing heads cannot make an earlier report serve as current proof. An operator can omit the advisory check and revert its isolated implementation commit, without modifying any historical row or tag.

[Unknown] Whether earlier detection reduces queue exits in ordinary use requires measuring both preflight reports and eventual queue events. Stable IDs and reservation need measured rework data and a reviewed design after this smaller delivery supplies it.

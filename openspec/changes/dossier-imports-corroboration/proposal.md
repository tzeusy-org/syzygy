# Dossier imports corroboration — version 2.45

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10, built over rough-edge markers 2.44 (design D1; first built as 2.42 over 2.41, then as 2.44 over 2.43).

## Why

- [Observed] syzygy-3efd.86: every `imports` arrow of a dossier is `unknown` (`no-witness-rule`), because rule `relation-witness` (2.19) has no row for `imports`. Since 2.39 the check record stores lexical import facts (`importFacts`), each an import statement of one `package.json` unit's TypeScript file that names another unit.
- [Inferred] Those facts can tell a reader that the code holds a statement matching the arrow. They are lexical and Inferred, so they may corroborate an arrow but never make it Observed. And because the member reads `.ts` files alone, finding no statement never means the unit does not import the other.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- Rule `relation-witness` becomes version 2, with a fifth relation row, `imports`. It reads `edge` import facts of rules `typescript-relative-import` and `typescript-package-import` version 1, from a `package-manifest` unit to a `package-manifest` unit.
- A new witness state, `corroborated`, is given in place of `witnessed` for that row.
  - A corroborated arrow keeps the draft's marking, label and citations, and is never solid or Observed.
  - It carries `data-witness-*` attributes, including `data-witness-state="corroborated"`, and hidden evidence text naming the fact, its form, its rule, the revision and the digest of the `importFacts` member.
  - In a v12 draft's later figures it takes 2.24's "as shown in" item, with the attributes and no evidence text.
  - `machine.json` carries `witness.state` `corroborated`.
- The import rules stay out of the eligibility table. An `imports` arrow becomes Observed only by a later version, under the existing reservation.
- An `imports` arrow that no fact joins is `unknown` (`coverage-partial`), never `challenged`, whatever the coverage. A missing or Unknown member gives `facts-unknown`. No `relation-challenged` finding is ever drawn for `imports`.
- Check reads the member it derives. A render reads the member of the rendered revision's check record and never scans a body.
- 2.39's sentence that nothing reads the member is dated. One carried scenario's `imports` case now reads `endpoint-kind-mismatch`.
- Four scenarios are added, one of them a v12 relationship drawn in two views, and the four Form lines are extended.
- The evidence text names the fact's form and cites the digest of the `importFacts` member, never of the check record, so the 2.24 migration parity holds.

## Non-goals

[Inferred] The following are left out:
- adding the import rules to the eligibility table, or any Observed `imports` arrow;
- a derived `imports` relationship (it still draws `relationship-not-derivable`);
- any schema, brief, finding, check record or provider-mode byte;
- Python or any language but TypeScript.

# TypeScript lexical import assessment

> **Superseded 2026-11-27, never adopted.** Its reviewed semantics are carried into the stored, always-on candidate [`dossier-import-facts`](../dossier-import-facts/design.md) (design D2), which supersedes it. This package binds nothing and is kept as history; read it only for the reviews it records.

**State:** Candidate for independent review. Adoption and implementation are pending.

Dossier authors can currently see declared package dependencies and the authored `imports` relation without evidence that a particular source statement links two units. An explicit check assessment would expose that evidence when admitted TypeScript files and the pinned unit metadata support it. The result helps an author distinguish a lexical match, a same-unit import and an outcome that remains Unknown.

The first producing surface is the immediate operator-agent check report for an installed, accepted schema-v12 draft with the proposed `--lexical-imports` option. The JSON assessment names its coverage and the screened unit pairs and locations. The human report gives the assessment's cohort, coverage and counts without showing omitted identifiers. [Current effective requirement](../dossier-system-model/proposed/polaris-generation/spec.md#requirement-agent-brief-and-mechanically-checked-draft), [prior design](../../../docs/design/dossier-lexical-import-evidence.md).

The first slice uses already admitted whole bodies and safe metadata from the same pinned check. Additional source reads, resolvers, execution, witness authority, stored structure-record fields, Python scanning, draft schema changes and provider-mode changes remain outside this changeset. The original two-language structure-record acceptance remains open in syzygy-3efd.60.

[Inferred] VIS-2 is served by distinct closed and partial denominators and by making unsupported endpoints Unknown. SEC-5 governs every source and output boundary. CC-REV-2 governs the reviewed delta and the implementing behavior as one logical change. The draft allocates no effective spec version, schema version, release impact or adoption. [Patch and pinned predecessor](SEMANTIC-DELTA.md).

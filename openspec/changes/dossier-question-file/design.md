# Design — version 2.27

## Choices

- [Inferred] **Held-out text by reference, not inline.** The question file's held-out part names each key file by repository-relative path, SHA-256 and count, and holds none of its text. So the file, its JSON copy (`docs/polaris-generation/question-file-v1.json`) and the `syzygy` binary that carries it as data (`packages/polaris-generation-core/src/question-file.ts`) can be read by anyone, an authoring session included, while the file's digest still covers every held-out list through its key's digest. The alternative, one file with the held-out text inline, could live neither in the product nor in the authoring kit, and every public consumer would then need a projection step to read it.
- [Inferred] **Data in the product, JSON copy in the kit.** The shape-pack precedent (`shape-packs.ts`): the binary reads no file to compose a brief, and a test holds the JSON copy byte-identical to the module's encoding, which is also the text the digest is taken over.
- [Inferred] **The pilot migrates by reference.** The Redis pilot's graded key (24 questions, 81 required facts) becomes the held-out part's one entry; its depth list and reader tasks are `not-written`, so `bindComparison` refuses it with `held-out-part-incomplete`. The pilot's files and grading script are unchanged.
- [Inferred] **Counts are fixed by the reader.** A frozen depth list holds 10 to 20 items and a frozen task list exactly 5; any other count refuses the file (`depth-count`, `task-count`).
- [Inferred] **The run record names the file; it does not enforce it.** `init` writes the binding; `readRunRecord` accepts its absence (an earlier record: Unknown) and refuses any other shape. A comparison checks equal digests where it joins results, as the corpus pass rule says.
- [Inferred] **The hold-out check is a test, not a runtime guard.** A runtime guard would need the held-out text at the authoring runtime, which is what the rule keeps out. `packages/polaris-dossier/src/question-file-hold-out.test.ts` builds each role's packet from fixtures and searches it with the regression check's predicate (eight-word window, JSON escaping undone), and reports a finding by role, packet and needle identity only.

## What is not yet implemented

- [Unknown] Editor and scout packets are checked as this tree builds them (the brief re-read by the repair loop; the provider profile's questions file; the discovery question strings); a future role with its own packet joins the census when it lands.

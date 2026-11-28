# Resolve the paths and identifiers a repository's documents name against its tree

## Why

[Observed] Pursuit move R24 (`docs/pursuits/2026-11-21b-vision-pursuit.md`, bead syzygy-5dhm.107) asks for Syzygy's thesis, declared against observed with the gap shown honestly, turned on the subject repository: every checkable statement in the project's own documents checked against the tree, with no model judging a row. A plain session reads the documents as true and does not enumerate. This slice (syzygy-5dhm.119) takes the paths and inline-code identifiers.

## Change

[Inferred] Amend REQ-polaris-generation-034 in full. Each operator-agent render derives a `docsAndCode` member: every path and identifier recognizer `doc-reference` version 1 reads in the admitted Markdown documents of the pinned tree (inline code spans and inline link destinations outside fences, code contexts read by the PWB-REQ-006 recognizer), each resolved against that tree. A path `resolves` when the tree lists it and is `document-only` when it does not; an identifier `resolves` when a code file read holds its last name as an identifier token and is `document-only` only when every code file the rule searches was read. Anything the rules cannot decide is Unknown with its reason. No stated value is compared, so no row is `agrees` or `disagrees`: the move binds that existence is never reported as agreement, and the slice title's "agrees" is met by `resolves` (design.md). A reference page, `reference/docs-and-code.html`, renders the counts by class and per document and every listed row with its quote and evidence. A render without the member, and every provider-mode render, is unchanged. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.

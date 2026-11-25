# REQ-polaris-generation-034 terminology brief semantic delta

## Predecessor

[Observed] A-217, REQ-polaris-generation-034 v2.26 at `fb265c698c15e57255b226e45aa22edd2d4bc6de`, `openspec/changes/dossier-worth-knowing/proposed/polaris-generation/spec.md`. SHA-256 `127e4a8f809211fbff47b118212f94e47d204ef6aaad75a0f357906b9a975928`. Its 214 scenario headings include a duplicate historical name, so the replay compares ordered scenario bodies.

## Amended in place

- The generation list adds `polaris-dossier-brief-v20` after v19. The schema pairing explicitly assigns v13 to both.
- The existing v19 author and inventory scenario changes only its time scope from “under this version” to “under version 2.26.” It retains its old output expectations.
- The existing event-response form adds a brief-specific case, observable, independent expectation and falsifier. The other form text and its independence statement keep their predecessor bytes.

## Added

- A paragraph group after the v19 brief rule defines the new version, the exact instruction and placement, and the stable record and surrounding boundaries.
- One new scenario verifies the issued Markdown, recorded schema and version and the actual output file digests. Of the 214 predecessor scenarios, 213 remain byte-identical and the existing v19 scenario retains all but its time scope. The proposed requirement has 215 scenarios.

## Carried and reversed

[Observed] The full requirement keeps the predecessor warrants. Reversing the prologue, two brief/schema list edits, v20 paragraph group, historical scenario scope, new scenario and form suffixes restores the exact A-217 source. The change does not amend REQ-polaris-generation-033 or REQ-polaris-generation-035. A separate adopted version number and record must bind the final reviewed source before operation.

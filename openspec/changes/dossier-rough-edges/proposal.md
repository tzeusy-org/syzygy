# Read the rough edges a repository's maintainers wrote down, per unit

## Why

[Observed] Pursuit move R9 (`docs/pursuits/2026-11-21b-vision-pursuit.md`) found that the why of a project lives partly in what its maintainers flag as unfinished, fragile or going away, and that the newest stored draft cites none of it. TODO, FIXME and HACK markers, deprecation notices and issue references can be read exactly from admitted blobs, without running anything and without contacting any tracker.

## Change

[Inferred] Amend REQ-polaris-generation-034 in full. Each operator-agent render derives a `roughEdges` member: every marker recognizer `rough-edge-marker` version 1 reads in the admitted Python, JavaScript, TypeScript, Go and Java source files of the pinned tree, read in comments (and, for two deprecation forms, in code) and never in a string. Each marker is an Observed row with its line quoted from the blob read, its blob id and its unit. An issue reference is Observed as a reference; what it names is Unknown and nothing is fetched. A reference page, `reference/rough-edges.html`, renders per-unit counts by kind, the deprecation markers under "What is going away", every other listed marker with its quote and evidence, and the files whose markers are Unknown, and says that each count is of the files read, never a total. A render without the member, and every provider-mode render, is unchanged. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.

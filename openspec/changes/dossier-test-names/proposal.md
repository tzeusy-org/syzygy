# Read the test names a repository declares, per unit

## Why

[Observed] Pursuit move R9 (`docs/pursuits/2026-11-21b-vision-pursuit.md`) found no citation to any test file in the newest stored draft, while the pinned tree held 300 paths under `tests/` that the author left out as "not needed". The why of a project lives partly in what its tests pin down, and Syzygy can read test names exactly from admitted blobs, without running anything.

## Change

[Inferred] Amend REQ-polaris-generation-034 in full. Each operator-agent render derives a `testNames` member: the names four versioned lexical recognizers read in the admitted test files of the pinned tree, after blanking every comment and string interior, so a name written in a comment or a string is never one. Each name is Inferred, with its path, line, rule and unit. A reference page, `reference/test-names.html`, renders a per-unit table and every listed name with its evidence, states the files whose names are Unknown, and says that each count is of the files read, never a total. A render without the member, and every provider-mode render, is unchanged. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.

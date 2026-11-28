# Read the limits and defaults a repository's code and configuration declare

## Why

[Observed] Pursuit move R23 (`docs/pursuits/2026-11-21b-vision-pursuit.md`, bead syzygy-5dhm.106) asks for the operating envelope a senior maintainer gives in the first hour (what must never happen, what failure looks like, which default to raise) as exact, model-free harvests whose every row is Observed. This slice (syzygy-5dhm.116) takes the limits and defaults: named constants matching `*_MAX*`, `*_LIMIT*`, `*_THRESHOLD*`, `*_TIMEOUT*` and `DEFAULT_*`, and the entries of documented configuration files, each with its literal value, rendered as a derived "cliffs" reference page. No brief changes; the required topic is the move's third slice (syzygy-5dhm.118).

## Change

[Inferred] Amend REQ-polaris-generation-034 in full. Each operator-agent render derives a `limitsAndDefaults` member: every named limit constant recognizer `limit-default` version 1 reads defined in the admitted Python, JavaScript, TypeScript, Go, Java, C and C++ files of the pinned tree (in code only, never in a comment or a string), and every entry it reads set in the admitted ini-form and yaml-form configuration files, each with its value exactly as written, the value's type, its path, line, quoted line and unit. A value the rule cannot read whole is Unknown, never guessed or evaluated, and a file outside its form's grammar is Unknown, never read past. A reference page, `reference/cliffs.html`, renders the counts per unit and every listed row with its evidence. A render without the member, and every provider-mode render, is unchanged. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.

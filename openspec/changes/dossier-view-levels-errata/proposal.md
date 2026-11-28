# Dossier view levels errata — version 2.55

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10, built over code excerpts 2.54 (design D1).

## Why

- [Observed] The .39 code lane, which implemented the view levels of version 2.50, recorded three departures from the text in its PR, each a defect of the text rather than of the code: a scenario's address between deep dives, two scenarios that put a walk on the overview, and a scenario's view inside a collapsible section. Its review (`docs/reviews/syzygy-3efd-39/R39-CODE-REVIEW-RAW.md`) added notes 3 (a 1048 px clause that cannot be tested) and 4 (a zoom target that fails the inertness check refuses the render, where the text passes it over). The dispositions (`R39-CODE-REVIEW-DISPOSITIONS.md`) left all five for this erratum.
- [Observed] syzygy-3efd.92 found that a top-level directory a denied-path rule names is still named on the directory map, as the text allows, but only a prose clause says so; and the walk advice of syzygy-3efd.35 does not read a step on such a directory whose own path is denied. The bead asks for a scenario and a sentence.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- the zoom target paragraph gains two sentences: no figure renders inside a collapsible section, so that clause passes nothing over; which notices are passed over; and that a target whose figure fails the inertness check refuses the render (design D4, D6);
- the walk advice paragraph gains one sentence: a base element whose own path a denied-path rule names counts as withheld at check, and so does a top-level directory a `deniedDirectoryNames` entry names, decided from the policy and the path alone (design D7);
- three scenarios are corrected: the address between deep dives (D2), the walk on section `s1` instead of the overview in two scenarios (D3), the omitted view in place of one inside a collapsible section (D4), and the 1048 px clause dropped (D5);
- one scenario is added: "A directory a denied-path rule names is still named" (D7).

REQ-034 goes from 348 to 349 scenarios.

## Non-goals

[Inferred] The following are left out:
- choosing zoom targets after drawing, so a target that fails the inertness check could be passed over (design D6 says why);
- the other R39 notes (the order of the `level`/`scope` schema findings, untested branches), which the dispositions settled without a change of text;
- any brief, draft schema or page byte, and any code: each statement is what the code already does, except the walk advice sentence, which states syzygy-3efd.35's code.

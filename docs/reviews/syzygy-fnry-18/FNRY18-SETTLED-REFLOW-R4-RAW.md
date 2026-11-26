# Settled dossier mobile reflow source review, round 4

Subject commit `8d1e38c6991459bb4711aeec9ac1845f77f65ac7`
Tree `d44cf85e3f4522a54709c17208201617a8781723`
Predecessor `6786845aa8d72023fff4ee67562b43529f7361c1`
Reviewed 2026-11-25 UTC

CONFIRM

[Observed] The exact source diff changes two paths. The production change adds wrapping to the local dossier's Clarifications, Executions, Sources and Understanding page regions and to quoted-code path captions in the local dossier theme. The prior Appendix, Discovery and Review selectors remain in the local page map. The page renderer attaches that map and the theme through its local chrome branch.

[Observed] I cloned the exact subject independently. The browser suite passed all three tests and the provider-render golden passed its one test. The expanded reflow test renders 23 synthetic HTML pages, checks document width at 390 and 1440 pixels, and checks targeted long text on eight named routes at 390. It covers a path-only Sources row, its admitted quotation link, the quoted-code caption, agent-reported values and the counted Review packet identities.

[Observed] Replacing only the production stylesheet source with the exact predecessor while retaining the expanded test failed on the five newly covered routes. At 390 pixels, the document widths were 940 for Index, 906 for Sources, 946 for Understanding, 1016 for Executions and 1011 for Clarifications. The assertion also identified eight outside text targets across those pages. The clone was restored to the exact clean subject. Independent test log SHA-256 `493b62db0fd1a4e0dc55c7be17a53da5ee9cbd202547349fe75dbdbb4b7a9eec`. Predecessor control log SHA-256 `9a03a82a2a62b438af2ad3270094e8aa68c81c2f94c886c9d4746b4461c926eb`.

[Observed] The author evidence independently available for inspection includes eight selector omission controls and the same-run comparison. The old design packet retires when rendered HTML changes. The same-run fidelity packet stays bound because its subject remains stable. The caption declaration changes theme bytes in the inline local HTML even on pages without that caption. The author selector and same-run receipt SHA-256 values are `4f5965a661c0ec77646312eb05720c52440a253f351818e514157e2654ec667f` and `43244185704df75219d8d55ef8d9fccff2628869d266caca0bd84629b24c0e50`.

[Unknown] This is an exact source review against the reported and synthetic cases. The prospective adoption archive, whole-tree validation and eventual hosted/protected gates have separate subjects. Historical run layouts were not sampled.

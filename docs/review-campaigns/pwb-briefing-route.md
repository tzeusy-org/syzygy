# PWB machine briefing route

## Patterns

- `DOV52-BRIEFING-SOURCE-R[12]-RAW\.md`

## What was under review

[Observed] `syzygy-dov.5.2` implements the machine briefing under PWB-REQ-020, the A-213 scope decision, and the effective observer registry. The route selects one existing project-shape claim by full ID, takes its values from the complete authenticated machine answer at the same evaluation, and applies the briefing ceiling to the final encoded JSON. The scope decision and the registry act carry the governing bounds. [A-213 scope](../../.syzygy/governance/decisions/PWB-BRIEFING-IMPLEMENTATION-SCOPE-DECISION.md) · [Registry act](../../.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT.md)

## Last verdict of record, and where the findings landed

[Observed] Independent round 1 was `REVISE` (`DOV52-BRIEFING-SOURCE-R1-RAW.md:1`) on `3570fdd57a0ce3c2834eadde8374d7c8ca2f9daa`. F1 found that the route selected only item claims and F2 found that its overflow response included evaluation evidence outside the bounded failure format. Raw SHA-256 `b164318158b230c5225ff2686255dbc662baccc5c63b63f93763fb50ee0f54c1`. [Round 1](../reviews/DOV52-BRIEFING-SOURCE-R1-RAW.md)

[Observed] Independent round 2 was `CONFIRM` (`DOV52-BRIEFING-SOURCE-R2-RAW.md:1`) on `b5e63dd56bbce6b62adf30384051421c1f18ed45`. The full claim lookup covers the seven carrier families, verifies a selected fact's contradiction mirror, refuses ambiguous and stale identities, and retains an admitted observation failure's exact Unknown claim. The ceiling failure keeps the three evaluation-identity fields, declared and observed bytes, population counts, and false readiness. The review independently selected 98 claims from one complete fixture HTTP response. The authored fixture includes an unenumerated heading and exercises all seven families. Raw SHA-256 `f52ee2df7cb6e38aba29ff340c220358e2782f2758d2367ebcc6f8de105aeb11`. [Round 2](../reviews/DOV52-BRIEFING-SOURCE-R2-RAW.md)

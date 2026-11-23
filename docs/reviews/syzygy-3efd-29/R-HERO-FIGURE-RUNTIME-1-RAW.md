# Runtime review of the Polaris dossier overview hero

`REVISE`

[Observed] Reviewed frozen candidate `ad0b0e1614226b12d9eab327a8d238caff038116` against predecessor `ef043234ff9a911afa4e7eac708b4b204b8f386e` and the adopted `polaris-dossier-hero-figure-v2.20` requirement, REQ-polaris-generation-034.

## Blocking finding

[Observed] A v9 draft with `hero` and a challenged graph edge gains an extra finding. The new legacy schema filter in `packages/polaris-dossier/src/check-derive.ts` discards `schema $.hero` before `packages/polaris-dossier/src/check.ts` decides whether schema findings should suppress relation decisions. The late `heroFindings` call then adds `field-version $.hero`. The adopted scenario **Earlier schema keeps its bytes** requires the field-version finding to take the schema finding’s place and every other finding to stay the same.

[Observed] I ran the same independent probe in locked clean installs of the predecessor and candidate with only a scratch test addition. The probe uses the `toDocs()` integration fixture in `packages/polaris-dossier/src/relation-types.test.ts`, a v9 draft with a `contains` edge challenged by the pinned tree, and adds `hero: { figure: 'f1' }`. The predecessor returns only `schema $.hero`. The candidate returns `relation-challenged $.diagrams[0].edges[1]` followed by `field-version $.hero`. The normal check command produces both results.

[Inferred] Retain the original schema failure through the relation decision gate, then replace its reported finding in place for the historical draft. Pin the differential and the ordering with another schema fault. Keep the current v10 hero findings in their specified late order.

## Verification

[Observed] On the exact candidate, 530 integration tests passed across check, render, fidelity review and brief. The 51 draft-schema unit tests passed. The provider-render byte golden passed. The existing tests exercise the v10 named graph, omission and fidelity entry, withheld layer, undrawn notice and open-question placement. The existing legacy fixture has no challenged edge and therefore misses the changed finding population.

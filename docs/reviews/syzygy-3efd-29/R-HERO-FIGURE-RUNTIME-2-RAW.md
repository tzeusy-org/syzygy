# Runtime review of the Polaris dossier overview hero, round 2

`CONFIRM`

[Observed] I reviewed candidate `c41c166f9905b8a377c110eaefe7550be26d01c0` against the round-one subject `ad0b0e1614226b12d9eab327a8d238caff038116`. The delta changes the check finalization, the render rederivation using it, and one relation-types regression. The adopted A-54 specification is unchanged.

[Observed] A legacy draft now retains the original `schema $.hero` finding through the edge-decision gate. The finalizer replaces that finding in its original position only after edge decisions, so the v2.19 suppression still applies. A v10 draft still appends the specific hero findings after the prior rules. Render rederivation applies the same finalizer before reporting a refusal.

[Observed] The regression compares the complete finding population for the previously failing v9 draft, then checks the field-version finding's position alongside an unrelated citation finding and an unrelated schema finding. The exact candidate passed 452 integration tests across relation types, check, and render in a separate locked checkout.

[Inferred] The repaired head resolves the round-one blocker and meets the adopted runtime requirement in the reviewed scope.

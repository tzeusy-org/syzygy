PASS

[Observed] Both bounded, descriptor-anchored reads finish and close before validation proceeds. The deadline, post-read authority check, and independent pre-write archive checks remain in place. `packages/polaris-dossier/src/url-machine-store.ts:310–330, 378–399, 516–520, 637–675`

[Observed] The failure control holds a real state descriptor through identity rejection. It samples settlement after one event-loop turn while the descriptor is still held, then verifies refusal and physical closure. The third-close archive substitution control verifies refusal before reserve and byte-identical protected state. `packages/polaris-dossier/src/url-machine-store.test.ts:464–497, 642–674`

[Observed] The frozen diff SHA-256 matched and `git diff --check` passed. This was a source-only review.

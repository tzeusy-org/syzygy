PASS

[Observed] The revised test records real protected-root `lstat` completion, real canonical-root `realpath` completion, and entry to the real lock `mkdir`. It requires two distinct fresh authority checks between the last two events. An omitted anchor postcheck or one moved ahead of the final `realpath` fails the assertion. `packages/polaris-dossier/src/url-machine-store.test.ts:29–41, 210–231`

[Observed] The production file is byte-identical to the previously reviewed candidate. The three wrapped anchor reads retain physical identity validation, deadlines, and the enclosing authority checks. Unwrapped lease reads, the protected-state-to-client boundary, staged publication, and allocation retain their existing checks. `packages/polaris-dossier/src/url-machine-store.ts:287–306, 410–510, 532–554, 602–610`

Source review of `3932c2150a50f22a2543740f9b2b891facb29d59`. `git diff --check` passed.

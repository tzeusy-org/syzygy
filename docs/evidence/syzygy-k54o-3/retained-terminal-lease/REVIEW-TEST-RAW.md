PASS

[Observed] Reviewed `23da3d5e4b512b0ad11fd8f6ceb350eb514c46da..74b6979b87366beabcb306e735f5e091bb2c0d78`. The test-only diff SHA-256 is `182ab5a23a0a099a1090bc860636d1c52e3b15e26e70c284da97f6f4be219930`. The sole changed file is `packages/polaris-dossier/src/url-run-machine-close.test.ts`. The production bytes match the previously reviewed revision.

[Observed] Each case requests one prepared Author role through the genuine machine constructor and protected store. The success case requires exactly two additional slots and preserves the retained entries. Each refusal case requires constructor rejection and byte-for-byte equality of the protected state while requesting the same eligible allocations. Both controls still detect calls to the former split clock and authority methods. See `packages/polaris-dossier/src/url-run-machine-close.test.ts` lines 244–286 and `packages/polaris-dossier/src/url-run-machine.ts` lines 215–237.

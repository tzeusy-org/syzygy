# Independent F3 D11 render restart review

PASS

## Binding

- [Observed] Base `fff29511cf6851407eb4c98bcadd71194a8f606f`. Subject `d82c0b91689ce729bfb2aba47617d5eca304246e`. SHA-256 of `git diff --binary fff29511cf6851407eb4c98bcadd71194a8f606f..d82c0b91689ce729bfb2aba47617d5eca304246e -- packages/polaris-dossier` is `ef930d016edb7449fb39cb2917d8fdd106838b32783cd48acd2d84f2f40a3975`.
- [Observed] Scope is the final render restart correction and native recovery count in `render.ts`, `render.test.ts`, and `url-run-composed.test.ts`. A-51 adopts version 2.17 at `d4597b04c20cdd12d6c46619e93c82fe9f631a9f`, tagged `polaris-dossier-raw-read-disclosure-v2.17`. REQ-polaris-generation-033 states “The refusal SHALL name the disclosure requirement and explain how to start a new run” and requires preserving retained files when the companion is missing, malformed or mismatched.

## Disposition

- [Observed] For a checked producer refusal or throw, `render.ts:425–452` settles timer and abort handling, then revalidates the companion before selecting the generic admission refusal. For a checked producer acceptance, `render.ts:455–457` checks the same companion after the awaited renderer validation. `render.ts:210–216` verifies identity and provider through the companion decoder, compares the handoff used for the render, and returns the fixed REQ-polaris-generation-033 restart reason with stage `disclosure`. The typed refusal disables primary refusal logging and returns before site storage or stored-site comparison at `render.ts:469–489`. The existing protected replay consumers continue to preserve the typed refusal in `polaris.ts:1244–1247,1288,1300–1302`.
- [Observed] `render.test.ts:474–504` exercises real stored-site reproduction with three producer outcomes, changing the companion from reached to unknown and checking the exact restart reason plus retained site and step bytes in each case. `render.test.ts:506–523` withdraws the companion during primary producer refusal and checks the same reason, absence of a site directory and byte-identical step log. The prior raw review reproduced the declining-producer failure against the base.
- [Observed] The admission window remains bounded by the URL product/design deadline and the monotonic ceiling at `render.ts:419–446`. With an unchanged companion, timeout and ordinary admission refusal still produce stage `render`. The early missing-companion refusal still precedes dependent source reads and producer entry at `render.ts:192–211`. The renderer, product lease and protected continuation gates remain in front of storage.
- [Observed] The native recovery spy at `url-run-composed.test.ts:650–655` counts an actual reproduction only when its discriminated result has `ok: true`. The successful count is sampled at Design delivery at lines 709–714 and asserted at lines 876 and 1022. This assertion correction was source-verified.

## Verification

- [Observed] The scoped `git diff --check` emitted no diagnostics. `sha256sum` and `openssl dgst -sha256` agreed on the scoped binary diff digest.
- [Observed] A clean detached clone at the exact subject ran `node_modules/.bin/vitest run --project integration packages/polaris-dossier/src/render.test.ts -t 'stored site reproduction is|disclosure withdrawal during primary|remaining shared deadline|remaining monotonic boundary|awaits actual producer admission|authenticated URL render with missing disclosure'`. Eight passed and 130 were skipped in that file. The selected cases covered the three replay outcomes, primary withdrawal, the two deadline checks, ordinary refusal, and the early missing-companion gate. Verification used local test fixtures. The native composed test was reviewed by inspection.

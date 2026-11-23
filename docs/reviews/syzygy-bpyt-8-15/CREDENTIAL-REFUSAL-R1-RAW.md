# Independent credential refusal review R1

Verdict: REVISE

Reviewed subject: syzygy-bpyt.8.15 at b854cd2a72aac93d5ae50453fb620542c31e084e, against 15a26ccc61ceb1804928ecb5dbef5d030d2529ae. The source diff has nine paths in packages/polaris-dossier. This report binds that commit.

## F1. A refused credential list still drops configured attempts and refusal bases

[Observed] credential-probe.ts:145–150 takes a list-source refusal before opening the trusted configured paths. It selects the declaration mismatch where both declaration and list source refuse, losing the list refusal. At lines 153–164 the probe may observe an indeterminate attempt beside a declaration refusal. The refusal then carries only the declaration, except that positive readability has a count-only detail. These outcomes all remain fail-closed.

[Observed] The active tracker design and R-GP-IMPL-ADAPTER-CREDENTIALS-1-RAW.md lines 135 and 145–146 require the configured set when the list cannot supply paths and a reason carrying both the configuration and read failure. The effective REQ-polaris-generation-033 retained-brief paragraph requires current open attempts, refusal for readability and a disclosed breach with stop instructions. Under VIS-2, a refused list or indeterminate attempt cannot support an Observed claim of readability. The exact earlier harness shows that the pre-PR499 implementation also skipped configured paths on a list refusal. Its pass/refuse decisions are the compatibility baseline. The specific configured-only recovery required by the packet therefore needs its own counted attempt delta.

[Observed] A clean independent clone ran 32 credential unit cases and 452 focused integration cases across check, render and close. All passed. Three additional synthetic controls isolated the unobserved branches. Each collected and failed at its assertion: missing configured attempt on a refused source, missing list basis when both configuration inputs refuse, and missing indeterminate read basis alongside a declaration refusal. The controls used injected opens and synthetic paths. The clone was restored clean.

Required correction: attempt the configured paths once if the list is unusable, preserve every relevant refusal basis, keep a distinct count-only Observed finding when a positive open occurred, and retain Unknown for configuration and indeterminate facts. Keep the permitting flag disabled. Record the exact expected differential and use a fixture with a non-empty configured set for the list refusal. Keep positive breach wording accurate when the list was unusable.

## Verified on this subject

[Observed] The operating-system probe opens read-only/nonblocking and checks descriptor type without reading credential bytes. The diff does not modify the permitting flag, the bounded list reader, sandbox or network operations. The retained-brief refusal still declares that observed code must stop. For a usable list, a formerly skipped declaration failure now probes the deduplicated configured and listed paths. The review found a single typed-finding path from the probe into check output, the record append, and render disclosure. The end-to-end render fixture distinguishes an Unknown declaration failure from a simultaneous count-only Observed positive in both human and machine output and verifies both in the local breach log. Legacy untyped injected failure becomes undetermined. Close retains its closed-with-finding behavior and sees the same recorded findings. No additional blocking finding was identified in the scoped callers.


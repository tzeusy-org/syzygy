# Independent credential refusal review R2

Verdict: CONFIRM

Reviewed subject: syzygy-bpyt.8.15 at 448ca31d8d8b995fd6f717b6d9dcac27d2ff2536, against 15a26ccc61ceb1804928ecb5dbef5d030d2529ae. Changed source since R1 is limited to credential-probe.ts and its direct unit and render tests. R1 remains the review of b854cd2a72aac93d5ae50453fb620542c31e084e.

[Observed] F1 is corrected. The probe reads the declared list once. A usable list supplies its paths together with the configured set in their deduplicated order. A refused list supplies no paths, leaving just the configured set for the same read-only, nonblocking opens and type checks. Declaration and list refusals both survive when present. Confirmed readable and indeterminate attempts also retain count-only reasons alongside a configuration refusal. The configuration outcome remains Unknown, and a confirmed positive adds its own count-only Observed finding and stop instruction through check, render, and the retained breach log. The count describes adapter-credential files opened even if the list was unusable. The permission path, bounded list reader, and execution mode are unchanged. Legacy untyped injected failures remain undetermined. No observed project code was run.

[Observed] Independent frozen-source testing in an isolated clean clone collected all three R1 controls against both heads. Each failed its intended assertion on b854cd2a. All three passed on 448ca31d, with 33 existing and extended credential unit cases, for 36 total. The third control uses the corrected literal indeterminate count. Separately, 452 existing focused integration tests passed across check, close and render. The fixture was removed and the checkout verified clean.

[Observed] I reran the exact archived 154-case harness on 448ca31d using the same synthetic list and file fixtures. An independent comparison by case key matched all 154 author rerun rows. All 154 current-base pass/refuse decisions are equal. The partition is 84 identical open sequences, 42 restored usable-list sequences under declaration refusal, and 28 newly performed configured-only opens where the list is unusable. Those 28 cover 14 unset and 14 malformed cases, with 14 absent and 14 readable outcomes, and all 28 still refuse. The retained result distinguishes the intentional attempt adjustment from compatible pass/refuse behavior.

[Observed] The exact repaired source satisfies the R1 source findings and the reviewed N1/N2 behavior. The new implementation adoption, retained final evidence, current-main composition and protected receipt still bind their own published exact head.


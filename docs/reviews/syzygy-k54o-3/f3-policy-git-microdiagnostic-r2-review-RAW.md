# Independent source-only review — policy Git microdiagnostic R2

Verdict: PASS (bounded R1-to-R2 operator renewal and unchanged instrumentation, source-only). Execution remains gated on final subject renewal and review.

Prepared source subject: 0f629938f7fafa14746d28b2144664415dc78acb; final executable subject is pending.
Packet: /home/orca/.tmp/f3-native-admission-fixes/policy-git-microdiagnostic-0f629-R2/.
Manifest SHA-256: 21932183834d2606fd769047e6fe5f2c0fdec02b20592d33b31c4d9713b898c5.
Patch SHA-256: aba05490b3aabfb0411077dc275cf447ffdbbe9bd7835ad37c8a709ae6b625d8.
Operator SHA-256: 390eba09c06b8eb5423f4db22dd9cd1bf3c23a2ee120249a5e4292839c3b8259.
Focus-binding SHA-256: d59c609bc8ac51abe4781281f52d11dd8b713067b670a6e3df46310567ce8e82.
Predecessor raw: /home/orca/.tmp/f3-policy-git-microdiagnostic-r1-review-RAW.md.

[Observed] Read complete R2 README, manifest, operator, static proof, focus binding and the full operator diff against R1. Compared all eight original files, all five overlay files and diagnostic.patch by bytes: these 14 files are identical across R1/R2. Separate sha256sum checks verified eight source and five overlay digests; hashlib and sizes verified all five R2 packet bindings in static-proof.json. The operator parses with Python ast.parse; no execution/import of the operator occurred. No repository module was imported, built, compiled or tested; no primary file was edited.

[Observed] The complete operator diff adds re, constructs the anchored escaped FOCUS_FULL_NAME pattern, verifies it against the manifest, supplies that one pattern argument, removes the three worker/file-parallelism overrides, and validates/stores the reported fullName alongside title. Remaining clone/install commands, timeouts, primary clean/head/hash checks, source overlay binding, process handling, diagnostic extraction and restoration are unchanged. The manifest's changed/new fields are status, revision, focusFullName, focusPattern, focusBindingSha256 and predecessorManifestSha256; its source/overlay/patch bindings remain identical. Documentation and static proof describe this bounded correction.

[Observed] Independently read and hashed the historical evidence at /home/orca/.tmp/f3-native-admission-fixes/native-image-byte-reference-owning-9de7-execution-2/owning.json. SHA-256 is 74e10b69acd0a82b49a7f2567f053435e1ac9f4bf84e57ce746ebd778aaa6dc2. The native test file has 17 assertion results; exactly one fullName equals the selected literal and exactly one matches the manifest pattern. Its retained assertion equals focus-binding.json, with ancestorTitles [] and title == fullName. Also verified the retained installed-runner source SHA-256 5e0b0ece2242e3475a0312a375fac6e47287602792d7f4999d2d733ecda2d69a and read its top-level-suite deletion and getTaskFullName/name-pattern paths. Historical durations are not new diagnostic measurements.

[Inferred] PASS: the exact escaped pattern is compatible with the runner's legacy ECMAScript name-pattern matching for this literal, and the report checks reject a wrong selected result or denominator. R1's original literal anchor was already valid; R2 strengthens explicit binding rather than repairing a nonexistent zero-test selection. Removing the three overrides restores use of the repository worker configuration. The unchanged instrumentation retains the source-only PASS and the metric interpretation in the R1 raw review. No additional material finding in this bounded R2 delta.

[Inferred] Process-lifetime proof remains limited to each spawned session for the selected no-detach case; it is not a universal detached-descendant claim. The operator fails on a remaining session population and retains logs/artifacts. This limit is disclosed in the README.

[Observed] The current prepared manifest still names 0f629… and its status/README explicitly require the root's final stable subject and reviewed-change receipt before execution. The primary clean/head/hash gate is retained. The current four unrelated primary edits must not be reset or bypassed. Root must review the exact renewed manifest and actual final subject/source-byte binding separately. This source-only verdict does not approve any unknown future subject, renewed manifest bytes, or execution.

[Unknown] Runtime success, compilation, timings, process outcomes and native acceptance remain unknown. No measurement result is supplied or inferred by this review.

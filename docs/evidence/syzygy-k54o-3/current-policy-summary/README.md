# Fixed policy-current diagnostic proof

[Observed] This proof binds actual source f8225eff440d618349464d31f83f0231eed10f71, tree cfb4cf64f254fa7737fade99b0a92216a1a1db40, source SHA256 33ef69ecc93cea5b68699c960e954582d3c3dea924a74de5a60df882e5f657be, and focused operator SHA256 c011a5b6fde2655d199499593fd2901aab8faff6a4819476b7d89b0511195abf. The final focused terminal and matching root reconciliation both accept this scoped diagnostic check. Source R2/R3/R4, actual commits, raw reviews, operator revisions, failed attempts and final raw outputs are retained through SOURCEINDEX.json. Equal byte payloads are stored once under objects/; original logical names and exact source paths/digests remain in the index. Raw reviews retain -RAW.md filenames. Unexecuted source R1 is retained only through its manifest and raw review/reference context.

[Observed] Final scoped outcomes (each Vitest invocation has one selected assertion and six selection skips out of seven):

- typecheck: exit 0, 21.218049 seconds
- baseline: exit 0, 4.579366 seconds
- outside-scope-clock: exit 1, 4.325007 seconds
- replace-original-promise: exit 1, 4.827435 seconds
- drop-rejection-classification: exit 1, 4.174255 seconds
- lost-prior-observer-after-pause: exit 1, 4.177085 seconds

[Observed] Historical failures remain failures: actual52fb typecheck reported six TS2345 errors before baseline/mutations; actual4b6d typecheck/control and three mutants reached their intended outcomes, while the fourth descriptor-only-removal mutant survived. Both failed terminals and their complete raw populations/root reconciliations are included. Later success does not rewrite them.

[Observed] Correction to the retained source lifecycle rationale: the earlier helper comment and R1/R2 rejection rationale generalized nested data-property spy behavior to the actual Vitest SSR accessor export. tinyspy preserves the prior getter for that accessor, so mockRestore already retains its observer; explicit descriptor reinstall is redundant there. The fourth survived result supports that distinction. Executable helper behavior remained correct; R4 corrects only the comment. The revised fourth mutant removes both restoration operations and is bound to its actual final outcome above. Frozen historical verdict words remain unchanged; their incorrect rationale is superseded by this correction.

[Observed] Specific erratum to the frozen operator R3 README: its claim that the retained f4bb report has an empty file message is false. Actual file.message is “owned resumed fixture cleanup failed; recovery root retained”, with two selected assertion strings. That raw report demonstrates the two-message test-error channel, not an empty-file-message mixed example. Frozen reporter-evidence.json already records messageIsEmpty=false. Installed runner/reporter source separately establishes the two error channels. This paragraph corrects the exact historical assertion without editing the frozen packet.

[Observed] This evidence is a scoped observer/typecheck/mutation proof only. It contains no genuine-case rerun, current F3 acceptance, build/provider result, currentness/authority admission, CPU sample or performance saving. Original product limits and authority calls remain unchanged. [Unknown] F3 completion, genuine recovery acceptance and full-gate status require their own actual evidence. One eventual agent-adoption row may report the diagnostic, type repair and corrected comment; this assembler performs no adoption or primary write.

[Observed] SOURCEINDEX binds every input by digest and logical name; MEMBER-SHA256SUMS binds physical archive members. The archive is generated twice identically with normalized ordinary0644 uid/gid/mtime0 members and gzip mtime0, then every member is read back and independently hashed. External source files are hashed again before acceptance. Exact assembly code/definition and the final verification receipt are retained. A deterministic archive is evidence preservation, not an additional product result.

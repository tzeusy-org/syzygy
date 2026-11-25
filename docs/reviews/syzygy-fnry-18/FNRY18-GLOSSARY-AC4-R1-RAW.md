# REVISE

## Subject

[Observed] Frozen AC4 source 68e154753874ecd8e9c56c4e7e1acf44b470309f, tree 9f324cea245982d3326e3497822a64dd53c59046, compared with protected cb5d7fcec5876592dfcf393839cab0c5ea05f14d. The range changes only packages/polaris-dossier/src/brief.ts and packages/polaris-dossier/src/brief.test.ts. Scope is syzygy-fnry.18 AC4, its AC6 provider preservation, and the adopted glossary usability under A-303. VIS-4, CC-REV-2 and CC-SPEC-10 govern a changed issued brief.

## Findings

1. [Observed] A-217 is still the authority for the exact issued brief. The installed dossier-worth-knowing REQ-034 matches tagged source fb265c698c15e57255b226e45aa22edd2d4bc6de. Its issued-brief scenario requires polaris-dossier-brief-v19 and local draft schema v13, with exact v16 parity except the listed earlier changes. Candidate brief.ts emits v20 and inserts an additional terminology paragraph in that same schema. A-304's effective v2.27 REQ-033 matches 5a40a2d948af2d9d722f708268b5761b3d1443a8. It governs the question-file binding and older-record Unknown path and supplies no corresponding REQ-034 replacement. The reviewed coverage operand also leaves REQ-034 unchanged. [Inferred] The source needs a reviewed REQ-034 successor and its adoption before a different normal brief can be accepted. This copy change preserves the REQ-033 question-file and author scope observed in the two-path range.

2. [Observed] The instruction makes reader spelling, with spaces changed to underscores, unconditional for every terminology ID. The unchanged schema uses the common closed handle for these items in packages/polaris-dossier/src/draft-schema.ts. The grammar in packages/polaris-generation-core/src/source-model.ts requires an ASCII alphanumeric first character, has a restricted subsequent alphabet and limits length to 100. The independent actual schema-v13 replay accepts append-only_file, AOF and the legal fallback controls cpp, net and input-output. It rejects C++, .NET, I/O, café and a 101-character name at the terminology item. The schema probe changes only the ID within each comparison. [Inferred] Use reader spelling when it yields a valid unique handle. For otherwise unrepresentable spellings, guide the author to a valid unique handle and carry the exact term in its existing statement. Treat u- as a synthetic prefix to avoid adding, preserving genuine spelling where permitted. Pair a literal fallback example with a bounded schema-valid control. The existing renderer derives the glossary label from the handle, so fallback preserves literal wording in the statement.

## Independent verification

- [Observed] The runtime delta is the version marker, its source comment and one brief paragraph. Its placement and exact one-item cue match AC4 for representable terms. Normal isolated issuance passed 42/42 focused integration tests. The complete brief oracle retained the other authority, thesis, budget, revision, provenance, schema and question guidance. Report and brief record both use the same new version. Independent provider golden passed 1/1. The existing renderer and schema paths are outside this diff. [Unknown] This narrow review did not re-run mobile rendering or the full battery.
- [Observed] Separate single-fragment removals of the new instruction and the new version each failed their one selected normal-issuance assertion. All controlled files were restored to exact bytes.
- [Observed] Private coverage operand f6ff3b9e0ff3ceeffd066c6fef136014556af824 and this subject produce the same clean d3add16cfe63c7a4482600b707e4de7e2d9135b4 in both orders, with 37 changed names and both sets of exclusive blobs preserved. Foreign draft #839 at 9c878b13f5ea7b819b4817517c675810d4b0f23c touches both brief files. Git composition and an independent merge-file replay reproduce each scoped result byte for byte in both orders. Both whole foreign comparisons retain the same pre-existing conflicts in .syzygy/governance/decisions/AGENT-ADOPTIONS.md and scripts/check_spec_reconciliation.py, also present against the literal protected base. This is a source compatibility result for the sampled heads.

## Evidence

- focused.json SHA-256 c04bb6c797237b54261a01fc915f9739d57a315af9ccbf437e4b0044d3d6ad1d
- provider.json SHA-256 b4b9398b675e60c1c0604f779c159a06141deb85d0e0c2bdd98206db3370a56b
- omitted-instruction.json SHA-256 139e8211229d8cf2c8fa4d228c740209abf711e2a083a26763a961c71e4f5759
- stale-version.json SHA-256 d4dd70609bf5f9d6a5a0f7146f4d7981cf28e5150d7864ee8b9d53ee0968c8f3
- schema-handle-probe.json SHA-256 61f73bfdf31dd51b05012b13d7acc72faf21344cab60125253675c4360722964
- ac4-review-proof.json SHA-256 d4050316920231d049ab9ed24c4cdeed3a793f1b59f33750a9c1958dbb9ca406

REVISE

# Independent N6 focused repair review

[Observed] Exact successor `5018f4bc72e0765cbf721a4f6b41d5749f5080d4`, tree `2a3bb2b0a371adac65c8940a461a1771487892b7`, direct R1 `335341a82019a8fd922d19c20c63d85a101ae30c`. Three exact changed paths are the generator, manifest and generated register. No typed behavior or tests changed from the R1 replay. The clean candidate verified 96 entries, 20 focused selftests and 213 integrated governance fixtures.

[Observed] F1 fixed. `scripts/build_boundary_register.py:214–217` binds the exact 24 sampled context identities independent of editing a manifest row. I computed the sorted-key digest independently. The unchanged R1 reclassification of a VIS-5 prohibition fails during regeneration with the stated context classification error.

[Observed] F2 fixed. `scripts/build_boundary_register.py:35–54,146–170,332–340` reads six exact authority subjects and adds three authority-act pins. Separate mutations of the POC-REQ-050 and PWB-REQ-020 headings reject with their exact missing IDs. A changed body retaining POC-REQ-050 rejects as scoped source drift. The unmutated register and all 96 entries still verify.

[Observed] N1 fixed. `scripts/build_boundary_register.py:16,324–328` rejects a counterfeited zero commit even on regeneration and its fixed reference matches the exact protected predecessor of the independently reviewed source.

[Observed] F3 remains. The additional repinned POST fixture is detected. The same supported HEAD declaration from R1 remains missing and proceeds with a regenerated register of 96 entries. `scripts/build_boundary_register.py:45–46` still restricts method extraction to GET and POST. No other change is required by this focused round. Independent replay SHA-256 `10665254b0de20b1ff0f885bb9d86c6729467e7cc52e0e76489ad569d15509f8`.

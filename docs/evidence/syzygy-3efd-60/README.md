# Lexical import facts evidence (syzygy-3efd.60)

Not authority. Scripts that build and measure the candidate REQ-polaris-generation-034 text of `openspec/changes/dossier-import-facts/`.

| File | What it is |
|---|---|
| `import_facts_build_spec.py` | `import_facts_build_spec.py <worktree> <out>` rebuilds `openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md` from version 2.33's text (the figure plan) by anchored edits, as version 2.NN, each asserted to occur once (byte for byte). |
| `import_facts_delta.py` | `import_facts_delta.py <worktree>` writes the package's `SEMANTIC-DELTA.md` from the predecessor's and the new text's bytes, and asserts that no predecessor line is removed and that every predecessor scenario block is carried byte for byte. |

# Lexical import facts evidence (syzygy-3efd.60)

Not authority. Scripts that build and measure the candidate REQ-polaris-generation-034 text of `openspec/changes/dossier-import-facts/`.

| File | What it is |
|---|---|
| `import_facts_build_spec.py` | `import_facts_build_spec.py <worktree> <out>` rebuilds `openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md` from version 2.38's text (the migration parity) by anchored edits, as version 2.39 (drafted over 2.33 as 2.NN), each asserted to occur once (byte for byte). |
| `import_facts_rebuild_diff.py` | `import_facts_rebuild_diff.py <worktree>` compares the line edits of the version 2.39 text against migration parity 2.38 with the reviewed 2.NN edits against figure plan 2.33 (read at `3497af414`), file head aside, relabelled; exits non-zero unless equal. |
| `import_facts_delta.py` | `import_facts_delta.py <worktree>` writes the package's `SEMANTIC-DELTA.md` from the predecessor's and the new text's bytes, and asserts that no predecessor line is removed and that every predecessor scenario block is carried byte for byte. |

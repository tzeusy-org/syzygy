# Figure plan evidence (syzygy-3efd.40)

Not authority. Scripts that build and measure the candidate REQ-polaris-generation-034 text of `openspec/changes/dossier-figure-plan/`.

| File | What it is |
|---|---|
| `figure_plan_build_spec.py` | `figure_plan_build_spec.py <worktree> <out>` rebuilds `openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md` from version 2.22's text by anchored edits, each asserted to occur once (byte for byte). |
| `figure_plan_delta.py` | `figure_plan_delta.py <worktree>` writes the package's `SEMANTIC-DELTA.md` from the predecessor's and the new text's bytes. |
| `figure_plan_survival.py` | `figure_plan_survival.py <predecessor> <new>` prints the line and scenario survival counts and each changed line's word diff. |

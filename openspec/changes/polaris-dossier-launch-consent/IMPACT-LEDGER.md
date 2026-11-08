# Impact ledger — Polaris on any repository, with consent asked at launch

> **Candidate — binds nothing.** Review material, not an authority or an
> adopted applicability judgment. Revised after round 1; the sweeps are
> unchanged (the round-1 reviewer re-ran A and B and matched both).

## Method

[Observed] Sweeps ran by script on 2026-11-08 over
`git ls-tree -r -z --name-only` at `origin/main`
`fd08ea62f8b55fb60d7c79628688bc014b40875b`, excluding this change's directory
and its direction record (both absent at that commit). Denominator (rule 9):
9,208 tracked paths, of which 40 do not decode as UTF-8 and were skipped, so
9,168 were searched. Python `re`, never `grep` (verification rule 1). Row
classes by first matching rule: a path ending `-RAW.md` or containing
`/reviews/` is a raw; then `docs/evidence/`; then
`.syzygy/governance/decisions/`; then the rest of `.syzygy/`; then
`openspec/`; then `apps/`, `packages/` and `scripts/` (code); then the rest.

| Sweep | Regex (Python) | Files | Raw | Evidence | Decisions | `.syzygy` other | OpenSpec | Code | Other |
|---|---|---|---|---|---|---|---|---|---|
| A: REQ-033 | `REQ-polaris-generation-033` | 188 | 21 | 67 | 4 | 45 | 9 | 41 | 1 |
| B: the displaced words | `own state directory for the run` | 8 | 1 | 0 | 0 | 5 | 1 | 1 | 0 |
| C: observation consent | `observation consent`, `re.I` | 286 | 46 | 60 | 32 | 66 | 20 | 52 | 10 |
| D: per-project statement | `per-project statement`, `re.I` | 113 | 11 | 49 | 2 | 18 | 5 | 26 | 2 |
| E: the new identifiers | `REQ-polaris-generation-04[67]` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| F: the init command | `syzygy dossier init` | 21 | 3 | 2 | 2 | 4 | 3 | 4 | 3 |
| G: the revision option | `--revision\b` | 84 | 3 | 61 | 0 | 3 | 1 | 10 | 6 |

Second method (rule 2), for E only: `git grep -l -E
"REQ-polaris-generation-04[67]" origin/main` returns no file, equal to E. A to
D, F and G carry no second method and are reported as sweeps, not proofs of
completeness. A continuation form ("REQ-033/034") is not covered by A
[Unknown]; it changes no disposition below, because nothing citing REQ-033 is
edited.

## Disposition by class

- **Raw reviews and evidence (A–D, F, G).** Historical; never edited
  (CC-REV-6). No disposition.
- **Decisions (A, C, D, F).** Acts and directions in force; none is edited.
  The new direction record is added beside them.
- **`.syzygy` other (A–D, F, G).** Candidate packages, templates and the
  installed registry entry; bound or reviewed bytes are not edited. The two
  sweep-B hits in `declarations/adapter-registry/` and its candidate copy
  restate REQ-033's state-directory rule for the source-acquisition entry
  [Observed: sweep B's file list]; that entry governs the acquisition adapter,
  not the launch records, and is unaffected [Inferred].
- **OpenSpec (A–D, F, G).** The in-force local-agent-mode change carries
  REQ-033's bytes (sweep B's one OpenSpec hit); it is read and displaced, never
  edited. The arbitrary-public-repo and one-command-run candidates are not
  edited.
- **Code (A–D, F, G).** `packages/polaris-dossier/` and the consent package
  implement REQ-033's gates; they change only after sign-off (design §7).
  Sweep B's code hit, `packages/polaris-dossier/src/state-directory.test.ts`,
  pins the state-directory rule and will need a case for the launch-record
  exception.
- **The source-acquisition registry entry** (`.syzygy` other). Beyond sweep
  B's state-directory text, the entry says "to stay within the observation
  consent's stated fetch form the operator fetches the one consented commit
  alone" [Observed], presuming consent precedes the clone. Under launch
  consent the clone precedes it; `design.md` §5 gives the reading under which
  the entry is unaffected [Inferred], and the remedy if that reading fails (a
  successor version of the entry, not an edit).
- **Per-repository code registries** (Code). `STATEMENT_FORMS` and
  `DRAWER_FORMS` in `packages/polaris-dossier/src/gate-sources.ts` register
  forms per repository [Observed]. They are not edited; after sign-off one
  generic launch consent form is added beside them (design §7, slice 2), and
  REQ-046 forbids per-repository registration for launch records.
- **The screening policy's owner placements** (`.syzygy` other). One
  placement names `repository:redis-redis` at one commit [Observed]. Not
  edited; packet Q10 offers a successor.
- **Other (C, D, F, G).** Docs and skills: the `/polaris-dossier` skill (both
  `.claude` and `.codex` copies, sweep G) must gain the never-answer rule and
  the trunk default after sign-off.

## Edits required (CC-IMPACT-5, 6)

None before sign-off. After sign-off: the skill texts, the dossier CLI, the
consent package, `state-directory.test.ts`, and `docs/polaris-generation/`
runbooks naming `--revision` (sweep G, Other). Each is implementation and
moves with design §7's slices.

## Undecidable impact (CC-IMPACT-4)

- Whether the classification policy's public-source scope reader accepts the
  launch-record family without a policy successor [Inferred yes; design §5].
- Whether SEC-2's "Onboarding consent" sub-bullet is satisfied by a launch
  [Inferred yes; design §1]. Both are put to the reviewer.

# Scripted benchmark grading amendment

## Patterns

- `syzygy-5dhm-22/R-SCRIPTED-BENCHMARK-SPEC-.*-RAW\.md`

## What was under review

The REQ-polaris-generation-033 amendment defines how an evaluator's synthetic run retains scripted answers and grades the retained bytes against the frozen key. The grader receives equality tokens within each question, without a mapping to the answer text or the arm.

## Last verdict of record, and where the findings landed

[Observed] R1 returned `REVISE` on 4a4377c4d3dc298fb023bca9ae087ddcd92df5f4 (`syzygy-5dhm-22/R-SCRIPTED-BENCHMARK-SPEC-1-RAW.md:1`). An authoritative role mount could be omitted from the supplied view list and expose a private answer companion or key.

[Observed] R2 returned `CONFIRM` on a6df661e5d3420d2339658fb4f25fd770704b13a (`syzygy-5dhm-22/R-SCRIPTED-BENCHMARK-SPEC-2-RAW.md:1`). The program derives the complete synthetic role population from the same prepared views and refuses missing, changed or overlapping mounts. The companion remains under the existing dossier state root, outside the mounted operator-run directory. The expected-byte receipt and blind packet stay within the evaluator.

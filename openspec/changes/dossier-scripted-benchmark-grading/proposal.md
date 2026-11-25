# Scripted benchmark answers and blind grading

[Observed] REQ-polaris-generation-033 version 2.27 records a question-file digest and keeps the key's text out of authoring inputs. The existing scripted reader emits per-question answers and declares their accuracy unevaluated. The published Redis exercise is a historical regression, with a public key.

[Inferred] Add one bounded, evaluator-owned answer companion to the local comparison run and grade those retained scripted answers against its exact frozen graded key. Build the grader packet from opaque question positions and SHA-256 values for individual fixture facts. The grader can compare those values exactly. The arm name, answer prose, rendered pages, attempted paths and citation metadata have no field in its packet.

[Inferred] This candidate amends only REQ-polaris-generation-033. It retains the predecessor's provider rendering, ordinary run records and hold-out boundary. The site-only session reader, page-location and readiness work remain syzygy-fnry.7. A genuine blind comparison, arbitrary prose scoring, a human or provider grader, and benchmark results need separate evidence and are outside this slice.

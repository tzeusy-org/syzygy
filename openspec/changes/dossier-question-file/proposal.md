# Dossier question file: the run record names the instrument — version 2.27

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit, no change to secret detection or SEC-5's fail-closed rule, no foreign repository write, no exposure, release or multi-user use.

## Why

- [Observed] Before this change three question sets disagreed and lived in three places: the brief's four topics (`packages/polaris-dossier/src/brief.ts`), the provider profile's five reader questions (`packages/polaris-generation-core/src/dossier-profile.ts`) and the kit's seven evaluation questions (`docs/polaris-generation/TARGETS.md`). The published Redis pilot is historical regression evidence for R29. R1 requires separately frozen blind questions.
- [Inferred] A comparison of a dossier against a plain session is only repeatable if both are graded by one frozen instrument and every result names it. The corpus's pass rule already compares an entry's results only at equal key digest (`docs/polaris-generation/dossier-corpus-v1.json`, `passRule.key.comparison`); nothing in a run said which questions it was built and graded under.

## What changes

One MODIFIED requirement, REQ-polaris-generation-033 ("Operator-agent authoring mode"), complete text in `proposed/polaris-generation/spec.md`: one paragraph before the disclosure paragraph, and two scenarios. The paragraph states that `init` writes a `questionFile` member (format, version, SHA-256) into the run record, what the question file holds (three public lists and a held-out part naming evaluator-owned keys by opaque identifier, digest and count), how a record written before this version is read (Unknown, never refused or rewritten), and the required exclusion of held-out keys and their text from authoring-side mounts and packets.

Every other sentence and scenario of REQ-033 is carried unchanged (SEMANTIC-DELTA.md). REQ-034's brief text is unchanged byte for byte: the topics move into the question file with the same words and order. The provider mode's rendered bytes are unchanged.

## Non-goals

No benchmark run, reader, grader or verdict (slices 2 to 8 of R1). The Redis comparison entry records all three lists as unwritten. An independent evaluator must supply a new blind graded list, depth list and reader tasks before any comparison can bind. No change to the pilot's stored files or `scripts/dossier_pilot_grading_input.py`. No runtime refusal when the binary's question file differs from a run's recorded one.

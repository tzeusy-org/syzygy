# Design — version 2.27

## Choices

- [Inferred] **Evaluator-owned keys and a public question file.** The held-out part records opaque evaluator key identifiers, SHA-256 digests and counts. The question file digest binds those references. The independent evaluator keeps key bytes outside every checkout, mount and packet available to the authoring-side roles. The product metadata can travel with the public lists.
- [Inferred] **Data in the product, JSON copy in the kit.** The shape-pack precedent (`shape-packs.ts`): the binary reads no file to compose a brief, and a test holds the JSON copy byte-identical to the module's encoding, which is also the text the digest is taken over.
- [Observed] **Redis remains pending a blind comparison.** The supervised view mounts the Syzygy checkout, where the published pilot key is tracked. That pilot remains the historical R29 regression. All three current Redis comparison lists are `not-written`, and `bindComparison` returns `held-out-part-incomplete`. The evaluator must freeze new blind lists before a comparison can bind.
- [Inferred] **Counts are fixed by the reader.** A frozen depth list holds 10 to 20 items and a frozen task list exactly 5; any other count refuses the file (`depth-count`, `task-count`).
- [Inferred] **The run record names the file; it does not enforce it.** `init` writes the binding; `readRunRecord` accepts its absence (an earlier record: Unknown) and refuses any other shape. A comparison checks equal digests where it joins results, as the corpus pass rule says.
- [Inferred] **Hold-out fixtures exercise packet text and mount visibility.** `packages/polaris-dossier/src/question-file-hold-out.test.ts` checks the digests and counts of three artificial evaluator keys, searches seven selected role texts and reports each match by role, packet and needle identity. It exercises every supervised mount role with a synthetic key outside and inside the checkout. Actual evaluator keys and live reader accesses remain Unknown.

## What is not yet implemented

- [Unknown] Editor and scout packets are checked as this tree builds them (the brief re-read by the repair loop; the provider profile's questions file; the discovery question strings); a future role with its own packet joins the census when it lands.

## Review (R-QUESTION-FILE-SPEC-1)

[Observed] One fresh-context review (`docs/reviews/syzygy-5dhm-21/R-QUESTION-FILE-SPEC-1-RAW.md:2`) records `REVISE` over spec SHA-256 `13cd442575ceef40b6798833f510a29ca0589dc95256f1a9a391e201e9e7b23a` at commit `859c2cd1a`, with two blocking findings (F1, F2) and six advisory (F3 to F8). The eight initial dispositions below describe the historical draft at spec digest `ec39365ec91faabb26ee8d1799f319d87ae1e840dcf0ef82c41fbe0525e05984`. The later hosted review rechecked that digest and found the checkout-mount and revert defects. The evaluator-custody revision is described above.

- F1: the held-out sentence now gives, per subject and list, a frozen reference (path, digest, count; the graded list also its fact count) or a not-written state, the 10-to-20 and exactly-5 counts, and that a subject with a list not written binds no comparison; the first scenario gained an AND line for both.
- F2: `tasks.md` ticks only what exists and names each artifact; the rule-6 record has its own line.
- F3: the paragraph says only what is bound: the brief and the provider profile read the file, and the reader-questions file the reader test and scorecard are given is derived from it; the evaluation questions are those the kit's manual reader test asks (`TARGETS.md` and the kit `README.md` now point at the file).
- F4: the kit `README.md`'s copy of the seven evaluation questions now points at the file. [Observed] Sweep, whitespace-normalised, of every public brief topic and reader question text over the 10,556 tracked UTF-8 files at `859c2cd1a`: outside the question file and its JSON copy, the texts occur only in `brief-v10-golden.json` (a pinned rendered brief), `brief.test.ts` and `question-file.test.ts` (literal expected values), none a source a consumer reads.
- F5: the paragraph states that the mechanical check covers fixture-built packets by the stated predicate and that live packets and unwritten lists are Unknown; the second scenario states the predicate (eight consecutive words, case and punctuation folded, JSON escapes undone, a paraphrase not detected).
- F6: one list of packets (brief, inventory brief, fidelity criteria, provider reader-questions file, discovery questions) and roles (authoring as author or editor, inventory, reviewer, scout) in the paragraph, the scenario and the test.
- F7: the falsifier gained an unplanted packet reported and a finding that repeats held-out text; the refusal clause names a non-integer version and a non-object value; the oracle is accept or refuse with the one literal refusal text quoted.
- F8: the paragraph says the binding and its Unknown are carried in the run record only and not rendered in this version.

# Design — version 2.27

## Choices

- [Inferred] **Held-out text by reference, not inline.** The question file's held-out part names each key file by repository-relative path, SHA-256 and count, and holds none of its text. So the file, its JSON copy (`docs/polaris-generation/question-file-v1.json`) and the `syzygy` binary that carries it as data (`packages/polaris-generation-core/src/question-file.ts`) can be read by anyone, an authoring session included, while the file's digest still covers every held-out list through its key's digest. The alternative, one file with the held-out text inline, could live neither in the product nor in the authoring kit, and every public consumer would then need a projection step to read it.
- [Inferred] **Data in the product, JSON copy in the kit.** The shape-pack precedent (`shape-packs.ts`): the binary reads no file to compose a brief, and a test holds the JSON copy byte-identical to the module's encoding, which is also the text the digest is taken over.
- [Inferred] **The pilot migrates by reference.** The Redis pilot's graded key (24 questions, 81 required facts) becomes the held-out part's one entry; its depth list and reader tasks are `not-written`, so `bindComparison` refuses it with `held-out-part-incomplete`. The pilot's files and grading script are unchanged.
- [Inferred] **Counts are fixed by the reader.** A frozen depth list holds 10 to 20 items and a frozen task list exactly 5; any other count refuses the file (`depth-count`, `task-count`).
- [Inferred] **The run record names the file; it does not enforce it.** `init` writes the binding; `readRunRecord` accepts its absence (an earlier record: Unknown) and refuses any other shape. A comparison checks equal digests where it joins results, as the corpus pass rule says.
- [Inferred] **The hold-out check is a test, not a runtime guard.** A runtime guard would need the held-out text at the authoring runtime, which is what the rule keeps out. `packages/polaris-dossier/src/question-file-hold-out.test.ts` builds each role's packet from fixtures and searches it with the regression check's predicate (eight-word window, JSON escaping undone), and reports a finding by role, packet and needle identity only.

## What is not yet implemented

- [Unknown] Editor and scout packets are checked as this tree builds them (the brief re-read by the repair loop; the provider profile's questions file; the discovery question strings); a future role with its own packet joins the census when it lands.

## Review (R-QUESTION-FILE-SPEC-1)

[Observed] One fresh-context review (`docs/reviews/syzygy-5dhm-21/R-QUESTION-FILE-SPEC-1-RAW.md:2`) records `REVISE` over spec SHA-256 `13cd442575ceef40b6798833f510a29ca0589dc95256f1a9a391e201e9e7b23a` at commit `859c2cd1a`, with two blocking findings (F1, F2) and six advisory (F3 to F8). All eight were repaired; none was overruled, and no confirmation round was run (one non-gating review under D10), so the bytes proposed for adoption (`ec39365ec91faabb26ee8d1799f319d87ae1e840dcf0ef82c41fbe0525e05984`) are not the reviewed ones.

- F1: the held-out sentence now gives, per subject and list, a frozen reference (path, digest, count; the graded list also its fact count) or a not-written state, the 10-to-20 and exactly-5 counts, and that a subject with a list not written binds no comparison; the first scenario gained an AND line for both.
- F2: `tasks.md` ticks only what exists and names each artifact; the rule-6 record has its own line.
- F3: the paragraph says only what is bound: the brief and the provider profile read the file, and the reader-questions file the reader test and scorecard are given is derived from it; the evaluation questions are those the kit's manual reader test asks (`TARGETS.md` and the kit `README.md` now point at the file).
- F4: the kit `README.md`'s copy of the seven evaluation questions now points at the file. [Observed] Sweep, whitespace-normalised, of every public brief topic and reader question text over the 10,556 tracked UTF-8 files at `859c2cd1a`: outside the question file and its JSON copy, the texts occur only in `brief-v10-golden.json` (a pinned rendered brief), `brief.test.ts` and `question-file.test.ts` (literal expected values), none a source a consumer reads.
- F5: the paragraph states that the mechanical check covers fixture-built packets by the stated predicate and that live packets and unwritten lists are Unknown; the second scenario states the predicate (eight consecutive words, case and punctuation folded, JSON escapes undone, a paraphrase not detected).
- F6: one list of packets (brief, inventory brief, fidelity criteria, provider reader-questions file, discovery questions) and roles (authoring as author or editor, inventory, reviewer, scout) in the paragraph, the scenario and the test.
- F7: the falsifier gained an unplanted packet reported and a finding that repeats held-out text; the refusal clause names a non-integer version and a non-object value; the oracle is accept or refuse with the one literal refusal text quoted.
- F8: the paragraph says the binding and its Unknown are carried in the run record only and not rendered in this version.

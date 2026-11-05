# Quotation reader domains — retention evidence

[Inferred] Retain the two current readers and document their different
domains. The signed local-agent design's "The local-agent draft schema"
says, "Quotations keep the existing lead-in form (`QUOTE_LEAD_IN`), and each
names its citation." REQ-polaris-generation-034/035 require contiguous
cited-source fidelity, fresh render location and review binding. They do
not require ordinary quoted prose to become a local verified quotation.
This change alters comments and documentation; it selects no new parser
rule, changes no acceptance or refusal, and asks for no new owner decision.
The classification remains subject to independent review.

[Observed] The historical G3 sentence, **"Synthetic differential: they
disagree on 1,693 of 2,375 check-passing texts," uses a source-free
"check-passing" predicate**. It supplies `verifies = true`, tests terminated
nonempty spans and ignores source-fidelity findings. The 2,375 are retained
draws with duplicates, not unique drafts or successful source-verified
checks. The original reconciliation, generator and differential remain
unchanged in `docs/evidence/syzygy-bpyt-8-7/`; this qualification attaches
to the claim instead of replacing its evidence. Its proposed zero-difference
condition cannot establish correctness for intentionally different domains.

[Observed] The new
[record](quotation-domains-2026-11-05.json) retains the complete literal
corpus, expected results, actual findings, source bytes, pinned identifiers,
byte ranges, render-file digests, caller probes and subject hashes. Its
30-case corpus has 16 local `passed` check outcomes and 17 broader checks
without findings. A local pass may have no quotation or withhold an
excluded quotation; it is not a claim that every passing draft has verified
quotes or is ready. No fidelity review counts in these fixture renders.

| Fixture | Local check/render | Broader quote check |
|---|---|---|
| Explicit straight lead-in | Verifies named citation/range; renders pinned raw formatting | Verifies the normalized span in a cited source |
| Curly opener after lead-in | `lead-in-without-quote`; render refuses | Can verify a curly quotation |
| Ordinary `"invented"` prose | No verified quotation; prose retains its claim marking | `quote-not-in-cited-sources` |
| Earlier stray quote before lead-in | Reads the literal lead-in and verifies its span | Earlier quotation can consume the lead-in and fail |
| Correct text outside named line range | `quotation-outside-range`; render refuses | Whole-source comparison can pass |
| Excluded blob | Withholds the quotation as Unknown, `excluded-content` | No admitted source verifies it |

[Observed] Missing, empty and unterminated openers, altered/appended prose,
missing or wrong citations, absent/out-of-range blobs, joining and elision
exercise actual failure paths. Repeated/nested lead-ins, quoted terms,
CRLF/CR/LF opener whitespace, multibyte offsets and raw inline/fenced markup
retain their existing behavior. Inventory statements use the same local
derivation. Sixteen further direct validator/evaluation cases distinguish
fidelity-verdict verification, design-verdict refusal and broader quotation
counts, including an empty cited population remaining Unknown. Those
validator probes use synthetic packet shapes; they are not independent
reviews or full review-session executions.

[Observed] Before/after runs use identical pinned synthetic inputs and
the same private fixture paths. Python structure/file enumeration and a
separate Node byte comparison confirm equal complete records and equal
rendered-file populations. Seven local-versus-broader acceptance differences
remain named in the record; none is hidden by filtering the corpus. The
unchanged executable bundle is also digest-bound. These are finite
measurements, not a universal parser-equivalence claim.

[Observed] The focused predecessor run passed 424 tests in the eight
existing quote, evaluation, pipeline, check, inventory, render and review
files. Repository test delta: **+0 ~0 -0**. No production predicate changes;
the final handoff records clean-clone verification and preservation mutants
separately. Source bodies are invented private Git fixtures, not reads of
an observed project. Provider integration remains parked and unexecuted.

[Inferred] GP-Q0 permits this behavior-preserving maintenance under existing
acts. Its terminal clause still applies to any future unlisted change:
"Any change not listed here to what a gate accepts or refuses stops and
returns to the owner." Aligning delimiters, consuming earlier quotations
locally, or widening the local quotation interface is a different change
requiring its own bounded disposition and any necessary signed successor.
The original bead remains open through independent review, hosted checks,
merge and coordinator reconciliation. Proposed CC-REV-1 floor: class 3;
the reviewer decides final membership. The cycle report should carry a
non-blocking notice of the retained domains and historical predicate limit.
